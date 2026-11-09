// lib/calculator/savings.js
// Deterministic savings target and contribution calculator.
// Supports both Target-based (how much to save) and Contribution-based (how much will accumulate).

import { Decimal } from "decimal.js";

Decimal.set({ precision: 28, rounding: Decimal.ROUND_HALF_UP });

const ZERO = new Decimal(0);
const HUNDRED = new Decimal(100);

function parse(v, name, defaultValue = null) {
  if (v === null || v === undefined || v === "") {
    if (defaultValue !== null) return new Decimal(defaultValue);
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
 * 1. Target-based Savings:
 * Given Target S_T, Current S_0, Months N, and Annual Return r:
 * Find required periodic contribution PMT.
 *
 * Future Value formula with monthly compounding:
 * FV = S_0 * (1 + r/12)^N + PMT * [ ((1 + r/12)^N - 1) / (r/12) ]
 * When r = 0:
 * FV = S_0 + PMT * N => PMT = (S_T - S_0) / N
 * When r > 0:
 * PMT = (S_T - S_0 * (1 + r/12)^N) / [ ((1 + r/12)^N - 1) / (r/12) ]
 */
export function calculateTargetSavings({
  targetAmount,
  currentSavings = 0,
  months = null,
  targetDate = null,
  startDate = null,
  annualReturnRate = 0,
  frequency = "monthly", // 'monthly' | 'bi_weekly' | 'weekly'
}) {
  const target = parse(targetAmount, "Target amount");
  const current = parse(currentSavings, "Current savings", 0);
  const annualReturn = parse(annualReturnRate, "Annual return rate", 0);

  if (target.lte(0)) {
    throw new Error("Target savings amount must be greater than zero.");
  }
  if (current.lt(0)) {
    throw new Error("Current savings cannot be negative.");
  }

  // Determine number of periods
  let totalMonths = months ? Number(months) : null;
  const start = startDate ? new Date(startDate) : new Date();

  if (targetDate && !totalMonths) {
    const end = new Date(targetDate);
    const diffTime = end.getTime() - start.getTime();
    if (diffTime <= 0) {
      throw new Error("Target completion date must be in the future.");
    }
    const diffDays = diffTime / (1000 * 60 * 60 * 24);
    totalMonths = Math.max(1, Math.round(diffDays / 30.4375));
  }

  if (!totalMonths || totalMonths < 1) {
    throw new Error("Target time horizon (months or target date) must be at least 1 month.");
  }

  // Periods per year
  let periodsPerYear = 12;
  let periodCount = totalMonths;
  if (frequency === "weekly") {
    periodsPerYear = 52;
    periodCount = Math.round(totalMonths * 4.333);
  } else if (frequency === "bi_weekly") {
    periodsPerYear = 26;
    periodCount = Math.round(totalMonths * 2.166);
  }

  const ratePerPeriod = annualReturn.isZero()
    ? ZERO
    : annualReturn.dividedBy(HUNDRED).dividedBy(periodsPerYear);

  let requiredPayment;
  let projectedGrowth = ZERO;

  const remainingGap = Decimal.max(ZERO, target.minus(current));
  const progressPct = current.dividedBy(target).times(100).toNumber();

  if (current.gte(target)) {
    return {
      targetAmount: fixed(target),
      currentSavings: fixed(current),
      remainingGap: "0.00",
      progressPercentage: 100,
      periods: periodCount,
      frequency,
      requiredPeriodicContribution: "0.00",
      totalContributions: "0.00",
      estimatedGrowth: "0.00",
      finalProjectedValue: fixed(current),
      isGoalMet: true,
      assumedAnnualReturn: fixed(annualReturn),
      explanation: `Goal is already 100% funded! Current savings of ${fixed(current)} meet or exceed the target of ${fixed(target)}.`,
    };
  }

  if (ratePerPeriod.isZero()) {
    // Pure linear contribution: no growth assumption
    requiredPayment = remainingGap.dividedBy(periodCount);
    projectedGrowth = ZERO;
  } else {
    // Future value factor for existing capital: (1 + r)^N
    const compoundFactor = ratePerPeriod.plus(1).pow(periodCount);
    const existingGrown = current.times(compoundFactor);
    const shortfall = target.minus(existingGrown);

    if (shortfall.lte(0)) {
      // Existing savings with return alone will hit the target!
      requiredPayment = ZERO;
      projectedGrowth = existingGrown.minus(current);
    } else {
      // Annuity future value factor: ((1 + r)^N - 1) / r
      const annuityFactor = compoundFactor.minus(1).dividedBy(ratePerPeriod);
      requiredPayment = shortfall.dividedBy(annuityFactor);
      projectedGrowth = target.minus(current).minus(requiredPayment.times(periodCount));
    }
  }

  const totalContrib = requiredPayment.times(periodCount);
  const finalValue = current.plus(totalContrib).plus(Decimal.max(ZERO, projectedGrowth));

  // Projected completion date
  const completionDate = new Date(start);
  completionDate.setMonth(completionDate.getMonth() + totalMonths);

  return {
    targetAmount: fixed(target),
    currentSavings: fixed(current),
    remainingGap: fixed(remainingGap),
    progressPercentage: Math.min(100, Math.round(progressPct * 10) / 10),
    totalMonths,
    periods: periodCount,
    frequency,
    requiredPeriodicContribution: fixed(Decimal.max(ZERO, requiredPayment)),
    totalContributions: fixed(totalContrib),
    estimatedGrowth: fixed(Decimal.max(ZERO, projectedGrowth)),
    finalProjectedValue: fixed(finalValue),
    isGoalMet: false,
    estimatedCompletionDate: completionDate.toISOString().slice(0, 10),
    assumedAnnualReturn: fixed(annualReturn),
    isGuaranteed: annualReturn.isZero(),
    explanation: annualReturn.isZero()
      ? `Saving ${fixed(requiredPayment)} ${frequency} for ${periodCount} periods without interest reaches the ${fixed(target)} goal.`
      : `Saving ${fixed(requiredPayment)} ${frequency} with an assumed ${fixed(annualReturn)}% annual return reaches the ${fixed(target)} goal (${fixed(projectedGrowth)} contributed by return).`,
  };
}

/**
 * 2. Contribution-based Savings Accumulation:
 * Given Starting S_0, Periodic Deposit PMT, Horizon N, and Annual Return r:
 * Calculates total accumulated future value.
 */
export function calculateSavingsAccumulation({
  initialSavings = 0,
  periodicContribution,
  periods,
  frequency = "monthly", // 'monthly' | 'bi_weekly' | 'weekly'
  annualReturnRate = 0,
}) {
  const current = parse(initialSavings, "Initial savings", 0);
  const pmt = parse(periodicContribution, "Periodic contribution");
  const n = Number(periods) || 12;
  const annualReturn = parse(annualReturnRate, "Annual return rate", 0);

  if (pmt.lt(0) || current.lt(0)) {
    throw new Error("Contributions and initial balance cannot be negative.");
  }

  let periodsPerYear = 12;
  if (frequency === "weekly") periodsPerYear = 52;
  else if (frequency === "bi_weekly") periodsPerYear = 26;

  const r = annualReturn.isZero()
    ? ZERO
    : annualReturn.dividedBy(HUNDRED).dividedBy(periodsPerYear);

  let finalValue;
  let totalInterest;

  if (r.isZero()) {
    finalValue = current.plus(pmt.times(n));
    totalInterest = ZERO;
  } else {
    const compoundFactor = r.plus(1).pow(n);
    const existingGrown = current.times(compoundFactor);
    const annuityFactor = compoundFactor.minus(1).dividedBy(r);
    const contributionsGrown = pmt.times(annuityFactor);

    finalValue = existingGrown.plus(contributionsGrown);
    totalInterest = finalValue.minus(current).minus(pmt.times(n));
  }

  const totalDeposits = pmt.times(n);

  return {
    initialSavings: fixed(current),
    periodicContribution: fixed(pmt),
    periods: n,
    frequency,
    totalDeposited: fixed(totalDeposits),
    estimatedGrowth: fixed(Decimal.max(ZERO, totalInterest)),
    finalAccumulatedValue: fixed(finalValue),
    assumedAnnualReturn: fixed(annualReturn),
    explanation: `Depositing ${fixed(pmt)} ${frequency} for ${n} periods yields ${fixed(finalValue)} (including ${fixed(totalInterest)} in estimated growth).`,
  };
}

