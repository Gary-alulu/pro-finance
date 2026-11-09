"use client";
// components/dashboard/FinancialTrendsSection.js
// Section E: Financial Trends & Historical Analysis.
// Multi-tab interactive chart: Net Worth trend, Assets vs Debt, and Monthly Cash Flow.

import { useState } from "react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { TrendingUp, Calendar, Layers, CheckCircle2, Info } from "lucide-react";
import { formatCurrency } from "@/lib/finance/currency";
import EmptyState from "@/components/ui/EmptyState";

function ChartTooltip({ active, payload, label, currency }) {
  if (!active || !payload?.length) return null;
  return (
    <div
      className="p-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-xs shadow-xl space-y-1.5"
    >
      <div className="font-mono text-[var(--color-text-tertiary)] text-[11px]">{label}</div>
      {payload.map((item, idx) => (
        <div key={idx} className="flex items-center justify-between gap-4 font-mono">
          <span style={{ color: item.color }}>{item.name}:</span>
          <span className="font-semibold text-[var(--color-text-primary)]">
            {formatCurrency(item.value, currency)}
          </span>
        </div>
      ))}
    </div>
  );
}

export default function FinancialTrendsSection({
  trends,
  currency = "KES",
  hideBalances = false,
  period = "12m",
}) {
  const [activeChart, setActiveChart] = useState("netWorth"); // "netWorth" | "assetsLiabilities" | "cashFlow"
  const [selectedPoint, setSelectedPoint] = useState(null);

  const netWorthData = trends?.netWorthTrend || [];
  const cashFlowData = trends?.cashFlowTrend || [];
  const comparison = trends?.comparison;

  const hasNetWorthData = netWorthData.length > 0;
  const hasCashFlowData = cashFlowData.length > 0;

  return (
    <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface,#131d17)] p-6 space-y-6 shadow-xl">
      {/* Header and Chart Type Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold tracking-tight text-[var(--color-text-primary)]">Financial Trends & History</h2>
            <span className="text-xs font-mono text-[var(--color-text-tertiary)]">Historical Trajectory & Analysis</span>
          </div>
          <p className="text-xs text-[var(--color-text-tertiary)] mt-0.5">
            Preserves dated financial snapshots. Past data is never silently reconstructed.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center p-1 rounded-xl bg-[var(--color-surface-3)] border border-[var(--color-border)] self-start sm:self-auto">
          {[
            { id: "netWorth", label: "Net Worth" },
            { id: "assetsLiabilities", label: "Assets vs Debt" },
            { id: "cashFlow", label: "Cash Flow" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveChart(tab.id);
                setSelectedPoint(null);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeChart === tab.id
                  ? "bg-emerald-500 text-black font-semibold shadow"
                  : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Comparison Badge / Context */}
      {activeChart === "netWorth" && comparison && (
        <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-xl bg-[var(--color-surface-2)] border border-[var(--color-border)] text-xs">
          <div className="flex items-center gap-2">
            <span className="text-[var(--color-text-tertiary)]">Trajectory in this period:</span>
            <span
              className={`font-semibold font-mono ${
                comparison.isPositive ? "text-[var(--color-positive-text)]" : "text-[var(--color-negative-text)]"
              }`}
            >
              {comparison.isPositive ? "+" : ""}
              {comparison.percentageChange}% ({formatCurrency(comparison.absoluteDelta, currency)})
            </span>
          </div>
          <span className="text-[var(--color-text-tertiary)] font-mono text-[11px]">
            {netWorthData.length} snapshot point{netWorthData.length === 1 ? "" : "s"}
          </span>
        </div>
      )}

      {/* Main Chart Area */}
      <div className="h-72 w-full">
        {activeChart === "netWorth" ? (
          hasNetWorthData ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={netWorthData}
                onClick={(e) => {
                  if (e && e.activePayload && e.activePayload.length) {
                    setSelectedPoint({
                      date: e.activeLabel,
                      data: e.activePayload[0].payload,
                    });
                  }
                }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis
                  dataKey="date"
                  stroke="var(--color-border-strong)"
                  tick={{ fontSize: 11, fill: "var(--color-text-tertiary)" }}
                />
                <YAxis
                  stroke="var(--color-border-strong)"
                  tick={{ fontSize: 11, fill: "var(--color-text-tertiary)" }}
                  tickFormatter={(val) =>
                    val >= 1000000
                      ? `${(val / 1000000).toFixed(1)}M`
                      : val >= 1000
                      ? `${(val / 1000).toFixed(0)}k`
                      : val
                  }
                />
                <Tooltip content={<ChartTooltip currency={currency} />} />
                <Line
                  type="monotone"
                  dataKey="netWorth"
                  name="Net Worth"
                  stroke="#10b981"
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: "#10b981" }}
                  activeDot={{ r: 6, fill: "#34d399" }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex flex-col items-center justify-center border border-dashed border-[var(--color-border)] rounded-xl p-6 text-center">
              <p className="text-sm font-medium text-[var(--color-text-secondary)]">No historical snapshots recorded yet</p>
              <p className="text-xs text-[var(--color-text-tertiary)] mt-1 max-w-sm">
                Historical trends will appear as snapshots are saved automatically or recorded over time.
              </p>
            </div>
          )
        ) : activeChart === "assetsLiabilities" ? (
          hasNetWorthData ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={netWorthData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis
                  dataKey="date"
                  stroke="var(--color-border-strong)"
                  tick={{ fontSize: 11, fill: "var(--color-text-tertiary)" }}
                />
                <YAxis
                  stroke="var(--color-border-strong)"
                  tick={{ fontSize: 11, fill: "var(--color-text-tertiary)" }}
                  tickFormatter={(val) =>
                    val >= 1000000
                      ? `${(val / 1000000).toFixed(1)}M`
                      : val >= 1000
                      ? `${(val / 1000).toFixed(0)}k`
                      : val
                  }
                />
                <Tooltip content={<ChartTooltip currency={currency} />} />
                <Legend
                  wrapperStyle={{ fontSize: 12, paddingTop: 10 }}
                  formatter={(value) => <span className="text-[var(--color-text-secondary)]">{value}</span>}
                />
                <Line
                  type="monotone"
                  dataKey="totalAssets"
                  name="Total Assets"
                  stroke="#34d399"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="totalLiabilities"
                  name="Total Liabilities"
                  stroke="#f43f5e"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex flex-col items-center justify-center border border-dashed border-[var(--color-border)] rounded-xl p-6 text-center">
              <p className="text-sm font-medium text-[var(--color-text-secondary)]">No balance sheet snapshots found</p>
              <p className="text-xs text-[var(--color-text-tertiary)] mt-1">Snapshot balance history will appear here.</p>
            </div>
          )
        ) : hasCashFlowData ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={cashFlowData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis
                dataKey="label"
                stroke="var(--color-border-strong)"
                tick={{ fontSize: 11, fill: "var(--color-text-tertiary)" }}
              />
              <YAxis
                stroke="var(--color-border-strong)"
                tick={{ fontSize: 11, fill: "var(--color-text-tertiary)" }}
                tickFormatter={(val) =>
                  val >= 1000000
                    ? `${(val / 1000000).toFixed(1)}M`
                    : val >= 1000
                    ? `${(val / 1000).toFixed(0)}k`
                    : val
                }
              />
              <Tooltip content={<ChartTooltip currency={currency} />} />
              <Legend
                wrapperStyle={{ fontSize: 12, paddingTop: 10 }}
                formatter={(value) => <span className="text-[var(--color-text-secondary)]">{value}</span>}
              />
              <Bar dataKey="income" name="Income" fill="#10b981" radius={[4, 4, 0, 0]} />
              <Bar dataKey="expenses" name="Expenses" fill="#f43f5e" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full flex flex-col items-center justify-center border border-dashed border-[var(--color-border)] rounded-xl p-6 text-center">
            <p className="text-sm font-medium text-[var(--color-text-secondary)]">No monthly cash flow transactions</p>
            <p className="text-xs text-[var(--color-text-tertiary)] mt-1">Monthly flows will render as transactions occur.</p>
          </div>
        )}
      </div>

      {/* Point inspection card when user clicks a data point */}
      {selectedPoint && (
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs flex items-center justify-between animate-fade-in">
          <div>
            <span className="font-semibold text-[var(--color-text-primary)]">Inspecting Date: {selectedPoint.date}</span>
            <div className="flex items-center gap-4 text-[var(--color-text-secondary)] mt-0.5 font-mono">
              <span>Net Worth: <strong>{formatCurrency(selectedPoint.data.netWorth, currency)}</strong></span>
              {selectedPoint.data.totalAssets && (
                <span>Assets: <strong>{formatCurrency(selectedPoint.data.totalAssets, currency)}</strong></span>
              )}
              {selectedPoint.data.totalLiabilities && (
                <span>Liabilities: <strong>{formatCurrency(selectedPoint.data.totalLiabilities, currency)}</strong></span>
              )}
            </div>
          </div>
          <button
            onClick={() => setSelectedPoint(null)}
            className="text-xs text-[var(--color-positive-text)] hover:text-[var(--color-positive-text)] underline"
          >
            Clear inspection
          </button>
        </div>
      )}
    </div>
  );
}
