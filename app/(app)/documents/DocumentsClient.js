"use client";
// app/(app)/documents/DocumentsClient.js
// Document Intelligence library & Review Studio with approval gate.

import { useState, useEffect, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  UploadCloud,
  FileText,
  ShieldCheck,
  Clock,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Building2,
  Landmark,
  ArrowRight,
  Eye,
  Trash2,
  Download,
  Search,
  Filter,
  FileSpreadsheet,
  FileCheck,
  ExternalLink,
  FileSearch,
  Plus,
  X,
  GitCompare,
  ScrollText,
} from "lucide-react";
import { formatCurrency } from "@/lib/finance/currency";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Badge from "@/components/ui/Badge";
import Modal from "@/components/ui/Modal";
import Tabs from "@/components/ui/Tabs";
import EmptyState from "@/components/ui/EmptyState";
import SkeletonLoader from "@/components/ui/SkeletonLoader";

const DOCUMENT_TYPE_LABELS = {
  bank_statement: "Bank Statement",
  property_deed: "Title Deed",
  share_certificate: "Share Certificate",
  loan_agreement: "Loan Agreement",
  tax_return: "Tax Return",
  insurance_policy: "Insurance Policy",
  valuation_report: "Valuation Report",
  investment_statement: "Investment Statement",
  dividend_statement: "Dividend Statement",
  nse_contract_note: "NSE Contract Note",
  receipt: "Receipt",
  invoice: "Invoice",
  contract: "Contract",
  identity_document: "Identity Document",
  other: "Other",
};

const FIELD_LABELS = {
  name: "Record name",
  date: "Document date",
  totalAmount: "Total amount",
  amount: "Total amount",
  subtotal: "Subtotal",
  taxAmount: "Tax",
  feesAmount: "Fees",
  currency: "Currency",
  counterparty: "Counterparty",
  category: "Category",
  lineItems: "Transaction details",
  "lineItems.amount": "Line item amounts",
  accountNumber: "Account number",
  closingBalance: "Closing balance",
  reference: "Reference",
};

