"use client";
// components/invoices/InvoiceList.js
// Dense, responsive draft list. Calculation and status derivation happen here
// so list rows and the detail page agree.

import Link from "next/link";
import { format } from "date-fns";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Copy,
  Pencil,
  ReceiptText,
  Trash2,
} from "lucide-react";
import InvoiceStatusBadge from "./InvoiceStatusBadge";
import { formatCurrency } from "@/lib/finance/currency";
import { calculateInvoiceTotals, deriveInvoiceStatus } from "@/lib/invoices/calculations";
import { previewInvoiceNumber } from "@/lib/invoices/numbering";
import { DIRECTION_META } from "@/lib/invoices/constants";

function fmtDate(value) {
  if (!value) return "No due date";
  const d = /^\d{4}-\d{2}-\d{2}$/.test(String(value))
    ? new Date(`${value}T00:00:00`)
    : new Date(value);
  return Number.isNaN(d.getTime()) ? "No due date" : format(d, "d MMM yyyy");
}

function ActionButton({ label, onClick, href, children, danger = false }) {
  const className = `rounded-[var(--radius-sm)] p-1.5 transition-colors ${
    danger
      ? "text-[var(--color-text-tertiary)] hover:bg-[var(--color-coral-50)] hover:text-[var(--color-coral-600)]"
      : "text-[var(--color-text-tertiary)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-text-primary)]"
  }`;
  if (href) {
    return (
      <Link href={href} className={className} aria-label={label} title={label}>
        {children}
      </Link>
    );
  }
  return (
    <button
      type="button"
      onClick={onClick}
      className={className}
      aria-label={label}
      title={label}
    >
      {children}
    </button>
  );
}

export default function InvoiceList({
  invoices = [],
  settings = {},
  onDuplicate,
  onDelete,
}) {
  if (invoices.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-[var(--radius-lg)] bg-[var(--color-surface-2)] text-[var(--color-text-tertiary)]">
          <ReceiptText className="h-6 w-6" aria-hidden="true" />
        </div>
        <p className="text-sm font-medium text-[var(--color-text-primary)]">
          No invoices found
        </p>
        <p className="mt-1 max-w-sm text-xs leading-relaxed text-[var(--color-text-tertiary)]">
          Adjust your filters or start a new draft. Drafts stay in this browser
          until the server engine lands.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="hidden grid-cols-[minmax(0,1fr)_108px_118px_120px_112px_88px] items-center gap-3 border-b border-[var(--color-border)] bg-[var(--color-surface-2)]/60 px-3.5 py-2 sm:grid">
        {["Invoice", "Due", "Status", "Total", "Balance", ""].map((label, index) => (
          <span
            key={`${label}-${index}`}
            className={`text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-tertiary)] ${
              index >= 3 && index <= 4 ? "text-right" : ""
            }`}
          >
            {label}
          </span>
        ))}
      </div>

      <ul className="divide-y divide-[var(--color-border)]">
        {invoices.map((invoice) => {
          const totals = calculateInvoiceTotals(invoice);
          const status = deriveInvoiceStatus(invoice);
          const direction = DIRECTION_META[invoice.direction] || DIRECTION_META.outgoing;
          const DirectionIcon =
            invoice.direction === "incoming" ? ArrowDownLeft : ArrowUpRight;
          const showBalance = !["draft", "cancelled", "void"].includes(status);
          const number = previewInvoiceNumber(invoice, settings);

          return (
            <li
              key={invoice.id}
              className="grid grid-cols-2 gap-x-3 gap-y-2 px-3.5 py-3 transition-colors hover:bg-[var(--color-surface-2)]/50 sm:grid-cols-[minmax(0,1fr)_108px_118px_120px_112px_88px] sm:items-center"
            >
              <div className="col-span-2 min-w-0 sm:col-span-1">
                <Link
                  href={`/invoices/${invoice.id}`}
                  className="group inline-flex max-w-full items-center gap-1.5"
                >
                  <span className="truncate text-sm font-semibold tabular-nums text-[var(--color-text-primary)] group-hover:text-[var(--color-emerald-700)]">
                    {number}
                  </span>
                </Link>
                <div className="mt-0.5 flex min-w-0 items-center gap-1.5">
                  <span className="inline-flex items-center gap-1 text-[10px] font-medium text-[var(--color-text-tertiary)]">
                    <DirectionIcon className="h-3 w-3" aria-hidden="true" />
                    {direction.label}
                  </span>
                  <span className="text-[10px] text-[var(--color-text-tertiary)]">
                    /
                  </span>
                  <span className="truncate text-xs text-[var(--color-text-secondary)]">
                    {invoice.recipient?.name || invoice.title || "No recipient yet"}
                  </span>
                </div>
              </div>

              <div className="text-left sm:text-left">
                <span className="block text-[10px] uppercase tracking-wider text-[var(--color-text-tertiary)] sm:hidden">
                  Due
                </span>
                <span className="text-xs tabular-nums text-[var(--color-text-secondary)]">
                  {fmtDate(invoice.dueDate)}
                </span>
              </div>

              <div>
                <span className="mb-1 block text-[10px] uppercase tracking-wider text-[var(--color-text-tertiary)] sm:hidden">
                  Status
                </span>
                <InvoiceStatusBadge status={status} />
              </div>

              <div className="text-right">
                <span className="block text-[10px] uppercase tracking-wider text-[var(--color-text-tertiary)] sm:hidden">
                  Total
                </span>
                <span className="text-xs font-medium tabular-nums text-[var(--color-text-primary)]">
                  {formatCurrency(totals.total, invoice.currency)}
                </span>
              </div>

              <div className="text-right">
                <span className="block text-[10px] uppercase tracking-wider text-[var(--color-text-tertiary)] sm:hidden">
                  Balance
                </span>
                <span
                  className={`text-xs font-medium tabular-nums ${
                    showBalance && Number(totals.outstanding) > 0
                      ? "text-[var(--color-text-primary)]"
                      : "text-[var(--color-text-tertiary)]"
                  }`}
                >
                  {showBalance
                    ? formatCurrency(totals.outstanding, invoice.currency)
                    : "-"}
                </span>
              </div>

              <div className="col-span-2 flex items-center justify-end gap-0.5 sm:col-span-1">
                <ActionButton
                  label="Edit draft"
                  href={`/invoices/${invoice.id}/edit`}
                >
                  <Pencil className="h-3.5 w-3.5" />
                </ActionButton>
                <ActionButton
                  label="Duplicate draft"
                  onClick={() => onDuplicate?.(invoice.id)}
                >
                  <Copy className="h-3.5 w-3.5" />
                </ActionButton>
                <ActionButton
                  label="Delete draft"
                  onClick={() => onDelete?.(invoice)}
                  danger
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </ActionButton>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
