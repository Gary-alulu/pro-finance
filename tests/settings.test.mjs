// tests/settings.test.mjs
// Tests the settings architecture, defaults, merge rules, formatting,
// and validation schemas.

import test from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_SETTINGS,
  SETTINGS_SECTION_IDS,
  mergeSettings,
  deepMergeSettings,
  sectionDefaults,
  resetAllSettings,
  invoiceSettingsFromUserSettings,
  formatSettingsDate,
  formatSettingsNumber,
} from "../lib/settings/defaults.js";
import { updateSettingsSchema } from "../lib/validations/schemas.js";

test("DEFAULT_SETTINGS covers all required setting sections", () => {
  assert.equal(SETTINGS_SECTION_IDS.length, 10);
  const preferenceSections = SETTINGS_SECTION_IDS.filter(
    (id) => id !== "data" && id !== "activity"
  );
  for (const id of preferenceSections) {
    assert.ok(DEFAULT_SETTINGS[id], `Missing section default for: ${id}`);
  }
  assert.equal(DEFAULT_SETTINGS.financial.reportingCurrency, "KES");
  assert.equal(DEFAULT_SETTINGS.financial.costBasisMethod, "average_cost");
  assert.equal(DEFAULT_SETTINGS.ai.extractionEnabled, true);
  assert.equal(DEFAULT_SETTINGS.security.dataRetentionDays, 0);
});

test("mergeSettings handles null or empty input gracefully", () => {
  const merged = mergeSettings(null);
  assert.equal(merged.financial.reportingCurrency, "KES");
  assert.equal(merged.financial.roundingPrecision, 2);
  assert.equal(merged.profile.dateFormat, "dd/MM/yyyy");
});

test("mergeSettings preserves user overrides while backfilling missing defaults", () => {
  const userSettings = {
    financial: {
      reportingCurrency: "USD",
      roundingPrecision: 3,
    },
    ai: {
      confidenceThreshold: 0.95,
    },
  };
  const merged = mergeSettings(userSettings);
  assert.equal(merged.financial.reportingCurrency, "USD");
  assert.equal(merged.financial.roundingPrecision, 3);
  // Default values should be preserved for untouched properties
  assert.equal(merged.financial.costBasisMethod, "average_cost");
  assert.equal(merged.ai.confidenceThreshold, 0.95);
  assert.equal(merged.ai.extractionEnabled, true);
});

test("mergeSettings syncs reporting currency with preferredCurrency context", () => {
  const merged = mergeSettings({}, { preferredCurrency: "EUR" });
  assert.equal(merged.financial.reportingCurrency, "EUR");
  assert.equal(merged.profile.defaultCurrency, "EUR");
});

test("deepMergeSettings does not mutate source objects", () => {
  const base = { financial: { reportingCurrency: "KES", roundingPrecision: 2 } };
  const patch = { financial: { reportingCurrency: "GBP" } };
  const merged = deepMergeSettings(base, patch);
  assert.equal(merged.financial.reportingCurrency, "GBP");
  assert.equal(base.financial.reportingCurrency, "KES");
});

test("resetAllSettings returns a clean copy of DEFAULT_SETTINGS", () => {
  const reset = resetAllSettings();
  assert.deepEqual(reset.financial, DEFAULT_SETTINGS.financial);
  reset.financial.reportingCurrency = "JPY";
  assert.equal(DEFAULT_SETTINGS.financial.reportingCurrency, "KES");
});

test("sectionDefaults returns clean defaults for specific section", () => {
  const finDefaults = sectionDefaults("financial");
  assert.equal(finDefaults.reportingCurrency, "KES");
  finDefaults.reportingCurrency = "ZAR";
  assert.equal(DEFAULT_SETTINGS.financial.reportingCurrency, "KES");
});

test("invoiceSettingsFromUserSettings maps settings cleanly", () => {
  const settings = {
    invoices: {
      issuer: { name: "Acme Corp", email: "billing@acme.com" },
      numbering: { prefix: "ACME" },
      defaultDueDays: 30,
      defaultTaxRate: "16",
    },
  };
  const mapped = invoiceSettingsFromUserSettings(settings);
  assert.equal(mapped.issuer.name, "Acme Corp");
  assert.equal(mapped.numbering.prefix, "ACME");
  assert.equal(mapped.defaultDueDays, 30);
  assert.equal(mapped.defaultTaxRate, "16");
});

test("formatSettingsDate formats according to configured format pattern", () => {
  const date = new Date("2026-05-15T12:00:00Z");
  assert.equal(formatSettingsDate(date, "dd/MM/yyyy"), "15/05/2026");
  assert.equal(formatSettingsDate(date, "MM/dd/yyyy"), "05/15/2026");
  assert.equal(formatSettingsDate(date, "yyyy-MM-dd"), "2026-05-15");
  assert.equal(formatSettingsDate(null), "—");
});

test("formatSettingsNumber respects locale and rounding precision", () => {
  assert.equal(formatSettingsNumber(12345.6789, "en-US", 2), "12,345.68");
  assert.equal(formatSettingsNumber(12345.6, "en-US", 2), "12,345.60");
  assert.equal(formatSettingsNumber(null), "—");
});

test("updateSettingsSchema accepts valid patch payload", () => {
  const result = updateSettingsSchema.safeParse({
    settings: {
      financial: {
        reportingCurrency: "USD",
        valuationFreshnessDays: 60,
      },
      map: {
        physicsEnabled: false,
        zoomLevel: 1.2,
      },
      ai: {
        confidenceThreshold: 0.85,
      },
    },
  });
  assert.equal(result.success, true);
});

test("updateSettingsSchema rejects invalid field types or ranges", () => {
  const invalid = updateSettingsSchema.safeParse({
    settings: {
      financial: {
        valuationFreshnessDays: -10, // Must be positive
      },
    },
  });
  assert.equal(invalid.success, false);
});
