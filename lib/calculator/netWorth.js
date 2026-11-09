// lib/calculator/netWorth.js
// Net Worth calculation service supporting Standalone and Platform-Connected modes.
// Reuses authoritative recordedNetWorth logic from lib/finance/calculations.js.

import { Decimal } from "decimal.js";
import { recordedNetWorth, convertToReporting } from "../finance/calculations.js";
import { DEFAULT_CURRENCY } from "../finance/currency.js";

Decimal.set({ precision: 28, rounding: Decimal.ROUND_HALF_UP });

const ZERO = new Decimal(0);

/**
 * 1. Standalone Net Worth calculation from ad-hoc manual inputs:
 * assets: [{ name, amount, currency, ownershipPercentage, category }]
 * liabilities: [{ name, amount, currency, category }]
 */
export function calculateStandaloneNetWorth({
  assets = [],
  liabilities = [],
  rates = [],
  reportingCurrency = DEFAULT_CURRENCY,
}) {
  const rep = (reportingCurrency || DEFAULT_CURRENCY).toUpperCase();

  const formattedAssets = assets.map((a, i) => ({
    id: `manual-asset-${i}`,
    name: a.name || `Asset ${i + 1}`,
    amount: a.amount?.toString() ?? null,
    ownershipPercentage: a.ownershipPercentage != null ? Number(a.ownershipPercentage) : 100,
    currency: a.currency || rep,
    category: a.category || "other",
  }));

  const formattedLiabilities = liabilities.map((l, i) => ({
    id: `manual-debt-${i}`,
    name: l.name || `Debt ${i + 1}`,
    amount: l.amount?.toString() ?? null,
    currency: l.currency || rep,
    category: l.category || "other",
  }));

  const result = recordedNetWorth({
    assets: formattedAssets,
    liabilities: formattedLiabilities,
    holdings: [],
    rates,
    reportingCurrency: rep,
  });

  return {
    mode: "standalone",
    reportingCurrency: rep,
    netWorth: result.netWorth,
    totalAssets: result.totalAssets,
    totalLiabilities: result.totalLiabilities,
    debtToAssetRatio: Number(result.totalAssets) > 0
      ? Number(new Decimal(result.totalLiabilities).dividedBy(result.totalAssets).times(100).toFixed(1))
      : 0,
    trace: result.trace,
    dataQuality: {
      missingAssets: result.missing.assets,
      missingLiabilities: result.missing.liabilities,
      unconvertible: result.unconvertible,
      isPartial: result.isPartial,
    },
    disclosure: "Standalone estimate calculated from manual inputs. Does not reflect persisted platform records.",
  };
}
