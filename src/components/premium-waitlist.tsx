"use client";

import { FormEvent, useState } from "react";
import { Check } from "lucide-react";

export function PremiumWaitlist() {
  const [state, setState] = useState<"idle" | "pending" | "done">("idle");
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState("pending"); setError("");
    const email = String(new FormData(event.currentTarget).get("email") ?? "");
    const response = await fetch("/api/waitlist", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, source: "landing" }),
    }).catch(() => null);
    const result = await response?.json().catch(() => null);
    if (!response?.ok) { setError(result?.error ?? "Something went wrong. Please try again."); setState("idle"); return; }
    setState("done");
  }

  if (state === "done") {
    return <p className="lp-waitlist-done"><Check size={16} />You’re on the list! We’ll email you when Premium launches.</p>;
  }
  return (
    <form className="lp-waitlist" onSubmit={submit}>
      <input name="email" type="email" required placeholder="you@email.com" aria-label="Email for the Premium waitlist" />
      <button className="lp-cta lp-cta-ghost" disabled={state === "pending"}>{state === "pending" ? "Joining..." : "Join the waitlist"}</button>
      {error && <p className="lp-waitlist-error">{error}</p>}
    </form>
  );
}
