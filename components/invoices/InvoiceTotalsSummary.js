// components/invoices/InvoiceTotalsSummary.js
// Presentational totals card. Values arrive pre-calculated; no money math here.

import { Calculator, CircleAlert } from "lucide-react";
import { formatCurrency } from "@/lib/finance/currency";

function Line({ label, value, strong = false, muted = false }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1">
      <span
        className={`text-xs ${
          muted
            ? "text-[var(--color-text-tertiary)]"
            : "text-[var(--color-text-secondary)]"
        }`}
      >
        {label}
      </span>
      <span
        className={`tabular-nums ${
          strong
            ? "text-sm font-semibold text-[var(--color-text-primary)]"
            : "text-xs text-[var(--color-text-primary)]"
        }`}
      >
        {value}
      </span>
    </div>
  );
}

export default function InvoiceTotalsSummary({ totals, currency = "KES" }) {
  const money = (value) => formatCurrency(value, currency);
  const hasLineDiscount = Number(totals.lineDiscountTotal) > 0;
  const hasInvoiceDiscount = Number(totals.invoiceDiscount) > 0;
  const hasPaid = Number(totals.amountPaid) > 0;

  return (
    <section className="rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-xs sm:p-5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Calculator
            className="h-4 w-4 text-[var(--color-text-tertiary)]"
            aria-hidden="true"
          />
          <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">
            Summary
          </h2>
        </div>
        <span className="rounded-full border border-[var(--color-emerald-200)] bg-[var(--color-emerald-50)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--color-emerald-700)]">
          Live
        </span>
      </div>

      <div className="mt-4">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-tertiary)]">
          Total
        </p>
        <p className="text-2xl font-semibold tabular-nums text-[var(--color-text-primary)]">
          {money(totals.total)}
        </p>
      </div>

      <div className="mt-3 divide-y divide-[var(--color-border)]">
        <Line label="Subtotal" value={money(totals.grossSubtotal)} />
        {hasLineDiscount && (
          <Line
            label="Line discounts"
            value={`-${money(totals.lineDiscountTotal)}`}
          />
        )}
        {hasInvoiceDiscount && (
          <Line
            label="Invoice discount"
            value={`-${money(totals.invoiceDiscount)}`}
          />
        )}
        {totals.taxBreakdown.length > 0 ? (
          totals.taxBreakdown.map((group) => (
            <Line
              key={group.rate}
              label={`Tax (${group.rate}%)`}
              value={money(group.tax)}
            />
          ))
        ) : (
          <Line label="Tax" value={money(0)} muted />
        )}
        {hasPaid && <Line label="Amount paid" value={money(totals.amountPaid)} />}
      </div>

      <div className="mt-2 rounded-[var(--radius-md)] bg-[var(--color-surface-2)] px-3 py-2.5">
        <div className="flex items-baseline justify-between gap-3">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-secondary)]">
            {totals.isOverpaid ? "Credit due" : "Balance due"}
          </span>
          <span className="text-base font-semibold tabular-nums text-[var(--color-text-primary)]">
            {money(totals.isOverpaid ? totals.credit : totals.outstanding)}
          </span>
        </div>
      </div>

      {totals.errors.length > 0 && (
        <div className="mt-3 rounded-[var(--radius-md)] border border-[var(--color-coral-300)] bg-[var(--color-coral-50)] px-3 py-2.5">
          <div className="flex items-start gap-2">
            <CircleAlert
              className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-[var(--color-coral-600)]"
              aria-hidden="true"
            />
            <div className="space-y-0.5">
              {totals.errors.slice(0, 4).map((message, index) => (
                <p
                  key={`${message}-${index}`}
                  className="text-[11px] leading-relaxed text-[var(--color-coral-700)]"
                >
                  {message}
                </p>
              ))}
              {totals.errors.length > 4 && (
                <p className="text-[11px] text-[var(--color-coral-700)]">
                  +{totals.errors.length - 4} more
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      <p className="mt-3 text-[10.5px] leading-relaxed text-[var(--color-text-tertiary)]">
        Browser preview only. The server recalculates totals before saving or
        issuing an invoice.
      </p>
    </section>
  );
}
