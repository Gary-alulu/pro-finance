"use client";
// components/settings/SettingsSectionsA.js
// Profile, Financial, Invoices, AI and Financial Map settings panels.

import { useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  Building2,
  CheckCircle2,
  Circle,
  Cpu,
  Globe2,
  Hash,
  Network,
  Sparkles,
  SlidersHorizontal,
  Upload,
  UserRound,
  X,
} from "lucide-react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Textarea from "@/components/ui/Textarea";
import { PasswordInput, noPaste } from "@/components/auth/AuthUI";
import {
  COST_BASIS_OPTIONS,
  DASHBOARD_LAYOUT_OPTIONS,
  DATE_FORMAT_OPTIONS,
  DENSITY_OPTIONS,
  FINANCIAL_YEAR_MONTHS,
  LANGUAGE_OPTIONS,
  MAP_LAYOUT_OPTIONS,
  NODE_TYPE_OPTIONS,
  NUMBER_FORMAT_OPTIONS,
  ROUNDING_OPTIONS,
  SNAPSHOT_FREQUENCY_OPTIONS,
  TIME_ZONE_OPTIONS,
  formatSettingsDate,
  formatSettingsNumber,
} from "@/lib/settings/defaults";
import { SUPPORTED_CURRENCIES } from "@/lib/finance/currency";
import { formatInvoiceNumber } from "@/lib/invoices/numbering";
import {
  Banner,
  InlineNote,
  Panel,
  SectionHeading,
  ToggleRow,
} from "./SettingsControls";

const CURRENCY_OPTIONS = SUPPORTED_CURRENCIES.map((currency) => ({
  value: currency.code,
  label: `${currency.code} — ${currency.name}`,
}));

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
            className="flex items-center gap-1.5 text-xs"
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

function timeZoneOptions(current) {
  const values = [...TIME_ZONE_OPTIONS];
  if (current && !values.includes(current)) values.unshift(current);
  return values.map((zone) => ({ value: zone, label: zone.replace(/_/g, " ") }));
}

// ── 01. Profile & Personalization ───────────────────────────────────────────

