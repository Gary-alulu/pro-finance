"use client";
// app/(auth)/register/page.js
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { UserPlus, Mail, Lock, User, Coins, CheckCircle2, Circle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { registerSchema } from "@/lib/validations/schemas";
import { SUPPORTED_CURRENCIES } from "@/lib/finance/currency";
import { Field, PasswordInput, ErrorBanner, SubmitButton } from "@/components/auth/AuthUI";

const ease = [0.16, 1, 0.3, 1];

const PASSWORD_RULES = [
  { test: (v) => v.length >= 8, label: "At least 8 characters" },
  { test: (v) => /[A-Z]/.test(v), label: "One uppercase letter" },
  { test: (v) => /[0-9]/.test(v), label: "One number" },
];

function PasswordRules({ value }) {
  return (
    <ul className="mt-2 space-y-1">
      {PASSWORD_RULES.map((rule) => {
        const ok = rule.test(value || "");
        return (
          <li
            key={rule.label}
            className="flex items-center gap-1.5 text-xs transition-colors"
            style={{ color: ok ? "var(--color-emerald-600)" : "var(--color-text-tertiary)" }}
          >
            {ok ? <CheckCircle2 size={13} /> : <Circle size={13} />}
            {rule.label}
          </li>
        );
      })}
    </ul>
  );
}

export default function RegisterPage() {
  const router = useRouter();
  const [serverError, setServerError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(registerSchema),
    defaultValues: { preferredCurrency: "KES" },
  });

  const passwordValue = useWatch({ control, name: "password", defaultValue: "" });

  async function onSubmit(data) {
    setIsLoading(true);
    setServerError("");

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const json = await res.json();

      if (!res.ok) {
        setServerError(json.error || "Registration failed.");
        setIsLoading(false);
        return;
      }

      setSuccess(true);
      setTimeout(() => router.push("/login"), 1800);
    } catch {
      setServerError("Network error. Please try again.");
      setIsLoading(false);
    }
  }

  if (success) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, ease }}
        className="text-center space-y-4 py-10"
      >
        <motion.div
          className="w-16 h-16 rounded-full flex items-center justify-center mx-auto"
          style={{
            background: "var(--color-emerald-50)",
            border: "1px solid var(--color-emerald-100)",
          }}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.45, ease, delay: 0.1 }}
        >
          <CheckCircle2 size={30} style={{ color: "var(--color-emerald-600)" }} />
        </motion.div>
        <h2 className="text-xl font-semibold" style={{ color: "var(--color-text-primary)" }}>
          Account created!
        </h2>
        <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
          Redirecting you to sign in…
        </p>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease }}
    >
      <div className="mb-7">
        <h1
          className="text-[1.65rem] font-semibold leading-tight mb-1.5"
          style={{ color: "var(--color-text-primary)", letterSpacing: "-0.025em" }}
        >
          Create your account
        </h1>
        <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
          This platform supports a single owner account.
        </p>
      </div>

      <ErrorBanner>{serverError}</ErrorBanner>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <Field id="reg-name" label="Full name" icon={User} error={errors.name?.message}>
          <input
            id="reg-name"
            type="text"
            autoComplete="name"
            placeholder="Jane Wanjiru"
            className={`auth-input${errors.name ? " auth-input-error" : ""}`}
            {...register("name")}
          />
        </Field>

        <Field id="reg-email" label="Email address" icon={Mail} error={errors.email?.message}>
          <input
            id="reg-email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            className={`auth-input${errors.email ? " auth-input-error" : ""}`}
            {...register("email")}
          />
        </Field>

        <div>
          <Field
            id="reg-password"
            label="Password"
            icon={Lock}
            error={errors.password?.message}
          >
            <PasswordInput
              id="reg-password"
              placeholder="Create a strong password"
              autoComplete="new-password"
              error={errors.password}
              registration={register("password")}
            />
          </Field>
          <AnimatePresence>
            <PasswordRules value={passwordValue} />
          </AnimatePresence>
        </div>

        <Field
          id="reg-currency"
          label="Preferred reporting currency"
          icon={Coins}
        >
          <select
            id="reg-currency"
            className="auth-input auth-select"
            {...register("preferredCurrency")}
          >
            {SUPPORTED_CURRENCIES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.code} — {c.name}
              </option>
            ))}
          </select>
        </Field>

        <div className="pt-1">
          <SubmitButton
            id="register-submit"
            loading={isLoading}
            loadingLabel="Creating account…"
            icon={UserPlus}
          >
            Create account
          </SubmitButton>
        </div>
      </form>

      <p
        className="mt-7 pt-5 text-center text-sm border-t"
        style={{ color: "var(--color-text-tertiary)", borderColor: "var(--color-border)" }}
      >
        Already have an account?{" "}
        <Link href="/login" className="auth-link">
          Sign in
        </Link>
      </p>
    </motion.div>
  );
}
