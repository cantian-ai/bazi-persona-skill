import fs from "node:fs";
import path from "node:path";
import {
  ensureDir,
  nowIso,
  parseCliArgs,
  readJson,
  readUtf8IfExists,
  timestampTag,
  writeUtf8,
  writeJson,
} from "../utils/_shared.js";
import type { PersonaMeta } from "./meta_updater.js";

export interface VersionSummary {
  version: string;
  archived_at: string;
  files: string[];
}

const CORE_FILES = ["SKILL.md"];
const CORE_DIRS = [".runtime"];

const INTERNAL_DATA_HEADING = "## Internal Data (System)";

function parseSkillInternalMeta(baseSkill: string): PersonaMeta | undefined {
  const pattern = new RegExp(
    `${INTERNAL_DATA_HEADING.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*\\n\\\`\\\`\\\`json\\n([\\s\\S]*?)\\n\\\`\\\`\\\``,
  );
  const raw = pattern.exec(baseSkill)?.[1];
  if (!raw) {
    return undefined;
  }
  try {
    const parsed = JSON.parse(raw) as { meta?: PersonaMeta; schema?: string };
    if (
      parsed?.schema !== "bazi_persona_single_file_v1" &&
      parsed?.schema !== "bazi_persona_skill_v2"
    ) {
      return undefined;
    }
    return parsed.meta;
  } catch {
    return undefined;
  }
}

function copyDirRecursive(srcDir: string, dstDir: string): void {
  if (!fs.existsSync(srcDir)) {
    return;
  }
  ensureDir(dstDir);
  for (const entry of fs.readdirSync(srcDir, { withFileTypes: true })) {
    const src = path.join(srcDir, entry.name);
    const dst = path.join(dstDir, entry.name);
    if (entry.isDirectory()) {
      copyDirRecursive(src, dst);
      continue;
    }
    if (entry.isFile()) {
      fs.copyFileSync(src, dst);
    }
  }
}

function updateSkillInternalMeta(baseSkill: string, nextMeta: PersonaMeta): string {
  const pattern = new RegExp(
    `(${INTERNAL_DATA_HEADING.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*\\n\\\`\\\`\\\`json\\n)([\\s\\S]*?)(\\n\\\`\\\`\\\`)`,
  );
  const matched = pattern.exec(baseSkill);
  if (!matched) {
    return baseSkill;
  }
  let parsed: { meta?: PersonaMeta; schema?: string; [key: string]: unknown };
  try {
    parsed = JSON.parse(matched[2]) as {
      meta?: PersonaMeta;
      schema?: string;
      [key: string]: unknown;
    };
  } catch {
    return baseSkill;
  }
  parsed.meta = nextMeta;
  const nextJson = JSON.stringify(parsed, null, 2);
  return `${baseSkill.slice(0, matched.index)}${matched[1]}${nextJson}${matched[3]}${baseSkill.slice(matched.index + matched[0].length)}`;
}

function personaDir(baseDir: string, slug: string): string {
  return path.join(baseDir, slug);
}

function versionsDir(baseDir: string, slug: string): string {
  return path.join(personaDir(baseDir, slug), "versions");
}

export function backupPersona(
  baseDir: string,
  slug: string,
  reason: "update" | "rollback" = "update",
): string {
  const dir = personaDir(baseDir, slug);
  if (!fs.existsSync(dir)) {
    throw new Error(
      [
        `找不到人格目录：${dir}`,
        "请先确认 slug 是否正确。",
        "你可以先执行 /list-bazi-personas 查看可用 slug。",
      ].join("\n"),
    );
  }

  const metaPath = path.join(dir, "meta.json");
  const runtimeMetaPath = path.join(dir, ".runtime", "meta.json");
  const skillPath = path.join(dir, "SKILL.md");
  const metaFromSkill = fs.existsSync(skillPath)
    ? parseSkillInternalMeta(readUtf8IfExists(skillPath))
    : undefined;
  const meta = fs.existsSync(runtimeMetaPath)
    ? readJson<PersonaMeta>(runtimeMetaPath)
    : fs.existsSync(metaPath)
    ? readJson<PersonaMeta>(metaPath)
    : (metaFromSkill ??
      ({
        version: "v0",
      } as PersonaMeta));
  const tag = timestampTag();
  const backupName = `${meta.version}_${reason}_${tag}`;
  const target = path.join(versionsDir(baseDir, slug), backupName);
  ensureDir(target);

  for (const fileName of CORE_FILES) {
    const src = path.join(dir, fileName);
    if (fs.existsSync(src)) {
      fs.copyFileSync(src, path.join(target, fileName));
    }
  }
  for (const dirName of CORE_DIRS) {
    const srcDir = path.join(dir, dirName);
    if (fs.existsSync(srcDir)) {
      copyDirRecursive(srcDir, path.join(target, dirName));
    }
  }

  return backupName;
}

export function listPersonaVersions(baseDir: string, slug: string): VersionSummary[] {
  const dir = versionsDir(baseDir, slug);
  if (!fs.existsSync(dir)) {
    return [];
  }
  const entries = fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => {
      const full = path.join(dir, entry.name);
      const stat = fs.statSync(full);
      const files = fs
        .readdirSync(full, { withFileTypes: true })
        .filter((f) => f.isFile())
        .map((f) => f.name);
      return {
        version: entry.name,
        archived_at: new Date(stat.mtime).toISOString(),
        files,
      };
    })
    .sort((a, b) => b.archived_at.localeCompare(a.archived_at));
  return entries;
}

