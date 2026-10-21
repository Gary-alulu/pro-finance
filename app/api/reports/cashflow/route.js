// app/api/reports/cashflow/route.js
// GET /api/reports/cashflow — income/expense/transfer report over a date range.
// Transfers (including investment purchases/sales and loan repayments) are reported
// separately and never counted as income or expenses.

import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db/mongoose";
import Transaction from "@/lib/db/models/Transaction";
import Dividend from "@/lib/db/models/Dividend";
import { requireUserId, withErrorHandling } from "@/lib/auth/session";
import { cashflowSummary } from "@/lib/finance/calculations";

async function getHandler(request) {
  const userId = await requireUserId();
  await connectDB();

  const { searchParams } = new URL(request.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  const filter = { ownerId: userId };
  if (from || to) {
    filter.date = {};
    if (from) filter.date.$gte = new Date(from);
    if (to) filter.date.$lte = new Date(to);
  }

  const [transactions, dividends] = await Promise.all([
    Transaction.find(filter).sort({ date: -1 }).limit(2000).lean(),
    Dividend.find({ ownerId: userId }).sort({ payDate: -1 }).limit(500).lean(),
  ]);

  const summary = cashflowSummary(
    transactions.map((t) => ({
      direction: t.direction,
      category: t.category,
      amount: t.amount?.toString(),
      date: t.date,
    }))
  );

  return NextResponse.json({
    ...summary,
    transactionCount: transactions.length,
    // Dividends are tracked separately from share-price changes.
    dividendCount: dividends.length,
    period: { from: from || null, to: to || null },
  });
}

export const GET = withErrorHandling(getHandler);
