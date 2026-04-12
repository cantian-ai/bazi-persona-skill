import fs from "node:fs";
import path from "node:path";
import {
  ensureDir,
  fileExists,
  nowIso,
  readJson,
  readUtf8IfExists,
  toSlug,
  writeJson,
  writeUtf8,
} from "../shared/fs.js";
import { DEFAULT_PERSONA_DIR } from "./resources.js";
import type {
  PersonaConversationEntry,
  PersonaKnowledge,
  PersonaMemoryEntry,
  PersonaRecord,
  PersonaRef,
  PromptPack,
  SupportedLanguage,
} from "./types.js";
import { regenerateSnapshot, renderPersonaMarkdown } from "./persona-engine.js";

const FILE_NAMES = {
  persona: "persona.md",
  bazi: "bazi_data.json",
  memory: "memory.json",
  history: "history.json",
} as const;

type BaziDataRecord = Omit<PersonaRecord, "memory" | "persona_markdown">;

function personaDir(baseDir: string, slug: string): string {
  return path.join(baseDir, slug);
}

function memoryFromUnknown(payload: unknown): PersonaMemoryEntry[] {
  if (!Array.isArray(payload)) {
    return [];
  }
  const output: PersonaMemoryEntry[] = [];
  for (const item of payload) {
    if (!item || typeof item !== "object") {
      continue;
    }
    const source = item as Record<string, unknown>;
    const content = typeof source.content === "string" ? source.content.trim() : "";
    if (!content) {
      continue;
    }
    const memoryType = source.type;
    const type = memoryType === "correction" || memoryType === "style" || memoryType === "context"
      ? memoryType
      : "fact";
    const normalized: PersonaMemoryEntry = {
      type,
      content,
      source: typeof source.source === "string" ? source.source : "unknown",
      created_at: typeof source.created_at === "string" ? source.created_at : nowIso(),
    };
    if (typeof source.memory_id === "string") {
      normalized.memory_id = source.memory_id;
    }
    if (typeof source.key === "string") {
      normalized.key = source.key;
    }
    if (typeof source.time_anchor === "string") {
      normalized.time_anchor = source.time_anchor;
    }
    if (typeof source.importance === "number") {
      normalized.importance = source.importance;
    }
    if (typeof source.confidence === "number") {
      normalized.confidence = source.confidence;
    }
    if (typeof source.updated_at === "string") {
      normalized.updated_at = source.updated_at;
    }
    output.push(normalized);
  }
  return output;
}

function historyFromUnknown(payload: unknown): PersonaConversationEntry[] {
  if (!Array.isArray(payload)) {
    return [];
  }
  const output: PersonaConversationEntry[] = [];
  for (const item of payload) {
    if (!item || typeof item !== "object") {
      continue;
    }
    const source = item as Record<string, unknown>;
    if (typeof source.content !== "string" || !source.content.trim()) {
      continue;
    }
    const role = source.role === "assistant" ? "assistant" : "user";
    const mode = source.mode === "analysis" || source.mode === "update" || source.mode === "create"
      ? source.mode
      : "chat";
    const normalized: PersonaConversationEntry = {
      session_id: typeof source.session_id === "string" ? source.session_id : `session-${Date.now()}`,
      role,
      content: source.content,
      mode,
      created_at: typeof source.created_at === "string" ? source.created_at : nowIso(),
    };
    if (typeof source.id === "string") {
      normalized.id = source.id;
    }
    if (source.source_type === "text" || source.source_type === "json" || source.source_type === "ocr_text" || source.source_type === "chat") {
      normalized.source_type = source.source_type;
    }
    output.push(normalized);
  }
  return output;
}

function normalizeLoadedRecord(record: Partial<PersonaRecord> & {
  slug: string;
  profile: PersonaRecord["profile"];
  chart: PersonaRecord["chart"];
  snapshot: PersonaRecord["snapshot"];
  created_at: string;
  updated_at: string;
}): PersonaRecord {
  return {
    schema_version: "4.0.0",
    slug: record.slug,
    profile: record.profile,
    relationships: Array.isArray(record.relationships) ? record.relationships : [],
    active_relationships: Array.isArray(record.active_relationships) ? record.active_relationships : [],
    preferences: {
      preferred_language:
        record.preferences?.preferred_language === "zh" ||
        record.preferences?.preferred_language === "en" ||
        record.preferences?.preferred_language === "ja" ||
        record.preferences?.preferred_language === "ko"
          ? record.preferences.preferred_language
          : "auto",
      analysis_mode: record.preferences?.analysis_mode === "cheatsheet" ? "cheatsheet" : "normal",
    },
    chart: record.chart,
    memory: Array.isArray(record.memory) ? record.memory : [],
    snapshot: record.snapshot,
    persona_markdown: typeof record.persona_markdown === "string" ? record.persona_markdown : undefined,
    created_at: record.created_at,
    updated_at: record.updated_at,
  };
}

export function resolvePersonaBaseDir(explicit?: string): string {
  return explicit ?? process.env.BAZI_PERSONA_HOME ?? DEFAULT_PERSONA_DIR;
}

export function getPersonaFilePaths(slug: string, baseDir = DEFAULT_PERSONA_DIR): {
  dir: string;
  persona_md: string;
  bazi_data_json: string;
  memory_json: string;
  history_json: string;
} {
  const resolvedBaseDir = resolvePersonaBaseDir(baseDir);
  const dir = personaDir(resolvedBaseDir, slug);
  return {
    dir,
    persona_md: path.join(dir, FILE_NAMES.persona),
    bazi_data_json: path.join(dir, FILE_NAMES.bazi),
    memory_json: path.join(dir, FILE_NAMES.memory),
    history_json: path.join(dir, FILE_NAMES.history),
  };
}

