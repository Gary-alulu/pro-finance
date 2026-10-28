// lib/command-centre/engine.js
// Pure, deterministic monitoring engine for the Financial Command Centre & Early-Warning System.
// No direct database access — accepts records, settings, and thresholds, then produces
// health overview statistics, structured early-warning alerts, and the priority action queue.

import { Decimal } from "decimal.js";
import {
  ALERT_CATEGORIES,
  DEFAULT_RULES,
  SEVERITY_LEVELS,
  SEVERITY_ORDER,
} from "./constants.js";

const DAY_MS = 24 * 60 * 60 * 1000;

function daysBetween(from, to) {
  if (!from || !to) return 0;
  const f = from instanceof Date ? from : new Date(from);
  const t = to instanceof Date ? to : new Date(to);
  if (Number.isNaN(f.getTime()) || Number.isNaN(t.getTime())) return 0;
  return Math.floor((t.getTime() - f.getTime()) / DAY_MS);
}

function toDec(v) {
  if (v === null || v === undefined || v === "") return null;
  try {
    const d = new Decimal(String(v));
    return d.isFinite() ? d : null;
  } catch {
    return null;
  }
}

function idOf(record) {
  if (!record) return null;
  return String(record._id ?? record.id ?? "");
}

/**
 * Checks whether an asset is liquid cash (bank account, physical cash, money market).
 */
export function isLiquidCashAsset(asset) {
  if (!asset) return false;
  const cat = String(asset.category || "").toLowerCase();
  const sub = String(asset.subCategory || "").toLowerCase();
  const name = String(asset.name || "").toLowerCase();

  return (
    cat === "cash" ||
    cat === "bank_account" ||
    sub.includes("checking") ||
    sub.includes("savings") ||
    sub.includes("current") ||
    sub.includes("liquid") ||
    sub.includes("money market") ||
    name.includes("checking") ||
    name.includes("savings") ||
    name.includes("current account") ||
    name.includes("petty cash")
  );
}

/**
 * Formats a Decimal safely to a 2-decimal string.
 */
function fmtDec(dec) {
  if (!dec) return "0.00";
  return dec.toFixed(2);
}

/**
 * Main engine evaluation runner.
 */
