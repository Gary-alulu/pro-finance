"use client";
// components/providers/SessionProvider.js
// Wraps the app so client components can call useSession().update() to refresh
// token claims (name/email/currency) immediately after profile edits.

import { SessionProvider } from "next-auth/react";

export default function AuthSessionProvider({ children }) {
  return <SessionProvider>{children}</SessionProvider>;
}
