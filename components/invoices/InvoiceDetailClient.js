"use client";
// components/invoices/InvoiceDetailClient.js
// Read-only draft review with the same A4 renderer used by the editor.

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import {
  ArrowLeft,
  ArrowUpRight,
  ArrowDownLeft,
  Copy,
  FileDown,
  FileQuestion,
  Lock,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import PageSkeleton from "@/components/ui/PageSkeleton";
import { useToast } from "@/components/providers/ToastProvider";
import InvoiceDocument from "./InvoiceDocument";
import InvoiceStatusBadge from "./InvoiceStatusBadge";
import InvoiceTotalsSummary from "./InvoiceTotalsSummary";
import { calculateInvoiceTotals, deriveInvoiceStatus } from "@/lib/invoices/calculations";
import { LOCAL_DRAFT_NOTICE } from "@/lib/invoices/constants";
import { deleteDraft, duplicateDraft, getDraft, readInvoiceSettings } from "@/lib/invoices/localDrafts";
import { previewInvoiceNumber } from "@/lib/invoices/numbering";

function fmtDate(value) {
  if (!value) return "-";
  const d = /^\d{4}-\d{2}-\d{2}$/.test(String(value))
    ? new Date(`${value}T00:00:00`)
    : new Date(value);
  return Number.isNaN(d.getTime()) ? "-" : format(d, "d MMM yyyy");
}

function fmtTimestamp(value) {
  if (!value) return "-";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "-" : format(d, "d MMM yyyy, HH:mm");
}

function Fact({ label, value }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1.5">
      <dt className="text-[11px] text-[var(--color-text-tertiary)]">{label}</dt>
      <dd className="text-right text-xs font-medium text-[var(--color-text-primary)]">
        {value}
      </dd>
    </div>
  );
}

