# Bazi Persona Skill

**One birthday, one living persona.**

Generate an AI persona from Bazi (Chinese astrology) that talks, feels, and evolves over time.

[![npm](https://img.shields.io/npm/v/bazi-persona-skill)](https://www.npmjs.com/package/bazi-persona-skill)
[![license](https://img.shields.io/badge/license-MIT-blue)](./LICENSE)

[简体中文](./README.md) | [繁體中文](./README.zh-TW.md) | [日本語](./README.ja.md) | [한국어](./README.ko.md)

**Cantian AI** &nbsp; · &nbsp; Claude Code &nbsp; · &nbsp; OpenClaw &nbsp; · &nbsp; 45+ Agent Platforms

- **One birthday is all you need** — Give a name and birthdate, get a full persona in seconds. No Bazi knowledge required.
- **Not fortune telling, a living persona** — It chats, has moods, and shifts with time cycles (decade/year/month/day/hour luck).
- **Cheat mode** — One phrase to switch into deep analysis: decode state, decisions, and trends from both static chart and dynamic cycles.
- **Gets more real over time** — Every real-world detail you add makes the persona more accurate. Not a fixed template.
- **Natural language first** — No commands to memorize. Just talk.
- **Runs locally** — No internet, no uploads. All data stays on your machine.

---

## See It In Action

### Create a persona in one sentence

```
👤  Create a Bazi persona: Xiao A, female, born Aug 12 1996 at 3:30pm, Shanghai, my coworker

🤖  Chart complete ✓

    [Persona Summary]
    1. In a nutshell: Seems easygoing but has strong opinions. Thinks it through before acting.
    2. Communication style: No fluff but not cold. Takes care of people but won't coddle them.
    3. Decision priority: Sustainability and risk-reward ratio.
    4. Under pressure: Doubles down on boundaries and delivery, talks less.
    5. Current state: Optimizing steadily, consciously pulling back on socializing.

    MBTI mapping: INTJ (Bazi-derived)
    · I → Day master Bing-fire sitting on Shen-metal, energy turns inward
    · N → Full food-god-to-wealth chain, intuition-driven decisions
    · T → Indirect officer + indirect seal combo, logic over feelings
    · J → Year pillar Ji-Mao direct seal, security from planning and control

    Now in [Xiao A] conversation mode ✓
    From the next message, I am her.
```

### Chat with the persona — not "acting", actually being that person

Once created, the AI *is* that person. Same question, completely different responses from different Bazi charts:

**Introverted persona (Bing-fire day master, strong officer stars, reserved):**

```
👤  Have you been in a bad mood lately?

🤖  No... just been busy lately.
    Why do you ask?
```

```
👤  You've been really quiet recently

🤖  Yeah, true. My mind's been occupied with stuff, haven't had the energy to chat.
    Not ignoring you, just don't have much to say right now.
    I'll be fine in a couple days.
```

**Extroverted persona (Jia-wood day master, strong food gods, expressive):**

```
👤  Have you been in a bad mood lately?

🤖  Oh you noticed??
    I'm so annoyed lately, work is a mess, let me tell you—
    The new team lead is ridiculous, two-hour meeting that was all nonsense.
    I almost rolled my eyes right there.
    You free for lunch? Let's eat, I need to vent.
```

```
👤  Haha sure, let's go

🤖  Let's go let's go, I know a new Hunan restaurant,
    Walked past it the other day, looked good, let's try it today.
    Take a photo for me, I need to post it.
```

> The AI isn't reading from a script. It's the decision patterns, emotional rhythms, and communication habits derived from Bazi driving every response.
> Same question, different charts, completely different answers.

### Cheat Mode — Deep analysis from Bazi and time cycles

In normal chat, the AI stays in character. It never "breaks the fourth wall."
But you can say "turn on cheat mode" anytime, and the conversation switches from casual chat to deep analysis—the persona decodes itself from Bazi and current time cycles:

```
👤  Turn on cheat mode

🤖  Cheat mode ON 🔓
    You can now ask deep questions from a Bazi and time-cycle perspective.
    Say "turn off cheat mode" anytime to go back to normal chat.
```

```
👤  Are you happy today?

🤖  [Today's State · Geng-Wu Day]
    Honestly, not happy or unhappy today—more like restless.

    Wu-fire is my Rob Wealth → I have strong drive today, but I'm impulsive.
    Geng-metal pressing on my Heavenly Stem → Someone will try to set boundaries for me. I'll be annoyed but shouldn't push back.
    Today's Shen-sha includes Peach Blossom → Social energy is high, but Disaster sha appears too. Easy to agree to things I shouldn't when emotions run high.

    Physically, I'm a Bing-fire day master, and today's Wu-fire makes my heart-fire excessive. Afternoon will be irritable, can't sit still.
    💡 If you need to talk to me, come in the morning. Afternoon I probably won't have patience. You can invite me out, but don't ask me to decide anything on the spot.
```

```
👤  Are we compatible?

🤖  [Compatibility Analysis]
    Looking at the charts, there's real affinity, but there's an asymmetry I should be honest about.

    Strong signal: Your wife-star hits me
    Ding-fire male, wife stars are Ren-water and Gui-water. My day master is exactly Gui-water—
    I land directly on your wife-star position. That's not a weak match.

    Weak signal: My husband-star doesn't directly hit you
    Gui-water female, husband stars are Wu-earth and Ji-earth. You're Ding-fire, not in my husband-star range.
    From my side, you're not the type I'd "just know" from my chart.
    It takes more active confirmation—I won't naturally feel "you're the one."

    Time window overlap
    Your marriage window: 2028–2029. My marriage window: 2027–2028.
    2028 is the overlap.

    💡 So here's the situation:
    Your chart has locked onto me, but mine hasn't directly locked onto you.
    That means you'll be more certain than me, and I need more time and closeness to confirm.
    2028 is the only overlapping window—if you want to push this forward, that year is critical.

    I know you're asking this, but have you talked to me about it face to face?
```

```
👤  Is now a good time to come report to you?

🤖  [Current Communication Window]
    Today is Geng-Wu day. Geng-metal is my Indirect Wealth → I'm focused on "results" and "efficiency" today.
    Don't want to hear the process, just the conclusion.

    Wu-fire is Rob Wealth → My patience drops significantly in the afternoon.
    I'll get impatient, might cut you off mid-sentence.

    💡 Suggestion:
    Come find me in the morning. Lead with the conclusion, then add "want me to elaborate?"
    If it's bad news, don't build up to it—just say it. I handle that better.
    Don't come after 3pm. I'll probably be stressed about something else by then.
```

> In cheat mode, ask the persona directly and get deep self-analysis from the Bazi and time-cycle perspective.
> Turn it off and you're back to normal chat. The two modes don't interfere.

### Gets More Real — Feed real info, the persona evolves

The persona isn't frozen after creation. Add real information anytime, and it auto-integrates with Bazi reinterpretation:

```
👤  Xiao A just got promoted to team lead

🤖  Updated ✓ Recorded "recently promoted to team lead."

    Cross-analysis: A Bing-fire day master with a food-god-to-wealth chain,
    once given management authority, will build rules first, then lead people.
    Won't take the "be everyone's buddy" approach.
    She'll seem a bit strict during the team adjustment period, but that's how she establishes order.
```

You can also paste screenshots, chat logs, or documents—the system extracts info and updates the persona automatically:

```
👤  [Pasted a WeChat chat screenshot with Xiao A]

🤖  Extracted 12 messages from Xiao A in the screenshot:
    - "Sure", "We'll see", "You decide"
    - Replies are all short, almost no exclamation marks
    - You asked three questions, she only answered the last one

    Want me to write these into her persona model?

👤  Do it

🤖  Updated ✓
    Language habits synced: short-sentence rhythm, conclusion-oriented, no emotional responses.
    Future conversations will be closer to her real communication style.
```

---

## How is this different from regular AI chat?

Regular AI chat:

```
👤  Simulate an INTJ woman for me

🤖  Sure, I'll play an INTJ woman. I'm a rational, independent person...
    (starts reciting labels)
```

Bazi Persona Skill:

```
👤  You worked late today. I said "good job" and you just replied "mm". Are you upset?

🤖  Not upset, really. Just by that hour my brain was completely done.
    I'm not a big talker to begin with, and when I'm tired I don't want to fake a bunch of "thanks for caring."
    The fact that I replied at all means I saw your message.
    If you really want to show you care, don't say anything—bring me a coffee tomorrow.
    I remember actions, not words.
```

The difference:
- **Not "playing a label"** — Bazi-derived core decision logic drives every response
- **Changes with time** — Real-time calculation of decade/year/month/day/hour luck cycles with ten-gods, relations (clash/combine/punishment), and Shen-sha. The same person reacts differently at different times.
- **Gets more accurate** — Real information you provide continuously refines the persona model
- **Deep analysis available** — Cheat mode reveals insights from Bazi and time cycles that normal chat can't show

---

## Quick Start

### Step 1: Install

Paste this in any AI Agent conversation:

> Run `npx skills add cantian-ai/bazi-persona-skill --all` to install the Bazi persona skill

Or run it yourself in the terminal:

```bash
npx skills add cantian-ai/bazi-persona-skill --all
```

`--all` auto-installs to all supported Agent platforms (Claude Code, OpenClaw, Cursor, Windsurf, and 45+ more).

### Step 2: Create your first persona

Go back to the chat and say:

```text
Create a Bazi persona: Xiao A, female, born Aug 12 1996 at 3:30pm, Shanghai, my coworker
```

The AI will auto-generate the chart, produce a persona preview, and enter conversation mode.

### Step 3: Start using it

Once created, chat with the persona directly:

```text
How's work been lately?
```

For deep analysis:

```text
Turn on cheat mode
```

Create more personas anytime:

```text
Create another one: Xiao B, male, born Mar 12 1991 at noon, Guangzhou, friend
```

### Alternative installation

```bash
# Global CLI install (no Agent platform needed)
npm install -g bazi-persona-skill
bazi --action help
```

---

## Commands

Use `/bazi-persona` in Claude Code / OpenClaw, or just use natural language:

| What you want | Slash command | Natural language |
|---|---|---|
| Create persona | `/bazi-persona create` | "Create a Bazi persona: Xiao A, female, 1996..." |
| List all | `/bazi-persona list` | "What personas do I have?" |
| Enter chat | `/bazi-persona {id}` | "I want to talk to Xiao A" |
| Add info | `/bazi-persona update {id}` | "Xiao A got promoted, update her" |
| Cheat mode | `/bazi-persona cheatsheet {id}` | "Turn on cheat mode" |
| Time fortune | `/bazi-persona flow {id}` | "How's Xiao A's luck lately?" |
| Compatibility | `/bazi-persona compat {a} {b}` | "Compare Xiao A and Xiao B" |
| Calendar | `/bazi-persona calendar` | "What does today's almanac say?" |
| Sync Agent | `/bazi-persona agent enable` | "Sync personas to Claude Code" |
| Help | `/bazi-persona help` | "What commands are there?" |

Supports Chinese and English. Defaults to your input language. Use `--lang zh` / `--lang en` to switch.

---

## Agent Integration

Sync created personas as Agent files, then start conversations by just saying their name—no need to enter the Skill each time.

### 1. Sync to platform

Say in chat:

```text
Sync my personas to Claude Code
```

Or use:

```text
/bazi-persona agent enable
```

The system writes all personas to the Agent directory:

| Platform | Agent Directory |
|---|---|
| Claude Code | `~/.claude/agents/bazi-persona/` |
| OpenClaw | `~/.openclaw/agents/bazi-persona/` |

Each persona gets its own Agent file, plus a router file for auto-dispatch.

### 2. After syncing

Open a new conversation and just say the name:

```
👤  Xiao A

🤖  I'm here. What's up?
```

```
👤  Switch to Xiao B

🤖  Hey, what do you need?
```

No install commands or `/bazi-persona` needed—the Agent files auto-load the corresponding persona.

### 3. Keep in sync

Re-sync whenever you create or update personas:

```text
Re-sync my personas to Agent
```

Or remove all synced Agents:

```text
/bazi-persona agent remove
```

---

## About Us

Cantian AI combines traditional Eastern wisdom with modern AI, building AI that truly understands you through Bazi.
Website: https://cantian.ai

Related projects:

+ [OpenClaw Skills](https://clawhub.ai/tianlinle/cantian-bazi)

+ [Bazi MCP](https://github.com/cantian-ai/bazi-mcp)

+ [GPTs - Chinese Bazi Fortune Teller](https://chatgpt.com/g/g-67c3f7b74d148191a2167f44fd13412d-chinese-bazi-fortune-teller-can-tian-ba-zi-suan-ming-jing-zhun-pai-pan-jie-du)

+ [iOS App - Cantian AI](https://apps.apple.com/app/id6746296534)

## Contact

- **Email**: [support@cantian.ai](mailto:support@cantian.ai)
- **WeChat**:

  <img src="https://github.com/user-attachments/assets/7790b64e-e03f-47e2-b824-38459549a6d8" alt="WeChat QR Code" width="200"/>



## License

MIT — [Cantian AI](https://github.com/cantian-ai)
