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
import { regenerateSnapshot, renderPersonaSkill } from "./persona-engine.js";

function normalizeLoadedRecord(record: PersonaRecord): PersonaRecord {
  const legacySnapshot = record.snapshot as PersonaRecord["snapshot"] & {
    persona?: string;
    state?: string;
  };
  if (legacySnapshot.reference_profile && legacySnapshot.reference_state) {
    return record;
  }
  return {
    ...record,
    snapshot: {
      ...record.snapshot,
      reference_profile: legacySnapshot.reference_profile ?? legacySnapshot.persona ?? "",
      reference_state: legacySnapshot.reference_state ?? legacySnapshot.state ?? "",
    },
  };
}

export function resolvePersonaBaseDir(explicit?: string): string {
  return explicit ?? process.env.BAZI_PERSONA_HOME ?? DEFAULT_PERSONA_DIR;
}

function readJsonl<T>(filePath: string): T[] {
  const raw = readUtf8IfExists(filePath).trim();
  if (!raw) {
    return [];
  }
  return raw
    .split("\n")
    .map((line) => {
      try {
        return JSON.parse(line) as T;
      } catch {
        return undefined;
      }
    })
    .filter((item): item is T => Boolean(item));
}

function appendJsonl(filePath: string, payload: unknown): void {
  ensureDir(path.dirname(filePath));
  fs.appendFileSync(filePath, `${JSON.stringify(payload)}\n`, "utf8");
}

function parseMemoryEntry(entry: Record<string, unknown>): PersonaMemoryEntry | undefined {
  const content = typeof entry.content === "string" ? entry.content.trim() : "";
  if (!content) {
    return undefined;
  }
  const type = typeof entry.type === "string" ? entry.type : "fact";
  return {
    type:
      type === "correction" || type === "style_pattern" || type === "context_note"
        ? type === "style_pattern"
          ? "style"
          : type === "context_note"
            ? "context"
            : "correction"
        : "fact",
    content,
    source: typeof entry.source === "string" ? entry.source : "legacy",
    created_at: typeof entry.created_at === "string" ? entry.created_at : nowIso(),
  };
}

function normalizeLegacyGender(value: unknown): "男" | "女" {
  if (value === "男" || value === "male") {
    return "男";
  }
  return "女";
}

function buildRecordFromLegacy(params: {
  dir: string;
  promptPack: PromptPack;
  knowledge: PersonaKnowledge;
}): PersonaRecord | undefined {
  const runtimeDir = path.join(params.dir, ".runtime");
  const metaPath = path.join(runtimeDir, "meta.json");
  const evidencePath = path.join(runtimeDir, "bazi.evidence.json");
  if (!fileExists(metaPath) || !fileExists(evidencePath)) {
    return undefined;
  }

  const meta = readJson<Record<string, unknown>>(metaPath);
  const evidence = readJson<{ chart: PersonaRecord["chart"] }>(evidencePath);
  const memoryNormal = readJsonl<Record<string, unknown>>(path.join(runtimeDir, "memory.normal.log.jsonl"));
  const memoryFallback = readJsonl<Record<string, unknown>>(path.join(runtimeDir, "memory.log.jsonl"));
  const legacyMemory = (memoryNormal.length > 0 ? memoryNormal : memoryFallback)
    .map(parseMemoryEntry)
    .filter((item): item is PersonaMemoryEntry => Boolean(item));

  const slug = typeof meta.slug === "string" ? meta.slug : path.basename(params.dir);
  const relationships = Array.isArray(meta.relationships)
    ? meta.relationships.filter((item): item is string => typeof item === "string")
    : [typeof meta.relation === "string" ? meta.relation : ""].filter(Boolean);
  const activeRelationships = Array.isArray(meta.active_relationships)
    ? meta.active_relationships.filter((item): item is string => typeof item === "string")
    : relationships;
  const preferredLanguage: "auto" | SupportedLanguage =
    meta.preferred_language === "zh" || meta.preferred_language === "en" || meta.preferred_language === "ja" || meta.preferred_language === "ko"
      ? meta.preferred_language
      : "auto";

  const baseRecord = {
    schema_version: "3.0.0" as const,
    slug,
    profile: {
      name: typeof meta.name === "string" ? meta.name : slug,
      gender: normalizeLegacyGender(meta.gender),
      birth_date: typeof (meta.birth as Record<string, unknown> | undefined)?.date === "string"
        ? ((meta.birth as Record<string, unknown>).date as string)
        : evidence.chart.birth_input.date,
      birth_time: typeof (meta.birth as Record<string, unknown> | undefined)?.time === "string"
        ? ((meta.birth as Record<string, unknown>).time as string)
        : evidence.chart.birth_input.provided_time,
      birth_location: typeof (meta.birth as Record<string, unknown> | undefined)?.location === "string"
        ? ((meta.birth as Record<string, unknown>).location as string)
        : evidence.chart.birth_input.location || undefined,
      calendar_type: evidence.chart.birth_input.calendar_type,
    },
    relationships,
    active_relationships: activeRelationships,
    preferences: {
      preferred_language: preferredLanguage,
      analysis_mode: "normal" as const,
    },
    chart: evidence.chart,
    memory: legacyMemory,
  };

  const snapshot = regenerateSnapshot({
    record: baseRecord,
    promptPack: params.promptPack,
    knowledge: params.knowledge,
  });

  return {
    ...baseRecord,
    snapshot,
    created_at: typeof meta.created_at === "string" ? meta.created_at : nowIso(),
    updated_at: typeof meta.updated_at === "string" ? meta.updated_at : snapshot.generated_at,
  };
}

