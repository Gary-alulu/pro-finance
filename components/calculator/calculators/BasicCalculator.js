"use client";
// components/calculator/calculators/BasicCalculator.js
// Basic arithmetic calculator using safe Shunting-yard RPN and Decimal.js arithmetic.

import { useState, useCallback } from "react";
import CalculatorDisplay from "../CalculatorDisplay";
import CalculatorKeypad from "../CalculatorKeypad";
import { evaluateArithmeticExpression } from "@/lib/calculator/arithmetic";

export default function BasicCalculator({ onConvertAction, onSaveLog }) {
  const [expression, setExpression] = useState("");
  const [displayValue, setDisplayValue] = useState("0");
  const [history, setHistory] = useState([]);
  const [error, setError] = useState(null);

  const handleKeyPress = useCallback((val) => {
    setError(null);
    setExpression((prev) => {
      // If we just had an error or 0, replace or append
      if (prev === "0" && !isNaN(val)) return val;
      return prev + val;
    });
  }, []);

  const handleClear = useCallback(() => {
    setExpression("");
    setDisplayValue("0");
    setError(null);
  }, []);

  const handleBackspace = useCallback(() => {
    setError(null);
    setExpression((prev) => {
      if (prev.length <= 1) return "";
      return prev.slice(0, -1);
    });
  }, []);

  const handleToggleSign = useCallback(() => {
    setError(null);
    setExpression((prev) => {
      if (!prev || prev === "0") return "-";
      if (prev.startsWith("-")) return prev.slice(1);
      return "-" + prev;
    });
  }, []);

  const handlePercent = useCallback(() => {
    setError(null);
    setExpression((prev) => prev + "%");
  }, []);

  const handleEvaluate = useCallback(() => {
    if (!expression || !expression.trim()) return;
    try {
      const res = evaluateArithmeticExpression(expression);
      setDisplayValue(res.formatted);
      const newEntry = {
        expression: res.expression,
        result: res.formatted,
        rawResult: res.raw,
        timestamp: new Date().toLocaleTimeString(),
      };
      setHistory((prev) => [newEntry, ...prev.slice(0, 9)]);
      setError(null);

      if (onSaveLog) {
        onSaveLog({
          calculatorType: "basic",
          title: `Arithmetic: ${res.expression}`,
          inputs: { expression: res.expression },
          outputs: { result: res.formatted, raw: res.raw },
        });
      }
    } catch (err) {
      setError(err.message || "Invalid expression");
    }
  }, [expression, onSaveLog]);

  const handleLoadHistory = (item) => {
    setExpression(item.expression);
    setDisplayValue(item.result);
    setError(null);
  };

  return (
    <div className="space-y-4 max-w-xl mx-auto">
      <CalculatorDisplay
        expression={expression || "0"}
        mainValue={error ? "Error" : displayValue}
        currency="KES"
        mode="standalone"
        subtitle={error || "Safe Decimal Arithmetic"}
        onClear={handleClear}
        onSave={() => {
          if (onSaveLog && displayValue !== "0") {
            onSaveLog({
              calculatorType: "basic",
              title: `Arithmetic Result: ${displayValue}`,
              inputs: { expression },
              outputs: { result: displayValue },
              isSaved: true,
            });
          }
        }}
        onOpenActionPanel={
          displayValue !== "0" && !error
            ? () =>
                onConvertAction?.({
                  calculatorType: "basic",
                  calculatedAmount: displayValue,
                  formula: expression,
                })
            : null
        }
      />

      {error && (
        <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs text-center font-mono">
          {error}
        </div>
      )}

      {/* Interactive keypad */}
      <CalculatorKeypad
        onKeyPress={handleKeyPress}
        onEvaluate={handleEvaluate}
        onClear={handleClear}
        onBackspace={handleBackspace}
        onToggleSign={handleToggleSign}
        onPercent={handlePercent}
      />

      {/* Mini history tape */}
      {history.length > 0 && (
        <div className="p-3 rounded-xl border border-neutral-800 bg-neutral-900/40">
          <div className="text-xs font-semibold text-neutral-400 mb-2 flex items-center justify-between">
            <span>Recent Tape</span>
            <button
              type="button"
              onClick={() => setHistory([])}
              className="text-[10px] text-neutral-500 hover:text-neutral-300"
            >
              Clear Tape
            </button>
          </div>
          <div className="space-y-1.5 max-h-36 overflow-y-auto font-mono text-xs">
            {history.map((item, idx) => (
              <div
                key={idx}
                onClick={() => handleLoadHistory(item)}
                className="flex items-center justify-between p-1.5 rounded-lg hover:bg-neutral-800/60 cursor-pointer text-neutral-300"
              >
                <span className="text-neutral-500 truncate max-w-[60%]">{item.expression}</span>
                <span className="font-bold text-emerald-400">= {item.result}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

