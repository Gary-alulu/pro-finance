"use client";
// components/journal/JournalOverviewHeader.js
// Header and metric summary cards for the Financial Command Journal.

import { Plus, BookOpen, Clock, CheckCircle2, Tag } from "lucide-react";

export default function JournalOverviewHeader({ metrics, onNewEntry }) {
  const m = metrics || {
    totalActive: 0,
    followUpsPending: 0,
    followUpsOverdue: 0,
    followUpsCompleted: 0,
  };

  return (
    <div className="space-y-6">
      {/* Top Title & Primary Action */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight" style={{ color: "var(--color-text-primary)" }}>
              Financial Command Journal
            </h1>
            <span
              className="text-xs font-semibold px-2.5 py-0.5 rounded-full flex items-center gap-1"
              style={{
                background: "rgba(16, 185, 129, 0.12)",
                color: "#10b981",
              }}
            >
              <BookOpen size={12} />
              Decision & Accountability
            </span>
          </div>
          <p className="text-sm mt-1" style={{ color: "var(--color-text-tertiary)" }}>
            Capture the context and reasoning behind financial decisions, track follow-up reviews, and build lessons over time.
          </p>
        </div>

        <button
          type="button"
          onClick={onNewEntry}
          className="px-4 py-2.5 rounded-xl bg-[var(--color-primary,#10b981)] text-white font-semibold text-sm transition-all hover:opacity-90 flex items-center gap-2 shadow-sm"
        >
          <Plus size={16} />
          New Decision Entry
        </button>
      </div>

      {/* 4 Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Total Decisions */}
        <div
          className="rounded-2xl p-5 flex flex-col justify-between"
          style={{
            background: "var(--color-surface)",
            border: "1px solid var(--color-border)",
            boxShadow: "var(--shadow-sm)",
          }}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium" style={{ color: "var(--color-text-secondary)" }}>
              Decision Entries
            </span>
            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-indigo-500/10 text-indigo-500">
              <BookOpen size={16} />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl font-bold font-mono" style={{ color: "var(--color-text-primary)" }}>
              {m.totalActive}
            </p>
            <p className="text-xs mt-0.5" style={{ color: "var(--color-text-tertiary)" }}>
              Recorded financial choices
            </p>
          </div>
        </div>

        {/* 2. Reviews Pending */}
        <div
          className="rounded-2xl p-5 flex flex-col justify-between"
          style={{
            background: "var(--color-surface)",
            border: "1px solid var(--color-border)",
            boxShadow: "var(--shadow-sm)",
          }}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium" style={{ color: "var(--color-text-secondary)" }}>
              Follow-Ups Pending
            </span>
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
              m.followUpsOverdue > 0 ? "bg-amber-500/10 text-amber-500" : "bg-sky-500/10 text-sky-500"
            }`}>
              <Clock size={16} />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl font-bold font-mono" style={{ color: "var(--color-text-primary)" }}>
              {m.followUpsPending}
            </p>
            <p className="text-xs mt-0.5" style={{ color: m.followUpsOverdue > 0 ? "#f59e0b" : "var(--color-text-tertiary)" }}>
              {m.followUpsOverdue > 0 ? `${m.followUpsOverdue} due for reflection` : "Scheduled check-ins"}
            </p>
          </div>
        </div>

        {/* 3. Completed Reviews */}
        <div
          className="rounded-2xl p-5 flex flex-col justify-between"
          style={{
            background: "var(--color-surface)",
            border: "1px solid var(--color-border)",
            boxShadow: "var(--shadow-sm)",
          }}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium" style={{ color: "var(--color-text-secondary)" }}>
              Completed Reviews
            </span>
            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-emerald-500/10 text-emerald-500">
              <CheckCircle2 size={16} />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl font-bold font-mono" style={{ color: "var(--color-text-primary)" }}>
              {m.followUpsCompleted}
            </p>
            <p className="text-xs mt-0.5" style={{ color: "var(--color-text-tertiary)" }}>
              Evaluated outcomes & lessons
            </p>
          </div>
        </div>

        {/* 4. Active Archived Count */}
        <div
          className="rounded-2xl p-5 flex flex-col justify-between"
          style={{
            background: "var(--color-surface)",
            border: "1px solid var(--color-border)",
            boxShadow: "var(--shadow-sm)",
          }}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium" style={{ color: "var(--color-text-secondary)" }}>
              Archived Entries
            </span>
            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-slate-500/10 text-slate-400">
              <Tag size={16} />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl font-bold font-mono" style={{ color: "var(--color-text-primary)" }}>
              {m.archivedCount ?? 0}
            </p>
            <p className="text-xs mt-0.5" style={{ color: "var(--color-text-tertiary)" }}>
              Archived historical memos
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
