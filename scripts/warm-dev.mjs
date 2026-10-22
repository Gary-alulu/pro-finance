// scripts/warm-dev.mjs
// Pre-compiles every route in the dev server so first navigation is not slow.
// Turbopack compiles each route on first request; this script fires one request
// per route (protected routes 307-redirect, but still compile) right after the
// server becomes ready. Run automatically via `npm run dev`.

const BASE = process.env.WARM_BASE_URL || "http://localhost:3000";

// Pages that exist under app/(app)/ plus the public pages and the API routes
// each page loads on first paint. Compiling these warms Turbopack's cache.
const PATHS = [
  "/login",
  "/register",
  "/overview",
  "/assets",
  "/investments",
  "/transactions",
  "/documents",
  "/reports",
  "/accountability",
  "/settings",
  "/map",
  "/api/networth/summary",
  "/api/networth/snapshots",
  "/api/assets",
  "/api/liabilities",
  "/api/investments",
  "/api/transactions",
  "/api/documents",
  "/api/accountability",
  "/api/reports/cashflow",
  "/api/map",
];

async function waitForReady(timeoutMs = 120000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(BASE + "/login", { redirect: "manual" });
      if (res.status > 0) return true;
    } catch {
      // server not up yet
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  return false;
}

async function warm(path) {
  const t0 = Date.now();
  try {
    await fetch(BASE + path, { redirect: "manual" });
    const ms = Date.now() - t0;
    console.log(`  warmed ${path.padEnd(28)} ${ms}ms`);
  } catch (e) {
    console.log(`  failed ${path.padEnd(28)} ${e.message}`);
  }
}

const ready = await waitForReady();
if (!ready) {
  console.error("warm-dev: server did not become ready in time");
  process.exit(0);
}

console.log("warm-dev: pre-compiling routes…");
for (const p of PATHS) {
  await warm(p);
}
console.log("warm-dev: done — routes are compiled.");
