// ics.js — turns a plan (from buildPlan in plan.js) into a calendar file.
//
// A .ics file is plain text in a format called iCalendar. Google Calendar,
// Outlook and Apple Calendar can all import it. It is a list of
// "NAME:value" lines, grouped into blocks that open with BEGIN:something and
// close with END:something:
//
//   BEGIN:VCALENDAR        ← the whole file
//     BEGIN:VEVENT         ← one event (we make one per task, plus the interview)
//       BEGIN:VALARM       ← that event's reminder
//       END:VALARM
//     END:VEVENT
//   END:VCALENDAR
//
// Everything except downloadIcs() is pure text-building, so it's easy to test.

const ICS_LINE_END = "\r\n";        // the format requires "carriage return + new line"
const ICS_MAX_LINE_BYTES = 75;      // longer lines must be "folded" (see foldLine)


// ─── 1. Escaping text ──────────────────────────────────────────────────────
// In a .ics file, some characters have special meanings:
//   ,  separates a list of values
//   ;  separates extra settings
//   \  starts an escape
//   a line break ends the line
// So any of these inside a title or description must have a \ put in front
// of it, or the calendar app will misread it. Example:
//   Smith, Jones; Co   →   Smith\, Jones\; Co
// The backslash must be done FIRST, or we'd double the backslashes we add
// for the others.

function escapeIcsText(text) {
  return String(text)
    .replace(/\\/g, "\\\\")           // \  → \\
    .replace(/;/g, "\\;")             // ;  → \;
    .replace(/,/g, "\\,")             // ,  → \,
    .replace(/\r\n|\r|\n/g, "\\n");   // line break → \n (the two characters \ and n)
}


// ─── 2. Folding long lines ─────────────────────────────────────────────────
// No line may be longer than 75 bytes. A longer line is split, and each
// extra piece starts with a single space, which tells the calendar app
// "this continues the line above". Example:
//
//   DESCRIPTION:Read the posting and the company's site. Write down 3 thing
//    s the role rewards.
//
// It counts BYTES, not characters: "é" takes 2 bytes and many emoji take 4.
// TextEncoder tells us how many bytes a character takes, and we never split a
// character in half.

const utf8 = new TextEncoder();

function foldLine(line) {
  const pieces = [];
  let current = "";
  let currentBytes = 0;
  let limit = ICS_MAX_LINE_BYTES;

  for (const char of line) {          // for...of walks whole characters, not bytes
    const charBytes = utf8.encode(char).length;
    if (currentBytes + charBytes > limit) {
      pieces.push(current);
      current = "";
      currentBytes = 0;
      limit = ICS_MAX_LINE_BYTES - 1; // the leading space uses 1 of the 75 bytes
    }
    current += char;
    currentBytes += charBytes;
  }
  pieces.push(current);
  return pieces.join(ICS_LINE_END + " ");
}


// ─── 3. Times ──────────────────────────────────────────────────────────────
// The plan stores each event as a date plus "minutes after midnight" in the
// user's local time. We turn that into a real moment using the user's own
// clock settings, then write it in UTC.
//
// new Date(year, month, day, 0, minutes) uses LOCAL time and knows the
// daylight-saving rules for the user's time zone. So 6:00 pm stays 6:00 pm
// on both sides of a clock change; only its UTC value moves by an hour.
// (Minutes past 1440 roll over into the next day automatically.)

function localDateTime(dateString, minutes) {
  const [y, m, d] = dateString.split("-").map(Number);
  return new Date(y, m - 1, d, 0, minutes);
}

// A Date → "20261116T180000Z". The Z at the end means "this time is UTC".
function toIcsUtc(date) {
  const pad = (n) => String(n).padStart(2, "0");
  return (
    date.getUTCFullYear() +
    pad(date.getUTCMonth() + 1) +
    pad(date.getUTCDate()) +
    "T" +
    pad(date.getUTCHours()) +
    pad(date.getUTCMinutes()) +
    pad(date.getUTCSeconds()) +
    "Z"
  );
}


