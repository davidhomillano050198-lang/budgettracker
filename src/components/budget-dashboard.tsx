"use client";

import Image from "next/image";
import dynamic from "next/dynamic";
import {
  ArrowDownLeft, ArrowRight, ArrowUpRight, Banknote, BellRing, CalendarDays, Check, ChevronDown, ChevronRight, ChevronUp,
  CircleDollarSign, Clock3, CreditCard, Download, Gauge, Landmark, LayoutDashboard, LogOut,
  Mail, Menu, Pencil, Plus, ReceiptText, Search, Settings2, Smartphone, Target,
  TrendingUp, Trash2, X,
} from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BudgetAllocations } from "@/components/budget-allocations";
import { DestructiveActionDialog, UndoToast } from "@/components/destructive-action";
import { currencyUnit } from "@/lib/currencies";
import { currencySymbol, formatCurrency, formatDate, formatRelativeDueDate, maskedAmount, setDisplayFxRate, toBaseAmount, toDisplayAmount } from "@/lib/format";
import type { BillItem, Category, DashboardData, HealthStatus, Member, PaymentMethod, TransactionItem } from "@/lib/types";
const CashFlowExplorer = dynamic(
  () => import("@/components/cash-flow-explorer").then((module) => module.CashFlowExplorer),
  {
    loading: () => (
      <div className="cash-flow-loading" role="status" aria-label="Loading cash flow intelligence">
        <span /><span /><span /><span />
      </div>
    ),
  },
);
const SettingsView = dynamic(() => import("@/components/settings-view").then((module) => module.SettingsView));

type View = "overview" | "transactions" | "bills" | "budget" | "settings";
type Modal = "transaction" | "bill" | "settings" | null;

const paymentMethods: Array<{ id: PaymentMethod; label: string; icon: typeof Banknote }> = [
  { id: "cash", label: "Cash", icon: Banknote },
  { id: "card", label: "Card", icon: CreditCard },
  { id: "bank", label: "Bank", icon: Landmark },
  { id: "ewallet", label: "E-wallet", icon: Smartphone },
];

const paymentLabel = (method: PaymentMethod) => paymentMethods.find((option) => option.id === method)?.label ?? "Cash";

function toLocalInput(iso: string) {
  const date = new Date(iso);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}

const navItems: Array<{ id: View; label: string; icon: typeof LayoutDashboard }> = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "transactions", label: "Transactions", icon: ReceiptText },
  { id: "bills", label: "Bills & reminders", icon: CalendarDays },
  { id: "budget", label: "Budget plan", icon: Target },
  { id: "settings", label: "Settings", icon: Settings2 },
];

const statusIcon: Record<HealthStatus, typeof Check> = { healthy: Check, watch: Clock3, over: TrendingUp };

/**
 * Count-up money display: animates 0 → value on first paint, then eases
 * between values whenever the amount changes (refresh, member lens, FX).
 * Renders the final value when masked or when the user prefers reduced motion.
 */
function AnimatedAmount({ value, currency, masked }: { value: number; currency: string; masked: boolean }) {
  const reduceMotion = useReducedMotion();
  const [display, setDisplay] = useState(() => formatCurrency(value, currency));
  const previous = useRef(0);
  useEffect(() => {
    if (masked || reduceMotion) { previous.current = value; return; }
    const from = previous.current;
    const to = value;
    previous.current = to;
    // Hidden tabs never fire rAF, so skip straight to the settle timer there.
    const hidden = document.visibilityState === "hidden";
    const duration = hidden ? 0 : from === 0 ? 1100 : 650;
    let frame = 0;
    if (!hidden && from !== to) {
      const start = performance.now();
      const easeOutQuart = (t: number) => 1 - Math.pow(1 - t, 4);
      const tick = (now: number) => {
        const progress = Math.min(1, (now - start) / duration);
        setDisplay(formatCurrency(from + (to - from) * easeOutQuart(progress), currency));
        if (progress < 1) frame = requestAnimationFrame(tick);
      };
      frame = requestAnimationFrame(tick);
    }
    // Guaranteed convergence: whatever happens to the animation frames
    // (throttling, hidden tab), the final value always lands.
    const settle = window.setTimeout(() => setDisplay(formatCurrency(to, currency)), duration + 100);
    return () => { cancelAnimationFrame(frame); window.clearTimeout(settle); };
  }, [value, currency, masked, reduceMotion]);
  if (masked) return <>{maskedAmount(currency)}</>;
  if (reduceMotion) return <>{formatCurrency(value, currency)}</>;
  return <>{display}</>;
}

function SectionHeading({ eyebrow, title, action }: { eyebrow?: string; title: string; action?: React.ReactNode }) {
  return <div className="section-heading"><div>{eyebrow && <p>{eyebrow}</p>}<h2>{title}</h2></div>{action}</div>;
}

function CategoryBars({ data, currency }: { data: DashboardData["categorySpend"]; currency: string }) {
  if (!data.length) return <div className="empty-state"><ReceiptText size={22} /><p>No expenses this month.</p></div>;
  return (
    <div className="category-list">
      {data.slice(0, 5).map((category, index) => (
        <motion.div className="category-row" key={category.id} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: index * 0.045 }}>
          <div className="category-meta"><span className="category-dot" style={{ background: category.color }} /><span>{category.name}</span><strong>{formatCurrency(category.amount, currency)}</strong></div>
          <div className="category-track"><span style={{ width: `${Math.max(3, category.percentage)}%`, background: category.color }} /></div>
        </motion.div>
      ))}
    </div>
  );
}

