"use client";
// components/calculator/calculators/CurrencyCalculator.js
// Multi-currency conversion calculator respecting platform dated FX rates and provenance disclosures.

import { useState, useEffect, useMemo } from "react";
import CalculatorDisplay from "../CalculatorDisplay";
import { calculateCurrencyConversion } from "@/lib/calculator/currency";
import { SUPPORTED_CURRENCIES, DEFAULT_CURRENCY, formatNumber } from "@/lib/finance/currency";
import { ArrowLeftRight, AlertCircle, ShieldCheck, Edit3 } from "lucide-react";

export default function CurrencyCalculator({ onConvertAction, onSaveLog }) {
  const [amount, setAmount] = useState("1000");
  const [fromCurrency, setFromCurrency] = useState("USD");
  const [toCurrency, setToCurrency] = useState(DEFAULT_CURRENCY);
  const [storedRates, setStoredRates] = useState([]);
  const [useManualRate, setUseManualRate] = useState(false);
  const [manualRate, setManualRate] = useState("");
  const [manualRateSource, setManualRateSource] = useState("User Input");
  const [loadingRates, setLoadingRates] = useState(true);

  // Fetch verified rates recorded on the platform
  useEffect(() => {
    async function loadRates() {
      try {
        const res = await fetch("/api/calculator/context?entityType=fx_rates");
        if (res.ok) {
          const data = await res.json();
          setStoredRates(data.rates || []);
        }
      } catch (e) {
        console.warn("Failed to load platform exchange rates", e);
      } finally {
        setLoadingRates(false);
      }
    }
    loadRates();
  }, []);

  const handleSwap = () => {
    setFromCurrency(toCurrency);
    setToCurrency(fromCurrency);
  };

  const conversion = useMemo(() => {
    if (!amount || isNaN(Number(amount))) return null;
    try {
      return calculateCurrencyConversion({
        amount,
        fromCurrency,
        toCurrency,
        storedRates,
        manualRate: useManualRate && manualRate ? manualRate : null,
        manualRateSource: useManualRate ? manualRateSource : "Platform FX Feed",
      });
    } catch {
      return null;
    }
  }, [amount, fromCurrency, toCurrency, storedRates, useManualRate, manualRate, manualRateSource]);

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <CalculatorDisplay
        expression={conversion?.formula || `${amount} ${fromCurrency} → ${toCurrency}`}
        mainValue={conversion?.convertedAmount ? formatNumber(conversion.convertedAmount) : "0.00"}
        currency={toCurrency}
        mode={useManualRate ? "standalone" : "integrated"}
        subtitle={
          conversion?.rateStatus === "verified"
            ? `Verified FX rate: 1 ${fromCurrency} = ${conversion.appliedRate} ${toCurrency}`
            : conversion?.rateStatus === "manual"
            ? `Manual override: 1 ${fromCurrency} = ${conversion.appliedRate} ${toCurrency}`
            : `1 ${fromCurrency} = ${conversion?.appliedRate || "1.0"} ${toCurrency}`
        }
        onClear={() => {
          setAmount("");
          setManualRate("");
        }}
        onSave={() => {
          if (onSaveLog && conversion) {
            onSaveLog({
              calculatorType: "currency",
              title: `Currency FX: ${amount} ${fromCurrency} to ${toCurrency}`,
              inputs: { amount, fromCurrency, toCurrency, manualRate: useManualRate ? manualRate : null },
              outputs: conversion,
              isSaved: true,
            });
          }
        }}
        onOpenActionPanel={
          conversion
            ? () =>
                onConvertAction?.({
                  calculatorType: "currency",
                  calculatedAmount: conversion.convertedAmount,
                  formula: conversion.formula,
                  details: conversion,
                })
            : null
        }
      />

      <div className="p-5 rounded-2xl border border-neutral-800 bg-neutral-900/40 space-y-4">
        {/* Source amount input */}
        <div>
          <label className="block text-xs font-medium text-neutral-400 mb-1">Amount to Convert</label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="e.g. 1000"
            className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-white font-mono text-base focus:border-amber-500 focus:outline-none"
          />
        </div>

        {/* Currency selection row with swap */}
        <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 items-center">
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-neutral-400 mb-1">From Currency</label>
            <select
              value={fromCurrency}
              onChange={(e) => setFromCurrency(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-white text-sm focus:border-amber-500 focus:outline-none"
            >
              {SUPPORTED_CURRENCIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.code} — {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex justify-center pt-5">
            <button
              type="button"
              onClick={handleSwap}
              className="p-2.5 rounded-xl border border-neutral-800 bg-neutral-950 hover:bg-neutral-800 text-neutral-300 hover:text-white transition-colors"
              title="Swap Currencies"
            >
              <ArrowLeftRight className="w-4 h-4" />
            </button>
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-neutral-400 mb-1">To Currency</label>
            <select
              value={toCurrency}
              onChange={(e) => setToCurrency(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-white text-sm focus:border-amber-500 focus:outline-none"
            >
              {SUPPORTED_CURRENCIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.code} — {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Manual Rate Toggle */}
        <div className="pt-2 border-t border-neutral-800/80">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="toggleManual"
                checked={useManualRate}
                onChange={(e) => setUseManualRate(e.target.checked)}
                className="w-4 h-4 rounded text-amber-500 bg-neutral-950 border-neutral-800 focus:ring-0"
              />
              <label htmlFor="toggleManual" className="text-xs text-neutral-300 font-medium cursor-pointer">
                Supply manual exchange rate override
              </label>
            </div>
            {conversion?.rateStatus === "verified" && !useManualRate && (
              <span className="flex items-center gap-1 text-[11px] text-emerald-400">
                <ShieldCheck className="w-3.5 h-3.5" />
                Verified Rate Available
              </span>
            )}
          </div>

          {useManualRate && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-xl bg-neutral-950 border border-neutral-800">
              <div>
                <label className="block text-[11px] font-medium text-neutral-400 mb-1">
                  1 {fromCurrency} in {toCurrency}
                </label>
                <input
                  type="number"
                  step="any"
                  value={manualRate}
                  onChange={(e) => setManualRate(e.target.value)}
                  placeholder="e.g. 129.50"
                  className="w-full px-3 py-1.5 rounded-lg bg-neutral-900 border border-neutral-800 text-white text-xs font-mono focus:border-amber-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-neutral-400 mb-1">Rate Attribution / Source</label>
                <input
                  type="text"
                  value={manualRateSource}
                  onChange={(e) => setManualRateSource(e.target.value)}
                  placeholder="e.g. Bank statement, FX bureau"
                  className="w-full px-3 py-1.5 rounded-lg bg-neutral-900 border border-neutral-800 text-white text-xs focus:border-amber-500 focus:outline-none"
                />
              </div>
            </div>
          )}
        </div>

        {/* Currency Governance Notice */}
        <div className="flex items-start gap-2.5 p-3 rounded-xl bg-neutral-950 border border-neutral-800/80 text-xs text-neutral-400">
          <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold text-neutral-200">Financial Integrity: </span>
            A calculator conversion never silently mutates the original currency of an existing record. Converting a record preserves both the original denomination and the dated rate applied.
          </div>
        </div>
      </div>
    </div>
  );
}

