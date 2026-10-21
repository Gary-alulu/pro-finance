// app/api/reports/[entity]/route.js
// GET /api/reports/[entity] — structured report rows for assets, liabilities,
// investments, transactions or documents. The same {columns, rows, totals}
// shape feeds the reports UI and the CSV export.

import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db/mongoose";
import { requireUserId, withErrorHandling } from "@/lib/auth/session";
import { buildReport, REPORT_ENTITIES } from "@/lib/reports/buildReport";

async function getHandler(request, { params }) {
  const userId = await requireUserId();
  const { entity } = await params;
  if (!REPORT_ENTITIES.includes(entity)) {
    return NextResponse.json(
      { error: `Unknown report "${entity}". Valid: ${REPORT_ENTITIES.join(", ")}` },
      { status: 404 }
    );
  }

  await connectDB();
  const report = await buildReport(entity, userId);
  return NextResponse.json({ ...report, generatedAt: new Date().toISOString() });
}

export const GET = withErrorHandling(getHandler);
