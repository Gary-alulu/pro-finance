"use client";
// components/calculator/CalculatorWorkspace.js
// Main workspace integrating all financial calculation categories, navigation, and conversion workflows.

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { CALCULATOR_CATEGORIES } from "./CalculatorConstants";
import BasicCalculator from "./calculators/BasicCalculator";
import PercentageCalculator from "./calculators/PercentageCalculator";
import CurrencyCalculator from "./calculators/CurrencyCalculator";
import SavingsCalculator from "./calculators/SavingsCalculator";
import CompoundInterestCalculator from "./calculators/CompoundInterestCalculator";
import LoanCalculator from "./calculators/LoanCalculator";
import InvestmentCalculator from "./calculators/InvestmentCalculator";
import NetWorthCalculator from "./calculators/NetWorthCalculator";
import BudgetCalculator from "./calculators/BudgetCalculator";
import DepreciationCalculator from "./calculators/DepreciationCalculator";
import InvoiceCalculator from "./calculators/InvoiceCalculator";
import CalculatorActionPanel from "./CalculatorActionPanel";
import { History, Bookmark, Sparkles, Check, ArrowRight } from "lucide-react";

export default function CalculatorWorkspace({ initialCategory = "basic" }) {
  const [activeTab, setActiveTab] = useState(initialCategory);
  const [actionContext, setActionContext] = useState(null);
  const [actionPanelOpen, setActionPanelOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);
  const pathname = usePathname();

  const handleOpenAction = (ctx) => {
    setActionContext(ctx);
    setActionPanelOpen(true);
  };

  const handleSaveLog = async (logData) => {
    try {
      const endpoint = logData.isSaved ? "/api/calculator/saved" : "/api/calculator/history";
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(logData),
      });
      if (res.ok) {
        showToast(logData.isSaved ? "Calculation bookmarked to Saved!" : "Calculation recorded to history");
      }
    } catch (e) {
      console.warn("Failed to log calculation", e);
    }
  };

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const activeCategoryMeta = CALCULATOR_CATEGORIES.find((c) => c.id === activeTab) || CALCULATOR_CATEGORIES[0];
  const Icon = activeCategoryMeta.icon;

  return (
    <div className="space-y-6">
      {/* Toast alert */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-2.5 rounded-xl bg-neutral-900 border border-emerald-500/40 text-emerald-300 text-xs shadow-2xl animate-fade-in">
          <Check className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Header & Navigation Links */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-neutral-800">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <Icon className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white tracking-tight">Financial Calculator & Planning Engine</h1>
              <p className="text-xs text-neutral-400">{activeCategoryMeta.description}</p>
            </div>
          </div>
        </div>

        {/* Supporting Routes */}
        <div className="flex items-center gap-2">
          <Link
            href="/calculator"
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors ${
              pathname === "/calculator"
                ? "bg-neutral-800 text-white border-neutral-700"
                : "bg-neutral-900/60 text-neutral-400 border-neutral-800 hover:text-white"
            }`}
          >
            <span>Calculator</span>
          </Link>
          <Link
            href="/calculator/history"
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors ${
              pathname === "/calculator/history"
                ? "bg-neutral-800 text-white border-neutral-700"
                : "bg-neutral-900/60 text-neutral-400 border-neutral-800 hover:text-white"
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>History</span>
          </Link>
          <Link
            href="/calculator/saved"
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors ${
              pathname === "/calculator/saved"
                ? "bg-neutral-800 text-white border-neutral-700"
                : "bg-neutral-900/60 text-neutral-400 border-neutral-800 hover:text-white"
            }`}
          >
            <Bookmark className="w-3.5 h-3.5" />
            <span>Saved</span>
          </Link>
        </div>
      </div>

      {/* Category Tabs Scrollable Ribbon */}
      <div className="overflow-x-auto pb-2 scrollbar-none">
        <div className="flex items-center gap-1.5 min-w-max p-1 rounded-2xl bg-neutral-950 border border-neutral-800/80">
          {CALCULATOR_CATEGORIES.map((cat) => {
            const CatIcon = cat.icon;
            const isActive = activeTab === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setActiveTab(cat.id)}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                  isActive
                    ? "bg-neutral-800 text-white shadow-sm border border-neutral-700"
                    : "text-neutral-400 hover:text-white hover:bg-neutral-900"
                }`}
              >
                <CatIcon
                  className="w-3.5 h-3.5"
                  style={{ color: isActive ? cat.color : undefined }}
                />
                <span>{cat.name}</span>
                <span
                  className={`text-[9px] px-1.5 py-0.2 rounded-full font-normal ${
                    isActive ? "bg-neutral-900 text-neutral-300" : "bg-neutral-900/50 text-neutral-500"
                  }`}
                >
                  {cat.badge}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Active Calculator Component View */}
      <div className="min-h-[460px]">
        {activeTab === "basic" && (
          <BasicCalculator onConvertAction={handleOpenAction} onSaveLog={handleSaveLog} />
        )}
        {activeTab === "percentage" && (
          <PercentageCalculator onConvertAction={handleOpenAction} onSaveLog={handleSaveLog} />
        )}
        {activeTab === "currency" && (
          <CurrencyCalculator onConvertAction={handleOpenAction} onSaveLog={handleSaveLog} />
        )}
        {activeTab === "savings" && (
          <SavingsCalculator onConvertAction={handleOpenAction} onSaveLog={handleSaveLog} />
        )}
        {activeTab === "compound_interest" && (
          <CompoundInterestCalculator onConvertAction={handleOpenAction} onSaveLog={handleSaveLog} />
        )}
        {activeTab === "loan" && (
          <LoanCalculator onConvertAction={handleOpenAction} onSaveLog={handleSaveLog} />
        )}
        {activeTab === "investment" && (
          <InvestmentCalculator onConvertAction={handleOpenAction} onSaveLog={handleSaveLog} />
        )}
        {activeTab === "net_worth" && (
          <NetWorthCalculator onConvertAction={handleOpenAction} onSaveLog={handleSaveLog} />
        )}
        {activeTab === "budget" && (
          <BudgetCalculator onConvertAction={handleOpenAction} onSaveLog={handleSaveLog} />
        )}
        {activeTab === "depreciation" && (
          <DepreciationCalculator onConvertAction={handleOpenAction} onSaveLog={handleSaveLog} />
        )}
        {activeTab === "invoice" && (
          <InvoiceCalculator onConvertAction={handleOpenAction} onSaveLog={handleSaveLog} />
        )}
      </div>

      {/* Action Conversion Panel Modal */}
      <CalculatorActionPanel
        isOpen={actionPanelOpen}
        onClose={() => setActionPanelOpen(false)}
        actionContext={actionContext}
      />
    </div>
  );
}

