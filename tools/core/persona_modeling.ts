import { type MbtiInferenceProfile } from "./bazi_mbti.js";
import { type StateShift } from "./persona_profile_core.js";
import { SHENGXIAO_DATA } from "../data/shengxiao_knowledge.js";

type FiveElement = "木" | "火" | "土" | "金" | "水";
type PillarKey = "年柱" | "月柱" | "日柱" | "时柱";
type TenGodGroup = "比劫" | "食伤" | "财" | "官杀" | "印";

interface ChartLikeInput {
  accuracy_mode?: string;
  day_master?: string;
  raw_bazi?: unknown;
}

interface StyleSnapshot {
  voiceRule: string;
  responseRhythm: string;
  emotionPolicy: string;
  decisionCore: string;
  uncertaintyHandling: string;
  pressurePattern: string;
  conflictApproach: string;
  trustSignal: string;
  misfireSignal: string;
  positiveTriggers: string;
  negativeTriggers: string;
  repairGuide: string;
}

interface PillarStem {
  stem?: string;
  element?: FiveElement;
  yinYang?: "阳" | "阴";
  tenGod?: string;
}

interface HiddenStem {
  role: string;
  stem?: string;
  tenGod?: string;
}

interface PillarNode {
  key: PillarKey;
  stem: PillarStem;
  branch?: string;
  branchElement?: FiveElement;
  branchYinYang?: "阳" | "阴";
  hidden: HiddenStem[];
}

interface ElementStructure {
  scores: Record<FiveElement, number>;
  dominant: FiveElement;
  weak: FiveElement;
  balanceLevel: "均衡" | "偏科" | "单极";
  relationTrend: "顺生偏多" | "相克偏多" | "生克并存";
}

interface TenGodStructure {
  groupScores: Record<TenGodGroup, number>;
  dominantGroup: TenGodGroup;
  weakGroup: TenGodGroup;
  supportPairs: string[];
  conflictPairs: string[];
}

interface ComboStructure {
  positiveCount: number;
  tensionCount: number;
  highlights: string[];
  surfaceVsDeep: string;
}

const STEM_TO_ELEMENT: Record<string, FiveElement> = {
  甲: "木",
  乙: "木",
  丙: "火",
  丁: "火",
  戊: "土",
  己: "土",
  庚: "金",
  辛: "金",
  壬: "水",
  癸: "水",
};

const STEM_TO_YINYANG: Record<string, "阳" | "阴"> = {
  甲: "阳",
  乙: "阴",
  丙: "阳",
  丁: "阴",
  戊: "阳",
  己: "阴",
  庚: "阳",
  辛: "阴",
  壬: "阳",
  癸: "阴",
};

const GENERATES: Record<FiveElement, FiveElement> = {
  木: "火",
  火: "土",
  土: "金",
  金: "水",
  水: "木",
};

const CONTROLS: Record<FiveElement, FiveElement> = {
  木: "土",
  火: "金",
  土: "水",
  金: "木",
  水: "火",
};

const TEN_GOD_TO_GROUP: Record<string, TenGodGroup> = {
  比肩: "比劫",
  劫财: "比劫",
  食神: "食伤",
  伤官: "食伤",
  正财: "财",
  偏财: "财",
  正官: "官杀",
  七杀: "官杀",
  正印: "印",
  偏印: "印",
};

const HIDDEN_ROLE_WEIGHT: Record<string, number> = {
  主气: 0.7,
  中气: 0.2,
  余气: 0.1,
};

function asRecord(value: unknown): Record<string, unknown> | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }
  return value as Record<string, unknown>;
}

function toText(value: unknown): string | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed || undefined;
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return `${value}`;
  }
  return undefined;
}

function toElement(value: unknown): FiveElement | undefined {
  const hit = toText(value)?.match(/[木火土金水]/)?.[0];
  if (!hit) {
    return undefined;
  }
  return hit as FiveElement;
}

function toYinYang(value: unknown): "阳" | "阴" | undefined {
  const text = toText(value);
  if (text === "阳" || text === "阴") {
    return text;
  }
  return undefined;
}

function pickPillar(raw: Record<string, unknown> | undefined, key: PillarKey): PillarNode {
  const node = asRecord(raw?.[key]);
  const stemNode = asRecord(node?.["天干"]);
  const branchNode = asRecord(node?.["地支"]);
  const hiddenNode = asRecord(branchNode?.["藏干"]);

  const hidden: HiddenStem[] = [];
  if (hiddenNode) {
    for (const [role, info] of Object.entries(hiddenNode)) {
      const rec = asRecord(info);
      hidden.push({
        role,
        stem: toText(rec?.["天干"]),
        tenGod: toText(rec?.["十神"]),
      });
    }
  }

  return {
    key,
    stem: {
      stem: toText(stemNode?.["天干"]),
      element: toElement(stemNode?.["五行"]),
      yinYang: toYinYang(stemNode?.["阴阳"]),
      tenGod: toText(stemNode?.["十神"]),
    },
    branch: toText(branchNode?.["地支"]),
    branchElement: toElement(branchNode?.["五行"]),
    branchYinYang: toYinYang(branchNode?.["阴阳"]),
    hidden,
  };
}

