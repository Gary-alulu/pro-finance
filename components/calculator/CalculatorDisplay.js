"use client";
// components/calculator/CalculatorDisplay.js
// Standardized calculation display showing expression breadcrumbs, formatted results,
// status badges, and instant utilities (copy, clear, bookmark, convert).

import { useState } from "react";
import { Copy, Check, Bookmark, ArrowRight, RotateCcw } from "lucide-react";

export default function CalculatorDisplay({
  expression = "",
  mainValue = "0.00",
  currency = "KES",
  mode = "standalone",
  isSaved = false,
  subtitle = "",
  onClear,
  onSave,
  onOpenActionPanel,
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(mainValue.toString().replace(/,/g, ""));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  return (
    <div className="rounded-2xl border border-neutral-800 bg-gradient-to-b from-neutral-900 to-neutral-950 p-5 shadow-xl relative overflow-hidden">
      {/* Top row: Expression / Subtitle & Mode Badge */}
      <div className="flex items-center justify-between text-xs mb-2">
        <div className="font-mono text-neutral-400 truncate max-w-[70%]">
          {expression || subtitle || "Ready"}
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`px-2 py-0.5 rounded-full font-medium text-[10px] tracking-wide uppercase ${
              mode === "integrated"
                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                : "bg-neutral-800 text-neutral-400 border border-neutral-700"
            }`}
          >
            {mode === "integrated" ? "Platform-Connected" : "Standalone"}
          </span>
          {isSaved && (
            <span className="px-2 py-0.5 rounded-full font-medium text-[10px] bg-amber-500/10 text-amber-400 border border-amber-500/20">
              Saved
            </span>
          )}
        </div>
      </div>

      {/* Main calculation value display */}
      <div className="flex items-baseline justify-between py-2 border-b border-neutral-800/60">
        <span className="text-sm font-semibold tracking-wider text-emerald-400 select-none">
          {currency}
        </span>
        <div className="text-right font-mono text-3xl sm:text-4xl font-bold tracking-tight text-white select-all overflow-x-auto scrollbar-none">
          {mainValue}
        </div>
      </div>

      {/* Action tool bar */}
      <div className="flex items-center justify-between pt-3 text-xs text-neutral-400">
        <div className="flex items-center gap-2">
          {onClear && (
            <button
              type="button"
              onClick={onClear}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-neutral-800 bg-neutral-900/60 hover:bg-neutral-800 hover:text-white transition-colors"
              title="Clear calculation"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Clear</span>
            </button>
          )}
          <button
            type="button"
            onClick={handleCopy}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-neutral-800 bg-neutral-900/60 hover:bg-neutral-800 hover:text-white transition-colors"
            title="Copy raw numeric value"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy</span>
              </>
            )}
          </button>
          {onSave && (
            <button
              type="button"
              onClick={onSave}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg border transition-colors ${
                isSaved
                  ? "border-amber-500/30 bg-amber-500/10 text-amber-400"
                  : "border-neutral-800 bg-neutral-900/60 hover:bg-neutral-800 hover:text-white"
              }`}
              title="Save to bookmarks"
            >
              <Bookmark className={`w-3.5 h-3.5 ${isSaved ? "fill-amber-400" : ""}`} />
              <span>{isSaved ? "Saved" : "Save"}</span>
            </button>
          )}
        </div>

        {onOpenActionPanel && (
          <button
            type="button"
            onClick={onOpenActionPanel}
            className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium shadow-sm transition-colors text-xs"
          >
            <span>Convert to Action</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}

