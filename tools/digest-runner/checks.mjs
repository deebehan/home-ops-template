// tools/digest-runner/checks.mjs
// The rules of _shared/rules.md, voice.md and digest-template.md that a machine
// can check — expressed once, used twice: the Sunday runner audits every draft
// before it sends, and the eval grades with these same functions. One
// definition of "correct". If a check and a rule disagree, the rule wins and
// the check is the bug.
//
// Every check returns { rule, severity, ok, detail }.
//   blocking — a fact could be wrong. Worth spending a second compose call on.
//   warn     — style or shape drifted. Recorded, never blocks the digest.

export const BLOCKING = "blocking";
export const WARN = "warn";

const ok = (rule, severity, detail = "") => ({ rule, severity, ok: true, detail });
const bad = (rule, severity, detail) => ({ rule, severity, ok: false, detail });

// ---------- times ----------
// "Never invent or infer times" is the first line of rules.md, so it gets the
// one genuinely mechanical check available: every clock time in the draft must
// trace back to the collected data or to the household's standing routine.
const TIME_RE = /\b(\d{1,2})(?:[:.](\d{2}))?\s*(am|pm)\b|\b(\d{1,2})[:.](\d{2})\b/gi;

// One written time -> every reading it could be. "5pm" is unambiguous (17:00);
// a bare "6:45" could be either half of the day, so it carries both.
function readings(match) {
  const out = new Set();
  if (match[3]) {
    const h = (+match[1] % 12) + (/pm/i.test(match[3]) ? 12 : 0);
    out.add(`${h}:${match[2] ?? "00"}`);
  } else {
    const h = +match[4];
    out.add(`${h}:${match[5]}`);
    if (h <= 12) out.add(`${h + 12}:${match[5]}`);
  }
  return out;
}

export function timeOccurrences(text) {
  return [...text.matchAll(TIME_RE)]
    // "$38.00" is money, not 38 o'clock — amounts have their own check below.
    .filter((m) => text[m.index - 1] !== "$")
    .filter((m) => (m[3] ? +m[1] >= 1 && +m[1] <= 12 : +m[4] <= 23))
    .map((m) => ({ written: m[0].trim(), readings: readings(m) }));
}

// Every reading of every time anywhere in the sources.
export function allowedTimes(...sources) {
  const set = new Set();
  for (const src of sources) {
    for (const occ of timeOccurrences(src || "")) for (const r of occ.readings) set.add(r);
  }
  return set;
}

export function checkNoInventedTimes(draft, allowed) {
  const invented = timeOccurrences(draft)
    .filter((occ) => ![...occ.readings].some((r) => allowed.has(r)))
    .map((occ) => occ.written);
  const unique = [...new Set(invented)];
  return unique.length
    ? bad("never-invent-times", BLOCKING,
        `Time(s) in the draft that appear in no source: ${unique.join(", ")}`)
    : ok("never-invent-times", BLOCKING);
}

// ---------- amounts ----------
// Same principle as times, for money: every dollar figure in the draft must
// appear in a source. The first preview's draft carried a "$38.00" receipt for
// school musical tickets that existed nowhere but in the model's imagination.
const AMOUNT_RE = /\$\s?(\d{1,3}(?:,\d{3})+|\d+)(?:\.(\d{2}))?/g;
const amounts = (text) =>
  [...(text || "").matchAll(AMOUNT_RE)].map((m) => `$${m[1].replace(/,/g, "")}.${m[2] ?? "00"}`);

export function checkNoInventedAmounts(draft, ...sources) {
  const allowed = new Set(sources.flatMap(amounts));
  const invented = [...new Set(amounts(draft))].filter((a) => !allowed.has(a));
  return invented.length
    ? bad("never-invent-amounts", BLOCKING, `Amount(s) in the draft that appear in no source: ${invented.join(", ")}`)
    : ok("never-invent-amounts", BLOCKING);
}

