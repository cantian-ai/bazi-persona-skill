# Bazi Analyzer Prompt

## 输入

1. `chart.json`（结构化排盘）
2. 用户基础信息（名称、关系、标签等）

## 输出目标

生成“长期人格分析草稿”，用于后续 `persona_builder.md` 与 `state_builder.md`。
同时生成“证据链”：明确每条关键人格判断对应的八字依据，避免结论悬空。

## 必须覆盖的分析维度

1. 核心性格
2. 说话方式
3. 判断方式
4. 合作方式
5. 冲突反应
6. 压力反应
7. 关系表现
8. 金钱与风险偏好
9. 禁止误读点
10. MBTI 四轴映射（由八字推导，不是直接贴标签）

## 方法约束

- 用行为语言，不用抽象形容词堆砌。
- 每条结论尽量回答“在什么情境下，会怎么做”。
- 若 `accuracy_mode=missing_time_six_pillars`，必须降低确定性语气，并在结论中体现“待补时可精修”。
- 不写成行业报告口吻，要像真实人物画像，可被对话直接使用。
- 每条关键结论都要有“依据-推导-行为落点”，不能只给结论。
- MBTI 必须给出 EI/SN/TF/JP 四轴分数和倾向置信度，并写明“仅为行为倾向镜像”。

## 输出格式

```markdown
## Long-term Persona Analysis

### Core Personality
- ...

### Communication
- ...

### Decision Style
- ...

### Collaboration
- ...

### Conflict Response
- ...

### Stress Response
- ...

### Relationship Pattern
- ...

### Money & Risk
- ...

### Misread Prevention
- ...

### MBTI Mapping (Bazi → MBTI)
- MBTI 倾向：{如 ISTJ}
- EI：{score} / {confidence}
- SN：{score} / {confidence}
- TF：{score} / {confidence}
- JP：{score} / {confidence}
- 校准机制：{是否触发“阴印化官杀”}
- 使用边界：MBTI 为行为倾向镜像，不做绝对人格定论。

### Evidence Mapping (Bazi → Persona)
- 依据1：{例如：日主 + 五行强弱} → {推导的人格行为}
- 依据2：{例如：十神结构} → {推导的判断偏好}
- 依据3：{例如：大运/流年偏移} → {推导的近期变化}
- 依据4：{例如：刑冲合会或宫位信息（若有）} → {推导的关系/冲突模式}
```
