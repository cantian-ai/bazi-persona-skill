import { buildChart, normalizeDateInput, normalizeTimeInput, type BaziGender } from "../tools/bazi/calc.js";
import { parseDateTimeInput, queryChineseCalendar } from "../tools/calendar/query.js";
import {
  appendConversationEntry,
  createPersonaRecord,
  listPersonas,
  loadPersona,
  migrateLegacyPersonas,
  resolvePersonaBaseDir,
  savePersona,
} from "./persona-store.js";
import {
  extractUpdateFact,
  hydrateCreateArgs,
  normalizeLanguage,
  resolveLanguage,
  resolvePersonaRef,
} from "./intent.js";
import { regenerateSnapshot, respondInPersona } from "./persona-engine.js";
import { nowIso } from "../shared/fs.js";
import type {
  PersonaConversationEntry,
  PersonaKnowledge,
  PersonaMemoryEntry,
  PersonaRecord,
  PromptPack,
  SupportedLanguage,
} from "./types.js";

const textPack: Record<SupportedLanguage, {
  createdPersona: string;
  updatedPersona: string;
  generatedFiles: string;
  startChat: (name: string) => string;
  addedMemory: string;
  newState: string;
  flow: string;
  currentLuck: string;
  phaseTheme: string;
  communicationShift: string;
  decisionShift: string;
  timeAnchor: string;
  calendar: string;
  lunar: string;
  ganzhi: string;
  zodiac: string;
  solarTerm: string;
  suitable: string;
  avoid: string;
  unavailableCalendar: string;
  dayMaster: string;
  elementShape: string;
  primaryTenGod: string;
  relationLens: string;
  realityAnchor: string;
  noRealityAnchor: string;
  cheatModeOn: string;
  cheatModeOff: string;
  cheatModeOnHint: string;
  cheatModeOffHint: string;
}> = {
  zh: {
    createdPersona: "Created persona",
    updatedPersona: "Updated persona",
    generatedFiles: "已生成：persona.json / SKILL.md",
    startChat: (name) => `现在可以直接和${name}开始聊天了。`,
    addedMemory: "Added memory",
    newState: "New state",
    flow: "Flow",
    currentLuck: "当前大运",
    phaseTheme: "阶段主题",
    communicationShift: "沟通偏移",
    decisionShift: "决策偏移",
    timeAnchor: "时间锚点",
    calendar: "Calendar",
    lunar: "农历",
    ganzhi: "干支日期",
    zodiac: "生肖",
    solarTerm: "节气",
    suitable: "宜",
    avoid: "忌",
    unavailableCalendar: "Calendar unavailable for",
    dayMaster: "日主",
    elementShape: "五行结构",
    primaryTenGod: "主导十神",
    relationLens: "关系",
    realityAnchor: "现实锚点",
    noRealityAnchor: "暂无补充事实",
    cheatModeOn: "作弊模式已开启 ✓",
    cheatModeOff: "作弊模式已关闭 ✓",
    cheatModeOnHint: "现在可以从八字、大运、流年和阶段变化角度继续提问。",
    cheatModeOffHint: "现在已回到正常聊天，会先以这个人的日常口吻回应。",
  },
  en: {
    createdPersona: "Created persona",
    updatedPersona: "Updated persona",
    generatedFiles: "Generated: persona.json / SKILL.md",
    startChat: (name) => `You can start chatting with ${name} now.`,
    addedMemory: "Added memory",
    newState: "New state",
    flow: "Flow",
    currentLuck: "Current luck cycle",
    phaseTheme: "Current phase",
    communicationShift: "Communication shift",
    decisionShift: "Decision shift",
    timeAnchor: "Time anchor",
    calendar: "Calendar",
    lunar: "Lunar date",
    ganzhi: "Ganzhi date",
    zodiac: "Zodiac",
    solarTerm: "Solar term",
    suitable: "Suitable",
    avoid: "Avoid",
    unavailableCalendar: "Calendar unavailable for",
    dayMaster: "Day master",
    elementShape: "Five-element pattern",
    primaryTenGod: "Primary ten-god",
    relationLens: "Relationship lens",
    realityAnchor: "Reality anchor",
    noRealityAnchor: "No additional facts yet",
    cheatModeOn: "Cheat mode ON ✓",
    cheatModeOff: "Cheat mode OFF ✓",
    cheatModeOnHint: "You can now keep asking from the Bazi, luck-cycle, yearly-flow, and phase-analysis angle.",
    cheatModeOffHint: "The conversation is now back to normal chat and will answer in the person's everyday voice first.",
  },
  ja: {
    createdPersona: "Created persona",
    updatedPersona: "Updated persona",
    generatedFiles: "生成済み: persona.json / SKILL.md",
    startChat: (name) => `これで${name}とそのまま会話を始められます。`,
    addedMemory: "Added memory",
    newState: "New state",
    flow: "Flow",
    currentLuck: "現在の大運",
    phaseTheme: "今の段階",
    communicationShift: "話し方の偏り",
    decisionShift: "判断の偏り",
    timeAnchor: "時間アンカー",
    calendar: "Calendar",
    lunar: "旧暦",
    ganzhi: "干支日",
    zodiac: "生肖",
    solarTerm: "節気",
    suitable: "向いていること",
    avoid: "避けたいこと",
    unavailableCalendar: "Calendar unavailable for",
    dayMaster: "日主",
    elementShape: "五行の傾向",
    primaryTenGod: "主な十神",
    relationLens: "関係の見方",
    realityAnchor: "現実の補足",
    noRealityAnchor: "追加事実はまだありません",
    cheatModeOn: "作弊モードをオンにしました ✓",
    cheatModeOff: "作弊モードをオフにしました ✓",
    cheatModeOnHint: "これからは八字・大運・流年・段階変化の視点で続けて質問できます。",
    cheatModeOffHint: "通常会話に戻りました。まずはこの人の日常の話し方で返します。",
  },
  ko: {
    createdPersona: "Created persona",
    updatedPersona: "Updated persona",
    generatedFiles: "생성됨: persona.json / SKILL.md",
    startChat: (name) => `이제 ${name}와 바로 대화를 시작할 수 있습니다.`,
    addedMemory: "Added memory",
    newState: "New state",
    flow: "Flow",
    currentLuck: "현재 대운",
    phaseTheme: "현재 국면",
    communicationShift: "대화 흐름 변화",
    decisionShift: "판단 변화",
    timeAnchor: "시간 앵커",
    calendar: "Calendar",
    lunar: "음력",
    ganzhi: "간지 날짜",
    zodiac: "띠",
    solarTerm: "절기",
    suitable: "좋은 일",
    avoid: "피할 일",
    unavailableCalendar: "Calendar unavailable for",
    dayMaster: "일주",
    elementShape: "오행 구조",
    primaryTenGod: "주요 십신",
    relationLens: "관계 시점",
    realityAnchor: "현실 보충",
    noRealityAnchor: "아직 추가 사실이 없습니다",
    cheatModeOn: "치트 모드가 켜졌습니다 ✓",
    cheatModeOff: "치트 모드가 꺼졌습니다 ✓",
    cheatModeOnHint: "이제부터는 팔자, 대운, 세운, 현재 국면 변화 관점으로 계속 물을 수 있습니다.",
    cheatModeOffHint: "이제 일반 대화로 돌아가며, 먼저 이 사람의 일상 말투로 답합니다.",
  },
};

