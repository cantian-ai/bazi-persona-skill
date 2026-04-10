#!/usr/bin/env node
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildChart,
  normalizeDateInput,
  normalizeTimeInput,
  validateDate,
  validateTime,
  type BaziChart,
  type BaziGender,
  type CalendarType,
} from "./bazi_calc.js";
import {
  inferMbtiFromBazi,
  type MbtiInferenceProfile,
} from "./bazi_mbti.js";
import {
  buildStateShift,
  ELEMENT_PROFILE,
  inferElementFromDayMaster,
  inferFiveElementTrend,
  pickPrimaryTenGod,
  TEN_GOD_TO_BEHAVIOR,
} from "./persona_profile_core.js";
import {
  buildPersonaStyleSignature,
} from "./persona_style.js";
import { buildPsychologyProfileMarkdown } from "./persona_modeling.js";
import {
  derivePreviewFromPersonaState,
  extractSectionFirstBullet,
  formatPreviewCard,
  type OutputLanguage,
  type PreviewCard,
} from "./persona_preview.js";
import {
  appendUniqueMemoryEvents,
  buildMemoryIndex,
  buildNarrativeMemoryEventsFromMessage,
  classifyNarrativeMemory,
  createMemoryEvent,
  detectMemoryFactsFromText,
  extractMemoryFromLegacyCorrections,
  mergeUnique,
  parseMemoryLog,
  parseMemoryType,
  parseMemoryWeight,
  pickRealityFactsFromMemory,
  serializeMemoryLog,
  splitCsv,
  splitNarrativeSentences,
  type MemoryEvent,
  type MemoryType,
  type MemoryWeight,
  type RuntimeMemoryIndex,
  type RuntimeMemoryPin,
} from "./persona_memory.js";
import {
  buildFlowSnapshotMarkdown,
  formatSolarTermInfo,
  interpretRelationEffects,
  parseDateTimeInput,
  queryChineseCalendar,
} from "./flow_calendar.js";
import {
  ensureDir,
  ensureRequired,
  fileExists,
  nowIso,
  parseCliArgs,
  readJson,
  readUtf8IfExists,
  writeUtf8,
} from "../utils/_shared.js";
import {
  createInitialMeta,
  updateMeta,
  type Gender,
  type PersonaMeta,
} from "../runtime/meta_updater.js";
import { runAgentBridge } from "../runtime/agent_bridge.js";
import { toSlug } from "../utils/slugify.js";
import { backupPersona, rollbackPersona } from "../runtime/version_manager.js";
import { promptOptionalText } from "../utils/confirm_prompt.js";
import { GAN_DATA, ZHI_DATA } from "../data/gan_zhi_knowledge.js";
import { SHENGXIAO_DATA } from "../data/shengxiao_knowledge.js";
import { SHISHEN_PERSONALITY_DATA } from "../data/shishen_knowledge.js";

interface PersonaIndexItem {
  slug: string;
  name: string;
  version: string;
  created_at: string;
  updated_at: string;
  source_count: number;
}

interface LaunchProfileItem {
  id: string;
  name: string;
  relationship: string;
  bazi: string;
  updated_at: string;
}

type RuntimeClient = "claude" | "openclaw" | "hermes" | "generic";

interface ChartLike {
  accuracy_mode?: string;
  day_master?: string;
  five_elements?: unknown;
  ten_gods?: unknown;
  luck_cycles?: unknown;
  yearly_fortune?: unknown;
  current_year?: number;
  raw_bazi?: unknown;
  notes?: string[];
}

interface GeneratedPersonaPack {
  persona: string;
  state: string;
  preview: PreviewCard;
}

interface PersonaSkillInternalDataV1 {
  schema: "bazi_persona_single_file_v1";
  chart: ChartLike;
  corrections: string[];
  meta: PersonaMeta;
}

interface PersonaSkillInternalDataV2 {
  schema: "bazi_persona_skill_v2";
  meta: PersonaMeta;
  chart: ChartLike;
  memory: MemoryEvent[];
}

type PersonaSkillInternalData = PersonaSkillInternalDataV1 | PersonaSkillInternalDataV2;

interface RuntimeCore {
  version: "v2";
  persona_markdown: string;
  updated_at: string;
}

interface RuntimeState {
  version: "v2";
  state_markdown: string;
  updated_at: string;
  runtime?: {
    mode: "auto" | "manual";
    last_refreshed_at?: string;
    locked_at?: string;
    cheatsheet?: {
      enabled: boolean;
      affinity: boolean;
    };
  };
}
type StateRuntime = NonNullable<RuntimeState["runtime"]>;

interface RuntimeEvidence {
  version: "v2";
  chart: ChartLike;
  updated_at: string;
}

interface RuntimeBundle {
  core: RuntimeCore;
  state: RuntimeState;
  evidence: RuntimeEvidence;
  meta: PersonaMeta;
  memory: MemoryEvent[];
  memoryCheatsheet: MemoryEvent[];
  memoryIndex: RuntimeMemoryIndex;
  memoryPins: RuntimeMemoryPin[];
  cheatsheetSession: CheatsheetSession;
}

interface CheatsheetSessionMessage {
  role: "user" | "assistant";
  content: string;
  ts: string;
}

interface CheatsheetSession {
  version: "v1";
  messages: CheatsheetSessionMessage[];
  updated_at: string;
}

const INTERNAL_DATA_HEADING = "## Internal Data (System)";
const RUNTIME_DIR_NAME = ".runtime";
const RUNTIME_CORE_FILE = "persona.core.json";
const RUNTIME_STATE_FILE = "state.current.json";
const RUNTIME_EVIDENCE_FILE = "bazi.evidence.json";
const RUNTIME_META_FILE = "meta.json";
const RUNTIME_MEMORY_FILE = "memory.log.jsonl";
const RUNTIME_MEMORY_NORMAL_FILE = "memory.normal.log.jsonl";
const RUNTIME_MEMORY_CHEATSHEET_FILE = "memory.cheatsheet.log.jsonl";
const RUNTIME_MEMORY_INDEX_FILE = "memory.index.json";
const RUNTIME_MEMORY_PINS_FILE = "memory.pins.json";
const RUNTIME_CHEATSHEET_SESSION_FILE = "cheatsheet.session.json";
const MODULE_DIR = path.dirname(fileURLToPath(import.meta.url));
const PROMPT_DIR = path.resolve(MODULE_DIR, "../../prompts");

function normalizeGender(input: string): Gender {
  const value = input.trim().toLowerCase();
  if (["男", "male", "m"].includes(value)) {
    return "男";
  }
  if (["女", "female", "f"].includes(value)) {
    return "女";
  }
  if (["其他", "other", "x"].includes(value)) {
    return "其他";
  }
  return "未知";
}

function readMaybeFile(maybePath?: string): string {
  if (!maybePath) {
    return "";
  }
  if (!fileExists(maybePath)) {
    throw new Error(
      [
        `找不到文件：${maybePath}`,
        "请确认路径是否正确，或移除该参数。",
      ].join("\n"),
    );
  }
  return fs.readFileSync(maybePath, "utf-8").trim();
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }
  return value as Record<string, unknown>;
}

function summarizeValue(value: unknown, maxLen = 120): string {
  if (value === null || value === undefined) {
    return "暂无明确数据";
  }
  if (typeof value === "string") {
    const trimmed = value.replace(/\s+/g, " ").trim();
    return trimmed.length > maxLen ? `${trimmed.slice(0, maxLen)}...` : trimmed;
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return `${value}`;
  }
  if (Array.isArray(value)) {
    const text = value.map((item) => summarizeValue(item, 30)).join("、");
    return text.length > maxLen ? `${text.slice(0, maxLen)}...` : text;
  }
  return "结构化信息已提取";
}

function readPromptTemplate(name: string): string {
  const filePath = path.join(PROMPT_DIR, name);
  if (!fileExists(filePath)) {
    return "";
  }
  return readUtf8IfExists(filePath).trim();
}

function summarizePromptForSkill(raw: string): string {
  if (!raw.trim()) {
    return "- 模板暂不可用";
  }
  const lines = raw
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 8);
  return lines.map((line) => `- ${line}`).join("\n");
}

function toStringValue(value: unknown): string | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return `${value}`.trim();
  }
  return undefined;
}

function formatPillarFromRaw(raw: unknown, key: "年柱" | "月柱" | "日柱" | "时柱"): string {
  const record = asRecord(raw);
  const pillar = asRecord(record?.[key]);
  const stem = summarizeValue(asRecord(pillar?.["天干"])?.["天干"], 4);
  const branch = summarizeValue(asRecord(pillar?.["地支"])?.["地支"], 4);
  if (stem === "暂无明确数据" || branch === "暂无明确数据") {
    return "未提取";
  }
  return `${stem}${branch}`;
}

function getPillarStemBranch(raw: unknown, key: "年柱" | "月柱" | "日柱" | "时柱"): {
  stem?: string;
  branch?: string;
} {
  const record = asRecord(raw);
  const pillar = asRecord(record?.[key]);
  const stem = toStringValue(asRecord(pillar?.["天干"])?.["天干"]);
  const branch = toStringValue(asRecord(pillar?.["地支"])?.["地支"]);
  return {
    stem,
    branch,
  };
}

function buildGanZhiPersonaNotes(chart: ChartLike): string {
  const raw = asRecord(chart.raw_bazi);
  const day = getPillarStemBranch(raw, "日柱");
  const month = getPillarStemBranch(raw, "月柱");
  const year = getPillarStemBranch(raw, "年柱");
  const hour = getPillarStemBranch(raw, "时柱");

  const dayGan = day.stem ?? "";
  const dayProfile = GAN_DATA[dayGan];
  const monthZhi = month.branch ?? "";
  const dayZhi = day.branch ?? "";
  const hourZhi = chart.accuracy_mode === "missing_time_six_pillars" ? "" : hour.branch ?? "";

  const coreLine = dayProfile?.personality?.[0] ?? "日干性格未识别，先按整体结构判断。";
  const pros = dayProfile?.pros?.[0];
  const cons = dayProfile?.cons?.[0];
  const monthLine = ZHI_DATA[monthZhi]?.imagery?.[0] ?? "月支类象未提取。";
  const dayLine = ZHI_DATA[dayZhi]?.imagery?.[0] ?? "日支类象未提取。";
  const hourLine =
    hourZhi && ZHI_DATA[hourZhi]?.imagery?.[0]
      ? ZHI_DATA[hourZhi]?.imagery?.[0]
      : "时支类象未提取（或缺时）。";

  return [
    `- 核心气质（日干 ${dayGan || "未识别"}）：${coreLine}`,
    pros ? `- 优势倾向：${pros}` : "- 优势倾向：未提取",
    cons ? `- 风险倾向：${cons}` : "- 风险倾向：未提取",
    `- 行为基调（月支 ${monthZhi || "未识别"}）：${monthLine}`,
    `- 内在反应（日支 ${dayZhi || "未识别"}）：${dayLine}`,
    `- 外在表现（时支 ${hourZhi || "未识别"}）：${hourLine}`,
  ].join("\n");
}

function buildShengXiaoNotes(chart: ChartLike): string {
  const raw = asRecord(chart.raw_bazi);
  const animal = toStringValue(raw?.["生肖"]);
  if (!animal || !SHENGXIAO_DATA[animal]) {
    return "- 生肖性格未提取（缺少有效生肖信息）。";
  }
  const info = SHENGXIAO_DATA[animal];
  const personality = info.personality?.[0] ?? "核心性格未提取";
  const cons = info.cons?.[0] ?? "风险倾向未提取";
  const love = info.love?.[0] ?? "情感倾向未提取";
  const career = info.career?.[0] ?? "职业倾向未提取";
  return [
    `- 生肖：${animal}`,
    `- 性格主轴：${personality}`,
    `- 关系表现：${love}`,
    `- 职业倾向：${career}`,
    `- 风险盲点：${cons}`,
  ].join("\n");
}

function buildShiShenNotes(params: {
  primaryTenGod: string;
  currentLuckTenGod?: string;
}): string {
  const primary = params.primaryTenGod?.trim() || "未识别";
  if (primary === "未识别") {
    return "- 十神性格未提取（缺少有效十神信息）。";
  }
  const primaryInfo = SHISHEN_PERSONALITY_DATA[primary];
  if (!primaryInfo) {
    return `- 十神「${primary}」暂无对应性格知识。`;
  }
  const current = params.currentLuckTenGod?.trim();
  const currentInfo =
    current && current !== primary ? SHISHEN_PERSONALITY_DATA[current] : undefined;

  const lines = [
    `- 主导十神：${primary}`,
    `- 性格主轴：${primaryInfo.traits?.[0] ?? "主轴未提取"}`,
    `- 优势倾向：${primaryInfo.pros?.[0] ?? "优势未提取"}`,
    `- 风险盲点：${primaryInfo.cons?.[0] ?? "风险未提取"}`,
    `- 关键能力：${primaryInfo.ability ?? "能力未提取"}`,
    `- 适配场域：${primaryInfo.career ?? "职业倾向未提取"}`,
  ];

  if (current && currentInfo) {
    lines.push(`- 近期偏移（大运天干十神）：${current}`);
    lines.push(`- 偏移表现：${currentInfo.traits?.[0] ?? "偏移表现未提取"}`);
  }
  return lines.join("\n");
}

function buildMbtiNotes(profile: MbtiInferenceProfile): string {
  const topTenGodText =
    profile.basis.top_ten_gods.length > 0
      ? profile.basis.top_ten_gods
          .map((item) => `${item.name} ${item.energy_percent.toFixed(1)}%`)
          .join(" / ")
      : "未提取到稳定十神能量分布";
  const favorableText =
    profile.basis.favorable_elements.length > 0
      ? profile.basis.favorable_elements.join("、")
      : "未明确";
  const unfavorableText =
    profile.basis.unfavorable_elements.length > 0
      ? profile.basis.unfavorable_elements.join("、")
      : "未明确";
  const tendencyLines = Object.entries(profile.tendency_analysis).map(
    ([label, value]) => `- ${label}：${value}`,
  );

  return [
    `- 八字映射 MBTI：${profile.mbti_type}`,
    `- 维度得分：EI ${profile.scores.ScoreEI}｜SN ${profile.scores.ScoreSN}｜TF ${profile.scores.ScoreTF}｜JP ${profile.scores.ScoreJP}`,
    ...tendencyLines,
    `- 推导依据：日主${profile.basis.day_master_stem ?? "未识别"}（${profile.basis.day_master_element}）｜日主强弱 ${profile.basis.day_master_strength}`,
    `- 十神能量主轴：${topTenGodText}`,
    `- 喜忌校准：喜 ${favorableText}｜忌 ${unfavorableText}`,
    `- 校准机制：阴印化官杀 ${profile.basis.yin_transforms_guansha_calibration ? "已触发" : "未触发"}`,
    "- 使用边界：MBTI 为行为倾向镜像，不代表绝对人格定论。",
  ].join("\n");
}

function buildBaziKnowledgeNotes(params: {
  chart: ChartLike;
  primaryTenGod: string;
  currentLuckTenGod?: string;
  mbtiProfile: MbtiInferenceProfile;
}): string {
  const shishen = buildShiShenNotes({
    primaryTenGod: params.primaryTenGod,
    currentLuckTenGod: params.currentLuckTenGod,
  });
  const ganZhi = buildGanZhiPersonaNotes(params.chart);
  const shengXiao = buildShengXiaoNotes(params.chart);
  const mbti = buildMbtiNotes(params.mbtiProfile);
  return [
    "- 信息权重：干支 = 十神 > 生肖（优先级从高到低）。",
    "",
    "### 干支结构摘要",
    ganZhi,
    "",
    "### 十神行为摘要",
    shishen,
    "",
    "### 生肖参考",
    shengXiao,
    "",
    "### MBTI 映射（由八字推导）",
    mbti,
  ].join("\n");
}

function markdownBaziSnapshot(chart: ChartLike): string {
  const raw = asRecord(chart.raw_bazi);
  const solar = summarizeValue(raw?.["阳历"], 30);
  const lunar = summarizeValue(raw?.["农历"], 30);
  const baziName = summarizeValue(raw?.["八字"], 40);
  const zodiac = summarizeValue(raw?.["生肖"], 10);
  const yearPillar = formatPillarFromRaw(raw, "年柱");
  const monthPillar = formatPillarFromRaw(raw, "月柱");
  const dayPillar = formatPillarFromRaw(raw, "日柱");
  const hourPillar =
    chart.accuracy_mode === "missing_time_six_pillars"
      ? "缺时未纳入"
      : formatPillarFromRaw(raw, "时柱");
  const currentLuck = describeLuckCycle(pickCurrentLuck(chart));
  const yearlySummary = summarizeValue(chart.yearly_fortune, 60);
  const dayMaster = chart.day_master ?? summarizeValue(raw?.["日主"], 10);

  return [
    `- 阳历：${solar}`,
    `- 农历：${lunar}`,
    `- 八字：${baziName}`,
    `- 生肖：${zodiac}`,
    `- 日主：${dayMaster}`,
    `- 四柱：年柱 ${yearPillar}｜月柱 ${monthPillar}｜日柱 ${dayPillar}｜时柱 ${hourPillar}`,
    `- 当前大运：${currentLuck}`,
    `- 当前流年摘要：${yearlySummary}`,
    `- 精度说明：${
      chart.accuracy_mode === "missing_time_six_pillars"
        ? "缺时精简版（可先用，补时可升级）"
        : "完整排盘"
    }`,
  ].join("\n");
}

