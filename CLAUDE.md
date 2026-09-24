# home-ops

A household operations workspace. One pipeline lives here: the Sunday weekly
digest. Everything the family needs to remember for the coming week, pulled
from calendars and school email, delivered as one text and one email.

Built on ICM: folders carry sequencing, hierarchy carries context, files carry
state. If something needs explaining, the explanation lives in that folder's
CONTEXT.md, not in anyone's head.

## Where things live

| Folder | What it holds |
|---|---|
| `stages/` | the pipeline (one stage today: the weekly digest) |
| `_shared/` | factory: household, sources, rules, voice, template |
| `tools/` | factory equipment: the digest runner, the school-calendar filter |
| `outputs/` | previews, dry runs, simulations. Never an input to anything |
| `setup/` | one-time configuration questionnaire |

## Route by what just happened

| If | Go to | Then stop at |
|---|---|---|
| setting this up fresh | `setup/questionnaire.md`, then fill in `_shared/` | a preview that looks right |
| running the Sunday digest | `stages/01_weekly-digest/CONTEXT.md` | you read the digest |
| the digest got a judgment wrong | `_shared/rules.md`, encode the correction | commit |
| the digest sounded wrong | `_shared/voice.md` | commit |
| checking a gather without sending | `cd tools/digest-runner`, then `npm run gather:test` (fixture) or `gather:live` (real feeds) | read `outputs/` |
| checking a whole digest without sending | `cd tools/digest-runner`, then `npm run preview` | read `outputs/` |
| touching `tools/digest-runner/run.mjs` | from `tools/digest-runner`, `npm run gather:test` before you push. The training session must read 5:00 pm. Both gather scripts run as `TZ=UTC` because GitHub's runner does, and a timezone bug is invisible on a laptop set to your own zone | commit |
| changing anything in `_shared/` | from `tools/digest-runner`, `npm run eval` to see whether it helped | commit |
| school event leaking or missing in the calendar | `tools/calendar-filter/app/api/school-cal/route.ts`, the DENY array | test locally, push |
| your child changes year level (each January) | same DENY array, see its MAINTENANCE header | test, push |

## The one rule

Every correction becomes a line in `_shared/` or the DENY array. Never a
one-off tweak to one week's message. The factory learns, the runs stay
disposable.

## Before your first live Sunday

1. Fill in all five `_shared/` files. They are templates, not examples to keep.
2. Set `TZ` in `tools/digest-runner/run.mjs` to your own timezone.
3. Set the DENY array in the calendar filter to your child's year level.
4. Run `npm run preview` and read what it produces.
5. Only then let the schedule run.
