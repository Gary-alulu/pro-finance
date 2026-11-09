"use client";
// components/calculator/calculators/LoanCalculator.js
// Reducing-balance loan amortization calculator with extra-payment payoff comparisons.

import { useState, useEffect, useMemo } from "react";
import CalculatorDisplay from "../CalculatorDisplay";
import { calculateLoan } from "@/lib/calculator/loan";
import { formatNumber } from "@/lib/finance/currency";
import { Landmark, ShieldAlert, Sparkles, ChevronDown } from "lucide-react";

export default function LoanCalculator({ onConvertAction, onSaveLog }) {
  const [principalAmount, setPrincipalAmount] = useState("1000000");
  const [annualInterestRate, setAnnualInterestRate] = useState("14");
  const [termMonths, setTermMonths] = useState("36");
  const [repaymentFrequency, setRepaymentFrequency] = useState("monthly");
  const [extraMonthlyPayment, setExtraMonthlyPayment] = useState("5000");

  // Platform liabilities for integrated pre-fill
  const [platformLiabilities, setPlatformLiabilities] = useState([]);
  const [selectedLiabilityId, setSelectedLiabilityId] = useState("");

  useEffect(() => {
    async function loadLiabilities() {
      try {
        const res = await fetch("/api/calculator/context?entityType=liability");
        if (res.ok) {
          const data = await res.json();
          setPlatformLiabilities(data.liabilities || []);
        }
      } catch (err) {
        console.warn("Failed to load user liabilities", err);
      }
    }
    loadLiabilities();
  }, []);

  const handleSelectLiability = (id) => {
    setSelectedLiabilityId(id);
    const found = platformLiabilities.find((l) => l.id === id);
    if (found) {
      setPrincipalAmount(found.currentBalance || found.principalAmount || "0");
      setAnnualInterestRate(found.interestRate || "0");
      if (found.termMonths) setTermMonths(found.termMonths.toString());
      setRepaymentFrequency(found.repaymentFrequency || "monthly");
    }
  };

  const results = useMemo(() => {
    try {
      if (!principalAmount || !termMonths) return null;
      return calculateLoan({
        principalAmount,
        annualInterestRate: annualInterestRate || "0",
        termMonths,
        repaymentFrequency,
        extraMonthlyPayment: extraMonthlyPayment || "0",
      });
    } catch {
      return null;
    }
  }, [principalAmount, annualInterestRate, termMonths, repaymentFrequency, extraMonthlyPayment]);

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <CalculatorDisplay
        expression={`KES ${formatNumber(principalAmount)} @ ${annualInterestRate}% for ${termMonths} months`}
        mainValue={results ? formatNumber(results.periodicRepayment) : "0.00"}
        currency="KES"
        mode={selectedLiabilityId ? "integrated" : "standalone"}
        subtitle={`Total Interest: KES ${results ? formatNumber(results.totalInterest) : "0.00"} · Settlement: ${results?.estimatedSettlementDate || "—"}`}
        onClear={() => {
          setPrincipalAmount("");
          setExtraMonthlyPayment("");
          setSelectedLiabilityId("");
        }}
        onSave={() => {
          if (onSaveLog && results) {
            onSaveLog({
              calculatorType: "loan",
              title: `Loan Plan: KSh ${formatNumber(principalAmount)} @ ${annualInterestRate}%`,
              inputs: { principalAmount, annualInterestRate, termMonths, extraMonthlyPayment },
              outputs: results,
              isSaved: true,
            });
          }
        }}
        onOpenActionPanel={
          results
            ? () =>
                onConvertAction?.({
                  calculatorType: "loan",
                  calculatedAmount: results.periodicRepayment,
                  formula: `KES ${formatNumber(results.periodicRepayment)}/mo repayment`,
                  details: {
                    ...results,
                    liabilityId: selectedLiabilityId || undefined,
                    newMinimumRepayment: results.periodicRepayment,
                    newTermMonths: results.actualPayoffMonths,
                    repaymentStrategyNote: `Amortized at ${annualInterestRate}% reducing balance. Extra repayment: KES ${extraMonthlyPayment}/mo saves KES ${results.extraPaymentSavings?.interestSaved || "0"} in interest.`,
                  },
                })
            : null
        }
      />

      {/* Pre-fill from active liabilities */}
      {platformLiabilities.length > 0 && (
        <div className="p-3 rounded-xl bg-neutral-900 border border-neutral-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="text-xs text-neutral-300 flex items-center gap-2">
            <Landmark className="w-4 h-4 text-red-400" />
            <span>Connect an existing liability from your records:</span>
          </div>
          <select
            value={selectedLiabilityId}
            onChange={(e) => handleSelectLiability(e.target.value)}
            className="px-3 py-1.5 rounded-lg bg-neutral-950 border border-neutral-800 text-xs text-white focus:border-red-500 focus:outline-none"
          >
            <option value="">— Select Platform Liability —</option>
            {platformLiabilities.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name} (KES {formatNumber(l.currentBalance)} @ {l.interestRate}%)
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="p-5 rounded-2xl border border-neutral-800 bg-neutral-900/40 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-neutral-400 mb-1">Loan Principal / Balance (KES)</label>
            <input
              type="number"
              value={principalAmount}
              onChange={(e) => setPrincipalAmount(e.target.value)}
              placeholder="e.g. 1000000"
              className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-white text-sm focus:border-red-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-neutral-400 mb-1">Annual Interest Rate (%)</label>
            <input
              type="number"
              step="0.1"
              value={annualInterestRate}
              onChange={(e) => setAnnualInterestRate(e.target.value)}
              placeholder="e.g. 14"
              className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-white text-sm focus:border-red-500 focus:outline-none"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-neutral-400 mb-1">Loan Term (Months)</label>
            <input
              type="number"
              value={termMonths}
              onChange={(e) => setTermMonths(e.target.value)}
              placeholder="e.g. 36"
              className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-white text-sm focus:border-red-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-neutral-400 mb-1">Repayment Frequency</label>
            <select
              value={repaymentFrequency}
              onChange={(e) => setRepaymentFrequency(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-white text-sm focus:border-red-500 focus:outline-none"
            >
              <option value="monthly">Monthly</option>
              <option value="fortnightly">Fortnightly</option>
              <option value="weekly">Weekly</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-neutral-400 mb-1">Extra Monthly Repayment (KES)</label>
            <input
              type="number"
              value={extraMonthlyPayment}
              onChange={(e) => setExtraMonthlyPayment(e.target.value)}
              placeholder="e.g. 5000"
              className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-white text-sm focus:border-red-500 focus:outline-none"
            />
          </div>
        </div>

        {results && (
          <>
            {/* Metric Summary Cards */}
            <div className="grid grid-cols-3 gap-3 pt-3 border-t border-neutral-800 text-center">
              <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800">
                <div className="text-[10px] text-neutral-500 uppercase">Total Interest</div>
                <div className="text-sm font-bold text-red-400 mt-0.5">KES {formatNumber(results.totalInterest)}</div>
              </div>
              <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800">
                <div className="text-[10px] text-neutral-500 uppercase">Total Repayment</div>
                <div className="text-sm font-bold text-white mt-0.5">KES {formatNumber(results.totalRepayment)}</div>
              </div>
              <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800">
                <div className="text-[10px] text-neutral-500 uppercase">Settlement Horizon</div>
                <div className="text-sm font-bold text-emerald-400 mt-0.5">
                  {results.actualPayoffMonths} Months
                </div>
              </div>
            </div>

            {/* Extra Payment Advantage Callout */}
            {results.extraPaymentSavings?.interestSaved && Number(results.extraPaymentSavings.interestSaved) > 0 && (
              <div className="flex items-start gap-3 p-3.5 rounded-xl bg-emerald-950/30 border border-emerald-500/30 text-xs">
                <Sparkles className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <div className="font-semibold text-emerald-300">Accelerated Repayment Advantage</div>
                  <div className="text-neutral-300">
                    Paying an extra <span className="font-bold text-white">KES {formatNumber(extraMonthlyPayment)}</span> each month saves you{" "}
                    <span className="font-bold text-emerald-400">KES {formatNumber(results.extraPaymentSavings.interestSaved)}</span> in total interest and clears your debt{" "}
                    <span className="font-bold text-white">{results.extraPaymentSavings.monthsSaved} months earlier</span>.
                  </div>
                </div>
              </div>
            )}

            {/* First 12 months amortization schedule preview */}
            {results.amortizationSchedule?.length > 0 && (
              <div className="pt-2">
                <div className="text-xs font-semibold text-neutral-400 mb-2">Amortization Schedule (Sample Periods)</div>
                <div className="rounded-xl border border-neutral-800 overflow-x-auto max-h-56">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-neutral-950 text-neutral-400 border-b border-neutral-800 sticky top-0">
                      <tr>
                        <th className="py-2 px-3">Period</th>
                        <th className="py-2 px-3">Principal</th>
                        <th className="py-2 px-3">Interest</th>
                        <th className="py-2 px-3">Extra</th>
                        <th className="py-2 px-3 text-right">Ending Balance</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-800/60 font-mono">
                      {results.amortizationSchedule.slice(0, 12).map((row) => (
                        <tr key={row.period} className="hover:bg-neutral-800/30">
                          <td className="py-1.5 px-3 text-neutral-300">Month {row.period}</td>
                          <td className="py-1.5 px-3 text-neutral-400">KES {formatNumber(row.principalPayment)}</td>
                          <td className="py-1.5 px-3 text-red-400">KES {formatNumber(row.interestPayment)}</td>
                          <td className="py-1.5 px-3 text-emerald-400">
                            {Number(row.extraPayment) > 0 ? `+${formatNumber(row.extraPayment)}` : "—"}
                          </td>
                          <td className="py-1.5 px-3 text-right font-bold text-white">
                            KES {formatNumber(row.endingBalance)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

