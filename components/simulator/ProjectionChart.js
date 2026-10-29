"use client";
// components/simulator/ProjectionChart.js
// Interactive multi-curve wealth trajectory visualization using Recharts.

import { useState } from "react";
import {
  AreaChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { formatCurrency } from "@/lib/finance/currency";
import { Sparkles } from "lucide-react";

function CustomTooltip({ active, payload, label, currency, showInflationAdjusted }) {
  if (!active || !payload?.length) return null;

  return (
    <div
      className="p-3.5 rounded-xl text-xs space-y-2 min-w-56"
      style={{
        background: "var(--color-surface)",
        border: "1px solid var(--color-border)",
        boxShadow: "var(--shadow-lg, 0 10px 25px -5px rgba(0, 0, 0, 0.3))",
      }}
    >
      <div className="flex items-center justify-between border-b pb-1.5" style={{ borderColor: "var(--color-border)" }}>
        <span className="font-semibold text-sm" style={{ color: "var(--color-text-primary)" }}>
          {label}
        </span>
        <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded" style={{ background: "var(--color-surface-2)", color: "var(--color-text-secondary)" }}>
          Projected
        </span>
      </div>

      <div className="space-y-1.5">
        {payload.map((entry) => (
          <div key={entry.dataKey} className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-1.5">
              <span
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ backgroundColor: entry.color }}
              />
              <span style={{ color: "var(--color-text-secondary)" }}>
                {entry.name}:
              </span>
            </div>
            <span className="font-semibold font-mono" style={{ color: "var(--color-text-primary)" }}>
              {formatCurrency(entry.value, currency)}
            </span>
          </div>
        ))}
      </div>

      {showInflationAdjusted && (
        <p className="text-[10px] pt-1 border-t italic" style={{ borderColor: "var(--color-border)", color: "var(--color-text-tertiary)" }}>
          Real values discounted for assumed inflation.
        </p>
      )}
    </div>
  );
}

