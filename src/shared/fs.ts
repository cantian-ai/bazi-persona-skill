import fs from "node:fs";
import path from "node:path";
import { pinyin } from "pinyin-pro";

export function nowIso(): string {
  return new Date().toISOString();
}

export function ensureDir(dirPath: string): void {
  fs.mkdirSync(dirPath, { recursive: true });
}

export function readUtf8(filePath: string): string {
  return fs.readFileSync(filePath, "utf-8");
}

export function readUtf8IfExists(filePath: string): string {
  return fs.existsSync(filePath) ? fs.readFileSync(filePath, "utf-8") : "";
}

export function writeUtf8(filePath: string, content: string): void {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, content, "utf-8");
}

export function writeJson(filePath: string, payload: unknown): void {
  writeUtf8(filePath, `${JSON.stringify(payload, null, 2)}\n`);
}

export function readJson<T>(filePath: string): T {
  return JSON.parse(readUtf8(filePath)) as T;
}

export function fileExists(filePath: string): boolean {
  return fs.existsSync(filePath);
}

export function normalizeSlugToken(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[_\s]+/g, "-")
    .replace(/[^a-z0-9-\u4e00-\u9fa5]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export function toSlug(input: string): string {
  const normalized = normalizeSlugToken(input);
  if (!normalized) {
    return "bazi-persona";
  }

  const pinyinText = pinyin(normalized, {
    toneType: "none",
    type: "array",
    nonZh: "consecutive",
  });

  const mapped = pinyinText
    .map((item) => normalizeSlugToken(item))
    .filter(Boolean)
    .join("-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  return mapped || "bazi-persona";
}

export function parseCliArgs(argv: string[]): Record<string, string> {
  const pairs = argv.slice(2);
  const result: Record<string, string> = {};

  for (let i = 0; i < pairs.length; i += 1) {
    const token = pairs[i];
    if (!token.startsWith("--")) {
      continue;
    }
    const key = token.slice(2);
    const maybeValue = pairs[i + 1];
    if (!maybeValue || maybeValue.startsWith("--")) {
      result[key] = "true";
      continue;
    }
    result[key] = maybeValue;
    i += 1;
  }

  return result;
}

export function ensureRequired(
  args: Record<string, string>,
  keys: string[],
): void {
  const missing = keys.filter((key) => !args[key]);
  if (missing.length > 0) {
    const lines = [
      "输入不完整，暂时无法继续执行。",
      `缺少字段：${missing.join("、")}`,
      "请补齐后重试。例如：--name \"张三\" --birth-date \"1990-01-01\"",
    ];
    throw new Error(lines.join("\n"));
  }
}

export function toTitleCase(input: string): string {
  if (!input) {
    return input;
  }
  return input.charAt(0).toUpperCase() + input.slice(1);
}

export function bumpVersion(version: string): string {
  const matched = /^v(\d+)$/.exec(version);
  if (!matched) {
    return "v1";
  }
  return `v${Number.parseInt(matched[1], 10) + 1}`;
}

export function timestampTag(date = new Date()): string {
  const yyyy = `${date.getFullYear()}`;
  const mm = `${date.getMonth() + 1}`.padStart(2, "0");
  const dd = `${date.getDate()}`.padStart(2, "0");
  const hh = `${date.getHours()}`.padStart(2, "0");
  const mi = `${date.getMinutes()}`.padStart(2, "0");
  const ss = `${date.getSeconds()}`.padStart(2, "0");
  return `${yyyy}${mm}${dd}_${hh}${mi}${ss}`;
}

export function safeJsonParse<T>(raw: string, fallback: T): T {
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}
