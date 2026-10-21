"use client";
// components/map/CenterNode.js
// Custom node representing the core Wealth Center / User Net Worth anchor.

import { memo } from "react";
import { Handle, Position } from "@xyflow/react";
import { Shield, Sparkles } from "lucide-react";

export default memo(function CenterNode({ data }) {
  return (
    <div className="relative p-4 rounded-2xl bg-[var(--color-surface)] border-2 border-[var(--color-emerald-500)] shadow-lg min-w-[180px] text-center select-none">
      <Handle type="source" position={Position.Top} className="!bg-[var(--color-emerald-500)]" />
      <Handle type="source" position={Position.Bottom} className="!bg-[var(--color-emerald-500)]" />
      <Handle type="target" position={Position.Left} className="!bg-[var(--color-emerald-500)]" />
      <Handle type="target" position={Position.Right} className="!bg-[var(--color-emerald-500)]" />

      <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-[var(--color-emerald-700)] uppercase tracking-wider">
        <Sparkles className="w-3.5 h-3.5" />
        {data.label || "Wealth Core"}
      </div>
      <p className="text-[11px] text-[var(--color-text-secondary)] mt-0.5">
        {data.subtitle || "Connected Balance Sheet"}
      </p>
    </div>
  );
});
