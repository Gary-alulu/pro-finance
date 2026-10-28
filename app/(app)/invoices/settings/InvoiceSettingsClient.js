"use client";
// app/(app)/invoices/settings/InvoiceSettingsClient.js
// Browser-local issuer profile and invoice defaults for Stage 1.

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Building2,
  Hash,
  Lock,
  MessageSquareText,
  RotateCcw,
  Save,
  SlidersHorizontal,
  Upload,
  X,
} from "lucide-react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Textarea from "@/components/ui/Textarea";
import { useToast } from "@/components/providers/ToastProvider";
import { Panel } from "@/components/invoices/InvoiceFormSections";
import { SUPPORTED_CURRENCIES } from "@/lib/finance/currency";
import { defaultInvoiceSettings } from "@/lib/invoices/constants";
import {
  clampPadding,
  formatInvoiceNumber,
} from "@/lib/invoices/numbering";
import {
  readInvoiceSettings,
  saveInvoiceSettings,
} from "@/lib/invoices/localDrafts";

const MAX_LOGO_BYTES = 150 * 1024;

const CURRENCY_OPTIONS = SUPPORTED_CURRENCIES.map((currency) => ({
  value: currency.code,
  label: `${currency.code} - ${currency.name}`,
}));

export default function InvoiceSettingsClient() {
  const { success, error } = useToast();
  const [settings, setSettings] = useState(defaultInvoiceSettings);
  const [savedSnapshot, setSavedSnapshot] = useState(() =>
    JSON.stringify(defaultInvoiceSettings())
  );
  const fileRef = useRef(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      const loaded = readInvoiceSettings();
      setSettings(loaded);
      setSavedSnapshot(JSON.stringify(loaded));
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  const dirty = JSON.stringify(settings) !== savedSnapshot;

  const patch = (changes) => setSettings((prev) => ({ ...prev, ...changes }));
  const patchIssuer = (changes) =>
    setSettings((prev) => ({
      ...prev,
      issuer: { ...prev.issuer, ...changes },
    }));
  const patchNumbering = (changes) =>
    setSettings((prev) => ({
      ...prev,
      numbering: { ...prev.numbering, ...changes },
    }));

  function handleLogo(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      error("Choose an image file for the logo.");
      return;
    }
    if (file.size > MAX_LOGO_BYTES) {
      error("Logo must be 150 KB or smaller.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => patchIssuer({ logo: String(reader.result || "") });
    reader.onerror = () => error("Could not read that image.");
    reader.readAsDataURL(file);
  }

  function handleSave() {
    const dueDays = Math.min(
      Math.max(parseInt(settings.defaultDueDays, 10) || 0, 0),
      365
    );
    const nextNumber = Math.max(
      parseInt(settings.numbering.nextNumber, 10) || 1,
      1
    );
    const normalized = {
      ...settings,
      defaultDueDays: dueDays,
      numbering: {
        ...settings.numbering,
        prefix: String(settings.numbering.prefix || "").trim() || "INV",
        separator:
          settings.numbering.separator === undefined
            ? "-"
            : String(settings.numbering.separator),
        padding: clampPadding(settings.numbering.padding),
        nextNumber,
      },
    };

    const saved = saveInvoiceSettings(normalized);
    setSettings(saved);
    setSavedSnapshot(JSON.stringify(saved));
    success("Invoice settings saved in this browser.");
  }

  function handleReset() {
    setSettings(defaultInvoiceSettings());
  }

  const numberPreview = formatInvoiceNumber(settings.numbering, {
    year: new Date().getFullYear(),
    sequence: settings.numbering.nextNumber,
  });

  return (
    <div className="mx-auto max-w-[1100px] px-4 py-5 md:px-6 md:py-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <Link
            href="/invoices"
            className="mt-0.5 rounded-[var(--radius-md)] p-1.5 text-[var(--color-text-tertiary)] transition-colors hover:bg-[var(--color-surface-2)] hover:text-[var(--color-text-primary)]"
            aria-label="Back to invoices"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-[var(--color-text-primary)]">
              Invoice settings
            </h1>
            <p className="mt-1 text-xs leading-relaxed text-[var(--color-text-secondary)]">
              Defaults for new drafts: issuer details, numbering, tax and terms.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            icon={RotateCcw}
            onClick={handleReset}
          >
            Reset defaults
          </Button>
          <Button type="button" size="sm" icon={Save} onClick={handleSave}>
            Save settings
          </Button>
        </div>
      </div>

      <div className="mt-4 flex items-start gap-2 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3.5 py-2.5">
        <Lock
          className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-[var(--color-text-tertiary)]"
          aria-hidden="true"
        />
        <p className="text-[11px] leading-relaxed text-[var(--color-text-secondary)]">
          Saved in this browser only. The server will own invoice settings and
          numbering once accounts and persistence are connected (Stage 2).
          {dirty && (
            <span className="ml-1 font-semibold text-[var(--color-gold-700)]">
              Unsaved changes.
            </span>
          )}
        </p>
      </div>

      <div className="mt-4 space-y-4">
        <Panel
          icon={Building2}
          title="Business identity"
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
              {settings.issuer.logo && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  icon={X}
                  onClick={() => patchIssuer({ logo: "" })}
                  aria-label="Remove logo"
                />
              )}
            </div>
          }
        >
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Input
              label="Business name"
              value={settings.issuer.name || ""}
              onChange={(e) => patchIssuer({ name: e.target.value })}
            />
            <Input
              label="Email"
              type="email"
              value={settings.issuer.email || ""}
              onChange={(e) => patchIssuer({ email: e.target.value })}
            />
            <Input
              label="Phone"
              value={settings.issuer.phone || ""}
              onChange={(e) => patchIssuer({ phone: e.target.value })}
            />
            <Input
              label="Tax PIN"
              value={settings.issuer.taxId || ""}
              onChange={(e) => patchIssuer({ taxId: e.target.value })}
            />
            <Textarea
              label="Address"
              rows={3}
              containerClassName="sm:col-span-2"
              value={settings.issuer.address || ""}
              onChange={(e) => patchIssuer({ address: e.target.value })}
            />
          </div>
        </Panel>

        <Panel
          icon={SlidersHorizontal}
          title="Invoice defaults"
          description="Applied to every new draft."
        >
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Select
              label="Default currency"
              options={CURRENCY_OPTIONS}
              value={settings.defaultCurrency}
              onChange={(e) => patch({ defaultCurrency: e.target.value })}
            />
            <Input
              label="Default due period"
              type="number"
              min="0"
              max="365"
              suffix="days"
              value={settings.defaultDueDays}
              onChange={(e) => patch({ defaultDueDays: e.target.value })}
            />
            <Input
              label="Default tax rate"
              type="number"
              min="0"
              step="any"
              suffix="%"
              value={settings.defaultTaxRate}
              onChange={(e) => patch({ defaultTaxRate: e.target.value })}
            />
            <label className="flex cursor-pointer items-start gap-2.5 self-end rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-2)]/40 px-3 py-2.5">
              <input
                type="checkbox"
                className="mt-0.5 h-4 w-4 accent-[var(--color-emerald-600)]"
                checked={Boolean(settings.defaultTaxExempt)}
                onChange={(e) => patch({ defaultTaxExempt: e.target.checked })}
              />
              <span>
                <span className="block text-xs font-medium text-[var(--color-text-primary)]">
                  New lines are tax-exempt
                </span>
                <span className="mt-0.5 block text-[11px] text-[var(--color-text-tertiary)]">
                  You can override this per line item.
                </span>
              </span>
            </label>

            <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-2)]/40 px-3 py-2.5 sm:col-span-2">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-tertiary)]">
                Template
              </p>
              <p className="mt-0.5 text-sm font-medium text-[var(--color-text-primary)]">
                Classic
              </p>
              <p className="mt-0.5 text-[11px] text-[var(--color-text-tertiary)]">
                The only Stage 1 layout. Additional templates can be added
                without changing stored drafts.
              </p>
            </div>
          </div>
        </Panel>

        <Panel
          icon={Hash}
          title="Numbering"
          description="Preview only. The server will allocate real numbers when issuing."
        >
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Input
              label="Prefix"
              containerClassName="col-span-1 sm:col-span-2"
              value={settings.numbering.prefix}
              onChange={(e) => patchNumbering({ prefix: e.target.value })}
            />
            <Input
              label="Separator"
              containerClassName="col-span-1 sm:col-span-2"
              maxLength={3}
              value={settings.numbering.separator}
              onChange={(e) => patchNumbering({ separator: e.target.value })}
            />
            <Input
              label="Next number"
              type="number"
              min="1"
              containerClassName="col-span-1 sm:col-span-2"
              value={settings.numbering.nextNumber}
              onChange={(e) => patchNumbering({ nextNumber: e.target.value })}
            />
            <Input
              label="Padding"
              type="number"
              min="1"
              max="12"
              containerClassName="col-span-1 sm:col-span-2"
              value={settings.numbering.padding}
              onChange={(e) => patchNumbering({ padding: e.target.value })}
            />
            <label className="col-span-2 flex cursor-pointer items-center gap-2 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-2)]/40 px-3 py-2.5 sm:col-span-2">
              <input
                type="checkbox"
                className="h-4 w-4 accent-[var(--color-emerald-600)]"
                checked={Boolean(settings.numbering.includeYear)}
                onChange={(e) =>
                  patchNumbering({ includeYear: e.target.checked })
                }
              />
              <span className="text-xs font-medium text-[var(--color-text-primary)]">
                Include year in the number
              </span>
            </label>
            <div className="col-span-2 rounded-[var(--radius-md)] border border-dashed border-[var(--color-border-strong)] bg-[var(--color-surface-2)]/50 px-3 py-2.5 sm:col-span-2">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-tertiary)]">
                Preview
              </p>
              <p className="text-sm font-semibold tabular-nums text-[var(--color-text-primary)]">
                {numberPreview}
              </p>
            </div>
          </div>
        </Panel>

        <Panel
          icon={MessageSquareText}
          title="Default messages"
          description="Prefilled into new drafts and editable per invoice."
        >
          <div className="grid grid-cols-1 gap-3">
            <Textarea
              label="Payment instructions"
              rows={3}
              value={settings.defaultPaymentInstructions || ""}
              onChange={(e) =>
                patch({ defaultPaymentInstructions: e.target.value })
              }
            />
            <Textarea
              label="Notes"
              rows={2}
              value={settings.defaultNotes || ""}
              onChange={(e) => patch({ defaultNotes: e.target.value })}
            />
            <Textarea
              label="Terms"
              rows={2}
              value={settings.defaultTerms || ""}
              onChange={(e) => patch({ defaultTerms: e.target.value })}
            />
          </div>
        </Panel>

        <div className="flex items-center justify-between gap-3 pb-4">
          <p className="text-[11px] text-[var(--color-text-tertiary)]">
            Defaults match the shipped invoice schema, so a future server import
            will not need to remap fields.
          </p>
          <Button type="button" icon={Save} onClick={handleSave}>
            Save settings
          </Button>
        </div>
      </div>
    </div>
  );
}
