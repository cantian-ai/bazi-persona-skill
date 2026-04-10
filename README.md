# 八字人格 Bazi Persona Skill

**不用聊天记录，生日就能生成人格。**

基于生辰八字，生成一个会聊天、会判断、会变化的 AI 人格。  
不用手动写人设，而是从生日出发，直接开始对话、观察和分析。

Bazi Persona Skill is an AI persona generator based on birth date for Claude Code, OpenClaw, and 45+ agent platforms.

[![npm](https://img.shields.io/npm/v/bazi-persona-skill)](https://www.npmjs.com/package/bazi-persona-skill)
[![license](https://img.shields.io/badge/license-MIT-blue)](./LICENSE)

[繁體中文](./README.zh-TW.md) | [English](./README.en.md) | [日本語](./README.ja.md) | [한국어](./README.ko.md)

**参天AI / Cantian AI** &nbsp; · &nbsp; **Claude Code** &nbsp; · &nbsp; **OpenClaw** &nbsp; · &nbsp; **45+ Agent 平台**

## 功能亮点 Highlights

### 1. 只要生日就能开始

大多数人格工具需要聊天记录、背景资料或手动设定。  
八字人格 Skill 只要名字和生日，就能直接生成一个初始人格。

### 2. 不是写人设，而是生成人格

你不用先想好这个人怎么说话、怎么思考、怎么做决定。  
系统会根据出生信息自动生成一个可聊天、可观察、可分析的人格。

### 3. 不只是静态标签，也是“活”的人格

它不只是“理性”“敏感”“慢热”这样的描述。通过八字大运流年等时间的变化，你可以也能看到人格再跟随着能量节律变动。

### 4. 聊天模式和上帝视角都能用

平时它就是那个人。  
打开作弊模式后，又可以从八字和流年角度深度分析状态、趋势和关系互动。

### 5. 越聊越真

你补充的真实信息会持续更新人格模型。  
它不是固定模板，而是会不断变得更完整、更贴近现实。

### 6. 纯本地运行

不联网，不上传，所有数据都保留在本地环境中。  
适合重视隐私、可控性和 Agent 工作流的使用场景。

---

## 快速开始 Quick Start

### 1）安装 Install

在任意 AI Agent 对话框里粘贴这句话：

> 帮我执行 `npx skills add cantian-ai/bazi-persona-skill --all` 安装八字人格技能

或者你自己在终端执行：

```bash
npx skills add cantian-ai/bazi-persona-skill
```

### 2）创建第一个人格 Create

回到对话框，直接说：

```text
帮我创建八字人格：小A，女，1996年8月12日下午3点半，上海人，我同事
```

### 3）开始使用 Use

创建完成后，你可以直接聊天：

```text
你最近工作忙吗？
```

也可以直接进入深度分析：

```text
打开作弊模式
```
惊喜等着你！

---

## 先看效果 Examples

### 示例 1：一句话创建人格

```text
👤 帮我创建八字人格：小A，女，1996年8月12日下午3点半，上海人，我同事

🤖 排盘完成 ✓

【人格简况】
1. 一句话总结：表面随和，实际主意很正，做事先算清楚再出手
2. 说话感觉：不废话，但也不冷
3. 做决定看重：可持续性和风险收益比
4. 压力下变化：更强调底线和交付，沟通变简洁
5. 最近状态：稳中提效，有意识地收敛社交

已进入 [小A] 对话模式 ✓
下一句话开始，我就是她。
```

### 示例 2：和人格聊天

同样的问题，不同八字的人格，回应会完全不同。

**内敛型人格**

```text
👤 你最近是不是心情不太好？

🤖 没有啊，就是最近事比较多。
怎么了？
```

**外放型人格**

```text
👤 你最近是不是心情不太好？

🤖 啊被你看出来了？
最近真的烦死了，工作上一堆破事。
你中午有空吗，出来吃饭我跟你好好吐槽一下。
```

这不是 AI 在背标签。  
是八字推导出的人格逻辑、情绪节奏和表达习惯在驱动回应。

### 示例 3：打开作弊模式

```text
👤 打开作弊模式

🤖 作弊模式已开启 ✓
现在可以从八字和流年角度深度提问。
随时说“关闭作弊模式”回到正常聊天。
```

```text
👤 你今天开心吗？

🤖 【今日状态】
今天不算开心，也不是不开心，是有点躁。

行动力是有的，但容易急。
社交状态不错，但不适合临场做决定。
如果你要找我聊事情，上午更合适，下午我耐心会差一些。
```

### 示例 4：补充真实信息，人物会更新

```text
👤 小A最近升职了，当上了小组长

🤖 已更新 ✓

联动分析：
她拿到管理权后，会先建规则再带人。
团队磨合期会显得有点严，但这是她建立秩序的方式。
```

---

## 你可以拿它做什么 Use cases

1. 创建一个可聊天的人格  
2. 模拟前任、同事、朋友、伴侣、名人等不同对象  
3. 观察一个人格在不同问题下的反应方式  
4. 分析关系互动、沟通方式和阶段状态  
5. 作为 Claude Code、OpenClaw 和其他 Agent 平台中的人格生成能力使用

---

## 它和普通 Persona 工具有什么不同 Compare with normal persona tools

| 普通 Persona 工具 | 八字人格 Bazi Persona Skill |
|---|---|
| 需要聊天记录、背景资料或手动设定 | 只要名字和生日就能开始 |
| 更像在扮演标签 | 更像在生成一个有底层逻辑的人 |
| 人格通常偏静态 | 会结合时间和新信息持续变化 |
| 更适合普通对话 | 既能聊天，也能做深度剖析 |
| 常常需要云端处理 | 支持纯本地运行 |

---

## 命令速查 Commands

在 Claude Code / OpenClaw 中可以使用 `/bazi-persona`，也可以直接说人话。

| 你想做什么 | 命令 | 自然语言 |
|---|---|---|
| 创建人格 | `/bazi-persona create` | 帮我创建八字人格：小A，女，1996年…… |
| 查看所有人格 | `/bazi-persona list` | 我有哪些人格？ |
| 进入对话 | `/bazi-persona {id}` | 我要跟小A聊天 |
| 补充信息 | `/bazi-persona update {id}` | 小A最近升职了，帮我更新 |
| 打开作弊模式 | `/bazi-persona cheatsheet {id}` | 打开作弊模式 |
| 时运查询 | `/bazi-persona flow {id}` | 小A最近状态怎样？ |
| 合盘分析 | `/bazi-persona compat {a} {b}` | 小A和小B合盘 |
| 万年历 | `/bazi-persona calendar` | 今天黄历怎么样？ |
| 同步 Agent | `/bazi-persona agent enable` | 把人格同步到 Claude Code |
| 帮助 | `/bazi-persona help` | 有哪些命令？ |

支持中英双语，默认跟随输入语言，也可以用 `--lang zh` 或 `--lang en` 切换。

---

## Agent 集成 Agent Integration

创建好的人格可以同步为 Agent 文件。  
同步后，不用每次都进 Skill，直接在平台里点名就能开始对话。

### 同步人格到平台

```text
把我的人格同步到 Claude Code
```

或使用命令：

```text
/bazi-persona agent enable
```

系统会自动把所有已创建的人格写入 Agent 目录：

| 平台 | Agent 目录 |
|---|---|
| Claude Code | `~/.claude/agents/bazi-persona/` |
| OpenClaw | `~/.openclaw/agents/bazi-persona/` |

### 同步后怎么用

```text
👤 小A

🤖 我在。怎么了？
```

```text
👤 切换到小B

🤖 来了，有什么事？
```

### 重新同步

当你创建了新人格，或者更新了已有人格后，重新同步一次即可：

```text
帮我重新同步人格到 Agent
```

或删除所有已同步的 Agent：

```text
/bazi-persona agent remove
```

---

## 其他安装方式 Other install options

```bash
npm install -g bazi-persona-skill
bazi --action help
```

---

## 关于我们 About Cantian AI

参天AI致力于把传统东方智慧和 AI 做更深入的结合，从八字出发，打造更懂你的 AI。  
网站：https://cantian.ai

关联项目：

1. [OpenClaw Skills](https://clawhub.ai/tianlinle/cantian-bazi)
2. [Bazi MCP](https://github.com/cantian-ai/bazi-mcp)
3. [GPTs - Chinese Bazi Fortune Teller](https://chatgpt.com/g/g-67c3f7b74d148191a2167f44fd13412d-chinese-bazi-fortune-teller-can-tian-ba-zi-suan-ming-jing-zhun-pai-pan-jie-du)
4. [iOS App - 参天AI](https://apps.apple.com/app/id6746296534)

---

## 联系我们 Contact

邮箱：[support@cantian.ai](mailto:support@cantian.ai)

微信：

<img src="https://github.com/user-attachments/assets/7790b64e-e03f-47e2-b824-38459549a6d8" alt="WeChat QR Code" width="200"/>

---

## License

MIT © [Cantian AI 参天AI](https://github.com/cantian-ai)

---

## About Bazi Persona Skill

八字人格 Skill 是一个基于出生信息的人格生成工具，也是一个适用于 Claude Code、OpenClaw 和多种 Agent 平台的 AI Persona Skill。

你只需要提供名字和生日，就能创建一个可持续互动的 AI 人格。  
它不是静态设定卡，也不只是几句标签描述。  
你可以直接和它聊天，看到它的表达方式、判断倾向、关系反应和状态变化。

如果你在找这些关键词，这个项目就是对应的方向：

- 八字人格
- Bazi Persona
- AI Persona
- Persona Generator
- Birthday Based Persona
- Dynamic Persona
- Claude Code Skill
- OpenClaw Skill