export function listPersonas(baseDir = DEFAULT_PERSONA_DIR): PersonaRef[] {
  const resolvedBaseDir = resolvePersonaBaseDir(baseDir);
  ensureDir(resolvedBaseDir);

  return fs.readdirSync(resolvedBaseDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => path.join(resolvedBaseDir, entry.name, FILE_NAMES.bazi))
    .filter((baziPath) => fileExists(baziPath))
    .map((baziPath) => readJson<BaziDataRecord>(baziPath))
    .map((record) => ({
      slug: record.slug,
      name: record.profile.name,
      updated_at: record.updated_at,
    }))
    .sort((a, b) => b.updated_at.localeCompare(a.updated_at));
}

export function searchPersonas(query: string, baseDir = DEFAULT_PERSONA_DIR): PersonaRef[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) {
    return listPersonas(baseDir);
  }
  return listPersonas(baseDir).filter((item) =>
    item.slug.toLowerCase().includes(normalized) || item.name.toLowerCase().includes(normalized),
  );
}

export function loadPersona(slug: string, baseDir = DEFAULT_PERSONA_DIR): PersonaRecord {
  const paths = getPersonaFilePaths(slug, baseDir);
  if (!fileExists(paths.bazi_data_json)) {
    throw new Error(`Persona not found: ${slug}`);
  }

  const baziData = readJson<BaziDataRecord>(paths.bazi_data_json);
  const memory = fileExists(paths.memory_json)
    ? memoryFromUnknown(readJson<unknown>(paths.memory_json))
    : [];
  const personaMarkdown = readUtf8IfExists(paths.persona_md).trim();

  return normalizeLoadedRecord({
    ...baziData,
    memory,
    persona_markdown: personaMarkdown || undefined,
  });
}

export function savePersona(record: PersonaRecord, baseDir = DEFAULT_PERSONA_DIR): PersonaRecord {
  const resolvedBaseDir = resolvePersonaBaseDir(baseDir);
  const normalized = normalizeLoadedRecord(record);
  const paths = getPersonaFilePaths(normalized.slug, resolvedBaseDir);
  ensureDir(paths.dir);

  const baziPayload: BaziDataRecord = {
    schema_version: normalized.schema_version,
    slug: normalized.slug,
    profile: normalized.profile,
    relationships: normalized.relationships,
    active_relationships: normalized.active_relationships,
    preferences: normalized.preferences,
    chart: normalized.chart,
    snapshot: normalized.snapshot,
    created_at: normalized.created_at,
    updated_at: normalized.updated_at,
  };

  writeJson(paths.bazi_data_json, baziPayload);
  writeJson(paths.memory_json, normalized.memory);
  if (!fileExists(paths.history_json)) {
    writeJson(paths.history_json, []);
  }

  const personaMarkdown = normalized.persona_markdown?.trim() || renderPersonaMarkdown(normalized);
  writeUtf8(paths.persona_md, `${personaMarkdown.trim()}\n`);

  return {
    ...normalized,
    persona_markdown: personaMarkdown.trim(),
  };
}

export function loadHistoryEntries(slug: string, baseDir = DEFAULT_PERSONA_DIR): PersonaConversationEntry[] {
  const paths = getPersonaFilePaths(slug, baseDir);
  if (!fileExists(paths.history_json)) {
    return [];
  }
  return historyFromUnknown(readJson<unknown>(paths.history_json));
}

export function appendHistoryEntry(
  slug: string,
  entry: PersonaConversationEntry,
  baseDir = DEFAULT_PERSONA_DIR,
): PersonaConversationEntry[] {
  const paths = getPersonaFilePaths(slug, baseDir);
  const entries = loadHistoryEntries(slug, baseDir);
  entries.push(entry);
  writeJson(paths.history_json, entries);
  return entries;
}

export function deletePersona(slug: string, baseDir = DEFAULT_PERSONA_DIR): boolean {
  const paths = getPersonaFilePaths(slug, baseDir);
  if (!fileExists(paths.bazi_data_json)) {
    return false;
  }
  fs.rmSync(paths.dir, { recursive: true, force: true });
  return true;
}

export function createPersonaRecord(params: {
  name: string;
  gender: "男" | "女";
  birth_date: string;
  birth_time?: string;
  birth_location?: string;
  calendar_type: "solar" | "lunar";
  relation?: string;
  chart: PersonaRecord["chart"];
  memory: PersonaMemoryEntry[];
  promptPack: PromptPack;
  knowledge: PersonaKnowledge;
  slug?: string;
  preferred_language?: "auto" | SupportedLanguage;
}): PersonaRecord {
  const slug = toSlug(params.slug ?? params.name);
  const createdAt = nowIso();
  const baseRecord = {
    schema_version: "4.0.0" as const,
    slug,
    profile: {
      name: params.name,
      gender: params.gender,
      birth_date: params.birth_date,
      birth_time: params.birth_time,
      birth_location: params.birth_location,
      calendar_type: params.calendar_type,
    },
    relationships: params.relation ? [params.relation] : [],
    active_relationships: params.relation ? [params.relation] : [],
    preferences: {
      preferred_language: params.preferred_language ?? "auto",
      analysis_mode: "normal" as const,
    },
    chart: params.chart,
    memory: params.memory,
  };

  const snapshot = regenerateSnapshot({
    record: baseRecord,
    promptPack: params.promptPack,
    knowledge: params.knowledge,
  });

  const assembled: PersonaRecord = {
    ...baseRecord,
    snapshot,
    created_at: createdAt,
    updated_at: snapshot.generated_at,
  };

  assembled.persona_markdown = renderPersonaMarkdown(assembled);
  return assembled;
}
