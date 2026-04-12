# 사주 페르소나 Bazi Persona Skill

**채팅 기록 필요 없음. 생일만 있으면 됩니다.**

생년월일을 기반으로, 대화하고 판단하고 시간에 따라 변화하는 AI 페르소나를 생성합니다.  
수동으로 캐릭터 설정을 작성할 필요 없이, 생일부터 시작해서 바로 대화, 관찰, 분석이 가능합니다.

Bazi Persona Skill is an AI persona generator based on birth date for Claude Code, OpenClaw, and 45+ agent platforms.

[![npm](https://img.shields.io/npm/v/bazi-persona-skill)](https://www.npmjs.com/package/bazi-persona-skill)
[![publish](https://github.com/cantian-ai/bazi-persona-skill/actions/workflows/publish.yml/badge.svg)](https://github.com/cantian-ai/bazi-persona-skill/actions/workflows/publish.yml)
[![license](https://img.shields.io/badge/license-MIT-blue)](./LICENSE)

[简体中文](./README.md) | [繁體中文](./README.zh-TW.md) | [English](./README.en.md) | [日本語](./README.ja.md)

**Cantian AI / 참천AI** &nbsp; · &nbsp; **Claude Code** &nbsp; · &nbsp; **OpenClaw** &nbsp; · &nbsp; **45+ Agent 플랫폼**

## 주요 특징 Highlights

### 1. 생일만 있으면 시작

대부분의 페르소나 도구는 채팅 기록이나 배경 자료, 수동 설정이 필요합니다.  
사주 페르소나 Skill은 이름과 생일만 있으면 바로 페르소나를 생성할 수 있습니다.

### 2. 설정이 아니라 인격 생성

이 사람이 어떻게 말하고, 어떻게 생각하고, 어떻게 결정하는지 미리 정할 필요 없습니다.  
시스템이 출생 정보를 기반으로 대화, 관찰, 분석이 가능한 페르소나를 자동 생성합니다.

### 3. 고정 라벨이 아닌 살아있는 인격

단순히 "이성적", "예민함", "천천히 다가가는 스타일" 같은 설명이 아닙니다.  
직접 대화하면서 표현 방식, 판단 성향, 관계에서의 반응을 확인할 수 있습니다.

### 4. 대화 모드와 신의 시점, 둘 다 가능

평소에는 그 사람 그 자체로 대화합니다.  
치트 모드를 켜면, 사주와 운세 관점에서 상태, 트렌드, 관계 상호작용을 심층 분석합니다.

### 5. 쓸수록 진짜가 됨

실제 정보를 추가할 때마다 페르소나 모델이 업데이트됩니다.  
고정 템플릿이 아니라, 사용할수록 더 완성되고 현실에 가까워집니다.

### 6. 완전 로컬 실행

인터넷 불필요, 업로드 없음. 모든 데이터는 로컬 환경에 저장됩니다.  
프라이버시, 통제력, Agent 워크플로를 중시하는 사용자에게 적합합니다.

---

## 빠른 시작 Quick Start

### 1）설치 Install

AI Agent 대화창에 다음을 붙여넣기:

```bash
`npx skills add cantian-ai/bazi-persona-skill --all` 실행해서 사주 페르소나 스킬 설치해줘
```

**OpenClaw** 에서 사용한다면 OpenClaw 기본 설치 방식을 사용하는 것이 좋습니다:

```bash
openclaw skills install bazi-persona
```

ClawHub 페이지:
https://clawhub.ai/xiaojxiao2021/bazi-persona

또는 터미널에서 직접 실행:

```bash
npx skills add cantian-ai/bazi-persona-skill
```

### 2）첫 페르소나 생성 Create

대화로 돌아가서 말하기:

```text
사주 페르소나 만들어줘: 수진, 여자, 1996년 8월 12일 오후 3시 반, 서울, 내 동료
```

### 3）사용 시작 Use

바로 대화 시작:

```text
요즘 일 많이 바빠?
```

심층 분석하려면:

```text
치트 모드 켜줘
```

---

## 실제 작동 모습 Examples

### 예시 1: 한 문장으로 페르소나 생성

```text
👤 사주 페르소나 만들어줘: 수진, 여자, 1996년 8월 12일 오후 3시 반, 서울, 내 동료

🤖 명반 완성 ✓

【페르소나 요약】
1. 한줄 요약: 겉으로는 순해 보이지만 소신이 강함. 계산하고 나서 움직이는 타입.
2. 말하는 느낌: 쓸데없는 말 안 하지만 차갑지도 않음.
3. 결정 기준: 지속가능성과 리스크-리턴 비율.
4. 압박받을 때: 마지노선과 결과물을 더 강조, 소통이 간결해짐.
5. 최근 상태: 안정적으로 효율화 중, 의식적으로 소셜을 줄이는 중.

[수진] 대화 모드 진입 ✓
다음 메시지부터 제가 그녀입니다.
```

### 예시 2: 페르소나와 대화

같은 질문이라도 사주가 다르면 반응이 완전히 다릅니다.

**내성적 타입**

```text
👤 요즘 기분 안 좋아?

🤖 아니야, 그냥 요즘 일이 좀 많아서.
왜?
```

**외향적 타입**

```text
👤 요즘 기분 안 좋아?

🤖 아 들켰어??
진짜 요즘 짜증나 죽겠어, 회사에서 별일이 다 있어.
점심 시간 돼? 나가서 밥 먹으면서 좀 털어야겠어.
```

AI가 대본을 읽는 게 아닙니다.  
사주에서 도출된 판단 패턴, 감정 리듬, 표현 습관이 모든 응답을 이끕니다.

### 예시 3: 치트 모드

```text
👤 치트 모드 켜줘

🤖 치트 모드 ON ✓
사주와 운세 관점에서 깊은 질문이 가능합니다.
"치트 모드 꺼줘"로 언제든 일반 대화로 돌아갑니다.
```

```text
👤 오늘 기분 좋아?

🤖 【오늘 상태】
좋지도 나쁘지도 않아. 좀 들뜬 느낌.

행동력은 있는데 충동적이기 쉬워.
소셜 에너지는 좋은데, 그 자리에서 결정하기엔 안 좋은 날.
얘기할 거 있으면 오전에 와. 오후는 아마 인내심 없을 거야.
```

### 예시 4: 실제 정보 추가하면 페르소나 업데이트

```text
👤 수진이 최근 팀장으로 승진했어

🤖 업데이트 완료 ✓

연동 분석:
관리 권한을 받으면 먼저 규칙을 세우고 나서 팀을 이끄는 타입.
팀 적응기에 좀 엄격해 보일 수 있지만, 그게 그녀가 질서를 잡는 방식.
```

---

## 이걸로 뭘 할 수 있나요? Use cases

1. 대화할 수 있는 페르소나 만들기  
2. 전 애인, 동료, 친구, 연인, 유명인 등 다양한 대상 시뮬레이션  
3. 페르소나가 다양한 상황에서 어떻게 반응하는지 관찰  
4. 관계 상호작용, 소통 방식, 현재 상태 분석  
5. Claude Code, OpenClaw 및 기타 Agent 플랫폼에서 페르소나 생성 기능으로 활용

---

## 일반 페르소나 도구와 뭐가 다른가요?

| 일반 페르소나 도구 | 사주 페르소나 Bazi Persona Skill |
|---|---|
| 채팅 기록이나 배경 자료, 수동 설정 필요 | 이름과 생일만 있으면 시작 |
| 라벨을 연기하는 느낌 | 내부 로직을 가진 인격을 생성 |
| 페르소나가 보통 정적 | 시간과 새로운 정보에 따라 계속 변화 |
| 일반 대화에 적합 | 대화도 되고 심층 분석도 가능 |
| 클라우드 처리가 필요한 경우가 많음 | 완전 로컬 실행 지원 |

---

## 명령어 목록 Commands

Claude Code / OpenClaw에서 `/bazi-persona`를 사용하거나, 자연어로 바로 말하면 됩니다.

| 하고 싶은 것 | 명령어 | 자연어 |
|---|---|---|
| 페르소나 생성 | `/bazi-persona` | "사주 페르소나 만들어줘: 수진, 여자, 1996…" |
| 저장된 목록 보기 | `npm run bazi -- --action inspect` | "내 페르소나 목록 보여줘" |
| 로컬 파일 한 건 보기 | `npm run bazi -- --action inspect --slug sujin` | "수진 페르소나 파일 보여줘" |
| 로컬 파일 한 건 삭제 | `npm run bazi -- --action delete --slug sujin` | "수진 페르소나 삭제해줘" |
| 대화 시작 | `/bazi-persona` | "수진이랑 대화하고 싶어" |
| 정보 추가 | `/bazi-persona` | "수진이 승진했어, 업데이트해줘" |
| 치트 모드 켜기 | `/bazi-persona` | "수진과 대화 중에 '치트 모드 켜줘'라고 말하기" |
| 달력 | `/bazi-persona` | "오늘 황력은?" |
| 도움말 | `npm run bazi -- --action help` | "사용법 알려줘" |

기본적으로 사용자의 현재 입력 언어를 따릅니다. 언어가 애매하면 먼저 중국어로 시작합니다.

---

## Agent 통합 Agent Integration

현재 버전은 별도의 Agent 동기화가 필요 없습니다.  
Claude Code / OpenClaw에서는 `/bazi-persona` 또는 자연어만으로 생성, 업데이트, 대화, 분석까지 바로 할 수 있습니다.

이미 어떤 페르소나와 대화 중이고, 명확하게 분석 시점으로 전환하고 싶다면 이렇게 말하세요:

```text
치트 모드 켜줘
```

다시 일반 대화로 돌아가고 싶다면:

```text
치트 모드 꺼줘
```

생성된 페르소나는 로컬에 저장됩니다:

```text
personas/<slug>/persona.md
personas/<slug>/bazi_data.json
personas/<slug>/memory.json
personas/<slug>/history.json
```

이 로컬 파일을 확인하거나 정리하려면 다음을 사용하세요:

```bash
npm run bazi -- --action inspect
npm run bazi -- --action inspect --slug sujin
npm run bazi -- --action delete --slug sujin
```

---

## 기타 설치 방법 Other install options

```bash
npm install -g bazi-persona-skill
npm run bazi -- --action help
```

---

## 소개 About Cantian AI

참천AI는 전통 동양 지혜와 AI를 결합하여, 사주를 기반으로 당신을 더 깊이 이해하는 AI를 만듭니다.  
웹사이트: https://cantian.ai

관련 프로젝트:

1. [OpenClaw Skills](https://clawhub.ai/xiaojxiao2021/bazi-persona)
2. [Bazi MCP](https://github.com/cantian-ai/bazi-mcp)
3. [GPTs - Chinese Bazi Fortune Teller](https://chatgpt.com/g/g-67c3f7b74d148191a2167f44fd13412d-chinese-bazi-fortune-teller-can-tian-ba-zi-suan-ming-jing-zhun-pai-pan-jie-du)
4. [iOS App - 참천AI](https://apps.apple.com/app/id6746296534)

---

## 문의 Contact

이메일: [support@cantian.ai](mailto:support@cantian.ai)

WeChat:

<img src="https://github.com/user-attachments/assets/7790b64e-e03f-47e2-b824-38459549a6d8" alt="WeChat QR Code" width="200"/>

---

## License

MIT © [Cantian AI (참천AI)](https://github.com/cantian-ai)

---

## 이게 뭔가요? What is Bazi Persona Skill

사주 페르소나 Skill은 출생 정보 기반의 인격 생성 도구로, Claude Code, OpenClaw 및 다양한 Agent 플랫폼에서 사용할 수 있는 AI Persona Skill입니다.

이름과 생일만 입력하면 지속적으로 상호작용할 수 있는 AI 페르소나를 만들 수 있습니다.  
정적인 설정 카드도 아니고, 몇 줄짜리 라벨 설명도 아닙니다.  
직접 대화하면서 그 사람의 표현 방식, 판단 성향, 관계 반응, 상태 변화를 확인할 수 있습니다.

다음 키워드를 찾고 계신다면, 이 프로젝트가 바로 그것입니다:

- 사주 페르소나
- Bazi Persona
- AI Persona
- Persona Generator
- Birthday Based Persona
- Dynamic Persona
- Claude Code Skill
- OpenClaw Skill
