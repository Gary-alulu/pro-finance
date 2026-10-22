// scripts/dev.mjs
// Starts `next dev` and, once it is ready, warms every route so the first
// navigation in the browser is not blocked by a cold Turbopack compile.

import { spawn } from "node:child_process";

const isWindows = process.platform === "win32";

const next = spawn(isWindows ? "npx.cmd" : "npx", ["next", "dev"], {
  stdio: "inherit",
  shell: isWindows,
});

// Give Turbopack a moment to boot, then compile routes in the background.
const warmer = spawn(process.execPath, ["scripts/warm-dev.mjs"], {
  stdio: "inherit",
});

function shutdown(code) {
  for (const child of [warmer, next]) {
    if (!child.killed) child.kill();
  }
  process.exit(code ?? 0);
}

next.on("exit", (code) => shutdown(code));
process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));
