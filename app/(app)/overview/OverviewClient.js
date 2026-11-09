"use client";
// app/(app)/overview/OverviewClient.js
// Functional Specification 01: Financial Dashboard & Overview.
// Main interactive dashboard client surface.
// Consolidates information across all modules into one coherent, interactive,
// explainable and actionable view.

import { useState, useCallback, useTransition } from "react";
import dynamic from "next/dynamic";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import FinancialSummarySection from "@/components/dashboard/FinancialSummarySection";
import AssetsLiabilitiesSection from "@/components/dashboard/AssetsLiabilitiesSection";
import CashFlowSection from "@/components/dashboard/CashFlowSection";
import InvestmentOverviewSection from "@/components/dashboard/InvestmentOverviewSection";
import GoalsAccountabilitySection from "@/components/dashboard/GoalsAccountabilitySection";
import CommandCentreAlertsSection from "@/components/dashboard/CommandCentreAlertsSection";
import RecentActivitySection from "@/components/dashboard/RecentActivitySection";

// Recharts is heavy — keep the chart section in its own chunk.
const FinancialTrendsSection = dynamic(
  () => import("@/components/dashboard/FinancialTrendsSection"),
  {
    loading: () => (
      <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-xl">
        <div className="h-5 w-56 rounded bg-[var(--color-surface-3)] animate-pulse" />
        <div className="mt-2 h-3 w-72 max-w-full rounded bg-[var(--color-surface-3)] animate-pulse" />
        <div className="mt-6 h-72 w-full rounded-xl bg-[var(--color-surface-2)] animate-pulse" />
      </div>
    ),
  }
);

// Modals are only needed after a user action.
const TraceabilityModal = dynamic(
  () => import("@/components/dashboard/TraceabilityModal"),
  { ssr: false }
);
const ExportModal = dynamic(
  () => import("@/components/dashboard/ExportModal"),
  { ssr: false }
);

