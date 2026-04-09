import fs from "node:fs";
import path from "node:path";
import {
  ensureDir,
  nowIso,
  parseCliArgs,
  readJson,
  timestampTag,
  writeJson,
} from "./_shared.js";
import type { PersonaMeta } from "./meta_updater.js";

export interface VersionSummary {
  version: string;
  archived_at: string;
  files: string[];
}

const CORE_FILES = [
  "SKILL.md",
  "persona.md",
  "state.md",
  "chart.json",
  "corrections.md",
  "meta.json",
];

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
  const meta = fs.existsSync(metaPath)
    ? readJson<PersonaMeta>(metaPath)
    : ({
        version: "v0",
      } as PersonaMeta);
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
