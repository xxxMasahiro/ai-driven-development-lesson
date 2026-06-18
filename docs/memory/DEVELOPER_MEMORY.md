# Developer Memory

## Session Memory: Temporary Two-Repository Verification Condition

The following text is recorded as the English source text for the current session memory.

### Original English Text

For upcoming implementation work, verify and test against the following two free-development repositories:

- `frame-cue`: `/home/masahiro/projects/frame-cue`
- `browser-debug-cli`: `/home/masahiro/projects/agent-toolbox/browser-debug-cli`

At major implementation milestones, also perform visual testing.

Do not proceed to the next step unless these tests pass.

However, verification and testing with these two repositories is temporary for the current period only and is not permanent.

Therefore, do not treat this as an absolute workflow requirement. Treat it as a temporary condition for now.

## 最重要: 外部リポジトリ証拠基盤と詳細ページ仕様

このセクションを、開発者メモリ内の最重要項目として扱います。
後続の既存記載は、この最重要項目より下位の参考、補足、または旧プロトコルとして扱います。
ただし、AGENTS.MD の不変ルール、既存機能とのトレードオフ禁止、Security-first defensive implementation、Design System 正本ルール、repository-development-workflow のフェーズ運用は常に上位制約として維持します。

以下の「原文」は、開発者に提示済みの内容を原文のまま記録したものです。

### 原文

はい。サブエージェント複数の精査結果も統合すると、方針は「4カードを入口にして、各詳細ページで判断理由・根拠・次の行動まで具体化する」形が妥当です。

**中核仕様**

| 層 | 役割 | 表示する内容 |
|---|---|---|
| 4カード | 現在位置を一目で判断 | 直近の重要状態を1行で表示。例: `動作確認 1/1 成功`、`PR CI 実行中`、`未コミット 3件` |
| カード詳細ポップアップ | 簡易詳細 | 何が確認されたか、なぜその状態か、参照元、次に見るページ |
| 各詳細ページ | 運用判断の本体 | 全件、時系列、失敗理由、対象ファイル、CI run、Git差分、安全ブロック、次の安全な操作 |
| 証拠データ層 | 正確性の根拠 | 外部repoの `.git/product-gate-evidence/` に実行結果・Git状態・CI状態・安全確認を個別記録 |

**外部repo側に必要な仕組み**

| 種別 | 記録するもの | 例 |
|---|---|---|
| ローカルテスト | 実行したチェック単位の成功/失敗 | `動作確認`, `構成確認`, `ビルド確認`, `ドキュメント確認`, `目視確認` |
| Git操作と同期 | 作業ツリー、commit、push、PR、merge、local/remote差分 | `未コミットあり`, `push済み`, `PR未作成`, `remoteと一致` |
| CI実行根拠 | GitHub Actions の run 単位 | workflow名、run URL、実行中/成功/失敗、対象commit一致 |
| 安全確認 | blocker、承認、危険操作、秘密情報、外部送信 | `危険操作承認なし`, `秘密情報検出なし`, `外部送信なし` |

これはローカルテストだけでなく、Git・CI・安全確認にも必要です。Dashboard側で推測するとまた「見せかけ」になるため、外部repoが実状態を記録し、本体repoのDashboardがそれを読む構成にします。

**詳細ページ仕様**

| ページ | ユーザーが判断したいこと | 具体表示 |
|---|---|---|
| 開発ワークフロー | 今どこまで進んでいて、次に何をすべきか | ローカル確認、Git状態、PR、CI、merge、main反映、次の推奨操作 |
| 保守・同期 | 何が同期され、何が古いか | 最終取得時刻、対象repo HEAD、取得成功/失敗、古い証拠、更新対象 |
| 安全確認 | 何が危険で、何が止めているか | blocker一覧、承認済み/未承認、危険操作分類、秘密情報/外部送信確認 |
| リポジトリ情報 | 選択中repoが本当に対象か | repo名、パス、branch、HEAD、構成、主要ファイルの役割 |
| ドキュメント | どの文書を見れば判断できるか | 文書ごとの役割、更新状況、対象repoとの対応、古い/不足の警告 |
| 設定 | 現在の運用モードが何を意味するか | 表示言語、Git/CIモード、対象repo選択、安全境界 |
| デザインスタジオ | 見た目変更がどこに効くか | 項目別プレビュー、正本デザインシステム、適用範囲 |
| ヘルプ | 今の状態の意味を理解する | 現在の警告や状態に紐づく説明、用語、次に見る場所 |
| 更新履歴 | いつ何が変わったか | データ更新時刻、取得元、変更された証拠、失敗した取得、直近イベント |

**データ設計案**

既存の `.git/product-gate-evidence/index.tsv` は「現在状態の索引」として維持します。詳細表示には別途、外部repo側へ次のような詳細証拠を置きます。

```text
.git/product-gate-evidence/
  index.tsv
  ledger.jsonl
  details/
    product.gates.tests/
    product.git.sync/
    product.ci.pr/
    product.security.blockers/
```

また、説明文や表示ルールは実行結果に混ぜず、静的な定義として外部repoに持たせます。

```text
ops/EVIDENCE_DETAIL_MANIFEST.tsv
```

ここに「このチェックは何を見ているか」「成功/失敗/未実行の意味」「ユーザーに見せる短い説明」「詳細ページでの表示順」「次の行動」を定義します。

**実装順案**

| 段階 | 内容 |
|---|---|
| P1 | 証拠詳細仕様を定義。`index.tsv` は維持し、詳細artifactと説明manifestを追加 |
| P2 | 外部repo生成時に、証拠収集・詳細manifest・標準gateを自動導入 |
| P3 | 既存外部repo向けに安全な repair/bootstrap を用意 |
| P4 | ローカルテスト、Git、CI、安全確認を個別 evidence として記録 |
| P5 | Dashboard data が evidence を読み、4カード・ポップアップ・詳細ページへ同じ根拠で反映 |
| P6 | Design System経由でUIを整え、Playwrightで各ページの目視確認 |
| P7 | fixtures・テスト・回帰確認を追加 |

**合格条件**

- 自由開発を選択したら、全ページが `frame-cue` の実状態を表示する。
- `task-tracker-repository` のような固定fallbackが混ざらない。
- 4カードの表示と詳細ページの根拠が同じ evidence ID で追跡できる。
- CIは run URL、対象commit、実行状態、成功/失敗がわかる。
- Gitは commit / push / PR / merge / local-remote同期を分けて表示する。
- 安全確認は「何を安全確認したか」「何がブロックか」が読める。
- 詳細ページには必ず `現在の判断 / なぜ / 根拠 / 次の行動` がある。
- 非エンジニア向けの短い判断文と、初級・中級エンジニア向けの技術詳細を分けて表示する。

この方針なら、Dashboardは単なる証拠一覧ではなく、選択中の外部repoの実状態から「今どこにいて、次に何をすべきか」を判断できるコントロールセンターになります。

### 実装計画: product-development-workflow 準拠

STATUS: implementation-plan-recorded

この実装計画は、`product-development-workflow` の implementation plan step として記録します。
対象は Free Development / Product Improvement / External Integration で使う外部成果物リポジトリ証拠基盤です。
本体リポジトリから外部リポジトリを制御する実装であるため、Dashboard Settings、AGENTS.MD、Security-first defensive implementation、Design System 正本ルール、repository-development-workflow のフェーズ運用を上位制約として扱います。

#### 現在の前提

| 項目 | 現在値 / 方針 |
|---|---|
| 選択中メニュー | `free-development` |
| 対象外部リポジトリ | `/home/masahiro/projects/frame-cue` |
| 外部repo表示名 | `FrameCue` |
| 外部repo運用モード | `parent_managed` |
| product Git usage | `free-development` は明示設定なしのため policy default `ci` |
| Git workflow action settings | commit/push/PR/CI monitoring は自動寄り設定だが、merge/destructive/OAuth/secrets/external sending は常に承認境界 |
| 現行 evidence | `.git/product-gate-evidence/index.tsv` の 13列 current index のみ |
| 不足 | `ledger.jsonl`、`details/`、`ops/EVIDENCE_DETAIL_MANIFEST.tsv`、Git/CI/安全/ローカルテストの詳細証拠 |

