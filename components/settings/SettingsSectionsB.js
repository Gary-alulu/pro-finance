"use client";
// components/settings/SettingsSectionsB.js
// Security, Notifications, Data & Integrations, Appearance and Activity panels.

import { useEffect, useMemo, useState } from "react";
import { signOut, useSession } from "next-auth/react";
import {
  Activity,
  AlertTriangle,
  Bell,
  Check,
  Database,
  Download,
  FileJson,
  History,
  KeyRound,
  LayoutDashboard,
  Lock,
  Monitor,
  Moon,
  Palette,
  RefreshCw,
  ShieldCheck,
  Sun,
  Trash2,
  UserX,
} from "lucide-react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Modal from "@/components/ui/Modal";
import Select from "@/components/ui/Select";
import { useToast } from "@/components/providers/ToastProvider";
import {
  ACCENT_OPTIONS,
  DASHBOARD_LAYOUT_OPTIONS,
  DENSITY_OPTIONS,
  REMINDER_FREQUENCY_OPTIONS,
} from "@/lib/settings/defaults";
import { noPaste } from "@/components/auth/AuthUI";
import {
  Banner,
  InlineNote,
  Panel,
  SectionHeading,
  ToggleRow,
} from "./SettingsControls";

const PASSWORD_RULES = [
  (v) => v.length >= 8,
  (v) => /[A-Z]/.test(v),
  (v) => /[0-9]/.test(v),
];

const THEME_ICONS = { light: Sun, dark: Moon, system: Monitor };

const THEME_OPTIONS = [
  { value: "light", label: "Light", hint: "Warm paper" },
  { value: "dark", label: "Dark", hint: "Low light" },
  { value: "system", label: "System", hint: "Follow device" },
];

const RETENTION_OPTIONS = [
  { value: "0", label: "Keep indefinitely" },
  { value: "30", label: "30 days" },
  { value: "90", label: "90 days" },
  { value: "180", label: "6 months" },
  { value: "365", label: "1 year" },
  { value: "730", label: "2 years" },
];

