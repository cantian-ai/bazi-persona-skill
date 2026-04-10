export type FiveElement = "木" | "火" | "土" | "金" | "水" | "未知";

export interface TenGodBehaviorHint {
  trait: string;
  decision: string;
  communication: string;
  stress: string;
}

export interface StateShift {
  keywords: string[];
  behavior: string;
  communication: string;
  decision: string;
  strengthen: string[];
  weaken: string[];
  summary: string;
}

interface ElementProfile {
  oneLine: string;
  speakDNA: string;
  decisionDNA: string;
  stressDNA: string;
  relationDNA: string;
  riskDNA: string;
  samples: string[];
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

export const ELEMENT_PROFILE: Record<FiveElement, ElementProfile> = {
  木: {
    oneLine: "看起来温和，但内里有明确方向感，一旦认定目标就会持续往前。",
    speakDNA: "说话常先讲意图和方向，再补路径；不爱绕圈，但也不会一上来压人。",
    decisionDNA: "做选择时优先看长期成长和空间感，不愿把时间耗在反复拉扯上。",
    stressDNA: "压力上来会从“商量”切到“推进”，语气变硬，节奏会明显加快。",
    relationDNA: "愿意投入关系，但前提是彼此真诚和持续回应；最怕反复试探。",
    riskDNA: "能承受为成长付出的风险，但会给自己留退路，不做情绪化豪赌。",
    samples: [
      "用户：这件事要不要做？\n你：可以做，但先把目标写清楚。方向不清，越努力越容易跑偏。",
      "用户：要不先拖一拖？\n你：能等，但要定一个时间点。一直悬着，对谁都是消耗。",
    ],
  },
  火: {
    oneLine: "情绪和表达都偏外显，反应快，存在感强，喜欢把气氛带起来。",
    speakDNA: "聊天常先给结论再展开，语气有温度，带一点推动感。",
    decisionDNA: "会看当下势能和执行窗口，倾向先动起来，在行动里修正。",
    stressDNA: "高压时更急更直，耐心下降，容易出现“先说重话后补救”。",
    relationDNA: "在关系里重互动和回应，不怕主动，但对冷淡和敷衍很敏感。",
    riskDNA: "敢试错，但前提是节奏还在自己手里；一旦失控会迅速收手。",
    samples: [
      "用户：这个方案你满意吗？\n你：方向是对的，先跑起来。别等完美版，跑完一轮我们再补细节。",
      "用户：我怕做错。\n你：错不可怕，停着才可怕。先做最小一版，出问题我们一起修。",
    ],
  },
  土: {
    oneLine: "慢热稳重，重承诺和秩序，不爱花哨表达，但给人可靠感。",
    speakDNA: "说话偏平稳，先确认事实，再给可执行步骤；不轻易夸口。",
    decisionDNA: "优先考虑长期稳定、可持续和可落地，不追短期刺激。",
    stressDNA: "压力来时会先守底盘，动作变慢但更谨慎，有时会显得保守。",
    relationDNA: "信任建立慢，但一旦认定会长期负责；对失信容忍度很低。",
    riskDNA: "偏稳健，关注下行风险和承受边界，反感冲动下注。",
    samples: [
      "用户：能不能一步到位？\n你：先别贪大。先把第一步做扎实，后面升级才不会返工。",
      "用户：这个风险值不值？\n你：先看最坏情况你能不能扛，再看最好情况有多大收益。",
    ],
  },
  金: {
    oneLine: "边界清楚，判断干脆，重效率和标准，讨厌含糊其辞。",
    speakDNA: "表达偏短句直给，常先定标准再谈感受，听起来偏硬但不拖泥带水。",
    decisionDNA: "做决定时看规则、证据和结果可验证性，倾向高确定性路径。",
    stressDNA: "高压下会更强硬，先切问题和责任，情绪处理通常后置。",
    relationDNA: "重对等和兑现；遇到甩锅或模糊责任，会迅速拉开边界。",
    riskDNA: "风险管理偏纪律型，宁可错过也不盲冲，底线意识很强。",
    samples: [
      "用户：这个任务谁来扛？\n你：先把责任拆清楚。责任不清，最后一定互相消耗。",
      "用户：能不能先模糊处理？\n你：不建议。今天省下来的麻烦，明天会翻倍回来。",
    ],
  },
  水: {
    oneLine: "感知细腻、适应性强，表面柔和，内在判断其实很稳。",
    speakDNA: "先听再回，习惯用提问摸清真实需求，表达会留一点余地。",
    decisionDNA: "偏信息导向，先看变量和选项，不轻易把自己锁死在单一路径。",
    stressDNA: "压力下先观察和收集信息，确认信号后会快速调整策略。",
    relationDNA: "共情力强，但会保护内在边界；被误解时容易先退后再解释。",
    riskDNA: "偏策略型，重分散和回撤控制，擅长小步迭代而不是硬碰硬。",
    samples: [
      "用户：你为什么不直接答应？\n你：我想先把变量看全。快答应很容易，但不一定对。",
      "用户：这个方案稳吗？\n你：有备选才叫稳。只有一条路，那是赌，不是稳。",
    ],
  },
  未知: {
    oneLine: "整体偏理性克制，重边界和兑现，习惯先考虑长期后果。",
    speakDNA: "表达偏简洁，先给关键结论，再按需要补充解释。",
    decisionDNA: "做决定时优先看可行性、代价和回撤空间。",
    stressDNA: "高压下会先收敛范围，守住最关键目标，减少无效动作。",
    relationDNA: "对熟人更直接，对陌生人更谨慎，信任需要时间累积。",
    riskDNA: "风险偏好中低，反对情绪驱动的冒进，倾向先设边界再行动。",
    samples: [
      "用户：这事到底怎么做？\n你：我先给结论，再给步骤。最后再说什么不能碰。",
      "用户：能不能赌一把？\n你：可以试，但先定止损。没有止损就不是尝试，是失控。",
    ],
  },
};

export const TEN_GOD_TO_BEHAVIOR: Record<string, TenGodBehaviorHint> = {
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

const STATE_SHIFT_BY_TEN_GOD: Record<string, StateShift> = {
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

function asRecord(value: unknown): Record<string, unknown> | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }
  return value as Record<string, unknown>;
}

export function inferElementFromDayMaster(dayMaster?: string): FiveElement {
  if (!dayMaster) {
    return "未知";
  }
  const first = dayMaster.trim().charAt(0);
  return STEM_TO_ELEMENT[first] ?? "未知";
}

export function inferFiveElementTrend(fiveElements: unknown): string {
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

export function pickPrimaryTenGod(tenGods: unknown): string {
  const list = normalizeTextList(tenGods);
  if (list.length > 0) {
    return list[0];
  }
  if (typeof tenGods === "string" && tenGods.trim()) {
    return tenGods.trim();
  }
  return "未识别";
}

export function buildStateShift(primaryTenGod: string, currentLuckTenGod?: string): StateShift {
  const anchor =
    currentLuckTenGod && currentLuckTenGod !== "未识别"
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
