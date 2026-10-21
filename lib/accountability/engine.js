// lib/accountability/engine.js
// Pure accountability/integrity checks. No DB access — the API route fetches
// records and passes them in; tests exercise this directly.
//
// Rules the engine upholds:
// - A MISSING value is never treated as zero. "No valuation recorded" and
//   "recorded as 0.00" are different states with different findings.
// - An OVERDUE date (past) is a different state from an UPCOMING date (near).
// - Every finding has a stable key so re-scans upsert instead of duplicating,
//   and a reason + action link so the user knows why and where to fix it.

import { Decimal } from "decimal.js";

const DAY_MS = 24 * 60 * 60 * 1000;

export const SEVERITY = {
  ERROR: "error",
  WARNING: "warning",
  INFO: "info",
};

const OUTDATED_VALUATION_WARNING_DAYS = 90;
const OUTDATED_VALUATION_ERROR_DAYS = 180;
const STALE_PRICE_DAYS = 60;
const MATURITY_UPCOMING_DAYS = 30;

function daysBetween(from, to) {
  return Math.floor((to.getTime() - from.getTime()) / DAY_MS);
}

function idOf(v) {
  if (!v) return null;
  return String(v._id ?? v.id ?? v);
}

function amountOrNull(v) {
  if (v === null || v === undefined || v === "") return null;
  try {
    const d = new Decimal(v);
    return d.isFinite() ? d : null;
  } catch {
    return null;
  }
}

function finding( partial ) {
  return {
    severity: SEVERITY.INFO,
    ...partial,
    key: `${partial.type}:${partial.entityId ?? "none"}`,
  };
}

/**
 * Run all integrity checks.
 * @returns {Array} findings — stable-keyed, deduplicated, sorted error→info
 */