function formatRelative(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  const diff = Date.now() - date.getTime();
  const minutes = Math.round(diff / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days}d ago`;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

// ── 06. Security & Privacy ──────────────────────────────────────────────────

export function SecuritySection({ settings, setPath, user }) {
  const { data: session } = useSession();
  const toast = useToast();
  const [passwords, setPasswords] = useState({ current: "", next: "", confirm: "" });
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteForm, setDeleteForm] = useState({ email: "", password: "", confirmation: "" });

  const passwordValid =
    PASSWORD_RULES.every((rule) => rule(passwords.next)) &&
    passwords.next === passwords.confirm &&
    passwords.current.length > 0;

  async function changePassword(e) {
    e.preventDefault();
    if (!passwordValid) return;
    setSavingPassword(true);
    setPasswordMessage(null);
    try {
      const res = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "password",
          currentPassword: passwords.current,
          newPassword: passwords.next,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setPasswordMessage(json.error || "Could not change your password.");
        return;
      }
      setPasswords({ current: "", next: "", confirm: "" });
      setPasswordMessage({ tone: "success", text: "Password updated. Other sessions may need to sign in again." });
      toast.success("Password updated");
    } catch {
      setPasswordMessage({ tone: "error", text: "Network error. Please try again." });
    } finally {
      setSavingPassword(false);
    }
  }

  async function deleteAccount() {
    setDeleting(true);
    try {
      const res = await fetch("/api/user/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(deleteForm),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error || "Could not delete the account.");
        setDeleting(false);
        return;
      }
      toast.success("Account deleted");
      await signOut({ callbackUrl: "/" });
    } catch {
      toast.error("Network error. Please try again.");
      setDeleting(false);
    }
  }

  const canDelete =
    deleteForm.email.trim().toLowerCase() === (user?.email || "").toLowerCase() &&
    deleteForm.password.length > 0 &&
    deleteForm.confirmation.trim() === "DELETE";

  return (
    <div className="space-y-6">
      <SectionHeading
        icon={ShieldCheck}
        title="Security & Privacy"
        description="Protect access to your workspace and control what is masked, retained and exported."
      />

      <Panel title="Session" description="How this account is signed in.">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface-2)]/60 p-4 sm:p-5">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-tertiary)]">
              Signed in as
            </p>
            <p className="mt-1 truncate text-sm font-medium text-[var(--color-text-primary)]">
              {user?.email || session?.user?.email || "—"}
            </p>
          </div>
          <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface-2)]/60 p-4 sm:p-5">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-tertiary)]">
              Authentication
            </p>
            <p className="mt-1 text-sm font-medium text-[var(--color-text-primary)]">
              Password · single-owner workspace
            </p>
          </div>
        </div>
        <div className="mt-4">
          <InlineNote icon={Lock}>
            Two-factor authentication is not yet supported. Use a long, unique password
            and keep your email account secure. There is no shared or team access.
          </InlineNote>
        </div>
      </Panel>

      <Panel title="Change password">
        <form onSubmit={changePassword} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-secondary)]">
                Current password
              </label>
              <input
                type="password"
                autoComplete="current-password"
                className="auth-input auth-input-password"
                value={passwords.current}
                onChange={(e) => setPasswords((p) => ({ ...p, current: e.target.value }))}
                onPaste={noPaste}
                onDrop={noPaste}
                onCut={noPaste}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-secondary)]">
                New password
              </label>
              <input
                type="password"
                autoComplete="new-password"
                className="auth-input auth-input-password"
                value={passwords.next}
                onChange={(e) => setPasswords((p) => ({ ...p, next: e.target.value }))}
                onPaste={noPaste}
                onDrop={noPaste}
                onCut={noPaste}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-secondary)]">
                Confirm new password
              </label>
              <input
                type="password"
                autoComplete="new-password"
                className="auth-input auth-input-password"
                value={passwords.confirm}
                onChange={(e) => setPasswords((p) => ({ ...p, confirm: e.target.value }))}
                onPaste={noPaste}
                onDrop={noPaste}
                onCut={noPaste}
              />
            </div>
          </div>
          {passwords.next && (
            <ul className="flex flex-wrap gap-x-4 gap-y-1.5 pt-1">
              {[
                { ok: passwords.next.length >= 8, label: "8+ characters" },
                { ok: /[A-Z]/.test(passwords.next), label: "Uppercase" },
                { ok: /[0-9]/.test(passwords.next), label: "Number" },
                { ok: passwords.next === passwords.confirm, label: "Matches" },
              ].map((rule) => (
                <li
                  key={rule.label}
                  className="flex items-center gap-1.5 text-[11px]"
                  style={{ color: rule.ok ? "var(--color-emerald-600)" : "var(--color-text-tertiary)" }}
                >
                  <Check className={`h-3.5 w-3.5 ${rule.ok ? "" : "opacity-30"}`} />
                  {rule.label}
                </li>
              ))}
            </ul>
          )}
          {passwordMessage && <Banner tone={passwordMessage.tone}>{passwordMessage.text}</Banner>}
          <div className="flex justify-end pt-1">
            <Button type="submit" loading={savingPassword} disabled={!passwordValid}>
              Update password
            </Button>
          </div>
        </form>
      </Panel>

      <Panel title="Privacy & retention">
        <div className="space-y-3">
          <ToggleRow
            label="Mask sensitive values by default"
            description="Amounts are hidden until you choose to reveal them. This is a display preference only."
            checked={settings.security.hideSensitiveValues}
            onChange={(v) => setPath("security.hideSensitiveValues", v)}
          />
          <ToggleRow
            label="Mask account and policy numbers"
            description="Only the last few characters are shown in list views."
            checked={settings.security.maskAccountNumbers}
            onChange={(v) => setPath("security.maskAccountNumbers", v)}
          />
          <ToggleRow
            label="Include metadata in exports"
            description="Adds record IDs, timestamps and relationship references to exports."
            checked={settings.security.exportIncludesMetadata}
            onChange={(v) => setPath("security.exportIncludesMetadata", v)}
          />
        </div>
        <div className="mt-4">
          <Select
            label="Document retention"
            options={RETENTION_OPTIONS}
            value={String(settings.security.dataRetentionDays)}
            onChange={(e) => setPath("security.dataRetentionDays", Number(e.target.value))}
            helperText="Retention is a policy preference; nothing is deleted automatically."
          />
        </div>
      </Panel>

      <Panel
        title="Export your data"
        description="A complete, machine-readable copy of your workspace and settings."
        action={
          <a
            href="/api/user/export"
            className="inline-flex items-center gap-1.5 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-1.5 text-xs font-medium text-[var(--color-text-primary)] transition-colors hover:bg-[var(--color-surface-3)]"
          >
            <Download className="h-3.5 w-3.5" /> Download JSON
          </a>
        }
      >
        <InlineNote icon={FileJson}>
          Exports are logged in your audit trail. The download contains documents
          metadata and financial records — store it somewhere private.
        </InlineNote>
      </Panel>

      <Panel
        title="Delete account"
        description="Permanently remove your account and every record you own."
        className="border-[var(--color-coral-100)]"
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs leading-relaxed text-[var(--color-text-secondary)]">
            This is irreversible. There is no residual copy and no recovery period.
            Export your data first if you may need it.
          </p>
          <Button variant="danger" icon={Trash2} onClick={() => setDeleteOpen(true)}>
            Delete account
          </Button>
        </div>
      </Panel>

      <Modal
        isOpen={deleteOpen}
        onClose={() => !deleting && setDeleteOpen(false)}
        title="Delete this account permanently?"
        description="Every asset, liability, investment, document, invoice and audit event you own will be deleted."
      >
        <div className="space-y-4">
          <div className="flex items-start gap-2.5 rounded-[var(--radius-lg)] border border-[var(--color-coral-100)] bg-[var(--color-negative-bg)] p-4">
            <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-[var(--color-negative)]" />
            <p className="text-xs leading-relaxed text-[var(--color-negative)]">
              There is no undo. Type your email and <strong>DELETE</strong>, then confirm
              with your password.
            </p>
          </div>
          <Input
            label="Your email"
            type="email"
            autoComplete="off"
            value={deleteForm.email}
            onChange={(e) => setDeleteForm((f) => ({ ...f, email: e.target.value }))}
          />
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-secondary)]">
              Password
            </label>
            <input
              type="password"
              autoComplete="current-password"
              className="auth-input auth-input-password"
              value={deleteForm.password}
              onChange={(e) => setDeleteForm((f) => ({ ...f, password: e.target.value }))}
              onPaste={noPaste}
              onDrop={noPaste}
              onCut={noPaste}
            />
          </div>
          <Input
            label="Type DELETE to confirm"
            autoComplete="off"
            value={deleteForm.confirmation}
            onChange={(e) => setDeleteForm((f) => ({ ...f, confirmation: e.target.value }))}
          />
          <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
            <Button
              variant="secondary"
              onClick={() => setDeleteOpen(false)}
              disabled={deleting}
            >
              Keep my account
            </Button>
            <Button
              variant="danger"
              icon={UserX}
              loading={deleting}
              disabled={!canDelete}
              onClick={deleteAccount}
            >
              Permanently delete
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

// ── 07. Notifications ───────────────────────────────────────────────────────

export function NotificationsSection({ settings, setPath }) {
  const notifications = settings.notifications;
  const master = notifications.enabled;

  return (
    <div className="space-y-6">
      <SectionHeading
        icon={Bell}
        title="Notifications"
        description="Choose which events are worth interrupting you for. Reminders are kept separate from your financial records."
      />

      <Panel title="Delivery">
        <ToggleRow
          label="Enable notifications"
          description="Master switch. Turning this off silences every category below without losing your choices."
          checked={master}
          onChange={(v) => setPath("notifications.enabled", v)}
        />
        <div className="mt-4">
          <Select
            label="Reminder frequency"
            options={REMINDER_FREQUENCY_OPTIONS}
            value={notifications.frequency}
            onChange={(e) => setPath("notifications.frequency", e.target.value)}
            disabled={!master}
          />
        </div>
      </Panel>

      <Panel title="Categories">
        <div className="space-y-3">
          <ToggleRow
            label="Overdue invoices"
            description="When an issued invoice passes its due date unpaid."
            checked={notifications.overdueInvoices}
            disabled={!master}
            onChange={(v) => setPath("notifications.overdueInvoices", v)}
          />
          <ToggleRow
            label="Upcoming liabilities"
            description="When a liability payment or maturity is approaching."
            checked={notifications.upcomingLiabilities}
            disabled={!master}
            onChange={(v) => setPath("notifications.upcomingLiabilities", v)}
          />
          <ToggleRow
            label="Stale valuations"
            description="When an asset or investment valuation exceeds your freshness threshold."
            checked={notifications.staleValuations}
            disabled={!master}
            onChange={(v) => setPath("notifications.staleValuations", v)}
          />
          <ToggleRow
            label="Unreviewed documents"
            description="When an extraction is waiting for your approval."
            checked={notifications.unreviewedDocuments}
            disabled={!master}
            onChange={(v) => setPath("notifications.unreviewedDocuments", v)}
          />
          <ToggleRow
            label="Reconciliation warnings"
            description="When a record looks inconsistent or unmatched."
            checked={notifications.reconciliationWarnings}
            disabled={!master}
            onChange={(v) => setPath("notifications.reconciliationWarnings", v)}
          />
        </div>
      </Panel>

      <InlineNote icon={Bell}>
        Reminders and alerts are informational. They never change balances, valuations
        or records on their own.
      </InlineNote>
    </div>
  );
}

// ── 08. Data & Integrations ─────────────────────────────────────────────────

const EXPORT_LINKS = [
  { type: "assets", label: "Assets" },
  { type: "liabilities", label: "Liabilities" },
  { type: "investments", label: "Investments" },
  { type: "transactions", label: "Transactions" },
  { type: "documents", label: "Documents" },
  { type: "cashflow", label: "Cash flow" },
];

function formatBytes(bytes) {
  const value = Number(bytes) || 0;
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / (1024 * 1024)).toFixed(2)} MB`;
}

