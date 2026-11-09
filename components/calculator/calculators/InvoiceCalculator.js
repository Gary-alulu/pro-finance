"use client";
// components/calculator/calculators/InvoiceCalculator.js
// Invoice line items, VAT calculations, invoice discounts, and payment balance breakdown.

import { useState, useMemo } from "react";
import CalculatorDisplay from "../CalculatorDisplay";
import { calculateInvoice } from "@/lib/calculator/invoiceCalc";
import { formatNumber } from "@/lib/finance/currency";
import { Receipt, Plus, Trash2, ArrowUpRight } from "lucide-react";
import Link from "next/link";

export default function InvoiceCalculator({ onConvertAction, onSaveLog }) {
  const [lines, setLines] = useState([
    { description: "Professional Consulting", quantity: "40", unitPrice: "3500", taxRate: "16", discount: "0" },
    { description: "System Architecture Audit", quantity: "1", unitPrice: "25000", taxRate: "16", discount: "0" },
  ]);
  const [invoiceDiscount, setInvoiceDiscount] = useState("0");
  const [amountPaid, setAmountPaid] = useState("0");

  const results = useMemo(() => {
    try {
      return calculateInvoice({
        lines: lines.map((l) => ({
          description: l.description,
          quantity: l.quantity,
          unitPrice: l.unitPrice,
          taxRate: l.taxRate,
          discountAmount: l.discount,
        })),
        invoiceDiscount: invoiceDiscount ? { type: "fixed", value: invoiceDiscount } : null,
        payments: amountPaid && Number(amountPaid) > 0 ? [{ amount: amountPaid }] : [],
      });
    } catch {
      return null;
    }
  }, [lines, invoiceDiscount, amountPaid]);

  const handleAddLine = () => {
    setLines((prev) => [
      ...prev,
      { description: "New Item", quantity: "1", unitPrice: "1000", taxRate: "16", discount: "0" },
    ]);
  };

  const handleRemoveLine = (idx) => {
    setLines((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleUpdateLine = (idx, field, val) => {
    setLines((prev) => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], [field]: val };
      return copy;
    });
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <CalculatorDisplay
        expression={`Subtotal: KES ${results ? formatNumber(results.subtotal) : "0"} + Tax (16% VAT): KES ${results ? formatNumber(results.taxTotal) : "0"}`}
        mainValue={results ? formatNumber(results.total) : "0.00"}
        currency="KES"
        mode="standalone"
        subtitle={`Outstanding Balance: KES ${results ? formatNumber(results.balanceRemaining) : "0.00"}`}
        onClear={() => {
          setLines([{ description: "", quantity: "1", unitPrice: "0", taxRate: "16", discount: "0" }]);
          setInvoiceDiscount("0");
          setAmountPaid("0");
        }}
        onSave={() => {
          if (onSaveLog && results) {
            onSaveLog({
              calculatorType: "invoice",
              title: `Invoice Total: KSh ${formatNumber(results.total)} (${lines.length} lines)`,
              inputs: { lines, invoiceDiscount, amountPaid },
              outputs: results,
              isSaved: true,
            });
          }
        }}
        onOpenActionPanel={
          results
            ? () =>
                onConvertAction?.({
                  calculatorType: "invoice",
                  calculatedAmount: results.total,
                  formula: `Invoice Total: KES ${results.total}`,
                  details: {
                    ...results,
                    lines,
                  },
                })
            : null
        }
      />

      <div className="p-5 rounded-2xl border border-neutral-800 bg-neutral-900/40 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Receipt className="w-4 h-4 text-cyan-400" />
            <span className="text-xs font-semibold text-neutral-300">Invoice Line Items</span>
          </div>
          <button
            type="button"
            onClick={handleAddLine}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-neutral-900 border border-neutral-800 hover:bg-neutral-800 text-xs text-white"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Item</span>
          </button>
        </div>

        <div className="space-y-2">
          {lines.map((line, idx) => (
            <div
              key={idx}
              className="grid grid-cols-12 gap-2 items-center p-2.5 rounded-xl bg-neutral-950 border border-neutral-800"
            >
              <div className="col-span-12 sm:col-span-5">
                <input
                  type="text"
                  value={line.description}
                  onChange={(e) => handleUpdateLine(idx, "description", e.target.value)}
                  placeholder="Item Description"
                  className="w-full px-2 py-1.5 rounded-lg bg-neutral-900 border border-neutral-800 text-white text-xs"
                />
              </div>
              <div className="col-span-3 sm:col-span-2">
                <input
                  type="number"
                  value={line.quantity}
                  onChange={(e) => handleUpdateLine(idx, "quantity", e.target.value)}
                  placeholder="Qty"
                  className="w-full px-2 py-1.5 rounded-lg bg-neutral-900 border border-neutral-800 text-white text-xs font-mono"
                  title="Quantity"
                />
              </div>
              <div className="col-span-4 sm:col-span-3">
                <input
                  type="number"
                  value={line.unitPrice}
                  onChange={(e) => handleUpdateLine(idx, "unitPrice", e.target.value)}
                  placeholder="Unit Price"
                  className="w-full px-2 py-1.5 rounded-lg bg-neutral-900 border border-neutral-800 text-white text-xs font-mono"
                  title="Unit Price (KES)"
                />
              </div>
              <div className="col-span-3 sm:col-span-1">
                <input
                  type="number"
                  value={line.taxRate}
                  onChange={(e) => handleUpdateLine(idx, "taxRate", e.target.value)}
                  placeholder="Tax %"
                  className="w-full px-1.5 py-1.5 rounded-lg bg-neutral-900 border border-neutral-800 text-white text-xs font-mono"
                  title="Tax Rate %"
                />
              </div>
              <div className="col-span-2 sm:col-span-1 flex justify-center">
                <button
                  type="button"
                  disabled={lines.length <= 1}
                  onClick={() => handleRemoveLine(idx)}
                  className="p-1 rounded text-neutral-500 hover:text-red-400 disabled:opacity-30"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Global Discount & Payments */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-neutral-800">
          <div>
            <label className="block text-xs font-medium text-neutral-400 mb-1">Invoice Discount (KES)</label>
            <input
              type="number"
              value={invoiceDiscount}
              onChange={(e) => setInvoiceDiscount(e.target.value)}
              placeholder="0.00"
              className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-white text-xs font-mono focus:border-cyan-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-neutral-400 mb-1">Partial Payment / Received (KES)</label>
            <input
              type="number"
              value={amountPaid}
              onChange={(e) => setAmountPaid(e.target.value)}
              placeholder="0.00"
              className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-white text-xs font-mono focus:border-cyan-500 focus:outline-none"
            />
          </div>
        </div>

        {results && (
          <div className="grid grid-cols-4 gap-2.5 pt-3 border-t border-neutral-800 text-center">
            <div className="p-2.5 rounded-xl bg-neutral-950 border border-neutral-800">
              <div className="text-[10px] text-neutral-500 uppercase">Subtotal</div>
              <div className="text-xs font-bold text-white mt-0.5">KES {formatNumber(results.subtotal)}</div>
            </div>
            <div className="p-2.5 rounded-xl bg-neutral-950 border border-neutral-800">
              <div className="text-[10px] text-neutral-500 uppercase">VAT / Tax</div>
              <div className="text-xs font-bold text-cyan-400 mt-0.5">KES {formatNumber(results.taxTotal)}</div>
            </div>
            <div className="p-2.5 rounded-xl bg-neutral-950 border border-neutral-800">
              <div className="text-[10px] text-neutral-500 uppercase">Total Invoice</div>
              <div className="text-xs font-bold text-white mt-0.5">KES {formatNumber(results.total)}</div>
            </div>
            <div className="p-2.5 rounded-xl bg-neutral-950 border border-neutral-800">
              <div className="text-[10px] text-neutral-500 uppercase">Balance Due</div>
              <div className="text-xs font-bold text-amber-400 mt-0.5">KES {formatNumber(results.balanceRemaining)}</div>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between pt-2">
          <span className="text-xs text-neutral-500">Need to generate and issue a formal invoice?</span>
          <Link
            href="/invoices"
            className="flex items-center gap-1 text-xs text-cyan-400 hover:text-cyan-300 font-medium"
          >
            <span>Open Invoice Generator</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}

