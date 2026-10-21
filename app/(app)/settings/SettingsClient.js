"use client";
// app/(app)/settings/SettingsClient.js
// Portfolio Settings, currency customization, privacy, and demo data generator.

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Settings,
  DollarSign,
  Shield,
  Sparkles,
  Database,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Sliders,
  Cpu,
  Lock,
} from "lucide-react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Badge from "@/components/ui/Badge";
import Modal from "@/components/ui/Modal";

export default function SettingsClient({ user }) {
  const [preferredCurrency, setPreferredCurrency] = useState(user?.preferredCurrency || "KES");
  const [name, setName] = useState(user?.name || "");
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Demo seed state
  const [seeding, setSeeding] = useState(false);
  const [seedSuccess, setSeedSuccess] = useState("");
  const [isConfirmSeedOpen, setIsConfirmSeedOpen] = useState(false);

  useEffect(() => {
    async function loadSettings() {
      try {
        const res = await fetch("/api/user/settings");
        if (res.ok) {
          const data = await res.json();
          if (data.user) {
            setPreferredCurrency(data.user.preferredCurrency || "KES");
            setName(data.user.name || "");
          }
        }
      } catch (err) {
        console.error("Error loading user settings:", err);
      }
    }
    loadSettings();
  }, []);

  const handleSavePreferences = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSaveSuccess(false);

    try {
      const res = await fetch("/api/user/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          preferredCurrency,
        }),
      });

      if (!res.ok) throw new Error("Failed to save settings");
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 4000);
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleSeedDemoData = async () => {
    setSeeding(true);
    setSeedSuccess("");

    try {
      const res = await fetch("/api/seed", { method: "POST" });
      if (!res.ok) throw new Error("Failed to seed demo data");

      setIsConfirmSeedOpen(false);
      setSeedSuccess(
        "Complete wealth network seeded! Visit the Financial Map or Overview Dashboard to explore."
      );
      setTimeout(() => setSeedSuccess(""), 8000);
    } catch (err) {
      alert(err.message);
    } finally {
      setSeeding(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[var(--color-text-primary)]">
          Settings & Wealth Preferences
        </h1>
        <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
          Configure accounting currencies, encryption standards, and sandbox demo data.
        </p>
      </div>

      <AnimatePresence>
        {seedSuccess && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-4 rounded-[var(--radius-lg)] bg-[var(--color-emerald-50)] border border-[var(--color-emerald-200)] text-sm text-[var(--color-emerald-700)] flex items-center gap-2 shadow-xs"
          >
            <CheckCircle2 className="w-5 h-5 shrink-0" />
            <span>{seedSuccess}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── User Profile & Reporting Currency ─────────────────────────────── */}
      <div className="p-6 rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-xs space-y-5">
        <div className="flex items-center gap-2.5 pb-4 border-b border-[var(--color-border)]">
          <span className="p-2 rounded-lg bg-[var(--color-emerald-50)] text-[var(--color-emerald-600)]">
            <DollarSign className="w-4 h-4" />
          </span>
          <div>
            <h2 className="text-sm font-bold text-[var(--color-text-primary)]">
              Currency & Reporting Base
            </h2>
            <p className="text-xs text-[var(--color-text-secondary)]">
              All multi-currency valuations and net worth rollups consolidate into your base currency.
            </p>
          </div>
        </div>

        <form onSubmit={handleSavePreferences} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Account Holder Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />

            <Select
              label="Reporting Base Currency"
              value={preferredCurrency}
              onChange={(e) => setPreferredCurrency(e.target.value)}
            >
              <option value="KES">KES — Kenyan Shilling (Default)</option>
              <option value="USD">USD — United States Dollar</option>
              <option value="EUR">EUR — Euro</option>
              <option value="GBP">GBP — British Pound</option>
              <option value="ZAR">ZAR — South African Rand</option>
            </Select>
          </div>

          <div className="flex items-center justify-between pt-3">
            {saveSuccess ? (
              <span className="text-xs font-semibold text-[var(--color-emerald-700)] flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4" />
                Settings saved successfully
              </span>
            ) : (
              <span />
            )}

            <Button variant="primary" type="submit" loading={saving}>
              Save Preferences
            </Button>
          </div>
        </form>
      </div>

      {/* ── Demo Portfolio Sandbox ────────────────────────────────────────── */}
      <div className="p-6 rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-xs space-y-4">
        <div className="flex items-center gap-2.5 pb-4 border-b border-[var(--color-border)]">
          <span className="p-2 rounded-lg bg-[var(--color-gold-50)] text-[var(--color-gold-700)]">
            <Sparkles className="w-4 h-4" />
          </span>
          <div>
            <h2 className="text-sm font-bold text-[var(--color-text-primary)]">
              Sandbox Demo Data Seeder
            </h2>
            <p className="text-xs text-[var(--color-text-secondary)]">
              Populate realistic interconnected assets, debts, title deeds, and transactions with 1 click.
            </p>
          </div>
        </div>

        <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed">
          Instantly seeds high-fidelity sample records:
          <br />• <strong>Westlands 2-Bedroom Apartment</strong> (KES 14,500,000)
          <br />• <strong>Karen 0.5-Acre Commercial Plot</strong> (KES 28,000,000)
          <br />• <strong>Stanbic Mortgage Facility</strong> (KES 8,420,000, secured by Westlands Apartment)
          <br />• <strong>Safaricom PLC & Treasury Bond IFB1</strong>
          <br />• <strong>Title Deeds, Loan Agreements & Unresolved Accountability Warnings</strong>
        </p>

        <div className="pt-2">
          <Button
            variant="secondary"
            icon={RotateCcw}
            onClick={() => setIsConfirmSeedOpen(true)}
            loading={seeding}
          >
            Seed Connected Demo Data
          </Button>
        </div>
      </div>

      {/* ── Architectural System Guardrails ──────────────────────────────── */}
      <div className="p-6 rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-xs space-y-4">
        <div className="flex items-center gap-2.5 pb-4 border-b border-[var(--color-border)]">
          <span className="p-2 rounded-lg bg-[var(--color-surface-2)] text-[var(--color-text-primary)]">
            <Cpu className="w-4 h-4" />
          </span>
          <div>
            <h2 className="text-sm font-bold text-[var(--color-text-primary)]">
              System Architecture & Integrity Specs
            </h2>
            <p className="text-xs text-[var(--color-text-secondary)]">
              ProFinance core architectural guarantees.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="p-3 rounded-lg bg-[var(--color-surface-2)] border border-[var(--color-border)]">
            <span className="font-bold text-[var(--color-text-primary)] block">Precision Engine</span>
            <p className="text-[11px] text-[var(--color-text-secondary)] mt-0.5">
              `decimal.js` with 28-digit precision. Zero floating-point rounding errors.
            </p>
          </div>

          <div className="p-3 rounded-lg bg-[var(--color-surface-2)] border border-[var(--color-border)]">
            <span className="font-bold text-[var(--color-text-primary)] block">Human-in-the-Loop AI</span>
            <p className="text-[11px] text-[var(--color-text-secondary)] mt-0.5">
              Strict approval gate. AI extractions never commit without explicit owner verification.
            </p>
          </div>

          <div className="p-3 rounded-lg bg-[var(--color-surface-2)] border border-[var(--color-border)]">
            <span className="font-bold text-[var(--color-text-primary)] block">Private File Vault</span>
            <p className="text-[11px] text-[var(--color-text-secondary)] mt-0.5">
              Private storage keys. Documents never exposed via public URLs.
            </p>
          </div>

          <div className="p-3 rounded-lg bg-[var(--color-surface-2)] border border-[var(--color-border)]">
            <span className="font-bold text-[var(--color-text-primary)] block">Financial Graph</span>
            <p className="text-[11px] text-[var(--color-text-secondary)] mt-0.5">
              React Flow interactive canvas with real-time dependency tracking.
            </p>
          </div>
        </div>
      </div>

      {/* ── Confirm Demo Seed Modal ─────────────────────────────────────── */}
      <Modal
        isOpen={isConfirmSeedOpen}
        onClose={() => setIsConfirmSeedOpen(false)}
        title="Load Connected Demo Portfolio?"
        description="This will replace current demo records with a complete connected Kenyan wealth portfolio."
      >
        <div className="space-y-4">
          <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed">
            This will create verified real estate, mortgages, NSE equities, Treasury bonds, title deeds, bank statements, and trigger the accountability scanner.
          </p>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[var(--color-border)]">
            <Button variant="ghost" onClick={() => setIsConfirmSeedOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              icon={Sparkles}
              onClick={handleSeedDemoData}
              loading={seeding}
            >
              Confirm & Seed
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
