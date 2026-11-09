"use client";
// components/calculator/GlobalQuickCalculatorModal.js
// Persistent global quick calculator modal accessible via Alt+C or command palette from any page.

import { useState, useEffect } from "react";
import { X, ExternalLink, Calculator, Percent, Coins } from "lucide-react";
import Link from "next/link";
import BasicCalculator from "./calculators/BasicCalculator";
import PercentageCalculator from "./calculators/PercentageCalculator";
import CurrencyCalculator from "./calculators/CurrencyCalculator";

export default function GlobalQuickCalculatorModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("basic");

  useEffect(() => {
    const handleKeyDown = (e) => {
      // Toggle modal with Alt + C
      if (e.altKey && (e.key === "c" || e.key === "C")) {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
      // Close on Escape if open
      if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  // Listen to custom event to open from anywhere (e.g. command palette or top nav)
  useEffect(() => {
    const handleOpen = () => setIsOpen(true);
    window.addEventListener("open-quick-calculator", handleOpen);
    return () => window.removeEventListener("open-quick-calculator", handleOpen);
  }, []);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div
        data-privacy-scope="true"
        className="relative w-full max-w-lg rounded-2xl border border-neutral-800 bg-neutral-900 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-neutral-800 bg-neutral-950/60">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Calculator className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Quick Calculator</h3>
              <p className="text-[10px] text-neutral-400">Shortcut: Alt+C to toggle</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href={`/calculator?category=${activeTab}`}
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-medium transition-colors"
              title="Expand to Full Planning Engine"
            >
              <span>Full Engine</span>
              <ExternalLink className="w-3 h-3" />
            </Link>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Quick Tabs */}
        <div className="flex items-center gap-1 px-4 py-2 bg-neutral-950/40 border-b border-neutral-800/80 text-xs">
          <button
            type="button"
            onClick={() => setActiveTab("basic")}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg font-medium transition-colors ${
              activeTab === "basic"
                ? "bg-neutral-800 text-white"
                : "text-neutral-400 hover:text-white"
            }`}
          >
            <Calculator className="w-3.5 h-3.5" />
            <span>Arithmetic</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("percentage")}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg font-medium transition-colors ${
              activeTab === "percentage"
                ? "bg-neutral-800 text-white"
                : "text-neutral-400 hover:text-white"
            }`}
          >
            <Percent className="w-3.5 h-3.5" />
            <span>Percentage</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("currency")}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg font-medium transition-colors ${
              activeTab === "currency"
                ? "bg-neutral-800 text-white"
                : "text-neutral-400 hover:text-white"
            }`}
          >
            <Coins className="w-3.5 h-3.5" />
            <span>Currency</span>
          </button>
        </div>

        {/* Body */}
        <div className="p-4 overflow-y-auto flex-1">
          {activeTab === "basic" && <BasicCalculator />}
          {activeTab === "percentage" && <PercentageCalculator />}
          {activeTab === "currency" && <CurrencyCalculator />}
        </div>
      </div>
    </div>
  );
}

