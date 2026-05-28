#!/usr/bin/env node
/**
 * ArkTerm — Node.js bridge for npm global install.
 *
 * Spawns the Python agent with `stdio: 'inherit'` so that interactive TUI
 * streams (Rich colours, y/n prompts, streaming output) pass through
 * without loss.
 */

const { spawn } = require("node:child_process");
const path = require("node:path");

const child = spawn(
  process.platform === "win32" ? "python" : "python3",
  ["-m", "src.main"],
  {
    cwd: path.resolve(__dirname, ".."),
    env: { ...process.env },
    stdio: "inherit",
    shell: false,
  }
);

child.on("close", (code) => {
  process.exit(code ?? 0);
});

child.on("error", (err) => {
  console.error("Failed to launch arkterm:", err.message);
  process.exit(1);
});
