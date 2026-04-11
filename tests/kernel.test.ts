import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { detectLanguage, routeIntent } from "../src/kernel/intent.js";
import { loadPromptPack, loadPersonaKnowledge, resetKnowledgeCache } from "../src/kernel/resources.js";
import { createPersona, respond, updatePersona } from "../src/kernel/agent-tools.js";
import { inspectPersona, renderCliHelp } from "../src/cli.js";
import { migrateLegacyPersonas, loadPersona, resolvePersonaBaseDir } from "../src/kernel/persona-store.js";
import { DEFAULT_PERSONA_DIR } from "../src/kernel/resources.js";
import { parseDateTimeInput } from "../src/tools/calendar/query.js";
import { respondInPersona } from "../src/kernel/persona-engine.js";

function makeTempDir(prefix: string): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

test("routeIntent handles create, flow, calendar, respond", () => {
  assert.equal(routeIntent("帮我创建八字人格：舒晴").action, "create");
  assert.equal(routeIntent("Create a bazi persona for Lin Lan").action, "create");
  assert.equal(routeIntent("看下舒晴最近状态").action, "flow");
  assert.equal(routeIntent("舒晴昨天和今天感觉有点不一样").action, "flow");
  assert.equal(routeIntent("今天黄历怎么样").action, "calendar");
  assert.equal(routeIntent("舒晴最近工作忙吗").action, "respond");
});

test("detectLanguage follows user language and falls back when unclear", () => {
  assert.equal(detectLanguage("Hello, can you build a bazi persona?"), "en");
  assert.equal(detectLanguage("こんにちは、相性を見て"), "ja");
  assert.equal(detectLanguage("안녕하세요 요즘 상태 어때"), "ko");
  assert.equal(detectLanguage("帮我创建八字人格"), "zh");
});

test("prompt loader validates manifest and missing files", () => {
  const promptsDir = makeTempDir("bazi-prompts-");
  fs.writeFileSync(
    path.join(promptsDir, "manifest.json"),
    JSON.stringify({ version: 1, entries: [{ id: "x", file: "missing.md", stage: "test" }] }),
    "utf8",
  );
  assert.throws(() => loadPromptPack(promptsDir), /Prompt file missing/);
});

test("prompt manifest includes create, memory, and compat stages", () => {
  const promptPack = loadPromptPack();
  const ids = promptPack.entries.map((entry) => entry.id);
  assert.ok(ids.includes("create_persona"));
  assert.ok(ids.includes("memory_builder"));
  assert.ok(ids.includes("compat_guidance"));
});

test("legacy personas migrate into persona.json and purge runtime artifacts", () => {
  const baseDir = makeTempDir("bazi-legacy-");
  fs.cpSync(path.resolve("tests/fixtures/legacy_persona"), baseDir, { recursive: true });
  const promptPack = loadPromptPack();
  const knowledge = loadPersonaKnowledge();

  migrateLegacyPersonas({ baseDir, promptPack, knowledge });

  const personaPath = path.join(baseDir, "shu-qing", "persona.json");
  assert.ok(fs.existsSync(personaPath));
  assert.ok(!fs.existsSync(path.join(baseDir, "shu-qing", ".runtime")));
  assert.ok(fs.existsSync(path.join(baseDir, "shu-qing", "SKILL.md")));
});

