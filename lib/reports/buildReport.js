// lib/reports/buildReport.js
// Report row builders shared by /api/reports/[entity] and /api/reports/export.
// Missing values are returned as null - never coerced to zero.

import Asset from "@/lib/db/models/Asset";
import Liability from "@/lib/db/models/Liability";
import InvestmentHolding from "@/lib/db/models/InvestmentHolding";
import Transaction from "@/lib/db/models/Transaction";
import Document from "@/lib/db/models/Document";
import { Decimal } from "decimal.js";
import { holdingMarketValue, unrealizedProfitLoss, classifyTransaction } from "@/lib/finance/calculations";

export const REPORT_ENTITIES = ["assets", "liabilities", "investments", "transactions", "documents"];

const DAY_MS = 24 * 60 * 60 * 1000;

function daysSince(date, now) {
  if (!date) return null;
  return Math.floor((now.getTime() - new Date(date).getTime()) / DAY_MS);
}

function sumDec(values) {
  return values.reduce((acc, v) => (v === null ? acc : acc.plus(new Decimal(v))), new Decimal(0)).toFixed(2);
}

export async function buildReport(entity, userId, now = new Date()) {
  switch (entity) {
    case "assets": {
      const docs = await Asset.find({ ownerId: userId }).sort({ name: 1 }).lean();
      const rows = docs.map((a) => ({
        id: a._id.toString(),
        name: a.name,
        category: a.category,
        status: a.status,
        currency: a.currency || "KES",
        currentValue: a.currentValue?.amount?.toString() ?? null,
        valuationAsOf: a.currentValue?.asOf ? new Date(a.currentValue.asOf).toISOString().slice(0, 10) : null,
        daysSinceValuation: daysSince(a.currentValue?.asOf, now),
        valuationState: a.currentValue?.amount == null ? "missing" : "recorded",
        tags: (a.tags || []).join("; "),
        notes: a.notes || "",
      }));
      return {
        entity,
        columns: [
          { key: "name", label: "Name" },
          { key: "category", label: "Category" },
          { key: "status", label: "Status" },
          { key: "currency", label: "Currency" },
          { key: "currentValue", label: "Current Value" },
          { key: "valuationAsOf", label: "Valuation Date" },
          { key: "daysSinceValuation", label: "Days Since Valuation" },
          { key: "valuationState", label: "Value State" },
          { key: "tags", label: "Tags" },
          { key: "notes", label: "Notes" },
        ],
        rows,
        totals: {
          count: rows.length,
          missingValuations: rows.filter((r) => r.valuationState === "missing").length,
        },
      };
    }

    case "liabilities": {
      const docs = await Liability.find({ ownerId: userId }).sort({ name: 1 }).lean();
      const rows = docs.map((l) => {
        const maturity = l.maturityDate ? new Date(l.maturityDate) : null;
        const daysToMaturity = maturity
          ? Math.round((maturity.getTime() - now.getTime()) / DAY_MS)
          : null;
        return {
          id: l._id.toString(),
          name: l.name,
          category: l.category,
          status: l.status,
          currency: l.currency || "KES",
          currentBalance: l.currentBalance?.amount?.toString() ?? null,
          principalAmount: l.principalAmount?.toString() ?? null,
          interestRate: l.interestRate?.toString() ?? null,
          lender: l.lender || "",
          maturityDate: maturity ? maturity.toISOString().slice(0, 10) : null,
          daysToMaturity,
          maturityState:
            !maturity ? "none" : daysToMaturity < 0 ? "overdue" : daysToMaturity <= 30 ? "upcoming" : "future",
          balanceState: l.currentBalance?.amount == null ? "missing" : "recorded",
        };
      });
      return {
        entity,
        columns: [
          { key: "name", label: "Name" },
          { key: "category", label: "Category" },
          { key: "status", label: "Status" },
          { key: "currency", label: "Currency" },
          { key: "currentBalance", label: "Current Balance" },
          { key: "principalAmount", label: "Principal" },
          { key: "interestRate", label: "Interest Rate" },
          { key: "lender", label: "Lender" },
          { key: "maturityDate", label: "Maturity Date" },
          { key: "daysToMaturity", label: "Days To Maturity" },
          { key: "maturityState", label: "Maturity State" },
          { key: "balanceState", label: "Balance State" },
        ],
        rows,
        totals: {
          count: rows.length,
          missingBalances: rows.filter((r) => r.balanceState === "missing").length,
          overdue: rows.filter((r) => r.maturityState === "overdue").length,
        },
      };
    }

    case "investments": {
      const docs = await InvestmentHolding.find({ ownerId: userId }).sort({ name: 1 }).lean();
      const rows = docs.map((h) => {
        const marketValue = holdingMarketValue({
          units: h.units?.toString(),
          price: h.currentPrice?.price?.toString(),
        });
        const pnl = unrealizedProfitLoss({
          units: h.units?.toString(),
          price: h.currentPrice?.price?.toString(),
          costBasis: h.costBasis?.totalCost?.toString(),
        });
        return {
          id: h._id.toString(),
          name: h.name,
          type: h.type,
          ticker: h.ticker || "",
          status: h.status,
          currency: h.currency || "KES",
          units: h.units?.toString() ?? null,
          price: h.currentPrice?.price?.toString() ?? null,
          priceAsOf: h.currentPrice?.asOf ? new Date(h.currentPrice.asOf).toISOString().slice(0, 10) : null,
          marketValue,
          costBasis: h.costBasis?.totalCost?.toString() ?? null,
          unrealizedPL: pnl,
          priceState: h.currentPrice?.price == null ? "missing" : "recorded",
        };
      });
      return {
        entity,
        columns: [
          { key: "name", label: "Name" },
          { key: "type", label: "Type" },
          { key: "ticker", label: "Ticker" },
          { key: "status", label: "Status" },
          { key: "currency", label: "Currency" },
          { key: "units", label: "Units" },
          { key: "price", label: "Price" },
          { key: "priceAsOf", label: "Price Date" },
          { key: "marketValue", label: "Market Value" },
          { key: "costBasis", label: "Cost Basis" },
          { key: "unrealizedPL", label: "Unrealized P&L" },
          { key: "priceState", label: "Price State" },
        ],
        rows,
        totals: {
          count: rows.length,
          unpriced: rows.filter((r) => r.priceState === "missing").length,
          // Totals only across the default reporting currency; mixed-currency
          // totals are meaningless without conversion and are intentionally omitted.
        },
      };
    }

    case "transactions": {
      const docs = await Transaction.find({ ownerId: userId }).sort({ date: -1 }).limit(5000).lean();
      const rows = docs.map((t) => ({
        id: t._id.toString(),
        date: t.date ? new Date(t.date).toISOString().slice(0, 10) : null,
        description: t.description || "",
        category: t.category,
        direction: t.direction,
        classification: classifyTransaction({ direction: t.direction, category: t.category }),
        amount: t.amount?.toString() ?? null,
        currency: t.currency || "KES",
        evidenceStatus: t.evidenceStatus,
        amountState: t.amount == null ? "missing" : "recorded",
      }));
      const income = sumDec(rows.filter((r) => r.classification === "income").map((r) => r.amount));
      const expenses = sumDec(rows.filter((r) => r.classification === "expense").map((r) => r.amount));
      return {
        entity,
        columns: [
          { key: "date", label: "Date" },
          { key: "description", label: "Description" },
          { key: "category", label: "Category" },
          { key: "direction", label: "Direction" },
          { key: "classification", label: "Classification" },
          { key: "amount", label: "Amount" },
          { key: "currency", label: "Currency" },
          { key: "evidenceStatus", label: "Evidence" },
          { key: "amountState", label: "Amount State" },
        ],
        rows,
        totals: {
          count: rows.length,
          income,
          expenses,
          missingAmounts: rows.filter((r) => r.amountState === "missing").length,
          missingEvidence: rows.filter((r) => r.evidenceStatus === "missing").length,
        },
      };
    }

    case "documents": {
      const docs = await Document.find({ ownerId: userId })
        .select("filename documentType processingStatus uploadedAt fileSize tags duplicateOf notes")
        .sort({ uploadedAt: -1 })
        .limit(2000)
        .lean();
      const rows = docs.map((d) => ({
        id: d._id.toString(),
        filename: d.filename,
        documentType: d.documentType,
        processingStatus: d.processingStatus,
        uploadedAt: d.uploadedAt ? new Date(d.uploadedAt).toISOString().slice(0, 10) : null,
        fileSize: d.fileSize ?? null,
        tags: (d.tags || []).join("; "),
        duplicateOf: d.duplicateOf ? String(d.duplicateOf) : "",
        notes: d.notes || "",
      }));
      return {
        entity,
        columns: [
          { key: "filename", label: "Filename" },
          { key: "documentType", label: "Type" },
          { key: "processingStatus", label: "Status" },
          { key: "uploadedAt", label: "Uploaded" },
          { key: "fileSize", label: "Size (bytes)" },
          { key: "tags", label: "Tags" },
          { key: "duplicateOf", label: "Duplicate Of" },
          { key: "notes", label: "Notes" },
        ],
        rows,
        totals: {
          count: rows.length,
          awaitingReview: rows.filter((r) => r.processingStatus === "awaiting_review").length,
          duplicates: rows.filter((r) => r.duplicateOf).length,
        },
      };
    }

    default:
      return null;
  }
}
