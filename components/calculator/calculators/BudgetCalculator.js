"use client";
// components/calculator/calculators/BudgetCalculator.js
// Cash-flow and budget allocator evaluating surplus, savings rate, and 50/30/20 guidelines.

import { useState, useMemo } from "react";
import CalculatorDisplay from "../CalculatorDisplay";
import { calculateBudget } from "@/lib/calculator/budget";
import { formatNumber } from "@/lib/finance/currency";
import { PieChart, TrendingDown, TrendingUp, AlertCircle } from "lucide-react";

export default function BudgetCalculator({ onConvertAction, onSaveLog }) {
  const [monthlyIncome, setMonthlyIncome] = useState("200000");
  const [fixedExpenses, setFixedExpenses] = useState("80000");
  const [variableExpenses, setVariableExpenses] = useState("40000");
  const [debtRepayments, setDebtRepayments] = useState("25000");
  const [savingsContributions, setSavingsContributions] = useState("30000");
  const [investmentContributions, setInvestmentContributions] = useState("15000");

  const results = useMemo(() => {
    try {
      if (!monthlyIncome) return null;
      return calculateBudget({
        monthlyIncome,
        fixedExpenses: fixedExpenses || "0",
        variableExpenses: variableExpenses || "0",
        debtRepayments: debtRepayments || "0",
        savingsContributions: savingsContributions || "0",
        investmentContributions: investmentContributions || "0",
      });
    } catch {
      return null;
    }
  }, [
    monthlyIncome,
    fixedExpenses,
    variableExpenses,
    debtRepayments,
    savingsContributions,
    investmentContributions,
  ]);

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <CalculatorDisplay
        expression={`Income: KES ${formatNumber(monthlyIncome)} − Outflows: KES ${results ? formatNumber(results.totalOutflows) : "0"}`}
        mainValue={results ? formatNumber(results.netSurplusOrDeficit) : "0.00"}
        currency="KES"
        mode="standalone"
        subtitle={
          results?.isSurplus
            ? `Monthly Surplus · Savings Rate: ${results.savingsRatePercent}%`
            : `Monthly Deficit · Expenses exceed income by KES ${formatNumber(results?.netSurplusOrDeficit || "0")}`
        }
        onClear={() => {
          setMonthlyIncome("");
          setFixedExpenses("");
          setVariableExpenses("");
          setDebtRepayments("");
          setSavingsContributions("");
          setInvestmentContributions("");
        }}
        onSave={() => {
          if (onSaveLog && results) {
            onSaveLog({
              calculatorType: "budget",
              title: `Budget: ${results.isSurplus ? "Surplus" : "Deficit"} of KSh ${formatNumber(results.netSurplusOrDeficit)}`,
              inputs: { monthlyIncome, fixedExpenses, variableExpenses, debtRepayments, savingsContributions, investmentContributions },
              outputs: results,
              isSaved: true,
            });
          }
        }}
        onOpenActionPanel={
          results
            ? () =>
                onConvertAction?.({
                  calculatorType: "budget",
                  calculatedAmount: results.netSurplusOrDeficit,
                  formula: `Surplus: KES ${results.netSurplusOrDeficit}/mo`,
                  details: {
                    ...results,
                    title: "Monthly Budget & Cash Flow Assessment",
                    category: "financial_planning",
                    contextReasoning: `Cash flow review: Income KES ${monthlyIncome}, outflows KES ${results.totalOutflows}. Savings rate: ${results.savingsRatePercent}%, debt ratio: ${results.debtToIncomeRatioPercent}%.`,
                  },
                })
            : null
        }
      />

      <div className="p-5 rounded-2xl border border-neutral-800 bg-neutral-900/40 space-y-4">
        {/* Income */}
        <div>
          <label className="block text-xs font-medium text-emerald-400 mb-1">Total Monthly Net Income (KES)</label>
          <input
            type="number"
            value={monthlyIncome}
            onChange={(e) => setMonthlyIncome(e.target.value)}
            placeholder="e.g. 200000"
            className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-white text-sm font-semibold focus:border-emerald-500 focus:outline-none"
          />
        </div>

        {/* Expenses */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-neutral-400 mb-1">Fixed Expenses (Rent, Utilities, Food)</label>
            <input
              type="number"
              value={fixedExpenses}
              onChange={(e) => setFixedExpenses(e.target.value)}
              placeholder="e.g. 80000"
              className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-white text-sm focus:border-orange-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-neutral-400 mb-1">Variable / Discretionary Expenses</label>
            <input
              type="number"
              value={variableExpenses}
              onChange={(e) => setVariableExpenses(e.target.value)}
              placeholder="e.g. 40000"
              className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-white text-sm focus:border-orange-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Debt & Savings */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-neutral-400 mb-1">Debt Repayments (Loans/Cards)</label>
            <input
              type="number"
              value={debtRepayments}
              onChange={(e) => setDebtRepayments(e.target.value)}
              placeholder="e.g. 25000"
              className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-white text-sm focus:border-orange-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-neutral-400 mb-1">Emergency / Cash Savings</label>
            <input
              type="number"
              value={savingsContributions}
              onChange={(e) => setSavingsContributions(e.target.value)}
              placeholder="e.g. 30000"
              className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-white text-sm focus:border-orange-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-neutral-400 mb-1">Investments (Stocks, MMF, Real Estate)</label>
            <input
              type="number"
              value={investmentContributions}
              onChange={(e) => setInvestmentContributions(e.target.value)}
              placeholder="e.g. 15000"
              className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-white text-sm focus:border-orange-500 focus:outline-none"
            />
          </div>
        </div>

        {results && (
          <>
            {/* 50 / 30 / 20 Framework Comparison */}
            <div className="pt-3 border-t border-neutral-800 space-y-2">
              <div className="text-xs font-semibold text-neutral-400">50/30/20 Rule Comparison</div>
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800">
                  <div className="text-[10px] text-neutral-500 uppercase">Needs (Target 50%)</div>
                  <div className="text-sm font-bold text-white mt-0.5">
                    {results.needsRatioPercent}%
                  </div>
                  <div className="text-[10px] text-neutral-500 mt-1">KES {formatNumber(fixedExpenses)}</div>
                </div>
                <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800">
                  <div className="text-[10px] text-neutral-500 uppercase">Wants (Target 30%)</div>
                  <div className="text-sm font-bold text-white mt-0.5">
                    {results.wantsRatioPercent}%
                  </div>
                  <div className="text-[10px] text-neutral-500 mt-1">KES {formatNumber(variableExpenses)}</div>
                </div>
                <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800">
                  <div className="text-[10px] text-neutral-500 uppercase">Savings / Debt (Target 20%)</div>
                  <div className="text-sm font-bold text-emerald-400 mt-0.5">
                    {(Number(results.savingsRatePercent) + Number(results.debtToIncomeRatioPercent)).toFixed(1)}%
                  </div>
                  <div className="text-[10px] text-neutral-500 mt-1">
                    KES {formatNumber(Number(savingsContributions) + Number(investmentContributions) + Number(debtRepayments))}
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