function isCheatModeOpenSignal(input: string): boolean {
  return /打开作弊模式|打開作弊模式|開啟作弊模式|turn on cheat mode|enable cheat mode|cheatsheet on|チートモード.*(オン|開)|치트 모드.*(켜|열)/iu.test(input);
}

function isCheatModeCloseSignal(input: string): boolean {
  return /关闭作弊模式|關閉作弊模式|turn off cheat mode|disable cheat mode|cheatsheet off|チートモード.*(オフ|閉)|치트 모드.*(꺼|종료)/iu.test(input);
}

function resolveConversationRef(input: string, personas: ReturnType<typeof listPersonas>): ReturnType<typeof listPersonas>[number] | undefined {
  const matched = resolvePersonaRef(input, personas);
  if (matched) {
    return matched;
  }
  if (personas.length === 1 && (isCheatModeOpenSignal(input) || isCheatModeCloseSignal(input))) {
    return personas[0];
  }
  return undefined;
}

function createConversationEntry(params: {
  role: "user" | "assistant";
  content: string;
  mode: PersonaConversationEntry["mode"];
  sessionId: string;
}): PersonaConversationEntry {
  return {
    session_id: params.sessionId,
    role: params.role,
    content: params.content,
    mode: params.mode,
    created_at: nowIso(),
  };
}

function ensureRequiredCreate(args: Record<string, string>): void {
  const missing = ["name", "gender", "birth-date"].filter((key) => !args[key]);
  if (missing.length > 0) {
    throw new Error(`Create is missing required fields: ${missing.join(", ")}`);
  }
}