function collectPillars(params: { raw: Record<string, unknown> | undefined; accuracyMode?: string }): PillarNode[] {
  const base: PillarKey[] = ["年柱", "月柱", "日柱", "时柱"];
  const keys =
    params.accuracyMode === "missing_time_six_pillars" ? base.filter((key) => key !== "时柱") : base;
  return keys.map((key) => pickPillar(params.raw, key));
}

function addElementScore(scores: Record<FiveElement, number>, element: FiveElement | undefined, weight: number): void {
  if (!element) {
    return;
  }
  scores[element] += weight;
}

function summarizeElementStructure(pillars: PillarNode[]): ElementStructure {
  const scores: Record<FiveElement, number> = { 木: 0, 火: 0, 土: 0, 金: 0, 水: 0 };

  for (const pillar of pillars) {
    addElementScore(scores, pillar.stem.element, 1);
    addElementScore(scores, pillar.branchElement, 1);
    for (const hidden of pillar.hidden) {
      addElementScore(scores, STEM_TO_ELEMENT[hidden.stem ?? ""], HIDDEN_ROLE_WEIGHT[hidden.role] ?? 0.1);
    }
  }

  const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]) as Array<[FiveElement, number]>;
  const dominant = sorted[0]?.[0] ?? "土";
  const weak = sorted[sorted.length - 1]?.[0] ?? "水";
  const max = sorted[0]?.[1] ?? 0;
  const min = sorted[sorted.length - 1]?.[1] ?? 0;
  const spread = max - min;

  const balanceLevel = spread <= 0.9 ? "均衡" : spread <= 1.8 ? "偏科" : "单极";

  let generatingEdges = 0;
  let controllingEdges = 0;
  const elements = Object.entries(scores).filter(([, value]) => value > 0.4) as Array<[FiveElement, number]>;
  for (const [a] of elements) {
    for (const [b] of elements) {
      if (a === b) {
        continue;
      }
      if (GENERATES[a] === b) {
        generatingEdges += 1;
      }
      if (CONTROLS[a] === b) {
        controllingEdges += 1;
      }
    }
  }

  const relationTrend =
    generatingEdges >= controllingEdges + 2
      ? "顺生偏多"
      : controllingEdges >= generatingEdges + 2
        ? "相克偏多"
        : "生克并存";

  return {
    scores,
    dominant,
    weak,
    balanceLevel,
    relationTrend,
  };
}

function bumpGroupScore(scores: Record<TenGodGroup, number>, tenGod: string | undefined, weight: number): void {
  if (!tenGod) {
    return;
  }
  const group = TEN_GOD_TO_GROUP[tenGod];
  if (!group) {
    return;
  }
  scores[group] += weight;
}

function summarizeTenGodStructure(params: {
  pillars: PillarNode[];
  mbti: MbtiInferenceProfile;
  primaryTenGod: string;
}): TenGodStructure {
  const groupScores: Record<TenGodGroup, number> = {
    比劫: 0,
    食伤: 0,
    财: 0,
    官杀: 0,
    印: 0,
  };

  for (const pillar of params.pillars) {
    bumpGroupScore(groupScores, pillar.stem.tenGod, 1);
    for (const hidden of pillar.hidden) {
      bumpGroupScore(groupScores, hidden.tenGod, HIDDEN_ROLE_WEIGHT[hidden.role] ?? 0.1);
    }
  }

  for (const item of params.mbti.basis.top_ten_gods) {
    bumpGroupScore(groupScores, item.name, item.energy_percent / 25);
  }

  bumpGroupScore(groupScores, params.primaryTenGod, 1.2);

  const sorted = Object.entries(groupScores).sort((a, b) => b[1] - a[1]) as Array<[TenGodGroup, number]>;
  const dominantGroup = sorted[0]?.[0] ?? "官杀";
  const weakGroup = sorted[sorted.length - 1]?.[0] ?? "印";

  const supportPairs: string[] = [];
  const conflictPairs: string[] = [];

  const hasStrong = (group: TenGodGroup): boolean => groupScores[group] >= 1.8;

  if (hasStrong("印") && hasStrong("官杀")) {
    supportPairs.push("印 × 官杀：理解力和规则感互相加固，做事稳而有章法");
  }
  if (hasStrong("食伤") && hasStrong("财")) {
    supportPairs.push("食伤 × 财：表达和结果意识联动，容易边说边落地");
  }
  if (hasStrong("比劫") && hasStrong("食伤")) {
    supportPairs.push("比劫 × 食伤：主张和表达耦合，推进速度快");
  }

  if (hasStrong("食伤") && hasStrong("官杀")) {
    conflictPairs.push("食伤 × 官杀：想表达和要守分寸会互相拉扯");
  }
  if (hasStrong("比劫") && hasStrong("财")) {
    conflictPairs.push("比劫 × 财：主导欲与资源分配容易冲突");
  }
  if (hasStrong("印") && hasStrong("财")) {
    conflictPairs.push("印 × 财：安全感需求与效率目标可能阶段性对撞");
  }

  return {
    groupScores,
    dominantGroup,
    weakGroup,
    supportPairs,
    conflictPairs,
  };
}

