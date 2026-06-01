# AI駆動開発14日版レッスンガイド

このファイルは、14日版レッスンの学習者向けガイドです。
既存の7日版ガイドは変更せず、拡張版として使います。

## 学ぶこと

```text
AIエージェントに頼む順番
要件、仕様、実装計画を分ける理由
TASK_TRACKER.mdとHANDOFF.mdで作業を引き継ぐ方法
GitとGitHubでローカルとリモートを同期する方法
CIで変更を検査する方法
Playwrightで画面操作を自動確認する方法
複数サブエージェントや役割プロンプトで多角的に見る方法
スキルとMCPを小さく使う方法
```

## 14日間の流れ

```text
Day 1: 全体像、ロードマップ、学習制御
Day 2: GitHub接続とGit基礎
Day 3: 成果物リポジトリとメモリー文書
Day 4: 要件、仕様、実装計画
Day 5: タスクトラッカー、ハンドオフ、main CI
Day 6: 画面構成
Day 7: 基本動作
Day 8: 中断と再開
Day 9: ブランチ、PR、PR CI、merge
Day 10: Playwright E2E
Day 11: CI E2Eと失敗復旧
Day 12: 複数サブエージェントによる精査
Day 13: スキルとMCP
Day 14: 最終同期とふりかえり
```

## CLI画面の分離

成果物リポジトリの開発に入る前には、別画面でUbuntu/WSL CLIを起動します。
学習用リポジトリ `$HOME/projects/ai-driven-development-lesson/` と、成果物リポジトリ `$HOME/projects/task-tracker-repository/` を別々のCLI画面で扱うことで、Git管理の混線を防ぎます。

## 学習者が使う主なコマンド

```bash
./tools/lesson14 status
./tools/lesson14 通過 <step_id> "メモ"
./tools/roadmap status
./tools/helpdesk 相談 "分からないこと"
./tools/helpdesk 解決 "分かったこと"
```

## 困ったとき

```text
分からない場合は、分からないと答える
エラーが出た場合は、出力をそのままエージェントに見せる
未来項目を進めたい場合は、現在地に戻る
急いでいる場合でも、同期ゲートは省略しない
```
