# テンプレート集

このファイルは、エージェントがファイル案を作るときの雛形です。

## docs/product/REQUIREMENTS.md

```text
# REQUIREMENTS.md

## 目的

## ユーザー

## 必須要件

## 余裕があれば追加する要件

## 今回やらないこと

## 完成条件

## 未決定事項
```

## docs/product/SPECIFICATION.md

```text
# SPECIFICATION.md

## 画面構成

## 入力項目

## 表示項目

## 操作の流れ

## 入力チェック

## 保存方法

## 対象外の仕様
```

## docs/product/IMPLEMENTATION_PLAN.md

```text
# IMPLEMENTATION_PLAN.md

## 前提

## 作業順

## Day別計画

## 確認方法

## 完了条件

## 保留事項
```

## README.md

```text
# タスク管理表

## これは何か

## 使い方

## できること

## 今回やらないこと

## 次に改善したいこと
```

## 外部リポジトリ標準構成

```text
AGENTS.MD
README.md
.gitignore
docs/product/REQUIREMENTS.md
docs/product/SPECIFICATION.md
docs/product/IMPLEMENTATION_PLAN.md
docs/design-system/DESIGN_SYSTEM.md
docs/design-system/tokens.json
docs/design-system/components.json
docs/workflow/TASK_TRACKER.md
docs/workflow/HANDOFF.md
docs/workflow/SECURITY.md
docs/workflow/VERIFICATION.md
docs/memory/README.md
ops/STAGE_MANIFEST.tsv
ops/TEST_PLAN_MANIFEST.tsv
ops/DESIGN_SYSTEM_MANIFEST.tsv
ops/DASHBOARD_MANIFEST.tsv
ops/PRODUCT_MANIFEST.tsv
ops/PRODUCT_OPERATION_MODE.tsv
ops/PRODUCT_PROFILE.json
ops/REPOSITORY_INDEX.json
skills/product-development-workflow/SKILL.md
skills/product-doc-sync/SKILL.md
skills/product-security/SKILL.md
skills/product-test/SKILL.md
skills/product-design-system/SKILL.md
tools/product-gate
tools/check_product_structure.sh
tools/check_product_docs.sh
tools/check_product_security.sh
tools/check_product_design_system.sh
tools/test_product_repository.sh
tools/product-mode
tools/lib/product_common.sh
tools/lib/product_gate_evidence.sh
tools/product-gate-evidence
src/
tests/
```

条件付き:

```text
.github/workflows/                 CIありの場合
ops/CI_MANIFEST.tsv                CIありの場合
ops/INTEGRATION_MANIFEST.tsv       外部連携の場合
EXTERNAL_INTEGRATION_SECURITY.md   外部連携の場合
.githooks/                         product側でGit hooksを使う場合
.env.example                       環境変数が必要な場合のみ
docs/workflow/INSTRUCTION_MEMORY.md 既存の製品固有A-F手順が必要な場合のみ。AGENTS.MD不変ルールの下で手続き優先となり、親フォールバックから自動生成・上書きしない
```

## Optional Next Workflow Local Procedure

Do not create `docs/workflow/INSTRUCTION_MEMORY.md` merely to fill the optional
path. In an eligible parent-managed product repository, exact absence is the
only condition that permits the parent procedural fallback. If the product
needs its own procedure, create a complete, valid local document intentionally;
it remains below product-local `AGENTS.MD` invariants and cannot widen inherited
parent management policy for Git/GitHub, providers, external sends,
filesystem/network/runtime access, cost, safety, rigor, testing, release, or
documentation. Optional `DEVELOPER_MEMORY.md` and `SESSION_MEMORY.md` files are
Git-ignored local temporary notes, not durable workflow authority.