`ci` モードで CI が適用対象なのに、外部repo側に `ops/CI_MANIFEST.tsv` や remote/CI 証拠がない場合、Dashboard は `optional` に逃がしません。
「CI が必要だが未設定 / 未収集 / 手動確認が必要」という判断として表示します。

#### 実装目的

1. 4カードを、選択中外部repoの実状態に基づく現在位置表示にする。
2. カード、ポップアップ、詳細ページを同じ `source_id` / `current_item_id` で追跡できるようにする。
3. 外部repoが生成または修復される時点で、証拠収集に必要な仕組みを自動導入する。
4. Dashboard側は推測表示をやめ、外部repoに保存された実 evidence と manifest を読む。
5. 詳細ページでは、非エンジニアにも初級・中級エンジニアにも、現在の判断、理由、根拠、次の行動が分かるようにする。

#### 実装対象

| 領域 | 主な対象 |
|---|---|
| Evidence contract | `docs/workflow/PRODUCT_GATE_EVIDENCE_SCHEMA.tsv`、`docs/workflow/DASHBOARD_DATA_SCHEMA.tsv` |
| Product scaffold | `docs/workflow/PRODUCT_REPOSITORY_STRUCTURE.tsv`、`templates/TEMPLATES.md`、`tools/product-scaffold-check` |
| Product evidence bootstrap | `tools/product-gate-evidence-bootstrap`、生成される `tools/lib/product_gate_evidence.sh`、生成される `tools/product-gate-evidence` |
| Product authority | `tools/lib/product_repository_authority.sh`、`tools/product-repository-authority` |
| Dashboard producer | `tools/dashboard-data`、`tools/lib/dashboard_data.sh` |
| Dashboard validator/UI | `dashboard-control-center/src/dashboardData.js`、`dashboard-control-center/src/App.jsx`、`dashboard-control-center/src/i18n.js` |
| Design System | `docs/design-system/dashboard-control-center/DESIGN_SYSTEM.md`、`tokens.json`、`components.json`、`tools/dashboard-design-system` |
| Tests / fixtures | `tools/test_product_scaffold_check.sh`、`tools/test_product_repository_authority.sh`、`tools/test_product_gate_tools.sh`、`tools/test_dashboard_data.sh`、`tools/test_dashboard_schema.sh`、`tests/fixtures/dashboard-control-center*.json`、`tests/playwright/dashboard-control-center.spec.js` |

#### データ設計

既存の `.git/product-gate-evidence/index.tsv` は 13列の現在状態索引として維持します。
ここへ列を追加して既存 parser を壊しません。

追加する詳細層:

```text
.git/product-gate-evidence/
  index.tsv
  ledger.jsonl
  details/
    product.gates.tests/
    product.gates.structure/
    product.git.worktree/
    product.git.local_remote_sync/
    product.ci.pr/
    product.ci.main/
    product.security.blockers/
```

静的な説明・表示順・判断文は実行結果に混ぜず、外部repo側の manifest に置きます。

```text
ops/EVIDENCE_DETAIL_MANIFEST.tsv
```

候補列:

```text
source_id	required_mode	contexts	card_group	detail_page	label_key	detail_code	audience	what_is_checked	why_it_matters	pass_meaning	fail_meaning	not_run_meaning	stale_meaning	next_action_key	risk_level	approval_required	display_order
```

詳細 artifact の最小共通フィールド:

```text
event_id
source_id
context
status
freshness_state
authority
observed_at
product_root
product_head
detail_code
safe_summary
reason
next_action
source_artifacts
blocked_by
artifact_schema_version
```

#### Evidence source_id 方針

| 分類 | source_id 例 | 役割 |
|---|---|---|
| ローカルテスト | `product.gates.tests.*`、`product.gates.structure.*`、`product.gates.build.*`、`product.gates.docs.*`、`product.gates.visual.*` | 実行したチェック単位の成功/失敗と直近結果 |
| Git | `product.git.worktree`、`product.git.upstream`、`product.git.local_remote_sync`、`product.git.push`、`product.git.pr`、`product.git.merge` | 作業ツリー、branch、ahead/behind、push、PR、merge、同期状態 |
| CI | `product.ci.pr`、`product.ci.main`、`product.ci.github_actions` | workflow、run、commit一致、実行中/成功/失敗 |
| Security | `product.security.secrets`、`product.security.local_artifacts`、`product.security.external_sending`、`product.security.blockers` | 秘密情報、ローカル生成物、外部送信、blocker |
| Approval | `product.approvals.*` | 危険操作、外部連携、merge、credential/OAuth などの承認状態 |

#### 実装順

1. **Evidence 詳細契約を追加する**
   - `index.tsv` 13列を維持する。
   - `ledger.jsonl`、`details/`、`ops/EVIDENCE_DETAIL_MANIFEST.tsv` の契約を schema と tests に追加する。
   - status、freshness、authority、risk、approval の許可値を固定する。

2. **Scaffold / bootstrap / repair を拡張する**
   - 新規外部repo scaffold に `ops/EVIDENCE_DETAIL_MANIFEST.tsv` を標準搭載する。
   - `product-gate-evidence-bootstrap` で helper/command と detail manifest 雛形を安全に導入する。
   - 既存外部repo向けに欠落検出と修復候補を出す。
   - 既存ファイルは無断上書きせず、`--force` や destructive な移行は承認境界に置く。

3. **Product-local evidence writer を拡張する**
   - `tools/product-gate-evidence record/run/status` が index、ledger、details を同じ `source_id/context/product_head/event_id` で書く。
   - stdout 解析に依存せず、構造化 JSON/JSONL を保存する。
   - secrets、絶対パス、private URL、巨大ログを保存しない。
   - 詳細 artifact は sanitized summary と必要最小限の技術詳細だけを持つ。

4. **Authority reader を拡張する**
   - `product_repository_authority` が index + detail manifest + latest details を read-only で読む。
   - `product_head` 不一致だけでなく、`max_age_seconds` に基づく時間 stale も扱う。
   - CI mode required なのに manifest/evidence がない場合は `optional` ではなく `not_run` / `manual_required` / blocker として出す。
   - 欠落、古さ、HEAD 不一致、必須/任意、承認境界を source_id 単位で JSON 化する。

5. **Git / CI / Security evidence を個別化する**
   - Git は worktree、upstream、ahead/behind、local-remote sync、push、PR、merge を分ける。
   - CI は provider、workflow、run_id、run_url、run_status、conclusion、head_match_status を持つ。
   - Security は blocker、approval、dangerous operation、secret scan、external sending を分ける。
   - Dashboard はコマンド実行面にせず、表示と command preview までに留める。

6. **Dashboard data 契約へ接続する**
   - `live_status.checks.local_tests/git_sync/ci/security` を4カード正本にする。
   - 各 check に `status`、`observed_at`、`detail_code`、`source_id`、`summary`、`reason`、`next_action`、`detail_page`、`freshness_state`、`authority`、`risk_level`、`required_command`、`current_item_id`、`items[]` を必須化する。
   - `development`、`maintenance`、`security`、`repository_info`、`documents`、`history` へ同じ evidence ID を流す。

7. **UIを4カード、ポップアップ、詳細ページへ反映する**
   - 4カードは直近の有益な1行だけを主表示にする。
   - ポップアップは簡易版として `現在の判断 / なぜ / 根拠 / 次の行動` を表示する。
   - 詳細ページは全件、時系列、失敗理由、対象ファイル、CI run、Git差分、安全ブロック、次の安全な操作を表示する。
   - UI側で判断を推測せず、producerの `summary/reason/next_action/source_id` を表示する。
   - 見た目の変更は Design System 正本を通す。

8. **Fixtures / Playwright / 実repo確認を追加する**
   - fixture で detail manifest、ledger、details、stale、HEAD mismatch、CI missing、security blocker を持つケースを用意する。
   - Playwright で desktop/mobile、ポップアップ、詳細ページ、`source_id` 追跡、横 overflow なしを確認する。
   - 実 `frame-cue` snapshot で `task-tracker-repository` が混ざらないことを確認する。

#### 詳細ページ設計

