// tasks.js — ALL the words the plan shows live in this one file.
// Edit titles and "how" text here freely; no logic depends on the wording.
//
// {company} and {role} are placeholders: plan.js swaps in what the user typed.
// Keep each "how" to 1–2 short lines, as it appears on a small card.

const TASK_TEXT = {
  // The interview types offered in the form. "" means none was chosen (General).
  interviewTypes: {
    "": "General",
    phone: "Phone screen",
    behavioural: "Behavioural",
    technical: "Technical",
    final: "Final round",
  },

  // The main prep tasks, IN THE ORDER THEY APPEAR IN THE PLAN
  // (research first, practice closest to the interview).
  //
  // Two numbers decide what is dropped when there are too few days:
  //   priority: 1 = never dropped, 2 = dropped if there is no room.
  //   rank:     the order priority-2 tasks are kept in (lower = kept first).
  //             These match the numbers in the spec's task table.
  // isMock: true marks a mock interview (the plan allows at most 2 in total).
  prep: [
    {
      rank: 1, priority: 1,
      title: "Research {company} and the {role} posting",
      how: "Read the posting and the company's site. Write down 3 things the role rewards.",
    },
    {
      rank: 7, priority: 2,
      title: "Use {company}'s product and note one thing you'd improve",
      how: "Spend 20 minutes as a real user. Note one thing you'd change and why.",
    },
    {
      rank: 2, priority: 1,
      title: "Write 5–8 career stories in STAR form",
      how: "Situation, Task, Action, Result for each. Pick stories that show the 3 things the role rewards.",
    },
    {
      rank: 3, priority: 1,
      title: "Say \"Tell me about yourself\" out loud and time it",
      how: "Aim for about 2 minutes: where you are now, how you got here, why {role} at {company}.",
    },
    {
      rank: 4, priority: 1,
      title: "Prepare 3 questions to ask the interviewer",
      how: "Ask about the team, what success looks like early on, and something from your research.",
    },
    {
      rank: 5, priority: 2,
      title: "Prepare a short answer to the question you dread",
      how: "Write 3–4 honest sentences that end on what you learned. Say it out loud twice.",
    },
    {
      rank: 6, priority: 2, isMock: true,
      title: "Mock interview with a person",
      how: "Ask a friend to interview you for 20–30 minutes. Ask them for one thing to improve.",
    },
  ],

  // The 8th task: only added when an interview type is chosen. Always placed last.
  typeSpecific: {
    phone: {
      rank: 8, priority: 2,
      title: "Practise a 2-minute pitch and your salary answer",
      how: "Phone screens are short: rehearse your pitch and a clear salary range out loud.",
    },
    behavioural: {
      rank: 8, priority: 2,
      title: "Write 3 extra stories",
      how: "Cover conflict, failure and leadership, in STAR form, so you're not reusing one story.",
    },
    technical: {
      rank: 8, priority: 2,
      title: "Technical practice",
      how: "Do 2 practice problems typical for {role}, explaining your thinking out loud.",
    },
    final: {
      rank: 8, priority: 2,
      title: "Prepare a 30-60-90 day plan for {role}",
      how: "One line each: what you'd learn, build and deliver in your first 3 months.",
    },
  },

  // Used to fill spare days when there are more days than tasks.
  // "Practise out loud" takes every other spare day. The days in between get
  // "Another mock interview" until there are 2 mocks in the plan, then
  // "Refine your stories".
  spare: {
    practise: {
      title: "Practise out loud",
      how: "Say \"Tell me about yourself\" and 2–3 of your stories out loud. Time each one.",
    },
    mock: {
      isMock: true,
      title: "Another mock interview",
      how: "Run another 20–30 minute mock. Focus on the answer that felt weakest last time.",
    },
    refine: {
      title: "Refine your stories",
      how: "Re-read your stories, tighten each to about 2 minutes, and add a number where you can.",
    },
  },

  // 2 days left: only one prep day, so the four priority-1 tasks become two.
  twoDaysLeft: [
    {
      title: "Research {company} and prepare 3 questions to ask",
      how: "Find 3 things the {role} role rewards, then write 3 questions based on them.",
    },
    {
      title: "Write your top stories and say \"Tell me about yourself\" out loud",
      how: "Write 3 STAR stories, then practise a 2-minute intro out loud and time it.",
    },
  ],

  // 1 day left: one combined task today.
  oneDayLeft: {
    title: "Quick prep: research, \"Tell me about yourself\" and logistics",
    how: "Skim {company}'s site, practise your intro out loud, then confirm the time and test your camera.",
  },

  // The day before the interview (always included when there's room).
  dayBefore: {
    title: "Logistics and rest",
    how: "Confirm the time and link, test camera and mic, choose clothes. No cramming; sleep early.",
  },

  // Interview day.
  checklist: {
    title: "Interview morning checklist",
    how: "Eat, drink water, review your top 3 stories once, join 5 minutes early.",
  },
  interview: {
    title: "Interview at {company}",
    how: "{role} interview. You've prepared for this. Good luck!",
  },

  // Messages shown on the plan screen. {date} is filled in by plan.js.
  notes: {
    planStartsLater: "Your plan starts on {date}, two weeks before your interview. Nothing to do until then.",
  },
};
