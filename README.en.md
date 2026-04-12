# Bazi Persona Skill

**No chat history needed. Just a birthday.**

Generate an AI persona from a birth date — one that talks, makes decisions, and evolves over time.  
No manual character sheets. Start from a birthday, then chat, observe, and analyze.

Bazi Persona Skill is an AI persona generator based on birth date for Claude Code, OpenClaw, and 45+ agent platforms.

[![npm](https://img.shields.io/npm/v/bazi-persona-skill)](https://www.npmjs.com/package/bazi-persona-skill)
[![publish](https://github.com/cantian-ai/bazi-persona-skill/actions/workflows/publish.yml/badge.svg)](https://github.com/cantian-ai/bazi-persona-skill/actions/workflows/publish.yml)
[![license](https://img.shields.io/badge/license-MIT-blue)](./LICENSE)

[简体中文](./README.md) | [繁體中文](./README.zh-TW.md) | [日本語](./README.ja.md) | [한국어](./README.ko.md)

**Cantian AI** &nbsp; · &nbsp; **Claude Code** &nbsp; · &nbsp; **OpenClaw** &nbsp; · &nbsp; **45+ Agent Platforms**

## Highlights

### 1. Just a birthday to get started

Most persona tools need chat logs, background docs, or manual setup.  
Bazi Persona Skill only needs a name and a birthday to generate a working persona.

### 2. Generated, not scripted

You don't need to decide how the person talks, thinks, or makes decisions.  
The system generates a persona you can chat with, observe, and analyze — all from birth data.

### 3. Not static labels — a living persona

It's not just "rational," "sensitive," or "slow to warm up."  
You can talk to it directly and see how it expresses itself, makes judgments, and reacts in relationships.

### 4. Chat mode and god mode

In normal mode, it *is* that person.  
Turn on cheat mode, and it switches to deep analysis — state, trends, and relationship dynamics from Bazi and time cycles.

### 5. Gets more real over time

Every real-world detail you add updates the persona model.  
It's not a fixed template — it keeps getting more complete and closer to reality.

### 6. Runs locally

No internet, no uploads. All data stays in your local environment.  
Built for privacy, control, and Agent workflows.

---

## Quick Start

### 1) Install

Paste this in any AI Agent chat:

```bash
Run `npx skills add cantian-ai/bazi-persona-skill --all` to install the Bazi persona skill
```

If you use **OpenClaw**, the recommended path is the native OpenClaw installer:

```bash
openclaw skills install bazi-persona
```

ClawHub page:
https://clawhub.ai/xiaojxiao2021/bazi-persona

Or run it yourself in the terminal:

```bash
npx skills add cantian-ai/bazi-persona-skill
```

### 2) Create your first persona

Go back to the chat and say:

```text
Create a Bazi persona: Amy, female, born Aug 12 1996 at 3:30pm, New York, my coworker
```

### 3) Start using it

Chat with the persona directly:

```text
How's work been lately?
```

Or jump into deep analysis:

```text
Turn on cheat mode
```

---

## Examples

### Example 1: Create a persona in one sentence

```text
👤 Create a Bazi persona: Amy, female, born Aug 12 1996 at 3:30pm, New York, my coworker

🤖 Chart complete ✓

[Persona Summary]
1. In a nutshell: Easygoing on the surface, but has strong opinions. Thinks it through before acting.
2. Communication style: No fluff, but not cold either.
3. Decision priority: Sustainability and risk-reward ratio.
4. Under pressure: Doubles down on boundaries and delivery, talks less.
5. Current state: Optimizing steadily, consciously pulling back on socializing.

Now in [Amy] conversation mode ✓
From the next message, I am her.
```

### Example 2: Chat with the persona

Same question, completely different responses depending on the birth chart.

**Reserved type**

```text
👤 Have you been in a bad mood lately?

🤖 No, just been busy.
Why do you ask?
```

**Expressive type**

```text
👤 Have you been in a bad mood lately?

🤖 Oh you noticed??
I'm so annoyed, work has been a total mess.
You free for lunch? I need to vent.
```

The AI isn't reading from a script.  
It's the decision patterns, emotional rhythms, and communication style derived from Bazi driving every response.

### Example 3: Cheat mode

```text
👤 Turn on cheat mode

🤖 Cheat mode ON ✓
You can now ask deep questions from a Bazi and time-cycle perspective.
Say "turn off cheat mode" to go back to normal chat.
```

```text
👤 Are you happy today?

🤖 [Today's State]
Not really happy, not unhappy either — more like restless.

I've got energy but I'm impulsive.
Social vibes are good, but not the time to make snap decisions.
If you need to talk to me, morning is better. Afternoon I'll have less patience.
```

### Example 4: Add real info — the persona evolves

```text
👤 Amy just got promoted to team lead

🤖 Updated ✓

Cross-analysis:
Once she has management authority, she'll set up rules first, then lead people.
She'll seem strict during the team adjustment period, but that's how she establishes order.
```

---

## Use Cases

1. Create a persona you can actually talk to  
2. Simulate an ex, a coworker, a friend, a partner, a celebrity  
3. See how a persona reacts to different questions and situations  
4. Analyze relationship dynamics, communication patterns, and current state  
5. Use it as a persona generation capability in Claude Code, OpenClaw, and other Agent platforms

---

## How is this different from regular persona tools?

| Regular Persona Tools | Bazi Persona Skill |
|---|---|
| Need chat logs, background docs, or manual setup | Just a name and birthday |
| More like acting out labels | More like generating a person with underlying logic |
| Persona is usually static | Evolves with time and new information |
| Better for casual chat | Can chat *and* do deep analysis |
| Often requires cloud processing | Runs fully local |

---

## Commands

Use `/bazi-persona` in Claude Code / OpenClaw, or just talk naturally.

| What you want | Command | Natural language |
|---|---|---|
| Create persona | `/bazi-persona` | "Create a Bazi persona: Amy, female, 1996..." |
| List stored personas | `npm run bazi -- --action inspect` | "What personas do I have?" |
| Inspect one local persona file | `npm run bazi -- --action inspect --slug amy` | "Show me Amy's persona file" |
| Delete one local persona file | `npm run bazi -- --action delete --slug amy` | "Delete Amy's persona" |
| Start chatting | `/bazi-persona` | "I want to talk to Amy" |
| Add info | `/bazi-persona` | "Amy got promoted, update her" |
| Turn on cheat mode | `/bazi-persona` | "While talking to Amy, just say: Turn on cheat mode" |
| Calendar | `/bazi-persona` | "What does today's almanac say?" |
| Help | `npm run bazi -- --action help` | "What usage is available?" |

By default, the skill follows the user's current input language. If the language is unclear, it starts in Chinese.

---

## Agent Integration

The current version does not require a separate Agent sync step.  
In Claude Code / OpenClaw, you can create, update, chat, and analyze directly through `/bazi-persona` or natural language.

If you are already talking to a persona and want to explicitly switch into analysis mode, just say:

```text
Turn on cheat mode
```

To switch back to normal chat, say:

```text
Turn off cheat mode
```

Created personas are stored locally:

```text
personas/<slug>/persona.md
personas/<slug>/bazi_data.json
personas/<slug>/memory.json
personas/<slug>/history.json
```

If you want to inspect or clean up those local files, use:

```bash
npm run bazi -- --action inspect
npm run bazi -- --action inspect --slug amy
npm run bazi -- --action delete --slug amy
```

---

## Other install options

```bash
npm install -g bazi-persona-skill
npm run bazi -- --action help
```

---

## About Cantian AI

Cantian AI combines traditional Eastern wisdom with modern AI, building AI that truly understands you through Bazi.  
Website: https://cantian.ai

Related projects:

1. [OpenClaw Skills](https://clawhub.ai/xiaojxiao2021/bazi-persona)
2. [Bazi MCP](https://github.com/cantian-ai/bazi-mcp)
3. [GPTs - Chinese Bazi Fortune Teller](https://chatgpt.com/g/g-67c3f7b74d148191a2167f44fd13412d-chinese-bazi-fortune-teller-can-tian-ba-zi-suan-ming-jing-zhun-pai-pan-jie-du)
4. [iOS App - Cantian AI](https://apps.apple.com/app/id6746296534)

---

## Contact

Email: [support@cantian.ai](mailto:support@cantian.ai)

WeChat:

<img src="https://github.com/user-attachments/assets/7790b64e-e03f-47e2-b824-38459549a6d8" alt="WeChat QR Code" width="200"/>

---

## License

MIT © [Cantian AI](https://github.com/cantian-ai)

---

## What is Bazi Persona Skill

Bazi Persona Skill is a persona generator based on birth data, built as an AI Skill for Claude Code, OpenClaw, and many other Agent platforms.

Give it a name and a birthday, and it creates a persona you can interact with over time.  
It's not a static character card or a handful of trait labels.  
You can chat with it and see how it expresses itself, makes decisions, responds to situations, and shifts with time.

If you're looking for any of these, this is the project:

- Bazi Persona
- AI Persona
- Persona Generator
- Birthday Based Persona
- Dynamic Persona
- Claude Code Skill
- OpenClaw Skill
