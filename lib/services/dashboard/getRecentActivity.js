// lib/services/dashboard/getRecentActivity.js
// Multi-module chronological activity feed.
// Integrates transactions, trades, dividends, asset valuations, repayments, documents and journal entries.

import { connectDB } from "@/lib/db/mongoose";
import Transaction from "@/lib/db/models/Transaction";
import InvestmentTrade from "@/lib/db/models/InvestmentTrade";
import Dividend from "@/lib/db/models/Dividend";
import Asset from "@/lib/db/models/Asset";
import Liability from "@/lib/db/models/Liability";
import JournalEntry from "@/lib/db/models/JournalEntry";
import Document from "@/lib/db/models/Document";
import { DEFAULT_CURRENCY } from "@/lib/finance/currency";

export async function getRecentActivity(
  userId,
  {
    category = "all", // "all" | "transactions" | "investments" | "assets_liabilities" | "decisions"
    limit = 12,
    offset = 0,
    reportingCurrency = DEFAULT_CURRENCY,
  } = {}
) {
  await connectDB();
  const rep = (reportingCurrency || DEFAULT_CURRENCY).toUpperCase();
  const queryLimit = Math.min(limit * 2, 50);

  const promises = [];

  // 1. Transactions
  if (category === "all" || category === "transactions") {
    promises.push(
      Transaction.find({ ownerId: userId })
        .sort({ date: -1 })
        .limit(queryLimit)
        .lean()
        .then((items) =>
          items.map((t) => ({
            id: `tx-${t._id.toString()}`,
            entityId: t._id.toString(),
            type: "transaction",
            subType: t.direction,
            title: t.description || t.category || "Transaction",
            amount: t.amount?.toString() || null,
            currency: t.currency || rep,
            date: t.date,
            sourceModule: "transactions",
            category: t.category,
            status: t.approvalStatus || "approved",
            href: `/transactions?focus=${t._id.toString()}`,
            isInflow: t.direction === "inflow",
            isOutflow: t.direction === "outflow",
            isTransfer: t.direction === "transfer",
          }))
        )
    );
  }

  // 2. Investment trades & Dividends
  if (category === "all" || category === "investments") {
    promises.push(
      InvestmentTrade.find({ ownerId: userId })
        .sort({ tradedAt: -1 })
        .limit(queryLimit)
        .lean()
        .then((items) =>
          items.map((tr) => ({
            id: `trade-${tr._id.toString()}`,
            entityId: tr._id.toString(),
            type: "investment_trade",
            subType: tr.side,
            title: `${tr.side === "buy" ? "Bought" : "Sold"} ${tr.units?.toString()} units`,
            amount: tr.grossAmount?.toString() || null,
            currency: tr.currency || rep,
            date: tr.tradedAt,
            sourceModule: "investments",
            category: "investment",
            status: "settled",
            href: `/investments?holding=${tr.holdingId?.toString()}`,
            isInflow: tr.side === "sell",
            isOutflow: tr.side === "buy",
          }))
        )
    );

    promises.push(
      Dividend.find({ ownerId: userId })
        .sort({ payDate: -1 })
        .limit(queryLimit)
        .lean()
        .then((items) =>
          items.map((div) => ({
            id: `div-${div._id.toString()}`,
            entityId: div._id.toString(),
            type: "dividend",
            subType: "income",
            title: `Dividend distribution`,
            amount: div.grossAmount?.toString() || null,
            currency: div.currency || rep,
            date: div.payDate,
            sourceModule: "investments",
            category: "dividend",
            status: "received",
            href: `/investments?tab=dividends`,
            isInflow: true,
          }))
        )
    );
  }

  // 3. Asset and Liability updates
  if (category === "all" || category === "assets_liabilities") {
    promises.push(
      Asset.find({ ownerId: userId })
        .sort({ updatedAt: -1 })
        .limit(queryLimit)
        .lean()
        .then((items) =>
          items.map((a) => ({
            id: `asset-${a._id.toString()}`,
            entityId: a._id.toString(),
            type: "asset",
            subType: "valuation",
            title: `Asset: ${a.name}`,
            amount: a.currentValue?.amount?.toString() || null,
            currency: a.currency || rep,
            date: a.currentValue?.asOf || a.updatedAt,
            sourceModule: "assets",
            category: a.category,
            status: a.status,
            href: `/assets?focus=${a._id.toString()}`,
          }))
        )
    );

    promises.push(
      Liability.find({ ownerId: userId })
        .sort({ updatedAt: -1 })
        .limit(queryLimit)
        .lean()
        .then((items) =>
          items.map((l) => ({
            id: `liability-${l._id.toString()}`,
            entityId: l._id.toString(),
            type: "liability",
            subType: "balance",
            title: `Liability: ${l.name}`,
            amount: l.currentBalance?.amount?.toString() || null,
            currency: l.currency || rep,
            date: l.currentBalance?.asOf || l.updatedAt,
            sourceModule: "assets",
            category: l.category,
            status: l.status,
            href: `/assets?tab=liabilities&focus=${l._id.toString()}`,
            isOutflow: true,
          }))
        )
    );
  }

  // 4. Journal decisions
  if (category === "all" || category === "decisions") {
    promises.push(
      JournalEntry.find({ ownerId: userId })
        .sort({ entryDate: -1 })
        .limit(queryLimit)
        .lean()
        .then((items) =>
          items.map((j) => ({
            id: `journal-${j._id.toString()}`,
            entityId: j._id.toString(),
            type: "journal_entry",
            subType: j.category,
            title: `Decision: ${j.title}`,
            amount: null,
            currency: null,
            date: j.entryDate,
            sourceModule: "journal",
            category: j.category,
            status: "recorded",
            href: `/journal?entry=${j._id.toString()}`,
          }))
        )
    );
  }

  const results = await Promise.all(promises);
  const flattened = results.flat();

  // Sort strictly by date descending
  flattened.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // Apply pagination
  const totalItems = flattened.length;
  const pagedItems = flattened.slice(offset, offset + limit);

  return {
    items: pagedItems,
    pagination: {
      total: totalItems,
      offset,
      limit,
      hasMore: offset + limit < totalItems,
    },
    reportingCurrency: rep,
  };
}
