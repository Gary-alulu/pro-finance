"use client";
// app/(app)/investments/InvestmentsClient.js
// Portfolio manager for equities, bonds, REITs, funds, and alternative holdings.

import { useState, useEffect, useMemo } from "react";
import dynamic from "next/dynamic";
import { motion } from "framer-motion";
import {
  Plus,
  Search,
  TrendingUp,
  TrendingDown,
  LineChart,
  Landmark,
  Building,
  DollarSign,
  PieChart,
  Edit2,
  Trash2,
  RefreshCw,
  AlertTriangle,
  History,
  Layers,
} from "lucide-react";
import { formatCurrency, sumAmounts, formatNumber } from "@/lib/finance/currency";
import { Decimal } from "decimal.js";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Badge from "@/components/ui/Badge";
import Modal from "@/components/ui/Modal";
import EmptyState from "@/components/ui/EmptyState";
import SkeletonLoader from "@/components/ui/SkeletonLoader";

// Recharts is ~395 KB — keep the chart out of the initial investments bundle.
const InvestmentPerformanceChart = dynamic(
  () => import("@/components/charts/InvestmentPerformanceChart"),
  {
    loading: () => <SkeletonLoader className="h-72 w-full rounded-[var(--radius-lg)]" />,
  }
);

const investmentTypeLabels = {
  listed_equity: { label: "Public Equities / Stocks", tone: "emerald" },
  bond: { label: "Government / Corporate Bonds", tone: "blue" },
  reit: { label: "Real Estate Investment Trust", tone: "purple" },
  etf: { label: "ETF / Index Fund", tone: "emerald" },
  mutual_fund: { label: "Unit Trust / Mutual Fund", tone: "blue" },
  private_equity: { label: "Private Equity", tone: "gold" },
  crypto: { label: "Cryptocurrency", tone: "gold" },
  commodity: { label: "Commodity", tone: "neutral" },
  other: { label: "Other Investment", tone: "neutral" },
};

