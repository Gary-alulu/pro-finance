"use client";
// components/map/AssetNode.js
// Custom node for Assets on the financial map canvas with freshness border indicator.

import { memo } from "react";
import { Handle, Position } from "@xyflow/react";
import { Building2 } from "lucide-react";
import { formatCurrency } from "@/lib/finance/currency";

export default memo(function AssetNode({ data, selected }) {
  const isStale = data.status === "stale";
  const isWarning = data.status === "warning";

  return (
    <div
      className={`relative p-3 rounded-xl bg-[var(--color-surface)] border shadow-sm transition-all min-w-[200px] cursor-pointer ${
        selected
          ? "ring-2 ring-[var(--color-emerald-500)] border-[var(--color-emerald-600)] shadow-md"
          : isStale
          ? "border-[var(--color-coral-500)] border-dashed"
          : isWarning
          ? "border-[var(--color-gold-400)]"
          : "border-[var(--color-border)] hover:border-[var(--color-border-strong)]"
      }`}
    >
      <Handle type="target" position={Position.Top} className="!bg-[var(--color-emerald-500)]" />
      <Handle type="source" position={Position.Bottom} className="!bg-[var(--color-emerald-500)]" />
      <Handle type="target" position={Position.Right} className="!bg-[var(--color-emerald-500)]" />
      <Handle type="source" position={Position.Left} className="!bg-[var(--color-emerald-500)]" />

      <div className="flex items-center justify-between gap-2">
        <span className="p-1 rounded bg-[var(--color-emerald-50)] text-[var(--color-emerald-600)]">
          <Building2 className="w-3.5 h-3.5" />
        </span>
        {data.hideLabel ? (
          <span className="text-[10px] font-semibold text-[var(--color-text-tertiary)]">
            Asset
          </span>
        ) : (
          <span
            className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
              isStale
                ? "bg-[var(--color-coral-50)] text-[var(--color-coral-700)]"
                : isWarning
                ? "bg-[var(--color-gold-50)] text-[var(--color-gold-700)]"
                : "bg-[var(--color-emerald-50)] text-[var(--color-emerald-700)]"
            }`}
          >
            {isStale ? "Stale Valuation" : isWarning ? "Review Soon" : "Verified"}
          </span>
        )}
      </div>

      <div className="mt-2">
        <h4 className="text-xs font-semibold text-[var(--color-text-primary)] line-clamp-1">
          {data.hideLabel ? "Asset" : data.title}
        </h4>
        <div className="text-sm font-bold text-[var(--color-text-primary)] mt-0.5">
          {data.maskAmount ? "••••" : formatCurrency(data.amount, data.currency || "KES")}
        </div>
      </div>
    </div>
  );
});
