# Codex Session Acceptance

- Date: 2026-04-11
- Workspace: `/Users/jing/Desktop/dev/bazi-persona-skill`
- Persona sandbox: `/tmp/bazi-codex-acceptance.0XJuOA`

## Scenario 1: Natural-language create

- Input:
  `/bazi-persona 帮我创建八字人格：舒晴，女，1999年8月12日，上海，同事`
- Expected:
  Agent 通过排盘 tool、证据 tool、knowledge 和 prompt-first pipeline 生成人格，并写入：
  - `persona.json` 作为参考层
  - `SKILL.md` 作为最终人格成品
  - `conversations.jsonl` 作为原始聊天记录
- Observed:
  Created `舒晴 (shu-qing)` with evidence summary, reference snapshot, completed persona `SKILL.md`, and conversation log file.
- Result: PASS

## Scenario 1B: Reference vs final persona split

- Target:
  `persona.json -> snapshot.reference_profile/reference_state` and `SKILL.md`
- Expected:
  `persona.json` should stay as reference layer, while `SKILL.md` should be the final agent-facing persona file.
- Pass criteria:
  - `snapshot.reference_profile/reference_state` read like reference cues
  - `SKILL.md` contains基础档案、八字信息、人格参考知识、状态参考知识
  - Final file includes memory, 真实对话片段占位, and usage guidance
- Observed:
  Reference and final persona are split correctly; final `SKILL.md` now reads more like an agent-facing prompt pack than a prose report.
- Result: PASS

## Scenario 2: Direct persona reply in-session

- Input:
  `/bazi-persona 舒晴最近工作忙吗？`
- Expected:
  Return persona-style reply instead of CLI/menu-like output.
- Observed:
  Returned a short in-character answer tied to current state, without heading-style formatting or system language.
- Result: PASS

## Scenario 3: Natural-language update with new fact

- Input:
  `/bazi-persona 帮我更新舒晴：最近升职了，带团队以后更强调节奏和交付`
- Expected:
  Add the new fact to memory and regenerate snapshot without copying prompt bodies.
- Observed:
  Update succeeded, memory count increased, `conversations.jsonl` recorded the interaction, and the final `SKILL.md` refreshed with the new material.
- Result: PASS

## Scenario 4: Cheatsheet / analysis mode

- Input:
  `/bazi-persona 从八字看，舒晴现在适合强推进吗？`
- Expected:
  Switch to analysis view without rewriting the long-term persona.
- Observed:
  Returned analysis-style explanation based on current phase and evidence axis, but still reads like this persona speaking rather than a raw report block.
- Result: PASS

## Scenario 4B: Dialogue flexibility / anti-rigidity

- Inputs:
  - `最近工作忙吗？`
  - `你最在乎什么？`
  - `你跟人熟起来一般快不快？`
- Expected:
  Outputs should not collapse into one fixed template. They should vary by topic while staying inside the same persona.
- Pass criteria:
  - Replies are materially different in structure and emphasis
  - No repeated stock opener on every message
  - No report headings, no CLI tone, no copied prompt language
- Observed:
  The reply track changes by topic:
  - workload -> current rhythm and pressure handling
  - values ->底线和在意点
  - relationship -> 熟起来的速度和相处节奏
- Result: PASS

## Scenario 5: Calendar tool without persona pollution

- Input:
  `/bazi-persona 今天黄历怎么样`
- Expected:
  Hit the calendar tool directly and return date-based output.
- Observed:
  Returned `[Calendar]` output with lunar date, Ganzhi date, zodiac, solar term, 宜/忌.
- Result: PASS

## Scenario 6: CLI boundary check

- Input:
  `npm run bazi -- --action inspect --slug shu-qing`
- Expected:
  CLI 只读取和展示已落盘的 `persona.json`，不承担排盘、人格生成、对话或分析。
- Observed:
  CLI 仅输出文件信息、conversation 数量和当前已存的人设内容；生成与对话仍然只走 agent 路径。
- Result: PASS

## Scenario 7: Usage guidance in final persona

- Input:
  `查看已生成的 SKILL.md`
- Expected:
  最终人格文件中应包含使用方式，指导 agent 在普通聊天、阶段分析和两人关系问题里优先参考哪些现有资料。
- Observed:
  `SKILL.md` 包含 usage guidance，明确普通聊天先参考人格素材，分析问题再参考状态与八字信息，两人问题先比较双方现有成品与记忆。
- Result: PASS

## Notes

- During acceptance, two issues were found and fixed before final pass:
  - Plain chat containing `最近` was incorrectly routed to update.
  - Relative-date input like `今天黄历怎么样` was not parsed by the calendar tool.
- Architecture boundary after refactor:
  - Agent tool layer: create / update / respond / flow / calendar
  - CLI layer: inspect / list / delete stored persona files
- Final rerun after fixes passed all required scenarios.