| ページ | 表示する判断 | 具体表示 |
|---|---|---|
| 開発ワークフロー | 今どこまで進み、次に何をするか | ローカル確認、Git worktree、upstream、ahead/behind、push、PR、CI run、merge承認、main反映 |
| 保守・同期 | 表示が信頼できるか、何が古いか | index 鮮度、detail artifact 有無、product_head 一致、manifest不足、取得失敗、最後の更新時刻 |
| 安全確認 | 何が危険で、何が止めているか | blocker、approval、dangerous operation、secret scan、external sending、承認境界 |
| リポジトリ情報 | 選択中repoが本当に対象か | repo path、profile、operation mode、branch、HEAD、remote有無、主要ファイルの役割 |
| ドキュメント | どの文書が何の判断根拠か | product docs、workflow docs、security/verification docs、manifest、古い/不足の警告 |
| ヘルプ | 今の状態の意味を理解する | 現在の warning/blocker/source_id に紐づく用語、意味、次に見る場所 |
| 更新履歴 | いつ何が変わったか | `ledger.jsonl` 時系列、event_id、source_id、observed_at、結果変化、対象 HEAD |

#### 文書同期方針

1. この計画はまず `docs/memory/DEVELOPER_MEMORY.md` に implementation-plan-recorded として保持する。
2. runtime 実装前は、as-built 5文書と `AS_BUILT_SYNC_CONTRACT.tsv` を implemented 扱いへ昇格しない。
3. 実装が完了し、対象検証と目視確認が通った段階で、次の5文書へ同期する。
   - `docs/as-built/REQUIREMENTS.md`
   - `docs/as-built/SPECIFICATION.md`
   - `docs/as-built/IMPLEMENTATION_PLAN.md`
   - `docs/workflow/TASK_TRACKER.md`
   - `docs/workflow/HANDOFF.md`
4. 外部repo `frame-cue` の product docs を変更する場合は、product-local `docs/product/*`、`docs/workflow/TASK_TRACKER.md`、`docs/workflow/HANDOFF.md` の役割に従い、root duplicate を作らない。
5. Dashboard UI/CSS は Design System 正本を経由し、生成 CSS/JS を直接編集しない。

#### 検証計画

軽量・対象検証:

```bash
bash -n tools/product-gate-evidence-bootstrap
./tools/test_product_scaffold_check.sh
./tools/test_product_repository_authority.sh
./tools/test_product_gate_tools.sh
./tools/test_product_git_usage_modes.sh
./tools/test_dashboard_schema.sh
./tools/test_dashboard_data.sh
./tools/check_dashboard_design_system.sh
```

UI実装後の目視・Playwright:

```bash
./tools/test_dashboard_control_center.sh
```

実repo受け入れ条件:

- `DASHBOARD_SELECTED_MENU_ID=free-development ./tools/dashboard-data` が `frame-cue` を対象にする。
- Overview、Workflow、Maintenance、Safety、Repository Info、Documents、Help、History で `task-tracker-repository` が主表示に混ざらない。
- 4カード、ポップアップ、詳細ページが同じ `source_id/current_item_id` を表示する。
- `frame-cue` の dirty worktree、HEAD、CI未設定/未収集、security evidence が実状態として出る。
- CI mode required なのに CI証拠がない場合、`optional` ではなく未設定/未収集/確認必要として出る。

最終同期前:

```bash
./tools/check_as_built_sync_contract.sh
./tools/check_as_built_docs.sh
./tools/check_workflow_pair_sync.sh
./tools/check_test_plan_coverage.sh
```

#### 復旧方針

- `index.tsv` parser に問題が出た場合は、13列 index を正本に戻し、details/ledger 読み込みだけを無効化できるようにする。
- 詳細 artifact が欠落している既存repoでは、主表示を壊さず「詳細未収集」として理由と次アクションを出す。
- `product_head` 不一致や時間 stale は、成功扱いにせず stale として表示する。
- CI/GitHub API が使えない場合は、Dashboard で「認証不足 / remote未設定 / run未収集」を表示し、UIから実行しない。
- 秘密情報や外部送信に関わる詳細は、値を保存せず category、件数、sanitized file refs のみにする。

#### 承認境界

- Dashboard は read-only / preview-only を維持する。
- command preview は表示のみで、Dashboardから実行しない。
- destructive operations、push、PR作成、merge、main CI待機、cleanup、remote deletion、OAuth、credentials、secrets、external-service authority changes は明示承認境界を維持する。
- 外部repoへの scaffold/repair 書き込みは product workspace boundary と operation mode を確認して行う。
- 既存外部repoのファイル上書き、旧 `AGENT.md` 削除、remote/CI設定変更は自動で行わない。

#### 完了条件

- 新規外部repo scaffold に evidence detail manifest と product-local evidence writer が標準導入される。
- 既存外部repoは repair/bootstrap で欠落を検出し、安全に導入候補を出せる。
- ローカルテスト、Git、CI、安全確認が個別 evidence として記録・表示される。
- 4カード、ポップアップ、詳細ページが同じ evidence ID で追跡できる。
- 全詳細ページに `現在の判断 / なぜ / 根拠 / 次の行動` がある。
- `free-development` + `frame-cue` 選択時に全ページが同じ外部repo実状態を表示し、固定 fallback が混ざらない。
- 非エンジニア向け短文と、初級・中級エンジニア向け技術詳細が分離される。

## Required baseline memory for lesson checks

Approval checkpoints now have tooling enforcement.

The 7-day lesson command is `tools/lesson 学習モード <A|B|C>`.
The STEP 1-14 lesson command is `tools/lesson14 学習モード <A|B|C>`.
Learning mode can be changed at any time during either lesson.

Standard language choices should include `ja`, `en`, `ko`, `zh-CN`, `zh-TW`, `es`, `pt-BR`, `fr`, `de`, `id`, `vi`, `th`, `hi`, and `ar`, while `zh` remains a `zh-CN` alias and custom values remain available.

Implementation must remain refactorable, ecosystem-friendly, reusable, and general.
Existing functionality must not be traded away.
Final tests pass only when every improvement or problem recorded in this developer memory is implemented, explicitly deferred, or covered by an accepted follow-up.

Explain MCP Purpose Before MCP Workflows.

## 参考: 旧最優先プロトコル（格下げ済み）

このセクションは、以前の本リポジトリ開発プロトコルを保存した旧記録です。
現在は、上記の「最重要: 外部リポジトリ証拠基盤と詳細ページ仕様」より下位の参考情報として扱います。
以下の「原文」は、開発者に提示済みの内容を原文のまま記録したものです。

この旧プロトコルを参照する場合も、必ず repo-local skill の `repository-development-workflow` に準拠します。実装前の context triage、proposal、implementation_plan、fast_loop、mid_tests、release_gate、main_sync_cleanup のフェーズ選択、`./tools/repository-development-workflow guidance --phase <phase_id>`、`./tools/repository-development-workflow gate --phase <phase_id>`、および推奨/必須チェックの選定は同スキルの手順に従います。`repository-development-workflow` は AGENTS.MD を置き換えるものではなく、AGENTS.MD の不変ルールを上位制約として、旧プロトコルを安全に参照するための運用手順として扱います。

後続の「参考文献」セクションは、旧プロトコルの詳細、根拠、補足、調査記録として扱います。参考文献側に個別の優先順位や改善案がある場合でも、当面の実装順は上記の最重要項目を優先します。AGENTS.MD の不変ルール、既存機能とのトレードオフ禁止、リファクタリング性、エコシステム性、再利用性、汎用性は常に上位制約として扱います。

### 原文

表示のみです。開発者メモリは触っていません。

**1. Dashboard 表示文脈の正本化**
対象フェーズ: `P0 / context foundation`

内容:
1. メニュー選択をDashboard全体の正本コンテキストにする
2. `activeMenuId` / `activeContext` を導入し、全ページを選択メニューに従わせる
3. `step_1_14` 固定 fallback を撤去し、実状態に基づく初期選択にする
4. 未開始・対象repoなし・設定不足メニューを選択不可にし、理由を通知する

目的: まず「今Dashboardが何の作業を表示しているのか」を全ページで一致させる。

**2. 外部repo実状態判定とデータ分離**
対象フェーズ: `P0-P1 / context data source`

内容:
5. 外部リポジトリ状態をユーザー申告ではなく実repo/manifest/evidenceから判定する
6. 自由開発・成果物改善・外部連携の対象repoを実状態から検出する
7. `recent_runs`、`maintenance.evidence_rows`、`source_files` を menu/context scope 付きにする
8. Documents / Repository Info で教材・成果物・本リポジトリ保守情報を混在させない
9. 選択メニュー外の情報が主表示へ漏れないことを検査する

