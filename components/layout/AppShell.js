"use client";
// components/layout/AppShell.js
// Root application shell: sidebar + topbar + content area.
// Also mounts the theme/toast providers, the command palette and the skip link.

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import dynamic from "next/dynamic";
import { motion, AnimatePresence } from "framer-motion";
import Sidebar from "./Sidebar";
import TopBar from "./TopBar";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { ToastProvider } from "@/components/providers/ToastProvider";

// Command palette (framer-motion + 300 lines) is only needed once the user
// opens it — keep it out of the shell's initial client bundle.
const CommandPalette = dynamic(() => import("@/components/ui/CommandPalette"), {
  ssr: false,
});

export default function AppShell({ user, children }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  // Mount the palette bundle only after it is first requested.
  const [paletteMounted, setPaletteMounted] = useState(false);
  const pathname = usePathname();

  // Close mobile sidebar when the route changes (adjust-during-render pattern)
  const [lastPathname, setLastPathname] = useState(pathname);
  if (lastPathname !== pathname) {
    setLastPathname(pathname);
    setMobileSidebarOpen(false);
  }

  // Hydrate sidebar collapse preference from localStorage after mount
  useEffect(() => {
    const timer = setTimeout(() => {
      const stored = localStorage.getItem("pf-sidebar-collapsed");
      if (stored !== null) setSidebarCollapsed(JSON.parse(stored));
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  // Global ⌘K / Ctrl+K shortcut
  useEffect(() => {
    function onKeyDown(e) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        openPalette();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  function openPalette() {
    setPaletteMounted(true);
    setPaletteOpen((v) => !v);
  }

  function toggleSidebar() {
    setSidebarCollapsed((v) => {
      localStorage.setItem("pf-sidebar-collapsed", JSON.stringify(!v));
      return !v;
    });
  }

  return (
    <ThemeProvider>
      <ToastProvider>
        <div className="flex h-screen overflow-hidden" style={{ background: "var(--color-bg)" }}>
          {/* Skip link — first focusable element for keyboard users */}
          <a
            href="#main-content"
            className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:px-3 focus:py-2 focus:text-sm focus:font-medium"
            style={{
              background: "var(--color-emerald-600)",
              color: "#faf9f6",
              borderRadius: "var(--radius-md)",
              zIndex: "var(--z-toast)",
            }}
          >
            Skip to content
          </a>

          {/* ── Desktop Sidebar ──────────────────────────────────────────────── */}
          <div className="hidden md:block flex-shrink-0 relative" style={{ zIndex: "var(--z-sidebar)" }}>
            <Sidebar
              collapsed={sidebarCollapsed}
              onToggle={toggleSidebar}
              user={user}
            />
          </div>

          {/* ── Mobile Sidebar overlay ────────────────────────────────────────── */}
          <AnimatePresence>
            {mobileSidebarOpen && (
              <>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="fixed inset-0 md:hidden"
                  style={{ background: "var(--color-bg-overlay)", zIndex: "var(--z-overlay)" }}
                  onClick={() => setMobileSidebarOpen(false)}
                />
                <motion.div
                  initial={{ x: -280 }}
                  animate={{ x: 0 }}
                  exit={{ x: -280 }}
                  transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                  className="fixed top-0 left-0 h-full md:hidden"
                  style={{ zIndex: "var(--z-modal)" }}
                >
                  <Sidebar
                    collapsed={false}
                    onToggle={() => setMobileSidebarOpen(false)}
                    user={user}
                    isMobile
                  />
                </motion.div>
              </>
            )}
          </AnimatePresence>

          {/* ── Main area ────────────────────────────────────────────────────── */}
          <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
            <TopBar
              user={user}
              onMobileMenuToggle={() => setMobileSidebarOpen((v) => !v)}
              onSearchOpen={openPalette}
            />

            {/* Page content */}
            <main
              className="flex-1 overflow-y-auto"
              id="main-content"
              tabIndex={-1}
              style={{ paddingTop: 0 }}
            >
              <motion.div
                key={pathname}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                className="h-full"
              >
                {children}
              </motion.div>
            </main>
          </div>

          {/* Global command palette — mounted lazily on first open */}
          {paletteMounted && (
            <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
          )}
        </div>
      </ToastProvider>
    </ThemeProvider>
  );
}
