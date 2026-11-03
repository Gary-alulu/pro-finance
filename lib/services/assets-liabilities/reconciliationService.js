// lib/services/assets-liabilities/reconciliationService.js
import { connectDB } from "@/lib/db/mongoose";
import Liability from "@/lib/db/models/Liability";
import LiabilityBalanceSnapshot from "@/lib/db/models/LiabilityBalanceSnapshot";
import { toDec } from "@/lib/finance/calculations";

/**
 * Record a statement-backed balance reconciliation for a liability.
 * Updates currentBalance and stores the snapshot for auditable history.
 */
export async function reconcileLiabilityBalance({ ownerId, liabilityId, data }) {
  await connectDB();

  const liability = await Liability.findOne({ _id: liabilityId, ownerId });
  if (!liability) {
    throw new Error("Liability not found or access denied");
  }

  const balanceDec = toDec(data.balance);
  if (balanceDec === null || balanceDec.isNegative()) {
    throw new Error("Balance must be a non-negative monetary value");
  }

  const effectiveDate = data.effectiveDate ? new Date(data.effectiveDate) : new Date();
  const currency = data.currency || liability.currency || "KES";
  const source = data.source || "statement";

  const prevBal = liability.currentBalance?.amount
    ? liability.currentBalance.amount.toString()
    : "0";

  // 1. Create snapshot
  const snapshot = await LiabilityBalanceSnapshot.create({
    ownerId,
    liabilityId: liability._id,
    balance: balanceDec.toFixed(2),
    currency,
    effectiveDate,
    source,
    documentId: data.documentId || undefined,
    notes: data.notes || undefined,
  });

  // 2. Update liability current balance
  liability.currentBalance = {
    amount: balanceDec.toFixed(2),
    asOf: effectiveDate,
    source,
  };

  if (balanceDec.isZero()) {
    liability.status = "settled";
    liability.settledAt = effectiveDate;
  } else if (liability.status === "settled") {
    liability.status = "active";
    liability.settledAt = null;
  }

  await liability.save();

  return {
    snapshot: snapshot.toJSON ? snapshot.toJSON() : snapshot,
    liability: liability.toJSON ? liability.toJSON() : liability,
    previousBalance: prevBal,
    newBalance: balanceDec.toFixed(2),
  };
}

/**
 * Retrieve statement balance reconciliation history for a liability.
 */
export async function getLiabilityBalanceSnapshots({ ownerId, liabilityId }) {
  await connectDB();

  const snapshots = await LiabilityBalanceSnapshot.find({ ownerId, liabilityId })
    .sort({ effectiveDate: -1, createdAt: -1 })
    .populate("documentId", "filename mimeType originalFilename")
    .lean();

  return snapshots.map((s) => ({
    id: s._id.toString(),
    balance: s.balance ? s.balance.toString() : "0",
    currency: s.currency || "KES",
    effectiveDate: s.effectiveDate,
    source: s.source,
    notes: s.notes,
    document: s.documentId
      ? {
          id: s.documentId._id.toString(),
          filename: s.documentId.filename || s.documentId.originalFilename,
        }
      : null,
    createdAt: s.createdAt,
  }));
}
