// app/api/simulator/base-snapshot/route.js
// GET /api/simulator/base-snapshot
// Loads the authenticated user's current verified financial records
// as a consistent starting snapshot for wealth simulations.

import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db/mongoose";
import Asset from "@/lib/db/models/Asset";
import Liability from "@/lib/db/models/Liability";
import InvestmentHolding from "@/lib/db/models/InvestmentHolding";
import User from "@/lib/db/models/User";
import { requireUserId, withErrorHandling } from "@/lib/auth/session";
import { DEFAULT_CURRENCY } from "@/lib/finance/currency";
import { holdingMarketValue, toDec } from "@/lib/finance/calculations";
import { Decimal } from "decimal.js";

function isLiquidCash(a) {
  const cat = (a.category || "").toLowerCase();
  const name = (a.name || "").toLowerCase();
  return (
    cat === "cash" ||
    cat === "bank_account" ||
    name.includes("checking") ||
    name.includes("savings") ||
    name.includes("cash") ||
    name.includes("mpesa") ||
    name.includes("wallet")
  );
}

async function handler() {
  const userId = await requireUserId();
  await connectDB();

  const [assets, liabilities, investments, user] = await Promise.all([
    Asset.find({ ownerId: userId, status: "active" }).select("-valuationHistory").lean(),
    Liability.find({ ownerId: userId, status: "active" }).lean(),
    InvestmentHolding.find({ ownerId: userId, status: "active" }).select("-priceHistory").lean(),
    User.findById(userId).select("preferredCurrency settings").lean(),
  ]);

  const currency =
    user?.settings?.financial?.reportingCurrency ||
    user?.preferredCurrency ||
    DEFAULT_CURRENCY;

  let totalCash = new Decimal(0);
  let totalOtherAssets = new Decimal(0);
  let totalInvestments = new Decimal(0);
  let totalLiabilities = new Decimal(0);

  let hasUnpricedInvestment = false;
  let hasMissingValuation = false;

  // Process physical and financial assets
  for (const a of assets) {
    const rawAmt = a.currentValue?.amount;
    const dec = toDec(rawAmt);
    if (dec === null) {
      hasMissingValuation = true;
      continue;
    }

    if (isLiquidCash(a)) {
      totalCash = totalCash.plus(dec);
    } else {
      totalOtherAssets = totalOtherAssets.plus(dec);
    }
  }

  // Process investment holdings at market value
  for (const h of investments) {
    const mv = holdingMarketValue({
      units: h.units?.toString() ?? null,
      price: h.currentPrice?.amount?.toString() ?? null,
    });
    if (mv === null) {
      hasUnpricedInvestment = true;
      continue;
    }
    totalInvestments = totalInvestments.plus(new Decimal(mv));
  }

  // Process liabilities
  for (const l of liabilities) {
    const rawAmt = l.currentBalance?.amount;
    const dec = toDec(rawAmt);
    if (dec !== null) {
      totalLiabilities = totalLiabilities.plus(dec);
    }
  }

  const totalAssets = totalCash.plus(totalInvestments).plus(totalOtherAssets);
  const netWorth = totalAssets.minus(totalLiabilities);

  return NextResponse.json({
    snapshot: {
      takenAt: new Date().toISOString(),
      currency,
      recordedCash: totalCash.toFixed(2),
      recordedInvestments: totalInvestments.toFixed(2),
      recordedOtherAssets: totalOtherAssets.toFixed(2),
      recordedLiabilities: totalLiabilities.toFixed(2),
      recordedNetWorth: netWorth.toFixed(2),
    },
    meta: {
      assetCount: assets.length,
      liabilityCount: liabilities.length,
      investmentCount: investments.length,
      hasUnpricedInvestment,
      hasMissingValuation,
    },
  });
}

export const GET = withErrorHandling(handler);
