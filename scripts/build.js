/**
 * Cross-platform build script
 *
 * Replaces Unix-only commands (cp, 2>/dev/null, || true) in package.json
 * with Node.js native fs operations that work on Windows, macOS, and Linux.
 */

const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const STANDALONE = path.join(".next", "standalone");
const STATIC_SRC = path.join(".next", "static");
const STATIC_DST = path.join(STANDALONE, ".next", "static");
const PUBLIC_SRC = "public";
const PUBLIC_DST = path.join(STANDALONE, "public");

// Run Next.js build
console.log("[build] Running next build...");
execSync("next build", { stdio: "inherit" });

// Verify standalone output exists
if (!fs.existsSync(STANDALONE)) {
  console.error("[build] ERROR: .next/standalone not found after build");
  process.exit(1);
}

// Copy .next/static -> .next/standalone/.next/static
function copyDir(src, dst) {
  if (!fs.existsSync(src)) {
    console.log(`[build] Skipping ${src} (not found)`);
    return;
  }
  if (fs.existsSync(dst)) {
    fs.rmSync(dst, { recursive: true, force: true });
  }
  fs.cpSync(src, dst, { recursive: true, errorOnFail: false });
  console.log(`[build] Copied ${src} -> ${dst}`);
}

copyDir(STATIC_SRC, STATIC_DST);
copyDir(PUBLIC_SRC, PUBLIC_DST);

console.log("[build] Done!");
