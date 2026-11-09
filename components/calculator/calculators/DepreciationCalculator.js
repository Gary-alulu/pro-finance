"use client";
// components/calculator/calculators/DepreciationCalculator.js
// Fixed asset depreciation engine supporting straight-line and declining-balance schedules.

import { useState, useEffect, useMemo } from "react";
import CalculatorDisplay from "../CalculatorDisplay";
import { calculateDepreciation } from "@/lib/calculator/depreciation";
import { formatNumber } from "@/lib/finance/currency";
import { Clock, Box, AlertCircle } from "lucide-react";

export default function DepreciationCalculator({ onConvertAction, onSaveLog }) {
  const [acquisitionCost, setAcquisitionCost] = useState("3000000");
  const [salvageValue, setSalvageValue] = useState("600000");
  const [usefulLifeYears, setUsefulLifeYears] = useState("6");
  const [method, setMethod] = useState("straight_line");

  // Platform assets for pre-fill
  const [platformAssets, setPlatformAssets] = useState([]);
  const [selectedAssetId, setSelectedAssetId] = useState("");

  useEffect(() => {
    async function loadAssets() {
      try {
        const res = await fetch("/api/calculator/context?entityType=asset");
        if (res.ok) {
          const data = await res.json();
          setPlatformAssets(data.assets || []);
        }
      } catch (err) {
        console.warn("Failed to load user assets", err);
      }
    }
    loadAssets();
  }, []);

  const handleSelectAsset = (id) => {
    setSelectedAssetId(id);
    const found = platformAssets.find((a) => a.id === id);
    if (found) {
      setAcquisitionCost(found.purchasePrice || found.currentValue || "0");
      // Default salvage value estimate: 10%
      const estSalvage = Math.round(Number(found.purchasePrice || found.currentValue || "0") * 0.1).toString();
      setSalvageValue(estSalvage);
    }
  };

  const results = useMemo(() => {
    try {
      if (!acquisitionCost || !usefulLifeYears) return null;
      return calculateDepreciation({
        acquisitionCost,
        salvageValue: salvageValue || "0",
        usefulLifeYears,
        method,
      });
    } catch {
      return null;
    }
  }, [acquisitionCost, salvageValue, usefulLifeYears, method]);

  const yearOneDep = results?.annualSchedule?.[0]?.annualDepreciation || "0.00";

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <CalculatorDisplay
        expression={`Cost: KES ${formatNumber(acquisitionCost)} → Salvage: KES ${formatNumber(salvageValue)} over ${usefulLifeYears} yrs`}
        mainValue={formatNumber(yearOneDep)}
        currency="KES"
        mode={selectedAssetId ? "integrated" : "standalone"}
        subtitle={`First Year Depreciation (${method === "straight_line" ? "Straight-Line" : "Declining Balance"})`}
        onClear={() => {
          setAcquisitionCost("");
          setSalvageValue("");
          setSelectedAssetId("");
        }}
        onSave={() => {
          if (onSaveLog && results) {
            onSaveLog({
              calculatorType: "depreciation",
              title: `Depreciation: ${usefulLifeYears}Y Schedule for KSh ${formatNumber(acquisitionCost)}`,
              inputs: { acquisitionCost, salvageValue, usefulLifeYears, method },
              outputs: results,
              isSaved: true,
            });
          }
        }}
        onOpenActionPanel={
          results
            ? () =>
                onConvertAction?.({
                  calculatorType: "depreciation",
                  calculatedAmount: results.annualSchedule?.[0]?.endingCarryingValue || acquisitionCost,
                  formula: `End of Year 1 Carrying Value: KES ${results.annualSchedule?.[0]?.endingCarryingValue}`,
                  details: {
                    ...results,
                    assetId: selectedAssetId || undefined,
                    newAmount: results.annualSchedule?.[0]?.endingCarryingValue,
                    method: "depreciated_cost",
                    note: `Carrying value revised via ${method === "straight_line" ? "Straight Line" : "Declining"} depreciation schedule.`,
                  },
                })
            : null
        }
      />

      {/* Pre-fill from active platform assets */}
      {platformAssets.length > 0 && (
        <div className="p-3 rounded-xl bg-neutral-900 border border-neutral-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="text-xs text-neutral-300 flex items-center gap-2">
            <Box className="w-4 h-4 text-pink-400" />
            <span>Select an asset from your portfolio:</span>
          </div>
          <select
            value={selectedAssetId}
            onChange={(e) => handleSelectAsset(e.target.value)}
            className="px-3 py-1.5 rounded-lg bg-neutral-950 border border-neutral-800 text-xs text-white focus:border-pink-500 focus:outline-none"
          >
            <option value="">— Select Asset —</option>
            {platformAssets.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name} (KES {formatNumber(a.currentValue)})
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="p-5 rounded-2xl border border-neutral-800 bg-neutral-900/40 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-neutral-400 mb-1">Acquisition Cost (KES)</label>
            <input
              type="number"
              value={acquisitionCost}
              onChange={(e) => setAcquisitionCost(e.target.value)}
              placeholder="e.g. 3000000"
              className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-white text-sm focus:border-pink-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-neutral-400 mb-1">Estimated Salvage / Scrap Value (KES)</label>
            <input
              type="number"
              value={salvageValue}
              onChange={(e) => setSalvageValue(e.target.value)}
              placeholder="e.g. 600000"
              className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-white text-sm focus:border-pink-500 focus:outline-none"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-neutral-400 mb-1">Useful Life (Years)</label>
            <input
              type="number"
              value={usefulLifeYears}
              onChange={(e) => setUsefulLifeYears(e.target.value)}
              placeholder="e.g. 6"
              className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-white text-sm focus:border-pink-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-neutral-400 mb-1">Depreciation Method</label>
            <select
              value={method}
              onChange={(e) => setMethod(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-white text-sm focus:border-pink-500 focus:outline-none"
            >
              <option value="straight_line">Straight-Line Method (Uniform)</option>
              <option value="declining_balance">Declining Balance (150%)</option>
              <option value="double_declining">Double-Declining Balance (200%)</option>
            </select>
          </div>
        </div>

        {results?.annualSchedule?.length > 0 && (
          <div className="pt-3 border-t border-neutral-800">
            <div className="text-xs font-semibold text-neutral-400 mb-2">Annual Carrying Value & Depreciation Schedule</div>
            <div className="rounded-xl border border-neutral-800 overflow-x-auto max-h-56">
              <table className="w-full text-xs text-left">
                <thead className="bg-neutral-950 text-neutral-400 border-b border-neutral-800 sticky top-0">
                  <tr>
                    <th className="py-2 px-3">Year</th>
                    <th className="py-2 px-3">Beginning Value</th>
                    <th className="py-2 px-3">Depreciation</th>
                    <th className="py-2 px-3">Accumulated</th>
                    <th className="py-2 px-3 text-right">Ending Carrying Value</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-800/60 font-mono">
                  {results.annualSchedule.map((row) => (
                    <tr key={row.year} className="hover:bg-neutral-800/30">
                      <td className="py-1.5 px-3 text-neutral-300">Year {row.year}</td>
                      <td className="py-1.5 px-3 text-neutral-400">KES {formatNumber(row.beginningCarryingValue)}</td>
                      <td className="py-1.5 px-3 text-pink-400">−KES {formatNumber(row.annualDepreciation)}</td>
                      <td className="py-1.5 px-3 text-neutral-400">KES {formatNumber(row.accumulatedDepreciation)}</td>
                      <td className="py-1.5 px-3 text-right font-bold text-white">
                        KES {formatNumber(row.endingCarryingValue)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="flex items-start gap-2.5 p-3 rounded-xl bg-neutral-950 border border-neutral-800/80 text-xs text-neutral-400">
          <AlertCircle className="w-4 h-4 text-pink-400 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold text-neutral-200">Notice: </span>
            Accounting book depreciation, tax wear-and-tear allowances, and fair market resale values are distinct concepts. This calculator provides estimated book amortization.
          </div>
        </div>
      </div>
    </div>
  );
}

