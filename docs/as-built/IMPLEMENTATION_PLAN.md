# IMPLEMENTATION_PLAN.md

## CI Composed Validation Activation Implementation Plan

1. Add semantic graph, exact-owner, proof-receipt, unsafe-command, and compatibility-context refusal tests.
2. Implement the provider-neutral CI graph loader, selector planner, owner runner, and proof adapter.
3. Move final-gap and fallback commands to policy-owned argument arrays.
4. Replace duplicate main-CI aggregate/full-hook executions with distributed owners and proof-only terminal jobs.
5. Preserve Lesson14 contexts with Lesson14-specific or proof-only work, then verify and promote the sync ID.

SYNC-ID: ci_composed_validation_activation
STATUS: implemented
ARTIFACTS: docs/workflow/AS_BUILT_SYNC_CONTRACT.tsv,docs/workflow/FINAL_GATE_EXECUTION_POLICY.tsv,docs/workflow/FINAL_GATE_CI_GRAPH.tsv,docs/workflow/FINAL_GATE_GAP_COMMANDS.tsv,docs/workflow/FINAL_GATE_COVERAGE.tsv,docs/workflow/TEST_PLAN_MANIFEST.tsv,docs/workflow/GIT_HOOK_CHECKS.tsv,docs/workflow/GIT_HOOK_PARALLEL_GROUPS.tsv,docs/workflow/SAFEFLOW_SECURITY_BACKFILL.tsv,docs/workflow/PRODUCT_SECURITY_POLICY.tsv,tools/lib/verification_core.mjs,tools/lib/as_built_index.mjs,tools/lib/ci_composition.mjs,tools/verification-ci,tools/ci-final-gate,tools/check_ci_workflow_structure.sh,tools/test_ci_pipeline_acceleration.sh,tools/check_repository_development_workflow.sh,tools/test_ci_final_gate.sh,tools/test_ci_composition.mjs,tools/test_ci_composition.sh,tools/test_verification_git_hooks.sh,tools/test_lesson_repository.sh,.github/workflows/ci.yml,.github/workflows/lesson14-ci.yml,docs/as-built/REQUIREMENTS.md,docs/as-built/SPECIFICATION.md,docs/as-built/IMPLEMENTATION_PLAN.md,docs/workflow/TASK_TRACKER.md,docs/workflow/HANDOFF.md
TESTS: tools/test_ci_composition.sh,tools/test_ci_final_gate.sh,tools/test_ci_pipeline_acceleration.sh,tools/check_ci_workflow_structure.sh,tools/test_verification_foundation.sh,tools/test_verification_git_hooks.sh,tools/test_ci_evidence.sh,tools/test_git_hooks.sh,tools/test_git_hooks_parallel.sh,tools/test_as_built_single_pass.sh,tools/test_as_built_sync_contract.sh,tools/check_repository_development_workflow.sh,tools/test_repository_development_workflow.sh,tools/check_test_plan_coverage.sh,tools/test_test_plan.sh,tools/check_security_invariants.sh,tools/test_security_invariants.sh,tools/test_dashboard_control_center.sh,tools/test_lesson_playwright.sh,tools/check_as_built_sync_contract.sh,tools/check_as_built_docs.sh,tools/check_workflow_pair_sync.sh

## Dashboard Control Center Same-Run Validation Implementation Plan

1. Add rejection-first manifest and same-run lineage tests.
2. Move build/browser verification values into the execution policy.
3. Put mutable Vite cache resolution behind a dependency-free fail-closed helper, under the ignored runtime root and outside the immutable source/config inventory.
4. Implement the generic build-manifest and browser-receipt owner.
5. Preserve strict standalone wrappers and declare safe composed relationships.
6. Complete focused and browser verification, then promote the sync ID.

SYNC-ID: dashboard_control_center_same_run_validation
STATUS: implemented
ARTIFACTS: docs/workflow/AS_BUILT_SYNC_CONTRACT.tsv,docs/workflow/FINAL_GATE_EXECUTION_POLICY.tsv,docs/workflow/TEST_PLAN_MANIFEST.tsv,docs/workflow/GIT_HOOK_CHECKS.tsv,docs/workflow/GIT_HOOK_PARALLEL_GROUPS.tsv,docs/workflow/FINAL_GATE_COVERAGE.tsv,docs/workflow/SAFEFLOW_SECURITY_BACKFILL.tsv,docs/workflow/PRODUCT_SECURITY_POLICY.tsv,vite.config.mjs,tools/lib/dashboard_vite_runtime.mjs,tools/lib/dashboard_verification.mjs,tools/check_dashboard_bundle_contract.mjs,tools/check_dashboard_bundle_contract.sh,tools/dashboard-verification,tools/test_dashboard_control_center.sh,tools/test_dashboard_same_run_verification.mjs,tools/test_dashboard_same_run_verification.sh,tools/test_verification_runner.mjs,tools/test_lesson_repository.sh,tools/test_ci_pipeline_acceleration.sh,.github/workflows/ci.yml,.github/workflows/lesson14-ci.yml,docs/as-built/REQUIREMENTS.md,docs/as-built/SPECIFICATION.md,docs/as-built/IMPLEMENTATION_PLAN.md,docs/workflow/TASK_TRACKER.md,docs/workflow/HANDOFF.md
TESTS: tools/test_dashboard_same_run_verification.sh,tools/check_dashboard_bundle_contract.sh,tools/test_dashboard_control_center.sh,tools/test_verification_runner.sh,tools/test_verification_foundation.sh,tools/test_verification_git_hooks.sh,tools/test_git_hooks.sh,tools/test_git_hooks_parallel.sh,tools/check_test_plan_coverage.sh,tools/test_test_plan.sh,tools/check_security_invariants.sh,tools/test_security_invariants.sh,tools/test_ci_pipeline_acceleration.sh,tools/check_ci_workflow_structure.sh,tools/check_as_built_sync_contract.sh,tools/check_as_built_docs.sh,tools/check_workflow_pair_sync.sh

## Local Exact-Once Verification Implementation Plan

1. Add rejection-first scheduler tests for rolling concurrency, deterministic replay, locks, timeouts, failure cancellation, process-tree cleanup, unsafe commands, duplicate providers, repository mutation, and final-gate ordering.
2. Move fixture exclusions and local executor values into the shared execution policy while retaining the current values.
3. Implement the generic scheduler, Git-hook adapter, shared full-run fingerprint, and batched version 1/version 2 receipt writers.
4. Add relationship validation and activate only the proven as-built documents-to-sync-contract provision.
5. Classify every compatibility hook explicitly; keep settings mutation serial and browser/build work heavy.
6. Compare legacy and composed plans in shadow tests, then select the composed runner for full/no-cache only.
7. Run focused runner, hook, evidence, final-gate, fixture, resource, test-plan, workflow, and document-sync checks before promotion.

SYNC-ID: verification_local_exact_once_activation
STATUS: implemented
ARTIFACTS: docs/workflow/AS_BUILT_SYNC_CONTRACT.tsv,docs/workflow/FINAL_GATE_EXECUTION_POLICY.tsv,docs/workflow/TEST_PLAN_MANIFEST.tsv,docs/workflow/GIT_HOOK_CHECKS.tsv,docs/workflow/GIT_HOOK_PARALLEL_GROUPS.tsv,docs/workflow/GIT_HOOK_RECOMMENDATION_PATHS.tsv,docs/workflow/FINAL_GATE_COVERAGE.tsv,docs/workflow/SAFEFLOW_SECURITY_BACKFILL.tsv,docs/workflow/PRODUCT_SECURITY_POLICY.tsv,tools/lib/verification_core.mjs,tools/lib/verification_runner.mjs,tools/lib/verification_git_hooks.mjs,tools/verification-runner,tools/git-hooks,tools/lib/ci_evidence.sh,tools/lib/fixture_copy.sh,tools/test_verification_runner.mjs,tools/test_verification_runner.sh,tools/test_verification_git_hooks.sh,tools/test_git_hooks_parallel.sh,tools/test_fixture_copy.sh,tools/test_ci_final_gate.sh,tools/lib/repository_development_runner.sh,tools/test_repository_development_workflow.sh,tools/test_lesson_repository.sh,tools/test_ci_pipeline_acceleration.sh,.github/workflows/ci.yml,.github/workflows/lesson14-ci.yml,docs/as-built/REQUIREMENTS.md,docs/as-built/SPECIFICATION.md,docs/as-built/IMPLEMENTATION_PLAN.md,docs/workflow/TASK_TRACKER.md,docs/workflow/HANDOFF.md
TESTS: tools/test_verification_runner.sh,tools/test_verification_git_hooks.sh,tools/test_git_hooks.sh,tools/test_git_hooks_parallel.sh,tools/test_fixture_copy.sh,tools/test_ci_evidence.sh,tools/test_ci_final_gate.sh,tools/check_repository_development_workflow.sh,tools/test_repository_development_workflow.sh,tools/check_security_invariants.sh,tools/test_security_invariants.sh,tools/check_test_plan_coverage.sh,tools/test_test_plan.sh,tools/test_ci_pipeline_acceleration.sh,tools/check_ci_workflow_structure.sh,tools/check_as_built_sync_contract.sh,tools/check_as_built_docs.sh,tools/check_workflow_pair_sync.sh

## As-Built Single-Pass Validation Implementation Plan

1. Add fixtures proving strict parity for valid state and rejection of missing blocks, mixed status, extra/missing artifacts and tests, unknown IDs, inactive wiring, malformed rows, and input mutation.
2. Implement a pure index loader with configurable root, contract, document, and wiring locators.
3. Implement a strict coordinator that runs document topics and synchronization metadata from one index and emits two distinct same-session results.
4. Keep the existing standalone entrypoints and output contract, using the new owner implementation with a policy-controlled legacy rollback.
5. Add the standalone regression to the Test Plan, aggregate test, Git hooks, final coverage, and CI syntax/regression paths.
6. Compare normalized old/new fixture outcomes and measure valid-repository execution before promotion.

SYNC-ID: as_built_single_pass_validation
STATUS: implemented
ARTIFACTS: docs/workflow/AS_BUILT_SYNC_CONTRACT.tsv,docs/workflow/FINAL_GATE_EXECUTION_POLICY.tsv,docs/workflow/TEST_PLAN_MANIFEST.tsv,docs/workflow/GIT_HOOK_CHECKS.tsv,docs/workflow/GIT_HOOK_PARALLEL_GROUPS.tsv,docs/workflow/GIT_HOOK_RECOMMENDATION_PATHS.tsv,docs/workflow/FINAL_GATE_COVERAGE.tsv,tools/lib/verification_core.mjs,tools/lib/as_built_index.mjs,tools/check_as_built_sync_contract.mjs,tools/check_as_built_sync_contract.sh,tools/as-built-sync,tools/test_as_built_single_pass.mjs,tools/test_as_built_single_pass.sh,tools/test_lesson_repository.sh,tools/test_ci_pipeline_acceleration.sh,.github/workflows/ci.yml,.github/workflows/lesson14-ci.yml,docs/as-built/REQUIREMENTS.md,docs/as-built/SPECIFICATION.md,docs/as-built/IMPLEMENTATION_PLAN.md,docs/workflow/TASK_TRACKER.md,docs/workflow/HANDOFF.md
TESTS: tools/check_as_built_sync_contract.sh,tools/check_as_built_docs.sh,tools/test_as_built_sync_contract.sh,tools/test_as_built_single_pass.sh,tools/check_test_plan_coverage.sh,tools/test_test_plan.sh,tools/test_git_hooks.sh,tools/test_git_hooks_parallel.sh,tools/test_ci_final_gate.sh,tools/test_ci_pipeline_acceleration.sh,tools/check_ci_workflow_structure.sh,tools/check_workflow_pair_sync.sh

## Verification Composition Foundation Implementation Plan

1. Add rejection tests for malformed policy, unsafe arguments, duplicate IDs, cycles, content-only dirty changes, untracked files, symbolic-link changes, duplicate receipt claims, provenance mismatch, forbidden evidence fields, and absolute-path leakage.
2. Implement pure standard-library modules for policy loading, canonical command identity, repository content fingerprinting, version 2 receipts, and equivalence decisions.
3. Add a standalone CLI so the same core is callable by focused tests, Git hooks, CI adapters, and later composed runners.
4. Add version 2 recording beside existing version 1 evidence in `record-only` mode without changing current pass/fail decisions.
5. Compare dynamically derived compatibility counts and command identities with the existing hook and final-gate sources; do not encode observed counts as constants.
6. Run focused evidence, final-gate, security, test-plan, document-sync, and repository-workflow checks.
7. Promote this sync ID only after rejection tests and legacy compatibility checks pass. Roll back by selecting `legacy`; do not delete version 1 evidence or existing entrypoints.

The next slices remain inactive until this foundation is implemented: single-pass as-built validation, local exact-once execution, same-run Dashboard build/browser validation, and composed CI activation.

SYNC-ID: verification_composition_foundation
STATUS: implemented
ARTIFACTS: docs/workflow/AS_BUILT_SYNC_CONTRACT.tsv,docs/workflow/FINAL_GATE_EXECUTION_POLICY.tsv,docs/workflow/FINAL_GATE_EVIDENCE_SCHEMA.tsv,docs/workflow/TEST_PLAN_MANIFEST.tsv,docs/workflow/GIT_HOOK_CHECKS.tsv,docs/workflow/GIT_HOOK_PARALLEL_GROUPS.tsv,docs/workflow/GIT_HOOK_RECOMMENDATION_PATHS.tsv,docs/workflow/FINAL_GATE_COVERAGE.tsv,docs/workflow/SAFEFLOW_SECURITY_BACKFILL.tsv,docs/workflow/PRODUCT_SECURITY_POLICY.tsv,tools/lib/verification_core.mjs,tools/verification,tools/lib/ci_evidence.sh,tools/test_verification_foundation.mjs,tools/test_verification_foundation.sh,tools/test_ci_evidence.sh,tools/test_ci_pipeline_acceleration.sh,tools/test_lesson_repository.sh,.github/workflows/ci.yml,.github/workflows/lesson14-ci.yml,docs/as-built/REQUIREMENTS.md,docs/as-built/SPECIFICATION.md,docs/as-built/IMPLEMENTATION_PLAN.md,docs/workflow/TASK_TRACKER.md,docs/workflow/HANDOFF.md
TESTS: tools/test_verification_foundation.sh,tools/test_ci_evidence.sh,tools/test_ci_final_gate.sh,tools/test_ci_pipeline_acceleration.sh,tools/check_security_invariants.sh,tools/test_security_invariants.sh,tools/check_test_plan_coverage.sh,tools/test_test_plan.sh,tools/test_git_hooks.sh,tools/check_ci_workflow_structure.sh,tools/check_as_built_sync_contract.sh,tools/check_as_built_docs.sh,tools/check_workflow_pair_sync.sh

## Implemented Plan

1. Record developer feedback in `docs/memory/DEVELOPER_MEMORY.md`.
2. Add documentation and protocol updates for 14-day lesson facilitation.
3. Add mechanical approval enforcement for `tools/lesson14`.
4. Add learning-mode recording and switching for 7-day and 14-day lessons.
5. Add learner-selected start position support for 7-day and 14-day flows.
6. Add a reset path for 14-day runtime state.
7. Add `tools/check_developer_memory_requirements.sh`.
8. Add `tools/test_lesson_start_position.sh`.
9. Add `tools/test_production_operations.sh` for explicit real product operations testing.
10. Keep `task-tracker-repository` deleted unless a product operations test is explicitly requested.
11. Add Free Development Mode.
12. Add Team Development and Docker advanced module.
13. Add `advanced/DOCKER_PATHS.md` for Docker-installed and no-Docker learning paths.
14. Add dialogue and sub-agent orchestration as core lesson content.
15. Harden CI status checks with GitHub API retry and REST fallback.
16. Add `tools/check_as_built_docs.sh`.
17. Add `reviews/SUBAGENT_REVIEW_PROTOCOL.md` and `tools/check_review_protocol.sh`.
18. Add `tools/list_non_english_docs.sh` for translation audit support.
19. Add `tools/test_lesson_repository.sh` as the lesson-side aggregate test.
20. Add learner-facing menu, dashboard, and illustration review entry points.
21. Add safe product repository cleanup for the external product repository created by the structured lessons.
22. Add the as-built sync contract, validator, status command, and regression tests for the three design/as-built documents plus `TASK_TRACKER.md` and `HANDOFF.md`.
23. Synchronize as-built lesson documentation in:
    - `docs/as-built/REQUIREMENTS.md`
    - `docs/as-built/SPECIFICATION.md`
    - `docs/as-built/IMPLEMENTATION_PLAN.md`
    - `docs/workflow/TASK_TRACKER.md`
    - `docs/workflow/HANDOFF.md`
22. Add workflow display language and product development language settings for 7-day and 14-day lessons.
23. Expand supported standard language choices to `ja`, `en`, `ko`, `zh-CN`, `zh-TW`, `es`, `pt-BR`, `fr`, `de`, `id`, `vi`, `th`, `hi`, and `ar`, while preserving `zh` as a `zh-CN` alias and keeping `custom` values available.
24. Add `tools/test_lesson.sh` for 7-day setup gating and setting regression coverage.
25. Preserve existing behavior while keeping additions refactorable, reusable, ecosystem-friendly, and general.
26. Implement menu prerequisite control for menu items 1 through 6.
27. Rename learner-facing menu item 3 to `3. 応用レッスン`.
28. Add `tools/product-improvement status|start|gate`.
29. Add dashboard readiness output for menu items 1 through 6.
30. Add `tools/test_menu_prerequisites.sh` and wire it into aggregate tests, CI, and pre-commit.
31. Add `tools/product-repository-cleanup` for safe external product repository cleanup.
32. Add `tools/test_product_repository_cleanup.sh` and wire it into structure checks, as-built checks, developer-memory checks, aggregate tests, CI, and pre-commit.
33. Add Git workflow policy settings, `tools/git-workflow`, and `tools/test_git_workflow_policy.sh` for configurable branch, worktree, automation, monitoring, and cleanup-plan behavior.

## Implemented Remediation Plan

This plan implements the developer-memory audit.
It is additive and must not trade away existing 7-day lessons, 14-step lessons, free-development flow, advanced modules, existing checks, or repository-boundary behavior.

1. Add shared document-path support.
   - Add a reusable document path layer for design/as-built documents, workflow-state documents, and memory/decision documents.
   - Update tools to consume the shared path layer instead of hard-coding root-level paths.

2. Safely migrate role-specific Markdown documents.
   - Keep `AGENTS.MD` at the repository root.
   - Move design/as-built documents into a design/as-built directory.
   - Move workflow-state documents into a workflow/progress directory.
   - Move developer memory and related memory documents into a memory/decision directory.
   - Update references in README, AGENTS, guides, prompts, skills, dashboard, checks, CI, and tests.
   - Remove final root-level role-specific copies only after references and checks are updated.

3. Replace learner-facing `Day` labels with `Step` labels.
   - Update learner-facing guides, roadmap, prompts, runtime output, dashboard text, and reusable guidance.
   - Keep internal IDs and state-file values stable where technically necessary.
   - Add checks that prevent old learner-facing `Day N` labels from returning.

4. Hide internal IDs in learner-facing output.
   - Add or reuse display-label mapping for internal step IDs.
   - Show internal IDs only in copy-paste command blocks, debug output, raw state files, or developer diagnostics.
   - Validate dashboard/status output against this rule.

5. Implement language settings.
   - Add workflow display language state for 7-day and 14-day lessons.
   - Add product development language state for 7-day and 14-day lessons.
   - Add CLI commands and status output for both settings in `tools/lesson` and `tools/lesson14`.
   - Add a shared supported-language list and language normalizer in `tools/lib/lesson_common.sh`.
   - Show both settings in dashboard output where relevant.
   - Add tests for selection, switching, and required prompts before product development.

6. Enforce learning-mode display names.
   - Preserve A/B/C internal IDs.
   - Display `じっくり説明`, `ほどよく説明`, and `手順だけ` in learner-facing output.
   - Update guides, prompts, dashboard, and tests.

7. Strengthen approval gates.
   - Require start approval before start.
   - Require pass approval before pass.
   - Validate approval/action ordering and pairing.
   - Add negative tests for missing or mismatched approvals.

8. Improve passage prompts and command-block explanations.
   - Ensure pass/start prompts invite questions.
   - Add short explanations before copy-paste command blocks.
   - Add checks for reusable guidance text.

9. Enforce paired `docs/workflow/TASK_TRACKER.md` and `docs/workflow/HANDOFF.md` synchronization.
   - Add a workflow-pair synchronization checker.
   - Validate compatible current state, next action, and restart context.
   - Detect one-sided workflow-state updates without an explicit reason.
   - Surface pair status in dashboard output.

10. Strengthen as-built synchronization.
    - Update checks so the five as-built documents agree on current status, completed work, remaining work, test evidence, and known gaps.
    - Keep topic checks only as a supporting signal, not the primary pass condition.

11. Expand the CLI dashboard.
    - Lesson view shows current step, progress, 7-day and 14-day learning-mode labels, workflow display language, product development language where relevant, helpdesk/question records, developer-memory open items, next approval, sync-gate status, and illustration availability.
    - Development view shows product repository, current objective, workflow document status, paired tracker/handoff synchronization, developer-memory items, Git status, real CI status when available, and next recommended action.
    - Keep dashboard data reusable for a future browser dashboard.

12. Complete illustration request and review support.
    - Expand illustration metadata with learning mode, display language, source explanation, summary, key terms, and generation timestamp.
    - Add a command path to mark requested illustrations as available after generated PNG assets are provided.
    - Avoid non-ASCII topic path collisions.
    - Update the review page to read records and display ordered review material with explanatory text.

13. Add an external-integration CLI path.
    - Add `status`, `start`, and `gate` actions.
    - Support both post-Free-Development progression and direct use with an existing product repository.
    - Check product scope documents (`REQUIREMENTS.md`, `SPECIFICATION.md`, and `IMPLEMENTATION_PLAN.md`), product boundary, paired workflow documents, Git sync, and CI where applicable.

14. Introduce lesson-repository Playwright checks.
    - Add Playwright setup for dashboard and illustration-review pages.
    - Keep CLI checks and documentation checks active.
    - Require browser checks after `npm install` in CI, pre-commit, and aggregate tests.

15. Wire strengthened checks into CI and pre-commit.
    - Add new checks to the aggregate lesson repository test.
    - Add critical checks, product-gate tests, Playwright checks, and aggregate tests to pre-commit.
    - Add aggregate validation to CI without removing existing CI jobs.

16. Expand Free Development and Team Development gate tests.
    - Add missing-product-repository tests.
    - Add dirty-Git-state tests.
    - Add CI-failure tests.
    - Add Docker installed/not-installed path tests.
    - Add status/start output tests.

## Implemented Menu Prerequisite Implementation

This additive implementation is synchronized across `docs/as-built/REQUIREMENTS.md`, `docs/as-built/SPECIFICATION.md`, `docs/as-built/IMPLEMENTATION_PLAN.md`, `docs/workflow/TASK_TRACKER.md`, and `docs/workflow/HANDOFF.md`.
It preserves existing features without tradeoffs and follows the repository quality constraints for refactorability, ecosystem fit, reusability, and generality.

1. Rename the learner-facing menu item.
   - Change `3. 発展・応用レッスン` to `3. 応用レッスン`.
   - Keep the existing Team Development and Docker entry available through the renamed applied-learning item.
   - Add a check that prevents the old learner-facing label from returning.

2. Define one prerequisite model for menu items 1 through 6.
   - Require learning mode.
   - Require workflow display language.
   - Require product development language.
   - Require repository context and boundary confirmation where the item touches a product repository.
   - Require learner approval before start.

3. Reuse existing structured-lesson settings.
   - Keep 7-day settings stored in the current 7-day state files.
   - Keep 14-day settings stored in the current 14-day state files.
   - Preserve the expanded standard language list, `zh` compatibility alias, and `custom` flexibility.

4. Add a shared settings and prerequisite layer.
   - Add shared reusable helper functions in `tools/lib/lesson_common.sh`.
   - Provide a shared settings view for applied-learning, Free Development Mode, product improvement, and external integration.
   - Inherit the most recently configured 7-day or 14-day settings when available.
   - Fail start/gate/check commands with learner-friendly guidance when required settings are missing.

5. Preserve discoverability.
   - Keep `status` commands non-blocking so learners can inspect menu items before configuring everything.
   - Enforce prerequisites in start, gate, or explicit menu-check commands.

6. Add or formalize product improvement control.
   - Add `tools/product-improvement status|start|gate`, or an equivalent reusable product-improvement gate.
   - Treat product improvement as the bridge between Free Development Mode and external integration.
   - Require product development language for product-facing edits.

7. Expand dashboard readiness.
   - Show readiness for menu items 1 through 6.
   - Include learning mode, workflow display language, product development language, repository context, approval status, and next recommended action.
   - Preserve existing lesson, development, developer-memory, and illustration dashboard information.

8. Synchronize documentation and checks.
   - Update the five planning/workflow documents.
   - Update developer memory, README/menu guidance, AGENTS routing, and related checks.
   - Keep unrelated existing content unchanged.

9. Verify with tests.
   - Run existing lesson and repository checks.
   - Add targeted tests for the renamed menu label and missing-prerequisite failure paths.
   - Confirm existing 7-day and 14-day flows still pass.
   - Confirm Free Development Mode, Team Development, external integration, dashboard, and product gates remain available.

## Implemented Documentation Map Implementation Plan

This additive implementation is complete and synchronized across `docs/as-built/REQUIREMENTS.md`, `docs/as-built/SPECIFICATION.md`, `docs/as-built/IMPLEMENTATION_PLAN.md`, `docs/workflow/TASK_TRACKER.md`, and `docs/workflow/HANDOFF.md`.
It preserves existing features without tradeoffs and follows the repository quality constraints for refactorability, ecosystem fit, reusability, and generality.

1. Add a learner-facing documentation map guide.
   - Created `guides/DOCUMENT_MAP.md`.
   - Explained rules/routing, design/as-built, workflow state, memory/decisions, and skills as separate categories.
   - Used non-engineer-friendly explanations while keeping repository source text in English.

2. Explain the agent rule and routing layer.
   - Explained `AGENTS.MD` as the lesson-side rulebook for agents.
   - Covered invariant rules, document root, routing table, and repo-local skills.
   - Explicitly distinguished lesson-side `AGENTS.MD`, legacy product-side `AGENT.md`, and the planned product-side `AGENTS.MD` transition.

3. Explain design, workflow, and memory documents.
   - Explained `docs/as-built/REQUIREMENTS.md`, `docs/as-built/SPECIFICATION.md`, and `docs/as-built/IMPLEMENTATION_PLAN.md`.
   - Explained `docs/workflow/TASK_TRACKER.md` and `docs/workflow/HANDOFF.md` as a synchronized pair.
   - Explained `docs/workflow/GIT_HOOKS_POLICY.tsv`, `docs/workflow/GIT_HOOK_CHECKS.tsv`, and `learning/GIT_HOOK_SETTINGS.tsv` as the Git hook policy and current local hook-mode controls.
   - Explained `docs/memory/DEVELOPER_MEMORY.md` and `docs/memory/SESSION_MEMORY.md`.
   - Explained product-side `FAILURE_MEMORY.md` and failure-recovery records without implying a lesson-side `docs/memory/FAILURE_MEMORY.md` exists.

4. Add a CLI tour command.
   - Added `tools/docs-tour`.
   - Support `status`, `rules`, `design`, `workflow`, `memory`, `skills`, and `all`.
   - Adapt explanation depth to learning modes A/B/C.

5. Add a dashboard docs view.
   - Added `./tools/dashboard docs`.
   - Included the docs view in `./tools/dashboard all`.
   - Show categories, key files, current workflow relevance, workflow-pair sync, as-built sync, and next recommended document action.

6. Add copy-paste prompt examples.
   - Added document-understanding prompts to the prompt files.
   - Included prompts for explaining `TASK_TRACKER`/`HANDOFF` and the as-built trio in learner-friendly language.

7. Add early lesson guidance.
   - Added non-disruptive guidance to 7-day and 14-day lesson materials so learners encounter the document map before document-heavy work.
   - Preserve ordered lesson progression and approval gates.

8. Add mechanical validation.
   - Added `tools/check_document_root.sh`.
   - Added `tools/test_docs_tour.sh`.
   - Updated structure checks, as-built checks, developer-memory checks, dashboard tests, aggregate tests, CI, and pre-commit as needed.
   - Ensure checks fail if `docs/**/*.md` cannot be reached from `AGENTS.MD` or `guides/DOCUMENT_MAP.md`, if `skills/*/SKILL.md` is not routed from `AGENTS.MD`, if skill `references/*.md` files are not routed by their parent skill, or if `guides/DOCUMENT_MAP.md`, `tools/docs-tour`, `dashboard docs`, prompt examples, or the synchronized planning/workflow entries are missing.
   - `guides/DOCUMENT_MAP.md`, `tools/docs-tour`, `tools/check_document_root.sh`, `tools/test_docs_tour.sh`, and `./tools/dashboard docs` are now expected to exist in runtime.
   - Validation is wired through `tools/check_document_root.sh`, `tools/test_docs_tour.sh`, structure checks, as-built checks, developer-memory checks, dashboard or Playwright tests, aggregate tests, CI, and pre-commit.
   - The validation suite must preserve existing 7-day, 14-day, menu, dashboard, Free Development, Product Improvement, external-integration, product-gate, Playwright, CI, and pre-commit behavior.

9. Verify with existing and new tests.
   - Run the existing lesson-side verification sequence.
   - Run the document-root check.
   - Run the new docs-tour test.
   - Confirm existing 7-day, 14-day, menu, dashboard, free-development, product-improvement, external-integration, product-gate, Playwright, CI, and pre-commit behavior remains available.

## Implemented Product Repository Cleanup Implementation Plan

This additive implementation is complete and synchronized across `docs/as-built/REQUIREMENTS.md`, `docs/as-built/SPECIFICATION.md`, `docs/as-built/IMPLEMENTATION_PLAN.md`, `docs/workflow/TASK_TRACKER.md`, and `docs/workflow/HANDOFF.md`.
It preserves existing features without tradeoffs and follows the repository quality constraints for refactorability, ecosystem fit, reusability, and generality.

1. Add a dedicated cleanup command.
   - Added `tools/product-repository-cleanup`.
   - Support `status`, `plan`, `local`, and `remote` subcommands.
   - Keep the command focused on the external product repository configured by the lesson settings.

2. Implement non-destructive status and plan views.
   - `status` prints the configured product repository path, local existence, Git status, repository-name match, nested-repository safety, remote URL, and remote existence when safely checkable.
   - `plan` prints the local and remote cleanup procedure without deleting anything.
   - Both commands remain safe to run without confirmation.

3. Implement local cleanup safety gates.
   - Require a command shape such as `tools/product-repository-cleanup local --confirm task-tracker-repository`.
   - Reject deletion when confirmation is missing or does not match the configured product repository name.
   - Reject deletion when the target path is inside the lesson repository.
   - Reject deletion when the target path is not the configured external product repository path.
   - Reject deletion when the target is not a Git repository, lacks `.git`, is not the Git top level, or cannot be identified safely.
   - Print a clear operation log before and after local deletion.

4. Implement remote cleanup safety gates.
   - Require a command shape such as `tools/product-repository-cleanup remote --confirm xxxMasahiro/task-tracker-repository`.
   - Require GitHub authentication and a successful remote repository lookup before any deletion attempt.
   - Show the owner/repository name and remote URL immediately before deletion.
   - Reject deletion when the confirmation text does not exactly match the full owner/repository name.
   - Print a clear operation log before and after remote deletion.

5. Keep destructive operations separated.
   - Do not add an `all` command.
   - Do not chain local and remote deletion automatically.
   - Do not infer deletion targets from loose user text.

6. Add mechanical validation.
   - Added `tools/test_product_repository_cleanup.sh`.
   - Test status and plan behavior.
   - Test missing-confirmation and wrong-confirmation failures.
   - Test nested repository rejection.
   - Test non-Git target rejection.
   - Test local cleanup using temporary repositories only.
   - Test remote paths with fake `gh` behavior, never by deleting a real GitHub repository.
   - `tools/product-repository-cleanup` and `tools/test_product_repository_cleanup.sh` are required runtime artifacts.

7. Wire validation into existing checks.
   - Updated structure checks.
   - Updated as-built checks.
   - Updated developer-memory checks.
   - Added the new test to aggregate tests, CI, and pre-commit.
   - Preserved existing 7-day, 14-day, menu, dashboard, Free Development, Product Improvement, external-integration, product-gate, Playwright, docs-tour, CI, and pre-commit behavior.

8. Synchronize related guidance after implementation.
   - Updated the five planning/workflow documents from planned to implemented state.
   - Updated `AGENTS.MD`, README/menu guidance, and dashboard output only where the cleanup command is part of runtime behavior.
   - Kept unrelated existing content unchanged.

9. Verify local, remote, and CI consistency.
   - Run the new cleanup test.
   - Run the existing lesson-side verification sequence.
   - Run pre-commit.
   - Commit and push only after all local checks pass.
   - Confirm `CI` and `Lesson14 CI` succeed for the pushed commit.
   - Confirm local HEAD, `origin/main`, and the CI target SHA match.

## Implemented As-Built Sync Contract Implementation Plan

This additive implementation strengthens mechanical enforcement across the three design/as-built documents and the two workflow-state documents.
It preserves existing checks and does not trade away any current 7-day, 14-day, menu, dashboard, documentation-map, product-gate, product-repository cleanup, CI, pre-commit, or developer-memory behavior.

1. Add a synchronization contract file.
   - Added `docs/workflow/AS_BUILT_SYNC_CONTRACT.tsv`.
   - Record each synchronized improvement with `sync_id`, `status`, `title`, `required_artifacts`, `required_tests`, `required_docs`, and `runtime_evidence`.
   - Keep the format simple enough for shell-based checks and future dashboard reuse.

2. Add matching sync blocks to the five synchronized documents.
   - Added `SYNC-ID`, `STATUS`, `ARTIFACTS`, and `TESTS` blocks to `docs/as-built/REQUIREMENTS.md`.
   - Added the same blocks to `docs/as-built/SPECIFICATION.md`.
   - Added the same blocks to `docs/as-built/IMPLEMENTATION_PLAN.md`.
   - Added the same blocks to `docs/workflow/TASK_TRACKER.md`.
   - Added the same blocks to `docs/workflow/HANDOFF.md`.
   - Preserved existing headings and narrative content; added contract metadata without deleting unrelated content.

3. Add a dedicated contract validator.
   - Added `tools/check_as_built_sync_contract.sh`.
   - Validate that every contract `sync_id` exists in all five documents.
   - Validate that no synchronized document contains a `SYNC-ID` block missing from the contract.
   - Validate that all five documents use the same `STATUS` for each `sync_id`.
   - Validate that document `ARTIFACTS` and `TESTS` blocks exactly match the contract without extra or missing entries.
   - Validate that required artifacts and required tests exist in the repository.
   - Validate that runtime evidence files exist and reference the sync ID, one of its artifacts, or one of its tests.
   - Validate that implemented sync IDs have their required tests actively wired into aggregate tests, CI, and pre-commit.
   - Fail if a `planned` status and an `implemented` status are mixed for the same `sync_id`.

4. Preserve and extend existing checks.
   - Call the validator from `tools/check_as_built_docs.sh`.
   - Keep the current topic-based as-built checks as compatibility checks.
   - Keep `tools/check_workflow_pair_sync.sh` active for `TASK_TRACKER.md` and `HANDOFF.md`.
   - Do not replace existing checks with the new contract; make the contract an additional gate.

5. Add a status helper for learners and agents.
   - Added `tools/as-built-sync status`.
   - Show all sync IDs, current status, five-document coverage, artifact presence, and test-wiring status.
   - Keep output useful for both CLI learners and future dashboard reuse.

6. Add regression tests.
   - Added `tools/test_as_built_sync_contract.sh`.
   - Test a fully synchronized contract.
   - Test failure when one of the five documents lacks a sync block.
   - Test failure when a synchronized document contains an unknown sync ID.
   - Test failure when statuses are mixed across documents.
   - Test failure when a document contains extra artifacts or tests not listed in the contract.
   - Test failure when a required artifact is missing.
   - Test failure when an implemented required test is only mentioned as inert text or is not actively wired into aggregate tests, CI, or pre-commit.

7. Wire verification into existing gates after implementation.
   - Added the new test to `tools/test_lesson_repository.sh`.
   - Added the validator and test to `.githooks/pre-commit`.
   - Added shell syntax and regression steps to `.github/workflows/ci.yml`.
   - Added shell syntax and regression steps to `.github/workflows/lesson14-ci.yml`.
   - Added `AGENTS.MD` routing and standard-check references for the sync-contract status and validator.
   - Updated runtime checks only where they became enforcement.
   - Run targeted checks, aggregate tests, pre-commit, and GitHub Actions before declaring implementation complete.

## As-Built Sync Contract Records

```text
SYNC-ID: documentation_map
STATUS: implemented
ARTIFACTS: guides/DOCUMENT_MAP.md, tools/docs-tour, tools/check_document_root.sh, tools/test_docs_tour.sh
TESTS: tools/test_docs_tour.sh, tools/check_agents_skills.sh

SYNC-ID: menu_prerequisite_control
STATUS: implemented
ARTIFACTS: tools/menu, tools/test_menu_prerequisites.sh
TESTS: tools/test_menu_prerequisites.sh

SYNC-ID: product_repository_cleanup
STATUS: implemented
ARTIFACTS: tools/product-repository-cleanup, tools/test_product_repository_cleanup.sh
TESTS: tools/test_product_repository_cleanup.sh

SYNC-ID: as_built_sync_contract
STATUS: implemented
ARTIFACTS: docs/workflow/AS_BUILT_SYNC_CONTRACT.tsv, tools/check_as_built_sync_contract.sh, tools/as-built-sync, tools/test_as_built_sync_contract.sh
TESTS: tools/check_as_built_sync_contract.sh, tools/test_as_built_sync_contract.sh
NOTE: `tools/as-built-sync status` caches repeated active-command and Git hook runner lookups so status reporting remains usable as the sync contract grows; output and pass/fail semantics stay unchanged.

SYNC-ID: git_workflow_policy
STATUS: implemented
ARTIFACTS: docs/workflow/GIT_WORKFLOW_POLICY.tsv, learning/GIT_WORKFLOW_SETTINGS.tsv, tools/lib/git_workflow_policy.sh, tools/git-workflow, tools/test_git_workflow_policy.sh
TESTS: tools/test_git_workflow_policy.sh

SYNC-ID: menu_git_workflow_policy
STATUS: implemented
ARTIFACTS: tools/menu, tools/dashboard, tools/git-workflow, tools/test_menu_prerequisites.sh
TESTS: tools/test_menu_prerequisites.sh

SYNC-ID: git_workflow_action_settings
STATUS: implemented
ARTIFACTS: docs/workflow/GIT_WORKFLOW_POLICY.tsv, learning/GIT_WORKFLOW_SETTINGS.tsv, learning/GIT_WORKFLOW_APPROVALS.tsv, tools/lib/git_workflow_policy.sh, tools/git-workflow, tools/menu, tools/dashboard, tools/test_git_workflow_policy.sh, tools/test_menu_prerequisites.sh
TESTS: tools/test_git_workflow_policy.sh, tools/test_menu_prerequisites.sh

SYNC-ID: git_hooks_policy
STATUS: implemented
ARTIFACTS: .githooks/pre-commit, docs/workflow/GIT_HOOKS_POLICY.tsv, docs/workflow/GIT_HOOK_CHECKS.tsv, docs/workflow/GIT_HOOK_RECOMMENDATION_PATHS.tsv, learning/GIT_HOOK_SETTINGS.tsv, tools/lib/git_hooks_policy.sh, tools/git-hooks, tools/test_git_hooks.sh
TESTS: tools/test_git_hooks.sh

SYNC-ID: resource_budget_parallel_guard
STATUS: implemented
ARTIFACTS: docs/workflow/RESOURCE_POLICY.tsv, learning/RESOURCE_SETTINGS.tsv, tools/lib/resource_guard.sh, tools/resource-guard, tools/test_resource_guard.sh, tools/git-hooks, tools/test_lesson_playwright.sh, playwright.config.js, .github/workflows/ci.yml, .github/workflows/lesson14-ci.yml
TESTS: tools/test_resource_guard.sh

SYNC-ID: resource_guard_safe_cleanup
STATUS: implemented
ARTIFACTS: docs/workflow/RESOURCE_POLICY.tsv, learning/RESOURCE_SETTINGS.tsv, tools/lib/resource_guard.sh, tools/resource-guard, tools/test_resource_cleanup.sh, tools/test_lesson_repository.sh, docs/workflow/GIT_HOOK_CHECKS.tsv, .github/workflows/ci.yml, .github/workflows/lesson14-ci.yml
TESTS: tools/test_resource_cleanup.sh

SYNC-ID: resource_guard_summary_parallel_ci
STATUS: implemented
ARTIFACTS: docs/workflow/RESOURCE_POLICY.tsv, learning/RESOURCE_SETTINGS.tsv, tools/lib/resource_guard.sh, tools/resource-guard, docs/workflow/GIT_HOOK_PARALLEL_GROUPS.tsv, tools/lib/git_hooks_policy.sh, tools/git-hooks, tools/test_resource_guard_summary.sh, tools/test_git_hooks_parallel.sh, tools/check_ci_workflow_structure.sh, .github/workflows/ci.yml, .github/workflows/lesson14-ci.yml, tools/test_lesson_repository.sh
TESTS: tools/test_resource_guard_summary.sh, tools/test_git_hooks_parallel.sh, tools/check_ci_workflow_structure.sh

SYNC-ID: learner_context_foundation
STATUS: implemented
ARTIFACTS: learning/context/README.md,learning/context/AI_DRIVEN_DEVELOPMENT_FOUNDATION.md,learning/context/SECURITY_FOUNDATION.md,learning/context/LESSON_CONTEXT_MAP.tsv,tools/lib/lesson_context.sh,tools/lesson-context,tools/test_lesson_context.sh,tools/check_lesson_structure.sh,docs/workflow/TEST_PLAN_MANIFEST.tsv,docs/workflow/GIT_HOOK_CHECKS.tsv,docs/workflow/GIT_HOOK_PARALLEL_GROUPS.tsv,docs/workflow/FINAL_GATE_COVERAGE.tsv,.github/workflows/ci.yml,.github/workflows/lesson14-ci.yml
TESTS: tools/test_lesson_context.sh,tools/check_lesson_structure.sh,tools/check_as_built_sync_contract.sh,tools/check_as_built_docs.sh,tools/check_test_plan_coverage.sh

SYNC-ID: learner_context_runtime_integration
STATUS: implemented
ARTIFACTS: learning/context/README.md,learning/context/LESSON_CONTEXT_MAP.tsv,learning/context/WORKFLOW_CONTEXT_MAP.tsv,tools/lib/lesson_context.sh,tools/lesson-context,tools/lesson,tools/lesson14,tools/lib/lesson_runtime.sh,tools/test_lesson_context.sh,tools/test_lesson_repository.sh,.github/workflows/ci.yml,.github/workflows/lesson14-ci.yml
TESTS: tools/test_lesson_context.sh,tools/test_lesson.sh,tools/test_lesson14.sh,tools/check_ci_workflow_structure.sh,tools/check_as_built_sync_contract.sh,tools/check_as_built_docs.sh,tools/check_test_plan_coverage.sh

SYNC-ID: safeflow_security_backfill
STATUS: implemented
ARTIFACTS: AGENTS.MD,docs/workflow/SAFEFLOW_SECURITY_BACKFILL.tsv,tools/lib/security_invariants.sh,tools/check_security_invariants.sh,tools/test_security_invariants.sh,docs/workflow/GIT_HOOK_CHECKS.tsv,.github/workflows/ci.yml,.github/workflows/lesson14-ci.yml,tools/test_lesson_repository.sh
TESTS: tools/check_security_invariants.sh,tools/test_security_invariants.sh

SYNC-ID: product_security_workflow_gate
STATUS: implemented
ARTIFACTS: docs/workflow/PRODUCT_SECURITY_POLICY.tsv,learning/context/WORKFLOW_CONTEXT_MAP.tsv,tools/lib/product_security.sh,tools/product-security,tools/test_product_security.sh,tools/free-development,tools/product-improvement,tools/external-integration,tools/menu,tools/dashboard,docs/workflow/GIT_HOOK_CHECKS.tsv,.github/workflows/ci.yml,.github/workflows/lesson14-ci.yml,tools/test_lesson_repository.sh
TESTS: tools/test_product_security.sh,tools/test_product_gate_tools.sh

SYNC-ID: test_ci_safe_time_optimization_plan
STATUS: implemented
ARTIFACTS: docs/workflow/TEST_PLAN_MANIFEST.tsv,tools/lib/test_plan.sh,tools/test-plan,tools/check_test_plan_coverage.sh,tools/test_test_plan.sh,tools/lib/fixture_copy.sh,tools/fixture-copy,tools/test_fixture_copy.sh,docs/workflow/GIT_HOOK_CHECKS.tsv,docs/workflow/GIT_HOOK_PARALLEL_GROUPS.tsv,docs/workflow/GIT_HOOK_RECOMMENDATION_PATHS.tsv,tools/git-hooks,tools/test_git_hooks_parallel.sh,tools/check_ci_workflow_structure.sh,tools/test_lesson_repository.sh,.github/workflows/ci.yml,.github/workflows/lesson14-ci.yml
TESTS: tools/check_test_plan_coverage.sh,tools/test_test_plan.sh,tools/test_fixture_copy.sh,tools/test_git_hooks_parallel.sh,tools/check_ci_workflow_structure.sh

SYNC-ID: test_ci_final_gate_optimization_plan
STATUS: implemented
ARTIFACTS: docs/workflow/TEST_PLAN_MANIFEST.tsv,docs/workflow/GIT_HOOK_CHECKS.tsv,docs/workflow/GIT_HOOK_PARALLEL_GROUPS.tsv,docs/workflow/GIT_HOOK_RECOMMENDATION_PATHS.tsv,docs/workflow/FINAL_GATE_GAP_COMMANDS.tsv,docs/workflow/FINAL_GATE_COVERAGE.tsv,docs/workflow/RESOURCE_POLICY.tsv,tools/lib/ci_evidence.sh,tools/lib/as_built_evidence.sh,tools/ci-evidence,tools/ci-final-gate,tools/git-hooks,tools/lib/git_hooks_policy.sh,tools/lib/resource_guard.sh,tools/check_as_built_sync_contract.sh,tools/as-built-sync,tools/docs-tour,tools/check_ci_workflow_structure.sh,tools/test_lesson_playwright.sh,tools/test_lesson_start_position.sh,tools/test_lesson14.sh,tools/test_lesson_repository.sh,tools/test_ci_evidence.sh,tools/test_ci_final_gate.sh,tools/test_resource_cleanup.sh,.github/workflows/ci.yml,.github/workflows/lesson14-ci.yml
TESTS: tools/test_ci_evidence.sh,tools/test_ci_final_gate.sh,tools/check_ci_workflow_structure.sh,tools/test_git_hooks_parallel.sh,tools/test_resource_cleanup.sh,tools/check_as_built_sync_contract.sh,tools/check_as_built_docs.sh,tools/check_test_plan_coverage.sh,tools/test_docs_tour.sh,tools/test_as_built_sync_contract.sh,tools/test_lesson_start_position.sh,tools/test_lesson14.sh

SYNC-ID: test_ci_full_pipeline_acceleration_plan
STATUS: implemented
ARTIFACTS: docs/workflow/TEST_PLAN_MANIFEST.tsv,docs/workflow/GIT_HOOK_CHECKS.tsv,docs/workflow/GIT_HOOK_PARALLEL_GROUPS.tsv,docs/workflow/GIT_HOOK_RECOMMENDATION_PATHS.tsv,docs/workflow/FINAL_GATE_GAP_COMMANDS.tsv,docs/workflow/FINAL_GATE_COVERAGE.tsv,tools/git-hooks,tools/ci-final-gate,tools/ci-evidence,tools/ci-playwright-setup,tools/lib/ci_evidence.sh,tools/lib/as_built_evidence.sh,tools/lib/git_hooks_policy.sh,tools/lib/resource_guard.sh,tools/check_as_built_sync_contract.sh,tools/check_ci_workflow_structure.sh,tools/test_ci_pipeline_acceleration.sh,tools/test_lesson_playwright.sh,tools/test_lesson_repository.sh,.github/workflows/ci.yml,.github/workflows/lesson14-ci.yml
TESTS: tools/check_as_built_docs.sh,tools/check_as_built_sync_contract.sh,tools/check_test_plan_coverage.sh,tools/check_ci_workflow_structure.sh,tools/test_ci_pipeline_acceleration.sh

RECORD: dashboard_control_center_mock_exact_alignment_correction
STATUS: implemented
ARTIFACTS: docs/workflow/AS_BUILT_SYNC_CONTRACT.tsv,docs/workflow/DASHBOARD_DATA_SCHEMA.tsv,docs/workflow/PRODUCT_REPOSITORY_STRUCTURE.tsv,docs/workflow/PRODUCT_GATE_EVIDENCE_SCHEMA.tsv,docs/workflow/TEST_PLAN_MANIFEST.tsv,docs/workflow/GIT_HOOK_CHECKS.tsv,docs/workflow/GIT_HOOK_PARALLEL_GROUPS.tsv,docs/workflow/FINAL_GATE_COVERAGE.tsv,free-development/FREE_DEVELOPMENT_MODE.md,templates/TEMPLATES.md,lesson/SYNC_GATES_14_DAYS.tsv,tools/lib/dashboard_data.sh,tools/dashboard-data,tools/lib/product_repository_authority.sh,tools/free-development,tools/product-improvement,tools/external-integration,tools/product-scaffold-check,tools/product-launch-check,dashboard-control-center/mocks/mock-context-overview.png,dashboard-control-center/mocks/mock-context-lessons.png,dashboard-control-center/mocks/mock-context-workflow.png,dashboard-control-center/mocks/mock-context-maintenance.png,dashboard-control-center/mocks/mock-context-safety.png,dashboard-control-center/src/App.jsx,dashboard-control-center/src/dashboardData.js,dashboard-control-center/src/i18n.js,dashboard-control-center/src/styles.css,tests/fixtures/dashboard-control-center.json,tests/fixtures/dashboard-control-center-live-update.json,tests/playwright/dashboard-control-center.spec.js,tools/test_dashboard_schema.sh,tools/test_dashboard_data.sh,tools/test_dashboard_control_center.sh,tools/test_product_repository_authority.sh,tools/test_product_scaffold_check.sh,tools/test_product_launch_check.sh,tools/test_product_gate_tools.sh,tools/check_lesson14_sync.sh,tools/test_lesson14.sh,tools/check_test_plan_coverage.sh,tools/check_ci_workflow_structure.sh,tools/check_as_built_sync_contract.sh,tools/check_as_built_docs.sh
TESTS: tools/test_dashboard_schema.sh,tools/test_dashboard_data.sh,tools/test_dashboard_control_center.sh,tools/test_product_repository_authority.sh,tools/test_product_scaffold_check.sh,tools/test_product_launch_check.sh,tools/test_product_gate_tools.sh,tools/check_lesson14_sync.sh,tools/test_lesson14.sh,tools/check_test_plan_coverage.sh,tools/test_test_plan.sh,tools/test_git_hooks.sh,tools/test_git_hooks_parallel.sh,tools/test_ci_final_gate.sh,tools/check_ci_workflow_structure.sh,tools/check_as_built_sync_contract.sh,tools/check_as_built_docs.sh
```

## Implemented Resource-Budgeted Parallel Guard Implementation Plan

This plan is synchronized from `docs/memory/DEVELOPER_MEMORY.md`.
The runtime implementation is complete.
It preserves existing Git hooks modes, CI checks, pre-commit behavior, 7-day and 14-day lesson behavior, dashboard behavior, docs routes, and repository-boundary checks.

### Implemented Change Targets

- `docs/workflow/RESOURCE_POLICY.tsv`
- `learning/RESOURCE_SETTINGS.tsv`
- `tools/lib/resource_guard.sh`
- `tools/resource-guard`
- `tools/test_resource_guard.sh`
- `tools/git-hooks`
- `tools/test_lesson_playwright.sh`
- `playwright.config.js`
- `tools/test_lesson_repository.sh`
- `.github/workflows/ci.yml`
- `.github/workflows/lesson14-ci.yml`

### Implemented Order

1. Added policy and settings sources.
   - Keep warning thresholds, allowed modes, profile names, and default behavior in policy/settings files.
   - Keep the available-memory floor in both policy defaults and user settings.
   - Do not encode one-off fixed values directly in command branches.

2. Added a shared resource guard library.
   - Read memory, swap, disk free space, and active heavy-process signals where practical.
   - Calculate the effective swap budget from user-selected storage percentage and GiB upper limit.
   - Keep logic profile-based so Git hooks, Playwright, aggregate checks, and future checks can reuse it.
   - Reject unknown heavy-work profiles instead of silently falling back to a different profile.

3. Added a resource-guard command surface.
   - Commands include `status`, `check --profile`, `recommend-jobs --profile`, and `monitor --profile`.
   - Output must be suitable for learner-facing summaries and agent automation.
   - `check --profile` and `recommend-jobs --profile` fail closed at safe-stop while preserving serial fallback for caution states.
   - `parallel` mode is explicit and fails closed when caution states prevent safe parallelism.

4. Connected Git hooks without changing existing mode semantics.
   - Keep `minimal` lightweight.
   - Keep `full` as the complete local hook verification path.
   - Let heavy local checks consult the resource guard before optional parallel execution.
   - Preserve serial fallback when resource checks fail or enter a caution/block state.
   - Keep CI able to run the full Git hooks regression without inheriting local WSL resource settings.

5. Connected Playwright and aggregate checks conservatively.
   - Treat Playwright as heavy work.
   - Prefer one local worker unless resource checks explicitly allow more.
   - Do not allow uncontrolled overlap between Playwright, full hooks, and aggregate repository tests.
   - Route CI dashboard browser checks through the same Playwright wrapper used locally, and do not hide safe-stop failures.

6. Connected CI separately from local WSL resource policy.
   - Preserve all required CI checks.
   - Consider safe job separation and duplicate-run cancellation.
   - Do not treat CI runner resources as equivalent to local WSL resource settings.

7. Added standalone and aggregate tests.
   - Added `tools/test_resource_guard.sh`.
   - Wired it into `tools/test_lesson_repository.sh`.
   - Added calculation, threshold, active-heavy-process fallback, safe-stop failure code, invalid-setting, serial-mode, parallel-mode, and profile rejection tests.

8. Updated synchronized documentation after implementation.
   - Moved `resource_budget_parallel_guard` from `planned` to `implemented`.
   - Replaced the planned artifact/test list with implemented runtime files and active tests.
   - Kept all five synchronized documents and the sync contract aligned.

### Verification Commands

Run:

```bash
./tools/resource-guard status
./tools/resource-guard check --profile git-hooks-full
./tools/resource-guard recommend-jobs --profile playwright
./tools/test_resource_guard.sh
./tools/test_git_hooks.sh
./tools/git-hooks run --mode minimal
./tools/git-hooks run --mode full --no-cache
.githooks/pre-commit
./tools/test_lesson_repository.sh
./tools/as-built-sync status
./tools/check_as_built_sync_contract.sh
```

### Planned Recovery And Approval Rules

- If settings parsing fails, fix the TSV structure and add regression coverage.
- If thresholds are too strict or too loose, adjust policy data instead of adding hard-coded command branches.
- If Playwright becomes unstable, reduce worker count through resource recommendations and keep serial fallback.
- If CI diverges from local behavior, keep CI full and separate local resource policy from CI workflow structure.
- Developer approval is required before `.wslconfig` writes, swap creation/deletion, privileged cleanup, process killing, changing Git hooks mode semantics, weakening CI, weakening pre-commit, or introducing Docker/cgroups/systemd memory enforcement.

## Implemented Learner Context Foundation Plan

This implementation keeps learner-facing context as source material under `learning/context/` and exposes a read-only runtime command for validating and rendering scoped context views.

1. Preserved source documents under `learning/context/`.
   - `README.md` documents the source and runtime boundary.
   - `AI_DRIVEN_DEVELOPMENT_FOUNDATION.md` remains the main conceptual source.
   - `SECURITY_FOUNDATION.md` remains the staged security source.
   - `LESSON_CONTEXT_MAP.tsv` remains the machine-readable lesson-context map.

2. Added runtime context tooling.
   - `tools/lib/lesson_context.sh` validates context files and renders scoped rows.
   - `tools/lesson-context` provides `status`, `validate`, `list`, `summary`, `show`, `opening`, `step`, `recap`, and `workflow`.
   - `tools/test_lesson_context.sh` verifies successful output and fail-closed parsing for lesson and workflow maps.

3. Preserved source-language and display-language separation.
   - Repository source documents remain in English.
   - Runtime output exposes structured context rather than hard-coded translated lesson prose.
   - Future translation or deeper rendering can build on the context command without changing the source map contract.

4. Wired validation.
   - `tools/check_lesson_structure.sh` and `tools/check_lesson14_structure.sh` require and validate learner context files.
   - `docs/workflow/TEST_PLAN_MANIFEST.tsv`, `docs/workflow/GIT_HOOK_CHECKS.tsv`, `docs/workflow/GIT_HOOK_PARALLEL_GROUPS.tsv`, and `docs/workflow/FINAL_GATE_COVERAGE.tsv` include learner-context coverage.
   - `.github/workflows/ci.yml`, `.github/workflows/lesson14-ci.yml`, `tools/check_ci_workflow_structure.sh`, and `tools/test_lesson_repository.sh` include the new syntax and regression paths.

## Implemented Learner Context Runtime Integration Plan

This implementation connects learner context to runtime guidance while keeping Free Development Mode as a workflow, not as a lesson.

### Implemented Change Targets

- `learning/context/LESSON_CONTEXT_MAP.tsv`
- `learning/context/WORKFLOW_CONTEXT_MAP.tsv`
- `tools/lib/lesson_context.sh`
- `tools/lesson-context`
- `tools/lesson`
- `tools/lesson14`
- `tools/lib/lesson_runtime.sh`
- `tools/test_lesson_context.sh`
- `tools/test_lesson_repository.sh`
- `docs/workflow/AS_BUILT_SYNC_CONTRACT.tsv`
- the three design/as-built documents and the two workflow-state documents

### Implemented Runtime Behavior

1. `tools/lesson-context status` validates all context files and prints topic counts.
2. `tools/lesson-context opening|step|recap` renders scoped learning-context rows for `lesson-7`, `lesson-14`, `applied`, or `all`.
3. `tools/lesson-context workflow` renders workflow context rows for Free Development Mode, Product Improvement, External Integration, and lesson maintenance.
4. `tools/lesson` status prints the 7-day learner-context summary and the current-step context command.
5. `tools/lesson14` status prints the 14-day learner-context summary through the shared runtime status path.
6. Existing approval gates, ordered progression, learner-selected start positions, menu prerequisites, Git workflow settings, dashboard views, CI, pre-commit, and repository-boundary behavior remain unchanged.

### Implemented Verification

Run:

```bash
./tools/lesson-context status
./tools/lesson-context opening lesson-7
./tools/lesson-context opening lesson-14
./tools/lesson-context opening applied
./tools/lesson-context workflow free-development
./tools/lesson-context workflow product-improvement
./tools/lesson-context workflow external-integration
./tools/test_lesson_context.sh
./tools/test_lesson.sh
./tools/test_lesson14.sh
./tools/check_lesson_structure.sh
./tools/check_lesson14_structure.sh
./tools/check_as_built_sync_contract.sh
./tools/check_as_built_docs.sh
./tools/check_test_plan_coverage.sh
./tools/check_ci_workflow_structure.sh
./tools/test_lesson_repository.sh
```

CI and Lesson14 CI must also pass after push.

### Failure Recovery

- If context map parsing fails, fix `tools/lesson-context` and `tools/lib/lesson_context.sh` before touching lesson commands.
- If lesson progression regresses, temporarily disconnect lesson command status integration and keep the standalone context CLI stable.
- If Free Development Mode is displayed as a lesson, move that mapping back to workflow context and correct menu/dashboard labels.
- If output is too verbose, adjust context summary selection without rewriting the source context.
- If CI-only failures occur, compare CI logs with local full/no-cache verification and isolate environment-specific behavior.

### Future Approval Points

- Deeper dashboard rendering of learner context.
- Product-facing workflow preambles beyond the read-only `workflow` context command.
- Runtime translation dictionaries or locale-specific context copy.
- New columns or step-specific binding tables for `LESSON_CONTEXT_MAP.tsv`.

## Implemented Git Workflow Policy Implementation Plan

This implementation lets users configure Git-management permissions and Git automation levels before the agent performs Git workflow operations.
It is additive and does not trade away existing 7-day, 14-day, menu, dashboard, Free Development, Product Improvement, external-integration, product-repository cleanup, CI, pre-commit, or as-built sync-contract behavior.

1. Add policy and settings files.
   - Added `docs/workflow/GIT_WORKFLOW_POLICY.tsv` as the policy definition.
   - Added `learning/GIT_WORKFLOW_SETTINGS.tsv` as the current user-selected settings file.
   - Defined supported keys for working-branch permission, worktree permission, main-direct-work permission, and automation level.
   - Keep the file format simple and reusable for CLI tools, dashboard output, and future browser dashboard work.

2. Add a shared Git workflow policy library.
   - Added `tools/lib/git_workflow_policy.sh`.
   - Load policy definitions and selected settings.
   - Validate setting keys and values.
   - Expose helpers for branch permission, worktree permission, main-direct-work permission, automation level, repository context, and Git monitoring.
   - Reuse existing repository-boundary, Git sync, and lesson-common patterns where practical.

3. Add a learner-facing command.
   - Added `tools/git-workflow status`.
   - Added `tools/git-workflow configure`.
   - Added `tools/git-workflow set <key> <value>`.
   - Added `tools/git-workflow allow <branch|worktree|main-direct|commit|push|pr|ci|sync>`.
   - Added `tools/git-workflow check`.
   - Added `tools/git-workflow cleanup-plan`.
   - Keep `cleanup-plan` non-destructive.

4. Define automation levels.
   - `manual`: provide guidance and monitoring only.
   - `commit`: allow automated commit after required checks pass.
   - `pr_ci`: allow automated push, PR creation where applicable, and CI checks.
   - `sync`: allow automated main CI checks plus local/remote synchronization checks.

5. Preserve explicit confirmation for high-impact operations.
   - Keep merge confirmation-gated.
   - Keep branch deletion confirmation-gated.
   - Keep worktree deletion confirmation-gated.
   - Keep remote deletion confirmation-gated.
   - Do not let automation level bypass destructive-operation confirmation.

6. Add Git monitoring.
   - Detect uncommitted changes.
   - Detect unpushed commits.
   - Detect local/remote divergence.
   - List candidate unnecessary working branches.
   - List candidate unnecessary worktrees.
   - Show whether the current repository is the lesson repository or product repository.
   - Separate lesson-repository Git state from product-repository Git state so the workflow cannot mix repositories.

7. Integrate with existing workflows.
   - Added menu and dashboard entry points without removing existing entries.
   - Keep the policy reusable for 7-day, 14-day, applied-learning, Free Development, product-improvement, and external-integration workflows.
   - Keep status paths non-blocking.
   - Enforce the policy only where a start, gate, check, or Git action actually depends on it.

8. Add tests.
   - Added `tools/test_git_workflow_policy.sh`.
   - Test valid setting changes.
   - Test invalid key and invalid value rejection.
   - Test branch and worktree permission decisions.
   - Test automation-level decisions.
   - Test dirty-state and local/remote sync monitoring.
   - Test lesson-repository and product-repository separation.
   - Test cleanup-plan output without deleting branches or worktrees.

9. Wire validation.
   - Added new files to structure checks.
   - Added policy checks to as-built checks.
   - Added `tools/test_git_workflow_policy.sh` to aggregate tests, CI, and pre-commit.
   - Preserve existing checks and avoid replacing current Git sync or CI checks.

10. Synchronize documentation.
   - Updated these five documents from planned to implemented state.
   - Updated `AGENTS.MD`, menu guidance, dashboard guidance, and runtime checks only where the runtime feature became active.
   - Keep unrelated existing content unchanged.

## Implemented Menu-Wide Git Workflow Policy Implementation Plan

This implementation promotes the existing Git workflow policy into a shared menu-level policy.
It is additive and does not trade away existing 7-day, 14-day, applied-learning, Free Development, Product Improvement, External Integration, lesson-maintenance, dashboard, product cleanup, CI, pre-commit, or as-built sync-contract behavior.

1. Preserve the existing Git policy source.
   - Keep `tools/git-workflow status|configure|set|allow|check|cleanup-plan` unchanged as the reusable policy command surface.
   - Reuse `docs/workflow/GIT_WORKFLOW_POLICY.tsv`, `learning/GIT_WORKFLOW_SETTINGS.tsv`, and `tools/lib/git_workflow_policy.sh`.

2. Add menu-level Git policy readiness.
   - Extended `tools/menu readiness` so menu items 1 through 7 show Git policy readiness.
   - Show branch permission, worktree permission, direct-main permission, automation level, and repository-monitor availability.

3. Extend menu checks without weakening existing prerequisites.
   - Added Git policy validation to menu items 1 through 6.
   - Keep current learning-mode, workflow display language, product development language, repository-boundary, and approval checks intact.
   - Keep `automation_level=manual` as a valid non-blocking setting.

4. Add a safe item 7 check/start path.
   - Added `tools/menu check 7`.
   - Added `tools/menu start 7 --confirm`.
   - Treat item 7 as lesson-repository maintenance and use lesson repository Git context.

5. Interpret automation levels consistently by menu item.
   - `manual`: guidance and monitoring only.
   - `commit`: commit-level automation only after required checks pass.
   - `pr_ci`: push, PR, and CI-check automation where applicable.
   - `sync`: main synchronization plus local/remote sync checks where applicable.

6. Preserve explicit confirmation for destructive Git actions.
   - Do not let menu-level policy bypass merge confirmation.
   - Do not let menu-level policy bypass branch deletion, worktree deletion, remote deletion, or product repository cleanup confirmation.

7. Update dashboard visibility.
   - Added a menu-wide Git policy summary to dashboard output.
   - Preserve existing lesson, docs, development, illustration, and menu readiness dashboard sections.

8. Add or update tests.
   - Extended `tools/test_menu_prerequisites.sh` for item 1 through 7 Git policy readiness and checks.
   - Keep `tools/test_git_workflow_policy.sh` focused on the reusable Git policy command itself.
   - Keep `tools/test_lesson_repository.sh`, CI, and pre-commit wiring additive.

9. Synchronize documentation.
   - Updated these five documents from planned to implemented after runtime implementation exists and tests pass.
   - Updated `AGENTS.MD`, menu guidance, and dashboard guidance only where the runtime feature became active.
   - Keep unrelated existing content unchanged.

10. Verify with mechanical checks.
   - Run as-built sync-contract checks.
   - Run menu prerequisite tests.
   - Run Git workflow policy tests.
   - Run aggregate lesson-repository tests.
   - Run pre-commit and GitHub Actions before declaring implementation complete.

## Implemented Git Workflow Action Settings Implementation Plan

This implemented work adds detailed manual/automatic controls for common Git workflow actions.
It must preserve existing Git policy settings, menu checks, dashboard output, cleanup controls, CI checks, pre-commit, and the as-built sync contract.

1. Preserve existing policy compatibility.
   - Keep `branch_allowed`, `worktree_allowed`, `main_direct_work_allowed`, and `automation_level`.
   - Keep `automation_level` available as a compatibility preset.
   - Do not remove or rename existing `tools/git-workflow` commands.

2. Extend the Git workflow policy definition.
   - Add these detailed keys to the policy definition:
     - `commit_automation`
     - `push_automation`
     - `pr_creation`
     - `pr_ci_monitoring`
     - `merge_execution`
     - `developer_auto_merge_allowed`
     - `main_ci_monitoring`
     - `sync_monitoring`
   - Allow only `manual|auto` for non-merge action keys.
   - Allow only `manual|after_approval` for `merge_execution`.
   - Allow only `false|true` for `developer_auto_merge_allowed`.
   - Use these defaults:
     - `commit_automation: auto`
     - `push_automation: manual`
     - `pr_creation: manual`
     - `pr_ci_monitoring: auto`
     - `merge_execution: after_approval`
     - `developer_auto_merge_allowed: false`
     - `main_ci_monitoring: auto`
     - `sync_monitoring: auto`
   - These detailed defaults are active after implementation; `automation_level` remains available as a compatibility preset when detailed action keys are absent.

3. Add shared resolution helpers.
   - Add `git_workflow_action_mode <action>` to `tools/lib/git_workflow_policy.sh`.
   - Supported actions: `commit`, `push`, `pr`, `ci`, `pr_ci`, `merge`, `main_ci`, and `sync`.
   - Keep `ci` as a compatibility alias for CI monitoring so existing `tools/git-workflow allow ci` behavior is not removed.
   - Resolve merge as `manual`, `after_approval`, or `developer_auto`.
   - Resolve `developer_auto` only when `developer_auto_merge_allowed=true` and all merge safety gates pass.
   - Detailed settings take precedence only when the detailed setting key is present.
   - Fall back to `automation_level` when a detailed setting key is absent.

4. Update the learner-facing Git command output.
   - Update `tools/git-workflow status` to show detailed action settings.
   - Update `tools/git-workflow configure` with copyable `set` examples for all detailed settings.
   - Keep `tools/git-workflow set <key> <value>` as the single write path.
   - Add `tools/git-workflow approve <push|pr|merge> "memo"` as the explicit approval write path for high-impact detailed Git actions.

5. Update menu and dashboard visibility.
   - Show detailed action settings in `tools/menu readiness`.
   - Show detailed action settings in `tools/dashboard menu`.
   - Apply the same settings to menu items 1 through 7.

6. Preserve manual confirmation for high-impact actions.
   - For push and PR creation, `auto` means the agent may execute the operation only after explicit approval for that operation is recorded; it never means approval-free execution.
   - For normal merge operation, `merge_execution: after_approval` means the agent may execute merge only after explicit merge approval is recorded.
   - Require matching action, repository, and branch approval receipts from `learning/GIT_WORKFLOW_APPROVALS.tsv` before detailed push, PR creation, or normal merge execution is allowed.
   - Added `developer_auto_merge_allowed: true` as the only implemented path for developer-responsibility approval-free merge.
   - Require gate evidence plus actual repository checks before developer auto-merge: PR CI success, clear target PR and branch, verified merge base, clean working tree, checked local/remote state, and stop-on-failure behavior.
   - Keep branch deletion, worktree deletion, remote deletion, and product repository deletion behind explicit user confirmation regardless of merge settings.
   - Keep PR CI, main CI, and sync monitoring automatic by default.

7. Add tests.
   - Extend `tools/test_git_workflow_policy.sh` for defaults, changes, invalid values, detailed precedence, approval receipts, and helper resolution.
   - Extend `tools/test_menu_prerequisites.sh` for detailed settings in menu readiness.
   - Extend dashboard coverage so `tools/dashboard menu` exposes detailed settings.
   - Keep aggregate lesson-repository, pre-commit, and CI wiring additive.

8. Synchronize implemented documentation.
   - Moved `git_workflow_action_settings` from `planned` to `implemented`.
   - Replaced `ARTIFACTS: none` and `TESTS: none` with the implemented artifacts and tests.
   - Updated these five synchronized documents and the sync contract together.

## Implemented Git Hooks Policy Implementation Plan

This implementation makes `.githooks/pre-commit` faster while preserving the current safety model.
The work is implemented through runtime artifacts, tests, and the `git_hooks_policy` sync record.

1. Preserve the current safety baseline.
   - Kept the existing `.githooks/pre-commit` check list as the functional baseline in `docs/workflow/GIT_HOOK_CHECKS.tsv`.
   - Do not add a normal learner-facing `off` mode.
   - Keep CI and completion verification full or no-cache.
   - Do not remove existing checks, CI steps, sync-contract checks, or documentation routes.

2. Define a reusable policy and settings layer.
   - Added `docs/workflow/GIT_HOOKS_POLICY.tsv`.
   - Added `docs/workflow/GIT_HOOK_CHECKS.tsv`.
   - Added `docs/workflow/GIT_HOOK_RECOMMENDATION_PATHS.tsv`.
   - Added `learning/GIT_HOOK_SETTINGS.tsv`.
   - Added shared shell helpers in `tools/lib/git_hooks_policy.sh`.
   - Kept mode names and accepted values centralized so future tools, dashboard output, repo-local skills, and tests can reuse the same source.

3. Add a hook runner command.
   - Added `tools/git-hooks status`.
   - Added `tools/git-hooks recommend`.
   - Added `tools/git-hooks recommend --paths <path>...`.
   - Added `tools/git-hooks mode <full|fast|minimal>`.
   - Added `tools/git-hooks cache clear`.
   - Added `tools/git-hooks run`.
   - Added `tools/git-hooks run --no-cache`.
   - Added `tools/git-hooks run --mode <full|fast|minimal>`.
   - Keep output learner-readable and suitable for agents to summarize.

4. Implement conservative caching.
   - Store cache data under an untracked Git-local directory such as `.git/pre-commit-cache/`.
   - Include hook mode, command identity, relevant tool hashes, relevant input hashes, staged content, worktree changes, and Git status data.
   - Disable cache use while untracked files are present.
   - Treat missing, stale, corrupted, or unverifiable cache entries as misses.
   - Never allow a cache hit to replace full/no-cache CI verification.

5. Define mode behavior.
   - `full` runs coverage equivalent to the current required pre-commit checks.
   - `fast` uses the cache to avoid rerunning checks only when prior successful inputs still match.
   - `minimal` runs a small required mechanical set for quick local feedback.
   - Future changes to the minimal-mode check list require developer approval because it defines the lowest acceptable local safety gate.

6. Add local full/no-cache recommendation behavior.
   - Keep the selected local hook mode, such as `minimal`, as the default local pre-commit behavior.
   - Keep remote CI and final verification on full/no-cache coverage.
   - Recommend local `tools/git-hooks run --mode full --no-cache` only when changed paths match the recommendation policy for Git hooks, CI, checks, tests, or as-built synchronization.
   - Keep the recommendation policy in `docs/workflow/GIT_HOOK_RECOMMENDATION_PATHS.tsv` instead of hard-coding one-off branches in the runner.

7. Connect to existing ecosystem surfaces.
   - Updated `.githooks/pre-commit` to call `tools/git-hooks run`.
   - Wired the dedicated hook test into `tools/test_lesson_repository.sh`.
   - Added CI coverage for the hook test and for full/no-cache behavior.
   - Added AGENTS routing and standard-check references for the hook command and test.
   - Updated existing wiring checks and status output so runner-based hook dispatch is recognized as active pre-commit wiring against full-mode coverage, independent of the current local hook mode.

8. Add standalone and aggregate tests.
   - Added `tools/test_git_hooks.sh` for modes, invalid mode rejection, invalid persisted settings, malformed check rows, invalid or empty check-row mode tokens, cache hits, cache misses, invalidation, no-cache operation, minimal-mode required checks, failing-check cache refusal, and safe cache clearing.
   - Added recommendation tests that confirm ordinary changed files keep the local recommendation at `minimal`, while Git hooks, CI, checks, tests, or as-built synchronization paths recommend local `full --no-cache`.
   - Confirm existing pre-commit checks still run in `full` through `tools/git-hooks run --mode full --no-cache`.
   - Confirm aggregate tests, CI, and pre-commit include the new hook validation after implementation.
   - Confirm existing 7-day, 14-day, Git workflow policy, menu, dashboard, docs-tour, product cleanup, sync-contract, and CI behavior remains available.

9. Plan recovery behavior.
   - If a cache bug is suspected, clear the cache and rerun with `--no-cache`.
   - If hook-runner integration fails, restore the current serial `.githooks/pre-commit` command list while preserving the new tests for diagnosis.
   - If minimal-mode scope conflicts with safety expectations, stop for developer approval.
   - If CI behavior diverges from local hooks, keep CI on full/no-cache verification and fix local runner behavior.

10. Synchronize after implementation.
   - Moved `git_hooks_policy` from `planned` to `implemented`.
   - Replaced `ARTIFACTS: none` and `TESTS: none` with the implemented files and tests.
   - Updated these five synchronized documents and `docs/workflow/AS_BUILT_SYNC_CONTRACT.tsv` together.
   - Keep unrelated existing content unchanged.

## Implemented Local Verification Scope Policy Implementation Plan

SYNC-ID: local_verification_scope_policy
STATUS: implemented
ARTIFACTS: AGENTS.MD,docs/workflow/AS_BUILT_SYNC_CONTRACT.tsv,docs/workflow/TEST_PLAN_MANIFEST.tsv,docs/workflow/GIT_HOOKS_POLICY.tsv,docs/workflow/GIT_HOOK_CHECKS.tsv,docs/workflow/GIT_HOOK_RECOMMENDATION_PATHS.tsv,learning/GIT_HOOK_SETTINGS.tsv,tools/lib/test_plan.sh,tools/test-plan,tools/lib/git_hooks_policy.sh,tools/git-hooks,tools/check_test_plan_coverage.sh,tools/test_test_plan.sh,tools/test_git_hooks.sh
TESTS: tools/check_test_plan_coverage.sh,tools/test_test_plan.sh,tools/test_git_hooks.sh,tools/check_as_built_sync_contract.sh,tools/check_as_built_docs.sh

This implementation records an everyday local-verification scope rule over the existing Test Plan Manifest and Git hooks policy.
It adds no runtime branch and does not reduce CI, pre-commit, aggregate, full/no-cache, or sync-contract coverage.

### Implemented Change Targets

- Add an AGENTS invariant that limits test execution to workflow contract, change scope, and user approval.
- Synchronize the rule through the five as-built/workflow documents under `local_verification_scope_policy`.
- Connect the rule to existing `TEST_PLAN_MANIFEST.tsv`, `GIT_HOOK_CHECKS.tsv`, `GIT_HOOK_RECOMMENDATION_PATHS.tsv`, `GIT_HOOKS_POLICY.tsv`, and `GIT_HOOK_SETTINGS.tsv`.
- Keep developer-memory documentation out of scope because it is not the durable source for this rule.

### Implemented Order

1. Add the invariant after existing AGENTS rules without changing prior rule wording or numbering.
2. Add the sync-contract row so the five synchronized documents can be checked mechanically.
3. Add role-specific content:
   - requirements state the user-facing and agent-behavior requirement;
   - specification defines how existing contracts decide verification scope;
   - implementation plan records targets, order, verification, recovery, and approval boundaries;
   - task tracker records implemented status;
   - handoff records restart behavior.
4. Preserve all existing Git hooks, CI, pre-commit, resource guard, and test-plan semantics.

### Verification Plan

The contract-required checks for this documentation synchronization are:

```bash
./tools/check_test_plan_coverage.sh
./tools/test_test_plan.sh
./tools/test_git_hooks.sh
./tools/check_as_built_sync_contract.sh
./tools/check_as_built_docs.sh
```

Heavy or recommended checks outside this set must be presented before execution unless the change scope later expands into runtime hook, CI, schema, shared-tooling, or broad implementation changes.

### Recovery Plan

- If the sync contract fails, align the contract row and all five synchronized document blocks before changing runtime artifacts.
- If the new invariant conflicts with the no-existing-feature-tradeoff rule, keep the no-existing-feature-tradeoff rule authoritative and narrow the new text.
- If future agents treat recommendation paths as automatic approval to run heavy tests, clarify recommendation versus permission in AGENTS and the specification before changing tools.
- If lightweight changes still trigger excessive local work, inspect the path policy and present a policy-change proposal rather than bypassing the existing contract.

### Developer Approval Gates

- Approval is required before reducing full/no-cache scope, changing required CI contexts, changing `full`, `fast`, or `minimal` semantics, making changed-only checks authoritative, weakening pre-commit or sync-contract coverage, or accepting any existing-feature tradeoff.
- Approval is required before changing `TEST_PLAN_MANIFEST.tsv`, `GIT_HOOK_CHECKS.tsv`, or `GIT_HOOK_RECOMMENDATION_PATHS.tsv` behavior to make this rule more or less aggressive.

## Verification Plan

Run:

```bash
./tools/check_lesson_structure.sh
./tools/check_lesson14_structure.sh
./tools/check_lesson14_sync.sh
./tools/check_agents_skills.sh
./tools/check_as_built_docs.sh
./tools/check_as_built_sync_contract.sh
./tools/as-built-sync status
./tools/check_review_protocol.sh
./tools/check_developer_memory_requirements.sh
./tools/menu
./tools/dashboard all
./tools/illustrations list
./tools/test_as_built_sync_contract.sh
./tools/test_git_workflow_policy.sh
./tools/test_git_hooks.sh
./tools/git-hooks run --mode full --no-cache
.githooks/pre-commit
./tools/test_menu_prerequisites.sh
./tools/test_lesson_start_position.sh
./tools/test_lesson.sh
./tools/test_lesson14.sh
./tools/test_product_gate_tools.sh
./tools/test_product_repository_cleanup.sh
./tools/test_lesson_repository.sh
```

Run `./tools/test_production_operations.sh` only when an external product repository is intentionally present.

The verification sequence also includes document-organization, workflow-pair synchronization, strengthened as-built synchronization, external-integration, Playwright, CI/pre-commit, and failure-path tests introduced by this plan.

Implemented local verification for the 7-day parity change passed:

```text
7-day lesson CLI tests passed.
Lesson14 CLI tests passed.
Lesson repository test passed.
```

The same verification covers the expanded language list and confirms `zh` is normalized to `zh-CN`.

## Implemented Resource Guard Safe Cleanup Implementation Plan

This plan was synchronized from `docs/memory/DEVELOPER_MEMORY.md` and implemented as `resource_guard_safe_cleanup`.
It is a follow-up capability to `resource_budget_parallel_guard`, not a replacement for the existing resource monitoring and fail-closed behavior.

### Implemented Change Targets

- `docs/workflow/RESOURCE_POLICY.tsv`
- `learning/RESOURCE_SETTINGS.tsv`
- `tools/lib/resource_guard.sh`
- `tools/resource-guard`
- `tools/test_resource_cleanup.sh`
- `tools/test_lesson_repository.sh`
- `docs/workflow/GIT_HOOK_CHECKS.tsv`
- `.github/workflows/ci.yml`
- `.github/workflows/lesson14-ci.yml`

### Implemented Order

1. Synchronized the safe cleanup plan into the five as-built and workflow documents.
   - Added `resource_guard_safe_cleanup` to `docs/workflow/AS_BUILT_SYNC_CONTRACT.tsv`.
   - Kept `resource_budget_parallel_guard` implemented and unchanged as the parent resource-control capability.

2. Extended resource policy and settings.
   - Added cleanup defaults for safe deletion, age filtering, and explicit safe-delete requirements.
   - Added policy-owned cleanup targets for Playwright report output, Playwright test results, and marked Git hooks cache.
   - Kept cleanup targets data-driven instead of embedding target lists in command branches.

3. Added shared cleanup helpers to `tools/lib/resource_guard.sh`.
   - Validate cleanup target paths.
   - Resolve paths under the lesson repository root.
   - Reject path traversal, absolute paths, symlink targets, unsafe `.git` targets, and repo-boundary escape.
   - Require the Git hooks cache marker before deleting `.git/pre-commit-cache`.
   - Apply optional age filtering before deletion.

4. Added `tools/resource-guard cleanup`.
   - Default action is dry-run.
   - `--safe` is required for deletion.
   - `--profile` filters cleanup targets by reusable profile.
   - `--older-than` overrides the configured age filter for one command.

5. Added standalone cleanup tests.
   - Added `tools/test_resource_cleanup.sh`.
   - Tests use temporary fixture repositories and do not depend on the product repository or local Playwright artifacts.
   - Tests cover dry-run, safe deletion, profile filtering, age filtering, symlink rejection, repo-outside rejection, unknown profile rejection, disabled safe cleanup, and Git hooks cache marker enforcement.

6. Connected cleanup regression to existing verification surfaces.
   - Wired cleanup tests into `tools/test_lesson_repository.sh`.
   - Added cleanup regression to `docs/workflow/GIT_HOOK_CHECKS.tsv`.
   - Added shell syntax and regression steps to both GitHub Actions workflows.

### Recovery Plan

- If dry-run deletes anything, stop and disable cleanup execution until planning is fixed.
- If a repo-outside path is accepted, stop and fix path validation before continuing.
- If a symlink escape is possible, disable safe deletion and repair boundary checks.
- If Git hooks cache cleanup fails, keep `tools/git-hooks cache clear` as the existing recovery path and repair marker validation.
- If Playwright reports are needed for debugging, use dry-run or age filtering rather than deleting them immediately.
- If CI diverges from local behavior, keep CI cleanup checks fixture-based and non-destructive outside temporary test directories.

## Implemented Resource Guard Summary And Parallel CI Implementation Plan

This implementation was synchronized from `docs/memory/DEVELOPER_MEMORY.md` as `resource_guard_summary_parallel_ci`.
It is a follow-up to the implemented resource guard, Git hooks policy, and safe cleanup work.
It must not replace existing `status`, `monitor`, `recommend-jobs`, `check`, `cleanup`, Git hooks modes, CI checks, pre-commit behavior, or lesson flows.

### Implemented Change Targets

- `tools/resource-guard`
- `tools/lib/resource_guard.sh`
- `tools/lib/git_hooks_policy.sh`
- `tools/git-hooks`
- `docs/workflow/GIT_HOOK_PARALLEL_GROUPS.tsv`
- `.github/workflows/ci.yml`
- `.github/workflows/lesson14-ci.yml`
- `tools/test_resource_guard_summary.sh`
- `tools/test_git_hooks_parallel.sh`
- `tools/check_ci_workflow_structure.sh`
- Existing aggregate and hook wiring in `tools/test_lesson_repository.sh`, `.githooks/pre-commit`, and CI workflows.

### Implemented Order

1. Synchronized the plan into the five as-built/workflow documents and added the sync contract row.
2. Added resource guard summary helpers that read profiles from `docs/workflow/RESOURCE_POLICY.tsv` and reuse `resource_guard_recommended_jobs`.
3. Added `tools/resource-guard summary` and `tools/resource-guard summary --short`.
4. Added standalone summary regression tests with fixture policy/settings files.
5. Added `docs/workflow/GIT_HOOK_PARALLEL_GROUPS.tsv` for parallel-safe, serial, heavy, and final-gate classification without changing the existing `GIT_HOOK_CHECKS.tsv` contract.
6. Added local Git hooks parallel runner support that uses the `git-hooks-full` recommendation as the maximum worker count for parallel-safe checks.
7. Kept minimal mode conservative and serial.
8. Added isolated per-check logging and deterministic replay in check definition order.
9. Added Git hooks parallel regression tests for worker limits, serial fallback, failure reporting, output order, and unclassified serial fallback.
10. Split GitHub Actions workflows into runner-oriented jobs while preserving all existing checks.
11. Added required CI workflow structure checks to verify required job names, `needs`, and required commands.
12. Ensured main CI aggregate/full-hooks jobs install npm dependencies and Playwright dependencies before running aggregate repository tests or full hooks.
13. Preserved explicit local/CI separation, including CI-safe local-resource bypass behavior with `RESOURCE_GUARD_SKIP_LOCAL_CHECK=1` for CI full hooks.
14. Wired new tests into aggregate, pre-commit, and CI.
15. Updated `docs/workflow/AS_BUILT_SYNC_CONTRACT.tsv` from planning-only artifacts and tests to actual runtime artifacts, runtime tests, and runtime evidence.
16. Moved the sync ID from `planned` to `implemented` after runtime artifacts and tests existed locally.

### Verification Plan

Verification commands:

```bash
bash -n tools/resource-guard tools/lib/resource_guard.sh tools/lib/git_hooks_policy.sh tools/git-hooks
./tools/resource-guard summary
./tools/resource-guard summary --short
./tools/test_resource_guard_summary.sh
./tools/test_resource_guard.sh
./tools/test_git_hooks_parallel.sh
./tools/test_git_hooks.sh
./tools/as-built-sync status
./tools/check_as_built_sync_contract.sh
./tools/check_as_built_docs.sh
./tools/check_workflow_pair_sync.sh
./tools/check_ci_workflow_structure.sh
./tools/git-hooks run --mode minimal --no-cache
./tools/git-hooks run --mode full --no-cache
.githooks/pre-commit
./tools/test_lesson_repository.sh
```

Optional verification:

```bash
./tools/test_lesson_playwright.sh
```

Remote CI verification should use GitHub Actions run status or PR checks after the workflow split is pushed.

### Recovery Plan

- If summary output diverges from `status` or `recommend-jobs`, fix summary helper reuse rather than duplicating calculations.
- If local parallel hooks fail due to ordering or shared state, classify the affected check as serial and keep the rest of the parallel-safe group intact.
- If logs interleave, keep per-check logs and replay order as the required baseline.
- If resource guard returns `safe-stop`, stop new parallel work instead of forcing worker execution.
- If CI job splitting drops an existing check, restore the check before pursuing runtime improvement.
- If CI job splitting becomes ambiguous, pause for developer approval rather than weakening verification.

### Developer Approval Gates

- Approval is required before changing the meaning of `full`, `fast`, or `minimal`.
- Approval is required before directly changing the `GIT_HOOK_CHECKS.tsv` column structure.
- Approval is required before making Playwright or aggregate checks more aggressively parallel than resource guard recommends.
- Approval is required before reducing duplicate CI coverage for speed.
- Approval is required before adding a CI-specific settings file if the workflow structure alone is insufficient.

## Implemented Security Guard Backfill Implementation Plan

This implementation is synchronized from `docs/memory/DEVELOPER_MEMORY.md`.
The sync ID is implemented because runtime artifacts, tests, Git hooks wiring, CI wiring, and pre-commit wiring are present.

### Implemented Scope

- Added a Security guard backfill sync scope that is separate from learner-context runtime integration.
- Added repository-level security invariants to the agent rule layer.
- Added `docs/workflow/SAFEFLOW_SECURITY_BACKFILL.tsv` as a policy table for security surfaces, invariants, evidence, required checks, and status.
- Added `tools/lib/security_invariants.sh`, `tools/check_security_invariants.sh`, and `tools/test_security_invariants.sh`.
- Wired the checker into aggregate tests, Git hooks, CI, and pre-commit.

### Implemented Order

1. Added the policy table with a small schema rather than overbuilding severity or owner routing.
2. Added the reusable security-invariant checker and regression test.
3. Added Git hooks recommendation paths and hook checks after the checker existed.
4. Wired standalone, sync, aggregate, Git hooks, pre-commit, and CI verification.
5. Moved `safeflow_security_backfill` from planned to implemented after runtime artifacts and tests passed locally.

### Verification

```bash
./tools/check_security_invariants.sh
./tools/test_security_invariants.sh
./tools/as-built-sync status
./tools/check_as_built_sync_contract.sh
./tools/check_workflow_pair_sync.sh
./tools/test_lesson_repository.sh
./tools/git-hooks run --mode minimal --no-cache
./tools/git-hooks run --mode full --no-cache
.githooks/pre-commit
```

### Recovery

- If the checker creates false positives, adjust policy categories or allowlists instead of adding one-off bypasses.
- If a proposed invariant conflicts with existing behavior, stop and ask for developer approval.
- If a security check requires network access, separate it from pre-commit and local non-network verification.

## Implemented Product Security Workflow Gate Implementation Plan

This implementation is synchronized from `docs/memory/DEVELOPER_MEMORY.md`.
The sync ID is implemented because product-security runtime commands, policy, tests, and menu/workflow wiring exist.

### Implemented Scope

- Added product-security advice, check, and gate behavior for menu items 4, 5, and 6.
- Keep existing Free Development, Product Improvement, External Integration, repository-boundary, Git sync, CI, and document-sync gates.
- Added product security policy configuration instead of hard-coded stack-specific branches.
- Added workflow-context risk metadata for Free Development, Product Improvement, External Integration, and lesson maintenance.
- Added dashboard and menu safety summaries that explain next safe action, what not to touch, and what requires approval.

### Implemented Order

1. Added `docs/workflow/PRODUCT_SECURITY_POLICY.tsv` and `learning/context/WORKFLOW_CONTEXT_MAP.tsv`.
2. Added `tools/lib/product_security.sh` as the reusable product-security library.
3. Added `tools/product-security status|preflight|advise|check|gate`.
4. Added `tools/test_product_security.sh` using temporary product repositories and fixture policies.
5. Connected the product-security gate to menu items 4, 5, and 6 without replacing existing gates.
6. Strengthened External Integration start/preflight prompts to require explicit OAuth/API and logging confirmation.
7. Added product-repository context handling after the product repository is known.
8. Wired tests into aggregate tests, Git hooks, CI, and pre-commit.
9. Moved `product_security_workflow_gate` from planned to implemented after runtime artifacts and tests passed locally.

### Verification

```bash
./tools/product-security status
./tools/product-security preflight
./tools/product-security check
./tools/test_product_security.sh
./tools/test_product_gate_tools.sh
./tools/as-built-sync status
./tools/check_as_built_sync_contract.sh
./tools/check_workflow_pair_sync.sh
./tools/test_lesson_repository.sh
./tools/git-hooks run --mode minimal --no-cache
./tools/git-hooks run --mode full --no-cache
.githooks/pre-commit
```

### Recovery

- If the gate blocks too much, split high-confidence blocks from warnings instead of weakening all security checks.
- If a stack-specific check is needed, put the detection and command mapping in policy or reusable library code.
- If product repository context is ambiguous, stop and require user confirmation instead of scanning outside the configured repository.

### Developer Approval Gates

- Future approval is required before expanding AGENTS.MD security-invariant wording beyond the implemented additive rule.
- Future approval is required before adding new product-security blocking conditions.
- Future approval is required before making External Integration approvals mandatory beyond the implemented OAuth/API and logging scope.
- Approval is required before enabling network-dependent audits such as `npm audit` in CI.
- Approval is required before adding product repository cleanup strengthening to this implementation instead of a later sync scope.

## Implemented Test And CI Safe Time Optimization Implementation

This plan is synchronized as `test_ci_safe_time_optimization_plan`.
The implemented first phase keeps runtime test selection, CI required behavior, pre-commit behavior, and Git hook mode semantics intact while adding observe-only planning, fail-closed coverage checks, result attestation, CI-safe Git hooks parallelism, and lightweight fixture copying.

### Implemented Change Targets

- `docs/workflow/TEST_PLAN_MANIFEST.tsv` stores machine-readable observe-only test-plan policy.
- `tools/lib/test_plan.sh` and `tools/test-plan` implement changed-path classification, manifest generation, coverage validation, and result attestation.
- `tools/check_test_plan_coverage.sh` and `tools/test_test_plan.sh` provide standalone and aggregate-callable checks.
- `tools/git-hooks` accepts `--jobs <count>` and `GIT_HOOKS_JOBS` while local execution remains capped by resource guard recommendations.
- `.github/workflows/ci.yml` and `.github/workflows/lesson14-ci.yml` keep full/no-cache verification and request CI-safe full-hooks parallelism with `--jobs 4`.
- `tools/lib/fixture_copy.sh`, `tools/fixture-copy`, and `tools/test_fixture_copy.sh` implement and validate lightweight fixture copying.
- `docs/workflow/GIT_HOOK_CHECKS.tsv`, `docs/workflow/GIT_HOOK_PARALLEL_GROUPS.tsv`, `docs/workflow/GIT_HOOK_RECOMMENDATION_PATHS.tsv`, `tools/test_lesson_repository.sh`, and `tools/check_ci_workflow_structure.sh` wire the new checks into existing local, aggregate, Git hooks, and CI gates.

### Implemented Order And Preserved Future Work

1. Added a Test Plan Manifest in observe-only mode.
   - Generate `run` and `force` decisions without changing actual CI enforcement.
   - Print learner-readable decision and full-escalation reasons.
   - Treat unknown paths and dangerous paths as full/no-cache until classified.

2. Added Coverage Guard.
   - Fail closed when policy rows are malformed, reference unknown Git hook checks, omit required dangerous-change patterns, weaken required dangerous-change full/CI escalation, or emit a force decision without full escalation.
   - Keep CI/pre-commit wiring verification in the CI workflow structure checker.
   - Add tests that prove unsafe changed-only decisions fail before any CI skipping is allowed.

3. Added Result Attestation.
   - Record policy hash, check-catalog hash, repository-state hash, manifest hash, generated run/force decisions, and final observe-only authority.
   - Keep attestation as evidence, not as approval or proof of delivery.

4. Connected observe-only checks to local hooks, aggregate tests, and CI.
   - Local `minimal`, `fast`, and `full` run the coverage guard through the configured hook catalog.
   - CI runs the coverage guard and test-plan regression while still running the existing required full verification.

5. Kept the hook-specific gap-only final gate as future work.
   - Keep `tools/test_lesson_repository.sh` as the standalone exhaustive aggregate command.
   - In full hooks, replace duplicate aggregate reruns only after a mechanical coverage check proves that individual hook rows plus the gap gate cover the standalone aggregate expectations.

6. Kept as-built validation single-pass behavior as future work.
   - Keep strict standalone defaults.
   - Add internal-only options only after tests prove callers already ran `tools/check_as_built_sync_contract.sh` once in the same path.

7. Kept Playwright duplicate-execution removal as future work.
   - Keep Playwright as required local/CI verification where relevant.
   - Ensure CI final aggregation checks Playwright evidence rather than rerunning the browser suite.

8. Added CI-safe hook parallelism.
   - Keep `--mode full --no-cache`.
   - Add an explicit CI worker setting through `--jobs` or `GIT_HOOKS_JOBS`.
   - Do not use local WSL resource settings as CI truth.

9. Reduced fixture-copy cost.
   - Add a shared fixture-copy helper that excludes `.git`, `node_modules`, `playwright-report`, `test-results`, and cache directories.
   - Require any test fixture that depends on untracked files to declare those files explicitly.

10. Kept changed-only selection observe-only.
    - Compare planned changed-only output against full CI results.
    - Do not let changed-only skip CI checks until Coverage Guard and Result Attestation are implemented and have sufficient passing evidence.

### Document Synchronization Policy

- `docs/as-built/REQUIREMENTS.md` describes the guarantees and non-goals.
- `docs/as-built/SPECIFICATION.md` describes manifest, guard, attestation, cache, CI, and quarantine behavior.
- `docs/as-built/IMPLEMENTATION_PLAN.md` describes implementation order, recovery, and approval gates.
- `docs/workflow/TASK_TRACKER.md` records implemented task state and preserved future work.
- `docs/workflow/HANDOFF.md` records restart context, risks, future approval gates, and next steps.
- The sync ID is implemented because runtime artifacts, standalone tests, aggregate wiring, CI wiring, and pre-commit behavior are present and verified for the safe first phase.

### Verification Plan

Implemented verification:

```bash
bash -n tools/test-plan tools/lib/test_plan*.sh tools/lib/fixture_copy.sh tools/fixture-copy tools/check_test_plan_coverage.sh tools/test_test_plan.sh tools/test_fixture_copy.sh
./tools/test_test_plan.sh
./tools/check_test_plan_coverage.sh
./tools/test_fixture_copy.sh
./tools/test_git_hooks_parallel.sh
./tools/check_ci_workflow_structure.sh
./tools/check_as_built_sync_contract.sh
./tools/check_as_built_docs.sh
./tools/as-built-sync status
./tools/test_lesson_repository.sh
./tools/git-hooks run --mode minimal --no-cache
./tools/git-hooks run --mode full --no-cache
.githooks/pre-commit
```

### Recovery Plan

- If Test Plan Manifest output is wrong, keep it observe-only and fix policy classification before changing execution behavior.
- If Coverage Guard blocks valid work, fix the manifest or impact map; do not bypass the guard with ad hoc path exceptions.
- If attestation is incomplete, keep full CI authoritative and repair evidence generation.
- If same-run cache creates stale reuse, disable reuse and keep full/no-cache execution until hash inputs are corrected.
- If gap-only final gate misses aggregate coverage, restore the standalone aggregate in full hooks and repair the mechanical coverage check.
- If CI workflow consolidation changes required check names, pause for developer approval and branch-protection migration planning.

### Developer Approval Gates

- Approval is required before making changed-only selection authoritative in CI.
- Approval is required before changing required CI check names or consolidating `ci.yml` and `lesson14-ci.yml` in a way that affects branch protection.
- Approval is required before reducing full/no-cache scope.
- Approval is required before adding flaky quarantine.
- Approval is required before changing the meaning of `full`, `fast`, or `minimal`.
- Approval is required before using persistent verification-result cache in CI.

## Implemented Test And CI Final Gate Optimization Implementation Plan

This plan is synchronized as `test_ci_final_gate_optimization_plan`.
It is implemented as the completed test and CI time optimization work for reducing the current long `aggregate-and-full-hooks` runtime without reducing coverage.

### Planned Change Targets

- `.github/workflows/ci.yml` and `.github/workflows/lesson14-ci.yml` for dependency caching, same-run evidence handoff, and common-versus-Lesson14 final-gate separation.
- `docs/workflow/TEST_PLAN_MANIFEST.tsv` and `docs/workflow/FINAL_GATE_COVERAGE.tsv` for cache-scope, aggregate coverage, and final-gate policy alignment.
- `docs/workflow/GIT_HOOK_CHECKS.tsv`, `docs/workflow/GIT_HOOK_PARALLEL_GROUPS.tsv`, and `docs/workflow/GIT_HOOK_RECOMMENDATION_PATHS.tsv` for hook catalog and final-gate coverage mapping.
- `tools/git-hooks` and shared Git hook policy code for full-mode gap-only final-gate dispatch.
- `tools/test_lesson_repository.sh` as the standalone exhaustive aggregate command that must remain available.
- `tools/check_ci_workflow_structure.sh` for mechanical enforcement of the optimized CI shape.
- New implementation-specific checks and tests for gap-only coverage, same-run evidence reuse, Playwright evidence reuse, and as-built evidence reuse.

### Planned Implementation Order

1. Add same-run evidence primitives.
   - Define a repo-local or workflow-local evidence directory.
   - Record command ID, commit SHA, workflow name, job name, policy hash, check catalog hash, input hashes, result hash, and timestamp.
   - Reject evidence that is missing, stale, corrupted, mismatched, or from a different command identity.

2. Add as-built and sync evidence reuse.
   - Generate evidence from strict as-built and sync checks.
   - Reuse evidence only inside the same command or CI run when synchronized document hashes, sync-contract hash, checker hashes, and repository-state hash match.
   - Keep strict standalone commands unchanged.

3. Add Playwright evidence reuse.
   - Generate evidence from the `playwright-tests` job.
   - Final aggregation checks evidence instead of rerunning Playwright when config, test files, dependency lockfile, command identity, commit SHA, workflow run, source job identity, and result status match.
   - Rerun or fail closed when evidence cannot be trusted.

4. Add hook-specific gap-only final gate.
   - Keep `tools/test_lesson_repository.sh` as the exhaustive command.
   - Replace the full hook's duplicate aggregate rerun with a final gate that proves individual hook rows plus explicit final-gap checks cover the aggregate expectations.
   - Add a standalone coverage map and test proving the gate fails when any aggregate requirement is uncovered.

5. Reduce common CI duplication between `CI` and `Lesson14 CI`.
   - Keep required workflow names unless developer approval is granted to change them.
   - Move common heavy verification into one common path where possible.
   - Keep Lesson14-specific structure and CLI checks in `Lesson14 CI` through a Lesson14-specific final gate instead of the common aggregate/full-hooks gate.
   - If branch-protection constraints require both workflows to report, reduce duplicate internals without renaming checks.
   - Keep the legacy `Lesson14 CI` `playwright-tests` and `aggregate-and-full-hooks` job names as compatibility gates that do not duplicate browser execution, `tools/test_lesson_repository.sh`, or `tools/git-hooks run --mode full --no-cache`.
   - Extend Git hook recommendation paths so final-gate coverage, final-gate commands, same-run evidence, and as-built evidence implementation changes recommend local `full --no-cache`.

6. Add dependency caching.
   - Use GitHub Actions npm dependency caching.
   - Add Playwright browser dependency caching where safe for hosted runners.
   - Never restore verification-result cache from earlier commits or workflow runs.

7. Extend cleanup and cache management.
   - Include same-run evidence, Playwright reports, test results, temporary fixtures, and repo-local cache directories.
   - Keep global caches, OS caches, Docker, swap, processes, product repositories, and user-home cleanup out of scope without explicit approval.

8. Update mechanical enforcement.
   - Extend CI structure checks to require the optimized final-gate shape.
   - Keep new tests standalone and callable from aggregate tests.
   - Keep `TEST_PLAN_MANIFEST.tsv` cache-scope policy aligned with implemented behavior.

### Document Synchronization Policy

- Requirements describe the guarantees, non-goals, and approval gates.
- Specification describes same-run evidence validity, cache boundaries, and fail-closed behavior.
- Implementation plan describes change order, validation, recovery, and approval points.
- Task tracker records the implemented work and final verification state.
- Handoff records restart instructions and the next implementation boundary.
- The as-built sync contract is `implemented` because the runtime artifacts and tests exist, are wired, and are expected to pass.

### Verification Plan

The implementation must add and pass these checks before the sync ID can become `implemented`:

```bash
./tools/check_as_built_sync_contract.sh
./tools/check_as_built_docs.sh
./tools/check_test_plan_coverage.sh
./tools/check_ci_workflow_structure.sh
./tools/test_test_plan.sh
./tools/test_git_hooks_parallel.sh
./tools/test_resource_cleanup.sh
./tools/test_lesson_start_position.sh
./tools/test_lesson14.sh
./tools/test_lesson_repository.sh
./tools/git-hooks run --mode full --no-cache --jobs 4
.githooks/pre-commit
```

The implementation must also add focused tests for:

- gap-only final-gate coverage,
- same-run evidence reuse and stale-evidence rejection,
- Playwright evidence reuse and changed-input rejection,
- as-built evidence reuse and changed-document rejection,
- CI dependency cache wiring,
- cleanup coverage for same-run evidence and generated reports.

### Recovery Plan

- If gap-only final gate misses coverage, restore the duplicate aggregate rerun in full hooks and fix the coverage map.
- If same-run evidence is stale or ambiguous, disable evidence reuse for that command and rerun the strict check.
- If Playwright evidence cannot be trusted, rerun Playwright rather than passing on incomplete evidence.
- If as-built evidence mismatches input hashes, rerun strict as-built checks.
- If dependency caching causes CI-only failures, remove the cache step or narrow the cache key.
- If CI workflow consolidation affects required check names, stop and request developer approval.

### Developer Approval Gates

- Approval is required before changing required CI workflow or job names.
- Approval is required before reducing full/no-cache scope.
- Approval is required before making changed-only CI selection authoritative.
- Approval is required before reusing verification results across workflow runs or commits.
- Approval is required before introducing flaky quarantine.
- Approval is required before accepting any existing-feature tradeoff; the approval request must state the reason, impact, alternatives, and rollback path.

## Implemented Test And CI Full Pipeline Acceleration Implementation Plan

This plan is synchronized as `test_ci_full_pipeline_acceleration_plan`.
Runtime behavior is implemented through policy files, focused regression checks, CI workflow structure checks, and workflow wiring.
The purpose is to complete the remaining local and remote test/CI speed work after the final-gate evidence-reuse implementation, without weakening any required check or existing workflow.

### Implemented Change Targets

- `.github/workflows/ci.yml` and `.github/workflows/lesson14-ci.yml` for GitHub Actions deprecation handling, Playwright setup optimization, job separation, duplicate-policy regression reduction, and CI-runner-oriented parallelism.
- `docs/workflow/TEST_PLAN_MANIFEST.tsv`, `docs/workflow/GIT_HOOK_CHECKS.tsv`, `docs/workflow/GIT_HOOK_PARALLEL_GROUPS.tsv`, `docs/workflow/GIT_HOOK_RECOMMENDATION_PATHS.tsv`, `docs/workflow/FINAL_GATE_GAP_COMMANDS.tsv`, and `docs/workflow/FINAL_GATE_COVERAGE.tsv` for machine-readable check ownership, risk, cache scope, parallel grouping, and final-gate coverage policy.
- `tools/git-hooks`, `tools/lib/git_hooks_policy.sh`, `tools/lib/resource_guard.sh`, `tools/ci-final-gate`, `tools/ci-evidence`, `tools/lib/ci_evidence.sh`, and `tools/lib/as_built_evidence.sh` for local execution, evidence validation, same-run reuse, and resource-aware behavior.
- `tools/check_as_built_sync_contract.sh`, `tools/check_ci_workflow_structure.sh`, `tools/check_test_plan_coverage.sh`, `tools/test_ci_evidence.sh`, `tools/test_ci_final_gate.sh`, `tools/test_git_hooks_parallel.sh`, and `tools/test_lesson_repository.sh` for mechanical verification.
- `tools/ci-playwright-setup` and `tools/test_ci_pipeline_acceleration.sh` for cache-aware Playwright setup and focused acceleration regression coverage.
- Future implementation candidates such as `tools/ci-metrics` or additional focused tests may be added only when they are generic, reusable, standalone-testable, aggregate-testable, and synchronized into the contract after creation.

### Implemented Steps

1. GitHub Actions deprecation regressions are mechanically guarded first.
   - Required workflow/job meanings are preserved.
   - CI workflow structure checks reject old major action versions and `continue-on-error: true`.

2. Playwright setup is optimized.
   - `tools/ci-playwright-setup` prefers npm cache reuse and checks whether Chromium is already installed.
   - Playwright execution is preserved and setup falls back to normal install behavior when cache state is missing, stale, or unsupported.

3. Full-hook parallelization is expanded safely.
   - Lesson CLI fixture checks are classified through the existing parallel-group policy after confirming independent fixture state.
   - Keep unclassified or ambiguous checks serial.

4. Same-run evidence reuse remains scoped and fail-closed.
   - Same-run reuse for existing evidence-backed checks remains valid only when relevant hashes, command identities, repository state, and success status match.
   - Keep strict standalone commands available.

5. Duplicated policy-regression work between `CI` and `Lesson14 CI` is reduced.
   - Keep required workflow and job contexts unless developer approval changes them.
   - Main `CI` owns common policy regression work.
   - `Lesson14 CI` keeps compatibility contexts and lesson-specific gates without rerunning browser tests, `tools/test_lesson_repository.sh`, or full Git hooks.

6. `aggregate-and-full-hooks` internals preserve the optimized final-gate structure.
   - Evidence generation, evidence verification, and final-gap gate behavior remain covered by existing final-gate implementation and structure checks.
   - Preserve the externally required final guarantee that aggregate, full hooks, final-gap coverage, and evidence validity all pass.

7. Changed-only CI remains prepared for a future approval gate.
   - Keep changed-only observe-only in this implementation cycle.
   - Do not make changed-only authoritative until Coverage Guard, Result Attestation, full-CI comparison evidence, and developer approval are complete.

### Document Synchronization Policy

- Requirements state the guarantees, safety boundaries, and approval gates.
- Specification states policy-driven behavior, evidence validity, CI structure, and fail-closed behavior.
- Implementation plan states the implementation order, verification, recovery, and approval points.
- Task tracker records this as implemented work with final verification status.
- Handoff records the restart boundary for future test/CI acceleration work.
- The sync contract is `implemented` after runtime artifacts exist, tests are wired, and local plus remote verification pass.

### Verification Plan

The implementation cycle must run the related checks that already exist before and after changes:

```bash
git diff --check
./tools/check_as_built_sync_contract.sh
./tools/check_as_built_docs.sh
./tools/check_test_plan_coverage.sh
./tools/check_ci_workflow_structure.sh
./tools/test_ci_pipeline_acceleration.sh
./tools/test_ci_evidence.sh
./tools/test_ci_final_gate.sh
./tools/test_git_hooks_parallel.sh
./tools/test_lesson_repository.sh
```

The implementation cycle adds focused tests when new behavior is introduced:

- CI workflow deprecation and action-version structure checks.
- Playwright cache-key and fallback tests.
- Parallel-group independence tests for newly parallelized checks.
- Same-run evidence reuse and stale-evidence rejection tests for new evidence types.
- Duplicate-policy regression prevention checks.
- Aggregate/final-hook split tests that prove no required coverage is lost.
- Changed-only observe-only metrics tests if metrics are added.
- `tools/test_ci_pipeline_acceleration.sh` is the focused standalone and aggregate-callable regression check for this cycle.
- `tools/check_as_built_sync_contract.sh` recognizes the documented split between main `CI` common verification and `Lesson14 CI` compatibility contexts without accepting missing main CI coverage.
- `tools/check_as_built_sync_contract.sh` caches wiring lookups only within one checker process to avoid re-scanning the same evidence repeatedly; this is not persistent verification-result caching.

### Recovery Plan

- If a cache causes stale or CI-only failures, narrow the cache key or remove the cache step.
- If parallelization causes nondeterministic output or shared-state collisions, move that check back to serial and update the policy row.
- If evidence reuse is ambiguous, disable reuse for that command and rerun the strict check.
- If job splitting affects required check names, restore compatibility contexts and request developer approval before changing names.
- If changed-only appears to skip required coverage, keep it observe-only and fail the new guard.
- If any existing-feature tradeoff appears necessary, stop and request developer approval with reason, impact, alternatives, and rollback path.

### Developer Approval Gates

- Approval is required before changing required CI workflow or job names.
- Approval is required before reducing full/no-cache scope.
- Approval is required before making changed-only CI authoritative.
- Approval is required before caching verification results across commits, branches, workflow runs, repositories, or users.
- Approval is required before adding flaky quarantine.
- Approval is required before accepting any existing-feature tradeoff; the approval request must state the reason, impact, alternatives, and rollback path.

## CI Timing And Approved Auto-Improvement Implementation Plan

SYNC-ID: ci_timing_auto_improvement_plan
STATUS: implemented
ARTIFACTS: docs/workflow/TEST_PLAN_MANIFEST.tsv,docs/workflow/GIT_HOOK_CHECKS.tsv,docs/workflow/GIT_HOOK_PARALLEL_GROUPS.tsv,docs/workflow/GIT_HOOK_RECOMMENDATION_PATHS.tsv,docs/workflow/FINAL_GATE_GAP_COMMANDS.tsv,docs/workflow/FINAL_GATE_COVERAGE.tsv,tools/check_ci_status.sh,tools/check_ci_workflow_structure.sh,tools/lib/ci_timing.sh,tools/ci-timing,tools/test_ci_timing.sh,tools/test_ci_pipeline_acceleration.sh,tools/test_ci_evidence.sh,tools/test_ci_final_gate.sh,tools/test_git_hooks_parallel.sh,tools/test_lesson_repository.sh,.github/workflows/ci.yml,.github/workflows/lesson14-ci.yml
TESTS: tools/check_ci_workflow_structure.sh,tools/test_ci_timing.sh,tools/test_ci_pipeline_acceleration.sh,tools/test_ci_evidence.sh,tools/test_ci_final_gate.sh,tools/test_git_hooks_parallel.sh,tools/check_as_built_sync_contract.sh

This implementation adds measurement, precise CI completion checks, and approval-gated improvement proposals before any reduction in final-gate or full/no-cache behavior.
It is runtime-implemented for timing and proposal generation, while generated improvements remain read-only until developer approval.

### Implemented Change Targets

- Added reusable timing report support for final-gate and Git hooks checks through `tools/lib/ci_timing.sh` and `tools/ci-timing`.
- Connected timing report output to CI artifact collection for the main `CI` final common aggregate and full-hooks checks.
- Strengthened `tools/check_ci_status.sh` so workflow name, run id, commit SHA when available, run state, job state, and conclusion are checked without confusing `CI` and `Lesson14 CI`.
- Added read-only CI improvement proposal generation through `tools/ci-timing propose`.
- Kept same-run hash-evidence reuse recommendations gated by command identity, input hashes, policy hashes, repository-state hash, workflow/run identity, and success status.
- Connected the implementation through `docs/workflow/GIT_HOOK_PARALLEL_GROUPS.tsv`, `docs/workflow/GIT_HOOK_CHECKS.tsv`, `docs/workflow/TEST_PLAN_MANIFEST.tsv`, final-gate policy files, CI workflow structure checks, and aggregate tests.
- Kept conditional `full no-cache` reduction as a future developer-approved step.

### Implemented Order

1. Added timing report data structures and focused tests.
   - `tools/lib/ci_timing.sh` records check id, display name, command id, mode, start time, end time, duration seconds, exit status, command hash, input hash, policy hash, repository-state hash, evidence-use state, workflow/job/run identity, and commit SHA.
   - `tools/test_ci_timing.sh` validates success recording, failure recording, marker safety, proposal generation, and read-only behavior.

2. Attached timing report generation to the final common aggregate and full-hooks checks.
   - The `Lesson aggregate test` step runs through `tools/ci-timing run lesson_aggregate`.
   - The `Git hooks full no-cache regression` step runs through `tools/ci-timing run git_hooks_full_no_cache`.
   - The job uploads the timing report as `ci-timing-${{ github.run_id }}-${{ github.run_attempt }}`.

3. Improved CI status targeting.
   - `tools/check_ci_status.sh` can target workflow identity and run id.
   - When run from this lesson repository with `--required` and no explicit workflow, it requires both `CI` and `Lesson14 CI` for the target branch/commit.
   - It checks job status and conclusion for the selected required run.
   - Calls from product or other repositories preserve the narrower single-workflow behavior.

4. Added read-only improvement proposal generation.
   - `tools/ci-timing propose` reports slow checks, same-run evidence candidates, and parallelization candidates.
   - Proposals include reason, affected files, required verification, and developer-approval requirement.
   - The command never edits workflow or policy files.

5. Connected tests and policies.
   - Added `test_ci_timing` to Git hook checks, parallel groups, final-gate coverage, Test Plan Manifest, CI syntax checks, CI policy regression checks, and aggregate repository tests.
   - Updated `tools/check_ci_workflow_structure.sh` and `tools/test_ci_pipeline_acceleration.sh` so workflow timing integration is mechanically checked.

6. Preserved future approval gates.
   - Same-run evidence reuse expansion remains fail-closed and recommendation-only unless a later approved implementation changes strict rerun behavior.
   - Full hook parallel-group refinement remains policy-driven.
   - Conditional `full no-cache` operation remains disabled until developer approval.

### Verification Plan

```bash
git diff --check
./tools/check_ci_workflow_structure.sh
./tools/test_ci_timing.sh
./tools/test_ci_pipeline_acceleration.sh
./tools/test_ci_evidence.sh
./tools/test_ci_final_gate.sh
./tools/test_git_hooks_parallel.sh
./tools/check_as_built_sync_contract.sh
./tools/check_as_built_docs.sh
./tools/test_lesson_repository.sh
```

### Recovery Plan

- If timing output destabilizes CI, make timing collection non-authoritative and keep the existing strict checks running.
- If CI status targeting misses a valid required workflow, split workflow selection, run selection, and commit matching into separate validated functions.
- If proposal generation overstates safety, keep it read-only and add stricter candidate classification.
- If same-run evidence reuse is ambiguous, disable reuse for that check and run the strict command.
- If parallel grouping produces nondeterministic output or shared-state collisions, move that check back to serial policy.
- If any existing-feature tradeoff appears necessary, stop and request developer approval with reason, impact, alternatives, and rollback path.

### Developer Approval Gates

- Approval is required before implementing a generated CI improvement proposal.
- Approval is required before reducing or conditionally skipping `full no-cache`.
- Approval is required before changing required workflow or job names.
- Approval is required before caching verification results across commits, branches, workflow runs, repositories, or users.
- Approval is required before accepting any existing-feature tradeoff.

## Implemented CI Aggregate And Full-Hooks Split Implementation Plan

SYNC-ID: ci_aggregate_full_hooks_split
STATUS: implemented
ARTIFACTS: docs/workflow/AS_BUILT_SYNC_CONTRACT.tsv,docs/workflow/TEST_PLAN_MANIFEST.tsv,tools/check_ci_workflow_structure.sh,tools/test_ci_pipeline_acceleration.sh,tools/check_as_built_sync_contract.sh,tools/ci-timing,tools/test_ci_timing.sh,tools/lib/ci_evidence.sh,tools/test_ci_evidence.sh,.github/workflows/ci.yml,.github/workflows/lesson14-ci.yml
TESTS: tools/check_ci_workflow_structure.sh,tools/test_ci_pipeline_acceleration.sh,tools/test_ci_timing.sh,tools/test_ci_evidence.sh,tools/check_as_built_sync_contract.sh,tools/check_as_built_docs.sh

This implementation applies the approved first CI acceleration candidate from the measured timing work: split the main `CI` final common verification job into parallelizable jobs and a strict final gate.
It is intentionally limited to job scheduling and evidence handoff; it does not change cache policy, full/no-cache scope, or authoritative check coverage.

### Implemented Change Targets

- Replace the main `CI` workflow `aggregate-and-full-hooks` job with `lesson-aggregate`, `git-hooks-full-no-cache`, and `final-gate`.
- Keep both split jobs behind the same prerequisite gates that previously fed the combined final job.
- Keep `tools/test_lesson_repository.sh --use-evidence --write-evidence` in `lesson-aggregate`.
- Keep `tools/git-hooks run --mode full --no-cache --jobs 4` in `git-hooks-full-no-cache`.
- Upload same-run Git hook evidence from `git-hooks-full-no-cache` and require it in an always-started `final-gate` that validates split prerequisite results and expected evidence source before evidence verification.
- Preserve timing reports by uploading split timing parts with distinct report filenames and merging them into the existing final timing artifact.
- Keep `CI_TIMING_REPORT` local to `tools/ci-timing` report recording and out of the wrapped command environment.
- Keep same-run evidence artifact filenames safe for GitHub artifact upload while preserving original evidence ids in metadata.
- Update `tools/check_ci_workflow_structure.sh` and `tools/test_ci_pipeline_acceleration.sh` so the split is mechanically checked.
- Keep `Lesson14 CI` compatibility contexts intact; a stable compatibility marker and structure checks may point at the main `CI` split without rerunning common heavy work.

### Implemented Order

1. Synchronized the approved scope into the as-built contract and the five synchronized documents.
2. Updated the main `CI` workflow jobs and evidence/timing artifact handoff.
3. Updated workflow structure checks to require the new job graph, no-cache command, evidence requirement, and timing-part merge.
4. Updated the focused acceleration test to reject unsafe setup regressions and require the split wiring.
5. Complete synchronization, structure, focused CI, aggregate, full/no-cache, and pre-commit verification before commit and push.
6. Complete sub-agent review for requirements/specification consistency and CI implementation safety before final remote verification.

### Verification Plan

```bash
git diff --check
./tools/check_ci_workflow_structure.sh
./tools/test_ci_pipeline_acceleration.sh
./tools/check_as_built_sync_contract.sh
./tools/check_as_built_docs.sh
./tools/check_test_plan_coverage.sh
./tools/test_ci_timing.sh
./tools/test_ci_evidence.sh
./tools/test_ci_final_gate.sh
./tools/test_lesson_repository.sh
./tools/git-hooks run --mode full --no-cache --jobs 4
.githooks/pre-commit
./tools/check_ci_status.sh --required
```

### Recovery Plan

- If the split job graph loses coverage, restore the combined final job and keep the timing evidence for a narrower redesign.
- If split prerequisite results or same-run evidence cannot be validated in `final-gate`, fail closed and restore strict rerun behavior before reporting PASS.
- If timing artifact merging fails, keep strict verification and fix artifact names or download patterns before push.
- If required check contexts are affected, restore compatibility contexts and request developer approval before changing names.
- If any existing-feature tradeoff appears necessary, stop and request developer approval with reason, impact, alternatives, and rollback path.

### Developer Approval Gates

- Approval is required before changing required workflow or job names beyond the approved main `CI` split.
- Approval is required before reducing or conditionally skipping `full no-cache`.
- Approval is required before adding persistent verification-result caching.
- Approval is required before splitting Git hooks into a group matrix.
- Approval is required before making changed-only CI authoritative.
- Approval is required before accepting any existing-feature tradeoff.

## Implemented Dashboard Control Center Data Layer Implementation Plan

SYNC-ID: dashboard_control_center_data_layer
STATUS: implemented
ARTIFACTS: docs/workflow/DASHBOARD_DATA_SCHEMA.tsv,docs/workflow/AS_BUILT_SYNC_CONTRACT.tsv,docs/workflow/TEST_PLAN_MANIFEST.tsv,docs/workflow/GIT_HOOK_CHECKS.tsv,docs/workflow/GIT_HOOK_PARALLEL_GROUPS.tsv,docs/workflow/FINAL_GATE_GAP_COMMANDS.tsv,docs/workflow/FINAL_GATE_COVERAGE.tsv,tools/lib/dashboard_data.sh,tools/dashboard-data,tools/test_dashboard_schema.sh,tools/test_dashboard_data.sh,tools/test_lesson_repository.sh,tools/check_lesson_structure.sh,tools/check_lesson14_structure.sh,tools/check_ci_workflow_structure.sh,.github/workflows/ci.yml,.github/workflows/lesson14-ci.yml
TESTS: tools/test_dashboard_schema.sh,tools/test_dashboard_data.sh,tools/check_test_plan_coverage.sh,tools/test_git_hooks.sh,tools/test_git_hooks_parallel.sh,tools/test_ci_final_gate.sh,tools/check_ci_workflow_structure.sh,tools/check_as_built_sync_contract.sh,tools/check_as_built_docs.sh

This implementation adds the read-only JSON data layer behind an AI-driven development control center.
The first runtime phase creates the data layer before any React or browser UI work.
The current synchronized state includes the schema source, shared dashboard-data helpers, `tools/dashboard-data`, focused tests, aggregate wiring, Git hooks wiring, CI syntax and policy wiring, and no browser UI dependency or UI action execution.

### Implemented Change Targets

- Keep `docs/workflow/DASHBOARD_DATA_SCHEMA.tsv` as the implemented source for JSON fields, source groups, allowed state vocabulary, and safety requirements.
- Keep `tools/test_dashboard_schema.sh` as the standalone and aggregate-callable schema drift guard.
- Add `tools/lib/dashboard_data.sh` for reusable JSON escaping, status vocabulary validation, source tracking, partial failure collection, and command-preview construction.
- Add `tools/dashboard-data` as the read-only JSON producer.
- Add `tools/test_dashboard_data.sh` as a standalone-callable and aggregate-callable focused regression test.
- Connect the focused test through `tools/test_lesson_repository.sh`, Git hooks, pre-commit, CI, and the sync contract after the runtime artifacts exist.
- Keep `tools/dashboard` human-readable and backward-compatible unless the developer approves a separate JSON mode.
- Keep future React/Vite mechanics hidden behind the dashboard control-center surface so ordinary users do not have to understand Vite commands, dev-server URLs, package scripts, or frontend internals.
- Design the future UI/UX so non-engineer users perform one action only: open the dashboard/control center through the provided entry point, with setup, Vite startup, URL discovery, JSON data loading, and check orchestration handled by maintained tooling.
- Design the future control panel for two audiences: plain-language lesson content/progress/management for non-engineers, and precise workflow content/progress/management, gate, evidence, and next-action detail for intermediate and senior engineers doing practical work.
- Treat lessons and workflows as two first-class repository surfaces: future UI work must group, label, and prioritize them separately while keeping both surfaces easy to scan, understand, and operate.

### Implemented Phase Summary

1. Synchronized the plan first.
   - Recorded the sync ID in the as-built sync contract and the five synchronized documents.
   - Kept runtime artifacts out of the contract until they were created.
   - Validated the schema through `tools/test_dashboard_schema.sh`.

2. Stabilize the JSON contract.
   - Confirm the required top-level fields, nested sections, concise guidance items, completed-lesson representation, state vocabulary, and source attribution.
   - Keep `policy ready`, `settings ready`, `gate passed`, `approval required`, `optional`, `cached`, and `unknown` as separate concepts.

3. Implement reusable helpers.
   - Put reusable JSON and dashboard-data helpers under `tools/lib/`.
   - Reuse existing lesson, menu prerequisite, Git workflow, product-security, resource, CI evidence, and as-built sources instead of copying logic into the UI.

4. Implement the read-only CLI.
   - Add `tools/dashboard-data` to emit JSON only.
   - Keep optional or slow checks as `partial_failures` with required follow-up commands rather than failing the entire snapshot.
   - Do not execute dangerous operations; only preview command intent, target, risk, and approval requirement.

5. Add focused tests.
   - Validate JSON syntax, schema version, source files, concise guidance items, completed-lesson representation, allowed state vocabulary, partial failures, policy/gate separation, command-preview safety, and secret-like data redaction.
   - Use fixtures where possible so tests do not depend on a specific product stack, current wording, network availability, or live GitHub state.

6. Wire the checks after runtime implementation.
   - Added the focused dashboard-data test to aggregate validation, Git hooks, pre-commit, CI, and the as-built sync contract only after the test and runtime files existed.
   - Preserve current full/no-cache, CI, lesson, product-security, resource, Git workflow, docs-tour, and as-built checks.

7. Defer React/Vite.
   - Introduce React/Vite only after the JSON contract and tests are stable.
   - Keep the initial browser dashboard read-only and driven by JSON, not by parsing CLI prose.
   - Present any future React/Vite UI through the dashboard control center; keep Vite startup and build mechanics out of the ordinary learner-facing workflow.
   - Preserve the one-action user path: open the control center, without asking ordinary users to run npm scripts, choose ports, paste URLs, or invoke data/check commands manually.
   - Preserve practical workflow depth: future UI work must not flatten gates, evidence, blockers, approvals, or next operational actions into vague learner-only status labels.
   - Preserve the lesson/workflow split in navigation and status hierarchy so the control panel does not confuse learning progress with operational workflow progress.

### Document Synchronization Policy

- Requirements describe what the data layer must and must not do.
- Specification defines the JSON contract, state vocabulary, source boundaries, and safety rules.
- Implementation plan records phase order, future files, tests, recovery, and approval gates.
- `docs/workflow/TASK_TRACKER.md` records current implemented state and next implementation tasks.
- `docs/workflow/HANDOFF.md` records restart context, approval-sensitive decisions, and recovery rules.
- The five synchronized documents must share the same `SYNC-ID`, `STATUS`, `ARTIFACTS`, and `TESTS` values, while keeping prose role-specific.

### Verification Plan

Current runtime verification:

```bash
git diff --check
./tools/test_dashboard_data.sh
./tools/test_dashboard_schema.sh
./tools/check_as_built_sync_contract.sh
./tools/check_as_built_docs.sh
./tools/check_ci_workflow_structure.sh
./tools/check_workflow_pair_sync.sh
./tools/test_lesson_repository.sh
```

Full completion verification:

```bash
./tools/test_dashboard_data.sh
./tools/test_dashboard_schema.sh
./tools/check_as_built_sync_contract.sh
./tools/check_as_built_docs.sh
./tools/check_ci_workflow_structure.sh
./tools/test_lesson_repository.sh
./tools/git-hooks run --mode full --no-cache
.githooks/pre-commit
```

### Recovery Plan

- If document synchronization fails, fix the five `SYNC-ID` blocks and contract row before changing runtime files.
- If JSON generation fails, keep `tools/dashboard-data` read-only and return valid JSON with `partial_failures` where safe.
- If a source command is slow, flaky, or network-dependent, make it optional or evidence-backed instead of blocking the dashboard snapshot.
- If secret-like data, raw logs, absolute paths, or external payloads leak into JSON, fail the focused test and redact at the owner data layer.
- If the browser UI starts duplicating source-of-truth logic, move the logic back to shared CLI/helper code.
- If any existing-feature tradeoff appears necessary, stop, do not accept the tradeoff, and redesign around alternatives that preserve existing behavior.

### Developer Approval Gates

- Approval is required before choosing `tools/dashboard --format json` instead of a separate `tools/dashboard-data` command.
- Runtime dashboard data-layer implementation was developer-approved for this cycle; further scope expansion still requires approval.
- Approval is required before adding React/Vite dependencies or changing package scripts.
- Approval is required before adding command execution buttons or any operation beyond read-only command previews.
- Approval is required before making live network, CI, or GitHub status authoritative for dashboard rendering.
- Approval is required before changing existing `tools/dashboard` output semantics.
- Approval is required before selecting among redesign alternatives when an apparent existing-feature tradeoff is encountered; accepting the tradeoff is not allowed.

## Implemented Dashboard Control Center React UI Implementation Plan

SYNC-ID: dashboard_control_center_react_ui_plan
STATUS: implemented
ARTIFACTS: docs/workflow/DASHBOARD_DATA_SCHEMA.tsv,docs/workflow/AS_BUILT_SYNC_CONTRACT.tsv,docs/workflow/TEST_PLAN_MANIFEST.tsv,docs/workflow/GIT_HOOK_CHECKS.tsv,docs/workflow/GIT_HOOK_PARALLEL_GROUPS.tsv,docs/workflow/GIT_HOOK_RECOMMENDATION_PATHS.tsv,docs/workflow/FINAL_GATE_COVERAGE.tsv,tools/dashboard-data,package.json,package-lock.json,vite.config.mjs,dashboard-control-center/index.html,dashboard-control-center/src/main.jsx,dashboard-control-center/src/App.jsx,dashboard-control-center/src/dashboardData.js,dashboard-control-center/src/styles.css,tools/dashboard,tools/dashboard-control-center,tools/test_dashboard_control_center.sh,tools/test_dashboard_schema.sh,tools/test_dashboard_data.sh,tools/test_lesson_playwright.sh,tools/test_lesson_repository.sh,tools/check_lesson_structure.sh,tools/check_lesson14_structure.sh,tools/check_ci_workflow_structure.sh,.github/workflows/ci.yml,.github/workflows/lesson14-ci.yml,tests/fixtures/dashboard-control-center.json,tests/playwright/dashboard-control-center.spec.js
TESTS: tools/test_dashboard_schema.sh,tools/test_dashboard_data.sh,tools/test_dashboard_control_center.sh,tools/test_lesson_playwright.sh,tools/check_test_plan_coverage.sh,tools/test_git_hooks.sh,tools/test_git_hooks_parallel.sh,tools/test_ci_final_gate.sh,tools/check_as_built_sync_contract.sh,tools/check_as_built_docs.sh,tools/check_ci_workflow_structure.sh

This implementation turns the implemented read-only dashboard JSON layer into a browser control center after developer approval for React/Vite dependencies, package scripts, runtime files, maintained entry tooling, and browser test wiring.
It remains additive and does not replace `tools/dashboard`, parse `tools/dashboard` prose, run UI actions, make frontend state authoritative, or weaken existing lessons, checks, CI, pre-commit, docs, or sync behavior.

### Implemented Change Targets

- Added a React/Vite browser UI after developer approval for dependency and package-script changes.
- Keep `tools/dashboard-data` as the data contract and keep `tools/dashboard` as the human-readable CLI compatibility surface.
- Added reusable frontend adapters for dashboard JSON so components consume schema fields and state vocabulary rather than current prose wording.
- Added control-center sections for summary, lessons, workflows, maintenance, security, and action previews.
- Kept the initial UI read-only and preview-only for commands.
- Added `tools/dashboard control-center` and `tools/dashboard-control-center` as the maintained dashboard entry tooling.
- Added standalone-callable and aggregate-callable browser/layout checks through `tools/test_dashboard_control_center.sh`.

### Implemented Order

1. Kept the UI sync separate from the implemented data-layer sync.
   - Preserve `dashboard_control_center_data_layer` as implemented.
   - Mark `dashboard_control_center_react_ui_plan` as implemented only after runtime files and tests exist.

2. Confirmed approval gates before runtime work.
   - Added React/Vite dependencies, package scripts, browser runtime files, generated build output rules, and browser test wiring under the developer-approved implementation request.
   - Stopped and corrected review findings where data/schema or sync boundaries were incomplete.

3. Introduced the frontend contract layer.
   - Built adapters around dashboard JSON fields, source attribution, allowed status values, guidance items, blockers, and command previews.
   - Keep adapter logic generic over the schema instead of special-casing the current product stack or current display text.
   - Extended and tested the dashboard data schema/producer for lesson points, warnings, and next learning actions before treating them as UI fields.

4. Implemented read-only UI sections.
   - Summary: mode, concise guidance, blockers, next safe action.
   - Lessons: 7-day, 14-day, applied lesson progress, points, warnings, and next learning action.
   - Workflows: product/workflow state, Git sync, CI, gates, evidence, approvals, blockers, and next operational action.
   - Maintenance and security: as-built sync, workflow pair sync, developer-memory, repo-local skills, policy/gate separation, and preview-only command guidance.

5. Hid Vite mechanics behind maintained tooling.
   - Ordinary users get a single dashboard/control-center entry action.
   - Maintained tooling handles server startup, URL selection, JSON generation, and check orchestration without requiring ordinary users to invoke npm scripts or parse Vite details.

6. Added runtime checks after artifacts exist.
   - Added focused UI rendering/layout checks that run standalone.
   - Wired them into aggregate tests, Git hooks, pre-commit, CI, final-gate coverage, and sync contract after the files exist.

### Document Synchronization Policy

- Requirements describe purpose, problems, scope, non-scope, existing-feature impact, document updates, tests, and risks.
- Specification describes the UI sections, data handling, UX constraints, and implemented verification boundaries.
- Implementation plan describes change targets, order, verification, recovery, and approval gates.
- `docs/workflow/TASK_TRACKER.md` records implemented state and remaining approval-only boundaries.
- `docs/workflow/HANDOFF.md` records restart context and safety-sensitive decisions.

### Verification Method For This Sync

```bash
git diff --check
./tools/test_dashboard_schema.sh
./tools/test_dashboard_data.sh
./tools/test_dashboard_control_center.sh
./tools/test_lesson_playwright.sh
./tools/check_as_built_sync_contract.sh
./tools/check_as_built_docs.sh
./tools/check_ci_workflow_structure.sh
./tools/test_lesson_repository.sh
./tools/git-hooks run --mode full --no-cache --jobs 4
.githooks/pre-commit
```

After commit and push, required remote `CI` and `Lesson14 CI` must pass, and local/remote sync must match.

### Recovery Plan

- If sync checks fail, correct the five document blocks and contract row before changing runtime scope.
- If dashboard schema/data/UI tests fail, fix the data-layer contract, UI adapter, or this plan so the UI remains contract-driven.
- If future frontend work duplicates owner-layer checks, move the logic back to shared CLI/helper code.
- If future UI hides workflow gates, evidence, blockers, approvals, or next actions, redesign the component model before implementation.
- If Vite mechanics leak into ordinary user workflow, keep the UI behind maintained tooling and update the entry plan.
- If any existing-feature tradeoff appears necessary, stop and redesign; accepting the tradeoff is not allowed.

### Developer Approval Gates

- Approval has been used for the initial React/Vite dependencies, package scripts, maintained entry tooling, browser runtime files, and browser test wiring.
- Approval is required before adding action execution from the UI.
- Approval is required before making live network, CI, or GitHub status authoritative for rendering.
- Approval is required before changing existing `tools/dashboard` semantics or replacing `tools/dashboard-data`.
- Approval is required before accepting any design alternative that would weaken existing lessons, workflows, checks, CI, pre-commit, docs, or sync behavior.

## Implemented Dashboard Control Center Information Architecture Implementation Plan

SYNC-ID: dashboard_control_center_information_architecture
STATUS: implemented
ARTIFACTS: docs/workflow/AS_BUILT_SYNC_CONTRACT.tsv,docs/workflow/TEST_PLAN_MANIFEST.tsv,vite.config.mjs,dashboard-control-center/mocks/archive/mock-categorized-dashboard.png,dashboard-control-center/src/App.jsx,dashboard-control-center/src/dashboardData.js,dashboard-control-center/src/i18n.js,dashboard-control-center/src/styles.css,tests/fixtures/dashboard-control-center.json,tests/playwright/dashboard-control-center.spec.js,tools/test_dashboard_control_center.sh,tools/test_lesson_repository.sh
TESTS: tools/test_dashboard_control_center.sh,tools/test_dashboard_schema.sh,tools/test_dashboard_data.sh,tools/check_as_built_sync_contract.sh,tools/check_as_built_docs.sh,tools/check_test_plan_coverage.sh,tools/check_ci_workflow_structure.sh

This implemented follow-up organizes the dashboard wall-bouncing conclusions into a scoped UI improvement.
It preserves the implemented dashboard JSON data layer, the initial read-only React/Vite UI, existing lessons, CI, checks, document routes, Git hooks, pre-commit, and owner-layer safety logic.

### Implemented Change Targets

- `dashboard-control-center/mocks/archive/mock-categorized-dashboard.png`
  - Keep the generated mock as a visual design reference for category navigation, Overview-first information hierarchy, and Safety Actions isolation.
- `dashboard-control-center/src/App.jsx`
  - Replace the one-page vertical section stack with category navigation and Overview-first rendering.
  - Keep lessons, development workflow, maintenance sync, security, and command previews as separate render surfaces.
  - Keep command previews visible only in Safety Actions and only as preview-only/non-executable data.
- `dashboard-control-center/src/i18n.js`
  - Add reusable fixed-label localization for `en` and `ja` with English fallback.
  - Keep data-derived text out of browser translation.
  - Add locale-aware generated-time and relative-age formatting.
- `dashboard-control-center/src/styles.css`
  - Rework layout to match the mock direction with a sidebar, status strip, overview grid, category health cards, compact cards, and responsive constraints.
- `tests/playwright/dashboard-control-center.spec.js`
  - Update browser tests to verify categorized navigation, Overview-first behavior, Safety Actions command isolation, fixed-label localization, no command-execution buttons, redaction, and mobile layout.
- `tools/test_dashboard_control_center.sh`
  - Keep the check as the standalone and aggregate entry point for the React/Vite control-center regression.

### Implemented Order

1. Organize the proposal.
   - Purpose: make the dashboard understandable and scannable without weakening read-only safety.
   - Problems: one-page overload, command previews too visible on first screen, English-only fixed labels, and weak snapshot freshness cues.
   - Scope: categories, `en`/`ja` fixed UI labels, snapshot generated time and age, and Safety Actions isolation.
   - Non-scope: automatic updates, command execution, live authoritative CI/Git, and broad localization.

2. Preserve owner-layer and data boundaries.
   - Leave `tools/dashboard-data` and the dashboard JSON schema as the data boundary.
   - Do not parse `tools/dashboard` prose.
   - Do not move Git, CI, Security guard, approval, or gate truth into React.

3. Implement category UI.
   - Add Overview, Lessons, Development Workflow, Maintenance Sync, and Safety Actions navigation.
   - Render Overview by default.
   - Move command previews out of Overview and into Safety Actions.

4. Implement fixed-label localization.
   - Detect the browser language through `navigator.languages`.
   - Use `ja` labels for Japanese device language and English otherwise.
   - Preserve technical/data text as source data.

5. Implement snapshot freshness display.
   - Show `generated_at` formatted with browser locale APIs.
   - Show relative snapshot age as display context, not as an authoritative stale gate.

6. Update tests and synchronization.
   - Update Playwright tests to assert behavior and boundaries rather than a single wording stack.
   - Sync the new implementation through the as-built contract, requirements, specification, implementation plan, task tracker, and handoff.

### Document Synchronization Policy

- Requirements record the implementation proposal: purpose, problems, target scope, non-scope, existing-feature impact, required document updates, tests, and risks.
- Specification records the implemented category, localization, safety, data-boundary, visual, and verification behavior.
- Implementation plan records changed files, order, document sync, verification, recovery, and approval-gate boundaries.
- `docs/workflow/TASK_TRACKER.md` records completed work and intentionally deferred future phases.
- `docs/workflow/HANDOFF.md` records restart context and safety-sensitive constraints for the next agent.

### Verification Method

The `TESTS` field for this sync ID lists directly wired standalone checks required by the as-built sync contract.
`tools/test_lesson_repository.sh`, full/no-cache Git hooks, `.githooks/pre-commit`, and `tools/ci-final-gate` remain final verification and runtime evidence, not `required_tests` entries, because the sync-contract checker requires each `required_tests` command to be directly wired in the repository test surfaces.

```bash
git diff --check
./tools/test_dashboard_schema.sh
./tools/test_dashboard_data.sh
./tools/test_dashboard_control_center.sh
./tools/test_lesson_playwright.sh
./tools/check_as_built_sync_contract.sh
./tools/check_as_built_docs.sh
./tools/check_test_plan_coverage.sh
./tools/check_ci_workflow_structure.sh
./tools/test_lesson_repository.sh
./tools/git-hooks run --mode full --no-cache --jobs 4
.githooks/pre-commit
./tools/ci-final-gate
```

### Failure Recovery

- If UI tests fail, inspect whether the failure is layout/navigation behavior, localization behavior, data-boundary behavior, or Playwright selector ambiguity; fix the implementation or test intent without weakening safety assertions.
- If as-built sync fails, update the contract and all five synchronized documents to the same sync ID, status, artifacts, and tests.
- If existing dashboard, lesson, CI, Git hooks, pre-commit, schema, or data tests fail, treat it as a regression and restore existing behavior before proceeding.
- If a fix appears to require browser command execution, live authoritative CI/Git status, broad localization, or existing-feature tradeoff, stop and request developer approval.

### Developer Approval Boundaries

- Automatic updates, polling, WebSocket/live updates, browser-triggered checks, command execution, live authoritative CI/Git status, broader multi-language coverage, data-schema localization fields, and any change to existing `tools/dashboard` semantics remain separate future phases.
- Existing-feature tradeoffs are not allowed and cannot be approved as a normal implementation choice.

## Implemented Dashboard Control Center Visual Polish Implementation Plan

SYNC-ID: dashboard_control_center_visual_polish
STATUS: implemented
ARTIFACTS: docs/workflow/AS_BUILT_SYNC_CONTRACT.tsv,dashboard-control-center/mocks/archive/mock-categorized-dashboard.png,dashboard-control-center/src/App.jsx,dashboard-control-center/src/i18n.js,dashboard-control-center/src/styles.css,tests/playwright/dashboard-control-center.spec.js,tools/test_dashboard_control_center.sh,tools/test_lesson_repository.sh
TESTS: tools/test_dashboard_control_center.sh,tools/check_as_built_sync_contract.sh,tools/check_as_built_docs.sh,tools/check_test_plan_coverage.sh,tools/check_ci_workflow_structure.sh

This implementation refines the categorized dashboard to look closer to the generated mock while preserving the existing information architecture, read-only safety, data contract, tests, CI, pre-commit, and document routes.

### Implemented Change Targets

- `dashboard-control-center/src/App.jsx`
  - Add display structure needed for mock-like health cards, category shortcut cards, and sidebar metadata.
  - Keep navigation, Safety Actions, and command-preview behavior unchanged.
- `dashboard-control-center/src/i18n.js`
  - Add fixed UI labels for visual-polish elements such as Explore Pages and last-updated context.
- `dashboard-control-center/src/styles.css`
  - Tune the sidebar, status strip, overview grid, health cards, Explore Pages cards, spacing, borders, subtle depth, and responsive layout.
- `tests/playwright/dashboard-control-center.spec.js`
  - Add structure-oriented visual assertions for segmented status, desktop 2x2 health cards, Explore Pages cards, mobile stability, and safety isolation.
- Synchronized documents
  - Add a separate sync ID so visual polish remains distinct from data, React UI, and information architecture layers.

### Implementation Order

1. Preserve current safety boundaries.
   - Do not add command execution, polling, live CI/Git authority, schema changes, or new dependencies.
   - Keep command previews only under Safety Actions.

2. Adjust markup for reusable visual components.
   - Add sidebar generated-time context.
   - Add compact health-card body and status-ring structure.
   - Add Explore Pages shortcut cards using the existing category model.

3. Apply CSS polish.
   - Convert the top status area into a segmented strip.
   - Use a 2x2 health-card grid on desktop.
   - Tune card density, borders, shadows, typography scale, and responsive breakpoints.
   - Preserve 8px card radii and stable dimensions.

4. Update tests.
   - Keep existing read-only and localization tests.
   - Add layout structure assertions without pixel-perfect image matching.
   - Keep `tools/test_dashboard_control_center.sh` as the standalone and aggregate entry point.

5. Verify and review.
   - Run targeted UI tests first, then sync checks and aggregate checks.
   - Use sub-agent review for requirements/spec/plan alignment, UI/visual fit, safety boundaries, and test sufficiency.

### Document Synchronization Policy

- Requirements capture purpose, problems, target scope, non-scope, existing impact, tests, and risks.
- Specification captures visual behavior, layout constraints, safety constraints, and verification behavior.
- Implementation plan captures file targets, order, verification, recovery, and approval gates.
- `TASK_TRACKER.md` captures completed work and deferred future phases.
- `HANDOFF.md` captures restart context and the boundary between mock-aligned polish and future live/action work.

### Verification Method

```bash
git diff --check
./tools/test_dashboard_control_center.sh
./tools/check_as_built_sync_contract.sh
./tools/check_as_built_docs.sh
./tools/check_test_plan_coverage.sh
./tools/check_ci_workflow_structure.sh
./tools/test_lesson_repository.sh
./tools/git-hooks run --mode full --no-cache --jobs 4
.githooks/pre-commit
./tools/ci-final-gate
```

### Failure Recovery

- If visual tests fail, distinguish layout regression from brittle selectors; fix structure or tests without weakening safety checks.
- If mobile overflow appears, reduce fixed widths and preserve responsive constraints.
- If Japanese labels overflow, adjust layout or wrapping rather than hard-coding language-specific branches.
- If visual polish hides safety details or creates command-like affordances, restore the previous read-only category behavior and redesign.
- If sync checks fail, fix the contract and all five synchronized documents before further runtime changes.

### Developer Approval Boundaries

- Automatic refresh, broad localization, live CI/Git authority, UI-triggered checks, command execution, new dependencies, and any existing-feature tradeoff remain outside this phase.

## Implemented Dashboard Control Center Mock Parity Implementation Plan

SYNC-ID: dashboard_control_center_mock_parity
STATUS: implemented
ARTIFACTS: docs/workflow/DASHBOARD_DATA_SCHEMA.tsv,docs/workflow/AS_BUILT_SYNC_CONTRACT.tsv,tools/lib/dashboard_data.sh,tools/dashboard-data,dashboard-control-center/mocks/archive/mock-categorized-dashboard.png,dashboard-control-center/src/App.jsx,dashboard-control-center/src/dashboardData.js,dashboard-control-center/src/i18n.js,dashboard-control-center/src/styles.css,tests/fixtures/dashboard-control-center.json,tests/fixtures/dashboard-control-center-live-update.json,tests/fixtures/dashboard-control-center-invalid.json,tests/playwright/dashboard-control-center.spec.js,tools/test_dashboard_schema.sh,tools/test_dashboard_data.sh,tools/test_dashboard_control_center.sh,tools/test_lesson_repository.sh
TESTS: tools/test_dashboard_schema.sh,tools/test_dashboard_data.sh,tools/test_dashboard_control_center.sh,tools/check_as_built_sync_contract.sh,tools/check_as_built_docs.sh,tools/check_test_plan_coverage.sh,tools/check_ci_workflow_structure.sh

This plan is synchronized as an implemented follow-up to the implemented visual-polish layer.
It implements mock parity through structured dashboard data and reusable UI components, not through fixed mock values.

### Implemented Change Targets

- `docs/workflow/DASHBOARD_DATA_SCHEMA.tsv` for category metrics, structured primary action, and failure/follow-up separation.
- `tools/lib/dashboard_data.sh` and `tools/dashboard-data` for producer-owned metric calculation and safe JSON output.
- `dashboard-control-center/src/dashboardData.js` for validation of the new fields.
- `dashboard-control-center/src/App.jsx`, `dashboard-control-center/src/i18n.js`, and `dashboard-control-center/src/styles.css` for mock-aligned compact cards, progress rings, issue summaries with detail-page navigation, and Explore Pages metrics.
- `tests/fixtures/dashboard-control-center.json`, `tests/fixtures/dashboard-control-center-live-update.json`, `tests/fixtures/dashboard-control-center-invalid.json`, and Playwright tests for data-driven visual structure, alternate metrics, and invalid refresh behavior.
- `tools/test_dashboard_schema.sh`, `tools/test_dashboard_data.sh`, `tools/test_dashboard_control_center.sh`, and aggregate wiring for standalone and full validation.

### Implemented Order

1. Extend the schema and producer with metric and primary-action fields.
2. Update frontend validation so unsupported or malformed data fails closed.
3. Refactor the Overview UI into compact primary-action, issue-preview, metric-ring, and Explore Pages components.
4. Update localization labels only for fixed UI chrome.
5. Add tests proving that percentages and counts come from fixture or producer data rather than fixed mock values.
6. Replace any global no-buttons assertion with no command-execution controls, because read-only navigation and summaries are permitted controls.
7. Run sync, structure, targeted UI, data, and aggregate checks.

### Document Synchronization Policy

- Requirements describe why mock parity is needed and what is out of scope.
- Specification describes the schema-owned data and UI behavior.
- Implementation plan describes files, order, validation, recovery, and approval gates.
- Task tracker records planned, in-progress, and implemented status.
- Handoff records restart context and known boundaries.

### Verification Method

The `TESTS` field for this sync ID lists directly wired standalone checks required by the as-built sync contract.
`tools/test_lesson_repository.sh`, full/no-cache Git hooks, `.githooks/pre-commit`, and `tools/ci-final-gate` remain final verification and runtime evidence, not `required_tests` entries, because the sync-contract checker requires each `required_tests` command to be directly wired in the repository test surfaces.

```bash
git diff --check
./tools/test_dashboard_schema.sh
./tools/test_dashboard_data.sh
./tools/test_dashboard_control_center.sh
./tools/check_as_built_sync_contract.sh
./tools/check_as_built_docs.sh
./tools/check_test_plan_coverage.sh
./tools/check_ci_workflow_structure.sh
./tools/test_lesson_repository.sh
```

### Failure Recovery

- If schema validation fails, correct the producer/schema boundary before changing UI.
- If visual tests become pixel-brittle, replace them with structure and data-flow assertions without weakening safety checks.
- If percentages appear fixed, move calculation into the producer or fixture and assert alternate fixture values.
- If optional checks are misrepresented as partial failures, separate them into manual follow-ups before rerunning.
- If Overview detail navigation conflicts with safety tests, keep read-only detail access and tighten tests around executable actions instead.
- If existing 7-day, 14-day, CI, hook, or document checks regress, stop and restore compatibility before continuing.

### Developer Approval Boundaries

- Approval is required before accepting any existing-feature tradeoff.
- Approval is required before broadening localization beyond the current `en`/`ja` fixed-label boundary.
- Approval is required before adding new dependencies.
- Approval is required before making the mock image a pixel-perfect correctness gate.
- Approval is required before changing command-preview safety or browser execution boundaries.

## Implemented Dashboard Control Center Live Snapshot Sync Implementation Plan

SYNC-ID: dashboard_control_center_live_snapshot_sync
STATUS: implemented
ARTIFACTS: docs/workflow/DASHBOARD_DATA_SCHEMA.tsv,docs/workflow/AS_BUILT_SYNC_CONTRACT.tsv,tools/lib/dashboard_data.sh,tools/dashboard-data,tools/dashboard-control-center,vite.config.mjs,dashboard-control-center/src/App.jsx,dashboard-control-center/src/dashboardData.js,dashboard-control-center/src/i18n.js,dashboard-control-center/src/styles.css,tests/fixtures/dashboard-control-center.json,tests/fixtures/dashboard-control-center-live-update.json,tests/fixtures/dashboard-control-center-invalid.json,tests/playwright/dashboard-control-center.spec.js,tools/test_dashboard_control_center.sh,tools/test_lesson_repository.sh
TESTS: tools/test_dashboard_schema.sh,tools/test_dashboard_data.sh,tools/test_dashboard_control_center.sh,tools/check_as_built_sync_contract.sh,tools/check_as_built_docs.sh,tools/check_test_plan_coverage.sh,tools/check_ci_workflow_structure.sh

This plan is synchronized as an implemented separate read-only refresh layer.
It follows mock parity because live refresh should move validated schema-owned data, not UI-invented values.

### Implemented Change Targets

- `tools/dashboard-control-center` for atomic snapshot writing and refresh while the Vite server is open.
- `tools/dashboard-data` and `tools/lib/dashboard_data.sh` for mandatory producer-owned `snapshot_id` and `content_hash`.
- `dashboard-control-center/src/dashboardData.js` for validated snapshot fetches and signature handling.
- `dashboard-control-center/src/App.jsx` and `dashboard-control-center/src/styles.css` for in-place refresh, stale status, and last-known-good UI.
- Playwright fixtures and tests for live update, failed refresh, no reload, and no browser command execution.
- Existing standalone and aggregate test entry points for reusable verification.

### Implemented Order

1. Add mandatory producer-owned `snapshot_id` and `content_hash` to the dashboard JSON contract.
2. Implement atomic snapshot writing in the control-center shell entry point.
3. Add a configurable refresh loop to `tools/dashboard-control-center open`.
4. Update the React app to poll the dashboard JSON endpoint with GET and keep last-known-good data on refresh failure.
5. Add deterministic Playwright tests for changed data and failed refresh.
6. Add static safety checks for browser execution boundaries.
7. Run targeted, sync, structure, aggregate, hook, pre-commit, and CI/final-gate checks as needed.

### Document Synchronization Policy

- Keep live refresh separate from command execution and real CI/Git authority.
- Keep the schema and producer as the data owner.
- Record any future UI-triggered command work as a separate sync ID and approval-gated phase.

### Verification Method

```bash
git diff --check
./tools/test_dashboard_schema.sh
./tools/test_dashboard_data.sh
./tools/test_dashboard_control_center.sh
./tools/check_as_built_sync_contract.sh
./tools/check_as_built_docs.sh
./tools/check_test_plan_coverage.sh
./tools/check_ci_workflow_structure.sh
./tools/test_lesson_repository.sh
./tools/git-hooks run --mode full --no-cache
.githooks/pre-commit
./tools/ci-final-gate
```

### Failure Recovery

- If atomic writing fails, keep the previous snapshot writer and stop before enabling live refresh.
- If polling produces flaky tests, move the test to deterministic fixture sequencing rather than increasing sleeps.
- If invalid JSON blanks the UI, restore last-known-good behavior before continuing.
- If the browser gains any command execution, non-GET dashboard-data fetch, or `tools/*` fetch path, remove it and rerun safety checks.
- If existing checks regress, restore the previous read-only snapshot behavior and request approval if a tradeoff appears unavoidable.

### Developer Approval Boundaries

- Approval is required before browser-triggered checks, POST/PUT/PATCH/DELETE requests, WebSocket/server push, GitHub API calls, Git/CI authority, or command execution.
- Approval is required before new dependencies.
- Approval is required before changing existing CI, pre-commit, Git hooks, 7-day, or 14-day behavior.
- Approval is required before accepting any stale-data behavior that hides validation failure.

## Implemented Dashboard Control Center Mock-Aligned Overview Implementation Plan

SYNC-ID: dashboard_control_center_mock_aligned_overview
STATUS: implemented
ARTIFACTS: docs/workflow/AS_BUILT_SYNC_CONTRACT.tsv,dashboard-control-center/mocks/archive/mock-categorized-dashboard.png,dashboard-control-center/src/App.jsx,dashboard-control-center/src/i18n.js,dashboard-control-center/src/styles.css,tests/fixtures/dashboard-control-center.json,tests/fixtures/dashboard-control-center-live-update.json,tests/playwright/dashboard-control-center.spec.js,tools/test_dashboard_control_center.sh,tools/test_lesson_repository.sh
TESTS: tools/test_dashboard_control_center.sh,tools/check_as_built_sync_contract.sh,tools/check_as_built_docs.sh,tools/check_test_plan_coverage.sh,tools/check_ci_workflow_structure.sh

This plan is synchronized as a visual and interaction follow-up to mock parity and live snapshot sync.
It preserves the existing data producer, schema validation, read-only browser boundary, and live refresh behavior.

### Implemented Change Targets

- `dashboard-control-center/src/App.jsx` for Overview hierarchy, accessible title handling, mock-aligned Next Safe Action structure, global mock-aligned icon placement, stable Partial Failures none state, manual follow-up summary placement, bottom notice, and non-expanding summary navigation.
- `dashboard-control-center/src/i18n.js` for fixed UI labels, none-state text, manual follow-up summary text, and repository-control-panel notice text.
- `dashboard-control-center/src/styles.css` for mock-aligned spacing, four health-ring category colors, left icons, health-card height alignment, stable summary cards, responsive layout, and accessible visually hidden title support.
- `tests/fixtures/dashboard-control-center.json` and `tests/fixtures/dashboard-control-center-live-update.json` for non-empty and empty Partial Failures coverage without fixed mock values.
- `tests/playwright/dashboard-control-center.spec.js` and `tools/test_dashboard_control_center.sh` for standalone browser verification.

### Implemented Order

1. Synchronized this sync ID into the sync contract and five synchronized documents.
2. Ran sync and structure checks before runtime changes.
3. Removed the visible main header and snapshot explanation while preserving an accessible page title.
4. Refactored `PrimaryActionCard` into the mock-aligned safe-action structure with the heading/helper outside the green primary action row and white metadata rows below it.
5. Replaced Overview issue-preview expansion with stable summary cards.
6. Rendered Partial Failures as an always-present summary with a none state when empty.
7. Moved manual follow-ups into a third-row summary card with concise count, representative context, and detail navigation.
8. Removed the visible Category Health heading and preserved the accessible category-health region.
9. Aligned the four health-card heights inside the grid.
10. Added decorative left icons to navigation, status, repeated cards, summaries, detail rows, and command previews without adding command affordances.
11. Applied distinct category colors to the four health rings.
12. Added the repository-control-panel read-only notice at the Overview bottom.
13. Updated Playwright assertions for structure, global icons, four health-ring colors, no-overflow, localization, live refresh, and safety boundaries.
14. Ran targeted checks, sync checks, aggregate checks, full hooks, pre-commit, final gate, and sub-agent review as final verification.

### Document Synchronization Policy

- Requirements describe why the mock-aligned Overview is needed and what remains out of scope.
- Specification describes the Overview structure, stable summaries, icon behavior, and safety model.
- Implementation plan describes files, order, validation, recovery, and approval boundaries.
- Task tracker records planned, in-progress, and implemented status.
- Handoff records restart context, detail-link expectations, safety boundaries, and verification commands.

### Verification Method

```bash
git diff --check
npm run dashboard:build
./tools/test_dashboard_schema.sh
./tools/test_dashboard_data.sh
./tools/test_dashboard_control_center.sh
./tools/check_as_built_sync_contract.sh
./tools/check_as_built_docs.sh
./tools/check_test_plan_coverage.sh
./tools/check_ci_workflow_structure.sh
./tools/test_lesson_repository.sh
./tools/git-hooks run --mode full --no-cache --jobs 4
.githooks/pre-commit
./tools/ci-final-gate
```

### Failure Recovery

- If accessible heading coverage fails, restore a screen-reader-only `h1` rather than restoring visible header chrome.
- If mobile overflow appears, reduce fixed widths and preserve responsive constraints.
- If Partial Failures or manual follow-ups are confused, restore the data distinction before styling changes.
- If the Overview appears to execute commands or expose command previews outside Safety Actions, remove that affordance and rerun safety checks.
- If sync checks fail, fix the contract and all five synchronized documents before further runtime work.

### Developer Approval Boundaries

- Approval is required before any existing-feature tradeoff.
- Approval is required before changing command-preview isolation, browser command execution boundaries, live CI/Git authority, dependencies, CI/pre-commit semantics, or 7-day/14-day lesson behavior.

## Implemented Dashboard Control Center Detail-Page Mock Parity Implementation Plan

SYNC-ID: dashboard_control_center_detail_mock_parity
STATUS: implemented
ARTIFACTS: docs/workflow/AS_BUILT_SYNC_CONTRACT.tsv,dashboard-control-center/mocks/archive/mock-detail-lessons.png,dashboard-control-center/mocks/archive/mock-detail-workflow.png,dashboard-control-center/mocks/archive/mock-detail-maintenance.png,dashboard-control-center/mocks/archive/mock-detail-safety.png,dashboard-control-center/src/App.jsx,dashboard-control-center/src/i18n.js,dashboard-control-center/src/styles.css,tests/fixtures/dashboard-control-center.json,tests/playwright/dashboard-control-center.spec.js,tools/test_dashboard_control_center.sh,tools/test_lesson_repository.sh
TESTS: tools/test_dashboard_control_center.sh,tools/check_as_built_sync_contract.sh,tools/check_as_built_docs.sh,tools/check_test_plan_coverage.sh,tools/check_ci_workflow_structure.sh

This implementation is synchronized as a visual and information-architecture follow-up to the approved Overview mock alignment.
It preserves the existing data producer, schema validation, read-only browser boundary, live refresh behavior, and category routes.
The approved detail mock images are treated as the UI/UX source of truth for hierarchy, density, color direction, and icon direction; automated tests validate structural parity and safety boundaries rather than pixel-perfect screenshots.

### Implemented Change Targets

- `dashboard-control-center/mocks/archive/mock-detail-lessons.png`, `mock-detail-workflow.png`, `mock-detail-maintenance.png`, and `mock-detail-safety.png` remain checked-in visual source references.
- `dashboard-control-center/src/App.jsx` adds shared detail page headers, decision summaries, workflow icon centralization, lesson inspection panels, workflow checklist rows, maintenance confirmation tables, safety failure tables, display-only command preview cards, and source-boundary panels.
- `dashboard-control-center/src/i18n.js` adds fixed decision-summary labels, page judgments, must-review labels, display-only labels, known source/intent display labels, and locale-resolution support that does not mix UI locale with lesson/workflow language settings.
- `dashboard-control-center/src/styles.css` adds category-colored detail summaries, mock-aligned panels/rows/tables, centered risk/status pills, responsive constraints, severity rails, command/reference chips, and read-only banners.
- `tests/playwright/dashboard-control-center.spec.js` verifies the implemented detail structure and safety boundaries through `tools/test_dashboard_control_center.sh`.
- The follow-up tightening keeps the same sync ID and artifacts while refining the category header icon presentation, first-row decision-summary content model, active sidebar category icon, workflow category icon glyph, maintenance/safety card icon containers, failure severity icons, and command-preview section grouping.
- Additional translated UI strings are added only through `dashboard-control-center/src/i18n.js`; React runtime code does not add Japanese-only literals and does not use lesson/workflow language settings as the dashboard UI locale.

### Implementation Order Completed

1. Synchronize this sync ID into the sync contract and five synchronized documents.
2. Run sync, test-plan, and CI-structure checks before runtime changes.
3. Added reusable helpers for detail page headers, decision summaries, item display metadata, source labels, command labels, and structured lesson attention labels without changing the dashboard data schema.
4. Added one centralized workflow category icon component using a branching `Network` icon and reused it across Overview, navigation, Explore Pages, and detail pages.
5. Tuned shared pill CSS so short localized labels are visually centered.
6. Refactored Lessons detail into the approved decision-summary and inspection-panel layout.
7. Refactored Development Workflow detail into must-review and ready checklist rows with human-readable titles and secondary technical keys.
8. Refactored Maintenance Sync detail into status cards, manual confirmation table, and source-boundary panel.
9. Refactored Safety Actions detail into safety status cards, Partial Failures table, and display-only Command Preview cards.
10. Updated Playwright assertions for detail summaries, icon consistency, readable labels, safety boundaries, centered short pills, and desktop/mobile no-overflow.
11. Targeted checks and final verification are run after synchronization before completion reporting.
12. Tighten mock parity for the approved detail-page references by adding decision-summary bullets, count badges, safe links, page-specific icon chrome, distinct safety severity glyphs, and compact read-only command preview grouping without changing the data schema or browser read-only boundary.

### Document Synchronization Policy

- Requirements describe the user-facing decision problems and out-of-scope boundaries.
- Specification describes shared detail-page structure, page-specific behavior, icon/color rules, and safety model.
- Implementation plan describes files, order, validation, recovery, and approval boundaries.
- Task tracker records planned, in-progress, and implemented status.
- Handoff records restart context, mock-image references, read-only boundaries, and verification commands.

### Verification Method

```bash
git diff --check
npm run dashboard:build
./tools/test_dashboard_control_center.sh
./tools/check_as_built_sync_contract.sh
./tools/check_as_built_docs.sh
./tools/check_test_plan_coverage.sh
./tools/check_ci_workflow_structure.sh
./tools/test_dashboard_schema.sh
./tools/test_dashboard_data.sh
./tools/test_lesson_repository.sh
./tools/git-hooks run --mode full --no-cache --jobs 4
.githooks/pre-commit
./tools/ci-final-gate
```

### Failure Recovery

- If sync checks fail, fix the contract and all five synchronized documents before further runtime work.
- If decision summaries duplicate or contradict data, derive them from shared helpers and existing snapshot fields before styling changes.
- If workflow icon replacement creates ambiguity or import issues, keep one centralized workflow category icon component and use the closest lucide branching workflow icon to the approved mock rather than mixing multiple workflow icons.
- If mobile overflow appears, reduce fixed widths and preserve responsive constraints rather than adding language-specific branches.
- If technical traceability is lost, restore technical keys as secondary metadata, not primary headings.
- If command previews look executable or expose controls outside Safety Actions, remove the affordance and rerun safety checks.

### Developer Approval Boundaries

- Approval is required before any existing-feature tradeoff.
- Approval is required before changing dashboard data schema ownership, command-preview isolation, browser command execution boundaries, live CI/Git authority, dependencies, CI/pre-commit semantics, or 7-day/14-day lesson behavior.
- Approval is required before replacing the copied detail mock images or treating them as pixel-perfect test oracles.

## Acceptance Criteria

- Existing 7-day and 14-day flows still pass structure checks.
- Free Development Mode and Team Development/Docker are additive.
- Implementation preserves refactorability, ecosystem fit, reusability, and generality.
- No existing feature is traded away.
- Lesson-side tests pass without recreating `task-tracker-repository`.
- Product repository boundary, Git sync, and CI checks remain available for explicit real product operations testing.
- All as-built documents describe the same implemented state.
- Lesson repository test prints `Lesson repository test passed.`
- Every implemented developer-memory audit item is synchronized into the five planning/workflow documents and backed by a mechanical check.
- Planned developer-memory audit items are synchronized into the five planning/workflow documents without being described as runtime-implemented work.

## Planned Lesson Display Label Policy Implementation Plan

SYNC-ID: lesson_display_label_policy
STATUS: implemented
ARTIFACTS: docs/workflow/LESSON_DISPLAY_LABELS.tsv,tools/lib/lesson_display_labels.sh,tools/lib/lesson_common.sh,tools/lib/lesson_runtime.sh,tools/menu,tools/dashboard,tools/learn,tools/helpdesk,tools/lesson14,tools/roadmap,tools/docs-tour,README.md,AGENTS.MD,index.md,index-14-days.md,ai-driven-task-tracker-scenario.md,guides/LESSON_14_DAYS.md,learning/ROADMAP.md,lesson/LESSON_FLOW_14_DAYS.tsv,prompts/PROMPTS.md,prompts/PROMPTS_14_DAYS.md,playbooks/AGENT_PLAYBOOK.md,playbooks/AGENT_PLAYBOOK_14_DAYS.md,tools/check_learner_display.sh,tools/test_menu_prerequisites.sh,tools/check_lesson14_sync.sh,tools/check_agents_skills.sh
TESTS: tools/check_learner_display.sh,tools/test_menu_prerequisites.sh,tools/check_lesson14_sync.sh,tools/check_agents_skills.sh,tools/test_lesson14.sh

This plan is synchronized as `lesson_display_label_policy`.
It is runtime-implemented.
The implementation begins with display-policy separation rather than broad text replacement.

### Implemented Change Targets

- Added `docs/workflow/LESSON_DISPLAY_LABELS.tsv` as the reusable lesson display-label policy source.
- Added `tools/lib/lesson_display_labels.sh` so menu, dashboard, roadmap, lesson14 reset/runtime, learning-record, and helpdesk output resolve labels consistently.
- Updated `tools/menu` and `tools/dashboard` because they are the most visible learner entry points.
- Updated `tools/roadmap`, `tools/lesson14`, `tools/learn`, and `tools/helpdesk` normal output so internal aliases remain command compatibility, not learner-facing labels.
- Updated learner-facing README, AGENTS routing text, index files, guides, prompts, playbooks, roadmap text, and task-tracker scenario text so they no longer reproduce old duration labels.
- Extended `tools/check_learner_display.sh` to detect learner-facing old labels and broader Day variants while allowing approved internal and historical contexts.
- Updated `tools/test_menu_prerequisites.sh` so learner-facing label checks and internal compatibility checks are separate.

### Implemented Order

1. Defined the display-label policy and allowlist boundary.
   - Added final course labels to `docs/workflow/LESSON_DISPLAY_LABELS.tsv`.
   - Kept `Step N/14` as the current sync-gate key.

2. Introduced shared label resolution.
   - Avoided duplicating labels directly in menu, dashboard, roadmap, lesson14 reset/runtime, learn, and helpdesk commands.
   - Kept the helper reusable for future browser dashboard work.

3. Updated entry-point output.
   - Changed menu and dashboard learner-facing course names.
   - Preserved existing commands and compatibility paths.

4. Updated learner-facing docs and prompt surfaces.
   - Updated README, AGENTS.MD, index files, guides, prompts, playbooks, roadmap text, and scenario text only where they are active learner-facing guidance.
   - Kept filenames and command names unchanged.

5. Strengthened checks and tests.
   - Added active-surface checks for old learner-facing labels.
   - Covered the known gap where `tools/check_learner_display.sh` only detected narrower `Day N` style regressions.
   - Kept internal compatibility checks for `tools/lesson14`, `index-14-days.md`, `Step N/14`, and `dayN.*`.

6. Verified and iterated.
   - Run the targeted checks first, then aggregate lesson validation.
   - If a future check fails because it treats internal aliases as learner-facing labels, fix the policy boundary instead of weakening the check.

### Verification Plan

```bash
git diff --check
./tools/check_learner_display.sh
./tools/test_menu_prerequisites.sh
./tools/check_lesson14_sync.sh
./tools/test_lesson14.sh
./tools/check_agents_skills.sh
./tools/check_developer_memory_requirements.sh
./tools/as-built-sync status
./tools/check_as_built_sync_contract.sh
./tools/check_as_built_docs.sh
./tools/test_lesson_repository.sh
```

### Recovery Plan

- If Lesson14 sync gates fail, restore `Step N/14` as the machine key and move learner-facing changes behind display-label resolution.
- If learner-display checks over-match historical records, add a policy-governed historical allowlist instead of editing past logs.
- If internal compatibility checks fail, restore command names, filenames, TSV keys, and test expectations before retrying learner-facing display changes.
- If AGENTS, skills, or developer-memory checks still require old course labels, split those checks into learner-facing label assertions and internal compatibility assertions.
- If any existing-feature tradeoff appears necessary, stop and request developer approval with reason, impact, alternatives, and rollback path.

### Developer Approval Gates

- Approval is required before changing the final course display labels recorded in `docs/workflow/LESSON_DISPLAY_LABELS.tsv`.
- Approval is required before changing the `Step N/14` sync-gate key contract.
- Approval is required before bulk-editing historical learning logs.
- Approval is required before changing `tools/lesson14`, `index-14-days.md`, `_14_DAYS` filenames, or `dayN.*` step IDs.
- Approval is required before weakening learner-display checks or existing sync-gate checks.
- Approval is required before accepting any existing-feature tradeoff.

## Implemented External Product Repository Authority Implementation Plan

SYNC-ID: external_product_repository_authority
STATUS: implemented
ARTIFACTS: docs/workflow/AS_BUILT_SYNC_CONTRACT.tsv,docs/workflow/PRODUCT_REPOSITORY_STRUCTURE.tsv,docs/workflow/PRODUCT_GATE_EVIDENCE_SCHEMA.tsv,docs/workflow/DASHBOARD_DATA_SCHEMA.tsv,tools/lib/product_repository_authority.sh,tools/product-repository-authority,tools/test_product_repository_authority.sh,tools/lib/dashboard_data.sh,tools/dashboard-data,dashboard-control-center/src/dashboardData.js,dashboard-control-center/src/App.jsx,dashboard-control-center/src/i18n.js,dashboard-control-center/src/styles.css,tests/fixtures/dashboard-control-center.json,tests/fixtures/dashboard-control-center-live-update.json,tests/playwright/dashboard-control-center.spec.js,tools/test_dashboard_schema.sh,tools/test_dashboard_data.sh,docs/workflow/TEST_PLAN_MANIFEST.tsv,docs/workflow/GIT_HOOK_CHECKS.tsv,docs/workflow/GIT_HOOK_PARALLEL_GROUPS.tsv,docs/workflow/FINAL_GATE_COVERAGE.tsv,tools/test_lesson_repository.sh,tools/check_lesson_structure.sh,tools/check_lesson14_structure.sh,.github/workflows/ci.yml,.github/workflows/lesson14-ci.yml,tools/check_ci_workflow_structure.sh
TESTS: tools/test_product_repository_authority.sh,tools/test_dashboard_schema.sh,tools/test_dashboard_data.sh,tools/check_test_plan_coverage.sh,tools/test_git_hooks.sh,tools/test_git_hooks_parallel.sh,tools/test_ci_final_gate.sh,tools/check_ci_workflow_structure.sh,tools/check_as_built_sync_contract.sh,tools/check_as_built_docs.sh

This implemented plan records the external product repository authority work after document synchronization and runtime implementation.
The implementation remains additive, manifest-driven, evidence-driven, and read-only for dashboard consumers.

### Implemented Change Targets

- Added lesson-side product structure and evidence schema policy documents.
- Added a shared product document path resolver that reads canonical docs paths and existing root-level legacy paths without changing existing gate semantics.
- Added reusable product repository authority helpers under `tools/lib/`.
- Added a read-only product authority command that can inspect a configured product repository or a supplied product root.
- Added a standalone product authority regression test using temporary product repositories and no real network.
- Extended `docs/workflow/DASHBOARD_DATA_SCHEMA.tsv` before dashboard UI reliance, adding product authority, manifest summary, evidence summary, product-operation blockers, and explicit not-run/stale state handling.
- Extended `tools/dashboard-data` as a read-only snapshot producer that reads existing manifests and evidence only.
- Updated dashboard data fixtures and tests to verify missing product repository, present product repository, manifest coverage, evidence freshness, and product-operation blockers.
- Kept the browser control center read-only and avoided browser-triggered command execution.

### Implemented Order

1. Synchronize the planned contract through the five as-built/workflow documents.
2. Add product repository structure and evidence schema policy documents.
3. Extend dashboard schema with product authority fields and state vocabulary before UI reliance.
4. Implement the shared product document path resolver and shared parsing/status helpers for product manifests and existing evidence.
5. Implement a read-only CLI command for product authority status.
6. Add fixture-based tests that create temporary product repositories with manifest and evidence combinations.
7. Connect the product authority read model into dashboard-data without removing current fields or executing product checks.
8. Update dashboard schema and dashboard data tests.
9. Add the new product authority test to the test plan, Git hooks check list, final-gate coverage where required by existing policy, and aggregate regression paths.
10. Run contract-required checks and targeted tests.
11. Move the sync ID from planned to implemented and update task tracker and handoff.

### Verification Method

```bash
./tools/check_as_built_sync_contract.sh
./tools/check_as_built_docs.sh
./tools/test_product_repository_authority.sh
./tools/test_dashboard_schema.sh
./tools/test_dashboard_data.sh
./tools/check_test_plan_coverage.sh
```

Broader aggregate, full/no-cache, pre-commit, remote CI, and final gate checks remain governed by the workflow contract and current user approval.

### Failure Recovery

- If sync checks fail, fix the contract row and all five synchronized blocks before runtime implementation continues.
- If product path checks become ambiguous, fail closed and report sanitized context rather than guessing.
- If a root duplicate product document exists, report the conflict as product authority `blocked` instead of choosing one silently.
- If evidence freshness conflicts with source state, mark the evidence stale or unknown instead of treating it as healthy.
- If dashboard schema changes break existing consumers, preserve existing fields and add the new product authority fields additively.
- If product repository evidence is absent, report `not_run` or `not_collected` rather than creating evidence inside `tools/dashboard-data`.
- If any existing-feature tradeoff appears necessary, stop and request developer approval.

### Developer Approval Boundaries

- Approval is required before adding browser-side command execution.
- Approval is required before destructive product repository operations, automatic push, merge, delete, or remote mutation.
- Approval is required before changing the priority of `AGENTS.MD` invariants.
- Approval is required before removing support for root-level legacy product documents or changing existing product gate semantics.
- Approval is required before changing 7-day, 14-day, CI, pre-commit, or existing product cleanup semantics.

## Implemented STEP 1-14 Product Launch Quality Gate Implementation Plan

SYNC-ID: step_1_14_product_launch_quality_gate
STATUS: implemented
ARTIFACTS: docs/workflow/AS_BUILT_SYNC_CONTRACT.tsv,lesson/SYNC_GATES_14_DAYS.tsv,lesson/LESSON_FLOW_14_DAYS.tsv,prompts/PROMPTS_14_DAYS.md,skills/lesson-sync-gate/SKILL.md,tools/check_lesson14_sync.sh,tools/test_lesson14.sh,tools/product-launch-check,tools/test_product_launch_check.sh,tools/test_product_gate_tools.sh,tools/check_as_built_sync_contract.sh,tools/check_as_built_docs.sh
TESTS: tools/check_lesson14_sync.sh,tools/test_lesson14.sh,tools/test_product_launch_check.sh,tools/test_product_gate_tools.sh,tools/check_as_built_sync_contract.sh,tools/check_as_built_docs.sh

This implementation was priority 1.
It fixes the trust boundary first: STEP 1-14 completion must mean the product works through the documented user launch path.

Implemented order:

1. Define the product launch-path gate in lesson-side sync-gate policy.
   - Treat the product README launch path as the launch authority.
   - Keep direct `index.html` opening as the planned STEP 1-14 task-tracker contract.
   - Keep HTTP-server-only launch as an approval-requiring alternative.

2. Add launch-path verification to the product gate flow.
   - Check the Add Task workflow through the documented launch path.
   - Verify task list rendering, counters, status transitions, and Clear Done behavior.
   - Keep the check standalone-runnable and callable from the lesson aggregate.
   - Record `tools/product-launch-check` and `tools/test_product_launch_check.sh` in the sync contract artifacts and tests after the runtime artifact exists.

3. Update STEP 1-14 prompts and skill guidance.
   - Tell agents to verify the user-facing launch path before declaring completion.
   - Keep existing lesson approval and ordered progression semantics unchanged.

4. Connect the final STEP 1-14 completion path to launch verification.
   - Ensure final completion cannot pass with unit-only, HTTP-only, or document-only evidence.
   - Keep missing product repository conditions reported safely without recreating the repository.

5. Update product-side generated guidance through the existing lesson workflow.
   - Product README, product requirements, product specification, implementation plan, task tracker, and handoff must describe the same launch path when generated or repaired.
   - Do not bulk-edit unrelated existing product repositories from lesson-side synchronization.

Verification plan:

```bash
./tools/check_lesson14_sync.sh
./tools/test_lesson14.sh
./tools/test_product_launch_check.sh
./tools/test_product_gate_tools.sh
./tools/check_as_built_sync_contract.sh
./tools/check_as_built_docs.sh
```

Failure recovery:

- If direct launch verification fails, fix the product launch implementation or generated guidance before allowing final completion.
- If the documented launch path and test path differ, treat the mismatch as a gate failure.
- If a product repository is missing, report the missing product context without mutating the lesson repository or recreating product files.
- If implementation appears to require changing the official launch path, stop for developer approval.

Developer approval boundaries:

- Approval is required before changing the official STEP 1-14 task-tracker launch path from direct `index.html` opening to HTTP server launch.
- Approval is required before adding a bundler, dependency, external service, browser command execution, or destructive product operation.
- Approval is required before changing existing STEP 1-7 or STEP 1-14 ordered progression semantics.

## Implemented Product Authority Evidence Status Propagation Implementation Plan

SYNC-ID: product_authority_evidence_status_propagation
STATUS: implemented
ARTIFACTS: docs/workflow/AS_BUILT_SYNC_CONTRACT.tsv,docs/workflow/PRODUCT_GATE_EVIDENCE_SCHEMA.tsv,docs/workflow/PRODUCT_REPOSITORY_STRUCTURE.tsv,docs/workflow/DASHBOARD_DATA_SCHEMA.tsv,tools/lib/product_repository_authority.sh,tools/product-repository-authority,tools/test_product_repository_authority.sh,tools/lib/dashboard_data.sh,tools/dashboard-data,tools/test_dashboard_data.sh,tools/test_dashboard_schema.sh,tools/check_as_built_sync_contract.sh,tools/check_as_built_docs.sh
TESTS: tools/test_product_repository_authority.sh,tools/test_dashboard_schema.sh,tools/test_dashboard_data.sh,tools/check_as_built_sync_contract.sh,tools/check_as_built_docs.sh

This implementation was priority 2.
It corrects the product evidence read model before other workflows rely on product authority state.

Implemented order:

1. Add product authority regression fixtures for multiple evidence rows.
   - Cover matching context, `all` context, context mismatch, malformed rows, and deterministic JSON output.
   - Prefer temporary fixtures generated inside `tools/test_product_repository_authority.sh`; if persistent fixture files are added, add them to the sync contract artifacts before marking implemented.

2. Fix evidence JSON aggregation.
   - Preserve every applicable evidence item as valid JSON.
   - Fail closed to safe product-authority state when evidence rows are malformed.

3. Add required-evidence status propagation.
   - Promote required `failed` and `blocked` evidence to product-operation blockers.
   - Promote required `stale`, `not_run`, and `unknown` evidence to stale, not-run, unknown, or manual-required state.
   - Keep optional evidence visible without turning it into a required blocker.

4. Keep dashboard-data read-only.
   - Dashboard-data consumes product authority state only.
   - No evidence writing, GitHub polling, Git fetch, CI execution, or repository mutation belongs in this sync ID.

5. Update schema/data tests.
   - Validate status vocabulary, blocker shape, evidence freshness, and dashboard-safe JSON output.

Verification plan:

```bash
./tools/test_product_repository_authority.sh
./tools/test_dashboard_schema.sh
./tools/test_dashboard_data.sh
./tools/check_as_built_sync_contract.sh
./tools/check_as_built_docs.sh
```

Failure recovery:

- If product authority JSON becomes invalid, stop dashboard-data work and fix authority output first.
- If evidence state conflicts with structure state, preserve the worse product-operation state.
- If a status cannot be classified safely, emit `unknown` or `manual_required` rather than `ready`.

Developer approval boundaries:

- Approval is required before adding evidence writers, automatic Git/CI refresh, network calls, or product repository mutation.
- Approval is required before weakening canonical product document enforcement.

## Implemented Free Development Product Repository Scaffold Implementation Plan

SYNC-ID: free_development_product_repo_scaffold
STATUS: implemented
ARTIFACTS: free-development/FREE_DEVELOPMENT_MODE.md,docs/workflow/PRODUCT_REPOSITORY_STRUCTURE.tsv,docs/workflow/PRODUCT_GATE_EVIDENCE_SCHEMA.tsv,tools/free-development,tools/product-improvement,tools/external-integration,tools/product-scaffold-check,tools/test_product_scaffold_check.sh,tools/test_product_gate_tools.sh,tools/test_product_repository_authority.sh,tools/check_workflow_pair_sync.sh,tools/check_as_built_sync_contract.sh,tools/check_as_built_docs.sh
TESTS: tools/test_product_scaffold_check.sh,tools/test_product_gate_tools.sh,tools/test_product_repository_authority.sh,tools/check_workflow_pair_sync.sh,tools/check_as_built_sync_contract.sh,tools/check_as_built_docs.sh

This implementation was priority 3.
It makes Free Development repositories structurally inspectable before the dashboard presents them as selected contexts.

Implemented order:

1. Extend the product repository structure policy.
   - Keep `docs/product/`, `docs/workflow/`, `docs/memory/`, `ops/`, `src/`, and `tests/` as reusable scaffold areas.
   - Keep legacy root-level `AGENT.md`, `README.md`, entry files, and standard control directories discoverable until the planned product-side `AGENTS.MD` migration replaces the legacy agent entry.

2. Add manifest-backed source authority.
   - Declare entrypoint, runtime source, test source, CI, security, dashboard surfaces, and integration evidence through `ops/` manifests.
   - Avoid product-stack-specific or product-name-specific branches.
   - If new manifest files are added rather than extending existing policy files, add them to the sync contract artifacts before marking implemented.

3. Align Free Development, Product Improvement, and External Integration gates.
   - Use the shared product authority resolver.
   - Keep canonical product documents as the only accepted scaffold for product design and workflow documents.

4. Add scaffold validation tests.
   - Cover missing required scaffold entries, optional stack additions, root duplicate blockers, and ambiguous entrypoint/source declarations.
   - Keep tests standalone-runnable and aggregate-runnable.
   - Record `tools/product-scaffold-check` and `tools/test_product_scaffold_check.sh` in the sync contract artifacts and tests after the runtime artifact exists.

5. Update free-development guidance.
   - Describe the external product repo shape in learner-facing workflow guidance without copying the lesson repository wholesale.

Verification plan:

```bash
./tools/test_product_gate_tools.sh
./tools/test_product_scaffold_check.sh
./tools/test_product_repository_authority.sh
./tools/check_workflow_pair_sync.sh
./tools/check_as_built_sync_contract.sh
./tools/check_as_built_docs.sh
```

Failure recovery:

- If root duplicate product documents exist, report a product-operation blocker instead of choosing silently.
- If source authority is ambiguous, fail scaffold validation with a required manifest correction.
- If a repository is stack-specific, add policy or manifest rows rather than hard-coded tool branches.

Developer approval boundaries:

- Approval is required before weakening canonical document enforcement or making CI mandatory for every Free Development repository.
- Approval is required before adding destructive repository cleanup, automatic push, merge, or remote mutation to scaffold workflows.

## Implemented Dashboard Control Center Selected Context Sync Implementation Plan

SYNC-ID: dashboard_control_center_selected_context_sync
STATUS: implemented
ARTIFACTS: docs/workflow/AS_BUILT_SYNC_CONTRACT.tsv,docs/workflow/DASHBOARD_DATA_SCHEMA.tsv,docs/workflow/PRODUCT_REPOSITORY_STRUCTURE.tsv,docs/workflow/PRODUCT_GATE_EVIDENCE_SCHEMA.tsv,tools/lib/dashboard_data.sh,tools/dashboard-data,tools/lib/product_repository_authority.sh,tools/product-repository-authority,tools/test_product_repository_authority.sh,tools/test_dashboard_schema.sh,tools/test_dashboard_data.sh,tools/test_dashboard_control_center.sh,dashboard-control-center/mocks/mock-context-overview.png,dashboard-control-center/mocks/mock-context-lessons.png,dashboard-control-center/mocks/mock-context-workflow.png,dashboard-control-center/mocks/mock-context-maintenance.png,dashboard-control-center/mocks/mock-context-safety.png,dashboard-control-center/src/App.jsx,dashboard-control-center/src/dashboardData.js,dashboard-control-center/src/i18n.js,dashboard-control-center/src/styles.css,tests/fixtures/dashboard-control-center.json,tests/fixtures/dashboard-control-center-live-update.json,tests/playwright/dashboard-control-center.spec.js,tools/check_as_built_sync_contract.sh,tools/check_as_built_docs.sh,tools/check_test_plan_coverage.sh,tools/check_ci_workflow_structure.sh
TESTS: tools/test_product_repository_authority.sh,tools/test_dashboard_schema.sh,tools/test_dashboard_data.sh,tools/test_dashboard_control_center.sh,tools/check_as_built_sync_contract.sh,tools/check_as_built_docs.sh,tools/check_test_plan_coverage.sh,tools/check_ci_workflow_structure.sh

This implementation was priority 4.
It starts from the data contract because the browser UI must not infer workflow state, repository identity, evidence status, blockers, or progress numbers.
It depends on the earlier launch-quality, evidence-status, and scaffold sync IDs for the product facts that it displays.

Implemented order:

1. Extend the dashboard schema with `selected_context` and `available_contexts`.
   - Keep the change additive.
   - Preserve existing fields and existing consumers.
   - Define status vocabulary before UI reliance.

2. Add a selected-context resolver to the dashboard-data producer layer.
   - Use existing lesson config, lesson state, workflow context map, Git workflow settings, product structure policy, product evidence schema, menu prerequisites, and product authority inputs.
   - Avoid fixed repository names and fixed workflow context branches in UI code.
   - Treat Git, CI, Security, and product status readers as read-only evidence/settings readers; do not execute checks or refresh evidence from the resolver.

3. Remove the dashboard-data `product-improvement` fixed context and single-product-repository assumption.
   - Pass the resolved context into product authority, Git/CI/Security evidence display, and command preview generation.
   - Preserve `task-tracker-repository` as the STEP 1-14 standard repository where that context selects it.

4. Consume product authority evidence propagation from `product_authority_evidence_status_propagation`.
   - Do not duplicate product authority status aggregation in dashboard-data or React.
   - Treat unresolved evidence propagation as a blocker for final UI reliance.

5. Consume canonical scaffold and resolver behavior from `free_development_product_repo_scaffold`.
   - Prefer producer-owned product authority fields.
   - Keep root-level product document compatibility through shared resolvers.

6. Make dashboard-data evidence-driven while preserving read-only behavior.
   - Read existing evidence, settings, and manifests.
   - Do not create evidence, call GitHub, fetch remotes, run CI, run product checks, or mutate repositories.
   - Classify unavailable live evidence as not-run, stale, manual-required, or unknown with a safe next command preview.

7. Update the React control center to consume selected-context data.
   - Add a top-level context selector.
   - Render selected-context summary, four context-aware status cards, Git management overview, Security overview, and current-state detail headers.
   - Keep UI state limited to display selection and navigation.

8. Align the selected-context UI foundation with `mock-context-*` references.
   - Reuse common components for selected context header, current status cards, next safe action, blocker rows, manual follow-ups, and evidence details.
   - Preserve category icon identity, distinct health colors, card height alignment, centered short labels, no-overflow responsive constraints, and read-only notices.
   - The full mock-source-of-truth UI rebuild is implemented separately under `dashboard_control_center_context_mock_source_of_truth`.

9. Update tests and fixtures.
   - Cover selected contexts, evidence status aggregation, free-development context, canonical docs fallback/conflict behavior, Partial Failures none state, blockers, manual follow-ups, and no browser command execution.
   - Keep new checks standalone-callable and aggregate-callable through existing test entry points.

Verification plan:

```bash
./tools/test_product_repository_authority.sh
./tools/test_dashboard_schema.sh
./tools/test_dashboard_data.sh
./tools/test_dashboard_control_center.sh
./tools/check_as_built_sync_contract.sh
./tools/check_as_built_docs.sh
./tools/check_test_plan_coverage.sh
./tools/check_ci_workflow_structure.sh
```

For later mock-source runtime UI changes, `npm run dashboard:build` remains the targeted Vite build check, but it is not a sync-contract `TESTS` entry because the contract records standalone repository check files.
Broader aggregate, full/no-cache Git hooks, pre-commit, final-gate, main CI, and remote CI remain governed by AGENTS.MD verification-scope rules and the active workflow contract.

Failure recovery:

- If schema validation fails, stop UI work and correct the schema, producer, and fixtures first.
- If product authority aggregation fails, fix authority status and blockers before dashboard-data or UI changes continue.
- If dashboard-data cannot resolve a context safely, emit a valid snapshot with blocked or manual-required state instead of guessing.
- If UI rendering fails, add or correct producer-owned data rather than introducing React-side state inference.
- If sync checks fail, repair the five synchronized documents and sync contract before runtime implementation continues.
- If any existing-feature tradeoff appears necessary, stop and request developer approval.

Developer approval boundaries:

- Approval is required before browser command execution, POST fetches, GitHub/API calls, live authoritative CI/Git fetching, push, merge, remote deletion, destructive Git operations, OAuth, tokens, or webhook handling.
- Approval is required before removing root-level legacy product document compatibility.
- Approval is required before changing STEP 1-7 behavior, STEP 1-14 behavior, existing CI, pre-commit, Git hooks semantics, document routes, or dashboard read-only ownership.
- Approval is required before adding a persistent selected-context storage file outside existing settings and policy sources.
- Approval is required before including evidence writing or auto-merge execution in this sync ID.

## Implemented Dashboard Control Center Context Mock Source Of Truth Implementation Plan

SYNC-ID: dashboard_control_center_context_mock_source_of_truth
STATUS: implemented
ARTIFACTS: docs/workflow/AS_BUILT_SYNC_CONTRACT.tsv,docs/workflow/DASHBOARD_DATA_SCHEMA.tsv,tools/lib/dashboard_data.sh,tools/dashboard-data,dashboard-control-center/mocks/mock-context-overview.png,dashboard-control-center/mocks/mock-context-lessons.png,dashboard-control-center/mocks/mock-context-workflow.png,dashboard-control-center/mocks/mock-context-maintenance.png,dashboard-control-center/mocks/mock-context-safety.png,dashboard-control-center/src/App.jsx,dashboard-control-center/src/dashboardData.js,dashboard-control-center/src/i18n.js,dashboard-control-center/src/styles.css,tests/fixtures/dashboard-control-center.json,tests/fixtures/dashboard-control-center-live-update.json,tests/playwright/dashboard-control-center.spec.js,tools/test_dashboard_schema.sh,tools/test_dashboard_data.sh,tools/test_dashboard_control_center.sh,tools/check_as_built_sync_contract.sh,tools/check_as_built_docs.sh,tools/check_test_plan_coverage.sh,tools/check_ci_workflow_structure.sh
TESTS: tools/test_dashboard_schema.sh,tools/test_dashboard_data.sh,tools/test_dashboard_control_center.sh,tools/check_as_built_sync_contract.sh,tools/check_as_built_docs.sh,tools/check_test_plan_coverage.sh,tools/check_ci_workflow_structure.sh

This implementation re-centers the dashboard UI around the five approved `mock-context-*` images after selected-context data synchronization.
The implementation must keep the dashboard producer authoritative, the browser read-only, and the UI reusable across STEP 1-7, STEP 1-14, applied lessons, Free Development, Product Improvement, External Integration, and lesson-repository improvement contexts.

Change targets:

- `docs/workflow/DASHBOARD_DATA_SCHEMA.tsv`, `tools/lib/dashboard_data.sh`, and `tools/dashboard-data` for producer-owned fields needed by the mock-aligned UI.
- `dashboard-control-center/src/App.jsx`, `dashboard-control-center/src/dashboardData.js`, `dashboard-control-center/src/i18n.js`, and `dashboard-control-center/src/styles.css` for the React shell, sidebar, overview, detail pages, localization, and responsive layout.
- `tests/fixtures/dashboard-control-center.json`, `tests/fixtures/dashboard-control-center-live-update.json`, and `tests/playwright/dashboard-control-center.spec.js` for mock-structure and safety regression coverage.

Implementation order:

1. Confirm the five `mock-context-*` images as source references for layout, icon direction, page density, sidebar detail, and non-engineer comprehension.
2. Extend the dashboard schema only for fields the UI cannot safely derive, including current-step labels, current-step totals, Git operation rows, maintenance evidence rows, Security approval summaries, dangerous-operation summaries, and command-preview grouping.
3. Extend `tools/dashboard-data` and shared helpers to emit those fields from existing settings, manifests, evidence, and status sources without executing Git, CI, GitHub, product-security, product-authority, or shell commands.
4. Refactor the React shell into reusable surfaces: sidebar, page header, context menu tiles, selected-context strip, status cards, decision summaries, evidence tables, command-preview tiles, and read-only banners.
5. Rebuild Overview to match the mock order: visible header, seven menu tiles, context strip, four status cards, Git management settings, Security confirmation, four Explore Pages cards, and bottom notice.
6. Rebuild Lessons, Development Workflow, Maintenance Sync, and Safety Confirmation as page-specific surfaces using shared components but preserving each mock's information hierarchy.
7. Move all fixed labels through `i18n.js` and keep data-originated identifiers sanitized through existing display helpers.
8. Update fixtures so tests verify changing data, empty and non-empty Partial Failures, selected contexts, no command execution, and mobile no-overflow without depending on one screenshot value or one language phrase.
9. Run the contract-required targeted checks before marking this sync ID implemented.

Verification plan:

```bash
./tools/test_dashboard_schema.sh
./tools/test_dashboard_data.sh
./tools/test_dashboard_control_center.sh
./tools/check_as_built_sync_contract.sh
./tools/check_as_built_docs.sh
./tools/check_test_plan_coverage.sh
./tools/check_ci_workflow_structure.sh
```

When runtime UI changes are implemented, `npm run dashboard:build` is the targeted Vite build check.
Broader aggregate, full/no-cache hooks, pre-commit, final gate, main CI, and remote CI remain governed by AGENTS.MD local-verification scope and the active workflow contract.

Failure recovery:

- If schema checks fail, correct schema, producer, and fixture data before continuing React work.
- If producer data cannot support a mock field safely, add a structured blocked, unknown, manual-required, not-run, or stale state rather than hard-coding mock text.
- If React layout contradicts producer state, fix the data contract or shared display helper instead of adding UI-only status inference.
- If mock alignment creates command-like affordances, remove the affordance and keep links, code chips, and preview cards visually non-executable.
- If mobile or localized text overflows, fix responsive constraints rather than language-specific branches.
- If sync checks fail, repair the sync contract and all five synchronized documents before runtime implementation continues.
- If any existing-feature tradeoff appears necessary, stop and request developer approval.

Developer approval boundaries:

- Approval is required before browser command execution, POST fetches, Git/GitHub/CI/API calls, live authoritative CI/Git polling, automatic push, merge, cleanup, deletion, OAuth, token, webhook, evidence writing, or destructive operations.
- Approval is required before removing root-level legacy product document compatibility.
- Approval is required before changing STEP 1-7, STEP 1-14, existing CI, pre-commit, Git hooks semantics, document routes, or dashboard read-only ownership.
- Approval is required before making screenshot equality the required automated oracle.
- Approval is required before accepting any existing-feature tradeoff.

## Implemented Dashboard Control Center Exact Mock Alignment Correction Implementation Plan

SYNC-ID: dashboard_control_center_mock_exact_alignment_correction
STATUS: implemented
ARTIFACTS: docs/workflow/AS_BUILT_SYNC_CONTRACT.tsv,docs/workflow/DASHBOARD_DATA_SCHEMA.tsv,docs/workflow/PRODUCT_REPOSITORY_STRUCTURE.tsv,docs/workflow/PRODUCT_GATE_EVIDENCE_SCHEMA.tsv,docs/workflow/TEST_PLAN_MANIFEST.tsv,docs/workflow/GIT_HOOK_CHECKS.tsv,docs/workflow/GIT_HOOK_PARALLEL_GROUPS.tsv,docs/workflow/FINAL_GATE_COVERAGE.tsv,free-development/FREE_DEVELOPMENT_MODE.md,templates/TEMPLATES.md,lesson/SYNC_GATES_14_DAYS.tsv,tools/lib/dashboard_data.sh,tools/dashboard-data,tools/lib/product_repository_authority.sh,tools/free-development,tools/product-improvement,tools/external-integration,tools/product-scaffold-check,tools/product-launch-check,dashboard-control-center/mocks/mock-context-overview.png,dashboard-control-center/mocks/mock-context-lessons.png,dashboard-control-center/mocks/mock-context-workflow.png,dashboard-control-center/mocks/mock-context-maintenance.png,dashboard-control-center/mocks/mock-context-safety.png,dashboard-control-center/src/App.jsx,dashboard-control-center/src/dashboardData.js,dashboard-control-center/src/i18n.js,dashboard-control-center/src/styles.css,tests/fixtures/dashboard-control-center.json,tests/fixtures/dashboard-control-center-live-update.json,tests/playwright/dashboard-control-center.spec.js,tools/test_dashboard_schema.sh,tools/test_dashboard_data.sh,tools/test_dashboard_control_center.sh,tools/test_product_repository_authority.sh,tools/test_product_scaffold_check.sh,tools/test_product_launch_check.sh,tools/test_product_gate_tools.sh,tools/check_lesson14_sync.sh,tools/test_lesson14.sh,tools/check_test_plan_coverage.sh,tools/check_ci_workflow_structure.sh,tools/check_as_built_sync_contract.sh,tools/check_as_built_docs.sh
TESTS: tools/test_dashboard_schema.sh,tools/test_dashboard_data.sh,tools/test_dashboard_control_center.sh,tools/test_product_repository_authority.sh,tools/test_product_scaffold_check.sh,tools/test_product_launch_check.sh,tools/test_product_gate_tools.sh,tools/check_lesson14_sync.sh,tools/test_lesson14.sh,tools/check_test_plan_coverage.sh,tools/test_test_plan.sh,tools/test_git_hooks.sh,tools/test_git_hooks_parallel.sh,tools/test_ci_final_gate.sh,tools/check_ci_workflow_structure.sh,tools/check_as_built_sync_contract.sh,tools/check_as_built_docs.sh

This implemented correction is a separate implementation unit because developer visual review found that the earlier implemented mock-source dashboard relied too much on generic structures and did not match the current mock family.
It is not a replacement for selected-context sync, product authority, scaffold, or launch-quality work; it makes those contracts visible through an exact mock-aligned control-panel UI.

Change targets:

- `docs/workflow/DASHBOARD_DATA_SCHEMA.tsv`, `tools/lib/dashboard_data.sh`, and `tools/dashboard-data` for selected-context map, context-specific metrics, workflow evidence rows, maintenance evidence rows, Safety summaries, and command-preview groups.
- `tools/lib/product_repository_authority.sh` for blocker-preserving status propagation when required evidence is failed, blocked, stale, not-run, or unknown.
- `tools/free-development`, `tools/product-improvement`, `tools/external-integration`, `tools/product-scaffold-check`, and `tools/product-launch-check` for shared external product repository structure, manifest-backed authority, and launch-quality gates.
- `free-development/FREE_DEVELOPMENT_MODE.md`, `templates/TEMPLATES.md`, `docs/workflow/PRODUCT_REPOSITORY_STRUCTURE.tsv`, `docs/workflow/PRODUCT_GATE_EVIDENCE_SCHEMA.tsv`, and `lesson/SYNC_GATES_14_DAYS.tsv` for external repository and STEP 1-14 launch-quality contracts.
- `dashboard-control-center/src/App.jsx`, `dashboard-control-center/src/dashboardData.js`, `dashboard-control-center/src/i18n.js`, and `dashboard-control-center/src/styles.css` for the exact mock-aligned browser implementation.
- Dashboard fixtures and Playwright spec for post-visual-approval structural and safety regression coverage.

Implementation order completed:

1. Kept this sync ID planned until the runtime correction was implemented and targeted checks passed.
2. Corrected the selected-context data model so menu choices have complete producer-owned context data or safe incomplete state.
   - Implement either an expanded `available_contexts[]` contract or a `contexts_by_menu` style producer map before the UI treats menu switching as live context switching.
   - Keep thin menu-id/status summaries only for non-authoritative preview display.
3. Separated STEP 1-14, Free Development, Product Improvement, External Integration, and lesson-repository improvement repository resolution through policy-backed context data.
   - Treat `docs/memory/` as part of the standard external repository scaffold shape while keeping individual memory files optional until used.
4. Made Git, CI, Security, product authority, scaffold, launch, and workflow-pair status display evidence-backed or explicitly manual-required without making `tools/dashboard-data` execute checks.
5. Added selected-context Git, CI, and Security axis propagation from product authority evidence and product-operation blockers, so external product repository evidence changes are reflected in the dashboard state.
6. Hardened product authority aggregation so multiple evidence rows and required failed, blocked, stale, not-run, or unknown evidence propagate to blockers deterministically.
7. Required `passed` evidence to be both current and authoritative before satisfying a required manifest source, and deduplicated repeated required evidence sources before emitting synthetic not-run blockers.
8. Replaced fixed lesson live, maintenance card, and safety card description text with producer-owned lesson setting state, snapshot identity, evidence-row, approval-row, dangerous-operation, and Partial Failure detail rendering.
9. Recomputed dashboard metrics around selected-context progress and current blockers rather than mixing optional, unknown, cached, or future checks into progress percentages.
10. Refactored React into page-specific mock surfaces for Overview, Lessons, Workflow, Maintenance, and Safety.
11. Limited shared React abstractions to shell, sidebar, icon badge, status pill, display sanitization, localization, and read-only notice behavior.
12. Rebuilt the Overview to match the current mock order and content amount.
13. Rebuilt Lessons around selected lesson progress, current step, next learning action, and live lesson state.
14. Rebuilt Workflow around Git sync, CI, PR/Merge, product evidence, next step, and recent evidence rows from producer data.
15. Rebuilt Maintenance around as-built sync, workflow pair, Developer Memory, repo-local skills, Git workflow settings, Security policy, evidence rows, and source grounding as secondary details.
16. Rebuilt Safety around Security gate, approvals, dangerous operations, always-visible Partial Failures, command previews, and policy state.
17. Aligned color tokens, contrast, icon shapes, icon centering, background fill or transparency, status badges, card heights, and responsive no-overflow with the five mocks.
18. Adjusted targeted tests and fixtures, then promoted this sync ID to implemented after required checks passed.

Document synchronization:

- Requirements state why the corrective implementation is needed and what must not change.
- Specification defines the producer-owned data boundary, page-specific UI contract, external repository behavior, and read-only safety boundary.
- This implementation plan defines execution order, verification, recovery, and approval boundaries.
- Task tracker records current planned work state and implementation checklist.
- Handoff records restart context, source mocks, prohibited shortcuts, and deferred verification.

Verification completed:

- Targeted runtime checks cover dashboard schema/data, browser control center, product authority, scaffold, launch quality, product gate, STEP 1-14 sync, STEP 1-14 aggregate, and as-built synchronization.
- The sync contract and all five synchronized `TESTS` blocks carry the runtime checks required by the actual implementation.
- `tools/test_dashboard_control_center.sh` includes the targeted Vite build and Playwright browser control-center checks.
- Full/no-cache hooks, final gate, main CI, and remote CI remain governed by AGENTS.MD local-verification scope and active workflow contract.

Failure recovery:

- If a mock field lacks producer-owned data, extend schema and producer output or show a safe incomplete state; do not hard-code screenshot text.
- If UI remains visually misaligned, correct the page-specific structure instead of layering more generic CSS.
- If product authority aggregation fails, fix authority status and blockers before dashboard-data or React changes continue.
- If scaffold or launch validation conflicts with existing STEP behavior, stop and isolate the conflict before implementation continues.
- If sync checks fail, repair all five synchronized documents and the sync contract before runtime implementation starts.
- If any existing-feature tradeoff appears necessary, stop and request developer approval.

Developer approval boundaries:

- Approval is required before browser command execution, POST fetches, Git/GitHub/CI/API calls, live authoritative Git or CI polling, push, merge, cleanup, remote deletion, OAuth, token handling, webhook handling, evidence writing, or destructive operations.
- Approval is required before changing STEP 1-7 behavior, STEP 1-14 behavior, direct `index.html` launch requirements, existing CI, pre-commit, Git hooks semantics, document routes, dashboard read-only ownership, or canonical product document enforcement.
- Approval is required before creating runtime pages for repository information, documents, settings, help, or changelog.
- Approval is required before making screenshot equality an automated test oracle.

## Implemented Dashboard Lessons Page Exact Mock Alignment Implementation Plan

SYNC-ID: dashboard_control_center_lessons_page_exact_mock_alignment
STATUS: implemented
ARTIFACTS: docs/workflow/AS_BUILT_SYNC_CONTRACT.tsv,dashboard-control-center/mocks/mock-context-lessons.png,dashboard-control-center/src/App.jsx,dashboard-control-center/src/i18n.js,dashboard-control-center/src/styles.css,tests/playwright/dashboard-control-center.spec.js,tools/test_dashboard_control_center.sh
TESTS: tools/test_dashboard_control_center.sh,tools/check_as_built_sync_contract.sh,tools/check_as_built_docs.sh,tools/check_test_plan_coverage.sh,tools/check_ci_workflow_structure.sh

Implementation order completed:

1. Inspect `dashboard-control-center/mocks/mock-context-lessons.png` and the current Lessons page side by side with Playwright screenshots.
2. Create a discrepancy checklist for layout, color, contrast, icon identity, icon background fill or transparency, text amount, progress display, card height, and responsive behavior.
3. Update `App.jsx`, `i18n.js`, and `styles.css` to match the mock-backed Lessons page structure without adding fixed screenshot-only values.
4. Add or adjust shared components or tokens only when they improve mock-family reuse and do not disturb the already implemented pages.
5. Keep schema and producer output unchanged unless the mock requires a fact that is not available from producer-owned data; in that case, stop and plan the missing data contract.
6. Used Playwright desktop and narrow/mobile screenshots for visual inspection before reporting design completion for developer visual approval.
7. After developer visual approval and explicit Git/CI closure request, run `tools/test_dashboard_control_center.sh` and the synchronized structure checks listed in this block.
8. Promoted this sync ID from `planned` to `implemented` after implementation and targeted verification were in scope.

Document synchronization:

- Requirements record the user-facing goal and non-scope.
- Specification records the read-only producer-owned UI contract.
- This implementation plan records execution order, verification, recovery, and approval boundaries.
- Task tracker records current work state.
- Handoff records restart context and the exact source mock.

Failure recovery:

- If visual mismatch remains, revise page structure, tokens, icons, and content hierarchy instead of layering ad hoc CSS.
- If responsive behavior breaks, adjust layout constraints before changing content.
- If a producer-data gap appears, stop and plan schema and producer changes before rendering invented state.
- If sync checks fail, repair the five synchronized documents and sync contract before runtime implementation proceeds.

Developer approval boundaries:

- Visual implementation should stop for developer visual approval before broad checks and CI unless the workflow owner explicitly requests Git/CI closure.
- Approval is required before changing other page designs, STEP 1-7, STEP 1-14, Git hooks, CI, pre-commit, read-only dashboard ownership, or canonical product document enforcement.

## Implemented Dashboard Control Center Visual Refinement Follow-up Implementation Plan

SYNC-ID: dashboard_control_center_visual_refinement_followup
STATUS: implemented
ARTIFACTS: docs/workflow/AS_BUILT_SYNC_CONTRACT.tsv,dashboard-control-center/mocks/mock-context-overview.png,dashboard-control-center/mocks/mock-context-lessons.png,dashboard-control-center/mocks/mock-context-workflow.png,dashboard-control-center/mocks/mock-context-maintenance.png,dashboard-control-center/mocks/mock-context-safety.png,dashboard-control-center/src/App.jsx,dashboard-control-center/src/i18n.js,dashboard-control-center/src/styles.css,tests/playwright/dashboard-control-center.spec.js,tools/test_dashboard_control_center.sh,tools/check_as_built_sync_contract.sh,tools/check_as_built_docs.sh,tools/check_test_plan_coverage.sh,tools/check_ci_workflow_structure.sh
TESTS: tools/test_dashboard_control_center.sh,tools/check_as_built_sync_contract.sh,tools/check_as_built_docs.sh,tools/check_test_plan_coverage.sh,tools/check_ci_workflow_structure.sh

Implementation order completed:

1. Refined the Lessons page and Overview lesson-progress card typography, progress-ring/bar weight, fraction hierarchy, and three-card responsive layout.
2. Added restrained one-time count-up animation for lesson progress numbers and removed gradient, fade, shine, and icon scaling effects.
3. Aligned Development Workflow responsive behavior, bottom notice styling, and Git sync icon language with the mock family.
4. Aligned Maintenance Sync icon fills, status/evidence columns, copy controls, ellipsis fields, source-boundary tooltips, and non-engineer-readable labels.
5. Aligned Safety Confirmation top icons, localized Security detail labels, failure wording, Partial Failures panel, command-preview cards, copy controls, and Security policy checklist.
6. Stacked Safety command preview and Security policy panels vertically to preserve readable width.
7. Unified the left sidebar structure and active styling across all implemented pages.
8. Reset and repopulated Developer Memory with only the active dashboard and maintenance follow-ups requested by the developer.
9. Updated Playwright expectations for the implemented three-lesson-card Lessons page.
10. Kept dashboard data read-only and did not add browser command execution, live Git/CI polling, or evidence writing.

Verification plan:

```bash
./tools/test_dashboard_control_center.sh
./tools/check_as_built_sync_contract.sh
./tools/check_as_built_docs.sh
./tools/check_test_plan_coverage.sh
./tools/check_ci_workflow_structure.sh
```

Runtime visual checks should continue to use Playwright screenshots and DOM overflow checks before broad CI.
The current closure request explicitly moves from visual-only tuning into minimal local verification, commit, CI, merge, and local/remote synchronization.

Failure recovery:

- If dashboard browser tests fail, fix the UI contract or test expectation that no longer matches the implemented mock-backed behavior.
- If sync checks fail, repair the sync contract and all five synchronized documents before committing.
- If responsive overflow returns, adjust layout constraints before changing content.
- If localized fixed labels expose raw English controlled strings, add i18n mappings rather than rewriting producer-owned data.
- If Git/CI closure fails, preserve the committed branch state and record the exact failing check before retrying.

## Implemented Menu Product Display Profile Confirmation Implementation Plan

SYNC-ID: menu_product_display_profile_confirmation
STATUS: implemented
ARTIFACTS: AGENTS.MD,docs/workflow/AS_BUILT_SYNC_CONTRACT.tsv,docs/workflow/MENU_PRODUCT_PROFILE_POLICY.tsv,docs/workflow/PRODUCT_REPOSITORY_STRUCTURE.tsv,docs/workflow/DASHBOARD_DATA_SCHEMA.tsv,tools/lib/lesson_common.sh,tools/lib/product_repository_authority.sh,tools/product-profile,tools/menu,tools/lesson,tools/lesson14,tools/free-development,tools/product-improvement,tools/external-integration,tools/team-development,tools/product-scaffold-check,tools/test_menu_prerequisites.sh,tools/test_lesson.sh,tools/test_lesson14.sh,tools/test_product_repository_authority.sh,tools/test_product_scaffold_check.sh,tools/test_dashboard_schema.sh,tools/test_dashboard_data.sh
TESTS: tools/test_dashboard_schema.sh,tools/test_product_repository_authority.sh,tools/test_product_scaffold_check.sh,tools/test_menu_prerequisites.sh,tools/test_lesson.sh,tools/test_lesson14.sh,tools/test_dashboard_data.sh,tools/check_lesson_structure.sh,tools/check_agents_skills.sh

Implementation order completed:

1. Added a menu product-profile policy TSV so recommendations and scope are data-backed rather than hard-coded branches.
2. Added `tools/product-profile` with explicit `--confirm`, product repository boundary checking, safe JSON writing, and learner-confirmed display-name output.
3. Added shared profile helpers to `tools/lib/lesson_common.sh` for readiness, required checks, menu scope, and localized display-name lookup.
4. Wired profile prerequisites into `tools/menu`, direct workflow start/gate commands, and both `setup.index` lesson gates.
5. Added `product_profile_valid` validation and `ops/PRODUCT_PROFILE.json` to the external product repository structure policy.
6. Switched product authority summary from requirements/specification inference to canonical `ops/PRODUCT_PROFILE.json`.
7. Updated the dashboard schema, data tests, UI locale fallback, and targeted fixtures.
8. Kept product profile handling producer-backed and regenerated the local dashboard snapshot from `tools/dashboard-data`.

Verification completed:

```bash
./tools/test_dashboard_schema.sh
./tools/test_product_repository_authority.sh
./tools/test_product_scaffold_check.sh
./tools/test_menu_prerequisites.sh
./tools/test_lesson.sh
./tools/test_lesson14.sh
./tools/test_dashboard_data.sh
./tools/check_lesson_structure.sh
./tools/check_agents_skills.sh
npm run dashboard:build
git diff --check
```

Known follow-up:

- `tools/test_dashboard_control_center.sh` was attempted and still has existing responsive/layout expectation failures in the browser UI suite. The failure is tracked in handoff and was not promoted as passed verification for this sync ID.

## Implemented Product Repository Canonical Docs Only Implementation Plan

SYNC-ID: product_repository_canonical_docs_only
STATUS: implemented
ARTIFACTS: AGENTS.MD,docs/workflow/AS_BUILT_SYNC_CONTRACT.tsv,docs/workflow/PRODUCT_REPOSITORY_STRUCTURE.tsv,docs/workflow/PRODUCT_REPOSITORY_FORBIDDEN_ROOT_PATHS.tsv,docs/workflow/PRODUCT_GATE_EVIDENCE_SCHEMA.tsv,prompts/PROMPTS.md,prompts/PROMPTS_14_DAYS.md,lesson/LESSON_FLOW.tsv,lesson/LESSON_FLOW_14_DAYS.tsv,lesson/SYNC_GATES_14_DAYS.tsv,playbooks/AGENT_PLAYBOOK.md,playbooks/AGENT_PLAYBOOK_14_DAYS.md,templates/TEMPLATES.md,skills/task-tracker-docs/SKILL.md,skills/task-tracker-docs/references/product-docs.md,skills/worklog-doc-sync/SKILL.md,skills/worklog-doc-sync/references/worklog-sync.md,skills/lesson-sync-gate/SKILL.md,skills/lesson-sync-gate/references/sync-gates.md,skills/learning-progress-helpdesk/references/progress-helpdesk.md,tools/lib/product_repository_authority.sh,tools/product-scaffold-check,tools/product-improvement,tools/external-integration,tools/dashboard-data,tools/dashboard,tools/check_workflow_pair_sync.sh,tools/check_agents_skills.sh,tools/test_product_repository_authority.sh,tools/test_product_scaffold_check.sh,tools/test_product_security.sh
TESTS: tools/test_product_repository_authority.sh,tools/test_product_scaffold_check.sh,tools/test_product_security.sh,tools/check_agents_skills.sh,tools/test_dashboard_data.sh,tools/test_lesson14.sh,tools/check_lesson_structure.sh,tools/check_lesson14_sync.sh

Implementation order completed:

1. Split forbidden root Markdown paths into `docs/workflow/PRODUCT_REPOSITORY_FORBIDDEN_ROOT_PATHS.tsv` so the policy is reusable and not hard-coded per command.
2. Updated product authority to validate the forbidden-root policy and block root duplicates before canonical readiness can be reported.
3. Updated scaffold validation to evaluate optional rows for root duplicates while still requiring only context-required structure items.
4. Removed root fallback from product improvement, external integration, dashboard data, CLI dashboard, and product workflow-pair checks.
5. Canonicalized prompt, playbook, lesson-flow, sync-gate, and repo-local skill wording so agents are not guided to create or edit root product documents.
6. Updated tests to assert root-only and canonical-plus-root-duplicate product documents block the workflow, including optional memory duplicates.
7. Kept external repository remediation outside this lesson repository record; this implementation records only the reusable policy, tools, prompts, and tests.

Verification completed:

```bash
./tools/test_product_repository_authority.sh
./tools/test_product_scaffold_check.sh
./tools/test_product_security.sh
./tools/check_agents_skills.sh
./tools/test_dashboard_data.sh
./tools/test_lesson14.sh
./tools/check_lesson_structure.sh
./tools/check_lesson14_sync.sh
```

Failure recovery:

- If a product repository has root duplicate Markdown files, move or merge the content into the canonical docs path first, then remove the root duplicate and regenerate its repository index.
- If root and canonical content differ, stop before deletion and preserve both versions for human review.
- If dashboard product document readiness reports missing, inspect canonical `docs/product` and `docs/workflow` paths rather than adding root fallback.
- If skills or prompts regress to bare product document names, update the relevant guidance and `tools/check_agents_skills.sh` together.

## Implemented Dashboard Control Center Documents Guided Catalog Implementation Plan

SYNC-ID: dashboard_control_center_documents_guided_catalog
STATUS: implemented
ARTIFACTS: docs/workflow/AS_BUILT_SYNC_CONTRACT.tsv,docs/workflow/DASHBOARD_DATA_SCHEMA.tsv,tools/lib/dashboard_data.sh,tools/lib/document_paths.sh,tools/lib/product_repository_authority.sh,tools/dashboard-data,dashboard-control-center/src/App.jsx,dashboard-control-center/src/dashboardData.js,dashboard-control-center/src/i18n.js,dashboard-control-center/src/styles.css,tests/fixtures/dashboard-control-center.json,tests/fixtures/dashboard-control-center-live-update.json,tests/playwright/dashboard-control-center.spec.js,tools/test_dashboard_schema.sh,tools/test_dashboard_data.sh,tools/test_dashboard_control_center.sh,tools/test_product_repository_authority.sh,tools/test_product_scaffold_check.sh,tools/check_as_built_sync_contract.sh,tools/check_as_built_docs.sh
TESTS: tools/test_dashboard_schema.sh,tools/test_dashboard_data.sh,tools/test_dashboard_control_center.sh,tools/test_product_repository_authority.sh,tools/test_product_scaffold_check.sh,tools/check_as_built_sync_contract.sh,tools/check_as_built_docs.sh

Implementation order completed:

1. Define the documents catalog data contract before changing the browser page.
   - Use existing dashboard schema, producer, fixture, and validator paths.
   - Keep the shape generic, for example document id, group id, role id, path, audience, order, status, status source, related dashboard surface, and display-only related command metadata.
   - Do not add a React-only fixed document list.
2. Extend `tools/dashboard-data` and shared dashboard data helpers to emit the documents catalog from existing settings, document routes, docs-tour knowledge, and dashboard state.
   - Treat the producer as read-only.
   - Do not execute Git, CI, product authority, security checks, evidence writers, or document generators.
3. Update `DASHBOARD_DATA_SCHEMA.tsv` and `dashboardData.js` so malformed document catalog data is caught before UI reliance while missing legacy catalog data renders as a safe incomplete state.
4. Rebuild `DocumentsPage` as a guided reading surface.
   - Suggested groups: first documents to read, what is being built, current progress, decision background, and help when stuck.
   - Route Git/CI, security, evidence, file structure, and update history to their dedicated pages.
   - Keep file paths and technical ids as secondary copyable or tooltip-backed details.
5. Update localized fixed labels in `i18n.js` and reuse existing dashboard card, tooltip, copy, sidebar, and responsive CSS patterns.
6. Add or adjust tests only at the level required by changed surfaces.
   - If a new documents-specific test is needed, make it standalone and aggregate-callable.
   - Avoid assertions that depend on one exact Japanese sentence, one product stack, or one fixture-only case.
7. Promoted this sync ID to `implemented` after implementation and required verification passed.
8. Addressed sub-agent review findings for safe relative path validation, documents hash coverage, duplicate ids, legacy snapshot fallback, manifest product-type ordering, docs-tour references, and fixed-phrase test assertions.

Document synchronization:

- Requirements record the user-facing capability, non-scope, and no-tradeoff constraints.
- Specification records the data contract, UI contract, safety boundary, and compatibility behavior.
- This implementation plan records execution order, verification, recovery, and approval boundaries.
- Task tracker records current implemented work state and checklist.
- Handoff records restart context, prohibited shortcuts, and validation expectations.

Verification completed:

```bash
./tools/test_dashboard_schema.sh
./tools/test_dashboard_data.sh
./tools/test_dashboard_control_center.sh
./tools/test_product_repository_authority.sh
./tools/test_product_scaffold_check.sh
./tools/check_as_built_sync_contract.sh
./tools/check_as_built_docs.sh
```

Runtime React changes also use `npm run dashboard:build` as the targeted Vite build check.
Run broader aggregate, pre-commit, PR CI, or main CI only when the active workflow contract requires it.

Failure recovery:

- If schema or producer tests fail, fix the data contract and producer output before continuing UI work.
- If the UI cannot display a document group from producer-owned data, show a safe incomplete state or extend the schema; do not hard-code the missing fact in React.
- If evidence or command details reappear as primary Documents page content, move them back to Maintenance Sync, Safety Confirmation, Development Workflow, or update history.
- If localized text overflows, fix responsive layout or label structure rather than adding language-specific branches.
- If sync checks fail, repair the five synchronized documents and sync contract before runtime implementation continues.
- If any existing-feature tradeoff appears necessary, stop and request developer approval.

Developer approval boundaries:

- Approval is required before browser command execution, POST fetches, live Git/GitHub/CI/API polling, evidence writing, document editing from the dashboard, merge, push, cleanup, remote deletion, OAuth, token handling, or destructive operations.
- Approval is required before removing or weakening docs-tour, `tools/dashboard docs`, Maintenance Sync evidence, Safety Confirmation, Repository Information, STEP 1-7, STEP 1-14, existing CI, Git hooks, pre-commit, or existing document routes.
- Approval is required before accepting schema-incompatible behavior or any existing-feature tradeoff.

## Implemented Agent Escalated Verification Policy Implementation Plan

SYNC-ID: agent_escalated_verification_policy
STATUS: implemented
ARTIFACTS: AGENTS.MD,docs/workflow/AS_BUILT_SYNC_CONTRACT.tsv
TESTS: tools/check_as_built_sync_contract.sh,tools/check_as_built_docs.sh,tools/check_agents_skills.sh

Implementation completed:

1. Added AGENTS.MD invariant rule 22 for first-attempt escalated execution of known sandbox-incompatible, non-destructive verification.
2. Scoped the rule to Playwright/Chromium real-screen inspection, screenshot capture, browser launch, local port observation, and equivalent observation-only checks.
3. Preserved the existing approval boundary for credentials, OAuth, external writes, dependency changes, repository mutation, push, merge, cleanup, delete, destructive operations, CI failure overrides, and gate weakening.
4. Registered the policy in `AS_BUILT_SYNC_CONTRACT.tsv` so future synchronization checks treat the policy as an implemented contract.
5. Synchronized requirements, specification, implementation plan, task tracker, and handoff so the rule is not only an AGENTS.MD one-off.

Verification plan:

```bash
./tools/check_as_built_sync_contract.sh
./tools/check_as_built_docs.sh
./tools/check_agents_skills.sh
```

Future usage:

- When visual design work requires Playwright evidence, launch the browser with the required execution scope immediately and capture the relevant viewport screenshots before making design conclusions.
- If the escalated command itself fails, report the environment blocker and do not claim the page was visually verified.
- Continue to ask before dangerous or credential-bearing operations; this policy only removes redundant confirmation for non-destructive observation commands that are already required by the active task.

## Implemented Dashboard Control Center Settings Safe Change Implementation Plan

SYNC-ID: dashboard_control_center_settings_safe_change_plan
STATUS: implemented
ARTIFACTS: docs/workflow/AS_BUILT_SYNC_CONTRACT.tsv,docs/workflow/DASHBOARD_DATA_SCHEMA.tsv,docs/workflow/TEST_PLAN_MANIFEST.tsv,docs/workflow/GIT_HOOK_CHECKS.tsv,docs/workflow/FINAL_GATE_COVERAGE.tsv,.github/workflows/ci.yml,.github/workflows/lesson14-ci.yml,tools/lib/dashboard_data.sh,tools/lib/git_workflow_policy.sh,tools/dashboard-data,tools/dashboard-settings,tools/dashboard-control-center,vite.config.mjs,dashboard-control-center/src/App.jsx,dashboard-control-center/src/dashboardData.js,dashboard-control-center/src/i18n.js,dashboard-control-center/src/styles.css,tests/fixtures/dashboard-control-center.json,tests/fixtures/dashboard-control-center-live-update.json,tests/playwright/dashboard-control-center.spec.js,tools/test_dashboard_settings.sh,tools/test_dashboard_schema.sh,tools/test_dashboard_data.sh,tools/test_dashboard_control_center.sh
TESTS: tools/test_dashboard_settings.sh,tools/test_dashboard_schema.sh,tools/test_dashboard_data.sh,tools/test_dashboard_control_center.sh,tools/test_git_workflow_policy.sh,tools/test_lesson.sh,tools/test_lesson14.sh,tools/test_menu_prerequisites.sh,tools/check_as_built_sync_contract.sh,tools/check_as_built_docs.sh,tools/check_test_plan_coverage.sh,tools/check_workflow_pair_sync.sh

Implementation result:

1. Synchronized the implemented contract through the as-built sync contract and the five synchronized documents.
   - Promoted the sync ID to `implemented` after schema, producer, Settings writer, Vite middleware, UI, fixtures, and targeted validation were implemented.
   - Preserved read-only behavior for non-Settings pages and command previews.
2. Define the settings catalog schema.
   - Add generic settings fields to `DASHBOARD_DATA_SCHEMA.tsv`, including status, groups, items, current value, current label, safe source file, allowed values, editability, risk level, confirmation requirement, disabled reason, related page, and update action id.
   - Avoid schema fields tied to a single product stack, language phrase, fixture value, or exact UI sentence.
3. Extend the dashboard data producer.
   - Add reusable catalog builders in `tools/lib/dashboard_data.sh`.
   - Emit `settings` from existing lesson settings, selected context, Git workflow policy/settings, and security approval state.
   - Include settings source files and catalog content in source tracking and content hash generation.
   - Emit `summary.workflow_language`, `summary.display_locale`, and `summary.ui_locale` from the selected workflow display language and include those locale fields in content hash generation.
   - Do not execute Git, GitHub, CI, product-security, product-authority, evidence writers, or settings writers from `tools/dashboard-data`.
4. Implement the Settings write path in this sync ID.
   - Added `tools/dashboard-settings catalog|plan|apply --confirm` as the only writer for editable Settings rows.
   - Reused lesson setting normalization and Git workflow policy validation, rejected arbitrary paths and shell strings, validated output, and wrote through same-directory temporary files plus atomic rename.
   - Regenerated the dashboard snapshot after successful apply and restricted snapshot output to the dashboard runtime directory outside isolated test mode.
   - Kept product or work target naming writes out of scope; they must route through product-profile policy, repository-boundary checks where product-scoped, and a separate approved write contract.
5. Add validation before UI reliance.
   - Extend `dashboard-control-center/src/dashboardData.js` and Vite snapshot validation if needed so malformed settings catalog data fails before rendering.
   - Validate locale summaries when present, including `summary.workflow_language`, `summary.display_locale`, `summary.ui_locale`, and the match between `summary.workflow_language` and the Settings `workflow_language` row.
   - Update fixtures only from producer-owned data, not from manual UI-only objects.
6. Rebuild Settings UI and mutation boundary.
   - Replace narrow card grids with row-based `Settings` groups that render producer-owned settings items.
   - Keep the top section compact so the first settings rows are visible on mobile.
   - Add related-page display to each settings row.
   - Add a large review popup with dialog semantics, focus entry, Tab/Shift+Tab focus trap, close behavior, current value, proposed value, impact, source file, required confirmation, validation state, update preview, plan result, explicit apply confirmation, and apply result.
   - Add Vite `/dashboard-settings/plan` and `/dashboard-settings/apply` endpoints that accept same-origin narrow JSON and call `tools/dashboard-settings` through `execFile` without shell execution.
   - After a successful apply, immediately refetch the regenerated snapshot from React state management so workflow display language changes update Dashboard fixed UI labels without a page reload.
7. Add focused tests and aggregate wiring.
   - Add focused schema, dashboard-data, settings-tool, and browser tests for the Settings catalog and popup, including malformed catalog rejection and legacy or missing catalog safe incomplete behavior.
   - Wire `tools/test_dashboard_settings.sh` into `tools/test_dashboard_control_center.sh` so the new check can run standalone or through the aggregate dashboard test.
   - Add a real Vite middleware integration check for Settings plan/apply, JSON and same-origin guards, CLI JSON response validation, settings-file update behavior, regenerated snapshot content hash, summary locale fields, and the Settings `workflow_language` row.
   - Add Playwright coverage for Settings desktop, mobile no-overflow, row rendering, related-page display, dialog focus behavior, approval-only wording, plan/apply payloads, invalid catalog rejection, and workflow display language apply without page reload.
8. Promote this sync ID to `implemented` only after catalog, update tool, UI, required local checks, sub-agent review, and synchronization checks pass.

Document synchronization policy:

- Requirements record the learner-facing capability, exclusions, and no-tradeoff constraints.
- Specification records the settings catalog contract, UI contract, update boundary, and safety compatibility rules.
- This implementation plan records order, verification, recovery, and approval boundaries.
- Task tracker records current planned state and checklist.
- Handoff records restart context, blocked shortcuts, and future validation expectations.

Verification method:

```bash
./tools/test_dashboard_schema.sh
./tools/test_dashboard_data.sh
./tools/test_dashboard_settings.sh
./tools/test_dashboard_control_center.sh
./tools/test_git_workflow_policy.sh
./tools/test_lesson.sh
./tools/test_lesson14.sh
./tools/test_menu_prerequisites.sh
./tools/test_lesson_repository.sh
./tools/check_as_built_sync_contract.sh
./tools/check_as_built_docs.sh
./tools/check_test_plan_coverage.sh
./tools/check_workflow_pair_sync.sh
```

The settings update tool is implemented in this sync ID; run its standalone test and the aggregate dashboard control-center test.
Because Git workflow settings are writable through Settings, include `./tools/test_git_workflow_policy.sh`.
Because this sync ID touches 7-day and 14-day lesson setting behavior, include `./tools/test_lesson.sh`, `./tools/test_lesson14.sh`, and `./tools/test_menu_prerequisites.sh`.
When React runtime changes are made, run `npm run dashboard:build`, then Playwright visual inspection before developer visual approval and heavier Git/CI closure.

Failure recovery:

- If schema or producer validation fails, fix the schema and producer before changing React rendering.
- If the UI cannot render a needed setting from producer data, extend the settings catalog or show a safe incomplete state; do not invent the value in React.
- If a later update tool writes invalid data, restore from the temporary or backup path, add a regression test, and do not weaken validation.
- If 7-day or 14-day lesson flows regress, revert the settings update surface before changing lesson behavior.
- If pre-commit, aggregate, or CI checks fail, fix the underlying contract or implementation; do not skip or weaken hooks, gates, or required checks.
- If the same failure repeats three times or an existing-feature tradeoff appears necessary, stop and request developer direction.

Developer approval boundaries:

- Approval is required before adding any browser mutation route beyond `/dashboard-settings/plan` and `/dashboard-settings/apply`, browser-triggered tools beyond `tools/dashboard-settings`, evidence writing, live Git/GitHub/CI polling, product-security execution, product-authority execution, dependency changes, non-whitelisted file writes, external repository writes, push, merge, cleanup, deletion, destructive operations, approval-state mutation, or any relaxation of the implemented Settings allowlist.
- Approval is required before changing pre-commit or CI required coverage.
- Approval is required before accepting behavior that would trade off STEP 1-7, STEP 1-14, existing checks, existing document routes, repo-local skills, or security gates.

## Implemented Dashboard Control Center Full Locale UI Support Implementation Plan

SYNC-ID: dashboard_control_center_full_locale_ui_support
STATUS: implemented
ARTIFACTS: docs/workflow/AS_BUILT_SYNC_CONTRACT.tsv,docs/workflow/DASHBOARD_DATA_SCHEMA.tsv,docs/workflow/TEST_PLAN_MANIFEST.tsv,docs/workflow/GIT_HOOK_CHECKS.tsv,docs/workflow/GIT_HOOK_PARALLEL_GROUPS.tsv,docs/workflow/FINAL_GATE_COVERAGE.tsv,.github/workflows/ci.yml,.github/workflows/lesson14-ci.yml,tools/lib/lesson_common.sh,tools/lib/dashboard_data.sh,tools/dashboard-data,tools/dashboard-settings,tools/dashboard-control-center,tools/test_dashboard_i18n.sh,tools/test_dashboard_settings.sh,tools/test_dashboard_schema.sh,tools/test_dashboard_data.sh,tools/test_dashboard_control_center.sh,tools/check_ci_workflow_structure.sh,tools/test_lesson_repository.sh,vite.config.mjs,dashboard-control-center/src/App.jsx,dashboard-control-center/src/dashboardData.js,dashboard-control-center/src/i18n.js,dashboard-control-center/src/styles.css,tests/fixtures/dashboard-control-center.json,tests/fixtures/dashboard-control-center-live-update.json,tests/playwright/dashboard-control-center.spec.js
TESTS: tools/test_dashboard_i18n.sh,tools/test_dashboard_schema.sh,tools/test_dashboard_data.sh,tools/test_dashboard_settings.sh,tools/test_dashboard_control_center.sh,tools/check_ci_workflow_structure.sh,tools/test_git_hooks.sh,tools/test_git_hooks_parallel.sh,tools/test_ci_final_gate.sh,tools/check_as_built_sync_contract.sh,tools/check_as_built_docs.sh,tools/check_test_plan_coverage.sh,tools/check_workflow_pair_sync.sh

Implemented change targets:

- `dashboard-control-center/src/i18n.js`: central locale policy, aliases, direction metadata, full standard dictionaries, resolver, and dictionary completeness exports.
- `dashboard-control-center/src/dashboardData.js`: summary locale and Settings row validation for the full standard locale set.
- `dashboard-control-center/src/App.jsx`: active-locale state after Settings apply success, root `lang` and `dir`, Settings notice, and RTL-safe rendering boundaries.
- `dashboard-control-center/src/styles.css`: CSS logical properties and LTR isolation for technical values where needed.
- `tools/lib/dashboard_data.sh` and `tools/dashboard-data`: canonical UI locale and optional direction fields from the workflow display language, content hash participation, and schema-aligned summary emission.
- `tools/dashboard-settings`: canonical locale metadata in successful apply responses for locale-affecting settings.
- `vite.config.mjs`: validation of apply responses and snapshots without widening the same-origin JSON POST boundary.
- `docs/workflow/DASHBOARD_DATA_SCHEMA.tsv`, fixtures, Playwright tests, and dashboard shell tests: full locale contract and regression coverage.

Implementation result:

1. Keep the current Settings safe-change implementation intact and preserve all same-origin, JSON-only, `execFile`, allowlist, atomic write, and snapshot boundary behavior.
2. Extract or formalize the Dashboard locale policy so producer, Settings writer, React, validators, and tests consume the same standard language set and alias mapping.
3. Expand `summary.ui_locale` schema and validators from `ja|en` to the full standard set. Add or validate direction metadata for `ar`.
4. Add complete fixed-label dictionaries for all standard Dashboard UI locales in the localization layer. Do not add component-level language branches to compensate for missing labels.
5. Update `tools/dashboard-data` so selected workflow display language, canonical display locale, resolved UI locale, direction, and content hash are all produced from the shared policy.
6. Update `tools/dashboard-settings apply` so successful locale-affecting writes return canonical locale metadata. React must update active locale only after this success response.
7. Update React state flow so Settings apply updates fixed UI labels immediately without page reload, then refetches the regenerated snapshot as authoritative data.
8. Add the localized Settings notice that setting changes may take a moment and that the Dashboard updates automatically after successful application.
9. Add RTL support for Arabic at the root and reusable technical-value boundaries, then verify no page uses language-specific layout branches.
10. Added `tools/test_dashboard_i18n.sh` for locale policy and dictionary completeness, then wired it into aggregate dashboard checks and test-plan policy.
11. Update fixtures from producer-owned data and broaden Playwright coverage to representative locales: Japanese, English, one CJK locale such as `zh-CN`, one longer Latin locale such as `de` or `pt-BR`, and Arabic RTL.
12. Run the implementation verification set and obtain sub-agent review before final completion.

Document synchronization policy:

- Requirements describe user-facing language behavior, no-tradeoff constraints, and non-scope.
- Specification defines locale metadata, data fields, Settings apply response, React selection order, RTL/LTR boundaries, and validation behavior.
- This implementation plan records edit order, tests, failure recovery, and approval boundaries.
- Task tracker records the implemented checklist and verification state.
- Handoff records restart context, current implemented behavior, verification state, and continuation boundaries.

Verification method:

```bash
./tools/test_dashboard_i18n.sh
./tools/test_dashboard_schema.sh
./tools/test_dashboard_data.sh
./tools/test_dashboard_settings.sh
./tools/test_dashboard_control_center.sh
npm run dashboard:build
./tools/check_as_built_sync_contract.sh
./tools/check_as_built_docs.sh
./tools/check_test_plan_coverage.sh
./tools/check_workflow_pair_sync.sh
```

Run `./tools/test_lesson.sh`, `./tools/test_lesson14.sh`, and `./tools/test_menu_prerequisites.sh` if implementation changes lesson language normalization, menu prerequisite behavior, or setting-file handling.
Run `./tools/test_lesson_repository.sh` only when the test-plan policy, changed files, or developer-approved final gate requires it.
Use escalated browser execution from the first attempt for Playwright visual inspection when required by the active implementation task.

Failure recovery:

- If dictionary completeness fails, fix the shared localization dictionary or policy before touching component rendering.
- If `summary.workflow_language`, `summary.display_locale`, `summary.ui_locale`, or direction disagree, fix producer and validators before changing React fallback behavior.
- If Settings apply succeeds but the immediate locale update and refetched snapshot disagree, keep the snapshot authoritative and add a regression test for the mismatch.
- If Arabic RTL causes technical values to become unreadable, add reusable LTR isolation or logical CSS utilities rather than language-specific page branches.
- If regular CI time grows too much, reduce routine browser locale coverage to representative locales and keep all-language checks static; do not remove dictionary completeness coverage.
- If the same failure repeats three times, a specification conflict appears, or an existing-feature tradeoff seems necessary, stop and request developer direction.

Developer approval boundaries:

- Approval is required before using runtime machine translation, external translation APIs, dependency changes, new browser mutation routes, any Settings writer beyond `tools/dashboard-settings`, any mutation outside allowlisted Settings rows, or any relaxation of schema, same-origin, JSON-only, `execFile`, atomic write, or snapshot-output boundaries.
- Approval is required before changing required CI, pre-commit, final-gate, or aggregate-test coverage in a way that reduces protection.
- Approval is required before accepting unsupported custom languages as Dashboard fixed UI locales or changing the standard language list beyond the AGENTS.MD invariant.
- Approval is required before accepting any tradeoff against STEP 1-7, STEP 1-14, existing docs routes, existing checks, repo-local skills, or security gates.

## Implemented Dashboard Control Center Settings Apply Feedback Implementation Plan

SYNC-ID: dashboard_control_center_settings_apply_feedback
STATUS: implemented
ARTIFACTS: docs/workflow/AS_BUILT_SYNC_CONTRACT.tsv,dashboard-control-center/src/App.jsx,dashboard-control-center/src/i18n.js,dashboard-control-center/src/styles.css,tests/playwright/dashboard-control-center.spec.js,tools/test_dashboard_i18n.sh,tools/test_dashboard_settings.sh,tools/test_dashboard_control_center.sh
TESTS: tools/test_dashboard_i18n.sh,tools/test_dashboard_settings.sh,tools/test_dashboard_control_center.sh,tools/check_ci_workflow_structure.sh,tools/check_as_built_sync_contract.sh,tools/check_as_built_docs.sh,tools/check_test_plan_coverage.sh,tools/check_workflow_pair_sync.sh

Implemented change targets:

- `dashboard-control-center/src/App.jsx`: independent Settings apply feedback state, request ids, delayed non-modal status surface, generic Settings row reconciliation, strict `workflow_language` locale reconciliation, snapshot-authoritative mismatch handling, row action labels, and confirmation dialog close-on-success behavior.
- `dashboard-control-center/src/i18n.js`: localized apply-feedback labels, warnings, step labels, and dismiss labels across every standard Dashboard UI locale.
- `dashboard-control-center/src/styles.css`: status-surface layout, indeterminate progress animation with reduced-motion support, wrapping-safe right-end action labels, mobile handling, and separated eyebrow/status label font rules.
- `tests/playwright/dashboard-control-center.spec.js`: behavior coverage for fast path, delayed path, stale snapshot mismatch, no reload, chip removal, action labels, eyebrow size, RTL, and no-overflow.
- Existing `tools/test_dashboard_i18n.sh`, `tools/test_dashboard_settings.sh`, and `tools/test_dashboard_control_center.sh`: remain the reusable standalone and aggregate-capable verification entry points.

Implementation result:

1. Synchronized this contract through the sync contract and the five synchronized documents before runtime changes.
2. Added independent apply-feedback state in `App.jsx` without changing writer endpoints, settings files, producer authority, schema, or mutation scope.
3. Kept writer apply progress in the existing confirmation dialog, then closes that dialog after writer success and runs delayed snapshot reconciliation outside the focus trap.
4. Added named UI-policy timing constants for delayed feedback, auto-close, and timeout.
5. Implemented generic Settings row reconciliation and stricter `workflow_language` summary plus row reconciliation.
6. Kept apply-response locale metadata as immediate UI feedback after server success only; refetched snapshot data clears optimistic locale hints and remains authoritative on mismatch.
7. Removed row changeability chips and moved editable/review labels to the right-end action area and row accessible name.
8. Split modal eyebrow styling from status labels and made only the eyebrow text slightly larger.
9. Added all new fixed labels to every standard Dashboard UI locale and validated dictionary completeness.
10. Extended Playwright coverage through the aggregate dashboard test without adding a new standalone checker.
11. Ran the planned verification set before promoting this sync ID to implemented.

Document synchronization policy:

- Requirements state the user-visible feedback behavior, no-tradeoff constraints, non-scope, and approval boundaries.
- Specification defines the feedback state machine, reconciliation rules, accessibility behavior, row label behavior, and verification contract.
- This implementation plan records edit order, verification commands, recovery behavior, and approval boundaries.
- Task tracker records current implementation state, final verification state, and close-out checklist.
- Handoff records restart context, implemented entry points, known risks, and stop conditions.

Verification method:

```bash
./tools/test_dashboard_i18n.sh
./tools/test_dashboard_settings.sh
./tools/test_dashboard_control_center.sh
./tools/check_ci_workflow_structure.sh
./tools/check_as_built_sync_contract.sh
./tools/check_as_built_docs.sh
./tools/check_test_plan_coverage.sh
./tools/check_workflow_pair_sync.sh
```

`npm run dashboard:build` was run after React, CSS, and i18n runtime changes.
Run broader lesson or repository aggregate checks only when the implementation touches shared lesson settings, producer behavior, CI or hook wiring, schema files, or the final-gate scope requires them.

Failure recovery:

- If apply fails before the writer returns success, keep the existing confirmation dialog error path and do not show saved or reconciliation progress.
- If snapshot refetch fails after writer success, show that the setting was saved but Dashboard reflection confirmation failed or is still pending.
- If a stale snapshot is fetched, continue waiting or time out safely; do not mark reflection complete from stale data.
- If the snapshot conflicts with apply metadata, snapshot data wins and the feedback surface shows a mismatch warning.
- If row-label layout fails for long translated text, fix responsive layout and wrapping rules rather than adding language-specific branches.
- If the same verification failure repeats three times, or a writer, endpoint, schema, CI, pre-commit, or existing-feature tradeoff appears necessary, stop and request developer direction.

Developer approval boundaries:

- Approval is required before adding mutation endpoints, adding writers beyond `tools/dashboard-settings`, expanding Settings mutation scope, changing snapshot schema, adding dependencies, weakening CI or pre-commit coverage, or changing existing editable Settings behavior.
- Approval is required before reducing currently implemented Settings editability, including any proposal to make existing safe Git workflow settings display-only.
- Approval is required before replacing snapshot authority with apply-response authority or keeping an optimistic locale after snapshot disagreement.

## Implemented Dashboard Control Center Settings Consistency Gate Implementation Plan

SYNC-ID: dashboard_control_center_settings_consistency_gate
STATUS: implemented
ARTIFACTS: docs/workflow/AS_BUILT_SYNC_CONTRACT.tsv,docs/workflow/DASHBOARD_DATA_SCHEMA.tsv,docs/workflow/TEST_PLAN_MANIFEST.tsv,tools/lib/git_workflow_policy.sh,tools/git-workflow,tools/dashboard-settings,tools/lib/dashboard_data.sh,tools/dashboard-data,dashboard-control-center/src/App.jsx,dashboard-control-center/src/dashboardData.js,dashboard-control-center/src/i18n.js,dashboard-control-center/src/styles.css,tests/fixtures/dashboard-control-center.json,tests/fixtures/dashboard-control-center-live-update.json,tests/playwright/dashboard-control-center.spec.js,tools/test_git_workflow_policy.sh,tools/test_dashboard_i18n.sh,tools/test_dashboard_settings.sh,tools/test_dashboard_schema.sh,tools/test_dashboard_data.sh,tools/test_dashboard_control_center.sh
TESTS: tools/test_git_workflow_policy.sh,tools/test_dashboard_settings.sh,tools/test_dashboard_schema.sh,tools/test_dashboard_data.sh,tools/test_dashboard_i18n.sh,tools/test_dashboard_control_center.sh,tools/check_as_built_sync_contract.sh,tools/check_as_built_docs.sh,tools/check_test_plan_coverage.sh,tools/check_workflow_pair_sync.sh

Implemented change targets:

- `tools/lib/git_workflow_policy.sh`: reusable full-state candidate validator and reason-code vocabulary for Git workflow settings.
- `tools/git-workflow`: route command-line setting updates through the same validator.
- `tools/dashboard-settings`: validate Settings `plan` and `apply` against the candidate full state before writing; keep allowlist, confirmation, atomic write, and snapshot regeneration behavior.
- `tools/lib/dashboard_data.sh` and `tools/dashboard-data`: emit consistency status, effective mode, reason, next action, and context-dependent `not_applicable` data from owner-layer sources.
- `docs/workflow/DASHBOARD_DATA_SCHEMA.tsv` and browser validators: describe and enforce the generic consistency status fields.
- `dashboard-control-center/src/App.jsx`, `dashboardData.js`, `i18n.js`, and `styles.css`: render producer-owned consistency state, blocked candidate feedback, aligned columns, translated labels, and no-overflow layout without policy branching in React.
- Fixtures and tests: cover validator, writer, schema, data, i18n, and browser behavior through existing standalone and aggregate-capable commands.

Implementation order:

1. Keep this sync ID in the five synchronized documents and sync contract before runtime edits.
2. Add the reusable candidate full-state validator in `tools/lib/git_workflow_policy.sh`.
   - Return structured severities and reason codes rather than free-form strings only.
   - Cover no-write-path, branch-dependent automation, worktree-without-branch, approval-gated automation, non-ready merge-precedence display, and compatibility warnings.
   - Preserve current `automation_level` compatibility and do not change merge precedence without approval.
3. Connect `tools/git-workflow set` to the shared validator so CLI and Dashboard writes cannot diverge.
4. Connect `tools/dashboard-settings plan|apply` to the validator.
   - Validate the post-change candidate state.
   - Reject unsafe or impossible candidate states before file writes, including branch-dependent automation with `branch_allowed=false`.
   - Return structured policy rejection JSON with `applied:false` for candidate validation failures so browser feedback remains machine-readable without changing Vite error forwarding.
   - Permit writes that repair an inconsistent current file.
5. Extend dashboard data production.
   - Add generic consistency fields to settings rows and summary surfaces.
   - Add `not_applicable` to the shared schema, producer, and browser vocabulary or introduce a generic applicability field before emitting context-dependent not-applicable rows.
   - Emit context-specific `not_applicable` or blocked states for product repository, lesson repository improvement, external integration, and learner approval source gaps.
   - Keep locale and product-development language behavior separated through the existing locale policy.
6. Update browser validation and UI.
   - Validate new fields before rendering.
   - Render status, reason, and next action from producer data.
   - Keep Settings row columns aligned across desktop, narrow desktop, mobile, and RTL.
   - Preserve no-reload language switching and delayed apply-feedback reconciliation.
7. Update focused tests and aggregate wiring.
   - Extend existing tests instead of adding a new standalone checker unless a new reusable command is introduced.
   - Keep assertions based on reason codes, roles, status keys, and schema fields rather than one exact phrase.
8. Keep this sync ID at `implemented` only after runtime implementation, targeted checks, required aggregate checks, and sub-agent review pass with no unresolved major findings.

Implementation result:

- `tools/lib/git_workflow_policy.sh` now owns the candidate full-state consistency gate, including no-write-path, worktree-without-branch, branch-dependent automation, merge manual/auto-merge display warning, and recovery-write handling for persisted inconsistent settings.
- `tools/git-workflow allow` now rejects runtime action permission while the persisted Git workflow state has blocking consistency rows, so writer validation and runtime authorization share the same owner-layer safety boundary.
- `tools/dashboard-settings plan|apply` returns structured blocked policy JSON with `applied:false` and no snapshot regeneration for ordinary policy rejections while preserving non-zero failures for malformed or boundary-violating requests.
- `tools/dashboard-data` and `tools/lib/dashboard_data.sh` emit producer-owned row-level consistency metadata, effective modes, context-dependent `not_applicable` states, and learner-approval source separation.
- The browser validator and Settings UI accept the shared consistency schema, render blocked/manual-required/not-applicable states without becoming the policy source, preserve no-reload locale switching, and keep Settings rows aligned across representative locales.
- Existing Settings writer allowlists, same-origin POST handling, atomic writes, snapshot regeneration, STEP 1-7, STEP 1-14, CI wiring, Git hooks, pre-commit wiring, and document routes remain additive constraints.

Document synchronization policy:

- Requirements record the user-visible safety goal, no-tradeoff constraints, required outcomes, and non-scope.
- Specification records consistency severity, validator ownership, Git workflow rules, data contract, UI contract, and verification contract.
- This implementation plan records edit targets, order, validation, failure recovery, and approval boundaries.
- Task tracker records implemented work state and verification progress.
- Handoff records restart context, stop conditions, and the decisions that remain approval-bound.

Verification method:

```bash
./tools/test_git_workflow_policy.sh
./tools/test_dashboard_settings.sh
./tools/test_dashboard_schema.sh
./tools/test_dashboard_data.sh
./tools/test_dashboard_i18n.sh
./tools/test_dashboard_control_center.sh
./tools/check_as_built_sync_contract.sh
./tools/check_as_built_docs.sh
./tools/check_test_plan_coverage.sh
./tools/check_workflow_pair_sync.sh
```

Run `npm run dashboard:build` after React, Vite, or CSS runtime changes.
Run `./tools/check_lesson_structure.sh` and `./tools/check_lesson14_structure.sh` as related structure checks when promoting the sync state, while keeping the sync-contract required test list aligned with active CI wiring.
Run `tools/test_lesson_repository.sh` only when changed-file policy, final-gate scope, or developer approval requires the heavier aggregate check.

Final verification evidence:

- `tools/test_lesson_repository.sh` passed after runtime and documentation updates, covering STEP 1-7, STEP 1-14, Dashboard, Git/CI, product gate, and security guard paths.
- `tools/test_dashboard_control_center.sh` passed after the final blocked apply-feedback correction with 15 Playwright tests.
- `npm run dashboard:build` passed after React, i18n, Vite, and CSS changes.
- Multiple read-only xhigh sub-agent reviews found no unresolved major findings after the owner-layer runtime allow gate, UI/data/schema/i18n corrections, and sync-contract TESTS correction.

Failure recovery:

- If the shared validator disagrees between CLI and Settings, stop and fix the owner-layer validator before adjusting React.
- If a persisted settings file is already invalid, add a recovery fixture and ensure the proposed valid candidate can be applied.
- If Dashboard data and Settings writer disagree on severity or reason codes, treat producer/writer consistency as the bug; do not patch the browser to hide the mismatch.
- If a status label or reason overflows, fix reusable layout constraints or translations rather than adding language-specific branches.
- If three repeated failures occur, a specification conflict appears, or an existing-feature tradeoff seems necessary, stop and request developer direction.

Developer approval boundaries:

- Approval is required before changing `automation_level` from compatibility preset or summary into a hard maximum.
- Approval is required before defining detached-worktree behavior when `worktree_allowed=true` and `branch_allowed=false`.
- Approval is required before changing the runtime precedence between `merge_execution=manual` and `developer_auto_merge_allowed=true`; without approval, implementation may only change Dashboard display to a qualified non-ready state.
- Approval is required before changing approval receipt security semantics such as HEAD-SHA binding, expiry, or source authority.
- Approval is required before reducing existing Settings editability, weakening CI/pre-commit coverage, adding dependencies, adding mutation endpoints, adding writers, broadening mutation scope, or accepting any tradeoff against STEP 1-7, STEP 1-14, existing checks, document routes, repo-local skills, or security gates.

## Implemented Product Workflow Git Usage Modes Implementation Plan

SYNC-ID: product_workflow_git_usage_modes
STATUS: implemented
ARTIFACTS: docs/workflow/AS_BUILT_SYNC_CONTRACT.tsv,docs/workflow/DASHBOARD_DATA_SCHEMA.tsv,docs/workflow/PRODUCT_GATE_EVIDENCE_SCHEMA.tsv,docs/workflow/MENU_PRODUCT_PROFILE_POLICY.tsv,docs/workflow/PRODUCT_WORKFLOW_GIT_USAGE_POLICY.tsv,docs/workflow/TEST_PLAN_MANIFEST.tsv,docs/workflow/GIT_HOOK_CHECKS.tsv,docs/workflow/GIT_HOOK_PARALLEL_GROUPS.tsv,docs/workflow/FINAL_GATE_COVERAGE.tsv,learning/PRODUCT_WORKFLOW_GIT_USAGE_SETTINGS.tsv,learning/context/WORKFLOW_CONTEXT_MAP.tsv,.github/workflows/ci.yml,.github/workflows/lesson14-ci.yml,tools/lib/product_workflow_git_usage.sh,tools/free-development,tools/product-improvement,tools/external-integration,tools/check_repository_boundary.sh,tools/product-scaffold-check,tools/lib/product_security.sh,tools/product-security,tools/lib/product_repository_authority.sh,tools/product-repository-authority,tools/dashboard-data,tools/dashboard-settings,tools/lib/dashboard_data.sh,dashboard-control-center/src/App.jsx,dashboard-control-center/src/dashboardData.js,dashboard-control-center/src/i18n.js,dashboard-control-center/src/styles.css,vite.config.mjs,tests/fixtures/dashboard-control-center.json,tests/fixtures/dashboard-control-center-live-update.json,tools/test_product_git_usage_modes.sh,tools/test_dashboard_schema.sh,tools/test_dashboard_data.sh,tools/test_dashboard_settings.sh,tools/test_dashboard_control_center.sh,tools/check_ci_workflow_structure.sh
TESTS: tools/test_product_git_usage_modes.sh,tools/test_product_gate_tools.sh,tools/test_product_scaffold_check.sh,tools/test_product_security.sh,tools/test_product_repository_authority.sh,tools/test_dashboard_schema.sh,tools/test_dashboard_data.sh,tools/test_dashboard_settings.sh,tools/test_dashboard_i18n.sh,tools/test_dashboard_control_center.sh,tools/check_ci_workflow_structure.sh,tools/check_as_built_sync_contract.sh,tools/check_as_built_docs.sh,tools/check_test_plan_coverage.sh,tools/check_workflow_pair_sync.sh,tools/check_lesson_structure.sh

Implemented change targets:

- `docs/workflow/PRODUCT_WORKFLOW_GIT_USAGE_POLICY.tsv` and `learning/PRODUCT_WORKFLOW_GIT_USAGE_SETTINGS.tsv` define Git usage applicability separately from existing Git workflow action settings.
- `tools/lib/product_workflow_git_usage.sh` resolves `none`, `local`, `remote_sync`, and `ci` to product workspace, Git worktree, remote sync, CI, and dashboard applicability requirements.
- `tools/free-development`, `tools/product-improvement`, and `tools/external-integration` gates call the shared helper instead of hard-coding Git sync and CI checks.
- Repository-boundary, product-scaffold, product-security, product authority, and product-gate evidence handling distinguish product workspace checks from Git worktree checks.
- Dashboard data, schema, browser validation, Settings writer, Settings UI labels, command previews, fixtures, and tests render producer-owned Git/CI applicability.
- `tools/test_product_git_usage_modes.sh` is a standalone and aggregate-capable test for the product workflow Git usage mode matrix.

Implementation result:

1. Added the owner-layer policy, settings file, and helper first, with default mode `ci` preserving the existing strict behavior when no explicit setting exists.
2. Added persisted and candidate product workflow mode validation before Settings writes. Invalid modes fail before any file update.
3. Replaced repeated Git/CI gate calls in the three product-scoped menu tools with shared helper gates.
4. Split product workspace and Git worktree assumptions in boundary, scaffold, security, and authority code without making `none` bypass documents, scaffold, security, approvals, or local checks.
5. Kept `.git`-less authoritative evidence storage out of scope. Non-Git and non-CI evidence is represented as `not_applicable` until a future approved evidence-storage design exists.
6. Extended `DASHBOARD_DATA_SCHEMA.tsv`, producer output, browser validation, Settings catalog, Settings writer, localization, and fixtures together so React remains a renderer.
7. Updated command previews and manual follow-ups so required Git/CI commands appear only when the mode requires them.
8. Added the mode-matrix test and connected it to aggregate repository checks, CI workflow structure, Git hook metadata, final-gate coverage, and test-plan policy.
9. Promoted the sync ID from `planned` to `implemented` after targeted checks passed and before final aggregate closure.

Document synchronization policy:

- Requirements record user-facing mode behavior, no-tradeoff guarantees, and non-scope.
- Specification records mode semantics, owner-layer data, gate behavior, Settings/UI behavior, evidence boundaries, and verification contract.
- This implementation plan records implemented targets, validation, recovery, and approval boundaries.
- Task tracker records final implementation state and verification checklist.
- Handoff records restart context, active constraints, verification state, and stop conditions.

Verification method:

```bash
./tools/test_product_git_usage_modes.sh
./tools/test_product_gate_tools.sh
./tools/test_product_scaffold_check.sh
./tools/test_product_security.sh
./tools/test_product_repository_authority.sh
./tools/test_dashboard_schema.sh
./tools/test_dashboard_data.sh
./tools/test_dashboard_settings.sh
./tools/test_dashboard_i18n.sh
./tools/test_dashboard_control_center.sh
./tools/check_ci_workflow_structure.sh
./tools/check_as_built_sync_contract.sh
./tools/check_as_built_docs.sh
./tools/check_test_plan_coverage.sh
./tools/check_workflow_pair_sync.sh
./tools/check_lesson_structure.sh
./tools/check_lesson14_structure.sh
./tools/test_lesson_repository.sh
```

The standalone product workflow Git usage mode test is implemented and wired into the aggregate repository test. The full aggregate repository test is the final closure check for this sync ID.

Failure recovery:

- If `ci` mode behavior changes, stop and restore current strict behavior before continuing.
- If `none` appears to pass by bypassing documents, scaffold, security, approval, or local checks, treat that as a safety regression.
- If Dashboard data and gate behavior disagree, fix the shared owner-layer helper before changing React.
- If `.git`-less evidence storage cannot be made authoritative without a new security decision, stop and request developer approval.
- If the same failure repeats three times, a specification conflict appears, or an existing-feature tradeoff seems necessary, stop and request developer direction.

Developer approval boundaries:

- Approval is required for the `.git`-less evidence index path, freshness model, and `product_head` replacement.
- Approval is required before changing STEP 1-7, STEP 1-14, existing strict Git/CI completion gates, CI/pre-commit coverage, repo-local skill behavior, or product-security guarantees.
- Approval is required before adding dependencies, external services, browser mutation routes, writers beyond `tools/dashboard-settings`, evidence writers, Git/GitHub/CI execution from the dashboard, product repository mutation, push, merge, cleanup, deletion, OAuth, credentials, or destructive operations.
- Approval is required before accepting unsupported product workflow modes beyond `none`, `local`, `remote_sync`, and `ci`.

## Implemented Repository Development Workflow Workflow Skill Implementation Plan

SYNC-ID: repository_development_workflow_skill
STATUS: implemented
ARTIFACTS: AGENTS.MD,docs/workflow/AS_BUILT_SYNC_CONTRACT.tsv,docs/workflow/REPOSITORY_DEVELOPMENT_WORKFLOW.tsv,docs/workflow/GIT_HOOK_CHECKS.tsv,docs/workflow/GIT_HOOK_PARALLEL_GROUPS.tsv,docs/workflow/TEST_PLAN_MANIFEST.tsv,docs/workflow/FINAL_GATE_GAP_COMMANDS.tsv,docs/workflow/FINAL_GATE_COVERAGE.tsv,learning/REPOSITORY_DEVELOPMENT_APPROVALS.tsv,skills/repository-development-workflow/SKILL.md,skills/repository-development-workflow/references/repository-development.md,skills/repository-development-workflow/agents/openai.yaml,tools/lib/repository_development_workflow.sh,tools/repository-development-workflow,tools/check_repository_development_workflow.sh,tools/test_repository_development_workflow.sh,tools/check_agents_skills.sh,tools/test_lesson_repository.sh,tools/check_ci_workflow_structure.sh,.github/workflows/ci.yml,.github/workflows/lesson14-ci.yml
TESTS: tools/check_repository_development_workflow.sh,tools/test_repository_development_workflow.sh

This implemented plan records the runtime workflow support for repository development workflow. The implementation is additive: AGENTS.MD remains the highest-priority rule source, the policy TSV is the owner layer for phase data, and release proof stays separate from fast implementation loops.

Implemented order:

1. Added `docs/workflow/REPOSITORY_DEVELOPMENT_WORKFLOW.tsv` with stable phase ids for `context_triage`, `proposal`, `implementation_plan`, `fast_loop`, `mid_tests`, `release_gate`, and `main_sync_cleanup`, including recommended checks, required checks, approvals, Git/CI expectations, cleanup behavior, and stop conditions.
2. Added `learning/REPOSITORY_DEVELOPMENT_APPROVALS.tsv` so approval-bound workflow phases have explicit default state.
3. Added `skills/repository-development-workflow/SKILL.md`, `skills/repository-development-workflow/references/repository-development.md`, and `skills/repository-development-workflow/agents/openai.yaml`, with concise skill routing and detailed reference guidance.
4. Added `tools/lib/repository_development_workflow.sh` and `tools/repository-development-workflow` with `status`, `plan`, `check`, `gate`, `guidance`, and `list` commands backed by the TSV owner layer.
5. Added `tools/check_repository_development_workflow.sh` and `tools/test_repository_development_workflow.sh` covering malformed policy rows, missing wiring, missing PR/main CI and local/remote sync requirements, weakened AGENTS invariants, fast-loop versus release-gate separation, and cleanup-plan safety.
6. Wired the new check and test into `tools/check_agents_skills.sh`, `docs/workflow/GIT_HOOK_CHECKS.tsv`, `docs/workflow/GIT_HOOK_PARALLEL_GROUPS.tsv`, `docs/workflow/TEST_PLAN_MANIFEST.tsv`, `docs/workflow/FINAL_GATE_COVERAGE.tsv`, `tools/test_lesson_repository.sh`, `tools/check_ci_workflow_structure.sh`, `.github/workflows/ci.yml`, and `.github/workflows/lesson14-ci.yml`.
7. Added the minimal AGENTS.MD route needed for repository-local skill discovery while preserving the no-tradeoff invariant and existing repo-local skill routing.
8. Promoted the sync ID from `planned` to `implemented` after the runtime implementation and focused checks were in place.

Document synchronization policy:

- Requirements record the capability, safety constraints, ownership boundaries, and non-scope.
- Specification records the policy TSV contract, CLI behavior, validation semantics, phase behavior, verification contract, and approval boundaries.
- This implementation plan records file order, wiring order, verification sequence, failure recovery, and promotion conditions.
- Task tracker records current work state and pending closure tasks.
- Handoff records restart context, next safe action, dirty-worktree cautions, and stop conditions.

Verification sequence:

```bash
bash -n tools/lib/repository_development_workflow.sh tools/repository-development-workflow tools/check_repository_development_workflow.sh tools/test_repository_development_workflow.sh
./tools/check_repository_development_workflow.sh
./tools/test_repository_development_workflow.sh
./tools/check_agents_skills.sh
./tools/check_test_plan_coverage.sh
./tools/test_test_plan.sh
./tools/test_git_hooks.sh
./tools/test_git_hooks_parallel.sh
./tools/check_ci_workflow_structure.sh
./tools/check_as_built_sync_contract.sh
./tools/check_as_built_docs.sh
./tools/check_workflow_pair_sync.sh
./tools/check_lesson_structure.sh
./tools/check_lesson14_structure.sh
./tools/test_lesson_repository.sh
```

PR CI, merge, main CI, local/remote sync, and cleanup are closure-phase actions. They must not be forced during fast implementation loops unless the developer explicitly requests that phase.

Failure recovery:

- If policy TSV parsing disagrees between CLI, checks, hooks, aggregate, and CI, fix the shared owner layer before adjusting callers.
- If the workflow recommends fewer required release checks than the existing gates, treat it as a blocker rather than a time optimization.
- If cleanup guidance can delete state without explicit approval, remove the executable path and keep only an approval-bound cleanup plan.
- If the new skill conflicts with `worklog-doc-sync`, `lesson-sync-gate`, AGENTS.MD, existing document routes, STEP 1-7, STEP 1-14, CI, or security gates, stop and request developer approval.
- If the same failure repeats three times, or if a specification conflict or existing-feature tradeoff appears necessary, stop and report the blocker.

Developer approval boundaries:

- Approval is required before editing AGENTS.MD, pre-commit, CI, final-gate coverage, branch/worktree deletion, remote deletion, product-repository deletion, push, merge, main CI waiting, local/remote sync, or any destructive operation.
- Approval is required before weakening existing gates, removing required checks, changing STEP 1-7 or STEP 1-14 behavior, changing repo-local skill ownership, or accepting an existing-feature tradeoff.

## Repository Development Workflow Runner Implementation Plan

SYNC-ID: repository_development_workflow_runner
STATUS: implemented
ARTIFACTS: .gitignore,docs/workflow/AS_BUILT_SYNC_CONTRACT.tsv,docs/workflow/REPOSITORY_DEVELOPMENT_WORKFLOW.tsv,docs/workflow/REPOSITORY_DEVELOPMENT_RUNNER_POLICY.tsv,docs/workflow/TEST_PLAN_MANIFEST.tsv,learning/REPOSITORY_DEVELOPMENT_APPROVALS.tsv,skills/repository-development-workflow/SKILL.md,skills/repository-development-workflow/references/repository-development.md,tools/lib/repository_development_workflow.sh,tools/lib/repository_development_runner.sh,tools/repository-development-workflow,tools/check_repository_development_workflow.sh,tools/test_repository_development_workflow.sh,docs/as-built/IMPLEMENTATION_PLAN.md,docs/workflow/TASK_TRACKER.md,docs/workflow/HANDOFF.md
TESTS: tools/check_repository_development_workflow.sh,tools/test_repository_development_workflow.sh,tools/check_test_plan_coverage.sh,tools/test_test_plan.sh,tools/check_as_built_sync_contract.sh,tools/check_as_built_docs.sh,tools/check_workflow_pair_sync.sh

This implementation upgrades `repository-development-workflow` from guidance-only policy support to an approval-bound runner.
Runtime runner files and command behavior are implemented for local non-destructive checks; push, merge, CI monitoring, main sync, and cleanup execution remain outside this implementation.

Implemented change targets:

1. Add runner policy data.
   - Extend existing workflow policy only when the field belongs to every phase.
   - Added `docs/workflow/REPOSITORY_DEVELOPMENT_RUNNER_POLICY.tsv` so runner-specific execution, reuse, approval, and release-proof policy does not overload the phase TSV.

2. Add runner helper ownership.
   - Added `tools/lib/repository_development_runner.sh` as the runner owner layer.
   - Keep existing `tools/lib/repository_development_workflow.sh` as the phase-policy owner.
   - Consume existing check ids from `docs/workflow/REPOSITORY_DEVELOPMENT_WORKFLOW.tsv`, `docs/workflow/GIT_HOOK_CHECKS.tsv`, and test-plan policy rather than hard-coding command lists.

3. Extend the CLI.
   - Added `detect`, `plan-run`, `run`, `record`, `next`, and `status --runs` to `tools/repository-development-workflow`.
   - Keep current `status`, `plan`, `check`, `gate`, `guidance`, and `list` behavior backward-compatible.
   - Make dry-run the default for execution planning.

4. Add local runner records.
   - Uses `.repository-development-runs/` as a local ignored record directory.
   - Record phase, check id, command, result, timestamps, HEAD, policy fingerprint, input fingerprint, and working-tree summary.
   - Never store secrets, tokens, private messages, or raw untrusted external text in records.

5. Implement conservative reuse.
   - Permit reuse only for fast and mid-test phases when HEAD, command identity, policy fingerprint, input fingerprint, and previous PASS all match.
   - Reject reuse on dirty unowned changes, unknown inputs, changed policy, changed command, missing record fields, or release-gate proof.

6. Implement execution and approval gates.
   - Allow non-destructive local checks for `fast_loop` and `mid_tests` after the relevant implementation approval.
   - Keep `release_gate` and `main_sync_cleanup` approval-bound.
   - Treat push, PR creation, PR CI monitoring, merge, main CI waiting, sync, and cleanup execution as explicit approval scopes.

7. Extend validation.
   - Updated `tools/check_repository_development_workflow.sh` for runner files, policy rows, no destructive guidance, and test-plan wiring.
   - Updated `tools/test_repository_development_workflow.sh` for dry-run planning, check selection, record schema, reuse allow/reject cases, release-gate non-reuse, and approval-bound closure behavior.
   - Kept runner regression coverage inside the existing standalone and aggregate-callable repository development workflow test.

8. Update skill guidance.
   - Extended `skills/repository-development-workflow/SKILL.md` and its reference to tell agents when to use `plan-run`, when to execute, when to stop, and when to request approval.
   - Keep `worklog-doc-sync` and `lesson-sync-gate` ownership unchanged.

9. Promote after implementation.
   - Replaced the planned contract artifact/test list with runtime artifacts and required tests.
   - Promoted `STATUS` to `implemented` after targeted runner tests and synchronization checks.

Document synchronization policy:

- Requirements define the user-visible capability and non-negotiable safety boundaries.
- Specification defines command, record, phase, safety, and verification contracts.
- This implementation plan defines implementation order, validation, recovery, approval boundaries, and promotion conditions.
- Task tracker records current state and pending runtime work.
- Handoff records restart context and next safe action.

Verification:

```bash
bash -n tools/lib/repository_development_workflow.sh tools/lib/repository_development_runner.sh tools/repository-development-workflow tools/check_repository_development_workflow.sh tools/test_repository_development_workflow.sh
./tools/check_repository_development_workflow.sh
./tools/test_repository_development_workflow.sh
./tools/check_test_plan_coverage.sh
./tools/test_test_plan.sh
./tools/check_as_built_sync_contract.sh
./tools/check_as_built_docs.sh
./tools/check_workflow_pair_sync.sh
./tools/test_git_hooks.sh
./tools/test_git_hooks_parallel.sh
./tools/check_ci_workflow_structure.sh
./tools/test_lesson_repository.sh
```

Failure recovery:

- If runner policy conflicts with existing phase policy, keep the phase policy authoritative and revise the runner policy.
- If record reuse cannot be proven safe, disable reuse and run the check.
- If the runner weakens release proof, remove the shortcut and restore existing aggregate/full/CI obligations.
- If execution gating becomes ambiguous, default to dry-run and request developer approval.
- If repeated failures, specification conflict, or existing-feature tradeoff appears, stop and request developer direction.

Developer approval boundaries:

- Approval is required before adding or changing Git/CI/pre-commit/final-gate behavior.
- Approval is required before allowing the runner to perform push, PR creation, CI monitoring, merge, main CI waiting, local/remote sync, branch deletion, worktree deletion, remote deletion, product-repository deletion, cleanup execution, or any destructive operation.

## Implemented Product Development Workflow Skill And Alias Implementation Plan

SYNC-ID: product_development_workflow_skill_aliases
STATUS: implemented
ARTIFACTS: AGENTS.MD,docs/workflow/AS_BUILT_SYNC_CONTRACT.tsv,docs/workflow/TEST_PLAN_MANIFEST.tsv,skills/SKILL_ALIASES.tsv,skills/product-development-workflow/SKILL.md,skills/product-development-workflow/references/product-development.md,skills/product-development-workflow/agents/openai.yaml,tools/menu,tools/check_agents_skills.sh,tools/test_menu_prerequisites.sh,tools/test_dashboard_settings.sh,dashboard-control-center/src/App.jsx,dashboard-control-center/src/i18n.js,dashboard-control-center/src/styles.css,tests/playwright/dashboard-control-center.spec.js,tools/test_dashboard_control_center.sh
TESTS: tools/check_agents_skills.sh,tools/test_menu_prerequisites.sh,tools/test_dashboard_settings.sh,tools/test_dashboard_control_center.sh,tools/check_as_built_sync_contract.sh,tools/check_as_built_docs.sh,tools/check_test_plan_coverage.sh,tools/check_workflow_pair_sync.sh

This implemented plan adds Settings-aware external product workflow guidance and short skill discovery without changing existing product Git usage semantics or repository-development workflow ownership.

Implemented order:

1. Added the `product-development-workflow` skill directory, detailed reference, and agent metadata.
2. Added `skills/SKILL_ALIASES.tsv` as the alias source of truth.
3. Updated `tools/menu` with `skills` and `skill-aliases` display commands.
4. Updated `tools/check_agents_skills.sh` to validate the new skill, reference, AGENTS routing, and alias targets.
5. Updated `tools/test_menu_prerequisites.sh` to validate skill and alias display output.
6. Updated AGENTS routing so Free Development, Product Improvement, and External Integration use product workflow guidance while Lesson Repository Improvement routes to repository workflow guidance.
7. Updated Settings display helpers so only Git workflow action-mode settings use `Prohibited`/`Ask each time`/`Auto` or `禁止`/`都度確認`/`自動` labels.
8. Kept boolean permission rows, including Developer auto-merge, on `Allowed`/`Not allowed` labels so displayed choices match writer-accepted values.
9. Added the Settings confirmation note for automatic workflow action values.
10. Added dashboard-settings coverage proving every editable catalog `allowed_values` entry can be planned by the guarded writer.
11. Added test-plan coverage and as-built synchronization metadata.

Document synchronization policy:

- Requirements record user-visible outcomes, constraints, and non-scope.
- Specification records skill, alias, Settings display, and verification contracts.
- This implementation plan records the implementation order, verification sequence, failure recovery, and approval boundaries.
- Task tracker records current work state and completion.
- Handoff records restart context and next safe action.

Verification sequence:

```bash
bash -n tools/menu tools/check_agents_skills.sh tools/test_menu_prerequisites.sh
./tools/check_agents_skills.sh
./tools/test_menu_prerequisites.sh
./tools/test_dashboard_settings.sh
./tools/test_dashboard_control_center.sh
./tools/check_test_plan_coverage.sh
./tools/check_as_built_sync_contract.sh
./tools/check_as_built_docs.sh
./tools/check_workflow_pair_sync.sh
git diff --check
```

Failure recovery:

- If alias output and `skills/SKILL_ALIASES.tsv` disagree, fix the TSV-driven menu reader rather than duplicating alias data.
- If Settings display labels change stored values or policy behavior, revert the display mapping and keep owner-layer settings authoritative.
- If `check_agents_skills` reports missing routes, repair AGENTS and skill metadata together.
- If sync checks fail, make `SYNC-ID`, `STATUS`, `ARTIFACTS`, and `TESTS` match exactly across the five synchronized documents and the contract row.

Developer approval boundaries:

- Approval is required before changing product Git usage mode semantics, Git workflow action semantics, Dashboard mutation authority, CI/pre-commit behavior, destructive cleanup, external-service authority, credentials, OAuth, push, merge, main CI, or any existing-feature tradeoff.

## Implemented External Product Workflow Release Readiness Implementation Plan

SYNC-ID: external_product_workflow_release_readiness
STATUS: implemented
ARTIFACTS: docs/workflow/AS_BUILT_SYNC_CONTRACT.tsv,docs/workflow/TEST_PLAN_MANIFEST.tsv,free-development/FREE_DEVELOPMENT_MODE.md,skills/product-development-workflow/SKILL.md,skills/product-development-workflow/references/product-development.md,skills/worklog-doc-sync/SKILL.md,skills/worklog-doc-sync/references/worklog-sync.md,skills/task-tracker-docs/SKILL.md,skills/task-tracker-docs/references/product-docs.md,tools/lib/product_workflow_git_usage.sh,tools/product-profile,tools/menu,tools/dashboard-data,tools/test_product_git_usage_modes.sh,tools/test_menu_prerequisites.sh,tools/test_dashboard_data.sh,docs/as-built/REQUIREMENTS.md,docs/as-built/SPECIFICATION.md,docs/as-built/IMPLEMENTATION_PLAN.md,docs/workflow/TASK_TRACKER.md,docs/workflow/HANDOFF.md
TESTS: tools/test_product_git_usage_modes.sh,tools/test_menu_prerequisites.sh,tools/test_dashboard_data.sh,tools/check_agents_skills.sh,tools/check_test_plan_coverage.sh,tools/test_test_plan.sh,tools/check_as_built_sync_contract.sh,tools/check_as_built_docs.sh,tools/check_workflow_pair_sync.sh

Implemented order:

1. Preserve `repository-development-workflow` as the active lesson-repository development protocol and keep this work in the approved implementation scope.
2. Synchronize the new `external_product_workflow_release_readiness` contract across requirements, specification, implementation plan, task tracker, handoff, and sync contract.
3. Harden `tools/lib/product_workflow_git_usage.sh` so runtime mode selection cannot silently bypass Dashboard Settings through an environment variable.
4. Update `tools/product-profile` to use the shared product workflow boundary gate for external-product menus while preserving strict structured lesson behavior.
5. Update `tools/menu` so items 4, 5, and 6 use product workflow context and mode for repository boundary and Git workflow readiness.
6. Update `tools/dashboard-data` so selected external-product Git operation rows reflect product mode applicability.
7. Update Free Development and skill guidance so configured product workspace is the rule and task-tracker is the structured lesson default example.
8. Extend focused tests for product Git usage modes, menu prerequisites, Dashboard data, skills wiring, and test-plan coverage.

Verification sequence:

```bash
bash -n tools/lib/product_workflow_git_usage.sh tools/product-profile tools/menu tools/dashboard-data tools/test_product_git_usage_modes.sh tools/test_menu_prerequisites.sh tools/test_dashboard_data.sh
./tools/test_product_git_usage_modes.sh
./tools/test_menu_prerequisites.sh
./tools/test_dashboard_data.sh
./tools/check_agents_skills.sh
./tools/check_test_plan_coverage.sh
./tools/test_test_plan.sh
./tools/check_as_built_sync_contract.sh
./tools/check_as_built_docs.sh
./tools/check_workflow_pair_sync.sh
git diff --check
```

Failure recovery:

- If Settings mode and runtime mode disagree, fix `tools/lib/product_workflow_git_usage.sh` first.
- If Git/CI is still required in `none` mode, repair the shared boundary/applicability helper before patching individual menu output.
- If Dashboard rows disagree with producer-owned selected context data, fix `tools/dashboard-data` rather than React.
- If skill text drifts back to a fixed product path, keep the configured product workspace wording and preserve task-tracker only as the structured lesson default.
- If sync checks fail, make `SYNC-ID`, `STATUS`, `ARTIFACTS`, and `TESTS` match exactly across the contract and five synchronized documents.

Developer approval boundaries:

- Approval is required before changing product Git usage semantics, Git workflow action semantics, Dashboard mutation authority, CI/pre-commit/final-gate behavior, product-security strictness, push, PR creation, merge, main CI waiting, local/remote sync, cleanup execution, OAuth, credentials, external-service authority, or any existing-feature tradeoff.

## Implemented External Product Local Scaffold Controls Implementation Plan

SYNC-ID: external_product_local_scaffold_controls
STATUS: implemented
ARTIFACTS: AGENTS.MD,docs/workflow/AS_BUILT_SYNC_CONTRACT.tsv,docs/workflow/PRODUCT_REPOSITORY_STRUCTURE.tsv,docs/workflow/TEST_PLAN_MANIFEST.tsv,free-development/FREE_DEVELOPMENT_MODE.md,templates/TEMPLATES.md,skills/product-development-workflow/SKILL.md,skills/product-development-workflow/references/product-development.md,tools/lib/product_workflow_git_usage.sh,tools/lib/product_repository_registry.sh,tools/lib/product_repository_authority.sh,tools/product-gate-evidence-bootstrap,tools/product-scaffold-check,tools/product-launch-check,tools/dashboard-data,tools/test_product_scaffold_check.sh,tools/test_product_git_usage_modes.sh,tools/test_product_repository_authority.sh,tools/test_product_gate_tools.sh,tools/test_product_launch_check.sh,tools/test_dashboard_data.sh,docs/as-built/REQUIREMENTS.md,docs/as-built/SPECIFICATION.md,docs/as-built/IMPLEMENTATION_PLAN.md,docs/workflow/TASK_TRACKER.md,docs/workflow/HANDOFF.md
TESTS: tools/test_product_scaffold_check.sh,tools/test_product_git_usage_modes.sh,tools/test_product_repository_authority.sh,tools/test_product_gate_tools.sh,tools/test_product_launch_check.sh,tools/test_dashboard_data.sh,tools/check_agents_skills.sh,tools/check_test_plan_coverage.sh,tools/test_test_plan.sh,tools/check_as_built_sync_contract.sh,tools/check_as_built_docs.sh,tools/check_workflow_pair_sync.sh

Implemented order:

1. Confirm `$repository-development-workflow` as the active repository-development protocol and keep implementation scoped to external product local scaffold controls.
2. Expand `docs/workflow/PRODUCT_REPOSITORY_STRUCTURE.tsv` with product-local `skills/`, `tools/`, memory, verification, security, repository index, and `.gitignore` scaffold rows.
3. Add `tools/product-gate-evidence-bootstrap` so this repository can install the standard product-local evidence producer into external repositories without making product authority or Dashboard mutate evidence.
4. Update `tools/lib/product_repository_authority.sh` so evidence tied to an older product HEAD is consumed as stale instead of ready.
5. Update product fixture builders in focused tests so valid external products include the standard local maintenance controls and evidence producer files.
6. Update `tools/product-scaffold-check` with `--ci-optional`, while preserving strict Git and CI behavior for direct default execution.
7. Update `tools/lib/product_workflow_git_usage.sh` so Settings-selected non-Git and non-CI modes pass the matching optional flags into scaffold validation.
8. Update `tools/product-launch-check` with explicit `--git-optional`, preserving strict default behavior.
9. Update `tools/dashboard-data` so product-context Git operation modes are read from the configured product repository.
10. Update AGENTS, Free Development guidance, templates, and product workflow skill guidance so developers and agents share the same product repository scaffold model.
11. Add test-plan rows for the user-facing scaffold guidance files and synchronize the new contract across requirements, specification, implementation plan, task tracker, handoff, and sync contract.

Verification sequence:

```bash
bash -n tools/product-gate-evidence-bootstrap tools/product-scaffold-check tools/product-launch-check tools/lib/product_workflow_git_usage.sh tools/lib/product_repository_authority.sh tools/dashboard-data tools/test_product_scaffold_check.sh tools/test_product_git_usage_modes.sh tools/test_product_repository_authority.sh tools/test_product_gate_tools.sh tools/test_product_launch_check.sh tools/test_dashboard_data.sh
./tools/test_product_scaffold_check.sh
./tools/test_product_git_usage_modes.sh
./tools/test_product_repository_authority.sh
./tools/test_product_gate_tools.sh
./tools/test_product_launch_check.sh
./tools/test_dashboard_data.sh
./tools/check_agents_skills.sh
./tools/check_test_plan_coverage.sh
./tools/test_test_plan.sh
./tools/check_as_built_sync_contract.sh
./tools/check_as_built_docs.sh
./tools/check_workflow_pair_sync.sh
git diff --check
```

Failure recovery:

- If a valid product fixture fails scaffold validation, repair `PRODUCT_REPOSITORY_STRUCTURE.tsv` or the shared fixture scaffold helper rather than adding a test-only bypass.
- If non-CI modes still require CI files, repair `product_workflow_git_usage_scaffold_gate` and `tools/product-scaffold-check --ci-optional`.
- If strict direct scaffold checks stop requiring CI for product-improvement or external-integration, restore the default strict path and keep optional behavior behind `--ci-optional`.
- If dashboard Git operation modes disagree with product repository settings, fix `tools/dashboard-data` producer logic, not React.
- If sync checks fail, make `SYNC-ID`, `STATUS`, `ARTIFACTS`, and `TESTS` match exactly across the contract and five synchronized documents.

Developer approval boundaries:

- Approval is required before changing product Git usage semantics, product-security strictness, default strict `ci` behavior, CI/pre-commit/final-gate behavior, Dashboard mutation authority, push, PR creation, merge, main CI waiting, local/remote sync, cleanup execution, product repository deletion, OAuth, credentials, external-service authority, or any existing-feature tradeoff.

## Implemented Dashboard Control Center Design System Implementation Plan

SYNC-ID: dashboard_control_center_design_system
STATUS: implemented
ARTIFACTS: docs/design-system/dashboard-control-center/DESIGN_SYSTEM.md,docs/workflow/AS_BUILT_SYNC_CONTRACT.tsv,docs/workflow/TEST_PLAN_MANIFEST.tsv,guides/DOCUMENT_MAP.md,tools/docs-tour,dashboard-control-center/src/App.jsx,dashboard-control-center/src/i18n.js,dashboard-control-center/src/styles.css,tests/playwright/dashboard-control-center.spec.js,tools/test_docs_tour.sh,tools/test_dashboard_control_center.sh,docs/as-built/REQUIREMENTS.md,docs/as-built/SPECIFICATION.md,docs/as-built/IMPLEMENTATION_PLAN.md,docs/workflow/TASK_TRACKER.md,docs/workflow/HANDOFF.md
TESTS: tools/test_docs_tour.sh,tools/test_dashboard_i18n.sh,tools/test_dashboard_control_center.sh,tools/check_developer_memory_requirements.sh,tools/check_test_plan_coverage.sh,tools/test_test_plan.sh,tools/check_as_built_sync_contract.sh,tools/check_as_built_docs.sh,tools/check_workflow_pair_sync.sh

Implementation order:

1. Confirm `$repository-development-workflow` as the active repository-development protocol.
2. Add `docs/design-system/dashboard-control-center/DESIGN_SYSTEM.md` as the design-system source of truth.
3. Add document-map and docs-tour routing so future developers can find the design-system document.
4. Add a test-plan rule for design-system document changes.
5. Add reusable dashboard detail helpers for glossary terms, workflow card details, run references, source roles, evidence roles, and safety policy explanations.
6. Replace same-page no-op detail links in Development Workflow with useful detail surfaces.
7. Update Maintenance Sync evidence/source displays so role and purpose appear before raw paths or commands.
8. Update Safety Actions cards and policy text so non-engineers can identify safe-to-continue, approval-required, dangerous-operation, and blocker states.
9. Expand Help glossary into categories and per-term detail surfaces.
10. Extend Playwright coverage for design-system routing, detail surfaces, and glossary interaction.
11. Update developer memory, task tracker, and handoff after implementation and verification.

Verification sequence:

```bash
./tools/test_docs_tour.sh
./tools/test_dashboard_i18n.sh
./tools/test_dashboard_control_center.sh
./tools/check_developer_memory_requirements.sh
./tools/check_test_plan_coverage.sh
./tools/test_test_plan.sh
./tools/check_as_built_sync_contract.sh
./tools/check_as_built_docs.sh
./tools/check_workflow_pair_sync.sh
./tools/repository-development-workflow run --phase fast_loop --check-set required --execute --approved
./tools/repository-development-workflow run --phase mid_tests --check-set required --execute --approved
```

Failure recovery:

- If glossary or detail strings are missing in any locale, repair `dashboard-control-center/src/i18n.js` before changing rendering logic.
- If a detail action still links to the same page without showing new information, replace it with a real detail surface or remove the affordance.
- If source displays become too technical, keep raw paths in copy controls and move role text to the primary label.
- If command previews look executable, restore display-only labels and remove any action styling.
- If sync checks fail, make `SYNC-ID`, `STATUS`, `ARTIFACTS`, and `TESTS` match exactly across the contract and five synchronized documents.

Developer approval boundaries:

- Approval is required before changing Settings mutation authority, command execution authority, Git/CI execution semantics, merge, push, main CI waiting, cleanup execution, product repository deletion, dependency changes, CI/pre-commit/final-gate behavior, credentials, external-service authority, or any existing-feature tradeoff.

## Implemented Dashboard Control Center Design Studio Implementation Plan

SYNC-ID: dashboard_control_center_design_studio
STATUS: implemented
ARTIFACTS: docs/design-system/dashboard-control-center/DESIGN_SYSTEM.md,docs/design-system/dashboard-control-center/components.json,dashboard-control-center/src/design-system.generated.css,dashboard-control-center/src/design-system.generated.js,dashboard-control-center/src/App.jsx,dashboard-control-center/src/dashboardData.js,dashboard-control-center/src/i18n.js,dashboard-control-center/src/styles.css,vite.config.mjs,tools/dashboard-design-system,tools/check_dashboard_design_system.sh,tests/playwright/dashboard-control-center.spec.js,tools/test_dashboard_control_center.sh,docs/workflow/AS_BUILT_SYNC_CONTRACT.tsv,docs/as-built/REQUIREMENTS.md,docs/as-built/SPECIFICATION.md,docs/as-built/IMPLEMENTATION_PLAN.md,docs/workflow/TASK_TRACKER.md,docs/workflow/HANDOFF.md
TESTS: tools/test_dashboard_i18n.sh,tools/test_dashboard_control_center.sh,tools/check_developer_memory_requirements.sh,tools/check_test_plan_coverage.sh,tools/test_test_plan.sh,tools/check_as_built_sync_contract.sh,tools/check_as_built_docs.sh,tools/check_workflow_pair_sync.sh,tools/check_repository_development_workflow.sh,tools/test_repository_development_workflow.sh

Implementation order:

1. Confirm `$repository-development-workflow` as the active repository-development protocol.
2. Extend the Dashboard design-system source with the Design Studio and interaction-editing contract.
3. Extend `components.json` with the shared tooltip/copy interaction contract.
4. Extend `tools/dashboard-design-system` so it validates interaction presets, emits runtime variables, checks Design Studio wiring, and supports `plan-interaction` and `apply-interaction`.
5. Add guarded Vite middleware endpoints for Design Studio plan and apply operations, including same-process one-time plan-token enforcement for apply.
6. Add dashboard data API helpers with response validation for Design Studio mutations.
7. Add the Design Studio route, preview UI, plan/apply flow, confirmation gate, and i18n labels.
8. Replace copy-control native title popups with generated top-positioned copy popups whose duration and shift collision presets affect runtime behavior.
9. Extend focused Playwright and middleware coverage for Design Studio plan/apply behavior, plan-token enforcement, and tooltip/copy popup interaction.
10. Synchronize requirements, specification, implementation plan, task tracker, handoff, sync contract, and developer memory.

Verification sequence:

```bash
./tools/check_dashboard_design_system.sh
./tools/test_dashboard_i18n.sh
./tools/test_dashboard_control_center.sh
./tools/check_developer_memory_requirements.sh
./tools/check_test_plan_coverage.sh
./tools/test_test_plan.sh
./tools/check_as_built_sync_contract.sh
./tools/check_as_built_docs.sh
./tools/check_workflow_pair_sync.sh
./tools/check_repository_development_workflow.sh
./tools/test_repository_development_workflow.sh
git diff --check
```

Failure recovery:

- If Vite reports a JSX parse error around an arrow marker, render the arrow as JSX-safe text such as `{" -> "}`.
- If Design Studio apply writes stale generated files, run `./tools/dashboard-design-system write` and rerun the drift check.
- If the plan or apply endpoint accepts an unapproved value, tighten the Vite payload whitelist and rerun Dashboard focused tests.
- If apply succeeds without a matching current plan token, repair Vite middleware token enforcement before continuing.
- If copy popups appear under the pointer or native title behavior returns, restore `data-copy-tooltip` and the generated top-placement pseudo-element contract.
- If copy popup duration or collision options do not change generated runtime behavior, repair the generator before changing the UI.
- If pointer leave does not hide a tooltip, repair the generated hover-only CSS rule instead of adding page-local exceptions.
- If sync checks fail, make `SYNC-ID`, `STATUS`, `ARTIFACTS`, and `TESTS` match exactly across the contract and five synchronized documents.

Developer approval boundaries:

- Approval is required before broadening Design Studio beyond whitelisted presets, allowing arbitrary CSS editing, changing Settings mutation authority, changing command execution authority, changing Git/CI execution semantics, merge, push, main CI waiting, cleanup execution, product repository deletion, dependency changes, CI/pre-commit/final-gate behavior, credentials, external-service authority, or any existing-feature tradeoff.

## Implemented Dashboard Control Center Visual Design-System Editor Implementation Plan

SYNC-ID: dashboard_control_center_design_studio_visual_editor
STATUS: implemented
ARTIFACTS: docs/design-system/dashboard-control-center/DESIGN_SYSTEM.md,docs/design-system/dashboard-control-center/tokens.json,docs/design-system/dashboard-control-center/components.json,dashboard-control-center/src/design-system.generated.css,dashboard-control-center/src/design-system.generated.js,dashboard-control-center/src/App.jsx,dashboard-control-center/src/dashboardData.js,dashboard-control-center/src/i18n.js,dashboard-control-center/src/styles.css,vite.config.mjs,tools/dashboard-design-system,tools/check_dashboard_design_system.sh,tests/playwright/dashboard-control-center.spec.js,tools/test_dashboard_control_center.sh,docs/workflow/PRODUCT_REPOSITORY_STRUCTURE.tsv,templates/TEMPLATES.md,tools/test_product_scaffold_check.sh,docs/workflow/AS_BUILT_SYNC_CONTRACT.tsv,docs/as-built/REQUIREMENTS.md,docs/as-built/SPECIFICATION.md,docs/as-built/IMPLEMENTATION_PLAN.md,docs/workflow/TASK_TRACKER.md,docs/workflow/HANDOFF.md
TESTS: tools/check_dashboard_design_system.sh,tools/test_dashboard_i18n.sh,tools/test_dashboard_control_center.sh,tools/test_product_scaffold_check.sh,tools/check_developer_memory_requirements.sh,tools/check_test_plan_coverage.sh,tools/test_test_plan.sh,tools/check_as_built_sync_contract.sh,tools/check_as_built_docs.sh,tools/check_workflow_pair_sync.sh,tools/check_repository_development_workflow.sh,tools/test_repository_development_workflow.sh

Implementation order:

1. Confirm `$repository-development-workflow` as the active repository-development protocol.
2. Synchronize the expanded Design Studio requirements, specification, implementation plan, task tracker, handoff, sync contract, and developer memory.
3. Extend `DESIGN_SYSTEM.md` with the visual editor, target model, foundation editor, atom/molecule/organism preview, and external product source-boundary contract.
4. Extend `tokens.json` with role-based typography and spacing tokens that generated CSS can expose and shared Dashboard styles can consume.
5. Extend `tools/dashboard-design-system` with whitelisted foundation presets for theme accent, density, radius, and typography scale.
6. Extend Design Studio plan/apply payloads and Vite middleware validation so foundation preset changes use the same one-time plan-token boundary as interaction changes.
7. Extend the React Design Studio page with target awareness, foundation controls, atom/molecule/organism preview, and combined foundation/interaction diffs.
8. Update i18n strings so the page describes "editing the design source of truth" rather than leading with "do not edit CSS".
9. Add product-local design-system scaffold entries to `PRODUCT_REPOSITORY_STRUCTURE.tsv`, `templates/TEMPLATES.md`, and product scaffold tests.
10. Regenerate generated CSS/JS and run focused fast-loop and synchronization checks.

Verification sequence:

```bash
./tools/check_dashboard_design_system.sh
./tools/test_dashboard_i18n.sh
./tools/test_dashboard_control_center.sh
./tools/test_product_scaffold_check.sh
./tools/check_developer_memory_requirements.sh
./tools/check_test_plan_coverage.sh
./tools/test_test_plan.sh
./tools/check_as_built_sync_contract.sh
./tools/check_as_built_docs.sh
./tools/check_workflow_pair_sync.sh
./tools/check_repository_development_workflow.sh
./tools/test_repository_development_workflow.sh
git diff --check
```

Failure recovery:

- If foundation presets do not change generated CSS variables, repair `tools/dashboard-design-system` before changing UI labels.
- If generated files drift, run `./tools/dashboard-design-system write` and rerun `./tools/check_dashboard_design_system.sh`.
- If Vite accepts unsupported foundation values, tighten middleware validation and rerun focused Dashboard tests.
- If apply succeeds without a current matching plan token, stop and repair plan-token fingerprinting before continuing.
- If the visual preview changes without source-backed token changes, remove the page-local styling path and wire it through tokens/components.
- If product scaffold tests fail after adding design-system files, update the shared fixture helper and structure policy together.
- If an external product write is needed, stop for explicit product workflow approval; this sync does not grant cross-repository write authority.

Developer approval boundaries:

- Approval is required before arbitrary CSS editing, arbitrary script execution, external product repository writes, Settings authority changes, command execution authority changes, Git/CI/merge/sync behavior changes, dependency changes, credential handling, or any existing-feature tradeoff.

## Implemented Dashboard Control Center Design System Full-Application Implementation Plan

SYNC-ID: dashboard_control_center_design_system_full_application
STATUS: implemented
ARTIFACTS: docs/design-system/dashboard-control-center/DESIGN_SYSTEM.md,docs/workflow/AS_BUILT_SYNC_CONTRACT.tsv,dashboard-control-center/src/App.jsx,dashboard-control-center/src/i18n.js,dashboard-control-center/src/styles.css,tests/playwright/dashboard-control-center.spec.js,docs/as-built/REQUIREMENTS.md,docs/as-built/SPECIFICATION.md,docs/as-built/IMPLEMENTATION_PLAN.md,docs/workflow/TASK_TRACKER.md,docs/workflow/HANDOFF.md
TESTS: tools/test_docs_tour.sh,tools/test_dashboard_i18n.sh,tools/test_dashboard_control_center.sh,tools/check_developer_memory_requirements.sh,tools/check_test_plan_coverage.sh,tools/test_test_plan.sh,tools/check_as_built_sync_contract.sh,tools/check_as_built_docs.sh,tools/check_workflow_pair_sync.sh

Implementation order:

1. Confirm `$repository-development-workflow` as the active repository-development protocol.
2. Extend the design-system document with the full-application tooltip, source, evidence, copy, and detail split.
3. Synchronize this new full-application contract across the sync contract and five required documents.
4. Add a reusable Dashboard design-system application layer for page headers, decision summaries, common cards, operational rows, detail panels, technical chips, tooltip surfaces, focus rings, spacing, borders, and radius.
5. Update shared Dashboard source/evidence/reference helpers so raw paths, commands, and technical IDs remain visible where they are the field value.
6. Shorten tooltip text to role-focused explanations and move longer meaning into existing detail surfaces.
7. Update Dashboard i18n for any new role or tooltip labels without hard-coded visible strings.
8. Extend Playwright coverage for representative computed style, raw source visibility, short tooltip roles, copy affordances, and detail popups.
9. Update developer memory, task tracker, and handoff after implementation and verification.

Verification sequence:

```bash
./tools/test_docs_tour.sh
./tools/test_dashboard_i18n.sh
./tools/test_dashboard_control_center.sh
./tools/check_developer_memory_requirements.sh
./tools/check_test_plan_coverage.sh
./tools/test_test_plan.sh
./tools/check_as_built_sync_contract.sh
./tools/check_as_built_docs.sh
./tools/check_workflow_pair_sync.sh
./tools/repository-development-workflow run --phase fast_loop --check-set required --execute --approved
./tools/repository-development-workflow run --phase mid_tests --check-set required --execute --approved
```

Failure recovery:

- If the running Dashboard visually looks unchanged after a design-system sync, add or repair shared presentation rules and computed-style browser assertions before marking the sync complete.
- If tooltip text clips or becomes long, shorten the tooltip and move content to the shared detail surface.
- If raw paths or commands disappear from the field value, restore visible inspectable values and keep explanatory text in tooltip or detail.
- If i18n keys leak to the UI, repair `dashboard-control-center/src/i18n.js` before changing rendering logic.
- If command previews look executable, restore display-only styling and labels.
- If sync checks fail, make `SYNC-ID`, `STATUS`, `ARTIFACTS`, and `TESTS` match exactly across the contract and five synchronized documents.

Developer approval boundaries:

- Approval is required before changing Settings mutation authority, command execution authority, Git/CI execution semantics, merge, push, main CI waiting, cleanup execution, product repository deletion, dependency changes, CI/pre-commit/final-gate behavior, credentials, external-service authority, or any existing-feature tradeoff.

## Implemented Dashboard Control Center Design System Source-To-Runtime Implementation Plan

SYNC-ID: dashboard_control_center_design_system_source_runtime
STATUS: implemented
ARTIFACTS: docs/design-system/dashboard-control-center/DESIGN_SYSTEM.md,docs/design-system/dashboard-control-center/tokens.json,docs/design-system/dashboard-control-center/components.json,dashboard-control-center/src/design-system.generated.css,dashboard-control-center/src/design-system.generated.js,dashboard-control-center/src/main.jsx,dashboard-control-center/src/App.jsx,dashboard-control-center/src/styles.css,tools/dashboard-design-system,tools/check_dashboard_design_system.sh,tools/test_dashboard_control_center.sh,tools/test_lesson_repository.sh,docs/workflow/GIT_HOOK_CHECKS.tsv,docs/workflow/GIT_HOOK_PARALLEL_GROUPS.tsv,docs/workflow/TEST_PLAN_MANIFEST.tsv,docs/workflow/AS_BUILT_SYNC_CONTRACT.tsv,tests/playwright/dashboard-control-center.spec.js,docs/as-built/REQUIREMENTS.md,docs/as-built/SPECIFICATION.md,docs/as-built/IMPLEMENTATION_PLAN.md,docs/workflow/TASK_TRACKER.md,docs/workflow/HANDOFF.md
TESTS: tools/test_dashboard_i18n.sh,tools/test_dashboard_control_center.sh,tools/check_developer_memory_requirements.sh,tools/check_test_plan_coverage.sh,tools/test_test_plan.sh,tools/check_as_built_sync_contract.sh,tools/check_as_built_docs.sh,tools/check_workflow_pair_sync.sh,tools/check_repository_development_workflow.sh,tools/test_repository_development_workflow.sh

Implementation order:

1. Confirm `$repository-development-workflow` as the active repository-development protocol.
2. Extend `DESIGN_SYSTEM.md` with the source-to-runtime, prototype preview, and drift-check contract from the video-analysis findings.
3. Add machine-readable `tokens.json` and `components.json` next to the design-system source document.
4. Add `tools/dashboard-design-system` to validate sources and generate runtime CSS/JS without adding dependencies.
5. Add `tools/check_dashboard_design_system.sh` as the standalone drift check.
6. Generate `dashboard-control-center/src/design-system.generated.css` and `dashboard-control-center/src/design-system.generated.js`.
7. Import the generated CSS from the React entry and expose a design-system marker on the app shell.
8. Wire the drift check into Dashboard focused tests, aggregate tests, Git hook check definitions, parallel classification, and test-plan policy.
9. Update Playwright coverage so browser tests prove the design-system marker and the approved no-left-accent page-header styling.
10. Synchronize requirements, specification, implementation plan, task tracker, handoff, sync contract, and developer memory.

Verification sequence:

```bash
./tools/check_dashboard_design_system.sh
./tools/test_dashboard_i18n.sh
./tools/test_dashboard_control_center.sh
./tools/check_developer_memory_requirements.sh
./tools/check_test_plan_coverage.sh
./tools/test_test_plan.sh
./tools/check_as_built_sync_contract.sh
./tools/check_as_built_docs.sh
./tools/check_workflow_pair_sync.sh
./tools/check_repository_development_workflow.sh
./tools/test_repository_development_workflow.sh
git diff --check
```

Failure recovery:

- If Vite cannot resolve `design-system.generated.css`, regenerate with `./tools/dashboard-design-system write` and restart the running Dashboard server.
- If the generated files drift, update `tokens.json` or `components.json`, run the generator, and rerun the drift check.
- If browser tests show the old left accent or gradient page header, repair shared design-system runtime styling rather than page-local selectors.
- If sync checks fail, make `SYNC-ID`, `STATUS`, `ARTIFACTS`, and `TESTS` match exactly across the contract and five synchronized documents.

Developer approval boundaries:

- Approval is required before changing Settings mutation authority, command execution authority, Git/CI execution semantics, merge, push, main CI waiting, cleanup execution, product repository deletion, dependency changes, CI/pre-commit/final-gate behavior, credentials, external-service authority, or any existing-feature tradeoff.

## Implemented Dashboard Design Studio Orchestration Foundation Implementation Plan

SYNC-ID: dashboard_design_studio_orchestration_foundation
STATUS: implemented
ARTIFACTS: .github/workflows/ci.yml,.github/workflows/lesson14-ci.yml,docs/design-system/dashboard-control-center/DESIGN_SYSTEM.md,docs/design-system/dashboard-control-center/tokens.json,docs/design-system/dashboard-control-center/components.json,docs/design-system/dashboard-control-center/orchestration.json,dashboard-control-center/src/design-system.generated.css,dashboard-control-center/src/design-system.generated.js,dashboard-control-center/src/App.jsx,dashboard-control-center/src/i18n.js,dashboard-control-center/src/styles.css,tests/playwright/dashboard-control-center.spec.js,tools/dashboard-design-system,tools/check_dashboard_design_system.sh,tools/check_ci_workflow_structure.sh,docs/workflow/AS_BUILT_SYNC_CONTRACT.tsv,docs/as-built/REQUIREMENTS.md,docs/as-built/SPECIFICATION.md,docs/as-built/IMPLEMENTATION_PLAN.md,docs/workflow/TASK_TRACKER.md,docs/workflow/HANDOFF.md
TESTS: tools/check_ci_workflow_structure.sh,tools/check_dashboard_design_system.sh,tools/test_dashboard_i18n.sh,tools/test_dashboard_control_center.sh,tools/check_as_built_sync_contract.sh,tools/check_as_built_docs.sh,tools/check_workflow_pair_sync.sh,tools/check_repository_development_workflow.sh,tools/test_repository_development_workflow.sh

Implemented order:

1. Confirmed `$repository-development-workflow` as the active repository-development protocol and kept the implementation scoped to Dashboard Design Studio orchestration foundation work.
2. Inventoried the dirty worktree and avoided reverting or absorbing unrelated existing changes.
3. Added `docs/design-system/dashboard-control-center/orchestration.json` as the machine-readable source for design intent, candidate envelope, proposal, provider, target adapter, mock, template, apply, verification, and rollback contracts.
4. Extended `DESIGN_SYSTEM.md` with human-readable orchestration, candidate-envelope, AI-provider, mock, and template guidance.
5. Added the `design-studio-orchestration` component contract to `components.json`.
6. Extended `tools/dashboard-design-system` so it reads tokens, components, and orchestration sources together, validates the new source, rejects secret-like orchestration payloads, and emits orchestration data into generated runtime JS.
7. Regenerated `dashboard-control-center/src/design-system.generated.css` and `dashboard-control-center/src/design-system.generated.js` through the owner generator.
8. Added a Design Studio orchestration panel in `dashboard-control-center/src/App.jsx` that renders the proposal flow, store/runner/mock/template responsibilities, schema contracts, provider modes, target adapters, and direct-apply authority.
9. Added English and Japanese UI labels in `dashboard-control-center/src/i18n.js`.
10. Added shared Dashboard styles for the orchestration panel in `dashboard-control-center/src/styles.css`.
11. Extended focused Playwright coverage for the Design Studio route to assert the orchestration foundation, candidate envelope, schema names, provider modes, target adapters, and no direct apply authority.
12. Wired `tools/check_dashboard_design_system.sh` into CI structure validation so the standalone design-system check remains aggregate-callable.
13. Promoted the sync ID from planned to implemented across the as-built documents, TASK_TRACKER, HANDOFF, and AS_BUILT_SYNC_CONTRACT.

Verification sequence used for this implementation:

```bash
./tools/check_ci_workflow_structure.sh
./tools/check_dashboard_design_system.sh
npm run dashboard:build
./tools/test_dashboard_i18n.sh
./tools/test_dashboard_control_center.sh
./tools/check_repository_development_workflow.sh
./tools/test_repository_development_workflow.sh
./tools/check_workflow_pair_sync.sh
./tools/check_as_built_sync_contract.sh
./tools/check_as_built_docs.sh
git diff --check
```

Failure recovery:

- If sync checks fail, make `SYNC-ID`, `STATUS`, `ARTIFACTS`, and `TESTS` match exactly across the contract and five synchronized documents.
- If schema checks fail, repair `orchestration.json` and the generator validation before changing UI labels or runtime behavior.
- If generated design-system files drift, repair `tokens.json`, `components.json`, or the generator and rerun the drift check before modifying React code.
- If stale plans, concurrent apply, token replay, target mismatch, or dirty target state are accepted, stop and repair the transaction guard before continuing.
- If API-key values appear in files, fixtures, logs, prompt payloads, test output, or browser data, stop and replace them with secret references plus redacted evidence.
- If mock images, OCR, image text, or AI output are treated as trusted instructions, move them into `CandidateEnvelope` records and re-run prompt-injection negative tests.
- If external product apply is needed, stop for a separate product-local mutation contract and developer approval; this sync ID keeps external targets plan-only.
- If template application introduces fixed CSS, dependency changes, network calls, script execution, or workflow authority changes, reject the template and repair manifest validation.

## Implemented Dashboard Design Studio Event Runner And Request Store Implementation Plan

SYNC-ID: dashboard_design_studio_event_runner_store
STATUS: implemented
ARTIFACTS: .gitignore,.github/workflows/ci.yml,.github/workflows/lesson14-ci.yml,docs/workflow/AS_BUILT_SYNC_CONTRACT.tsv,docs/workflow/TEST_PLAN_MANIFEST.tsv,docs/workflow/GIT_HOOK_CHECKS.tsv,docs/workflow/GIT_HOOK_PARALLEL_GROUPS.tsv,docs/workflow/FINAL_GATE_COVERAGE.tsv,tools/dashboard-design-system,tools/test_dashboard_design_studio_events.sh,tools/test_lesson_repository.sh,tools/check_ci_workflow_structure.sh,docs/as-built/REQUIREMENTS.md,docs/as-built/SPECIFICATION.md,docs/as-built/IMPLEMENTATION_PLAN.md,docs/workflow/TASK_TRACKER.md,docs/workflow/HANDOFF.md
TESTS: tools/test_dashboard_design_studio_events.sh,tools/check_dashboard_design_system.sh,tools/check_ci_workflow_structure.sh,tools/check_test_plan_coverage.sh,tools/test_test_plan.sh,tools/test_git_hooks.sh,tools/test_git_hooks_parallel.sh,tools/test_ci_final_gate.sh,tools/check_as_built_sync_contract.sh,tools/check_as_built_docs.sh,tools/check_workflow_pair_sync.sh

Implemented order:

1. Used `$repository-development-workflow` and AGENTS.MD as the active protocol for this lesson-repository change.
2. Chose `dashboard_design_studio_event_runner_store` as a separate sync ID so the existing orchestration foundation remains stable and this work does not absorb provider APIs, mock editing, external product writes, or Git/CI automation.
3. Extended `tools/dashboard-design-system` with local event-store commands: `queue-request`, `list-events`, `event-status`, `cancel-event`, `dead-letter-event`, and `retry-event`.
4. Reused the existing orchestration source to validate provider modes, target adapters, runner capabilities, and forbidden capabilities instead of adding fixed one-off command branches.
5. Added append-only JSONL persistence with durable event IDs, request IDs, idempotency keys, base snapshot hashes, lifecycle state, retry count, event order, timestamps, and audit receipts.
6. Kept persisted payloads to metadata, hashes, and bounded previews; raw `intent_text`, secret-like payloads, direct apply fields, shell commands, credential values, and external product apply authority are not persisted.
7. Added `.dashboard-design-studio-events/` to `.gitignore` for repo-local runtime state while keeping tests isolated through `DASHBOARD_DESIGN_STUDIO_EVENT_STORE_DIR`.
8. Added `tools/test_dashboard_design_studio_events.sh` for standalone regression coverage across queue, idempotency, read, transition, blocked provider, plan-only target, and secret rejection behavior.
9. Wired the new standalone test into `tools/test_lesson_repository.sh`, Git hooks checks, Git hooks parallel classification, final-gate coverage, test-plan policy, both CI workflows, and the CI workflow structure checker.
10. Synchronized the implemented sync ID across the as-built sync contract, requirements, specification, implementation plan, task tracker, handoff, and developer memory.

Verification sequence for this implementation:

```bash
node --check tools/dashboard-design-system
bash -n tools/test_dashboard_design_studio_events.sh
./tools/test_dashboard_design_studio_events.sh
./tools/check_dashboard_design_system.sh
./tools/check_ci_workflow_structure.sh
./tools/check_test_plan_coverage.sh
./tools/test_test_plan.sh
./tools/test_git_hooks_parallel.sh
./tools/test_ci_final_gate.sh
./tools/check_as_built_sync_contract.sh
./tools/check_as_built_docs.sh
./tools/check_workflow_pair_sync.sh
git diff --check
```

Failure recovery:

- If event records grant write, direct apply, or external product apply authority, restore those fields to false before adding any new event feature.
- If API-key mode queues successfully, restore the blocked provider boundary and keep API/provider work behind a separate approved sync ID.
- If raw `intent_text`, secret-like payloads, credentials, shell commands, or direct apply fields appear in the JSONL store, stop and repair persistence before changing tests.
- If external product events are not plan-only/manual-required, repair target-adapter validation before touching product workflows.
- If duplicate idempotency keys append records, repair the idempotency lookup before adding retry or provider features.
- If CI or hook wiring fails, restore the standalone test row across Git hooks, final-gate coverage, test-plan policy, aggregate, CI workflows, and CI structure checks.

Stop and ask before:

- Provider API dispatch, subscription-agent background execution, raw-secret handling, OAuth, imagegen calls, mock image mutation, product-local source writes, arbitrary shell execution, Dashboard browser command execution, dependency changes, Git push, PR creation, merge, main CI waiting, cleanup/delete, or any existing-feature tradeoff.

Developer approval boundaries:

- Approval is required before API-key provider calls, external product writes, dependency changes, CI/hook/final-gate changes, Settings authority changes, command execution authority changes, Git/CI/merge/sync behavior changes, credential handling, destructive cleanup, push, merge, main CI waiting, local/remote sync, or any existing-feature tradeoff.
## Planned External Product AGENTS And Operation Mode Control Implementation Plan

SYNC-ID: external_product_agents_mode_control
STATUS: implemented
ARTIFACTS: AGENTS.MD,docs/workflow/AS_BUILT_SYNC_CONTRACT.tsv,docs/workflow/PRODUCT_REPOSITORY_STRUCTURE.tsv,docs/workflow/DASHBOARD_DATA_SCHEMA.tsv,docs/workflow/GIT_HOOK_CHECKS.tsv,docs/workflow/GIT_HOOK_PARALLEL_GROUPS.tsv,docs/workflow/TEST_PLAN_MANIFEST.tsv,templates/TEMPLATES.md,guides/DOCUMENT_MAP.md,prompts/PROMPTS.md,prompts/PROMPTS_14_DAYS.md,skills/task-tracker-docs/SKILL.md,skills/task-tracker-docs/references/product-docs.md,tools/lib/product_repository_authority.sh,tools/product-repository-authority,tools/product-repository-mode,tools/product-scaffold-check,tools/check_repository_boundary.sh,tools/check_lesson_structure.sh,tools/check_ci_workflow_structure.sh,tools/test_product_repository_mode.sh,tools/test_product_repository_authority.sh,tools/test_product_scaffold_check.sh,tools/test_dashboard_data.sh,tools/test_product_git_usage_modes.sh,tools/test_product_gate_tools.sh,tools/test_docs_tour.sh,tools/test_lesson_repository.sh,.github/workflows/ci.yml,.github/workflows/lesson14-ci.yml,docs/as-built/REQUIREMENTS.md,docs/as-built/SPECIFICATION.md,docs/as-built/IMPLEMENTATION_PLAN.md,docs/workflow/TASK_TRACKER.md,docs/workflow/HANDOFF.md
TESTS: tools/test_product_repository_mode.sh,tools/test_product_repository_authority.sh,tools/test_product_scaffold_check.sh,tools/test_dashboard_data.sh,tools/test_product_git_usage_modes.sh,tools/test_product_gate_tools.sh,tools/test_docs_tour.sh,tools/check_ci_workflow_structure.sh,tools/check_lesson_structure.sh,tools/check_as_built_sync_contract.sh,tools/check_as_built_docs.sh,tools/check_test_plan_coverage.sh,tools/check_workflow_pair_sync.sh

Implemented scope:

- Product repository structure now requires product-local AGENTS.MD, ops/PRODUCT_OPERATION_MODE.tsv, and tools/product-mode as part of the standard external-product scaffold.
- Product-local AGENT.md is no longer a valid scaffold entry. Scaffold and authority checks surface it as a legacy migration/deletion target after product AGENTS.MD is validated.
- ops/PRODUCT_OPERATION_MODE.tsv stores workflow_mode, managed_by_parent, parent_repository, parent_rules_ref, last_parent_sync, active_parent_run, local_agents_version, and routing_table_version.
- tools/product-repository-mode provides lesson-side status, check, attach, detach, and reconnect paths. Status and check are read-only; attach, detach, and reconnect require --confirm and update only the operation-mode manifest.
- Product authority JSON exposes operation_mode.status, workflow_mode, rule_connection_status, repair_reason, and next_safe_action so Dashboard data can display mode diagnostics without React inventing readiness.
- Product fixtures, templates, document tour text, prompts, and product docs skills now use product-side AGENTS.MD as the standard rulebook and keep legacy AGENT.md only as a migration target.
- Git hooks, test-plan policy, CI structure checks, CI workflows, and the aggregate lesson-repository test include the product operation-mode regression.

Verification performed in the implementation loop:

- bash -n tools/lib/product_repository_authority.sh tools/product-scaffold-check tools/product-repository-mode tools/test_product_repository_mode.sh tools/test_product_repository_authority.sh tools/test_product_scaffold_check.sh tools/test_product_git_usage_modes.sh tools/test_dashboard_data.sh tools/test_product_gate_tools.sh tools/check_ci_workflow_structure.sh
- ./tools/test_product_repository_mode.sh
- ./tools/test_product_scaffold_check.sh
- ./tools/test_product_repository_authority.sh
- ./tools/test_product_git_usage_modes.sh
- ./tools/test_product_gate_tools.sh
- ./tools/test_docs_tour.sh
- ./tools/check_ci_workflow_structure.sh
- ./tools/check_lesson_structure.sh
- ./tools/test_dashboard_data.sh
## Implemented External Product Repository Registry Implementation Plan

SYNC-ID: external_product_repository_registry
STATUS: implemented
ARTIFACTS: docs/workflow/AS_BUILT_SYNC_CONTRACT.tsv,docs/workflow/DASHBOARD_DATA_SCHEMA.tsv,docs/workflow/PRODUCT_REPOSITORY_REGISTRY_SCHEMA.tsv,docs/workflow/PRODUCT_GATE_EVIDENCE_SCHEMA.tsv,docs/workflow/PRODUCT_WORKFLOW_GIT_USAGE_POLICY.tsv,docs/workflow/PRODUCT_REPOSITORY_STRUCTURE.tsv,learning/PRODUCT_WORKFLOW_GIT_USAGE_SETTINGS.tsv,learning/context/WORKFLOW_CONTEXT_MAP.tsv,learning/PRODUCT_REPOSITORY_REGISTRY.tsv,learning/PRODUCT_REPOSITORY_SELECTION.tsv,tools/lib/lesson_common.sh,tools/lib/product_workflow_git_usage.sh,tools/lib/product_repository_registry.sh,tools/lib/product_repository_authority.sh,tools/lib/dashboard_data.sh,tools/dashboard-data,tools/free-development,tools/product-improvement,tools/external-integration,tools/menu,tools/product-repository-registry,tools/product-gate-evidence-bootstrap,dashboard-control-center/src/App.jsx,dashboard-control-center/src/dashboardData.js,dashboard-control-center/src/i18n.js,dashboard-control-center/src/styles.css,tests/fixtures/dashboard-control-center.json,tests/fixtures/dashboard-control-center-live-update.json,tests/playwright/dashboard-control-center.spec.js,tools/test_dashboard_schema.sh,tools/test_dashboard_data.sh,tools/test_dashboard_control_center.sh,tools/test_product_git_usage_modes.sh,tools/test_product_repository_authority.sh,tools/test_product_scaffold_check.sh,tools/test_product_gate_tools.sh,tools/test_menu_prerequisites.sh,docs/as-built/REQUIREMENTS.md,docs/as-built/SPECIFICATION.md,docs/as-built/IMPLEMENTATION_PLAN.md,docs/workflow/TASK_TRACKER.md,docs/workflow/HANDOFF.md
TESTS: tools/test_dashboard_schema.sh,tools/test_dashboard_data.sh,tools/test_dashboard_control_center.sh,tools/test_product_git_usage_modes.sh,tools/test_product_repository_authority.sh,tools/test_product_scaffold_check.sh,tools/test_product_gate_tools.sh,tools/test_menu_prerequisites.sh,tools/check_as_built_sync_contract.sh,tools/check_as_built_docs.sh,tools/check_workflow_pair_sync.sh,tools/check_repository_development_workflow.sh,tools/test_repository_development_workflow.sh

Implementation order:

1. Completed: Keep `repository-development-workflow` as the active lesson-repository development protocol and complete this implementation-plan sync before runtime edits.
2. Completed: Add parent-side registry and selection helpers that read `learning/PRODUCT_REPOSITORY_REGISTRY.tsv` and `learning/PRODUCT_REPOSITORY_SELECTION.tsv`, with legacy fallback where still required.
3. Completed: Add a registry CLI for `status`, `list`, `selected`, `verify`, plus guarded `register` and `select` mutation with `--confirm`, duplicate replacement protection, context validation, and external path validation.
4. Completed: Update repository resolution so `dashboard-data` and Dashboard selected-context surfaces honor registry selection for Free Development.
5. Completed for current scope: Harden Product Improvement and External Integration no-target behavior so registry-backed menus do not silently use a legacy product root when no selected target exists.
6. Completed: Extend Dashboard data and validation with selected repository identity, `repository_selection`, repository-consistent live status, raw-path blocking, and stale context rejection.
7. Completed: Add a Dashboard repository selection panel separate from the menu selector; keep disabled reasons visible and non-overlapping while preserving the browser read-only boundary through guarded CLI previews.
8. Completed for current scope: Update overview cards, workflow rows, repository information, documents, history, and the repository selection panel to read selected repository identity through producer data rather than labels.
9. Completed for current scope: Add focused fixtures for multiple free-development repositories including FrameCue and Browser Debug CLI, plus zero eligible repository and no-target Product Improvement / External Integration fixtures.
10. Completed for current scope: Add focused tests proving Browser Debug CLI can be selected as a free-development repository, task-tracker does not leak into non-lesson contexts, and Product Improvement / External Integration stay unavailable without an explicit selected target.
11. Completed: Add evidence taxonomy v1 contract slices by allowing concrete test/structure/Git/CI/Security source IDs, covering `product.tests.unit/smoke/e2e` through `manifest-tests` fixtures, covering `product.structure.files/settings/scripts` through `structure-status`, extending `git-status` for sync/push/PR/merge evidence, adding `ci-status` for local CI manifest/provider readiness without GitHub calls, and adding `security-status` for secrets, local artifacts, external-sending approval, and aggregate blockers without storing secret values.
12. Completed: Promote this sync ID from planned to implemented after selection UX, schema validation, focused Dashboard checks, product authority checks, and workflow sync checks pass.

Verification sequence:

```bash
./tools/test_dashboard_schema.sh
./tools/test_dashboard_data.sh
./tools/test_dashboard_control_center.sh
./tools/test_product_git_usage_modes.sh
./tools/test_product_repository_authority.sh
./tools/test_menu_prerequisites.sh
./tools/check_as_built_sync_contract.sh
./tools/check_as_built_docs.sh
./tools/check_workflow_pair_sync.sh
./tools/check_repository_development_workflow.sh
./tools/test_repository_development_workflow.sh
git diff --check
```

Runtime check notes:

- Keep guarded registry mutation coverage in the selected-repository fixture, and add a standalone registry test only if mutation behavior expands beyond register/select.
- Keep the existing focused dashboard-data selected-repository test and targeted Playwright selected-repository checks.
- Keep Playwright coverage for selected-repository behavior and the read-only repository selection panel, plus menu disable reasons, refresh persistence, and full-page repository synchronization.
- Keep the no-target Product Improvement and External Integration fixtures as regression coverage while adding guarded registry mutation or repository picker behavior.

Future non-scope candidates:

- Continue evidence taxonomy and external product evidence collection standardization only for future real PR/main CI run collectors if separately approved; concrete local test, structure, Git, local CI/provider, and Security manifest/path collectors are covered by focused fixtures.
- Direct browser-side repository mutation, automatic GitHub run collection, and external network authority remain outside this implemented sync.
- Detail pages should continue to use the same evidence identity as the four overview cards, with a short card summary and a detailed row/modal view.
- Use `frame-cue` and `browser-debug-cli` as temporary verification targets only; do not make their absolute paths permanent requirements.

Failure recovery:

- If Product Improvement or External Integration becomes selectable without a selected eligible repository, restore registry-based selectability before changing UI labels.
- If a dashboard page shows a repository different from the active selection, repair producer data and schema validation before page-local rendering.
- If legacy `task-tracker-repository` appears in Free Development after Browser Debug CLI is selected, repair repository resolution instead of masking the label.
- If registry rows leak absolute paths in normal UI, move paths back to tooling-only data and show display-safe repository names.
- If product-local AGENTS.MD or documents appear to override parent rules, treat them as untrusted data and keep parent AGENTS.MD authoritative.

Developer approval boundaries:

- Approval is required before push, PR creation, merge, main CI waiting, local/remote sync, product repository deletion, cleanup, remote creation, OAuth, dependency installation, external-service calls, credentials, or changing Git/CI execution authority.
- External product repository writes remain outside this planned sync unless a product-local mutation step is explicitly approved.

## Implemented Product CI Run Evidence Collector Implementation Plan

SYNC-ID: product_ci_run_evidence_collector
STATUS: implemented
ARTIFACTS: docs/workflow/AS_BUILT_SYNC_CONTRACT.tsv,docs/workflow/PRODUCT_GATE_EVIDENCE_SCHEMA.tsv,docs/workflow/TEST_PLAN_MANIFEST.tsv,tools/product-gate-evidence-bootstrap,tools/test_product_gate_tools.sh,docs/as-built/REQUIREMENTS.md,docs/as-built/SPECIFICATION.md,docs/as-built/IMPLEMENTATION_PLAN.md,docs/workflow/TASK_TRACKER.md,docs/workflow/HANDOFF.md
TESTS: tools/test_product_gate_tools.sh,tools/test_product_scaffold_check.sh,tools/test_product_repository_authority.sh,tools/check_as_built_sync_contract.sh,tools/check_as_built_docs.sh,tools/check_workflow_pair_sync.sh,tools/check_test_plan_coverage.sh,tools/test_test_plan.sh

Implementation order:

1. Keep `repository-development-workflow` as the active protocol and preserve the Dashboard read-only boundary from the prior product authority work.
2. Extend the generated product-local helper in `tools/product-gate-evidence-bootstrap` with reusable CI manifest parsing, branch-policy resolution, structured GitHub run parsing, and PR status parsing helpers.
3. Add `tools/product-gate-evidence ci-runs` as the explicit network-observing collector for `product.ci.main`, optional `product.ci.pr`, and `product.ci.github_actions`.
4. Leave existing `ci-status` behavior intact as local manifest/provider-readiness evidence without GitHub calls.
5. Extend `tools/test_product_gate_tools.sh` fake `gh` coverage to return structured JSON for `gh run list --json` and `gh pr view --json`.
6. Verify that a generated product-local command records current-head main CI and PR CI as authoritative pass evidence, and that parent-side authority reads the resulting detail metadata.
7. Synchronize the evidence schema, test-plan policy, sync contract, as-built docs, tracker, handoff, and session memory.

Verification sequence:

```bash
bash -n tools/product-gate-evidence-bootstrap
bash -n tools/test_product_gate_tools.sh
./tools/test_product_gate_tools.sh
./tools/test_product_scaffold_check.sh
./tools/test_product_repository_authority.sh
./tools/check_as_built_sync_contract.sh
./tools/check_as_built_docs.sh
./tools/check_workflow_pair_sync.sh
./tools/check_test_plan_coverage.sh
./tools/test_test_plan.sh
git diff --check
```

Boundary:

- No Dashboard UI, Dashboard CSS, generated dashboard design-system output, browser mutation, push, merge, cleanup, or credential storage is part of this sync ID.

## Implemented CI Final Gate Gap-Only Safety Implementation Plan

SYNC-ID: ci_final_gate_gap_only_safety
STATUS: implemented
ARTIFACTS: docs/workflow/AS_BUILT_SYNC_CONTRACT.tsv,docs/workflow/FINAL_GATE_COVERAGE.tsv,docs/workflow/FINAL_GATE_GAP_COMMANDS.tsv,tools/ci-final-gate,tools/test_ci_final_gate.sh,docs/as-built/REQUIREMENTS.md,docs/as-built/SPECIFICATION.md,docs/as-built/IMPLEMENTATION_PLAN.md,docs/workflow/TASK_TRACKER.md,docs/workflow/HANDOFF.md
TESTS: tools/test_ci_final_gate.sh,tools/check_ci_workflow_structure.sh,tools/check_as_built_sync_contract.sh,tools/check_as_built_docs.sh,tools/check_workflow_pair_sync.sh

Implementation order:

1. Keep `repository-development-workflow` active and treat the existing final-gate optimization as the owner-layer contract to preserve.
2. Add aggregate coverage validation to the `tools/ci-final-gate --gap-only` path before final-gap commands run.
3. Keep the default final-gate path unchanged except for sharing the same coverage validation guarantee.
4. Extend `tools/test_ci_final_gate.sh` with an uncovered aggregate fixture proving `--gap-only` fails closed.
5. Extend the same regression test with a valid coverage fixture proving `--gap-only` succeeds only after validation.
6. Synchronize the as-built contract, requirements, specification, implementation plan, TASK_TRACKER, HANDOFF, and session memory under `ci_final_gate_gap_only_safety`.

Verification sequence:

```bash
bash -n tools/ci-final-gate
bash -n tools/test_ci_final_gate.sh
./tools/test_ci_final_gate.sh
./tools/check_ci_workflow_structure.sh
./tools/check_as_built_sync_contract.sh
./tools/check_as_built_docs.sh
./tools/check_workflow_pair_sync.sh
git diff --check
```

Boundary:

- Do not alter required CI workflow or job names, `tools/test_lesson_repository.sh`, full/no-cache hook semantics, same-run evidence identity checks, final-gap command contents, Dashboard UI, Playwright layout, or product repository behavior in this sync.
- No existing-feature tradeoff is allowed. If a regression appears, repair this safety layer or its tests before advancing.
## Implemented Product Authority Evidence Detail Contract Plan

SYNC-ID: product_authority_evidence_detail_contract
STATUS: implemented
ARTIFACTS: docs/workflow/AS_BUILT_SYNC_CONTRACT.tsv,docs/workflow/DASHBOARD_DATA_SCHEMA.tsv,tools/lib/product_repository_authority.sh,tools/product-repository-authority,dashboard-control-center/src/dashboardData.js,tests/fixtures/dashboard-control-center.json,tests/fixtures/dashboard-control-center-live-update.json,tools/test_product_repository_authority.sh,tools/test_dashboard_schema.sh,tools/test_dashboard_data.sh,docs/as-built/REQUIREMENTS.md,docs/as-built/SPECIFICATION.md,docs/as-built/IMPLEMENTATION_PLAN.md,docs/workflow/TASK_TRACKER.md,docs/workflow/HANDOFF.md
TESTS: tools/test_product_repository_authority.sh,tools/test_dashboard_schema.sh,tools/test_dashboard_data.sh,tools/check_as_built_sync_contract.sh,tools/check_as_built_docs.sh,tools/check_workflow_pair_sync.sh

1. Confirmed `tools/lib/product_repository_authority.sh` already emits detail fields for product authority evidence items.
2. Promoted the matching Dashboard schema rows from `planned` to `implemented` and added implemented rows for `context`, `max_age_seconds`, and `product_root`.
3. Strengthened `dashboard-control-center/src/dashboardData.js` validation for the detail contract without changing UI rendering or evidence collection.
4. Updated Dashboard Control Center fixtures to carry the same item detail fields as the producer output.
5. Strengthened `tools/test_product_repository_authority.sh`, `tools/test_dashboard_schema.sh`, and `tools/test_dashboard_data.sh` so missing or malformed evidence detail fields fail locally and in aggregate checks.
6. Synchronized this implemented state across the as-built documents, workflow tracker, handoff, sync contract, and session memory.

## Implemented Dashboard Browser Debug Manifest Boundary Plan

SYNC-ID: dashboard_browser_debug_manifest
STATUS: implemented
ARTIFACTS: docs/workflow/AS_BUILT_SYNC_CONTRACT.tsv,docs/workflow/TEST_PLAN_MANIFEST.tsv,docs/workflow/GIT_HOOK_CHECKS.tsv,docs/workflow/GIT_HOOK_PARALLEL_GROUPS.tsv,docs/workflow/FINAL_GATE_COVERAGE.tsv,tools/dashboard-browser-debug-manifest,tools/test_dashboard_browser_debug_manifest.sh,tools/test_lesson_repository.sh,docs/as-built/REQUIREMENTS.md,docs/as-built/SPECIFICATION.md,docs/as-built/IMPLEMENTATION_PLAN.md,docs/workflow/TASK_TRACKER.md,docs/workflow/HANDOFF.md
TESTS: tools/test_dashboard_browser_debug_manifest.sh,tools/check_test_plan_coverage.sh,tools/test_test_plan.sh,tools/test_git_hooks.sh,tools/test_git_hooks_parallel.sh,tools/test_ci_final_gate.sh,tools/check_as_built_sync_contract.sh,tools/check_as_built_docs.sh,tools/check_workflow_pair_sync.sh

1. Add a lesson-owned Browser Debug target-manifest generator for Dashboard Control Center review.
2. Project `tools/dashboard-data` into bounded inline `dashboard_context` source data instead of making Browser Debug CLI read lesson files.
3. Declare Control Center routes, page roles, source bindings, user questions, review brief, and rubric in the lesson manifest.
4. Keep Git, CI, blocker, repository-selection, workflow-state, and next-safe-action semantics in this repository.
5. Add a focused manifest contract test and wire it into the lesson repository aggregate test.
6. Preserve existing Dashboard runtime behavior, Browser Debug CLI generic runtime boundaries, and all existing checks.

## Implemented Dashboard Browser Debug Agent Handoff Plan

SYNC-ID: dashboard_browser_debug_agent_handoff
STATUS: implemented
ARTIFACTS: docs/workflow/AS_BUILT_SYNC_CONTRACT.tsv,docs/workflow/DASHBOARD_DATA_SCHEMA.tsv,tools/dashboard-data,dashboard-control-center/src/dashboardData.js,dashboard-control-center/src/App.jsx,dashboard-control-center/src/i18n.js,tests/playwright/dashboard-control-center.spec.js,tools/test_dashboard_schema.sh,tools/test_dashboard_data.sh,docs/as-built/REQUIREMENTS.md,docs/as-built/SPECIFICATION.md,docs/as-built/IMPLEMENTATION_PLAN.md,docs/workflow/TASK_TRACKER.md,docs/workflow/HANDOFF.md
TESTS: tools/test_dashboard_schema.sh,tools/test_dashboard_data.sh,tools/test_dashboard_i18n.sh,tools/test_dashboard_control_center.sh,tools/check_as_built_sync_contract.sh,tools/check_as_built_docs.sh,tools/check_workflow_pair_sync.sh,tools/check_repository_development_workflow.sh,tools/test_repository_development_workflow.sh

1. Add `browser_debug` producer JSON to `tools/dashboard-data` with stage status, artifact paths, command previews, and explicit false boundary flags.
2. Add Dashboard schema rows and producer tests for the Browser Debug handoff contract.
3. Validate the optional section in `dashboard-control-center/src/dashboardData.js` without requiring older fixtures to fail.
4. Add a Maintenance Sync handoff panel using existing cards, tables, status pills, command chips, and localized strings.
5. Extend the Browser Debug CLI free-development Playwright fixture so the selected repository page proves handoff state is visible and does not leak absolute paths.
6. Synchronize requirements, specification, implementation plan, TASK_TRACKER, HANDOFF, and the as-built sync contract.

Boundary:

- Do not run Browser Debug CLI, launch browsers, call provider APIs, upload artifacts, persist credentials, mutate product repositories, or change existing Git/CI/product authority behavior in this sync.

## Dashboard Control Center Operational Decision Evidence Implementation Plan

SYNC-ID: dashboard_control_center_operational_decision_evidence
STATUS: implemented
ARTIFACTS: docs/workflow/AS_BUILT_SYNC_CONTRACT.tsv,docs/workflow/DASHBOARD_DATA_SCHEMA.tsv,tools/lib/dashboard_data.sh,tools/dashboard-data,dashboard-control-center/src/dashboardData.js,dashboard-control-center/src/App.jsx,tools/test_dashboard_schema.sh,tools/test_dashboard_data.sh,tools/test_dashboard_control_center.sh,docs/as-built/REQUIREMENTS.md,docs/as-built/SPECIFICATION.md,docs/as-built/IMPLEMENTATION_PLAN.md,docs/workflow/TASK_TRACKER.md,docs/workflow/HANDOFF.md
TESTS: tools/test_dashboard_schema.sh,tools/test_dashboard_data.sh,tools/test_dashboard_control_center.sh,tools/check_as_built_sync_contract.sh,tools/check_as_built_docs.sh,tools/check_workflow_pair_sync.sh,tools/check_repository_development_workflow.sh,tools/test_repository_development_workflow.sh

Implemented order:

1. Extended `DASHBOARD_DATA_SCHEMA.tsv` with additive contracts for `operational_decision`, `decision_pages[]`, `development.repository_changes`, `development.repository_development`, `development.workflow_evidence_events[]`, and `development.ci_evidence[]`.
2. Added shared dashboard-data JSON helpers for operational decisions, page decisions, workflow evidence events, and CI evidence roles.
3. Extended `tools/dashboard-data` to emit selected-repository change summaries, repository-development workflow phase context, normalized workflow evidence events, CI evidence roles, and top-level/page-level decision data.
4. Strengthened `dashboardData.js` validation for current producer snapshots while preserving legacy snapshot compatibility when the new optional sections are absent.
5. Updated Control Center pages to render the producer-owned page decision summary before existing detail content, using existing `DetailDecisionSummary` styles and no new CSS primitives.
6. Extended existing dashboard schema and data tests instead of adding one-off test files, keeping checks standalone and aggregate-callable.

Verification sequence:

```bash
./tools/test_dashboard_schema.sh
./tools/test_dashboard_data.sh
./tools/test_dashboard_control_center.sh
./tools/check_as_built_sync_contract.sh
./tools/check_as_built_docs.sh
./tools/check_workflow_pair_sync.sh
./tools/check_repository_development_workflow.sh
./tools/test_repository_development_workflow.sh
git diff --check
```

Boundary:

- Dashboard remains a read-only observer and command-preview surface.
- The implementation does not run or wait for GitHub Actions, change product authority semantics, add browser-triggered repository mutation, edit design-system tokens/components, add dependencies, push, create PRs, merge, clean up, or execute external product writes.

## Implemented Product Authority Evidence Source Completion Implementation Plan

SYNC-ID: product_authority_evidence_source_completion
STATUS: implemented
ARTIFACTS: docs/workflow/AS_BUILT_SYNC_CONTRACT.tsv,docs/workflow/DASHBOARD_DATA_SCHEMA.tsv,docs/workflow/PRODUCT_GATE_EVIDENCE_SCHEMA.tsv,tools/lib/product_repository_authority.sh,tools/product-repository-authority,tools/product-gate-evidence-bootstrap,tools/test_product_repository_authority.sh,tools/test_dashboard_schema.sh,tools/test_dashboard_data.sh,docs/as-built/REQUIREMENTS.md,docs/as-built/SPECIFICATION.md,docs/as-built/IMPLEMENTATION_PLAN.md,docs/workflow/TASK_TRACKER.md,docs/workflow/HANDOFF.md
TESTS: tools/test_product_repository_authority.sh,tools/test_dashboard_schema.sh,tools/test_dashboard_data.sh,tools/check_as_built_sync_contract.sh,tools/check_as_built_docs.sh,tools/check_workflow_pair_sync.sh,tools/check_repository_development_workflow.sh,tools/test_repository_development_workflow.sh

Planned order:

1. Keep `repository-development-workflow` active and finish this document-sync phase before runtime edits.
2. Audit product authority output for source ID, authority, freshness, product HEAD, detail artifact, blocker, risk, and next-action completeness.
3. Close gaps in the product authority owner layer and generated product-local evidence contracts without changing Dashboard UI behavior.
4. Replace any secret-like fixture literal with split/generated test data that cannot be mistaken for real credentials.
5. Add or strengthen focused product authority, dashboard schema, and dashboard data tests for stale, missing, advisory, head-mismatched, and blocked evidence.
6. Promote the sync ID only after focused tests and synchronized document checks pass.

Verification sequence:

```bash
./tools/test_product_repository_authority.sh
./tools/test_dashboard_schema.sh
./tools/test_dashboard_data.sh
./tools/check_as_built_sync_contract.sh
./tools/check_as_built_docs.sh
./tools/check_workflow_pair_sync.sh
./tools/check_repository_development_workflow.sh
./tools/test_repository_development_workflow.sh
git diff --check
```

Stop and ask before external service calls, credential handling, external product writes, Git push, PR creation, merge, cleanup, dependency changes, or any existing-feature tradeoff.

## Implemented Dashboard Control Center Decision Projection Implementation Plan

SYNC-ID: dashboard_control_center_decision_projection
STATUS: implemented
ARTIFACTS: docs/workflow/AS_BUILT_SYNC_CONTRACT.tsv,docs/workflow/DASHBOARD_DATA_SCHEMA.tsv,tools/lib/dashboard_data.sh,tools/dashboard-data,dashboard-control-center/src/dashboardData.js,tests/fixtures/dashboard-control-center.json,tests/fixtures/dashboard-control-center-live-update.json,tools/test_dashboard_schema.sh,tools/test_dashboard_data.sh,docs/as-built/REQUIREMENTS.md,docs/as-built/SPECIFICATION.md,docs/as-built/IMPLEMENTATION_PLAN.md,docs/workflow/TASK_TRACKER.md,docs/workflow/HANDOFF.md
TESTS: tools/test_dashboard_schema.sh,tools/test_dashboard_data.sh,tools/check_as_built_sync_contract.sh,tools/check_as_built_docs.sh,tools/check_workflow_pair_sync.sh,tools/check_repository_development_workflow.sh,tools/test_repository_development_workflow.sh

Planned order:

1. Consume the completed product authority evidence fields as inputs.
2. Refine `DASHBOARD_DATA_SCHEMA.tsv` for the producer-owned decision projection and page contracts.
3. Move decision cause selection into `tools/dashboard-data` / `tools/lib/dashboard_data.sh`, including blockers, Git/worktree, repository changes, repository-development phase, test/CI evidence, and workflow events.
4. Preserve live-status and advisory boundaries so ordinary Dashboard data generation does not poll GitHub or create product evidence.
5. Update fixtures so the new decision layer is exercised by tests and legacy optional compatibility remains explicit.
6. Promote only after data/schema tests prove React can render without inventing readiness.

Verification sequence:

```bash
./tools/test_dashboard_schema.sh
./tools/test_dashboard_data.sh
./tools/check_as_built_sync_contract.sh
./tools/check_as_built_docs.sh
./tools/check_workflow_pair_sync.sh
./tools/check_repository_development_workflow.sh
./tools/test_repository_development_workflow.sh
git diff --check
```

Stop and ask before browser-triggered evidence collection, GitHub polling, repository mutation, push, PR creation, merge, cleanup, credential handling, or any existing-feature tradeoff.

## Implemented Dashboard Control Center Decision Page Rendering Implementation Plan

SYNC-ID: dashboard_control_center_decision_page_rendering
STATUS: implemented
ARTIFACTS: docs/workflow/AS_BUILT_SYNC_CONTRACT.tsv,docs/workflow/DASHBOARD_DATA_SCHEMA.tsv,dashboard-control-center/src/App.jsx,dashboard-control-center/src/DecisionSummary.jsx,dashboard-control-center/src/dashboardData.js,dashboard-control-center/src/i18n.js,tests/fixtures/dashboard-control-center.json,tests/fixtures/dashboard-control-center-live-update.json,tests/playwright/dashboard-control-center.spec.js,tools/test_dashboard_schema.sh,tools/test_dashboard_data.sh,tools/test_dashboard_i18n.sh,tools/test_dashboard_control_center.sh,docs/as-built/REQUIREMENTS.md,docs/as-built/SPECIFICATION.md,docs/as-built/IMPLEMENTATION_PLAN.md,docs/workflow/TASK_TRACKER.md,docs/workflow/HANDOFF.md
TESTS: tools/test_dashboard_schema.sh,tools/test_dashboard_data.sh,tools/test_dashboard_i18n.sh,tools/test_dashboard_control_center.sh,tools/check_as_built_sync_contract.sh,tools/check_as_built_docs.sh,tools/check_workflow_pair_sync.sh,tools/check_repository_development_workflow.sh,tools/test_repository_development_workflow.sh

Planned order:

1. Reuse the existing generic renderer and existing status/command/evidence components as far as they cover the producer contract.
2. Add page-level decision rendering where each primary page shows current judgment, top reason, evidence confidence, next safe action, and technical drilldown.
3. Ensure the Overview remains readable for non-engineers while detail pages expose enough source identity for junior/intermediate engineers.
4. Extend i18n labels without hard-coding product names or product stacks.
5. Extend focused Playwright tests to cover Dashboard-wide decision visibility, source identity, command-preview boundaries, and no-overlap/no-clipping states.
6. Promote after schema/data/i18n/browser checks and sync checks pass.

Verification sequence:

```bash
./tools/test_dashboard_schema.sh
./tools/test_dashboard_data.sh
./tools/test_dashboard_i18n.sh
./tools/test_dashboard_control_center.sh
./tools/check_as_built_sync_contract.sh
./tools/check_as_built_docs.sh
./tools/check_workflow_pair_sync.sh
./tools/check_repository_development_workflow.sh
./tools/test_repository_development_workflow.sh
git diff --check
```

Use Playwright visual review when page layout or responsive behavior changes.
Stop and ask before browser command execution, repository writes, Git/CI operations, credential handling, dependency changes, or any existing-feature tradeoff.

## Implemented Dashboard Control Center Density And Mobile CSS Refinement Implementation Plan

SYNC-ID: dashboard_control_center_density_mobile_css_refinement
STATUS: implemented
ARTIFACTS: docs/workflow/AS_BUILT_SYNC_CONTRACT.tsv,docs/design-system/dashboard-control-center/DESIGN_SYSTEM.md,docs/design-system/dashboard-control-center/tokens.json,docs/design-system/dashboard-control-center/components.json,dashboard-control-center/src/design-system.generated.css,dashboard-control-center/src/design-system.generated.js,dashboard-control-center/src/App.jsx,dashboard-control-center/src/styles.css,tests/playwright/dashboard-control-center.spec.js,tools/check_dashboard_design_system.sh,tools/test_dashboard_control_center.sh,docs/as-built/REQUIREMENTS.md,docs/as-built/SPECIFICATION.md,docs/as-built/IMPLEMENTATION_PLAN.md,docs/workflow/TASK_TRACKER.md,docs/workflow/HANDOFF.md
TESTS: tools/check_dashboard_design_system.sh,tools/test_dashboard_control_center.sh,tools/check_as_built_sync_contract.sh,tools/check_as_built_docs.sh,tools/check_workflow_pair_sync.sh,tools/check_repository_development_workflow.sh,tools/test_repository_development_workflow.sh

Planned order:

1. First inspect the decision page rendering result with current design-system tokens.
2. If shared token/component dimensions need adjustment, update design-system source and regenerate runtime artifacts through the owner tool.
3. Use `styles.css` only for page-specific layout, responsive wrapping, grid constraints, and overflow prevention that remain consistent with the source tokens.
4. Verify desktop and mobile pages with Playwright screenshots when visual changes are made.
5. Promote only after design-system drift checks, browser checks, and sync checks pass.

Verification sequence:

```bash
./tools/check_dashboard_design_system.sh
./tools/test_dashboard_control_center.sh
./tools/check_as_built_sync_contract.sh
./tools/check_as_built_docs.sh
./tools/check_workflow_pair_sync.sh
./tools/check_repository_development_workflow.sh
./tools/test_repository_development_workflow.sh
git diff --check
```

Stop and ask before dependency changes, generated-file source edits, visual redesigns outside the design-system contract, external product design writes, or any existing-feature tradeoff.

## Implemented Dashboard Control Center Package And CI Verification Wiring Implementation Plan

SYNC-ID: dashboard_control_center_package_ci_verification_wiring
STATUS: implemented
ARTIFACTS: docs/workflow/AS_BUILT_SYNC_CONTRACT.tsv,docs/workflow/TEST_PLAN_MANIFEST.tsv,docs/workflow/GIT_HOOK_CHECKS.tsv,docs/workflow/GIT_HOOK_PARALLEL_GROUPS.tsv,docs/workflow/FINAL_GATE_COVERAGE.tsv,package.json,package-lock.json,.github/workflows/ci.yml,.github/workflows/lesson14-ci.yml,tools/check_ci_workflow_structure.sh,tools/check_test_plan_coverage.sh,tools/test_dashboard_control_center.sh,tools/test_lesson_repository.sh,docs/as-built/REQUIREMENTS.md,docs/as-built/SPECIFICATION.md,docs/as-built/IMPLEMENTATION_PLAN.md,docs/workflow/TASK_TRACKER.md,docs/workflow/HANDOFF.md
TESTS: tools/check_ci_workflow_structure.sh,tools/check_test_plan_coverage.sh,tools/test_test_plan.sh,tools/test_git_hooks.sh,tools/test_git_hooks_parallel.sh,tools/test_ci_final_gate.sh,tools/test_dashboard_control_center.sh,tools/check_as_built_sync_contract.sh,tools/check_as_built_docs.sh,tools/check_workflow_pair_sync.sh,tools/check_repository_development_workflow.sh,tools/test_repository_development_workflow.sh

Planned order:

1. Treat this as conditional and do not edit package or CI files unless P0/P1 implementation exposes a verification gap.
2. Prefer existing standalone tests and aggregate wiring before adding package scripts or CI workflow changes.
3. If package scripts change, preserve `package-lock.json` integrity and avoid new dependencies unless explicitly justified.
4. If CI/hook/final-gate wiring changes, preserve required CI names, Lesson14 compatibility, full/no-cache meaning, final-gate coverage, and aggregate fallback behavior.
5. Promote only after structure, test-plan, hook, final-gate, dashboard, aggregate, and sync checks are consistent.

Verification sequence:

```bash
./tools/check_ci_workflow_structure.sh
./tools/check_test_plan_coverage.sh
./tools/test_test_plan.sh
./tools/test_git_hooks.sh
./tools/test_git_hooks_parallel.sh
./tools/test_ci_final_gate.sh
./tools/test_dashboard_control_center.sh
./tools/test_lesson_repository.sh
./tools/check_as_built_sync_contract.sh
./tools/check_as_built_docs.sh
./tools/check_workflow_pair_sync.sh
./tools/check_repository_development_workflow.sh
./tools/test_repository_development_workflow.sh
git diff --check
```

Stop and ask before dependency installation, CI authority changes, required check renames, push, PR creation, merge, main CI waiting, cleanup, credentials, or any existing-feature tradeoff.

## Implemented Dashboard Control Center Component Module Extraction Implementation Plan

SYNC-ID: dashboard_control_center_component_module_extraction
STATUS: implemented
ARTIFACTS: docs/workflow/AS_BUILT_SYNC_CONTRACT.tsv,dashboard-control-center/src/App.jsx,dashboard-control-center/src/dashboardContext.js,dashboard-control-center/src/DecisionSummary.jsx,dashboard-control-center/src/dashboardData.js,dashboard-control-center/src/i18n.js,dashboard-control-center/src/styles.css,tests/playwright/dashboard-control-center.spec.js,tools/test_dashboard_i18n.sh,tools/test_dashboard_control_center.sh,docs/as-built/REQUIREMENTS.md,docs/as-built/SPECIFICATION.md,docs/as-built/IMPLEMENTATION_PLAN.md,docs/workflow/TASK_TRACKER.md,docs/workflow/HANDOFF.md
TESTS: tools/test_dashboard_i18n.sh,tools/test_dashboard_control_center.sh,tools/check_as_built_sync_contract.sh,tools/check_as_built_docs.sh,tools/check_workflow_pair_sync.sh,tools/check_repository_development_workflow.sh,tools/test_repository_development_workflow.sh

Planned order:

1. Defer extraction until decision projection, rendering, and any required CSS refinement are implemented and tested.
2. Identify reusable page/evidence components already implied by `App.jsx` without changing data ownership or route behavior.
3. Extract modules in small behavior-preserving steps, keeping i18n keys and existing component props stable.
4. Keep the active-menu/context selection logic in `dashboard-control-center/src/dashboardContext.js` so page rendering and context-switch refresh can share the same producer-owned resolution rules.
5. Run focused i18n and Dashboard browser tests after each extraction slice.
6. Promote only after no behavior, route, readiness, style, or accessibility regression is observed.

Verification sequence:

```bash
./tools/test_dashboard_i18n.sh
./tools/test_dashboard_control_center.sh
./tools/check_as_built_sync_contract.sh
./tools/check_as_built_docs.sh
./tools/check_workflow_pair_sync.sh
./tools/check_repository_development_workflow.sh
./tools/test_repository_development_workflow.sh
git diff --check
```

Stop and ask before changing runtime behavior, data production, design-system authority, dependencies, Git/CI behavior, external product writes, or any existing-feature tradeoff.

## Dashboard Control Center Settings Control Policy Refinement Implementation Plan

SYNC-ID: dashboard_control_center_settings_control_policy_refinement
STATUS: implemented
ARTIFACTS: docs/workflow/AS_BUILT_SYNC_CONTRACT.tsv,tools/dashboard-settings,vite.config.mjs,dashboard-control-center/src/dashboardData.js,dashboard-control-center/src/App.jsx,dashboard-control-center/src/i18n.js,tests/playwright/dashboard-control-center.spec.js,tools/test_dashboard_settings.sh,tools/test_dashboard_control_center.sh,tools/test_dashboard_i18n.sh,tools/check_dashboard_design_system.sh,tools/test_dashboard_design_studio_events.sh,docs/as-built/REQUIREMENTS.md,docs/as-built/SPECIFICATION.md,docs/as-built/IMPLEMENTATION_PLAN.md,docs/workflow/TASK_TRACKER.md,docs/workflow/HANDOFF.md
TESTS: tools/test_dashboard_settings.sh,tools/test_dashboard_control_center.sh,tools/test_dashboard_i18n.sh,tools/check_dashboard_design_system.sh,tools/test_dashboard_design_studio_events.sh,tools/check_as_built_sync_contract.sh,tools/check_as_built_docs.sh,tools/check_workflow_pair_sync.sh,tools/check_repository_development_workflow.sh,tools/test_repository_development_workflow.sh

Implemented order:

1. Synchronized this sync ID across the contract, requirements, specification, implementation plan, tracker, and handoff before runtime edits.
2. Extended `tools/dashboard-settings` so guarded apply can verify expected current value, current label, setting kind, and target file at the owner layer before writes.
3. Added Settings plan-token creation and consumption to `vite.config.mjs`, matching the Design Studio one-time server-memory token pattern and preserving same-origin, JSON, POST, body-size, unknown-field, and `execFile` boundaries.
4. Updated `dashboard-control-center/src/dashboardData.js` so Settings mutation responses and requests validate and carry `plan_token`, `snapshot_id`, and `content_hash`.
5. Updated `dashboard-control-center/src/App.jsx` so planned Settings changes keep token state, invalidate stale plans on draft/menu/setting/snapshot changes, require a current token for apply, and present Git workflow settings as saved settings rather than browser-run operations.
6. Updated `dashboard-control-center/src/i18n.js` for manual, automatic, approval-required, allowed, disallowed, not-applicable, technical-details, token error, and read-only boundary language across supported Dashboard locales.
7. Kept Design Studio target scope unchanged and verified drift/event checks still pass.
8. Promoted this sync ID after focused Settings, Control Center, i18n, Design Studio drift/event, repository-development, and sync checks passed.

Verification sequence:

```bash
./tools/test_dashboard_settings.sh
./tools/test_dashboard_control_center.sh
./tools/test_dashboard_i18n.sh
./tools/check_dashboard_design_system.sh
./tools/test_dashboard_design_studio_events.sh
./tools/check_as_built_sync_contract.sh
./tools/check_as_built_docs.sh
./tools/check_workflow_pair_sync.sh
./tools/check_repository_development_workflow.sh
./tools/test_repository_development_workflow.sh
git diff --check
```

Use Playwright visual review for the Settings page and updated warning/technical-detail surfaces if focused Control Center tests do not already cover the rendered behavior.
Stop and ask before arbitrary command execution, product repository writes, external product design writes, Git operations, CI waiting, OAuth, credentials, dependency changes, generated-file source edits, cleanup, delete, push, PR creation, merge, main sync, or any existing-feature tradeoff.

## Dashboard Control Center Display Depth Settings Implementation Plan

SYNC-ID: dashboard_control_center_display_depth_settings
STATUS: implemented
ARTIFACTS: docs/workflow/AS_BUILT_SYNC_CONTRACT.tsv,learning/DASHBOARD_DISPLAY_DEPTH.tsv,tools/lib/dashboard_display_depth.sh,tools/dashboard-settings,tools/dashboard-data,docs/workflow/DASHBOARD_DATA_SCHEMA.tsv,docs/workflow/TEST_PLAN_MANIFEST.tsv,vite.config.mjs,dashboard-control-center/src/dashboardData.js,dashboard-control-center/src/App.jsx,dashboard-control-center/src/i18n.js,tests/fixtures/dashboard-control-center.json,tests/fixtures/dashboard-control-center-live-update.json,tests/playwright/dashboard-control-center.spec.js,tools/test_dashboard_settings.sh,tools/test_dashboard_data.sh,tools/test_dashboard_i18n.sh,tools/test_dashboard_control_center.sh,docs/as-built/REQUIREMENTS.md,docs/as-built/SPECIFICATION.md,docs/as-built/IMPLEMENTATION_PLAN.md,docs/workflow/TASK_TRACKER.md,docs/workflow/HANDOFF.md
TESTS: tools/test_dashboard_settings.sh,tools/test_dashboard_schema.sh,tools/test_dashboard_data.sh,tools/test_dashboard_i18n.sh,tools/test_dashboard_control_center.sh,tools/check_dashboard_design_system.sh,tools/check_test_plan_coverage.sh,tools/check_as_built_sync_contract.sh,tools/check_as_built_docs.sh,tools/check_workflow_pair_sync.sh,tools/check_repository_development_workflow.sh,tools/test_repository_development_workflow.sh

Implemented order:

1. Synchronized this planned block across the as-built contract, requirements, specification, implementation plan, tracker, and handoff before runtime edits.
2. Added `learning/DASHBOARD_DISPLAY_DEPTH.tsv` and `tools/lib/dashboard_display_depth.sh` for strict value normalization and atomic writes.
3. Extended `tools/dashboard-settings` to plan and apply `dashboard_display_depth` through the existing token-bound Settings mutation contract.
4. Extended `tools/dashboard-data`, `docs/workflow/DASHBOARD_DATA_SCHEMA.tsv`, and test-plan coverage for `summary.display_depth` and the Settings catalog item.
5. Updated Dashboard Control Center validation, labels, rendered Settings rows, and technical disclosure defaults while preserving standard mode as the existing baseline.
6. Updated fixtures and Playwright coverage for the display-depth Settings row and technical source-boundary disclosure.
7. Ran focused settings, schema, data, i18n, Playwright control-center, design-system, and test-plan coverage checks before promotion.

Stop and ask before changing lesson step behavior, lesson mode semantics, Git workflow policy authority, Design Studio source authority, dependencies, product repository writes, arbitrary browser command execution, push, PR creation, merge, cleanup, delete, or any existing-feature tradeoff.

## Dashboard Control Center Display Depth Phase 2 Implementation Plan

SYNC-ID: dashboard_control_center_display_depth_phase_2
STATUS: implemented
ARTIFACTS: docs/workflow/AS_BUILT_SYNC_CONTRACT.tsv,tools/lib/dashboard_data.sh,tools/dashboard-data,dashboard-control-center/src/displayDepth.js,dashboard-control-center/src/App.jsx,dashboard-control-center/src/DecisionSummary.jsx,dashboard-control-center/src/dashboardData.js,dashboard-control-center/src/i18n.js,tests/fixtures/dashboard-control-center.json,tests/fixtures/dashboard-control-center-live-update.json,tests/playwright/dashboard-control-center.spec.js,tools/test_dashboard_schema.sh,tools/test_dashboard_data.sh,tools/test_dashboard_i18n.sh,tools/test_dashboard_control_center.sh,docs/as-built/REQUIREMENTS.md,docs/as-built/SPECIFICATION.md,docs/as-built/IMPLEMENTATION_PLAN.md,docs/workflow/TASK_TRACKER.md,docs/workflow/HANDOFF.md
TESTS: tools/test_dashboard_schema.sh,tools/test_dashboard_data.sh,tools/test_dashboard_i18n.sh,tools/test_dashboard_control_center.sh,tools/check_as_built_sync_contract.sh,tools/check_as_built_docs.sh,tools/check_workflow_pair_sync.sh,tools/check_repository_development_workflow.sh,tools/test_repository_development_workflow.sh

Implemented order:

1. Synchronized this block before runtime edits and kept the scope limited to display policy, producer-owned decision text, and shared rendering surfaces.
2. Added `dashboard-control-center/src/displayDepth.js` as the shared Dashboard display-depth policy module.
3. Replaced direct display-depth comparisons in shared surfaces with reusable policy flags while preserving `standard` as the current baseline.
4. Improved producer-owned decision-page questions through existing `decision_pages[]` fields without adding schema fields.
5. Applied the policy to `ProducerDecisionSummary`, `SourceBoundary`, Settings technical result details, evidence reference chips, and command previews without hiding safety state or adding browser execution authority.
6. Extended Playwright coverage for `friendly`, `standard`, and `technical` behavior, including safety-signal visibility and disclosure defaults.
7. Promoted this sync ID to implemented after focused dashboard, data/schema, i18n, sync, and repository-development checks passed.

Verification sequence:

```bash
./tools/test_dashboard_schema.sh
./tools/test_dashboard_data.sh
./tools/test_dashboard_i18n.sh
./tools/test_dashboard_control_center.sh
./tools/check_as_built_sync_contract.sh
./tools/check_as_built_docs.sh
./tools/check_workflow_pair_sync.sh
./tools/check_repository_development_workflow.sh
./tools/test_repository_development_workflow.sh
git diff --check
```

Stop and ask before dependency changes, Settings authority expansion, arbitrary command execution, Git/CI operations, product repository writes, Design Studio authority changes, generated-file source edits, cleanup, push, PR creation, merge, or any existing-feature tradeoff.

## Dashboard Control Center Operational Situation Board Implementation Plan

SYNC-ID: dashboard_control_center_operational_situation_board
STATUS: implemented
ARTIFACTS: docs/workflow/AS_BUILT_SYNC_CONTRACT.tsv,dashboard-control-center/src/App.jsx,dashboard-control-center/src/i18n.js,dashboard-control-center/src/styles.css,tests/playwright/dashboard-control-center.spec.js,tools/test_dashboard_i18n.sh,tools/test_dashboard_control_center.sh,tools/check_dashboard_design_system.sh,docs/as-built/REQUIREMENTS.md,docs/as-built/SPECIFICATION.md,docs/as-built/IMPLEMENTATION_PLAN.md,docs/workflow/TASK_TRACKER.md,docs/workflow/HANDOFF.md
TESTS: tools/test_dashboard_i18n.sh,tools/test_dashboard_control_center.sh,tools/check_dashboard_design_system.sh,tools/check_as_built_sync_contract.sh,tools/check_as_built_docs.sh,tools/check_workflow_pair_sync.sh,tools/check_repository_development_workflow.sh,tools/test_repository_development_workflow.sh

Implemented order:

1. Synchronize this plan across the as-built contract, requirements, specification, implementation plan, tracker, and handoff before runtime edits.
2. Add reusable Overview helpers that summarize selected context, matching live repository state, blockers, Git/worktree counts, local tests, CI, and next-safe-action text without changing data authority.
3. Add an `OperationalSituationBoard` overview component using existing status, command-preview, source, and display-depth conventions.
4. Add localized labels for the board in the Dashboard i18n layer while relying on generated locale fallbacks for non-English/non-Japanese locales.
5. Add page-specific responsive CSS for the board using existing Dashboard tokens and without editing generated design-system artifacts.
6. Extend Playwright coverage for default overview rendering and live-status updates, including dirty worktree, branch, tests, CI, blockers, and next safe check visibility.
7. Run focused i18n, Control Center, design-system, sync, and repository-development checks before promotion.

Verification sequence:

```bash
./tools/test_dashboard_i18n.sh
./tools/test_dashboard_control_center.sh
./tools/check_dashboard_design_system.sh
./tools/check_as_built_sync_contract.sh
./tools/check_as_built_docs.sh
./tools/check_workflow_pair_sync.sh
./tools/check_repository_development_workflow.sh
./tools/test_repository_development_workflow.sh
git diff --check
```

Stop and ask before adding dependencies, changing generated design-system files as source, browser command execution, Git/CI operations, repository writes, approval writes, cleanup, push, PR creation, merge, main sync, credentials, or any existing-feature tradeoff.

## Dashboard Control Center Operational Detail Decisions Implementation Plan

SYNC-ID: dashboard_control_center_operational_detail_decisions
STATUS: implemented
ARTIFACTS: docs/workflow/AS_BUILT_SYNC_CONTRACT.tsv,dashboard-control-center/src/App.jsx,dashboard-control-center/src/i18n.js,dashboard-control-center/src/styles.css,tests/playwright/dashboard-control-center.spec.js,tools/test_dashboard_i18n.sh,tools/test_dashboard_control_center.sh,tools/check_dashboard_design_system.sh,docs/as-built/REQUIREMENTS.md,docs/as-built/SPECIFICATION.md,docs/as-built/IMPLEMENTATION_PLAN.md,docs/workflow/TASK_TRACKER.md,docs/workflow/HANDOFF.md
TESTS: tools/test_dashboard_i18n.sh,tools/test_dashboard_control_center.sh,tools/check_dashboard_design_system.sh,tools/check_as_built_sync_contract.sh,tools/check_as_built_docs.sh,tools/check_workflow_pair_sync.sh,tools/check_repository_development_workflow.sh,tools/test_repository_development_workflow.sh

Implemented order:

1. Synchronize this plan across the as-built contract, requirements, specification, implementation plan, tracker, and handoff before runtime edits.
2. Add reusable detail-page helpers that reuse the overview situation summaries for blockers, Git/worktree, tests/CI, and next safe check.
3. Add a shared `OperationalDetailDecisionPanel` for Workflow, Maintenance Sync, Safety, and Repository Info pages.
4. Add localized labels for the panel and evidence queue in the Dashboard i18n layer.
5. Add scoped responsive CSS using existing Dashboard design-system tokens and without editing generated artifacts.
6. Extend Playwright coverage for detail-page rendering and live-status judgment material.
7. Run focused i18n, Control Center, design-system, sync, and repository-development checks before promotion.

Verification sequence:

```bash
./tools/test_dashboard_i18n.sh
./tools/test_dashboard_control_center.sh
./tools/check_dashboard_design_system.sh
./tools/check_as_built_sync_contract.sh
./tools/check_as_built_docs.sh
./tools/check_workflow_pair_sync.sh
./tools/check_repository_development_workflow.sh
./tools/test_repository_development_workflow.sh
git diff --check
```

Stop and ask before adding dependencies, changing generated design-system files as source, browser command execution, Git/CI operations, repository writes, approval writes, cleanup, push, PR creation, merge, main sync, credentials, Settings authority expansion, Design Studio authority expansion, or any existing-feature tradeoff.

## Dashboard Control Center Bundle Contract Implementation Plan

SYNC-ID: dashboard_control_center_bundle_contract
STATUS: implemented
ARTIFACTS: docs/workflow/AS_BUILT_SYNC_CONTRACT.tsv,package.json,vite.config.mjs,dashboard-control-center/src/dashboardData.js,dashboard-control-center/src/i18n.js,dashboard-control-center/src/localePolicy.js,tools/check_dashboard_bundle_contract.mjs,tools/check_dashboard_bundle_contract.sh,docs/workflow/TEST_PLAN_MANIFEST.tsv,docs/workflow/GIT_HOOK_CHECKS.tsv,docs/workflow/GIT_HOOK_PARALLEL_GROUPS.tsv,docs/workflow/FINAL_GATE_COVERAGE.tsv,.github/workflows/ci.yml,.github/workflows/lesson14-ci.yml,tools/test_lesson_repository.sh,tools/check_ci_workflow_structure.sh,docs/as-built/REQUIREMENTS.md,docs/as-built/SPECIFICATION.md,docs/as-built/IMPLEMENTATION_PLAN.md,docs/workflow/TASK_TRACKER.md,docs/workflow/HANDOFF.md
TESTS: tools/check_dashboard_bundle_contract.sh,tools/test_dashboard_i18n.sh,tools/test_dashboard_control_center.sh,tools/check_test_plan_coverage.sh,tools/test_test_plan.sh,tools/test_git_hooks.sh,tools/test_git_hooks_parallel.sh,tools/test_ci_final_gate.sh,tools/check_ci_workflow_structure.sh,tools/check_as_built_sync_contract.sh,tools/check_as_built_docs.sh,tools/check_workflow_pair_sync.sh,tools/check_repository_development_workflow.sh,tools/test_repository_development_workflow.sh

Implemented order:

1. Synchronize this bundle-contract plan across the as-built contract, requirements, specification, implementation plan, tracker, and handoff.
2. Add a Dashboard Control Center bundle contract checker modeled after the FrameCue Control Center build contract.
3. Move lightweight locale metadata out of the full i18n dictionary and split Vite output into deterministic dashboard data runtime, i18n, generated design-system, React vendor, and icon vendor chunks without raising `chunkSizeWarningLimit`.
4. Expose the check through `npm run dashboard:build-check` and an executable `tools/check_dashboard_bundle_contract.sh` wrapper.
5. Wire the check into test-plan policy, Git hooks, hook parallel classification, final-gate coverage, CI policy jobs, CI structure validation, and aggregate repository verification.
6. Verify that a fresh production build emits no large-chunk warning and that all JavaScript chunks stay within the configured budgets.

Verification sequence:

```bash
./tools/check_dashboard_bundle_contract.sh
./tools/test_dashboard_i18n.sh
./tools/test_dashboard_control_center.sh
./tools/check_test_plan_coverage.sh
./tools/test_test_plan.sh
./tools/test_git_hooks.sh
./tools/test_git_hooks_parallel.sh
./tools/test_ci_final_gate.sh
./tools/check_ci_workflow_structure.sh
./tools/check_as_built_sync_contract.sh
./tools/check_as_built_docs.sh
./tools/check_workflow_pair_sync.sh
./tools/check_repository_development_workflow.sh
./tools/test_repository_development_workflow.sh
git diff --check
```

Stop and ask before dependency changes, raising chunk-size warning limits to hide warnings, weakening Git hooks or final gates, changing generated design-system files as source, browser command execution, repository writes, cleanup, push, PR creation, merge, main sync, credentials, or any existing-feature tradeoff.

## Implemented Product AGENTS Lesson Gate Alignment Implementation Plan

SYNC-ID: product_agents_lesson_gate_alignment
STATUS: implemented
ARTIFACTS: docs/workflow/AS_BUILT_SYNC_CONTRACT.tsv,lesson/SYNC_GATES_14_DAYS.tsv,lesson/LESSON_FLOW_14_DAYS.tsv,lesson/LESSON_FLOW.tsv,tools/check_lesson14_sync.sh,tools/test_lesson14.sh,docs/as-built/REQUIREMENTS.md,docs/as-built/SPECIFICATION.md,docs/as-built/IMPLEMENTATION_PLAN.md,docs/workflow/TASK_TRACKER.md,docs/workflow/HANDOFF.md
TESTS: tools/check_lesson14_sync.sh,tools/test_lesson14.sh,tools/test_product_scaffold_check.sh,tools/check_agents_skills.sh,tools/check_as_built_sync_contract.sh,tools/check_as_built_docs.sh,tools/check_workflow_pair_sync.sh,tools/check_repository_development_workflow.sh,tools/test_repository_development_workflow.sh

Implemented order:

1. Synchronized this planned block before runtime edits.
2. Replaced product required-document references from `AGENT.md` to `AGENTS.MD` in STEP 1-14 gates and lesson flows.
3. Preserved any legacy `AGENT.md` mention only when it is clearly described as a migration/deprecation target.
4. Added sync and regression checks that fail when required product docs reintroduce legacy `AGENT.md`.
5. Promoted this sync ID to implemented after focused lesson and synchronization checks passed.

Stop and ask before editing AGENTS.MD invariants, mutating external product repositories, deleting product files, changing lesson progression, changing Git/CI authority, or accepting an existing-feature tradeoff.

## Implemented Dashboard Control Center Evidence Presentation Clarity Implementation Plan

SYNC-ID: dashboard_control_center_evidence_presentation_clarity
STATUS: implemented
ARTIFACTS: docs/workflow/AS_BUILT_SYNC_CONTRACT.tsv,dashboard-control-center/src/displayDepth.js,dashboard-control-center/src/App.jsx,dashboard-control-center/src/DecisionSummary.jsx,dashboard-control-center/src/i18n.js,tests/playwright/dashboard-control-center.spec.js,tools/test_dashboard_i18n.sh,tools/test_dashboard_control_center.sh,docs/as-built/REQUIREMENTS.md,docs/as-built/SPECIFICATION.md,docs/as-built/IMPLEMENTATION_PLAN.md,docs/workflow/TASK_TRACKER.md,docs/workflow/HANDOFF.md
TESTS: tools/test_dashboard_i18n.sh,tools/test_dashboard_control_center.sh,tools/check_dashboard_design_system.sh,tools/check_as_built_sync_contract.sh,tools/check_as_built_docs.sh,tools/check_workflow_pair_sync.sh,tools/check_repository_development_workflow.sh,tools/test_repository_development_workflow.sh

Implemented order:

1. Synchronized this planned block before runtime edits.
2. Renamed or supplemented display-depth policy fields so folded technical reference behavior is explicit and `standard` remains the compatibility baseline.
3. Added live/snapshot freshness helpers and localized labels for live observation, saved snapshot fallback, and last validated snapshot.
4. Used the helper in overview and operational detail freshness displays without changing data authority.
5. Extended Playwright coverage for display-depth semantics and live/snapshot fallback wording.
6. Promoted this sync ID to implemented after focused Dashboard, i18n, design-system, sync, and repository-development checks passed.

Stop and ask before adding command execution, new live authority, GitHub calls, repository writes, Settings authority, Design Studio authority, dependencies, or broad visual redesign.

## Implemented Dashboard Control Center CI Evidence Guidance Implementation Plan

SYNC-ID: dashboard_control_center_ci_evidence_guidance
STATUS: implemented
ARTIFACTS: docs/workflow/AS_BUILT_SYNC_CONTRACT.tsv,docs/workflow/PRODUCT_GATE_EVIDENCE_SCHEMA.tsv,tools/product-gate-evidence-bootstrap,tools/lib/dashboard_data.sh,tools/dashboard-data,dashboard-control-center/src/App.jsx,dashboard-control-center/src/i18n.js,tests/playwright/dashboard-control-center.spec.js,tools/test_product_gate_tools.sh,tools/test_dashboard_data.sh,tools/test_dashboard_i18n.sh,tools/test_dashboard_control_center.sh,docs/as-built/REQUIREMENTS.md,docs/as-built/SPECIFICATION.md,docs/as-built/IMPLEMENTATION_PLAN.md,docs/workflow/TASK_TRACKER.md,docs/workflow/HANDOFF.md
TESTS: tools/test_product_gate_tools.sh,tools/test_dashboard_data.sh,tools/test_dashboard_i18n.sh,tools/test_dashboard_control_center.sh,tools/check_as_built_sync_contract.sh,tools/check_as_built_docs.sh,tools/check_workflow_pair_sync.sh,tools/check_repository_development_workflow.sh,tools/test_repository_development_workflow.sh

Implemented order:

1. Synchronized this planned block before runtime edits.
2. Kept `ci-runs` execution product-local and explicit while improving next-command/read-only guidance for missing or manual-required CI run evidence.
3. Reused existing product authority and recent-run fields before adding schema fields.
4. Rendered CI collection guidance through existing command-preview/read-only UI.
5. Extended product-gate, dashboard-data, i18n, and Control Center tests for not-run/manual-required/stale guidance.
6. Promoted this sync ID to implemented after focused product-gate, dashboard-data, Dashboard, sync, and repository-development checks passed.

Stop and ask before browser-triggered CI collection, background polling, OAuth, credentials, provider calls from Dashboard data, Git operations, external product writes, push, merge, or main CI waiting.

## Implemented Dashboard Design Studio Candidate Import Foundation Implementation Plan

SYNC-ID: dashboard_design_studio_candidate_import_foundation
STATUS: implemented
ARTIFACTS: docs/workflow/AS_BUILT_SYNC_CONTRACT.tsv,tools/dashboard-design-system,tools/test_dashboard_design_studio_events.sh,docs/as-built/REQUIREMENTS.md,docs/as-built/SPECIFICATION.md,docs/as-built/IMPLEMENTATION_PLAN.md,docs/workflow/TASK_TRACKER.md,docs/workflow/HANDOFF.md
TESTS: tools/test_dashboard_design_studio_events.sh,tools/check_dashboard_design_system.sh,tools/check_as_built_sync_contract.sh,tools/check_as_built_docs.sh,tools/check_workflow_pair_sync.sh,tools/check_repository_development_workflow.sh,tools/test_repository_development_workflow.sh

Implemented order:

1. Synchronized this planned block before runtime edits.
2. Added owner-tool import commands for local CandidateEnvelope and DesignChangeProposal JSON.
3. Validated required/forbidden fields from the orchestration contract and rejected secret-like, direct-apply, credential, shell, patch, and external-product-apply payloads.
4. Persisted append-only redacted metadata with hashes and bounded previews in the existing Design Studio runtime store model.
5. Added regression coverage for valid imports, missing fields, forbidden fields, secret-like payloads, raw payload persistence, blocked provider boundaries, and no generated plan/apply tokens.
6. Promoted this sync ID to implemented after focused Design Studio, design-system, sync, and repository-development checks passed.

Stop and ask before provider API dispatch, subscription-agent background execution, imagegen calls, mock image mutation, external product writes, browser mutation endpoints, dependencies, credentials, Git/CI execution, cleanup, push, PR creation, merge, or any existing-feature tradeoff.

## Implemented Dashboard Design Studio Proposal Workflow Foundation Implementation Plan

SYNC-ID: dashboard_design_studio_proposal_workflow_foundation
STATUS: implemented
ARTIFACTS: docs/workflow/AS_BUILT_SYNC_CONTRACT.tsv,docs/workflow/DASHBOARD_DATA_SCHEMA.tsv,docs/design-system/dashboard-control-center/orchestration.json,dashboard-control-center/src/design-system.generated.js,tools/dashboard-design-system,tools/dashboard-data,dashboard-control-center/src/App.jsx,dashboard-control-center/src/i18n.js,tests/playwright/dashboard-control-center.spec.js,tools/test_dashboard_design_studio_events.sh,tools/test_dashboard_data.sh,tools/test_dashboard_i18n.sh,tools/test_dashboard_control_center.sh,docs/as-built/REQUIREMENTS.md,docs/as-built/SPECIFICATION.md,docs/as-built/IMPLEMENTATION_PLAN.md,docs/workflow/TASK_TRACKER.md,docs/workflow/HANDOFF.md
TESTS: tools/test_dashboard_design_studio_events.sh,tools/check_dashboard_design_system.sh,tools/test_dashboard_data.sh,tools/test_dashboard_i18n.sh,tools/test_dashboard_control_center.sh,tools/check_as_built_sync_contract.sh,tools/check_as_built_docs.sh,tools/check_workflow_pair_sync.sh,tools/check_repository_development_workflow.sh,tools/test_repository_development_workflow.sh

Implemented order:

1. Synchronized this planned block before runtime edits.
2. Extended the Design Studio owner tool with proposal-only commands: imported proposal preview, subscription-agent handoff metadata, external-product plan-only export, blocked API-key provider policy inspection, and owner-tool transaction dry run.
3. Kept CandidateEnvelope mock/image/imagegen data as untrusted imported metadata and added review summaries without imagegen execution or image mutation.
4. Added `design_studio` producer data to `tools/dashboard-data` and documented the schema contract.
5. Rendered imported candidates, imported proposals, preview decisions, provider boundaries, external-product plan-only export, and dry-run transaction state in the Design Studio page.
6. Extended event-store, dashboard-data, i18n, and Playwright tests for P0-P6 behavior and forbidden capabilities.
7. Promoted this sync ID to implemented after focused Design Studio, dashboard-data, Dashboard, sync, and repository-development checks passed.

Stop and ask before provider API dispatch, subscription-agent background execution, imagegen calls, mock image mutation, OCR trust, external product writes, browser mutation endpoints, dependency changes, credentials, Git/CI execution, push, PR creation, merge, main sync, cleanup, or any existing-feature tradeoff.

## Implemented Dashboard Design Studio History Detail Implementation Plan

SYNC-ID: dashboard_design_studio_history_detail
STATUS: implemented
ARTIFACTS: docs/workflow/AS_BUILT_SYNC_CONTRACT.tsv,docs/workflow/DASHBOARD_DATA_SCHEMA.tsv,tools/dashboard-design-system,tools/dashboard-data,dashboard-control-center/src/dashboardData.js,dashboard-control-center/src/App.jsx,dashboard-control-center/src/i18n.js,tests/playwright/dashboard-control-center.spec.js,tools/test_dashboard_design_studio_events.sh,tools/test_dashboard_data.sh,tools/test_dashboard_i18n.sh,tools/test_dashboard_control_center.sh,docs/as-built/REQUIREMENTS.md,docs/as-built/SPECIFICATION.md,docs/as-built/IMPLEMENTATION_PLAN.md,docs/workflow/TASK_TRACKER.md,docs/workflow/HANDOFF.md
TESTS: tools/test_dashboard_design_studio_events.sh,tools/check_dashboard_design_system.sh,tools/test_dashboard_data.sh,tools/test_dashboard_i18n.sh,tools/test_dashboard_control_center.sh,tools/check_as_built_sync_contract.sh,tools/check_as_built_docs.sh,tools/check_workflow_pair_sync.sh,tools/check_repository_development_workflow.sh,tools/test_repository_development_workflow.sh

Implemented order:

1. Synchronized this planned block before runtime edits.
2. Added `history_rows[]` projection to `tools/dashboard-design-system proposal-status`.
3. Extended `DASHBOARD_DATA_SCHEMA.tsv`, `dashboardData.js`, and dashboard-data tests for item-level safe history rows.
4. Rendered Design Studio history inside the existing History page with proposal-only boundary cues and safe technical metadata.
5. Extended i18n and Playwright coverage for populated and empty history states.
6. Promoted this sync ID to implemented after focused Design Studio, dashboard-data, Dashboard, sync, and repository-development checks passed.

Stop and ask before provider dispatch, imagegen, subscription-agent execution, external product writes, automatic apply, approval mutation, browser command execution, dependency changes, credentials, push, merge, or existing-feature tradeoffs.

## Implemented Dashboard Design Studio Subscription-Agent Handoff Package Implementation Plan

SYNC-ID: dashboard_design_studio_subscription_agent_handoff_package
STATUS: implemented
ARTIFACTS: docs/workflow/AS_BUILT_SYNC_CONTRACT.tsv,docs/workflow/DASHBOARD_DATA_SCHEMA.tsv,tools/dashboard-design-system,tools/dashboard-data,dashboard-control-center/src/dashboardData.js,dashboard-control-center/src/App.jsx,dashboard-control-center/src/i18n.js,tests/playwright/dashboard-control-center.spec.js,tools/test_dashboard_design_studio_events.sh,tools/test_dashboard_data.sh,tools/test_dashboard_i18n.sh,tools/test_dashboard_control_center.sh,docs/as-built/REQUIREMENTS.md,docs/as-built/SPECIFICATION.md,docs/as-built/IMPLEMENTATION_PLAN.md,docs/workflow/TASK_TRACKER.md,docs/workflow/HANDOFF.md
TESTS: tools/test_dashboard_design_studio_events.sh,tools/check_dashboard_design_system.sh,tools/test_dashboard_data.sh,tools/test_dashboard_i18n.sh,tools/test_dashboard_control_center.sh,tools/check_as_built_sync_contract.sh,tools/check_as_built_docs.sh,tools/check_workflow_pair_sync.sh,tools/check_repository_development_workflow.sh,tools/test_repository_development_workflow.sh

Implemented order:

1. Synchronized this block before runtime edits.
2. Added local `agent-package` command with constrained output path, package digest, metadata-only store record, and symlink-escape rejection.
3. Restricted `proposal-status` handoff projection to subscription-agent events and exposed package readiness metadata.
4. Extended dashboard schema, validation, UI, and tests for package fields and false execution boundaries.
5. Kept package creation local, redacted, and proposal-only; dashboard display remains read-only.
6. Promoted this sync ID to implemented after focused Design Studio, schema, i18n, dashboard-data, and design-system checks passed.

Stop and ask before subscription-agent execution, provider dispatch, uploads, credentials, imagegen, external product writes, automatic apply, approval mutation, browser command execution, dependencies, push, merge, or existing-feature tradeoffs.

## Dashboard Design Studio Template Proposal Library Implementation Plan

SYNC-ID: dashboard_design_studio_template_proposal_library
STATUS: implemented
ARTIFACTS: docs/workflow/AS_BUILT_SYNC_CONTRACT.tsv,docs/workflow/DASHBOARD_DATA_SCHEMA.tsv,docs/design-system/dashboard-control-center/DESIGN_SYSTEM.md,docs/design-system/dashboard-control-center/orchestration.json,docs/design-system/dashboard-control-center/templates.json,tools/dashboard-design-system,tools/dashboard-data,dashboard-control-center/src/dashboardData.js,dashboard-control-center/src/App.jsx,dashboard-control-center/src/i18n.js,tests/playwright/dashboard-control-center.spec.js,tools/test_dashboard_design_studio_events.sh,tools/test_dashboard_data.sh,tools/test_dashboard_schema.sh,tools/test_dashboard_i18n.sh,tools/test_dashboard_control_center.sh,docs/as-built/REQUIREMENTS.md,docs/as-built/SPECIFICATION.md,docs/as-built/IMPLEMENTATION_PLAN.md,docs/workflow/TASK_TRACKER.md,docs/workflow/HANDOFF.md
TESTS: tools/test_dashboard_design_studio_events.sh,tools/check_dashboard_design_system.sh,tools/test_dashboard_schema.sh,tools/test_dashboard_data.sh,tools/test_dashboard_i18n.sh,tools/test_dashboard_control_center.sh,tools/check_as_built_sync_contract.sh,tools/check_as_built_docs.sh,tools/check_workflow_pair_sync.sh,tools/check_repository_development_workflow.sh,tools/test_repository_development_workflow.sh

Implemented order:

1. Synchronize this planned block before runtime edits.
2. Add a safe template registry source and validate it through `tools/dashboard-design-system check`.
3. Add `list-templates` and `template-preview` owner-tool commands that return redacted, proposal-only TemplateProposal metadata.
4. Extend `proposal-status`, dashboard schema, dashboard data validation, UI, i18n, and Playwright fixtures for template library status.
5. Extend focused Design Studio and dashboard-data tests for safe template metadata, forbidden fields, unsafe paths/commands, and no execution authority.
6. Promote this sync ID to implemented after focused Design Studio, schema, dashboard-data, Dashboard, sync, and repository-development checks pass.

Stop and ask before template apply, automatic DesignChangeProposal conversion, dependency installation, network calls, provider dispatch, imagegen, external product writes, Git/CI execution, approval mutation, plan/apply token creation, browser command execution, or existing-feature tradeoffs.

## Dashboard Control Center Agentic Control Tower P0-P10 Implementation Plan

SYNC-ID: dashboard_control_center_agentic_control_tower_p0_p10
STATUS: implemented
ARTIFACTS: docs/workflow/AS_BUILT_SYNC_CONTRACT.tsv,tools/lib/control_center_core.mjs,tools/lib/control_center_evidence_store.mjs,tools/lib/control_center_mcp_stdio_adapter.mjs,tools/control-center,tools/control-center-mcp,tools/test_control_center_core.sh,tools/test_control_center_core.mjs,dashboard-control-center/src/App.jsx,dashboard-control-center/src/DecisionSummary.jsx,dashboard-control-center/src/dashboardContext.js,dashboard-control-center/src/dashboardData.js,dashboard-control-center/src/displayDepth.js,dashboard-control-center/src/i18n.js,dashboard-control-center/src/styles.css,tools/dashboard-data,docs/as-built/REQUIREMENTS.md,docs/as-built/SPECIFICATION.md,docs/as-built/IMPLEMENTATION_PLAN.md,docs/workflow/TASK_TRACKER.md,docs/workflow/HANDOFF.md
TESTS: tools/test_dashboard_schema.sh,tools/test_dashboard_data.sh,tools/test_dashboard_i18n.sh,tools/check_dashboard_bundle_contract.sh,tools/check_as_built_sync_contract.sh,tools/check_as_built_docs.sh,tools/check_workflow_pair_sync.sh,tools/check_repository_development_workflow.sh,tools/test_repository_development_workflow.sh,tools/test_dashboard_browser_debug_manifest.sh

Implemented order:

1. Reviewed AGENTS invariants, repository-development-workflow guidance, synchronized docs, and xhigh subagent findings for P0-P10.
2. Repaired selected-menu scope handling so stale producer-owned detail data is blocked until a matching snapshot is available.
3. Centralized status label translation through `stateLabelKey()` and added Japanese translations for producer default decision text.
4. Made the operational situation board decision-led with `operational_decision`, audience briefs, Git/worktree, tests/CI, blocker, and next safe action summaries.
5. Added shared Control Center core, CLI entrypoint, stdio MCP adapter, command registry, capability profiles, dry-run/execute boundaries, and locked evidence receipts.
6. Added a Design Studio AI agent connection layer for manual import, subscription-agent, API-key provider, image/mock candidate, external product handoff, CLI/MCP parity, and Browser Debug review paths.
7. Kept Browser Debug CLI read-only from this repository and exposed only target-owned manifest/review handoff commands.
8. Added focused core/MCP tests and kept broader dashboard verification to changed owner layers.

Stop and ask before provider dispatch, credentials, automatic apply, image generation, external product writes, Browser Debug CLI edits, dashboard-triggered Git/CI mutations, push, merge, cleanup, or gate weakening.

## Dashboard Control Center Contextual Repair Implementation Plan

SYNC-ID: dashboard_control_center_contextual_repair
STATUS: implemented
ARTIFACTS: docs/workflow/AS_BUILT_SYNC_CONTRACT.tsv,docs/workflow/DASHBOARD_DATA_SCHEMA.tsv,docs/design-system/dashboard-control-center/DESIGN_SYSTEM.md,docs/design-system/dashboard-control-center/tokens.json,docs/design-system/dashboard-control-center/components.json,tools/dashboard-design-system,tools/dashboard-data,vite.config.mjs,dashboard-control-center/src/App.jsx,dashboard-control-center/src/dashboardContext.js,dashboard-control-center/src/dashboardData.js,dashboard-control-center/src/displayDepth.js,dashboard-control-center/src/i18n.js,dashboard-control-center/src/styles.css,dashboard-control-center/src/design-system.generated.css,tests/playwright/dashboard-control-center.spec.js,tools/test_dashboard_schema.sh,docs/as-built/REQUIREMENTS.md,docs/as-built/SPECIFICATION.md,docs/as-built/IMPLEMENTATION_PLAN.md,docs/workflow/TASK_TRACKER.md,docs/workflow/HANDOFF.md
TESTS: tools/test_dashboard_schema.sh,tools/test_dashboard_data.sh,tools/test_dashboard_data_product_repository_selection.sh,tools/test_dashboard_i18n.sh,tools/test_dashboard_control_center.sh,tools/check_dashboard_design_system.sh,tools/check_as_built_sync_contract.sh,tools/check_as_built_docs.sh,tools/check_workflow_pair_sync.sh,tools/check_repository_development_workflow.sh,tools/test_repository_development_workflow.sh

Planned order:

1. Use xhigh sub-agent findings plus AGENTS and repository-development-workflow guidance to confirm scope, dirty worktree ownership, and non-scope boundaries.
2. Repair context scoping first: initial menu fetch, selected-menu snapshot matching, evidence-backed page gating, and stale detail prevention.
3. Repair repository selection around stable `repo_id`, current selection, and multiple configured product repositories.
4. Repair document brief and schema scoping so task tracker, handoff, requirements, specification, and implementation plan summaries belong to the selected menu/repository role.
5. Add or normalize AI-agent assignment and operation-event fields as safe observation metadata for dashboard display and CLI/MCP parity.
6. Convert raw status codes into localized meaning, cause, and next safe action for non-engineer and junior/intermediate engineer views.
7. Redesign the current work board data binding so Git/worktree, tests, CI, blockers, and task/handoff progress change with live evidence.
8. Clean page-level decision summaries to remove duplicated generic headings and keep evidence-specific pages useful.
9. Reapply menu icon color and spacing consistency through the design system source and generated runtime artifacts.
10. Update focused schema, dashboard-data, i18n, and Playwright contracts for the repaired behavior.
11. Run a read-only Browser Debug CLI or TraceCue final review against the dashboard without editing external review tool repositories.

Verification plan:

- Start with schema/data/i18n checks for producer and live-status contracts.
- Run focused Dashboard Control Center browser tests after UI changes.
- Run design-system check when design tokens/components or generated assets change.
- Run as-built, workflow-pair, and repository-development workflow checks before promoting this sync ID to implemented.
- Use Browser Debug CLI or TraceCue only for read-only final visual/content review artifacts.

Stop and ask before provider dispatch, credentials, automatic apply, image generation, external product writes, Browser Debug CLI or TraceCue source edits, dashboard-triggered Git/CI mutations, dependency changes, push, merge, cleanup, or gate weakening.

## Implemented Dashboard Control Center Workflow Activity History Implementation Plan

SYNC-ID: dashboard_control_center_workflow_activity_history
STATUS: implemented
ARTIFACTS: docs/workflow/AS_BUILT_SYNC_CONTRACT.tsv,docs/workflow/DASHBOARD_DATA_SCHEMA.tsv,docs/design-system/dashboard-control-center/DESIGN_SYSTEM.md,docs/design-system/dashboard-control-center/tokens.json,docs/design-system/dashboard-control-center/components.json,dashboard-control-center/src/design-system.generated.css,dashboard-control-center/src/design-system.generated.js,tools/dashboard-data,tools/lib/dashboard_data.sh,vite.config.mjs,dashboard-control-center/src/App.jsx,dashboard-control-center/src/dashboardData.js,dashboard-control-center/src/i18n.js,dashboard-control-center/src/i18nCatalog.js,dashboard-control-center/src/styles.css,tests/fixtures/dashboard-control-center.json,tests/fixtures/dashboard-control-center-live-update.json,tests/playwright/dashboard-control-center.spec.js,tools/test_dashboard_schema.sh,tools/test_dashboard_data.sh,tools/test_dashboard_i18n.sh,tools/test_dashboard_control_center.sh,docs/as-built/REQUIREMENTS.md,docs/as-built/SPECIFICATION.md,docs/as-built/IMPLEMENTATION_PLAN.md,docs/workflow/TASK_TRACKER.md,docs/workflow/HANDOFF.md
TESTS: tools/test_dashboard_schema.sh,tools/test_dashboard_data.sh,tools/test_dashboard_i18n.sh,tools/test_dashboard_control_center.sh,tools/check_dashboard_bundle_contract.sh,tools/check_dashboard_design_system.sh,tools/check_as_built_sync_contract.sh,tools/check_as_built_docs.sh,tools/check_workflow_pair_sync.sh,tools/check_repository_development_workflow.sh,tools/test_repository_development_workflow.sh

User decision:

- The user needs to decide what changed recently, what is verified, what remains uncertain or blocked, and what action is safe next for the selected repository.

Implementation order:

1. Keep the approved scope synchronized as `planned` across this contract and the five required documents before further runtime edits.
2. Treat FrameCue path correction, current TraceCue selection, and workflow-pair wording alignment as a separate configuration unit; verify it through existing repository-registry and Dashboard-selection tests.
3. Inventory the existing material-event implementation, preserve user-owned behavior, and extract reusable event collection or normalization code from the large inline `dashboard-data` block when extraction reduces duplication and improves direct testing.
4. Repair owner-layer semantics so source status, authority, freshness, occurrence time, repository head, blocker count, and selected repository remain distinct and traceable.
5. Remove paths that turn stale, unknown, not-run, or advisory evidence into ready state; keep blocker history filtering separate from current blocker truth.
6. Replace browser command-regex purpose inference and Japanese-versus-English branches with structured purpose codes, shared locale keys, and standard locale formatting.
7. Decide whether the compact locale catalog is maintained source or generated output; rename it or add a checked generator so its ownership is unambiguous.
8. Align `DASHBOARD_DATA_SCHEMA.tsv`, validator behavior, fixtures, and producer output before finalizing React rendering.
9. Keep the material-update history and current-position summary aligned with `DESIGN_SYSTEM.md`, `tokens.json`, and `components.json`; regenerate runtime design assets only through `tools/dashboard-design-system`.
10. Update focused schema, data, i18n, and Playwright coverage, preserving prior decision, selected-context, evidence-detail, accessibility, and responsive-layout coverage under the new structure.
11. Run focused verification first, inspect real desktop and mobile rendering, and repair failures without weakening checks.
12. Add newly created runtime or test artifacts to this sync metadata, promote all five blocks to `implemented` only after focused checks pass, and then present the heavy release gate separately.

Implementation outcome:

- Preserved incomplete-evidence states, explicit blocker counts, event occurrence time, selected repository, and repository-head meaning from producer through browser rendering.
- Added structured purpose codes and standard locale keys; removed command-string purpose inference and Japanese-versus-English runtime branches.
- Classified `i18nCatalog.js` as maintained source and split it into a dedicated Vite chunk without raising the 500,000-byte bundle limit.
- Kept the material-event collector in its single producer owner because no second caller or duplicated normalization path justified a separate executable; the shared shell JSON helper remains in `tools/lib/dashboard_data.sh`.
- Added Vite and browser-data rejection for missing purpose codes, bounded event validation, stale-state presentation, explicit zero/count handling, and current-position de-duplication.
- Corrected the FrameCue registry path, preserved TraceCue as the current free-development selection, and left both external repositories read-only.

Verification plan:

- Syntax: changed shell and JavaScript modules.
- Producer contract: `tools/test_dashboard_schema.sh` and `tools/test_dashboard_data.sh`.
- Locale contract: `tools/test_dashboard_i18n.sh` across the standard language list.
- UI and responsive decision behavior: `tools/test_dashboard_control_center.sh` plus focused Playwright desktop/mobile inspection.
- Design source-to-runtime: `tools/check_dashboard_design_system.sh`.
- Registry configuration unit: existing product Git-usage, menu-prerequisite, repository-selection, and Dashboard data checks selected by `TEST_PLAN_MANIFEST.tsv`.
- Document and workflow integrity: as-built, workflow-pair, repository-development checks, and `git diff --check`.

Recovery:

- Preserve the feature branch and original diff while making scoped edits; do not reset, discard, or overwrite user-owned changes.
- If event extraction changes output, restore the last passing producer contract before continuing with presentation work.
- If visual generation drifts, repair source tokens/components and regenerate; do not patch generated CSS or JS directly.
- If registry alignment is not accepted by its focused tests, stop that configuration unit without weakening Dashboard selection behavior.

Approval boundaries:

- Runtime implementation begins only after this implementation plan is approved.
- Heavy aggregate, full/no-cache, pre-commit, push, PR, merge, main CI, synchronization, and cleanup remain later approval-bound phases.

## Implemented Parent Repository Change-Aware Document Sync Plan

SYNC-ID: repository_document_sync_enforcement
STATUS: implemented
ARTIFACTS: AGENTS.MD,docs/workflow/AS_BUILT_SYNC_CONTRACT.tsv,docs/workflow/REPOSITORY_DOCUMENT_SYNC.md,docs/workflow/REPOSITORY_DOCUMENT_SYNC_POLICY.json,docs/workflow/SAFEFLOW_SECURITY_BACKFILL.tsv,docs/workflow/PRODUCT_SECURITY_POLICY.tsv,docs/workflow/TEST_PLAN_MANIFEST.tsv,docs/workflow/GIT_HOOK_CHECKS.tsv,docs/workflow/GIT_HOOK_PARALLEL_GROUPS.tsv,docs/workflow/GIT_HOOK_RECOMMENDATION_PATHS.tsv,docs/workflow/FINAL_GATE_COVERAGE.tsv,guides/DOCUMENT_MAP.md,.githooks/pre-push,tools/lib/repository_document_sync.mjs,tools/check_repository_document_sync.mjs,tools/check_repository_document_sync.sh,tools/test_repository_document_sync.mjs,tools/test_repository_document_sync.sh,tools/check_lesson_structure.sh,tools/test_lesson_repository.sh,tools/check_ci_workflow_structure.sh,tools/test_ci_pipeline_acceleration.sh,.github/workflows/ci.yml,docs/as-built/REQUIREMENTS.md,docs/as-built/SPECIFICATION.md,docs/as-built/IMPLEMENTATION_PLAN.md,docs/workflow/TASK_TRACKER.md,docs/workflow/HANDOFF.md
TESTS: tools/check_repository_document_sync.sh,tools/test_repository_document_sync.sh,tools/check_lesson_structure.sh,tools/check_test_plan_coverage.sh,tools/test_test_plan.sh,tools/test_git_hooks.sh,tools/test_git_hooks_parallel.sh,tools/check_ci_workflow_structure.sh,tools/test_ci_pipeline_acceleration.sh,tools/check_security_invariants.sh,tools/test_security_invariants.sh,tools/check_agents_skills.sh,tools/check_as_built_sync_contract.sh,tools/check_as_built_docs.sh,tools/check_workflow_pair_sync.sh

Implementation order:

1. Define parent-specific categories and map Security/Verification to existing parent authorities rather than copying product-local `SECURITY.md` or `VERIFICATION.md` paths.
2. Implement the bounded standard-library parser, policy validator, additive evaluator, secure policy loader, and Git range CLI.
3. Add refusal coverage for missing category documents, additive security overlays, fallback classification, rename/delete semantics, session/generated exclusions, malformed paths/status, policy weakening, symlinks, range modes, and external-repository nonaccess.
4. Wire standalone checks through structure, Test Plan, Git hooks, parallel groups, final coverage, aggregate tests, CI structure tests, and pipeline tests.
5. Add a small parallel main-CI job and final-gate dependency without duplicating product CI, npm installation, Playwright, Dashboard generation, or child-repository checks.
6. Synchronize AGENTS, the operating guide, Security policies, five as-built/workflow authorities, and AS_BUILT sync metadata.
7. Run focused checks, medium policy/CI checks, aggregate and full/no-cache release proof, PR/main CI, local/remote synchronization, and read-only TraceCue browser verification.

Recovery keeps the existing static as-built checker and all lesson/product gates intact. If the range gate is over-broad, repair its owner policy and refusal tests in the same integration range; do not add an exception file or weaken the immutable self rule.

## Implemented Parent Development Instruction Fallback And Autonomy Implementation

SYNC-ID: parent_instruction_memory_fallback_authority
STATUS: implemented
ARTIFACTS: AGENTS.MD,docs/workflow/AS_BUILT_SYNC_CONTRACT.tsv,docs/workflow/INSTRUCTION_MEMORY.md,docs/workflow/DEVELOPMENT_INSTRUCTION_POLICY.tsv,docs/workflow/DEVELOPMENT_AUTONOMY_WORKFLOW.tsv,docs/workflow/PRODUCT_REPOSITORY_STRUCTURE.tsv,free-development/FREE_DEVELOPMENT_MODE.md,templates/TEMPLATES.md,guides/DOCUMENT_MAP.md,tools/lib/development_instruction.mjs,tools/lib/development_instruction.sh,tools/development-instruction,tools/check_development_instruction.sh,tools/test_development_instruction.mjs,tools/test_development_instruction.sh,tools/lib/product_workflow_git_usage.sh,tools/free-development,tools/product-improvement,tools/external-integration,skills/product-development-workflow/SKILL.md,skills/product-development-workflow/references/product-development.md,docs/workflow/REPOSITORY_DOCUMENT_SYNC.md,docs/workflow/REPOSITORY_DOCUMENT_SYNC_POLICY.json,tools/lib/repository_document_sync.mjs,tools/test_repository_document_sync.mjs,docs/workflow/SAFEFLOW_SECURITY_BACKFILL.tsv,docs/workflow/PRODUCT_SECURITY_POLICY.tsv,docs/workflow/TEST_PLAN_MANIFEST.tsv,docs/workflow/GIT_HOOK_CHECKS.tsv,docs/workflow/GIT_HOOK_PARALLEL_GROUPS.tsv,docs/workflow/GIT_HOOK_RECOMMENDATION_PATHS.tsv,docs/workflow/FINAL_GATE_EXECUTION_POLICY.tsv,docs/workflow/FINAL_GATE_CI_GRAPH.tsv,docs/workflow/FINAL_GATE_GAP_COMMANDS.tsv,docs/workflow/FINAL_GATE_COVERAGE.tsv,tools/test_lesson_repository.sh,.github/workflows/ci.yml,.github/workflows/lesson14-ci.yml,docs/as-built/REQUIREMENTS.md,docs/as-built/SPECIFICATION.md,docs/as-built/IMPLEMENTATION_PLAN.md,docs/workflow/TASK_TRACKER.md,docs/workflow/HANDOFF.md
TESTS: tools/check_development_instruction.sh,tools/test_development_instruction.sh,tools/test_product_git_usage_modes.sh,tools/test_product_scaffold_check.sh,tools/test_menu_prerequisites.sh,tools/test_repository_document_sync.sh,tools/check_security_invariants.sh,tools/test_security_invariants.sh,tools/check_test_plan_coverage.sh,tools/test_test_plan.sh,tools/test_git_hooks.sh,tools/test_git_hooks_parallel.sh,tools/test_ci_composition.sh,tools/check_ci_workflow_structure.sh,tools/check_agents_skills.sh,tools/test_docs_tour.sh,tools/check_as_built_sync_contract.sh,tools/check_as_built_docs.sh,tools/check_workflow_pair_sync.sh

Implementation order:

1. Add the parent fallback document plus policy and A-F mapping authorities.
2. Implement one dependency-free safe resolver shared by standalone CLI,
   repository workflow, and product workflow adapters.
3. Validate local-first/absence-only fallback, context/menu joins, selected
   repository identity, parent-managed mode, Git top-level, bounded stable file
   reads, A-F headings, versions, and safe metadata output.
4. Add isolated fixture refusal tests for lesson exclusion, local priority,
   absence fallback, invalid local non-fallback, path/symlink/encoding/size/
   heading/version failures, mode/selection mismatch, and no child access from
   the parent-only check.

SYNC-ID: parent_development_autonomy_activation
STATUS: implemented
ARTIFACTS: AGENTS.MD,docs/workflow/AS_BUILT_SYNC_CONTRACT.tsv,docs/workflow/INSTRUCTION_MEMORY.md,docs/workflow/DEVELOPMENT_INSTRUCTION_POLICY.tsv,docs/workflow/DEVELOPMENT_AUTONOMY_WORKFLOW.tsv,docs/workflow/REPOSITORY_DEVELOPMENT_WORKFLOW.tsv,docs/workflow/REPOSITORY_DEVELOPMENT_RUNNER_POLICY.tsv,learning/REPOSITORY_DEVELOPMENT_APPROVALS.tsv,docs/workflow/GIT_WORKFLOW_POLICY.tsv,learning/GIT_WORKFLOW_SETTINGS.tsv,docs/workflow/PRODUCT_WORKFLOW_GIT_USAGE_POLICY.tsv,learning/PRODUCT_WORKFLOW_GIT_USAGE_SETTINGS.tsv,tools/lib/repository_development_workflow.sh,tools/lib/repository_development_runner.sh,tools/repository-development-workflow,tools/check_repository_development_workflow.sh,tools/test_repository_development_workflow.sh,skills/repository-development-workflow/SKILL.md,skills/repository-development-workflow/references/repository-development.md,tools/lib/development_instruction.mjs,tools/development-instruction,tools/lib/product_workflow_git_usage.sh,skills/product-development-workflow/SKILL.md,docs/workflow/REPOSITORY_DOCUMENT_SYNC.md,docs/workflow/REPOSITORY_DOCUMENT_SYNC_POLICY.json,docs/workflow/SAFEFLOW_SECURITY_BACKFILL.tsv,docs/workflow/PRODUCT_SECURITY_POLICY.tsv,docs/workflow/TEST_PLAN_MANIFEST.tsv,docs/workflow/GIT_HOOK_CHECKS.tsv,docs/workflow/GIT_HOOK_PARALLEL_GROUPS.tsv,docs/workflow/GIT_HOOK_RECOMMENDATION_PATHS.tsv,docs/workflow/FINAL_GATE_EXECUTION_POLICY.tsv,docs/workflow/FINAL_GATE_CI_GRAPH.tsv,docs/workflow/FINAL_GATE_GAP_COMMANDS.tsv,docs/workflow/FINAL_GATE_COVERAGE.tsv,tools/test_lesson_repository.sh,.github/workflows/ci.yml,.github/workflows/lesson14-ci.yml,docs/as-built/REQUIREMENTS.md,docs/as-built/SPECIFICATION.md,docs/as-built/IMPLEMENTATION_PLAN.md,docs/workflow/TASK_TRACKER.md,docs/workflow/HANDOFF.md
TESTS: tools/check_development_instruction.sh,tools/test_development_instruction.sh,tools/check_repository_development_workflow.sh,tools/test_repository_development_workflow.sh,tools/test_product_git_usage_modes.sh,tools/test_menu_prerequisites.sh,tools/check_security_invariants.sh,tools/test_security_invariants.sh,tools/check_test_plan_coverage.sh,tools/test_test_plan.sh,tools/test_git_hooks.sh,tools/test_git_hooks_parallel.sh,tools/test_ci_composition.sh,tools/check_ci_workflow_structure.sh,tools/check_agents_skills.sh,tools/check_as_built_sync_contract.sh,tools/check_as_built_docs.sh,tools/check_workflow_pair_sync.sh

5. Map A-F onto the existing repository phases and make phase order/approval
   validation data-driven while retaining legacy CLI compatibility.
6. Add task-scope and Settings-intersection guidance for D without adding a
   remote executor, persistent approval store, or release-proof shortcut.
7. Integrate the shared resolver into parent repository guidance and the three
   product workflow start/gate paths. Keep product local instruction memory
   optional in scaffold policy and templates; never generate or overwrite it.
8. Wire standalone check/test owners through Test Plan, hooks, parallel groups,
   final coverage, direct-argv final gaps, aggregate verification, syntax CI,
   Security, document maps, skills, and cannot-exempt document sync policy.
9. Activate `shadow`, run focused and medium compatibility/refusal checks,
   then promote to `enforce` and run the one-owner release path.
10. Review the final diff, commit, complete configured PR/main CI integration,
    verify local/remote synchronization, and leave child repositories
    unchanged.

Recovery is policy-first: return activation to `shadow` or revert the shared
adapter while keeping existing local memories and seven-phase CLI behavior.
Do not repair failures by merging local and parent instruction text, accepting
an invalid local file as absent, scanning every registered child, weakening a
gate, or caching release results across runs.

## Implemented Development Instruction Authority Layer Implementation

SYNC-ID: development_instruction_authority_layer_contract
STATUS: implemented
ARTIFACTS: AGENTS.MD,docs/workflow/AS_BUILT_SYNC_CONTRACT.tsv,docs/workflow/INSTRUCTION_MEMORY.md,docs/workflow/DEVELOPMENT_INSTRUCTION_POLICY.tsv,docs/workflow/DEVELOPMENT_AUTONOMY_WORKFLOW.tsv,docs/workflow/REPOSITORY_DEVELOPMENT_WORKFLOW.tsv,docs/workflow/REPOSITORY_DEVELOPMENT_RUNNER_POLICY.tsv,learning/REPOSITORY_DEVELOPMENT_APPROVALS.tsv,docs/workflow/PRODUCT_REPOSITORY_STRUCTURE.tsv,free-development/FREE_DEVELOPMENT_MODE.md,templates/TEMPLATES.md,guides/DOCUMENT_MAP.md,docs/workflow/REPOSITORY_DOCUMENT_SYNC.md,docs/workflow/REPOSITORY_DOCUMENT_SYNC_POLICY.json,tools/lib/development_instruction.mjs,tools/check_development_instruction.sh,tools/test_development_instruction.mjs,docs/workflow/SAFEFLOW_SECURITY_BACKFILL.tsv,docs/workflow/PRODUCT_SECURITY_POLICY.tsv,docs/workflow/TEST_PLAN_MANIFEST.tsv,docs/workflow/GIT_HOOK_CHECKS.tsv,docs/workflow/GIT_HOOK_PARALLEL_GROUPS.tsv,docs/workflow/FINAL_GATE_EXECUTION_POLICY.tsv,docs/workflow/FINAL_GATE_CI_GRAPH.tsv,docs/workflow/FINAL_GATE_GAP_COMMANDS.tsv,docs/workflow/FINAL_GATE_COVERAGE.tsv,docs/as-built/REQUIREMENTS.md,docs/as-built/SPECIFICATION.md,docs/as-built/IMPLEMENTATION_PLAN.md,docs/workflow/TASK_TRACKER.md,docs/workflow/HANDOFF.md
TESTS: tools/check_development_instruction.sh,tools/test_development_instruction.sh,tools/check_repository_document_sync.sh,tools/test_repository_document_sync.sh,tools/check_security_invariants.sh,tools/test_security_invariants.sh,tools/check_test_plan_coverage.sh,tools/test_test_plan.sh,tools/test_git_hooks.sh,tools/test_git_hooks_parallel.sh,tools/check_ci_workflow_structure.sh,tools/check_as_built_sync_contract.sh,tools/check_as_built_docs.sh,tools/check_workflow_pair_sync.sh,tools/check_agents_skills.sh,tools/check_lesson_structure.sh,tools/check_lesson14_structure.sh

Implementation order:

1. Synchronize the two-layer authority requirement, policy-owned vocabulary,
   Security boundary, verification ownership, and current TernWeave registry
   selection documents. Do not modify either memory file.
2. Add policy validation and safe authority metadata while preserving existing
   resolver fields, A-F behavior, local D behavior, and external-repository
   boundaries.
3. Add isolated positive, compatibility, output, and refusal tests; then run
   focused instruction and document-sync checks.
4. Run medium workflow, Security, Test Plan, hooks, and CI-structure checks.
5. Promote this synchronization block after focused and medium owner checks
   pass, then run the exact aggregate full/no-cache release proof and configured
   CI route. Keep child repositories unchanged.

Recovery is additive: revert this policy/output slice without changing local
instruction contents, parent A-F semantics, product registration, or either
memory file. A failure must be fixed in its owning policy, resolver, document,
or fixture rather than bypassed.

Local release evidence: focused and medium owner checks passed, followed by the
full no-cache Git hook run with 68 checks, same-run final-gate evidence,
Dashboard browser receipt, and lesson Playwright coverage. Remote PR/main CI
and synchronization remain the final configured D-phase actions.

## Next Development Workflow Partial Implementation — Control Center and Activation Pending

SYNC-ID: next_development_workflow_planning_contract
STATUS: planned
ARTIFACTS: .github/workflows/ci.yml,.github/workflows/lesson14-ci.yml,.gitignore,.node-version,.nvmrc,AGENTS.MD,README.md,dashboard-control-center/src/App.jsx,dashboard-control-center/src/dashboardData.js,dashboard-control-center/src/design-system.generated.css,dashboard-control-center/src/design-system.generated.js,dashboard-control-center/src/i18n.js,dashboard-control-center/src/styles.css,docs/as-built/IMPLEMENTATION_PLAN.md,docs/as-built/REQUIREMENTS.md,docs/as-built/SPECIFICATION.md,docs/design-system/dashboard-control-center/DESIGN_SYSTEM.md,docs/design-system/dashboard-control-center/components.json,docs/workflow/AS_BUILT_SYNC_CONTRACT.tsv,docs/workflow/DASHBOARD_DATA_SCHEMA.tsv,docs/workflow/FINAL_GATE_COVERAGE.tsv,docs/workflow/GIT_HOOK_CHECKS.tsv,docs/workflow/GIT_HOOK_PARALLEL_GROUPS.tsv,docs/workflow/HANDOFF.md,docs/workflow/PRODUCT_SECURITY_POLICY.tsv,docs/workflow/REPOSITORY_DEVELOPMENT_WORKFLOW.tsv,docs/workflow/SAFEFLOW_SECURITY_BACKFILL.tsv,docs/workflow/TASK_TRACKER.md,docs/workflow/TEST_PLAN_MANIFEST.tsv,docs/workflow/next-workflow/authority-lifecycle.json,docs/workflow/next-workflow/context-impact.json,docs/workflow/next-workflow/fixtures/compatibility-profiles.json,docs/workflow/next-workflow/parent-child-authority.json,docs/workflow/next-workflow/provider-registry.json,docs/workflow/next-workflow/shadow-compatibility.json,docs/workflow/next-workflow/state-store.json,docs/workflow/next-workflow/team-agent-security.json,guides/DOCUMENT_MAP.md,learning/NEXT_WORKFLOW_ACTIVATION.json,learning/NEXT_WORKFLOW_AGENT_SELECTION_SETTINGS.json,learning/NEXT_WORKFLOW_PROVIDER_REGISTRY.json,learning/NEXT_WORKFLOW_RELEASE_TRUST.json,learning/NEXT_WORKFLOW_REPOSITORY_IDENTITY.json,package-lock.json,package.json,tests/playwright/dashboard-control-center.spec.js,tools/agent-selection-settings,tools/check_ci_workflow_structure.sh,tools/check_developer_memory_requirements.sh,tools/check_next_workflow.sh,tools/check_next_workflow_contracts.mjs,tools/check_next_workflow_contracts.sh,tools/dashboard,tools/dashboard-data,tools/dashboard-design-system,tools/dashboard-review-manifest,tools/docs-tour,tools/lib/next_workflow/agents.mjs,tools/lib/next_workflow/authority.mjs,tools/lib/next_workflow/compatibility.mjs,tools/lib/next_workflow/context.mjs,tools/lib/next_workflow/contracts.mjs,tools/lib/next_workflow/identity.mjs,tools/lib/next_workflow/migrations/001_initial.sql,tools/lib/next_workflow/migrations/002_saga_replay.sql,tools/lib/next_workflow/planning.mjs,tools/lib/next_workflow/projection.mjs,tools/lib/next_workflow/provider_discovery.mjs,tools/lib/next_workflow/providers.mjs,tools/lib/next_workflow/release.mjs,tools/lib/next_workflow/release_trust.mjs,tools/lib/next_workflow/runtime.mjs,tools/lib/next_workflow/saga.mjs,tools/lib/next_workflow/secret_policy.mjs,tools/lib/next_workflow/settings.mjs,tools/lib/next_workflow/store.mjs,tools/menu,tools/next-workflow,tools/next-workflow.mjs,tools/test_dashboard_browser_debug_manifest.sh,tools/test_dashboard_control_center.sh,tools/test_dashboard_data.sh,tools/test_dashboard_i18n.sh,tools/test_dashboard_schema.sh,tools/test_menu_prerequisites.sh,tools/test_next_workflow.sh,tools/test_next_workflow_agents.mjs,tools/test_next_workflow_agents.sh,tools/test_next_workflow_authority.mjs,tools/test_next_workflow_authority.sh,tools/test_next_workflow_child_isolation.mjs,tools/test_next_workflow_child_isolation.sh,tools/test_next_workflow_compatibility.mjs,tools/test_next_workflow_compatibility.sh,tools/test_next_workflow_context.mjs,tools/test_next_workflow_context.sh,tools/test_next_workflow_contracts.mjs,tools/test_next_workflow_contracts.sh,tools/test_next_workflow_identity.mjs,tools/test_next_workflow_identity.sh,tools/test_next_workflow_planning.mjs,tools/test_next_workflow_planning.sh,tools/test_next_workflow_projection_settings.mjs,tools/test_next_workflow_projection_settings.sh,tools/test_next_workflow_providers.mjs,tools/test_next_workflow_providers.sh,tools/test_next_workflow_release.mjs,tools/test_next_workflow_release.sh,tools/test_next_workflow_runtime.mjs,tools/test_next_workflow_runtime.sh,tools/test_next_workflow_saga.mjs,tools/test_next_workflow_saga.sh,tools/test_next_workflow_store.mjs,tools/test_next_workflow_store.sh,vite.config.mjs
TESTS: tools/check_next_workflow.sh,tools/test_next_workflow.sh,tools/test_dashboard_schema.sh,tools/test_dashboard_data.sh,tools/test_dashboard_settings.sh,tools/test_dashboard_i18n.sh,tools/test_dashboard_control_center.sh,tools/check_dashboard_design_system.sh,tools/check_test_plan_coverage.sh,tools/test_test_plan.sh,tools/check_security_invariants.sh,tools/check_ci_workflow_structure.sh,tools/check_as_built_sync_contract.sh,tools/check_as_built_docs.sh,tools/check_workflow_pair_sync.sh,tools/check_repository_development_workflow.sh,tools/test_repository_development_workflow.sh,tools/test_dashboard_browser_debug_manifest.sh

This plan covers every agreed item in
`next_development_workflow_draft_20260721`. Phases 1-17 and the non-UI work in
Phase 19 are implemented locally through seven frozen P0 contracts and the P1
runtime owners. The developer paused Phase 18 Control Center presentation and
acceptance on 2026-07-22; its partial artifacts are preserved but no additional
Control Center changes are allowed until resumption. Phase 20 release tooling is
implemented, but its exact-candidate evidence and activation transition remain
unfinished. The workflow therefore stays in fail-closed planned mode.

### Priority and dependency order

#### P0: Contract and compatibility foundation

1. **Freeze authority, objective, and baseline.** Record the lexicographic
   correctness-before-speed objective, current executable authorities,
   existing-feature invariants, exact-owner verification behavior, supported
   compatibility surfaces, and measurable correctness/speed baselines.
   Separate exact-one-source procedural instruction resolution from typed
   parent management-policy composition, and keep the current runtime
   authoritative while all new projections are inactive.
2. **Freeze the three-axis contract.** Finalize the six lifecycle records,
   descriptive names, E/F/A/B/C/D aliases, cycle/return transitions, and the
   fixture-proven many-to-many mapping to the unchanged seven phases. Define
   the instruction bootstrap profile/local-constraint identifiers,
   schema/version migration, stronger legacy-obligation preservation, and
   refusal behavior before runtime changes.
3. **Freeze rigor, decision, approval, and retry contracts.** Select the owner
   policy for the six scores, bands, hard triggers, adjustment reasons,
   developer override, `PASS|REVISE|ASK_OWNER|STOP`, approval reasons,
   legacy Git-operation approval compatibility and versioned migration,
   non-waivable Validator STOP/re-entry semantics, material-change fingerprint,
   failure/progress fingerprints, and finite retry/stop thresholds for every
   level.
4. **Freeze the Hierarchical Multi-Agent Team contract.** Define the canonical
   Orchestrator/Lead/Task layers and names, five Lead roles, compatibility
   aliases, L1/L2 writer and review ownership, rigor-sensitive role compression
   and instantiation, depth-2-only delegation, AgentDefinition/Grant/Launch/
   Run/Result schemas, trusted-control/untrusted-data envelopes, provider-
   neutral launch-security requirements, no-substitution refusal, read/write
   ownership, lifecycle, interruption, retry, and agent/parallel/run-time/token/
   cost budget requirements. This slice owns team and trust schemas plus
   reference slots only; it does not own provider selection/attestation schemas
   or tagged AuthorityDecision schemas.
5. **Freeze the provider registry and selection contract.** Separate execution
   provider, model publisher, agent product, adapter,
   `cli_process|api_request|local_runtime` transport, model, normalized effort,
   provider-native reasoning control, and runtime capability. Define the shared
   Auto/Manual/Inherit eligibility floor, fixed inheritance order,
   deterministic selection/reselection, four immutable configuration states,
   canonical certification enum/legal transitions/TTL/revocation/drift/outage,
   and attestation schema.
   Define hardened custom CLI/API/local manifests, executable/endpoint/secret
   identity, destination class/address validation after DNS and before every
   connection/redirect/proxy/nested-tunnel hop, and intended peer identity/SNI/
   certificate-policy validation at every TLS handshake including TLS proxies
   and nested tunnels. Require an exact local-runtime endpoint policy for
   private, loopback, link-local, metadata, and Unix-socket destinations; ordinary
   network permission cannot grant that exception. Define resource boundaries,
   inheritance dry-run schema,
   and Control Center organization-chart settings.
   Verify the initial Codex/OpenAI, Claude Code/Anthropic, and Gemini/Google
   candidate adapter matrices from authoritative information and isolated
   probes without hard-coding current model names.
6. **Freeze management, authority, adapter, and producer boundaries.** Finalize
   `ParentManagementPolicy`, typed composition operators, scoped/versioned Git
   settings and legacy-approval migration, relationship lease/revocation/
   parent-cardinality rules, graceful-drain/emergency-revoke ordering, tagged
   action-bound Git/provider/agent-launch/agent-run-admission/filesystem/adapter/
   runtime-service/artifact-dependency/resource-cost `AuthorityDecision`, just-
   in-time reevaluation,
   `AuthorityComposer`/`SideEffectGateway` coverage, safe runtime capability
   fields, the parent-child projection and message allowlists, Saga
   effect-key/object matching, authenticated message/receipt trust, and
   reconciliation targets, offline/archive behavior, fenced rollback and
   activation order, freshness/authority ownership, Control Center provenance
   fields, and every prohibited secret/path/payload/command field.
7. **Freeze precision-first planning contracts.** Define `WorkContextFrame`
   with origin/trust/sensitivity/interpretation envelopes, the typed
   requirement-to-evidence impact graph, unknown-impact expansion, dependency/
   file/owner/resource scheduling data, review-perspective coverage, optional
   value-of-information inputs, schema-generation ownership, performance
   metrics, and verified-weight progress calculation.
8. **Choose the operational storage contract reversibly.** After the owner,
   provider, and context/impact semantics in steps 5-7 are frozen, define the
   `WorkflowStateStore` port, canonical/derivative authority matrix, logical
   repository/checkout/parent/relationship identities and entities,
   transaction/external-intent/outbox/receipt protocol, SQLite driver ADR,
   local ignored placement, migrations, backup/restore, export/rebuild,
   retention, corruption/recovery behavior, and legacy TSV/JSONL rollback
   adapters.
9. **Extend parsers and add shadow fixtures before enforcement.** Parse and
   validate new policy data additively while preserving local-first/exact-
   absence resolution, stronger legacy local obligations, legacy result fields,
   A-F instruction compatibility, task scope, product modes, settings, and
   seven-phase CLI behavior. Cover order, mapping, score boundaries, hard
   triggers, approval/retry transitions, policy composition, local/profile
   compatibility, identity/relationship changes, authority replay and
   time-of-check/time-of-use refusal, direct child side-effect paths, Git
   action/ref/SHA binding, message replay/order/gaps/epochs, Saga crash and
   receipt recovery, store migrations/restore, context conflicts, impact
   closure, scheduling conflicts/cycles, offline/archive states, adapter
   isolation, team topology/role compression, selection-mode inheritance and
   Manual-mode eligibility bypass, registry certification/freshness/expiry/
   revocation/clock-drift/outage behavior, requested/selected/effective/
   actual-observed provider identity/configuration mismatch, unsupported effort
   mapping, predicted or placeholder pre-launch actual observation, executable
   identity/digest/ownership and argv/environment/response-
   file/symlink/TOCTOU refusal, endpoint scheme/host/port/path/DNS/rebinding/
   redirect/TLS/proxy refusal, secret-reference namespace/resolver/audience/
   expiry/revocation refusal, unauthorized daemon/download/install/socket/
   network/disk/cost effects, delegation depth/budget/ownership violations,
   concurrent-write conflict, launch/write target swap, prompt/role injection,
   immutable STOP/re-entry, legacy Git-approval migration, forged message or
   receipt proof, provider effect-key/object mismatch, drain/revoke ordering,
   activation before release/recovery/rollback/archive-decommission proof,
   failed fenced rollback, native-adapter eligibility, invalid-policy refusal,
   and absence of secret, foreign evidence, or child-path leakage.

### P0 bounded delivery slices

P0 is delivered as dependency-ordered contract slices under this synchronized
implementation ID. Each row names the stable contract ID whose exact artifacts,
owners, fixtures, rollback, and shadow conditions are frozen in the matching
JSON authority before runtime activation.

| Order | Contract ID | Bounded outcome | Depends on |
| ---: | --- | --- | --- |
| 1 | `next_workflow_p0_authority_lifecycle` | authority baseline, six-stage/seven-phase mapping, rigor, approvals, immutable STOP, retry, and legacy Git-approval migration contract | current planning contract |
| 2 | `next_workflow_p0_team_agent_security` | L1/L2 ownership, full hierarchy, agent records, trust envelopes, launch-security requirements, budgets, and team refusal fixtures; no provider/attestation/authority schema ownership | slice 1 |
| 3 | `next_workflow_p0_provider_registry` | execution-provider/model-publisher/product/adapter/transport/model taxonomy, shared Auto/Manual/Inherit eligibility, certification, hardened custom manifests, four-state attestation, and selection dry-run schemas | slices 1-2 |
| 4 | `next_workflow_p0_parent_child_authority` | parent management composition, identity/relationship states, all tagged authority schemas, authenticated Saga effects/receipts, rollback/activation order, offline, drain, revoke, and archive semantics | slices 1-3 |
| 5 | `next_workflow_p0_context_impact` | WorkContextFrame, impact graph, scheduler/review selection, measurement, and verified progress contracts | slices 1-4 |
| 6 | `next_workflow_p0_state_store` | storage-port/driver ADR and schema/migration/recovery contract derived from all frozen domain, provider, and context semantics | slices 1-5 |
| 7 | `next_workflow_p0_shadow_compatibility` | additive parsers, legacy migration, refusal matrix, isolated fixtures, and shadow/rollback proof for all prior slices | slices 1-6 |

P0 exit: all design and technology decisions are explicit and reversible in
owner policies/ADRs; correctness baselines and contract fixtures pass; legacy
and new projections agree for supported cases; team topology, execution
selection, registry/capability provenance, four-state configuration
attestation,
delegation, ownership, and budgets are fixture-proven; and the current
executable workflow remains unchanged or uses record-only/shadow output with no
new authority.

#### P1: Orchestration, authority, adapters, and producer data

10. **Implement the transactional operational store.** Add the storage port,
   local SQLite adapter, schema migrations, atomic state/event/evidence/outbox
   and external-effect-intent writes, persistence for idempotent receipts and
   reconciliation states, health/integrity/identity checks, backup/restore/
   export/rebuild, bounded locking, redaction, and recovery tooling without
   provider I/O or changing Git-managed normative ownership. Provider
   observation is connected only after steps 11 and 16 enforce authority.
11. **Implement effective runtime and side-effect authority.** Reuse the
   existing Git policy and settings owners; add global/context/repository
   scope, versioned legacy-approval migration, revision, fingerprint,
   freshness, expiry, and revocation epoch; intersect target invariants, parent
   management policy, saved settings, task scope, rigor/approval, local
   instruction, product Git ceiling, and provider capability. Implement tagged
   Git/provider, agent-launch, filesystem-write, adapter-send, runtime-service,
   artifact/dependency, and resource/cost decisions.
   Route every parent/child CLI, workflow, retry/background job, file/Git owner,
   provider, and external-send path through one AuthorityComposer/
   SideEffectGateway with just-in-time target/configuration reevaluation.
12. **Implement deterministic impact planning and bounded scheduling.** Build
   typed transitive closure from requirements to evidence, expand unknown
   impact safely, use critical-path-priority scheduling with dependency,
   file/owner conflict and resource-lock enforcement, choose a minimum
   policy-compliant review coverage set, and add schema-driven contract
   generation where it removes duplicated hand maintenance.
13. **Implement work-context compilation.** Build reproducible bounded frames
   from resolved authorities, synchronized design records, repository state,
   prior decisions/failures/evidence, runtime capability, approvals, Git state,
   the implemented impact closure, and bounded adapter projections. Preserve
   trust class, interpretation mode, conflicts, staleness, omissions, and source
   fingerprints instead of summarizing them away.
14. **Implement the provider registry and execution adapters.** Add versioned
   registry/settings owners, capability discovery and freshness, initial
   certified Codex/OpenAI, Claude Code/Anthropic, and Gemini/Google CLI/API
   adapters where their verified capabilities permit, and schema-backed custom
   CLI/API/local-runtime registration. Apply the same schema, security,
   compatibility, certification, attestation, freshness, revocation, authority,
   and budget eligibility floor to Auto, Manual, Inherit, custom, and local
   choices. Implement structured argv and typed requests, race-free descriptor-
   pinned or equivalent executable use and private bounded response files.
   Revalidate destination class/address after DNS and before every connection/
   redirect/proxy/nested-tunnel hop, and intended peer identity/SNI/certificate
   policy at every TLS handshake including TLS proxies and nested tunnels. Only
   an exact local-runtime endpoint policy may permit private, loopback, link-
   local, metadata, or Unix-socket destinations; ordinary network permission
   cannot grant that exception. Use explicitly authorized ephemeral
   secret delivery, native reasoning observation and
   derived normalized-effort mapping provenance, deterministic reselection,
   certification expiry/drift/outage handling, and distinct requested,
   selected, effective, and actual-observed attestation without shell
   templates, implicit downloads or service starts, silent substitution, or
   new execution authority.
15. **Implement the team orchestrator, common launch gateway, and retry
   progress.** On top of steps 11-14, connect L1/L2 ownership, rigor-aware Lead-
   role compression/instantiation, Orchestrator-to-Lead and Lead-to-Task
   delegation, task-wide independent perspectives, and trusted-control/
   untrusted-data transport. Consume the provider-owned selection and attestation
   schemas, authorize only
   requested/selected/effective states before spawn, require actual-observed
   evidence in a separate run-admission decision, and provide safe
   transport dispatch, run/result persistence, read-only defaults, sole/disjoint
   writer ownership, structured result review, immutable STOP/re-entry,
   interruption, budgets, failure/progress signatures, finite exits, L5
   approval timing, reapproval fingerprints, relationship/task state machines,
   and local-only/unsynced/reconciling states. Mandatory gates and exact-once
   verification ownership remain authoritative.
16. **Implement the parent-child Saga adapter.** Use only the frozen projection
   and message allowlists, stable relationship identity, epochs, leases,
   monotonic sequence, causality, message and provider-effect idempotency keys,
   request/authority fingerprints, expected provider-object selectors, hashes,
   bounded payloads, authenticated message/receipt proofs, graceful drain/
   emergency revoke, fenced rollback states, and reconciliation with isolated
   fixtures; never traverse, test, or mutate
   registered child repositories from parent CI. Preserve independent child
   task, approval, Git, CI, progress, and evidence state, and block missing/
   ambiguous/revoked parents or unknown external-effect outcomes.
17. **Extend Control Center producer/schema/settings.** Add producer-owned
   lifecycle, phase, rigor, scoring, trigger, loop, approval, capability, Git
   authority, blocker, next-action, knowledge-store health, evidence freshness,
   relationship/task state, instruction local/fallback/profile state, policy
   composition provenance, settings revision/epoch/freshness/expiry,
   hierarchical team/layer/role/run/delegation/budget/ownership state,
   distinctly labeled provider-selection and Git-delivery Manual modes, Auto/
   Manual/Inherit selection and inheritance dry-run, registry/
   certification/custom-adapter status, execution-provider/model-publisher/
   agent-product/adapter/transport/model/reasoning choices, requested/selected/
   effective/actual-observed attestation, atomic settings apply/revision/
   receipt/guarded-revert state, workflow activation-mode banner and permitted-
   control semantics, local-only/unsynced/
   reconciling state,
   impact/scheduling summary, and verified-weight progress projections. Retain
   current presets and guarded settings preview/apply behavior. Reject secrets,
   raw payloads, unsafe paths, executable browser actions, legacy-unknown green
   status, and UI-inferred authority.

P1 exit: focused owner tests and relevant medium tests pass for storage,
runtime/side-effect authority, impact closure, scheduling/review selection,
context compilation, workflow/rigor/retry, team topology, provider registry,
CLI/API/local launch/configuration verification, bounded Lead-to-Task
delegation, trust-envelope handling,
budget/ownership/concurrency enforcement, instruction, Git settings, adapter
isolation, Dashboard schema/data, security, and document synchronization
without external-repository mutation, required-check misses, or unjustified
approvals in covered fixtures.

#### P2: Presentation, migration, release proof, and activation

18. **Paused: implement and accept the human-facing Control Center experience.** Display
   descriptive lifecycle names and the canonical Hierarchical Multi-Agent Team
   organization instead of legacy aliases, explain rigor, role compression,
   execution selection, execution-provider/model-publisher/agent-product/
   adapter/transport/model/reasoning
   configuration, delegation, ownership, budget, and approval reasons at each
   display depth. Let the developer manage Auto/Manual/Inherit choices and
   guarded custom registry entries from the organization chart. Before apply,
   show an inheritance dry-run with requested, selected, effective, and actual-
   observed state distinctions; apply atomically with a revisioned receipt and
   provide guarded revert with a fresh dry-run, current-revision comparison, and
   authority/certification revalidation. Expose presets/effective capability,
   certification,
   store/evidence freshness, impact and scheduling explanations, verified
   progress, and blockers through progressive disclosure and a chart-equivalent
   semantic comparison table with the required parent/layer, role, source,
   four-state, certification, blocker, and remediation fields.
   Keep a persistent `planned|shadow|enforced|rolled_back` mode banner: planned
   and shadow grant no new authority, enforced is active, and rolled back uses
   the restored legacy path with new-workflow actions disabled. Route
   visual changes through the design-system authority and preserve localization,
   keyboard operation, focus order, labels, contrast, and screen-reader state.
19. **Implemented locally: run compatibility and storage migration.** Verify legacy A-F inputs,
    existing FrameCue/TraceCue-style stronger local obligations,
    versionless/1.0.0 unsupported/manual behavior, seven-phase commands, lesson
    routes, existing settings, rename/move/reclone/fork/parent-change identity,
    detach/archive/decommission, legacy records, SQLite upgrade interruption,
    backup/restore/rebuild, Saga interruption, and rollback. Perform child-local
    migrations only as separately authorized child-repository tasks. Keep the
    new workflow shadow-only while old/new projections and correctness metrics
    are compared, and complete data recovery, fenced rollback, relationship
    archive/decommission, outbox drain/quarantine, and restoration verification
    before activation can be considered.
20. **Split runtime wiring from later activation evidence.** Before Control
    Center reconstruction, configure and isolated-test independently
    authenticated runtime authority, approval/receipt/reconciliation
    verification, separate provider probe and certification authorities,
    operational observation/containment, and one exact CLI adapter path through
    the common gateway. Prove that the current fail-closed placeholders are
    replaced by production-shaped owners under an explicit non-production
    authority profile, while the normal production surface remains unavailable
    and Activation remains `planned`. Then run focused checks first, followed by contract-required medium and aggregate checks
    with one owner per logical inspection. Collect full/no-cache and final-gate
    evidence only in the release phase, bind PR CI to head SHA and main CI to
    merge SHA, verify local/remote synchronization, freeze one release-candidate
    fingerprint, prove correctness measures
    before accepting speed improvements, and verify the required release,
    recovery, rollback, archive/decommission, and drain/quarantine evidence
    against that same fingerprint; any material change returns to shadow proof.
    Only then change the activation mode explicitly and atomically. During
    implementation, emit the required 15-minute
    verified-weight progress reports. Revoke or archive relationships and drain
    or quarantine outboxes only through their policy-owned transition. Cleanup
    remains proposal-only until exact-target approval. Candidate freezing,
    signed-proof verification, ordered transition commands, and fail-closed
    public-verifier trust are implemented; no candidate is frozen and no
    transition is permitted while the Control Center is paused or the later
    trust/evidence set is incomplete. After this non-UI delivery, rebaseline the
    Control Center reconstruction and collect final activation evidence against
    a new immutable candidate only after that reconstructed experience is
    accepted.

P2 exit: every implementation SYNC-ID is `implemented`; all required evidence
is current and exact; correctness metrics meet the zero-miss/non-regression
contract before speed results are accepted; PR/main CI and synchronization
pass; no child was mutated; and activation is the final transition after tested
data recovery, fenced rollback, archive/decommission, and outbox drain/
quarantine paths.

### Implemented owner layers

The implementation extends existing policy and owner layers instead of
creating one-off branches. Its owners include development instruction and
autonomy policies, repository workflow/runner policies, Git and product Git
settings, verification/final-gate policies, Security and repository document
sync, the WorkflowStateStore/storage adapter and migration/recovery tools,
instruction-profile and parent-management-policy schemas, repository/
relationship identity, AuthorityComposer/SideEffectGateway, Saga adapter and
reconciler, message/receipt authenticity proofs, hierarchical team/agent/
delegation schemas, provider identity/capability/certification registry,
selection/attestation/dry-run schemas and custom-manifest owner, provider-
neutral Agent Launcher and CLI/
API/local-runtime adapters, context/impact/scheduling/retry libraries and CLIs,
Dashboard schema/producer, repo-local workflow skills, and their existing
standalone/aggregate-callable tests. Control Center settings/UI artifacts are a
preserved partial implementation whose remaining work and acceptance are
paused; they are not an implemented owner for activation purposes. Each future
slice must finalize its exact artifact list before writing runtime code.

### Verification strategy

- Documentation sync runs the as-built contract, as-built document, workflow
  pair, and repository-development workflow checks listed in this block.
- P0 slices: add focused policy/parser/decision-table/refusal, schema,
  migration, shadow-comparison, and algorithm fixtures plus relevant
  document-sync checks. The refusal matrix includes instruction/profile states,
  stronger legacy obligations, composition inversions, relationship identity,
  authority replay and revocation, direct side-effect paths, message sequence/
  gap/epoch handling, hierarchical team vocabulary/topology, role compression,
  selection-mode inheritance and Manual bypass, registry certification/
  freshness/expiry/revocation/clock-drift/outage behavior, unsupported
  reasoning mapping, requested/selected/effective/actual-observed configuration
  and adapter mismatch, executable/argv/environment/response-file/symlink/
  TOCTOU refusal, endpoint/DNS/rebinding/redirect/TLS/proxy refusal, secret-
  reference scope/audience/expiry/revocation refusal, unauthorized runtime/
  download/install/socket/network/disk/cost effects, depth/agent/parallel/
  budget limits,
  write-ownership conflict, launch/write target changes, trust-envelope and
  prompt/role injection, immutable STOP/re-entry, legacy Git migration,
  forged message/receipt proof, provider-effect matching, graceful drain/
  emergency revoke, offline/archive behavior, premature activation, failed
  fenced rollback, and isolated parent CI.
- P1 slices: add focused storage transaction/crash/recovery, context authority,
  impact-recall, retry-progress, scheduling conflict/resource, review coverage,
  workflow, registry selection, CLI/API/local launch/configuration/reporting,
  bounded Lead-to-Task delegation,
  interruption/budget/ownership enforcement, Git action/ref/SHA and
  time-of-check/time-of-use authority, Saga push/PR/merge reconciliation,
  authenticated receipt/outbox recovery, certification drift/outage recovery,
  adapter-isolation, Dashboard-data, Security, and
  test-plan checks, then only their relevant medium owners.
- P2 slices: after the developer resumes Control Center work, add browser/i18n/
  design-system checks only for the resumed UI changes, complete inheritance
  dry-run/atomic apply/revert, semantic-table/accessibility/mode-banner
  fixtures, and rerun TraceCue/browser acceptance. Then use the repository
  release owner for aggregate, full/no-cache, PR CI, main CI, and synchronization
  evidence exactly once against one frozen candidate.
- Recommended or heavy checks are not added merely because the overall roadmap
  is large; each slice follows its own changed-owner contract.

### Recovery and stop conditions

Every slice is additive and independently revertible. Before activation,
rollback preserves the current A-F overlay, seven phases, instruction resolver,
Git settings, legacy records, Dashboard behavior, and required gates. Fix
failures in their owning policy, implementation, fixture, document, or evidence
layer; do not weaken gates, merge instruction sources, classify invalid local
files as absent, treat a search/ranking result as authority, cache release proof
across runs, stage unrelated dirty changes, share one live database across
repositories, automatically rewrite legacy child instructions, use a child
repository as substitute evidence, treat capability as authority, silently
substitute an Agent execution-provider/model-publisher/agent-product/adapter/
transport/model/reasoning setting,
collapse requested/selected/effective/actual-observed states, let Manual or
Inherit bypass shared eligibility, execute an arbitrary shell adapter template,
start/install/download an unapproved runtime, delegate below Task Agent depth,
or count Runtime/Tools as an agent or independent review perspective. Do not
reinterpret legacy Git settings in place, concatenate untrusted data into
control instructions, promote unreviewed Agent output to evidence, relabel a
Validator safety STOP, or send a quarantined effect after revocation.

Stop on unresolved major design decisions, unowned dirty changes, repository
mismatch, scope expansion, security regression, existing-feature tradeoff,
credential or destructive operations without authority, repeated identical
failure without new information, failed/unknown required CI, evidence mismatch,
storage integrity/migration/recovery failure, impact-graph uncertainty that
cannot be safely expanded, conflicting slice ownership, or any need to mutate a
child repository from the parent task. Also stop on missing, stale, ambiguous,
expired, or revoked management policy/settings/relationship authority;
unsupported legacy semantics; side-effect intent or receipt uncertainty;
message replay/order/gap conflict; checkout/fork/remote/ref/SHA mismatch; or an
offline operation that exceeds the explicit local-only contract.
Also stop on invalid team topology, an unauthorized Lead-to-Task launch,
selection-policy/registry/certification/freshness failure, execution-provider/
model-publisher/agent-product/adapter/transport/model/reasoning/configuration
mismatch, secret-boundary violation,
exceeded agent/parallel/time/token/cost budget, ambiguous or conflicting file
ownership, unreviewed Task Agent output,
loss of Reviewer Gate/Validator independence, prompt-envelope or trust-class
violation, canonical-target or pre-write-state mismatch, provider-effect/object
conflict, forged message/receipt proof, invalid drain/revoke transition,
activation before release/recovery/rollback/archive-decommission proof, failed
fenced rollback, or attempted STOP override.

## Non-Control-Center Security Closure

SYNC-ID: next_development_workflow_non_ui_security_closure
STATUS: implemented
ARTIFACTS: docs/as-built/IMPLEMENTATION_PLAN.md,docs/as-built/REQUIREMENTS.md,docs/as-built/SPECIFICATION.md,docs/workflow/AS_BUILT_SYNC_CONTRACT.tsv,docs/workflow/HANDOFF.md,docs/workflow/TASK_TRACKER.md,learning/NEXT_WORKFLOW_RELEASE_PREREQUISITES.json,tools/check_document_organization.sh,tools/lib/document_paths.sh,tools/lib/next_workflow/agents.mjs,tools/lib/next_workflow/authority.mjs,tools/lib/next_workflow/compatibility.mjs,tools/lib/next_workflow/contracts.mjs,tools/lib/next_workflow/identity.mjs,tools/lib/next_workflow/projection.mjs,tools/lib/next_workflow/provider_discovery.mjs,tools/lib/next_workflow/providers.mjs,tools/lib/next_workflow/release.mjs,tools/lib/next_workflow/runtime.mjs,tools/lib/next_workflow/saga.mjs,tools/lib/next_workflow/store.mjs,tools/next-workflow.mjs,tools/test_lesson_repository.sh,tools/test_next_workflow_agents.mjs,tools/test_next_workflow_authority.mjs,tools/test_next_workflow_compatibility.mjs,tools/test_next_workflow_contracts.mjs,tools/test_next_workflow_identity.mjs,tools/test_next_workflow_projection_settings.mjs,tools/test_next_workflow_providers.mjs,tools/test_next_workflow_release.mjs,tools/test_next_workflow_runtime.mjs,tools/test_next_workflow_saga.mjs,tools/test_next_workflow_store.mjs
TESTS: tools/check_developer_memory_requirements.sh,tools/check_document_organization.sh,tools/check_lesson_structure.sh,tools/check_lesson14_structure.sh,tools/check_next_workflow.sh,tools/test_next_workflow.sh,tools/check_as_built_sync_contract.sh,tools/check_as_built_docs.sh,tools/check_workflow_pair_sync.sh,tools/check_repository_development_workflow.sh,tools/test_repository_development_workflow.sh

Implementation order completed without modifying Control Center code:

1. Replayed three independent read-only CLI audits and converted every
   reproducible non-UI finding into an owner-specific adversarial test.
2. Closed provider certification, manifest, exact-endpoint, grant-containment,
   reviewer-assignment, retry, parent-trust, and identity-reattest gaps. Separate
   injected probe/certification authorities, exact owner-only response
   directories, pre-spawn registry/plan/reservation/target/topology binding,
   parent ownership containment, and dedicated authority-record writers now
   fail closed.
3. Made API/local operational execution explicitly fail closed pending a
   gateway-owned transport instead of trusting caller transport assertions.
4. Added legal, proof-bound, atomic Relationship and activation lifecycle
   writers and prevented generic-store bypass. Each writer reopens the locked
   current row and reruns independent verification in the same transaction;
   activation projection uses the same trust boundary. Repaired immediate
   recovery-mode refresh after the last reconciliation.
5. Bound release prerequisites, exact candidate definitions, current-candidate
   recomputation, content-specific signed evidence, and candidate drift.
6. Installed the common runtime composition in the executable CLI for status,
   preview, and confirmation-bound reconciliation, with unavailable owners
   failing closed.
7. Added the Next Workflow check and aggregate to the repository aggregate and
   passed a historical closure baseline of 192 tests across all 14 suites plus
   all seven contracts.
8. Closed the final independent security-audit findings: read-only sandbox and
   persisted-parent-chain enforcement, unified authority/revocation epochs,
   kind-specific protected-record writers, verified Relationship initialization,
   descriptor-relative CLI response IO, and complete signed activation-record
   reconstruction.
9. Closed the final requirements-audit gaps in the delivered core: read-only
   migration/schema identity validation, fail-closed parsed versionless/unknown
   instruction classification, and independent proof binding for approvals.
10. Closed the final delivery-audit findings by protecting DelegationGrant
    writes, reconstructing complete persisted grants with finite freshness,
    binding every Agent authority/result commit to the live revocation epoch,
    enforcing exact Relationship transition identity and events, validating
    migration names plus physical `sqlite_schema`, refusing schema re-blessing,
    and executing the signed release-proof verification CLI in regression tests.
11. Closed the final security re-audit findings by invalidating all pre-fence
    delegation grants at every consumer, restricting reconciliation to one
    effect-bound receipt proof behind the shared protected-kind guard, and
    rejecting deleted schema, identity, revision, or revocation metadata in
    both read-write and read-only store operation.
12. Closed the final authority-race and persisted-state findings by enforcing
    Implementation-Lead-only writable delegation at creation, persistence, and
    launch resolution; atomically binding effect commit and dispatch claim to
    the live epoch with pre-adapter quarantine; binding Saga acceptance to the
    current persisted Relationship and global epoch; requiring exact activation
    record/event revisions; and binding transition evidence to the frozen
    repository head.
13. Closed the final activation/store re-audit findings by distinguishing a
    truly empty SQLite container from every nonempty database before migration,
    requiring both bootstrap anchors, independently replaying every transition
    signature during final enforcement, and atomically binding the complete
    forward activation chain plus runtime trust to the live global authority
    epoch. A fenced chain cannot be revived with a newer revision; rollback is
    the explicit new-epoch path.
14. Closed the protected-state and lineage re-audit findings by requiring an
    independent whole-artifact authority for import/restore, anchoring every
    depth-1 grant to the canonical Orchestrator, rejecting stale non-revoking
    Relationship transitions after a fence, and reconstructing candidate HEAD,
    PR repository/number, main merge SHA, and local/remote `origin/main`
    synchronization as one signed release lineage.
15. Closed the final execution-boundary re-audit by binding each Agent CLI plan
    to the persisted grant sandbox. The successor non-UI runtime slice later
    replaced repository-root execution with a private task-envelope directory,
    while retaining the exact grant binding. It also made the
    receipt-proof verifier a store-configured independent owner with locked
    effect-identity reconstruction, repeating revision CAS inside SQLite write
    transactions (including the revocation writer), and carrying the gateway
    fence through the provider adapter. Stale expected fence epochs now roll
    back before mutation.
    The default CLI executor now refuses operational fenced dispatch; a future
    production executor must enforce and attest the exact downstream fence.
16. Added a non-exemptible Next Workflow document-sync classification and
    synchronized the legacy procedural, parent-child, CI, Security, product
    template, and paused Control Center data authorities required by the PR and
    push range gate. Hardened Git evidence capture for the nested-sandbox case
    where a completed status-zero child also reports post-exec `EPERM`; only a
    real stdout buffer with exact status zero is accepted. The final-gate test
    passed five consecutive runs after the correction.

This historical security-closure delivery did not claim activation-bound
production wiring. Its successor non-UI slice now configures and isolated-tests
independently authenticated owners and routes one exact CLI Agent path through
the gateway. The externally reachable production entry point remains
unavailable and Activation remains `planned`; checked-in labels or self-
attestation still cannot satisfy production authority.

Deferred product boundaries are unchanged: Phase 18 Control Center implementation,
TraceCue/browser review, and developer acceptance remain an explicitly
unfinished task for later resumption. Phase 20 immutable-candidate activation
evidence cannot begin until that acceptance. The currently verified
non-Control-Center scope may nevertheless be delivered through a separate
scoped PR, main CI, and synchronization now; that delivery cannot be reused as
the later activation candidate. Activation remains `planned`, no activation
candidate was frozen, and no branch/worktree was deleted.

## Non-UI Runtime Wiring Implementation Plan

SYNC-ID: next_workflow_non_ui_runtime_wiring
STATUS: implemented
ARTIFACTS: docs/as-built/IMPLEMENTATION_PLAN.md,docs/as-built/REQUIREMENTS.md,docs/as-built/SPECIFICATION.md,docs/workflow/AS_BUILT_SYNC_CONTRACT.tsv,docs/workflow/HANDOFF.md,docs/workflow/TASK_TRACKER.md,docs/workflow/next-workflow/authority-lifecycle.json,docs/workflow/next-workflow/provider-registry.json,docs/workflow/next-workflow/state-store.json,docs/workflow/next-workflow/team-agent-security.json,learning/NEXT_WORKFLOW_AGENT_SELECTION_SETTINGS.json,learning/NEXT_WORKFLOW_PROVIDER_REGISTRY.json,tools/lib/next_workflow/agents.mjs,tools/lib/next_workflow/authority.mjs,tools/lib/next_workflow/contracts.mjs,tools/lib/next_workflow/migrations/003_runtime_wiring.sql,tools/lib/next_workflow/provider_discovery.mjs,tools/lib/next_workflow/providers.mjs,tools/lib/next_workflow/run_lifecycle.mjs,tools/lib/next_workflow/runtime.mjs,tools/lib/next_workflow/runtime_barrier.cjs,tools/lib/next_workflow/runtime_containment.mjs,tools/lib/next_workflow/runtime_trust.mjs,tools/lib/next_workflow/settings.mjs,tools/lib/next_workflow/store.mjs,tools/lib/next_workflow/task_delivery.mjs,tools/next-workflow.mjs,tools/test_next_workflow.sh,tools/test_next_workflow_agents.mjs,tools/test_next_workflow_authority.mjs,tools/test_next_workflow_isolated_runtime.mjs,tools/test_next_workflow_isolated_runtime.sh,tools/test_next_workflow_projection_settings.mjs,tools/test_next_workflow_providers.mjs,tools/test_next_workflow_release.mjs,tools/test_next_workflow_run_lifecycle.mjs,tools/test_next_workflow_run_lifecycle.sh,tools/test_next_workflow_saga.mjs,tools/test_next_workflow_store.mjs,tools/test_next_workflow_task_delivery.mjs,tools/test_next_workflow_task_delivery.sh
TESTS: tools/check_next_workflow.sh,tools/test_next_workflow.sh,tools/check_security_invariants.sh,tools/check_as_built_sync_contract.sh,tools/check_as_built_docs.sh,tools/check_workflow_pair_sync.sh,tools/check_repository_development_workflow.sh,tools/test_repository_development_workflow.sh

Implementation uses dependency-driven slices rather than a fixed phase count:

1. **Canonical contract correction.** Synchronize the revised dependency order,
   separate non-UI implementation from production availability and Activation,
   update the four affected machine contracts, and preserve all paused Control
   Center paths unchanged.
2. **Protected trust and durable decision fences.** Add a protected external
   trust-source resolver, exact one-use Approval issuance/consumption, safe
   same-payload idempotent replay, and finalization-time Activation/authority/
   expiry/policy/settings checks inside the SQLite transaction.
3. **Run lifecycle.** Implement the minimal reusable lifecycle owner with
   durable run/process-group identity, start/observe/cancel/terminate/
   collect-result/reconcile/recover, bounded files/output, timeout escalation, absence
   verification, and fail-closed unknown recovery.
   Use a protected two-stage barrier whose controller channel treats EOF as
   permanent non-release. Persist the barrier and contained-process identities
   before release, observe namespace evidence, persist `RUNNING`, and only then
   send the distinct release signal. Keep result IO bound to the exact pinned,
   owner-controlled `0700` output directory even if its pathname is replaced.
4. **Trusted task-envelope lineage and automatic execution selection.** Resolve
   `AGENTS.MD` and the exact procedural instruction at launch, build and persist
   the authority-owned envelope, automatically select an eligible model and
   reasoning effort from role/rigor/capability/risk, pass those exact values to
   the CLI, compare them to runtime observation, report both values at every
   launch, and bind all fingerprints through admission, result validation,
   independent review, receipt, and closure.
5. **Isolated CLI vertical wiring.** Compose protected source, Approval,
   observer, Receipt, reconciliation, containment, and fencing-aware lifecycle
   owners through the existing gateway. Exercise one provider-neutral CLI path
   only under an isolated profile; do not expose a production launch command.
   Use Linux user, mount, network, and PID namespaces plus Bubblewrap for each
   run; do not add Docker, Podman, Kubernetes, a daemon, or container images.
   Reject private runtime roots that overlap, contain, or are contained by the
   repository, resolved Git/control metadata, or protected owner-trust roots.
   Add a non-installing prerequisite diagnostic that reports missing packages,
   OS namespace policy, OS-appropriate install commands, and a recheck command.
6. **Conformance, recovery, and freeze.** Prove success and adversarial denial,
   cancellation, termination, timeout, crash, replay, race, mismatch, redaction,
   and parent-child isolation. Final independent CLI audit must also prove deep
   trust immutability, protected verifier identity, process-identity durability
   before startup release, private task-input working directories, launch-
   argument observation without self-report trust, review-gated result
   candidates, finalization-time task-delivery revalidation, dedicated Agent
   lifecycle writers that reload the complete independent-review topology,
   protected operational gateway brands, restrictive owner/task model-policy
   composition, fail-closed nonempty resource/cost policy parsing, protected
   lifecycle/executor factory brands, and non-consuming prompt fingerprint
   reads. Reload completed runtime provenance before accepting a candidate,
   require its reconciled launch/admission receipts and a private lifecycle
   writer bound to the exact protected store,
   revalidate provider resource/cost/timeout bounds against the launch
   reservation, and preserve the result fingerprint on completed-run replay.
   Bind protected runtime writes to an unexposed writer capability for the
   exact store, carry recovery-only authority through restart termination,
   bind every candidate to the exact frozen launch request and a deterministic
   durable launch/admission lineage,
   and require same-trust protected agent-authority brands for grants,
   reviewer assignments, reviews, reservations, and Validator decisions.
   Current local evidence is 217 passing tests in 17 suites, all seven frozen
   contracts, and a passing clean-candidate canonical repository aggregate.
   Deliver the unchanged candidate via PR/main CI and synchronization.

Rollback is additive and fail-closed at every slice: remove the isolated profile
and unregister its lifecycle/trust owners, quarantine unresolved fixture runs,
and retain the current production hard-deny composition. No rollback may restore
candidate-controlled trust, reusable Approval, unfenced finalization, direct
adapter access, registered child traversal, or a Control Center dependency.

The implementation exit is intentionally not production Activation. It is:
non-UI runtime wiring implemented; isolated vertical evidence current;
production unavailable; Activation `planned`; Control Center reconstruction,
TraceCue/browser acceptance, immutable candidate freeze, and full Activation
pending.

The later Control Center reconstruction must present the same isolation
diagnostic in non-technical language, show copyable installation and recheck
steps, and never install packages or change administrator policy without an
explicit developer action. It must also distinguish subscription CLI, metered
API, and local-model providers and expose model/publisher deny lists and cost
ceilings. This is a deferred UI requirement only; no paused Control Center file
is changed by this implementation.

The verification slice is environment-honest. Real containment tests run when
the isolation diagnostic proves that Bubblewrap and the required namespaces are
usable. On a CI host that lacks those prerequisites, the diagnostic assertion
must pass and each real-containment case must be reported as an explicit skip;
the suite must not simulate containment, silently run without it, or fail only
because the optional host package is absent. Production execution remains
fail-closed in either case.