// ---------- source material pasted into the draft ----------
// The same preview opened the email with four fabricated "# Email from: …
// Subject: … Body: …" blocks before the greeting. None of those shapes ever
// belongs in a digest, real or invented, so their presence alone is blocking.
const SOURCE_LINE = /^\s*(#+\s*Email from\b|Subject:|Body:|From:|- \[(Family|School)\])/i;

export function checkNoSourceMaterial(email, sms) {
  const hits = `${email}\n${sms}`.split("\n").filter((l) => SOURCE_LINE.test(l));
  return hits.length
    ? bad("no-source-material", BLOCKING,
        `${hits.length} line(s) of pasted or invented source material, e.g. "${hits[0].trim().slice(0, 70)}"`)
    : ok("no-source-material", BLOCKING);
}

// ---------- SMS shape ----------
// Kept in sync with run.mjs's SMS_DAY_LINE by intent: this asks whether the
// gaps are there, that one puts them there.
export const SMS_DAY_LINE =
  /^(monday|tuesday|wednesday|thursday|friday|saturday|sunday|tues|weds|thurs|thur|mon|tue|wed|thu|fri|sat|sun)\b[^\n]{0,16}?\s*[:–—-]\s/i;

export function checkSmsDayGaps(sms) {
  const lines = sms.split("\n");
  const missing = lines
    .map((l, i) => [l, i])
    .filter(([l, i]) => i > 0 && SMS_DAY_LINE.test(l.trim()) && lines[i - 1].trim() !== "")
    .map(([l]) => l.slice(0, 24));
  return missing.length
    ? bad("sms-day-gaps", WARN, `Day line(s) with no blank line above: ${missing.join(" | ")}`)
    : ok("sms-day-gaps", WARN);
}

export function checkSmsLength(sms, limit = 1200) {
  return sms.length > limit
    ? bad("sms-length", WARN, `${sms.length} chars, template limit ${limit}`)
    : ok("sms-length", WARN, `${sms.length} chars`);
}

// voice.md: emojis carry meaning. 🙏🏻 only when the helper runs the full morning,
// 🎉 only on birthdays. Anything else is decoration standing in for a fact.
const ALLOWED_EMOJI = /[\u{1F64F}\u{1F389}\u{1F3FB}-\u{1F3FF}\u{FE0F}\u{200D}]/u;

export function checkEmojiDiscipline(sms) {
  const stray = [...new Set(
    [...sms].filter((ch) => /\p{Extended_Pictographic}/u.test(ch) && !ALLOWED_EMOJI.test(ch)))];
  return stray.length
    ? bad("emoji-discipline", WARN, `Emoji outside the 🙏🏻/🎉 allowlist: ${stray.join(" ")}`)
    : ok("emoji-discipline", WARN);
}

// ---------- email shape ----------
// The format the branded-email renderer in run.mjs parses. If these drift, the
// HTML silently loses its headings or its sign-off.
export function checkEmailShape(email) {
  const lines = email.split("\n").map((l) => l.trim()).filter(Boolean);
  const problems = [];
  if (!lines.length || lines[0].startsWith("##")) problems.push("no greeting line before the first day");
  const dayHeads = lines.filter((l) => /^## /.test(l) && !/^## (REMEMBER|RADAR)/i.test(l));
  if (dayHeads.length < 5) problems.push(`only ${dayHeads.length} day headings`);
  if (!lines.some((l) => l.startsWith("~ "))) problems.push("no '~ ' sign-off line");
  return problems.length
    ? bad("email-shape", WARN, problems.join("; "))
    : ok("email-shape", WARN, `${dayHeads.length} day headings`);
}

// The 7 Sept run opened with a paragraph of the model reasoning about the data
// ("Looking at this data: Mon 7 Sept is the musical dress rehearsal...") before
// the greeting. It went out that way. The greeting is one line; anything longer
// in that slot is thinking that escaped.
export function checkGreetingIsALine(email, limit = 140) {
  const first = email.split("\n").map((l) => l.trim()).find(Boolean) ?? "";
  return first.length > limit
    ? bad("greeting-is-a-line", BLOCKING,
        `First line is ${first.length} chars — reasoning leaked into the greeting: "${first.slice(0, 70)}…"`)
    : ok("greeting-is-a-line", BLOCKING, `${first.length} chars`);
}

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export function checkAllDaysPresent(email) {
  const missing = DAYS.filter((d) => !new RegExp(`^##\\s+${d}\\b`, "im").test(email));
  return missing.length
    ? bad("all-days-present", WARN, `Email has no heading for: ${missing.join(", ")}`)
    : ok("all-days-present", WARN);
}

// rules.md: RADAR is ONE line. Two only if two genuinely tie.
export function checkRadarOneLine(email) {
  const m = email.match(/^## RADAR\s*$([\s\S]*?)(?=^## |\n~ |\z)/im);
  if (!m) return ok("radar-one-line", WARN, "no RADAR section");
  const body = m[1].split("\n").map((l) => l.trim()).filter((l) => l && !l.startsWith("~ "));
  return body.length > 2
    ? bad("radar-one-line", WARN, `${body.length} radar lines; the rule allows one, two only if tied`)
    : ok("radar-one-line", WARN, `${body.length} line(s)`);
}

// ---------- the whole battery ----------
export function runChecks({ email, sms, collected, household }) {
  const allowed = allowedTimes(collected, household);
  return [
    checkNoSourceMaterial(email, sms),
    checkNoInventedTimes(`${email}\n${sms}`, allowed),
    checkNoInventedAmounts(`${email}\n${sms}`, collected, household),
    checkSmsDayGaps(sms),
    checkSmsLength(sms),
    checkEmojiDiscipline(sms),
    checkGreetingIsALine(email),
    checkEmailShape(email),
    checkAllDaysPresent(email),
    checkRadarOneLine(email),
  ];
}

export const failures = (results) => results.filter((r) => !r.ok);
export const blocking = (results) => results.filter((r) => !r.ok && r.severity === BLOCKING);
