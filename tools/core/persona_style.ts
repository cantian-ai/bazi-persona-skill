import { type MbtiInferenceProfile } from "./bazi_mbti.js";
import {
  type FiveElement,
  type StateShift,
  type TenGodBehaviorHint,
} from "./persona_profile_core.js";

interface PersonaStyleSignature {
  archetype: string;
  tagLine: string;
  voiceRule: string;
  responseRhythm: string;
  detailPreference: string;
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

function parseMbtiLetters(mbtiType: string): {
  ei: "E" | "I";
  sn: "S" | "N";
  tf: "T" | "F";
  jp: "J" | "P";
} {
  const hit = /([EI])([SN])([TF])([JP])/.exec((mbtiType || "").toUpperCase());
  if (!hit) {
    return { ei: "I", sn: "S", tf: "T", jp: "J" };
  }
  return {
    ei: hit[1] as "E" | "I",
    sn: hit[2] as "S" | "N",
    tf: hit[3] as "T" | "F",
    jp: hit[4] as "J" | "P",
  };
}

export function buildPersonaStyleSignature(params: {
  mbtiType: string;
  element: FiveElement;
  dayMaster?: string;
  primaryTenGod: string;
  relationText: string;
  tenGodHint?: TenGodBehaviorHint;
}): PersonaStyleSignature {
  const letters = parseMbtiLetters(params.mbtiType);
  const yinYang = STEM_TO_YINYANG[(params.dayMaster ?? "").slice(0, 1)] ?? "阳";
  const archetype =
    letters.ei === "E" && letters.tf === "T"
      ? "直推执行型"
      : letters.ei === "E" && letters.tf === "F"
        ? "热情带动型"
        : letters.ei === "I" && letters.tf === "T"
          ? "冷静分析型"
          : "温和洞察型";
  const relationLens =
    /(同事|老板|上级|下属|客户|团队|合作|同学)/.test(params.relationText)
      ? "在关系里会优先看分工、责任和回应速度。"
      : /(伴侣|前任|暧昧|喜欢|追|对象)/.test(params.relationText)
        ? "在亲密关系里会优先看稳定回应和边界感。"
        : "在关系里会先看是否尊重边界和是否说到做到。";

  const voiceRule =
    letters.ei === "E"
      ? "先给立场，再补理由；回复速度偏快。"
      : "先确认信息，再给结论；回复偏克制。";
  const responseRhythm =
    letters.sn === "S"
      ? "偏事实和步骤表达，避免空泛表述。"
      : "偏方向和可能性表达，会先讲大图再落细节。";
  const detailPreference =
    letters.jp === "J"
      ? "倾向把时间点和标准说清楚，再开始执行。"
      : "倾向先试一版，根据反馈快速调整。";
  const emotionPolicy =
    letters.tf === "F"
      ? "会先接住情绪，再把话题导向可执行动作。"
      : "会先对齐事实和规则，再处理情绪部分。";

  return {
    archetype,
    tagLine: `${archetype}｜${yinYang}性日主｜主导十神 ${params.primaryTenGod}`,
    voiceRule,
    responseRhythm,
    detailPreference,
    emotionPolicy,
    decisionCore: params.tenGodHint?.decision ?? "先看边界与目标，再定动作顺序。",
    uncertaintyHandling:
      letters.sn === "S"
        ? "信息不足时先补关键事实，再给执行方案。"
        : "信息不足时先列选项和假设，再收敛到可执行方案。",
    pressurePattern:
      params.tenGodHint?.stress ??
      (letters.jp === "J"
        ? "压力上来会更强调秩序和时间点。"
        : "压力上来会更强调快速试错和节奏。"),
    conflictApproach:
      letters.tf === "T"
        ? "冲突时先切问题和责任，再谈关系感受。"
        : "冲突时先稳住情绪，再回到问题本身。",
    trustSignal:
      letters.jp === "J"
        ? "最吃“长期一致 + 按时兑现”。"
        : "最吃“愿意沟通 + 及时迭代”。",
    misfireSignal:
      letters.tf === "T"
        ? "最反感边界含糊、反复改口、只讲情绪不讲动作。"
        : "最反感冷处理、敷衍回应、长期失联。",
    positiveTriggers:
      letters.ei === "E"
        ? "明确回应、主动推进、说到做到。"
        : "稳定反馈、尊重节奏、持续一致。",
    negativeTriggers:
      letters.sn === "S"
        ? "信息模糊、责任不清、截止时间反复变动。"
        : "只看眼前、缺少方向、长期没有进展。",
    repairGuide: `${relationLens} 出现摩擦时，先复述目标与边界，再给一个可执行下一步。`,
  };
}

export function buildScenePlaybook(params: {
  style: PersonaStyleSignature;
  relationText: string;
  mbtiType: string;
}): string {
  const relationHint =
    params.relationText && params.relationText !== "未指定关系"
      ? `当前关系设定：${params.relationText}`
      : "当前关系设定：未指定关系";

  const confessionReply =
    /热情/.test(params.style.archetype)
      ? "我不排斥你，但我更看重持续行动，不看一时情绪。"
      : /分析|执行/.test(params.style.archetype)
        ? "可以接触，但先看你是否稳定、边界清楚、说到做到。"
        : "我愿意了解你，不过我需要时间观察一致性。";

  const pressureReply =
    /快/.test(params.style.voiceRule)
      ? "先别慌，我先给你一个最小可行动作，先把局面稳住。"
      : "先把情况说清楚，我会陪你把事情拆成两三步执行。";

  return [
    `- ${relationHint}`,
    "",
    "### 场景 1：被追求 / 被表白",
    "- 默认反应：先给明确态度，再给边界要求。",
    "- 关注点：一致性、兑现记录、边界感。",
    `- 示例回复：${confessionReply}`,
    "",
    "### 场景 2：对方情绪低落",
    `- 默认反应：${params.style.emotionPolicy}`,
    `- 示例回复：${pressureReply}`,
    "",
    "### 场景 3：工作出现分歧",
    `- 默认反应：${params.style.conflictApproach}`,
    "- 推进方式：先统一目标，再拆责任和截止时间。",
    "",
    "### 场景 4：被质疑或被否定",
    "- 默认反应：先给事实和依据，不做情绪化争辩。",
    "- 示例回复：你可以不同意，但我们先对齐标准和证据，再决定怎么改。",
    "",
    "### 场景 5：边界被踩（反复失约/失联/甩锅）",
    "- 默认反应：直接提醒边界并收紧投入。",
    `- 关系修复条件：${params.style.trustSignal}`,
    "",
    `- 性格标签参考：${params.style.tagLine}（MBTI ${params.mbtiType}）`,
  ].join("\n");
}

function clampNumber(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function orientedPercent(rawScore: number, positiveDirection: "positive" | "negative"): number {
  const normalized = clampNumber(rawScore, -8, 8);
  const oriented = positiveDirection === "positive" ? normalized : -normalized;
  return Math.round(clampNumber(50 + oriented * 5, 20, 80));
}

function scoreBandLabel(score: number): string {
  if (score >= 68) {
    return "高";
  }
  if (score <= 38) {
    return "低";
  }
  return "中";
}

function trimSentenceTail(text: string): string {
  return text.trim().replace(/[。！？!?]+$/g, "");
}

function pickDecisionSpeed(primaryTenGod: string, jp: "J" | "P"): string {
  if (["七杀", "劫财", "偏财", "伤官"].includes(primaryTenGod) || jp === "P") {
    return "偏快：先给方向和动作，再边走边修。";
  }
  if (["正印", "偏印", "正财", "正官"].includes(primaryTenGod) && jp === "J") {
    return "偏慢：会先校对信息和边界，再正式拍板。";
  }
  return "中速：会先确认关键变量，再在可控范围内快速推进。";
}

function pickRiskPreference(primaryTenGod: string, jp: "J" | "P"): string {
  if (["偏财", "七杀", "劫财"].includes(primaryTenGod) || jp === "P") {
    return "机会驱动，但会要求止损线，能冲但不裸奔。";
  }
  if (["正财", "正官", "正印"].includes(primaryTenGod)) {
    return "风险控制优先，先保下限，再看上限。";
  }
  return "机会与风险并重，通常会准备两套方案再动。";
}

function pickSecurityFreedom(primaryTenGod: string, jp: "J" | "P"): string {
  if (["正官", "正财", "正印"].includes(primaryTenGod) || jp === "J") {
    return "更重安全感：稳定节奏、可预期反馈、长期可靠。";
  }
  if (["比肩", "劫财", "偏财", "偏印"].includes(primaryTenGod) || jp === "P") {
    return "更重自由感：希望有自主空间，不喜欢被过度规训。";
  }
  return "安全感和自由感都要：既要边界稳定，也要保留机动空间。";
}

function pickAchievementRelation(tf: "T" | "F", ei: "E" | "I"): string {
  if (tf === "T" && ei === "I") {
    return "偏成就：先把事做对，再谈关系舒适度。";
  }
  if (tf === "F") {
    return "偏关系：关系质量和回应体验会显著影响执行动力。";
  }
  return "成就与关系并重，但在关键节点会先保结果。";
}

function pickOrderExpression(primaryTenGod: string, jp: "J" | "P"): string {
  if (["正官", "正财", "正印"].includes(primaryTenGod) || jp === "J") {
    return "偏秩序：先统一标准，再讨论表达方式。";
  }
  if (["伤官", "食神", "偏财"].includes(primaryTenGod) || jp === "P") {
    return "偏表达：先把观点亮出来，再调结构。";
  }
  return "秩序和表达都要，表达会服从目标和场景。";
}

function pickResultIdentity(tf: "T" | "F", sn: "S" | "N"): string {
  if (tf === "T" && sn === "S") {
    return "更重现实结果：以可交付、可复盘、可验证为主。";
  }
  if (tf === "F" || sn === "N") {
    return "结果与内心认同并重：如果价值观冲突，再高收益也会犹豫。";
  }
  return "偏结果导向，但不会长期做违背内在认同的事。";
}

function pickDistanceFeel(letters: { ei: "E" | "I"; tf: "T" | "F" }): string {
  if (letters.ei === "E" && letters.tf === "F") {
    return "热而不黏，有回应感。";
  }
  if (letters.ei === "I" && letters.tf === "T") {
    return "稳而偏硬，初期有距离感。";
  }
  if (letters.ei === "E") {
    return "直接且有推动力，存在感强。";
  }
  return "安静克制，熟了之后更有温度。";
}

function pickHurtMode(letters: { ei: "E" | "I"; tf: "T" | "F"; jp: "J" | "P" }): string {
  if (letters.tf === "T" && letters.ei === "I") {
    return "先沉默拉开距离，再讲事实和边界，短期内不愿情绪化沟通。";
  }
  if (letters.tf === "T" && letters.ei === "E") {
    return "会直接反击或快速对线，目的不是吵赢，而是把边界立住。";
  }
  if (letters.tf === "F" && letters.jp === "J") {
    return "会过度解释，希望被理解；若持续得不到回应会转冷处理。";
  }
  return "先回避冲突，消化后再回来说清楚，但期间会明显降频。";
}

function pickDefenseStyles(letters: { ei: "E" | "I"; tf: "T" | "F"; jp: "J" | "P" }): string[] {
  const styles: string[] = [];
  if (letters.ei === "I") {
    styles.push("沉默（先停机降噪，避免失控表达）");
  }
  if (letters.tf === "T") {
    styles.push("讲道理（用事实和规则防止被情绪裹挟）");
  } else {
    styles.push("过度解释（希望修复误解，容易说多）");
  }
  if (letters.jp === "P") {
    styles.push("逃避（先离开高压场域，等可控后再处理）");
  } else {
    styles.push("冷处理（收紧回应频率，等边界恢复再重启）");
  }
  return styles.slice(0, 3);
}

function pickSpeakingTemplate(letters: { ei: "E" | "I"; sn: "S" | "N"; tf: "T" | "F" }): string {
  const pace = letters.ei === "E" ? "中短句偏多" : "短句为主";
  const explain = letters.tf === "F" ? "愿意解释动机和感受" : "只在必要时解释";
  const askback = letters.sn === "N" ? "会反问确认方向" : "会追问事实细节";
  return `语气偏稳，${pace}；${explain}；${askback}；会留一点停顿给对方回应。`;
}

function pickTopThreeValues(style: PersonaStyleSignature): string[] {
  const values = ["边界清晰", "承诺兑现", "可持续推进"];
  if (/沟通|迭代|回应/.test(style.trustSignal)) {
    values[2] = "有来有回的沟通";
  }
  return values;
}

export function buildPsychologyProfileMarkdown(params: {
  mbti: MbtiInferenceProfile;
  primaryTenGod: string;
  style: PersonaStyleSignature;
  shift: Pick<StateShift, "behavior" | "communication" | "decision">;
}): string {
  const mbti = params.mbti;
  const letters = parseMbtiLetters(mbti.mbti_type);
  const extraversion = orientedPercent(mbti.scores.ScoreEI, "positive");
  const openness = orientedPercent(mbti.scores.ScoreSN, "negative");
  const agreeableness = orientedPercent(mbti.scores.ScoreTF, "negative");
  const conscientiousness = orientedPercent(mbti.scores.ScoreJP, "positive");

  const intuitionVsAnalysis =
    letters.sn === "N"
      ? "偏直觉：先抓方向、趋势和隐藏变量，再补证据。"
      : "偏分析：先收事实、拆步骤，再给判断。";
  const macroVsDetail =
    letters.sn === "N"
      ? "更看大局：先问“我们最终要到哪”，再定细节。"
      : "更看细节：先对齐定义、边界、资源，再谈扩展。";
  const logicVsFeeling =
    letters.tf === "T"
      ? "更重逻辑：优先标准、证据、可复盘。"
      : "更重感受：会把关系温度和情绪成本纳入决策。";
  const decisionSpeed = pickDecisionSpeed(params.primaryTenGod, letters.jp);
  const riskStyle = pickRiskPreference(params.primaryTenGod, letters.jp);
  const topValues = pickTopThreeValues(params.style);
  const defenseModes = pickDefenseStyles(letters);
  const trustSpeed = letters.ei === "E" ? "中等偏快，但会边聊边验证一致性。" : "偏慢，靠长期稳定互动积累。";

  return [
    "## 二、五维人格画像",
    "",
    "### 1. 认知模式",
    `- 核心判断：${intuitionVsAnalysis}${macroVsDetail}${logicVsFeeling}`,
    `- 具体表现：遇到问题的第一反应通常是“先把目标和边界定住”，随后用${trimSentenceTail(params.style.responseRhythm)}的方式推进；日常表达里会频繁出现“先/再/最后”这类结构化句式。`,
    `- 做决定时：最看重${trimSentenceTail(params.style.decisionCore)}；决策节奏${decisionSpeed}${riskStyle}`,
    `- 容易出现的盲点：在自己认可的判断路径上推进很快，可能低估他人的理解速度；信息噪声高时容易过度收敛，错过边缘机会。`,
    "",
    "### 2. 价值系统",
    `- 核心判断：${pickSecurityFreedom(params.primaryTenGod, letters.jp)}${pickAchievementRelation(letters.tf, letters.ei)}${pickOrderExpression(params.primaryTenGod, letters.jp)}${pickResultIdentity(letters.tf, letters.sn)}`,
    `- 最看重的东西：${topValues.join("、")}。`,
    `- 底线与反感点：底线是“说到做到 + 尊重边界”；最容易触发防御的是${trimSentenceTail(params.style.misfireSignal.replace("最反感", ""))}。`,
    `- 选择偏好：做选择时先保护长期节奏和信任资本，再谈短期收益；若两者冲突，宁可放弃看起来很赚但不稳的选项。`,
    "",
    "### 3. 沟通风格",
    `- 说话感觉：${pickDistanceFeel(letters)}听起来像“先给答案，再把你带到可执行的一步”。`,
    `- 聊天节奏：${params.style.voiceRule}${params.style.responseRhythm}`,
    `- 表达习惯：整体偏结论导向；是否展开解释取决于对方是否愿意对齐规则与目标。常见节奏是“先定立场 -> 给依据 -> 给下一步”。`,
    `- 情绪回应方式：${params.style.emotionPolicy}在熟人面前会更愿意补充感受层，在不熟的人面前更偏事实和边界。`,
    "",
    "### 4. 关系模式",
    `- 进入关系的方式：通常从“能不能合作好一件小事”开始，而不是先谈亲密；慢热程度 ${letters.ei === "E" ? "中等" : "偏慢"}。`,
    `- 信任建立方式：${trustSpeed}核心验证点是${trimSentenceTail(params.style.trustSignal.replace("最吃", ""))}。`,
    `- 边界感表现：边界感偏强，尤其在责任、时间和承诺上；一旦连续失约，会明显降低投入并收紧互动。`,
    `- 关系冲突时的反应：优先${trimSentenceTail(params.style.conflictApproach)}；关系受损时常见反应是${trimSentenceTail(pickHurtMode(letters))}。关系里最怕长期失真沟通和反复试探。`,
    "",
    "### 5. 状态机制",
    `- 平时状态：常态是“稳住主线、按节奏推进”，表达有分寸，判断不拖沓。`,
    `- 压力状态：最明显变化是${trimSentenceTail(params.shift.behavior)}；沟通上会${trimSentenceTail(params.shift.communication)}，决策上会${trimSentenceTail(params.shift.decision)}。`,
    `- 放松状态：安全感足够时会更柔软，愿意讲动机、讲顾虑，也更愿意给他人试错空间。`,
    `- 受伤状态：情绪上头时容易出现 ${defenseModes.join("、")}；外表可能更硬，内里其实是在自保。`,
    `- 顺境与逆境下的变化：顺境时更主动、更愿意授权；逆境时更强调控制变量和边界，可能显得更强势或更沉默。`,
    "",
    "## 三、Agent 使用建议",
    `- 1）这个角色最像什么样的人：像一个“能扛事的现实派合作者”，对人不敷衍，对事不拖泥带水。`,
    `- 2）和他对话时最明显的体验：你会感到被推动去行动，同时被要求把目标和边界说清楚。`,
    `- 3）最适合用什么语气和他互动：直接、真诚、给事实和上下文，少试探、多对齐。`,
    `- 4）什么信息会让人格更真实：具体经历（触发-反应-结果）、长期关系模式、近期压力源。`,
    `- 5）最容易让角色失真的地方：把他写成“只会讲大道理”或“永远强势不受伤”，都会丢失真人感。`,
    "",
    "## 四、补充画像增强",
    "",
    "### 1. 典型说话风格",
    `- ${pickSpeakingTemplate(letters)}`,
    `- 常见句式："先说结论"、"我们先对齐目标"、"这件事先做一版再看"。`,
    "",
    "### 2. 关系中的典型反应",
    `- 被关心：会先说“我没事”，随后用行动回应关心，真正放松后才展开聊。`,
    `- 被误解：第一反应是澄清事实；若对方持续贴标签，会迅速收紧解释欲。`,
    `- 被催促：会要求先明确优先级和截止点，不接受无边界催促。`,
    `- 被否定：先问标准和证据，能改就改；纯情绪否定会触发防御。`,
    `- 被表白：不会立刻给承诺，通常先看稳定性和边界感，再决定是否靠近。`,
    `- 被冷落：短期会观察，长期会降低投入并把关系降级。`,
    "",
    "### 3. 压力下的防御方式",
    `- ${defenseModes.join("；")}。`,
    `- 代价：短期能保住秩序和自尊，长期若不修复，容易让关系感受变冷。`,
    "",
    "### 4. 角色一致性原则",
    "- 原则 1：任何回应都要“先有立场，再有动作”，不能只给情绪。",
    "- 原则 2：边界与承诺必须一致，不能前后改口消耗信任。",
    "- 原则 3：允许脆弱但不失控，受伤时可以降频，不可以人格跳变。",
    "",
    "## 模型依据（简要）",
    `- MBTI 推断：${mbti.mbti_type}（EI ${mbti.scores.ScoreEI}｜SN ${mbti.scores.ScoreSN}｜TF ${mbti.scores.ScoreTF}｜JP ${mbti.scores.ScoreJP}）`,
    `- 四轴倾向：外向 ${extraversion}/100（${scoreBandLabel(extraversion)}）｜开放 ${openness}/100（${scoreBandLabel(openness)}）｜宜人 ${agreeableness}/100（${scoreBandLabel(agreeableness)}）｜尽责 ${conscientiousness}/100（${scoreBandLabel(conscientiousness)}）`,
    `- 主导十神：${params.primaryTenGod}`,
    "- 说明：以上依据仅用于支持人格建模，不作为机械结论。",
  ].join("\n");
}
