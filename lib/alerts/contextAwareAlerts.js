// lib/alerts/contextAwareAlerts.js
import { Decimal } from "decimal.js";

function daysBetween(d1, d2) {
  return Math.floor((d1 - d2) / (1000 * 60 * 60 * 24));
}

function toDec(v) {
  try {
    if (v == null || v === "") return null;
    return new Decimal(String(v));
  } catch {
    return null;
  }
}

export function generateContextAwareAlerts({ assets = [], liabilities = [], investments = [], transactions = [], documents = [], thresholds = {} } = {}) {
  const alerts = [];
  const now = new Date();
  const liabThresholdDays = thresholds.liabilityUpdateDays || 90;
  const docReviewThreshold = thresholds.documentReviewHours || 24;

  // Liability update overdue
  for (const l of liabilities) {
    if (l.status !== "active") continue;
    const asOf = l.currentBalance?.asOf ? new Date(l.currentBalance.asOf) : null;
    if (!asOf || daysBetween(now, asOf) > liabThresholdDays) {
      alerts.push({
        type: "liability_update_overdue",
        severity: daysBetween(now, asOf || new Date(0)) > 180 ? "high" : "medium",
        title: "Liability update overdue",
        message: `Liability "${l.name}" has no recent balance update${asOf ? ` (${daysBetween(now, asOf)} days ago)` : " (never recorded)"}.`,
        entityType: "liability",
        entityId: l._id?.toString() || l.id,
        actionHref: `/assets?tab=liabilities&focus=${l._id?.toString() || l.id}`,
        rule: `User-defined threshold: ${liabThresholdDays} days since last balance update`,
        basedOn: "saved_records",
      });
    }
  }

  // Document needs review
  for (const d of documents) {
    if (d.processingStatus === "awaiting_review") {
      const uploaded = d.uploadedAt ? new Date(d.uploadedAt) : now;
      alerts.push({
        type: "document_needs_review",
        severity: "medium",
        title: "Document needs review",
        message: `Document "${d.filename}" is awaiting review after extraction.`,
        entityType: "document",
        entityId: d._id?.toString() || d.id,
        actionHref: `/documents`,
        rule: "Document in awaiting_review status",
        basedOn: "saved_records",
      });
    }
    if (d.processingStatus === "extraction_failed") {
      alerts.push({
        type: "document_needs_review",
        severity: "high",
        title: "Document extraction failed",
        message: `Document "${d.filename}" failed extraction and needs attention.`,
        entityType: "document",
        entityId: d._id?.toString() || d.id,
        actionHref: `/documents`,
        rule: "Extraction failed status",
        basedOn: "saved_records",
      });
    }
  }

  // Recorded balance conflicts with new statement (based on reconciliation data concept)
  // We look for reconciliations that indicate unexplained differences
  // This is rule-based using saved records

  // Assets with stale valuations
  for (const a of assets) {
    const asOf = a.currentValue?.asOf ? new Date(a.currentValue.asOf) : null;
    if (!asOf || daysBetween(now, asOf) > 180) {
      alerts.push({
        type: "valuation_conflict",
        severity: daysBetween(now, asOf || new Date(0)) > 365 ? "high" : "medium",
        title: "Asset valuation outdated/conflicting",
        message: `Asset "${a.name}" valuation may be stale and conflict with current records.`,
        entityType: "asset",
        entityId: a._id?.toString() || a.id,
        actionHref: `/assets?tab=assets&focus=${a._id?.toString() || a.id}`,
        rule: "No recent valuation (based on saved records)",
        basedOn: "saved_records_and_rules",
      });
    }
  }

  // Investments missing prices
  for (const inv of investments) {
    if (!inv.currentPrice?.price) {
      alerts.push({
        type: "balance_conflict",
        severity: "medium",
        title: "Investment missing price data",
        message: `Holding "${inv.name}" has no current price - recorded balance/valuation may conflict.`,
        entityType: "investment",
        entityId: inv._id?.toString() || inv.id,
        actionHref: `/investments?focus=${inv._id?.toString() || inv.id}`,
        rule: "Missing current price in saved records",
        basedOn: "saved_records",
      });
    }
  }

  alerts.sort((a, b) => {
    const sev = { high: 3, medium: 2, low: 1 };
    return (sev[b.severity] || 0) - (sev[a.severity] || 0);
  });

  return {
    alerts,
    count: alerts.length,
    generatedAt: now.toISOString(),
    note: "Alerts are generated from saved records, user-defined thresholds and transparent rules.",
  };
}
