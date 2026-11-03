"use client";
// components/dashboard/CashFlowSection.js
// Section C: Cash Flow Overview with monthly averages, savings rate,
// recurring commitments, and largest qualifying expense.

import Link from "next/link";
import {
  ArrowUpRight,
  ArrowDownRight,
  PiggyBank,
  Repeat,
  AlertTriangle,
  Info,
  Calendar,
  Layers,
} from "lucide-react";
import { formatCurrency } from "@/lib/finance/currency";

export default function CashFlowSection({
  cashFlow,
  currency = "KES",
  hideBalances = false,
  onOpenTrace,
}) {
  const income = cashFlow?.income || "0.00";
  const expenses = cashFlow?.expenses || "0.00";
  const netCashFlow = cashFlow?.netCashFlow || "0.00";
  const avgIncome = cashFlow?.averageMonthlyIncome || "0.00";
  const avgExpenses = cashFlow?.averageMonthlyExpenses || "0.00";
  const savingsRate = cashFlow?.savingsRate;
  const recurring = cashFlow?.recurringExpenses || "0.00";
  const largest = cashFlow?.largestExpense;
  const comparison = cashFlow?.comparison;

  const mask = (val, formatted) => (hideBalances ? "••••••" : formatted);

  return (
    <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface,#131d17)] p-6 space-y-6 shadow-xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold tracking-tight text-white">Cash Flow Overview</h2>
            <span className="text-xs font-mono text-white/40">Inflows, Outflows & Savings Efficiency</span>
          </div>
          <p className="text-xs text-white/50 mt-0.5">
            Internal transfers and investment allocations are strictly excluded from consumption expenditure.
          </p>
        </div>

        <Link
          href="/transactions"
          className="text-xs text-emerald-400 hover:text-emerald-300 font-medium inline-flex items-center gap-1 self-start sm:self-auto"
        >
          Detailed Transaction Ledger →
        </Link>
      </div>

      {/* Grid of Cash Flow Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Income vs Prior */}
        <div className="p-4 rounded-xl bg-black/30 border border-white/5 space-y-1">
          <div className="flex items-center justify-between text-xs text-white/50">
            <span>Period Income</span>
            <ArrowUpRight size={15} className="text-emerald-400" />
          </div>
          <div className={`text-xl font-semibold text-white font-mono ${hideBalances ? "blur-sm select-none" : ""}`}>
            {mask(income, formatCurrency(income, currency))}
          </div>
          <div className="flex items-center justify-between text-[11px] text-white/40 pt-1">
            <span>Monthly avg: {mask(avgIncome, formatCurrency(avgIncome, currency))}</span>
            {comparison?.incomeChangePct && (
              <span className={Number(comparison.incomeChangePct) >= 0 ? "text-emerald-400" : "text-rose-400"}>
                {comparison.incomeChangePct}%
              </span>
            )}
          </div>
        </div>

        {/* Expenses vs Prior */}
        <div className="p-4 rounded-xl bg-black/30 border border-white/5 space-y-1">
          <div className="flex items-center justify-between text-xs text-white/50">
            <span>Period Expenses</span>
            <ArrowDownRight size={15} className="text-rose-400" />
          </div>
          <div className={`text-xl font-semibold text-white font-mono ${hideBalances ? "blur-sm select-none" : ""}`}>
            {mask(expenses, formatCurrency(expenses, currency))}
          </div>
          <div className="flex items-center justify-between text-[11px] text-white/40 pt-1">
            <span>Monthly avg: {mask(avgExpenses, formatCurrency(avgExpenses, currency))}</span>
            {comparison?.expensesChangePct && (
              <span className={Number(comparison.expensesChangePct) <= 0 ? "text-emerald-400" : "text-rose-400"}>
                {comparison.expensesChangePct}%
              </span>
            )}
          </div>
        </div>

        {/* Savings Rate */}
        <div className="p-4 rounded-xl bg-black/30 border border-white/5 space-y-1">
          <div className="flex items-center justify-between text-xs text-white/50">
            <span>Savings Rate</span>
            <PiggyBank size={15} className="text-emerald-400" />
          </div>
          <div className="text-xl font-semibold text-emerald-400 font-mono">
            {savingsRate !== null ? `${savingsRate}%` : "No baseline"}
          </div>
          <div className="text-[11px] text-white/40 pt-1">
            <span>Net Flow / Eligible Income</span>
          </div>
        </div>

        {/* Recurring Obligations */}
        <div className="p-4 rounded-xl bg-black/30 border border-white/5 space-y-1">
          <div className="flex items-center justify-between text-xs text-white/50">
            <span>Recurring Obligations</span>
            <Repeat size={15} className="text-amber-400" />
          </div>
          <div className={`text-xl font-semibold text-white font-mono ${hideBalances ? "blur-sm select-none" : ""}`}>
            {mask(recurring, formatCurrency(recurring, currency))}
          </div>
          <div className="text-[11px] text-white/40 pt-1">
            <span>Subscriptions & recurring fees</span>
          </div>
        </div>
      </div>

      {/* Row 2: Largest Expense & Category Highlights */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Largest Qualifying Expense */}
        <div className="p-4 rounded-xl bg-black/20 border border-white/5 lg:col-span-1 flex flex-col justify-between">
          <span className="text-xs font-mono uppercase tracking-wider text-white/40 block mb-2">
            Largest Qualifying Outflow
          </span>
          {largest ? (
            <div className="space-y-1">
              <div className="text-sm font-semibold text-white">{largest.description}</div>
              <div className={`text-lg font-bold text-rose-400 font-mono ${hideBalances ? "blur-sm select-none" : ""}`}>
                {mask(largest.amount, formatCurrency(largest.amount, currency))}
              </div>
              <div className="flex items-center justify-between text-[11px] text-white/40 pt-2 border-t border-white/5">
                <span className="capitalize">{largest.category}</span>
                <span>{new Date(largest.date).toISOString().slice(0, 10)}</span>
              </div>
            </div>
          ) : (
            <p className="text-xs text-white/40 py-3">No qualifying expense transactions in this period.</p>
          )}
        </div>

        {/* Expense Category Breakdown List */}
        <div className="p-4 rounded-xl bg-black/20 border border-white/5 lg:col-span-2 space-y-3">
          <div className="flex items-center justify-between text-xs text-white/50">
            <span className="font-mono uppercase tracking-wider">Top Spending Categories</span>
            <span className="text-[11px]">Transfers excluded</span>
          </div>

          <div className="flex flex-wrap gap-2">
            {cashFlow?.categoryBreakdown && cashFlow.categoryBreakdown.length > 0 ? (
              cashFlow.categoryBreakdown.slice(0, 8).map((cat, idx) => (
                <div
                  key={idx}
                  className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/5 text-xs flex items-center gap-2"
                >
                  <span className="capitalize text-white/70">{cat.category.replace(/_/g, " ")}</span>
                  <span className={`font-mono font-semibold text-white ${hideBalances ? "blur-sm select-none" : ""}`}>
                    {mask(cat.amount, formatCurrency(cat.amount, currency))}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-xs text-white/40 py-2">No category spending recorded in this period.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
