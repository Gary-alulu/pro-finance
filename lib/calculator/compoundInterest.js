// lib/calculator/compoundInterest.js
// Precision compound interest and investment growth engine.
// Supports variable compounding frequencies, deposit timing (ordinary vs annuity due),
// and effective annual rate (EAR) computation.

import { Decimal } from "decimal.js";

Decimal.set({ precision: 28, rounding: Decimal.ROUND_HALF_UP });

const ZERO = new Decimal(0);
const HUNDRED = new Decimal(100);

const FREQUENCIES = {
  annually: 1,
  semi_annually: 2,
  quarterly: 4,
  monthly: 12,
  bi_weekly: 26,
  weekly: 52,
  daily: 365,
};

function parse(v, name, def = null) {
  if (v === null || v === undefined || v === "") {
    if (def !== null) return new Decimal(def);
    throw new Error(`${name} is required.`);
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
 * Calculate compound interest growth over time.
 *
 * @param {object} params
 * @param {string|number} params.initialPrincipal - Starting balance P
 * @param {string|number} [params.periodicContribution=0] - Additional deposit per contribution period
 * @param {string|number} params.annualRate - Annual interest rate (percentage, e.g. 8.5)
 * @param {number} params.investmentYears - Duration in years
 * @param {string} [params.compoundFrequency="monthly"] - annually, semi_annually, quarterly, monthly, daily
 * @param {string} [params.contributionFrequency="monthly"] - annually, quarterly, monthly, weekly
 * @param {string} [params.contributionTiming="end"] - "end" (ordinary) or "beginning" (annuity due)
 * @param {string|number} [params.annualFeePct=0] - Annual management/platform fee percentage
 */
export function calculateCompoundInterest({
  initialPrincipal,
  periodicContribution = 0,
  annualRate,
  investmentYears,
  compoundFrequency = "monthly",
  contributionFrequency = "monthly",
  contributionTiming = "end",
  annualFeePct = 0,
}) {
  const principal = parse(initialPrincipal, "Initial principal");
  const contribution = parse(periodicContribution, "Periodic contribution", 0);
  const nominalRate = parse(annualRate, "Annual interest rate");
  const years = Number(investmentYears);
  const feePct = parse(annualFeePct, "Annual fee percentage", 0);

  if (principal.lt(0) || contribution.lt(0)) {
    throw new Error("Principal and contribution cannot be negative.");
  }
  if (!years || years <= 0 || years > 100) {
    throw new Error("Investment duration must be between 1 and 100 years.");
  }

  const nComp = FREQUENCIES[compoundFrequency] || 12;
  const nContrib = FREQUENCIES[contributionFrequency] || 12;

  // Net annual rate after fees
  const netAnnualRate = Decimal.max(ZERO, nominalRate.minus(feePct));
  const rNominal = nominalRate.dividedBy(HUNDRED);
  const rNet = netAnnualRate.dividedBy(HUNDRED);

  // Effective Annual Rate (EAR) = (1 + r/n)^n - 1
  const ear = rNet.isZero()
    ? ZERO
    : rNet.dividedBy(nComp).plus(1).pow(nComp).minus(1).times(HUNDRED);

  // Periodic simulation month by month or period by period
  const totalMonths = Math.round(years * 12);
  let currentBalance = principal;
  let totalContributions = ZERO;
  const annualSchedule = [];

  const monthlyCompRate = rNet.dividedBy(12);
  const isBeginning = contributionTiming === "beginning";

  let cumulativeInterest = ZERO;
  let runningContribYear = ZERO;

  for (let m = 1; m <= totalMonths; m++) {
    // Check if this month has a contribution
    const monthsPerContrib = 12 / nContrib;
    const isContribMonth = m % Math.round(monthsPerContrib) === 0 || monthsPerContrib < 1;
    const deposit = isContribMonth ? contribution : ZERO;

    if (deposit.gt(0)) {
      if (isBeginning) {
        currentBalance = currentBalance.plus(deposit);
      }
      totalContributions = totalContributions.plus(deposit);
      runningContribYear = runningContribYear.plus(deposit);
    }

    // Monthly compound interest
    const interest = currentBalance.times(monthlyCompRate);
    currentBalance = currentBalance.plus(interest);
    cumulativeInterest = cumulativeInterest.plus(interest);

    if (deposit.gt(0) && !isBeginning) {
      currentBalance = currentBalance.plus(deposit);
    }

    // Capture year-end snapshot
    if (m % 12 === 0 || m === totalMonths) {
      const yearIndex = Math.ceil(m / 12);
      annualSchedule.push({
        year: yearIndex,
        balance: fixed(currentBalance),
        cumulativeContributions: fixed(totalContributions),
        cumulativeInterest: fixed(cumulativeInterest),
      });
    }
  }

  const finalBalance = currentBalance;
  const totalInterestGained = finalBalance.minus(principal).minus(totalContributions);

  return {
    initialPrincipal: fixed(principal),
    periodicContribution: fixed(contribution),
    contributionFrequency,
    contributionTiming,
    compoundFrequency,
    investmentYears: years,
    annualRate: fixed(nominalRate),
    netAnnualRate: fixed(netAnnualRate),
    effectiveAnnualRate: fixed(ear),
    totalContributions: fixed(totalContributions),
    totalInterestEarned: fixed(Decimal.max(ZERO, totalInterestGained)),
    finalBalance: fixed(finalBalance),
    annualSchedule,
    disclosure: nominalRate.gt(0)
      ? "Investment returns are projections subject to market volatility and are not contractually guaranteed."
      : "Calculated with 0% nominal return.",
  };
}

