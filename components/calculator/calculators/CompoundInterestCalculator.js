"use client";
// components/calculator/calculators/CompoundInterestCalculator.js
// Multi-period compound growth engine with deposit timing and annual schedules.

import { useState, useMemo } from "react";
import CalculatorDisplay from "../CalculatorDisplay";
import { calculateCompoundInterest } from "@/lib/calculator/compoundInterest";
import { formatNumber } from "@/lib/finance/currency";
import { TrendingUp, AlertTriangle } from "lucide-react";

export default function CompoundInterestCalculator({ onConvertAction, onSaveLog }) {
  const [initialPrincipal, setInitialPrincipal] = useState("100000");
  const [periodicContribution, setPeriodicContribution] = useState("10000");
  const [annualRate, setAnnualRate] = useState("12");
  const [investmentYears, setInvestmentYears] = useState("5");
  const [compoundFrequency, setCompoundFrequency] = useState("monthly");
  const [contributionTiming, setContributionTiming] = useState("end");
  const [annualFeePercent, setAnnualFeePercent] = useState("0");

  const results = useMemo(() => {
    try {
      if (!initialPrincipal || !annualRate || !investmentYears) return null;
      return calculateCompoundInterest({
        initialPrincipal,
        periodicContribution: periodicContribution || "0",
        annualRate,
        investmentYears,
        compoundFrequency,
        contributionTiming,
        annualFeePercent: annualFeePercent || "0",
      });
    } catch {
      return null;
    }
  }, [
    initialPrincipal,
    periodicContribution,
    annualRate,
    investmentYears,
    compoundFrequency,
    contributionTiming,
    annualFeePercent,
  ]);

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <CalculatorDisplay
        expression={`${investmentYears} years @ ${annualRate}% (${compoundFrequency}) · ${contributionTiming === "beginning" ? "Annuity Due" : "Ordinary"}`}
        mainValue={results ? formatNumber(results.finalBalance) : "0.00"}
        currency="KES"
        mode="standalone"
        subtitle={`Effective Annual Rate (EAR): ${results?.effectiveAnnualRate || "0.00"}%`}
        onClear={() => {
          setInitialPrincipal("");
          setPeriodicContribution("");
        }}
        onSave={() => {
          if (onSaveLog && results) {
            onSaveLog({
              calculatorType: "compound_interest",
              title: `Compound Growth: ${investmentYears} Yrs @ ${annualRate}%`,
              inputs: {
                initialPrincipal,
                periodicContribution,
                annualRate,
                investmentYears,
                compoundFrequency,
                contributionTiming,
              },
              outputs: results,
              isSaved: true,
            });
          }
        }}
        onOpenActionPanel={
          results
            ? () =>
                onConvertAction?.({
                  calculatorType: "compound_interest",
                  calculatedAmount: results.finalBalance,
                  formula: `${investmentYears} Yrs @ ${annualRate}% Compound Growth`,
                  details: {
                    ...results,
                    name: `Compound Simulation (${investmentYears}Y @ ${annualRate}%)`,
                    timeHorizonYears: Number(investmentYears),
                    assumptions: {
                      monthlyInvestment: Number(periodicContribution),
                      assumedAnnualReturnPct: Number(annualRate),
                      inflationPct: 5,
                    },
                  },
                })
            : null
        }
      />

      <div className="p-5 rounded-2xl border border-neutral-800 bg-neutral-900/40 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-neutral-400 mb-1">Initial Starting Capital (KES)</label>
            <input
              type="number"
              value={initialPrincipal}
              onChange={(e) => setInitialPrincipal(e.target.value)}
              placeholder="e.g. 100000"
              className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-white text-sm focus:border-indigo-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-neutral-400 mb-1">Periodic Contribution (KES)</label>
            <input
              type="number"
              value={periodicContribution}
              onChange={(e) => setPeriodicContribution(e.target.value)}
              placeholder="e.g. 10000"
              className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-white text-sm focus:border-indigo-500 focus:outline-none"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-neutral-400 mb-1">Annual Return Rate (%)</label>
            <input
              type="number"
              step="0.1"
              value={annualRate}
              onChange={(e) => setAnnualRate(e.target.value)}
              placeholder="e.g. 12"
              className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-white text-sm focus:border-indigo-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-neutral-400 mb-1">Investment Horizon (Years)</label>
            <input
              type="number"
              value={investmentYears}
              onChange={(e) => setInvestmentYears(e.target.value)}
              placeholder="e.g. 5"
              className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-white text-sm focus:border-indigo-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-neutral-400 mb-1">Compounding Frequency</label>
            <select
              value={compoundFrequency}
              onChange={(e) => setCompoundFrequency(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-white text-sm focus:border-indigo-500 focus:outline-none"
            >
              <option value="annually">Annually (1x/yr)</option>
              <option value="semi_annually">Semi-Annually (2x/yr)</option>
              <option value="quarterly">Quarterly (4x/yr)</option>
              <option value="monthly">Monthly (12x/yr)</option>
              <option value="daily">Daily (365x/yr)</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-neutral-400 mb-1">Contribution Timing</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setContributionTiming("end")}
                className={`py-1.5 px-3 rounded-xl text-xs font-medium border transition-colors ${
                  contributionTiming === "end"
                    ? "bg-indigo-600/20 text-indigo-300 border-indigo-500/40"
                    : "bg-neutral-950 text-neutral-400 border-neutral-800"
                }`}
              >
                End of Period (Ordinary)
              </button>
              <button
                type="button"
                onClick={() => setContributionTiming("beginning")}
                className={`py-1.5 px-3 rounded-xl text-xs font-medium border transition-colors ${
                  contributionTiming === "beginning"
                    ? "bg-indigo-600/20 text-indigo-300 border-indigo-500/40"
                    : "bg-neutral-950 text-neutral-400 border-neutral-800"
                }`}
              >
                Start of Period (Due)
              </button>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-neutral-400 mb-1">Annual Management Fee (%)</label>
            <input
              type="number"
              step="0.1"
              value={annualFeePercent}
              onChange={(e) => setAnnualFeePercent(e.target.value)}
              placeholder="e.g. 1.5 for fund expense ratio"
              className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-white text-sm focus:border-indigo-500 focus:outline-none"
            />
          </div>
        </div>

        {results && (
          <>
            {/* Metric Summaries */}
            <div className="grid grid-cols-3 gap-3 pt-3 border-t border-neutral-800 text-center">
              <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800">
                <div className="text-[10px] text-neutral-500 uppercase">Initial Capital</div>
                <div className="text-sm font-bold text-white mt-0.5">KES {formatNumber(results.initialCapital)}</div>
              </div>
              <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800">
                <div className="text-[10px] text-neutral-500 uppercase">Total Contributed</div>
                <div className="text-sm font-bold text-white mt-0.5">KES {formatNumber(results.totalContributions)}</div>
              </div>
              <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800">
                <div className="text-[10px] text-neutral-500 uppercase">Estimated Growth</div>
                <div className="text-sm font-bold text-indigo-400 mt-0.5">KES {formatNumber(results.estimatedGrowth)}</div>
              </div>
            </div>

            {/* Annual Breakdown Schedule Table */}
            {results.annualSchedule?.length > 0 && (
              <div className="pt-3">
                <div className="text-xs font-semibold text-neutral-400 mb-2">Annual Growth Projection Schedule</div>
                <div className="rounded-xl border border-neutral-800 overflow-x-auto max-h-56">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-neutral-950 text-neutral-400 border-b border-neutral-800 sticky top-0">
                      <tr>
                        <th className="py-2 px-3">Year</th>
                        <th className="py-2 px-3">Start Balance</th>
                        <th className="py-2 px-3">Deposits</th>
                        <th className="py-2 px-3">Interest Earned</th>
                        <th className="py-2 px-3 text-right">Ending Balance</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-800/60 font-mono">
                      {results.annualSchedule.map((row) => (
                        <tr key={row.year} className="hover:bg-neutral-800/30">
                          <td className="py-2 px-3 text-neutral-300">Year {row.year}</td>
                          <td className="py-2 px-3 text-neutral-400">KES {formatNumber(row.startingBalance)}</td>
                          <td className="py-2 px-3 text-neutral-400">KES {formatNumber(row.annualDeposits)}</td>
                          <td className="py-2 px-3 text-indigo-400">+KES {formatNumber(row.annualInterest)}</td>
                          <td className="py-2 px-3 text-right font-bold text-white">
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

        {/* Regulatory Projection Disclaimer */}
        <div className="flex items-start gap-2.5 p-3 rounded-xl bg-neutral-950 border border-neutral-800/80 text-xs text-neutral-400">
          <AlertTriangle className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold text-neutral-200">Disclaimer: </span>
            Compound interest simulations are hypothetical projections based on constant returns. Actual market returns fluctuate, and past performance is no guarantee of future results.
          </div>
        </div>
      </div>
    </div>
  );
}

