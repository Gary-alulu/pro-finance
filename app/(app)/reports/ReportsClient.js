"use client";
// app/(app)/reports/ReportsClient.js
// Tabular reports across assets, liabilities, investments, transactions and
// documents. Values the user never recorded render as "Missing" — never 0.
// CSV export streams the exact rows shown.

import { useState, useEffect, useMemo } from "react";
import {
  BarChart3,
  Download,
  RefreshCw,
  AlertTriangle,
} from "lucide-react";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import Tabs from "@/components/ui/Tabs";
import EmptyState from "@/components/ui/EmptyState";
import SkeletonLoader from "@/components/ui/SkeletonLoader";
import ErrorState from "@/components/ui/ErrorState";

const ENTITIES = [
  { id: "assets", label: "Assets" },
  { id: "liabilities", label: "Liabilities" },
  { id: "investments", label: "Investments" },
  { id: "transactions", label: "Transactions" },
  { id: "documents", label: "Documents" },
];

// Fields whose presence indicates "missing data" in a row
const STATE_FIELDS = {
  valuationState: "missing",
  balanceState: "missing",
  priceState: "missing",
  amountState: "missing",
};

function renderCell(value, columnKey) {
  // A "state" column that says missing gets a warning badge
  if (STATE_FIELDS[columnKey] && value === "missing") {
    return (
      <Badge tone="coral" size="sm">
        Missing
      </Badge>
    );
  }
  if (STATE_FIELDS[columnKey] && value === "recorded") {
    return (
      <Badge tone="emerald" size="sm">
        Recorded
      </Badge>
    );
  }
  if (
    (columnKey === "maturityState" && (value === "overdue" || value === "upcoming")) ||
    (columnKey === "evidenceStatus" && value === "missing")
  ) {
    return (
      <Badge tone={value === "overdue" || value === "missing" ? "coral" : "gold"} size="sm">
        {value === "overdue" ? "Overdue" : value === "upcoming" ? "Upcoming" : "Missing"}
      </Badge>
    );
  }
  if (value === null || value === undefined) {
    return (
      <span className="text-[var(--color-coral-600)] text-xs italic">Missing</span>
    );
  }
  if (value === "") return "—";
  return String(value);
}

export default function ReportsClient({ user }) {
  const [activeTab, setActiveTab] = useState("assets");
  // Reports are cached per entity; loading is derived from whether the active
  // entity has an entry yet — no sync setState in the fetch effect.
  const [cache, setCache] = useState({});
  const [fetchTick, setFetchTick] = useState(0);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/reports/${activeTab}`)
      .then(async (res) => {
        if (!res.ok) throw new Error(`Failed to load ${activeTab} report`);
        return res.json();
      })
      .then((data) => {
        if (!cancelled) setCache((c) => ({ ...c, [activeTab]: { report: data, error: null } }));
      })
      .catch((err) => {
        if (!cancelled) setCache((c) => ({ ...c, [activeTab]: { report: null, error: err.message } }));
      });
    return () => {
      cancelled = true;
    };
  }, [activeTab, fetchTick]);

  const entry = cache[activeTab];
  const loading = !entry;
  const report = entry?.report || null;
  const error = entry?.error || null;

  const handleExport = async () => {
    try {
      setExporting(true);
      const res = await fetch(`/api/reports/export?type=${activeTab}`);
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `profinance-${activeTab}-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Export error:", err);
    } finally {
      setExporting(false);
    }
  };

  const totalChips = useMemo(() => {
    const totals = report?.totals;
    if (!totals) return [];
    return Object.entries(totals)
      .filter(([k]) => k !== "count")
      .map(([k, v]) => ({
        key: k,
        label: k
          .replace(/([A-Z])/g, " $1")
          .replace(/^./, (c) => c.toUpperCase()),
        value: v,
        warn: k.startsWith("missing") || k.startsWith("unpriced") || k === "overdue" || k === "awaitingReview" || k === "duplicates",
      }));
  }, [report]);

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-screen-2xl mx-auto">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--color-text-primary)]">
            Reports
          </h1>
          <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
            Every recorded field, tabulated. Unrecorded values show as Missing — never as zero.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            icon={RefreshCw}
            onClick={() => setFetchTick((t) => t + 1)}
            loading={loading}
          >
            Refresh
          </Button>
          <Button
            variant="primary"
            icon={Download}
            onClick={handleExport}
            loading={exporting}
            disabled={!report || report.rows.length === 0}
          >
            Export CSV
          </Button>
        </div>
      </div>

      {/* ── Tabs ────────────────────────────────────────────────────────── */}
      <Tabs
        tabs={ENTITIES.map((e) => ({
          ...e,
          count: report?.entity === e.id ? report.totals?.count : undefined,
        }))}
        activeTab={activeTab}
        onChange={setActiveTab}
      />

      {/* ── Totals chips ───────────────────────────────────────────────── */}
      {report && totalChips.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="text-[var(--color-text-tertiary)] font-medium uppercase tracking-wider">
            Totals:
          </span>
          <span className="px-2.5 py-1 rounded-full bg-[var(--color-surface-2)] text-[var(--color-text-secondary)]">
            {totals.count} record{totals.count === 1 ? "" : "s"}
          </span>
          {totalChips.map((chip) => (
            <span
              key={chip.key}
              className={`px-2.5 py-1 rounded-full ${
                chip.warn && chip.value > 0
                  ? "bg-[var(--color-coral-50)] text-[var(--color-coral-700)]"
                  : "bg-[var(--color-surface-2)] text-[var(--color-text-secondary)]"
              }`}
            >
              {chip.label}: {chip.value}
              {chip.warn && chip.value > 0 && (
                <AlertTriangle size={11} className="inline ml-1 -mt-0.5" />
              )}
            </span>
          ))}
        </div>
      )}

      {/* ── Table ──────────────────────────────────────────────────────── */}
      {loading ? (
        <div className="space-y-3">
          <SkeletonLoader className="h-8 w-full" />
          <SkeletonLoader className="h-8 w-full" />
          <SkeletonLoader className="h-8 w-full" />
        </div>
      ) : error ? (
        <ErrorState title="Could not load report" description={error} />
      ) : !report || report.rows.length === 0 ? (
        <EmptyState
          icon={BarChart3}
          title={`No ${activeTab} to report on`}
          description="Add records and this report will populate. Unrecorded fields will be flagged as Missing."
        />
      ) : (
        <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-[var(--color-border)] bg-[var(--color-surface-2)]">
                  {report.columns.map((col) => (
                    <th
                      key={col.key}
                      className="px-4 py-2.5 text-left font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider whitespace-nowrap"
                    >
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)]">
                {report.rows.map((row) => (
                  <tr
                    key={row.id}
                    className="hover:bg-[var(--color-surface-2)] transition-colors"
                  >
                    {report.columns.map((col) => (
                      <td
                        key={col.key}
                        className="px-4 py-2.5 text-[var(--color-text-primary)] whitespace-nowrap"
                      >
                        {renderCell(row[col.key], col.key)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {report && (
        <p className="text-[11px] text-[var(--color-text-tertiary)]">
          Generated {new Date(report.generatedAt).toLocaleString()} · CSV export applies
          spreadsheet formula-injection guards.
        </p>
      )}
    </div>
  );
}
