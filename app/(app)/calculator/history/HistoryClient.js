"use client";
// app/(app)/calculator/history/HistoryClient.js
// Interactive calculation history table with filtering, search, restore, and clear unstarred actions.

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { CALCULATOR_CATEGORIES } from "@/components/calculator/CalculatorConstants";
import { formatNumber } from "@/lib/finance/currency";
import {
  History,
  Search,
  Filter,
  Trash2,
  Bookmark,
  ExternalLink,
  ChevronRight,
  Clock,
  ArrowLeft,
  X,
} from "lucide-react";

export default function HistoryClient() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedType, setSelectedType] = useState("all");
  const [search, setSearch] = useState("");
  const [activeItem, setActiveItem] = useState(null);

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    try {
      const url = selectedType === "all" ? "/api/calculator/history" : `/api/calculator/history?type=${selectedType}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setItems(data.items || []);
      }
    } catch (err) {
      console.warn("Failed to fetch calculation history", err);
    } finally {
      setLoading(false);
    }
  }, [selectedType]);

  useEffect(() => {
    // Defer so the fetch's setState calls happen after the effect commits
    const t = setTimeout(fetchHistory, 0);
    return () => clearTimeout(t);
  }, [fetchHistory]);

  const handleClearUnstarred = async () => {
    if (!confirm("Are you sure you want to clear unstarred history? Bookmarked entries will be preserved.")) return;
    try {
      const res = await fetch("/api/calculator/history", { method: "DELETE" });
      if (res.ok) {
        fetchHistory();
      }
    } catch (err) {
      console.warn("Clear error", err);
    }
  };

  const handleToggleBookmark = async (item) => {
    try {
      const endpoint = item.isSaved ? `/api/calculator/saved/${item.id}` : "/api/calculator/saved";
      const method = item.isSaved ? "PATCH" : "POST";
      const body = item.isSaved ? { isSaved: false } : { calculationId: item.id };

      await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      fetchHistory();
    } catch (e) {
      console.warn("Bookmark toggle error", e);
    }
  };

  const filteredItems = items.filter((it) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      it.title?.toLowerCase().includes(q) ||
      it.calculatorType?.toLowerCase().includes(q) ||
      JSON.stringify(it.outputs || {}).toLowerCase().includes(q)
    );
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-neutral-800">
        <div className="flex items-center gap-3">
          <Link
            href="/calculator"
            className="p-2 rounded-xl bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-white"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
              <History className="w-5 h-5 text-emerald-400" />
              <span>Calculation History</span>
            </h1>
            <p className="text-xs text-neutral-400">Auditable log of calculations evaluated across the platform.</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleClearUnstarred}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-neutral-800 bg-neutral-900/60 hover:bg-neutral-800 text-neutral-400 hover:text-red-400 text-xs font-medium transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear Unstarred</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-neutral-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search calculations by title, values or outputs..."
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-white text-xs placeholder:text-neutral-500 focus:border-emerald-500 focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-white focus:border-emerald-500 focus:outline-none"
          >
            <option value="all">All Categories</option>
            {CALCULATOR_CATEGORIES.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* History List Table */}
      <div className="rounded-2xl border border-neutral-800 bg-neutral-900/40 overflow-hidden">
        {loading ? (
          <div className="py-12 text-center text-xs text-neutral-500">Loading history logs...</div>
        ) : filteredItems.length === 0 ? (
          <div className="py-16 text-center space-y-2">
            <Clock className="w-8 h-8 text-neutral-600 mx-auto" />
            <div className="text-sm font-semibold text-neutral-300">No calculations found</div>
            <p className="text-xs text-neutral-500 max-w-sm mx-auto">
              {search || selectedType !== "all"
                ? "No calculations matched your filter criteria."
                : "Calculations run in the Financial Calculator will appear here."}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-neutral-800/80">
            {filteredItems.map((item) => {
              const catMeta = CALCULATOR_CATEGORIES.find((c) => c.id === item.calculatorType) || {
                name: item.calculatorType,
                badge: "Custom",
              };
              const dateStr = item.createdAt ? format(new Date(item.createdAt), "MMM d, yyyy · HH:mm") : "";

              return (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-4 hover:bg-neutral-800/30 transition-colors"
                >
                  <div
                    className="flex-1 min-w-0 pr-4 cursor-pointer"
                    onClick={() => setActiveItem(item)}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-neutral-800 text-neutral-300 border border-neutral-700">
                        {catMeta.name}
                      </span>
                      <span className="text-[10px] text-neutral-500">{dateStr}</span>
                      {item.status === "converted" && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          Converted to Record
                        </span>
                      )}
                    </div>
                    <h3 className="text-sm font-semibold text-white truncate">{item.title}</h3>
                    <div className="font-mono text-xs text-emerald-400 mt-0.5">
                      {item.outputs?.result ||
                        item.outputs?.convertedAmount ||
                        item.outputs?.periodicRepayment ||
                        item.outputs?.finalBalance ||
                        item.outputs?.netWorth ||
                        item.outputs?.total ||
                        "Completed"}
                      {" "}
                      <span className="text-neutral-500 text-[10px]">{item.currency || "KES"}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleToggleBookmark(item)}
                      className={`p-2 rounded-xl border transition-colors ${
                        item.isSaved
                          ? "bg-amber-500/10 border-amber-500/30 text-amber-400"
                          : "border-neutral-800 bg-neutral-900 text-neutral-400 hover:text-white"
                      }`}
                      title={item.isSaved ? "Remove from Saved" : "Bookmark to Saved"}
                    >
                      <Bookmark className={`w-3.5 h-3.5 ${item.isSaved ? "fill-amber-400" : ""}`} />
                    </button>

                    <Link
                      href={`/calculator?category=${item.calculatorType}`}
                      className="p-2 rounded-xl border border-neutral-800 bg-neutral-900 text-neutral-400 hover:text-white"
                      title="Open in Calculator"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {activeItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="relative w-full max-w-lg rounded-2xl border border-neutral-800 bg-neutral-900 p-6 shadow-2xl space-y-4">
            <button
              type="button"
              onClick={() => setActiveItem(null)}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-neutral-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <span className="text-[10px] font-semibold text-emerald-400 uppercase tracking-wider">
                {activeItem.calculatorType} calculation log
              </span>
              <h2 className="text-lg font-bold text-white mt-1">{activeItem.title}</h2>
              <div className="text-xs text-neutral-500">
                Created: {format(new Date(activeItem.createdAt), "MMMM d, yyyy at HH:mm:ss")}
              </div>
            </div>

            <div className="space-y-3 pt-2 border-t border-neutral-800">
              <div>
                <div className="text-xs font-semibold text-neutral-400 mb-1">Inputs</div>
                <pre className="p-3 rounded-xl bg-neutral-950 border border-neutral-800 font-mono text-xs text-neutral-300 overflow-x-auto">
                  {JSON.stringify(activeItem.inputs, null, 2)}
                </pre>
              </div>

              <div>
                <div className="text-xs font-semibold text-neutral-400 mb-1">Outputs</div>
                <pre className="p-3 rounded-xl bg-neutral-950 border border-neutral-800 font-mono text-xs text-emerald-400 overflow-x-auto">
                  {JSON.stringify(activeItem.outputs, null, 2)}
                </pre>
              </div>

              {activeItem.actionHistory?.length > 0 && (
                <div>
                  <div className="text-xs font-semibold text-neutral-400 mb-1">Conversion Audit Trail</div>
                  <div className="space-y-1 text-xs text-neutral-300">
                    {activeItem.actionHistory.map((act, i) => (
                      <div key={i} className="p-2 rounded-lg bg-neutral-950 border border-neutral-800">
                        <span className="text-emerald-400 font-semibold">{act.actionType}</span>: {act.summary}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Link
                href={`/calculator?category=${activeItem.calculatorType}`}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold"
              >
                Launch in Calculator
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

