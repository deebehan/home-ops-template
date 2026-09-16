// tools/digest-runner/eval/run.mjs
// Runs every case through the REAL compose prompt, grades three ways, and
// writes the results to outputs/eval/.
//
//   npm run eval              all cases
//   npm run eval -- --case=empty-week,long-week
//   npm run eval -- --dry     print what it would spend, call nothing
//
// Three graders, cheapest first:
//   1. checks.mjs  — the same battery the Sunday run applies to itself. Free.
//   2. per-case    — the expectation the case exists for. Free.
//   3. voice judge — sonnet-5 against voice.md. ~2c a case, and the only one
//                    that can see whether the thing actually reads well.
//
// This spends real money. It prints the estimate and waits for --yes.

import { writeFileSync, mkdirSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { CASES } from "./cases.mjs";
import { runChecks, failures, blocking } from "../checks.mjs";
import { compose, ask, factory, COMPOSE_MODEL, AUDIT_MODEL } from "../compose.mjs";

const REPO = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const OUT = join(REPO, "outputs", "eval");
const TZ = "Australia/Sydney";
const JUDGE_MODEL = AUDIT_MODEL; // sonnet-5 — never the model under test

// $ per 1M tokens, from the model table. Only used for the estimate and the
// receipt at the end; nothing depends on it being exact.
const PRICE = {
  "claude-opus-5": { in: 5, out: 25 },
  "claude-sonnet-5": { in: 2, out: 10 },
};

const args = process.argv.slice(2);
const flag = (name) => args.find((a) => a.startsWith(`--${name}=`))?.split("=")[1];
const DRY = args.includes("--dry");
const YES = args.includes("--yes");
const only = flag("case")?.split(",").map((s) => s.trim());
const CONCURRENCY = +(flag("concurrency") ?? 4);

const cases = only ? CASES.filter((c) => only.includes(c.id)) : CASES;
if (!cases.length) { console.error(`No cases matched ${only?.join(",")}`); process.exit(1); }

// ---------- the week a case is set in ----------
// Same shape run.mjs feeds the live prompt, computed from the case's Monday.
function weekOf(mondayISO) {
  const [y, m, d] = mondayISO.split("-").map(Number);
  const monday = Date.UTC(y, m - 1, d);
  const fmt = (ms, o) => new Date(ms).toLocaleDateString("en-AU", { timeZone: "UTC", ...o });
  const dayList = Array.from({ length: 7 }, (_, i) =>
    fmt(monday + i * 86400000, { weekday: "long", day: "numeric", month: "short" })).join("; ");
  // Every case is composed as if it ran the Sunday before its week, which is
  // when the real job runs and what "today/tomorrow" is relative to.
  const runDate = fmt(monday - 86400000, { weekday: "long", day: "numeric", month: "short" });
  return { dayList, runDate };
}

// ---------- grader 3: does it read like the digest you asked for? ----------
async function judgeVoice({ apiKey, email, sms, collected }) {
  const system =
    "You score a family digest against the household's written voice spec. Score each criterion 1-5, " +
    "where 3 is acceptable and 5 is what the spec describes at its best. Be a hard marker: 5 means you " +
    "cannot see how it could be better, not merely that nothing is wrong.\n\n" +
    "Criteria:\n" +
    "  register  — the Moira Rose voice of the spec: grand, devoted, affectionate from a height. Not chirpy, not flat.\n" +
    "  facts_flat — times, places, names and amounts stated plainly. A joke may sit before or after a fact, NEVER on it.\n" +
    "  greeting  — invented fresh, in the register, not one of the spec's worn exemplars, never explained.\n" +
    "  signoff   — a real attributed quote or an original unattributed benediction. An invented quote attributed to a real person or character scores 1.\n" +
    "  phone     — short lines, scannable, useful with the performance deleted.\n\n" +
    "Respond with JSON only, no prose, no code fences: " +
    `{"register":n,"facts_flat":n,"greeting":n,"signoff":n,"phone":n,"note":"<one sentence on the weakest point>"}` +
    "\n\n== VOICE SPEC ==\n" + factory(REPO, "voice.md");

  // Same streaming helper the Sunday run uses: refusal and max_tokens both throw
  // with a reason. Sonnet 5 thinks by default and the thinking counts against
  // the cap — 1,000 truncated this judge mid-JSON on the first pilot run.
  const { text, msg } = await ask({
    apiKey,
    params: {
      model: JUDGE_MODEL, max_tokens: 16000, system,
      messages: [{ role: "user", content: `== EMAIL ==\n${email}\n\n== SMS ==\n${sms}` }],
    },
  });
  const s = JSON.parse(text.replace(/^```(?:json)?\s*|\s*```$/g, ""));
  const dims = ["register", "facts_flat", "greeting", "signoff", "phone"];
  return { scores: s, mean: dims.reduce((a, k) => a + (+s[k] || 0), 0) / dims.length, usage: msg.usage };
}

// ---------- one case ----------
function splitDraft(raw) {
  const [email, sms] = raw.split(/\n?===SMS===\n?/);
  return { email: (email ?? "").trim(), sms: (sms ?? "").trim() };
}

async function runCase(c, apiKey, household) {
  const { dayList, runDate } = weekOf(c.monday);
  const t0 = Date.now();
  const { text, usage } = await compose({
    repo: REPO, apiKey, collected: c.collected, dayList, runDate,
  });
  const { email, sms } = splitDraft(text);
  const o = { email, sms, both: `${email}\n${sms}`, collected: c.collected };

  const checks = runChecks({ email, sms, collected: c.collected, household });
  const expectations = (c.expect ?? []).map((e) => ({
    name: e.name, why: e.why, ok: !!e.fn(o),
  }));

  let voice = null, voiceErr = null;
  try {
    voice = await judgeVoice({ apiKey, email, sms, collected: c.collected });
  } catch (e) { voiceErr = e.message; }

  return {
    id: c.id, rule: c.rule, why: c.why,
    email, sms,
    checks, expectations, voice, voiceErr,
    usage, judgeUsage: voice?.usage,
    seconds: +((Date.now() - t0) / 1000).toFixed(1),
    passed: blocking(checks).length === 0 && expectations.every((e) => e.ok),
  };
}

// ---------- bounded concurrency ----------
async function mapLimit(items, limit, fn) {
  const out = new Array(items.length);
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const i = next++;
      try { out[i] = await fn(items[i]); }
      catch (e) { out[i] = { id: items[i].id, error: e.message, passed: false, checks: [], expectations: [] }; }
      process.stdout.write(out[i].error ? "!" : out[i].passed ? "." : "x");
    }
  }));
  return out;
}

