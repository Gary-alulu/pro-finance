// app/api/networth/snapshots/route.js
// GET /api/networth/snapshots — list historical net worth snapshots
// POST /api/networth/snapshots — record current net worth as a snapshot using the
//   deterministic engine (recorded assets + holdings at market value − liabilities).

import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db/mongoose";
import FinancialSnapshot from "@/lib/db/models/FinancialSnapshot";
import Asset from "@/lib/db/models/Asset";
import Liability from "@/lib/db/models/Liability";
import InvestmentHolding from "@/lib/db/models/InvestmentHolding";
import ExchangeRate from "@/lib/db/models/ExchangeRate";
import { requireUserId, withErrorHandling } from "@/lib/auth/session";
import { logAudit, requestMeta } from "@/lib/audit/logAudit";
import { recordedNetWorth } from "@/lib/finance/calculations";
import { DEFAULT_CURRENCY } from "@/lib/finance/currency";
import mongoose from "mongoose";

async function getHandler(request) {
  const userId = await requireUserId();
  await connectDB();

  const { searchParams } = new URL(request.url);
  const limit = Math.min(parseInt(searchParams.get("limit") || "365"), 1000);

  const snapshots = await FinancialSnapshot.find({ ownerId: userId })
    .sort({ takenAt: 1 })
    .limit(limit)
    .lean();

  return NextResponse.json({
    snapshots: snapshots.map((s) => ({
      id: s._id.toString(),
      takenAt: s.takenAt,
      netWorth: s.netWorth?.toString(),
      totalAssets: s.totalAssets?.toString(),
      totalLiabilities: s.totalLiabilities?.toString(),
      currency: s.currency,
      isManual: s.isManual,
    })),
  });
}

async function postHandler(request) {
  const userId = await requireUserId();
  await connectDB();

  const [assets, liabilities, holdings, rateDocs] = await Promise.all([
    Asset.find({ ownerId: userId, status: "active" }).select("-valuationHistory").lean(),
    Liability.find({ ownerId: userId, status: "active" }).lean(),
    InvestmentHolding.find({ ownerId: userId, status: "active" }).select("-priceHistory").lean(),
    ExchangeRate.find({ ownerId: userId }).lean(),
  ]);

  const nw = recordedNetWorth({
    assets: assets.map((a) => ({
      amount: a.currentValue?.amount?.toString() ?? null,
      currency: a.currency,
    })),
    liabilities: liabilities.map((l) => ({
      amount: l.currentBalance?.amount?.toString() ?? null,
      currency: l.currency,
    })),
    holdings: holdings.map((h) => ({
      units: h.units?.toString() ?? null,
      price: h.currentPrice?.price?.toString() ?? null,
      currency: h.currency,
    })),
    rates: rateDocs.map((r) => ({
      from: r.from,
      to: r.to,
      rate: r.rate?.toString(),
      asOf: r.asOf,
    })),
    reportingCurrency: DEFAULT_CURRENCY,
  });

  const snapshot = await FinancialSnapshot.create({
    ownerId: new mongoose.Types.ObjectId(userId),
    totalAssets: mongoose.Types.Decimal128.fromString(nw.totalAssets),
    totalLiabilities: mongoose.Types.Decimal128.fromString(nw.totalLiabilities),
    netWorth: mongoose.Types.Decimal128.fromString(nw.netWorth),
    currency: nw.reportingCurrency,
    isManual: true,
  });

  await logAudit(
    userId,
    "create",
    "snapshot",
    snapshot._id.toString(),
    null,
    snapshot.toJSON(),
    `Snapshot taken: net worth ${nw.netWorth} ${nw.reportingCurrency}`,
    requestMeta(request)
  );

  return NextResponse.json({ snapshot: snapshot.toJSON() }, { status: 201 });
}

export const GET = withErrorHandling(getHandler);
export const POST = withErrorHandling(postHandler);
