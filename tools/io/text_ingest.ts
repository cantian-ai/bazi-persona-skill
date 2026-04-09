import fs from "node:fs";
import path from "node:path";
import { ensureDir, parseCliArgs, writeJson, writeUtf8 } from "../utils/_shared.js";

export interface IngestedSource {
  source_path: string;
  source_type: "text";
  character_count: number;
  paragraph_count: number;
  content: string;
}

export interface TextIngestResult {
  generated_at: string;
  source_count: number;
  total_characters: number;
  sources: IngestedSource[];
  merged_content: string;
}

function cleanText(raw: string): string {
  return raw
    .replace(/\r\n/g, "\n")
    .replace(/\t/g, " ")
    .replace(/[ \u00a0]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function toPaths(input: string): string[] {
  return input
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);
}

export function ingestTextFiles(paths: string[]): TextIngestResult {
  const sources: IngestedSource[] = [];

  for (const sourcePath of paths) {
    if (!fs.existsSync(sourcePath)) {
      throw new Error(
        [
          `找不到文本文件：${sourcePath}`,
          "请检查路径是否正确，或先把文件放到可访问目录。",
          "示例：--input ./materials/chat.txt,./materials/profile.md",
        ].join("\n"),
      );
    }
    const stat = fs.statSync(sourcePath);
    if (!stat.isFile()) {
      continue;
    }
    const raw = fs.readFileSync(sourcePath, "utf-8");
    const content = cleanText(raw);
    const paragraphs = content ? content.split(/\n{2,}/).length : 0;
    sources.push({
      source_path: sourcePath,
      source_type: "text",
      character_count: content.length,
      paragraph_count: paragraphs,
      content,
    });
  }

  const merged = sources
    .map((item, index) => {
      return [
        `## 来源 ${index + 1}`,
        `路径：${item.source_path}`,
        "",
        item.content,
      ].join("\n");
    })
    .join("\n\n---\n\n");

  return {
    generated_at: new Date().toISOString(),
    source_count: sources.length,
    total_characters: sources.reduce((sum, item) => sum + item.character_count, 0),
    sources,
    merged_content: merged,
  };
}

function main(): void {
  const args = parseCliArgs(process.argv);
  const input = args.input ?? "";
  if (!input) {
    throw new Error(
      [
        "缺少输入文件。",
        "请提供 --input，多个文件用逗号分隔。",
        "示例：--input ./a.txt,./b.md --output ./out.json",
      ].join("\n"),
    );
  }
  const output = args.output ?? "";
  if (!output) {
    throw new Error(
      [
        "缺少输出路径。",
        "请提供 --output。",
        "示例：--input ./a.txt --output ./out.json",
      ].join("\n"),
    );
  }

  const result = ingestTextFiles(toPaths(input));
  ensureDir(path.dirname(output));
  if (output.endsWith(".json")) {
    writeJson(output, result);
  } else {
    writeUtf8(output, result.merged_content);
  }
  process.stdout.write(
    `文本导入完成：${result.source_count} 个来源，${result.total_characters} 字。\n`,
  );
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
