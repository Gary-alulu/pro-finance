// lib/ai/investmentIntelligence.js
import { Decimal } from "decimal.js";
import { normalizeAmount, normalizeDate } from "./documentAnalysis.js";

function toDec(s) {
  try {
    if (!s) return null;
    return new Decimal(String(s).replace(/,/g, ""));
  } catch {
    return null;
  }
}

export function extractNSEInvestmentData({ lineItems, proposedFields, filename }) {
  const trades = [];
  const dividends = [];
  const fees = [];
  const warnings = [];
  const missingPrices = [];

  const lowerName = (filename || "").toLowerCase();
  const isNSE = lowerName.includes("nse") || lowerName.includes("contract") || lowerName.includes("cds");

  if (lineItems?.length) {
    for (const item of lineItems) {
      const desc = (item.description || "").toLowerCase();
      const amt = toDec(item.amount);
      if (!amt) continue;

      if (desc.includes("dividend") || item.category === "dividend") {
        dividends.push({
          date: item.date || proposedFields?.date,
          description: item.description,
          grossAmount: amt.toString(),
          currency: item.currency || proposedFields?.currency,
          sourceExcerpt: item.excerpt,
        });
      } else if (desc.includes("fee") || desc.includes("commission") || desc.includes("charge") || desc.includes("stamp")) {
        fees.push({
          date: item.date || proposedFields?.date,
          description: item.description,
          amount: amt.toString(),
          currency: item.currency || proposedFields?.currency,
          sourceExcerpt: item.excerpt,
        });
      } else if (desc.includes("buy") || desc.includes("purchase") || desc.includes("acquire")) {
        trades.push({
          side: "buy",
          date: item.date || proposedFields?.date,
          description: item.description,
          grossAmount: amt.abs().toString(),
          currency: item.currency || proposedFields?.currency,
          sourceExcerpt: item.excerpt,
        });
      } else if (desc.includes("sell") || desc.includes("disposal")) {
        trades.push({
          side: "sell",
          date: item.date || proposedFields?.date,
          description: item.description,
          grossAmount: amt.abs().toString(),
          currency: item.currency || proposedFields?.currency,
          sourceExcerpt: item.excerpt,
        });
      } else if (isNSE && (desc.includes("share") || desc.includes("equity"))) {
        trades.push({
          side: amt.greaterThan(0) ? "buy" : "sell",
          date: item.date || proposedFields?.date,
          description: item.description,
          grossAmount: amt.abs().toString(),
          currency: item.currency || proposedFields?.currency,
          sourceExcerpt: item.excerpt,
        });
      }
    }
  }

  if (!proposedFields?.totalAmount && trades.length === 0 && dividends.length === 0) {
    warnings.push("No clear trade or dividend entries identified from lines.");
  }

  if (trades.length > 0) {
    for (const t of trades) {
      if (!t.quantity && !t.pricePerUnit) {
        missingPrices.push({
          trade: t,
          message: "Quantity/price per unit not explicitly extracted. Use manually entered prices.",
        });
      }
    }
  }

  const result = {
    trades,
    dividends,
    fees,
    realizedGains: [],
    unrealizedGains: [],
    missingPrices,
    warnings,
    notes: [
      "Prices marked as manual where not present. Do not treat extracted prices as live market prices.",
      "Reconcile contract notes against recorded trades before confirming.",
    ],
  };

  return result;
}

export function reconcileContractNote({ extracted, trades, holdings }) {
  const issues = [];
  if (!extracted?.trades?.length) return { reconciled: false, issues: ["No trades extracted from contract note"] };

  for (const et of extracted.trades) {
    const match = (trades || []).find((t) => {
      if (t.holdingId && holdings?.length) {
        const h = holdings.find((hh) => hh._id?.toString() === t.holdingId?.toString());
        if (h && et.description && h.name && h.name.toLowerCase().includes(et.description.toLowerCase().split(" ")[0])) return true;
      }
      if (t.tradedAt && et.date) {
        const td = new Date(t.tradedAt);
        const ed = new Date(et.date);
        return Math.abs((td - ed) / (1000 * 60 * 60 * 24)) <= 2;
      }
      return false;
    });
    if (!match) {
      issues.push({
        trade: et,
        type: "unreconciled",
        message: "Contract note trade has no matching recorded trade.",
      });
    }
  }

  return { reconciled: issues.length === 0, issues };
}
