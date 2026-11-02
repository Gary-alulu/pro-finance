"use client";
// components/journal/JournalEntryCard.js
// Individual decision entry card displaying rationale, outcome targets, and review status.

import { format, differenceInDays } from "date-fns";
import { formatCurrency } from "@/lib/finance/currency";
import { Clock, CheckCircle2, AlertCircle, Link2, Tag, ChevronRight, Edit3, Archive, RotateCcw } from "lucide-react";
import { JOURNAL_CATEGORY_META } from "./JournalConstants";

export default function JournalEntryCard({ entry, onSelect, onEdit, onToggleArchive }) {
  const meta = JOURNAL_CATEGORY_META[entry.category] || JOURNAL_CATEGORY_META.general_reflection;
  const CategoryIcon = meta.icon;

  const decisionDateFormatted = entry.decisionDate
    ? format(new Date(entry.decisionDate), "MMM d, yyyy")
    : "";

  // Review status calculation
  let reviewNotice = null;
  if (entry.reviewDate) {
    if (entry.followUpStatus === "completed") {
      reviewNotice = {
        label: "Follow-Up Completed",
        icon: CheckCircle2,
        color: "#10b981",
        bgColor: "rgba(16, 185, 129, 0.1)",
      };
    } else {
      const daysDiff = differenceInDays(new Date(entry.reviewDate), new Date());
      if (daysDiff < 0) {
        reviewNotice = {
          label: `Review Overdue (${Math.abs(daysDiff)}d ago)`,
          icon: AlertCircle,
          color: "#f59e0b",
          bgColor: "rgba(245, 158, 11, 0.12)",
        };
      } else if (daysDiff === 0) {
        reviewNotice = {
          label: "Review Due Today",
          icon: Clock,
          color: "#f59e0b",
          bgColor: "rgba(245, 158, 11, 0.12)",
        };
      } else {
        reviewNotice = {
          label: `Review in ${daysDiff} days`,
          icon: Clock,
          color: "#38bdf8",
          bgColor: "rgba(56, 189, 248, 0.1)",
        };
      }
    }
  }

  const isArchived = entry.status === "archived";

  return (
    <div
      className={`rounded-2xl p-5 border transition-all duration-200 flex flex-col justify-between gap-4 ${
        isArchived ? "opacity-60" : "hover:border-[var(--color-primary,#10b981)]"
      }`}
      style={{
        background: "var(--color-surface)",
        borderColor: "var(--color-border)",
        boxShadow: "var(--shadow-sm)",
      }}
    >
      <div className="space-y-3">
        {/* Top bar: Category badge, date, amount */}
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <span
              className="text-xs font-semibold px-2.5 py-1 rounded-lg flex items-center gap-1.5"
              style={{
                backgroundColor: meta.bgColor,
                color: meta.color,
              }}
            >
              <CategoryIcon size={13} />
              {meta.label}
            </span>

            {reviewNotice && (
              <span
                className="text-[11px] font-medium px-2 py-0.5 rounded-full flex items-center gap-1"
                style={{
                  backgroundColor: reviewNotice.bgColor,
                  color: reviewNotice.color,
                }}
              >
                <reviewNotice.icon size={11} />
                {reviewNotice.label}
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            {entry.amount?.amount && (
              <span className="font-mono font-bold text-sm" style={{ color: "var(--color-text-primary)" }}>
                {formatCurrency(entry.amount.amount, entry.amount.currency || "KES")}
              </span>
            )}
            <span className="text-xs" style={{ color: "var(--color-text-tertiary)" }}>
              {decisionDateFormatted}
            </span>
          </div>
        </div>

        {/* Title */}
        <h3
          onClick={() => onSelect(entry)}
          className="text-base font-bold cursor-pointer transition-colors hover:text-[var(--color-primary,#10b981)]"
          style={{ color: "var(--color-text-primary)" }}
        >
          {entry.title}
        </h3>

        {/* Excerpt of reasoning */}
        <p
          className="text-xs line-clamp-2 leading-relaxed"
          style={{ color: "var(--color-text-secondary)" }}
        >
          <span className="font-semibold text-[var(--color-text-tertiary)]">Why: </span>
          {entry.contextReasoning}
        </p>

        {/* Target Outcome if specified */}
        {entry.expectedOutcome && (
          <p
            className="text-xs line-clamp-1 italic"
            style={{ color: "var(--color-text-tertiary)" }}
          >
            <span className="font-medium not-italic">Expected Target: </span>
            {entry.expectedOutcome}
          </p>
        )}
      </div>

      {/* Bottom meta row: tags, linked records, and quick actions */}
      <div className="border-t pt-3 flex items-center justify-between flex-wrap gap-2 text-xs" style={{ borderColor: "var(--color-border)" }}>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Linked records count */}
          {entry.linkedRecords?.length > 0 && (
            <span className="flex items-center gap-1 text-[11px]" style={{ color: "var(--color-text-tertiary)" }}>
              <Link2 size={12} />
              {entry.linkedRecords.length} linked
            </span>
          )}

          {/* Tags */}
          {entry.tags?.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="text-[10px] px-1.5 py-0.5 rounded"
              style={{
                background: "var(--color-surface-2)",
                color: "var(--color-text-secondary)",
              }}
            >
              #{tag}
            </span>
          ))}
          {entry.tags?.length > 3 && (
            <span className="text-[10px]" style={{ color: "var(--color-text-tertiary)" }}>
              +{entry.tags.length - 3}
            </span>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onEdit(entry)}
            className="p-1.5 rounded-lg border hover:bg-[var(--color-surface-2)] transition-colors text-[var(--color-text-secondary)]"
            style={{ borderColor: "var(--color-border)" }}
            title="Edit entry"
          >
            <Edit3 size={13} />
          </button>

          <button
            type="button"
            onClick={() => onToggleArchive(entry)}
            className="p-1.5 rounded-lg border hover:bg-[var(--color-surface-2)] transition-colors text-[var(--color-text-secondary)]"
            style={{ borderColor: "var(--color-border)" }}
            title={isArchived ? "Restore to active" : "Archive entry"}
          >
            {isArchived ? <RotateCcw size={13} /> : <Archive size={13} />}
          </button>

          <button
            type="button"
            onClick={() => onSelect(entry)}
            className="text-xs px-2.5 py-1 rounded-lg bg-[var(--color-surface-2)] hover:bg-[var(--color-border)] transition-colors font-medium flex items-center gap-1"
            style={{ color: "var(--color-text-primary)" }}
          >
            View Memo
            <ChevronRight size={13} />
          </button>
        </div>
      </div>
    </div>
  );
}
