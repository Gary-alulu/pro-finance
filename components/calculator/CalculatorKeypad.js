"use client";
// components/calculator/CalculatorKeypad.js
// Physical-style keypad for basic arithmetic with keyboard listening support.

import { useEffect, useCallback } from "react";

export default function CalculatorKeypad({ onKeyPress, onEvaluate, onClear, onBackspace, onToggleSign, onPercent }) {
  const handleKey = useCallback(
    (key) => {
      if (key === "AC") {
        if (onClear) onClear();
      } else if (key === "⌫") {
        if (onBackspace) onBackspace();
      } else if (key === "±") {
        if (onToggleSign) onToggleSign();
      } else if (key === "%") {
        if (onPercent) onPercent();
      } else if (key === "=") {
        if (onEvaluate) onEvaluate();
      } else {
        if (onKeyPress) onKeyPress(key);
      }
    },
    [onClear, onBackspace, onToggleSign, onPercent, onEvaluate, onKeyPress]
  );

  useEffect(() => {
    const handleKeyDown = (e) => {
      // Don't intercept if user is typing in an input or textarea
      if (["INPUT", "TEXTAREA", "SELECT"].includes(e.target.tagName)) {
        return;
      }

      if (e.key >= "0" && e.key <= "9") {
        handleKey(e.key);
      } else if (e.key === ".") {
        handleKey(".");
      } else if (e.key === "+") {
        handleKey("+");
      } else if (e.key === "-") {
        handleKey("−");
      } else if (e.key === "*") {
        handleKey("×");
      } else if (e.key === "/") {
        e.preventDefault();
        handleKey("÷");
      } else if (e.key === "Enter" || e.key === "=") {
        e.preventDefault();
        handleKey("=");
      } else if (e.key === "Backspace") {
        e.preventDefault();
        handleKey("⌫");
      } else if (e.key === "Escape") {
        e.preventDefault();
        handleKey("AC");
      } else if (e.key === "%") {
        handleKey("%");
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKey]);

  const buttons = [
    { label: "AC", style: "bg-neutral-800 text-amber-400 hover:bg-neutral-700 font-semibold" },
    { label: "±", style: "bg-neutral-800 text-neutral-200 hover:bg-neutral-700 font-semibold" },
    { label: "%", style: "bg-neutral-800 text-neutral-200 hover:bg-neutral-700 font-semibold" },
    { label: "÷", style: "bg-emerald-950/40 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-900/50 text-xl font-bold" },

    { label: "7", style: "bg-neutral-900 text-white hover:bg-neutral-800" },
    { label: "8", style: "bg-neutral-900 text-white hover:bg-neutral-800" },
    { label: "9", style: "bg-neutral-900 text-white hover:bg-neutral-800" },
    { label: "×", style: "bg-emerald-950/40 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-900/50 text-xl font-bold" },

    { label: "4", style: "bg-neutral-900 text-white hover:bg-neutral-800" },
    { label: "5", style: "bg-neutral-900 text-white hover:bg-neutral-800" },
    { label: "6", style: "bg-neutral-900 text-white hover:bg-neutral-800" },
    { label: "−", style: "bg-emerald-950/40 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-900/50 text-xl font-bold" },

    { label: "1", style: "bg-neutral-900 text-white hover:bg-neutral-800" },
    { label: "2", style: "bg-neutral-900 text-white hover:bg-neutral-800" },
    { label: "3", style: "bg-neutral-900 text-white hover:bg-neutral-800" },
    { label: "+", style: "bg-emerald-950/40 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-900/50 text-xl font-bold" },

    { label: "⌫", style: "bg-neutral-800 text-neutral-400 hover:bg-neutral-700 font-semibold" },
    { label: "0", style: "bg-neutral-900 text-white hover:bg-neutral-800" },
    { label: ".", style: "bg-neutral-900 text-white hover:bg-neutral-800 font-bold" },
    { label: "=", style: "bg-emerald-600 text-white hover:bg-emerald-500 font-bold text-xl shadow-lg shadow-emerald-900/20" },
  ];

  return (
    <div className="grid grid-cols-4 gap-2 sm:gap-2.5 p-2 rounded-2xl bg-neutral-950/70 border border-neutral-800/80">
      {buttons.map((btn) => (
        <button
          key={btn.label}
          type="button"
          onClick={() => handleKey(btn.label)}
          className={`h-12 sm:h-14 rounded-xl flex items-center justify-center text-base sm:text-lg select-none transition-all duration-100 active:scale-95 shadow-sm border border-neutral-800/50 ${btn.style}`}
        >
          {btn.label}
        </button>
      ))}
    </div>
  );
}

