import { nowIso } from "../utils/_shared.js";

export type MemoryType = "correction" | "style_pattern" | "behavior_fact" | "context_note";
export type MemoryWeight = "high" | "medium" | "low";

export interface MemoryEvent {
  id: string;
  created_at: string;
  type: MemoryType;
  weight: MemoryWeight;
  source: "user_correction" | "chat" | "text" | "manual";
  content: string;
}

export interface RuntimeMemoryIndex {
  version: "v2";
  facts: string[];
  styles: string[];
  relations: string[];
  preferences: string[];
  updated_at: string;
}

export interface RuntimeMemoryPin {
  id: string;
  content: string;
  type: MemoryType;
  pinned_at: string;
}

export function createMemoryEvent(input: {
  type: MemoryType;
  content: string;
  source?: MemoryEvent["source"];
  weight?: MemoryWeight;
}): MemoryEvent {
  const createdAt = nowIso();
  const safeType: MemoryType = ["correction", "style_pattern", "behavior_fact", "context_note"].includes(
    input.type,
  )
    ? input.type
    : "context_note";
  const safeWeight: MemoryWeight = ["high", "medium", "low"].includes(input.weight ?? "")
    ? (input.weight as MemoryWeight)
    : safeType === "correction"
      ? "high"
      : "medium";
  return {
    id: `${createdAt}_${Math.random().toString(36).slice(2, 8)}`,
    created_at: createdAt,
    type: safeType,
    weight: safeWeight,
    source: input.source ?? (safeType === "correction" ? "user_correction" : "manual"),
    content: input.content.trim(),
  };
}

export function parseMemoryLog(raw: string): MemoryEvent[] {
  if (!raw.trim()) {
    return [];
  }
  return raw
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      try {
        return JSON.parse(line) as MemoryEvent;
      } catch {
        return undefined;
      }
    })
    .filter((item): item is MemoryEvent => Boolean(item?.content));
}

export function serializeMemoryLog(memory: MemoryEvent[]): string {
  if (memory.length === 0) {
    return "";
  }
  return `${memory.map((event) => JSON.stringify(event)).join("\n")}\n`;
}

export function splitCsv(value?: string): string[] {
  if (!value) {
    return [];
  }
  return value
    .split(/[,\n，]/)
    .map((x) => x.trim())
    .filter(Boolean);
}

export function mergeUnique(base: string[], incoming: string[]): string[] {
  return Array.from(new Set([...base, ...incoming].map((x) => x.trim()).filter(Boolean)));
}

export function detectMemoryFactsFromText(content: string): string[] {
  const lines = content
    .split(/\n+/)
    .map((x) => x.trim())
    .filter(Boolean);
  return lines
    .filter((line) =>
      /曾|以前|小时候|毕业|工作|结婚|分手|创业|生病|住在|来自|喜欢|讨厌|used to|before|childhood|graduated|worked|married|broke up|startup|illness|live in|from|prefer|hate|like/i.test(
        line,
      ),
    )
    .slice(0, 20);
}

export function splitNarrativeSentences(text: string): string[] {
  return text
    .split(/[\n。！？!?；;，,、]+/)
    .map((x) => x.trim())
    .map((x) => x.replace(/^[-*•\d.)\s]+/, "").trim())
    .filter((x) => x.length >= 2)
    .slice(0, 40);
}

export function classifyNarrativeMemory(content: string): {
  type: MemoryType;
  weight: MemoryWeight;
  source: MemoryEvent["source"];
} {
  if (
    /(纠正|更正|不是|并非|请改|不要再说|其实是|correction|actually|not\s+true|wrong)/i.test(
      content,
    )
  ) {
    return {
      type: "correction",
      weight: "high",
      source: "user_correction",
    };
  }
  if (
    /(毕业|学历|学校|清华|北大|家里|家庭|有钱|资产|收入|漂亮|颜值|外貌|工作|职业|创业|婚|恋|分手|孩子|来自|住在|性格|习惯|偏好|讨厌|喜欢|graduated|wealthy|rich|attractive|job|career|startup|married|divorce|relationship|from|live)/i.test(
      content,
    )
  ) {
    return {
      type: "behavior_fact",
      weight: "high",
      source: "manual",
    };
  }
  return {
    type: "context_note",
    weight: "medium",
    source: "manual",
  };
}

