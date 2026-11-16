// plan.js — works out which task goes on which day.
//
// This file only does calculations. It never touches the page, so it is easy
// to test: give it form values and a "now", and check what comes back.
// It needs tasks.js to be loaded first (for TASK_TEXT).

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const MAX_PLAN_DAYS = 14;          // plan never starts more than 14 days out
const MAX_TASKS_PER_DAY = 2;       // when squeezing tasks into too few days
const MAX_MOCKS = 2;               // mock interviews allowed in one plan
const DEFAULTS = {
  interviewTime: "09:00",
  interviewType: "",               // "" = General (no type-specific task)
  prepTime: "18:00",
  prepMinutes: 45,
};


// ─── 1. Date helpers ───────────────────────────────────────────────────────
// Dates are stored as plain text "YYYY-MM-DD" (the same format an
// <input type="date"> gives us). For counting days we deliberately use UTC,
// because UTC has no daylight saving: every UTC day is exactly 24 hours, so
// dividing by MS_PER_DAY always gives a whole number.

// Today's date in the user's own time zone, as "YYYY-MM-DD".
function toDateString(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");  // months start at 0!
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

// "2026-11-20" → a day number (days since 1 Jan 1970).
function dayNumber(dateString) {
  const [y, m, d] = dateString.split("-").map(Number);
  return Date.UTC(y, m - 1, d) / MS_PER_DAY;
}

// How many calendar days from one date to another (negative if b is earlier).
function daysBetween(a, b) {
  return dayNumber(b) - dayNumber(a);
}

// "2026-11-20" plus 3 → "2026-11-23". Handles month and year ends for us.
function addDays(dateString, n) {
  const [y, m, d] = dateString.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}

// True for real dates only. "2026-02-30" fails because adding 0 days to it
// rolls over to "2026-03-02", which no longer matches.
function isValidDate(dateString) {
  return /^\d{4}-\d{2}-\d{2}$/.test(dateString) && addDays(dateString, 0) === dateString;
}

// "18:30" → 1110 (minutes after midnight). Returns null if not a valid time.
function timeToMinutes(time) {
  const match = /^(\d{2}):(\d{2})$/.exec(time);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return null;
  return hours * 60 + minutes;
}

// 1 → "1 day", 5 → "5 days". Use this anywhere a number of days is shown.
function daysText(n) {
  return n === 1 ? "1 day" : `${n} days`;
}

// "2026-11-22" → "Sunday 22 November", for messages on the plan screen.
function formatLongDate(dateString) {
  const [y, m, d] = dateString.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-GB",
    { weekday: "long", day: "numeric", month: "long" });
}


// ─── 2. Checking the form ──────────────────────────────────────────────────
// Returns an object of error messages keyed by field name, e.g.
// { company: "Enter the company name." }. An empty object means all good.

function validate(input, now = new Date()) {
  const errors = {};

  const date = input.interviewDate || "";
  if (!isValidDate(date)) {
    errors.interviewDate = "Pick the date of your interview.";
  } else if (daysBetween(toDateString(now), date) < 0) {
    errors.interviewDate = "Pick today or a later date.";
  }

  const textFields = { company: "Enter the company name.", role: "Enter the role." };
  for (const [field, emptyMessage] of Object.entries(textFields)) {
    const value = (input[field] || "").trim();
    // [...value] counts characters properly, even emoji (which .length counts as 2).
    const length = [...value].length;
    if (length === 0) errors[field] = emptyMessage;
    else if (length > 80) errors[field] = "Keep this to 80 characters or fewer.";
  }

  // Optional fields: only checked if the user filled them in.
  if (input.interviewTime && timeToMinutes(input.interviewTime) === null) {
    errors.interviewTime = "Pick a valid time.";
  }
  if (input.prepTime && timeToMinutes(input.prepTime) === null) {
    errors.prepTime = "Pick a valid time.";
  }
  if (input.interviewType && !(input.interviewType in TASK_TEXT.typeSpecific)) {
    errors.interviewType = "Choose one of the listed types.";
  }
  if (input.prepMinutes !== undefined && input.prepMinutes !== "") {
    const mins = Number(input.prepMinutes);
    if (!Number.isInteger(mins) || mins < 5 || mins > 240) {
      errors.prepMinutes = "Choose between 5 and 240 minutes.";
    }
  }

  return errors;
}