function fieldLabel(field) {
  if (!field) return "Field";
  if (FIELD_LABELS[field]) return FIELD_LABELS[field];
  return String(field)
    .replace(/[._]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function safeCurrency(value, fallback = "KES") {
  if (!value) return fallback;
  return /^[A-Z]{3}$/.test(value) ? value : fallback;
}

export default function DocumentsClient({ user, focusId = null, newRecord = false }) {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  // Deep-link ?focus=<id> switches to the "all" tab and highlights the document
  const [activeTab, setActiveTab] = useState(focusId ? "all" : "awaiting_review");
  const [searchQuery, setSearchQuery] = useState("");

  // Upload modal state (deep-link ?new=1 opens the upload dialog)
  const [isUploadOpen, setIsUploadOpen] = useState(newRecord);
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadNotes, setUploadNotes] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const fileInputRef = useRef(null);

  // Review Studio modal state
  const [reviewingDoc, setReviewingDoc] = useState(null);
  const [reviewForm, setReviewForm] = useState({
    entityType: "asset",
    name: "",
    amount: "",
    currency: "KES",
    date: new Date().toISOString().split("T")[0],
    category: "",
    counterparty: "",
    description: "",
    lineItems: [],
  });
  const [approving, setApproving] = useState(false);
  const [reviewError, setReviewError] = useState("");
  const [successBanner, setSuccessBanner] = useState("");
  const [retryingId, setRetryingId] = useState(null);

  // Delete state
  const [docToDelete, setDocToDelete] = useState(null);
  const [focusedId, setFocusedId] = useState(focusId);

  const fetchData = async () => {
    try {
      const res = await fetch("/api/documents");
      if (res.ok) {
        const data = await res.json();
        setDocuments(data.documents || []);
      }
    } catch (err) {
      console.error("Error fetching documents:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Defer so the fetch's setState calls happen after the effect commits
    const t = setTimeout(fetchData, 0);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (loading || !focusedId) return;
    document.getElementById(`doc-${focusedId}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [loading, focusedId]);

  // Summary Metrics
  const summaries = useMemo(() => {
    const awaiting = documents.filter((d) => d.processingStatus === "awaiting_review").length;
    const approved = documents.filter((d) => d.processingStatus === "approved").length;
    const total = documents.length;

    return { awaiting, approved, total };
  }, [documents]);

  const reviewProposal = reviewingDoc?.extractionResult?.proposedFields || {};
  const reviewConflicts = reviewProposal.conflicts || [];
  const reviewMissing = reviewProposal.missingFields || [];
  const reviewAmbiguous = reviewProposal.ambiguousFields || [];
  const reviewEvidence = reviewProposal.fieldEvidence || [];
  const reviewComputed = reviewProposal.computed || {};
  const reviewConfidence =
    reviewingDoc?.extractionResult?.confidence ??
    reviewProposal.confidence ??
    null;

  // Filtered documents
  const filtered = useMemo(() => {
    return documents.filter((doc) => {
      const matchesSearch =
        doc.filename.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (doc.notes && doc.notes.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (doc.extractionResult?.proposedFields?.name &&
          doc.extractionResult.proposedFields.name
            .toLowerCase()
            .includes(searchQuery.toLowerCase()));

      let matchesTab = true;
      if (activeTab === "awaiting_review") {
        matchesTab = doc.processingStatus === "awaiting_review";
      } else if (activeTab === "approved") {
        matchesTab = doc.processingStatus === "approved";
      }

      return matchesSearch && matchesTab;
    });
  }, [documents, searchQuery, activeTab]);

  // Handle Upload
  const handleUpload = async (e) => {
    e.preventDefault();
    if (!uploadFile) {
      setUploadError("Please choose a file to upload.");
      return;
    }

    setUploading(true);
    setUploadError("");

    try {
      const formData = new FormData();
      formData.append("file", uploadFile);
      if (uploadNotes) formData.append("notes", uploadNotes);

      const res = await fetch("/api/documents", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to upload document");
      }

      setIsUploadOpen(false);
      setUploadFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      setUploadNotes("");
      setSuccessBanner("Document uploaded! AI extraction completed and awaiting your review.");
      setTimeout(() => setSuccessBanner(""), 6000);
      fetchData();
    } catch (err) {
      setUploadError(err.message);
    } finally {
      setUploading(false);
    }
  };

  // Open Review Studio
  const openReviewStudio = (doc) => {
    setReviewingDoc(doc);
    const prop = doc.extractionResult?.proposedFields || {};
    const lineItems = (prop.lineItems || []).map((item) => ({
      date: item.date || prop.date || new Date().toISOString().split("T")[0],
      description: item.description || "",
      amount: item.amount || "",
      currency: item.currency || prop.currency || user?.preferredCurrency || "KES",
      direction: item.direction || "unknown",
      category: item.category || "",
      reference: item.reference || "",
    }));

    setReviewForm({
      entityType:
        prop.proposedEntityType && prop.proposedEntityType !== "none"
          ? prop.proposedEntityType
          : lineItems.length > 0
          ? "transaction"
          : "asset",
      name: prop.name || doc.filename.replace(/\.[^/.]+$/, ""),
      amount: prop.totalAmount || prop.amount || (lineItems.length === 0 ? "" : ""),
      currency: prop.currency || user?.preferredCurrency || "KES",
      date: prop.date || new Date().toISOString().split("T")[0],
      category: prop.category || "",
      counterparty: prop.counterparty || "",
      description: prop.summary || "",
      lineItems,
    });
    setReviewError("");
  };

  // Handle Approve & Commit
  const handleApprove = async () => {
    if (!reviewingDoc) return;

    const lineItems =
      reviewForm.entityType === "transaction"
        ? (reviewForm.lineItems || []).filter(
            (item) => item.amount || item.description || item.reference
          )
        : [];

    if (reviewForm.entityType === "transaction" && lineItems.length > 0) {
      const missingAmount = lineItems.find((item) => !item.amount);
      if (missingAmount) {
        setReviewError("Every transaction line needs an amount before it can be approved.");
        return;
      }
    } else if (!reviewForm.amount) {
      setReviewError("Enter the amount you want to commit to your records.");
      return;
    }

    setApproving(true);
    setReviewError("");

    try {
      const submittedLineItems = lineItems.map((item) => ({
        date: item.date || reviewForm.date,
        description: item.description || reviewForm.name,
        amount: item.amount,
        currency: item.currency || reviewForm.currency,
        direction: item.direction || "unknown",
        category: item.category || undefined,
        reference: item.reference || undefined,
      }));

      const res = await fetch(`/api/documents/${reviewingDoc.id}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entityType: reviewForm.entityType,
          data: {
            ...reviewForm,
            lineItems:
              reviewForm.entityType === "transaction" && submittedLineItems.length > 0
                ? submittedLineItems
                : undefined,
          },
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to approve document extraction");
      }

      const result = await res.json();
      const approvedCount = result.createdEntity?.count || 1;
      setReviewingDoc(null);
      setSuccessBanner(
        approvedCount > 1
          ? `${approvedCount} official transactions approved and linked to the source document.`
          : `Record approved and committed as official ${reviewForm.entityType}! Linked to document.`
      );
      setTimeout(() => setSuccessBanner(""), 6000);
      fetchData();
    } catch (err) {
      setReviewError(err.message);
    } finally {
      setApproving(false);
    }
  };

  const handleRetryExtraction = async (doc) => {
    setRetryingId(doc.id);
    setSuccessBanner("");
    try {
      const res = await fetch(`/api/documents/${doc.id}/extract`, { method: "POST" });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to re-run extraction");
      }
      await fetchData();
      setSuccessBanner(`Extraction re-run for "${doc.filename}". Review the updated proposal.`);
      setTimeout(() => setSuccessBanner(""), 6000);
    } catch (err) {
      alert(err.message);
    } finally {
      setRetryingId(null);
    }
  };

  // Handle Delete
  const handleDelete = async () => {
    if (!docToDelete) return;
    try {
      const res = await fetch(`/api/documents/${docToDelete.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete document");
      setDocToDelete(null);
      fetchData();
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-screen-2xl mx-auto">
      {/* ── Notification Banner ─────────────────────────────────────────── */}
      <AnimatePresence>
        {successBanner && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-4 rounded-[var(--radius-lg)] bg-[var(--color-emerald-50)] border border-[var(--color-emerald-200)] text-sm text-[var(--color-emerald-700)] flex items-center gap-2 shadow-xs"
          >
            <CheckCircle2 className="w-5 h-5 shrink-0" />
            <span>{successBanner}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Top Header ──────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--color-text-primary)]">
            Document Intelligence & Review
          </h1>
          <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
            Audit trail of statements, deeds, receipts, and titles with human-in-the-loop approval.
          </p>
        </div>

        <Button
          variant="primary"
          icon={UploadCloud}
          onClick={() => {
            setUploadFile(null);
            setUploadNotes("");
            setUploadError("");
            if (fileInputRef.current) fileInputRef.current.value = "";
            setIsUploadOpen(true);
          }}
        >
          Upload Document
        </Button>
      </div>

      {/* ── KPI Cards ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider">
              Awaiting Review
            </span>
            <span
              className={`p-2 rounded-full ${
                summaries.awaiting > 0
                  ? "bg-[var(--color-gold-50)] text-[var(--color-gold-700)]"
                  : "bg-[var(--color-surface-2)] text-[var(--color-text-tertiary)]"
              }`}
            >
              <Clock className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-3 text-2xl font-bold text-[var(--color-text-primary)]">
            {summaries.awaiting} Documents
          </div>
          <p className="mt-1 text-xs text-[var(--color-text-tertiary)]">
            Extracted data awaiting your approval
          </p>
        </div>

        <div className="p-5 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider">
              Approved Records
            </span>
            <span className="p-2 rounded-full bg-[var(--color-emerald-50)] text-[var(--color-emerald-600)]">
              <ShieldCheck className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-3 text-2xl font-bold text-[var(--color-emerald-600)]">
            {summaries.approved} Verified
          </div>
          <p className="mt-1 text-xs text-[var(--color-text-tertiary)]">
            Official linked evidence documents
          </p>
        </div>

        <div className="p-5 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider">
              Total Storage Vault
            </span>
            <span className="p-2 rounded-full bg-[var(--color-surface-2)] text-[var(--color-text-secondary)]">
              <FileText className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-3 text-2xl font-bold text-[var(--color-text-primary)]">
            {summaries.total} Files
          </div>
          <p className="mt-1 text-xs text-[var(--color-text-tertiary)]">
            Private, encrypted storage
          </p>
        </div>
      </div>

      {/* ── Tabs & Search ───────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <Tabs
          tabs={[
            { id: "awaiting_review", label: "Awaiting Review", count: summaries.awaiting },
            { id: "all", label: "All Documents", count: summaries.total },
            { id: "approved", label: "Approved Evidence", count: summaries.approved },
          ]}
          activeTab={activeTab}
          onChange={setActiveTab}
        />

        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-tertiary)]" />
          <input
            type="text"
            placeholder="Search documents or tags..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[var(--radius-md)] pl-9 pr-3 py-1.5 text-xs text-[var(--color-text-primary)] placeholder-[var(--color-text-tertiary)] focus:outline-none focus:border-[var(--color-emerald-500)]"
          />
        </div>
      </div>

      {/* ── Documents Grid ──────────────────────────────────────────────── */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
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
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={FileCheck}
          title={
            activeTab === "awaiting_review"
              ? "All clear! No documents pending review"
              : "No documents found"
          }
          description={
            activeTab === "awaiting_review"
              ? "Every uploaded document has been reviewed and committed to your official financial records."
              : "Upload bank statements, title deeds, share certificates, or valuation reports to begin."
          }
          action={{
            label: "Upload Document",
            onClick: () => setIsUploadOpen(true),
          }}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((doc) => {
            const isAwaiting = doc.processingStatus === "awaiting_review";
            const prop = doc.extractionResult?.proposedFields;
            const rawConfidence = doc.extractionResult?.confidence ?? prop?.confidence;
            const confidence =
              rawConfidence === null || rawConfidence === undefined
                ? null
                : Math.round(rawConfidence * 100);
            const missingCount = prop?.missingFields?.length || 0;
            const conflictCount = prop?.conflicts?.length || 0;
            const lineItemCount = prop?.computed?.lineItemCount || prop?.lineItems?.length || 0;

            return (
              <div
                key={doc.id}
                id={`doc-${doc.id}`}
                className={`relative flex flex-col justify-between p-5 rounded-[var(--radius-lg)] border transition-all ${
                  focusedId === doc.id
                    ? "border-[var(--color-emerald-400)] ring-2 ring-[var(--color-emerald-400)]/40 bg-[var(--color-surface)]"
                    : isAwaiting
                    ? "border-[var(--color-gold-300)] bg-[var(--color-gold-50)]/30 shadow-xs"
                    : "border-[var(--color-border)] bg-[var(--color-surface)] hover:border-[var(--color-border-strong)]"
                }`}
              >
                <div>
                  {/* File title & status */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <span
                        className={`p-2 rounded-[var(--radius-md)] ${
                          isAwaiting
                            ? "bg-[var(--color-gold-100)] text-[var(--color-gold-700)]"
                            : "bg-[var(--color-emerald-50)] text-[var(--color-emerald-600)]"
                        }`}
                      >
                        <FileText className="w-4 h-4" />
                      </span>
                      <div>
                        <h3 className="text-sm font-semibold text-[var(--color-text-primary)] line-clamp-1">
                          {doc.filename}
                        </h3>
                        <p className="text-[11px] text-[var(--color-text-tertiary)]">
                          {new Date(doc.uploadedAt).toLocaleDateString()} •{" "}
                          {(doc.fileSize / 1024).toFixed(1)} KB
                        </p>
                      </div>
                    </div>

                    <Badge
                      tone={
                        isAwaiting
                          ? "gold"
                          : doc.processingStatus === "extraction_failed"
                          ? "coral"
                          : "emerald"
                      }
                      dot
                      size="sm"
                    >
                      {isAwaiting
                        ? "Awaiting Review"
                        : doc.processingStatus === "extraction_failed"
                        ? "Extraction Failed"
                        : "Approved"}
                    </Badge>
                  </div>

                  {/* Extraction proposal preview */}
                  {prop && (
                    <div className="mt-4 p-3 rounded-[var(--radius-md)] bg-[var(--color-surface)] border border-[var(--color-border)]">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider">
                          AI Proposal
                          {confidence === null ? "" : ` (${confidence}%)`}
                        </span>
                        <span className="capitalize font-medium text-[var(--color-emerald-700)]">
                          {prop.proposedEntityType || "Record"}
                        </span>
                      </div>

                      <div className="mt-1 flex items-center gap-1.5 text-[11px] text-[var(--color-text-tertiary)]">
                        <FileSearch className="w-3 h-3" />
                        {DOCUMENT_TYPE_LABELS[doc.documentType || prop.documentType] || "Other"}
                        {lineItemCount > 0 && <span>• {lineItemCount} line items</span>}
                        {prop.source?.pageCount && <span>• {prop.source.pageCount} pages</span>}
                      </div>

                      <div className="mt-1 text-sm font-bold text-[var(--color-text-primary)] line-clamp-1">
                        {prop.name || doc.filename}
                      </div>

                      <div className="mt-1 text-base font-bold text-[var(--color-text-primary)]">
                        {prop.totalAmount || prop.amount
                          ? formatCurrency(prop.totalAmount || prop.amount, safeCurrency(prop.currency))
                          : "Amount not found"}
                      </div>

                      {(conflictCount > 0 || missingCount > 0) && (
                        <div className="mt-2 space-y-1">
                          {conflictCount > 0 && (
                            <p className="text-[11px] font-medium text-[var(--color-negative)] flex items-center gap-1">
                              <GitCompare className="w-3 h-3" />
                              {conflictCount} conflicting value{conflictCount === 1 ? "" : "s"}
                            </p>
                          )}
                          {missingCount > 0 && (
                            <p className="text-[11px] font-medium text-[var(--color-gold-700)] flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3" />
                              {missingCount} missing information flag{missingCount === 1 ? "" : "s"}
                            </p>
                          )}
                        </div>
                      )}

                      {prop.summary && (
                        <p className="mt-1 text-[11px] text-[var(--color-text-secondary)] line-clamp-2">
                          {prop.summary}
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* Footer action buttons */}
                <div className="mt-5 pt-3 border-t border-[var(--color-border)] flex items-center justify-between">
                  {isAwaiting ? (
                    <Button
                      variant="primary"
                      size="sm"
                      icon={Sparkles}
                      onClick={() => openReviewStudio(doc)}
                    >
                      Review & Approve
                    </Button>
                  ) : doc.processingStatus === "extraction_failed" ? (
                    <Button
                      variant="outline"
                      size="sm"
                      icon={FileSearch}
                      loading={retryingId === doc.id}
                      onClick={() => handleRetryExtraction(doc)}
                    >
                      Retry Extraction
                    </Button>
                  ) : (
                    <span className="text-[11px] font-semibold text-[var(--color-emerald-700)] flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      Committed to Records
                    </span>
                  )}

                  <div className="flex items-center gap-1">
                    <a
                      href={`/api/documents/${doc.id}/file`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 rounded-[var(--radius-sm)] text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-2)] cursor-pointer"
                      title="Open / Download Original File"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </a>

                    <button
                      type="button"
                      onClick={() => setDocToDelete(doc)}
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

      {/* ── Upload Document Modal ────────────────────────────────────────── */}
      <Modal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        title="Upload Financial Document"
        description="Bank statements, property deeds, receipts, share certificates, or valuation reports."
      >
        <form onSubmit={handleUpload} className="space-y-4">
          {uploadError && (
            <div className="p-3 rounded-[var(--radius-md)] bg-[var(--color-coral-50)] border border-[var(--color-coral-300)] text-xs text-[var(--color-coral-700)] flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{uploadError}</span>
            </div>
          )}

          {/* Drag & drop upload target */}
          <div
            onClick={() => fileInputRef.current?.click()}
            className="p-8 border-2 border-dashed border-[var(--color-border-strong)] hover:border-[var(--color-emerald-500)] rounded-[var(--radius-lg)] bg-[var(--color-surface-2)] flex flex-col items-center justify-center text-center cursor-pointer transition-colors"
          >
            <UploadCloud className="w-8 h-8 text-[var(--color-emerald-600)] mb-2" />
            <p className="text-sm font-semibold text-[var(--color-text-primary)]">
              {uploadFile ? uploadFile.name : "Click to select a document"}
            </p>
            <p className="text-xs text-[var(--color-text-tertiary)] mt-1">
              Supports PDF, PNG, JPG and WebP up to 50MB
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.png,.jpg,.jpeg,.webp,application/pdf,image/png,image/jpeg,image/webp"
              onChange={(e) => {
                if (e.target.files?.[0]) setUploadFile(e.target.files[0]);
              }}
              className="hidden"
            />
          </div>

          <Input
            label="Optional Context / Notes"
            placeholder="e.g. Title deed for Westlands land purchase, March bank statement..."
            value={uploadNotes}
            onChange={(e) => setUploadNotes(e.target.value)}
          />

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[var(--color-border)]">
            <Button variant="ghost" onClick={() => setIsUploadOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" loading={uploading}>
              Upload & Extract Data
            </Button>
          </div>
        </form>
      </Modal>

      {/* ── Document Review Studio Modal ─────────────────────────────────── */}
      <Modal
        isOpen={Boolean(reviewingDoc)}
        onClose={() => setReviewingDoc(null)}
        title="Document Review Studio"
        description="Verify and adjust AI-extracted data before it becomes an official financial record."
        maxWidth="max-w-2xl"
      >
        <div className="space-y-5">
          {reviewError && (
            <div className="p-3 rounded-[var(--radius-md)] bg-[var(--color-coral-50)] border border-[var(--color-coral-300)] text-xs text-[var(--color-coral-700)] flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{reviewError}</span>
            </div>
          )}

          {/* Document metadata banner */}
          <div className="flex items-center justify-between p-3.5 rounded-[var(--radius-md)] bg-[var(--color-surface-2)] border border-[var(--color-border)]">
            <div className="flex items-center gap-2.5">
              <FileText className="w-5 h-5 text-[var(--color-emerald-600)] shrink-0" />
              <div>
                <p className="text-xs font-semibold text-[var(--color-text-primary)]">
                  {reviewingDoc?.filename}
                </p>
                <p className="text-[11px] text-[var(--color-text-tertiary)]">
                  {DOCUMENT_TYPE_LABELS[reviewingDoc?.documentType || reviewProposal.documentType] ||
                    "Document"}{" "}
                  • {reviewConfidence === null ? "confidence unknown" : `${Math.round(reviewConfidence * 100)}% confidence`}
                  {" "}• {reviewingDoc?.extractionResult?.modelUsed || "AI Engine"}
                </p>
              </div>
            </div>

            <a
              href={`/api/documents/${reviewingDoc?.id}/file`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-semibold text-[var(--color-emerald-700)] hover:underline flex items-center gap-1"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              View File
            </a>
          </div>

          {reviewProposal.source?.warning && (
            <div className="p-3 rounded-[var(--radius-md)] bg-[var(--color-gold-50)] border border-[var(--color-gold-300)] text-xs text-[var(--color-gold-700)] flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{reviewProposal.source.warning}</span>
            </div>
          )}

          {reviewConflicts.length > 0 && (
            <div className="p-3 rounded-[var(--radius-md)] bg-[var(--color-coral-50)] border border-[var(--color-coral-300)] space-y-2">
              <p className="text-xs font-semibold text-[var(--color-coral-700)] flex items-center gap-1.5">
                <GitCompare className="w-4 h-4" />
                Conflicting values need your decision
              </p>
              {reviewConflicts.map((conflict, index) => (
                <div key={`${conflict.field}-${index}`} className="text-xs text-[var(--color-coral-700)]">
                  <span className="font-semibold">{fieldLabel(conflict.field)}:</span> {conflict.message}
                  {conflict.values?.length > 0 && (
                    <span className="block text-[11px] opacity-80">Values: {conflict.values.join(" / ")}</span>
                  )}
                </div>
              ))}
            </div>
          )}

          {reviewMissing.length > 0 && (
            <div className="p-3 rounded-[var(--radius-md)] bg-[var(--color-gold-50)] border border-[var(--color-gold-300)] space-y-1.5">
              <p className="text-xs font-semibold text-[var(--color-gold-700)] flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4" />
                Missing information
              </p>
              {reviewMissing.map((item, index) => (
                <p key={`${item.field}-${index}`} className="text-xs text-[var(--color-gold-700)]">
                  <span className="font-semibold">{item.label || fieldLabel(item.field)}:</span>{" "}
                  {item.reason}
                  {item.importance === "critical" && (
                    <span className="ml-1.5 text-[10px] font-bold uppercase">Required</span>
                  )}
                </p>
              ))}
            </div>
          )}

          {reviewAmbiguous.length > 0 && reviewConflicts.length === 0 && (
            <div className="p-3 rounded-[var(--radius-md)] bg-sky-50 border border-sky-200 space-y-1">
              <p className="text-xs font-semibold text-sky-700">Values the AI is unsure about</p>
              {reviewAmbiguous.map((item, index) => (
                <p key={`${item.field}-${index}`} className="text-xs text-sky-700">
                  {item.label || fieldLabel(item.field)}
                </p>
              ))}
            </div>
          )}

          {reviewComputed.lineItemCount > 0 && reviewComputed.reconciles !== null && (
            <div
              className={`p-3 rounded-[var(--radius-md)] border text-xs flex items-center gap-2 ${
                reviewComputed.reconciles
                  ? "bg-[var(--color-emerald-50)] border-[var(--color-emerald-200)] text-[var(--color-emerald-700)]"
                  : "bg-[var(--color-coral-50)] border-[var(--color-coral-300)] text-[var(--color-coral-700)]"
              }`}
            >
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              {reviewComputed.reconciles
                ? `The ${reviewComputed.lineItemCount} transaction lines add up to the stated total.`
                : "The transaction lines do not reconcile with the stated totals."}
              {reviewComputed.lineItemsTotal && (
                <span className="ml-auto font-semibold">
                  Lines: {formatCurrency(reviewComputed.lineItemsTotal, safeCurrency(reviewProposal.currency))}
                </span>
              )}
            </div>
          )}

          {/* Entity Type Picker */}
          <div>
            <label className="text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider block mb-2">
              Target Entity Type
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: "asset", label: "Asset Holding", icon: Building2 },
                { id: "liability", label: "Liability / Debt", icon: Landmark },
                { id: "transaction", label: "Ledger Transaction", icon: ArrowRight },
              ].map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setReviewForm({ ...reviewForm, entityType: item.id })}
                  className={`flex items-center justify-center gap-2 p-2.5 rounded-[var(--radius-md)] border text-xs font-semibold transition-all cursor-pointer ${
                    reviewForm.entityType === item.id
                      ? "border-[var(--color-emerald-500)] bg-[var(--color-emerald-50)] text-[var(--color-emerald-700)] shadow-xs"
                      : "border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-2)]"
                  }`}
                >
                  <item.icon className="w-4 h-4" />
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* Editable Fields */}
          <div className="space-y-3">
            <Input
              label="Entity Title / Description"
              value={reviewForm.name}
              onChange={(e) => setReviewForm({ ...reviewForm, name: e.target.value })}
              required
            />

            <div className="grid grid-cols-2 gap-3">
              <Input
                label={
                  reviewForm.entityType === "transaction" && reviewForm.lineItems?.length > 0
                    ? "Document Total (optional)"
                    : "Extracted Monetary Amount"
                }
                type="number"
                step="0.01"
                value={reviewForm.amount}
                onChange={(e) => setReviewForm({ ...reviewForm, amount: e.target.value })}
                required={
                  reviewForm.entityType !== "transaction" || reviewForm.lineItems?.length === 0
                }
              />

              <Input
                label="Currency"
                value={reviewForm.currency}
                onChange={(e) => setReviewForm({ ...reviewForm, currency: e.target.value.toUpperCase() })}
                maxLength={3}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Effective Record Date"
                type="date"
                value={reviewForm.date}
                onChange={(e) => setReviewForm({ ...reviewForm, date: e.target.value })}
                required
              />

              <Input
                label="Counterparty / Appraiser"
                value={reviewForm.counterparty}
                onChange={(e) => setReviewForm({ ...reviewForm, counterparty: e.target.value })}
                placeholder="Bank name, surveyor, employer..."
              />
            </div>

            <Input
              label="Audit Note / Details"
              value={reviewForm.description}
              onChange={(e) => setReviewForm({ ...reviewForm, description: e.target.value })}
              placeholder="Verified against original title / statement..."
            />
          </div>

          {reviewForm.entityType === "transaction" && reviewForm.lineItems?.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider">
                    Extracted Transaction Lines
                  </p>
                  <p className="text-[11px] text-[var(--color-text-tertiary)]">
                    Edit or remove lines before approving. Each line becomes its own transaction.
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  icon={Plus}
                  onClick={() =>
                    setReviewForm({
                      ...reviewForm,
                      lineItems: [
                        ...reviewForm.lineItems,
                        {
                          date: reviewForm.date,
                          description: "",
                          amount: "",
                          currency: reviewForm.currency,
                          direction: "unknown",
                          category: "",
                          reference: "",
                        },
                      ],
                    })
                  }
                >
                  Add Line
                </Button>
              </div>
              <div className="max-h-[320px] overflow-auto rounded-[var(--radius-lg)] border border-[var(--color-border)] divide-y divide-[var(--color-border)]">
                {reviewForm.lineItems.map((item, index) => (
                  <div key={index} className="p-3 grid grid-cols-12 gap-2 bg-[var(--color-surface)]">
                    <div className="col-span-3">
                      <Input
                        type="date"
                        value={item.date || ""}
                        onChange={(e) => {
                          const next = [...reviewForm.lineItems];
                          next[index] = { ...next[index], date: e.target.value };
                          setReviewForm({ ...reviewForm, lineItems: next });
                        }}
                      />
                    </div>
                    <div className="col-span-4">
                      <Input
                        placeholder="Description"
                        value={item.description || ""}
                        onChange={(e) => {
                          const next = [...reviewForm.lineItems];
                          next[index] = { ...next[index], description: e.target.value };
                          setReviewForm({ ...reviewForm, lineItems: next });
                        }}
                      />
                    </div>
                    <div className="col-span-2">
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="Amount"
                        value={item.amount || ""}
                        onChange={(e) => {
                          const next = [...reviewForm.lineItems];
                          next[index] = { ...next[index], amount: e.target.value };
                          setReviewForm({ ...reviewForm, lineItems: next });
                        }}
                      />
                    </div>
                    <div className="col-span-2">
                      <select
                        value={item.direction || "unknown"}
                        onChange={(e) => {
                          const next = [...reviewForm.lineItems];
                          next[index] = { ...next[index], direction: e.target.value };
                          setReviewForm({ ...reviewForm, lineItems: next });
                        }}
                        className="w-full px-2.5 py-2 text-sm rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-primary)]"
                      >
                        <option value="unknown">Auto</option>
                        <option value="inflow">Inflow</option>
                        <option value="outflow">Outflow</option>
                        <option value="transfer">Transfer</option>
                      </select>
                    </div>
                    <div className="col-span-1 flex items-center justify-center">
                      <button
                        type="button"
                        onClick={() => {
                          const next = reviewForm.lineItems.filter((_, i) => i !== index);
                          setReviewForm({ ...reviewForm, lineItems: next });
                        }}
                        className="p-1.5 rounded-[var(--radius-sm)] text-[var(--color-text-tertiary)] hover:text-[var(--color-coral-600)] hover:bg-[var(--color-coral-50)]"
                        title="Remove line"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {reviewProposal.recommendations?.length > 0 && (
            <div className="p-3 rounded-[var(--radius-md)] bg-[var(--color-surface-2)] border border-[var(--color-border)]">
              <p className="text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider mb-1.5">
                Recommended next steps
              </p>
              <ul className="space-y-1 text-xs text-[var(--color-text-secondary)]">
                {reviewProposal.recommendations.map((item, index) => (
                  <li key={index} className="flex items-start gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 shrink-0 mt-0.5 text-[var(--color-emerald-600)]" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {reviewEvidence.length > 0 && (
            <details className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)]">
              <summary className="cursor-pointer p-3 text-xs font-semibold text-[var(--color-text-secondary)] flex items-center gap-1.5">
                <ScrollText className="w-4 h-4" />
                Source evidence ({reviewEvidence.length})
              </summary>
              <div className="px-3 pb-3 space-y-2 max-h-56 overflow-auto">
                {reviewEvidence.map((item, index) => (
                  <div
                    key={`${item.field}-${index}`}
                    className="p-2.5 rounded-[var(--radius-sm)] bg-[var(--color-surface-2)] text-xs"
                  >
                    <div className="flex items-center justify-between text-[11px] font-semibold text-[var(--color-text-secondary)]">
                      <span>{item.label || fieldLabel(item.field)}</span>
                      <span className="text-[var(--color-text-tertiary)]">
                        {item.page ? `Page ${item.page}` : "Source snippet"}
                      </span>
                    </div>
                    <p className="mt-1 text-[var(--color-text-secondary)] italic">“{item.text}”</p>
                  </div>
                ))}
              </div>
            </details>
          )}

          {/* Action buttons */}
          <div className="flex items-center justify-between pt-4 border-t border-[var(--color-border)]">
            <Button
              variant="outline"
              onClick={() => setReviewingDoc(null)}
            >
              Cancel
            </Button>

            <Button
              variant="primary"
              icon={CheckCircle2}
              onClick={handleApprove}
              loading={approving}
            >
              {reviewForm.entityType === "transaction" && reviewForm.lineItems?.length > 0
                ? `Approve ${reviewForm.lineItems.length} Transaction${
                    reviewForm.lineItems.length === 1 ? "" : "s"
                  }`
                : "Approve & Commit to Records"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* ── Confirm Delete Modal ────────────────────────────────────────── */}
      <Modal
        isOpen={Boolean(docToDelete)}
        onClose={() => setDocToDelete(null)}
        title="Delete Document"
        description="Are you sure you want to remove this document from your vault?"
      >
        <div className="space-y-4">
          <p className="text-sm text-[var(--color-text-secondary)]">
            You are about to delete{" "}
            <strong className="text-[var(--color-text-primary)]">{docToDelete?.filename}</strong>.
          </p>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[var(--color-border)]">
            <Button variant="ghost" onClick={() => setDocToDelete(null)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleDelete}>
              Delete Document
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
