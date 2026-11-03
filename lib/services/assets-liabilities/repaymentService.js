// lib/services/assets-liabilities/repaymentService.js
import { Decimal } from "decimal.js";
import { connectDB } from "@/lib/db/mongoose";
import Liability from "@/lib/db/models/Liability";
import LiabilityPayment from "@/lib/db/models/LiabilityPayment";
import { toDec } from "@/lib/finance/calculations";

Decimal.set({ precision: 28, rounding: Decimal.ROUND_HALF_UP });
const ZERO = new Decimal(0);

/**
 * Record a payment/repayment against a liability.
 * Separates principal reduction from interest, fees, and penalties.
 * Decreases the liability's currentBalance.amount atomically by the principal amount.
 */
export async function recordLiabilityPayment({ ownerId, liabilityId, data }) {
  await connectDB();

  const liability = await Liability.findOne({ _id: liabilityId, ownerId });
  if (!liability) {
    throw new Error("Liability not found or access denied");
  }

  const total = toDec(data.totalAmount);
  const principal = toDec(data.principalAmount);
  const interest = toDec(data.interestAmount) ?? ZERO;
  const fee = toDec(data.feeAmount) ?? ZERO;
  const penalty = toDec(data.penaltyAmount) ?? ZERO;

  if (!total || total.isNegative()) {
    throw new Error("Total payment amount must be a positive monetary value");
  }
  if (!principal || principal.isNegative()) {
    throw new Error("Principal amount must be a positive monetary value");
  }

  // Validate that principal + interest + fee + penalty equals total payment
  const componentSum = principal.plus(interest).plus(fee).plus(penalty);
  if (!componentSum.equals(total)) {
    throw new Error(
      `Payment sum mismatch: principal (${principal.toFixed(2)}) + interest (${interest.toFixed(2)}) + fee (${fee.toFixed(2)}) + penalty (${penalty.toFixed(2)}) = ${componentSum.toFixed(2)}, which does not equal total amount (${total.toFixed(2)})`
    );
  }

  const paymentDate = data.paymentDate ? new Date(data.paymentDate) : new Date();
  const currency = data.currency || liability.currency || "KES";

  // Calculate new balance
  const currentBal = toDec(liability.currentBalance?.amount) ?? ZERO;
  const newBal = Decimal.max(currentBal.minus(principal), ZERO);

  // 1. Create the LiabilityPayment record
  const payment = await LiabilityPayment.create({
    ownerId,
    liabilityId: liability._id,
    paymentDate,
    totalAmount: total.toFixed(2),
    principalAmount: principal.toFixed(2),
    interestAmount: interest.toFixed(2),
    feeAmount: fee.toFixed(2),
    penaltyAmount: penalty.toFixed(2),
    currency,
    accountId: data.accountId || undefined,
    transactionId: data.transactionId || undefined,
    documentId: data.documentId || undefined,
    reference: data.reference || undefined,
    paymentMethod: data.paymentMethod || "bank_transfer",
    notes: data.notes || undefined,
  });

  // 2. Update Liability currentBalance and status
  liability.currentBalance = {
    amount: newBal.toFixed(2),
    asOf: paymentDate,
    source: "manual",
  };

  if (newBal.isZero() && liability.status !== "settled") {
    liability.status = "settled";
    liability.settledAt = paymentDate;
  }

  await liability.save();

  return {
    payment: payment.toJSON ? payment.toJSON() : payment,
    liability: liability.toJSON ? liability.toJSON() : liability,
    previousBalance: currentBal.toFixed(2),
    newBalance: newBal.toFixed(2),
  };
}

/**
 * Retrieve repayment history for a specific liability.
 */
export async function getLiabilityPayments({ ownerId, liabilityId }) {
  await connectDB();

  const payments = await LiabilityPayment.find({ ownerId, liabilityId })
    .sort({ paymentDate: -1, createdAt: -1 })
    .populate("accountId", "name type currency")
    .populate("documentId", "filename mimeType originalFilename")
    .lean();

  return payments.map((p) => ({
    id: p._id.toString(),
    paymentDate: p.paymentDate,
    totalAmount: p.totalAmount ? p.totalAmount.toString() : "0",
    principalAmount: p.principalAmount ? p.principalAmount.toString() : "0",
    interestAmount: p.interestAmount ? p.interestAmount.toString() : "0",
    feeAmount: p.feeAmount ? p.feeAmount.toString() : "0",
    penaltyAmount: p.penaltyAmount ? p.penaltyAmount.toString() : "0",
    currency: p.currency || "KES",
    paymentMethod: p.paymentMethod,
    reference: p.reference,
    notes: p.notes,
    account: p.accountId
      ? {
          id: p.accountId._id.toString(),
          name: p.accountId.name,
          type: p.accountId.type,
        }
      : null,
    document: p.documentId
      ? {
          id: p.documentId._id.toString(),
          filename: p.documentId.filename || p.documentId.originalFilename,
        }
      : null,
    createdAt: p.createdAt,
  }));
}

/**
 * Retrieve recent repayments across all owner liabilities.
 */
export async function getRecentRepayments({ ownerId, limit = 10 }) {
  await connectDB();

  const payments = await LiabilityPayment.find({ ownerId })
    .sort({ paymentDate: -1, createdAt: -1 })
    .limit(limit)
    .populate("liabilityId", "name category lender")
    .lean();

  return payments.map((p) => ({
    id: p._id.toString(),
    paymentDate: p.paymentDate,
    totalAmount: p.totalAmount ? p.totalAmount.toString() : "0",
    principalAmount: p.principalAmount ? p.principalAmount.toString() : "0",
    interestAmount: p.interestAmount ? p.interestAmount.toString() : "0",
    currency: p.currency || "KES",
    liability: p.liabilityId
      ? {
          id: p.liabilityId._id.toString(),
          name: p.liabilityId.name,
          category: p.liabilityId.category,
          lender: p.liabilityId.lender,
        }
      : null,
  }));
}
