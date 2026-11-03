"use client";
// components/dashboard/AssetsLiabilitiesSection.js
// Section B: Assets & Liabilities Overview with category breakdown,
// attributable ownership badges, valuation freshness status, and quick actions.

import { useState } from "react";
import Link from "next/link";
import {
  PieChart,
  ShieldAlert,
  ShieldCheck,
  Plus,
  ArrowRight,
  Clock,
  Layers,
  Building,
  Car,
  Landmark,
  CreditCard,
  Briefcase,
} from "lucide-react";
import { formatCurrency } from "@/lib/finance/currency";
import Button from "@/components/ui/Button";

const ICONS = {
  property: Building,
  vehicle: Car,
  bank_account: Landmark,
  cash: Landmark,
  listed_equity: Briefcase,
  mortgage: Building,
  credit_card: CreditCard,
};

export default function AssetsLiabilitiesSection({
  assets,
  liabilities,
  currency = "KES",
  hideBalances = false,
  onOpenTrace,
}) {
  const [activeTab, setActiveTab] = useState("assets"); // "assets" | "liabilities"

  const totalAssets = assets?.totalValue || "0.00";
  const totalLiabilities = liabilities?.totalBalance || "0.00";
  const weightedInterest = liabilities?.weightedInterestRate;

  // Comparison ratio
  const assetNum = Number(totalAssets) || 0;
  const debtNum = Number(totalLiabilities) || 0;
  const totalGross = assetNum + debtNum;
  const assetPct = totalGross > 0 ? Math.round((assetNum / totalGross) * 100) : 100;
  const debtPct = totalGross > 0 ? Math.round((debtNum / totalGross) * 100) : 0;

  const mask = (val, formatted) => (hideBalances ? "••••••" : formatted);

  return (
    <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface,#131d17)] p-6 space-y-6 shadow-xl">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold tracking-tight text-white">Assets & Liabilities</h2>
            <span className="text-xs font-mono text-white/40">Composition of Wealth & Debt</span>
          </div>
          <p className="text-xs text-white/50 mt-0.5">
            Reflects attributable shares of jointly owned assets and current outstanding loan balances.
          </p>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex items-center gap-2">
          <Link href="/assets">
            <Button variant="secondary" size="sm" className="gap-1.5 text-xs rounded-xl">
              <Plus size={13} />
              <span>Add Asset</span>
            </Button>
          </Link>
          <Link href="/assets?tab=liabilities">
            <Button variant="secondary" size="sm" className="gap-1.5 text-xs rounded-xl">
              <Plus size={13} />
              <span>Add Liability</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Assets vs Liabilities Meter */}
      <div className="p-4 rounded-xl bg-black/30 border border-white/5 space-y-2">
        <div className="flex items-center justify-between text-xs font-mono">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <span className="text-white">Assets: {mask(totalAssets, formatCurrency(totalAssets, currency))}</span>
            <span className="text-white/40">({assetPct}%)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-white">Liabilities: {mask(totalLiabilities, formatCurrency(totalLiabilities, currency))}</span>
            <span className="text-white/40">({debtPct}%)</span>
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
          </div>
        </div>

        {/* Proportional visual bar */}
        <div className="w-full h-3 rounded-full bg-black/50 overflow-hidden flex">
          <div
            style={{ width: `${assetPct}%` }}
            className="h-full bg-emerald-500 transition-all duration-500"
          />
          <div
            style={{ width: `${debtPct}%` }}
            className="h-full bg-rose-500 transition-all duration-500"
          />
        </div>

        <div className="flex items-center justify-between text-[11px] text-white/40 pt-1">
          <span>Attributable Asset Value</span>
          {weightedInterest && (
            <span>Weighted Average Interest Rate: <strong className="text-white">{weightedInterest}%</strong></span>
          )}
        </div>
      </div>

      {/* Switcher: Assets vs Liabilities */}
      <div className="flex items-center gap-3 border-b border-white/10 pb-2">
        <button
          onClick={() => setActiveTab("assets")}
          className={`text-xs font-mono uppercase tracking-wider pb-2 transition-colors relative ${
            activeTab === "assets"
              ? "text-emerald-400 font-semibold"
              : "text-white/50 hover:text-white"
          }`}
        >
          Assets Breakdown ({assets?.allocation?.length || 0} categories)
          {activeTab === "assets" && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-500 rounded-full" />
          )}
        </button>

        <button
          onClick={() => setActiveTab("liabilities")}
          className={`text-xs font-mono uppercase tracking-wider pb-2 transition-colors relative ${
            activeTab === "liabilities"
              ? "text-rose-400 font-semibold"
              : "text-white/50 hover:text-white"
          }`}
        >
          Liabilities Breakdown ({liabilities?.distribution?.length || 0} categories)
          {activeTab === "liabilities" && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-rose-500 rounded-full" />
          )}
        </button>
      </div>

      {/* Category Grid */}
      {activeTab === "assets" ? (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {assets?.allocation && assets.allocation.length > 0 ? (
              assets.allocation.map((cat, idx) => (
                <Link
                  key={idx}
                  href={`/assets?category=${encodeURIComponent(cat.category)}`}
                  className="p-3.5 rounded-xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.05] hover:border-emerald-500/30 transition-all block group"
                >
                  <div className="flex items-center justify-between text-xs text-white/50 mb-1.5">
                    <span className="font-medium text-white/80 group-hover:text-emerald-400 transition-colors">
                      {cat.label}
                    </span>
                    <span className="font-mono text-emerald-400/80">{cat.percentage}%</span>
                  </div>
                  <div className={`text-base font-semibold text-white font-mono ${hideBalances ? "blur-sm select-none" : ""}`}>
                    {mask(cat.amount, formatCurrency(cat.amount, currency))}
                  </div>
                </Link>
              ))
            ) : (
              <p className="text-xs text-white/40 col-span-3 py-4 text-center">
                No active assets recorded yet. Click &quot;Add Asset&quot; to record your first asset.
              </p>
            )}
          </div>

          {/* Freshness Status Banner */}
          {assets?.summary && (
            <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-xl bg-white/[0.02] border border-white/5 text-xs text-white/60">
              <div className="flex items-center gap-2">
                <Clock size={14} className="text-white/40" />
                <span>
                  Valuations: <strong>{assets.summary.freshCount} fresh</strong>,{" "}
                  <span className={assets.summary.staleCount > 0 ? "text-amber-400 font-medium" : ""}>
                    {assets.summary.staleCount} stale (&gt;90d)
                  </span>
                  {assets.summary.missingValuationCount > 0 && (
                    <span className="text-rose-400 font-medium">
                      , {assets.summary.missingValuationCount} missing
                    </span>
                  )}
                </span>
              </div>
              <Link
                href="/assets"
                className="text-emerald-400 hover:text-emerald-300 font-medium inline-flex items-center gap-1"
              >
                Manage Assets <ArrowRight size={12} />
              </Link>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {liabilities?.distribution && liabilities.distribution.length > 0 ? (
              liabilities.distribution.map((cat, idx) => (
                <Link
                  key={idx}
                  href={`/assets?tab=liabilities&category=${encodeURIComponent(cat.category)}`}
                  className="p-3.5 rounded-xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.05] hover:border-rose-500/30 transition-all block group"
                >
                  <div className="flex items-center justify-between text-xs text-white/50 mb-1.5">
                    <span className="font-medium text-white/80 group-hover:text-rose-400 transition-colors">
                      {cat.label}
                    </span>
                    <span className="font-mono text-rose-400/80">{cat.percentage}%</span>
                  </div>
                  <div className={`text-base font-semibold text-white font-mono ${hideBalances ? "blur-sm select-none" : ""}`}>
                    {mask(cat.amount, formatCurrency(cat.amount, currency))}
                  </div>
                </Link>
              ))
            ) : (
              <p className="text-xs text-white/40 col-span-3 py-4 text-center">
                No active liabilities recorded. Outstanding loan balances and facilities will appear here.
              </p>
            )}
          </div>

          {/* Maturity Schedule Status Banner */}
          {liabilities?.summary && (
            <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-xl bg-white/[0.02] border border-white/5 text-xs text-white/60">
              <div className="flex items-center gap-2">
                <Clock size={14} className="text-white/40" />
                <span>
                  Schedule:{" "}
                  {liabilities.summary.overdueCount > 0 ? (
                    <span className="text-rose-400 font-semibold">
                      {liabilities.summary.overdueCount} overdue!
                    </span>
                  ) : (
                    <span className="text-emerald-400 font-medium">0 overdue</span>
                  )}
                  {" · "}
                  <span>{liabilities.summary.upcomingCount} maturing in 30 days</span>
                </span>
              </div>
              <Link
                href="/assets?tab=liabilities"
                className="text-rose-400 hover:text-rose-300 font-medium inline-flex items-center gap-1"
              >
                Manage Debt <ArrowRight size={12} />
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