export default function InvoiceDetailClient({ id }) {
  const router = useRouter();
  const { success, error } = useToast();
  const [state, setState] = useState({
    ready: false,
    invoice: null,
    settings: null,
  });
  const [deleteOpen, setDeleteOpen] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setState({
        ready: true,
        invoice: getDraft(id),
        settings: readInvoiceSettings(),
      });
    }, 0);
    return () => clearTimeout(timer);
  }, [id]);

  if (!state.ready) return <PageSkeleton cards={0} rows={7} />;

  if (!state.invoice) {
    return (
      <div className="mx-auto flex max-w-xl flex-col items-center px-4 py-20 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-[var(--radius-lg)] bg-[var(--color-surface-2)] text-[var(--color-text-tertiary)]">
          <FileQuestion className="h-6 w-6" aria-hidden="true" />
        </div>
        <h1 className="mt-4 text-lg font-semibold text-[var(--color-text-primary)]">
          Draft not found
        </h1>
        <p className="mt-1 text-sm leading-relaxed text-[var(--color-text-secondary)]">
          This draft is not stored in this browser. It may have been deleted or
          created in a different browser profile.
        </p>
        <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
          <Button
            type="button"
            variant="secondary"
            onClick={() => router.push("/invoices")}
          >
            Back to invoices
          </Button>
          <Button
            type="button"
            icon={Plus}
            onClick={() => router.push("/invoices/new")}
          >
            New invoice
          </Button>
        </div>
      </div>
    );
  }

  const invoice = state.invoice;
  const totals = calculateInvoiceTotals(invoice);
  const status = deriveInvoiceStatus(invoice);
  const number = previewInvoiceNumber(invoice, state.settings || {});
  const direction =
    invoice.direction === "incoming"
      ? { label: "Incoming", Icon: ArrowDownLeft }
      : { label: "Outgoing", Icon: ArrowUpRight };

  function handleDuplicate() {
    const copy = duplicateDraft(id);
    if (!copy) {
      error("That draft could not be found.");
      return;
    }
    success("Draft duplicated. It starts as a fresh unpaid draft.");
    router.push(`/invoices/${copy.id}/edit`);
  }

  function handleDelete() {
    deleteDraft(id);
    setDeleteOpen(false);
    success("Draft removed from this browser.");
    router.push("/invoices");
  }

  return (
    <div className="mx-auto max-w-[1240px] px-4 py-5 md:px-6 md:py-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <button
            type="button"
            onClick={() => router.push("/invoices")}
            className="mt-0.5 rounded-[var(--radius-md)] p-1.5 text-[var(--color-text-tertiary)] transition-colors hover:bg-[var(--color-surface-2)] hover:text-[var(--color-text-primary)]"
            aria-label="Back to invoices"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="truncate text-xl font-semibold tabular-nums tracking-tight text-[var(--color-text-primary)]">
                {number}
              </h1>
              <InvoiceStatusBadge status={status} />
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-[var(--color-text-secondary)]">
              <span className="inline-flex items-center gap-1">
                <direction.Icon className="h-3 w-3" aria-hidden="true" />
                {direction.label}
              </span>
              <span className="text-[var(--color-text-tertiary)]">/</span>
              <span className="truncate">
                {invoice.recipient?.name || "No recipient yet"}
              </span>
              {invoice.title && (
                <>
                  <span className="text-[var(--color-text-tertiary)]">/</span>
                  <span className="truncate">{invoice.title}</span>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            icon={FileDown}
            disabled
            title="PDF generation arrives with the storage-backed document pipeline (Stage 3)"
          >
            PDF
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            icon={Copy}
            onClick={handleDuplicate}
          >
            Duplicate
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            icon={Trash2}
            onClick={() => setDeleteOpen(true)}
            className="text-[var(--color-coral-600)] hover:bg-[var(--color-coral-50)]"
          >
            Delete
          </Button>
          <Button
            type="button"
            size="sm"
            icon={Pencil}
            onClick={() => router.push(`/invoices/${id}/edit`)}
          >
            Edit draft
          </Button>
        </div>
      </div>

      <div className="mt-4 flex items-start gap-2 rounded-[var(--radius-lg)] border border-[var(--color-gold-300)] bg-[var(--color-gold-50)] px-3.5 py-2.5">
        <Lock
          className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-[var(--color-gold-700)]"
          aria-hidden="true"
        />
        <p className="text-[11px] leading-relaxed text-[var(--color-gold-700)]">
          <span className="font-semibold">Stage 1 preview.</span>{" "}
          {LOCAL_DRAFT_NOTICE}
        </p>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0 overflow-x-auto rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-[var(--color-surface-2)] p-3 sm:p-4">
          <InvoiceDocument invoice={invoice} totals={totals} number={number} />
        </div>

        <aside className="min-w-0 space-y-4">
          <InvoiceTotalsSummary totals={totals} currency={invoice.currency} />

          <section className="rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-xs">
            <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">
              Details
            </h2>
            <dl className="mt-2 divide-y divide-[var(--color-border)]">
              <Fact label="Issue date" value={fmtDate(invoice.issueDate)} />
              <Fact label="Due date" value={fmtDate(invoice.dueDate)} />
              <Fact label="Currency" value={invoice.currency} />
              <Fact
                label="Reference"
                value={invoice.title || invoice.purchaseOrder || "-"}
              />
              <Fact label="Last saved" value={fmtTimestamp(invoice.updatedAt)} />
              <Fact label="Created" value={fmtTimestamp(invoice.createdAt)} />
            </dl>
          </section>

          <section className="rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-xs">
            <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">
              Not connected yet
            </h2>
            <ul className="mt-2 space-y-1.5 text-[11px] leading-relaxed text-[var(--color-text-tertiary)]">
              <li>Issuing and immutable numbering (Stage 2)</li>
              <li>Ledger and payment reconciliation (Stage 2)</li>
              <li>PDF rendering and attachments (Stage 3)</li>
              <li>Email delivery and audit trail (Stage 4)</li>
            </ul>
          </section>
        </aside>
      </div>

      <Modal
        isOpen={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title="Delete this draft?"
        description={`${number} will be removed from this browser.`}
        maxWidth="max-w-md"
      >
        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="secondary"
            onClick={() => setDeleteOpen(false)}
          >
            Cancel
          </Button>
          <Button type="button" variant="danger" onClick={handleDelete}>
            Delete draft
          </Button>
        </div>
      </Modal>
    </div>
  );
}