目的: STEP 1-14、自由開発、未開始メニューなどを実状態から正しく区別する。

**3. Dashboard の判断UI化**
対象フェーズ: `P1 / decision UI`

内容:
10. Overviewを「状態一覧」から「次アクション判断ボード」にする
11. 保守・同期ページを、手動確認事項・証拠の意味・未収集影響が分かる形へ改訂する
12. Workflow / Safety を技術状態表示ではなく「進めてよいか」の判断UIへ改訂する
13. 詳細モーダルを、行ごとの原因・影響・復旧手順・関連証拠を出せる構造へ拡張する

目的: 非エンジニアでも「進める / 止める / 確認する」が分かる画面にする。

**4. 外部リポジトリ基盤の標準化**
対象フェーズ: `P1-P2 / product repository foundation`

内容:
14. 外部repo初期構成に `skills/`、`tools/`、`docs/product/`、`docs/workflow/`、`docs/design-system/`、`ops/` を標準搭載する
15. `product-development-workflow` を外部repo側の標準運用スキルとして機能させる
16. Settings の Git/CI 使用モードを外部repo gate まで一貫反映する
17. `.git` なし / local Git / remote sync / CIあり の全モードで free-development gate を正しく動かす

目的: 外部repoを本リポジトリの制御基盤から安全に扱える状態にする。

**5. Learner Context の実装**
対象フェーズ: `P2 / lesson runtime context`

内容:
18. `learner_context_foundation` を実装状態へ進める
19. `learner_context_runtime_integration` を実装し、レッスン出力へ安全に接続する

目的: レッスン進行や学習者状態を安全に参照し、教材出力へ反映できるようにする。

**6. Design Studio の中核基盤**
対象フェーズ: `P2 / design studio core`

内容:
20. Event Runner を実装する
21. Request / Proposal Store を永続化する
22. サブスク型 / APIキー型 / 手動型 AI Agent Connection Layer を実装する

目的: Dashboard上の自然文依頼、AI補助、提案生成、承認フローの土台を作る。

**7. Design Studio の高度機能**
対象フェーズ: `P3 / mock and design-system workflow`

内容:
23. imagegen連携によるモック生成をDashboardから扱えるようにする
24. モックの範囲選択編集、undo/redo、候補管理を実装する
25. モックからDesign System候補を抽出する
26. テンプレート保存・再利用・適用フローを実装する
27. 外部repoのDesign Systemを product-local adapter 経由で編集・計画・承認できるようにする

目的: モック、デザインシステム、外部repoの見た目調整をDashboardから扱えるようにする。

**8. 外部repo証拠・安全・プロファイル強化**
対象フェーズ: `P3-P4 / evidence and safety`

内容:
28. `.git` なし外部repo向けの証拠保存・鮮度管理・product_head代替モデル
29. 成果物名・作業対象名の write path 化
30. product-security / Security guard の追加強化

目的: Gitなし運用や成果物管理でも証拠・安全性・対象識別を崩さない。

**9. ライブ運用と自動化**
対象フェーズ: `P4 / live operations`

内容:
31. live Git/CI/network status、UI-triggered check、command execution
32. push、PR作成、merge、main CI待機、cleanup実行の自動化拡張

目的: 条件が整った場合に、Dashboardやworkflowから運用操作まで接続できるようにする。

**10. テスト・CI最適化**
対象フェーズ: `P4 / verification optimization`

内容:
33. gap-only final gate、単一パス検証、Playwright重複削減などの高速化
34. changed-only CI を observe-only から権威ある判定へ昇格する

目的: 安全性を落とさず、重い検証と高速ループを分離して開発効率を上げる。

実装手順としては、まず **1-9で表示対象の混在を止める**、次に **10-13でDashboardを判断UIへ改訂する**、その後 **14-17で外部repo基盤を固める**。それが安定してから Learner Context、Design Studio、証拠・安全、自動化、CI高速化へ進む順番です。

## 参考文献: 最優先プロトコルの詳細、根拠、補足

以下は、最優先プロトコルを構成するための調査結果、問題分析、追加前提、詳細ロードマップです。実装時は必要に応じて参照しますが、当面の実装順は上記の「最優先: 当面の開発プロトコル」に従います。

読み取り専用で精査しました。サブエージェント3件はすべて完了し、閉じています。結論として、現状のDashboardは「技術証跡を安全に表示する画面」としては進んでいますが、「非エンジニアが次に何をすべきか判断できる製品UI」としては未達です。

**核心問題**
今の詳細ボタンやリンクは、かなりの箇所で「押すと何か出る」ことは満たしていますが、「その情報で判断が進む」状態になっていません。原因は主に3つです。

- 共通モーダルが `where / why / next action / technical source` の固定枠だけで、行ごとの失敗原因・影響・復旧手順・関連証拠を十分に表現できない
- データ契約が `status` や `reference` 中心で、`何を判断するか`、`放置リスク`、`次の完了条件` を必須にしていない
- テストが「モーダルが開く」「文言がある」を見ており、「有益な判断材料になっているか」までは守っていない

代表箇所は [App.jsx](/home/masahiro/projects/ai-driven-development-lesson/dashboard-control-center/src/App.jsx:1202)、[dashboardData.js](/home/masahiro/projects/ai-driven-development-lesson/dashboard-control-center/src/dashboardData.js:1234)、[dashboard-control-center.spec.js](/home/masahiro/projects/ai-driven-development-lesson/tests/playwright/dashboard-control-center.spec.js:508) です。

**重大な改善対象**
1. 保守・同期ページで `summary.manual_followups` が実表示されていません。件数計算には使われていますが、ユーザーが確認すべき Git/CI などの手動確認事項が画面に出ません。

2. `#evidence-table-heading` などのページ内リンクが、ルーティング仕様上 `overview` に戻る可能性があります。重要CTAが目的箇所へ連れて行かないなら、信頼を大きく落とします。

3. 詳細ページの「Refresh / Refresh data」が押せそうに見えるのに実ボタンではありません。アクション風UIは実行可能か、そうでないなら表示を変えるべきです。

4. 保守状態カードには詳細ポップアップがありません。「同期済み」「正常」「追記済み」が何を保証するのか説明不足です。

5. 安全確認ページは、承認・危険操作・失敗の意味をまだ技術状態として見せすぎています。ユーザー影響、停止理由、復旧優先度が前面に出るべきです。

6. Overview が司令塔になっていません。`primary_action`、`guidance_items`、`blocking_items`、`manual_followups` という良いデータはあるのに、「今やるべきこと」の判断ボードとして活用しきれていません。

7. Documents ページは比較的良いですが、そこで得られる「何を作るか・どこまで進んだか・次に何を確認するか」の文脈が、Workflow / Maintenance / Safety に波及していません。

**改訂方針**
Dashboard全体を、技術項目ベースではなく次の順番で再設計すべきです。

| 項目 | 画面で答えるべきこと |
|---|---|
| Outcome | このページで何を判断するのか |
| Decision | 進めてよいか、確認が必要か、止めるべきか |
| Reason | なぜ重要か |
| Risk | 放置すると何が危険か |
| Next Action | 次に1つ何をすればよいか |
| Evidence | その判断を支える証拠は何か |

**実装前に固めるべき改善テーマ**
- Overview を「状態一覧」から「次アクション判断ボード」に変える
- 保守・同期ページに手動確認事項、証拠の必須/任意、未収集時の影響を出す
- Workflow / Maintenance / Safety のカードを技術名ではなく実務上の質問に言い換える
- 詳細モーダルを汎用枠から、行ごとの判断材料を持てる構造へ拡張する
- 押して意味がないリンク/ボタンは削除、または静的チップへ変える
- Documents の decision brief を全ページの共通文脈として使う
- Playwright に「詳細が固有情報を持つ」「次アクション・理由・リスクが表示される」検査を追加する

**優先順位**
1. まず保守・同期ページの手動確認事項、証拠詳細、ページ内リンク破綻を修正対象にする
2. 次に Overview を司令塔化し、主要リスクと次アクションを前面に出す
3. 次に Workflow / Safety のカードと詳細を実務判断ベースへ改訂する
4. その後、データ契約に `decision_summary`、`risk_if_ignored`、`recommended_next_action`、`owner`、`done_condition` などを追加する
5. 最後にテストを「存在確認」から「判断材料の品質確認」へ強化する

