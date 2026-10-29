"use client";
// app/(app)/simulator/SimulatorClient.js
// Wealth Simulator & Future Self — Main interactive client.

import { useState, useEffect, useMemo } from "react";
import { ShieldCheck, Compass } from "lucide-react";
import { projectWealth, DEFAULT_ASSUMPTIONS } from "@/lib/simulator/engine";
import ProjectionChart from "@/components/simulator/ProjectionChart";
import AssumptionControls from "@/components/simulator/AssumptionControls";
import SimulatorMetrics from "@/components/simulator/SimulatorMetrics";
import SnapshotCard from "@/components/simulator/SnapshotCard";
import ScenarioSelector from "@/components/simulator/ScenarioSelector";

export default function SimulatorClient({ initialUser }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [snapshot, setSnapshot] = useState(null);
  const [snapshotMeta, setSnapshotMeta] = useState(null);
  const [scenarios, setScenarios] = useState([]);
  const [activeScenarioId, setActiveScenarioId] = useState(null);

  // Active editable state
  const [assumptions, setAssumptions] = useState(DEFAULT_ASSUMPTIONS);
  const [timeHorizonYears, setTimeHorizonYears] = useState(5);
  const [isDirty, setIsDirty] = useState(false);

  // Load initial data on mount
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        setLoading(true);
        const [snapRes, scenRes] = await Promise.all([
          fetch("/api/simulator/base-snapshot"),
          fetch("/api/simulator/scenarios"),
        ]);

        if (!cancelled && snapRes.ok) {
          const snapData = await snapRes.json();
          setSnapshot(snapData.snapshot);
          setSnapshotMeta(snapData.meta);
        }

        if (!cancelled && scenRes.ok) {
          const scenData = await scenRes.json();
          const loaded = scenData.scenarios || [];
          setScenarios(loaded);
          if (loaded.length > 0) {
            const first = loaded[0];
            setActiveScenarioId(first.id);
            setAssumptions(first.assumptions || DEFAULT_ASSUMPTIONS);
            setTimeHorizonYears(first.timeHorizonYears || 5);
          }
        }
      } catch (err) {
        console.error("Failed to load simulator data:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  // Switch scenario
  function handleSelectScenario(id) {
    const s = scenarios.find((item) => item.id === id);
    if (!s) return;
    setActiveScenarioId(id);
    setAssumptions(s.assumptions || DEFAULT_ASSUMPTIONS);
    setTimeHorizonYears(s.timeHorizonYears || 5);
    setIsDirty(false);
  }

  // Change assumptions
  function handleChangeAssumptions(newAssumptions) {
    setAssumptions(newAssumptions);
    setIsDirty(true);
  }

  // Change horizon
  function handleChangeHorizon(newHorizon) {
    setTimeHorizonYears(newHorizon);
    setIsDirty(true);
  }

  // Save current scenario changes
  async function handleSaveScenario(patch = {}) {
    if (!activeScenarioId) return;
    try {
      setSaving(true);
      const payload = {
        assumptions,
        timeHorizonYears,
        ...patch,
      };

      const res = await fetch(`/api/simulator/scenarios/${activeScenarioId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const data = await res.json();
        setScenarios((prev) =>
          prev.map((s) => (s.id === activeScenarioId ? { ...s, ...data.scenario } : s))
        );
        setIsDirty(false);
      }
    } catch (e) {
      console.error("Failed to save scenario:", e);
    } finally {
      setSaving(false);
    }
  }

  // Create new scenario
  async function handleCreateScenario() {
    try {
      setSaving(true);
      const name = `Scenario ${scenarios.length + 1}`;
      const res = await fetch("/api/simulator/scenarios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          timeHorizonYears,
          assumptions,
          baseSnapshot: snapshot,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const created = data.scenario;
        setScenarios((prev) => [created, ...prev]);
        setActiveScenarioId(created.id || created._id);
        setIsDirty(false);
      }
    } catch (e) {
      console.error("Failed to create scenario:", e);
    } finally {
      setSaving(false);
    }
  }

  // Duplicate active scenario
  async function handleDuplicateScenario() {
    const current = scenarios.find((s) => s.id === activeScenarioId);
    if (!current) return;
    try {
      setSaving(true);
      const name = `${current.name} (Copy)`;
      const res = await fetch("/api/simulator/scenarios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          timeHorizonYears: current.timeHorizonYears,
          assumptions: current.assumptions,
          baseSnapshot: snapshot,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const created = data.scenario;
        setScenarios((prev) => [created, ...prev]);
        setActiveScenarioId(created.id || created._id);
        setIsDirty(false);
      }
    } catch (e) {
      console.error("Failed to duplicate scenario:", e);
    } finally {
      setSaving(false);
    }
  }

  // Archive scenario
  async function handleDeleteScenario(id) {
    if (!confirm("Are you sure you want to archive this scenario?")) return;
    try {
      const res = await fetch(`/api/simulator/scenarios/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        const remaining = scenarios.filter((s) => s.id !== id);
        setScenarios(remaining);
        if (remaining.length > 0) {
          handleSelectScenario(remaining[0].id);
        }
      }
    } catch (e) {
      console.error("Failed to archive scenario:", e);
    }
  }

  // Reset assumptions to baseline
  function handleReset() {
    setAssumptions(DEFAULT_ASSUMPTIONS);
    setIsDirty(true);
  }

  // Live deterministic simulation calculation
  const simulationResult = useMemo(() => {
    return projectWealth({
      snapshot: snapshot || {},
      assumptions,
      timeHorizonYears,
    });
  }, [snapshot, assumptions, timeHorizonYears]);

  const currency = snapshot?.currency || "KES";

  return (
    <div className="space-y-6 pb-12 max-w-7xl mx-auto">
      {/* ── Page Header ─────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight" style={{ color: "var(--color-text-primary)" }}>
              Wealth Simulator & Future Self
            </h1>
            <span
              className="text-xs font-semibold px-2.5 py-0.5 rounded-full flex items-center gap-1"
              style={{
                background: "rgba(16, 185, 129, 0.12)",
                color: "#10b981",
              }}
            >
              <Compass size={12} />
              Future Planning
            </span>
          </div>
          <p className="text-sm mt-1" style={{ color: "var(--color-text-tertiary)" }}>
            Explore how different savings, investment rates, returns, and debt decisions impact your net worth over 1, 3, 5, or 10 years.
          </p>
        </div>
      </div>

      {/* ── Scenario Selection Bar ────────────────────────────────────────── */}
      <ScenarioSelector
        scenarios={scenarios}
        activeScenarioId={activeScenarioId}
        onSelectScenario={handleSelectScenario}
        onCreateScenario={handleCreateScenario}
        onDuplicateScenario={handleDuplicateScenario}
        onSaveScenario={handleSaveScenario}
        onDeleteScenario={handleDeleteScenario}
        isDirty={isDirty}
        saving={saving}
      />

      {/* ── Core Metric Cards ─────────────────────────────────────────────── */}
      <SimulatorMetrics
        summary={simulationResult.summary}
        currency={currency}
        timeHorizonYears={timeHorizonYears}
      />

      {/* ── Main Workspace Grid (Chart + Snapshot vs Assumptions) ──────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Left Column (2/3): Trajectory Chart + Base Snapshot */}
        <div className="lg:col-span-2 space-y-6">
          <ProjectionChart
            projections={simulationResult.projections}
            currency={currency}
            timeHorizonYears={timeHorizonYears}
          />

          <SnapshotCard
            snapshot={snapshot}
            meta={snapshotMeta}
            currency={currency}
            loading={loading}
          />
        </div>

        {/* Right Column (1/3): Editable Assumption Controls */}
        <div className="lg:col-span-1 space-y-6">
          <AssumptionControls
            assumptions={assumptions}
            timeHorizonYears={timeHorizonYears}
            onChangeAssumptions={handleChangeAssumptions}
            onChangeHorizon={handleChangeHorizon}
            currency={currency}
            onReset={handleReset}
          />

          {/* Planning vs Guarantee Disclosure Box */}
          <div
            className="rounded-2xl p-5 border text-xs space-y-2"
            style={{
              background: "var(--color-surface)",
              borderColor: "var(--color-border)",
              color: "var(--color-text-secondary)",
            }}
          >
            <div className="flex items-center gap-1.5 font-bold" style={{ color: "var(--color-text-primary)" }}>
              <ShieldCheck size={14} className="text-emerald-500" />
              <span>Mathematical Planning Engine</span>
            </div>
            <p style={{ color: "var(--color-text-tertiary)", lineHeight: 1.6 }}>
              This model calculates deterministic compound growth based on your verified starting balances and chosen assumptions. It does not alter your live financial records or guarantee market returns.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
