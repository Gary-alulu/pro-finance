// lib/invoices/numbering.js
// Invoice number formatting.
//
// Stage 1: this is a PREVIEW ONLY. The browser must never allocate the
// authoritative number. Stage 2 will reserve numbers atomically on the server
// with a unique (ownerId, direction, invoiceNumber) index.
//
// Draft numbering policy:
//   - A draft does not consume or reserve a number.
//   - Drafts display the next suggested number, derived from settings.
//   - Issuing allocates the real number; issued numbers are never renumbered.
//   - Duplicating a draft starts a new draft with no consumed number.

export function formatInvoiceNumber(config = {}, { year, sequence } = {}) {
  const prefix = String(config.prefix ?? "INV").trim() || "INV";
  const separator = config.separator === undefined ? "-" : String(config.separator);
  const includeYear = config.includeYear !== false;
  const padding = clampPadding(config.padding);
  const seq = Math.max(parseInt(sequence ?? config.nextNumber ?? 1, 10) || 1, 1);
  const resolvedYear = year ?? new Date().getFullYear();

  const parts = [prefix];
  if (includeYear) parts.push(String(resolvedYear));
  parts.push(String(seq).padStart(padding, "0"));
  return parts.join(separator);
}

/**
 * Number to display for an invoice or draft. Issued numbers always win.
 * Drafts only show the next suggestion; nothing is reserved.
 */
export function previewInvoiceNumber(invoice, settings = {}) {
  if (invoice?.invoiceNumber) return invoice.invoiceNumber;
  const numbering = settings?.numbering || {};
  return formatInvoiceNumber(numbering, {
    year: invoiceYear(invoice?.issueDate),
    sequence: numbering.nextNumber,
  });
}

export function clampPadding(value) {
  const n = parseInt(value, 10);
  if (Number.isNaN(n)) return 4;
  return Math.min(Math.max(n, 1), 12);
}

/**
 * Year used for the number preview. Parse YYYY-MM-DD without timezone shifts.
 */
export function invoiceYear(dateValue) {
  if (!dateValue) return new Date().getFullYear();
  const match = String(dateValue).match(/^(\d{4})-/);
  if (match) return Number(match[1]);
  const parsed = new Date(dateValue);
  return Number.isNaN(parsed.getTime())
    ? new Date().getFullYear()
    : parsed.getFullYear();
}
