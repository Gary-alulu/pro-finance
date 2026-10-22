"use client";
// app/(app)/assets/AssetsClient.js
// Complete Assets & Liabilities management studio.

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Search,
  Filter,
  TrendingUp,
  TrendingDown,
  Building2,
  Wallet,
  Car,
  LineChart,
  Landmark,
  ShieldAlert,
  Calendar,
  Sparkles,
  Layers,
  Link2,
  Trash2,
  Edit2,
  History,
  AlertTriangle,
  CheckCircle2,
  Info,
} from "lucide-react";
import { formatCurrency, sumAmounts, calculateNetWorth } from "@/lib/finance/currency";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Badge from "@/components/ui/Badge";
import Modal from "@/components/ui/Modal";
import Tabs from "@/components/ui/Tabs";
import EmptyState from "@/components/ui/EmptyState";
import SkeletonLoader from "@/components/ui/SkeletonLoader";

const assetCategoryLabels = {
  cash: { label: "Cash & Equivalents", icon: Wallet, tone: "emerald" },
  bank_account: { label: "Bank Account", icon: Landmark, tone: "emerald" },
  property: { label: "Real Estate & Property", icon: Building2, tone: "purple" },
  vehicle: { label: "Vehicle", icon: Car, tone: "blue" },
  listed_equity: { label: "Public Equities", icon: LineChart, tone: "emerald" },
  private_equity: { label: "Private Business", icon: Building2, tone: "gold" },
  retirement: { label: "Retirement & Pension", icon: ShieldAlert, tone: "purple" },
  bond: { label: "Government / Corporate Bonds", icon: Landmark, tone: "blue" },
  crypto: { label: "Cryptocurrency", icon: LineChart, tone: "gold" },
  receivable: { label: "Money Owed to You", icon: Wallet, tone: "blue" },
  other: { label: "Other Asset", icon: Layers, tone: "neutral" },
};

const liabilityCategoryLabels = {
  mortgage: { label: "Mortgage", tone: "coral" },
  car_loan: { label: "Auto Loan", tone: "coral" },
  personal_loan: { label: "Personal Loan", tone: "gold" },
  credit_card: { label: "Credit Card", tone: "coral" },
  overdraft: { label: "Overdraft Facility", tone: "gold" },
  business_loan: { label: "Business Loan", tone: "purple" },
  student_loan: { label: "Education Loan", tone: "blue" },
  tax_owed: { label: "Tax Liability", tone: "coral" },
  other: { label: "Other Debt", tone: "neutral" },
};

