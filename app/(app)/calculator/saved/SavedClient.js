"use client";
// app/(app)/calculator/saved/SavedClient.js
// Manager for bookmarked calculations, custom titles, notes, and tags.

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { CALCULATOR_CATEGORIES } from "@/components/calculator/CalculatorConstants";
import { formatNumber } from "@/lib/finance/currency";
import {
  Bookmark,
  Search,
  Trash2,
  Edit3,
  ExternalLink,
  ArrowLeft,
  Tag,
  Check,
  X,
} from "lucide-react";

export default function SavedClient() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [editingItem, setEditingItem] = useState(null);
  const [editTitle, setEditTitle] = useState("");
  const [editNotes, setEditNotes] = useState("");

  const fetchSaved = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/calculator/saved");
      if (res.ok) {
        const data = await res.json();
        setItems(data.items || []);
      }
    } catch (e) {
      console.warn("Failed to load saved calculations", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Defer so the fetch's setState calls happen after the effect commits
    const t = setTimeout(fetchSaved, 0);
    return () => clearTimeout(t);
  }, [fetchSaved]);

  const handleDelete = async (id) => {
    if (!confirm("Remove this calculation from saved bookmarks?")) return;
    try {
      await fetch(`/api/calculator/saved/${id}`, { method: "DELETE" });
      fetchSaved();
    } catch (e) {
      console.warn("Delete error", e);
    }
  };

  const handleStartEdit = (item) => {
    setEditingItem(item);
    setEditTitle(item.title);
    setEditNotes(item.notes || "");
  };

  const handleSaveEdit = async () => {
    if (!editingItem) return;
    try {
      await fetch(`/api/calculator/saved/${editingItem.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: editTitle,
          notes: editNotes,
        }),
      });
      setEditingItem(null);
      fetchSaved();
    } catch (e) {
      console.warn("Update error", e);
    }
  };

  const filteredItems = items.filter((it) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      it.title?.toLowerCase().includes(q) ||
      it.notes?.toLowerCase().includes(q) ||
      it.calculatorType?.toLowerCase().includes(q)
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
              <Bookmark className="w-5 h-5 text-amber-400 fill-amber-400" />
              <span>Saved Calculations</span>
            </h1>
            <p className="text-xs text-neutral-400">Bookmarked calculations, plans, and working assumptions.</p>
          </div>
        </div>

        <Link
          href="/calculator"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-sm transition-colors"
        >
          <span>New Calculation</span>
        </Link>
      </div>

      {/* Search Bar */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-2.5 w-4 h-4 text-neutral-500" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search saved calculations by title or notes..."
          className="w-full pl-9 pr-4 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-white text-xs placeholder:text-neutral-500 focus:border-amber-500 focus:outline-none"
        />
      </div>

      {/* Grid of Saved Cards */}
      {loading ? (
        <div className="py-12 text-center text-xs text-neutral-500">Loading saved items...</div>
      ) : filteredItems.length === 0 ? (
        <div className="py-16 text-center space-y-2 rounded-2xl border border-neutral-800 bg-neutral-900/20">
          <Bookmark className="w-8 h-8 text-neutral-600 mx-auto" />
          <div className="text-sm font-semibold text-neutral-300">No saved calculations</div>
          <p className="text-xs text-neutral-500 max-w-sm mx-auto">
            Click the &quot;Save&quot; bookmark button on any calculator result to pin it here for quick reference.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredItems.map((item) => {
            const catMeta = CALCULATOR_CATEGORIES.find((c) => c.id === item.calculatorType) || {
              name: item.calculatorType,
            };
            const dateStr = item.createdAt ? format(new Date(item.createdAt), "MMM d, yyyy") : "";

            return (
              <div
                key={item.id}
                className="flex flex-col justify-between p-5 rounded-2xl border border-neutral-800 bg-neutral-900/40 hover:border-neutral-700 transition-all space-y-4"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-neutral-800 text-neutral-300 border border-neutral-700">
                      {catMeta.name}
                    </span>
                    <span className="text-[10px] text-neutral-500">{dateStr}</span>
                  </div>

                  <h3 className="text-sm font-bold text-white line-clamp-1">{item.title}</h3>

                  <div className="font-mono text-lg font-bold text-emerald-400">
                    {item.outputs?.result ||
                      item.outputs?.convertedAmount ||
                      item.outputs?.periodicRepayment ||
                      item.outputs?.finalBalance ||
                      item.outputs?.netWorth ||
                      item.outputs?.total ||
                      "Calculated"}{" "}
                    <span className="text-xs text-neutral-500 font-normal">{item.currency || "KES"}</span>
                  </div>

                  {item.notes && (
                    <p className="text-xs text-neutral-400 line-clamp-2 bg-neutral-950/60 p-2.5 rounded-xl border border-neutral-800/60">
                      {item.notes}
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-neutral-800/80">
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleStartEdit(item)}
                      className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800"
                      title="Edit Title & Notes"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(item.id)}
                      className="p-1.5 rounded-lg text-neutral-400 hover:text-red-400 hover:bg-neutral-800"
                      title="Delete Bookmark"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <Link
                    href={`/calculator?category=${item.calculatorType}`}
                    className="flex items-center gap-1 text-xs text-emerald-400 hover:text-emerald-300 font-medium"
                  >
                    <span>Open in Calculator</span>
                    <ExternalLink className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Edit Modal */}
      {editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="relative w-full max-w-md rounded-2xl border border-neutral-800 bg-neutral-900 p-6 shadow-2xl space-y-4">
            <button
              type="button"
              onClick={() => setEditingItem(null)}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-neutral-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-base font-bold text-white">Edit Saved Calculation</h3>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-neutral-400 mb-1">Title</label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-white text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-400 mb-1">Notes & Working Assumptions</label>
                <textarea
                  rows={3}
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  placeholder="Record why this was calculated..."
                  className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-white text-xs resize-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditingItem(null)}
                className="px-3 py-1.5 rounded-xl border border-neutral-800 hover:bg-neutral-800 text-neutral-300 text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveEdit}
                className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

