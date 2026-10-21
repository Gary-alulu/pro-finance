// app/api/reports/export/route.js
// GET /api/reports/export?type=assets|liabilities|investments|transactions|documents
// Streams the same report rows the UI shows, as an RFC 4180 CSV attachment.

import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db/mongoose";
import { requireUserId, withErrorHandling } from "@/lib/auth/session";
import { buildReport, REPORT_ENTITIES } from "@/lib/reports/buildReport";
import { toCsv, exportFilename } from "@/lib/reports/csv";

async function getHandler(request) {
  const userId = await requireUserId();
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type");

  if (!REPORT_ENTITIES.includes(type)) {
    return NextResponse.json(
      { error: `Unknown report type. Valid: ${REPORT_ENTITIES.join(", ")}` },
      { status: 400 }
    );
  }

  await connectDB();
  const report = await buildReport(type, userId);
  const csv = toCsv(report.columns, report.rows);
  const filename = exportFilename(type);

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}

export const GET = withErrorHandling(getHandler);
