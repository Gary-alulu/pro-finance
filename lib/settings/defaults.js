// lib/settings/defaults.js
// Shared, side-effect-free settings vocabulary and merge helpers.
// Safe to import from both server and client code.

export const SETTINGS_VERSION = 1;

export const DEFAULT_SETTINGS = {
  profile: {
    preferredName: "",
    language: "en",
    timeZone: "Africa/Nairobi",
    dateFormat: "dd/MM/yyyy",
    numberFormat: "en-KE",
    defaultCurrency: "KES",
  },
  financial: {
    reportingCurrency: "KES",
    financialYearStartMonth: 1,
    valuationFreshnessDays: 90,
    costBasisMethod: "average_cost",
    snapshotFrequency: "daily",
    roundingPrecision: 2,
    hideBalancesByDefault: false,
  },
  invoices: {
    issuer: {
      name: "",
      email: "",
      phone: "",
      address: "",
      taxId: "",
      logo: "",
    },
    numbering: {
      prefix: "INV",
      separator: "-",
      includeYear: true,
      nextNumber: 1,
      padding: 4,
    },
    defaultCurrency: "KES",
    defaultDueDays: 14,
    defaultPaymentInstructions: "",
    defaultNotes: "",
    defaultTerms: "Payment is due by the date shown on this invoice.",
    defaultTaxRate: "16",
    defaultTaxExempt: false,
    template: "classic",
    pdf: {
      paperSize: "A4",
      showLogo: true,
      showTaxId: true,
      footerNote: "",
    },
  },
  ai: {
    extractionEnabled: true,
    requireReview: true,
    confidenceThreshold: 0.8,
    autoClassifyDocuments: true,
    duplicateDetection: true,
    relationshipSuggestions: true,
    assistantEnabled: true,
  },
  map: {
    layout: "radial",
    density: "comfortable",
    visibleNodeTypes: ["asset", "liability", "investment", "document"],
    showAiSuggestions: true,
    showNodeLabels: true,
    showValues: true,
  },
  security: {
    hideSensitiveValues: false,
    maskAccountNumbers: true,
    dataRetentionDays: 0,
    exportIncludesMetadata: true,
  },
  notifications: {
    enabled: true,
    overdueInvoices: true,
    upcomingLiabilities: true,
    staleValuations: true,
    unreviewedDocuments: true,
    reconciliationWarnings: true,
    frequency: "daily",
  },
  appearance: {
    theme: "system",
    accent: "emerald",
    sidebarCollapsed: false,
    reducedMotion: false,
    density: "comfortable",
    dashboardLayout: "balanced",
  },
};

export const SETTINGS_SECTION_IDS = [
  "profile",
  "financial",
  "invoices",
  "ai",
  "map",
  "security",
  "notifications",
  "data",
  "appearance",
  "activity",
];

// ── Select vocabularies ─────────────────────────────────────────────────────

export const LANGUAGE_OPTIONS = [
  { value: "en", label: "English" },
  { value: "sw", label: "Kiswahili" },
  { value: "fr", label: "Français" },
  { value: "pt", label: "Português" },
  { value: "es", label: "Español" },
  { value: "de", label: "Deutsch" },
  { value: "ar", label: "العربية" },
];

export const TIME_ZONE_OPTIONS = [
  "Africa/Nairobi",
  "Africa/Kampala",
  "Africa/Dar_es_Salaam",
  "Africa/Kigali",
  "Africa/Addis_Ababa",
  "Africa/Johannesburg",
  "Africa/Lagos",
  "Africa/Accra",
  "Africa/Cairo",
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "America/New_York",
  "America/Chicago",
  "America/Los_Angeles",
  "Asia/Dubai",
  "Asia/Kolkata",
  "Asia/Singapore",
  "Asia/Tokyo",
  "Australia/Sydney",
  "UTC",
];

export const DATE_FORMAT_OPTIONS = [
  { value: "dd/MM/yyyy", label: "31/12/2026 (day first)" },
  { value: "MM/dd/yyyy", label: "12/31/2026 (month first)" },
  { value: "yyyy-MM-dd", label: "2026-12-31 (ISO)" },
  { value: "d MMM yyyy", label: "31 Dec 2026" },
  { value: "MMM d, yyyy", label: "Dec 31, 2026" },
];

export const NUMBER_FORMAT_OPTIONS = [
  { value: "en-KE", label: "1,234,567.89 (en-KE)" },
  { value: "en-US", label: "1,234,567.89 (en-US)" },
  { value: "en-GB", label: "1,234,567.89 (en-GB)" },
  { value: "de-DE", label: "1.234.567,89 (de-DE)" },
  { value: "fr-FR", label: "1 234 567,89 (fr-FR)" },
  { value: "af-ZA", label: "1 234 567,89 (af-ZA)" },
];

