// components/invoices/InvoiceDocument.js
// Shared A4 invoice renderer. This exact component is what the future PDF
// pipeline (Stage 3) should render, so screen preview and PDF stay identical.

import { format } from "date-fns";
import { formatCurrency } from "@/lib/finance/currency";
import { INVOICE_STATUS_META } from "@/lib/invoices/constants";

function parseDate(value) {
  if (!value) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(String(value))) {
    const d = new Date(`${value}T00:00:00`);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function fmtDate(value) {
  const d = parseDate(value);
  return d ? format(d, "d MMM yyyy") : "-";
}

function initials(name) {
  const parts = String(name || "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "PF";
  return (parts[0][0] + (parts[1]?.[0] || "")).toUpperCase();
}

function Row({ label, value, strong = false, muted = false }) {
  return (
    <div className={`invoice-total-row ${muted ? "text-[var(--invoice-faint)]" : ""}`}>
      <span className={muted ? "text-[10px]" : ""}>{label}</span>
      <span
        className={`tabular-nums ${strong ? "font-semibold text-[13px]" : ""}`}
      >
        {value}
      </span>
    </div>
  );
}

export default function InvoiceDocument({
  invoice = {},
  totals,
  number = "",
  className = "",
}) {
  const currency = invoice.currency || "KES";
  const issuer = invoice.issuer || {};
  const recipient = invoice.recipient || {};
  const isDraft = (invoice.status || "draft") === "draft";
  const statusMeta = INVOICE_STATUS_META[invoice.status || "draft"];
  const money = (value) => formatCurrency(value, currency);
  const isIncoming = invoice.direction === "incoming";
  const dotColor =
    isDraft || ["cancelled", "void"].includes(invoice.status)
      ? "var(--invoice-faint)"
      : invoice.status === "paid"
      ? "var(--invoice-emerald)"
      : invoice.status === "overdue"
      ? "var(--invoice-coral)"
      : invoice.status === "issued"
      ? "var(--invoice-blue)"
      : "var(--invoice-amber)";

  const contactLines = [
    issuer.phone,
    issuer.email,
    issuer.taxId ? `Tax PIN: ${issuer.taxId}` : "",
  ].filter(Boolean);

  return (
    <article className={`invoice-sheet ${className}`} aria-label="Invoice preview">
      {/* Header */}
      <header className="flex items-start justify-between gap-6">
        <div className="flex min-w-0 items-start gap-3">
          {issuer.logo ? (
            <div
              role="img"
              aria-label={`${issuer.name || "Issuer"} logo`}
              className="h-12 w-12 flex-shrink-0 rounded-[6px] border border-[var(--invoice-line)] bg-[var(--invoice-soft)] bg-contain bg-center bg-no-repeat"
              style={{ backgroundImage: `url(${issuer.logo})` }}
            />
          ) : (
            <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-[6px] bg-[var(--invoice-ink)] text-[13px] font-semibold tracking-wide text-white">
              {initials(issuer.name)}
            </div>
          )}
          <div className="min-w-0">
            <p className="truncate text-[16px] font-semibold leading-tight">
              {issuer.name || "Your business name"}
            </p>
            {issuer.address && (
              <p className="mt-1 whitespace-pre-line text-[10.5px] leading-relaxed text-[var(--invoice-muted)]">
                {issuer.address}
              </p>
            )}
            {contactLines.length > 0 && (
              <p className="mt-0.5 text-[10.5px] leading-relaxed text-[var(--invoice-muted)]">
                {contactLines.join("  |  ")}
              </p>
            )}
          </div>
        </div>

        <div className="shrink-0 text-right">
          <p className="text-[9px] font-semibold uppercase tracking-[0.22em] text-[var(--invoice-faint)]">
            {isIncoming ? "Supplier invoice" : "Invoice"}
          </p>
          <p className="mt-0.5 text-[19px] font-semibold leading-tight tabular-nums">
            {number || "DRAFT"}
          </p>
          <span className="invoice-block mt-1.5 inline-flex items-center gap-1.5 rounded-full border border-[var(--invoice-line)] bg-[var(--invoice-soft)] px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-[var(--invoice-muted)]">
            <span
              className="h-1.5 w-1.5 rounded-full"
              style={{ background: dotColor }}
            />
            {isDraft ? "Draft - not issued" : statusMeta?.label || "Issued"}
          </span>
        </div>
      </header>

      <div className="invoice-rule my-5" />

      {/* Parties and dates */}
      <section className="invoice-block grid grid-cols-1 gap-6 sm:grid-cols-2">
        <div>
          <p className="invoice-kicker">{isIncoming ? "Supplier" : "Bill to"}</p>
          <p className="mt-1.5 text-[12.5px] font-semibold">
            {recipient.name || (isIncoming ? "Supplier name" : "Client name")}
          </p>
          <div className="mt-1 space-y-0.5 text-[10.5px] leading-relaxed text-[var(--invoice-muted)]">
            {recipient.address && (
              <p className="whitespace-pre-line">{recipient.address}</p>
            )}
            {recipient.email && <p>{recipient.email}</p>}
            {recipient.phone && <p>{recipient.phone}</p>}
            {recipient.taxId && <p>Tax PIN: {recipient.taxId}</p>}
          </div>
          {invoice.deliveryAddress && (
            <div className="mt-3">
              <p className="invoice-kicker">Deliver to</p>
              <p className="mt-1 whitespace-pre-line text-[10.5px] leading-relaxed text-[var(--invoice-muted)]">
                {invoice.deliveryAddress}
              </p>
            </div>
          )}
        </div>

        <dl className="grid grid-cols-2 gap-x-4 gap-y-3 self-start sm:justify-self-end sm:text-right">
          <div>
            <dt className="invoice-kicker">Issue date</dt>
            <dd className="mt-1 text-[11px] tabular-nums">{fmtDate(invoice.issueDate)}</dd>
          </div>
          <div>
            <dt className="invoice-kicker">Due date</dt>
            <dd className="mt-1 text-[11px] tabular-nums">{fmtDate(invoice.dueDate)}</dd>
          </div>
          <div>
            <dt className="invoice-kicker">Currency</dt>
            <dd className="mt-1 text-[11px]">{currency}</dd>
          </div>
          <div>
            <dt className="invoice-kicker">Reference</dt>
            <dd className="mt-1 max-w-[150px] text-[11px] sm:ml-auto">
              {invoice.title || "-"}
            </dd>
          </div>
          {invoice.purchaseOrder && (
            <div className="col-span-2">
              <dt className="invoice-kicker">Purchase order</dt>
              <dd className="mt-1 text-[11px]">{invoice.purchaseOrder}</dd>
            </div>
          )}
        </dl>
      </section>

      {/* Lines */}
      <table className="invoice-table mt-7">
        <thead>
          <tr>
            <th className="w-[46%]">Description</th>
            <th className="w-[12%] text-right">Qty</th>
            <th className="w-[16%] text-right">Rate</th>
            <th className="w-[12%] text-right">Tax</th>
            <th className="w-[14%] text-right">Amount</th>
          </tr>
        </thead>
        <tbody>
          {totals.lines.length === 0 && (
            <tr>
              <td colSpan={5} className="py-8 text-center text-[11px] text-[var(--invoice-faint)]">
                No line items yet. Add an item in the editor.
              </td>
            </tr>
          )}
          {totals.lines.map((line, index) => (
            <tr key={line.id || index} className="invoice-block">
              <td>
                <p className="font-medium">
                  {line.description || "Untitled item"}
                </p>
                {Number(line.discount || 0) > 0 && (
                  <p className="mt-0.5 text-[9.5px] text-[var(--invoice-faint)]">
                    Line discount -{money(line.discount)}
                  </p>
                )}
                {line.notes && (
                  <p className="mt-0.5 whitespace-pre-line text-[9.5px] italic text-[var(--invoice-faint)]">
                    {line.notes}
                  </p>
                )}
              </td>
              <td className="text-right tabular-nums">
                {line.quantity || "-"}
                {line.unitOfMeasure ? ` ${line.unitOfMeasure}` : ""}
              </td>
              <td className="text-right tabular-nums">{money(line.unitPrice || 0)}</td>
              <td className="text-right tabular-nums">
                {line.taxExempt
                  ? "Exempt"
                  : line.taxRate
                  ? `${line.taxRate}%`
                  : "-"}
              </td>
              <td className="text-right font-medium tabular-nums">
                {money(line.gross || 0)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Totals */}
      <section className="invoice-block mt-5 flex justify-end">
        <div className="w-full max-w-[270px]">
          <Row label="Subtotal" value={money(totals.grossSubtotal)} />
          {Number(totals.lineDiscountTotal) > 0 && (
            <Row
              label="Line discounts"
              value={`-${money(totals.lineDiscountTotal)}`}
            />
          )}
          {Number(totals.invoiceDiscount) > 0 && (
            <Row
              label="Invoice discount"
              value={`-${money(totals.invoiceDiscount)}`}
            />
          )}
          {totals.taxBreakdown.map((group) => (
            <Row
              key={group.rate}
              label={`Tax (${group.rate}%)`}
              value={money(group.tax)}
            />
          ))}
          {Number(totals.taxTotal) === 0 && (
            <Row label="Tax" value={money(0)} muted />
          )}
          <div className="my-2 border-t border-[var(--invoice-line)]" />
          <Row label="Total" value={money(totals.total)} strong />
          {Number(totals.amountPaid) > 0 && (
            <Row label="Amount paid" value={`-${money(totals.amountPaid)}`} muted />
          )}
          <div className="mt-1.5 rounded-[5px] bg-[var(--invoice-soft)] px-2.5 py-2">
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--invoice-muted)]">
                {totals.isOverpaid ? "Credit due" : "Balance due"}
              </span>
              <span className="text-[15px] font-semibold tabular-nums">
                {money(totals.isOverpaid ? totals.credit : totals.outstanding)}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Instructions and terms */}
      <section className="invoice-block mt-7 grid grid-cols-1 gap-5 border-t border-[var(--invoice-line)] pt-5 sm:grid-cols-2">
        <div>
          <p className="invoice-kicker">Payment instructions</p>
          <p className="mt-1 whitespace-pre-line text-[10.5px] leading-relaxed text-[var(--invoice-muted)]">
            {invoice.paymentInstructions || "Add payment details in the editor."}
          </p>
        </div>
        <div>
          <p className="invoice-kicker">Notes & terms</p>
          <p className="mt-1 whitespace-pre-line text-[10.5px] leading-relaxed text-[var(--invoice-muted)]">
            {[invoice.notes, invoice.terms].filter(Boolean).join("\n\n") ||
              "Add notes and terms in the editor."}
          </p>
        </div>
      </section>

      <footer className="invoice-block mt-8 flex items-center justify-between border-t border-[var(--invoice-line)] pt-3 text-[9.5px] text-[var(--invoice-faint)]">
        <span>{issuer.name || "ProFinance invoice"}</span>
        <span className="tabular-nums">
          {number || "Draft"} {isDraft ? "" : `- ${statusMeta?.label || "Issued"}`}
        </span>
      </footer>
    </article>
  );
}
