// lib/data/cashflow.js
// Server-side cash flow aggregations for the charts and the cash flow report.
//
// These aggregate in MongoDB rather than reading the paginated transaction
// list, so a time series never silently omits older months the way a
// client-side chart built from /api/transactions (50 rows) would.
//
// Transfer classification mirrors lib/finance/calculations.js exactly:
// a transfer is never income and never an expense.

import mongoose from "mongoose";
import { connectDB } from "@/lib/db/mongoose";
import Transaction from "@/lib/db/models/Transaction";
import { Decimal } from "decimal.js";
import { TRANSFER_CATEGORY_LIST } from "@/lib/finance/calculations";

// Transfer classification mirrors lib/finance/calculations.js exactly:
// a transfer is never income and never an expense.
const TRANSFER_CATEGORIES = TRANSFER_CATEGORY_LIST;

// Aggregation expression operators only: $in takes the value first and the
// array second, and there is no $nin — use $not around $in instead.
const isTransferCond = {
  $or: [
    { $eq: ["$direction", "transfer"] },
    { $in: ["$category", TRANSFER_CATEGORIES] },
  ],
};

const notTransferCond = { $not: [isTransferCond] };

const incomeCond = {
  $and: [notTransferCond, { $eq: ["$direction", "inflow"] }],
};

const expenseCond = {
  $and: [notTransferCond, { $eq: ["$direction", "outflow"] }],
};

// Neither income nor expense, and not a transfer either — an "unknown"
// direction. cashflowSummary() still counts these in the category total.
const otherCond = {
  $and: [
    notTransferCond,
    { $ne: ["$direction", "inflow"] },
    { $ne: ["$direction", "outflow"] },
  ],
};

function toDecimal(value) {
  if (value === null || value === undefined) return new Decimal(0);
  if (value instanceof Decimal) return value;
  try {
    return new Decimal(typeof value === "object" && value !== null ? value.toString() : String(value));
  } catch {
    return new Decimal(0);
  }
}

const money = (value) => toDecimal(value).toFixed(2);

function monthKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(date) {
  return date.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
}

/**
 * Monthly income / expense / net series, zero-filled for months with no
 * transactions so the chart axis stays continuous.
 * @returns {Promise<Array<{month:string,label:string,income:string,expenses:string,transfers:string,net:string,count:number}>>}
 */
