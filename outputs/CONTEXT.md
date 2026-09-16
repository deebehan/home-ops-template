# outputs, things made for a human to look at

Previews, simulations, dry-run gathers, one-off reports. Anything produced so
you can see something before, or instead of, it going out for real.

## The line between this and `runs/`

| | `stages/*/runs/` | `outputs/` |
|---|---|---|
| Written by | the pipeline, every Sunday | a person, or a dry run, on request |
| Means | this is what actually went out | this is what it would look like |
| Committed by | the bot, automatically | whoever made it |
| Safe to delete | no, it is the record | yes, always |

A run's artifacts are evidence. Everything here is a picture of something. If
you ever find yourself reaching into `runs/` to write a preview, that is the
mistake `DRY_RUN` and `PREVIEW` exist to prevent. They write here instead.

## The one invariant

**Nothing in `outputs/` is an input to anything.** No stage reads this folder,
no prompt loads from it, no rule cites it. The moment something here starts
being read by a run, it is misfiled: durable judgment belongs in `_shared/`,
stage contracts belong with the stage. This folder is a dead end by design, and
that is what makes it safe to delete anything in it.

## How things get here

| Want | Run | Lands as |
|---|---|---|
| gather against the real calendars, send nothing | `npm run gather:live` | `YYYY-MM-DD-collected.md` |
| gather against the committed fixture | `npm run gather:test` | `YYYY-MM-DD-collected.md` |
| the whole Sunday run, stopping before it sends | `npm run preview` | both files |

All three live in `tools/digest-runner/`.