function collectOriginalRelations(chart: ChartLike): string[] {
  const raw = asRecord(chart.raw_bazi);
  const rel = asRecord(raw?.["刑冲合会"]);
  if (!rel) {
    return [];
  }
  const items: string[] = [];
  for (const [pillarKey, pillarVal] of Object.entries(rel)) {
    const pillarRecord = asRecord(pillarVal);
    if (!pillarRecord) {
      continue;
    }
    const tg = asRecord(pillarRecord["天干"]);
    const dz = asRecord(pillarRecord["地支"]);
    for (const [group, groupVal] of Object.entries({ ...tg, ...dz })) {
      const list = Array.isArray(groupVal) ? groupVal : [];
      for (const entry of list) {
        const record = asRecord(entry);
        if (!record) {
          continue;
        }
        const otherPillar = summarizeValue(record["柱"], 4);
        const detail = summarizeValue(record["知识点"], 20);
        const tag = summarizeValue(record["元素"], 6);
        const label = tag !== "暂无明确数据" ? tag : group;
        items.push(`${pillarKey}柱 × ${otherPillar}柱：${label}（${detail}）`);
      }
    }
  }
  return items;
}

function formatRelationList(items: string[], emptyHint: string): string {
  if (items.length === 0) {
    return `- ${emptyHint}`;
  }
  return items.map((item) => `- ${item}`).join("\n");
}

function extractLuckList(chart: ChartLike): Array<Record<string, unknown>> {
  const luckRecord = asRecord(chart.luck_cycles);
  const list = luckRecord?.["大运"];
  if (!Array.isArray(list)) {
    return [];
  }
  return list.filter((item) => !!asRecord(item)) as Array<Record<string, unknown>>;
}

function pickCurrentLuck(chart: ChartLike): Record<string, unknown> | undefined {
  const list = extractLuckList(chart);
  if (list.length === 0) {
    return undefined;
  }
  const year = Number(chart.current_year ?? new Date().getFullYear());
  const exact = list.find((item) => {
    const start = Number(item["开始年份"]);
    const end = Number(item["结束"]);
    return Number.isFinite(start) && Number.isFinite(end) && year >= start && year <= end;
  });
  if (exact) {
    return exact;
  }
  const past = list
    .filter((item) => Number.isFinite(Number(item["开始年份"])))
    .sort((a, b) => Number(b["开始年份"]) - Number(a["开始年份"]));
  return past[0];
}

function describeLuckCycle(cycle?: Record<string, unknown>): string {
  if (!cycle) {
    return "当前大运信息未完整提取";
  }
  const ganZhi = summarizeValue(cycle["干支"], 20);
  const start = summarizeValue(cycle["开始年份"], 20);
  const end = summarizeValue(cycle["结束"], 20);
  const tg = summarizeValue(cycle["天干十神"], 20);
  return `${ganZhi}（${start}-${end}，天干十神：${tg}）`;
}

function buildPersonaFromChart(params: {
  name: string;
  relationships?: string[];
  activeRelationships?: string[];
  gender: Gender;
  chart: ChartLike;
  supplementalFacts?: string[];
}): GeneratedPersonaPack {
  const dayMaster = params.chart.day_master;
  const element = inferElementFromDayMaster(dayMaster);
  const profile = ELEMENT_PROFILE[element];
  const relationText = (params.activeRelationships ?? params.relationships ?? [])
    .filter(Boolean)
    .join(" / ");
  const accuracyHint =
    params.chart.accuracy_mode === "missing_time_six_pillars"
      ? "当前为缺时精简模式：时柱相关细节已降权，建议补充出生时间后重算。"
      : "当前为完整排盘模式：可用于较稳定的人格与近期状态判断。";
  const fiveElementTrend = inferFiveElementTrend(params.chart.five_elements);
  const primaryTenGod = pickPrimaryTenGod(params.chart.ten_gods);
  const tenGodHint = TEN_GOD_TO_BEHAVIOR[primaryTenGod];
  const currentLuck = pickCurrentLuck(params.chart);
  const currentLuckTenGod = summarizeValue(currentLuck?.["天干十神"], 20);
  const currentLuckText = describeLuckCycle(currentLuck);
  const yearlySummary = summarizeValue(params.chart.yearly_fortune);
  const shift = buildStateShift(primaryTenGod, currentLuckTenGod);
  const supplementalFacts = (params.supplementalFacts ?? []).filter(Boolean);
  const supplementalFactLines =
    supplementalFacts.length > 0
      ? supplementalFacts.slice(0, 8).map((item) => `- ${item}`).join("\n")
      : "- 暂无补充事实。";
  const supplementalFusionLines = buildFactFusionLines(
    supplementalFacts,
    primaryTenGod,
    currentLuckText,
  );
  const mbtiProfile = inferMbtiFromBazi({
    day_master: params.chart.day_master,
    raw_bazi: params.chart.raw_bazi,
    ten_gods: params.chart.ten_gods,
    five_elements: params.chart.five_elements,
  });
  const knowledgeNotes = buildBaziKnowledgeNotes({
    chart: params.chart,
    primaryTenGod,
    currentLuckTenGod,
    mbtiProfile,
  });
  const relationshipLine = relationText ? `当前生效关系：${relationText}` : "当前生效关系：未指定关系";
  const styleSignature = buildPersonaStyleSignature({
    mbtiType: mbtiProfile.mbti_type,
    element,
    dayMaster,
    primaryTenGod,
    relationText: relationText || "未指定关系",
    tenGodHint,
  });
  const psychologyProfile = buildPsychologyProfileMarkdown({
    chart: params.chart,
    mbti: mbtiProfile,
    primaryTenGod,
    style: styleSignature,
    shift,
    currentLuckText,
    currentLuckTenGod,
    yearlySummary,
    relationText: relationText || "未指定关系",
    accuracyHint,
  });
  const topTenGodText =
    mbtiProfile.basis.top_ten_gods.length > 0
      ? mbtiProfile.basis.top_ten_gods
          .map((item) => `${item.name} ${item.energy_percent.toFixed(1)}%`)
          .join(" / ")
      : "未提取到稳定十神能量分布";
  const oneLineSummary = `${styleSignature.archetype}，${profile.oneLine.replace(/。$/, "")}；做判断时${styleSignature.decisionCore.replace(/。$/, "")}，关系里看重边界与兑现。`;

  const persona = `# ${params.name} · Persona

## 一、一句话人格总结
- ${oneLineSummary}
- 性格标签：${styleSignature.tagLine}
- ${relationshipLine}
- 当前阶段：${shift.summary}

${psychologyProfile}

## 命理依据摘要（按需查看，支撑层）
- MBTI 推断：${mbtiProfile.mbti_type}（EI ${mbtiProfile.scores.ScoreEI}｜SN ${mbtiProfile.scores.ScoreSN}｜TF ${mbtiProfile.scores.ScoreTF}｜JP ${mbtiProfile.scores.ScoreJP}）
- 四轴置信：${Object.entries(mbtiProfile.tendency_analysis)
  .map(([label, value]) => `${label} ${value}`)
  .join(" / ")}
- 日主与强弱：${mbtiProfile.basis.day_master_stem ?? "未识别"}（${mbtiProfile.basis.day_master_element}）｜${mbtiProfile.basis.day_master_strength}
- 十神主轴：${topTenGodText}
- 行为趋势：${fiveElementTrend}
- 当前时运：${currentLuckText}
- 年度摘要：${yearlySummary}
- 精度说明：${accuracyHint}

## 创建时补充事实（用户提供）
${supplementalFactLines}

## 现实信息融合（解释）
${supplementalFusionLines}

## 专业依据扩展（详细）
${knowledgeNotes}

## 模式边界（强约束）
- 普通模式（默认）必须像真人自然沟通，不主动暴露命理分析过程。
- 普通模式禁止主动提及术语：八字、日主、五行、十神、流年、流月、流日、盘面、命理、合盘。
- 只有用户明确要求命理视角（如“从八字看”“按命理分析”）或明确开启 cheatsheet，才允许输出术语与依据。
- 恋爱与关系问题（如“我能追你吗”）在普通模式先按个人态度回答：立场 + 边界 + 行动建议，不加命理论证。
- 若用户追问“依据是什么”，普通模式先给生活化理由；用户再次明确要命理解释时再切换。

## 禁止误读点
- 你的直接，不等于冷漠；你的谨慎，不等于拖延。
- 你强调边界，是为了减少关系损耗，不是拒绝合作。
- 你在高压下更硬，不代表你不在意关系，只是优先级切到“先解决问题”。`;

  const state = `# Current State Modifier

## 当前阶段关键词
- ${shift.keywords.join("\n- ")}

## 最近更明显的行为倾向
- ${shift.behavior}

## 最近更可能出现的沟通变化
- ${shift.communication}

## 最近更可能出现的判断变化
- ${shift.decision}

## 最近使用时应加强的特征
- ${shift.strengthen.join("\n- ")}

## 最近使用时应减弱的特征
- ${shift.weaken.join("\n- ")}

## 本阶段状态依据
- 当前大运：${currentLuckText}
- 主导十神：${primaryTenGod}
- 流年摘要：${yearlySummary}
- 精度说明：${accuracyHint}`;

  return {
    persona,
    state,
    preview: {
      summary: `${styleSignature.archetype}：${profile.oneLine}`,
      speakingFeel: `${styleSignature.voiceRule} ${styleSignature.responseRhythm}`,
      decisionFocus: styleSignature.decisionCore,
      stressShift: styleSignature.pressurePattern,
      currentState:
        params.chart.accuracy_mode === "missing_time_six_pillars"
          ? "缺时精简状态：可先用，补时后可升级细节。"
          : shift.summary,
    },
  };
}

function buildAgentFirstPersonaPack(params: {
  name: string;
  relationships?: string[];
  activeRelationships?: string[];
  gender: Gender;
  chart: ChartLike;
  supplementalFacts?: string[];
}): GeneratedPersonaPack {
  const dayMaster = params.chart.day_master;
  const element = inferElementFromDayMaster(dayMaster);
  const profile = ELEMENT_PROFILE[element];
  const relationText = (params.activeRelationships ?? params.relationships ?? [])
    .filter(Boolean)
    .join(" / ");
  const primaryTenGod = pickPrimaryTenGod(params.chart.ten_gods);
  const tenGodHint = TEN_GOD_TO_BEHAVIOR[primaryTenGod];
  const currentLuck = pickCurrentLuck(params.chart);
  const currentLuckTenGod = summarizeValue(currentLuck?.["天干十神"], 20);
  const currentLuckText = describeLuckCycle(currentLuck);
  const yearlySummary = summarizeValue(params.chart.yearly_fortune);
  const shift = buildStateShift(primaryTenGod, currentLuckTenGod);
  const mbtiProfile = inferMbtiFromBazi({
    day_master: params.chart.day_master,
    raw_bazi: params.chart.raw_bazi,
    ten_gods: params.chart.ten_gods,
    five_elements: params.chart.five_elements,
  });
  const styleSignature = buildPersonaStyleSignature({
    mbtiType: mbtiProfile.mbti_type,
    element,
    dayMaster,
    primaryTenGod,
    relationText: relationText || "未指定关系",
    tenGodHint,
  });
  const supplementalFacts = (params.supplementalFacts ?? []).filter(Boolean).slice(0, 10);
  const supplementalFactLines =
    supplementalFacts.length > 0
      ? supplementalFacts.map((item) => `- ${item}`).join("\n")
      : "- 暂无补充事实";
  const accuracyHint =
    params.chart.accuracy_mode === "missing_time_six_pillars"
      ? "缺时精简模式：时柱结论已降权，补充出生时间后可提升精度。"
      : "完整排盘模式：可用于稳定的人格与动态分析。";

  const persona = `# ${params.name} · Agent-first Persona Blueprint

## 一句话画像
- ${styleSignature.archetype}；${profile.oneLine}
- 当前关系镜头：${relationText || "未指定关系"}

## 五维人格基线（用于对话生成）
### 1) 认知模式
- 遇事第一反应：先${styleSignature.decisionCore.replace(/[。！？!?]+$/u, "")}。
- 决策节奏：${styleSignature.detailPreference}
- 风险偏好：${tenGodHint?.decision ?? "先看边界与后果，再决定推进速度。"}

### 2) 价值系统
- 长期优先：边界清晰、承诺兑现、关系可持续。
- 触发防御：${styleSignature.misfireSignal}
- 选择逻辑：先保下限，再争取上限。

### 3) 沟通风格
- 说话感觉：${styleSignature.voiceRule}
- 聊天节奏：${styleSignature.responseRhythm}
- 情绪处理：${styleSignature.emotionPolicy}

### 4) 关系模式
- 建立信任：${styleSignature.trustSignal}
- 冲突处理：${styleSignature.conflictApproach}
- 修复路径：${styleSignature.repairGuide}

### 5) 状态机制
- 常态：以长期节奏和结果兑现为主线。
- 压力态：${styleSignature.pressurePattern}
- 近期偏移：${shift.summary}

## Prompt Workflow Contract（必须执行）
- 先基于 Bazi Evidence + Reality Anchors 提取证据链。
- 再按“认知/价值/沟通/关系/状态”五维生成当前回复风格。
- 用户补充新事实时优先更新 Reality Anchors，再微调输出。
- 动态分析只调整强度与优先级，不重写长期人格框架。

## 用户补充资料（当前）
${supplementalFactLines}

## 术语边界
- 普通模式禁止主动输出术语：八字/日主/五行/十神/流年/命理/合盘。
- 仅当用户明确要求命理视角或开启 cheatsheet 时，才展示术语与依据。`;

  const state = `# Current State Modifier

## 当前状态关键词
- ${shift.keywords.join("\n- ")}

## 当前沟通偏移
- ${shift.communication}

## 当前决策偏移
- ${shift.decision}

## 当前关系风险点
- 高压下可能优先问题切分与推进速度，情绪承接会后置。

## 当前互动建议
- 先给结论，再给边界，再给下一步动作。
- 避免反复试探，提供明确上下文和时间点。

## 状态依据
- 当前大运：${currentLuckText}
- 流年摘要：${yearlySummary}
- 精度说明：${accuracyHint}`;

  return {
    persona,
    state,
    preview: {
      summary: `${styleSignature.archetype}：${profile.oneLine}`,
      speakingFeel: `${styleSignature.voiceRule} ${styleSignature.responseRhythm}`,
      decisionFocus: styleSignature.decisionCore,
      stressShift: styleSignature.pressurePattern,
      currentState:
        params.chart.accuracy_mode === "missing_time_six_pillars"
          ? "缺时精简状态：可先用，补时后升级。"
          : shift.summary,
    },
  };
}

function resolveRenderMode(args: Record<string, string>): "agent" | "legacy" {
  const mode = (args["render-mode"] ?? "agent").trim().toLowerCase();
  return mode === "legacy" ? "legacy" : "agent";
}

function detectAccuracyMode(chart: unknown): PersonaMeta["accuracy_mode"] {
  if (!chart || typeof chart !== "object") {
    return "full_chart";
  }
  const record = chart as Record<string, unknown>;
  return record.accuracy_mode === "missing_time_six_pillars"
    ? "missing_time_six_pillars"
    : "full_chart";
}

function normalizeCountryCode(raw?: string): string | undefined {
  if (!raw) {
    return undefined;
  }
  const code = raw.trim().toUpperCase();
  if (!code) {
    return undefined;
  }
  if (code.length === 2) {
    return code;
  }
  const map: Record<string, string> = {
    CHINA: "CN",
    CN: "CN",
    PRC: "CN",
    HONGKONG: "HK",
    HONG_KONG: "HK",
    HK: "HK",
    TAIWAN: "TW",
    TW: "TW",
    USA: "US",
    US: "US",
    UNITEDSTATES: "US",
    UNITED_STATES: "US",
    UK: "GB",
    GB: "GB",
    UNITEDKINGDOM: "GB",
    UNITED_KINGDOM: "GB",
    AUSTRALIA: "AU",
    AU: "AU",
    CANADA: "CA",
    CA: "CA",
    SINGAPORE: "SG",
    SG: "SG",
  };
  return map[code.replace(/[\s-]/g, "")];
}

function resolveIntroLocale(params: {
  args?: Record<string, string>;
  lang: OutputLanguage;
}): string {
  const rawLocale = params.args?.locale?.trim();
  if (rawLocale) {
    return rawLocale;
  }
  const country = normalizeCountryCode(params.args?.country);
  if (country) {
    return `${params.lang}-${country}`;
  }
  const envCandidates = [
    process.env.LC_MESSAGES?.trim(),
    process.env.LANG?.trim(),
    process.env.LC_ALL?.trim(),
  ].filter((v): v is string => Boolean(v));
  const envLocale = envCandidates.find((value) => {
    const upper = value.toUpperCase();
    return upper !== "C" && upper !== "C.UTF-8" && upper !== "POSIX";
  });
  if (envLocale) {
    const normalized = envLocale
      .replace(/\..*$/, "")
      .replace(/_/g, "-");
    const localeCountry = normalizeCountryCode(normalized.split("-")[1]);
    if (localeCountry) {
      return `${params.lang}-${localeCountry}`;
    }
  }
  return params.lang === "en" ? "en-US" : "zh-CN";
}

function buildEnglishIntroExamples(locale: string): { line1: string; line2: string } {
  const upper = locale.toUpperCase();
  const isUS = upper.includes("US");
  const isGBLike = upper.includes("GB") || upper.includes("UK") || upper.includes("AU");
  if (isUS) {
    return {
      line1: "Shuqing, female, August 12, 1999, Shanghai, coworker",
      line2: "Jason, male, March 12, 1991, 12:13 PM, Guangzhou, ex-partner",
    };
  }
  if (isGBLike) {
    return {
      line1: "Shuqing, female, 12 August 1999, Shanghai, coworker",
      line2: "Jason, male, 12 March 1991, 12:13, Guangzhou, ex-partner",
    };
  }
  return {
    line1: "Shuqing, female, 1999-08-12, Shanghai, coworker",
    line2: "Jason, male, 1991-03-12 12:13, Guangzhou, ex-partner",
  };
}