function purgeLegacyArtifacts(dir: string): void {
  for (const fileName of ["SKILL.md", "meta.json", "chart.json"]) {
    const target = path.join(dir, fileName);
    if (fileExists(target)) {
      fs.rmSync(target, { force: true });
    }
  }
  const runtimeDir = path.join(dir, ".runtime");
  if (fileExists(runtimeDir)) {
    fs.rmSync(runtimeDir, { recursive: true, force: true });
  }
}

export function migrateLegacyPersonas(params: {
  baseDir?: string;
  promptPack: PromptPack;
  knowledge: PersonaKnowledge;
}): void {
  const baseDir = resolvePersonaBaseDir(params.baseDir);
  ensureDir(baseDir);
  for (const entry of fs.readdirSync(baseDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) {
      continue;
    }
    const dir = path.join(baseDir, entry.name);
    const personaPath = path.join(dir, "persona.json");
    if (fileExists(personaPath)) {
      continue;
    }
    const migrated = buildRecordFromLegacy({
      dir,
      promptPack: params.promptPack,
      knowledge: params.knowledge,
    });
    if (!migrated) {
      continue;
    }
    purgeLegacyArtifacts(dir);
    savePersona(migrated, baseDir);
  }
}

export function listPersonas(baseDir = DEFAULT_PERSONA_DIR): PersonaRef[] {
  baseDir = resolvePersonaBaseDir(baseDir);
  ensureDir(baseDir);
  return fs.readdirSync(baseDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => path.join(baseDir, entry.name, "persona.json"))
    .filter((filePath) => fileExists(filePath))
    .map((filePath) => readJson<PersonaRecord>(filePath))
    .map((record) => ({
      slug: record.slug,
      name: record.profile.name,
      updated_at: record.updated_at,
    }))
    .sort((a, b) => b.updated_at.localeCompare(a.updated_at));
}

export function loadPersona(slug: string, baseDir = DEFAULT_PERSONA_DIR): PersonaRecord {
  baseDir = resolvePersonaBaseDir(baseDir);
  const filePath = path.join(baseDir, slug, "persona.json");
  if (!fileExists(filePath)) {
    throw new Error(`Persona not found: ${slug}`);
  }
  return normalizeLoadedRecord(readJson<PersonaRecord>(filePath));
}

export function savePersona(record: PersonaRecord, baseDir = DEFAULT_PERSONA_DIR): PersonaRecord {
  baseDir = resolvePersonaBaseDir(baseDir);
  const dir = path.join(baseDir, record.slug);
  ensureDir(dir);
  writeJson(path.join(dir, "persona.json"), record);
  writeUtf8(path.join(dir, "SKILL.md"), `${renderPersonaSkill(record)}\n`);
  return record;
}

export function appendConversationEntry(
  slug: string,
  entry: PersonaConversationEntry,
  baseDir = DEFAULT_PERSONA_DIR,
): void {
  baseDir = resolvePersonaBaseDir(baseDir);
  appendJsonl(path.join(baseDir, slug, "conversations.jsonl"), entry);
}

export function loadConversationEntries(slug: string, baseDir = DEFAULT_PERSONA_DIR): PersonaConversationEntry[] {
  baseDir = resolvePersonaBaseDir(baseDir);
  return readJsonl<PersonaConversationEntry>(path.join(baseDir, slug, "conversations.jsonl"));
}

export function deletePersona(slug: string, baseDir = DEFAULT_PERSONA_DIR): boolean {
  baseDir = resolvePersonaBaseDir(baseDir);
  const dir = path.join(baseDir, slug);
  if (!fileExists(path.join(dir, "persona.json"))) {
    return false;
  }
  fs.rmSync(dir, { recursive: true, force: true });
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
    schema_version: "3.0.0" as const,
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
  return {
    ...baseRecord,
    snapshot,
    created_at: createdAt,
    updated_at: snapshot.generated_at,
  };
}
