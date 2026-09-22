# home-ops, the pipeline

The flow in one line: gather the week, sweep the school email, compose one
digest, check it, send it, record what was sent.

| Stage | Job | Input | Output | Human check |
|---|---|---|---|---|
| `01_weekly-digest` | compose the week ahead | family calendar, school calendar, one email label, `_shared/` | one text, one email, two files in `runs/` | you read it Sunday morning, corrections go to `_shared/` |

Factory (stable, every run): `_shared/{household,sources,rules,voice,digest-template}.md`
Product (new each run): the digest itself, filed in `stages/01_weekly-digest/runs/`

Not read by any run: `_shared/rundown-template.md` and `_shared/rundown-skeleton.html`.
They are the sixth and seventh files, optional, and they describe the Weekly
Rundown page — which you ask for in a project, by hand. The scheduled run
composes a text and an email, and never a page. See `guides/the-weekly-rundown.md`.

## The five steps

1. **Gather.** Read both calendars and the last seven days of the email label.
   Write everything read to `runs/DATE-collected.md`, so there is a record of
   exactly what the model was shown.
2. **Compose.** Build the prompt from the stage contract and the five factory
   files, then ask the model for both the email and the text.
3. **Verify.** Check the draft before anyone sees it. Mechanically first, in
   `checks.mjs`: every time and every amount must trace back to something in
   the collected file. Then a second model audits it against `rules.md`. If a
   fact is wrong, compose once more with the findings attached.
4. **Send.** Email the long version, text the short one.
5. **Record.** Write `runs/DATE-digest.md`, including what the audit found,
   and commit it back.

If any step throws, the workflow sends a text saying so. A silent missing
digest is the failure mode worth engineering against.

## Inputs are live connectors, not files

The stage reads calendars and a mailbox directly. A filesystem cannot hold a
calendar. `_shared/sources.md` is the contract naming exactly what may be
read, which does the job an input path list normally does.

## Not the pipeline

`tools/calendar-filter` runs continuously on Vercel, shaping the school layer
the calendar subscribes to. It has no run state here. Its state is its
deployed code.

`outputs/` holds previews and dry runs: what a digest would look like. Nothing
reads from it. See `outputs/CONTEXT.md`.
