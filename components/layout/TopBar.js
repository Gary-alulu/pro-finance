"use client";
// components/layout/TopBar.js
// Top navigation bar: page title, global search, quick-create, theme toggle, profile.

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Menu,
  Search,
  Plus,
  Bell,
  ChevronDown,
  Settings,
  LogOut,
  Sun,
  Moon,
  Landmark,
  TrendingUp,
  ArrowLeftRight,
  FileText,
  ReceiptText,
} from "lucide-react";
import { signOut } from "next-auth/react";
import { useTheme } from "@/components/providers/ThemeProvider";

const PAGE_TITLES = {
  "/overview":        { title: "Overview",              breadcrumb: [] },
  "/map":             { title: "Financial Map",         breadcrumb: [] },
  "/assets":          { title: "Assets & Liabilities",  breadcrumb: [] },
  "/investments":     { title: "Investments",           breadcrumb: [] },
  "/transactions":    { title: "Transactions",          breadcrumb: [] },
  "/documents":       { title: "Documents",             breadcrumb: [] },
  "/invoices":        { title: "Invoices",              breadcrumb: [] },
  "/invoices/new":    { title: "New invoice",           breadcrumb: [] },
  "/invoices/settings": { title: "Invoice settings",    breadcrumb: [] },
  "/reports":         { title: "Reports",               breadcrumb: [] },
  "/accountability":  { title: "Accountability",        breadcrumb: [] },
  "/settings":        { title: "Settings",              breadcrumb: [] },
};

const QUICK_CREATE_ITEMS = [
  { href: "/assets?new=asset",       label: "New asset",     icon: Landmark },
  { href: "/assets?new=liability",   label: "New liability", icon: Landmark },
  { href: "/investments?new=1",      label: "New investment", icon: TrendingUp },
  { href: "/transactions?new=1",     label: "New transaction", icon: ArrowLeftRight },
  { href: "/documents?new=1",        label: "Upload document", icon: FileText },
  { href: "/invoices/new",           label: "New invoice",   icon: ReceiptText },
];

function getPageInfo(pathname) {
  // Exact match
  if (PAGE_TITLES[pathname]) return PAGE_TITLES[pathname];
  // Prefix match
  for (const key of Object.keys(PAGE_TITLES)) {
    if (pathname.startsWith(key + "/")) return PAGE_TITLES[key];
  }
  return { title: "ProFinance", breadcrumb: [] };
}

