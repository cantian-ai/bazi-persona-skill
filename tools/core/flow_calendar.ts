import {
  normalizeDateInput,
  normalizeTimeInput,
  validateDate,
  validateTime,
} from "./bazi_calc.js";
import { type OutputLanguage } from "./persona_preview.js";
import { type PersonaMeta } from "../runtime/meta_updater.js";

type FiveElement = "木" | "火" | "土" | "金" | "水" | "未知";

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

export interface ChineseCalendarData {
  公历: string;
  农历: string;
  干支日期: string;
  生肖: string;
  纳音: string;
  农历节日?: string;
  公历节日?: string;
  节气: {
    term: string;
    afterDays: number;
    nextTerm?: string;
    beforeNextTermDays?: number;
  };
  二十八宿: string;
  彭祖百忌: string;
  喜神方位: string;
  阳贵神方位: string;
  阴贵神方位: string;
  福神方位: string;
  财神方位: string;
  冲煞: string;
  宜: string;
  忌: string;
}

export interface FlowChartLike {
  day_master?: string;
  raw_bazi?: unknown;
}

function pickLangLine(lang: OutputLanguage, zh: string, en: string): string {
  return lang === "en" ? en : zh;
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

function firstStem(value?: string): string | undefined {
  if (!value) {
    return undefined;
  }
  const stem = value.trim().charAt(0);
  return STEM_TO_ELEMENT[stem] ? stem : undefined;
}

function deriveTenGod(dayMasterStem?: string, targetStem?: string): string | undefined {
  if (!dayMasterStem || !targetStem) {
    return undefined;
  }
  const dmElement = STEM_TO_ELEMENT[dayMasterStem];
  const dmYinYang = STEM_TO_YINYANG[dayMasterStem];
  const tgElement = STEM_TO_ELEMENT[targetStem];
  const tgYinYang = STEM_TO_YINYANG[targetStem];
  if (!dmElement || !dmYinYang || !tgElement || !tgYinYang) {
    return undefined;
  }
  const samePolarity = dmYinYang === tgYinYang;
  const generates: Record<FiveElement, FiveElement> = {
    木: "火",
    火: "土",
    土: "金",
    金: "水",
    水: "木",
    未知: "未知",
  };
  const controls: Record<FiveElement, FiveElement> = {
    木: "土",
    火: "金",
    土: "水",
    金: "木",
    水: "火",
    未知: "未知",
  };

  if (dmElement === tgElement) {
    return samePolarity ? "比肩" : "劫财";
  }
  if (generates[dmElement] === tgElement) {
    return samePolarity ? "食神" : "伤官";
  }
  if (controls[dmElement] === tgElement) {
    return samePolarity ? "偏财" : "正财";
  }
  if (controls[tgElement] === dmElement) {
    return samePolarity ? "七杀" : "正官";
  }
  if (generates[tgElement] === dmElement) {
    return samePolarity ? "偏印" : "正印";
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

export function parseDateTimeInput(input?: string): {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
  display: string;
} {
  if (!input || !input.trim()) {
    const now = new Date();
    return {
      year: now.getFullYear(),
      month: now.getMonth() + 1,
      day: now.getDate(),
      hour: now.getHours(),
      minute: now.getMinutes(),
      second: now.getSeconds(),
      display: `${now.getFullYear()}-${`${now.getMonth() + 1}`.padStart(2, "0")}-${`${now.getDate()}`.padStart(2, "0")} ${`${now.getHours()}`.padStart(2, "0")}:${`${now.getMinutes()}`.padStart(2, "0")}:${`${now.getSeconds()}`.padStart(2, "0")}`,
    };
  }
  const raw = input.trim();

  const directDate = new Date(raw.includes("T") ? raw : raw.replace(" ", "T"));
  if (!Number.isNaN(directDate.getTime())) {
    return {
      year: directDate.getFullYear(),
      month: directDate.getMonth() + 1,
      day: directDate.getDate(),
      hour: directDate.getHours(),
      minute: directDate.getMinutes(),
      second: directDate.getSeconds(),
      display: `${directDate.getFullYear()}-${`${directDate.getMonth() + 1}`.padStart(2, "0")}-${`${directDate.getDate()}`.padStart(2, "0")} ${`${directDate.getHours()}`.padStart(2, "0")}:${`${directDate.getMinutes()}`.padStart(2, "0")}:${`${directDate.getSeconds()}`.padStart(2, "0")}`,
    };
  }

  const [datePart, timePart] = raw.split(/\s+/, 2);
  const date = normalizeDateInput(datePart);
  validateDate(date);
  const time = timePart ? normalizeTimeInput(timePart) : "12:00";
  validateTime(time);
  const [year, month, day] = date.split("-").map((x) => Number.parseInt(x, 10));
  const [hour, minute] = time.split(":").map((x) => Number.parseInt(x, 10));
  return {
    year,
    month,
    day,
    hour,
    minute,
    second: 0,
    display: `${date} ${time}:00`,
  };
}

export async function queryChineseCalendar(params: {
  year: number;
  month: number;
  day: number;
}): Promise<ChineseCalendarData | undefined> {
  try {
    const { getChineseCalendar } = (await import("cantian-tymext")) as unknown as {
      getChineseCalendar: (time: {
        year: number;
        month: number;
        day: number;
      }) => ChineseCalendarData;
    };
    return getChineseCalendar({
      year: params.year,
      month: params.month,
      day: params.day,
    });
  } catch {
    return undefined;
  }
}

export function formatSolarTermInfo(
  term: ChineseCalendarData["节气"] | undefined,
  lang: OutputLanguage,
): string {
  if (!term) {
    return lang === "en" ? "Solar term unavailable" : "节气信息暂不可用";
  }
  if (lang === "en") {
    const next =
      term.nextTerm && term.beforeNextTermDays !== undefined
        ? `, next ${term.nextTerm} in ${term.beforeNextTermDays} day(s)`
        : "";
    return `${term.term} (day ${term.afterDays})${next}`;
  }
  const next =
    term.nextTerm && term.beforeNextTermDays !== undefined
      ? `，距${term.nextTerm}${term.beforeNextTermDays}天`
      : "";
  return `${term.term}（第${term.afterDays}天）${next}`;
}

export function buildFlowEnergySummary(
  tenGods: string[],
  lang: OutputLanguage = "zh",
): string {
  const count = (targets: string[]) =>
    tenGods.filter((item) => targets.includes(item)).length;
  const guansha = count(["正官", "七杀"]);
  const shishang = count(["食神", "伤官"]);
  const yinxing = count(["正印", "偏印"]);
  const caixing = count(["正财", "偏财"]);
  const bijie = count(["比肩", "劫财"]);

  if (guansha >= 2) {
    return lang === "en"
      ? "Officer/Killer energy is strong; responsibility and pressure are higher today, so stabilize boundaries first."
      : "官杀能量偏强，今天更容易感到责任和压力，适合先定边界再推进。";
  }
  if (shishang >= 2) {
    return lang === "en"
      ? "Output-star energy is strong; expression and visibility are favored today."
      : "食伤能量偏强，今天表达欲和输出欲更高，适合沟通、创作和公开表达。";
  }
  if (caixing >= 2) {
    return lang === "en"
      ? "Wealth-star energy is strong; today favors pragmatic ROI and resource execution."
      : "财星能量偏强，今天更务实，容易关注投入产出、资源与结果兑现。";
  }
  if (yinxing >= 2) {
    return lang === "en"
      ? "Resource-star energy is strong; better for reflection, information completion, and strategy calibration."
      : "印星能量偏强，今天更倾向思考与复盘，适合补信息、做策略校准。";
  }
  if (bijie >= 2) {
    return lang === "en"
      ? "Peer-star energy is strong; initiative is high, suitable for self-led decisions."
      : "比劫能量偏强，今天主观能动性更高，适合自己主导关键决策。";
  }
  return lang === "en"
    ? "Today's energy is relatively balanced; follow planned rhythm and avoid emotional over-commitment."
    : "今日能量相对均衡，建议按既定节奏推进，避免情绪化加码。";
}

export function interpretRelationEffects(
  items: string[],
  lang: OutputLanguage = "zh",
): string {
  if (items.length === 0) {
    return lang === "en"
      ? "- No strong relation turbulence detected; keep a steady execution rhythm."
      : "- 未检出强烈关系扰动，当前以稳定推进为主。";
  }
  const hasChong = items.some((x) => x.includes("冲"));
  const hasXing = items.some((x) => x.includes("刑"));
  const hasHe = items.some((x) => x.includes("合"));
  const effects: string[] = [];
  if (hasChong) {
    effects.push(
      lang === "en"
        ? "Emotion and rhythm may fluctuate; stabilize boundaries before key decisions."
        : "情绪与节奏易波动，建议先稳边界再决策。",
    );
  }
  if (hasXing) {
    effects.push(
      lang === "en"
        ? "Relationship friction is sensitive; use short sentences and clear ownership."
        : "关系摩擦敏感，沟通宜短句+明确责任。",
    );
  }
  if (hasHe) {
    effects.push(
      lang === "en"
        ? "Collaboration windows are stronger; good for negotiation and resource alignment."
        : "合作窗口增强，适合谈判、协同与资源整合。",
    );
  }
  if (effects.length === 0) {
    effects.push(
      lang === "en"
        ? "Relation impact is neutral; continue the existing plan."
        : "关系影响中性，按既定节奏推进。",
    );
  }
  return effects.map((x) => `- ${x}`).join("\n");
}

async function buildFlowShensha(params: {
  bazi: string;
  flow: { decade?: string; year: string; month: string; day: string; hour?: string };
}): Promise<Record<string, string[]>> {
  const { getShenFromDayun } = (await import("cantian-tymext")) as unknown as {
    getShenFromDayun: (bazi: string, gan: string, zhi: string) => string[];
  };
  const baziStr = params.bazi.replaceAll(" ", "");
  const results: Record<string, string[]> = {};
  const calc = (label: string, gz: string) => {
    if (gz && gz.length >= 2) {
      results[label] = getShenFromDayun(baziStr, gz[0], gz[1]);
    }
  };
  if (params.flow.decade) calc("大运", params.flow.decade);
  calc("流年", params.flow.year);
  calc("流月", params.flow.month);
  calc("流日", params.flow.day);
  if (params.flow.hour) calc("流时", params.flow.hour);
  return results;
}

async function buildFlowRelations(params: {
  pillars: string[];
  flow: { decade?: string; year: string; month: string; day: string; hour?: string };
}): Promise<Record<string, string[]>> {
  const { appendRelation } = (await import("cantian-tymext")) as unknown as {
    appendRelation: (base: string[], newZhu: string) => Array<{
      关系: string;
      关联柱: string[];
      描述: string;
    }>;
  };
  const results: Record<string, string[]> = {};
  const mapLabel = (
    label: string,
    entries: Array<{ 关系: string; 关联柱: string[]; 描述: string }>,
  ) =>
    entries.map((entry) => {
      const columns = entry.关联柱.map((item) => (item === "大运" ? label : item));
      return `${entry.关系}：${entry.描述}（${columns.join(" × ")}）`;
    });

  if (params.flow.decade) {
    results["大运"] = mapLabel("大运", appendRelation(params.pillars, params.flow.decade));
  }
  results["流年"] = mapLabel("流年", appendRelation(params.pillars, params.flow.year));
  results["流月"] = mapLabel("流月", appendRelation(params.pillars, params.flow.month));
  results["流日"] = mapLabel("流日", appendRelation(params.pillars, params.flow.day));
  if (params.flow.hour) {
    results["流时"] = mapLabel("流时", appendRelation(params.pillars, params.flow.hour));
  }
  return results;
}

export async function buildFlowSnapshotMarkdown(params: {
  chart: FlowChartLike;
  meta: PersonaMeta;
  at?: string;
  lang?: OutputLanguage;
}): Promise<string> {
  const lang = params.lang ?? "zh";
  const birthDate = normalizeDateInput(params.meta.birth.date);
  const birthTime = params.meta.birth.time ? normalizeTimeInput(params.meta.birth.time) : "12:00";
  const [birthYear, birthMonth, birthDay] = birthDate
    .split("-")
    .map((x) => Number.parseInt(x, 10));
  const [birthHour, birthMinute] = birthTime
    .split(":")
    .map((x) => Number.parseInt(x, 10));
  const queryAt = parseDateTimeInput(params.at);

  const {
    SolarTime,
    ChildLimit,
    Gender: LibGender,
  } = (await import("cantian-tymext")) as unknown as {
    SolarTime: {
      fromYmdHms: (
        year: number,
        month: number,
        day: number,
        hour: number,
        minute: number,
        second: number,
      ) => {
        getSolarDay: () => {
          getSolarMonth: () => { getSolarYear: () => { getYear: () => number }; getMonth: () => number };
          getDay: () => number;
        };
        getLunarHour: () => {
          getLunarDay: () => {
            getLunarMonth: () => {
              getLunarYear: () => { getYear: () => number; getName: () => string; getSixtyCycle: () => { getName: () => string } };
              getMonth: () => number;
              getName: () => string;
              getSixtyCycle: () => { getName: () => string };
            };
            getDay: () => number;
            getName: () => string;
            getSixtyCycle: () => { getName: () => string };
          };
          getHour: () => number;
          getName: () => string;
          getSixtyCycle: () => { getName: () => string };
        };
      };
    };
    ChildLimit: {
      fromSolarTime: (birth: unknown, gender: number) => {
        getStartFortune: () => {
          getLunarYear: () => { getYear: () => number };
          getSixtyCycle: () => { getName: () => string };
          getAge: () => number;
          next: (n: number) => {
            getSixtyCycle: () => { getName: () => string };
            getLunarYear: () => { getYear: () => number };
            getAge: () => number;
          };
        };
        getStartDecadeFortune: () => {
          getStartLunarYear: () => { getYear: () => number };
          next: (n: number) => {
            getSixtyCycle: () => { getName: () => string };
            getStartAge: () => number;
            getEndAge: () => number;
            getStartLunarYear: () => { getYear: () => number };
            getEndLunarYear: () => { getYear: () => number };
          };
        };
      };
    };
    Gender: { MAN: number; WOMAN: number };
  };

  const querySolar = SolarTime.fromYmdHms(
    queryAt.year,
    queryAt.month,
    queryAt.day,
    queryAt.hour,
    queryAt.minute,
    queryAt.second,
  );
  const lunarHour = querySolar.getLunarHour();
  const lunarDay = lunarHour.getLunarDay();
  const lunarMonth = lunarDay.getLunarMonth();
  const lunarYear = lunarMonth.getLunarYear();

  const flowYear = lunarYear.getSixtyCycle().getName();
  const flowMonth = lunarMonth.getSixtyCycle().getName();
  const flowDay = lunarDay.getSixtyCycle().getName();
  const flowHour = lunarHour.getSixtyCycle().getName();

  const dayMasterStem = firstStem(params.chart.day_master || "");
  const yearTenGod = deriveTenGod(dayMasterStem, firstStem(flowYear));
  const monthTenGod = deriveTenGod(dayMasterStem, firstStem(flowMonth));
  const dayTenGod = deriveTenGod(dayMasterStem, firstStem(flowDay));
  const hourTenGod = deriveTenGod(dayMasterStem, firstStem(flowHour));

  const birthSolar = SolarTime.fromYmdHms(
    birthYear,
    birthMonth,
    birthDay,
    birthHour,
    birthMinute,
    0,
  );
  const gender =
    params.meta.gender === "女"
      ? LibGender.WOMAN
      : LibGender.MAN;
  const childLimit = ChildLimit.fromSolarTime(birthSolar, gender);
  const startFortune = childLimit.getStartFortune();
  const targetYear = lunarYear.getYear();
  const yearOffset = targetYear - startFortune.getLunarYear().getYear();
  const currentFortune = startFortune.next(yearOffset);
  const startDecade = childLimit.getStartDecadeFortune();
  const decadeOffset = Math.floor(
    (targetYear - startDecade.getStartLunarYear().getYear()) / 10,
  );
  const currentDecade = startDecade.next(decadeOffset);

  const decadeTenGod = deriveTenGod(dayMasterStem, firstStem(currentDecade.getSixtyCycle().getName()));
  const yearLuckTenGod = deriveTenGod(dayMasterStem, firstStem(currentFortune.getSixtyCycle().getName()));
  const energySummary = buildFlowEnergySummary(
    [decadeTenGod, yearLuckTenGod, yearTenGod, monthTenGod, dayTenGod, hourTenGod].filter(
      (item): item is string => Boolean(item),
    ),
    lang,
  );

  const basePillars = [
    formatPillarFromRaw(asRecord(params.chart.raw_bazi), "年柱"),
    formatPillarFromRaw(asRecord(params.chart.raw_bazi), "月柱"),
    formatPillarFromRaw(asRecord(params.chart.raw_bazi), "日柱"),
  ].filter((item) => item && item !== "未提取");
  if (params.meta.birth.time) {
    basePillars.push(
      formatPillarFromRaw(asRecord(params.chart.raw_bazi), "时柱"),
    );
  }
  const flowConfig = {
    decade: currentDecade.getSixtyCycle().getName(),
    year: flowYear,
    month: flowMonth,
    day: flowDay,
    hour: flowHour,
  };
  const flowRelations = await buildFlowRelations({
    pillars: basePillars,
    flow: flowConfig,
  });
  const flowRelationLines = Object.entries(flowRelations)
    .map(([label, items]) => {
      if (!items || items.length === 0) {
        return lang === "en"
          ? `- ${label}: no obvious relation impact`
          : `- ${label}：无明显刑冲合会`;
      }
      return lang === "en"
        ? `- ${label}: ${items.slice(0, 4).join("; ")}`
        : `- ${label}：${items.slice(0, 4).join("；")}`;
    })
    .join("\n");
  const flowRelationFlat = Object.values(flowRelations).flat();

  const baziStr = summarizeValue(asRecord(params.chart.raw_bazi)?.["八字"], 28);
  const flowShensha = baziStr
    ? await buildFlowShensha({ bazi: baziStr, flow: flowConfig })
    : {};
  const flowShenshaLines = Object.entries(flowShensha)
    .map(([label, items]) => {
      if (!items || items.length === 0) {
        return lang === "en"
          ? `  - ${label}: none`
          : `  - ${label}：无`;
      }
      return lang === "en"
        ? `  - ${label}: ${items.join(", ")}`
        : `  - ${label}：${items.join("、")}`;
    })
    .join("\n");

  const solarDay = querySolar.getSolarDay();
  const solarMonth = solarDay.getSolarMonth();
  const solarYear = solarMonth.getSolarYear();
  const calendar = await queryChineseCalendar({
    year: queryAt.year,
    month: queryAt.month,
    day: queryAt.day,
  });
  const calendarLines = calendar
    ? [
        pickLangLine(
          lang,
          `- 黄历：宜 ${calendar.宜}｜忌 ${calendar.忌}`,
          `- Almanac: Do ${calendar.宜} | Avoid ${calendar.忌}`,
        ),
        pickLangLine(
          lang,
          `- 节气：${formatSolarTermInfo(calendar.节气, lang)}`,
          `- Solar term: ${formatSolarTermInfo(calendar.节气, lang)}`,
        ),
        pickLangLine(
          lang,
          `- 冲煞：${calendar.冲煞}`,
          `- Clash/Omen: ${calendar.冲煞}`,
        ),
      ]
    : [
        pickLangLine(
          lang,
          "- 黄历：当前不可用（排盘可用，万年历模块未返回）。",
          "- Almanac: unavailable for now (Bazi works, calendar module did not return data).",
        ),
      ];

  return [
    pickLangLine(lang, `- 查询时间：${queryAt.display}`, `- Query time: ${queryAt.display}`),
    pickLangLine(
      lang,
      `- 阳历：${solarYear.getYear()}-${`${solarMonth.getMonth()}`.padStart(2, "0")}-${`${solarDay.getDay()}`.padStart(2, "0")} ${`${queryAt.hour}`.padStart(2, "0")}:${`${queryAt.minute}`.padStart(2, "0")}`,
      `- Solar date: ${solarYear.getYear()}-${`${solarMonth.getMonth()}`.padStart(2, "0")}-${`${solarDay.getDay()}`.padStart(2, "0")} ${`${queryAt.hour}`.padStart(2, "0")}:${`${queryAt.minute}`.padStart(2, "0")}`,
    ),
    pickLangLine(
      lang,
      `- 农历：${lunarYear.getName()} ${lunarMonth.getName()} ${lunarDay.getName()} ${lunarHour.getName()}`,
      `- Lunar date: ${lunarYear.getName()} ${lunarMonth.getName()} ${lunarDay.getName()} ${lunarHour.getName()}`,
    ),
    pickLangLine(
      lang,
      `- 当前大运：${currentDecade.getSixtyCycle().getName()}（${currentDecade.getStartAge()}-${currentDecade.getEndAge()}岁）${
        decadeTenGod ? `，十神倾向：${decadeTenGod}` : ""
      }`,
      `- Current decade cycle: ${currentDecade.getSixtyCycle().getName()} (age ${currentDecade.getStartAge()}-${currentDecade.getEndAge()})${
        decadeTenGod ? `, ten-god tilt: ${decadeTenGod}` : ""
      }`,
    ),
    pickLangLine(
      lang,
      `- 当前流年：${currentFortune.getSixtyCycle().getName()}（年龄约 ${currentFortune.getAge()}）${
        yearLuckTenGod ? `，十神倾向：${yearLuckTenGod}` : ""
      }`,
      `- Current yearly cycle: ${currentFortune.getSixtyCycle().getName()} (age around ${currentFortune.getAge()})${
        yearLuckTenGod ? `, ten-god tilt: ${yearLuckTenGod}` : ""
      }`,
    ),
    pickLangLine(lang, `- 流月：${flowMonth}${monthTenGod ? `（${monthTenGod}）` : ""}`, `- Month flow: ${flowMonth}${monthTenGod ? ` (${monthTenGod})` : ""}`),
    pickLangLine(lang, `- 流日：${flowDay}${dayTenGod ? `（${dayTenGod}）` : ""}`, `- Day flow: ${flowDay}${dayTenGod ? ` (${dayTenGod})` : ""}`),
    pickLangLine(lang, `- 流时：${flowHour}${hourTenGod ? `（${hourTenGod}）` : ""}`, `- Hour flow: ${flowHour}${hourTenGod ? ` (${hourTenGod})` : ""}`),
    ...calendarLines,
    pickLangLine(lang, `- 今日能量解读：${energySummary}`, `- Energy readout: ${energySummary}`),
    pickLangLine(lang, "- 刑冲合会联动：", "- Relation interactions:"),
    flowRelationLines,
    pickLangLine(lang, "- 神煞（大运/流年/流月/流日/流时）：", "- Shen-sha (decade/year/month/day/hour):"),
    flowShenshaLines,
    pickLangLine(lang, "- 关系影响建议：", "- Relation impact suggestions:"),
    interpretRelationEffects(flowRelationFlat, lang),
  ].join("\n");
}