export function runChecks({
  assets = [],
  liabilities = [],
  investments = [],
  transactions = [],
  documents = [],
  now = new Date(),
} = {}) {
  const findings = [];
  const activeAssets = assets.filter((a) => (a.status || "active") === "active");
  const activeLiabs = liabilities.filter((l) => (l.status || "active") === "active");
  const activeInv = investments.filter((i) => (i.status || "active") === "active");

  const assetIds = new Set(activeAssets.map((a) => idOf(a._id ?? a.id)));
  const liabIds = new Set(activeLiabs.map((l) => idOf(l._id ?? l.id)));
  const invIds = new Set(activeInv.map((i) => idOf(i._id ?? i.id)));
  const docIds = new Set(documents.map((d) => idOf(d._id ?? d.id)));

  // ── Assets ────────────────────────────────────────────────────────────────
  for (const asset of activeAssets) {
    const id = idOf(asset._id ?? asset.id);
    const raw = asset.currentValue?.amount;
    const amount = amountOrNull(raw);
    const href = `/assets?tab=assets&focus=${id}`;

    if (raw === null || raw === undefined || raw === "") {
      findings.push(
        finding({
          type: "missing_valuation",
          severity: SEVERITY.ERROR,
          entityType: "asset",
          entityId: id,
          title: `No valuation recorded for ${asset.name}`,
          reason:
            "This asset has no recorded value (missing — not zero). Until a dated valuation is added it is excluded from net worth.",
          actionLabel: "Record valuation",
          actionHref: href,
          meta: { category: asset.category, valueState: "missing" },
        })
      );
    } else if (amount !== null && amount.isNegative()) {
      findings.push(
        finding({
          type: "conflicting_data",
          severity: SEVERITY.ERROR,
          entityType: "asset",
          entityId: id,
          title: `Negative value recorded for ${asset.name}`,
          reason: `Recorded value is ${raw}. Asset values should not be negative — this looks like a data entry error.`,
          actionLabel: "Correct value",
          actionHref: href,
          meta: { valueState: "negative" },
        })
      );
    } else if (!asset.currentValue?.asOf) {
      findings.push(
        finding({
          type: "outdated_valuation",
          severity: SEVERITY.WARNING,
          entityType: "asset",
          entityId: id,
          title: `Valuation date missing for ${asset.name}`,
          reason:
            "A value is recorded but has no date, so its freshness cannot be verified.",
          actionLabel: "Add valuation date",
          actionHref: href,
          meta: { valueState: "undated" },
        })
      );
    } else {
      const age = daysBetween(new Date(asset.currentValue.asOf), now);
      if (age > OUTDATED_VALUATION_ERROR_DAYS) {
        findings.push(
          finding({
            type: "outdated_valuation",
            severity: SEVERITY.ERROR,
            entityType: "asset",
            entityId: id,
            title: `Outdated valuation for ${asset.name}`,
            reason: `Last valued ${age} days ago (over ${OUTDATED_VALUATION_ERROR_DAYS} days). Net worth is being reported from stale data.`,
            actionLabel: "Update valuation",
            actionHref: href,
            meta: { days: age, valueState: "stale" },
          })
        );
      } else if (age > OUTDATED_VALUATION_WARNING_DAYS) {
        findings.push(
          finding({
            type: "outdated_valuation",
            severity: SEVERITY.WARNING,
            entityType: "asset",
            entityId: id,
            title: `Aging valuation for ${asset.name}`,
            reason: `Last valued ${age} days ago. Consider refreshing it soon.`,
            actionLabel: "Update valuation",
            actionHref: href,
            meta: { days: age, valueState: "stale" },
          })
        );
      }
    }

    // Dangling secured-liability style links are checked from the liability side.
  }

  // ── Liabilities ───────────────────────────────────────────────────────────
  for (const liab of activeLiabs) {
    const id = idOf(liab._id ?? liab.id);
    const href = `/assets?tab=liabilities&focus=${id}`;
    const raw = liab.currentBalance?.amount;
    const amount = amountOrNull(raw);

    if (raw === null || raw === undefined || raw === "") {
      findings.push(
        finding({
          type: "missing_balance",
          severity: SEVERITY.ERROR,
          entityType: "liability",
          entityId: id,
          title: `No balance recorded for ${liab.name}`,
          reason:
            "This liability has no recorded balance (missing — not zero). It is excluded from total liabilities until a balance is entered.",
          actionLabel: "Record balance",
          actionHref: href,
          meta: { valueState: "missing" },
        })
      );
    } else if (amount !== null && amount.isNegative()) {
      findings.push(
        finding({
          type: "conflicting_data",
          severity: SEVERITY.ERROR,
          entityType: "liability",
          entityId: id,
          title: `Negative balance recorded for ${liab.name}`,
          reason: `Recorded balance is ${raw}. A debt balance should not be negative — this looks like a data entry error.`,
          actionLabel: "Correct balance",
          actionHref: href,
          meta: { valueState: "negative" },
        })
      );
    }

    if (liab.linkedAssetId) {
      const linkedId = idOf(liab.linkedAssetId);
      if (!assetIds.has(linkedId)) {
        findings.push(
          finding({
            type: "conflicting_data",
            severity: SEVERITY.ERROR,
            entityType: "liability",
            entityId: id,
            title: `${liab.name} is secured against a missing asset`,
            reason: "The linked asset no longer exists or is not active, so the 'secured by' relationship is broken.",
            actionLabel: "Fix link",
            actionHref: href,
            meta: { danglingLink: { type: "asset", id: linkedId } },
          })
        );
      }
    }

    if (liab.maturityDate) {
      const maturity = new Date(liab.maturityDate);
      const daysToMaturity = -daysBetween(now, maturity); // positive = future
      if (maturity.getTime() < now.getTime()) {
        findings.push(
          finding({
            type: "liability_maturity_overdue",
            severity: SEVERITY.ERROR,
            entityType: "liability",
            entityId: id,
            title: `${liab.name} matured ${Math.abs(daysToMaturity)} days ago`,
            reason:
              "The maturity date has passed but the liability is still marked active. Settle it or extend the record.",
            actionLabel: "Review liability",
            actionHref: href,
            meta: {
              dueDate: maturity.toISOString(),
              state: "overdue",
              days: Math.abs(daysToMaturity),
            },
          })
        );
      } else if (daysToMaturity <= MATURITY_UPCOMING_DAYS) {
        findings.push(
          finding({
            type: "liability_maturity_upcoming",
            severity: SEVERITY.INFO,
            entityType: "liability",
            entityId: id,
            title: `${liab.name} matures in ${daysToMaturity} day${daysToMaturity === 1 ? "" : "s"}`,
            reason: "Upcoming obligation — plan for settlement or refinancing before the maturity date.",
            actionLabel: "Review liability",
            actionHref: href,
            meta: {
              dueDate: maturity.toISOString(),
              state: "upcoming",
              days: daysToMaturity,
            },
          })
        );
      }
    }
  }

  // ── Investments ───────────────────────────────────────────────────────────
  for (const inv of activeInv) {
    const id = idOf(inv._id ?? inv.id);
    const href = `/investments?focus=${id}`;
    const units = amountOrNull(inv.units?.toString());
    const priceRaw = inv.currentPrice?.price;
    const price = amountOrNull(priceRaw?.toString());

    if (units !== null && units.isNegative()) {
      findings.push(
        finding({
          type: "conflicting_data",
          severity: SEVERITY.ERROR,
          entityType: "investment",
          entityId: id,
          title: `Negative unit count for ${inv.name}`,
          reason: `Recorded units: ${inv.units}. Unit counts cannot be negative.`,
          actionLabel: "Correct units",
          actionHref: href,
          meta: { valueState: "negative" },
        })
      );
    } else if (units !== null && !units.isZero() && (priceRaw === null || priceRaw === undefined || priceRaw === "")) {
      findings.push(
        finding({
          type: "missing_price",
          severity: SEVERITY.ERROR,
          entityType: "investment",
          entityId: id,
          title: `No market price for ${inv.name}`,
          reason:
            `You hold ${inv.units} units but no price is recorded (missing — not zero), so this holding cannot be valued in net worth.`,
          actionLabel: "Record price",
          actionHref: href,
          meta: { valueState: "missing", units: inv.units?.toString() },
        })
      );
    } else if (price !== null && inv.currentPrice?.asOf) {
      const age = daysBetween(new Date(inv.currentPrice.asOf), now);
      if (age > STALE_PRICE_DAYS) {
        findings.push(
          finding({
            type: "stale_investment_price",
            severity: SEVERITY.WARNING,
            entityType: "investment",
            entityId: id,
            title: `Stale price for ${inv.name}`,
            reason: `Last price recorded ${age} days ago (over ${STALE_PRICE_DAYS} days).`,
            actionLabel: "Update price",
            actionHref: href,
            meta: { days: age, valueState: "stale" },
          })
        );
      }
    }
  }

  // ── Transactions ──────────────────────────────────────────────────────────
  for (const tx of transactions) {
    const id = idOf(tx._id ?? tx.id);
    const href = `/transactions?focus=${id}`;
    const label = tx.description || `Transaction on ${tx.date ? new Date(tx.date).toLocaleDateString() : "unknown date"}`;

    if (amountOrNull(tx.amount?.toString()) === null) {
      findings.push(
        finding({
          type: "missing_amount",
          severity: SEVERITY.ERROR,
          entityType: "transaction",
          entityId: id,
          title: `Amount missing: ${label}`,
          reason: "This transaction has no amount (missing — not zero). It is excluded from cash-flow totals.",
          actionLabel: "Add amount",
          actionHref: href,
          meta: { valueState: "missing" },
        })
      );
    }

    if (tx.evidenceStatus === "missing") {
      findings.push(
        finding({
          type: "missing_evidence",
          severity: SEVERITY.WARNING,
          entityType: "transaction",
          entityId: id,
          title: `No evidence for ${label}`,
          reason: "No receipt or statement is attached to this transaction. Upload supporting evidence or link a document.",
          actionLabel: "Attach evidence",
          actionHref: href,
          meta: { evidenceStatus: "missing" },
        })
      );
    } else if (tx.evidenceStatus === "pending_review") {
      findings.push(
        finding({
          type: "missing_evidence",
          severity: SEVERITY.INFO,
          entityType: "transaction",
          entityId: id,
          title: `Evidence pending review: ${label}`,
          reason: "Evidence has been suggested but not yet confirmed.",
          actionLabel: "Review evidence",
          actionHref: href,
          meta: { evidenceStatus: "pending_review" },
        })
      );
    }

    // Dangling links & currency conflicts
    const links = [
      { field: "linkedAssetId", set: assetIds, type: "asset" },
      { field: "linkedLiabilityId", set: liabIds, type: "liability" },
      { field: "linkedInvestmentId", set: invIds, type: "investment" },
      { field: "linkedDocumentId", set: docIds, type: "document" },
    ];
    for (const link of links) {
      const lid = idOf(tx[link.field]);
      if (lid && !link.set.has(lid)) {
        findings.push(
          finding({
            type: "conflicting_data",
            severity: SEVERITY.ERROR,
            entityType: "transaction",
            entityId: id,
            title: `${label} links to a missing ${link.type}`,
            reason: `The linked ${link.type} (${lid}) no longer exists. The relationship is broken.`,
            actionLabel: "Fix link",
            actionHref: href,
            meta: { danglingLink: { type: link.type, id: lid } },
          })
        );
      }
    }
  }

  // ── Documents ─────────────────────────────────────────────────────────────
  for (const doc of documents) {
    const id = idOf(doc._id ?? doc.id);
    const href = `/documents?focus=${id}`;

    if (doc.processingStatus === "awaiting_review") {
      findings.push(
        finding({
          type: "ai_pending_review",
          severity: SEVERITY.WARNING,
          entityType: "document",
          entityId: id,
          title: `Extraction awaiting review: ${doc.filename}`,
          reason:
            "AI extraction is complete but nothing is committed to your records until you approve or reject the proposal.",
          actionLabel: "Review extraction",
          actionHref: href,
          meta: { confidence: doc.extractionResult?.confidence ?? null },
        })
      );
    } else if (doc.processingStatus === "extraction_failed") {
      findings.push(
        finding({
          type: "extraction_failed",
          severity: SEVERITY.ERROR,
          entityType: "document",
          entityId: id,
          title: `Extraction failed: ${doc.filename}`,
          reason: "Automatic extraction could not process this file. Retry extraction or enter the details manually.",
          actionLabel: "Open document",
          actionHref: href,
          meta: {},
        })
      );
    }

    if (doc.duplicateOf) {
      findings.push(
        finding({
          type: "duplicate_document",
          severity: SEVERITY.INFO,
          entityType: "document",
          entityId: id,
          title: `Linked duplicate: ${doc.filename}`,
          reason: `This upload was recorded as a duplicate of document ${idOf(doc.duplicateOf)}.`,
          actionLabel: "Open document",
          actionHref: href,
          meta: { duplicateOf: idOf(doc.duplicateOf) },
        })
      );
    }
  }

  // Duplicate documents by content hash (same bytes uploaded more than once)
  const byHash = new Map();
  for (const doc of documents) {
    if (!doc.fileHash) continue;
    if (!byHash.has(doc.fileHash)) byHash.set(doc.fileHash, []);
    byHash.get(doc.fileHash).push(doc);
  }
  for (const [, group] of byHash) {
    if (group.length < 2) continue;
    const primary = group[0];
    const names = group.map(
      (d) => `${d.filename} (${d.uploadedAt ? new Date(d.uploadedAt).toLocaleDateString() : "unknown date"})`
    );
    for (const dup of group.slice(1)) {
      findings.push(
        finding({
          type: "duplicate_document",
          severity: SEVERITY.WARNING,
          entityType: "document",
          entityId: idOf(dup._id ?? dup.id),
          title: `Duplicate of ${primary.filename}`,
          reason: `Identical file content already exists (${names.join("; ")}). Delete or dismiss one copy.`,
          actionLabel: "Open document",
          actionHref: `/documents?focus=${idOf(dup._id ?? dup.id)}`,
          meta: { fileHash: dup.fileHash, duplicates: group.map((d) => idOf(d._id ?? d.id)) },
        })
      );
    }
  }

  // ── Sort: errors first, then warnings, then info ──────────────────────────
  const rank = { error: 0, warning: 1, info: 2 };
  findings.sort((a, b) => (rank[a.severity] ?? 3) - (rank[b.severity] ?? 3));

  return findings;
}

