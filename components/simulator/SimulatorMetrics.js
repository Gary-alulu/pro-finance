"use client";
// components/simulator/SimulatorMetrics.js
// Summary cards showing deterministic outcomes from the projection engine.

import { formatCurrency } from "@/lib/finance/currency";
import { TrendingUp, PiggyBank, ShieldCheck, ArrowUpRight } from "lucide-react";

export default function SimulatorMetrics({ summary, currency = "KES", timeHorizonYears = 5 }) {
  if (!summary) return null;

  const nwGrowthNum = Number(summary.netWorthGrowth);
  const isPositiveGrowth = nwGrowthNum >= 0;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* 1. Final Projected Net Worth */}
      <div
        className="rounded-2xl p-5 flex flex-col justify-between"
        style={{
          background: "var(--color-surface)",
          border: "1px solid var(--color-border)",
          boxShadow: "var(--shadow-sm)",
        }}
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium" style={{ color: "var(--color-text-secondary)" }}>
            Projected Net Worth ({timeHorizonYears}y)
          </span>
          <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-emerald-500/10 text-emerald-500">
            <TrendingUp size={16} />
          </div>
        </div>

        <div className="mt-3">
          <p className="text-2xl font-bold font-mono tracking-tight" style={{ color: "var(--color-text-primary)" }}>
            {formatCurrency(summary.finalNetWorth, currency)}
          </p>
          <p className="text-xs mt-1 flex items-center gap-1 font-mono" style={{ color: "var(--color-text-tertiary)" }}>
            <span>Real (adj. inflation):</span>
            <span className="font-semibold text-amber-500">
              {formatCurrency(summary.finalRealNetWorth, currency)}
            </span>
          </p>
        </div>
      </div>

      {/* 2. Net Worth Growth */}
      <div
        className="rounded-2xl p-5 flex flex-col justify-between"
        style={{
          background: "var(--color-surface)",
          border: "1px solid var(--color-border)",
          boxShadow: "var(--shadow-sm)",
        }}
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium" style={{ color: "var(--color-text-secondary)" }}>
            Projected Wealth Growth
          </span>
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
            isPositiveGrowth ? "bg-emerald-500/10 text-emerald-500" : "bg-red-500/10 text-red-500"
          }`}>
            <ArrowUpRight size={16} />
          </div>
        </div>

        <div className="mt-3">
          <p className="text-2xl font-bold font-mono tracking-tight" style={{
            color: isPositiveGrowth ? "#10b981" : "#ef4444"
          }}>
            {isPositiveGrowth ? "+" : ""}{formatCurrency(summary.netWorthGrowth, currency)}
          </p>
          <p className="text-xs mt-1" style={{ color: "var(--color-text-tertiary)" }}>
            {isPositiveGrowth ? "+" : ""}{summary.netWorthGrowthPct}% vs starting records
          </p>
        </div>
      </div>

      {/* 3. Investment Portfolio & Gains */}
      <div
        className="rounded-2xl p-5 flex flex-col justify-between"
        style={{
          background: "var(--color-surface)",
          border: "1px solid var(--color-border)",
          boxShadow: "var(--shadow-sm)",
        }}
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium" style={{ color: "var(--color-text-secondary)" }}>
            Ending Investment Value
          </span>
          <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-indigo-500/10 text-indigo-500">
            <PiggyBank size={16} />
          </div>
        </div>

        <div className="mt-3">
          <p className="text-2xl font-bold font-mono tracking-tight" style={{ color: "var(--color-text-primary)" }}>
            {formatCurrency(summary.finalInvestments, currency)}
          </p>
          <p className="text-xs mt-1 font-mono" style={{ color: "var(--color-text-tertiary)" }}>
            Includes <span className="text-indigo-400 font-semibold">{formatCurrency(summary.cumulativeInvestmentGains, currency)}</span> in gains
          </p>
        </div>
      </div>

      {/* 4. Total Contributions & Debt Status */}
      <div
        className="rounded-2xl p-5 flex flex-col justify-between"
        style={{
          background: "var(--color-surface)",
          border: "1px solid var(--color-border)",
          boxShadow: "var(--shadow-sm)",
        }}
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium" style={{ color: "var(--color-text-secondary)" }}>
            Total Contributions
          </span>
          <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-sky-500/10 text-sky-500">
            <ShieldCheck size={16} />
          </div>
        </div>

        <div className="mt-3">
          <p className="text-2xl font-bold font-mono tracking-tight" style={{ color: "var(--color-text-primary)" }}>
            {formatCurrency(summary.totalContributions, currency)}
          </p>
          <p className="text-xs mt-1" style={{ color: "var(--color-text-tertiary)" }}>
            {summary.debtFreeYear !== null ? (
              <span className="text-emerald-500 font-medium">Debt-free in {summary.debtFreeYear} years</span>
            ) : (
              <span>Remaining debt: {formatCurrency(summary.finalLiabilities, currency)}</span>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}
