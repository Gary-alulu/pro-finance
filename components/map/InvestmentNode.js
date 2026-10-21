"use client";
// components/map/InvestmentNode.js
// Custom node for Investment holdings on the financial map canvas.

import { memo } from "react";
import { Handle, Position } from "@xyflow/react";
import { LineChart } from "lucide-react";
import { formatCurrency } from "@/lib/finance/currency";

export default memo(function InvestmentNode({ data, selected }) {
  return (
    <div
      className={`relative p-3 rounded-xl bg-[var(--color-surface)] border shadow-sm transition-all min-w-[190px] cursor-pointer ${
        selected
          ? "ring-2 ring-sky-500 border-sky-600 shadow-md"
          : "border-[var(--color-border)] hover:border-[var(--color-border-strong)]"
      }`}
    >
      <Handle type="target" position={Position.Top} className="!bg-sky-500" />
      <Handle type="source" position={Position.Bottom} className="!bg-sky-500" />
      <Handle type="target" position={Position.Left} className="!bg-sky-500" />
      <Handle type="source" position={Position.Right} className="!bg-sky-500" />

      <div className="flex items-center justify-between gap-2">
        <span className="p-1 rounded bg-sky-50 text-sky-600">
          <LineChart className="w-3.5 h-3.5" />
        </span>
        {data.ticker && (
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[var(--color-surface-2)] text-[var(--color-text-secondary)]">
            {data.ticker}
          </span>
        )}
      </div>

      <div className="mt-2">
        <h4 className="text-xs font-semibold text-[var(--color-text-primary)] line-clamp-1">
          {data.title}
        </h4>
        <div className="text-sm font-bold text-[var(--color-text-primary)] mt-0.5">
          {formatCurrency(data.amount, data.currency || "KES")}
        </div>
      </div>
    </div>
  );
});
