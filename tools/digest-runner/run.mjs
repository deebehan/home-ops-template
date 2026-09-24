// tools/digest-runner/run.mjs
// Phase 3 runner: the repo IS the prompt.
// gather (ICS + IMAP) -> write runs/DATE-collected.md -> compose (Claude API,
// prompt built from stages/01_weekly-digest/CONTEXT.md + _shared/*) ->
// send (Gmail SMTP) -> write runs/DATE-digest.md.
//
// Secrets (GitHub repo Settings > Secrets and variables > Actions):
//   FAMILY_ICS_URL            Google Calendar "Family" secret iCal address
//   SCHOOL_ICS_URL_FILTERED   the Vercel /api/school-cal?key=... URL
//   GMAIL_ADDRESS             your Gmail address
//   GMAIL_APP_PASSWORD        16-char Google app password (IMAP read + SMTP send)
//   ANTHROPIC_API_KEY         from console.anthropic.com
//   DIGEST_RECIPIENTS         comma-separated emails (everyone who gets the archive)
//
// Optional — only if you want the text message as well as the email. Leave
// SMS_RECIPIENTS unset (all four are then unnecessary) and the run emails only:
//   TWILIO_ACCOUNT_SID        from twilio.com console (starts AC...)
//   TWILIO_AUTH_TOKEN         same console page
//   TWILIO_FROM_NUMBER        your Twilio AU number, e.g. +614xxxxxxxx
//   SMS_RECIPIENTS            comma-separated mobiles, e.g. +614...,+614...

import ical from "node-ical";
// rrule ships a CJS bundle whose named exports Node cannot see — take the default.
import rrulePkg from "rrule";
import { ImapFlow } from "imapflow";
import { simpleParser } from "mailparser";
import nodemailer from "nodemailer";
import { runChecks, failures, blocking } from "./checks.mjs";
import {
  compose as composeWith,
  auditAgainstRules as auditWith,
  factory as factoryOf,
  EMAIL_NONE,
  EMAIL_NOT_SWEPT,
} from "./compose.mjs";
import { writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const { RRule } = rrulePkg;
const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO = join(__dirname, "..", "..");
const RUNS = join(REPO, "stages", "01_weekly-digest", "runs");
const OUTPUTS = join(REPO, "outputs");
const TZ = "Australia/Sydney"; // SET THIS to your family's timezone, e.g. "Europe/Dublin"
const GMAIL_LABEL = "School"; // the Gmail label your school filter writes to

// DRY_RUN=1: gather only — write outputs/DATE-collected.md and stop. No IMAP,
// no Claude call, no email, no SMS. This is how you test a gather locally:
//   FAMILY_ICS_URL=... SCHOOL_ICS_URL_FILTERED=... DRY_RUN=1 node run.mjs
const DRY_RUN = process.env.DRY_RUN === "1";
// PREVIEW=1: the whole Sunday flow — gather, compose, verify, retry — writing
// both files to outputs/ and stopping just before the email and SMS go out.
// Without Gmail credentials in .env it skips the school email sweep.
//   npm run preview
const PREVIEW = process.env.PREVIEW === "1";
const OUT_DIR = DRY_RUN || PREVIEW ? OUTPUTS : RUNS; // previews never touch runs/

const env = (k) => {
  const v = process.env[k];
  if (!v) { console.error(`Missing secret: ${k}`); process.exit(1); }
  return v;
};
const envOptional = (k) => process.env[k] || undefined;

// ---------- dates (Sydney day-of-week, UTC-anchored boundaries) ----------
function sydneyParts(d) {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat("en-AU", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit", weekday: "short" })
      .formatToParts(d).map((x) => [x.type, x.value]));
  return { y: +p.year, m: +p.month, d: +p.day, wd: ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].indexOf(p.weekday) };
}
const nowSyd = sydneyParts(new Date());
const todayUTC = Date.UTC(nowSyd.y, nowSyd.m - 1, nowSyd.d);
const DAY = 86400000;
const mondayUTC = todayUTC + (((8 - nowSyd.wd) % 7) || 7) * DAY; // next Monday (Sydney)
// Window instants with slack so Sydney-local times land correctly from a UTC runner:
const weekStart = new Date(mondayUTC - 12 * 3600000);            // ~Mon 00:00 Sydney
const sundayEnd = new Date(mondayUTC + 6 * DAY + 14 * 3600000);  // ~Sun 24:00 Sydney
const radarEnd = new Date(mondayUTC + 28 * DAY);
const stamp = new Date(mondayUTC).toISOString().slice(0, 10);
const fmtUTC = (ms, opts) => new Date(ms).toLocaleDateString("en-AU", { timeZone: "UTC", ...opts });
const monLabel = (o) => fmtUTC(mondayUTC, o);
const sunLabel = (o) => fmtUTC(mondayUTC + 6 * DAY, o);

