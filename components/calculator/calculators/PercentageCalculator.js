"use client";
// components/calculator/calculators/PercentageCalculator.js
// Percentage, markup, margin, discount, and ownership equity calculator.

import { useState, useMemo } from "react";
import CalculatorDisplay from "../CalculatorDisplay";
import {
  calculatePercentOf,
  calculatePercentIs,
  calculatePercentageChange,
  calculatePercentageDifference,
  calculateDiscount,
  calculateMarkup,
  calculateMargin,
  calculateOwnershipShare,
} from "@/lib/calculator/percentage";
import { formatNumber } from "@/lib/finance/currency";
import { Info } from "lucide-react";

const OPERATIONS = [
  { id: "percent_of", label: "What is X% of Y?" },
  { id: "percent_is", label: "X is what % of Y?" },
  { id: "change", label: "Percentage Increase / Decrease" },
  { id: "discount", label: "Discount Pricing" },
  { id: "markup", label: "Markup (Cost + Markup %)" },
  { id: "margin", label: "Margin (Revenue − Cost)" },
  { id: "ownership", label: "Ownership Equity Share" },
];

export default function PercentageCalculator({ onConvertAction, onSaveLog }) {
  const [operation, setOperation] = useState("percent_of");
  const [inputs, setInputs] = useState({
    percent_of: { percentage: "15", total: "50000" },
    percent_is: { part: "7500", total: "50000" },
    change: { oldValue: "100000", newValue: "125000" },
    discount: { originalPrice: "50000", discountPercentage: "15" },
    markup: { costPrice: "10000", markupPercentage: "25" },
    margin: { sellingPrice: "12500", costPrice: "10000" },
    ownership: { totalValue: "10000000", ownershipPercentage: "50" },
  });

  const currentInputs = useMemo(() => inputs[operation] || {}, [inputs, operation]);

  const handleInputChange = (field, val) => {
    setInputs((prev) => ({
      ...prev,
      [operation]: {
        ...prev[operation],
        [field]: val,
      },
    }));
  };

  const calculationResult = useMemo(() => {
    try {
      const p = currentInputs;
      switch (operation) {
        case "percent_of": {
          if (!p.percentage || !p.total) return null;
          return calculatePercentOf(p.percentage, p.total);
        }
        case "percent_is": {
          if (!p.part || !p.total) return null;
          return calculatePercentIs(p.part, p.total);
        }
        case "change": {
          if (!p.oldValue || !p.newValue) return null;
          return calculatePercentageChange(p.oldValue, p.newValue);
        }
        case "discount": {
          if (!p.originalPrice || !p.discountPercentage) return null;
          return calculateDiscount(p.originalPrice, p.discountPercentage);
        }
        case "markup": {
          if (!p.costPrice || !p.markupPercentage) return null;
          return calculateMarkup(p.costPrice, p.markupPercentage);
        }
        case "margin": {
          if (!p.sellingPrice || !p.costPrice) return null;
          return calculateMargin(p.sellingPrice, p.costPrice);
        }
        case "ownership": {
          if (!p.totalValue || !p.ownershipPercentage) return null;
          return calculateOwnershipShare(p.totalValue, p.ownershipPercentage);
        }
        default:
          return null;
      }
    } catch {
      return null;
    }
  }, [operation, currentInputs]);

  // Derive display values
  let mainDisplay = "0.00";
  let subtitle = "";
  if (calculationResult) {
    if (operation === "percent_of") {
      mainDisplay = formatNumber(calculationResult.result);
      subtitle = calculationResult.formula;
    } else if (operation === "percent_is") {
      mainDisplay = `${calculationResult.percentage}%`;
      subtitle = calculationResult.formula;
    } else if (operation === "change") {
      mainDisplay = `${calculationResult.isIncrease ? "+" : ""}${calculationResult.percentageChange}%`;
      subtitle = calculationResult.formula;
    } else if (operation === "discount") {
      mainDisplay = formatNumber(calculationResult.finalPrice);
      subtitle = `Discount: KSh ${formatNumber(calculationResult.discountAmount)} (${calculationResult.formula})`;
    } else if (operation === "markup") {
      mainDisplay = formatNumber(calculationResult.sellingPrice);
      subtitle = `Profit: KSh ${formatNumber(calculationResult.profit)} · Resulting Margin: ${calculationResult.resultingMarginPercent}%`;
    } else if (operation === "margin") {
      mainDisplay = `${calculationResult.marginPercent}%`;
      subtitle = `Profit: KSh ${formatNumber(calculationResult.profit)} · Equivalent Markup: ${calculationResult.equivalentMarkupPercent}%`;
    } else if (operation === "ownership") {
      mainDisplay = formatNumber(calculationResult.attributableShare);
      subtitle = calculationResult.formula;
    }
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <CalculatorDisplay
        expression={subtitle}
        mainValue={mainDisplay}
        currency={operation === "percent_is" || operation === "margin" || operation === "change" ? "%" : "KES"}
        mode="standalone"
        subtitle={OPERATIONS.find((o) => o.id === operation)?.label}
        onClear={() => {
          setInputs((prev) => ({
            ...prev,
            [operation]: {},
          }));
        }}
        onSave={() => {
          if (onSaveLog && calculationResult) {
            onSaveLog({
              calculatorType: "percentage",
              title: `Percentage: ${OPERATIONS.find((o) => o.id === operation)?.label}`,
              inputs: { operation, ...currentInputs },
              outputs: calculationResult,
              isSaved: true,
            });
          }
        }}
        onOpenActionPanel={
          calculationResult
            ? () =>
                onConvertAction?.({
                  calculatorType: "percentage",
                  calculatedAmount: mainDisplay,
                  formula: subtitle,
                  details: calculationResult,
                })
            : null
        }
      />

      {/* Operation selector pills */}
      <div className="flex flex-wrap gap-2">
        {OPERATIONS.map((op) => (
          <button
            key={op.id}
            type="button"
            onClick={() => setOperation(op.id)}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors ${
              operation === op.id
                ? "bg-sky-500/20 text-sky-300 border border-sky-500/40"
                : "bg-neutral-900 text-neutral-400 border border-neutral-800 hover:bg-neutral-800 hover:text-white"
            }`}
          >
            {op.label}
          </button>
        ))}
      </div>

      {/* Dynamic input form */}
      <div className="p-5 rounded-2xl border border-neutral-800 bg-neutral-900/40 space-y-4">
        {operation === "percent_of" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-neutral-400 mb-1">Percentage (%)</label>
              <input
                type="number"
                value={currentInputs.percentage || ""}
                onChange={(e) => handleInputChange("percentage", e.target.value)}
                placeholder="e.g. 15"
                className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-white text-sm focus:border-sky-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-neutral-400 mb-1">Total Amount (KES)</label>
              <input
                type="number"
                value={currentInputs.total || ""}
                onChange={(e) => handleInputChange("total", e.target.value)}
                placeholder="e.g. 50000"
                className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-white text-sm focus:border-sky-500 focus:outline-none"
              />
            </div>
          </div>
        )}

        {operation === "percent_is" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-neutral-400 mb-1">Part Value (X)</label>
              <input
                type="number"
                value={currentInputs.part || ""}
                onChange={(e) => handleInputChange("part", e.target.value)}
                placeholder="e.g. 7500"
                className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-white text-sm focus:border-sky-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-neutral-400 mb-1">Total Value (Y)</label>
              <input
                type="number"
                value={currentInputs.total || ""}
                onChange={(e) => handleInputChange("total", e.target.value)}
                placeholder="e.g. 50000"
                className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-white text-sm focus:border-sky-500 focus:outline-none"
              />
            </div>
          </div>
        )}

        {operation === "change" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-neutral-400 mb-1">Old / Base Value</label>
              <input
                type="number"
                value={currentInputs.oldValue || ""}
                onChange={(e) => handleInputChange("oldValue", e.target.value)}
                placeholder="e.g. 100000"
                className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-white text-sm focus:border-sky-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-neutral-400 mb-1">New Value</label>
              <input
                type="number"
                value={currentInputs.newValue || ""}
                onChange={(e) => handleInputChange("newValue", e.target.value)}
                placeholder="e.g. 125000"
                className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-white text-sm focus:border-sky-500 focus:outline-none"
              />
            </div>
          </div>
        )}

        {operation === "discount" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-neutral-400 mb-1">Original Price (KES)</label>
              <input
                type="number"
                value={currentInputs.originalPrice || ""}
                onChange={(e) => handleInputChange("originalPrice", e.target.value)}
                placeholder="e.g. 50000"
                className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-white text-sm focus:border-sky-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-neutral-400 mb-1">Discount Rate (%)</label>
              <input
                type="number"
                value={currentInputs.discountPercentage || ""}
                onChange={(e) => handleInputChange("discountPercentage", e.target.value)}
                placeholder="e.g. 15"
                className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-white text-sm focus:border-sky-500 focus:outline-none"
              />
            </div>
          </div>
        )}

        {operation === "markup" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-neutral-400 mb-1">Cost Price (KES)</label>
              <input
                type="number"
                value={currentInputs.costPrice || ""}
                onChange={(e) => handleInputChange("costPrice", e.target.value)}
                placeholder="e.g. 10000"
                className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-white text-sm focus:border-sky-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-neutral-400 mb-1">Markup Percentage (%)</label>
              <input
                type="number"
                value={currentInputs.markupPercentage || ""}
                onChange={(e) => handleInputChange("markupPercentage", e.target.value)}
                placeholder="e.g. 25"
                className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-white text-sm focus:border-sky-500 focus:outline-none"
              />
            </div>
          </div>
        )}

        {operation === "margin" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-neutral-400 mb-1">Selling Price / Revenue</label>
              <input
                type="number"
                value={currentInputs.sellingPrice || ""}
                onChange={(e) => handleInputChange("sellingPrice", e.target.value)}
                placeholder="e.g. 12500"
                className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-white text-sm focus:border-sky-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-neutral-400 mb-1">Cost of Goods Sold (COGS)</label>
              <input
                type="number"
                value={currentInputs.costPrice || ""}
                onChange={(e) => handleInputChange("costPrice", e.target.value)}
                placeholder="e.g. 10000"
                className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-white text-sm focus:border-sky-500 focus:outline-none"
              />
            </div>
          </div>
        )}

        {operation === "ownership" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-neutral-400 mb-1">Total Valuation (KES)</label>
              <input
                type="number"
                value={currentInputs.totalValue || ""}
                onChange={(e) => handleInputChange("totalValue", e.target.value)}
                placeholder="e.g. 10000000"
                className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-white text-sm focus:border-sky-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-neutral-400 mb-1">Your Ownership Stake (%)</label>
              <input
                type="number"
                value={currentInputs.ownershipPercentage || ""}
                onChange={(e) => handleInputChange("ownershipPercentage", e.target.value)}
                placeholder="e.g. 50"
                className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-white text-sm focus:border-sky-500 focus:outline-none"
              />
            </div>
          </div>
        )}

        {/* Commercial Distinction Notice */}
        {(operation === "markup" || operation === "margin") && (
          <div className="flex items-start gap-2.5 p-3 rounded-xl bg-neutral-950 border border-neutral-800/80 text-xs text-neutral-400">
            <Info className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-neutral-200">Accounting Rule: </span>
              Markup is calculated on cost (\(\text{Profit} \div \text{Cost}\)), whereas Margin is calculated on selling price (\(\text{Profit} \div \text{Revenue}\)). A 25% markup equals a 20% margin.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

