"use client";
// app/(app)/transactions/TransactionsClient.js
// High-craft transaction ledger with evidence verification, linked records, and decimal safety.

import { useState, useEffect, useMemo } from "react";
import dynamic from "next/dynamic";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Search,
  Filter,
  ArrowDownLeft,
  ArrowUpRight,
  ArrowLeftRight,
  ShieldCheck,
  ShieldAlert,
  Clock,
  Layers,
  Trash2,
  Edit2,
  AlertTriangle,
  FileText,
  Calendar,
  Building2,
  Landmark,
  CheckCircle2,
} from "lucide-react";
import { formatCurrency, sumAmounts } from "@/lib/finance/currency";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Dropdown from "@/components/ui/Dropdown";
import Badge from "@/components/ui/Badge";
import Modal from "@/components/ui/Modal";
import EmptyState from "@/components/ui/EmptyState";
import SkeletonLoader from "@/components/ui/SkeletonLoader";

// Recharts is ~395 KB — keep the chart out of the initial transactions bundle.
const TransactionFlowChart = dynamic(() => import("@/components/charts/TransactionFlowChart"), {
  loading: () => <SkeletonLoader className="h-72 w-full rounded-[var(--radius-lg)]" />,
});

const categoryLabels = {
  income: { label: "Income & Salary", tone: "emerald" },
  expense: { label: "Expense", tone: "coral" },
  investment_purchase: { label: "Investment Purchase", tone: "purple" },
  investment_sale: { label: "Investment Sale", tone: "emerald" },
  loan_repayment: { label: "Loan Repayment", tone: "gold" },
  asset_purchase: { label: "Asset Purchase", tone: "purple" },
  asset_sale: { label: "Asset Sale", tone: "emerald" },
  dividend: { label: "Dividend", tone: "emerald" },
  interest: { label: "Interest Earned", tone: "emerald" },
  fee: { label: "Bank / Management Fee", tone: "coral" },
  tax: { label: "Tax Payment", tone: "coral" },
  transfer: { label: "Internal Transfer", tone: "blue" },
  other: { label: "Other", tone: "neutral" },
};

