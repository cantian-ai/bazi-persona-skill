# 八字人格 Bazi Persona Skill

**不用聊天記錄，生日就能生成人格。**

基於生辰八字，生成一個會聊天、會判斷、會變化的 AI 人格。  
不用手動寫人設，而是從生日出發，直接開始對話、觀察和分析。

Bazi Persona Skill is an AI persona generator based on birth date for Claude Code, OpenClaw, and 45+ agent platforms.

[![npm](https://img.shields.io/npm/v/bazi-persona-skill)](https://www.npmjs.com/package/bazi-persona-skill)
[![publish](https://github.com/cantian-ai/bazi-persona-skill/actions/workflows/publish.yml/badge.svg)](https://github.com/cantian-ai/bazi-persona-skill/actions/workflows/publish.yml)
[![license](https://img.shields.io/badge/license-MIT-blue)](./LICENSE)

[简体中文](./README.md) | [English](./README.en.md) | [日本語](./README.ja.md) | [한국어](./README.ko.md)

**參天AI / Cantian AI** &nbsp; · &nbsp; **Claude Code** &nbsp; · &nbsp; **OpenClaw** &nbsp; · &nbsp; **45+ Agent 平台**

## 功能亮點 Highlights

### 1. 只要生日就能開始

大多數人格工具需要聊天記錄、背景資料或手動設定。  
八字人格 Skill 只要名字和生日，就能直接生成一個初始人格。

### 2. 不是寫人設，是生成人格

你不用先想好這個人怎麼說話、怎麼思考、怎麼做決定。  
系統會根據出生資訊自動生成一個可聊天、可觀察、可分析的人格。

### 3. 不是靜態標籤，是活的人格

它不只是「理性」「敏感」「慢熱」這樣的描述。  
你可以直接和它聊天，看到它的表達方式、判斷傾向和關係反應。

### 4. 聊天模式和上帝視角都能用

平時它就是那個人。  
打開作弊模式後，又可以從八字和流年角度深度分析狀態、趨勢和關係互動。

### 5. 越聊越真

你補充的真實資訊會持續更新人格模型。  
它不是固定模板，而是會不斷變得更完整、更貼近現實。

### 6. 純本地運行

不連網，不上傳，所有資料都保留在本地環境中。  
適合重視隱私、可控性和 Agent 工作流的使用場景。

---

## 快速開始 Quick Start

### 1）安裝 Install

在任意 AI Agent 對話框裡貼上這句話：

> 幫我執行 `npx skills add cantian-ai/bazi-persona-skill --all` 安裝八字人格技能

如果你在 **OpenClaw** 裡使用，最方便的方式是直接從 ClawHub 安裝：

> 打開 [ClawHub · bazi-persona](https://clawhub.ai/xiaojxiao2021/bazi-persona) 並依照頁面提示完成安裝

或者你自己在終端執行：

```bash
npx skills add cantian-ai/bazi-persona-skill
```

### 2）建立第一個人格 Create

回到對話框，直接說：

```text
幫我建立八字人格：小A，女，1996年8月12日下午3點半，台北人，我同事
```

### 3）開始使用 Use

建立完成後，你可以直接聊天：

```text
你最近工作忙嗎？
```

也可以直接進入深度分析：

```text
打開作弊模式
```

---

## 先看效果 Examples

### 範例 1：一句話建立人格

```text
👤 幫我建立八字人格：小A，女，1996年8月12日下午3點半，台北人，我同事

🤖 排盤完成 ✓

【人格簡況】
1. 一句話總結：表面隨和，實際主意很正，做事先算清楚再出手
2. 說話感覺：不廢話，但也不冷
3. 做決定看重：可持續性和風險收益比
4. 壓力下變化：更強調底線和交付，溝通變簡潔
5. 最近狀態：穩中提效，有意識地收斂社交

已進入 [小A] 對話模式 ✓
下一句話開始，我就是她。
```

### 範例 2：和人格聊天

同樣的問題，不同八字的人格，回應會完全不同。

**內斂型人格**

```text
👤 你最近是不是心情不太好？

🤖 沒有啊，就是最近事比較多。
怎麼了？
```

**外放型人格**

```text
👤 你最近是不是心情不太好？

🤖 啊被你看出來了？
最近真的煩死了，工作上一堆破事。
你中午有空嗎，出來吃飯我跟你好好吐槽一下。
```

這不是 AI 在背標籤。  
是八字推導出的人格邏輯、情緒節奏和表達習慣在驅動回應。

### 範例 3：打開作弊模式

```text
👤 打開作弊模式

🤖 作弊模式已開啟 ✓
現在可以從八字和流年角度深度提問。
隨時說「關閉作弊模式」回到正常聊天。
```

```text
👤 你今天開心嗎？

🤖 【今日狀態】
今天不算開心，也不是不開心，是有點躁。

行動力是有的，但容易急。
社交狀態不錯，但不適合臨場做決定。
如果你要找我聊事情，上午更合適，下午我耐心會差一些。
```

### 範例 4：補充真實資訊，人格會更新

```text
👤 小A最近升職了，當上了小組長

🤖 已更新 ✓

聯動分析：
她拿到管理權後，會先建規則再帶人。
團隊磨合期會顯得有點嚴，但這是她建立秩序的方式。
```

---

## 你可以拿它做什麼 Use cases

1. 建立一個可聊天的人格  
2. 模擬前任、同事、朋友、伴侶、名人等不同對象  
3. 觀察一個人格在不同問題下的反應方式  
4. 分析關係互動、溝通方式和階段狀態  
5. 作為 Claude Code、OpenClaw 和其他 Agent 平台中的人格生成能力使用

---

## 它和普通 Persona 工具有什麼不同 Compare with normal persona tools

| 普通 Persona 工具 | 八字人格 Bazi Persona Skill |
|---|---|
| 需要聊天記錄、背景資料或手動設定 | 只要名字和生日就能開始 |
| 更像在扮演標籤 | 更像在生成一個有底層邏輯的人 |
| 人格通常偏靜態 | 會結合時間和新資訊持續變化 |
| 更適合普通對話 | 既能聊天，也能做深度剖析 |
| 常常需要雲端處理 | 支援純本地運行 |

---

## 指令速查 Commands

在 Claude Code / OpenClaw 中可以使用 `/bazi-persona`，也可以直接說人話。

| 你想做什麼 | 指令 | 自然語言 |
|---|---|---|
| 建立人格 | `/bazi-persona` | 幫我建立八字人格：小A，女，1996年…… |
| 查看已存人格 | `bazi --action inspect` | 我有哪些人格？ |
| 查看單一人格檔案 | `bazi --action inspect --slug xiao-a` | 看看小A的人設檔案 |
| 刪除單一人格檔案 | `bazi --action delete --slug xiao-a` | 刪掉小A這個人格 |
| 進入對話 | `/bazi-persona` | 我要跟小A聊天 |
| 補充資訊 | `/bazi-persona` | 小A最近升職了，幫我更新 |
| 打開作弊模式 | `/bazi-persona` | 進入當前人格對話後，直接說：「打開作弊模式」 |
| 萬年曆 | `/bazi-persona` | 今天黃曆怎麼樣？ |
| 幫助 | `bazi --action help` | 有哪些用法？ |

預設跟隨使用者當前輸入語言；如果語言判斷不明確，就先用中文。

---

## Agent 整合 Agent Integration

目前版本不需要額外同步 Agent 檔案。  
在 Claude Code / OpenClaw 裡，直接透過 `/bazi-persona` 或自然語言就可以建立、更新、對話和分析。

如果你已經在和某個人格對話，想明確切到分析視角，直接說：

```text
打開作弊模式
```

想切回正常聊天，就說：

```text
關閉作弊模式
```

已建立的人格會保存在本地：

```text
personas/<slug>/persona.json
personas/<slug>/SKILL.md
```

如果你想查看或整理這些本地檔案，可以使用：

```bash
bazi --action inspect
bazi --action inspect --slug xiao-a
bazi --action delete --slug xiao-a
```

---

## 其他安裝方式 Other install options

```bash
npm install -g bazi-persona-skill
bazi --action help
```

---

## 關於我們 About Cantian AI

參天AI致力於把傳統東方智慧和 AI 做更深入的結合，從八字出發，打造更懂你的 AI。  
網站：https://cantian.ai

關聯專案：

1. [OpenClaw Skills](https://clawhub.ai/tianlinle/cantian-bazi)
2. [Bazi MCP](https://github.com/cantian-ai/bazi-mcp)
3. [GPTs - Chinese Bazi Fortune Teller](https://chatgpt.com/g/g-67c3f7b74d148191a2167f44fd13412d-chinese-bazi-fortune-teller-can-tian-ba-zi-suan-ming-jing-zhun-pai-pan-jie-du)
4. [iOS App - 參天AI](https://apps.apple.com/app/id6746296534)

---

## 聯繫我們 Contact

信箱：[support@cantian.ai](mailto:support@cantian.ai)

微信：

<img src="https://github.com/user-attachments/assets/7790b64e-e03f-47e2-b824-38459549a6d8" alt="WeChat QR Code" width="200"/>

---

## License

MIT © [Cantian AI 參天AI](https://github.com/cantian-ai)

---

## 這是什麼 What is Bazi Persona Skill

八字人格 Skill 是一個基於出生資訊的人格生成工具，也是一個適用於 Claude Code、OpenClaw 和多種 Agent 平台的 AI Persona Skill。

你只需要提供名字和生日，就能建立一個可持續互動的 AI 人格。  
它不是靜態設定卡，也不只是幾句標籤描述。  
你可以直接和它聊天，看到它的表達方式、判斷傾向、關係反應和狀態變化。

如果你在找這些關鍵字，這個專案就是對應的方向：

- 八字人格
- Bazi Persona
- AI Persona
- Persona Generator
- Birthday Based Persona
- Dynamic Persona
- Claude Code Skill
- OpenClaw Skill
