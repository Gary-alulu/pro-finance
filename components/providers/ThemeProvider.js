"use client";
// components/providers/ThemeProvider.js
// Applies the account's appearance preferences (theme, accent, density,
// reduced motion) to <html> so every module inherits them instantly.

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
  useSyncExternalStore,
} from "react";
import {
  ACCENT_OPTIONS,
  DEFAULT_SETTINGS,
  SUPPORTED_ACCENTS,
  SUPPORTED_DENSITIES,
  SUPPORTED_THEMES,
} from "@/lib/settings/defaults";

const ThemeContext = createContext({
  theme: "dark",
  appearance: DEFAULT_SETTINGS.appearance,
  setTheme: () => {},
  toggle: () => {},
  applyAppearance: () => {},
  mounted: false,
});

const STORAGE_KEY = "pf-theme";
const emptySubscribe = () => () => {};

// Dark mode is the only theme available on the platform for now.
const FORCE_DARK_THEME = true;

function resolveTheme(theme) {
  if (FORCE_DARK_THEME) return "dark";
  if (theme === "dark") return "dark";
  if (theme === "light") return "light";
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function applyThemeClass(resolved) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.classList.toggle("dark", resolved === "dark");
  root.dataset.theme = resolved;
}

function applyAccent(accentValue) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  const accent = ACCENT_OPTIONS.find((option) => option.value === accentValue);
  if (!accent) return;
  for (const [shade, color] of Object.entries(accent.palette)) {
    root.style.setProperty(`--color-emerald-${shade}`, color);
  }
}

function applyAppearanceToDocument(appearance, resolved) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  applyThemeClass(resolved);
  applyAccent(appearance.accent);
  root.dataset.density = SUPPORTED_DENSITIES.includes(appearance.density)
    ? appearance.density
    : "comfortable";
  root.dataset.motion = appearance.reducedMotion ? "reduce" : "full";
  root.dataset.dashboardLayout = appearance.dashboardLayout || "balanced";
}

export function ThemeProvider({ children, initialAppearance }) {
  const safeInitial = useMemo(() => {
    const source = initialAppearance || DEFAULT_SETTINGS.appearance;
    return {
      ...DEFAULT_SETTINGS.appearance,
      ...source,
      theme: SUPPORTED_THEMES.includes(source.theme) ? source.theme : "dark",
      accent: SUPPORTED_ACCENTS.includes(source.accent) ? source.accent : "emerald",
    };
  }, [initialAppearance]);

  const mounted = useSyncExternalStore(emptySubscribe, () => true, () => false);
  const [appearance, setAppearance] = useState(safeInitial);
  // Deterministic initial theme on server and client initial render to guarantee hydration match
  const [theme, setThemeState] = useState(() => resolveTheme(safeInitial.theme));

  // Apply the server-persisted appearance once after mount.
  useEffect(() => {
    const timer = setTimeout(() => {
      const stored = localStorage.getItem(STORAGE_KEY);
      const preferredTheme = FORCE_DARK_THEME
        ? "dark"
        : stored && SUPPORTED_THEMES.includes(stored)
          ? stored
          : safeInitial.theme;
      const resolved = resolveTheme(preferredTheme);
      setThemeState(resolved);
      applyAppearanceToDocument({ ...safeInitial, theme: preferredTheme }, resolved);
    }, 0);
    return () => clearTimeout(timer);
  }, [safeInitial]);

  // Follow OS theme changes while "system" is selected.
  useEffect(() => {
    if (FORCE_DARK_THEME || appearance.theme !== "system" || typeof window === "undefined") return;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      const resolved = media.matches ? "dark" : "light";
      setThemeState(resolved);
      applyThemeClass(resolved);
    };
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, [appearance.theme]);

  const setTheme = useCallback(
    (nextTheme) => {
      const safeTheme = FORCE_DARK_THEME
        ? "dark"
        : SUPPORTED_THEMES.includes(nextTheme)
          ? nextTheme
          : "dark";
      const resolved = resolveTheme(safeTheme);
      setThemeState(resolved);
      setAppearance((prev) => {
        const next = { ...prev, theme: safeTheme };
        localStorage.setItem(STORAGE_KEY, safeTheme);
        applyAppearanceToDocument(next, resolved);
        return next;
      });
    },
    []
  );

  const toggle = useCallback(() => {
    if (FORCE_DARK_THEME) return;
    setAppearance((prev) => {
      const nextTheme = resolveTheme(prev.theme) === "dark" ? "light" : "dark";
      const next = { ...prev, theme: nextTheme };
      const resolved = resolveTheme(nextTheme);
      setThemeState(resolved);
      localStorage.setItem(STORAGE_KEY, nextTheme);
      applyAppearanceToDocument(next, resolved);
      return next;
    });
  }, []);

  const applyAppearance = useCallback((nextAppearance) => {
    if (!nextAppearance) return;
    const next = {
      ...DEFAULT_SETTINGS.appearance,
      ...nextAppearance,
      theme: FORCE_DARK_THEME
        ? "dark"
        : SUPPORTED_THEMES.includes(nextAppearance.theme)
          ? nextAppearance.theme
          : "dark",
    };
    const resolved = resolveTheme(next.theme);
    setAppearance(next);
    setThemeState(resolved);
    localStorage.setItem(STORAGE_KEY, next.theme);
    applyAppearanceToDocument(next, resolved);
  }, []);

  return (
    <ThemeContext.Provider
      value={{ theme, appearance, setTheme, toggle, applyAppearance, mounted }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used inside ThemeProvider");
  return ctx;
}