// ─── 3. Fitting tasks into the days available ──────────────────────────────
// Takes the list of tasks and the number of prep days, and returns one array
// per day, e.g. [[task1], [task2, task3], ...]. Pure logic: no dates here.

function fitTasks(tasks, prepDays) {
  // Enough days: one task per day, in order, then fill the spare days.
  // Every other spare day is "Practise out loud". The ones in between are a
  // mock interview while the plan has fewer than MAX_MOCKS, then
  // "Refine your stories".
  if (prepDays >= tasks.length) {
    const days = tasks.map((task) => [task]);
    let mockCount = tasks.filter((t) => t.isMock).length;
    let practiseNext = true;
    while (days.length < prepDays) {
      let spare;
      if (practiseNext) {
        spare = TASK_TEXT.spare.practise;
      } else if (mockCount < MAX_MOCKS) {
        spare = TASK_TEXT.spare.mock;
        mockCount++;
      } else {
        spare = TASK_TEXT.spare.refine;
      }
      days.push([spare]);
      practiseNext = !practiseNext;
    }
    return days;
  }

  // Too few days: keep every priority-1 task, then as many priority-2 tasks
  // as still fit at up to 2 per day.
  //
  // Two separate orders matter here:
  //  - WHICH tasks survive is decided by rank (the spec's priority order).
  //  - WHERE they go is the order of the tasks list (research first,
  //    practice last).
  // So: sort a copy by rank to choose, then keep the chosen ones in list order.
  const capacity = prepDays * MAX_TASKS_PER_DAY;
  const byRank = [...tasks].sort((a, b) => a.rank - b.rank);
  let roomForOptional = Math.max(0, capacity - byRank.filter((t) => t.priority === 1).length);
  const chosen = new Set();          // a Set is a collection with fast "is X in it?" checks
  for (const task of byRank) {
    if (task.priority === 1) {
      chosen.add(task);
    } else if (roomForOptional > 0) {
      chosen.add(task);
      roomForOptional--;
    }
  }
  const kept = tasks.filter((task) => chosen.has(task));

  // Spread them out: some days get 2 tasks, the rest get 1. The doubled-up
  // days come first, so the days nearest the interview are lighter.
  const doubleDays = kept.length - prepDays;
  const days = [];
  let next = 0;
  for (let day = 0; day < prepDays; day++) {
    const count = day < doubleDays ? 2 : 1;
    days.push(kept.slice(next, next + count));
    next += count;
  }
  return days;
}


// ─── 4. Building the whole plan ────────────────────────────────────────────
// Input: the form values. Output: everything the page and the calendar need:
// {
//   heading: "Fieldstone · Senior PM · 6 days to go",
//   note: null, or "Your plan starts on ..." when it starts after today,
//   daysLeft: 6,
//   days: [ { date: "2026-11-16", kind: "prep", items: [ ...events ] }, ... ]
// }
// Each event (item) looks like:
//   { kind, title, how, date, startMinutes, minutes, reminderMinutes }
// startMinutes is local time as minutes after midnight (1080 = 6:00 pm).

