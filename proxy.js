// proxy.js (project root)
// Protects all /app/* routes. Redirects unauthenticated users to /login.

export { auth as proxy } from "./auth";

export const config = {
  matcher: [
    // Match all paths under the (app) route group
    "/((?!login|register|api/auth|_next/static|_next/image|favicon.ico).*)",
  ],
};
