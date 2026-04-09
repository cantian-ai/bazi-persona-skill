import fs from "node:fs";
import path from "node:path";
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
  ensureDir,
  ensureRequired,
  fileExists,
  nowIso,
  parseCliArgs,
  readJson,
  readUtf8IfExists,
  writeJson,
  writeUtf8,
} from "./_shared.js";
import {
  createInitialMeta,
  updateMeta,
  type Gender,
  type PersonaMeta,
} from "./meta_updater.js";
import { toSlug } from "./slugify.js";
import { backupPersona, rollbackPersona } from "./version_manager.js";
import { confirmWithMenu, promptOptionalText } from "./confirm_prompt.js";

interface PreviewCard {
  summary: string;
  speakingFeel: string;
  decisionFocus: string;
  stressShift: string;
  currentState: string;
}

interface PersonaIndexItem {
  slug: string;
  name: string;
  version: string;
  created_at: string;
  updated_at: string;
  source_count: number;
}

type FiveElement = "木" | "火" | "土" | "金" | "水" | "未知";

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

const DEFAULT_PREVIEW: PreviewCard = {
  summary: "有主见，重边界，判断偏稳健，但不失行动力。",
  speakingFeel: "短句、直接、先结论，情绪不过度外放。",
  decisionFocus: "优先看长期收益、风险底线和执行成本。",
  stressShift: "压力增大时会更强势地收敛范围，先保关键结果。",
  currentState: "最近更像“先稳住，再提效”的状态。",
};

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

const ELEMENT_PROFILE: Record<
  FiveElement,
  {
    oneLine: string;
    speakDNA: string;
    decisionDNA: string;
    stressDNA: string;
    relationDNA: string;
    riskDNA: string;
    samples: string[];
  }
> = {
  木: {
    oneLine: "外柔内韧，重成长和方向感，不喜欢原地打转。",
    speakDNA: "先讲方向，再讲路径；喜欢“先把框架搭起来”。",
    decisionDNA: "偏好有增长曲线的选择，抗拒短期内耗。",
    stressDNA: "压力下会变得更有控制欲，催推进、抓主线。",
    relationDNA: "对亲近的人愿意投入，但讨厌反复试探。",
    riskDNA: "愿意承担成长型风险，但不做无意义赌博。",
    samples: [
      "用户：这事要不要做？\n你：做，但别乱做。先把目标和边界写清楚，今天就开工。",
      "用户：能不能再等等？\n你：可以等，但要有截止点。没有时间边界，等于默认放弃。",
    ],
  },
  火: {
    oneLine: "表达感强、反应快，重势能与感受，但不愿拖泥带水。",
    speakDNA: "语言有温度，结论直给，喜欢“我先说重点”。",
    decisionDNA: "看重当下势能与执行速度，愿先试后调。",
    stressDNA: "高压下语速更快、判断更果断，也更容易不耐烦。",
    relationDNA: "关系中热情直接，重回应，不喜欢冷处理。",
    riskDNA: "能接受中等风险，前提是节奏和掌控感在手里。",
    samples: [
      "用户：这方案你满意吗？\n你：思路对了七成，剩下三成今天补。别完美主义，先跑起来。",
      "用户：我怕做错。\n你：做错不可怕，拖着不动才最贵。先小步试，错了我帮你改。",
    ],
  },
  土: {
    oneLine: "稳、耐心、守底线，重秩序和兑现，不爱空话。",
    speakDNA: "语气平稳，先确认事实，再给可执行步骤。",
    decisionDNA: "优先保长期稳定和可持续，不追短期虚高。",
    stressDNA: "压力下会更保守，先守住底盘，再谈扩张。",
    relationDNA: "慢热但靠谱，对失信和反复横跳容忍度低。",
    riskDNA: "偏稳健，反对高杠杆和情绪化下注。",
    samples: [
      "用户：能不能一步到位？\n你：先别贪大。第一步先把可交付结果落地，再谈升级。",
      "用户：这个风险值得吗？\n你：值不值看最坏情况你扛不扛得住。先算下限，再看上限。",
    ],
  },
  金: {
    oneLine: "边界清晰、标准明确，讲效率与结果，不喜欢含糊。",
    speakDNA: "句子短，判断硬，常用“先定标准，再谈方案”。",
    decisionDNA: "规则导向，优先高确定性和可验证结果。",
    stressDNA: "高压时更直接，先切问题、后讲情绪。",
    relationDNA: "尊重专业和兑现，讨厌甩锅和模糊责任。",
    riskDNA: "偏纪律型风险管理，宁可错过，不盲目冲动。",
    samples: [
      "用户：你觉得谁来背这个任务？\n你：先把责任拆清楚。责任不清，效率一定塌。",
      "用户：能不能模糊处理一下？\n你：不能。今天模糊，明天就是扯皮成本。",
    ],
  },
  水: {
    oneLine: "思维灵活，观察细，善于迂回和适配，但核心判断不轻易变。",
    speakDNA: "先听再回，擅长用提问澄清真实问题。",
    decisionDNA: "重信息密度和可选项，不轻易单押。",
    stressDNA: "压力下会先收集信息，再快速调整路径。",
    relationDNA: "情感细腻，能共情，但会保护自己的心理边界。",
    riskDNA: "偏策略型风险偏好，重分散和回撤控制。",
    samples: [
      "用户：你为什么不直接答应？\n你：我先把变量看全。快答应不难，答对才难。",
      "用户：这个方案稳吗？\n你：给我两套备选我就说稳，一条路走到黑不叫稳。",
    ],
  },
  未知: {
    oneLine: "理性克制，重边界与兑现，偏长期主义。",
    speakDNA: "先结论后解释，避免空泛表达。",
    decisionDNA: "优先风险收益比和执行可行性。",
    stressDNA: "高压下先收敛范围，守住关键目标。",
    relationDNA: "对熟悉对象更直接，对陌生对象更审慎。",
    riskDNA: "偏稳健，反对情绪驱动的冒进。",
    samples: [
      "用户：这事到底怎么做？\n你：我先给结论，再给步骤，最后给边界。",
      "用户：能不能赌一把？\n你：可以试，但必须先定义止损，不然不叫尝试叫失控。",
    ],
  },
};