export function DataSection({ meta }) {
  const storage = meta?.storage || (meta && typeof meta.documentCount === "number" ? meta : {});
  const ai = meta?.ai || {};

  return (
    <div className="space-y-6">
      <SectionHeading
        icon={Database}
        title="Data & Integrations"
        description="Understand what is stored, how to take it with you, and which external services are configured."
      />

      <Panel title="Workspace storage" description="Documents are stored privately and counted against your workspace.">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface-2)]/60 p-4 sm:p-5">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-tertiary)]">
              Documents
            </p>
            <p className="mt-1 text-2xl font-bold tabular-nums text-[var(--color-text-primary)]">
              {storage.documentCount ?? 0}
            </p>
          </div>
          <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface-2)]/60 p-4 sm:p-5">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-tertiary)]">
              Storage used
            </p>
            <p className="mt-1 text-2xl font-bold tabular-nums text-[var(--color-text-primary)]">
              {formatBytes(storage.storageBytes)}
            </p>
          </div>
          <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface-2)]/60 p-4 sm:p-5">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-tertiary)]">
              Largest file
            </p>
            <p className="mt-1 text-2xl font-bold tabular-nums text-[var(--color-text-primary)]">
              {formatBytes(storage.largestFileBytes)}
            </p>
          </div>
        </div>
      </Panel>

      <Panel title="Export records" description="CSV downloads respect your current filters.">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {EXPORT_LINKS.map((item) => (
            <a
              key={item.type}
              href={`/api/reports/export?type=${item.type}`}
              className="inline-flex items-center justify-between gap-2.5 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface-2)] px-4 py-3 text-xs font-medium text-[var(--color-text-primary)] transition-colors hover:bg-[var(--color-surface-3)]"
            >
              {item.label}
              <Download className="h-3.5 w-3.5 flex-shrink-0 text-[var(--color-text-tertiary)]" />
            </a>
          ))}
        </div>
        <div className="mt-3">
          <a
            href="/api/user/export"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--color-emerald-700)] dark:text-[var(--color-emerald-400)] hover:underline"
          >
            <FileJson className="h-3.5 w-3.5" /> Download a complete JSON backup
          </a>
        </div>
      </Panel>

      <Panel title="AI provider" description="Extraction and assistant features depend on a configured provider.">
        <div className="flex items-center justify-between gap-4 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface-2)]/60 p-4 sm:p-5">
          <div>
            <p className="text-sm font-semibold text-[var(--color-text-primary)]">
              {ai.configured ? "Connected" : "Not configured"}
            </p>
            <p className="mt-0.5 text-xs text-[var(--color-text-tertiary)]">
              {ai.provider ? `Provider: ${ai.provider}` : "Add provider credentials to enable AI features."}
            </p>
          </div>
          <span
            className="rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-wider"
            style={{
              background: ai.configured ? "var(--color-emerald-50)" : "var(--color-surface-3)",
              borderColor: ai.configured ? "var(--color-emerald-200)" : "var(--color-border)",
              color: ai.configured ? "var(--color-emerald-700)" : "var(--color-text-tertiary)",
            }}
          >
            {ai.configured ? "Ready" : "Offline"}
          </span>
        </div>
      </Panel>

      <Panel title="Backups & import">
        <div className="space-y-3">
          <InlineNote icon={RefreshCw}>
            JSON exports are complete and portable. There is no automated cloud backup and
            no bulk import — records should be added through the relevant workspace.
          </InlineNote>
          <InlineNote icon={LayoutDashboard}>
            Database connection and provider keys are managed by the deployment
            environment, not from this screen.
          </InlineNote>
        </div>
      </Panel>
    </div>
  );
}

