// lib/services/dashboard/getFinancialTrends.js
// Historical time series and period-over-period comparisons for the dashboard.
// Integrates FinancialSnapshot records and MongoDB transaction aggregations.

import mongoose from "mongoose";
import { connectDB } from "@/lib/db/mongoose";
import FinancialSnapshot from "@/lib/db/models/FinancialSnapshot";
import Transaction from "@/lib/db/models/Transaction";
import { getMonthlyCashFlow } from "@/lib/data/cashflow";
import { DEFAULT_CURRENCY, percentageChange } from "@/lib/finance/currency";
import { Decimal } from "decimal.js";

function getPeriodBoundaries(period = "12m", customFrom = null, customTo = null) {
  const end = customTo ? new Date(customTo) : new Date();
  let start;

  if (customFrom) {
    start = new Date(customFrom);
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
      case "fy":
        start = new Date(end.getFullYear(), 0, 1);
        break;
      case "prev_fy":
        start = new Date(end.getFullYear() - 1, 0, 1);
        end.setFullYear(end.getFullYear() - 1, 11, 31);
        break;
      case "all":
        start = new Date(0);
        break;
      default:
        start.setFullYear(end.getFullYear() - 1);
    }
  }

  const durationMs = end.getTime() - start.getTime();
  const prevEnd = new Date(start.getTime() - 1);
  const prevStart = new Date(prevEnd.getTime() - durationMs);

  return { start, end, prevStart, prevEnd };
}

export async function getFinancialTrends(
  userId,
  {
    period = "12m",
    from = null,
    to = null,
    reportingCurrency = DEFAULT_CURRENCY,
    currentSnapshot = null,
  } = {}
) {
  await connectDB();
  const rep = (reportingCurrency || DEFAULT_CURRENCY).toUpperCase();
  const { start, end, prevStart, prevEnd } = getPeriodBoundaries(period, from, to);

  // 1. Fetch historical snapshots within start..end
  const snapshots = await FinancialSnapshot.find({
    ownerId: userId,
    takenAt: { $gte: start, $lte: end },
  })
    .sort({ takenAt: 1 })
    .limit(500)
    .lean();

  const netWorthSeries = snapshots.map((s) => ({
    date: new Date(s.takenAt).toISOString().slice(0, 10),
    netWorth: s.netWorth ? Number(s.netWorth.toString()) : null,
    totalAssets: s.totalAssets ? Number(s.totalAssets.toString()) : null,
    totalLiabilities: s.totalLiabilities ? Number(s.totalLiabilities.toString()) : null,
    isManual: s.isManual ?? false,
  }));

  // If current position snapshot is passed, append as today's point if after last snapshot
  if (currentSnapshot && currentSnapshot.netWorth) {
    const todayStr = new Date().toISOString().slice(0, 10);
    const lastSnapDate = netWorthSeries.length
      ? netWorthSeries[netWorthSeries.length - 1].date
      : null;

    if (lastSnapDate !== todayStr) {
      netWorthSeries.push({
        date: todayStr,
        netWorth: Number(currentSnapshot.netWorth),
        totalAssets: Number(currentSnapshot.totalAssets),
        totalLiabilities: Number(currentSnapshot.totalLiabilities),
        isCurrent: true,
      });
    }
  }

  // 2. Monthly cash flow series (Income vs Expenses vs Net)
  const monthsCount = Math.max(1, Math.min(24, Math.round((end - start) / (30 * 24 * 3600 * 1000))));
  const cashFlowSeries = await getMonthlyCashFlow(userId, {
    months: monthsCount,
    from: start.toISOString(),
    to: end.toISOString(),
  });

  // 3. Comparisons: First point vs Last point in net worth series
  let netWorthChange = null;
  if (netWorthSeries.length >= 2) {
    const firstVal = netWorthSeries[0].netWorth;
    const lastVal = netWorthSeries[netWorthSeries.length - 1].netWorth;
    if (firstVal != null && lastVal != null) {
      const pct = percentageChange(firstVal, lastVal);
      netWorthChange = {
        fromValue: firstVal,
        toValue: lastVal,
        absoluteDelta: (lastVal - firstVal).toFixed(2),
        percentageChange: pct,
        isPositive: pct !== null ? Number(pct) >= 0 : null,
      };
    }
  }

  return {
    period: {
      key: period,
      start: start.toISOString(),
      end: end.toISOString(),
    },
    reportingCurrency: rep,
    netWorthTrend: netWorthSeries,
    cashFlowTrend: cashFlowSeries,
    comparison: netWorthChange,
    dataIntegrity: {
      hasHistoricalSnapshots: snapshots.length > 0,
      snapshotsCount: snapshots.length,
      isInterpolated: false,
    },
  };
}
