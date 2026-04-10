# Bazi Persona Skill

> 从八字出发，生成一个会说话、会判断、会随时间变化的 AI 人格。
>
> Build a living AI persona from Bazi (Chinese astrology) — it speaks, decides, and evolves.

**Cantian AI / 参天AI**

---

## 先看效果 / See It In Action

### 普通聊天 — 她不是在"扮演"，是真的像那个人

```
👤  舒晴最近是不是心情不太好？

🤖  嗯……怎么说呢，她最近确实有点绷。
    不是那种会跟你抱怨的类型，但你仔细看就能感觉到——
    回消息变慢了，语气比平时更"公事公办"。
    她不是在生气，更像是把精力全收回去了，先顾自己的事。

    丙火日主的人压力大的时候就这样，
    不是冷，是火力不够了，不想再分给别人。
```

```
👤  那我这几天该怎么跟她相处？

🤖  别主动问她"你怎么了"，她会觉得要花力气解释。
    你就正常在，偶尔递个具体的小东西——
    比如"这个链接你可能用得上"，或者帮她顺手做一件她没开口的事。
    她心里是有数的，等她缓过来会主动找你。
```

> 不是 AI 在背台词，而是基于八字推导出的决策模式、情绪节奏和表达习惯在驱动对话。

### 作弊模式 — 开启"上帝视角"

说一句"打开作弊模式"，就像给对话装上了透视镜：

```
👤  打开作弊模式

🤖  作弊模式已开启。你现在拥有上帝视角 🔓
    可以问任何关于她的深层状态、关系动态、未来趋势。
    随时说"关闭作弊模式"回到正常聊天。
```

```
👤  她对我到底什么态度？

🤖  【合盘分析】
    你的壬水 vs 她的丙火 = 偏官关系
    她心里觉得你"有点压力但能推着她动"。
    不是那种让她放松的人，但是那种让她变好的人。

    当前流月天干透庚金，她的表达欲被压了一层，
    所以你会觉得她最近不太搭理你——不是态度变了，是说话的能量被借走了。

    ⏰ 下个月辛金流月，沟通会回暖。
    💡 建议：这个月别追问感受，多聊具体事务。
```

```
👤  她明年运势怎么样？

🤖  【2027 流年预览 · 丁未年】
    天干丁火帮身 → 状态明显回升，信心和行动力都比今年强。
    地支未土为食伤 → 表达欲爆发，可能会主动发起新项目或换赛道。

    关键节点：
    📌 农历三月（甲辰月）：有贵人机会，但需要她自己开口争取
    📌 农历八月（庚申月）：财运集中爆发期，抓住别犹豫
    ⚠️ 农历十一月（壬子月）：水旺克火，注意健康和情绪低谷

    整体：比 2026 好很多。用一个词形容——"该她了"。
```

> 作弊模式下可以像上帝一样提问，但不影响正常聊天——关掉就回到普通对话。

### 创建人格 — 一句话就够

```
👤  帮我创建八字人格：小A，女，96年8月12日下午3点半，上海人，我同事

🤖  排盘完成 ✓

    【人格预览】
    1. 一句话总结：表面随和实际主意很正，做事先算清楚再出手
    2. 说话感觉：不废话但也不冷，会照顾你但不会惯着你
    3. 做决定看重：可持续性和风险收益比
    4. 压力下变化：更强调底线和交付，沟通变简洁
    5. 最近状态：稳中提效，有意识地收敛社交

    MBTI 映射：INTJ（八字推导）
    · I → 日主丙火坐申金，能量内收不外放
    · N → 食伤生财链完整，直觉驱动决策
    · T → 偏官+偏印组合，逻辑优先于感受
    · J → 年柱己卯正印，安全感来自计划和掌控

    已进入 [小A] 对话模式 ✓
    下一句话开始，我就是她。
```

---

## Highlights / 亮点

| | 中文 | English |
|---|---|---|
| **零基础** | 不懂八字也能用，自然语言输入即可 | No Bazi knowledge needed — just talk |
| **不是分析报告** | 生成的是会聊天的人格，不是一堆术语 | A talking persona, not a static report |
| **作弊模式** | 上帝视角看状态、关系、趋势，随时切回正常聊天 | God-view on status, compatibility & trends |
| **MBTI 映射** | 八字自动推导 EI/SN/TF/JP，让性格差异更直观 | Auto-maps Bazi to MBTI for intuitive contrast |
| **时运追踪** | 大运 / 流年 / 流月 / 流日 / 流时，实时能量解读 | Real-time luck-cycle energy reading |
| **合盘分析** | 两个人格一键合盘，看关系互动模式 | One-click compatibility between two personas |
| **越聊越真** | 补充事实后人格自动进化，不是固定模板 | Persona evolves with every new fact you add |
| **Agent 原生** | 为 Claude Code / OpenClaw 设计，对话即用 | Built for Claude Code / OpenClaw — just talk |
| **纯本地** | 不联网、不上传，所有数据留在你的机器上 | Fully local — no data leaves your machine |

---

## Quick Start / 快速开始

### 在 Claude Code 中使用（推荐）