/**
 * Date-driven reminder suggestions derived from the same records.
 * Returned findings drive accountability items; these drive Reminder rows.
 */
export function suggestReminders({ liabilities = [], assets = [], now = new Date() } = {}) {
  const reminders = [];

  for (const liab of liabilities) {
    if ((liab.status || "active") !== "active" || !liab.maturityDate) continue;
    const id = idOf(liab._id ?? liab.id);
    const maturity = new Date(liab.maturityDate);
    if (maturity.getTime() < now.getTime()) continue; // overdue is an accountability error, not a reminder
    const days = daysBetween(now, maturity);
    if (days > MATURITY_UPCOMING_DAYS) continue;
    reminders.push({
      key: `liability-maturity:${id}`,
      title: `${liab.name} matures ${maturity.toISOString().slice(0, 10)}`,
      body: `Outstanding obligation in ${days} day${days === 1 ? "" : "s"}. Prepare settlement or refinancing.`,
      dueAt: maturity.toISOString(),
      priority: days <= 7 ? "high" : "normal",
      entityType: "liability",
      entityId: id,
    });
  }

  for (const asset of assets) {
    if ((asset.status || "active") !== "active") continue;
    if (!asset.currentValue?.asOf) continue;
    const id = idOf(asset._id ?? asset.id);
    const age = daysBetween(new Date(asset.currentValue.asOf), now);
    if (age <= OUTDATED_VALUATION_WARNING_DAYS) continue;
    reminders.push({
      key: `asset-valuation-review:${id}`,
      title: `Refresh valuation: ${asset.name}`,
      body: `Last valued ${age} days ago. Record a new dated valuation to keep net worth accurate.`,
      // Due a week from the scan so it lands in the near-term queue.
      dueAt: new Date(now.getTime() + 7 * DAY_MS).toISOString(),
      priority: age > OUTDATED_VALUATION_ERROR_DAYS ? "high" : "normal",
      entityType: "asset",
      entityId: id,
    });
  }

  return reminders;
}
