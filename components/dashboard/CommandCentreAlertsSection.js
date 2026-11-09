"use client";
// components/dashboard/CommandCentreAlertsSection.js
// Section G: Financial Command Centre Early-Warning Summary.
// Displays critical & high-priority risks, stale valuations, and overdue obligations.

import Link from "next/link";
import {
  AlertTriangle,
  AlertCircle,
  ShieldAlert,
  ArrowRight,
  Clock,
  ExternalLink,
  CheckCircle2,
} from "lucide-react";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";

const SEVERITY_BADGES = {
  critical: "bg-red-500/20 text-[var(--color-negative-text)] border-red-500/30",
  high: "bg-amber-500/20 text-[var(--color-warning-text)] border-amber-500/30",
  medium: "bg-blue-500/20 text-blue-600 dark:text-blue-400 border-blue-500/30",
  low: "bg-[var(--color-surface-3)] text-[var(--color-text-secondary)] border-[var(--color-border)]",
};

export default function CommandCentreAlertsSection({ alertsData }) {
  const alerts = alertsData?.alerts || [];
  const items = alertsData?.accountabilityItems || [];
  const counts = alertsData?.counts || { critical: 0, high: 0, medium: 0, total: 0 };

  const hasIssues = alerts.length > 0 || items.length > 0;

  return (
    <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface,#131d17)] p-6 space-y-6 shadow-xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold tracking-tight text-[var(--color-text-primary)]">Financial Command Centre</h2>
            {counts.critical > 0 ? (
              <Badge variant="destructive" className="text-xs uppercase">
                {counts.critical} Critical
              </Badge>
            ) : counts.high > 0 ? (
              <Badge variant="outline" className="text-xs uppercase border-amber-500/30 text-[var(--color-warning-text)]">
                {counts.high} High Priority
              </Badge>
            ) : (
              <Badge variant="outline" className="text-xs uppercase border-emerald-500/30 text-[var(--color-positive-text)]">
                Stable
              </Badge>
            )}
          </div>
          <p className="text-xs text-[var(--color-text-tertiary)] mt-0.5">
            Early-warning surveillance for cash shortfalls, overdue invoices, stale valuations & data risks.
          </p>
        </div>

        <Link
          href="/command-centre"
          className="text-xs text-[var(--color-positive-text)] hover:text-[var(--color-positive-text)] font-medium inline-flex items-center gap-1 self-start sm:self-auto"
        >
          Full Command Centre ({counts.total}) →
        </Link>
      </div>

      {/* Feed list */}
      {hasIssues ? (
        <div className="space-y-3">
          {alerts.map((alert) => (
            <div
              key={alert.id}
              className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors ${
                alert.severity === "critical"
                  ? "bg-red-500/5 border-red-500/20 hover:border-red-500/40"
                  : alert.severity === "high"
                  ? "bg-amber-500/5 border-amber-500/20 hover:border-amber-500/40"
                  : "bg-[var(--color-surface-2)] border-[var(--color-border)] hover:border-[var(--color-border)]"
              }`}
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-block px-2 py-0.5 rounded text-[10px] uppercase font-mono border ${
                      SEVERITY_BADGES[alert.severity] || SEVERITY_BADGES.medium
                    }`}
                  >
                    {alert.severity}
                  </span>
                  <span className="text-sm font-semibold text-[var(--color-text-primary)]">{alert.title}</span>
                </div>
                <p className="text-xs text-[var(--color-text-secondary)]">{alert.summary}</p>
                {alert.deadline && (
                  <div className="flex items-center gap-1 text-[11px] text-[var(--color-text-tertiary)] pt-1">
                    <Clock size={11} /> Deadline: {new Date(alert.deadline).toISOString().slice(0, 10)}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 self-end sm:self-center flex-shrink-0">
                <Link href={alert.actionHref || "/command-centre"}>
                  <Button variant="secondary" size="sm" className="gap-1 text-xs rounded-xl">
                    <span>{alert.actionLabel || "Investigate"}</span>
                    <ArrowRight size={12} />
                  </Button>
                </Link>
              </div>
            </div>
          ))}

          {/* Accountability findings (e.g. stale valuations) */}
          {items.map((item) => (
            <div
              key={item.id}
              className="p-3.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)] flex items-center justify-between text-xs"
            >
              <div className="flex items-center gap-2.5">
                <AlertCircle size={15} className="text-[var(--color-warning-text)] flex-shrink-0" />
                <div>
                  <span className="font-semibold text-[var(--color-text-primary)]">{item.title}</span>
                  <p className="text-[var(--color-text-tertiary)] text-[11px] mt-0.5">{item.reason}</p>
                </div>
              </div>

              <Link href={item.actionHref || "/accountability"}>
                <Button variant="ghost" size="sm" className="text-xs text-[var(--color-positive-text)] hover:text-[var(--color-positive-text)]">
                  {item.actionLabel || "Review"} →
                </Button>
              </Link>
            </div>
          ))}
        </div>
      ) : (
        <div className="p-8 text-center border border-dashed border-[var(--color-border)] rounded-xl space-y-2">
          <ShieldAlert size={28} className="mx-auto text-[var(--color-positive-text)]" />
          <p className="text-sm font-medium text-[var(--color-text-primary)]">No active financial alerts</p>
          <p className="text-xs text-[var(--color-text-tertiary)]">
            Liquidity is healthy, valuations are fresh, and no obligations are overdue.
          </p>
        </div>
      )}
    </div>
  );
}
