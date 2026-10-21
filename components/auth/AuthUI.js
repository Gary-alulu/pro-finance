// components/auth/AuthUI.js
// Shared building blocks for the login / registration forms:
// icon-prefixed fields, password inputs with visibility toggle,
// error banner, and the primary submit button.

"use client";

import { useState } from "react";
import { Eye, EyeOff, AlertCircle } from "lucide-react";
import { motion } from "framer-motion";

const ease = [0.16, 1, 0.3, 1];

// Security: credentials must be typed, never pasted — blocks paste, drop,
// and cut so clipboard content from other sites can't land in these fields.
export function noPaste(event) {
  event.preventDefault();
}

export function Field({ id, label, icon: Icon, error, children }) {
  return (
    <div className="space-y-1.5">
      <label
        htmlFor={id}
        className="block text-[13px] font-medium"
        style={{ color: "var(--color-text-primary)" }}
      >
        {label}
      </label>
      <div className="relative">
        {Icon && (
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none">
            <Icon
              size={16}
              style={{
                color: error
                  ? "var(--color-coral-500)"
                  : "var(--color-text-tertiary)",
              }}
            />
          </span>
        )}
        {children}
      </div>
      {error && (
        <p className="text-xs" style={{ color: "var(--color-negative)" }}>
          {error}
        </p>
      )}
    </div>
  );
}

export function PasswordInput({
  id,
  placeholder,
  autoComplete,
  registration,
  error,
}) {
  const [show, setShow] = useState(false);
  return (
    <>
      <input
        id={id}
        type={show ? "text" : "password"}
        autoComplete={autoComplete}
        placeholder={placeholder}
        className={`auth-input pr-10${error ? " auth-input-error" : ""}`}
        onPaste={noPaste}
        onDrop={noPaste}
        onCut={noPaste}
        title="Pasting is disabled for security — type your password"
        {...registration}
      />
      <button
        type="button"
        onClick={() => setShow((v) => !v)}
        className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-md transition-colors hover:opacity-70"
        style={{ color: "var(--color-text-tertiary)" }}
        aria-label={show ? "Hide password" : "Show password"}
      >
        {show ? <EyeOff size={16} /> : <Eye size={16} />}
      </button>
    </>
  );
}

export function ErrorBanner({ children }) {
  if (!children) return null;
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex items-center gap-3 p-3 mb-5 rounded-xl text-sm"
      style={{
        background: "var(--color-negative-bg)",
        color: "var(--color-negative)",
        border: "1px solid var(--color-coral-100)",
      }}
      role="alert"
    >
      <AlertCircle size={16} className="flex-shrink-0" />
      {children}
    </motion.div>
  );
}

export function SubmitButton({ id, loading, loadingLabel, icon: Icon, children }) {
  return (
    <button
      id={id}
      type="submit"
      disabled={loading}
      className="auth-btn-primary group"
    >
      {loading ? (
        <>
          <span
            className="w-4 h-4 border-2 rounded-full animate-spin"
            style={{ borderColor: "rgba(255,255,255,0.3)", borderTopColor: "#fff" }}
          />
          {loadingLabel}
        </>
      ) : (
        <>
          {Icon && <Icon size={15} className="transition-transform group-hover:translate-x-0.5" />}
          {children}
        </>
      )}
    </button>
  );
}
