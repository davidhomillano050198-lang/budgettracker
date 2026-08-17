import Link from "next/link";
import {
  BellRing, Check, LayoutDashboard, LineChart, Lock, PiggyBank, ReceiptText,
  ShieldCheck, Sparkles, Target, Users, Wallet,
} from "lucide-react";

const FEATURES = [
  { icon: LayoutDashboard, title: "One clear overview", body: "See what’s available to spend, your pace against budget, and savings — at a glance, every day." },
  { icon: ReceiptText, title: "Effortless tracking", body: "Log income and expenses in seconds, then filter by date, category, or person." },
  { icon: Target, title: "Envelope budgeting", body: "Give each category a monthly limit and watch live progress bars keep you on track." },
  { icon: BellRing, title: "Never miss a bill", body: "Schedule recurring bills and get email reminders before they’re due." },
  { icon: PiggyBank, title: "Grow your savings", body: "Track a savings vault separately with a goal and a progress ring." },
  { icon: Users, title: "Built for two", body: "Share one household so you and your partner see whose money is whose — or the full picture." },
];

const STEPS = [
  { n: "1", title: "Create your household", body: "Sign up free in seconds — email or Google. No credit card." },
  { n: "2", title: "Set it up in 2 minutes", body: "A guided wizard sets your currency, budget, savings, and (optional) partner." },
  { n: "3", title: "Track together", body: "Log spending, plan budgets, and watch your money get calmer." },
];

const FREE_PERKS = ["1 household, 2 members", "Unlimited transactions", "Budgets, bills & reminders", "Savings vault & goal", "Live currency conversion"];
const PREMIUM_PERKS = ["Everything in Free", "Family: up to 12 members", "CSV & PDF export", "Advanced analytics", "Receipt photo attachments", "Priority reminders"];

const FAQS = [
  { q: "Is it really free?", a: "Yes — the Free plan is free forever, no credit card required. Premium is optional." },
  { q: "Is my financial data private?", a: "Your data is isolated to your household, protected by secure sign-in, and never sold. Records stay yours." },
  { q: "Can my partner join?", a: "Absolutely — that’s the point. Share one household and track money together, or filter to just one person." },
  { q: "Does it work on my phone?", a: "Yes. Budget Tracker is mobile-first and works right in your phone’s browser." },
];

function Cta({ variant = "primary", href, children }: { variant?: "primary" | "ghost"; href: string; children: React.ReactNode }) {
  return <a className={`lp-cta lp-cta-${variant}`} href={href}>{children}</a>;
}

export function LandingPage() {
  return (
    <div className="lp">
      <header className="lp-nav">
        <span className="lp-brand"><img src="/brand-emblem.png" alt="" className="lp-brand-mark" /><span>Budget <b>Tracker</b></span></span>
        <nav className="lp-nav-actions">
          <a className="lp-link" href="/login">Sign in</a>
          <Cta href="/login?mode=signup">Get started free</Cta>
        </nav>
      </header>

      <section className="lp-hero">
        <span className="lp-eyebrow"><Sparkles size={14} /> Money, together</span>
        <h1>The budgeting app for<br /><span>couples & families.</span></h1>
        <p>Track what comes in, where it goes, plan your budget, and never miss a bill — in one private space you and your partner share.</p>
        <div className="lp-hero-actions">
          <Cta href="/login?mode=signup">Get started — it’s free</Cta>
          <Cta variant="ghost" href="#features">See how it works</Cta>
        </div>
        <p className="lp-trust"><ShieldCheck size={15} /> Free forever plan · No credit card · Private & secure</p>
      </section>

      <section className="lp-section" id="features">
        <h2>Everything a household needs</h2>
        <p className="lp-sub">Simple enough for daily use, powerful enough to actually change your money.</p>
        <div className="lp-features">
          {FEATURES.map(({ icon: Icon, title, body }) => (
            <div className="lp-feature" key={title}>
              <span className="lp-feature-icon"><Icon size={20} /></span>
              <strong>{title}</strong><p>{body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="lp-section lp-steps-section">
        <h2>Up and running in 2 minutes</h2>
        <div className="lp-steps">
          {STEPS.map(({ n, title, body }) => (
            <div className="lp-step" key={n}><span className="lp-step-n">{n}</span><strong>{title}</strong><p>{body}</p></div>
          ))}
        </div>
      </section>

      <section className="lp-section" id="pricing">
        <h2>Simple, honest pricing</h2>
        <p className="lp-sub">Start free. Upgrade only if you want more.</p>
        <div className="lp-plans">
          <div className="lp-plan">
            <div className="lp-plan-head"><span className="lp-plan-name"><Wallet size={18} /> Free</span><div className="lp-price"><b>$0</b><small>forever</small></div></div>
            <ul>{FREE_PERKS.map((p) => <li key={p}><Check size={15} />{p}</li>)}</ul>
            <Cta href="/login?mode=signup">Get started free</Cta>
          </div>
          <div className="lp-plan lp-plan-featured">
            <span className="lp-plan-badge">Coming soon</span>
            <div className="lp-plan-head"><span className="lp-plan-name"><LineChart size={18} /> Premium</span><div className="lp-price"><b>$4</b><small>/ month</small></div></div>
            <ul>{PREMIUM_PERKS.map((p) => <li key={p}><Check size={15} />{p}</li>)}</ul>
            <Cta variant="ghost" href="/login?mode=signup">Start free, upgrade later</Cta>
          </div>
        </div>
      </section>

      <section className="lp-section">
        <h2>Questions, answered</h2>
        <div className="lp-faqs">
          {FAQS.map(({ q, a }) => (
            <div className="lp-faq" key={q}><strong>{q}</strong><p>{a}</p></div>
          ))}
        </div>
      </section>

      <section className="lp-band">
        <h2>Start budgeting together — today.</h2>
        <p>Free forever plan. No credit card. Ready in seconds.</p>
        <Cta href="/login?mode=signup">Create your free household</Cta>
      </section>

      <footer className="lp-footer">
        <span className="lp-brand"><img src="/brand-emblem.png" alt="" className="lp-brand-mark" /><span>Budget <b>Tracker</b></span></span>
        <span className="lp-footer-tag"><Lock size={13} /> Private household finance</span>
        <nav className="lp-footer-links"><Link href="/blog">Blog</Link><a href="/privacy">Privacy</a><a href="/terms">Terms</a><a href="/login">Sign in</a></nav>
      </footer>
    </div>
  );
}
