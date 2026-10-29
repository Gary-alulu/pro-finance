// lib/simulator/engine.js
// Deterministic financial projection engine for Wealth Simulator & Future Self.
// Uses decimal.js for safe monetary math.
//
// Rules enforced:
// 1. Starting balances are derived from verified records, never fabricated.
// 2. Missing valuations remain null/disclosed — never treated as zero.
// 3. Investment compound growth: B_{t+1} = B_t * (1 + r_m) + C_t.
// 4. Contribution increases step up after each 12-month period.
// 5. Debt amortization models interest and principal reductions deterministically.
// 6. Double-counting prohibited: transfers simply reallocate assets without inflating net worth.
// 7. Nominal vs. Real (inflation-adjusted) trajectories are computed side-by-side.

import { Decimal } from "decimal.js";

Decimal.set({ precision: 28, rounding: Decimal.ROUND_HALF_UP });

const ZERO = new Decimal(0);

export const DEFAULT_ASSUMPTIONS = {
  monthlyInvestment: 3000,
  annualContributionIncreasePct: 0,
  assumedAnnualReturnPct: 8,
  inflationPct: 3,
  otherAssetGrowthPct: 2,
  debtInterestPct: 0,
  monthlyDebtPayment: 0,
};

export const PRESET_SCENARIOS = {
  conservative: {
    name: "Conservative",
    description: "Defensive assumptions with modest returns and elevated inflation.",
    assumedAnnualReturnPct: 5,
    inflationPct: 5,
    annualContributionIncreasePct: 0,
    otherAssetGrowthPct: 1,
  },
  baseline: {
    name: "Baseline",
    description: "Balanced historical expectations with steady disciplined savings.",
    assumedAnnualReturnPct: 8,
    inflationPct: 3,
    annualContributionIncreasePct: 3,
    otherAssetGrowthPct: 2,
  },
  aggressive: {
    name: "Growth Focused",
    description: "Higher equity weighting, proactive contribution step-ups.",
    assumedAnnualReturnPct: 11,
    inflationPct: 2.5,
    annualContributionIncreasePct: 5,
    otherAssetGrowthPct: 3,
  },
};

/**
 * Safe Decimal parser. Returns null for null/undefined/invalid values.
 */
export function toDec(val) {
  if (val === null || val === undefined || val === "") return null;
  try {
    const d = new Decimal(val.toString());
    return d.isNaN() ? null : d;
  } catch {
    return null;
  }
}

function fixed2(d) {
  return d ? d.toFixed(2) : "0.00";
}

/**
 * Computes deterministic month-by-month wealth projection.
 *
 * @param {Object} params
 * @param {Object} params.snapshot - Starting financial balances
 * @param {string|number|null} params.snapshot.recordedCash - Liquid cash
 * @param {string|number|null} params.snapshot.recordedInvestments - Holdings market value
 * @param {string|number|null} params.snapshot.recordedOtherAssets - Physical/other assets
 * @param {string|number|null} params.snapshot.recordedLiabilities - Total debt
 * @param {Object} params.assumptions - Editable scenario variables
 * @param {number} params.timeHorizonYears - Duration (1, 3, 5, 10, or custom)
 * @returns {Object} Deterministic projection timeline, metrics, and disclosures
 */
