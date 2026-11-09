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
            <h2 className="text-lg font-semibold tracking-tight text-[var(--color-text-primary)]">Assets & Liabilities</h2>
            <span className="text-xs font-mono text-[var(--color-text-tertiary)]">Composition of Wealth & Debt</span>
          </div>
          <p className="text-xs text-[var(--color-text-tertiary)] mt-0.5">
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
      <div className="p-4 rounded-xl bg-[var(--color-surface-2)] border border-[var(--color-border)] space-y-2">
        <div className="flex items-center justify-between text-xs font-mono">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <span className="text-[var(--color-text-primary)]">Assets: {mask(totalAssets, formatCurrency(totalAssets, currency))}</span>
            <span className="text-[var(--color-text-tertiary)]">({assetPct}%)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[var(--color-text-primary)]">Liabilities: {mask(totalLiabilities, formatCurrency(totalLiabilities, currency))}</span>
            <span className="text-[var(--color-text-tertiary)]">({debtPct}%)</span>
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
          </div>
        </div>

        {/* Proportional visual bar */}
        <div className="w-full h-3 rounded-full bg-[var(--color-surface-3)] overflow-hidden flex">
          <div
            style={{ width: `${assetPct}%` }}
            className="h-full bg-emerald-500 transition-all duration-500"
          />
          <div
            style={{ width: `${debtPct}%` }}
            className="h-full bg-rose-500 transition-all duration-500"
          />
        </div>

        <div className="flex items-center justify-between text-[11px] text-[var(--color-text-tertiary)] pt-1">
          <span>Attributable Asset Value</span>
          {weightedInterest && (
            <span>Weighted Average Interest Rate: <strong className="text-[var(--color-text-primary)]">{weightedInterest}%</strong></span>
          )}
        </div>
      </div>

      {/* Switcher: Assets vs Liabilities */}
      <div className="flex items-center gap-3 border-b border-[var(--color-border)] pb-2">
        <button
          onClick={() => setActiveTab("assets")}
          className={`text-xs font-mono uppercase tracking-wider pb-2 transition-colors relative ${
            activeTab === "assets"
              ? "text-[var(--color-positive-text)] font-semibold"
              : "text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)]"
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
              ? "text-[var(--color-negative-text)] font-semibold"
              : "text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)]"
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
                  className="p-3.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)] hover:bg-[var(--color-surface-3)] hover:border-emerald-500/30 transition-all block group"
                >
                  <div className="flex items-center justify-between text-xs text-[var(--color-text-tertiary)] mb-1.5">
                    <span className="font-medium text-[var(--color-text-secondary)] group-hover:text-[var(--color-positive-text)] transition-colors">
                      {cat.label}
                    </span>
                    <span className="font-mono text-[var(--color-positive-text)]">{cat.percentage}%</span>
                  </div>
                  <div className={`text-base font-semibold text-[var(--color-text-primary)] font-mono ${hideBalances ? "blur-sm select-none" : ""}`}>
                    {mask(cat.amount, formatCurrency(cat.amount, currency))}
                  </div>
                </Link>
              ))
            ) : (
              <p className="text-xs text-[var(--color-text-tertiary)] col-span-3 py-4 text-center">
                No active assets recorded yet. Click &quot;Add Asset&quot; to record your first asset.
              </p>
            )}
          </div>

          {/* Freshness Status Banner */}
          {assets?.summary && (
            <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-xl bg-[var(--color-surface-2)] border border-[var(--color-border)] text-xs text-[var(--color-text-secondary)]">
              <div className="flex items-center gap-2">
                <Clock size={14} className="text-[var(--color-text-tertiary)]" />
                <span>
                  Valuations: <strong>{assets.summary.freshCount} fresh</strong>,{" "}
                  <span className={assets.summary.staleCount > 0 ? "text-[var(--color-warning-text)] font-medium" : ""}>
                    {assets.summary.staleCount} stale (&gt;90d)
                  </span>
                  {assets.summary.missingValuationCount > 0 && (
                    <span className="text-[var(--color-negative-text)] font-medium">
                      , {assets.summary.missingValuationCount} missing
                    </span>
                  )}
                </span>
              </div>
              <Link
                href="/assets"
                className="text-[var(--color-positive-text)] hover:text-[var(--color-positive-text)] font-medium inline-flex items-center gap-1"
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
                  className="p-3.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)] hover:bg-[var(--color-surface-3)] hover:border-rose-500/30 transition-all block group"
                >
                  <div className="flex items-center justify-between text-xs text-[var(--color-text-tertiary)] mb-1.5">
                    <span className="font-medium text-[var(--color-text-secondary)] group-hover:text-[var(--color-negative-text)] transition-colors">
                      {cat.label}
                    </span>
                    <span className="font-mono text-[var(--color-negative-text)]">{cat.percentage}%</span>
                  </div>
                  <div className={`text-base font-semibold text-[var(--color-text-primary)] font-mono ${hideBalances ? "blur-sm select-none" : ""}`}>
                    {mask(cat.amount, formatCurrency(cat.amount, currency))}
                  </div>
                </Link>
              ))
            ) : (
              <p className="text-xs text-[var(--color-text-tertiary)] col-span-3 py-4 text-center">
                No active liabilities recorded. Outstanding loan balances and facilities will appear here.
              </p>
            )}
          </div>

          {/* Maturity Schedule Status Banner */}
          {liabilities?.summary && (
            <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-xl bg-[var(--color-surface-2)] border border-[var(--color-border)] text-xs text-[var(--color-text-secondary)]">
              <div className="flex items-center gap-2">
                <Clock size={14} className="text-[var(--color-text-tertiary)]" />
                <span>
                  Schedule:{" "}
                  {liabilities.summary.overdueCount > 0 ? (
                    <span className="text-[var(--color-negative-text)] font-semibold">
                      {liabilities.summary.overdueCount} overdue!
                    </span>
                  ) : (
                    <span className="text-[var(--color-positive-text)] font-medium">0 overdue</span>
                  )}
                  {" · "}
                  <span>{liabilities.summary.upcomingCount} maturing in 30 days</span>
                </span>
              </div>
              <Link
                href="/assets?tab=liabilities"
                className="text-[var(--color-negative-text)] hover:text-[var(--color-negative-text)] font-medium inline-flex items-center gap-1"
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
