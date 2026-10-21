"use client";
// components/providers/ThemeProvider.js
// Light/dark theme provider. Persists to localStorage and syncs the `dark`
// class on <html> so the CSS custom properties in globals.css swap instantly.

import { createContext, useContext, useEffect, useState, useCallback } from "react";

const ThemeContext = createContext({ theme: "light", setTheme: () => {} });

const STORAGE_KEY = "pf-theme";

function applyTheme(theme) {
  const root = document.documentElement;
  if (theme === "dark") {
    root.classList.add("dark");
  } else {
    root.classList.remove("dark");
  }
}

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState("light");

  // Read persisted preference once after mount (avoids SSR mismatch).
  useEffect(() => {
    const timer = setTimeout(() => {
      const stored = localStorage.getItem(STORAGE_KEY);
      const initial =
        stored === "dark" || stored === "light"
          ? stored
          : window.matchMedia("(prefers-color-scheme: dark)").matches
            ? "dark"
            : "light";
      setThemeState(initial);
      applyTheme(initial);
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  const setTheme = useCallback((next) => {
    setThemeState(next);
    localStorage.setItem(STORAGE_KEY, next);
    applyTheme(next);
  }, []);

  const toggle = useCallback(() => {
    setThemeState((prev) => {
      const next = prev === "dark" ? "light" : "dark";
      localStorage.setItem(STORAGE_KEY, next);
      applyTheme(next);
      return next;
    });
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggle }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used inside ThemeProvider");
  return ctx;
}