function TransactionList({ data, limit }: { data: DashboardData; limit?: number }) {
  const transactions = limit ? data.recentTransactions.slice(0, limit) : data.recentTransactions;
  return (
    <div className="transaction-list">
      {transactions.map((transaction) => (
        <div className="transaction-row" key={transaction.id}>
          <div className={`transaction-symbol ${transaction.type}`}>
            {transaction.type === "income" ? <ArrowDownLeft size={17} /> : <ArrowUpRight size={17} />}
          </div>
          <div className="transaction-main"><strong>{transaction.note}</strong><span>{transaction.category.name} · {transaction.member.name}</span></div>
          <div className="transaction-date"><span>{formatDate(transaction.occurredAt, { month: "short", day: "numeric" })}</span><small>{formatDate(transaction.occurredAt, { hour: "numeric", minute: "2-digit", month: undefined, day: undefined, year: undefined })}</small></div>
          <strong className={`transaction-amount ${transaction.type}`}>{transaction.type === "income" ? "+" : "-"}{formatCurrency(transaction.amount, data.currency)}</strong>
        </div>
      ))}
    </div>
  );
}

function BillsList({ data, onPay, expanded = false }: { data: DashboardData; onPay: (bill: BillItem) => void; expanded?: boolean }) {
  const bills = expanded ? data.bills : data.bills.slice(0, 4);
  if (!bills.length) return <div className="empty-state"><Check size={22} /><p>No upcoming bills. You are all caught up.</p></div>;
  return (
    <div className="bill-list">
      {bills.map((bill) => {
        const urgent = bill.status === "overdue" || formatRelativeDueDate(bill.dueDate).includes("today");
        return (
          <div className="bill-row" key={bill.id}>
            <div className={`bill-date ${urgent ? "urgent" : ""}`}><span>{formatDate(`${bill.dueDate}T00:00:00+08:00`, { month: "short" })}</span><strong>{formatDate(`${bill.dueDate}T00:00:00+08:00`, { day: "2-digit", month: undefined, year: undefined })}</strong></div>
            <div className="bill-main"><strong>{bill.name}</strong><span className={urgent ? "urgent-text" : ""}>{formatRelativeDueDate(bill.dueDate)} · {bill.recurrence}</span></div>
            <strong className="bill-amount">{formatCurrency(bill.amount, data.currency)}</strong>
            <button className="secondary-button compact" onClick={() => onPay(bill)}><Check size={15} />Pay</button>
          </div>
        );
      })}
    </div>
  );
}

function CategoryPicker({ categories, value, onChange }: { categories: Category[]; value: string; onChange: (value: string) => void }) {
  return (
    <div className="category-picker">
      {categories.map((category) => (
        <button type="button" key={category.id} className={value === category.id ? "selected" : ""} onClick={() => onChange(category.id)}>
          <span style={{ background: `${category.color}1F`, color: category.color }}><CircleDollarSign size={17} /></span>{category.name}
        </button>
      ))}
    </div>
  );
}

function TransactionModal({ data, editing, onClose, onSaved }: { data: DashboardData; editing?: TransactionItem | null; onClose: () => void; onSaved: (message: string) => void }) {
  const isEdit = Boolean(editing);
  const [type, setType] = useState<"expense" | "income">(editing?.type ?? "expense");
  const available = useMemo(() => data.categories.filter((category) => category.kind === type), [data.categories, type]);
  const [categoryId, setCategoryId] = useState(editing?.category.id ?? data.categories.find((category) => category.kind === "expense")?.id ?? "");
  const [method, setMethod] = useState<PaymentMethod>(editing?.paymentMethod ?? "cash");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const switchType = (next: "expense" | "income") => { setType(next); setCategoryId(data.categories.find((category) => category.kind === next)?.id ?? ""); };

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setPending(true); setError("");
    const form = new FormData(event.currentTarget);
    const localDate = String(form.get("occurredAt"));
    const body = JSON.stringify({
      type, categoryId, paymentMethod: method, amount: toBaseAmount(Number(form.get("amount"))), memberId: form.get("memberId"),
      note: form.get("note"), occurredAt: new Date(localDate).toISOString(),
    });
    const response = await fetch(isEdit ? `/api/transactions/${editing!.id}` : "/api/transactions", {
      method: isEdit ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body,
    });
    const result = await response.json();
    if (!response.ok) { setError(result.error ?? "Unable to save transaction."); setPending(false); return; }
    onSaved(isEdit ? "Transaction updated." : "Transaction added.");
  }

  const [defaultDate] = useState(() => (editing ? toLocalInput(editing.occurredAt) : toLocalInput(new Date().toISOString())));
  return (
    <ModalShell title={isEdit ? "Edit transaction" : "Add transaction"} subtitle={isEdit ? "Update the details of this entry." : "Record money moving in or out."} onClose={onClose}>
      <form onSubmit={submit} className="modal-form">
        <div className="segmented-control"><button type="button" className={type === "expense" ? "active" : ""} onClick={() => switchType("expense")}><ArrowUpRight size={16} />Expense</button><button type="button" className={type === "income" ? "active" : ""} onClick={() => switchType("income")}><ArrowDownLeft size={16} />Income</button></div>
        <label className="amount-input"><span>Amount</span><div><b>{currencySymbol(data.currency)}</b><input name="amount" type="number" min="0.01" step="0.01" placeholder="0.00" defaultValue={editing ? toDisplayAmount(editing.amount) : undefined} autoFocus required /></div></label>
        <fieldset><legend>Category</legend><CategoryPicker categories={available} value={categoryId} onChange={setCategoryId} /></fieldset>
        <fieldset><legend>Paid with</legend><div className="method-picker">{paymentMethods.map(({ id, label, icon: Icon }) => <button type="button" key={id} className={method === id ? "selected" : ""} onClick={() => setMethod(id)}><Icon size={15} />{label}</button>)}</div></fieldset>
        <div className="form-grid"><label><span>{type === "expense" ? "Spent by" : "Received by"}</span><select name="memberId" defaultValue={editing?.member.id ?? data.members[0]?.id}>{data.members.map((member) => <option key={member.id} value={member.id}>{member.name}</option>)}</select></label><label><span>Date & time</span><input name="occurredAt" type="datetime-local" defaultValue={defaultDate} required /></label></div>
        <label><span>Comment</span><textarea name="note" placeholder={type === "expense" ? "What was this for?" : "Where did this come from?"} defaultValue={editing?.note} maxLength={280} required /></label>
        {error && <p className="form-error">{error}</p>}
        <button className="primary-button modal-submit" disabled={pending}><span>{pending ? "Saving..." : isEdit ? "Save changes" : `Add ${type}`}</span><ArrowRight size={17} /></button>
      </form>
    </ModalShell>
  );
}