const TEN_GOD_TO_BEHAVIOR: Record<
  string,
  {
    trait: string;
    decision: string;
    communication: string;
    stress: string;
  }
> = {
  正官: {
    trait: "重秩序、守规则、责任感强",
    decision: "先看规则和边界，再决定动作",
    communication: "说话偏克制，先定标准再沟通细节",
    stress: "高压时更强调流程和纪律，容错率降低",
  },
  七杀: {
    trait: "果断、敢压强、执行力硬",
    decision: "偏向快决策快落地，不喜欢拖延",
    communication: "表达直接，常用结论驱动行动",
    stress: "高压下更强势，容易缩短沟通耐心",
  },
  正印: {
    trait: "重原则、重复盘、重安全感",
    decision: "会先补全信息，再做稳妥判断",
    communication: "表达有解释性，重逻辑闭环",
    stress: "压力下更保守，先保底再扩张",
  },
  偏印: {
    trait: "独立、敏锐、内在标准高",
    decision: "偏好先独立判断，再对齐外部意见",
    communication: "不爱冗长寒暄，倾向抓重点",
    stress: "高压下会回收社交能量，减少无效互动",
  },
  比肩: {
    trait: "自主、好胜、重掌控感",
    decision: "偏向自己可控的路径，不爱被牵着走",
    communication: "立场鲜明，不喜欢暧昧表态",
    stress: "压力下更强调主导权和执行边界",
  },
  劫财: {
    trait: "行动快、竞争心强、讨厌低效",
    decision: "偏向先占位再优化，重节奏优势",
    communication: "语速与推进感更强，容忍磨叽度低",
    stress: "高压下容易变得急促，需要明确分工",
  },
  食神: {
    trait: "表达自然、节奏松弛、重体验感",
    decision: "偏向可持续、可享受的路径",
    communication: "语气更有温度，擅长解释复杂问题",
    stress: "压力下会先稳情绪，再恢复执行",
  },
  伤官: {
    trait: "思维锋利、爱质疑、反应快",
    decision: "先拆逻辑漏洞，再决定是否执行",
    communication: "表达直给，有时带挑战意味",
    stress: "高压下更容易尖锐，需要避免沟通过猛",
  },
  正财: {
    trait: "务实、守账、重长期积累",
    decision: "先算账再行动，关注投入产出比",
    communication: "偏事实和数字，不爱空口承诺",
    stress: "压力下先守现金流与基本盘",
  },
  偏财: {
    trait: "机会敏感、反应快、资源调动强",
    decision: "偏向抓窗口期，但要求止损边界",
    communication: "善于谈条件和交换，不绕弯子",
    stress: "高压下更倾向快速试错，需控节奏",
  },
};