export default function ProjectionChart({
  projections,
  currency = "KES",
  timeHorizonYears = 5,
}) {
  const [viewMode, setViewMode] = useState("yearly"); // "yearly" | "monthly"
  const [showReal, setShowReal] = useState(false);
  const [activeCurves, setActiveCurves] = useState({
    netWorth: true,
    investments: true,
    contributions: true,
    totalAssets: false,
    liabilities: true,
  });

  const data = projections ? projections[viewMode] || [] : [];

  function toggleCurve(key) {
    setActiveCurves((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  return (
    <div
      className="rounded-2xl p-6 flex flex-col gap-5"
      style={{
        background: "var(--color-surface)",
        border: "1px solid var(--color-border)",
        boxShadow: "var(--shadow-sm)",
      }}
    >
      {/* Header controls */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold" style={{ color: "var(--color-text-primary)" }}>
              Projected Wealth Trajectory
            </h3>
            <span
              className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
              style={{
                background: "rgba(16, 185, 129, 0.12)",
                color: "#10b981",
              }}
            >
              {timeHorizonYears} Year Outlook
            </span>
          </div>
          <p className="text-xs mt-0.5" style={{ color: "var(--color-text-tertiary)" }}>
            Deterministic simulation with compounding and contribution growth
          </p>
        </div>

        {/* View toggles */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Nominal vs Real Toggle */}
          <button
            type="button"
            onClick={() => setShowReal((r) => !r)}
            className={`text-xs px-3 py-1.5 rounded-lg border font-medium transition-all flex items-center gap-1.5 ${
              showReal
                ? "bg-amber-500/10 border-amber-500/30 text-amber-500 font-semibold"
                : "border-[var(--color-border)] hover:bg-[var(--color-surface-2)] text-[var(--color-text-secondary)]"
            }`}
            title="Adjust future figures for expected inflation"
          >
            <Sparkles size={13} />
            {showReal ? "Inflation-Adjusted (Real)" : "Nominal"}
          </button>

          {/* Monthly vs Yearly Toggle */}
          <div
            className="flex items-center p-0.5 rounded-lg border"
            style={{
              background: "var(--color-surface-2)",
              borderColor: "var(--color-border)",
            }}
          >
            <button
              type="button"
              onClick={() => setViewMode("yearly")}
              className={`text-xs px-2.5 py-1 rounded-md transition-all font-medium ${
                viewMode === "yearly"
                  ? "bg-[var(--color-surface)] text-[var(--color-text-primary)] shadow-sm font-semibold"
                  : "text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)]"
              }`}
            >
              Yearly
            </button>
            <button
              type="button"
              onClick={() => setViewMode("monthly")}
              className={`text-xs px-2.5 py-1 rounded-md transition-all font-medium ${
                viewMode === "monthly"
                  ? "bg-[var(--color-surface)] text-[var(--color-text-primary)] shadow-sm font-semibold"
                  : "text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)]"
              }`}
            >
              Monthly
            </button>
          </div>
        </div>
      </div>

      {/* Chart Canvas */}
      <div className="w-full h-80 min-h-[320px]">
        {data.length === 0 ? (
          <div className="h-full flex items-center justify-center text-xs" style={{ color: "var(--color-text-tertiary)" }}>
            Calculating simulation trajectory…
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="netWorthGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="invGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0} />
                </linearGradient>
              </defs>

              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="var(--color-border)"
                opacity={0.4}
              />

              <XAxis
                dataKey="label"
                tick={{ fontSize: 11, fill: "var(--color-text-tertiary)" }}
                axisLine={{ stroke: "var(--color-border)" }}
                tickLine={false}
              />

              <YAxis
                tick={{ fontSize: 11, fill: "var(--color-text-tertiary)" }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => {
                  if (Math.abs(v) >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
                  if (Math.abs(v) >= 1_000) return `${(v / 1_000).toFixed(0)}k`;
                  return v;
                }}
                width={50}
              />

              <Tooltip
                content={
                  <CustomTooltip
                    currency={currency}
                    showInflationAdjusted={showReal}
                  />
                }
              />

              {/* Primary Net Worth Curve */}
              {activeCurves.netWorth && (
                <Area
                  type="monotone"
                  dataKey={showReal ? "realNetWorth" : "netWorth"}
                  name={showReal ? "Real Net Worth" : "Net Worth"}
                  stroke="#10b981"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#netWorthGrad)"
                />
              )}

              {/* Investment Portfolio Curve */}
              {activeCurves.investments && (
                <Line
                  type="monotone"
                  dataKey="investments"
                  name="Investments"
                  stroke="#6366f1"
                  strokeWidth={2}
                  dot={false}
                />
              )}

              {/* Cumulative Contributions Curve */}
              {activeCurves.contributions && (
                <Line
                  type="monotone"
                  dataKey="contributions"
                  name="Contributions"
                  stroke="#38bdf8"
                  strokeWidth={1.5}
                  strokeDasharray="4 4"
                  dot={false}
                />
              )}

              {/* Total Liabilities Curve */}
              {activeCurves.liabilities && (
                <Line
                  type="monotone"
                  dataKey="liabilities"
                  name="Debt Balance"
                  stroke="#ef4444"
                  strokeWidth={1.5}
                  dot={false}
                />
              )}
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Interactive Legend / Curve Filters */}
      <div className="flex items-center justify-between border-t pt-3 flex-wrap gap-2" style={{ borderColor: "var(--color-border)" }}>
        <span className="text-[11px] font-medium" style={{ color: "var(--color-text-tertiary)" }}>
          Visible Projections:
        </span>
        <div className="flex items-center gap-3 flex-wrap">
          <button
            type="button"
            onClick={() => toggleCurve("netWorth")}
            className={`text-xs flex items-center gap-1.5 transition-opacity ${
              activeCurves.netWorth ? "opacity-100" : "opacity-40"
            }`}
          >
            <span className="w-2.5 h-2.5 rounded-full bg-[#10b981]" />
            <span style={{ color: "var(--color-text-secondary)" }}>Net Worth</span>
          </button>

          <button
            type="button"
            onClick={() => toggleCurve("investments")}
            className={`text-xs flex items-center gap-1.5 transition-opacity ${
              activeCurves.investments ? "opacity-100" : "opacity-40"
            }`}
          >
            <span className="w-2.5 h-2.5 rounded-full bg-[#6366f1]" />
            <span style={{ color: "var(--color-text-secondary)" }}>Investments</span>
          </button>

          <button
            type="button"
            onClick={() => toggleCurve("contributions")}
            className={`text-xs flex items-center gap-1.5 transition-opacity ${
              activeCurves.contributions ? "opacity-100" : "opacity-40"
            }`}
          >
            <span className="w-2.5 h-1 border-t-2 border-dashed border-[#38bdf8]" />
            <span style={{ color: "var(--color-text-secondary)" }}>Contributions</span>
          </button>

          <button
            type="button"
            onClick={() => toggleCurve("liabilities")}
            className={`text-xs flex items-center gap-1.5 transition-opacity ${
              activeCurves.liabilities ? "opacity-100" : "opacity-40"
            }`}
          >
            <span className="w-2.5 h-2.5 rounded-full bg-[#ef4444]" />
            <span style={{ color: "var(--color-text-secondary)" }}>Debt</span>
          </button>
        </div>
      </div>
    </div>
  );
}
