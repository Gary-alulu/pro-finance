"use client";
// components/simulator/AssumptionControls.js
// Interactive controls for scenario variables and time horizon.

import { PRESET_SCENARIOS } from "@/lib/simulator/engine";
import { Sliders, RotateCcw, Clock } from "lucide-react";

const TIME_HORIZONS = [1, 3, 5, 10, 15, 20];

export default function AssumptionControls({
  assumptions,
  timeHorizonYears,
  onChangeAssumptions,
  onChangeHorizon,
  currency = "KES",
  onReset,
}) {
  function update(field, val) {
    onChangeAssumptions({
      ...assumptions,
      [field]: Number(val),
    });
  }

  function applyPreset(presetKey) {
    const preset = PRESET_SCENARIOS[presetKey];
    if (!preset) return;
    onChangeAssumptions({
      ...assumptions,
      assumedAnnualReturnPct: preset.assumedAnnualReturnPct,
      inflationPct: preset.inflationPct,
      annualContributionIncreasePct: preset.annualContributionIncreasePct,
      otherAssetGrowthPct: preset.otherAssetGrowthPct,
    });
  }

  return (
    <div
      className="rounded-2xl p-6 flex flex-col gap-5"
      style={{
        background: "var(--color-surface)",
        border: "1px solid var(--color-border)",
        boxShadow: "var(--shadow-sm)",
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sliders size={18} style={{ color: "var(--color-primary, #10b981)" }} />
          <h3 className="text-sm font-bold" style={{ color: "var(--color-text-primary)" }}>
            Scenario Assumptions
          </h3>
        </div>
        <button
          type="button"
          onClick={onReset}
          className="text-xs flex items-center gap-1 hover:underline transition-opacity"
          style={{ color: "var(--color-text-tertiary)" }}
          title="Reset to default assumptions"
        >
          <RotateCcw size={12} />
          Reset
        </button>
      </div>

      {/* Preset pills */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-[11px]" style={{ color: "var(--color-text-tertiary)" }}>
          Presets:
        </span>
        {Object.entries(PRESET_SCENARIOS).map(([key, p]) => (
          <button
            key={key}
            type="button"
            onClick={() => applyPreset(key)}
            className="text-xs px-2.5 py-1 rounded-lg border font-medium transition-all hover:bg-[var(--color-surface-2)]"
            style={{
              borderColor: "var(--color-border)",
              color: "var(--color-text-secondary)",
            }}
          >
            {p.name}
          </button>
        ))}
      </div>

      {/* Time Horizon Selector */}
      <div className="space-y-2 border-t pt-4" style={{ borderColor: "var(--color-border)" }}>
        <div className="flex items-center justify-between text-xs">
          <label className="font-semibold flex items-center gap-1.5" style={{ color: "var(--color-text-secondary)" }}>
            <Clock size={13} />
            Projection Horizon
          </label>
          <span className="font-bold" style={{ color: "var(--color-primary, #10b981)" }}>
            {timeHorizonYears} Years ({timeHorizonYears * 12} Months)
          </span>
        </div>
        <div className="grid grid-cols-6 gap-1.5">
          {TIME_HORIZONS.map((yr) => (
            <button
              key={yr}
              type="button"
              onClick={() => onChangeHorizon(yr)}
              className={`text-xs py-1.5 rounded-lg border font-medium transition-all text-center ${
                timeHorizonYears === yr
                  ? "bg-[var(--color-primary, #10b981)] text-white font-bold border-transparent shadow-sm"
                  : "border-[var(--color-border)] hover:bg-[var(--color-surface-2)] text-[var(--color-text-secondary)]"
              }`}
            >
              {yr}y
            </button>
          ))}
        </div>
      </div>

      {/* ── Sliders and numeric fields ─────────────────────────────────────── */}
      <div className="space-y-4 border-t pt-4" style={{ borderColor: "var(--color-border)" }}>
        {/* Monthly Investment */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <label className="font-medium" style={{ color: "var(--color-text-secondary)" }}>
              Monthly Investment ({currency})
            </label>
            <input
              type="number"
              min={0}
              max={1000000}
              step={500}
              value={assumptions.monthlyInvestment ?? 0}
              onChange={(e) => update("monthlyInvestment", e.target.value)}
              className="w-24 text-right px-2 py-0.5 rounded border text-xs font-mono font-semibold"
              style={{
                background: "var(--color-surface-2)",
                borderColor: "var(--color-border)",
                color: "var(--color-text-primary)",
              }}
            />
          </div>
          <input
            type="range"
            min={0}
            max={50000}
            step={500}
            value={assumptions.monthlyInvestment ?? 0}
            onChange={(e) => update("monthlyInvestment", e.target.value)}
            className="w-full accent-[var(--color-primary,#10b981)] cursor-pointer"
          />
        </div>

        {/* Assumed Annual Return */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <label className="font-medium" style={{ color: "var(--color-text-secondary)" }}>
              Assumed Annual Return
            </label>
            <span className="font-mono font-bold" style={{ color: "var(--color-text-primary)" }}>
              {assumptions.assumedAnnualReturnPct ?? 8}% p.a.
            </span>
          </div>
          <input
            type="range"
            min={-5}
            max={20}
            step={0.5}
            value={assumptions.assumedAnnualReturnPct ?? 8}
            onChange={(e) => update("assumedAnnualReturnPct", e.target.value)}
            className="w-full accent-[var(--color-primary,#10b981)] cursor-pointer"
          />
          <div className="flex justify-between text-[10px]" style={{ color: "var(--color-text-tertiary)" }}>
            <span>-5% (Downturn)</span>
            <span>8% (Balanced)</span>
            <span>20% (High Growth)</span>
          </div>
        </div>

        {/* Annual Contribution Increase */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <label className="font-medium" style={{ color: "var(--color-text-secondary)" }}>
              Annual Contribution Step-Up
            </label>
            <span className="font-mono font-bold" style={{ color: "var(--color-text-primary)" }}>
              {assumptions.annualContributionIncreasePct ?? 0}% / yr
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={20}
            step={1}
            value={assumptions.annualContributionIncreasePct ?? 0}
            onChange={(e) => update("annualContributionIncreasePct", e.target.value)}
            className="w-full accent-[var(--color-primary,#10b981)] cursor-pointer"
          />
        </div>

        {/* Assumed Inflation Rate */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <label className="font-medium" style={{ color: "var(--color-text-secondary)" }}>
              Expected Inflation Rate
            </label>
            <span className="font-mono font-bold" style={{ color: "var(--color-text-primary)" }}>
              {assumptions.inflationPct ?? 3}% p.a.
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={15}
            step={0.5}
            value={assumptions.inflationPct ?? 3}
            onChange={(e) => update("inflationPct", e.target.value)}
            className="w-full accent-amber-500 cursor-pointer"
          />
        </div>

        {/* Other Asset Growth Rate */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <label className="font-medium" style={{ color: "var(--color-text-secondary)" }}>
              Property & Physical Assets Growth
            </label>
            <span className="font-mono font-bold" style={{ color: "var(--color-text-primary)" }}>
              {assumptions.otherAssetGrowthPct ?? 2}% p.a.
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={10}
            step={0.5}
            value={assumptions.otherAssetGrowthPct ?? 2}
            onChange={(e) => update("otherAssetGrowthPct", e.target.value)}
            className="w-full accent-[var(--color-primary,#10b981)] cursor-pointer"
          />
        </div>

        {/* Monthly Debt Payment */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <label className="font-medium" style={{ color: "var(--color-text-secondary)" }}>
              Monthly Debt Payment ({currency})
            </label>
            <input
              type="number"
              min={0}
              max={500000}
              step={500}
              value={assumptions.monthlyDebtPayment ?? 0}
              onChange={(e) => update("monthlyDebtPayment", e.target.value)}
              className="w-24 text-right px-2 py-0.5 rounded border text-xs font-mono font-semibold"
              style={{
                background: "var(--color-surface-2)",
                borderColor: "var(--color-border)",
                color: "var(--color-text-primary)",
              }}
            />
          </div>
          <input
            type="range"
            min={0}
            max={50000}
            step={500}
            value={assumptions.monthlyDebtPayment ?? 0}
            onChange={(e) => update("monthlyDebtPayment", e.target.value)}
            className="w-full accent-red-400 cursor-pointer"
          />
        </div>
      </div>
    </div>
  );
}