export default function OverviewClient({
  user,
  initialOverview = null,
  initialHideValues = false,
  dashboardLayout = "balanced",
  initialCurrency = "KES",
}) {
  const [overview, setOverview] = useState(initialOverview);
  const [reportingCurrency, setReportingCurrency] = useState(
    overview?.reportingCurrency || initialCurrency || "KES"
  );
  const [period, setPeriod] = useState("30d");
  const [compareEnabled, setCompareEnabled] = useState(true);
  const [hideBalances, setHideBalances] = useState(initialHideValues);
  const [layout, setLayout] = useState(dashboardLayout);
  const [isPending, startTransition] = useTransition();
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Modals state
  const [traceModal, setTraceModal] = useState({ isOpen: false, metric: "netWorth" });
  const [exportModalOpen, setExportModalOpen] = useState(false);

  // Fetch updated dashboard data when period, currency, or refresh is triggered
  const fetchOverview = useCallback(
    async (newPeriod = period, newCurrency = reportingCurrency) => {
      setIsRefreshing(true);
      try {
        const res = await fetch(
          `/api/dashboard/overview?period=${encodeURIComponent(
            newPeriod
          )}&currency=${encodeURIComponent(newCurrency)}`
        );
        if (!res.ok) throw new Error("Failed to refresh dashboard");
        const data = await res.json();
        startTransition(() => {
          setOverview(data);
        });
      } catch (err) {
        console.error("[Dashboard Fetch Error]", err);
      } finally {
        setIsRefreshing(false);
      }
    },
    [period, reportingCurrency]
  );

  const handleCurrencyChange = (newCurrency) => {
    setReportingCurrency(newCurrency);
    fetchOverview(period, newCurrency);
  };

  const handlePeriodChange = (newPeriod) => {
    setPeriod(newPeriod);
    fetchOverview(newPeriod, reportingCurrency);
  };

  const handleToggleHideBalances = () => {
    setHideBalances((prev) => !prev);
  };

  const handleOpenTrace = (metric) => {
    setTraceModal({ isOpen: true, metric });
  };

  const handleCloseTrace = () => {
    setTraceModal({ isOpen: false, metric: "netWorth" });
  };

  return (
    <div className="p-4 sm:p-6 md:p-8 space-y-8 max-w-screen-2xl mx-auto text-[var(--color-text-primary)]">
      {/* ── Header Command Bar ─────────────────────────────────────────── */}
      <DashboardHeader
        reportingCurrency={reportingCurrency}
        onCurrencyChange={handleCurrencyChange}
        period={period}
        onPeriodChange={handlePeriodChange}
        compareEnabled={compareEnabled}
        onToggleCompare={() => setCompareEnabled((v) => !v)}
        hideBalances={hideBalances}
        onToggleHideBalances={handleToggleHideBalances}
        onRefresh={() => fetchOverview(period, reportingCurrency)}
        onOpenExport={() => setExportModalOpen(true)}
        dataQuality={overview?.dataQuality}
        isRefreshing={isRefreshing || isPending}
        dashboardLayout={layout}
        onChangeLayout={setLayout}
      />

      {/* ── Section A: Financial Summary & Net Worth ──────────────────── */}
      <FinancialSummarySection
        financialPosition={overview?.financialPosition}
        cashFlow={overview?.cashFlow}
        currency={reportingCurrency}
        hideBalances={hideBalances}
        onOpenTrace={handleOpenTrace}
        loading={isRefreshing}
      />

      {/* ── Dashboard Layout Configurations ───────────────────────────── */}
      {layout === "accountability_first" ? (
        <>
          {/* Priority to Command Centre Alerts & Goals */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <CommandCentreAlertsSection alertsData={overview?.alerts} />
            <GoalsAccountabilitySection
              goals={overview?.goals}
              currency={reportingCurrency}
              hideBalances={hideBalances}
            />
          </div>

          <FinancialTrendsSection
            trends={overview?.trends}
            currency={reportingCurrency}
            hideBalances={hideBalances}
            period={period}
          />

          <AssetsLiabilitiesSection
            assets={overview?.assets}
            liabilities={overview?.liabilities}
            currency={reportingCurrency}
            hideBalances={hideBalances}
            onOpenTrace={handleOpenTrace}
          />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <CashFlowSection
              cashFlow={overview?.cashFlow}
              currency={reportingCurrency}
              hideBalances={hideBalances}
              onOpenTrace={handleOpenTrace}
            />
            <InvestmentOverviewSection
              investments={overview?.investments}
              currency={reportingCurrency}
              hideBalances={hideBalances}
              onOpenTrace={handleOpenTrace}
            />
          </div>

          <RecentActivitySection
            initialActivity={overview?.recentActivity}
            currency={reportingCurrency}
            hideBalances={hideBalances}
          />
        </>
      ) : (
        /* Balanced Standard Layout */
        <>
          {/* Section E: Financial Trends (Historical Net Worth & Cash Flow) */}
          <FinancialTrendsSection
            trends={overview?.trends}
            currency={reportingCurrency}
            hideBalances={hideBalances}
            period={period}
          />

          {/* Section B: Assets & Liabilities Overview */}
          <AssetsLiabilitiesSection
            assets={overview?.assets}
            liabilities={overview?.liabilities}
            currency={reportingCurrency}
            hideBalances={hideBalances}
            onOpenTrace={handleOpenTrace}
          />

          {/* Section C: Cash Flow & Section D: Investments */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
            <CashFlowSection
              cashFlow={overview?.cashFlow}
              currency={reportingCurrency}
              hideBalances={hideBalances}
              onOpenTrace={handleOpenTrace}
            />
            <InvestmentOverviewSection
              investments={overview?.investments}
              currency={reportingCurrency}
              hideBalances={hideBalances}
              onOpenTrace={handleOpenTrace}
            />
          </div>

          {/* Section F: Goals & Accountability & Section G: Command Centre Alerts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
            <GoalsAccountabilitySection
              goals={overview?.goals}
              currency={reportingCurrency}
              hideBalances={hideBalances}
            />
            <CommandCentreAlertsSection alertsData={overview?.alerts} />
          </div>

          {/* Section H: Recent Financial Activity */}
          <RecentActivitySection
            initialActivity={overview?.recentActivity}
            currency={reportingCurrency}
            hideBalances={hideBalances}
          />
        </>
      )}

      {/* ── Traceability Modal ─────────────────────────────────────────── */}
      {traceModal.isOpen && (
        <TraceabilityModal
          isOpen={traceModal.isOpen}
          onClose={handleCloseTrace}
          metric={traceModal.metric}
          reportingCurrency={reportingCurrency}
          period={period}
        />
      )}

      {/* ── Export Modal ──────────────────────────────────────────────── */}
      {exportModalOpen && (
        <ExportModal
          isOpen={exportModalOpen}
          onClose={() => setExportModalOpen(false)}
          reportingCurrency={reportingCurrency}
          currentPeriod={period}
        />
      )}
    </div>
  );
}
