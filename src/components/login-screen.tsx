"use client";

import { ArrowRight, Eye, EyeOff, LockKeyhole, ShieldCheck } from "lucide-react";
import { FormEvent, useState } from "react";
import { motion } from "motion/react";

export type LoginProvider = { id: string; label: string; configured?: boolean };

const authErrorCopy: Record<string, string> = {
  "email-not-allowed": "That account isn't authorized for this household. Add its email in Settings → Sign-in & security first.",
  "provider-not-configured": "That sign-in method isn't configured yet.",
  "state-mismatch": "Sign-in session expired. Please try again.",
  "exchange-failed": "We couldn't complete the sign-in. Please try again.",
  "unknown-provider": "Unknown sign-in method.",
};

function GoogleMark() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M23.5 12.27c0-.85-.08-1.66-.22-2.45H12v4.64h6.45a5.52 5.52 0 0 1-2.4 3.62v3h3.88c2.27-2.1 3.57-5.17 3.57-8.81Z" />
      <path fill="#34A853" d="M12 24c3.24 0 5.96-1.07 7.94-2.91l-3.88-3.01c-1.08.72-2.45 1.15-4.06 1.15-3.12 0-5.77-2.11-6.71-4.95H1.28v3.11A12 12 0 0 0 12 24Z" />
      <path fill="#FBBC05" d="M5.29 14.28a7.2 7.2 0 0 1 0-4.56V6.61H1.28a12 12 0 0 0 0 10.78l4.01-3.11Z" />
      <path fill="#EA4335" d="M12 4.77c1.76 0 3.34.6 4.58 1.79l3.44-3.44A11.97 11.97 0 0 0 1.28 6.61l4.01 3.11C6.23 6.88 8.88 4.77 12 4.77Z" />
    </svg>
  );
}

function FacebookMark() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#1877F2" d="M24 12a12 12 0 1 0-13.88 11.85v-8.38H7.08V12h3.04V9.36c0-3 1.79-4.67 4.53-4.67 1.31 0 2.68.24 2.68.24v2.95h-1.51c-1.49 0-1.95.92-1.95 1.87V12h3.32l-.53 3.47h-2.79v8.38A12 12 0 0 0 24 12Z" />
      <path fill="#fff" d="M16.67 15.47 17.2 12h-3.32V9.75c0-.95.46-1.87 1.95-1.87h1.51V4.93s-1.37-.24-2.68-.24c-2.74 0-4.53 1.66-4.53 4.67V12H7.08v3.47h3.04v8.38a12.09 12.09 0 0 0 3.76 0v-8.38h2.79Z" />
    </svg>
  );
}

const providerMarks: Record<string, () => React.ReactNode> = {
  google: GoogleMark,
  facebook: FacebookMark,
};

