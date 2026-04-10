import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import readline from "node:readline/promises";
import { ensureDir, ensureRequired, fileExists, parseCliArgs, readJson, readUtf8IfExists, writeUtf8 } from "../utils/_shared.js";
import type { PersonaMeta } from "./meta_updater.js";

type AgentTarget = "claude" | "openclaw";

interface PersonaRecord {
  slug: string;
  dir: string;
  meta: PersonaMeta;
  skillPath: string;
  skillText: string;
  relationship: string;
  baziSummary: string;
}

function resolveBaseDir(args: Record<string, string>): string {
  return (
    args["base-dir"] ??
    process.env.BAZI_PERSONA_HOME ??
    path.join(os.homedir(), ".bazi-personas")
  );
}

function resolveAgentDir(homeDir: string, explicitDir?: string): string {
  if (explicitDir) {
    return explicitDir;
  }
  const candidates = ["agents", ".agents"];
  for (const candidate of candidates) {
    const full = path.join(homeDir, candidate);
    if (fs.existsSync(full) && fs.statSync(full).isDirectory()) {
      return full;
    }
  }
  return path.join(homeDir, "agents");
}

function resolveTargetHome(args: Record<string, string>, target: AgentTarget): string {
  if (target === "claude") {
    return args["claude-home"] ?? process.env.CLAUDE_HOME ?? path.join(os.homedir(), ".claude");
  }
  return args["openclaw-home"] ?? process.env.OPENCLAW_HOME ?? path.join(os.homedir(), ".openclaw");
}

function resolveTargets(raw?: string): AgentTarget[] {
  const input = (raw ?? "both").trim().toLowerCase();
  if (input === "claude") {
    return ["claude"];
  }
  if (input === "openclaw") {
    return ["openclaw"];
  }
  return ["claude", "openclaw"];
}

function parseYesNo(value?: string): boolean | undefined {
  if (!value) {
    return undefined;
  }
  const normalized = value.trim().toLowerCase();
  if (["1", "true", "yes", "y"].includes(normalized)) {
    return true;
  }
  if (["0", "false", "no", "n"].includes(normalized)) {
    return false;
  }
  return undefined;
}

function deriveRelationship(meta: PersonaMeta): string {
  return (meta.active_relationships ?? meta.relationships ?? [meta.relation ?? "未指定关系"])
    .filter(Boolean)
    .join("/");
}

function deriveBaziSummary(dir: string): string {
  const evidencePath = path.join(dir, ".runtime", "bazi.evidence.json");
  if (!fileExists(evidencePath)) {
    return "未提取";
  }
  try {
    const evidence = readJson<{ chart?: Record<string, unknown> }>(evidencePath);
    const chart = evidence.chart ?? {};
    const raw = (chart.raw_bazi ?? {}) as Record<string, unknown>;
    const bazi = typeof raw["八字"] === "string" ? raw["八字"] : "";
    const dayMaster =
      typeof chart.day_master === "string"
        ? chart.day_master
        : typeof raw["日主"] === "string"
          ? raw["日主"]
          : "";
    if (bazi && dayMaster) {
      return `${bazi} / 日主${dayMaster}`;
    }
    if (bazi) {
      return bazi;
    }
    if (dayMaster) {
      return `日主${dayMaster}`;
    }
    return "未提取";
  } catch {
    return "未提取";
  }
}

function truncateCell(value: string, max = 28): string {
  const text = value.replace(/\s+/g, " ").trim();
  if (text.length <= max) {
    return text;
  }
  return `${text.slice(0, Math.max(1, max - 1))}…`;
}

function formatPersonaTable(records: PersonaRecord[]): string {
  if (records.length === 0) {
    return "(暂无可用角色)";
  }
  const rows = records.map((record) => ({
    name: truncateCell(record.meta.name || "未命名", 16),
    id: truncateCell(record.slug, 20),
    relation: truncateCell(record.relationship || "未指定关系", 18),
    bazi: truncateCell(record.baziSummary || "未提取", 42),
  }));
  const columns = [
    { key: "name" as const, title: "角色名称" },
    { key: "id" as const, title: "ID" },
    { key: "relation" as const, title: "关系" },
    { key: "bazi" as const, title: "八字摘要" },
  ];
  const widths = columns.map((column) =>
    Math.max(column.title.length, ...rows.map((row) => row[column.key].length)),
  );
  const renderRow = (values: string[]) =>
    `| ${values.map((value, idx) => value.padEnd(widths[idx], " ")).join(" | ")} |`;
  const header = renderRow(columns.map((column) => column.title));
  const divider = renderRow(widths.map((width) => "-".repeat(width)));
  const body = rows.map((row) =>
    renderRow(columns.map((column) => row[column.key])),
  );
  return [header, divider, ...body].join("\n");
}