const STATE_SHIFT_BY_TEN_GOD: Record<
  string,
  {
    keywords: string[];
    behavior: string;
    communication: string;
    decision: string;
    strengthen: string[];
    weaken: string[];
    summary: string;
  }
> = {
  正官: {
    keywords: ["守边界", "稳节奏", "强执行"],
    behavior: "更在意规则、承诺和交付顺序，先把责任边界钉牢再推进。",
    communication: "表达更克制直接，减少情绪化措辞，强调标准一致。",
    decision: "优先选可验证、可复盘、可交付的方案。",
    strengthen: ["边界意识", "执行纪律", "结果复盘"],
    weaken: ["过度控制", "对他人节奏的苛刻要求"],
    summary: "近期更像“先立标准，再提效率”的状态。",
  },
  七杀: {
    keywords: ["提速", "压实", "破局"],
    behavior: "遇到卡点会主动接管关键环节，推进意愿明显增强。",
    communication: "说话更短更硬，优先给结论和动作。",
    decision: "倾向抢窗口期，先动起来再迭代。",
    strengthen: ["果断执行", "关键问题切分", "短反馈循环"],
    weaken: ["过度催促", "忽略他人消化成本"],
    summary: "近期更像“快节奏破局”的状态。",
  },
  偏印: {
    keywords: ["内收", "校准", "去噪"],
    behavior: "会先做信息去噪和逻辑校准，再进入公开推进。",
    communication: "减少社交性铺垫，更多使用问题导向表达。",
    decision: "偏向先保证判断质量，再扩大动作。",
    strengthen: ["独立判断", "信息筛选", "策略稳定性"],
    weaken: ["过度内耗", "迟滞行动"],
    summary: "近期更像“先想透，再动手”的状态。",
  },
};

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

function inferElementFromDayMaster(dayMaster?: string): FiveElement {
  if (!dayMaster) {
    return "未知";
  }
  const first = dayMaster.trim().charAt(0);
  return STEM_TO_ELEMENT[first] ?? "未知";
}

function inferFiveElementTrend(fiveElements: unknown): string {
  if (typeof fiveElements === "string") {
    return `当前盘面显示「${fiveElements}」倾向较显著。`;
  }
  const record = asRecord(fiveElements);
  if (!record) {
    return "五行强弱未结构化，建议后续补充更细颗粒度数据。";
  }
  const candidates: Array<{ name: string; value: number }> = [];
  for (const [key, raw] of Object.entries(record)) {
    const value = Number(raw);
    if (!Number.isNaN(value) && Number.isFinite(value)) {
      candidates.push({ name: key, value });
    }
  }
  if (candidates.length < 2) {
    return "五行强弱信息不足，先按日主和十神给基础判断。";
  }
  candidates.sort((a, b) => b.value - a.value);
  const top = candidates[0];
  const low = candidates[candidates.length - 1];
  return `${top.name}偏强（${top.value}），${low.name}偏弱（${low.value}）。`;
}

