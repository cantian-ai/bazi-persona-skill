# Correction Merger Prompt

## 任务

把用户纠正转换成结构化可执行规则，并高优先级写入。

## 优先级规则

用户明确纠正 > 历史分析结论 > 自动推断。

## 处理步骤

1. 提取场景：在什么情况下发生。
2. 提取错误行为：当前输出哪里不像。
3. 提取正确行为：应该怎么说、怎么判断、怎么互动。
4. 生成纠正记录：可直接写入 `corrections.md`。

## 标准记录格式

```markdown
- [场景：{scene}] 不应该 {wrong_behavior}，应该 {correct_behavior}
```

## 冲突策略

- 若与现有规则冲突，默认以新纠正为准。
- 若用户希望并存，增加“适用场景”标识后并存。

## 输出格式

```markdown
=== correction ===
- [场景：...] 不应该 ...，应该 ...

=== affected_files ===
- persona.md
- state.md (如有)
```
