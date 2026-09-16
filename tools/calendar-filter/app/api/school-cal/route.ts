// app/api/school-cal/route.ts
// Filters a whole-school ICS down to what's relevant for one child (set your year level below),
// renames cryptic titles, and injects NSW term/holiday markers the export doesn't carry.
// Google Calendar subscribes to THIS route's URL (with ?key=), not the School Bytes one.
//
// Env vars required (Vercel > Settings > Environment Variables):
//   SCHOOL_ICS_URL = your school's iCal export URL (token included)
//   FEED_KEY       = long random string; requests without ?key=<FEED_KEY> get a 404
//
// MAINTENANCE — each January:
//   1. Review DENY for your child's new year level (see inline notes).
//   2. Add next year's term dates to INJECT_DATES (source: education.nsw.gov.au/schooling/calendars).

const DENY: RegExp[] = [
  // --- Other year levels / stages ---
  // EDIT THIS BLOCK FIRST. The example below is for a Year 3 child, who sits in
  // Stage 2. Keep YOUR year and YOUR stage out of this list, or you delete the
  // only events you wanted.
  /\byear\s*[1256]\b/i, // Year 1, 2, 5, 6 named events. Year 3 passes through.
  /\byr\s*[1256]\b/i,
  /\byear\s*4\b/i, // Year-4-only events (camp etc). DELETE THIS LINE in Jan 2027.
  /\byr\s*4\b/i, //                                  DELETE THIS LINE in Jan 2027.
  /\bstage\s*[13]\b/i, // Stage 1 (Yrs 1-2), Stage 3 (Yrs 5-6). Stage 2 passes through.
  /kind(y|er|ergarten)/i, // Kindy Headstart, Kinder info nights, 100 Days, Reptile Park
  // Your local high school's name and acronym, for the Year 6 transition events:
  // /\bXYZ\b/i,
  // /name of high school/i,
  /\bSRC\b/i,
  /farewell|graduation/i, // Year 6 send-offs

  // --- Rep / knockout sport (only relevant if your child gets picked. Delete the matching line if they are) ---
  /PSSA/i, // no word boundaries: schools weld acronyms (NSWPSSA, SCCPSSA)
  /knockout|gala\s*day|\btrials?\b/i,
  /\bzone\b|sydney north/i,
  /\bNSW\b.*(country|athletics|swimming|rugby|hockey|netball|basketball|soccer|cricket|league)/i,
  /\bvs\b/i, // "Boys Cricket Vs Another Public School"
  /boccia|inclusive sport/i, // add your region's named competitions here

  // --- Opt-in programs your child isn't in. Delete a line the term they join ---
  // (music/performing-arts line removed 2026-09-03: school musical + Festival of
  //  Instrumental Music are wanted on the calendar)
  /\bICAS\b/i, // opt-in academic comps
  /spelling bee|public speaking|chess/i,
  /enrichment day|interested and talented/i,

  // --- Committee / admin noise ---
  // Add your region's education committee acronyms here.
  /student voice|transition (meeting|day|support)/i,
  // NOTE: P&C deliberately NOT denied — add /\bP\s*&\s*C\b/i here if you never go.
];

// Rename cryptic school titles into something any subscriber (family, helper, class parents) understands.
// [match on SUMMARY, replacement]. First match wins; applied to the title only.
const RENAME: Array<[RegExp, string]> = [
  [/^SDD$/i, "SDD (kids home, no school)"],
  [/^SDD Term (\d)$/i, "SDD Term $1 (kids home, no school)"],
];

