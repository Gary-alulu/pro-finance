// app/api/reports/cashflow/route.js
// GET /api/reports/cashflow — income/expense/transfer report over a date range.
// Transfers (including investment purchases/sales and loan repayments) are reported
// separately and never counted as income or expenses.
//
// All figures are aggregated in MongoDB rather than read from a row window,
// so the totals and the monthly chart series can never disagree.

import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db/mongoose";
import Transaction from "@/lib/db/models/Transaction";
import Dividend from "@/lib/db/models/Dividend";
import { requireUserId, withErrorHandling } from "@/lib/auth/session";
import {
  getCashFlowSummary,
  getMonthlyCashFlow,
  getCashFlowByCategory,
} from "@/lib/data/cashflow";

async function getHandler(request) {
  const userId = await requireUserId();
  await connectDB();

  const { searchParams } = new URL(request.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const months = Math.min(parseInt(searchParams.get("months") || "24"), 120);

  const [summary, monthly, byCategoryDetail, transactionCount, dividendCount] =
    await Promise.all([
      getCashFlowSummary(userId, { from, to }),
      getMonthlyCashFlow(userId, { from, to, months }),
      getCashFlowByCategory(userId, { from, to }),
      Transaction.countDocuments({ ownerId: userId }),
      Dividend.countDocuments({ ownerId: userId }),
    ]);

  return NextResponse.json({
    ...summary,
    transactionCount,
    // Dividends are tracked separately from share-price changes.
    dividendCount,
    monthly,
    byCategoryDetail,
    period: { from: from || null, to: to || null },
  });
}

export const GET = withErrorHandling(getHandler);