現時点では、文書上は一部「実装済み」扱いになっていますが、実態は「汎用detail shellを追加した段階」です。製品リリース品質にするには、ここを再オープンして本格改訂する必要があります。

読み取り専用で精査しました。サブエージェント3件の報告はすべて戻っています。指示通り、サブエージェントは閉じていません。

**結論**
現状の「進めるメニューを選択」は、名前に反して **Dashboard全体の表示対象を切り替える機能になっていません**。
実態は、生成済み snapshot の `selected_context.menu_id` を表示しているだけです。そのため既定の `step_1_14`、つまり実践レッスンが強制的に選ばれやすく、各ページには本リポジトリ保守情報、成果物リポジトリ情報、レッスン情報が混在しています。

**主因**
| 問題 | 内容 |
|---|---|
| 既定値が `step_1_14` | `tools/dashboard-data` が `DASHBOARD_SELECTED_MENU_ID` 未指定時に `step_1_14` を選びます |
| メニュータイルが表示用 | `MenuTileStrip` は `article` 表示で、クリックして全体 state を変える機能がありません |
| App全体に `activeMenuId` がない | `Overview / Workflow / Maintenance / Safety / Documents` へ選択メニューが伝播しません |
| `ContextPanel` が未接続 | select UI はありますが、ページ全体のデータ切替には使われていません |
| データがトップレベル単一 | `recent_runs`、`maintenance.evidence_rows`、`source_files` がメニュー別ではなくグローバルです |
| テストが固定前提 | Playwright が `step_1_14` 固定や `menu_id: step_1_14` を期待しています |

代表箇所:
- [App.jsx](/home/masahiro/projects/ai-driven-development-lesson/dashboard-control-center/src/App.jsx:360)
- [App.jsx](/home/masahiro/projects/ai-driven-development-lesson/dashboard-control-center/src/App.jsx:1034)
- [App.jsx](/home/masahiro/projects/ai-driven-development-lesson/dashboard-control-center/src/App.jsx:6223)
- [tools/dashboard-data](/home/masahiro/projects/ai-driven-development-lesson/tools/dashboard-data:51)
- [DASHBOARD_DATA_SCHEMA.tsv](/home/masahiro/projects/ai-driven-development-lesson/docs/workflow/DASHBOARD_DATA_SCHEMA.tsv:30)

**ページ別の不整合**
| ページ | 現状の問題 |
|---|---|
| Overview | メニュータイルは表示だけ。選択しても全ページが切り替わらない |
| Lessons | 非レッスンメニューでも STEP 1-7 / STEP 1-14 / Advanced が固定表示される |
| Development Workflow | context strip は選択文脈だが、`recent_runs` や `product_authority` はグローバル |
| Maintenance Sync | 「同期と確認記録」が選択メニューではなくリポジトリ全体の保守証跡を表示 |
| Safety Actions | レッスン文脈と教材改善文脈が混ざる可能性がある |
| Documents | 選択メニューの文書ではなく、全体カタログ/成果物 authority が混ざる |
| Repository Info | 教材改善でも成果物リポジトリ authority が混ざる |
| History / Source | 「最近のワークフロー実行」が実履歴ではなく合成 snapshot 証拠に近い |

**改善方針**
最優先は、Dashboardを「選択メニューごとの作業面」に作り直すことです。

1. `App` に `activeMenuId` を持たせる
2. `MenuTileStrip` を実ボタン化し、クリック/キーボード操作で `activeMenuId` を更新する
3. `contexts_by_menu[activeMenuId]` を `activeContext` として全ページへ渡す
4. `viewData = { ...data, selected_context: activeContext }` のような派生データを使い、ページ全体を同じ文脈に揃える
5. `step_1_14` 固定 fallback をやめる
6. `recent_runs`、`maintenance.evidence_rows`、`source_files` に `menu_id` または `context_scope` を持たせる
7. 選択メニュー外の履歴・証跡・情報元は主表示へ出さず、診断/詳細枠へ分離する

**優先順位**
| 優先 | 対応 |
|---|---|
| P0 | メニュー選択を実データ選択にする |
| P0 | 教材改善メニューで成果物 repo authority が混ざる問題を分離する |
| P1 | `recent_runs` / `maintenance.evidence_rows` / `source_files` をメニュー別または scope 付きにする |
| P1 | Documents / Repository Info / Safety をメニュー別情報設計へ再編する |
| P2 | 「選択メニュー外の情報が主表示へ漏れない」テストを追加する |
| P3 | 非エンジニア向け文言へ整理し、内部証跡は詳細表示へ退避する |

この問題は、前回の「詳細ボタンが有益でない」問題よりさらに根本にあります。
まず **メニュー選択がDashboard全体の正本コンテキストになる仕組み** を作らないと、各ページの説明やポップアップを強化しても、表示対象が混ざったままになります。

## 追加前提: 現在アクティブなメニュー文脈

現在、開発者は本リポジトリ側で STEP 1-14 実践レッスンを進めており、隣の CLI では自由開発を進めています。

そのため、Dashboard Control Center の「進めるメニューを選択」が正しく実装された場合、少なくとも次の2つは選択可能な実データ文脈として正確に表示される必要があります。

- STEP 1-14 実践レッスン
- 自由開発

一方で、応用レッスン、成果物を改善、外部連携、教材そのものを改善などは、対応する開始状態、対象リポジトリ、作業対象、または必要設定が存在しない場合、選択できるように見せるべきではありません。選択不可の場合は、クリックまたはフォーカス時に「このレッスンは開始されていません」「対象となる外部リポジトリが見つかりません」「必要な設定が未完了です」など、ユーザーが次に何をすればよいか分かる短い通知を出す方針とします。

## 追加前提: 外部リポジトリ状態はユーザー申告ではなく実状態から判定する

Dashboard Control Center は、開発者が「隣の CLI で自由開発を進めている」と申告したから自由開発を有効扱いにするのではなく、外部リポジトリの実状態を正確に読み取って有効判定する必要があります。

自由開発、成果物改善、外部連携などの外部リポジトリ系メニューでは、設定済み product workspace、product profile、manifest、evidence、scaffold、Git 使用モード、CI 状態、安全確認、product-local skills/tools/check の有無を producer 側で読み取り、メニューごとに `selectable`、`disabled_reason`、`target_repository`、`evidence_status`、`git_usage_mode`、`required_next_action` を生成する方針とします。

外部リポジトリが存在し、必要な最小構成が読み取れる場合は選択可能にします。外部リポジトリが存在しない、未初期化、必要設定不足、対象作業未開始の場合は選択不可にし、ユーザーへ理由と次の行動を通知します。外部リポジトリは存在するが証拠未収集、不完全、壊れている、または安全確認が不足している場合は、選択可能でも `要確認` として表示します。

STEP 1-14 などのレッスン系メニューも同様に、レッスン状態ファイル、設定ファイル、承認状態、現在ステップを読み取って有効判定します。

この方針では、ユーザーの会話上の申告は一時的な補助情報に留め、Dashboard の正本表示は必ず既存の設定ファイル、外部リポジトリ、manifest、evidence、repo-local/product-local tools の読み取り結果に基づかせます。

本リポジトリ全体の今後の実装プランを、実装優先度の高い順に並べ替えて記録します。
優先度の基準は、(1) 現在のDashboard表示不整合を解消する前提になるか、(2) 製品リリース判断に直結するか、(3) 外部リポジトリ制御の安全性に直結するか、(4) 後続機能の土台になるか、です。