// Wall-clock <-> instant, both directions, DST-safe. Sydney is +11 (AEDT) from
// the first Sunday in October and +10 (AEST) from the first Sunday in April,
// so nothing here may assume a fixed offset.
const wallFmt = new Intl.DateTimeFormat("en-CA", {
  timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit",
  hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false,
});
function wallParts(d) {
  const p = Object.fromEntries(wallFmt.formatToParts(d).map((x) => [x.type, x.value]));
  return { y: +p.year, m: +p.month, d: +p.day, h: +p.hour % 24, mi: +p.minute, s: +p.second };
}
// Sydney offset in force at this instant.
function tzOffsetMs(d) {
  const w = wallParts(d);
  return Date.UTC(w.y, w.m - 1, w.d, w.h, w.mi, w.s) - d.getTime();
}
// instant -> the same wall clock stamped as UTC (rrule's naive frame)
function naiveOf(d) {
  const w = wallParts(d);
  return new Date(Date.UTC(w.y, w.m - 1, w.d, w.h, w.mi, w.s));
}
// naive wall clock stamped as UTC -> the real instant in Sydney
function instantOf(naive) {
  let ts = naive.getTime() - tzOffsetMs(naive);    // first guess
  ts = naive.getTime() - tzOffsetMs(new Date(ts)); // settle if the guess crossed a DST edge
  return new Date(ts);
}
// All-day events are calendar DATES, not instants — and node-ical builds them
// at midnight in whatever timezone the PROCESS runs in: UTC on the GitHub
// runner, Sydney on a laptop. Read the date back with the same local getters
// and do arithmetic on the calendar. Subtracting 24 hours instead broke on the
// laptop: Sunday 4 Oct is 23 hours long in Sydney, so "Family Away, Thu 1 Oct
// to Sun 4 Oct" came out ending on the Saturday.
const calendarDay = (d) => Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
const fmtDay = (ms) => new Date(ms).toLocaleDateString("en-AU",
  { timeZone: "UTC", weekday: "short", day: "numeric", month: "short" });

// Chronological, then by name, so two same-day all-day events (two people
// both marked away) come out in the same order on every machine. Without the
// tiebreak the order varied with the process timezone, and so did the prompt.
const byTime = (a, b) => a.sortKey - b.sortKey || a.summary.localeCompare(b.summary);

// Sydney calendar date, the only safe key for matching EXDATEs and overrides.
function sydKey(d) {
  const w = wallParts(d);
  return `${w.y}-${String(w.m).padStart(2, "0")}-${String(w.d).padStart(2, "0")}`;
}

// ---------- gather: calendars ----------
// Expanding a repeat rule, the timezone-safe way.
//
// node-ical's rrule expansion answers in the timezone of the machine running
// it. On a laptop set to the family's own timezone, a 5pm weekly series came
// back at 5pm; on GitHub's
// UTC runner the SAME code on the SAME feed returned 7am — the 14 Sept digest.
// It also drifts by an hour for a series that started on the other side of a
// DST change. Sydney flips to AEDT on 4 Oct, so "add ten hours" would be wrong
// within the month.
//
// So don't trust rrule's time of day at all. ev.start IS correct — take the
// LOCAL wall time from it, repeat the rule in wall-clock space (a naive frame
// where the UTC fields hold Sydney's clock), then re-anchor every occurrence to
// the offset in force on its OWN date.
function expandRrule(ev, allDay, baseStart) {
  const from = new Date(weekStart.getTime() - 86400000);
  // All-day series are floating UTC-midnight dates — no wall time to preserve,
  // and rrule already walks them correctly.
  if (allDay) return ev.rrule.between(from, radarEnd, true);

  const o = ev.rrule.origOptions;
  const opts = { ...o, tzid: null, dtstart: naiveOf(baseStart) };
  if (o.until) opts.until = naiveOf(o.until instanceof Date ? o.until : new Date(o.until));
  return new RRule(opts)
    .between(naiveOf(from), naiveOf(radarEnd), true)
    .map(instantOf);
}

