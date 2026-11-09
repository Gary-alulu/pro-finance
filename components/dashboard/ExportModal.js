"use client";
// components/dashboard/ExportModal.js
// Modal allowing user to download audited financial CSV/JSON exports.

import { useState } from "react";
import { X, Download, FileSpreadsheet, FileText, CheckCircle2 } from "lucide-react";
import Button from "@/components/ui/Button";

export default function ExportModal({
  isOpen,
  onClose,
  reportingCurrency = "KES",
  currentPeriod = "30d",
}) {
  const [scope, setScope] = useState("summary");
  const [format, setFormat] = useState("csv");
  const [downloading, setDownloading] = useState(false);

  if (!isOpen) return null;

  const handleDownload = () => {
    setDownloading(true);
    const url = `/api/dashboard/export?scope=${encodeURIComponent(scope)}&format=${encodeURIComponent(
      format
    )}&period=${encodeURIComponent(currentPeriod)}&currency=${encodeURIComponent(reportingCurrency)}`;

    const link = document.createElement("a");
    link.href = url;
    link.download = "";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setTimeout(() => {
      setDownloading(false);
      onClose();
    }, 1000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div
        className="relative w-full max-w-md rounded-2xl shadow-2xl overflow-hidden border border-[var(--color-border)]"
        style={{ background: "var(--color-surface, #131d17)", color: "var(--color-text-primary, #faf9f6)" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-[var(--color-border)] bg-[var(--color-surface-2)]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-[var(--color-positive-text)] border border-emerald-500/20">
              <Download size={20} />
            </div>
            <div>
              <h2 className="text-lg font-semibold tracking-tight text-[var(--color-text-primary)]">Export Financial Data</h2>
              <p className="text-xs text-[var(--color-text-tertiary)]">Verified platform records & audit trails</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] rounded-lg hover:bg-[var(--color-surface-3)] transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form options */}
        <div className="p-6 space-y-5">
          {/* Export Scope */}
          <div>
            <label className="text-xs font-mono uppercase tracking-wider text-[var(--color-text-tertiary)] block mb-2">
              Export Scope
            </label>
            <div className="space-y-2">
              {[
                {
                  id: "summary",
                  title: "Financial Summary",
                  desc: "Consolidated KPIs, net worth, cash flow & performance metrics",
                },
                {
                  id: "assets_liabilities",
                  title: "Assets & Liabilities",
                  desc: "Complete balance sheet with ownership shares and valuations",
                },
                {
                  id: "cashflow",
                  title: "Cash Flow Ledger",
                  desc: "Income and expense transactions by category",
                },
              ].map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setScope(opt.id)}
                  className={`w-full text-left p-3 rounded-xl border transition-all ${
                    scope === opt.id
                      ? "bg-emerald-500/10 border-emerald-500/40 text-[var(--color-text-primary)]"
                      : "bg-[var(--color-surface-2)] border-[var(--color-border)] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-3)]"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold">{opt.title}</span>
                    {scope === opt.id && <CheckCircle2 size={16} className="text-[var(--color-positive-text)]" />}
                  </div>
                  <p className="text-xs text-[var(--color-text-tertiary)] mt-0.5">{opt.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Format Selection */}
          <div>
            <label className="text-xs font-mono uppercase tracking-wider text-[var(--color-text-tertiary)] block mb-2">
              File Format
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setFormat("csv")}
                className={`flex items-center gap-2.5 p-3 rounded-xl border transition-all ${
                  format === "csv"
                    ? "bg-emerald-500/10 border-emerald-500/40 text-[var(--color-positive-text)] font-semibold"
                    : "bg-[var(--color-surface-2)] border-[var(--color-border)] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-3)]"
                }`}
              >
                <FileSpreadsheet size={18} />
                <div className="text-left">
                  <div className="text-xs text-[var(--color-text-primary)]">CSV</div>
                  <div className="text-[10px] text-[var(--color-text-tertiary)]">RFC 4180 Protected</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setFormat("json")}
                className={`flex items-center gap-2.5 p-3 rounded-xl border transition-all ${
                  format === "json"
                    ? "bg-emerald-500/10 border-emerald-500/40 text-[var(--color-positive-text)] font-semibold"
                    : "bg-[var(--color-surface-2)] border-[var(--color-border)] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-3)]"
                }`}
              >
                <FileText size={18} />
                <div className="text-left">
                  <div className="text-xs text-[var(--color-text-primary)]">JSON</div>
                  <div className="text-[10px] text-[var(--color-text-tertiary)]">Structured data</div>
                </div>
              </button>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-[var(--color-surface-3)] border border-[var(--color-border)] text-xs text-[var(--color-text-tertiary)] flex items-center justify-between">
            <span>Currency: <strong className="text-[var(--color-text-primary)]">{reportingCurrency}</strong></span>
            <span>Period: <strong className="text-[var(--color-text-primary)]">{currentPeriod}</strong></span>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-[var(--color-border)] bg-[var(--color-surface-2)]">
          <Button variant="ghost" size="sm" onClick={onClose} disabled={downloading}>
            Cancel
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleDownload}
            disabled={downloading}
            className="gap-2"
          >
            <Download size={14} />
            {downloading ? "Generating..." : "Download Export"}
          </Button>
        </div>
      </div>
    </div>
  );
}
