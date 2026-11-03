// app/api/dashboard/export/route.js
// GET /api/dashboard/export
// Downloads clean, RFC 4180 compliant CSV or JSON financial exports.

import { requireUserId, withErrorHandling } from "@/lib/auth/session";
import { getDashboardExport } from "@/lib/services/dashboard";
import { DEFAULT_CURRENCY } from "@/lib/finance/currency";

async function handler(request) {
  const userId = await requireUserId();
  const { searchParams } = new URL(request.url);

  const scope = searchParams.get("scope") || "summary";
  const format = searchParams.get("format") || "csv";
  const period = searchParams.get("period") || "30d";
  const currency = searchParams.get("currency") || DEFAULT_CURRENCY;

  const result = await getDashboardExport(userId, {
    scope,
    format,
    period,
    reportingCurrency: currency,
  });

  return new Response(result.data, {
    status: 200,
    headers: {
      "Content-Type": result.contentType,
      "Content-Disposition": `attachment; filename="${result.filename}"`,
      "Cache-Control": "no-store, max-age=0",
    },
  });
}

export const GET = withErrorHandling(handler);
