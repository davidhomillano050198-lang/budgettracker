export type BlogSection = { heading?: string; paragraphs: string[]; bullets?: string[] };
export type BlogPost = {
  slug: string;
  title: string;
  description: string;
  date: string; // ISO
  readMins: number;
  tag: string;
  sections: BlogSection[];
};

export const BLOG_POSTS: BlogPost[] = [
  {
    slug: "how-to-budget-as-a-couple",
    title: "How to Budget as a Couple (Without Fighting About Money)",
    description: "Money is the #1 thing couples argue about. Here's a simple, judgement-free system to budget together — and actually stick to it.",
    date: "2026-08-11",
    readMins: 6,
    tag: "Couples",
    sections: [
      { paragraphs: [
        "Money arguments rarely start over spreadsheets — they start over surprises. One partner sees a charge they didn't expect, the other feels judged, and suddenly a small purchase becomes a big fight. The fix isn't tracking every peso; it's building a shared picture you both trust.",
        "Here's a system that works for real couples, whether you fully combine finances or keep things partly separate.",
      ]},
      { heading: "1. Start with a money date, not a budget", paragraphs: [
        "Before any app or spreadsheet, sit down for 20 minutes and answer three questions together: What are we saving toward? What bills are non-negotiable? What does each of us want freedom to spend on, no questions asked?",
        "This last one matters most. A budget that leaves zero room for personal spending always fails — someone breaks it, then hides it. Agree on a small 'yours' and 'mine' amount up front.",
      ]},
      { heading: "2. Give every category a limit — together", paragraphs: [
        "Envelope budgeting is the couple's secret weapon: you decide in advance how much goes to food, transport, bills, and fun. When the food envelope is 80% used with a week to go, that's information — not an accusation. The number does the talking, so neither of you has to.",
      ]},
      { heading: "3. Track by person, review as a team", paragraphs: [
        "Seeing 'who spent what' isn't about policing — it's about fairness. When both partners can filter to just their own spending or the household total, resentment drops. You stop guessing and start seeing.",
      ]},
      { heading: "4. Automate the boring parts", paragraphs: [
        "Bills are where couples get burned: a missed due date, a late fee, a 'I thought you paid it.' Put every recurring bill in one place with a reminder a few days early. Removing that mental load removes a whole category of arguments.",
      ]},
      { heading: "5. Celebrate the wins", paragraphs: [
        "Budgeting isn't punishment — it's teamwork toward something. When your savings goal ticks up, notice it together. Progress you can both see is what keeps the habit alive.",
      ]},
      { heading: "Make it effortless", paragraphs: [
        "Budget Tracker was built for exactly this: one shared household, per-person tracking, envelope budgets, and bill reminders — free forever. Set it up together in about two minutes.",
      ]},
    ],
  },
  {
    slug: "50-30-20-rule-explained",
    title: "The 50/30/20 Rule, Explained Simply",
    description: "The easiest budgeting framework there is: 50% needs, 30% wants, 20% savings. Here's how to use it with real numbers.",
    date: "2026-08-11",
    readMins: 5,
    tag: "Basics",
    sections: [
      { paragraphs: [
        "If budgeting feels overwhelming, start here. The 50/30/20 rule is the simplest framework that actually works, because it only has three buckets — and you probably already know which is which.",
      ]},
      { heading: "The three buckets", paragraphs: ["Take your after-tax income and split it:"], bullets: [
        "50% — Needs: rent, utilities, groceries, transport, minimum debt payments. The things you can't skip.",
        "30% — Wants: dining out, subscriptions, hobbies, travel. Life, basically.",
        "20% — Savings & extra debt: emergency fund, investments, paying debt faster.",
      ]},
      { heading: "A quick example", paragraphs: [
        "Say your household takes home 40,000 a month. That's 20,000 for needs, 12,000 for wants, and 8,000 toward savings. If your needs are eating more than 50%, that's the signal to look at your biggest fixed costs first — housing and transport usually — not to cut every small treat.",
      ]},
      { heading: "Why it works", paragraphs: [
        "Most budgets fail because they're too detailed to maintain. 50/30/20 gives you guardrails, not a straitjacket. You don't track 40 categories — you just keep three buckets roughly in balance.",
      ]},
      { heading: "Making it real", paragraphs: [
        "The trick is seeing your actual split without doing math every week. In Budget Tracker, set category limits that add up to your 50/30/20 targets, and the progress bars show you in real time whether you're on track. Adjust the percentages to fit your life — the framework is a starting point, not a law.",
      ]},
    ],
  },
  {
    slug: "build-an-emergency-fund",
    title: "How to Build an Emergency Fund on Any Income",
    description: "An emergency fund is the difference between a bad month and a financial crisis. Here's how to build one, even on a tight budget.",
    date: "2026-08-11",
    readMins: 5,
    tag: "Savings",
    sections: [
      { paragraphs: [
        "An emergency fund is money set aside for the unexpected — a medical bill, a job gap, a broken phone you need for work. It's the single most important thing you can build before investing, because it stops one bad event from becoming debt you spend years repaying.",
      ]},
      { heading: "How much do you need?", paragraphs: [
        "Start with a starter goal of one month of essential expenses — just your needs, not your wants. Once you hit that, aim for three months, then six. A smaller, reachable target beats a huge one you never start.",
      ]},
      { heading: "Where to keep it", paragraphs: [
        "Keep it separate from your everyday spending money — a different account or at least a clearly separate 'vault' — so you're not tempted to dip in. It should be easy to reach in a real emergency, but not so easy you raid it for a sale.",
      ]},
      { heading: "How to actually build it", paragraphs: [
        "Pay yourself first: the day money comes in, move a set amount to savings before you spend anything. Even a small, automatic amount beats a large 'whatever's left' that never materializes. Then treat windfalls — bonuses, refunds, gifts — as fuel: send half straight to the fund.",
      ]},
      { heading: "Track the progress", paragraphs: [
        "Watching the number grow is what keeps you going. Budget Tracker's savings vault keeps your emergency fund separate from daily spending, with a goal and a progress ring so every deposit feels like a step forward. Set your target and start today — free.",
      ]},
    ],
  },
];

export const getPost = (slug: string) => BLOG_POSTS.find((p) => p.slug === slug);
