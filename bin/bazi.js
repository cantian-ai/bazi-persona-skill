#!/usr/bin/env node
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const entry = resolve(__dirname, "../dist/core/skill_writer.js");

try {
  execFileSync(process.execPath, [entry, ...process.argv.slice(2)], {
    stdio: "inherit",
  });
} catch (e) {
  process.exitCode = e.status ?? 1;
}
