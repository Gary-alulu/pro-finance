"use client";
// components/dashboard/GoalsAccountabilitySection.js
// Section F: Goals & Accountability Overview.
// Connects Journal decision commitments, milestones, and simulator targets.

import Link from "next/link";
import {
  Target,
  Clock,
  CheckCircle2,
  Calendar,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
} from "lucide-react";
import { formatCurrency } from "@/lib/finance/currency";
import Badge from "@/components/ui/Badge";

export default function GoalsAccountabilitySection({
  goals,
  currency = "KES",
  hideBalances = false,
}) {
  const commitments = goals?.commitments || [];
  const milestones = goals?.upcomingMilestones || [];
  const targetProjection = goals?.targetProjection;
  const actualSavings = goals?.actualMonthlySavings || "0.00";

  const mask = (val, formatted) => (hideBalances ? "••••••" : formatted);

  return (
    <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface,#131d17)] p-6 space-y-6 shadow-xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold tracking-tight text-[var(--color-text-primary)]">Goals & Accountability</h2>
            <span className="text-xs font-mono text-[var(--color-text-tertiary)]">Commitments & Wealth Projections</span>
          </div>
          <p className="text-xs text-[var(--color-text-tertiary)] mt-0.5">
            Integrates the Financial Command Journal and Wealth Simulator. Projections are visually distinct from actuals.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/journal"
            className="text-xs text-[var(--color-positive-text)] hover:text-[var(--color-positive-text)] font-medium inline-flex items-center gap-1"
          >
            Journal Decisions →
          </Link>
          <span className="text-[var(--color-text-tertiary)]">·</span>
          <Link
            href="/simulator"
            className="text-xs text-purple-600 dark:text-purple-400 hover:text-purple-600 dark:text-purple-400 font-medium inline-flex items-center gap-1"
          >
            Simulator →
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Wealth Simulator Goal vs Actual Contributions */}
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/20 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono uppercase tracking-wider text-purple-600 dark:text-purple-400 flex items-center gap-1.5">
                <Sparkles size={14} /> Wealth Target Projection
              </span>
              <Badge variant="outline" className="text-[10px] uppercase font-mono border-purple-500/40 text-purple-600 dark:text-purple-400">
                Projected (Simulated)
              </Badge>
            </div>

            {targetProjection ? (
              <div className="space-y-3">
                <div className="flex items-baseline justify-between">
                  <span className="text-sm font-semibold text-[var(--color-text-primary)]">{targetProjection.scenarioName}</span>
                  <span className="text-xs text-[var(--color-text-tertiary)]">{targetProjection.timeHorizonYears} yr horizon</span>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-[var(--color-text-secondary)]">Actual Monthly Savings:</span>
                    <strong className="text-[var(--color-positive-text)]">
                      {mask(actualSavings, formatCurrency(actualSavings, currency))}
                    </strong>
                  </div>
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-[var(--color-text-secondary)]">Target Monthly Commitment:</span>
                    <strong className="text-[var(--color-text-primary)]">
                      {mask(targetProjection.plannedMonthlyInvestment, formatCurrency(targetProjection.plannedMonthlyInvestment, currency))}
                    </strong>
                  </div>

                  {/* Progress bar */}
                  <div className="w-full h-2 rounded-full bg-[var(--color-surface-3)] overflow-hidden mt-2">
                    <div
                      style={{ width: `${Math.min(100, targetProjection.contributionRatePct)}%` }}
                      className="h-full bg-gradient-to-r from-purple-500 to-emerald-400 rounded-full"
                    />
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-[var(--color-text-tertiary)] pt-1">
                    <span>Target Achievement: <strong>{targetProjection.contributionRatePct}%</strong></span>
                    <span>Assumed return: {targetProjection.assumedAnnualReturnPct}%</span>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-xs text-[var(--color-text-tertiary)] py-2">
                No active Wealth Simulator scenario configured. Set up target goals in the Simulator.
              </p>
            )}
          </div>

          {/* Upcoming Reminders / Milestones */}
          <div className="space-y-2">
            <span className="text-xs font-mono uppercase tracking-wider text-[var(--color-text-tertiary)] block">
              Upcoming Financial Milestones & Reviews
            </span>
            {milestones.length > 0 ? (
              <div className="space-y-2">
                {milestones.slice(0, 3).map((m) => (
                  <div
                    key={m.id}
                    className="p-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)] flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-2.5">
                      <Clock size={14} className={m.isOverdue ? "text-[var(--color-negative-text)]" : "text-[var(--color-positive-text)]"} />
                      <div>
                        <div className="font-medium text-[var(--color-text-primary)]">{m.title}</div>
                        <div className="text-[10px] text-[var(--color-text-tertiary)]">
                          Due: {new Date(m.dueAt).toISOString().slice(0, 10)}
                        </div>
                      </div>
                    </div>
                    <Badge variant={m.isOverdue ? "destructive" : "secondary"} className="text-[10px]">
                      {m.isOverdue ? "Overdue" : `${m.daysUntil} days`}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-[var(--color-text-tertiary)] py-2">No scheduled milestones approaching.</p>
            )}
          </div>
        </div>

        {/* Right Column: Active Journal Commitments */}
        <div className="space-y-3">
          <span className="text-xs font-mono uppercase tracking-wider text-[var(--color-text-tertiary)] block">
            Command Journal Decisions & Commitments
          </span>

          {commitments.length > 0 ? (
            <div className="space-y-2.5">
              {commitments.slice(0, 4).map((c) => (
                <Link
                  key={c.id}
                  href={`/journal?entry=${c.id}`}
                  className="p-3.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)] hover:bg-[var(--color-surface-3)] hover:border-emerald-500/30 transition-all block group text-xs"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-[var(--color-text-primary)] group-hover:text-[var(--color-positive-text)] transition-colors">
                      {c.title}
                    </span>
                    <span className="text-[10px] font-mono text-[var(--color-text-tertiary)]">
                      {new Date(c.date).toISOString().slice(0, 10)}
                    </span>
                  </div>
                  <p className="text-[var(--color-text-secondary)] line-clamp-2 text-[11px]">{c.reasoning}</p>

                  <div className="flex items-center justify-between text-[10px] text-[var(--color-text-tertiary)] mt-2 pt-2 border-t border-[var(--color-border)]">
                    <span className="capitalize">{c.category.replace(/_/g, " ")}</span>
                    {c.reviewDate && (
                      <span className={c.isPendingReview ? "text-[var(--color-warning-text)] font-medium" : "text-[var(--color-text-tertiary)]"}>
                        Review: {new Date(c.reviewDate).toISOString().slice(0, 10)}
                      </span>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="p-6 text-center border border-dashed border-[var(--color-border)] rounded-xl space-y-2">
              <Target size={24} className="mx-auto text-[var(--color-text-tertiary)]" />
              <p className="text-xs text-[var(--color-text-tertiary)]">No decision commitments recorded in Journal.</p>
              <Link
                href="/journal"
                className="text-xs text-[var(--color-positive-text)] hover:text-[var(--color-positive-text)] font-medium inline-block"
              >
                Record your first decision →
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
