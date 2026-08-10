"use client";

import { AnimatePresence, motion } from "motion/react";
import {
  CalendarDays, Eye, HandCoins, LayoutDashboard, PiggyBank, Plus, ReceiptText,
  Settings2, Sparkles, Target, Users, X,
} from "lucide-react";

export type HelpFeature = { icon: typeof LayoutDashboard; title: string; body: string; steps?: string[] };

export const HELP_FEATURES: HelpFeature[] = [
  {
    icon: LayoutDashboard, title: "Overview — your command center",
    body: "The home screen shows the big picture: “Available to plan” (what’s left after commitments), your spending pace versus budget, total savings, and a live cash-flow chart.",
    steps: ["Open the app here each day for a 10-second health check", "Use the You / Partner / Everyone filter to see whose money is whose"],
  },
  {
    icon: ReceiptText, title: "Transactions — your money ledger",
    body: "Every peso in and out, in one place. Log income or an expense in seconds and review your full history.",
    steps: ["Tap “Add transaction”, pick Expense or Income", "Set amount, category, who it’s for, payment method, and a note", "Filter by date, category, or person — edit or delete anytime (with undo)"],
  },
  {
    icon: CalendarDays, title: "Bills & reminders — never miss a due date",
    body: "Track recurring bills like rent, utilities, and subscriptions, and get an email before each is due.",
    steps: ["Add a bill with its amount, due date, and how often it repeats", "Choose how many days ahead you want the email reminder", "Mark it paid — recurring bills roll to the next cycle automatically"],
  },
  {
    icon: Target, title: "Budget plan — envelope budgeting",
    body: "Give each spending category a monthly limit (e.g. Food ₱8,000). Progress bars fill as you spend and turn amber then red as you near the limit, so overspending is obvious at a glance.",
    steps: ["Open Budget plan and tap a category to set its limit", "Watch the bars through the month; unbudgeted money stays flexible"],
  },
  {
    icon: PiggyBank, title: "Savings vault",
    body: "Track money set aside, separate from everyday spending, with a goal and a progress ring. Your opening balance from setup is already recorded here.",
    steps: ["Record deposits or withdrawals as your savings change", "Set a target and watch the ring fill toward your goal"],
  },
  {
    icon: Users, title: "You / Partner / Everyone",
    body: "A filter across the whole app to view one person’s money or the household combined — perfect for “how much did I spend?” versus “how are WE doing?”.",
  },
  {
    icon: Settings2, title: "Settings — your control panel",
    body: "Everything personal lives here: household name & photo, members, country/region & currency, categories, savings goal, light/dark theme, and sign-in security (email & password).",
  },
  {
    icon: Eye, title: "Privacy mode",
    body: "Turn on balance privacy in Settings to mask amounts (₱ ••••••) when someone’s looking over your shoulder — your numbers stay hidden until you switch it back.",
  },
  {
    icon: Plus, title: "Adding things is always one tap",
    body: "The green “Add transaction” button sits in both the sidebar and the top bar, with “Add bill” right beside it — so logging money is never more than a click away.",
  },
];

export function HelpGuide({ open, isFirstTime, onClose }: { open: boolean; isFirstTime: boolean; onClose: () => void }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div className="modal-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
          <motion.section className="modal-sheet help-sheet" role="dialog" aria-modal="true" aria-label="How to use Budget Tracker"
            initial={{ opacity: 0, y: 24, scale: 0.985 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 16, scale: 0.99 }}>
            <header className="help-head">
              <div className="help-head-icon"><Sparkles size={20} /></div>
              <div>
                <p className="eyebrow">{isFirstTime ? "Welcome 👋" : "Help & guide"}</p>
                <h2>{isFirstTime ? "Welcome to Budget Tracker!" : "How to use Budget Tracker"}</h2>
              </div>
              <button type="button" className="icon-button" onClick={onClose} title="Close"><X size={19} /></button>
            </header>

            <div className="help-body">
              <p className="help-intro">
                <HandCoins size={16} /> Budget Tracker is a private, shared money workspace for your household —
                track what comes in, where it goes, plan your budget, and never miss a bill. Here’s a detailed
                tour of what each part does:
              </p>
              <HelpFeatureList />
              <p className="help-note">
                You can reopen this anytime from the <strong>Help</strong> button (the “?” in the top bar or the
                sidebar).
              </p>
            </div>

            <footer className="help-foot">
              <button type="button" className="primary-button" onClick={onClose}>
                {isFirstTime ? "Got it — let’s start" : "Close"}
              </button>
            </footer>
          </motion.section>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/** Shared detailed feature list — reused by the onboarding wizard's tour step. */
export function HelpFeatureList() {
  return (
    <div className="help-grid">
      {HELP_FEATURES.map(({ icon: Icon, title, body, steps }) => (
        <div className="help-feature" key={title}>
          <span className="help-feature-icon"><Icon size={17} /></span>
          <div>
            <strong>{title}</strong>
            <p>{body}</p>
            {steps && <ul className="help-steps">{steps.map((s) => <li key={s}>{s}</li>)}</ul>}
          </div>
        </div>
      ))}
    </div>
  );
}
