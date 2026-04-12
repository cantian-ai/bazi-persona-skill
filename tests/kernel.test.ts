import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import * as publicApi from "../src/index.js";
import { routeIntent } from "../src/kernel/intent.js";
import { loadPromptPack, loadPersonaKnowledge } from "../src/kernel/resources.js";
import { parseDateTimeInput } from "../src/tools/calendar/query.js";
import { inspectPersona, renderCliHelp } from "../src/cli.js";
import {
  bazi_chart_tool,
  bazi_flow_tool,
  calendar_tool,
  chat_import_tool,
  memory_tool,
  persona_data_tool,
} from "../src/kernel/core-tools.js";
import {
  workflow_chat,
  workflow_create_persona,
  workflow_query_calendar,
  workflow_update_persona,
} from "../src/kernel/workflow-orchestrator.js";

function makeTempDir(prefix: string): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

function runtimeContext() {
  return {
    promptPack: loadPromptPack(),
    knowledge: loadPersonaKnowledge(),
  };
}

test("routeIntent still routes core intents", () => {
  assert.equal(routeIntent("帮我创建八字人格：舒晴").action, "create");
  assert.equal(routeIntent("更新舒晴：最近升职了").action, "update");
  assert.equal(routeIntent("舒晴今天状态怎么样").action, "flow");
  assert.equal(routeIntent("今天黄历怎么样").action, "calendar");
  assert.equal(routeIntent("舒晴最近工作忙吗").action, "respond");
});

test("prompt manifest includes chat_base and cheat_mode", () => {
  const pack = loadPromptPack();
  const ids = pack.entries.map((entry) => entry.id);
  assert.ok(ids.includes("chat_base"));
  assert.ok(ids.includes("cheat_mode"));
  assert.ok(ids.includes("create_persona"));
  assert.ok(ids.includes("memory_builder"));
});

test("public exports switched to new tool API names", () => {
  const entries = publicApi as Record<string, unknown>;
  assert.equal(typeof entries.bazi_chart_tool, "function");
  assert.equal(typeof entries.bazi_flow_tool, "function");
  assert.equal(typeof entries.calendar_tool, "function");
  assert.equal(typeof entries.chat_import_tool, "function");
  assert.equal(typeof entries.persona_data_tool, "function");
  assert.equal(typeof entries.memory_tool, "function");
  assert.equal(entries.createPersona, undefined);
  assert.equal(entries.updatePersona, undefined);
  assert.equal(entries.queryFlow, undefined);
  assert.equal(entries.queryCalendar, undefined);
});

test("bazi_chart_tool supports normalized input and validates required fields", async () => {
  await assert.rejects(
    async () => bazi_chart_tool({
      name: "",
      gender: "female",
      birth_date: "",
    }),
    /requires name, gender, and birth_date/,
  );

  const chart = await bazi_chart_tool({
    name: "舒晴",
    gender: "女",
    birth_date: "1999年8月12日",
    birth_time: "下午3点半",
    birth_location: "上海",
  });
  assert.equal(chart.chart.birth_input.name, "舒晴");
  assert.equal(chart.chart.birth_input.date, "1999-08-12");
  assert.equal(chart.chart.birth_input.provided_time, "15:30");
  assert.equal(chart.chart.birth_input.calendar_type, "solar");
});

test("calendar_tool supports explicit date and defaults to today", async () => {
  const fixed = await calendar_tool({ at: "2026-04-12" });
  assert.equal(fixed.at.startsWith("2026-04-12"), true);
  if (fixed.calendar) {
    assert.ok(typeof fixed.calendar.农历 === "string");
  }

  const today = await calendar_tool({});
  assert.ok(today.at.length >= 10);
});

test("bazi_flow_tool supports persona-based and chart-based scenarios", async () => {
  const context = runtimeContext();
  const baseDir = makeTempDir("bazi-flow-tool-");
  await workflow_create_persona({
    args: {
      "base-dir": baseDir,
      input: "帮我创建八字人格：林岚，女，1994年6月8日，上海",
    },
    context,
  });

  const byPersona = await bazi_flow_tool({
    base_dir: baseDir,
    persona_slug: "lin-lan",
    at: "2026-04-12",
    include_calendar: true,
    lang: "zh",
  }, context);
  assert.equal(byPersona.persona_slug, "lin-lan");
  assert.ok(byPersona.flow.current_luck.length > 0);

  const chart = await bazi_chart_tool({
    name: "舒晴",
    gender: "female",
    birth_date: "1999-08-12",
    birth_time: "15:30",
    birth_location: "上海",
  });
  const byChart = await bazi_flow_tool({
    chart: chart.chart,
    include_calendar: false,
    lang: "zh",
  }, context);
  assert.equal(byChart.persona_slug, undefined);
  assert.equal(byChart.calendar, undefined);
  assert.ok(byChart.flow.current_luck.length > 0);

  await assert.rejects(
    async () => bazi_flow_tool({
      include_calendar: false,
    }, context),
    /needs either chart or persona_slug/,
  );
});

