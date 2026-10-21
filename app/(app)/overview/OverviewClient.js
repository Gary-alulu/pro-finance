"use client";
// app/(app)/overview/OverviewClient.js
// Main dashboard client component. Fetches summary data from API.

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Eye,
  EyeOff,
  RefreshCw,
  AlertTriangle,
  Info,
} from "lucide-react";
import { formatCurrency } from "@/lib/finance/currency";
import MetricCard from "@/components/ui/MetricCard";
import EmptyState from "@/components/ui/EmptyState";
import SkeletonLoader from "@/components/ui/SkeletonLoader";
import AccountabilityPanel from "@/components/dashboard/AccountabilityPanel";
import RecentActivityFeed from "@/components/dashboard/RecentActivityFeed";
import WealthTrendChart from "@/components/dashboard/WealthTrendChart";
import AssetAllocationChart from "@/components/dashboard/AssetAllocationChart";

const STAGGER = {
  container: { animate: { transition: { staggerChildren: 0.07 } } },
  item: {
    initial: { opacity: 0, y: 12 },
    animate: { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] } },
  },
};

export default function OverviewClient({ user }) {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [hideValues, setHideValues] = useState(false);
  const [attention, setAttention] = useState(null);
  const currency = user?.preferredCurrency || "KES";

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const res = await fetch("/api/networth/summary");
        if (!res.ok) throw new Error("Failed to load summary");
        const data = await res.json();
        setSummary(data);
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    }
    load();

    // Accountability summary for the "Needs Attention" metric
    fetch("/api/accountability?status=open&limit=1")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.summary) setAttention(data.summary);
      })
      .catch(() => {});
  }, []);

  const netWorth = summary?.netWorth ?? null;
  const totalAssets = summary?.totalAssets ?? null;
  const totalLiabilities = summary?.totalLiabilities ?? null;
  const hasData = netWorth !== null;

  function masked(value, formatted) {
    if (hideValues) return "••••••";
    return formatted;
  }

  return (
    <div className="p-6 md:p-8 space-y-8 max-w-screen-2xl mx-auto">

      {/* ── Hero row ───────────────────────────────────────────────────── */}
      <motion.div
        initial="initial"
        animate="animate"
        variants={STAGGER.container}
        className="grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-5"
      >
        {/* Net worth hero card */}
        <motion.div variants={STAGGER.item} className="sm:col-span-2">
          <div
            className="rounded-xl p-6 relative overflow-hidden"
            style={{
              background: "linear-gradient(135deg, #0d2116 0%, #1c3828 100%)",
              border: "1px solid rgba(16,185,129,0.2)",
              boxShadow: "var(--shadow-lg)",
            }}
          >
            {/* Hide values toggle */}
            <button
              onClick={() => setHideValues((v) => !v)}
              className="absolute top-4 right-4 p-1.5 rounded-lg transition-colors"
              style={{ color: "rgba(255,255,255,0.5)", background: "rgba(255,255,255,0.08)" }}
              aria-label={hideValues ? "Show values" : "Hide values"}
            >
              {hideValues ? <Eye size={15} /> : <EyeOff size={15} />}
            </button>

            <p className="text-xs font-medium uppercase tracking-wider mb-1" style={{ color: "rgba(255,255,255,0.45)" }}>
              Recorded Net Worth
            </p>

            {loading ? (
              <div className="h-10 w-48 rounded-lg bg-white/10 animate-pulse mt-2 mb-4" />
            ) : error ? (
              <p className="text-2xl font-light mt-2 mb-4" style={{ color: "rgba(255,255,255,0.5)" }}>—</p>
            ) : (
              <div className="mt-2 mb-4">
                <span
                  className="metric-value font-semibold"
                  style={{
                    fontSize: "clamp(1.75rem, 4vw, 2.5rem)",
                    color: "#faf9f6",
                    letterSpacing: "-0.03em",
                  }}
                >
                  {hasData
                    ? masked(netWorth, formatCurrency(netWorth, currency))
                    : "No records yet"}
                </span>
              </div>
            )}

            {!loading && !error && hasData && (
              <div className="flex items-center gap-4 text-sm" style={{ color: "rgba(255,255,255,0.55)" }}>
                <span>
                  Assets:{" "}
                  <strong style={{ color: "var(--color-emerald-400)" }}>
                    {masked(totalAssets, formatCurrency(totalAssets, currency))}
                  </strong>
                </span>
                <span>
                  Liabilities:{" "}
                  <strong style={{ color: "var(--color-coral-300)" }}>
                    {masked(totalLiabilities, formatCurrency(totalLiabilities, currency))}
                  </strong>
                </span>
              </div>
            )}

            {/* Disclosure */}
            <div
              className="flex items-start gap-2 mt-4 pt-4 text-xs"
              style={{
                borderTop: "1px solid rgba(255,255,255,0.1)",
                color: "rgba(255,255,255,0.35)",
              }}
            >
              <Info size={12} className="flex-shrink-0 mt-0.5" />
              <span>
                Reflects recorded data only. Values with unknown amounts are excluded.
              </span>
            </div>
          </div>
        </motion.div>

        {/* Metric cards */}
        {[
          {
            id: "total-assets",
            label: "Total Assets",
            value: loading ? null : (hasData ? masked(totalAssets, formatCurrency(totalAssets, currency)) : "—"),
            trend: null,
            positive: true,
            href: "/assets",
          },
          {
            id: "total-liabilities",
            label: "Total Liabilities",
            value: loading ? null : (hasData ? masked(totalLiabilities, formatCurrency(totalLiabilities, currency)) : "—"),
            trend: null,
            positive: false,
            href: "/assets?tab=liabilities",
          },
          {
            id: "needs-attention",
            label: "Needs Attention",
            value: attention ? String(attention.open ?? 0) : "—",
            subValue: attention
              ? `${attention.errors ?? 0} errors · ${attention.warnings ?? 0} warnings`
              : undefined,
            positive: attention && attention.open > 0 ? false : undefined,
            href: "/accountability",
          },
        ].map((m) => (
          <motion.div key={m.id} variants={STAGGER.item}>
            <MetricCard {...m} loading={loading} />
          </motion.div>
        ))}
      </motion.div>

      {/* ── Charts row ─────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.15 }}
        className="grid gap-4 grid-cols-1 lg:grid-cols-3"
      >
        {/* Wealth trend — spans 2 cols */}
        <div className="lg:col-span-2">
          <WealthTrendChart currency={currency} />
        </div>

        {/* Asset allocation */}
        <AssetAllocationChart currency={currency} />
      </motion.div>

      {/* ── Accountability + Activity row ──────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.25 }}
        className="grid gap-4 grid-cols-1 lg:grid-cols-2"
      >
        <AccountabilityPanel />
        <RecentActivityFeed currency={currency} />
      </motion.div>
    </div>
  );
}
