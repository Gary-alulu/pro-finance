// lib/services/assets-liabilities/getAssetsLiabilitiesOverview.js
import { connectDB } from "@/lib/db/mongoose";
import Asset from "@/lib/db/models/Asset";
import Liability from "@/lib/db/models/Liability";
import Account from "@/lib/db/models/Account";
import InvestmentHolding from "@/lib/db/models/InvestmentHolding";
import ExchangeRate from "@/lib/db/models/ExchangeRate";
import LiabilityPayment from "@/lib/db/models/LiabilityPayment";
import AssetValuation from "@/lib/db/models/AssetValuation";
import { convertToReporting, holdingMarketValue } from "@/lib/finance/calculations";
import { DEFAULT_CURRENCY } from "@/lib/finance/currency";
import { Decimal } from "decimal.js";

Decimal.set({ precision: 28, rounding: Decimal.ROUND_HALF_UP });
const ZERO = new Decimal(0);

const ASSET_CATEGORY_LABELS = {
  cash: "Cash & Bank Accounts",
  bank_account: "Bank Accounts",
  property: "Real Estate & Land",
  vehicle: "Vehicles & Transport",
  equipment: "Equipment & Machinery",
  electronics: "Tech & Electronics",
  listed_equity: "Listed Equities",
  private_equity: "Private Businesses",
  retirement: "Retirement & Pensions",
  bond: "Bonds & Gilts",
  crypto: "Digital & Crypto Assets",
  receivable: "Receivables & IOUs",
  other: "Other Tangible Assets",
};

const LIABILITY_CATEGORY_LABELS = {
  mortgage: "Mortgages",
  car_loan: "Vehicle Financing",
  personal_loan: "Personal Loans",
  credit_card: "Credit Cards",
  overdraft: "Bank Overdrafts",
  business_loan: "Commercial Loans",
  student_loan: "Education Debt",
  tax_owed: "Tax Liabilities",
  supplier_payable: "Trade Payables",
  other: "Other Obligations",
};