function readPersonaRecord(baseDir: string, slug: string): PersonaRecord | undefined {
  const dir = path.join(baseDir, slug);
  const metaPath = path.join(dir, ".runtime", "meta.json");
  const skillPath = path.join(dir, "SKILL.md");
  if (!fileExists(metaPath) || !fileExists(skillPath)) {
    return undefined;
  }
  const meta = readJson<PersonaMeta>(metaPath);
  const skillText = readUtf8IfExists(skillPath);
  return {
    slug,
    dir,
    meta,
    skillPath,
    skillText,
    relationship: deriveRelationship(meta),
    baziSummary: deriveBaziSummary(dir),
  };
}

function listPersonaRecords(baseDir: string): PersonaRecord[] {
  if (!fs.existsSync(baseDir)) {
    return [];
  }
  const records: PersonaRecord[] = [];
  const entries = fs.readdirSync(baseDir, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue;
    }
    const record = readPersonaRecord(baseDir, entry.name);
    if (record) {
      records.push(record);
    }
  }
  return records.sort((a, b) => b.meta.updated_at.localeCompare(a.meta.updated_at));
}

function extractSection(markdown: string, heading: string): string {
  const pattern = new RegExp(`##\\s*${heading}\\s*\\n([\\s\\S]*?)(?=\\n##\\s|$)`);
  return pattern.exec(markdown)?.[1]?.trim() ?? "";
}

function trimForAgent(value: string, maxLen = 1800): string {
  const normalized = value.replace(/\n{3,}/g, "\n\n").trim();
  if (!normalized) {
    return "";
  }
  if (normalized.length <= maxLen) {
    return normalized;
  }
  return `${normalized.slice(0, maxLen)}\n\n...`;
}

function buildAgentPrompt(record: PersonaRecord, target: AgentTarget, baseDir: string): string {
  const summary = trimForAgent(extractSection(record.skillText, "Persona Summary"), 700);
  const state = trimForAgent(extractSection(record.skillText, "Current State Modifier"), 1000);
  const execution = trimForAgent(extractSection(record.skillText, "Execution Rules"), 1000);
  const preferredLanguage = record.meta.preferred_language ?? "auto";

  return [
    `# Bazi Persona Agent · ${record.meta.name}`,
    "",
    `目标平台：${target === "claude" ? "Claude Code" : "OpenClaw"}`,
    `Persona ID：${record.slug}（内部 slug）`,
    `版本：${record.meta.version}`,
    `关系：${record.relationship}`,
    `八字摘要：${record.baziSummary}`,
    `语言偏好：${preferredLanguage}（默认跟随用户输入语言）`,
    "",
    "## How To Start",
    "- 进入对话后，直接按这个 persona 的语气、判断和互动方式回应。",
    "- 用户可自然语言触发：如“打开作弊模式 / open cheatsheet mode”。",
    "- 若用户询问状态、合盘、经历、未来，按 cheatsheet 结构输出（结论先行）。",
    "",
    "## Persona Snapshot",
    summary || "- 暂无摘要",
    "",
    "## Current State Snapshot",
    state || "- 暂无状态摘要",
    "",
    "## Execution Rules Snapshot",
    execution || "- 暂无执行规则摘要",
    "",
    "## Skill Paths",
    `- Persona SKILL: ${record.skillPath}`,
    `- Persona Base Dir: ${path.join(baseDir, record.slug)}`,
    "",
    "## Command Hints",
    `- 创建：npm run bazi -- --action create --slug ${record.slug} ...`,
    `- 更新：npm run bazi -- --action update --slug ${record.slug} ...`,
    `- 时运：npm run bazi -- --action flow --slug ${record.slug}`,
    `- 作弊：npm run bazi -- --action cheatsheet --slug ${record.slug} --mode on`,
    `- 合盘：npm run bazi -- --action compat --slug-a ${record.slug} --slug-b <other>`,
  ].join("\n");
}

