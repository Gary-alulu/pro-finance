"use client";
// components/invoices/InvoiceEditor.js
// Stage 1 invoice workspace: local draft editing with a live A4 preview.
// Issuing, PDFs, payments and ledger sync are deliberately not wired yet.

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import {
  ArrowLeft,
  Lock,
  ReceiptText,
  Save,
  Trash2,
} from "lucide-react";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import { useToast } from "@/components/providers/ToastProvider";
import InvoiceDocument from "./InvoiceDocument";
import InvoiceLineItemsEditor from "./InvoiceLineItemsEditor";
import InvoiceTotalsSummary from "./InvoiceTotalsSummary";
import {
  AdjustmentsSection,
  ContentSection,
  InvoiceMetaSection,
  IssuerSection,
  Panel,
  RecipientSection,
} from "./InvoiceFormSections";
import { calculateInvoiceTotals } from "@/lib/invoices/calculations";
import { LOCAL_DRAFT_NOTICE } from "@/lib/invoices/constants";
import { deleteDraft, saveDraft } from "@/lib/invoices/localDrafts";
import { formatInvoiceNumber, invoiceYear } from "@/lib/invoices/numbering";

export default function InvoiceEditor({ initialInvoice, settings, mode = "edit" }) {
  const router = useRouter();
  const { success, error } = useToast();
  const [invoice, setInvoice] = useState(() =>
    JSON.parse(JSON.stringify(initialInvoice))
  );
  const [savedAt, setSavedAt] = useState(initialInvoice.updatedAt || null);
  const [dirty, setDirty] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  useEffect(() => {
    if (!dirty) return;
    const warn = (event) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const totals = calculateInvoiceTotals(invoice);
  const numberPreview =
    invoice.invoiceNumber ||
    formatInvoiceNumber(settings?.numbering || {}, {
      year: invoiceYear(invoice.issueDate),
    });

  const patch = (changes) => {
    setDirty(true);
    setInvoice((prev) => ({ ...prev, ...changes }));
  };
  const patchIssuer = (changes) =>
    patch({ issuer: { ...invoice.issuer, ...changes } });
  const patchRecipient = (changes) =>
    patch({ recipient: { ...invoice.recipient, ...changes } });

  function handleSave() {
    if (invoice.lineItems.length === 0) {
      error("Add at least one line item before saving.");
      return;
    }
    if (totals.errors.length > 0) {
      error("Fix the calculation errors before saving.");
      return;
    }

    const saved = saveDraft({ ...invoice, status: "draft" });
    setInvoice((prev) => ({ ...prev, status: "draft", updatedAt: saved.updatedAt }));
    setSavedAt(saved.updatedAt);
    setDirty(false);
    success("Draft saved in this browser.");

    if (mode === "create") {
      router.replace(`/invoices/${saved.id}/edit`);
    }
  }

  function handleDelete() {
    deleteDraft(invoice.id);
    setDeleteOpen(false);
    success("Draft removed from this browser.");
    router.push("/invoices");
  }

  return (
    <div className="min-h-full pb-10">
      {/* Sticky workspace bar */}
      <div className="sticky top-0 z-20 border-b border-[var(--color-border)] bg-[var(--color-bg)]/95 backdrop-blur">
        <div className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-3 px-4 py-3 md:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <Link
              href="/invoices"
              className="rounded-[var(--radius-md)] p-1.5 text-[var(--color-text-tertiary)] transition-colors hover:bg-[var(--color-surface-2)] hover:text-[var(--color-text-primary)]"
              aria-label="Back to invoices"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="truncate text-base font-semibold text-[var(--color-text-primary)]">
                  {mode === "create" ? "New invoice" : "Edit draft"}
                </h1>
                <span className="rounded-full border border-[var(--color-border)] bg-[var(--color-surface-2)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-secondary)]">
                  Draft
                </span>
              </div>
              <p
                className={`mt-0.5 text-[11px] ${
                  dirty
                    ? "text-[var(--color-gold-700)]"
                    : "text-[var(--color-text-tertiary)]"
                }`}
              >
                {dirty
                  ? "Unsaved changes"
                  : savedAt
                  ? `Saved in this browser ${format(new Date(savedAt), "d MMM, HH:mm")}`
                  : "Not saved yet"}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              icon={Lock}
              disabled
              title="Issuing arrives with the server invoice engine (Stage 2)"
            >
              Issue
            </Button>
            {mode === "create" ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                icon={Trash2}
                onClick={() => router.push("/invoices")}
              >
                Discard
              </Button>
            ) : (
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
            )}
            <Button type="button" size="sm" icon={Save} onClick={handleSave}>
              Save draft
            </Button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-[1440px] px-4 py-5 md:px-6">
        <div className="mb-4 flex items-start gap-2 rounded-[var(--radius-lg)] border border-[var(--color-gold-300)] bg-[var(--color-gold-50)] px-3.5 py-2.5">
          <Lock
            className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-[var(--color-gold-700)]"
            aria-hidden="true"
          />
          <p className="text-[11px] leading-relaxed text-[var(--color-gold-700)]">
            <span className="font-semibold">Stage 1 preview.</span>{" "}
            {LOCAL_DRAFT_NOTICE}
          </p>
        </div>

        <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_440px] 2xl:grid-cols-[minmax(0,1fr)_500px]">
          <div className="min-w-0 space-y-4">
            <IssuerSection issuer={invoice.issuer} onChange={patchIssuer} />
            <InvoiceMetaSection
              invoice={invoice}
              onChange={patch}
              numberPreview={numberPreview}
            />
            <RecipientSection
              recipient={invoice.recipient}
              deliveryAddress={invoice.deliveryAddress}
              onChange={patchRecipient}
              onDeliveryChange={(deliveryAddress) => patch({ deliveryAddress })}
            />

            <Panel
              icon={ReceiptText}
              title="Line items"
              description="Totals recalculate as you type, using decimal-safe arithmetic."
            >
              <InvoiceLineItemsEditor
                items={invoice.lineItems}
                currency={invoice.currency}
                defaultTaxRate={settings?.defaultTaxRate ?? ""}
                defaultTaxExempt={Boolean(settings?.defaultTaxExempt)}
                onChange={(lineItems) => patch({ lineItems })}
              />
            </Panel>

            <AdjustmentsSection
              invoice={invoice}
              totals={totals}
              onChange={patch}
            />
            <ContentSection invoice={invoice} onChange={patch} />
          </div>

          <aside className="min-w-0 space-y-4">
            <InvoiceTotalsSummary totals={totals} currency={invoice.currency} />

            <div className="hidden rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-[var(--color-surface-2)] p-3 xl:block">
              <div className="mb-2 flex items-center justify-between px-1">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-tertiary)]">
                  A4 preview
                </p>
                <span className="text-[10px] text-[var(--color-text-tertiary)]">
                  {numberPreview}
                </span>
              </div>
              <InvoiceDocument
                invoice={invoice}
                totals={totals}
                number={numberPreview}
                className="invoice-sheet--compact"
              />
            </div>
          </aside>
        </div>

        <div className="mt-5 xl:hidden">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-tertiary)]">
            A4 preview
          </p>
          <InvoiceDocument
            invoice={invoice}
            totals={totals}
            number={numberPreview}
            className="invoice-sheet--compact"
          />
        </div>
      </div>

      <Modal
        isOpen={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title="Delete this draft?"
        description="This removes the draft from this browser. It cannot be undone."
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