// ─── 4. Unique IDs ─────────────────────────────────────────────────────────
// Every event needs an ID that no other event anywhere will ever have, so the
// calendar app can tell events apart. crypto.randomUUID() gives a random one
// like "3f2a9c1e-…". The "@interview-prep-countdown" part says who made it.
// (The fallback is only for very old browsers.)

function makeUid() {
  const random = (typeof crypto !== "undefined" && crypto.randomUUID)
    ? crypto.randomUUID()
    : Date.now().toString(36) + "-" + Math.random().toString(36).slice(2);
  return random + "@interview-prep-countdown";
}


// ─── 5. Building the file ──────────────────────────────────────────────────

// The lines for one event (before folding).
function eventLines(item, stamp) {
  const start = localDateTime(item.date, item.startMinutes);
  const end = new Date(start.getTime() + item.minutes * 60 * 1000);
  const title = escapeIcsText(item.title);

  return [
    "BEGIN:VEVENT",                          // start of one event
    "UID:" + makeUid(),                      // its unique ID
    "DTSTAMP:" + stamp,                      // when this file was made (required)
    "DTSTART:" + toIcsUtc(start),            // when it starts, in UTC
    "DTEND:" + toIcsUtc(end),                // when it ends, in UTC
    "SUMMARY:" + title,                      // the title you see in the calendar
    "DESCRIPTION:" + escapeIcsText(item.how),// the notes inside the event
    "BEGIN:VALARM",                          // start of the reminder
    "ACTION:DISPLAY",                        // show a pop-up (not a sound or email)
    "DESCRIPTION:" + title,                  // what the pop-up says
    "TRIGGER:-PT" + item.reminderMinutes + "M", // when: "-PT15M" = 15 minutes before
    "END:VALARM",                            // end of the reminder
    "END:VEVENT",                            // end of the event
  ];
}

// The whole .ics file as one string.
function buildIcs(plan, now = new Date()) {
  const stamp = toIcsUtc(now);

  const lines = [
    "BEGIN:VCALENDAR",                       // start of the file
    "VERSION:2.0",                           // which version of the format (always 2.0)
    "PRODID:-//Interview Prep Countdown//Prototype//EN", // which app made it (required)
    "CALSCALE:GREGORIAN",                    // the normal calendar
    "METHOD:PUBLISH",                        // "here are some events", not a meeting invite
  ];

  for (const day of plan.days) {
    for (const item of day.items) {
      lines.push(...eventLines(item, stamp));
    }
  }

  lines.push("END:VCALENDAR");               // end of the file

  // Fold every line, join with CRLF, and end the file with a CRLF too.
  return lines.map(foldLine).join(ICS_LINE_END) + ICS_LINE_END;
}

// "Smith, Jones & Co", "2026-11-26" → "prep-smith-jones-co-2026-11-26.ics"
// Accents are removed (é → e); anything that isn't a letter or number becomes
// a dash, so the name is safe on every computer.
function icsFileName(plan) {
  const slug = plan.company
    .normalize("NFKD")                 // split "é" into "e" + an accent mark
    .replace(/[̀-ͯ]/g, "")   // remove the accent marks
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")       // runs of other characters → one dash
    .replace(/^-+|-+$/g, "");          // no dash at the start or end
  return `prep-${slug || "company"}-${plan.interviewDate}.ics`;
}


// ─── 6. Downloading ────────────────────────────────────────────────────────
// The only part that touches the browser. It puts the text in a "Blob" (a file
// held in memory), makes a temporary link to it, clicks the link so the
// browser saves the file, then tidies up.

function downloadIcs(plan, now = new Date()) {
  const blob = new Blob([buildIcs(plan, now)], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = icsFileName(plan);
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);   // free the memory afterwards
}
