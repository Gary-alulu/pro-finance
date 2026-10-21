"use client";
// app/(app)/settings/SettingsClient.js
// Profile editing (name, email, password), reporting currency, and system specs.

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import {
  DollarSign,
  CheckCircle2,
  Circle,
  Lock,
  Mail,
  User,
  Cpu,
} from "lucide-react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import { PasswordInput, noPaste } from "@/components/auth/AuthUI";

const PASSWORD_RULES = [
  { test: (v) => v.length >= 8, label: "At least 8 characters" },
  { test: (v) => /[A-Z]/.test(v), label: "One uppercase letter" },
  { test: (v) => /[0-9]/.test(v), label: "One number" },
];

function PasswordRules({ value }) {
  return (
    <ul className="mt-2 space-y-1">
      {PASSWORD_RULES.map((rule) => {
        const ok = rule.test(value || "");
        return (
          <li
            key={rule.label}
            className="flex items-center gap-1.5 text-xs transition-colors"
            style={{ color: ok ? "var(--color-emerald-600)" : "var(--color-text-tertiary)" }}
          >
            {ok ? <CheckCircle2 size={13} /> : <Circle size={13} />}
            {rule.label}
          </li>
        );
      })}
    </ul>
  );
}

function Banner({ tone = "success", children }) {
  if (!children) return null;
  const isError = tone === "error";
  return (
    <motion.div
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      className="p-3 rounded-[var(--radius-lg)] border text-xs flex items-center gap-2 shadow-xs"
      style={{
        background: isError ? "var(--color-negative-bg)" : "var(--color-emerald-50)",
        borderColor: isError ? "var(--color-coral-100)" : "var(--color-emerald-200)",
        color: isError ? "var(--color-negative)" : "var(--color-emerald-700)",
      }}
      role={isError ? "alert" : "status"}
    >
      {isError ? <Circle size={15} className="shrink-0" /> : <CheckCircle2 size={15} className="shrink-0" />}
      <span>{children}</span>
    </motion.div>
  );
}

export default function SettingsClient({ user: initialUser }) {
  const router = useRouter();
  const { update } = useSession();

  const [profile, setProfile] = useState({
    name: initialUser?.name || "",
    email: initialUser?.email || "",
    preferredCurrency: initialUser?.preferredCurrency || "KES",
    createdAt: initialUser?.createdAt,
  });

  useEffect(() => {
    async function loadSettings() {
      try {
        const res = await fetch("/api/user/settings");
        if (res.ok) {
          const data = await res.json();
          if (data.user) {
            setProfile((p) => ({
              ...p,
              name: data.user.name || p.name,
              email: data.user.email || p.email,
              preferredCurrency: data.user.preferredCurrency || p.preferredCurrency,
              createdAt: data.user.createdAt || p.createdAt,
            }));
          }
        }
      } catch (err) {
        console.error("Error loading user settings:", err);
      }
    }
    loadSettings();
  }, []);

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[var(--color-text-primary)]">
          Settings & Profile
        </h1>
        <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
          Manage your account profile, credentials, and reporting currency.
        </p>
      </div>

      <ProfileCard profile={profile} setProfile={setProfile} update={update} router={router} />

      <CurrencyCard profile={profile} setProfile={setProfile} update={update} />

      <SystemSpecsCard />
    </div>
  );
}