export default function AssetsClient({ user, initialTab = "assets", focusId = null, newRecord = null }) {
  const [activeTab, setActiveTab] = useState(initialTab === "liabilities" ? "liabilities" : "assets");
  const [assets, setAssets] = useState([]);
  const [liabilities, setLiabilities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [focusedId, setFocusedId] = useState(focusId);

  // Modals state (deep-link ?new=asset|liability opens the matching form)
  const [isAssetModalOpen, setIsAssetModalOpen] = useState(newRecord === "asset");
  const [isLiabilityModalOpen, setIsLiabilityModalOpen] = useState(newRecord === "liability");
  const [isValuationModalOpen, setIsValuationModalOpen] = useState(false);
  const [selectedAssetForValuation, setSelectedAssetForValuation] = useState(null);
  const [editingAsset, setEditingAsset] = useState(null);
  const [editingLiability, setEditingLiability] = useState(null);
  const [itemToDelete, setItemToDelete] = useState(null);

  // Scroll the focused record into view once data arrives (DOM sync — no state)
  useEffect(() => {
    if (loading || !focusedId) return;
    const el = document.getElementById(`asset-${focusedId}`) || document.getElementById(`liability-${focusedId}`);
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [loading, focusedId, activeTab]);

  // Form states
  const [assetForm, setAssetForm] = useState({
    name: "",
    category: "property",
    subCategory: "",
    currency: user?.preferredCurrency || "KES",
    amount: "",
    asOf: new Date().toISOString().split("T")[0],
    source: "manual",
    description: "",
  });

  const [liabilityForm, setLiabilityForm] = useState({
    name: "",
    category: "mortgage",
    currency: user?.preferredCurrency || "KES",
    principalAmount: "",
    currentBalance: "",
    interestRate: "",
    lender: "",
    linkedAssetId: "",
    asOf: new Date().toISOString().split("T")[0],
    notes: "",
  });

  const [valuationForm, setValuationForm] = useState({
    amount: "",
    asOf: new Date().toISOString().split("T")[0],
    source: "manual",
    note: "",
  });

  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  const fetchData = async () => {
    try {
      const [assetsRes, liabilitiesRes] = await Promise.all([
        fetch("/api/assets"),
        fetch("/api/liabilities"),
      ]);

      if (assetsRes.ok) {
        const data = await assetsRes.json();
        setAssets(data.assets || []);
      }
      if (liabilitiesRes.ok) {
        const data = await liabilitiesRes.json();
        setLiabilities(data.liabilities || []);
      }
    } catch (err) {
      console.error("Error fetching assets & liabilities:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Defer so the fetch's setState calls happen after the effect commits
    const t = setTimeout(fetchData, 0);
    return () => clearTimeout(t);
  }, []);

  // Compute freshness of valuation
  const getValuationFreshness = (asOf) => {
    if (!asOf) return { label: "No valuation", tone: "coral" };
    const daysAgo = Math.floor((new Date() - new Date(asOf)) / (1000 * 60 * 60 * 24));
    if (daysAgo < 30) return { label: "Recent", tone: "emerald", days: daysAgo };
    if (daysAgo <= 90) return { label: `${daysAgo}d ago`, tone: "gold", days: daysAgo };
    return { label: `Stale (${daysAgo}d ago)`, tone: "coral", days: daysAgo };
  };

  // Summaries
  const totals = useMemo(() => {
    const totalAssetsDecimal = sumAmounts(
      assets.filter((a) => a.status === "active").map((a) => a.currentValue?.amount)
    );
    const totalLiabilitiesDecimal = sumAmounts(
      liabilities.filter((l) => l.status === "active").map((l) => l.currentBalance?.amount)
    );
    const net = calculateNetWorth(totalAssetsDecimal, totalLiabilitiesDecimal);

    // Valuations needing attention (missing or >60 days old)
    const staleValuationsCount = assets.filter((a) => {
      if (!a.currentValue?.asOf) return true;
      const days = (new Date() - new Date(a.currentValue.asOf)) / (1000 * 60 * 60 * 24);
      return days > 60;
    }).length;

    return {
      totalAssets: net.totalAssets,
      totalLiabilities: net.totalLiabilities,
      netWorth: net.netWorth,
      staleCount: staleValuationsCount,
    };
  }, [assets, liabilities]);

  // Filtering
  const filteredAssets = useMemo(() => {
    return assets.filter((a) => {
      const matchesSearch =
        a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (a.description && a.description.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesCat = selectedCategory === "all" || a.category === selectedCategory;
      return matchesSearch && matchesCat;
    });
  }, [assets, searchQuery, selectedCategory]);

  const filteredLiabilities = useMemo(() => {
    return liabilities.filter((l) => {
      const matchesSearch =
        l.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (l.lender && l.lender.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesCat = selectedCategory === "all" || l.category === selectedCategory;
      return matchesSearch && matchesCat;
    });
  }, [liabilities, searchQuery, selectedCategory]);

  // Handle Asset Submission (Create / Update)
  const handleSaveAsset = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setFormError("");

    try {
      const payload = {
        name: assetForm.name,
        category: assetForm.category,
        subCategory: assetForm.subCategory || undefined,
        description: assetForm.description || undefined,
        currency: assetForm.currency,
        currentValue: assetForm.amount
          ? {
              amount: assetForm.amount,
              asOf: new Date(assetForm.asOf).toISOString(),
              source: assetForm.source,
            }
          : undefined,
      };

      const url = editingAsset ? `/api/assets/${editingAsset.id}` : "/api/assets";
      const method = editingAsset ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to save asset");
      }

      setIsAssetModalOpen(false);
      setEditingAsset(null);
      setAssetForm({
        name: "",
        category: "property",
        subCategory: "",
        currency: user?.preferredCurrency || "KES",
        amount: "",
        asOf: new Date().toISOString().split("T")[0],
        source: "manual",
        description: "",
      });
      fetchData();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Liability Submission (Create / Update)
  const handleSaveLiability = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setFormError("");

    try {
      const payload = {
        name: liabilityForm.name,
        category: liabilityForm.category,
        currency: liabilityForm.currency,
        lender: liabilityForm.lender || undefined,
        principalAmount: liabilityForm.principalAmount || undefined,
        interestRate: liabilityForm.interestRate || undefined,
        linkedAssetId: liabilityForm.linkedAssetId || undefined,
        notes: liabilityForm.notes || undefined,
        currentBalance: liabilityForm.currentBalance
          ? {
              amount: liabilityForm.currentBalance,
              asOf: new Date(liabilityForm.asOf).toISOString(),
              source: "manual",
            }
          : undefined,
      };

      const url = editingLiability ? `/api/liabilities/${editingLiability.id}` : "/api/liabilities";
      const method = editingLiability ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to save liability");
      }

      setIsLiabilityModalOpen(false);
      setEditingLiability(null);
      setLiabilityForm({
        name: "",
        category: "mortgage",
        currency: user?.preferredCurrency || "KES",
        principalAmount: "",
        currentBalance: "",
        interestRate: "",
        lender: "",
        linkedAssetId: "",
        asOf: new Date().toISOString().split("T")[0],
        notes: "",
      });
      fetchData();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Add Valuation
  const handleSaveValuation = async (e) => {
    e.preventDefault();
    if (!selectedAssetForValuation) return;
    setSubmitting(true);
    setFormError("");

    try {
      const res = await fetch(`/api/assets/${selectedAssetForValuation.id}/valuations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: valuationForm.amount,
          asOf: new Date(valuationForm.asOf).toISOString(),
          source: valuationForm.source,
          note: valuationForm.note || undefined,
          currency: selectedAssetForValuation.currency || user?.preferredCurrency || "KES",
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to record valuation");
      }

      setIsValuationModalOpen(false);
      setSelectedAssetForValuation(null);
      setValuationForm({
        amount: "",
        asOf: new Date().toISOString().split("T")[0],
        source: "manual",
        note: "",
      });
      fetchData();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Delete
  const handleDeleteConfirm = async () => {
    if (!itemToDelete) return;
    setSubmitting(true);
    try {
      const url =
        itemToDelete.type === "asset"
          ? `/api/assets/${itemToDelete.id}`
          : `/api/liabilities/${itemToDelete.id}`;
      const res = await fetch(url, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete record");

      setItemToDelete(null);
      fetchData();
    } catch (err) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-screen-2xl mx-auto">
      {/* ── Top Header & Actions ────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--color-text-primary)]">
            Assets & Liabilities
          </h1>
          <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
            Track tangible wealth, obligations, and verified valuations in one place.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            icon={TrendingDown}
            onClick={() => {
              setEditingLiability(null);
              setLiabilityForm({
                name: "",
                category: "mortgage",
                currency: user?.preferredCurrency || "KES",
                principalAmount: "",
                currentBalance: "",
                interestRate: "",
                lender: "",
                linkedAssetId: "",
                asOf: new Date().toISOString().split("T")[0],
                notes: "",
              });
              setIsLiabilityModalOpen(true);
            }}
          >
            Add Liability
          </Button>

          <Button
            variant="primary"
            icon={Plus}
            onClick={() => {
              setEditingAsset(null);
              setAssetForm({
                name: "",
                category: "property",
                subCategory: "",
                currency: user?.preferredCurrency || "KES",
                amount: "",
                asOf: new Date().toISOString().split("T")[0],
                source: "manual",
                description: "",
              });
              setIsAssetModalOpen(true);
            }}
          >
            Add Asset
          </Button>
        </div>
      </div>

      {/* ── KPI Summary Cards ───────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider">
              Total Assets
            </span>
            <span className="p-2 rounded-full bg-[var(--color-emerald-50)] text-[var(--color-emerald-600)]">
              <TrendingUp className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-3 text-2xl font-bold text-[var(--color-text-primary)]">
            {formatCurrency(totals.totalAssets, user?.preferredCurrency || "KES")}
          </div>
          <p className="mt-1 text-xs text-[var(--color-text-tertiary)]">
            {assets.filter((a) => a.status === "active").length} active asset accounts
          </p>
        </div>

        <div className="p-5 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider">
              Total Liabilities
            </span>
            <span className="p-2 rounded-full bg-[var(--color-coral-50)] text-[var(--color-coral-600)]">
              <TrendingDown className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-3 text-2xl font-bold text-[var(--color-text-primary)]">
            {formatCurrency(totals.totalLiabilities, user?.preferredCurrency || "KES")}
          </div>
          <p className="mt-1 text-xs text-[var(--color-text-tertiary)]">
            {liabilities.filter((l) => l.status === "active").length} active loan & debt accounts
          </p>
        </div>

        <div className="p-5 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider">
              Net Wealth Position
            </span>
            <span className="p-2 rounded-full bg-[var(--color-surface-2)] text-[var(--color-text-primary)]">
              <Sparkles className="w-4 h-4 text-[var(--color-gold-500)]" />
            </span>
          </div>
          <div
            className={`mt-3 text-2xl font-bold ${
              Number(totals.netWorth) >= 0
                ? "text-[var(--color-emerald-600)]"
                : "text-[var(--color-coral-600)]"
            }`}
          >
            {formatCurrency(totals.netWorth, user?.preferredCurrency || "KES")}
          </div>
          <p className="mt-1 text-xs text-[var(--color-text-tertiary)]">
            Assets minus verified obligations
          </p>
        </div>

        <div className="p-5 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider">
              Valuation Hygiene
            </span>
            <span
              className={`p-2 rounded-full ${
                totals.staleCount > 0
                  ? "bg-[var(--color-coral-50)] text-[var(--color-coral-600)]"
                  : "bg-[var(--color-emerald-50)] text-[var(--color-emerald-600)]"
              }`}
            >
              <History className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-3 text-2xl font-bold text-[var(--color-text-primary)]">
            {totals.staleCount === 0 ? "100% Fresh" : `${totals.staleCount} Outdated`}
          </div>
          <p className="mt-1 text-xs text-[var(--color-text-tertiary)]">
            {totals.staleCount > 0 ? "Requires updated appraisal" : "All records updated within 60 days"}
          </p>
        </div>
      </div>

      {/* ── Navigation Tabs & Filters ────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-2">
        <Tabs
          tabs={[
            { id: "assets", label: "Assets", count: assets.length },
            { id: "liabilities", label: "Liabilities", count: liabilities.length },
          ]}
          activeTab={activeTab}
          onChange={setActiveTab}
        />

        <div className="flex items-center gap-3">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-tertiary)]" />
            <input
              type="text"
              placeholder={`Search ${activeTab}...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[var(--radius-md)] pl-9 pr-3 py-1.5 text-xs text-[var(--color-text-primary)] placeholder-[var(--color-text-tertiary)] focus:outline-none focus:border-[var(--color-emerald-500)]"
            />
          </div>

          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[var(--radius-md)] px-3 py-1.5 text-xs text-[var(--color-text-secondary)] focus:outline-none cursor-pointer"
          >
            <option value="all">All Categories</option>
            {activeTab === "assets"
              ? Object.entries(assetCategoryLabels).map(([key, item]) => (
                  <option key={key} value={key}>
                    {item.label}
                  </option>
                ))
              : Object.entries(liabilityCategoryLabels).map(([key, item]) => (
                  <option key={key} value={key}>
                    {item.label}
                  </option>
                ))}
          </select>
        </div>
      </div>

      {/* ── Main Content Area ───────────────────────────────────────────── */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="p-5 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] space-y-3"
            >
              <SkeletonLoader className="h-5 w-2/3" />
              <SkeletonLoader className="h-4 w-1/3" />
              <SkeletonLoader className="h-8 w-1/2" />
            </div>
          ))}
        </div>
      ) : activeTab === "assets" ? (
        filteredAssets.length === 0 ? (
          <EmptyState
            icon={Building2}
            title={searchQuery ? "No assets match search" : "No assets recorded yet"}
            description={
              searchQuery
                ? "Try clearing your search query or category filter."
                : "Add properties, bank balances, vehicles, or equity to see your verified asset portfolio."
            }
            action={{
              label: "Add Your First Asset",
              onClick: () => {
                setEditingAsset(null);
                setIsAssetModalOpen(true);
              },
            }}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredAssets.map((asset) => {
              const catInfo = assetCategoryLabels[asset.category] || assetCategoryLabels.other;
              const freshness = getValuationFreshness(asset.currentValue?.asOf);
              const Icon = catInfo.icon;

              return (
                <div
                  key={asset.id}
                  id={`asset-${asset.id}`}
                  className={`group relative flex flex-col justify-between p-5 rounded-[var(--radius-lg)] border bg-[var(--color-surface)] hover:border-[var(--color-border-strong)] hover:shadow-xs transition-all ${
                    focusedId === asset.id
                      ? "border-[var(--color-emerald-400)] ring-2 ring-[var(--color-emerald-400)]/40"
                      : "border-[var(--color-border)]"
                  }`}
                >
                  <div>
                    {/* Header info */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <span className="p-2 rounded-[var(--radius-md)] bg-[var(--color-surface-2)] text-[var(--color-text-primary)]">
                          <Icon className="w-4 h-4" />
                        </span>
                        <div>
                          <h3 className="text-sm font-semibold text-[var(--color-text-primary)] line-clamp-1">
                            {asset.name}
                          </h3>
                          <p className="text-[11px] text-[var(--color-text-tertiary)]">
                            {catInfo.label}
                          </p>
                        </div>
                      </div>

                      <Badge tone={freshness.tone} dot size="sm">
                        {freshness.label}
                      </Badge>
                    </div>

                    {/* Monetary Value */}
                    <div className="mt-4 pt-3 border-t border-[var(--color-border)]">
                      <span className="text-[10px] uppercase font-bold tracking-wider text-[var(--color-text-tertiary)]">
                        Current Valuation
                      </span>
                      <div className="text-xl font-bold text-[var(--color-text-primary)] mt-0.5">
                        {formatCurrency(
                          asset.currentValue?.amount,
                          asset.currency || user?.preferredCurrency || "KES"
                        )}
                      </div>

                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-[11px] text-[var(--color-text-secondary)]">
                          Source: <span className="capitalize font-medium">{asset.currentValue?.source || "manual"}</span>
                        </span>
                        {asset.valuationHistory?.length > 1 && (
                          <span className="text-[11px] text-[var(--color-text-tertiary)]">
                            • {asset.valuationHistory.length} valuations recorded
                          </span>
                        )}
                      </div>

                      {asset.description && (
                        <p className="mt-2 text-xs text-[var(--color-text-secondary)] line-clamp-2">
                          {asset.description}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Footer actions */}
                  <div className="mt-5 pt-3 border-t border-[var(--color-border)] flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedAssetForValuation(asset);
                        setValuationForm({
                          amount: asset.currentValue?.amount || "",
                          asOf: new Date().toISOString().split("T")[0],
                          source: "manual",
                          note: "",
                        });
                        setIsValuationModalOpen(true);
                      }}
                      className="text-xs font-semibold text-[var(--color-emerald-700)] hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Add Valuation
                    </button>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingAsset(asset);
                          setAssetForm({
                            name: asset.name,
                            category: asset.category,
                            subCategory: asset.subCategory || "",
                            currency: asset.currency || user?.preferredCurrency || "KES",
                            amount: asset.currentValue?.amount || "",
                            asOf: asset.currentValue?.asOf
                              ? new Date(asset.currentValue.asOf).toISOString().split("T")[0]
                              : new Date().toISOString().split("T")[0],
                            source: asset.currentValue?.source || "manual",
                            description: asset.description || "",
                          });
                          setIsAssetModalOpen(true);
                        }}
                        className="p-1.5 rounded-[var(--radius-sm)] text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-2)] transition-colors cursor-pointer"
                        title="Edit Asset"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => setItemToDelete({ type: "asset", id: asset.id, name: asset.name })}
                        className="p-1.5 rounded-[var(--radius-sm)] text-[var(--color-text-tertiary)] hover:text-[var(--color-coral-600)] hover:bg-[var(--color-coral-50)] transition-colors cursor-pointer"
                        title="Delete Asset"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )
      ) : filteredLiabilities.length === 0 ? (
        <EmptyState
          icon={Landmark}
          title={searchQuery ? "No liabilities match search" : "No liabilities recorded"}
          description={
            searchQuery
              ? "Try clearing your search query or category filter."
              : "Track loans, mortgages, credit lines, or tax debt to maintain an honest balance sheet."
          }
          action={{
            label: "Add a Liability",
            onClick: () => {
              setEditingLiability(null);
              setIsLiabilityModalOpen(true);
            },
          }}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredLiabilities.map((liability) => {
            const catInfo =
              liabilityCategoryLabels[liability.category] || liabilityCategoryLabels.other;

            return (
              <div
                key={liability.id}
                id={`liability-${liability.id}`}
                className={`group relative flex flex-col justify-between p-5 rounded-[var(--radius-lg)] border bg-[var(--color-surface)] hover:border-[var(--color-border-strong)] hover:shadow-xs transition-all ${
                  focusedId === liability.id
                    ? "border-[var(--color-emerald-400)] ring-2 ring-[var(--color-emerald-400)]/40"
                    : "border-[var(--color-border)]"
                }`}
              >
                <div>
                  {/* Header info */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="text-sm font-semibold text-[var(--color-text-primary)] line-clamp-1">
                        {liability.name}
                      </h3>
                      <p className="text-[11px] text-[var(--color-text-tertiary)]">
                        {liability.lender || catInfo.label}
                      </p>
                    </div>

                    <Badge tone={catInfo.tone} size="sm">
                      {catInfo.label}
                    </Badge>
                  </div>

                  {/* Monetary Balance */}
                  <div className="mt-4 pt-3 border-t border-[var(--color-border)]">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-[var(--color-text-tertiary)]">
                      Outstanding Balance
                    </span>
                    <div className="text-xl font-bold text-[var(--color-coral-600)] mt-0.5">
                      {formatCurrency(
                        liability.currentBalance?.amount,
                        liability.currency || user?.preferredCurrency || "KES"
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-2 mt-3 pt-2 border-t border-[var(--color-surface-2)]">
                      {liability.interestRate && (
                        <div>
                          <span className="text-[10px] text-[var(--color-text-tertiary)] uppercase font-semibold">
                            Interest Rate
                          </span>
                          <p className="text-xs font-semibold text-[var(--color-text-primary)]">
                            {liability.interestRate}% APR
                          </p>
                        </div>
                      )}

                      {liability.principalAmount && (
                        <div>
                          <span className="text-[10px] text-[var(--color-text-tertiary)] uppercase font-semibold">
                            Original Principal
                          </span>
                          <p className="text-xs font-semibold text-[var(--color-text-secondary)]">
                            {formatCurrency(liability.principalAmount, liability.currency)}
                          </p>
                        </div>
                      )}
                    </div>

                    {liability.linkedAsset && (
                      <div className="mt-3 flex items-center gap-1.5 p-2 rounded-[var(--radius-sm)] bg-[var(--color-surface-2)] text-[11px] text-[var(--color-text-secondary)]">
                        <Link2 className="w-3.5 h-3.5 shrink-0 text-[var(--color-emerald-600)]" />
                        <span>Secured against: <strong>{liability.linkedAsset.name}</strong></span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer actions */}
                <div className="mt-5 pt-3 border-t border-[var(--color-border)] flex items-center justify-between">
                  <span className="text-[11px] text-[var(--color-text-tertiary)]">
                    Status: <span className="capitalize font-medium text-[var(--color-text-secondary)]">{liability.status}</span>
                  </span>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingLiability(liability);
                        setLiabilityForm({
                          name: liability.name,
                          category: liability.category,
                          currency: liability.currency || user?.preferredCurrency || "KES",
                          principalAmount: liability.principalAmount || "",
                          currentBalance: liability.currentBalance?.amount || "",
                          interestRate: liability.interestRate || "",
                          lender: liability.lender || "",
                          linkedAssetId: liability.linkedAsset?.id || "",
                          asOf: liability.currentBalance?.asOf
                            ? new Date(liability.currentBalance.asOf).toISOString().split("T")[0]
                            : new Date().toISOString().split("T")[0],
                          notes: liability.notes || "",
                        });
                        setIsLiabilityModalOpen(true);
                      }}
                      className="p-1.5 rounded-[var(--radius-sm)] text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-2)] transition-colors cursor-pointer"
                      title="Edit Liability"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        setItemToDelete({ type: "liability", id: liability.id, name: liability.name })
                      }
                      className="p-1.5 rounded-[var(--radius-sm)] text-[var(--color-text-tertiary)] hover:text-[var(--color-coral-600)] hover:bg-[var(--color-coral-50)] transition-colors cursor-pointer"
                      title="Delete Liability"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Add / Edit Asset Modal ───────────────────────────────────────── */}
      <Modal
        isOpen={isAssetModalOpen}
        onClose={() => setIsAssetModalOpen(false)}
        title={editingAsset ? "Edit Asset Details" : "Record New Asset"}
        description="Add a tangible holding to your net worth calculation with an audited initial valuation."
      >
        <form onSubmit={handleSaveAsset} className="space-y-4">
          {formError && (
            <div className="p-3 rounded-[var(--radius-md)] bg-[var(--color-coral-50)] border border-[var(--color-coral-300)] text-xs text-[var(--color-coral-700)] flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <Input
            label="Asset Name"
            placeholder="e.g. Westlands 2-Bedroom Apartment, NCBA Checking"
            value={assetForm.name}
            onChange={(e) => setAssetForm({ ...assetForm, name: e.target.value })}
            required
          />

          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Asset Category"
              value={assetForm.category}
              onChange={(e) => setAssetForm({ ...assetForm, category: e.target.value })}
            >
              {Object.entries(assetCategoryLabels).map(([val, item]) => (
                <option key={val} value={val}>
                  {item.label}
                </option>
              ))}
            </Select>

            <Input
              label="Currency"
              placeholder="KES"
              value={assetForm.currency}
              onChange={(e) => setAssetForm({ ...assetForm, currency: e.target.value.toUpperCase() })}
              maxLength={3}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Current Valuation Amount"
              placeholder="0.00"
              value={assetForm.amount}
              onChange={(e) => setAssetForm({ ...assetForm, amount: e.target.value })}
              type="number"
              step="0.01"
              required
            />

            <Input
              label="Valuation As Of Date"
              type="date"
              value={assetForm.asOf}
              onChange={(e) => setAssetForm({ ...assetForm, asOf: e.target.value })}
              required
            />
          </div>

          <Select
            label="Valuation Source"
            value={assetForm.source}
            onChange={(e) => setAssetForm({ ...assetForm, source: e.target.value })}
          >
            <option value="manual">Manual Entry / Self Appraised</option>
            <option value="statement">Bank / Financial Statement</option>
            <option value="market_feed">Market Feed / Stock Exchange</option>
            <option value="ai_extracted">AI Document Extraction</option>
          </Select>

          <Input
            label="Description / Notes"
            placeholder="Registration details, location, account number reference..."
            value={assetForm.description}
            onChange={(e) => setAssetForm({ ...assetForm, description: e.target.value })}
          />

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[var(--color-border)]">
            <Button variant="ghost" onClick={() => setIsAssetModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" loading={submitting}>
              {editingAsset ? "Save Changes" : "Create Asset"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* ── Add / Edit Liability Modal ───────────────────────────────────── */}
      <Modal
        isOpen={isLiabilityModalOpen}
        onClose={() => setIsLiabilityModalOpen(false)}
        title={editingLiability ? "Edit Liability" : "Record New Liability / Debt"}
        description="Record loans, mortgages, or lines of credit to keep debt deductions accurate."
      >
        <form onSubmit={handleSaveLiability} className="space-y-4">
          {formError && (
            <div className="p-3 rounded-[var(--radius-md)] bg-[var(--color-coral-50)] border border-[var(--color-coral-300)] text-xs text-[var(--color-coral-700)] flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <Input
            label="Liability Name"
            placeholder="e.g. Stanbic Mortgage, KCB Auto Loan"
            value={liabilityForm.name}
            onChange={(e) => setLiabilityForm({ ...liabilityForm, name: e.target.value })}
            required
          />

          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Debt Category"
              value={liabilityForm.category}
              onChange={(e) => setLiabilityForm({ ...liabilityForm, category: e.target.value })}
            >
              {Object.entries(liabilityCategoryLabels).map(([val, item]) => (
                <option key={val} value={val}>
                  {item.label}
                </option>
              ))}
            </Select>

            <Input
              label="Lender / Creditor"
              placeholder="e.g. Stanbic Bank"
              value={liabilityForm.lender}
              onChange={(e) => setLiabilityForm({ ...liabilityForm, lender: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Outstanding Balance"
              placeholder="0.00"
              value={liabilityForm.currentBalance}
              onChange={(e) => setLiabilityForm({ ...liabilityForm, currentBalance: e.target.value })}
              type="number"
              step="0.01"
              required
            />

            <Input
              label="Interest Rate (% APR)"
              placeholder="e.g. 13.5"
              value={liabilityForm.interestRate}
              onChange={(e) => setLiabilityForm({ ...liabilityForm, interestRate: e.target.value })}
              type="number"
              step="0.01"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Original Principal (Optional)"
              placeholder="0.00"
              value={liabilityForm.principalAmount}
              onChange={(e) => setLiabilityForm({ ...liabilityForm, principalAmount: e.target.value })}
              type="number"
              step="0.01"
            />

            <Select
              label="Secured Against Asset (Optional)"
              value={liabilityForm.linkedAssetId}
              onChange={(e) => setLiabilityForm({ ...liabilityForm, linkedAssetId: e.target.value })}
            >
              <option value="">None (Unsecured)</option>
              {assets.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name} ({a.category})
                </option>
              ))}
            </Select>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[var(--color-border)]">
            <Button variant="ghost" onClick={() => setIsLiabilityModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" loading={submitting}>
              {editingLiability ? "Save Changes" : "Create Liability"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* ── Add Valuation Modal ─────────────────────────────────────────── */}
      <Modal
        isOpen={isValuationModalOpen}
        onClose={() => setIsValuationModalOpen(false)}
        title={`New Valuation for ${selectedAssetForValuation?.name || "Asset"}`}
        description="Record a new valuation point without destroying earlier historical records."
      >
        <form onSubmit={handleSaveValuation} className="space-y-4">
          {formError && (
            <div className="p-3 rounded-[var(--radius-md)] bg-[var(--color-coral-50)] border border-[var(--color-coral-300)] text-xs text-[var(--color-coral-700)] flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <div className="p-3 rounded-[var(--radius-md)] bg-[var(--color-surface-2)] border border-[var(--color-border)] text-xs text-[var(--color-text-secondary)]">
            Previous Valuation:{" "}
            <strong>
              {formatCurrency(
                selectedAssetForValuation?.currentValue?.amount,
                selectedAssetForValuation?.currency || user?.preferredCurrency || "KES"
              )}
            </strong>{" "}
            as of {selectedAssetForValuation?.currentValue?.asOf ? new Date(selectedAssetForValuation.currentValue.asOf).toLocaleDateString() : "unknown date"}.
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="New Valuation Amount"
              placeholder="0.00"
              value={valuationForm.amount}
              onChange={(e) => setValuationForm({ ...valuationForm, amount: e.target.value })}
              type="number"
              step="0.01"
              required
            />

            <Input
              label="Effective Date"
              type="date"
              value={valuationForm.asOf}
              onChange={(e) => setValuationForm({ ...valuationForm, asOf: e.target.value })}
              required
            />
          </div>

          <Select
            label="Valuation Source"
            value={valuationForm.source}
            onChange={(e) => setValuationForm({ ...valuationForm, source: e.target.value })}
          >
            <option value="manual">Manual Entry / Professional Appraisal</option>
            <option value="statement">Bank / Investment Statement</option>
            <option value="market_feed">Stock Market / Asset Exchange</option>
            <option value="ai_extracted">AI Extracted from Title/Deed</option>
          </Select>

          <Input
            label="Note / Appraisal Reference"
            placeholder="e.g. Registered surveyor appraisal report #2026-44"
            value={valuationForm.note}
            onChange={(e) => setValuationForm({ ...valuationForm, note: e.target.value })}
          />

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[var(--color-border)]">
            <Button variant="ghost" onClick={() => setIsValuationModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" loading={submitting}>
              Record Valuation
            </Button>
          </div>
        </form>
      </Modal>

      {/* ── Confirm Delete Modal ────────────────────────────────────────── */}
      <Modal
        isOpen={Boolean(itemToDelete)}
        onClose={() => setItemToDelete(null)}
        title="Confirm Deletion"
        description="Are you sure you want to delete this record? This action cannot be undone."
      >
        <div className="space-y-4">
          <p className="text-sm text-[var(--color-text-secondary)]">
            You are about to permanently delete{" "}
            <strong className="text-[var(--color-text-primary)]">{itemToDelete?.name}</strong>.
          </p>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[var(--color-border)]">
            <Button variant="ghost" onClick={() => setItemToDelete(null)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleDeleteConfirm} loading={submitting}>
              Yes, Delete
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
