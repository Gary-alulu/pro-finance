"use client";
// components/calculator/calculators/NetWorthCalculator.js
// Net worth position calculator supporting standalone manual entries and live platform synchronization.

import { useState, useEffect, useMemo, useCallback } from "react";
import CalculatorDisplay from "../CalculatorDisplay";
import { calculateStandaloneNetWorth } from "@/lib/calculator/netWorth";
import { formatNumber } from "@/lib/finance/currency";
import { Plus, Trash2, RefreshCw, Scale, ShieldCheck } from "lucide-react";

export default function NetWorthCalculator({ onConvertAction, onSaveLog }) {
  const [mode, setMode] = useState("standalone"); // "standalone" or "integrated"

  // Standalone manual lists
  const [manualAssets, setManualAssets] = useState([
    { name: "Primary Residence", amount: "12000000", ownershipPercentage: 100 },
    { name: "Vehicle", amount: "2500000", ownershipPercentage: 100 },
    { name: "Bank Deposits & MMF", amount: "1800000", ownershipPercentage: 100 },
  ]);

  const [manualLiabilities, setManualLiabilities] = useState([
    { name: "Mortgage", amount: "6500000" },
    { name: "Car Loan", amount: "800000" },
  ]);

  // Integrated platform data
  const [platformData, setPlatformData] = useState({ assets: [], liabilities: [] });
  const [loadingPlatform, setLoadingPlatform] = useState(false);

  const fetchPlatformData = useCallback(async () => {
    setLoadingPlatform(true);
    try {
      const res = await fetch("/api/calculator/context?entityType=all");
      if (res.ok) {
        const data = await res.json();
        setPlatformData({
          assets: data.assets || [],
          liabilities: data.liabilities || [],
        });
      }
    } catch (e) {
      console.warn("Failed to load platform records", e);
    } finally {
      setLoadingPlatform(false);
    }
  }, []);

  useEffect(() => {
    if (mode !== "integrated") return;
    // Defer so the fetch's setState calls happen after the effect commits
    const t = setTimeout(fetchPlatformData, 0);
    return () => clearTimeout(t);
  }, [mode, fetchPlatformData]);

  const activeAssets = useMemo(() => {
    if (mode === "integrated") {
      return platformData.assets.map((a) => ({
        name: a.name,
        amount: a.currentValue,
        ownershipPercentage: a.ownershipPercentage,
      }));
    }
    return manualAssets;
  }, [mode, platformData.assets, manualAssets]);

  const activeLiabilities = useMemo(() => {
    if (mode === "integrated") {
      return platformData.liabilities.map((l) => ({
        name: l.name,
        amount: l.currentBalance || l.principalAmount,
      }));
    }
    return manualLiabilities;
  }, [mode, platformData.liabilities, manualLiabilities]);

  const results = useMemo(() => {
    try {
      return calculateStandaloneNetWorth({
        assets: activeAssets,
        liabilities: activeLiabilities,
        reportingCurrency: "KES",
      });
    } catch {
      return null;
    }
  }, [activeAssets, activeLiabilities]);

  const handleAddAsset = () => {
    setManualAssets((prev) => [...prev, { name: "", amount: "", ownershipPercentage: 100 }]);
  };

  const handleRemoveAsset = (idx) => {
    setManualAssets((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleUpdateAsset = (idx, field, val) => {
    setManualAssets((prev) => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], [field]: val };
      return copy;
    });
  };

  const handleAddLiability = () => {
    setManualLiabilities((prev) => [...prev, { name: "", amount: "" }]);
  };

  const handleRemoveLiability = (idx) => {
    setManualLiabilities((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleUpdateLiability = (idx, field, val) => {
    setManualLiabilities((prev) => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], [field]: val };
      return copy;
    });
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <CalculatorDisplay
        expression={`Assets: KES ${results ? formatNumber(results.totalAssets) : "0"} − Liabilities: KES ${results ? formatNumber(results.totalLiabilities) : "0"}`}
        mainValue={results ? formatNumber(results.netWorth) : "0.00"}
        currency="KES"
        mode={mode}
        subtitle={`Debt-to-Asset Ratio: ${results?.debtToAssetRatio || "0.0"}%`}
        onClear={() => {
          if (mode === "standalone") {
            setManualAssets([]);
            setManualLiabilities([]);
          }
        }}
        onSave={() => {
          if (onSaveLog && results) {
            onSaveLog({
              calculatorType: "net_worth",
              title: `Net Worth Evaluation: KSh ${formatNumber(results.netWorth)}`,
              inputs: { mode, assets: activeAssets, liabilities: activeLiabilities },
              outputs: results,
              isSaved: true,
            });
          }
        }}
        onOpenActionPanel={
          results
            ? () =>
                onConvertAction?.({
                  calculatorType: "net_worth",
                  calculatedAmount: results.netWorth,
                  formula: `Net Worth: KES ${results.netWorth}`,
                  details: {
                    ...results,
                    title: "Net Worth Balance Evaluation",
                    category: "general_reflection",
                    contextReasoning: `Recorded net worth position calculated at KES ${results.netWorth}. Total attributable assets: KES ${results.totalAssets}, outstanding liabilities: KES ${results.totalLiabilities}. Debt-to-asset: ${results.debtToAssetRatio}%.`,
                  },
                })
            : null
        }
      />

      {/* Mode Switcher */}
      <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-neutral-900 border border-neutral-800">
        <button
          type="button"
          onClick={() => setMode("standalone")}
          className={`py-2 rounded-lg text-xs font-semibold transition-all ${
            mode === "standalone" ? "bg-teal-600 text-white shadow-sm" : "text-neutral-400 hover:text-white"
          }`}
        >
          Standalone (Manual Entry)
        </button>
        <button
          type="button"
          onClick={() => setMode("integrated")}
          className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all ${
            mode === "integrated" ? "bg-teal-600 text-white shadow-sm" : "text-neutral-400 hover:text-white"
          }`}
        >
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Platform-Connected Records</span>
        </button>
      </div>

      <div className="p-5 rounded-2xl border border-neutral-800 bg-neutral-900/40 space-y-6">
        {mode === "integrated" && (
          <div className="flex items-center justify-between p-3 rounded-xl bg-neutral-950 border border-neutral-800">
            <span className="text-xs text-neutral-300">
              Synced with {platformData.assets.length} assets and {platformData.liabilities.length} liabilities.
            </span>
            <button
              type="button"
              onClick={fetchPlatformData}
              disabled={loadingPlatform}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-xs text-neutral-300"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingPlatform ? "animate-spin" : ""}`} />
              <span>Refresh</span>
            </button>
          </div>
        )}

        {/* Assets Section */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">
              Assets ({activeAssets.length})
            </span>
            {mode === "standalone" && (
              <button
                type="button"
                onClick={handleAddAsset}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-neutral-900 border border-neutral-800 hover:bg-neutral-800 text-xs text-white"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Asset</span>
              </button>
            )}
          </div>

          <div className="space-y-2">
            {activeAssets.map((asset, idx) => (
              <div
                key={idx}
                className="grid grid-cols-12 gap-2 items-center p-2 rounded-xl bg-neutral-950 border border-neutral-800"
              >
                <div className="col-span-5">
                  <input
                    type="text"
                    disabled={mode === "integrated"}
                    value={asset.name}
                    onChange={(e) => handleUpdateAsset(idx, "name", e.target.value)}
                    placeholder="Asset Name"
                    className="w-full px-2 py-1.5 rounded-lg bg-neutral-900 border border-neutral-800 text-white text-xs disabled:opacity-80"
                  />
                </div>
                <div className="col-span-4">
                  <input
                    type="number"
                    disabled={mode === "integrated"}
                    value={asset.amount}
                    onChange={(e) => handleUpdateAsset(idx, "amount", e.target.value)}
                    placeholder="Valuation (KES)"
                    className="w-full px-2 py-1.5 rounded-lg bg-neutral-900 border border-neutral-800 text-white text-xs font-mono disabled:opacity-80"
                  />
                </div>
                <div className="col-span-2">
                  <input
                    type="number"
                    disabled={mode === "integrated"}
                    value={asset.ownershipPercentage}
                    onChange={(e) => handleUpdateAsset(idx, "ownershipPercentage", e.target.value)}
                    placeholder="Own %"
                    className="w-full px-2 py-1.5 rounded-lg bg-neutral-900 border border-neutral-800 text-white text-xs font-mono disabled:opacity-80"
                    title="Ownership %"
                  />
                </div>
                {mode === "standalone" && (
                  <div className="col-span-1 flex justify-center">
                    <button
                      type="button"
                      onClick={() => handleRemoveAsset(idx)}
                      className="p-1 rounded text-neutral-500 hover:text-red-400"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Liabilities Section */}
        <div className="space-y-3 pt-3 border-t border-neutral-800">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-red-400 uppercase tracking-wider">
              Liabilities & Debts ({activeLiabilities.length})
            </span>
            {mode === "standalone" && (
              <button
                type="button"
                onClick={handleAddLiability}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-neutral-900 border border-neutral-800 hover:bg-neutral-800 text-xs text-white"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Debt</span>
              </button>
            )}
          </div>

          <div className="space-y-2">
            {activeLiabilities.map((debt, idx) => (
              <div
                key={idx}
                className="grid grid-cols-12 gap-2 items-center p-2 rounded-xl bg-neutral-950 border border-neutral-800"
              >
                <div className="col-span-6">
                  <input
                    type="text"
                    disabled={mode === "integrated"}
                    value={debt.name}
                    onChange={(e) => handleUpdateLiability(idx, "name", e.target.value)}
                    placeholder="Liability / Loan Name"
                    className="w-full px-2 py-1.5 rounded-lg bg-neutral-900 border border-neutral-800 text-white text-xs disabled:opacity-80"
                  />
                </div>
                <div className="col-span-5">
                  <input
                    type="number"
                    disabled={mode === "integrated"}
                    value={debt.amount}
                    onChange={(e) => handleUpdateLiability(idx, "amount", e.target.value)}
                    placeholder="Balance (KES)"
                    className="w-full px-2 py-1.5 rounded-lg bg-neutral-900 border border-neutral-800 text-white text-xs font-mono disabled:opacity-80"
                  />
                </div>
                {mode === "standalone" && (
                  <div className="col-span-1 flex justify-center">
                    <button
                      type="button"
                      onClick={() => handleRemoveLiability(idx)}
                      className="p-1 rounded text-neutral-500 hover:text-red-400"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Position Summary Cards */}
        {results && (
          <div className="grid grid-cols-3 gap-3 pt-3 border-t border-neutral-800 text-center">
            <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800">
              <div className="text-[10px] text-neutral-500 uppercase">Attributable Assets</div>
              <div className="text-xs sm:text-sm font-bold text-emerald-400 mt-0.5">
                KES {formatNumber(results.totalAssets)}
              </div>
            </div>
            <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800">
              <div className="text-[10px] text-neutral-500 uppercase">Total Liabilities</div>
              <div className="text-xs sm:text-sm font-bold text-red-400 mt-0.5">
                KES {formatNumber(results.totalLiabilities)}
              </div>
            </div>
            <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800">
              <div className="text-[10px] text-neutral-500 uppercase">Net Worth</div>
              <div className="text-xs sm:text-sm font-bold text-white mt-0.5">
                KES {formatNumber(results.netWorth)}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