export function ProfileSection({ settings, setPath, user, onProfileSaved, onRefreshSession }) {
  const [details, setDetails] = useState({ name: user?.name || "", email: user?.email || "" });
  const [currentPassword, setCurrentPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  const emailChanged =
    details.email.trim().toLowerCase() !== (user?.email || "").toLowerCase();
  const nameChanged = details.name.trim() !== (user?.name || "");
  const canSave = (emailChanged || nameChanged) && currentPassword.length > 0;

  async function saveIdentity(e) {
    e.preventDefault();
    if (!canSave) return;
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "details",
          currentPassword,
          name: details.name.trim(),
          ...(emailChanged ? { email: details.email.trim() } : {}),
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setMessage({ tone: "error", text: json.error || "Could not save your profile." });
        return;
      }
      setCurrentPassword("");
      setMessage({ tone: "success", text: "Profile details updated." });
      onProfileSaved?.(json.user);
      await onRefreshSession?.();
    } catch {
      setMessage({ tone: "error", text: "Network error. Please try again." });
    } finally {
      setSaving(false);
    }
  }

  const profile = settings.profile;

  return (
    <div className="space-y-6">
      <SectionHeading
        icon={UserRound}
        title="Profile & Personalization"
        description="Your identity, account preferences and how the application presents financial information."
      />

      <Panel
        title="Account holder"
        description="Changing your email changes your login credential. Confirm with your current password."
      >
        <form onSubmit={saveIdentity} className="space-y-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              label="Full name"
              value={details.name}
              onChange={(e) => setDetails((d) => ({ ...d, name: e.target.value }))}
            />
            <Input
              label="Email address"
              type="email"
              value={details.email}
              onChange={(e) => setDetails((d) => ({ ...d, email: e.target.value }))}
            />
            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-secondary)]">
                Confirm with current password
              </label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                onPaste={noPaste}
                onDrop={noPaste}
                onCut={noPaste}
                autoComplete="current-password"
                placeholder="Required to save identity changes"
                className="auth-input auth-input-password"
              />
            </div>
          </div>
          {message && <Banner tone={message.tone}>{message.text}</Banner>}
          <div className="flex items-center justify-between gap-3">
            {emailChanged && (
              <p className="text-[11px] text-[var(--color-text-tertiary)]">
                Sign in with the new address next time.
              </p>
            )}
            <Button type="submit" loading={saving} disabled={!canSave}>
              Save profile
            </Button>
          </div>
        </form>
      </Panel>

      <Panel
        title="Personalization"
        description="Applied to dates, numbers and the default currency for new records."
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input
            label="Preferred name"
            placeholder="How we address you"
            value={profile.preferredName}
            onChange={(e) => setPath("profile.preferredName", e.target.value)}
          />
          <Select
            label="Language"
            options={LANGUAGE_OPTIONS}
            value={profile.language}
            onChange={(e) => setPath("profile.language", e.target.value)}
          />
          <Select
            label="Time zone"
            options={timeZoneOptions(profile.timeZone)}
            value={profile.timeZone}
            onChange={(e) => setPath("profile.timeZone", e.target.value)}
          />
          <Select
            label="Date format"
            options={DATE_FORMAT_OPTIONS}
            value={profile.dateFormat}
            onChange={(e) => setPath("profile.dateFormat", e.target.value)}
          />
          <Select
            label="Number format"
            options={NUMBER_FORMAT_OPTIONS}
            value={profile.numberFormat}
            onChange={(e) => setPath("profile.numberFormat", e.target.value)}
          />
          <Select
            label="Default currency"
            options={CURRENCY_OPTIONS}
            value={profile.defaultCurrency}
            onChange={(e) => setPath("profile.defaultCurrency", e.target.value)}
            helperText="Shared with Financial preferences and used for new records."
          />
        </div>
        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface-2)]/60 p-4 sm:p-5">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-tertiary)]">
              Date preview
            </p>
            <p className="mt-1 text-sm font-medium text-[var(--color-text-primary)]">
              {formatSettingsDate(new Date(), profile.dateFormat)}
            </p>
          </div>
          <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface-2)]/60 p-4 sm:p-5">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-tertiary)]">
              Number preview
            </p>
            <p className="mt-1 text-sm font-medium tabular-nums text-[var(--color-text-primary)]">
              {formatSettingsNumber(1234567.89, profile.numberFormat)}
            </p>
          </div>
        </div>
      </Panel>
    </div>
  );
}

// ── 02. Financial Preferences ───────────────────────────────────────────────