// Term and holiday dates your school's export probably doesn't include.
// These are NSW Eastern division as an example. REPLACE THEM with your own
// state or country's dates, from the education department's calendar page,
// and re-verify every January.
// Format: [YYYYMMDD start, YYYYMMDD end INCLUSIVE, title]. One-day events: start === end.
// Holiday spans run to the day BEFORE students return (absorbing SDD/public-holiday
// gap days) because the parent-useful fact is "kids home", not the official label.
const INJECT_DATES: Array<[string, string, string]> = [
  // 2026 (Eastern division)
  ["20260402", "20260402", "Term 1 ends"],
  ["20260407", "20260421", "Autumn school holidays (back Wed 22 Apr)"],
  ["20260422", "20260422", "Term 2 starts (students)"],
  ["20260703", "20260703", "Term 2 ends"],
  ["20260706", "20260720", "Winter school holidays (back Tue 21 Jul)"],
  ["20260721", "20260721", "Term 3 starts (students)"],
  ["20260925", "20260925", "Term 3 ends"],
  ["20260928", "20261012", "Spring school holidays (back Tue 13 Oct)"],
  ["20261013", "20261013", "Term 4 starts (students)"],
  ["20261217", "20261217", "Term 4 ends"],
  ["20261218", "20270202", "Summer school holidays (back Wed 3 Feb)"],
  // 2027 (Eastern division)
  ["20270203", "20270203", "Term 1 starts (students)"],
  ["20270409", "20270409", "Term 1 ends"],
  ["20270412", "20270428", "Autumn school holidays (back Thu 29 Apr)"],
  ["20270429", "20270429", "Term 2 starts (students)"],
  ["20270702", "20270702", "Term 2 ends"],
  ["20270705", "20270719", "Winter school holidays (back Tue 20 Jul)"],
  ["20270720", "20270720", "Term 3 starts (students)"],
  ["20270924", "20270924", "Term 3 ends"],
  ["20270927", "20271011", "Spring school holidays (back Tue 12 Oct)"],
  ["20271012", "20271012", "Term 4 starts (students)"],
  ["20271220", "20271220", "Term 4 ends"],
  ["20271221", "20280128", "Summer school holidays"], // extend once 2028 dates publish
];

function icsDate(yyyymmdd: string): string {
  return yyyymmdd;
}

function nextDay(yyyymmdd: string): string {
  const d = new Date(
    Date.UTC(+yyyymmdd.slice(0, 4), +yyyymmdd.slice(4, 6) - 1, +yyyymmdd.slice(6, 8))
  );
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10).replace(/-/g, "");
}

function buildInjectedEvents(): string {
  const stamp = new Date().toISOString().replace(/[-:]/g, "").slice(0, 15) + "Z";
  return INJECT_DATES.map(([start, end, title], i) => {
    // ICS all-day DTEND is EXCLUSIVE: day after the last real day.
    const dtend = nextDay(end);
    return [
      "BEGIN:VEVENT",
      `UID:homeops-inject-${start}-${i}@home-ops`,
      `DTSTART;VALUE=DATE:${icsDate(start)}`,
      `DTEND;VALUE=DATE:${dtend}`,
      `SUMMARY:${title}`,
      "CLASS:PUBLIC",
      `DTSTAMP:${stamp}`,
      "END:VEVENT",
    ].join("\r\n");
  }).join("\r\n");
}

function unfold(ics: string): string {
  // RFC 5545 line folding: continuation lines start with a space/tab.
  return ics.replace(/\r?\n[ \t]/g, "");
}

export async function GET(request: Request): Promise<Response> {
  const key = new URL(request.url).searchParams.get("key");
  if (!process.env.FEED_KEY || key !== process.env.FEED_KEY) {
    return new Response("Not found", { status: 404 });
  }

  const src = process.env.SCHOOL_ICS_URL;
  if (!src) return new Response("SCHOOL_ICS_URL not set", { status: 500 });

  const upstream = await fetch(src, { next: { revalidate: 3600 } });
  if (!upstream.ok) return new Response("Upstream calendar unavailable", { status: 502 });

  const raw = unfold(await upstream.text());

  // Events are self-contained BEGIN:VEVENT...END:VEVENT blocks.
  const events = raw.match(/BEGIN:VEVENT[\s\S]*?END:VEVENT/g) ?? [];
  const header = raw.slice(0, raw.indexOf("BEGIN:VEVENT"));

  const kept = events
    .filter((ev) => {
      const summary = ev.match(/^SUMMARY:(.*)$/m)?.[1] ?? "";
      return !DENY.some((rx) => rx.test(summary));
    })
    .map((ev) => {
      const m = ev.match(/^SUMMARY:(.*)$/m);
      if (!m) return ev;
      const title = m[1].trim();
      for (const [rx, replacement] of RENAME) {
        if (rx.test(title)) {
          return ev.replace(/^SUMMARY:.*$/m, "SUMMARY:" + title.replace(rx, replacement));
        }
      }
      return ev;
    });

  const body =
    header + kept.join("\r\n") + "\r\n" + buildInjectedEvents() + "\r\nEND:VCALENDAR\r\n";

  return new Response(body, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      // Vercel edge caches the filtered feed for an hour — matches the feed's own PT1H hint.
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
