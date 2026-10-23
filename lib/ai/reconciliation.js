// lib/ai/reconciliation.js
import { Decimal } from "decimal.js";
import { normalizeAmount, normalizeDate, normalizeDirection } from "./documentAnalysis.js";

function toNum(s) {
  if (!s) return null;
  try {
    const d = new Decimal(s);
    return d;
  } catch {
    return null;
  }
}

export function computeMatchScore({ statementEntry, transaction, investment }) {
  const reasons = [];
  let score = 0;
  let matchedFields = [];

  if (transaction) {
    if (transaction.date && statementEntry.date) {
      const tDate = new Date(transaction.date);
      const sDate = new Date(statementEntry.date);
      const diffDays = Math.abs((tDate - sDate) / (1000 * 60 * 60 * 24));
      if (diffDays === 0) {
        score += 0.3;
        reasons.push("Same date");
        matchedFields.push("date");
      } else if (diffDays <= 3) {
        score += 0.2;
        reasons.push(`Date within ${Math.round(diffDays)} day(s)`);
        matchedFields.push("date");
      } else if (diffDays <= 7) {
        score += 0.1;
        reasons.push(`Date within ${Math.round(diffDays)} days`);
        matchedFields.push("date");
      }
    }

    if (transaction.amount && statementEntry.amount) {
      const tAmt = toNum(transaction.amount?.toString ? transaction.amount.toString() : transaction.amount);
      const sAmt = toNum(statementEntry.amount);
      if (tAmt && sAmt) {
        if (tAmt.equals(sAmt)) {
          score += 0.4;
          reasons.push("Exact amount match");
          matchedFields.push("amount");
        } else {
          const diff = tAmt.minus(sAmt).abs();
          const avg = tAmt.plus(sAmt).div(2);
          if (!avg.isZero() && diff.div(avg).lessThan(0.01)) {
            score += 0.3;
            reasons.push("Amount within 1%");
            matchedFields.push("amount");
          }
        }
      }
    }

    if (transaction.description && statementEntry.description) {
      const tDesc = transaction.description.toLowerCase();
      const sDesc = statementEntry.description.toLowerCase();
      if (tDesc === sDesc) {
        score += 0.2;
        reasons.push("Exact description match");
        matchedFields.push("description");
      } else if (tDesc.includes(sDesc) || sDesc.includes(tDesc)) {
        score += 0.1;
        reasons.push("Description similar");
        matchedFields.push("description");
      }
    }

    if (transaction.direction && statementEntry.direction && transaction.direction === statementEntry.direction) {
      score += 0.1;
      reasons.push("Direction matches");
      matchedFields.push("direction");
    }
  }

  if (investment && statementEntry.amount) {
    if (investment.name && statementEntry.description) {
      const iName = investment.name.toLowerCase();
      const sDesc = statementEntry.description.toLowerCase();
      if (iName.includes(sDesc) || sDesc.includes(iName)) {
        score += 0.15;
        reasons.push("Investment name matches description");
      }
    }
  }

  score = Math.min(1, score);
  const confidence = score >= 0.7 ? 0.9 : score >= 0.5 ? 0.7 : score >= 0.3 ? 0.5 : 0.3;

  const explanation =
    reasons.length > 0
      ? `Suggested match based on: ${reasons.join(", ")}. ${score >= 0.7 ? "High confidence." : score >= 0.5 ? "Moderate confidence." : "Low confidence - review carefully."}`
      : "No strong signals found. Manual review recommended.";

  return { score, confidence, reasons, matchedFields, explanation };
}

export function detectPotentialDuplicate(statementEntry, transactions) {
  if (!statementEntry?.amount || !transactions?.length) return false;
  const sAmt = toNum(statementEntry.amount);
  if (!sAmt) return false;
  const sDate = statementEntry.date ? new Date(statementEntry.date) : null;

  for (const tx of transactions) {
    const tAmt = toNum(tx.amount?.toString ? tx.amount.toString() : tx.amount);
    if (!tAmt || !tAmt.equals(sAmt)) continue;
    if (sDate && tx.date) {
      const tDate = new Date(tx.date);
      const diffDays = Math.abs((tDate - sDate) / (1000 * 60 * 60 * 24));
      if (diffDays <= 2) return true;
    }
  }
  return false;
}
