"use client";
// app/(app)/invoices/InvoicesClient.js
// Invoice overview: metrics, filters, draft list and local-draft lifecycle.
// All data comes from the browser draft store until Stage 2 ships the server
// engine. Nothing on this page pretends to be server-persisted.

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CircleAlert,
  CircleDollarSign,
  Plus,
  ReceiptText,
  Search,
  Settings,
  Sparkles,
} from "lucide-react";
import Button from "@/components/ui/Button";
import EmptyState from "@/components/ui/EmptyState";
import Modal from "@/components/ui/Modal";
import PageSkeleton from "@/components/ui/PageSkeleton";
import Select from "@/components/ui/Select";
import { useToast } from "@/components/providers/ToastProvider";
import InvoiceList from "@/components/invoices/InvoiceList";
import InvoiceMetric from "@/components/invoices/InvoiceMetric";
import { calculateInvoiceTotals, deriveInvoiceStatus } from "@/lib/invoices/calculations";
import {
  DIRECTION_FILTER_OPTIONS,
  LOCAL_DRAFT_NOTICE,
  STATUS_FILTER_OPTIONS,
} from "@/lib/invoices/constants";
import {
  deleteDraft,
  duplicateDraft,
  readDrafts,
  readInvoiceSettings,
  subscribeToInvoiceChanges,
} from "@/lib/invoices/localDrafts";
import { previewInvoiceNumber } from "@/lib/invoices/numbering";
import { formatCurrency, sumAmounts } from "@/lib/finance/currency";