| 優先 | 領域 | 実装プラン | 現状 |
|---:|---|---|---|
| 1 | Dashboard | メニュー選択をDashboard全体の正本コンテキストにする | 未実装 |
| 2 | Dashboard | `activeMenuId` / `activeContext` を導入し、全ページを選択メニューに従わせる | 未実装 |
| 3 | Dashboard | `step_1_14` 固定 fallback を撤去し、実状態に基づく初期選択にする | 未実装 |
| 4 | Dashboard | 未開始・対象repoなし・設定不足メニューを選択不可にし、理由を通知する | 未実装 |
| 5 | Dashboard / 外部repo | 外部リポジトリ状態をユーザー申告ではなく実repo/manifest/evidenceから判定する | 未実装 |
| 6 | Dashboard / 外部repo | 自由開発・成果物改善・外部連携の対象repoを実状態から検出する | 未実装 |
| 7 | Dashboard | `recent_runs`、`maintenance.evidence_rows`、`source_files` を menu/context scope 付きにする | 未実装 |
| 8 | Dashboard | Documents / Repository Info で教材・成果物・本リポジトリ保守情報を混在させない | 未実装 |
| 9 | Dashboard | Playwright等で「選択メニュー外の情報が主表示へ漏れない」ことを検査する | 未実装 |
| 10 | Dashboard | Overviewを「状態一覧」から「次アクション判断ボード」にする | 未実装 |
| 11 | Dashboard | 保守・同期ページを、手動確認事項・証拠の意味・未収集影響が分かる形へ改訂する | 未実装 |
| 12 | Dashboard | Workflow / Safety を技術状態表示ではなく「進めてよいか」の判断UIへ改訂する | 未実装 |
| 13 | Dashboard | 詳細モーダルを、行ごとの原因・影響・復旧手順・関連証拠を出せる構造へ拡張する | 未実装 |
| 14 | 外部repo | 外部repo初期構成に `skills/`、`tools/`、`docs/product/`、`docs/workflow/`、`docs/design-system/`、`ops/` を標準搭載する | 一部実装済み、検証不足 |
| 15 | 外部repo | `product-development-workflow` を外部repo側の標準運用スキルとして機能させる | 基盤あり、実運用未完 |
| 16 | 外部repo | Settings の Git/CI 使用モードを外部repo gate まで一貫反映する | 一部実装済み、再検証必要 |
| 17 | 外部repo | `.git` なし / local Git / remote sync / CIあり の全モードで free-development gate を正しく動かす | 未検証 |
| 18 | Learner Context | `learner_context_foundation` を実装状態へ進める | `planned` |
| 19 | Learner Context | `learner_context_runtime_integration` を実装し、レッスン出力へ安全に接続する | `planned` |
| 20 | Design Studio | Event Runner を実装する | ローカル実行基盤実装済み |
| 21 | Design Studio | Request / Proposal Store を永続化する | ローカル永続化実装済み |
| 22 | Design Studio | サブスク型 / APIキー型 / 手動型 AI Agent Connection Layer を実装する | 手動/サブスク境界実装済み、APIキー実呼び出しは将来承認制 |
| 23 | Design Studio | imagegen連携によるモック生成をDashboardから扱えるようにする | 未実装 |
| 24 | Design Studio | モックの範囲選択編集、undo/redo、候補管理を実装する | 未実装 |
| 25 | Design Studio | モックからDesign System候補を抽出する | 未実装 |
| 26 | Design Studio | テンプレート保存・再利用・適用フローを実装する | 未実装 |
| 27 | Design Studio | 外部repoのDesign Systemを product-local adapter 経由で編集・計画・承認できるようにする | 未実装 |
| 28 | Evidence | `.git` なし外部repo向けの証拠保存・鮮度管理・product_head代替モデル | 将来承認制 |
| 29 | Product Profile | 成果物名・作業対象名の write path 化 | 将来承認制 |
| 30 | Security | product-security / Security guard の追加強化 | 将来承認制 |
| 31 | Dashboard Live | live Git/CI/network status、UI-triggered check、command execution | 将来承認制 |
| 32 | Workflow Automation | push、PR作成、merge、main CI待機、cleanup実行の自動化拡張 | 承認境界あり |
| 33 | テスト/CI | gap-only final gate、単一パス検証、Playwright重複削減などの高速化 | 将来承認制 |
| 34 | テスト/CI | changed-only CI を observe-only から権威ある判定へ昇格する | 将来承認制 |

**優先順位の考え方**
1. まず `activeMenuId / activeContext` と実状態ベースの選択可否を実装し、Dashboard全体の表示混在を止める。
2. 次に、外部リポジトリの実状態読み取りと menu/context scope 付きデータを整え、STEP 1-14 と自由開発を正しく表示できるようにする。
3. その後、Overview、保守・同期、Workflow、Safety、詳細モーダルを、判断・理由・リスク・次アクション中心に改訂する。
4. Dashboardの表示基盤が安定してから、外部repo scaffold、product-development-workflow、Git/CI mode gate の整合性を固める。
5. その後に learner context、Design Studio、AI/モック連携を進める。
6. 最後に、証拠ストア、live status、command execution、自動PR/merge、テスト/CI高速化などの承認境界が重い機能へ進む。

現時点で最初に実装すべき中核は、**Dashboardのメニュー選択、実状態ベースの選択可否、外部repo実状態判定、menu/context scope付きデータ** です。ここが直らない限り、どのページ改善も表示対象の混在問題を残します。

## 追加同期: 外部リポジトリ `AGENTS.MD` と運用モードの機械的制御

直近の壁打ちで追加された実装方針として、外部リポジトリを本体管理下でも単独運用でも安全に扱うため、単なるプロトコル記載ではなく scaffold、manifest/authority、CLI、Dashboard Settings、check/gate による機械的制御を導入する方針とします。

この追加方針は、既存の詳細実装プランでは主に次に接続します。

| 接続先 | 追加する観点 |
|---|---|
| 14. 外部repo初期構成の標準搭載 | 外部repo専用 `AGENTS.MD`、互換用 `AGENT.md`、manifest/authority、product-local skill/tool/check を標準生成する |
| 15. `product-development-workflow` の外部repo標準運用 | 外部repo単独運用時は外部repo `AGENTS.MD` を入口にし、本体管理下では本体 `AGENTS.MD` と外部repo `AGENTS.MD` の二層で運用する |
| 16. Settings の Git/CI 使用モード反映 | Settings へ外部repo運用モードを追加し、本体管理/単独運用/再接続/要修復を正本として扱う |
| 17. Git有無別 free-development gate | `.git` 有無だけでなく、運用モード、manifest、上位ルール接続、active run 整合を gate で確認する |
| 28. Gitなし外部repo証拠・鮮度管理 | `workflow_mode`、`managed_by_parent`、`last_parent_sync`、active run の鮮度を証拠として扱う |
| 30. product-security / Security guard 強化 | 外部repo `AGENTS.MD` 欠落、上位ルール接続欠落、台帳不一致、モード矛盾を安全上の停止条件にする |
| 31. Dashboard Live | Settings と診断画面で外部repo運用モード、接続状態、修復アクションを表示する |
| 32. Workflow Automation | attach/detach/reconnect、push/PR/merge/cleanup は運用モードと承認境界に従う |

### 外部repo `AGENTS.MD` の方針

外部repoには `AGENT.md` ではなく、エージェントが標準入口として読みやすい `AGENTS.MD` を必須生成します。`AGENT.md` は既存互換用として残す場合でも、主役にはせず、`AGENTS.MD` へ誘導する薄いファイルにします。

外部repo `AGENTS.MD` は本体リポジトリ `AGENTS.MD` のコピーではなく、外部repo単独運用に必要なローカル憲法として作ります。本体repo固有の不変ルール、STEP 1-7 / STEP 1-14 固有ルール、本体repoのCIやdocs導線の詳細を丸写ししません。

外部repo `AGENTS.MD` に記載する内容は、次を最小必須とします。

| 区分 | 内容 |
|---|---|
| Repository Role | このrepoが外部成果物repoであること |
| Immutable Rules | 既存機能とのトレードオフ禁止、破壊的操作の承認境界、機密情報保護、本体repoとの混在禁止 |
| Routing Table | 要件、仕様、実装計画、タスク、引き継ぎ、設計、検査、成果物、実行ログの参照先 |
| Workflow | `skills/product-development-workflow/SKILL.md` を読むこと |
| Product Docs | `docs/product/REQUIREMENTS.md`、`SPECIFICATION.md`、`IMPLEMENTATION_PLAN.md`、`docs/workflow/TASK_TRACKER.md`、`HANDOFF.md` |
| Tools | `tools/check-*`、`npm test`、`npm run doctor` など product-local 検査 |
| Parent Control | 本体repo管理下で動く場合は、本体repo `AGENTS.MD` が上位運用制約になること |
| Stop Conditions | 仕様衝突、ルール衝突、破壊的操作、権限不足、外部依存不備、親子状態不整合では停止して開発者承認を求めること |