export default function TransactionsClient({ user, focusId = null, newRecord = false }) {
  const [transactions, setTransactions] = useState([]);
  const [assets, setAssets] = useState([]);
  const [liabilities, setLiabilities] = useState([]);
  const [monthlyCashFlow, setMonthlyCashFlow] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDirection, setSelectedDirection] = useState("all");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedEvidence, setSelectedEvidence] = useState("all");

  // Modals & Editing (deep-link ?focus=<id> highlights a row, ?new=1 opens the form)
  const [isModalOpen, setIsModalOpen] = useState(newRecord);
  const [editingTx, setEditingTx] = useState(null);
  const [txToDelete, setTxToDelete] = useState(null);
  const [focusedId, setFocusedId] = useState(focusId);

  // Scroll the focused row into view once data arrives (DOM sync — no state)
  useEffect(() => {
    if (loading || !focusedId) return;
    document.getElementById(`tx-${focusedId}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [loading, focusedId]);

  // Form State
  const [form, setForm] = useState({
    date: new Date().toISOString().split("T")[0],
    description: "",
    amount: "",
    currency: user?.preferredCurrency || "KES",
    direction: "outflow",
    category: "expense",
    evidenceStatus: "missing",
    linkedAssetId: "",
    linkedLiabilityId: "",
    notes: "",
  });

  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  const fetchData = async () => {
    try {
      const [txRes, assetsRes, liabilitiesRes, cashflowRes] = await Promise.all([
        fetch("/api/transactions"),
        fetch("/api/assets"),
        fetch("/api/liabilities"),
        // The monthly series is aggregated server-side — the paginated
        // transaction list above only holds the most recent rows.
        fetch("/api/reports/cashflow?months=12"),
      ]);

      if (txRes.ok) {
        const data = await txRes.json();
        setTransactions(data.transactions || []);
      }
      if (assetsRes.ok) {
        const data = await assetsRes.json();
        setAssets(data.assets || []);
      }
      if (liabilitiesRes.ok) {
        const data = await liabilitiesRes.json();
        setLiabilities(data.liabilities || []);
      }
      if (cashflowRes.ok) {
        const data = await cashflowRes.json();
        setMonthlyCashFlow(data.monthly || []);
      }
    } catch (err) {
      console.error("Error fetching transactions data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Defer so the fetch's setState calls happen after the effect commits
    const t = setTimeout(fetchData, 0);
    return () => clearTimeout(t);
  }, []);

  // Summary Metrics
  const summaries = useMemo(() => {
    const inflows = sumAmounts(
      transactions.filter((t) => t.direction === "inflow").map((t) => t.amount)
    );
    const outflows = sumAmounts(
      transactions.filter((t) => t.direction === "outflow").map((t) => t.amount)
    );
    const netFlow = inflows.minus(outflows);
    const missingEvidence = transactions.filter((t) => t.evidenceStatus === "missing").length;

    return {
      totalInflow: inflows.toFixed(2),
      totalOutflow: outflows.toFixed(2),
      netFlow: netFlow.toFixed(2),
      missingEvidence,
    };
  }, [transactions]);

  // Filtered List
  const filtered = useMemo(() => {
    return transactions.filter((tx) => {
      const matchesSearch =
        (tx.description && tx.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (tx.notes && tx.notes.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesDir = selectedDirection === "all" || tx.direction === selectedDirection;
      const matchesCat = selectedCategory === "all" || tx.category === selectedCategory;
      const matchesEv = selectedEvidence === "all" || tx.evidenceStatus === selectedEvidence;

      return matchesSearch && matchesDir && matchesCat && matchesEv;
    });
  }, [transactions, searchQuery, selectedDirection, selectedCategory, selectedEvidence]);

  const handleSaveTransaction = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setFormError("");

    try {
      const payload = {
        date: new Date(form.date).toISOString(),
        description: form.description,
        amount: form.amount,
        currency: form.currency,
        direction: form.direction,
        category: form.category,
        evidenceStatus: form.evidenceStatus,
        linkedAssetId: form.linkedAssetId || undefined,
        linkedLiabilityId: form.linkedLiabilityId || undefined,
        notes: form.notes || undefined,
      };

      const url = editingTx ? `/api/transactions/${editingTx.id}` : "/api/transactions";
      const method = editingTx ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to save transaction");
      }

      setIsModalOpen(false);
      setEditingTx(null);
      setForm({
        date: new Date().toISOString().split("T")[0],
        description: "",
        amount: "",
        currency: user?.preferredCurrency || "KES",
        direction: "outflow",
        category: "expense",
        evidenceStatus: "missing",
        linkedAssetId: "",
        linkedLiabilityId: "",
        notes: "",
      });
      fetchData();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!txToDelete) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/transactions/${txToDelete.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete transaction");

      setTxToDelete(null);
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
            Transaction Ledger
          </h1>
          <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
            Every movement of wealth with evidence integrity tracking.
          </p>
        </div>

        <Button
          variant="primary"
          icon={Plus}
          onClick={() => {
            setEditingTx(null);
            setForm({
              date: new Date().toISOString().split("T")[0],
              description: "",
              amount: "",
              currency: user?.preferredCurrency || "KES",
              direction: "outflow",
              category: "expense",
              evidenceStatus: "missing",
              linkedAssetId: "",
              linkedLiabilityId: "",
              notes: "",
            });
            setIsModalOpen(true);
          }}
        >
          Record Transaction
        </Button>
      </div>

      {/* ── KPI Cards ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider">
              Total Inflows
            </span>
            <span className="p-2 rounded-full bg-[var(--color-emerald-50)] text-[var(--color-emerald-600)]">
              <ArrowDownLeft className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-3 text-2xl font-bold text-[var(--color-emerald-600)]">
            {formatCurrency(summaries.totalInflow, user?.preferredCurrency || "KES")}
          </div>
          <p className="mt-1 text-xs text-[var(--color-text-tertiary)]">
            Income, dividends, investment sales
          </p>
        </div>

        <div className="p-5 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider">
              Total Outflows
            </span>
            <span className="p-2 rounded-full bg-[var(--color-coral-50)] text-[var(--color-coral-600)]">
              <ArrowUpRight className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-3 text-2xl font-bold text-[var(--color-text-primary)]">
            {formatCurrency(summaries.totalOutflow, user?.preferredCurrency || "KES")}
          </div>
          <p className="mt-1 text-xs text-[var(--color-text-tertiary)]">
            Expenses, loan repayments, capital purchases
          </p>
        </div>

        <div className="p-5 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider">
              Net Cash Movement
            </span>
            <span className="p-2 rounded-full bg-[var(--color-surface-2)] text-[var(--color-text-primary)]">
              <ArrowLeftRight className="w-4 h-4" />
            </span>
          </div>
          <div
            className={`mt-3 text-2xl font-bold ${
              Number(summaries.netFlow) >= 0
                ? "text-[var(--color-emerald-600)]"
                : "text-[var(--color-coral-600)]"
            }`}
          >
            {formatCurrency(summaries.netFlow, user?.preferredCurrency || "KES")}
          </div>
          <p className="mt-1 text-xs text-[var(--color-text-tertiary)]">
            Inflows minus outflows in period
          </p>
        </div>

        <div className="p-5 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider">
              Missing Evidence
            </span>
            <span
              className={`p-2 rounded-full ${
                summaries.missingEvidence > 0
                  ? "bg-[var(--color-gold-50)] text-[var(--color-gold-700)]"
                  : "bg-[var(--color-emerald-50)] text-[var(--color-emerald-600)]"
              }`}
            >
              <ShieldAlert className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-3 text-2xl font-bold text-[var(--color-text-primary)]">
            {summaries.missingEvidence} Transactions
          </div>
          <p className="mt-1 text-xs text-[var(--color-text-tertiary)]">
            {summaries.missingEvidence > 0
              ? "Awaiting receipt or statement proof"
              : "All transactions have supporting docs"}
          </p>
        </div>
      </div>

      {/* ── Transaction flow chart ──────────────────────────────────────── */}
      <TransactionFlowChart
        currency={user?.preferredCurrency || "KES"}
        monthly={monthlyCashFlow}
        loading={loading}
      />

      {/* ── Filter Toolbar ──────────────────────────────────────────────── */}
      <div className="p-4 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] flex flex-wrap items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-3 flex-1 min-w-[240px]">
          <div className="relative w-full max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-tertiary)]" />
            <input
              type="text"
              placeholder="Search description, payee, notes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-[var(--radius-md)] pl-9 pr-3 py-1.5 text-xs text-[var(--color-text-primary)] placeholder-[var(--color-text-tertiary)] focus:outline-none focus:border-[var(--color-emerald-500)]"
            />
          </div>

          <Dropdown
            value={selectedDirection}
            onChange={setSelectedDirection}
            options={[
              { value: "all", label: "All Directions" },
              { value: "inflow", label: "Inflow (+)" },
              { value: "outflow", label: "Outflow (-)" },
              { value: "transfer", label: "Transfer" },
            ]}
            size="sm"
          />

          <Dropdown
            value={selectedCategory}
            onChange={setSelectedCategory}
            options={[
              { value: "all", label: "All Categories" },
              ...Object.entries(categoryLabels).map(([key, val]) => ({ value: key, label: val.label })),
            ]}
            size="sm"
          />

          <Dropdown
            value={selectedEvidence}
            onChange={setSelectedEvidence}
            options={[
              { value: "all", label: "All Evidence" },
              { value: "supported", label: "Supported" },
              { value: "missing", label: "Missing" },
              { value: "pending_review", label: "Pending Review" },
            ]}
            size="sm"
          />
        </div>

        <div className="text-xs text-[var(--color-text-tertiary)] font-medium">
          Showing {filtered.length} of {transactions.length} records
        </div>
      </div>

      {/* ── Ledger Table ────────────────────────────────────────────────── */}
      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="p-4 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] flex items-center justify-between"
            >
              <div className="flex items-center gap-3 w-1/3">
                <SkeletonLoader className="w-8 h-8 rounded-full" />
                <SkeletonLoader className="h-4 w-3/4" />
              </div>
              <SkeletonLoader className="h-4 w-24" />
              <SkeletonLoader className="h-4 w-24" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Layers}
          title={searchQuery ? "No matching transactions" : "No transactions recorded yet"}
          description={
            searchQuery
              ? "Try adjusting your filters or search terms."
              : "Record your income, investments, loan payments, and expenses to track cash flow."
          }
          action={{
            label: "Record First Transaction",
            onClick: () => {
              setEditingTx(null);
              setIsModalOpen(true);
            },
          }}
        />
      ) : (
        <div className="overflow-x-auto rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-xs">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-[var(--color-border)] bg-[var(--color-surface-2)] text-[var(--color-text-secondary)] uppercase tracking-wider font-semibold">
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Description</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Evidence</th>
                <th className="py-3 px-4">Linked Entity</th>
                <th className="py-3 px-4 text-right">Amount</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)]">
              {filtered.map((tx) => {
                const cat = categoryLabels[tx.category] || categoryLabels.other;
                const isInflow = tx.direction === "inflow";
                const isTransfer = tx.direction === "transfer";

                return (
                  <tr
                    key={tx.id}
                    id={`tx-${tx.id}`}
                    className={`transition-colors group ${
                      focusedId === tx.id
                        ? "bg-[var(--color-emerald-50)]"
                        : "hover:bg-[var(--color-surface-2)]"
                    }`}
                  >
                    {/* Date */}
                    <td className="py-3.5 px-4 font-medium text-[var(--color-text-secondary)] whitespace-nowrap">
                      {new Date(tx.date).toLocaleDateString("en-KE", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </td>

                    {/* Description */}
                    <td className="py-3.5 px-4 font-semibold text-[var(--color-text-primary)]">
                      <div className="flex items-center gap-2">
                        <span
                          className={`p-1.5 rounded-full shrink-0 ${
                            isInflow
                              ? "bg-[var(--color-emerald-50)] text-[var(--color-emerald-600)]"
                              : isTransfer
                              ? "bg-sky-50 text-sky-600"
                              : "bg-[var(--color-surface-2)] text-[var(--color-text-secondary)]"
                          }`}
                        >
                          {isInflow ? (
                            <ArrowDownLeft className="w-3.5 h-3.5" />
                          ) : isTransfer ? (
                            <ArrowLeftRight className="w-3.5 h-3.5" />
                          ) : (
                            <ArrowUpRight className="w-3.5 h-3.5" />
                          )}
                        </span>
                        <div>
                          <div>{tx.description}</div>
                          {tx.notes && (
                            <div className="text-[11px] text-[var(--color-text-tertiary)] font-normal line-clamp-1">
                              {tx.notes}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Category */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <Badge tone={cat.tone} size="sm">
                        {cat.label}
                      </Badge>
                    </td>

                    {/* Evidence Status */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {tx.evidenceStatus === "supported" ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[var(--color-emerald-700)]">
                          <ShieldCheck className="w-3.5 h-3.5" />
                          Supported
                        </span>
                      ) : tx.evidenceStatus === "pending_review" ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-purple-700">
                          <Clock className="w-3.5 h-3.5" />
                          Under Review
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[var(--color-gold-700)]">
                          <ShieldAlert className="w-3.5 h-3.5" />
                          Missing Evidence
                        </span>
                      )}
                    </td>

                    {/* Linked Entity */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {tx.linkedAssetId ? (
                        <span className="inline-flex items-center gap-1 text-[11px] text-[var(--color-text-secondary)] bg-[var(--color-surface-2)] px-2 py-0.5 rounded-[var(--radius-sm)]">
                          <Building2 className="w-3 h-3 text-[var(--color-emerald-600)]" />
                          Asset
                        </span>
                      ) : tx.linkedLiabilityId ? (
                        <span className="inline-flex items-center gap-1 text-[11px] text-[var(--color-text-secondary)] bg-[var(--color-surface-2)] px-2 py-0.5 rounded-[var(--radius-sm)]">
                          <Landmark className="w-3 h-3 text-[var(--color-coral-600)]" />
                          Liability
                        </span>
                      ) : (
                        <span className="text-[var(--color-text-tertiary)]">—</span>
                      )}
                    </td>

                    {/* Amount */}
                    <td
                      className={`py-3.5 px-4 text-right font-bold whitespace-nowrap ${
                        isInflow
                          ? "text-[var(--color-emerald-600)]"
                          : "text-[var(--color-text-primary)]"
                      }`}
                    >
                      {isInflow ? "+" : "-"}
                      {formatCurrency(tx.amount, tx.currency || user?.preferredCurrency || "KES")}
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingTx(tx);
                            setForm({
                              date: new Date(tx.date).toISOString().split("T")[0],
                              description: tx.description,
                              amount: tx.amount,
                              currency: tx.currency || user?.preferredCurrency || "KES",
                              direction: tx.direction,
                              category: tx.category,
                              evidenceStatus: tx.evidenceStatus,
                              linkedAssetId: tx.linkedAssetId || "",
                              linkedLiabilityId: tx.linkedLiabilityId || "",
                              notes: tx.notes || "",
                            });
                            setIsModalOpen(true);
                          }}
                          className="p-1 rounded-[var(--radius-sm)] text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-3)] cursor-pointer"
                          title="Edit"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={() => setTxToDelete(tx)}
                          className="p-1 rounded-[var(--radius-sm)] text-[var(--color-text-tertiary)] hover:text-[var(--color-coral-600)] hover:bg-[var(--color-coral-50)] cursor-pointer"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Add / Edit Transaction Modal ─────────────────────────────────── */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingTx ? "Edit Transaction" : "Record Transaction"}
        description="Every transaction connects to your overall financial integrity model."
      >
        <form onSubmit={handleSaveTransaction} className="space-y-4">
          {formError && (
            <div className="p-3 rounded-[var(--radius-md)] bg-[var(--color-coral-50)] border border-[var(--color-coral-300)] text-xs text-[var(--color-coral-700)] flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Transaction Date"
              type="date"
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
              required
            />

            <Select
              label="Flow Direction"
              value={form.direction}
              onChange={(e) => setForm({ ...form, direction: e.target.value })}
            >
              <option value="outflow">Outflow (Money Spent)</option>
              <option value="inflow">Inflow (Money Received)</option>
              <option value="transfer">Internal Transfer</option>
            </Select>
          </div>

          <Input
            label="Description / Payee"
            placeholder="e.g. Salary Credit, Land Title Survey Fee, Rent"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            required
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Amount"
              placeholder="0.00"
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
              type="number"
              step="0.01"
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
            <Select
              label="Category"
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
            >
              {Object.entries(categoryLabels).map(([key, val]) => (
                <option key={key} value={key}>
                  {val.label}
                </option>
              ))}
            </Select>

            <Select
              label="Supporting Evidence"
              value={form.evidenceStatus}
              onChange={(e) => setForm({ ...form, evidenceStatus: e.target.value })}
            >
              <option value="missing">Missing Evidence (Flagged)</option>
              <option value="supported">Supported by Document</option>
              <option value="pending_review">Pending Review</option>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Link to Asset (Optional)"
              value={form.linkedAssetId}
              onChange={(e) => setForm({ ...form, linkedAssetId: e.target.value })}
            >
              <option value="">None</option>
              {assets.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name} ({a.category})
                </option>
              ))}
            </Select>

            <Select
              label="Link to Liability (Optional)"
              value={form.linkedLiabilityId}
              onChange={(e) => setForm({ ...form, linkedLiabilityId: e.target.value })}
            >
              <option value="">None</option>
              {liabilities.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </Select>
          </div>

          <Input
            label="Notes / Reference Code"
            placeholder="e.g. M-Pesa ref QK47910, Bank Statement Line 44"
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
          />

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[var(--color-border)]">
            <Button variant="ghost" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" loading={submitting}>
              {editingTx ? "Save Changes" : "Record Transaction"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* ── Confirm Delete Modal ────────────────────────────────────────── */}
      <Modal
        isOpen={Boolean(txToDelete)}
        onClose={() => setTxToDelete(null)}
        title="Delete Transaction"
        description="Are you sure you want to delete this transaction record?"
      >
        <div className="space-y-4">
          <p className="text-sm text-[var(--color-text-secondary)]">
            You are about to delete{" "}
            <strong className="text-[var(--color-text-primary)]">{txToDelete?.description}</strong>{" "}
            ({formatCurrency(txToDelete?.amount, txToDelete?.currency)}).
          </p>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[var(--color-border)]">
            <Button variant="ghost" onClick={() => setTxToDelete(null)}>
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
