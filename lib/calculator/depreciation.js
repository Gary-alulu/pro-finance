// lib/calculator/depreciation.js
// Asset depreciation calculation service.
// Supports Straight-Line and Declining-Balance schedules.
// Clarifies that book carrying value differs from tax depreciation and resale value.

import { Decimal } from "decimal.js";

Decimal.set({ precision: 28, rounding: Decimal.ROUND_HALF_UP });

const ZERO = new Decimal(0);
const HUNDRED = new Decimal(100);

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
 * Calculate asset depreciation schedule.
 *
 * @param {object} params
 * @param {string|number} params.acquisitionCost - Initial cost of asset
 * @param {string|number} [params.salvageValue=0] - Estimated residual/scrap value at end of useful life
 * @param {number} params.usefulLifeYears - Expected lifespan in years
 * @param {string} [params.method="straight_line"] - "straight_line" | "declining_balance" | "double_declining"
 * @param {string|Date} [params.startDate=null] - Date asset placed in service
 * @param {string|Date} [params.asOfDate=null] - Valuation date to evaluate current carrying value
 */
export function calculateDepreciation({
  acquisitionCost,
  salvageValue = 0,
  usefulLifeYears,
  method = "straight_line",
  startDate = null,
  asOfDate = null,
}) {
  const cost = parse(acquisitionCost, "Acquisition cost");
  const salvage = parse(salvageValue, "Salvage value", 0);
  const life = Number(usefulLifeYears);

  if (cost.lte(0)) {
    throw new Error("Acquisition cost must be greater than zero.");
  }
  if (salvage.lt(0)) {
    throw new Error("Salvage value cannot be negative.");
  }
  if (salvage.gte(cost)) {
    throw new Error("Salvage value cannot be greater than or equal to acquisition cost.");
  }
  if (!life || life <= 0 || life > 100) {
    throw new Error("Useful life must be between 1 and 100 years.");
  }

  const depreciableBase = cost.minus(salvage);
  const start = startDate ? new Date(startDate) : new Date();
  const asOf = asOfDate ? new Date(asOfDate) : new Date();

  // Elapsed years since start
  const diffMs = asOf.getTime() - start.getTime();
  const elapsedYears = Math.max(0, diffMs / (1000 * 60 * 60 * 24 * 365.25));

  const schedule = [];
  let carryingValue = cost;
  let accumulated = ZERO;

  let currentCarryingValue = cost;
  let currentAccumulated = ZERO;

  if (method === "straight_line") {
    const annualDepreciation = depreciableBase.dividedBy(life);

    for (let yr = 1; yr <= life; yr++) {
      const depThisYear = Decimal.min(annualDepreciation, carryingValue.minus(salvage));
      carryingValue = Decimal.max(salvage, carryingValue.minus(depThisYear));
      accumulated = accumulated.plus(depThisYear);

      schedule.push({
        year: yr,
        annualDepreciation: fixed(depThisYear),
        accumulatedDepreciation: fixed(accumulated),
        endingCarryingValue: fixed(carryingValue),
      });
    }

    // Current carrying value based on elapsed time
    const elapsedDep = Decimal.min(depreciableBase, annualDepreciation.times(new Decimal(elapsedYears)));
    currentAccumulated = elapsedDep;
    currentCarryingValue = cost.minus(elapsedDep);
  } else {
    // Declining balance
    // Rate factor: double declining = 2 / life; standard declining = 1.5 / life
    const factor = method === "double_declining" ? 2 : 1.5;
    const decliningRate = new Decimal(factor).dividedBy(life);

    for (let yr = 1; yr <= life; yr++) {
      let depThisYear = carryingValue.times(decliningRate);

      // Cannot depreciate below salvage value
      if (carryingValue.minus(depThisYear).lt(salvage)) {
        depThisYear = Decimal.max(ZERO, carryingValue.minus(salvage));
      }

      carryingValue = Decimal.max(salvage, carryingValue.minus(depThisYear));
      accumulated = accumulated.plus(depThisYear);

      schedule.push({
        year: yr,
        annualDepreciation: fixed(depThisYear),
        accumulatedDepreciation: fixed(accumulated),
        endingCarryingValue: fixed(carryingValue),
      });

      if (elapsedYears >= yr - 1 && elapsedYears < yr) {
        // Approximate fractional year
        const frac = new Decimal(elapsedYears - (yr - 1));
        currentAccumulated = accumulated.minus(depThisYear).plus(depThisYear.times(frac));
        currentCarryingValue = cost.minus(currentAccumulated);
      } else if (elapsedYears >= life) {
        currentAccumulated = accumulated;
        currentCarryingValue = carryingValue;
      }
    }
  }

  const remainingLifeYears = Math.max(0, life - elapsedYears);

  return {
    acquisitionCost: fixed(cost),
    salvageValue: fixed(salvage),
    usefulLifeYears: life,
    method,
    elapsedYears: elapsedYears.toFixed(1),
    remainingUsefulLifeYears: remainingLifeYears.toFixed(1),
    currentEstimatedCarryingValue: fixed(currentCarryingValue),
    accumulatedDepreciation: fixed(currentAccumulated),
    annualSchedule: schedule,
    disclosure: "Accounting book carrying value represents amortized historic cost and is not a guaranteed resale or liquidation valuation.",
  };
}

