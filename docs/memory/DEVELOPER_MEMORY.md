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

## Initialized state

No active follow-up items are currently recorded in this developer memory.

## Current dashboard and maintenance follow-ups

Maintenance status must reflect actual check results instead of leaving important synchronization items as fixed `unknown` values.
`成果物の同期` must be backed by `./tools/check_as_built_sync_contract.sh`.
`タスク管理と引き継ぎ` must be backed by `./tools/check_workflow_pair_sync.sh`.
When those checks pass and their results are represented in the dashboard snapshot, the corresponding user-facing state should become `同期済み`.

The `未確認` label is ambiguous for non-engineers because it can look like failure or unsynchronized data.
Maintenance status wording should distinguish `確認結果なし`, `手動確認待ち`, and `同期済み` where the underlying data allows that distinction.

Dashboard and lesson progress animation should be restrained.
Progress animations should run only once on initial display.
Numeric progress should use a simple count-up within one second.
Do not use icon scaling, fade effects, gradients, or shine effects for progress cards.

Progress cards in the dashboard and lesson pages should use white card backgrounds.
Progress bars, icons, and step chips should use solid colors rather than gradients.

Reference and source fields should support direct copying.
In `同期と確認記録` and `この表示の情報元`, file and command values should have copy buttons.
Long values should stay on one line with `...` truncation, and hover or keyboard focus should show the full value in a small tooltip.

`タスク管理と引き継ぎ` means the two-document pair `docs/workflow/TASK_TRACKER.md` and `docs/workflow/HANDOFF.md`.
Both documents must be considered together; one file alone is not enough to represent the pair.

During visual design adjustment, prefer Playwright screenshots and DOM checks for layout verification.
Do not run tests or CI during design tuning unless explicitly needed or requested.
