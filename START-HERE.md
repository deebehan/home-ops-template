# Start here

You do not have to read the code. Hand this folder to Claude and let it walk
you through the setup, one step at a time.

Two ways to do that. Pick whichever sounds less unpleasant.

---

## Option A: in the browser, no terminal

Best if you have never used a terminal and would like to keep it that way.

1. Download this folder as a zip. On GitHub: the green Code button, then
   Download ZIP.
2. Go to claude.ai and start a new chat. A Project is better if you have one,
   because it will remember across sessions.
3. Attach the zip.
4. Paste the prompt below.

Claude can read every file and tell you exactly what to do, but it cannot run
commands on your machine. When a step needs a command, it gives you the line to
copy and you paste it into a terminal yourself. It will tell you how to open
one.

## Option B: Claude Code, hands on

Best if you are willing to install one thing, because it is genuinely faster.

1. Install Claude Code, then open this folder in it.
2. Paste the same prompt.

Claude runs the commands itself, reads the output, and fixes what breaks
without you copying anything back and forth.

---

## The prompt

Copy everything between the lines.

---

```
I am setting up this home-ops repository, which sends my household a weekly
digest by text every Sunday. I have never set up anything like this. Assume no
technical background and explain any word you would not say out loud to a
friend.

Before you say anything, read README.md, then CLAUDE.md, then the five files in
_shared/. Then follow the setup in README.md with me.

How I want you to work with me:

1. One step at a time. Tell me what we are doing and why it matters, give me
   the exact thing to do, and then stop and wait for me. Do not give me steps 3
   through 7 at once.
2. After each step, give me the check from the README and ask me what I see. If
   what I see is wrong, work out why before we go on. Do not tell me to
   continue anyway.
3. Never ask me to paste an API key, a password, a phone number or any secret
   into this chat. When one is needed, tell me which file or which website
   field to put it in, and I will do it myself and tell you when it is done.
4. When we reach the five files in _shared/, interview me about my household
   instead of making me fill in templates. Ask about who lives here, who does
   drop-off and pickup, which days people are out, what the standing activities
   are, which calendars and which email senders matter. Ask a few questions at
   a time, not thirty. Then write each file for me, show it to me, and change
   whatever I do not like before we move on.
5. Tell me what each step costs, in money or in time, before I do it.
6. Stop before anything sends. The first thing that reaches my family should be
   something I have read first.

Start by telling me what I will have at the end, what it costs to run per
month, and the accounts I need to open. Then ask me which of those accounts I
already have, and we will begin.
```

---

## What good looks like

It should feel like being walked through it by someone patient, not like
reading a manual. You should be typing short answers about your own family, and
occasionally copying one line into a terminal.

Expect it to take an afternoon. Most of that is opening accounts and waiting for
verification emails, not anything to do with the system.

**If it starts racing ahead** and dumping five steps at you, say:

> Slow down. One step, then wait for me.

**If it loses the thread** between sessions, say:

> Re-read README.md and CLAUDE.md, then tell me which step we are up to based
> on what is in the repo right now.

It can work that out from the files themselves, which is the whole point of the
folder being laid out this way.

---

## The other prompt, for later

Once it is running, this is the only other one you need. Use it the first time
the digest gets something wrong, which will be soon.

```
This week's digest got something wrong. Here is what it said, and here is what
is actually true:

[paste the wrong line, then what it should have said]

Do not fix this week's message. Tell me which file the correction belongs in:
_shared/rules.md if it was a judgment call, _shared/voice.md if it sounded
wrong, _shared/household.md if it got a person or a routine wrong,
_shared/sources.md if it read the wrong thing, or the code in tools/ if no
written rule could have prevented it.

Then give me the exact line to add, and explain in one sentence why it belongs
in that file rather than another.
```

That prompt is the one rule of this whole system, written as something you can
paste. Every correction becomes a line in a file, so the same mistake cannot
happen twice. Fixing the message instead is how people end up with a system
they quietly stop trusting.