function normalizeGender(input: string): { display: "男" | "女"; runtime: BaziGender } {
  if (/男|male/i.test(input)) {
    return { display: "男", runtime: "male" };
  }
  return { display: "女", runtime: "female" };
}

function buildMemoryFromText(text: string, source: string): PersonaMemoryEntry[] {
  const trimmed = text.trim();
  if (!trimmed) {
    return [];
  }
  return [{
    type: /纠正|不是|其实|更正/.test(trimmed) ? "correction" : "fact",
    content: trimmed,
    source,
    created_at: nowIso(),
  }];
}

function preferredLanguageFromArgs(args: Record<string, string>, input: string): SupportedLanguage {
  return normalizeLanguage(args.lang) ?? resolveLanguage(input);
}

function localizedEvidenceLines(record: PersonaRecord, language: SupportedLanguage): string[] {
  const pack = textPack[language];
  const facts = record.memory
    .filter((entry) => entry.type === "fact" || entry.type === "correction" || entry.type === "style")
    .map((entry) => entry.content.trim())
    .filter(Boolean)
    .slice(-6)
    .join(" / ");
  return [
    `- ${pack.dayMaster}: ${record.snapshot.evidence.day_master}`,
    `- ${pack.elementShape}: ${record.snapshot.evidence.five_element_summary}`,
    `- ${pack.primaryTenGod}: ${record.snapshot.evidence.primary_ten_god}`,
    `- ${pack.currentLuck}: ${record.snapshot.evidence.current_luck}`,
    ...(record.active_relationships.length > 0
      ? [`- ${pack.relationLens}: ${record.active_relationships.join(" / ")}`]
      : []),
    `- ${pack.realityAnchor}: ${facts || pack.noRealityAnchor}`,
  ];
}

function refreshRecord(record: PersonaRecord, promptPack: PromptPack, knowledge: PersonaKnowledge): PersonaRecord {
  const snapshot = regenerateSnapshot({
    record: {
      schema_version: record.schema_version,
      slug: record.slug,
      profile: record.profile,
      relationships: record.relationships,
      active_relationships: record.active_relationships,
      preferences: record.preferences,
      chart: record.chart,
      memory: record.memory,
    },
    promptPack,
    knowledge,
  });
  return {
    ...record,
    snapshot,
    updated_at: snapshot.generated_at,
  };
}

export async function createPersona(params: {
  args: Record<string, string>;
  promptPack: PromptPack;
  knowledge: PersonaKnowledge;
}): Promise<string> {
  const baseDir = resolvePersonaBaseDir(params.args["base-dir"]);
  migrateLegacyPersonas({ ...params, baseDir });
  const args = hydrateCreateArgs(params.args, params.args.input ?? "");
  ensureRequiredCreate(args);
  const language = preferredLanguageFromArgs(args, params.args.input ?? "");
  const gender = normalizeGender(args.gender);
  const birthDate = normalizeDateInput(args["birth-date"]);
  const birthTime = args["birth-time"] ? normalizeTimeInput(args["birth-time"]) : undefined;
  const chart = await buildChart({
    name: args.name,
    date: birthDate,
    time: birthTime,
    location: args["birth-location"] ?? "",
    gender: gender.runtime,
    calendarType: args.calendar === "lunar" ? "lunar" : "solar",
    sect: 2,
    sourceCommand: "/bazi-persona create",
  });
  const memory = buildMemoryFromText(args.memory ?? args.note ?? "", "create");
  const record = createPersonaRecord({
    name: args.name,
    gender: gender.display,
    birth_date: birthDate,
    birth_time: birthTime,
    birth_location: args["birth-location"]?.trim() || undefined,
    calendar_type: args.calendar === "lunar" ? "lunar" : "solar",
    relation: args.relation,
    chart,
    memory,
    promptPack: params.promptPack,
    knowledge: params.knowledge,
    preferred_language: language,
  });
  savePersona(record, baseDir);
  const sessionId = `create-${record.slug}-${Date.now()}`;
  appendConversationEntry(record.slug, createConversationEntry({
    role: "user",
    content: params.args.input ?? "",
    mode: "create",
    sessionId,
  }), baseDir);
  appendConversationEntry(record.slug, createConversationEntry({
    role: "assistant",
    content: createdPersonaSummary(record, language),
    mode: "create",
    sessionId,
  }), baseDir);
  return createdPersonaSummary(record, language);
}

