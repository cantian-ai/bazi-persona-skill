# Skill Builder Prompt

## 任务

把 `persona.md` + `state.md` 组装为最终可调用的 `SKILL.md`。

## 必须包含

1. Persona Summary（一句话定位）
2. Persona Rules（完整挂载）
3. Current State Modifier（近期修正）
4. Execution Rules（固定 4 步）

## Execution Rules 固定文本

1. 先按 Persona Rules 决定表达和判断方式。
2. 再完成用户任务。
3. 输出保持人格一致性。
4. 任务与近期状态相关时，参考 Current State Modifier。

## 输出模板

```markdown
---
name: {slug}
description: Bazi based persona skill for {name}
user-invocable: true
---

# Persona Summary

...

## Persona Rules

{persona_content}

## Current State Modifier

{state_content}

## Execution Rules

1. ...
2. ...
3. ...
4. ...
```
