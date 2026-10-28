// app/api/user/export/route.js
// GET /api/user/export — download a complete JSON snapshot of the owner's
// records, settings and metadata. Excludes password hashes and storage keys.

import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db/mongoose";
import { requireUserId, withErrorHandling } from "@/lib/auth/session";
import { logAudit, requestMeta } from "@/lib/audit/logAudit";
import { mergeSettings } from "@/lib/settings/defaults";

import User from "@/lib/db/models/User";
import Account from "@/lib/db/models/Account";
import AccountabilityItem from "@/lib/db/models/AccountabilityItem";
import Asset from "@/lib/db/models/Asset";
import AssetValuation from "@/lib/db/models/AssetValuation";
import AuditEvent from "@/lib/db/models/AuditEvent";
import DataAnomaly from "@/lib/db/models/DataAnomaly";
import Dividend from "@/lib/db/models/Dividend";
import Document from "@/lib/db/models/Document";
import DocumentExtraction from "@/lib/db/models/DocumentExtraction";
import ExchangeRate from "@/lib/db/models/ExchangeRate";
import FinancialSnapshot from "@/lib/db/models/FinancialSnapshot";
import InvestmentHolding from "@/lib/db/models/InvestmentHolding";
import InvestmentTrade from "@/lib/db/models/InvestmentTrade";
import Liability from "@/lib/db/models/Liability";
import Reconciliation from "@/lib/db/models/Reconciliation";
import RecordRelationship from "@/lib/db/models/RecordRelationship";
import RelationshipSuggestion from "@/lib/db/models/RelationshipSuggestion";
import Reminder from "@/lib/db/models/Reminder";
import Transaction from "@/lib/db/models/Transaction";

const COLLECTIONS = [
  ["accounts", Account],
  ["accountabilityItems", AccountabilityItem],
  ["assets", Asset],
  ["assetValuations", AssetValuation],
  ["auditEvents", AuditEvent],
  ["dataAnomalies", DataAnomaly],
  ["dividends", Dividend],
  ["documents", Document, { select: "-storageKey" }],
  ["documentExtractions", DocumentExtraction],
  ["exchangeRates", ExchangeRate],
  ["financialSnapshots", FinancialSnapshot],
  ["investmentHoldings", InvestmentHolding],
  ["investmentTrades", InvestmentTrade],
  ["liabilities", Liability],
  ["reconciliations", Reconciliation],
  ["recordRelationships", RecordRelationship],
  ["relationshipSuggestions", RelationshipSuggestion],
  ["reminders", Reminder],
  ["transactions", Transaction],
];

function plain(value) {
  return JSON.parse(JSON.stringify(value));
}

async function getHandler(request) {
  const userId = await requireUserId();
  await connectDB();

  const user = await User.findById(userId).select("-passwordHash").lean();
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const entries = await Promise.all(
    COLLECTIONS.map(async ([key, Model, options = {}]) => {
      let query = Model.find({ ownerId: userId });
      if (options.select) query = query.select(options.select);
      const docs = await query.lean();
      return [key, plain(docs)];
    })
  );

  const payload = {
    exportVersion: 1,
    generatedAt: new Date().toISOString(),
    account: {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      preferredCurrency: user.preferredCurrency,
      createdAt: user.createdAt,
    },
    settings: mergeSettings(user.settings, {
      preferredCurrency: user.preferredCurrency,
    }),
    ...Object.fromEntries(entries),
  };

  await logAudit(
    userId,
    "export",
    "user",
    userId,
    null,
    { collections: COLLECTIONS.map(([key]) => key) },
    "Exported a full account data snapshot",
    requestMeta(request)
  );

  const filename = `profinance-export-${new Date().toISOString().slice(0, 10)}.json`;

  return new NextResponse(JSON.stringify(payload, null, 2), {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}

export const GET = withErrorHandling(getHandler);