function BillModal({ data, onClose, onSaved }: { data: DashboardData; onClose: () => void; onSaved: () => void }) {
  const expenses = data.categories.filter((category) => category.kind === "expense");
  const [categoryId, setCategoryId] = useState(expenses.find((category) => category.id === "home")?.id ?? expenses[0]?.id ?? "");
  const [pending, setPending] = useState(false); const [error, setError] = useState("");
  const [nextWeek] = useState(() => new Date(new Date().getTime() + 7 * 86_400_000).toISOString().slice(0, 10));
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setPending(true); setError(""); const form = new FormData(event.currentTarget);
    const response = await fetch("/api/bills", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({
      name: form.get("name"), amount: toBaseAmount(Number(form.get("amount"))), dueDate: form.get("dueDate"), recurrence: form.get("recurrence"), memberId: form.get("memberId"), categoryId, note: form.get("note"), reminderDays: [7, 3, 1, 0],
    }) });
    const result = await response.json();
    if (!response.ok) { setError(result.error ?? "Unable to save bill."); setPending(false); return; }
    onSaved();
  }
  return (
    <ModalShell title="Add a bill" subtitle="We will keep it separate from daily spending." onClose={onClose}>
      <form onSubmit={submit} className="modal-form">
        <div className="form-grid"><label><span>Bill name</span><input name="name" placeholder="Electricity" autoFocus required /></label><label><span>Amount</span><input name="amount" type="number" min="1" step="0.01" placeholder="0.00" required /></label></div>
        <fieldset><legend>Category</legend><CategoryPicker categories={expenses} value={categoryId} onChange={setCategoryId} /></fieldset>
        <div className="form-grid"><label><span>Due date</span><input name="dueDate" type="date" defaultValue={nextWeek} required /></label><label><span>Repeats</span><select name="recurrence" defaultValue="monthly"><option value="once">One time</option><option value="monthly">Monthly</option><option value="quarterly">Quarterly</option><option value="yearly">Yearly</option></select></label></div>
        <div className="form-grid"><label><span>Managed by</span><select name="memberId" defaultValue={data.members[0]?.id}>{data.members.map((member) => <option key={member.id} value={member.id}>{member.name}</option>)}</select></label><label><span>Email schedule</span><div className="read-only-field"><BellRing size={15} />7, 3, 1 days + due date</div></label></div>
        <label><span>Note <small>Optional</small></span><textarea name="note" placeholder="Account number or payment details" maxLength={280} /></label>
        {error && <p className="form-error">{error}</p>}
        <button className="primary-button modal-submit" disabled={pending}><span>{pending ? "Saving..." : "Add bill"}</span><ArrowRight size={17} /></button>
      </form>
    </ModalShell>
  );
}

function SettingsModal({ data, onClose, onSaved }: { data: DashboardData; onClose: () => void; onSaved: () => void }) {
  const [pending, setPending] = useState(false); const [error, setError] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setPending(true); setError(""); const form = new FormData(event.currentTarget);
    const response = await fetch("/api/settings", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ monthlyBudget: toBaseAmount(Number(form.get("monthlyBudget"))), reminderEmail: form.get("reminderEmail") }) });
    const result = await response.json(); if (!response.ok) { setError(result.error ?? "Unable to update settings."); setPending(false); return; } onSaved();
  }
  return (
    <ModalShell title="Budget settings" subtitle="Adjust the monthly plan and reminder destination." onClose={onClose}>
      <form onSubmit={submit} className="modal-form">
        <label className="amount-input"><span>Monthly household budget</span><div><b>{currencySymbol(data.currency)}</b><input name="monthlyBudget" type="number" min="1" step="any" defaultValue={toDisplayAmount(data.monthlyBudget)} required /></div></label>
        <label><span>Bill reminder email</span><input name="reminderEmail" type="email" defaultValue={data.reminderEmail} required /></label>
        <div className="settings-note"><Mail size={18} /><div><strong>Reminder schedule</strong><p>Bill emails run at 8:00 AM Manila time when the production cron is connected.</p></div></div>
        {error && <p className="form-error">{error}</p>}
        <button className="primary-button modal-submit" disabled={pending}><span>{pending ? "Updating..." : "Save changes"}</span><ArrowRight size={17} /></button>
      </form>
    </ModalShell>
  );
}

function ModalShell({ title, subtitle, children, onClose }: { title: string; subtitle: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <motion.div className="modal-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <motion.section className="modal-sheet" role="dialog" aria-modal="true" aria-label={title} initial={{ opacity: 0, y: 24, scale: 0.985 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 16, scale: 0.99 }}>
        <header><div><h2>{title}</h2><p>{subtitle}</p></div><button className="icon-button" onClick={onClose} title="Close"><X size={19} /></button></header>{children}
      </motion.section>
    </motion.div>
  );
}

function MemberFilter({ members, value, onChange, label }: {
  members: Member[]; value: string; onChange: (value: string) => void; label: string;
}) {
  return (
    <div className="member-filter" role="radiogroup" aria-label={label}>
      <button type="button" role="radio" aria-checked={value === ""} className={value === "" ? "active" : ""} onClick={() => onChange("")}>Everyone</button>
      {members.map((member) => (
        <button type="button" role="radio" aria-checked={value === member.id} key={member.id} className={value === member.id ? "active" : ""} onClick={() => onChange(member.id)}>
          {member.name}
        </button>
      ))}
    </div>
  );
}

const PAGE_SIZE = 20;

const dateRangeOptions = [
  { id: "all", label: "All time" },
  { id: "today", label: "Today" },
  { id: "7d", label: "Last 7 days" },
  { id: "30d", label: "Last 30 days" },
  { id: "90d", label: "Last 90 days" },
  { id: "month", label: "This month" },
  { id: "lastmonth", label: "Last month" },
];

