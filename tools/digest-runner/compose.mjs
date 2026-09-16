// tools/digest-runner/compose.mjs
// Every model call the digest makes, and the prompts they carry.
//
// This lives apart from run.mjs for one reason: the eval must exercise the
// REAL prompt. A copy of it in the eval would drift within a month and then be
// measuring something the family never receives. run.mjs supplies the live
// week; the eval supplies a fixed one; both get the same system prompt built
// from the same files on disk.

import { readFileSync } from "node:fs";
import { join } from "node:path";
import Anthropic from "@anthropic-ai/sdk";

export const COMPOSE_MODEL = "claude-opus-5";
// The audit deliberately is NOT the model under audit — a draft should not
// grade its own homework.
export const AUDIT_MODEL = "claude-sonnet-5";

export const factory = (repo, name) => readFileSync(join(repo, "_shared", name), "utf8");

// What the School email section says when there is nothing in it. Never blank:
// the first preview had an empty section and the model filled it with four
// invented school emails. Shared so the eval hands the model the same words.
export const EMAIL_NONE =
  "(NONE — the sweep found no school email in the last 7 days. Nothing to report from email: " +
  "do not describe, summarise, or imply any school email, notice, note, or payment.)";
export const EMAIL_NOT_SWEPT =
  "(NOT SWEPT — this run had no access to school email. There is no school email information " +
  "this week: do not describe, summarise, or imply any school email, notice, note, or payment.)";

// The format contract. Everything about JUDGMENT lives in _shared/; only the
// mechanical shape the email renderer parses is stated here.
const FORMAT = "You compose a weekly family digest email. Follow the stage contract and factory files exactly. Never invent times, dates, or amounts; quote them verbatim from the collected data or say 'date not yet published'. Output the full email version first (no subject line, no code fences). Format the email version EXACTLY so: first line is the greeting alone; each day starts with a line beginning '## ' then day name and date (e.g. ## Monday 14 Sept); the sections start with '## REMEMBER' and '## RADAR'; list items start with '- '; bold key deadlines with **double asterisks**; final line is the sign-off alone, prefixed '~ '. No other markdown. Then on its own line the delimiter ===SMS===, then the SMS version composed per the TEMPLATE's SMS section: greeting, week label, compact day-by-day with urgent action items woven into their day, sign-off. Put a BLANK LINE between every day line so it is scannable on a phone. Plain text, under 1200 characters. Nothing after the SMS.";

export function buildSystem(repo) {
  return [
    FORMAT,
    "== STAGE CONTRACT ==\n" + readFileSync(join(repo, "stages", "01_weekly-digest", "CONTEXT.md"), "utf8"),
    "== HOUSEHOLD ==\n" + factory(repo, "household.md"),
    "== RULES ==\n" + factory(repo, "rules.md"),
    "== VOICE ==\n" + factory(repo, "voice.md"),
    "== TEMPLATE ==\n" + factory(repo, "digest-template.md"),
  ].join("\n\n");
}

export function buildUser({ dayList, runDate, collected, corrections = [] }) {
  return (
    `Compose the digest for the coming week. Use EXACTLY these day-date pairings — never compute, infer, or shift dates yourself: ${dayList}.\n` +
    `(This run executed on ${runDate}. The digest always covers the NEXT Monday-to-Sunday. Phrase any "today/tomorrow" urgency relative to when the family READS it: Sunday before that Monday.)\n\n` +
    (corrections.length
      ? "A first draft was written and audited against the rules. It broke the rules below. " +
        "Compose the digest again from the collected data, fixing every one. Change nothing else.\n" +
        corrections.map((c) => `- [${c.rule}] ${c.detail}`).join("\n") + "\n\n"
      : "") +
    "== COLLECTED DATA ==\n" + collected
  );
}