export function buildNarrativeMemoryEventsFromMessage(
  message: string,
  source: MemoryEvent["source"] = "chat",
): MemoryEvent[] {
  const snippets = splitNarrativeSentences(message).slice(0, 8);
  const events: MemoryEvent[] = [];
  for (const snippet of snippets) {
    const normalized = snippet.replace(/\s+/g, " ").trim();
    if (!normalized) {
      continue;
    }
    const classified = classifyNarrativeMemory(normalized);
    if (classified.type !== "behavior_fact" && classified.type !== "correction") {
      continue;
    }
    events.push(
      createMemoryEvent({
        type: classified.type,
        content: normalized,
        weight: classified.weight,
        source: classified.type === "correction" ? "user_correction" : source,
      }),
    );
  }
  return events;
}

export function appendUniqueMemoryEvents(target: MemoryEvent[], incoming: MemoryEvent[]): {
  merged: MemoryEvent[];
  added: MemoryEvent[];
} {
  const seen = new Set(target.map((x) => `${x.type}::${x.content}`));
  const added: MemoryEvent[] = [];
  const merged = [...target];
  for (const event of incoming) {
    const key = `${event.type}::${event.content}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    merged.push(event);
    added.push(event);
  }
  return { merged, added };
}

export function pickRealityFactsFromMemory(memory: MemoryEvent[]): string[] {
  return Array.from(
    new Set(
      memory
        .filter(
          (x) =>
            (x.type === "behavior_fact" || x.type === "correction") &&
            (x.weight === "high" || x.weight === "medium"),
        )
        .map((x) => x.content.trim())
        .filter(Boolean),
    ),
  ).slice(-10);
}

export function buildMemoryIndex(memory: MemoryEvent[], activeRelations: string[]): RuntimeMemoryIndex {
  const facts = memory
    .filter((x) => x.type === "behavior_fact" || x.type === "correction")
    .slice(-120)
    .map((x) => x.content);
  const styles = memory
    .filter((x) => x.type === "style_pattern")
    .slice(-80)
    .map((x) => x.content);
  const preferences = memory
    .filter((x) => x.type === "context_note")
    .slice(-80)
    .map((x) => x.content);
  return {
    version: "v2",
    facts: Array.from(new Set(facts)).slice(-80),
    styles: Array.from(new Set(styles)).slice(-40),
    relations: activeRelations,
    preferences: Array.from(new Set(preferences)).slice(-40),
    updated_at: nowIso(),
  };
}

export function extractMemoryFromLegacyCorrections(corrections: string[]): MemoryEvent[] {
  return corrections
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) =>
      createMemoryEvent({
        type: "correction",
        content: item,
        source: "user_correction",
        weight: "high",
      }))
    .sort((a, b) => a.created_at.localeCompare(b.created_at));
}

export function parseMemoryType(value?: string): MemoryType {
  if (!value) {
    return "context_note";
  }
  const normalized = value.trim().toLowerCase();
  if (normalized === "correction") {
    return "correction";
  }
  if (normalized === "style_pattern") {
    return "style_pattern";
  }
  if (normalized === "behavior_fact") {
    return "behavior_fact";
  }
  return "context_note";
}

export function parseMemoryWeight(value?: string): MemoryWeight {
  if (!value) {
    return "medium";
  }
  const normalized = value.trim().toLowerCase();
  if (normalized === "high") {
    return "high";
  }
  if (normalized === "low") {
    return "low";
  }
  return "medium";
}
