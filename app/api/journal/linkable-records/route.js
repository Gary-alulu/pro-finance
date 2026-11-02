// app/api/journal/linkable-records/route.js
// GET /api/journal/linkable-records — search & fetch linkable financial records

import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db/mongoose";
import Asset from "@/lib/db/models/Asset";
import Liability from "@/lib/db/models/Liability";
import InvestmentHolding from "@/lib/db/models/InvestmentHolding";
import Transaction from "@/lib/db/models/Transaction";
import { requireUserId, withErrorHandling } from "@/lib/auth/session";

async function handler(request) {
  const userId = await requireUserId();
  await connectDB();

  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") || "").trim();
  const regex = q ? new RegExp(q.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&"), "i") : null;

  const [assets, liabilities, investments, transactions] = await Promise.all([
    Asset.find({
      ownerId: userId,
      status: "active",
      ...(regex ? { name: regex } : {}),
    })
      .select("name category currentValue currency")
      .limit(10)
      .lean(),

    Liability.find({
      ownerId: userId,
      status: "active",
      ...(regex ? { name: regex } : {}),
    })
      .select("name category currentBalance currency")
      .limit(10)
      .lean(),

    InvestmentHolding.find({
      ownerId: userId,
      status: "active",
      ...(regex ? { $or: [{ name: regex }, { symbol: regex }] } : {}),
    })
      .select("name symbol units currentPrice currency")
      .limit(10)
      .lean(),

    Transaction.find({
      ownerId: userId,
      ...(regex ? { description: regex } : {}),
    })
      .sort({ date: -1 })
      .select("description amount currency date category")
      .limit(10)
      .lean(),
  ]);

  const items = [
    ...assets.map((a) => ({
      entityType: "asset",
      entityId: a._id.toString(),
      title: a.name,
      amount: a.currentValue?.amount ? a.currentValue.amount.toString() : undefined,
      currency: a.currency || "KES",
    })),
    ...liabilities.map((l) => ({
      entityType: "liability",
      entityId: l._id.toString(),
      title: l.name,
      amount: l.currentBalance?.amount ? l.currentBalance.amount.toString() : undefined,
      currency: l.currency || "KES",
    })),
    ...investments.map((i) => ({
      entityType: "investment",
      entityId: i._id.toString(),
      title: `${i.name} (${i.symbol})`,
      amount: i.currentPrice?.amount ? i.currentPrice.amount.toString() : undefined,
      currency: i.currency || "KES",
    })),
    ...transactions.map((t) => ({
      entityType: "transaction",
      entityId: t._id.toString(),
      title: t.description || "Transaction",
      amount: t.amount ? t.amount.toString() : undefined,
      currency: t.currency || "KES",
    })),
  ];

  return NextResponse.json({ records: items });
}

export const GET = withErrorHandling(handler);
