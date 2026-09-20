# The Weekly Rundown — the page version

The same five documents, the same connectors, the same Sunday. One more output.

The summary is the one you text on to whoever needs it. The **Weekly Rundown**
is a page: the whole week laid out so a clash is visible before you have read a
sentence.

**See one before you build one:** four sample families, four different
households, four different weeks — [click through them
here](https://claude.ai/artifact/La7ogL49KkrJ24YmMaXWPN). A shift worker on
nights. Separated parents with a Friday handover. Four kids and a café. None of
them is my house, and all four were generated the same way.

---

## The order matters

Do not start here. The page is the last thing, not the first.

| Step | What | Where |
|---|---|---|
| 1 | Fill in the five documents | `_shared/household.md` through `_shared/digest-template.md` |
| 2 | Connect the calendar and the mail | `guides/running-by-hand.md` |
| 3 | Put a label on the school mail | `_shared/sources.md` — filter the senders into one label, ten minutes once |
| 4 | Run "run the Sunday" for a week or two | until the message is roughly right |
| 5 | Then add the page | this file |

The reason for that order: **the page is the same gather wearing a better
outfit.** If the message is wrong, the page is wrong in colour and takes longer
to read. Get the five documents honest first. A page makes mistakes look
authoritative, which is the opposite of what you want while you are still
finding them.

---

## Once

1. Open the same project. Do not make a new one — it already has your five
   documents and your connectors.
2. Add `rundown-template.md` to the project instructions, underneath the other
   five, with a line above it saying which file it is.

That is the whole setup. **It is the one document you do not have to fill in:**
the other five describe your household, this one describes a layout, and a
layout is the same for everyone.

Your project now has six documents and three outputs.

## Every week

> run the Weekly Rundown

"run the Sunday" still gives you the text and the email. Nothing about that
changes. The system is still the Sunday Rundown; only the page has the new
name.

You get back one self-contained HTML file — an artefact with a link of its own
if your app makes those, otherwise a file to download. Either way it is yours:

- **Print it** and stick it on the fridge, if that is your jam.
- **Keep the tab open** and come back to it on Wednesday, when you have
  forgotten what Thursday holds.
- **Send the link** to the other parent, the grandparent, whoever else is
  doing the driving.

It reopens with no internet connection and nothing installed. See the caution
at the bottom of this file before you send that link anywhere.

---

## The weather is worth turning on

The strip across the bottom of the samples is the quietly useful part. Not the
numbers — the line underneath them, which turns the numbers into actions: hat
and a full water bottle Monday, jumper back in the bag Tuesday, a warm layer
for the 8:00pm pickup.

It is **off unless you ask for it**, because a forecast nobody looked up is an
invented fact, and it is the one invented fact people act on. The setup
interview asks you outright whether it should look up your local forecast, and
which town. Say yes and it goes into `_shared/sources.md` as a named source like
any other. Say no and the page leaves weather out completely rather than
guessing.

In the by-hand version the lookup is your app's own web search. Nothing extra to
connect, and no key to pay for.

## The tag that makes it worth having

Every sample has small red **Verify** tags on it. That is the most useful thing
on the page, and it is worth understanding before your first run.

A Verify tag means the system found something it refuses to guess at: two
sources disagreeing, or a fact you need that nobody published. It states both
readings and what each would cost you.

> Cast B is listed Tuesday, Wednesday and Thursday. The family calendar only
> has Wednesday. If he is on Tuesday it sits on top of piano at 5:00pm; if
> Thursday, football starts at 4:00pm and arrival is 5:30pm. **Verify**

That is not the system failing. That is the system finding the thing you would
have discovered on Tuesday at 5:25pm.

A page with six or seven Verify tags is working. A page with twenty is telling
you `household.md` is vague. A page with none, on a busy week, is telling you it
guessed — and that is worth checking rather than enjoying.

---

## When it is wrong

Exactly as before. Say what was wrong, take the line it gives you, put it in
the file it names. Do not fix the page.

| The mistake | The file |
|---|---|
| A block is in the wrong order, missing, or too long | `rundown-template.md` |
| It made a bad call about what mattered | `rules.md` |
| It got a person, a routine or a handoff wrong | `household.md` |
| It read something it should not have, or missed something | `sources.md` |
| It sounded wrong | `voice.md` |

The first real page I generated dropped who does pick-up from every weekday. A
five-column grid makes that easy to lose, because the "who is away" strip looks
like it has answered the question. One line into `rundown-template.md` and it
has not happened since. That is the whole method in one correction.

---

## Two honest cautions

**It will be confidently wrong before it is right.** A page looks finished in a
way a text message does not. Read the first three against your actual calendar
before you trust one, and especially before you send one to anybody else.

**It is a page about your children.** Their names, their schools, where they
are on which afternoon, and which nights the house has one adult in it. If you
publish it to get a link, keep that link to yourself and share it
deliberately. Everything that makes it useful is also what makes it worth being
careful with.

---

## Where to go next

The automated version is this repository: the same documents on a schedule, with
a second AI checking the result before it sends, and nobody opening anything.
See `README.md`, or `START-HERE.md` for the guided version.

Note that the automated run sends the text and the email. **The page stays a
by-hand thing** — you ask for it when you want it, in the project. The documents
do not change either way.
