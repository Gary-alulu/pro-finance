"use client";
// components/providers/SettingsProvider.js
// Client provider & hook for unified application-wide settings.
// Exposes merged preferences, reactive state updates, and formatted helpers
// across all dashboard, invoice, document, and map views.

import { createContext, useContext, useMemo, useState, useCallback, useEffect } from "react";
import {
  DEFAULT_SETTINGS,
  mergeSettings,
  formatSettingsDate,
  formatSettingsNumber,
} from "@/lib/settings/defaults";

const SettingsContext = createContext({
  settings: DEFAULT_SETTINGS,
  currency: DEFAULT_SETTINGS.financial.reportingCurrency,
  updateSettingsState: () => {},
  refreshSettings: async () => {},
  formatDate: (val) => formatSettingsDate(val),
  formatNumber: (val, decimals) => formatSettingsNumber(val, "en-KE", decimals ?? 2),
});

export function SettingsProvider({ initialSettings, children }) {
  const [settings, setSettings] = useState(() =>
    mergeSettings(initialSettings || DEFAULT_SETTINGS)
  );

  // Sync state if initialSettings from server changes (adjust-during-render pattern)
  const [prevInitial, setPrevInitial] = useState(initialSettings);
  if (initialSettings !== prevInitial) {
    setPrevInitial(initialSettings);
    setSettings(mergeSettings(initialSettings || DEFAULT_SETTINGS));
  }

  const refreshSettings = useCallback(async () => {
    try {
      const res = await fetch("/api/user/settings");
      if (!res.ok) return;
      const data = await res.json();
      if (data?.settings) {
        setSettings(mergeSettings(data.settings));
      }
    } catch {
      // Quiet fail on network interruption
    }
  }, []);

  const updateSettingsState = useCallback((patch) => {
    setSettings((curr) => mergeSettings(curr, patch));
  }, []);

  const reportingCurrency = useMemo(
    () => settings?.financial?.reportingCurrency || settings?.profile?.defaultCurrency || "KES",
    [settings]
  );

  const dateFormat = useMemo(
    () => settings?.profile?.dateFormat || "dd/MM/yyyy",
    [settings]
  );

  const numberFormat = useMemo(
    () => settings?.profile?.numberFormat || "en-KE",
    [settings]
  );

  const precision = useMemo(
    () => settings?.financial?.roundingPrecision ?? 2,
    [settings]
  );

  const formatDate = useCallback(
    (value) => formatSettingsDate(value, dateFormat),
    [dateFormat]
  );

  const formatNumber = useCallback(
    (value, decimals) =>
      formatSettingsNumber(value, numberFormat, decimals ?? precision),
    [numberFormat, precision]
  );

  const value = useMemo(
    () => ({
      settings,
      currency: reportingCurrency,
      reportingCurrency,
      updateSettingsState,
      refreshSettings,
      formatDate,
      formatNumber,
      profile: settings.profile,
      financial: settings.financial,
      invoices: settings.invoices,
      ai: settings.ai,
      map: settings.map,
      security: settings.security,
      notifications: settings.notifications,
      appearance: settings.appearance,
    }),
    [
      settings,
      reportingCurrency,
      updateSettingsState,
      refreshSettings,
      formatDate,
      formatNumber,
    ]
  );

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) {
    throw new Error("useSettings must be used within a SettingsProvider");
  }
  return ctx;
}