// Streamed, not a single request/response. With adaptive thinking a long
// think can mean minutes before the first byte of a non-streamed reply, and
// Node's fetch gives up waiting for headers: the first preview's retry hung
// for minutes and died with "fetch failed", so the draft it was meant to fix
// shipped instead. Streaming keeps bytes flowing; the SDK also retries dropped
// connections, 429s and 5xx on its own.
export async function ask({ apiKey, params, betas }) {
  const client = new Anthropic({ apiKey, maxRetries: 3, timeout: 15 * 60 * 1000 });
  const stream = betas
    ? client.beta.messages.stream({ ...params, betas })
    : client.messages.stream(params);
  const msg = await stream.finalMessage();

  // A refusal arrives as a normal response with no text — check first.
  if (msg.stop_reason === "refusal") {
    throw new Error(`Declined (${msg.stop_details?.category ?? "no category"})`);
  }
  // Thinking is billed against max_tokens, and how much the model thinks varies
  // run to run — the same audit spent 625 tokens once and 1,262 the next. A cap
  // that fits most Sundays truncates some, and truncated JSON looks like a
  // parse error rather than what it is. Say what it is.
  if (msg.stop_reason === "max_tokens") {
    throw new Error(`Hit max_tokens (${msg.usage?.output_tokens} out) — output truncated`);
  }
  const text = msg.content.filter((b) => b.type === "text").map((b) => b.text).join("\n").trim();
  return { text, msg };
}

export async function compose({ repo, apiKey, collected, dayList, runDate, corrections = [] }) {
  const { text, msg } = await ask({
    apiKey,
    // If a classifier ever declines, the API re-runs it elsewhere rather than
    // handing back a refusal. A silently missed Sunday is the failure to avoid.
    betas: ["server-side-fallback-2026-07-01"],
    params: {
      // One call a week, and judgment is the whole job. Buy the good model.
      model: COMPOSE_MODEL,
      max_tokens: 16000,
      // Adaptive, not disabled: the judgment calls ARE reasoning, and disabled
      // thinking on this model can leak stray tags into the prose.
      thinking: { type: "adaptive" },
      fallbacks: "default",
      system: buildSystem(repo),
      messages: [{ role: "user", content: buildUser({ dayList, runDate, collected, corrections }) }],
    },
  });
  if (!text) throw new Error("Empty digest from compose step — aborting before send.");
  return { text, usage: msg.usage, stopReason: msg.stop_reason };
}

// ---------- the rules audit ----------
export async function auditAgainstRules({ repo, apiKey, collected, email, sms }) {
  const system =
    "You audit a draft family digest against the household's written rules. You are not rewriting it. " +
    "Report ONLY concrete, checkable rule violations you can point at in the draft — not style preferences, " +
    "not things you would have phrased differently. If the draft is compliant, return an empty array.\n\n" +
    // The first preview's draft opened with four school emails the model had
    // invented, and this audit read them as real. The draft is never a source.
    "THE DRAFT IS NEVER A SOURCE. The only sources are COLLECTED DATA and HOUSEHOLD below. Anything in the " +
    "draft — a school email, a 'Subject:' or 'Body:' block, an event, a time, an amount, a deadline, a " +
    "permission note — that cannot be traced to those two sources is a fabrication, and every fabrication is " +
    "blocking. Check every REMEMBER item and every SMS item against the sources, one by one. A line in " +
    "COLLECTED DATA marked CANCELLED overrides HOUSEHOLD's usual routine for that day.\n\n" +
    "Respond with JSON only, no prose and no code fences: " +
    `{"violations":[{"rule":"<short slug>","severity":"blocking"|"warn","detail":"<what is wrong, quoting the draft>"}]}. ` +
    "Use 'blocking' only when a FACT is wrong or missing: a fabrication, a stated deadline that has already " +
    "passed presented as upcoming, an item that a receipt shows is already paid, a dropped coverage gap. " +
    "Everything else is 'warn'.\n\n== RULES ==\n" + factory(repo, "rules.md");

  const { text } = await ask({
    apiKey,
    params: {
      model: AUDIT_MODEL,
      // Room for thinking as well as the answer — see the max_tokens note in
      // ask(). At 2,000 this audit could silently fail open.
      max_tokens: 16000,
      system,
      messages: [{
        role: "user",
        content: `== COLLECTED DATA (a source) ==\n${collected}\n\n` +
          `== HOUSEHOLD (a source: the standing weekly routine) ==\n${factory(repo, "household.md")}\n\n` +
          `== DRAFT EMAIL (not a source) ==\n${email}\n\n== DRAFT SMS (not a source) ==\n${sms}`,
      }],
    },
  });
  const json = JSON.parse(text.replace(/^```(?:json)?\s*|\s*```$/g, ""));
  return (json.violations ?? []).map((v) => ({
    rule: `audit:${v.rule}`,
    severity: v.severity === "blocking" ? "blocking" : "warn",
    ok: false,
    detail: v.detail,
  }));
}