function buildRouterPrompt(records: PersonaRecord[], target: AgentTarget): string {
  const lines = records.slice(0, 200).map((record) => {
    return `- ${record.slug} ｜ ${record.meta.name} ｜ ${record.meta.version} ｜ ${record.relationship} ｜ ${record.baziSummary}`;
  });
  return [
    "# Bazi Persona Router",
    "",
    `目标平台：${target === "claude" ? "Claude Code" : "OpenClaw"}`,
    "",
    "当用户点名某个人设（ID 或名字）时，优先切到对应 persona agent。",
    "若未指定，先询问用户要使用哪个 persona。",
    "",
    "## Available Personas",
    ...(lines.length > 0 ? lines : ["- 暂无可用 persona"]),
  ].join("\n");
}

function writeTargetAgents(params: {
  target: AgentTarget;
  records: PersonaRecord[];
  baseDir: string;
  args: Record<string, string>;
  dryRun: boolean;
}): string[] {
  const homeDir = resolveTargetHome(params.args, params.target);
  const explicitAgentDir =
    params.target === "claude"
      ? params.args["claude-agent-dir"]
      : params.args["openclaw-agent-dir"];
  const rootAgentDir = resolveAgentDir(homeDir, explicitAgentDir);
  const skillAgentDir = path.join(rootAgentDir, "bazi-persona");

  const outputs: string[] = [];
  if (!params.dryRun) {
    ensureDir(skillAgentDir);
  }

  for (const record of params.records) {
    const filePath = path.join(skillAgentDir, `bazi-persona-${record.slug}.md`);
    const content = `${buildAgentPrompt(record, params.target, params.baseDir)}\n`;
    if (!params.dryRun) {
      writeUtf8(filePath, content);
    }
    outputs.push(filePath);
  }

  const routerPath = path.join(skillAgentDir, "bazi-persona-router.md");
  if (!params.dryRun) {
    writeUtf8(routerPath, `${buildRouterPrompt(params.records, params.target)}\n`);
  }
  outputs.push(routerPath);
  return outputs;
}

function buildTargetDir(args: Record<string, string>, target: AgentTarget): string {
  const homeDir = resolveTargetHome(args, target);
  const explicitAgentDir =
    target === "claude"
      ? args["claude-agent-dir"]
      : args["openclaw-agent-dir"];
  const rootAgentDir = resolveAgentDir(homeDir, explicitAgentDir);
  return path.join(rootAgentDir, "bazi-persona");
}

async function confirmEnable(args: Record<string, string>, lines: string[]): Promise<boolean> {
  const preset = parseYesNo(args.yes);
  if (preset !== undefined) {
    return preset;
  }
  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    process.stdout.write(
      [
        ...lines,
        "",
        "当前是非交互环境，默认不执行写入。",
        "如需直接执行，请追加：--yes true",
      ].join("\n") + "\n",
    );
    return false;
  }
  process.stdout.write(`${lines.join("\n")}\n\n`);
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  try {
    const answer = (await rl.question("是否现在开启并写入 Agent？[Y/n] ")).trim();
    if (!answer) {
      return true;
    }
    return !["n", "no", "0", "false"].includes(answer.toLowerCase());
  } finally {
    rl.close();
  }
}

function syncAgents(args: Record<string, string>): void {
  const baseDir = resolveBaseDir(args);
  const targetList = resolveTargets(args.target);
  const dryRun = args["dry-run"] === "true" || args["dry-run"] === "1";
  const records = args.slug
    ? (() => {
        const record = readPersonaRecord(baseDir, args.slug);
        if (!record) {
          throw new Error(`找不到可同步的人设：${args.slug}`);
        }
        return [record];
      })()
    : listPersonaRecords(baseDir);

  if (records.length === 0) {
    throw new Error("当前没有可同步的人设。请先创建 persona 后再同步 agent。");
  }

  const logs: string[] = [];
  for (const target of targetList) {
    const outputs = writeTargetAgents({
      target,
      records,
      baseDir,
      args,
      dryRun,
    });
    logs.push(`[${target}] ${dryRun ? "预览" : "已写入"} ${outputs.length} 个文件`);
    for (const output of outputs) {
      logs.push(`- ${output}`);
    }
  }
  process.stdout.write(`${logs.join("\n")}\n`);
}

