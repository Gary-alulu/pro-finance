"use client";
// components/calculator/calculators/SavingsCalculator.js
// Goal-oriented and accumulation-oriented savings planner with optional return modeling.

import { useState, useMemo } from "react";
import CalculatorDisplay from "../CalculatorDisplay";
import { calculateTargetSavings, calculateSavingsAccumulation } from "@/lib/calculator/savings";
import { formatNumber } from "@/lib/finance/currency";
import { Target, TrendingUp, Calendar, CheckCircle2 } from "lucide-react";

export default function SavingsCalculator({ onConvertAction, onSaveLog }) {
  const [subMode, setSubMode] = useState("target"); // "target" or "accumulation"

  // Target-based inputs
  const [targetAmount, setTargetAmount] = useState("500000");
  const [currentSavings, setCurrentSavings] = useState("200000");
  const [months, setMonths] = useState("20");
  const [targetReturnRate, setTargetReturnRate] = useState("0");

  // Accumulation inputs
  const [initialSavings, setInitialSavings] = useState("50000");
  const [periodicDeposit, setPeriodicDeposit] = useState("15000");
  const [accumulationMonths, setAccumulationMonths] = useState("24");
  const [accumulationReturnRate, setAccumulationReturnRate] = useState("9");

  const results = useMemo(() => {
    try {
      if (subMode === "target") {
        if (!targetAmount || !months) return null;
        return calculateTargetSavings({
          targetAmount,
          currentSavings: currentSavings || "0",
          months,
          annualReturnRate: targetReturnRate || "0",
        });
      } else {
        if (!periodicDeposit || !accumulationMonths) return null;
        return calculateSavingsAccumulation({
          initialSavings: initialSavings || "0",
          periodicContribution: periodicDeposit,
          periods: accumulationMonths,
          annualReturnRate: accumulationReturnRate || "0",
        });
      }
    } catch {
      return null;
    }
  }, [
    subMode,
    targetAmount,
    currentSavings,
    months,
    targetReturnRate,
    initialSavings,
    periodicDeposit,
    accumulationMonths,
    accumulationReturnRate,
  ]);

  const mainDisplay = useMemo(() => {
    if (!results) return "0.00";
    if (subMode === "target") {
      return formatNumber(results.requiredPeriodicContribution);
    } else {
      return formatNumber(results.finalAccumulatedValue);
    }
  }, [results, subMode]);

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <CalculatorDisplay
        expression={
          subMode === "target"
            ? `Goal: KES ${formatNumber(targetAmount)} from KES ${formatNumber(currentSavings)} in ${months} months`
            : `Save KES ${formatNumber(periodicDeposit)}/mo for ${accumulationMonths} months`
        }
        mainValue={mainDisplay}
        currency="KES"
        mode="standalone"
        subtitle={
          subMode === "target"
            ? "Required Monthly Contribution"
            : "Total Projected Accumulation"
        }
        onClear={() => {
          if (subMode === "target") {
            setTargetAmount("");
            setCurrentSavings("");
          } else {
            setPeriodicDeposit("");
            setInitialSavings("");
          }
        }}
        onSave={() => {
          if (onSaveLog && results) {
            onSaveLog({
              calculatorType: "savings",
              title: subMode === "target" ? `Goal Target: KSh ${formatNumber(targetAmount)}` : `Savings Plan: KSh ${formatNumber(mainDisplay)}`,
              inputs: subMode === "target" ? { targetAmount, currentSavings, months, targetReturnRate } : { initialSavings, periodicDeposit, accumulationMonths, accumulationReturnRate },
              outputs: results,
              isSaved: true,
            });
          }
        }}
        onOpenActionPanel={
          results
            ? () =>
                onConvertAction?.({
                  calculatorType: "savings",
                  calculatedAmount: mainDisplay,
                  formula: subMode === "target" ? `Save KES ${mainDisplay}/mo for ${months} months` : `Accumulate KES ${mainDisplay}`,
                  details: {
                    ...results,
                    goalTitle: subMode === "target" ? `KSh ${formatNumber(targetAmount)} Savings Goal` : "Wealth Savings Goal",
                    targetAmount: subMode === "target" ? targetAmount : results.finalAccumulatedValue,
                    contribution: subMode === "target" ? results.requiredPeriodicContribution : periodicDeposit,
                  },
                })
            : null
        }
      />

      {/* Mode Switcher */}
      <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-neutral-900 border border-neutral-800">
        <button
          type="button"
          onClick={() => setSubMode("target")}
          className={`flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-semibold transition-all ${
            subMode === "target"
              ? "bg-emerald-600 text-white shadow-sm"
              : "text-neutral-400 hover:text-white"
          }`}
        >
          <Target className="w-3.5 h-3.5" />
          <span>Target-Based (How much to save?)</span>
        </button>
        <button
          type="button"
          onClick={() => setSubMode("accumulation")}
          className={`flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-semibold transition-all ${
            subMode === "accumulation"
              ? "bg-emerald-600 text-white shadow-sm"
              : "text-neutral-400 hover:text-white"
          }`}
        >
          <TrendingUp className="w-3.5 h-3.5" />
          <span>Contribution-Based (What will I get?)</span>
        </button>
      </div>

      {/* Form Content */}
      <div className="p-5 rounded-2xl border border-neutral-800 bg-neutral-900/40 space-y-4">
        {subMode === "target" ? (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-neutral-400 mb-1">Target Goal Amount (KES)</label>
                <input
                  type="number"
                  value={targetAmount}
                  onChange={(e) => setTargetAmount(e.target.value)}
                  placeholder="e.g. 500000"
                  className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-white text-sm focus:border-emerald-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-neutral-400 mb-1">Current Saved Amount (KES)</label>
                <input
                  type="number"
                  value={currentSavings}
                  onChange={(e) => setCurrentSavings(e.target.value)}
                  placeholder="e.g. 200000"
                  className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-white text-sm focus:border-emerald-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-neutral-400 mb-1">Time Horizon (Months)</label>
                <input
                  type="number"
                  value={months}
                  onChange={(e) => setMonths(e.target.value)}
                  placeholder="e.g. 20"
                  className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-white text-sm focus:border-emerald-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-neutral-400 mb-1">
                  Assumed Annual Return Rate (%)
                </label>
                <input
                  type="number"
                  step="0.5"
                  value={targetReturnRate}
                  onChange={(e) => setTargetReturnRate(e.target.value)}
                  placeholder="0 for pure cash / bank savings"
                  className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-white text-sm focus:border-emerald-500 focus:outline-none"
                />
              </div>
            </div>

            {results && (
              <div className="pt-3 border-t border-neutral-800 space-y-3">
                <div className="flex justify-between text-xs text-neutral-400">
                  <span>Current Progress</span>
                  <span className="font-bold text-white">{results.progressPercentage}%</span>
                </div>
                <div className="w-full h-2 rounded-full bg-neutral-800 overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                    style={{ width: `${Math.min(100, Math.max(0, results.progressPercentage))}%` }}
                  />
                </div>
                <div className="grid grid-cols-3 gap-2 pt-2 text-center">
                  <div className="p-2.5 rounded-xl bg-neutral-950 border border-neutral-800">
                    <div className="text-[10px] text-neutral-500 uppercase">Remaining Gap</div>
                    <div className="text-xs font-bold text-white mt-0.5">KES {formatNumber(results.remainingGap)}</div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-neutral-950 border border-neutral-800">
                    <div className="text-[10px] text-neutral-500 uppercase">Total Deposits</div>
                    <div className="text-xs font-bold text-white mt-0.5">KES {formatNumber(results.totalContributions)}</div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-neutral-950 border border-neutral-800">
                    <div className="text-[10px] text-neutral-500 uppercase">Interest / Growth</div>
                    <div className="text-xs font-bold text-emerald-400 mt-0.5">KES {formatNumber(results.estimatedGrowth)}</div>
                  </div>
                </div>
              </div>
            )}
          </>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-neutral-400 mb-1">Initial Starting Deposit (KES)</label>
                <input
                  type="number"
                  value={initialSavings}
                  onChange={(e) => setInitialSavings(e.target.value)}
                  placeholder="e.g. 50000"
                  className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-white text-sm focus:border-emerald-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-neutral-400 mb-1">Monthly Contribution (KES)</label>
                <input
                  type="number"
                  value={periodicDeposit}
                  onChange={(e) => setPeriodicDeposit(e.target.value)}
                  placeholder="e.g. 15000"
                  className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-white text-sm focus:border-emerald-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-neutral-400 mb-1">Duration (Months)</label>
                <input
                  type="number"
                  value={accumulationMonths}
                  onChange={(e) => setAccumulationMonths(e.target.value)}
                  placeholder="e.g. 24"
                  className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-white text-sm focus:border-emerald-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-neutral-400 mb-1">Annual Return / Interest (%)</label>
                <input
                  type="number"
                  step="0.5"
                  value={accumulationReturnRate}
                  onChange={(e) => setAccumulationReturnRate(e.target.value)}
                  placeholder="e.g. 9 for MMF / Treasury Bills"
                  className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-white text-sm focus:border-emerald-500 focus:outline-none"
                />
              </div>
            </div>

            {results && (
              <div className="grid grid-cols-3 gap-2 pt-3 border-t border-neutral-800 text-center">
                <div className="p-2.5 rounded-xl bg-neutral-950 border border-neutral-800">
                  <div className="text-[10px] text-neutral-500 uppercase">Total Deposited</div>
                  <div className="text-xs font-bold text-white mt-0.5">KES {formatNumber(results.totalDeposited)}</div>
                </div>
                <div className="p-2.5 rounded-xl bg-neutral-950 border border-neutral-800">
                  <div className="text-[10px] text-neutral-500 uppercase">Interest Earned</div>
                  <div className="text-xs font-bold text-emerald-400 mt-0.5">KES {formatNumber(results.estimatedGrowth)}</div>
                </div>
                <div className="p-2.5 rounded-xl bg-neutral-950 border border-neutral-800">
                  <div className="text-[10px] text-neutral-500 uppercase">Growth Share</div>
                  <div className="text-xs font-bold text-sky-400 mt-0.5">
                    {((Number(results.estimatedGrowth) / Number(results.finalAccumulatedValue)) * 100).toFixed(1)}%
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

