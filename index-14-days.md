# AI駆動開発14日版レッスン入口

このファイルは、14日版レッスンの入口です。
既存の7日版入口である `index.md` は変更せず、拡張版として使います。

## 14日版で重視すること

```text
AI駆動開発の目的、本質、開発方法を体験で理解する
Git管理とGitHub連携を実際に使う
CI、PR、main同期を体験する
TASK_TRACKER.mdとHANDOFF.mdで中断再開を体験する
PlaywrightによるE2Eテストを導入する
複数サブエージェントまたは役割プロンプトで多角的に精査する
小さなスキルと最小MCP連携を体験する
各日の最後に文書、履歴、Git、CIを同期する
```

## 最初に読むファイル

```text
1. index-14-days.md
2. learning/ROADMAP.md
3. guides/LESSON_14_DAYS.md
4. playbooks/AGENT_PLAYBOOK_14_DAYS.md
5. prompts/PROMPTS_14_DAYS.md
6. lesson/LESSON_FLOW_14_DAYS.tsv
7. lesson/SYNC_GATES_14_DAYS.tsv
8. AGENTS.MD
9. skills/lesson14-facilitator/SKILL.md
```

## 最初に実行するコマンド

```bash
./tools/check_lesson14_structure.sh
./tools/check_lesson14_sync.sh
./tools/check_agents_skills.sh
./tools/lesson14 status
./tools/roadmap status
```

## レッスン制御

```bash
./tools/lesson14 status
./tools/lesson14 list
./tools/lesson14 開始 <step_id>
./tools/lesson14 通過 <step_id> "メモ"
./tools/lesson14 復習 <completed_step_id>
```

未来項目へのスキップは禁止です。
完了済み項目だけ、復習として自由に戻れます。

## CLI画面の分離

成果物リポジトリの開発に入る前に、学習者は別画面でUbuntu/WSL CLIを起動します。
学習用リポジトリ `$HOME/projects/ai-driven-development-lesson/` と、成果物リポジトリ `$HOME/projects/task-tracker-repository/` を別々のCLI画面で扱うことで、Git管理の混線を防ぎます。

## ロードマップとヘルプデスク

```bash
./tools/roadmap status
./tools/roadmap show
./tools/roadmap Day 10
./tools/helpdesk 相談 "分からないこと"
./tools/helpdesk 解決 "分かったこと"
./tools/helpdesk 一覧
```

ロードマップは現在地確認に使います。
ヘルプデスクは、学習者のつまずきや解決内容を短く残すために使います。

## 同期ゲート

各日の最後に、次を確認します。

```text
LEARNING_TASK_TRACKER_14_DAYS.mdとLEARNING_HANDOFF_14_DAYS.mdが更新されている
TASK_TRACKER.mdとHANDOFF.mdが現状と一致している
必要に応じて3文書へ反映されている
Gitの作業状態が整理されている
必要に応じてcommit、push、CI確認が済んでいる
tools/lesson14 通過 <step_id> "メモ" が通る
```

同期ゲートの正本は `lesson/SYNC_GATES_14_DAYS.tsv` です。
スキルやAGENTS.MDの整合性は `tools/check_agents_skills.sh` で確認します。

## エージェントへの開始プロンプト

```text
このリポジトリの index-14-days.md を読み、14日版レッスンを順番どおりに進めてください。
未来の項目へスキップせず、各日の最後に同期ゲートを確認してください。
必要なプロンプトは、私がコピペできる形で提示してください。
```