### ルール参照の運用

| 状態 | エージェントが読むルール | 目的 |
|---|---|---|
| 本体repoから外部repoを開発・制御中 | 1. 本体 `AGENTS.MD` 2. 外部repo `AGENTS.MD` | 本体側の安全制約を上位に置きつつ、外部repo固有の作業ルールを使う |
| 外部repoを単独で保守・運用中 | 外部repo `AGENTS.MD` | 外部repoだけで迷わず作業できる |
| 外部repoが再び本体repo管理下に入る | 1. 本体 `AGENTS.MD` 2. 外部repo `AGENTS.MD` | 本体側のworkflow/gate/Settingsと再接続する |

外部repo `AGENTS.MD` は本体から独立して成立する必要があります。ただし、本体管理下では本体 `AGENTS.MD` と矛盾してはいけません。衝突時は安全側に停止し、開発者承認を求めます。

### 運用モード判定

`cwd` は補助情報に留め、最終判断は manifest/authority、本体管理台帳、active run 状態で機械的に行います。

| 判定材料 | 用途 |
|---|---|
| 実行入口 / cwd | 本体repo起動か外部repo起動かの初期推定 |
| 外部repo manifest/authority | `workflow_mode`、`managed_by_parent`、`parent_repository`、`active_parent_run` を確認 |
| 本体repo管理台帳 | 対象外部repoが現在本体管理下か確認 |
| 同期・承認状態 | `last_parent_sync`、handoff、task tracker、gate状態を確認 |

運用モードは次の4状態を正本とします。

| mode | 意味 |
|---|---|
| `parent_managed` | 本体repoのDashboard、Settings、workflow、gateから制御する |
| `standalone` | 外部repo自身の `AGENTS.MD`、skills、toolsで単独運用する |
| `reconnecting` | 単独運用中の外部repoを本体管理に戻す確認中 |
| `repair_required` | manifest、`AGENTS.MD`、本体台帳、active run が不整合で修復が必要 |

### 明示コマンドと Settings UI

ユーザーが細かい参照ルールを毎回指示しなくてもよいように、明示コマンドと Dashboard Settings で外部repo運用モードを切り替えられるようにします。

本体repo側 CLI の案:

```bash
./tools/product-repository-mode status --product /path/to/product
./tools/product-repository-mode attach --product /path/to/product
./tools/product-repository-mode detach --product /path/to/product
./tools/product-repository-mode reconnect --product /path/to/product
./tools/product-repository-mode check --product /path/to/product
```

外部repo側 CLI の案:

```bash
./tools/product-mode status
./tools/product-mode standalone
./tools/product-mode parent-managed --parent /path/to/parent
./tools/product-mode check
```

Dashboard Settings には「外部リポジトリ運用モード」を追加します。

| 表示 | 意味 |
|---|---|
| 本体管理 | 本体repoのDashboard、Settings、workflow、gateから制御する |
| 単独運用 | 外部repo自身の `AGENTS.MD`、skills、toolsで運用する |
| 再接続 | 単独運用中の外部repoを本体管理に戻す |
| 要修復 | manifest、`AGENTS.MD`、本体台帳、active run が不整合 |

モード切替時は確認画面を出し、attach/detach/reconnect の履歴を audit log として保存します。単独運用化、本体再接続、破壊的cleanup、push、merge、main CI待機は承認境界に従います。

### 機械的制御

| 制御 | 内容 |
|---|---|
| scaffold | 新規外部repo作成時に外部repo専用 `AGENTS.MD`、互換用 `AGENT.md`、manifest/authority、product-local skill/tool/check を生成する |
| migration | 既存外部repoに `AGENTS.MD` がない、`AGENT.md` しかない、manifest がない場合は修復候補を提示する |
| check | `AGENTS.MD` 欠落、上位ルール接続欠落、絶対パス固定、routing table 欠落、mode矛盾を検出する |
| gate | 欠落や矛盾があれば外部repo workflow を `要修復` または fail にする |
| Dashboard | 外部repoのルール接続状態、運用モード、修復候補、必要アクションを表示する |
| tests | scaffold生成、既存repo移行、欠落検出、モード切替、Dashboard表示、親子不整合検出を検査する |

### ユーザー操作の最小ルール

ユーザーが行うべきことは、原則として作業入口を選ぶことと、状態が曖昧なときに確認へ答えることだけにします。

| やりたいこと | ユーザー操作 |
|---|---|
| 本体リポジトリを開発する | 本体repoで起動する |
| 本体から外部repoを作成・制御する | 本体repoで起動し、Dashboard Settings または明示コマンドで本体管理にする |
| 外部repoを単独で保守する | 外部repoで起動し、単独運用モードで進める |
| 外部repoを本体管理へ戻す | 本体repoの Dashboard Settings または明示コマンドで再接続する |

`cd /home/masahiro/projects/ai-driven-development-lesson` なら本体管理下、`cd /home/masahiro/projects/frame-cue` なら単独運用、という判断は初期推定としては有効ですが、正本にはしません。最終判断は保存済みの `workflow_mode`、manifest/authority、本体管理台帳、active run 状態で行います。

## 追加記録: Dashboard Control Center セッションメモリ照合チェックリスト

記録日: 2026-06-16

このチェックリストは、セッションメモリに記録済みのDashboard Control Center改善要求と、現行コントロールパネルの実表示・生成データ・実装を照合した結果です。
後続実装では、各項目を実装・検証した時点で `[ ]` を `[x]` に更新し、未対応項目を残したまま「完了」と扱わないでください。

