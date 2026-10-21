// app/api/search/route.js
// GET /api/search?q=term — grouped record search across entities.
// Used by the command palette. Minimum query length 2; user input is
// regex-escaped so it is treated as a literal, never as a pattern.

import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db/mongoose";
import Asset from "@/lib/db/models/Asset";
import Liability from "@/lib/db/models/Liability";
import Transaction from "@/lib/db/models/Transaction";
import Document from "@/lib/db/models/Document";
import InvestmentHolding from "@/lib/db/models/InvestmentHolding";
import { requireUserId, withErrorHandling } from "@/lib/auth/session";

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const GROUPS = [
  {
    label: "Assets",
    entityType: "asset",
    href: (id) => `/assets?tab=assets&focus=${id}`,
    run: (userId, rx) =>
      Asset.find({ ownerId: userId, name: { $regex: rx, $options: "i" } })
        .limit(5)
        .select("name category currentValue")
        .lean(),
    secondary: (doc) => doc.category,
  },
  {
    label: "Liabilities",
    entityType: "liability",
    href: (id) => `/assets?tab=liabilities&focus=${id}`,
    run: (userId, rx) =>
      Liability.find({ ownerId: userId, name: { $regex: rx, $options: "i" } })
        .limit(5)
        .select("name category currentBalance")
        .lean(),
    secondary: (doc) => doc.category,
  },
  {
    label: "Investments",
    entityType: "investment",
    href: (id) => `/investments?focus=${id}`,
    run: (userId, rx) =>
      InvestmentHolding.find({ ownerId: userId, name: { $regex: rx, $options: "i" } })
        .limit(5)
        .select("name type ticker")
        .lean(),
    secondary: (doc) => doc.ticker || doc.type,
  },
  {
    label: "Transactions",
    entityType: "transaction",
    href: (id) => `/transactions?focus=${id}`,
    run: (userId, rx) =>
      Transaction.find({
        ownerId: userId,
        $or: [
          { description: { $regex: rx, $options: "i" } },
          { category: { $regex: rx, $options: "i" } },
        ],
      })
        .sort({ date: -1 })
        .limit(5)
        .select("description category date amount")
        .lean(),
    secondary: (doc) =>
      doc.date ? new Date(doc.date).toISOString().slice(0, 10) : "",
  },
  {
    label: "Documents",
    entityType: "document",
    href: (id) => `/documents?focus=${id}`,
    run: (userId, rx) =>
      Document.find({ ownerId: userId, filename: { $regex: rx, $options: "i" } })
        .limit(5)
        .select("filename documentType processingStatus")
        .lean(),
    secondary: (doc) => doc.documentType,
  },
];

async function getHandler(request) {
  const userId = await requireUserId();
  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") || "").trim();

  if (q.length < 2) {
    return NextResponse.json({ groups: [], total: 0 });
  }

  await connectDB();
  const rx = escapeRegex(q);

  const results = await Promise.all(
    GROUPS.map(async (g) => {
      const docs = await g.run(userId, rx);
      return {
        label: g.label,
        entityType: g.entityType,
        items: docs.map((doc) => ({
          id: doc._id.toString(),
          title: doc.name || doc.description || doc.filename,
          secondary: g.secondary(doc),
          href: g.href(doc._id.toString()),
        })),
      };
    })
  );

  const groups = results.filter((g) => g.items.length > 0);
  return NextResponse.json({
    groups,
    total: groups.reduce((n, g) => n + g.items.length, 0),
  });
}

export const GET = withErrorHandling(getHandler);
