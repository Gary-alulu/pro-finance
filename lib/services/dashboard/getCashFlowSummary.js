// lib/services/dashboard/getCashFlowSummary.js
// Deterministic cash flow metrics, category breakdowns, savings rate and recurring commitments.
// Transfers and capital movements are strictly excluded from income and expenses.

import mongoose from "mongoose";
import { connectDB } from "@/lib/db/mongoose";
import Transaction from "@/lib/db/models/Transaction";
import {
  classifyTransaction,
  calculateSavingsRate,
  TRANSFER_CATEGORY_LIST,
} from "@/lib/finance/calculations";
import { DEFAULT_CURRENCY, percentageChange } from "@/lib/finance/currency";
import { Decimal } from "decimal.js";

function parseDateRange({ period = "30d", from = null, to = null } = {}) {
  const end = to ? new Date(to) : new Date();
  let start;

  if (from) {
    start = new Date(from);
  } else {
    start = new Date(end);
    switch (period) {
      case "7d":
        start.setDate(end.getDate() - 7);
        break;
      case "30d":
        start.setDate(end.getDate() - 30);
        break;
      case "90d":
        start.setDate(end.getDate() - 90);
        break;
      case "6m":
        start.setMonth(end.getMonth() - 6);
        break;
      case "12m":
      case "1y":
        start.setFullYear(end.getFullYear() - 1);
        break;
      case "ytd":
      case "fy":
        start = new Date(end.getFullYear(), 0, 1);
        break;
      default:
        start.setDate(end.getDate() - 30);
    }
  }

  // Calculate equivalent previous comparison period
  const durationMs = end.getTime() - start.getTime();
  const prevEnd = new Date(start.getTime() - 1);
  const prevStart = new Date(prevEnd.getTime() - durationMs);

  return { start, end, prevStart, prevEnd };
}

export async function getCashFlowSummary(
  userId,
  {
    period = "30d",
    from = null,
    to = null,
    reportingCurrency = DEFAULT_CURRENCY,
    includeComparison = true,
  } = {}
) {
  await connectDB();
  const rep = (reportingCurrency || DEFAULT_CURRENCY).toUpperCase();
  const { start, end, prevStart, prevEnd } = parseDateRange({ period, from, to });

  // Query transactions in current period + prior period (if comparison enabled)
  const query = {
    ownerId: new mongoose.Types.ObjectId(userId),
    date: { $gte: includeComparison ? prevStart : start, $lte: end },
  };

  const allTxs = await Transaction.find(query).sort({ date: -1 }).lean();

  let income = new Decimal(0);
  let expenses = new Decimal(0);
  let transfers = new Decimal(0);
  let transferCount = 0;
  let recurringExpenses = new Decimal(0);
  let largestExpense = null;
  const byCategory = {};
  const currentTxs = [];

  // Prior period accumulators
  let prevIncome = new Decimal(0);
  let prevExpenses = new Decimal(0);

  for (const tx of allTxs) {
    const txDate = new Date(tx.date);
    const isCurrent = txDate >= start && txDate <= end;
    const isPrevious = txDate >= prevStart && txDate <= prevEnd;

    const rawAmt = tx.amount ? new Decimal(tx.amount.toString()) : null;
    if (rawAmt === null) continue;
    const abs = rawAmt.abs();
    const kind = classifyTransaction(tx);

    if (isCurrent) {
      currentTxs.push(tx);

      if (kind === "transfer") {
        transfers = transfers.plus(abs);
        transferCount += 1;
        continue;
      }

      if (kind === "income") {
        income = income.plus(abs);
      } else if (kind === "expense") {
        expenses = expenses.plus(abs);

        // Check if recurring
        if (tx.isRecurring || tx.recurringGroupId) {
          recurringExpenses = recurringExpenses.plus(abs);
        }

        // Track largest expense
        if (!largestExpense || abs.greaterThan(new Decimal(largestExpense.amount))) {
          largestExpense = {
            id: tx._id.toString(),
            description: tx.description || tx.category || "Expense",
            amount: abs.toFixed(2),
            currency: tx.currency || rep,
            date: tx.date,
            category: tx.category,
          };
        }
      }

      const cat = tx.category || "other";
      byCategory[cat] = (byCategory[cat] || new Decimal(0)).plus(abs);
    } else if (isPrevious) {
      if (kind === "income") {
        prevIncome = prevIncome.plus(abs);
      } else if (kind === "expense") {
        prevExpenses = prevExpenses.plus(abs);
      }
    }
  }

  const netCashFlow = income.minus(expenses);
  const prevNetCashFlow = prevIncome.minus(prevExpenses);

  // Calculate monthly averages based on period duration in days
  const periodDays = Math.max(1, Math.round((end.getTime() - start.getTime()) / (24 * 3600 * 1000)));
  const monthsInPeriod = Math.max(0.1, periodDays / 30.4375);

  const avgMonthlyIncome = income.dividedBy(monthsInPeriod).toFixed(2);
  const avgMonthlyExpenses = expenses.dividedBy(monthsInPeriod).toFixed(2);

  // Deterministic savings rate: Net Cash Flow / Income * 100
  const savingsRate = calculateSavingsRate({
    income: income.toFixed(2),
    netCashFlow: netCashFlow.toFixed(2),
  });

  // Comparisons
  let comparison = null;
  if (includeComparison) {
    comparison = {
      incomeChangePct: percentageChange(prevIncome.toFixed(2), income.toFixed(2)),
      expensesChangePct: percentageChange(prevExpenses.toFixed(2), expenses.toFixed(2)),
      netChangePct: percentageChange(prevNetCashFlow.toFixed(2), netCashFlow.toFixed(2)),
      previousPeriod: {
        start: prevStart.toISOString(),
        end: prevEnd.toISOString(),
        income: prevIncome.toFixed(2),
        expenses: prevExpenses.toFixed(2),
        net: prevNetCashFlow.toFixed(2),
      },
    };
  }

  // Categories list
  const categoryList = Object.entries(byCategory).map(([category, amount]) => ({
    category,
    amount: amount.toFixed(2),
  }));
  categoryList.sort((a, b) => Number(b.amount) - Number(a.amount));

  return {
    period: {
      key: period,
      start: start.toISOString(),
      end: end.toISOString(),
      days: periodDays,
    },
    reportingCurrency: rep,
    income: income.toFixed(2),
    expenses: expenses.toFixed(2),
    netCashFlow: netCashFlow.toFixed(2),
    averageMonthlyIncome: avgMonthlyIncome,
    averageMonthlyExpenses: avgMonthlyExpenses,
    savingsRate,
    transfers: transfers.toFixed(2),
    transferCount,
    recurringExpenses: recurringExpenses.toFixed(2),
    largestExpense,
    categoryBreakdown: categoryList,
    comparison,
    transactionCount: currentTxs.length,
  };
}