// ---------- go ----------
// Shape of one case, recalibrated after the first pilot came in at $0.21
// against a $0.13 estimate: output includes thinking on both models.
const estIn = 14000, estOut = 5000;
const est = cases.length * (
  (estIn * PRICE[COMPOSE_MODEL].in + estOut * PRICE[COMPOSE_MODEL].out) / 1e6 +
  (6000 * PRICE[JUDGE_MODEL].in + 1500 * PRICE[JUDGE_MODEL].out) / 1e6);

console.log(`\n${cases.length} case(s) | compose ${COMPOSE_MODEL} | judge ${JUDGE_MODEL}`);
console.log(`Estimated spend: ~$${est.toFixed(2)} (rough — real cost is reported at the end)\n`);
if (DRY) {
  for (const c of cases) console.log(`  ${c.id.padEnd(22)} ${c.rule}`);
  console.log("\n--dry: nothing called.\n");
  process.exit(0);
}
if (!YES) {
  console.log("This spends real money. Re-run with --yes to go ahead.\n");
  process.exit(0);
}

const apiKey = process.env.ANTHROPIC_API_KEY;
if (!apiKey) { console.error("ANTHROPIC_API_KEY not set (put it in tools/digest-runner/.env)"); process.exit(1); }
const household = readFileSync(join(REPO, "_shared", "household.md"), "utf8");

const started = new Date();
const results = await mapLimit(cases, CONCURRENCY, (c) => runCase(c, apiKey, household));
console.log("\n");

// ---------- report ----------
const cost = results.reduce((a, r) =>
  a + ((r.usage?.input_tokens ?? 0) * PRICE[COMPOSE_MODEL].in + (r.usage?.output_tokens ?? 0) * PRICE[COMPOSE_MODEL].out) / 1e6
    + ((r.judgeUsage?.input_tokens ?? 0) * PRICE[JUDGE_MODEL].in + (r.judgeUsage?.output_tokens ?? 0) * PRICE[JUDGE_MODEL].out) / 1e6, 0);
const passed = results.filter((r) => r.passed).length;
const voices = results.map((r) => r.voice?.mean).filter((v) => typeof v === "number");
const voiceMean = voices.length ? voices.reduce((a, b) => a + b, 0) / voices.length : null;

const rows = results.map((r) => {
  const failedExp = (r.expectations ?? []).filter((e) => !e.ok).map((e) => e.name);
  const failedChk = failures(r.checks ?? []).map((c) => `${c.rule}(${c.severity})`);
  return `| ${r.id} | ${r.error ? "ERROR" : r.passed ? "pass" : "FAIL"} | ${r.voice?.mean?.toFixed(1) ?? "—"} | ${[...failedExp, ...failedChk].join(", ") || "—"} |`;
});

const stamp = started.toISOString().replace(/[:.]/g, "-").slice(0, 19);
const dir = join(OUT, stamp);
mkdirSync(dir, { recursive: true });
for (const r of results) {
  writeFileSync(join(dir, `${r.id}.md`),
    `# ${r.id}\n\n**Rule:** ${r.rule}\n\n**Why this case exists:** ${r.why}\n\n` +
    (r.error ? `## ERROR\n${r.error}\n` :
      `## Email\n\n${r.email}\n\n## SMS\n\n${r.sms}\n\n## Grades\n\n` +
      (r.expectations ?? []).map((e) => `- ${e.ok ? "pass" : "FAIL"} — ${e.name}\n  _${e.why}_`).join("\n") + "\n\n" +
      (r.checks ?? []).map((c) => `- ${c.ok ? "pass" : c.severity === "blocking" ? "FAIL" : "warn"} — ${c.rule} ${c.detail}`).join("\n") + "\n\n" +
      `Voice: ${r.voice ? JSON.stringify(r.voice.scores) : `unavailable (${r.voiceErr})`}\n`));
}

const summary =
  `# Eval — ${started.toISOString().slice(0, 16).replace("T", " ")}\n\n` +
  `Compose \`${COMPOSE_MODEL}\` · judge \`${JUDGE_MODEL}\` · ${results.length} cases · $${cost.toFixed(2)}\n\n` +
  `**${passed}/${results.length} passed**` +
  (voiceMean ? ` · voice ${voiceMean.toFixed(2)}/5` : "") + `\n\n` +
  `| case | result | voice | failures |\n|---|---|---|---|\n${rows.join("\n")}\n\n` +
  `Per-case output, including the full email and SMS, is in the files beside this one.\n`;

writeFileSync(join(dir, "summary.md"), summary);
console.log(summary);
console.log(`Written to outputs/eval/${stamp}/\n`);
process.exit(passed === results.length ? 0 : 1);
