# home-ops

A Sunday briefing for your household, that sends itself.

Every Sunday morning this reads your family calendar, your school calendar and
your school email, writes the week ahead, has a second AI check it against your
own rules, and emails it to whoever needs it — texts it too, if you set that
up. You do not open anything.

Click **Use this template** at the top of this page to get your own copy.

It takes a day. Most of that is accounts and waiting, not code. You will not
need to write any.

> **Do not want to read this on your own?** Open `START-HERE.md`. It has a
> prompt you paste into Claude, which then walks you through everything below
> one step at a time, and interviews you about your household instead of making
> you fill in templates. Most people should start there and use this page as
> the reference.

---

## What you end up with

An email, every week, with the full week in it — this is the archive for when
somebody asks what it said about Thursday.

If you've set up the optional Twilio texting, also a text — the compressed
version, the one people actually read on a phone:

> Evening, all.
>
> Week: Mon 6 to Sun 12 Oct.
>
> Mon: Both of us home. Swimming 4pm.
>
> Tue: Parent A in the office. Library books go back today. Guitar 5pm.
>
> Wed: Both of us in the office, helper on the full morning from 6:45 🙏. Nobody has the 3:15 pickup yet. Sort this one tonight.
>
> Thu: Home. Excursion form and $14 due today, online.
>
> Fri: Free dress day, gold coin. Football 4:30pm, far ground.
>
> Sat: Nothing on.
>
> Reminders: excursion $14 due Thursday. Free dress Friday, gold coin.
>
> Radar: term ends Friday week, then two weeks at home.

---

## What it costs to run

Real numbers, per month, in US dollars, for a household texting three phones.

| Thing | Cost |
|---|---|
| Twilio phone number | $8.25 |
| Text messages (about 15 segments per phone, 4.3 Sundays) | $10.05 |
| Anthropic API (one model writes, a cheaper one checks) | about $1.50 |
| GitHub Actions (about 5 minutes a week, free tier is 2,000) | $0 |
| Vercel, for the calendar filter (hobby plan) | $0 |
| Gmail, Google Calendar | $0 |
| **Total** | **about $20** |

Two phones instead of three brings it to about $16. Skip texting entirely —
email-only, no Twilio account at all — and the total drops to about $1.50.

The AI is the cheapest part of this, which surprises everyone. The texts cost
six times more than the thinking does.

**One lever worth knowing.** A single emoji switches a text message to a
different encoding, where each billed segment holds 67 characters instead of
153. That roughly doubles the cost of every text you send. Keep them for the
two or three that carry real meaning, or drop them from the text and keep them
in the email, which costs nothing either way.

---

## What you need before you start

- **Node 20.12 or newer.** Node is the free thing that runs the program on your
  computer. Install it once and never think about it again.

  Open a terminal. On a Mac: Command and Space together, type `Terminal`,
  Enter. On Windows: Start, type `PowerShell`, Enter. Then type:

  ```
  node --version
  ```

  If it prints `v20.12` or higher, you are done. If it prints a lower number,
  or says `command not found`, go to nodejs.org, press the big green **LTS**
  button, open the file it downloads and click through the installer taking
  every default. Then **close the terminal and open a new one**, because an old
  window keeps looking in the old place, and run `node --version` again.

  If a command later fails with `bad option: --env-file-if-exists`, this is the
  cause. It reads like something is badly broken and it only means Node is
  older than 20.12.
- A **GitHub** account. Free.
- An **Anthropic API key**, from console.anthropic.com. Pay as you go, and the
  monthly spend is above.
- A **Twilio** account, with one phone number in your country. Only if you
  want the text message — leave this out entirely for email-only and skip
  every Twilio step below.
- A **Gmail** account with an **app password**. Not your normal password: it is
  a 16-character code you generate specifically for this, and you can revoke it
  without changing anything else.
- A **Vercel** account, free, only if you want the school calendar filter.
- The **secret iCal address** of your family calendar. In Google Calendar:
  Settings, your calendar, Integrate calendar, "Secret address in iCal format".

Set aside an afternoon. Nothing here is hard, but every one of those accounts
will ask you to verify an email address.

---

## Setup, in order

Each step ends with something you can check. If the check does not pass, do not
continue, because every later step assumes this one worked.

### 1. Take your copy

Click **Use this template**, then **Create a new repository**. Make it private.
Your household's routine is about to be written down in it.

Clone it to your machine.

> **Check:** `ls` shows `_shared/`, `stages/`, `tools/`.

### 2. Install and run the built-in test

```
cd tools/digest-runner
npm install
npm run gather:test
```

This reads a fake calendar that ships with the template, and writes what it
found to `outputs/`.

> **Check:** the output names a training session at **5:00 pm**. If it says any
> other time, stop. That fixture exists to catch one specific timezone bug, and
> it is telling you the bug is back.

### 3. Fill in the five factory files

Open `_shared/`. There are five files, and they are templates, not examples.
Every bracket is yours to replace.

The SUNDAY download has the annotated version of each one, with a worked
example and the reasoning. If you only skim one thing, skim `sources.md`, because it is
the file that decides what this thing is allowed to read.

> **Check:** no square brackets left in any of the five.

### 4. Set your timezone

In `tools/digest-runner/run.mjs`, near the top:

```js
const TZ = "Australia/Sydney";
```

Change it to yours. This matters more than it looks: the server that runs this
keeps time in UTC, and every repeating event on your calendar is expanded
relative to this line.

> **Check:** `npm run gather:test` still says 5:00 pm.

