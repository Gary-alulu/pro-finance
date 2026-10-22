/** @type {import('next').NextConfig} */
const isDev = process.env.NODE_ENV !== "production";

// M-2: baseline security headers for every response. The CSP keeps
// 'unsafe-inline' for styles (Tailwind/inline styles) and scripts (Next.js
// inline bootstrap); eval is dev-only for React refresh tooling.
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
  },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob:",
      "font-src 'self' data:",
      "connect-src 'self'",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
    ].join("; "),
  },
  // HSTS only in production (never send over plain-HTTP dev)
  ...(isDev
    ? []
    : [
        {
          key: "Strict-Transport-Security",
          value: "max-age=63072000; includeSubDomains",
        },
      ]),
];

const nextConfig = {
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  experimental: {
    // Dev-only: defer compiling `next/dynamic` targets (Recharts, FinancialMap)
    // until they are actually requested, slashing first-visit compile time.
    turbopackLazyDynamicImports: true,
    turbopackLazyDynamicImportsSSR: true,
  },
  // Keep compiled dev pages/APIs resident longer so hopping between routes
  // does not re-trigger a cold compile.
  onDemandEntries: {
    maxInactiveAge: 5 * 60 * 1000,
    pagesBufferLength: 8,
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