export async function getMonthlyCashFlow(userId, { months = 12, from = null, to = null } = {}) {
  await connectDB();

  const end = to ? new Date(to) : new Date();
  const start = from
    ? new Date(from)
    : new Date(end.getFullYear(), end.getMonth() - Math.max(0, months - 1), 1);

  const rows = await Transaction.aggregate([
    {
      $match: {
        ownerId: new mongoose.Types.ObjectId(userId),
        date: { $gte: start, $lte: end },
      },
    },
    {
      $group: {
        _id: { $dateToString: { format: "%Y-%m", date: "$date" } },
        income: { $sum: { $cond: [incomeCond, { $abs: "$amount" }, 0] } },
        expenses: { $sum: { $cond: [expenseCond, { $abs: "$amount" }, 0] } },
        transfers: { $sum: { $cond: [isTransferCond, { $abs: "$amount" }, 0] } },
        count: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  const byMonth = new Map(rows.map((r) => [r._id, r]));

  const series = [];
  const cursor = new Date(start.getFullYear(), start.getMonth(), 1);
  while (cursor <= end) {
    const key = monthKey(cursor);
    const row = byMonth.get(key);
    const income = toDecimal(row?.income);
    const expenses = toDecimal(row?.expenses);
    series.push({
      month: key,
      label: monthLabel(cursor),
      income: money(income),
      expenses: money(expenses),
      transfers: money(row?.transfers),
      net: money(income.minus(expenses)),
      count: row?.count ?? 0,
    });
    cursor.setMonth(cursor.getMonth() + 1);
  }

  return series;
}

/**
 * Complete cash flow summary for a date range, aggregated in the database.
 * Returns the same shape as cashflowSummary() in lib/finance/calculations.js
 * but without a row limit, so the report totals always match the chart.
 * @returns {Promise<{income:string,expenses:string,net:string,transfers:string,transferCount:number,byCategory:Record<string,string>}>}
 */
export async function getCashFlowSummary(userId, { from = null, to = null } = {}) {
  await connectDB();

  const dateFilter = {};
  if (from || to) {
    dateFilter.$gte = from ? new Date(from) : new Date(0);
    dateFilter.$lte = to ? new Date(to) : new Date();
  }

  const rows = await Transaction.aggregate([
    {
      $match: {
        ownerId: new mongoose.Types.ObjectId(userId),
        ...(Object.keys(dateFilter).length ? { date: dateFilter } : {}),
      },
    },
    {
      $group: {
        _id: "$category",
        income: { $sum: { $cond: [incomeCond, { $abs: "$amount" }, 0] } },
        expense: { $sum: { $cond: [expenseCond, { $abs: "$amount" }, 0] } },
        transfer: { $sum: { $cond: [isTransferCond, { $abs: "$amount" }, 0] } },
        other: { $sum: { $cond: [otherCond, { $abs: "$amount" }, 0] } },
        transferCount: { $sum: { $cond: [isTransferCond, 1, 0] } },
      },
    },
  ]);

  let income = new Decimal(0);
  let expenses = new Decimal(0);
  let transfers = new Decimal(0);
  let transferCount = 0;
  const byCategory = {};

  for (const r of rows) {
    const cat = r._id || "other";
    const catIncome = toDecimal(r.income);
    const catExpense = toDecimal(r.expense);
    const catOther = toDecimal(r.other);
    income = income.plus(catIncome);
    expenses = expenses.plus(catExpense);
    transfers = transfers.plus(toDecimal(r.transfer));
    transferCount += r.transferCount || 0;
    // Transfers never reach the category totals — they are not spending.
    // A category holding only transfers is therefore omitted entirely.
    const gross = catIncome.plus(catExpense).plus(catOther);
    if (gross.isZero()) continue;
    byCategory[cat] = gross.toFixed(2);
  }

  return {
    income: money(income),
    expenses: money(expenses),
    net: money(income.minus(expenses)),
    transfers: money(transfers),
    transferCount,
    byCategory,
  };
}

/**
 * Income and expense split per category over a date range.
 * Transfers are excluded entirely so they never inflate a category total.
 * @returns {Promise<Array<{category:string,income:string,expense:string,net:string,count:number}>>}
 */
export async function getCashFlowByCategory(userId, { from = null, to = null } = {}) {
  await connectDB();

  const dateFilter = {};
  if (from || to) {
    dateFilter.$gte = from ? new Date(from) : new Date(0);
    dateFilter.$lte = to ? new Date(to) : new Date();
  }

  const rows = await Transaction.aggregate([
    {
      $match: {
        ownerId: new mongoose.Types.ObjectId(userId),
        ...(Object.keys(dateFilter).length ? { date: dateFilter } : {}),
      },
    },
    {
      $group: {
        _id: "$category",
        income: { $sum: { $cond: [incomeCond, { $abs: "$amount" }, 0] } },
        expense: { $sum: { $cond: [expenseCond, { $abs: "$amount" }, 0] } },
        other: { $sum: { $cond: [otherCond, { $abs: "$amount" }, 0] } },
        count: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  return rows
    .map((r) => {
      const income = toDecimal(r.income);
      const expense = toDecimal(r.expense);
      const other = toDecimal(r.other);
      return {
        category: r._id || "other",
        income: money(income),
        expense: money(expense),
        net: money(income.minus(expense)),
        other: money(other),
        count: r.count,
      };
    })
    // Categories holding only transfers carry no in/out signal — drop them.
    .filter((r) => r.income !== "0.00" || r.expense !== "0.00" || r.other !== "0.00");
}
