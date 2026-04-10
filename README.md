# Bazi Persona Skill

> 从八字出发，生成一个会说话、会判断、会随时间变化的 AI 人格。
>
> Build a living AI persona from Bazi (Chinese astrology) — it speaks, decides, and evolves.

**Cantian AI / 参天AI**

---

## Highlights / 亮点

| | 中文 | English |
|---|---|---|
| **零基础** | 不懂八字也能用，自然语言输入即可 | No Bazi knowledge needed — just talk |
| **作弊模式** | 上帝视角看状态、关系、趋势，随时切回正常聊天 | God-view on status, compatibility & trends |
| **MBTI 映射** | 八字自动推导 EI/SN/TF/JP，让性格差异更直观 | Auto-maps Bazi to MBTI for intuitive contrast |
| **时运追踪** | 大运 / 流年 / 流月 / 流日 / 流时，实时能量解读 | Real-time luck-cycle energy reading |
| **合盘分析** | 两个人格一键合盘，看关系互动模式 | One-click compatibility between two personas |
| **Agent 集成** | 一键同步到 Claude Code / OpenClaw，直接对话 | One-command sync to Claude Code / OpenClaw |
| **版本管理** | 每次更新自动备份，支持一键回滚 | Auto-backup on every update, one-click rollback |
| **多语言** | 自动跟随用户语言，支持中 / 英显式切换 | Auto-follows user language; `--lang zh/en` override |

---

## Quick Start / 快速开始

### 1. 通过 npx 直接使用（推荐）

无需克隆仓库，安装后即可使用：

```bash
# 全局安装
npm install -g bazi-persona-skill

# 创建人格
bazi --action create \
  --name "舒晴" \
  --slug "shu-qing" \
  --gender "女" \
  --birth-date "99年8月12日" \
  --birth-time "下午3点半" \
  --birth-location "上海" \
  --relationships "同事"

# 查看已有人格
bazi --action list

# 查看帮助
bazi --action help
```

你也可以用 `bazi-persona` 代替 `bazi`，两个命令完全等价。

### 2. 从源码使用

```bash
git clone <repo-url>
cd bazi-persona-skill
npm install
npm run build

# 通过 npm scripts 使用
npm run bazi -- --action create --name "舒晴" --slug "shu-qing" ...
npm run bazi -- --action list
npm run bazi -- --action help
```

### 3. 自然语言输入

不需要记命令参数，直接用自然语言描述即可：

```text
帮我创建八字人格：对象叫小A，1996年8月12日下午3点半，上海，女；我和她是同事。
```

```text
Create a persona: Jason, male, born at 12:13 on 1991-03-12 in Guangzhou, ex-partner.
```

---

## Core Features / 核心功能

### 创建人格

只需 5 项基础信息：**名称、出生日期、出生时间（可缺）、出生地点、性别**。

```bash
bazi --action create \
  --name "示例" --slug "shi-li" \
  --gender "男" --birth-date "91年3月12日" \
  --birth-time "中午12点" --birth-location "广州" \
  --relationships "朋友"
```

- 出生时间缺失时自动进入精简模式（去时柱），明确提示精度差异
- 创建时可追加背景信息：`--story "他是清华毕业的，工作很拼"`
- 创建成功后自动切入人格对话模式

### 更新人格

```bash
# 补充记忆
bazi --action update --slug "shi-li" \
  --memory "他压力下会先卡边界" \
  --memory-type "behavior_fact"

# 自然语言随聊随记
bazi --action update --slug "shi-li" \
  --message "他最近换了工作，心态更开放了"
```

### 作弊模式 (Cheatsheet Mode)

像"上帝视角"一样查看人格的深层状态：

```bash
# 开启
bazi --action cheatsheet --slug "shi-li" --mode on

# 聊天式提问
bazi --action cheatsheet --slug "shi-li" --message "我今天状态怎么样？"

# 自然语言开关
bazi --action cheatsheet --slug "shi-li" --message "打开作弊模式"

# 关闭
bazi --action cheatsheet --slug "shi-li" --mode off
```

### 时运查询

查询大运 / 流年 / 流月 / 流日 / 流时：

```bash
bazi --action flow --slug "shi-li"
bazi --action flow --slug "shi-li" --at "2026-04-10 20:30"
```

### 万年历 / 黄历

```bash
bazi --action calendar
bazi --action calendar --date "2026-04-10"
```

### 合盘分析

```bash
bazi --action compat --slug-a "shi-li" --slug-b "shu-qing"
```

### 记忆管理

```bash
bazi --action memory --slug "shi-li" --op list
```

### 版本回滚

