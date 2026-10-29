"use client";
// components/simulator/ScenarioSelector.js
// Header bar for switching, creating, duplicating, and saving scenarios.

import { useState } from "react";
import { Folder, Plus, Copy, Trash2, Check, Edit2, BookmarkCheck } from "lucide-react";

export default function ScenarioSelector({
  scenarios = [],
  activeScenarioId,
  onSelectScenario,
  onCreateScenario,
  onDuplicateScenario,
  onSaveScenario,
  onDeleteScenario,
  isDirty = false,
  saving = false,
}) {
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameInput, setNameInput] = useState("");

  const activeScenario = scenarios.find((s) => s.id === activeScenarioId) || scenarios[0];

  function startRename() {
    if (!activeScenario) return;
    setNameInput(activeScenario.name);
    setIsEditingName(true);
  }

  function submitRename() {
    if (nameInput.trim()) {
      onSaveScenario({ name: nameInput.trim() });
    }
    setIsEditingName(false);
  }

  return (
    <div
      className="rounded-2xl p-4 flex items-center justify-between flex-wrap gap-4"
      style={{
        background: "var(--color-surface)",
        border: "1px solid var(--color-border)",
        boxShadow: "var(--shadow-sm)",
      }}
    >
      {/* Left: Scenario Selector Dropdown & Renaming */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Folder size={18} style={{ color: "var(--color-primary, #10b981)" }} />
          <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--color-text-tertiary)" }}>
            Scenario:
          </span>
        </div>

        {isEditingName ? (
          <div className="flex items-center gap-1.5">
            <input
              type="text"
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              className="text-sm font-bold px-2 py-1 rounded border"
              style={{
                background: "var(--color-surface-2)",
                borderColor: "var(--color-border)",
                color: "var(--color-text-primary)",
              }}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") submitRename();
                if (e.key === "Escape") setIsEditingName(false);
              }}
            />
            <button
              type="button"
              onClick={submitRename}
              className="p-1.5 rounded-lg bg-emerald-500 text-white"
            >
              <Check size={14} />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <select
              value={activeScenarioId || ""}
              onChange={(e) => onSelectScenario(e.target.value)}
              className="text-sm font-bold py-1 px-3 rounded-lg border cursor-pointer outline-none"
              style={{
                background: "var(--color-surface-2)",
                borderColor: "var(--color-border)",
                color: "var(--color-text-primary)",
              }}
            >
              {scenarios.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} {s.isDefault ? "(Baseline)" : ""}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={startRename}
              className="p-1 rounded hover:bg-[var(--color-surface-2)] transition-colors"
              style={{ color: "var(--color-text-tertiary)" }}
              title="Rename scenario"
            >
              <Edit2 size={13} />
            </button>
          </div>
        )}

        {isDirty && (
          <span className="text-[11px] font-medium text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-full">
            Unsaved assumptions
          </span>
        )}
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Save button */}
        {isDirty && (
          <button
            type="button"
            onClick={() => onSaveScenario()}
            disabled={saving}
            className="text-xs px-3 py-1.5 rounded-lg bg-[var(--color-primary,#10b981)] text-white font-semibold transition-all hover:opacity-90 flex items-center gap-1.5 shadow-sm"
          >
            <BookmarkCheck size={13} />
            {saving ? "Saving…" : "Save Scenario"}
          </button>
        )}

        {/* Duplicate button */}
        <button
          type="button"
          onClick={onDuplicateScenario}
          className="text-xs px-3 py-1.5 rounded-lg border font-medium transition-all hover:bg-[var(--color-surface-2)] flex items-center gap-1.5"
          style={{
            borderColor: "var(--color-border)",
            color: "var(--color-text-secondary)",
          }}
          title="Duplicate current scenario"
        >
          <Copy size={13} />
          Duplicate
        </button>

        {/* New scenario button */}
        <button
          type="button"
          onClick={onCreateScenario}
          className="text-xs px-3 py-1.5 rounded-lg border font-medium transition-all hover:bg-[var(--color-surface-2)] flex items-center gap-1.5"
          style={{
            borderColor: "var(--color-border)",
            color: "var(--color-text-secondary)",
          }}
        >
          <Plus size={13} />
          New Scenario
        </button>

        {/* Delete button (if not default) */}
        {activeScenario && !activeScenario.isDefault && scenarios.length > 1 && (
          <button
            type="button"
            onClick={() => onDeleteScenario(activeScenario.id)}
            className="p-1.5 rounded-lg border transition-all hover:bg-red-500/10 hover:border-red-500/30 text-red-400"
            style={{ borderColor: "var(--color-border)" }}
            title="Archive this scenario"
          >
            <Trash2 size={13} />
          </button>
        )}
      </div>
    </div>
  );
}
