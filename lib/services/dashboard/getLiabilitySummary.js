// lib/services/dashboard/getLiabilitySummary.js
// Liabilities composition, category breakdown, maturity schedule and debt distribution.

import { connectDB } from "@/lib/db/mongoose";
import Liability from "@/lib/db/models/Liability";
import ExchangeRate from "@/lib/db/models/ExchangeRate";
import { convertToReporting } from "@/lib/finance/calculations";
import { DEFAULT_CURRENCY } from "@/lib/finance/currency";
import { Decimal } from "decimal.js";

const CATEGORY_LABELS = {
  mortgage: "Mortgages",
  car_loan: "Vehicle & Asset Loans",
  personal_loan: "Personal Loans",
  credit_card: "Credit Cards",
  overdraft: "Overdraft Facilities",
  business_loan: "Business Liabilities",
  student_loan: "Education Loans",
  tax_owed: "Tax Liabilities",
  supplier_invoice: "Outstanding Invoices",
  other: "Other Obligations",
};

export async function getLiabilitySummary(
  userId,
  { reportingCurrency = DEFAULT_CURRENCY } = {}
) {
  await connectDB();
  const rep = (reportingCurrency || DEFAULT_CURRENCY).toUpperCase();
  const now = new Date();
  const DAY_MS = 24 * 60 * 60 * 1000;

  const [liabilities, rateDocs] = await Promise.all([
    Liability.find({ ownerId: userId, status: "active" }).sort({ createdAt: -1 }).lean(),
    ExchangeRate.find({ ownerId: userId }).lean(),
  ]);

  const rates = rateDocs.map((r) => ({
    from: r.from,
    to: r.to,
    rate: r.rate?.toString(),
    asOf: r.asOf,
  }));

  let totalBalance = new Decimal(0);
  const byCategoryMap = new Map();
  const enrichedRecords = [];
  let overdueCount = 0;
  let upcomingCount = 0;
  let weightedInterestNumerator = new Decimal(0);
  let totalWithInterest = new Decimal(0);

  for (const l of liabilities) {
    const rawBal = l.currentBalance?.amount ? new Decimal(l.currentBalance.amount.toString()) : null;
    const principal = l.principalAmount ? new Decimal(l.principalAmount.toString()) : null;
    const interestRate = l.interestRate ? new Decimal(l.interestRate.toString()) : null;

    if (rawBal === null) {
      enrichedRecords.push({
        id: l._id.toString(),
        name: l.name,
        category: l.category,
        categoryLabel: CATEGORY_LABELS[l.category] || "Other Debt",
        currency: l.currency || rep,
        originalBalance: null,
        principalAmount: principal ? principal.toFixed(2) : null,
        convertedBalance: null,
        interestRate: interestRate ? interestRate.toFixed(2) : null,
        maturityDate: l.maturityDate ? new Date(l.maturityDate).toISOString() : null,
        daysToMaturity: null,
        maturityStatus: "none",
        lender: l.lender || "",
      });
      continue;
    }

    const { converted, rate, rateAsOf } = convertToReporting(
      rawBal,
      l.currency,
      rates,
      rep,
      now
    );

    let daysToMaturity = null;
    let maturityStatus = "none";
    if (l.maturityDate) {
      const mat = new Date(l.maturityDate);
      daysToMaturity = Math.round((mat.getTime() - now.getTime()) / DAY_MS);
      if (daysToMaturity < 0) {
        maturityStatus = "overdue";
        overdueCount += 1;
      } else if (daysToMaturity <= 30) {
        maturityStatus = "upcoming";
        upcomingCount += 1;
      } else {
        maturityStatus = "future";
      }
    }

    if (converted !== null) {
      totalBalance = totalBalance.plus(converted);
      const catKey = l.category || "other";
      const curCatTotal = byCategoryMap.get(catKey) || new Decimal(0);
      byCategoryMap.set(catKey, curCatTotal.plus(converted));

      if (interestRate !== null) {
        weightedInterestNumerator = weightedInterestNumerator.plus(
          new Decimal(converted).times(interestRate)
        );
        totalWithInterest = totalWithInterest.plus(converted);
      }
    }

    enrichedRecords.push({
      id: l._id.toString(),
      name: l.name,
      category: l.category,
      categoryLabel: CATEGORY_LABELS[l.category] || "Other Debt",
      currency: l.currency || rep,
      originalBalance: rawBal.toFixed(2),
      principalAmount: principal ? principal.toFixed(2) : null,
      convertedBalance: converted,
      rate,
      rateAsOf,
      interestRate: interestRate ? interestRate.toFixed(2) : null,
      maturityDate: l.maturityDate ? new Date(l.maturityDate).toISOString() : null,
      daysToMaturity,
      maturityStatus,
      lender: l.lender || "",
      status: l.status,
    });
  }

  // Calculate weighted average interest rate
  const weightedInterestRate = totalWithInterest.greaterThan(0)
    ? weightedInterestNumerator.dividedBy(totalWithInterest).toFixed(2)
    : null;

  // Distribution
  const distribution = [];
  for (const [category, amountDec] of byCategoryMap.entries()) {
    const amountStr = amountDec.toFixed(2);
    const pct = totalBalance.greaterThan(0)
      ? amountDec.dividedBy(totalBalance).times(100).toFixed(1)
      : "0.0";
    distribution.push({
      category,
      label: CATEGORY_LABELS[category] || category,
      amount: amountStr,
      percentage: Number(pct),
    });
  }

  distribution.sort((a, b) => Number(b.amount) - Number(a.amount));

  return {
    totalLiabilityBalance: totalBalance.toFixed(2),
    reportingCurrency: rep,
    weightedInterestRate,
    distribution,
    records: enrichedRecords,
    summary: {
      totalCount: liabilities.length,
      overdueCount,
      upcomingCount,
    },
  };
}
