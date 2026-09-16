# 01_weekly-digest, compose the week ahead

One job: turn the family's calendars and school email into one message nobody
has to remember anything without.

## Inputs

- Family calendar: Monday to Sunday of the coming week, plus all-day events for
  the next 4 weeks (the radar, and the away-day overrides)
- School calendar: same ranges. This is the filtered feed from
  `tools/calendar-filter`. It is already noise-free. Trust it, do not filter it
  again.
- The email label named in `sources.md`, last 7 days
- Reference, every run: `../../_shared/household.md`, `rules.md`, `voice.md`,
  `digest-template.md`, `sources.md`

Do NOT load: the whole inbox, other labels, other calendars, past runs, or the
calendar-filter code.

## Process

1. Build each weekday from `household.md` defaults, then apply any override
   events from the calendar. Flag coverage gaps per `rules.md`.
2. Merge both calendars day by day. Sweep the email label for dates, amounts,
   deadlines and instructions into REMEMBER, per `rules.md`. Quote, never
   invent.
3. Radar: all-day events 7 to 28 days out, thresholds in `rules.md`.
4. Compose to `digest-template.md`, in the voice of `voice.md`.
5. Verify before sending: the mechanical checks, then the rules audit. One
   recompose if a fact is wrong.
6. Send the email and the text. Write `runs/DATE-digest.md`.

## Outputs

- The text, which is the artifact the family actually reads
- The email, which is the archive
- `runs/DATE-collected.md` and `runs/DATE-digest.md`

## Human check

You read it Sunday morning. Every miss or annoyance becomes an edit to
`_shared/rules.md` (judgment) or `_shared/voice.md` (tone), committed before the
next Sunday. The prompt is never patched directly. It is regenerated from this
contract and the factory files on every run.
