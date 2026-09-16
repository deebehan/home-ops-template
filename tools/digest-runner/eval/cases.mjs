// tools/digest-runner/eval/cases.mjs
// The eval's input set: 14 variants of one made-up week.
//
// Each variant changes ONE fact so it isolates ONE rule, and carries the
// expectation that rule implies. Every case names the rule it exists for; if a
// rule ever leaves _shared/, its cases should leave too.
//
// Deliberate design choice: for every "must not appear" case there is a
// matching "must appear" one. A digest that drops everything would otherwise
// score perfectly. `receipt-removed` is the control for the paid excursion,
// and `live-relative-date` is the control for `stale-relative-date`.
//
// The base week is fixtures/sample-week-collected.md, which is invented. Swap
// in a real week of your own once you have one and these cases will test your
// household instead of a fictional one.
//
// Read the materialised inputs with:  npm run eval:cases

import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { EMAIL_NONE } from "../compose.mjs"; // the words the runner writes for an empty sweep

const HERE = dirname(fileURLToPath(import.meta.url));
const B = readFileSync(join(HERE, "fixtures", "sample-week-collected.md"), "utf8");

// ---------- patch helpers ----------
const dropLines = (text, re) => text.split("\n").filter((l) => !re.test(l)).join("\n");
const addWeekEvent = (text, line) =>
  text.replace(/(## Week events \(Mon–Sun\)\n)/, `$1${line}\n`);
const addRadar = (text, line) =>
  text.replace(/(## Radar \(all-day events, next 28 days\)\n)/, `$1${line}\n`);
const addEmail = (text, block) => text.trimEnd() + "\n" + block + "\n";
// Drop an email by its subject line and the indented body line that follows.
function dropEmail(text, subjectRe) {
  const lines = text.split("\n");
  const out = [];
  for (let i = 0; i < lines.length; i++) {
    if (/^- \d{4}-\d{2}-\d{2}/.test(lines[i]) && subjectRe.test(lines[i])) {
      i++;
      while (i + 1 < lines.length && !/^- \d{4}-\d{2}-\d{2}/.test(lines[i + 1]) && !/^#/.test(lines[i + 1])) i++;
      continue;
    }
    out.push(lines[i]);
  }
  return out.join("\n");
}

// ---------- expectation helpers ----------
// `o` is { email, sms, both, collected }.
const has = (re) => (o) => re.test(o.both);
const lacks = (re) => (o) => !re.test(o.both);
// Every line that mentions `subject` must also carry `marker`. Absent is fine.
// Written after the first pilot: a regex for "aquarium near 'pay'" failed a
// digest that said, correctly, "Done ✓ ... consent and payment lodged".
const everyMentionIs = (subject, marker) => (o) =>
  o.both.split("\n").filter((l) => subject.test(l)).every((l) => marker.test(l));
const expect = (name, why, fn) => ({ name, why, fn });

export const CASES = [
  // ---------- the two real weeks ----------
  {
    id: "stale-relative-date",
    rule: "email items carry their OWN date",
    why: "The 3 Sept email says 'Monday' and 'tomorrow'. Both passed before Sunday. This is the exact failure of the 14 Sept run.",
    collected: B, monday: "2026-09-14",
    expect: [
      expect("no live opt-out deadline", "Presenting a passed deadline as upcoming is the failure.",
        lacks(/contact the school (tomorrow|by Tue)/i)),
    ],
  },
  {
    id: "live-relative-date",
    rule: "email items carry their OWN date (control)",
    why: "The control for the case above. An email sent Fri 11 Sept saying 'Monday' DOES mean 14 Sept. Dropping it would be just as wrong as misdating the other one.",
    collected: addEmail(B,
      "- 2026-09-11 (Fri) | office@school.example | Whole School Assembly\n" +
      "  Dear Parents, a reminder that our whole school assembly is on Monday at 9:15am in the hall. Year 3 will be presenting. Parents welcome."),
    monday: "2026-09-14",
    expect: [
      expect("assembly appears", "Sent Friday, 'Monday' resolves to 14 Sept, inside the digest week.",
        has(/assembly/i)),
      expect("assembly time kept", "9:15am is stated in the email and must be quoted, not dropped or changed.",
        has(/9[:.]15\s*am/i)),
    ],
  },

  // ---------- rules.md: receipt matching ----------
  {
    id: "receipt-removed",
    rule: "receipt matching (negative control)",
    why: "Same week with the payment receipt deleted. Now the excursion IS an open ask and must be raised. Proves the receipt rule isn't just 'always drop it'.",
    collected: dropEmail(B, /Payment receipt/),
    monday: "2026-09-14",
    expect: [
      expect("excursion raised", "No receipt means the ask is live and belongs in REMEMBER.",
        has(/aquarium|excursion/i)),
    ],
  },

  // ---------- household.md: city days and cover ----------
  {
    id: "no-city-days",
    rule: "no city events = flag the calendar gap, never assume",
    why: "Every '— OFFICE' event removed. household.md says note it once as a possible calendar gap rather than declaring everyone home.",
    collected: dropLines(B, /— OFFICE/),
    monday: "2026-09-14",
    expect: [
      expect("gap flagged", "A whole week with no city days is more likely an empty calendar than a genuine week at home.",
        has(/calendar gap|no city days|nothing marked|no.{0,12}OFFICE/i)),
    ],
  },
  {
    id: "coverage-gap",
    rule: "coverage gap detection",
    why: "Both parents in the city on a day with an after-school pickup and no the helper note. rules.md says raise it in REMEMBER rather than assume.",
    collected: addWeekEvent(
      addWeekEvent(B, "- [Family] Wed, 16 Sept (all day): Parent B — OFFICE"),
      "- [Family] Wed, 16 Sept, 4:00 pm: Kid one: Orthodontist"),
    monday: "2026-09-14",
    expect: [
      expect("Wednesday cover raised", "Two parents in Sydney and a 4pm appointment is an unanswered question.",
        has(/(who|cover|coverage|coverage gap)[^.\n]{0,80}(wed|4\s*(:00)?\s*pm|orthodont)/i)),
    ],
  },

  // ---------- rules.md: costume / dress-up, flagged the week before ----------
  {
    id: "costume-day",
    rule: "costume/dress-up days: flag the week BEFORE",
    why: "A dress-up day 10 days out. Never night-before news.",
    collected: addRadar(B, "- [School] Thu, 24 Sept (all day): Book Week parade — come dressed as your favourite book character"),
    monday: "2026-09-14",
    expect: [
      expect("dress-up flagged early", "It lands outside the digest week, so this run is the warning.",
        has(/book week|dress(ed)? up|costume|favourite book character/i)),
    ],
  },

  // ---------- rules.md: never invent, quote verbatim ----------
  {
    id: "title-with-time",
    rule: "all-day events with a time in the title: show verbatim",
    why: "An all-day event whose title carries its own time. The rule is to show the title, not to promote it to a timed event with a guessed slot.",
    collected: addWeekEvent(B, "- [School] Fri, 18 Sept (all day): Carols- 5pm"),
    monday: "2026-09-14",
    expect: [
      expect("carols appears", "It is on the calendar for that week.", has(/carols/i)),
      expect("title time kept", "'5pm' is in the title and must survive verbatim.", has(/carols[^\n]{0,20}5\s*pm/i)),
    ],
  },
  {
    id: "all-day-no-time",
    rule: "never invent times",
    why: "An event with no time at all. The temptation is to give it the usual one.",
    collected: addWeekEvent(B, "- [School] Tue, 15 Sept (all day): Year 3 incursion — CSIRO science show"),
    monday: "2026-09-14",
    expect: [
      expect("no time invented", "Nothing in any source gives this a clock time.",
        lacks(/(incursion|CSIRO)[^.\n]{0,40}\d{1,2}[:.]?\d{0,2}\s*(am|pm)/i)),
    ],
  },
  {
    id: "date-not-published",
    rule: "missing key fact -> say 'date not yet published'",
    why: "A consent-and-payment ask with no date anywhere. The rule forbids both omitting it and guessing.",
    collected: addEmail(B,
      "- 2026-09-10 (Thu) | office@school.example | Year 3 Zoo Snooze\n" +
      "  Dear parents, consent and payment are now open for the Year 3 Zoo Snooze overnight excursion. Please complete the online form. Cost $145.00 per student."),
    monday: "2026-09-14",
    expect: [
      expect("zoo snooze raised", "Money and consent: top of REMEMBER.", has(/zoo snooze/i)),
      expect("amount verbatim", "$145.00 is stated and must be quoted exactly.", has(/\$145(\.00)?/)),
      expect("no invented date", "No date is published anywhere in the source.",
        has(/not yet published|no date|date.{0,15}(tbc|to be confirmed)|check the form/i)),
    ],
  },

  // ---------- rules.md: care impact, radar discipline ----------
  {
    id: "sdd-care-impact",
    rule: "SDD / holidays within 2 weeks = phrase as care impact",
    why: "A staff development day inside the fortnight. The rule wants 'kids home — who's on?', not a bare calendar line.",
    collected: addRadar(B, "- [School] Mon, 21 Sept (all day): SDD — staff development day, students do not attend"),
    monday: "2026-09-14",
    expect: [
      expect("framed as cover", "A school closure is a childcare question first.",
        has(/(kids|max|children)[^.\n]{0,40}home|who('s| is) (on|covering)|no school/i)),
    ],
  },
  {
    id: "radar-crowded",
    rule: "RADAR is ONE line",
    why: "Six radar-worthy things at once. The rule holds the line at one, two only if two genuinely tie.",
    collected: addRadar(addRadar(addRadar(B,
      "- [School] Wed, 30 Sept (all day): Year 3 swimming carnival"),
      "- [Family] Thu, 1 Oct (all day): Nana & Grandad visiting"),
      "- [School] Fri, 2 Oct (all day): Athletics carnival — house colours"),
    monday: "2026-09-14",
    expect: [], // the radar-one-line check in checks.mjs carries this one
  },

  // ---------- the empty cases: where invention is most tempting ----------
  {
    id: "empty-week",
    rule: "never invent",
    why: "Almost nothing on. The failure mode is padding it out with plausible-sounding family life.",
    collected: "# Collected — week 2026-09-14\n\n## Week events (Mon–Sun)\n" +
      "- [Family] Wed, 16 Sept (all day): Parent B — OFFICE\n\n" +
      "## Radar (all-day events, next 28 days)\n\n" +
      `## School email (label School, last 7 days)\n${EMAIL_NONE}\n`,
    monday: "2026-09-14",
    expect: [
      expect("no invented school items", "There were no school emails at all.",
        lacks(/permission slip|excursion|assembly|canteen|uniform/i)),
      expect("quiet acknowledged", "An empty week should read as empty, not padded.",
        has(/quiet|nothing|clear|empty|light/i)),
    ],
  },
  {
    id: "no-emails",
    rule: "never invent (email sweep empty)",
    why: "A full calendar but no school email. REMEMBER has nothing to draw on and must say so in one line.",
    collected: B.split("## School email")[0] +
      "## School email (label School, last 7 days)\n" + EMAIL_NONE + "\n",
    monday: "2026-09-14",
    expect: [
      expect("no invented asks", "Nothing was swept, so nothing can be owed.",
        lacks(/\$\d|permission slip|consent form|payment receipt/i)),
      expect("calendar survives", "The calendar half is untouched and must still be there.",
        has(/musical/i)),
    ],
  },

  // ---------- compression under pressure ----------
  {
    id: "long-week",
    rule: "SMS under 1200 chars, compression cuts commentary never data",
    why: "A deliberately overloaded week. The rule is that compression drops jokes, not times, places or owners.",
    collected: addWeekEvent(addWeekEvent(addWeekEvent(addWeekEvent(B,
      "- [Family] Mon, 14 Sept, 7:30 pm: Parent A: Book club"),
      "- [Family] Tue, 15 Sept, 6:00 am: Parent B: Gym"),
      "- [Family] Wed, 16 Sept, 3:45 pm: Kid two: Swimming lesson"),
      "- [Family] Sat, 19 Sept, 9:00 am: Kid one: Football grand final"),
    monday: "2026-09-14",
    expect: [
      expect("grand final kept", "A grand final is exactly the thing compression must not drop.",
        has(/grand final/i)),
      expect("its time kept", "Compression cuts commentary, never data.", has(/9\s*(:00)?\s*am/i)),
    ],
  },
];
