"use client";
// app/(app)/asset-liability/reports/AssetLiabilityReportsClient.js
// Dedicated reports & analytics view for Asset & Liability Management.

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  FileText,
  Download,
  Printer,
  Scale,
  TrendingUp,
  TrendingDown,
  PieChart,
  Calendar,
  AlertCircle,
  ArrowLeft,
  CheckCircle,
} from "lucide-react";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import SkeletonLoader from "@/components/ui/SkeletonLoader";

function formatMoney(amount, currency = "KES") {
  if (amount == null || amount === "" || isNaN(Number(amount))) return "—";
  return `${currency} ${Number(amount).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export default function AssetLiabilityReportsClient({ user }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchReport() {
      try {
        const res = await fetch("/api/assets-liabilities/overview");
        if (!res.ok) throw new Error("Failed to load report data");
        const json = await res.json();
        setData(json);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchReport();
  }, []);

  function handleExportCsv() {
    if (!data) return;
    const rows = [
      ["Section", "Name / Category", "Type", "Currency", "Attributable Amount", "Valuation Date / As Of"],
      ...data.assets.map((a) => [
        "Asset",
        `"${a.name}"`,
        a.category,
        a.currency,
        a.attributableValue || "0",
        a.asOf ? new Date(a.asOf).toISOString().split("T")[0] : "None",
      ]),
      ...data.liabilities.map((l) => [
        "Liability",
        `"${l.name}"`,
        l.category,
        l.currency,
        l.currentBalance || "0",
        l.maturityDate ? new Date(l.maturityDate).toISOString().split("T")[0] : "None",
      ]),
    ];

    const csvContent = "data:text/csv;charset=utf-8," + rows.map((e) => e.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Balance_Sheet_Report_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  if (loading) {
    return (
      <div className="p-6 max-w-5xl mx-auto space-y-6">
        <div className="h-8 w-64 bg-[var(--color-surface-2)] rounded animate-pulse" />
        <div className="h-96 bg-[var(--color-surface-2)] rounded-xl animate-pulse" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-8 text-center text-[var(--color-negative-text)]">
        Failed to load balance sheet report. Please try again.
      </div>
    );
  }

  const { summary, assetAllocation, debtAllocation, assets, liabilities } = data;
  const currency = data.reportingCurrency || "KES";

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--color-border)] pb-6">
        <div>
          <Link
            href="/assets-liabilities"
            className="text-xs text-sky-600 dark:text-sky-400 hover:underline flex items-center mb-2"
          >
            <ArrowLeft className="w-3.5 h-3.5 mr-1" /> Back to Assets & Liabilities Hub
          </Link>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[var(--color-text-primary)] tracking-tight">
            Asset & Liability Statement Report
          </h1>
          <p className="text-xs text-[var(--color-text-secondary)]">
            Generated as of {new Date(data.asOf).toLocaleString()} · Reporting Currency: {currency}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={() => window.print()}>
            <Printer className="w-4 h-4 mr-1.5" /> Print
          </Button>
          <Button variant="primary" size="sm" onClick={handleExportCsv}>
            <Download className="w-4 h-4 mr-1.5" /> Export CSV
          </Button>
        </div>
      </div>

      {/* High-Level Position Summary Table */}
      <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-6 shadow-xl space-y-4">
        <h2 className="text-base font-bold text-[var(--color-text-primary)] uppercase tracking-wider text-xs text-[var(--color-text-secondary)]">
          Executive Balance Sheet Summary
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
          <div className="p-4 rounded-xl bg-[var(--color-surface-2)]/50 border border-[var(--color-border)]/60">
            <div className="text-xs text-[var(--color-positive-text)] font-semibold mb-1">Total Assets</div>
            <div className="text-xl font-black text-[var(--color-text-primary)]">{formatMoney(summary.totalAssets, currency)}</div>
            <div className="text-[11px] text-[var(--color-text-secondary)] mt-1">{summary.assetCount} registered asset items</div>
          </div>
          <div className="p-4 rounded-xl bg-[var(--color-surface-2)]/50 border border-[var(--color-border)]/60">
            <div className="text-xs text-[var(--color-negative-text)] font-semibold mb-1">Total Liabilities</div>
            <div className="text-xl font-black text-[var(--color-text-primary)]">{formatMoney(summary.totalLiabilities, currency)}</div>
            <div className="text-[11px] text-[var(--color-text-secondary)] mt-1">{summary.liabilityCount} active debt accounts</div>
          </div>
          <div className="p-4 rounded-xl bg-[var(--color-surface-2)]/50 border border-[var(--color-border)]/60">
            <div className="text-xs text-sky-600 dark:text-sky-400 font-semibold mb-1">Net Financial Position</div>
            <div className="text-xl font-black text-[var(--color-text-primary)]">{formatMoney(summary.netWorth, currency)}</div>
            <div className="text-[11px] text-[var(--color-text-secondary)] mt-1">Debt-to-Asset: {summary.debtToAssetRatio}%</div>
          </div>
        </div>
      </div>

      {/* Asset Register Schedule */}
      <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-[var(--color-text-primary)] flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-[var(--color-positive-text)]" /> Asset Inventory & Attributable Values
          </h2>
          <span className="text-xs text-[var(--color-text-secondary)]">{assets.length} items</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-[var(--color-text-secondary)]">
            <thead className="border-b border-[var(--color-border)] text-[var(--color-text-secondary)] uppercase text-[10px] tracking-wider">
              <tr>
                <th className="py-2.5 px-3">Asset Name</th>
                <th className="py-2.5 px-3">Category</th>
                <th className="py-2.5 px-3">Ownership</th>
                <th className="py-2.5 px-3">Valuation Method</th>
                <th className="py-2.5 px-3">Valuation Date</th>
                <th className="py-2.5 px-3 text-right">Attributable Value ({currency})</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)]">
              {assets.map((a) => (
                <tr key={a.id} className="hover:bg-[var(--color-surface-2)]/30">
                  <td className="py-3 px-3 font-medium text-[var(--color-text-primary)]">{a.name}</td>
                  <td className="py-3 px-3 text-[var(--color-text-secondary)]">{a.categoryLabel || a.category}</td>
                  <td className="py-3 px-3">
                    <span className="capitalize">{a.ownershipType}</span> ({a.ownershipPercentage}%)
                  </td>
                  <td className="py-3 px-3 capitalize">{a.valuationMethod?.replace("_", " ")}</td>
                  <td className="py-3 px-3">
                    {a.asOf ? (
                      <span className={a.isStale ? "text-[var(--color-warning-text)] font-semibold" : ""}>
                        {new Date(a.asOf).toLocaleDateString()}{" "}
                        {a.isStale ? `(${a.daysSinceValuation}d ago)` : ""}
                      </span>
                    ) : (
                      <span className="text-[var(--color-negative-text)]">Not recorded</span>
                    )}
                  </td>
                  <td className="py-3 px-3 text-right font-bold text-[var(--color-positive-text)]">
                    {formatMoney(a.attributableValue, currency)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Liability Register Schedule */}
      <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-[var(--color-text-primary)] flex items-center gap-2">
            <TrendingDown className="w-4 h-4 text-[var(--color-negative-text)]" /> Debt Schedule & Financing Terms
          </h2>
          <span className="text-xs text-[var(--color-text-secondary)]">{liabilities.length} items</span>
        </div>

        {liabilities.length === 0 ? (
          <div className="text-center py-6 text-xs text-[var(--color-text-secondary)]">No liabilities recorded.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-[var(--color-text-secondary)]">
              <thead className="border-b border-[var(--color-border)] text-[var(--color-text-secondary)] uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="py-2.5 px-3">Liability Name</th>
                  <th className="py-2.5 px-3">Category</th>
                  <th className="py-2.5 px-3">Type</th>
                  <th className="py-2.5 px-3">Interest Rate</th>
                  <th className="py-2.5 px-3">Frequency</th>
                  <th className="py-2.5 px-3">Maturity Date</th>
                  <th className="py-2.5 px-3 text-right">Current Balance ({currency})</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)]">
                {liabilities.map((l) => (
                  <tr key={l.id} className="hover:bg-[var(--color-surface-2)]/30">
                    <td className="py-3 px-3 font-medium text-[var(--color-text-primary)]">{l.name}</td>
                    <td className="py-3 px-3 text-[var(--color-text-secondary)]">{l.categoryLabel || l.category}</td>
                    <td className="py-3 px-3">
                      <span className={l.isSecured ? "text-sky-600 dark:text-sky-400" : "text-[var(--color-text-secondary)]"}>
                        {l.isSecured ? "Secured" : "Unsecured"}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      {l.interestRate ? `${l.interestRate}% (${l.interestType})` : "—"}
                    </td>
                    <td className="py-3 px-3 capitalize">{l.repaymentFrequency}</td>
                    <td className="py-3 px-3">
                      {l.maturityDate ? new Date(l.maturityDate).toLocaleDateString() : "—"}
                    </td>
                    <td className="py-3 px-3 text-right font-bold text-[var(--color-negative-text)]">
                      {formatMoney(l.currentBalance, currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