export function LoginScreen({ demoMode, providers = [], authError }: {
  demoMode: boolean; providers?: LoginProvider[]; authError?: string;
}) {
  const [showPassword, setShowPassword] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(authError ? (authErrorCopy[authError] ?? "Sign-in failed. Please try again.") : "");

  const [mode, setMode] = useState<"signin" | "signup">("signin");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    const form = new FormData(event.currentTarget);
    const signup = mode === "signup";
    const response = await fetch(signup ? "/api/auth/signup" : "/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(signup
        ? { email: form.get("email"), password: form.get("password"), householdName: form.get("householdName") || undefined }
        : { email: form.get("email"), password: form.get("password") }),
    });
    const result = await response.json();
    if (!response.ok) {
      setError(result.error ?? (signup ? "Sign-up failed." : "Login failed."));
      setPending(false);
      return;
    }
    window.location.reload();
  }

  return (
    <main className="login-shell">
      <section className="login-brand-panel">
        <motion.div className="login-hero" initial={{ opacity: 0, scale: 0.965 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.65, ease: [0.2, 0.7, 0.3, 1] }}>
          <img className="brand-logo for-light login-hero-logo" src="/brand-logo-ink.png" alt="Budget Tracker" />
          <img className="brand-logo for-dark login-hero-logo" src="/brand-logo.png" alt="Budget Tracker" />
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55 }} className="login-brand-copy">
          <p className="eyebrow">Household finance</p>
          <h1>One calm view of your life together.</h1>
          <p>Know what came in, where it went, and what needs your attention next.</p>
        </motion.div>
        <div className="login-snapshot" aria-hidden="true">
          <div className="snapshot-top"><span>Monthly pulse</span><strong>On track</strong></div>
          <div className="snapshot-bars">
            {[48, 58, 44, 66, 72, 56, 81, 68, 74, 63, 78, 86].map((height, index) => (
              <motion.span key={index} initial={{ height: 0 }} animate={{ height: `${height}%` }} transition={{ delay: 0.18 + index * 0.035, duration: 0.38 }} />
            ))}
          </div>
          <div className="snapshot-footer"><span>Income</span><span>Expenses</span><span>Savings</span></div>
        </div>
        <div className="login-security"><ShieldCheck size={17} /><span>Private household workspace</span></div>
      </section>

      <section className="login-form-panel">
        <motion.div initial={{ opacity: 0, x: 18 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.45, delay: 0.12 }} className="login-form-wrap">
          <div className="login-icon"><LockKeyhole size={22} /></div>
          <p className="eyebrow">{mode === "signup" ? "Get started" : "Welcome back"}</p>
          <h2>{mode === "signup" ? "Create your household" : "Sign in to your household"}</h2>
          <p className="login-subtitle">{mode === "signup" ? "Free, private, and ready in seconds." : "Use your shared BudgetTracker credential."}</p>

          {providers.length > 0 && (
            <>
              <div className="oauth-row">
                {providers.map((provider) => {
                  const Mark = providerMarks[provider.id];
                  return (
                    <a key={provider.id} className="oauth-button" href={`/api/auth/oauth/${provider.id}`}>
                      {Mark ? <Mark /> : null}<span>Continue with {provider.label}</span>
                    </a>
                  );
                })}
              </div>
              <div className="login-divider"><span>or use email</span></div>
            </>
          )}
          {/* Unconfigured providers still render — clicking routes to a friendly
              "not configured yet" notice until the OAuth keys are added. */}

          <form onSubmit={submit} className="login-form">
            {mode === "signup" && (
              <label>
                <span>Household name <small>Optional</small></span>
                <input name="householdName" type="text" maxLength={60} placeholder="e.g. The Santos Household" />
              </label>
            )}
            <label>
              <span>Email</span>
              <input name="email" type="email" autoComplete="username" defaultValue={demoMode && mode === "signin" ? "hello@budgettracker.local" : ""} required />
            </label>
            <label>
              <span>Password{mode === "signup" && <small> 10+ characters, letters and numbers</small>}</span>
              <div className="password-field">
                <input name="password" type={showPassword ? "text" : "password"} minLength={mode === "signup" ? 10 : 8} autoComplete={mode === "signup" ? "new-password" : "current-password"} defaultValue={demoMode && mode === "signin" ? "Together2026!" : ""} required />
                <button type="button" onClick={() => setShowPassword((value) => !value)} title={showPassword ? "Hide password" : "Show password"}>
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </label>
            {error && <p className="form-error" role="alert">{error}</p>}
            <button className="primary-button login-submit" type="submit" disabled={pending}>
              <span>{pending ? (mode === "signup" ? "Creating household..." : "Signing in...") : (mode === "signup" ? "Create household" : "Continue")}</span><ArrowRight size={17} />
            </button>
          </form>
          <button type="button" className="mode-switch" onClick={() => { setMode(mode === "signin" ? "signup" : "signin"); setError(""); }}>
            {mode === "signin" ? "New here? Create your household — it's free" : "Already have a household? Sign in"}
          </button>
          <p className="login-device-note">This device stays signed in securely for 30 days.</p>
          <div className="login-legal"><a href="/privacy">Privacy</a><a href="/terms">Terms</a></div>
        </motion.div>
      </section>
    </main>
  );
}
