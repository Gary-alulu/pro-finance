// app/api/reports/export/route.js
// GET /api/reports/export?type=assets|liabilities|investments|transactions|documents|cashflow
// Streams the same report rows the UI shows, as an RFC 4180 CSV attachment.

import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db/mongoose";
import { requireUserId, withErrorHandling } from "@/lib/auth/session";
import { buildReport, REPORT_ENTITIES } from "@/lib/reports/buildReport";
import { toCsv, exportFilename } from "@/lib/reports/csv";
import { getMonthlyCashFlow } from "@/lib/data/cashflow";

const CASHFLOW_COLUMNS = [
  { key: "month", label: "Month" },
  { key: "income", label: "Income" },
  { key: "expenses", label: "Expenses" },
  { key: "net", label: "Net" },
  { key: "transfers", label: "Transfers" },
  { key: "count", label: "Transactions" },
];

async function getHandler(request) {
  const userId = await requireUserId();
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type");

  await connectDB();

  // Cash flow is a time series rather than an entity table, so it is built
  // from the monthly aggregation instead of buildReport().
  if (type === "cashflow") {
    const monthly = await getMonthlyCashFlow(userId, { months: 24 });
    const csv = toCsv(
      CASHFLOW_COLUMNS,
      monthly.map((m) => ({
        month: m.month,
        income: m.income,
        expenses: m.expenses,
        net: m.net,
        transfers: m.transfers,
        count: m.count,
      }))
    );

    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${exportFilename("cashflow")}"`,
        "Cache-Control": "no-store",
      },
    });
  }

  if (!REPORT_ENTITIES.includes(type)) {
    return NextResponse.json(
      { error: `Unknown report type. Valid: ${[...REPORT_ENTITIES, "cashflow"].join(", ")}` },
      { status: 400 }
    );
  }

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
