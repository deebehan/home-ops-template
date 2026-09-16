# The ban list, annotated

Most schools publish one calendar for every year level. Subscribe to it and
your family calendar becomes unreadable, so you stop looking at it, so you miss
the free dress day. The calendar was never the problem. The signal to noise
was.

This is what goes in the `DENY` array in `app/api/school-cal/route.ts`, and
why. Every example event name below is invented.

---

## Why a ban list and not a guest list

The obvious move is a guest list: name what to let through, and everything else
falls away.

Do not do this. Schools never type the same thing twice. "Year 3 Excursion",
"Yr3 excursion", "Stage 2 Aquarium" and "Excursion (3B, 3W)" are the same kind
of event, and a guest list only admits what you predicted. The week your school
invents a new format, your child's excursion silently does not exist.

A ban list works the other way. Everything comes through except the noise you
have named. When the school invents a new format, the worst case is something
boring lands on your calendar and you add one line.

**Fail noisy, not silent.** An extra assembly on your calendar is a nuisance. A
missing excursion is the phone call from the office.

---

## The five categories

### 1. Other year levels and stages

**Catches:** "Year 5 Camp", "Yr 1 Swimming", "Stage 3 Assembly", "Kindergarten
Orientation".

**Safe because** they name a year level outright, so there is no ambiguity
about whose they are.

**Never drop:** your own year, and the stage or band containing it. The shipped
example is for a Year 3 child, who sits in Stage 2, so it bans Stages 1 and 3
and leaves Stage 2 alone. Get this backwards and you delete the only events you
wanted.

**The trap:** year levels get written six ways. Ban "year 5" and "yr 5" both,
and match without caring about capitals or spacing.

### 2. The year above leaving

**Catches:** high school transition mornings, orientation days, graduation,
farewell assemblies, and the acronyms that come with them.

**Safe because** it is a year of events aimed at families whose child is in
their final year.

**Never drop:** the year it becomes you. Diary that now.

### 3. Rep and knockout sport

**Catches:** "Zone Athletics", "Regional Gala Day", "Boys Cricket vs Another
Public School", trials, and the four-letter acronyms that get welded onto other
words so they never appear alone.

**Safe because** representative sport involves the handful of children who were
picked, and you will hear directly if yours is one.

**Never drop:** the moment your child gets picked, delete that line. This is
the category most likely to become relevant overnight.

### 4. Opt-in programs you are not in

**Catches:** academic competitions, chess club, public speaking, debating,
enrichment days.

**Safe because** opt-in means you would know.

**Never drop:** anything your child actually joined. A line banning music and
performing arts had to come out the term he was in the school musical. It would
have hidden the performance dates from the whole family.

### 5. Committee and admin

**Catches:** regional education committee meetings, student representative
council, staff transition planning.

**Safe because** these are for staff and the parents who sit on those
committees.

**Never drop:** the parent body meetings, if you actually go.

---

## What the filter adds back

**Term and holiday dates.** School calendars routinely publish the term but not
the holidays, which is backwards: the fact a parent needs is "the children are
home from this date to that date". These live in `INJECT_DATES`.

Run each holiday block to the day before students return, not to the official
last day. It absorbs the staff development days and public holidays sitting in
the gap, and the useful fact is who is minding the children, not what the day
is called.

**Plain titles.** Schools publish initialisms only staff use. "SDD" means a
staff development day, which means the children are home. `RENAME` turns it
into "SDD (kids home, no school)", because everyone who subscribes to this
calendar should not have to decode it.

---

## Checking your list

Count the events on the school's feed, then on yours.

- **Nothing removed:** your patterns are not matching. Check for typos, and
  remember matching ignores capitals.
- **Your child's excursion missing:** one line is too broad. Comment lines out
  one at a time until it comes back.

## Once a year

Every January: your child moves up, so last year's list now bans the wrong
band, and the new year's programs arrive. Twenty minutes.

The two lines to check first: the year level above yours, which you have just
become, and any program your child joined over the summer.
