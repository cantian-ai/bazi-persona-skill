# Bazi Persona Skill

八字人格.skill（`bazi-persona-skill`）是一个用于“创建、更新、管理人格 Skill”的元技能项目。  
它将出生信息快速转化为可执行的人格规则，并支持后续资料增强与版本回滚。

## 安装到 Codex（推荐）

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

## 快速开始

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
  --relation "同事"
```

说明：
- 默认会在创建时自动排盘并落盘，不需要再手动跑 `bazi_calc`。
- `--birth-time` 可缺失，系统会自动进入缺时精简模式。
- 交互确认支持回车默认继续，或用 `↑↓`、`1/2`、`y/n` 快捷选择。
- 自动化场景可加 `--yes true` 跳过确认；`--yes false` 会直接取消写入。
- 若未传 `--relation`，交互模式会补问一次关系（可填“名人/无关系”）。

一句话输入示例（给终端用户复制改）：

```text
帮我创建八字人格：对象叫小A，1996年8月12日下午3点半，上海，女；我和她是同事。
```

4. 查看已有人格

```bash
npm run bazi -- --action list
```

5. 卸载测试数据（可选）

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

友好别名（同义触发）：

- `/create-bazi`
- `/update-bazi`
- `/list-bazi`
- `/rollback-bazi`
- `/delete-bazi`

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
│   ├── _shared.ts
│   ├── bazi_calc.ts
│   ├── chat_parser.ts
│   ├── text_ingest.ts
│   ├── skill_writer.ts
│   ├── version_manager.ts
│   ├── slugify.ts
│   └── meta_updater.ts
├── personas/
│   └── {slug}/
│       ├── SKILL.md
│       ├── persona.md
│       ├── state.md
│       ├── chart.json
│       ├── corrections.md
│       ├── meta.json
│       └── versions/
├── package.json
└── tsconfig.json
```

## 体验设计原则

- 首次创建只需基础 5 项：名称、出生日期、出生时间（可暂缺）、出生地点、性别。
- 缺失出生时间时支持精简精度版：内部中午 12:00 排盘，输出去时柱化并明确提示精度差异。
- 每次关键写入前提供短预览，强调“可执行人格规则”而非泛分析。
- 确认交互默认回车继续，降低输入负担；也支持键盘上下选择。
- 每次更新先自动备份，回滚前再保留一次回滚前快照。

## 授权提示优化建议（Codex）

- 尽量使用 `npm run bazi -- --action ...` 单入口命令，避免多段命令导致重复授权弹窗。
- 推荐在首次运行时允许 `npm run bazi` 前缀，这样后续创建/更新/列表/删除/回滚都不会反复确认。
- 提示用户文案建议：仅本地执行排盘与写文件，不联网、不上传数据。

## 示例输出

预览卡示例：

```text
人格预览（写入前确认）
1) 一句话人格总结：理性克制，重边界，做事先评估风险再推进。
2) 说话给人的感觉：简洁直接，结论优先，少废话但不失礼。
3) 做决定时最看重：最看重可持续性与收益-风险比。
4) 压力下最明显变化：压力下更强调底线、交付与边界。
5) 最近更像的状态：最近处于“稳中提效、收敛风险”的阶段。
```

`chart.json` 关键字段示例：

```json
{
  "accuracy_mode": "missing_time_six_pillars",
  "requires_birth_time_for_full_accuracy": true,
  "pillars": {
    "year": "庚午",
    "month": "辛巳",
    "day": "丁丑"
  },
  "removed_due_to_missing_time": [
    "时柱",
    "与时柱相关的刑冲合会",
    "时柱衍生关系"
  ]
}
```

## 质量验证

```bash
npm run typecheck
```

> 说明：
> 1. `cantian-tymext` 为排盘核心依赖。若未安装依赖，`bazi_calc.ts` 会返回可读错误提示，并给出修复建议。
> 2. 仍可使用 `node dist/skill_writer.js --action ...` 进行细粒度管理。
