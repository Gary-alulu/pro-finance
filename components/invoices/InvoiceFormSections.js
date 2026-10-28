"use client";
// components/invoices/InvoiceFormSections.js
// Grouped, controlled form sections for the invoice workspace.

import { useRef } from "react";
import {
  Building2,
  CalendarDays,
  Lock,
  MessageSquareText,
  SlidersHorizontal,
  Upload,
  UserRound,
  X,
} from "lucide-react";
import { useToast } from "@/components/providers/ToastProvider";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Textarea from "@/components/ui/Textarea";
import { formatCurrency, SUPPORTED_CURRENCIES } from "@/lib/finance/currency";
import { DUE_DATE_PRESETS, INVOICE_DIRECTIONS } from "@/lib/invoices/constants";
import { addDaysISO } from "@/lib/invoices/factories";

const MAX_LOGO_BYTES = 150 * 1024;

const CURRENCY_OPTIONS = SUPPORTED_CURRENCIES.map((currency) => ({
  value: currency.code,
  label: `${currency.code} - ${currency.name}`,
}));

export function Panel({ icon: Icon, title, description, action, children }) {
  return (
    <section className="rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-xs sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-2.5">
          {Icon && (
            <div className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-surface-2)] text-[var(--color-text-secondary)]">
              <Icon className="h-4 w-4" aria-hidden="true" />
            </div>
          )}
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">
              {title}
            </h2>
            {description && (
              <p className="mt-0.5 text-xs leading-relaxed text-[var(--color-text-tertiary)]">
                {description}
              </p>
            )}
          </div>
        </div>
        {action}
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

export function IssuerSection({ issuer = {}, onChange }) {
  const { error } = useToast();
  const fileRef = useRef(null);

  const handleLogo = (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      error("Choose an image file for the logo.");
      return;
    }
    if (file.size > MAX_LOGO_BYTES) {
      error("Logo must be 150 KB or smaller.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => onChange({ logo: String(reader.result || "") });
    reader.onerror = () => error("Could not read that image.");
    reader.readAsDataURL(file);
  };

  return (
    <Panel
      icon={Building2}
      title="Your business"
      description="Shown at the top of the invoice and saved with this draft."
      action={
        <div className="flex items-center gap-1.5">
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleLogo}
          />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            icon={Upload}
            onClick={() => fileRef.current?.click()}
          >
            Logo
          </Button>
          {issuer.logo && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              icon={X}
              onClick={() => onChange({ logo: "" })}
              aria-label="Remove logo"
            />
          )}
        </div>
      }
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Input
          label="Business name"
          placeholder="Acme Studio"
          value={issuer.name || ""}
          onChange={(e) => onChange({ name: e.target.value })}
        />
        <Input
          label="Email"
          type="email"
          placeholder="billing@acme.com"
          value={issuer.email || ""}
          onChange={(e) => onChange({ email: e.target.value })}
        />
        <Input
          label="Phone"
          placeholder="+254 700 000 000"
          value={issuer.phone || ""}
          onChange={(e) => onChange({ phone: e.target.value })}
        />
        <Input
          label="Tax PIN"
          placeholder="P051234567X"
          value={issuer.taxId || ""}
          onChange={(e) => onChange({ taxId: e.target.value })}
        />
        <Textarea
          label="Address"
          rows={3}
          containerClassName="sm:col-span-2"
          placeholder="Street, city, country"
          value={issuer.address || ""}
          onChange={(e) => onChange({ address: e.target.value })}
        />
      </div>
    </Panel>
  );
}

