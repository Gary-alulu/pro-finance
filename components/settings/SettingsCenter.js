"use client";
// components/settings/SettingsCenter.js
// Client orchestrator for the Settings Centre: section navigation, a staged
// draft with dirty tracking, save/discard/reset, and live appearance preview.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Bell,
  Building2,
  CheckCircle2,
  Database,
  History,
  Network,
  Palette,
  RotateCcw,
  Save,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Undo2,
  UserRound,
} from "lucide-react";
import Button from "@/components/ui/Button";
import { useTheme } from "@/components/providers/ThemeProvider";
import {
  SETTINGS_SECTION_IDS,
  resetAllSettings,
  sectionDefaults,
} from "@/lib/settings/defaults";
import { Banner } from "./SettingsControls";
import {
  AISection,
  FinancialSection,
  InvoicesSection,
  MapSection,
  ProfileSection,
} from "./SettingsSectionsA";
import {
  ActivitySection,
  AppearanceSection,
  DataSection,
  NotificationsSection,
  SecuritySection,
} from "./SettingsSectionsB";

const SECTIONS = [
  {
    id: "profile",
    number: "01",
    label: "Profile & Personalization",
    short: "Profile",
    icon: UserRound,
    group: "Identity",
  },
  {
    id: "financial",
    number: "02",
    label: "Financial Preferences",
    short: "Financial",
    icon: SlidersHorizontal,
    group: "Money",
  },
  {
    id: "invoices",
    number: "03",
    label: "Invoices & Billing",
    short: "Invoices",
    icon: Building2,
    group: "Money",
  },
  {
    id: "ai",
    number: "04",
    label: "AI & Automation",
    short: "AI",
    icon: Sparkles,
    group: "Intelligence",
  },
  {
    id: "map",
    number: "05",
    label: "Financial Map",
    short: "Map",
    icon: Network,
    group: "Intelligence",
  },
  {
    id: "security",
    number: "06",
    label: "Security & Privacy",
    short: "Security",
    icon: ShieldCheck,
    group: "Access",
  },
  {
    id: "notifications",
    number: "07",
    label: "Notifications",
    short: "Notifications",
    icon: Bell,
    group: "Access",
  },
  {
    id: "data",
    number: "08",
    label: "Data & Integrations",
    short: "Data",
    icon: Database,
    group: "Workspace",
  },
  {
    id: "appearance",
    number: "09",
    label: "Appearance",
    short: "Appearance",
    icon: Palette,
    group: "Workspace",
  },
  {
    id: "activity",
    number: "10",
    label: "Activity & Audit",
    short: "Activity",
    icon: History,
    group: "Workspace",
  },
];

const GROUPS = ["Identity", "Money", "Intelligence", "Access", "Workspace"];

const RESETTABLE = new Set(SETTINGS_SECTION_IDS);
const READ_ONLY_SECTIONS = new Set(["data", "activity"]);

function setDeep(object, path, value) {
  const [head, ...rest] = path.split(".");
  if (rest.length === 0) return { ...object, [head]: value };
  return {
    ...object,
    [head]: setDeep(object[head] ?? {}, rest.join("."), value),
  };
}

function changedBetween(a, b, key) {
  return JSON.stringify(a?.[key]) !== JSON.stringify(b?.[key]);
}

function SectionContent({
  id,
  settings,
  baseline,
  setPath,
  user,
  meta,
  onProfileSaved,
  onRefreshSession,
}) {
  switch (id) {
    case "profile":
      return (
        <ProfileSection
          settings={settings}
          setPath={setPath}
          user={user}
          onProfileSaved={onProfileSaved}
          onRefreshSession={onRefreshSession}
        />
      );
    case "financial":
      return <FinancialSection settings={settings} setPath={setPath} />;
    case "invoices":
      return <InvoicesSection settings={settings} setPath={setPath} />;
    case "ai":
      return <AISection settings={settings} setPath={setPath} />;
    case "map":
      return <MapSection settings={settings} setPath={setPath} />;
    case "security":
      return <SecuritySection settings={settings} setPath={setPath} user={user} />;
    case "notifications":
      return <NotificationsSection settings={settings} setPath={setPath} />;
    case "data":
      return <DataSection meta={meta} />;
    case "appearance":
      return <AppearanceSection settings={settings} setPath={setPath} />;
    case "activity":
      return <ActivitySection />;
    default:
      return null;
  }
}

