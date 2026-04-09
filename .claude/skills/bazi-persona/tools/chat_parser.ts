import fs from "node:fs";
import path from "node:path";
import { ensureDir, parseCliArgs, writeJson } from "./_shared.js";

export interface ChatSignal {
  generated_at: string;
  source_path: string;
  target_name?: string;
  summary: {
    line_count: number;
    message_count: number;
    avg_message_length: number;
    rhythm: "短句快节奏" | "中等节奏" | "长句慢节奏";
  };
  vocabulary: {
    top_words: Array<{ word: string; count: number }>;
    signature_phrases: string[];
    punctuation_habits: Record<string, number>;
  };
  interaction_hints: {
    likely_agreement_style: string;
    likely_disagreement_style: string;
    likely_stress_reply: string;
  };
}

function splitMessages(raw: string): string[] {
  const normalized = raw.replace(/\r\n/g, "\n");
  return normalized
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => line.length > 1);
}

function tokenize(input: string): string[] {
  return input
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\u4e00-\u9fa5]+/gu, " ")
    .split(/\s+/)
    .filter((token) => token.length >= 2);
}

function topWords(messages: string[]): Array<{ word: string; count: number }> {
  const counter = new Map<string, number>();
  for (const message of messages) {
    for (const token of tokenize(message)) {
      counter.set(token, (counter.get(token) ?? 0) + 1);
    }
  }
  return [...counter.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15)
    .map(([word, count]) => ({ word, count }));
}

function punctuationHabits(messages: string[]): Record<string, number> {
  const marks = ["。", "！", "？", "...", "～", "!", "?"];
  const joined = messages.join("\n");
  const result: Record<string, number> = {};
  for (const mark of marks) {
    const escaped = mark.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const matches = joined.match(new RegExp(escaped, "g"));
    result[mark] = matches?.length ?? 0;
  }
  return result;
}

function signaturePhrases(messages: string[]): string[] {
  const phrases = new Map<string, number>();
  for (const message of messages) {
    if (message.length < 6) {
      continue;
    }
    const trimmed = message.replace(/\s+/g, " ");
    if (trimmed.length <= 20) {
      phrases.set(trimmed, (phrases.get(trimmed) ?? 0) + 1);
      continue;
    }
    for (let i = 0; i + 8 <= trimmed.length; i += 1) {
      const candidate = trimmed.slice(i, i + 8);
      if (/\s/.test(candidate)) {
        continue;
      }
      phrases.set(candidate, (phrases.get(candidate) ?? 0) + 1);
    }
  }
  return [...phrases.entries()]
    .filter(([, count]) => count >= 2)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([phrase]) => phrase);
}

function inferInteraction(messages: string[]): ChatSignal["interaction_hints"] {
  const text = messages.join("\n");
  const directNo = /(不行|不建议|先别|不做|不同意)/.test(text);
  const softNo = /(先看下|再评估|回头聊|等会儿)/.test(text);
  const stress = /(急|马上|先顶住|先处理)/.test(text);
  return {
    likely_agreement_style: /可以|没问题|行/.test(text)
      ? "倾向快速确认并推进"
      : "倾向先补充信息再确认",
    likely_disagreement_style: directNo
      ? "直接否定并给理由"
      : softNo
        ? "婉转延后，不正面说不"
        : "偏谨慎，分场景给出保留意见",
    likely_stress_reply: stress
      ? "高压下先保交付，再解释细节"
      : "高压下更倾向先澄清边界再接任务",
  };
}

export function parseChatFile(inputPath: string, targetName?: string): ChatSignal {
  if (!fs.existsSync(inputPath)) {
    throw new Error(
      [
        `找不到聊天文件：${inputPath}`,
        "请检查输入路径是否正确。",
        "示例：--input ./materials/chat.txt",
      ].join("\n"),
    );
  }
  const raw = fs.readFileSync(inputPath, "utf-8");
  const lines = splitMessages(raw);
  const filtered =
    targetName && targetName.trim()
      ? lines.filter((line) => line.includes(targetName))
      : lines;
  const messages = filtered.length > 0 ? filtered : lines;
  const avgLength =
    messages.length === 0
      ? 0
      : Number(
          (
            messages.reduce((sum, item) => sum + item.length, 0) / messages.length
          ).toFixed(1),
        );

  const rhythm: ChatSignal["summary"]["rhythm"] =
    avgLength < 18 ? "短句快节奏" : avgLength < 40 ? "中等节奏" : "长句慢节奏";

  return {
    generated_at: new Date().toISOString(),
    source_path: inputPath,
    target_name: targetName,
    summary: {
      line_count: raw.split(/\r?\n/).length,
      message_count: messages.length,
      avg_message_length: avgLength,
      rhythm,
    },
    vocabulary: {
      top_words: topWords(messages),
      signature_phrases: signaturePhrases(messages),
      punctuation_habits: punctuationHabits(messages),
    },
    interaction_hints: inferInteraction(messages),
  };
}

function main(): void {
  const args = parseCliArgs(process.argv);
  const input = args.input ?? "";
  if (!input) {
    throw new Error(
      [
        "缺少聊天输入文件。",
        "请提供 --input。",
        "示例：--input ./materials/chat.txt --output ./chat.json",
      ].join("\n"),
    );
  }
  const output = args.output ?? "";
  if (!output) {
    throw new Error(
      [
        "缺少输出路径。",
        "请提供 --output。",
        "示例：--input ./materials/chat.txt --output ./chat.json",
      ].join("\n"),
    );
  }
  const parsed = parseChatFile(input, args.target);
  ensureDir(path.dirname(output));
  writeJson(output, parsed);
  process.stdout.write(
    `聊天解析完成：${parsed.summary.message_count} 条消息，节奏 ${parsed.summary.rhythm}。\n`,
  );
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
