# calendar-filter

Factory equipment, not a stage. Filters a whole-school ICS feed down to the
events relevant to one child, renames cryptic titles, and injects the term and
holiday dates the export leaves out. Deployed on Vercel. Google Calendar
subscribes to its URL.

All the logic and the maintenance notes live in
`app/api/school-cal/route.ts`, in the DENY array. `BAN-LIST.md` beside this
file explains what belongs in it and why. Start with whichever you prefer.

Two environment variables, set in Vercel:

- `SCHOOL_ICS_URL`: your school's iCal export URL
- `FEED_KEY`: a long random string of your choosing. Requests without
  `?key=<FEED_KEY>` get a 404, so the URL is not guessable

Workspace context: see the repo root `CLAUDE.md`.
