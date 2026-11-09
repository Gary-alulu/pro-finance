// lib/calculator/budget.js
// Cash-flow allocation, debt-to-income, savings rate, and 50/30/20 budget framework.
// Strictly excludes internal transfers from consumption expenditure.

import { Decimal } from "decimal.js";

Decimal.set({ precision: 28, rounding: Decimal.ROUND_HALF_UP });

const ZERO = new Decimal(0);
const HUNDRED = new Decimal(100);

function parse(v, name, def = 0) {
  if (v === null || v === undefined || v === "") {
    return new Decimal(def);
  }
  try {
    const d = new Decimal(v.toString());
    if (d.isNaN()) throw new Error();
    return d;
  } catch {
    throw new Error(`${name} must be a valid number.`);
  }
}

function fixed(d, places = 2) {
  return d.toFixed(places);
}

/**
 * Evaluates monthly budget allocation, savings rate, and ratios.
 */
export function calculateBudget({
  monthlyIncome,
  fixedExpenses = 0,
  variableExpenses = 0,
  debtRepayments = 0,
  savingsContributions = 0,
  investmentContributions = 0,
}) {
  const income = parse(monthlyIncome, "Monthly income");
  const fixedExp = parse(fixedExpenses, "Fixed expenses", 0);
  const varExp = parse(variableExpenses, "Variable expenses", 0);
  const debt = parse(debtRepayments, "Debt repayments", 0);
  const savings = parse(savingsContributions, "Savings contributions", 0);
  const investments = parse(investmentContributions, "Investment contributions", 0);

  if (income.lte(0)) {
    throw new Error("Monthly income must be greater than zero.");
  }
  if (
    fixedExp.lt(0) ||
    varExp.lt(0) ||
    debt.lt(0) ||
    savings.lt(0) ||
    investments.lt(0)
  ) {
    throw new Error("Budget line items cannot be negative.");
  }

  // Pure consumption expenses (fixed + variable)
  const totalLivingExpenses = fixedExp.plus(varExp);
  // Total wealth-building capital movements
  const totalWealthBuilding = savings.plus(investments);
  // Total committed outflows
  const totalOutflows = totalLivingExpenses.plus(debt).plus(totalWealthBuilding);
  // Net surplus or deficit
  const netSurplus = income.minus(totalOutflows);

  // Key Financial Ratios
  const savingsRate = totalWealthBuilding.dividedBy(income).times(HUNDRED);
  const expenseRatio = totalLivingExpenses.dividedBy(income).times(HUNDRED);
  const debtToIncomeRatio = debt.dividedBy(income).times(HUNDRED);

  // 50 / 30 / 20 Framework Comparison:
  // Needs (Fixed + Essential Debt): Target 50%
  // Wants (Variable expenses): Target 30%
  // Savings & Investments (Wealth + Debt Reduction): Target 20%
  const needsAmount = fixedExp.plus(debt);
  const wantsAmount = varExp;
  const savingsAmount = totalWealthBuilding;

  const needsPct = needsAmount.dividedBy(income).times(HUNDRED);
  const wantsPct = wantsAmount.dividedBy(income).times(HUNDRED);
  const savingsPct = savingsAmount.dividedBy(income).times(HUNDRED);

  return {
    monthlyIncome: fixed(income),
    fixedExpenses: fixed(fixedExp),
    variableExpenses: fixed(varExp),
    debtRepayments: fixed(debt),
    savingsContributions: fixed(savings),
    investmentContributions: fixed(investments),
    totalLivingExpenses: fixed(totalLivingExpenses),
    totalWealthBuilding: fixed(totalWealthBuilding),
    totalOutflows: fixed(totalOutflows),
    netSurplusOrDeficit: fixed(netSurplus),
    isSurplus: netSurplus.gte(0),
    savingsRatePercent: fixed(savingsRate, 1),
    expenseRatioPercent: fixed(expenseRatio, 1),
    debtToIncomeRatioPercent: fixed(debtToIncomeRatio, 1),
    frameworkComparison503020: {
      needs: {
        amount: fixed(needsAmount),
        percentage: fixed(needsPct, 1),
        targetPercentage: "50.0",
        differenceFromTarget: fixed(needsPct.minus(50), 1),
      },
      wants: {
        amount: fixed(wantsAmount),
        percentage: fixed(wantsPct, 1),
        targetPercentage: "30.0",
        differenceFromTarget: fixed(wantsPct.minus(30), 1),
      },
      savingsAndDebt: {
        amount: fixed(savingsAmount),
        percentage: fixed(savingsPct, 1),
        targetPercentage: "20.0",
        differenceFromTarget: fixed(savingsPct.minus(20), 1),
      },
    },
    ruleDisclosure: "Internal transfers between owned accounts are balance-sheet movements and are strictly excluded from living expenses.",
  };
}

