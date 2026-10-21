"use client";
// app/(auth)/login/page.js
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useState, useEffect } from "react";
import { LogIn, Mail, Lock, ShieldCheck } from "lucide-react";
import { motion } from "framer-motion";
import { loginSchema } from "@/lib/validations/schemas";
import { Field, PasswordInput, ErrorBanner, SubmitButton, noPaste } from "@/components/auth/AuthUI";

const ease = [0.16, 1, 0.3, 1];
const REMEMBERED_EMAIL_KEY = "profinance:lastEmail";

export default function LoginPage() {
  const router = useRouter();
  const [serverError, setServerError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm({ resolver: zodResolver(loginSchema) });

  // Prefill the last used email; only the email is ever persisted client-side.
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(REMEMBERED_EMAIL_KEY);
      if (saved) setValue("email", saved);
    } catch {
      /* localStorage unavailable (private mode) — ignore */
    }
  }, [setValue]);

  async function onSubmit(data) {
    setIsLoading(true);
    setServerError("");

    const result = await signIn("credentials", {
      email: data.email,
      password: data.password,
      rememberMe: rememberMe ? "true" : "false",
      redirect: false,
    });

    setIsLoading(false);

    if (result?.error) {
      setServerError("Invalid email or password. Please try again.");
    } else {
      try {
        window.localStorage.setItem(REMEMBERED_EMAIL_KEY, data.email);
      } catch {
        /* ignore */
      }
      router.push("/overview");
      router.refresh();
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease }}
    >
      {/* Heading with badge */}
      <div className="flex items-start justify-between gap-4 mb-7">
        <div>
          <h1
            className="text-[1.65rem] font-semibold leading-tight mb-1.5"
            style={{ color: "var(--color-text-primary)", letterSpacing: "-0.025em" }}
          >
            Welcome back
          </h1>
          <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
            Sign in to your wealth intelligence platform.
          </p>
        </div>
        <div
          className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{
            background: "var(--color-emerald-50)",
            border: "1px solid var(--color-emerald-100)",
            color: "var(--color-emerald-600)",
          }}
        >
          <ShieldCheck size={20} />
        </div>
      </div>

      <ErrorBanner>{serverError}</ErrorBanner>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4.5" noValidate>
        <Field
          id="login-email"
          label="Email address"
          icon={Mail}
          error={errors.email?.message}
        >
          <input
            id="login-email"
            type="email"
            autoComplete="username"
            placeholder="you@example.com"
            onPaste={noPaste}
            onDrop={noPaste}
            onCut={noPaste}
            title="Pasting is disabled for security — type your email"
            className={`auth-input${errors.email ? " auth-input-error" : ""}`}
            {...register("email")}
          />
        </Field>

        <Field
          id="login-password"
          label="Password"
          icon={Lock}
          error={errors.password?.message}
        >
          <PasswordInput
            id="login-password"
            placeholder="Enter your password"
            autoComplete="current-password"
            error={errors.password}
            registration={register("password")}
          />
        </Field>

        <label className="flex items-center gap-2.5 pt-0.5 text-sm cursor-pointer select-none" style={{ color: "var(--color-text-secondary)" }}>
          <input
            type="checkbox"
            checked={rememberMe}
            onChange={(e) => setRememberMe(e.target.checked)}
            className="w-4 h-4 rounded accent-[var(--color-emerald-600)]"
          />
          Keep me signed in for 30 days
        </label>

        <div className="pt-1">
          <SubmitButton
            id="login-submit"
            loading={isLoading}
            loadingLabel="Signing in…"
            icon={LogIn}
          >
            Sign in
          </SubmitButton>
        </div>
      </form>

      {/* Cross-link */}
      <p
        className="mt-7 pt-5 text-center text-sm border-t"
        style={{ color: "var(--color-text-tertiary)", borderColor: "var(--color-border)" }}
      >
        No account yet?{" "}
        <Link href="/register" className="auth-link">
          Create your account
        </Link>
      </p>
    </motion.div>
  );
}
