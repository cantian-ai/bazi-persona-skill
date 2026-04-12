# 八字ペルソナ Bazi Persona Skill

**チャット履歴は不要。誕生日だけでいい。**

生年月日から、会話し、判断し、時間とともに変化するAIペルソナを生成します。  
手動でキャラ設定を書く必要はありません。誕生日から始めて、すぐに対話・観察・分析ができます。

Bazi Persona Skill is an AI persona generator based on birth date for Claude Code, OpenClaw, and 45+ agent platforms.

[![npm](https://img.shields.io/npm/v/bazi-persona-skill)](https://www.npmjs.com/package/bazi-persona-skill)
[![publish](https://github.com/cantian-ai/bazi-persona-skill/actions/workflows/publish.yml/badge.svg)](https://github.com/cantian-ai/bazi-persona-skill/actions/workflows/publish.yml)
[![license](https://img.shields.io/badge/license-MIT-blue)](./LICENSE)

[简体中文](./README.md) | [繁體中文](./README.zh-TW.md) | [English](./README.en.md) | [한국어](./README.ko.md)

**Cantian AI / 参天AI** &nbsp; · &nbsp; **Claude Code** &nbsp; · &nbsp; **OpenClaw** &nbsp; · &nbsp; **45+ Agent プラットフォーム**

## 特徴 Highlights

### 1. 誕生日だけで始められる

多くのペルソナツールはチャット履歴や背景資料、手動設定が必要です。  
八字ペルソナ Skill は名前と誕生日だけで、すぐにペルソナを生成できます。

### 2. 設定を書くのではなく、人格を生成する

この人がどう話すか、どう考えるか、どう決断するか — 事前に考える必要はありません。  
システムが出生情報から、対話・観察・分析が可能なペルソナを自動生成します。

### 3. 静的なラベルではなく、生きたペルソナ

「理性的」「繊細」「慎重」といった単なる説明ではありません。  
直接会話して、表現のしかた、判断の傾向、人間関係での反応を見ることができます。

### 4. チャットモードと神の視点、両方使える

普段はその人そのものとして会話できます。  
チートモードを開けば、八字と運勢の観点から状態・トレンド・関係性を深く分析できます。

### 5. 使うほどリアルに

あなたが追加する実際の情報でペルソナモデルが更新されます。  
固定テンプレートではなく、使うほど完成度が上がり、現実に近づきます。

### 6. 完全ローカル動作

インターネット不要、アップロードなし。すべてのデータはローカル環境に保存されます。  
プライバシー、コントロール、Agent ワークフローを重視する方に最適です。

---

## クイックスタート Quick Start

### 1）インストール Install

任意のAI Agentの会話に以下を貼り付けてください：

> `npx skills add cantian-ai/bazi-persona-skill --all` を実行して八字ペルソナスキルをインストールして

**OpenClaw** で使う場合は、ClawHub から直接インストールするのがいちばん簡単です：

> [ClawHub · bazi-persona](https://clawhub.ai/xiaojxiao2021/bazi-persona) を開いて、ページの案内に従ってインストールしてください

またはターミナルで直接実行：

```bash
npx skills add cantian-ai/bazi-persona-skill
```

### 2）最初のペルソナを作成 Create

会話に戻って、こう言うだけ：

```text
八字ペルソナを作って：花子、女性、1996年8月12日午後3時半生まれ、東京、同僚
```

### 3）使い始める Use

作成後、そのまま会話できます：

```text
最近仕事忙しい？
```

深層分析したいなら：

```text
チートモードON
```

---

## 実際の動作 Examples

### 例1：一文でペルソナ作成

```text
👤 八字ペルソナを作って：花子、女性、1996年8月12日午後3時半、東京、同僚

🤖 命盤作成完了 ✓

【ペルソナ概要】
1. 一言まとめ：穏やかに見えるが、芯は強い。考えてから動くタイプ。
2. 話し方：無駄がないが冷たくもない。
3. 判断基準：持続可能性とリスク・リターン比。
4. プレッシャー下の変化：ボトムラインと納品を重視、話が簡潔に。
5. 最近の状態：安定しながら効率化、意識的に交際を絞っている。

[花子] 会話モードに入りました ✓
次のメッセージから、私が彼女です。
```

### 例2：ペルソナと会話

同じ質問でも、八字が違えば反応が全く違います。

**控えめタイプ**

```text
👤 最近元気ない？

🤖 ないよ、ただ最近忙しいだけ。
どうしたの？
```

**表現豊かタイプ**

```text
👤 最近元気ない？

🤖 えっバレた？？
もう最近ほんとイライラで、仕事がめちゃくちゃで。
お昼空いてる？ご飯行こ、愚痴聞いて。
```

AIが台本を読んでいるのではありません。  
八字から導き出された判断パターン、感情のリズム、表現の癖が、すべての返答を動かしています。

### 例3：チートモード

```text
👤 チートモードON

🤖 チートモード開始 ✓
八字と運勢の観点から深い質問ができます。
「チートモードOFF」でいつでも通常会話に戻れます。
```

```text
👤 今日楽しい？

🤖 【今日の状態】
楽しくもないし嫌でもない——ちょっとソワソワする感じ。

行動力はあるけど、急ぎがち。
社交運はいいけど、その場で決断するのは向かない。
話があるなら午前中に来て。午後は多分イライラしてる。
```

### 例4：情報を追加するとペルソナが進化

```text
👤 花子が最近チームリーダーに昇進した

🤖 更新完了 ✓

連動分析：
管理権を得た後、まずルールを作ってからチームを率いるタイプ。
チーム立ち上げ期は少し厳しく見えるけど、それが彼女の秩序の作り方。
```

---

## 活用シーン Use cases

1. 会話できるペルソナを作る  
2. 元恋人、同僚、友人、パートナー、有名人などをシミュレーション  
3. ペルソナが様々な質問にどう反応するかを観察  
4. 人間関係、コミュニケーションパターン、現在の状態を分析  
5. Claude Code、OpenClaw、その他 Agent プラットフォームでのペルソナ生成機能として使用

---

## 一般的なペルソナツールとの違い

| 一般的なペルソナツール | 八字ペルソナ Bazi Persona Skill |
|---|---|
| チャット履歴や背景資料、手動設定が必要 | 名前と誕生日だけで始められる |
| ラベルを演じている感じ | 内部ロジックを持った人格を生成 |
| ペルソナは基本的に静的 | 時間と新情報に応じて変化し続ける |
| 普通の会話向き | 会話も深層分析もできる |
| クラウド処理が必要なことが多い | 完全ローカル動作に対応 |

---

## コマンド一覧 Commands

Claude Code / OpenClaw で `/bazi-persona` を使うか、自然言語でそのまま話せます。

| やりたいこと | コマンド | 自然言語 |
|---|---|---|
| ペルソナ作成 | `/bazi-persona` | 「八字ペルソナを作って：花子、女性、1996年…」 |
| 保存済み一覧を見る | `bazi --action inspect` | 「保存済みのペルソナを見せて」 |
| ローカルの1件を見る | `bazi --action inspect --slug hanako` | 「花子の人格ファイルを見せて」 |
| ローカルの1件を削除 | `bazi --action delete --slug hanako` | 「花子の人格を削除して」 |
| 会話開始 | `/bazi-persona` | 「花子と話したい」 |
| 情報追加 | `/bazi-persona` | 「花子が昇進した、更新して」 |
| チートモードを開く | `/bazi-persona` | 「花子との会話中に『チートモードをオンにして』と言う」 |
| 暦 | `/bazi-persona` | 「今日の暦は？」 |
| ヘルプ | `bazi --action help` | 「使い方を教えて」 |

基本はユーザーの入力言語に追従します。判定が曖昧なときは先に中国語で始めます。

---

## Agent 連携 Agent Integration

現在のバージョンでは、別途 Agent 同期は不要です。  
Claude Code / OpenClaw では `/bazi-persona` または自然言語だけで、作成・更新・会話・分析まで行えます。

すでにある人格と会話していて、明示的に分析視点へ切り替えたいときは、こう言ってください：

```text
チートモードをオンにして
```

通常会話へ戻したいときは：

```text
チートモードをオフにして
```

作成したペルソナはローカルに保存されます：

```text
personas/<slug>/persona.json
personas/<slug>/SKILL.md
```

これらのローカルファイルを確認・整理したい場合は、次を使います：

```bash
bazi --action inspect
bazi --action inspect --slug hanako
bazi --action delete --slug hanako
```

---

## その他のインストール方法 Other install options

```bash
npm install -g bazi-persona-skill
bazi --action help
```

---

## 私たちについて About Cantian AI

参天AIは伝統的な東洋の知恵とAIを融合し、八字をベースにあなたをより深く理解するAIを構築しています。  
ウェブサイト：https://cantian.ai

関連プロジェクト：

1. [OpenClaw Skills](https://clawhub.ai/tianlinle/cantian-bazi)
2. [Bazi MCP](https://github.com/cantian-ai/bazi-mcp)
3. [GPTs - Chinese Bazi Fortune Teller](https://chatgpt.com/g/g-67c3f7b74d148191a2167f44fd13412d-chinese-bazi-fortune-teller-can-tian-ba-zi-suan-ming-jing-zhun-pai-pan-jie-du)
4. [iOS App - 参天AI](https://apps.apple.com/app/id6746296534)

---

## お問い合わせ Contact

メール：[support@cantian.ai](mailto:support@cantian.ai)

WeChat：

<img src="https://github.com/user-attachments/assets/7790b64e-e03f-47e2-b824-38459549a6d8" alt="WeChat QR Code" width="200"/>

---

## License

MIT © [Cantian AI (参天AI)](https://github.com/cantian-ai)

---

## これは何？ What is Bazi Persona Skill

八字ペルソナ Skill は、出生情報をベースにしたペルソナ生成ツールです。Claude Code、OpenClaw、その他多くの Agent プラットフォームで使える AI Persona Skill です。

名前と誕生日を入力するだけで、継続的にやりとりできる AI ペルソナを作成できます。  
静的な設定カードでもなく、数行のラベル説明でもありません。  
直接会話して、その人の表現方法、判断傾向、関係性の反応、状態の変化を見ることができます。

以下のキーワードで探している方へ — このプロジェクトがまさにそれです：

- 八字ペルソナ
- Bazi Persona
- AI Persona
- Persona Generator
- Birthday Based Persona
- Dynamic Persona
- Claude Code Skill
- OpenClaw Skill
