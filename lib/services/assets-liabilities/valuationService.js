// lib/services/assets-liabilities/valuationService.js
import dbConnect from "@/lib/db/mongoose";
import Asset from "@/lib/db/models/Asset";
import AssetValuation from "@/lib/db/models/AssetValuation";
import { toDec } from "@/lib/finance/calculations";

/**
 * Record a new valuation for an asset.
 * Updates the asset's current valuation and persists an immutable history record.
 */
export async function recordAssetValuation({ ownerId, assetId, data }) {
  await dbConnect();

  const asset = await Asset.findOne({ _id: assetId, ownerId });
  if (!asset) {
    throw new Error("Asset not found or access denied");
  }

  const decAmount = toDec(data.amount);
  if (decAmount === null) {
    throw new Error("Invalid valuation amount");
  }

  const asOfDate = data.asOf ? new Date(data.asOf) : new Date();
  const valuationDate = data.valuationDate ? new Date(data.valuationDate) : asOfDate;
  const currency = data.currency || asset.currency || "KES";
  const source = data.source || "manual";
  const method = data.method || asset.valuationMethod || "owner_estimate";
  const confidence = data.confidence || "recorded";
  const status = data.status || "approved";

  // 1. Create the standalone AssetValuation document
  const valuation = await AssetValuation.create({
    ownerId,
    assetId: asset._id,
    amount: decAmount.toString(),
    currency,
    asOf: asOfDate,
    valuationDate,
    source,
    method,
    confidence,
    status,
    note: data.note || "",
    documentId: data.documentId || undefined,
  });

  // 2. Update Asset.currentValue and valuationMethod
  // Only update current value if asOf is newer than or equal to existing currentValue.asOf
  const existingAsOf = asset.currentValue?.asOf ? new Date(asset.currentValue.asOf) : null;
  const isNewerOrEqual = !existingAsOf || asOfDate >= existingAsOf;

  if (isNewerOrEqual) {
    asset.currentValue = {
      amount: decAmount.toString(),
      asOf: asOfDate,
      source,
    };
    asset.valuationMethod = method;
  }

  // 3. Append to valuationHistory in Asset document
  if (!Array.isArray(asset.valuationHistory)) {
    asset.valuationHistory = [];
  }
  asset.valuationHistory.push({
    amount: decAmount.toString(),
    currency,
    asOf: asOfDate,
    source,
    note: data.note || "",
  });

  await asset.save();

  return {
    valuation: valuation.toJSON ? valuation.toJSON() : valuation,
    asset: asset.toJSON ? asset.toJSON() : asset,
  };
}

/**
 * Retrieve sorted valuation history for an asset.
 */
export async function getValuationHistory({ ownerId, assetId }) {
  await dbConnect();

  const valuations = await AssetValuation.find({ ownerId, assetId })
    .sort({ asOf: -1, createdAt: -1 })
    .populate("documentId", "filename mimeType originalFilename")
    .lean();

  return valuations.map((v) => ({
    id: v._id.toString(),
    amount: v.amount ? v.amount.toString() : "0",
    currency: v.currency || "KES",
    asOf: v.asOf,
    valuationDate: v.valuationDate,
    source: v.source,
    method: v.method,
    confidence: v.confidence,
    status: v.status,
    note: v.note,
    document: v.documentId
      ? {
          id: v.documentId._id.toString(),
          filename: v.documentId.filename || v.documentId.originalFilename,
        }
      : null,
    createdAt: v.createdAt,
  }));
}

/**
 * Check for stale or missing valuations across an owner's active physical assets.
 * Default stale threshold: 90 days.
 */
export async function checkStaleValuations({ ownerId, thresholdDays = 90 }) {
  await dbConnect();

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - thresholdDays);

  const assets = await Asset.find({
    ownerId,
    status: "active",
  }).lean();

  const stale = [];
  const missing = [];

  for (const a of assets) {
    const asOf = a.currentValue?.asOf ? new Date(a.currentValue.asOf) : null;
    const amount = a.currentValue?.amount ? a.currentValue.amount.toString() : null;

    if (!amount || !asOf) {
      missing.push({
        id: a._id.toString(),
        name: a.name,
        category: a.category,
        currency: a.currency || "KES",
        reason: !amount ? "No valuation recorded" : "No valuation date",
      });
    } else if (asOf < cutoff) {
      const daysSince = Math.floor((Date.now() - asOf.getTime()) / (1000 * 60 * 60 * 24));
      stale.push({
        id: a._id.toString(),
        name: a.name,
        category: a.category,
        currency: a.currency || "KES",
        currentAmount: amount,
        asOf,
        daysSince,
      });
    }
  }

  return {
    stale,
    missing,
    thresholdDays,
  };
}
