const TEN_GODS = [
  "正官",
  "七杀",
  "正财",
  "偏财",
  "正印",
  "偏印",
  "食神",
  "伤官",
  "比肩",
  "劫财",
] as const;

type TenGod = (typeof TEN_GODS)[number];
type FiveElement = "木" | "火" | "土" | "金" | "水";
type DayMasterStrength = "极旺" | "太旺" | "较强" | "均衡" | "较弱" | "极弱";

type UnknownRecord = Record<string, unknown>;

export interface MbtiInferenceProfile {
  mbti_type: string;
  scores: {
    ScoreEI: number;
    ScoreSN: number;
    ScoreTF: number;
    ScoreJP: number;
  };
  tendency_analysis: Record<string, string>;
  basis: {
    day_master_stem?: string;
    day_master_element: FiveElement;
    day_master_strength: DayMasterStrength;
    favorable_elements: FiveElement[];
    unfavorable_elements: FiveElement[];
    top_ten_gods: Array<{ name: TenGod; energy_percent: number }>;
    yin_transforms_guansha_calibration: boolean;
  };
}

export interface BaziMbtiInput {
  day_master?: string;
  raw_bazi?: unknown;
  ten_gods?: unknown;
  five_elements?: unknown;
}

function asRecord(value: unknown): UnknownRecord | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }
  return value as UnknownRecord;
}

function toStringValue(value: unknown): string | undefined {
  if (typeof value === "string") {
    return value.trim();
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return `${value}`.trim();
  }
  return undefined;
}

function toNumberValue(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const parsed = Number.parseFloat(value.replace(/%/g, "").trim());
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return undefined;
}

function deepFindByKeys(node: unknown, keyCandidates: string[]): unknown | undefined {
  if (!node || typeof node !== "object") {
    return undefined;
  }
  const record = node as UnknownRecord;
  for (const key of Object.keys(record)) {
    if (keyCandidates.includes(key)) {
      return record[key];
    }
  }
  for (const child of Object.values(record)) {
    const found = deepFindByKeys(child, keyCandidates);
    if (found !== undefined) {
      return found;
    }
  }
  return undefined;
}

function normalizeElement(value: string | undefined): FiveElement | undefined {
  if (!value) {
    return undefined;
  }
  const hit = value.match(/[木火土金水]/);
  if (!hit) {
    return undefined;
  }
  return hit[0] as FiveElement;
}

function parseElements(value: unknown): FiveElement[] {
  const result: FiveElement[] = [];
  const pushElement = (element?: FiveElement) => {
    if (!element || result.includes(element)) {
      return;
    }
    result.push(element);
  };
  if (Array.isArray(value)) {
    for (const item of value) {
      pushElement(normalizeElement(toStringValue(item)));
    }
    return result;
  }
  const text = toStringValue(value);
  if (!text) {
    return result;
  }
  const matches = text.match(/[木火土金水]/g) ?? [];
  for (const item of matches) {
    pushElement(item as FiveElement);
  }
  return result;
}

function extractDayMasterStem(input: BaziMbtiInput): string | undefined {
  const fromChart = toStringValue(input.day_master);
  if (fromChart && /[甲乙丙丁戊己庚辛壬癸]/.test(fromChart)) {
    return fromChart.charAt(0);
  }
  const raw = asRecord(input.raw_bazi);
  const dayGan = toStringValue(asRecord(asRecord(raw?.["日柱"])?.["天干"])?.["天干"]);
  if (dayGan && /[甲乙丙丁戊己庚辛壬癸]/.test(dayGan)) {
    return dayGan.charAt(0);
  }
  const rawDayMaster = toStringValue(raw?.["日主"]) || toStringValue(raw?.["日元"]);
  if (rawDayMaster && /[甲乙丙丁戊己庚辛壬癸]/.test(rawDayMaster)) {
    return rawDayMaster.charAt(0);
  }
  return undefined;
}

