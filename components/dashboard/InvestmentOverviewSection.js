"use client";
// components/dashboard/InvestmentOverviewSection.js
// Section D: Consolidated Investment Portfolio Overview.
// Tracks market values, cost basis, unrealized/realized P&L, dividends and concentration warnings.

import Link from "next/link";
import {
  TrendingUp,
  TrendingDown,
  Briefcase,
  AlertTriangle,
  Clock,
  Layers,
  ArrowRight,
  ShieldCheck,
  Percent,
} from "lucide-react";
import { formatCurrency } from "@/lib/finance/currency";
import Badge from "@/components/ui/Badge";

export default function InvestmentOverviewSection({
  investments,
  currency = "KES",
  hideBalances = false,
  onOpenTrace,
}) {
  const portfolioValue = investments?.portfolioValue || "0.00";
  const costBasis = investments?.acquisitionCost || "0.00";
  const unrealizedPL = investments?.unrealizedGainLoss || "0.00";
  const realizedPL = investments?.realizedGainLoss || "0.00";
  const dividends = investments?.dividendsReceived || "0.00";
  const activeCount = investments?.activeHoldingsCount || 0;
  const latestDate = investments?.latestValuationDate;
  const concentrationWarnings = investments?.concentrationWarnings || [];
  const holdings = investments?.holdings || [];

  const isPositiveUnrealized = Number(unrealizedPL) >= 0;
  const mask = (val, formatted) => (hideBalances ? "••••••" : formatted);

  return (
    <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface,#131d17)] p-6 space-y-6 shadow-xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold tracking-tight text-white">Investment Portfolio</h2>
            <span className="text-xs font-mono text-white/40">Holdings, P&L & Dividends</span>
          </div>
          <p className="text-xs text-white/50 mt-0.5">
            NSE equities, fixed income and mutual funds. Distinguishes market valuation from dividend income.
          </p>
        </div>

        <Link
          href="/investments"
          className="text-xs text-emerald-400 hover:text-emerald-300 font-medium inline-flex items-center gap-1 self-start sm:self-auto"
        >
          Manage Portfolio & Trades →
        </Link>
      </div>

      {/* Primary KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {/* Total Market Value */}
        <div className="p-4 rounded-xl bg-black/30 border border-white/5 space-y-1">
          <span className="text-xs text-white/50 block">Recorded Market Value</span>
          <div className={`text-xl font-bold text-white font-mono ${hideBalances ? "blur-sm select-none" : ""}`}>
            {mask(portfolioValue, formatCurrency(portfolioValue, currency))}
          </div>
          <span className="text-[11px] text-white/40 block">
            {activeCount} active position{activeCount === 1 ? "" : "s"}
          </span>
        </div>

        {/* Total Acquisition Cost */}
        <div className="p-4 rounded-xl bg-black/30 border border-white/5 space-y-1">
          <span className="text-xs text-white/50 block">Total Cost Basis</span>
          <div className={`text-xl font-semibold text-white/80 font-mono ${hideBalances ? "blur-sm select-none" : ""}`}>
            {mask(costBasis, formatCurrency(costBasis, currency))}
          </div>
          <span className="text-[11px] text-white/40 block">Average cost method</span>
        </div>

        {/* Unrealized Gain/Loss */}
        <div className="p-4 rounded-xl bg-black/30 border border-white/5 space-y-1">
          <div className="flex items-center justify-between text-xs text-white/50">
            <span>Unrealized P&L</span>
            {isPositiveUnrealized ? (
              <TrendingUp size={14} className="text-emerald-400" />
            ) : (
              <TrendingDown size={14} className="text-rose-400" />
            )}
          </div>
          <div
            className={`text-xl font-bold font-mono ${
              isPositiveUnrealized ? "text-emerald-400" : "text-rose-400"
            } ${hideBalances ? "blur-sm select-none" : ""}`}
          >
            {mask(unrealizedPL, formatCurrency(unrealizedPL, currency))}
          </div>
          <span className="text-[11px] text-white/40 block">Market value − Cost basis</span>
        </div>

        {/* Realized Gains */}
        <div className="p-4 rounded-xl bg-black/30 border border-white/5 space-y-1">
          <span className="text-xs text-white/50 block">Realized Trade Volume</span>
          <div className={`text-xl font-semibold text-white font-mono ${hideBalances ? "blur-sm select-none" : ""}`}>
            {mask(realizedPL, formatCurrency(realizedPL, currency))}
          </div>
          <span className="text-[11px] text-white/40 block">Closed trade proceeds</span>
        </div>

        {/* Dividends Received */}
        <div className="p-4 rounded-xl bg-black/30 border border-white/5 space-y-1">
          <span className="text-xs text-white/50 block">Dividends Received</span>
          <div className={`text-xl font-semibold text-emerald-400 font-mono ${hideBalances ? "blur-sm select-none" : ""}`}>
            {mask(dividends, formatCurrency(dividends, currency))}
          </div>
          <span className="text-[11px] text-white/40 block">Net dividend payouts</span>
        </div>
      </div>

      {/* Concentration Warnings if single holding > 30% */}
      {concentrationWarnings.length > 0 && (
        <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 flex items-start gap-2.5">
          <AlertTriangle size={16} className="flex-shrink-0 mt-0.5 text-amber-400" />
          <div className="space-y-0.5">
            <span className="font-semibold block">Portfolio Concentration Risk</span>
            <span>
              {concentrationWarnings.map((w) => `${w.name} accounts for ${w.weightPct}% of your total portfolio (threshold: 30%)`).join(". ")}
              . High concentration increases volatility risk.
            </span>
          </div>
        </div>
      )}

      {/* Holdings List Table (Top holdings) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs text-white/50">
          <span className="font-mono uppercase tracking-wider">Top Holdings</span>
          {latestDate && (
            <span className="text-[11px] flex items-center gap-1">
              <Clock size={11} /> Latest valuation: {new Date(latestDate).toISOString().slice(0, 10)}
            </span>
          )}
        </div>

        {holdings.length > 0 ? (
          <div className="overflow-x-auto rounded-xl border border-white/10 bg-black/20">
            <table className="w-full text-left text-xs">
              <thead className="bg-black/40 text-white/50 uppercase font-mono border-b border-white/10">
                <tr>
                  <th className="py-2.5 px-3">Holding</th>
                  <th className="py-2.5 px-3">Units</th>
                  <th className="py-2.5 px-3">Price / Source</th>
                  <th className="py-2.5 px-3">Market Value</th>
                  <th className="py-2.5 px-3">Unrealized P&L</th>
                  <th className="py-2.5 px-3">Portfolio Weight</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-white/80">
                {holdings.slice(0, 5).map((h) => {
                  const isPnlPos = Number(h.unrealizedPL || 0) >= 0;
                  return (
                    <tr key={h.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="py-2.5 px-3">
                        <div className="font-medium text-white">{h.name}</div>
                        <div className="text-[10px] text-white/40">{h.ticker || h.typeLabel}</div>
                      </td>
                      <td className="py-2.5 px-3 font-mono">{h.units}</td>
                      <td className="py-2.5 px-3 font-mono">
                        {h.price ? formatCurrency(h.price, h.currency) : "—"}
                        <span className="text-[10px] text-white/40 block capitalize">{h.priceSource}</span>
                      </td>
                      <td className="py-2.5 px-3 font-mono font-semibold text-white">
                        {mask(h.marketValue, formatCurrency(h.marketValue, currency))}
                      </td>
                      <td
                        className={`py-2.5 px-3 font-mono font-medium ${
                          isPnlPos ? "text-emerald-400" : "text-rose-400"
                        }`}
                      >
                        {mask(h.unrealizedPL, formatCurrency(h.unrealizedPL, currency))}
                      </td>
                      <td className="py-2.5 px-3 font-mono">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] ${
                            h.portfolioWeightPct > 30
                              ? "bg-amber-500/20 text-amber-300 font-bold"
                              : "bg-white/5 text-white/70"
                          }`}
                        >
                          {h.portfolioWeightPct}%
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-xs text-white/40 py-4 text-center">
            No active investment holdings recorded. Add shares or bonds in the Investment module.
          </p>
        )}
      </div>
    </div>
  );
}
