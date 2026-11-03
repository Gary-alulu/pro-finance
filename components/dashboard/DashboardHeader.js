"use client";
// components/dashboard/DashboardHeader.js
// Header command bar with currency selector, period filters, comparison toggle,
// hide-values switch, export button, and layout controls.

import { useState } from "react";
import {
  Calendar,
  Eye,
  EyeOff,
  RefreshCw,
  Download,
  ShieldAlert,
  ShieldCheck,
  Check,
  SlidersHorizontal,
  ChevronDown,
} from "lucide-react";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import { SUPPORTED_CURRENCIES } from "@/lib/finance/currency";

const PERIOD_OPTIONS = [
  { value: "7d", label: "7D" },
  { value: "30d", label: "30D" },
  { value: "90d", label: "90D" },
  { value: "6m", label: "6M" },
  { value: "12m", label: "1Y" },
  { value: "fy", label: "YTD / FY" },
  { value: "all", label: "All" },
];

export default function DashboardHeader({
  reportingCurrency,
  onCurrencyChange,
  period,
  onPeriodChange,
  compareEnabled,
  onToggleCompare,
  hideBalances,
  onToggleHideBalances,
  onRefresh,
  onOpenExport,
  dataQuality,
  isRefreshing,
  dashboardLayout,
  onChangeLayout,
}) {
  const [currencyMenuOpen, setCurrencyMenuOpen] = useState(false);
  const [layoutMenuOpen, setLayoutMenuOpen] = useState(false);

  // Today's formatted Kenyan date context: e.g. "MONDAY, 02 NOVEMBER 2026"
  const todayFormatted = new Intl.DateTimeFormat("en-KE", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  })
    .format(new Date())
    .toUpperCase();

  return (
    <div className="space-y-4">
      {/* Top context line & primary controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2 text-xs font-mono tracking-wider uppercase text-white/50">
            <span>{todayFormatted}</span>
            <span>·</span>
            <span>Personal Account</span>
            <span>·</span>
            <span className="text-emerald-400 font-medium">Kenya · KES Default</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-white mt-1">
            Financial Dashboard & Overview
          </h1>
        </div>

        {/* Action buttons toolbar */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Currency selector dropdown */}
          <div className="relative">
            <button
              onClick={() => setCurrencyMenuOpen((v) => !v)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono font-medium rounded-xl border border-[var(--color-border)] bg-white/5 hover:bg-white/10 text-white transition-colors"
            >
              <span>{reportingCurrency}</span>
              <ChevronDown size={14} className="text-white/50" />
            </button>

            {currencyMenuOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setCurrencyMenuOpen(false)}
                />
                <div
                  className="absolute right-0 mt-1 z-50 w-44 rounded-xl border border-[var(--color-border)] p-1.5 shadow-xl text-xs space-y-0.5"
                  style={{ background: "var(--color-surface, #131d17)" }}
                >
                  <div className="px-2 py-1 text-[10px] uppercase font-mono text-white/40">
                    Reporting Currency
                  </div>
                  {SUPPORTED_CURRENCIES.map((c) => (
                    <button
                      key={c.code}
                      onClick={() => {
                        onCurrencyChange(c.code);
                        setCurrencyMenuOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left transition-colors ${
                        reportingCurrency === c.code
                          ? "bg-emerald-500/15 text-emerald-400 font-semibold"
                          : "text-white/80 hover:bg-white/5"
                      }`}
                    >
                      <span>
                        {c.code} <span className="text-white/40">({c.symbol})</span>
                      </span>
                      {reportingCurrency === c.code && <Check size={13} />}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Hide/reveal values toggle */}
          <button
            onClick={onToggleHideBalances}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-xl border border-[var(--color-border)] bg-white/5 hover:bg-white/10 text-white/80 transition-colors"
            title={hideBalances ? "Reveal sensitive balances" : "Hide sensitive balances"}
          >
            {hideBalances ? <EyeOff size={14} className="text-amber-400" /> : <Eye size={14} />}
            <span className="hidden sm:inline">{hideBalances ? "Balances Masked" : "Hide"}</span>
          </button>

          {/* Refresh button */}
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className="p-2 rounded-xl border border-[var(--color-border)] bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition-colors"
            title="Revalidate financial calculations & freshness"
          >
            <RefreshCw size={14} className={isRefreshing ? "animate-spin text-emerald-400" : ""} />
          </button>

          {/* Export button */}
          <Button
            variant="secondary"
            size="sm"
            onClick={onOpenExport}
            className="gap-1.5 text-xs font-medium rounded-xl"
          >
            <Download size={14} />
            <span className="hidden sm:inline">Export</span>
          </Button>
        </div>
      </div>

      {/* Filter bar: Period selector & Comparison toggle & Quality status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-[var(--color-border)]">
        {/* Period pill selector */}
        <div className="flex items-center gap-1 p-1 rounded-xl bg-black/30 border border-white/5 w-fit">
          {PERIOD_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => onPeriodChange(opt.value)}
              className={`px-2.5 py-1 rounded-lg text-xs font-mono font-medium transition-all ${
                period === opt.value
                  ? "bg-emerald-500 text-black shadow-sm font-semibold"
                  : "text-white/60 hover:text-white hover:bg-white/5"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Comparison toggle & Data quality status */}
        <div className="flex items-center gap-3">
          <button
            onClick={onToggleCompare}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium transition-colors border ${
              compareEnabled
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                : "border-white/10 bg-white/5 text-white/50 hover:text-white"
            }`}
          >
            <Calendar size={13} />
            <span>Compare with previous period</span>
          </button>

          {/* Data freshness badge */}
          {dataQuality && (
            <div className="hidden md:flex items-center gap-1.5 text-xs text-white/50">
              {dataQuality.isPartial ? (
                <span className="flex items-center gap-1 text-amber-400">
                  <ShieldAlert size={14} />
                  <span>{dataQuality.missingValuationsCount + dataQuality.missingBalancesCount} items need review</span>
                </span>
              ) : (
                <span className="flex items-center gap-1 text-emerald-400">
                  <ShieldCheck size={14} />
                  <span>100% Verified</span>
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
