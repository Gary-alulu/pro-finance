"use client";
// components/map/LiabilityNode.js
// Custom node for Liabilities on the financial map canvas.

import { memo } from "react";
import { Handle, Position } from "@xyflow/react";
import { Landmark } from "lucide-react";
import { formatCurrency } from "@/lib/finance/currency";

export default memo(function LiabilityNode({ data, selected }) {
  return (
    <div
      className={`relative p-3 rounded-xl bg-[var(--color-surface)] border shadow-sm transition-all min-w-[200px] cursor-pointer ${
        selected
          ? "ring-2 ring-[var(--color-coral-500)] border-[var(--color-coral-600)] shadow-md"
          : "border-[var(--color-border)] hover:border-[var(--color-border-strong)]"
      }`}
    >
      <Handle type="target" position={Position.Top} className="!bg-[var(--color-coral-500)]" />
      <Handle type="source" position={Position.Bottom} className="!bg-[var(--color-coral-500)]" />
      <Handle type="target" position={Position.Left} className="!bg-[var(--color-coral-500)]" />
      <Handle type="source" position={Position.Right} className="!bg-[var(--color-coral-500)]" />

      <div className="flex items-center justify-between gap-2">
        <span className="p-1 rounded bg-[var(--color-coral-50)] text-[var(--color-coral-600)]">
          <Landmark className="w-3.5 h-3.5" />
        </span>
        {data.interestRate && (
          <span className="text-[10px] font-semibold text-[var(--color-text-secondary)]">
            {data.interestRate}% APR
          </span>
        )}
      </div>

      <div className="mt-2">
        <h4 className="text-xs font-semibold text-[var(--color-text-primary)] line-clamp-1">
          {data.title}
        </h4>
        <div className="text-sm font-bold text-[var(--color-coral-600)] mt-0.5">
          {formatCurrency(data.amount, data.currency || "KES")}
        </div>
      </div>
    </div>
  );
});