export async function getAssetsLiabilitiesOverview(
  userId,
  { reportingCurrency = DEFAULT_CURRENCY, staleThresholdDays = 90 } = {}
) {
  await connectDB();
  const rep = (reportingCurrency || DEFAULT_CURRENCY).toUpperCase();
  const now = new Date();
  const DAY_MS = 24 * 60 * 60 * 1000;
  const staleCutoff = new Date(now.getTime() - staleThresholdDays * DAY_MS);

  // Fetch all related entities in parallel
  const [
    assets,
    liabilities,
    accounts,
    holdings,
    rateDocs,
    recentPayments,
    recentValuations,
  ] = await Promise.all([
    Asset.find({ ownerId: userId, status: "active" }).sort({ createdAt: -1 }).lean(),
    Liability.find({ ownerId: userId, status: "active" }).sort({ createdAt: -1 }).lean(),
    Account.find({ ownerId: userId, status: "active" }).lean(),
    InvestmentHolding.find({ ownerId: userId, status: "active" }).lean(),
    ExchangeRate.find({ ownerId: userId }).lean(),
    LiabilityPayment.find({ ownerId: userId })
      .sort({ paymentDate: -1, createdAt: -1 })
      .limit(6)
      .populate("liabilityId", "name category lender")
      .lean(),
    AssetValuation.find({ ownerId: userId })
      .sort({ asOf: -1, createdAt: -1 })
      .limit(6)
      .populate("assetId", "name category")
      .lean(),
  ]);

  const rates = rateDocs.map((r) => ({
    from: r.from,
    to: r.to,
    rate: r.rate?.toString(),
    asOf: r.asOf,
  }));

  // 1. Process Physical & Recorded Assets
  let physicalAssetsTotal = ZERO;
  let unvaluedAssetCount = 0;
  const staleAssets = [];
  const assetCategoryBuckets = new Map();

  const enrichedAssets = assets.map((a) => {
    const rawVal = a.currentValue?.amount ? new Decimal(a.currentValue.amount.toString()) : null;
    const ownPct = a.ownershipPercentage != null ? new Decimal(a.ownershipPercentage.toString()) : new Decimal(100);
    const asOf = a.currentValue?.asOf ? new Date(a.currentValue.asOf) : null;

    let attributable = null;
    let converted = null;
    let isStale = false;
    let daysSince = null;

    if (rawVal !== null) {
      attributable = rawVal.times(ownPct.dividedBy(100));
      const conv = convertToReporting(attributable, a.currency || rep, rates, rep, asOf || now);
      if (conv.converted) {
        converted = new Decimal(conv.converted);
        physicalAssetsTotal = physicalAssetsTotal.plus(converted);

        // Bucket by category
        const cat = a.category || "other";
        const current = assetCategoryBuckets.get(cat) || { total: ZERO, count: 0 };
        assetCategoryBuckets.set(cat, {
          total: current.total.plus(converted),
          count: current.count + 1,
        });
      }
    } else {
      unvaluedAssetCount += 1;
    }

    if (asOf) {
      daysSince = Math.floor((now.getTime() - asOf.getTime()) / DAY_MS);
      if (asOf < staleCutoff) {
        isStale = true;
        staleAssets.push({
          id: a._id.toString(),
          name: a.name,
          category: a.category,
          daysSince,
          currentValue: converted ? converted.toFixed(2) : rawVal ? rawVal.toFixed(2) : "0",
          currency: a.currency || rep,
        });
      }
    } else {
      isStale = true;
    }

    return {
      id: a._id.toString(),
      name: a.name,
      category: a.category,
      categoryLabel: ASSET_CATEGORY_LABELS[a.category] || a.category,
      ownershipType: a.ownershipType || "sole",
      ownershipPercentage: ownPct.toNumber(),
      currency: a.currency || rep,
      originalValue: rawVal ? rawVal.toFixed(2) : null,
      attributableValue: attributable ? attributable.toFixed(2) : null,
      convertedValue: converted ? converted.toFixed(2) : null,
      valuationMethod: a.valuationMethod || "owner_estimate",
      asOf,
      daysSinceValuation: daysSince,
      isStale,
    };
  });

  // 2. Process Cash & Bank Accounts (Liquid Assets)
  let cashEquivalentsTotal = ZERO;
  for (const acc of accounts) {
    if (acc.balance) {
      const bal = new Decimal(acc.balance.toString());
      const conv = convertToReporting(bal, acc.currency || rep, rates, rep, now);
      if (conv.converted) {
        const val = new Decimal(conv.converted);
        cashEquivalentsTotal = cashEquivalentsTotal.plus(val);

        const current = assetCategoryBuckets.get("cash") || { total: ZERO, count: 0 };
        assetCategoryBuckets.set("cash", {
          total: current.total.plus(val),
          count: current.count + 1,
        });
      }
    }
  }

  // 3. Process Investment Holdings (Semi-Liquid Assets)
  let investmentAssetsTotal = ZERO;
  for (const h of holdings) {
    const units = h.units ? h.units.toString() : null;
    const price = h.currentPrice?.price ? h.currentPrice.price.toString() : null;
    const mv = holdingMarketValue({ units, price });
    if (mv) {
      const conv = convertToReporting(mv, h.currency || rep, rates, rep, now);
      if (conv.converted) {
        const val = new Decimal(conv.converted);
        investmentAssetsTotal = investmentAssetsTotal.plus(val);

        const cat = h.type === "listed_equity" ? "listed_equity" : h.type === "bond" ? "bond" : "other";
        const current = assetCategoryBuckets.get(cat) || { total: ZERO, count: 0 };
        assetCategoryBuckets.set(cat, {
          total: current.total.plus(val),
          count: current.count + 1,
        });
      }
    }
  }

  // Combined Total Assets
  const totalAssets = physicalAssetsTotal.plus(cashEquivalentsTotal).plus(investmentAssetsTotal);

  // Asset Allocation array with percentages
  const assetAllocation = [];
  assetCategoryBuckets.forEach((val, catKey) => {
    const pct = totalAssets.isZero() ? 0 : val.total.dividedBy(totalAssets).times(100).toNumber();
    assetAllocation.push({
      category: catKey,
      label: ASSET_CATEGORY_LABELS[catKey] || catKey,
      amount: val.total.toFixed(2),
      percentage: Number(pct.toFixed(1)),
      itemCount: val.count,
    });
  });
  assetAllocation.sort((a, b) => Number(b.amount) - Number(a.amount));

  // Liquidity breakdown
  const liquidityBreakdown = [
    {
      type: "liquid",
      label: "Cash & Equivalents",
      amount: cashEquivalentsTotal.toFixed(2),
      percentage: totalAssets.isZero()
        ? 0
        : Number(cashEquivalentsTotal.dividedBy(totalAssets).times(100).toFixed(1)),
    },
    {
      type: "semi_liquid",
      label: "Investment Assets",
      amount: investmentAssetsTotal.toFixed(2),
      percentage: totalAssets.isZero()
        ? 0
        : Number(investmentAssetsTotal.dividedBy(totalAssets).times(100).toFixed(1)),
    },
    {
      type: "illiquid",
      label: "Physical & Fixed Assets",
      amount: physicalAssetsTotal.toFixed(2),
      percentage: totalAssets.isZero()
        ? 0
        : Number(physicalAssetsTotal.dividedBy(totalAssets).times(100).toFixed(1)),
    },
  ];

  // 4. Process Liabilities
  let totalLiabilities = ZERO;
  let securedDebtTotal = ZERO;
  let unsecuredDebtTotal = ZERO;
  const debtCategoryBuckets = new Map();
  const highInterestLiabilities = [];
  const upcomingMaturityLiabilities = [];

  const enrichedLiabilities = liabilities.map((l) => {
    const rawBal = l.currentBalance?.amount ? new Decimal(l.currentBalance.amount.toString()) : ZERO;
    const rateVal = l.interestRate ? new Decimal(l.interestRate.toString()) : null;
    const asOf = l.currentBalance?.asOf ? new Date(l.currentBalance.asOf) : null;
    const maturity = l.maturityDate ? new Date(l.maturityDate) : null;
    const isSecured = Boolean(l.secured || l.linkedAssetId);

    const conv = convertToReporting(rawBal, l.currency || rep, rates, rep, asOf || now);
    const converted = conv.converted ? new Decimal(conv.converted) : ZERO;

    totalLiabilities = totalLiabilities.plus(converted);

    if (isSecured) {
      securedDebtTotal = securedDebtTotal.plus(converted);
    } else {
      unsecuredDebtTotal = unsecuredDebtTotal.plus(converted);
    }

    const cat = l.category || "other";
    const current = debtCategoryBuckets.get(cat) || {
      total: ZERO,
      count: 0,
      rates: [],
    };
    if (rateVal) current.rates.push(rateVal.toNumber());
    debtCategoryBuckets.set(cat, {
      total: current.total.plus(converted),
      count: current.count + 1,
      rates: current.rates,
    });

    if (rateVal && rateVal.greaterThanOrEqualTo(15)) {
      highInterestLiabilities.push({
        id: l._id.toString(),
        name: l.name,
        interestRate: rateVal.toFixed(2),
        currentBalance: converted.toFixed(2),
        currency: rep,
        lender: l.lender,
      });
    }

    if (maturity) {
      const daysUntil = Math.ceil((maturity.getTime() - now.getTime()) / DAY_MS);
      if (daysUntil > 0 && daysUntil <= 60) {
        upcomingMaturityLiabilities.push({
          id: l._id.toString(),
          name: l.name,
          daysUntil,
          maturityDate: maturity,
          currentBalance: converted.toFixed(2),
          currency: rep,
        });
      }
    }

    return {
      id: l._id.toString(),
      name: l.name,
      category: l.category,
      categoryLabel: LIABILITY_CATEGORY_LABELS[l.category] || l.category,
      lender: l.lender,
      isSecured,
      interestRate: rateVal ? rateVal.toFixed(2) : null,
      interestType: l.interestType || "fixed",
      repaymentFrequency: l.repaymentFrequency || "monthly",
      minimumRepayment: l.minimumRepayment ? l.minimumRepayment.toString() : null,
      currentBalance: converted.toFixed(2),
      currency: rep,
      maturityDate: maturity,
      linkedAssetId: l.linkedAssetId ? l.linkedAssetId.toString() : null,
    };
  });

  // Debt Allocation array
  const debtAllocation = [];
  debtCategoryBuckets.forEach((val, catKey) => {
    const pct = totalLiabilities.isZero()
      ? 0
      : val.total.dividedBy(totalLiabilities).times(100).toNumber();
    const avgRate = val.rates.length
      ? (val.rates.reduce((a, b) => a + b, 0) / val.rates.length).toFixed(1)
      : null;

    debtAllocation.push({
      category: catKey,
      label: LIABILITY_CATEGORY_LABELS[catKey] || catKey,
      amount: val.total.toFixed(2),
      percentage: Number(pct.toFixed(1)),
      itemCount: val.count,
      averageInterestRate: avgRate,
    });
  });
  debtAllocation.sort((a, b) => Number(b.amount) - Number(a.amount));

  // 5. Net Position & Ratios
  const netWorth = totalAssets.minus(totalLiabilities);
  const debtToAssetRatio = totalAssets.isZero()
    ? 0
    : Number(totalLiabilities.dividedBy(totalAssets).times(100).toFixed(1));

  // 6. Recent Activity
  const activityList = [];
  recentPayments.forEach((p) => {
    activityList.push({
      type: "repayment",
      id: p._id.toString(),
      date: p.paymentDate,
      title: `Repayment: ${p.liabilityId?.name || "Loan"}`,
      subtitle: `Principal ${rep} ${Number(p.principalAmount || 0).toLocaleString()} · Interest ${rep} ${Number(p.interestAmount || 0).toLocaleString()}`,
      amount: p.totalAmount ? p.totalAmount.toString() : "0",
      currency: p.currency || rep,
      isNegative: false,
    });
  });

  recentValuations.forEach((v) => {
    activityList.push({
      type: "valuation",
      id: v._id.toString(),
      date: v.asOf,
      title: `Valuation: ${v.assetId?.name || "Asset"}`,
      subtitle: `Method: ${v.method || "Owner Estimate"} (${v.confidence || "Recorded"})`,
      amount: v.amount ? v.amount.toString() : "0",
      currency: v.currency || rep,
      isNegative: false,
    });
  });

  activityList.sort((a, b) => new Date(b.date) - new Date(a.date));

  return {
    asOf: now.toISOString(),
    reportingCurrency: rep,
    summary: {
      totalAssets: totalAssets.toFixed(2),
      totalLiabilities: totalLiabilities.toFixed(2),
      netWorth: netWorth.toFixed(2),
      debtToAssetRatio,
      cashEquivalentsTotal: cashEquivalentsTotal.toFixed(2),
      investmentAssetsTotal: investmentAssetsTotal.toFixed(2),
      physicalAssetsTotal: physicalAssetsTotal.toFixed(2),
      securedDebtTotal: securedDebtTotal.toFixed(2),
      unsecuredDebtTotal: unsecuredDebtTotal.toFixed(2),
      assetCount: assets.length,
      liabilityCount: liabilities.length,
      unvaluedAssetCount,
      staleAssetCount: staleAssets.length,
    },
    liquidityBreakdown,
    assetAllocation,
    debtAllocation,
    attention: {
      staleAssets,
      highInterestLiabilities,
      upcomingMaturityLiabilities,
      unvaluedAssetCount,
    },
    recentActivity: activityList.slice(0, 8),
    assets: enrichedAssets,
    liabilities: enrichedLiabilities,
  };
}