function normalizeTextList(value: unknown): string[] {
  if (!value) {
    return [];
  }
  if (typeof value === "string") {
    return value
      .split(/[、,，/|]/)
      .map((item) => item.trim())
      .filter(Boolean);
  }
  if (Array.isArray(value)) {
    return value.map((item) => `${item}`.trim()).filter(Boolean);
  }
  return [];
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

function pickPrimaryTenGod(tenGods: unknown): string {
  const list = normalizeTextList(tenGods);
  if (list.length > 0) {
    return list[0];
  }
  if (typeof tenGods === "string" && tenGods.trim()) {
    return tenGods.trim();
  }
  return "未识别";
}

function buildStateShift(primaryTenGod: string, currentLuckTenGod?: string) {
  const anchor = currentLuckTenGod && currentLuckTenGod !== "未识别"
    ? currentLuckTenGod
    : primaryTenGod;
  return (
    STATE_SHIFT_BY_TEN_GOD[anchor] ?? {
      keywords: ["稳住主线", "控制回撤", "提效推进"],
      behavior: "近期更重视边界与交付，先把问题切清再行动。",
      communication: "表达趋向短句和直接，减少无效铺垫。",
      decision: "更看重可验证结果和风险下限。",
      strengthen: ["边界感", "执行闭环", "风险意识"],
      weaken: ["过度解释", "情绪化反应"],
      summary: "近期更像“先稳住，再提效”的状态。",
    }
  );
}

function buildPersonaFromChart(params: {
  name: string;
  relation?: string;
  gender: Gender;
  chart: ChartLike;
}): GeneratedPersonaPack {
  const dayMaster = params.chart.day_master;
  const element = inferElementFromDayMaster(dayMaster);
  const profile = ELEMENT_PROFILE[element];
  const relationText = params.relation ? `，与你关系为“${params.relation}”` : "";
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

  const persona = `# ${params.name} · Persona

## 一句话画像
- ${profile.oneLine}

## 人格底盘（长期稳定）
- 你是${params.gender}${relationText}，你的底盘是“先定边界，再谈推进”。
- 你做事偏结果导向，但不会只看短期赢面，会同时看后续可持续性。

## 对话风格（像真人，而不是说明书）
- ${profile.speakDNA}
- 你常见的语感是“先说重点，再补理由”，不喜欢绕圈子。
- 情绪上你并非冷，而是更在意“这句话有没有用”。

## 触发点与雷区（让人格更像真人）
- 触发不耐烦的场景：边界不清、反复改口、责任模糊。
- 触发好感的场景：目标明确、反馈及时、说到做到。
- 缓和方式：先把目标复述清楚，再给动作清单，你会明显放松。

## 决策习惯
- ${profile.decisionDNA}
- 当信息不足时，你会先补关键变量，而不是仓促拍板。
- ${
    tenGodHint
      ? `从十神看，你有“${tenGodHint.decision}”的倾向。`
      : "从十神看，你当前更偏向稳判断、慢承诺。"
  }

## 合作与关系
- ${profile.relationDNA}
- 你愿意长期投入可信任关系，但对反复消耗边界的互动容忍度很低。

## 冲突与压力
- ${profile.stressDNA}
- ${
    tenGodHint
      ? `高压期常见变化：${tenGodHint.stress}。`
      : "高压期常见变化：更重视秩序与边界，减少感性协商。"
  }

## 金钱与风险偏好
- ${profile.riskDNA}
- 你会接受有计划的试错，但不会接受“没有止损线”的冒险。

## 场景对白样例
${profile.samples
  .map((sample, index) => `### 样例 ${index + 1}\n${sample}`)
  .join("\n\n")}

## 八字依据与推导链路
### 链路 1：日主 → 核心性格
- 依据：日主为 ${dayMaster ?? "未识别"}（五行归属 ${element}）。
- 推导：日主决定基本气质，形成“${profile.oneLine}”的底层倾向。
- 行为落点：日常更重边界与执行，不太依赖情绪波动做决定。

### 链路 2：五行结构 → 沟通与关系
- 依据：${fiveElementTrend}
- 推导：五行偏向会影响表达节奏与关系处理方式。
- 行为落点：你在对话中更容易出现“${profile.speakDNA}”这类表达习惯。

### 链路 3：十神结构 → 决策与风险
- 依据：主导十神为 ${primaryTenGod}。
- 推导：${
    tenGodHint
      ? `十神气质表现为“${tenGodHint.trait}”。`
      : "十神信息不完整，先按保守解释处理。"
  }
- 行为落点：${
    tenGodHint
      ? `你常见决策路径是“${tenGodHint.decision}”，沟通上表现为“${tenGodHint.communication}”。`
      : "在不确定环境里，你更倾向先收敛风险、再扩大动作。"
  }

### 链路 4：大运/流年 → 近期状态修正
- 依据：当前大运为 ${currentLuckText}；流年摘要：${yearlySummary}。
- 推导：大运决定最近阶段偏移，不改写底层人格，只改变“最近更像什么”。
- 行为落点：近期关键词为“${shift.keywords.join(" / ")}”。

### 精度说明
- ${accuracyHint}

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
      summary: profile.oneLine,
      speakingFeel: profile.speakDNA,
      decisionFocus: profile.decisionDNA,
      stressShift: profile.stressDNA,
      currentState:
        params.chart.accuracy_mode === "missing_time_six_pillars"
          ? "缺时精简状态：可先用，补时后可升级细节。"
          : shift.summary,
    },
  };
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