async function fetchCalendar(name, url) {
  // A local path instead of a URL loads a fixture .ics — how you test a gather
  // without the real feeds (see DRY_RUN).
  const events = /^https?:/i.test(url)
    ? await ical.async.fromURL(url)
    : await ical.async.parseFile(url);
  const week = [], radar = [], seen = new Set();

  const add = (start, end, allDay, ev) => {
    const key = `${ev.uid || ev.summary}|${start.toISOString()}`;
    if (seen.has(key)) return;
    seen.add(key);
    const line = {
      calendar: name,
      summary: (ev.summary || "").trim(),
      description: (ev.description || "").trim().slice(0, 300),
      location: (ev.location || "").trim(),
      allDay,
      start: allDay
        ? fmtDay(calendarDay(start))
        : start.toLocaleString("en-AU", { timeZone: TZ, weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }),
      // DTEND is exclusive, so the last day is the day before it — counted in
      // calendar days, never as "minus 24 hours" (see calendarDay).
      end: allDay ? fmtDay(calendarDay(end) - DAY) : "",
      sortKey: allDay ? calendarDay(start) : start.getTime(),
    };
    if (start <= sundayEnd && end > weekStart) week.push(line);
    else if (allDay && start > sundayEnd && start <= radarEnd) radar.push(line);
  };

  for (const ev of Object.values(events)) {
    if (ev.type !== "VEVENT") continue;
    const allDay = ev.datetype === "date";
    const baseStart = ev.start instanceof Date ? ev.start : new Date(ev.start);
    const baseEnd = ev.end instanceof Date ? ev.end : new Date(ev.end ?? ev.start);
    const durMs = Math.max(baseEnd.getTime() - baseStart.getTime(), allDay ? 86400000 : 0);

    // Overridden (edited/dragged) instances of a series — collect where they LANDED.
    const overrides = ev.recurrences ? Object.values(ev.recurrences) : [];
    const overriddenKeys = new Set();
    for (const o of overrides) {
      overriddenKeys.add(sydKey(
        o.recurrenceid instanceof Date ? o.recurrenceid : new Date(o.recurrenceid ?? o.start)));
      const oStart = o.start instanceof Date ? o.start : new Date(o.start);
      const oEnd = o.end instanceof Date ? o.end : new Date(oStart.getTime() + durMs);
      add(oStart, oEnd, o.datetype === "date" || allDay, o);
    }

    if (ev.rrule) {
      // Expand the repeat rule into real instances across our window.
      const exKeys = new Set(
        Object.values(ev.exdate ?? {}).map((d) => sydKey(d instanceof Date ? d : new Date(d))));
      for (const d of expandRrule(ev, allDay, baseStart)) {
        const dKey = sydKey(d);
        if (overriddenKeys.has(dKey)) continue; // moved — the override above placed it
        if (exKeys.has(dKey)) {
          // Cancelled — and SAID so. Leaving it out is not enough: household.md
          // lists the usual week ("Tuesday 5pm: piano"), and the first preview
          // put two cancelled sessions straight back from that routine, because
          // an absent line reads as "not on the calendar", not "not happening".
          add(d, new Date(d.getTime() + durMs), allDay,
            { ...ev, uid: `${ev.uid}|cancelled`, summary: `CANCELLED — ${ev.summary}`, description: "" });
          continue;
        }
        add(d, new Date(d.getTime() + durMs), allDay, ev);
      }
    } else if (!ev.recurrenceid) {
      // Plain one-off event.
      add(baseStart, baseEnd, allDay, ev);
    }
  }

  week.sort(byTime);
  radar.sort(byTime);
  return { week, radar };
}

// ---------- gather: gmail label via IMAP ----------
const emailDate = (d) =>
  `${sydKey(d)} (${d.toLocaleDateString("en-AU", { timeZone: TZ, weekday: "short" })})`;

