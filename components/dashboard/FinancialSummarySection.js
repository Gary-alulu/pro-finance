"use client";
// components/dashboard/FinancialSummarySection.js
// Section A: Financial Summary and Net Worth Hero Card.
// Every metric is clickable to reveal its mathematical formula and source records.

import { motion } from "framer-motion";
import {
  TrendingUp,
  TrendingDown,
  Calculator,
  ArrowUpRight,
  ArrowDownRight,
  Wallet,
  Landmark,
  PiggyBank,
  Briefcase,
  DollarSign,
  Receipt,
  Percent,
  Info,
} from "lucide-react";
import { formatCurrency } from "@/lib/finance/currency";

const STAGGER_ITEM = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

export default function FinancialSummarySection({
  financialPosition,
  cashFlow,
  currency = "KES",
  hideBalances = false,
  onOpenTrace,
  loading = false,
}) {
  const netWorth = financialPosition?.netWorth ?? null;
  const totalAssets = financialPosition?.totalAssets ?? null;
  const totalLiabilities = financialPosition?.totalLiabilities ?? null;
  const cashEquivalents = financialPosition?.cashAndEquivalents ?? null;
  const investmentValue = financialPosition?.investmentValue ?? null;
  const comparison = financialPosition?.comparison ?? null;

  const income = cashFlow?.income ?? null;
  const expenses = cashFlow?.expenses ?? null;
  const netCashFlow = cashFlow?.netCashFlow ?? null;
  const savingsRate = cashFlow?.savingsRate ?? null;

  const mask = (val, formatted) => {
    if (hideBalances) return "••••••";
    return formatted;
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {/* Net Worth Hero Card (Spans 2 columns on larger screens) */}
        <motion.div
          variants={STAGGER_ITEM}
          className="sm:col-span-2 relative overflow-hidden rounded-2xl p-6 flex flex-col justify-between border border-emerald-500/20 shadow-xl bg-gradient-to-br from-emerald-50 via-white to-emerald-100 dark:from-[#091a11] dark:via-[#11291b] dark:to-[#163824]"
        >
          <div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-mono uppercase tracking-wider text-[var(--color-text-secondary)]">
                Total Net Worth
              </span>
              <button
                onClick={() => onOpenTrace("netWorth")}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium text-[var(--color-positive-text)] bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 transition-colors"
              >
                <Calculator size={13} />
                <span>Explain calculation</span>
              </button>
            </div>

            {/* Net Worth Amount & Comparison */}
            <div className="mt-3 flex flex-wrap items-baseline gap-3">
              <span
                className={`text-3xl sm:text-4xl lg:text-5xl font-semibold tracking-tight text-[var(--color-text-primary)] transition-all ${
                  hideBalances ? "blur-md select-none" : ""
                }`}
              >
                {netWorth != null ? mask(netWorth, formatCurrency(netWorth, currency)) : "—"}
              </span>

              {comparison?.percentageChange && (
                <div
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${
                    comparison.isPositive
                      ? "bg-emerald-500/20 text-[var(--color-positive-text)] border border-emerald-500/30"
                      : "bg-red-500/20 text-[var(--color-negative-text)] border border-red-500/30"
                  }`}
                >
                  {comparison.isPositive ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
                  <span>{comparison.percentageChange}%</span>
                  <span className="text-[var(--color-text-secondary)] text-[10px] font-normal">vs last snapshot</span>
                </div>
              )}
            </div>

            {/* Assets vs Liabilities Sub-strip */}
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 mt-4 text-xs text-[var(--color-text-secondary)]">
              <button
                onClick={() => onOpenTrace("totalAssets")}
                className="hover:text-[var(--color-text-primary)] transition-colors flex items-center gap-1.5"
              >
                <span className="text-[var(--color-text-secondary)]">Total Assets:</span>
                <strong className={`text-[var(--color-positive-text)] font-mono ${hideBalances ? "blur-sm select-none" : ""}`}>
                  {totalAssets != null ? mask(totalAssets, formatCurrency(totalAssets, currency)) : "—"}
                </strong>
              </button>
              <span>·</span>
              <button
                onClick={() => onOpenTrace("totalLiabilities")}
                className="hover:text-[var(--color-text-primary)] transition-colors flex items-center gap-1.5"
              >
                <span className="text-[var(--color-text-secondary)]">Total Liabilities:</span>
                <strong className={`text-[var(--color-negative-text)] font-mono ${hideBalances ? "blur-sm select-none" : ""}`}>
                  {totalLiabilities != null ? mask(totalLiabilities, formatCurrency(totalLiabilities, currency)) : "—"}
                </strong>
              </button>
            </div>
          </div>

          {/* Disclosure */}
          <div className="flex items-center gap-1.5 mt-5 pt-3 border-t border-[var(--color-border-strong)] text-[11px] text-[var(--color-text-secondary)]">
            <Info size={12} className="flex-shrink-0" />
            <span>Deterministic sum of attributable assets minus outstanding liabilities.</span>
          </div>
        </motion.div>

        {/* Cash & Equivalents Card */}
        <motion.div
          variants={STAGGER_ITEM}
          onClick={() => onOpenTrace("cashAndEquivalents")}
          className="p-5 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface,#131d17)] hover:border-emerald-500/30 transition-all cursor-pointer flex flex-col justify-between group shadow-lg min-w-0 overflow-hidden"
        >
          <div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-mono uppercase tracking-wider text-[var(--color-text-tertiary)] break-words min-w-0">
                Cash & Equivalents
              </span>
              <div className="p-2 rounded-xl bg-[var(--color-surface-2)] text-[var(--color-positive-text)] group-hover:bg-emerald-500/10 transition-colors">
                <Wallet size={16} />
              </div>
            </div>
            <div className={`mt-3 text-xl sm:text-2xl font-semibold text-[var(--color-text-primary)] tracking-tight leading-tight break-words ${hideBalances ? "blur-md select-none" : ""}`}>
              {cashEquivalents != null ? mask(cashEquivalents, formatCurrency(cashEquivalents, currency)) : "—"}
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1 text-xs text-[var(--color-text-tertiary)] mt-4 pt-2 border-t border-[var(--color-border)]">
            <span>Liquid bank & cash accounts</span>
            <span className="text-[var(--color-positive-text)] group-hover:translate-x-0.5 transition-transform">Audit →</span>
          </div>
        </motion.div>

        {/* Investment Value Card */}
        <motion.div
          variants={STAGGER_ITEM}
          onClick={() => onOpenTrace("investmentValue")}
          className="p-5 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface,#131d17)] hover:border-emerald-500/30 transition-all cursor-pointer flex flex-col justify-between group shadow-lg min-w-0 overflow-hidden"
        >
          <div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-mono uppercase tracking-wider text-[var(--color-text-tertiary)] break-words min-w-0">
                Investments Portfolio
              </span>
              <div className="p-2 rounded-xl bg-[var(--color-surface-2)] text-[var(--color-positive-text)] group-hover:bg-emerald-500/10 transition-colors">
                <Briefcase size={16} />
              </div>
            </div>
            <div className={`mt-3 text-xl sm:text-2xl font-semibold text-[var(--color-text-primary)] tracking-tight leading-tight break-words ${hideBalances ? "blur-md select-none" : ""}`}>
              {investmentValue != null ? mask(investmentValue, formatCurrency(investmentValue, currency)) : "—"}
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1 text-xs text-[var(--color-text-tertiary)] mt-4 pt-2 border-t border-[var(--color-border)]">
            <span>Holdings at latest recorded price</span>
            <span className="text-[var(--color-positive-text)] group-hover:translate-x-0.5 transition-transform">Audit →</span>
          </div>
        </motion.div>
      </div>

      {/* Row 2: Cash Flow KPIs (Income, Expenses, Net Cash Flow, Savings Rate) */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        {/* Total Income */}
        <div
          onClick={() => onOpenTrace("cashFlow")}
          className="p-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface,#131d17)] hover:border-[var(--color-border-strong)] transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-xs text-[var(--color-text-tertiary)]">
            <span>Period Income</span>
            <ArrowUpRight size={15} className="text-[var(--color-positive-text)]" />
          </div>
          <div className={`text-lg sm:text-xl font-semibold text-[var(--color-text-primary)] mt-2 ${hideBalances ? "blur-sm select-none" : ""}`}>
            {income != null ? mask(income, formatCurrency(income, currency)) : "—"}
          </div>
          <span className="text-[11px] text-[var(--color-text-tertiary)] mt-1 block">Confirmed inflows</span>
        </div>

        {/* Total Expenses */}
        <div
          onClick={() => onOpenTrace("cashFlow")}
          className="p-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface,#131d17)] hover:border-[var(--color-border-strong)] transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-xs text-[var(--color-text-tertiary)]">
            <span>Period Expenses</span>
            <ArrowDownRight size={15} className="text-[var(--color-negative-text)]" />
          </div>
          <div className={`text-lg sm:text-xl font-semibold text-[var(--color-text-primary)] mt-2 ${hideBalances ? "blur-sm select-none" : ""}`}>
            {expenses != null ? mask(expenses, formatCurrency(expenses, currency)) : "—"}
          </div>
          <span className="text-[11px] text-[var(--color-text-tertiary)] mt-1 block">Confirmed consumption</span>
        </div>

        {/* Net Cash Flow */}
        <div
          onClick={() => onOpenTrace("netCashFlow")}
          className="p-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface,#131d17)] hover:border-[var(--color-border-strong)] transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-xs text-[var(--color-text-tertiary)]">
            <span>Net Cash Flow</span>
            <PiggyBank size={15} className="text-[var(--color-positive-text)]" />
          </div>
          <div
            className={`text-lg sm:text-xl font-semibold mt-2 ${
              netCashFlow && Number(netCashFlow) >= 0 ? "text-[var(--color-positive-text)]" : "text-[var(--color-negative-text)]"
            } ${hideBalances ? "blur-sm select-none" : ""}`}
          >
            {netCashFlow != null ? mask(netCashFlow, formatCurrency(netCashFlow, currency)) : "—"}
          </div>
          <span className="text-[11px] text-[var(--color-text-tertiary)] mt-1 block">Income − Expenses</span>
        </div>

        {/* Savings Rate */}
        <div
          onClick={() => onOpenTrace("savingsRate")}
          className="p-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface,#131d17)] hover:border-[var(--color-border-strong)] transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-xs text-[var(--color-text-tertiary)]">
            <span>Savings Rate</span>
            <Percent size={15} className="text-[var(--color-positive-text)]" />
          </div>
          <div className="text-lg sm:text-xl font-semibold text-[var(--color-text-primary)] mt-2">
            {savingsRate !== null ? `${savingsRate}%` : "—"}
          </div>
          <span className="text-[11px] text-[var(--color-text-tertiary)] mt-1 block">Net flow / income ratio</span>
        </div>
      </div>
    </div>
  );
}
