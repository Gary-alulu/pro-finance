"use client";
// components/calculator/calculators/InvestmentCalculator.js
// Investment returns, dividend yields, break-even prices, and weighted average cost basis.

import { useState, useEffect, useMemo } from "react";
import CalculatorDisplay from "../CalculatorDisplay";
import { calculateInvestment, calculateWeightedAverageCost } from "@/lib/calculator/investment";
import { formatNumber } from "@/lib/finance/currency";
import { Briefcase, Plus, Trash2, Info } from "lucide-react";

export default function InvestmentCalculator({ onConvertAction, onSaveLog }) {
  const [calcKind, setCalcKind] = useState("performance"); // "performance" or "wac"

  // Performance inputs
  const [units, setUnits] = useState("1000");
  const [purchasePrice, setPurchasePrice] = useState("150.00");
  const [currentPrice, setCurrentPrice] = useState("185.00");
  const [transactionFees, setTransactionFees] = useState("1500");
  const [dividendsReceived, setDividendsReceived] = useState("12000");
  const [holdingPeriodYears, setHoldingPeriodYears] = useState("1");

  // WAC Lots
  const [lots, setLots] = useState([
    { units: "5000", price: "10.00", fees: "500" },
    { units: "5000", price: "12.00", fees: "500" },
  ]);

  // Platform holdings for integrated pre-fill
  const [platformHoldings, setPlatformHoldings] = useState([]);
  const [selectedHoldingId, setSelectedHoldingId] = useState("");

  useEffect(() => {
    async function loadHoldings() {
      try {
        const res = await fetch("/api/calculator/context?entityType=investment");
        if (res.ok) {
          const data = await res.json();
          setPlatformHoldings(data.investments || []);
        }
      } catch (err) {
        console.warn("Failed to load investment holdings", err);
      }
    }
    loadHoldings();
  }, []);

  const handleSelectHolding = (id) => {
    setSelectedHoldingId(id);
    const found = platformHoldings.find((h) => h.id === id);
    if (found) {
      setUnits(found.quantity || "0");
      setCurrentPrice(found.currentPrice || "0.00");
      if (found.quantity && Number(found.quantity) > 0 && found.costBasis) {
        const avg = (Number(found.costBasis) / Number(found.quantity)).toFixed(2);
        setPurchasePrice(avg);
      }
    }
  };

  const perfResults = useMemo(() => {
    if (calcKind !== "performance") return null;
    try {
      if (!units || !purchasePrice || !currentPrice) return null;
      return calculateInvestment({
        units,
        purchasePrice,
        currentPrice,
        transactionFees: transactionFees || "0",
        dividendsReceived: dividendsReceived || "0",
        holdingPeriodYears: holdingPeriodYears || "1",
      });
    } catch {
      return null;
    }
  }, [calcKind, units, purchasePrice, currentPrice, transactionFees, dividendsReceived, holdingPeriodYears]);

  const wacResults = useMemo(() => {
    if (calcKind !== "wac") return null;
    try {
      return calculateWeightedAverageCost(lots);
    } catch {
      return null;
    }
  }, [calcKind, lots]);

  const handleAddLot = () => {
    setLots((prev) => [...prev, { units: "", price: "", fees: "0" }]);
  };

  const handleRemoveLot = (idx) => {
    setLots((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleUpdateLot = (idx, field, val) => {
    setLots((prev) => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], [field]: val };
      return copy;
    });
  };

  const mainDisplay = useMemo(() => {
    if (calcKind === "performance") {
      return perfResults ? formatNumber(perfResults.totalReturn) : "0.00";
    } else {
      return wacResults ? formatNumber(wacResults.weightedAveragePrice) : "0.00";
    }
  }, [calcKind, perfResults, wacResults]);

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <CalculatorDisplay
        expression={
          calcKind === "performance"
            ? `${units} shares @ KES ${purchasePrice} → KES ${currentPrice}`
            : `Weighted Avg Cost Basis for ${lots.length} Purchase Lots`
        }
        mainValue={mainDisplay}
        currency="KES"
        mode={selectedHoldingId ? "integrated" : "standalone"}
        subtitle={
          calcKind === "performance"
            ? `ROI: ${perfResults?.returnOnInvestment || "0.00"}% · Break-Even: KES ${perfResults?.breakEvenPrice || "0.00"}`
            : `Average Cost Per Share across ${wacResults?.totalUnits || "0"} Units`
        }
        onClear={() => {
          if (calcKind === "performance") {
            setUnits("");
            setPurchasePrice("");
            setCurrentPrice("");
          } else {
            setLots([{ units: "", price: "", fees: "0" }]);
          }
        }}
        onSave={() => {
          if (onSaveLog) {
            onSaveLog({
              calculatorType: "investment",
              title: calcKind === "performance" ? `Stock Performance: KSh ${formatNumber(mainDisplay)} Return` : `Weighted Average Cost: KSh ${mainDisplay}/share`,
              inputs: calcKind === "performance" ? { units, purchasePrice, currentPrice, transactionFees, dividendsReceived } : { lots },
              outputs: calcKind === "performance" ? perfResults : wacResults,
              isSaved: true,
            });
          }
        }}
        onOpenActionPanel={
          perfResults || wacResults
            ? () =>
                onConvertAction?.({
                  calculatorType: "investment",
                  calculatedAmount: mainDisplay,
                  formula: calcKind === "performance" ? `ROI: ${perfResults.returnOnInvestment}%` : `WAC: KES ${mainDisplay}`,
                  details: {
                    ...(calcKind === "performance" ? perfResults : wacResults),
                    title: `Investment Evaluation (${calcKind === "performance" ? "P&L Return" : "WAC Basis"})`,
                    category: "investment_buy",
                    contextReasoning: `Evaluated holding with ${units} shares. Total return: KES ${perfResults?.totalReturn || "0"}. Break-even: KES ${perfResults?.breakEvenPrice || "0"}.`,
                  },
                })
            : null
        }
      />

      {/* Mode Switcher */}
      <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-neutral-900 border border-neutral-800">
        <button
          type="button"
          onClick={() => setCalcKind("performance")}
          className={`py-2 rounded-lg text-xs font-semibold transition-all ${
            calcKind === "performance" ? "bg-purple-600 text-white shadow-sm" : "text-neutral-400 hover:text-white"
          }`}
        >
          Holding Return & Break-Even
        </button>
        <button
          type="button"
          onClick={() => setCalcKind("wac")}
          className={`py-2 rounded-lg text-xs font-semibold transition-all ${
            calcKind === "wac" ? "bg-purple-600 text-white shadow-sm" : "text-neutral-400 hover:text-white"
          }`}
        >
          Weighted Average Cost (WAC)
        </button>
      </div>

      {/* Pre-fill holding from platform */}
      {calcKind === "performance" && platformHoldings.length > 0 && (
        <div className="p-3 rounded-xl bg-neutral-900 border border-neutral-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="text-xs text-neutral-300 flex items-center gap-2">
            <Briefcase className="w-4 h-4 text-purple-400" />
            <span>Load actual holding from platform:</span>
          </div>
          <select
            value={selectedHoldingId}
            onChange={(e) => handleSelectHolding(e.target.value)}
            className="px-3 py-1.5 rounded-lg bg-neutral-950 border border-neutral-800 text-xs text-white focus:border-purple-500 focus:outline-none"
          >
            <option value="">— Select Investment Holding —</option>
            {platformHoldings.map((h) => (
              <option key={h.id} value={h.id}>
                {h.symbol} ({h.quantity} units @ KES {h.currentPrice})
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="p-5 rounded-2xl border border-neutral-800 bg-neutral-900/40 space-y-4">
        {calcKind === "performance" ? (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-neutral-400 mb-1">Number of Shares / Units</label>
                <input
                  type="number"
                  value={units}
                  onChange={(e) => setUnits(e.target.value)}
                  placeholder="e.g. 1000"
                  className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-white text-sm focus:border-purple-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-neutral-400 mb-1">Purchase / Entry Price (KES)</label>
                <input
                  type="number"
                  step="0.01"
                  value={purchasePrice}
                  onChange={(e) => setPurchasePrice(e.target.value)}
                  placeholder="e.g. 150.00"
                  className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-white text-sm focus:border-purple-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-neutral-400 mb-1">Current Market Price (KES)</label>
                <input
                  type="number"
                  step="0.01"
                  value={currentPrice}
                  onChange={(e) => setCurrentPrice(e.target.value)}
                  placeholder="e.g. 185.00"
                  className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-white text-sm focus:border-purple-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-neutral-400 mb-1">Total Brokerage / Fees (KES)</label>
                <input
                  type="number"
                  value={transactionFees}
                  onChange={(e) => setTransactionFees(e.target.value)}
                  placeholder="e.g. 1500"
                  className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-white text-sm focus:border-purple-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-neutral-400 mb-1">Dividends Received (KES)</label>
                <input
                  type="number"
                  value={dividendsReceived}
                  onChange={(e) => setDividendsReceived(e.target.value)}
                  placeholder="e.g. 12000"
                  className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-white text-sm focus:border-purple-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-neutral-400 mb-1">Holding Period (Years)</label>
                <input
                  type="number"
                  step="0.1"
                  value={holdingPeriodYears}
                  onChange={(e) => setHoldingPeriodYears(e.target.value)}
                  placeholder="e.g. 1"
                  className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-white text-sm focus:border-purple-500 focus:outline-none"
                />
              </div>
            </div>

            {perfResults && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-3 border-t border-neutral-800 text-center">
                <div className="p-2.5 rounded-xl bg-neutral-950 border border-neutral-800">
                  <div className="text-[10px] text-neutral-500 uppercase">Cost Basis</div>
                  <div className="text-xs font-bold text-white mt-0.5">KES {formatNumber(perfResults.totalCostBasis)}</div>
                </div>
                <div className="p-2.5 rounded-xl bg-neutral-950 border border-neutral-800">
                  <div className="text-[10px] text-neutral-500 uppercase">Unrealized P&L</div>
                  <div
                    className={`text-xs font-bold mt-0.5 ${
                      Number(perfResults.unrealizedGainLoss) >= 0 ? "text-emerald-400" : "text-red-400"
                    }`}
                  >
                    KES {formatNumber(perfResults.unrealizedGainLoss)}
                  </div>
                </div>
                <div className="p-2.5 rounded-xl bg-neutral-950 border border-neutral-800">
                  <div className="text-[10px] text-neutral-500 uppercase">Dividend Yield</div>
                  <div className="text-xs font-bold text-sky-400 mt-0.5">{perfResults.dividendYield}%</div>
                </div>
                <div className="p-2.5 rounded-xl bg-neutral-950 border border-neutral-800">
                  <div className="text-[10px] text-neutral-500 uppercase">Break-Even Price</div>
                  <div className="text-xs font-bold text-amber-400 mt-0.5">KES {perfResults.breakEvenPrice}</div>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-neutral-400">Multiple Purchase Lots</span>
              <button
                type="button"
                onClick={handleAddLot}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-neutral-900 border border-neutral-800 hover:bg-neutral-800 text-xs text-white"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Lot</span>
              </button>
            </div>

            <div className="space-y-2">
              {lots.map((lot, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-2 items-center p-2 rounded-xl bg-neutral-950 border border-neutral-800">
                  <div className="col-span-4">
                    <input
                      type="number"
                      value={lot.units}
                      onChange={(e) => handleUpdateLot(idx, "units", e.target.value)}
                      placeholder="Units"
                      className="w-full px-2 py-1.5 rounded-lg bg-neutral-900 border border-neutral-800 text-white text-xs font-mono"
                    />
                  </div>
                  <div className="col-span-4">
                    <input
                      type="number"
                      step="0.01"
                      value={lot.price}
                      onChange={(e) => handleUpdateLot(idx, "price", e.target.value)}
                      placeholder="Price (KES)"
                      className="w-full px-2 py-1.5 rounded-lg bg-neutral-900 border border-neutral-800 text-white text-xs font-mono"
                    />
                  </div>
                  <div className="col-span-3">
                    <input
                      type="number"
                      value={lot.fees}
                      onChange={(e) => handleUpdateLot(idx, "fees", e.target.value)}
                      placeholder="Fees"
                      className="w-full px-2 py-1.5 rounded-lg bg-neutral-900 border border-neutral-800 text-white text-xs font-mono"
                    />
                  </div>
                  <div className="col-span-1 flex justify-center">
                    <button
                      type="button"
                      disabled={lots.length <= 1}
                      onClick={() => handleRemoveLot(idx)}
                      className="p-1 rounded text-neutral-500 hover:text-red-400 disabled:opacity-30"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {wacResults && (
              <div className="grid grid-cols-3 gap-3 pt-3 border-t border-neutral-800 text-center">
                <div className="p-2.5 rounded-xl bg-neutral-950 border border-neutral-800">
                  <div className="text-[10px] text-neutral-500 uppercase">Total Units</div>
                  <div className="text-xs font-bold text-white mt-0.5">{wacResults.totalUnits}</div>
                </div>
                <div className="p-2.5 rounded-xl bg-neutral-950 border border-neutral-800">
                  <div className="text-[10px] text-neutral-500 uppercase">Total Cost Basis</div>
                  <div className="text-xs font-bold text-white mt-0.5">KES {formatNumber(wacResults.totalCostBasis)}</div>
                </div>
                <div className="p-2.5 rounded-xl bg-neutral-950 border border-neutral-800">
                  <div className="text-[10px] text-neutral-500 uppercase">Weighted Avg Price</div>
                  <div className="text-xs font-bold text-purple-400 mt-0.5">KES {wacResults.weightedAveragePrice}</div>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="flex items-start gap-2.5 p-3 rounded-xl bg-neutral-950 border border-neutral-800/80 text-xs text-neutral-400">
          <Info className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold text-neutral-200">NSE Note: </span>
            Calculation estimates include stamp duty and brokerage fees where provided. For NSE traded equities, prices can be verified against your latest CDS account statement.
          </div>
        </div>
      </div>
    </div>
  );
}

