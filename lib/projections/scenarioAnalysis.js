// lib/projections/scenarioAnalysis.js
import { Decimal } from "decimal.js";

function toDec(v) {
  try {
    if (v == null || v === "") return null;
    return new Decimal(String(v));
  } catch {
    return null;
  }
}

export function projectWealth({
  assets = [],
  liabilities = [],
  investments = [],
  scenarios = [],
  years = 10,
  inflationRate = 0,
} = {}) {
  // Calculate starting net worth deterministically
  let totalAssets = new Decimal(0);
  let totalLiabs = new Decimal(0);

  for (const a of assets) {
    const v = toDec(a.currentValue?.amount);
    if (v && v.greaterThanOrEqualTo(0)) totalAssets = totalAssets.plus(v);
  }
  for (const l of liabilities) {
    const v = toDec(l.currentBalance?.amount);
    if (v && v.greaterThan(0)) totalLiabs = totalLiabs.plus(v);
  }

  const startNetWorth = totalAssets.minus(totalLiabs);
  const results = [];

  const scenarioList = Array.isArray(scenarios) && scenarios.length > 0 ? scenarios : [{ name: "baseline", monthlyInvestment: 0, extraLoanPayment: 0, savingsIncrease: 0 }];

  for (const sc of scenarioList) {
    const monthlyInv = toDec(sc.monthlyInvestment || 0) || new Decimal(0);
    const extraLoan = toDec(sc.extraLoanPayment || 0) || new Decimal(0);
    const savingsInc = toDec(sc.savingsIncrease || 0) || new Decimal(0);
    const annualRate = toDec(sc.annualReturnRate || 0.05);
    const monthlyRate = annualRate.div(12);
    const infl = toDec(inflationRate || 0);

    let netWorth = startNetWorth;
    const timeline = [];

    for (let year = 0; year <= years; year++) {
      // Apply annual contributions
      if (year > 0) {
        const annualContribution = monthlyInv.plus(savingsInc).times(12);
        // Simple compound growth approximation
        const growth = netWorth.times(annualRate);
        netWorth = netWorth.plus(annualContribution).plus(growth).minus(extraLoan.times(12));
        // Apply inflation adjustment conceptually (values shown in nominal terms)
        if (infl.greaterThan(0)) {
          netWorth = netWorth.div(new Decimal(1).plus(infl));
        }
      }
      timeline.push({
        year,
        netWorth: netWorth.toString(),
        assets: totalAssets.plus(monthlyInv.plus(savingsInc).times(year * 12)).toString(),
        liabilities: Math.max(0, totalLiabs.minus(extraLoan.times(year * 12))).toString(),
      });
    }

    results.push({
      name: sc.name || "scenario",
      assumptions: {
        monthlyInvestment: monthlyInv.toString(),
        extraLoanPayment: extraLoan.toString(),
        savingsIncrease: savingsInc.toString(),
        annualReturnRate: annualRate.toString(),
        inflationRate: infl.toString(),
        years,
        deterministic: true,
      },
      startNetWorth: startNetWorth.toString(),
      endNetWorth: netWorth.toString(),
      timeline,
      disclaimer: "Projections are estimates, never guarantees. Calculations performed deterministically by the projection engine.",
      explanation: `Based on starting net worth of ${startNetWorth.toString()}, contributing ${monthlyInv.plus(savingsInc).toString()} monthly at ~${annualRate.times(100).toFixed(1)}% annual return over ${years} years${extraLoan.greaterThan(0) ? ` with extra loan payments of ${extraLoan.toString()} monthly` : ""}.`,
    });
  }

  return {
    projections: results,
    startNetWorth: startNetWorth.toString(),
    disclaimer: "All projections are estimates, never guarantees. AI only explains assumptions and compares outcomes.",
    engine: "deterministic",
  };
}