function collectComboKnowledgePoints(raw: Record<string, unknown> | undefined): Array<{ label: string; detail: string }> {
  const relationRoot = asRecord(raw?.["刑冲合会"]);
  if (!relationRoot) {
    return [];
  }

  const result: Array<{ label: string; detail: string }> = [];

  const walk = (node: unknown, path: string[]): void => {
    if (Array.isArray(node)) {
      for (const item of node) {
        walk(item, path);
      }
      return;
    }
    const rec = asRecord(node);
    if (!rec) {
      return;
    }

    const detail = toText(rec["知识点"]);
    const pair = toText(rec["柱"]);
    if (detail) {
      const pathLabel = path[path.length - 1] ?? "关系";
      result.push({
        label: pair ? `${pathLabel}（对${pair}柱）` : pathLabel,
        detail,
      });
    }

    for (const [key, value] of Object.entries(rec)) {
      if (key === "知识点" || key === "柱") {
        continue;
      }
      walk(value, [...path, key]);
    }
  };

  for (const [pillar, info] of Object.entries(relationRoot)) {
    walk(info, [pillar]);
  }

  return result;
}

function summarizeComboStructure(raw: Record<string, unknown> | undefined): ComboStructure {
  const points = collectComboKnowledgePoints(raw);
  let positiveCount = 0;
  let tensionCount = 0;

  const highlights: string[] = [];
  for (const point of points) {
    const text = `${point.label}${point.detail}`;
    if (/(合|会|拱)/.test(text)) {
      positiveCount += 1;
    }
    if (/(冲|刑|害|破|克|尅)/.test(text)) {
      tensionCount += 1;
    }
    if (highlights.length < 4) {
      highlights.push(`${point.label}：${point.detail}`);
    }
  }

  const surfaceVsDeep =
    tensionCount >= 4 && positiveCount >= 3
      ? "外在会显得克制理性，但底层有明显拉扯，关键时刻会快速切换到防御姿态。"
      : tensionCount >= 4
        ? "冲突信号偏多，性格里有“先防守再表达”的倾向，压力期更明显。"
        : positiveCount >= 4
          ? "协同信号偏多，平时更会先求和解与协作，但触底时也会突然收边界。"
          : "合冲并存，日常看起来稳定，关键节点会因场景不同呈现不同面向。";

  return {
    positiveCount,
    tensionCount,
    highlights,
    surfaceVsDeep,
  };
}

function groupTone(group: TenGodGroup | undefined): string {
  switch (group) {
    case "比劫":
      return "强调自主与扛事，容易形成“我先顶上”的适应方式。";
    case "食伤":
      return "强调表达和反馈，容易形成“先说清再推进”的习惯。";
    case "财":
      return "强调现实和结果，早期会被训练成“先看可落地”。";
    case "官杀":
      return "强调规则与责任，对边界、分寸和后果更敏感。";
    case "印":
      return "强调理解与安全，先观察再行动的倾向更明显。";
    default:
      return "信息不足，先按当前行为模式观察。";
  }
}

function inferPillarGroup(pillar?: PillarNode): TenGodGroup | undefined {
  if (!pillar) {
    return undefined;
  }
  const stemGroup = TEN_GOD_TO_GROUP[pillar.stem.tenGod ?? ""];
  if (stemGroup) {
    return stemGroup;
  }
  for (const hidden of pillar.hidden) {
    const group = TEN_GOD_TO_GROUP[hidden.tenGod ?? ""];
    if (group) {
      return group;
    }
  }
  return undefined;
}

function getDayMasterElement(dayMaster?: string, fallback?: FiveElement): FiveElement {
  const dm = (dayMaster ?? "").trim().charAt(0);
  return STEM_TO_ELEMENT[dm] ?? fallback ?? "土";
}

