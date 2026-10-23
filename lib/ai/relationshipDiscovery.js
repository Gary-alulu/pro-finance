// lib/ai/relationshipDiscovery.js
import { normalizeAmount, normalizeDate } from "./documentAnalysis.js";

export function discoverRelationships({ documents, assets, liabilities, investments, transactions, dividends }) {
  const suggestions = [];

  // Suggest documents support assets
  if (documents?.length && assets?.length) {
    for (const doc of documents) {
      if (doc.linkedAssetId) continue;
      const lowerName = (doc.filename || "").toLowerCase();
      for (const asset of assets) {
        const lowerAsset = (asset.name || "").toLowerCase();
        if (lowerName.includes("deed") || lowerName.includes("title") || lowerName.includes("valuation")) {
          if (lowerAsset && (lowerName.includes(lowerAsset.split(" ")[0]) || lowerAsset.includes(lowerName.split(/[._-]/)[0]))) {
            suggestions.push({
              type: "document_supports_asset",
              source: { kind: "document", refId: doc._id?.toString() || doc.id, label: doc.filename },
              target: { kind: "asset", refId: asset._id?.toString() || asset.id, label: asset.name },
              confidence: 0.7,
              explanation: `Document "${doc.filename}" appears to be a property/title document and may support asset "${asset.name}".`,
              evidence: [`Filename contains property-related terms`, `Asset name context matches`],
              reasons: ["filename_pattern", "asset_context"],
            });
          }
        }
      }
    }
  }

  // Loan and property connections
  if (liabilities?.length && assets?.length) {
    for (const liab of liabilities) {
      if (liab.linkedAssetId) continue;
      if (liab.category === "mortgage" || liab.category === "secured_loan" || (liab.name || "").toLowerCase().includes("mortgage")) {
        for (const asset of assets) {
          if ((asset.category === "property" || asset.category === "land") && (asset.name || "").toLowerCase() === (liab.name || "").toLowerCase().replace(/mortgage|loan/gi, "").trim()) {
            suggestions.push({
              type: "loan_property",
              source: { kind: "liability", refId: liab._id?.toString() || liab.id, label: liab.name },
              target: { kind: "asset", refId: asset._id?.toString() || asset.id, label: asset.name },
              confidence: 0.75,
              explanation: `Mortgage/liability "${liab.name}" and property asset "${asset.name}" may be linked (same name/context).`,
              evidence: ["Same/similar naming", "Loan appears secured by property"],
              reasons: ["name_match", "category_match"],
            });
          }
        }
      }
    }
  }

  // Dividend statements to investments
  if (documents?.length && investments?.length) {
    for (const doc of documents) {
      if (doc.documentType === "dividend_statement" || (doc.filename || "").toLowerCase().includes("dividend")) {
        for (const inv of investments) {
          const lowerDoc = (doc.filename || "").toLowerCase();
          const lowerInv = (inv.name || "").toLowerCase();
          const ticker = (inv.ticker || "").toLowerCase();
          if ((ticker && lowerDoc.includes(ticker)) || (lowerInv && lowerDoc.includes(lowerInv.split(" ")[0]))) {
            suggestions.push({
              type: "dividend_to_investment",
              source: { kind: "document", refId: doc._id?.toString() || doc.id, label: doc.filename },
              target: { kind: "investment", refId: inv._id?.toString() || inv.id, label: inv.name },
              confidence: 0.8,
              explanation: `Dividend statement "${doc.filename}" likely relates to investment "${inv.name}" based on ticker/name match.`,
              evidence: [`Ticker/name appears in filename`, "Dividend statement type"],
              reasons: ["ticker_match", "document_type"],
            });
          }
        }
      }
    }
  }

  // Same asset/account detection
  if (assets?.length > 1) {
    const seen = new Map();
    for (const asset of assets) {
      const key = (asset.name || "").toLowerCase().replace(/[^a-z0-9]/g, "");
      if (key && seen.has(key)) {
        suggestions.push({
          type: "same_asset_account",
          source: { kind: "asset", refId: seen.get(key), label: seen.get(key + "_label") },
          target: { kind: "asset", refId: asset._id?.toString() || asset.id, label: asset.name },
          confidence: 0.65,
          explanation: `Assets with very similar names may refer to the same asset/account - review for duplicates.`,
          evidence: ["Similar normalized names"],
          reasons: ["name_similarity"],
        });
      } else if (key) {
        seen.set(key, asset._id?.toString() || asset.id);
        seen.set(key + "_label", asset.name);
      }
    }
  }

  return suggestions;
}
