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
  });
  const [approving, setApproving] = useState(false);
  const [reviewError, setReviewError] = useState("");
  const [successBanner, setSuccessBanner] = useState("");

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

    setReviewForm({
      entityType: prop.proposedEntityType || "asset",
      name: prop.name || doc.filename.replace(/\.[^/.]+$/, ""),
      amount: prop.amount || "0.00",
      currency: prop.currency || user?.preferredCurrency || "KES",
      date: prop.date || new Date().toISOString().split("T")[0],
      category: prop.category || "property",
      counterparty: prop.counterparty || "",
      description: prop.summary || "",
    });
    setReviewError("");
  };

  // Handle Approve & Commit
  const handleApprove = async () => {
    if (!reviewingDoc) return;
    setApproving(true);
    setReviewError("");

    try {
      const res = await fetch(`/api/documents/${reviewingDoc.id}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entityType: reviewForm.entityType,
          data: reviewForm,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to approve document extraction");
      }

      setReviewingDoc(null);
      setSuccessBanner(
        `Record approved and committed as official ${reviewForm.entityType}! Linked to document.`
      );
      setTimeout(() => setSuccessBanner(""), 6000);
      fetchData();
    } catch (err) {
      setReviewError(err.message);
    } finally {
      setApproving(false);
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
    <div className="space-y-6">
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
            const confidence = doc.extractionResult?.confidence
              ? Math.round(doc.extractionResult.confidence * 100)
              : 85;

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
                      tone={isAwaiting ? "gold" : "emerald"}
                      dot
                      size="sm"
                    >
                      {isAwaiting ? "Awaiting Review" : "Approved"}
                    </Badge>
                  </div>

                  {/* Extraction proposal preview */}
                  {prop && (
                    <div className="mt-4 p-3 rounded-[var(--radius-md)] bg-[var(--color-surface)] border border-[var(--color-border)]">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider">
                          AI Proposal ({confidence}%)
                        </span>
                        <span className="capitalize font-medium text-[var(--color-emerald-700)]">
                          {prop.proposedEntityType || "Record"}
                        </span>
                      </div>

                      <div className="mt-1 text-sm font-bold text-[var(--color-text-primary)] line-clamp-1">
                        {prop.name}
                      </div>

                      <div className="mt-1 text-base font-bold text-[var(--color-text-primary)]">
                        {formatCurrency(prop.amount, prop.currency || "KES")}
                      </div>

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
              Supports PDF, PNG, JPG, CSV up to 25MB
            </p>
            <input
              ref={fileInputRef}
              type="file"
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
                  Extracted via {reviewingDoc?.extractionResult?.modelUsed || "AI Engine"}
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
                label="Extracted Monetary Amount"
                type="number"
                step="0.01"
                value={reviewForm.amount}
                onChange={(e) => setReviewForm({ ...reviewForm, amount: e.target.value })}
                required
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
              Approve & Commit to Records
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
