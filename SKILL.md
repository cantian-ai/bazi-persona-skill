---
name: bazi-persona
description: |
  八字人格 Skill。用于创建、更新和对话的人格系统，支持八字排盘、动态流时分析（大运/流年/流月/流日/流时）和万年历/黄历查询。
argument-hint: "[natural language]"
version: "0.2.4"
user-invocable: true
allowed-tools: Read, Write, Glob
---

# 八字人格 Bazi Persona

**不用聊天记录，生日就能生成人格。**

八字人格是一套把八字排盘、命理知识、现实事实组织在一起的人格系统。  
目标不是生成“标签报告”，而是生成一个可持续对话、可持续更新、可切换分析视角的人格成品。

默认跟随用户当前输入语言；语言不明确时先用中文。

## 1) 这个 Skill 做什么

这套 skill 处理 8 类事情：

1. 创建人格（先排盘，再生成人格）
2. 更新人格（补充事实、修正信息、补关系线索）
3. 普通模式聊天（先像这个人自然说话）
4. 作弊模式聊天（在人格口吻上叠加命理分析）
5. 动态流时分析（大运/流年/流月/流日/流时）
6. 黄历/万年历查询
7. 外部聊天导入并提取候选事实
8. 可选的人设启动注入（SOUL/agent 启动上下文）

## 1.1) When NOT to Use

以下场景不适合用本 skill：

- 只想做纯闲聊，且不需要 persona、八字、流时、黄历信息。
- 只做通用任务（编码、文档检索、翻译、报表等），应改用通用技能。
- 没有创建/定位人格所需的关键信息（至少能明确目标对象，或提供 `name/gender/birth_date`）。
- 医疗、法律、投资等高风险决策场景需要专业意见时，本 skill 只能提供参考视角。

## 1.2) 命令行运行方式（用于本地调试/文件管理）

在 skill 根目录执行：

```bash
npm i
```

推荐方式（已编译产物）：

```bash
npm run bazi -- --action inspect
npm run bazi -- --action inspect --slug xiao-a
npm run bazi -- --action delete --slug xiao-a
```

等价方式（直接运行 CLI）：

```bash
node dist/cli.js --action inspect
```

开发调试（需要 tsx）：

```bash
npx tsx src/cli.ts --action inspect
```

说明：

- 命令行主要用于 `inspect/list/delete/help` 这类文件管理动作。
- 创建人格、更新人格、聊天、流时分析、黄历查询优先按下方工具+工作流执行。

## 2) 工具说明（输入 / 输出）

### 2.1 `bazi_chart_tool`

用途：八字排盘 + 固定人格知识映射（静态）。

入参：

- `name` string 必填
- `gender` string 必填，`male` / `female`（兼容 `男` / `女`）
- `birth_date` string 必填，`YYYY-MM-DD`
- `birth_time` string 可选，`HH:mm`
- `birth_location` string 可选
- `calendar_type` string 可选，`solar` / `lunar`，默认 `solar`

结果说明：

- 返回完整 `chart` 结果，后续用于人格生成、状态分析和命理依据引用。

### 2.2 `bazi_flow_tool`

用途：动态八字查询（大运 / 流年 / 流月 / 流日 / 流时）。

入参：

- `chart` object 可选（直接传本命）
- `persona_slug` string 可选（从人格读取本命）
- `base_dir` string 可选
- `at` string 可选（如 `今天` / `昨天` / `2026-04-12`）
- `include_calendar` boolean 可选，默认 `true`
- `lang` string 可选，`zh` / `en` / `ja` / `ko`

结果说明：

- 返回目标时点动态状态（当前大运、阶段偏移、沟通/判断变化）；
- 可附带日期黄历信息（农历、干支、节气、宜忌等）。

### 2.3 `persona_data_tool`

用途：人设文件数据管理（List / Search / Create / Query / Patch(Update) / Delete）。

入参：

- `action` string 必填：`list` / `search` / `create` / `query` / `patch` / `delete`
- `base_dir` string 可选
- `persona_slug` string（`query/patch/delete` 必填）
- `search_query` string（`search` 可选）
- `create_payload` object（`create` 必填）
- `patch_payload` object（`patch` 必填）

结果说明：

- 返回对应动作结果和最新状态；
- 在 `query/patch` 场景会返回人格文件位置，供聊天注入和后续更新。

### 2.4 `memory_tool`

用途：关键记忆与知识的写入、更新、合并、查询。

入参：

- `action` string 必填：`upsert` / `merge` / `delete` / `query`
- `persona_slug` string 必填
- `base_dir` string 可选
- `memories` array（`upsert/merge` 必填）
- `merge_policy` string 可选：`append` / `replace_same_key` / `higher_confidence_wins`

结果说明：

- 返回写入/更新摘要（新增、更新、删除、冲突）；
- 写入后会刷新人格快照，供后续聊天与分析使用。

### 2.5 `calendar_tool`

用途：万年历 / 黄历查询。

入参：

- `at` string 可选（默认今天）
- `lang` string 可选

结果说明：

