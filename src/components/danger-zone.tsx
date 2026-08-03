"use client";

import { AlertTriangle, Trash2 } from "lucide-react";
import { useState } from "react";

/**
 * Settings danger zone: permanently delete the household and all its data.
 * Two-step confirm (arm, then password + delete) so it can't happen by accident.
 */
export function DangerZone({ householdName }: { householdName: string }) {
  const [armed, setArmed] = useState(false);
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function destroy() {
    if (pending) return;
    setPending(true); setError("");
    const response = await fetch("/api/settings/household", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword: password }),
    });
    const result = await response.json().catch(() => ({}));
    setPending(false);
    if (!response.ok) { setError(result.error ?? "Unable to delete household."); return; }
    window.location.href = "/";
  }

  return (
    <>
      <p className="danger-copy">
        Deleting <strong>{householdName}</strong> permanently erases every transaction, bill,
        budget, savings record, and member — for everyone in the household. This cannot be undone.
        Export your CSV first if you want a copy.
      </p>
      {armed ? (
        <div className="danger-confirm">
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Enter your password to confirm"
            aria-label="Current password"
            autoComplete="current-password"
          />
          {error && <p className="form-error" role="alert">{error}</p>}
          <button type="button" className="danger-button" onClick={destroy} disabled={pending}>
            <Trash2 size={15} />{pending ? "Deleting everything..." : "Permanently delete this household"}
          </button>
          <button type="button" className="secondary-button" onClick={() => { setArmed(false); setError(""); setPassword(""); }}>Cancel</button>
        </div>
      ) : (
        <button type="button" className="danger-button" onClick={() => setArmed(true)}>
          <AlertTriangle size={15} />Delete household...
        </button>
      )}
    </>
  );
}