export default function InvoicesClient() {
  const router = useRouter();
  const { success, error } = useToast();
  const [drafts, setDrafts] = useState([]);
  const [settings, setSettings] = useState(null);
  const [ready, setReady] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [directionFilter, setDirectionFilter] = useState("all");
  const [deleteTarget, setDeleteTarget] = useState(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDrafts(readDrafts());
      setSettings(readInvoiceSettings());
      setReady(true);
    }, 0);

    const unsubscribe = subscribeToInvoiceChanges(() => {
      setDrafts(readDrafts());
      setSettings(readInvoiceSettings());
    });

    return () => {
      clearTimeout(timer);
      unsubscribe();
    };
  }, []);

  const metrics = useMemo(() => {
    const primaryCurrency = settings?.defaultCurrency || "KES";
    let readyToIssue = 0;
    let needsAttention = 0;
    const byCurrency = new Map();

    for (const draft of drafts) {
      const totals = calculateInvoiceTotals(draft);
      const hasDescription = draft.lineItems?.some(
        (line) => String(line.description || "").trim().length > 0
      );
      if (
        totals.errors.length === 0 &&
        hasDescription &&
        String(draft.recipient?.name || "").trim().length > 0 &&
        String(draft.issuer?.name || "").trim().length > 0
      ) {
        readyToIssue += 1;
      }
      if (totals.errors.length > 0) needsAttention += 1;

      const currency = draft.currency || primaryCurrency;
      const bucket = byCurrency.get(currency) || [];
      bucket.push(totals.total);
      byCurrency.set(currency, bucket);
    }

    const primaryTotals = byCurrency.get(primaryCurrency) || [];
    const otherCurrencyCount = Array.from(byCurrency.keys()).filter(
      (currency) => currency !== primaryCurrency
    ).length;

    return {
      primaryCurrency,
      readyToIssue,
      needsAttention,
      draftValue: sumAmounts(primaryTotals).toFixed(2),
      otherCurrencyCount,
    };
  }, [drafts, settings]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return drafts
      .filter((draft) => {
        if (directionFilter !== "all" && draft.direction !== directionFilter) {
          return false;
        }
        if (statusFilter !== "all") {
          const status = deriveInvoiceStatus(draft);
          if (status !== statusFilter) return false;
        }
        if (!query) return true;
        const haystack = [
          draft.invoiceNumber,
          draft.title,
          draft.purchaseOrder,
          draft.recipient?.name,
          draft.recipient?.email,
          previewInvoiceNumber(draft, settings || {}),
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return haystack.includes(query);
      })
      .sort(
        (a, b) =>
          new Date(b.updatedAt || b.createdAt || 0).getTime() -
          new Date(a.updatedAt || a.createdAt || 0).getTime()
      );
  }, [drafts, search, statusFilter, directionFilter, settings]);

  const filtersActive =
    search.trim().length > 0 ||
    statusFilter !== "all" ||
    directionFilter !== "all";

  function handleDuplicate(id) {
    const copy = duplicateDraft(id);
    if (!copy) {
      error("That draft could not be found.");
      return;
    }
    success("Draft duplicated. It starts as a fresh unpaid draft.");
  }

  function handleDelete() {
    if (!deleteTarget) return;
    deleteDraft(deleteTarget.id);
    setDeleteTarget(null);
    success("Draft removed from this browser.");
  }

  if (!ready) return <PageSkeleton cards={4} rows={5} />;

  return (
    <div className="mx-auto max-w-[1440px] px-4 py-5 md:px-6 md:py-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-[var(--color-text-primary)]">
            Invoices
          </h1>
          <p className="mt-1 max-w-xl text-xs leading-relaxed text-[var(--color-text-secondary)]">
            Draft invoices, check totals and preview the document before issuing.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/invoices/settings"
            className="inline-flex items-center justify-center gap-2 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3.5 py-2 text-sm font-medium text-[var(--color-text-primary)] transition-colors hover:bg-[var(--color-surface-2)]"
          >
            <Settings className="h-4 w-4" aria-hidden="true" />
            Settings
          </Link>
          <Button
            type="button"
            icon={Plus}
            onClick={() => router.push("/invoices/new")}
          >
            New invoice
          </Button>
        </div>
      </div>

      <div className="mt-4 flex items-start gap-2 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3.5 py-2.5">
        <Sparkles
          className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-[var(--color-emerald-600)]"
          aria-hidden="true"
        />
        <p className="text-[11px] leading-relaxed text-[var(--color-text-secondary)]">
          <span className="font-semibold text-[var(--color-text-primary)]">
            Local draft workspace.
          </span>{" "}
          {LOCAL_DRAFT_NOTICE}
        </p>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <InvoiceMetric
          label="Drafts"
          value={drafts.length}
          hint="Saved in this browser"
          icon={ReceiptText}
          tone="neutral"
        />
        <InvoiceMetric
          label="Ready to issue"
          value={metrics.readyToIssue}
          hint="Has an issuer, client, items and no calculation errors"
          icon={CircleDollarSign}
          tone="emerald"
        />
        <InvoiceMetric
          label="Needs attention"
          value={metrics.needsAttention}
          hint="Drafts with invalid quantities, prices or discounts"
          icon={CircleAlert}
          tone={metrics.needsAttention > 0 ? "coral" : "neutral"}
        />
        <InvoiceMetric
          label={`Draft value (${metrics.primaryCurrency})`}
          value={formatCurrency(metrics.draftValue, metrics.primaryCurrency)}
          hint={
            metrics.otherCurrencyCount > 0
              ? `Excludes drafts in ${metrics.otherCurrencyCount} other ${
                  metrics.otherCurrencyCount === 1 ? "currency" : "currencies"
                }`
              : "Sum of draft totals in your default currency"
          }
          icon={CircleDollarSign}
          tone="gold"
        />
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-2">
        <div className="relative min-w-[200px] flex-1">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-text-tertiary)]"
            aria-hidden="true"
          />
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search number, client, reference..."
            aria-label="Search invoices"
            className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] py-2 pl-9 pr-3 text-sm text-[var(--color-text-primary)] placeholder-[var(--color-text-tertiary)] shadow-xs transition-all focus:border-[var(--color-emerald-500)] focus:outline-none focus:ring-2 focus:ring-[var(--color-emerald-100)]"
          />
        </div>

        <Select
          options={STATUS_FILTER_OPTIONS}
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value)}
          containerClassName="w-[170px]"
          aria-label="Filter by status"
        />
        <Select
          options={DIRECTION_FILTER_OPTIONS}
          value={directionFilter}
          onChange={(event) => setDirectionFilter(event.target.value)}
          containerClassName="w-[170px]"
          aria-label="Filter by direction"
        />

        {filtersActive && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              setSearch("");
              setStatusFilter("all");
              setDirectionFilter("all");
            }}
          >
            Clear
          </Button>
        )}

        <span className="ml-auto text-[11px] tabular-nums text-[var(--color-text-tertiary)]">
          {filtered.length} of {drafts.length}
        </span>
      </div>

      <div className="mt-3 overflow-hidden rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-xs">
        {drafts.length === 0 ? (
          <EmptyState
            icon={ReceiptText}
            title="No invoices yet"
            description="Create your first draft to see decimal-safe totals and a live A4 preview. Drafts stay in this browser until Stage 2 connects the server engine."
            action={
              <Button
                type="button"
                icon={Plus}
                onClick={() => router.push("/invoices/new")}
              >
                Create invoice
              </Button>
            }
          />
        ) : (
          <InvoiceList
            invoices={filtered}
            settings={settings || {}}
            onDuplicate={handleDuplicate}
            onDelete={(invoice) => setDeleteTarget(invoice)}
          />
        )}
      </div>

      <p className="mt-3 text-[11px] leading-relaxed text-[var(--color-text-tertiary)]">
        Stage 1 does not connect to the ledger, issue invoices, generate PDFs or
        record payments. Those arrive with the server invoice engine.
      </p>

      <Modal
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title="Delete this draft?"
        description={
          deleteTarget
            ? `${previewInvoiceNumber(deleteTarget, settings || {})} will be removed from this browser.`
            : ""
        }
        maxWidth="max-w-md"
      >
        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="secondary"
            onClick={() => setDeleteTarget(null)}
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
