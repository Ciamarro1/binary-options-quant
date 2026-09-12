/**
 * Root entrypoint wrapper for Railway / Container environments.
 * If Railway boots via Node.js / Nixpacks, this delegator starts the Python
 * cloud recorder and HTTP dashboard daemon.
 */
"use strict";

const { spawn } = require("child_process");
const path = require("path");

const SCRIPT_PATH = path.join(
  __dirname,
  "research",
  "execution",
  "data_acquisition",
  "recorder",
  "cloud_entrypoint.py"
);

console.log(`[BOOT] Delegating execution to Python Cloud Entrypoint: ${SCRIPT_PATH}`);

// Try python3 first, then python
const pythonCmd = process.platform === "win32" ? "python" : "python3";
const child = spawn(pythonCmd, [SCRIPT_PATH], {
  stdio: "inherit",
  env: process.env
});

child.on("error", (err) => {
  console.error(`[BOOT ERROR] Failed to spawn ${pythonCmd}:`, err.message);
  // Fallback to python if python3 failed
  if (pythonCmd === "python3") {
    console.log("[BOOT] Retrying with 'python'...");
    const fallback = spawn("python", [SCRIPT_PATH], {
      stdio: "inherit",
      env: process.env
    });
    fallback.on("close", (code) => process.exit(code || 0));
  } else {
    process.exit(1);
  }
});

child.on("close", (code) => {
  console.log(`[BOOT] Process exited with code ${code}`);
  process.exit(code || 0);
});