const GAN_TO_WUXING: Record<string, FiveElement> = {
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

function extractDayMasterElement(input: BaziMbtiInput, dayMasterStem?: string): FiveElement {
  if (dayMasterStem && GAN_TO_WUXING[dayMasterStem]) {
    return GAN_TO_WUXING[dayMasterStem];
  }
  const raw = asRecord(input.raw_bazi);
  const fromDayPillar = normalizeElement(
    toStringValue(asRecord(asRecord(raw?.["日柱"])?.["天干"])?.["五行"]),
  );
  if (fromDayPillar) {
    return fromDayPillar;
  }
  return "土";
}

function normalizeStrength(rawStrength?: string): DayMasterStrength {
  if (!rawStrength) {
    return "均衡";
  }
  const text = rawStrength.replace(/\s+/g, "");
  if (/(极旺|过旺|从强)/.test(text)) {
    return "极旺";
  }
  if (/(太旺|很旺|旺极)/.test(text)) {
    return "太旺";
  }
  if (/(较强|偏强|身强|稍强|旺)/.test(text)) {
    return "较强";
  }
  if (/(极弱|从弱)/.test(text)) {
    return "极弱";
  }
  if (/(较弱|偏弱|身弱|稍弱|弱|衰)/.test(text)) {
    return "较弱";
  }
  if (/(中和|平衡|均衡|平稳)/.test(text)) {
    return "均衡";
  }
  return "均衡";
}

function extractStrength(input: BaziMbtiInput): DayMasterStrength {
  const candidates = [
    deepFindByKeys(input.raw_bazi, ["日主强弱", "日主旺衰", "身强弱", "旺衰"]),
    deepFindByKeys(input.five_elements, ["日主强弱", "日主旺衰", "身强弱", "旺衰"]),
  ];
  for (const candidate of candidates) {
    const text = toStringValue(candidate);
    if (text) {
      return normalizeStrength(text);
    }
    const record = asRecord(candidate);
    if (record) {
      for (const key of ["日主强弱", "日主旺衰", "身强弱", "旺衰"]) {
        const value = toStringValue(record[key]);
        if (value) {
          return normalizeStrength(value);
        }
      }
    }
  }
  return "均衡";
}

function extractFavorableUnfavorableElements(input: BaziMbtiInput): {
  favorable: FiveElement[];
  unfavorable: FiveElement[];
} {
  const source = [
    deepFindByKeys(input.raw_bazi, ["综合推荐", "喜用神分析", "喜忌"]),
    deepFindByKeys(input.five_elements, ["综合推荐", "喜用神分析", "喜忌"]),
    input.raw_bazi,
    input.five_elements,
  ];

  for (const candidate of source) {
    const record = asRecord(candidate);
    if (!record) {
      continue;
    }
    const favorable = parseElements(
      record["喜用五行"] ??
        record["喜神"] ??
        record["喜用"] ??
        record["favorableElements"],
    );
    const unfavorable = parseElements(
      record["忌用五行"] ??
        record["忌神"] ??
        record["忌用"] ??
        record["unfavorableElements"],
    );
    if (favorable.length > 0 || unfavorable.length > 0) {
      return { favorable, unfavorable };
    }
  }

  return { favorable: [], unfavorable: [] };
}

function parseTenGodRecord(record: UnknownRecord): Partial<Record<TenGod, number>> {
  const result: Partial<Record<TenGod, number>> = {};
  for (const tenGod of TEN_GODS) {
    const value = toNumberValue(record[tenGod]);
    if (value !== undefined && value >= 0) {
      result[tenGod] = value;
    }
  }
  return result;
}

function extractTenGodPercentagesFromStructured(input: BaziMbtiInput): Partial<Record<TenGod, number>> {
  const candidateNodes = [
    deepFindByKeys(input.ten_gods, ["十神能量分布-百分比", "tenGodEnergyPercent", "tenGodDistribution"]),
    input.ten_gods,
    deepFindByKeys(input.raw_bazi, ["十神能量分布-百分比", "tenGodEnergyPercent", "tenGodDistribution"]),
  ];
  for (const node of candidateNodes) {
    const record = asRecord(node);
    if (!record) {
      continue;
    }
    const parsed = parseTenGodRecord(record);
    if (Object.keys(parsed).length > 0) {
      return parsed;
    }
  }
  return {};
}

function addWeightedTenGod(
  bucket: Partial<Record<TenGod, number>>,
  tenGodValue: unknown,
  weight: number,
): void {
  const tenGod = toStringValue(tenGodValue) as TenGod | undefined;
  if (!tenGod || !TEN_GODS.includes(tenGod) || weight <= 0) {
    return;
  }
  bucket[tenGod] = (bucket[tenGod] ?? 0) + weight;
}

function extractTenGodPercentagesFromPillars(input: BaziMbtiInput): Partial<Record<TenGod, number>> {
  const raw = asRecord(input.raw_bazi);
  if (!raw) {
    return {};
  }
  const bucket: Partial<Record<TenGod, number>> = {};
  const pillars = ["年柱", "月柱", "日柱", "时柱"];
  for (const pillarKey of pillars) {
    const pillar = asRecord(raw[pillarKey]);
    if (!pillar) {
      continue;
    }
    addWeightedTenGod(bucket, asRecord(pillar["天干"])?.["十神"], 1.0);
    const hiddenStems = asRecord(asRecord(pillar["地支"])?.["藏干"]);
    if (!hiddenStems) {
      continue;
    }
    addWeightedTenGod(bucket, asRecord(hiddenStems["主气"])?.["十神"], 0.7);
    addWeightedTenGod(bucket, asRecord(hiddenStems["中气"])?.["十神"], 0.2);
    addWeightedTenGod(bucket, asRecord(hiddenStems["余气"])?.["十神"], 0.1);
  }
  return bucket;
}

function normalizeToPercentages(
  rawScores: Partial<Record<TenGod, number>>,
): Record<TenGod, number> {
  const total = TEN_GODS.reduce((sum, key) => sum + (rawScores[key] ?? 0), 0);
  if (total <= 0) {
    const empty = {} as Record<TenGod, number>;
    for (const key of TEN_GODS) {
      empty[key] = 0;
    }
    return empty;
  }
  const result = {} as Record<TenGod, number>;
  for (const key of TEN_GODS) {
    result[key] = ((rawScores[key] ?? 0) / total) * 100;
  }
  return result;
}

function extractTenGodPercentages(input: BaziMbtiInput): Record<TenGod, number> {
  const structured = extractTenGodPercentagesFromStructured(input);
  const structuredTotal = Object.values(structured).reduce((sum, x) => sum + (x ?? 0), 0);
  if (structuredTotal > 0) {
    return normalizeToPercentages(structured);
  }
  const fromPillars = extractTenGodPercentagesFromPillars(input);
  const pillarTotal = Object.values(fromPillars).reduce((sum, x) => sum + (x ?? 0), 0);
  if (pillarTotal > 0) {
    return normalizeToPercentages(fromPillars);
  }
  const fallback = {} as Partial<Record<TenGod, number>>;
  const tenGodString = toStringValue(input.ten_gods);
  if (tenGodString && TEN_GODS.includes(tenGodString as TenGod)) {
    fallback[tenGodString as TenGod] = 100;
  }
  return normalizeToPercentages(fallback);
}

function getElementForShen(
  shen: TenGod,
  dayMasterElement: FiveElement,
): FiveElement {
  const elementRelations: Record<
    "生我" | "我生" | "克我" | "我克" | "同我",
    Record<FiveElement, FiveElement>
  > = {
    生我: { 木: "水", 火: "木", 土: "火", 金: "土", 水: "金" },
    我生: { 木: "火", 火: "土", 土: "金", 金: "水", 水: "木" },
    克我: { 木: "金", 火: "水", 土: "木", 金: "火", 水: "土" },
    我克: { 木: "土", 火: "金", 土: "水", 金: "木", 水: "火" },
    同我: { 木: "木", 火: "火", 土: "土", 金: "金", 水: "水" },
  };
  const shenToElementType: Record<TenGod, "生我" | "我生" | "克我" | "我克" | "同我"> = {
    正印: "生我",
    偏印: "生我",
    食神: "我生",
    伤官: "我生",
    正官: "克我",
    七杀: "克我",
    正财: "我克",
    偏财: "我克",
    比肩: "同我",
    劫财: "同我",
  };
  return elementRelations[shenToElementType[shen]][dayMasterElement];
}

function getFavorabilityMultiplier(
  shen: TenGod,
  dayMasterElement: FiveElement,
  favorableElements: FiveElement[],
  unfavorableElements: FiveElement[],
): number {
  const element = getElementForShen(shen, dayMasterElement);
  if (favorableElements.includes(element)) {
    return 1.5;
  }
  if (unfavorableElements.includes(element)) {
    return 0.7;
  }
  return 1.0;
}

function getEnergyResponseFactor(energyPercent: number): number {
  if (energyPercent <= 0) {
    return 0;
  }
  if (energyPercent <= 30) {
    return energyPercent / 30;
  }
  if (energyPercent <= 50) {
    return 1.0;
  }
  return Math.max(0, 1 - (energyPercent - 50) / 50);
}

function calculateDimensionScore(params: {
  baseScores: Record<TenGod, number>;
  tenGodEnergy: Record<TenGod, number>;
  dayMasterElement: FiveElement;
  favorableElements: FiveElement[];
  unfavorableElements: FiveElement[];
  tfCalibration: boolean;
}): number {
  let totalScore = 0;
  for (const tenGod of TEN_GODS) {
    const energy = params.tenGodEnergy[tenGod] ?? 0;
    if (energy <= 0) {
      continue;
    }
    const baseValue = params.baseScores[tenGod];
    const energyFactor = getEnergyResponseFactor(energy);
    const favorability = getFavorabilityMultiplier(
      tenGod,
      params.dayMasterElement,
      params.favorableElements,
      params.unfavorableElements,
    );
    let contribution = baseValue * energyFactor * favorability;
    if (params.tfCalibration && (tenGod === "正印" || tenGod === "偏印")) {
      contribution *= 1.2;
    }
    totalScore += contribution;
  }
  return totalScore;
}

function calculateConfidence(score: number): number {
  const maxScoreEstimate = 5.0;
  const normalizedStrength = Math.min(Math.abs(score) / maxScoreEstimate, 1.0);
  return 50 + normalizedStrength * 50;
}

function buildTendencyAnalysis(result: {
  mbtiType: string;
  scores: { EI: number; SN: number; TF: number; JP: number };
}): Record<string, string> {
  const confidence = {
    EI: calculateConfidence(result.scores.EI),
    SN: calculateConfidence(result.scores.SN),
    TF: calculateConfidence(result.scores.TF),
    JP: calculateConfidence(result.scores.JP),
  };
  return {
    [result.mbtiType[0] === "E" ? "外倾 (E)" : "内倾 (I)"]: `${confidence.EI.toFixed(1)}%`,
    [result.mbtiType[1] === "S" ? "感觉 (S)" : "直觉 (N)"]: `${confidence.SN.toFixed(1)}%`,
    [result.mbtiType[2] === "T" ? "思维 (T)" : "情感 (F)"]: `${confidence.TF.toFixed(1)}%`,
    [result.mbtiType[3] === "J" ? "判断 (J)" : "感知 (P)"]: `${confidence.JP.toFixed(1)}%`,
  };
}

function topTenGods(tenGodEnergy: Record<TenGod, number>): Array<{ name: TenGod; energy_percent: number }> {
  return [...TEN_GODS]
    .map((name) => ({ name, energy_percent: Math.round((tenGodEnergy[name] ?? 0) * 100) / 100 }))
    .filter((item) => item.energy_percent > 0)
    .sort((a, b) => b.energy_percent - a.energy_percent)
    .slice(0, 4);
}

export function inferMbtiFromBazi(input: BaziMbtiInput): MbtiInferenceProfile {
  const dayMasterStem = extractDayMasterStem(input);
  const dayMasterElement = extractDayMasterElement(input, dayMasterStem);
  const dayMasterStrength = extractStrength(input);
  const { favorable, unfavorable } = extractFavorableUnfavorableElements(input);
  const tenGodEnergy = extractTenGodPercentages(input);

  const yinExists = (tenGodEnergy["正印"] ?? 0) > 0 || (tenGodEnergy["偏印"] ?? 0) > 0;
  const guanshaExists = (tenGodEnergy["正官"] ?? 0) > 0 || (tenGodEnergy["七杀"] ?? 0) > 0;
  const yinElement = getElementForShen("正印", dayMasterElement);
  const guanshaElement = getElementForShen("正官", dayMasterElement);
  const yinIsFavorable = favorable.includes(yinElement);
  const guanshaIsUnfavorable = unfavorable.includes(guanshaElement);
  const tfCalibration = yinExists && guanshaExists && yinIsFavorable && guanshaIsUnfavorable;

  const strengthScores: Record<DayMasterStrength, number> = {
    极旺: 5,
    太旺: 4,
    较强: 3,
    均衡: 0,
    较弱: -3,
    极弱: -5,
  };

  const scoreEI =
    strengthScores[dayMasterStrength] +
    calculateDimensionScore({
      baseScores: {
        比肩: -2,
        劫财: 4,
        食神: -1,
        伤官: 3,
        正财: -2,
        偏财: 4,
        正官: -2,
        七杀: -3,
        正印: -5,
        偏印: -5,
      },
      tenGodEnergy,
      dayMasterElement,
      favorableElements: favorable,
      unfavorableElements: unfavorable,
      tfCalibration: false,
    });

  const scoreSN = calculateDimensionScore({
    baseScores: {
      比肩: -2,
      劫财: 0,
      食神: 5,
      伤官: -4,
      正财: 5,
      偏财: -2,
      正官: 3,
      七杀: -3,
      正印: 4,
      偏印: -5,
    },
    tenGodEnergy,
    dayMasterElement,
    favorableElements: favorable,
    unfavorableElements: unfavorable,
    tfCalibration: false,
  });

  const scoreTF = calculateDimensionScore({
    baseScores: {
      比肩: 3,
      劫财: -4,
      食神: -4,
      伤官: -2,
      正财: -2,
      偏财: 2,
      正官: 5,
      七杀: 2,
      正印: -5,
      偏印: -3,
    },
    tenGodEnergy,
    dayMasterElement,
    favorableElements: favorable,
    unfavorableElements: unfavorable,
    tfCalibration,
  });

  const scoreJP = calculateDimensionScore({
    baseScores: {
      比肩: 2,
      劫财: -3,
      食神: -4,
      伤官: -5,
      正财: 5,
      偏财: -4,
      正官: 5,
      七杀: 2,
      正印: 4,
      偏印: -2,
    },
    tenGodEnergy,
    dayMasterElement,
    favorableElements: favorable,
    unfavorableElements: unfavorable,
    tfCalibration: false,
  });

  const mbtiType = `${scoreEI > 0 ? "E" : "I"}${scoreSN > 0 ? "S" : "N"}${scoreTF > 0 ? "T" : "F"}${scoreJP > 0 ? "J" : "P"}`;

  return {
    mbti_type: mbtiType,
    scores: {
      ScoreEI: Math.round(scoreEI * 100) / 100,
      ScoreSN: Math.round(scoreSN * 100) / 100,
      ScoreTF: Math.round(scoreTF * 100) / 100,
      ScoreJP: Math.round(scoreJP * 100) / 100,
    },
    tendency_analysis: buildTendencyAnalysis({
      mbtiType,
      scores: { EI: scoreEI, SN: scoreSN, TF: scoreTF, JP: scoreJP },
    }),
    basis: {
      day_master_stem: dayMasterStem,
      day_master_element: dayMasterElement,
      day_master_strength: dayMasterStrength,
      favorable_elements: favorable,
      unfavorable_elements: unfavorable,
      top_ten_gods: topTenGods(tenGodEnergy),
      yin_transforms_guansha_calibration: tfCalibration,
    },
  };
}