test("persona_data_tool create/query/patch/delete use new file schema", async () => {
  const baseDir = makeTempDir("bazi-schema-");
  const context = runtimeContext();
  const chart = await bazi_chart_tool({
    name: "舒晴",
    gender: "female",
    birth_date: "1999-08-12",
    birth_time: "15:30",
    birth_location: "上海",
  });
  const created = await persona_data_tool({
    action: "create",
    base_dir: baseDir,
    create_payload: {
      profile: {
        name: "舒晴",
        gender: "女",
        birth_date: "1999-08-12",
        birth_time: "15:30",
        birth_location: "上海",
        calendar_type: "solar",
      },
      relationship: "同事",
      initial_facts: ["最近开始带团队"],
      chart: chart.chart,
    },
  }, context) as {
    persona_slug: string;
    files: {
      persona_md: string;
      bazi_data_json: string;
      memory_json: string;
      history_json: string;
    };
  };

  assert.ok(fs.existsSync(created.files.persona_md));
  assert.ok(fs.existsSync(created.files.bazi_data_json));
  assert.ok(fs.existsSync(created.files.memory_json));
  assert.ok(fs.existsSync(created.files.history_json));
  assert.ok(!fs.existsSync(path.join(baseDir, created.persona_slug, "persona.json")));
  assert.ok(!fs.existsSync(path.join(baseDir, created.persona_slug, "SKILL.md")));
  assert.ok(!fs.existsSync(path.join(baseDir, created.persona_slug, "conversations.jsonl")));

  const queried = await persona_data_tool({
    action: "query",
    base_dir: baseDir,
    persona_slug: created.persona_slug,
  }, context) as {
    persona_markdown: string;
    memory: Array<unknown>;
  };
  assert.match(queried.persona_markdown, /# 舒晴/);
  assert.ok(queried.memory.length >= 1);

  const patched = await persona_data_tool({
    action: "patch",
    base_dir: baseDir,
    persona_slug: created.persona_slug,
    patch_payload: {
      profile_patch: {
        birth_location: "上海浦东",
      },
      memory_append: [{
        type: "fact",
        content: "最近升职了",
        source: "test",
      }],
    },
  }, context) as {
    memory_count: number;
  };
  assert.ok(patched.memory_count >= 2);

  const deleted = await persona_data_tool({
    action: "delete",
    base_dir: baseDir,
    persona_slug: created.persona_slug,
  }, context) as {
    deleted: boolean;
  };
  assert.equal(deleted.deleted, true);
});

test("persona_data_tool supports list/search and validates required payloads", async () => {
  const baseDir = makeTempDir("bazi-persona-data-");
  const context = runtimeContext();
  const chartA = await bazi_chart_tool({
    name: "舒晴",
    gender: "female",
    birth_date: "1999-08-12",
    birth_location: "上海",
  });
  const chartB = await bazi_chart_tool({
    name: "诺拉",
    gender: "female",
    birth_date: "1997-10-01",
    birth_location: "北京",
  });

  await persona_data_tool({
    action: "create",
    base_dir: baseDir,
    create_payload: {
      profile: {
        name: "舒晴",
        gender: "女",
        birth_date: "1999-08-12",
        calendar_type: "solar",
      },
      chart: chartA.chart,
    },
  }, context);
  await persona_data_tool({
    action: "create",
    base_dir: baseDir,
    create_payload: {
      profile: {
        name: "诺拉",
        gender: "女",
        birth_date: "1997-10-01",
        calendar_type: "solar",
      },
      chart: chartB.chart,
    },
  }, context);

  const listed = await persona_data_tool({
    action: "list",
    base_dir: baseDir,
  }, context) as { items: Array<{ slug: string }> };
  assert.ok(listed.items.length >= 2);

  const searched = await persona_data_tool({
    action: "search",
    base_dir: baseDir,
    search_query: "shu",
  }, context) as { items: Array<{ slug: string }> };
  assert.ok(searched.items.some((item) => item.slug === "shu-qing"));

  await assert.rejects(
    async () => persona_data_tool({
      action: "query",
      base_dir: baseDir,
    }, context),
    /query requires persona_slug/,
  );
  await assert.rejects(
    async () => persona_data_tool({
      action: "patch",
      base_dir: baseDir,
      persona_slug: "shu-qing",
    }, context),
    /patch requires persona_slug and patch_payload/,
  );
  await assert.rejects(
    async () => persona_data_tool({
      action: "create",
      base_dir: baseDir,
      create_payload: {
        profile: {
          name: "缺字段测试",
          gender: "女",
        },
      },
    } as never, context),
    /create requires create_payload\.profile/,
  );
});

test("memory_tool supports upsert merge query delete", async () => {
  const baseDir = makeTempDir("bazi-memory-");
  const context = runtimeContext();
  await workflow_create_persona({
    args: {
      "base-dir": baseDir,
      input: "帮我创建八字人格：林岚，女，1994年6月8日，上海，同事",
    },
    context,
  });

  await memory_tool({
    action: "upsert",
    base_dir: baseDir,
    persona_slug: "lin-lan",
    memories: [{
      memory_id: "work-state",
      key: "work.state",
      type: "fact",
      content: "最近经常加班",
      source: "user",
      confidence: 0.6,
    }],
  }, context);

  await memory_tool({
    action: "merge",
    base_dir: baseDir,
    persona_slug: "lin-lan",
    merge_policy: "higher_confidence_wins",
    memories: [{
      memory_id: "work-state",
      key: "work.state",
      type: "fact",
      content: "最近加班减少了",
      source: "user",
      confidence: 0.9,
    }],
  }, context);

  const queried = await memory_tool({
    action: "query",
    base_dir: baseDir,
    persona_slug: "lin-lan",
    query: "work.state",
  }, context);
  assert.equal(queried.count, 1);
  assert.equal(queried.items?.[0]?.content, "最近加班减少了");

  const removed = await memory_tool({
    action: "delete",
    base_dir: baseDir,
    persona_slug: "lin-lan",
    memories: [{
      memory_id: "work-state",
      type: "fact",
      content: "最近加班减少了",
      source: "user",
    }],
  }, context);
  assert.ok((removed.deleted ?? 0) >= 1);
});

test("memory_tool handles merge policies and empty-memory errors", async () => {
  const baseDir = makeTempDir("bazi-memory-policy-");
  const context = runtimeContext();
  await workflow_create_persona({
    args: {
      "base-dir": baseDir,
      input: "帮我创建八字人格：舒晴，女，1999年8月12日，上海",
    },
    context,
  });

  await memory_tool({
    action: "merge",
    base_dir: baseDir,
    persona_slug: "shu-qing",
    merge_policy: "append",
    memories: [{
      key: "relationship.status",
      type: "fact",
      content: "最近和同事协作频繁",
      source: "user",
    }],
  }, context);

  await memory_tool({
    action: "merge",
    base_dir: baseDir,
    persona_slug: "shu-qing",
    merge_policy: "replace_same_key",
    memories: [{
      key: "relationship.status",
      type: "fact",
      content: "最近更倾向独立推进",
      source: "user",
    }],
  }, context);

  const queried = await memory_tool({
    action: "query",
    base_dir: baseDir,
    persona_slug: "shu-qing",
    query: "relationship.status",
  }, context);
  assert.equal(queried.count, 1);
  assert.equal(queried.items?.[0]?.content, "最近更倾向独立推进");

  await assert.rejects(
    async () => memory_tool({
      action: "upsert",
      base_dir: baseDir,
      persona_slug: "shu-qing",
      memories: [],
    }, context),
    /requires non-empty memories/,
  );
});

test("workflow create/update/chat and cheat toggle work", async () => {
  const baseDir = makeTempDir("bazi-chat-");
  const context = runtimeContext();

  const created = await workflow_create_persona({
    args: {
      "base-dir": baseDir,
      input: "帮我创建八字人格：诺拉，女，1997年10月1日，北京，同事",
    },
    context,
  });
  assert.match(created, /已创建人格|Created persona/);

  const opened = await workflow_chat({
    args: {
      "base-dir": baseDir,
      slug: "nuo-la",
      input: "打开作弊模式",
    },
    context,
  });
  assert.match(opened, /作弊模式已开启/);

  const answered = await workflow_chat({
    args: {
      "base-dir": baseDir,
      slug: "nuo-la",
      input: "你今天状态怎么样",
    },
    context,
  });
  assert.match(answered, /命理主轴|当前大运|阶段/);

  const updated = await workflow_update_persona({
    args: {
      "base-dir": baseDir,
      slug: "nuo-la",
      input: "更新诺拉：最近开始带团队",
    },
    context,
  });
  assert.match(updated, /Updated persona/);
});

test("bazi_flow_tool and calendar query provide date anchored results", async () => {
  const baseDir = makeTempDir("bazi-flow-");
  const context = runtimeContext();
  await workflow_create_persona({
    args: {
      "base-dir": baseDir,
      input: "帮我创建八字人格：舒晴，女，1999年8月12日，上海",
    },
    context,
  });
  const flow = await bazi_flow_tool({
    base_dir: baseDir,
    persona_slug: "shu-qing",
    at: "2026-04-12",
    include_calendar: true,
    lang: "zh",
  }, context);
  assert.equal(flow.at.startsWith("2026-04-12"), true);
  assert.ok(flow.flow.current_luck.length > 0);

  const calendar = await workflow_query_calendar({
    args: {
      at: "2026-04-12",
    },
  });
  assert.match(calendar, /Calendar|农历|干支日期/);
});

test("chat_import_tool v1 extracts candidates and memory items", async () => {
  const imported = await chat_import_tool({
    source_type: "ocr_text",
    payload: "A: 最近工作很忙\nB: 这周加班三天",
    max_candidates: 10,
  });
  assert.equal(imported.candidates.length, 2);
  assert.equal(imported.memories.length, 2);
  assert.equal(imported.candidates[0].source_type, "text");
});

test("chat_import_tool supports json payload and max-candidates trimming", async () => {
  const importedJson = await chat_import_tool({
    source_type: "json",
    payload: [
      { role: "assistant", content: "我们下周再推进", created_at: "2026-04-12T00:00:00.000Z" },
      { role: "user", content: "这周先同步信息" },
      { role: "user", content: "   " },
    ],
    max_candidates: 1,
  });
  assert.equal(importedJson.candidates.length, 1);
  assert.equal(importedJson.candidates[0].role, "assistant");
  assert.equal(importedJson.memories[0].confidence, 0.8);

  const importedText = await chat_import_tool({
    source_type: "text",
    payload: "第一行\n第二行\n第三行",
    max_candidates: 2,
  });
  assert.equal(importedText.candidates.length, 2);
});

test("cli inspect reads new persona files", async () => {
  const baseDir = makeTempDir("bazi-cli-");
  const context = runtimeContext();
  await workflow_create_persona({
    args: {
      "base-dir": baseDir,
      input: "帮我创建八字人格：舒晴，女，1999年8月12日，上海，同事",
    },
    context,
  });
  const output = inspectPersona({
    "base-dir": baseDir,
    slug: "shu-qing",
  });
  assert.match(output, /persona\.md/);
  assert.match(output, /bazi_data\.json/);
  assert.match(output, /memory\.json/);
  assert.match(output, /history\.json/);
});

test("cli help stays storage-only and points to new schema", () => {
  const help = renderCliHelp("zh");
  assert.match(help, /storage-only|CLI 的定位/);
  assert.match(help, /personas\/<slug>\/\{persona\.md,bazi_data\.json,memory\.json,history\.json\}/);
});

test("calendar parser handles relative natural-language dates", () => {
  const today = parseDateTimeInput("今天");
  const tomorrow = parseDateTimeInput("明天");
  const yesterday = parseDateTimeInput("昨天");
  assert.equal(today.year > 2000, true);
  assert.equal(tomorrow.day === today.day + 1 || tomorrow.day === 1, true);
  assert.equal(yesterday.day !== today.day, true);
});

test("generic and openclaw SKILL docs stay aligned on tools and file names", () => {
  const generic = fs.readFileSync(path.resolve("SKILL.md"), "utf8");
  const openclaw = fs.readFileSync(path.resolve("openclaw/SKILL.md"), "utf8");
  const requiredTerms = [
    "bazi_chart_tool",
    "bazi_flow_tool",
    "persona_data_tool",
    "memory_tool",
    "calendar_tool",
    "chat_import_tool",
    "persona.md",
    "bazi_data.json",
    "memory.json",
    "history.json",
  ];
  for (const term of requiredTerms) {
    assert.match(generic, new RegExp(term.replace(".", "\\.")));
    assert.match(openclaw, new RegExp(term.replace(".", "\\.")));
  }
});