export function FinancialSection({ settings, setPath }) {
  const financial = settings.financial;

  return (
    <div className="space-y-6">
      <SectionHeading
        icon={SlidersHorizontal}
        title="Financial Preferences"
        description="Control how balances, investments, valuations and reports are recorded and displayed."
      />

      <Panel title="Reporting basis">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Select
            label="Reporting currency"
            options={CURRENCY_OPTIONS}
            value={financial.reportingCurrency}
            onChange={(e) => setPath("financial.reportingCurrency", e.target.value)}
            helperText="Summaries consolidate into this currency."
          />
          <Select
            label="Financial year starts in"
            options={FINANCIAL_YEAR_MONTHS}
            value={financial.financialYearStartMonth}
            onChange={(e) =>
              setPath("financial.financialYearStartMonth", Number(e.target.value))
            }
          />
          <Input
            label="Valuation freshness threshold"
            type="number"
            min="1"
            max="3650"
            suffix="days"
            value={financial.valuationFreshnessDays}
            onChange={(e) =>
              setPath("financial.valuationFreshnessDays", Number(e.target.value))
            }
            helperText="Valuations older than this are flagged stale."
          />
          <Select
            label="Investment cost-basis method"
            options={COST_BASIS_OPTIONS}
            value={financial.costBasisMethod}
            onChange={(e) => setPath("financial.costBasisMethod", e.target.value)}
          />
          <Select
            label="Snapshot cadence"
            options={SNAPSHOT_FREQUENCY_OPTIONS}
            value={financial.snapshotFrequency}
            onChange={(e) => setPath("financial.snapshotFrequency", e.target.value)}
            helperText="Historical snapshots are preserved, never rewritten."
          />
          <Select
            label="Rounding"
            options={ROUNDING_OPTIONS.map((o) => ({
              value: String(o.value),
              label: o.label,
            }))}
            value={String(financial.roundingPrecision)}
            onChange={(e) =>
              setPath("financial.roundingPrecision", Number(e.target.value))
            }
            helperText="Display rounding only — stored values keep full precision."
          />
        </div>
      </Panel>

      <Panel title="Privacy default">
        <ToggleRow
          label="Hide balances by default"
          description="New sessions start with sensitive amounts masked until revealed. Stored values are unchanged."
          checked={financial.hideBalancesByDefault}
          onChange={(v) => setPath("financial.hideBalancesByDefault", v)}
        />
      </Panel>

      <InlineNote icon={Globe2}>
        Foreign-currency values only convert through an explicit, dated exchange rate.
        Changing the reporting currency never rewrites the original currency of an
        existing transaction.
      </InlineNote>
    </div>
  );
}

// ── 03. Invoices & Billing ──────────────────────────────────────────────────

const MAX_LOGO_BYTES = 150 * 1024;