function resolveVersionFolder(baseDir: string, slug: string, requested: string): string {
  const dir = versionsDir(baseDir, slug);
  if (!fs.existsSync(dir)) {
    throw new Error(
      [
        "当前人格还没有历史版本可回滚。",
        "请先执行更新，或检查 slug 是否正确。",
      ].join("\n"),
    );
  }
  const candidates = fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .filter((name) => name === requested || name.startsWith(`${requested}_`));
  if (candidates.length === 0) {
    throw new Error(
      [
        `未找到版本：${requested}`,
        "请先执行 /list-bazi-personas 或 version list 查看可选版本。",
      ].join("\n"),
    );
  }
  candidates.sort();
  return path.join(dir, candidates[candidates.length - 1]);
}

export function rollbackPersona(baseDir: string, slug: string, version: string): string {
  const dir = personaDir(baseDir, slug);
  if (!fs.existsSync(dir)) {
    throw new Error(
      [
        `找不到人格目录：${dir}`,
        "请先确认 slug 是否正确。",
      ].join("\n"),
    );
  }

  const targetVersionFolder = resolveVersionFolder(baseDir, slug, version);
  const rollbackSnapshot = backupPersona(baseDir, slug, "rollback");

  for (const fileName of CORE_FILES) {
    const src = path.join(targetVersionFolder, fileName);
    const dst = path.join(dir, fileName);
    if (fs.existsSync(src)) {
      fs.copyFileSync(src, dst);
    }
  }
  for (const dirName of CORE_DIRS) {
    const srcDir = path.join(targetVersionFolder, dirName);
    const dstDir = path.join(dir, dirName);
    if (fs.existsSync(srcDir)) {
      fs.rmSync(dstDir, { recursive: true, force: true });
      copyDirRecursive(srcDir, dstDir);
    } else if (fs.existsSync(dstDir)) {
      fs.rmSync(dstDir, { recursive: true, force: true });
    }
  }

  const metaPath = path.join(dir, "meta.json");
  if (fs.existsSync(metaPath)) {
    const meta = readJson<PersonaMeta>(metaPath);
    const nextMeta: PersonaMeta = {
      ...meta,
      updated_at: nowIso(),
      command_history: [...meta.command_history, "/bazi-persona-rollback"],
    };
    writeJson(metaPath, nextMeta);
  }
  const skillPath = path.join(dir, "SKILL.md");
  if (fs.existsSync(skillPath)) {
    const skillText = readUtf8IfExists(skillPath);
    const meta = parseSkillInternalMeta(skillText);
    if (meta) {
      const nextMeta: PersonaMeta = {
        ...meta,
        updated_at: nowIso(),
        command_history: [...meta.command_history, "/bazi-persona-rollback"],
      };
      writeUtf8(skillPath, updateSkillInternalMeta(skillText, nextMeta));
    }
  }
  const runtimeMetaPath = path.join(dir, ".runtime", "meta.json");
  if (fs.existsSync(runtimeMetaPath)) {
    const runtimeMeta = readJson<PersonaMeta>(runtimeMetaPath);
    const nextRuntimeMeta: PersonaMeta = {
      ...runtimeMeta,
      updated_at: nowIso(),
      command_history: [...runtimeMeta.command_history, "/bazi-persona-rollback"],
    };
    writeJson(runtimeMetaPath, nextRuntimeMeta);
  }

  return rollbackSnapshot;
}

function printVersions(versions: VersionSummary[]): void {
  if (versions.length === 0) {
    process.stdout.write("暂无历史版本。\n");
    return;
  }
  for (const item of versions) {
    process.stdout.write(
      `${item.version}\n  归档时间: ${item.archived_at}\n  文件: ${item.files.join(", ")}\n`,
    );
  }
}

function main(): void {
  const args = parseCliArgs(process.argv);
  const action = args.action;
  const slug = args.slug ?? "";
  const baseDir = args["base-dir"] ?? "./personas";

  if (!action || !["backup", "list", "rollback"].includes(action)) {
    throw new Error(
      [
        "缺少或不支持的 action。",
        "可用值：backup / list / rollback",
        "示例：使用 /bazi-persona-rollback {slug} {version} 或版本列表能力。",
      ].join("\n"),
    );
  }
  if (!slug) {
    throw new Error(
      [
        "缺少 slug，无法定位人格目录。",
        "请提供 --slug。",
        "示例：先用 /list-bazi-personas 获取 slug。",
      ].join("\n"),
    );
  }

  if (action === "backup") {
    const backupName = backupPersona(baseDir, slug, "update");
    process.stdout.write(`已创建备份：${backupName}\n`);
    return;
  }

  if (action === "list") {
    const versions = listPersonaVersions(baseDir, slug);
    printVersions(versions);
    return;
  }

  const version = args.version ?? "";
  if (!version) {
    throw new Error(
      [
        "回滚失败，缺少目标版本。",
        "请提供 --version。",
        "示例：/bazi-persona-rollback demo v2",
      ].join("\n"),
    );
  }
  const snapshot = rollbackPersona(baseDir, slug, version);
  process.stdout.write(
    `回滚成功，已恢复版本 ${version}。\n回滚前快照：${snapshot}\n`,
  );
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