export const FINANCIAL_YEAR_MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
].map((label, index) => ({ value: index + 1, label }));

export const COST_BASIS_OPTIONS = [
  { value: "average_cost", label: "Average cost" },
  { value: "fifo", label: "First in, first out (FIFO)" },
  { value: "lifo", label: "Last in, first out (LIFO)" },
  { value: "specific_lot", label: "Specific lot" },
];

export const SNAPSHOT_FREQUENCY_OPTIONS = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "manual", label: "Manual only" },
];

export const ROUNDING_OPTIONS = [
  { value: 0, label: "Whole units (0 decimals)" },
  { value: 2, label: "Cents (2 decimals)" },
  { value: 4, label: "High precision (4 decimals)" },
];

export const REMINDER_FREQUENCY_OPTIONS = [
  { value: "realtime", label: "As they happen" },
  { value: "daily", label: "Daily digest" },
  { value: "weekly", label: "Weekly digest" },
  { value: "monthly", label: "Monthly digest" },
  { value: "off", label: "Digest off" },
];

export const MAP_LAYOUT_OPTIONS = [
  { value: "radial", label: "Radial (core in the centre)" },
  { value: "columns", label: "Columns (assets vs liabilities)" },
];

export const DENSITY_OPTIONS = [
  { value: "compact", label: "Compact" },
  { value: "comfortable", label: "Comfortable" },
  { value: "spacious", label: "Spacious" },
];

export const DASHBOARD_LAYOUT_OPTIONS = [
  { value: "balanced", label: "Balanced" },
  { value: "wealth_first", label: "Wealth first" },
  { value: "accountability_first", label: "Accountability first" },
];

export const NODE_TYPE_OPTIONS = [
  { value: "asset", label: "Assets" },
  { value: "liability", label: "Liabilities" },
  { value: "investment", label: "Investments" },
  { value: "document", label: "Documents" },
];

export const ACCENT_OPTIONS = [
  {
    value: "emerald",
    label: "Emerald",
    palette: {
      50: "#ecfdf5",
      100: "#d1fae5",
      200: "#a7f3d0",
      400: "#34d399",
      500: "#10b981",
      600: "#059669",
      700: "#047857",
      900: "#064e3b",
    },
  },
  {
    value: "gold",
    label: "Champagne",
    palette: {
      50: "#fdf8ee",
      100: "#faefd4",
      200: "#f5e0ab",
      400: "#e8b84b",
      500: "#c49a24",
      600: "#a17d18",
      700: "#8a6b14",
      900: "#4d3b08",
    },
  },
  {
    value: "ocean",
    label: "Ocean",
    palette: {
      50: "#eff8ff",
      100: "#dbeefe",
      200: "#bfe1fe",
      400: "#38bdf8",
      500: "#0ea5e9",
      600: "#0284c7",
      700: "#0369a1",
      900: "#0c4a6e",
    },
  },
  {
    value: "violet",
    label: "Violet",
    palette: {
      50: "#f5f3ff",
      100: "#ede9fe",
      200: "#ddd6fe",
      400: "#a78bfa",
      500: "#8b5cf6",
      600: "#7c3aed",
      700: "#6d28d9",
      900: "#4c1d95",
    },
  },
  {
    value: "rose",
    label: "Rose",
    palette: {
      50: "#fff1f2",
      100: "#ffe4e6",
      200: "#fecdd3",
      400: "#fb7185",
      500: "#f43f5e",
      600: "#e11d48",
      700: "#be123c",
      900: "#881337",
    },
  },
];

export const SUPPORTED_LANGUAGES = LANGUAGE_OPTIONS.map((o) => o.value);
export const SUPPORTED_DATE_FORMATS = DATE_FORMAT_OPTIONS.map((o) => o.value);
export const SUPPORTED_NUMBER_FORMATS = NUMBER_FORMAT_OPTIONS.map((o) => o.value);
export const SUPPORTED_COST_BASIS = COST_BASIS_OPTIONS.map((o) => o.value);
export const SUPPORTED_SNAPSHOT_FREQUENCIES = SNAPSHOT_FREQUENCY_OPTIONS.map((o) => o.value);
export const SUPPORTED_REMINDER_FREQUENCIES = REMINDER_FREQUENCY_OPTIONS.map((o) => o.value);
export const SUPPORTED_MAP_LAYOUTS = MAP_LAYOUT_OPTIONS.map((o) => o.value);
export const SUPPORTED_DENSITIES = DENSITY_OPTIONS.map((o) => o.value);
export const SUPPORTED_DASHBOARD_LAYOUTS = DASHBOARD_LAYOUT_OPTIONS.map((o) => o.value);
export const SUPPORTED_NODE_TYPES = NODE_TYPE_OPTIONS.map((o) => o.value);
export const SUPPORTED_ACCENTS = ACCENT_OPTIONS.map((o) => o.value);
export const SUPPORTED_THEMES = ["light", "dark", "system"];

