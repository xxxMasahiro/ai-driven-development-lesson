# HANDOFF.md

## CI Composed Validation Activation Handoff

SYNC-ID: ci_composed_validation_activation
STATUS: implemented
ARTIFACTS: docs/workflow/AS_BUILT_SYNC_CONTRACT.tsv,docs/workflow/FINAL_GATE_EXECUTION_POLICY.tsv,docs/workflow/FINAL_GATE_CI_GRAPH.tsv,docs/workflow/FINAL_GATE_GAP_COMMANDS.tsv,docs/workflow/FINAL_GATE_COVERAGE.tsv,docs/workflow/TEST_PLAN_MANIFEST.tsv,docs/workflow/GIT_HOOK_CHECKS.tsv,docs/workflow/GIT_HOOK_PARALLEL_GROUPS.tsv,docs/workflow/SAFEFLOW_SECURITY_BACKFILL.tsv,docs/workflow/PRODUCT_SECURITY_POLICY.tsv,tools/lib/verification_core.mjs,tools/lib/as_built_index.mjs,tools/lib/ci_composition.mjs,tools/verification-ci,tools/ci-final-gate,tools/check_ci_workflow_structure.sh,tools/test_ci_pipeline_acceleration.sh,tools/check_repository_development_workflow.sh,tools/test_ci_final_gate.sh,tools/test_ci_composition.mjs,tools/test_ci_composition.sh,tools/test_verification_git_hooks.sh,tools/test_lesson_repository.sh,.github/workflows/ci.yml,.github/workflows/lesson14-ci.yml,docs/as-built/REQUIREMENTS.md,docs/as-built/SPECIFICATION.md,docs/as-built/IMPLEMENTATION_PLAN.md,docs/workflow/TASK_TRACKER.md,docs/workflow/HANDOFF.md
TESTS: tools/test_ci_composition.sh,tools/test_ci_final_gate.sh,tools/test_ci_pipeline_acceleration.sh,tools/check_ci_workflow_structure.sh,tools/test_verification_foundation.sh,tools/test_verification_git_hooks.sh,tools/test_ci_evidence.sh,tools/test_git_hooks.sh,tools/test_git_hooks_parallel.sh,tools/test_as_built_single_pass.sh,tools/test_as_built_sync_contract.sh,tools/check_repository_development_workflow.sh,tools/test_repository_development_workflow.sh,tools/check_test_plan_coverage.sh,tools/test_test_plan.sh,tools/check_security_invariants.sh,tools/test_security_invariants.sh,tools/test_dashboard_control_center.sh,tools/test_lesson_playwright.sh,tools/check_as_built_sync_contract.sh,tools/check_as_built_docs.sh,tools/check_workflow_pair_sync.sh

Active boundary:

- Required workflow/job contexts, triggers, document-sync range behavior, and failure propagation remain unchanged.
- Main CI may distribute existing checks but may not drop compatibility subjects.
- Lesson14 compatibility jobs remain present; persistent or cross-workflow result reuse remains disabled.

## Dashboard Control Center Same-Run Validation Handoff

SYNC-ID: dashboard_control_center_same_run_validation
STATUS: implemented
ARTIFACTS: docs/workflow/AS_BUILT_SYNC_CONTRACT.tsv,docs/workflow/FINAL_GATE_EXECUTION_POLICY.tsv,docs/workflow/TEST_PLAN_MANIFEST.tsv,docs/workflow/GIT_HOOK_CHECKS.tsv,docs/workflow/GIT_HOOK_PARALLEL_GROUPS.tsv,docs/workflow/FINAL_GATE_COVERAGE.tsv,docs/workflow/SAFEFLOW_SECURITY_BACKFILL.tsv,docs/workflow/PRODUCT_SECURITY_POLICY.tsv,vite.config.mjs,tools/lib/dashboard_vite_runtime.mjs,tools/lib/dashboard_verification.mjs,tools/check_dashboard_bundle_contract.mjs,tools/check_dashboard_bundle_contract.sh,tools/dashboard-verification,tools/test_dashboard_control_center.sh,tools/test_dashboard_same_run_verification.mjs,tools/test_dashboard_same_run_verification.sh,tools/test_verification_runner.mjs,tools/test_lesson_repository.sh,tools/test_ci_pipeline_acceleration.sh,.github/workflows/ci.yml,.github/workflows/lesson14-ci.yml,docs/as-built/REQUIREMENTS.md,docs/as-built/SPECIFICATION.md,docs/as-built/IMPLEMENTATION_PLAN.md,docs/workflow/TASK_TRACKER.md,docs/workflow/HANDOFF.md
TESTS: tools/test_dashboard_same_run_verification.sh,tools/check_dashboard_bundle_contract.sh,tools/test_dashboard_control_center.sh,tools/test_verification_runner.sh,tools/test_verification_foundation.sh,tools/test_verification_git_hooks.sh,tools/test_git_hooks.sh,tools/test_git_hooks_parallel.sh,tools/check_test_plan_coverage.sh,tools/test_test_plan.sh,tools/check_security_invariants.sh,tools/test_security_invariants.sh,tools/test_ci_pipeline_acceleration.sh,tools/check_ci_workflow_structure.sh,tools/check_as_built_sync_contract.sh,tools/check_as_built_docs.sh,tools/check_workflow_pair_sync.sh

Active boundary:

- Keep UI, CSS, schema, routes, browser assertions, and child repositories unchanged.
- Introduce only policy-owned same-run build/browser orchestration and strict receipts.
- Keep Vite's mutable dependency cache behind the dependency-free runtime-path helper and under the ignored Dashboard runtime root so clean CI cannot mutate the source/config inventory.
- Keep browser sharding, persistent result reuse, and cross-workflow reuse disabled.

## Local Exact-Once Verification Activation Handoff

SYNC-ID: verification_local_exact_once_activation
STATUS: implemented
ARTIFACTS: docs/workflow/AS_BUILT_SYNC_CONTRACT.tsv,docs/workflow/FINAL_GATE_EXECUTION_POLICY.tsv,docs/workflow/TEST_PLAN_MANIFEST.tsv,docs/workflow/GIT_HOOK_CHECKS.tsv,docs/workflow/GIT_HOOK_PARALLEL_GROUPS.tsv,docs/workflow/GIT_HOOK_RECOMMENDATION_PATHS.tsv,docs/workflow/FINAL_GATE_COVERAGE.tsv,docs/workflow/SAFEFLOW_SECURITY_BACKFILL.tsv,docs/workflow/PRODUCT_SECURITY_POLICY.tsv,tools/lib/verification_core.mjs,tools/lib/verification_runner.mjs,tools/lib/verification_git_hooks.mjs,tools/verification-runner,tools/git-hooks,tools/lib/ci_evidence.sh,tools/lib/fixture_copy.sh,tools/test_verification_runner.mjs,tools/test_verification_runner.sh,tools/test_verification_git_hooks.sh,tools/test_git_hooks_parallel.sh,tools/test_fixture_copy.sh,tools/test_ci_final_gate.sh,tools/lib/repository_development_runner.sh,tools/test_repository_development_workflow.sh,tools/test_lesson_repository.sh,tools/test_ci_pipeline_acceleration.sh,.github/workflows/ci.yml,.github/workflows/lesson14-ci.yml,docs/as-built/REQUIREMENTS.md,docs/as-built/SPECIFICATION.md,docs/as-built/IMPLEMENTATION_PLAN.md,docs/workflow/TASK_TRACKER.md,docs/workflow/HANDOFF.md
TESTS: tools/test_verification_runner.sh,tools/test_verification_git_hooks.sh,tools/test_git_hooks.sh,tools/test_git_hooks_parallel.sh,tools/test_fixture_copy.sh,tools/test_ci_evidence.sh,tools/test_ci_final_gate.sh,tools/check_repository_development_workflow.sh,tools/test_repository_development_workflow.sh,tools/check_security_invariants.sh,tools/test_security_invariants.sh,tools/check_test_plan_coverage.sh,tools/test_test_plan.sh,tools/test_ci_pipeline_acceleration.sh,tools/check_ci_workflow_structure.sh,tools/check_as_built_sync_contract.sh,tools/check_as_built_docs.sh,tools/check_workflow_pair_sync.sh

Restart context:

- Foundation evidence remains record-only and As-Built indexed validation is implemented with a legacy rollback.
- The active hook catalog and final coverage remain compatibility authorities. The current plan derives 64 compatibility subjects and 63 executions after one policy-declared As-Built provision; these observations are not runtime constants.
- Full/no-cache now uses the composed runner in enforce mode. Fast/minimal behavior and cache semantics remain legacy-compatible, while `GIT_HOOKS_EXECUTION_ENGINE=legacy|shadow` provides rollback/comparison.
- Repository development runner reuse now uses the shared content fingerprint and rejects same-name dirty content changes.
- Fixture exclusions, cancellation grace, timeout, output ceiling, task locks, and activation scope are policy-owned. Fixture copies remain archive-isolated and hardlink-free.
- Child repositories, external services, workflow-to-workflow reuse, and persistent result caching remain outside scope.

Next safe action:

- Continue with `dashboard_control_center_same_run_validation`. Do not change Dashboard UI/CSS/schema; consolidate build/browser owners and machine-readable receipts only.

## As-Built Single-Pass Validation Handoff

SYNC-ID: as_built_single_pass_validation
STATUS: implemented
ARTIFACTS: docs/workflow/AS_BUILT_SYNC_CONTRACT.tsv,docs/workflow/FINAL_GATE_EXECUTION_POLICY.tsv,docs/workflow/TEST_PLAN_MANIFEST.tsv,docs/workflow/GIT_HOOK_CHECKS.tsv,docs/workflow/GIT_HOOK_PARALLEL_GROUPS.tsv,docs/workflow/GIT_HOOK_RECOMMENDATION_PATHS.tsv,docs/workflow/FINAL_GATE_COVERAGE.tsv,tools/lib/verification_core.mjs,tools/lib/as_built_index.mjs,tools/check_as_built_sync_contract.mjs,tools/check_as_built_sync_contract.sh,tools/as-built-sync,tools/test_as_built_single_pass.mjs,tools/test_as_built_single_pass.sh,tools/test_lesson_repository.sh,tools/test_ci_pipeline_acceleration.sh,.github/workflows/ci.yml,.github/workflows/lesson14-ci.yml,docs/as-built/REQUIREMENTS.md,docs/as-built/SPECIFICATION.md,docs/as-built/IMPLEMENTATION_PLAN.md,docs/workflow/TASK_TRACKER.md,docs/workflow/HANDOFF.md
TESTS: tools/check_as_built_sync_contract.sh,tools/check_as_built_docs.sh,tools/test_as_built_sync_contract.sh,tools/test_as_built_single_pass.sh,tools/check_test_plan_coverage.sh,tools/test_test_plan.sh,tools/test_git_hooks.sh,tools/test_git_hooks_parallel.sh,tools/test_ci_final_gate.sh,tools/test_ci_pipeline_acceleration.sh,tools/check_ci_workflow_structure.sh,tools/check_workflow_pair_sync.sh

Restart context:

- `verification_composition_foundation` is implemented in record-only mode.
- The indexed owner now reads and structures the contract, five documents, wiring, hook policy, and runtime-evidence sources once per invocation, then validates every sync ID through maps.
- The Bash implementation remains available through `AS_BUILT_SYNC_ENGINE=legacy`; public commands, strict refusal behavior, and output status remain compatible.
- Focused parity, authority-mutation refusal, and configured performance tests pass. The contract check fell from roughly 90 seconds to below one second on the current worktree.

Next safe action:

- Continue with `verification_local_exact_once_activation`. General result reuse remains inactive until that synchronized slice completes.

## Verification Composition Foundation Handoff

SYNC-ID: verification_composition_foundation
STATUS: implemented
ARTIFACTS: docs/workflow/AS_BUILT_SYNC_CONTRACT.tsv,docs/workflow/FINAL_GATE_EXECUTION_POLICY.tsv,docs/workflow/FINAL_GATE_EVIDENCE_SCHEMA.tsv,docs/workflow/TEST_PLAN_MANIFEST.tsv,docs/workflow/GIT_HOOK_CHECKS.tsv,docs/workflow/GIT_HOOK_PARALLEL_GROUPS.tsv,docs/workflow/GIT_HOOK_RECOMMENDATION_PATHS.tsv,docs/workflow/FINAL_GATE_COVERAGE.tsv,docs/workflow/SAFEFLOW_SECURITY_BACKFILL.tsv,docs/workflow/PRODUCT_SECURITY_POLICY.tsv,tools/lib/verification_core.mjs,tools/verification,tools/lib/ci_evidence.sh,tools/test_verification_foundation.mjs,tools/test_verification_foundation.sh,tools/test_ci_evidence.sh,tools/test_ci_pipeline_acceleration.sh,tools/test_lesson_repository.sh,.github/workflows/ci.yml,.github/workflows/lesson14-ci.yml,docs/as-built/REQUIREMENTS.md,docs/as-built/SPECIFICATION.md,docs/as-built/IMPLEMENTATION_PLAN.md,docs/workflow/TASK_TRACKER.md,docs/workflow/HANDOFF.md
TESTS: tools/test_verification_foundation.sh,tools/test_ci_evidence.sh,tools/test_ci_final_gate.sh,tools/test_ci_pipeline_acceleration.sh,tools/check_security_invariants.sh,tools/test_security_invariants.sh,tools/check_test_plan_coverage.sh,tools/test_test_plan.sh,tools/test_git_hooks.sh,tools/check_ci_workflow_structure.sh,tools/check_as_built_sync_contract.sh,tools/check_as_built_docs.sh,tools/check_workflow_pair_sync.sh

Restart context:

- The approved test/CI optimization is split into five new sync IDs; only this foundation ID is active.
- Existing checks, command surfaces, required CI contexts, hook modes, Step 1-7, Step 1-14, security gates, and document routes remain authoritative.
- Runtime mode is record-only. Version 2 evidence is atomically recorded beside version 1 and cannot satisfy a release gate until shadow parity is proven in a later slice.
- Configuration and provider adapters own repository names, URLs, paths, jobs, timeouts, thresholds, and browser targets; reusable core modules must not contain those values.

Next safe action:

- Continue with `as_built_single_pass_validation`. Keep result reuse and CI scheduling inactive until their dedicated synchronized slices.

## Current State

The lesson repository is in an implemented as-built sync-contract state with implemented Git workflow policy settings and implemented menu-wide Git workflow policy controls.
The current validation scope is lesson-side only; it must not recreate or depend on `task-tracker-repository`.
Existing 7-day lessons, 14-step lessons, free-development flow, advanced modules, checks, and repository-boundary behavior must not be weakened or replaced.
The implementation adds `docs/workflow/AS_BUILT_SYNC_CONTRACT.tsv`, `tools/check_as_built_sync_contract.sh`, `tools/as-built-sync`, `tools/test_as_built_sync_contract.sh`, `docs/workflow/GIT_WORKFLOW_POLICY.tsv`, `learning/GIT_WORKFLOW_SETTINGS.tsv`, `tools/lib/git_workflow_policy.sh`, `tools/git-workflow`, and `tools/test_git_workflow_policy.sh`; it also extends `tools/menu`, `tools/dashboard`, and `tools/test_menu_prerequisites.sh` for menu-wide Git policy controls while preserving product repository cleanup, shared menu prerequisite control for menu items 1 through 6, refactorability, ecosystem fit, reusable design, generality, and the no-existing-feature-tradeoff rule.
The implemented Git workflow policy now applies at menu level for items 1 through 7 and preserves all existing Git sync, CI, menu, dashboard, cleanup, lesson, and as-built synchronization behavior.
The current implemented Git workflow action settings separate Git workflow actions into detailed controls for commit, push, PR creation, PR CI monitoring, merge execution, developer-responsibility auto-merge, main CI monitoring, and local/remote sync monitoring while preserving existing broad Git settings and menu-wide Git policy behavior.
The current implemented Git hooks policy provides faster safe serial pre-commit behavior with `full`, `fast`, and `minimal` modes, conservative Git-local caching, and a path-based recommendation for when local full/no-cache should be run before push.
The current implemented local verification scope policy requires everyday test execution to follow workflow contracts, changed scope, and user approval; heavy recommended checks must be presented before execution unless an immediate safety condition requires stopping.
The current implemented resource-budgeted parallel guard captures the developer-approved implementation proposal for safe optional parallel execution based on user-configured memory and swap budgets; runtime policy, settings, CLI, Git hooks integration, Playwright worker recommendation, CI wiring, and tests are present.
The current implemented learner context foundation adds validated source documents under `learning/context/` and a read-only `tools/lesson-context` command.
The current implemented learner context runtime integration connects `tools/lesson` and `tools/lesson14` status output to learner-context summaries while keeping Free Development Mode as a workflow, not a lesson.
The current implemented Security guard backfill adds repository-level security invariants, `docs/workflow/SAFEFLOW_SECURITY_BACKFILL.tsv`, `tools/check_security_invariants.sh`, and `tools/test_security_invariants.sh`.
The current implemented product security workflow gate adds `docs/workflow/PRODUCT_SECURITY_POLICY.tsv`, `learning/context/WORKFLOW_CONTEXT_MAP.tsv`, `tools/product-security`, `tools/test_product_security.sh`, and gate wiring for menu items 4, 5, and 6.
The current implemented test and CI safe time optimization first phase is documented as `test_ci_safe_time_optimization_plan`; it provides observe-only planning, fail-closed coverage validation, result attestation, CI-safe Git hooks parallelism, and lightweight fixture copying while preserving full/no-cache verification.
The current implemented CI timing and approved auto-improvement cycle is documented as `ci_timing_auto_improvement_plan`; it records measured final common aggregate/full-hooks timing, provides precise CI status targeting, and generates proposal-only CI improvement candidates while keeping future full/no-cache policy refinement developer-approved.
The current implemented CI aggregate and full-hooks split is documented as `ci_aggregate_full_hooks_split`; it runs main `CI` lesson aggregate and full/no-cache Git hook verification as separate jobs with a strict final gate while preserving cache policy and full/no-cache semantics.
The current implemented dashboard control center data layer is documented as `dashboard_control_center_data_layer`; it provides a read-only JSON source behind an AI-driven development control center while preserving the existing CLI dashboard.
The current implemented dashboard control center React UI is documented as `dashboard_control_center_react_ui_plan`; it provides a read-only browser control-center scope with maintained entry tooling, standalone/aggregate browser checks, and no UI action execution.
The current implemented dashboard control center information architecture is documented as `dashboard_control_center_information_architecture`; it provides category navigation, Overview-first presentation, the original `en`/`ja` fixed-label localization layer, snapshot freshness display, and Safety Actions command-preview isolation while preserving read-only behavior. Full standard Dashboard UI locale support is implemented separately as `dashboard_control_center_full_locale_ui_support`.
The current implemented dashboard control center visual polish is documented as `dashboard_control_center_visual_polish`; that layer brings the categorized read-only UI closer to `dashboard-control-center/mocks/archive/mock-categorized-dashboard.png` without itself adding automatic refresh, live CI/Git authority, or UI command execution.
The current implemented dashboard control center mock parity is documented as `dashboard_control_center_mock_parity`; it brings the Overview structure closer to `mock-categorized-dashboard.png` with producer-owned metrics, compact issue preview expansion, central percentage rings, and Explore Pages metrics without fixed mock values.
The latest implemented dashboard control center live snapshot sync is documented as `dashboard_control_center_live_snapshot_sync`; it adds atomic schema-validated snapshot publication plus read-only browser polling and last-known-good behavior without browser command execution or live CI/Git authority.
The current implemented dashboard control center mock-aligned Overview is documented as `dashboard_control_center_mock_aligned_overview`; it keeps the Overview closer to the mock, makes empty Partial Failures explicit, separates manual follow-ups, avoids layout-changing Overview expansion, and preserves the read-only browser boundary.
The current implemented dashboard control center detail-page mock parity follow-up is documented as `dashboard_control_center_detail_mock_parity`; it uses the four approved detail mock images as UI/UX source references to make category pages explain what they check, what judgment they support, and what must be reviewed next while preserving the read-only browser boundary.
The current dashboard control center exact mock alignment correction is implemented as `dashboard_control_center_mock_exact_alignment_correction`; it records the corrective implementation pass that aligns the dashboard runtime with the approved mock family while preserving producer-owned state and read-only browser behavior.
The current implemented dashboard control center Settings safe change is documented as `dashboard_control_center_settings_safe_change_plan`; it now includes guarded Settings edits, Settings-driven Dashboard fixed UI locale resolution, and immediate post-apply snapshot refresh without a page reload.
The latest implemented dashboard material-event identifier boundary aligns producer output with the existing 160-character dashboard schema limit. Long product evidence inputs now use a deterministic SHA-256 digest suffix, so snapshot publication remains valid without editing or executing child repositories.
The latest implemented TraceCue browser-quality follow-up keeps persistent status summaries distinct from active loading indicators in DOM naming, uses sequential Overview headings, prevents audience-mode badge shrinkage, gives compact Overview links a minimum 24px desktop focus target, and gives compact mobile controls a minimum 44px touch target.

## Key Implemented Capabilities

- 14-day approval enforcement.
- Learning mode A/B/C selection and switching for 7-day and 14-day lessons.
- Workflow display language and product development language selection for 7-day and 14-day lessons.
- Dashboard Control Center fixed UI labels follow the Settings workflow display language for every standard language, with immediate no-reload refresh after apply.
- Standard language choices: `ja`, `en`, `ko`, `zh-CN`, `zh-TW`, `es`, `pt-BR`, `fr`, `de`, `id`, `vi`, `th`, `hi`, and `ar`.
- Dashboard fixed-label dictionaries now exist for the full standard language set. Unsupported custom language values remain workflow data unless a later locale policy promotes them.
- Backward compatibility: `zh` remains accepted and is recorded as `zh-CN`; non-empty unsupported values remain available as `custom`.
- Entry-step gates requiring learning mode, workflow display language, and product development language before passing `setup.index` in both structured lesson versions.
- Learner-selected start positions.
- Free Development Mode.
- Team Development and Docker advanced module.
- Dialogue and wall-bouncing as core AI-driven development learning.
- Role-based sub-agent use and orchestration.
- MCP purpose-before-workflow guidance for Step 13/14.
- Developer-memory requirement checks.
- Learner-facing menu, dashboard, and illustration review entry points.
- Menu item 3 is `3. 応用レッスン`.
- Menu items 1 through 7 have shared Git workflow policy visibility; menu items 1 through 6 also have shared prerequisite checks for learning mode, workflow display language, product development language, repository boundary where relevant, and learner approval before start.
- `status` commands remain non-blocking; `start`, `gate`, and `check` enforce prerequisites.
- `tools/product-improvement status|start|gate` provides the mechanical entry for product improvement.
- `tools/product-repository-cleanup status|plan|local|remote` provides the mechanical entry for safe product repository cleanup.
- `tools/check_security_invariants.sh` provides mechanical Security guard invariant validation.
- `tools/product-security status|preflight|advise|check|gate` provides the mechanical product-security command surface for menu items 4, 5, and 6.
- `tools/check_as_built_sync_contract.sh` provides the mechanical five-document synchronization contract check.
- `tools/as-built-sync status` provides the learner/agent-facing sync-contract status view.
- `tools/test_as_built_sync_contract.sh` covers sync-contract success and failure paths.
- `tools/git-workflow status|configure|set|allow|check|cleanup-plan` provides the Git workflow policy command surface.
- `tools/test_git_workflow_policy.sh` covers Git workflow policy success and failure paths.
- `tools/git-hooks status|recommend|mode|cache|run` provides the Git hooks policy command surface.
- `tools/test_git_hooks.sh` covers standalone Git hooks policy/cache/recommendation success and failure paths.
- `tools/git-hooks run --mode full --no-cache` and `.githooks/pre-commit` cover full/no-cache and real pre-commit dispatch verification.
- `local_verification_scope_policy` records that agents must not treat full/no-cache recommendations as automatic permission to run heavy verification without presenting the need.
- Dashboard readiness output shows menu items 1 through 7 and menu-wide Git workflow policy status.
- As-built document checks.
- Sub-agent review protocol.
- Lesson repository aggregate test.
- Real product operations test for explicit product-repository runs.
- Quality constraints: refactorability, ecosystem fit, reusability, generality, and no existing-feature tradeoffs.

## Implemented Local Verification Scope Policy Handoff

Implemented local verification scope policy sync:

- Sync ID: `local_verification_scope_policy`.
- Current status: `implemented`.
- Current scope: durable AGENTS invariant plus five-document synchronization for everyday test-execution scope.
- This rule is lower priority than the no-existing-feature-tradeoff invariant.
- Use `TEST_PLAN_MANIFEST.tsv` to identify required checks for changed paths.
- Use `GIT_HOOK_CHECKS.tsv` to map check IDs to commands.
- Use `GIT_HOOK_RECOMMENDATION_PATHS.tsv` as recommendation policy, not as approval to run heavy verification automatically.
- Use `learning/GIT_HOOK_SETTINGS.tsv` for the current local hook mode; `.githooks/pre-commit` delegates to `tools/git-hooks run`.
- For lightweight UI, wording, CSS, and layout changes, present only contract-relevant target verification unless the change touches schema, shared tools, command boundaries, CI, hooks, or sync contracts.
- For document synchronization, contract, schema, shared-tooling, Git hooks, CI, test-infrastructure, or broad implementation changes, follow the broader contract-required verification path.
- Do not record this rule in developer memory because that file is not the durable source for this preference.
- Required contract checks for this sync ID are `tools/check_test_plan_coverage.sh`, `tools/test_test_plan.sh`, `tools/test_git_hooks.sh`, `tools/check_as_built_sync_contract.sh`, and `tools/check_as_built_docs.sh`.

SYNC-ID: local_verification_scope_policy
STATUS: implemented
ARTIFACTS: AGENTS.MD,docs/workflow/AS_BUILT_SYNC_CONTRACT.tsv,docs/workflow/TEST_PLAN_MANIFEST.tsv,docs/workflow/GIT_HOOKS_POLICY.tsv,docs/workflow/GIT_HOOK_CHECKS.tsv,docs/workflow/GIT_HOOK_RECOMMENDATION_PATHS.tsv,learning/GIT_HOOK_SETTINGS.tsv,tools/lib/test_plan.sh,tools/test-plan,tools/lib/git_hooks_policy.sh,tools/git-hooks,tools/check_test_plan_coverage.sh,tools/test_test_plan.sh,tools/test_git_hooks.sh
TESTS: tools/check_test_plan_coverage.sh,tools/test_test_plan.sh,tools/test_git_hooks.sh,tools/check_as_built_sync_contract.sh,tools/check_as_built_docs.sh

## Implemented Remediation Plan

The 2026-06-02 developer-memory audit has been implemented additively.
The synchronized implemented state covers these items:

1. Shared document-path support.
2. Safe role-based Markdown document migration.
3. Learner-facing `Day N` to `Step N` wording.
4. Internal step ID hiding in ordinary learner-facing output.
5. Separate workflow display language and product development language settings for both structured lessons.
6. Learning-mode display labels for A/B/C.
7. Stronger start/pass approval gate pairing.
8. Question-inviting passage prompts and command-block explanations.
9. Paired `docs/workflow/TASK_TRACKER.md` and `docs/workflow/HANDOFF.md` synchronization checks.
10. Stronger as-built synchronization checks.
11. Expanded CLI dashboard views, including separate 7-day and 14-day language settings.
12. Completed illustration metadata, asset registration, and review page.
13. External-integration CLI path with `status`, `start`, and `gate`.
14. Required lesson-repository Playwright checks after dependencies are installed.
15. CI and pre-commit integration for strengthened checks, product-gate tests, Playwright checks, and aggregate tests.
16. Free Development and Team Development failure-path tests.

## Important Files

```text
docs/as-built/REQUIREMENTS.md
docs/as-built/SPECIFICATION.md
docs/as-built/IMPLEMENTATION_PLAN.md
docs/workflow/TASK_TRACKER.md
docs/workflow/HANDOFF.md
docs/memory/DEVELOPER_MEMORY.md
free-development/FREE_DEVELOPMENT_MODE.md
advanced/TEAM_DEVELOPMENT_DOCKER.md
advanced/DOCKER_PATHS.md
reviews/SUBAGENT_REVIEW_PROTOCOL.md
docs/workflow/AS_BUILT_SYNC_CONTRACT.tsv
tools/check_as_built_docs.sh
tools/check_as_built_sync_contract.sh
tools/check_security_invariants.sh
tools/check_developer_memory_requirements.sh
tools/check_review_protocol.sh
tools/menu
tools/dashboard
tools/illustrations
tools/test_lesson.sh
tools/test_lesson_repository.sh
tools/test_product_gate_tools.sh
tools/test_product_repository_cleanup.sh
tools/test_product_security.sh
tools/test_as_built_sync_contract.sh
tools/test_security_invariants.sh
tools/git-workflow
tools/test_git_workflow_policy.sh
tools/git-hooks
tools/test_git_hooks.sh
tools/test_production_operations.sh
learning/context/README.md
learning/context/AI_DRIVEN_DEVELOPMENT_FOUNDATION.md
learning/context/SECURITY_FOUNDATION.md
learning/context/LESSON_CONTEXT_MAP.tsv
learning/context/WORKFLOW_CONTEXT_MAP.tsv
```

## Next Step

The resource-budgeted parallel guard is implemented.
The resource guard safe cleanup follow-up is implemented.
The resource guard summary and local/CI parallelization improvement is implemented as `resource_guard_summary_parallel_ci`.
The Security guard backfill is implemented as `safeflow_security_backfill`.
The product security workflow gate is implemented as `product_security_workflow_gate`.
The test and CI safe time optimization first phase is implemented as `test_ci_safe_time_optimization_plan`.
The latest implemented test/CI cycle is `test_ci_final_gate_optimization_plan`; local verification and remote synchronization passed for that cycle.
The latest implemented full-pipeline test/CI acceleration cycle is `test_ci_full_pipeline_acceleration_plan`.
The latest implemented CI timing and approved auto-improvement cycle is `ci_timing_auto_improvement_plan`.
The latest implemented CI split cycle is `ci_aggregate_full_hooks_split`; it is limited to main `CI` job scheduling and same-run evidence handoff.
The latest implemented dashboard/control-center cycle is `dashboard_control_center_context_mock_source_of_truth`, following `dashboard_control_center_selected_context_sync`, `dashboard_control_center_mock_aligned_overview`, and `dashboard_control_center_live_snapshot_sync`; together they provide producer-owned selected context data, data-backed mock direction, mock-source UI/UX alignment, seamless read-only snapshot refresh, stable summaries, and no UI action execution.
If future test/CI acceleration work is resumed, inspect Git state, confirm the sync contract is clean, preserve required workflow contexts, and implement only developer-approved candidates generated from `ci_timing_auto_improvement_plan` evidence.
If future dashboard control-center work is resumed, inspect Git state, confirm the sync contract is clean, keep existing `tools/dashboard` semantics, preserve `tools/dashboard-data` as read-only, and request developer approval before broad localization, live authoritative CI/Git/network status, browser-triggered checks, or any command execution.
Do not perform `.wslconfig` writes, swap creation/deletion, privileged cleanup, arbitrary process killing, CI weakening, pre-commit weakening, or Git hooks mode semantic changes without developer approval.
If resource guard behavior is changed later, preserve policy/settings-driven implementation, user-configurable available-memory floor, active-heavy-process fallback, explicit parallel-mode safe-stop, unknown-profile rejection, safe-stop failure for checks and job recommendations, standalone and aggregate tests, CI/pre-commit wiring, Playwright wrapper wiring, and existing Git hooks mode semantics.
If cleanup behavior is changed later, preserve dry-run by default, explicit `--safe` deletion, repo-local path validation, symlink escape rejection, marked Git hooks cache validation, fixture-based tests, CI/pre-commit wiring, and the prohibition on OS cache, swap, Docker, process, product repository, and global cache cleanup without developer approval.
If `resource_guard_summary_parallel_ci` is changed later, preserve existing `status`, `monitor`, `recommend-jobs`, `check`, `cleanup`, Git hooks mode semantics, pre-commit behavior, and CI check coverage.
Use resource guard recommendations for local Git hooks worker limits, but optimize GitHub Actions through CI-runner-oriented job splitting rather than applying local WSL memory settings to CI.
Treat unclassified Git hook checks as serial until they are explicitly classified as parallel-safe.
Keep per-check logs separated and replayed in deterministic definition order.
The implementation must add required CI workflow structure verification for job names, `needs`, and required command coverage.
The main CI split jobs that run aggregate repository tests or full hooks must install npm dependencies and Playwright dependencies before those checks run.
CI full-hooks execution must keep the CI-safe local-resource bypass behavior such as `RESOURCE_GUARD_SKIP_LOCAL_CHECK=1` or an equivalent documented mechanism, while local Playwright and Git hooks may use resource guard recommendations.
The `resource_guard_summary_parallel_ci` sync contract is implemented with actual runtime artifacts, runtime tests, and runtime evidence.
Developer approval is required before changing `GIT_HOOK_CHECKS.tsv` columns, changing the meaning of `full`, `fast`, or `minimal`, making Playwright or aggregate checks more aggressive than resource guard recommends, reducing CI coverage for speed, or adding a CI-specific settings file.
For future Security guard/product-security refinement, developer approval is required before expanding `AGENTS.MD` invariant wording, expanding blocking conditions that stop learner or workflow progress, adding network-dependent audits, changing external-integration approval prompts, or adding destructive cleanup behavior.
The `safeflow_security_backfill` and `product_security_workflow_gate` sync contracts are implemented with actual runtime artifacts, runtime tests, and runtime evidence.
For future `test_ci_safe_time_optimization_plan` refinement, keep changed-only selection observe-only until Coverage Guard and Result Attestation have enough full-CI evidence and developer approval. Do not reduce full/no-cache coverage, required CI checks, Playwright coverage, as-built sync enforcement, security checks, product-security checks, pre-commit behavior, or Git hooks mode semantics without developer approval.
For future `ci_timing_auto_improvement_plan` refinement, generated CI improvement candidates must remain read-only proposals until the developer approves implementation. Do not remove duplicate checks, reduce full/no-cache scope, or change workflow/job names without explicit developer approval.

Implemented Git workflow policy scope:

- Added `docs/workflow/GIT_WORKFLOW_POLICY.tsv` for supported Git workflow policy definitions.
- Added `learning/GIT_WORKFLOW_SETTINGS.tsv` for current user-selected Git workflow settings.
- Added `tools/lib/git_workflow_policy.sh` for shared setting loading, validation, permission checks, automation-level helpers, repository-context detection, and Git monitoring.
- Added `tools/git-workflow status|configure|set|allow|check|cleanup-plan`.
- Let users allow or disallow normal working branches.
- Let users allow or disallow `git worktree`.
- Let users explicitly control whether direct work on `main` is allowed.
- Define automation levels:
  - `manual`: guidance only.
  - `commit`: commit may be automated after checks pass.
  - `pr_ci`: push, PR creation where applicable, and CI checks may be automated.
  - `sync`: main CI plus local/remote synchronization checks may be automated.
- Keep merge, branch deletion, worktree deletion, remote deletion, and other destructive operations behind explicit confirmation regardless of automation level.
- Monitor uncommitted changes, unpushed commits, local/remote divergence, unnecessary working branches, unnecessary worktrees, and whether the current repository is the lesson, product, or a custom repository.
- Separate lesson-repository Git state from product-repository Git state so the workflow cannot mix repositories.
- Keep cleanup planning non-destructive.
- Reuse existing repository-boundary, Git sync, menu prerequisite, dashboard, and aggregate-test patterns.
- Added `tools/test_git_workflow_policy.sh` for settings validation, permission decisions, automation-level decisions, dirty-state detection, local/remote sync monitoring, repository separation, and non-destructive cleanup planning.
- Wired validation into structure checks, as-built checks, aggregate tests, CI, and pre-commit.
- Preserve existing 7-day, 14-day, menu, dashboard, Free Development, Product Improvement, external-integration, product-repository cleanup, product-gate, Playwright, docs-tour, CI, pre-commit, and as-built sync-contract behavior.
- The as-built sync contract records below include `git_workflow_policy` as implemented work.

The synchronized as-built sync-contract implementation is now represented across the three design/as-built documents and two workflow-state documents.

Implemented as-built sync-contract scope:

- Added `docs/workflow/AS_BUILT_SYNC_CONTRACT.tsv` as the contract source for synchronized improvement IDs.
- Record each synchronized improvement with `sync_id`, `status`, `title`, `required_artifacts`, `required_tests`, `required_docs`, and `runtime_evidence`.
- Added matching `SYNC-ID`, `STATUS`, `ARTIFACTS`, and `TESTS` blocks to all five synchronized documents:
  - `docs/as-built/REQUIREMENTS.md`,
  - `docs/as-built/SPECIFICATION.md`,
  - `docs/as-built/IMPLEMENTATION_PLAN.md`,
  - `docs/workflow/TASK_TRACKER.md`,
  - `docs/workflow/HANDOFF.md`.
- Added `tools/check_as_built_sync_contract.sh`.
- Fail when a contract sync ID is missing from any of the five documents.
- Fail when any of the five documents contains a `SYNC-ID` block that is absent from the contract.
- Fail when the same sync ID is marked `planned` in one document and `implemented` in another.
- Fail when document `ARTIFACTS` or `TESTS` blocks contain extra or missing entries compared with the contract.
- Fail when required artifacts or required tests are missing from the repository.
- Fail when runtime evidence files are missing or do not reference the sync ID, one of its artifacts, or one of its tests.
- Fail when an implemented sync ID's required tests are not actively wired into `tools/test_lesson_repository.sh`, `.githooks/pre-commit`, `.github/workflows/ci.yml`, and `.github/workflows/lesson14-ci.yml`.
- Keep `tools/check_as_built_docs.sh` and its topic-based checks active.
- Call `tools/check_as_built_sync_contract.sh` from `tools/check_as_built_docs.sh`.
- Keep `tools/check_workflow_pair_sync.sh` active for the `TASK_TRACKER.md` and `HANDOFF.md` pair.
- Added `tools/as-built-sync status` to show sync IDs, document coverage, artifact presence, and test wiring.
- Added `tools/test_as_built_sync_contract.sh`.
- Test complete synchronization, missing document block, unknown sync ID, mixed status, extra artifacts/tests, missing artifact, inert wiring, and missing active test-wiring failure paths.
- Added `AGENTS.MD` routing and standard-check references for sync-contract status and validation.
- Wired the validator and regression test into `tools/check_as_built_docs.sh`, `tools/test_lesson_repository.sh`, `.githooks/pre-commit`, `.github/workflows/ci.yml`, and `.github/workflows/lesson14-ci.yml`.
- Preserve existing lesson progression, approvals, checks, menu behavior, dashboard behavior, docs-tour, Free Development, Product Improvement, external-integration, product-gate, product-repository cleanup, Playwright, CI, and pre-commit behavior.

As-built sync contract records:

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
```

Implemented learner context foundation scope:

- Added `learning/context/README.md` for context-document organization and synchronization boundaries.
- Added `learning/context/AI_DRIVEN_DEVELOPMENT_FOUNDATION.md` for the main learner-facing conceptual source text.
- Added `learning/context/SECURITY_FOUNDATION.md` for staged security learning.
- Added `learning/context/LESSON_CONTEXT_MAP.tsv` so runtime context views can map topics to lesson phases.
- Added `tools/lib/lesson_context.sh`, `tools/lesson-context`, and `tools/test_lesson_context.sh`.
- Updated `guides/DOCUMENT_MAP.md` so learners and agents can find the context source documents.
- Synchronized the implemented state through `docs/workflow/AS_BUILT_SYNC_CONTRACT.tsv` and the five synchronized documents.

Implemented learner context runtime integration scope:

- Sync ID: `learner_context_runtime_integration`.
- Status: `implemented`.
- Keep 7-day lesson, 14-day lesson, and applied modules as learning contexts.
- Keep Free Development Mode, Product Improvement, External Integration, and lesson repository maintenance as workflow contexts.
- Runtime files include `learning/context/WORKFLOW_CONTEXT_MAP.tsv`, `tools/lib/lesson_context.sh`, `tools/lesson-context`, and `tools/test_lesson_context.sh`.
- Runtime integration points include `tools/lesson`, `tools/lesson14`, and `tools/lib/lesson_runtime.sh`.
- Existing approval gates, ordered progression, learner-selected start positions, menu prerequisites, Git workflow settings, Git hooks settings, dashboard views, CI, pre-commit, and repository-boundary behavior remain preserved.
- Standalone and aggregate test coverage are wired before the sync ID moves to `implemented`.

Implemented Security guard backfill scope:

- Sync ID: `safeflow_security_backfill`.
- Status: `implemented`.
- Runtime artifacts include `AGENTS.MD`, `docs/workflow/SAFEFLOW_SECURITY_BACKFILL.tsv`, `tools/lib/security_invariants.sh`, `tools/check_security_invariants.sh`, and `tools/test_security_invariants.sh`.
- The implementation adds mechanical security invariants without replacing existing learner context, 7-day lessons, 14-day lessons, CI, pre-commit, Git hooks, resource guard, as-built sync, or document-route behavior.
- The implementation does not mutate OS, WSL, Docker, cgroups, swap, or processes.

Implemented product security workflow gate scope:

- Sync ID: `product_security_workflow_gate`.
- Status: `implemented`.
- Runtime artifacts include `docs/workflow/PRODUCT_SECURITY_POLICY.tsv`, `learning/context/WORKFLOW_CONTEXT_MAP.tsv`, `tools/lib/product_security.sh`, `tools/product-security`, and `tools/test_product_security.sh`.
- The implementation supports menu items 4, 5, and 6 as workflow contexts, not lessons.
- The implementation adds a stack-agnostic product-security command surface that can advise, check, and gate work without scanning outside the configured product repository.
- The implementation distinguishes advisory warnings from high-confidence blocking conditions and avoids exposing secret values in output or test fixtures.
- The implementation preserves explicit approval for external API/OAuth/webhook/secrets work and does not weaken existing product-repository boundaries, Git workflow policy, or cleanup behavior.

Implemented test and CI safe time optimization first-phase scope:

- Sync ID: `test_ci_safe_time_optimization_plan`.
- Status: `implemented`.
- Purpose: reduce local and remote verification time by first adding the controls needed to remove duplicate work safely, then applying proven reductions without reducing safety or correctness.
- The first implementation adds Test Plan Manifest, learner-readable decision reasons, Coverage Guard, Result Attestation, CI-safe full-hooks parallelism, and lightweight fixture copying before any changed-only CI skipping or same-run evidence reuse is allowed.
- Keep `tools/test_lesson_repository.sh` as a standalone exhaustive command.
- Repeated as-built validation, duplicate Playwright execution, and duplicate final CI verification remain future optimization targets.
- A future full-hooks path may use a gap-only final gate only after a mechanical coverage check proves that individual hook rows plus the gap gate cover the standalone aggregate requirements.
- CI keeps full/no-cache verification authoritative while observe-only planning gathers evidence.
- CI may cache npm and Playwright dependencies, but not verification results.
- Developer approval is required before changed-only becomes authoritative in CI, required CI check names change, full/no-cache scope is reduced, flaky quarantine is introduced, or `full`, `fast`, and `minimal` semantics change.

Planned test and CI final gate optimization handoff:

- Sync ID: `test_ci_final_gate_optimization_plan`.
- Status: `implemented`; local verification passed, and remote `CI` / `Lesson14 CI` remain the external completion gates for the pushed commit.
- The implementation completes the test/CI optimization work by addressing the current `aggregate-and-full-hooks` bottleneck.
- The previous CI bottleneck was the final full/no-cache gate, especially duplicate `test_lesson_repository.sh`, duplicate Playwright execution, repeated as-built/sync checks, and duplicated common final verification between `CI` and `Lesson14 CI`.
- Same-run evidence is implemented before duplicate execution is removed.
- Keep `tools/test_lesson_repository.sh` available as the standalone exhaustive command.
- The full hook duplicate aggregate rerun is replaced only with a mechanically verified gap-only final gate.
- Playwright evidence is reused only when commit SHA, workflow run, source job identity, Playwright config hash, test file hashes, lockfile hash, command identity, repository-state hash, and success status match.
- `docs/workflow/FINAL_GATE_COVERAGE.tsv` maps aggregate requirements to hook evidence or explicit final-gap commands; missing coverage must fail closed.
- `Lesson14 CI` uses a Lesson14-specific final gate instead of duplicating the common aggregate/full-hooks final gate from `CI`.
- `Lesson14 CI` preserves the legacy `playwright-tests` and `aggregate-and-full-hooks` job contexts as lightweight compatibility gates; they must not rerun browser tests, `tools/test_lesson_repository.sh`, or `tools/git-hooks run --mode full --no-cache`.
- `docs/workflow/GIT_HOOK_RECOMMENDATION_PATHS.tsv` recommends local `full --no-cache` verification for final-gate coverage, final-gate command, CI evidence, and as-built evidence implementation changes.
- As-built/sync evidence is reused only when synchronized document hashes, sync-contract hash, checker hashes, command identity, repository-state hash, and success status match.
- npm and Playwright dependency caching are added, but verification results are not persistently cached across commits or workflow runs.
- Cleanup coverage includes same-run evidence, Playwright reports, test results, temporary fixtures, and repo-local caches.
- Preserve existing required workflow names unless developer approval is granted to change them.
- Stop for developer approval before accepting any existing-feature tradeoff, changing required CI names, reducing full/no-cache scope, making changed-only CI authoritative, introducing flaky quarantine, or reusing verification results across workflow runs.
- Required first implementation step: add focused tests for gap-only coverage and same-run evidence rejection before changing CI execution flow.

Implemented test and CI full pipeline acceleration handoff:

- Sync ID: `test_ci_full_pipeline_acceleration_plan`.
- Status: `implemented`.
- Purpose: complete the remaining local and remote test/CI acceleration work without reducing required coverage, safety, or compatibility.
- GitHub Actions deprecation regression guards are implemented in CI workflow structure checks.
- Playwright setup uses `tools/ci-playwright-setup` for cache-aware dependency and Chromium setup with normal fallback installs.
- Safe full-hook parallel expansion is policy-driven through `docs/workflow/GIT_HOOK_PARALLEL_GROUPS.tsv`.
- Duplicated policy-regression work between `CI` and `Lesson14 CI` is reduced while preserving required compatibility contexts.
- `tools/test_ci_pipeline_acceleration.sh` verifies the acceleration contract as a standalone and aggregate-callable check.
- `tools/check_as_built_sync_contract.sh` recognizes the Lesson14 compatibility split only when main `CI` keeps active coverage for the relevant test.
- `tools/check_as_built_sync_contract.sh` uses process-local wiring lookup caching only; do not convert that into persistent verification-result cache without developer approval.
- Keep changed-only CI observe-only until Coverage Guard, Result Attestation, full-CI comparison evidence, and developer approval allow any authoritative behavior.
- Preserve existing Step 1-7, Step 1-14, applied lesson, menu, dashboard, Git workflow, Git hooks, Security guard checks, product-security, docs-tour, as-built sync, pre-commit, local full/no-cache, and remote CI behavior.
- Do not add future tool names to the sync contract until those files exist and are testable.
- Stop for developer approval before changing required CI workflow or job names, reducing full/no-cache scope, caching verification results across runs, introducing flaky quarantine, making changed-only CI authoritative, or accepting any existing-feature tradeoff.
- Recovery: if cache, parallelization, evidence reuse, or job splitting weakens determinism or coverage, revert that specific optimization path and keep the strict existing check.

CI timing and approved auto-improvement handoff:

- Sync ID: `ci_timing_auto_improvement_plan`.
- Status: `implemented`.
- Purpose: make further final common aggregate/full-hooks shortening evidence-driven by recording per-check timing, generating read-only improvement proposals, and requiring developer approval before implementing generated candidates.
- Runtime behavior now includes `tools/ci-timing`, `tools/lib/ci_timing.sh`, `tools/test_ci_timing.sh`, strict `check_ci_status.sh` workflow/job matching, and main `CI` timing artifacts for final common aggregate/full-hooks checks.
- The main `CI` workflow records timing for `Lesson aggregate test` and `Git hooks full no-cache regression`, then uploads `ci-timing-${{ github.run_id }}-${{ github.run_attempt }}`.
- `tools/ci-timing propose` is read-only and reports slow checks, same-run evidence candidates, and parallelization candidates with developer-approval requirements.
- `tools/check_ci_status.sh --required` requires both `CI` and `Lesson14 CI` when run from this lesson repository without an explicit workflow; product or custom repositories keep the narrower single-workflow behavior.
- Same-run hash evidence reuse may be implemented only when command identity, input hashes, policy hashes, repository-state hash, workflow/run identity, and success status match.
- Full hook parallel-group refinement should happen only after timing evidence identifies remaining bottlenecks and the grouping stays policy-driven.
- Conditional `full no-cache` scope reduction remains a later developer-approved operation.
- Preserve existing Step 1-7, Step 1-14, applied lesson, menu, dashboard, Git workflow, Git hooks, Security guard checks, product-security checks, docs-tour, as-built sync, pre-commit, local full/no-cache, and remote CI behavior.
- Do not implement generated CI improvement candidates without developer approval.
- Recovery: if timing, proposal generation, evidence reuse, or status targeting weakens determinism or coverage, restore strict existing checks and keep the candidate proposal-only.

SYNC-ID: ci_timing_auto_improvement_plan
STATUS: implemented
ARTIFACTS: docs/workflow/TEST_PLAN_MANIFEST.tsv,docs/workflow/GIT_HOOK_CHECKS.tsv,docs/workflow/GIT_HOOK_PARALLEL_GROUPS.tsv,docs/workflow/GIT_HOOK_RECOMMENDATION_PATHS.tsv,docs/workflow/FINAL_GATE_GAP_COMMANDS.tsv,docs/workflow/FINAL_GATE_COVERAGE.tsv,tools/check_ci_status.sh,tools/check_ci_workflow_structure.sh,tools/lib/ci_timing.sh,tools/ci-timing,tools/test_ci_timing.sh,tools/test_ci_pipeline_acceleration.sh,tools/test_ci_evidence.sh,tools/test_ci_final_gate.sh,tools/test_git_hooks_parallel.sh,tools/test_lesson_repository.sh,.github/workflows/ci.yml,.github/workflows/lesson14-ci.yml
TESTS: tools/check_ci_workflow_structure.sh,tools/test_ci_timing.sh,tools/test_ci_pipeline_acceleration.sh,tools/test_ci_evidence.sh,tools/test_ci_final_gate.sh,tools/test_git_hooks_parallel.sh,tools/check_as_built_sync_contract.sh

CI aggregate and full-hooks split handoff:

- Sync ID: `ci_aggregate_full_hooks_split`.
- Status: `implemented`; local verification, sub-agent review, commit, push, required remote `CI` and `Lesson14 CI`, and local/remote sync passed.
- Purpose: shorten the main `CI` wall time by running lesson aggregate verification and full/no-cache Git hook verification as separate jobs, then requiring a strict final gate.
- Scope: main `CI` final common verification only. `Lesson14 CI` compatibility contexts remain unchanged.
- The implementation intentionally does not add persistent verification-result cache, conditional full/no-cache skipping, changed-only authoritative CI, Git hook group matrix splitting, or flaky quarantine.
- `lesson-aggregate` runs `tools/test_lesson_repository.sh --use-evidence --write-evidence` after the same prerequisite gates and same-run Playwright evidence download.
- `git-hooks-full-no-cache` runs `tools/git-hooks run --mode full --no-cache --jobs 4` after the same prerequisite gates and uploads same-run Git hook evidence.
- `final-gate` depends on both split jobs, starts with `if: ${{ always() }}`, validates split prerequisite results, requires the same-run Git hook evidence artifact from `git-hooks-full-no-cache`, runs `tools/ci-final-gate`, merges non-colliding timing-part report files, and uploads the final timing report artifact.
- `tools/ci-timing` keeps `CI_TIMING_REPORT` scoped to the wrapper report path and unsets it for wrapped commands so nested timing checks do not overwrite parent job reports.
- `tools/lib/ci_evidence.sh` keeps same-run evidence filenames safe for GitHub artifact upload while preserving original evidence ids in metadata.
- `Lesson14 CI` uses `CI_COMMON_COVERAGE_SOURCE: ci-split-common-coverage` as the stable compatibility marker for common split coverage.
- `tools/check_ci_workflow_structure.sh` and `tools/test_ci_pipeline_acceleration.sh` are the focused guards for the split and must remain standalone-callable and aggregate-callable.
- Preserve existing Step 1-7, Step 1-14, applied lesson, menu, dashboard, Git workflow, Git hooks, Security guard, product-security, docs-tour, as-built sync, pre-commit, local full/no-cache, and remote CI behavior.
- Recovery: if evidence handoff, timing merge, required contexts, or coverage fails, restore strict combined behavior or fail closed before reporting PASS.
- Developer approval is required before changing required workflow contexts beyond this approved split, reducing full/no-cache coverage, adding persistent cache semantics, making changed-only CI authoritative, splitting full hooks into a group matrix, or accepting any existing-feature tradeoff.

SYNC-ID: ci_aggregate_full_hooks_split
STATUS: implemented
ARTIFACTS: docs/workflow/AS_BUILT_SYNC_CONTRACT.tsv,docs/workflow/TEST_PLAN_MANIFEST.tsv,tools/check_ci_workflow_structure.sh,tools/test_ci_pipeline_acceleration.sh,tools/check_as_built_sync_contract.sh,tools/ci-timing,tools/test_ci_timing.sh,tools/lib/ci_evidence.sh,tools/test_ci_evidence.sh,.github/workflows/ci.yml,.github/workflows/lesson14-ci.yml
TESTS: tools/check_ci_workflow_structure.sh,tools/test_ci_pipeline_acceleration.sh,tools/test_ci_timing.sh,tools/test_ci_evidence.sh,tools/check_as_built_sync_contract.sh,tools/check_as_built_docs.sh

Dashboard control center data layer handoff:

- Sync ID: `dashboard_control_center_data_layer`.
- Status: `implemented`.
- Purpose: provide a stable, read-only JSON data layer for a future AI-driven development control center before adding React/Vite or any browser UI.
- Current artifacts: `tools/lib/dashboard_data.sh`, `tools/dashboard-data`, and `docs/workflow/DASHBOARD_DATA_SCHEMA.tsv` provide the runtime JSON producer, reusable helpers, and implemented field contract.
- Current schema guard: `tools/test_dashboard_schema.sh` checks status separation, required schema paths, concise guidance fields, partial-failure fields, command-preview fields, and non-executable preview boundaries.
- Current data guard: `tools/test_dashboard_data.sh` checks JSON syntax, schema version, source files, concise guidance items, completed-lesson representation, allowed status vocabulary, partial failures, policy/gate separation, command-preview safety, and secret-like data redaction.
- Existing `tools/dashboard` remains the human-readable CLI dashboard and must not be parsed by a browser as the data contract.
- Future React/Vite mechanics must stay behind the dashboard control-center surface; ordinary users should not need to see Vite commands, dev-server URLs, package scripts, or frontend internals.
- Future non-engineer UX should require one ordinary user action only: open the dashboard/control center through the provided entry point while maintained tooling handles setup, Vite startup, URL selection, JSON loading, and checks.
- Future UI work should preserve a dual-audience control panel: lesson content/progress/management must be clear for non-engineers, and workflow content/progress/management, gates, evidence, blockers, approvals, and next operational actions must remain precise enough for intermediate and senior engineers.
- Future UI work must preserve the repository's two first-class surfaces, lessons and workflows, as distinct but coordinated control-panel areas that are easy to scan, understand, and operate.
- Keep the JSON producer read-only and source-of-truth preserving: use existing CLI, TSV, Markdown, policy files, and shared helpers instead of duplicating Security guard, Git workflow, Resource guard, CI, or lesson logic in React.
- Separate policy readiness, settings readiness, gate passage, approvals, optional evidence, cached evidence, and unknown state.
- The first UI phase must be read-first, explain-first, and approve-before-action; do not execute push, PR creation, merge, cleanup, deletion, external integration, OAuth/API, or other dangerous operations.
- Focused tests are standalone-callable and aggregate-callable and must not depend on a specific product stack, current prose wording, network availability, or live GitHub state.
- Recovery: if dashboard-data work later weakens existing dashboard, lesson, Security guard, Git workflow, CI, pre-commit, or as-built behavior, restore strict existing behavior and keep the dashboard-data work behind the implemented contract.
- Developer approval is required before choosing `tools/dashboard --format json`, adding React/Vite dependencies, exposing any Vite-specific user workflow, adding command execution buttons, making live network status authoritative, or changing existing dashboard semantics. If an existing-feature tradeoff appears necessary, stop and redesign; accepting the tradeoff is not allowed.

SYNC-ID: dashboard_control_center_data_layer
STATUS: implemented
ARTIFACTS: docs/workflow/DASHBOARD_DATA_SCHEMA.tsv,docs/workflow/AS_BUILT_SYNC_CONTRACT.tsv,docs/workflow/TEST_PLAN_MANIFEST.tsv,docs/workflow/GIT_HOOK_CHECKS.tsv,docs/workflow/GIT_HOOK_PARALLEL_GROUPS.tsv,docs/workflow/FINAL_GATE_GAP_COMMANDS.tsv,docs/workflow/FINAL_GATE_COVERAGE.tsv,tools/lib/dashboard_data.sh,tools/dashboard-data,tools/test_dashboard_schema.sh,tools/test_dashboard_data.sh,tools/test_lesson_repository.sh,tools/check_lesson_structure.sh,tools/check_lesson14_structure.sh,tools/check_ci_workflow_structure.sh,.github/workflows/ci.yml,.github/workflows/lesson14-ci.yml
TESTS: tools/test_dashboard_schema.sh,tools/test_dashboard_data.sh,tools/check_test_plan_coverage.sh,tools/test_git_hooks.sh,tools/test_git_hooks_parallel.sh,tools/test_ci_final_gate.sh,tools/check_ci_workflow_structure.sh,tools/check_as_built_sync_contract.sh,tools/check_as_built_docs.sh

Dashboard control center React UI plan handoff:

- Sync ID: `dashboard_control_center_react_ui_plan`.
- Status: `implemented`.
- Purpose: provide a read-only React/Vite browser control center that consumes the implemented dashboard JSON data layer without changing existing CLI dashboard behavior.
- Current boundary: this implementation adds approved dependencies, package scripts, browser runtime files, maintained entry tooling, and browser test wiring; it does not add UI action execution or make frontend-only state authoritative.
- User path: ordinary users should have one dashboard/control-center entry action; maintained tooling handles Vite startup, URL selection, JSON loading, and check orchestration.
- UI model: keep lessons and workflows distinct. Lessons show plain-language content, progress, structured points, warnings, and next learning action from dashboard JSON. Workflows show practical gate, evidence, blocker, approval, Git/CI sync, and next operational action detail for engineers.
- Data source: consume `tools/dashboard-data` output and `docs/workflow/DASHBOARD_DATA_SCHEMA.tsv`; do not parse `tools/dashboard` prose.
- Contract gap handling: lesson points, warnings, and next learning actions are now structured dashboard JSON fields; do not synthesize future fields from CLI prose.
- Safety: keep command previews read-only, treat untrusted text as data, avoid secrets/raw logs/external payloads, and do not make frontend-only state authoritative for safety decisions.
- Required future approval: action execution, live authoritative network status, and any `tools/dashboard` semantic change require developer approval.
- Recovery: if future UI work weakens existing lessons, workflows, Security guard, Resource guard, Git workflow, CI, pre-commit, as-built sync, docs, or dashboard data boundaries, restore existing behavior and redesign. Existing-feature tradeoffs are not allowed.

SYNC-ID: dashboard_control_center_react_ui_plan
STATUS: implemented
ARTIFACTS: docs/workflow/DASHBOARD_DATA_SCHEMA.tsv,docs/workflow/AS_BUILT_SYNC_CONTRACT.tsv,docs/workflow/TEST_PLAN_MANIFEST.tsv,docs/workflow/GIT_HOOK_CHECKS.tsv,docs/workflow/GIT_HOOK_PARALLEL_GROUPS.tsv,docs/workflow/GIT_HOOK_RECOMMENDATION_PATHS.tsv,docs/workflow/FINAL_GATE_COVERAGE.tsv,tools/dashboard-data,package.json,package-lock.json,vite.config.mjs,dashboard-control-center/index.html,dashboard-control-center/src/main.jsx,dashboard-control-center/src/App.jsx,dashboard-control-center/src/dashboardData.js,dashboard-control-center/src/styles.css,tools/dashboard,tools/dashboard-control-center,tools/test_dashboard_control_center.sh,tools/test_dashboard_schema.sh,tools/test_dashboard_data.sh,tools/test_lesson_playwright.sh,tools/test_lesson_repository.sh,tools/check_lesson_structure.sh,tools/check_lesson14_structure.sh,tools/check_ci_workflow_structure.sh,.github/workflows/ci.yml,.github/workflows/lesson14-ci.yml,tests/fixtures/dashboard-control-center.json,tests/playwright/dashboard-control-center.spec.js
TESTS: tools/test_dashboard_schema.sh,tools/test_dashboard_data.sh,tools/test_dashboard_control_center.sh,tools/test_lesson_playwright.sh,tools/check_test_plan_coverage.sh,tools/test_git_hooks.sh,tools/test_git_hooks_parallel.sh,tools/test_ci_final_gate.sh,tools/check_as_built_sync_contract.sh,tools/check_as_built_docs.sh,tools/check_ci_workflow_structure.sh

Dashboard control center information architecture handoff:

- Sync ID: `dashboard_control_center_information_architecture`.
- Status: `implemented`.
- Purpose: make the browser dashboard easier to scan by splitting the read-only control center into Overview, Lessons, Development Workflow, Maintenance Sync, and Safety Actions.
- Design reference: `dashboard-control-center/mocks/archive/mock-categorized-dashboard.png` is a mock reference for information architecture, not a pixel-perfect runtime requirement.
- Current UI: Overview is the default; it shows snapshot mode, generated time, relative age, read-only state, blocker count, next safe action, guidance, partial failures, warnings, and category-health cards.
- Category boundary: Lessons, Development Workflow, Maintenance Sync, and Safety Actions are separate views so lesson state, workflow state, maintenance sync, and safety/action-preview content are not mixed.
- Localization boundary: fixed UI labels support `en` and `ja` from the device language with English fallback; commands, file paths, gate IDs, source names, and dashboard JSON prose are not browser-translated.
- Freshness boundary: generated time and relative age are display context only; they do not make stale/live status authoritative.
- Safety boundary: command previews remain preview-only and non-executable; no command-execution buttons were added.
- Tests: `tools/test_dashboard_control_center.sh` now covers category navigation, Overview-first behavior, Safety Actions isolation, absence of command-execution controls, secret-like redaction, mobile layout, and `en`/`ja` fixed-label localization.
- Deferred phases: UI-triggered command execution, live authoritative CI/Git status, data-schema localization fields, and broad language coverage require separate specification, synchronization, approval, and tests. Read-only live snapshot refresh is implemented later as `dashboard_control_center_live_snapshot_sync`.
- Recovery: if future dashboard work hides safety details, translates operational data text, weakens `tools/dashboard-data`, or changes existing CLI/lesson/check behavior, restore the implemented read-only category boundary and redesign. Existing-feature tradeoffs are not allowed.

SYNC-ID: dashboard_control_center_information_architecture
STATUS: implemented
ARTIFACTS: docs/workflow/AS_BUILT_SYNC_CONTRACT.tsv,docs/workflow/TEST_PLAN_MANIFEST.tsv,vite.config.mjs,dashboard-control-center/mocks/archive/mock-categorized-dashboard.png,dashboard-control-center/src/App.jsx,dashboard-control-center/src/dashboardData.js,dashboard-control-center/src/i18n.js,dashboard-control-center/src/styles.css,tests/fixtures/dashboard-control-center.json,tests/playwright/dashboard-control-center.spec.js,tools/test_dashboard_control_center.sh,tools/test_lesson_repository.sh
TESTS: tools/test_dashboard_control_center.sh,tools/test_dashboard_schema.sh,tools/test_dashboard_data.sh,tools/check_as_built_sync_contract.sh,tools/check_as_built_docs.sh,tools/check_test_plan_coverage.sh,tools/check_ci_workflow_structure.sh

Dashboard control center visual polish handoff:

- Sync ID: `dashboard_control_center_visual_polish`.
- Status: `implemented`.
- Purpose: make the categorized read-only dashboard visually closer to `dashboard-control-center/mocks/archive/mock-categorized-dashboard.png` while preserving the implemented data and safety boundaries.
- Design reference: the mock guides layout density, hierarchy, segmented status, sidebar context, compact health cards, and category shortcuts; it remains a visual reference, not a pixel-perfect runtime contract.
- Current UI: Overview keeps the snapshot context prominent, uses a segmented operational status strip, lays category-health cards out as a compact desktop grid, provides Explore Pages shortcuts, and shows read-only/last-updated context in the sidebar.
- Localization boundary: fixed UI labels remain `en`/`ja` with English fallback; commands, file paths, source names, status text from dashboard JSON, and other operational data remain data text.
- Safety boundary: visual shortcuts are navigation links only. They must not become command-execution controls without a separate specification, synchronization, approval, and tests.
- Tests: `tools/test_dashboard_control_center.sh` covers the visual structure through Playwright without relying on pixel-perfect screenshot matching.
- Follow-up boundary: automatic read-only snapshot refresh is implemented later as `dashboard_control_center_live_snapshot_sync`; UI-triggered checks, live authoritative CI/Git integration, command execution, new dependencies, and broad localization remain separate future phases.
- Recovery: if future dashboard visual work weakens the CLI dashboard, `tools/dashboard-data`, category isolation, Safety Actions preview-only behavior, mobile layout, existing lessons, checks, CI, or pre-commit, restore the implemented boundary and redesign. Existing-feature tradeoffs are not allowed.

SYNC-ID: dashboard_control_center_visual_polish
STATUS: implemented
ARTIFACTS: docs/workflow/AS_BUILT_SYNC_CONTRACT.tsv,dashboard-control-center/mocks/archive/mock-categorized-dashboard.png,dashboard-control-center/src/App.jsx,dashboard-control-center/src/i18n.js,dashboard-control-center/src/styles.css,tests/playwright/dashboard-control-center.spec.js,tools/test_dashboard_control_center.sh,tools/test_lesson_repository.sh
TESTS: tools/test_dashboard_control_center.sh,tools/check_as_built_sync_contract.sh,tools/check_as_built_docs.sh,tools/check_test_plan_coverage.sh,tools/check_ci_workflow_structure.sh

The previously synchronized menu-wide implementation is `menu_git_workflow_policy`.
It promotes the existing Git workflow policy into a shared menu-level policy without weakening any existing lesson, menu, dashboard, cleanup, CI, pre-commit, or as-built synchronization behavior.

Implemented menu-wide Git workflow policy scope:

- Keep `tools/git-workflow status|configure|set|allow|check|cleanup-plan` as the existing policy source.
- Make `tools/menu readiness` show Git policy readiness for menu items 1 through 7.
- Added Git policy validation to `tools/menu check <1|2|3|4|5|6>` without weakening existing learning-mode, language, product-language, repository-boundary, or approval checks.
- Added `tools/menu check 7` and `tools/menu start 7 --confirm` for lesson-repository maintenance.
- Keep `automation_level=manual` valid and non-blocking.
- Interpret automation levels consistently across learning, building/extending, and maintenance menu categories.
  - `manual`: guidance and monitoring only.
  - `commit`: commit-level automation only after required checks pass.
  - `pr_ci`: push, PR, and CI-check automation where applicable.
  - `sync`: main synchronization plus local/remote sync checks where applicable.
- Keep merge, branch deletion, worktree deletion, remote deletion, and product repository cleanup behind explicit confirmation regardless of automation level.
- Show menu-wide Git policy status in dashboard output.
- Added runtime tests in `tools/test_menu_prerequisites.sh` and updated these five synchronized documents from planned to implemented.

Implemented Git workflow action settings scope:

- Keep `branch_allowed`, `worktree_allowed`, `main_direct_work_allowed`, and `automation_level`.
- Treat `automation_level` as a compatibility preset.
- Detailed settings take precedence only when the detailed setting key is present.
- Fall back to `automation_level` when a detailed setting key is absent so current implemented behavior is preserved.
- Add detailed settings for:
  - `commit_automation: manual|auto`
  - `push_automation: manual|auto`
  - `pr_creation: manual|auto`
  - `pr_ci_monitoring: manual|auto`
  - `merge_execution: manual|after_approval`
  - `developer_auto_merge_allowed: false|true`
  - `main_ci_monitoring: manual|auto`
  - `sync_monitoring: manual|auto`
- Use safety-oriented defaults:
  - `commit_automation: auto`
  - `push_automation: manual`
  - `pr_creation: manual`
  - `pr_ci_monitoring: auto`
  - `merge_execution: after_approval`
  - `developer_auto_merge_allowed: false`
  - `main_ci_monitoring: auto`
  - `sync_monitoring: auto`
- These detailed defaults are active after implementation; `automation_level` remains available as a compatibility preset when detailed action keys are absent.
- Add a shared `git_workflow_action_mode <action>` resolver for `commit`, `push`, `pr`, `ci`, `pr_ci`, `merge`, `main_ci`, and `sync`.
- Keep `ci` as a compatibility alias for CI monitoring so existing `tools/git-workflow allow ci` behavior is preserved.
- Keep `tools/git-workflow status|configure|set` as the user-facing setting surface.
- Show detailed action settings in `tools/menu readiness` and `tools/dashboard menu`.
- Apply the same detailed settings to menu items 1 through 7.
- For push and PR creation, `auto` means the agent may execute the operation only after explicit approval for that operation is recorded; it never means approval-free execution.
- `merge_execution: after_approval` means the agent may execute merge only after explicit merge approval is recorded.
- `learning/GIT_WORKFLOW_APPROVALS.tsv` stores matching action, repository, and branch approval receipts for detailed push, PR creation, and normal merge execution.
- `developer_auto_merge_allowed: true` is the only implemented path for developer-responsibility approval-free merge and requires PR CI success, clear target PR and branch, verified merge base, clean working tree, checked local/remote state, and stop-on-failure behavior.
- Developer-responsibility auto-merge requires gate evidence plus actual repository checks; the setting alone does not permit approval-free merge.
- Keep branch deletion, worktree deletion, remote deletion, and product repository deletion behind explicit user confirmation regardless of merge settings.
- Moved `git_workflow_action_settings` from `planned` to `implemented` across the sync contract and all five synchronized documents.

Implemented Git hooks policy handoff:

- Sync ID: `git_hooks_policy`.
- Current status: `implemented`.
- Current scope: faster safe serial pre-commit execution.
- Safety baseline: preserve the current `.githooks/pre-commit` behavior and existing CI/check coverage.
- Implemented modes:
  - `full`: current-equivalent required pre-commit coverage.
  - `fast`: cache-assisted execution only when prior successful inputs still match.
  - `minimal`: quick local mechanical checks, not final completion coverage.
- Local `minimal` remains valid for ordinary quick feedback; local `full --no-cache` is recommended when changed paths match Git hooks, CI, check, test, or as-built synchronization policy.
- Normal learner-facing `off` mode is out of scope.
- Cache location is Git-local and untracked, such as `.git/pre-commit-cache/`.
- Cache must fail closed: missing, stale, corrupted, or unverifiable entries force a run.
- Hook check configuration must fail closed when rows are malformed or contain invalid or empty mode tokens.
- The command surface includes hook status, local verification recommendation, mode selection, cache clearing, normal run, no-cache run, and explicit mode run.
- Implemented targets include `.githooks/pre-commit`, `tools/git-hooks`, `tools/lib/git_hooks_policy.sh`, `docs/workflow/GIT_HOOKS_POLICY.tsv`, `docs/workflow/GIT_HOOK_CHECKS.tsv`, `docs/workflow/GIT_HOOK_RECOMMENDATION_PATHS.tsv`, `learning/GIT_HOOK_SETTINGS.tsv`, and `tools/test_git_hooks.sh`.
- Existing wiring checks and status output now recognize runner-based pre-commit dispatch while preserving direct-command detection.
- Required next action after this sync: run the as-built sync checks, related tests, aggregate test, `tools/git-hooks run --mode full --no-cache`, and pre-commit. If they pass, the change is ready for developer review or commit.
- Developer approval is required before changing the minimal-mode required check list or skipping Playwright-related checks through cache beyond the implemented fail-closed behavior.
- Recovery path: clear the cache and rerun no-cache on suspected cache issues; restore the current serial pre-commit command list if runner integration fails.

The synchronized product repository cleanup implementation remains represented across the same documents.

Implemented product repository cleanup scope:

- Added `tools/product-repository-cleanup` so learners and agents can safely remove the external product repository created by the 7-day or 14-day lessons.
- Support `status`, `plan`, `local`, and `remote` subcommands.
- Keep `status` and `plan` non-destructive.
- Require explicit confirmation for local cleanup with the configured product repository name, such as `task-tracker-repository`.
- Require explicit confirmation for remote cleanup with the full GitHub owner/repository name, such as `xxxMasahiro/task-tracker-repository`.
- Keep local deletion and remote deletion separate; do not add `all` or automatic chained deletion.
- Reject local deletion unless the target is the configured external product repository path, normally `$HOME/projects/task-tracker-repository`.
- Reject local deletion when the target is inside the lesson repository, does not match the configured product repository name, is not a Git repository, lacks `.git`, is not the Git top level, or cannot be identified safely.
- Require GitHub authentication and a successful remote repository lookup before any remote deletion attempt.
- Show the remote URL and owner/repository name before any remote deletion.
- Print a clear operation log for status, plan, local cleanup, and remote cleanup paths.
- Added `tools/test_product_repository_cleanup.sh`.
- Test status, plan, missing confirmation, wrong confirmation, nested repository rejection, non-Git target rejection, temporary local cleanup behavior, and fake-`gh` remote deletion behavior.
- Do not delete a real GitHub repository in lesson-repository tests.
- Wired the cleanup test into structure checks, as-built checks, developer-memory checks, aggregate tests, CI, and pre-commit.
- Exposed runtime discovery through README, AGENTS routing, menu item 5, and the dashboard development view.
- Preserve existing lesson progression, approvals, checks, menu behavior, dashboard behavior, Free Development, Product Improvement, external-integration, product-gate, Playwright, docs-tour, CI, and pre-commit behavior.

The synchronized menu prerequisite implementation remains represented across the same documents.

Implemented scope:

- Rename the learner-facing menu item to `3. 応用レッスン`.
- Keep the Team Development and Docker path available through the renamed applied-learning item.
- Require learning mode, workflow display language, product development language, repository context/boundary confirmation where relevant, and learner approval before starting menu items 1 through 6.
- Reuse existing 7-day and 14-day settings where available.
- For applied-learning, Free Development Mode, product improvement, and external integration, inherit the most recently configured structured-lesson settings when possible; otherwise require missing settings before start or gate passage.
- Keep product development language mandatory for product-side work.
- Implement the prerequisite logic through shared reusable helpers rather than duplicated menu branches.
- Keep `status` commands non-blocking for discovery; enforce prerequisites through start, gate, or explicit menu-check commands.
- Add a mechanically checkable product-improvement entry point for menu item 5.
- Expand dashboard readiness output for menu items 1 through 6.
- Add tests for the renamed menu label, absence of the old learner-facing label, missing-prerequisite failure paths, unchanged existing 7-day/14-day behavior, and preservation of existing Free Development, Team Development, external-integration, dashboard, and product-gate checks.

Current implemented docs-map scope:

- Added `guides/DOCUMENT_MAP.md` so learners can understand the repository's document system before document-heavy work.
- Explain `AGENTS.MD` invariant rules, document root, routing table, and repo-local skills in non-engineer-friendly terms.
- Distinguish lesson-side `AGENTS.MD`, legacy product-side `AGENT.md`, and the planned product-side `AGENTS.MD` transition.
- Explain `docs/as-built/`, `docs/workflow/`, and `docs/memory/` by role.
- Explain `docs/workflow/GIT_HOOKS_POLICY.tsv`, `docs/workflow/GIT_HOOK_CHECKS.tsv`, and `learning/GIT_HOOK_SETTINGS.tsv` as Git hook policy and current local hook-mode controls.
- Explain `docs/memory/DEVELOPER_MEMORY.md`, `docs/memory/SESSION_MEMORY.md`, and product-side `FAILURE_MEMORY.md` or failure-recovery records without claiming a lesson-side failure-memory file exists.
- Added `tools/docs-tour status|rules|design|workflow|memory|skills|all` with learning-mode-aware A/B/C explanation depth.
- Added `./tools/dashboard docs` and included it in `./tools/dashboard all`.
- Added copy-paste prompt examples for asking an agent to explain `TASK_TRACKER`/`HANDOFF` and the as-built trio in learner-friendly language.
- Added early 7-day and 14-day guidance about why the documents exist.
- Added `tools/check_document_root.sh` and wired it through `tools/check_agents_skills.sh` so `docs/**/*.md`, `skills/*/SKILL.md`, and skill `references/*.md` cannot lose their `AGENTS.MD`-rooted route silently.
- Added `tools/test_docs_tour.sh` and wired it into the relevant structure, as-built, developer-memory, aggregate, CI, and pre-commit checks.
- Preserve existing lesson progression, approvals, checks, menu behavior, dashboard behavior, skills, memory workflow, and repository-boundary behavior.
- `guides/DOCUMENT_MAP.md`, `tools/docs-tour`, `tools/check_document_root.sh`, `tools/test_docs_tour.sh`, and `./tools/dashboard docs` are runtime artifacts.
- Validation is wired through `tools/check_document_root.sh`, `tools/test_docs_tour.sh`, structure checks, as-built checks, developer-memory checks, dashboard or Playwright tests, aggregate tests, CI, and pre-commit.
- The validation suite must preserve existing 7-day, 14-day, menu, dashboard, Free Development, Product Improvement, external-integration, product-gate, Playwright, CI, and pre-commit behavior.

Implemented local verification passed the lesson-side verification sequence:

```bash
./tools/check_lesson_structure.sh
./tools/check_lesson14_structure.sh
./tools/check_lesson14_sync.sh
./tools/check_agents_skills.sh
./tools/check_as_built_docs.sh
./tools/check_as_built_sync_contract.sh
./tools/check_review_protocol.sh
./tools/check_developer_memory_requirements.sh
./tools/menu
./tools/dashboard all
./tools/as-built-sync status
./tools/illustrations list
./tools/test_as_built_sync_contract.sh
./tools/test_git_workflow_policy.sh
./tools/test_git_hooks.sh
./tools/git-hooks run --mode full --no-cache
./tools/test_menu_prerequisites.sh
./tools/test_lesson_start_position.sh
./tools/test_lesson.sh
./tools/test_lesson14.sh
./tools/test_product_gate_tools.sh
./tools/test_product_repository_cleanup.sh
./tools/test_lesson_repository.sh
.githooks/pre-commit
```

The expected terminal evidence is:

```text
7-day lesson CLI tests passed.
Lesson14 CLI tests passed.
Lesson repository test passed.
Git hooks policy tests passed.
Git hooks checks passed: full mode
```

Run `tools/test_production_operations.sh` only when a product repository is intentionally present.

## Implemented Dashboard Control Center Mock Parity Handoff

Sync ID: `dashboard_control_center_mock_parity`.
Current status: `implemented`.

Current restart context:

- The existing React/Vite control center is implemented and read-only.
- `dashboard-control-center/mocks/archive/mock-categorized-dashboard.png` is the current visual reference.
- The real UI now has data-backed parity for compact Next Safe Action, Partial Failures preview, central percentage rings, and Explore Pages metrics.
- Do not regress by hard-coding mock values such as fixed percentages, fixed item counts, or fixture-specific text into the browser.
- Metrics must stay producer/schema-owned before display.
- Keep optional/unverified live checks separate from true failures by using manual follow-ups rather than `partial_failures`.
- Use normal and alternate valid fixtures so hard-coded percentages or counts fail in tests.
- Keep full issue details reachable through category pages as read-only navigation, not command-execution actions.
- Keep command previews isolated under Safety Actions and non-executable.

Implemented verification entry points:

1. `tools/test_dashboard_schema.sh`.
2. `tools/test_dashboard_data.sh`.
3. `tools/test_dashboard_control_center.sh`.
4. `tools/test_lesson_repository.sh`.

Sync-contract note: keep `tools/test_lesson_repository.sh`, full/no-cache Git hooks, `.githooks/pre-commit`, and `tools/ci-final-gate` as final verification/runtime evidence rather than `TESTS` field entries for this sync ID, because the as-built contract requires `TESTS` entries to be directly wired standalone checks.

Recovery path:

- If metrics cannot be derived safely, stop before UI implementation and request approval rather than inventing values.
- If optional statuses look like true Partial Failures, split the display and data fields.
- If mock parity conflicts with read-only safety, preserve safety and report the conflict.

SYNC-ID: dashboard_control_center_mock_parity
STATUS: implemented
ARTIFACTS: docs/workflow/DASHBOARD_DATA_SCHEMA.tsv,docs/workflow/AS_BUILT_SYNC_CONTRACT.tsv,tools/lib/dashboard_data.sh,tools/dashboard-data,dashboard-control-center/mocks/archive/mock-categorized-dashboard.png,dashboard-control-center/src/App.jsx,dashboard-control-center/src/dashboardData.js,dashboard-control-center/src/i18n.js,dashboard-control-center/src/styles.css,tests/fixtures/dashboard-control-center.json,tests/fixtures/dashboard-control-center-live-update.json,tests/fixtures/dashboard-control-center-invalid.json,tests/playwright/dashboard-control-center.spec.js,tools/test_dashboard_schema.sh,tools/test_dashboard_data.sh,tools/test_dashboard_control_center.sh,tools/test_lesson_repository.sh
TESTS: tools/test_dashboard_schema.sh,tools/test_dashboard_data.sh,tools/test_dashboard_control_center.sh,tools/check_as_built_sync_contract.sh,tools/check_as_built_docs.sh,tools/check_test_plan_coverage.sh,tools/check_ci_workflow_structure.sh

## Implemented Dashboard Control Center Live Snapshot Sync Handoff

Sync ID: `dashboard_control_center_live_snapshot_sync`.
Current status: `implemented`.

Current restart context:

- The user approved and this implementation adds a staged path toward seamless live dashboard updates.
- The browser updates while open next to the dashboard CLI, but it remains read-only.
- `tools/dashboard-data` remains the JSON producer; `tools/dashboard` prose must not become a browser data source.
- `tools/dashboard-control-center open` is the right shell boundary for periodic snapshot publication.
- `tools/dashboard-data` must publish producer-owned `snapshot_id` and `content_hash`; browser change detection should use those fields.
- React should keep the last known good snapshot on failed or invalid refresh.
- Browser polling must be GET-only and must not call Git, GitHub, CI, shell, or `tools/*` command endpoints.

Implemented verification entry points:

1. `tools/test_dashboard_schema.sh`.
2. `tools/test_dashboard_data.sh`.
3. `tools/test_dashboard_control_center.sh`.
4. `tools/test_lesson_repository.sh`.

Sync-contract note: keep `tools/test_lesson_repository.sh`, full/no-cache Git hooks, `.githooks/pre-commit`, and `tools/ci-final-gate` as final verification/runtime evidence rather than `TESTS` field entries for this sync ID, because the as-built contract requires `TESTS` entries to be directly wired standalone checks.

Recovery path:

- If atomic snapshot publishing fails, keep the previous one-shot snapshot behavior and stop before enabling refresh.
- If polling blanks the UI on bad data, restore last-known-good behavior before continuing.
- If any browser execution path appears necessary, stop and request approval as a separate future sync ID.

SYNC-ID: dashboard_control_center_live_snapshot_sync
STATUS: implemented
ARTIFACTS: docs/workflow/DASHBOARD_DATA_SCHEMA.tsv,docs/workflow/AS_BUILT_SYNC_CONTRACT.tsv,tools/lib/dashboard_data.sh,tools/dashboard-data,tools/dashboard-control-center,vite.config.mjs,dashboard-control-center/src/App.jsx,dashboard-control-center/src/dashboardData.js,dashboard-control-center/src/i18n.js,dashboard-control-center/src/styles.css,tests/fixtures/dashboard-control-center.json,tests/fixtures/dashboard-control-center-live-update.json,tests/fixtures/dashboard-control-center-invalid.json,tests/playwright/dashboard-control-center.spec.js,tools/test_dashboard_control_center.sh,tools/test_lesson_repository.sh
TESTS: tools/test_dashboard_schema.sh,tools/test_dashboard_data.sh,tools/test_dashboard_control_center.sh,tools/check_as_built_sync_contract.sh,tools/check_as_built_docs.sh,tools/check_test_plan_coverage.sh,tools/check_ci_workflow_structure.sh

## Implemented Dashboard Control Center Mock-Aligned Overview Handoff

Sync ID: `dashboard_control_center_mock_aligned_overview`.
Current status: `implemented`.

Current restart context:

- The browser control center is already read-only and has live snapshot sync.
- `dashboard-control-center/mocks/archive/mock-categorized-dashboard.png` remains the visual reference.
- The implemented Overview removes visible non-mock header and snapshot explanation chrome while preserving an accessible page title.
- Next Safe Action keeps the label/helper outside the green primary action row, with target, expected result, and risk as white icon-led metadata rows.
- Partial Failures is always visible as a control-panel category; an empty list shows a concise none state.
- Manual follow-ups do not appear as true failures and are summarized in a separate row with detail navigation.
- The visible Category Health heading is removed; the accessible category-health region remains.
- The four health cards are height-aligned in the grid.
- The four health rings use distinct category colors for lessons, workflow, maintenance, and safety.
- Overview details do not rely on expansion that changes layout height; detailed lists belong on existing category pages.
- Icons added to navigation, status, repeated rows/cards, summaries, and details are decorative or accessible labels only; they must not become buttons or execution affordances.
- The bottom notice is concise repository-control-panel UI chrome.

Implemented verification entry points:

1. `tools/test_dashboard_control_center.sh`.
2. `tools/check_as_built_sync_contract.sh`.
3. `tools/check_as_built_docs.sh`.
4. `tools/check_test_plan_coverage.sh`.
5. `tools/check_ci_workflow_structure.sh`.
6. `tools/test_lesson_repository.sh`.

Sync-contract note: keep full/no-cache Git hooks, `.githooks/pre-commit`, `tools/test_lesson_repository.sh`, and `tools/ci-final-gate` as final verification/runtime evidence rather than broadening this sync ID's `TESTS` field beyond directly wired standalone checks.

Recovery path:

- If removing the visible header breaks accessibility, restore a screen-reader-only title, not the large visible header.
- If manual follow-up navigation is unclear, keep the Overview summary but improve link labels before adding new disclosure behavior.
- If any command execution, non-GET fetch, or command preview leakage appears outside Safety Actions, remove it before continuing.
- If mobile overflow appears, fix responsive constraints rather than adding language-specific branches.

SYNC-ID: dashboard_control_center_mock_aligned_overview
STATUS: implemented
ARTIFACTS: docs/workflow/AS_BUILT_SYNC_CONTRACT.tsv,dashboard-control-center/mocks/archive/mock-categorized-dashboard.png,dashboard-control-center/src/App.jsx,dashboard-control-center/src/i18n.js,dashboard-control-center/src/styles.css,tests/fixtures/dashboard-control-center.json,tests/fixtures/dashboard-control-center-live-update.json,tests/playwright/dashboard-control-center.spec.js,tools/test_dashboard_control_center.sh,tools/test_lesson_repository.sh
TESTS: tools/test_dashboard_control_center.sh,tools/check_as_built_sync_contract.sh,tools/check_as_built_docs.sh,tools/check_test_plan_coverage.sh,tools/check_ci_workflow_structure.sh

## Implemented Dashboard Control Center Detail-Page Mock Parity Handoff

Sync ID: `dashboard_control_center_detail_mock_parity`.
Current status: `implemented`.

Current restart context:

- The copied visual references are `dashboard-control-center/mocks/archive/mock-detail-lessons.png`, `mock-detail-workflow.png`, `mock-detail-maintenance.png`, and `mock-detail-safety.png`.
- The detail-page mock images are the UI/UX source references for layout, information priority, colors, density, and icon direction; tests validate structure and safety, not pixel-perfect screenshot equality.
- Each detail page starts with a mock-aligned page header and decision summary: what the page checks, current judgment, must-review items, and the next safe check.
- Workflow category icons use one centralized branching `Network` icon component across Overview, navigation, Explore Pages, workflow detail header, and workflow category summary rows.
- Lessons detail surfaces missing settings, warnings, and next learning action in inspection panels before completed details; the primary warning label is derived from structured lesson status fields.
- Development Workflow detail prioritizes approval-required and unknown items in checklist rows, uses human-readable titles, and moves technical keys to secondary metadata.
- Maintenance Sync detail groups snapshot trust, manual follow-ups, warnings, and source boundaries as status cards, a confirmation table, and a source-boundary panel.
- Safety Actions detail separates status cards, Partial Failures table, and display-only Command Previews without adding execution affordances.
- Short localized risk/status labels such as `低` are visually centered.
- English remains the repository-standard data language; fixed UI labels and known control-center source/intent labels display through the resolved UI locale.
- The control-panel UI locale resolver is separate from user-selected lesson display language and workflow/product language settings.
- The browser remains read-only; no route may execute shell, Git, GitHub, CI, or `tools/*` commands.
- Current follow-up tightening keeps the same sync ID and improves mock parity for page-specific header icons, first-row decision-summary bullets/count badges/safe links, active sidebar category context, workflow icon glyph consistency, maintenance/safety card icon containers, failure severity glyphs, and compact display-only command preview grouping.
- Do not add Japanese-only runtime literals when continuing this work; add fixed UI labels through `dashboard-control-center/src/i18n.js` and keep source evidence as sanitized data.
- Do not extend `docs/workflow/DASHBOARD_DATA_SCHEMA.tsv` unless future live-data integration needs new producer-owned fields; this follow-up intentionally uses the existing snapshot shape.

Planned verification entry points:

1. `tools/test_dashboard_control_center.sh`.
2. `tools/check_as_built_sync_contract.sh`.
3. `tools/check_as_built_docs.sh`.
4. `tools/check_test_plan_coverage.sh`.
5. `tools/check_ci_workflow_structure.sh`.
6. `tools/test_dashboard_schema.sh`.
7. `tools/test_dashboard_data.sh`.
8. `tools/test_lesson_repository.sh`.

Sync-contract note: keep full/no-cache Git hooks, `.githooks/pre-commit`, `tools/test_lesson_repository.sh`, and `tools/ci-final-gate` as final verification/runtime evidence rather than broadening this sync ID's `TESTS` field beyond directly wired standalone checks.

Recovery path:

- If detail summaries contradict snapshot data, derive them from existing helper functions and translator labels before adding styling.
- If workflow icon replacement imports fail, use one centralized lucide branching-workflow icon that matches the approved mock direction.
- If mobile overflow appears, adjust responsive constraints instead of adding language-specific branches.
- If command previews look executable, strengthen display-only labels and remove any action-like affordance before continuing.
- If any existing-feature tradeoff appears necessary, stop and request developer approval.

SYNC-ID: dashboard_control_center_detail_mock_parity
STATUS: implemented
ARTIFACTS: docs/workflow/AS_BUILT_SYNC_CONTRACT.tsv,dashboard-control-center/mocks/archive/mock-detail-lessons.png,dashboard-control-center/mocks/archive/mock-detail-workflow.png,dashboard-control-center/mocks/archive/mock-detail-maintenance.png,dashboard-control-center/mocks/archive/mock-detail-safety.png,dashboard-control-center/src/App.jsx,dashboard-control-center/src/i18n.js,dashboard-control-center/src/styles.css,tests/fixtures/dashboard-control-center.json,tests/playwright/dashboard-control-center.spec.js,tools/test_dashboard_control_center.sh,tools/test_lesson_repository.sh
TESTS: tools/test_dashboard_control_center.sh,tools/check_as_built_sync_contract.sh,tools/check_as_built_docs.sh,tools/check_test_plan_coverage.sh,tools/check_ci_workflow_structure.sh

## Implemented Lesson Display Label Policy Handoff

Implemented lesson display-label policy sync:

- Sync ID: `lesson_display_label_policy`.
- Current status: `implemented`.
- Current scope: separate learner-facing STEP course labels from internal compatibility names and historical records.
- Do not treat this as a global replacement task.
- Preserve `Step N/14` as the current Lesson14 sync-gate key unless a future approved implementation mechanically separates sync keys from display labels.
- Preserve `tools/lesson14`, `index-14-days.md`, `_14_DAYS` files, `dayN.*` step IDs, and existing historical learning records.
- Implemented learner-facing targets include menu, dashboard, lesson14 reset/runtime output, learn/helpdesk record labels, README, AGENTS routing text, index files, guides, prompts, playbooks, roadmap output, scenario text, and learner-display checks.
- Shared display labels live in `docs/workflow/LESSON_DISPLAY_LABELS.tsv`; shared shell resolution lives in `tools/lib/lesson_display_labels.sh`, with `tools/lib/lesson_common.sh` providing the reusable flow-step display label for record-writing commands.
- Current test caveat: if new learner-facing surfaces are added later, they must be added to `tools/check_learner_display.sh` or another active-surface test rather than relying on global replacement.
- Required verification after implementation: `git diff --check`, `./tools/check_learner_display.sh`, `./tools/test_menu_prerequisites.sh`, `./tools/check_lesson14_sync.sh`, `./tools/test_lesson14.sh`, `./tools/check_agents_skills.sh`, `./tools/check_developer_memory_requirements.sh`, `./tools/as-built-sync status`, `./tools/check_as_built_sync_contract.sh`, `./tools/check_as_built_docs.sh`, and `./tools/test_lesson_repository.sh`.
- Recovery path: if sync gates fail, restore the `Step N/14` machine-key contract first; if display checks over-match history, add a policy-governed allowlist rather than rewriting logs.

SYNC-ID: lesson_display_label_policy
STATUS: implemented
ARTIFACTS: docs/workflow/LESSON_DISPLAY_LABELS.tsv,tools/lib/lesson_display_labels.sh,tools/lib/lesson_common.sh,tools/lib/lesson_runtime.sh,tools/menu,tools/dashboard,tools/learn,tools/helpdesk,tools/lesson14,tools/roadmap,tools/docs-tour,README.md,AGENTS.MD,index.md,index-14-days.md,ai-driven-task-tracker-scenario.md,guides/LESSON_14_DAYS.md,learning/ROADMAP.md,lesson/LESSON_FLOW_14_DAYS.tsv,prompts/PROMPTS.md,prompts/PROMPTS_14_DAYS.md,playbooks/AGENT_PLAYBOOK.md,playbooks/AGENT_PLAYBOOK_14_DAYS.md,tools/check_learner_display.sh,tools/test_menu_prerequisites.sh,tools/check_lesson14_sync.sh,tools/check_agents_skills.sh
TESTS: tools/check_learner_display.sh,tools/test_menu_prerequisites.sh,tools/check_lesson14_sync.sh,tools/check_agents_skills.sh,tools/test_lesson14.sh

## Implemented External Product Repository Authority Handoff

Sync ID: `external_product_repository_authority`.
Current status: `implemented`.

Restart context:

- The current issue is not only a dashboard display issue. The repository needs a product authority read model so external product repositories can be operated with the same quality expectations as lesson-created `task-tracker-repository` without copying the lesson repository wholesale.
- Product repository roots should stay readable: product design documents belong under `docs/product/`, product workflow documents under `docs/workflow/`, product memory under `docs/memory/`, and product operation declarations under `ops/`.
- Root-level duplicate product documents are now blocked by `product_repository_canonical_docs_only`; keep product docs under `docs/product`, `docs/workflow`, and `docs/memory`.
- Product-side `AGENT.md` remains discoverable only as a legacy entry during migration; the planned product-side standard is `AGENTS.MD`, while lesson-side `AGENTS.MD` remains the lesson repository invariant source.
- Dashboard must read product structure, manifests, and evidence rather than inferring state from fixed product-stack files.
- `docs/workflow/PRODUCT_REPOSITORY_STRUCTURE.tsv` now records required mode, workflow contexts, product types, validation rule, dashboard visibility, canonical path, and legacy paths.
- `docs/workflow/PRODUCT_GATE_EVIDENCE_SCHEMA.tsv` now records manifest column contracts, evidence index columns, source-id namespace, freshness/status enums, and read-only command preview shape.
- `docs/workflow/DASHBOARD_DATA_SCHEMA.tsv` now includes product authority, manifest summary, evidence summary, product-operation blockers, and not-run/stale state handling before the UI relies on this data.
- `tools/dashboard-data` remains a read-only snapshot producer. It reads existing product manifests and existing evidence only; it must not create evidence, fetch remotes, call `gh`, query GitHub Actions, run product checks, or mutate repositories.
- Product gate evidence should live under the product repository `.git/product-gate-evidence/` area by default and bind observations to product HEAD, freshness, authority, required-in-context state, blockers, and read-only next-command previews.
- Missing product repositories should block product operations only and must not block lesson-only progress.
- Product-operation blockers belong in product authority data and must not be mixed into lesson-only summary blockers.
- Browser dashboard pages remain read-only and must not execute shell, Git, GitHub, CI, or `tools/*` commands.

Implemented verification scope:

```bash
./tools/test_product_repository_authority.sh
./tools/test_dashboard_schema.sh
./tools/test_dashboard_data.sh
./tools/check_test_plan_coverage.sh
./tools/test_git_hooks.sh
./tools/test_git_hooks_parallel.sh
./tools/test_ci_final_gate.sh
./tools/check_ci_workflow_structure.sh
./tools/check_as_built_sync_contract.sh
./tools/check_as_built_docs.sh
```

Implemented targets:

1. `tools/lib/product_repository_authority.sh`.
2. `tools/product-repository-authority`.
3. `tools/test_product_repository_authority.sh`.
4. Additive dashboard data schema and producer fields.
5. Dashboard data regression updates.
6. Test-plan, Git hooks, and aggregate/final-gate wiring required by existing policy before marking implemented.

SYNC-ID: external_product_repository_authority
STATUS: implemented
ARTIFACTS: docs/workflow/AS_BUILT_SYNC_CONTRACT.tsv,docs/workflow/PRODUCT_REPOSITORY_STRUCTURE.tsv,docs/workflow/PRODUCT_GATE_EVIDENCE_SCHEMA.tsv,docs/workflow/DASHBOARD_DATA_SCHEMA.tsv,tools/lib/product_repository_authority.sh,tools/product-repository-authority,tools/test_product_repository_authority.sh,tools/lib/dashboard_data.sh,tools/dashboard-data,dashboard-control-center/src/dashboardData.js,dashboard-control-center/src/App.jsx,dashboard-control-center/src/i18n.js,dashboard-control-center/src/styles.css,tests/fixtures/dashboard-control-center.json,tests/fixtures/dashboard-control-center-live-update.json,tests/playwright/dashboard-control-center.spec.js,tools/test_dashboard_schema.sh,tools/test_dashboard_data.sh,docs/workflow/TEST_PLAN_MANIFEST.tsv,docs/workflow/GIT_HOOK_CHECKS.tsv,docs/workflow/GIT_HOOK_PARALLEL_GROUPS.tsv,docs/workflow/FINAL_GATE_COVERAGE.tsv,tools/test_lesson_repository.sh,tools/check_lesson_structure.sh,tools/check_lesson14_structure.sh,.github/workflows/ci.yml,.github/workflows/lesson14-ci.yml,tools/check_ci_workflow_structure.sh
TESTS: tools/test_product_repository_authority.sh,tools/test_dashboard_schema.sh,tools/test_dashboard_data.sh,tools/check_test_plan_coverage.sh,tools/test_git_hooks.sh,tools/test_git_hooks_parallel.sh,tools/test_ci_final_gate.sh,tools/check_ci_workflow_structure.sh,tools/check_as_built_sync_contract.sh,tools/check_as_built_docs.sh

## Implemented STEP 1-14 Product Launch Quality Gate Handoff

Sync ID: `step_1_14_product_launch_quality_gate`.
Current status: `implemented`.
Priority: 1.

Restart context:

- The immediate trust issue is that a STEP 1-14 product can pass existing developer-style checks while failing the launch path documented for the learner.
- The standard task-tracker product should continue to support direct `index.html` opening unless an approved specification changes the launch path.
- The failing Add Task symptom with a `?title=...` URL indicates the browser did not run the expected JavaScript submit handler.
- HTTP-server-only E2E is not enough when README promises direct file opening.
- The final STEP 1-14 completion gate must verify the README launch path, not just unit tests, CI, docs, or HTTP-only Playwright.

Implemented state:

1. The launch-path gate is part of STEP 1-14 sync-gate policy.
2. Direct launch-path product workflow verification covers Add Task, counters, status changes, and Clear Done.
3. The verification is exposed through `tools/product-launch-check` and `tools/test_product_launch_check.sh`, with both runtime artifacts recorded in the sync contract artifacts and tests.
4. Prompts and lesson-sync-gate skill guidance treat README launch verification as completion evidence.
5. Generated product guidance through the existing lesson workflow keeps product README and product docs aligned with the verified launch path.
6. Targeted checks are required before preserving this sync ID as implemented.

Required checks:

```bash
./tools/check_lesson14_sync.sh
./tools/test_lesson14.sh
./tools/test_product_launch_check.sh
./tools/test_product_gate_tools.sh
./tools/check_as_built_sync_contract.sh
./tools/check_as_built_docs.sh
```

Stop and request developer approval before:

- changing the official launch path from direct `index.html` opening to HTTP-server-only launch;
- adding a bundler, dependency, external service, browser command execution, or destructive product operation;
- changing existing STEP 1-7 or STEP 1-14 ordered progression semantics.

Recovery path:

- If direct launch verification fails, fix product launch implementation or generated guidance before allowing completion.
- If product repository context is missing, report the missing context without recreating or mutating repositories.

SYNC-ID: step_1_14_product_launch_quality_gate
STATUS: implemented
ARTIFACTS: docs/workflow/AS_BUILT_SYNC_CONTRACT.tsv,lesson/SYNC_GATES_14_DAYS.tsv,lesson/LESSON_FLOW_14_DAYS.tsv,prompts/PROMPTS_14_DAYS.md,skills/lesson-sync-gate/SKILL.md,tools/check_lesson14_sync.sh,tools/test_lesson14.sh,tools/product-launch-check,tools/test_product_launch_check.sh,tools/test_product_gate_tools.sh,tools/check_as_built_sync_contract.sh,tools/check_as_built_docs.sh
TESTS: tools/check_lesson14_sync.sh,tools/test_lesson14.sh,tools/test_product_launch_check.sh,tools/test_product_gate_tools.sh,tools/check_as_built_sync_contract.sh,tools/check_as_built_docs.sh

## Implemented Product Authority Evidence Status Propagation Handoff

Sync ID: `product_authority_evidence_status_propagation`.
Current status: `implemented`.
Priority: 2.

Restart context:

- Product authority is implemented as a read-only model with focused evidence aggregation coverage.
- Multiple applicable evidence rows must stay valid JSON.
- Required `failed`, `blocked`, `unknown`, `stale`, and `not_run` evidence must be represented as product-operation blocker or manual-required state.
- Dashboard and selected-context work must not duplicate this aggregation in UI code.

Implemented state:

1. Product authority regression cases cover multiple rows, malformed rows, required failures, stale/not-run rows, optional rows, and context mismatch.
2. Evidence fixtures remain temporary inside the test unless persistent fixture files are added to the sync contract artifacts.
3. `tools/lib/product_repository_authority.sh` preserves aggregation and status propagation.
4. Dashboard schema/data expectations consume authority output without duplicating authority aggregation.
5. Targeted authority and dashboard data checks are required before preserving this sync ID as implemented.

Required checks:

```bash
./tools/test_product_repository_authority.sh
./tools/test_dashboard_schema.sh
./tools/test_dashboard_data.sh
./tools/check_as_built_sync_contract.sh
./tools/check_as_built_docs.sh
```

Stop and request developer approval before adding evidence writers, automatic Git/CI refresh, network calls, or product repository mutation.

Recovery path:

- If authority JSON becomes invalid, fix product authority before touching dashboard-data or React.
- If evidence state cannot be classified safely, emit `unknown` or `manual_required` rather than `ready`.

SYNC-ID: product_authority_evidence_status_propagation
STATUS: implemented
ARTIFACTS: docs/workflow/AS_BUILT_SYNC_CONTRACT.tsv,docs/workflow/PRODUCT_GATE_EVIDENCE_SCHEMA.tsv,docs/workflow/PRODUCT_REPOSITORY_STRUCTURE.tsv,docs/workflow/DASHBOARD_DATA_SCHEMA.tsv,tools/lib/product_repository_authority.sh,tools/product-repository-authority,tools/test_product_repository_authority.sh,tools/lib/dashboard_data.sh,tools/dashboard-data,tools/test_dashboard_data.sh,tools/test_dashboard_schema.sh,tools/check_as_built_sync_contract.sh,tools/check_as_built_docs.sh
TESTS: tools/test_product_repository_authority.sh,tools/test_dashboard_schema.sh,tools/test_dashboard_data.sh,tools/check_as_built_sync_contract.sh,tools/check_as_built_docs.sh

## Implemented Free Development Product Repository Scaffold Handoff

Sync ID: `free_development_product_repo_scaffold`.
Current status: `implemented`.
Priority: 3.

Restart context:

- Free Development repositories need a clear source authority so the lesson and dashboard can distinguish runtime entrypoints, source files, tests, CI, security evidence, and dashboard-visible surfaces.
- The scaffold should not copy the whole lesson repository.
- Canonical product documents belong under `docs/product/`, `docs/workflow/`, and `docs/memory/`; root duplicate Markdown documents are blocked.

Implemented state:

1. Product repository structure policy defines Free Development scaffold expectations.
2. Manifest declarations identify entrypoint, runtime source, test source, CI, security, dashboard surfaces, and integrations.
3. New manifest files must be added to the sync contract artifacts when created.
4. Free Development, Product Improvement, and External Integration gate readers use shared product authority resolvers.
5. Scaffold validation covers missing required paths, optional stack additions, ambiguous source authority, and root duplicate blockers.
6. Scaffold validation is exposed through `tools/product-scaffold-check` and `tools/test_product_scaffold_check.sh`, with both runtime artifacts recorded in the sync contract artifacts and tests.
7. Free-development guidance and targeted checks are required before preserving this sync ID as implemented.

Required checks:

```bash
./tools/test_product_scaffold_check.sh
./tools/test_product_gate_tools.sh
./tools/test_product_repository_authority.sh
./tools/check_workflow_pair_sync.sh
./tools/check_as_built_sync_contract.sh
./tools/check_as_built_docs.sh
```

Stop and request developer approval before weakening canonical product document enforcement, making CI mandatory for every Free Development repository, or adding destructive repository automation.

Recovery path:

- If root duplicate documents exist, report a product-operation blocker.
- If source authority is ambiguous, fail scaffold validation and require manifest correction.

SYNC-ID: free_development_product_repo_scaffold
STATUS: implemented
ARTIFACTS: free-development/FREE_DEVELOPMENT_MODE.md,docs/workflow/PRODUCT_REPOSITORY_STRUCTURE.tsv,docs/workflow/PRODUCT_GATE_EVIDENCE_SCHEMA.tsv,tools/free-development,tools/product-improvement,tools/external-integration,tools/product-scaffold-check,tools/test_product_scaffold_check.sh,tools/test_product_gate_tools.sh,tools/test_product_repository_authority.sh,tools/check_workflow_pair_sync.sh,tools/check_as_built_sync_contract.sh,tools/check_as_built_docs.sh
TESTS: tools/test_product_scaffold_check.sh,tools/test_product_gate_tools.sh,tools/test_product_repository_authority.sh,tools/check_workflow_pair_sync.sh,tools/check_as_built_sync_contract.sh,tools/check_as_built_docs.sh

## Implemented Dashboard Control Center Selected Context Sync Handoff

Sync ID: `dashboard_control_center_selected_context_sync`.
Current status: `implemented`.
Priority: 4.

Restart context:

- The implemented selected-context sync starts from the dashboard data contract, not from React-only selector UI.
- This dashboard sync consumes the launch-quality, evidence-status, and scaffold contracts rather than absorbing those responsibilities.
- `selected_context` and `available_contexts` are the intended shared contract between dashboard-data and the browser.
- The selected context must tie together the user-selected menu, workflow context, target repository, product type, current lesson step, Git state, CI state, Security state, evidence, blockers, manual follow-ups, command previews, and next safe action.
- `task-tracker-repository` remains the STEP 1-14 standard product repository. Free Development, Product Improvement, and External Integration must resolve repositories through context and policy data instead of fixed names.
- `tools/dashboard-data` must remain read-only. It may read existing settings, manifests, and evidence; it must not create evidence, run checks, fetch remotes, call GitHub, run CI, mutate repositories, or make browser state authoritative.
- Product authority evidence aggregation must be fixed before UI work depends on it. Multiple evidence rows must stay valid JSON, and `failed`, `blocked`, `stale`, and `not_run` must be represented in status and blockers.
- Root-level product document fallback is superseded by `product_repository_canonical_docs_only`; keep dashboard and gate resolution around canonical `docs/product/*`, `docs/workflow/*`, and `docs/memory/*` paths.
- Git management settings and Security checks are cross-cutting selected-context state, not primary menu items.
- Partial Failures are true failed, blocked, or unknown current-context problems. Optional, cached, not-run, or manual-required items belong in manual follow-ups or evidence sections unless they block the current selected context.
- The five `dashboard-control-center/mocks/mock-context-*.png` files are UI/UX references for hierarchy, icon direction, density, color identity, and intuitive comprehension. They are not pixel-perfect test oracles.
- The dashboard UI locale remains separate from lesson display language and product development language settings.

Implemented state:

1. `docs/workflow/DASHBOARD_DATA_SCHEMA.tsv` includes selected-context fields.
2. `tools/dashboard-data` / `tools/lib/dashboard_data.sh` implement producer-side context resolution.
3. Git, CI, Security, and product status readers stay read-only; they may read existing evidence/settings/manifests but must not execute checks or refresh evidence.
4. Evidence propagation comes from `product_authority_evidence_status_propagation`; the dashboard does not reimplement authority aggregation.
5. Scaffold and canonical resolver behavior comes from `free_development_product_repo_scaffold`; root fallback is superseded by `product_repository_canonical_docs_only`.
6. Fixtures and targeted tests cover selected-context behavior.
7. React components and styling consume producer-owned selected-context data.
8. Full mock-source-of-truth page parity is implemented separately by `dashboard_control_center_context_mock_source_of_truth`.
9. Contract-required verification is required before preserving this sync ID as implemented.

Required checks for the implemented selected-context sync:

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

For later mock-source UI changes, `npm run dashboard:build` remains the targeted Vite build check outside this sync ID's direct `TESTS` metadata.

Stop and request developer approval before:

- browser command execution, POST fetches, Git/GitHub/CI/API calls, live authoritative CI/Git polling, automatic push, merge, cleanup, deletion, OAuth, token, webhook, or destructive operations;
- removing root-level legacy product document compatibility;
- changing STEP 1-7, STEP 1-14, existing CI, pre-commit, Git hooks, document routes, or dashboard read-only ownership;
- adding a persistent selected-context storage file outside existing settings and policy sources;
- accepting any existing-feature tradeoff.

Recovery path:

- If schema checks fail, correct schema, producer, and fixtures before UI work.
- If authority checks fail, fix product authority aggregation before dashboard-data or React changes.
- If context resolution cannot choose safely, emit blocked or manual-required state rather than guessing.
- If UI output contradicts producer data, change producer-owned data or shared helper logic rather than React-side inference.
- If sync checks fail, repair all five synchronized documents and the sync contract before runtime implementation continues.

SYNC-ID: dashboard_control_center_selected_context_sync
STATUS: implemented
ARTIFACTS: docs/workflow/AS_BUILT_SYNC_CONTRACT.tsv,docs/workflow/DASHBOARD_DATA_SCHEMA.tsv,docs/workflow/PRODUCT_REPOSITORY_STRUCTURE.tsv,docs/workflow/PRODUCT_GATE_EVIDENCE_SCHEMA.tsv,tools/lib/dashboard_data.sh,tools/dashboard-data,tools/lib/product_repository_authority.sh,tools/product-repository-authority,tools/test_product_repository_authority.sh,tools/test_dashboard_schema.sh,tools/test_dashboard_data.sh,tools/test_dashboard_control_center.sh,dashboard-control-center/mocks/mock-context-overview.png,dashboard-control-center/mocks/mock-context-lessons.png,dashboard-control-center/mocks/mock-context-workflow.png,dashboard-control-center/mocks/mock-context-maintenance.png,dashboard-control-center/mocks/mock-context-safety.png,dashboard-control-center/src/App.jsx,dashboard-control-center/src/dashboardData.js,dashboard-control-center/src/i18n.js,dashboard-control-center/src/styles.css,tests/fixtures/dashboard-control-center.json,tests/fixtures/dashboard-control-center-live-update.json,tests/playwright/dashboard-control-center.spec.js,tools/check_as_built_sync_contract.sh,tools/check_as_built_docs.sh,tools/check_test_plan_coverage.sh,tools/check_ci_workflow_structure.sh
TESTS: tools/test_product_repository_authority.sh,tools/test_dashboard_schema.sh,tools/test_dashboard_data.sh,tools/test_dashboard_control_center.sh,tools/check_as_built_sync_contract.sh,tools/check_as_built_docs.sh,tools/check_test_plan_coverage.sh,tools/check_ci_workflow_structure.sh

## Implemented Dashboard Control Center Context Mock Source Of Truth Handoff

Sync ID: `dashboard_control_center_context_mock_source_of_truth`.
Current status: `implemented`.

Restart context:

- Treat `dashboard-control-center/mocks/mock-context-overview.png`, `mock-context-lessons.png`, `mock-context-workflow.png`, `mock-context-maintenance.png`, and `mock-context-safety.png` as the UI/UX source of truth for this implemented dashboard pass.
- Preserve the selected-context, product authority, and live snapshot data work that already exists; do not solve UI mismatch by hard-coding screenshot values in React.
- Start follow-up review from `docs/workflow/DASHBOARD_DATA_SCHEMA.tsv`, `tools/dashboard-data`, `dashboard-control-center/src/App.jsx`, `dashboard-control-center/src/dashboardData.js`, `dashboard-control-center/src/i18n.js`, `dashboard-control-center/src/styles.css`, the dashboard fixtures, and the Playwright spec.
- Keep `tools/dashboard-data` as the only dashboard state authority. The browser remains a read-only renderer.

Implemented reminders:

- The left sidebar, Overview, Lessons, Workflow, Maintenance, and Safety pages are built around the five context mocks.
- Producer-owned fields were added before UI reliance where a mock field could not be derived safely.
- Keep fixed labels in `i18n.js`; do not confuse the control-panel UI locale with lesson workflow display language or product development language.
- Keep Partial Failures separate from optional/manual follow-up states.
- Keep command previews display-only and non-executable.
- Verify responsive layout, centered icon/pill alignment, and mobile no-overflow through targeted dashboard tests.

Required implemented verification:

```bash
./tools/test_dashboard_schema.sh
./tools/test_dashboard_data.sh
./tools/test_dashboard_control_center.sh
./tools/check_as_built_sync_contract.sh
./tools/check_as_built_docs.sh
./tools/check_test_plan_coverage.sh
./tools/check_ci_workflow_structure.sh
```

Use `npm run dashboard:build` as the targeted Vite build check for this runtime UI code change.

Developer approval is required before browser command execution, POST fetches, Git/GitHub/CI/API calls, live authoritative CI/Git polling, automatic push, merge, cleanup, deletion, OAuth, token, webhook, evidence writing, removing root-level legacy product document compatibility, screenshot-equality test oracles, or any existing-feature tradeoff.

SYNC-ID: dashboard_control_center_context_mock_source_of_truth
STATUS: implemented
ARTIFACTS: docs/workflow/AS_BUILT_SYNC_CONTRACT.tsv,docs/workflow/DASHBOARD_DATA_SCHEMA.tsv,tools/lib/dashboard_data.sh,tools/dashboard-data,dashboard-control-center/mocks/mock-context-overview.png,dashboard-control-center/mocks/mock-context-lessons.png,dashboard-control-center/mocks/mock-context-workflow.png,dashboard-control-center/mocks/mock-context-maintenance.png,dashboard-control-center/mocks/mock-context-safety.png,dashboard-control-center/src/App.jsx,dashboard-control-center/src/dashboardData.js,dashboard-control-center/src/i18n.js,dashboard-control-center/src/styles.css,tests/fixtures/dashboard-control-center.json,tests/fixtures/dashboard-control-center-live-update.json,tests/playwright/dashboard-control-center.spec.js,tools/test_dashboard_schema.sh,tools/test_dashboard_data.sh,tools/test_dashboard_control_center.sh,tools/check_as_built_sync_contract.sh,tools/check_as_built_docs.sh,tools/check_test_plan_coverage.sh,tools/check_ci_workflow_structure.sh
TESTS: tools/test_dashboard_schema.sh,tools/test_dashboard_data.sh,tools/test_dashboard_control_center.sh,tools/check_as_built_sync_contract.sh,tools/check_as_built_docs.sh,tools/check_test_plan_coverage.sh,tools/check_ci_workflow_structure.sh

## Implemented Dashboard Control Center Exact Mock Alignment Correction Handoff

Sync ID: `dashboard_control_center_mock_exact_alignment_correction`.
Current status: `implemented`.

Restart context:

- Developer visual review rejected the earlier dashboard as insufficiently aligned with the approved mock family for design, color, contrast, icon treatment, and content amount.
- This sync ID implemented the corrective runtime pass after `dashboard_control_center_context_mock_source_of_truth`; future visual changes should build on this implemented surface rather than treating the earlier mock-source status as sufficient.
- Continue from the five active mocks under `dashboard-control-center/mocks/`:
  - `mock-context-overview.png`
  - `mock-context-lessons.png`
  - `mock-context-workflow.png`
  - `mock-context-maintenance.png`
  - `mock-context-safety.png`
- The correction must remove the appearance of mock alignment by generic CSS layering. Rebuild page-specific surfaces where the mock uses page-specific hierarchy.
- The browser remains read-only. It must not run Git, GitHub, CI, shell, product-security, product-authority, push, merge, cleanup, or evidence-writing operations.

Important implementation constraints:

- Preserve STEP 1-7, STEP 1-14, existing CI, existing checks, Git hooks, pre-commit, document routes, live snapshot sync, canonical product document enforcement, and localization boundaries.
- Keep control-panel fixed labels in `i18n.js`; do not confuse UI locale with lesson display language or product development language.
- Do not hard-code mock values, one product repository name, one language phrase, one stack, or one fixture result.
- Do not create repository information, documents, settings, help, or changelog runtime pages until mock-backed requirements exist.
- If producer data is missing for a mock field, add schema-backed producer data or show a safe incomplete state. Do not invent state in React.

Implemented focus:

1. Producer-owned context-map data for all displayed menu contexts.
   - Do not rely on a thin `available_contexts[]` menu/status list for live switching; expand it or add an equivalent producer-owned map before the UI treats a menu choice as live context.
2. Policy-backed repository resolver for STEP 1-14, Free Development, Product Improvement, External Integration, and lesson-repository improvement.
3. Evidence and blocker propagation for Git, CI, Security, product authority, scaffold, launch, and workflow-pair status.
   - Selected-context Git, CI, and Security now derive from matching `product.git.*`, `product.ci.*`, and `product.security.*` authority evidence or blockers for the active product workflow context.
   - Required evidence only satisfies readiness when it is both current and authoritative; advisory or cached required evidence remains non-healthy.
4. Page-specific mock surfaces for Overview, Lessons, Workflow, Maintenance, and Safety.
   - Lesson live rows, Maintenance status cards, and Safety status cards use producer-owned setting states, snapshot identity, evidence rows, security rows, and current-context Partial Failure detail instead of fixed success prose.
5. External product repository scaffold and launch-quality wiring where dashboard facts depend on them.
   - Treat `docs/memory/` as part of the standard external repository scaffold shape; individual memory files may remain optional until the workflow uses them.

Verification handoff:

- The implemented `TESTS` field now records targeted runtime checks for dashboard schema/data/control-center, product authority, scaffold, launch, product gate, STEP 1-14 sync, STEP 1-14 aggregate, and as-built synchronization.
- Future runtime changes should run targeted tests according to changed files, AGENTS.MD local-verification scope, and the active workflow contract.
- Heavy full/no-cache hooks, final gate, main CI, and remote CI remain separate workflow-contract decisions.

Stop and ask for approval before:

- Any browser command execution, POST fetch, Git/GitHub/CI/API call, live authoritative polling, push, merge, cleanup, remote deletion, OAuth, token handling, webhook handling, evidence writing, destructive operation, screenshot-equality oracle, canonical product document enforcement weakening, or existing-feature tradeoff.
- Any change to STEP 1-14's official direct `index.html` launch path.

Recovery path:

- If sync checks fail, fix the five synchronized documents and sync contract before runtime work.
- If UI output disagrees with producer data, correct schema or producer data instead of adding UI-only status inference.
- If mock alignment still fails visual review, revise page structure and color/icon tokens rather than layering additional one-off CSS.

SYNC-ID: dashboard_control_center_mock_exact_alignment_correction
STATUS: implemented
ARTIFACTS: docs/workflow/AS_BUILT_SYNC_CONTRACT.tsv,docs/workflow/DASHBOARD_DATA_SCHEMA.tsv,docs/workflow/PRODUCT_REPOSITORY_STRUCTURE.tsv,docs/workflow/PRODUCT_GATE_EVIDENCE_SCHEMA.tsv,docs/workflow/TEST_PLAN_MANIFEST.tsv,docs/workflow/GIT_HOOK_CHECKS.tsv,docs/workflow/GIT_HOOK_PARALLEL_GROUPS.tsv,docs/workflow/FINAL_GATE_COVERAGE.tsv,free-development/FREE_DEVELOPMENT_MODE.md,templates/TEMPLATES.md,lesson/SYNC_GATES_14_DAYS.tsv,tools/lib/dashboard_data.sh,tools/dashboard-data,tools/lib/product_repository_authority.sh,tools/free-development,tools/product-improvement,tools/external-integration,tools/product-scaffold-check,tools/product-launch-check,dashboard-control-center/mocks/mock-context-overview.png,dashboard-control-center/mocks/mock-context-lessons.png,dashboard-control-center/mocks/mock-context-workflow.png,dashboard-control-center/mocks/mock-context-maintenance.png,dashboard-control-center/mocks/mock-context-safety.png,dashboard-control-center/src/App.jsx,dashboard-control-center/src/dashboardData.js,dashboard-control-center/src/i18n.js,dashboard-control-center/src/styles.css,tests/fixtures/dashboard-control-center.json,tests/fixtures/dashboard-control-center-live-update.json,tests/playwright/dashboard-control-center.spec.js,tools/test_dashboard_schema.sh,tools/test_dashboard_data.sh,tools/test_dashboard_control_center.sh,tools/test_product_repository_authority.sh,tools/test_product_scaffold_check.sh,tools/test_product_launch_check.sh,tools/test_product_gate_tools.sh,tools/check_lesson14_sync.sh,tools/test_lesson14.sh,tools/check_test_plan_coverage.sh,tools/check_ci_workflow_structure.sh,tools/check_as_built_sync_contract.sh,tools/check_as_built_docs.sh
TESTS: tools/test_dashboard_schema.sh,tools/test_dashboard_data.sh,tools/test_dashboard_control_center.sh,tools/test_product_repository_authority.sh,tools/test_product_scaffold_check.sh,tools/test_product_launch_check.sh,tools/test_product_gate_tools.sh,tools/check_lesson14_sync.sh,tools/test_lesson14.sh,tools/check_test_plan_coverage.sh,tools/test_test_plan.sh,tools/test_git_hooks.sh,tools/test_git_hooks_parallel.sh,tools/test_ci_final_gate.sh,tools/check_ci_workflow_structure.sh,tools/check_as_built_sync_contract.sh,tools/check_as_built_docs.sh

## Implemented Dashboard Lessons Page Exact Mock Alignment Handoff

SYNC-ID: dashboard_control_center_lessons_page_exact_mock_alignment
STATUS: implemented
ARTIFACTS: docs/workflow/AS_BUILT_SYNC_CONTRACT.tsv,dashboard-control-center/mocks/mock-context-lessons.png,dashboard-control-center/src/App.jsx,dashboard-control-center/src/i18n.js,dashboard-control-center/src/styles.css,tests/playwright/dashboard-control-center.spec.js,tools/test_dashboard_control_center.sh
TESTS: tools/test_dashboard_control_center.sh,tools/check_as_built_sync_contract.sh,tools/check_as_built_docs.sh,tools/check_test_plan_coverage.sh,tools/check_ci_workflow_structure.sh

Restart context:

- The Lessons page mock-alignment pass is implemented.
- Source mock: `dashboard-control-center/mocks/mock-context-lessons.png`.
- Future Lessons work should start from the implemented three-card, responsive, read-only page and compare against the source mock for regressions.
- Keep the dashboard read-only and producer-owned. Do not invent lesson progress, blocker, approval, repository, Git, CI, Security, or language facts in React.
- For future visual implementation, perform visual alignment first and run tests after developer visual approval unless the workflow owner explicitly requests Git/CI closure.
- Use the existing dashboard dev command when visual inspection is needed: `DASHBOARD_CONTROL_CENTER_DATA_FILE=.dashboard-control-center/dashboard-data.json npm run dashboard:dev -- --host 127.0.0.1`.
- Do not create repository information, documents, settings, help, or changelog runtime pages in this planned pass.

## Implemented Dashboard Control Center Visual Refinement Follow-up Handoff

SYNC-ID: dashboard_control_center_visual_refinement_followup
STATUS: implemented
ARTIFACTS: docs/workflow/AS_BUILT_SYNC_CONTRACT.tsv,dashboard-control-center/mocks/mock-context-overview.png,dashboard-control-center/mocks/mock-context-lessons.png,dashboard-control-center/mocks/mock-context-workflow.png,dashboard-control-center/mocks/mock-context-maintenance.png,dashboard-control-center/mocks/mock-context-safety.png,dashboard-control-center/src/App.jsx,dashboard-control-center/src/i18n.js,dashboard-control-center/src/styles.css,tests/playwright/dashboard-control-center.spec.js,tools/test_dashboard_control_center.sh,tools/check_as_built_sync_contract.sh,tools/check_as_built_docs.sh,tools/check_test_plan_coverage.sh,tools/check_ci_workflow_structure.sh
TESTS: tools/test_dashboard_control_center.sh,tools/check_as_built_sync_contract.sh,tools/check_as_built_docs.sh,tools/check_test_plan_coverage.sh,tools/check_ci_workflow_structure.sh

Restart context:

- The active dashboard visual refinement now spans Lessons, Development Workflow, Maintenance Sync, Safety Confirmation, and the shared sidebar.
- The left sidebar is unified across implemented pages and should remain consistent with the dashboard overview menu.
- Lessons and dashboard lesson-progress cards use white backgrounds, solid-color progress, one-time count-up animation only, and no gradient/fade/shine/icon scaling effects.
- Maintenance source and reference fields use one-line ellipsis, copy buttons outside the field, and tooltip bubbles with a pointer for full values.
- Safety command previews use the same copy/tooltip behavior and are stacked above Security policy for readability.
- Known fixed labels should remain localized through `i18n.js`; file paths, command text, evidence ids, and repository facts remain producer data.
- Developer Memory was intentionally reset and repopulated with active dashboard/maintenance follow-ups.
- Minimal verification and Git/CI closure are the remaining active steps for this request.

Stop and ask before adding browser command execution, POST actions, live Git/GitHub/CI polling, product-security execution, product-authority execution, evidence writing, push/merge automation inside the dashboard, destructive operations, runtime placeholder pages, or screenshot-equality test oracles.

## Implemented Menu Product Display Profile Confirmation Handoff

SYNC-ID: menu_product_display_profile_confirmation
STATUS: implemented
ARTIFACTS: AGENTS.MD,docs/workflow/AS_BUILT_SYNC_CONTRACT.tsv,docs/workflow/MENU_PRODUCT_PROFILE_POLICY.tsv,docs/workflow/PRODUCT_REPOSITORY_STRUCTURE.tsv,docs/workflow/DASHBOARD_DATA_SCHEMA.tsv,tools/lib/lesson_common.sh,tools/lib/product_repository_authority.sh,tools/product-profile,tools/menu,tools/lesson,tools/lesson14,tools/free-development,tools/product-improvement,tools/external-integration,tools/team-development,tools/product-scaffold-check,tools/test_menu_prerequisites.sh,tools/test_lesson.sh,tools/test_lesson14.sh,tools/test_product_repository_authority.sh,tools/test_product_scaffold_check.sh,tools/test_dashboard_schema.sh,tools/test_dashboard_data.sh
TESTS: tools/test_dashboard_schema.sh,tools/test_product_repository_authority.sh,tools/test_product_scaffold_check.sh,tools/test_menu_prerequisites.sh,tools/test_lesson.sh,tools/test_lesson14.sh,tools/test_dashboard_data.sh,tools/check_lesson_structure.sh,tools/check_agents_skills.sh

Restart context:

- All seven progress-menu choices now require a learner-confirmed product name or work-target name.
- Menu items 1 through 6 use the external product repository profile at `ops/PRODUCT_PROFILE.json`.
- Menu item 7 uses a lesson-repository learning profile and does not require the external product repository.
- Product profile handling is producer-backed, and the dashboard snapshot is generated from `tools/dashboard-data`.

Verification notes:

- Passed targeted profile, menu, lesson, product authority, scaffold, schema, dashboard data, structure, AGENTS, build, and whitespace checks listed in this block.
- `tools/test_dashboard_control_center.sh` was attempted but failed in existing browser UI layout expectations:
  - Overview card top alignment expected one row but observed wrapping into two rows.
  - Unsafe-text responsive test timed out waiting for the Lessons navigation link.
- Treat those browser layout failures as a separate dashboard responsive/test-expectation follow-up, not as passed evidence for the profile-data contract.

Safety notes:

- The dashboard remains read-only and only displays the profile from the snapshot.
- Do not infer product names from requirements/specification prose or repository paths.
- Do not edit the external product repository without boundary confirmation and explicit approval.

## Implemented Product Repository Canonical Docs Only Handoff

SYNC-ID: product_repository_canonical_docs_only
STATUS: implemented
ARTIFACTS: AGENTS.MD,docs/workflow/AS_BUILT_SYNC_CONTRACT.tsv,docs/workflow/PRODUCT_REPOSITORY_STRUCTURE.tsv,docs/workflow/PRODUCT_REPOSITORY_FORBIDDEN_ROOT_PATHS.tsv,docs/workflow/PRODUCT_GATE_EVIDENCE_SCHEMA.tsv,prompts/PROMPTS.md,prompts/PROMPTS_14_DAYS.md,lesson/LESSON_FLOW.tsv,lesson/LESSON_FLOW_14_DAYS.tsv,lesson/SYNC_GATES_14_DAYS.tsv,playbooks/AGENT_PLAYBOOK.md,playbooks/AGENT_PLAYBOOK_14_DAYS.md,templates/TEMPLATES.md,skills/task-tracker-docs/SKILL.md,skills/task-tracker-docs/references/product-docs.md,skills/worklog-doc-sync/SKILL.md,skills/worklog-doc-sync/references/worklog-sync.md,skills/lesson-sync-gate/SKILL.md,skills/lesson-sync-gate/references/sync-gates.md,skills/learning-progress-helpdesk/references/progress-helpdesk.md,tools/lib/product_repository_authority.sh,tools/product-scaffold-check,tools/product-improvement,tools/external-integration,tools/dashboard-data,tools/dashboard,tools/check_workflow_pair_sync.sh,tools/check_agents_skills.sh,tools/test_product_repository_authority.sh,tools/test_product_scaffold_check.sh,tools/test_product_security.sh
TESTS: tools/test_product_repository_authority.sh,tools/test_product_scaffold_check.sh,tools/test_product_security.sh,tools/check_agents_skills.sh,tools/test_dashboard_data.sh,tools/test_lesson14.sh,tools/check_lesson_structure.sh,tools/check_lesson14_sync.sh

Restart context:

- Product repository docs now use canonical paths only: `docs/product/*`, `docs/workflow/*`, and `docs/memory/*`.
- `docs/workflow/PRODUCT_REPOSITORY_FORBIDDEN_ROOT_PATHS.tsv` is the reusable policy for root Markdown paths that must not exist in product repositories.
- Product authority and scaffold checks block root duplicates before reporting readiness.
- `tools/check_workflow_pair_sync.sh --product` no longer falls back to root `TASK_TRACKER.md` or `HANDOFF.md`.
- Prompts, lesson flows, sync gates, playbooks, and repo-local skills now point to canonical product paths.
- This lesson repository records only reusable prevention policy, tools, prompts, and tests. External product repository cleanup state is not a lesson-repository source of truth.

Verification notes:

- Local targeted verification passed for product authority, scaffold, product security, AGENTS/skills, dashboard data, lesson14, lesson structure, and lesson14 sync.
- Main CI is not part of the requested closure for this handoff. Complete PR CI, merge, and local/remote sync; do not wait for main CI unless a later request changes the workflow.

Recovery notes:

- If a product repository still has root duplicates, compare root and canonical contents before deleting. Never delete a differing root file without preserving the content for review.
- If a product repository lacks canonical docs, create or move content into the canonical path rather than restoring root fallback.
- If root duplicate blockers appear in dashboard data, fix the external repository structure; do not hide the blocker in React.

## Implemented Dashboard Control Center Documents Guided Catalog Handoff

SYNC-ID: dashboard_control_center_documents_guided_catalog
STATUS: implemented
ARTIFACTS: docs/workflow/AS_BUILT_SYNC_CONTRACT.tsv,docs/workflow/DASHBOARD_DATA_SCHEMA.tsv,tools/lib/dashboard_data.sh,tools/lib/document_paths.sh,tools/lib/product_repository_authority.sh,tools/dashboard-data,dashboard-control-center/src/App.jsx,dashboard-control-center/src/dashboardData.js,dashboard-control-center/src/i18n.js,dashboard-control-center/src/styles.css,tests/fixtures/dashboard-control-center.json,tests/fixtures/dashboard-control-center-live-update.json,tests/playwright/dashboard-control-center.spec.js,tools/test_dashboard_schema.sh,tools/test_dashboard_data.sh,tools/test_dashboard_control_center.sh,tools/test_product_repository_authority.sh,tools/test_product_scaffold_check.sh,tools/check_as_built_sync_contract.sh,tools/check_as_built_docs.sh
TESTS: tools/test_dashboard_schema.sh,tools/test_dashboard_data.sh,tools/test_dashboard_control_center.sh,tools/test_product_repository_authority.sh,tools/test_product_scaffold_check.sh,tools/check_as_built_sync_contract.sh,tools/check_as_built_docs.sh

Restart context:

- The Documents page direction is implemented.
- `tools/dashboard-data` now emits a producer-owned `documents` catalog, with React rendering purpose-based document groups.
- Do not regress `DocumentsPage` back to a UI-local fixed document array.
- Do not use the Documents page as the primary place for Git/CI status, evidence rows, command previews, source-command detail, Security gates, or repository file-tree exploration.
- Route those concepts to Development Workflow, Maintenance Sync, Safety Confirmation, Repository Information, docs-tour, or update history as appropriate.

Implementation reminders:

- Start follow-up changes from `DASHBOARD_DATA_SCHEMA.tsv`, `tools/lib/dashboard_data.sh`, `tools/dashboard-data`, and `dashboard-control-center/src/dashboardData.js` before changing visible UI.
- Keep document catalog fields generic and reusable: stable document id, group id, role id, path, audience, order, status, status source, related dashboard surface, and display-only related command metadata are the current contract.
- Keep fixed display labels in `i18n.js`; keep file paths, ids, command text, and evidence ids as sanitized producer data.
- Use existing dashboard card, copy, tooltip, sidebar, and responsive layout conventions.
- If malformed data appears, fail validation; if legacy document catalog data is missing, show a safe incomplete state; do not invent state in React.
- Product type handling now follows `PRODUCT_MANIFEST.tsv` order and product authority can evaluate multiple `|`-separated product types; do not restore fixed `STEP 1-14 = web` assumptions.

Verification expectations:

```bash
./tools/test_dashboard_schema.sh
./tools/test_dashboard_data.sh
./tools/test_dashboard_control_center.sh
./tools/test_product_repository_authority.sh
./tools/test_product_scaffold_check.sh
./tools/check_as_built_sync_contract.sh
./tools/check_as_built_docs.sh
```

Run `npm run dashboard:build` when runtime React changes are made.
Run heavier aggregate, pre-commit, PR CI, or main CI only when the active workflow contract requires it.

Stop and ask before:

- Browser command execution, POST fetches, live Git/GitHub/CI/API polling, evidence writing, document editing from the dashboard, external repository mutation, push, merge, cleanup, remote deletion, OAuth, token handling, destructive operations, or accepting any existing-feature tradeoff.
- Removing or weakening docs-tour, `tools/dashboard docs`, Maintenance Sync, Safety Confirmation, Repository Information, STEP 1-7, STEP 1-14, existing checks, CI, Git hooks, pre-commit, localization boundaries, or read-only dashboard ownership.

## Implemented Agent Escalated Verification Policy Handoff

SYNC-ID: agent_escalated_verification_policy
STATUS: implemented
ARTIFACTS: AGENTS.MD,docs/workflow/AS_BUILT_SYNC_CONTRACT.tsv
TESTS: tools/check_as_built_sync_contract.sh,tools/check_as_built_docs.sh,tools/check_agents_skills.sh

Restart context:

- AGENTS.MD now has invariant rule 22: known sandbox-incompatible, non-destructive verification must be run with the required execution scope from the first attempt.
- Covered examples are Playwright/Chromium real-screen inspection, screenshot capture, browser launch, local port observation, and equivalent observation-only checks needed by the active task.
- The rule exists to prevent false or delayed visual verification when the page must be inspected before design conclusions or developer visual review.

Safety notes:

- This policy does not authorize credentials, OAuth, external writes, dependency changes, repository mutation, evidence writes, push, merge, cleanup, delete, destructive operations, CI failure overrides, gate weakening, or any existing-feature tradeoff.
- Dashboard pages remain read-only. Escalated Playwright is a verification method outside the dashboard, not a dashboard runtime capability.
- If Playwright cannot capture the page even with the required execution scope, report that blocker and do not claim visual verification.

Verification expectation:

```bash
./tools/check_as_built_sync_contract.sh
./tools/check_as_built_docs.sh
./tools/check_agents_skills.sh
```

## Implemented Dashboard Control Center Settings Safe Change Handoff

SYNC-ID: dashboard_control_center_settings_safe_change_plan
STATUS: implemented
ARTIFACTS: docs/workflow/AS_BUILT_SYNC_CONTRACT.tsv,docs/workflow/DASHBOARD_DATA_SCHEMA.tsv,docs/workflow/TEST_PLAN_MANIFEST.tsv,docs/workflow/GIT_HOOK_CHECKS.tsv,docs/workflow/FINAL_GATE_COVERAGE.tsv,.github/workflows/ci.yml,.github/workflows/lesson14-ci.yml,tools/lib/dashboard_data.sh,tools/lib/git_workflow_policy.sh,tools/dashboard-data,tools/dashboard-settings,tools/dashboard-control-center,vite.config.mjs,dashboard-control-center/src/App.jsx,dashboard-control-center/src/dashboardData.js,dashboard-control-center/src/i18n.js,dashboard-control-center/src/styles.css,tests/fixtures/dashboard-control-center.json,tests/fixtures/dashboard-control-center-live-update.json,tests/playwright/dashboard-control-center.spec.js,tools/test_dashboard_settings.sh,tools/test_dashboard_schema.sh,tools/test_dashboard_data.sh,tools/test_dashboard_control_center.sh
TESTS: tools/test_dashboard_settings.sh,tools/test_dashboard_schema.sh,tools/test_dashboard_data.sh,tools/test_dashboard_control_center.sh,tools/test_git_workflow_policy.sh,tools/test_lesson.sh,tools/test_lesson14.sh,tools/test_menu_prerequisites.sh,tools/check_as_built_sync_contract.sh,tools/check_as_built_docs.sh,tools/check_test_plan_coverage.sh,tools/check_workflow_pair_sync.sh

Restart context:

- Runtime implementation for the Settings update surface is present and this sync ID is implemented.
- The implemented direction is a non-engineer-readable Settings page that shows current selected menu, target repository, current setting values, status, source, changeability, and related page from producer-owned dashboard data.
- Settings rows open a large review popup that explains current value, proposed value, impact, source file, required confirmation, validation state, allowed values, safe update preview, plan result, and apply result; the popup moves focus inside on open, traps Tab navigation, supports Escape close, and returns focus to the initiating row.
- The workflow display language row controls lesson guidance, workflow display text, and Dashboard fixed UI labels for all standard Dashboard UI locales.
- `tools/dashboard-data` emits `summary.workflow_language`, `summary.display_locale`, and `summary.ui_locale`; validators check the locale summary and Settings row match when the fields are present.
- After a successful browser apply response with `snapshot_regenerated: true`, React refetches the regenerated snapshot immediately and updates fixed UI labels without losing a reload marker.
- Browser runtime remains read-only outside the implemented Settings mutation boundary. Settings writes go only through same-origin `application/json` POSTs to `/dashboard-settings/plan` and `/dashboard-settings/apply`, which call `tools/dashboard-settings`.
- The settings catalog is emitted by `tools/dashboard-data` from existing lesson settings, Git workflow policy/settings, selected context, product authority, and security status sources. React must not parse TSV files or maintain a fixed settings source of truth.
- `tools/dashboard-settings` owns writes with allowlisted setting ids, value validation, explicit `--confirm`, same-directory temporary-file writes, atomic rename, dashboard snapshot regeneration, and snapshot output restricted to `.dashboard-control-center/` outside isolated test mode.
- Product/work target naming, approval-state mutation, security gates, evidence, Git/CI execution, external product repository mutation, push, merge, cleanup, deletion, OAuth, and credentials remain outside editable Settings rows.

Implementation reminders:

- Continue from the implemented runtime files: `DASHBOARD_DATA_SCHEMA.tsv`, `tools/lib/dashboard_data.sh`, `tools/lib/git_workflow_policy.sh`, `tools/dashboard-data`, `tools/dashboard-settings`, `tools/dashboard-control-center`, `vite.config.mjs`, `dashboard-control-center/src/dashboardData.js`, `dashboard-control-center/src/App.jsx`, `dashboard-control-center/src/i18n.js`, and `dashboard-control-center/src/styles.css`.
- Keep fields generic and reusable: group id, setting id, scope, current value, current label, status, safe source file, allowed values, editability, reviewability, risk level, confirmation requirement, disabled reason, related page, update action id, and review metadata.
- Reuse existing lesson setting normalization and Git workflow policy validation; do not duplicate TSV parsing or add UI-only branches.
- Keep product or work target naming display-only in this sync ID; any future naming writer must use product-profile policy, product repository boundary checks when product-scoped, and a separate approved write contract.
- Keep fixed display labels in `i18n.js`; keep file paths, ids, setting values, and repository facts as sanitized producer data.
- Keep fixed-label dictionaries, layout support, and Playwright coverage aligned when changing Dashboard UI localization; do not change locale fallback logic alone.
- Use row layouts and dialog patterns that remain readable on desktop, narrow desktop, tablet, and phone widths.
- If malformed settings catalog data appears, fail validation; if catalog data is missing, show a safe incomplete state; do not invent readiness or source files in React.

Verification expectations after implementation:

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

`npm run dashboard:build` is required after React/Vite changes.
Use escalated execution from the first attempt for Playwright/Chromium verification, per AGENTS.MD.
Sub-agent review must find no unresolved major issues before the completion report.
Final implementation verification included multiple sub-agent reviews; no unresolved major issues remained after the Settings language-flow, safety, UI, and test fixes.

Stop and ask before:

- Browser command execution beyond `tools/dashboard-settings`, POST/PUT/PATCH/DELETE fetches beyond `/dashboard-settings/plan` and `/dashboard-settings/apply`, live Git/GitHub/CI/API polling, evidence writing, settings mutation outside allowlisted Settings rows, external repository mutation, push, merge, cleanup, remote deletion, OAuth, token handling, destructive operations, dependency changes, or approval-state mutation.
- Removing or weakening the existing read-only dashboard guards outside Settings, no command execution checks, mutation fetch checks, display-only command preview contract, STEP 1-7, STEP 1-14, existing checks, CI, Git hooks, pre-commit, repo-local skills, localization boundaries, or document routes.
- Accepting any existing-feature tradeoff to make Settings writes easier.

Recovery notes:

- If schema or producer tests fail, fix the producer contract before changing UI.
- If the Settings update tool writes invalid data, restore from the temporary or backup path and add a regression before retrying.
- If 7-day or 14-day behavior regresses, revert the Settings update surface rather than changing lesson behavior to fit the new UI.
- If a responsive or popup issue appears, fix layout constraints and dialog behavior instead of adding language-specific branches.

## Implemented Dashboard Control Center Full Locale UI Support Handoff

SYNC-ID: dashboard_control_center_full_locale_ui_support
STATUS: implemented
ARTIFACTS: docs/workflow/AS_BUILT_SYNC_CONTRACT.tsv,docs/workflow/DASHBOARD_DATA_SCHEMA.tsv,docs/workflow/TEST_PLAN_MANIFEST.tsv,docs/workflow/GIT_HOOK_CHECKS.tsv,docs/workflow/GIT_HOOK_PARALLEL_GROUPS.tsv,docs/workflow/FINAL_GATE_COVERAGE.tsv,.github/workflows/ci.yml,.github/workflows/lesson14-ci.yml,tools/lib/lesson_common.sh,tools/lib/dashboard_data.sh,tools/dashboard-data,tools/dashboard-settings,tools/dashboard-control-center,tools/test_dashboard_i18n.sh,tools/test_dashboard_settings.sh,tools/test_dashboard_schema.sh,tools/test_dashboard_data.sh,tools/test_dashboard_control_center.sh,tools/check_ci_workflow_structure.sh,tools/test_lesson_repository.sh,vite.config.mjs,dashboard-control-center/src/App.jsx,dashboard-control-center/src/dashboardData.js,dashboard-control-center/src/i18n.js,dashboard-control-center/src/styles.css,tests/fixtures/dashboard-control-center.json,tests/fixtures/dashboard-control-center-live-update.json,tests/playwright/dashboard-control-center.spec.js
TESTS: tools/test_dashboard_i18n.sh,tools/test_dashboard_schema.sh,tools/test_dashboard_data.sh,tools/test_dashboard_settings.sh,tools/test_dashboard_control_center.sh,tools/check_ci_workflow_structure.sh,tools/test_git_hooks.sh,tools/test_git_hooks_parallel.sh,tools/test_ci_final_gate.sh,tools/check_as_built_sync_contract.sh,tools/check_as_built_docs.sh,tools/check_test_plan_coverage.sh,tools/check_workflow_pair_sync.sh

Current State:

- This sync ID is implemented. The existing Settings safe-change implementation is extended so Dashboard fixed-label dictionaries cover the full standard language set.
- The Settings-selected workflow display language drives the Dashboard fixed UI language for `ja`, `en`, `ko`, `zh-CN`, `zh-TW`, `es`, `pt-BR`, `fr`, `de`, `id`, `vi`, `th`, `hi`, and `ar`.
- Product development language remains separate from Dashboard UI language and must not become the Dashboard locale resolver.
- The existing safe Settings writer and Vite endpoints remain the only mutation boundary: same-origin `application/json` POSTs to `/dashboard-settings/plan` and `/dashboard-settings/apply`, calling `tools/dashboard-settings` through `execFile`.
- The interaction is a server-confirmed instant UI update: after apply succeeds, React updates active locale from validated response metadata, then immediately refetches the regenerated snapshot as authoritative data.
- A short Settings-page notice explains that setting changes can take a moment and that the Dashboard updates automatically after successful application.
- Arabic uses RTL chrome plus LTR isolation for technical values such as file paths, command strings, ids, hashes, and branch names.

Document sync verification state:

- The implemented sync is recorded across requirements, specification, implementation plan, task tracker, handoff, and `AS_BUILT_SYNC_CONTRACT.tsv`.
- Final sync checks passed: `tools/check_as_built_sync_contract.sh`, `tools/check_as_built_docs.sh`, `tools/check_test_plan_coverage.sh`, and `tools/check_workflow_pair_sync.sh`.
- Related Dashboard checks passed: `tools/test_dashboard_i18n.sh`, `tools/test_dashboard_schema.sh`, `tools/test_dashboard_data.sh`, `tools/test_dashboard_settings.sh`, and `tools/test_dashboard_control_center.sh`.
- `tools/test_dashboard_i18n.sh` now fails broad English fallback for supported non-English locales and validates locale policy, aliases, direction metadata, and dictionary completeness.
- `tools/test_dashboard_data.sh` now verifies legacy raw `zh` workflow-language files emit canonical `zh-CN` in Dashboard summary and the Settings row.
- `npm run dashboard:build`, `tools/check_ci_workflow_structure.sh`, `tools/test_git_hooks.sh`, `tools/test_git_hooks_parallel.sh`, `tools/test_ci_final_gate.sh`, and `tools/test_lesson_repository.sh` passed after the final fixes.
- `git diff --check` passed.
- Multiple read-only sub-agent reviews completed. One dictionary-completeness finding was fixed by removing broad English base fallback for supported locales, adding an English-match threshold test, and canonicalizing legacy `zh`; follow-up review confirmed no unresolved major findings.

Implementation notes:

- Start from `dashboard-control-center/src/i18n.js`; make it the single source for Dashboard locale policy, aliases, direction metadata, fixed-label dictionaries, and testable completeness helpers.
- Keep the policy aligned with `tools/lib/lesson_common.sh` and AGENTS.MD standard languages; do not create unconnected language lists.
- Update `DASHBOARD_DATA_SCHEMA.tsv`, `tools/lib/dashboard_data.sh`, `tools/dashboard-data`, `dashboardData.js`, fixtures, and tests together when expanding `summary.ui_locale`.
- Update `tools/dashboard-settings` only inside the existing allowlisted writer boundary and return canonical locale metadata after successful locale-affecting apply.
- Update `App.jsx` to apply locale state after server success and refetch the snapshot without reloading the page.
- Update `styles.css` with reusable RTL and technical-value isolation support rather than page-specific language branches.
- `tools/test_dashboard_i18n.sh` is wired into `TEST_PLAN_MANIFEST.tsv`, `GIT_HOOK_CHECKS.tsv`, aggregate dashboard tests, and the as-built sync contract.
- Keep regular checks fast by combining static all-language dictionary validation with representative Playwright coverage; reserve full all-language browser smoke for release readiness or explicit final-gate scope.

Verification expectations:

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

Run `./tools/test_lesson.sh`, `./tools/test_lesson14.sh`, and `./tools/test_menu_prerequisites.sh` if language normalization, setting-file handling, or menu prerequisite behavior changes.
Run `./tools/test_lesson_repository.sh` only when required by changed-file policy, final-gate scope, or developer approval.
Use escalated browser execution from the first attempt for Playwright visual inspection when the implementation reaches browser verification.

Stop and ask before:

- Runtime automatic translation, external translation APIs, dependency changes, new browser mutation routes, mutation outside allowlisted Settings rows, any Settings writer beyond `tools/dashboard-settings`, external repository writes, evidence writes, Git/GitHub/CI execution, approval-state mutation, OAuth, credentials, cleanup, deletion, push, merge, destructive operations, or weakening schema and same-origin guards.
- Reducing pre-commit, CI, aggregate, final-gate, or dictionary-completeness coverage.
- Changing the AGENTS.MD standard language list or promoting unsupported custom values into Dashboard UI locales.
- Accepting any tradeoff against STEP 1-7, STEP 1-14, existing checks, existing document routes, repo-local skills, localization boundaries, or security gates.

Next Step:

- Ready for completion report. Future release-readiness work may add human translation QA or explicit all-language browser smoke without changing routine CI.

## Implemented Dashboard Control Center Settings Apply Feedback Handoff

SYNC-ID: dashboard_control_center_settings_apply_feedback
STATUS: implemented
ARTIFACTS: docs/workflow/AS_BUILT_SYNC_CONTRACT.tsv,dashboard-control-center/src/App.jsx,dashboard-control-center/src/i18n.js,dashboard-control-center/src/styles.css,tests/playwright/dashboard-control-center.spec.js,tools/test_dashboard_i18n.sh,tools/test_dashboard_settings.sh,tools/test_dashboard_control_center.sh
TESTS: tools/test_dashboard_i18n.sh,tools/test_dashboard_settings.sh,tools/test_dashboard_control_center.sh,tools/check_ci_workflow_structure.sh,tools/check_as_built_sync_contract.sh,tools/check_as_built_docs.sh,tools/check_test_plan_coverage.sh,tools/check_workflow_pair_sync.sh

Restart context:

- Runtime implementation is complete for this sync ID.
- The implemented Settings writer, Vite same-origin JSON plan/apply endpoints, dictionary policy, snapshot refetch, and no-reload locale update remain the baseline.
- Settings save success and Dashboard snapshot reflection confirmation are separated in the browser UI.
- The feedback surface is independent from the selected row and confirmation dialog state so it can continue after the dialog closes.
- Normal progress uses a delayed non-modal accessible status surface, not a nested modal over the existing Settings dialog focus trap.
- The refetched snapshot remains authoritative. Apply-response locale metadata may provide immediate feedback after server success, but it does not override a conflicting snapshot as final state.
- Row-level `確認のみ` and `ここで変更可能` chips were removed; the right-end row action and accessible row label carry the changeability meaning instead.
- The Settings confirmation eyebrow text is slightly larger through a targeted style rule.

Implemented entry points:

- Continue from `dashboard-control-center/src/App.jsx`, `dashboard-control-center/src/i18n.js`, `dashboard-control-center/src/styles.css`, and `tests/playwright/dashboard-control-center.spec.js` if follow-up work is needed.
- Do not change `tools/dashboard-settings`, Vite mutation endpoints, dashboard-data schema, producer behavior, CI, hooks, or Settings editability unless implementation proves the existing contract cannot satisfy the UX safely and the developer approves.
- Named state and timing policy constants are used rather than scattered magic numbers or setting-specific branches.
- Ordinary settings reconcile through the Settings row `id/current_value`; `workflow_language` reconciles through summary locale fields, direction, and the Settings row.
- Use stable roles, state keys, and metadata in tests. Do not rely only on exact Japanese or English text.

Verification expectations after implementation:

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

Run `npm run dashboard:build` after React or CSS runtime changes.
Run broader lesson, repository, hook, or final-gate checks only when changed files or workflow policy require them.
Use escalated execution from the first attempt for Playwright/Chromium verification when real browser inspection is required.

Implementation verification completed:

- `npm run dashboard:build` passed after runtime changes.
- `tools/test_dashboard_i18n.sh` passed after adding apply feedback locale keys.
- `tools/test_dashboard_settings.sh` passed after runtime changes.
- `tools/test_dashboard_control_center.sh` passed with 13 Playwright tests, including fast path, delayed feedback, stale snapshot authority, chip removal, action labels, eyebrow sizing, RTL, and no-overflow.
- `tools/test_lesson_repository.sh` passed after runtime and documentation updates, covering 7-day, 14-day, dashboard, Git/CI, product gate, and security guard paths.
- Final structure, sync, test-plan, workflow-pair, and sub-agent close-out verification passed with no unresolved major findings.

Stop and ask before:

- Adding browser mutation endpoints, adding writers beyond `tools/dashboard-settings`, changing the Settings allowlist, changing snapshot schema, adding dependencies, weakening CI/pre-commit coverage, or reducing existing Settings editability.
- Treating existing safe Git workflow settings as display-only inside this sync ID; that may be an existing-feature tradeoff and requires a separate approved contract.
- Accepting apply-response metadata as final when the refetched snapshot disagrees.

Recovery notes:

- If writer apply fails, stay in the existing dialog error path and do not show saved progress.
- If snapshot refetch fails or times out after writer success, show saved-but-not-confirmed feedback and keep polling or manual refresh paths available.
- If a valid snapshot is stale or mismatched, do not mark reflection complete.
- If long translated row-action labels overflow, fix responsive layout or wrapping instead of adding language-specific branches.

## Implemented Dashboard Control Center Settings Consistency Gate Handoff

SYNC-ID: dashboard_control_center_settings_consistency_gate
STATUS: implemented
ARTIFACTS: docs/workflow/AS_BUILT_SYNC_CONTRACT.tsv,docs/workflow/DASHBOARD_DATA_SCHEMA.tsv,docs/workflow/TEST_PLAN_MANIFEST.tsv,tools/lib/git_workflow_policy.sh,tools/git-workflow,tools/dashboard-settings,tools/lib/dashboard_data.sh,tools/dashboard-data,dashboard-control-center/src/App.jsx,dashboard-control-center/src/dashboardData.js,dashboard-control-center/src/i18n.js,dashboard-control-center/src/styles.css,tests/fixtures/dashboard-control-center.json,tests/fixtures/dashboard-control-center-live-update.json,tests/playwright/dashboard-control-center.spec.js,tools/test_git_workflow_policy.sh,tools/test_dashboard_i18n.sh,tools/test_dashboard_settings.sh,tools/test_dashboard_schema.sh,tools/test_dashboard_data.sh,tools/test_dashboard_control_center.sh
TESTS: tools/test_git_workflow_policy.sh,tools/test_dashboard_settings.sh,tools/test_dashboard_schema.sh,tools/test_dashboard_data.sh,tools/test_dashboard_i18n.sh,tools/test_dashboard_control_center.sh,tools/check_as_built_sync_contract.sh,tools/check_as_built_docs.sh,tools/check_test_plan_coverage.sh,tools/check_workflow_pair_sync.sh

Restart context:

- This sync ID now has runtime implementation in the owner layer, Settings writer, Dashboard data producer, browser validator, Settings UI, fixtures, and related tests.
- The fixed issue was that Settings could expose combinations that were individually valid but collectively inconsistent, such as disallowing normal branches and disallowing direct work on `main`.
- The fix is a reusable owner-layer consistency gate, not React-only validation or one-off text warnings.
- `tools/lib/git_workflow_policy.sh` owns candidate full-state validation. `tools/git-workflow` and `tools/dashboard-settings` call the same validation path.
- `tools/git-workflow allow` rejects runtime action permission while the persisted Git workflow settings have blocking consistency rows, so existing inconsistent files cannot authorize an unsafe or misleading action.
- `tools/dashboard-data` emits effective status, reason, and next action for Dashboard rows so the browser renders producer-owned policy.
- `not_applicable` is now in the schema, producer, and browser status vocabulary before producer output uses it.
- Blocked or rejected Settings policy results return structured JSON with `applied:false` and reason metadata; ordinary policy feedback does not rely on non-zero Vite middleware failures.
- The current Settings writer, Vite same-origin JSON endpoints, full-locale UI behavior, no-reload apply feedback, and centered progress window remain baseline behavior.

Implementation notes:

- Hard reject candidate states that leave no approved write path, especially `branch_allowed=false` with `main_direct_work_allowed=false`.
- Do not count `worktree_allowed=true` as an independent write path unless a later approved policy defines detached or external worktree semantics.
- Treat branch-dependent automation with `branch_allowed=false` as blocked unless an approved policy explicitly models existing external PR monitoring.
- Preserve `automation_level` compatibility and existing detailed-action behavior until the developer approves a stricter maximum model.
- Do not silently change runtime precedence for `merge_execution=manual` versus `developer_auto_merge_allowed=true`; preserve current precedence unless approved, but Dashboard display must be qualified non-ready rather than unqualified ready automation.
- Treat `pr_creation=auto`, `pr_ci_monitoring=auto`, and `merge_execution=after_approval` with `branch_allowed=false` as write-time errors in this sync ID. If a file is already persisted that way, display it as blocked and allow recovery changes.
- Let users recover from invalid persisted settings by accepting candidate writes that produce a valid full state.
- Keep product repository, lesson repository improvement, external integration, and learner approval statuses context-aware so they do not show misleading ready states.

Verification expectations:

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

Run `npm run dashboard:build` after React, Vite, or CSS changes.
Run `./tools/check_lesson_structure.sh` and `./tools/check_lesson14_structure.sh` as related structure checks when promoting the implemented state.
Run `tools/test_lesson_repository.sh` only when changed-file policy, final-gate scope, or developer approval requires it.
Use multiple read-only xhigh sub-agent reviews before and after runtime implementation changes when promoting this sync ID.

Current document-sync verification state:

- Implemented sync content is recorded across requirements, specification, implementation plan, task tracker, handoff, and `AS_BUILT_SYNC_CONTRACT.tsv`.
- Document and structure checks passed: `tools/check_as_built_sync_contract.sh`, `tools/check_as_built_docs.sh`, `tools/check_test_plan_coverage.sh`, `tools/check_workflow_pair_sync.sh`, `tools/check_lesson_structure.sh`, `tools/check_lesson14_structure.sh`, and `tools/check_ci_workflow_structure.sh`.
- Related non-browser checks passed: `tools/test_git_workflow_policy.sh`, `tools/test_dashboard_settings.sh`, `tools/test_dashboard_schema.sh`, `tools/test_dashboard_data.sh`, and `tools/test_dashboard_i18n.sh`.
- `npm run dashboard:build` passed after React, Vite, i18n, and CSS changes.
- `tools/test_dashboard_control_center.sh` passed after runtime fixes for stale workflow-language labels, representative locale row overflow, and blocked apply-feedback display.
- `tools/test_lesson_repository.sh` passed after runtime and documentation updates.
- Multiple read-only xhigh sub-agent reviews passed after clarifying branch-dependent automation, merge-precedence display, `not_applicable` vocabulary handling, structured `applied:false` policy responses, runtime `allow` gating, schema/i18n/UI corrections, and sync-contract TESTS correction. No unresolved major findings remain.

Stop and ask before:

- Reducing existing Settings editability, changing `automation_level` semantics, defining detached-worktree behavior, changing runtime merge precedence, allowing branch-dependent automation without branches, changing approval receipt security semantics, adding dependencies, adding writers, adding mutation endpoints, weakening CI/pre-commit, external repository mutation, Git/GitHub/CI execution, evidence writing, approval-state mutation, push, merge, cleanup, deletion, OAuth, credentials, or accepting any existing-feature tradeoff.

Recovery notes:

- If validation blocks all paths from an inconsistent current file, add a recovery path and fixture instead of weakening validation.
- If CLI and Dashboard validation disagree, fix the shared owner-layer validator first.
- If Dashboard row status and writer rejection disagree, fix producer/writer reason-code mapping before changing React.
- If layout breaks for long translated status or action labels, fix reusable row constraints and translations rather than adding language-specific UI branches.

## Implemented Product Workflow Git Usage Modes Handoff

SYNC-ID: product_workflow_git_usage_modes
STATUS: implemented
ARTIFACTS: docs/workflow/AS_BUILT_SYNC_CONTRACT.tsv,docs/workflow/DASHBOARD_DATA_SCHEMA.tsv,docs/workflow/PRODUCT_GATE_EVIDENCE_SCHEMA.tsv,docs/workflow/MENU_PRODUCT_PROFILE_POLICY.tsv,docs/workflow/PRODUCT_WORKFLOW_GIT_USAGE_POLICY.tsv,docs/workflow/TEST_PLAN_MANIFEST.tsv,docs/workflow/GIT_HOOK_CHECKS.tsv,docs/workflow/GIT_HOOK_PARALLEL_GROUPS.tsv,docs/workflow/FINAL_GATE_COVERAGE.tsv,learning/PRODUCT_WORKFLOW_GIT_USAGE_SETTINGS.tsv,learning/context/WORKFLOW_CONTEXT_MAP.tsv,.github/workflows/ci.yml,.github/workflows/lesson14-ci.yml,tools/lib/product_workflow_git_usage.sh,tools/free-development,tools/product-improvement,tools/external-integration,tools/check_repository_boundary.sh,tools/product-scaffold-check,tools/lib/product_security.sh,tools/product-security,tools/lib/product_repository_authority.sh,tools/product-repository-authority,tools/dashboard-data,tools/dashboard-settings,tools/lib/dashboard_data.sh,dashboard-control-center/src/App.jsx,dashboard-control-center/src/dashboardData.js,dashboard-control-center/src/i18n.js,dashboard-control-center/src/styles.css,vite.config.mjs,tests/fixtures/dashboard-control-center.json,tests/fixtures/dashboard-control-center-live-update.json,tools/test_product_git_usage_modes.sh,tools/test_dashboard_schema.sh,tools/test_dashboard_data.sh,tools/test_dashboard_settings.sh,tools/test_dashboard_control_center.sh,tools/check_ci_workflow_structure.sh
TESTS: tools/test_product_git_usage_modes.sh,tools/test_product_gate_tools.sh,tools/test_product_scaffold_check.sh,tools/test_product_security.sh,tools/test_product_repository_authority.sh,tools/test_dashboard_schema.sh,tools/test_dashboard_data.sh,tools/test_dashboard_settings.sh,tools/test_dashboard_i18n.sh,tools/test_dashboard_control_center.sh,tools/check_ci_workflow_structure.sh,tools/check_as_built_sync_contract.sh,tools/check_as_built_docs.sh,tools/check_test_plan_coverage.sh,tools/check_workflow_pair_sync.sh,tools/check_lesson_structure.sh

Restart context:

- This sync ID is implemented. Runtime product workflow Git usage modes have been added under this sync ID.
- The problem was that Free Development, Product Improvement, and External Integration were modeled as always requiring product Git remote sync and CI, which was too strict for small local LPs, prototypes, or one-off static pages.
- The implemented direction adds product workflow Git usage modes while keeping `ci` as the default existing-compatible behavior.
- The implemented modes are `none`, `local`, `remote_sync`, and `ci`.
- `none` means Git, remote sync, and CI are not applicable. It does not waive product workspace, canonical documents, scaffold, product-security, secret scanning, external-integration approval, or local checks.
- Existing Git workflow action settings remain the policy for how Git may be used when a mode requires Git. They are not the setting for whether Git is used.
- Dashboard must receive mode and applicability from producer-owned data. React must not infer this from menu labels or hard-coded strings.
- `.git`-less authoritative evidence storage was not introduced. Non-Git and non-CI evidence is represented as `not_applicable`; any future replacement evidence store, freshness model, or product-head binding still requires developer approval.

Implementation notes:

- The owner-layer policy and helper were implemented before UI changes.
- Preserve strict current behavior when no explicit mode is selected.
- `tools/free-development`, `tools/product-improvement`, and `tools/external-integration` call the shared helper rather than hard-coding Git sync and CI.
- `check_repository_boundary.sh`, `product-scaffold-check`, `product_security.sh`, and `product_repository_authority.sh` were updated together because they contained Git worktree assumptions that could block non-Git product work.
- Do not make product-security pass by skipping checks. Every mode still needs boundary protection, secret scanning, safe output metadata, and integration-specific approval when applicable.
- Do not claim authoritative product Git or CI evidence when the mode marks Git or CI not applicable.
- If `.git`-less authoritative evidence is needed later, define its storage path, freshness semantics, and product-head replacement only after developer approval.
- Dashboard schema, producer output, browser validation, Settings catalog, Settings writer, UI labels, command previews, fixtures, and tests were updated as one contract.

Verification commands for this implemented sync:

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

Current verification state:

- `bash -n` passed for the changed shell tools and test scripts during implementation.
- `tools/test_product_git_usage_modes.sh` passed.
- `tools/test_product_gate_tools.sh` passed.
- `tools/test_product_scaffold_check.sh` passed.
- `tools/test_product_security.sh` passed.
- `tools/test_product_repository_authority.sh` passed.
- `tools/test_dashboard_schema.sh` passed.
- `tools/test_dashboard_data.sh` passed.
- `tools/test_dashboard_settings.sh` passed.
- `tools/test_dashboard_i18n.sh` passed.
- `tools/test_dashboard_control_center.sh` passed.
- `tools/test_lesson_repository.sh` passed as the aggregate repository test for this sync ID.
- Final sync and structure checks passed after the implemented documentation state was recorded.
- `git diff --check` passed after implementation and document updates.
- Sub-agent verification completed with no unresolved major findings after review fixes.

Stop and ask before:

- Designing or accepting `.git`-less authoritative evidence storage, freshness, or product-head replacement.
- Changing default strict Git/CI behavior, STEP 1-7, STEP 1-14, existing CI, existing checks, document routes, repo-local skills, product-security guarantees, or product authority guarantees.
- Adding dependencies, external services, runtime translation, browser mutation routes, writers beyond `tools/dashboard-settings`, evidence writers, dashboard Git/GitHub/CI execution, product repository mutation, push, merge, cleanup, deletion, OAuth, credentials, destructive operations, or any existing-feature tradeoff.

Recovery notes:

- If `ci` mode stops matching current behavior, fix that before continuing with lighter modes.
- If Dashboard and gate behavior disagree, repair the owner-layer helper or producer before changing React.
- If non-Git mode bypasses security or documentation requirements, treat it as a blocker, not an acceptable lightweight path.
- If repeated failures or specification conflict appear, stop after the third repeated failure and request developer direction.

Next Step:

- This implementation step is closed. Continue future product workflow Git usage mode changes through a new synced task or explicit developer direction.

## Implemented Repository Development Workflow Workflow Skill Handoff

SYNC-ID: repository_development_workflow_skill
STATUS: implemented
ARTIFACTS: AGENTS.MD,docs/workflow/AS_BUILT_SYNC_CONTRACT.tsv,docs/workflow/REPOSITORY_DEVELOPMENT_WORKFLOW.tsv,docs/workflow/GIT_HOOK_CHECKS.tsv,docs/workflow/GIT_HOOK_PARALLEL_GROUPS.tsv,docs/workflow/TEST_PLAN_MANIFEST.tsv,docs/workflow/FINAL_GATE_GAP_COMMANDS.tsv,docs/workflow/FINAL_GATE_COVERAGE.tsv,learning/REPOSITORY_DEVELOPMENT_APPROVALS.tsv,skills/repository-development-workflow/SKILL.md,skills/repository-development-workflow/references/repository-development.md,skills/repository-development-workflow/agents/openai.yaml,tools/lib/repository_development_workflow.sh,tools/repository-development-workflow,tools/check_repository_development_workflow.sh,tools/test_repository_development_workflow.sh,tools/check_agents_skills.sh,tools/test_lesson_repository.sh,tools/check_ci_workflow_structure.sh,.github/workflows/ci.yml,.github/workflows/lesson14-ci.yml
TESTS: tools/check_repository_development_workflow.sh,tools/test_repository_development_workflow.sh

Restart context:

- This is an implemented state for the `repository-development-workflow` repo-local skill and mechanical workflow support.
- The workflow helps agents move from wall discussion to proposal, implementation plan, document sync, implementation, focused verification, release gates, PR/main CI, local/remote sync, and cleanup planning without weakening AGENTS.MD.
- The seven implemented phase ids are `context_triage`, `proposal`, `implementation_plan`, `fast_loop`, `mid_tests`, `release_gate`, and `main_sync_cleanup`.
- The workflow is for this lesson repository's own development. It must not replace `worklog-doc-sync` for product-document synchronization or `lesson-sync-gate` for final lesson/gate closure.
- Implemented artifacts include the workflow TSV, approval TSV, repo-local skill files, shared shell helper, CLI, standalone check, regression test, hook metadata, aggregate test wiring, CI structure wiring, and final-gate coverage wiring.
- Final-gate gap wiring includes `repository_development_workflow_status` so aggregate coverage recognizes `./tools/repository-development-workflow status`.
- The sync contract now lists the implemented runtime artifacts and the standalone check/test as required tests.

Next safe action:

- Use `skills/repository-development-workflow/SKILL.md` and `./tools/repository-development-workflow status|plan|guidance|gate` for future repository development workflow work.
- Treat PR CI, merge, main CI, local/remote sync, and cleanup as release or closure phases. Do not execute them from fast-loop guidance without explicit developer direction.
- If a future change extends the workflow, start from `docs/workflow/REPOSITORY_DEVELOPMENT_WORKFLOW.tsv` and `tools/lib/repository_development_workflow.sh` before changing skill text or hook/CI callers.

Stop and ask before:

- Editing AGENTS.MD, pre-commit, CI, final-gate coverage, branch/worktree deletion, remote deletion, product-repository deletion, push, merge, main CI waiting, local/remote sync, or any destructive operation.
- Weakening existing gates, removing required checks, changing STEP 1-7 or STEP 1-14 behavior, changing repo-local skill ownership, changing document synchronization ownership, or accepting any existing-feature tradeoff.
- Treating fast-loop recommendations as release proof.

Recovery notes:

- If the sync contract fails, first verify that the `SYNC-ID`, `STATUS`, `ARTIFACTS`, and `TESTS` lines match exactly across all five required docs.
- If an implemented artifact or test is listed but missing, restore the file or downgrade only through a new approved sync change; do not leave implemented metadata pointing at absent files.
- If the future workflow suggests cleanup execution, convert it to an approval-bound cleanup plan unless explicit developer approval exists.
- If repeated failures or a specification conflict appear, stop after the third repeated failure and request developer direction.

Current verification state:

- `bash -n tools/lib/repository_development_workflow.sh tools/repository-development-workflow tools/check_repository_development_workflow.sh tools/test_repository_development_workflow.sh tools/check_ci_workflow_structure.sh`: passed.
- `tools/repository-development-workflow list`: passed.
- `tools/repository-development-workflow gate --phase release_gate`: passed and reports policy-valid-only rather than proof.
- `tools/check_repository_development_workflow.sh`: passed.
- `tools/test_repository_development_workflow.sh`: passed.
- `tools/check_agents_skills.sh`: passed.
- `tools/check_test_plan_coverage.sh`: passed.
- `tools/check_ci_workflow_structure.sh`: passed.
- `tools/check_as_built_sync_contract.sh`: passed after implemented metadata was recorded.
- `tools/check_as_built_docs.sh`: passed after implemented metadata was recorded.
- `tools/check_workflow_pair_sync.sh`: passed.
- `tools/check_lesson_structure.sh`: passed.
- `tools/check_lesson14_structure.sh`: passed.
- `tools/test_test_plan.sh`: passed.
- `tools/test_git_hooks.sh`: passed.
- `tools/test_git_hooks_parallel.sh`: passed.
- `tools/test_ci_final_gate.sh`: passed.
- `tools/test_lesson_repository.sh`: passed after the approval-policy and `pre_commit_required` review fixes.
- `tools/git-hooks run --mode full --no-cache`: passed after the final-gate gap coverage fix.
- Read-only sub-agent review completed across implementation, wiring, and document synchronization; follow-up re-review found no unresolved release-blocking findings.

## Repository Development Workflow Runner Handoff

SYNC-ID: repository_development_workflow_runner
STATUS: implemented
ARTIFACTS: .gitignore,docs/workflow/AS_BUILT_SYNC_CONTRACT.tsv,docs/workflow/REPOSITORY_DEVELOPMENT_WORKFLOW.tsv,docs/workflow/REPOSITORY_DEVELOPMENT_RUNNER_POLICY.tsv,docs/workflow/TEST_PLAN_MANIFEST.tsv,learning/REPOSITORY_DEVELOPMENT_APPROVALS.tsv,skills/repository-development-workflow/SKILL.md,skills/repository-development-workflow/references/repository-development.md,tools/lib/repository_development_workflow.sh,tools/lib/repository_development_runner.sh,tools/repository-development-workflow,tools/check_repository_development_workflow.sh,tools/test_repository_development_workflow.sh,docs/as-built/IMPLEMENTATION_PLAN.md,docs/workflow/TASK_TRACKER.md,docs/workflow/HANDOFF.md
TESTS: tools/check_repository_development_workflow.sh,tools/test_repository_development_workflow.sh,tools/check_test_plan_coverage.sh,tools/test_test_plan.sh,tools/check_as_built_sync_contract.sh,tools/check_as_built_docs.sh,tools/check_workflow_pair_sync.sh

Restart context:

- This sync ID is implemented for local runner behavior.
- The developer approved runtime implementation for the `repository-development-workflow` skill.
- The runner converts the current policy-backed workflow into an approval-bound controller that can detect phases, plan checks, execute allowed non-destructive checks, record results, decide conservative reuse eligibility, and stop at approval or release gates.
- The existing seven phases remain authoritative: `context_triage`, `proposal`, `implementation_plan`, `fast_loop`, `mid_tests`, `release_gate`, and `main_sync_cleanup`.
- The existing `repository_development_workflow_skill` sync remains implemented and should be extended, not replaced.
- `AGENTS.MD` remains the top-level invariant source, especially no existing-feature tradeoffs, security-first implementation, no hidden destructive operations, and workflow-contract-based test selection.

Next safe action:

- Review the implemented diff, then run any additional medium checks selected by `./tools/repository-development-workflow guidance --phase mid_tests`.
- Do not treat runner records as release proof.
- Keep release, PR CI, merge, main CI, local/remote sync, and cleanup in their explicit approval-bound phases.

Stop and ask before:

- Changing AGENTS.MD, pre-commit, CI, final-gate coverage, GitHub workflow behavior, or release proof requirements.
- Allowing the runner to execute push, PR creation, CI monitoring, merge, main CI waiting, local/remote sync, branch deletion, worktree deletion, remote deletion, product-repository deletion, cleanup execution, arbitrary shell commands, credential handling, dashboard mutation, or any destructive operation.
- Weakening STEP 1-7, STEP 1-14, existing checks, existing document routes, repo-local skills, security gates, or existing release proof.

Verification for this sync:

```bash
./tools/check_repository_development_workflow.sh
./tools/test_repository_development_workflow.sh
./tools/check_test_plan_coverage.sh
./tools/test_test_plan.sh
./tools/check_as_built_sync_contract.sh
./tools/check_as_built_docs.sh
./tools/check_workflow_pair_sync.sh
```

Recovery notes:

- If sync checks fail, first make `SYNC-ID`, `STATUS`, `ARTIFACTS`, and `TESTS` match exactly across the five synchronized documents and the contract row.
- If the runner cannot prove a previous PASS is reusable, run the check instead of reusing stale evidence.
- If release proof can be skipped through runner records, treat that as a blocking safety regression.

## Product Development Workflow Skill And Alias Handoff

SYNC-ID: product_development_workflow_skill_aliases
STATUS: implemented
ARTIFACTS: AGENTS.MD,docs/workflow/AS_BUILT_SYNC_CONTRACT.tsv,docs/workflow/TEST_PLAN_MANIFEST.tsv,skills/SKILL_ALIASES.tsv,skills/product-development-workflow/SKILL.md,skills/product-development-workflow/references/product-development.md,skills/product-development-workflow/agents/openai.yaml,tools/menu,tools/check_agents_skills.sh,tools/test_menu_prerequisites.sh,tools/test_dashboard_settings.sh,dashboard-control-center/src/App.jsx,dashboard-control-center/src/i18n.js,dashboard-control-center/src/styles.css,tests/playwright/dashboard-control-center.spec.js,tools/test_dashboard_control_center.sh
TESTS: tools/check_agents_skills.sh,tools/test_menu_prerequisites.sh,tools/test_dashboard_settings.sh,tools/test_dashboard_control_center.sh,tools/check_as_built_sync_contract.sh,tools/check_as_built_docs.sh,tools/check_test_plan_coverage.sh,tools/check_workflow_pair_sync.sh

Restart context:

- `$product-development-workflow` is implemented as the Settings-aware external product development skill.
- It is for Free Development, Product Improvement, and External Integration.
- Lesson Repository Improvement continues to use `$repository-development-workflow`.
- `skills/SKILL_ALIASES.tsv` is the alias source of truth.
- `./tools/menu skills` and `./tools/menu skill-aliases` display canonical skill names and aliases.
- Settings action labels are display-only mappings for Git workflow action-mode rows; they do not change saved values or policy behavior.
- Developer auto-merge is a boolean permission row and keeps `Allowed`/`Not allowed` labels so displayed choices match writer-accepted `true|false` values.
- The Settings confirmation note explains that `Auto`/`自動` is prior approval only after required conditions pass.

Next safe action:

- This implementation step is ready for developer review or a later approval-bound release phase.
- Do not run broader release-gate, PR CI, merge, main CI, local/remote sync, or cleanup unless the developer explicitly asks for that phase.

Stop and ask before:

- Changing product Git usage semantics, Git workflow action semantics, Settings writer authority, CI/pre-commit behavior, product-security gates, destructive cleanup, OAuth, credentials, external-service authority, push, merge, main CI, local/remote sync, or any existing-feature tradeoff.
- Treating aliases as replacements for canonical skill paths.
- Treating product Git usage `none` as no verification.

Recovery notes:

- If skill checks fail, first repair AGENTS routing, skill metadata, references, and alias target files.
- If menu alias output fails, repair `skills/SKILL_ALIASES.tsv` and the TSV reader in `tools/menu`.
- If Settings tests fail, verify that only workflow action-mode rows use the three display labels, boolean permission rows keep `Allowed`/`Not allowed`, and stored values remain unchanged.
- If sync checks fail, make the synchronized metadata lines match exactly across the contract and five required documents.

Current verification state:

- `bash -n tools/menu tools/check_agents_skills.sh tools/test_menu_prerequisites.sh tools/test_dashboard_control_center.sh`: passed.
- `tools/check_agents_skills.sh`: passed after alias TSV validation was strengthened for empty fields, extra columns, duplicates, missing targets, and full skill coverage.
- `tools/test_menu_prerequisites.sh`: passed.
- `tools/test_dashboard_settings.sh`: passed after catalog allowed-values writer validation.
- `tools/test_dashboard_control_center.sh`: passed.
- `tools/test_dashboard_i18n.sh`: passed.
- `tools/check_repository_development_workflow.sh`: passed.
- `tools/test_repository_development_workflow.sh`: passed.
- `tools/check_test_plan_coverage.sh`: passed.
- `tools/test_test_plan.sh`: passed.
- `tools/test_git_hooks.sh`: passed.
- `tools/test_git_hooks_parallel.sh`: passed.
- `tools/check_ci_workflow_structure.sh`: passed.
- `tools/check_as_built_sync_contract.sh`: passed.
- `tools/check_as_built_docs.sh`: passed.
- `tools/check_workflow_pair_sync.sh`: passed.
- `tools/check_developer_memory_requirements.sh`: passed.
- `git diff --check`: passed.
- Sub-agent read-only reviews completed with no unresolved blocking findings after re-review.

## External Product Workflow Release Readiness Handoff

SYNC-ID: external_product_workflow_release_readiness
STATUS: implemented
ARTIFACTS: docs/workflow/AS_BUILT_SYNC_CONTRACT.tsv,docs/workflow/TEST_PLAN_MANIFEST.tsv,free-development/FREE_DEVELOPMENT_MODE.md,skills/product-development-workflow/SKILL.md,skills/product-development-workflow/references/product-development.md,skills/worklog-doc-sync/SKILL.md,skills/worklog-doc-sync/references/worklog-sync.md,skills/task-tracker-docs/SKILL.md,skills/task-tracker-docs/references/product-docs.md,tools/lib/product_workflow_git_usage.sh,tools/product-profile,tools/menu,tools/dashboard-data,tools/test_product_git_usage_modes.sh,tools/test_menu_prerequisites.sh,tools/test_dashboard_data.sh,docs/as-built/REQUIREMENTS.md,docs/as-built/SPECIFICATION.md,docs/as-built/IMPLEMENTATION_PLAN.md,docs/workflow/TASK_TRACKER.md,docs/workflow/HANDOFF.md
TESTS: tools/test_product_git_usage_modes.sh,tools/test_menu_prerequisites.sh,tools/test_dashboard_data.sh,tools/check_agents_skills.sh,tools/check_test_plan_coverage.sh,tools/test_test_plan.sh,tools/check_as_built_sync_contract.sh,tools/check_as_built_docs.sh,tools/check_workflow_pair_sync.sh

Restart context:

- This work aligns external-product release readiness with Dashboard Settings and `$repository-development-workflow`.
- Free Development, Product Improvement, and External Integration now use product workflow mode to decide product workspace, Git worktree, remote sync, CI, menu readiness, product profile boundaries, and Dashboard operation applicability.
- `PRODUCT_WORKFLOW_GIT_USAGE_MODE` is no longer a general runtime bypass. It needs `PRODUCT_WORKFLOW_GIT_USAGE_ALLOW_ENV_OVERRIDE=1` and is intended for controlled tests.
- `none` means Git, remote sync, CI, PR CI, merge, main CI, and Git cleanup are not applicable; product workspace, documents, scaffold, product-security, external-integration approval, and required local checks remain applicable.
- STEP 1-7, STEP 1-14, and Advanced Lesson keep their lesson flows authoritative and do not expose the full external-product workflow automation.
- `task-tracker-repository` remains the structured lesson default example. External-product workflows use the configured product workspace.

Next Step:

- No remaining local implementation work is known for this sync ID.
- Treat release-gate, PR CI, merge, main CI, local/remote sync, and cleanup as separate approval-bound phases.

Stop and ask before:

- Changing product Git usage semantics, Git workflow action semantics, Dashboard mutation authority, CI/pre-commit/final-gate behavior, product-security strictness, push, PR creation, merge, main CI waiting, local/remote sync, cleanup execution, OAuth, credentials, external-service authority, or any existing-feature tradeoff.

Recovery notes:

- If Git/CI remains required in `none` mode, fix the shared product workflow helper and rerun `tools/test_product_git_usage_modes.sh`.
- If menu readiness or product profile writes disagree with Settings mode, repair the shared boundary call rather than adding menu-specific bypasses.
- If Dashboard rows disagree, fix `tools/dashboard-data` because React must not infer Git/CI applicability.
- If sync checks fail, make the contract and five synchronized documents match on `SYNC-ID`, `STATUS`, `ARTIFACTS`, and `TESTS`.

Current verification state:

- `bash -n tools/lib/product_workflow_git_usage.sh tools/product-profile tools/menu tools/dashboard-data tools/test_product_git_usage_modes.sh tools/test_menu_prerequisites.sh tools/test_dashboard_data.sh tools/check_agents_skills.sh`: passed.
- `git diff --check`: passed.
- `tools/test_product_git_usage_modes.sh`: passed.
- `tools/test_menu_prerequisites.sh`: passed.
- `tools/test_dashboard_data.sh`: passed.
- `tools/check_agents_skills.sh`: passed.
- `tools/check_test_plan_coverage.sh`: passed.
- `tools/test_test_plan.sh`: passed.
- `tools/check_as_built_sync_contract.sh`: passed.
- `tools/check_as_built_docs.sh`: passed.
- `tools/check_workflow_pair_sync.sh`: passed.
- `tools/test_dashboard_i18n.sh`: passed.
- `tools/test_dashboard_settings.sh`: passed.
- `tools/test_product_gate_tools.sh`: passed.
- `tools/repository-development-workflow run --phase mid_tests --check-set required --execute --approved`: passed and recorded runner evidence.

## External Product Local Scaffold Controls Handoff

SYNC-ID: external_product_local_scaffold_controls
STATUS: implemented
ARTIFACTS: AGENTS.MD,docs/workflow/AS_BUILT_SYNC_CONTRACT.tsv,docs/workflow/PRODUCT_REPOSITORY_STRUCTURE.tsv,docs/workflow/TEST_PLAN_MANIFEST.tsv,free-development/FREE_DEVELOPMENT_MODE.md,templates/TEMPLATES.md,skills/product-development-workflow/SKILL.md,skills/product-development-workflow/references/product-development.md,tools/lib/product_workflow_git_usage.sh,tools/lib/product_repository_registry.sh,tools/lib/product_repository_authority.sh,tools/product-gate-evidence-bootstrap,tools/product-scaffold-check,tools/product-launch-check,tools/dashboard-data,tools/test_product_scaffold_check.sh,tools/test_product_git_usage_modes.sh,tools/test_product_repository_authority.sh,tools/test_product_gate_tools.sh,tools/test_product_launch_check.sh,tools/test_dashboard_data.sh,docs/as-built/REQUIREMENTS.md,docs/as-built/SPECIFICATION.md,docs/as-built/IMPLEMENTATION_PLAN.md,docs/workflow/TASK_TRACKER.md,docs/workflow/HANDOFF.md
TESTS: tools/test_product_scaffold_check.sh,tools/test_product_git_usage_modes.sh,tools/test_product_repository_authority.sh,tools/test_product_gate_tools.sh,tools/test_product_launch_check.sh,tools/test_dashboard_data.sh,tools/check_agents_skills.sh,tools/check_test_plan_coverage.sh,tools/test_test_plan.sh,tools/check_as_built_sync_contract.sh,tools/check_as_built_docs.sh,tools/check_workflow_pair_sync.sh

Restart context:

- `$repository-development-workflow` is the active protocol for this repository change.
- External product repositories now have a required product-local maintenance scaffold in the structure policy: product-local skills, product-local tools, workflow notes, product memory, repository index, `.gitignore`, canonical product docs, and manifests.
- External product repositories now have a parent-installable product gate evidence producer so local tests, Git, CI, and security checks can write Dashboard-readable rows under `.git/product-gate-evidence/`.
- Product authority now treats evidence from an older product HEAD as stale, so a post-check product commit requires rerunning the product-local gate before Dashboard can call that evidence current.
- The product repository remains independent for requirements, specification, implementation plan, task tracker, and handoff under `docs/product/` and `docs/workflow/`; this repository provides control-basis validation and menu/dashboard orchestration.
- Settings product workflow Git usage mode remains the source of truth for whether Git, remote sync, and CI are applicable.
- Direct `tools/product-scaffold-check` remains strict by default. Shared product workflow gates pass `--git-optional` or `--ci-optional` only when Settings mode makes that axis not applicable.
- `tools/product-launch-check` remains strict by default and accepts `--git-optional` only for Git-not-applicable product modes.
- Dashboard data evaluates external-product Git operation modes using the configured product repository, not the lesson repository.

Next safe action:

- Finish the focused and sync verification listed in `docs/workflow/TASK_TRACKER.md`.
- After those checks pass, update this handoff and the task tracker verification state.
- Treat release-gate, PR CI, merge, main CI, local/remote sync, cleanup, and product repository deletion as separate approval-bound phases.

Stop and ask before:

- Changing product Git usage semantics, product-security strictness, default strict `ci` behavior, CI/pre-commit/final-gate behavior, Dashboard mutation authority, push, PR creation, merge, main CI waiting, local/remote sync, cleanup execution, product repository deletion, OAuth, credentials, external-service authority, or any existing-feature tradeoff.

Recovery notes:

- If a valid product fixture fails because a product-local scaffold path is missing, update the shared fixture scaffold helper, not each assertion separately.
- If non-CI modes require CI files, repair `product_workflow_git_usage_scaffold_gate` and `tools/product-scaffold-check --ci-optional`.
- If direct scaffold checks become too permissive, restore strict default behavior and keep mode-specific relaxation behind explicit optional flags.
- If Dashboard product Git operation rows disagree with Settings mode, fix `tools/dashboard-data` because React must not infer Git or CI applicability.
- If sync checks fail, make the contract and five synchronized documents match on `SYNC-ID`, `STATUS`, `ARTIFACTS`, and `TESTS`.

Current verification state:

- `bash -n tools/product-gate-evidence-bootstrap tools/product-scaffold-check tools/product-launch-check tools/lib/product_workflow_git_usage.sh tools/lib/product_repository_authority.sh tools/test_product_scaffold_check.sh tools/test_product_git_usage_modes.sh`: passed.
- `tools/test_product_scaffold_check.sh`: passed.
- `tools/test_product_git_usage_modes.sh`: passed.
- `tools/test_product_launch_check.sh`: passed.
- `tools/test_product_repository_authority.sh`: passed.
- `tools/test_product_gate_tools.sh`: passed.
- `tools/test_dashboard_data.sh`: passed.
- `tools/check_agents_skills.sh`: passed.
- `tools/check_test_plan_coverage.sh`: passed.
- `tools/test_test_plan.sh`: passed.
- `tools/check_as_built_sync_contract.sh`: passed.
- `tools/check_as_built_docs.sh`: passed.
- `tools/check_workflow_pair_sync.sh`: passed.
- `git diff --check`: passed.
- `tools/repository-development-workflow run --phase mid_tests --check-set required --execute`: passed.

## Dashboard Control Center Design System Handoff

SYNC-ID: dashboard_control_center_design_system
STATUS: implemented
ARTIFACTS: docs/design-system/dashboard-control-center/DESIGN_SYSTEM.md,docs/workflow/AS_BUILT_SYNC_CONTRACT.tsv,docs/workflow/TEST_PLAN_MANIFEST.tsv,guides/DOCUMENT_MAP.md,tools/docs-tour,dashboard-control-center/src/App.jsx,dashboard-control-center/src/i18n.js,dashboard-control-center/src/styles.css,tests/playwright/dashboard-control-center.spec.js,tools/test_docs_tour.sh,tools/test_dashboard_control_center.sh,docs/as-built/REQUIREMENTS.md,docs/as-built/SPECIFICATION.md,docs/as-built/IMPLEMENTATION_PLAN.md,docs/workflow/TASK_TRACKER.md,docs/workflow/HANDOFF.md
TESTS: tools/test_docs_tour.sh,tools/test_dashboard_i18n.sh,tools/test_dashboard_control_center.sh,tools/check_developer_memory_requirements.sh,tools/check_test_plan_coverage.sh,tools/test_test_plan.sh,tools/check_as_built_sync_contract.sh,tools/check_as_built_docs.sh,tools/check_workflow_pair_sync.sh

Restart context:

- `$repository-development-workflow` is the active protocol for this repository change.
- The design-system source of truth is `docs/design-system/dashboard-control-center/DESIGN_SYSTEM.md`.
- The purpose is not decoration-only polish; it is a reusable control-center contract for status, evidence, safety, source, command-preview, glossary, and detail-surface UI.
- Development Workflow, Maintenance Sync, Safety Actions, and Help now have non-engineer-oriented detail behavior in scope.
- Raw paths, technical IDs, and commands should remain accessible, but primary labels should explain role and meaning first.
- Dashboard remains read-only outside Settings, and command previews remain display-only.

Next safe action:

- No local implementation or focused verification remains for `dashboard_control_center_design_system`.
- Use `docs/workflow/TASK_TRACKER.md` and the verification state below as the restart proof for this sync ID.
- Treat release-gate, PR CI, merge, main CI, local/remote sync, and cleanup as separate approval-bound phases.

Stop and ask before:

- Changing Settings mutation authority, command execution authority, Git/CI execution semantics, merge, push, main CI waiting, cleanup execution, product repository deletion, dependency changes, CI/pre-commit/final-gate behavior, credentials, external-service authority, or any existing-feature tradeoff.

Recovery notes:

- If detail actions do not open useful information, repair the shared detail surface or remove the false affordance.
- If source displays become too technical for non-engineers, move file paths and commands behind copy controls or technical detail while keeping them accessible.
- If glossary entries become flat again, restore category grouping and per-term detail.
- If i18n checks fail, add the missing keys in `dashboard-control-center/src/i18n.js` rather than hard-coding labels.
- If sync checks fail, make `SYNC-ID`, `STATUS`, `ARTIFACTS`, and `TESTS` match exactly across the contract and five synchronized documents.

Current verification state:

- `tools/test_docs_tour.sh`: passed.
- `tools/test_dashboard_i18n.sh`: passed.
- `tools/test_dashboard_control_center.sh`: passed.
- `tools/check_developer_memory_requirements.sh`: passed.
- `tools/check_test_plan_coverage.sh`: passed.
- `tools/test_test_plan.sh`: passed.
- `tools/check_as_built_sync_contract.sh`: passed.
- `tools/check_as_built_docs.sh`: passed.
- `tools/check_workflow_pair_sync.sh`: passed.
- `git diff --check`: passed.
- `tools/repository-development-workflow run --phase fast_loop --check-set required --execute --approved`: passed.
- `tools/repository-development-workflow run --phase mid_tests --check-set required --execute --approved`: passed.

## Dashboard Control Center Design System Full-Application Handoff

SYNC-ID: dashboard_control_center_design_system_full_application
STATUS: implemented
ARTIFACTS: docs/design-system/dashboard-control-center/DESIGN_SYSTEM.md,docs/workflow/AS_BUILT_SYNC_CONTRACT.tsv,dashboard-control-center/src/App.jsx,dashboard-control-center/src/i18n.js,dashboard-control-center/src/styles.css,tests/playwright/dashboard-control-center.spec.js,docs/as-built/REQUIREMENTS.md,docs/as-built/SPECIFICATION.md,docs/as-built/IMPLEMENTATION_PLAN.md,docs/workflow/TASK_TRACKER.md,docs/workflow/HANDOFF.md
TESTS: tools/test_docs_tour.sh,tools/test_dashboard_i18n.sh,tools/test_dashboard_control_center.sh,tools/check_developer_memory_requirements.sh,tools/check_test_plan_coverage.sh,tools/test_test_plan.sh,tools/check_as_built_sync_contract.sh,tools/check_as_built_docs.sh,tools/check_workflow_pair_sync.sh

Restart context:

- `$repository-development-workflow` is the active protocol for this repository change.
- `docs/design-system/dashboard-control-center/DESIGN_SYSTEM.md` remains the design-system source of truth.
- The implemented correction applies the design-system split across actual pages: shared page headers, decision summaries, common cards, operational rows, detail panels, technical chips, tooltip surfaces, focus rings, spacing, borders, and radius use the common control-center frame.
- Raw paths, commands, and IDs stay visible where they are inspectable field values; tooltip text becomes short role help; longer explanations stay in detail popups or Help.
- Dashboard remains read-only outside Settings, and command previews remain display-only.
- Existing lesson, Git/CI, Settings, product workflow, and synchronized-document semantics are not part of this change.

Next safe action:

- No local implementation or focused verification remains for `dashboard_control_center_design_system_full_application`.
- Use `docs/workflow/TASK_TRACKER.md` and the verification state below as the restart proof for this sync ID.
- Treat release-gate, PR CI, merge, main CI, local/remote sync, and cleanup as separate approval-bound phases.

Stop and ask before:

- Changing Settings mutation authority, command execution authority, Git/CI execution semantics, merge, push, main CI waiting, cleanup execution, product repository deletion, dependency changes, CI/pre-commit/final-gate behavior, credentials, external-service authority, or any existing-feature tradeoff.

Recovery notes:

- If tooltip text clips or overflows, shorten the tooltip and move detail to `InsightDetailButton` or Help glossary entries.
- If raw paths or commands disappear from visible fields, restore the inspectable raw value and keep the explanatory role in tooltip text.
- If copy affordances lose the raw value, restore the accessible name or title with the copied value.
- If i18n checks fail, add missing keys rather than hard-coding labels.
- If sync checks fail, make `SYNC-ID`, `STATUS`, `ARTIFACTS`, and `TESTS` match exactly across the contract and five synchronized documents.

Current verification state:

- `tools/test_docs_tour.sh`: passed.
- `tools/test_dashboard_i18n.sh`: passed.
- `tools/test_dashboard_control_center.sh`: passed.
- `tools/check_developer_memory_requirements.sh`: passed.
- `tools/check_test_plan_coverage.sh`: passed.
- `tools/test_test_plan.sh`: passed.
- `tools/check_as_built_sync_contract.sh`: passed.
- `tools/check_as_built_docs.sh`: passed.
- `tools/check_workflow_pair_sync.sh`: passed.
- `git diff --check`: passed.
- `tools/repository-development-workflow run --phase fast_loop --check-set required --execute --approved`: passed.
- `tools/repository-development-workflow run --phase mid_tests --check-set required --execute --approved`: passed.

## Dashboard Control Center Design System Source-To-Runtime Handoff

SYNC-ID: dashboard_control_center_design_system_source_runtime
STATUS: implemented
ARTIFACTS: docs/design-system/dashboard-control-center/DESIGN_SYSTEM.md,docs/design-system/dashboard-control-center/tokens.json,docs/design-system/dashboard-control-center/components.json,dashboard-control-center/src/design-system.generated.css,dashboard-control-center/src/design-system.generated.js,dashboard-control-center/src/main.jsx,dashboard-control-center/src/App.jsx,dashboard-control-center/src/styles.css,tools/dashboard-design-system,tools/check_dashboard_design_system.sh,tools/test_dashboard_control_center.sh,tools/test_lesson_repository.sh,docs/workflow/GIT_HOOK_CHECKS.tsv,docs/workflow/GIT_HOOK_PARALLEL_GROUPS.tsv,docs/workflow/TEST_PLAN_MANIFEST.tsv,docs/workflow/AS_BUILT_SYNC_CONTRACT.tsv,tests/playwright/dashboard-control-center.spec.js,docs/as-built/REQUIREMENTS.md,docs/as-built/SPECIFICATION.md,docs/as-built/IMPLEMENTATION_PLAN.md,docs/workflow/TASK_TRACKER.md,docs/workflow/HANDOFF.md
TESTS: tools/test_dashboard_i18n.sh,tools/test_dashboard_control_center.sh,tools/check_developer_memory_requirements.sh,tools/check_test_plan_coverage.sh,tools/test_test_plan.sh,tools/check_as_built_sync_contract.sh,tools/check_as_built_docs.sh,tools/check_workflow_pair_sync.sh,tools/check_repository_development_workflow.sh,tools/test_repository_development_workflow.sh

Restart context:

- `$repository-development-workflow` is the active protocol for this repository change.
- The video-analysis finding is now captured as a source-to-runtime design-system contract.
- `DESIGN_SYSTEM.md` remains the human-readable authority.
- `tokens.json` and `components.json` are the machine-readable sources for generated Dashboard runtime CSS and JS.
- `tools/dashboard-design-system write` regenerates `dashboard-control-center/src/design-system.generated.css` and `dashboard-control-center/src/design-system.generated.js`.
- `tools/check_dashboard_design_system.sh` checks drift and runtime wiring.
- `dashboard-control-center/src/main.jsx` imports the generated CSS, and `dashboard-control-center/src/App.jsx` marks the app shell with `data-dcc-design-system="dashboard-control-center"`.
- Dashboard remains read-only outside Settings, and command previews remain display-only.

Next safe action:

- No remaining focused local implementation or verification work is known for `dashboard_control_center_design_system_source_runtime`.
- If the running Dashboard shows a Vite import overlay for `design-system.generated.css`, run `./tools/dashboard-design-system write`, stop the stale Vite server, and restart `./tools/dashboard-control-center open`.
- Treat release-gate, PR CI, merge, main CI, local/remote sync, and cleanup as separate approval-bound phases.

Stop and ask before:

- Changing Settings mutation authority, command execution authority, Git/CI execution semantics, merge, push, main CI waiting, cleanup execution, product repository deletion, dependency changes, CI/pre-commit/final-gate behavior, credentials, external-service authority, or any existing-feature tradeoff.

Recovery notes:

- If generated files drift, update `tokens.json` or `components.json`, regenerate, and rerun `tools/check_dashboard_design_system.sh`.
- If the runtime marker disappears, restore the app-shell marker instead of weakening the drift check.
- If browser tests show the rejected left accent or gradient header again, repair shared design-system runtime styling.
- If sync checks fail, make `SYNC-ID`, `STATUS`, `ARTIFACTS`, and `TESTS` match exactly across the contract and five synchronized documents.

Current verification state:

- `tools/check_dashboard_design_system.sh`: passed.
- `tools/test_dashboard_i18n.sh`: passed.
- `tools/test_dashboard_control_center.sh`: passed.
- `tools/check_developer_memory_requirements.sh`: passed.
- `tools/check_test_plan_coverage.sh`: passed.
- `tools/test_test_plan.sh`: passed.
- `tools/check_as_built_sync_contract.sh`: passed.
- `tools/check_as_built_docs.sh`: passed.
- `tools/check_workflow_pair_sync.sh`: passed.
- `tools/check_repository_development_workflow.sh`: passed.
- `tools/test_repository_development_workflow.sh`: passed.
- `git diff --check`: passed.

## Dashboard Control Center Visual Design-System Editor Handoff

SYNC-ID: dashboard_control_center_design_studio_visual_editor
STATUS: implemented
ARTIFACTS: docs/design-system/dashboard-control-center/DESIGN_SYSTEM.md,docs/design-system/dashboard-control-center/tokens.json,docs/design-system/dashboard-control-center/components.json,dashboard-control-center/src/design-system.generated.css,dashboard-control-center/src/design-system.generated.js,dashboard-control-center/src/App.jsx,dashboard-control-center/src/dashboardData.js,dashboard-control-center/src/i18n.js,dashboard-control-center/src/styles.css,vite.config.mjs,tools/dashboard-design-system,tools/check_dashboard_design_system.sh,tests/playwright/dashboard-control-center.spec.js,tools/test_dashboard_control_center.sh,docs/workflow/PRODUCT_REPOSITORY_STRUCTURE.tsv,templates/TEMPLATES.md,tools/test_product_scaffold_check.sh,docs/workflow/AS_BUILT_SYNC_CONTRACT.tsv,docs/as-built/REQUIREMENTS.md,docs/as-built/SPECIFICATION.md,docs/as-built/IMPLEMENTATION_PLAN.md,docs/workflow/TASK_TRACKER.md,docs/workflow/HANDOFF.md
TESTS: tools/check_dashboard_design_system.sh,tools/test_dashboard_i18n.sh,tools/test_dashboard_control_center.sh,tools/test_product_scaffold_check.sh,tools/check_developer_memory_requirements.sh,tools/check_test_plan_coverage.sh,tools/test_test_plan.sh,tools/check_as_built_sync_contract.sh,tools/check_as_built_docs.sh,tools/check_workflow_pair_sync.sh,tools/check_repository_development_workflow.sh,tools/test_repository_development_workflow.sh

Restart context:

- `$repository-development-workflow` is the active protocol for this repository change.
- The visual Design Studio expands the previous tooltip/copy-only editor into a source-backed editor for shared foundation presets.
- The user explicitly rejected presenting "No direct CSS editing" as the primary value. The intended UX is visual editing of the design-system source, with CSS/JS regenerated from the source.
- Foundation presets cover theme accent, density, radius, and typography scale.
- The preview must show atom, molecule, and organism examples so upstream token changes visibly cascade through multiple UI levels.
- Interaction presets remain whitelist-validated for tooltip/copy behavior.
- External product design-system support is product-local: the product repository owns its `docs/design-system/` sources, product-local skill, and product-local check. The lesson repository remains the control plane.

Next safe action:

- Run the focused verification sequence listed in the sync contract if it has not already been run in this session.
- If generated files drift, run `./tools/dashboard-design-system write` and rerun `./tools/check_dashboard_design_system.sh`.
- Treat browser visual approval, release-gate, PR CI, merge, main CI, local/remote sync, and cleanup as separate approval-bound phases.

Stop and ask before:

- Adding arbitrary CSS editing, arbitrary script execution, cross-repository writes, Settings authority changes, command execution authority changes, Git/CI/merge/sync behavior changes, dependency changes, credential handling, or any existing-feature tradeoff.

Recovery notes:

- If foundation presets do not change generated CSS variables, repair `tools/dashboard-design-system` before changing UI labels.
- If Vite accepts unsupported foundation values, tighten middleware validation and rerun focused Dashboard tests.
- If apply succeeds without a matching current plan token, repair plan-token fingerprinting before continuing.
- If product scaffold tests fail after design-system scaffold additions, update the shared fixture helper and `PRODUCT_REPOSITORY_STRUCTURE.tsv` together.

Current verification state:

- `tools/check_dashboard_design_system.sh`: pending.
- `tools/test_dashboard_i18n.sh`: pending.
- `tools/test_dashboard_control_center.sh`: pending.
- `tools/test_product_scaffold_check.sh`: pending.
- `tools/check_developer_memory_requirements.sh`: pending.
- `tools/check_test_plan_coverage.sh`: pending.
- `tools/test_test_plan.sh`: pending.
- `tools/check_as_built_sync_contract.sh`: pending.
- `tools/check_as_built_docs.sh`: pending.
- `tools/check_workflow_pair_sync.sh`: pending.
- `tools/check_repository_development_workflow.sh`: pending.
- `tools/test_repository_development_workflow.sh`: pending.
- `git diff --check`: pending.

## Dashboard Control Center Design Studio Handoff

SYNC-ID: dashboard_control_center_design_studio
STATUS: implemented
ARTIFACTS: docs/design-system/dashboard-control-center/DESIGN_SYSTEM.md,docs/design-system/dashboard-control-center/components.json,dashboard-control-center/src/design-system.generated.css,dashboard-control-center/src/design-system.generated.js,dashboard-control-center/src/App.jsx,dashboard-control-center/src/dashboardData.js,dashboard-control-center/src/i18n.js,dashboard-control-center/src/styles.css,vite.config.mjs,tools/dashboard-design-system,tools/check_dashboard_design_system.sh,tests/playwright/dashboard-control-center.spec.js,tools/test_dashboard_control_center.sh,docs/workflow/AS_BUILT_SYNC_CONTRACT.tsv,docs/as-built/REQUIREMENTS.md,docs/as-built/SPECIFICATION.md,docs/as-built/IMPLEMENTATION_PLAN.md,docs/workflow/TASK_TRACKER.md,docs/workflow/HANDOFF.md
TESTS: tools/test_dashboard_i18n.sh,tools/test_dashboard_control_center.sh,tools/check_developer_memory_requirements.sh,tools/check_test_plan_coverage.sh,tools/test_test_plan.sh,tools/check_as_built_sync_contract.sh,tools/check_as_built_docs.sh,tools/check_workflow_pair_sync.sh,tools/check_repository_development_workflow.sh,tools/test_repository_development_workflow.sh

Restart context:

- `$repository-development-workflow` is the active protocol for this repository change.
- Design Studio is the guarded Dashboard page for editing approved design-system interaction presets.
- The editable source remains `docs/design-system/dashboard-control-center/components.json`.
- Generated runtime artifacts are `dashboard-control-center/src/design-system.generated.css` and `dashboard-control-center/src/design-system.generated.js`.
- `tools/dashboard-design-system plan-interaction` produces a structured preview without writing files.
- `tools/dashboard-design-system apply-interaction` writes the component source and regenerates the runtime files.
- Vite exposes same-origin JSON-only plan/apply endpoints with whitelisted payload values and one-time plan-token enforcement for apply.
- The Dashboard UI route is `#design-studio`.
- Tooltip and copy-popup behavior is intentionally hover-only, pointer-leave based, top-positioned for copy controls, duration-backed, and shift-protected against horizontal overflow.

Next safe action:

- No remaining focused local implementation or verification work is known for `dashboard_control_center_design_studio`.
- If a Vite JSX parse overlay appears around an arrow marker, confirm that the diff text uses `{" -> "}` rather than a raw `->` inside JSX text.
- Treat release-gate, PR CI, merge, main CI, local/remote sync, and cleanup as separate approval-bound phases.

Stop and ask before:

- Broadening Design Studio beyond whitelisted presets, allowing arbitrary CSS editing, changing Settings mutation authority, changing command execution authority, changing Git/CI execution semantics, merge, push, main CI waiting, cleanup execution, product repository deletion, dependency changes, CI/pre-commit/final-gate behavior, credentials, external-service authority, or any existing-feature tradeoff.

Recovery notes:

- If generated files drift, update `components.json` or the generator, regenerate, and rerun `tools/check_dashboard_design_system.sh`.
- If plan/apply accepts unsupported values, tighten the Vite middleware whitelist and rerun Dashboard focused tests.
- If apply succeeds without a matching current plan token, repair Vite middleware before continuing.
- If copy popups appear below the pointer or native title behavior returns, restore the `data-copy-tooltip` generated CSS contract.
- If copy popup duration or shift collision settings do not change generated runtime CSS, repair `tools/dashboard-design-system` and regenerate.
- If pointer leave does not hide a tooltip, repair generated hover-only CSS instead of adding page-local exceptions.
- If sync checks fail, make `SYNC-ID`, `STATUS`, `ARTIFACTS`, and `TESTS` match exactly across the contract and five synchronized documents.

Current verification state:

- `tools/check_dashboard_design_system.sh`: passed.
- `tools/test_dashboard_i18n.sh`: passed.
- `tools/test_dashboard_control_center.sh`: passed.
- `tools/check_developer_memory_requirements.sh`: passed.
- `tools/check_test_plan_coverage.sh`: passed.
- `tools/test_test_plan.sh`: passed.
- `tools/check_as_built_sync_contract.sh`: passed.
- `tools/check_as_built_docs.sh`: passed.
- `tools/check_workflow_pair_sync.sh`: passed.
- `tools/check_repository_development_workflow.sh`: passed.
- `tools/test_repository_development_workflow.sh`: passed.
- `git diff --check`: passed.

## Dashboard Design Studio Orchestration Foundation Handoff

SYNC-ID: dashboard_design_studio_orchestration_foundation
STATUS: implemented
ARTIFACTS: .github/workflows/ci.yml,.github/workflows/lesson14-ci.yml,docs/design-system/dashboard-control-center/DESIGN_SYSTEM.md,docs/design-system/dashboard-control-center/tokens.json,docs/design-system/dashboard-control-center/components.json,docs/design-system/dashboard-control-center/orchestration.json,dashboard-control-center/src/design-system.generated.css,dashboard-control-center/src/design-system.generated.js,dashboard-control-center/src/App.jsx,dashboard-control-center/src/i18n.js,dashboard-control-center/src/styles.css,tests/playwright/dashboard-control-center.spec.js,tools/dashboard-design-system,tools/check_dashboard_design_system.sh,tools/check_ci_workflow_structure.sh,docs/workflow/AS_BUILT_SYNC_CONTRACT.tsv,docs/as-built/REQUIREMENTS.md,docs/as-built/SPECIFICATION.md,docs/as-built/IMPLEMENTATION_PLAN.md,docs/workflow/TASK_TRACKER.md,docs/workflow/HANDOFF.md
TESTS: tools/check_ci_workflow_structure.sh,tools/check_dashboard_design_system.sh,tools/test_dashboard_i18n.sh,tools/test_dashboard_control_center.sh,tools/check_as_built_sync_contract.sh,tools/check_as_built_docs.sh,tools/check_workflow_pair_sync.sh,tools/check_repository_development_workflow.sh,tools/test_repository_development_workflow.sh

Restart context:

- `$repository-development-workflow` is the active protocol for this repository change.
- This sync ID is implemented as the Dashboard Design Studio orchestration foundation.
- Runtime implementation under this sync ID added source contracts, generator validation, generated runtime exposure, localized Dashboard UI, focused browser coverage, and CI structure wiring for the standalone design-system check.
- The required model is `Design Intent / Mock / Template -> Candidate Envelope -> AI or Manual Proposal -> Preview / Diff -> Plan Token -> Explicit Approval -> Apply through owner tool -> Verification -> Rollback-ready Evidence`.
- The architecture is represented in `docs/design-system/dashboard-control-center/orchestration.json` as `UI -> Request / Proposal Store -> Event Runner -> Target Adapter`.
- Existing guarded Design Studio plan/apply behavior remains authoritative and must not be weakened.
- Mock images, OCR, image analysis, imagegen output, natural-language requests, template text, external documents, and AI output are candidate data, not source of truth.
- AI agent connection is modeled for manual, subscription-agent, and API-key modes through one proposal schema. AI remains proposal-only and has no direct apply authority.
- API-key mode is secret-reference-only in the source contract. Raw API keys must not reach browser data, logs, commits, fixtures, or prompts.
- External product targets are readiness, preview, and plan-only until a separate product-local mutation contract is approved.
- The current worktree already contains unrelated or earlier uncommitted changes. During future work, inventory the dirty worktree and avoid reverting or silently absorbing user/previous changes.

Next safe action:

- Use the implemented foundation as the starting point for future Design Studio event-runner, provider, mock, template, and external product readiness work.
- Do not implement API provider calls, raw-secret handling, external product writes, Git/CI/merge/sync automation, or destructive cleanup without a new approved sync ID and explicit developer approval.

- Verification already run:

```bash
./tools/check_ci_workflow_structure.sh
./tools/check_dashboard_design_system.sh
./tools/test_dashboard_i18n.sh
./tools/test_dashboard_control_center.sh
./tools/check_repository_development_workflow.sh
./tools/test_repository_development_workflow.sh
./tools/check_as_built_sync_contract.sh
./tools/check_as_built_docs.sh
./tools/check_workflow_pair_sync.sh
git diff --check
```

Stop and ask before:

- API-key provider calls, external product writes, dependency changes, CI/hook/final-gate changes, Settings authority changes, command execution authority changes, Git/CI/merge/sync behavior changes, credential handling, destructive cleanup, push, merge, main CI waiting, local/remote sync, or any existing-feature tradeoff.

Recovery notes:

- If sync checks fail, make `SYNC-ID`, `STATUS`, `ARTIFACTS`, and `TESTS` match exactly across the contract and five synchronized documents.
- If schema checks fail, repair `orchestration.json` and generator validation before changing UI labels or runtime behavior.
- If generated design-system files drift, repair `tokens.json`, `components.json`, or the generator and rerun `tools/check_dashboard_design_system.sh` before modifying React code.
- If stale plans, concurrent apply, token replay, target mismatch, or dirty target state are accepted, stop and repair transaction guards before continuing.
- If API-key values appear in files, fixtures, logs, prompt payloads, test output, or browser data, stop and replace them with secret references plus redacted evidence.
- If mock images, OCR, image text, or AI output are treated as trusted instructions, move them into `CandidateEnvelope` records and add prompt-injection negative tests.
- If external product apply is needed, stop for a separate product-local mutation contract and developer approval.

Current verification state:

- `tools/check_ci_workflow_structure.sh`: passed.
- `tools/check_dashboard_design_system.sh`: passed.
- `tools/test_dashboard_i18n.sh`: passed.
- `tools/test_dashboard_control_center.sh`: passed.
- `tools/check_repository_development_workflow.sh`: passed.
- `tools/test_repository_development_workflow.sh`: passed.
- `tools/check_as_built_sync_contract.sh`: passed.
- `tools/check_as_built_docs.sh`: passed.
- `tools/check_workflow_pair_sync.sh`: passed.
- `git diff --check`: passed.
## Planned External Product AGENTS And Operation Mode Control Handoff

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
## Implemented External Product Repository Registry Handoff

SYNC-ID: external_product_repository_registry
STATUS: implemented
ARTIFACTS: docs/workflow/AS_BUILT_SYNC_CONTRACT.tsv,docs/workflow/DASHBOARD_DATA_SCHEMA.tsv,docs/workflow/PRODUCT_REPOSITORY_REGISTRY_SCHEMA.tsv,docs/workflow/PRODUCT_GATE_EVIDENCE_SCHEMA.tsv,docs/workflow/PRODUCT_WORKFLOW_GIT_USAGE_POLICY.tsv,docs/workflow/PRODUCT_REPOSITORY_STRUCTURE.tsv,learning/PRODUCT_WORKFLOW_GIT_USAGE_SETTINGS.tsv,learning/context/WORKFLOW_CONTEXT_MAP.tsv,learning/PRODUCT_REPOSITORY_REGISTRY.tsv,learning/PRODUCT_REPOSITORY_SELECTION.tsv,tools/lib/lesson_common.sh,tools/lib/product_workflow_git_usage.sh,tools/lib/product_repository_registry.sh,tools/lib/product_repository_authority.sh,tools/lib/dashboard_data.sh,tools/dashboard-data,tools/free-development,tools/product-improvement,tools/external-integration,tools/menu,tools/product-repository-registry,tools/product-gate-evidence-bootstrap,dashboard-control-center/src/App.jsx,dashboard-control-center/src/dashboardData.js,dashboard-control-center/src/i18n.js,dashboard-control-center/src/styles.css,tests/fixtures/dashboard-control-center.json,tests/fixtures/dashboard-control-center-live-update.json,tests/playwright/dashboard-control-center.spec.js,tools/test_dashboard_schema.sh,tools/test_dashboard_data.sh,tools/test_dashboard_control_center.sh,tools/test_product_git_usage_modes.sh,tools/test_product_repository_authority.sh,tools/test_product_scaffold_check.sh,tools/test_product_gate_tools.sh,tools/test_menu_prerequisites.sh,docs/as-built/REQUIREMENTS.md,docs/as-built/SPECIFICATION.md,docs/as-built/IMPLEMENTATION_PLAN.md,docs/workflow/TASK_TRACKER.md,docs/workflow/HANDOFF.md
TESTS: tools/test_dashboard_schema.sh,tools/test_dashboard_data.sh,tools/test_dashboard_control_center.sh,tools/test_product_git_usage_modes.sh,tools/test_product_repository_authority.sh,tools/test_product_scaffold_check.sh,tools/test_product_gate_tools.sh,tools/test_menu_prerequisites.sh,tools/check_as_built_sync_contract.sh,tools/check_as_built_docs.sh,tools/check_workflow_pair_sync.sh,tools/check_repository_development_workflow.sh,tools/test_repository_development_workflow.sh

Current State:

- The implemented sync defines and ships the parent-side registry and selection contract for multiple external product repositories.
- The lesson repository now has read-only parent-side registry state and resolver helpers for multiple external product repositories.
- The current temporary free-development verification targets are:
  - `frame-cue`: `/home/masahiro/projects/agent-toolbox/frame-cue`
  - `trace-cue`: `/home/masahiro/projects/agent-toolbox/trace-cue`
- `tools/product-repository-registry status|list|selected|verify` exists; `verify --context free-development --all` reports both temporary free-development repositories.
- Dashboard data selection has focused coverage proving selected `browser-debug-cli` stays selected and does not leak `frame-cue` or `task-tracker-repository`.
- Dashboard Control Center Playwright coverage now checks selected `browser-debug-cli` across overview, Repository Info, Documents, Update History, four overview cards, and live evidence detail rows.
- The four overview cards carry evidence `source_id/current_item_id` attributes and live evidence rows carry matching evidence attributes for detail-page consistency checks.
- Playwright screenshot review passed for Dashboard, Development Workflow, and Safety Actions on desktop and mobile after fixing menu-tile text clipping.
- Evidence taxonomy v1 now has concrete contract slices for structure, Git, CI, and Security: `structure-status` records `product.structure.files/settings/scripts`, `git-status` records sync/push/PR/merge rows, `ci-status` records local CI manifest/provider readiness without GitHub calls, and `security-status` records secrets, local artifacts, external-sending approval, and aggregate blockers without storing secret values.
- Focused no-target registry fixtures now prove Product Improvement and External Integration remain `not_selected` without explicit registry selection, and Free Development remains `not_selected` when no eligible Free Development repository exists.
- Guarded `tools/product-repository-registry register` and `select` mutation now exists with `--confirm`, external path validation, safe ID/context/product-type validation, duplicate replacement protection, and context-compatible selection checks.
- Concrete product-local test evidence fixtures now cover `product.tests.unit`, `product.tests.smoke`, and `product.tests.e2e` through `manifest-tests` and parent-side authority detail-manifest readback.
- Dashboard data now publishes `repository_selection` for repo-backed menus, including current repository identity, eligible candidates, disabled reasons, and display-only guarded selection commands.
- Dashboard Control Center now renders a read-only repository selection panel. It previews guarded CLI commands but does not execute repository writes from the browser.
- `external_product_repository_registry` is implemented for parent-side registry state, guarded register/select mutation, read-only Dashboard selection UX, and focused evidence fixtures.
- The immediate implementation risk is old single-repository fallback or stale evidence display being treated as current readiness.
- The current worktree is already dirty from prior Dashboard and product workflow work; do not revert unrelated edits.

Next Step:

- Resume with `AGENTS.MD` and `skills/repository-development-workflow/SKILL.md`.
- Future runtime implementation should continue only separately approved scopes, especially real PR/main CI run collectors if they become necessary.
- Preserve the current rule that `ready` means the Dashboard can read the repository, while `stale` means the evidence exists but is not current for the product HEAD or freshness window.
- Use the currently configured `frame-cue` and `trace-cue` repositories only as replaceable verification targets; historical Browser Debug CLI coverage remains test evidence, not a permanent registry requirement.
- Before broader tests, run focused checks for the changed owner layer: registry verify, dashboard-data selected repository, design-system drift if UI/CSS changes, and targeted Playwright visual checks when dashboard layout changes.

Recovery notes:

- If sync metadata fails, make `SYNC-ID`, `STATUS`, `ARTIFACTS`, and `TESTS` match exactly across the contract and five synchronized documents.
- If runtime implementation later mixes menu and repository selection again, stop and restore the `menu_id + repo_id` selection invariant before adding more labels.
- If one eligible repository cannot be selected without losing another, repair the registry model rather than special-casing either repository.
- If Product Improvement or External Integration becomes selectable without an eligible selected target, treat it as a blocker for this sync.
- If a Dashboard card shows only a broad category such as Git sync, CI evidence, product evidence, or safety confirmation, revise the producer first so users can judge the current operational state.
- If repository selection commands become clickable browser actions, restore the read-only boundary and keep switching behind guarded CLI mutation unless a separate approved security design changes that boundary.

Stop and ask before:

- Push, PR creation, merge, main CI waiting, local/remote sync, product repository deletion, cleanup, remote creation, OAuth, dependency installation, external-service calls, credentials, Git/CI authority changes, external product writes, or any existing-feature tradeoff.

## Implemented Product CI Run Evidence Collector Handoff

SYNC-ID: product_ci_run_evidence_collector
STATUS: implemented
ARTIFACTS: docs/workflow/AS_BUILT_SYNC_CONTRACT.tsv,docs/workflow/PRODUCT_GATE_EVIDENCE_SCHEMA.tsv,docs/workflow/TEST_PLAN_MANIFEST.tsv,tools/product-gate-evidence-bootstrap,tools/test_product_gate_tools.sh,docs/as-built/REQUIREMENTS.md,docs/as-built/SPECIFICATION.md,docs/as-built/IMPLEMENTATION_PLAN.md,docs/workflow/TASK_TRACKER.md,docs/workflow/HANDOFF.md
TESTS: tools/test_product_gate_tools.sh,tools/test_product_scaffold_check.sh,tools/test_product_repository_authority.sh,tools/check_as_built_sync_contract.sh,tools/check_as_built_docs.sh,tools/check_workflow_pair_sync.sh,tools/check_test_plan_coverage.sh,tools/test_test_plan.sh

Current State:

- Product-local evidence tooling installed by `tools/product-gate-evidence-bootstrap` now includes `tools/product-gate-evidence ci-runs`.
- `ci-runs` is the only new GitHub-observing path in this sync. It is explicit, product-local, and records evidence under `.git/product-gate-evidence/`.
- `ci-status` remains local-only and validates CI manifests/workflow files without calling GitHub.
- Main CI evidence is written to `product.ci.main` only when the GitHub Actions run is completed, successful, and matched to the current product HEAD.
- PR CI evidence is written to `product.ci.pr` only when a PR reference is supplied. Without `--pr`, PR CI remains `not_run` and `manual_required`.
- Provider visibility is written to `product.ci.github_actions`; unavailable `gh`, auth, repo access, `node`, or JSON parsing blocks provider evidence instead of creating pass evidence.
- `tools/test_product_gate_tools.sh` now proves generated product-local tooling can collect fake structured main and PR CI JSON and that parent-side authority reads the resulting CI detail metadata.

Next Step:

- Run the remaining focused and workflow checks listed in TESTS, then move through `repository-development-workflow` fast_loop and mid_tests if they remain clean.
- Playwright visual review is not required for this sync because no Dashboard UI, CSS, or layout files changed.

Recovery notes:

- If `product.ci.main` or `product.ci.pr` records pass evidence without a current product HEAD match, fix the collector before changing authority or Dashboard code.
- If `tools/dashboard-data` starts calling `gh` or creating evidence, restore the read-only boundary and keep CI run collection in the explicit product-local command.
- If fake `gh` fixtures pass but real `gh` output changes, adjust structured JSON parsing while keeping failure closed as `blocked` or `manual_required`.

Stop and ask before:

- Browser-triggered CI collection, background polling, push, PR creation, merge, main CI waiting, local/remote sync, product repository cleanup/deletion, credential storage, OAuth, external product source writes, or any existing-feature tradeoff.

## Implemented CI Final Gate Gap-Only Safety Handoff

SYNC-ID: ci_final_gate_gap_only_safety
STATUS: implemented
ARTIFACTS: docs/workflow/AS_BUILT_SYNC_CONTRACT.tsv,docs/workflow/FINAL_GATE_COVERAGE.tsv,docs/workflow/FINAL_GATE_GAP_COMMANDS.tsv,tools/ci-final-gate,tools/test_ci_final_gate.sh,docs/as-built/REQUIREMENTS.md,docs/as-built/SPECIFICATION.md,docs/as-built/IMPLEMENTATION_PLAN.md,docs/workflow/TASK_TRACKER.md,docs/workflow/HANDOFF.md
TESTS: tools/test_ci_final_gate.sh,tools/check_ci_workflow_structure.sh,tools/check_as_built_sync_contract.sh,tools/check_as_built_docs.sh,tools/check_workflow_pair_sync.sh

Current State:

- `tools/ci-final-gate --gap-only` now validates aggregate coverage before running final-gap commands.
- Missing aggregate coverage now fails in gap-only mode with the same fail-closed error used by the default final gate.
- Valid gap-only mode reports `CI final gate gap-only coverage and commands passed.` after validation and gap command execution.
- The default final-gate path still validates coverage, then uses same-run Git hook evidence or the existing aggregate fallback.
- `tools/as-built-sync status` now caches repeated active-command and Git hook runner lookups; status output and pass/fail semantics remain unchanged.
- No Dashboard UI, Playwright layout, product repository, required CI name, full/no-cache, or final-gap command behavior changed in this sync.
- Local focused, fast-loop, mid-test, aggregate, full/no-cache Git hooks, and pre-commit verification passed after the cache follow-up.

Next Step:

- After this safety slice is clean, continue remaining approved implementation slices as separate sync IDs rather than folding broad roadmap work into this gate change.

Recovery notes:

- If `--gap-only` accepts an uncovered aggregate requirement, restore the coverage validation call before investigating other final-gate behavior.
- If valid gap-only fixtures fail because coverage parsing is too strict, repair coverage parsing or the fixture while preserving aggregate coverage proof.
- If a proposed fix reduces full/no-cache scope, hides a final-gate failure, removes an existing standalone command, or changes required CI names, reject that fix as an existing-feature tradeoff.

Stop and ask before:

- Required CI name changes, branch-protection context changes, full/no-cache reduction, changed-only authoritative CI, persistent verification-result caching, Dashboard action execution, product repository writes, push, PR creation, merge, cleanup, credentials, OAuth, or any existing-feature tradeoff.
## Implemented Product Authority Evidence Detail Contract Handoff

Sync ID: `product_authority_evidence_detail_contract`.
Current status: `implemented`.

The Dashboard product authority evidence detail contract is now implemented.
`DASHBOARD_DATA_SCHEMA.tsv` marks the detail fields as implemented, including context, requirement flag, observation time, max age, sanitized product root, product head, artifacts, blockers, command preview, detail references, summary, reason, next action, and risk level.
`dashboardData.js` validates these fields before the Control Center accepts a snapshot.

Resume notes:

- This slice is validation and contract hardening only; it does not change evidence collection, product repository mutation, browser command execution, or Dashboard route behavior.
- Focused verification already targets `tools/test_product_repository_authority.sh`, `tools/test_dashboard_schema.sh`, and `tools/test_dashboard_data.sh`.
- If future product evidence fields are added, update the producer, Dashboard schema, runtime validator, fixtures, and focused tests together.

SYNC-ID: product_authority_evidence_detail_contract
STATUS: implemented
ARTIFACTS: docs/workflow/AS_BUILT_SYNC_CONTRACT.tsv,docs/workflow/DASHBOARD_DATA_SCHEMA.tsv,tools/lib/product_repository_authority.sh,tools/product-repository-authority,dashboard-control-center/src/dashboardData.js,tests/fixtures/dashboard-control-center.json,tests/fixtures/dashboard-control-center-live-update.json,tools/test_product_repository_authority.sh,tools/test_dashboard_schema.sh,tools/test_dashboard_data.sh,docs/as-built/REQUIREMENTS.md,docs/as-built/SPECIFICATION.md,docs/as-built/IMPLEMENTATION_PLAN.md,docs/workflow/TASK_TRACKER.md,docs/workflow/HANDOFF.md
TESTS: tools/test_product_repository_authority.sh,tools/test_dashboard_schema.sh,tools/test_dashboard_data.sh,tools/check_as_built_sync_contract.sh,tools/check_as_built_docs.sh,tools/check_workflow_pair_sync.sh

## Implemented Dashboard Browser Debug Manifest Boundary Handoff

Sync ID: `dashboard_browser_debug_manifest`.
Current status: `implemented`.

`tools/dashboard-browser-debug-manifest` now generates a Browser Debug CLI target manifest owned by ai-driven-development-lesson.
It keeps Dashboard Control Center workflow/Git/CI/blocker/repository-selection/next-safe-action meaning in lesson-side bounded `sourceData`, user questions, review brief, and rubric instead of requiring Browser Debug CLI runtime branches.

Resume notes:

- Use `./tools/dashboard-browser-debug-manifest --base-url <url>` to print the manifest, or `--output <path>` to write it.
- The focused contract check is `./tools/test_dashboard_browser_debug_manifest.sh`.
- This is a manifest boundary only; it does not start Vite, run Playwright, mutate repositories, or send evidence outside the local process.

SYNC-ID: dashboard_browser_debug_manifest
STATUS: implemented
ARTIFACTS: docs/workflow/AS_BUILT_SYNC_CONTRACT.tsv,docs/workflow/TEST_PLAN_MANIFEST.tsv,docs/workflow/GIT_HOOK_CHECKS.tsv,docs/workflow/GIT_HOOK_PARALLEL_GROUPS.tsv,docs/workflow/FINAL_GATE_COVERAGE.tsv,tools/dashboard-browser-debug-manifest,tools/test_dashboard_browser_debug_manifest.sh,tools/test_lesson_repository.sh,docs/as-built/REQUIREMENTS.md,docs/as-built/SPECIFICATION.md,docs/as-built/IMPLEMENTATION_PLAN.md,docs/workflow/TASK_TRACKER.md,docs/workflow/HANDOFF.md
TESTS: tools/test_dashboard_browser_debug_manifest.sh,tools/check_test_plan_coverage.sh,tools/test_test_plan.sh,tools/test_git_hooks.sh,tools/test_git_hooks_parallel.sh,tools/test_ci_final_gate.sh,tools/check_as_built_sync_contract.sh,tools/check_as_built_docs.sh,tools/check_workflow_pair_sync.sh

## Implemented Dashboard Browser Debug Agent Handoff

Sync ID: `dashboard_browser_debug_agent_handoff`.
Current status: `implemented`.

Dashboard Control Center now exposes a read-only Browser Debug agent handoff panel in Maintenance Sync.
`tools/dashboard-data` emits `browser_debug` with the selected Browser Debug CLI repository state, target manifest state, review artifact state, agent package state, ingest result state, report state, and explicit false boundary flags for browser execution, upload, provider API calls, credential storage, and product repository mutation.

Resume notes:

- This is a lesson-repository Dashboard integration only. It does not change Browser Debug CLI core behavior.
- The Dashboard panel is status display and command preview only; it does not run Browser Debug CLI or model/provider APIs.
- If future work adds execution, upload, profile reuse, provider dispatch, or external product mutation, create a separate sync ID and keep this boundary intact.
- Focused checks are `./tools/test_dashboard_schema.sh`, `./tools/test_dashboard_data.sh`, `./tools/test_dashboard_i18n.sh`, and `./tools/test_dashboard_control_center.sh`.

SYNC-ID: dashboard_browser_debug_agent_handoff
STATUS: implemented
ARTIFACTS: docs/workflow/AS_BUILT_SYNC_CONTRACT.tsv,docs/workflow/DASHBOARD_DATA_SCHEMA.tsv,tools/dashboard-data,dashboard-control-center/src/dashboardData.js,dashboard-control-center/src/App.jsx,dashboard-control-center/src/i18n.js,tests/playwright/dashboard-control-center.spec.js,tools/test_dashboard_schema.sh,tools/test_dashboard_data.sh,docs/as-built/REQUIREMENTS.md,docs/as-built/SPECIFICATION.md,docs/as-built/IMPLEMENTATION_PLAN.md,docs/workflow/TASK_TRACKER.md,docs/workflow/HANDOFF.md
TESTS: tools/test_dashboard_schema.sh,tools/test_dashboard_data.sh,tools/test_dashboard_i18n.sh,tools/test_dashboard_control_center.sh,tools/check_as_built_sync_contract.sh,tools/check_as_built_docs.sh,tools/check_workflow_pair_sync.sh,tools/check_repository_development_workflow.sh,tools/test_repository_development_workflow.sh

## Implemented Dashboard Design Studio Event Runner And Request Store Handoff

SYNC-ID: dashboard_design_studio_event_runner_store
STATUS: implemented
ARTIFACTS: .gitignore,.github/workflows/ci.yml,.github/workflows/lesson14-ci.yml,docs/workflow/AS_BUILT_SYNC_CONTRACT.tsv,docs/workflow/TEST_PLAN_MANIFEST.tsv,docs/workflow/GIT_HOOK_CHECKS.tsv,docs/workflow/GIT_HOOK_PARALLEL_GROUPS.tsv,docs/workflow/FINAL_GATE_COVERAGE.tsv,tools/dashboard-design-system,tools/test_dashboard_design_studio_events.sh,tools/test_lesson_repository.sh,tools/check_ci_workflow_structure.sh,docs/as-built/REQUIREMENTS.md,docs/as-built/SPECIFICATION.md,docs/as-built/IMPLEMENTATION_PLAN.md,docs/workflow/TASK_TRACKER.md,docs/workflow/HANDOFF.md
TESTS: tools/test_dashboard_design_studio_events.sh,tools/check_dashboard_design_system.sh,tools/check_ci_workflow_structure.sh,tools/check_test_plan_coverage.sh,tools/test_test_plan.sh,tools/test_git_hooks.sh,tools/test_git_hooks_parallel.sh,tools/test_ci_final_gate.sh,tools/check_as_built_sync_contract.sh,tools/check_as_built_docs.sh,tools/check_workflow_pair_sync.sh

Restart context:

- `$repository-development-workflow` remains the active protocol for this repository change.
- `tools/dashboard-design-system` now owns a local Design Studio event runner/request-store surface: `queue-request`, `list-events`, `event-status`, `cancel-event`, `dead-letter-event`, and `retry-event`.
- The default runtime store is `.dashboard-design-studio-events/events.jsonl`, which is ignored. Tests use `DASHBOARD_DESIGN_STUDIO_EVENT_STORE_DIR` so no repository runtime state is left behind.
- Event records are append-only JSONL metadata. They include IDs, idempotency, target/provider state, lifecycle state, base snapshot hash, retry count, event order, timestamps, and audit receipt.
- Raw `intent_text` is not persisted. Secret-like payloads are rejected before writing.
- Manual and subscription-agent modes are proposal/import boundaries only. API-key mode is blocked.
- Dashboard Control Center events remain owner-tool mediated and do not gain direct apply authority. External product events remain plan-only/manual-required.
- The focused regression is `./tools/test_dashboard_design_studio_events.sh`; it is also wired into aggregate tests, Git hooks, final-gate coverage, test-plan policy, CI workflows, and CI structure checks.

Next safe action:

- Continue future Design Studio work as separate sync IDs. Template persistence, mock library operations, imagegen calls, provider dispatch, and external product design-system adapters must stay behind their own contracts.
- Playwright visual review is not required for this sync because no Dashboard UI, CSS, or layout files changed.

Stop and ask before:

- Provider API dispatch, subscription-agent background execution, raw-secret handling, OAuth, imagegen calls, mock image mutation, external product writes, arbitrary shell execution, browser command execution, dependency changes, Git push, PR creation, merge, main CI waiting, cleanup/delete, or any existing-feature tradeoff.

## Dashboard Control Center Operational Decision Evidence Handoff

SYNC-ID: dashboard_control_center_operational_decision_evidence
STATUS: implemented
ARTIFACTS: docs/workflow/AS_BUILT_SYNC_CONTRACT.tsv,docs/workflow/DASHBOARD_DATA_SCHEMA.tsv,tools/lib/dashboard_data.sh,tools/dashboard-data,dashboard-control-center/src/dashboardData.js,dashboard-control-center/src/App.jsx,tools/test_dashboard_schema.sh,tools/test_dashboard_data.sh,tools/test_dashboard_control_center.sh,docs/as-built/REQUIREMENTS.md,docs/as-built/SPECIFICATION.md,docs/as-built/IMPLEMENTATION_PLAN.md,docs/workflow/TASK_TRACKER.md,docs/workflow/HANDOFF.md
TESTS: tools/test_dashboard_schema.sh,tools/test_dashboard_data.sh,tools/test_dashboard_control_center.sh,tools/check_as_built_sync_contract.sh,tools/check_as_built_docs.sh,tools/check_workflow_pair_sync.sh,tools/check_repository_development_workflow.sh,tools/test_repository_development_workflow.sh

Restart context:

- `repository-development-workflow` remains the active protocol for this repository change.
- The implemented direction is owner-layer-first: `tools/dashboard-data` emits operational decisions, and Dashboard pages render them without UI-side readiness inference.
- The six-part page contract is scope, current judgment, top reason, evidence confidence, next safe action, and technical drilldown.
- The implementation stayed additive: no product authority semantics, design-system tokens/components, dependencies, Git/CI execution, or product repositories were changed.

Next safe action:

- Run document sync and repository-development workflow checks before release-gate escalation.
- Preserve the read-only Dashboard boundary. Command previews remain copy/reference surfaces only.

Recovery notes:

- If a Dashboard page computes readiness from text, labels, route names, or local UI state, move the decision back to the owner layer.
- If stale runner records, policy readiness, or advisory CI lookup appear as proof, restore freshness and authority fields before UI work.
- If legacy snapshots fail to render, keep current producer checks strict while allowing absent optional decision sections in the browser validator.
- If visual changes later require new primitives, update the design-system source and generated runtime output together.

Stop and ask before:

- Push, PR creation, merge, main CI waiting, local/remote sync, cleanup/delete, credentials, OAuth, dependency changes, browser command execution authority, external product writes, or any existing-feature tradeoff.

## Implemented Product Authority Evidence Source Completion Handoff

SYNC-ID: product_authority_evidence_source_completion
STATUS: implemented
ARTIFACTS: docs/workflow/AS_BUILT_SYNC_CONTRACT.tsv,docs/workflow/DASHBOARD_DATA_SCHEMA.tsv,docs/workflow/PRODUCT_GATE_EVIDENCE_SCHEMA.tsv,tools/lib/product_repository_authority.sh,tools/product-repository-authority,tools/product-gate-evidence-bootstrap,tools/test_product_repository_authority.sh,tools/test_dashboard_schema.sh,tools/test_dashboard_data.sh,docs/as-built/REQUIREMENTS.md,docs/as-built/SPECIFICATION.md,docs/as-built/IMPLEMENTATION_PLAN.md,docs/workflow/TASK_TRACKER.md,docs/workflow/HANDOFF.md
TESTS: tools/test_product_repository_authority.sh,tools/test_dashboard_schema.sh,tools/test_dashboard_data.sh,tools/check_as_built_sync_contract.sh,tools/check_as_built_docs.sh,tools/check_workflow_pair_sync.sh,tools/check_repository_development_workflow.sh,tools/test_repository_development_workflow.sh

Restart context:

- This P0 follow-up is implemented for the Control Center decision-quality review.
- Dashboard data now consumes source-owned product authority status, freshness, authority, product HEAD, blocker, risk, artifact, and next-action fields instead of inferring them in React.
- Workflow evidence events and CI evidence roles must continue to inherit source-owned evidence fields.
- No new secret-like fixture literals were added during this slice.

Next Step:

- No remaining action for this sync ID.

Stop and ask before external service calls, credentials, external product writes, push, PR creation, merge, cleanup, dependency changes, or any existing-feature tradeoff.

## Implemented Dashboard Control Center Decision Projection Handoff

SYNC-ID: dashboard_control_center_decision_projection
STATUS: implemented
ARTIFACTS: docs/workflow/AS_BUILT_SYNC_CONTRACT.tsv,docs/workflow/DASHBOARD_DATA_SCHEMA.tsv,tools/lib/dashboard_data.sh,tools/dashboard-data,dashboard-control-center/src/dashboardData.js,tests/fixtures/dashboard-control-center.json,tests/fixtures/dashboard-control-center-live-update.json,tools/test_dashboard_schema.sh,tools/test_dashboard_data.sh,docs/as-built/REQUIREMENTS.md,docs/as-built/SPECIFICATION.md,docs/as-built/IMPLEMENTATION_PLAN.md,docs/workflow/TASK_TRACKER.md,docs/workflow/HANDOFF.md
TESTS: tools/test_dashboard_schema.sh,tools/test_dashboard_data.sh,tools/check_as_built_sync_contract.sh,tools/check_as_built_docs.sh,tools/check_workflow_pair_sync.sh,tools/check_repository_development_workflow.sh,tools/test_repository_development_workflow.sh

Restart context:

- This P0 slice makes `tools/dashboard-data` the authority for the Control Center decision model.
- Product authority, repository-development phase, Git/worktree state, repository changes, workflow evidence, tests, and CI are projected into producer-owned decision fields.
- Live/advisory data stays separate from stored authoritative evidence; live CI network lookup remains opt-in.
- React remains a renderer and must not compute readiness from labels or route names.

Next Step:

- No remaining action for this sync ID.

Stop and ask before GitHub polling, browser-triggered evidence collection, repository mutation, approval writes, push, PR creation, merge, cleanup, credentials, or any existing-feature tradeoff.

## Implemented Dashboard Control Center Decision Page Rendering Handoff

SYNC-ID: dashboard_control_center_decision_page_rendering
STATUS: implemented
ARTIFACTS: docs/workflow/AS_BUILT_SYNC_CONTRACT.tsv,docs/workflow/DASHBOARD_DATA_SCHEMA.tsv,dashboard-control-center/src/App.jsx,dashboard-control-center/src/DecisionSummary.jsx,dashboard-control-center/src/dashboardData.js,dashboard-control-center/src/i18n.js,tests/fixtures/dashboard-control-center.json,tests/fixtures/dashboard-control-center-live-update.json,tests/playwright/dashboard-control-center.spec.js,tools/test_dashboard_schema.sh,tools/test_dashboard_data.sh,tools/test_dashboard_i18n.sh,tools/test_dashboard_control_center.sh,docs/as-built/REQUIREMENTS.md,docs/as-built/SPECIFICATION.md,docs/as-built/IMPLEMENTATION_PLAN.md,docs/workflow/TASK_TRACKER.md,docs/workflow/HANDOFF.md
TESTS: tools/test_dashboard_schema.sh,tools/test_dashboard_data.sh,tools/test_dashboard_i18n.sh,tools/test_dashboard_control_center.sh,tools/check_as_built_sync_contract.sh,tools/check_as_built_docs.sh,tools/check_workflow_pair_sync.sh,tools/check_repository_development_workflow.sh,tools/test_repository_development_workflow.sh

Restart context:

- This P1 slice renders the producer-owned decision model across primary Control Center pages.
- The target user split is non-engineer overview clarity plus junior/intermediate engineer evidence drilldown.
- `DecisionSummary.jsx` owns the reusable summary renderer for producer decision pages and static detail summaries.
- Command previews remain display-only, and source identity/detail targets are visible without exposing raw execution-mode internals.

Next Step:

- No remaining action for this sync ID.

Stop and ask before command execution authority, Git/CI operations, repository writes, credentials, dependency changes, cleanup, or any existing-feature tradeoff.

## Implemented Dashboard Control Center Density And Mobile CSS Refinement Handoff

SYNC-ID: dashboard_control_center_density_mobile_css_refinement
STATUS: implemented
ARTIFACTS: docs/workflow/AS_BUILT_SYNC_CONTRACT.tsv,docs/design-system/dashboard-control-center/DESIGN_SYSTEM.md,docs/design-system/dashboard-control-center/tokens.json,docs/design-system/dashboard-control-center/components.json,dashboard-control-center/src/design-system.generated.css,dashboard-control-center/src/design-system.generated.js,dashboard-control-center/src/App.jsx,dashboard-control-center/src/styles.css,tests/playwright/dashboard-control-center.spec.js,tools/check_dashboard_design_system.sh,tools/test_dashboard_control_center.sh,docs/as-built/REQUIREMENTS.md,docs/as-built/SPECIFICATION.md,docs/as-built/IMPLEMENTATION_PLAN.md,docs/workflow/TASK_TRACKER.md,docs/workflow/HANDOFF.md
TESTS: tools/check_dashboard_design_system.sh,tools/test_dashboard_control_center.sh,tools/check_as_built_sync_contract.sh,tools/check_as_built_docs.sh,tools/check_workflow_pair_sync.sh,tools/check_repository_development_workflow.sh,tools/test_repository_development_workflow.sh

Restart context:

- This conditional P1 slice found no required runtime CSS or design-system change after decision rendering and Playwright verification.
- Shared visual changes belong in the Dashboard design-system source and generated runtime path.
- `styles.css` is limited to page-specific layout, responsive wrapping, and overflow prevention.
- Generated design-system files are artifacts, not hand-edited source.

Next Step:

- No remaining action for this sync ID.

Stop and ask before bypassing the design-system source, adding dependencies, editing generated files as source, external product design writes, or any existing-feature tradeoff.

## Implemented Dashboard Control Center Package And CI Verification Wiring Handoff

SYNC-ID: dashboard_control_center_package_ci_verification_wiring
STATUS: implemented
ARTIFACTS: docs/workflow/AS_BUILT_SYNC_CONTRACT.tsv,docs/workflow/TEST_PLAN_MANIFEST.tsv,docs/workflow/GIT_HOOK_CHECKS.tsv,docs/workflow/GIT_HOOK_PARALLEL_GROUPS.tsv,docs/workflow/FINAL_GATE_COVERAGE.tsv,package.json,package-lock.json,.github/workflows/ci.yml,.github/workflows/lesson14-ci.yml,tools/check_ci_workflow_structure.sh,tools/check_test_plan_coverage.sh,tools/test_dashboard_control_center.sh,tools/test_lesson_repository.sh,docs/as-built/REQUIREMENTS.md,docs/as-built/SPECIFICATION.md,docs/as-built/IMPLEMENTATION_PLAN.md,docs/workflow/TASK_TRACKER.md,docs/workflow/HANDOFF.md
TESTS: tools/check_ci_workflow_structure.sh,tools/check_test_plan_coverage.sh,tools/test_test_plan.sh,tools/test_git_hooks.sh,tools/test_git_hooks_parallel.sh,tools/test_ci_final_gate.sh,tools/test_dashboard_control_center.sh,tools/check_as_built_sync_contract.sh,tools/check_as_built_docs.sh,tools/check_workflow_pair_sync.sh,tools/check_repository_development_workflow.sh,tools/test_repository_development_workflow.sh

Restart context:

- This P2 slice is implemented as a no-op verification wiring decision.
- Package and CI files were not edited because P0/P1 implementation did not create a real verification gap.
- Preserve required CI names, full/no-cache meaning, final-gate coverage, aggregate fallback, Lesson14 compatibility, and existing standalone tests.

Next Step:

- No remaining action for this sync ID.

Stop and ask before dependency installation, required CI check renames, CI authority changes, push, PR creation, merge, main CI waiting, cleanup, credentials, or any existing-feature tradeoff.

## Implemented Dashboard Control Center Component Module Extraction Handoff

SYNC-ID: dashboard_control_center_component_module_extraction
STATUS: implemented
ARTIFACTS: docs/workflow/AS_BUILT_SYNC_CONTRACT.tsv,dashboard-control-center/src/App.jsx,dashboard-control-center/src/dashboardContext.js,dashboard-control-center/src/DecisionSummary.jsx,dashboard-control-center/src/dashboardData.js,dashboard-control-center/src/i18n.js,dashboard-control-center/src/styles.css,tests/playwright/dashboard-control-center.spec.js,tools/test_dashboard_i18n.sh,tools/test_dashboard_control_center.sh,docs/as-built/REQUIREMENTS.md,docs/as-built/SPECIFICATION.md,docs/as-built/IMPLEMENTATION_PLAN.md,docs/workflow/TASK_TRACKER.md,docs/workflow/HANDOFF.md
TESTS: tools/test_dashboard_i18n.sh,tools/test_dashboard_control_center.sh,tools/check_as_built_sync_contract.sh,tools/check_as_built_docs.sh,tools/check_workflow_pair_sync.sh,tools/check_repository_development_workflow.sh,tools/test_repository_development_workflow.sh

Restart context:

- This optional P2 refactor is implemented for the decision summary surface.
- `dashboard-control-center/src/DecisionSummary.jsx` extracts reusable decision summary rendering while keeping behavior stable.
- `dashboard-control-center/src/dashboardContext.js` extracts reusable active menu/context selection, selectable-state, selected-context projection, and partial-failure scoping helpers while keeping behavior stable.
- Preserve routes, data ownership, i18n, status semantics, command-preview boundaries, design-system authority, and tests.

Next Step:

- No remaining action for this sync ID.

Stop and ask before changing runtime behavior, data production, dependencies, Git/CI behavior, external product writes, cleanup, or any existing-feature tradeoff.

## Dashboard Control Center Settings Control Policy Refinement Handoff

SYNC-ID: dashboard_control_center_settings_control_policy_refinement
STATUS: implemented
ARTIFACTS: docs/workflow/AS_BUILT_SYNC_CONTRACT.tsv,tools/dashboard-settings,vite.config.mjs,dashboard-control-center/src/dashboardData.js,dashboard-control-center/src/App.jsx,dashboard-control-center/src/i18n.js,tests/playwright/dashboard-control-center.spec.js,tools/test_dashboard_settings.sh,tools/test_dashboard_control_center.sh,tools/test_dashboard_i18n.sh,tools/check_dashboard_design_system.sh,tools/test_dashboard_design_studio_events.sh,docs/as-built/REQUIREMENTS.md,docs/as-built/SPECIFICATION.md,docs/as-built/IMPLEMENTATION_PLAN.md,docs/workflow/TASK_TRACKER.md,docs/workflow/HANDOFF.md
TESTS: tools/test_dashboard_settings.sh,tools/test_dashboard_control_center.sh,tools/test_dashboard_i18n.sh,tools/check_dashboard_design_system.sh,tools/test_dashboard_design_studio_events.sh,tools/check_as_built_sync_contract.sh,tools/check_as_built_docs.sh,tools/check_workflow_pair_sync.sh,tools/check_repository_development_workflow.sh,tools/test_repository_development_workflow.sh

Restart context:

- This sync refined Settings authority and Control Center wording after the xhigh sub-agent review.
- Settings apply is plan-token-bound and owner-layer-revalidated, matching the Design Studio one-time token pattern without broadening browser command authority.
- `tools/dashboard-settings` remains the settings authority; Vite middleware is a guarded transport and React is a renderer/controller for current plan state.
- Git workflow rows explain saved settings only. The browser still cannot run commit, push, PR creation, CI waiting, merge, main sync, cleanup, OAuth, credentials, or external service calls.
- Design Studio remains limited to the Dashboard design-system source and generated runtime path.

Next Step:

- No remaining implementation action for this sync ID. Future changes must preserve the owner-layer Settings boundary and one-time plan-token apply contract.

Stop and ask before arbitrary command execution, product repository writes, external product design writes, Git operations, CI waiting, OAuth, credentials, dependencies, generated-file source edits, cleanup, delete, push, PR creation, merge, main sync, or any existing-feature tradeoff.

## Dashboard Control Center Display Depth Settings Handoff

SYNC-ID: dashboard_control_center_display_depth_settings
STATUS: implemented
ARTIFACTS: docs/workflow/AS_BUILT_SYNC_CONTRACT.tsv,learning/DASHBOARD_DISPLAY_DEPTH.tsv,tools/lib/dashboard_display_depth.sh,tools/dashboard-settings,tools/dashboard-data,docs/workflow/DASHBOARD_DATA_SCHEMA.tsv,docs/workflow/TEST_PLAN_MANIFEST.tsv,vite.config.mjs,dashboard-control-center/src/dashboardData.js,dashboard-control-center/src/App.jsx,dashboard-control-center/src/i18n.js,tests/fixtures/dashboard-control-center.json,tests/fixtures/dashboard-control-center-live-update.json,tests/playwright/dashboard-control-center.spec.js,tools/test_dashboard_settings.sh,tools/test_dashboard_data.sh,tools/test_dashboard_i18n.sh,tools/test_dashboard_control_center.sh,docs/as-built/REQUIREMENTS.md,docs/as-built/SPECIFICATION.md,docs/as-built/IMPLEMENTATION_PLAN.md,docs/workflow/TASK_TRACKER.md,docs/workflow/HANDOFF.md
TESTS: tools/test_dashboard_settings.sh,tools/test_dashboard_schema.sh,tools/test_dashboard_data.sh,tools/test_dashboard_i18n.sh,tools/test_dashboard_control_center.sh,tools/check_dashboard_design_system.sh,tools/check_test_plan_coverage.sh,tools/check_as_built_sync_contract.sh,tools/check_as_built_docs.sh,tools/check_workflow_pair_sync.sh,tools/check_repository_development_workflow.sh,tools/test_repository_development_workflow.sh

Restart context:

- This sync added a dashboard-scoped display depth setting with guide, standard, and technical detail modes.
- `standard` preserves the current Control Center disclosure baseline.
- The setting affects disclosure and explanation density only; it does not change workflow authority, hide safety signals, or broaden Settings/Design Studio mutation scope.
- Runtime targets now include the new dashboard display source/helper, settings owner layer, dashboard data/schema/test-plan contracts, browser validation, localized labels, fixtures, and Playwright coverage.

Next Step:

- No remaining implementation action for this sync ID. Future changes should keep display depth separate from lesson mode and Design Studio density.

Stop and ask before changing lesson step behavior, lesson mode semantics, Git workflow policy authority, Design Studio source authority, dependencies, product repository writes, arbitrary browser command execution, push, PR creation, merge, cleanup, delete, or any existing-feature tradeoff.

## Dashboard Control Center Display Depth Phase 2 Handoff

SYNC-ID: dashboard_control_center_display_depth_phase_2
STATUS: implemented
ARTIFACTS: docs/workflow/AS_BUILT_SYNC_CONTRACT.tsv,tools/lib/dashboard_data.sh,tools/dashboard-data,dashboard-control-center/src/displayDepth.js,dashboard-control-center/src/App.jsx,dashboard-control-center/src/DecisionSummary.jsx,dashboard-control-center/src/dashboardData.js,dashboard-control-center/src/i18n.js,tests/fixtures/dashboard-control-center.json,tests/fixtures/dashboard-control-center-live-update.json,tests/playwright/dashboard-control-center.spec.js,tools/test_dashboard_schema.sh,tools/test_dashboard_data.sh,tools/test_dashboard_i18n.sh,tools/test_dashboard_control_center.sh,docs/as-built/REQUIREMENTS.md,docs/as-built/SPECIFICATION.md,docs/as-built/IMPLEMENTATION_PLAN.md,docs/workflow/TASK_TRACKER.md,docs/workflow/HANDOFF.md
TESTS: tools/test_dashboard_schema.sh,tools/test_dashboard_data.sh,tools/test_dashboard_i18n.sh,tools/test_dashboard_control_center.sh,tools/check_as_built_sync_contract.sh,tools/check_as_built_docs.sh,tools/check_workflow_pair_sync.sh,tools/check_repository_development_workflow.sh,tools/test_repository_development_workflow.sh

Restart context:

- This sync makes `friendly`, `standard`, and `technical` visibly meaningful across shared Control Center rendering surfaces.
- `standard` remains the compatibility baseline.
- `friendly` collapses non-critical technical detail but must keep blockers, approvals, security, stale/failed evidence, command previews, Settings boundaries, and read-only/display-only wording visible.
- `technical` opens or prioritizes existing producer-owned source id, owner source, authority, freshness, detail target, file, command, and evidence references.
- The browser must not gain new command execution, Git/CI mutation, product repository write, Settings authority, Design Studio authority, dependency, credential, or cleanup capability.

Next Step:

- No remaining implementation action for this sync ID. Future display-depth changes must preserve safety-signal visibility and owner authority boundaries.

Stop and ask before dependency changes, Settings authority expansion, arbitrary command execution, Git/CI operations, product repository writes, Design Studio authority changes, generated-file source edits, cleanup, push, PR creation, merge, or any existing-feature tradeoff.

## Dashboard Control Center Operational Situation Board Handoff

SYNC-ID: dashboard_control_center_operational_situation_board
STATUS: implemented
ARTIFACTS: docs/workflow/AS_BUILT_SYNC_CONTRACT.tsv,dashboard-control-center/src/App.jsx,dashboard-control-center/src/i18n.js,dashboard-control-center/src/styles.css,tests/playwright/dashboard-control-center.spec.js,tools/test_dashboard_i18n.sh,tools/test_dashboard_control_center.sh,tools/check_dashboard_design_system.sh,docs/as-built/REQUIREMENTS.md,docs/as-built/SPECIFICATION.md,docs/as-built/IMPLEMENTATION_PLAN.md,docs/workflow/TASK_TRACKER.md,docs/workflow/HANDOFF.md
TESTS: tools/test_dashboard_i18n.sh,tools/test_dashboard_control_center.sh,tools/check_dashboard_design_system.sh,tools/check_as_built_sync_contract.sh,tools/check_as_built_docs.sh,tools/check_workflow_pair_sync.sh,tools/check_repository_development_workflow.sh,tools/test_repository_development_workflow.sh

Restart context:

- This sync adds a read-only Operational Situation Board to the Control Center Overview.
- The board summarizes selected context, blockers, Git/worktree state, local tests, CI, and next safe check from existing snapshot/live-status data.
- It is intended to help non-engineers understand what is happening now and help junior/intermediate engineers see branch, dirty/untracked, ahead/behind, status, and command-preview evidence before deciding the next development move.
- The browser remains a renderer. It does not execute commands, run Git/CI, mutate repositories, write approvals, collect credentials, or perform cleanup.

Next Step:

- No remaining implementation action for this sync ID after focused Dashboard, i18n, design-system, sync, and repository-development checks pass.

Stop and ask before dependency changes, generated design-system source edits, browser command execution, Git/CI operations, product repository writes, approval writes, cleanup, push, PR creation, merge, main sync, credentials, or any existing-feature tradeoff.

## Dashboard Control Center Operational Detail Decisions Handoff

SYNC-ID: dashboard_control_center_operational_detail_decisions
STATUS: implemented
ARTIFACTS: docs/workflow/AS_BUILT_SYNC_CONTRACT.tsv,dashboard-control-center/src/App.jsx,dashboard-control-center/src/i18n.js,dashboard-control-center/src/styles.css,tests/playwright/dashboard-control-center.spec.js,tools/test_dashboard_i18n.sh,tools/test_dashboard_control_center.sh,tools/check_dashboard_design_system.sh,docs/as-built/REQUIREMENTS.md,docs/as-built/SPECIFICATION.md,docs/as-built/IMPLEMENTATION_PLAN.md,docs/workflow/TASK_TRACKER.md,docs/workflow/HANDOFF.md
TESTS: tools/test_dashboard_i18n.sh,tools/test_dashboard_control_center.sh,tools/check_dashboard_design_system.sh,tools/check_as_built_sync_contract.sh,tools/check_as_built_docs.sh,tools/check_workflow_pair_sync.sh,tools/check_repository_development_workflow.sh,tools/test_repository_development_workflow.sh

Restart context:

- This sync adds shared read-only operational decision panels to the major Control Center detail pages.
- Workflow, Maintenance Sync, Safety, and Repository Info can now show blockers, Git/worktree, tests/CI, and next-safe-action judgment material without requiring users to infer that state from the CLI.
- The panel reuses existing snapshot and live-status fields and follows display-depth policy for secondary technical disclosure.
- The browser remains a renderer. It does not execute commands, run Git/CI, mutate repositories, write approvals, collect credentials, or perform cleanup.

Next Step:

- No remaining implementation action for this sync ID after focused Dashboard, i18n, design-system, sync, and repository-development checks pass.

Stop and ask before dependency changes, generated design-system source edits, browser command execution, Git/CI operations, product repository writes, approval writes, cleanup, push, PR creation, merge, main sync, credentials, Settings authority expansion, Design Studio authority expansion, or any existing-feature tradeoff.

## Dashboard Control Center Bundle Contract Handoff

SYNC-ID: dashboard_control_center_bundle_contract
STATUS: implemented
ARTIFACTS: docs/workflow/AS_BUILT_SYNC_CONTRACT.tsv,package.json,vite.config.mjs,dashboard-control-center/src/dashboardData.js,dashboard-control-center/src/i18n.js,dashboard-control-center/src/localePolicy.js,tools/check_dashboard_bundle_contract.mjs,tools/check_dashboard_bundle_contract.sh,docs/workflow/TEST_PLAN_MANIFEST.tsv,docs/workflow/GIT_HOOK_CHECKS.tsv,docs/workflow/GIT_HOOK_PARALLEL_GROUPS.tsv,docs/workflow/FINAL_GATE_COVERAGE.tsv,.github/workflows/ci.yml,.github/workflows/lesson14-ci.yml,tools/test_lesson_repository.sh,tools/check_ci_workflow_structure.sh,docs/as-built/REQUIREMENTS.md,docs/as-built/SPECIFICATION.md,docs/as-built/IMPLEMENTATION_PLAN.md,docs/workflow/TASK_TRACKER.md,docs/workflow/HANDOFF.md
TESTS: tools/check_dashboard_bundle_contract.sh,tools/test_dashboard_i18n.sh,tools/test_dashboard_control_center.sh,tools/check_test_plan_coverage.sh,tools/test_test_plan.sh,tools/test_git_hooks.sh,tools/test_git_hooks_parallel.sh,tools/test_ci_final_gate.sh,tools/check_ci_workflow_structure.sh,tools/check_as_built_sync_contract.sh,tools/check_as_built_docs.sh,tools/check_workflow_pair_sync.sh,tools/check_repository_development_workflow.sh,tools/test_repository_development_workflow.sh

Restart context:

- This sync imports the FrameCue-style bundle warning guard into this lesson repository.
- `npm run dashboard:build-check` runs a fresh Dashboard Control Center production build, fails on Vite large-chunk warning text, verifies named chunks, and enforces the 500 KB per-JS chunk and 300 KB entry-shell budgets.
- `dashboard-control-center/src/localePolicy.js` keeps lightweight locale metadata reusable without pulling the full translation dictionary into validation or Vite config code.
- Vite now splits dashboard data runtime, i18n, and generated design-system runtime into separate named chunks instead of hiding the warning through a larger `chunkSizeWarningLimit`.
- The check is available through package scripts, Git hooks, CI policy jobs, final-gate coverage, and aggregate repository verification.

Next Step:

- No remaining implementation action for this sync ID after bundle, dashboard, test-plan, Git hooks, CI structure, sync, and repository-development checks pass.

Stop and ask before dependency changes, raising chunk-size warning limits to hide warnings, weakening Git hooks or final gates, generated-file source edits, browser command execution, repository writes, cleanup, push, PR creation, merge, main sync, credentials, or any existing-feature tradeoff.

## Product AGENTS Lesson Gate Alignment Handoff

SYNC-ID: product_agents_lesson_gate_alignment
STATUS: implemented
ARTIFACTS: docs/workflow/AS_BUILT_SYNC_CONTRACT.tsv,lesson/SYNC_GATES_14_DAYS.tsv,lesson/LESSON_FLOW_14_DAYS.tsv,lesson/LESSON_FLOW.tsv,tools/check_lesson14_sync.sh,tools/test_lesson14.sh,docs/as-built/REQUIREMENTS.md,docs/as-built/SPECIFICATION.md,docs/as-built/IMPLEMENTATION_PLAN.md,docs/workflow/TASK_TRACKER.md,docs/workflow/HANDOFF.md
TESTS: tools/check_lesson14_sync.sh,tools/test_lesson14.sh,tools/test_product_scaffold_check.sh,tools/check_agents_skills.sh,tools/check_as_built_sync_contract.sh,tools/check_as_built_docs.sh,tools/check_workflow_pair_sync.sh,tools/check_repository_development_workflow.sh,tools/test_repository_development_workflow.sh

Restart context:

- The product repository agent entry standard is `AGENTS.MD`.
- Lesson14 gates and lesson prose now require product `AGENTS.MD` where product agent rules are required.
- Preserve legacy `AGENT.md` wording only when it clearly describes migration or deprecation.

Next safe action:

- No remaining implementation action for this sync ID after focused verification.

## Dashboard Design Studio Subscription-Agent Handoff Package Handoff

SYNC-ID: dashboard_design_studio_subscription_agent_handoff_package
STATUS: implemented
ARTIFACTS: docs/workflow/AS_BUILT_SYNC_CONTRACT.tsv,docs/workflow/DASHBOARD_DATA_SCHEMA.tsv,tools/dashboard-design-system,tools/dashboard-data,dashboard-control-center/src/dashboardData.js,dashboard-control-center/src/App.jsx,dashboard-control-center/src/i18n.js,tests/playwright/dashboard-control-center.spec.js,tools/test_dashboard_design_studio_events.sh,tools/test_dashboard_data.sh,tools/test_dashboard_i18n.sh,tools/test_dashboard_control_center.sh,docs/as-built/REQUIREMENTS.md,docs/as-built/SPECIFICATION.md,docs/as-built/IMPLEMENTATION_PLAN.md,docs/workflow/TASK_TRACKER.md,docs/workflow/HANDOFF.md
TESTS: tools/test_dashboard_design_studio_events.sh,tools/check_dashboard_design_system.sh,tools/test_dashboard_data.sh,tools/test_dashboard_i18n.sh,tools/test_dashboard_control_center.sh,tools/check_as_built_sync_contract.sh,tools/check_as_built_docs.sh,tools/check_workflow_pair_sync.sh,tools/check_repository_development_workflow.sh,tools/test_repository_development_workflow.sh

Restart context:

- P2 added a CLI-only `agent-package` command and dashboard package metadata for subscription-agent events.
- Package output stays under `.dashboard-design-studio-events/agent-packages/` or test-store equivalent, rejects symlink escapes, and does not execute, upload, or grant authority.
- `proposal-status` only exposes subscription-agent handoff metadata for subscription-agent events and attaches package metadata after package generation.
- Dashboard validation rejects unsupported handoff keys, unsafe package paths, mismatched event/request ids, raw prompt/payload/operation keys, secret-like data, and execution/write authority flags.

Next safe action:

- Proceed to P3 only after committing the implemented P2 slice; do not execute subscription agents, provider APIs, imagegen, external product writes, browser commands, Git/CI from the dashboard, or owner-tool apply from this handoff package.

## Dashboard Design Studio Template Proposal Library Handoff

SYNC-ID: dashboard_design_studio_template_proposal_library
STATUS: implemented
ARTIFACTS: docs/workflow/AS_BUILT_SYNC_CONTRACT.tsv,docs/workflow/DASHBOARD_DATA_SCHEMA.tsv,docs/design-system/dashboard-control-center/DESIGN_SYSTEM.md,docs/design-system/dashboard-control-center/orchestration.json,docs/design-system/dashboard-control-center/templates.json,tools/dashboard-design-system,tools/dashboard-data,dashboard-control-center/src/dashboardData.js,dashboard-control-center/src/App.jsx,dashboard-control-center/src/i18n.js,tests/playwright/dashboard-control-center.spec.js,tools/test_dashboard_design_studio_events.sh,tools/test_dashboard_data.sh,tools/test_dashboard_schema.sh,tools/test_dashboard_i18n.sh,tools/test_dashboard_control_center.sh,docs/as-built/REQUIREMENTS.md,docs/as-built/SPECIFICATION.md,docs/as-built/IMPLEMENTATION_PLAN.md,docs/workflow/TASK_TRACKER.md,docs/workflow/HANDOFF.md
TESTS: tools/test_dashboard_design_studio_events.sh,tools/check_dashboard_design_system.sh,tools/test_dashboard_schema.sh,tools/test_dashboard_data.sh,tools/test_dashboard_i18n.sh,tools/test_dashboard_control_center.sh,tools/check_as_built_sync_contract.sh,tools/check_as_built_docs.sh,tools/check_workflow_pair_sync.sh,tools/check_repository_development_workflow.sh,tools/test_repository_development_workflow.sh

Restart context:

- P3 added `docs/design-system/dashboard-control-center/templates.json` as the safe reusable template registry and owner-tool preview source for TemplateProposal metadata.
- Template text and manifests remain untrusted data for preview; they do not become direct writes or browser-executable actions.
- Dashboard displays template library status, counts, latest preview, checks, digest, and proposal-only boundaries from producer-owned data.

Next safe action:

- Commit the implemented P3 slice before proceeding to P4; do not add template apply, automatic proposal conversion, providers, imagegen, external product writes, Git/CI execution from dashboard data, approval mutation, plan/apply tokens, or browser command execution.

## Dashboard Design Studio History Detail Handoff

SYNC-ID: dashboard_design_studio_history_detail
STATUS: implemented
ARTIFACTS: docs/workflow/AS_BUILT_SYNC_CONTRACT.tsv,docs/workflow/DASHBOARD_DATA_SCHEMA.tsv,tools/dashboard-design-system,tools/dashboard-data,dashboard-control-center/src/dashboardData.js,dashboard-control-center/src/App.jsx,dashboard-control-center/src/i18n.js,tests/playwright/dashboard-control-center.spec.js,tools/test_dashboard_design_studio_events.sh,tools/test_dashboard_data.sh,tools/test_dashboard_i18n.sh,tools/test_dashboard_control_center.sh,docs/as-built/REQUIREMENTS.md,docs/as-built/SPECIFICATION.md,docs/as-built/IMPLEMENTATION_PLAN.md,docs/workflow/TASK_TRACKER.md,docs/workflow/HANDOFF.md
TESTS: tools/test_dashboard_design_studio_events.sh,tools/check_dashboard_design_system.sh,tools/test_dashboard_data.sh,tools/test_dashboard_i18n.sh,tools/test_dashboard_control_center.sh,tools/check_as_built_sync_contract.sh,tools/check_as_built_docs.sh,tools/check_workflow_pair_sync.sh,tools/check_repository_development_workflow.sh,tools/test_repository_development_workflow.sh

Restart context:

- P1 added a Design Studio history detail section to the existing History page using producer-owned `design_studio.history_rows[]`.
- History rows remain redacted and proposal-only; no raw prompt, raw payload, proposal operation, provider dispatch, imagegen, apply token, approval receipt, browser command, or product write authority is allowed.
- Legacy dashboard snapshots without `design_studio` must remain viewable.

Next safe action:

- No remaining implementation action for this sync ID after focused verification.

## Dashboard Design Studio Proposal Workflow Foundation Handoff

SYNC-ID: dashboard_design_studio_proposal_workflow_foundation
STATUS: implemented
ARTIFACTS: docs/workflow/AS_BUILT_SYNC_CONTRACT.tsv,docs/workflow/DASHBOARD_DATA_SCHEMA.tsv,docs/design-system/dashboard-control-center/orchestration.json,dashboard-control-center/src/design-system.generated.js,tools/dashboard-design-system,tools/dashboard-data,dashboard-control-center/src/App.jsx,dashboard-control-center/src/i18n.js,tests/playwright/dashboard-control-center.spec.js,tools/test_dashboard_design_studio_events.sh,tools/test_dashboard_data.sh,tools/test_dashboard_i18n.sh,tools/test_dashboard_control_center.sh,docs/as-built/REQUIREMENTS.md,docs/as-built/SPECIFICATION.md,docs/as-built/IMPLEMENTATION_PLAN.md,docs/workflow/TASK_TRACKER.md,docs/workflow/HANDOFF.md
TESTS: tools/test_dashboard_design_studio_events.sh,tools/check_dashboard_design_system.sh,tools/test_dashboard_data.sh,tools/test_dashboard_i18n.sh,tools/test_dashboard_control_center.sh,tools/check_as_built_sync_contract.sh,tools/check_as_built_docs.sh,tools/check_workflow_pair_sync.sh,tools/check_repository_development_workflow.sh,tools/test_repository_development_workflow.sh

Restart context:

- Design Studio supports queueing request metadata, importing CandidateEnvelope / DesignChangeProposal metadata, and exposing imported candidates/proposals as reviewable proposal-only dashboard state.
- P0-P6 are implemented as one proposal-workflow foundation: imported viewer, preview decision gate, subscription-agent handoff metadata, mock/image candidate review, external-product plan-only export, blocked API-key provider policy, and owner-tool transaction dry-run.
- The implementation grants no apply, provider, imagegen, Git/CI, browser-command, credential, or external product write authority.

Next safe action:

- No remaining implementation action for this sync ID after focused Design Studio, dashboard-data, Dashboard, sync, and repository-development checks passed.

## Dashboard Control Center Evidence Presentation Clarity Handoff

SYNC-ID: dashboard_control_center_evidence_presentation_clarity
STATUS: implemented
ARTIFACTS: docs/workflow/AS_BUILT_SYNC_CONTRACT.tsv,dashboard-control-center/src/displayDepth.js,dashboard-control-center/src/App.jsx,dashboard-control-center/src/DecisionSummary.jsx,dashboard-control-center/src/i18n.js,tests/playwright/dashboard-control-center.spec.js,tools/test_dashboard_i18n.sh,tools/test_dashboard_control_center.sh,docs/as-built/REQUIREMENTS.md,docs/as-built/SPECIFICATION.md,docs/as-built/IMPLEMENTATION_PLAN.md,docs/workflow/TASK_TRACKER.md,docs/workflow/HANDOFF.md
TESTS: tools/test_dashboard_i18n.sh,tools/test_dashboard_control_center.sh,tools/check_dashboard_design_system.sh,tools/check_as_built_sync_contract.sh,tools/check_as_built_docs.sh,tools/check_workflow_pair_sync.sh,tools/check_repository_development_workflow.sh,tools/test_repository_development_workflow.sh

Restart context:

- Display depth is presentation-only: friendly guides and folds technical detail, standard remains baseline, technical prioritizes existing evidence.
- Operational freshness labels now distinguish matching live observation from saved snapshot fallback.
- The browser remains read-only for operational evidence and command previews.

Next safe action:

- No remaining implementation action for this sync ID after focused verification.

## Dashboard Control Center CI Evidence Guidance Handoff

SYNC-ID: dashboard_control_center_ci_evidence_guidance
STATUS: implemented
ARTIFACTS: docs/workflow/AS_BUILT_SYNC_CONTRACT.tsv,docs/workflow/PRODUCT_GATE_EVIDENCE_SCHEMA.tsv,tools/product-gate-evidence-bootstrap,tools/lib/dashboard_data.sh,tools/dashboard-data,dashboard-control-center/src/App.jsx,dashboard-control-center/src/i18n.js,tests/playwright/dashboard-control-center.spec.js,tools/test_product_gate_tools.sh,tools/test_dashboard_data.sh,tools/test_dashboard_i18n.sh,tools/test_dashboard_control_center.sh,docs/as-built/REQUIREMENTS.md,docs/as-built/SPECIFICATION.md,docs/as-built/IMPLEMENTATION_PLAN.md,docs/workflow/TASK_TRACKER.md,docs/workflow/HANDOFF.md
TESTS: tools/test_product_gate_tools.sh,tools/test_dashboard_data.sh,tools/test_dashboard_i18n.sh,tools/test_dashboard_control_center.sh,tools/check_as_built_sync_contract.sh,tools/check_as_built_docs.sh,tools/check_workflow_pair_sync.sh,tools/check_repository_development_workflow.sh,tools/test_repository_development_workflow.sh

Restart context:

- Product-local `ci-runs` is the explicit evidence collection path.
- The Dashboard shows read-only suggested command previews but must not run CI, call `gh`, poll providers, or write product repositories.
- Preserve missing, not-run, stale, failed, and manual-required states.

Next safe action:

- No remaining implementation action for this sync ID after focused verification.

## Dashboard Design Studio Candidate Import Foundation Handoff

SYNC-ID: dashboard_design_studio_candidate_import_foundation
STATUS: implemented
ARTIFACTS: docs/workflow/AS_BUILT_SYNC_CONTRACT.tsv,tools/dashboard-design-system,tools/test_dashboard_design_studio_events.sh,docs/as-built/REQUIREMENTS.md,docs/as-built/SPECIFICATION.md,docs/as-built/IMPLEMENTATION_PLAN.md,docs/workflow/TASK_TRACKER.md,docs/workflow/HANDOFF.md
TESTS: tools/test_dashboard_design_studio_events.sh,tools/check_dashboard_design_system.sh,tools/check_as_built_sync_contract.sh,tools/check_as_built_docs.sh,tools/check_workflow_pair_sync.sh,tools/check_repository_development_workflow.sh,tools/test_repository_development_workflow.sh

Restart context:

- CandidateEnvelope and DesignChangeProposal import is local, structured, redacted, append-only metadata.
- Imported candidate/proposal data remains untrusted and proposal-only.
- Import must not create provider dispatch, imagegen execution, plan tokens, apply tokens, direct apply authority, or external product writes.

Next safe action:

- No remaining implementation action for this sync ID after focused verification.

## Dashboard Control Center Agentic Control Tower P0-P10 Handoff

SYNC-ID: dashboard_control_center_agentic_control_tower_p0_p10
STATUS: implemented
ARTIFACTS: docs/workflow/AS_BUILT_SYNC_CONTRACT.tsv,tools/lib/control_center_core.mjs,tools/lib/control_center_evidence_store.mjs,tools/lib/control_center_mcp_stdio_adapter.mjs,tools/control-center,tools/control-center-mcp,tools/test_control_center_core.sh,tools/test_control_center_core.mjs,dashboard-control-center/src/App.jsx,dashboard-control-center/src/DecisionSummary.jsx,dashboard-control-center/src/dashboardContext.js,dashboard-control-center/src/dashboardData.js,dashboard-control-center/src/displayDepth.js,dashboard-control-center/src/i18n.js,dashboard-control-center/src/styles.css,tools/dashboard-data,docs/as-built/REQUIREMENTS.md,docs/as-built/SPECIFICATION.md,docs/as-built/IMPLEMENTATION_PLAN.md,docs/workflow/TASK_TRACKER.md,docs/workflow/HANDOFF.md
TESTS: tools/test_dashboard_schema.sh,tools/test_dashboard_data.sh,tools/test_dashboard_i18n.sh,tools/check_dashboard_bundle_contract.sh,tools/check_as_built_sync_contract.sh,tools/check_as_built_docs.sh,tools/check_workflow_pair_sync.sh,tools/check_repository_development_workflow.sh,tools/test_repository_development_workflow.sh,tools/test_dashboard_browser_debug_manifest.sh

Restart context:

- Evidence-backed detail pages now require a producer-owned snapshot for the selected menu. Overview remains usable during refresh, but stale Workflow/Maintenance/Safety/Repository/Documents/Design Studio/History detail data is not mixed across menus.
- Status labels use shared `state.*` translation keys through `stateLabelKey()`. Operational default text has Japanese translations for common producer messages.
- The current work card now uses `operational_decision` audience briefs and next-safe-action text, with source/command references visible outside friendly mode.
- `tools/control-center` and `tools/control-center-mcp` share `tools/lib/control_center_core.mjs` profiles and command ids. Provider dispatch remains disabled; owner apply remains plan-only.
- Evidence collection receipts are written under `.control-center/evidence/` with a locked ledger. This directory is local runtime evidence and should not be treated as source-of-truth documentation.
- Browser Debug CLI remains external and read-only; this repository owns only manifest generation and local review artifacts.

Next safe action:

- Run focused verification and P10 Browser Debug review. Do not edit `/home/masahiro/projects/agent-toolbox/browser-debug-cli`, call provider APIs, generate images, auto-apply proposals, mutate external products, run dashboard-triggered Git/CI operations, push, merge, or cleanup from the dashboard.

## Dashboard Control Center Contextual Repair Handoff

SYNC-ID: dashboard_control_center_contextual_repair
STATUS: implemented
ARTIFACTS: docs/workflow/AS_BUILT_SYNC_CONTRACT.tsv,docs/workflow/DASHBOARD_DATA_SCHEMA.tsv,docs/design-system/dashboard-control-center/DESIGN_SYSTEM.md,docs/design-system/dashboard-control-center/tokens.json,docs/design-system/dashboard-control-center/components.json,tools/dashboard-design-system,tools/dashboard-data,vite.config.mjs,dashboard-control-center/src/App.jsx,dashboard-control-center/src/dashboardContext.js,dashboard-control-center/src/dashboardData.js,dashboard-control-center/src/displayDepth.js,dashboard-control-center/src/i18n.js,dashboard-control-center/src/styles.css,dashboard-control-center/src/design-system.generated.css,tests/playwright/dashboard-control-center.spec.js,tools/test_dashboard_schema.sh,docs/as-built/REQUIREMENTS.md,docs/as-built/SPECIFICATION.md,docs/as-built/IMPLEMENTATION_PLAN.md,docs/workflow/TASK_TRACKER.md,docs/workflow/HANDOFF.md
TESTS: tools/test_dashboard_schema.sh,tools/test_dashboard_data.sh,tools/test_dashboard_data_product_repository_selection.sh,tools/test_dashboard_i18n.sh,tools/test_dashboard_control_center.sh,tools/check_dashboard_design_system.sh,tools/check_as_built_sync_contract.sh,tools/check_as_built_docs.sh,tools/check_workflow_pair_sync.sh,tools/check_repository_development_workflow.sh,tools/test_repository_development_workflow.sh

Restart context:

- The user stopped implementation because Control Center pages mixed contexts, showed stale or generic information, and did not make live CLI/MCP evidence useful.
- The repair must preserve configurability: no hard-coded product names, repository names, URLs, file paths, thresholds, or review-tool identities.
- The first implementation focus is selected-menu snapshot ownership, stable repository id propagation, scoped document briefs, and live evidence presentation.
- Browser Debug CLI or TraceCue repositories remain read-only from this task.

Next safe action:

- Continue from `repository-development-workflow` fast-loop implementation, then run focused checks and read-only Browser Debug CLI or TraceCue review before promoting this sync ID to implemented.

## Implemented Dashboard Control Center Workflow Activity History Handoff

SYNC-ID: dashboard_control_center_workflow_activity_history
STATUS: implemented
ARTIFACTS: docs/workflow/AS_BUILT_SYNC_CONTRACT.tsv,docs/workflow/DASHBOARD_DATA_SCHEMA.tsv,docs/design-system/dashboard-control-center/DESIGN_SYSTEM.md,docs/design-system/dashboard-control-center/tokens.json,docs/design-system/dashboard-control-center/components.json,dashboard-control-center/src/design-system.generated.css,dashboard-control-center/src/design-system.generated.js,tools/dashboard-data,tools/lib/dashboard_data.sh,vite.config.mjs,dashboard-control-center/src/App.jsx,dashboard-control-center/src/dashboardData.js,dashboard-control-center/src/i18n.js,dashboard-control-center/src/i18nCatalog.js,dashboard-control-center/src/styles.css,tests/fixtures/dashboard-control-center.json,tests/fixtures/dashboard-control-center-live-update.json,tests/playwright/dashboard-control-center.spec.js,tools/test_dashboard_schema.sh,tools/test_dashboard_data.sh,tools/test_dashboard_i18n.sh,tools/test_dashboard_control_center.sh,docs/as-built/REQUIREMENTS.md,docs/as-built/SPECIFICATION.md,docs/as-built/IMPLEMENTATION_PLAN.md,docs/workflow/TASK_TRACKER.md,docs/workflow/HANDOFF.md
TESTS: tools/test_dashboard_schema.sh,tools/test_dashboard_data.sh,tools/test_dashboard_i18n.sh,tools/test_dashboard_control_center.sh,tools/check_dashboard_bundle_contract.sh,tools/check_dashboard_design_system.sh,tools/check_as_built_sync_contract.sh,tools/check_as_built_docs.sh,tools/check_workflow_pair_sync.sh,tools/check_repository_development_workflow.sh,tools/test_repository_development_workflow.sh

Restart context:

- The completed work remains on `codex/dashboard-workflow-history-completion`; `origin/main` remains at `ca8e22b` until the approval-bound Git phases begin.
- The Development Workflow page now shows bounded material update history followed by a six-part current-position summary for handoff, task tracker, failures/blockers, Git, tests, and CI.
- Producer and browser contracts preserve stale, unknown, not-run, manual-required, explicit blocker counts, occurrence times, repository heads, structured purpose codes, safe commands, and safe artifact references.
- `i18nCatalog.js` is maintained source and is emitted as a separate Vite chunk; the bundle ceiling was not raised.
- Missing purpose codes, unsafe or unbounded event values, executable mutation boundaries, duplicate ready rows, and stale-as-ready presentation have refusal coverage.
- FrameCue resolves at `$HOME/projects/agent-toolbox/frame-cue`; TraceCue remains the selected free-development repository. Registry and selection fixture tests pass.
- Read-only live external verification now reports FrameCue and TraceCue as scaffold `passed`, authority `ready`, blocker count `0`, evidence `passed`, Git `clean`, and Dashboard readiness `ready`. FrameCue is synchronized at `8463436f94cfd9e7fd55a734b35d741a61c5df34` with GitHub CI run `29169227010`; TraceCue is synchronized at `4c27dc34364ded67977fe7322e91294900e7285d` with GitHub CI run `29168001581`. The parent repository did not modify either product repository.
- Focused results: Dashboard Playwright 32/32 passed; schema, data, i18n, Design System, bundle, product Git-usage, menu-prerequisite, repository-selection, and repository-development workflow checks passed.
- Release proof: aggregate `test_lesson_repository.sh` passed, and the full/no-cache Git hook run passed all 58 checks with same-run final-gate evidence.

Next safe action:

- Commit and push the verified parent-repository branch, inspect PR CI, perform the approved merge, then verify main CI and local/remote synchronization. Cleanup remains limited to the parent repository.

## Parent Repository Change-Aware Document Sync Handoff

SYNC-ID: repository_document_sync_enforcement
STATUS: implemented
ARTIFACTS: AGENTS.MD,docs/workflow/AS_BUILT_SYNC_CONTRACT.tsv,docs/workflow/REPOSITORY_DOCUMENT_SYNC.md,docs/workflow/REPOSITORY_DOCUMENT_SYNC_POLICY.json,docs/workflow/SAFEFLOW_SECURITY_BACKFILL.tsv,docs/workflow/PRODUCT_SECURITY_POLICY.tsv,docs/workflow/TEST_PLAN_MANIFEST.tsv,docs/workflow/GIT_HOOK_CHECKS.tsv,docs/workflow/GIT_HOOK_PARALLEL_GROUPS.tsv,docs/workflow/GIT_HOOK_RECOMMENDATION_PATHS.tsv,docs/workflow/FINAL_GATE_COVERAGE.tsv,guides/DOCUMENT_MAP.md,.githooks/pre-push,tools/lib/repository_document_sync.mjs,tools/check_repository_document_sync.mjs,tools/check_repository_document_sync.sh,tools/test_repository_document_sync.mjs,tools/test_repository_document_sync.sh,tools/check_lesson_structure.sh,tools/test_lesson_repository.sh,tools/check_ci_workflow_structure.sh,tools/test_ci_pipeline_acceleration.sh,.github/workflows/ci.yml,docs/as-built/REQUIREMENTS.md,docs/as-built/SPECIFICATION.md,docs/as-built/IMPLEMENTATION_PLAN.md,docs/workflow/TASK_TRACKER.md,docs/workflow/HANDOFF.md
TESTS: tools/check_repository_document_sync.sh,tools/test_repository_document_sync.sh,tools/check_lesson_structure.sh,tools/check_test_plan_coverage.sh,tools/test_test_plan.sh,tools/test_git_hooks.sh,tools/test_git_hooks_parallel.sh,tools/check_ci_workflow_structure.sh,tools/test_ci_pipeline_acceleration.sh,tools/check_security_invariants.sh,tools/test_security_invariants.sh,tools/check_agents_skills.sh,tools/check_as_built_sync_contract.sh,tools/check_as_built_docs.sh,tools/check_workflow_pair_sync.sh

Restart context:

- The parent now has a change-aware omission gate separate from `AS_BUILT_SYNC_CONTRACT.tsv`; it checks that required authority paths changed in the same integration range but does not judge prose meaning.
- Normal CI reads only the parent checkout and path metadata. It does not open registry targets, FrameCue, TraceCue, or another product repository, and it does not run child tests.
- Parent categories are STEP 1-7, STEP 1-14, Free Development/Git usage, product registry, scaffold/templates, Dashboard data/design, CI/hooks, and additive security/external/MCP/browser/evidence boundaries.
- The policy self rule is checker-enforced and cannot be removed or weakened from the mutable JSON policy.
- PR uses merge-base, push uses exact before/after, initial push uses the complete head tree, and only non-deleted destinations satisfy required documents.
- The dedicated main-CI job is standard-library-only, parallel, read-only, and a final-gate prerequisite. Lesson14 CI does not duplicate it.
- `.githooks/pre-push` is optional local feedback and never fetches; CI remains final authority.
- External repositories remain read-only. The remaining work is verification, Git/GitHub integration, main synchronization, and TraceCue PC/mobile browser review.

## Parent Development Instruction Fallback And Autonomy Handoff

SYNC-ID: parent_instruction_memory_fallback_authority
STATUS: implemented
ARTIFACTS: AGENTS.MD,docs/workflow/AS_BUILT_SYNC_CONTRACT.tsv,docs/workflow/INSTRUCTION_MEMORY.md,docs/workflow/DEVELOPMENT_INSTRUCTION_POLICY.tsv,docs/workflow/DEVELOPMENT_AUTONOMY_WORKFLOW.tsv,docs/workflow/PRODUCT_REPOSITORY_STRUCTURE.tsv,free-development/FREE_DEVELOPMENT_MODE.md,templates/TEMPLATES.md,guides/DOCUMENT_MAP.md,tools/lib/development_instruction.mjs,tools/lib/development_instruction.sh,tools/development-instruction,tools/check_development_instruction.sh,tools/test_development_instruction.mjs,tools/test_development_instruction.sh,tools/lib/product_workflow_git_usage.sh,tools/free-development,tools/product-improvement,tools/external-integration,skills/product-development-workflow/SKILL.md,skills/product-development-workflow/references/product-development.md,docs/workflow/REPOSITORY_DOCUMENT_SYNC.md,docs/workflow/REPOSITORY_DOCUMENT_SYNC_POLICY.json,tools/lib/repository_document_sync.mjs,tools/test_repository_document_sync.mjs,docs/workflow/SAFEFLOW_SECURITY_BACKFILL.tsv,docs/workflow/PRODUCT_SECURITY_POLICY.tsv,docs/workflow/TEST_PLAN_MANIFEST.tsv,docs/workflow/GIT_HOOK_CHECKS.tsv,docs/workflow/GIT_HOOK_PARALLEL_GROUPS.tsv,docs/workflow/GIT_HOOK_RECOMMENDATION_PATHS.tsv,docs/workflow/FINAL_GATE_EXECUTION_POLICY.tsv,docs/workflow/FINAL_GATE_CI_GRAPH.tsv,docs/workflow/FINAL_GATE_GAP_COMMANDS.tsv,docs/workflow/FINAL_GATE_COVERAGE.tsv,tools/test_lesson_repository.sh,.github/workflows/ci.yml,.github/workflows/lesson14-ci.yml,docs/as-built/REQUIREMENTS.md,docs/as-built/SPECIFICATION.md,docs/as-built/IMPLEMENTATION_PLAN.md,docs/workflow/TASK_TRACKER.md,docs/workflow/HANDOFF.md
TESTS: tools/check_development_instruction.sh,tools/test_development_instruction.sh,tools/test_product_git_usage_modes.sh,tools/test_product_scaffold_check.sh,tools/test_menu_prerequisites.sh,tools/test_repository_document_sync.sh,tools/check_security_invariants.sh,tools/test_security_invariants.sh,tools/check_test_plan_coverage.sh,tools/test_test_plan.sh,tools/test_git_hooks.sh,tools/test_git_hooks_parallel.sh,tools/test_ci_composition.sh,tools/check_ci_workflow_structure.sh,tools/check_agents_skills.sh,tools/test_docs_tour.sh,tools/check_as_built_sync_contract.sh,tools/check_as_built_docs.sh,tools/check_workflow_pair_sync.sh

The implemented change adds a parent fallback for eligible development
contexts only. A valid child-local `INSTRUCTION_MEMORY.md` remains authoritative
inside the instruction-memory layer. Exact absence may use the parent fallback;
every other local-file error blocks. Context/menu policy, selection, operation
mode, and Git top-level identity must agree before a product target is read.
Lesson contexts remain outside this feature.

SYNC-ID: parent_development_autonomy_activation
STATUS: implemented
ARTIFACTS: AGENTS.MD,docs/workflow/AS_BUILT_SYNC_CONTRACT.tsv,docs/workflow/INSTRUCTION_MEMORY.md,docs/workflow/DEVELOPMENT_INSTRUCTION_POLICY.tsv,docs/workflow/DEVELOPMENT_AUTONOMY_WORKFLOW.tsv,docs/workflow/REPOSITORY_DEVELOPMENT_WORKFLOW.tsv,docs/workflow/REPOSITORY_DEVELOPMENT_RUNNER_POLICY.tsv,learning/REPOSITORY_DEVELOPMENT_APPROVALS.tsv,docs/workflow/GIT_WORKFLOW_POLICY.tsv,learning/GIT_WORKFLOW_SETTINGS.tsv,docs/workflow/PRODUCT_WORKFLOW_GIT_USAGE_POLICY.tsv,learning/PRODUCT_WORKFLOW_GIT_USAGE_SETTINGS.tsv,tools/lib/repository_development_workflow.sh,tools/lib/repository_development_runner.sh,tools/repository-development-workflow,tools/check_repository_development_workflow.sh,tools/test_repository_development_workflow.sh,skills/repository-development-workflow/SKILL.md,skills/repository-development-workflow/references/repository-development.md,tools/lib/development_instruction.mjs,tools/development-instruction,tools/lib/product_workflow_git_usage.sh,skills/product-development-workflow/SKILL.md,docs/workflow/REPOSITORY_DOCUMENT_SYNC.md,docs/workflow/REPOSITORY_DOCUMENT_SYNC_POLICY.json,docs/workflow/SAFEFLOW_SECURITY_BACKFILL.tsv,docs/workflow/PRODUCT_SECURITY_POLICY.tsv,docs/workflow/TEST_PLAN_MANIFEST.tsv,docs/workflow/GIT_HOOK_CHECKS.tsv,docs/workflow/GIT_HOOK_PARALLEL_GROUPS.tsv,docs/workflow/GIT_HOOK_RECOMMENDATION_PATHS.tsv,docs/workflow/FINAL_GATE_EXECUTION_POLICY.tsv,docs/workflow/FINAL_GATE_CI_GRAPH.tsv,docs/workflow/FINAL_GATE_GAP_COMMANDS.tsv,docs/workflow/FINAL_GATE_COVERAGE.tsv,tools/test_lesson_repository.sh,.github/workflows/ci.yml,.github/workflows/lesson14-ci.yml,docs/as-built/REQUIREMENTS.md,docs/as-built/SPECIFICATION.md,docs/as-built/IMPLEMENTATION_PLAN.md,docs/workflow/TASK_TRACKER.md,docs/workflow/HANDOFF.md
TESTS: tools/check_development_instruction.sh,tools/test_development_instruction.sh,tools/check_repository_development_workflow.sh,tools/test_repository_development_workflow.sh,tools/test_product_git_usage_modes.sh,tools/test_menu_prerequisites.sh,tools/check_security_invariants.sh,tools/test_security_invariants.sh,tools/check_test_plan_coverage.sh,tools/test_test_plan.sh,tools/test_git_hooks.sh,tools/test_git_hooks_parallel.sh,tools/test_ci_composition.sh,tools/check_ci_workflow_structure.sh,tools/check_agents_skills.sh,tools/check_as_built_sync_contract.sh,tools/check_as_built_docs.sh,tools/check_workflow_pair_sync.sh

A-F is projected over the existing seven repository phases. C/D require
the current requested task scope and Settings intersection. E/F remain plan-only
and cannot authorize a new C. The resolver, repository/product adapters,
verification and Security ownership, and enforce activation are complete. The
next safe action is to finish release proof and the configured Git/CI route.
Stop on unowned dirty state, invalid local
instruction memory, selection/mode mismatch, scope expansion, destructive or
credential work, repeated identical failure, or failed/unknown required CI.

## KeyWeave Studio Free Development Registration Handoff

Registration status: implemented. The synchronized parent scope is the registry schema, registry state, selection state, task tracker, and handoff only. Verification uses the product registry, product scaffold, and repository document-sync checks.

Restart context:

- `keyweave-studio` is the selected Free Development repository at `$HOME/projects/agent-toolbox/keyweave-studio` and is allowed only in the `free-development` context.
- The child remains an independent Git repository. The parent stores selection and workflow authority but does not own or merge child source history.
- The child declares `parent_managed` operation mode, has the standard product scaffold, and passed its local product gate, Chromium test, Trace Cue review, and the parent scaffold check before registration.
- The parent synchronization is intentionally limited to the five approved files listed above. No unrelated parent or external-product file is part of this change.
- GitHub repository creation, push, PR, remote CI execution, publication, and release remain unapproved external-state boundaries.

Next safe action:

- Continue implementation and local verification inside KeyWeave Studio. Request separate approval before creating or mutating a remote, and keep future parent synchronization limited to the governing policy group.

## Development Instruction Authority Layer Handoff

SYNC-ID: development_instruction_authority_layer_contract
STATUS: implemented
ARTIFACTS: AGENTS.MD,docs/workflow/AS_BUILT_SYNC_CONTRACT.tsv,docs/workflow/INSTRUCTION_MEMORY.md,docs/workflow/DEVELOPMENT_INSTRUCTION_POLICY.tsv,docs/workflow/DEVELOPMENT_AUTONOMY_WORKFLOW.tsv,docs/workflow/REPOSITORY_DEVELOPMENT_WORKFLOW.tsv,docs/workflow/REPOSITORY_DEVELOPMENT_RUNNER_POLICY.tsv,learning/REPOSITORY_DEVELOPMENT_APPROVALS.tsv,docs/workflow/PRODUCT_REPOSITORY_STRUCTURE.tsv,free-development/FREE_DEVELOPMENT_MODE.md,templates/TEMPLATES.md,guides/DOCUMENT_MAP.md,docs/workflow/REPOSITORY_DOCUMENT_SYNC.md,docs/workflow/REPOSITORY_DOCUMENT_SYNC_POLICY.json,tools/lib/development_instruction.mjs,tools/check_development_instruction.sh,tools/test_development_instruction.mjs,docs/workflow/SAFEFLOW_SECURITY_BACKFILL.tsv,docs/workflow/PRODUCT_SECURITY_POLICY.tsv,docs/workflow/TEST_PLAN_MANIFEST.tsv,docs/workflow/GIT_HOOK_CHECKS.tsv,docs/workflow/GIT_HOOK_PARALLEL_GROUPS.tsv,docs/workflow/FINAL_GATE_EXECUTION_POLICY.tsv,docs/workflow/FINAL_GATE_CI_GRAPH.tsv,docs/workflow/FINAL_GATE_GAP_COMMANDS.tsv,docs/workflow/FINAL_GATE_COVERAGE.tsv,docs/as-built/REQUIREMENTS.md,docs/as-built/SPECIFICATION.md,docs/as-built/IMPLEMENTATION_PLAN.md,docs/workflow/TASK_TRACKER.md,docs/workflow/HANDOFF.md
TESTS: tools/check_development_instruction.sh,tools/test_development_instruction.sh,tools/check_repository_document_sync.sh,tools/test_repository_document_sync.sh,tools/check_security_invariants.sh,tools/test_security_invariants.sh,tools/check_test_plan_coverage.sh,tools/test_test_plan.sh,tools/test_git_hooks.sh,tools/test_git_hooks_parallel.sh,tools/check_ci_workflow_structure.sh,tools/check_as_built_sync_contract.sh,tools/check_as_built_docs.sh,tools/check_workflow_pair_sync.sh,tools/check_agents_skills.sh,tools/check_lesson_structure.sh,tools/check_lesson14_structure.sh

Restart context:

- Scope is an additive resolver contract: invariant authority is the applicable
  `AGENTS.MD`; instruction authority is procedural only.
- A valid selected child-local instruction must win. Only exact absence may
  activate parent fallback; invalid and unsafe present states still block.
- Preserve existing result fields and add policy-derived structured/CLI state
  for invariant path, procedural scope, local state, precedence, and trigger.
- `DEVELOPER_MEMORY.md` and `SESSION_MEMORY.md` were initially protected from
  write/stage/commit actions. The developer later authorized their removal
  from Git management; their local contents remain untouched, optional, and
  ignored rather than permanent authority.
- TernWeave is the selected registry target. This parent synchronization does
  not authorize reading, testing, or changing that child repository.

The scoped resolver/test implementation, focused/medium checks, and exact
full/no-cache local release proof are complete; the full hook owner passed all
68 checks. Next safe action is the configured Git/PR/main-CI sequence. Any
failure returns to its owning implementation or document layer.

## Next Development Workflow Implementation Handoff

SYNC-ID: next_development_workflow_planning_contract
STATUS: planned
ARTIFACTS: .github/workflows/ci.yml,.github/workflows/lesson14-ci.yml,.gitignore,.node-version,.nvmrc,AGENTS.MD,README.md,dashboard-control-center/src/App.jsx,dashboard-control-center/src/dashboardData.js,dashboard-control-center/src/design-system.generated.css,dashboard-control-center/src/design-system.generated.js,dashboard-control-center/src/i18n.js,dashboard-control-center/src/styles.css,docs/as-built/IMPLEMENTATION_PLAN.md,docs/as-built/REQUIREMENTS.md,docs/as-built/SPECIFICATION.md,docs/design-system/dashboard-control-center/DESIGN_SYSTEM.md,docs/design-system/dashboard-control-center/components.json,docs/workflow/AS_BUILT_SYNC_CONTRACT.tsv,docs/workflow/DASHBOARD_DATA_SCHEMA.tsv,docs/workflow/FINAL_GATE_COVERAGE.tsv,docs/workflow/GIT_HOOK_CHECKS.tsv,docs/workflow/GIT_HOOK_PARALLEL_GROUPS.tsv,docs/workflow/HANDOFF.md,docs/workflow/PRODUCT_SECURITY_POLICY.tsv,docs/workflow/REPOSITORY_DEVELOPMENT_WORKFLOW.tsv,docs/workflow/SAFEFLOW_SECURITY_BACKFILL.tsv,docs/workflow/TASK_TRACKER.md,docs/workflow/TEST_PLAN_MANIFEST.tsv,docs/workflow/next-workflow/authority-lifecycle.json,docs/workflow/next-workflow/context-impact.json,docs/workflow/next-workflow/fixtures/compatibility-profiles.json,docs/workflow/next-workflow/parent-child-authority.json,docs/workflow/next-workflow/provider-registry.json,docs/workflow/next-workflow/shadow-compatibility.json,docs/workflow/next-workflow/state-store.json,docs/workflow/next-workflow/team-agent-security.json,guides/DOCUMENT_MAP.md,learning/NEXT_WORKFLOW_ACTIVATION.json,learning/NEXT_WORKFLOW_AGENT_SELECTION_SETTINGS.json,learning/NEXT_WORKFLOW_PROVIDER_REGISTRY.json,learning/NEXT_WORKFLOW_RELEASE_TRUST.json,learning/NEXT_WORKFLOW_REPOSITORY_IDENTITY.json,package-lock.json,package.json,tests/playwright/dashboard-control-center.spec.js,tools/agent-selection-settings,tools/check_ci_workflow_structure.sh,tools/check_developer_memory_requirements.sh,tools/check_next_workflow.sh,tools/check_next_workflow_contracts.mjs,tools/check_next_workflow_contracts.sh,tools/dashboard,tools/dashboard-data,tools/dashboard-design-system,tools/dashboard-review-manifest,tools/docs-tour,tools/lib/next_workflow/agents.mjs,tools/lib/next_workflow/authority.mjs,tools/lib/next_workflow/compatibility.mjs,tools/lib/next_workflow/context.mjs,tools/lib/next_workflow/contracts.mjs,tools/lib/next_workflow/identity.mjs,tools/lib/next_workflow/migrations/001_initial.sql,tools/lib/next_workflow/migrations/002_saga_replay.sql,tools/lib/next_workflow/planning.mjs,tools/lib/next_workflow/projection.mjs,tools/lib/next_workflow/provider_discovery.mjs,tools/lib/next_workflow/providers.mjs,tools/lib/next_workflow/release.mjs,tools/lib/next_workflow/release_trust.mjs,tools/lib/next_workflow/runtime.mjs,tools/lib/next_workflow/saga.mjs,tools/lib/next_workflow/secret_policy.mjs,tools/lib/next_workflow/settings.mjs,tools/lib/next_workflow/store.mjs,tools/menu,tools/next-workflow,tools/next-workflow.mjs,tools/test_dashboard_browser_debug_manifest.sh,tools/test_dashboard_control_center.sh,tools/test_dashboard_data.sh,tools/test_dashboard_i18n.sh,tools/test_dashboard_schema.sh,tools/test_menu_prerequisites.sh,tools/test_next_workflow.sh,tools/test_next_workflow_agents.mjs,tools/test_next_workflow_agents.sh,tools/test_next_workflow_authority.mjs,tools/test_next_workflow_authority.sh,tools/test_next_workflow_child_isolation.mjs,tools/test_next_workflow_child_isolation.sh,tools/test_next_workflow_compatibility.mjs,tools/test_next_workflow_compatibility.sh,tools/test_next_workflow_context.mjs,tools/test_next_workflow_context.sh,tools/test_next_workflow_contracts.mjs,tools/test_next_workflow_contracts.sh,tools/test_next_workflow_identity.mjs,tools/test_next_workflow_identity.sh,tools/test_next_workflow_planning.mjs,tools/test_next_workflow_planning.sh,tools/test_next_workflow_projection_settings.mjs,tools/test_next_workflow_projection_settings.sh,tools/test_next_workflow_providers.mjs,tools/test_next_workflow_providers.sh,tools/test_next_workflow_release.mjs,tools/test_next_workflow_release.sh,tools/test_next_workflow_runtime.mjs,tools/test_next_workflow_runtime.sh,tools/test_next_workflow_saga.mjs,tools/test_next_workflow_saga.sh,tools/test_next_workflow_store.mjs,tools/test_next_workflow_store.sh,vite.config.mjs
TESTS: tools/check_next_workflow.sh,tools/test_next_workflow.sh,tools/test_dashboard_schema.sh,tools/test_dashboard_data.sh,tools/test_dashboard_settings.sh,tools/test_dashboard_i18n.sh,tools/test_dashboard_control_center.sh,tools/check_dashboard_design_system.sh,tools/check_test_plan_coverage.sh,tools/test_test_plan.sh,tools/check_security_invariants.sh,tools/check_ci_workflow_structure.sh,tools/check_as_built_sync_contract.sh,tools/check_as_built_docs.sh,tools/check_workflow_pair_sync.sh,tools/check_repository_development_workflow.sh,tools/test_repository_development_workflow.sh,tools/test_dashboard_browser_debug_manifest.sh

Restart context after local implementation:

- The developer directed that every agreed item in draft
  `next_development_workflow_draft_20260721` be fully implemented. The non-
  Control-Center runtime, compatibility, storage, recovery, and release owners
  are present. On 2026-07-22 the developer paused the remaining Control Center
  presentation and acceptance work; preserve its partial artifacts but do not
  count them as complete. The activation record remains fail-closed `planned`
  until that scope resumes and final delivery proof plus a separately proven
  activation transition pass.
- The target adds six descriptive lifecycle stages and L1-L5 rigor as
  independent axes above the existing seven execution phases. Legacy aliases
  remain E, F, A, B, C, and D for compatibility only.
- The design covers scoring and hard triggers, stage compression, task-wide
  independent perspectives, role boundaries, finite loops, L1-L4
  authorization, one L5 approval after implementation planning, Git/GitHub
  delivery, saved presets, effective runtime authority, unnecessary-approval
  suppression, parent-child adapters, provider-neutral Agent execution and
  selection, Control Center presentation, migration, and activation evidence.
- The canonical organization is the `Hierarchical Multi-Agent Team`.
  Layer 0 is the Orchestrator Agent. Layer 1 contains Lead Agents: Director as
  Value Design Lead, Planner as Planning Design Lead, Builder as Implementation
  Lead, Reviewer Gate as Independent Review Lead, and Validator as Safety and
  Acceptance Decision Lead. Layer 2 contains bounded Task Agents. Developer /
  Owner is the human authority outside the team, and Runtime / Tools is a
  non-agent capability plane.
- Normal display uses Orchestrator Agent, Lead Agent, and Task Agent. `Workflow
  Orchestrator` and `subagent` remain compatibility vocabulary only; `SKILL.md`
  packages are reusable instruction assets, not an agent type or team layer.
- The Orchestrator Agent is the main agent and may create authorized Lead
  Agents. Leads may create only bounded Task Agents. The initial topology ends
  at depth 2; Task Agents cannot delegate. Depth counts actual Agent Runs. L1
  creates no separate agent and the Orchestrator acts under compressed Lead
  roles. L2 may create at most one Lead Agent and no Task Agent; needing Task
  delegation raises effective rigor to at least L3. L3-L5 instantiate only the
  agents required for role ownership and nonduplicative independent-
  perspective coverage.
- Agent execution uses a provider-neutral registry with the canonical identity
  tuple execution provider, model publisher, agent product, adapter,
  `cli_process|api_request|local_runtime` transport, and model. Provider-native
  reasoning observation, derived normalized-effort profile, and capability are
  separate fields. Initial certification targets Codex/OpenAI, Claude Code/
  Anthropic, and Gemini/Google; exact CLI/API capability combinations and
  mappings are P0 verification decisions rather than hard-coded assumptions.
  Local model families such as Qwen are reached through registered local-
  runtime or compatible API/CLI adapters.
- Control Center presents the Hierarchical Multi-Agent Team organization and
  lets the developer set each configurable Agent or applicable team default to
  Auto, Manual, or Inherit. Every mode, including custom and local entries,
  uses the same schema, security, compatibility, certification, attestation,
  freshness, revocation, authority, and budget eligibility floor. Inherit uses
  the fixed nearest-scope order Agent → role → team → repository → workflow
  context → global; a present invalid/stale/uncertified/revoked value blocks
  instead of silently falling through. Fallback closes the old launch intent
  and creates a new selection, authority decision, and intent. Custom providers,
  CLIs, APIs, local runtimes, and model entries use versioned schema-backed
  registration, hardened structured argv or typed requests, exact executable/
  endpoint boundaries, and scoped secret references only. CLI execution is
  descriptor-pinned or equivalently race-free; response files are private,
  bounded, and short-lived. Destination class/address is revalidated after DNS
  and before every connection/redirect/proxy/nested-tunnel hop; intended peer
  identity, SNI, and certificate policy are revalidated at every TLS handshake,
  including TLS proxies and nested tunnels. Private, loopback, link-local,
  metadata, and Unix-socket destinations require an exact local-runtime endpoint
  policy and ordinary network permission cannot grant the exception. Resolved
  secrets use only an explicitly authorized ephemeral channel. Arbitrary shell
  templates, raw secrets, implicit runtime starts,
  downloads, and installs are forbidden.
- Every launch preserves four immutable configurations: requested, selected,
  effective, and actual-observed provider identity/configuration. Native
  reasoning is observed; normalized effort is derived with mapping provenance,
  never reported as an observed provider fact. Unsupported mappings,
  unavailable configuration, stale/expired/revoked certification, clock/drift/
  outage uncertainty, or mismatch blocks. A fallback or new automatic choice
  is a fresh visible selection and launch decision, never a silent
  substitution. Native subagent, API, and local-runtime transports are
  conditional adapters and are eligible only when they expose enough evidence
  to satisfy the same policy and attestation requirements.
- Certification uses the implemented canonical
  `CANDIDATE|CERTIFIED|EXPIRED|REVOKED|FAILED|DEGRADED|UNAVAILABLE|REPROBE_REQUIRED` lifecycle. Only
  `CERTIFIED` records are eligible; every recovery starts a fresh probe lineage,
  and revocation or drift fails closed.
- Delegation is bounded by `may_delegate`, depth, total-agent, parallel,
  run-time/token/cost, retry, role/action/tool, sandbox/capability, and file
  ownership limits. Investigation, planning, review, and validation default to
  read-only. Concurrent writes require disjoint ownership and recorded
  integration order. At L1 the Orchestrator under the compressed Implementation
  Lead role is the sole writer; at L2 it or one instantiated Implementation
  Lead is the sole writer; at L3-L5 Implementation Leads or explicitly owned
  Task Agents write. Task results require Lead review and Orchestrator
  acceptance, and instantiated Independent Review/Safety and Acceptance
  Decision Leads remain independent from writes.
- A Validator safety `STOP` is immutable for the same decision fingerprint.
  Neither Orchestrator integration nor Developer/Owner approval may relabel it
  `PASS`; re-entry requires a material change, linked fresh decision, and new
  Validator evaluation.
- Agent prompts carry trusted control instructions separately from bounded
  untrusted data. Repository content, external documents, logs, provider
  responses, generated content, and Agent results cannot grant role, scope,
  authority, or executable instructions. Agent results remain candidates until
  schema/provenance/authority checks, Lead review, Orchestrator acceptance, and
  Validator disposition pass.
- The reviewed parent-child extension makes `INSTRUCTION_MEMORY.md` the common
  bootstrap for the reusable workflow while preserving exact-one-source
  resolution. Procedural instruction selection remains separate from a new
  versioned parent management-policy composition layer; the child's applicable
  `AGENTS.MD` remains its invariant authority and the parent's full
  `AGENTS.MD` is never merged into it.
- Parent-managed rules compose by domain: stricter safety/privacy/rigor floors,
  intersected Git/provider/external-send/filesystem/network/runtime/cost
  ceilings, additive test/CI/review/dependency/license/release/document duties,
  exact child ownership of product docs/Git/CI/evidence, and advisory-only
  parent roadmap priority.
- The developer subsequently adopted an independent repository-local
  SQLite-backed `WorkflowStateStore` and a precision-first delivery optimizer.
  Git-managed authorities remain normative; the local ignored store owns only
  transactional operational state, event/outbox history, evidence references,
  and rebuildable projections. Parent and child repositories never share one
  live database, and TernWeave is an architecture reference rather than a code
  dependency.
- Correctness is a hard constraint and speed is optimized only among plans that
  preserve mandatory gates, traceability, non-regression, authority, and
  fail-closed unknown states. Planned speed mechanisms are bounded work-context
  compilation, typed change-impact closure, failure/progress signatures,
  critical-path scheduling with conflict/resource guards, minimum
  non-duplicative review coverage, schema-driven generation, and optional
  value-of-information ordering.
- The next workflow runtime is implemented but remains in fail-closed planned
  mode. Shadow comparison begins only after an explicit candidate freeze. Current
  execution remains governed by `AGENTS.MD`,
  `docs/workflow/INSTRUCTION_MEMORY.md`, existing policies, and existing tools
  until final activation evidence passes.
- Built-in Codex discovery resolves and fingerprints the installed CLI and its
  allowlisted script interpreter, observes installed version and visible model/
  reasoning data, and issues only short-lived observation-bound certifications.
  Other ecosystem, API, custom, and local-runtime paths remain ineligible until
  their own versioned adapter and equivalent evidence are configured; no model
  or transport is silently simulated.
- The default CLI executor retains the admitted executable and interpreter by
  descriptor through process handoff, uses structured argv and an allowlisted
  environment, creates an exclusive owner-only response file, and returns only
  bounded result metadata. API and local-runtime manifests and typed plans are
  validated, but operational dispatch is intentionally unavailable until a
  gateway-owned connection and ephemeral-secret transport can prove endpoint
  use and prevent secret retention.
- The production composition root owns the common SideEffectGateway and
  provider adapter and rejects provider-leg replacement. Agent launch remains
  unavailable unless independent actual-observation admission and containment
  are configured. Read-only status, catalog, projection, health, and release
  commands do not create repository identity or store files.
- Release tooling freezes only a clean exact candidate, binds artifacts and
  repository state by digest, verifies signed proof bundles only against
  configured Ed25519 public verifiers, and permits ordered confirmation-bound
  transitions. `learning/NEXT_WORKFLOW_RELEASE_TRUST.json` intentionally starts
  with no trusted verifier, so release admission fails closed and stores no
  private signing material.
- The child-local instruction resolution rule delivered under PR #33 remains a
  compatibility input to this implementation. Valid local remains
  first; only exact absence may use parent fallback; invalid local blocks. A
  common workflow profile loads reusable engine behavior without merging or
  copying instructions. Versionless/1.0.0 FrameCue/TraceCue-style instructions
  retain every stronger local approval/review obligation until a separate
  child-local semantic migration passes; unsupported or unparsed obligations
  remain manual/blocked rather than being silently downgraded.
- A valid child-local instruction cannot bypass parent Control Center Git and
  GitHub ceilings. Saved settings become global/context/repository scoped and
  versioned. Effective authority binds stable logical and checkout identities,
  one active parent relationship, task/run, instruction/policy/settings
  revisions, action/ref/SHA, approval, runtime capability, expiry, and
  revocation epoch, and is reevaluated just before every Git/provider side
  effect through one shared enforcement gateway.
- Existing Git `auto` and `after_approval` values retain their current explicit
  push/PR/merge approval semantics. Approval-free normal delivery under a saved
  preset requires a distinct versioned setting/value, Control Center preview/
  apply migration, and auditable receipt; missing or ambiguous migration state
  blocks. Legacy operation approval reason codes remain valid until that
  migration.
- `AuthorityDecision@1` becomes a tagged family for Git/provider effects, Agent
  launches, filesystem writes, adapter sends, runtime-service effects,
  artifact/dependency effects, and resource/cost effects. Launch decisions bind
  grant/intent/configuration/context/budget/targets; write decisions bind
  canonical targets, pre-write state, symlink policy, ownership, locks, and
  integration order. The pre-launch decision authorizes requested, selected,
  and effective configuration with actual-observed explicitly absent; a
  separate post-spawn run-admission decision verifies the actual observation and
  complete four-state attestation before `RUNNING`. Each target is reevaluated
  immediately before use. Daemon starts, downloads, installs,
  sockets, network use, disk reservations, and monetary/token cost can never
  arrive as implicit provider capability.
- The implemented AuthorityComposer and SideEffectGateway provide that typed
  composition and bind repository instance, relationship, task/run, target,
  instruction/policy/settings revisions, runtime capability, expiry, and
  revocation. Shadow mode deliberately keeps the legacy workflow authoritative
  until final activation proof.
- Cross-repository work is a Saga: persist local state and external-effect
  intent first, exchange only bounded versioned messages/projections, then
  reconcile receipts. Crash-after-push/PR/merge recovery observes the exact
  provider object, reconstructs a matching receipt, and stops on unknown or
  conflicting outcome. The design does not promise exactly-once external
  effects or share one live database.
- Every Saga effect/receipt binds a deterministic effect key, request and
  authority fingerprints, exact target/ref/SHA, expected provider object,
  attempt lineage, observation, recovery disposition, and verifiable message/
  receipt authenticity proof. Irreversible merge never claims automatic
  compensation. Rollback first fences new effects, then drains or quarantines
  in-flight work and reservations, restores compatible state, verifies it, and
  only then records `ROLLED_BACK`.
- Stable relationship identity distinguishes rename/move, reclone, and fork;
  zero, multiple, revoked, stale, or ambiguous parent relationships block.
  Offline work is limited to stages 1-4 with a valid unexpired baseline and
  non-external/non-destructive stage-5 local work; stage 6 blocks at commit
  without current parent authority. Local-only work stays `LOCAL_ONLY`, parent
  completion stays `UNSYNCED` until receipt. Graceful archive uses
  `ACTIVE → DRAINING → ARCHIVED`, allowing only pre-existing authorized
  reconciliation/drain before revocation; emergency `REVOKED` permits no send
  and quarantines pending intents. Evidence remains read-only.
- P0 finalized lifecycle/phase mapping, rigor and finite-loop decisions,
  immutable STOP, team and provider contracts, parent-child management and
  tagged authority, Saga recovery, context/impact planning, SQLite storage, and
  shadow compatibility in seven dependency-ordered JSON authorities.
- P0 is seven dependency-ordered contract slices: authority/lifecycle;
  team/agent security; provider registry; parent-child authority; context/
  impact; state store; and shadow compatibility. P1 implements the store, then
  common authority gateway, impact planner/scheduler, WorkContextFrame,
  provider registry/adapters, Hierarchical Multi-Agent Team/common launcher,
  Saga adapter/reconciliation, and producer-owned Control Center data in
  producer-before-consumer order. P2 implements presentation, compatibility/
  storage/legacy migration and shadow comparison first; then completes release,
  data-recovery, fenced-rollback, archive/decommission, and outbox drain/
  quarantine proof; explicit activation is the final atomic transition.
- Control Center must distinguish requested, selected, effective, and actual-
  observed configurations and label `Choose provider/model manually` separately
  from `Manual Git delivery`; provider choice never grants execution or Git
  authority. It previews inheritance before apply and applies settings atomically
  with a revisioned receipt. Guarded revert requires a fresh dry-run, current-
  revision match, and certification/eligibility/authority revalidation. The
  chart and semantic comparison table are functionally equivalent and retain
  parent/layer, role, source, four-state, certification, blocker, remediation,
  keyboard/focus, label, contrast, and screen-reader information. The persistent
  banner means: `planned`/`shadow` grant no new authority, `enforced` is active,
  and `rolled_back` uses the restored legacy path with new actions disabled.
- On 2026-07-22 the developer paused Control Center implementation and review
  for later reconsideration. Preserve the current partial work, but keep phase
  18 presentation, final TraceCue/browser proof, and developer acceptance
  explicitly unfinished. Do not modify Control Center code while completing
  the remaining non-Control-Center owners, and do not use prior partial UI
  evidence to claim activation readiness.
- One release-candidate fingerprint binds exact local release, PR/main CI,
  synchronization, recovery, fenced rollback, archive/decommission, and outbox
  drain/quarantine evidence. Any material candidate change returns the workflow
  to shadow comparison under a new proof lineage.
- Both local memory files remain Git-ignored temporary records. This closure
  did not write their current local bytes and does not claim that those bytes
  equal the last tracked snapshots; their staged index-only removal from Git
  tracking must not be reversed by this work.
- All permanent synchronization in this implementation contract is English.
  Progress is reported at least every 15 minutes from verified weighted units;
  work merely started is not counted as complete.
- TraceCue, FrameCue, TernWeave, KeyWeave Studio, the SafeFlow reference
  repository, and all other child/external repositories remain unmodified.
  Parent verification uses policy files and isolated fixtures, not live child
  traversal or child evidence substitution.
- Independent read-only CLI audits of requirements/specification consistency,
  slice ownership/order, provider and authority security, distributed recovery,
  legacy compatibility, and non-engineer Control Center usability were
  incorporated into this permanent contract. Their temporary raw reports are
  not permanent authorities.

Historical next action: the non-UI baseline originally kept Production
unavailable until later Control Center acceptance. That sequencing is
superseded by the later headless Production enablement block. The isolated
profile remains non-production, but the separately protected headless profile
may activate from exact local/PR/main/synchronization and recovery evidence
without changing Control Center code.

## Non-UI Runtime Wiring Handoff

SYNC-ID: next_workflow_non_ui_runtime_wiring
STATUS: implemented
ARTIFACTS: docs/as-built/IMPLEMENTATION_PLAN.md,docs/as-built/REQUIREMENTS.md,docs/as-built/SPECIFICATION.md,docs/workflow/AS_BUILT_SYNC_CONTRACT.tsv,docs/workflow/HANDOFF.md,docs/workflow/TASK_TRACKER.md,docs/workflow/next-workflow/authority-lifecycle.json,docs/workflow/next-workflow/provider-registry.json,docs/workflow/next-workflow/state-store.json,docs/workflow/next-workflow/team-agent-security.json,learning/NEXT_WORKFLOW_AGENT_SELECTION_SETTINGS.json,learning/NEXT_WORKFLOW_PROVIDER_REGISTRY.json,tools/lib/next_workflow/agents.mjs,tools/lib/next_workflow/authority.mjs,tools/lib/next_workflow/contracts.mjs,tools/lib/next_workflow/migrations/003_runtime_wiring.sql,tools/lib/next_workflow/provider_discovery.mjs,tools/lib/next_workflow/providers.mjs,tools/lib/next_workflow/run_lifecycle.mjs,tools/lib/next_workflow/runtime.mjs,tools/lib/next_workflow/runtime_barrier.cjs,tools/lib/next_workflow/runtime_containment.mjs,tools/lib/next_workflow/runtime_trust.mjs,tools/lib/next_workflow/settings.mjs,tools/lib/next_workflow/store.mjs,tools/lib/next_workflow/task_delivery.mjs,tools/next-workflow.mjs,tools/test_next_workflow.sh,tools/test_next_workflow_agents.mjs,tools/test_next_workflow_authority.mjs,tools/test_next_workflow_isolated_runtime.mjs,tools/test_next_workflow_isolated_runtime.sh,tools/test_next_workflow_projection_settings.mjs,tools/test_next_workflow_providers.mjs,tools/test_next_workflow_release.mjs,tools/test_next_workflow_run_lifecycle.mjs,tools/test_next_workflow_run_lifecycle.sh,tools/test_next_workflow_saga.mjs,tools/test_next_workflow_store.mjs,tools/test_next_workflow_task_delivery.mjs,tools/test_next_workflow_task_delivery.sh
TESTS: tools/check_next_workflow.sh,tools/test_next_workflow.sh,tools/check_security_invariants.sh,tools/check_as_built_sync_contract.sh,tools/check_as_built_docs.sh,tools/check_workflow_pair_sync.sh,tools/check_repository_development_workflow.sh,tools/test_repository_development_workflow.sh

Next Step:

- Deliver the completed dependency-ordered non-UI slices through the configured
  commit, PR CI, merge, main CI, and local/remote synchronization route.
- Use the clean isolated checkout created from current `origin/main`. Do not
  touch the developer-owned dirty Control Center checkout or include any
  Control Center, Dashboard schema/design/test, package, Vite, browser, or MCP
  path in this delivery.
- Keep the production composition and externally reachable launch surfaces
  unavailable. The isolated authority profile may exercise production-shaped
  owners only against explicit fixture repositories, temporary state, bounded
  local processes, and no production credentials, Git delivery, registered
  child traversal, or external network effect.
- The non-UI runtime uses per-run Linux namespaces and Bubblewrap rather than a
  container platform. `node tools/next-workflow.mjs runtime isolation-check`
  reports availability and non-installing OS-specific guidance. Missing
  isolation stops only dependent CLI work and never enables an unisolated
  fallback.
- Protected trust is recursively immutable; the production-shaped store and
  isolated composition require exact protected verifier fingerprints, not
  matching IDs or duck-typed methods. PID/process-group identity and launch
  evidence are durable before provider execution is released. A pinned
  two-stage barrier treats controller EOF as permanent non-release and keeps
  provider code blocked until fenced recovery. The contained-process identity
  and descriptor-pinned private output directory remain independently
  verifiable across controller restart and pathname replacement.
- The provider-neutral lifecycle port and authority-fenced CLI executor are
  accepted only when created by their protected factories; matching booleans
  or method names grant no execution authority. Prompt fingerprinting uses
  positional reads, so the exact pinned task input still reaches child stdin
  from byte zero.
- Each CLI task starts in a private task-envelope directory without a repository
  or Git mount. Launch confirmation is limited to the pinned executable,
  certified manifest, and observed CLI arguments; task self-report never
  authenticates the selected model or effort.
- A completed CLI response remains an unaccepted `AgentResultCandidate` until
  independent Lead, Orchestrator, and Validator records close the run. The
  dedicated lifecycle writer reloads the exact three assignments and reviews,
  relations, and events and cannot be bypassed through generic or direct
  lifecycle commit. Owner/task model policy is restrictively composed,
  nonempty bounds and matching budgets fail closed, and delivery is rechecked
  immediately before receipt finalization. Candidate insertion reloads the
  completed runtime run, exact relation/event topology, and protected launch/
  admission receipts. Protected stores accept runtime writes only through an
  unexposed capability bound to that exact store, recovery-only authority is
  preserved across restart termination, candidates bind the exact frozen
  launch request and deterministic durable launch/admission lineage, and agent authority records require a same-trust
  protected verifier; launch revalidates
  current resource, cost, and explicit timeout bounds against its persisted
  reservation; completed-run replay preserves the stored result fingerprint.
- Metered API providers are represented by the same registry and selection
  contracts, including secret references, endpoint policy, cost ceilings, and
  model/publisher deny lists. Actual paid API transport remains unavailable
  until its gateway-owned security and idempotency owners are configured.
- Treat the checked-in release trust and prerequisite documents as descriptive
  candidate data only. Activation trust and owner acceptance must be supplied
  by a protected owner-managed source outside the candidate and remain absent
  for this delivery.
- The 24-suite Next Workflow aggregate currently passes, and the
  clean-candidate canonical repository aggregate passes. The final delivery
  gate still requires PR CI, merge, main CI, and local/remote synchronization.
  The resulting state is non-UI wiring implemented, production unavailable,
  Activation `planned`, and Control Center reconstruction pending.
- When a production AgentLauncher composition is intentionally enabled, add a
  protected happy-path launch-through-review-closure integration fixture. This
  future coverage item does not authorize Activation or a production adapter
  in the current planned state.

The earlier handoff instruction to wait for Phase 18 before beginning runtime
wiring is superseded by this block. Phase 18 remains a later, separately
rebaselined Control Center reconstruction and acceptance task; full Activation
and immutable same-candidate release evidence remain later still.

When Control Center work resumes, add a plain-language isolation status,
copyable installation guidance, a recheck action, provider billing-mode
selection, model/publisher restrictions, and API cost ceilings. Do not
auto-install packages or change administrator-controlled namespace policy.

Non-Control-Center closure evidence on 2026-07-22:

SYNC-ID: next_development_workflow_non_ui_security_closure
STATUS: implemented
ARTIFACTS: docs/as-built/IMPLEMENTATION_PLAN.md,docs/as-built/REQUIREMENTS.md,docs/as-built/SPECIFICATION.md,docs/workflow/AS_BUILT_SYNC_CONTRACT.tsv,docs/workflow/HANDOFF.md,docs/workflow/TASK_TRACKER.md,learning/NEXT_WORKFLOW_RELEASE_PREREQUISITES.json,tools/check_document_organization.sh,tools/lib/document_paths.sh,tools/lib/next_workflow/agents.mjs,tools/lib/next_workflow/authority.mjs,tools/lib/next_workflow/compatibility.mjs,tools/lib/next_workflow/contracts.mjs,tools/lib/next_workflow/identity.mjs,tools/lib/next_workflow/projection.mjs,tools/lib/next_workflow/provider_discovery.mjs,tools/lib/next_workflow/providers.mjs,tools/lib/next_workflow/release.mjs,tools/lib/next_workflow/runtime.mjs,tools/lib/next_workflow/saga.mjs,tools/lib/next_workflow/store.mjs,tools/next-workflow.mjs,tools/test_lesson_repository.sh,tools/test_next_workflow_agents.mjs,tools/test_next_workflow_authority.mjs,tools/test_next_workflow_compatibility.mjs,tools/test_next_workflow_contracts.mjs,tools/test_next_workflow_identity.mjs,tools/test_next_workflow_projection_settings.mjs,tools/test_next_workflow_providers.mjs,tools/test_next_workflow_release.mjs,tools/test_next_workflow_runtime.mjs,tools/test_next_workflow_saga.mjs,tools/test_next_workflow_store.mjs
TESTS: tools/check_developer_memory_requirements.sh,tools/check_document_organization.sh,tools/check_lesson_structure.sh,tools/check_lesson14_structure.sh,tools/check_next_workflow.sh,tools/test_next_workflow.sh,tools/check_as_built_sync_contract.sh,tools/check_as_built_docs.sh,tools/check_workflow_pair_sync.sh,tools/check_repository_development_workflow.sh,tools/test_repository_development_workflow.sh

- The historical closure aggregate passed 192 tests across 14 standalone
  suites, and the seven frozen P0 contracts passed fingerprint validation.
- Relationship initialization, Relationship transitions, and activation
  lifecycles now have dedicated atomic store writers; generic record insertion
  cannot forge their records or transitions. Recovery
  mode clears immediately after the last recovery transaction is finalized.
- Read-only store opening and health now reject migration name/state/checksum,
  stored schema identity, and physical `sqlite_schema` drift without silently
  re-blessing it. Parsed versionless or unknown instruction profiles block, and
  approval grants need exact independently verified proof binding before an
  ALLOW decision.
- Global fencing invalidates every older persisted delegation grant before a
  reservation, reviewer assignment, or launch can reuse it. Reconciliation is
  restricted to one effect-bound receipt proof and shares the protected-record
  guard used by generic commits. Existing stores with deleted schema, identity,
  revision, or revocation metadata stop without recreating those rows.
- Writable grants are re-contained under the persisted Implementation Lead at
  creation, dedicated persistence, and launch-chain resolution. Effect intent
  commit and the atomic dispatch claim require the live authority epoch; a
  fence immediately before adapter dispatch moves the claim to manual recovery
  and quarantines its outbox without dispatch.
- Saga acceptance rereads and binds the current persisted Relationship record,
  fingerprint, peers, lease, key, state, and global epoch in its replay
  transaction. Activation records require exact revision/source/event topology,
  and signed transition evidence must carry the frozen candidate repository
  head. Missing, changed, or post-signature-fenced state stops without replay
  advancement.
- Store bootstrap preflight treats only an application-schema-empty SQLite
  container as fresh; any nonempty database missing `store_meta` or
  `schema_migrations` stops before migration. Forward activation retains one
  live authority epoch, final enforcement independently reverifies every
  transition signature inside the locked transaction, and runtime trust fails
  immediately after a fence. Cached verifier output cannot authorize it.
- State import/restore now needs an independent verifier bound to the complete
  artifact, manifest, identity, schema, revision, and epoch before publishing
  or quarantining. Depth-1 grants are rooted only at the canonical Orchestrator,
  stale non-revoking Relationship transitions stop after a fence, and release
  proofs bind candidate HEAD through the same PR number to the main merge and
  synchronized `origin/main` heads.
- Agent launch resolves the persisted grant before binding the CLI sandbox.
  The successor non-UI slice replaced this closure's repository-root execution
  with a private task-envelope directory and no repository/Git mount. Receipt finalization recomputes the locked
  effect/observation identity and reruns a store-configured independent
  verifier, while generic commits and finalization repeat revision CAS inside
  `BEGIN IMMEDIATE`. The provider adapter carries the exact epoch/fence to the
  executor; the built-in executor refuses operational dispatch because it
  cannot enforce a downstream fence, leaving production wiring safely pending.
  The fence writer now locks and CAS-checks revision/epoch before mutation, so
  stale gateway requests cannot revoke and then report a conflict afterward.
- Candidate definitions, accepted prerequisites, current repository state,
  content-specific signed proofs, independent reviewer identities, grant
  containment, trusted provider certification, authoritative retries, and
  parent-management trust bindings are enforced and adversarially tested.
- Provider discovery requires distinct injected probe and certification
  authorities; CLI response directories are exact owner-only `0700` and remain
  descriptor-pinned across child execution, readback, and cleanup. Pre-spawn
  Agent admission binds current registry evidence, provider plan, persisted
  selection, unspent reservation, targets, one authority/revocation epoch, the
  complete persisted parent chain, and child/parent-contained write ownership
  before any spawn. Read-only ownership cannot carry a writable sandbox.
- Kind-specific verified writers own DelegationGrant, reviewer assignments,
  review dispositions, Validator decisions, and resource reservations; no
  public generic protected-record sink remains. Persisted grants require full
  finite-freshness/topology reconstruction, and Agent authority/result writes
  reject stale epochs after a global fence. Relationship and activation
  writers rerun independent proof verification against the locked current row
  inside the committing transaction; Relationship transitions bind exact
  lineage, sequential revision, lifecycle, source revision, and event. Enforced
  projection reconstructs the
  complete signed release and transition lineage rather than trusting structural
  shape or a reusable same-candidate proof bundle.
- `tools/next-workflow runtime status`, `runtime effect-preview`, and
  confirmation-bound `runtime reconcile` install the common runtime composition
  in the executable surface. Any missing operational authority, observer,
  receipt verifier, API transport, or local-runtime transport stops safely.
- `tools/next-workflow release proofs-verify` now reaches the signed verifier
  through the executable CLI and is protected by a regression smoke test.
- `learning/NEXT_WORKFLOW_RELEASE_PREREQUISITES.json` is the mechanical
  fail-closed record of the developer-paused Control Center prerequisite. It
  remains paused and unaccepted. Control Center implementation, TraceCue/
  browser review, and developer acceptance remain explicitly unfinished for
  later resumption; no Control Center code was changed in this closure.
- Parent document synchronization now has a non-exemptible Next Workflow core
  classification. The PR/push range must contain the complete as-built,
  instruction, verification, Security, CI, and workflow-state authorities;
  parent CI still never traverses child repositories. Git-hook evidence also
  handles the observed nested-sandbox status-zero/post-exec-`EPERM` condition
  without accepting nonzero or ambiguous output, and its final-gate regression
  passed five consecutive runs.
- Follow-up verification is environment-honest: the isolation diagnostic always
  runs, real containment cases run on capable hosts, and incapable hosts report
  those cases as explicit skips after verifying installation or OS-policy
  guidance. This is a test portability correction only; runtime containment
  still fails closed and no unisolated fallback exists.

Development-session automatic selection is an implemented precursor to the
headless Production slice below.

SYNC-ID: next_workflow_development_agent_auto_selection
STATUS: implemented
ARTIFACTS: docs/as-built/IMPLEMENTATION_PLAN.md,docs/as-built/REQUIREMENTS.md,docs/as-built/SPECIFICATION.md,docs/workflow/AS_BUILT_SYNC_CONTRACT.tsv,docs/workflow/HANDOFF.md,docs/workflow/INSTRUCTION_MEMORY.md,docs/workflow/TASK_TRACKER.md,docs/workflow/TEST_PLAN_MANIFEST.tsv,learning/NEXT_WORKFLOW_AGENT_SELECTION_SETTINGS.json,skills/repository-development-workflow/SKILL.md,skills/repository-development-workflow/references/repository-development.md,tools/lib/next_workflow/provider_discovery.mjs,tools/lib/next_workflow/providers.mjs,tools/lib/next_workflow/settings.mjs,tools/next-workflow.mjs,tools/test_next_workflow.sh,tools/test_next_workflow_development_selection.mjs,tools/test_next_workflow_development_selection.sh
TESTS: tools/check_next_workflow.sh,tools/test_next_workflow.sh,tools/check_as_built_sync_contract.sh,tools/check_as_built_docs.sh,tools/check_workflow_pair_sync.sh,tools/check_repository_development_workflow.sh,tools/test_repository_development_workflow.sh

Implement the read-only development advisory selector before the next Lead or
Task Agent CLI launch. It must use the installed provider's official bounded
catalog, saved nearest-scope model policy, role, rigor, risk, and complexity;
emit exact model/effort configuration and a deterministic fingerprint; and
verify the prepared launch values. It must not issue provider certification,
claim backend attestation, activate production, grant Git/network/API authority,
or touch the paused Control Center.

The initial saved allowlist is GPT-5.6 Sol, Terra, and Luna only. GPT-5.5 is
available only after an explicit later policy change; GPT-5.4 is not included.

Headless Production enablement is implemented and is the active delivery.

SYNC-ID: next_workflow_headless_production_enablement
STATUS: implemented
ARTIFACTS: docs/as-built/IMPLEMENTATION_PLAN.md,docs/as-built/REQUIREMENTS.md,docs/as-built/SPECIFICATION.md,docs/workflow/AS_BUILT_SYNC_CONTRACT.tsv,docs/workflow/DEVELOPMENT_INSTRUCTION_POLICY.tsv,docs/workflow/FINAL_GATE_GAP_COMMANDS.tsv,docs/workflow/HANDOFF.md,docs/workflow/INSTRUCTION_MEMORY.md,docs/workflow/TASK_TRACKER.md,docs/workflow/TEST_PLAN_MANIFEST.tsv,learning/NEXT_WORKFLOW_RELEASE_PREREQUISITES.json,tools/lib/next_workflow/agents.mjs,tools/lib/next_workflow/headless_bootstrap.mjs,tools/lib/next_workflow/headless_plan.mjs,tools/lib/next_workflow/headless_runtime.mjs,tools/lib/next_workflow/headless_service.mjs,tools/lib/next_workflow/provider_discovery.mjs,tools/lib/next_workflow/release_signing.mjs,tools/lib/next_workflow/release_source_receipts.mjs,tools/lib/next_workflow/run_controller.mjs,tools/lib/next_workflow/run_lifecycle.mjs,tools/lib/next_workflow/runtime_barrier.cjs,tools/lib/next_workflow/runtime_containment.mjs,tools/lib/next_workflow/runtime_trust.mjs,tools/next-workflow.mjs,tools/test_next_workflow.sh,tools/test_next_workflow_agents.mjs,tools/test_next_workflow_headless_bootstrap.mjs,tools/test_next_workflow_headless_bootstrap.sh,tools/test_next_workflow_headless_plan.mjs,tools/test_next_workflow_headless_plan.sh,tools/test_next_workflow_headless_runtime.mjs,tools/test_next_workflow_headless_runtime.sh,tools/test_next_workflow_release_signing.mjs,tools/test_next_workflow_release_signing.sh,tools/test_next_workflow_run_controller.mjs,tools/test_next_workflow_run_controller.sh
TESTS: tools/check_next_workflow.sh,tools/test_next_workflow.sh,tools/check_as_built_sync_contract.sh,tools/check_as_built_docs.sh,tools/check_workflow_pair_sync.sh,tools/check_repository_development_workflow.sh,tools/test_repository_development_workflow.sh

The reusable headless service now resolves the saved model policy, discovers and
certifies the pinned Codex CLI, selects model and native effort per actual
Agent role, and launches only through the protected gateway and real Linux
containment. Startup reconciles prior unknown outcomes. Results remain
candidates until three separately launched Lead, Orchestrator, and Validator
CLI reviewer runs close them. Their grants, reservations, result provenance,
and process identities remain distinct from the reviewed subject and each
other. Accepted outcomes report the pinned contained-CLI launch model and
effort; they do not claim remote-backend attestation.

The default execution preference remains automatic. An explicit
`single_agent` preference maps only to effective L1 and uses the Orchestrator
without Lead or Task Agent launches; hard-L5 conditions override it. A `team`
preference may raise but never lower rigor. Persisting this choice in the
Control Center remains part of the deferred UI reconstruction and does not
block the current CLI path.

The protected runtime remains fail closed until the main checkout has an
external signed Owner acceptance, protected trust, and an enforced
exact-candidate Activation record. Provider discovery is digest-authorized
before execution and runs inside non-networked isolation; certification and
observation freshness are rechecked before every launch. After the listed
delivery gates, freeze the complete Git tree, create fresh source-evidence
receipts, sign the eight proof kinds and six ordered transitions with the
distinct final-release key, activate the candidate, and run one bounded smoke
task. Runtime/status failures remain structured STOP results and never fall
back to legacy authority. Do not enable API/local transports, touch the paused
Control Center, or implement the separately deferred plans during this handoff.

This latest block supersedes every earlier handoff statement that required
Control Center acceptance before headless Activation or that kept the protected
headless AgentLauncher unavailable after this delivery. The isolated profile
and the separately deferred API/local/child-adapter plans remain unchanged.

SYNC-ID: next_workflow_headless_production_hardening
STATUS: implemented
ARTIFACTS: docs/as-built/IMPLEMENTATION_PLAN.md,docs/as-built/REQUIREMENTS.md,docs/as-built/SPECIFICATION.md,docs/workflow/AS_BUILT_SYNC_CONTRACT.tsv,docs/workflow/HANDOFF.md,docs/workflow/TASK_TRACKER.md,tools/lib/next_workflow/agents.mjs,tools/lib/next_workflow/headless_bootstrap.mjs,tools/lib/next_workflow/headless_plan.mjs,tools/lib/next_workflow/headless_service.mjs,tools/lib/next_workflow/release.mjs,tools/lib/next_workflow/run_controller.mjs,tools/lib/next_workflow/runtime_trust.mjs,tools/lib/next_workflow/store.mjs,tools/next-workflow-launcher.cjs,tools/next-workflow.mjs,tools/test_next_workflow.sh,tools/test_next_workflow_agents.mjs,tools/test_next_workflow_headless_bootstrap.mjs,tools/test_next_workflow_headless_plan.mjs,tools/test_next_workflow_headless_runtime.mjs,tools/test_next_workflow_run_controller.mjs,tools/test_next_workflow_store.mjs
TESTS: tools/check_next_workflow.sh,tools/test_next_workflow.sh,tools/check_as_built_sync_contract.sh,tools/check_as_built_docs.sh,tools/check_workflow_pair_sync.sh,tools/check_repository_development_workflow.sh,tools/test_repository_development_workflow.sh

The current candidate includes the post-audit trust-boundary hardening. Local
aggregate tests pass. Production commands must be invoked through the external
launcher installed by the four-step isolation/enrollment/acceptance/bootstrap
procedure; direct team execution and mutating recovery stop. External trust
binds the Owner anchor, provider executable, database generation, and launcher
wrapper, script, and interpreter digests. Use
`<runtime_launcher_path> <absolute-repository-path> team run --task
<repository-relative-json>` where `runtime_launcher_path` is the absolute value
returned by bootstrap. The wrapper starts from a clean environment before Node
loads; the launcher independently verifies the complete signed release and
transition lineage, externally enrolled repository identity and state
generation, and exact clean deployed Git content before candidate imports.

Automatic execution preference is operational: `auto` derives L1-L5,
`single_agent` is limited to effective L1, and `team` may raise L1 to L2.
Hard-L5 signals always win. The team surface honestly stops on L1 until a
direct Orchestrator executor exists. Open Agent Runs block later work and
candidate-backed runs can be authorization-closed to STOP during recovery.

Next, run the final independent CLI security, architecture/recovery, and
operations/document audits. Resolve every blocking finding, pass permanent
document and repository workflow gates, then perform commit/PR/CI/merge/main-CI
sync. Bootstrap and activate only the exact merged candidate, and run one
bounded smoke task through the installed launcher. Do not modify Control Center
source; its reconstruction remains developer-timed.

## Headless launcher audit-closure handoff

SYNC-ID: next_workflow_headless_launcher_closure
STATUS: implemented
ARTIFACTS: docs/as-built/IMPLEMENTATION_PLAN.md,docs/as-built/REQUIREMENTS.md,docs/as-built/SPECIFICATION.md,docs/workflow/AS_BUILT_SYNC_CONTRACT.tsv,docs/workflow/HANDOFF.md,docs/workflow/INSTRUCTION_MEMORY.md,docs/workflow/TASK_TRACKER.md,docs/workflow/TEST_PLAN_MANIFEST.tsv,tools/lib/next_workflow/headless_bootstrap.mjs,tools/lib/next_workflow/headless_plan.mjs,tools/lib/next_workflow/runtime_trust.mjs,tools/lib/next_workflow/store.mjs,tools/next-workflow-launcher.cjs,tools/test_next_workflow.sh,tools/test_next_workflow_headless_bootstrap.mjs,tools/test_next_workflow_headless_plan.mjs,tools/test_next_workflow_launcher.mjs,tools/test_next_workflow_launcher.sh,tools/test_next_workflow_store.mjs
TESTS: tools/check_next_workflow.sh,tools/test_next_workflow.sh,tools/check_as_built_sync_contract.sh,tools/check_as_built_docs.sh,tools/check_workflow_pair_sync.sh,tools/check_repository_development_workflow.sh,tools/test_repository_development_workflow.sh

The final audit closure removes the remaining pre-candidate trust gaps. The
bootstrap-returned `runtime_launcher_path` is now a POSIX wrapper that starts a
pinned interpreter from a clean environment and a separate read-only verifier.
The verifier accepts no compiled repository name and independently checks the
protected identity/generation, signed Activation lineage, signed deployed merge
SHA, Git tree, and artifact content before importing repository code.

Root and child task content now feed safety-only rigor classification, so a
benign root cannot hide a hard-L5 child. Unresolved Agent Runs now place the
store in recovery-only mode after restart. Direct repository `team run` and
mutating reconcile remain forbidden; use the absolute installed launcher
command documented in `INSTRUCTION_MEMORY.md`.

Focused audit-closure tests pass. The remaining handoff is to rerun the complete
aggregate and permanent document gates, obtain PASS from the three independent
CLI audits, deliver through PR/main CI, bootstrap and activate only the exact
merged candidate, and execute a bounded installed-launcher smoke task. The
paused Control Center and separately deferred plans remain untouched.

## Headless Production final security-closure handoff

SYNC-ID: next_workflow_headless_final_security_closure
STATUS: implemented
ARTIFACTS: AGENTS.MD,docs/as-built/IMPLEMENTATION_PLAN.md,docs/as-built/REQUIREMENTS.md,docs/as-built/SPECIFICATION.md,docs/workflow/AS_BUILT_SYNC_CONTRACT.tsv,docs/workflow/HANDOFF.md,docs/workflow/TASK_TRACKER.md,tools/lib/next_workflow/agents.mjs,tools/lib/next_workflow/headless_bootstrap.mjs,tools/lib/next_workflow/headless_plan.mjs,tools/lib/next_workflow/headless_service.mjs,tools/lib/next_workflow/release_source_receipts.mjs,tools/lib/next_workflow/release_trust.mjs,tools/lib/next_workflow/run_controller.mjs,tools/lib/next_workflow/runtime_trust.mjs,tools/lib/next_workflow/store.mjs,tools/next-workflow-launcher.cjs,tools/next-workflow.mjs,tools/test_next_workflow_headless_bootstrap.mjs,tools/test_next_workflow_headless_plan.mjs,tools/test_next_workflow_headless_runtime.mjs,tools/test_next_workflow_launcher.mjs
TESTS: tools/check_next_workflow.sh,tools/test_next_workflow.sh,tools/check_as_built_sync_contract.sh,tools/check_as_built_docs.sh,tools/check_workflow_pair_sync.sh,tools/check_repository_development_workflow.sh,tools/test_repository_development_workflow.sh

The remaining audit blockers are implemented. External trust and the launcher
now bind the complete repository identity and distinct source/release keys.
The launcher compares deployed files with Git blobs and executes only a
private read-only snapshot of those verified bytes. The candidate runtime
checks its installed parent launcher and snapshot before protected-state
access. The wrapper stays alive as the launcher's parent, and protected trust
pins the parent shell, canonical wrapper path, and forwarded arguments so a
replayed public marker cannot replace the installed entry point.

L1 now performs one bounded Orchestrator launch with internal verification and
revalidates its exact topology at the execution boundary. L2-L5 launch the real
root Orchestrator before accepted evidence flows to Lead and Task descendants,
and the budget counts every subject and reviewer process. Classification
overflow or noncanonical paths stop, and recovery authorization is regenerated
and exact-compared in the store. Task and explicit safety-signal collection
bounds are enforced before classification traversal. A complete positive
fixture proves signed
source receipts, release proofs, ordered transitions, enforced Activation,
repository deployment, and snapshot execution. The aggregate local suite
passes.

The public plan is a frozen projection separate from the privately captured
admitted topology. RunController also requires the independently normalized
expected rigor, preventing a self-rehashed strict-to-L1 replacement.

Independent CLI security (`gpt-5.6-sol` / `max`), architecture/recovery
(`gpt-5.6-terra` / `xhigh`), and operations/document (`gpt-5.6-luna` / `high`)
re-audits pass. The remaining work is immutable GitHub delivery, exact
merged-candidate Activation, and one bounded installed-launcher smoke task.
Control Center and the separately deferred plans remain unchanged.
