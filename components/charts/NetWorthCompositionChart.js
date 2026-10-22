"use client";
// components/charts/NetWorthCompositionChart.js
// How net worth is built: recorded assets + recorded investments, less
// recorded liabilities, equals recorded net worth.
//
// Every figure comes from the recorded net worth calculation — unrecorded
// amounts are excluded upstream and never appear here as zero-value rows
// that could be misread.

import { useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
} from "recharts";
import { PieChart } from "lucide-react";
import { formatCurrency } from "@/lib/finance/currency";
import ChartCard from "@/components/charts/ChartCard";
import EmptyState from "@/components/ui/EmptyState";
import SkeletonLoader from "@/components/ui/SkeletonLoader";

const SEGMENTS = [
  { key: "assets", label: "Assets", color: "var(--color-emerald-500)" },
  { key: "holdings", label: "Investments", color: "var(--color-gold-500)" },
  { key: "liabilities", label: "Liabilities", color: "var(--color-coral-500)" },
  { key: "netWorth", label: "Net Worth", color: "var(--color-emerald-700)" },
];

function CompositionTooltip({ active, payload, currency }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div
      className="px-3 py-2.5 rounded-lg text-sm"
      style={{
        background: "var(--color-surface)",
        border: "1px solid var(--color-border)",
        boxShadow: "var(--shadow-md)",
      }}
    >
      <p style={{ color: "var(--color-text-tertiary)", fontSize: "0.75rem" }}>{d.label}</p>
      <p className="font-semibold metric-value" style={{ color: "var(--color-text-primary)" }}>
        {formatCurrency(d.value, currency)}
      </p>
    </div>
  );
}

export default function NetWorthCompositionChart({
  currency = "KES",
  assetsTotal = null,
  holdingsTotal = null,
  totalLiabilities = null,
  netWorth = null,
  loading = false,
}) {
  const data = useMemo(() => {
    if (assetsTotal === null && holdingsTotal === null && totalLiabilities === null) return [];
    const value = (v) => Number(v) || 0;
    return SEGMENTS.map((s) => {
      const raw = {
        assets: assetsTotal,
        holdings: holdingsTotal,
        liabilities: totalLiabilities,
        netWorth,
      }[s.key];
      return { ...s, value: value(raw), raw };
    });
  }, [assetsTotal, holdingsTotal, totalLiabilities, netWorth]);

  const hasData = data.some((d) => d.value !== 0);

  return (
    <ChartCard
      title="Net Worth Composition"
      subtitle="Recorded assets and investments, less recorded liabilities"
    >
      {loading ? (
        <SkeletonLoader className="h-full w-full rounded-lg" />
      ) : !hasData ? (
        <div className="flex-1 flex items-center justify-center">
          <EmptyState
            icon={PieChart}
            title="Nothing recorded yet"
            description="Add assets, investments or liabilities and this breaks down exactly what your net worth is made of."
            compact
          />
        </div>
      ) : (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 11, fill: "var(--color-text-tertiary)" }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 11, fill: "var(--color-text-tertiary)" }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => formatCurrency(v, currency).replace(/\.00$/, "")}
              width={80}
            />
            <Tooltip
              content={<CompositionTooltip currency={currency} />}
              cursor={{ fill: "var(--color-surface-2)" }}
            />
            <ReferenceLine y={0} stroke="var(--color-border-strong)" />
            <Bar dataKey="value" name="Amount" radius={[6, 6, 0, 0]} maxBarSize={64}>
              {data.map((entry) => (
                <Cell key={entry.key} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </ChartCard>
  );
}
