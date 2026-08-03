"use client";

import { AreaChart, BarChart3, ChevronLeft, ChevronRight, Download, LineChart, LoaderCircle, RotateCcw } from "lucide-react";
import { memo, useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { motion, useReducedMotion } from "motion/react";
import { TrendChart } from "@/components/trend-chart";
import { formatCurrency } from "@/lib/format";
import type { CashFlowData, CashFlowRange, CashFlowStyle, TrendPoint } from "@/lib/types";

const ranges: Array<{ id: CashFlowRange; short: string; label: string; title: string; anchoredTitle: string }> = [
  { id: "1d", short: "1D", label: "Hourly", title: "Today by the hour", anchoredTitle: "By the hour" },
  { id: "7d", short: "7D", label: "Daily", title: "Daily pulse", anchoredTitle: "7 days ending" },
  { id: "4w", short: "4W", label: "Weekly", title: "Weekly flow", anchoredTitle: "4 weeks ending" },
  { id: "12m", short: "12M", label: "Monthly", title: "Monthly movement", anchoredTitle: "12 months ending" },
  { id: "3y", short: "3Y", label: "Annual", title: "Annual trajectory", anchoredTitle: "3 years ending" },
];

const styles: Array<{ id: CashFlowStyle; label: string; icon: typeof AreaChart }> = [
  { id: "curve", label: "Curved area", icon: AreaChart },
  { id: "line", label: "Linear graph", icon: LineChart },
  { id: "bar", label: "Bar graph", icon: BarChart3 },
];

function summarize(points: TrendPoint[]) {
  const income = points.reduce((sum, point) => sum + point.income, 0);
  const expense = points.reduce((sum, point) => sum + point.expense, 0);
  return { income, expense, net: income - expense, averageExpense: points.length ? expense / points.length : 0, strongestPeriod: points[points.length - 1]?.month ?? "-" };
}

const isoDate = (date: Date) => {
  const shifted = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return shifted.toISOString().slice(0, 10);
};

/** Step the anchor date backwards/forwards by one window of the range. */
function shiftAnchor(range: CashFlowRange, anchor: string, direction: 1 | -1): string {
  const date = new Date(`${anchor}T00:00:00`);
  switch (range) {
    case "1d": date.setDate(date.getDate() + direction); break;
    case "7d": date.setDate(date.getDate() + 7 * direction); break;
    case "4w": date.setDate(date.getDate() + 28 * direction); break;
    case "12m": date.setFullYear(date.getFullYear() + direction); break;
    case "3y": date.setFullYear(date.getFullYear() + 3 * direction); break;
  }
  return isoDate(date);
}

type CashFlowExplorerProps = { initialData: TrendPoint[]; currency: string; memberId?: string };
type CachedCashFlow = { data: CashFlowData; storedAt: number };

const cashFlowCache = new Map<string, CachedCashFlow>();
const cashFlowCacheTtl = 30_000;

function sameTrendPoints(left: TrendPoint[], right: TrendPoint[]) {
  return left.length === right.length && left.every((point, index) => {
    const other = right[index];
    return point.month === other.month
      && point.detail === other.detail
      && point.income === other.income
      && point.expense === other.expense
      && point.count === other.count;
  });
}

export const CashFlowExplorer = memo(function CashFlowExplorer({ initialData, currency, memberId = "" }: CashFlowExplorerProps) {
  const reduceMotion = useReducedMotion();
  const [range, setRange] = useState<CashFlowRange>("12m");
  const [style, setStyle] = useState<CashFlowStyle>("curve");
  const [points, setPoints] = useState(initialData);
  const [summary, setSummary] = useState(() => summarize(initialData));
  const [loading, setLoading] = useState(false);
  const [isPending, startTransition] = useTransition();
  // null = live "today" view; a YYYY-MM-DD string pins the window to that date.
  const [anchor, setAnchor] = useState<string | null>(null);
  const today = useMemo(() => isoDate(new Date()), []);
  const rangeMeta = ranges.find((option) => option.id === range) ?? ranges[3];
  const netPositive = summary.net >= 0;
  const busy = loading || isPending;
  const chartLabel = `${rangeMeta.label} income and expense ${style} chart`;
  const anchorLabel = anchor
    ? new Date(`${anchor}T00:00:00`).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" })
    : null;
  const activeRequest = useRef<AbortController | null>(null);
  const requestSequence = useRef(0);
  const lastMember = useRef(memberId);
  const lastInitialData = useRef(initialData);

  const commitResult = useCallback((result: CashFlowData) => {
    startTransition(() => {
      setPoints(result.points);
      setSummary(result.summary);
    });
  }, []);

  const load = useCallback(async (next: CashFlowRange, member: string, at: string | null) => {
    activeRequest.current?.abort();
    const requestId = ++requestSequence.current;
    const params = new URLSearchParams({ range: next });
    if (member) params.set("memberId", member);
    if (at) params.set("anchor", at);
    const requestUrl = `/api/analytics/cash-flow?${params.toString()}`;
    const cached = cashFlowCache.get(requestUrl);
    if (cached && Date.now() - cached.storedAt < cashFlowCacheTtl) {
      setLoading(false);
      commitResult(cached.data);
      return;
    }

    const controller = new AbortController();
    activeRequest.current = controller;
    setLoading(true);
    try {
      const response = await fetch(requestUrl, { cache: "no-store", signal: controller.signal });
      if (!response.ok || requestId !== requestSequence.current) return;
      const result = await response.json() as CashFlowData;
      cashFlowCache.set(requestUrl, { data: result, storedAt: Date.now() });
      if (cashFlowCache.size > 20) cashFlowCache.delete(cashFlowCache.keys().next().value as string);
      commitResult(result);
    } catch (error) {
      if (!(error instanceof DOMException && error.name === "AbortError")) throw error;
    } finally {
      if (requestId === requestSequence.current) setLoading(false);
    }
  }, [commitResult]);

  function changeRange(next: CashFlowRange) {
    if (next === range) return;
    setRange(next);
    void load(next, memberId, anchor);
  }

  function pickAnchor(value: string) {
    const next = value && value <= today ? value : null;
    setAnchor(next);
    void load(range, memberId, next);
  }

  function stepAnchor(direction: 1 | -1) {
    const shifted = shiftAnchor(range, anchor ?? today, direction);
    // Stepping forward to (or past) today returns to the live view.
    const next = shifted >= today ? null : shifted;
    setAnchor(next);
    void load(range, memberId, next);
  }

  // Refetch the current range when the household/member lens changes.
  useEffect(() => {
    if (lastMember.current === memberId) return;
    lastMember.current = memberId;
    void load(range, memberId, anchor);
  }, [anchor, load, memberId, range]);

  // Keep the live monthly chart synchronized after transactions change.
  useEffect(() => {
    if (lastInitialData.current === initialData) return;
    lastInitialData.current = initialData;
    if (range !== "12m" || anchor) return;
    startTransition(() => {
      setPoints(initialData);
      setSummary(summarize(initialData));
    });
  }, [anchor, initialData, range]);

  useEffect(() => () => activeRequest.current?.abort(), []);

  const csv = useMemo(() => ["Period,Income,Expenses,Net", ...points.map((point) => `${point.detail ?? point.month},${point.income},${point.expense},${point.income - point.expense}`)].join("\n"), [points]);
  function exportCsv() {
    const link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    link.download = `budgettracker-cash-flow-${range}${anchor ? `-${anchor}` : ""}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  return (
    <div className="flow-explorer">
      <header className="flow-header">
        <div className="flow-title">
          <p><span className="flow-status-dot" />Cash flow intelligence <small>{anchor ? "Historical model" : "Live model"}</small></p>
          <h2>{anchor ? `${rangeMeta.anchoredTitle} ${anchorLabel}` : rangeMeta.title}</h2>
          <span className="flow-context">{rangeMeta.label} resolution <i /> {points.length} periods analyzed</span>
        </div>
        <div className="flow-tools">
          <div className="anchor-nav" aria-label="Jump to a specific date">
            <button onClick={() => stepAnchor(-1)} title="Previous period" aria-label="Previous period"><ChevronLeft size={15} /></button>
            <input
              type="date"
              value={anchor ?? today}
              max={today}
              onChange={(event) => pickAnchor(event.target.value)}
              aria-label="View a specific date"
            />
            <button onClick={() => stepAnchor(1)} disabled={!anchor} title="Next period" aria-label="Next period"><ChevronRight size={15} /></button>
            {anchor && <button className="anchor-reset" onClick={() => pickAnchor("")} title="Back to today" aria-label="Back to today"><RotateCcw size={13} /></button>}
          </div>
          <div className="range-tabs" aria-label="Cash flow period">{ranges.map((option) => <button key={option.id} className={range === option.id ? "active" : ""} onClick={() => changeRange(option.id)} title={option.label} aria-pressed={range === option.id}>{option.short}</button>)}</div>
          <div className="chart-modes" aria-label="Chart style">{styles.map(({ id, label, icon: Icon }) => <button key={id} className={style === id ? "active" : ""} onClick={() => setStyle(id)} title={label} aria-label={label} aria-pressed={style === id}><Icon size={15} /></button>)}</div>
          <button className="flow-export" onClick={exportCsv} title="Export cash flow CSV" aria-label="Export cash flow CSV"><Download size={15} /></button>
        </div>
      </header>
      <div className="flow-kpis">
        <div className="flow-kpi flow-kpi-net"><span>Net flow</span><strong className={netPositive ? "positive" : "negative"}>{netPositive ? "+" : ""}{formatCurrency(summary.net, currency)}</strong><small>{netPositive ? "Positive balance" : "Outflow exceeds income"}</small></div>
        <div className="flow-kpi flow-kpi-in"><span>Total in</span><strong>{formatCurrency(summary.income, currency)}</strong><small>Across {points.length} periods</small></div>
        <div className="flow-kpi flow-kpi-out"><span>Average out</span><strong>{formatCurrency(summary.averageExpense, currency)}</strong><small>Per {rangeMeta.label.toLowerCase()} interval</small></div>
        <div className="flow-kpi flow-kpi-peak"><span>Strongest period</span><strong>{summary.strongestPeriod}</strong><small>Peak activity window</small></div>
      </div>
      <motion.div className={`flow-chart-wrap ${busy ? "loading" : ""}`} initial={reduceMotion ? false : { opacity: 0, y: 8, scale: .998 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: reduceMotion ? 0 : .34, ease: [0.22, 1, 0.36, 1] }} style={{ willChange: reduceMotion ? "auto" : "transform, opacity" }} aria-busy={busy}>
        <div className="flow-chart-aura" aria-hidden="true" />
        {busy && <div className="chart-loading"><LoaderCircle size={20} />Updating analysis</div>}
        <TrendChart data={points} style={style} label={chartLabel} currency={currency} animate={!reduceMotion} />
      </motion.div>
      <footer className="flow-footer"><div><span className="flow-live" />{anchor ? `Viewing ${anchorLabel}` : "Live ledger"}</div><span>Income</span><span>Expenses</span></footer>
    </div>
  );
}, (previous, next) => previous.currency === next.currency && previous.memberId === next.memberId && sameTrendPoints(previous.initialData, next.initialData));
