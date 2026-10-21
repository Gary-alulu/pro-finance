"use client";
// app/(auth)/login/page.js
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useState } from "react";
import { LogIn, Mail, Lock, ShieldCheck } from "lucide-react";
import { motion } from "framer-motion";
import { loginSchema } from "@/lib/validations/schemas";
import { Field, PasswordInput, ErrorBanner, SubmitButton } from "@/components/auth/AuthUI";

const ease = [0.16, 1, 0.3, 1];

export default function LoginPage() {
  const router = useRouter();
  const [serverError, setServerError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({ resolver: zodResolver(loginSchema) });

  async function onSubmit(data) {
    setIsLoading(true);
    setServerError("");

    const result = await signIn("credentials", {
      email: data.email,
      password: data.password,
      redirect: false,
    });

    setIsLoading(false);

    if (result?.error) {
      setServerError("Invalid email or password. Please try again.");
    } else {
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
            autoComplete="email"
            placeholder="you@example.com"
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