function createdPersonaSummary(record: PersonaRecord, language: SupportedLanguage): string {
  const pack = textPack[language];
  return [
    `${pack.createdPersona}: ${record.profile.name} (${record.slug})`,
    ...localizedEvidenceLines(record, language),
    `- ${pack.generatedFiles}`,
    `- ${pack.startChat(record.profile.name)}`,
  ].join("\n");
}

export function updatePersona(params: {
  args: Record<string, string>;
  promptPack: PromptPack;
  knowledge: PersonaKnowledge;
}): string {
  const baseDir = resolvePersonaBaseDir(params.args["base-dir"]);
  migrateLegacyPersonas({ ...params, baseDir });
  const personas = listPersonas(baseDir);
  const input = params.args.input ?? params.args.message ?? "";
  const ref = params.args.slug ? personas.find((persona) => persona.slug === params.args.slug) : resolvePersonaRef(input, personas);
  if (!ref) {
    throw new Error("Update needs a persona slug or a name that matches an existing persona.");
  }

  const record = loadPersona(ref.slug, baseDir);
  const factText = params.args.memory ?? params.args.correction ?? extractUpdateFact(input);
  const language = preferredLanguageFromArgs(params.args, input);
  if (!factText.trim()) {
    throw new Error("Update needs at least one new fact or correction.");
  }
  record.memory.push(...buildMemoryFromText(factText, "update"));
  if (params.args.relation?.trim()) {
    record.active_relationships = [params.args.relation.trim()];
    if (!record.relationships.includes(params.args.relation.trim())) {
      record.relationships.push(params.args.relation.trim());
    }
  }
  if (params.args.mode === "cheatsheet" || /cheatsheet|命理|八字/.test(input)) {
    record.preferences.analysis_mode = "cheatsheet";
  }
  record.preferences.preferred_language = language;
  const refreshed = refreshRecord(record, params.promptPack, params.knowledge);
  savePersona(refreshed, baseDir);
  const sessionId = `update-${refreshed.slug}-${Date.now()}`;
  appendConversationEntry(refreshed.slug, createConversationEntry({
    role: "user",
    content: input,
    mode: "update",
    sessionId,
  }), baseDir);
  const pack = textPack[language];
  const output = [
    `${pack.updatedPersona}: ${refreshed.profile.name} (${refreshed.slug})`,
    `- ${pack.addedMemory}: ${factText.trim()}`,
    `- ${pack.newState}: ${refreshed.snapshot.evidence.state_shift.summary}`,
    `- ${pack.generatedFiles}`,
  ].join("\n");
  appendConversationEntry(refreshed.slug, createConversationEntry({
    role: "assistant",
    content: output,
    mode: "update",
    sessionId,
  }), baseDir);
  return output;
}

export async function queryFlow(params: {
  args: Record<string, string>;
  promptPack: PromptPack;
  knowledge: PersonaKnowledge;
}): Promise<string> {
  const baseDir = resolvePersonaBaseDir(params.args["base-dir"]);
  migrateLegacyPersonas({ ...params, baseDir });
  const personas = listPersonas(baseDir);
  const ref = params.args.slug
    ? personas.find((persona) => persona.slug === params.args.slug)
    : resolvePersonaRef(params.args.input ?? "", personas);
  if (!ref) {
    throw new Error("Flow query needs a persona slug or matching name.");
  }
  const record = loadPersona(ref.slug, baseDir);
  const language = preferredLanguageFromArgs(params.args, params.args.input ?? "");
  const refreshed = refreshRecord({
    ...record,
    preferences: {
      ...record.preferences,
      preferred_language: language,
      analysis_mode: "cheatsheet",
    },
  }, params.promptPack, params.knowledge);
  const pack = textPack[language];
  const at = parseDateTimeInput(params.args.at ?? params.args.input ?? "");
  const calendar = await queryChineseCalendar({
    year: at.year,
    month: at.month,
    day: at.day,
  });
  return [
    `[${pack.flow}] ${refreshed.profile.name}`,
    `- ${pack.timeAnchor}: ${at.display}`,
    `- ${pack.currentLuck}: ${refreshed.snapshot.evidence.current_luck}`,
    `- ${pack.phaseTheme}: ${refreshed.snapshot.evidence.state_shift.summary}`,
    `- ${pack.communicationShift}: ${refreshed.snapshot.evidence.state_shift.communication}`,
    `- ${pack.decisionShift}: ${refreshed.snapshot.evidence.state_shift.decision}`,
    ...(calendar
      ? [
          `- ${pack.ganzhi}: ${calendar.干支日期}`,
          `- ${pack.solarTerm}: ${calendar.节气.term}（第${calendar.节气.afterDays}天）`,
        ]
      : []),
  ].join("\n");
}