async function fetchSchoolMail() {
  if (DRY_RUN) return null; // null = not swept, which the collected file says in so many words
  if (PREVIEW && !process.env.GMAIL_APP_PASSWORD) {
    console.log("PREVIEW: no Gmail credentials in .env — skipping the school email sweep.");
    return null;
  }
  const client = new ImapFlow({
    host: "imap.gmail.com", port: 993, secure: true, logger: false,
    auth: { user: env("GMAIL_ADDRESS"), pass: env("GMAIL_APP_PASSWORD") },
  });
  const since = new Date(Date.now() - 7 * 86400000);
  const out = [];
  await client.connect();
  try {
    await client.mailboxOpen(GMAIL_LABEL, { readOnly: true });
    for await (const msg of client.fetch({ since }, { source: true, envelope: true })) {
      const parsed = await simpleParser(msg.source);
      out.push({
        // Sydney date, with the weekday spelled out: an email saying "Monday" or
        // "tomorrow" can only be resolved against the day it was SENT.
        date: msg.envelope.date ? emailDate(msg.envelope.date) : "",
        from: msg.envelope.from?.[0]?.address ?? "",
        subject: msg.envelope.subject ?? "",
        body: (parsed.text || "").replace(/\s+/g, " ").trim().slice(0, 1500),
      });
    }
  } finally {
    await client.logout();
  }
  return out;
}

// ---------- compose + audit: prompts live in compose.mjs so the eval shares them ----------
const factory = (name) => factoryOf(REPO, name);

// The week this run is for, in the two forms the prompt needs.
const dayList = Array.from({ length: 7 }, (_, i) =>
  fmtUTC(mondayUTC + i * DAY, { weekday: "long", day: "numeric", month: "short" })
).join("; ");
const runDate = new Date().toLocaleDateString("en-AU",
  { timeZone: TZ, weekday: "long", day: "numeric", month: "short" });

async function composeDigest(collected, corrections = []) {
  const { text, usage, stopReason } = await composeWith({
    repo: REPO, apiKey: env("ANTHROPIC_API_KEY"), collected, dayList, runDate, corrections,
  });
  console.log(`Compose: stop_reason=${stopReason} chars=${text.length} in=${usage?.input_tokens} out=${usage?.output_tokens}`);
  return text;
}

// ---------- verify: audit the draft before anyone reads it ----------
// The 7 Sept and 14 Sept runs had the same prompt, the same factory files and
// the same model, and differed in quality. Judgment that lives only in a prompt
// gets resampled every Sunday. So the draft is checked before it goes out:
// mechanically first (checks.mjs), then by a second model reading rules.md.
//
// The whole pass is FAIL-OPEN. A broken verifier must never cost the family
// their digest — every failure here degrades to "send the draft anyway".
async function verify(email, sms, collected) {
  const mechanical = failures(runChecks({ email, sms, collected, household: factory("household.md") }));
  let audited = [];
  try {
    audited = await auditWith({
      repo: REPO, apiKey: env("ANTHROPIC_API_KEY"), collected, email, sms,
    });
  } catch (e) {
    // Fail open, loudly. No audit is worse than a digest that never arrives.
    console.error(`Verify: audit step failed, continuing without it — ${e.message}`);
  }
  return [...mechanical, ...audited];
}

const fmtFindings = (fs) =>
  fs.map((f) => `- [${f.severity}] ${f.rule}: ${f.detail}`).join("\n");