export function InvoicesSection({ settings, setPath }) {
  const invoices = settings.invoices;
  const fileRef = useRef(null);
  const [logoError, setLogoError] = useState(null);

  function handleLogo(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    setLogoError(null);
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setLogoError("Choose an image file for the logo.");
      return;
    }
    if (file.size > MAX_LOGO_BYTES) {
      setLogoError("Logo must be 150 KB or smaller.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setPath("invoices.issuer.logo", String(reader.result || ""));
    reader.onerror = () => setLogoError("Could not read that image.");
    reader.readAsDataURL(file);
  }

  const numberPreview = formatInvoiceNumber(invoices.numbering, {
    year: new Date().getFullYear(),
    sequence: invoices.numbering.nextNumber,
  });

  return (
    <div className="space-y-6">
      <SectionHeading
        icon={Building2}
        title="Invoices & Billing"
        description="Your billing identity, numbering rules and the defaults applied to new invoice drafts."
      />

      <Panel
        title="Issuer details"
        description="Shown in the invoice header by default."
        action={
          <div className="flex items-center gap-1.5">
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleLogo}
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              icon={Upload}
              onClick={() => fileRef.current?.click()}
            >
              Logo
            </Button>
            {invoices.issuer.logo && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                icon={X}
                aria-label="Remove logo"
                onClick={() => setPath("invoices.issuer.logo", "")}
              />
            )}
          </div>
        }
      >
        {logoError && <Banner tone="error">{logoError}</Banner>}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input
            label="Business name"
            value={invoices.issuer.name}
            onChange={(e) => setPath("invoices.issuer.name", e.target.value)}
          />
          <Input
            label="Email"
            value={invoices.issuer.email}
            onChange={(e) => setPath("invoices.issuer.email", e.target.value)}
          />
          <Input
            label="Phone"
            value={invoices.issuer.phone}
            onChange={(e) => setPath("invoices.issuer.phone", e.target.value)}
          />
          <Input
            label="Tax PIN"
            value={invoices.issuer.taxId}
            onChange={(e) => setPath("invoices.issuer.taxId", e.target.value)}
          />
          <Textarea
            label="Address"
            rows={2}
            containerClassName="sm:col-span-2"
            value={invoices.issuer.address}
            onChange={(e) => setPath("invoices.issuer.address", e.target.value)}
          />
          {invoices.issuer.logo && (
            <div className="flex items-center gap-4 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface-2)]/60 p-4 sm:col-span-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={invoices.issuer.logo}
                alt="Issuer logo preview"
                className="h-10 w-auto max-w-[160px] object-contain"
              />
              <span className="text-xs text-[var(--color-text-tertiary)]">
                Logo preview
              </span>
            </div>
          )}
        </div>
      </Panel>

      <Panel title="Invoice defaults" description="Applied to each new draft.">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Select
            label="Default currency"
            options={CURRENCY_OPTIONS}
            value={invoices.defaultCurrency}
            onChange={(e) => setPath("invoices.defaultCurrency", e.target.value)}
            helperText="Affects new drafts only — issued invoices keep their currency."
          />
          <Input
            label="Default payment terms"
            type="number"
            min="0"
            max="365"
            suffix="days"
            value={invoices.defaultDueDays}
            onChange={(e) => setPath("invoices.defaultDueDays", Number(e.target.value))}
          />
          <Input
            label="Default tax rate"
            type="number"
            min="0"
            step="any"
            suffix="%"
            value={invoices.defaultTaxRate}
            onChange={(e) => setPath("invoices.defaultTaxRate", e.target.value)}
          />
          <Input
            label="Template"
            value="Classic"
            disabled
            helperText="Additional templates can be added without changing stored drafts."
          />
        </div>
        <div className="mt-4">
          <ToggleRow
            label="New line items are tax-exempt"
            description="You can override this per line item."
            checked={invoices.defaultTaxExempt}
            onChange={(v) => setPath("invoices.defaultTaxExempt", v)}
          />
        </div>
      </Panel>

      <Panel
        title="Invoice numbering"
        description="Preview only. Issued numbers are allocated on the server and never silently renumbered."
      >
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Input
            label="Prefix"
            containerClassName="col-span-1 sm:col-span-2"
            value={invoices.numbering.prefix}
            onChange={(e) => setPath("invoices.numbering.prefix", e.target.value)}
          />
          <Input
            label="Separator"
            containerClassName="col-span-1 sm:col-span-2"
            maxLength={3}
            value={invoices.numbering.separator}
            onChange={(e) => setPath("invoices.numbering.separator", e.target.value)}
          />
          <Input
            label="Next number"
            type="number"
            min="1"
            containerClassName="col-span-1 sm:col-span-2"
            value={invoices.numbering.nextNumber}
            onChange={(e) =>
              setPath("invoices.numbering.nextNumber", Number(e.target.value))
            }
          />
          <Input
            label="Padding"
            type="number"
            min="1"
            max="12"
            containerClassName="col-span-1 sm:col-span-2"
            value={invoices.numbering.padding}
            onChange={(e) => setPath("invoices.numbering.padding", Number(e.target.value))}
          />
        </div>
        <div className="mt-4">
          <ToggleRow
            label="Include year in the number"
            checked={invoices.numbering.includeYear}
            onChange={(v) => setPath("invoices.numbering.includeYear", v)}
          />
        </div>
        <div className="mt-4 rounded-[var(--radius-lg)] border border-dashed border-[var(--color-border-strong)] bg-[var(--color-surface-2)]/50 p-4 sm:p-5">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-tertiary)]">
            Preview
          </p>
          <p className="mt-1 text-sm font-semibold tabular-nums text-[var(--color-text-primary)]">
            {numberPreview}
          </p>
        </div>
      </Panel>

      <Panel title="PDF preferences" description="Used when an invoice is rendered or exported.">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Select
            label="Paper size"
            options={[
              { value: "A4", label: "A4" },
              { value: "Letter", label: "US Letter" },
            ]}
            value={invoices.pdf.paperSize}
            onChange={(e) => setPath("invoices.pdf.paperSize", e.target.value)}
          />
          <Input
            label="Footer note"
            value={invoices.pdf.footerNote}
            onChange={(e) => setPath("invoices.pdf.footerNote", e.target.value)}
          />
        </div>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <ToggleRow
            label="Show logo"
            checked={invoices.pdf.showLogo}
            onChange={(v) => setPath("invoices.pdf.showLogo", v)}
          />
          <ToggleRow
            label="Show tax PIN"
            checked={invoices.pdf.showTaxId}
            onChange={(v) => setPath("invoices.pdf.showTaxId", v)}
          />
        </div>
      </Panel>

      <Panel title="Default messages" description="Prefilled into new drafts and editable per invoice.">
        <div className="space-y-4">
          <Textarea
            label="Payment instructions"
            rows={2}
            value={invoices.defaultPaymentInstructions}
            onChange={(e) =>
              setPath("invoices.defaultPaymentInstructions", e.target.value)
            }
          />
          <Textarea
            label="Notes"
            rows={2}
            value={invoices.defaultNotes}
            onChange={(e) => setPath("invoices.defaultNotes", e.target.value)}
          />
          <Textarea
            label="Terms"
            rows={2}
            value={invoices.defaultTerms}
            onChange={(e) => setPath("invoices.defaultTerms", e.target.value)}
          />
        </div>
      </Panel>

      <InlineNote icon={Hash}>
        Invoice numbers are unique per owner on the server. Drafts only display the
        next suggested number; issuing allocates the real one.
      </InlineNote>
    </div>
  );
}

