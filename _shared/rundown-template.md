# rundown-template.md

The shape of the page, as digest-template.md is the shape of the summary.

This is the sixth document, and the only one you do not have to fill in. The
other five describe your household, so nobody else's will do. This one
describes a layout, and a layout is the same for everyone. Add it to the
project's files as it is.

You only need it if you want the page. The summary works on five.

## What the page is for

The summary is what you read in the chat and pass on. The page is the one you
sit down with once, with a coffee, and it has a different job: a clash should
be visible before you have read a sentence.

Everything below serves that.

## Inherited, without exception

Everything in rules.md and voice.md applies here. The format changed; the
judgment did not. In particular:

- Never invent a time, date, amount or address. Quote it, or say it is not
  published.
- Check for a receipt before asking for money again.
- A cancelled entry means it is off. Never restore it from the usual routine.
- An empty mail sweep means there was no mail. It never means invent some.
- A date named in an email is relative to the day that email was sent.
- Facts stay plain. The personality goes between them, never on them.

## One thing it does differently

digest-template.md allows one line of radar, because a short summary has no
room to be wrong. The page gets a full four-week horizon table instead. A page
costs nothing to scroll.

## The blocks, in order

| # | Block | Job |
|---|---|---|
| 1 | Masthead | family name, "Weekly Rundown", the date, the place |
| 2 | Provenance | what was read, and when |
| 3 | Greeting | one fresh line, per voice.md |
| 4 | Clashes and decisions | the only block that can ruin the week if skipped |
| 5 | Already handled | what the week does not need from you |
| 6 | The week at a glance | Monday to Friday, side by side |
| 7 | The weekend | given its own room |
| 8 | The desk | one block per child |
| 9 | Weather | on if sources.md names a forecast, off if it does not |
| 10 | This week's good idea | one small thing that buys back time |
| 11 | On the horizon | the rest of this month, a glimpse of next |
| 12 | Footer | what was read, what could not be, and the sign-off |

### Clashes and decisions

Everything else on the page is reference. This block is the reason to build it.

- Walk the school sources first, then hold each item against the family
  calendar. Two things in the same hour is a clash. Two sources disagreeing
  about a date is a clash.
- One row per item: a checkbox, an owner's name, the decision in bold, then
  the detail that settles it.
- Name an owner always. "Everyone" is an owner. "Someone" is not.
- Order by what it costs to get wrong, not by date.
- Anything that changes the school day (a closure, a room move, medication,
  buses) goes at the top regardless of date. It affects the morning.

### Already handled

Bookings confirmed, payments receipted, appointments locked. One line each,
ticked. This is what stops the page reading as a list of demands.

If nothing qualifies, cut the block. Never pad it. If the mail sweep did not
run, say that instead. An unchecked list is not a clear one.

### The week and the weekend

- Monday to Friday as five columns. Each gets a strip naming who is away from
  home base, then a line answering who does the morning and who does pick-up,
  then the day's events.
- Name the person and the place, exactly as the calendar does. Never a bare
  "away". Never a bare "Home."
- The weekend names both parents too, day by day. Naming only the one who is
  travelling leaves the other unaccounted for.
- Every event keeps its time. An event without its time is an error, not a
  summary.

### The desk

One block per child: their name, year and school, then what the week actually
requires of them. Unread mail is worth naming. "Friday's newsletter is unread"
is a useful sentence.

Holidays, staff days and public holidays inside the next two weeks are phrased
as care impact: kids home, who is on.

### Weather: on or off, never invented

Two allowed states, and no third:

- sources.md names a forecast source: look it up, show the strip, and finish
  with one "what to bring" line that turns the numbers into actions.
- It does not: leave the whole block out. No strip, no "what to bring", no
  mention of the weather anywhere on the page.

Never estimate from the season, never reuse last week's, never soften a guess
with "probably". A forecast nobody looked up is an invented fact, and it is the
one invented fact people act on.

In the by-hand version the source is the app's own web search, named in
sources.md like anything else.

## The Verify tag

A Verify tag means: two sources disagree, or a fact you need is not in any
source. It goes next to the item, and the item states both readings and what
each would cost.

> Cast B is listed Tuesday, Wednesday and Thursday. The family calendar only
> has Wednesday. If he is on Tuesday it sits on top of piano at 5:00pm; if
> Thursday, football starts at 4:00pm and arrival is 5:30pm. Verify

Two rules keep it meaningful:

- Never tag something the sources settle. A Verify tag on a known fact teaches
  you to ignore the tag.
- Roughly seven a page, maximum. Past that it stops meaning "look here".

## How it should look

The look is not yours to design. It lives in rundown-skeleton.html, which is in
this project's files. Fill that file in. Do not write a page from scratch.

- Copy its style block unchanged. Do not add, remove or rewrite a rule.
- Change only the colour values it marks as changeable, using the colour in
  the Formats section of digest-template.md, and the words in [brackets].
- Repeat a row, an event or a child's block as many times as the week needs.
  Delete a block this document says to cut.
- One self-contained HTML file. No scripts, no images, nothing to install.
- Two or three handwritten notes on the whole page, each an observation, never
  a label.
- The skeleton already works on a phone and prints. Do not undo either.

## What "run the Weekly Rundown" means

Work in two passes.

Pass one, the gather. Read only what sources.md names. Then show me a plain
list, no design: which sources you read and how many items each returned, then
each day, who is out, who has drop-off and pickup, each event with its time
exactly as written, every amount and deadline, everything you would tag Verify
and why, and anything you could not read. Do not build anything yet. End with
exactly this line and then stop:

  Check the list. Tell me what is wrong, or type: generate the page

Pass two, the page. Only when I type "generate the page", or after I correct
you and then say it, build the page by filling in rundown-skeleton.html,
following this document, using the corrected list and nothing else. Masthead
name, place and colour come from the Formats section of digest-template.md.

Give me the page as one HTML file to download. Do not publish it, do not
create a public or shareable link to it, and do not offer to. Under the file,
say once: "This page has your children's names, school and whereabouts on it.
Keep it private. Download the file and drag it into your browser to read or
print it."

If I corrected anything in pass one, finish by telling me which file each
correction belongs in, the line to add, and give me the corrected file to
download.

## Where a correction goes

Same rule as the other five. A page that gets something wrong sends you here,
or to rules.md if the summary would have got it wrong too.

Never to the prompt. The page is this week's; the files are every week's.
