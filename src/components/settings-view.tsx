"use client";

import {
  AlertTriangle, ArrowDownToLine, ArrowRight, ArrowUpFromLine, Check, Eye, EyeOff, History, KeyRound, LockKeyhole, Moon,
  MonitorSmartphone, Pencil, PiggyBank, RotateCcw, ShieldCheck, Sun, Tags, Trash2, UserPlus, UserRound, UsersRound, Wallet,
} from "lucide-react";
import { CategoryManager } from "@/components/category-manager";
import { DangerZone } from "@/components/danger-zone";
import { ChevronLeft, ChevronRight, Globe } from "lucide-react";
import { createContext, FormEvent, useContext, useEffect, useState, useSyncExternalStore } from "react";
import { DestructiveActionDialog, UndoToast } from "@/components/destructive-action";
import { COUNTRIES, countryByCode } from "@/lib/currencies";
import { currencySymbol, formatCurrency, formatDate, maskedAmount, toBaseAmount, toDisplayAmount } from "@/lib/format";
import { applyThemePreference, getServerThemePreference, getThemePreference, subscribeTheme, type ThemePreference } from "@/lib/theme";
import type { DashboardData, Member, MemberBudgetRole, MemberRelationship } from "@/lib/types";

const themeOptions: Array<{ id: ThemePreference; label: string; icon: typeof Sun }> = [
  { id: "light", label: "Light", icon: Sun },
  { id: "system", label: "System", icon: MonitorSmartphone },
  { id: "dark", label: "Dark", icon: Moon },
];

const relationshipOptions: Array<{ id: MemberRelationship; label: string }> = [
  { id: "self", label: "Self" }, { id: "spouse", label: "Spouse" }, { id: "partner", label: "Partner" },
  { id: "child", label: "Child" }, { id: "parent", label: "Parent" }, { id: "sibling", label: "Sibling" },
  { id: "relative", label: "Other relative" }, { id: "friend", label: "Friend" },
  { id: "roommate", label: "Roommate" }, { id: "other", label: "Other" },
];

const budgetRoleOptions: Array<{ id: MemberBudgetRole; label: string; description: string }> = [
  { id: "owner", label: "Household owner", description: "Primary household organizer" },
  { id: "planner", label: "Budget planner", description: "Helps organize the monthly plan" },
  { id: "contributor", label: "Contributor", description: "Contributes income or spending" },
  { id: "dependent", label: "Dependent", description: "Expenses are supported by the household" },
  { id: "observer", label: "Observer", description: "Included mainly for reporting" },
];

const relationshipLabels = Object.fromEntries(relationshipOptions.map((option) => [option.id, option.label])) as Record<MemberRelationship, string>;
const budgetRoleLabels = Object.fromEntries(budgetRoleOptions.map((option) => [option.id, option.label])) as Record<MemberBudgetRole, string>;

const memberColors = [
  "#1D2924",
  "#D77A58",
  "#5B83A6",
  "#8B78A8",
  "#D6A84B",
  "#4D9A8B",
  "#D25D64",
  "#7C837F",
];

/**
 * iOS-style settings navigation: the parent holds which section is open
 * (null = the menu). Each SettingsCard renders as a tappable menu row when
 * closed, and as the full detail panel (with a back button) when it is the
 * open section — so the card bodies stay unchanged.
 */
const SettingsNav = createContext<{ active: string | null; open: (key: string) => void; close: () => void }>({
  active: null, open: () => {}, close: () => {},
});

function SettingsCard({ icon: Icon, title, subtitle, section, tone, children }: {
  icon: typeof UserRound; title: string; subtitle: string; section: string;
  tone?: "danger"; children: React.ReactNode;
}) {
  const nav = useContext(SettingsNav);
  if (nav.active === null) {
    return (
      <button type="button" className={`settings-row ${tone === "danger" ? "danger" : ""}`} onClick={() => nav.open(section)}>
        <span className="settings-row-icon"><Icon size={17} /></span>
        <span className="settings-row-text"><strong>{title}</strong><span>{subtitle}</span></span>
        <ChevronRight size={18} className="settings-row-chevron" />
      </button>
    );
  }
  if (nav.active !== section) return null;
  return (
    <article className={`panel settings-card settings-detail ${tone === "danger" ? "danger-card" : ""}`}>
      <button type="button" className="settings-back" onClick={nav.close}><ChevronLeft size={16} />Settings</button>
      <header className="settings-card-head">
        <span className="settings-card-icon"><Icon size={17} /></span>
        <div><h2>{title}</h2><p>{subtitle}</p></div>
      </header>
      {children}
    </article>
  );
}

