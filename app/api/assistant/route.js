// app/api/assistant/route.js
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db/mongoose";
import Asset from "@/lib/db/models/Asset";
import Liability from "@/lib/db/models/Liability";
import InvestmentHolding from "@/lib/db/models/InvestmentHolding";
import Transaction from "@/lib/db/models/Transaction";
import Document from "@/lib/db/models/Document";
import FinancialSnapshot from "@/lib/db/models/FinancialSnapshot";
import User from "@/lib/db/models/User";
import { requireUserId, withErrorHandling, validationError } from "@/lib/auth/session";
import { assistantQuerySchema } from "@/lib/validations/schemas";
import { readJsonBody } from "@/lib/security/sanitize";
import { answerQuestion } from "@/lib/ai/assistant";

async function postHandler(request) {
  const userId = await requireUserId();
  const body = await readJsonBody(request);
  const result = assistantQuerySchema.safeParse(body);
  if (!result.success) return validationError(result);
  await connectDB();
  const [user, assets, liabilities, investments, transactions, documents, snapshots] = await Promise.all([
    User.findById(userId).lean(),
    Asset.find({ ownerId: userId }).lean(),
    Liability.find({ ownerId: userId }).lean(),
    InvestmentHolding.find({ ownerId: userId }).lean(),
    Transaction.find({ ownerId: userId }).sort({ date: -1 }).limit(500).lean(),
    Document.find({ ownerId: userId }).lean(),
    FinancialSnapshot.find({ ownerId: userId }).sort({ asOf: -1 }).limit(12).lean(),
  ]);
  const response = answerQuestion({ question: result.data.question, user, assets, liabilities, investments, transactions, documents, snapshots });
  return NextResponse.json(response);
}

export const POST = withErrorHandling(postHandler);