export function runMonitoring({
  assets = [],
  liabilities = [],
  investments = [],
  transactions = [],
  documents = [],
  invoices = [],
  userSettings = {},
  ruleOverrides = {},
  now = new Date(),
} = {}) {
  const currentDate = now instanceof Date ? now : new Date(now);
  const activeAssets = assets.filter((a) => (a.status || "active") === "active");
  const activeLiabilities = liabilities.filter((l) => (l.status || "active") === "active");
  const activeInvestments = investments.filter((i) => (i.status || "active") === "active");
  const currency = userSettings.reportingCurrency || userSettings.preferredCurrency || "KES";

  // Build rule lookup with user overrides
  const rules = new Map();
  for (const r of DEFAULT_RULES) {
    const override = ruleOverrides[r.ruleKey] || {};
    rules.set(r.ruleKey, {
      ...r,
      ...override,
      thresholds: { ...(r.thresholds || {}), ...(override.thresholds || {}) },
    });
  }

  const alerts = [];

  // ──────────────────────────────────────────────────────────────────────────
  // 1. LIQUID CASH & CASH-FLOW / LIQUIDITY MONITORING
  // ──────────────────────────────────────────────────────────────────────────
  let totalLiquidCash = new Decimal(0);
  let hasMissingCashValuation = false;
  let oldestCashUpdateDays = 0;

  for (const asset of activeAssets) {
    if (!isLiquidCashAsset(asset)) continue;
    const rawVal = asset.currentValue?.amount;
    const val = toDec(rawVal);
    if (val === null) {
      hasMissingCashValuation = true;
    } else {
      totalLiquidCash = totalLiquidCash.plus(val);
    }

    const asOf = asset.currentValue?.asOf ? new Date(asset.currentValue.asOf) : null;
    if (asOf) {
      const age = daysBetween(asOf, currentDate);
      if (age > oldestCashUpdateDays) oldestCashUpdateDays = age;
    }
  }

  // Calculate upcoming 30-day obligations
  let upcomingObligations = new Decimal(0);
  const obligationDetails = [];

  for (const liability of activeLiabilities) {
    const rawBal = liability.currentBalance?.amount ?? liability.principalAmount;
    const balance = toDec(rawBal);
    if (balance === null || balance.isZero()) continue;

    const maturity = liability.maturityDate ? new Date(liability.maturityDate) : null;
    const daysToMaturity = maturity ? daysBetween(currentDate, maturity) : null;

    // Approaching maturity within 30 days
    if (daysToMaturity !== null && daysToMaturity >= 0 && daysToMaturity <= 30) {
      upcomingObligations = upcomingObligations.plus(balance);
      obligationDetails.push({
        name: liability.name,
        amount: balance.toNumber(),
        dueDate: maturity,
        days: daysToMaturity,
        type: "liability_maturity",
      });
    } else if (daysToMaturity !== null && daysToMaturity < 0) {
      // Past due maturity is an immediate critical obligation
      upcomingObligations = upcomingObligations.plus(balance);
      obligationDetails.push({
        name: liability.name,
        amount: balance.toNumber(),
        dueDate: maturity,
        days: daysToMaturity,
        type: "liability_overdue",
      });
    }
  }

  // Include supplier invoices or accounts payable due in 30 days
  for (const inv of invoices) {
    if (inv.direction === "inward" || inv.direction === "payable") {
      const bal = toDec(inv.totals?.balanceDue ?? inv.totals?.total);
      if (bal && bal.greaterThan(0)) {
        const due = inv.paymentTerms?.dueDate ? new Date(inv.paymentTerms.dueDate) : null;
        const days = due ? daysBetween(currentDate, due) : null;
        if (days === null || days <= 30) {
          upcomingObligations = upcomingObligations.plus(bal);
          obligationDetails.push({
            name: `Bill #${inv.numbering?.fullNumber || inv.id || "Invoice"}`,
            amount: bal.toNumber(),
            dueDate: due,
            days: days ?? 0,
            type: "payable_invoice",
          });
        }
      }
    }
  }

  // Check Rule: Potential Cash Shortfall
  const shortfallRule = rules.get("cash_shortfall");
  if (shortfallRule?.enabled && upcomingObligations.greaterThan(totalLiquidCash)) {
    const shortfallAmount = upcomingObligations.minus(totalLiquidCash);
    alerts.push({
      ruleKey: "cash_shortfall",
      dedupeKey: "cash_shortfall:liquidity",
      category: ALERT_CATEGORIES.CASHFLOW,
      severity: SEVERITY_LEVELS.CRITICAL,
      title: "Potential cash shortfall detected",
      summary: `Confirmed obligations due within 30 days (${currency} ${fmtDec(upcomingObligations)}) exceed your recorded liquid cash (${currency} ${fmtDec(totalLiquidCash)}).`,
      whyItAppeared:
        "Recorded payment obligations due within the 30-day monitoring window exceed your recorded available cash across bank and cash accounts. This estimate assumes all listed liabilities and bills are payable as recorded.",
      uncertainties: hasMissingCashValuation
        ? "One or more bank/cash accounts have missing valuation records, which may mean your actual cash is higher than recorded."
        : "Assumes all scheduled obligations are payable in full and no unrecorded deposits arrive.",
      recommendations: [
        "Verify your latest bank account balances and reconcile recent statements.",
        "Review upcoming loan maturities and supplier bills to confirm due dates.",
        "Check whether any overdue client invoices can be accelerated or collected.",
        "Transfer funds into your settlement account before payment deadlines.",
      ],
      metrics: {
        availableCash: fmtDec(totalLiquidCash),
        upcomingObligations: fmtDec(upcomingObligations),
        potentialShortfall: fmtDec(shortfallAmount),
        currency,
        obligationCount: obligationDetails.length,
      },
      affectedRecords: activeAssets
        .filter(isLiquidCashAsset)
        .map((a) => ({
          entityType: "asset",
          entityId: idOf(a),
          title: a.name,
          href: `/assets?tab=assets&focus=${idOf(a)}`,
        })),
      status: "open",
      actionLabel: "Review liquid balances",
      actionHref: "/assets?tab=assets",
      estimatedImpact: shortfallAmount.toNumber(),
      currency,
      deadline: obligationDetails[0]?.dueDate || null,
      lastEvaluatedAt: currentDate,
    });
  }

  // Check Rule: Stale Cash Balance
  const staleCashRule = rules.get("stale_cash_balance");
  const maxCashAge = staleCashRule?.thresholds?.maxAgeDays || 30;
  if (staleCashRule?.enabled && oldestCashUpdateDays > maxCashAge) {
    alerts.push({
      ruleKey: "stale_cash_balance",
      dedupeKey: "stale_cash_balance:accounts",
      category: ALERT_CATEGORIES.CASHFLOW,
      severity: SEVERITY_LEVELS.MEDIUM,
      title: "Cash and bank balances need verification",
      summary: `Liquid accounts have not recorded a balance confirmation in ${oldestCashUpdateDays} days.`,
      whyItAppeared: `Your liquid cash balance is the foundation for cash-flow forecasting and shortfall detection. No account valuation update was logged within the past ${maxCashAge} days.`,
      uncertainties: "Cash buffer and net worth accuracy depend on fresh bank statements.",
      recommendations: [
        "Upload your latest bank statement or enter current balances.",
        "Reconcile recent transactions to reflect real-time liquid cash.",
      ],
      metrics: {
        daysStale: oldestCashUpdateDays,
        thresholdDays: maxCashAge,
      },
      affectedRecords: activeAssets.filter(isLiquidCashAsset).map((a) => ({
        entityType: "asset",
        entityId: idOf(a),
        title: a.name,
        href: `/assets?tab=assets&focus=${idOf(a)}`,
      })),
      status: "open",
      actionLabel: "Update bank balances",
      actionHref: "/assets?tab=assets",
      currency,
      lastEvaluatedAt: currentDate,
    });
  }

  // ──────────────────────────────────────────────────────────────────────────
  // 2. INVOICES & RECEIVABLES MONITORING
  // ──────────────────────────────────────────────────────────────────────────
  let overdueReceivablesTotal = new Decimal(0);
  const overdueInvoicesList = [];

  for (const inv of invoices) {
    const isClientInvoice = inv.direction === "outward" || !inv.direction;
    const balance = toDec(inv.totals?.balanceDue ?? inv.totals?.total);
    const dueDate = inv.paymentTerms?.dueDate ? new Date(inv.paymentTerms.dueDate) : null;
    const daysUntil = dueDate ? daysBetween(currentDate, dueDate) : null;
    const invId = idOf(inv);
    const invNumber = inv.numbering?.fullNumber || inv.number || `Draft-${invId.slice(-4)}`;

    if (!isClientInvoice || !balance || balance.lessThanOrEqualTo(0)) continue;

    // Overdue rule
    const overdueRule = rules.get("invoice_overdue");
    if (overdueRule?.enabled && dueDate && daysUntil !== null && daysUntil < 0) {
      const daysOverdue = Math.abs(daysUntil);
      overdueReceivablesTotal = overdueReceivablesTotal.plus(balance);
      overdueInvoicesList.push(inv);

      alerts.push({
        ruleKey: "invoice_overdue",
        dedupeKey: `invoice_overdue:${invId}`,
        category: ALERT_CATEGORIES.INVOICES,
        severity: daysOverdue > 14 ? SEVERITY_LEVELS.HIGH : SEVERITY_LEVELS.MEDIUM,
        title: `Invoice ${invNumber} is overdue by ${daysOverdue} day${daysOverdue === 1 ? "" : "s"}`,
        summary: `Outstanding receivable of ${currency} ${fmtDec(balance)} from ${inv.recipient?.name || "Client"} has passed its payment due date.`,
        whyItAppeared: `This invoice was due on ${dueDate.toLocaleDateString(undefined, { dateStyle: "medium" })}. No full settlement transaction has been matched to this invoice record.`,
        uncertainties: "If the client paid via cash or direct deposit, the transaction may not yet be recorded or linked.",
        recommendations: [
          "Send a polite payment reminder or statement of account to the client.",
          "Check recent bank credits to verify if payment arrived under an unlinked reference.",
          "Record partial payment or write-off if the amount was adjusted.",
        ],
        metrics: {
          daysPastDue: daysOverdue,
          amount: fmtDec(balance),
          currency,
          clientName: inv.recipient?.name || "Client",
        },
        affectedRecords: [
          {
            entityType: "invoice",
            entityId: invId,
            title: `Invoice ${invNumber}`,
            href: `/invoices?focus=${invId}`,
          },
        ],
        status: "open",
        actionLabel: "View invoice",
        actionHref: `/invoices?focus=${invId}`,
        estimatedImpact: balance.toNumber(),
        currency,
        deadline: dueDate,
        lastEvaluatedAt: currentDate,
      });
    }

    // Due soon rule
    const dueSoonRule = rules.get("invoice_due_soon");
    const dueWindow = dueSoonRule?.thresholds?.daysUntilDue || 7;
    if (dueSoonRule?.enabled && dueDate && daysUntil !== null && daysUntil >= 0 && daysUntil <= dueWindow) {
      alerts.push({
        ruleKey: "invoice_due_soon",
        dedupeKey: `invoice_due_soon:${invId}`,
        category: ALERT_CATEGORIES.INVOICES,
        severity: SEVERITY_LEVELS.MEDIUM,
        title: `Invoice ${invNumber} due in ${daysUntil} day${daysUntil === 1 ? "" : "s"}`,
        summary: `Receivable of ${currency} ${fmtDec(balance)} from ${inv.recipient?.name || "Client"} is approaching its due date.`,
        whyItAppeared: `Payment is scheduled on ${dueDate.toLocaleDateString(undefined, { dateStyle: "medium" })} (within the next ${dueWindow} days).`,
        uncertainties: "Client may already have initiated a bank transfer that is in transit.",
        recommendations: [
          "Ensure payment instructions and bank details were delivered clearly.",
          "Monitor incoming deposits on the scheduled due date.",
        ],
        metrics: {
          daysUntilDue: daysUntil,
          amount: fmtDec(balance),
          currency,
          clientName: inv.recipient?.name || "Client",
        },
        affectedRecords: [
          {
            entityType: "invoice",
            entityId: invId,
            title: `Invoice ${invNumber}`,
            href: `/invoices?focus=${invId}`,
          },
        ],
        status: "open",
        actionLabel: "Open invoice",
        actionHref: `/invoices?focus=${invId}`,
        estimatedImpact: balance.toNumber(),
        currency,
        deadline: dueDate,
        lastEvaluatedAt: currentDate,
      });
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // 3. INVESTMENTS & PORTFOLIO EXPOSURE
  // ──────────────────────────────────────────────────────────────────────────
  let totalPortfolioValue = new Decimal(0);
  const holdingValues = [];

  for (const inv of activeInvestments) {
    const units = toDec(inv.units);
    const price = toDec(inv.currentPrice?.price);
    const invId = idOf(inv);

    if (units !== null && units.greaterThan(0)) {
      if (price !== null) {
        const val = units.times(price);
        totalPortfolioValue = totalPortfolioValue.plus(val);
        holdingValues.push({
          holding: inv,
          value: val,
        });

        // Price age check
        const priceAsOf = inv.currentPrice?.asOf ? new Date(inv.currentPrice.asOf) : null;
        const stalePriceRule = rules.get("stale_investment_price");
        const maxPriceAge = stalePriceRule?.thresholds?.maxAgeDays || 60;
        if (stalePriceRule?.enabled && priceAsOf) {
          const age = daysBetween(priceAsOf, currentDate);
          if (age > maxPriceAge) {
            alerts.push({
              ruleKey: "stale_investment_price",
              dedupeKey: `stale_price:${invId}`,
              category: ALERT_CATEGORIES.INVESTMENTS,
              severity: SEVERITY_LEVELS.MEDIUM,
              title: `Outdated valuation price for ${inv.name}`,
              summary: `Price of ${currency} ${fmtDec(price)} was recorded ${age} days ago.`,
              whyItAppeared: `Holding valuation has not been updated within ${maxPriceAge} days. Market fluctuations since then may affect reported net worth.`,
              uncertainties: "Actual market value may have risen or fallen since last update.",
              recommendations: [
                "Check latest closing price on the exchange and update the holding price.",
                "Upload a recent broker contract note or monthly statement.",
              ],
              metrics: { daysStale: age, recordedPrice: fmtDec(price), currency },
              affectedRecords: [
                {
                  entityType: "investment",
                  entityId: invId,
                  title: inv.name,
                  href: `/investments?focus=${invId}`,
                },
              ],
              status: "open",
              actionLabel: "Update price",
              actionHref: `/investments?focus=${invId}`,
              currency,
              lastEvaluatedAt: currentDate,
            });
          }
        }
      } else {
        // Missing investment price rule
        const missingPriceRule = rules.get("missing_investment_price");
        if (missingPriceRule?.enabled) {
          alerts.push({
            ruleKey: "missing_investment_price",
            dedupeKey: `missing_price:${invId}`,
            category: ALERT_CATEGORIES.INVESTMENTS,
            severity: SEVERITY_LEVELS.HIGH,
            title: `Missing price for ${inv.name}`,
            summary: `Holding has ${units.toString()} units recorded but no valuation price.`,
            whyItAppeared: "Market value cannot be computed without a dated price. This holding is omitted from portfolio totals.",
            uncertainties: "True portfolio valuation is incomplete until price is recorded.",
            recommendations: [
              "Record the latest market price or your purchase price per unit.",
              "Confirm units and exchange ticker.",
            ],
            metrics: { units: units.toString() },
            affectedRecords: [
              {
                entityType: "investment",
                entityId: invId,
                title: inv.name,
                href: `/investments?focus=${invId}`,
              },
            ],
            status: "open",
            actionLabel: "Record price",
            actionHref: `/investments?focus=${invId}`,
            currency,
            lastEvaluatedAt: currentDate,
          });
        }
      }
    }
  }

  // Concentration check
  const concentrationRule = rules.get("portfolio_concentration");
  const maxConcentrationPct = concentrationRule?.thresholds?.concentrationPct || 30;
  let topHolding = null;
  let topConcentrationPct = 0;

  if (concentrationRule?.enabled && totalPortfolioValue.greaterThan(0)) {
    for (const h of holdingValues) {
      const pct = h.value.dividedBy(totalPortfolioValue).times(100).toNumber();
      if (pct > topConcentrationPct) {
        topConcentrationPct = Math.round(pct * 10) / 10;
        topHolding = h.holding;
      }

      if (pct > maxConcentrationPct) {
        alerts.push({
          ruleKey: "portfolio_concentration",
          dedupeKey: `concentration:${idOf(h.holding)}`,
          category: ALERT_CATEGORIES.INVESTMENTS,
          severity: pct > 50 ? SEVERITY_LEVELS.HIGH : SEVERITY_LEVELS.MEDIUM,
          title: `High portfolio concentration in ${h.holding.name}`,
          summary: `${h.holding.name} represents ${Math.round(pct)}% of your total recorded investment portfolio.`,
          whyItAppeared: `This single position exceeds your ${maxConcentrationPct}% risk threshold (${currency} ${fmtDec(h.value)} out of ${currency} ${fmtDec(totalPortfolioValue)}).`,
          uncertainties: "Excludes private assets or properties not tracked in the investment portfolio.",
          recommendations: [
            "Review your investment thesis and asset allocation strategy.",
            "Consider rebalancing or taking partial profits into defensive assets.",
          ],
          metrics: {
            concentrationPct: Math.round(pct),
            holdingValue: fmtDec(h.value),
            totalPortfolio: fmtDec(totalPortfolioValue),
            currency,
          },
          affectedRecords: [
            {
              entityType: "investment",
              entityId: idOf(h.holding),
              title: h.holding.name,
              href: `/investments?focus=${idOf(h.holding)}`,
            },
          ],
          status: "open",
          actionLabel: "Review allocation",
          actionHref: `/investments?focus=${idOf(h.holding)}`,
          estimatedImpact: h.value.toNumber(),
          currency,
          lastEvaluatedAt: currentDate,
        });
      }
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // 4. ASSETS, LIABILITIES & VALUATION MONITORING
  // ──────────────────────────────────────────────────────────────────────────
  let freshAssetsCount = 0;
  let totalValuedAssetsCount = 0;

  for (const asset of activeAssets) {
    const rawVal = asset.currentValue?.amount;
    const val = toDec(rawVal);
    const assetId = idOf(asset);

    if (val === null) {
      const missingValRule = rules.get("missing_asset_valuation");
      if (missingValRule?.enabled) {
        alerts.push({
          ruleKey: "missing_asset_valuation",
          dedupeKey: `missing_val:${assetId}`,
          category: ALERT_CATEGORIES.ASSETS,
          severity: SEVERITY_LEVELS.HIGH,
          title: `No valuation recorded for ${asset.name}`,
          summary: `Asset has no recorded value. Until valued, it is excluded from net worth.`,
          whyItAppeared: "Active asset has no current value recorded. Missing valuation is never assumed to be zero.",
          uncertainties: "Your actual net worth may be higher than currently reported.",
          recommendations: [
            "Add a recent appraisal, purchase receipt, or estimated market value.",
            "Attach supporting title deed or proof of ownership.",
          ],
          metrics: { category: asset.category },
          affectedRecords: [
            {
              entityType: "asset",
              entityId: assetId,
              title: asset.name,
              href: `/assets?tab=assets&focus=${assetId}`,
            },
          ],
          status: "open",
          actionLabel: "Record valuation",
          actionHref: `/assets?tab=assets&focus=${assetId}`,
          currency,
          lastEvaluatedAt: currentDate,
        });
      }
    } else {
      totalValuedAssetsCount++;
      const asOf = asset.currentValue?.asOf ? new Date(asset.currentValue.asOf) : null;
      const staleValRule = rules.get("stale_asset_valuation");
      const warningDays = staleValRule?.thresholds?.warningDays || 90;
      const errorDays = staleValRule?.thresholds?.errorDays || 180;

      if (asOf) {
        const age = daysBetween(asOf, currentDate);
        if (age <= warningDays) {
          freshAssetsCount++;
        } else if (staleValRule?.enabled) {
          const isCriticalAge = age > errorDays;
          alerts.push({
            ruleKey: "stale_asset_valuation",
            dedupeKey: `stale_val:${assetId}`,
            category: ALERT_CATEGORIES.ASSETS,
            severity: isCriticalAge ? SEVERITY_LEVELS.HIGH : SEVERITY_LEVELS.MEDIUM,
            title: `Valuation for ${asset.name} is ${age} days old`,
            summary: `Last valued at ${currency} ${fmtDec(val)} on ${asOf.toLocaleDateString(undefined, { dateStyle: "medium" })}.`,
            whyItAppeared: `Valuation exceeds your ${warningDays}-day freshness threshold. Real estate, vehicles, and equipment values change over time.`,
            uncertainties: "Market value may have depreciated or appreciated since last recorded valuation.",
            recommendations: [
              "Conduct a periodic valuation review or check recent comparable sales.",
              "Update the valuation with an attached inspection or assessment report.",
            ],
            metrics: {
              daysStale: age,
              warningDays,
              recordedValue: fmtDec(val),
              currency,
            },
            affectedRecords: [
              {
                entityType: "asset",
                entityId: assetId,
                title: asset.name,
                href: `/assets?tab=assets&focus=${assetId}`,
              },
            ],
            status: "open",
            actionLabel: "Update valuation",
            actionHref: `/assets?tab=assets&focus=${assetId}`,
            estimatedImpact: val.toNumber(),
            currency,
            lastEvaluatedAt: currentDate,
          });
        }
      }
    }
  }

  // Liabilities maturity check
  for (const liability of activeLiabilities) {
    const rawBal = liability.currentBalance?.amount ?? liability.principalAmount;
    const balance = toDec(rawBal);
    const liabId = idOf(liability);
    const maturity = liability.maturityDate ? new Date(liability.maturityDate) : null;

    if (!maturity || balance === null || balance.lessThanOrEqualTo(0)) continue;
    const days = daysBetween(currentDate, maturity);

    const overdueRule = rules.get("liability_maturity_overdue");
    if (overdueRule?.enabled && days < 0) {
      alerts.push({
        ruleKey: "liability_maturity_overdue",
        dedupeKey: `liab_overdue:${liabId}`,
        category: ALERT_CATEGORIES.ASSETS,
        severity: SEVERITY_LEVELS.CRITICAL,
        title: `Maturity overdue for ${liability.name}`,
        summary: `Facility reached maturity ${Math.abs(days)} days ago with an outstanding balance of ${currency} ${fmtDec(balance)}.`,
        whyItAppeared: `The scheduled maturity date was ${maturity.toLocaleDateString(undefined, { dateStyle: "medium" })}, but the balance remains unsettled.`,
        uncertainties: "If the loan was restructured or extended, update the maturity date.",
        recommendations: [
          "Contact the lender to confirm status, settlement amount, or rollover terms.",
          "Record settlement payment if already executed.",
        ],
        metrics: {
          daysPastDue: Math.abs(days),
          balance: fmtDec(balance),
          currency,
          lender: liability.lender || "Lender",
        },
        affectedRecords: [
          {
            entityType: "liability",
            entityId: liabId,
            title: liability.name,
            href: `/assets?tab=liabilities&focus=${liabId}`,
          },
        ],
        status: "open",
        actionLabel: "Review facility",
        actionHref: `/assets?tab=liabilities&focus=${liabId}`,
        estimatedImpact: balance.toNumber(),
        currency,
        deadline: maturity,
        lastEvaluatedAt: currentDate,
      });
    } else {
      const upcomingRule = rules.get("liability_maturity_upcoming");
      const maturityWindow = upcomingRule?.thresholds?.daysUntilMaturity || 30;
      if (upcomingRule?.enabled && days >= 0 && days <= maturityWindow) {
        alerts.push({
          ruleKey: "liability_maturity_upcoming",
          dedupeKey: `liab_upcoming:${liabId}`,
          category: ALERT_CATEGORIES.ASSETS,
          severity: SEVERITY_LEVELS.HIGH,
          title: `Upcoming maturity for ${liability.name} in ${days} days`,
          summary: `Facility matures on ${maturity.toLocaleDateString(undefined, { dateStyle: "medium" })} with a remaining balance of ${currency} ${fmtDec(balance)}.`,
          whyItAppeared: `Payoff or renewal is required within ${maturityWindow} days.`,
          uncertainties: "Ensure sufficient liquid cash is available or refinancing is secured.",
          recommendations: [
            "Confirm total payoff figure including accrued interest and fees.",
            "Verify settlement funds in your primary checking account.",
          ],
          metrics: {
            daysUntilMaturity: days,
            balance: fmtDec(balance),
            currency,
            lender: liability.lender || "Lender",
          },
          affectedRecords: [
            {
              entityType: "liability",
              entityId: liabId,
              title: liability.name,
              href: `/assets?tab=liabilities&focus=${liabId}`,
            },
          ],
          status: "open",
          actionLabel: "View liability",
          actionHref: `/assets?tab=liabilities&focus=${liabId}`,
          estimatedImpact: balance.toNumber(),
          currency,
          deadline: maturity,
          lastEvaluatedAt: currentDate,
        });
      }
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // 5. DATA INTEGRITY & DOCUMENTS MONITORING
  // ──────────────────────────────────────────────────────────────────────────
  const unreviewedDocRule = rules.get("unreviewed_document");
  const failedDocRule = rules.get("extraction_failed_document");
  const dupDocRule = rules.get("duplicate_document");

  // Track document hashes for duplicates
  const hashCount = new Map();
  for (const doc of documents) {
    if (doc.fileHash) {
      hashCount.set(doc.fileHash, (hashCount.get(doc.fileHash) || 0) + 1);
    }

    const docId = idOf(doc);
    if (unreviewedDocRule?.enabled && doc.processingStatus === "awaiting_review") {
      alerts.push({
        ruleKey: "unreviewed_document",
        dedupeKey: `unreviewed_doc:${docId}`,
        category: ALERT_CATEGORIES.DATA_INTEGRITY,
        severity: SEVERITY_LEVELS.MEDIUM,
        title: `AI extraction awaiting review: ${doc.filename}`,
        summary: "Extracted financial fields require your explicit approval before updating records.",
        whyItAppeared: "Platform policy strictly forbids AI from altering official financial records without human confirmation.",
        uncertainties: "Extracted line items, tax, and totals may contain unverified figures.",
        recommendations: [
          "Open the Document Review Studio.",
          "Inspect proposed fields against the source PDF/image and approve or correct.",
        ],
        affectedRecords: [
          {
            entityType: "document",
            entityId: docId,
            title: doc.filename,
            href: `/documents`,
          },
        ],
        status: "open",
        actionLabel: "Review document",
        actionHref: `/documents`,
        currency,
        lastEvaluatedAt: currentDate,
      });
    }

    if (failedDocRule?.enabled && doc.processingStatus === "extraction_failed") {
      alerts.push({
        ruleKey: "extraction_failed_document",
        dedupeKey: `failed_doc:${docId}`,
        category: ALERT_CATEGORIES.DATA_INTEGRITY,
        severity: SEVERITY_LEVELS.HIGH,
        title: `Document processing failed: ${doc.filename}`,
        summary: "Automatic document extraction was unable to parse the file structure.",
        whyItAppeared: "The document might be password-protected, low-resolution, or unsupported.",
        uncertainties: "No financial records were created from this document.",
        recommendations: [
          "Inspect the document in the Documents module.",
          "Re-upload a clearer PDF or enter the transaction manually.",
        ],
        affectedRecords: [
          {
            entityType: "document",
            entityId: docId,
            title: doc.filename,
            href: `/documents`,
          },
        ],
        status: "open",
        actionLabel: "Inspect document",
        actionHref: `/documents`,
        currency,
        lastEvaluatedAt: currentDate,
      });
    }
  }

  // Duplicate documents alert
  if (dupDocRule?.enabled) {
    for (const [hash, count] of hashCount.entries()) {
      if (count > 1) {
        const matchingDocs = documents.filter((d) => d.fileHash === hash);
        alerts.push({
          ruleKey: "duplicate_document",
          dedupeKey: `dup_doc:${hash.slice(0, 16)}`,
          category: ALERT_CATEGORIES.DATA_INTEGRITY,
          severity: SEVERITY_LEVELS.MEDIUM,
          title: `Duplicate files detected (${count} copies)`,
          summary: `File "${matchingDocs[0]?.filename}" was uploaded multiple times with identical content hash.`,
          whyItAppeared: "Identical files can lead to duplicate transactions or double-counted assets.",
          uncertainties: "Duplicate files may link to conflicting accounts.",
          recommendations: [
            "Archive or delete redundant duplicate uploads.",
            "Verify that transactions were not created twice.",
          ],
          metrics: { duplicateCopies: count },
          affectedRecords: matchingDocs.map((d) => ({
            entityType: "document",
            entityId: idOf(d),
            title: d.filename,
            href: `/documents`,
          })),
          status: "open",
          actionLabel: "Clean documents",
          actionHref: `/documents`,
          currency,
          lastEvaluatedAt: currentDate,
        });
      }
    }
  }

  // Duplicate transactions check (same amount, same date, same direction within 2 days)
  const dupTxRule = rules.get("duplicate_transaction");
  if (dupTxRule?.enabled && transactions.length > 1) {
    const txMap = new Map();
    for (const tx of transactions) {
      const amt = toDec(tx.amount);
      if (!amt || amt.isZero()) continue;
      const dateStr = tx.date ? new Date(tx.date).toISOString().slice(0, 10) : "no-date";
      const key = `${tx.direction}:${amt.toFixed(2)}:${dateStr}`;
      const list = txMap.get(key) || [];
      list.push(tx);
      txMap.set(key, list);
    }

    for (const [key, txList] of txMap.entries()) {
      if (txList.length > 1) {
        const sample = txList[0];
        const txAmount = toDec(sample.amount);
        alerts.push({
          ruleKey: "duplicate_transaction",
          dedupeKey: `dup_tx:${idOf(sample)}`,
          category: ALERT_CATEGORIES.DATA_INTEGRITY,
          severity: SEVERITY_LEVELS.HIGH,
          title: `Potential duplicate transaction: ${currency} ${fmtDec(txAmount)}`,
          summary: `${txList.length} transactions share identical amount (${currency} ${fmtDec(txAmount)}), date and direction.`,
          whyItAppeared: "Two entries recorded with the same financial amount and date indicate possible duplicate logging or double-entry.",
          uncertainties: "Legitimate recurring charges (e.g. twin subscription payments) may look identical.",
          recommendations: [
            "Review transaction list to verify if this was charged twice or entered twice.",
            "Delete or void the redundant entry if duplicated.",
          ],
          metrics: { count: txList.length, amount: fmtDec(txAmount), currency },
          affectedRecords: txList.map((t) => ({
            entityType: "transaction",
            entityId: idOf(t),
            title: t.description || `Transaction ${fmtDec(txAmount)}`,
            href: `/transactions`,
          })),
          status: "open",
          actionLabel: "Review transactions",
          actionHref: `/transactions`,
          estimatedImpact: txAmount.toNumber(),
          currency,
          lastEvaluatedAt: currentDate,
        });
      }
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // 6. OVERALL FINANCIAL HEALTH SUMMARY
  // ──────────────────────────────────────────────────────────────────────────
  let totalAssetsVal = new Decimal(0);
  for (const a of activeAssets) {
    const v = toDec(a.currentValue?.amount);
    if (v) totalAssetsVal = totalAssetsVal.plus(v);
  }
  totalAssetsVal = totalAssetsVal.plus(totalPortfolioValue);

  let totalLiabVal = new Decimal(0);
  for (const l of activeLiabilities) {
    const v = toDec(l.currentBalance?.amount ?? l.principalAmount);
    if (v) totalLiabVal = totalLiabVal.plus(v);
  }

  const netWorthVal = totalAssetsVal.minus(totalLiabVal);
  const recordFreshnessPct =
    totalValuedAssetsCount > 0
      ? Math.round((freshAssetsCount / totalValuedAssetsCount) * 100)
      : 100;

  // Sort alerts by severity order (critical -> high -> medium -> low), then date/impact
  alerts.sort((a, b) => {
    const sA = SEVERITY_ORDER[a.severity] || 0;
    const sB = SEVERITY_ORDER[b.severity] || 0;
    if (sB !== sA) return sB - sA;
    const impA = a.estimatedImpact || 0;
    const impB = b.estimatedImpact || 0;
    return impB - impA;
  });

  // Calculate severity breakdown
  let criticalCount = 0;
  let highCount = 0;
  let mediumCount = 0;
  let lowCount = 0;

  for (const a of alerts) {
    if (a.severity === SEVERITY_LEVELS.CRITICAL) criticalCount++;
    else if (a.severity === SEVERITY_LEVELS.HIGH) highCount++;
    else if (a.severity === SEVERITY_LEVELS.MEDIUM) mediumCount++;
    else lowCount++;
  }

  // ──────────────────────────────────────────────────────────────────────────
  // 7. PRIORITY ACTION QUEUE DERIVATION
  // ──────────────────────────────────────────────────────────────────────────
  const priorityQueue = alerts.map((alert, idx) => ({
    id: `action-${alert.dedupeKey}`,
    alertDedupeKey: alert.dedupeKey,
    priority: alert.severity,
    title: alert.actionLabel || alert.title,
    reason: alert.summary,
    estimatedImpact: alert.estimatedImpact || null,
    currency,
    deadline: alert.deadline || null,
    actionHref: alert.actionHref,
    category: alert.category,
    affectedRecords: alert.affectedRecords || [],
    status: alert.status || "open",
    order: idx + 1,
  }));

  // ──────────────────────────────────────────────────────────────────────────
  // 8. DATA QUALITY METRICS
  // ──────────────────────────────────────────────────────────────────────────
  const dataQualityIssues = alerts.filter(
    (a) => a.category === ALERT_CATEGORIES.DATA_INTEGRITY || a.ruleKey === "missing_asset_valuation"
  );
  const cleanlinessScore = Math.max(
    10,
    Math.min(100, 100 - dataQualityIssues.length * 8)
  );

  return {
    healthOverview: {
      netWorth: fmtDec(netWorthVal),
      totalAssets: fmtDec(totalAssetsVal),
      totalLiabilities: fmtDec(totalLiabVal),
      availableCash: fmtDec(totalLiquidCash),
      upcomingObligations30d: fmtDec(upcomingObligations),
      overdueReceivables: fmtDec(overdueReceivablesTotal),
      portfolioExposure: topHolding
        ? {
            name: topHolding.name,
            concentrationPct: topConcentrationPct,
            value: fmtDec(
              topHolding.currentPrice?.price && topHolding.units
                ? toDec(topHolding.currentPrice.price).times(toDec(topHolding.units))
                : new Decimal(0)
            ),
          }
        : null,
      recordFreshnessPct,
      currency,
      counts: {
        totalAlerts: alerts.length,
        critical: criticalCount,
        high: highCount,
        medium: mediumCount,
        low: lowCount,
      },
    },
    alerts,
    priorityQueue,
    dataQuality: {
      cleanlinessScore,
      totalIssues: dataQualityIssues.length,
      issues: dataQualityIssues.map((i) => ({
        title: i.title,
        severity: i.severity,
        actionHref: i.actionHref,
      })),
    },
    generatedAt: currentDate.toISOString(),
  };
}
