// lib/calculator/loan.js
// Precision loan and mortgage amortization engine.
// Generates reducing-balance schedules, tracks extra repayments, and compares payoff strategies.

import { Decimal } from "decimal.js";

Decimal.set({ precision: 28, rounding: Decimal.ROUND_HALF_UP });

const ZERO = new Decimal(0);
const HUNDRED = new Decimal(100);

const FREQUENCIES = {
  monthly: 12,
  bi_weekly: 26,
  weekly: 52,
  quarterly: 4,
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
 * Calculate loan amortization schedule, periodic payment, and debt-free date.
 */
export function calculateLoan({
  principalAmount,
  annualInterestRate,
  termMonths = null,
  termYears = null,
  repaymentFrequency = "monthly",
  extraMonthlyPayment = 0,
  startDate = null,
  balloonPayment = 0,
}) {
  const principal = parse(principalAmount, "Principal amount");
  const annualRate = parse(annualInterestRate, "Annual interest rate");
  const extra = parse(extraMonthlyPayment, "Extra payment", 0);
  const balloon = parse(balloonPayment, "Balloon payment", 0);

  if (principal.lte(0)) {
    throw new Error("Loan principal amount must be greater than zero.");
  }
  if (annualRate.lt(0)) {
    throw new Error("Annual interest rate cannot be negative.");
  }

  let totalMonths = termMonths ? Number(termMonths) : termYears ? Math.round(Number(termYears) * 12) : 0;
  if (!totalMonths || totalMonths <= 0 || totalMonths > 600) {
    throw new Error("Loan duration must be between 1 and 600 months (up to 50 years).");
  }

  const periodsPerYear = FREQUENCIES[repaymentFrequency] || 12;
  const totalPeriods = Math.round((totalMonths / 12) * periodsPerYear);
  const periodicRate = annualRate.isZero()
    ? ZERO
    : annualRate.dividedBy(HUNDRED).dividedBy(periodsPerYear);

  // Standard periodic payment PMT = (P - Balloon / (1+r)^N) * (r(1+r)^N / ((1+r)^N - 1))
  let basePayment;
  if (periodicRate.isZero()) {
    basePayment = principal.minus(balloon).dividedBy(totalPeriods);
  } else {
    const compoundFactor = periodicRate.plus(1).pow(totalPeriods);
    const discountedBalloon = balloon.dividedBy(compoundFactor);
    const effectivePrincipal = principal.minus(discountedBalloon);
    basePayment = effectivePrincipal.times(
      periodicRate.times(compoundFactor).dividedBy(compoundFactor.minus(1))
    );
  }

  const effectivePeriodicPayment = basePayment.plus(extra);

  // Generate full amortization schedule
  let balance = principal;
  let cumulativeInterest = ZERO;
  let cumulativePrincipal = ZERO;
  const schedule = [];
  const start = startDate ? new Date(startDate) : new Date();

  let actualPeriods = 0;

  for (let p = 1; p <= totalPeriods + 120; p++) {
    if (balance.lte(0.005)) break;

    const interestForPeriod = balance.times(periodicRate);
    let principalForPeriod = effectivePeriodicPayment.minus(interestForPeriod);

    // Final balloon or payoff adjustment
    if (balance.lte(principalForPeriod)) {
      principalForPeriod = balance;
    }

    balance = Decimal.max(ZERO, balance.minus(principalForPeriod));
    cumulativeInterest = cumulativeInterest.plus(interestForPeriod);
    cumulativePrincipal = cumulativePrincipal.plus(principalForPeriod);
    actualPeriods = p;

    // Record period in schedule (limit detailed rows to first 120, plus summaries)
    if (p <= 120 || balance.isZero()) {
      const periodDate = new Date(start);
      periodDate.setDate(periodDate.getDate() + Math.round((p * 365.25) / periodsPerYear));

      schedule.push({
        period: p,
        date: periodDate.toISOString().slice(0, 10),
        payment: fixed(principalForPeriod.plus(interestForPeriod)),
        principalPortion: fixed(principalForPeriod),
        interestPortion: fixed(interestForPeriod),
        remainingBalance: fixed(balance),
        cumulativeInterest: fixed(cumulativeInterest),
      });
    }
  }

  const totalPaid = cumulativePrincipal.plus(cumulativeInterest).plus(balloon);
  const payoffMonths = Math.round((actualPeriods / periodsPerYear) * 12);
  const payoffDate = new Date(start);
  payoffDate.setMonth(payoffDate.getMonth() + payoffMonths);

  // Comparison with baseline (if extra payment was provided)
  let extraSavings = null;
  if (extra.gt(0)) {
    const baselineTotalPaid = basePayment.times(totalPeriods).plus(balloon);
    const baselineInterest = baselineTotalPaid.minus(principal);
    const interestSaved = Decimal.max(ZERO, baselineInterest.minus(cumulativeInterest));
    const monthsSaved = Math.max(0, totalMonths - payoffMonths);

    extraSavings = {
      interestSaved: fixed(interestSaved),
      monthsSaved,
      fasterPayoffYears: (monthsSaved / 12).toFixed(1),
    };
  }

  return {
    principalAmount: fixed(principal),
    annualInterestRate: fixed(annualRate),
    termMonths: totalMonths,
    repaymentFrequency,
    basePeriodicPayment: fixed(basePayment),
    extraPeriodicPayment: fixed(extra),
    totalPeriodicPayment: fixed(effectivePeriodicPayment),
    totalInterestPaid: fixed(cumulativeInterest),
    totalRepaymentAmount: fixed(totalPaid),
    scheduledPeriods: totalPeriods,
    actualPeriodsToPayoff: actualPeriods,
    payoffMonths,
    estimatedSettlementDate: payoffDate.toISOString().slice(0, 10),
    extraSavings,
    schedulePreview: schedule,
    methodDescription: annualRate.isZero()
      ? "Zero-interest straight amortization."
      : "Standard reducing-balance compound amortization.",
  };
}

