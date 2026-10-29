"use client";
// components/simulator/SnapshotCard.js
// Displays the verified starting financial position loaded from real database records.

import { formatCurrency } from "@/lib/finance/currency";
import { format } from "date-fns";
import { Database, AlertTriangle, CheckCircle2, ShieldAlert } from "lucide-react";

export default function SnapshotCard({ snapshot, meta, currency = "KES", loading = false }) {
  if (loading) {
    return (
      <div
        className="rounded-2xl p-6 animate-pulse"
        style={{
          background: "var(--color-surface)",
          border: "1px solid var(--color-border)",
        }}
      >
        <div className="h-4 bg-white/5 w-1/3 rounded mb-4" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="h-12 bg-white/5 rounded" />
          <div className="h-12 bg-white/5 rounded" />
          <div className="h-12 bg-white/5 rounded" />
          <div className="h-12 bg-white/5 rounded" />
        </div>
      </div>
    );
  }

  if (!snapshot) return null;

  const hasIssues = meta?.hasMissingValuation || meta?.hasUnpricedInvestment;

  return (
    <div
      className="rounded-2xl p-6 flex flex-col gap-4"
      style={{
        background: "var(--color-surface)",
        border: "1px solid var(--color-border)",
        boxShadow: "var(--shadow-sm)",
      }}
    >
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Database size={16} style={{ color: "var(--color-primary, #10b981)" }} />
          <h3 className="text-sm font-bold" style={{ color: "var(--color-text-primary)" }}>
            Starting Position Snapshot
          </h3>
          <span
            className="text-[10px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1"
            style={{
              background: hasIssues ? "rgba(245, 158, 11, 0.12)" : "rgba(16, 185, 129, 0.12)",
              color: hasIssues ? "#f59e0b" : "#10b981",
            }}
          >
            {hasIssues ? <AlertTriangle size={10} /> : <CheckCircle2 size={10} />}
            {hasIssues ? "Unpriced Records Disclosed" : "Verified Records"}
          </span>
        </div>

        <span className="text-xs" style={{ color: "var(--color-text-tertiary)" }}>
          As of {snapshot.takenAt ? format(new Date(snapshot.takenAt), "MMM d, yyyy · HH:mm") : "Current records"}
        </span>
      </div>

      {/* Snapshot Balance Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
        <div className="p-3 rounded-xl" style={{ background: "var(--color-surface-2)" }}>
          <span className="text-[11px]" style={{ color: "var(--color-text-tertiary)" }}>
            Liquid Cash
          </span>
          <p className="text-sm font-bold font-mono mt-0.5" style={{ color: "var(--color-text-primary)" }}>
            {formatCurrency(snapshot.recordedCash, currency)}
          </p>
        </div>

        <div className="p-3 rounded-xl" style={{ background: "var(--color-surface-2)" }}>
          <span className="text-[11px]" style={{ color: "var(--color-text-tertiary)" }}>
            Investments Market Value
          </span>
          <p className="text-sm font-bold font-mono mt-0.5" style={{ color: "var(--color-text-primary)" }}>
            {formatCurrency(snapshot.recordedInvestments, currency)}
          </p>
        </div>

        <div className="p-3 rounded-xl" style={{ background: "var(--color-surface-2)" }}>
          <span className="text-[11px]" style={{ color: "var(--color-text-tertiary)" }}>
            Other Assets
          </span>
          <p className="text-sm font-bold font-mono mt-0.5" style={{ color: "var(--color-text-primary)" }}>
            {formatCurrency(snapshot.recordedOtherAssets, currency)}
          </p>
        </div>

        <div className="p-3 rounded-xl" style={{ background: "var(--color-surface-2)" }}>
          <span className="text-[11px]" style={{ color: "var(--color-text-tertiary)" }}>
            Outstanding Debt
          </span>
          <p className="text-sm font-bold font-mono mt-0.5" style={{ color: "#ef4444" }}>
            {formatCurrency(snapshot.recordedLiabilities, currency)}
          </p>
        </div>
      </div>

      {/* Warnings & Disclosures */}
      {hasIssues && (
        <div
          className="p-3 rounded-xl border flex items-start gap-2.5 text-xs"
          style={{
            background: "rgba(245, 158, 11, 0.05)",
            borderColor: "rgba(245, 158, 11, 0.2)",
            color: "var(--color-text-secondary)",
          }}
        >
          <ShieldAlert size={16} className="text-amber-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-amber-500">Unpriced records detected</p>
            <p className="text-[11px] mt-0.5" style={{ color: "var(--color-text-tertiary)" }}>
              Certain assets or holdings do not have confirmed current valuations. In accordance with platform standards, missing values are withheld rather than assumed to be zero.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
