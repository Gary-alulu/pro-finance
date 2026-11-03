// lib/services/dashboard/getDashboardExport.js
// Export generation for the dashboard overview.
// Uses RFC 4180 CSV serialization and protects against formula injection.

import { toCsv, exportFilename } from "@/lib/reports/csv";
import { getNetWorthSummary } from "./getNetWorthSummary";
import { getCashFlowSummary } from "./getCashFlowSummary";
import { getAssetSummary } from "./getAssetSummary";
import { getLiabilitySummary } from "./getLiabilitySummary";
import { getInvestmentSummary } from "./getInvestmentSummary";
import { DEFAULT_CURRENCY } from "@/lib/finance/currency";

export async function getDashboardExport(
  userId,
  {
    scope = "summary", // "summary" | "assets_liabilities" | "cashflow" | "investments"
    format = "csv", // "csv" | "json"
    reportingCurrency = DEFAULT_CURRENCY,
    period = "30d",
  } = {}
) {
  const rep = (reportingCurrency || DEFAULT_CURRENCY).toUpperCase();

  if (scope === "summary") {
    const [nw, cf, inv] = await Promise.all([
      getNetWorthSummary(userId, { reportingCurrency: rep }),
      getCashFlowSummary(userId, { period, reportingCurrency: rep }),
      getInvestmentSummary(userId, { reportingCurrency: rep }),
    ]);

    const rows = [
      { metric: "Total Net Worth", value: nw.netWorth, currency: rep, notes: "Total Assets - Total Liabilities" },
      { metric: "Total Assets", value: nw.totalAssets, currency: rep, notes: "Attributable assets + market holdings" },
      { metric: "Total Liabilities", value: nw.totalLiabilities, currency: rep, notes: "Outstanding debt balances" },
      { metric: "Cash & Equivalents", value: nw.cashAndEquivalents, currency: rep, notes: "Liquid accounts & cash" },
      { metric: "Investments Value", value: nw.investmentValue, currency: rep, notes: "Holdings at latest recorded price" },
      { metric: "Total Income", value: cf.income, currency: rep, notes: `Period: ${period}` },
      { metric: "Total Expenses", value: cf.expenses, currency: rep, notes: `Period: ${period}` },
      { metric: "Net Cash Flow", value: cf.netCashFlow, currency: rep, notes: "Income - Expenses (transfers excluded)" },
      { metric: "Savings Rate", value: cf.savingsRate ? `${cf.savingsRate}%` : "N/A", currency: "%", notes: "Eligible savings / income" },
      { metric: "Unrealized Investment P&L", value: inv.unrealizedGainLoss, currency: rep, notes: "Market value - cost basis" },
      { metric: "Realized Gain / Loss", value: inv.realizedGainLoss, currency: rep, notes: "Closed trade proceeds" },
      { metric: "Dividends Received", value: inv.dividendsReceived, currency: rep, notes: "Total received dividend income" },
    ];

    if (format === "json") {
      return {
        filename: `profinance-summary-${new Date().toISOString().slice(0, 10)}.json`,
        contentType: "application/json",
        data: JSON.stringify({ generatedAt: new Date().toISOString(), currency: rep, period, metrics: rows }, null, 2),
      };
    }

    const columns = [
      { key: "metric", label: "Financial Metric" },
      { key: "value", label: "Amount" },
      { key: "currency", label: "Currency" },
      { key: "notes", label: "Calculation / Notes" },
    ];

    return {
      filename: exportFilename("summary"),
      contentType: "text/csv; charset=utf-8",
      data: toCsv(columns, rows),
    };
  }

  if (scope === "assets_liabilities") {
    const [assets, liabilities] = await Promise.all([
      getAssetSummary(userId, { reportingCurrency: rep }),
      getLiabilitySummary(userId, { reportingCurrency: rep }),
    ]);

    const rows = [
      ...assets.records.map((a) => ({
        type: "Asset",
        name: a.name,
        category: a.categoryLabel,
        ownership: `${a.ownershipPercentage}%`,
        originalCurrency: a.currency,
        originalValue: a.originalValue || "N/A",
        convertedAmount: a.convertedValue || "N/A",
        reportingCurrency: rep,
        valuationDate: a.valuationAsOf ? a.valuationAsOf.slice(0, 10) : "N/A",
      })),
      ...liabilities.records.map((l) => ({
        type: "Liability",
        name: l.name,
        category: l.categoryLabel,
        ownership: "100%",
        originalCurrency: l.currency,
        originalValue: l.originalBalance || "N/A",
        convertedAmount: l.convertedBalance || "N/A",
        reportingCurrency: rep,
        valuationDate: l.maturityDate ? `Matures: ${l.maturityDate.slice(0, 10)}` : "N/A",
      })),
    ];

    if (format === "json") {
      return {
        filename: `profinance-balance-sheet-${new Date().toISOString().slice(0, 10)}.json`,
        contentType: "application/json",
        data: JSON.stringify(rows, null, 2),
      };
    }

    const columns = [
      { key: "type", label: "Type" },
      { key: "name", label: "Name" },
      { key: "category", label: "Category" },
      { key: "ownership", label: "Attributable Share" },
      { key: "originalCurrency", label: "Original Currency" },
      { key: "originalValue", label: "Recorded Amount" },
      { key: "convertedAmount", label: `Value (${rep})` },
      { key: "valuationDate", label: "Date / Maturity" },
    ];

    return {
      filename: exportFilename("assets-liabilities"),
      contentType: "text/csv; charset=utf-8",
      data: toCsv(columns, rows),
    };
  }

  // Default fallback
  const cf = await getCashFlowSummary(userId, { period, reportingCurrency: rep });
  const rows = cf.categoryBreakdown.map((c) => ({
    category: c.category,
    amount: c.amount,
    currency: rep,
  }));

  const columns = [
    { key: "category", label: "Category" },
    { key: "amount", label: `Amount (${rep})` },
    { key: "currency", label: "Currency" },
  ];

  return {
    filename: exportFilename("cashflow"),
    contentType: "text/csv; charset=utf-8",
    data: toCsv(columns, rows),
  };
}