// ── 04. AI & Automation ─────────────────────────────────────────────────────

export function AISection({ settings, setPath }) {
  const ai = settings.ai;
  const thresholdPct = Math.round((ai.confidenceThreshold ?? 0.8) * 100);

  return (
    <div className="space-y-6">
      <SectionHeading
        icon={Sparkles}
        title="AI & Automation"
        description="Choose how AI reads documents, proposes relationships and assists with analysis."
      />

      <Panel title="Document extraction">
        <div className="space-y-3">
          <ToggleRow
            label="Enable AI document extraction"
            description="When off, uploads stay untouched until you re-enable extraction."
            checked={ai.extractionEnabled}
            onChange={(v) => setPath("ai.extractionEnabled", v)}
          />
          <ToggleRow
            label="Require explicit approval before AI changes official records"
            description="Enforced by the server. AI proposals never become official records without your approval."
            checked
            disabled
            onChange={() => {}}
          />
          <ToggleRow
            label="Automatically classify uploaded documents"
            description="Suggests a document type from the filename and content."
            checked={ai.autoClassifyDocuments}
            onChange={(v) => setPath("ai.autoClassifyDocuments", v)}
          />
          <ToggleRow
            label="Detect duplicate documents"
            description="Flags uploads with a matching content hash for review."
            checked={ai.duplicateDetection}
            onChange={(v) => setPath("ai.duplicateDetection", v)}
          />
        </div>
      </Panel>

      <Panel
        title="Confidence threshold"
        description="Extractions below this confidence are highlighted for closer review."
      >
        <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface-2)]/50 p-4 sm:p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[var(--color-text-secondary)]">
              Minimum confidence
            </span>
            <span className="text-sm font-semibold tabular-nums text-[var(--color-text-primary)]">
              {thresholdPct}%
            </span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            step="5"
            value={thresholdPct}
            onChange={(e) =>
              setPath("ai.confidenceThreshold", Number(e.target.value) / 100)
            }
            className="mt-3 w-full accent-[var(--color-emerald-600)]"
          />
        </div>
      </Panel>

      <Panel title="Relationships & assistant">
        <div className="space-y-3">
          <ToggleRow
            label="Suggest record relationships"
            description="AI may propose links such as secured-by or evidences. Suggestions stay dashed until confirmed."
            checked={ai.relationshipSuggestions}
            onChange={(v) => setPath("ai.relationshipSuggestions", v)}
          />
          <ToggleRow
            label="AI assistant permissions"
            description="Allow the assistant to answer questions using your financial records."
            checked={ai.assistantEnabled}
            onChange={(v) => setPath("ai.assistantEnabled", v)}
          />
        </div>
      </Panel>

      <Panel
        title="Processing history"
        description="Review extraction and reconciliation activity in the relevant modules."
      >
        <div className="flex flex-wrap gap-3">
          <Link
            href="/documents"
            className="inline-flex items-center gap-1.5 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3.5 py-2 text-xs font-medium text-[var(--color-text-primary)] transition-colors hover:bg-[var(--color-surface-3)]"
          >
            Document review studio <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
          <Link
            href="/accountability"
            className="inline-flex items-center gap-1.5 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3.5 py-2 text-xs font-medium text-[var(--color-text-primary)] transition-colors hover:bg-[var(--color-surface-3)]"
          >
            Accountability findings <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
          <Link
            href="/map"
            className="inline-flex items-center gap-1.5 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3.5 py-2 text-xs font-medium text-[var(--color-text-primary)] transition-colors hover:bg-[var(--color-surface-3)]"
          >
            Suggested links on the map <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </Panel>

      <InlineNote icon={Cpu}>
        AI proposes; you approve. Extraction results, suggestions and approvals are
        all recorded in the audit trail.
      </InlineNote>
    </div>
  );
}

