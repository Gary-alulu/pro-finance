// app/api/command-centre/route.js
// GET: Returns current Command Centre state (health overview, categorized alerts, priority queue, data quality).
// POST: Triggers a fresh evaluation across all active records.

import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db/mongoose";
import FinancialAlert from "@/lib/db/models/FinancialAlert";
import CommandCentreRule from "@/lib/db/models/CommandCentreRule";
import MonitoringRun from "@/lib/db/models/MonitoringRun";
import { requireUserId, withErrorHandling } from "@/lib/auth/session";
import { evaluateCommandCentre } from "@/lib/command-centre/evaluator";
import { DEFAULT_RULES } from "@/lib/command-centre/constants";

async function getHandler(request) {
  const userId = await requireUserId();
  await connectDB();

  const { searchParams } = new URL(request.url);
  const statusFilter = searchParams.get("status") || "active"; // active = open + in_progress
  const categoryFilter = searchParams.get("category");
  const forceEvaluate = searchParams.get("evaluate") === "true";

  // If force evaluation is requested or no alerts exist yet, evaluate immediately
  const existingAlertCount = await FinancialAlert.countDocuments({ ownerId: userId });
  if (forceEvaluate || existingAlertCount === 0) {
    const result = await evaluateCommandCentre(userId, { trigger: "on_load" });
    return NextResponse.json(result);
  }

  // Otherwise return existing state quickly without full recalculation
  const query = { ownerId: userId };
  if (statusFilter === "active") {
    query.status = { $in: ["open", "in_progress"] };
  } else if (statusFilter !== "all") {
    query.status = statusFilter;
  }
  if (categoryFilter && categoryFilter !== "all") {
    query.category = categoryFilter;
  }

  const [alerts, latestRun, userRules] = await Promise.all([
    FinancialAlert.find(query).sort({ severity: 1, lastEvaluatedAt: -1 }).lean(),
    MonitoringRun.findOne({ ownerId: userId }).sort({ runAt: -1 }).lean(),
    CommandCentreRule.find({ ownerId: userId }).lean(),
  ]);

  const activeAlerts = alerts.map((a) => ({
    ...a,
    id: a._id.toString(),
  }));

  const healthOverview = latestRun?.healthOverview || {
    netWorth: "0.00",
    totalAssets: "0.00",
    totalLiabilities: "0.00",
    availableCash: "0.00",
    upcomingObligations30d: "0.00",
    overdueReceivables: "0.00",
    portfolioExposure: null,
    recordFreshnessPct: 100,
    currency: "KES",
    counts: {
      totalAlerts: activeAlerts.length,
      critical: activeAlerts.filter((a) => a.severity === "critical").length,
      high: activeAlerts.filter((a) => a.severity === "high").length,
      medium: activeAlerts.filter((a) => a.severity === "medium").length,
      low: activeAlerts.filter((a) => a.severity === "low").length,
    },
  };

  const priorityQueue = activeAlerts.map((alert, idx) => ({
    id: `action-${alert.dedupeKey}`,
    alertId: alert.id,
    alertDedupeKey: alert.dedupeKey,
    priority: alert.severity,
    title: alert.actionLabel || alert.title,
    reason: alert.summary,
    estimatedImpact: alert.estimatedImpact || null,
    currency: alert.currency || "KES",
    deadline: alert.deadline || null,
    actionHref: alert.actionHref,
    category: alert.category,
    affectedRecords: alert.affectedRecords || [],
    status: alert.status,
    order: idx + 1,
  }));

  const dataQualityIssues = activeAlerts.filter(
    (a) => a.category === "data_integrity" || a.ruleKey === "missing_asset_valuation"
  );

  return NextResponse.json({
    healthOverview,
    alerts: activeAlerts,
    priorityQueue,
    dataQuality: {
      cleanlinessScore: Math.max(10, Math.min(100, 100 - dataQualityIssues.length * 8)),
      totalIssues: dataQualityIssues.length,
      issues: dataQualityIssues.map((i) => ({
        title: i.title,
        severity: i.severity,
        actionHref: i.actionHref,
      })),
    },
    latestRun: latestRun
      ? {
          runAt: latestRun.runAt,
          durationMs: latestRun.durationMs,
          status: latestRun.status,
        }
      : null,
    evaluatedAt: latestRun?.runAt || new Date().toISOString(),
  });
}

async function postHandler(request) {
  const userId = await requireUserId();
  const body = await request.json().catch(() => ({}));
  const clientInvoices = Array.isArray(body.clientInvoices) ? body.clientInvoices : [];
  const trigger = body.trigger || "manual";

  const result = await evaluateCommandCentre(userId, { clientInvoices, trigger });
  return NextResponse.json(result);
}

export const GET = withErrorHandling(getHandler);
export const POST = withErrorHandling(postHandler);