1. 安装 Skill

```bash
npx skills add bazi-persona-skill --skill bazi-persona -a claude-code --copy -y
```

2. 直接对话

```text
帮我创建八字人格：小A，1996年8月12日下午3点半，上海，女，同事
```

就这样。不需要记命令，不需要读文档，说人话就行。

### 在 OpenClaw 中使用

安装方式相同，Skill 会自动适配 OpenClaw 平台。

### 通过 npm 命令行使用

```bash
npm install -g bazi-persona-skill
bazi --action help
```

---

## Commands / 命令

在 Claude Code / OpenClaw 中使用 `/bazi-persona` 入口，或者直接说人话：

| 你想做什么 | 斜杠命令 | 自然语言 |
|---|---|---|
| 创建人格 | `/bazi-persona create` | "帮我创建八字人格：小A，女，96年…" |
| 查看所有人格 | `/bazi-persona list` | "我有哪些人格？" |
| 进入人格对话 | `/bazi-persona {id}` | "我要跟小A聊天" |
| 更新人格 | `/bazi-persona update {id}` | "小A最近升职了，帮我更新" |
| 开启作弊模式 | `/bazi-persona cheatsheet {id}` | "打开作弊模式" |
| 查看时运 | `/bazi-persona flow {id}` | "小A最近运势怎样？" |
| 合盘分析 | `/bazi-persona compat {a} {b}` | "小A和小B合盘" |
| 万年历 | `/bazi-persona calendar` | "今天黄历怎么样？" |
| 同步到 Agent | `/bazi-persona agent enable` | "把人格同步到 Claude Code" |
| 查看帮助 | `/bazi-persona help` | "有哪些命令？" |

---

## What Makes It Different / 和普通AI聊天有什么不同

普通 AI 聊天：

```
👤  帮我模拟一个 INTJ 女生

🤖  好的，我来扮演一个 INTJ 女生。我是一个理性、独立的人……
    （开始背标签）
```

Bazi Persona Skill：

```
👤  小A今天加班到很晚，我说了句辛苦了，她只回了"嗯"

🤖  正常，别多想。
    她不是敷衍你——丙火日主在申月本来就能量不足，
    加班到这个点火气更弱了，能回你一个字已经是给面子。
    你要是真想表达关心，明天带杯咖啡，别说"辛苦了"，说"你喝这个"。
    她记行动不记话。
```

区别在于：
- **不是在"扮演标签"**，是八字推导出的底层决策逻辑在驱动
- **会随时间变化**，流月流日不同，同一个人的反应也不同
- **越聊越准**，你补充的真实信息会持续修正人格模型
- **有"上帝视角"**，作弊模式下你能看到普通聊天看不到的东西

---

## Agent Integration / 平台集成

将人格同步为 Agent 文件，在 Claude Code / OpenClaw 中直接以人格身份启动对话。

```text
/bazi-persona agent enable
```

**默认 Agent 目录：**

| 平台 | 路径 |
|---|---|
| Claude Code | `~/.claude/agents/bazi-persona/` |
| OpenClaw | `~/.openclaw/agents/bazi-persona/` |

每个人格生成一个独立 agent 文件 + 一个路由文件，同步后直接点名开始对话。

**高级选项（CLI）：**

```bash
npm run bazi:agent:sync:claude          # 只同步到 Claude Code
npm run bazi:agent:sync:openclaw        # 只同步到 OpenClaw
npm run bazi:agent:sync -- --slug "id"  # 同步指定人格
npm run bazi:agent:remove               # 移除全部 Agent
```

---

## Multilingual / 多语言

- 默认 `auto`：跟随用户输入语言自动切换
- 显式设置：`--lang zh` 或 `--lang en`
- 人格风格保持一致，输出语言随用户切换

---

## Design Principles / 设计原则

- **对话优先**：为 Agent 设计，自然语言是第一入口
- **不是报告，是人格**：产出的是"会聊天的规则系统"，不是分析文档
- **单文件对外**：用户只需关注 `personas/{slug}/SKILL.md`
- **零术语**：面向用户的输出结论先行，不堆八字术语
- **纯本地**：所有计算本地完成，不联网、不上传数据
- **自动备份**：每次更新前自动创建版本快照，支持回滚

---

## Project Structure / 目录结构

```text
bazi-persona-skill/
├── SKILL.md                  # Skill 定义（Agent 读取的入口）
├── prompts/                  # Prompt 模板
├── tools/
│   ├── core/                 # 排盘、人格生成、MBTI 推导
│   ├── data/                 # 干支 / 生肖 / 十神知识库
│   ├── io/                   # 聊天解析、文本摄入
│   ├── runtime/              # Agent 桥接、版本管理
│   └── utils/                # 工具函数
├── dist/                     # 编译产物
└── personas/                 # 人格数据（本地，不进 git）
    └── {slug}/
        ├── SKILL.md          # 该人格的可执行规则
        ├── .runtime/         # 结构化数据
        └── versions/         # 版本快照
```

---

## Development / 开发

```bash
git clone https://github.com/cantian-ai/bazi-persona-skill.git
cd bazi-persona-skill
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