function relationOfElements(from: FiveElement, to: FiveElement): "同类" | "生" | "克" | "耗" | "受克" {
  if (from === to) {
    return "同类";
  }
  if (GENERATES[from] === to) {
    return "生";
  }
  if (CONTROLS[from] === to) {
    return "克";
  }
  if (GENERATES[to] === from) {
    return "耗";
  }
  return "受克";
}

function monthlyStrengthHint(params: {
  dayElement: FiveElement;
  monthElement?: FiveElement;
  mbti: MbtiInferenceProfile;
}): string {
  if (!params.monthElement) {
    return "月令信息不足，暂以日主与十神结构综合判断。";
  }
  const relation = relationOfElements(params.dayElement, params.monthElement);
  const strength = params.mbti.basis.day_master_strength;

  if (relation === "同类" || relation === "耗") {
    return `月令与日主同频或生扶，主驱动力偏稳定（${strength}），做事更依赖自身节奏。`;
  }
  if (relation === "生") {
    return `月令被日主所泄，驱动力偏“先输出再回补”，执行快但要注意续航（${strength}）。`;
  }
  if (relation === "克") {
    return `日主对月令有控制需求，常见模式是“先立边界再推进”，容易显得强势（${strength}）。`;
  }
  return `月令对日主形成制约，长期会把人格推向谨慎和风险管理（${strength}）。`;
}

function orientationHint(params: {
  dayMaster?: string;
  dayElement: FiveElement;
  tenGod: TenGodStructure;
}): { outwardInward: string; reactOrder: string; actionStyle: string } {
  const stem = (params.dayMaster ?? "").trim().charAt(0);
  const yinYang = STEM_TO_YINYANG[stem] ?? "阳";
  const outwardScore =
    (yinYang === "阳" ? 1 : -1) +
    (params.tenGod.groupScores["食伤"] + params.tenGod.groupScores["比劫"]) * 0.45 -
    (params.tenGod.groupScores["印"] + params.tenGod.groupScores["官杀"]) * 0.35;

  const outwardInward =
    outwardScore >= 0.8
      ? "天然偏外放：更容易先把立场和动作抛到台面上。"
      : outwardScore <= -0.8
        ? "天然偏内收：会先在心里过一遍，再决定要不要说。"
        : "外放与内收都在：看场景切换，熟悉场景更主动。";

  const reactOrder =
    params.tenGod.groupScores["印"] + params.tenGod.groupScores["官杀"] >=
    params.tenGod.groupScores["食伤"] + params.tenGod.groupScores["比劫"]
      ? "遇事更容易先做判断，再处理情绪。"
      : "遇事更容易先有感受，再进入判断。";

  const actionStyle =
    params.tenGod.groupScores["比劫"] + params.tenGod.groupScores["食伤"] >= 2.8
      ? "更像主动塑造环境的人，会先推动局面再微调。"
      : "更像先观察环境再行动的人，确认边界后才发力。";

  return { outwardInward, reactOrder, actionStyle };
}

function formatScoreLine(scores: Record<string, number>): string {
  return Object.entries(scores)
    .sort((a, b) => b[1] - a[1])
    .map(([name, score]) => `${name} ${score.toFixed(1)}`)
    .join(" / ");
}

function topValuesFromScores(tenGod: TenGodStructure): string[] {
  const candidates: Array<{ name: string; score: number }> = [
    { name: "边界与秩序", score: tenGod.groupScores["官杀"] + tenGod.groupScores["比劫"] * 0.4 },
    { name: "现实结果", score: tenGod.groupScores["财"] + tenGod.groupScores["官杀"] * 0.3 },
    { name: "安全感", score: tenGod.groupScores["印"] + tenGod.groupScores["官杀"] * 0.2 },
    { name: "自主空间", score: tenGod.groupScores["比劫"] + tenGod.groupScores["食伤"] * 0.2 },
    { name: "表达与被理解", score: tenGod.groupScores["食伤"] + tenGod.groupScores["印"] * 0.2 },
  ];
  return candidates
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map((item) => item.name);
}

function yesNoLabel(condition: boolean, yes: string, no: string): string {
  return condition ? yes : no;
}

