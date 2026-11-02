"use client";
// components/journal/JournalEntryModal.js
// Create / Edit modal for Financial Decision entries.

import { useState, useEffect } from "react";
import { X, Calendar, DollarSign, Tag, Link2, AlertTriangle, ShieldCheck, Clock } from "lucide-react";
import { JOURNAL_CATEGORIES, JOURNAL_CATEGORY_META } from "./JournalConstants";
import { addDays, format } from "date-fns";

export default function JournalEntryModal({
  isOpen,
  onClose,
  onSave,
  initialData = null,
  currency = "KES",
}) {
  const [title, setTitle] = useState(initialData?.title || "");
  const [category, setCategory] = useState(initialData?.category || "investment_decision");
  const [decisionDate, setDecisionDate] = useState(
    initialData?.decisionDate
      ? format(new Date(initialData.decisionDate), "yyyy-MM-dd")
      : format(new Date(), "yyyy-MM-dd")
  );
  const [contextReasoning, setContextReasoning] = useState(initialData?.contextReasoning || "");
  const [expectedOutcome, setExpectedOutcome] = useState(initialData?.expectedOutcome || "");
  const [risksAssumptions, setRisksAssumptions] = useState(initialData?.risksAssumptions || "");
  const [alternativesConsidered, setAlternativesConsidered] = useState(initialData?.alternativesConsidered || "");
  const [amountStr, setAmountStr] = useState(initialData?.amount?.amount || "");
  const [tagsStr, setTagsStr] = useState(initialData?.tags?.join(", ") || "");
  const [reviewDate, setReviewDate] = useState(
    initialData?.reviewDate
      ? format(new Date(initialData.reviewDate), "yyyy-MM-dd")
      : ""
  );
  const [reasonForEdit, setReasonForEdit] = useState("");

  const [linkableRecords, setLinkableRecords] = useState([]);
  const [selectedLinkedRecords, setSelectedLinkedRecords] = useState(initialData?.linkedRecords || []);
  const [loadingRecords, setLoadingRecords] = useState(false);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  // Fetch linkable records on open
  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    async function loadLinkable() {
      try {
        setLoadingRecords(true);
        const res = await fetch("/api/journal/linkable-records");
        if (!cancelled && res.ok) {
          const data = await res.json();
          setLinkableRecords(data.records || []);
        }
      } catch (e) {
        console.error("Failed to load linkable records:", e);
      } finally {
        if (!cancelled) setLoadingRecords(false);
      }
    }
    loadLinkable();
    return () => {
      cancelled = true;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  function setQuickReview(days) {
    const target = addDays(new Date(), days);
    setReviewDate(format(target, "yyyy-MM-dd"));
  }

  function toggleRecordLink(rec) {
    const exists = selectedLinkedRecords.some((r) => r.entityId === rec.entityId);
    if (exists) {
      setSelectedLinkedRecords((prev) => prev.filter((r) => r.entityId !== rec.entityId));
    } else {
      setSelectedLinkedRecords((prev) => [...prev, rec]);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!title.trim()) {
      setError("Please provide a title for this decision.");
      return;
    }
    if (!contextReasoning.trim() || contextReasoning.trim().length < 5) {
      setError("Please provide context and reasoning (minimum 5 characters).");
      return;
    }

    try {
      setSaving(true);
      setError(null);

      const tags = tagsStr
        .split(",")
        .map((t) => t.trim().toLowerCase())
        .filter((t) => t.length > 0);

      const payload = {
        title: title.trim(),
        category,
        decisionDate: new Date(decisionDate).toISOString(),
        contextReasoning: contextReasoning.trim(),
        expectedOutcome: expectedOutcome.trim(),
        risksAssumptions: risksAssumptions.trim(),
        alternativesConsidered: alternativesConsidered.trim(),
        amount: amountStr.trim()
          ? { amount: amountStr.trim(), currency }
          : undefined,
        tags,
        linkedRecords: selectedLinkedRecords,
        reviewDate: reviewDate ? new Date(reviewDate).toISOString() : null,
        reasonForEdit: reasonForEdit.trim() || undefined,
      };

      await onSave(payload, initialData?.id);
      onClose();
    } catch (err) {
      setError(err.message || "Failed to save entry");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
      <div
        className="w-full max-w-2xl rounded-2xl border my-8 overflow-hidden flex flex-col max-h-[90vh]"
        style={{
          background: "var(--color-surface)",
          borderColor: "var(--color-border)",
          boxShadow: "var(--shadow-lg, 0 20px 25px -5px rgba(0, 0, 0, 0.5))",
        }}
      >
        {/* Modal Header */}
        <div
          className="p-5 border-b flex items-center justify-between"
          style={{ borderColor: "var(--color-border)" }}
        >
          <div>
            <h2 className="text-base font-bold" style={{ color: "var(--color-text-primary)" }}>
              {initialData ? "Edit Financial Decision Memo" : "Record New Financial Decision"}
            </h2>
            <p className="text-xs mt-0.5" style={{ color: "var(--color-text-tertiary)" }}>
              Document your motivation, targets, and risks before or after taking action.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg border hover:bg-[var(--color-surface-2)] transition-colors text-[var(--color-text-secondary)]"
            style={{ borderColor: "var(--color-border)" }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Modal Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto flex-1">
          {error && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2">
              <AlertTriangle size={14} className="flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Title & Category */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2 space-y-1.5">
              <label className="text-xs font-semibold" style={{ color: "var(--color-text-secondary)" }}>
                Decision Title *
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Build monthly index fund habit, Upgrade development laptop"
                className="w-full px-3 py-2 rounded-xl text-xs border outline-none font-medium"
                style={{
                  background: "var(--color-surface-2)",
                  borderColor: "var(--color-border)",
                  color: "var(--color-text-primary)",
                }}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold" style={{ color: "var(--color-text-secondary)" }}>
                Category *
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 rounded-xl text-xs border outline-none font-medium"
                style={{
                  background: "var(--color-surface-2)",
                  borderColor: "var(--color-border)",
                  color: "var(--color-text-primary)",
                }}
              >
                {JOURNAL_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {JOURNAL_CATEGORY_META[c]?.label || c}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Date & Financial Amount */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold" style={{ color: "var(--color-text-secondary)" }}>
                Decision Date
              </label>
              <input
                type="date"
                value={decisionDate}
                onChange={(e) => setDecisionDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl text-xs border outline-none"
                style={{
                  background: "var(--color-surface-2)",
                  borderColor: "var(--color-border)",
                  color: "var(--color-text-primary)",
                }}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold" style={{ color: "var(--color-text-secondary)" }}>
                Financial Amount ({currency}, Optional)
              </label>
              <input
                type="number"
                step="any"
                min="0"
                value={amountStr}
                onChange={(e) => setAmountStr(e.target.value)}
                placeholder="e.g. 50000"
                className="w-full px-3 py-2 rounded-xl text-xs border outline-none font-mono"
                style={{
                  background: "var(--color-surface-2)",
                  borderColor: "var(--color-border)",
                  color: "var(--color-text-primary)",
                }}
              />
            </div>
          </div>

          {/* Context & Reasoning (Why am I doing this?) */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold flex items-center justify-between" style={{ color: "var(--color-text-secondary)" }}>
              <span>Why am I doing this? (Context & Motivation) *</span>
              <span className="text-[10px]" style={{ color: "var(--color-text-tertiary)" }}>
                Core reasoning preserved in audit log
              </span>
            </label>
            <textarea
              required
              rows={3}
              value={contextReasoning}
              onChange={(e) => setContextReasoning(e.target.value)}
              placeholder="Explain the background, why this financial move is necessary or attractive, and what problem it solves…"
              className="w-full p-3 rounded-xl text-xs border outline-none leading-relaxed"
              style={{
                background: "var(--color-surface-2)",
                borderColor: "var(--color-border)",
                color: "var(--color-text-primary)",
              }}
            />
          </div>

          {/* Expected Outcome */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold" style={{ color: "var(--color-text-secondary)" }}>
              What does success look like? (Expected Outcome)
            </label>
            <textarea
              rows={2}
              value={expectedOutcome}
              onChange={(e) => setExpectedOutcome(e.target.value)}
              placeholder="e.g. Maintain 3 consecutive months of contributions; recover device cost in 6 months via freelance contracts."
              className="w-full p-3 rounded-xl text-xs border outline-none leading-relaxed"
              style={{
                background: "var(--color-surface-2)",
                borderColor: "var(--color-border)",
                color: "var(--color-text-primary)",
              }}
            />
          </div>

          {/* Risks & Assumptions */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold" style={{ color: "var(--color-text-secondary)" }}>
                Risks & Assumptions
              </label>
              <textarea
                rows={2}
                value={risksAssumptions}
                onChange={(e) => setRisksAssumptions(e.target.value)}
                placeholder="Market volatility, cashflow shocks, maintenance costs…"
                className="w-full p-2.5 rounded-xl text-xs border outline-none leading-relaxed"
                style={{
                  background: "var(--color-surface-2)",
                  borderColor: "var(--color-border)",
                  color: "var(--color-text-primary)",
                }}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold" style={{ color: "var(--color-text-secondary)" }}>
                Alternatives Considered
              </label>
              <textarea
                rows={2}
                value={alternativesConsidered}
                onChange={(e) => setAlternativesConsidered(e.target.value)}
                placeholder="Financing vs Cash, delaying purchase, cheaper index fund…"
                className="w-full p-2.5 rounded-xl text-xs border outline-none leading-relaxed"
                style={{
                  background: "var(--color-surface-2)",
                  borderColor: "var(--color-border)",
                  color: "var(--color-text-primary)",
                }}
              />
            </div>
          </div>

          {/* Follow-up / Review Scheduling */}
          <div className="p-4 rounded-xl border space-y-2.5" style={{ background: "var(--color-surface-2)", borderColor: "var(--color-border)" }}>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold flex items-center gap-1.5" style={{ color: "var(--color-text-primary)" }}>
                <Clock size={13} className="text-sky-400" />
                Schedule Follow-Up Review
              </span>
              <span className="text-[11px]" style={{ color: "var(--color-text-tertiary)" }}>
                Revisit decision to evaluate actual results
              </span>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <input
                type="date"
                value={reviewDate}
                onChange={(e) => setReviewDate(e.target.value)}
                className="px-3 py-1.5 rounded-lg text-xs border outline-none"
                style={{
                  background: "var(--color-surface)",
                  borderColor: "var(--color-border)",
                  color: "var(--color-text-primary)",
                }}
              />

              <button
                type="button"
                onClick={() => setQuickReview(30)}
                className="text-xs px-2.5 py-1 rounded-lg border hover:bg-[var(--color-surface)] transition-colors"
                style={{ borderColor: "var(--color-border)", color: "var(--color-text-secondary)" }}
              >
                +30 Days
              </button>
              <button
                type="button"
                onClick={() => setQuickReview(90)}
                className="text-xs px-2.5 py-1 rounded-lg border hover:bg-[var(--color-surface)] transition-colors"
                style={{ borderColor: "var(--color-border)", color: "var(--color-text-secondary)" }}
              >
                +90 Days
              </button>
              <button
                type="button"
                onClick={() => setQuickReview(180)}
                className="text-xs px-2.5 py-1 rounded-lg border hover:bg-[var(--color-surface)] transition-colors"
                style={{ borderColor: "var(--color-border)", color: "var(--color-text-secondary)" }}
              >
                +180 Days
              </button>
              <button
                type="button"
                onClick={() => setQuickReview(365)}
                className="text-xs px-2.5 py-1 rounded-lg border hover:bg-[var(--color-surface)] transition-colors"
                style={{ borderColor: "var(--color-border)", color: "var(--color-text-secondary)" }}
              >
                +1 Year
              </button>
            </div>
          </div>

          {/* Link Records Section */}
          <div className="space-y-2">
            <label className="text-xs font-semibold flex items-center gap-1.5" style={{ color: "var(--color-text-secondary)" }}>
              <Link2 size={13} />
              Connect Supporting Financial Records
            </label>
            <div
              className="p-3 rounded-xl border max-h-36 overflow-y-auto space-y-1.5"
              style={{
                background: "var(--color-surface-2)",
                borderColor: "var(--color-border)",
              }}
            >
              {loadingRecords ? (
                <p className="text-xs" style={{ color: "var(--color-text-tertiary)" }}>Loading accounts and records…</p>
              ) : linkableRecords.length === 0 ? (
                <p className="text-xs" style={{ color: "var(--color-text-tertiary)" }}>No recorded assets or transactions found to link.</p>
              ) : (
                linkableRecords.map((rec) => {
                  const isSelected = selectedLinkedRecords.some((r) => r.entityId === rec.entityId);
                  return (
                    <div
                      key={rec.entityId}
                      onClick={() => toggleRecordLink(rec)}
                      className={`p-2 rounded-lg text-xs cursor-pointer flex items-center justify-between border transition-all ${
                        isSelected
                          ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-400 font-medium"
                          : "border-transparent hover:bg-[var(--color-surface)] text-[var(--color-text-secondary)]"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] uppercase font-bold px-1.5 py-0.2 rounded bg-black/20">
                          {rec.entityType}
                        </span>
                        <span>{rec.title}</span>
                      </div>
                      {rec.amount && (
                        <span className="font-mono text-[11px]">
                          {rec.amount} {rec.currency}
                        </span>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Tags */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold flex items-center gap-1.5" style={{ color: "var(--color-text-secondary)" }}>
              <Tag size={13} />
              Keywords & Tags (comma-separated)
            </label>
            <input
              type="text"
              value={tagsStr}
              onChange={(e) => setTagsStr(e.target.value)}
              placeholder="investing, tech, career, risk-management"
              className="w-full px-3 py-2 rounded-xl text-xs border outline-none"
              style={{
                background: "var(--color-surface-2)",
                borderColor: "var(--color-border)",
                color: "var(--color-text-primary)",
              }}
            />
          </div>

          {/* Reason for Edit if initialData */}
          {initialData && (
            <div className="space-y-1.5 border-t pt-3" style={{ borderColor: "var(--color-border)" }}>
              <label className="text-xs font-semibold" style={{ color: "var(--color-text-secondary)" }}>
                Reason for this update (logged in edit history)
              </label>
              <input
                type="text"
                value={reasonForEdit}
                onChange={(e) => setReasonForEdit(e.target.value)}
                placeholder="e.g. Revised expected timeline; added risk factor"
                className="w-full px-3 py-2 rounded-xl text-xs border outline-none"
                style={{
                  background: "var(--color-surface-2)",
                  borderColor: "var(--color-border)",
                  color: "var(--color-text-primary)",
                }}
              />
            </div>
          )}

          {/* Footer actions */}
          <div className="border-t pt-4 flex items-center justify-end gap-3" style={{ borderColor: "var(--color-border)" }}>
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2 rounded-xl border text-xs font-medium hover:bg-[var(--color-surface-2)] transition-colors"
              style={{ borderColor: "var(--color-border)", color: "var(--color-text-secondary)" }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 rounded-xl bg-[var(--color-primary,#10b981)] text-white text-xs font-semibold hover:opacity-90 transition-opacity shadow-sm"
            >
              {saving ? "Saving…" : initialData ? "Save Changes" : "Create Decision Entry"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
