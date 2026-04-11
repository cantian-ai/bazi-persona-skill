#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const entry = resolve(__dirname, "../dist/cli.js");

try {
  execFileSync(process.execPath, [entry, ...process.argv.slice(2)], {
    stdio: "inherit",
  });
} catch (error) {
  const status =
    error && typeof error === "object" && "status" in error && typeof error.status === "number"
      ? error.status
      : 1;
  process.exitCode = status;
}
