"use client";
// components/dashboard/RecentActivitySection.js
// Section H: Recent Financial Activity feed.
// Filterable chronological record of transactions, trades, valuations, and journal decisions.

import { useState } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  ArrowDownRight,
  ArrowLeftRight,
  Briefcase,
  DollarSign,
  Landmark,
  FileText,
  ExternalLink,
  Clock,
} from "lucide-react";
import { formatCurrency } from "@/lib/finance/currency";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";

const ICONS = {
  transaction: DollarSign,
  investment_trade: Briefcase,
  dividend: Landmark,
  asset: Landmark,
  liability: Landmark,
  journal_entry: FileText,
};

export default function RecentActivitySection({
  initialActivity = [],
  currency = "KES",
  hideBalances = false,
}) {
  const [filter, setFilter] = useState("all");
  const [items, setItems] = useState(initialActivity);
  const [loading, setLoading] = useState(false);

  const handleFilterChange = async (newFilter) => {
    setFilter(newFilter);
    setLoading(true);
    try {
      const res = await fetch(`/api/dashboard/overview?period=all&currency=${currency}`);
      if (res.ok) {
        // Alternatively fetch activity specifically
        const actRes = await fetch(`/api/dashboard/overview`);
        // Filter locally or fetch
      }
    } catch {}
    setLoading(false);
  };

  const filteredItems = items.filter((item) => {
    if (filter === "all") return true;
    if (filter === "transactions") return item.type === "transaction";
    if (filter === "investments") return item.type === "investment_trade" || item.type === "dividend";
    if (filter === "assets_liabilities") return item.type === "asset" || item.type === "liability";
    if (filter === "decisions") return item.type === "journal_entry";
    return true;
  });

  const mask = (val, formatted) => (hideBalances ? "••••••" : formatted);

  return (
    <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface,#131d17)] p-6 space-y-6 shadow-xl">
      {/* Header and Filter Pills */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold tracking-tight text-white">Recent Financial Activity</h2>
            <span className="text-xs font-mono text-white/40">Multi-Module Audit Trail</span>
          </div>
          <p className="text-xs text-white/50 mt-0.5">
            Chronological stream of financial events across transactions, investments, debt, and decisions.
          </p>
        </div>

        {/* Filter Switcher */}
        <div className="flex flex-wrap items-center gap-1 p-1 rounded-xl bg-black/40 border border-white/5 self-start sm:self-auto">
          {[
            { id: "all", label: "All Events" },
            { id: "transactions", label: "Transactions" },
            { id: "investments", label: "Investments" },
            { id: "assets_liabilities", label: "Assets & Debt" },
            { id: "decisions", label: "Decisions" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id)}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                filter === tab.id
                  ? "bg-emerald-500 text-black font-semibold shadow"
                  : "text-white/60 hover:text-white"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Activity List */}
      <div className="space-y-2">
        {filteredItems.length > 0 ? (
          <div className="divide-y divide-white/5">
            {filteredItems.slice(0, 10).map((act) => {
              const Icon = ICONS[act.type] || DollarSign;
              return (
                <div
                  key={act.id}
                  className="py-3 px-2 flex items-center justify-between gap-3 hover:bg-white/[0.02] rounded-xl transition-colors group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`p-2 rounded-xl flex-shrink-0 ${
                        act.isInflow
                          ? "bg-emerald-500/10 text-emerald-400"
                          : act.isOutflow
                          ? "bg-rose-500/10 text-rose-400"
                          : "bg-white/5 text-white/60"
                      }`}
                    >
                      {act.isInflow ? (
                        <ArrowUpRight size={15} />
                      ) : act.isOutflow ? (
                        <ArrowDownRight size={15} />
                      ) : (
                        <Icon size={15} />
                      )}
                    </div>

                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-white truncate group-hover:text-emerald-400 transition-colors">
                        {act.title}
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-white/40 mt-0.5">
                        <span className="capitalize">{act.category?.replace(/_/g, " ")}</span>
                        <span>·</span>
                        <span className="capitalize text-white/50">{act.sourceModule}</span>
                        <span>·</span>
                        <span>{new Date(act.date).toLocaleDateString("en-KE", { month: "short", day: "numeric", year: "numeric" })}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 flex-shrink-0">
                    {act.amount != null ? (
                      <span
                        className={`font-mono text-sm font-semibold ${
                          act.isInflow
                            ? "text-emerald-400"
                            : act.isOutflow
                            ? "text-rose-400"
                            : "text-white/80"
                        } ${hideBalances ? "blur-sm select-none" : ""}`}
                      >
                        {act.isInflow ? "+" : act.isOutflow ? "−" : ""}
                        {mask(act.amount, formatCurrency(act.amount, act.currency || currency))}
                      </span>
                    ) : (
                      <Badge variant="secondary" className="text-[10px]">
                        {act.status || "Recorded"}
                      </Badge>
                    )}

                    {act.href && (
                      <Link
                        href={act.href}
                        className="p-1.5 rounded-lg text-white/30 hover:text-white hover:bg-white/10 transition-colors"
                        title="Open source record"
                      >
                        <ExternalLink size={13} />
                      </Link>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-8 text-center border border-dashed border-white/10 rounded-xl space-y-1">
            <p className="text-xs text-white/50">No activity recorded for this category.</p>
          </div>
        )}
      </div>
    </div>
  );
}