function chooseDynamicTheme(tenGod?: string): {
  theme: string;
  personalityShift: string;
  communicationShift: string;
  relationShift: string;
  interactionAdvice: string;
} {
  const group = TEN_GOD_TO_GROUP[tenGod ?? ""];
  switch (group) {
    case "官杀":
      return {
        theme: "当前阶段更偏“责任和边界”主题。",
        personalityShift: "判断会更谨慎，优先看后果和可控性。",
        communicationShift: "说话更克制、更结论导向，解释欲下降。",
        relationShift: "关系里更强调分寸和稳定，讨厌模糊回应。",
        interactionAdvice: "沟通时先给结论和责任划分，再谈感受。",
      };
    case "食伤":
      return {
        theme: "当前阶段更偏“表达和释放”主题。",
        personalityShift: "表达欲上升，真实想法更容易直接说出来。",
        communicationShift: "语速和反馈频率会提升，耐心可能下降。",
        relationShift: "更需要互动感，被冷处理时反应更大。",
        interactionAdvice: "先回应情绪，再推进问题，不要反复试探。",
      };
    case "财":
      return {
        theme: "当前阶段更偏“结果和资源”主题。",
        personalityShift: "会明显关注效率、回报和投入产出。",
        communicationShift: "更讨厌空谈，偏好短句和可执行清单。",
        relationShift: "关系里会看实际投入与兑现，不吃口头承诺。",
        interactionAdvice: "沟通时给时间点和结果标准，减少抽象表达。",
      };
    case "印":
      return {
        theme: "当前阶段更偏“收缩和校准”主题。",
        personalityShift: "更想确认安全和确定性，外放意愿下降。",
        communicationShift: "会变得更慢热、更谨慎，先消化再回复。",
        relationShift: "更需要被理解，不喜欢被逼表态。",
        interactionAdvice: "先给空间和背景信息，再推进关键问题。",
      };
    case "比劫":
      return {
        theme: "当前阶段更偏“主导和边界”主题。",
        personalityShift: "自主性增强，不愿被压制或被安排。",
        communicationShift: "态度更硬、立场更明确，容忍含糊度降低。",
        relationShift: "关系里会更在意尊重和对等。",
        interactionAdvice: "对话时少绕弯，直接对齐目标和边界。",
      };
    default:
      return {
        theme: "当前阶段以稳态推进为主。",
        personalityShift: "不会改写原生性格框架，但会微调表达强度。",
        communicationShift: "沟通偏向先稳住再推进。",
        relationShift: "关系里更看一致性和可预期反馈。",
        interactionAdvice: "先给清晰目标，再给可执行下一步。",
      };
  }
}

function zodiacMicroTone(raw: Record<string, unknown> | undefined): string {
  const zodiac = toText(raw?.["生肖"]);
  if (!zodiac) {
    return "生肖信息不足，仅保留八字结构判断。";
  }
  const profile = SHENGXIAO_DATA[zodiac];
  const tone = profile?.personality?.[0];
  if (!tone) {
    return `生肖${zodiac}仅作轻微气质参考，不改变主体结论。`;
  }
  return `生肖${zodiac}可作为轻微气质修饰：${tone}`;
}

function trimTail(text: string): string {
  return text.trim().replace(/[。！？!?]+$/g, "");
}

function summarizeGrowthPath(pillars: PillarNode[]): string[] {
  const yearGroup = inferPillarGroup(pillars.find((pillar) => pillar.key === "年柱"));
  const monthGroup = inferPillarGroup(pillars.find((pillar) => pillar.key === "月柱"));
  const dayGroup = inferPillarGroup(pillars.find((pillar) => pillar.key === "日柱"));
  const hourGroup = inferPillarGroup(pillars.find((pillar) => pillar.key === "时柱"));

  return [
    `年柱（早期环境）：${groupTone(yearGroup)}`,
    `月柱（社会化训练）：${groupTone(monthGroup)}`,
    `日柱（核心自我与亲密反应）：${groupTone(dayGroup)}`,
    `时柱（后期表达与理想投射）：${groupTone(hourGroup)}`,
  ];
}

function pickNeedInRelationship(tenGod: TenGodStructure): string {
  const sorted = Object.entries(tenGod.groupScores).sort((a, b) => b[1] - a[1]) as Array<
    [TenGodGroup, number]
  >;
  const top = sorted[0]?.[0];
  if (top === "官杀") {
    return "关系里更需要秩序和可预期回应。";
  }
  if (top === "印") {
    return "关系里更需要被理解和稳定安全感。";
  }
  if (top === "比劫") {
    return "关系里更需要对等和主动权。";
  }
  if (top === "食伤") {
    return "关系里更需要互动感和表达空间。";
  }
  return "关系里更需要现实投入和兑现感。";
}