export function InvoiceMetaSection({ invoice, onChange, numberPreview }) {
  return (
    <Panel
      icon={CalendarDays}
      title="Invoice details"
      description="Direction, dates and currency."
    >
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Select
          label="Direction"
          containerClassName="col-span-2 sm:col-span-2"
          options={INVOICE_DIRECTIONS.map((direction) => ({
            value: direction.value,
            label: direction.label,
          }))}
          value={invoice.direction}
          onChange={(e) => onChange({ direction: e.target.value })}
        />

        <Select
          label="Currency"
          containerClassName="col-span-2 sm:col-span-2"
          options={CURRENCY_OPTIONS}
          value={invoice.currency}
          onChange={(e) => onChange({ currency: e.target.value })}
        />

        <Input
          label="Reference / title"
          containerClassName="col-span-2"
          placeholder="Website redesign - phase 1"
          value={invoice.title || ""}
          onChange={(e) => onChange({ title: e.target.value })}
        />

        <Input
          label="Purchase order"
          containerClassName="col-span-2"
          placeholder="PO-1042"
          value={invoice.purchaseOrder || ""}
          onChange={(e) => onChange({ purchaseOrder: e.target.value })}
        />

        <Input
          label="Issue date"
          type="date"
          containerClassName="col-span-1 sm:col-span-2"
          value={invoice.issueDate || ""}
          onChange={(e) => onChange({ issueDate: e.target.value })}
        />

        <Input
          label="Due date"
          type="date"
          containerClassName="col-span-1 sm:col-span-2"
          value={invoice.dueDate || ""}
          onChange={(e) => onChange({ dueDate: e.target.value })}
        />

        <div className="col-span-2 flex flex-wrap items-center gap-1.5 sm:col-span-4">
          <span className="mr-1 text-[11px] text-[var(--color-text-tertiary)]">
            Due in
          </span>
          {DUE_DATE_PRESETS.map((preset) => (
            <button
              key={preset.value}
              type="button"
              onClick={() =>
                onChange({ dueDate: addDaysISO(invoice.issueDate, preset.value) })
              }
              className="rounded-full border border-[var(--color-border)] bg-[var(--color-surface-2)] px-2.5 py-1 text-[11px] font-medium text-[var(--color-text-secondary)] transition-colors hover:border-[var(--color-emerald-200)] hover:text-[var(--color-emerald-700)]"
            >
              {preset.label}
            </button>
          ))}
        </div>

        <div className="col-span-2 flex items-start gap-2 rounded-[var(--radius-md)] border border-dashed border-[var(--color-border-strong)] bg-[var(--color-surface-2)]/50 px-3 py-2.5 sm:col-span-4">
          <Lock
            className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-[var(--color-text-tertiary)]"
            aria-hidden="true"
          />
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-tertiary)]">
              Suggested number
            </p>
            <p className="text-sm font-semibold tabular-nums text-[var(--color-text-primary)]">
              {numberPreview}
            </p>
            <p className="mt-0.5 text-[11px] leading-relaxed text-[var(--color-text-tertiary)]">
              Drafts do not reserve a number. Issuing allocates the next number
              atomically on the server (Stage 2).
            </p>
          </div>
        </div>
      </div>
    </Panel>
  );
}

export function RecipientSection({
  recipient = {},
  deliveryAddress,
  onChange,
  onDeliveryChange,
}) {
  return (
    <Panel
      icon={UserRound}
      title="Bill to"
      description={
        "The client receiving this invoice. For incoming invoices, enter the supplier."
      }
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Input
          label="Name"
          placeholder="Client or supplier name"
          value={recipient.name || ""}
          onChange={(e) => onChange({ name: e.target.value })}
        />
        <Input
          label="Email"
          type="email"
          placeholder="accounts@client.com"
          value={recipient.email || ""}
          onChange={(e) => onChange({ email: e.target.value })}
        />
        <Input
          label="Phone"
          placeholder="+254 700 000 000"
          value={recipient.phone || ""}
          onChange={(e) => onChange({ phone: e.target.value })}
        />
        <Input
          label="Tax PIN"
          placeholder="P051234567X"
          value={recipient.taxId || ""}
          onChange={(e) => onChange({ taxId: e.target.value })}
        />
        <Textarea
          label="Billing address"
          rows={3}
          containerClassName="sm:col-span-2"
          placeholder="Street, city, country"
          value={recipient.address || ""}
          onChange={(e) => onChange({ address: e.target.value })}
        />
        <Textarea
          label="Delivery address (optional)"
          rows={2}
          containerClassName="sm:col-span-2"
          placeholder="Where goods or services were delivered"
          value={deliveryAddress || ""}
          onChange={(e) => onDeliveryChange(e.target.value)}
        />
      </div>
    </Panel>
  );
}

