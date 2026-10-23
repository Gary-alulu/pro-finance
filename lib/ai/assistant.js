// lib/ai/assistant.js
import { Decimal } from "decimal.js";
import { formatCurrency } from "@/lib/finance/currency";

function toNum(s) {
  try {
    if (s == null) return null;
    if (typeof s === "object" && s.toString) return new Decimal(s.toString());
    return new Decimal(String(s));
  } catch {
    return null;
  }
}

export function answerQuestion({ question, user, assets, liabilities, investments, transactions, documents, snapshots }) {
  const q = (question || "").toLowerCase();
  const currency = user?.preferredCurrency || "KES";

  // Net worth
  if (q.includes("net worth")) {
    let totalAssets = new Decimal(0);
    let totalLiabs = new Decimal(0);
    if (assets?.length) {
      for (const a of assets) {
        const v = toNum(a.currentValue?.amount);
        if (v) totalAssets = totalAssets.plus(v);
      }
    }
    if (liabilities?.length) {
      for (const l of liabilities) {
        const v = toNum(l.currentBalance?.amount);
        if (v) totalLiabs = totalLiabs.plus(v);
      }
    }
    const nw = totalAssets.minus(totalLiabs);
    return {
      answer: `Recorded net worth (assets - liabilities): ${formatCurrency(nw.toString(), currency)}`,
      data: {
        totalAssets: totalAssets.toString(),
        totalLiabilities: totalLiabs.toString(),
        netWorth: nw.toString(),
        currency,
        assetsCount: assets?.length || 0,
        liabilitiesCount: liabilities?.length || 0,
      },
      records: { assets, liabilities },
      gaps: totalAssets.equals(0) && totalLiabs.equals(0) ? ["No asset or liability records found"] : [],
    };
  }

  // Assets not revalued in 6 months
  if (q.includes("revalue") || q.includes("six months") || q.includes("6 months")) {
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    const stale = (assets || []).filter((a) => {
      const asOf = a.currentValue?.asOf ? new Date(a.currentValue.asOf) : null;
      return !asOf || asOf < sixMonthsAgo;
    });
    return {
      answer: `Assets not revalued in 6+ months: ${stale.length}`,
      data: { count: stale.length, cutoff: sixMonthsAgo.toISOString().slice(0, 10) },
      records: { assets: stale },
      gaps: stale.length === 0 ? ["All assets have been revalued within 6 months"] : [],
    };
  }

  // Dividends this year
  if (q.includes("dividend")) {
    const year = new Date().getFullYear();
    const divTx = (transactions || []).filter((t) => {
      if (t.category !== "dividend") return false;
      const d = new Date(t.date);
      return d.getFullYear() === year;
    });
    let total = new Decimal(0);
    for (const t of divTx) {
      const v = toNum(t.amount);
      if (v) total = total.plus(v.abs());
    }
    return {
      answer: `Dividends received this year (${year}): ${divTx.length} transaction(s), total ${formatCurrency(total.toString(), currency)}`,
      data: { count: divTx.length, total: total.toString(), year },
      records: { transactions: divTx },
      gaps: divTx.length === 0 ? ["No dividend transactions recorded for this year"] : [],
    };
  }

  // Liabilities to update
  if (q.includes("liabilit") && (q.includes("update") || q.includes("need"))) {
    const needsUpdate = (liabilities || []).filter((l) => {
      if (l.status !== "active") return false;
      const asOf = l.currentBalance?.asOf ? new Date(l.currentBalance.asOf) : null;
      if (!asOf) return true;
      const threeMonthsAgo = new Date();
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
      return asOf < threeMonthsAgo;
    });
    return {
      answer: `Liabilities needing update (no recent balance): ${needsUpdate.length}`,
      data: { count: needsUpdate.length },
      records: { liabilities: needsUpdate },
      gaps: needsUpdate.length === 0 ? ["All active liabilities have recent balances"] : [],
    };
  }

  // Documents supporting largest assets
  if (q.includes("document") && q.includes("asset")) {
    const sortedAssets = [...(assets || [])].sort((a, b) => {
      const va = toNum(a.currentValue?.amount) || new Decimal(0);
      const vb = toNum(b.currentValue?.amount) || new Decimal(0);
      return vb.minus(va).toNumber();
    });
    const top = sortedAssets.slice(0, 3);
    const supporting = (documents || []).filter((d) => {
      return top.some((a) => d.linkedAssetId?.toString() === (a._id?.toString() || a.id));
    });
    return {
      answer: `Documents supporting largest assets (top 3): ${supporting.length} document(s) linked`,
      data: { topAssets: top.map(a => ({ name: a.name, value: a.currentValue?.amount })), supportingDocs: supporting.length },
      records: { assets: top, documents: supporting },
      gaps: supporting.length === 0 ? ["No documents linked to top assets"] : [],
    };
  }

  // Net worth change last month
  if (q.includes("change") && q.includes("month")) {
    return {
      answer: "Net worth change analysis requires comparing snapshots over time.",
      data: { snapshotsAvailable: snapshots?.length || 0 },
      records: { snapshots: snapshots?.slice(0, 5) },
      gaps: ["Compare recorded snapshots from last month vs now to compute deterministic change. Use /api/reports/networth-trend for detailed history."],
    };
  }

  // Default
  return {
    answer: "I can answer questions about net worth, revaluations, dividends, liabilities, documents supporting assets, and net worth changes. Try rephrasing your question.",
    data: {},
    records: {},
    gaps: [],
  };
}
