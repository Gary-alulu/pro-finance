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

// ── Remember me ──────────────────────────────────────────────────────────────
// Remembered sessions last the full default (30 days). Un-remembered sessions
// expire after NON_REMEMBER_MAX_AGE. Enforced in the jwt callback by rejecting
// stale tokens — a JWT's own exp is the full session maxAge, so we age out
// non-remembered tokens ourselves and hand back null to kill the session.
const REMEMBER_MAX_AGE = 30 * 24 * 60 * 60; // 30 days (seconds)
const NON_REMEMBER_MAX_AGE = 24 * 60 * 60; // 24 hours (seconds)

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
        rememberMe: { label: "Remember me", type: "checkbox" },
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

        const remember =
          credentials?.rememberMe === true || credentials?.rememberMe === "true";

        return {
          id: user._id.toString(),
          email: user.email,
          name: user.name,
          preferredCurrency: user.preferredCurrency || "KES",
          remember,
        };
      },
    }),
  ],

  // JWT cookie lives the full 30 days; non-remembered tokens are aged out
  // manually in the jwt callback (see NON_REMEMBER_MAX_AGE).
  session: { strategy: "jwt", maxAge: REMEMBER_MAX_AGE },

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
    async jwt({ token, user, trigger }) {
      if (user) {
        token.id = user.id;
        token.preferredCurrency = user.preferredCurrency;
        // Auth.js v5 bug: user fields not in the default JWT shape (name/email)
        // are NOT auto-copied for credentials logins — map them explicitly.
        token.name = user.name;
        token.email = user.email;
        token.remember = user.remember === true;
        token.loginAt = Math.floor(Date.now() / 1000);
      }
      // Remember me = false → expire the session after NON_REMEMBER_MAX_AGE.
      // Missing claim (older tokens) is treated as remembered for back-compat.
      if (token.loginAt && token.remember !== true) {
        if (Math.floor(Date.now() / 1000) - token.loginAt > NON_REMEMBER_MAX_AGE) {
          return null;
        }
      }
      // Profile edits: refresh token claims from DB so name/email changes
      // show immediately without forcing a re-login.
      if (trigger === "update" && token.id) {
        await connectDB();
        const fresh = await User.findById(token.id).lean();
        if (fresh) {
          token.name = fresh.name;
          token.email = fresh.email;
          token.preferredCurrency = fresh.preferredCurrency;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id;
        session.user.preferredCurrency = token.preferredCurrency;
        session.user.remember = token.remember === true;
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
