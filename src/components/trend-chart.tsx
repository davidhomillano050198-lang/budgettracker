"use client";

import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Line, LineChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { memo, useMemo } from "react";
import { formatCompactCurrency, formatCurrency } from "@/lib/format";
import type { CashFlowStyle, TrendPoint } from "@/lib/types";

function ChartTooltip({ active, payload, label, currency }: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string; payload?: TrendPoint }>;
  label?: string;
  currency?: string;
}) {
  if (!active || !payload?.length) return null;
  const point = payload[0]?.payload;
  const net = (point?.income ?? 0) - (point?.expense ?? 0);
  const count = point?.count;
  return (
    <div className="chart-tooltip">
      <p>{point?.detail ?? label}</p>
      {payload.map((item) => (
        <div key={item.name}>
          <span style={{ background: item.color }} />
          <span>{item.name}</span>
          <strong>{formatCurrency(item.value, currency)}</strong>
        </div>
      ))}
      <div className="tooltip-net">
        <span className={net >= 0 ? "net-positive" : "net-negative"} />
        <span>Net</span>
        <strong className={net >= 0 ? "net-positive" : "net-negative"}>{net >= 0 ? "+" : "−"}{formatCurrency(Math.abs(net), currency)}</strong>
      </div>
      {typeof count === "number" && (
        <footer className="tooltip-count">{count === 0 ? "No transactions" : `${count} transaction${count === 1 ? "" : "s"}`}</footer>
      )}
    </div>
  );
}

const chartMargin = { top: 10, right: 6, bottom: 0, left: -12 };
const chartAnimationDuration = 560;
const buildAxis = (currency: string) => ({
  x: <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: "var(--flow-axis)", fontSize: 11 }} dy={9} />,
  y: <YAxis axisLine={false} tickLine={false} tick={{ fill: "var(--flow-axis)", fontSize: 10 }} tickFormatter={(value: number) => formatCompactCurrency(Number(value), currency)} width={64} />,
  grid: <CartesianGrid vertical={false} stroke="var(--flow-grid)" strokeDasharray="2 7" />,
  tooltip: <Tooltip content={<ChartTooltip currency={currency} />} cursor={{ stroke: "var(--flow-crosshair)", strokeDasharray: "4 5" }} />,
});

export const TrendChart = memo(function TrendChart({ data, style = "curve", label = "Cash flow trend", currency = "PHP", animate = true }: { data: TrendPoint[]; style?: CashFlowStyle; label?: string; currency?: string; animate?: boolean }) {
  const axis = useMemo(() => buildAxis(currency), [currency]);
  return (
    <div className="chart-frame" role="img" aria-label={label}>
      <ResponsiveContainer width="100%" height="100%">
        {style === "bar" ? (
          <BarChart data={data} margin={chartMargin} barGap={3}>
            {axis.grid}{axis.x}{axis.y}{axis.tooltip}
            <Bar dataKey="income" name="Income" fill="#21A66D" radius={[4, 4, 0, 0]} maxBarSize={24} isAnimationActive={animate} animationDuration={chartAnimationDuration} animationEasing="ease-out" />
            <Bar dataKey="expense" name="Expenses" fill="#CF7C5C" radius={[4, 4, 0, 0]} maxBarSize={24} isAnimationActive={animate} animationDuration={chartAnimationDuration} animationEasing="ease-out" />
          </BarChart>
        ) : style === "line" ? (
          <LineChart data={data} margin={chartMargin}>
            {axis.grid}{axis.x}{axis.y}{axis.tooltip}
            <Line type="linear" dataKey="income" name="Income" stroke="#21A66D" strokeWidth={2.4} dot={false} activeDot={{ r: 5, strokeWidth: 2, stroke: "#d9f8e8" }} isAnimationActive={animate} animationDuration={chartAnimationDuration} animationEasing="ease-out" />
            <Line type="linear" dataKey="expense" name="Expenses" stroke="#CF7C5C" strokeWidth={2.4} dot={false} activeDot={{ r: 5, strokeWidth: 2, stroke: "#ffe5db" }} isAnimationActive={animate} animationDuration={chartAnimationDuration} animationEasing="ease-out" />
          </LineChart>
        ) : (
          <AreaChart data={data} margin={chartMargin}>
            <defs>
              <linearGradient id="incomeFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#21A66D" stopOpacity={0.2} /><stop offset="100%" stopColor="#21A66D" stopOpacity={0.015} /></linearGradient>
              <linearGradient id="expenseFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#CF7C5C" stopOpacity={0.16} /><stop offset="100%" stopColor="#CF7C5C" stopOpacity={0.01} /></linearGradient>
            </defs>
            {axis.grid}{axis.x}{axis.y}{axis.tooltip}
            <Area type="monotone" dataKey="income" name="Income" stroke="#21A66D" strokeWidth={2.4} fill="url(#incomeFill)" activeDot={{ r: 5, strokeWidth: 2, stroke: "#d9f8e8" }} isAnimationActive={animate} animationDuration={chartAnimationDuration} animationEasing="ease-out" />
            <Area type="monotone" dataKey="expense" name="Expenses" stroke="#CF7C5C" strokeWidth={2.4} fill="url(#expenseFill)" activeDot={{ r: 5, strokeWidth: 2, stroke: "#ffe5db" }} isAnimationActive={animate} animationDuration={chartAnimationDuration} animationEasing="ease-out" />
          </AreaChart>
        )}
      </ResponsiveContainer>
    </div>
  );
});
