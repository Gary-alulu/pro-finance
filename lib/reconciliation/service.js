// lib/reconciliation/service.js
// Builds reviewable reconciliation rows from an extracted document. Every row is
// a suggestion only: nothing is linked or mutated until the user confirms it.
import { Decimal } from "decimal.js";
import Transaction from "@/lib/db/models/Transaction";
import InvestmentTrade from "@/lib/db/models/InvestmentTrade";
import Dividend from "@/lib/db/models/Dividend";
import InvestmentHolding from "@/lib/db/models/InvestmentHolding";
import Reconciliation from "@/lib/db/models/Reconciliation";
import { computeMatchScore } from "@/lib/ai/reconciliation";
import { normalizeAmount, normalizeDate, normalizeDirection } from "@/lib/ai/documentAnalysis";

function toDecimal(value) {
  try {
    if (value == null) return null;
    return new Decimal(value.toString());
  } catch {
    return null;
  }
}

function daysBetween(a, b) {
  return Math.abs((new Date(a) - new Date(b)) / (1000 * 60 * 60 * 24));
}

export async function buildReconciliationSuggestions({ userId, doc }) {
  const lines = doc?.extractionResult?.proposedFields?.lineItems;
  if (!Array.isArray(lines) || lines.length === 0) {
    return { created: 0, skipped: true };
  }

  const dates = lines
    .map((line) => normalizeDate(line.date))
    .filter(Boolean)
    .map((d) => new Date(d))
    .filter((d) => !Number.isNaN(d.getTime()));

  const dateFilter = {};
  if (dates.length) {
    const min = new Date(Math.min(...dates.map((d) => d.getTime())));
    const max = new Date(Math.max(...dates.map((d) => d.getTime())));
    min.setDate(min.getDate() - 10);
    max.setDate(max.getDate() + 10);
    dateFilter.date = { $gte: min, $lte: max };
  }

  const [transactions, trades, dividends, holdings] = await Promise.all([
    Transaction.find({ ownerId: userId, ...dateFilter }).limit(500).lean(),
    InvestmentTrade.find({ ownerId: userId, ...(dateFilter.date ? { tradedAt: dateFilter.date } : {}) }).limit(500).lean(),
    Dividend.find({ ownerId: userId, ...(dateFilter.date ? { payDate: dateFilter.date } : {}) }).limit(500).lean(),
    InvestmentHolding.find({ ownerId: userId }).lean(),
  ]);

  // Replace only unresolved suggestions from a previous extraction run.
  await Reconciliation.deleteMany({ ownerId: userId, documentId: doc._id, status: "suggested" });

  const rows = [];
  const usedTransactions = new Set();

  for (let index = 0; index < lines.length; index++) {
    const raw = lines[index] || {};
    const amount = normalizeAmount(raw.amount);
    const date = normalizeDate(raw.date) || normalizeDate(doc.extractionResult?.proposedFields?.date);
    const direction = normalizeDirection(raw.direction);
    const description = (raw.description || "").trim().slice(0, 300) || null;

    const entry = {
      date: date ? new Date(date) : null,
      description,
      amount,
      currency: raw.currency || doc.extractionResult?.proposedFields?.currency || doc.currency || "KES",
      direction,
      reference: raw.reference || null,
      lineIndex: index,
      raw,
    };

    const candidates = [];
    let potentialDuplicate = false;

    if (amount) {
      for (const tx of transactions) {
        const score = computeMatchScore({ statementEntry: entry, transaction: tx });
        if (score.score < 0.3) continue;
        if (date && tx.date && daysBetween(date, tx.date) <= 2) potentialDuplicate = true;
        candidates.push({
          candidateType: "transaction",
          transactionId: tx._id,
          ...score,
        });
      }

      for (const trade of trades) {
        const tradeAmount = toDecimal(trade.grossAmount);
        if (!tradeAmount || !tradeAmount.equals(toDecimal(amount))) continue;
        if (date && trade.tradedAt && daysBetween(date, trade.tradedAt) > 3) continue;
        const holding = holdings.find((h) => h._id.toString() === trade.holdingId?.toString());
        candidates.push({
          candidateType: "investment_trade",
          tradeId: trade._id,
          investmentId: trade.holdingId,
          score: 0.75,
          confidence: 0.8,
          reasons: ["Trade amount matches", "Trade date is within 3 days", holding ? `Holding: ${holding.name}` : ""].filter(Boolean),
          matchedFields: ["amount", "date"],
          explanation: `Suggested match to a recorded ${trade.side} trade${holding ? ` in ${holding.name}` : ""}.`,
        });
      }

      for (const div of dividends) {
        const gross = toDecimal(div.grossAmount);
        if (!gross || !gross.equals(toDecimal(amount))) continue;
        if (date && div.payDate && daysBetween(date, div.payDate) > 7) continue;
        const holding = holdings.find((h) => h._id.toString() === div.holdingId?.toString());
        candidates.push({
          candidateType: "dividend",
          dividendId: div._id,
          investmentId: div.holdingId,
          score: 0.8,
          confidence: 0.85,
          reasons: ["Dividend amount matches", "Payment date is close", holding ? `Holding: ${holding.name}` : ""].filter(Boolean),
          matchedFields: ["amount", "date"],
          explanation: `Suggested match to a recorded dividend${holding ? ` from ${holding.name}` : ""}.`,
        });
      }
    }

    candidates.sort((a, b) => b.score - a.score);
    const top = candidates.slice(0, 5);
    for (const c of top) {
      if (c.candidateType === "transaction" && c.transactionId) {
        usedTransactions.add(c.transactionId.toString());
      }
    }

    if (potentialDuplicate && top.length > 0 && top[0].candidateType === "transaction") {
      top[0].reasons.push("Possible duplicate: an existing transaction has the same amount and near date");
      top[0].explanation += " This may also be a duplicate of an existing transaction.";
    }

    rows.push({
      ownerId: userId,
      documentId: doc._id,
      statementEntry: entry,
      status: "suggested",
      candidates: top,
      explanation:
        top.length > 0
          ? top[0].explanation
          : "No confident match found. Review whether this entry is missing from your records.",
      aiSuggested: true,
      potentialDuplicate,
      unexplainedDifference: top.length === 0,
      missingEntry: top.length === 0,
      impact: amount && toDecimal(amount)?.abs().greaterThan(50000) ? "high" : "medium",
    });
  }

  // Existing transactions in the date window with no statement entry may be missing
  // from the import. Keep this limited so the queue stays reviewable.
  if (dates.length && transactions.length) {
    const represented = new Set(rows.map((r) => r.statementEntry.amount).filter(Boolean));
    const unrepresented = transactions
      .filter((tx) => {
        const amt = tx.amount?.toString();
        return amt && !represented.has(amt) && !usedTransactions.has(tx._id.toString());
      })
      .slice(0, 5);
    for (const tx of unrepresented) {
      rows.push({
        ownerId: userId,
        documentId: doc._id,
        statementEntry: {
          date: tx.date,
          description: tx.description || null,
          amount: tx.amount?.toString(),
          currency: tx.currency,
          direction: tx.direction,
          reference: "record-not-in-statement",
          lineIndex: null,
          raw: null,
        },
        status: "suggested",
        candidates: [{
          candidateType: "transaction",
          transactionId: tx._id,
          score: 0.4,
          confidence: 0.4,
          reasons: ["Existing transaction not found in this statement"],
          matchedFields: [],
          explanation: "This recorded transaction does not appear in the statement. Confirm whether it is genuinely missing from the statement.",
        }],
        explanation: "Recorded transaction may be missing from the imported statement.",
        aiSuggested: true,
        missingEntry: true,
        impact: "medium",
      });
    }
  }

  if (rows.length) await Reconciliation.insertMany(rows);
  return { created: rows.length, skipped: false };
}