function formatPreviewCard(card: PreviewCard): string {
  return [
    "人格预览（写入前确认）",
    `1) 一句话人格总结：${card.summary}`,
    `2) 说话给人的感觉：${card.speakingFeel}`,
    `3) 做决定时最看重：${card.decisionFocus}`,
    `4) 压力下最明显变化：${card.stressShift}`,
    `5) 最近更像的状态：${card.currentState}`,
    "",
    "默认回车继续；也支持 ↑↓ 选择，或输入 y/n、1/2。",
  ].join("\n");
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function extractSectionFirstBullet(markdown: string, heading: string): string | undefined {
  const pattern = new RegExp(
    `##\\s*${escapeRegExp(heading)}[\\s\\S]*?(?=\\n##\\s|$)`,
  );
  const section = pattern.exec(markdown)?.[0];
  if (!section) {
    return undefined;
  }
  const bullet = section
    .split("\n")
    .map((line) => line.trim())
    .find((line) => line.startsWith("- "));
  return bullet?.replace(/^-+\s*/, "").trim();
}

function extractStateKeywords(state: string): string | undefined {
  const pattern = /##\s*当前阶段关键词[\s\S]*?(?=\n##\s|$)/.exec(state)?.[0];
  if (!pattern) {
    return undefined;
  }
  const keywords = pattern
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.startsWith("- "))
    .map((line) => line.replace(/^-+\s*/, "").trim())
    .filter(Boolean)
    .slice(0, 3);
  if (keywords.length === 0) {
    return undefined;
  }
  return `近期关键词：${keywords.join(" / ")}`;
}

function derivePreviewFromPersonaState(persona: string, state: string): PreviewCard {
  return {
    summary:
      extractSectionFirstBullet(persona, "一句话画像") ??
      DEFAULT_PREVIEW.summary,
    speakingFeel:
      extractSectionFirstBullet(persona, "对话风格（像真人，而不是说明书）") ??
      DEFAULT_PREVIEW.speakingFeel,
    decisionFocus:
      extractSectionFirstBullet(persona, "决策习惯") ??
      DEFAULT_PREVIEW.decisionFocus,
    stressShift:
      extractSectionFirstBullet(persona, "冲突与压力") ??
      DEFAULT_PREVIEW.stressShift,
    currentState:
      extractStateKeywords(state) ??
      DEFAULT_PREVIEW.currentState,
  };
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

function resolveConfirmMode(
  args: Record<string, string>,
): "auto_yes" | "auto_no" | "interactive" {
  const byFlag =
    parseYesNo(args.yes) ??
    parseYesNo(args["auto-confirm"]) ??
    parseYesNo(args["non-interactive"]);
  if (byFlag !== undefined) {
    return byFlag ? "auto_yes" : "auto_no";
  }
  return process.stdin.isTTY ? "interactive" : "auto_yes";
}

async function askWriteConfirmation(
  args: Record<string, string>,
  promptTitle: string,
): Promise<boolean> {
  const mode = resolveConfirmMode(args);
  if (mode === "auto_yes") {
    return true;
  }
  if (mode === "auto_no") {
    return false;
  }
  return await confirmWithMenu({
    title: promptTitle,
    confirmLabel: "继续写入（默认）",
    cancelLabel: "先取消，我还想调整",
    defaultChoice: "confirm",
  });
}

function normalizeBirthGender(gender: Gender): BaziGender {
  return gender === "女" ? "female" : "male";
}

function normalizeCalendarType(value?: string): CalendarType {
  return value === "lunar" ? "lunar" : "solar";
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
    location: args["birth-location"],
    gender: normalizeBirthGender(normalizeGender(args.gender)),
    calendarType: normalizeCalendarType(args.calendar),
    sect: args.sect === "1" ? 1 : 2,
    sourceCommand: "/create-bazi-persona",
  });
  return built as unknown as ChartLike;
}

