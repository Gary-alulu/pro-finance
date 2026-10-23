"use client";
// app/(app)/projections/ProjectionsClient.js
import { useState } from "react";
import { TrendingUp, Calculator } from "lucide-react";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";

export default function ProjectionsClient() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [form, setForm] = useState({
    monthlyInvestment: "2000",
    extraLoanPayment: "0",
    savingsIncrease: "0",
    annualReturnRate: "0.05",
    years: "10",
  });

  const runProjection = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/projections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scenarios: [{
            name: "custom",
            monthlyInvestment: form.monthlyInvestment,
            extraLoanPayment: form.extraLoanPayment,
            savingsIncrease: form.savingsIncrease,
            annualReturnRate: form.annualReturnRate,
          }],
          years: parseInt(form.years || "10"),
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setResult(data);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[var(--color-text-primary)] flex items-center gap-2">
          <TrendingUp className="h-6 w-6" /> Wealth Projections & Scenario Analysis
        </h1>
        <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
          Deterministic calculations with AI explanation of assumptions. Projections are estimates, never guarantees.
        </p>
      </div>

      <Card>
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input label="Monthly Investment (KES)" value={form.monthlyInvestment} onChange={(e) => setForm({ ...form, monthlyInvestment: e.target.value })} />
            <Input label="Extra Loan Payment (KES/month)" value={form.extraLoanPayment} onChange={(e) => setForm({ ...form, extraLoanPayment: e.target.value })} />
            <Input label="Savings Increase (KES/month)" value={form.savingsIncrease} onChange={(e) => setForm({ ...form, savingsIncrease: e.target.value })} />
            <Input label="Annual Return Rate (e.g., 0.05 for 5%)" value={form.annualReturnRate} onChange={(e) => setForm({ ...form, annualReturnRate: e.target.value })} />
            <Input label="Years" value={form.years} onChange={(e) => setForm({ ...form, years: e.target.value })} />
          </div>
          <Button onClick={runProjection} loading={loading} icon={Calculator}>Run Projection</Button>
        </div>
      </Card>

      {result && (
        <Card>
          <div className="p-6 space-y-4">
            <div>
              <p className="text-sm text-[var(--color-text-secondary)]">Starting Net Worth</p>
              <p className="text-xl font-semibold">{result.startNetWorth}</p>
            </div>
            {result.projections?.map((p, idx) => (
              <div key={idx} className="border-t pt-4">
                <p className="font-medium">{p.name}</p>
                <p className="text-sm text-[var(--color-text-secondary)] mt-1">{p.explanation}</p>
                <p className="text-lg mt-2">End Net Worth: <span className="font-semibold">{p.endNetWorth}</span></p>
                <p className="text-xs text-[var(--color-text-tertiary)] mt-2">{p.disclaimer}</p>
              </div>
            ))}
            <p className="text-xs text-[var(--color-text-tertiary)]">{result.disclaimer}</p>
          </div>
        </Card>
      )}
    </div>
  );
}