function buildChineseIntroExamples(locale: string): { line1: string; line2: string } {
  const upper = locale.toUpperCase();
  if (upper.includes("TW") || upper.includes("HK")) {
    return {
      line1: "舒晴，女，1999/8/12，上海，同事",
      line2: "Jason，男，1991/3/12 12:13，廣州，前任",
    };
  }
  return {
    line1: "舒晴，1999年8月12日，上海，女，同事",
    line2: "Jason，男，1991年3月12日 12:13，广州，前任",
  };
}

function detectRuntimeClient(args?: Record<string, string>): RuntimeClient {
  const explicit = args?.client?.trim().toLowerCase() ?? process.env.BAZI_PERSONA_CLIENT?.trim().toLowerCase();
  if (explicit === "claude" || explicit === "openclaw" || explicit === "hermes" || explicit === "generic") {
    return explicit;
  }

  const envKeys = Object.keys(process.env).map((key) => key.toUpperCase());
  if (envKeys.some((key) => key.startsWith("CLAUDE"))) {
    return "claude";
  }
  if (envKeys.some((key) => key.startsWith("OPENCLAW"))) {
    return "openclaw";
  }
  if (envKeys.some((key) => key.startsWith("HERMES"))) {
    return "hermes";
  }

  const runtimePathHints = [
    process.argv[1] ?? "",
    process.cwd(),
  ]
    .join(" ")
    .toLowerCase();
  if (runtimePathHints.includes("/.claude/")) {
    return "claude";
  }
  if (runtimePathHints.includes("/.openclaw/")) {
    return "openclaw";
  }
  if (runtimePathHints.includes("/.hermes/")) {
    return "hermes";
  }
  return "generic";
}

function buildCantianAsciiBanner(client: RuntimeClient): string {
  if (client !== "claude") {
    return "";
  }
  return [
    " ▗▄▄▖ ▗▄▖ ▗▖  ▗▖▗▄▄▄▖▗▄▄▄▖ ▗▄▖ ▗▖  ▗▖     ▗▄▖ ▗▄▄▄▖",
    "▐▌   ▐▌ ▐▌▐▛▚▖▐▌  █    █  ▐▌ ▐▌▐▛▚▖▐▌    ▐▌ ▐▌  █  ",
    "▐▌   ▐▛▀▜▌▐▌ ▝▜▌  █    █  ▐▛▀▜▌▐▌ ▝▜▌    ▐▛▀▜▌  █  ",
    "▝▚▄▄▖▐▌ ▐▌▐▌  ▐▌  █  ▗▄█▄▖▐▌ ▐▌▐▌  ▐▌    ▐▌ ▐▌▗▄█▄▖",
    "                                                    ",
    "                                                    ",
    "                                                    ",
  ].join("\n");
}

function formatCreateIntroCard(
  lang: OutputLanguage = "zh",
  locale = "zh-CN",
  client: RuntimeClient = "generic",
): string {
  const banner = buildCantianAsciiBanner(client);
  if (lang === "en") {
    const examples = buildEnglishIntroExamples(locale);
    const lines = [
      ...(banner ? [banner, ""] : []),
      "Bazi Persona Skill · Cantian AI",
      "",
      "Build a living persona from Bazi that can speak, decide, and adapt over time.",
      "Beyond chat, you can also explore relationship dynamics, state shifts, and future trends.",
      "",
      "What you get:",
      "",
      "- Beginner friendly: create in one step from birth info",
      "- Natural language first: just type naturally, no rigid command required",
      "- Cheatsheet mode: ask status, relationship, and trend questions with a God-view",
      "",
      "Try this:",
      "",
      examples.line1,
      "",
      "Or:",
      "",
      examples.line2,
    ];
    return lines.join("\n");
  }

  const examples = buildChineseIntroExamples(locale);
  const lines = [
    ...(banner ? [banner, ""] : []),
    "八字人格 Skill · 参天AI",
    "",
    "从八字出发，快速生成一个会说话、会判断、会变化的人格。",
    "除了聊天，也能继续探索关系、状态变化与未来趋势。",
    "",
    "你可以得到：",
    "",
    "- 零基础可用：输入出生信息即可创建",
    "- 自然语言可用：直接说人话，不用记命令",
    "- 作弊模式：上帝视角看状态、关系、趋势",
    "- You can also talk to me in English, Korean, or any language you like.",
    "",
    "可以这样开始：",
    "",
    examples.line1,
    "",
    "或者：",
    "",
    examples.line2,
  ];
  return lines.join("\n");
}

