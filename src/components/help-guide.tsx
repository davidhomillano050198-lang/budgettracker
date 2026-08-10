"use client";

import { AnimatePresence, motion } from "motion/react";
import {
  CalendarDays, HandCoins, LayoutDashboard, PiggyBank, Plus, ReceiptText,
  Settings2, Sparkles, Target, Users, X,
} from "lucide-react";

type Feature = { icon: typeof LayoutDashboard; title: string; body: string };

const FEATURES: Feature[] = [
  { icon: LayoutDashboard, title: "Overview",
    body: "Your home screen at a glance — how much money is still available to plan, your spending pace, savings, and a cash-flow chart. Start here each time you open the app." },
  { icon: ReceiptText, title: "Transactions",
    body: "Every peso in and out. Tap “Add transaction” to record income or an expense, then filter by date, category, or person to review your history." },
  { icon: CalendarDays, title: "Bills & reminders",
    body: "Schedule recurring bills (rent, utilities, subscriptions). We’ll email you a reminder before each one is due so nothing slips through." },
  { icon: Target, title: "Budget plan",
    body: "Set a monthly spending limit per category — e.g. Food ₱8,000, Transport ₱3,000 — and watch live progress bars so you know when you’re close to the edge." },
  { icon: PiggyBank, title: "Savings vault",
    body: "Track money you’re setting aside, separate from everyday spending, and set a savings goal to work toward." },
  { icon: Users, title: "You / Partner / Everyone",
    body: "Use the person filter to see whose money is whose — just yours, your partner’s, or the whole household combined." },
  { icon: Settings2, title: "Settings",
    body: "Change your household name & photo, pick your country (all amounts auto-convert to that currency), manage categories, switch light/dark theme, hide balances for privacy, and update your password." },
  { icon: Plus, title: "Adding things is one tap",
    body: "The green “Add transaction” button is always within reach — in the sidebar and the top bar. Add a bill from the “Add bill” button beside it." },
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
                track what comes in, where it goes, plan your budget, and never miss a bill. Here’s a quick tour
                of what each part does:
              </p>

              <div className="help-grid">
                {FEATURES.map(({ icon: Icon, title, body }) => (
                  <div className="help-feature" key={title}>
                    <span className="help-feature-icon"><Icon size={17} /></span>
                    <div><strong>{title}</strong><p>{body}</p></div>
                  </div>
                ))}
              </div>

              <p className="help-note">
                You can reopen this anytime from the <strong>Help</strong> button (the “?” in the top bar or the
                sidebar). Ready when you are.
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
