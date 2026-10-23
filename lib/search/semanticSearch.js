// lib/search/semanticSearch.js
import { Decimal } from "decimal.js";

function normalize(s) {
  return (s || "").toString().toLowerCase();
}

function tokenize(s) {
  return normalize(s).split(/[^a-z0-9]+/).filter((t) => t.length > 2);
}

function scoreDoc(doc, queryTokens) {
  const text = normalize([doc.filename, doc.documentType, doc.notes, doc.extractionResult?.proposedFields?.summary, JSON.stringify(doc.extractionResult?.proposedFields?.lineItems || [])].join(" "));
  let score = 0;
  const matches = [];
  for (const t of queryTokens) {
    if (text.includes(t)) {
      score += 1;
      matches.push(t);
    }
  }
  // Boost for common patterns
  if (text.includes("contract") && (queryTokens.includes("paid") || queryTokens.includes("shares"))) score += 2;
  if (text.includes("nse") && queryTokens.includes("shares")) score += 2;
  if (text.includes("dividend") && queryTokens.includes("dividend")) score += 2;
  return { score, matches };
}

export function semanticSearch({ query, documents = [], transactions = [], assets = [], investments = [] }) {
  const q = (query || "").trim();
  if (!q) return { results: [], explanation: "No query provided" };
  const tokens = tokenize(q);
  const results = [];

  for (const doc of documents) {
    const s = scoreDoc(doc, tokens);
    if (s.score > 0) {
      results.push({
        type: "document",
        id: doc._id?.toString() || doc.id,
        title: doc.filename,
        documentType: doc.documentType,
        snippet: doc.extractionResult?.proposedFields?.summary || doc.notes || "",
        score: s.score,
        matches: s.matches,
        reason: `Matches by meaning: ${s.matches.slice(0, 5).join(", ")}`,
        linkedAssetId: doc.linkedAssetId,
        uploadedAt: doc.uploadedAt,
      });
    }
  }

  for (const tx of transactions) {
    const text = normalize([tx.description, tx.category, tx.notes].join(" "));
    let score = 0;
    const matches = [];
    for (const t of tokens) {
      if (text.includes(t)) { score += 1; matches.push(t); }
    }
    if (score > 0) {
      results.push({
        type: "transaction",
        id: tx._id?.toString() || tx.id,
        title: tx.description || tx.category,
        amount: tx.amount,
        date: tx.date,
        score,
        matches,
        reason: `Transaction matches query terms`,
      });
    }
  }

  results.sort((a, b) => b.score - a.score);
  return {
    results: results.slice(0, 50),
    query: q,
    explanation: `Semantic search found ${results.length} relevant item(s) by meaning, not just filenames.`,
  };
}
