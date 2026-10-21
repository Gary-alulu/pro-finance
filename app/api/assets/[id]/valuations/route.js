// app/api/assets/[id]/valuations/route.js
// POST /api/assets/[id]/valuations — record a new valuation entry for an asset

import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db/mongoose";
import Asset from "@/lib/db/models/Asset";
import { requireUserId, assertOwnership, withErrorHandling, validationError } from "@/lib/auth/session";
import { logAudit, requestMeta } from "@/lib/audit/logAudit";
import AssetValuation from "@/lib/db/models/AssetValuation";
import { addValuationSchema } from "@/lib/validations/schemas";
import mongoose from "mongoose";
import { readJsonBody } from "@/lib/security/sanitize";

async function postHandler(request, { params }) {
  const userId = await requireUserId();
  const { id } = await params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Invalid asset ID" }, { status: 400 });
  }

  const body = await readJsonBody(request);
  const result = addValuationSchema.safeParse(body);
  if (!result.success) {
    return validationError(result);
  }

  await connectDB();
  const asset = await Asset.findById(id);
  if (!asset) {
    return NextResponse.json({ error: "Asset not found" }, { status: 404 });
  }

  assertOwnership(asset.ownerId, userId);

  const data = result.data;
  const valuationEntry = {
    amount: mongoose.Types.Decimal128.fromString(data.amount),
    currency: data.currency || asset.currency,
    asOf: new Date(data.asOf),
    source: data.source || "manual",
    note: data.note,
  };

  asset.valuationHistory.push(valuationEntry);

  // If this valuation is newer than or equal to currentValue.asOf, update currentValue
  const newDate = new Date(data.asOf).getTime();
  const currentDate = asset.currentValue?.asOf ? new Date(asset.currentValue.asOf).getTime() : 0;

  if (newDate >= currentDate) {
    asset.currentValue = {
      amount: mongoose.Types.Decimal128.fromString(data.amount),
      asOf: new Date(data.asOf),
      source: data.source || "manual",
      approvedBy: new mongoose.Types.ObjectId(userId),
      approvedAt: new Date(),
    };
  }

  await asset.save();

  // Persist a standalone, independently queryable valuation record as well.
  const valuationRecord = await AssetValuation.create({
    ownerId: new mongoose.Types.ObjectId(userId),
    assetId: asset._id,
    amount: mongoose.Types.Decimal128.fromString(data.amount),
    currency: data.currency || asset.currency,
    asOf: new Date(data.asOf),
    source: data.source || "manual",
    note: data.note,
    approvedBy: new mongoose.Types.ObjectId(userId),
    approvedAt: new Date(),
  });

  await logAudit(
    userId,
    "create",
    "asset_valuation",
    valuationRecord._id.toString(),
    null,
    { amount: data.amount, currency: data.currency || asset.currency, asOf: data.asOf, assetId: id },
    `Recorded valuation for "${asset.name}"`,
    requestMeta(request)
  );

  return NextResponse.json({
    asset: {
      ...asset.toJSON(),
      id: asset._id.toString(),
    },
    valuation: {
      ...valuationEntry,
      amount: data.amount,
    },
  });
}

export const POST = withErrorHandling(postHandler);
