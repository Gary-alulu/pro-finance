"use client";
// components/journal/JournalFilterBar.js
// Search, category filtering, tag selection, and status toggles for Journal entries.

import { Search, Filter, X, Clock, Archive } from "lucide-react";
import { JOURNAL_CATEGORY_META } from "./JournalConstants";

export default function JournalFilterBar({
  search,
  onSearchChange,
  selectedCategory,
  onCategoryChange,
  categoryCounts = {},
  selectedTag,
  onTagChange,
  topTags = [],
  statusFilter,
  onStatusChange,
  followUpOnly,
  onFollowUpOnlyChange,
}) {
  return (
    <div
      className="rounded-2xl p-4 flex flex-col gap-4"
      style={{
        background: "var(--color-surface)",
        border: "1px solid var(--color-border)",
        boxShadow: "var(--shadow-sm)",
      }}
    >
      {/* Top search & toggles */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        {/* Search input */}
        <div className="relative flex-1 min-w-[240px]">
          <Search
            size={15}
            className="absolute left-3.5 top-1/2 -translate-y-1/2"
            style={{ color: "var(--color-text-tertiary)" }}
          />
          <input
            type="text"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search decisions, reasoning, tags, or outcomes…"
            className="w-full pl-9 pr-8 py-2 rounded-xl text-xs border outline-none transition-all focus:border-[var(--color-primary,#10b981)]"
            style={{
              background: "var(--color-surface-2)",
              borderColor: "var(--color-border)",
              color: "var(--color-text-primary)",
            }}
          />
          {search && (
            <button
              type="button"
              onClick={() => onSearchChange("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)]"
            >
              <X size={13} />
            </button>
          )}
        </div>

        {/* Action toggles: Follow-Up Due & Status */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => onFollowUpOnlyChange(!followUpOnly)}
            className={`text-xs px-3 py-1.5 rounded-lg border font-medium transition-all flex items-center gap-1.5 ${
              followUpOnly
                ? "bg-amber-500/10 border-amber-500/30 text-amber-500 font-semibold"
                : "border-[var(--color-border)] hover:bg-[var(--color-surface-2)] text-[var(--color-text-secondary)]"
            }`}
          >
            <Clock size={13} />
            Reviews Due
          </button>

          <div
            className="flex items-center p-0.5 rounded-lg border"
            style={{
              background: "var(--color-surface-2)",
              borderColor: "var(--color-border)",
            }}
          >
            <button
              type="button"
              onClick={() => onStatusChange("active")}
              className={`text-xs px-2.5 py-1 rounded-md transition-all font-medium ${
                statusFilter === "active"
                  ? "bg-[var(--color-surface)] text-[var(--color-text-primary)] shadow-sm font-semibold"
                  : "text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)]"
              }`}
            >
              Active
            </button>
            <button
              type="button"
              onClick={() => onStatusChange("archived")}
              className={`text-xs px-2.5 py-1 rounded-md transition-all font-medium flex items-center gap-1 ${
                statusFilter === "archived"
                  ? "bg-[var(--color-surface)] text-[var(--color-text-primary)] shadow-sm font-semibold"
                  : "text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)]"
              }`}
            >
              <Archive size={12} />
              Archived
            </button>
          </div>
        </div>
      </div>

      {/* Category Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        <button
          type="button"
          onClick={() => onCategoryChange("all")}
          className={`text-xs px-3 py-1.5 rounded-xl border font-medium flex-shrink-0 transition-all flex items-center gap-1.5 ${
            selectedCategory === "all"
              ? "bg-[var(--color-primary,#10b981)] text-white font-semibold border-transparent shadow-sm"
              : "border-[var(--color-border)] hover:bg-[var(--color-surface-2)] text-[var(--color-text-secondary)]"
          }`}
        >
          All Categories
        </button>

        {Object.entries(JOURNAL_CATEGORY_META).map(([catKey, meta]) => {
          const Icon = meta.icon;
          const count = categoryCounts[catKey] || 0;
          const isSelected = selectedCategory === catKey;

          return (
            <button
              key={catKey}
              type="button"
              onClick={() => onCategoryChange(catKey)}
              className={`text-xs px-3 py-1.5 rounded-xl border font-medium flex-shrink-0 transition-all flex items-center gap-1.5 ${
                isSelected
                  ? "border-transparent text-white font-semibold shadow-sm"
                  : "border-[var(--color-border)] hover:bg-[var(--color-surface-2)] text-[var(--color-text-secondary)]"
              }`}
              style={{
                backgroundColor: isSelected ? meta.color : undefined,
              }}
            >
              <Icon size={12} />
              <span>{meta.label}</span>
              {count > 0 && (
                <span
                  className="text-[10px] px-1.5 py-0.2 rounded-full font-bold"
                  style={{
                    background: isSelected ? "rgba(255,255,255,0.25)" : "var(--color-surface-2)",
                    color: isSelected ? "#fff" : "var(--color-text-tertiary)",
                  }}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tag Chips (if any exist) */}
      {topTags.length > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap border-t pt-2.5 text-xs" style={{ borderColor: "var(--color-border)" }}>
          <span className="text-[11px] font-medium" style={{ color: "var(--color-text-tertiary)" }}>
            Tags:
          </span>
          {topTags.map(({ tag }) => {
            const isSelected = selectedTag === tag;
            return (
              <button
                key={tag}
                type="button"
                onClick={() => onTagChange(isSelected ? null : tag)}
                className={`text-[11px] px-2 py-0.5 rounded-md border transition-all ${
                  isSelected
                    ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-400 font-semibold"
                    : "border-[var(--color-border)] hover:bg-[var(--color-surface-2)] text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)]"
                }`}
              >
                #{tag}
              </button>
            );
          })}
          {selectedTag && (
            <button
              type="button"
              onClick={() => onTagChange(null)}
              className="text-[11px] text-red-400 hover:underline ml-1"
            >
              Clear tag
            </button>
          )}
        </div>
      )}
    </div>
  );
}
