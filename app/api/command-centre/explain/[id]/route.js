// app/api/command-centre/explain/[id]/route.js
// Module E: Financial Insights Assistant
// Generates transparent, deterministic, and evidence-linked explanations for any alert.

import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db/mongoose";
import FinancialAlert from "@/lib/db/models/FinancialAlert";
import Asset from "@/lib/db/models/Asset";
import Liability from "@/lib/db/models/Liability";
import InvestmentHolding from "@/lib/db/models/InvestmentHolding";
import Transaction from "@/lib/db/models/Transaction";
import { requireUserId, withErrorHandling } from "@/lib/auth/session";

async function getHandler(request, { params }) {
  const userId = await requireUserId();
  await connectDB();

  const { id } = await params;
  const alert = await FinancialAlert.findOne({ _id: id, ownerId: userId }).lean();

  if (!alert) {
    return NextResponse.json({ error: "Alert not found" }, { status: 404 });
  }

  // Fetch contextual records linked to this alert
  const entityIds = (alert.affectedRecords || []).map((r) => r.entityId);
  const [assets, liabilities, investments] = await Promise.all([
    Asset.find({ _id: { $in: entityIds }, ownerId: userId }).lean(),
    Liability.find({ _id: { $in: entityIds }, ownerId: userId }).lean(),
    InvestmentHolding.find({ _id: { $in: entityIds }, ownerId: userId }).lean(),
  ]);

  // Generate deep explanation structure
  const explanation = {
    alertId: alert._id.toString(),
    title: alert.title,
    severity: alert.severity,
    category: alert.category,
    ruleKey: alert.ruleKey,
    summary: alert.summary,
    whyItAppeared: alert.whyItAppeared,
    supportingEvidence: [
      `Rule: ${alert.ruleKey.replace(/_/g, " ").toUpperCase()}`,
      `Evaluated at: ${new Date(alert.lastEvaluatedAt || alert.updatedAt).toLocaleString()}`,
      `Current Status: ${alert.status.toUpperCase()}`,
      ...(alert.metrics
        ? Object.entries(alert.metrics).map(([k, v]) => `${k.replace(/([A-Z])/g, " $1")}: ${v}`)
        : []),
    ],
    uncertainties:
      alert.uncertainties ||
      "Estimates are based on recorded balances and dates in your workspace. Unrecorded cash flows or offline accounts are not reflected.",
    simulationScenario: generateSimulation(alert),
    recommendedActionPlan: alert.recommendations || [
      "Verify the latest bank balance or statement.",
      "Review the affected records.",
      "Update valuations or settle obligations.",
    ],
    affectedRecords: alert.affectedRecords || [],
    directAction: {
      label: alert.actionLabel || "Take Action",
      href: alert.actionHref || "/overview",
    },
  };

  return NextResponse.json(explanation);
}

function generateSimulation(alert) {
  switch (alert.ruleKey) {
    case "cash_shortfall":
      return {
        scenario: "Cash Reserve Recovery Simulation",
        description:
          "If you collect 50% of your outstanding receivables or delay non-critical supplier disbursements by 14 days, your projected cash buffer will return to a positive surplus.",
        recommendation: "Prioritize client invoice follow-ups before committing fresh capital expenditures.",
      };
    case "portfolio_concentration":
      return {
        scenario: "Concentration Rebalancing Simulation",
        description:
          "Trimming this single position to 25% of total portfolio value would free capital to reallocate into diversified index or fixed income holdings without altering your target return profile.",
        recommendation: "Evaluate capital gains tax implications before placing sell orders on the exchange.",
      };
    case "stale_asset_valuation":
      return {
        scenario: "Valuation Sensitivity Analysis",
        description:
          "If current property/equipment values have depreciated by 5-10% in line with prevailing market conditions, recorded net worth would adjust accordingly. A fresh appraisal will restore baseline confidence.",
        recommendation: "Obtain an updated appraisal report or input the latest insured replacement value.",
      };
    case "invoice_overdue":
      return {
        scenario: "Receivables Collection Projection",
        description:
          "Full settlement of this invoice will immediately increase your available cash and reduce days-sales-outstanding (DSO) across your billing operations.",
        recommendation: "Issue a formal payment reminder with direct payment link attached.",
      };
    default:
      return {
        scenario: "Record Integrity Review",
        description:
          "Resolving this alert removes data ambiguity and ensures your net worth and cash-flow reports remain accurate.",
        recommendation: "Complete the suggested review step in the corresponding module.",
      };
  }
}

export const GET = withErrorHandling(getHandler);