// ---------- send via Gmail SMTP ----------
// ---------- branded email: the model writes content, the CODE owns the design ----------
const P = { // swap these for your own. They are the email's entire design.
  bg: "#FCFCFB", wash: "#F9F9F7", ink: "#2E2C27", soft: "#6B6A63",
  grey: "#B4B3A8", hairline: "#E4E3DC", clay: "#C6613F",
};
function esc(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
function inline(s) {
  return esc(s).replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
}
function toHtml(body, weekLabel) {
  const lines = body.split("\n");
  let greeting = "", signoff = "", out = [], listOpen = false, i = 0;
  while (i < lines.length && !lines[i].trim()) i++;
  if (i < lines.length && !lines[i].startsWith("##")) greeting = lines[i++].trim();
  const closeList = () => { if (listOpen) { out.push("</ol>"); listOpen = false; } };
  let remIndex = 0;
  for (; i < lines.length; i++) {
    const t = lines[i].trim();
    if (!t) continue;
    if (t.startsWith("~ ")) { signoff = t.slice(2).trim(); continue; }
    if (t.startsWith("## ")) {
      closeList();
      const h = t.slice(3).trim();
      const isSection = /^(REMEMBER|RADAR)/i.test(h);
      out.push(
        `<h2 style="font-family:-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;` +
        `font-size:12px;font-weight:600;letter-spacing:.11em;text-transform:uppercase;` +
        `color:${P.ink};margin:34px 0 12px;border-top:1px solid ${P.hairline};padding-top:22px;">` +
        `${esc(h)}</h2>`);
      if (isSection) remIndex = 0;
      continue;
    }
    if (t.startsWith("- ")) {
      if (!listOpen) { out.push(`<ol style="margin:0;padding:0;list-style:none;">`); listOpen = true; }
      remIndex++;
      out.push(
        `<li style="display:block;margin:0 0 14px;">` +
        `<span style="color:${P.grey};font-size:13px;padding-right:12px;">${remIndex}</span>` +
        `<span style="font-size:14px;line-height:1.55;color:${P.soft};">${inline(t.slice(2))}</span></li>`);
      continue;
    }
    closeList();
    out.push(`<p style="margin:0 0 8px;font-size:14px;line-height:1.55;color:${P.soft};">${inline(t)}</p>`);
  }
  closeList();
  return `<!DOCTYPE html><html><body style="margin:0;padding:0;background:${P.bg};">
<div style="background:${P.wash};border-bottom:1px solid ${P.hairline};padding:44px 0;">
  <div style="max-width:640px;margin:0 auto;padding:0 28px;">
    <div style="font-family:-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:13px;letter-spacing:.02em;color:${P.soft};margin-bottom:12px;">The Sunday Rundown &middot; ${esc(weekLabel)}</div>
    <div style="font-family:Georgia,'Times New Roman',serif;font-weight:600;font-size:32px;line-height:1.2;color:${P.ink};letter-spacing:-.01em;">${esc(greeting)}</div>
  </div>
</div>
<div style="background:${P.bg};padding:8px 0 48px;">
  <div style="max-width:640px;margin:0 auto;padding:0 28px;font-family:-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
    ${out.join("\n")}
    ${signoff ? `<p style="margin:40px 0 0;font-family:Georgia,serif;font-style:italic;font-size:16px;color:${P.ink};border-top:2px solid ${P.clay};padding-top:20px;display:inline-block;">${esc(signoff)}</p>` : ""}
  </div>
</div></body></html>`;
}

async function send(subject, body, weekLabel) {
  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com", port: 465, secure: true,
    auth: { user: env("GMAIL_ADDRESS"), pass: env("GMAIL_APP_PASSWORD") },
  });
  await transporter.sendMail({
    from: `"The Sunday Rundown" <${env("GMAIL_ADDRESS")}>`,
    to: env("DIGEST_RECIPIENTS"),
    subject,
    text: body,
    html: toHtml(body, weekLabel),
  });
}

// ---------- main ----------
const [family, school, mail] = await Promise.all([
  fetchCalendar("Family", env("FAMILY_ICS_URL")),
  fetchCalendar("School", env("SCHOOL_ICS_URL_FILTERED")),
  fetchSchoolMail(),
]);

const calLine = (e) =>
  `- [${e.calendar}] ${e.allDay ? `${e.start}${e.end !== e.start ? " to " + e.end : ""} (all day)` : e.start}: ${e.summary}` +
  (e.description ? ` | desc: ${e.description}` : "") + (e.location ? ` | loc: ${e.location}` : "");

const collected = [
  `# Collected — week ${stamp}`,
  `\n## Week events (Mon–Sun)`,
  ...[...family.week, ...school.week].sort(byTime).map(calLine),
  `\n## Radar (all-day events, next 28 days)`,
  ...[...family.radar, ...school.radar].sort(byTime).map(calLine),
  `\n## School email (label ${GMAIL_LABEL}, last 7 days)`,
  // Never leave this section blank. The first preview had an empty one, and
  // the model filled it: four invented school emails, a $38.00 receipt and a
  // permission note "due Wednesday", all of which reached the draft SMS.
  ...(mail === null
    ? [EMAIL_NOT_SWEPT]
    : mail.length
      ? mail.map((m) => `- ${m.date} | ${m.from} | ${m.subject}\n  ${m.body}`)
      : [EMAIL_NONE]),
].join("\n");

// A dry run is a preview, so it lands in outputs/. Writing it to runs/ would
// overwrite a real run's artifact, which the bot has already committed.
const collectedPath = join(OUT_DIR, `${stamp}-collected.md`);
mkdirSync(dirname(collectedPath), { recursive: true });
writeFileSync(collectedPath, collected);
console.log(`Collected: ${family.week.length + school.week.length} week events, ${family.radar.length + school.radar.length} radar, ${mail === null ? "email not swept" : `${mail.length} emails`}`);

if (DRY_RUN) {
  console.log(`DRY_RUN: wrote ${collectedPath} — no compose, no email, no SMS.`);
  process.exit(0);
}

