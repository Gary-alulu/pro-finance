// app/api/calculator/evaluate/route.js
// POST /api/calculator/evaluate
// Pure and safe financial calculation evaluation endpoint.

import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db/mongoose";
import ExchangeRate from "@/lib/db/models/ExchangeRate";
import Calculation from "@/lib/db/models/Calculation";
import { requireUserId, withErrorHandling, validationError } from "@/lib/auth/session";
import { readJsonBody } from "@/lib/security/sanitize";
import { evaluateCalculationSchema } from "@/lib/validations/schemas";
import {
  evaluateArithmeticExpression,
  calculatePercentOf,
  calculatePercentIs,
  calculatePercentageChange,
  calculatePercentageDifference,
  calculateDiscount,
  calculateMarkup,
  calculateMargin,
  calculateOwnershipShare,
  calculateTargetSavings,
  calculateSavingsAccumulation,
  calculateCompoundInterest,
  calculateLoan,
  calculateInvestment,
  calculateWeightedAverageCost,
  calculateStandaloneNetWorth,
  calculateBudget,
  calculateDepreciation,
  calculateCurrencyConversion,
  calculateInvoice,
} from "@/lib/calculator";

async function postHandler(request) {
  const userId = await requireUserId();
  const body = await readJsonBody(request);
  const parsed = evaluateCalculationSchema.safeParse(body);

  if (!parsed.success) {
    return validationError(parsed);
  }

  const { calculatorType, inputs, mode, currency } = parsed.data;
  let outputs = {};
  let assumptions = [];
  let disclosure = "";

  await connectDB();

  switch (calculatorType) {
    case "basic": {
      const expr = inputs.expression || "";
      const result = evaluateArithmeticExpression(expr);
      outputs = {
        result: result.formatted,
        rawResult: result.raw,
        expression: result.expression,
      };
      break;
    }

    case "percentage": {
      const operation = inputs.operation || "percent_of";
      if (operation === "percent_of") {
        outputs = calculatePercentOf(inputs.percentage, inputs.total);
      } else if (operation === "percent_is") {
        outputs = calculatePercentIs(inputs.part, inputs.total);
      } else if (operation === "change") {
        outputs = calculatePercentageChange(inputs.oldValue, inputs.newValue);
      } else if (operation === "difference") {
        outputs = calculatePercentageDifference(inputs.valueA, inputs.valueB);
      } else if (operation === "discount") {
        outputs = calculateDiscount(inputs.originalPrice, inputs.discountPercentage);
      } else if (operation === "markup") {
        outputs = calculateMarkup(inputs.costPrice, inputs.markupPercentage);
      } else if (operation === "margin") {
        outputs = calculateMargin(inputs.sellingPrice, inputs.costPrice);
      } else if (operation === "ownership") {
        outputs = calculateOwnershipShare(inputs.totalValue, inputs.ownershipPercentage);
      } else {
        throw new Error(`Unsupported percentage operation: ${operation}`);
      }
      break;
    }

    case "currency": {
      // Fetch platform exchange rates for user
      const storedRates = await ExchangeRate.find({ ownerId: userId }).lean();
      outputs = calculateCurrencyConversion({
        amount: inputs.amount,
        fromCurrency: inputs.fromCurrency,
        toCurrency: inputs.toCurrency || currency,
        storedRates,
        manualRate: inputs.manualRate,
        manualRateSource: inputs.manualRateSource,
        asOfDate: inputs.asOfDate,
      });
      disclosure = outputs.disclosure || "";
      break;
    }

    case "savings":
    case "goal_planner": {
      const subMode = inputs.subMode || "target"; // "target" or "accumulation"
      if (subMode === "target") {
        outputs = calculateTargetSavings({
          targetAmount: inputs.targetAmount,
          currentSavings: inputs.currentSavings || 0,
          months: inputs.months || (inputs.years ? inputs.years * 12 : 12),
          annualReturnRate: inputs.annualReturnRate || 0,
        });
      } else {
        outputs = calculateSavingsAccumulation({
          initialSavings: inputs.initialSavings || 0,
          periodicContribution: inputs.periodicContribution,
          frequency: inputs.frequency || "monthly",
          periods: inputs.periods || 12,
          annualReturnRate: inputs.annualReturnRate || 0,
        });
      }
      assumptions.push(
        Number(inputs.annualReturnRate || 0) > 0
          ? `Assumes ${inputs.annualReturnRate}% compound annual growth rate.`
          : "Assumes zero investment growth (linear contributions)."
      );
      break;
    }

    case "compound_interest": {
      outputs = calculateCompoundInterest({
        initialPrincipal: inputs.initialPrincipal,
        periodicContribution: inputs.periodicContribution,
        annualRate: inputs.annualRate,
        investmentYears: inputs.investmentYears,
        compoundFrequency: inputs.compoundFrequency,
        contributionTiming: inputs.contributionTiming,
        annualFeePercent: inputs.annualFeePercent,
      });
      assumptions.push("Hypothetical investment projection. Returns are not guaranteed.");
      break;
    }

    case "loan": {
      outputs = calculateLoan({
        principalAmount: inputs.principalAmount,
        annualInterestRate: inputs.annualInterestRate,
        termMonths: inputs.termMonths,
        repaymentFrequency: inputs.repaymentFrequency,
        extraMonthlyPayment: inputs.extraMonthlyPayment,
        originationFee: inputs.originationFee,
        monthlyAdminFee: inputs.monthlyAdminFee,
      });
      assumptions.push("Reducing balance amortization schedule based on standard actuarial formulas.");
      break;
    }

    case "investment": {
      const calcKind = inputs.calcKind || "performance";
      if (calcKind === "wac" && Array.isArray(inputs.lots)) {
        outputs = calculateWeightedAverageCost(inputs.lots);
      } else {
        outputs = calculateInvestment({
          units: inputs.units,
          purchasePrice: inputs.purchasePrice,
          currentPrice: inputs.currentPrice,
          transactionFees: inputs.transactionFees,
          dividendsReceived: inputs.dividendsReceived,
          holdingPeriodYears: inputs.holdingPeriodYears,
        });
      }
      assumptions.push("Projections exclude taxes unless explicitly entered as transaction fees.");
      break;
    }

    case "net_worth": {
      outputs = calculateStandaloneNetWorth({
        assets: inputs.assets || [],
        liabilities: inputs.liabilities || [],
        reportingCurrency: currency,
      });
      break;
    }

    case "budget": {
      outputs = calculateBudget({
        monthlyIncome: inputs.monthlyIncome,
        fixedExpenses: inputs.fixedExpenses,
        variableExpenses: inputs.variableExpenses,
        debtRepayments: inputs.debtRepayments,
        savingsContributions: inputs.savingsContributions,
        investmentContributions: inputs.investmentContributions,
      });
      break;
    }

    case "depreciation": {
      outputs = calculateDepreciation({
        acquisitionCost: inputs.acquisitionCost,
        salvageValue: inputs.salvageValue,
        usefulLifeYears: inputs.usefulLifeYears,
        method: inputs.method || "straight_line",
        startYear: inputs.startYear,
      });
      assumptions.push("Accounting depreciation estimate. Does not constitute tax advice or official appraisal.");
      break;
    }

    case "invoice": {
      outputs = calculateInvoice({
        lines: inputs.lines || [],
        invoiceDiscount: inputs.invoiceDiscount,
        payments: inputs.payments || [],
      });
      break;
    }

    default:
      throw new Error(`Unhandled calculator: ${calculatorType}`);
  }

  // Record into transient Calculation log (auto-logged history)
  let logId = null;
  try {
    const logDoc = await Calculation.create({
      ownerId: userId,
      title: inputs.title || `${calculatorType.toUpperCase()} Calculation`,
      calculatorType,
      mode: mode || "standalone",
      inputs,
      outputs,
      currency: currency || "KES",
      assumptions,
      sourceReferences: inputs.sourceReferences || [],
      status: "draft",
      isSaved: false,
    });
    logId = logDoc._id.toString();
  } catch (err) {
    // Non-blocking log failure
    console.warn("[Calculator Log Error]", err?.message);
  }

  return NextResponse.json({
    success: true,
    calculatorType,
    outputs,
    assumptions,
    disclosure,
    logId,
  });
}

export const POST = withErrorHandling(postHandler);

