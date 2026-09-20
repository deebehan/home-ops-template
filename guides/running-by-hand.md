# Running the Sunday by hand

For anyone not building the automated version. This is the five documents doing their job with no code at all.

---

## Once

1. Make a project in Claude, or a project in ChatGPT. Call it Sunday Rundown.
2. Connect Google Calendar and Gmail in your settings. Read access to your own accounts.
3. Paste all five documents into the project's instructions, in this order: `_shared/household.md`, `_shared/sources.md`, `_shared/rules.md`, `_shared/voice.md`, `_shared/digest-template.md`. Put a line above each one saying which file it is.
4. Add these two lines at the very bottom:

> Use only the sources named in sources.md. Quote every time and amount exactly as written, and if a fact is not in a source, say it is not published rather than supplying it.
>
> When I tell you something in the message was wrong, do not rewrite the message. Tell me which file the correction belongs in, and give me the line to add.

That second line is the one that turns a chat into a factory.

## Every Sunday

Open the project. Type:

> run the Sunday

Read it before you send it on. You are the check that the automated version pays a second AI to do.

## When it is wrong

Say what was wrong. Take the line it gives you and put it in the file it names. Do not fix the message.

If you are not sure which file a correction belongs in, use this:

| The mistake | The file |
|---|---|
| It read something it should not have, or missed something it should have read | `_shared/sources.md` |
| It got a person, a routine or a handoff wrong | `_shared/household.md` |
| It made a bad call about what mattered | `_shared/rules.md` |
| It sounded wrong | `_shared/voice.md` |
| It was in the wrong order, or too long | `_shared/digest-template.md` |

---

## What you will notice after a month

The message stops being wrong in new ways and starts being wrong in the same two or three ways, which are the ways your household is genuinely ambiguous.

That is the point at which the automated version is worth a day of your time, and not before. Five filled-in documents and a Sunday habit beat a half-built system that nobody trusts.

## Where to go next

The automated version is this repository. It takes the same five files in
`_shared/` — unchanged, not rewritten — and runs them on a schedule: a text on
Sunday morning, checked by a second AI before it sends, with nobody opening
anything. `README.md` is the reference, and `START-HERE.md` has a prompt that
walks you through it one step at a time.

The five files do not change between the two. That is the part worth
understanding. You are not rebuilding, you are plugging the same documents into
a different engine.
