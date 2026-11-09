"use client";
// components/calculator/CalculatorActionPanel.js
// Modal panel facilitating explicit, confirmed conversion of calculator results into platform records.

import { useState } from "react";
import { formatNumber } from "@/lib/finance/currency";
import { X, CheckCircle2, ArrowRight, Sparkles, AlertCircle, ExternalLink } from "lucide-react";
import Link from "next/link";

export default function CalculatorActionPanel({ isOpen, onClose, actionContext }) {
  const [submitting, setSubmitting] = useState(false);
  const [successResult, setSuccessResult] = useState(null);
  const [error, setError] = useState(null);

  const { calculatorType, calculatedAmount, formula, details = {} } = actionContext || {};

  // Determine available action kinds
  let defaultAction = "create_journal_memo";
  if (calculatorType === "savings") defaultAction = "create_goal";
  else if (calculatorType === "loan") defaultAction = "create_liability_plan";
  else if (calculatorType === "depreciation") defaultAction = "update_asset_valuation";
  else if (calculatorType === "compound_interest") defaultAction = "save_wealth_scenario";

  const [selectedAction, setSelectedAction] = useState(defaultAction);

  // Form states
  const [memoTitle, setMemoTitle] = useState(details.title || `${(calculatorType || "calculation").toUpperCase()} Decision`);
  const [memoReasoning, setMemoReasoning] = useState(
    details.contextReasoning || `Calculated ${calculatedAmount} via ${calculatorType} calculator. ${formula || ""}`
  );
  const [scenarioName, setScenarioName] = useState(details.name || "Wealth Simulation Scenario");
  const [goalTitle, setGoalTitle] = useState(details.goalTitle || "New Savings Goal");

  if (!isOpen || !actionContext) return null;

  const handleExecuteAction = async () => {
    setSubmitting(true);
    setError(null);
    try {
      let payload = {};

      if (selectedAction === "update_asset_valuation") {
        payload = {
          assetId: details.assetId,
          newAmount: details.newAmount || calculatedAmount,
          currency: "KES",
          method: details.method || "depreciated_cost",
          note: details.note || "Carrying value revised via calculator",
        };
      } else if (selectedAction === "create_liability_plan") {
        payload = {
          liabilityId: details.liabilityId,
          newMinimumRepayment: details.newMinimumRepayment || calculatedAmount,
          newTermMonths: details.newTermMonths,
          repaymentStrategyNote: details.repaymentStrategyNote,
        };
      } else if (selectedAction === "save_wealth_scenario") {
        payload = {
          name: scenarioName,
          timeHorizonYears: details.timeHorizonYears || 5,
          assumptions: details.assumptions || {},
        };
      } else if (selectedAction === "create_goal") {
        payload = {
          goalTitle,
          targetAmount: details.targetAmount || calculatedAmount,
          contribution: details.contribution,
          targetDate: details.targetDate,
        };
      } else {
        payload = {
          title: memoTitle,
          category: details.category || "financial_planning",
          contextReasoning: memoReasoning,
          expectedOutcome: `Target result: ${calculatedAmount}`,
          amount: { amount: calculatedAmount.toString().replace(/,/g, ""), currency: "KES" },
        };
      }

      const res = await fetch("/api/calculator/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          actionType: selectedAction,
          payload,
          notes: `Converted from Financial Calculator (${calculatorType})`,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Action execution failed");
      }

      setSuccessResult(data);
    } catch (err) {
      setError(err.message || "Failed to commit action");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-lg rounded-2xl border border-neutral-800 bg-neutral-900 p-6 shadow-2xl">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800"
        >
          <X className="w-5 h-5" />
        </button>

        {successResult ? (
          <div className="text-center py-6 space-y-4">
            <div className="inline-flex p-3 rounded-full bg-emerald-500/20 text-emerald-400 mb-2">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <h3 className="text-lg font-bold text-white">Action Successfully Committed</h3>
            <p className="text-xs text-neutral-300 max-w-sm mx-auto">{successResult.summary}</p>

            <div className="pt-4 flex items-center justify-center gap-3">
              {successResult.viewHref && (
                <Link
                  href={successResult.viewHref}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-sm"
                >
                  <span>View Updated Record</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </Link>
              )}
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl border border-neutral-800 hover:bg-neutral-800 text-neutral-300 text-xs font-medium"
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-5">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 mb-2">
                <Sparkles className="w-3 h-3" />
                <span>Integrated Action Bridge</span>
              </div>
              <h2 className="text-lg font-bold text-white">Convert Result into Platform Record</h2>
              <p className="text-xs text-neutral-400">
                Calculated value: <span className="font-bold text-white font-mono">KES {calculatedAmount}</span>
              </p>
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs">
                {error}
              </div>
            )}

            {/* Action Option Selector */}
            <div className="space-y-2">
              <label className="block text-xs font-medium text-neutral-300">Choose Financial Destination</label>
              <div className="space-y-1.5">
                {calculatorType === "savings" && (
                  <label className="flex items-center gap-2 p-2.5 rounded-xl border border-neutral-800 bg-neutral-950 cursor-pointer">
                    <input
                      type="radio"
                      name="actionType"
                      value="create_goal"
                      checked={selectedAction === "create_goal"}
                      onChange={() => setSelectedAction("create_goal")}
                      className="text-emerald-500 bg-neutral-900 border-neutral-700"
                    />
                    <span className="text-xs text-white font-medium">Create Savings Goal & Target Checkpoint</span>
                  </label>
                )}

                {calculatorType === "loan" && details.liabilityId && (
                  <label className="flex items-center gap-2 p-2.5 rounded-xl border border-neutral-800 bg-neutral-950 cursor-pointer">
                    <input
                      type="radio"
                      name="actionType"
                      value="create_liability_plan"
                      checked={selectedAction === "create_liability_plan"}
                      onChange={() => setSelectedAction("create_liability_plan")}
                      className="text-emerald-500 bg-neutral-900 border-neutral-700"
                    />
                    <span className="text-xs text-white font-medium">Update Liability Repayment Terms</span>
                  </label>
                )}

                {calculatorType === "depreciation" && details.assetId && (
                  <label className="flex items-center gap-2 p-2.5 rounded-xl border border-neutral-800 bg-neutral-950 cursor-pointer">
                    <input
                      type="radio"
                      name="actionType"
                      value="update_asset_valuation"
                      checked={selectedAction === "update_asset_valuation"}
                      onChange={() => setSelectedAction("update_asset_valuation")}
                      className="text-emerald-500 bg-neutral-900 border-neutral-700"
                    />
                    <span className="text-xs text-white font-medium">Record Updated Asset Carrying Valuation</span>
                  </label>
                )}

                {calculatorType === "compound_interest" && (
                  <label className="flex items-center gap-2 p-2.5 rounded-xl border border-neutral-800 bg-neutral-950 cursor-pointer">
                    <input
                      type="radio"
                      name="actionType"
                      value="save_wealth_scenario"
                      checked={selectedAction === "save_wealth_scenario"}
                      onChange={() => setSelectedAction("save_wealth_scenario")}
                      className="text-emerald-500 bg-neutral-900 border-neutral-700"
                    />
                    <span className="text-xs text-white font-medium">Export to Wealth Simulator Scenario</span>
                  </label>
                )}

                <label className="flex items-center gap-2 p-2.5 rounded-xl border border-neutral-800 bg-neutral-950 cursor-pointer">
                  <input
                    type="radio"
                    name="actionType"
                    value="create_journal_memo"
                    checked={selectedAction === "create_journal_memo"}
                    onChange={() => setSelectedAction("create_journal_memo")}
                    className="text-emerald-500 bg-neutral-900 border-neutral-700"
                  />
                  <span className="text-xs text-white font-medium">Log Decision Memo in Financial Journal</span>
                </label>
              </div>
            </div>

            {/* Dynamic Form per action */}
            {selectedAction === "create_goal" && (
              <div>
                <label className="block text-xs font-medium text-neutral-400 mb-1">Goal Label / Description</label>
                <input
                  type="text"
                  value={goalTitle}
                  onChange={(e) => setGoalTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-white text-xs"
                />
              </div>
            )}

            {selectedAction === "save_wealth_scenario" && (
              <div>
                <label className="block text-xs font-medium text-neutral-400 mb-1">Wealth Scenario Name</label>
                <input
                  type="text"
                  value={scenarioName}
                  onChange={(e) => setScenarioName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-white text-xs"
                />
              </div>
            )}

            {selectedAction === "create_journal_memo" && (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-neutral-400 mb-1">Decision Memo Title</label>
                  <input
                    type="text"
                    value={memoTitle}
                    onChange={(e) => setMemoTitle(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-white text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-neutral-400 mb-1">Context & Strategic Rationale</label>
                  <textarea
                    rows={3}
                    value={memoReasoning}
                    onChange={(e) => setMemoReasoning(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-white text-xs resize-none"
                  />
                </div>
              </div>
            )}

            {/* Confirmation Alert */}
            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-neutral-950 border border-neutral-800/80 text-[11px] text-neutral-400">
              <AlertCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-neutral-200">Confirmation Guard: </span>
                Clicking Confirm will record an authoritative entry in the selected module with an auditable event trail.
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl border border-neutral-800 hover:bg-neutral-800 text-neutral-300 text-xs font-medium"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={handleExecuteAction}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-semibold shadow-sm"
              >
                <span>{submitting ? "Applying..." : "Confirm & Apply"}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

