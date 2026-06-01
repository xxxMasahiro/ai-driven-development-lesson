# PROMPTS_14_DAYS.md

このファイルは、14日版レッスンで使うコピペ用プロンプト集です。
既存の `prompts/PROMPTS.md` を置き換えず、拡張版として使います。

## 共通開始プロンプト

```text
このリポジトリの index-14-days.md、learning/ROADMAP.md、lesson/LESSON_FLOW_14_DAYS.tsvを確認し、
AGENTS.MDと必要なskills/*/SKILL.mdも確認したうえで、
14日版レッスンを順番どおりに進めてください。
未来の項目へスキップせず、各日の最後に同期ゲートを確認してください。
成果物リポジトリの開発に入る前には、別画面でUbuntu/WSL CLIを起動するよう必ず促してください。
必要なプロンプトは、私がコピペできる形で提示してください。
```

## 共通同期プロンプト

```text
現在の作業状態を確認し、LEARNING_TASK_TRACKER_14_DAYS.md、LEARNING_HANDOFF_14_DAYS.md、
TASK_TRACKER.md、HANDOFF.md、REQUIREMENTS.md、SPECIFICATION.md、IMPLEMENTATION_PLAN.mdの整合性を確認してください。
この依頼では、まず更新案だけ提示してください。
```

## Day 1

```text
Day 1として、14日版ロードマップ、教材リポジトリと成果物リポジトリの境界、
tools/lesson14、tools/roadmap、tools/helpdeskの使い方を確認してください。
最後にDay 1同期ゲートを通過できるか確認してください。
```

## Day 2

```text
Day 2として、Gitのstatus、add、commit、GitHubのgh、SSH、push、pullの役割を、
非エンジニアにも分かるように短く説明してください。
実行が必要なコマンドは、私がコピペできる形で提示してください。
```

## Day 3

```text
Day 3として、成果物リポジトリを教材リポジトリの外に作る理由を確認し、
成果物リポジトリの開発に入る前に、別画面でUbuntu/WSL CLIを起動するよう促してください。
AGENT.md、SESSION_MEMORY.md、FAILURE_MEMORY.md、DEVELOPER_MEMORY.mdの役割を整理してください。
更新案を提示してから、承認後に作業してください。
```

## Day 4

```text
Day 4として、REQUIREMENTS.md、SPECIFICATION.md、IMPLEMENTATION_PLAN.mdの初期案を作ります。
要件は私に一問一答で確認し、仕様と実装計画はエージェントが案を作ってください。
まず更新案だけ提示してください。
```

## Day 5

```text
Day 5として、3文書の初回作成をTASK_TRACKER.mdとHANDOFF.mdへ記録し、
mainブランチのCI、commit、push、GitHub上の確認まで体験します。
同期ゲートを通過する前に、文書、履歴、Git状態、CI状態を確認してください。
```

## Day 6

```text
Day 6として、index.htmlの画面構成を作成します。
SPECIFICATION.mdを確認し、入力欄、追加ボタン、タスク一覧の構成案を提示してください。
書き込み前に更新案を確認させてください。
```

## Day 7

```text
Day 7として、app.jsでタスク追加、空欄チェック、入力リセットの基本動作を作ります。
実装後に小さな確認手順を作り、TASK_TRACKER.mdとHANDOFF.mdへ反映する案を提示してください。
```

## Day 8

```text
Day 8として、HANDOFF.mdを使って中断と再開を体験します。
一度中断メモを作り、そのメモだけを読んで次の作業へ戻れるか確認してください。
```

## Day 9

```text
Day 9として、作業ブランチ、PR、PR CI、merge、mainへ戻ってpull同期する流れを体験します。
各操作の前に、今どのブランチにいて、何を確認するのかを短く説明してください。
```

## Day 10

```text
Day 10として、Playwrightを導入し、タスク管理表のE2Eテストを1つ作ります。
導入前に必要なコマンドと変更ファイルの見込みを提示してください。
```

## Day 11

```text
Day 11として、Playwright E2EをCIに組み込みます。
失敗した場合はログを読み、原因、修正、再実行、FAILURE_MEMORY.mdへの記録案を提示してください。
```

## Day 12

```text
Day 12として、複数サブエージェントまたは役割プロンプトを使い、
レビュー担当、テスト担当、同期確認担当の3観点で成果物を精査してください。
指摘は重大度順に整理してください。
```

## Day 13

```text
Day 13として、小さなエージェントスキルを作成し、呼び出して使う体験をします。
その後、最小MCP連携でタスク管理表を少し便利にする案を提示してください。
本格化しすぎず、学習目的の最小構成にしてください。
最後にtools/check_agents_skills.shでAGENTS.MDとskillsの整合性を確認してください。
```

## Day 14

```text
Day 14として、REQUIREMENTS.md、SPECIFICATION.md、IMPLEMENTATION_PLAN.md、
TASK_TRACKER.md、HANDOFF.md、README.md、Git状態、GitHub Actionsの状態を最終確認してください。
最後に、学習ロードマップとHELP_DESK.mdを見返してふりかえりを作ってください。
```
