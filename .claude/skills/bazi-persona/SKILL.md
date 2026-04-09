---
name: bazi-persona
description: "Bazi persona toolkit. Create, update, list, rollback, and delete personas via /create-bazi-persona, /update-bazi-persona, /list-bazi-personas, /bazi-persona-rollback, /delete-bazi-persona (aliases: /create-bazi, /update-bazi, /list-bazi, /rollback-bazi, /delete-bazi)."
argument-hint: "[slug]"
version: "1.0.0"
user-invocable: true
allowed-tools: Read, Write, Edit, Bash
---

# 八字人格.skill 创建器

## 对用户可见/不可见规则（最高优先级）

1. 用户可以自然表达出生信息，不要求固定模板输入。
2. 你负责把自然语言时间自动标准化为内部格式，必要时仅做一次轻量澄清。
3. 你绝不向用户展示内部脚本名、命令、文件路径、工具调用细节。
4. 用户看到的应是自然对话与结果，不是工程执行过程。
5. 任何“正在处理”提示都要简洁，禁止技术术语堆砌。
6. 创建流程尽量用单次本地命令完成，避免让用户反复授权。

## 触发命令

主命令：

- `/create-bazi-persona`
- `/update-bazi-persona {slug}`
- `/list-bazi-personas`
- `/bazi-persona-rollback {slug} {version}`
- `/delete-bazi-persona {slug}`

友好别名：

- `/create-bazi`
- `/update-bazi`
- `/list-bazi`
- `/rollback-bazi`
- `/delete-bazi`

规则：对外提示展示“主命令 + 别名”，但日志与元信息只记录主命令。

## 体验标准（执行中必须遵守）

1. 首次创建只收集基础 5 项：名称、出生日期、出生时间（可缺失）、出生地点、性别。
   用户可自然输入，你负责解析与标准化，不要求对方按固定模板填写。
2. 先给一条“一句话可复制示例”，让用户直接改内容提交。
3. 若用户未提供“与该人物关系”，必须补问一次（同事/老板/伴侣/朋友/家人/自己/名人/无关系）。
4. 同一轮消息只做一个动作，不混合多个选择题。
5. 可选增强资料必须后置到创建成功后。
6. 每次关键写入前先给 5 行短预览卡，再确认。
7. 删除与回滚必须双确认。
8. 错误提示统一结构：原因 → 怎么改 → 示例输入。

## 主流程：创建人格

### Step 1：采集基础信息

参考 `prompts/intake.md`，优先一次收齐：

- 名称或代号（必填）
- 出生日期（必填）
- 出生时间（可缺失，缺失时走精简版）
- 出生地点（必填）
- 性别（必填）
- 与该人物关系（建议必问一次，允许“无关系/名人”）

### Step 2：生成排盘结构

你可以在内部执行排盘计算与标准化，但这些步骤不向用户外显。
用户只需要看到“已完成排盘”与“精度说明（如缺时）”。
优先使用单入口流程，不要把排盘和写入拆成多条命令反复执行。

缺失出生时间时（必须对用户明确）：

- 内部默认 `12:00` 计算
- 输出去时柱化（删除时柱和时柱相关刑冲合会）
- 在结果中标记 `accuracy_mode=missing_time_six_pillars`

### Step 3：构建人格与状态

1. 用 `prompts/bazi_analyzer.md` 生成长期人格分析草稿。
2. 用 `prompts/persona_builder.md` 生成 `persona.md`。
3. 用 `prompts/state_builder.md` 生成 `state.md`。

### Step 4：预览并确认

写入前输出固定五行预览卡：

1. 一句话人格总结
2. 说话给人的感觉
3. 做决定时最看重什么
4. 压力下最明显变化
5. 最近更像什么状态

然后给出确认语义：`确认写入` / `我想调整`。
在命令行交互中，默认回车继续；同时支持 `↑↓`、`1/2` 或 `y/n` 快捷选择。

### Step 5：落盘

内部写入人格目录，完成后只向用户反馈：

- 创建成功
- 触发词
- 如何补充资料继续增强

## 更新流程

### 增量资料更新

1. 先读取已有 `persona.md`、`state.md`、`chart.json`、`corrections.md`。
2. 用 `prompts/material_merger.md` 合并聊天/文本增量。
3. 内部执行更新并重建最终人格 Skill。

更新前自动备份版本。

### 用户纠正更新

1. 用 `prompts/correction_merger.md` 把纠正转为结构化记录。
2. 内部执行更新并即时生效。

规则：用户明确纠正优先级最高。

## 管理命令

当用户触发管理命令时，内部调用工具完成，并仅返回结果摘要：

- 列表：slug / 名称 / 版本 / 创建时间 / 更新时间 / 资料来源数量
- 回滚：回滚目标版本 + 回滚前快照版本
- 删除：双确认后删除成功提示

## 边界

1. 本 Skill 产出的是“可执行的人格规则系统”，不是绝对命运结论。
2. 缺时模式会降低精度，必须明确提示可补时重算。
3. 纠正信息应保留原意，不得擅自弱化。
4. 任何更新都必须先备份，保证可回滚。
