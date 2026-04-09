import { bumpVersion, nowIso, parseCliArgs, writeJson } from "../utils/_shared.js";

export type Gender = "男" | "女" | "其他" | "未知";

export interface BirthInfo {
  date: string;
  time?: string;
  location: string;
  calendar_type?: "solar" | "lunar";
}

export interface SourceStats {
  chat_count: number;
  text_count: number;
  correction_count: number;
}

export interface SourceLedgerItem {
  id: string;
  type: "chat" | "text" | "url" | "manual";
  ref: string;
  quality: "high" | "medium" | "low";
  created_at: string;
}

export interface PersonaMeta {
  name: string;
  slug: string;
  gender: Gender;
  relation?: string;
  preferred_language?: "auto" | "zh" | "en";
  relationships?: string[];
  active_relationships?: string[];
  created_at: string;
  updated_at: string;
  version: string;
  birth: BirthInfo;
  source_stats: SourceStats;
  source_ledger?: SourceLedgerItem[];
  corrections_count: number;
  command_history: string[];
  accuracy_mode: "full_chart" | "missing_time_six_pillars";
}

export function createInitialMeta(input: {
  name: string;
  slug: string;
  gender: Gender;
  relation?: string;
  preferredLanguage?: "auto" | "zh" | "en";
  relationships?: string[];
  activeRelationships?: string[];
  birth: BirthInfo;
  command: string;
  accuracyMode: PersonaMeta["accuracy_mode"];
}): PersonaMeta {
  const now = nowIso();
  const normalizedRelationships = (input.relationships ?? [input.relation ?? "未指定关系"])
    .map((x) => x.trim())
    .filter(Boolean);
  const activeRelationships =
    (input.activeRelationships ?? normalizedRelationships)
      .map((x) => x.trim())
      .filter(Boolean);
  return {
    name: input.name,
    slug: input.slug,
    gender: input.gender,
    relation: input.relation,
    preferred_language: input.preferredLanguage ?? "auto",
    relationships: normalizedRelationships.length > 0 ? normalizedRelationships : ["未指定关系"],
    active_relationships: activeRelationships.length > 0 ? activeRelationships : ["未指定关系"],
    created_at: now,
    updated_at: now,
    version: "v1",
    birth: input.birth,
    source_stats: {
      chat_count: 0,
      text_count: 0,
      correction_count: 0,
    },
    source_ledger: [],
    corrections_count: 0,
    command_history: [input.command],
    accuracy_mode: input.accuracyMode,
  };
}

export function updateMeta(
  current: PersonaMeta,
  input: {
    command: string;
    incrementCorrections?: number;
    incrementChatSources?: number;
    incrementTextSources?: number;
    accuracyMode?: PersonaMeta["accuracy_mode"];
    relationships?: string[];
    activeRelationships?: string[];
    appendLedger?: SourceLedgerItem[];
    preferredLanguage?: "auto" | "zh" | "en";
  },
): PersonaMeta {
  const next = { ...current };
  next.updated_at = nowIso();
  next.version = bumpVersion(current.version);
  next.corrections_count =
    current.corrections_count + (input.incrementCorrections ?? 0);
  next.source_stats = {
    chat_count: current.source_stats.chat_count + (input.incrementChatSources ?? 0),
    text_count: current.source_stats.text_count + (input.incrementTextSources ?? 0),
    correction_count:
      current.source_stats.correction_count + (input.incrementCorrections ?? 0),
  };
  next.command_history = [...current.command_history, input.command];
  if (input.relationships && input.relationships.length > 0) {
    next.relationships = input.relationships;
    next.relation = input.relationships[0];
  }
  if (input.activeRelationships && input.activeRelationships.length > 0) {
    next.active_relationships = input.activeRelationships;
  }
  if (input.appendLedger && input.appendLedger.length > 0) {
    next.source_ledger = [...(current.source_ledger ?? []), ...input.appendLedger];
  } else if (!next.source_ledger) {
    next.source_ledger = [];
  }
  if (input.accuracyMode) {
    next.accuracy_mode = input.accuracyMode;
  }
  if (input.preferredLanguage) {
    next.preferred_language = input.preferredLanguage;
  }
  return next;
}

function main(): void {
  const args = parseCliArgs(process.argv);
  const action = args.action;

  if (!action || !["init", "update"].includes(action)) {
    throw new Error(
      [
        "缺少或不支持的动作参数。",
        "可用：--action init 或 --action update",
        "示例：--action init --output ./meta.json ...",
      ].join("\n"),
    );
  }

  const output = args.output;
  if (!output) {
    throw new Error(
      [
        "缺少输出路径。",
        "请提供 --output。",
        "示例：--action init --output ./meta.json ...",
      ].join("\n"),
    );
  }

  if (action === "init") {
    const name = args.name ?? "";
    const slug = args.slug ?? "";
    const gender = (args.gender as Gender) ?? "未知";
    const date = args["birth-date"] ?? "";
    const location = args["birth-location"] ?? "";
    if (!name || !slug || !date || !location) {
      throw new Error(
        [
          "初始化元信息失败，必填字段缺失。",
          "请确保包含 name、slug、birth-date、birth-location。",
          "示例：--name 张三 --slug zhang-san --birth-date 1990-01-01 --birth-location 北京",
        ].join("\n"),
      );
    }
    const meta = createInitialMeta({
      name,
      slug,
      gender,
      relation: args.relation,
      preferredLanguage:
        args.lang === "zh" || args.lang === "en" || args.lang === "auto"
          ? (args.lang as "zh" | "en" | "auto")
          : "auto",
      birth: {
        date,
        time: args["birth-time"],
        location,
        calendar_type: (args.calendar as "solar" | "lunar") ?? "solar",
      },
      command: "/create-bazi-persona",
      accuracyMode:
        args["accuracy-mode"] === "missing_time_six_pillars"
          ? "missing_time_six_pillars"
          : "full_chart",
    });
    writeJson(output, meta);
    process.stdout.write(`已初始化 meta.json：${output}\n`);
    return;
  }

  const raw = args.meta;
  if (!raw) {
    throw new Error(
      [
        "更新元信息失败，缺少 --meta。",
        "请传入当前 meta.json 的 JSON 字符串。",
      ].join("\n"),
    );
  }
  const current = JSON.parse(raw) as PersonaMeta;
  const next = updateMeta(current, {
    command: args.command ?? "/update-bazi-persona",
    incrementCorrections: Number.parseInt(args["inc-correction"] ?? "0", 10),
    incrementChatSources: Number.parseInt(args["inc-chat"] ?? "0", 10),
    incrementTextSources: Number.parseInt(args["inc-text"] ?? "0", 10),
    accuracyMode: args["accuracy-mode"] as PersonaMeta["accuracy_mode"] | undefined,
    preferredLanguage:
      args.lang === "zh" || args.lang === "en" || args.lang === "auto"
        ? (args.lang as "zh" | "en" | "auto")
        : undefined,
  });
  writeJson(output, next);
  process.stdout.write(`已更新 meta.json：${output}\n`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