function buildAutoActivationLine(params: {
  name: string;
  preview: PreviewCard;
  relation?: string;
  lang?: OutputLanguage;
}): string {
  const lang = params.lang ?? "zh";
  if (lang === "en") {
    const relationPrefix = params.relation
      ? `From the "${params.relation}" perspective, `
      : "";
    const speakingFeel = params.preview.speakingFeel.replace(/[。！？!?]+$/u, "");
    return `Quick take: ${relationPrefix}${speakingFeel}. Say your question directly and I'll answer in this persona with a clear next step.`;
  }
  const relationPrefix = params.relation ? `站在“${params.relation}”这个关系里，` : "";
  const speakingFeel = params.preview.speakingFeel.replace(/[。！？!?]+$/u, "");
  return `先说重点：${relationPrefix}${speakingFeel}。你直接说问题，我会按这个人格给你结论和下一步。`;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function runtimeDir(dir: string): string {
  return path.join(dir, RUNTIME_DIR_NAME);
}

function runtimeFile(dir: string, fileName: string): string {
  return path.join(runtimeDir(dir), fileName);
}

function createEmptyCheatsheetSession(): CheatsheetSession {
  return {
    version: "v1",
    messages: [],
    updated_at: nowIso(),
  };
}

function collectCreateNarrativeContext(args: Record<string, string>): {
  personaFacts: string[];
  memoryEvents: MemoryEvent[];
  appendLedger: NonNullable<PersonaMeta["source_ledger"]>;
  incrementTextSources: number;
  incrementCorrections: number;
} {
  const blocks: Array<{ text: string; source: "manual" | "text"; ref: string }> = [];
  const directFields: Array<[string, string | undefined]> = [
    ["story", args.story],
    ["notes", args.notes],
    ["note", args.note],
    ["description", args.description],
    ["background", args.background],
    ["context", args.context],
    ["extra", args.extra],
    ["extra-info", args["extra-info"]],
    ["profile", args.profile],
    ["memory", args.memory],
    ["correction", args.correction],
  ];
  for (const [field, raw] of directFields) {
    const value = raw?.trim();
    if (!value) {
      continue;
    }
    blocks.push({
      text: value,
      source: "manual",
      ref: `create:${field}`,
    });
  }

  const textFilePath = args["text-file"]?.trim();
  const textFromFile = readMaybeFile(textFilePath);
  if (textFromFile) {
    blocks.push({
      text: textFromFile,
      source: "text",
      ref: textFilePath ?? "text-file",
    });
  }

  if (blocks.length === 0) {
    return {
      personaFacts: [],
      memoryEvents: [],
      appendLedger: [],
      incrementTextSources: 0,
      incrementCorrections: 0,
    };
  }

  const seen = new Set<string>();
  const memoryEvents: MemoryEvent[] = [];
  const personaFacts: string[] = [];
  const appendLedger: NonNullable<PersonaMeta["source_ledger"]> = [];

  for (const block of blocks) {
    const snippets = splitNarrativeSentences(block.text);
    if (snippets.length === 0) {
      continue;
    }
    appendLedger.push(
      buildSourceLedgerItem(
        block.source,
        block.ref,
        block.source === "manual" ? "high" : "medium",
      ),
    );
    for (const snippet of snippets) {
      const normalized = snippet.replace(/\s+/g, " ").trim();
      if (!normalized || seen.has(normalized)) {
        continue;
      }
      seen.add(normalized);
      const classified = classifyNarrativeMemory(normalized);
      memoryEvents.push(
        createMemoryEvent({
          type: classified.type,
          content: normalized,
          weight: classified.weight,
          source:
            classified.type === "correction"
              ? "user_correction"
              : block.source,
        }),
      );
      if (classified.type !== "correction") {
        personaFacts.push(normalized);
      }
    }
  }

  return {
    personaFacts: personaFacts.slice(0, 10),
    memoryEvents,
    appendLedger,
    incrementTextSources: appendLedger.length,
    incrementCorrections: memoryEvents.filter((x) => x.type === "correction").length,
  };
}

function buildFactFusionLines(
  facts: string[],
  primaryTenGod: string,
  currentLuckText: string,
): string {
  if (facts.length === 0) {
    return "- 当前没有额外现实信息，默认按八字结构给出解释。";
  }
  return facts
    .slice(0, 4)
    .map((fact) => {
      if (/(毕业|学历|学校|清华|北大|学习|读书)/.test(fact)) {
        return `- 「${fact}」会优先联动“决策框架与执行标准”来解释：以十神 ${primaryTenGod} 的判断风格，校准其学习路径与职业选择。`;
      }
      if (/(有钱|资产|收入|家里|家庭|财富|经济)/.test(fact)) {
        return `- 「${fact}」会联动“风险/金钱偏好 + 当前运势”解释：在 ${currentLuckText} 这段运势里，更看重资源配置节奏而非短期情绪消费。`;
      }
      if (/(漂亮|颜值|外貌|魅力|气质)/.test(fact)) {
        return `- 「${fact}」会联动“关系表现与沟通风格”解释：外在吸引力会放大互动反馈，但核心仍受八字底层边界与情绪调节机制约束。`;
      }
      return `- 「${fact}」会作为现实锚点参与解读：以人格主轴为主，结合当前运势判断其在关系、决策和压力场景中的实际表现。`;
    })
    .join("\n");
}


function parseStateMode(value?: string): "auto" | "manual" | undefined {
  if (!value) {
    return undefined;
  }
  const normalized = value.trim().toLowerCase();
  if (normalized === "auto" || normalized === "manual") {
    return normalized;
  }
  return undefined;
}

function parseRelationshipSet(args: Record<string, string>, current: string[]): {
  relationships: string[];
  activeRelationships: string[];
} {
  const fromAll = splitCsv(args.relationships);
  const add = splitCsv(args["add-relationship"]);
  const remove = new Set(splitCsv(args["remove-relationship"]));
  const active = splitCsv(args["set-active-relationships"]);

  let relationships =
    fromAll.length > 0 ? fromAll : mergeUnique(current, add);
  relationships = relationships.filter((x) => !remove.has(x));
  if (relationships.length === 0) {
    relationships = ["未指定关系"];
  }
  const activeRelationships = active.length > 0
    ? active.filter((x) => relationships.includes(x))
    : relationships;
  return {
    relationships,
    activeRelationships: activeRelationships.length > 0 ? activeRelationships : [relationships[0]],
  };
}

async function fetchUrlSnippet(url: string): Promise<string> {
  try {
    const response = await fetch(url, { redirect: "follow" });
    if (!response.ok) {
      return "";
    }
    const html = await response.text();
    const text = html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    return text.slice(0, 2000);
  } catch {
    return "";
  }
}

function buildSourceLedgerItem(
  type: "chat" | "text" | "url" | "manual",
  ref: string,
  quality: "high" | "medium" | "low" = "medium",
): NonNullable<PersonaMeta["source_ledger"]>[number] {
  const ts = nowIso();
  return {
    id: `${ts}_${Math.random().toString(36).slice(2, 8)}`,
    type,
    ref,
    quality,
    created_at: ts,
  };
}

function extractSectionContent(markdown: string, heading: string): string {
  const pattern = new RegExp(
    `##\\s*${escapeRegExp(heading)}\\s*\\n([\\s\\S]*?)(?=\\n##\\s|$)`,
  );
  const matched = pattern.exec(markdown)?.[1];
  return matched?.trim() ?? "";
}

function stripInternalDataSection(markdown: string): string {
  const pattern = new RegExp(
    `\\n?${escapeRegExp(INTERNAL_DATA_HEADING)}\\s*\\n\\\`\\\`\\\`json\\n[\\s\\S]*?\\n\\\`\\\`\\\`\\s*$`,
  );
  return markdown.replace(pattern, "").trim();
}

function parseInternalData(markdown: string): PersonaSkillInternalData | undefined {
  const pattern = new RegExp(
    `${escapeRegExp(INTERNAL_DATA_HEADING)}\\s*\\n\\\`\\\`\\\`json\\n([\\s\\S]*?)\\n\\\`\\\`\\\``,
  );
  const raw = pattern.exec(markdown)?.[1];
  if (!raw) {
    return undefined;
  }
  try {
    const parsed = JSON.parse(raw) as PersonaSkillInternalData;
    if (!parsed?.schema) {
      return undefined;
    }
    if (
      parsed.schema !== "bazi_persona_single_file_v1" &&
      parsed.schema !== "bazi_persona_skill_v2"
    ) {
      return undefined;
    }
    return parsed;
  } catch {
    return undefined;
  }
}

function toRuntimeBundleFromSkill(params: {
  skillText: string;
  internal?: PersonaSkillInternalData;
  fallbackMeta?: PersonaMeta;
  fallbackChart?: ChartLike;
}): RuntimeBundle | undefined {
  const persona = extractSectionContent(stripInternalDataSection(params.skillText), "Persona Rules");
  const state = extractSectionContent(
    stripInternalDataSection(params.skillText),
    "Current State Modifier",
  );

  if (!persona || !state) {
    return undefined;
  }

  if (params.internal?.schema === "bazi_persona_skill_v2") {
    return {
      core: {
        version: "v2",
        persona_markdown: persona,
        updated_at: params.internal.meta.updated_at,
      },
      state: {
        version: "v2",
        state_markdown: state,
        updated_at: params.internal.meta.updated_at,
        runtime: {
          mode: "auto",
          last_refreshed_at: params.internal.meta.updated_at,
          cheatsheet: {
            enabled: false,
            affinity: true,
          },
        },
      },
      evidence: {
        version: "v2",
        chart: params.internal.chart ?? {},
        updated_at: params.internal.meta.updated_at,
      },
      meta: params.internal.meta,
      memory: Array.isArray(params.internal.memory) ? params.internal.memory : [],
      memoryCheatsheet: [],
      memoryIndex: buildMemoryIndex(
        Array.isArray(params.internal.memory) ? params.internal.memory : [],
        params.internal.meta.active_relationships ?? params.internal.meta.relationships ?? [params.internal.meta.relation ?? "未指定关系"],
      ),
      memoryPins: [],
      cheatsheetSession: createEmptyCheatsheetSession(),
    };
  }

  if (params.internal?.schema === "bazi_persona_single_file_v1") {
    return {
      core: {
        version: "v2",
        persona_markdown: persona,
        updated_at: params.internal.meta.updated_at,
      },
      state: {
        version: "v2",
        state_markdown: state,
        updated_at: params.internal.meta.updated_at,
        runtime: {
          mode: "auto",
          last_refreshed_at: params.internal.meta.updated_at,
          cheatsheet: {
            enabled: false,
            affinity: true,
          },
        },
      },
      evidence: {
        version: "v2",
        chart: params.internal.chart ?? params.fallbackChart ?? {},
        updated_at: params.internal.meta.updated_at,
      },
      meta: params.internal.meta,
      memory: extractMemoryFromLegacyCorrections(params.internal.corrections ?? []),
      memoryCheatsheet: [],
      memoryIndex: buildMemoryIndex(
        extractMemoryFromLegacyCorrections(params.internal.corrections ?? []),
        params.internal.meta.active_relationships ?? params.internal.meta.relationships ?? [params.internal.meta.relation ?? "未指定关系"],
      ),
      memoryPins: [],
      cheatsheetSession: createEmptyCheatsheetSession(),
    };
  }

  if (!params.fallbackMeta) {
    return undefined;
  }

  return {
    core: {
      version: "v2",
      persona_markdown: persona,
      updated_at: params.fallbackMeta.updated_at,
    },
    state: {
      version: "v2",
      state_markdown: state,
      updated_at: params.fallbackMeta.updated_at,
      runtime: {
        mode: "auto",
        last_refreshed_at: params.fallbackMeta.updated_at,
        cheatsheet: {
          enabled: false,
          affinity: true,
        },
      },
    },
    evidence: {
      version: "v2",
      chart: params.fallbackChart ?? {},
      updated_at: params.fallbackMeta.updated_at,
    },
    meta: params.fallbackMeta,
    memory: [],
    memoryCheatsheet: [],
    memoryIndex: buildMemoryIndex([], params.fallbackMeta.active_relationships ?? params.fallbackMeta.relationships ?? [params.fallbackMeta.relation ?? "未指定关系"]),
    memoryPins: [],
    cheatsheetSession: createEmptyCheatsheetSession(),
  };
}

function loadRuntimeBundleFromDisk(dir: string): RuntimeBundle | undefined {
  const corePath = runtimeFile(dir, RUNTIME_CORE_FILE);
  const statePath = runtimeFile(dir, RUNTIME_STATE_FILE);
  const evidencePath = runtimeFile(dir, RUNTIME_EVIDENCE_FILE);
  const metaPath = runtimeFile(dir, RUNTIME_META_FILE);
  if (!fileExists(corePath) || !fileExists(statePath) || !fileExists(evidencePath) || !fileExists(metaPath)) {
    return undefined;
  }
  const core = readJson<RuntimeCore>(corePath);
  const state = readJson<RuntimeState>(statePath);
  const evidence = readJson<RuntimeEvidence>(evidencePath);
  const meta = readJson<PersonaMeta>(metaPath);
  const memoryRaw = readUtf8IfExists(runtimeFile(dir, RUNTIME_MEMORY_NORMAL_FILE)) ||
    readUtf8IfExists(runtimeFile(dir, RUNTIME_MEMORY_FILE));
  const memoryCheatsheetRaw = readUtf8IfExists(runtimeFile(dir, RUNTIME_MEMORY_CHEATSHEET_FILE));
  const memoryIndex = fileExists(runtimeFile(dir, RUNTIME_MEMORY_INDEX_FILE))
    ? readJson<RuntimeMemoryIndex>(runtimeFile(dir, RUNTIME_MEMORY_INDEX_FILE))
    : undefined;
  const memoryPins = fileExists(runtimeFile(dir, RUNTIME_MEMORY_PINS_FILE))
    ? readJson<RuntimeMemoryPin[]>(runtimeFile(dir, RUNTIME_MEMORY_PINS_FILE))
    : [];
  const cheatsheetSession = fileExists(runtimeFile(dir, RUNTIME_CHEATSHEET_SESSION_FILE))
    ? readJson<CheatsheetSession>(runtimeFile(dir, RUNTIME_CHEATSHEET_SESSION_FILE))
    : createEmptyCheatsheetSession();
  const parsedMemory = parseMemoryLog(memoryRaw);
  const parsedCheatsheetMemory = parseMemoryLog(memoryCheatsheetRaw);
  const relations = meta.active_relationships ?? meta.relationships ?? [meta.relation ?? "未指定关系"];
  return {
    core,
    state,
    evidence,
    meta,
    memory: parsedMemory,
    memoryCheatsheet: parsedCheatsheetMemory,
    memoryIndex: memoryIndex ?? buildMemoryIndex(parsedMemory, relations),
    memoryPins: memoryPins ?? [],
    cheatsheetSession,
  };
}

function saveRuntimeBundleToDisk(dir: string, bundle: RuntimeBundle): void {
  ensureDir(runtimeDir(dir));
  writeUtf8(runtimeFile(dir, RUNTIME_CORE_FILE), `${JSON.stringify(bundle.core, null, 2)}\n`);
  writeUtf8(runtimeFile(dir, RUNTIME_STATE_FILE), `${JSON.stringify(bundle.state, null, 2)}\n`);
  writeUtf8(
    runtimeFile(dir, RUNTIME_EVIDENCE_FILE),
    `${JSON.stringify(bundle.evidence, null, 2)}\n`,
  );
  writeUtf8(runtimeFile(dir, RUNTIME_META_FILE), `${JSON.stringify(bundle.meta, null, 2)}\n`);
  writeUtf8(runtimeFile(dir, RUNTIME_MEMORY_NORMAL_FILE), serializeMemoryLog(bundle.memory));
  writeUtf8(runtimeFile(dir, RUNTIME_MEMORY_FILE), serializeMemoryLog(bundle.memory));
  writeUtf8(
    runtimeFile(dir, RUNTIME_MEMORY_CHEATSHEET_FILE),
    serializeMemoryLog(bundle.memoryCheatsheet),
  );
  writeUtf8(
    runtimeFile(dir, RUNTIME_MEMORY_INDEX_FILE),
    `${JSON.stringify(bundle.memoryIndex, null, 2)}\n`,
  );
  writeUtf8(
    runtimeFile(dir, RUNTIME_MEMORY_PINS_FILE),
    `${JSON.stringify(bundle.memoryPins, null, 2)}\n`,
  );
  writeUtf8(
    runtimeFile(dir, RUNTIME_CHEATSHEET_SESSION_FILE),
    `${JSON.stringify(bundle.cheatsheetSession, null, 2)}\n`,
  );
}

function loadRuntimeBundle(params: {
  dir: string;
  skillText: string;
  internal?: PersonaSkillInternalData;
  legacyMeta?: PersonaMeta;
  legacyChart?: ChartLike;
}): RuntimeBundle | undefined {
  const fromDisk = loadRuntimeBundleFromDisk(params.dir);
  if (fromDisk) {
    return fromDisk;
  }
  const migrated = toRuntimeBundleFromSkill({
    skillText: params.skillText,
    internal: params.internal,
    fallbackMeta: params.legacyMeta,
    fallbackChart: params.legacyChart,
  });
  if (migrated) {
    saveRuntimeBundleToDisk(params.dir, migrated);
  }
  return migrated;
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

function hasRelationshipChanged(
  current: string[],
  next: string[],
): boolean {
  return current.join("|") !== next.join("|");
}

function pickPreviewValue(candidate: string, fallback: string): string {
  const normalized = candidate.trim();
  if (!normalized) {
    return fallback;
  }
  if (normalized.startsWith("未提取到")) {
    return fallback;
  }
  if (normalized.startsWith("Missing")) {
    return fallback;
  }
  return normalized;
}

function resolveConfirmMode(
  args: Record<string, string>,
): "auto_yes" | "auto_no" {
  const byFlag =
    parseYesNo(args.yes) ??
    parseYesNo(args.confirm) ??
    parseYesNo(args["auto-confirm"]) ??
    parseYesNo(args["non-interactive"]);
  if (byFlag !== undefined) {
    return byFlag ? "auto_yes" : "auto_no";
  }
  // 默认无阻塞：创建/更新在没有显式传入否定参数时直接继续写入。
  // 仅当显式传入 --yes false / --confirm false 时才取消写入。
  return "auto_yes";
}

async function askWriteConfirmation(
  args: Record<string, string>,
  _promptTitle: string,
): Promise<boolean> {
  const mode = resolveConfirmMode(args);
  return mode === "auto_yes";
}

function normalizeBirthGender(gender: Gender): BaziGender {
  return gender === "女" ? "female" : "male";
}

function normalizeCalendarType(value?: string): CalendarType {
  return value === "lunar" ? "lunar" : "solar";
}

function parsePreferredLanguage(value?: string): "auto" | "zh" | "en" {
  if (!value) {
    return "auto";
  }
  const normalized = value.trim().toLowerCase();
  if (normalized === "zh" || normalized === "cn" || normalized === "中文" || normalized === "chinese") {
    return "zh";
  }
  if (normalized === "en" || normalized === "english") {
    return "en";
  }
  return "auto";
}

function hasCjk(text: string): boolean {
  return /[\u3400-\u9fff]/u.test(text);
}

function detectLanguageFromText(text?: string): OutputLanguage | undefined {
  if (!text) {
    return undefined;
  }
  if (hasCjk(text)) {
    return "zh";
  }
  if (/[A-Za-z]/.test(text)) {
    return "en";
  }
  return undefined;
}

function resolveOutputLanguage(params: {
  args?: Record<string, string>;
  meta?: PersonaMeta;
  message?: string;
}): OutputLanguage {
  const argLang = parsePreferredLanguage(params.args?.lang);
  if (argLang === "zh" || argLang === "en") {
    return argLang;
  }
  const messageLang = detectLanguageFromText(params.message);
  if (messageLang) {
    return messageLang;
  }
  if (params.meta?.preferred_language === "zh" || params.meta?.preferred_language === "en") {
    return params.meta.preferred_language;
  }
  const envLang =
    process.env.LC_MESSAGES?.trim() ||
    process.env.LANG?.trim() ||
    process.env.LC_ALL?.trim();
  if (envLang) {
    const normalized = envLang.toLowerCase();
    if (normalized.startsWith("zh")) {
      return "zh";
    }
    if (normalized.startsWith("en")) {
      return "en";
    }
  }
  return "zh";
}

function pickLangLine(lang: OutputLanguage, zh: string, en: string): string {
  return lang === "en" ? en : zh;
}

async function resolveChartForCreate(args: Record<string, string>): Promise<ChartLike> {
  const chartFromFile = readMaybeFile(args["chart-file"]);
  if (chartFromFile && chartFromFile.trim()) {
    return JSON.parse(chartFromFile) as ChartLike;
  }

  const rawDate = args["birth-date"] ?? "";
  const rawTime = args["birth-time"];
  const normalizedDate = normalizeDateInput(rawDate);
  const normalizedTime = rawTime ? normalizeTimeInput(rawTime) : undefined;
  validateDate(normalizedDate);
  if (normalizedTime) {
    validateTime(normalizedTime);
  }

  const built = await buildChart({
    name: args.name.trim(),
    date: normalizedDate,
    time: normalizedTime,
    location: args["birth-location"] ?? args["birth-place"],
    gender: normalizeBirthGender(normalizeGender(args.gender)),
    calendarType: normalizeCalendarType(args.calendar),
    sect: args.sect === "1" ? 1 : 2,
    sourceCommand: "/bazi-persona create",
    trueSolarMode:
      args["true-solar"] === "on" || args["true-solar"] === "off"
        ? (args["true-solar"] as "on" | "off")
        : "auto",
    longitude: args.longitude ? Number.parseFloat(args.longitude) : undefined,
    dayRolloverHour: args["day-rollover"] ? Number.parseInt(args["day-rollover"], 10) : 23,
  });
  return built as unknown as ChartLike;
}

async function resolveRelation(
  args: Record<string, string>,
  lang: OutputLanguage,
): Promise<string | undefined> {
  const direct = args.relation?.trim();
  if (direct) {
    return direct;
  }
  const input = await promptOptionalText({
    hint:
      lang === "en"
        ? "Relationship (recommended): coworker / boss / partner / friend / family / self / celebrity / none"
        : "关系补充（建议填写）：同事 / 老板 / 伴侣 / 朋友 / 家人 / 自己 / 名人 / 无关系",
    prompt:
      lang === "en"
        ? "What's your relationship with this person? (Enter to skip)"
        : "你和这个人的关系是？（回车可跳过）",
  });
  return input?.trim();
}

async function resolveRelationships(args: Record<string, string>): Promise<{
  relationships: string[];
  activeRelationships: string[];
}> {
  const fromArgs = splitCsv(args.relationships);
  if (fromArgs.length > 0) {
    const active = splitCsv(args["set-active-relationships"]);
    return {
      relationships: fromArgs,
      activeRelationships: active.length > 0 ? active : fromArgs,
    };
  }
  const lang = resolveOutputLanguage({ args });
  const relation = await resolveRelation(args, lang);
  const fallback = relation ? [relation] : ["未指定关系"];
  return {
    relationships: fallback,
    activeRelationships: fallback,
  };
}

function sameDay(a: string, b: string): boolean {
  return a.slice(0, 10) === b.slice(0, 10);
}

function resolveStateRuntime(
  current: RuntimeState["runtime"] | undefined,
  args: Record<string, string>,
): StateRuntime {
  const cheatsheet = current?.cheatsheet ?? { enabled: false, affinity: true };
  const now = nowIso();
  const modeFromArgs = parseStateMode(args["state-mode"]);
  if (args["resume-auto"] === "true" || args["resume-auto"] === "1") {
    return {
      mode: "auto",
      last_refreshed_at: now,
      cheatsheet,
    };
  }
  if (modeFromArgs === "manual") {
    return {
      mode: "manual",
      last_refreshed_at: current?.last_refreshed_at ?? now,
      locked_at: args.at ?? current?.locked_at ?? now,
      cheatsheet,
    };
  }
  if (modeFromArgs === "auto") {
    return {
      mode: "auto",
      last_refreshed_at: current?.last_refreshed_at ?? now,
      cheatsheet,
    };
  }
  return current ?? {
    mode: "auto",
    last_refreshed_at: now,
    cheatsheet,
  };
}

async function queryFlowStatus(args: Record<string, string>): Promise<void> {
  ensureRequired(args, ["slug"]);
  const baseDir = resolveBaseDir(args);
  const slug = args.slug;
  const dir = personaDir(baseDir, slug);
  if (!fs.existsSync(dir)) {
    throw new Error(
      [
        `找不到人格：${slug}`,
        "请先确认 ID，或先执行 /bazi-persona list 查看可用列表。",
      ].join("\n"),
    );
  }

  const skillText = readUtf8IfExists(path.join(dir, "SKILL.md"));
  const internal = parseInternalData(skillText);
  const legacyMetaPath = path.join(dir, "meta.json");
  const legacyMeta = fileExists(legacyMetaPath) ? readJson<PersonaMeta>(legacyMetaPath) : undefined;
  const legacyChartPath = path.join(dir, "chart.json");
  const legacyChart = fileExists(legacyChartPath) ? (readJson(legacyChartPath) as ChartLike) : undefined;
  const runtime = loadRuntimeBundle({
    dir,
    skillText,
    internal,
    legacyMeta,
    legacyChart,
  });
  if (!runtime) {
    throw new Error("当前人格缺少运行数据，暂时无法查询流年流月流日流时。");
  }
  const uiLang = resolveOutputLanguage({ args, meta: runtime.meta });
  const runtimeMode = resolveStateRuntime(runtime.state.runtime, args);
  const now = nowIso();
  const effectiveAt =
    runtimeMode.mode === "manual"
      ? runtimeMode.locked_at ?? args.at ?? now
      : args.at ?? now;
  const shouldRefresh =
    runtimeMode.mode === "manual"
      ? true
      : !runtimeMode.last_refreshed_at || !sameDay(runtimeMode.last_refreshed_at, now);
  const flowSnapshot = await buildFlowSnapshotMarkdown({
    chart: runtime.evidence.chart,
    meta: runtime.meta,
    at: effectiveAt,
    lang: uiLang,
  });
  if (shouldRefresh || args["state-mode"] || args["resume-auto"]) {
    runtime.state.runtime = {
      ...runtimeMode,
      last_refreshed_at: now,
    };
    runtime.state.updated_at = now;
    saveRuntimeBundleToDisk(dir, runtime);
    writeUtf8(
      path.join(dir, "SKILL.md"),
      buildPersonaSkillFile({
        slug: runtime.meta.slug,
        name: runtime.meta.name,
        chart: runtime.evidence.chart,
        memory: runtime.memory,
        meta: runtime.meta,
        persona: runtime.core.persona_markdown,
        state: runtime.state.state_markdown,
        flowSnapshot,
        stateRuntime: runtime.state.runtime,
        memoryPins: runtime.memoryPins,
      }),
    );
  }
  process.stdout.write(
    [
      pickLangLine(uiLang, `时运查询（${runtime.meta.name}）`, `Flow Snapshot (${runtime.meta.name})`),
      pickLangLine(
        uiLang,
        `状态模式：${runtime.state.runtime?.mode ?? "auto"}${runtime.state.runtime?.locked_at ? `（锁定：${runtime.state.runtime.locked_at}）` : ""}`,
        `State mode: ${runtime.state.runtime?.mode ?? "auto"}${runtime.state.runtime?.locked_at ? ` (locked at: ${runtime.state.runtime.locked_at})` : ""}`,
      ),
      flowSnapshot,
    ].join("\n") + "\n",
  );
}

async function queryCalendarStatus(args: Record<string, string>): Promise<void> {
  const uiLang = resolveOutputLanguage({ args });
  const input = args.at ?? args.date;
  const queryAt = parseDateTimeInput(input);
  const calendar = await queryChineseCalendar({
    year: queryAt.year,
    month: queryAt.month,
    day: queryAt.day,
  });
  if (!calendar) {
    throw new Error(
      pickLangLine(
        uiLang,
        "万年历暂不可用（cantian-tymext 未返回黄历数据）。",
        "Calendar is currently unavailable (cantian-tymext did not return almanac data).",
      ),
    );
  }
  const lines = uiLang === "en"
    ? [
        "Calendar Snapshot",
        `- Query time: ${queryAt.display}`,
        `- Solar: ${calendar.公历}`,
        `- Lunar: ${calendar.农历}`,
        `- Ganzhi date: ${calendar.干支日期}`,
        `- Zodiac: ${calendar.生肖}`,
        `- Solar term: ${formatSolarTermInfo(calendar.节气, uiLang)}`,
        `- Festivals: lunar ${calendar.农历节日 ?? "-"} | solar ${calendar.公历节日 ?? "-"}`,
        `- Almanac: Do ${calendar.宜} | Avoid ${calendar.忌}`,
        `- Clash/Omen: ${calendar.冲煞}`,
        `- PengZu taboo: ${calendar.彭祖百忌}`,
      ]
    : [
        "万年历查询",
        `- 查询时间：${queryAt.display}`,
        `- 公历：${calendar.公历}`,
        `- 农历：${calendar.农历}`,
        `- 干支日期：${calendar.干支日期}`,
        `- 生肖：${calendar.生肖}`,
        `- 节气：${formatSolarTermInfo(calendar.节气, uiLang)}`,
        `- 节日：农历 ${calendar.农历节日 ?? "无"}｜公历 ${calendar.公历节日 ?? "无"}`,
        `- 黄历宜忌：宜 ${calendar.宜}｜忌 ${calendar.忌}`,
        `- 冲煞：${calendar.冲煞}`,
        `- 彭祖百忌：${calendar.彭祖百忌}`,
      ];
  process.stdout.write(`${lines.join("\n")}\n`);
}

function buildPersonaSkillFile(params: {
  slug: string;
  name: string;
  chart: ChartLike;
  memory: MemoryEvent[];
  meta: PersonaMeta;
  persona: string;
  state: string;
  flowSnapshot?: string;
  stateRuntime?: RuntimeState["runtime"];
  memoryPins?: RuntimeMemoryPin[];
}): string {
  const fiveElementTrend = inferFiveElementTrend(params.chart.five_elements);
  const dayMaster = params.chart.day_master || "未知";
  const primaryTenGod = pickPrimaryTenGod(params.chart.ten_gods);
  const mbtiProfile = inferMbtiFromBazi({
    day_master: params.chart.day_master,
    raw_bazi: params.chart.raw_bazi,
    ten_gods: params.chart.ten_gods,
    five_elements: params.chart.five_elements,
  });
  const currentLuck = describeLuckCycle(pickCurrentLuck(params.chart));
  const baziSnapshot = markdownBaziSnapshot(params.chart);
  const realityFacts = pickRealityFactsFromMemory(params.memory);
  const realityFactText =
    realityFacts.length > 0
      ? realityFacts.map((item) => `- ${item}`).join("\n")
      : "- 暂无现实锚点";
  const realityFusionText = buildFactFusionLines(
    realityFacts,
    primaryTenGod,
    currentLuck,
  );
  const originalRelations = collectOriginalRelations(params.chart);
  const relationshipLabel = (params.meta.active_relationships ?? params.meta.relationships ?? [params.meta.relation ?? "未指定关系"])
    .filter(Boolean)
    .join(" / ");
  const sourceLedgerText =
    params.meta.source_ledger && params.meta.source_ledger.length > 0
      ? params.meta.source_ledger
          .slice(-10)
          .reverse()
          .map((x) => `- [${x.type}/${x.quality}] ${x.ref}（${x.created_at.slice(0, 10)}）`)
          .join("\n")
      : "- 暂无来源台账";
  const memoryText =
    params.memory.length > 0
      ? params.memory
          .slice(-8)
          .reverse()
          .map(
            (item) =>
              `- [${item.type}/${item.weight}] ${item.content}（${item.created_at.slice(0, 10)}）`,
          )
          .join("\n")
      : "- 暂无记忆事件";
  const memoryPinText =
    params.memoryPins && params.memoryPins.length > 0
      ? params.memoryPins.map((x) => `- [PIN/${x.type}] ${x.content}`).join("\n")
      : "- 暂无固化记忆";
  const analyzerPromptSummary = summarizePromptForSkill(readPromptTemplate("bazi_analyzer.md"));
  const personaPromptSummary = summarizePromptForSkill(readPromptTemplate("persona_builder.md"));
  const statePromptSummary = summarizePromptForSkill(readPromptTemplate("state_builder.md"));
  const skillPromptSummary = summarizePromptForSkill(readPromptTemplate("skill_builder.md"));

  return `---
name: ${params.slug}
description: Bazi based persona skill for ${params.name}
user-invocable: true
---

# Persona Summary

${params.name} 的人格由长期结构与近期状态共同驱动。先按人格规则决定表达和判断，再完成任务。
- 当前生效关系：${relationshipLabel}
- 状态模式：${params.stateRuntime?.mode ?? "auto"}${params.stateRuntime?.locked_at ? `（锁定时点：${params.stateRuntime.locked_at}）` : ""}
- 语言偏好 / Language Preference：${params.meta.preferred_language ?? "auto"}

## Persona Rules

${params.persona}

## Current State Modifier

${params.state}

## Prompt Workflow (Agent-first)

### Step 1 · Bazi Analyzer
${analyzerPromptSummary}

### Step 2 · Persona Builder
${personaPromptSummary}

### Step 3 · State Builder
${statePromptSummary}

### Step 4 · Skill Builder
${skillPromptSummary}

### Workflow Inputs (Runtime)
- 关系上下文：${relationshipLabel}
- 精度模式：${params.meta.accuracy_mode}
- 实时记忆数量：${params.memory.length}
- Reality Anchors：${realityFacts.length > 0 ? realityFacts.join(" / ") : "暂无"}

## Bazi Evidence

${baziSnapshot}
- 五行趋势提炼：${fiveElementTrend}
- 十神主轴：${primaryTenGod}
- MBTI 映射：${mbtiProfile.mbti_type}（EI ${mbtiProfile.scores.ScoreEI}｜SN ${mbtiProfile.scores.ScoreSN}｜TF ${mbtiProfile.scores.ScoreTF}｜JP ${mbtiProfile.scores.ScoreJP}）
- 当前大运提炼：${currentLuck}
- 模型精度模式：${params.meta.accuracy_mode}

## Reality Anchors (Auto)

${realityFactText}

### Reality × Bazi Linkage
${realityFusionText}

## 原局刑冲合会（提炼）

${formatRelationList(originalRelations, "未检出明显刑冲合会")}

### 原局关系影响解读
${interpretRelationEffects(originalRelations)}

## 时运刑冲合会（生成时刻）

${params.flowSnapshot ?? "- 未计算"}

## Source Ledger

${sourceLedgerText}

## Memory

${memoryText}

## Memory Pins

${memoryPinText}

## Language Policy / 语言策略

- 默认按用户当前输入语言回复（中文/English/其他语种均可）。
- If the user switches language, keep persona style but switch language immediately.
- 若用户明确指定语言（如“请用英文”），优先按指定语言回复。
- Mixed-language input: follow the dominant language and keep key terms bilingual when useful.

## Memory Protocol

- 只要用户提到明确事实或过往经历，必须记录为记忆（优先记为 behavior_fact）。
- 出现明确纠正时，记录为 correction，优先级最高。
- 出现稳定口头禅、说话习惯或表达节奏时，记录为 style_pattern。
- 记录应短、具体、可复用，避免空泛评价。

## Execution Rules

1. 先按 Persona Rules 决定表达、判断与互动方式。
2. 再完成用户任务本身。
3. 输出全程保持人格一致性，不跳出角色。
4. 任务与近期状态有关时，优先参考 Current State Modifier。
5. 不向用户暴露内部脚本、文件路径、命令或工具调用细节。
6. 识别到具体事实或过往经历时，立即写入记忆并在后续对话中体现。
7. 普通模式（默认）禁止主动输出命理术语（八字/日主/五行/十神/流年/盘面/合盘）；除非用户明确要求命理视角。
8. 进入 cheatsheet 模式时，才输出深度命理分析与好感度评分。
9. 在任何模式下，优先按用户当前语言回复并保持人格一致。
`;
}

function personaDir(baseDir: string, slug: string): string {
  return path.join(baseDir, slug);
}

function resolveBaseDir(args: Record<string, string>): string {
  return (
    args["base-dir"] ??
    process.env.BAZI_PERSONA_HOME ??
    path.join(os.homedir(), ".bazi-personas")
  );
}

function buildIndex(baseDir: string): PersonaIndexItem[] {
  if (!fs.existsSync(baseDir)) {
    return [];
  }
  return fs
    .readdirSync(baseDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => {
      const dir = path.join(baseDir, entry.name);
      const runtimeMetaPath = runtimeFile(dir, RUNTIME_META_FILE);
      if (fileExists(runtimeMetaPath)) {
        const meta = readJson<PersonaMeta>(runtimeMetaPath);
        return {
          slug: meta.slug,
          name: meta.name,
          version: meta.version,
          created_at: meta.created_at,
          updated_at: meta.updated_at,
          source_count:
            meta.source_stats.chat_count +
            meta.source_stats.text_count +
            meta.source_stats.correction_count,
        } satisfies PersonaIndexItem;
      }
      const skillPath = path.join(baseDir, entry.name, "SKILL.md");
      if (!fs.existsSync(skillPath)) {
        return null;
      }
      const skillText = readUtf8IfExists(skillPath);
      const meta = parseInternalData(skillText)?.meta;
      if (!meta) {
        return null;
      }
      return {
        slug: meta.slug,
        name: meta.name,
        version: meta.version,
        created_at: meta.created_at,
        updated_at: meta.updated_at,
        source_count:
          meta.source_stats.chat_count +
          meta.source_stats.text_count +
          meta.source_stats.correction_count,
      } satisfies PersonaIndexItem;
    })
    .filter((item): item is PersonaIndexItem => item !== null)
    .sort((a, b) => b.updated_at.localeCompare(a.updated_at));
}

function buildLaunchProfiles(baseDir: string): LaunchProfileItem[] {
  if (!fs.existsSync(baseDir)) {
    return [];
  }
  const rows: LaunchProfileItem[] = [];
  const dirs = fs
    .readdirSync(baseDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory());
  for (const entry of dirs) {
    const dir = path.join(baseDir, entry.name);
    const metaPath = runtimeFile(dir, RUNTIME_META_FILE);
    const evidencePath = runtimeFile(dir, RUNTIME_EVIDENCE_FILE);
    if (!fileExists(metaPath)) {
      continue;
    }
    try {
      const meta = readJson<PersonaMeta>(metaPath);
      const relationship = (
        meta.active_relationships ??
        meta.relationships ??
        [meta.relation ?? "未指定关系"]
      )
        .filter(Boolean)
        .join(" / ");
      let bazi = "未提取";
      if (fileExists(evidencePath)) {
        const evidence = readJson<RuntimeEvidence>(evidencePath);
        bazi = summarizeValue(asRecord(evidence.chart.raw_bazi)?.["八字"], 28);
      }
      rows.push({
        id: meta.slug,
        name: meta.name,
        relationship: relationship || "未指定关系",
        bazi,
        updated_at: meta.updated_at,
      });
    } catch {
      continue;
    }
  }
  return rows.sort((a, b) => b.updated_at.localeCompare(a.updated_at)).slice(0, 8);
}

function formatLaunchProfiles(rows: LaunchProfileItem[], lang: OutputLanguage): string {
  if (rows.length === 0) {
    return pickLangLine(
      lang,
      "当前还没有已创建的人格。你可以直接用一句话开始创建。",
      "No personas found yet. You can start with one natural sentence.",
    );
  }
  const header = pickLangLine(lang, `当前已有角色（${rows.length}）`, `Existing Personas (${rows.length})`);
  const title = lang === "en"
    ? "| Name | ID | Relation | Bazi |"
    : "| 角色名称 | ID | 关系 | 八字摘要 |";
  const divider = "| --- | --- | --- | --- |";
  const body = rows.map((row) => {
    const safe = (value: string, max: number): string => {
      const t = value.replace(/\s+/g, " ").trim();
      return t.length > max ? `${t.slice(0, Math.max(1, max - 1))}…` : t;
    };
    return `| ${safe(row.name, 14)} | ${safe(row.id, 18)} | ${safe(row.relationship, 18)} | ${safe(row.bazi, 36)} |`;
  });
  return [header, title, divider, ...body].join("\n");
}

function printWelcome(args: Record<string, string>): void {
  const uiLang = resolveOutputLanguage({ args });
  const introLocale = resolveIntroLocale({ args, lang: uiLang });
  const client = detectRuntimeClient(args);
  const baseDir = resolveBaseDir(args);
  const launchProfiles = buildLaunchProfiles(baseDir);
  const commonCommands = uiLang === "en"
    ? [
        "How to use:",
        "- /bazi-persona + natural language",
        "- /bazi-persona help",
        "- /bazi-persona agent enable",
      ]
    : [
        "使用方式：",
        "- /bazi-persona + 自然语言",
        "- /bazi-persona help",
        "- /bazi-persona agent enable",
      ];
  process.stdout.write(
    [
      formatCreateIntroCard(uiLang, introLocale, client),
      "",
      formatLaunchProfiles(launchProfiles, uiLang),
      "",
      ...commonCommands,
    ].join("\n") + "\n",
  );
}

async function createPersona(args: Record<string, string>): Promise<void> {
  if (!args["birth-location"] && args["birth-place"]) {
    args["birth-location"] = args["birth-place"];
  }
  ensureRequired(args, ["name", "gender", "birth-date", "birth-location"]);
  const baseDir = resolveBaseDir(args);
  ensureDir(baseDir);
  const uiLang = resolveOutputLanguage({ args });
  const introLocale = resolveIntroLocale({ args, lang: uiLang });
  const runtimeClient = detectRuntimeClient(args);
  const launchProfiles = buildLaunchProfiles(baseDir);
  process.stdout.write(`${formatCreateIntroCard(uiLang, introLocale, runtimeClient)}\n`);
  if (launchProfiles.length > 0) {
    process.stdout.write(`\n${formatLaunchProfiles(launchProfiles, uiLang)}\n`);
  }
  process.stdout.write("\n");

  const name = args.name.trim();
  const slug = args.slug ? toSlug(args.slug) : toSlug(name);
  const relationshipSetup = await resolveRelationships(args);
  const dir = personaDir(baseDir, slug);
  if (fs.existsSync(path.join(dir, "SKILL.md")) || fs.existsSync(runtimeDir(dir))) {
    throw new Error(
      [
        `ID 已存在：${slug}`,
        "请改用新的 ID，或使用 update 命令更新已有人格。",
      ].join("\n"),
    );
  }

  const chart = await resolveChartForCreate(args);
  const createContext = collectCreateNarrativeContext(args);
  const renderMode = resolveRenderMode(args);
  const generatedPack = (renderMode === "agent" ? buildAgentFirstPersonaPack : buildPersonaFromChart)({
    name,
    relationships: relationshipSetup.relationships,
    activeRelationships: relationshipSetup.activeRelationships,
    gender: normalizeGender(args.gender),
    chart,
    supplementalFacts: createContext.personaFacts,
  });
  const personaOverride = readMaybeFile(args["persona-file"]);
  const stateOverride = readMaybeFile(args["state-file"]);
  const persona = personaOverride || generatedPack.persona;
  const state = stateOverride || generatedPack.state;
  const accuracyMode = detectAccuracyMode(chart);
  const derivedPreview = derivePreviewFromPersonaState(persona, state);
  const preview = {
    summary: args["preview-summary"] ?? pickPreviewValue(derivedPreview.summary, generatedPack.preview.summary),
    speakingFeel: args["preview-speaking"] ?? pickPreviewValue(derivedPreview.speakingFeel, generatedPack.preview.speakingFeel),
    decisionFocus: args["preview-decision"] ?? pickPreviewValue(derivedPreview.decisionFocus, generatedPack.preview.decisionFocus),
    stressShift: args["preview-stress"] ?? pickPreviewValue(derivedPreview.stressShift, generatedPack.preview.stressShift),
    currentState: args["preview-current"] ?? pickPreviewValue(derivedPreview.currentState, generatedPack.preview.currentState),
  };
  process.stdout.write(`${formatPreviewCard(preview, uiLang)}\n`);
  const confirmed = await askWriteConfirmation(
    args,
    "即将写入人格目录",
  );
  if (!confirmed) {
    process.stdout.write("已取消写入。你可以补充信息后再试。\n");
    return;
  }

  ensureDir(dir);

  const normalizedBirthDate = normalizeDateInput(args["birth-date"]);
  const normalizedBirthTime = args["birth-time"]
    ? normalizeTimeInput(args["birth-time"])
    : undefined;

  const meta = createInitialMeta({
    name,
    slug,
    gender: normalizeGender(args.gender),
    relation: relationshipSetup.relationships[0],
    preferredLanguage: parsePreferredLanguage(args.lang),
    relationships: relationshipSetup.relationships,
    activeRelationships: relationshipSetup.activeRelationships,
    birth: {
      date: normalizedBirthDate,
      time: normalizedBirthTime,
      location: args["birth-location"] ?? args["birth-place"],
      calendar_type: args.calendar === "lunar" ? "lunar" : "solar",
    },
    command: "/bazi-persona create",
    accuracyMode,
  });
  if (createContext.incrementTextSources > 0) {
    meta.source_stats.text_count += createContext.incrementTextSources;
  }
  if (createContext.incrementCorrections > 0) {
    meta.corrections_count += createContext.incrementCorrections;
    meta.source_stats.correction_count += createContext.incrementCorrections;
  }
  if (createContext.appendLedger.length > 0) {
    meta.source_ledger = [...(meta.source_ledger ?? []), ...createContext.appendLedger];
  }

  const flowSnapshot = await buildFlowSnapshotMarkdown({
    chart,
    meta,
    lang: uiLang,
  });
  const runtimeBundle: RuntimeBundle = {
    core: {
      version: "v2",
      persona_markdown: persona,
      updated_at: meta.updated_at,
    },
    state: {
      version: "v2",
      state_markdown: state,
      updated_at: meta.updated_at,
      runtime: {
        mode: parseStateMode(args["state-mode"]) ?? "auto",
        last_refreshed_at: meta.updated_at,
        cheatsheet: {
          enabled: false,
          affinity: true,
        },
      },
    },
    evidence: {
      version: "v2",
      chart,
      updated_at: meta.updated_at,
    },
    meta,
    memory: createContext.memoryEvents,
    memoryCheatsheet: [],
    memoryIndex: buildMemoryIndex(
      createContext.memoryEvents,
      relationshipSetup.activeRelationships,
    ),
    memoryPins: [],
    cheatsheetSession: createEmptyCheatsheetSession(),
  };
  const skill = buildPersonaSkillFile({
    slug,
    name,
    chart,
    memory: createContext.memoryEvents,
    meta,
    persona,
    state,
    flowSnapshot,
    stateRuntime: runtimeBundle.state.runtime,
    memoryPins: runtimeBundle.memoryPins,
  });
  saveRuntimeBundleToDisk(dir, runtimeBundle);
  writeUtf8(path.join(dir, "SKILL.md"), skill);

  process.stdout.write(
    [
      pickLangLine(uiLang, "创建成功。", "Created successfully."),
      pickLangLine(uiLang, `目录：${dir}`, `Directory: ${dir}`),
      pickLangLine(uiLang, `触发词：/${slug}`, `Trigger: /${slug}`),
      pickLangLine(
        uiLang,
        "入口：/bazi-persona（直接说自然语言即可）",
        "Entrypoint: /bazi-persona (natural language first)",
      ),
      pickLangLine(uiLang, `已自动切换到角色模式：${name}`, `Auto-switched to persona mode: ${name}`),
      pickLangLine(
        uiLang,
        `角色开场：${buildAutoActivationLine({
          name,
          preview,
          relation: relationshipSetup.activeRelationships.join(" / "),
          lang: uiLang,
        })}`,
        `Opening line: ${buildAutoActivationLine({
          name,
          preview,
          relation: relationshipSetup.activeRelationships.join(" / "),
          lang: uiLang,
        })}`,
      ),
      pickLangLine(
        uiLang,
        "你也可以直接自然语言继续聊，不需要再记任何命令。",
        "You can continue in natural language now, no extra command needed.",
      ),
      pickLangLine(
        uiLang,
        "想用上帝视角：直接说“打开作弊模式”，就能问状态、合盘、经历和趋势。",
        'Want God-view insights? Say: "Open cheatsheet mode".',
      ),
      pickLangLine(
        uiLang,
        "增强建议：1) 导入聊天片段 2) 补充现实经历 3) 添加公开链接资料",
        "Boost fit quickly: 1) add chat snippets 2) add real-life facts 3) add public links",
      ),
      ...(createContext.memoryEvents.length > 0
        ? [
            pickLangLine(
              uiLang,
              `已吸收创建时补充信息：${createContext.memoryEvents.length} 条，并联动八字用于人格细化。`,
              `Absorbed ${createContext.memoryEvents.length} supplemental notes from creation input and linked them with Bazi interpretation.`,
            ),
          ]
        : []),
      pickLangLine(
        uiLang,
        `如需一键开启 Claude/OpenClaw/Hermes 便捷启动：npm run bazi:agent:enable -- --slug ${slug}`,
        `To enable one-command startup in Claude/OpenClaw/Hermes: npm run bazi:agent:enable -- --slug ${slug}`,
      ),
      pickLangLine(uiLang, "你下一句直接说需求即可，我会持续按该人格回应。", "Send your next message naturally and I'll stay in persona."),
    ].join("\n") + "\n",
  );
}

async function updatePersona(args: Record<string, string>): Promise<void> {
  ensureRequired(args, ["slug"]);
  const baseDir = resolveBaseDir(args);
  const slug = args.slug;
  const dir = personaDir(baseDir, slug);
  if (!fs.existsSync(dir)) {
    throw new Error(
      [
        `找不到人格：${slug}`,
        "请先确认 ID，或先执行 /bazi-persona list 查看可用列表。",
      ].join("\n"),
    );
  }
  const skillPath = path.join(dir, "SKILL.md");
  const skillText = readUtf8IfExists(skillPath);
  const internal = parseInternalData(skillText);

  const metaPath = path.join(dir, "meta.json");
  const legacyMeta = fileExists(metaPath) ? readJson<PersonaMeta>(metaPath) : undefined;
  const chartPath = path.join(dir, "chart.json");
  const legacyChart = fileExists(chartPath) ? (readJson(chartPath) as ChartLike) : undefined;
  const runtime = loadRuntimeBundle({
    dir,
    skillText,
    internal,
    legacyMeta,
    legacyChart,
  });
  if (!runtime) {
    throw new Error(
      [
        "当前人格缺少可更新的数据结构。",
        "请先重新创建该人格，或确认 SKILL.md 未被手动破坏。",
      ].join("\n"),
    );
  }

  let currentPersona = runtime.core.persona_markdown;
  let currentState = runtime.state.state_markdown;
  let currentChart: ChartLike = runtime.evidence.chart;
  let currentMemory = [...runtime.memory];
  let currentCheatsheetMemory = [...runtime.memoryCheatsheet];
  let currentMemoryPins = [...runtime.memoryPins];
  const inferredPreview = derivePreviewFromPersonaState(currentPersona, currentState);
  const personaPatch = readMaybeFile(args["persona-patch-file"]);
  const statePatch = readMaybeFile(args["state-patch-file"]);
  const correction = args.correction?.trim();
  const memoryInput = args.memory?.trim();
  const messageText = args.message?.trim();
  const chatText = readMaybeFile(args["chat-file"]);
  const textMaterial = readMaybeFile(args["text-file"]);
  const urls = splitCsv(args.url);
  const memoryType = parseMemoryType(args["memory-type"]);
  const memoryWeight = parseMemoryWeight(args["memory-weight"]);
  const incomingChart = readMaybeFile(args["chart-file"]);
  let messageCorrectionCount = 0;
  const relationshipSet = parseRelationshipSet(
    args,
    runtime.meta.relationships ?? [runtime.meta.relation ?? "未指定关系"],
  );
  const previousRelationships = runtime.meta.relationships ?? [runtime.meta.relation ?? "未指定关系"];
  const previousActiveRelationships = runtime.meta.active_relationships ?? previousRelationships;
  const relationshipChanged =
    hasRelationshipChanged(previousRelationships, relationshipSet.relationships) ||
    hasRelationshipChanged(previousActiveRelationships, relationshipSet.activeRelationships);
  const runtimeMode = resolveStateRuntime(runtime.state.runtime, args);
  const uiLang = resolveOutputLanguage({ args, meta: runtime.meta });

  if (!personaPatch && !statePatch && !correction && !memoryInput && !messageText && !incomingChart && !chatText && !textMaterial && urls.length === 0 && !args["memory-pin"] && !args["memory-unpin"] && !args["memory-forget"]) {
    throw new Error(
      [
        "没有检测到任何更新内容。",
        "请至少提供 persona patch、state patch、memory/correction、chat/text/url 或 chart-file。",
      ].join("\n"),
    );
  }

  const preview = {
    summary: args["preview-summary"] ?? inferredPreview.summary,
    speakingFeel: args["preview-speaking"] ?? inferredPreview.speakingFeel,
    decisionFocus: args["preview-decision"] ?? inferredPreview.decisionFocus,
    stressShift: args["preview-stress"] ?? inferredPreview.stressShift,
    currentState: args["preview-current"] ?? inferredPreview.currentState,
  };
  process.stdout.write(`${formatPreviewCard(preview, uiLang)}\n`);
  const confirmed = await askWriteConfirmation(
    args,
    "即将更新当前人格",
  );
  if (!confirmed) {
    process.stdout.write("已取消更新。原人格保持不变。\n");
    return;
  }

  const backupName = backupPersona(baseDir, slug, "update");

  if (correction) {
    currentMemory = [
      ...currentMemory,
      createMemoryEvent({
        type: "correction",
        content: correction,
        source: "user_correction",
        weight: "high",
      }),
    ];
  }
  if (memoryInput) {
    currentMemory = [
      ...currentMemory,
      createMemoryEvent({
        type: memoryType,
        content: memoryInput,
        weight: memoryWeight,
        source: "manual",
      }),
    ];
  }
  if (messageText) {
    const messageEvents = buildNarrativeMemoryEventsFromMessage(messageText, "chat");
    if (messageEvents.length > 0) {
      const merged = appendUniqueMemoryEvents(currentMemory, messageEvents);
      currentMemory = merged.merged;
      messageCorrectionCount = merged.added.filter((x) => x.type === "correction").length;
    } else {
      const merged = appendUniqueMemoryEvents(currentMemory, [
        createMemoryEvent({
          type: "context_note",
          content: messageText,
          source: "chat",
          weight: "low",
        }),
      ]);
      currentMemory = merged.merged;
    }
  }
  if (incomingChart) {
    currentChart = JSON.parse(incomingChart) as ChartLike;
  }
  if (chatText) {
    const facts = detectMemoryFactsFromText(chatText);
    currentMemory.push(
      ...facts.map((content) =>
        createMemoryEvent({
          type: "behavior_fact",
          content,
          source: "chat",
          weight: "medium",
        })),
    );
  }
  if (textMaterial) {
    const facts = detectMemoryFactsFromText(textMaterial);
    currentMemory.push(
      ...facts.map((content) =>
        createMemoryEvent({
          type: "behavior_fact",
          content,
          source: "text",
          weight: "medium",
        })),
    );
  }
  for (const url of urls) {
    const snippet = await fetchUrlSnippet(url);
    if (!snippet) {
      continue;
    }
    const urlFacts = detectMemoryFactsFromText(snippet)
      .slice(0, 8);
    currentMemory.push(
      ...urlFacts.map((content) =>
        createMemoryEvent({
          type: "behavior_fact",
          content,
          source: "text",
          weight: "low",
        })),
    );
  }
  const pinRequest = args["memory-pin"]?.trim();
  if (pinRequest) {
    currentMemoryPins.push({
      id: `${nowIso()}_${Math.random().toString(36).slice(2, 8)}`,
      content: pinRequest,
      type: parseMemoryType(args["memory-pin-type"]),
      pinned_at: nowIso(),
    });
  }
  const unpinId = args["memory-unpin"]?.trim();
  if (unpinId) {
    currentMemoryPins = currentMemoryPins.filter((x) => x.id !== unpinId);
  }
  const forgetKeyword = args["memory-forget"]?.trim();
  if (forgetKeyword) {
    currentMemory = currentMemory.filter((x) => !x.content.includes(forgetKeyword));
    currentMemoryPins = currentMemoryPins.filter((x) => !x.content.includes(forgetKeyword));
  }

  const hasDataDrivenChanges =
    Boolean(correction) ||
    Boolean(memoryInput) ||
    Boolean(messageText) ||
    Boolean(incomingChart) ||
    Boolean(chatText) ||
    Boolean(textMaterial) ||
    urls.length > 0 ||
    Boolean(forgetKeyword) ||
    relationshipChanged;
  const regenPersonaFlag =
    parseYesNo(args["regen-persona"]) ??
    parseYesNo(args["persona-regen"]);
  const shouldRegeneratePersona =
    regenPersonaFlag ?? (!personaPatch && !statePatch && hasDataDrivenChanges);
  let engineNote = pickLangLine(uiLang, "人格更新方式：仅增量 patch", "Persona update mode: patch only");
  if (shouldRegeneratePersona) {
    const supplementalFacts = Array.from(
      new Set(
        [
          ...pickRealityFactsFromMemory(currentMemory),
          ...currentMemory
            .filter((x) => x.type === "style_pattern")
            .map((x) => x.content.trim()),
        ].filter(Boolean),
      ),
    ).slice(0, 14);
    const renderMode = resolveRenderMode(args);
    const regeneratedBase = (renderMode === "agent" ? buildAgentFirstPersonaPack : buildPersonaFromChart)({
      name: runtime.meta.name,
      relationships: relationshipSet.relationships,
      activeRelationships: relationshipSet.activeRelationships,
      gender: runtime.meta.gender,
      chart: currentChart,
      supplementalFacts,
    });
    currentPersona = regeneratedBase.persona;
    currentState = regeneratedBase.state;
    engineNote = pickLangLine(
      uiLang,
      "人格更新方式：规则重建（融合新增资料）",
      "Persona update mode: rules-based rebuild with new materials",
    );
  }

  if (personaPatch) {
    currentPersona = `${currentPersona.trim()}\n\n<!-- 增量更新 ${nowIso()} -->\n${personaPatch}\n`.trim();
  }
  if (statePatch) {
    currentState = `${currentState.trim()}\n\n<!-- 增量更新 ${nowIso()} -->\n${statePatch}\n`.trim();
  }

  const memoryCorrectionCount = [
    ...(correction ? [correction] : []),
    ...(memoryInput && memoryType === "correction" ? [memoryInput] : []),
  ].length + messageCorrectionCount;
  const appendLedger = [
    ...(messageText ? [buildSourceLedgerItem("chat", "update:message", "high")] : []),
    ...(chatText ? [buildSourceLedgerItem("chat", args["chat-file"] ?? "chat-file", "high")] : []),
    ...(textMaterial ? [buildSourceLedgerItem("text", args["text-file"] ?? "text-file", "medium")] : []),
    ...urls.map((x) => buildSourceLedgerItem("url", x, "low")),
  ];

  const nextMeta = updateMeta(runtime.meta, {
    command: "/bazi-persona update",
    incrementCorrections: memoryCorrectionCount,
    incrementChatSources: Number.parseInt(args["inc-chat"] ?? "0", 10) + (chatText ? 1 : 0) + (messageText ? 1 : 0),
    incrementTextSources: Number.parseInt(args["inc-text"] ?? "0", 10) + (textMaterial ? 1 : 0) + urls.length,
    accuracyMode: incomingChart
      ? detectAccuracyMode(currentChart)
      : undefined,
    relationships: relationshipSet.relationships,
    activeRelationships: relationshipSet.activeRelationships,
    appendLedger,
    preferredLanguage: args.lang ? parsePreferredLanguage(args.lang) : undefined,
  });

  const nextRuntime: RuntimeBundle = {
    core: {
      version: "v2",
      persona_markdown: currentPersona,
      updated_at: nextMeta.updated_at,
    },
    state: {
      version: "v2",
      state_markdown: currentState,
      updated_at: nextMeta.updated_at,
      runtime: {
        ...runtimeMode,
        last_refreshed_at: nowIso(),
        cheatsheet: runtimeMode.cheatsheet ?? runtime.state.runtime?.cheatsheet ?? {
          enabled: false,
          affinity: true,
        },
      },
    },
    evidence: {
      version: "v2",
      chart: currentChart,
      updated_at: nextMeta.updated_at,
    },
    meta: nextMeta,
    memory: currentMemory,
    memoryCheatsheet: currentCheatsheetMemory,
    memoryIndex: buildMemoryIndex(currentMemory, relationshipSet.activeRelationships),
    memoryPins: currentMemoryPins,
    cheatsheetSession: runtime.cheatsheetSession,
  };
  saveRuntimeBundleToDisk(dir, nextRuntime);

  const nextFlowSnapshot = await buildFlowSnapshotMarkdown({
    chart: currentChart,
    meta: nextMeta,
    lang: uiLang,
  });
  writeUtf8(
    skillPath,
    buildPersonaSkillFile({
      slug: runtime.meta.slug,
      name: runtime.meta.name,
      chart: currentChart,
      memory: currentMemory,
      meta: nextMeta,
      persona: currentPersona,
      state: currentState,
      flowSnapshot: nextFlowSnapshot,
      stateRuntime: nextRuntime.state.runtime,
      memoryPins: currentMemoryPins,
    }),
  );

  // 单文件模式下清理旧结构，减少目录噪音。
  for (const legacyFile of [
    "persona.md",
    "state.md",
    "chart.json",
    "corrections.md",
    "meta.json",
  ]) {
    const target = path.join(dir, legacyFile);
    if (fileExists(target)) {
      fs.rmSync(target, { force: true });
    }
  }

  process.stdout.write(
    [
      pickLangLine(uiLang, "更新成功。", "Updated successfully."),
      engineNote,
      pickLangLine(uiLang, `已备份版本：${backupName}`, `Backup snapshot: ${backupName}`),
      pickLangLine(uiLang, `当前版本：${nextMeta.version}`, `Current version: ${nextMeta.version}`),
    ].join("\n") + "\n",
  );
}

function listPersonas(args: Record<string, string>): void {
  const baseDir = resolveBaseDir(args);
  const uiLang = resolveOutputLanguage({ args });
  const rows = buildIndex(baseDir);
  if (rows.length === 0) {
    process.stdout.write(`${pickLangLine(uiLang, "暂无已创建的人格。", "No personas found yet.")}\n`);
    return;
  }
  process.stdout.write(
    `${pickLangLine(uiLang, `共 ${rows.length} 个八字人格：`, `${rows.length} personas found:`)}\n\n`,
  );
  for (const row of rows) {
    process.stdout.write(
      [
        `- ${pickLangLine(uiLang, "ID", "ID")}: ${row.slug}`,
        `  ${pickLangLine(uiLang, "名称", "Name")}: ${row.name}`,
        `  ${pickLangLine(uiLang, "版本", "Version")}: ${row.version}`,
        `  ${pickLangLine(uiLang, "创建", "Created")}: ${row.created_at}`,
        `  ${pickLangLine(uiLang, "更新", "Updated")}: ${row.updated_at}`,
        `  ${pickLangLine(uiLang, "资料来源数", "Source count")}: ${row.source_count}`,
      ].join("\n") + "\n\n",
    );
  }
}

function deletePersona(args: Record<string, string>): void {
  ensureRequired(args, ["slug", "confirm-1", "confirm-2"]);
  const slug = args.slug;
  const baseDir = resolveBaseDir(args);
  const dir = personaDir(baseDir, slug);
  if (!fs.existsSync(dir)) {
    throw new Error(
      [
        `找不到人格：${slug}`,
        "请先确认 ID 再删除。",
      ].join("\n"),
    );
  }
  if (args["confirm-1"] !== "DELETE") {
    throw new Error(
      [
        "删除确认失败：第一步确认码不匹配。",
        "请传入 --confirm-1 DELETE。",
      ].join("\n"),
    );
  }
  if (args["confirm-2"] !== slug) {
    throw new Error(
      [
        "删除确认失败：第二步 ID 不匹配。",
        `请传入 --confirm-2 ${slug}。`,
      ].join("\n"),
    );
  }
  fs.rmSync(dir, { recursive: true, force: false });
  const uiLang = resolveOutputLanguage({ args });
  process.stdout.write(
    `${pickLangLine(uiLang, `已删除人格目录：${dir}`, `Deleted persona directory: ${dir}`)}\n`,
  );
}

function rollbackByVersion(args: Record<string, string>): void {
  ensureRequired(args, ["slug", "version"]);
  const baseDir = resolveBaseDir(args);
  const slug = args.slug;
  const version = args.version;
  const snapshot = rollbackPersona(baseDir, slug, version);
  const uiLang = resolveOutputLanguage({ args });
  process.stdout.write(
    [
      pickLangLine(uiLang, `回滚成功，已恢复版本 ${version}。`, `Rollback complete. Restored version ${version}.`),
      pickLangLine(uiLang, `回滚前快照：${snapshot}`, `Pre-rollback snapshot: ${snapshot}`),
    ].join("\n") + "\n",
  );
}

function loadRuntimeOrThrow(baseDir: string, slug: string): { dir: string; runtime: RuntimeBundle } {
  const dir = personaDir(baseDir, slug);
  if (!fs.existsSync(dir)) {
    throw new Error(`找不到人格：${slug}`);
  }
  const skillText = readUtf8IfExists(path.join(dir, "SKILL.md"));
  const internal = parseInternalData(skillText);
  const legacyMetaPath = path.join(dir, "meta.json");
  const legacyMeta = fileExists(legacyMetaPath) ? readJson<PersonaMeta>(legacyMetaPath) : undefined;
  const legacyChartPath = path.join(dir, "chart.json");
  const legacyChart = fileExists(legacyChartPath) ? (readJson(legacyChartPath) as ChartLike) : undefined;
  const runtime = loadRuntimeBundle({
    dir,
    skillText,
    internal,
    legacyMeta,
    legacyChart,
  });
  if (!runtime) {
    throw new Error("当前人格缺少运行数据，无法执行该操作。");
  }
  return { dir, runtime };
}

async function ingestPersona(args: Record<string, string>): Promise<void> {
  ensureRequired(args, ["slug"]);
  await updatePersona({
    ...args,
    "state-mode": args["state-mode"] ?? "auto",
    yes: args.yes ?? "true",
  });
}

function computeAffinityScore(message: string, runtime: RuntimeBundle): { score: number; reason: string } {
  if (!message.trim()) {
    return { score: 50, reason: "Neutral input; no message content detected." };
  }
  const positive = /(谢谢|辛苦|支持|理解|靠谱|信任|喜欢|合作|清楚|尊重|thanks|appreciate|support|understand|trust|respect|clear|collaborate)/i.test(
    message,
  );
  const negative = /(你错了|废话|随便|无所谓|赶紧|别问|都行|闭嘴|烦|shut up|whatever|nonsense|hurry up|don't ask|annoying|you are wrong)/i.test(
    message,
  );
  const boundary = /(边界|目标|责任|截止|交付|复盘|boundary|goal|responsibility|deadline|deliver|review)/i.test(
    message,
  );
  let score = 55;
  if (positive) score += 20;
  if (boundary) score += 15;
  if (negative) score -= 25;
  if (runtime.memoryPins.length > 0 && positive) score += 5;
  score = Math.max(0, Math.min(100, score));
  return {
    score,
    reason: boundary
      ? "Boundary/goal language matched this persona preference."
      : negative
        ? "Conflict-heavy wording triggered a lower affinity response."
        : "Mostly neutral; clearer goals and respectful tone can improve affinity.",
  };
}

function confidenceLabel(score: number): string {
  if (score >= 80) {
    return "高";
  }
  if (score >= 60) {
    return "中";
  }
  return "低";
}

function computeInsightConfidence(runtime: RuntimeBundle): {
  score: number;
  label: string;
  reason: string;
} {
  let score = 50;
  if (runtime.meta.birth.time) {
    score += 20;
  }
  score += Math.min(15, runtime.memory.length * 2);
  score += Math.min(10, (runtime.meta.source_ledger?.length ?? 0) * 2);
  score += Math.min(5, runtime.memoryPins.length);
  score = Math.max(0, Math.min(100, score));
  return {
    score,
    label: confidenceLabel(score),
    reason: runtime.meta.birth.time
      ? "含出生时辰，且有增量资料支撑。"
      : "缺少出生时辰，部分结论以趋势判断为主。",
  };
}

function buildKeyYearWindows(): string[] {
  const year = new Date().getFullYear();
  return [year, year + 1, year + 3].map((y, idx) =>
    idx === 0 ? `${y}：结构调整与边界重建窗口` : idx === 1 ? `${y}：关系协同与资源整合窗口` : `${y}：成果兑现与角色升级窗口`,
  );
}

function buildCheatsheetTalkTracks(): string[] {
  return [
    "先对齐目标：'我们先统一目标，避免各做各的。'",
    "再明确边界：'这件事我负责A，你负责B，截止到周五。'",
    "最后给动作：'我先给你两套可选方案，你选一套我们就开工。'",
  ];
}

type CheatsheetIntent = "status" | "compat" | "growth" | "future" | "chat";

function classifyCheatsheetIntent(message: string): CheatsheetIntent {
  const text = message.trim();
  if (!text) {
    return "chat";
  }
  if (/(今天|现在|此刻|状态|时运|流年|流月|流日|流时|开心|压力|today|now|status|flow|year luck|month luck|day luck|hour luck|mood|pressure|happy)/i.test(text)) {
    return "status";
  }
  if (/(合盘|相处|关系|我和|跟.*合不合|compat|match|relationship|get along|between us)/i.test(text)) {
    return "compat";
  }
  if (/(成长|经历|家庭|学历|背景|过去|童年|工作经历|upbringing|background|past|childhood|education|career history|experience)/i.test(text)) {
    return "growth";
  }
  if (/(未来|运势|预测|婚恋|事业|财富|明年|后年|关键年份|future|forecast|trend|next year|career|wealth|relationship|marriage)/i.test(text)) {
    return "future";
  }
  return "chat";
}

function getCheatsheetRuntime(runtime: RuntimeBundle): { enabled: boolean; affinity: boolean } {
  return runtime.state.runtime?.cheatsheet ?? { enabled: false, affinity: true };
}

function parseCheatsheetControlFromMessage(message: string): "on" | "off" | "status" | undefined {
  const text = message.trim();
  if (!text) {
    return undefined;
  }
  if (/(打开|开启|进入|启动).*(作弊模式|cheatsheet|上帝模式)|(open|turn on|enable).*(cheatsheet|cheat mode|god mode)/i.test(text)) {
    return "on";
  }
  if (/(关闭|退出|停止).*(作弊模式|cheatsheet|上帝模式)|(close|turn off|disable|exit).*(cheatsheet|cheat mode|god mode)/i.test(text)) {
    return "off";
  }
  if (/(作弊模式|cheatsheet|上帝模式).*(状态|开着|开启了吗|是否开启)|(cheatsheet|cheat mode|god mode).*(status|on|enabled)/i.test(text)) {
    return "status";
  }
  return undefined;
}

async function cheatsheetPersona(args: Record<string, string>): Promise<void> {
  ensureRequired(args, ["slug"]);
  const baseDir = resolveBaseDir(args);
  const { dir, runtime } = loadRuntimeOrThrow(baseDir, args.slug);
  const userMessage = args.message ?? "";
  const uiLang = resolveOutputLanguage({ args, meta: runtime.meta, message: userMessage });
  const naturalMode = parseCheatsheetControlFromMessage(userMessage);
  const mode = ((args.mode ?? "").toLowerCase() || naturalMode || "");
  const now = nowIso();
  runtime.state.runtime = runtime.state.runtime ?? {
    mode: "auto",
    last_refreshed_at: now,
    cheatsheet: { enabled: false, affinity: true },
  };
  runtime.state.runtime.cheatsheet = runtime.state.runtime.cheatsheet ?? {
    enabled: false,
    affinity: true,
  };
  if (mode === "on" || mode === "off" || mode === "status") {
    if (mode === "on") {
      runtime.state.runtime.cheatsheet.enabled = true;
    }
    if (mode === "off") {
      runtime.state.runtime.cheatsheet.enabled = false;
      runtime.cheatsheetSession = createEmptyCheatsheetSession();
    }
    if (args.affinity) {
      runtime.state.runtime.cheatsheet.affinity = args.affinity.toLowerCase() !== "off";
    }
    runtime.state.updated_at = now;
    saveRuntimeBundleToDisk(dir, runtime);
    process.stdout.write(
      [
        pickLangLine(
          uiLang,
          `Cheatsheet 模式：${runtime.state.runtime.cheatsheet.enabled ? "已开启" : "已关闭"}`,
          `Cheatsheet mode: ${runtime.state.runtime.cheatsheet.enabled ? "ON" : "OFF"}`,
        ),
        pickLangLine(
          uiLang,
          `满意度指示：${runtime.state.runtime.cheatsheet.affinity ? "开启" : "关闭"}`,
          `Affinity indicator: ${runtime.state.runtime.cheatsheet.affinity ? "ON" : "OFF"}`,
        ),
        pickLangLine(
          uiLang,
          "开启后可正常聊天，也可随时问状态/合盘/经历/未来问题。",
          "You can chat normally, and ask status/compat/growth/future questions anytime.",
        ),
      ].join("\n") + "\n",
    );
    return;
  }

  const runtimeCheatsheet = getCheatsheetRuntime(runtime);
  if (!runtimeCheatsheet.enabled && args.force !== "true") {
    process.stdout.write(
      [
        pickLangLine(uiLang, "Cheatsheet 模式当前未开启。", "Cheatsheet mode is currently OFF."),
        pickLangLine(
          uiLang,
          "先执行：--action cheatsheet --slug <id> --mode on",
          "Run first: --action cheatsheet --slug <id> --mode on",
        ),
      ].join("\n") + "\n",
    );
    return;
  }

  const intent = classifyCheatsheetIntent(userMessage);
  const recentContext = runtime.cheatsheetSession.messages
    .slice(-4)
    .map((x) => x.content)
    .join(" | ");
  let promotedToBackground: MemoryEvent[] = [];
  if (userMessage.trim()) {
    runtime.cheatsheetSession.messages.push({
      role: "user",
      content: userMessage.trim(),
      ts: nowIso(),
    });
    runtime.cheatsheetSession.messages = runtime.cheatsheetSession.messages.slice(-10);
    runtime.cheatsheetSession.updated_at = nowIso();
    const narrativeEvents = buildNarrativeMemoryEventsFromMessage(userMessage, "chat");
    const cheatsheetEvents =
      narrativeEvents.length > 0
        ? narrativeEvents
        : [
            createMemoryEvent({
              type: "context_note",
              content: userMessage.trim(),
              source: "manual",
              weight: "low",
            }),
          ];
    const cheatsheetAppend = appendUniqueMemoryEvents(
      runtime.memoryCheatsheet,
      cheatsheetEvents,
    );
    runtime.memoryCheatsheet = cheatsheetAppend.merged;

    if (narrativeEvents.length > 0) {
      const promotedAppend = appendUniqueMemoryEvents(runtime.memory, narrativeEvents);
      runtime.memory = promotedAppend.merged;
      promotedToBackground = promotedAppend.added;
      if (promotedToBackground.length > 0) {
        const correctionInc = promotedToBackground.filter((x) => x.type === "correction").length;
        runtime.meta = updateMeta(runtime.meta, {
          command: "/bazi-persona cheatsheet",
          incrementCorrections: correctionInc,
          incrementChatSources: 1,
          appendLedger: [buildSourceLedgerItem("chat", "cheatsheet:message", "high")],
          preferredLanguage: args.lang ? parsePreferredLanguage(args.lang) : undefined,
        });
        runtime.memoryIndex = buildMemoryIndex(
          runtime.memory,
          runtime.meta.active_relationships ??
            runtime.meta.relationships ??
            [runtime.meta.relation ?? "未指定关系"],
        );
        runtime.core.updated_at = runtime.meta.updated_at;
        runtime.state.updated_at = runtime.meta.updated_at;
        runtime.evidence.updated_at = runtime.meta.updated_at;
      }
    }
  }
  const at = args.at;
  const flowSnapshot = await buildFlowSnapshotMarkdown({
    chart: runtime.evidence.chart,
    meta: runtime.meta,
    at,
    lang: uiLang,
  });
  const element = inferElementFromDayMaster(runtime.evidence.chart.day_master);
  const relations = (runtime.meta.active_relationships ?? runtime.meta.relationships ?? [runtime.meta.relation ?? "未指定关系"])
    .join(" / ");
  const affinityEnabled =
    args.affinity
      ? args.affinity.toLowerCase() !== "off"
      : runtimeCheatsheet.affinity;
  const affinityInput = userMessage;
  const affinity = affinityEnabled ? computeAffinityScore(affinityInput, runtime) : undefined;
  const confidence = computeInsightConfidence(runtime);
  const keyYears = buildKeyYearWindows();
  const tracks = buildCheatsheetTalkTracks();
  let body: string[] = [];
  if (uiLang === "en" && intent === "status") {
    body = [
      "Card | Status",
      "- Takeaway: stabilize boundaries first, then push one key action.",
      flowSnapshot,
      "- Suggestion: prioritize one deliverable action today and reduce context switching.",
      `- Confidence: ${confidence.score}/100`,
      ...(recentContext ? [`- Recent cheatsheet context: ${recentContext}`] : []),
    ];
  } else if (uiLang === "en" && intent === "compat") {
    body = [
      "Card | Compatibility",
      `- Active relationship lens: ${relations}`,
      "- Takeaway: align on goal, then boundaries, then action list.",
      "- Avoid: changing terms repeatedly, vague ownership, and no deadline.",
      "- Advanced: for full compatibility run --action compat --slug-a A --slug-b B.",
      "- Suggested line: 'Let's align goals and ownership first, then discuss execution.'",
      ...(recentContext ? [`- Recent cheatsheet context: ${recentContext}`] : []),
    ];
  } else if (uiLang === "en" && intent === "growth") {
    body = [
      "Card | Growth Insight",
      `- Growth script: ${element}-element day master often matures through boundary and growth challenges.`,
      "- Career arc: tends to build capability in high-standard, high-ownership environments.",
      "- Improve fit: add 3 real episodes (trigger-response-outcome).",
      `- Confidence: ${confidence.score}/100`,
      ...(recentContext ? [`- Recent cheatsheet context: ${recentContext}`] : []),
    ];
  } else if (uiLang === "en" && intent === "future") {
    body = [
      "Card | Future Insight",
      "- Relationship: prioritize response consistency and boundary alignment.",
      "- Career: take key responsibilities in resonance years; stabilize rhythm in clash-heavy years.",
      "- Wealth: favor discipline and drawdown control over emotional expansion.",
      "- Key windows:",
      ...keyYears.map((x) => `  - ${x}`),
      ...(recentContext ? [`- Recent cheatsheet context: ${recentContext}`] : []),
    ];
  } else if (uiLang === "en") {
    const voice =
      extractSectionFirstBullet(runtime.core.persona_markdown, "1. 典型说话风格") ??
      extractSectionFirstBullet(runtime.core.persona_markdown, "3. 沟通风格") ??
      extractSectionFirstBullet(runtime.core.persona_markdown, "对话风格（像真人）") ??
      "Lead with the point, then the action";
    body = [
      "Card | Normal Chat (Cheatsheet ON)",
      `- Reply style: ${voice}`,
      "- Keep chatting naturally; I'll switch templates only when intent matches status/compat/growth/future.",
      `- Better framing: ${userMessage ? `"${userMessage}" -> state goal first, then boundary.` : "state goal first, then boundary."}`,
      "- Suggested lines:",
      ...tracks.map((x) => `  - ${x}`),
      ...(recentContext ? [`- Recent cheatsheet context: ${recentContext}`] : []),
    ];
  } else if (intent === "status") {
    body = [
      "Card｜状态问答",
      "- 结论：当前更适合“先稳边界，再推进关键动作”。",
      flowSnapshot,
      "- 建议：今天优先做一件可交付动作，减少多线程分散。",
      `- 可信度：${confidence.label}（${confidence.score}/100）`,
      ...(recentContext ? [`- 近期作弊上下文：${recentContext}`] : []),
    ];
  } else if (intent === "compat") {
    body = [
      "Card｜关系问答",
      `- 当前关系视角：${relations}`,
      "- 结论：先目标、再边界、再动作清单是最稳解法。",
      "- 避雷：反复改口、责任模糊、无截止时间。",
      "- 进阶：若要精确合盘，请用 --action compat --slug-a A --slug-b B。",
      "- 话术：'我们先统一目标和责任，再谈执行路径。'",
      ...(recentContext ? [`- 近期作弊上下文：${recentContext}`] : []),
    ];
  } else if (intent === "growth") {
    body = [
      "Card｜经历问答（洞察型）",
      `- 成长脚本：${element}日主常在边界与成长议题中快速成熟。`,
      "- 职业轨迹：更容易在高标准与责任场景形成能力壁垒。",
      "- 复盘建议：请补3条真实经历（触发-反应-结果），可明显提升拟合度。",
      `- 可信度：${confidence.label}（${confidence.reason}）`,
      ...(recentContext ? [`- 近期作弊上下文：${recentContext}`] : []),
    ];
  } else if (intent === "future") {
    body = [
      "Card｜未来问答（洞察型）",
      "- 婚恋：看回应一致性与边界协同。",
      "- 事业：共振年份宜承担关键职责，冲克年份优先稳节奏。",
      "- 财富：重纪律与回撤控制，避免情绪化扩张。",
      "- 关键窗口：",
      ...keyYears.map((x) => `  - ${x}`),
      ...(recentContext ? [`- 近期作弊上下文：${recentContext}`] : []),
    ];
  } else {
    const voice =
      extractSectionFirstBullet(runtime.core.persona_markdown, "1. 典型说话风格") ??
      extractSectionFirstBullet(runtime.core.persona_markdown, "3. 沟通风格") ??
      extractSectionFirstBullet(runtime.core.persona_markdown, "对话风格（像真人）") ??
      "先说重点，再给动作";
    body = [
      "Card｜正常聊天（Cheatsheet 已开启）",
      `- 回答风格：${voice}`,
      "- 你可以继续自然聊天；问到状态/合盘/经历/未来时，我会切对应模板。",
      `- 你的这句更适合这样推进：${userMessage ? `“${userMessage}” -> 先给目标，再给边界。` : "先给目标，再给边界。"}`,
      "- 推荐话术：",
      ...tracks.map((x) => `  - ${x}`),
      ...(recentContext ? [`- 近期作弊上下文：${recentContext}`] : []),
    ];
  }
  runtime.cheatsheetSession.messages.push({
    role: "assistant",
    content: body[0] ?? "Cheatsheet 回复",
    ts: nowIso(),
  });
  runtime.cheatsheetSession.messages = runtime.cheatsheetSession.messages.slice(-10);
  runtime.cheatsheetSession.updated_at = nowIso();
  writeUtf8(
    path.join(dir, "SKILL.md"),
    buildPersonaSkillFile({
      slug: runtime.meta.slug,
      name: runtime.meta.name,
      chart: runtime.evidence.chart,
      memory: runtime.memory,
      meta: runtime.meta,
      persona: runtime.core.persona_markdown,
      state: runtime.state.state_markdown,
      flowSnapshot,
      stateRuntime: runtime.state.runtime,
      memoryPins: runtime.memoryPins,
    }),
  );
  saveRuntimeBundleToDisk(dir, runtime);
  process.stdout.write(
    [
      pickLangLine(uiLang, `Cheatsheet（${runtime.meta.name}）`, `Cheatsheet (${runtime.meta.name})`),
      "",
      ...body,
      affinity
        ? pickLangLine(uiLang, `- 消息好感度：${affinity.score}/100（${affinity.reason}）`, `- Message affinity: ${affinity.score}/100 (${affinity.reason})`)
        : pickLangLine(uiLang, "- 消息好感度：已关闭", "- Message affinity: OFF"),
      ...(promotedToBackground.length > 0
        ? [
            pickLangLine(
              uiLang,
              `- 自动记忆：本轮识别到 ${promotedToBackground.length} 条事实，已同步到背景记忆并联动八字分析。`,
              `- Auto memory: captured ${promotedToBackground.length} fact(s), synced to background memory and Bazi-linked analysis.`,
            ),
          ]
        : []),
      "",
      pickLangLine(
        uiLang,
        "说明：Cheatsheet 开启后可正常聊天，只有匹配到特定意图才切对应模板。",
        "Note: Cheatsheet mode keeps normal chat; it only switches templates for matched intents.",
      ),
    ].join("\n") + "\n",
  );
}

async function compatPersona(args: Record<string, string>): Promise<void> {
  ensureRequired(args, ["slug-a", "slug-b"]);
  const uiLang = resolveOutputLanguage({ args });
  const baseDir = resolveBaseDir(args);
  const a = loadRuntimeOrThrow(baseDir, args["slug-a"]).runtime;
  const b = loadRuntimeOrThrow(baseDir, args["slug-b"]).runtime;
  const aElement = inferElementFromDayMaster(a.evidence.chart.day_master);
  const bElement = inferElementFromDayMaster(b.evidence.chart.day_master);
  const complement =
    (aElement === "木" && bElement === "水") ||
    (aElement === "火" && bElement === "木") ||
    (aElement === "土" && bElement === "火") ||
    (aElement === "金" && bElement === "土") ||
    (aElement === "水" && bElement === "金");
  process.stdout.write(
    [
      pickLangLine(uiLang, `合盘分析：${a.meta.name} × ${b.meta.name}`, `Compatibility: ${a.meta.name} × ${b.meta.name}`),
      pickLangLine(uiLang, `- 五行主轴：${aElement} × ${bElement}`, `- Element axis: ${aElement} × ${bElement}`),
      pickLangLine(uiLang, `- 配合倾向：${complement ? "互补性较强" : "同频/磨合并存"}`, `- Fit tendency: ${complement ? "more complementary" : "same-frequency with friction"}`),
      pickLangLine(uiLang, "- 高概率冲突点：节奏不同、边界定义不同、情绪表达不同。", "- Likely friction points: rhythm mismatch, boundary mismatch, emotional expression mismatch."),
      pickLangLine(uiLang, "- 最优相处策略：先对齐目标，再约定边界，再同步反馈节奏。", "- Best strategy: align goals first, set boundaries, then sync feedback rhythm."),
      pickLangLine(uiLang, "- 快速破局话术：'我们先统一目标和责任，再讨论执行路径。'", "- Quick reset line: 'Let's align goals and ownership first, then discuss execution.'"),
      pickLangLine(uiLang, "- 建议：若要分析“你与TA”，请先创建你自己的 persona 再做合盘。", "- Tip: to analyze you + this persona, create your own persona first, then run compatibility."),
    ].join("\n") + "\n",
  );
}

function memoryOps(args: Record<string, string>): void {
  ensureRequired(args, ["slug"]);
  const uiLang = resolveOutputLanguage({ args });
  const baseDir = resolveBaseDir(args);
  const { dir, runtime } = loadRuntimeOrThrow(baseDir, args.slug);
  const op = (args.op ?? "list").toLowerCase();
  const scope = (args.scope ?? "normal").toLowerCase();
  const useCheatsheetScope = scope === "cheatsheet";
  let targetMemory = useCheatsheetScope ? runtime.memoryCheatsheet : runtime.memory;
  if (op === "list") {
    const rows = targetMemory
      .slice(-30)
      .reverse()
      .map((x) => `- ${x.id} [${x.type}/${x.weight}] ${x.content}`);
    process.stdout.write(
      [
        pickLangLine(
          uiLang,
          `记忆列表（${runtime.meta.name} / ${useCheatsheetScope ? "cheatsheet" : "normal"}）`,
          `Memory list (${runtime.meta.name} / ${useCheatsheetScope ? "cheatsheet" : "normal"})`,
        ),
        ...(rows.length > 0 ? rows : [pickLangLine(uiLang, "- 暂无记忆", "- No memory yet")]),
      ].join("\n") + "\n",
    );
    return;
  }
  if (op === "pin") {
    const id = args.id;
    const found = targetMemory.find((x) => x.id === id);
    if (!found) {
      throw new Error("未找到指定记忆 id。");
    }
    runtime.memoryPins.push({
      id: `${nowIso()}_${Math.random().toString(36).slice(2, 8)}`,
      content: found.content,
      type: found.type,
      pinned_at: nowIso(),
    });
  } else if (op === "unpin") {
    runtime.memoryPins = runtime.memoryPins.filter((x) => x.id !== args.id);
  } else if (op === "forget") {
    const keyword = args.keyword ?? "";
    targetMemory = targetMemory.filter((x) => !x.content.includes(keyword));
    runtime.memoryPins = runtime.memoryPins.filter((x) => !x.content.includes(keyword));
  } else if (op === "merge") {
    targetMemory = targetMemory
      .reduce<MemoryEvent[]>((acc, item) => {
        if (!acc.some((x) => x.content === item.content && x.type === item.type)) {
          acc.push(item);
        }
        return acc;
      }, []);
  } else {
    throw new Error("不支持的 memory op，可用：list/pin/unpin/forget/merge");
  }
  if (useCheatsheetScope) {
    runtime.memoryCheatsheet = targetMemory;
  } else {
    runtime.memory = targetMemory;
  }
  runtime.memoryIndex = buildMemoryIndex(
    runtime.memory,
    runtime.meta.active_relationships ?? runtime.meta.relationships ?? [runtime.meta.relation ?? "未指定关系"],
  );
  saveRuntimeBundleToDisk(dir, runtime);
  process.stdout.write(
    `${pickLangLine(uiLang, `memory 操作完成：${op}`, `Memory operation completed: ${op}`)}\n`,
  );
}

async function agentOps(args: Record<string, string>): Promise<void> {
  const op = (args.op ?? args["agent-action"] ?? "enable").toLowerCase();
  if (!["enable", "sync", "remove", "list"].includes(op)) {
    throw new Error(
      [
        "不支持的 agent 操作。",
        "可用：enable / sync / remove / list",
        "示例：--action agent --op enable",
      ].join("\n"),
    );
  }
  const bridgeArgs: Record<string, string> = {
    ...args,
    action: op,
  };
  await runAgentBridge(bridgeArgs);
}

function printCommandHelp(args: Record<string, string>): void {
  const uiLang = resolveOutputLanguage({ args });
  const baseDir = resolveBaseDir(args);
  const launchProfiles = buildLaunchProfiles(baseDir);
  const profileText = formatLaunchProfiles(launchProfiles, uiLang);
  if (uiLang === "en") {
    const lines = [
      "Bazi Persona Help",
      "",
      "User entrypoint (single):",
      "- /bazi-persona + natural language",
      "- Example: Create persona Xiaomei, female, 1999-08-12 15:30, Shanghai, coworker",
      "- Example: Update xiaomei with this new fact: got promoted this month",
      "- Example: Show xiaomei flow status this week",
      "- Example: Check today's Chinese calendar",
      "",
      "Ops commands (advanced):",
      "- /bazi-persona help",
      "- /bazi-persona agent enable",
      "- /bazi-persona agent sync [claude|openclaw|hermes|all]",
      "- /bazi-persona agent list",
      "- /bazi-persona agent remove",
    ];
    if (profileText) {
      lines.push("", profileText);
    }
    lines.push(
      "",
      "CLI bridge examples (ops only):",
      "- npm run bazi -- --action agent --op enable",
      "- npm run bazi -- --action agent --op sync --target all",
      "- npm run bazi -- --action agent --op list",
      "- npm run bazi -- --action agent --op remove --confirm DELETE",
    );
    process.stdout.write(`${lines.join("\n")}\n`);
    return;
  }
  const lines = [
    "八字人格帮助",
    "",
    "用户入口（单入口）",
    "- /bazi-persona + 自然语言",
    "- 示例：帮我创建八字人格：小美，女，1999年8月12日15:30，上海，同事",
    "- 示例：帮我更新 xiaomei，她最近升职了",
    "- 示例：看下 xiaomei 最近状态",
    "- 示例：今天黄历怎么样",
    "",
    "运维命令（高级）",
    "- /bazi-persona help",
    "- /bazi-persona agent enable",
    "- /bazi-persona agent sync [claude|openclaw|hermes|all]",
    "- /bazi-persona agent list",
    "- /bazi-persona agent remove",
  ];
  if (profileText) {
    lines.push("", profileText);
  }
  lines.push(
    "",
    "CLI 对应写法（运维）",
    "- npm run bazi -- --action agent --op enable",
    "- npm run bazi -- --action agent --op sync --target all",
    "- npm run bazi -- --action agent --op list",
    "- npm run bazi -- --action agent --op remove --confirm DELETE",
  );
  process.stdout.write(`${lines.join("\n")}\n`);
}

function inferAgentOpFromInput(text: string): "enable" | "sync" | "list" | "remove" {
  const lower = text.toLowerCase();
  if (/remove|delete|移除|删除/.test(lower)) {
    return "remove";
  }
  if (/list|show|查看|列表/.test(lower)) {
    return "list";
  }
  if (/sync|同步/.test(lower)) {
    return "sync";
  }
  return "enable";
}

function extractDateLikeToken(text: string): string | undefined {
  const full = text.match(/(\d{4})[年\-/.](\d{1,2})[月\-/.](\d{1,2})/u);
  if (full) {
    const y = Number.parseInt(full[1], 10);
    const m = Number.parseInt(full[2], 10);
    const d = Number.parseInt(full[3], 10);
    if (Number.isFinite(y) && Number.isFinite(m) && Number.isFinite(d)) {
      return `${y}-${`${m}`.padStart(2, "0")}-${`${d}`.padStart(2, "0")}`;
    }
  }
  const short = text.match(/(\d{4})-(\d{1,2})-(\d{1,2})/u);
  if (!short) {
    return undefined;
  }
  return `${short[1]}-${short[2].padStart(2, "0")}-${short[3].padStart(2, "0")}`;
}

function extractNameFromInput(text: string): string | undefined {
  const cleaned = text.replace(/^.*?[：:]/u, "").trim();
  if (!cleaned) {
    return undefined;
  }
  const first = cleaned.split(/[，,\s]+/u).map((x) => x.trim()).find(Boolean);
  if (!first || /创建|人格|八字|帮我|please|create/iu.test(first)) {
    return undefined;
  }
  return first;
}

function extractGenderFromInput(text: string): string | undefined {
  if (/\bmale\b|男/iu.test(text)) {
    return "男";
  }
  if (/\bfemale\b|女/iu.test(text)) {
    return "女";
  }
  return undefined;
}

function extractTimeFromInput(text: string): string | undefined {
  const hm = text.match(/(\d{1,2})[:：点时](\d{1,2})/u);
  if (hm) {
    const h = Number.parseInt(hm[1], 10);
    const m = Number.parseInt(hm[2], 10);
    if (Number.isFinite(h) && Number.isFinite(m)) {
      return `${`${h}`.padStart(2, "0")}:${`${m}`.padStart(2, "0")}`;
    }
  }
  const half = text.match(/(上午|下午)?\s*(\d{1,2})点半/u);
  if (half) {
    let h = Number.parseInt(half[2], 10);
    if (half[1] === "下午" && h < 12) {
      h += 12;
    }
    return `${`${h}`.padStart(2, "0")}:30`;
  }
  return undefined;
}

function extractLocationFromInput(text: string): string | undefined {
  const parts = text
    .split(/[，,]/u)
    .map((x) => x.trim())
    .filter(Boolean);
  for (const part of parts) {
    if (/创建|人格|八字|更新|状态|黄历|help|create|update/iu.test(part)) {
      continue;
    }
    if (/\d{4}/u.test(part) || /男|女|male|female/iu.test(part)) {
      continue;
    }
    if (/同事|老板|伴侣|前任|朋友|家人|自己|名人|coworker|friend|partner|boss|family|ex/iu.test(part)) {
      continue;
    }
    if (part.length >= 2 && part.length <= 20) {
      return part.replace(/[人]$/u, "");
    }
  }
  return undefined;
}

function extractRelationFromInput(text: string): string | undefined {
  const relationHints = ["同事", "老板", "上级", "下属", "伴侣", "前任", "朋友", "家人", "自己", "名人", "同学", "客户", "partner", "friend", "coworker", "boss", "family", "ex"];
  const hit = relationHints.find((hint) => text.toLowerCase().includes(hint.toLowerCase()));
  return hit;
}

function hydrateCreateArgsFromInput(args: Record<string, string>, input: string): Record<string, string> {
  const next = { ...args };
  const parts = input
    .split(/[，,]/u)
    .map((x) => x.trim())
    .filter(Boolean);
  const fromPrefix = extractNameFromInput(input);
  const fromParts = parts.length > 0 ? parts[0].replace(/^.*?[：:]/u, "").trim() : undefined;
  next.name = next.name ?? fromPrefix ?? fromParts ?? "";
  next.gender = next.gender ?? extractGenderFromInput(input) ?? "";
  next["birth-date"] = next["birth-date"] ?? extractDateLikeToken(input) ?? "";
  next["birth-time"] = next["birth-time"] ?? extractTimeFromInput(input) ?? "";
  next["birth-location"] = next["birth-location"] ?? extractLocationFromInput(input) ?? "";
  if (!next["birth-location"] && parts.length >= 4) {
    next["birth-location"] = parts[3].replace(/[人]$/u, "").trim();
  }
  if (!next["birth-location"]) {
    next["birth-location"] = "未知";
  }
  next.relation = next.relation ?? extractRelationFromInput(input) ?? "";
  return next;
}

function attachSlugFromInput(args: Record<string, string>, input: string): Record<string, string> {
  if (args.slug?.trim()) {
    return args;
  }
  const index = buildIndex(resolveBaseDir(args));
  const lowered = input.toLowerCase();
  const matched = index.find((item) => lowered.includes(item.slug.toLowerCase()) || lowered.includes(item.name.toLowerCase()));
  if (!matched) {
    return args;
  }
  return {
    ...args,
    slug: matched.slug,
  };
}

async function orchestrateAction(args: Record<string, string>): Promise<void> {
  const input = (args.input ?? args.message ?? args.query ?? "").trim();
  if (!input) {
    printWelcome(args);
    return;
  }
  const lower = input.toLowerCase();

  if (/help|帮助|怎么用|usage/.test(lower)) {
    printCommandHelp(args);
    return;
  }
  if (/agent|claude|openclaw|hermes|同步/.test(lower) && /(enable|sync|list|remove|开启|启用|同步|查看|删除|移除)/.test(lower)) {
    await agentOps({
      ...args,
      op: args.op ?? inferAgentOpFromInput(input),
    });
    return;
  }
  if (/calendar|黄历|万年历|节气/.test(lower)) {
    await queryCalendarStatus({
      ...args,
      at: args.at ?? extractDateLikeToken(input),
    });
    return;
  }
  if (/list|我有哪些人格|查看人格|角色列表/.test(lower)) {
    listPersonas(args);
    return;
  }
  if (/cheatsheet|作弊模式/.test(lower)) {
    await cheatsheetPersona(attachSlugFromInput(args, input));
    return;
  }
  if (/flow|状态|流年|运势|近期/.test(lower)) {
    await queryFlowStatus(attachSlugFromInput(args, input));
    return;
  }
  if (/update|更新|补充|修正|更正/.test(lower)) {
    await updatePersona(attachSlugFromInput(args, input));
    return;
  }
  if (/create|创建|生成|新建/.test(lower)) {
    await createPersona(hydrateCreateArgsFromInput(args, input));
    return;
  }

  process.stdout.write(
    [
      pickLangLine(
        resolveOutputLanguage({ args, message: input }),
        "我已收到你的请求。请继续用自然语言描述，并补充必要字段（如姓名、生日、地点、关系）。",
        "Request received. Keep describing it in natural language and include required fields (name, birth date, location, relation).",
      ),
      pickLangLine(
        resolveOutputLanguage({ args, message: input }),
        "你也可以说：帮我创建八字人格：小美，女，1999年8月12日15:30，上海，同事。",
        "You can also say: Create a persona for Xiaomei, female, 1999-08-12 15:30, Shanghai, coworker.",
      ),
    ].join("\n") + "\n",
  );
}

async function main(): Promise<void> {
  const args = parseCliArgs(process.argv);
  const action = args.action ?? "orchestrate";
  if (!["orchestrate", "welcome", "create", "update", "list", "delete", "rollback", "flow", "calendar", "ingest", "cheatsheet", "compat", "memory", "agent", "help"].includes(action)) {
    throw new Error(
      [
        "缺少或不支持的 action。",
        "可用值：orchestrate / welcome / create / update / list / delete / rollback / flow / calendar / ingest / cheatsheet / compat / memory / agent / help",
        "示例：npm run bazi -- --action orchestrate --input \"帮我创建八字人格...\"",
      ].join("\n"),
    );
  }
  if (action === "orchestrate") {
    await orchestrateAction(args);
    return;
  }
  if (action === "welcome") {
    printWelcome(args);
    return;
  }
  if (action === "create") {
    await createPersona(args);
    return;
  }
  if (action === "update") {
    await updatePersona(args);
    return;
  }
  if (action === "list") {
    listPersonas(args);
    return;
  }
  if (action === "rollback") {
    rollbackByVersion(args);
    return;
  }
  if (action === "flow") {
    await queryFlowStatus(args);
    return;
  }
  if (action === "calendar") {
    await queryCalendarStatus(args);
    return;
  }
  if (action === "ingest") {
    await ingestPersona(args);
    return;
  }
  if (action === "cheatsheet") {
    await cheatsheetPersona(args);
    return;
  }
  if (action === "compat") {
    await compatPersona(args);
    return;
  }
  if (action === "memory") {
    memoryOps(args);
    return;
  }
  if (action === "agent") {
    await agentOps(args);
    return;
  }
  if (action === "help") {
    printCommandHelp(args);
    return;
  }
  deletePersona(args);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    process.stderr.write(`${(error as Error).message}\n`);
    process.exitCode = 1;
  });
}