function MemberProfileDialog({ mode, member, currency, onClose, onSave }: {
  mode: "add" | "edit"; member: Member; currency: string; onClose: () => void; onSave: (member: Member) => void;
}) {
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const name = String(form.get("name") ?? "").trim();
    onSave({
      ...member,
      name,
      initials: name.slice(0, 2).toUpperCase(),
      relationship: String(form.get("relationship")) as MemberRelationship,
      budgetRole: String(form.get("budgetRole")) as MemberBudgetRole,
      email: String(form.get("email") ?? "").trim().toLowerCase(),
      monthlyContribution: Number(form.get("monthlyContribution") ?? 0),
    });
  }

  return (
    <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="modal-sheet member-profile-dialog" role="dialog" aria-modal="true" aria-labelledby="member-profile-title">
        <header>
          <div><p className="eyebrow">Household roster</p><h2 id="member-profile-title">{mode === "add" ? "Add household member" : "Edit household member"}</h2><p>Capture details that make attribution and reporting more useful.</p></div>
          <button type="button" className="icon-button" onClick={onClose} aria-label="Close member editor">x</button>
        </header>
        <form className="modal-form" onSubmit={submit}>
          <label><span>Full name</span><input name="name" defaultValue={member.name} minLength={1} maxLength={40} placeholder="e.g. Alex Santos" autoFocus required /></label>
          <div className="form-grid">
            <label><span>Relationship</span><select name="relationship" defaultValue={member.relationship} required>{relationshipOptions.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}</select></label>
            <label><span>Planning role</span><select name="budgetRole" defaultValue={member.budgetRole} required>{budgetRoleOptions.map((option) => <option key={option.id} value={option.id}>{option.label} - {option.description}</option>)}</select></label>
          </div>
          <div className="form-grid">
            <label><span>Contact email <small>Optional</small></span><input name="email" type="email" defaultValue={member.email} maxLength={120} placeholder="alex@example.com" /></label>
            <label className="amount-input"><span>Monthly contribution target <small>Optional</small></span><div><b>{currencySymbol(currency)}</b><input name="monthlyContribution" type="number" min="0" max="100000000" step="100" defaultValue={member.monthlyContribution || ""} placeholder="0" /></div></label>
          </div>
          <div className="settings-note member-role-note"><ShieldCheck size={17} /><div><strong>Planning roles organize reports only.</strong><p>They do not grant sign-in access. Manage authorized emails under Sign-in & security.</p></div></div>
          <div className="member-dialog-actions"><button type="button" className="secondary-button" onClick={onClose}>Cancel</button><button type="submit" className="primary-button"><span>{mode === "add" ? "Add member" : "Save member"}</span><ArrowRight size={16} /></button></div>
        </form>
      </section>
    </div>
  );
}

type SavingsMode = "deposit" | "withdrawal" | "correction";