const BLOCKED_KEYS = new Set(["__proto__", "constructor", "prototype"]);

function isPlainObject(value) {
  return (
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    Object.getPrototypeOf(value) === Object.prototype
  );
}

function clone(value) {
  if (Array.isArray(value)) return value.map(clone);
  if (isPlainObject(value)) {
    const out = {};
    for (const [k, v] of Object.entries(value)) out[k] = clone(v);
    return out;
  }
  return value;
}

export function deepMergeSettings(base, patch) {
  const out = clone(base);
  if (!isPlainObject(patch)) return out;
  for (const [key, value] of Object.entries(patch)) {
    if (BLOCKED_KEYS.has(key) || value === undefined) continue;
    if (isPlainObject(value) && isPlainObject(out[key])) {
      out[key] = deepMergeSettings(out[key], value);
    } else {
      out[key] = clone(value);
    }
  }
  return out;
}

/**
 * Merge stored settings over the defaults, folding in legacy flat fields.
 * `preferredCurrency` is the legacy top-level reporting currency.
 */
export function mergeSettings(raw, { preferredCurrency } = {}) {
  const merged = clone(DEFAULT_SETTINGS);
  const source = isPlainObject(raw) ? raw : {};

  // Legacy flat keys written by the original settings screen.
  if (typeof source.hideSensitiveValues === "boolean") {
    merged.security.hideSensitiveValues = source.hideSensitiveValues;
  }
  if (typeof source.theme === "string" && SUPPORTED_THEMES.includes(source.theme)) {
    merged.appearance.theme = source.theme;
  }
  if (typeof source.notificationsEnabled === "boolean") {
    merged.notifications.enabled = source.notificationsEnabled;
  }

  const result = deepMergeSettings(merged, source);

  if (preferredCurrency && !source?.financial?.reportingCurrency) {
    result.financial.reportingCurrency = preferredCurrency;
  }
  if (preferredCurrency && !source?.profile?.defaultCurrency) {
    result.profile.defaultCurrency = preferredCurrency;
  }

  return result;
}

export function sectionDefaults(section) {
  if (section === "data" || section === "activity") return {};
  return clone(DEFAULT_SETTINGS[section] || {});
}

export function resetAllSettings() {
  return clone(DEFAULT_SETTINGS);
}

/** Map server-side user settings onto the browser invoice settings shape. */
export function invoiceSettingsFromUserSettings(settings) {
  const invoices = settings?.invoices || {};
  const base = DEFAULT_SETTINGS.invoices;
  return {
    issuer: { ...base.issuer, ...(invoices.issuer || {}) },
    numbering: { ...base.numbering, ...(invoices.numbering || {}) },
    defaultCurrency: invoices.defaultCurrency || base.defaultCurrency,
    defaultDueDays: Number(invoices.defaultDueDays ?? base.defaultDueDays),
    defaultPaymentInstructions:
      invoices.defaultPaymentInstructions ?? base.defaultPaymentInstructions,
    defaultNotes: invoices.defaultNotes ?? base.defaultNotes,
    defaultTerms: invoices.defaultTerms ?? base.defaultTerms,
    defaultTaxRate: invoices.defaultTaxRate ?? base.defaultTaxRate,
    defaultTaxExempt: Boolean(invoices.defaultTaxExempt),
    template: invoices.template || base.template,
  };
}

/** Format a date using the account's preferred display pattern. */
export function formatSettingsDate(value, dateFormat = "dd/MM/yyyy") {
  if (!value) return "—";
  const date =
    value instanceof Date
      ? value
      : /^\d{4}-\d{2}-\d{2}$/.test(String(value))
        ? new Date(`${value}T00:00:00`)
        : new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const yyyy = String(date.getFullYear());
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  switch (dateFormat) {
    case "MM/dd/yyyy":
      return `${mm}/${dd}/${yyyy}`;
    case "yyyy-MM-dd":
      return `${yyyy}-${mm}-${dd}`;
    case "d MMM yyyy":
      return `${date.getDate()} ${months[date.getMonth()]} ${yyyy}`;
    case "MMM d, yyyy":
      return `${months[date.getMonth()]} ${date.getDate()}, ${yyyy}`;
    case "dd/MM/yyyy":
    default:
      return `${dd}/${mm}/${yyyy}`;
  }
}

/** Format a number using the account's preferred locale pattern. */
export function formatSettingsNumber(value, numberFormat = "en-KE", decimals = 2) {
  if (value === null || value === undefined || value === "") return "—";
  const num = Number(value);
  if (!Number.isFinite(num)) return "—";
  try {
    return new Intl.NumberFormat(numberFormat, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(num);
  } catch {
    return String(value);
  }
}
