"use client";
// components/invoices/InvoiceLineItemsEditor.js
// Controlled line-item editor. No internal money state: every change bubbles up.

import { GripVertical, Plus, Trash2 } from "lucide-react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Textarea from "@/components/ui/Textarea";
import { formatCurrency } from "@/lib/finance/currency";
import { createLineItem } from "@/lib/invoices/factories";
import { calculateLineItem } from "@/lib/invoices/calculations";
import { DISCOUNT_TYPES, TAX_TREATMENTS } from "@/lib/invoices/constants";

export default function InvoiceLineItemsEditor({
  items = [],
  onChange,
  currency = "KES",
  defaultTaxRate = "",
  defaultTaxExempt = false,
}) {
  const update = (id, patch) => {
    onChange(items.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  };

  const remove = (id) => {
    onChange(items.filter((item) => item.id !== id));
  };

  const add = () => {
    onChange([
      ...items,
      createLineItem({
        taxRate: defaultTaxRate,
        taxExempt: defaultTaxExempt,
      }),
    ]);
  };

  return (
    <div className="space-y-3">
      {items.length === 0 && (
        <div className="rounded-[var(--radius-lg)] border border-dashed border-[var(--color-border-strong)] bg-[var(--color-surface-2)]/40 px-4 py-8 text-center">
          <p className="text-sm font-medium text-[var(--color-text-primary)]">
            No line items yet
          </p>
          <p className="mt-1 text-xs text-[var(--color-text-tertiary)]">
            Add at least one item to calculate invoice totals.
          </p>
        </div>
      )}

      {items.map((item, index) => {
        const line = calculateLineItem(item);
        return (
          <div
            key={item.id}
            className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-3.5 shadow-xs"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <GripVertical
                  className="h-4 w-4 text-[var(--color-text-tertiary)]"
                  aria-hidden="true"
                />
                <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-text-tertiary)]">
                  Item {index + 1}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold tabular-nums text-[var(--color-text-primary)]">
                  {formatCurrency(line.total, currency)}
                </span>
                <button
                  type="button"
                  onClick={() => remove(item.id)}
                  className="rounded-[var(--radius-sm)] p-1.5 text-[var(--color-text-tertiary)] transition-colors hover:bg-[var(--color-coral-50)] hover:text-[var(--color-coral-600)]"
                  aria-label={`Remove item ${index + 1}`}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-12">
              <Input
                label="Description"
                containerClassName="col-span-2 sm:col-span-12"
                placeholder="What are you billing for?"
                value={item.description}
                onChange={(e) => update(item.id, { description: e.target.value })}
              />

              <Input
                label="Qty"
                type="number"
                min="0"
                step="any"
                inputMode="decimal"
                containerClassName="col-span-1 sm:col-span-2"
                value={item.quantity}
                onChange={(e) => update(item.id, { quantity: e.target.value })}
              />

              <Input
                label="Unit"
                placeholder="hrs, pcs"
                containerClassName="col-span-1 sm:col-span-2"
                value={item.unitOfMeasure}
                onChange={(e) => update(item.id, { unitOfMeasure: e.target.value })}
              />

              <Input
                label="Unit price"
                type="number"
                min="0"
                step="any"
                inputMode="decimal"
                containerClassName="col-span-2 sm:col-span-4"
                prefix={currency}
                value={item.unitPrice}
                onChange={(e) => update(item.id, { unitPrice: e.target.value })}
              />

              <Select
                label="Discount"
                containerClassName="col-span-1 sm:col-span-2"
                options={DISCOUNT_TYPES}
                value={item.discountType}
                onChange={(e) =>
                  update(item.id, {
                    discountType: e.target.value,
                    discountValue:
                      e.target.value === "none"
                        ? ""
                        : item.discountValue || "0",
                  })
                }
              />

              <Input
                label="Value"
                type="number"
                min="0"
                step="any"
                inputMode="decimal"
                containerClassName="col-span-1 sm:col-span-2"
                suffix={item.discountType === "percent" ? "%" : item.discountType === "amount" ? currency : ""}
                disabled={item.discountType === "none"}
                value={item.discountValue}
                onChange={(e) => update(item.id, { discountValue: e.target.value })}
              />

              <Select
                label="Tax"
                containerClassName="col-span-1 sm:col-span-2"
                options={TAX_TREATMENTS}
                value={item.taxExempt ? "exempt" : "taxable"}
                onChange={(e) =>
                  update(item.id, { taxExempt: e.target.value === "exempt" })
                }
              />

              <Input
                label="Rate %"
                type="number"
                min="0"
                step="any"
                inputMode="decimal"
                containerClassName="col-span-1 sm:col-span-2"
                disabled={item.taxExempt}
                value={item.taxRate}
                onChange={(e) => update(item.id, { taxRate: e.target.value })}
              />

              <Textarea
                label="Item notes"
                rows={2}
                containerClassName="col-span-2 sm:col-span-12"
                placeholder="Optional detail shown under the description"
                value={item.notes}
                onChange={(e) => update(item.id, { notes: e.target.value })}
              />
            </div>

            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-[var(--color-text-tertiary)]">
              <span>
                Gross{" "}
                <span className="tabular-nums text-[var(--color-text-secondary)]">
                  {formatCurrency(line.gross, currency)}
                </span>
              </span>
              <span>
                Tax{" "}
                <span className="tabular-nums text-[var(--color-text-secondary)]">
                  {formatCurrency(line.tax, currency)}
                </span>
              </span>
              <span>
                Line total{" "}
                <span className="tabular-nums text-[var(--color-text-secondary)]">
                  {formatCurrency(line.total, currency)}
                </span>
              </span>
            </div>
          </div>
        );
      })}

      <Button
        type="button"
        variant="outline"
        size="sm"
        icon={Plus}
        onClick={add}
        className="w-full border-dashed"
      >
        Add line item
      </Button>
    </div>
  );
}
