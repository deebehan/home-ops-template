# The five documents

The AI is not the asset. These are.

I have swapped the model underneath my Sunday system twice. Each time, the system got better at the same job, because the job was written down in five files and the model was just the thing reading them. Swap the files and you have a different system. Swap the model and you have the same system, slightly sharper.

So this is the part worth your afternoon.

---

## The five

| File | What it holds | Why it exists |
|---|---|---|
| `household.md` | Who is in the house, the usual week, how "away" is marked | Turns a calendar readout into a briefing that knows nobody has Wednesday's pickup |
| `sources.md` | Exactly what may be read, and who receives the result | The trust document. If it is not named here, it is not read |
| `rules.md` | The judgment. What always goes in, what never does | The file that grows. Every line is a mistake that cannot happen twice |
| `voice.md` | The register, the greeting, the sign-off, where a joke may go | An unread message is worse than no message |
| `digest-template.md` | The shape: day by day, then what to remember, then one line of radar | The text is what the family reads. The email is the archive |

Fill them in the order they are numbered. `household.md` and `sources.md` take about twenty minutes between them, and the other three are mostly choosing.

You do not need to finish them to start. A half-filled `rules.md` with three lines in it works on the first Sunday, and that is how it is supposed to go, because the rest of the lines are written by being wrong.

---

## The one rule

**Every correction becomes a line in one of these files. Never a fix to that week's message.**

This is the whole difference between a system that improves and a chatbot you argue with every Sunday. When the message gets something wrong, the instinct is to retype the line and move on. Do that and you will retype it again next week, and the week after, until you quietly stop using the thing.

There are only two places a fix can go, and telling them apart is the skill.

### A judgment mistake goes in the files

> It attached last week's class photo email to next Monday.

The email was sent on a Thursday and said "Monday". The system read "Monday" as the Monday of the week it was writing about. Both the rehearsal and the deadline had already passed by the time anyone read the message.

No code can decide that. It is a judgment about what a school email means, so it goes in `rules.md` as one line:

> A day named in an email is relative to the day that email was sent.

### A machinery mistake goes in the code

> It said football was at 7am. It is at 5pm.

Ten hours out, every week, on a repeating event. No rule fixes this, because nothing about it is a judgment. The calendar was being read wrong: the server it runs on keeps time in a different zone to the family, and repeating events were being expanded in the server's zone.

That fix goes in the code, with a test that fails if it ever comes back.

**The split matters more than either example.** Sort your own mistakes into those two piles for a month and you will know exactly which parts of your system are thinking and which parts are plumbing. Most people building with AI never find out, because they fix everything in the chat.

---

## Using them

**By hand:** file 6 in this folder, `6-running-the-sunday-in-claude.md`. Five documents in a project, three words on a Sunday. No code.

**Automated:** the BUILD template takes these same five files, unchanged, and runs them on a schedule with a second AI checking the result before it sends.

The files do not change between those two. That is the point of writing them down.

---

## Before you start

Two things worth deciding now, because they are painful to change later.

**Who is on the receiving end.** Anyone who gets the message needs to be able to act on it. People who receive it out of politeness stop reading by week three, and then you have a system that is technically working and practically ignored.

**Whether it sounds like you.** It should not. See `4-voice.md`. A weekly message that convincingly impersonates you to your own family is a strange thing to have built, and you will only notice once somebody replies to it.