function SavingsEntryDialog({ data, mode, onClose, onSaved }: {
  data: DashboardData;
  mode: SavingsMode;
  onClose: () => void;
  onSaved: (entry: { id: string; kind: SavingsMode }) => void;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const copy = {
    deposit: { eyebrow: "Savings activity", title: "Add to savings", subtitle: "Record money moved into your protected savings.", submit: "Add savings" },
    withdrawal: { eyebrow: "Savings activity", title: "Record a withdrawal", subtitle: "Record money intentionally taken out of savings.", submit: "Record withdrawal" },
    correction: { eyebrow: "Protected correction", title: "Correct recorded balance", subtitle: "Reconcile the tracker only when it differs from the real account.", submit: "Apply correction" },
  }[mode];

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    const form = new FormData(event.currentTarget);
    const detail = String(form.get("details") ?? "").trim();
    const reason = String(form.get("reason") ?? "").trim();
    const note = mode === "correction" ? `${reason}${detail ? `: ${detail}` : ""}` : String(form.get("note") ?? "").trim();
    const payload = mode === "correction"
      ? { kind: mode, targetBalance: toBaseAmount(Number(form.get("targetBalance"))), note }
      : { kind: mode, amount: toBaseAmount(Number(form.get("amount"))), note };
    const response = await fetch("/api/savings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const result = await response.json();
    setPending(false);
    if (!response.ok) { setError(result.error ?? "Unable to update savings."); return; }
    onSaved({ id: result.id, kind: mode });
  }

  return (
    <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="modal-sheet savings-entry-dialog" role="dialog" aria-modal="true" aria-labelledby="savings-entry-title">
        <header>
          <div><p className="eyebrow">{copy.eyebrow}</p><h2 id="savings-entry-title">{copy.title}</h2><p>{copy.subtitle}</p></div>
          <button type="button" className="icon-button" onClick={onClose} aria-label="Close savings editor">x</button>
        </header>
        <form className="modal-form" onSubmit={submit}>
          <div className="savings-current"><span>Current recorded savings</span><strong>{formatCurrency(data.savingsBalance, data.currency)}</strong><small>Calculated from the protected savings ledger</small></div>
          {mode === "correction" ? (
            <>
              <div className="savings-warning"><AlertTriangle size={18} /><div><strong>Use correction only for a genuine recording mistake.</strong><p>This will not erase history. BudgetTracker adds an audited adjustment equal to the difference, and you can undo it immediately.</p></div></div>
              <label className="amount-input"><span>Correct total savings <small>after reconciliation</small></span><div><b>{currencySymbol(data.currency)}</b><input name="targetBalance" type="number" min="0" max="100000000" step="0.01" defaultValue={toDisplayAmount(data.savingsBalance)} required autoFocus /></div></label>
              <label><span>Reason for correction</span><select name="reason" defaultValue="Opening balance was entered incorrectly" required><option>Opening balance was entered incorrectly</option><option>A bank transfer was missing</option><option>A duplicate savings entry was recorded</option><option>Reconciled against a bank statement</option><option>Other verified correction</option></select></label>
              <label><span>Additional details <small>Optional</small></span><textarea name="details" rows={2} maxLength={180} placeholder="What did you verify?" /></label>
            </>
          ) : (
            <>
              <label className="amount-input"><span>{mode === "deposit" ? "Amount added" : "Amount withdrawn"}</span><div><b>{currencySymbol(data.currency)}</b><input name="amount" type="number" min="0.01" max={mode === "withdrawal" ? toDisplayAmount(data.savingsBalance) : 100000000} step="0.01" placeholder="0.00" required autoFocus /></div></label>
              <label><span>Note</span><input name="note" minLength={3} maxLength={280} placeholder={mode === "deposit" ? "e.g. Monthly savings transfer" : "e.g. Emergency fund use"} required /></label>
            </>
          )}
          {error && <p className="form-error">{error}</p>}
          <div className="member-dialog-actions"><button type="button" className="secondary-button" onClick={onClose}>Cancel</button><button className={`primary-button ${mode === "correction" ? "correction-submit" : ""}`} disabled={pending}><span>{pending ? "Saving..." : copy.submit}</span><ArrowRight size={16} /></button></div>
        </form>
      </section>
    </div>
  );
}
export function SettingsView({ data, onSaved, amountsHidden = false, onToggleAmounts }: {
  data: DashboardData; onSaved: (message: string) => void;
  amountsHidden?: boolean; onToggleAmounts?: () => void;
}) {
  const theme = useSyncExternalStore(subscribeTheme, getThemePreference, getServerThemePreference);
  const pickTheme = (next: ThemePreference) => { applyThemePreference(next); };

  // --- Profile ---
  const [profilePending, setProfilePending] = useState(false);
  const [profileMembers, setProfileMembers] = useState(data.members);
  const [profileError, setProfileError] = useState("");
  const [memberEditor, setMemberEditor] = useState<{ mode: "add" | "edit"; member: Member } | null>(null);
  const [memberToRemove, setMemberToRemove] = useState<Member | null>(null);
  const [removedMember, setRemovedMember] = useState<{ member: Member; index: number } | null>(null);

  useEffect(() => {
    if (!removedMember) return;
    const timer = window.setTimeout(() => setRemovedMember(null), 10_000);
    return () => window.clearTimeout(timer);
  }, [removedMember]);

  function newMember(): Member {
    return {
      id: crypto.randomUUID(), name: "", initials: "", color: memberColors[profileMembers.length % memberColors.length],
      relationship: "relative", budgetRole: "contributor", email: "", monthlyContribution: 0,
      transactionCount: 0, activeBillCount: 0, monthIncome: 0, monthExpense: 0,
    };
  }

  function openAddMember() {
    if (profileMembers.length >= 12) return;
    setMemberEditor({ mode: "add", member: newMember() });
    setProfileError("");
  }

  function saveMember(member: Member) {
    if (
      memberEditor?.mode === "edit" && memberEditor.member.budgetRole === "owner" &&
      member.budgetRole !== "owner" && profileMembers.filter((item) => item.budgetRole === "owner").length === 1
    ) {
      setProfileError("Assign another household owner before changing this member's role.");
      setMemberEditor(null);
      return;
    }
    setProfileMembers((members) => memberEditor?.mode === "add" ? [...members, member] : members.map((item) => item.id === member.id ? member : item));
    setMemberEditor(null);
    setProfileError("");
  }

  function confirmRemoveMember() {
    if (!memberToRemove) return;
    const index = profileMembers.findIndex((member) => member.id === memberToRemove.id);
    if (index < 0) return;
    setProfileMembers((members) => members.filter((member) => member.id !== memberToRemove.id));
    setRemovedMember({ member: memberToRemove, index });
    setMemberToRemove(null);
    setProfileError("");
  }

  function undoRemoveMember() {
    if (!removedMember) return;
    setProfileMembers((members) => {
      if (members.some((member) => member.id === removedMember.member.id)) return members;
      const restored = [...members];
      restored.splice(Math.min(removedMember.index, restored.length), 0, removedMember.member);
      return restored;
    });
    setRemovedMember(null);
  }

  function removalReason(member: Member) {
    if (profileMembers.length === 1) return "At least one household member is required";
    if (member.budgetRole === "owner" && profileMembers.filter((item) => item.budgetRole === "owner").length === 1) return "Assign another household owner before removing this member";
    return "";
  }

  async function submitProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setProfilePending(true); setProfileError("");
    const form = new FormData(event.currentTarget);
    const members = profileMembers.map((member) => ({
      id: member.id, name: member.name.trim(), relationship: member.relationship, budgetRole: member.budgetRole,
      email: member.email, monthlyContribution: member.monthlyContribution,
    }));
    const response = await fetch("/api/settings/profile", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ householdName: form.get("householdName"), members }) });
    const result = await response.json();
    setProfilePending(false);
    if (!response.ok) { setProfileError(result.error ?? "Unable to update profile."); return; }
    setRemovedMember(null);
    onSaved("Household profile updated.");
  }
  // --- Security ---
  const [security, setSecurity] = useState<{ loginEmail: string; allowedEmails: string[] } | null>(null);
  useEffect(() => {
    fetch("/api/settings/security", { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : null))
      .then(setSecurity)
      .catch(() => setSecurity(null));
  }, []);
  const [securityPending, setSecurityPending] = useState(false);
  const [securityError, setSecurityError] = useState("");
  async function submitSecurity(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSecurityPending(true); setSecurityError("");
    const form = new FormData(event.currentTarget);
    const newEmail = String(form.get("newEmail") ?? "").trim();
    const newPassword = String(form.get("newPassword") ?? "");
    const confirmPassword = String(form.get("confirmPassword") ?? "");
    const allowedRaw = String(form.get("allowedEmails") ?? "").trim();
    if (newPassword && newPassword !== confirmPassword) {
      setSecurityError("New passwords do not match."); setSecurityPending(false); return;
    }
    if (!newEmail && !newPassword && !allowedRaw && !security) {
      setSecurityError("Nothing to update."); setSecurityPending(false); return;
    }
    const body: Record<string, unknown> = { currentPassword: form.get("currentPassword") };
    if (newEmail) body.newEmail = newEmail;
    if (newPassword) body.newPassword = newPassword;
    body.allowedEmails = allowedRaw ? allowedRaw.split(/[\n,;]+/).map((item) => item.trim()).filter(Boolean) : [];
    const response = await fetch("/api/settings/security", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const result = await response.json();
    setSecurityPending(false);
    if (!response.ok) { setSecurityError(result.error ?? "Unable to update sign-in details."); return; }
    if (newEmail) setSecurity((current) => (current ? { ...current, loginEmail: newEmail } : current));
    (event.target as HTMLFormElement).reset();
    onSaved("Sign-in details updated.");
  }

  // --- Budget preferences ---
  const [budgetPending, setBudgetPending] = useState(false);
  const [budgetError, setBudgetError] = useState("");
  const [savingsDialog, setSavingsDialog] = useState<SavingsMode | null>(null);
  const [savingsGoalPending, setSavingsGoalPending] = useState(false);
  const [savingsError, setSavingsError] = useState("");
  const [undoSavings, setUndoSavings] = useState<{ id: string; kind: SavingsMode } | null>(null);
  const [savingsToReverse, setSavingsToReverse] = useState<DashboardData["savingsActivity"][number] | null>(null);
  const [reversePending, setReversePending] = useState(false);
  useEffect(() => {
    if (!undoSavings) return;
    const timer = window.setTimeout(() => setUndoSavings(null), 10_000);
    return () => window.clearTimeout(timer);
  }, [undoSavings]);

  const [country, setCountry] = useState(data.country ?? "PH");
  const selectedCountry = countryByCode(country) ?? COUNTRIES[0];
  // Live-rate preview, keyed by target currency: a stale/missing key means "loading".
  const [fxPreview, setFxPreview] = useState<{ target: string; available: boolean; rate?: number; updatedAt?: string | null } | null>(null);
  const isBaseCurrency = selectedCountry.currency === data.baseCurrency;
  useEffect(() => {
    if (selectedCountry.currency === data.baseCurrency) return;
    const target = selectedCountry.currency;
    const controller = new AbortController();
    fetch(`/api/settings/fx?target=${target}`, { cache: "no-store", signal: controller.signal })
      .then((response) => (response.ok ? response.json() : { available: false }))
      .then((quote) => setFxPreview({ ...quote, target }))
      .catch(() => {});
    return () => controller.abort();
  }, [selectedCountry.currency, data.baseCurrency]);
  const previewQuote = fxPreview?.target === selectedCountry.currency ? fxPreview : null;
  const [currencyPending, setCurrencyPending] = useState(false);
  const [currencyError, setCurrencyError] = useState("");
  async function submitCurrency(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setCurrencyPending(true); setCurrencyError("");
    // Only the country/currency changes here; the household's budget stays stored
    // in the base currency and simply displays converted everywhere after this save.
    const response = await fetch("/api/settings", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ monthlyBudget: data.monthlyBudget, reminderEmail: data.reminderEmail, country }) });
    const result = await response.json();
    setCurrencyPending(false);
    if (!response.ok) { setCurrencyError(result.error ?? "Unable to update currency."); return; }
    onSaved(`Currency set to ${selectedCountry.currency} — all amounts now convert automatically.`);
  }
  async function submitBudget(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBudgetPending(true); setBudgetError("");
    const form = new FormData(event.currentTarget);
    // Budget is entered in the current display currency; convert back to base for storage.
    // Currency itself is changed in its own section, so this save leaves it untouched.
    const response = await fetch("/api/settings", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ monthlyBudget: toBaseAmount(Number(form.get("monthlyBudget"))), reminderEmail: form.get("reminderEmail"), country: data.country }) });
    const result = await response.json();
    setBudgetPending(false);
    if (!response.ok) { setBudgetError(result.error ?? "Unable to update budget."); return; }
    onSaved("Budget settings updated.");
  }

  async function submitSavingsGoal(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSavingsGoalPending(true);
    setSavingsError("");
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/savings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ savingsGoal: toBaseAmount(Number(form.get("savingsGoal"))) }),
    });
    const result = await response.json();
    setSavingsGoalPending(false);
    if (!response.ok) { setSavingsError(result.error ?? "Unable to update the savings goal."); return; }
    onSaved("Savings goal updated.");
  }

  function savingsSaved(entry: { id: string; kind: SavingsMode }) {
    setSavingsDialog(null);
    setUndoSavings(entry);
    const message = entry.kind === "correction" ? "Savings correction recorded." : entry.kind === "deposit" ? "Savings deposit recorded." : "Savings withdrawal recorded.";
    onSaved(message);
  }

  async function reverseLastSavingsEntry() {
    if (!undoSavings) return;
    const response = await fetch(`/api/savings/${undoSavings.id}`, { method: "DELETE" });
    const result = await response.json();
    if (!response.ok) {
      setSavingsError(result.error ?? "Unable to undo the savings entry.");
      setUndoSavings(null);
      return;
    }
    setUndoSavings(null);
    onSaved("Savings entry undone. The audit history was preserved.");
  }


  async function reverseSelectedSavingsEntry() {
    if (!savingsToReverse) return;
    setReversePending(true);
    setSavingsError("");
    const response = await fetch(`/api/savings/${savingsToReverse.id}`, { method: "DELETE" });
    const result = await response.json();
    setReversePending(false);
    if (!response.ok) {
      setSavingsError(result.error ?? "Unable to reverse the savings entry.");
      setSavingsToReverse(null);
      return;
    }
    setSavingsToReverse(null);
    onSaved("Savings entry reversed. Its audit record was preserved.");
  }
  const savingsProgress = data.savingsGoal > 0 ? Math.min(100, (data.savingsBalance / data.savingsGoal) * 100) : 0;

  const [section, setSection] = useState<string | null>(null);

  return (
    <SettingsNav.Provider value={{ active: section, open: setSection, close: () => setSection(null) }}>
    <section className="page-section">
      <div className="page-intro">
        <div><p className="eyebrow">Your household</p><h2>Settings</h2><span>{section === null ? "Appearance, profile, budget, protected savings, and sign-in security." : "Choose a section, or tap Settings to go back."}</span></div>
      </div>

      <div className={section === null ? "settings-menu" : "settings-detail-wrap"}>
        <SettingsCard section="appearance" icon={Sun} title="Appearance" subtitle="Theme and balance privacy on this device.">
          <div className="theme-picker" role="radiogroup" aria-label="Theme">
            {themeOptions.map(({ id, label, icon: Icon }) => (
              <button key={id} type="button" role="radio" aria-checked={theme === id} className={theme === id ? "selected" : ""} onClick={() => pickTheme(id)}>
                <Icon size={17} /><span>{label}</span>{theme === id && <Check size={14} className="theme-check" />}
              </button>
            ))}
          </div>
          <p className="settings-hint">System follows your phone&apos;s light or dark mode automatically.</p>
          {onToggleAmounts && (
            <div className="toggle-row">
              <div className="toggle-copy">
                <span className="toggle-icon">{amountsHidden ? <EyeOff size={16} /> : <Eye size={16} />}</span>
                <div><strong>Hide balances</strong><p>Mask &ldquo;Available to plan&rdquo; and monthly income as ₱ •••••• on this device. Only this switch can reveal them.</p></div>
              </div>
              <button type="button" role="switch" aria-checked={amountsHidden} className={`switch ${amountsHidden ? "on" : ""}`} onClick={onToggleAmounts} aria-label="Hide balances"><i /></button>
            </div>
          )}
        </SettingsCard>

        <SettingsCard section="profile" icon={UsersRound} title="Household profile" subtitle="Names, members, relationships, and contribution goals.">
          <form onSubmit={submitProfile} className="modal-form settings-form">
            <label><span>Household name</span><input name="householdName" defaultValue={data.householdName} minLength={2} maxLength={60} required /></label>
            <div className="member-editor">
              <div className="member-editor-head"><div><strong>Household members</strong><span>Relationship, planning role, activity, and contribution goals.</span></div><small>{profileMembers.length} of 12</small></div>
              <div className="member-roster">
                {profileMembers.map((member) => {
                  const contributionProgress = member.monthlyContribution > 0 ? Math.min(100, (member.monthIncome / member.monthlyContribution) * 100) : 0;
                  const removeReason = removalReason(member);
                  return (
                    <div className="member-row" key={member.id}>
                      <span className="member-avatar" style={{ background: member.color }}>{member.name.trim().slice(0, 2).toUpperCase() || "?"}</span>
                      <div className="member-summary">
                        <div className="member-name-line"><strong>{member.name}</strong><span>{relationshipLabels[member.relationship]}</span><span>{budgetRoleLabels[member.budgetRole]}</span></div>
                        <p>{member.transactionCount} transaction{member.transactionCount === 1 ? "" : "s"} · {member.activeBillCount} unpaid bill{member.activeBillCount === 1 ? "" : "s"}</p>
                        {member.monthlyContribution > 0 && <div className="member-contribution"><span>{formatCurrency(member.monthIncome, data.currency)} of {formatCurrency(member.monthlyContribution, data.currency)} income target</span><i><b style={{ width: String(contributionProgress) + "%" }} /></i></div>}
                      </div>
                      <div className="member-row-actions">
                        <button type="button" className="icon-button" onClick={() => setMemberEditor({ mode: "edit", member })} title={"Edit " + member.name} aria-label={"Edit " + member.name}><Pencil size={14} /></button>
                        <button type="button" className="icon-button member-remove" onClick={() => setMemberToRemove(member)} disabled={Boolean(removeReason)} title={removeReason || "Remove " + member.name} aria-label={"Remove " + member.name}><Trash2 size={14} /></button>
                      </div>
                    </div>
                  );
                })}
              </div>
              <button type="button" className="member-add" onClick={openAddMember} disabled={profileMembers.length >= 12}><UserPlus size={16} /><span>Add household member</span><small>{12 - profileMembers.length} available</small></button>
            </div>
            <p className="settings-hint">Historical activity is retained when a member leaves, keeping reports and audit history accurate.</p>
            {profileError && <p className="form-error">{profileError}</p>}
            <button className="primary-button settings-submit" disabled={profilePending}><span>{profilePending ? "Saving..." : "Save profile"}</span><ArrowRight size={16} /></button>
          </form>
        </SettingsCard>
        <SettingsCard section="currency" icon={Globe} title="Currency & region" subtitle="Pick a country — every amount auto-converts at live rates.">
          <form onSubmit={submitCurrency} className="modal-form settings-form">
            <label><span>Country &amp; currency</span>
              <select value={country} onChange={(event) => setCountry(event.target.value)} aria-label="Country and currency">
                {COUNTRIES.map((option) => <option key={option.code} value={option.code}>{option.flag} {option.name}</option>)}
              </select>
            </label>
            <div className="currency-preview">
              <span className="currency-badge">{currencySymbol(selectedCountry.currency)}</span>
              <div>
                <strong>{selectedCountry.currencyName} ({selectedCountry.currency})</strong>
                <p>
                  {isBaseCurrency
                    ? "Your base currency — amounts show exactly as recorded."
                    : previewQuote === null
                      ? "Fetching live exchange rate..."
                      : previewQuote.available && previewQuote.rate
                        ? `Live rate: 1 ${data.baseCurrency} = ${previewQuote.rate.toFixed(4)} ${selectedCountry.currency}. Every amount across the app — including your monthly budget — converts automatically at today's market rate${previewQuote.updatedAt ? ` (updated ${new Date(previewQuote.updatedAt).toLocaleDateString("en-PH", { month: "short", day: "numeric" })})` : ""}.`
                        : "Live rate unavailable right now — amounts will stay in your base currency until it can be fetched."}
                </p>
              </div>
            </div>
            <p className="settings-hint">Your records are always stored in {data.baseCurrency}; changing this only converts what you see — no data is rewritten.</p>
            {currencyError && <p className="form-error">{currencyError}</p>}
            <button className="primary-button settings-submit" disabled={currencyPending}><span>{currencyPending ? "Saving..." : "Save currency"}</span><ArrowRight size={16} /></button>
          </form>
        </SettingsCard>

        <SettingsCard section="budget" icon={Wallet} title="Budget & reminders" subtitle="Monthly plan and where bill emails go.">
          <form onSubmit={submitBudget} className="modal-form settings-form">
            <label className="amount-input"><span>Monthly household budget <small>in {data.currency}</small></span><div><b>{currencySymbol(data.currency)}</b><input name="monthlyBudget" type="number" min="1" step="any" defaultValue={toDisplayAmount(data.monthlyBudget)} required /></div></label>
            <label><span>Bill reminder emails <small>Separate multiple with commas</small></span><input name="reminderEmail" type="text" defaultValue={data.reminderEmail} placeholder="you@gmail.com, partner@gmail.com" required /></label>
            {budgetError && <p className="form-error">{budgetError}</p>}
            <button className="primary-button settings-submit" disabled={budgetPending}><span>{budgetPending ? "Saving..." : "Save budget"}</span><ArrowRight size={16} /></button>
          </form>
        </SettingsCard>

        <SettingsCard section="savings" icon={PiggyBank} title="Savings vault" subtitle="Track protected savings separately from everyday spending.">
          <div className="savings-vault">
            <div className="savings-vault-total">
              <div><span>Recorded total savings</span><strong>{amountsHidden ? maskedAmount(data.currency) : formatCurrency(data.savingsBalance, data.currency)}</strong><small><LockKeyhole size={11} />Ledger protected</small></div>
              <div className="savings-goal-ring" style={{ "--savings-progress": `${savingsProgress * 3.6}deg` } as React.CSSProperties}><span>{data.savingsGoal > 0 ? `${Math.round(savingsProgress)}%` : "Set"}</span><small>goal</small></div>
            </div>
            <div className="savings-progress"><i><b style={{ width: `${savingsProgress}%` }} /></i><div><span>{data.savingsGoal > 0 ? `${formatCurrency(data.savingsBalance, data.currency)} saved` : "No savings goal yet"}</span><strong>{data.savingsGoal > 0 ? formatCurrency(data.savingsGoal, data.currency) : "Add a target below"}</strong></div></div>
            <div className="savings-actions">
              <button type="button" onClick={() => setSavingsDialog("deposit")}><span className="savings-action-icon add"><ArrowDownToLine size={17} /></span><span><strong>Add savings</strong><small>Deposit or transfer</small></span></button>
              <button type="button" onClick={() => setSavingsDialog("withdrawal")} disabled={data.savingsBalance <= 0}><span className="savings-action-icon out"><ArrowUpFromLine size={17} /></span><span><strong>Withdraw</strong><small>Record money taken out</small></span></button>
            </div>
            <button type="button" className="savings-correct" onClick={() => setSavingsDialog("correction")}><LockKeyhole size={15} /><span><strong>Correct recorded balance</strong><small>For verified mistakes only - reason and audit entry required</small></span><ArrowRight size={15} /></button>
          </div>
          <form className="savings-goal-form" onSubmit={submitSavingsGoal}>
            <label className="amount-input"><span>Savings goal <small>Optional</small></span><div><b>{currencySymbol(data.currency)}</b><input key={data.savingsGoal} name="savingsGoal" type="number" min="0" max="100000000" step="any" defaultValue={toDisplayAmount(data.savingsGoal) || ""} placeholder="Set a target" /></div></label>
            <button className="secondary-button" disabled={savingsGoalPending}>{savingsGoalPending ? "Saving..." : "Save goal"}</button>
          </form>
          {savingsError && <p className="form-error">{savingsError}</p>}
          <div className="savings-activity">
            <header><div><History size={14} /><strong>Recent savings activity</strong></div><small>Audit trail</small></header>
            {data.savingsActivity.length === 0 ? <div className="savings-empty"><PiggyBank size={18} /><span>No savings entries yet. Add your real opening balance using the protected correction flow.</span></div> : data.savingsActivity.map((entry) => (
              <div className="savings-activity-row" key={entry.id}>
                <span className={`savings-activity-icon ${entry.kind}`}>{entry.kind === "deposit" ? <ArrowDownToLine size={13} /> : entry.kind === "withdrawal" ? <ArrowUpFromLine size={13} /> : <LockKeyhole size={13} />}</span>
                <div><strong>{entry.note}</strong><small>{entry.kind === "correction" ? "Balance correction" : entry.kind === "deposit" ? "Savings added" : "Savings withdrawal"} - {formatDate(entry.createdAt, { month: "short", day: "numeric", year: undefined })}</small></div>
                <b className={entry.amount >= 0 ? "positive" : "negative"}>{entry.amount >= 0 ? "+" : "-"}{formatCurrency(Math.abs(entry.amount), data.currency)}</b>
                <button type="button" className="savings-reverse" onClick={() => setSavingsToReverse(entry)} title="Reverse entry" aria-label={`Reverse ${entry.note}`}><RotateCcw size={12} /></button>
              </div>
            ))}
          </div>
          <div className="settings-note savings-policy"><ShieldCheck size={17} /><div><strong>Your total is calculated, not freely editable.</strong><p>Use Add savings or Withdraw for normal activity. Correct balance is reserved for reconciling a genuine mistake and always leaves an audit record.</p></div></div>
        </SettingsCard>

        <SettingsCard section="categories" icon={Tags} title="Categories" subtitle="Add, rename, recolor, or remove categories.">
          <CategoryManager categories={data.categories} onSaved={onSaved} />
        </SettingsCard>

        <SettingsCard section="security" icon={ShieldCheck} title="Sign-in & security" subtitle="Login email, password, and allowed accounts.">
          <form onSubmit={submitSecurity} className="modal-form settings-form">
            <div className="current-login"><KeyRound size={15} /><span>Current login: <strong>{security ? security.loginEmail : "loading..."}</strong></span></div>
            <label><span>New login email <small>Optional</small></span><input name="newEmail" type="email" placeholder={security?.loginEmail ?? "you@example.com"} /></label>
            <div className="form-grid">
              <label><span>New password <small>Optional</small></span><input name="newPassword" type="password" minLength={10} placeholder="At least 10 characters" autoComplete="new-password" /></label>
              <label><span>Confirm new password</span><input name="confirmPassword" type="password" autoComplete="new-password" /></label>
            </div>
            <label><span>Also allow sign-in from <small>Google / Facebook emails, comma-separated</small></span><textarea name="allowedEmails" rows={2} placeholder="partner@gmail.com" defaultValue={security?.allowedEmails.join(", ") ?? ""} key={security ? "loaded" : "loading"} /></label>
            <label><span>Current password <small>Required to save changes</small></span><input name="currentPassword" type="password" minLength={8} autoComplete="current-password" required /></label>
            {securityError && <p className="form-error">{securityError}</p>}
            <button className="primary-button settings-submit" disabled={securityPending}><span>{securityPending ? "Saving..." : "Update sign-in"}</span><ArrowRight size={16} /></button>
          </form>
        </SettingsCard>

        <SettingsCard section="danger" tone="danger" icon={AlertTriangle} title="Danger zone" subtitle="Permanently delete this household and all its data.">
          <div className="danger-card-body"><DangerZone householdName={data.householdName} /></div>
        </SettingsCard>
      </div>

      {memberEditor && <MemberProfileDialog key={memberEditor.mode + "-" + memberEditor.member.id} mode={memberEditor.mode} member={memberEditor.member} currency={data.currency} onClose={() => setMemberEditor(null)} onSave={saveMember} />}
      <DestructiveActionDialog
        open={Boolean(memberToRemove)}
        title={memberToRemove ? "Remove " + memberToRemove.name + "?" : "Remove household member?"}
        description="This removes the member from the active household roster. Their financial history will not be erased."
        impacts={memberToRemove ? [
          memberToRemove.name + " will no longer be available for new transactions or bills.",
          String(memberToRemove.transactionCount) + " existing transaction" + (memberToRemove.transactionCount === 1 ? "" : "s") + " and " + String(memberToRemove.activeBillCount) + " unpaid bill" + (memberToRemove.activeBillCount === 1 ? "" : "s") + " will remain safely attached for reporting.",
          "The change takes effect when you save the household profile.",
        ] : []}
        confirmLabel="Remove member"
        onCancel={() => setMemberToRemove(null)}
        onConfirm={confirmRemoveMember}
      />
      {removedMember && <UndoToast message={removedMember.member.name + " removed from the roster."} onUndo={undoRemoveMember} />}
      {savingsDialog && <SavingsEntryDialog data={data} mode={savingsDialog} onClose={() => setSavingsDialog(null)} onSaved={savingsSaved} />}
      {undoSavings && <UndoToast message={undoSavings.kind === "correction" ? "Savings correction recorded." : "Savings entry recorded."} onUndo={reverseLastSavingsEntry} />}
      {savingsToReverse && (
        <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && !reversePending && setSavingsToReverse(null)}>
          <section className="modal-sheet savings-reverse-dialog" role="alertdialog" aria-modal="true" aria-labelledby="savings-reverse-title">
            <header><div><p className="eyebrow">Audit protection</p><h2 id="savings-reverse-title">Reverse this savings entry?</h2><p>The original record will remain in the financial audit trail.</p></div><button type="button" className="icon-button" onClick={() => setSavingsToReverse(null)} disabled={reversePending} aria-label="Close reversal warning">x</button></header>
            <div className="destructive-body">
              <p className="destructive-description"><strong>{savingsToReverse.note}</strong> will no longer be included in your recorded savings total.</p>
              <div className="savings-reverse-impact"><div><span>Current savings</span><strong>{formatCurrency(data.savingsBalance, data.currency)}</strong></div><ArrowRight size={16} /><div><span>After reversal</span><strong>{formatCurrency(Math.max(0, data.savingsBalance - savingsToReverse.amount), data.currency)}</strong></div></div>
              <div className="savings-warning"><AlertTriangle size={18} /><div><strong>This changes reports immediately.</strong><p>The entry is marked as reversed rather than deleted, preserving a reliable audit trail.</p></div></div>
            </div>
            <footer className="destructive-actions"><button type="button" className="secondary-button" onClick={() => setSavingsToReverse(null)} disabled={reversePending}>Keep entry</button><button type="button" className="danger-button" onClick={reverseSelectedSavingsEntry} disabled={reversePending}>{reversePending ? "Reversing..." : "Reverse entry"}</button></footer>
          </section>
        </div>
      )}
    </section>
    </SettingsNav.Provider>
  );
}
