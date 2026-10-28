"use client";
// components/map/DocumentNode.js
// Custom node for Documents on the financial map canvas.

import { memo } from "react";
import { Handle, Position } from "@xyflow/react";
import { FileText } from "lucide-react";

export default memo(function DocumentNode({ data, selected }) {
  const isApproved = data.status === "approved";

  return (
    <div
      className={`relative p-2.5 rounded-lg bg-[var(--color-surface)] border shadow-xs transition-all min-w-[170px] cursor-pointer text-xs ${
        selected
          ? "ring-2 ring-purple-500 border-purple-600 shadow-md"
          : "border-[var(--color-border)] hover:border-[var(--color-border-strong)]"
      }`}
    >
      <Handle type="target" position={Position.Top} className="!bg-purple-500" />
      <Handle type="source" position={Position.Bottom} className="!bg-purple-500" />
      <Handle type="target" position={Position.Left} className="!bg-purple-500" />
      <Handle type="source" position={Position.Right} className="!bg-purple-500" />

      <div className="flex items-center gap-2">
        <span
          className={`p-1 rounded ${
            isApproved
              ? "bg-[var(--color-emerald-50)] text-[var(--color-emerald-600)]"
              : "bg-[var(--color-gold-50)] text-[var(--color-gold-700)]"
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-[var(--color-text-primary)] line-clamp-1 text-[11px]">
            {data.hideLabel ? "Document" : data.title}
          </p>
          <p className="text-[10px] text-[var(--color-text-tertiary)] capitalize">
            {data.hideLabel
              ? data.documentType?.replace(/_/g, " ") || "Evidence"
              : isApproved
              ? "Verified Evidence"
              : "Awaiting Review"}
          </p>
        </div>
      </div>
    </div>
  );
});
