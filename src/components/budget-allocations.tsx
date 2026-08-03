"use client";

import { AlertTriangle, Check, PiggyBank, Plus, SlidersHorizontal, Wallet, X } from "lucide-react";
import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { CategoryManager } from "@/components/category-manager";
import { currencySymbol, formatCurrency, toBaseAmount, toDisplayAmount } from "@/lib/format";
import type { DashboardData } from "@/lib/types";

type AllocationRow = {
  id: string;
  name: string;
  color: string;
  limit: number | null;
  spent: number;
};

function statusOf(row: AllocationRow): "ok" | "watch" | "over" | "none" {
  if (!row.limit) return "none";
  const ratio = row.spent / row.limit;
  if (ratio > 1) return "over";
  if (ratio >= 0.8) return "watch";
  return "ok";
}

export function BudgetAllocations({ data, onSaved }: { data: DashboardData; onSaved: (message: string) => void }) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [manageOpen, setManageOpen] = useState(false);

  const spentByCategory = new Map(data.categorySpend.map((entry) => [entry.id, entry.amount]));
  const rows: AllocationRow[] = data.categories
    .filter((category) => category.kind === "expense")
    .map((category) => ({
      id: category.id,
      name: category.name,
      color: category.color,
      limit: category.budgetLimit ?? null,
      spent: spentByCategory.get(category.id) ?? 0,
    }))
    .sort((a, b) => {
      if ((a.limit === null) !== (b.limit === null)) return a.limit === null ? 1 : -1;
      return b.spent - a.spent;
    });

  const allocated = rows.reduce((sum, row) => sum + (row.limit ?? 0), 0);
  const flexible = data.monthlyBudget - allocated;
  const overAllocated = allocated > data.monthlyBudget;

  function startEdit(row: AllocationRow) {
    setError("");
    setEditingId(row.id);
    setDraft(row.limit ? String(toDisplayAmount(row.limit)) : "");
  }

  async function save(row: AllocationRow, amount: number | null) {
    if (pending) return;
    setPending(true); setError("");
    const response = await fetch(`/api/categories/${row.id}/allocation`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount }),
    });
    const result = await response.json().catch(() => ({}));
    setPending(false);
    if (!response.ok) { setError(result.error ?? "Unable to save allocation."); return; }
    setEditingId(null);
    onSaved(amount === null ? `${row.name} is flexible again.` : `${row.name} allocation saved.`);
  }

  function submitDraft(row: AllocationRow) {
    const value = Number(draft);
    if (!draft.trim() || !Number.isFinite(value) || value <= 0) { setError("Enter an amount above zero."); return; }
    save(row, toBaseAmount(value));
  }

  return (
    <article className="panel allocations-panel">
      <div className="section-heading">
        <div><p>Envelope budgeting</p><h2>Category allocations</h2></div>
        <button type="button" className="allocation-icon allocation-manage" onClick={() => setManageOpen(true)} title="Manage categories" aria-label="Manage categories"><SlidersHorizontal size={15} /></button>
      </div>

      <div className={`allocation-summary ${overAllocated ? "over" : ""}`}>
        <div className="allocation-summary-item"><span><Wallet size={13} />Allocated</span><strong>{formatCurrency(allocated, data.currency)}</strong></div>
        <div className="allocation-summary-item"><span><PiggyBank size={13} />{overAllocated ? "Over budget" : "Flexible"}</span><strong>{formatCurrency(Math.abs(flexible), data.currency)}</strong></div>
        <div className="allocation-meter"><i style={{ width: `${Math.min(100, (allocated / Math.max(1, data.monthlyBudget)) * 100)}%` }} /></div>
        <small>{overAllocated
          ? `Allocations exceed your ${formatCurrency(data.monthlyBudget, data.currency)} monthly plan — trim ${formatCurrency(allocated - data.monthlyBudget, data.currency)}.`
          : `of your ${formatCurrency(data.monthlyBudget, data.currency)} monthly plan · unallocated money stays flexible.`}</small>
      </div>

      <div className="allocation-list">
        {rows.map((row) => {
          const status = statusOf(row);
          const editing = editingId === row.id;
          return (
            <div className={`allocation-row ${editing ? "editing" : ""}`} key={row.id}>
              <span className="allocation-dot" style={{ background: row.color }} />
              <div className="allocation-main">
                <div className="allocation-title">
                  <strong>{row.name}</strong>
                  {status === "over" && <span className="alloc-tag over"><AlertTriangle size={10} />Over</span>}
                  {status === "watch" && <span className="alloc-tag watch">Almost there</span>}
                  {status === "none" && <span className="alloc-tag none">Flexible</span>}
                </div>
                {editing ? (
                  <div className="allocation-edit">
                    <div className="allocation-input"><b>{currencySymbol(data.currency)}</b>
                      <input
                        type="number" min="1" step="any" value={draft} autoFocus
                        placeholder={`e.g. ${toDisplayAmount(2000)}`}
                        onChange={(event) => setDraft(event.target.value)}
                        onKeyDown={(event) => { if (event.key === "Enter") submitDraft(row); if (event.key === "Escape") setEditingId(null); }}
                        aria-label={`Monthly allocation for ${row.name}`}
                      />
                    </div>
                    <button type="button" className="primary-button compact-save" disabled={pending} onClick={() => submitDraft(row)}><Check size={14} />Save</button>
                    {row.limit !== null && <button type="button" className="secondary-button compact" disabled={pending} onClick={() => save(row, null)}>No limit</button>}
                    <button type="button" className="icon-button" title="Cancel" onClick={() => setEditingId(null)}><X size={15} /></button>
                  </div>
                ) : (
                  <>
                    <div className="allocation-amounts">
                      <span className={`spent-${status}`}>{formatCurrency(row.spent, data.currency)}</span>
                      <small>{row.limit ? `of ${formatCurrency(row.limit, data.currency)}` : "spent this month"}</small>
                      {row.limit !== null && row.limit - row.spent > 0 && <small className="alloc-left">{formatCurrency(row.limit - row.spent, data.currency)} left</small>}
                    </div>
                    {row.limit !== null && (
                      <div className="allocation-track">
                        <motion.i
                          className={`fill-${status}`}
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.min(100, (row.spent / row.limit) * 100)}%` }}
                          transition={{ duration: 0.6, ease: [0.2, 0.7, 0.3, 1] }}
                        />
                      </div>
                    )}
                  </>
                )}
              </div>
              {!editing && (
                <button type="button" className={row.limit === null ? "alloc-set" : "alloc-edit"} onClick={() => startEdit(row)}>
                  {row.limit === null ? "Set limit" : "Edit"}
                </button>
              )}
            </div>
          );
        })}
      </div>
      {error && <p className="form-error" role="alert">{error}</p>}

      <button type="button" className="allocation-add" onClick={() => setManageOpen(true)}>
        <Plus size={15} /><span>New category</span>
      </button>

      <AnimatePresence>
        {manageOpen && (
          <motion.div className="modal-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onMouseDown={(event) => event.target === event.currentTarget && setManageOpen(false)}>
            <motion.section className="modal-sheet manage-sheet" role="dialog" aria-modal="true" aria-label="Manage categories"
              initial={{ opacity: 0, y: 24, scale: 0.985 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 16, scale: 0.99 }}>
              <header>
                <div><p className="eyebrow">Envelope budgeting</p><h2>Manage categories</h2><p>Add, rename, recolor, or remove your spending and income categories.</p></div>
                <button type="button" className="icon-button" onClick={() => setManageOpen(false)} title="Close"><X size={19} /></button>
              </header>
              <div className="manage-sheet-body">
                <CategoryManager categories={data.categories} onSaved={onSaved} />
              </div>
            </motion.section>
          </motion.div>
        )}
      </AnimatePresence>
    </article>
  );
}
