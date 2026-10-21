// app/(auth)/layout.js
import Link from "next/link";
import HeroIllustration from "@/components/auth/HeroIllustration";

export const metadata = {
  title: "Sign In",
};

const FEATURES = [
  { icon: "◈", label: "Interactive financial knowledge graph" },
  { icon: "◎", label: "Decimal-precise net worth tracking" },
  { icon: "◧", label: "AI-assisted document intelligence" },
  { icon: "✓", label: "Complete accountability system" },
];

export default function AuthLayout({ children }) {
  return (
    <div
      className="min-h-screen flex"
      style={{ background: "var(--color-ivory)" }}
    >
      {/* Left panel — brand + animated hero */}
      <div className="relative hidden lg:flex lg:w-[55%] xl:w-[58%] flex-col justify-between overflow-hidden p-12 xl:p-14"
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 20% 0%, rgba(16,185,129,0.18) 0%, transparent 55%), radial-gradient(ellipse 60% 50% at 90% 90%, rgba(196,154,36,0.12) 0%, transparent 50%), linear-gradient(160deg, #101815 0%, #14231a 45%, #0c1a12 100%)",
        }}
      >
        {/* Soft vignette + top hairline glow */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "linear-gradient(180deg, rgba(250,249,246,0.06) 0%, transparent 18%)",
          }}
        />

        {/* Logo */}
        <Link href="/" className="relative flex items-center gap-3 group w-fit">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-lg shadow-lg"
            style={{
              background: "linear-gradient(135deg, var(--color-emerald-500), var(--color-emerald-700))",
              color: "#faf9f6",
              boxShadow: "0 4px 16px rgba(16,185,129,0.35)",
            }}
          >
            P
          </div>
          <span
            className="text-xl font-semibold tracking-tight"
            style={{ color: "#faf9f6" }}
          >
            ProFinance
          </span>
        </Link>

        {/* Hero illustration + tagline */}
        <div className="relative space-y-8">
          <HeroIllustration />
          <div className="space-y-4 max-w-lg">
            <blockquote
              className="text-3xl xl:text-[2.6rem] font-light leading-[1.15]"
              style={{ color: "#eef7f1", letterSpacing: "-0.025em" }}
            >
              &ldquo;Know what you own,{" "}
              <em
                className="not-italic font-semibold"
                style={{ color: "var(--color-emerald-400)" }}
              >
                what you owe,
              </em>{" "}
              and exactly where you stand.&rdquo;
            </blockquote>
            <p style={{ color: "#7aab8a", fontSize: "0.875rem" }}>
              Personal Wealth Intelligence &amp; Financial Map
            </p>
          </div>
        </div>

        {/* Feature pills + footer */}
        <div className="relative space-y-6">
          <ul className="flex flex-wrap gap-2">
            {FEATURES.map((feat) => (
              <li
                key={feat.label}
                className="flex items-center gap-2 text-xs px-3 py-1.5 rounded-full"
                style={{
                  background: "rgba(16,185,129,0.1)",
                  border: "1px solid rgba(16,185,129,0.22)",
                  color: "#9bbfaa",
                }}
              >
                <span style={{ color: "var(--color-emerald-400)" }}>{feat.icon}</span>
                {feat.label}
              </li>
            ))}
          </ul>
          <p className="text-xs" style={{ color: "#4e6b58" }}>
            Single-owner · End-to-end audited · Built for precision
          </p>
        </div>
      </div>

      {/* Right panel — form area */}
      <div className="relative flex-1 flex items-center justify-center p-6 md:p-12">
        {/* Subtle decorative tint behind the card */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 70% 50% at 70% 20%, rgba(16,185,129,0.06) 0%, transparent 60%)",
          }}
        />

        <div className="relative w-full max-w-md">
          {/* Mobile logo */}
          <div className="flex items-center gap-2.5 mb-8 lg:hidden">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center font-bold shadow-md"
              style={{
                background: "linear-gradient(135deg, var(--color-emerald-500), var(--color-emerald-700))",
                color: "#faf9f6",
              }}
            >
              P
            </div>
            <span className="font-semibold text-lg" style={{ color: "var(--color-text-primary)" }}>
              ProFinance
            </span>
          </div>

          {/* Form card */}
          <div
            className="rounded-2xl p-7 md:p-8"
            style={{
              background: "var(--color-surface)",
              border: "1px solid var(--color-border)",
              boxShadow: "var(--shadow-xl)",
            }}
          >
            {children}
          </div>

          <p
            className="mt-6 text-center text-xs"
            style={{ color: "var(--color-text-tertiary)" }}
          >
            Protected by industry-standard encryption. Your data never leaves
            your instance.
          </p>
        </div>
      </div>
    </div>
  );
}
