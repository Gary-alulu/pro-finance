// app/api/assets/route.js
// GET /api/assets — list assets for the authenticated user
// POST /api/assets — create a new asset

import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db/mongoose";
import Asset from "@/lib/db/models/Asset";
import { requireUserId, withErrorHandling, validationError } from "@/lib/auth/session";
import { logAudit, requestMeta } from "@/lib/audit/logAudit";
import { createAssetSchema } from "@/lib/validations/schemas";
import mongoose from "mongoose";
import { readJsonBody } from "@/lib/security/sanitize";

async function getHandler(request) {
  const userId = await requireUserId();
  await connectDB();

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status") || "active";
  const category = searchParams.get("category");
  const summary = searchParams.get("summary") === "true";
  const limit = Math.min(parseInt(searchParams.get("limit") || "100"), 500);
  const skip = parseInt(searchParams.get("skip") || "0");

  const filter = { ownerId: userId };
  if (status !== "all") filter.status = status;
  if (category) filter.category = category;

  if (summary) {
    // Aggregation for asset allocation chart
    const byCategory = await Asset.aggregate([
      { $match: { ownerId: new mongoose.Types.ObjectId(userId), status: "active" } },
      {
        $group: {
          _id: "$category",
          amount: {
            $sum: { $toDecimal: { $ifNull: ["$currentValue.amount", "0"] } },
          },
        },
      },
      { $project: { _id: 0, category: "$_id", amount: { $toString: "$amount" } } },
    ]);
    return NextResponse.json({ byCategory });
  }

  const [assets, total] = await Promise.all([
    Asset.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    Asset.countDocuments(filter),
  ]);

  return NextResponse.json({
    assets: assets.map((a) => ({ ...a, id: a._id.toString() })),
    total,
    skip,
    limit,
  });
}

async function postHandler(request) {
  const userId = await requireUserId();
  const body = await readJsonBody(request);

  const result = createAssetSchema.safeParse(body);
  if (!result.success) {
    return validationError(result);
  }

  await connectDB();
  const data = result.data;

  const assetData = {
    ownerId: new mongoose.Types.ObjectId(userId),
    name: data.name,
    category: data.category,
    subCategory: data.subCategory,
    description: data.description,
    currency: data.currency,
    status: data.status,
    tags: data.tags,
    notes: data.notes,
  };

  if (data.currentValue) {
    assetData.currentValue = {
      amount: mongoose.Types.Decimal128.fromString(data.currentValue.amount),
      asOf: new Date(data.currentValue.asOf),
      source: data.currentValue.source,
      approvedBy: new mongoose.Types.ObjectId(userId),
      approvedAt: new Date(),
    };
    // Also add to valuation history
    assetData.valuationHistory = [
      {
        amount: mongoose.Types.Decimal128.fromString(data.currentValue.amount),
        currency: data.currency,
        asOf: new Date(data.currentValue.asOf),
        source: data.currentValue.source,
      },
    ];
  }

  const asset = await Asset.create(assetData);

  await logAudit(
    userId,
    "create",
    "asset",
    asset._id.toString(),
    null,
    asset.toJSON(),
    `Created asset "${asset.name}"`,
    requestMeta(request)
  );

  return NextResponse.json({ asset: asset.toJSON() }, { status: 201 });
}

export const GET = withErrorHandling(getHandler);
export const POST = withErrorHandling(postHandler);
