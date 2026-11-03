// lib/services/dashboard/getDashboardAlerts.js
// Consumes existing FinancialAlert and AccountabilityItem records for the Command Centre preview.

import { connectDB } from "@/lib/db/mongoose";
import FinancialAlert from "@/lib/db/models/FinancialAlert";
import AccountabilityItem from "@/lib/db/models/AccountabilityItem";
import { SEVERITY_ORDER } from "@/lib/command-centre/constants";

export async function getDashboardAlerts(userId, { limit = 8 } = {}) {
  await connectDB();

  // Query open financial alerts
  const [alerts, accountability] = await Promise.all([
    FinancialAlert.find({
      ownerId: userId,
      status: { $in: ["open", "in_progress"] },
    })
      .sort({ severity: 1, createdAt: -1 })
      .limit(limit)
      .lean(),
    AccountabilityItem.find({
      ownerId: userId,
      status: "open",
    })
      .sort({ severity: 1, createdAt: -1 })
      .limit(limit)
      .lean(),
  ]);

  // Aggregate counts by severity
  const severityCounts = {
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
    total: 0,
  };

  const formattedAlerts = alerts.map((a) => {
    const sev = a.severity || "medium";
    if (severityCounts[sev] !== undefined) severityCounts[sev] += 1;
    severityCounts.total += 1;

    return {
      id: a._id.toString(),
      ruleKey: a.ruleKey,
      category: a.category,
      severity: a.severity,
      title: a.title,
      summary: a.summary,
      whyItAppeared: a.whyItAppeared,
      recommendations: a.recommendations || [],
      actionLabel: a.actionLabel || "Investigate",
      actionHref: a.actionHref || `/command-centre?focus=${a._id.toString()}`,
      affectedRecords: a.affectedRecords || [],
      estimatedImpact: a.estimatedImpact || null,
      currency: a.currency || "KES",
      status: a.status,
      deadline: a.deadline ? new Date(a.deadline).toISOString() : null,
      createdAt: a.createdAt,
      type: "financial_alert",
    };
  });

  const formattedAccountability = accountability.map((item) => {
    return {
      id: item._id.toString(),
      key: item.key,
      type: item.type,
      severity: item.severity,
      title: item.title,
      reason: item.reason,
      actionLabel: item.actionLabel || "Review",
      actionHref: item.actionHref || "/accountability",
      status: item.status,
      createdAt: item.createdAt,
      itemType: "integrity_item",
    };
  });

  return {
    alerts: formattedAlerts,
    accountabilityItems: formattedAccountability,
    counts: severityCounts,
    hasCriticalAlerts: severityCounts.critical > 0,
    hasHighAlerts: severityCounts.high > 0,
    totalRequiringAttention: severityCounts.total + formattedAccountability.length,
  };
}