export default function SettingsCenter({
  initialSettings,
  initialUser,
  meta,
  initialSection,
}) {
  const router = useRouter();
  const { update } = useSession();
  const { applyAppearance } = useTheme();

  const [settings, setSettings] = useState(initialSettings);
  const [baseline, setBaseline] = useState(initialSettings);
  const [user, setUser] = useState(initialUser);
  const [active, setActive] = useState(
    SECTIONS.some((s) => s.id === initialSection) ? initialSection : "profile"
  );
  const [prevInitialSection, setPrevInitialSection] = useState(initialSection);
  if (initialSection !== prevInitialSection) {
    setPrevInitialSection(initialSection);
    if (initialSection && SECTIONS.some((s) => s.id === initialSection)) {
      setActive(initialSection);
    }
  }
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState(null);
  const [resetAllOpen, setResetAllOpen] = useState(false);
  const [resetSectionOpen, setResetSectionOpen] = useState(false);

  const contentRef = useRef(null);
  const baselineAppearanceRef = useRef(baseline.appearance);
  const applyAppearanceRef = useRef(applyAppearance);

  useEffect(() => {
    baselineAppearanceRef.current = baseline.appearance;
  }, [baseline.appearance]);

  useEffect(() => {
    applyAppearanceRef.current = applyAppearance;
  }, [applyAppearance]);

  const dirtySections = useMemo(
    () => SETTINGS_SECTION_IDS.filter((key) => changedBetween(settings, baseline, key)),
    [settings, baseline]
  );
  const dirty = dirtySections.length > 0;
  const activeMeta = SECTIONS.find((s) => s.id === active) || SECTIONS[0];

  // Live preview: stage appearance changes instantly; the server is only
  // updated when the draft is saved.
  useEffect(() => {
    applyAppearance(settings.appearance);
  }, [settings.appearance, applyAppearance]);

  // Leaving with unsaved appearance changes reverts to the saved look.
  useEffect(() => {
    return () => {
      if (baselineAppearanceRef.current) {
        applyAppearanceRef.current?.(baselineAppearanceRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!dirty) return undefined;
    const handler = (event) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  useEffect(() => {
    if (notice?.tone !== "success") return undefined;
    const timer = setTimeout(() => setNotice(null), 6000);
    return () => clearTimeout(timer);
  }, [notice]);

  useEffect(() => {
    function syncFromUrl() {
      const params = new URLSearchParams(window.location.search);
      const section = params.get("section");
      if (section && SECTIONS.some((s) => s.id === section)) setActive(section);
    }
    window.addEventListener("popstate", syncFromUrl);
    return () => window.removeEventListener("popstate", syncFromUrl);
  }, []);



  const navigate = useCallback(
    (id) => {
      setActive(id);
      if (typeof window !== "undefined") {
        const url = id === "profile" ? "/settings" : `/settings?section=${id}`;
        window.history.replaceState(null, "", url);
      }
      const node = contentRef.current;
      if (node) {
        const top = node.getBoundingClientRect().top + window.scrollY - 16;
        window.scrollTo({ top, behavior: "smooth" });
      }
    },
    []
  );

  const setPath = useCallback((path, value) => {
    setSettings((current) => setDeep(current, path, value));
    setNotice(null);
  }, []);

  async function save() {
    if (!dirty || saving) return;
    setSaving(true);
    setNotice(null);
    try {
      const res = await fetch("/api/user/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings }),
      });
      const json = await res.json();
      if (!res.ok) {
        setNotice({ tone: "error", text: json.error || "Could not save your settings." });
        return;
      }

      const nextSettings = json.settings || settings;
      const saved = Array.isArray(json.changedSections) ? json.changedSections : [];
      setSettings(nextSettings);
      setBaseline(nextSettings);
      setUser((current) => ({
        ...current,
        ...(json.user || {}),
      }));
      setNotice({
        tone: "success",
        text: saved.length
          ? `Saved ${saved.length} section${saved.length === 1 ? "" : "s"}: ${saved.join(", ")}.`
          : "Your settings are up to date.",
      });

      // Refresh the JWT claims (preferred/reporting currency) without a
      // re-login, then let server components pick up the new values.
      try {
        await update();
      } catch {
        // A stale token only affects currency display until the next refresh.
      }
      router.refresh();
    } catch {
      setNotice({ tone: "error", text: "Network error. Your changes are still here — try again." });
    } finally {
      setSaving(false);
    }
  }

  function discard() {
    setSettings(baseline);
    setNotice({ tone: "info", text: "Unsaved changes discarded." });
  }

  function resetSection() {
    if (!RESETTABLE.has(active)) return;
    setSettings((current) => ({
      ...current,
      [active]: sectionDefaults(active),
    }));
    setResetSectionOpen(false);
    setNotice({
      tone: "info",
      text: `${activeMeta.label} reset to defaults. Save to apply, or discard to keep the current values.`,
    });
  }

  function resetEverything() {
    setSettings(resetAllSettings());
    setResetAllOpen(false);
    setActive("profile");
    if (typeof window !== "undefined") {
      window.history.replaceState(null, "", "/settings");
    }
    setNotice({
      tone: "info",
      text: "All settings reset to defaults in this draft. Save to apply — your records are untouched.",
    });
  }

  const sectionIsReadOnly = READ_ONLY_SECTIONS.has(active);

  return (
    <div className="p-4 sm:p-6 md:p-8 space-y-6 max-w-screen-2xl mx-auto">
      <div className="flex flex-col gap-6 pb-24 lg:flex-row lg:items-start">
        {/* ── Section navigation ─────────────────────────────────────────── */}
        <aside className="lg:sticky lg:top-6 lg:w-64 lg:flex-shrink-0">
          <nav
            aria-label="Settings sections"
            className="rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-[var(--color-surface)] p-3 shadow-xs"
          >
            <div className="flex gap-1.5 overflow-x-auto pb-1.5 lg:hidden">
              {SECTIONS.map((section) => {
                const Icon = section.icon;
                const isActive = active === section.id;
                return (
                  <button
                    key={section.id}
                    type="button"
                    onClick={() => navigate(section.id)}
                    aria-current={isActive ? "page" : undefined}
                    className={`flex flex-shrink-0 items-center gap-2 rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors ${
                      isActive
                        ? "border-[var(--color-emerald-500)] bg-[var(--color-emerald-500)]/12 text-[var(--color-emerald-700)] dark:text-[var(--color-emerald-400)]"
                        : "border-transparent text-[var(--color-text-tertiary)] hover:bg-[var(--color-surface-2)]"
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                    {section.short}
                  </button>
                );
              })}
            </div>

            <div className="hidden lg:block">
              {GROUPS.map((group) => {
                const items = SECTIONS.filter((section) => section.group === group);
                if (!items.length) return null;
                return (
                  <div key={group} className="py-1.5">
                    <p className="px-3.5 pb-1.5 pt-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--color-text-tertiary)]">
                      {group}
                    </p>
                    <ul className="space-y-0.5">
                      {items.map((section) => {
                        const Icon = section.icon;
                        const isActive = active === section.id;
                        const isDirty = dirtySections.includes(section.id);
                        return (
                          <li key={section.id}>
                            <button
                              type="button"
                              onClick={() => navigate(section.id)}
                              aria-current={isActive ? "page" : undefined}
                              className={`group flex w-full items-center gap-3 rounded-[var(--radius-md)] px-3.5 py-2.5 text-left transition-colors cursor-pointer ${
                                isActive
                                  ? "bg-[var(--color-emerald-500)]/12 dark:bg-[var(--color-emerald-500)]/22 text-[var(--color-emerald-700)] dark:text-[var(--color-emerald-400)] font-semibold"
                                  : "text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-text-primary)]"
                              }`}
                            >
                              <Icon className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
                              <span className="flex-1 truncate text-xs font-medium">
                                {section.short}
                              </span>
                              {isDirty ? (
                                <span
                                  className="h-1.5 w-1.5 rounded-full bg-[var(--color-gold-500)]"
                                  title="Unsaved changes"
                                />
                              ) : (
                                <span className="text-[10px] tabular-nums text-[var(--color-text-tertiary)]">
                                  {section.number}
                                </span>
                              )}
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                );
              })}
            </div>
          </nav>

          <div className="mt-3 hidden rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface-2)]/50 p-3.5 lg:block">
            <p className="text-[11px] leading-relaxed text-[var(--color-text-tertiary)]">
              Settings are stored with your account and applied across every module.
            </p>
            <button
              type="button"
              onClick={() => setResetAllOpen(true)}
              className="mt-2 inline-flex items-center gap-1.5 text-[11px] font-semibold text-[var(--color-text-secondary)] underline-offset-2 hover:text-[var(--color-text-primary)] hover:underline cursor-pointer"
            >
              <RotateCcw className="h-3 w-3" /> Reset all settings
            </button>
          </div>
        </aside>

        {/* ── Content ────────────────────────────────────────────────────── */}
        <div ref={contentRef} className="min-w-0 flex-1 scroll-mt-6 space-y-6">
          <header className="rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-[var(--color-surface)] p-6 sm:p-7 shadow-xs">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--color-emerald-700)] dark:text-[var(--color-emerald-400)]">
                  Settings Centre
                </p>
                <h1 className="mt-1.5 text-2xl font-bold tracking-tight text-[var(--color-text-primary)] sm:text-3xl">
                  {activeMeta.label}
                </h1>
                <p className="mt-1.5 max-w-xl text-xs leading-relaxed text-[var(--color-text-secondary)]">
                {dirty
                  ? `${dirtySections.length} section${dirtySections.length === 1 ? "" : "s"} changed. Review, then save to apply across the workspace.`
                  : "Every module reads from these preferences. Nothing is changed until you save."}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider ${
                  dirty
                    ? "border-[var(--color-gold-200)] bg-[var(--color-gold-50)] text-[var(--color-gold-800)]"
                    : "border-[var(--color-emerald-200)] bg-[var(--color-emerald-50)] text-[var(--color-emerald-700)]"
                }`}
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    dirty ? "bg-[var(--color-gold-500)]" : "bg-[var(--color-emerald-500)]"
                  }`}
                />
                {dirty ? "Unsaved changes" : "Saved"}
              </span>

              {!sectionIsReadOnly && (
                <Button
                  variant="ghost"
                  size="sm"
                  icon={RotateCcw}
                  onClick={() => setResetSectionOpen(true)}
                >
                  Reset section
                </Button>
              )}
              <Button
                size="sm"
                icon={Save}
                onClick={save}
                loading={saving}
                disabled={!dirty}
              >
                Save changes
              </Button>
            </div>
          </div>

          <AnimatePresence initial={false}>
            {notice && (
              <div className="mt-3">
                <Banner tone={notice.tone} onDismiss={() => setNotice(null)}>
                  {notice.text}
                </Banner>
              </div>
            )}
          </AnimatePresence>
        </header>

        <motion.div
          key={active}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
        >
          <SectionContent
            id={active}
            settings={settings}
            baseline={baseline}
            setPath={setPath}
            user={user}
            meta={meta}
            onProfileSaved={(nextUser) =>
              setUser((current) => ({ ...current, ...(nextUser || {}) }))
            }
            onRefreshSession={async () => {
              try {
                await update();
              } catch {
                // best effort
              }
              router.refresh();
            }}
          />
        </motion.div>

        <footer className="flex flex-col gap-2 rounded-[var(--radius-lg)] border border-dashed border-[var(--color-border-strong)] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[10px] leading-relaxed text-[var(--color-text-tertiary)]">
            Financial records are never rewritten by a preference change. Reporting
            currency converts display values only through explicit rates.
          </p>
          <button
            type="button"
            onClick={() => setResetAllOpen(true)}
            className="inline-flex items-center gap-1 self-start text-[10px] font-semibold text-[var(--color-text-tertiary)] underline-offset-2 hover:text-[var(--color-text-primary)] hover:underline sm:self-auto"
          >
            <RotateCcw className="h-3 w-3" /> Reset all
          </button>
        </footer>
      </div>
    </div>

      {/* ── Sticky save bar ────────────────────────────────────────────── */}
      <AnimatePresence>
        {dirty && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            className="fixed inset-x-0 bottom-0 z-30 border-t border-[var(--color-border)] bg-[var(--color-surface)]/95 px-4 py-3 shadow-[0_-8px_24px_rgba(0,0,0,0.06)] backdrop-blur-md sm:left-auto sm:right-4 sm:bottom-4 sm:rounded-[var(--radius-xl)] sm:border lg:right-6"
          >
            <div className="flex items-center justify-between gap-3 sm:gap-5">
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--color-gold-100)] text-[var(--color-gold-800)]">
                  <CheckCircle2 className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-xs font-semibold text-[var(--color-text-primary)]">
                    {dirtySections.length} unsaved section
                    {dirtySections.length === 1 ? "" : "s"}
                  </p>
                  <p className="text-[10px] text-[var(--color-text-tertiary)]">
                    {dirtySections.join(" · ")}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  icon={Undo2}
                  onClick={discard}
                  disabled={saving}
                >
                  Discard
                </Button>
                <Button size="sm" icon={Save} onClick={save} loading={saving}>
                  Save
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Reset confirmations ────────────────────────────────────────── */}
      <AnimatePresence>
        {(resetSectionOpen || resetAllOpen) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 flex items-center justify-center p-4"
          >
            <div
              className="absolute inset-0 bg-[rgba(26,26,24,0.45)] backdrop-blur-xs"
              onClick={() => {
                setResetSectionOpen(false);
                setResetAllOpen(false);
              }}
            />
            <div className="relative w-full max-w-sm rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-xl">
              <p className="text-sm font-semibold text-[var(--color-text-primary)]">
                {resetAllOpen ? "Reset all settings?" : `Reset ${activeMeta.label}?`}
              </p>
              <p className="mt-1 text-xs leading-relaxed text-[var(--color-text-secondary)]">
                This only changes the draft. Your records stay untouched and you can
                discard before saving.
              </p>
              <div className="mt-4 flex justify-end gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setResetSectionOpen(false);
                    setResetAllOpen(false);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={resetAllOpen ? resetEverything : resetSection}
                >
                  Reset
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
