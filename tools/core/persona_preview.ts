export interface PreviewCard {
  summary: string;
  speakingFeel: string;
  decisionFocus: string;
  stressShift: string;
  currentState: string;
}

export type OutputLanguage = "zh" | "en";

export function formatPreviewCard(card: PreviewCard, lang: OutputLanguage = "zh"): string {
  if (lang === "en") {
    return [
      "Persona Preview",
      `1) One-line summary: ${card.summary}`,
      `2) Speaking feel: ${card.speakingFeel}`,
      `3) Decision priority: ${card.decisionFocus}`,
      `4) Stress shift: ${card.stressShift}`,
      `5) Current phase vibe: ${card.currentState}`,
    ].join("\n");
  }
  return [
    "人格预览",
    `1) 一句话人格总结：${card.summary}`,
    `2) 说话给人的感觉：${card.speakingFeel}`,
    `3) 做决定时最看重：${card.decisionFocus}`,
    `4) 压力下最明显变化：${card.stressShift}`,
    `5) 最近更像的状态：${card.currentState}`,
  ].join("\n");
}

export function extractSectionFirstBullet(markdown: string, heading: string): string | undefined {
  const bullets = extractSectionBullets(markdown, heading);
  return bullets[0];
}

function extractSectionBullets(markdown: string, heading: string): string[] {
  const lines = markdown.split("\n");
  const headingRegex = new RegExp(`^#{1,6}\\s*${heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*$`);
  const startIndex = lines.findIndex((line) => headingRegex.test(line.trim()));
  if (startIndex === -1) {
    return [];
  }
  const contentLines: string[] = [];
  for (let i = startIndex + 1; i < lines.length; i += 1) {
    if (/^#{1,6}\s+/.test(lines[i].trim())) {
      break;
    }
    contentLines.push(lines[i]);
  }
  return contentLines
    .map((line) => line.trim())
    .filter((line) => line.startsWith("- "))
    .map((line) => line.replace(/^-+\s*/, "").trim())
    .filter(Boolean);
}

function extractAllBullets(markdown: string): string[] {
  return markdown
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.startsWith("- "))
    .map((line) => line.replace(/^-+\s*/, "").trim())
    .filter(Boolean);
}

function findBulletByKeywords(bullets: string[], keywords: string[]): string | undefined {
  return bullets.find((bullet) => keywords.some((keyword) => bullet.includes(keyword)));
}

function stripLeadingLabel(text: string): string {
  return text
    .replace(/^(说话感觉|聊天节奏|表达习惯|情绪回应方式)[:：]\s*/u, "")
    .replace(/^(做决定时|核心判断|压力状态|平时状态|受伤状态)[:：]\s*/u, "")
    .trim();
}

function missingHint(field: "summary" | "speaking" | "decision" | "stress" | "state"): string {
  if (field === "summary") {
    return "未提取到一句话人格总结（请补充对应段落）。";
  }
  if (field === "speaking") {
    return "未提取到说话风格（请补充“沟通风格”或“典型说话风格”）。";
  }
  if (field === "decision") {
    return "未提取到决策偏好（请补充“认知模式”或“决策习惯”）。";
  }
  if (field === "stress") {
    return "未提取到压力变化（请补充“状态机制”或“冲突与压力”）。";
  }
  return "未提取到当前状态（请补充 state 当前阶段关键词）。";
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

export function derivePreviewFromPersonaState(persona: string, state: string): PreviewCard {
  const personaBullets = extractAllBullets(persona);
  const stateBullets = extractAllBullets(state);
  const cognitionBullets = [
    ...extractSectionBullets(persona, "1. 认知模式"),
    ...extractSectionBullets(persona, "决策习惯"),
  ];
  const stateModeBullets = [
    ...extractSectionBullets(persona, "5. 状态机制"),
    ...extractSectionBullets(persona, "冲突与压力"),
  ];

  const summary =
    extractSectionFirstBullet(persona, "一、一句话人格总结") ??
    extractSectionFirstBullet(persona, "一句话画像") ??
    findBulletByKeywords(personaBullets, ["人格总结", "一句话", "画像"]) ??
    personaBullets[0] ??
    missingHint("summary");
  const speakingFeel =
    extractSectionFirstBullet(persona, "1. 典型说话风格") ??
    extractSectionFirstBullet(persona, "3. 沟通风格") ??
    extractSectionFirstBullet(persona, "对话风格（像真人）") ??
    extractSectionFirstBullet(persona, "对话风格（像真人，而不是说明书）") ??
    findBulletByKeywords(personaBullets, ["说话", "语气", "沟通", "回复", "表达"]) ??
    missingHint("speaking");
  const decisionFocus =
    findBulletByKeywords(cognitionBullets, ["做决定时", "最看重", "决策节奏"]) ??
    findBulletByKeywords(cognitionBullets, ["风险", "机会驱动", "风险控制", "选择偏好"]) ??
    cognitionBullets[0] ??
    findBulletByKeywords(personaBullets, ["做决定时", "最看重", "风险", "选择偏好"]) ??
    missingHint("decision");
  const stressShift =
    findBulletByKeywords(stateModeBullets, ["压力状态", "高压", "压力", "冲突", "受伤", "逆境"]) ??
    stateModeBullets[0] ??
    findBulletByKeywords(
      [...personaBullets, ...stateBullets],
      ["压力", "冲突", "受伤", "逆境", "高压"],
    ) ??
    missingHint("stress");
  const currentState =
    extractStateKeywords(state) ??
    findBulletByKeywords(stateBullets, ["当前阶段", "关键词", "最近", "状态"]) ??
    missingHint("state");

  return {
    summary: stripLeadingLabel(summary),
    speakingFeel: stripLeadingLabel(speakingFeel),
    decisionFocus: stripLeadingLabel(decisionFocus),
    stressShift: stripLeadingLabel(stressShift),
    currentState: stripLeadingLabel(currentState),
  };
}
