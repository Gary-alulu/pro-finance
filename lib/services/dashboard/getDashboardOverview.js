// lib/services/dashboard/getDashboardOverview.js
// Central orchestrator for the Financial Dashboard & Overview.
// Aggregates verified data across every financial module into a single,
// coherent, deterministic response.

import { connectDB } from "@/lib/db/mongoose";
import User from "@/lib/db/models/User";
import { getNetWorthSummary } from "./getNetWorthSummary";
import { getAssetSummary } from "./getAssetSummary";
import { getLiabilitySummary } from "./getLiabilitySummary";
import { getCashFlowSummary } from "./getCashFlowSummary";
import { getInvestmentSummary } from "./getInvestmentSummary";
import { getFinancialTrends } from "./getFinancialTrends";
import { getGoalSummary } from "./getGoalSummary";
import { getDashboardAlerts } from "./getDashboardAlerts";
import { getRecentActivity } from "./getRecentActivity";
import { DEFAULT_CURRENCY } from "@/lib/finance/currency";

export async function getDashboardOverview(
  userId,
  {
    period = "30d",
    from = null,
    to = null,
    reportingCurrency = null,
  } = {}
) {
  await connectDB();

  // Only hit the user document when the caller did not supply a currency.
  let effectiveCurrency = reportingCurrency;
  if (!effectiveCurrency) {
    const user = await User.findById(userId)
      .select("preferredCurrency settings")
      .lean();
    effectiveCurrency =
      user?.settings?.financial?.reportingCurrency ||
      user?.preferredCurrency ||
      DEFAULT_CURRENCY;
  }

  // Run core financial aggregations in parallel for maximum performance
  const [
    netWorthData,
    assetData,
    liabilityData,
    cashFlowData,
    investmentData,
    alertsData,
    activityData,
  ] = await Promise.all([
    getNetWorthSummary(userId, { reportingCurrency: effectiveCurrency }),
    getAssetSummary(userId, { reportingCurrency: effectiveCurrency }),
    getLiabilitySummary(userId, { reportingCurrency: effectiveCurrency }),
    getCashFlowSummary(userId, { period, from, to, reportingCurrency: effectiveCurrency }),
    getInvestmentSummary(userId, { reportingCurrency: effectiveCurrency }),
    getDashboardAlerts(userId, { limit: 6 }),
    getRecentActivity(userId, { limit: 8, reportingCurrency: effectiveCurrency }),
  ]);

  // Trends & Goals run with the current position context
  const [trendsData, goalsData] = await Promise.all([
    getFinancialTrends(userId, {
      period,
      from,
      to,
      reportingCurrency: effectiveCurrency,
      currentSnapshot: {
        netWorth: netWorthData.netWorth,
        totalAssets: netWorthData.totalAssets,
        totalLiabilities: netWorthData.totalLiabilities,
      },
    }),
    getGoalSummary(userId, {
      reportingCurrency: effectiveCurrency,
      currentNetWorth: netWorthData.netWorth,
    }),
  ]);

  // Overall data quality evaluation
  const isComplete =
    netWorthData.dataQuality.assetsWithMissingValue === 0 &&
    netWorthData.dataQuality.liabilitiesWithMissingBalance === 0 &&
    netWorthData.dataQuality.holdingsWithMissingPrice === 0 &&
    netWorthData.dataQuality.unconvertible.length === 0;

  return {
    generatedAt: new Date().toISOString(),
    reportingCurrency: effectiveCurrency,
    period: cashFlowData.period,
    financialPosition: {
      netWorth: netWorthData.netWorth,
      totalAssets: netWorthData.totalAssets,
      totalLiabilities: netWorthData.totalLiabilities,
      cashAndEquivalents: netWorthData.cashAndEquivalents,
      investmentValue: netWorthData.investmentValue,
      totalUnrealizedPL: netWorthData.totalUnrealizedPL,
      comparison: netWorthData.comparison,
      breakdown: netWorthData.breakdown,
    },
    assets: {
      totalValue: assetData.totalAssetValue,
      allocation: assetData.allocation,
      summary: assetData.summary,
    },
    liabilities: {
      totalBalance: liabilityData.totalLiabilityBalance,
      weightedInterestRate: liabilityData.weightedInterestRate,
      distribution: liabilityData.distribution,
      summary: liabilityData.summary,
    },
    cashFlow: {
      income: cashFlowData.income,
      expenses: cashFlowData.expenses,
      netCashFlow: cashFlowData.netCashFlow,
      averageMonthlyIncome: cashFlowData.averageMonthlyIncome,
      averageMonthlyExpenses: cashFlowData.averageMonthlyExpenses,
      savingsRate: cashFlowData.savingsRate,
      recurringExpenses: cashFlowData.recurringExpenses,
      largestExpense: cashFlowData.largestExpense,
      transfers: cashFlowData.transfers,
      categoryBreakdown: cashFlowData.categoryBreakdown,
      comparison: cashFlowData.comparison,
    },
    investments: {
      portfolioValue: investmentData.portfolioValue,
      acquisitionCost: investmentData.acquisitionCost,
      unrealizedGainLoss: investmentData.unrealizedGainLoss,
      realizedGainLoss: investmentData.realizedGainLoss,
      dividendsReceived: investmentData.dividendsReceived,
      activeHoldingsCount: investmentData.activeHoldingsCount,
      latestValuationDate: investmentData.latestValuationDate,
      concentrationWarnings: investmentData.concentrationWarnings,
      allocation: investmentData.allocation,
      priceSources: investmentData.priceSources,
    },
    trends: trendsData,
    goals: goalsData,
    alerts: alertsData,
    recentActivity: activityData.items,
    dataQuality: {
      completeness: isComplete ? "verified" : "partial",
      isPartial: !isComplete,
      missingValuationsCount: netWorthData.dataQuality.assetsWithMissingValue,
      missingBalancesCount: netWorthData.dataQuality.liabilitiesWithMissingBalance,
      missingPricesCount: netWorthData.dataQuality.holdingsWithMissingPrice,
      unconvertibleCurrencies: netWorthData.dataQuality.unconvertible,
      staleAssetsCount: assetData.summary.staleCount,
      oldestValuationDate: netWorthData.dataQuality.oldestValuationDate,
      newestValuationDate: netWorthData.dataQuality.newestValuationDate,
    },
    trace: netWorthData.trace,
  };
}