// ── Profile card: name / email / password ────────────────────────────────────
function ProfileCard({ profile, setProfile, update, router }) {
  const [details, setDetails] = useState({ name: profile.name, email: profile.email });
  const [detailsPassword, setDetailsPassword] = useState("");
  const [savingDetails, setSavingDetails] = useState(false);
  const [detailsMsg, setDetailsMsg] = useState(null);

  const [pw, setPw] = useState({ current: "", next: "", confirm: "" });
  const [savingPw, setSavingPw] = useState(false);
  const [pwMsg, setPwMsg] = useState(null);

  const emailChanged = details.email.trim().toLowerCase() !== (profile.email || "").toLowerCase();
  const rulesOk = PASSWORD_RULES.every((r) => r.test(pw.next));
  const canSaveDetails =
    (details.name.trim() !== (profile.name || "") || emailChanged) && detailsPassword.length > 0;

  async function refreshSession() {
    try {
      await update();
      router.refresh();
    } catch {
      /* non-fatal: next navigation re-reads the session */
    }
  }

  async function saveDetails(e) {
    e.preventDefault();
    setDetailsMsg(null);
    if (!canSaveDetails) return;
    setSavingDetails(true);
    try {
      const res = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "details",
          currentPassword: detailsPassword,
          name: details.name.trim(),
          ...(emailChanged ? { email: details.email.trim() } : {}),
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setDetailsMsg({ tone: "error", text: json.error || "Could not save changes." });
        return;
      }
      setProfile((p) => ({ ...p, name: details.name.trim(), email: (json.user?.email || details.email).toLowerCase() }));
      setDetailsPassword("");
      setDetailsMsg({ tone: "success", text: "Profile updated." });
      await refreshSession();
      setTimeout(() => setDetailsMsg(null), 5000);
    } catch {
      setDetailsMsg({ tone: "error", text: "Network error. Please try again." });
    } finally {
      setSavingDetails(false);
    }
  }

  async function savePassword(e) {
    e.preventDefault();
    setPwMsg(null);
    if (!rulesOk || pw.next !== pw.confirm || !pw.current) return;
    setSavingPw(true);
    try {
      const res = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "password",
          currentPassword: pw.current,
          newPassword: pw.next,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setPwMsg({ tone: "error", text: json.error || "Could not change password." });
        return;
      }
      setPw({ current: "", next: "", confirm: "" });
      setPwMsg({ tone: "success", text: "Password changed successfully." });
      setTimeout(() => setPwMsg(null), 5000);
    } catch {
      setPwMsg({ tone: "error", text: "Network error. Please try again." });
    } finally {
      setSavingPw(false);
    }
  }

  const pwMismatch = pw.confirm.length > 0 && pw.next !== pw.confirm;

  return (
    <div className="p-6 rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-xs space-y-5">
      <div className="flex items-center gap-3 pb-4 border-b border-[var(--color-border)]">
        <div
          className="w-11 h-11 rounded-full flex items-center justify-center text-base font-bold shrink-0"
          style={{ background: "var(--color-emerald-100)", color: "var(--color-emerald-700)" }}
        >
          {profile.name?.[0]?.toUpperCase() || "U"}
        </div>
        <div className="min-w-0">
          <h2 className="text-sm font-bold text-[var(--color-text-primary)] truncate">
            {profile.name || "Account Holder"}
          </h2>
          <p className="text-xs text-[var(--color-text-secondary)] truncate">
            {profile.email}
            {profile.createdAt
              ? ` · Member since ${new Date(profile.createdAt).toLocaleDateString()}`
              : ""}
          </p>
        </div>
      </div>

      <form onSubmit={saveDetails} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Full Name"
            value={details.name}
            onChange={(e) => setDetails((d) => ({ ...d, name: e.target.value }))}
          />
          <Input
            label="Email Address"
            type="email"
            value={details.email}
            onChange={(e) => setDetails((d) => ({ ...d, email: e.target.value }))}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider">
              Confirm with current password
            </label>
            <input
              type="password"
              value={detailsPassword}
              onChange={(e) => setDetailsPassword(e.target.value)}
              onPaste={noPaste}
              onDrop={noPaste}
              onCut={noPaste}
              autoComplete="current-password"
              placeholder="Required to save"
              title="Pasting is disabled for security — type your password"
              className="auth-input auth-input-password"
            />
          </div>
          <div className="flex items-center gap-3">
            <Button variant="primary" type="submit" loading={savingDetails} disabled={!canSaveDetails}>
              Save Profile
            </Button>
            {emailChanged && (
              <span className="text-[11px] text-[var(--color-text-tertiary)]">
                Email is your login — sign in with the new address next time.
              </span>
            )}
          </div>
        </div>

        <AnimatePresence>
          {detailsMsg && <Banner tone={detailsMsg.tone}>{detailsMsg.text}</Banner>}
        </AnimatePresence>
      </form>

      <div className="pt-2 border-t border-[var(--color-border)]">
        <div className="flex items-center gap-2 pt-4 pb-3">
          <span className="p-2 rounded-lg bg-[var(--color-emerald-50)] text-[var(--color-emerald-600)]">
            <Lock className="w-4 h-4" />
          </span>
          <div>
            <h3 className="text-sm font-bold text-[var(--color-text-primary)]">Change Password</h3>
            <p className="text-xs text-[var(--color-text-secondary)]">
              Verify with your current password. Use a strong, unique password.
            </p>
          </div>
        </div>

        <form onSubmit={savePassword} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider">
                Current Password
              </label>
              <div className="relative">
                <PasswordInput
                  id="pw-current"
                  autoComplete="current-password"
                  placeholder="Current password"
                  registration={{
                    value: pw.current,
                    onChange: (e) => setPw((s) => ({ ...s, current: e.target.value })),
                  }}
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider">
                New Password
              </label>
              <div className="relative">
                <PasswordInput
                  id="pw-next"
                  autoComplete="new-password"
                  placeholder="New password"
                  registration={{
                    value: pw.next,
                    onChange: (e) => setPw((s) => ({ ...s, next: e.target.value })),
                  }}
                />
              </div>
              <PasswordRules value={pw.next} />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider">
                Confirm New Password
              </label>
              <div className="relative">
                <PasswordInput
                  id="pw-confirm"
                  autoComplete="new-password"
                  placeholder="Repeat new password"
                  error={pwMismatch}
                  registration={{
                    value: pw.confirm,
                    onChange: (e) => setPw((s) => ({ ...s, confirm: e.target.value })),
                  }}
                />
              </div>
              {pwMismatch && (
                <p className="text-xs text-[var(--color-coral-600)]">Passwords do not match.</p>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between">
            <AnimatePresence>
              {pwMsg && <Banner tone={pwMsg.tone}>{pwMsg.text}</Banner>}
            </AnimatePresence>
            <Button
              variant="primary"
              type="submit"
              loading={savingPw}
              disabled={!rulesOk || pwMismatch || !pw.current || !pw.next}
            >
              Change Password
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Currency card ────────────────────────────────────────────────────────────
function CurrencyCard({ profile, setProfile, update }) {
  const [currency, setCurrency] = useState(profile.preferredCurrency);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);

  const name = profile.name;

  async function save(e) {
    e.preventDefault();
    setSaving(true);
    setMsg(null);
    try {
      const res = await fetch("/api/user/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, preferredCurrency: currency }),
      });
      if (!res.ok) throw new Error("Failed to save settings");
      setProfile((p) => ({ ...p, name, preferredCurrency: currency }));
      setMsg({ tone: "success", text: "Preferences saved." });
      try {
        await update();
      } catch {
        /* non-fatal */
      }
      setTimeout(() => setMsg(null), 5000);
    } catch (err) {
      setMsg({ tone: "error", text: err.message });
    } finally {
      setSaving(false);
    }
  }

  return (
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

      <form onSubmit={save} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider">
              Account Holder
            </span>
            <div className="px-3 py-2 text-sm rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-2)] text-[var(--color-text-secondary)]">
              {name || "—"}
            </div>
          </div>
          <Select
            label="Reporting Base Currency"
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
          >
            <option value="KES">KES — Kenyan Shilling (Default)</option>
            <option value="USD">USD — United States Dollar</option>
            <option value="EUR">EUR — Euro</option>
            <option value="GBP">GBP — British Pound</option>
            <option value="ZAR">ZAR — South African Rand</option>
          </Select>
        </div>

        <div className="flex items-center justify-between pt-3">
          <AnimatePresence>
            {msg && <Banner tone={msg.tone}>{msg.text}</Banner>}
          </AnimatePresence>
          <Button variant="primary" type="submit" loading={saving}>
            Save Preferences
          </Button>
        </div>
      </form>
    </div>
  );
}

// ── System specs card ────────────────────────────────────────────────────────
function SystemSpecsCard() {
  const specs = [
    {
      title: "Precision Engine",
      body: "`decimal.js` with 28-digit precision. Zero floating-point rounding errors.",
    },
    {
      title: "Human-in-the-Loop AI",
      body: "Strict approval gate. AI extractions never commit without explicit owner verification.",
    },
    {
      title: "Private File Vault",
      body: "Private storage keys. Documents never exposed via public URLs.",
    },
    {
      title: "Financial Graph",
      body: "React Flow interactive canvas with real-time dependency tracking.",
    },
  ];

  return (
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
        {specs.map((s) => (
          <div
            key={s.title}
            className="p-3 rounded-lg bg-[var(--color-surface-2)] border border-[var(--color-border)]"
          >
            <span className="font-bold text-[var(--color-text-primary)] block">{s.title}</span>
            <p className="text-[11px] text-[var(--color-text-secondary)] mt-0.5">{s.body}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
