"use client";
// components/journal/JournalDetailDrawer.js
// Deep inspection drawer for a financial decision entry, displaying full reasoning,
// linked evidence, immutable edit history, and outcome/lessons tracking.

import { useState } from "react";
import { format } from "date-fns";
import { formatCurrency } from "@/lib/finance/currency";
import {
  X,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  Link2,
  Tag,
  History,
  Lightbulb,
  Edit3,
  BookmarkCheck,
  ShieldCheck,
} from "lucide-react";
import { JOURNAL_CATEGORY_META } from "./JournalConstants";

export default function JournalDetailDrawer({
  entry,
  isOpen,
  onClose,
  onEdit,
  onUpdateOutcome,
}) {
  const [outcomeInput, setOutcomeInput] = useState(entry?.outcomeLessons || "");
  const [savingOutcome, setSavingOutcome] = useState(false);

  if (!isOpen || !entry) return null;

  const meta = JOURNAL_CATEGORY_META[entry.category] || JOURNAL_CATEGORY_META.general_reflection;
  const CategoryIcon = meta.icon;

  const formattedDate = entry.decisionDate
    ? format(new Date(entry.decisionDate), "MMMM d, yyyy")
    : "";

  const reviewFormatted = entry.reviewDate
    ? format(new Date(entry.reviewDate), "MMMM d, yyyy")
    : null;

  async function handleSaveOutcome() {
    if (!outcomeInput.trim()) return;
    try {
      setSavingOutcome(true);
      await onUpdateOutcome(entry.id, outcomeInput.trim());
    } finally {
      setSavingOutcome(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/60 backdrop-blur-sm p-0 sm:p-4">
      <div
        className="w-full max-w-xl h-full sm:h-[95vh] sm:rounded-2xl border flex flex-col overflow-hidden shadow-2xl"
        style={{
          background: "var(--color-surface)",
          borderColor: "var(--color-border)",
        }}
      >
        {/* Top Header */}
        <div className="p-5 border-b flex items-start justify-between gap-4" style={{ borderColor: "var(--color-border)" }}>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span
                className="text-xs font-semibold px-2.5 py-1 rounded-lg flex items-center gap-1.5"
                style={{ backgroundColor: meta.bgColor, color: meta.color }}
              >
                <CategoryIcon size={13} />
                {meta.label}
              </span>
              <span className="text-xs" style={{ color: "var(--color-text-tertiary)" }}>
                {formattedDate}
              </span>
            </div>

            <h2 className="text-lg font-bold" style={{ color: "var(--color-text-primary)" }}>
              {entry.title}
            </h2>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => onEdit(entry)}
              className="p-1.5 rounded-lg border hover:bg-[var(--color-surface-2)] transition-colors text-[var(--color-text-secondary)]"
              style={{ borderColor: "var(--color-border)" }}
              title="Edit entry"
            >
              <Edit3 size={15} />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg border hover:bg-[var(--color-surface-2)] transition-colors text-[var(--color-text-secondary)]"
              style={{ borderColor: "var(--color-border)" }}
            >
              <X size={15} />
            </button>
          </div>
        </div>

        {/* Content Scrollable Body */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1">
          {/* Amount banner if present */}
          {entry.amount?.amount && (
            <div
              className="p-3.5 rounded-xl border flex items-center justify-between"
              style={{
                background: "var(--color-surface-2)",
                borderColor: "var(--color-border)",
              }}
            >
              <span className="text-xs font-medium" style={{ color: "var(--color-text-secondary)" }}>
                Recorded Financial Impact
              </span>
              <span className="font-mono font-bold text-base" style={{ color: "var(--color-text-primary)" }}>
                {formatCurrency(entry.amount.amount, entry.amount.currency || "KES")}
              </span>
            </div>
          )}

          {/* 1. Context & Motivation */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5" style={{ color: "var(--color-text-secondary)" }}>
              <span>Why am I doing this? (Context & Reasoning)</span>
            </h4>
            <div
              className="p-4 rounded-xl border text-xs leading-relaxed whitespace-pre-wrap"
              style={{
                background: "var(--color-surface-2)",
                borderColor: "var(--color-border)",
                color: "var(--color-text-primary)",
              }}
            >
              {entry.contextReasoning}
            </div>
          </div>

          {/* 2. Expected Outcome */}
          {entry.expectedOutcome && (
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5" style={{ color: "var(--color-text-secondary)" }}>
                <span>Expected Outcome & Success Criteria</span>
              </h4>
              <div
                className="p-4 rounded-xl border text-xs leading-relaxed whitespace-pre-wrap"
                style={{
                  background: "var(--color-surface-2)",
                  borderColor: "var(--color-border)",
                  color: "var(--color-text-primary)",
                }}
              >
                {entry.expectedOutcome}
              </div>
            </div>
          )}

          {/* 3. Risks & Assumptions */}
          {entry.risksAssumptions && (
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--color-text-secondary)" }}>
                Risks, Uncertainties & Assumptions
              </h4>
              <div
                className="p-3.5 rounded-xl border text-xs leading-relaxed whitespace-pre-wrap"
                style={{
                  background: "var(--color-surface-2)",
                  borderColor: "var(--color-border)",
                  color: "var(--color-text-secondary)",
                }}
              >
                {entry.risksAssumptions}
              </div>
            </div>
          )}

          {/* 4. Alternatives Considered */}
          {entry.alternativesConsidered && (
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--color-text-secondary)" }}>
                Alternatives Considered
              </h4>
              <div
                className="p-3.5 rounded-xl border text-xs leading-relaxed whitespace-pre-wrap"
                style={{
                  background: "var(--color-surface-2)",
                  borderColor: "var(--color-border)",
                  color: "var(--color-text-secondary)",
                }}
              >
                {entry.alternativesConsidered}
              </div>
            </div>
          )}

          {/* 5. Linked Supporting Records */}
          {entry.linkedRecords?.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5" style={{ color: "var(--color-text-secondary)" }}>
                <Link2 size={13} />
                Linked Supporting Records
              </h4>
              <div className="space-y-1.5">
                {entry.linkedRecords.map((rec) => (
                  <div
                    key={rec.entityId}
                    className="p-3 rounded-xl border flex items-center justify-between text-xs"
                    style={{
                      background: "var(--color-surface-2)",
                      borderColor: "var(--color-border)",
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] uppercase font-bold px-1.5 py-0.2 rounded bg-black/25">
                        {rec.entityType}
                      </span>
                      <span className="font-medium" style={{ color: "var(--color-text-primary)" }}>
                        {rec.title}
                      </span>
                    </div>
                    {rec.amount && (
                      <span className="font-mono font-semibold" style={{ color: "var(--color-text-primary)" }}>
                        {rec.amount} {rec.currency}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 6. Outcome Tracking & Follow-up */}
          <div
            className="p-5 rounded-2xl border space-y-3"
            style={{
              background: "var(--color-surface-2)",
              borderColor: "var(--color-border)",
            }}
          >
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <Lightbulb size={16} className="text-amber-400" />
                <h4 className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--color-text-primary)" }}>
                  Decision Follow-Up & Outcome
                </h4>
              </div>
              {reviewFormatted && (
                <span className="text-[11px] font-medium" style={{ color: "var(--color-text-tertiary)" }}>
                  Review Date: {reviewFormatted}
                </span>
              )}
            </div>

            <p className="text-xs" style={{ color: "var(--color-text-tertiary)" }}>
              Did reality match your expectations? What lessons should you apply to future decisions?
            </p>

            <textarea
              rows={3}
              value={outcomeInput}
              onChange={(e) => setOutcomeInput(e.target.value)}
              placeholder="Record what actually happened, how the outcome compared with your expectations, and key takeaways…"
              className="w-full p-3 rounded-xl text-xs border outline-none leading-relaxed"
              style={{
                background: "var(--color-surface)",
                borderColor: "var(--color-border)",
                color: "var(--color-text-primary)",
              }}
            />

            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleSaveOutcome}
                disabled={savingOutcome}
                className="px-4 py-1.5 rounded-lg bg-[var(--color-primary,#10b981)] text-white text-xs font-semibold hover:opacity-90 transition-opacity flex items-center gap-1.5 shadow-sm"
              >
                <BookmarkCheck size={13} />
                {savingOutcome ? "Saving…" : "Save Reflection Outcome"}
              </button>
            </div>
          </div>

          {/* 7. Edit History (Audit Trail) */}
          {entry.editHistory?.length > 0 && (
            <div className="space-y-2 border-t pt-4" style={{ borderColor: "var(--color-border)" }}>
              <h4 className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5" style={{ color: "var(--color-text-secondary)" }}>
                <History size={13} />
                Prior Decision Reasoning History
              </h4>
              <div className="space-y-2">
                {entry.editHistory.map((h, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl border text-xs space-y-1 opacity-75"
                    style={{
                      background: "var(--color-surface-2)",
                      borderColor: "var(--color-border)",
                    }}
                  >
                    <div className="flex items-center justify-between text-[11px]" style={{ color: "var(--color-text-tertiary)" }}>
                      <span>{h.editedAt ? format(new Date(h.editedAt), "MMM d, yyyy HH:mm") : "Previous Version"}</span>
                      <span>{h.reason || "Updated reasoning"}</span>
                    </div>
                    {h.previousState?.contextReasoning && (
                      <p className="line-clamp-2 italic" style={{ color: "var(--color-text-secondary)" }}>
                        &ldquo;{h.previousState.contextReasoning}&rdquo;
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