function buildPlan(input, now = new Date()) {
  const errors = validate(input, now);
  if (Object.keys(errors).length > 0) {
    throw new Error("buildPlan was given invalid input: " + JSON.stringify(errors));
  }

  // Fill in defaults for anything left blank.
  const form = {
    interviewDate: input.interviewDate,
    company: input.company.trim(),
    role: input.role.trim(),
    interviewTime: input.interviewTime || DEFAULTS.interviewTime,
    interviewType: input.interviewType || DEFAULTS.interviewType,
    prepTime: input.prepTime || DEFAULTS.prepTime,
    prepMinutes: Number(input.prepMinutes) || DEFAULTS.prepMinutes,
  };

  const today = toDateString(now);
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const daysLeft = daysBetween(today, form.interviewDate);
  const prepStart = timeToMinutes(form.prepTime);
  const interviewStart = timeToMinutes(form.interviewTime);

  // Swap {company} and {role} for the real values. We pass a function rather
  // than a plain string because in a plain replacement string, "$&" and
  // similar have special meanings, which would break a name like "Ca$&h".
  const fill = (text) => text
    .replaceAll("{company}", () => form.company)
    .replaceAll("{role}", () => form.role);

  // Make one calendar event from a TASK_TEXT entry.
  const makeItem = (kind, text, date, startMinutes, minutes, reminderMinutes) => ({
    kind, title: fill(text.title), how: fill(text.how),
    date, startMinutes, minutes, reminderMinutes,
  });

  // A prep-style day: tasks at the daily prep time; a second task starts
  // right after the first so they don't overlap.
  // If the day is today and the prep time has already passed, start
  // 30 minutes from now instead (rounded up to the next 5 minutes).
  const prepDay = (date, texts, kind = "prep") => {
    let start = prepStart;
    if (date === today && start <= nowMinutes) {
      start = Math.ceil((nowMinutes + 30) / 5) * 5;
    }
    const items = texts.map((text, i) =>
      makeItem("prep", text, date, start + i * form.prepMinutes, form.prepMinutes, 15));
    return { date, kind, items };
  };

  const days = [];

  if (daysLeft >= 2) {
    // How many days the plan covers (at most 14), and the first day of it.
    const span = Math.min(daysLeft, MAX_PLAN_DAYS);
    const prepDays = span - 1;                       // the day before is fixed
    const firstDate = addDays(form.interviewDate, -span);

    let groups;
    if (prepDays === 1) {
      groups = [TASK_TEXT.twoDaysLeft];              // both combined tasks, one day
    } else {
      const tasks = [...TASK_TEXT.prep];
      const typeTask = TASK_TEXT.typeSpecific[form.interviewType];
      if (typeTask) tasks.push(typeTask);
      groups = fitTasks(tasks, prepDays);
    }

    groups.forEach((group, i) => days.push(prepDay(addDays(firstDate, i), group)));
    days.push(prepDay(addDays(form.interviewDate, -1), [TASK_TEXT.dayBefore], "dayBefore"));
  } else if (daysLeft === 1) {
    days.push(prepDay(today, [TASK_TEXT.oneDayLeft], "dayBefore"));
  }

  // Interview day: always there. A 15-minute checklist 1 hour before
  // (but not before midnight), then the 1-hour interview itself.
  days.push({
    date: form.interviewDate,
    kind: "interview",
    items: [
      makeItem("checklist", TASK_TEXT.checklist, form.interviewDate,
        Math.max(0, interviewStart - 60), 15, 15),
      makeItem("interview", TASK_TEXT.interview, form.interviewDate,
        interviewStart, 60, 60),
    ],
  });

  const countdown = daysLeft === 0 ? "Interview today" : `${daysText(daysLeft)} to go`;

  // If the plan starts after today, tell the user when (otherwise note is null).
  const planStartDate = days[0].date;
  let note = null;
  if (planStartDate !== today) {
    note = TASK_TEXT.notes.planStartsLater.replace("{date}", () => formatLongDate(planStartDate));
  }

  return {
    heading: `${form.company} · ${form.role} · ${countdown}`,
    note,
    company: form.company,
    interviewDate: form.interviewDate,
    planStartDate,
    daysLeft,
    days,
  };
}