test("create and update write only canonical persona data", async () => {
  const baseDir = makeTempDir("bazi-create-");
  const promptPack = loadPromptPack();
  const knowledge = loadPersonaKnowledge();

  const created = await createPersona({
    args: {
      "base-dir": baseDir,
      input: "帮我创建八字人格：林岚，女，1994年6月8日下午3点半，上海，同事",
    },
    promptPack,
    knowledge,
  });
  assert.match(created, /Created persona: 林岚/);
  assert.match(created, /现在可以直接和林岚开始聊天了/);

  const persona = loadPersona("lin-lan", baseDir);
  assert.equal(persona.profile.name, "林岚");
  assert.ok(fs.existsSync(path.join(baseDir, "lin-lan", "persona.json")));
  assert.ok(fs.existsSync(path.join(baseDir, "lin-lan", "SKILL.md")));
  assert.ok(!fs.existsSync(path.join(baseDir, "lin-lan", ".runtime")));
  assert.match(persona.snapshot.reference_profile, /# 人格参考知识/);
  assert.match(persona.snapshot.reference_profile, /五行认知参考：|十神特质参考：|当前关系观察：/);
  assert.doesNotMatch(persona.snapshot.reference_profile, /认知线索：|价值线索：|表达线索：/);
  assert.match(persona.snapshot.reference_state, /# 状态参考知识/);
  assert.match(persona.snapshot.reference_state, /当前大运：|阶段映射知识|阶段判断参考/);
  const skillMarkdown = fs.readFileSync(path.join(baseDir, "lin-lan", "SKILL.md"), "utf8");
  assert.match(skillMarkdown, /name: lin-lan/);
  assert.match(skillMarkdown, /你是林岚。/);
  assert.match(skillMarkdown, /## 先抓住这个人/);
  assert.match(skillMarkdown, /## 基础档案/);
  assert.match(skillMarkdown, /性别：女/);
  assert.match(skillMarkdown, /出生：1994-06-08 15:30 上海（公历）/);
  assert.match(skillMarkdown, /## 八字资料/);
  assert.match(skillMarkdown, /四柱八字：|年柱：|月柱：|日柱：/);
  assert.match(skillMarkdown, /时柱：/);
  assert.match(skillMarkdown, /日主：|主导十神：|五行结构：|当前大运：/);
  assert.match(skillMarkdown, /## 大运节奏/);
  assert.match(skillMarkdown, /## 人格参考/);
  assert.match(skillMarkdown, /## 阶段参考/);
  assert.match(skillMarkdown, /## 最近补充/);
  assert.match(skillMarkdown, /## 真实对话沉淀/);
  assert.match(skillMarkdown, /## 进入分析或合盘时/);
  assert.ok(fs.existsSync(path.join(baseDir, "lin-lan", "conversations.jsonl")));

  const updated = updatePersona({
    args: {
      "base-dir": baseDir,
      input: "帮我更新林岚：最近升职了，带团队以后更强调节奏和交付",
    },
    promptPack,
    knowledge,
  });
  assert.match(updated, /Updated persona: 林岚/);
  const conversationRaw = fs.readFileSync(path.join(baseDir, "lin-lan", "conversations.jsonl"), "utf8");
  assert.match(conversationRaw, /"mode":"create"|\"mode\":\"update\"/);

  const inspected = inspectPersona({
    "base-dir": baseDir,
    slug: "lin-lan",
  });
  assert.match(inspected, /SKILL\.md/);
  assert.match(inspected, /Conversations: \d+/);
  assert.match(inspected, /File: .*persona\.json/);
  assert.match(inspected, /Memory count: 1|Memory count: 2/);
});

test("missing birth time stays internal and is not exposed in generated skill", async () => {
  const baseDir = makeTempDir("bazi-missing-time-");
  const promptPack = loadPromptPack();
  const knowledge = loadPersonaKnowledge();

  const created = await createPersona({
    args: {
      "base-dir": baseDir,
      input: "帮我创建八字人格：舒晴，女，1999年8月12日，上海，同事",
    },
    promptPack,
    knowledge,
  });

  assert.match(created, /现在可以直接和舒晴开始聊天了/);

  const skillMarkdown = fs.readFileSync(path.join(baseDir, "shu-qing", "SKILL.md"), "utf8");
  assert.doesNotMatch(skillMarkdown, /时辰未知|正午代入|时柱仅供参考|真实出生时辰|精修/);
  assert.doesNotMatch(skillMarkdown, /时柱：/);
});

test("birth location and relation are optional during creation", async () => {
  const baseDir = makeTempDir("bazi-optional-fields-");
  const promptPack = loadPromptPack();
  const knowledge = loadPersonaKnowledge();

  const created = await createPersona({
    args: {
      "base-dir": baseDir,
      input: "帮我创建八字人格：舒晴，女，1999年8月12日",
    },
    promptPack,
    knowledge,
  });

  assert.match(created, /Created persona: 舒晴/);
  assert.match(created, /现在可以直接和舒晴开始聊天了/);

  const persona = loadPersona("shu-qing", baseDir);
  assert.equal(persona.profile.birth_location, undefined);
  assert.deepEqual(persona.active_relationships, []);

  const skillMarkdown = fs.readFileSync(path.join(baseDir, "shu-qing", "SKILL.md"), "utf8");
  assert.match(skillMarkdown, /出生：1999-08-12（公历）/);
  assert.doesNotMatch(skillMarkdown, /未知|未指定关系/);
  assert.doesNotMatch(skillMarkdown, /当前关系：/);
});

test("cli entrypoint stays storage-only and does not import agent generation pipeline", () => {
  const cliSource = fs.readFileSync(path.resolve("src/cli.ts"), "utf8");
  assert.doesNotMatch(cliSource, /routeIntent|loadPromptPack|loadPersonaKnowledge/);
  assert.doesNotMatch(cliSource, /createPersona|updatePersona|respond|queryFlow|queryCalendarStatus/);
  assert.match(cliSource, /storage-only|inspect|delete/);
});

test("cli help introduces product, brand, and fastest start path before file commands", () => {
  const help = renderCliHelp();
  assert.match(help, /Cantian AI|参天AI/);
  assert.match(help, /基于生辰八字，生成一个会聊天、会判断、会变化的 AI 人格/);
  assert.match(help, /怎么开始最快/);
  assert.match(help, /打开作弊模式/);
  assert.match(help, /文件查看示例/);
});

test("cli help follows user language and falls back to Chinese", () => {
  const helpEn = renderCliHelp("en");
  assert.match(helpEn, /Generate an AI persona that can chat, judge, and evolve from a Bazi birth chart/);
  assert.match(helpEn, /Fastest way to begin/);

  const helpJa = renderCliHelp("ja");
  assert.match(helpJa, /生辰八字をもとに、会話し、判断し、変化していく AI 人格を生成します/);
  assert.match(helpJa, /いちばん早い始め方/);
});

test("default persona dir stays at installed skill personas directory unless overridden", () => {
  const originalHome = process.env.BAZI_PERSONA_HOME;
  delete process.env.BAZI_PERSONA_HOME;

  try {
    const resolved = resolvePersonaBaseDir();
    assert.equal(resolved, DEFAULT_PERSONA_DIR);
  } finally {
    if (originalHome === undefined) {
      delete process.env.BAZI_PERSONA_HOME;
    } else {
      process.env.BAZI_PERSONA_HOME = originalHome;
    }
  }
});

test("core entrypoints stay decoupled from platform sync adapter", () => {
  const cliSource = fs.readFileSync(path.resolve("src/cli.ts"), "utf8");
  const agentToolSource = fs.readFileSync(path.resolve("src/kernel/agent-tools.ts"), "utf8");
  assert.doesNotMatch(cliSource, /platform-sync/);
  assert.doesNotMatch(agentToolSource, /platform-sync/);
});

test("persona replies are not rigidly reused across different prompts", async () => {
  const baseDir = makeTempDir("bazi-dialogue-");
  const promptPack = loadPromptPack();
  const knowledge = loadPersonaKnowledge();

  await createPersona({
    args: {
      "base-dir": baseDir,
      input: "帮我创建八字人格：舒晴，女，1999年8月12日，上海，同事",
    },
    promptPack,
    knowledge,
  });

  const persona = loadPersona("shu-qing", baseDir);
  const workReply = respondInPersona(persona, "最近工作忙吗？");
  const valuesReply = respondInPersona(persona, "你最在乎什么？");
  const relationReply = respondInPersona(persona, "你跟人熟起来一般快不快？");

  assert.notEqual(workReply, valuesReply);
  assert.notEqual(valuesReply, relationReply);
  assert.notEqual(workReply, relationReply);
  assert.doesNotMatch(workReply, /Prompt Stack|Persona Rules|Current State|^#|^\[/m);
  assert.doesNotMatch(valuesReply, /Prompt Stack|Persona Rules|Current State|^#|^\[/m);
  assert.doesNotMatch(relationReply, /Prompt Stack|Persona Rules|Current State|^#|^\[/m);
});

test("persona generation and replies follow English when the user starts in English", async () => {
  const baseDir = makeTempDir("bazi-english-");
  const promptPack = loadPromptPack();
  const knowledge = loadPersonaKnowledge();

  const created = await createPersona({
    args: {
      "base-dir": baseDir,
      input: "Create a bazi persona: Nora Lin, female, 1996-04-12 09:20, Shanghai, friend",
    },
    promptPack,
    knowledge,
  });
  assert.match(created, /Created persona:/);
  assert.match(created, /You can start chatting with Nora Lin now\./);

  const persona = loadPersona("nora-lin", baseDir);
  assert.equal(persona.preferences.preferred_language, "en");

  const skillMarkdown = fs.readFileSync(path.join(baseDir, "nora-lin", "SKILL.md"), "utf8");
  assert.match(skillMarkdown, /You are Nora Lin\./);
  assert.match(skillMarkdown, /## Quick read/);
  assert.match(skillMarkdown, /## Language mode/);

  const reply = respondInPersona(persona, "Are you busy these days?", "en");
  assert.match(reply, /Nora Lin:/);
  assert.match(reply, /if I answer from how I feel right now/i);
});

test("explicit cheat mode signal turns analysis mode on and off", async () => {
  const baseDir = makeTempDir("bazi-cheat-toggle-");
  const promptPack = loadPromptPack();
  const knowledge = loadPersonaKnowledge();

  await createPersona({
    args: {
      "base-dir": baseDir,
      input: "帮我创建八字人格：舒晴，女，1999年8月12日，上海，同事",
    },
    promptPack,
    knowledge,
  });

  const opened = respond({
    args: {
      "base-dir": baseDir,
      input: "打开作弊模式",
    },
    promptPack,
    knowledge,
  });
  assert.match(opened, /作弊模式已开启/);

  const afterOpen = respond({
    args: {
      "base-dir": baseDir,
      input: "舒晴最近工作忙吗？",
    },
    promptPack,
    knowledge,
  });
  assert.match(afterOpen, /命理主轴先看/u);

  const closed = respond({
    args: {
      "base-dir": baseDir,
      input: "关闭作弊模式",
    },
    promptPack,
    knowledge,
  });
  assert.match(closed, /作弊模式已关闭/);

  const afterClose = respond({
    args: {
      "base-dir": baseDir,
      input: "舒晴最近工作忙吗？",
    },
    promptPack,
    knowledge,
  });
  assert.doesNotMatch(afterClose, /命理主轴先看/u);
});

test("calendar parser handles relative natural-language dates", () => {
  const parsed = parseDateTimeInput("今天黄历怎么样");
  assert.ok(parsed.year >= 2026);
  assert.ok(parsed.month >= 1 && parsed.month <= 12);
  assert.ok(parsed.day >= 1 && parsed.day <= 31);
});

test("prompt knowledge does not define default persona or default state fallbacks", () => {
  const knowledgeMarkdown = fs.readFileSync(path.resolve("prompts/knowledge.md"), "utf8");
  assert.doesNotMatch(knowledgeMarkdown, /fallback_ten_god_behavior/);
  assert.doesNotMatch(knowledgeMarkdown, /default_state_shift/);
  assert.doesNotMatch(knowledgeMarkdown, /"未知"\s*:/);
});

test.after(() => {
  resetKnowledgeCache();
});