A product template must not copy parent runtime trust, SQLite state, provider
credentials, executable certifications, or Git authority. If a future product
adapter requests a parent Task Agent, it receives a bounded local-first
instruction envelope and candidate-only result contract; the parent retains
containment, admission, review, cost, and release authority. A template must
not install or emulate the parent Production launcher: headless Production
entry is created externally only after exact repository identity,
immutable-candidate release evidence, signed activation transitions, and
recovery closure pass. Control Center availability is not an authorization
signal.
That parent installation obtains its per-worktree instance from the parent's
ignored checkout-identity owner; generated templates must not embed, copy, or
infer it from tracked repository configuration. Templates also cannot redirect
the wrapper-pinned Controller base or provide a replacement identity to later
Owner actions.
A generated product template must not include the parent bootstrap-test Codex
fixture or treat its digest as certification. The fixture exists only inside
an isolated parent regression test; real product execution remains bound to
the currently observed and parent-authorized provider executable.
Templates also must not provide fake Bubblewrap or unshare binaries. Missing
real containment leaves headless Production unavailable and exposes only the
parent's installation and recheck guidance.
The parent launcher-integrity suite may reuse its private non-executed provider
descriptor only where real containment exists, but generated templates must
not copy or inherit that fixture.
Provider-discovery CLI/native fixtures are equally parent-test-only and must
not be emitted by templates.
The parent live probe's `/tmp/runtime` mount is also implementation-private;
templates must derive their own contained runtime path and must not copy it as
an inherited provider or writable-host convention.
Development-selection discovery fixtures have the same prohibition.
Templates must not copy an enforced Activation record or synthesize a
replacement transition. A generated product can consume only a parent-managed
newest fully enforced release; an in-progress replacement remains unavailable
until the parent's complete fresh shadow chain passes.

## LEARNING_TASK_TRACKER.md

```text
# LEARNING_TASK_TRACKER.md

## 現在の学習位置

## Day別進捗

## 理解できたこと

## まだ不安なこと

## 実行したプロンプト

## つまずきと対応

## 次に確認すること
```

## LESSON_CONFIG.tsv

```text
# key	value
lesson_repo_name	ai-driven-development-lesson
product_repo_name	task-tracker-repository
project_root	$HOME/projects
flow_file	lesson/LESSON_FLOW.tsv
state_file	learning/LESSON_STATE.tsv
learning_tracker_file	learning/LEARNING_TASK_TRACKER.md
learning_handoff_file	learning/LEARNING_HANDOFF.md
```

設定の意味:

```text
lesson_repo_name: 教材リポジトリ名
product_repo_name: 成果物リポジトリ名
project_root: 2つのリポジトリを並列に置く場所
flow_file: レッスン順番の正本
state_file: 現在位置の状態ファイル
learning_tracker_file: 学習進捗の記録先
learning_handoff_file: 学習引き継ぎの記録先
```

## LESSON_FLOW.tsv

```text
# order	step_id	day	title	required_output
001	setup.index	Setup	index.mdでレッスン全体の順番を確認する	設定から体験開発へ進む順番の了承
002	setup.github-login	Setup	github-login-setup-guide.mdでGitHub接続を確認する	github-loginでGitHub接続確認
```

列の意味:

```text
order: 通過順
step_id: コマンドで指定するID
day: レッスン上のDay
title: 学習者に見せる項目名
required_output: 通過前に確認する回答または成果物
```

## LESSON_STATE.tsv

```text
# order	step_id	status	started_at	completed_at
001	setup.index	current		
002	setup.github-login	locked		
```

状態の意味:

```text
current: 今だけ開始、通過できる項目
locked: まだ開始、通過できない項目
completed: 通過済みで復習できる項目
```

## LEARNING_HANDOFF.md

```text
# LEARNING_HANDOFF.md

## 現在地

## 直近で学んだこと

## 直近で実行したこと

## 未解決の疑問

## 次にやること

## 次回の最初の一問

## 注意点
```

Next Workflow template consumers must preserve the parent runtime's bounded
post-exit process identity settlement. Templates cannot extend the grace
period, reinterpret matched or reused identity, or accept an identity that
remains unknown.

Templates also cannot grant runtime reconciliation authority. That action
remains confirmation-bound to the exact immutable external Owner Controller;
the sanitized Production launcher and child templates carry no Owner
authority.

Templates cannot weaken terminal launch reconciliation either. Protected
process absence and persisted launch evidence are mandatory, settling a spawn
effect never accepts a failed Agent result, and no retry authority is
inherited.

Templates inherit the exact parent Agent result grammar. They may add
repository-specific context but must not redefine finding codes, evidence
references, severity values, or the empty-array no-findings representation,
and must not sanitize malformed output into acceptance.

Templates cannot impose a false candidate-ancestry requirement on GitHub
squash merge or weaken the exact alternative. Production Activation always
retains one merged PR, exact head and merge SHA, equal trees, successful
required PR/main CI and checks, synchronization, and no observation drift.
