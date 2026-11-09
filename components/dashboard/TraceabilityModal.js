"use client";
// components/dashboard/TraceabilityModal.js
// Modal that renders complete mathematical transparency and underlying records for any metric.

import { useState, useEffect } from "react";
import {
  X,
  Calculator,
  ExternalLink,
  AlertCircle,
  CheckCircle2,
  Download,
  Info,
  ShieldCheck,
} from "lucide-react";
import { formatCurrency } from "@/lib/finance/currency";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";

export default function TraceabilityModal({
  isOpen,
  onClose,
  metric = "netWorth",
  reportingCurrency = "KES",
  period = "30d",
}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("included"); // "included" | "excluded" | "formula"

  useEffect(() => {
    if (!isOpen || !metric) return;
    async function fetchTrace() {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(
          `/api/dashboard/trace?metric=${encodeURIComponent(metric)}&currency=${encodeURIComponent(
            reportingCurrency
          )}&period=${encodeURIComponent(period)}`
        );
        if (!res.ok) throw new Error("Failed to load calculation trace");
        const json = await res.json();
        setData(json);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchTrace();
  }, [isOpen, metric, reportingCurrency, period]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div
        className="relative w-full max-w-4xl max-h-[90vh] flex flex-col rounded-2xl shadow-2xl overflow-hidden border border-[var(--color-border)]"
        style={{ background: "var(--color-surface, #131d17)", color: "var(--color-text-primary, #faf9f6)" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-[var(--color-border)] bg-[var(--color-surface-2)]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-[var(--color-positive-text)] border border-emerald-500/20">
              <Calculator size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold tracking-tight text-[var(--color-text-primary)]">
                  {data?.title || "Calculation & Traceability"}
                </h2>
                <Badge variant="outline" className="text-xs uppercase font-mono border-emerald-500/30 text-[var(--color-positive-text)]">
                  Deterministic
                </Badge>
              </div>
              <p className="text-xs text-[var(--color-text-tertiary)] mt-0.5">
                Every number is fully explainable, audited, and linked to verified records.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] rounded-lg hover:bg-[var(--color-surface-3)] transition-colors"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 space-y-3">
              <div className="w-8 h-8 border-2 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
              <p className="text-sm text-[var(--color-text-tertiary)]">Auditing source records...</p>
            </div>
          ) : error ? (
            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-[var(--color-negative-text)] text-sm">
              {error}
            </div>
          ) : data ? (
            <>
              {/* Formula Card */}
              <div
                className="p-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)]"
              >
                <div className="flex items-center justify-between text-xs text-[var(--color-text-tertiary)] mb-2">
                  <span className="font-mono uppercase tracking-wider">Applied Calculation Formula</span>
                  <span className="font-mono text-[var(--color-positive-text)]">Total: {formatCurrency(data.totalValue, reportingCurrency)}</span>
                </div>
                <div className="font-mono text-sm sm:text-base font-medium text-[var(--color-text-primary)] bg-[var(--color-surface-3)] p-3 rounded-lg border border-[var(--color-border)]">
                  {data.formula}
                </div>
                {data.summaryComponents && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4">
                    {data.summaryComponents.map((comp, idx) => (
                      <div key={idx} className="p-3 rounded-lg bg-[var(--color-surface-2)] border border-[var(--color-border)]">
                        <span className="text-xs text-[var(--color-text-tertiary)] block">{comp.label}</span>
                        <span className="text-base font-semibold text-[var(--color-text-primary)] mt-1 block">
                          {formatCurrency(comp.value, reportingCurrency)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
                {data.explanation && (
                  <div className="flex items-start gap-2 text-xs text-[var(--color-text-secondary)] mt-3 pt-3 border-t border-[var(--color-border)]">
                    <Info size={14} className="flex-shrink-0 mt-0.5 text-[var(--color-positive-text)]" />
                    <span>{data.explanation}</span>
                  </div>
                )}
              </div>

              {/* Records Tabs */}
              <div>
                <div className="flex items-center justify-between border-b border-[var(--color-border)] mb-4">
                  <div className="flex items-center gap-4">
                    <button
                      onClick={() => setActiveTab("included")}
                      className={`pb-2.5 text-xs font-medium uppercase tracking-wider transition-colors relative ${
                        activeTab === "included"
                          ? "text-[var(--color-positive-text)]"
                          : "text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)]"
                      }`}
                    >
                      Included Records ({data.includedRecords?.length || 0})
                      {activeTab === "included" && (
                        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-500 rounded-full" />
                      )}
                    </button>
                    <button
                      onClick={() => setActiveTab("excluded")}
                      className={`pb-2.5 text-xs font-medium uppercase tracking-wider transition-colors relative ${
                        activeTab === "excluded"
                          ? "text-[var(--color-warning-text)]"
                          : "text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)]"
                      }`}
                    >
                      Excluded / Incomplete ({data.excludedRecords?.length || 0})
                      {activeTab === "excluded" && (
                        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-amber-500 rounded-full" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Tab: Included Records */}
                {activeTab === "included" && (
                  <div className="space-y-2">
                    {data.includedRecords && data.includedRecords.length > 0 ? (
                      <div className="overflow-x-auto rounded-xl border border-[var(--color-border)]">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-[var(--color-surface-3)] text-[var(--color-text-tertiary)] uppercase font-mono border-b border-[var(--color-border)]">
                            <tr>
                              <th className="py-2.5 px-3">Item / Name</th>
                              <th className="py-2.5 px-3">Category</th>
                              <th className="py-2.5 px-3">Recorded Value</th>
                              <th className="py-2.5 px-3">Attributable</th>
                              <th className="py-2.5 px-3">Converted ({reportingCurrency})</th>
                              <th className="py-2.5 px-3">Date</th>
                              <th className="py-2.5 px-3 text-right">Source</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[var(--color-border)] text-[var(--color-text-secondary)]">
                            {data.includedRecords.map((item, idx) => (
                              <tr key={idx} className="hover:bg-[var(--color-surface-2)] transition-colors">
                                <td className="py-2.5 px-3 font-medium text-[var(--color-text-primary)]">{item.name}</td>
                                <td className="py-2.5 px-3 capitalize text-[var(--color-text-secondary)]">{item.category?.replace(/_/g, " ")}</td>
                                <td className="py-2.5 px-3 font-mono">
                                  {item.originalAmount != null
                                    ? formatCurrency(item.originalAmount, item.currency)
                                    : item.marketValue != null
                                    ? formatCurrency(item.marketValue, item.currency)
                                    : "—"}
                                </td>
                                <td className="py-2.5 px-3 font-mono">
                                  {item.ownershipPercentage !== undefined && item.ownershipPercentage !== 100 ? (
                                    <span className="text-[var(--color-warning-text)]">
                                      {item.ownershipPercentage}% ({formatCurrency(item.attributableAmount, item.currency)})
                                    </span>
                                  ) : (
                                    "100%"
                                  )}
                                </td>
                                <td className="py-2.5 px-3 font-mono font-semibold text-[var(--color-positive-text)]">
                                  {formatCurrency(item.convertedAmount, reportingCurrency)}
                                </td>
                                <td className="py-2.5 px-3 text-[var(--color-text-tertiary)] font-mono">
                                  {item.asOf ? new Date(item.asOf).toISOString().slice(0, 10) : "Current"}
                                </td>
                                <td className="py-2.5 px-3 text-right">
                                  {item.href ? (
                                    <a
                                      href={item.href}
                                      className="inline-flex items-center gap-1 text-[var(--color-positive-text)] hover:text-[var(--color-positive-text)] font-medium"
                                    >
                                      View <ExternalLink size={11} />
                                    </a>
                                  ) : (
                                    "—"
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <p className="text-xs text-[var(--color-text-tertiary)] py-6 text-center">No included records found.</p>
                    )}
                  </div>
                )}

                {/* Tab: Excluded / Incomplete Records */}
                {activeTab === "excluded" && (
                  <div className="space-y-2">
                    {data.excludedRecords && data.excludedRecords.length > 0 ? (
                      <div className="overflow-x-auto rounded-xl border border-[var(--color-border)]">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-[var(--color-surface-3)] text-[var(--color-text-tertiary)] uppercase font-mono border-b border-[var(--color-border)]">
                            <tr>
                              <th className="py-2.5 px-3">Item / Name</th>
                              <th className="py-2.5 px-3">Category</th>
                              <th className="py-2.5 px-3">Reason for Omission</th>
                              <th className="py-2.5 px-3">Impact</th>
                              <th className="py-2.5 px-3 text-right">Action</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[var(--color-border)] text-[var(--color-text-secondary)]">
                            {data.excludedRecords.map((item, idx) => (
                              <tr key={idx} className="hover:bg-[var(--color-surface-2)] transition-colors">
                                <td className="py-2.5 px-3 font-medium text-[var(--color-text-primary)]">{item.name}</td>
                                <td className="py-2.5 px-3 capitalize text-[var(--color-text-secondary)]">{item.category?.replace(/_/g, " ")}</td>
                                <td className="py-2.5 px-3 text-[var(--color-warning-text)] font-mono">
                                  {item.reason === "missing_valuation"
                                    ? "No confirmed valuation"
                                    : item.reason === "missing_balance"
                                    ? "No outstanding balance recorded"
                                    : item.reason === "missing_price_or_units"
                                    ? "Missing share price"
                                    : item.reason === "missing_rate"
                                    ? "No dated exchange rate found"
                                    : item.reason || "Excluded"}
                                </td>
                                <td className="py-2.5 px-3 text-[var(--color-text-tertiary)]">
                                  Excluded from totals (never treated as 0)
                                </td>
                                <td className="py-2.5 px-3 text-right">
                                  {item.href ? (
                                    <a
                                      href={item.href}
                                      className="inline-flex items-center gap-1 text-[var(--color-positive-text)] hover:text-[var(--color-positive-text)] font-medium"
                                    >
                                      Fix record <ExternalLink size={11} />
                                    </a>
                                  ) : (
                                    "—"
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="p-6 text-center space-y-2">
                        <ShieldCheck size={28} className="mx-auto text-[var(--color-positive-text)]" />
                        <p className="text-sm font-medium text-[var(--color-text-primary)]">All eligible records are verified</p>
                        <p className="text-xs text-[var(--color-text-tertiary)]">
                          There are no omitted or incomplete records affecting this metric.
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </>
          ) : null}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-[var(--color-border)] bg-[var(--color-surface-2)]">
          <span className="text-xs text-[var(--color-text-tertiary)] font-mono">
            Audit standard: Deterministic calculation · Currency: {reportingCurrency}
          </span>
          <Button variant="secondary" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}
