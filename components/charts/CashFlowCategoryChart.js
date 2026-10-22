"use client";
// components/charts/CashFlowCategoryChart.js
// Diverging horizontal bars per category: money in extends right, money out
// extends left, so the sign is readable without touching the axis labels.
//
// Transfers are excluded upstream — they are neither income nor spending.

import { useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Wallet } from "lucide-react";
import { formatCurrency } from "@/lib/finance/currency";
import ChartCard from "@/components/charts/ChartCard";
import EmptyState from "@/components/ui/EmptyState";
import SkeletonLoader from "@/components/ui/SkeletonLoader";

const CATEGORY_LABELS = {
  income: "Income",
  expense: "Expense",
  fee: "Fees",
  tax: "Tax",
  dividend: "Dividends",
  interest: "Interest",
  transfer: "Transfer",
  investment_purchase: "Investment purchase",
  investment_sale: "Investment sale",
  asset_purchase: "Asset purchase",
  asset_sale: "Asset sale",
  loan_repayment: "Loan repayment",
  other: "Other",
};

const labelFor = (key) =>
  CATEGORY_LABELS[key] ||
  String(key)
    .replace(/_/g, " ")
    .replace(/^./, (c) => c.toUpperCase());

function CategoryTooltip({ active, payload, currency }) {
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
      <p style={{ color: "var(--color-text-tertiary)", fontSize: "0.75rem" }}>
        {labelFor(d.category)}
      </p>
      <p className="font-semibold metric-value" style={{ color: "var(--color-text-primary)" }}>
        {formatCurrency(d.net, currency)}
      </p>
      <div className="mt-1.5 space-y-0.5 text-xs">
        <p style={{ color: "var(--color-emerald-600)" }}>
          In {formatCurrency(d.income, currency)}
        </p>
        <p style={{ color: "var(--color-coral-600)" }}>
          Out {formatCurrency(d.expense, currency)}
        </p>
      </div>
    </div>
  );
}

export default function CashFlowCategoryChart({
  currency = "KES",
  categories = null,
  loading = false,
  limit = 8,
}) {
  const data = useMemo(() => {
    const rows = (categories || [])
      .map((c) => ({
        category: c.category,
        label: labelFor(c.category),
        income: Number(c.income) || 0,
        expense: Number(c.expense) || 0,
        net: Number(c.net) || 0,
        // Expense renders to the left of the axis.
        expenseLeft: -(Number(c.expense) || 0),
      }))
      .filter((c) => c.income > 0 || c.expense > 0);

    // Largest absolute movement first — the categories that matter.
    rows.sort((a, b) => Math.abs(b.net) - Math.abs(a.net));
    return rows.slice(0, limit);
  }, [categories, limit]);

  const hasActivity = data.length > 0;

  return (
    <ChartCard
      title="Where Money Moved"
      subtitle="Income to the right, spending to the left, by category"
    >
      {loading ? (
        <SkeletonLoader className="h-full w-full rounded-lg" />
      ) : !hasActivity ? (
        <div className="flex-1 flex items-center justify-center">
          <EmptyState
            icon={Wallet}
            title="No categorised activity"
            description="Transactions you record will be grouped here so you can see exactly where the money goes."
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
              tickFormatter={(v) => formatCurrency(Math.abs(v), currency).replace(/\.00$/, "")}
            />
            <YAxis
              type="category"
              dataKey="label"
              width={120}
              tick={{ fontSize: 11, fill: "var(--color-text-tertiary)" }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              content={<CategoryTooltip currency={currency} />}
              cursor={{ fill: "var(--color-surface-2)" }}
            />
            <Bar dataKey="income" name="In" fill="var(--color-emerald-500)" maxBarSize={14} />
            <Bar dataKey="expenseLeft" name="Out" fill="var(--color-coral-500)" maxBarSize={14} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </ChartCard>
  );
}
