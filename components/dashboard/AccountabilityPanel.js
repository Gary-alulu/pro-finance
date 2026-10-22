"use client";
// components/dashboard/AccountabilityPanel.js
// Dashboard widget showing open accountability items.

import { useEffect, useState } from "react";
import Link from "next/link";
import { ShieldCheck, AlertTriangle, AlertCircle, Info } from "lucide-react";
import EmptyState from "@/components/ui/EmptyState";
import SkeletonLoader from "@/components/ui/SkeletonLoader";

const SEVERITY_CONFIG = {
  error:   { icon: AlertTriangle, color: "var(--color-coral-600)",   bg: "var(--color-coral-50)" },
  high:    { icon: AlertTriangle, color: "var(--color-coral-600)",   bg: "var(--color-coral-50)" },
  warning: { icon: AlertCircle,   color: "var(--color-accent)",      bg: "var(--color-accent-bg)" },
  medium:  { icon: AlertCircle,   color: "var(--color-accent)",      bg: "var(--color-accent-bg)" },
  info:    { icon: Info,          color: "var(--color-text-tertiary)", bg: "var(--color-surface-2)" },
  low:     { icon: Info,          color: "var(--color-text-tertiary)", bg: "var(--color-surface-2)" },
};

const TYPE_LABELS = {
  outdated_valuation:   "Outdated valuation",
  missing_evidence:     "Missing evidence",
  duplicate_document:   "Duplicate document",
  ai_pending_review:    "AI extraction awaiting review",
  conflicting_data:     "Conflicting data",
  missing_document:     "Missing document",
  stale_investment_price: "Stale price",
  unlinked_transaction: "Unlinked transaction",
};

export default function AccountabilityPanel({ initialItems = null }) {
  const [items, setItems] = useState(initialItems || []);
  const [loading, setLoading] = useState(initialItems === null);

  useEffect(() => {
    if (initialItems !== null) return;

    async function load() {
      try {
        const res = await fetch("/api/accountability?status=open&limit=6");
        if (!res.ok) throw new Error();
        const data = await res.json();
        setItems(data.items || []);
      } catch {
        setItems([]);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [initialItems]);

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
          Accountability
        </h3>
        {items.length > 0 && (
          <Link
            href="/accountability"
            className="text-xs font-medium transition-colors"
            style={{ color: "var(--color-emerald-600)" }}
          >
            View all
          </Link>
        )}
      </div>

      {loading ? (
        <div className="flex-1 space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex gap-3 items-start">
              <SkeletonLoader className="w-6 h-6 rounded-lg flex-shrink-0" />
              <div className="flex-1 space-y-1.5">
                <SkeletonLoader className="h-3.5 w-3/4 rounded" />
                <SkeletonLoader className="h-3 w-1/2 rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <EmptyState
            icon={ShieldCheck}
            title="All clear"
            description="No open accountability items. Great financial hygiene!"
            compact
          />
        </div>
      ) : (
        <ul className="flex-1 space-y-2">
          {items.map((item) => {
            const cfg = SEVERITY_CONFIG[item.severity] || SEVERITY_CONFIG.low;
            const Icon = cfg.icon;
            return (
              <li key={item.id}>
                <Link
                  href={item.actionHref || "/accountability"}
                  className="flex items-start gap-3 p-2.5 rounded-lg transition-colors hover:bg-[var(--color-surface-2)]"
                >
                  <div
                    className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0 mt-0.5"
                    style={{ background: cfg.bg }}
                  >
                    <Icon size={13} style={{ color: cfg.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate" style={{ color: "var(--color-text-primary)" }}>
                      {item.title}
                    </p>
                    <p className="text-xs truncate" style={{ color: "var(--color-text-tertiary)" }}>
                      {TYPE_LABELS[item.type] || item.type}
                    </p>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
