"use client";
// components/dashboard/RecentActivityFeed.js
// Recent transactions and record updates feed on the dashboard.

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowDownLeft, ArrowUpRight, ArrowLeftRight, Clock } from "lucide-react";
import { formatCurrency } from "@/lib/finance/currency";
import { format } from "date-fns";
import EmptyState from "@/components/ui/EmptyState";
import SkeletonLoader from "@/components/ui/SkeletonLoader";

const DIRECTION_CONFIG = {
  inflow:   { icon: ArrowDownLeft,  color: "var(--color-positive)",  bg: "var(--color-positive-bg)" },
  outflow:  { icon: ArrowUpRight,   color: "var(--color-negative)",  bg: "var(--color-negative-bg)" },
  transfer: { icon: ArrowLeftRight, color: "var(--color-accent)",    bg: "var(--color-accent-bg)"   },
  unknown:  { icon: ArrowLeftRight, color: "var(--color-text-tertiary)", bg: "var(--color-surface-2)" },
};

export default function RecentActivityFeed({ currency = "KES", initialTransactions = null }) {
  const [transactions, setTransactions] = useState(initialTransactions || []);
  const [loading, setLoading] = useState(initialTransactions === null);

  useEffect(() => {
    if (initialTransactions !== null) return;

    async function load() {
      try {
        const res = await fetch("/api/transactions?limit=8&sort=-date");
        if (!res.ok) throw new Error();
        const data = await res.json();
        setTransactions(data.transactions || []);
      } catch {
        setTransactions([]);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [initialTransactions]);

  return (
    <div
      className="p-5 h-full flex flex-col"
      style={{
        background: "var(--color-surface)",
        border: "1px solid var(--color-border)",
        borderRadius: "var(--radius-lg)",
        boxShadow: "var(--shadow-sm)",
      }}
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold" style={{ color: "var(--color-text-primary)" }}>
          Recent Activity
        </h3>
        {transactions.length > 0 && (
          <Link
            href="/transactions"
            className="text-xs font-medium"
            style={{ color: "var(--color-emerald-600)" }}
          >
            View all
          </Link>
        )}
      </div>

      {loading ? (
        <div className="flex-1 space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center gap-3">
              <SkeletonLoader className="w-8 h-8 rounded-lg flex-shrink-0" />
              <div className="flex-1 space-y-1.5">
                <SkeletonLoader className="h-3.5 w-2/3 rounded" />
                <SkeletonLoader className="h-3 w-1/3 rounded" />
              </div>
              <SkeletonLoader className="h-4 w-20 rounded" />
            </div>
          ))}
        </div>
      ) : transactions.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <EmptyState
            icon={Clock}
            title="No transactions yet"
            description="Record your first transaction to see activity here."
            compact
          />
        </div>
      ) : (
        <ul className="flex-1 space-y-1">
          {transactions.map((tx) => {
            const cfg = DIRECTION_CONFIG[tx.direction] || DIRECTION_CONFIG.unknown;
            const Icon = cfg.icon;
            const isInflow = tx.direction === "inflow";
            return (
              <li key={tx.id}>
                <Link
                  href={`/transactions`}
                  className="flex items-center gap-3 p-2 rounded-lg transition-colors hover:bg-[var(--color-surface-2)]"
                >
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ background: cfg.bg }}
                  >
                    <Icon size={14} style={{ color: cfg.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate" style={{ color: "var(--color-text-primary)" }}>
                      {tx.description || tx.category || "Transaction"}
                    </p>
                    <p className="text-xs" style={{ color: "var(--color-text-tertiary)" }}>
                      {format(new Date(tx.date), "d MMM yyyy")}
                    </p>
                  </div>
                  <span
                    className="text-xs font-semibold tabular-nums flex-shrink-0"
                    style={{
                      color: isInflow ? "var(--color-positive)" : "var(--color-negative)",
                    }}
                  >
                    {isInflow ? "+" : "−"}{formatCurrency(tx.amount, tx.currency || currency)}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