// ── 05. Financial Map ───────────────────────────────────────────────────────

export function MapSection({ settings, setPath }) {
  const map = settings.map;
  const visible = new Set(map.visibleNodeTypes);

  function toggleNodeType(type, on) {
    const next = new Set(visible);
    if (on) next.add(type);
    else next.delete(type);
    if (next.size === 0) return;
    setPath(
      "map.visibleNodeTypes",
      NODE_TYPE_OPTIONS.map((o) => o.value).filter((value) => next.has(value))
    );
  }

  return (
    <div className="space-y-6">
      <SectionHeading
        icon={Network}
        title="Financial Map"
        description="Personalize how assets, liabilities, investments, documents and invoices connect visually."
      />

      <Panel title="Layout & density">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Select
            label="Default graph layout"
            options={MAP_LAYOUT_OPTIONS}
            value={map.layout}
            onChange={(e) => setPath("map.layout", e.target.value)}
          />
          <Select
            label="Graph density"
            options={DENSITY_OPTIONS}
            value={map.density}
            onChange={(e) => setPath("map.density", e.target.value)}
          />
        </div>
      </Panel>

      <Panel title="Visible node types" description="At least one node type must stay visible.">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {NODE_TYPE_OPTIONS.map((option) => (
            <ToggleRow
              key={option.value}
              label={option.label}
              checked={visible.has(option.value)}
              onChange={(on) => toggleNodeType(option.value, on)}
            />
          ))}
        </div>
      </Panel>

      <Panel title="Display">
        <div className="space-y-3">
          <ToggleRow
            label="Show relationship values and balances"
            description="Hiding values keeps graph relationships intact while masking amounts."
            checked={map.showValues}
            onChange={(v) => setPath("map.showValues", v)}
          />
          <ToggleRow
            label="Show node labels"
            description="Titles and tickers on each node."
            checked={map.showNodeLabels}
            onChange={(v) => setPath("map.showNodeLabels", v)}
          />
          <ToggleRow
            label="Show AI-suggested relationships"
            description="Suggested links appear dashed until you confirm them."
            checked={map.showAiSuggestions}
            onChange={(v) => setPath("map.showAiSuggestions", v)}
          />
        </div>
      </Panel>

      <Panel title="Dashboard default" description="Which block leads the Overview page.">
        <Select
          label="Default dashboard layout"
          options={DASHBOARD_LAYOUT_OPTIONS}
          value={settings.appearance.dashboardLayout}
          onChange={(e) => setPath("appearance.dashboardLayout", e.target.value)}
          helperText="The Overview page opens with this emphasis."
        />
      </Panel>

      <div className="flex flex-wrap gap-3">
        <Link
          href="/map"
          className="inline-flex items-center gap-1.5 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3.5 py-2 text-xs font-medium text-[var(--color-text-primary)] transition-colors hover:bg-[var(--color-surface-3)]"
        >
          Open Financial Map <ArrowUpRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </div>
  );
}
