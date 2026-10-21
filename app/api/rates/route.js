// app/api/rates/route.js
// GET /api/rates — list stored exchange rates (optionally a specific pair)
// POST /api/rates — record an explicit, dated exchange rate

import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db/mongoose";
import ExchangeRate from "@/lib/db/models/ExchangeRate";
import { requireUserId, withErrorHandling, validationError } from "@/lib/auth/session";
import { logAudit, requestMeta } from "@/lib/audit/logAudit";
import { z } from "zod";
import mongoose from "mongoose";
import { readJsonBody } from "@/lib/security/sanitize";

const createRateSchema = z.object({
  from: z.string().length(3).toUpperCase(),
  to: z.string().length(3).toUpperCase(),
  rate: z.string().regex(/^\d+(\.\d{1,10})?$/, "Must be a positive decimal"),
  asOf: z.string().datetime({ offset: true }).or(z.string().date()),
  source: z.enum(["manual", "imported", "published"]).default("manual"),
  note: z.string().max(500).optional(),
});

async function getHandler(request) {
  const userId = await requireUserId();
  await connectDB();

  const { searchParams } = new URL(request.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  const filter = { ownerId: userId };
  if (from) filter.from = from.toUpperCase();
  if (to) filter.to = to.toUpperCase();

  const rates = await ExchangeRate.find(filter).sort({ asOf: -1 }).limit(500).lean();

  return NextResponse.json({
    rates: rates.map((r) => {
      const { _id, __v, ...rest } = r;
      return { ...rest, id: _id.toString(), rate: r.rate?.toString() };
    }),
  });
}

async function postHandler(request) {
  const userId = await requireUserId();
  const body = await readJsonBody(request);
  const result = createRateSchema.safeParse(body);
  if (!result.success) return validationError(result);

  await connectDB();
  const data = result.data;

  if (data.from === data.to) {
    return NextResponse.json({ error: "from and to currencies must differ" }, { status: 400 });
  }

  const rate = await ExchangeRate.create({
    ownerId: new mongoose.Types.ObjectId(userId),
    from: data.from,
    to: data.to,
    rate: mongoose.Types.Decimal128.fromString(data.rate),
    asOf: new Date(data.asOf),
    source: data.source,
    note: data.note,
  });

  await logAudit(
    userId,
    "create",
    "settings",
    rate._id.toString(),
    null,
    rate.toJSON(),
    `Recorded FX rate ${data.from}/${data.to} = ${data.rate}`,
    requestMeta(request)
  );

  return NextResponse.json({ rate: rate.toJSON() }, { status: 201 });
}

export const GET = withErrorHandling(getHandler);
export const POST = withErrorHandling(postHandler);
