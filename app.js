// app.js — connects the page to plan.js and ics.js.
//
// It reads the form, shows errors, draws the plan cards, and runs the
// buttons. All the rules live in plan.js and ics.js; this file only handles
// what the user sees and clicks.

const byId = (id) => document.getElementById(id);

// The form fields. Each has an <input>/<select> with this id, and a
// <p id="[name]-error"> under it for its error message.
const FIELDS = [
  "interviewDate", "interviewTime", "company", "role",
  "interviewType", "prepTime", "prepMinutes",
];

const DAY_LABELS = { prep: "Prep", dayBefore: "Day before", interview: "Interview day" };

let currentPlan = null;    // the plan on screen, kept for the download button


// ─── 1. Setting up the form ────────────────────────────────────────────────

function setUpForm() {
  // Interview type options come from tasks.js, so the wording lives in one place.
  const typeSelect = byId("interviewType");
  for (const [value, label] of Object.entries(TASK_TEXT.interviewTypes)) {
    typeSelect.append(new Option(label, value));
  }

  // Stop the date picker offering past days. (validate() still checks it,
  // because some browsers let you type a past date anyway.)
  byId("interviewDate").min = toDateString(new Date());

  // Tell the user which time zone we're using: the one their browser reports.
  const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  byId("timezone-note").textContent = zone
    ? `All times are in your time zone (${zone.replace(/_/g, " ")}).`
    : "All times are in your time zone.";
}


// ─── 2. Reading the form and showing errors ────────────────────────────────

function readForm() {
  const input = {};
  for (const name of FIELDS) input[name] = byId(name).value;
  return input;
}

// Puts each message under its field and marks the field as invalid, so
// screen readers announce it too. Fields with no error are cleared.
function showErrors(errors) {
  for (const name of FIELDS) setFieldError(name, errors[name] || "");
}

function setFieldError(name, message) {
  byId(name + "-error").textContent = message;
  if (message) byId(name).setAttribute("aria-invalid", "true");
  else byId(name).removeAttribute("aria-invalid");
}


// ─── 3. Formatting dates and times for the cards ───────────────────────────

// "2026-11-19" → "Thu 19 Nov"
function formatDay(dateString) {
  return localDateTime(dateString, 0).toLocaleDateString("en-GB",
    { weekday: "short", day: "numeric", month: "short" });
}

// A Date → "6:00 pm"
function formatTime(date) {
  return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }).toLowerCase();
}

// An event → "6:00 pm – 6:45 pm"
function timeSlot(item) {
  const start = localDateTime(item.date, item.startMinutes);
  const end = new Date(start.getTime() + item.minutes * 60 * 1000);
  return `${formatTime(start)} – ${formatTime(end)}`;
}


// ─── 4. Drawing the plan ───────────────────────────────────────────────────
// We build elements with textContent rather than writing HTML strings, so a
// company name like "<b>Acme</b>" is shown exactly as typed, never run as HTML.

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function renderPlan(plan, today) {
  byId("plan-heading").textContent = plan.heading;

  const note = byId("plan-note");
  note.textContent = plan.note || "";
  note.hidden = !plan.note;

  const list = byId("plan-days");
  list.replaceChildren(...plan.days.map((day) => renderDay(day, today)));
}

// One card: the date, a label or two, then each event with its time, title and "how".
function renderDay(day, today) {
  const card = el("li", "day" + (day.kind === "interview" ? " day--interview" : ""));

  const head = el("div", "day-head");
  head.append(el("h2", "day-date", formatDay(day.date)));
  const tags = el("div", "tags");
  if (day.date === today) tags.append(el("span", "tag tag--today", "Today"));
  tags.append(el("span", "tag", DAY_LABELS[day.kind]));
  head.append(tags);
  card.append(head);

  const items = el("ul", "items");
  for (const item of day.items) {
    const row = el("li", "item");
    row.append(el("p", "item-time", timeSlot(item)));
    row.append(el("p", "item-title", item.title));
    row.append(el("p", "item-how", item.how));
    items.append(row);
  }
  card.append(items);
  return card;
}


// ─── 5. Switching screens ──────────────────────────────────────────────────
// Both screens are in index.html; we just hide one and show the other.
// Moving focus to the new heading helps keyboard and screen-reader users.

function showScreen(name) {
  byId("form-screen").hidden = name !== "form";
  byId("plan-screen").hidden = name !== "plan";
  window.scrollTo(0, 0);
  byId(name === "plan" ? "plan-heading" : "form-title").focus();
}


// ─── 6. Wiring up the events ───────────────────────────────────────────────

setUpForm();

// "Make my plan"
byId("details-form").addEventListener("submit", (event) => {
  event.preventDefault();              // stop the browser reloading the page

  const input = readForm();
  const now = new Date();
  const errors = validate(input, now);
  showErrors(errors);

  const firstProblem = FIELDS.find((name) => errors[name]);
  if (firstProblem) {
    byId(firstProblem).focus();        // take the user straight to the first error
    return;                            // no plan until everything is fixed
  }

  currentPlan = buildPlan(input, now);
  renderPlan(currentPlan, toDateString(now));
  showScreen("plan");
});

// Clear a field's error as soon as the user changes it.
for (const name of FIELDS) {
  const clear = () => setFieldError(name, "");
  byId(name).addEventListener("input", clear);
  byId(name).addEventListener("change", clear);
}

// "Add to calendar (.ics)"
byId("download-button").addEventListener("click", () => {
  if (currentPlan) downloadIcs(currentPlan);
});

// "Change details": back to the form. The values are still filled in.
byId("change-button").addEventListener("click", () => showScreen("form"));