```bash
bazi --action rollback --slug "shi-li" --version 1
```

### 删除人格

```bash
bazi --action delete --slug "shi-li" \
  --confirm-1 DELETE --confirm-2 shi-li
```

---

## Agent Integration / 平台集成

### Claude Code + OpenClaw 一键同步

将已创建的人格同步为 Agent 文件，在 Claude Code 或 OpenClaw 中直接以人格身份对话。

```bash
# 一键引导开启（推荐，会先预览再确认）
bazi --action agent --op enable

# 查看同步计划
bazi --action agent --op list

# 直接同步全部人格到两个平台
bazi --action agent --op sync

# 只同步到 Claude Code
bazi --action agent --op sync --target claude

# 只同步到 OpenClaw
bazi --action agent --op sync --target openclaw

# 同步指定人格
bazi --action agent --op sync --slug "shu-qing"
```

**默认路径：**

| 平台 | Agent 目录 |
|---|---|
| Claude Code | `~/.claude/agents/bazi-persona/` |
| OpenClaw | `~/.openclaw/agents/bazi-persona/` |

每个人格生成一个独立 agent 文件 + 一个 `bazi-persona-router.md` 路由文件。

**自定义路径：**

```bash
bazi --action agent --op sync \
  --claude-home "/custom/.claude" \
  --openclaw-home "/custom/.openclaw"
```

**同步后使用：**

在 Claude Code / OpenClaw 中直接点名角色名称或 ID 即可开始对话。输入"打开作弊模式"或"open cheatsheet mode"进入上帝视角。

**移除 Agent：**

```bash
bazi --action agent --op remove --confirm DELETE
```

### Skill 安装（Codex / Cursor 等）

```bash
# 安装到 Codex
npx skills add . --skill bazi-persona -a codex

# 全局安装
npx skills add . --skill bazi-persona -a codex -g

# 安装到多个平台
npx skills add . --skill bazi-persona -a codex -a claude-code -a cursor --copy -y
```

---

## Slash Commands / 斜杠命令

在 Claude Code 等支持 Skill 的平台中，可直接使用统一入口 `/bazi-persona`：

| 命令 | 说明 |
|---|---|
| `/bazi-persona create` | 创建新人格 |
| `/bazi-persona list` | 查看所有人格 |
| `/bazi-persona {id}` | 进入该人格对话 |
| `/bazi-persona update {id}` | 补充资料并更新 |
| `/bazi-persona cheatsheet {id}` | 开启作弊模式 |
| `/bazi-persona flow {id}` | 查询时运状态 |
| `/bazi-persona calendar [date]` | 万年历 / 黄历 |
| `/bazi-persona compat {idA} {idB}` | 合盘分析 |
| `/bazi-persona agent enable` | 启用 Agent 同步 |
| `/bazi-persona agent list` | 查看同步状态 |
| `/bazi-persona help` | 查看全部命令 |

---

## Multilingual / 多语言

- 默认 `auto`：跟随用户输入语言自动切换
- 显式设置：`--lang zh` 或 `--lang en`
- 人格风格保持一致，输出语言随用户切换

---

## Project Structure / 目录结构

```text
bazi-persona-skill/
├── SKILL.md                  # Skill 定义文件
├── prompts/                  # Prompt 模板
├── tools/
│   ├── core/                 # 核心逻辑（排盘、人格生成、MBTI）
│   ├── data/                 # 干支 / 生肖 / 十神知识库
│   ├── io/                   # 聊天解析、文本摄入
│   ├── runtime/              # Agent 桥接、版本管理、元数据
│   └── utils/                # 工具函数
├── dist/                     # 编译产物
├── personas/                 # 人格数据目录
│   └── {slug}/
│       ├── SKILL.md          # 该人格的可执行规则（用户主文件）
│       ├── .runtime/         # 结构化数据
│       └── versions/         # 版本快照
├── package.json
└── tsconfig.json
```

---

## Design Principles / 设计原则

- **单文件对外**：用户只需关注 `personas/{slug}/SKILL.md`
- **结构化对内**：`.runtime/` 维护 core / state / evidence / meta / memory
- **自动备份**：每次更新前自动创建版本快照
- **零术语**：面向用户的输出不堆砌八字术语，结论先行
- **纯本地**：所有计算本地完成，不联网、不上传数据

---

## Development / 开发

```bash
npm install
npm run build       # 编译 TypeScript
npm run typecheck   # 类型检查
```

核心依赖：
- `cantian-tymext` — 排盘引擎
- `pinyin-pro` — 中文拼音转换（用于生成 slug）

---

## License

MIT — Cantian AI (参天AI)
