"use client";
// components/providers/ToastProvider.js
// Lightweight toast queue for success/error/neutral feedback.
// Mounted once in the app shell; consume via useToast().

import { createContext, useContext, useState, useCallback, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";

const ToastContext = createContext({ toast: () => {}, dismiss: () => {} });

const ICONS = {
  success: { Icon: CheckCircle2, color: "var(--color-positive)" },
  error: { Icon: AlertCircle, color: "var(--color-negative)" },
  info: { Icon: Info, color: "var(--color-text-secondary)" },
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const idRef = useRef(0);

  const dismiss = useCallback((id) => {
    setToasts((list) => list.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(
    (message, { type = "info", duration = 4000 } = {}) => {
      const id = ++idRef.current;
      setToasts((list) => [...list.slice(-3), { id, message, type }]);
      if (duration > 0) {
        setTimeout(() => dismiss(id), duration);
      }
      return id;
    },
    [dismiss]
  );

  const success = useCallback((msg, opts) => toast(msg, { ...opts, type: "success" }), [toast]);
  const error = useCallback((msg, opts) => toast(msg, { ...opts, type: "error" }), [toast]);

  return (
    <ToastContext.Provider value={{ toast, success, error, dismiss }}>
      {children}

      {/* Toast viewport */}
      <div
        className="fixed bottom-4 right-4 flex flex-col gap-2 pointer-events-none"
        style={{ zIndex: "var(--z-toast)" }}
        role="status"
        aria-live="polite"
      >
        <AnimatePresence>
          {toasts.map((t) => {
            const { Icon, color } = ICONS[t.type] || ICONS.info;
            return (
              <motion.div
                key={t.id}
                initial={{ opacity: 0, y: 16, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.97 }}
                transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                className="pointer-events-auto flex items-start gap-2.5 pl-3 pr-2 py-2.5 max-w-sm"
                style={{
                  background: "var(--color-surface)",
                  border: "1px solid var(--color-border)",
                  borderRadius: "var(--radius-md)",
                  boxShadow: "var(--shadow-lg)",
                }}
              >
                <Icon size={16} style={{ color, marginTop: 1, flexShrink: 0 }} />
                <p className="text-sm" style={{ color: "var(--color-text-primary)" }}>
                  {t.message}
                </p>
                <button
                  onClick={() => dismiss(t.id)}
                  className="p-1 rounded transition-colors flex-shrink-0"
                  style={{ color: "var(--color-text-tertiary)" }}
                  aria-label="Dismiss notification"
                >
                  <X size={13} />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside ToastProvider");
  return ctx;
}