// ── 09. Appearance ──────────────────────────────────────────────────────────

export function AppearanceSection({ settings, setPath }) {
  const appearance = settings.appearance;
  const activeAccent = ACCENT_OPTIONS.find((a) => a.value === appearance.accent);

  return (
    <div className="space-y-6">
      <SectionHeading
        icon={Palette}
        title="Appearance"
        description="Theme, accent and density apply across the entire workspace the moment you save."
      />

      <Panel title="Theme">
        <div className="grid grid-cols-3 gap-3 sm:gap-4">
          {THEME_OPTIONS.map((option) => {
            const Icon = THEME_ICONS[option.value] || Sun;
            const active = appearance.theme === option.value;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => setPath("appearance.theme", option.value)}
                aria-pressed={active}
                className={`flex flex-col items-center gap-2.5 rounded-[var(--radius-lg)] border p-4 sm:p-5 transition-all cursor-pointer ${
                  active
                    ? "border-[var(--color-emerald-500)] bg-[var(--color-emerald-50)] text-[var(--color-emerald-700)] dark:bg-[var(--color-emerald-500)]/15 dark:text-[var(--color-emerald-400)] shadow-xs"
                    : "border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-2)]"
                }`}
              >
                <Icon className="h-6 w-6" aria-hidden="true" />
                <span className="text-xs font-semibold">{option.label}</span>
                {option.hint && (
                  <span className="text-[10px] text-[var(--color-text-tertiary)]">{option.hint}</span>
                )}
              </button>
            );
          })}
        </div>
      </Panel>

      <Panel
        title="Accent colour"
        description={
          activeAccent
            ? `${activeAccent.label} — used for primary actions, links and highlights.`
            : "Used for primary actions, links and highlights."
        }
      >
        <div className="flex flex-wrap gap-3">
          {ACCENT_OPTIONS.map((accent) => {
            const active = appearance.accent === accent.value;
            return (
              <button
                key={accent.value}
                type="button"
                onClick={() => setPath("appearance.accent", accent.value)}
                aria-pressed={active}
                aria-label={accent.label}
                className={`group flex items-center gap-2.5 rounded-full border py-1.5 pl-1.5 pr-4 transition-all cursor-pointer ${
                  active
                    ? "border-[var(--color-text-primary)] bg-[var(--color-surface-2)]"
                    : "border-[var(--color-border)] bg-[var(--color-surface)] hover:bg-[var(--color-surface-2)]"
                }`}
              >
                <span
                  className="relative flex h-7 w-7 items-center justify-center rounded-full"
                  style={{ background: accent.palette[500] }}
                >
                  {active && <Check className="h-3.5 w-3.5 text-white drop-shadow" />}
                </span>
                <span className="text-xs font-medium text-[var(--color-text-primary)]">
                  {accent.label}
                </span>
              </button>
            );
          })}
        </div>
      </Panel>

      <Panel title="Layout">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Select
            label="Interface density"
            options={DENSITY_OPTIONS}
            value={appearance.density}
            onChange={(e) => setPath("appearance.density", e.target.value)}
            helperText="Scales spacing throughout the application."
          />
          <Select
            label="Dashboard emphasis"
            options={DASHBOARD_LAYOUT_OPTIONS}
            value={appearance.dashboardLayout}
            onChange={(e) => setPath("appearance.dashboardLayout", e.target.value)}
          />
        </div>
        <div className="mt-4">
          <ToggleRow
            label="Collapse the sidebar by default"
            description="The sidebar can still be expanded at any time; your choice is remembered."
            checked={appearance.sidebarCollapsed}
            onChange={(v) => setPath("appearance.sidebarCollapsed", v)}
          />
        </div>
      </Panel>

      <Panel title="Motion & accessibility">
        <ToggleRow
          label="Reduce motion"
          description="Minimizes animation and transition effects across the app."
          checked={appearance.reducedMotion}
          onChange={(v) => setPath("appearance.reducedMotion", v)}
        />
      </Panel>
    </div>
  );
}

