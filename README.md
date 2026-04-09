# Bazi Persona Skill

八字人格.skill（`bazi-persona-skill`）是一个用于“创建、更新、管理人格 Skill”的元技能项目。  
它将出生信息快速转化为可执行的人格规则，并支持后续资料增强与版本回滚。

`bazi-persona-skill` is a toolkit to create, update, and manage executable personas from Bazi data.  
It turns birth information into actionable speaking/decision rules and supports continuous enhancement.

用户亮点（不是术语）：
- 零基础可用：不会八字也能创建。
- 自然语言可用：直接说人话就能开始，不必记命令。
- 作弊模式：像“上帝视角”一样问状态、关系、趋势，并可继续正常聊天。

User highlights:
- Beginner-friendly: create a persona even if you know nothing about Bazi.
- Natural-language first: talk normally, no rigid command template required.
- Cheatsheet mode: ask status/relationship/trend questions with a God-view while keeping normal chat.

## 多语言支持 / Multilingual Support

- 默认语言策略：`auto`（跟随用户输入语言）
- 支持显式设置：`--lang zh` / `--lang en`
- cheatsheet、列表、创建成功提示等高频交互已支持中英双语输出
- Persona 规则保持人格一致，语言可随用户切换

Language policy:
- Default mode is `auto` (follows the user's language)
- You can force output with `--lang zh` or `--lang en`
- High-frequency flows (create/list/cheatsheet) support bilingual output
- Persona style stays consistent while language can switch on demand

## 安装到 Codex（推荐） / Install to Codex (Recommended)

不需要手动复制目录，直接用 `npx skills`：

```bash
npx skills add . --skill bazi-persona -a codex
```

如果要全局安装（跨项目可用）：

```bash
npx skills add . --skill bazi-persona -a codex -g
```

你也可以用 npm 脚本：

```bash
npm run skills:list
npm run install:codex
npm run install:global:codex
npm run install:all
```

## 快速开始 / Quick Start

1. 安装依赖

```bash
npm install
```

2. 构建脚本

```bash
npm run build
```

3. 一条命令完成初始化（推荐）

```bash
npm run bazi -- --action create \
  --name "示例人物" \
  --slug "shi-li-ren-wu" \
  --gender "女" \
  --birth-date "96年8月12日" \
  --birth-time "下午3点半" \
  --birth-location "上海" \
  --relationships "同事,恋人" \
  --set-active-relationships "同事" \
  --true-solar "auto" \
  --day-rollover 23
```

说明：
- 默认会在创建时自动排盘并落盘，不需要再手动跑 `bazi_calc`。
- 默认生成人格目录：`~/.bazi-personas`（不会进入当前项目 Git）。
- 如需写到项目内测试目录，可显式传：`--base-dir ./personas`。
- `--birth-time` 可缺失，系统会自动进入缺时精简模式。
- 创建与更新默认一次执行到底，不再弹“确认写入”二次交互。
- 如需取消写入，可显式加 `--yes false`。
- 若未传 `--relation`，交互模式会补问一次关系（可填“名人/无关系”）。
- 创建成功后会自动提示“已切换角色模式”，用户可直接继续对话。

一句话输入示例（给终端用户复制改） / One-line natural input example:

```text
帮我创建八字人格：对象叫小A，1996年8月12日下午3点半，上海，女；我和她是同事。
```

4. 查看已有人格

```bash
npm run bazi -- --action list
```

5. 写入一条记忆（可选）

```bash
npm run bazi -- --action update \
  --slug "shi-li-ren-wu" \
  --memory "他在压力下会先卡边界，再给明确动作指令" \
  --memory-type "behavior_fact" \
  --memory-weight "medium"
```

6. 查询当前大运/流年/流月/流日/流时（可选）

```bash
npm run bazi -- --action flow \
  --slug "shi-li-ren-wu" \
  --at "2026-04-09 20:30"
```

7. cheatsheet 模式（显式触发） / Cheatsheet mode (explicit trigger)

```bash
npm run bazi -- --action cheatsheet --slug "shi-li-ren-wu" --mode on

# 开启后可正常聊天式提问（按问题自动走不同模板）
npm run bazi -- --action cheatsheet \
  --slug "shi-li-ren-wu" \
  --message "我今天状态怎么样？"

# 也支持自然语言开关（不传 --mode）
npm run bazi -- --action cheatsheet --slug "shi-li-ren-wu" --message "打开作弊模式"
npm run bazi -- --action cheatsheet --slug "shi-li-ren-wu" --message "关闭作弊模式"

# 关闭模式
npm run bazi -- --action cheatsheet --slug "shi-li-ren-wu" --mode off
```

说明：
- `mode off` 会清空 cheatsheet 会话上下文，避免与正常聊天串味。
- 记忆分层：`normal` 与 `cheatsheet` 独立，可用 `--action memory --scope normal|cheatsheet` 查看。
- `mode off` clears cheatsheet session context to avoid mixing with normal chat.
- Memory is layered: `normal` and `cheatsheet` are isolated.

8. 合盘分析（两人格）

```bash
npm run bazi -- --action compat \
  --slug-a "shi-li-ren-wu" \
  --slug-b "another-persona"
```

9. 记忆管理（list/pin/unpin/forget/merge）

```bash
npm run bazi -- --action memory --slug "shi-li-ren-wu" --op list
```

7. 卸载测试数据（可选）

```bash
npm run bazi -- --action delete \
  --slug "shi-li-ren-wu" \
  --confirm-1 DELETE \
  --confirm-2 shi-li-ren-wu
```

## 命令体系

- 主命令：`/create-bazi-persona`
- 主命令：`/update-bazi-persona {slug}`
- 主命令：`/list-bazi-personas`
- 主命令：`/bazi-persona-rollback {slug} {version}`
- 主命令：`/delete-bazi-persona {slug}`
- 主命令：`/query-bazi-flow {slug} {datetime?}`
- 主命令：`/bazi-cheatsheet {slug}`
- 主命令：`/bazi-compat {slugA} {slugB}`
- 主命令：`/memory-{list|pin|unpin|forget|merge} {slug}`

友好别名（同义触发）：

- `/create-bazi`
- `/update-bazi`
- `/list-bazi`
- `/rollback-bazi`
- `/delete-bazi`
- `/flow-bazi`
- `/cheatsheet-bazi`
- `/compat-bazi`
- `/memory-bazi`

## 目录结构

```text
bazi-persona-skill/
├── SKILL.md
├── prompts/
│   ├── intake.md
│   ├── bazi_analyzer.md
│   ├── persona_builder.md
│   ├── state_builder.md
│   ├── material_merger.md
│   ├── correction_merger.md
│   └── skill_builder.md
├── tools/
│   ├── core/
│   │   ├── bazi_calc.ts
│   │   └── skill_writer.ts
│   ├── data/
│   │   ├── gan_zhi_knowledge.ts
│   │   ├── shengxiao_knowledge.ts
│   │   └── shishen_knowledge.ts
│   ├── io/
│   │   ├── chat_parser.ts
│   │   └── text_ingest.ts
│   ├── runtime/
│   │   ├── meta_updater.ts
│   │   └── version_manager.ts
│   └── utils/
│       ├── _shared.ts
│       ├── confirm_prompt.ts
│       └── slugify.ts
├── personas/
│   └── {slug}/
│       ├── SKILL.md
│       ├── .runtime/
│       │   ├── persona.core.json
│       │   ├── state.current.json
│       │   ├── bazi.evidence.json
│       │   ├── meta.json
│       │   └── memory.log.jsonl
│       │   ├── memory.index.json
│       │   └── memory.pins.json
│       └── versions/
├── package.json
└── tsconfig.json
```

## 体验设计原则

- 首次创建只需基础 5 项：名称、出生日期、出生时间（可暂缺）、出生地点、性别。
- 缺失出生时间时支持精简精度版：内部中午 12:00 排盘，输出去时柱化并明确提示精度差异。
- 每次关键写入前提供短预览，强调“可执行人格规则”而非泛分析。
- 创建/更新默认单次执行完成，不做重复确认。
- 对外单文件：用户主要只看 `personas/{slug}/SKILL.md`，八字依据以 Markdown 提炼呈现。
- 对内结构化：`.runtime` 维护 core/state/evidence/meta/memory，便于可维护更新。
- `SKILL.md` 内统一承载可执行规则与摘要（纯 Markdown）；结构化数据放在 `.runtime`。
- 每次更新先自动备份，回滚前再保留一次回滚前快照。

## 授权提示优化建议（Codex）

- 尽量使用 `npm run bazi -- --action ...` 单入口命令，避免多段命令导致重复授权弹窗。
- 推荐在首次运行时允许 `npm run bazi` 前缀，这样后续创建/更新/列表/删除/回滚都不会反复确认。
- 提示用户文案建议：仅本地执行排盘与写文件，不联网、不上传数据。

## 示例输出

预览卡示例（展示后默认直接写入）：

```text
人格预览
1) 一句话人格总结：理性克制，重边界，做事先评估风险再推进。
2) 说话给人的感觉：简洁直接，结论优先，少废话但不失礼。
3) 做决定时最看重：最看重可持续性与收益-风险比。
4) 压力下最明显变化：压力下更强调底线、交付与边界。
5) 最近更像的状态：最近处于“稳中提效、收敛风险”的阶段。
```

版本快照目录会同时保存 `SKILL.md` 与 `.runtime`，确保回滚后人格与记忆一致。

## 质量验证

```bash
npm run typecheck
```

> 说明：
> 1. `cantian-tymext` 为排盘核心依赖。若未安装依赖，`bazi_calc.ts` 会返回可读错误提示，并给出修复建议。
> 2. 仍可使用 `node dist/skill_writer.js --action ...` 进行细粒度管理。