export function AdjustmentsSection({ invoice, totals, onChange }) {
  const discount = invoice.discount || { enabled: false, type: "percent", value: "" };
  const setDiscount = (patch) =>
    onChange({ discount: { ...discount, ...patch } });

  return (
    <Panel
      icon={SlidersHorizontal}
      title="Adjustments"
      description="Invoice-level discount, tax treatment and payments."
    >
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <label className="col-span-2 flex cursor-pointer items-start gap-2.5 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-2)]/40 px-3 py-2.5 sm:col-span-4">
          <input
            type="checkbox"
            className="mt-0.5 h-4 w-4 accent-[var(--color-emerald-600)]"
            checked={Boolean(discount.enabled)}
            onChange={(e) => setDiscount({ enabled: e.target.checked })}
          />
          <span>
            <span className="block text-xs font-medium text-[var(--color-text-primary)]">
              Apply an invoice-level discount
            </span>
            <span className="mt-0.5 block text-[11px] text-[var(--color-text-tertiary)]">
              Allocated proportionally across line items after line discounts.
            </span>
          </span>
        </label>

        <Select
          label="Discount type"
          containerClassName="col-span-1 sm:col-span-2"
          value={discount.type}
          disabled={!discount.enabled}
          onChange={(e) => setDiscount({ type: e.target.value })}
        >
          <option value="percent">Percent</option>
          <option value="amount">Fixed amount</option>
        </Select>

        <Input
          label="Discount value"
          type="number"
          min="0"
          step="any"
          inputMode="decimal"
          containerClassName="col-span-1 sm:col-span-2"
          disabled={!discount.enabled}
          suffix={discount.type === "percent" ? "%" : invoice.currency}
          value={discount.value}
          onChange={(e) => setDiscount({ value: e.target.value })}
        />

        <div className="col-span-2 rounded-[var(--radius-md)] bg-[var(--color-surface-2)] px-3 py-2 text-xs text-[var(--color-text-secondary)] sm:col-span-2">
          Discount applied{" "}
          <span className="font-semibold tabular-nums">
            {formatCurrency(totals.invoiceDiscount, invoice.currency)}
          </span>
        </div>

        <Input
          label="Amount paid"
          type="number"
          min="0"
          step="any"
          inputMode="decimal"
          containerClassName="col-span-2 sm:col-span-2"
          prefix={invoice.currency}
          value={invoice.amountPaid ?? ""}
          onChange={(e) => onChange({ amountPaid: e.target.value })}
          helperText="Unpaid or overpaid amounts are reflected in the preview."
        />
      </div>
    </Panel>
  );
}

export function ContentSection({ invoice, onChange }) {
  return (
    <Panel
      icon={MessageSquareText}
      title="Payment and terms"
      description="Payment instructions, notes and terms shown on the invoice."
    >
      <div className="grid grid-cols-1 gap-3">
        <Textarea
          label="Payment instructions"
          rows={3}
          placeholder="Bank name, account number, mobile money, payment link..."
          value={invoice.paymentInstructions || ""}
          onChange={(e) => onChange({ paymentInstructions: e.target.value })}
        />
        <Textarea
          label="Notes"
          rows={2}
          placeholder="A short message for the client"
          value={invoice.notes || ""}
          onChange={(e) => onChange({ notes: e.target.value })}
        />
        <Textarea
          label="Terms"
          rows={2}
          placeholder="Late payment terms, validity, scope exclusions..."
          value={invoice.terms || ""}
          onChange={(e) => onChange({ terms: e.target.value })}
        />
      </div>
    </Panel>
  );
}
