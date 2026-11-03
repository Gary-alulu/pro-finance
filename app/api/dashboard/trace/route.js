// app/api/dashboard/trace/route.js
// GET /api/dashboard/trace?metric=netWorth
// Provides complete mathematical transparency, calculation explanations,
// and the underlying source records for any financial dashboard metric.

import { NextResponse } from "next/server";
import { requireUserId, withErrorHandling } from "@/lib/auth/session";
import { getNetWorthSummary } from "@/lib/services/dashboard/getNetWorthSummary";
import { getCashFlowSummary } from "@/lib/services/dashboard/getCashFlowSummary";
import { DEFAULT_CURRENCY } from "@/lib/finance/currency";

async function handler(request) {
  const userId = await requireUserId();
  const { searchParams } = new URL(request.url);

  const metric = searchParams.get("metric") || "netWorth";
  const currency = searchParams.get("currency") || DEFAULT_CURRENCY;
  const period = searchParams.get("period") || "30d";

  const [nw, cf] = await Promise.all([
    getNetWorthSummary(userId, { reportingCurrency: currency }),
    getCashFlowSummary(userId, { period, reportingCurrency: currency }),
  ]);

  let responseData = {
    metric,
    reportingCurrency: currency,
    generatedAt: new Date().toISOString(),
  };

  switch (metric) {
    case "netWorth":
      responseData = {
        ...responseData,
        title: "Total Net Worth",
        formula: "Total Eligible Assets − Total Outstanding Liabilities",
        totalValue: nw.netWorth,
        summaryComponents: [
          { label: "Assets Total", value: nw.assetsTotal, operation: "add" },
          { label: "Investment Holdings", value: nw.holdingsTotal, operation: "add" },
          { label: "Total Liabilities", value: nw.totalLiabilities, operation: "subtract" },
        ],
        includedRecords: [
          ...(nw.trace?.assets?.filter((a) => a.isIncluded) || []).map((a) => ({
            ...a,
            entityType: "asset",
            href: `/assets?focus=${a.id}`,
          })),
          ...(nw.trace?.holdings?.filter((h) => h.isIncluded) || []).map((h) => ({
            ...h,
            entityType: "investment",
            href: `/investments?holding=${h.id}`,
          })),
          ...(nw.trace?.liabilities?.filter((l) => l.isIncluded) || []).map((l) => ({
            ...l,
            entityType: "liability",
            href: `/assets?tab=liabilities&focus=${l.id}`,
          })),
        ],
        excludedRecords: [
          ...(nw.trace?.assets?.filter((a) => !a.isIncluded) || []).map((a) => ({
            ...a,
            entityType: "asset",
            href: `/assets?focus=${a.id}`,
          })),
          ...(nw.trace?.holdings?.filter((h) => !h.isIncluded) || []).map((h) => ({
            ...h,
            entityType: "investment",
            href: `/investments?holding=${h.id}`,
          })),
          ...(nw.trace?.liabilities?.filter((l) => !l.isIncluded) || []).map((l) => ({
            ...l,
            entityType: "liability",
            href: `/assets?tab=liabilities&focus=${l.id}`,
          })),
        ],
        explanation:
          "Net worth represents your net recognized financial position. Jointly owned assets apply their attributable ownership percentage. Excluded items lack confirmed valuations or exchange rates and are NEVER treated as zero.",
      };
      break;

    case "totalAssets":
      responseData = {
        ...responseData,
        title: "Total Assets",
        formula: "Sum of (Eligible Asset Value × Attributable Ownership %) + Investment Holdings Market Value",
        totalValue: nw.totalAssets,
        includedRecords: [
          ...(nw.trace?.assets?.filter((a) => a.isIncluded) || []).map((a) => ({
            ...a,
            entityType: "asset",
            href: `/assets?focus=${a.id}`,
          })),
          ...(nw.trace?.holdings?.filter((h) => h.isIncluded) || []).map((h) => ({
            ...h,
            entityType: "investment",
            href: `/investments?holding=${h.id}`,
          })),
        ],
        excludedRecords: [
          ...(nw.trace?.assets?.filter((a) => !a.isIncluded) || []).map((a) => ({
            ...a,
            entityType: "asset",
            href: `/assets?focus=${a.id}`,
          })),
          ...(nw.trace?.holdings?.filter((h) => !h.isIncluded) || []).map((h) => ({
            ...h,
            entityType: "investment",
            href: `/investments?holding=${h.id}`,
          })),
        ],
        explanation:
          "Assets include confirmed cash, bank accounts, property, vehicles, and portfolio holdings. Jointly owned assets are scaled according to your ownership share.",
      };
      break;

    case "totalLiabilities":
      responseData = {
        ...responseData,
        title: "Total Liabilities",
        formula: "Sum of all outstanding debt balances and confirmed obligations",
        totalValue: nw.totalLiabilities,
        includedRecords: (nw.trace?.liabilities?.filter((l) => l.isIncluded) || []).map((l) => ({
          ...l,
          entityType: "liability",
          href: `/assets?tab=liabilities&focus=${l.id}`,
        })),
        excludedRecords: (nw.trace?.liabilities?.filter((l) => !l.isIncluded) || []).map((l) => ({
          ...l,
          entityType: "liability",
          href: `/assets?tab=liabilities&focus=${l.id}`,
        })),
        explanation:
          "Liabilities reflect current outstanding loan balances and credit facilities, not original loan amounts.",
      };
      break;

    case "cashAndEquivalents":
      responseData = {
        ...responseData,
        title: "Cash & Cash Equivalents",
        formula: "Sum of liquid bank accounts, physical cash, mobile money, and money market funds",
        totalValue: nw.cashAndEquivalents,
        includedRecords: (
          nw.trace?.assets?.filter(
            (a) =>
              a.isIncluded &&
              [
                "cash",
                "bank_account",
                "mobile_money",
                "bank_checking",
                "bank_savings",
                "money_market",
              ].includes(a.category)
          ) || []
        ).map((a) => ({
          ...a,
          entityType: "account",
          href: `/assets?focus=${a.id}`,
        })),
        excludedRecords: [],
        explanation:
          "Available liquid funds. Internal transfers between your own accounts never change this total.",
      };
      break;

    case "cashFlow":
    case "netCashFlow":
      responseData = {
        ...responseData,
        title: "Net Cash Flow",
        formula: "Confirmed Period Income − Confirmed Period Expenses",
        totalValue: cf.netCashFlow,
        summaryComponents: [
          { label: "Total Income", value: cf.income, operation: "add" },
          { label: "Total Expenses", value: cf.expenses, operation: "subtract" },
          { label: "Internal Transfers (Excluded from P&L)", value: cf.transfers, operation: "neutral" },
        ],
        explanation:
          "Net cash movement during the selected period. Internal transfers and investment purchases are capital movements and strictly excluded from income and expenses.",
      };
      break;

    case "savingsRate":
      responseData = {
        ...responseData,
        title: "Savings Rate",
        formula: "(Net Cash Flow / Total Eligible Income) × 100",
        totalValue: cf.savingsRate ? `${cf.savingsRate}%` : "No baseline",
        summaryComponents: [
          { label: "Net Cash Flow", value: cf.netCashFlow, operation: "numerator" },
          { label: "Total Income", value: cf.income, operation: "denominator" },
        ],
        explanation:
          "Portion of income retained after consumption expenses. Internal transfers and balance sheet movements do not artificially inflate this metric.",
      };
      break;

    default:
      responseData = {
        ...responseData,
        title: metric,
        formula: "Calculated from confirmed source records",
        totalValue: "—",
        includedRecords: [],
        excludedRecords: [],
        explanation: "Select a metric to review its mathematical calculation and source records.",
      };
  }

  return NextResponse.json(responseData);
}

export const GET = withErrorHandling(handler);