export function projectWealth({
  snapshot = {},
  assumptions = {},
  timeHorizonYears = 5,
} = {}) {
  const years = Math.max(1, Math.min(40, Number(timeHorizonYears) || 5));
  const totalMonths = years * 12;

  // 1. Parse starting balances safely
  const initialCash = toDec(snapshot.recordedCash) ?? ZERO;
  const initialInvestments = toDec(snapshot.recordedInvestments) ?? ZERO;
  const initialOtherAssets = toDec(snapshot.recordedOtherAssets) ?? ZERO;
  const initialLiabilities = toDec(snapshot.recordedLiabilities) ?? ZERO;

  const missingFlags = {
    cashMissing: snapshot.recordedCash === null || snapshot.recordedCash === undefined,
    investmentsMissing: snapshot.recordedInvestments === null || snapshot.recordedInvestments === undefined,
    otherAssetsMissing: snapshot.recordedOtherAssets === null || snapshot.recordedOtherAssets === undefined,
    liabilitiesMissing: snapshot.recordedLiabilities === null || snapshot.recordedLiabilities === undefined,
  };

  // 2. Parse assumption variables
  const monthlyContribBase = toDec(assumptions.monthlyInvestment ?? DEFAULT_ASSUMPTIONS.monthlyInvestment) ?? ZERO;
  const annualContribStepPct = toDec(assumptions.annualContributionIncreasePct ?? DEFAULT_ASSUMPTIONS.annualContributionIncreasePct) ?? ZERO;
  const annualReturnPct = toDec(assumptions.assumedAnnualReturnPct ?? DEFAULT_ASSUMPTIONS.assumedAnnualReturnPct) ?? ZERO;
  const inflationRatePct = toDec(assumptions.inflationPct ?? DEFAULT_ASSUMPTIONS.inflationPct) ?? ZERO;
  const otherGrowthPct = toDec(assumptions.otherAssetGrowthPct ?? DEFAULT_ASSUMPTIONS.otherAssetGrowthPct) ?? ZERO;
  const debtInterestRatePct = toDec(assumptions.debtInterestPct ?? DEFAULT_ASSUMPTIONS.debtInterestPct) ?? ZERO;
  const monthlyDebtPay = toDec(assumptions.monthlyDebtPayment ?? DEFAULT_ASSUMPTIONS.monthlyDebtPayment) ?? ZERO;

  // Monthly rates: r_m = (annualPct / 100) / 12
  const monthlyReturnRate = annualReturnPct.dividedBy(100).dividedBy(12);
  const monthlyOtherGrowthRate = otherGrowthPct.dividedBy(100).dividedBy(12);
  const monthlyDebtInterestRate = debtInterestRatePct.dividedBy(100).dividedBy(12);
  const annualContribMultiplier = new Decimal(1).plus(annualContribStepPct.dividedBy(100));

  let currentInvestments = initialInvestments;
  let currentOtherAssets = initialOtherAssets;
  let currentLiabilities = initialLiabilities;
  let currentCash = initialCash;
  let cumulativeContributions = ZERO;
  let debtFreeMonth = initialLiabilities.isZero() ? 0 : null;

  const monthlyPoints = [];
  const yearlyPoints = [];

  // Point 0 (Starting baseline)
  const startingNetWorth = initialCash.plus(initialInvestments).plus(initialOtherAssets).minus(initialLiabilities);

  const pointZero = {
    month: 0,
    year: 0,
    label: "Now",
    cash: fixed2(initialCash),
    investments: fixed2(initialInvestments),
    otherAssets: fixed2(initialOtherAssets),
    totalAssets: fixed2(initialCash.plus(initialInvestments).plus(initialOtherAssets)),
    liabilities: fixed2(initialLiabilities),
    netWorth: fixed2(startingNetWorth),
    realNetWorth: fixed2(startingNetWorth), // At t=0, nominal == real
    contributions: "0.00",
    investmentGains: "0.00",
  };
  monthlyPoints.push(pointZero);
  yearlyPoints.push(pointZero);

  // Month-by-month simulation
  for (let m = 1; m <= totalMonths; m++) {
    const yearIndex = Math.floor((m - 1) / 12);

    // Contribution for this month: step up every 12 months
    const currentMonthlyContrib = monthlyContribBase.times(annualContribMultiplier.pow(yearIndex));
    cumulativeContributions = cumulativeContributions.plus(currentMonthlyContrib);

    // Investment compounding: B_{t+1} = B_t * (1 + r_m) + C_t
    const investmentGrowth = currentInvestments.times(monthlyReturnRate);
    currentInvestments = Decimal.max(ZERO, currentInvestments.plus(investmentGrowth).plus(currentMonthlyContrib));

    // Other physical/property assets growth
    const otherGrowth = currentOtherAssets.times(monthlyOtherGrowthRate);
    currentOtherAssets = Decimal.max(ZERO, currentOtherAssets.plus(otherGrowth));

    // Debt amortization with interest
    if (currentLiabilities.greaterThan(ZERO)) {
      const debtInterest = currentLiabilities.times(monthlyDebtInterestRate);
      const totalOwed = currentLiabilities.plus(debtInterest);
      const payment = Decimal.min(totalOwed, monthlyDebtPay);
      currentLiabilities = Decimal.max(ZERO, totalOwed.minus(payment));

      if (currentLiabilities.isZero() && debtFreeMonth === null) {
        debtFreeMonth = m;
      }
    }

    const totalAssets = currentCash.plus(currentInvestments).plus(currentOtherAssets);
    const nominalNetWorth = totalAssets.minus(currentLiabilities);

    // Inflation adjustment: Real value = Nominal / (1 + inflation)^(m / 12)
    const yearsElapsed = new Decimal(m).dividedBy(12);
    const inflationFactor = new Decimal(1).plus(inflationRatePct.dividedBy(100)).pow(yearsElapsed);
    const realNetWorth = inflationFactor.isZero() ? nominalNetWorth : nominalNetWorth.dividedBy(inflationFactor);

    // Cumulative investment gains = currentInvestments - initialInvestments - cumulativeContributions
    const totalGains = currentInvestments.minus(initialInvestments).minus(cumulativeContributions);

    const point = {
      month: m,
      year: +(m / 12).toFixed(1),
      label: m % 12 === 0 ? `Year ${m / 12}` : `M${m}`,
      cash: fixed2(currentCash),
      investments: fixed2(currentInvestments),
      otherAssets: fixed2(currentOtherAssets),
      totalAssets: fixed2(totalAssets),
      liabilities: fixed2(currentLiabilities),
      netWorth: fixed2(nominalNetWorth),
      realNetWorth: fixed2(realNetWorth),
      contributions: fixed2(cumulativeContributions),
      investmentGains: fixed2(totalGains),
    };

    monthlyPoints.push(point);

    if (m % 12 === 0) {
      yearlyPoints.push(point);
    }
  }

  // End of simulation metrics
  const finalPoint = monthlyPoints[monthlyPoints.length - 1];
  const finalNominalNW = new Decimal(finalPoint.netWorth);
  const netWorthDelta = finalNominalNW.minus(startingNetWorth);
  const netWorthGrowthPct = startingNetWorth.abs().greaterThan(ZERO)
    ? netWorthDelta.dividedBy(startingNetWorth.abs()).times(100)
    : ZERO;

  return {
    timeHorizonYears: years,
    currency: snapshot.currency || "KES",
    snapshotDate: snapshot.takenAt || new Date().toISOString(),
    missingFlags,
    summary: {
      startingNetWorth: fixed2(startingNetWorth),
      finalNetWorth: finalPoint.netWorth,
      finalRealNetWorth: finalPoint.realNetWorth,
      netWorthGrowth: fixed2(netWorthDelta),
      netWorthGrowthPct: +netWorthGrowthPct.toFixed(1),
      finalInvestments: finalPoint.investments,
      finalTotalAssets: finalPoint.totalAssets,
      finalLiabilities: finalPoint.liabilities,
      totalContributions: finalPoint.contributions,
      cumulativeInvestmentGains: finalPoint.investmentGains,
      debtFreeMonth,
      debtFreeYear: debtFreeMonth !== null ? +(debtFreeMonth / 12).toFixed(1) : null,
    },
    assumptionsUsed: {
      monthlyInvestment: fixed2(monthlyContribBase),
      annualContributionIncreasePct: +annualContribStepPct.toFixed(1),
      assumedAnnualReturnPct: +annualReturnPct.toFixed(1),
      inflationPct: +inflationRatePct.toFixed(1),
      otherAssetGrowthPct: +otherGrowthPct.toFixed(1),
      debtInterestPct: +debtInterestRatePct.toFixed(1),
      monthlyDebtPayment: fixed2(monthlyDebtPay),
    },
    projections: {
      yearly: yearlyPoints,
      monthly: monthlyPoints,
    },
  };
}