async function enableAgents(args: Record<string, string>): Promise<void> {
  const baseDir = resolveBaseDir(args);
  const targetList = resolveTargets(args.target);
  const records = args.slug
    ? (() => {
        const record = readPersonaRecord(baseDir, args.slug);
        if (!record) {
          throw new Error(`找不到可同步的人设：${args.slug}`);
        }
        return [record];
      })()
    : listPersonaRecords(baseDir);

  if (records.length === 0) {
    throw new Error("当前没有可同步的人设。请先创建 persona 后再开启 Agent 集成。");
  }

  const guideLines: string[] = [];
  guideLines.push("Bazi Persona Agent 集成向导");
  guideLines.push("");
  guideLines.push(`将同步 ${records.length} 个 persona 到以下平台：`);
  for (const target of targetList) {
    guideLines.push(`- ${target === "claude" ? "Claude Code" : "OpenClaw"} => ${buildTargetDir(args, target)}`);
  }
  guideLines.push("");
  guideLines.push("待同步角色（角色名称 / ID / 关系 / 八字）：");
  guideLines.push(formatPersonaTable(records));
  guideLines.push("");
  guideLines.push("同步后你可以在平台内更快切换到对应角色，并直接使用 cheatsheet 能力。");

  const confirmed = await confirmEnable(args, guideLines);
  if (!confirmed) {
    process.stdout.write("已取消启用。你可以稍后执行同一命令并加 --yes true 直接开启。\n");
    return;
  }

  syncAgents({
    ...args,
    action: "sync",
    "dry-run": "false",
  });

  process.stdout.write(
    [
      "",
      "开启完成。",
      "建议下一步：",
      "- 在 Claude Code / OpenClaw 中直接点名角色名称或 ID 开始对话",
      "- 需要上帝视角时输入：打开作弊模式（或 open cheatsheet mode）",
    ].join("\n") + "\n",
  );
}

function removeAgents(args: Record<string, string>): void {
  ensureRequired(args, ["confirm"]);
  if (args.confirm !== "DELETE") {
    throw new Error("删除确认失败，请传 --confirm DELETE。");
  }
  const targetList = resolveTargets(args.target);
  const logs: string[] = [];
  for (const target of targetList) {
    const homeDir = resolveTargetHome(args, target);
    const explicitAgentDir =
      target === "claude"
        ? args["claude-agent-dir"]
        : args["openclaw-agent-dir"];
    const rootAgentDir = resolveAgentDir(homeDir, explicitAgentDir);
    const skillAgentDir = path.join(rootAgentDir, "bazi-persona");
    if (fs.existsSync(skillAgentDir)) {
      fs.rmSync(skillAgentDir, { recursive: true, force: true });
      logs.push(`[${target}] 已删除：${skillAgentDir}`);
    } else {
      logs.push(`[${target}] 无需删除（不存在）：${skillAgentDir}`);
    }
  }
  process.stdout.write(`${logs.join("\n")}\n`);
}

function listSyncPlan(args: Record<string, string>): void {
  const baseDir = resolveBaseDir(args);
  const records = listPersonaRecords(baseDir);
  const targetList = resolveTargets(args.target);

  const lines: string[] = [];
  lines.push(`Base Dir: ${baseDir}`);
  lines.push(`Personas: ${records.length}`);
  lines.push("");
  lines.push("Role Table:");
  lines.push(formatPersonaTable(records));
  for (const target of targetList) {
    const homeDir = resolveTargetHome(args, target);
    const explicitAgentDir =
      target === "claude"
        ? args["claude-agent-dir"]
        : args["openclaw-agent-dir"];
    const rootAgentDir = resolveAgentDir(homeDir, explicitAgentDir);
    lines.push(`[${target}] agent dir => ${path.join(rootAgentDir, "bazi-persona")}`);
  }
  process.stdout.write(`${lines.join("\n")}\n`);
}

export async function runAgentBridge(args: Record<string, string>): Promise<void> {
  const action = (args.action ?? "enable").toLowerCase();
  if (!["enable", "sync", "remove", "list"].includes(action)) {
    throw new Error("不支持的 action。可用：enable / sync / remove / list");
  }
  if (action === "enable") {
    await enableAgents(args);
    return;
  }
  if (action === "sync") {
    syncAgents(args);
    return;
  }
  if (action === "remove") {
    removeAgents(args);
    return;
  }
  listSyncPlan(args);
}

async function main(): Promise<void> {
  const args = parseCliArgs(process.argv);
  await runAgentBridge(args);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    process.stderr.write(`${(error as Error).message}\n`);
    process.exitCode = 1;
  });
}