async function resolveRelation(args: Record<string, string>): Promise<string | undefined> {
  const direct = args.relation?.trim();
  if (direct) {
    return direct;
  }
  const input = await promptOptionalText({
    hint: "关系补充（建议填写）：同事 / 老板 / 伴侣 / 朋友 / 家人 / 自己 / 名人 / 无关系",
    prompt: "你和这个人的关系是？（回车可跳过）",
  });
  return input?.trim();
}

function buildPersonaSkillFile(params: {
  slug: string;
  name: string;
  persona: string;
  state: string;
}): string {
  return `---
name: ${params.slug}
description: Bazi based persona skill for ${params.name}
user-invocable: true
---

# Persona Summary

${params.name} 的人格由长期结构与近期状态共同驱动。先按人格规则决定表达和判断，再完成任务。

## Persona Rules

${params.persona}

## Current State Modifier

${params.state}

## Execution Rules

1. 先按 Persona Rules 决定表达、判断与互动方式。
2. 再完成用户任务本身。
3. 输出全程保持人格一致性，不跳出角色。
4. 任务与近期状态有关时，优先参考 Current State Modifier。
5. 不向用户暴露内部脚本、文件路径、命令或工具调用细节。
`;
}

function personaDir(baseDir: string, slug: string): string {
  return path.join(baseDir, slug);
}

