"use client";
// components/charts/InvestmentPerformanceChart.js
// Unrealised gain or loss for each holding, as diverging horizontal bars.
//
// Only holdings with both a recorded price and a recorded cost basis can be
// valued; anything missing a price or cost is excluded rather than plotted
// as a zero, which would read as "no gain" instead of "not known".

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
} from "recharts";
import { TrendingUp } from "lucide-react";
import { formatCurrency } from "@/lib/finance/currency";
import ChartCard from "@/components/charts/ChartCard";
import EmptyState from "@/components/ui/EmptyState";
import SkeletonLoader from "@/components/ui/SkeletonLoader";

function PerformanceTooltip({ active, payload, currency }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  const positive = d.value >= 0;
  return (
    <div
      className="px-3 py-2.5 rounded-lg text-sm"
      style={{
        background: "var(--color-surface)",
        border: "1px solid var(--color-border)",
        boxShadow: "var(--shadow-md)",
      }}
    >
      <p style={{ color: "var(--color-text-tertiary)", fontSize: "0.75rem" }}>{d.name}</p>
      <p
        className="font-semibold metric-value"
        style={{ color: positive ? "var(--color-emerald-600)" : "var(--color-coral-600)" }}
      >
        {positive ? "+" : ""}
        {formatCurrency(d.value, currency)}
      </p>
      {d.percent !== null && (
        <p
          className="mt-0.5 text-xs"
          style={{ color: positive ? "var(--color-emerald-600)" : "var(--color-coral-600)" }}
        >
          {positive ? "+" : ""}
          {d.percent}% on cost
        </p>
      )}
    </div>
  );
}

export default function InvestmentPerformanceChart({
  currency = "KES",
  holdings = null,
  loading = false,
  limit = 10,
}) {
  const data = useMemo(() => {
    const rows = (holdings || [])
      .filter((h) => h.gainLoss !== null && h.gainLoss !== undefined && h.gainLoss !== "")
      .map((h) => ({
        name: h.name || h.ticker || "Unnamed",
        value: Number(h.gainLoss) || 0,
        percent:
          h.gainLossPercent === null || h.gainLossPercent === undefined
            ? null
            : Number(h.gainLossPercent),
      }));

    rows.sort((a, b) => Math.abs(b.value) - Math.abs(a.value));
    return rows.slice(0, limit);
  }, [holdings, limit]);

  const hasData = data.length > 0;

  return (
    <ChartCard
      title="Investment Performance"
      subtitle="Unrealised gain or loss against recorded cost basis"
    >
      {loading ? (
        <SkeletonLoader className="h-full w-full rounded-lg" />
      ) : !hasData ? (
        <div className="flex-1 flex items-center justify-center">
          <EmptyState
            icon={TrendingUp}
            title="No performance yet"
            description="Record both a cost basis and a current price for a holding and its unrealised gain or loss appears here."
            compact
          />
        </div>
      ) : (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 4, right: 16, bottom: 0, left: 0 }}
            barCategoryGap={6}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" horizontal={false} />
            <XAxis
              type="number"
              tick={{ fontSize: 11, fill: "var(--color-text-tertiary)" }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => formatCurrency(v, currency).replace(/\.00$/, "")}
            />
            <YAxis
              type="category"
              dataKey="name"
              width={110}
              tick={{ fontSize: 11, fill: "var(--color-text-tertiary)" }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              content={<PerformanceTooltip currency={currency} />}
              cursor={{ fill: "var(--color-surface-2)" }}
            />
            <Bar dataKey="value" name="Gain/Loss" radius={[0, 4, 4, 0]} maxBarSize={16}>
              {data.map((entry) => (
                <Cell
                  key={entry.name}
                  fill={entry.value >= 0 ? "var(--color-emerald-500)" : "var(--color-coral-500)"}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </ChartCard>
  );
}
