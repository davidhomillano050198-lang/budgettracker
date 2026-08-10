"use client";

import { useMemo, useState } from "react";
import { motion } from "motion/react";
import { ArrowLeft, ArrowRight, Building2, Check, HeartHandshake, PiggyBank, Sparkles, UserRound } from "lucide-react";
import { COUNTRIES, countryByCode } from "@/lib/currencies";
import { currencySymbol } from "@/lib/format";
import { HelpFeatureList } from "@/components/help-guide";

const STEPS = ["Welcome", "About you", "Household", "Your money", "Quick tour"];

export function OnboardingWizard({ sessionEmail, onComplete }: { sessionEmail: string; onComplete: () => void }) {
  const [step, setStep] = useState(0);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [occupation, setOccupation] = useState("");
  const [countryCode, setCountryCode] = useState("PH");

  const [householdName, setHouseholdName] = useState("");
  const [householdEdited, setHouseholdEdited] = useState(false);
  const [hasPartner, setHasPartner] = useState(false);
  const [partnerFirst, setPartnerFirst] = useState("");
  const [partnerLast, setPartnerLast] = useState("");
  const [partnerOccupation, setPartnerOccupation] = useState("");

  const [monthlyBudget, setMonthlyBudget] = useState("");
  const [currentSavings, setCurrentSavings] = useState("");
  const [savingsGoal, setSavingsGoal] = useState("");
  const [reminderEmail, setReminderEmail] = useState(sessionEmail);

  const country = useMemo(() => countryByCode(countryCode) ?? COUNTRIES[0], [countryCode]);
  const symbol = currencySymbol(country.currency);

  // Keep the household name suggestion in sync with the last name until edited.
  const suggestedHousehold = lastName.trim() ? `${lastName.trim()} Household` : "";
  const householdValue = householdEdited ? householdName : (householdName || suggestedHousehold);

  function next() {
    setError("");
    if (step === 1) {
      if (!firstName.trim() || !lastName.trim()) { setError("Please enter your first and last name."); return; }
    }
    if (step === 2) {
      if (!householdValue.trim()) { setError("Please name your household."); return; }
      if (hasPartner && (!partnerFirst.trim() || !partnerLast.trim())) { setError("Enter your partner’s name, or turn the toggle off."); return; }
    }
    if (step === 3) {
      if (!monthlyBudget || Number(monthlyBudget) <= 0) { setError("Set a monthly budget above zero."); return; }
    }
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }
  const back = () => { setError(""); setStep((s) => Math.max(s - 1, 0)); };

  async function finish() {
    setPending(true); setError("");
    const payload = {
      firstName: firstName.trim(), lastName: lastName.trim(), occupation: occupation.trim() || undefined,
      householdName: householdValue.trim(), country: countryCode,
      monthlyBudget: Number(monthlyBudget),
      currentSavings: currentSavings ? Number(currentSavings) : undefined,
      savingsGoal: savingsGoal ? Number(savingsGoal) : undefined,
      reminderEmail: reminderEmail.trim() || undefined,
      partner: hasPartner ? { firstName: partnerFirst.trim(), lastName: partnerLast.trim(), occupation: partnerOccupation.trim() || undefined } : undefined,
    };
    const res = await fetch("/api/onboarding", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    const result = await res.json().catch(() => ({}));
    setPending(false);
    if (!res.ok) { setError(result.error ?? "Something went wrong — please try again."); return; }
    onComplete();
  }

  return (
    <div className="onboarding-shell">
      <motion.section className="onboarding-card" initial={{ opacity: 0, y: 20, scale: 0.99 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}>
        <div className="onboarding-progress">
          {STEPS.map((label, i) => (
            <div key={label} className={`onboarding-step ${i === step ? "current" : ""} ${i < step ? "done" : ""}`}>
              <span className="onboarding-step-dot">{i < step ? <Check size={12} /> : i + 1}</span>
              <span className="onboarding-step-label">{label}</span>
            </div>
          ))}
        </div>

        <div className="onboarding-body">
          {step === 0 && (
            <div className="onboarding-hero">
              <div className="onboarding-hero-icon"><Sparkles size={26} /></div>
              <h1>Welcome to Budget Tracker</h1>
              <p>A private, shared money workspace for your household — track income and spending, plan budgets, and never miss a bill. Let’s set up your household. It takes about two minutes.</p>
            </div>
          )}

          {step === 1 && (
            <div className="onboarding-form">
              <div className="onboarding-title"><UserRound size={18} /><h2>Tell us about you</h2></div>
              <div className="form-grid">
                <label><span>First name</span><input value={firstName} onChange={(e) => setFirstName(e.target.value)} maxLength={40} autoFocus placeholder="Juan" /></label>
                <label><span>Last name</span><input value={lastName} onChange={(e) => setLastName(e.target.value)} maxLength={40} placeholder="Dela Cruz" /></label>
              </div>
              <label><span>Occupation <small>optional</small></span><input value={occupation} onChange={(e) => setOccupation(e.target.value)} maxLength={60} placeholder="e.g. Nurse, Engineer, Freelancer" /></label>
              <label><span>Country / region</span>
                <select value={countryCode} onChange={(e) => setCountryCode(e.target.value)}>
                  {COUNTRIES.map((c) => <option key={c.code} value={c.code}>{c.flag} {c.name}</option>)}
                </select>
              </label>
              <div className="onboarding-currency"><span className="currency-badge">{symbol}</span><span>Your currency will be <strong>{country.currencyName} ({country.currency})</strong> — every amount shows in this currency.</span></div>
            </div>
          )}

          {step === 2 && (
            <div className="onboarding-form">
              <div className="onboarding-title"><Building2 size={18} /><h2>Your household</h2></div>
              <label><span>Household name</span><input value={householdValue} onChange={(e) => { setHouseholdEdited(true); setHouseholdName(e.target.value); }} maxLength={60} placeholder="Dela Cruz Household" /></label>
              <button type="button" className={`onboarding-toggle ${hasPartner ? "on" : ""}`} onClick={() => setHasPartner((v) => !v)}>
                <HeartHandshake size={18} />
                <span><strong>I share finances with a partner</strong><small>Add them now so you can track whose money is whose (you can also do this later).</small></span>
                <i className="onboarding-switch" aria-hidden="true" />
              </button>
              {hasPartner && (
                <div className="onboarding-partner">
                  <div className="form-grid">
                    <label><span>Partner first name</span><input value={partnerFirst} onChange={(e) => setPartnerFirst(e.target.value)} maxLength={40} placeholder="Maria" /></label>
                    <label><span>Partner last name</span><input value={partnerLast} onChange={(e) => setPartnerLast(e.target.value)} maxLength={40} placeholder="Dela Cruz" /></label>
                  </div>
                  <label><span>Partner occupation <small>optional</small></span><input value={partnerOccupation} onChange={(e) => setPartnerOccupation(e.target.value)} maxLength={60} placeholder="e.g. Teacher" /></label>
                </div>
              )}
            </div>
          )}

          {step === 3 && (
            <div className="onboarding-form">
              <div className="onboarding-title"><PiggyBank size={18} /><h2>Your money</h2></div>
              <label className="amount-input"><span>Monthly household budget <small>in {country.currency}</small></span><div><b>{symbol}</b><input type="number" min="1" step="any" value={monthlyBudget} onChange={(e) => setMonthlyBudget(e.target.value)} placeholder="30000" /></div></label>
              <div className="form-grid">
                <label className="amount-input"><span>Current savings <small>optional</small></span><div><b>{symbol}</b><input type="number" min="0" step="any" value={currentSavings} onChange={(e) => setCurrentSavings(e.target.value)} placeholder="0" /></div></label>
                <label className="amount-input"><span>Savings goal <small>optional</small></span><div><b>{symbol}</b><input type="number" min="0" step="any" value={savingsGoal} onChange={(e) => setSavingsGoal(e.target.value)} placeholder="100000" /></div></label>
              </div>
              <label><span>Bill reminder email</span><input type="email" value={reminderEmail} onChange={(e) => setReminderEmail(e.target.value)} placeholder="you@email.com" /></label>
              <p className="settings-hint">We’ll email reminders here before your bills are due. You can change any of this later in Settings.</p>
            </div>
          )}

          {step === 4 && (
            <div className="onboarding-form">
              <div className="onboarding-title"><Sparkles size={18} /><h2>You’re all set, {firstName || "there"}! Here’s a quick tour</h2></div>
              <div className="onboarding-tour"><HelpFeatureList /></div>
            </div>
          )}

          {error && <p className="form-error" role="alert">{error}</p>}
        </div>

        <footer className="onboarding-foot">
          {step > 0 ? <button type="button" className="secondary-button" onClick={back} disabled={pending}><ArrowLeft size={16} />Back</button> : <span />}
          {step === 0 && <button type="button" className="primary-button" onClick={next}>Get started<ArrowRight size={16} /></button>}
          {step > 0 && step < STEPS.length - 1 && <button type="button" className="primary-button" onClick={next}>Continue<ArrowRight size={16} /></button>}
          {step === STEPS.length - 1 && <button type="button" className="primary-button" onClick={finish} disabled={pending}>{pending ? "Setting up…" : "Enter my dashboard"}<ArrowRight size={16} /></button>}
        </footer>
      </motion.section>
    </div>
  );
}