export function buildPsychologyProfileMarkdown(params: {
  chart: ChartLikeInput;
  mbti: MbtiInferenceProfile;
  primaryTenGod: string;
  style: StyleSnapshot;
  shift: Pick<StateShift, "behavior" | "communication" | "decision">;
  currentLuckText: string;
  currentLuckTenGod?: string;
  yearlySummary: string;
  relationText: string;
  accuracyHint: string;
}): string {
  const raw = asRecord(params.chart.raw_bazi);
  const pillars = collectPillars({ raw, accuracyMode: params.chart.accuracy_mode });
  const dayMasterStem = (params.chart.day_master ?? toText(raw?.["日主"]) ?? "").trim().charAt(0);
  const dayMasterElement = getDayMasterElement(dayMasterStem, pillars.find((pillar) => pillar.key === "日柱")?.stem.element);
  const monthElement = pillars.find((pillar) => pillar.key === "月柱")?.branchElement;

  const elementStructure = summarizeElementStructure(pillars);
  const tenGodStructure = summarizeTenGodStructure({
    pillars,
    mbti: params.mbti,
    primaryTenGod: params.primaryTenGod,
  });
  const comboStructure = summarizeComboStructure(raw);
  const dayMasterFrame = orientationHint({
    dayMaster: dayMasterStem,
    dayElement: dayMasterElement,
    tenGod: tenGodStructure,
  });
  const growthPath = summarizeGrowthPath(pillars);

  const analysisScore =
    tenGodStructure.groupScores["印"] +
    tenGodStructure.groupScores["官杀"] +
    elementStructure.scores["金"] * 0.35 +
    elementStructure.scores["土"] * 0.25;
  const intuitionScore =
    tenGodStructure.groupScores["食伤"] +
    elementStructure.scores["木"] * 0.35 +
    elementStructure.scores["水"] * 0.3;

  const macroScore =
    elementStructure.scores["木"] + elementStructure.scores["火"] + tenGodStructure.groupScores["食伤"];
  const detailScore =
    elementStructure.scores["金"] + elementStructure.scores["土"] + tenGodStructure.groupScores["官杀"];

  const logicScore =
    tenGodStructure.groupScores["官杀"] + tenGodStructure.groupScores["财"] + elementStructure.scores["金"] * 0.4;
  const feelingScore =
    tenGodStructure.groupScores["印"] + tenGodStructure.groupScores["食伤"] + elementStructure.scores["水"] * 0.35;

  const fastScore =
    tenGodStructure.groupScores["食伤"] + tenGodStructure.groupScores["比劫"] + tenGodStructure.groupScores["财"] * 0.3;
  const slowScore = tenGodStructure.groupScores["印"] + tenGodStructure.groupScores["官杀"];

  const riskControlScore =
    tenGodStructure.groupScores["官杀"] + tenGodStructure.groupScores["印"] + tenGodStructure.groupScores["财"] * 0.2;
  const opportunityScore =
    tenGodStructure.groupScores["食伤"] + tenGodStructure.groupScores["比劫"] + tenGodStructure.groupScores["财"] * 0.4;

  const valuesTop3 = topValuesFromScores(tenGodStructure);

  const directScore =
    tenGodStructure.groupScores["比劫"] + tenGodStructure.groupScores["官杀"] + elementStructure.scores["金"] * 0.3;
  const tactfulScore = tenGodStructure.groupScores["印"] + elementStructure.scores["水"] * 0.4;
  const longFormScore = tenGodStructure.groupScores["食伤"] + tenGodStructure.groupScores["印"] * 0.3;
  const calmScore = tenGodStructure.groupScores["官杀"] + tenGodStructure.groupScores["印"] * 0.3;
  const emotionVisibleScore = tenGodStructure.groupScores["食伤"] + elementStructure.scores["火"] * 0.35;
  const explainScore = tenGodStructure.groupScores["印"] + tenGodStructure.groupScores["食伤"] * 0.4;
  const sootheScore = tenGodStructure.groupScores["印"] + elementStructure.scores["水"] * 0.4;

  const warmupSlow =
    tenGodStructure.groupScores["印"] + tenGodStructure.groupScores["官杀"] + comboStructure.tensionCount * 0.2 >=
    tenGodStructure.groupScores["食伤"] + tenGodStructure.groupScores["比劫"];
  const trustSlow = comboStructure.tensionCount >= comboStructure.positiveCount + 1 || warmupSlow;
  const boundaryStrong =
    tenGodStructure.groupScores["官杀"] + tenGodStructure.groupScores["比劫"] + elementStructure.scores["金"] * 0.3 >=
    2.6;

  const dynamic = chooseDynamicTheme(params.currentLuckTenGod);

  return [
    "## 原局人格建模（步骤化）",
    "",
    "### 1) 日主与原生性格框架",
    `- 日主信息：${dayMasterStem || "未识别"}${dayMasterStem ? `（${dayMasterElement}）` : ""}｜${params.mbti.basis.day_master_strength}`,
    `- 核心结论：${dayMasterFrame.outwardInward}${dayMasterFrame.reactOrder}${dayMasterFrame.actionStyle}`,
    "",
    "### 2) 月令与旺衰结构",
    `- 月令主气：${monthElement ? `${monthElement}气` : "未完整提取"}`,
    `- 核心结论：${monthlyStrengthHint({ dayElement: dayMasterElement, monthElement, mbti: params.mbti })}`,
    "",
    "### 3) 五行结构",
    `- 能量分布：${formatScoreLine(elementStructure.scores)}`,
    `- 核心结论：主导能量 ${elementStructure.dominant}，短板能量 ${elementStructure.weak}；结构${elementStructure.balanceLevel}，整体${elementStructure.relationTrend}。`,
    "",
    "### 4) 十神结构",
    `- 功能分布：${formatScoreLine(tenGodStructure.groupScores)}`,
    `- 核心结论：主导功能 ${tenGodStructure.dominantGroup}，相对缺位 ${tenGodStructure.weakGroup}。`,
    `- 互相支撑：${tenGodStructure.supportPairs.length > 0 ? tenGodStructure.supportPairs.join("；") : "暂无明显强支撑对"}`,
    `- 互相拉扯：${tenGodStructure.conflictPairs.length > 0 ? tenGodStructure.conflictPairs.join("；") : "暂无明显强冲突对"}`,
    "",
    "### 5) 干支组合与刑冲合会修正",
    `- 结构观察：${comboStructure.surfaceVsDeep}`,
    `- 关键组合：${
      comboStructure.highlights.length > 0
        ? comboStructure.highlights.map((item) => `\n  - ${item}`).join("")
        : "\n  - 暂未提取到稳定组合信号"
    }`,
    "",
    "### 6) 四柱分工与养成路径",
    ...growthPath.map((line) => `- ${line}`),
    "",
    "## 二、五维人格画像",
    "",
    "### 1. 认知模式",
    `- 核心判断：${yesNoLabel(intuitionScore >= analysisScore, "偏直觉：先抓方向和可能性，再补证据。", "偏分析：先收集事实，再做结构化判断。")}${yesNoLabel(macroScore >= detailScore, "更看大局：先问方向与目标。", "更看细节：先对齐边界与标准。")}${yesNoLabel(logicScore >= feelingScore, "更重逻辑：以后果和可验证性为主。", "更重感受：会把关系温度与体验成本纳入判断。")}`,
    `- 具体表现：遇事第一反应通常是“先把问题框住，再决定动作顺序”；日常表达会带明显的结构词（先/再/最后）。`,
    `- 做决定时：最看重${trimTail(params.style.decisionCore)}；${yesNoLabel(fastScore >= slowScore, "决策偏快，先动起来再修正。", "决策偏稳，先校验再落地。")}${yesNoLabel(riskControlScore >= opportunityScore, "风险控制优先。", "机会驱动更强，但会给自己留止损。")}`,
    `- 容易出现的盲点：当主导逻辑被确认后推进会很快，可能低估他人消化成本；结构压力高时会收窄视角。`,
    "",
    "### 2. 价值系统",
    `- 核心判断：${yesNoLabel(tenGodStructure.groupScores["印"] + tenGodStructure.groupScores["官杀"] >= tenGodStructure.groupScores["食伤"] + tenGodStructure.groupScores["比劫"], "更重安全感和可预期。", "更重自由感和表达空间。")}${yesNoLabel(tenGodStructure.groupScores["财"] + tenGodStructure.groupScores["官杀"] >= tenGodStructure.groupScores["印"] + tenGodStructure.groupScores["食伤"], "更重成就与结果。", "更重关系质量与内在认同。")}${yesNoLabel(tenGodStructure.groupScores["官杀"] >= tenGodStructure.groupScores["食伤"], "更重秩序分寸。", "更重表达与被看见。")}`,
    `- 最看重的东西：${valuesTop3.join("、")}。`,
    `- 底线与反感点：底线是“边界不被反复突破、承诺必须兑现”；最容易触发防御的是${trimTail(params.style.misfireSignal.replace("最反感", ""))}。`,
    `- 选择偏好：做选择时优先保护长期节奏和信任资本，短期收益通常要服从长期可持续。`,
    "",
    "### 3. 沟通风格",
    `- 说话感觉：${yesNoLabel(directScore >= tactfulScore, "偏直接，信息密度高，讨厌绕弯。", "偏克制，先观察再回应，不轻易外露全部态度。")}`,
    `- 聊天节奏：${yesNoLabel(longFormScore >= 2.2, "愿意展开解释，尤其在重要议题上。", "偏短句和结论，先把要点给到。")}${yesNoLabel(emotionVisibleScore >= calmScore, "情绪可见度较高，状态会体现在语气里。", "整体冷静克制，情绪常被收在表达后段。")}`,
    `- 表达习惯：${yesNoLabel(tenGodStructure.groupScores["财"] + tenGodStructure.groupScores["官杀"] >= tenGodStructure.groupScores["印"] + tenGodStructure.groupScores["食伤"], "先说结论，再补背景。", "先铺垫背景，再给结论。")}${yesNoLabel(explainScore >= 2.1, "解释意愿中高，愿意把“为什么”说清。", "解释意愿偏低，更关注“接下来怎么做”。")}`,
    `- 情绪回应方式：${yesNoLabel(sootheScore >= 2.0, "会安抚情绪并给反馈，但通常会把话题拉回行动。", "安抚不是强项，更擅长直接给判断和动作建议。")}熟人与陌生人前的差异明显：熟人更柔，陌生场域更硬。`,
    "",
    "### 4. 关系模式",
    `- 进入关系的方式：${yesNoLabel(warmupSlow, "偏慢热，先观察一致性再投入。", "偏热络，互动中快速建立连接。")}`,
    `- 信任建立方式：${yesNoLabel(trustSlow, "信任建立偏慢，依赖长期稳定反馈。", "信任建立中速，边互动边验证。")}${pickNeedInRelationship(tenGodStructure)}`,
    `- 边界感表现：${yesNoLabel(boundaryStrong, "边界感强，尤其在时间、责任和承诺上。", "边界感中等，关系质量好时会更愿意让渡空间。")}`,
    `- 关系冲突时的反应：优先${trimTail(params.style.conflictApproach)}；在高压时可能在“解释 -> 沉默/切断”之间切换。最怕的是长期失真沟通和反复试探。`,
    "",
    "### 5. 状态机制",
    `- 平时状态：以“稳住主线、控制回撤、持续推进”为基线。`,
    `- 压力状态：${trimTail(params.shift.behavior)}；沟通会${trimTail(params.shift.communication)}；决策会${trimTail(params.shift.decision)}。`,
    `- 放松状态：安全感足够时会更愿意讲动机与顾虑，也更愿意给他人试错空间。`,
    `- 受伤状态：更容易出现防御性收缩（沉默、过度讲道理或短期冷处理），代价是关系温度下降。`,
    `- 顺境与逆境下的变化：顺境更主动与开放；逆境更强调边界、秩序和可控性。`,
    "",
    "## 三、当前动态分析",
    `- 当前阶段主题：${dynamic.theme}`,
    `- 当前最明显的性格偏移：${dynamic.personalityShift}`,
    `- 当前最明显的沟通偏移：${dynamic.communicationShift}`,
    `- 当前最明显的关系偏移：${dynamic.relationShift}`,
    `- 当前互动建议：${dynamic.interactionAdvice}`,
    `- 动态依据：当前大运 ${params.currentLuckText}｜流年摘要 ${params.yearlySummary}｜阶段说明 ${params.accuracyHint}`,
    "",
    "## 四、Agent 使用建议",
    "- 1）这个角色最像什么样的人：像一个有判断、有边界、能持续协作的现实派合作者。",
    "- 2）和他对话时最明显的体验：他会逼着问题变清晰，也会推动你给出下一步。",
    "- 3）最适合用什么语气和他互动：直接、真诚、给事实和上下文，少试探、多对齐。",
    "- 4）什么信息会让人格变得更真实：具体经历（触发-反应-结果）、长期关系模式、近期压力源。",
    "- 5）最容易让角色失真的地方：把他写成只会讲术语或永远单一强势，都会失去真人感。",
    "",
    "## 五、补充画像增强",
    `- 典型说话风格：${trimTail(params.style.voiceRule)}；${trimTail(params.style.responseRhythm)}；${trimTail(params.style.emotionPolicy)}。`,
    `- 关系中的典型反应：被关心时会先稳住；被误解时先澄清；被催促时先要边界；被冷落时会收缩投入。`,
    `- 压力下的防御方式：${trimTail(params.style.pressurePattern)}，可能伴随解释欲波动和耐心下降。`,
    `- 角色一致性原则：1) 先立场后动作 2) 边界与承诺一致 3) 动态只改强度，不改原生性格框架。`,
    "",
    "## 六、展示层对齐（MBTI 与生肖微调）",
    `- MBTI 对齐（展示层）：${params.mbti.mbti_type}。仅用于帮助理解，不参与核心推理。`,
    `- 生肖微调（展示层）：${zodiacMicroTone(raw)}`,
    `- 当前关系镜头：${params.relationText || "未指定关系"}`,
  ].join("\n");
}
