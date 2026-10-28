// lib/command-centre/evaluator.js
// Evaluator service that loads DB records, executes runMonitoring,
// updates persistent FinancialAlert documents (with stable deduplication and auto-resolution),
// and creates an audit MonitoringRun record.

import mongoose from "mongoose";
import { connectDB } from "@/lib/db/mongoose";
import Asset from "@/lib/db/models/Asset";
import Liability from "@/lib/db/models/Liability";
import InvestmentHolding from "@/lib/db/models/InvestmentHolding";
import Transaction from "@/lib/db/models/Transaction";
import Document from "@/lib/db/models/Document";
import FinancialAlert from "@/lib/db/models/FinancialAlert";
import CommandCentreRule from "@/lib/db/models/CommandCentreRule";
import MonitoringRun from "@/lib/db/models/MonitoringRun";
import { getUserSettings } from "@/lib/settings/server";
import { runMonitoring } from "./engine";
import { DEFAULT_RULES, SEVERITY_LEVELS } from "./constants";

export async function evaluateCommandCentre(userId, { clientInvoices = [], trigger = "manual" } = {}) {
  await connectDB();
  const startTime = Date.now();
  const now = new Date();

  // 1. Fetch user data in parallel
  const [
    assets,
    liabilities,
    investments,
    transactions,
    documents,
    userRules,
    settingsData,
    existingAlerts,
  ] = await Promise.all([
    Asset.find({ ownerId: userId }).lean(),
    Liability.find({ ownerId: userId }).lean(),
    InvestmentHolding.find({ ownerId: userId }).lean(),
    Transaction.find({ ownerId: userId }).sort({ date: -1 }).limit(1000).lean(),
    Document.find({ ownerId: userId }).sort({ uploadedAt: -1 }).limit(500).lean(),
    CommandCentreRule.find({ ownerId: userId }).lean(),
    getUserSettings(userId),
    FinancialAlert.find({ ownerId: userId }).lean(),
  ]);

  // Build rule overrides map
  const ruleOverrides = {};
  for (const r of userRules) {
    ruleOverrides[r.ruleKey] = {
      enabled: r.enabled,
      severity: r.severity,
      thresholds: r.thresholds,
    };
  }

  // 2. Run monitoring engine
  const monitoringResult = runMonitoring({
    assets,
    liabilities,
    investments,
    transactions,
    documents,
    invoices: clientInvoices || [],
    userSettings: settingsData?.settings?.financial || {},
    ruleOverrides,
    now,
  });

  const generatedAlerts = monitoringResult.alerts;
  const generatedDedupeKeys = new Set(generatedAlerts.map((a) => a.dedupeKey));

  // Map existing alerts by dedupeKey
  const existingMap = new Map();
  for (const alert of existingAlerts) {
    existingMap.set(alert.dedupeKey, alert);
  }

  // 3. Upsert generated alerts into database
  const finalAlerts = [];
  let newAlertsCount = 0;

  for (const gen of generatedAlerts) {
    const existing = existingMap.get(gen.dedupeKey);
    let nextStatus = "open";
    let snoozedUntil = null;
    let dismissedAt = null;
    let dismissReason = null;

    if (existing) {
      if (existing.status === "snoozed") {
        if (existing.snoozedUntil && new Date(existing.snoozedUntil) > now) {
          nextStatus = "snoozed";
          snoozedUntil = existing.snoozedUntil;
        } else {
          // Snooze expired
          nextStatus = "open";
        }
      } else if (existing.status === "dismissed") {
        // If alert escalated to critical, re-open
        if (gen.severity === SEVERITY_LEVELS.CRITICAL && existing.severity !== SEVERITY_LEVELS.CRITICAL) {
          nextStatus = "open";
        } else {
          nextStatus = "dismissed";
          dismissedAt = existing.dismissedAt;
          dismissReason = existing.dismissReason;
        }
      } else if (existing.status === "in_progress") {
        nextStatus = "in_progress";
      }
    } else {
      newAlertsCount++;
    }

    const payload = {
      ownerId: userId,
      ruleKey: gen.ruleKey,
      dedupeKey: gen.dedupeKey,
      category: gen.category,
      severity: gen.severity,
      title: gen.title,
      summary: gen.summary,
      whyItAppeared: gen.whyItAppeared,
      uncertainties: gen.uncertainties || "",
      recommendations: gen.recommendations || [],
      metrics: gen.metrics || {},
      affectedRecords: gen.affectedRecords || [],
      status: nextStatus,
      snoozedUntil,
      dismissedAt,
      dismissReason,
      actionLabel: gen.actionLabel,
      actionHref: gen.actionHref,
      estimatedImpact: gen.estimatedImpact,
      currency: gen.currency,
      deadline: gen.deadline,
      lastEvaluatedAt: now,
    };

    const doc = await FinancialAlert.findOneAndUpdate(
      { ownerId: userId, dedupeKey: gen.dedupeKey },
      { $set: payload },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    ).lean();

    finalAlerts.push({
      ...doc,
      id: doc._id.toString(),
    });
  }

  // 4. Auto-resolve existing open/in_progress alerts whose condition is no longer present
  let autoResolvedCount = 0;
  for (const existing of existingAlerts) {
    if (
      (existing.status === "open" || existing.status === "in_progress" || existing.status === "snoozed") &&
      !generatedDedupeKeys.has(existing.dedupeKey)
    ) {
      await FinancialAlert.updateOne(
        { _id: existing._id },
        {
          $set: {
            status: "resolved",
            resolvedBy: "auto",
            resolvedAt: now,
            lastEvaluatedAt: now,
          },
        }
      );
      autoResolvedCount++;
    }
  }

  const durationMs = Date.now() - startTime;

  // 5. Create audit monitoring run entry
  await MonitoringRun.create({
    ownerId: userId,
    runAt: now,
    durationMs,
    trigger,
    counts: {
      critical: monitoringResult.healthOverview.counts.critical,
      high: monitoringResult.healthOverview.counts.high,
      medium: monitoringResult.healthOverview.counts.medium,
      low: monitoringResult.healthOverview.counts.low,
      totalActive: finalAlerts.filter((a) => a.status === "open" || a.status === "in_progress").length,
      autoResolved: autoResolvedCount,
      newAlerts: newAlertsCount,
    },
    healthOverview: monitoringResult.healthOverview,
    status: "success",
    note: `Evaluated ${assets.length} assets, ${liabilities.length} liabilities, ${investments.length} holdings, ${clientInvoices.length} invoices.`,
  });

  return {
    healthOverview: monitoringResult.healthOverview,
    alerts: finalAlerts,
    priorityQueue: monitoringResult.priorityQueue.map((item) => {
      const dbMatch = finalAlerts.find((a) => a.dedupeKey === item.alertDedupeKey);
      return {
        ...item,
        alertId: dbMatch?.id || null,
        status: dbMatch?.status || item.status,
      };
    }),
    dataQuality: monitoringResult.dataQuality,
    evaluatedAt: now.toISOString(),
    durationMs,
    counts: {
      activeAlerts: finalAlerts.filter((a) => a.status === "open" || a.status === "in_progress").length,
      autoResolved: autoResolvedCount,
      newAlerts: newAlertsCount,
    },
  };
}