### 5. Point it at your real calendars

Copy `.env.example` to `.env` and fill in your family calendar's secret iCal
address. `.env` is already ignored by git, and it must stay that way.

```
npm run gather:live
```

> **Check:** `outputs/` now holds a file listing your actual week. Read it.
> This is exactly what the AI will be shown, and nothing more.

### 6. Filter the school calendar

If your school publishes one calendar for every year level, do this now.
`tools/calendar-filter/` is a small app you deploy to Vercel. Its
`BAN-LIST.md` is the annotated list: the five categories, why a ban list beats
a guest list, and the one thing in each category you must never drop.

If your school does not, skip it and leave `SCHOOL_ICS_URL_FILTERED` pointing
at the school's own feed.

> **Check:** subscribing to the filtered URL in Google Calendar shows your
> child's events and not the whole school's.

### 7. Rehearse

```
npm run preview
```

This runs the entire Sunday job on your real calendar and stops immediately
before sending. It writes the text and the email to `outputs/`.

Read both. This is the rehearsal, and it is the step technical people skip.
Do not let the first thing that reaches your family be something you have not
read yourself.

> **Check:** the text describes your actual week, and the file ends with a
> `---VERIFY---` section. Ideally it says "No findings."

### 8. Add your secrets to GitHub

In your repository: Settings, Secrets and variables, Actions. Add one secret
for each name listed at the top of `tools/digest-runner/run.mjs`. The four
Twilio/SMS ones are marked optional there — skip them for email-only, and the
run detects their absence and sends email without texting.

GitHub never shows a secret back to you after you save it. Keep your own copy
somewhere safe, because the only way to recover one is to make a new one.

**If a push is refused because of the workflow file.** You may see something
like `refusing to allow an OAuth App to create or update workflow`. It reads
like a permissions problem with your account, and it is not. Anything that
pushes a change to `.github/workflows/` needs the **workflow** scope, and the
token you are signed in with does not have it yet.

If you used "Use this template", GitHub put the workflow there for you and you
will only hit this the first time you edit it. If you started from a zip, you
will hit it on your very first push.

The fix, using the GitHub CLI:

```
gh auth refresh -h github.com -s workflow
```

Then push again. In a browser, a personal access token needs **workflow**
ticked alongside **repo**.

> **Check:** the names in the list match the names in
> `.github/workflows/sunday-digest.yml` exactly.

### 9. Send one for real

In the Actions tab, choose "Sunday family digest" and press **Run workflow**.

> **Check:** an email arrives (and a text too, if you set that up). If nothing
> does, the Actions log tells you which step failed and why.

After that it runs itself, late Sunday morning, until you turn it off.

---

## When it breaks

**You get a text saying the run failed, with a link.** That is by design. A
silent missing digest is the worst outcome, because you assume you had a quiet
week. Open the link, read the red step.

**The digest arrives but something in it is wrong.** Look at the bottom of
`stages/01_weekly-digest/runs/DATE-digest.md`, in the `---VERIFY---` section.
It lists what the checks found before it sent.

**Nothing arrived and no failure text.** Check the Actions tab directly.
Scheduled runs on GitHub can be delayed when the service is busy.

---

## The one rule

**Every correction becomes a line in `_shared/`. Never a fix to one week's
message.**

When the digest gets something wrong, the instinct is to fix that message.
Do that and you will fix it again next week, and the week after, until you stop
trusting it.

There are two places a fix can go:

- **A judgment mistake** goes in `_shared/rules.md`. "It attached last week's
  class photo email to next Monday." The fix is one line: a day named in an
  email is relative to the day that email was sent.
- **A machinery mistake** goes in `tools/`. "It said football was at 7am. It is
  at 5pm." No rule fixes a clock. That one goes in the code, with a test.

After a month you will know which half of your system is thinking and which
half is plumbing. Most people never find out, because they fix everything in a
chat window and the chat forgets.

---

## What is in here

| Folder | What it holds |
|---|---|
| `_shared/` | The factory. Five files, plain English, edited by hand. The rules, the voice, the shape, the household, the sources |
| `stages/01_weekly-digest/` | The stage contract, and `runs/`: what actually went out, every week |
| `tools/digest-runner/` | The Sunday job, the checks, and the eval |
| `tools/calendar-filter/` | The school calendar filter, deployed separately |
| `outputs/` | Previews and dry runs. Nothing reads from here |

## Licence

MIT. See `LICENSE`. Take it, change it, build something else out of it, no
permission needed. It comes with no warranty, which matters more than usual
here: this thing sends messages to your family about your children's week.
Read the first one before anybody else does, and keep reading them.

Built in public at [@deebugging.life](https://www.instagram.com/deebugging.life/).

---

`CLAUDE.md` in the root is the map, and it routes you by what just happened.
Every folder has a `CONTEXT.md` explaining itself.

## Commands

Run these from `tools/digest-runner/` (that's where `package.json` lives).

| Command | What it does | Costs |
|---|---|---|
| `npm run gather:test` | Reads the bundled fake calendar | Nothing |
| `npm run gather:live` | Reads your real calendars, sends nothing | Nothing |
| `npm run preview` | The whole Sunday run, stopping before it sends | About 25c |
| `npm run verify:last` | Re-checks the last digest that went out | Nothing |
| `npm run eval` | Runs 14 test weeks against your rules | About $3 |

`npm run eval` is the one to run after you change anything in `_shared/`. It
puts fourteen awkward weeks through your rules and tells you which ones your
changes broke.