function dateRangeWindow(range: string): { from?: string; to?: string } {
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  switch (range) {
    case "today": return { from: startOfDay.toISOString() };
    case "7d": return { from: new Date(startOfDay.getTime() - 6 * 86_400_000).toISOString() };
    case "30d": return { from: new Date(startOfDay.getTime() - 29 * 86_400_000).toISOString() };
    case "90d": return { from: new Date(startOfDay.getTime() - 89 * 86_400_000).toISOString() };
    case "month": return { from: new Date(now.getFullYear(), now.getMonth(), 1).toISOString() };
    case "lastmonth": return {
      from: new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString(),
      to: new Date(now.getFullYear(), now.getMonth(), 1).toISOString(),
    };
    default: return {};
  }
}

function TransactionsView({ data, reloadKey, onEdit, onDelete, onAdd }: {
  data: DashboardData; reloadKey: number;
  onEdit: (transaction: TransactionItem) => void;
  onDelete: (transaction: TransactionItem) => void;
  onAdd: () => void;
}) {
  const [items, setItems] = useState<TransactionItem[]>(data.recentTransactions);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [type, setType] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [memberId, setMemberId] = useState("");
  const [dateRange, setDateRange] = useState("all");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const panelRef = useRef<HTMLElement>(null);
  const collapseList = () => {
    setVisibleCount(PAGE_SIZE);
    panelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  // Exports the FULL filtered set (not just the visible page), in the
  // display currency, with proper CSV quoting for free-text notes.
  const exportCsv = () => {
    const quote = (value: string) => `"${value.replace(/"/g, '""')}"`;
    const lines = [
      `Date,Time,Type,Category,Member,Payment method,Note,Amount (${data.currency})`,
      ...items.map((t) => [
        formatDate(t.occurredAt, { year: "numeric", month: "short", day: "numeric" }),
        formatDate(t.occurredAt, { hour: "numeric", minute: "2-digit", month: undefined, day: undefined, year: undefined }),
        t.type,
        quote(t.category.name),
        quote(t.member.name),
        paymentLabel(t.paymentMethod),
        quote(t.note),
        `${t.type === "expense" ? "-" : ""}${toDisplayAmount(t.amount)}`,
      ].join(",")),
    ];
    const link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob(["﻿" + lines.join("\n")], { type: "text/csv;charset=utf-8" }));
    link.download = `budgettracker-transactions-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoading(true);
      const params = new URLSearchParams();
      if (search.trim()) params.set("search", search.trim());
      if (type) params.set("type", type);
      if (categoryId) params.set("categoryId", categoryId);
      if (memberId) params.set("memberId", memberId);
      const window_ = dateRangeWindow(dateRange);
      if (window_.from) params.set("from", window_.from);
      if (window_.to) params.set("to", window_.to);
      try {
        const response = await fetch(`/api/transactions?${params.toString()}`, { cache: "no-store", signal: controller.signal });
        if (response.ok) { setItems(await response.json()); setVisibleCount(PAGE_SIZE); }
      } catch { /* aborted */ }
      setLoading(false);
    }, 220);
    return () => { controller.abort(); window.clearTimeout(timer); };
  }, [search, type, categoryId, memberId, dateRange, reloadKey]);

  const filtered = search || type || categoryId || memberId || dateRange !== "all";
  const clear = () => { setSearch(""); setType(""); setCategoryId(""); setMemberId(""); setDateRange("all"); };
  const income = items.filter((item) => item.type === "income").reduce((sum, item) => sum + item.amount, 0);
  const expense = items.filter((item) => item.type === "expense").reduce((sum, item) => sum + item.amount, 0);
  const visible = items.slice(0, visibleCount);
  const remaining = items.length - visible.length;
  const chipCategories = [...data.categories].sort((a, b) => (a.kind === b.kind ? 0 : a.kind === "expense" ? -1 : 1));

  return (
    <section className="page-section">
      <div className="page-intro">
        <div className="intro-with-money">
          <div className="money-float" aria-hidden="true">{[0, 1, 2, 3, 4, 5].map((index) => <span key={index}>{currencySymbol(data.currency)}</span>)}</div>
          <p className="eyebrow">Household ledger</p><h2>Every {currencyUnit(data.currency)}, accounted for.</h2><span>Search, filter, edit, or remove any entry with exact date, time, and contributor.</span>
        </div>
        <button className="primary-button" onClick={onAdd}><Plus size={17} /><span>New transaction</span></button>
      </div>
      <div className="tx-toolbar">
        <div className="search-field"><Search size={16} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search notes or categories" aria-label="Search transactions" /></div>
        <select className="filter-select" value={dateRange} onChange={(event) => setDateRange(event.target.value)} aria-label="Filter by date">{dateRangeOptions.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}</select>
        <select className="filter-select" value={type} onChange={(event) => setType(event.target.value)} aria-label="Filter by type"><option value="">All types</option><option value="expense">Expenses</option><option value="income">Income</option></select>
        <MemberFilter members={data.members} value={memberId} onChange={setMemberId} label="Filter transactions by person" />
        <button className="icon-button tx-export" title="Export filtered transactions as CSV" aria-label="Export filtered transactions as CSV" onClick={exportCsv} disabled={items.length === 0}><Download size={16} /></button>
        {filtered && <button className="text-button tx-toolbar-clear" onClick={clear}>Clear filters</button>}
      </div>
      <div className="category-chips" role="radiogroup" aria-label="Filter by category">
        <button type="button" role="radio" aria-checked={categoryId === ""} className={`chip ${categoryId === "" ? "selected" : ""}`} onClick={() => setCategoryId("")}>All</button>
        {chipCategories.map((category) => (
          <button type="button" role="radio" aria-checked={categoryId === category.id} key={category.id} className={`chip ${categoryId === category.id ? "selected" : ""}`} onClick={() => setCategoryId(categoryId === category.id ? "" : category.id)}>
            <i style={{ background: category.color }} />{category.name}
          </button>
        ))}
      </div>
      <article className="panel table-panel" ref={panelRef}>
        <div className="transaction-summary summary-sticky">
          <div><span>Income shown</span><strong>{formatCurrency(income, data.currency)}</strong></div>
          <div><span>Expenses shown</span><strong>{formatCurrency(expense, data.currency)}</strong></div>
          <div><span>{loading ? "Loading..." : `Showing ${visible.length} of ${items.length}`}</span><strong>{formatCurrency(income - expense, data.currency)}</strong></div>
        </div>
        {items.length === 0 ? (
          <div className="empty-state"><ReceiptText size={22} /><p>{filtered ? "No transactions match these filters." : "No transactions yet."}</p></div>
        ) : (
          <div className="ledger">
            {visible.map((transaction, index) => (
              <motion.div
                className="ledger-row"
                key={transaction.id}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-30px 0px" }}
                transition={{ duration: 0.34, delay: (index % PAGE_SIZE) * 0.02, ease: [0.2, 0.7, 0.3, 1] }}
              >
                <div className={`transaction-symbol ${transaction.type}`}>{transaction.type === "income" ? <ArrowDownLeft size={17} /> : <ArrowUpRight size={17} />}</div>
                <div className="transaction-main">
                  <strong>{transaction.note}</strong>
                  <div className="ledger-meta"><span>{transaction.category.name}</span><i className="dot-sep" />{transaction.member.name}<i className="dot-sep" /><span className="pay-tag">{paymentLabel(transaction.paymentMethod)}</span>{transaction.billId && <span className="pay-tag bill">From bill</span>}</div>
                </div>
                <div className="transaction-date"><span>{formatDate(transaction.occurredAt, { month: "short", day: "numeric" })}</span><small>{formatDate(transaction.occurredAt, { hour: "numeric", minute: "2-digit", month: undefined, day: undefined, year: undefined })}</small></div>
                <strong className={`transaction-amount ${transaction.type}`}>{transaction.type === "income" ? "+" : "-"}{formatCurrency(transaction.amount, data.currency)}</strong>
                <div className="tx-actions">
                  {transaction.billId ? (
                    <span className="bill-lock" title="Managed from Bills"><CreditCard size={14} /></span>
                  ) : (
                    <>
                      <button className="icon-button" title="Edit" onClick={() => onEdit(transaction)}><Pencil size={15} /></button>
                      <button className="icon-button danger" title="Delete" onClick={() => onDelete(transaction)}><Trash2 size={15} /></button>
                    </>
                  )}
                </div>
              </motion.div>
            ))}
            {(remaining > 0 || visibleCount > PAGE_SIZE) && (
              <div className="load-more-row">
                {remaining > 0 && (
                  <button className="secondary-button" onClick={() => setVisibleCount((count) => count + PAGE_SIZE)}>
                    <ChevronDown size={16} />Show {Math.min(PAGE_SIZE, remaining)} more<span className="load-more-count">{remaining} remaining</span>
                  </button>
                )}
                {visibleCount > PAGE_SIZE && (
                  <button className="secondary-button" onClick={collapseList}>
                    <ChevronUp size={16} />Show less
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </article>
    </section>
  );
}

export function BudgetDashboard({ initialData, sessionEmail, initialPrivacy = false }: { initialData: DashboardData; sessionEmail: string; initialPrivacy?: boolean }) {
  // Balance privacy: masks "Available to plan" and monthly income on the
  // overview. Controlled only from Settings so a casual viewer can't reveal it.
  const [amountsHidden, setAmountsHidden] = useState(initialPrivacy);
  const toggleAmounts = () => {
    const next = !amountsHidden;
    document.cookie = `bt_privacy=${next ? "1" : "0"}; path=/; max-age=31536000; samesite=lax`;
    setAmountsHidden(next);
  };
  const [data, setData] = useState(initialData); const [view, setView] = useState<View>("overview"); const [modal, setModal] = useState<Modal>(null);
  // Live FX: applied during render so every formatter (here and in children)
  // converts base-currency amounts to the display currency, on SSR and client.
  setDisplayFxRate(data.fxRate ?? 1);
  const [sidebarOpen, setSidebarOpen] = useState(false); const [toast, setToast] = useState(""); const [paying, setPaying] = useState<string | null>(null);
  const [editingTx, setEditingTx] = useState<TransactionItem | null>(null); const [undoTx, setUndoTx] = useState<TransactionItem | null>(null);
  const [pendingDeleteTx, setPendingDeleteTx] = useState<TransactionItem | null>(null);
  const [deletingTx, setDeletingTx] = useState(false);
  const [txReloadKey, setTxReloadKey] = useState(0); const bumpTx = () => setTxReloadKey((key) => key + 1);
  const [memberFilter, setMemberFilter] = useState("");
  const refresh = useCallback(async () => { try { const response = await fetch(`/api/dashboard${memberFilter ? `?memberId=${encodeURIComponent(memberFilter)}` : ""}`, { cache: "no-store" }); if (response.ok) setData(await response.json()); } catch { /* offline or server restarting — keep current data */ } }, [memberFilter]);
  const skipFirstMemberRefresh = useRef(true);
  useEffect(() => { if (skipFirstMemberRefresh.current) { skipFirstMemberRefresh.current = false; return; } refresh(); }, [memberFilter, refresh]);
  useEffect(() => { const timer = window.setInterval(refresh, 30_000); const visible = () => document.visibilityState === "visible" && refresh(); document.addEventListener("visibilitychange", visible); return () => { window.clearInterval(timer); document.removeEventListener("visibilitychange", visible); }; }, [refresh]);
  useEffect(() => { if (!toast) return; const timer = window.setTimeout(() => setToast(""), 3000); return () => window.clearTimeout(timer); }, [toast]);
  useEffect(() => { if (!undoTx) return; const timer = window.setTimeout(() => setUndoTx(null), 10_000); return () => window.clearTimeout(timer); }, [undoTx]);
  const saved = async (message: string) => { setModal(null); setEditingTx(null); await refresh(); bumpTx(); setToast(message); };
  const openAddTransaction = () => { setEditingTx(null); setModal("transaction"); };
  const editTransaction = (transaction: TransactionItem) => { setEditingTx(transaction); setModal("transaction"); };
  const closeModal = () => { setModal(null); setEditingTx(null); };
  const requestDeleteTransaction = (transaction: TransactionItem) => setPendingDeleteTx(transaction);
  const deleteTransaction = async () => {
    const transaction = pendingDeleteTx;
    if (!transaction) return;
    setDeletingTx(true);
    const response = await fetch("/api/transactions/" + transaction.id, { method: "DELETE" });
    setDeletingTx(false);
    if (!response.ok) {
      const result = await response.json().catch(() => ({}));
      setPendingDeleteTx(null);
      setToast(result.error ?? "Unable to delete transaction.");
      return;
    }
    setPendingDeleteTx(null);
    setToast("");
    await refresh();
    bumpTx();
    setUndoTx(transaction);
  };
  const undoDelete = async () => {
    const transaction = undoTx;
    if (!transaction) return;
    const response = await fetch("/api/transactions/" + transaction.id + "/restore", { method: "POST" });
    if (!response.ok) {
      const result = await response.json().catch(() => ({}));
      setUndoTx(null);
      setToast(result.error ?? "Unable to restore transaction.");
      return;
    }
    setUndoTx(null);
    await refresh();
    bumpTx();
    setToast("Transaction restored.");
  };
  const pay = async (bill: BillItem) => { setPaying(bill.id); const response = await fetch(`/api/bills/${bill.id}/pay`, { method: "POST" }); setPaying(null); if (response.ok) { await refresh(); bumpTx(); setToast(`${bill.name} marked as paid.`); } };
  const logout = async () => { await fetch("/api/auth/logout", { method: "POST" }); window.location.reload(); };
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const title = navItems.find((item) => item.id === view)?.label ?? "Overview"; const StatusIcon = statusIcon[data.status];
  const trendCeiling = Math.max(1, ...data.trend.flatMap((point) => [point.income, point.expense]));
  const nextBill = data.bills[0];

  return (
    <div className="app-shell">
      <aside className={`sidebar ${sidebarOpen ? "open" : ""}`}>
        <div className="sidebar-top"><Image src="/budgettracker-logo.svg" alt="BudgetTracker" width={220} height={48} priority /><button className="icon-button sidebar-close" onClick={() => setSidebarOpen(false)} title="Close menu"><X size={19} /></button></div>
        <nav>{navItems.map(({ id, label, icon: Icon }) => <button key={id} className={view === id ? "active" : ""} onClick={() => { setView(id); setSidebarOpen(false); }}><Icon size={18} /><span>{label}</span>{view === id && <motion.i layoutId="nav-active" />}</button>)}</nav>
        <button className="primary-button sidebar-add" onClick={openAddTransaction}><Plus size={17} /><span>Add transaction</span></button>
        <div className="sidebar-bottom">
          <AnimatePresence>
            {profileMenuOpen && (
              <>
                <button className="profile-menu-overlay" aria-label="Close menu" onClick={() => setProfileMenuOpen(false)} />
                <motion.div className="profile-menu" role="menu" initial={{ opacity: 0, y: 8, scale: .98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 8, scale: .98 }} transition={{ duration: .16 }}>
                  <div className="profile-menu-head"><div className="household-avatar">{(data.householdName || "BT").slice(0, 2).toUpperCase()}</div><div><strong>{data.householdName}</strong><span>{sessionEmail}</span></div></div>
                  <button role="menuitem" className="profile-menu-item" onClick={() => { setView("settings"); setProfileMenuOpen(false); setSidebarOpen(false); }}><Settings2 size={16} />Settings</button>
                  <button role="menuitem" className="profile-menu-item danger" onClick={logout}><LogOut size={16} />Log out</button>
                </motion.div>
              </>
            )}
          </AnimatePresence>
          <button className="profile-trigger" onClick={() => setProfileMenuOpen((open) => !open)} aria-haspopup="menu" aria-expanded={profileMenuOpen}>
            <div className="household-avatar">{(data.householdName || "BT").slice(0, 2).toUpperCase()}</div>
            <div className="profile-trigger-text"><strong>{data.householdName}</strong><span>{sessionEmail}</span></div>
            <ChevronDown size={16} className={`profile-caret ${profileMenuOpen ? "open" : ""}`} />
          </button>
        </div>
      </aside>
      {sidebarOpen && <button className="sidebar-overlay" aria-label="Close navigation" onClick={() => setSidebarOpen(false)} />}

      <main className="main-content">
        <header className="topbar"><div className="topbar-title"><button className="icon-button menu-button" onClick={() => setSidebarOpen(true)} title="Open menu"><Menu size={20} /></button><div><p>{formatDate(new Date(), { weekday: "long", month: "long", day: "numeric", year: undefined })}</p><h1>{title}</h1></div></div><div className="topbar-actions"><span className="sync-indicator"><i />Synced {formatDate(data.generatedAt, { hour: "numeric", minute: "2-digit", month: undefined, day: undefined, year: undefined })}</span><button className="secondary-button" onClick={() => setModal("bill")}><BellRing size={16} /><span>Add bill</span></button><button className="primary-button" onClick={openAddTransaction}><Plus size={17} /><span>Add transaction</span></button></div></header>

        <div className="content-wrap">
          {view === "overview" && <div className="overview-v2">
            <div className="lens-row"><span className="lens-label">Viewing</span><MemberFilter members={data.members} value={memberFilter} onChange={setMemberFilter} label="Filter overview by person" /></div>
            <section className="command-grid">
              <motion.article className={`balance-stage stage-${data.status}`} initial={{ opacity: 0, y: 18, scale: .992 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: .56, ease: [0.22, 1, 0.36, 1] }}>
                <div className="stage-ambient" aria-hidden="true"><i /><i /><span /></div>
                <header className="stage-header">
                  <div className="stage-status"><i /><StatusIcon size={14} /><div><small>Financial health</small><span>{data.statusLabel}</span></div></div>
                  <div className="stage-period"><small>Reporting period</small><span>{formatDate(new Date(), { month: "long", year: "numeric", day: undefined })}</span></div>
                </header>
                <div className="stage-body">
                  <motion.p initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: .12, duration: .38 }}>Available to plan <span><i />Live</span></motion.p>
                  <motion.h2 initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: .16, duration: .5, ease: [0.22, 1, 0.36, 1] }}><AnimatedAmount value={data.availableBalance} currency={data.currency} masked={amountsHidden} /></motion.h2>
                  <motion.div className="stage-income" initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: .24, duration: .4 }}><TrendingUp size={13} /><span>{amountsHidden ? maskedAmount(data.currency) : formatCurrency(data.monthIncome, data.currency)} income received this month</span></motion.div>
                  <motion.div className="stage-quick-stats" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: .3, duration: .42 }}>
                    <div><span>Total savings</span><strong><AnimatedAmount value={data.savingsBalance} currency={data.currency} masked={amountsHidden} /></strong></div>
                    <div><span>Savings rate</span><strong>{data.savingsRate.toFixed(0)}%</strong></div>
                  </motion.div>
                </div>
                <div className="stage-spark" aria-hidden="true">
                  <div className="stage-spark-head"><span>12M cash signal</span><small><i />Live</small></div>
                  <div className="stage-spark-bars">{data.trend.map((point, index) => <div key={`${point.month}-${index}`}><motion.i style={{ height: `${Math.max(12, (point.income / trendCeiling) * 100)}%`, transformOrigin: "bottom" }} initial={{ scaleY: 0, opacity: .2 }} animate={{ scaleY: 1, opacity: 1 }} transition={{ delay: .14 + index * .035, duration: .48, ease: [0.22, 1, 0.36, 1] }} /><motion.i style={{ height: `${Math.max(8, (point.expense / trendCeiling) * 100)}%`, transformOrigin: "bottom" }} initial={{ scaleY: 0, opacity: .2 }} animate={{ scaleY: 1, opacity: .78 }} transition={{ delay: .18 + index * .035, duration: .48, ease: [0.22, 1, 0.36, 1] }} /></div>)}</div>
                </div>
                <footer className="stage-footer">
                  <div className="stage-budget"><div><button className="stage-edit" onClick={() => setModal("settings")} title="Change your monthly plan"><span>Monthly plan · {formatCurrency(data.monthlyBudget, data.currency)}</span><Pencil size={11} /></button><strong>{Math.round(data.utilization)}% used</strong></div><div className="stage-meter"><motion.i initial={{ width: 0 }} animate={{ width: `${Math.min(100, data.utilization)}%` }} transition={{ delay: .25, duration: .65 }} /></div></div>
                  <motion.button className="stage-action" onClick={openAddTransaction} whileHover={{ y: -2 }} whileTap={{ scale: .985 }}><span className="stage-action-icon"><Plus size={15} /></span><span><strong>Record money</strong><small>Add income or expense</small></span><ArrowRight className="stage-action-arrow" size={15} /></motion.button>
                  <small className="stage-plan-note">{Math.max(0, 100 - data.utilization).toFixed(0)}% of your monthly plan is still available</small>
                </footer>
              </motion.article>

              <motion.aside className="obligation-rail" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: .42, delay: .08 }}>
                <div className="rail-heading"><div><p>Next 30 days</p><h2>Commitments</h2></div><button className="icon-button" onClick={() => setView("bills")} title="View bills"><ArrowRight size={17} /></button></div>
                <div className="rail-total"><span>Reserved for bills</span><strong>{formatCurrency(data.upcomingBillsTotal, data.currency)}</strong><small>{data.bills.length} payment{data.bills.length === 1 ? "" : "s"} awaiting</small></div>
                {nextBill ? <div className="rail-next"><div className="rail-date"><span>{formatDate(`${nextBill.dueDate}T00:00:00+08:00`, { month: "short" })}</span><strong>{formatDate(`${nextBill.dueDate}T00:00:00+08:00`, { day: "2-digit", month: undefined, year: undefined })}</strong></div><div><span>Due next</span><strong>{nextBill.name}</strong><small>{formatRelativeDueDate(nextBill.dueDate)}</small></div><b>{formatCurrency(nextBill.amount, data.currency)}</b></div> : <div className="rail-empty"><Check size={17} />All bills are covered.</div>}
                <button className="rail-link" onClick={() => setModal("bill")}><Plus size={14} />Schedule another bill</button>
              </motion.aside>
            </section>

            <section className="signal-strip">
              <div><span><TrendingUp size={14} />Spent this month</span><strong>{formatCurrency(data.monthExpense, data.currency)}</strong><small className={data.spendingChange > 0 ? "signal-warn" : "signal-good"}>{data.spendingChange <= 0 ? "Down" : "Up"} {Math.abs(data.spendingChange).toFixed(1)}% from last month</small></div>
              <div><span><CircleDollarSign size={14} />Net savings</span><strong>{formatCurrency(data.monthIncome - data.monthExpense, data.currency)}</strong><small>{data.savingsRate.toFixed(0)}% of income retained</small></div>
              <div><span><Gauge size={14} />Daily pace</span><strong>{formatCurrency(data.safeToSpendDaily, data.currency)}</strong><small>Safe to spend per day</small></div>
              <div><span><Target size={14} />Budget left</span><strong>{formatCurrency(data.budgetRemaining, data.currency)}</strong><small>{Math.max(0, 100 - data.utilization).toFixed(0)}% remains unspent</small></div>
            </section>

            <section className="analysis-surface">
              <article className="analysis-primary"><CashFlowExplorer initialData={data.trend} currency={data.currency} memberId={memberFilter} /></article>
              <aside className="spend-profile"><SectionHeading eyebrow="Spending fingerprint" title="Your strongest category" />{data.categorySpend[0] && <div className="top-category"><span style={{ background: data.categorySpend[0].color }}>01</span><div><p>{data.categorySpend[0].name}</p><strong>{formatCurrency(data.categorySpend[0].amount, data.currency)}</strong></div><small>{data.categorySpend[0].percentage.toFixed(0)}% of monthly spend</small></div>}<CategoryBars data={data.categorySpend.slice(1)} currency={data.currency} /></aside>
            </section>

            <section className={`forecast-ribbon forecast-${data.status}`}><div className="forecast-mark"><Gauge size={19} /></div><div><p>Analyst outlook</p><h3>At this pace, you will close the month at {formatCurrency(data.forecast, data.currency)}.</h3></div><div><span>{data.statusMessage}</span></div></section>

            <section className="activity-surface"><article><SectionHeading eyebrow="Next up" title="Bills & deadlines" action={<button className="text-button" onClick={() => setView("bills")}>View all <ChevronRight size={15} /></button>} /><BillsList data={data} onPay={pay} /></article><article><SectionHeading eyebrow="Household activity" title="Recent transactions" action={<button className="text-button" onClick={() => setView("transactions")}>View all <ChevronRight size={15} /></button>} /><TransactionList data={data} limit={5} /></article></section>
          </div>}

          {view === "settings" && <SettingsView data={data} onSaved={async (message) => { await refresh(); bumpTx(); setToast(message); }} amountsHidden={amountsHidden} onToggleAmounts={toggleAmounts} />}

          {view === "transactions" && <TransactionsView data={data} reloadKey={txReloadKey} onEdit={editTransaction} onDelete={requestDeleteTransaction} onAdd={openAddTransaction} />}

          {view === "bills" && <section className="page-section"><div className="page-intro"><div><p className="eyebrow">Payment calendar</p><h2>Stay ahead of every due date.</h2><span>Reminders go to {data.reminderEmail}.</span></div><button className="primary-button" onClick={() => setModal("bill")}><Plus size={17} /><span>Add bill</span></button></div><div className="overview-grid bills-page-grid"><article className="panel"><SectionHeading eyebrow="Upcoming" title="Payment schedule" /><BillsList data={data} onPay={pay} expanded /></article><aside className="panel reminder-panel"><div className="reminder-visual"><BellRing size={24} /></div><h3>Automatic reminders</h3><p>Emails are queued 7, 3, and 1 day before each deadline, plus the due date.</p><div className="reminder-email"><Mail size={16} /><span>{data.reminderEmail}</span></div><button className="secondary-button" onClick={() => setModal("settings")}><Settings2 size={16} />Edit destination</button></aside></div></section>}

          {view === "budget" && <section className="page-section"><div className="page-intro"><div><p className="eyebrow">Monthly plan</p><h2>Give every {currencyUnit(data.currency)} a clear job.</h2><span>Your limits respond automatically as new spending is recorded.</span></div><button className="primary-button" onClick={() => setModal("settings")}><Settings2 size={17} /><span>Edit budget</span></button></div><section className="budget-hero"><div><p>Monthly household budget</p><h3>{formatCurrency(data.monthlyBudget, data.currency)}</h3><span>{formatCurrency(data.budgetRemaining, data.currency)} remaining</span></div><div className="budget-meter"><div><span style={{ width: `${Math.min(100, data.utilization)}%` }} /></div><footer><span>{Math.round(data.utilization)}% used</span><strong>{data.statusLabel}</strong></footer></div></section><div className="overview-grid budget-page-grid"><BudgetAllocations data={data} onSaved={async (message) => { await refresh(); bumpTx(); setToast(message); }} /><article className="panel budget-guidance"><SectionHeading eyebrow="Analyst view" title="Three numbers to watch" /><div className="guidance-list"><div><Gauge size={19} /><span>Month-end forecast</span><strong>{formatCurrency(data.forecast, data.currency)}</strong></div><div><CircleDollarSign size={19} /><span>Daily safe-to-spend</span><strong>{formatCurrency(data.safeToSpendDaily, data.currency)}</strong></div><div><Target size={19} /><span>Savings rate</span><strong>{data.savingsRate.toFixed(0)}%</strong></div></div></article></div></section>}
        </div>
      </main>

      <nav className="mobile-nav">{navItems.map(({ id, label, icon: Icon }) => <button key={id} className={view === id ? "active" : ""} onClick={() => setView(id)}><Icon size={19} /><span>{label.split(" ")[0]}</span></button>)}</nav>
      <AnimatePresence>{modal === "transaction" && <TransactionModal data={data} editing={editingTx} onClose={closeModal} onSaved={saved} />}{modal === "bill" && <BillModal data={data} onClose={() => setModal(null)} onSaved={() => saved("Bill scheduled.")} />}{modal === "settings" && <SettingsModal data={data} onClose={() => setModal(null)} onSaved={() => saved("Budget settings updated.")} />}</AnimatePresence>
      <DestructiveActionDialog
        open={Boolean(pendingDeleteTx)}
        title={pendingDeleteTx ? "Delete " + pendingDeleteTx.note + "?" : "Delete transaction?"}
        description="This removes the entire transaction record and immediately recalculates your household reports."
        impacts={pendingDeleteTx ? [
          formatCurrency(pendingDeleteTx.amount, data.currency) + " will be removed from the ledger.",
          "The amount, category, contributor, payment method, note, and timestamp will all be removed.",
          "Balances, trends, category analytics, and forecasts will recalculate immediately.",
        ] : []}
        confirmLabel="Delete transaction"
        pending={deletingTx}
        onCancel={() => !deletingTx && setPendingDeleteTx(null)}
        onConfirm={deleteTransaction}
      />
      {undoTx && <UndoToast message="Transaction deleted." onUndo={undoDelete} />}
      <AnimatePresence>
        {!undoTx && toast && <motion.div className="toast" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}><Check size={17} />{toast}</motion.div>}
      </AnimatePresence>
      {paying && <div className="paying-indicator"><span />Recording payment...</div>}
    </div>
  );
}