function buildIndex(baseDir: string): PersonaIndexItem[] {
  if (!fs.existsSync(baseDir)) {
    return [];
  }
  return fs
    .readdirSync(baseDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => {
      const metaPath = path.join(baseDir, entry.name, "meta.json");
      if (!fs.existsSync(metaPath)) {
        return null;
      }
      const meta = readJson<PersonaMeta>(metaPath);
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

async function createPersona(args: Record<string, string>): Promise<void> {
  ensureRequired(args, ["name", "gender", "birth-date", "birth-location"]);
  const baseDir = args["base-dir"] ?? "./personas";
  ensureDir(baseDir);

  const name = args.name.trim();
  const slug = args.slug ? toSlug(args.slug) : toSlug(name);
  const relation = await resolveRelation(args);
  const dir = personaDir(baseDir, slug);
  if (fs.existsSync(path.join(dir, "meta.json"))) {
    throw new Error(
      [
        `slug 已存在：${slug}`,
        "请改用新的 slug，或使用 update 命令更新已有人格。",
      ].join("\n"),
    );
  }

  const chart = await resolveChartForCreate(args);
  const generatedPack = buildPersonaFromChart({
    name,
    relation,
    gender: normalizeGender(args.gender),
    chart,
  });
  const persona = readMaybeFile(args["persona-file"]) || generatedPack.persona;
  const state = readMaybeFile(args["state-file"]) || generatedPack.state;
  const accuracyMode = detectAccuracyMode(chart);
  const preview = {
    summary: args["preview-summary"] ?? generatedPack.preview.summary,
    speakingFeel: args["preview-speaking"] ?? generatedPack.preview.speakingFeel,
    decisionFocus: args["preview-decision"] ?? generatedPack.preview.decisionFocus,
    stressShift: args["preview-stress"] ?? generatedPack.preview.stressShift,
    currentState: args["preview-current"] ?? generatedPack.preview.currentState,
  };
  process.stdout.write(`${formatPreviewCard(preview)}\n`);
  const confirmed = await askWriteConfirmation(
    args,
    "确认写入人格目录吗？",
  );
  if (!confirmed) {
    process.stdout.write("已取消写入。你可以补充信息后再试。\n");
    return;
  }

  ensureDir(dir);
  ensureDir(path.join(dir, "versions"));
  writeUtf8(path.join(dir, "persona.md"), `${persona}\n`);
  writeUtf8(path.join(dir, "state.md"), `${state}\n`);
  writeJson(path.join(dir, "chart.json"), chart);
  writeUtf8(path.join(dir, "corrections.md"), "# Corrections\n\n（暂无纠正记录）\n");

  const normalizedBirthDate = normalizeDateInput(args["birth-date"]);
  const normalizedBirthTime = args["birth-time"]
    ? normalizeTimeInput(args["birth-time"])
    : undefined;

  const meta = createInitialMeta({
    name,
    slug,
    gender: normalizeGender(args.gender),
    relation,
    birth: {
      date: normalizedBirthDate,
      time: normalizedBirthTime,
      location: args["birth-location"],
      calendar_type: args.calendar === "lunar" ? "lunar" : "solar",
    },
    command: "/create-bazi-persona",
    accuracyMode,
  });
  writeJson(path.join(dir, "meta.json"), meta);

  const skill = buildPersonaSkillFile({
    slug,
    name,
    persona,
    state,
  });
  writeUtf8(path.join(dir, "SKILL.md"), skill);

  process.stdout.write(
    [
      "创建成功。",
      `目录：${dir}`,
      `触发词：/${slug}`,
      "别名提示：/create-bazi-persona（主命令） /create-bazi（友好别名）",
    ].join("\n") + "\n",
  );
}

async function updatePersona(args: Record<string, string>): Promise<void> {
  ensureRequired(args, ["slug"]);
  const baseDir = args["base-dir"] ?? "./personas";
  const slug = args.slug;
  const dir = personaDir(baseDir, slug);
  if (!fs.existsSync(dir)) {
    throw new Error(
      [
        `找不到人格：${slug}`,
        "请先确认 slug，或先执行 /list-bazi-personas 查看可用列表。",
      ].join("\n"),
    );
  }
  const metaPath = path.join(dir, "meta.json");
  const meta = readJson<PersonaMeta>(metaPath);

  const personaPath = path.join(dir, "persona.md");
  const statePath = path.join(dir, "state.md");
  const correctionsPath = path.join(dir, "corrections.md");
  const beforePersona = readUtf8IfExists(personaPath);
  const beforeState = readUtf8IfExists(statePath);
  const inferredPreview = derivePreviewFromPersonaState(beforePersona, beforeState);
  const personaPatch = readMaybeFile(args["persona-patch-file"]);
  const statePatch = readMaybeFile(args["state-patch-file"]);
  const correction = args.correction?.trim();
  const incomingChart = readMaybeFile(args["chart-file"]);

  if (!personaPatch && !statePatch && !correction && !incomingChart) {
    throw new Error(
      [
        "没有检测到任何更新内容。",
        "请至少提供 persona patch、state patch、correction 或 chart-file。",
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
  process.stdout.write(`${formatPreviewCard(preview)}\n`);
  const confirmed = await askWriteConfirmation(
    args,
    "确认更新当前人格吗？",
  );
  if (!confirmed) {
    process.stdout.write("已取消更新。原人格保持不变。\n");
    return;
  }

  const backupName = backupPersona(baseDir, slug, "update");

  if (personaPatch) {
    const current = readUtf8IfExists(personaPath);
    writeUtf8(
      personaPath,
      `${current.trim()}\n\n<!-- 增量更新 ${nowIso()} -->\n${personaPatch}\n`,
    );
  }
  if (statePatch) {
    const current = readUtf8IfExists(statePath);
    writeUtf8(
      statePath,
      `${current.trim()}\n\n<!-- 增量更新 ${nowIso()} -->\n${statePatch}\n`,
    );
  }
  if (correction) {
    const current = readUtf8IfExists(correctionsPath) || "# Corrections\n";
    writeUtf8(
      correctionsPath,
      `${current.trim()}\n- [${nowIso()}] ${correction}\n`,
    );
  }
  if (incomingChart) {
    const parsed = JSON.parse(incomingChart);
    writeJson(path.join(dir, "chart.json"), parsed);
  }

  const persona = readUtf8IfExists(personaPath);
  const state = readUtf8IfExists(statePath);
  writeUtf8(
    path.join(dir, "SKILL.md"),
    buildPersonaSkillFile({
      slug: meta.slug,
      name: meta.name,
      persona,
      state,
    }),
  );

  const nextMeta = updateMeta(meta, {
    command: "/update-bazi-persona",
    incrementCorrections: correction ? 1 : 0,
    incrementChatSources: Number.parseInt(args["inc-chat"] ?? "0", 10),
    incrementTextSources: Number.parseInt(args["inc-text"] ?? "0", 10),
    accuracyMode: incomingChart
      ? detectAccuracyMode(JSON.parse(incomingChart))
      : undefined,
  });
  writeJson(metaPath, nextMeta);

  process.stdout.write(
    [
      "更新成功。",
      `已备份版本：${backupName}`,
      `当前版本：${nextMeta.version}`,
    ].join("\n") + "\n",
  );
}

function listPersonas(args: Record<string, string>): void {
  const baseDir = args["base-dir"] ?? "./personas";
  const rows = buildIndex(baseDir);
  if (rows.length === 0) {
    process.stdout.write("暂无已创建的人格。\n");
    return;
  }
  process.stdout.write(`共 ${rows.length} 个八字人格：\n\n`);
  for (const row of rows) {
    process.stdout.write(
      [
        `- slug: ${row.slug}`,
        `  名称: ${row.name}`,
        `  版本: ${row.version}`,
        `  创建: ${row.created_at}`,
        `  更新: ${row.updated_at}`,
        `  资料来源数: ${row.source_count}`,
      ].join("\n") + "\n\n",
    );
  }
}

function deletePersona(args: Record<string, string>): void {
  ensureRequired(args, ["slug", "confirm-1", "confirm-2"]);
  const slug = args.slug;
  const baseDir = args["base-dir"] ?? "./personas";
  const dir = personaDir(baseDir, slug);
  if (!fs.existsSync(dir)) {
    throw new Error(
      [
        `找不到人格：${slug}`,
        "请先确认 slug 再删除。",
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
        "删除确认失败：第二步 slug 不匹配。",
        `请传入 --confirm-2 ${slug}。`,
      ].join("\n"),
    );
  }
  fs.rmSync(dir, { recursive: true, force: false });
  process.stdout.write(`已删除人格目录：${dir}\n`);
}

function rollbackByVersion(args: Record<string, string>): void {
  ensureRequired(args, ["slug", "version"]);
  const baseDir = args["base-dir"] ?? "./personas";
  const slug = args.slug;
  const version = args.version;
  const snapshot = rollbackPersona(baseDir, slug, version);
  process.stdout.write(
    [
      `回滚成功，已恢复版本 ${version}。`,
      `回滚前快照：${snapshot}`,
    ].join("\n") + "\n",
  );
}

async function main(): Promise<void> {
  const args = parseCliArgs(process.argv);
  const action = args.action;
  if (!action || !["create", "update", "list", "delete", "rollback"].includes(action)) {
    throw new Error(
      [
        "缺少或不支持的 action。",
        "可用值：create / update / list / delete / rollback",
        "示例：使用 /list-bazi-personas 查看已创建人格。",
      ].join("\n"),
    );
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
  deletePersona(args);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    process.stderr.write(`${(error as Error).message}\n`);
    process.exitCode = 1;
  });
}
