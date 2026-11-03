"use client";
// app/(app)/assets-liabilities/AssetsLiabilitiesOverviewClient.js
// Main financial command surface for Asset & Liability Management.

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Landmark,
  ShieldAlert,
  TrendingUp,
  TrendingDown,
  Building2,
  Wallet,
  Car,
  PieChart,
  ArrowRight,
  AlertTriangle,
  Clock,
  Plus,
  RefreshCw,
  FileCheck2,
  Receipt,
  Scale,
  Sparkles,
  ChevronRight,
  ShieldCheck,
  Percent,
} from "lucide-react";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import Modal from "@/components/ui/Modal";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import SkeletonLoader from "@/components/ui/SkeletonLoader";

function formatMoney(amount, currency = "KES") {
  if (amount == null || amount === "" || isNaN(Number(amount))) return "—";
  return `${currency} ${Number(amount).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export default function AssetsLiabilitiesOverviewClient({ user }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("all"); // 'all' | 'assets' | 'liabilities' | 'attention'

  // Modal states
  const [isRepaymentModalOpen, setIsRepaymentModalOpen] = useState(false);
  const [isValuationModalOpen, setIsValuationModalOpen] = useState(false);
  const [isReconcileModalOpen, setIsReconcileModalOpen] = useState(false);
  const [selectedLiability, setSelectedLiability] = useState(null);
  const [selectedAsset, setSelectedAsset] = useState(null);

  // Forms
  const [repaymentForm, setRepaymentForm] = useState({
    liabilityId: "",
    totalAmount: "",
    principalAmount: "",
    interestAmount: "0",
    feeAmount: "0",
    paymentDate: new Date().toISOString().split("T")[0],
    paymentMethod: "bank_transfer",
    reference: "",
    notes: "",
  });

  const [valuationForm, setValuationForm] = useState({
    assetId: "",
    amount: "",
    asOf: new Date().toISOString().split("T")[0],
    method: "owner_estimate",
    confidence: "recorded",
    note: "",
  });

  const [reconcileForm, setReconcileForm] = useState({
    liabilityId: "",
    balance: "",
    effectiveDate: new Date().toISOString().split("T")[0],
    source: "statement",
    notes: "",
  });

  const [actionLoading, setActionLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState(null);

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/assets-liabilities/overview");
      if (!res.ok) throw new Error("Failed to load overview data");
      const json = await res.json();
      setData(json);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // Defer so the fetch's setState calls happen after the effect commits
    const t = setTimeout(loadData, 0);
    return () => clearTimeout(t);
  }, []);

  // Quick Action Handlers
  async function handleRecordRepayment(e) {
    e.preventDefault();
    if (!repaymentForm.liabilityId) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/liabilities/${repaymentForm.liabilityId}/payments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(repaymentForm),
      });
      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || "Failed to record payment");

      setIsRepaymentModalOpen(false);
      setActionMessage({ type: "success", text: "Repayment recorded successfully!" });
      loadData();
    } catch (err) {
      setActionMessage({ type: "error", text: err.message });
    } finally {
      setActionLoading(false);
    }
  }

  async function handleRecordValuation(e) {
    e.preventDefault();
    if (!valuationForm.assetId) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/assets/${valuationForm.assetId}/valuations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(valuationForm),
      });
      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || "Failed to record valuation");

      setIsValuationModalOpen(false);
      setActionMessage({ type: "success", text: "Valuation updated successfully!" });
      loadData();
    } catch (err) {
      setActionMessage({ type: "error", text: err.message });
    } finally {
      setActionLoading(false);
    }
  }

  async function handleReconcileBalance(e) {
    e.preventDefault();
    if (!reconcileForm.liabilityId) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/liabilities/${reconcileForm.liabilityId}/reconcile`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(reconcileForm),
      });
      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || "Failed to reconcile balance");

      setIsReconcileModalOpen(false);
      setActionMessage({ type: "success", text: "Statement balance reconciled!" });
      loadData();
    } catch (err) {
      setActionMessage({ type: "error", text: err.message });
    } finally {
      setActionLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        <div className="h-10 w-72 bg-slate-800/60 rounded-lg animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div key={i} className="h-32 bg-slate-800/40 rounded-xl animate-pulse" />
          ))}
        </div>
        <div className="h-96 bg-slate-800/30 rounded-xl animate-pulse" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-6 max-w-xl mx-auto my-12 text-center bg-slate-900 border border-rose-500/30 rounded-2xl p-8">
        <AlertTriangle className="w-12 h-12 text-rose-400 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-white mb-2">Unable to Load Overview</h2>
        <p className="text-slate-400 text-sm mb-6">{error || "Data is currently unavailable."}</p>
        <Button onClick={loadData}>
          <RefreshCw className="w-4 h-4 mr-2" /> Retry
        </Button>
      </div>
    );
  }

  const { summary, liquidityBreakdown, assetAllocation, debtAllocation, attention, recentActivity } =
    data;
  const currency = data.reportingCurrency || "KES";

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-8">
      {/* Header & Quick Action Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/80 pb-6">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-tr from-emerald-500/20 to-teal-500/20 border border-emerald-500/30 text-emerald-400">
              <Scale className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                Assets & Liabilities Hub
              </h1>
              <p className="text-sm text-slate-400">
                Consolidated balance sheet, valuations, and debt management
              </p>
            </div>
          </div>
        </div>

        {/* Global Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          <Link href="/assets/new">
            <Button variant="primary" size="sm" className="bg-emerald-600 hover:bg-emerald-500 text-white">
              <Plus className="w-4 h-4 mr-1.5" /> Add Asset
            </Button>
          </Link>
          <Link href="/liabilities/new">
            <Button variant="secondary" size="sm" className="border-rose-500/40 text-rose-300 hover:bg-rose-500/10">
              <Plus className="w-4 h-4 mr-1.5" /> Add Debt
            </Button>
          </Link>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              if (data.liabilities?.length > 0) {
                setRepaymentForm((prev) => ({
                  ...prev,
                  liabilityId: data.liabilities[0].id,
                }));
              }
              setIsRepaymentModalOpen(true);
            }}
          >
            <Receipt className="w-4 h-4 mr-1.5 text-sky-400" /> Repay Debt
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              if (data.liabilities?.length > 0) {
                setReconcileForm((prev) => ({
                  ...prev,
                  liabilityId: data.liabilities[0].id,
                }));
              }
              setIsReconcileModalOpen(true);
            }}
          >
            <FileCheck2 className="w-4 h-4 mr-1.5 text-amber-400" /> Reconcile
          </Button>
        </div>
      </div>

      {actionMessage && (
        <div
          className={`p-4 rounded-xl text-sm flex items-center justify-between ${
            actionMessage.type === "success"
              ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-300"
              : "bg-rose-500/10 border border-rose-500/30 text-rose-300"
          }`}
        >
          <span>{actionMessage.text}</span>
          <button onClick={() => setActionMessage(null)} className="text-slate-400 hover:text-white">
            ✕
          </button>
        </div>
      )}

      {/* 8 Primary KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Net Position */}
        <div className="relative overflow-hidden rounded-2xl border border-sky-500/30 bg-gradient-to-br from-slate-900/90 via-sky-950/20 to-slate-900/90 p-5 shadow-lg">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold tracking-wider uppercase text-sky-300">
              Net Financial Position
            </span>
            <Scale className="w-4 h-4 text-sky-400" />
          </div>
          <div className="text-2xl font-black text-white tracking-tight">
            {formatMoney(summary.netWorth, currency)}
          </div>
          <div className="mt-2 text-xs text-slate-400 flex items-center justify-between">
            <span>Assets minus Liabilities</span>
            <span className="font-semibold text-slate-300">
              Ratio: {summary.debtToAssetRatio}% Debt
            </span>
          </div>
        </div>

        {/* 2. Total Assets */}
        <div className="relative overflow-hidden rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-slate-900/90 via-emerald-950/20 to-slate-900/90 p-5 shadow-lg">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold tracking-wider uppercase text-emerald-300">
              Total Assets
            </span>
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-emerald-400 tracking-tight">
            {formatMoney(summary.totalAssets, currency)}
          </div>
          <div className="mt-2 text-xs text-slate-400 flex items-center justify-between">
            <span>{summary.assetCount} registered assets</span>
            <Link href="/assets" className="text-emerald-400 hover:underline flex items-center">
              View Register <ChevronRight className="w-3 h-3 ml-0.5" />
            </Link>
          </div>
        </div>

        {/* 3. Total Liabilities */}
        <div className="relative overflow-hidden rounded-2xl border border-rose-500/30 bg-gradient-to-br from-slate-900/90 via-rose-950/20 to-slate-900/90 p-5 shadow-lg">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold tracking-wider uppercase text-rose-300">
              Total Debt
            </span>
            <TrendingDown className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-2xl font-black text-rose-400 tracking-tight">
            {formatMoney(summary.totalLiabilities, currency)}
          </div>
          <div className="mt-2 text-xs text-slate-400 flex items-center justify-between">
            <span>{summary.liabilityCount} obligations</span>
            <Link href="/liabilities" className="text-rose-400 hover:underline flex items-center">
              View Register <ChevronRight className="w-3 h-3 ml-0.5" />
            </Link>
          </div>
        </div>

        {/* 4. Cash & Equivalents */}
        <div className="relative overflow-hidden rounded-2xl border border-teal-500/20 bg-slate-900/80 p-5 shadow-md">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold tracking-wider uppercase text-teal-300">
              Liquid Cash
            </span>
            <Wallet className="w-4 h-4 text-teal-400" />
          </div>
          <div className="text-xl font-bold text-white tracking-tight">
            {formatMoney(summary.cashEquivalentsTotal, currency)}
          </div>
          <div className="mt-2 text-xs text-slate-400">
            Bank & M-Pesa balances
          </div>
        </div>

        {/* 5. Investment Assets */}
        <div className="relative overflow-hidden rounded-2xl border border-purple-500/20 bg-slate-900/80 p-5 shadow-md">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold tracking-wider uppercase text-purple-300">
              Investments
            </span>
            <PieChart className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-xl font-bold text-white tracking-tight">
            {formatMoney(summary.investmentAssetsTotal, currency)}
          </div>
          <div className="mt-2 text-xs text-slate-400">
            Equities, bonds & funds
          </div>
        </div>

        {/* 6. Physical & Illiquid Assets */}
        <div className="relative overflow-hidden rounded-2xl border border-amber-500/20 bg-slate-900/80 p-5 shadow-md">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold tracking-wider uppercase text-amber-300">
              Fixed & Tangible
            </span>
            <Building2 className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-xl font-bold text-white tracking-tight">
            {formatMoney(summary.physicalAssetsTotal, currency)}
          </div>
          <div className="mt-2 text-xs text-slate-400">
            Real estate, vehicles & equipment
          </div>
        </div>

        {/* 7. Secured Debt */}
        <div className="relative overflow-hidden rounded-2xl border border-blue-500/20 bg-slate-900/80 p-5 shadow-md">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold tracking-wider uppercase text-blue-300">
              Secured Debt
            </span>
            <ShieldCheck className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-xl font-bold text-white tracking-tight">
            {formatMoney(summary.securedDebtTotal, currency)}
          </div>
          <div className="mt-2 text-xs text-slate-400">
            Asset-backed (mortgages & auto)
          </div>
        </div>

        {/* 8. Unsecured Debt */}
        <div className="relative overflow-hidden rounded-2xl border border-orange-500/20 bg-slate-900/80 p-5 shadow-md">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold tracking-wider uppercase text-orange-300">
              Unsecured Debt
            </span>
            <ShieldAlert className="w-4 h-4 text-orange-400" />
          </div>
          <div className="text-xl font-bold text-white tracking-tight">
            {formatMoney(summary.unsecuredDebtTotal, currency)}
          </div>
          <div className="mt-2 text-xs text-slate-400">
            Credit cards, overdrafts & loans
          </div>
        </div>
      </div>

      {/* Main Grid: Allocation & Attention / Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column (2 Cols): Allocation & Distribution */}
        <div className="lg:col-span-2 space-y-8">
          {/* Asset Allocation Breakdown */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <PieChart className="w-5 h-5 text-emerald-400" /> Asset Allocation
                </h2>
                <p className="text-xs text-slate-400">
                  Distribution of attributable wealth across asset categories
                </p>
              </div>
              <Link href="/assets" className="text-xs font-semibold text-emerald-400 hover:underline">
                Manage Assets →
              </Link>
            </div>

            {/* Liquidity Progress Bar */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-slate-400">
                <span>Liquidity Profile</span>
                <span>
                  {liquidityBreakdown.map((l) => `${l.label}: ${l.percentage}%`).join(" · ")}
                </span>
              </div>
              <div className="h-3 w-full bg-slate-800 rounded-full overflow-hidden flex">
                <div
                  style={{ width: `${liquidityBreakdown[0]?.percentage || 0}%` }}
                  className="bg-teal-400"
                  title={`Liquid: ${liquidityBreakdown[0]?.percentage}%`}
                />
                <div
                  style={{ width: `${liquidityBreakdown[1]?.percentage || 0}%` }}
                  className="bg-purple-500"
                  title={`Semi-liquid: ${liquidityBreakdown[1]?.percentage}%`}
                />
                <div
                  style={{ width: `${liquidityBreakdown[2]?.percentage || 0}%` }}
                  className="bg-amber-500"
                  title={`Illiquid: ${liquidityBreakdown[2]?.percentage}%`}
                />
              </div>
            </div>

            {/* Category Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              {assetAllocation.map((cat) => (
                <div
                  key={cat.category}
                  className="p-3.5 rounded-xl bg-slate-800/40 border border-slate-700/50 flex items-center justify-between"
                >
                  <div className="space-y-0.5">
                    <div className="text-xs font-medium text-slate-300">{cat.label}</div>
                    <div className="text-sm font-bold text-white">
                      {formatMoney(cat.amount, currency)}
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge variant="default" className="text-xs bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
                      {cat.percentage}%
                    </Badge>
                    <div className="text-[10px] text-slate-400 mt-0.5">{cat.itemCount} item(s)</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Debt Distribution Breakdown */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <TrendingDown className="w-5 h-5 text-rose-400" /> Debt Distribution & Financing
                </h2>
                <p className="text-xs text-slate-400">
                  Liabilities categorized by structure and interest cost
                </p>
              </div>
              <Link href="/liabilities" className="text-xs font-semibold text-rose-400 hover:underline">
                Manage Debt →
              </Link>
            </div>

            {debtAllocation.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-sm">
                No active liabilities recorded. Outstanding debt is KES 0.00!
              </div>
            ) : (
              <div className="space-y-3">
                {debtAllocation.map((debt) => (
                  <div
                    key={debt.category}
                    className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/50 flex items-center justify-between"
                  >
                    <div>
                      <div className="text-sm font-semibold text-white">{debt.label}</div>
                      <div className="text-xs text-slate-400">
                        {debt.itemCount} account(s){" "}
                        {debt.averageInterestRate
                          ? `· Avg Interest: ${debt.averageInterestRate}%`
                          : "· Interest rate unrecorded"}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold text-rose-300">
                        {formatMoney(debt.amount, currency)}
                      </div>
                      <span className="text-xs text-slate-400">{debt.percentage}% of total debt</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column (1 Col): Attention Panel & Recent Activity */}
        <div className="space-y-8">
          {/* Attention & Action Needed */}
          <div className="bg-slate-900/90 border border-amber-500/30 rounded-2xl p-6 shadow-xl space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-400" /> Attention & Alerts
              </h2>
              <Badge variant="warning" className="text-xs">
                {attention.staleAssets.length +
                  attention.unvaluedAssetCount +
                  attention.highInterestLiabilities.length +
                  attention.upcomingMaturityLiabilities.length}
              </Badge>
            </div>

            {/* Stale Valuations */}
            {attention.staleAssets.length > 0 && (
              <div className="space-y-2.5">
                <div className="text-xs font-semibold uppercase tracking-wider text-amber-400">
                  Stale Valuations (&gt; 90 days)
                </div>
                {attention.staleAssets.map((asset) => (
                  <div
                    key={asset.id}
                    className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-between"
                  >
                    <div>
                      <div className="text-xs font-semibold text-white">{asset.name}</div>
                      <div className="text-[11px] text-amber-300/80">
                        Valued {asset.daysSince} days ago ({formatMoney(asset.currentValue, currency)})
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="secondary"
                      className="text-xs py-1 px-2.5 h-auto bg-amber-500/20 border-amber-500/30 text-amber-300"
                      onClick={() => {
                        setSelectedAsset(asset);
                        setValuationForm((prev) => ({
                          ...prev,
                          assetId: asset.id,
                          amount: asset.currentValue || "",
                        }));
                        setIsValuationModalOpen(true);
                      }}
                    >
                      Update
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {/* Unvalued Assets */}
            {attention.unvaluedAssetCount > 0 && (
              <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700 text-xs flex items-center justify-between">
                <span className="text-slate-300">
                  {attention.unvaluedAssetCount} asset(s) have no valuation recorded.
                </span>
                <Link href="/assets" className="text-sky-400 font-semibold hover:underline">
                  Review
                </Link>
              </div>
            )}

            {/* High Interest Liabilties */}
            {attention.highInterestLiabilities.length > 0 && (
              <div className="space-y-2.5">
                <div className="text-xs font-semibold uppercase tracking-wider text-rose-400">
                  High Interest Cost (&ge; 15%)
                </div>
                {attention.highInterestLiabilities.map((debt) => (
                  <div
                    key={debt.id}
                    className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-between"
                  >
                    <div>
                      <div className="text-xs font-semibold text-white">{debt.name}</div>
                      <div className="text-[11px] text-rose-300">
                        {debt.interestRate}% interest · {formatMoney(debt.currentBalance, currency)}
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="secondary"
                      className="text-xs py-1 px-2.5 h-auto bg-rose-500/20 border-rose-500/30 text-rose-300"
                      onClick={() => {
                        setRepaymentForm((prev) => ({
                          ...prev,
                          liabilityId: debt.id,
                        }));
                        setIsRepaymentModalOpen(true);
                      }}
                    >
                      Repay
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {attention.staleAssets.length === 0 &&
              attention.unvaluedAssetCount === 0 &&
              attention.highInterestLiabilities.length === 0 && (
                <div className="py-6 text-center text-xs text-slate-400">
                  <ShieldCheck className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                  All asset valuations are current and no debt requires urgent attention.
                </div>
              )}
          </div>

          {/* Recent Activity Stream */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Clock className="w-5 h-5 text-sky-400" /> Recent Activity
            </h2>
            {recentActivity.length === 0 ? (
              <div className="text-xs text-slate-400 text-center py-6">
                No repayments or valuation records found.
              </div>
            ) : (
              <div className="space-y-3">
                {recentActivity.map((act) => (
                  <div
                    key={`${act.type}-${act.id}`}
                    className="p-3 rounded-xl bg-slate-800/40 border border-slate-700/40 flex items-start justify-between"
                  >
                    <div className="space-y-0.5">
                      <div className="text-xs font-semibold text-white">{act.title}</div>
                      <div className="text-[11px] text-slate-400">{act.subtitle}</div>
                      <div className="text-[10px] text-slate-400">
                        {new Date(act.date).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="text-xs font-bold text-sky-300">
                      {formatMoney(act.amount, act.currency)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* MODAL: Record Repayment */}
      <Modal
        isOpen={isRepaymentModalOpen}
        onClose={() => setIsRepaymentModalOpen(false)}
        title="Record Debt Repayment"
      >
        <form onSubmit={handleRecordRepayment} className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">Select Liability</label>
            <select
              value={repaymentForm.liabilityId}
              onChange={(e) => setRepaymentForm({ ...repaymentForm, liabilityId: e.target.value })}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white"
              required
            >
              <option value="">Choose debt to pay...</option>
              {data.liabilities?.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name} ({formatMoney(l.currentBalance, l.currency)})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">
                Principal Reduction ({currency})
              </label>
              <Input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={repaymentForm.principalAmount}
                onChange={(e) => {
                  const p = e.target.value;
                  const total = (
                    parseFloat(p || 0) +
                    parseFloat(repaymentForm.interestAmount || 0) +
                    parseFloat(repaymentForm.feeAmount || 0)
                  ).toFixed(2);
                  setRepaymentForm({ ...repaymentForm, principalAmount: p, totalAmount: total });
                }}
                required
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">
                Interest Amount ({currency})
              </label>
              <Input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={repaymentForm.interestAmount}
                onChange={(e) => {
                  const i = e.target.value;
                  const total = (
                    parseFloat(repaymentForm.principalAmount || 0) +
                    parseFloat(i || 0) +
                    parseFloat(repaymentForm.feeAmount || 0)
                  ).toFixed(2);
                  setRepaymentForm({ ...repaymentForm, interestAmount: i, totalAmount: total });
                }}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">
                Fee / Penalty ({currency})
              </label>
              <Input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={repaymentForm.feeAmount}
                onChange={(e) => {
                  const f = e.target.value;
                  const total = (
                    parseFloat(repaymentForm.principalAmount || 0) +
                    parseFloat(repaymentForm.interestAmount || 0) +
                    parseFloat(f || 0)
                  ).toFixed(2);
                  setRepaymentForm({ ...repaymentForm, feeAmount: f, totalAmount: total });
                }}
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">
                Total Payment ({currency})
              </label>
              <Input
                type="number"
                step="0.01"
                value={repaymentForm.totalAmount}
                readOnly
                className="bg-slate-900 border-slate-700 text-sky-400 font-bold"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">Payment Date</label>
              <Input
                type="date"
                value={repaymentForm.paymentDate}
                onChange={(e) => setRepaymentForm({ ...repaymentForm, paymentDate: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">Payment Method</label>
              <select
                value={repaymentForm.paymentMethod}
                onChange={(e) => setRepaymentForm({ ...repaymentForm, paymentMethod: e.target.value })}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white"
              >
                <option value="bank_transfer">Bank Transfer</option>
                <option value="mpesa">M-Pesa</option>
                <option value="standing_order">Standing Order</option>
                <option value="cash">Cash</option>
                <option value="cheque">Cheque</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">Reference / Note</label>
            <Input
              type="text"
              placeholder="e.g. M-Pesa Ref QBL764..."
              value={repaymentForm.reference}
              onChange={(e) => setRepaymentForm({ ...repaymentForm, reference: e.target.value })}
            />
          </div>

          <div className="flex justify-end gap-3 pt-3">
            <Button variant="secondary" type="button" onClick={() => setIsRepaymentModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" disabled={actionLoading}>
              {actionLoading ? "Recording..." : "Record Payment"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL: Record Valuation */}
      <Modal
        isOpen={isValuationModalOpen}
        onClose={() => setIsValuationModalOpen(false)}
        title="Update Asset Valuation"
      >
        <form onSubmit={handleRecordValuation} className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">Asset</label>
            <select
              value={valuationForm.assetId}
              onChange={(e) => setValuationForm({ ...valuationForm, assetId: e.target.value })}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white"
              required
            >
              <option value="">Choose asset...</option>
              {data.assets?.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name} ({a.categoryLabel || a.category})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">
                New Value ({currency})
              </label>
              <Input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={valuationForm.amount}
                onChange={(e) => setValuationForm({ ...valuationForm, amount: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">As Of Date</label>
              <Input
                type="date"
                value={valuationForm.asOf}
                onChange={(e) => setValuationForm({ ...valuationForm, asOf: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">Valuation Method</label>
              <select
                value={valuationForm.method}
                onChange={(e) => setValuationForm({ ...valuationForm, method: e.target.value })}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white"
              >
                <option value="owner_estimate">Owner Estimate</option>
                <option value="appraisal">Certified Appraisal</option>
                <option value="market_price">Market Price</option>
                <option value="purchase_price">Purchase Price</option>
                <option value="depreciated_cost">Depreciated Cost</option>
                <option value="statement">Official Statement</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">Confidence</label>
              <select
                value={valuationForm.confidence}
                onChange={(e) => setValuationForm({ ...valuationForm, confidence: e.target.value })}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white"
              >
                <option value="verified">Verified (Audited/Deed)</option>
                <option value="recorded">Recorded (Official)</option>
                <option value="estimated">Estimated</option>
                <option value="pending_review">Pending Review</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">Note / Justification</label>
            <Input
              type="text"
              placeholder="e.g. Annual valuation review or market comp"
              value={valuationForm.note}
              onChange={(e) => setValuationForm({ ...valuationForm, note: e.target.value })}
            />
          </div>

          <div className="flex justify-end gap-3 pt-3">
            <Button variant="secondary" type="button" onClick={() => setIsValuationModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" disabled={actionLoading}>
              {actionLoading ? "Updating..." : "Save Valuation"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL: Reconcile Statement Balance */}
      <Modal
        isOpen={isReconcileModalOpen}
        onClose={() => setIsReconcileModalOpen(false)}
        title="Reconcile Statement Balance"
      >
        <form onSubmit={handleReconcileBalance} className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">Select Liability</label>
            <select
              value={reconcileForm.liabilityId}
              onChange={(e) => setReconcileForm({ ...reconcileForm, liabilityId: e.target.value })}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white"
              required
            >
              <option value="">Choose debt to reconcile...</option>
              {data.liabilities?.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name} (Current: {formatMoney(l.currentBalance, l.currency)})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">
                Statement Balance ({currency})
              </label>
              <Input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={reconcileForm.balance}
                onChange={(e) => setReconcileForm({ ...reconcileForm, balance: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">Effective Date</label>
              <Input
                type="date"
                value={reconcileForm.effectiveDate}
                onChange={(e) => setReconcileForm({ ...reconcileForm, effectiveDate: e.target.value })}
                required
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">Source</label>
            <select
              value={reconcileForm.source}
              onChange={(e) => setReconcileForm({ ...reconcileForm, source: e.target.value })}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white"
            >
              <option value="statement">Bank / Lender Statement</option>
              <option value="lender_confirmation">Lender Confirmation / Letter</option>
              <option value="manual">Manual Verification</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">Reconciliation Notes</label>
            <Input
              type="text"
              placeholder="e.g. Month-end statement snapshot"
              value={reconcileForm.notes}
              onChange={(e) => setReconcileForm({ ...reconcileForm, notes: e.target.value })}
            />
          </div>

          <div className="flex justify-end gap-3 pt-3">
            <Button variant="secondary" type="button" onClick={() => setIsReconcileModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" disabled={actionLoading}>
              {actionLoading ? "Reconciling..." : "Save Statement Balance"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
