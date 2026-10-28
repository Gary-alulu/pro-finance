// app/api/user/delete/route.js
// POST /api/user/delete — permanently delete the owner account and every
// record they own. Requires the current password and an explicit confirmation.

import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/db/mongoose";
import { requireUserId, withErrorHandling, validationError } from "@/lib/auth/session";
import { deleteAccountSchema } from "@/lib/validations/schemas";
import { readJsonBody } from "@/lib/security/sanitize";

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

const OWNED_MODELS = [
  Account,
  AccountabilityItem,
  Asset,
  AssetValuation,
  AuditEvent,
  DataAnomaly,
  Dividend,
  Document,
  DocumentExtraction,
  ExchangeRate,
  FinancialSnapshot,
  InvestmentHolding,
  InvestmentTrade,
  Liability,
  Reconciliation,
  RecordRelationship,
  RelationshipSuggestion,
  Reminder,
  Transaction,
];

async function postHandler(request) {
  const userId = await requireUserId();
  const body = await readJsonBody(request);
  const parsed = deleteAccountSchema.safeParse(body);
  if (!parsed.success) return validationError(parsed);

  if (parsed.data.confirmation !== "DELETE") {
    return NextResponse.json(
      { error: 'Type DELETE exactly to confirm account removal.' },
      { status: 400 }
    );
  }

  await connectDB();
  const user = await User.findById(userId).select("+passwordHash");
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const valid = await bcrypt.compare(parsed.data.password, user.passwordHash);
  if (!valid) {
    return NextResponse.json({ error: "Incorrect password." }, { status: 400 });
  }

  await Promise.all(OWNED_MODELS.map((Model) => Model.deleteMany({ ownerId: userId })));
  await User.deleteOne({ _id: userId });

  return NextResponse.json({ ok: true });
}

export const POST = withErrorHandling(postHandler);
