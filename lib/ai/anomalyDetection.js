// lib/ai/anomalyDetection.js
import { Decimal } from "decimal.js";

function daysBetween(d1, d2) {
  return Math.floor((d1 - d2) / (1000 * 60 * 60 * 24));
}

export function detectAnomalies({ assets, liabilities, investments, transactions, documents, holdings }) {
  const anomalies = [];
  const now = new Date();

  // Stale valuations
  if (assets?.length) {
    for (const asset of assets) {
      const asOf = asset.currentValue?.asOf ? new Date(asset.currentValue.asOf) : null;
      if (asOf) {
        const days = daysBetween(now, asOf);
        if (days > 180) {
          anomalies.push({
            type: "stale_valuation",
            severity: days > 365 ? "high" : "medium",
            impact: days > 365 ? "high" : "medium",
            title: "Asset valuation is outdated",
            description: `Asset "${asset.name}" was last valued ${days} days ago. Consider updating the valuation.`,
            explanation: "An outdated valuation may distort reported net worth.",
            entity: { kind: "asset", refId: asset._id?.toString() || asset.id, label: asset.name },
            evidence: [`Last valued ${days} days ago`, asset.currentValue?.asOf ? new Date(asset.currentValue.asOf).toISOString().slice(0, 10) : null].filter(Boolean),
            suggestedAction: "Update valuation with a recent report or manual entry",
            priorityScore: days > 365 ? 80 : 60,
            ruleBased: true,
          });
        }
      }
    }
  }

  // Missing supporting evidence
  if (transactions?.length) {
    for (const tx of transactions) {
      if (tx.evidenceStatus === "missing" || !tx.linkedDocumentId) {
        anomalies.push({
          type: "missing_supporting_evidence",
          severity: "medium",
          impact: "medium",
          title: "Transaction missing supporting evidence",
          description: `Transaction "${tx.description || tx.category}" has no linked document.`,
          explanation: "Transactions without supporting evidence reduce auditability.",
          entity: { kind: "transaction", refId: tx._id?.toString() || tx.id, label: tx.description || tx.category },
          evidence: ["No linked document"],
          suggestedAction: "Link a receipt/invoice/statement or upload supporting document",
          priorityScore: 50,
          ruleBased: true,
        });
      }
    }
  }

  // Duplicate documents (by filename/hash)
  if (documents?.length) {
    const byHash = new Map();
    for (const doc of documents) {
      if (doc.fileHash) {
        if (byHash.has(doc.fileHash)) {
          anomalies.push({
            type: "duplicate_document",
            severity: "medium",
            impact: "medium",
            title: "Possible duplicate document",
            description: `Document "${doc.filename}" has same hash as another uploaded document.`,
            explanation: "Duplicate documents can lead to double-counting.",
            entity: { kind: "document", refId: doc._id?.toString() || doc.id, label: doc.filename },
            relatedEntities: [{ kind: "document", refId: byHash.get(doc.fileHash), label: "Other document" }],
            evidence: ["Identical file hash"],
            suggestedAction: "Review and remove or merge duplicates",
            priorityScore: 55,
            ruleBased: true,
          });
        } else {
          byHash.set(doc.fileHash, doc._id?.toString() || doc.id);
        }
      }
    }
  }

  // Unusual amounts
  if (transactions?.length) {
    const amounts = transactions.map(t => {
      try { return new Decimal(t.amount?.toString ? t.amount.toString() : t.amount || "0"); } catch { return null; }
    }).filter(Boolean);
    if (amounts.length > 5) {
      const sum = amounts.reduce((a,b) => a.plus(b), new Decimal(0));
      const avg = sum.div(amounts.length);
      const threshold = avg.times(5);
      for (const tx of transactions) {
        try {
          const amt = new Decimal(tx.amount?.toString ? tx.amount.toString() : tx.amount || "0");
          if (amt.abs().greaterThan(threshold) && !amt.equals(0)) {
            anomalies.push({
              type: "unusual_amount",
              severity: "high",
              impact: "high",
              title: "Unusually large transaction",
              description: `Transaction "${tx.description || tx.category}" is significantly larger than average.`,
              explanation: "Large outliers warrant review for accuracy.",
              entity: { kind: "transaction", refId: tx._id?.toString() || tx.id, label: tx.description || tx.category },
              evidence: [`Amount ${amt.toString()}`, `Average ~${avg.toFixed(2)}`],
              suggestedAction: "Verify amount and supporting evidence",
              priorityScore: 75,
              ruleBased: true,
            });
          }
        } catch {}
      }
    }
  }

  // Missing prices for investments
  if (investments?.length) {
    for (const inv of investments) {
      if (!inv.currentPrice?.price || !inv.currentPrice?.asOf) {
        anomalies.push({
          type: "missing_price",
          severity: "medium",
          impact: "medium",
          title: "Investment missing current price",
          description: `Holding "${inv.name}" has no current price recorded.`,
          explanation: "Without a price, market value and gains cannot be calculated accurately.",
          entity: { kind: "investment", refId: inv._id?.toString() || inv.id, label: inv.name },
          evidence: ["No currentPrice.price or currentPrice.asOf"],
          suggestedAction: "Add a manual price with asOf date (do not use stale/historical as live)",
          priorityScore: 50,
          ruleBased: true,
        });
      } else {
        const asOf = new Date(inv.currentPrice.asOf);
        const days = daysBetween(now, asOf);
        if (days > 90) {
          anomalies.push({
            type: "stale_valuation_date",
            severity: "medium",
            impact: "medium",
            title: "Investment price is stale",
            description: `Price for "${inv.name}" was last updated ${days} days ago.`,
            explanation: "Stale prices distort unrealized gains/losses.",
            entity: { kind: "investment", refId: inv._id?.toString() || inv.id, label: inv.name },
            evidence: [`Price asOf ${asOf.toISOString().slice(0, 10)}`, `${days} days ago`],
            suggestedAction: "Update price manually; clearly mark as manual entry, not live market price",
            priorityScore: 55,
            ruleBased: true,
          });
        }
      }
    }
  }

  anomalies.sort((a, b) => (b.priorityScore || 0) - (a.priorityScore || 0));
  return anomalies;
}
