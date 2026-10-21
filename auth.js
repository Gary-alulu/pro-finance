// auth.js  (project root)
// Auth.js v5 configuration — Credentials provider only for single-owner MVP.
// All session checks happen server-side via getServerSession() or auth() helper.

import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { connectDB } from "@/lib/db/mongoose";
import User from "@/lib/db/models/User";
import bcrypt from "bcryptjs";

// ── Login rate limiting (H-1) ────────────────────────────────────────────────
// In-memory tracker: 5 failed attempts per email within 15 minutes locks the
// account for 15 minutes. Stored on globalThis so duplicate module instances
// (proxy bundle vs route-handler bundle, dev hot reloads) share one map.
// Single-instance only — multi-instance deployments must back this with a
// shared store (e.g. Redis).
const loginAttempts = globalThis.__profinanceLoginAttempts ?? new Map();
globalThis.__profinanceLoginAttempts = loginAttempts;
const LOGIN_MAX_ATTEMPTS = 5;
const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const LOGIN_LOCKOUT_MS = 15 * 60 * 1000;

function loginKey(email) {
  return String(email).toLowerCase().trim();
}

function isLoginLocked(email) {
  const key = loginKey(email);
  const entry = loginAttempts.get(key);
  if (!entry) return false;
  const now = Date.now();
  if (entry.lockedUntil > now) return true;
  // Only reset when a lockout has expired or the attempt window lapsed —
  // never wipe the counter of an active window.
  if (entry.lockedUntil > 0 || now - entry.firstAt > LOGIN_WINDOW_MS) {
    loginAttempts.delete(key);
  }
  return false;
}

function recordFailedLogin(email) {
  const key = loginKey(email);
  const now = Date.now();
  let entry = loginAttempts.get(key);
  if (!entry || now - entry.firstAt > LOGIN_WINDOW_MS) {
    entry = { count: 0, firstAt: now, lockedUntil: 0 };
  }
  entry.count += 1;
  if (entry.count >= LOGIN_MAX_ATTEMPTS) {
    entry.lockedUntil = now + LOGIN_LOCKOUT_MS;
  }
  loginAttempts.set(key, entry);
}

function recordSuccessfulLogin(email) {
  loginAttempts.delete(loginKey(email));
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        // M-3: strictly type-check credentials before use
        const email =
          typeof credentials?.email === "string"
            ? credentials.email.trim().toLowerCase()
            : "";
        const password =
          typeof credentials?.password === "string" ? credentials.password : "";
        if (!email || !password) return null;

        // H-1: lockout before any DB work — same null as bad creds (no leak)
        if (isLoginLocked(email)) return null;

        await connectDB();

        const user = await User.findOne({ email }).select("+passwordHash");

        if (!user) {
          recordFailedLogin(email);
          return null;
        }

        const passwordValid = await bcrypt.compare(password, user.passwordHash);

        if (!passwordValid) {
          recordFailedLogin(email);
          return null;
        }

        recordSuccessfulLogin(email);

        return {
          id: user._id.toString(),
          email: user.email,
          name: user.name,
          preferredCurrency: user.preferredCurrency || "KES",
        };
      },
    }),
  ],

  session: { strategy: "jwt" },

  pages: {
    signIn: "/login",
    error: "/login",
  },

  callbacks: {
    // M-1: fail closed for app pages at the proxy layer. API routes opt out —
    // they enforce their own auth via requireUserId() and return JSON 401s.
    async authorized({ auth, request }) {
      if (request.nextUrl.pathname.startsWith("/api/")) return true;
      return !!auth;
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.preferredCurrency = user.preferredCurrency;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id;
        session.user.preferredCurrency = token.preferredCurrency;
      }
      return session;
    },
  },

  secret: process.env.NEXTAUTH_SECRET,
  // M-8: trustHost is required for Host header trust behind a reverse proxy /
  // platform adapter (Vercel, nginx). Only safe because AUTH_SECRET is
  // kept server-side; never expose it. Terminate TLS and set the real Host
  // at the proxy in production.
  trustHost: true,
});