| ID | 状態 | 照合対象 | 記録済み期待 | 現行不整合 / 未反映内容 | 完了条件 |
|---|---|---|---|---|---|
| DCC-A01 | [x] | 全ページ共通コンテキスト | メニュー選択がDashboard全体の正本になり、全ページが同じ対象repo/作業文脈を表示する | `resolveActiveDashboardData` が選択メニューではなく producer の `selected_context` を使うため、ページごとに `task-tracker-repository` と `frame-cue` が混在する | `free-development` 選択時に Overview / Lessons / Workflow / Maintenance / Safety / Repository Info / Documents / Design Studio / Help / History の主表示から選択外repoが消える |
| DCC-A02 | [x] | メニュー選択 / 初期選択 | STEP 1-14 と自由開発は実状態から選択可能、未開始メニューは理由付きで選択不可 | 実データでは `free-development` の対象repoが `frame-cue` でも `selectable:false` / `not_run` になり押せない。`step_1_14` 初期寄せも残る | 実repoが存在し最小構成が読める外部repoメニューは選択可能かつ `要確認` 表示になり、未開始メニューは押せず理由と次アクションが出る |
| DCC-A03 | [x] | 外部repo実状態判定 | ユーザー申告ではなく profile / manifest / evidence / scaffold / Git / CI / security / product-local tools から判定する | `frame-cue` 側に `AGENTS.MD`、profile、index、mode があっても、Dashboardのメニュー可否と全ページ表示へ一貫反映されていない | `frame-cue` の実ファイル、運用モード、証拠状態、安全状態がDashboard snapshotに一貫して現れる |
| DCC-A04 | [x] | Repository Info | 選択中外部repoのファイル構成と各ファイルの役割を表示する | 自由開発文脈でも `task-tracker-repository` 側または未収集表示が残り、`frame-cue` の `AGENTS.MD` / `ops/PRODUCT_PROFILE.json` / `ops/REPOSITORY_INDEX.json` / `docs/product/*` が主表示されない | 選択repoの実ディレクトリ情報と役割説明だけが表示され、教材repoや別外部repoの情報が混ざらない |
| DCC-A05 | [x] | Documents | 選択メニュー・対象repoの文書だけを混在なく表示する | 文書カードはあるが、選択repoと文書根拠の対応が弱く、lesson/product/maintenance文脈の混在をUI上で判定しにくい | `free-development` では `frame-cue` product-local docs、lessonではlesson docsというように文書スコープが分離される |
| DCC-A06 | [x] | Lessons | 非レッスン文脈ではレッスン進行や固定STEP表示を出さない | 自由開発切替後もスナップショット未同期時にレッスン表示や `task-tracker-repository` が残る | 自由開発では「レッスンではない」扱いの専用表示になり、レッスン進行 2/3 などの誤表示が出ない |
| DCC-A07 | [x] | Development Workflow / recent runs | 実際の対象repoに紐づく履歴・実行証跡を表示する | `recent_runs` は固定行に生成時刻を入れており、実行履歴ではなく「時刻だけ更新される表示」に見える | 実測時刻、対象repo、実行/確認コマンド、証拠ファイル、結果、更新時刻を持つ履歴だけを表示する |
| DCC-A08 | [x] | Maintenance / Evidence | どんな保守・同期が行われ、何が未確認かをページ内で判断できる | `manual_followups` が上部判断材料として見えず、証拠詳細や参照が似た内容に見える。確認を外部コマンドへ逃がしている | 手動確認事項、証拠の必須/任意、未収集影響、行ごとの意味、更新日時を表示し、詳細は行固有にする |
| DCC-A09 | [x] | Safety | セキュリティゲート、承認、危険操作、失敗/ブロックをユーザー影響と復旧優先度で見せる | 技術状態・英語 producer 文言が残り、何を止めているのか、何が承認済みか、何が危険かが分かりにくい | 停止理由、承認状態、危険操作、復旧優先度、ユーザー影響、表示専用コマンドが分離して見える |
| DCC-A10 | [x] | Source / Tooltip / Detail | ファイルパスtooltipや詳細は各ファイル・各行の意味を説明する | 既知ファイル以外は汎用説明に落ち、証拠詳細・参照・ファイルパス説明が似た内容になる | ファイルごとの役割、行ごとの原因/影響/復旧/証拠/完了条件を表示し、意味のないリンクや押せないボタンをなくす |
| DCC-A11 | [x] | Help | 各項目の意味・役割・表示箇所・重要性・関連アクションを詳しく知れる | 用語数は多いが、詳細を開いても似た説明が多く、現在のブロッカーから見るべき項目へ誘導しない | カテゴリ、検索/絞り込み、現在文脈に関係する用語、具体例、関連ページ、次アクションを出す |
| DCC-A12 | [x] | History | 実態と同期した更新履歴・警告・snapshot情報を表示する | 長いIDや source count が読みにくく、警告がCLI実態と揃わず、合成snapshotのような情報が履歴に見える | 実更新時刻を秒単位で表示し、警告、source count、snapshot identity、対象repo、履歴の意味を明示する |
| DCC-A13 | [x] | Design Studio | 操作ルール別プレビュー、全体ライブプレビュー、外部repo design source連携を分けて見せる | 工程名やカードに英語混在があり、操作ルール別プレビュー不足。アイコン配置の視覚不整合も残る | 操作項目ごとのプレビュー、全体ライブプレビュー、外部repo design-system source、承認フローが分離される |
| DCC-A14 | [x] | 多言語表示 | 設定の学習・ワークフロー表示言語に従い、各国語表示で破綻しない | 日本語UI内に英語 producer 文言が残る箇所があり、長文/各国語/モバイルでの検証が薄い | i18n経由で主要文言を表示し、desktop/mobile/日本語/英語相当で折返しと意味を確認する |
| DCC-A15 | [x] | Playwright / 実表示検証 | 実producer snapshotと全ページ目視で、選択外情報漏れと判断UI品質を確認する | 既存Playwrightはfixture中心で、`frame-cue` 実snapshot、全ページmobile、各detail固有性、screenshot差分が不足 | 実 `tools/dashboard-data` とmockの両方で、全ページ・全メニュー・全detailの漏れ/混在/視認性を検証する |

### DCC-A11 完了記録

- 完了時刻: 2026-06-16
- 実装範囲: Help ページを現在の選択メニュー、対象リポジトリ、未解消項目、証跡件数、更新時刻に連動。現在文脈に関係する用語、検索、用語詳細の現在対象/選択メニュー/未解消項目を追加。
- 多言語注意: 日本語 UI で `Product authority` などの英語ラベルが主表示に残らないよう、成果物判定系の表示ラベルを日本語化。
- 検証: `npm run dashboard:build`、`./node_modules/.bin/playwright test --config=/tmp/dcc-playwright.config.js /tmp/dcc-playwright-tests/dcc-a11-help.spec.js`
- 目視スクリーンショット: `/tmp/dcc-a11-help.png`、`/tmp/dcc-a11-help-detail.png`

### DCC-A12 完了記録

- 完了時刻: 2026-06-16
- 実装範囲: History ページを選択中メニュー/対象リポジトリ、repository_scope、repository inventory warning、partial_failures、秒単位の workflow evidence に連動。snapshot ID / content hash / inventory hash は短縮表示とコピー可能な完全値に分離。
- 警告同期: top-level `warnings` だけでなく `repository_scope.inventory.warnings` を履歴ページへ集約し、`frame-cue` の repository index 未網羅警告を表示。
- 検証: `npm run dashboard:build`、`./node_modules/.bin/playwright test --config=/tmp/dcc-playwright.config.js /tmp/dcc-playwright-tests/dcc-a12-history.spec.js`
- 目視スクリーンショット: `/tmp/dcc-a12-history.png`、`/tmp/dcc-a12-history-detail.png`

### DCC-A13 完了記録

- 完了時刻: 2026-06-16
- 実装範囲: Design Studio に、選択中外部リポジトリ `frame-cue` の design-system source、操作項目ごとの小プレビュー、ページ全体のライブプレビュー、提案オーケストレーションの日本語ラベルを追加。
- 目視修正: ページ見出しサンプルの左アイコンに汎用 span スタイルが当たらないよう修正し、白色アイコンが背景中央に出ることを確認。
- 検証: `npm run dashboard:build`、`./node_modules/.bin/playwright test --config=/tmp/dcc-playwright.config.js /tmp/dcc-playwright-tests/dcc-a13-design-studio.spec.js`
- 目視スクリーンショット: `/tmp/dcc-a13-design-studio.png`

### DCC-A14 完了記録

- 完了時刻: 2026-06-16
- 実装範囲: 日本語UIに残っていた `Security ゲート`、`product workflow`、`Product Authority` 系の表示を i18n 経由の「安全ゲート」「成果物ワークフロー」「成果物判定」へ整理。`workflow_language` に基づく `html lang/dir` 同期を追加し、RTLロケールでも方向が反映されるようにした。
- 多言語注意: 英語UIは `en-US`、アラビア語UIは `ar-SA` / `rtl` でHTML属性を確認。その他ロケールは既存の共通語彙fallbackポリシーを維持。
- 検証: `npm run dashboard:build`、`./node_modules/.bin/playwright test --config=/tmp/dcc-playwright.config.js /tmp/dcc-playwright-tests/dcc-a14-multilingual.spec.js`
- 目視スクリーンショット: `/tmp/dcc-a14-ja-history.png`、`/tmp/dcc-a14-en-repository-info.png`、`/tmp/dcc-a14-ar-mobile-settings.png`

### DCC-A15 完了記録

- 完了時刻: 2026-06-16
- 実装範囲: 実 `DASHBOARD_SELECTED_MENU_ID=free-development ./tools/dashboard-data` snapshot を使い、Overview / Lessons / Workflow / Maintenance / Safety / Repository Info / Documents / Settings / Design Studio / Help / History のdesktop/mobile表示を横断確認。
- 追加修正: Repository Info の旧タスクトラッカー固定説明を成果物汎用説明へ変更。Design Studio の外部 design source チップがモバイルで横幅を押し広げないようCSSを修正。
- 検証: `npm run dashboard:build`、`./node_modules/.bin/playwright test --config=/tmp/dcc-playwright.config.js /tmp/dcc-playwright-tests/dcc-a15-full-visual.spec.js`
- 目視スクリーンショット: `/tmp/dcc-a15-desktop-*.png`、`/tmp/dcc-a15-mobile-*.png`、`/tmp/dcc-a15-detail-safety.png`
- 既存ゲート注意: `./tools/test_dashboard_control_center.sh` は `tools/test_dashboard_settings.sh` 内の `dashboard-settings catalog` が複数メニューで実 `tools/dashboard-data` を起動し続け、4分以上無出力だったため停止。A15の実表示検証はPASS済みだが、既存ゲートの高速化またはcatalog専用軽量経路は後続課題。