export default function TopBar({ user, onMobileMenuToggle, onSearchOpen }) {
  const pathname = usePathname();
  const { title } = getPageInfo(pathname);
  const { theme, toggle: toggleTheme, mounted } = useTheme();
  const [profileOpen, setProfileOpen] = useState(false);
  const [quickCreateOpen, setQuickCreateOpen] = useState(false);

  // Close dropdowns when the route changes (adjust-during-render pattern)
  const [lastPathname, setLastPathname] = useState(pathname);
  if (lastPathname !== pathname) {
    setLastPathname(pathname);
    setProfileOpen(false);
    setQuickCreateOpen(false);
  }

  // Close on outside click
  useEffect(() => {
    if (!profileOpen && !quickCreateOpen) return;
    function close(e) {
      if (!e.target.closest("[data-profile-menu]")) setProfileOpen(false);
      if (!e.target.closest("[data-quick-create]")) setQuickCreateOpen(false);
    }
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [profileOpen, quickCreateOpen]);

  return (
    <header
      className="flex-shrink-0 flex items-center gap-3 px-4 md:px-6"
      style={{
        height: "var(--topbar-height)",
        background: "var(--topbar-bg)",
        borderBottom: "1px solid var(--topbar-border)",
        zIndex: "var(--z-topbar)",
        position: "relative",
      }}
    >
      {/* Mobile menu toggle */}
      <button
        onClick={onMobileMenuToggle}
        className="md:hidden p-2 rounded-lg transition-colors"
        style={{ color: "var(--color-text-secondary)" }}
        aria-label="Open navigation"
      >
        <Menu size={20} />
      </button>

      {/* Page title */}
      <div className="flex-1 min-w-0">
        <h1
          className="text-base font-semibold truncate"
          style={{
            color: "var(--color-text-primary)",
            letterSpacing: "-0.01em",
          }}
        >
          {title}
        </h1>
      </div>

      {/* ── Right actions ───────────────────────────────────────────────── */}
      <div className="flex items-center gap-1.5">
        {/* Search trigger */}
        <button
          id="global-search-btn"
          onClick={onSearchOpen}
          className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg transition-colors"
          style={{
            color: "var(--color-text-tertiary)",
            border: "1px solid var(--color-border)",
          }}
          aria-label="Search (Ctrl+K)"
          title="Search — Ctrl/⌘ + K"
        >
          <Search size={16} />
          <kbd
            className="hidden lg:inline text-[10px] font-medium"
            style={{ color: "var(--color-text-tertiary)" }}
          >
            ⌘K
          </kbd>
        </button>

        {/* Theme toggle */}
        <button
          id="theme-toggle-btn"
          type="button"
          onClick={toggleTheme}
          suppressHydrationWarning
          className="p-2 rounded-lg transition-colors cursor-pointer"
          style={{ color: "var(--color-text-secondary)" }}
          aria-label={
            mounted
              ? theme === "dark"
                ? "Switch to light theme"
                : "Switch to dark theme"
              : "Toggle theme"
          }
          title={
            mounted
              ? theme === "dark"
                ? "Light theme"
                : "Dark theme"
              : "Toggle theme"
          }
        >
          {mounted ? (
            theme === "dark" ? <Sun size={17} /> : <Moon size={17} />
          ) : (
            <span className="inline-block w-[17px] h-[17px]" />
          )}
        </button>

        {/* Quick create */}
        <div className="relative" data-quick-create>
          <button
            id="quick-create-btn"
            onClick={() => setQuickCreateOpen((v) => !v)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
            style={{
              background: "var(--color-emerald-600)",
              color: "#faf9f6",
            }}
            aria-label="Quick create"
            aria-expanded={quickCreateOpen}
          >
            <Plus size={14} />
            <span className="hidden sm:inline">New</span>
          </button>

          <AnimatePresence>
            {quickCreateOpen && (
              <motion.div
                initial={{ opacity: 0, y: -6, scale: 0.98 }}
                animate={{ opacity: 1, y: 6, scale: 1 }}
                exit={{ opacity: 0, y: -6, scale: 0.98 }}
                transition={{ duration: 0.16, ease: [0.25, 0.1, 0.25, 1] }}
                className="absolute right-0 top-full mt-1.5 w-56 rounded-[var(--radius-xl)] overflow-hidden border border-[var(--color-border)] bg-[var(--color-surface)]/95 shadow-[0_20px_50px_-12px_rgba(26,26,24,0.18)] dark:shadow-[0_24px_64px_-16px_rgba(0,0,0,0.7)] ring-1 ring-black/5 dark:ring-white/10 backdrop-blur-md z-[var(--z-modal)]"
              >
                <div className="p-1.5 space-y-0.5">
                  {QUICK_CREATE_ITEMS.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="group w-full flex items-center gap-2.5 px-3 py-2 rounded-[var(--radius-md)] text-xs font-medium transition-colors duration-150 hover:bg-[var(--color-surface-2)] text-[var(--color-text-primary)]"
                    >
                      <item.icon size={14} className="text-[var(--color-text-tertiary)] group-hover:text-[var(--color-emerald-600)] transition-colors" />
                      {item.label}
                    </Link>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Notifications */}
        <button
          id="notifications-btn"
          className="relative p-2 rounded-lg transition-colors"
          style={{ color: "var(--color-text-secondary)" }}
          aria-label="Notifications"
        >
          <Bell size={18} />
          {/* Badge — will be dynamic in Phase 9 */}
          <span
            className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full"
            style={{ background: "var(--color-coral-500)" }}
          />
        </button>

        {/* Profile dropdown */}
        <div className="relative" data-profile-menu>
          <button
            id="profile-menu-btn"
            onClick={() => setProfileOpen((v) => !v)}
            className="flex items-center gap-2 pl-2 pr-1 py-1 rounded-lg transition-colors"
            style={{ color: "var(--color-text-primary)" }}
            aria-label="Profile menu"
            aria-expanded={profileOpen}
          >
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
              style={{
                background: "var(--color-emerald-100)",
                color: "var(--color-emerald-700)",
              }}
            >
              {user?.name?.[0]?.toUpperCase() || "U"}
            </div>
            <ChevronDown
              size={14}
              className="transition-transform hidden sm:block"
              style={{
                color: "var(--color-text-tertiary)",
                transform: profileOpen ? "rotate(180deg)" : "rotate(0)",
              }}
            />
          </button>

          <AnimatePresence>
            {profileOpen && (
              <motion.div
                initial={{ opacity: 0, y: -6, scale: 0.98 }}
                animate={{ opacity: 1, y: 6, scale: 1 }}
                exit={{ opacity: 0, y: -6, scale: 0.98 }}
                transition={{ duration: 0.16, ease: [0.25, 0.1, 0.25, 1] }}
                className="absolute right-0 top-full mt-1.5 w-60 rounded-[var(--radius-xl)] overflow-hidden border border-[var(--color-border)] bg-[var(--color-surface)]/95 shadow-[0_20px_50px_-12px_rgba(26,26,24,0.18)] dark:shadow-[0_24px_64px_-16px_rgba(0,0,0,0.7)] ring-1 ring-black/5 dark:ring-white/10 backdrop-blur-md z-[var(--z-modal)]"
              >
                {/* User info */}
                <div
                  className="px-4 py-3"
                  style={{ borderBottom: "1px solid var(--color-border)" }}
                >
                  <p className="text-xs font-semibold text-[var(--color-text-primary)]">
                    {user?.name || "Account"}
                  </p>
                  <p className="text-[11px] truncate text-[var(--color-text-tertiary)] mt-0.5">
                    {user?.email}
                  </p>
                  {user?.preferredCurrency && (
                    <div className="mt-1.5 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-[var(--color-surface-2)] text-[var(--color-emerald-700)] dark:text-[var(--color-emerald-400)]">
                      Currency: {user.preferredCurrency}
                    </div>
                  )}
                </div>

                {/* Menu items */}
                <div className="p-1.5 space-y-0.5">
                  <Link
                    href="/settings"
                    className="group w-full flex items-center gap-2.5 px-3 py-2 rounded-[var(--radius-md)] text-xs font-medium transition-colors duration-150 hover:bg-[var(--color-surface-2)] text-[var(--color-text-primary)]"
                  >
                    <Settings size={14} className="text-[var(--color-text-tertiary)] group-hover:text-[var(--color-emerald-600)] transition-colors" />
                    Settings Centre
                  </Link>
                  <button
                    onClick={() => signOut({ callbackUrl: "/login" })}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-[var(--radius-md)] text-xs font-medium transition-colors duration-150 hover:bg-[var(--color-surface-2)] text-left text-[var(--color-text-primary)] cursor-pointer"
                  >
                    <LogOut size={14} className="text-[var(--color-text-tertiary)] group-hover:text-[var(--color-coral-500)] transition-colors" />
                    Sign out
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  );
}