export async function queryCalendarStatus(args: Record<string, string>): Promise<string> {
  const at = parseDateTimeInput(args.at ?? args.input);
  const language = preferredLanguageFromArgs(args, args.at ?? args.input ?? "");
  const pack = textPack[language];
  const calendar = await queryChineseCalendar({
    year: at.year,
    month: at.month,
    day: at.day,
  });
  if (!calendar) {
    return `${pack.unavailableCalendar} ${at.display}`;
  }
  return [
    `[${pack.calendar}] ${at.display}`,
    `- ${pack.lunar}: ${calendar.农历}`,
    `- ${pack.ganzhi}: ${calendar.干支日期}`,
    `- ${pack.zodiac}: ${calendar.生肖}`,
    `- ${pack.solarTerm}: ${calendar.节气.term}（第${calendar.节气.afterDays}天）`,
    `- ${pack.suitable}: ${calendar.宜}`,
    `- ${pack.avoid}: ${calendar.忌}`,
  ].join("\n");
}

export function respond(params: {
  args: Record<string, string>;
  promptPack: PromptPack;
  knowledge: PersonaKnowledge;
}): string {
  const baseDir = resolvePersonaBaseDir(params.args["base-dir"]);
  migrateLegacyPersonas({ ...params, baseDir });
  const personas = listPersonas(baseDir);
  const input = params.args.input ?? params.args.message ?? "";
  const ref = params.args.slug
    ? personas.find((persona) => persona.slug === params.args.slug)
    : resolveConversationRef(input, personas);
  if (!ref) {
    throw new Error("Conversation needs a persona slug or matching name.");
  }
  const record = loadPersona(ref.slug, baseDir);
  const language = preferredLanguageFromArgs(params.args, input || record.profile.name);
  const pack = textPack[language];

  if (isCheatModeOpenSignal(input)) {
    const updated = refreshRecord({
      ...record,
      preferences: {
        ...record.preferences,
        preferred_language: language,
        analysis_mode: "cheatsheet",
      },
    }, params.promptPack, params.knowledge);
    savePersona(updated, baseDir);
    const output = [pack.cheatModeOn, pack.cheatModeOnHint].join("\n");
    const sessionId = `analysis-toggle-${record.slug}-${Date.now()}`;
    appendConversationEntry(record.slug, createConversationEntry({
      role: "user",
      content: input,
      mode: "analysis",
      sessionId,
    }), baseDir);
    appendConversationEntry(record.slug, createConversationEntry({
      role: "assistant",
      content: output,
      mode: "analysis",
      sessionId,
    }), baseDir);
    return output;
  }

  if (isCheatModeCloseSignal(input)) {
    const updated = refreshRecord({
      ...record,
      preferences: {
        ...record.preferences,
        preferred_language: language,
        analysis_mode: "normal",
      },
    }, params.promptPack, params.knowledge);
    savePersona(updated, baseDir);
    const output = [pack.cheatModeOff, pack.cheatModeOffHint].join("\n");
    const sessionId = `chat-toggle-${record.slug}-${Date.now()}`;
    appendConversationEntry(record.slug, createConversationEntry({
      role: "user",
      content: input,
      mode: "chat",
      sessionId,
    }), baseDir);
    appendConversationEntry(record.slug, createConversationEntry({
      role: "assistant",
      content: output,
      mode: "chat",
      sessionId,
    }), baseDir);
    return output;
  }

  const mode: PersonaConversationEntry["mode"] =
    params.args.mode === "cheatsheet" || record.preferences.analysis_mode === "cheatsheet" || /cheatsheet|analysis|compat|命理|八字|相性|사주|분석/.test(input)
      ? "analysis"
      : "chat";
  const responseRecord = mode === "analysis"
    ? refreshRecord({
      ...record,
      preferences: {
      ...record.preferences,
      preferred_language: language,
      analysis_mode: "cheatsheet",
    },
  }, params.promptPack, params.knowledge)
    : {
      ...record,
      preferences: {
        ...record.preferences,
        preferred_language: language,
      },
    };
  const output = respondInPersona(responseRecord, input, language);
  const sessionId = `${mode}-${record.slug}-${Date.now()}`;
  appendConversationEntry(record.slug, createConversationEntry({
    role: "user",
    content: input,
    mode,
    sessionId,
  }), baseDir);
  appendConversationEntry(record.slug, createConversationEntry({
    role: "assistant",
    content: output,
    mode,
    sessionId,
  }), baseDir);
  return output;
}
