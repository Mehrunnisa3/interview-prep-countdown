Goal: a job seeker with an interview booked enters three details and leaves with a day-by
day prep plan in their calendar, in under a minute.
1. Inputs (the form)
Field
Required
Interview date Yes
Interview time No
Company
Role
Interview
type
Daily prep
time
Yes
Yes
No
Rules
Default
Today or later; a past date shows an error
Used for the interview event itself
1–80 characters
1–80 characters
Phone screen, Behavioural, Technical, Final
round
No
When each prep task goes in the calendar
All times use the user's own time zone, read from the browser.
2. Plan rules
—
9:00 am
—
—
General
6:00 pm, 45
min
The plan works backwards from the interview date. Days left = days from today to the
interview.
Fixed days, always included:
Interview day: "Interview at [Company]" at the interview time, plus a morning
checklist (eat, water, review 3 stories once, join 5 minutes early).
The day before: logistics and rest only. Confirm time and link, test camera and mic,
choose clothes, no cramming, sleep early.
Page 6 of 10
Interview Prep Countdown: Research and Spec
Prep tasks, in this order (priority 1 = never dropped):
#
Task
1
2
3
4
5
6
7
8
Research [Company] and the [Role] posting: 3
things the role rewards
Write 5–8 career stories in STAR form
Say "Tell me about yourself" out loud and time it
Prepare 3 questions to ask the interviewer
Prepare a short answer to the question you dread
Mock interview with a person
Priority
1
1
1
1
2
2
Use [Company]'s product and note one thing you'd
improve
Type-specific: technical practice, or extra stories
for Behavioural
Fitting tasks to the days available:
Prep days = days left minus 1 (the day before is fixed).
2
2, only if a type is chosen
14 or more days left: the plan starts 14 days out. Earlier days are left empty.
Enough days: one task per day, in order. Spare days repeat "Practise out loud" and the
mock interview.
Too few days: keep all priority-1 tasks and as many priority-2 tasks as fit, at up to 2
tasks per day.
1 day left: interview day plus one combined task (research, Tell me about yourself,
logistics).
0 days left (today): the interview-day checklist only.
3. Screens
1. Form: the six fields, and a "Make my plan" button.
2. Plan: a heading such as "Fieldstone · Senior PM · 6 days to go". Below it, one card per
day, in date order ending on interview day, each with the date, the task, a 1–2 line
"how" and the time slot. Buttons: Add to calendar (.ics) and Change details.
Page 7 of 10
Interview Prep Countdown: Research and Spec
4. Calendar file
One .ics file holds every task plus the interview.
Prep tasks: timed events at the chosen time and length, with a 15-minute reminder.
The interview: a 1-hour event at the interview time, with a 1-hour reminder.
Each event has a unique UID, times in UTC, and escaped text. The file is named 
[company]-[date].ics .
5. Edge cases
Case
Date in the past
Empty company or role
Interview today
More than 14 days away
Company name with commas or symbols
Clock change (daylight saving) in the plan Times stay at the chosen local time
6. Out of scope for this prototype
prep
What happens
Error: "Pick today or a later date."
Error under the field; no plan
Interview-day checklist only
Plan covers the last 14 days
Shown as typed; escaped in the .ics
Accounts and saving plans; using the posting or the user's Prept facts; AI-written tasks;
editing or reordering tasks; email reminders; "Add to Google Calendar" links. These are
next-step ideas once the prototype works inside Prept.

### 7. Open questions for the next version

These came up while building and testing the prototype.

**Who controls the time?**

Today the user picks one daily time slot and its length (default 6:00 pm, 45 minutes). The tool decides which task goes on which day. A 10-day plan therefore gives 9 sessions of 45 minutes, about 6¾ hours in total.

- **Every task gets the same length,** but tasks differ in size. Writing 5–8 STAR stories usually takes longer than preparing 3 questions. Should each task have its own suggested length, for example stories 90 minutes and questions 20 minutes?
- **Users can't say when they're free.** Should they be able to pick their available days (weekends only, skip Friday) or a total number of hours per day?

**How does the plan reach the calendar?**

The .ics file imports correctly into Google Calendar, tested on November 16. But getting it there is hard for many users:

| Calendar | What the user has to do |
| --- | --- |
| Apple Calendar, Outlook | Open the file, then add (easy) |
| Google Calendar on a computer | Settings → Import & export → choose file → choose calendar → Import (5–6 steps) |
| Google Calendar on a phone | Google's help page describes importing only on a computer |

The calendar invites people are used to arrive by email, and they add in one tap. For the real feature inside Prept, the suggestion is to email two invites instead of a file:

1. A daily repeating "Interview prep" event until the interview, with the day-by-day plan and a link back to it in Prept.
2. The interview itself, with a 1-hour reminder.

Other options: an "Add to Google Calendar" button per event, a subscription link that updates itself (needs a server), or a direct Google Calendar connection (needs the user's permission). The prototype keeps the .ics download because it has no server to send email.