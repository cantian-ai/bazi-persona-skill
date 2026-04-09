import { pinyin } from "pinyin-pro";
import { normalizeSlugToken, parseCliArgs } from "./_shared.js";

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

function main(): void {
  const args = parseCliArgs(process.argv);
  const raw = args.input ?? args.name ?? "";
  if (!raw) {
    throw new Error(
      [
        "缺少 slug 输入内容。",
        "请提供 --input 或 --name。",
        "示例：--input \"张三\"",
      ].join("\n"),
    );
  }
  process.stdout.write(`${toSlug(raw)}\n`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