// The model spaces the SMS day lines some weeks and runs them together others
// ("Mon: ...\nTue: ...\nWed: ..."), which lands on a phone as a wall of text.
// The compose prompt asks for the gap; this makes it true regardless.
const SMS_DAY_LINE =
  /^(monday|tuesday|wednesday|thursday|friday|saturday|sunday|tues|weds|thurs|thur|mon|tue|wed|thu|fri|sat|sun)\b[^\n]{0,16}?\s*[:\u2013\u2014-]\s/i;
function spaceSmsDays(sms) {
  const out = [];
  for (const raw of sms.split(/\r?\n/)) {
    const line = raw.trimEnd();
    if (SMS_DAY_LINE.test(line) && out.length > 0 && out[out.length - 1] !== "") out.push("");
    out.push(line);
  }
  return out.join("\n").replace(/\n{3,}/g, "\n\n");
}

// No SMS_RECIPIENTS: texting is opt-in, so this is "email-only mode", not a
// missing secret. Skip Twilio entirely rather than exiting the whole run.
async function sendSms(body) {
  const recipients = envOptional("SMS_RECIPIENTS");
  if (!recipients) {
    console.log("SMS: no SMS_RECIPIENTS set — skipping text, email-only mode.");
    return;
  }
  const sid = env("TWILIO_ACCOUNT_SID");
  const auth = Buffer.from(`${sid}:${env("TWILIO_AUTH_TOKEN")}`).toString("base64");
  const from = env("TWILIO_FROM_NUMBER");
  for (const to of recipients.split(",").map((s) => s.trim())) {
    const res = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${auth}`,
          "content-type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({ To: to, From: from, Body: body }),
      }
    );
    if (!res.ok) console.error(`SMS to ${to} failed: ${res.status} ${await res.text()}`);
    else console.log(`SMS sent to ${to}`);
  }
}

const subject = `The Week Ahead — ${monLabel({ day: "numeric", month: "short" })} to ${sunLabel({ day: "numeric", month: "short" })}`;

// Split one compose response into the two artifacts the family actually gets.
function draftFrom(raw) {
  const [email, smsRaw] = raw.split(/\n?===SMS===\n?/);
  const sms = spaceSmsDays(
    (smsRaw || `${subject} — the digest ran but the SMS section came back empty. Full plan is in your email.`).trim()
  ).slice(0, 1300);
  return { email: (email ?? "").trim(), sms };
}

let draft = draftFrom(await composeDigest(collected));
let findings = await verify(draft.email, draft.sms, collected);
console.log(`Verify: ${findings.length} finding(s)` +
  (findings.length ? `\n${fmtFindings(findings)}` : ""));

// One retry, and only for findings that mean a FACT is wrong. Style drift is
// recorded and shipped — a second call is not worth it, and the regenerated
// draft is only kept if it is actually better.
if (blocking(findings).length) {
  console.log(`Verify: ${blocking(findings).length} blocking — recomposing once with the findings.`);
  try {
    const retry = draftFrom(await composeDigest(collected, blocking(findings)));
    const retryFindings = await verify(retry.email, retry.sms, collected);
    if (retry.email && blocking(retryFindings).length < blocking(findings).length) {
      console.log(`Verify: retry is better (${blocking(retryFindings).length} blocking) — using it.`);
      draft = retry;
      findings = retryFindings;
    } else {
      console.log("Verify: retry was no better — keeping the first draft.");
    }
  } catch (e) {
    console.error(`Verify: recompose failed, keeping the first draft — ${e.message}`);
  }
}

const { email: emailBody, sms: smsBody } = draft;

// The run artifact records what the audit said, pass or fail. A digest that
// went out with known findings should say so in the record, not in the SMS.
const digestPath = join(OUT_DIR, `${stamp}-digest.md`);
writeFileSync(digestPath,
  `Subject: ${subject}\n\n${emailBody}\n\n---SMS---\n${smsBody}\n\n---VERIFY---\n` +
  (findings.length ? fmtFindings(findings) : "No findings."));

if (!emailBody) throw new Error("Email body empty after SMS split — aborting send.");
if (PREVIEW) {
  console.log(`PREVIEW: wrote ${digestPath} — stopped before sending. Nothing went to anyone.`);
  process.exit(0);
}
await send(subject, emailBody.trim(), `${monLabel({ day: "numeric", month: "short" })} – ${sunLabel({ day: "numeric", month: "short" })}`);
console.log(`Email sent "${subject}" to ${env("DIGEST_RECIPIENTS")}`);
await sendSms(smsBody);