// ── 10. Activity & Audit ────────────────────────────────────────────────────

const ACTION_STYLES = {
  create: { bg: "var(--color-emerald-50)", color: "var(--color-emerald-700)" },
  update: { bg: "var(--color-surface-3)", color: "var(--color-text-secondary)" },
  delete: { bg: "var(--color-negative-bg)", color: "var(--color-negative)" },
  login: { bg: "var(--color-surface-3)", color: "var(--color-text-secondary)" },
  export: { bg: "var(--color-gold-100)", color: "var(--color-gold-800)" },
  extract: { bg: "var(--color-emerald-50)", color: "var(--color-emerald-700)" },
  approve: { bg: "var(--color-emerald-50)", color: "var(--color-emerald-700)" },
};

export function ActivitySection() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [total, setTotal] = useState(0);
  const [scope, setScope] = useState("all");
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      try {
        const res = await fetch("/api/audit?limit=25");
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "Could not load activity.");
        if (!cancelled) {
          setEvents(Array.isArray(json.events) ? json.events : []);
          setTotal(Number(json.total) || 0);
        }
      } catch (err) {
        if (!cancelled) setError(err.message || "Could not load activity.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    run();
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  function refresh() {
    setLoading(true);
    setError(null);
    setReloadKey((key) => key + 1);
  }

  const visible = useMemo(() => {
    if (scope === "all") return events;
    if (scope === "settings") return events.filter((e) => e.entityType === "settings");
    if (scope === "documents")
      return events.filter((e) => ["document", "documents"].includes(e.entityType));
    return events.filter((e) => e.entityType !== "settings");
  }, [events, scope]);

  return (
    <div className="space-y-6">
      <SectionHeading
        icon={History}
        title="Activity & Audit"
        description="A chronological, read-only record of meaningful actions in your workspace."
        badge={
          <span className="rounded-full border border-[var(--color-border)] bg-[var(--color-surface-2)] px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-tertiary)]">
            {total} events
          </span>
        }
      />

      <Panel
        title="Recent activity"
        action={
          <Button variant="ghost" size="sm" icon={RefreshCw} onClick={refresh} loading={loading}>
            Refresh
          </Button>
        }
      >
        <div className="mb-4 flex flex-wrap gap-2">
          {[
            { id: "all", label: "All" },
            { id: "settings", label: "Settings" },
            { id: "documents", label: "Documents" },
            { id: "financial", label: "Financial" },
          ].map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => setScope(option.id)}
              className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer ${
                scope === option.id
                  ? "border-[var(--color-emerald-500)] bg-[var(--color-emerald-50)] text-[var(--color-emerald-700)] dark:bg-[var(--color-emerald-500)]/15 dark:text-[var(--color-emerald-400)]"
                  : "border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-tertiary)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-text-primary)]"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>

        {error && <Banner tone="error">{error}</Banner>}

        {loading && !events.length ? (
          <ul className="space-y-3">
            {[0, 1, 2, 3].map((i) => (
              <li
                key={i}
                className="h-14 animate-pulse rounded-[var(--radius-lg)] bg-[var(--color-surface-2)]"
              />
            ))}
          </ul>
        ) : visible.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 rounded-[var(--radius-xl)] border border-dashed border-[var(--color-border-strong)] px-6 py-14 text-center">
            <Activity className="h-8 w-8 text-[var(--color-text-tertiary)]" />
            <p className="text-sm font-semibold text-[var(--color-text-primary)]">No activity yet</p>
            <p className="max-w-xs text-xs text-[var(--color-text-tertiary)]">
              Creating, editing or exporting records will appear here with timestamps.
            </p>
          </div>
        ) : (
          <ol className="divide-y divide-[var(--color-border)]">
            {visible.map((event) => {
              const style = ACTION_STYLES[event.action] || ACTION_STYLES.update;
              return (
                <li key={event.id} className="flex items-start gap-3.5 py-3.5">
                  <span
                    className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-[11px] font-bold uppercase shadow-xs"
                    style={{ background: style.bg, color: style.color }}
                    aria-hidden="true"
                  >
                    {String(event.action || "?").slice(0, 2)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-semibold text-[var(--color-text-primary)]">
                      {event.summary || `${event.action} ${event.entityType}`}
                    </p>
                    <p className="mt-1 text-[10px] uppercase tracking-wider text-[var(--color-text-tertiary)]">
                      {event.entityType} · {formatRelative(event.createdAt)}
                    </p>
                  </div>
                </li>
              );
            })}
          </ol>
        )}
        {!loading && visible.length > 0 && (
          <p className="mt-4 text-center text-xs text-[var(--color-text-tertiary)]">
            Showing the latest {visible.length} of {total} events
          </p>
        )}
      </Panel>

      <InlineNote icon={KeyRound}>
        Audit events are immutable. Deleting a record does not erase the fact that it
        existed — the trail keeps your financial history accountable.
      </InlineNote>
    </div>
  );
}