export default function InvestmentsClient({ user, focusId = null, newRecord = false }) {
  const [holdings, setHoldings] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState("all");

  // Modals (deep-link ?focus=<id> highlights a holding, ?new=1 opens the form)
  const [isHoldingModalOpen, setIsHoldingModalOpen] = useState(newRecord);
  const [isPriceModalOpen, setIsPriceModalOpen] = useState(false);
  const [selectedHoldingForPrice, setSelectedHoldingForPrice] = useState(null);
  const [editingHolding, setEditingHolding] = useState(null);
  const [holdingToDelete, setHoldingToDelete] = useState(null);
  const [focusedId, setFocusedId] = useState(focusId);

  // Scroll the focused holding into view once data arrives (DOM sync — no state)
  useEffect(() => {
    if (loading || !focusedId) return;
    document.getElementById(`holding-${focusedId}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [loading, focusedId]);

  // Form states
  const [form, setForm] = useState({
    name: "",
    type: "listed_equity",
    ticker: "",
    exchange: "NSE",
    currency: user?.preferredCurrency || "KES",
    units: "",
    costBasisAmount: "",
    costBasisDate: new Date().toISOString().split("T")[0],
    currentPrice: "",
    priceDate: new Date().toISOString().split("T")[0],
    priceSource: "manual",
    notes: "",
  });

  const [priceForm, setPriceForm] = useState({
    price: "",
    asOf: new Date().toISOString().split("T")[0],
    source: "manual",
  });

  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  const fetchData = async () => {
    try {
      const res = await fetch("/api/investments");
      if (res.ok) {
        const data = await res.json();
        setHoldings(data.holdings || []);
      }
    } catch (err) {
      console.error("Error fetching investments:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Defer so the fetch's setState calls happen after the effect commits
    const t = setTimeout(fetchData, 0);
    return () => clearTimeout(t);
  }, []);

  // Compute portfolio aggregates
  const portfolioSummary = useMemo(() => {
    let totalValue = new Decimal(0);
    let totalCost = new Decimal(0);

    holdings.forEach((h) => {
      if (h.marketValue) {
        try {
          totalValue = totalValue.plus(new Decimal(h.marketValue));
        } catch {}
      }
      if (h.costBasis?.totalCost) {
        try {
          totalCost = totalCost.plus(new Decimal(h.costBasis.totalCost));
        } catch {}
      }
    });

    const gainLoss = totalValue.minus(totalCost);
    let gainLossPercent = "0.00";
    if (!totalCost.isZero()) {
      gainLossPercent = gainLoss.dividedBy(totalCost).times(100).toFixed(2);
    }

    return {
      totalValue: totalValue.toFixed(2),
      totalCost: totalCost.toFixed(2),
      gainLoss: gainLoss.toFixed(2),
      gainLossPercent,
      activeHoldingsCount: holdings.filter((h) => h.status === "active").length,
    };
  }, [holdings]);

  // Filtered holdings
  const filtered = useMemo(() => {
    return holdings.filter((h) => {
      const matchesSearch =
        h.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (h.ticker && h.ticker.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (h.exchange && h.exchange.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesType = selectedType === "all" || h.type === selectedType;
      return matchesSearch && matchesType;
    });
  }, [holdings, searchQuery, selectedType]);

  const handleSaveHolding = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setFormError("");

    try {
      const payload = {
        name: form.name,
        type: form.type,
        ticker: form.ticker || undefined,
        exchange: form.exchange || undefined,
        currency: form.currency,
        units: form.units || undefined,
        notes: form.notes || undefined,
        costBasis: form.costBasisAmount
          ? {
              totalCost: form.costBasisAmount,
              currency: form.currency,
              asOf: new Date(form.costBasisDate).toISOString(),
            }
          : undefined,
        currentPrice: form.currentPrice
          ? {
              price: form.currentPrice,
              currency: form.currency,
              asOf: new Date(form.priceDate).toISOString(),
              source: form.priceSource,
            }
          : undefined,
      };

      const url = editingHolding ? `/api/investments/${editingHolding.id}` : "/api/investments";
      const method = editingHolding ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to save investment holding");
      }

      setIsHoldingModalOpen(false);
      setEditingHolding(null);
      fetchData();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSavePrice = async (e) => {
    e.preventDefault();
    if (!selectedHoldingForPrice) return;
    setSubmitting(true);
    setFormError("");

    try {
      const res = await fetch(`/api/investments/${selectedHoldingForPrice.id}/price`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          price: priceForm.price,
          asOf: new Date(priceForm.asOf).toISOString(),
          source: priceForm.source,
          currency: selectedHoldingForPrice.currency || user?.preferredCurrency || "KES",
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to update price");
      }

      setIsPriceModalOpen(false);
      setSelectedHoldingForPrice(null);
      fetchData();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!holdingToDelete) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/investments/${holdingToDelete.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete holding");

      setHoldingToDelete(null);
      fetchData();
    } catch (err) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-screen-2xl mx-auto">
      {/* ── Top Header ──────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--color-text-primary)]">
            Investments Portfolio
          </h1>
          <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
            Multi-asset portfolio with audited unit counts and price observations.
          </p>
        </div>

        <Button
          variant="primary"
          icon={Plus}
          onClick={() => {
            setEditingHolding(null);
            setForm({
              name: "",
              type: "listed_equity",
              ticker: "",
              exchange: "NSE",
              currency: user?.preferredCurrency || "KES",
              units: "",
              costBasisAmount: "",
              costBasisDate: new Date().toISOString().split("T")[0],
              currentPrice: "",
              priceDate: new Date().toISOString().split("T")[0],
              priceSource: "manual",
              notes: "",
            });
            setIsHoldingModalOpen(true);
          }}
        >
          Add Investment
        </Button>
      </div>

      {/* ── KPI Cards ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider">
              Portfolio Market Value
            </span>
            <span className="p-2 rounded-full bg-[var(--color-emerald-50)] text-[var(--color-emerald-600)]">
              <LineChart className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-3 text-2xl font-bold text-[var(--color-text-primary)]">
            {formatCurrency(portfolioSummary.totalValue, user?.preferredCurrency || "KES")}
          </div>
          <p className="mt-1 text-xs text-[var(--color-text-tertiary)]">
            Marked to latest recorded prices
          </p>
        </div>

        <div className="p-5 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider">
              Total Invested Cost
            </span>
            <span className="p-2 rounded-full bg-[var(--color-surface-2)] text-[var(--color-text-secondary)]">
              <DollarSign className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-3 text-2xl font-bold text-[var(--color-text-primary)]">
            {formatCurrency(portfolioSummary.totalCost, user?.preferredCurrency || "KES")}
          </div>
          <p className="mt-1 text-xs text-[var(--color-text-tertiary)]">
            Historical cost basis recorded
          </p>
        </div>

        <div className="p-5 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider">
              Unrealized Return
            </span>
            <span
              className={`p-2 rounded-full ${
                Number(portfolioSummary.gainLoss) >= 0
                  ? "bg-[var(--color-emerald-50)] text-[var(--color-emerald-600)]"
                  : "bg-[var(--color-coral-50)] text-[var(--color-coral-600)]"
              }`}
            >
              {Number(portfolioSummary.gainLoss) >= 0 ? (
                <TrendingUp className="w-4 h-4" />
              ) : (
                <TrendingDown className="w-4 h-4" />
              )}
            </span>
          </div>
          <div
            className={`mt-3 text-2xl font-bold ${
              Number(portfolioSummary.gainLoss) >= 0
                ? "text-[var(--color-emerald-600)]"
                : "text-[var(--color-coral-600)]"
            }`}
          >
            {Number(portfolioSummary.gainLoss) >= 0 ? "+" : ""}
            {formatCurrency(portfolioSummary.gainLoss, user?.preferredCurrency || "KES")}
          </div>
          <p className="mt-1 text-xs font-medium text-[var(--color-text-secondary)]">
            {Number(portfolioSummary.gainLossPercent) >= 0 ? "+" : ""}
            {portfolioSummary.gainLossPercent}% all-time return
          </p>
        </div>

        <div className="p-5 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider">
              Holdings Count
            </span>
            <span className="p-2 rounded-full bg-[var(--color-gold-50)] text-[var(--color-gold-700)]">
              <PieChart className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-3 text-2xl font-bold text-[var(--color-text-primary)]">
            {portfolioSummary.activeHoldingsCount} Assets
          </div>
          <p className="mt-1 text-xs text-[var(--color-text-tertiary)]">
            Diversified across asset classes
          </p>
        </div>
      </div>

      {/* ── Performance chart ───────────────────────────────────────────── */}
      <InvestmentPerformanceChart
        currency={user?.preferredCurrency || "KES"}
        holdings={holdings}
        loading={loading}
      />

      {/* ── Filters & Search ────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-xs">
        <div className="flex items-center gap-3 flex-1">
          <div className="relative w-full max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-tertiary)]" />
            <input
              type="text"
              placeholder="Search holding name, ticker, or exchange..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-[var(--radius-md)] pl-9 pr-3 py-1.5 text-xs text-[var(--color-text-primary)] placeholder-[var(--color-text-tertiary)] focus:outline-none focus:border-[var(--color-emerald-500)]"
            />
          </div>

          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-[var(--radius-md)] px-3 py-1.5 text-xs text-[var(--color-text-secondary)] focus:outline-none cursor-pointer"
          >
            <option value="all">All Asset Classes</option>
            {Object.entries(investmentTypeLabels).map(([key, val]) => (
              <option key={key} value={key}>
                {val.label}
              </option>
            ))}
          </select>
        </div>

        <span className="text-xs text-[var(--color-text-tertiary)] font-medium">
          {filtered.length} holdings listed
        </span>
      </div>

      {/* ── Holdings List ───────────────────────────────────────────────── */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="p-5 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] space-y-3"
            >
              <SkeletonLoader className="h-5 w-2/3" />
              <SkeletonLoader className="h-8 w-1/2" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={LineChart}
          title={searchQuery ? "No matching investments" : "No investments recorded yet"}
          description={
            searchQuery
              ? "Try adjusting your search query or asset class filter."
              : "Track shares, government bonds, mutual funds, or digital assets with verified cost basis."
          }
          action={{
            label: "Add Your First Holding",
            onClick: () => {
              setEditingHolding(null);
              setIsHoldingModalOpen(true);
            },
          }}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((holding) => {
            const typeInfo = investmentTypeLabels[holding.type] || investmentTypeLabels.other;
            const hasGain = holding.gainLoss && Number(holding.gainLoss) >= 0;

            return (
              <div
                key={holding.id}
                id={`holding-${holding.id}`}
                className={`group relative flex flex-col justify-between p-5 rounded-[var(--radius-lg)] border bg-[var(--color-surface)] hover:border-[var(--color-border-strong)] hover:shadow-xs transition-all ${
                  focusedId === holding.id
                    ? "border-[var(--color-emerald-400)] ring-2 ring-[var(--color-emerald-400)]/40"
                    : "border-[var(--color-border)]"
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">
                          {holding.name}
                        </h3>
                        {holding.ticker && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-[var(--color-surface-2)] text-[var(--color-text-secondary)]">
                            {holding.ticker}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-[var(--color-text-tertiary)] mt-0.5">
                        {holding.exchange ? `${holding.exchange} • ` : ""}
                        {typeInfo.label}
                      </p>
                    </div>

                    <Badge tone={typeInfo.tone} size="sm">
                      {typeInfo.label.split(" ")[0]}
                    </Badge>
                  </div>

                  {/* Market Value & Return */}
                  <div className="mt-4 pt-3 border-t border-[var(--color-border)]">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-[var(--color-text-tertiary)]">
                      Market Value
                    </span>
                    <div className="text-xl font-bold text-[var(--color-text-primary)] mt-0.5">
                      {formatCurrency(holding.marketValue, holding.currency || "KES")}
                    </div>

                    {holding.gainLossPercent && (
                      <div className="flex items-center gap-1.5 mt-1.5">
                        <span
                          className={`inline-flex items-center text-xs font-semibold ${
                            hasGain
                              ? "text-[var(--color-emerald-600)]"
                              : "text-[var(--color-coral-600)]"
                          }`}
                        >
                          {hasGain ? "+" : ""}
                          {holding.gainLossPercent}% ({hasGain ? "+" : ""}
                          {formatCurrency(holding.gainLoss, holding.currency)})
                        </span>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-2 mt-3 pt-2 border-t border-[var(--color-surface-2)] text-xs">
                      <div>
                        <span className="text-[10px] text-[var(--color-text-tertiary)] uppercase font-semibold">
                          Units Held
                        </span>
                        <p className="font-semibold text-[var(--color-text-primary)]">
                          {holding.units ? formatNumber(holding.units, 4) : "—"}
                        </p>
                      </div>

                      <div>
                        <span className="text-[10px] text-[var(--color-text-tertiary)] uppercase font-semibold">
                          Current Price
                        </span>
                        <p className="font-semibold text-[var(--color-text-primary)]">
                          {formatCurrency(holding.currentPrice?.price, holding.currency)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer Actions */}
                <div className="mt-5 pt-3 border-t border-[var(--color-border)] flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedHoldingForPrice(holding);
                      setPriceForm({
                        price: holding.currentPrice?.price || "",
                        asOf: new Date().toISOString().split("T")[0],
                        source: "manual",
                      });
                      setIsPriceModalOpen(true);
                    }}
                    className="text-xs font-semibold text-[var(--color-emerald-700)] hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Update Price
                  </button>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingHolding(holding);
                        setForm({
                          name: holding.name,
                          type: holding.type,
                          ticker: holding.ticker || "",
                          exchange: holding.exchange || "",
                          currency: holding.currency || user?.preferredCurrency || "KES",
                          units: holding.units || "",
                          costBasisAmount: holding.costBasis?.totalCost || "",
                          costBasisDate: holding.costBasis?.asOf
                            ? new Date(holding.costBasis.asOf).toISOString().split("T")[0]
                            : new Date().toISOString().split("T")[0],
                          currentPrice: holding.currentPrice?.price || "",
                          priceDate: holding.currentPrice?.asOf
                            ? new Date(holding.currentPrice.asOf).toISOString().split("T")[0]
                            : new Date().toISOString().split("T")[0],
                          priceSource: holding.currentPrice?.source || "manual",
                          notes: holding.notes || "",
                        });
                        setIsHoldingModalOpen(true);
                      }}
                      className="p-1.5 rounded-[var(--radius-sm)] text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-2)] cursor-pointer"
                      title="Edit"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => setHoldingToDelete(holding)}
                      className="p-1.5 rounded-[var(--radius-sm)] text-[var(--color-text-tertiary)] hover:text-[var(--color-coral-600)] hover:bg-[var(--color-coral-50)] cursor-pointer"
                      title="Delete"
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

      {/* ── Add / Edit Holding Modal ─────────────────────────────────────── */}
      <Modal
        isOpen={isHoldingModalOpen}
        onClose={() => setIsHoldingModalOpen(false)}
        title={editingHolding ? "Edit Holding" : "Add Investment Holding"}
        description="Record equity shares, debt securities, or funds with rigorous cost basis tracking."
      >
        <form onSubmit={handleSaveHolding} className="space-y-4">
          {formError && (
            <div className="p-3 rounded-[var(--radius-md)] bg-[var(--color-coral-50)] border border-[var(--color-coral-300)] text-xs text-[var(--color-coral-700)] flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <Input
            label="Holding Name"
            placeholder="e.g. Safaricom PLC, Kenya Infrastructure Bond IFB1/2024"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />

          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Asset Class"
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value })}
            >
              {Object.entries(investmentTypeLabels).map(([key, val]) => (
                <option key={key} value={key}>
                  {val.label}
                </option>
              ))}
            </Select>

            <Input
              label="Ticker / Symbol"
              placeholder="e.g. SCOM, FXD1/2023"
              value={form.ticker}
              onChange={(e) => setForm({ ...form, ticker: e.target.value.toUpperCase() })}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Units / Shares"
              placeholder="e.g. 5000"
              value={form.units}
              onChange={(e) => setForm({ ...form, units: e.target.value })}
              type="number"
              step="0.0001"
              required
            />

            <Input
              label="Currency"
              placeholder="KES"
              value={form.currency}
              onChange={(e) => setForm({ ...form, currency: e.target.value.toUpperCase() })}
              maxLength={3}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Total Cost Basis (Capital Invested)"
              placeholder="0.00"
              value={form.costBasisAmount}
              onChange={(e) => setForm({ ...form, costBasisAmount: e.target.value })}
              type="number"
              step="0.01"
            />

            <Input
              label="Current Market Price Per Unit"
              placeholder="0.00"
              value={form.currentPrice}
              onChange={(e) => setForm({ ...form, currentPrice: e.target.value })}
              type="number"
              step="0.0001"
            />
          </div>

          <Input
            label="Exchange / Broker"
            placeholder="e.g. Nairobi Securities Exchange, Dyer & Blair"
            value={form.exchange}
            onChange={(e) => setForm({ ...form, exchange: e.target.value })}
          />

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[var(--color-border)]">
            <Button variant="ghost" onClick={() => setIsHoldingModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" loading={submitting}>
              {editingHolding ? "Save Changes" : "Create Holding"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* ── Quick Update Price Modal ────────────────────────────────────── */}
      <Modal
        isOpen={isPriceModalOpen}
        onClose={() => setIsPriceModalOpen(false)}
        title={`Update Price for ${selectedHoldingForPrice?.name || "Holding"}`}
        description="Record a new observed market price per unit without losing previous history."
      >
        <form onSubmit={handleSavePrice} className="space-y-4">
          {formError && (
            <div className="p-3 rounded-[var(--radius-md)] bg-[var(--color-coral-50)] border border-[var(--color-coral-300)] text-xs text-[var(--color-coral-700)] flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <div className="p-3 rounded-[var(--radius-md)] bg-[var(--color-surface-2)] text-xs text-[var(--color-text-secondary)]">
            Previous Recorded Price:{" "}
            <strong>
              {formatCurrency(
                selectedHoldingForPrice?.currentPrice?.price,
                selectedHoldingForPrice?.currency
              )}
            </strong>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="New Price Per Unit"
              placeholder="0.00"
              value={priceForm.price}
              onChange={(e) => setPriceForm({ ...priceForm, price: e.target.value })}
              type="number"
              step="0.0001"
              required
            />

            <Input
              label="Observation Date"
              type="date"
              value={priceForm.asOf}
              onChange={(e) => setPriceForm({ ...priceForm, asOf: e.target.value })}
              required
            />
          </div>

          <Select
            label="Price Source"
            value={priceForm.source}
            onChange={(e) => setPriceForm({ ...priceForm, source: e.target.value })}
          >
            <option value="manual">Manual Quote</option>
            <option value="market_feed">NSE / Exchange Close</option>
            <option value="ai_extracted">Broker Statement</option>
          </Select>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[var(--color-border)]">
            <Button variant="ghost" onClick={() => setIsPriceModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" loading={submitting}>
              Record Price
            </Button>
          </div>
        </form>
      </Modal>

      {/* ── Confirm Delete Modal ────────────────────────────────────────── */}
      <Modal
        isOpen={Boolean(holdingToDelete)}
        onClose={() => setHoldingToDelete(null)}
        title="Delete Holding"
        description="Are you sure you want to remove this investment holding?"
      >
        <div className="space-y-4">
          <p className="text-sm text-[var(--color-text-secondary)]">
            You are about to delete{" "}
            <strong className="text-[var(--color-text-primary)]">{holdingToDelete?.name}</strong>.
          </p>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[var(--color-border)]">
            <Button variant="ghost" onClick={() => setHoldingToDelete(null)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleDelete} loading={submitting}>
              Delete Record
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