- 返回日期对应的公历、农历、干支、节气、宜忌等信息。

### 2.6 `chat_import_tool`

用途：导入外部聊天记录并提取候选事实。

入参：

- `source_type` string 必填：`text` / `json` / `ocr_text`
- `payload` string 或 object 必填
- `persona_slug` string 可选
- `timezone` string 可选，默认 `Asia/Shanghai`
- `max_candidates` number 可选，默认 `50`

结果说明：

- 返回结构化候选聊天项与候选记忆项；
- AI 再筛选后进入 `memory_tool` 与 `persona_data_tool.patch`。

## 3) 工作流（按工具连接）

### 3.1 创建人格

适用场景：用户第一次创建某个人格。

1. 提取基础信息：`name/gender/birth_date` 必要；`birth_time/birth_location/relationship` 可选。
2. 调 `bazi_chart_tool` 得到 `chart`。
3. 基于 `chart + relationship + initial_facts` 生成 `profile/snapshot`。
4. 调 `persona_data_tool(action=create)` 写入人格文件。
5. 有附加事实时调 `memory_tool(action=upsert)` 写入关键记忆。
6. 返回创建完成并引导开始聊天。

关键判断：

- 缺 `name/gender/birth_date` 任一项时，先补问最少问题。
- 同名人格存在时先确认覆盖还是新 slug。

### 3.2 更新人格

适用场景：补充新变化、纠正旧信息、补关系线索。

1. 用 `persona_data_tool(search/query)` 定位目标人格。
2. 从输入提取新增事实与纠正信息。
3. 用 `memory_tool(upsert/merge)` 写记忆。
4. 用 `persona_data_tool(patch)` 刷新 snapshot 与必要 profile 字段。
5. 返回更新摘要。

### 3.3 普通模式聊天

适用场景：用户直接对某人格说话。

1. 先判断上下文是否已有当前人格（`current_persona_slug`）。
2. 已锁定且未切换对象时，直接 `persona_data_tool(query)`，不重复 search。
3. 无上下文或用户明确切换时，先 `search` 再 `query`。
4. 注入基础聊天提示词（`chat_base`）和 `persona.md`。
5. 生成回复；需要沉淀时再调用 `memory_tool` + `persona_data_tool.patch`。

关键判断：

- 多人格命中时先确认，不要猜。
- 普通模式优先自然对话，不主动展开命理术语。

### 3.4 人设启动注入（可选）

适用场景：用户明确要求“按该 persona 启动聊天”或“写入 SOUL.md/agent 启动上下文”。

1. 先按 3.3 定位目标 persona。
2. 生成该 persona 专属启动提示词并注入当前会话上下文。
3. 注入只对目标 persona 生效，不污染其他 persona。

### 3.5 作弊模式聊天（命理增强）

适用场景：用户说“打开作弊模式”“从八字看”“按命理分析一下”等。

1. 先按 3.3 定位人格并注入普通模式基础内容。
2. 再叠加作弊模式提示词（`cheat_mode`）。
3. 按需注入 `bazi_data.json`。
4. 涉及时间点时调 `bazi_flow_tool`，需要日期细节时补 `calendar_tool`。
5. 输出保持人格口吻，同时给出可解释依据。
6. 用户关闭作弊模式时，回到普通模式。

### 3.6 动态流时分析

适用场景：用户问“今天状态”“这周为什么变了”“某天推进是否合适”。

1. `persona_data_tool(query)` 读取目标人格。
2. `bazi_flow_tool` 传 `persona_slug/chart + at`。
3. 必要时补 `calendar_tool`。
4. 输出结论 + 依据 + 节奏建议。

### 3.7 黄历/万年历查询

适用场景：只查日期信息，不涉及人格。

1. 调 `calendar_tool`（`at` 可空，空则今天）。
2. 返回农历、干支、节气、宜忌。

### 3.8 外部聊天导入

适用场景：用户上传微信聊天记录、聊天截图文本或其他历史对话。

1. `chat_import_tool` 提取候选信息。
2. AI 筛选高价值候选。
3. `memory_tool` 写关键记忆。
4. `persona_data_tool.patch` 刷新 snapshot。
5. 返回导入摘要（写入/跳过/冲突）。

## 4) 人设目录（代码默认）

默认目录：`<当前 skill 根目录>/personas`

每个人格目录：

- `personas/<slug>/persona.md`：人设成品（聊天主注入文件）
- `personas/<slug>/bazi_data.json`：八字结构化数据
- `personas/<slug>/memory.json`：结构化记忆数据
- `personas/<slug>/history.json`：结构化历史会话/导入记录

覆盖优先级：

1. 显式 `base-dir`
2. 环境变量 `BAZI_PERSONA_HOME`
3. 默认 `<skill-root>/personas`

## 5) 质量标准

高质量八字人格至少满足：

1. 像一个人，不像模板标签。
2. 创建后能立刻开始聊天。
3. 更新后能自然吸收现实变化。
4. 普通模式与作弊模式切换自然，不互相污染。
5. 关键判断能回到八字证据与现实信息。
