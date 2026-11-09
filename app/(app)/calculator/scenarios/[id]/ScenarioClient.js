"use client";
// app/(app)/calculator/scenarios/[id]/ScenarioClient.js
// Side-by-side comparison matrix for multi-scenario models.

import { useState, useEffect } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { formatNumber } from "@/lib/finance/currency";
import { ArrowLeft, Scale, CheckCircle2, AlertCircle } from "lucide-react";

export default function ScenarioClient({ scenarioId }) {
  const [scenario, setScenario] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadScenario() {
      try {
        const res = await fetch(`/api/calculator/scenarios/${scenarioId}`);
        if (!res.ok) throw new Error("Scenario not found");
        const data = await res.json();
        setScenario(data.scenario);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    loadScenario();
  }, [scenarioId]);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center text-xs text-neutral-500">
        Loading scenario comparison...
      </div>
    );
  }

  if (error || !scenario) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center space-y-4">
        <AlertCircle className="w-10 h-10 text-red-400 mx-auto" />
        <h2 className="text-lg font-bold text-white">Scenario Not Found</h2>
        <Link href="/calculator" className="text-xs text-emerald-400 underline">
          Return to Financial Calculator
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      <div className="flex items-center gap-3 pb-4 border-b border-neutral-800">
        <Link
          href="/calculator"
          className="p-2 rounded-xl bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-white"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <span className="text-[10px] font-semibold text-emerald-400 uppercase tracking-wider">
            {scenario.calculatorType} scenario model
          </span>
          <h1 className="text-xl font-bold text-white tracking-tight">{scenario.title}</h1>
          {scenario.description && <p className="text-xs text-neutral-400">{scenario.description}</p>}
        </div>
      </div>

      {/* Comparison Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {scenario.scenarios?.map((v, i) => (
          <div
            key={i}
            className="flex flex-col justify-between p-6 rounded-2xl border border-neutral-800 bg-neutral-900/40 space-y-4"
          >
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
                <span className="text-sm font-bold text-white">{v.label}</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  Variant {i + 1}
                </span>
              </div>

              <div className="space-y-3 pt-3">
                <div className="text-xs font-semibold text-neutral-400">Inputs</div>
                <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800 font-mono text-xs space-y-1">
                  {Object.entries(v.inputs || {}).map(([k, val]) => (
                    <div key={k} className="flex justify-between text-neutral-300">
                      <span className="text-neutral-500">{k}:</span>
                      <span>{String(val)}</span>
                    </div>
                  ))}
                </div>

                <div className="text-xs font-semibold text-neutral-400 pt-2">Key Outputs</div>
                <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800 font-mono text-xs space-y-1 text-emerald-400">
                  {Object.entries(v.outputs || {}).slice(0, 6).map(([k, val]) => (
                    <div key={k} className="flex justify-between">
                      <span className="text-neutral-500">{k}:</span>
                      <span className="font-bold">{String(val)}</span>
                    </div>
                  ))}
                </div>

                {v.notes && <p className="text-xs text-neutral-400 italic pt-2">{v.notes}</p>}
              </div>
            </div>

            <Link
              href={`/calculator?category=${scenario.calculatorType}`}
              className="w-full py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-center text-xs text-white font-medium transition-colors"
            >
              Simulate in Calculator
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}

