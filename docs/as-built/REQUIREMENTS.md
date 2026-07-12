# REQUIREMENTS.md

## Implemented CI Composed Validation Activation Requirements

- Preserve workflow names, required job contexts, push/pull-request triggers, concurrency cancellation, document-sync range checks, and fail-closed final behavior.
- Assign every authoritative compatibility execution to exactly one main-CI owner and reject missing, duplicate, unknown, or cyclic ownership.
- Run owner jobs concurrently where their declared resource and dependency boundaries allow, while terminal compatibility jobs prove prerequisite results instead of rerunning the suite.
- Execute final-gap and fallback commands as validated argument arrays without shell evaluation.
- Bind proof receipts to the exact workflow graph, execution policy, catalog, revision, and provider job results; keep cross-workflow and persistent result reuse disabled.
- Keep Lesson14 compatibility contexts and Lesson14-specific verification without repeating the common heavy suite.

SYNC-ID: ci_composed_validation_activation
STATUS: implemented
ARTIFACTS: docs/workflow/AS_BUILT_SYNC_CONTRACT.tsv,docs/workflow/FINAL_GATE_EXECUTION_POLICY.tsv,docs/workflow/FINAL_GATE_CI_GRAPH.tsv,docs/workflow/FINAL_GATE_GAP_COMMANDS.tsv,docs/workflow/FINAL_GATE_COVERAGE.tsv,docs/workflow/TEST_PLAN_MANIFEST.tsv,docs/workflow/GIT_HOOK_CHECKS.tsv,docs/workflow/GIT_HOOK_PARALLEL_GROUPS.tsv,docs/workflow/SAFEFLOW_SECURITY_BACKFILL.tsv,docs/workflow/PRODUCT_SECURITY_POLICY.tsv,tools/lib/verification_core.mjs,tools/lib/as_built_index.mjs,tools/lib/ci_composition.mjs,tools/verification-ci,tools/ci-final-gate,tools/check_ci_workflow_structure.sh,tools/test_ci_pipeline_acceleration.sh,tools/check_repository_development_workflow.sh,tools/test_ci_final_gate.sh,tools/test_ci_composition.mjs,tools/test_ci_composition.sh,tools/test_verification_git_hooks.sh,tools/test_lesson_repository.sh,.github/workflows/ci.yml,.github/workflows/lesson14-ci.yml,docs/as-built/REQUIREMENTS.md,docs/as-built/SPECIFICATION.md,docs/as-built/IMPLEMENTATION_PLAN.md,docs/workflow/TASK_TRACKER.md,docs/workflow/HANDOFF.md
TESTS: tools/test_ci_composition.sh,tools/test_ci_final_gate.sh,tools/test_ci_pipeline_acceleration.sh,tools/check_ci_workflow_structure.sh,tools/test_verification_foundation.sh,tools/test_verification_git_hooks.sh,tools/test_ci_evidence.sh,tools/test_git_hooks.sh,tools/test_git_hooks_parallel.sh,tools/test_as_built_single_pass.sh,tools/test_as_built_sync_contract.sh,tools/check_repository_development_workflow.sh,tools/test_repository_development_workflow.sh,tools/check_test_plan_coverage.sh,tools/test_test_plan.sh,tools/check_security_invariants.sh,tools/test_security_invariants.sh,tools/test_dashboard_control_center.sh,tools/test_lesson_playwright.sh,tools/check_as_built_sync_contract.sh,tools/check_as_built_docs.sh,tools/check_workflow_pair_sync.sh

## Implemented Dashboard Control Center Same-Run Validation Requirements

- Keep Dashboard UI, CSS, data schema, routes, browser behavior, and test coverage unchanged.
- Build the Dashboard once per owning verification session, inspect that exact output, and bind browser validation to the same repository revision and build manifest.
- Resolve commands, paths, size limits, chunk requirements, worker counts, timeouts, and receipt locations through validated policy input.
- Record deterministic build-output and browser-test inventory digests without storing raw logs, environment dumps, credentials, URLs, or host-specific absolute paths.
- Reject stale, missing, malformed, symlinked, concurrently changed, or cross-revision manifests and receipts.
- Keep mutable build-tool caches outside the source/config inventory so a clean CI runner cannot invalidate its own same-run proof.
- Preserve strict standalone wrappers and a policy-controlled legacy rollback while allowing one same-run owner to satisfy declared duplicate subjects.

SYNC-ID: dashboard_control_center_same_run_validation
STATUS: implemented
ARTIFACTS: docs/workflow/AS_BUILT_SYNC_CONTRACT.tsv,docs/workflow/FINAL_GATE_EXECUTION_POLICY.tsv,docs/workflow/TEST_PLAN_MANIFEST.tsv,docs/workflow/GIT_HOOK_CHECKS.tsv,docs/workflow/GIT_HOOK_PARALLEL_GROUPS.tsv,docs/workflow/FINAL_GATE_COVERAGE.tsv,docs/workflow/SAFEFLOW_SECURITY_BACKFILL.tsv,docs/workflow/PRODUCT_SECURITY_POLICY.tsv,vite.config.mjs,tools/lib/dashboard_verification.mjs,tools/check_dashboard_bundle_contract.mjs,tools/check_dashboard_bundle_contract.sh,tools/dashboard-verification,tools/test_dashboard_control_center.sh,tools/test_dashboard_same_run_verification.mjs,tools/test_dashboard_same_run_verification.sh,tools/test_verification_runner.mjs,tools/test_lesson_repository.sh,tools/test_ci_pipeline_acceleration.sh,.github/workflows/ci.yml,.github/workflows/lesson14-ci.yml,docs/as-built/REQUIREMENTS.md,docs/as-built/SPECIFICATION.md,docs/as-built/IMPLEMENTATION_PLAN.md,docs/workflow/TASK_TRACKER.md,docs/workflow/HANDOFF.md
TESTS: tools/test_dashboard_same_run_verification.sh,tools/check_dashboard_bundle_contract.sh,tools/test_dashboard_control_center.sh,tools/test_verification_runner.sh,tools/test_verification_foundation.sh,tools/test_verification_git_hooks.sh,tools/test_git_hooks.sh,tools/test_git_hooks_parallel.sh,tools/check_test_plan_coverage.sh,tools/test_test_plan.sh,tools/check_security_invariants.sh,tools/test_security_invariants.sh,tools/test_ci_pipeline_acceleration.sh,tools/check_ci_workflow_structure.sh,tools/check_as_built_sync_contract.sh,tools/check_as_built_docs.sh,tools/check_workflow_pair_sync.sh

## Implemented Local Exact-Once Verification Requirements

- Preserve all compatibility check IDs and hook modes while executing each authoritative full/no-cache leaf at most once per unchanged local run.
- Keep fast and minimal cache semantics unchanged; full/no-cache must never accept a persistent result cache.
- Derive commands, relationships, execution kinds, worker limits, timeouts, locks, fixture exclusions, and cancellation grace from policies and adapters.
- Spawn canonical argument arrays without shell evaluation.
- Use a rolling worker pool with deterministic log replay, resource locks, bounded output, per-subject timeouts, and fail-fast process-group cancellation.
- Do not start a final gate until every required non-final subject has passed and same-run compatibility receipts have been written against an unchanged repository fingerprint.
- Permit a declared owner to attest a provided logical subject only when the relationship policy is valid and the owner passes in the same run.
- Make `test_dashboard_settings` explicitly serial until its mutation boundaries are redesigned.
- Reject cycles, duplicate producers, unsafe argv, conflicting locks, stale inputs, repository mutation, missing receipts, cancellation leaks, and unknown execution kinds.
- Keep the legacy hook runner available through a policy-controlled rollback and do not access or edit child repositories.

SYNC-ID: verification_local_exact_once_activation
STATUS: implemented
ARTIFACTS: docs/workflow/AS_BUILT_SYNC_CONTRACT.tsv,docs/workflow/FINAL_GATE_EXECUTION_POLICY.tsv,docs/workflow/TEST_PLAN_MANIFEST.tsv,docs/workflow/GIT_HOOK_CHECKS.tsv,docs/workflow/GIT_HOOK_PARALLEL_GROUPS.tsv,docs/workflow/GIT_HOOK_RECOMMENDATION_PATHS.tsv,docs/workflow/FINAL_GATE_COVERAGE.tsv,docs/workflow/SAFEFLOW_SECURITY_BACKFILL.tsv,docs/workflow/PRODUCT_SECURITY_POLICY.tsv,tools/lib/verification_core.mjs,tools/lib/verification_runner.mjs,tools/lib/verification_git_hooks.mjs,tools/verification-runner,tools/git-hooks,tools/lib/ci_evidence.sh,tools/lib/fixture_copy.sh,tools/test_verification_runner.mjs,tools/test_verification_runner.sh,tools/test_verification_git_hooks.sh,tools/test_git_hooks_parallel.sh,tools/test_fixture_copy.sh,tools/test_ci_final_gate.sh,tools/lib/repository_development_runner.sh,tools/test_repository_development_workflow.sh,tools/test_lesson_repository.sh,tools/test_ci_pipeline_acceleration.sh,.github/workflows/ci.yml,.github/workflows/lesson14-ci.yml,docs/as-built/REQUIREMENTS.md,docs/as-built/SPECIFICATION.md,docs/as-built/IMPLEMENTATION_PLAN.md,docs/workflow/TASK_TRACKER.md,docs/workflow/HANDOFF.md
TESTS: tools/test_verification_runner.sh,tools/test_verification_git_hooks.sh,tools/test_git_hooks.sh,tools/test_git_hooks_parallel.sh,tools/test_fixture_copy.sh,tools/test_ci_evidence.sh,tools/test_ci_final_gate.sh,tools/check_repository_development_workflow.sh,tools/test_repository_development_workflow.sh,tools/check_security_invariants.sh,tools/test_security_invariants.sh,tools/check_test_plan_coverage.sh,tools/test_test_plan.sh,tools/test_ci_pipeline_acceleration.sh,tools/check_ci_workflow_structure.sh,tools/check_as_built_sync_contract.sh,tools/check_as_built_docs.sh,tools/check_workflow_pair_sync.sh

## Implemented As-Built Single-Pass Validation Requirements

- Parse the synchronization contract, five synchronized documents, required artifacts, tests, runtime evidence, and wiring into one immutable run-local index.
- Preserve the strict standalone behavior, messages, and exit status of `check_as_built_sync_contract.sh` and `check_as_built_docs.sh`.
- Let an orchestrated documents check satisfy the nested synchronization-contract subject only after the same owner invocation passes.
- Never persist the run-local index across repository changes, processes, commits, or workflow runs.
- Reject malformed TSV, duplicate or unknown IDs, metadata drift, missing files, unsafe wiring, stale runtime evidence, and input mutation with the same or stricter behavior.
- Derive counts and paths from current authorities and configurable locators rather than fixed repository values.

SYNC-ID: as_built_single_pass_validation
STATUS: implemented
ARTIFACTS: docs/workflow/AS_BUILT_SYNC_CONTRACT.tsv,docs/workflow/FINAL_GATE_EXECUTION_POLICY.tsv,docs/workflow/TEST_PLAN_MANIFEST.tsv,docs/workflow/GIT_HOOK_CHECKS.tsv,docs/workflow/GIT_HOOK_PARALLEL_GROUPS.tsv,docs/workflow/GIT_HOOK_RECOMMENDATION_PATHS.tsv,docs/workflow/FINAL_GATE_COVERAGE.tsv,tools/lib/verification_core.mjs,tools/lib/as_built_index.mjs,tools/check_as_built_sync_contract.mjs,tools/check_as_built_sync_contract.sh,tools/as-built-sync,tools/test_as_built_single_pass.mjs,tools/test_as_built_single_pass.sh,tools/test_lesson_repository.sh,tools/test_ci_pipeline_acceleration.sh,.github/workflows/ci.yml,.github/workflows/lesson14-ci.yml,docs/as-built/REQUIREMENTS.md,docs/as-built/SPECIFICATION.md,docs/as-built/IMPLEMENTATION_PLAN.md,docs/workflow/TASK_TRACKER.md,docs/workflow/HANDOFF.md
TESTS: tools/check_as_built_sync_contract.sh,tools/check_as_built_docs.sh,tools/test_as_built_sync_contract.sh,tools/test_as_built_single_pass.sh,tools/check_test_plan_coverage.sh,tools/test_test_plan.sh,tools/test_git_hooks.sh,tools/test_git_hooks_parallel.sh,tools/test_ci_final_gate.sh,tools/test_ci_pipeline_acceleration.sh,tools/check_ci_workflow_structure.sh,tools/check_workflow_pair_sync.sh

## Implemented Verification Composition Foundation Requirements

The parent repository must reduce repeated verification without removing, skipping, renaming, or weakening an existing check, lesson path, CI context, hook mode, security boundary, or document route.

- Resolve repository identities, paths, commands, worker counts, timeouts, thresholds, browser targets, workflow identities, and provider values through validated policy or adapter input rather than runtime literals.
- Keep the reusable core independent of this repository's name, product names, URLs, workflow provider, and child repositories.
- Treat a reusable result as the exact combination of scope, event/ref, HEAD, run attempt, logical subject, and content input fingerprint.
- Include tracked content, index content, worktree content, non-ignored untracked content, file modes, and symbolic-link targets in the content fingerprint; ambiguous or changing inputs must fail closed.
- Record additive version 2 receipts atomically, reject duplicate producers and mismatched provenance, and keep legacy evidence authoritative until shadow comparison passes.
- Represent executable commands as canonical argument arrays and compare subject, arguments, environment profile, inputs, prerequisites, outputs, and policy before treating two executions as equivalent.
- Store digests and safe metadata only; raw logs, environment dumps, secrets, credentials, repository URLs, and host-specific absolute paths are forbidden in receipts.
- Keep cross-workflow reuse and persistent result caching disabled in this cycle.
- Require rejection coverage before runtime activation and preserve a one-switch rollback to the strict legacy execution path.

SYNC-ID: verification_composition_foundation
STATUS: implemented
ARTIFACTS: docs/workflow/AS_BUILT_SYNC_CONTRACT.tsv,docs/workflow/FINAL_GATE_EXECUTION_POLICY.tsv,docs/workflow/FINAL_GATE_EVIDENCE_SCHEMA.tsv,docs/workflow/TEST_PLAN_MANIFEST.tsv,docs/workflow/GIT_HOOK_CHECKS.tsv,docs/workflow/GIT_HOOK_PARALLEL_GROUPS.tsv,docs/workflow/GIT_HOOK_RECOMMENDATION_PATHS.tsv,docs/workflow/FINAL_GATE_COVERAGE.tsv,docs/workflow/SAFEFLOW_SECURITY_BACKFILL.tsv,docs/workflow/PRODUCT_SECURITY_POLICY.tsv,tools/lib/verification_core.mjs,tools/verification,tools/lib/ci_evidence.sh,tools/test_verification_foundation.mjs,tools/test_verification_foundation.sh,tools/test_ci_evidence.sh,tools/test_ci_pipeline_acceleration.sh,tools/test_lesson_repository.sh,.github/workflows/ci.yml,.github/workflows/lesson14-ci.yml,docs/as-built/REQUIREMENTS.md,docs/as-built/SPECIFICATION.md,docs/as-built/IMPLEMENTATION_PLAN.md,docs/workflow/TASK_TRACKER.md,docs/workflow/HANDOFF.md
TESTS: tools/test_verification_foundation.sh,tools/test_ci_evidence.sh,tools/test_ci_final_gate.sh,tools/test_ci_pipeline_acceleration.sh,tools/check_security_invariants.sh,tools/test_security_invariants.sh,tools/check_test_plan_coverage.sh,tools/test_test_plan.sh,tools/test_git_hooks.sh,tools/check_ci_workflow_structure.sh,tools/check_as_built_sync_contract.sh,tools/check_as_built_docs.sh,tools/check_workflow_pair_sync.sh

## Purpose

`ai-driven-development-lesson` teaches AI-driven development as a practical workflow.
The repository must help learners move from structured lessons into real product development without losing the core habits: dialogue, explicit requirements, specifications, implementation planning, task tracking, handoff, Git sync, tests, CI, review, and documentation.

## Required Capabilities

- Preserve the existing 7-day lesson.
- Preserve the existing 14-day lesson.
- Prevent accidental lesson progression without learner approval.
- Let learners choose explanation depth through learning modes A/B/C in both the 7-day and 14-day lessons.
- Allow the learning mode to be switched during either lesson.
- Let learners choose workflow display language and product development language in both the 7-day and 14-day lessons.
- Support common language choices for both language settings: `ja`, `en`, `ko`, `zh-CN`, `zh-TW`, `es`, `pt-BR`, `fr`, `de`, `id`, `vi`, `th`, `hi`, and `ar`.
- Allow learners to start from any lesson topic intentionally, without weakening normal ordered progression.
- Teach agent dialogue and goal-oriented prompt refinement as a core skill.
- Teach sub-agent use as role-based viewpoints that are orchestrated toward a goal.
- Provide Free Development Mode after structured lessons.
- Let learners choose any product stack in Free Development Mode, including languages, frameworks, databases, payment systems, hosting, testing tools, APIs, and integrations.
- Provide an advanced Team Development and Docker module.
- Teach Docker from basics to practical container development when the learner chooses it.
- Show that AI agents can make setup, configuration, debugging, and documentation easier.
- Keep all additions compatible with existing lesson checks and flows.
- Implement additions with refactorability, ecosystem fit, reusability, and generality in mind.
- Provide lesson-repository testing that does not require an external product repository.
- Keep the external product repository boundary explicit for real production operations tests.
- Keep as-built documents synchronized with the implemented lesson behavior.
- Provide a repeatable sub-agent review protocol for documentation, implementation, and learning-experience consistency.
- Provide Docker learning paths that work whether Docker is installed or not.
- Provide a document-language audit helper so remaining non-English Markdown can be found and translated without changing unrelated behavior.
- Provide a learner-facing menu command that groups learning, building/extending, and lesson-maintenance actions by intent.
- Provide a CLI dashboard for lesson status, development status, developer-memory themes, and illustration review availability.
- Provide an illustration request and review-material structure for learner-requested educational PNG illustrations.
- Support Role-Based Document Organization for role-specific Markdown files so design/as-built, workflow-state, and memory documents remain easy to find.
- Keep As-Built Synchronization explicit across the requirements, specification, implementation plan, task tracker, and handoff documents.
- Provide a resource-budgeted parallel execution guard for Git hooks, Playwright, CI, and aggregate checks without weakening existing serial verification paths.

## Implemented Remediation Requirements From Developer-Memory Audit

The 2026-06-02 developer-memory audit requirements are implemented additively.
The repository must keep the following remediation behavior active without trading away existing behavior or changing unrelated existing content.

- Organize lesson-side Markdown documents by role while keeping `AGENTS.MD` at the repository root.
- Provide a shared document-path layer so tools, checks, prompts, skills, and dashboard code do not hard-code final document locations.
- Move design/as-built documents, workflow-state documents, and memory/decision documents into separate directories through a safe migration.
- Remove final root-level copies of role-specific documents after references and checks are updated.
- Replace learner-facing `Day N` labels with `Step N` labels where practical.
- Hide internal step IDs from ordinary learner-facing output while preserving them for state files, command arguments, and diagnostics.
- Implement separate settings for workflow display language and product development language for both structured lesson versions.
- Preserve `zh` as a backward-compatible alias for `zh-CN`.
- Show learning-mode display names consistently while preserving A/B/C as internal IDs.
- Strengthen approval gates so start/pass actions require matching start/pass approvals.
- Make passage prompts invite questions and explain copy-paste command blocks in learner-friendly wording.
- Enforce `docs/workflow/TASK_TRACKER.md` and `docs/workflow/HANDOFF.md` as a synchronized pair for workflow state and restart context.
- Strengthen as-built document synchronization beyond shallow topic checks.
- Expand the CLI dashboard to show current step, progress, 7-day and 14-day language settings, learning-mode labels, next approval, sync-gate status, workflow-pair status, real CI status when available, developer-memory items, and illustration availability.
- Complete illustration request, metadata, generated-asset registration, and review-page support.
- Add an external-integration CLI path that can follow Free Development Mode or start from an existing product repository.
- Introduce required lesson-repository Playwright checks for dashboard and illustration-review quality after dependencies are installed.
- Wire the strengthened checks, product-gate tests, Playwright checks, and aggregate tests into CI and pre-commit without removing existing checks.
- Add failure-path tests for Free Development and Team Development gates.

## Implemented Menu Prerequisite Requirements

Menu prerequisite control is implemented additively and does not trade away any existing 7-day lesson, 14-day lesson, Free Development Mode, Team Development/Docker module, external-integration path, dashboard, checks, or repository-boundary behavior.

- The learner-facing menu item is named `3. 応用レッスン`.
- Keep the advanced/team-development/Docker behavior available under the renamed applied-learning menu item.
- Require the same pre-start settings for menu items 1 through 6:
  - learning mode,
  - workflow display language,
  - product development language,
  - relevant repository context and boundary confirmation,
  - learner approval before starting.
- Reuse the 7-day and 14-day language and learning-mode settings where they already exist.
- For applied-learning, Free Development Mode, product improvement, and external integration, inherit the most recently configured structured-lesson settings when available; otherwise require the learner to select them before start or gate passage.
- Keep product development language mandatory for any product-side work, including Free Development Mode, product improvement, and external integration.
- Use shared prerequisite logic rather than duplicating menu-specific shell branches.
- Preserve `status` commands as non-blocking discovery commands; enforce prerequisites through start, gate, or explicit menu-check commands.
- Provide a mechanically checkable entry for `5. 成果物を改善` through `tools/product-improvement status|start|gate`.
- Expand dashboard readiness output so menu items 1 through 6 show whether learning mode, workflow display language, product development language, repository context, and approval are ready.
- Keep requirements, specification, implementation plan, task tracker, handoff, developer memory, README/menu guidance, and relevant checks synchronized with this runtime behavior.
- Add tests that positively confirm the renamed menu label `3. 応用レッスン` appears.
- Add tests that fail if the old menu label returns, if menu items 1 through 6 can start without required settings, if missing-prerequisite failure paths are not enforced, or if existing 7-day/14-day behavior regresses.

## Implemented Documentation Map Requirements

The lesson repository explains its many rule, routing, skill, design, workflow, and memory documents in language that non-engineer learners can understand.
This implemented work is additive and does not trade away any existing 7-day lesson, 14-day lesson, menu, dashboard, checks, document synchronization, skills, memory workflow, or repository-boundary behavior.

- Provide a learner-facing documentation map guide at `guides/DOCUMENT_MAP.md`.
- Explain `AGENTS.MD` as the lesson repository's agent rulebook, including invariant rules, document root, routing table, and repo-local skills.
- Clearly distinguish lesson-side `AGENTS.MD`, legacy product-side `AGENT.md`, and the planned product-side `AGENTS.MD` transition.
- Explain `docs/as-built/` as the design/as-built area for requirements, specification, and implementation plan.
- Explain `docs/workflow/` as the work-state area for task tracking and handoff.
- Explain Git hook policy documents as workflow controls:
  - `docs/workflow/GIT_HOOKS_POLICY.tsv`,
  - `docs/workflow/GIT_HOOK_CHECKS.tsv`,
  - `learning/GIT_HOOK_SETTINGS.tsv`.
- Explain `docs/memory/` as the memory/decision area, currently including `docs/memory/DEVELOPER_MEMORY.md` and `docs/memory/SESSION_MEMORY.md`.
- Explain failure memory as product-side `FAILURE_MEMORY.md` or failure-recovery records where the lesson uses them, without falsely claiming that a lesson-side `docs/memory/FAILURE_MEMORY.md` file exists.
- Explain `skills/*/SKILL.md` as reusable agent procedures, not learner homework.
- Provide a CLI tour command at `tools/docs-tour`, with sections for status, rules, design, workflow, memory, skills, and all documents.
- Make the tour adapt to learning modes A/B/C so detailed learners get context, moderate learners get concise explanations, and workflow-only learners get file names and purposes.
- Provide `./tools/dashboard docs` and include the docs view in `./tools/dashboard all`.
- Show document categories, each document's purpose, relevant current workflow documents, `TASK_TRACKER`/`HANDOFF` pair status, and as-built synchronization status.
- Add copy-paste prompt examples that ask an agent to explain current progress and next actions from `docs/workflow/TASK_TRACKER.md` and `docs/workflow/HANDOFF.md` in learner-friendly terms.
- Add early-lesson guidance for both 7-day and 14-day flows so learners understand why the documents exist before being asked to use them.
- Keep repository source documents in English while allowing lesson/runtime explanations to follow the selected workflow display language.
- Provide mechanical checks through `tools/check_document_root.sh`, `tools/test_docs_tour.sh`, and updates to existing structure/as-built/developer-memory checks, so the `AGENTS.MD`-rooted documentation routes, documentation-map guide, tour command, dashboard docs view, prompt examples, and synchronization are testable.
- `guides/DOCUMENT_MAP.md`, `tools/docs-tour`, `tools/check_document_root.sh`, `tools/test_docs_tour.sh`, and `./tools/dashboard docs` are required runtime artifacts.
- Validation is wired through `tools/check_document_root.sh`, `tools/test_docs_tour.sh`, structure checks, as-built checks, developer-memory checks, dashboard or Playwright tests, aggregate tests, CI, and pre-commit.
- Implementation verification preserves existing 7-day, 14-day, menu, dashboard, Free Development, Product Improvement, external-integration, product-gate, Playwright, CI, and pre-commit behavior.

## Implemented Product Repository Cleanup Requirements

The lesson repository provides a safe, explicit cleanup path for the external product repository created by the 7-day or 14-day lessons.
This implemented work is additive and does not trade away any existing 7-day lesson, 14-day lesson, menu, dashboard, checks, document synchronization, product-gate behavior, GitHub/CI workflow, docs-tour behavior, or repository-boundary behavior.

- `tools/product-repository-cleanup` is the dedicated cleanup command.
- `tools/product-repository-cleanup status` provides non-destructive discovery of the configured product repository path, local existence, Git status, nested-repository safety, configured repository name, remote URL when available, and remote GitHub status when safely checkable.
- `tools/product-repository-cleanup plan` provides a non-destructive local and remote cleanup procedure preview.
- `tools/product-repository-cleanup local --confirm task-tracker-repository` deletes only the configured local product repository after exact product-repository-name confirmation.
- `tools/product-repository-cleanup remote --confirm xxxMasahiro/task-tracker-repository` deletes only the configured GitHub product repository after exact full owner/repository confirmation.
- Local deletion and remote deletion remain separate commands; there is no `all` command and no automatic chained local-plus-remote deletion.
- Cleanup commands show target path, configured product repository name, GitHub owner/repository target where relevant, and safety status before any destructive operation.
- The local target must resolve to the configured product repository path, normally `$HOME/projects/task-tracker-repository`.
- Local deletion is rejected if the target is inside the lesson repository, does not match the configured product repository name, is not a Git repository, lacks `.git`, or cannot be identified as the Git top level safely.
- Local deletion requires exact confirmation text matching the configured product repository name.
- Remote deletion requires exact confirmation text matching the full GitHub owner/repository name.
- Remote deletion requires `gh`, GitHub authentication, and a successful `gh repo view` lookup before any delete call.
- Remote deletion shows the remote repository URL and owner/repository name immediately before deletion.
- Status, plan, local cleanup, and remote cleanup paths print clear operation logs.
- Dry-run and failure-path behavior is testable without deleting a real GitHub repository.
- `tools/test_product_repository_cleanup.sh` tests status, plan, missing confirmation, wrong confirmation, nested repository rejection, non-Git target rejection, temporary local cleanup behavior, and mocked remote deletion behavior.
- `tools/product-repository-cleanup` and `tools/test_product_repository_cleanup.sh` are required runtime artifacts.
- Validation is wired through `tools/test_product_repository_cleanup.sh`, structure checks, as-built checks, developer-memory checks, aggregate tests, CI, and pre-commit.
- Implementation verification preserves existing 7-day, 14-day, menu, dashboard, Free Development, Product Improvement, external-integration, product-gate, Playwright, docs-tour, CI, and pre-commit behavior.

## Implemented As-Built Sync Contract Requirements

The lesson repository strengthens mechanical enforcement for synchronization across the three design/as-built documents and the two workflow-state documents.
This implemented work is additive and does not trade away any existing `tools/check_as_built_docs.sh`, `tools/check_workflow_pair_sync.sh`, lesson flow, dashboard, CI, pre-commit, docs-tour, product-gate, product-repository cleanup, or developer-memory requirement behavior.

- `docs/workflow/AS_BUILT_SYNC_CONTRACT.tsv` records each synchronized improvement as a stable row.
- Each contract row must include a stable sync ID, status, title, required runtime artifacts, required tests, required document coverage, and runtime evidence where applicable.
- Require matching `SYNC-ID`, `STATUS`, `ARTIFACTS`, and `TESTS` blocks in all five synchronized documents:
  - `docs/as-built/REQUIREMENTS.md`,
  - `docs/as-built/SPECIFICATION.md`,
  - `docs/as-built/IMPLEMENTATION_PLAN.md`,
  - `docs/workflow/TASK_TRACKER.md`,
  - `docs/workflow/HANDOFF.md`.
- `tools/check_as_built_sync_contract.sh` fails when a contract sync ID is missing from any of the five documents.
- The check must fail when any of the five documents contains a `SYNC-ID` block that is absent from the contract.
- The check must fail when one document marks a sync ID as `planned` while another marks the same sync ID as `implemented`.
- The check must fail when document `ARTIFACTS` or `TESTS` blocks contain extra or missing entries compared with the contract.
- The check must fail when required artifacts or required tests listed in the contract are missing from the repository.
- The check must fail when runtime evidence files are missing or do not reference the sync ID, one of its artifacts, or one of its tests.
- The check must fail when required tests are not actively wired into aggregate tests, CI, and pre-commit after a sync ID is marked `implemented`; comments or inert text mentions are not enough.
- Keep the existing topic-based as-built check as a supporting compatibility check; do not remove or weaken it.
- Keep the existing `TASK_TRACKER.md` and `HANDOFF.md` workflow-pair check active; extend coverage rather than replacing the pair rule.
- `tools/as-built-sync status` shows sync IDs, five-document coverage, artifact presence, and test wiring status.
- `AGENTS.MD` routes sync-contract questions to the contract file, the five synchronized documents, and the new status/check commands.
- `tools/test_as_built_sync_contract.sh` covers complete synchronization, missing document blocks, unknown sync IDs, mixed planned/implemented status, extra artifacts/tests, missing artifacts, inert wiring, and missing active test wiring.
- The sync-contract check and regression test are wired into `tools/check_as_built_docs.sh`, `tools/test_lesson_repository.sh`, `.githooks/pre-commit`, `.github/workflows/ci.yml`, and `.github/workflows/lesson14-ci.yml`.
- Implementation must preserve refactorability, ecosystem fit, reusability, generality, and the no-existing-feature-tradeoff rule.

## Implemented Resource-Budgeted Parallel Guard Requirements

The lesson repository implements a conservative resource-budget guard for safe, optional parallel execution decisions around heavy verification work without trading away any existing 7-day lesson, 14-day lesson, Git hooks mode, CI check, pre-commit check, document route, dashboard behavior, or repository-boundary behavior.
The implementation provides policy files, user settings, a shared resource library, a CLI command, Git hooks integration, Playwright worker integration, CI wiring, and standalone plus aggregate tests.

- Let the user configure a repository memory budget as a percentage of total memory.
- Let the user configure a repository swap budget from both a percentage of free storage and a GiB upper limit.
- Calculate the effective repository swap budget as the smaller of the storage-percentage value and the GiB upper limit.
- Let the user configure the available-memory floor that turns caution states into serial fallback or explicit parallel-mode safe stop.
- Inspect the real local environment before heavy local checks, including memory, swap, disk free space, and active heavy processes where practical.
- Allow limited parallel execution decisions only when the resource check passes and no active heavy-process caution is detected.
- Keep serial execution available as the safe fallback.
- Define explicit parallel mode as "parallel if safe, fail closed if caution prevents safe parallelism" rather than silently overriding resource safety.
- Treat unknown heavy-work profiles as configuration errors instead of silently falling back to a different profile.
- Treat the 90 percent safe-stop state as a failing gate for starting new heavy verification work, including job recommendation and Playwright wrapper entry points.
- Monitor repository swap-budget usage in 10 percent increments.
- Treat 50, 60, 70, 80, and 90 percent as escalating stages for notice, warning, strong warning, parallel-addition stop, and serial fallback or safe stop.
- Avoid hidden OS mutation, `.wslconfig` writes, swap creation/deletion, `drop_caches`, privileged cleanup, arbitrary process killing, Docker/cgroups enforcement, or Security guard control-plane migration in the first implementation.
- Keep the resource guard reusable across Git hooks, Playwright, aggregate checks, and future CI/local verification design.
- Keep the new resource guard check runnable both standalone and from aggregate tests.

## Implemented Resource Guard Safe Cleanup Requirements

The lesson repository implements repo-local safe cleanup as an additive follow-up to the resource-budgeted parallel guard.
The goal is to prevent Playwright reports, test result directories, marked Git hooks cache files, and repo-local temporary artifacts from accumulating while preserving all existing lesson, CI, Git hooks, Playwright, documentation, and sync-contract behavior.

- Provide a cleanup workflow through the existing `tools/resource-guard` command.
- Keep cleanup targets in `docs/workflow/RESOURCE_POLICY.tsv` rather than hard-coded command branches.
- Keep cleanup settings in `learning/RESOURCE_SETTINGS.tsv` where user-facing resource behavior is already configured.
- Make dry-run inspection the default cleanup behavior.
- Require explicit `--safe` before any deletion occurs.
- Limit deletion to policy-approved paths inside the lesson repository.
- Reject repo-outside paths, path traversal, unsafe `.git` targets, and symlink escapes.
- Allow the marked `.git/pre-commit-cache` directory to be cleaned only when its cache marker is valid.
- Keep Playwright reports and test results cleanable without deleting global npm or Playwright caches.
- Keep cleanup tests runnable both standalone and from aggregate tests.
- Do not perform OS cache cleanup, `drop_caches`, swap mutation, `.wslconfig` mutation, Docker cleanup, process killing, or product repository deletion.
- Preserve existing `resource-guard status`, `check`, `recommend-jobs`, and `monitor` behavior.

## Implemented Resource Guard Summary And Parallel CI Requirements

The lesson repository must make resource guard behavior easier to understand and must use the existing resource guard decisions to improve verification speed without trading away safety, existing checks, or existing lesson behavior.
This implementation is synchronized from `docs/memory/DEVELOPER_MEMORY.md` and is present as runtime command, Git hooks runner, CI workflow, and regression-test behavior.

- Provide a user-facing `./tools/resource-guard summary` command that explains memory budget, swap budget, current state, local profile-specific recommended jobs, and the distinction between local and CI parallelism.
- Provide `./tools/resource-guard summary --short` for a compact operational view.
- Keep `status`, `monitor`, `recommend-jobs`, `check`, and `cleanup` unchanged as existing detailed or operational commands.
- Use existing `docs/workflow/RESOURCE_POLICY.tsv` profiles and existing `resource_guard_recommended_jobs` calculations instead of adding a `target_parallel_jobs` setting.
- Preserve the safety model where recommended jobs vary by workload profile; `git-hooks-full` may recommend four workers while Playwright and aggregate checks recommend fewer workers.
- Implement local Git hooks parallel execution only for checks explicitly classified as safe to run in parallel in `docs/workflow/GIT_HOOK_PARALLEL_GROUPS.tsv`.
- Keep serial execution available for checks that modify shared state, require ordered output, or are not classified as parallel-safe.
- Fall back to serial execution or stop safely when resource guard returns `serial`, `serial-fallback`, or `safe-stop`.
- Keep logs separated per check and display them in deterministic check order.
- Optimize GitHub Actions separately from local resource settings by splitting CI into runner-appropriate jobs rather than applying local `memory_budget_percent` directly to CI.
- Keep all existing checks present; CI job splitting must not remove or weaken existing verification.
- Require a CI workflow structure check so the split workflow mechanically verifies required job names, `needs` relationships, and required commands.
- Ensure main CI aggregate/full-hooks jobs install npm dependencies and Playwright dependencies before running aggregate repository tests or full hooks.
- Preserve explicit local/CI separation: local Git hooks and Playwright may use resource guard recommendations, while CI full hooks must keep the CI-safe local-resource bypass behavior such as `RESOURCE_GUARD_SKIP_LOCAL_CHECK=1` or an equivalent documented mechanism.
- Provide standalone tests for summary output and Git hooks parallel execution, and wire them into aggregate, pre-commit, and CI verification.
- Keep the `resource_guard_summary_parallel_ci` sync contract implemented with actual runtime artifacts, runtime tests, and runtime evidence.
- Keep the design configuration-driven, reusable, and independent of a specific product stack or single learner-facing phrase.

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

## Implemented Learner Context Foundation Requirements

The lesson repository has learner-context source documents and a read-only runtime context command.
The implemented foundation validates source maps and keeps future lesson-content work from hard-coding context phrases in multiple places.

- Provide a learner context directory at `learning/context/`.
- Keep the source context in English while preserving the existing runtime/display-language model for learner-facing output.
- Provide a main AI-driven development foundation text that explains purpose, dialogue, documents, Git, CI, tests, memory, skills, sub-agents, MCP/API, governance, security, quality, and free development.
- Provide a security foundation that covers prompt injection, secrets, permissions, external APIs, dependencies, Git/CI safety, and staged 7-day, 14-day, and applied security learning.
- Provide a machine-readable context map that `tools/lesson-context` uses to connect topics to lesson openings, per-topic explanations, recaps, and dashboard candidates.
- Preserve the existing 7-day lesson, 14-day lesson, menu, dashboard, Git workflow, Git hooks, as-built sync, docs-tour, and product-repository cleanup behavior.
- Validate the context maps through `tools/test_lesson_context.sh`, structure checks, aggregate tests, Git hooks, and CI.

## Implemented Learner Context Runtime Integration Requirements

The lesson repository must connect the learner-context foundation to runtime guidance without treating all menu items as lessons.
This implemented work is additive and does not trade away the existing 7-day lesson, 14-day lesson, applied lesson, Free Development Mode, Product Improvement, External Integration, lesson-maintenance behavior, menu behavior, dashboard behavior, Git workflow policy, Git hooks policy, CI, pre-commit, docs-tour, or as-built sync behavior.

- Treat 7-day, 14-day, and applied modules as learning contexts.
- Treat Free Development Mode, Product Improvement, External Integration, and lesson repository improvement as workflow contexts, not lessons.
- Keep Free Development Mode as a post-lesson or already-trained-user workflow that applies the repository's recommended AI-driven development process to user-selected products.
- Provide runtime guidance that can show opening context, per-topic context, and recap context for structured learning paths.
- Provide workflow guidance that can show purpose, required documents, safety checks, and copy-paste prompts for product-facing workflows.
- Use the existing learning mode, workflow display language, product development language, menu prerequisite, Git workflow, dashboard, and repository-boundary systems.
- Add or extend machine-readable context maps instead of hard-coding one-off branches or fixed phrases.
- Keep repository source context in English while allowing runtime facilitation to follow the selected workflow display language.
- Add a standalone context command and regression test that can also be called from aggregate tests, CI, and pre-commit.
- Keep new checks independent of a specific product stack, specific learner-facing phrase, or single narrow example.
- Expose context summaries from `tools/lesson` and `tools/lesson14` status output while preserving ordered progression and approval behavior.

## Implemented Git Workflow Policy Requirements

The lesson repository lets users configure how much Git management and Git automation they want the workflow agent to perform.
This implemented work is additive and does not trade away any existing 7-day lesson, 14-day lesson, menu, dashboard, free-development, product-improvement, external-integration, product-repository cleanup, CI, pre-commit, or as-built sync-contract behavior.

- Provide a Git workflow policy definition at `docs/workflow/GIT_WORKFLOW_POLICY.tsv`.
- Provide current user-selected Git workflow settings at `learning/GIT_WORKFLOW_SETTINGS.tsv`.
- Let users allow or disallow normal working branches.
- Let users allow or disallow `git worktree`.
- Let users control whether direct work on `main` is allowed.
- Provide Git automation levels:
  - `manual`: Git actions are guidance only.
  - `commit`: the agent may proceed through commit after checks pass.
  - `pr_ci`: the agent may proceed through push, PR creation where applicable, and CI checks.
  - `sync`: the agent may proceed through main CI plus local/remote synchronization checks.
- Keep merge, branch deletion, worktree deletion, remote deletion, and other destructive Git operations behind explicit user confirmation even when automation is enabled.
- Provide Git monitoring for uncommitted changes, unpushed commits, local/remote divergence, unnecessary working branches, unnecessary worktrees, and current repository context.
- Provide a reusable command interface through `tools/git-workflow status|configure|set|allow|check|cleanup-plan`.
- Keep cleanup planning non-destructive; deletion commands are out of scope for the initial Git workflow policy plan.
- Separate lesson-repository Git state from product-repository Git state so the workflow cannot mix the two repositories.
- Reuse existing `tools/lib` patterns, repository-boundary checks, Git sync checks, CI checks, menu prerequisites, dashboard views, and aggregate tests where practical.
- Add `tools/test_git_workflow_policy.sh` to validate setting changes, invalid setting rejection, branch/worktree permission checks, automation-level decisions, dirty state detection, and local/remote sync monitoring.
- Wire `tools/test_git_workflow_policy.sh` into structure checks, as-built checks, aggregate tests, CI, and pre-commit without replacing existing Git sync or CI checks.

## Implemented Menu-Wide Git Workflow Policy Requirements

The lesson repository promotes Git workflow policy from a standalone support setting into a shared menu-level policy used across learning, building/extending, and lesson-maintenance paths.
This implemented work is additive and does not trade away any existing 7-day lesson, 14-day lesson, applied lesson, Free Development Mode, Product Improvement, External Integration, lesson-maintenance, dashboard, cleanup, CI, pre-commit, or as-built sync-contract behavior.

- Keep `tools/git-workflow status|configure|set|allow|check|cleanup-plan` as the existing Git policy source and command surface.
- Make menu categories reference the same Git policy:
  - learning paths: 7-day lesson, 14-day lesson, and applied lesson,
  - building and extending paths: Free Development Mode, Product Improvement, and External Integration,
  - lesson-maintenance path: lesson repository improvement.
- Show Git policy readiness in `tools/menu readiness` for menu items 1 through 7.
- Extend menu checks so Git policy files, selected values, and repository context are validated before menu workflows start.
- Keep `automation_level=manual` valid and non-blocking so existing workflows continue to start when Git automation is guidance-only.
- Interpret automation levels consistently across menu items:
  - `manual`: guidance and monitoring only,
  - `commit`: allow commit-level automation after required checks pass,
  - `pr_ci`: allow push, PR, and CI-check automation where applicable,
  - `sync`: allow main synchronization and local/remote sync checks where applicable.
- Keep merge, branch deletion, worktree deletion, remote deletion, and other destructive operations behind explicit user confirmation regardless of automation level.
- Add a safe check/start path for menu item 7 without weakening existing item 1 through 6 checks.
- Show menu-wide Git policy status in dashboard output.
- Add tests so invalid Git policy values, missing policy files, menu readiness output, item 1 through 7 checks, and no-tradeoff behavior are mechanically verified.

## Implemented Git Workflow Action Settings Requirements

The lesson repository must let users configure the manual or automatic behavior of each common Git workflow action.
This implemented work is additive and does not trade away existing `branch_allowed`, `worktree_allowed`, `main_direct_work_allowed`, `automation_level`, menu, dashboard, CI, cleanup, or as-built sync-contract behavior.

- Keep the existing Git management settings:
  - `branch_allowed`
  - `worktree_allowed`
  - `main_direct_work_allowed`
  - `automation_level`
- Treat `automation_level` as a compatibility preset for broad Git write automation.
- Add detailed action settings that can override the broad preset when the detailed setting key is present:
  - `commit_automation: manual|auto`
  - `push_automation: manual|auto`
  - `pr_creation: manual|auto`
  - `pr_ci_monitoring: manual|auto`
  - `merge_execution: manual|after_approval`
  - `developer_auto_merge_allowed: false|true`
  - `main_ci_monitoring: manual|auto`
  - `sync_monitoring: manual|auto`
- Detailed settings take precedence only when the detailed setting key is present.
- Preserve current `automation_level` behavior when a detailed setting key is absent.
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
- Preserve `ci` as a compatibility alias for CI monitoring so existing `tools/git-workflow allow ci` behavior is not removed.
- For push and PR creation, `auto` means the agent may execute the operation only after explicit approval for that operation is recorded; it never means approval-free execution.
- `merge_execution: after_approval` means the agent may execute merge only after explicit merge approval is recorded.
- Store Git action approvals in `learning/GIT_WORKFLOW_APPROVALS.tsv` and require matching action, repository, and branch receipts for detailed push, PR creation, and normal merge execution.
- `developer_auto_merge_allowed: true` is a developer-responsibility setting that may permit approval-free merge only when required gates pass: PR CI success, target PR and branch are clear, merge base is verified, the working tree is clean, local and remote state are checked, and failures stop the workflow.
- Developer-responsibility auto-merge must require gate evidence plus the actual Git repository state; setting `developer_auto_merge_allowed: true` alone is not sufficient.
- Keep branch deletion, worktree deletion, remote deletion, and product repository deletion behind explicit user confirmation regardless of merge settings.
- Let users inspect and change these detailed settings from the same Git management command surface: `tools/git-workflow status|configure|set`.
- Show the detailed settings in menu readiness and dashboard menu output.
- Apply the same detailed settings to menu items 1 through 7.
- Add tests for default values, valid changes, invalid value rejection, detailed-setting precedence, menu display, dashboard display, and preservation of existing lesson and product workflows.

## Implemented Git Hooks Policy Requirements

The lesson repository makes the existing pre-commit gate faster and easier to operate without weakening its safety.
This implemented work is additive and does not trade away any existing 7-day lesson, 14-day lesson, menu, dashboard, Git workflow policy, CI, pre-commit, documentation route, sync-contract behavior, or repo-local skill behavior.

- Keep the pre-commit workflow safe and serial by default.
- Avoid a normal learner-facing `off` mode for Git hooks; disabling safety checks is outside the standard workflow.
- Provide explicit Git hooks modes through `docs/workflow/GIT_HOOKS_POLICY.tsv` and `learning/GIT_HOOK_SETTINGS.tsv`:
  - `full`: run coverage equivalent to the current required pre-commit checks.
  - `fast`: use a cache to skip only checks that previously passed with unchanged relevant inputs.
  - `minimal`: run only the smallest safe mechanical set required for local orientation, never as a replacement for full verification before completion.
- Store the implemented check list in `docs/workflow/GIT_HOOK_CHECKS.tsv` so the runner does not hard-code the pre-commit command list.
- Store the local full/no-cache recommendation path policy in `docs/workflow/GIT_HOOK_RECOMMENDATION_PATHS.tsv` so the runner does not hard-code which changed files require heavier local verification.
- Treat malformed `docs/workflow/GIT_HOOK_CHECKS.tsv` rows, including unknown or empty mode tokens, as fail-closed configuration errors.
- Treat malformed `docs/workflow/GIT_HOOK_RECOMMENDATION_PATHS.tsv` rows as fail-closed configuration errors.
- Store hook cache data outside version control, under a Git-local cache area such as `.git/pre-commit-cache/`.
- Treat missing, stale, or corrupted cache entries as cache misses that force the relevant check to run.
- Build cache keys from reusable inputs such as hook mode, command identity, tool hashes, relevant file hashes, and staged or working-tree changes where practical.
- Keep CI and completion verification on full or no-cache execution so local cache behavior cannot hide regressions.
- Keep ordinary local pre-commit operation on the selected mode, such as `minimal`, while preserving full/no-cache CI as the final verification.
- Recommend local `tools/git-hooks run --mode full --no-cache` when changed files match the recommendation policy for Git hooks, CI, checks, tests, or as-built synchronization.
- Connect the implementation to existing settings, shared libraries, aggregate tests, CI, pre-commit, and repo-local skills instead of adding fixed one-off branches.
- Keep existing pre-commit wiring checks active by recognizing the `tools/git-hooks` runner plus `docs/workflow/GIT_HOOK_CHECKS.tsv` as active wiring, not as inert text.
- Keep new checks runnable as standalone commands and through the aggregate lesson repository test.
- Do not depend on a specific product stack, a specific learner-facing phrase, or one narrow case.
- Make the command surface learner-readable, including status, local verification recommendation, mode selection, cache clearing, normal run, no-cache run, and explicit mode run.
- Keep failure behavior conservative: if the hook runner cannot prove a cached pass is valid, it must run the check or fail.
- `tools/test_git_hooks.sh` must validate standalone policy and cache behavior: mode validation, invalid persisted settings, malformed check rows, invalid or empty check-row mode tokens, local full/no-cache recommendation behavior, cache-hit and cache-miss behavior, cache invalidation, no-cache behavior, minimal-mode required checks, failing-check cache refusal, and safe cache clearing.
- Full/no-cache coverage, aggregate-test wiring, CI wiring, and preservation of existing pre-commit behavior must be verified through `tools/git-hooks run --mode full --no-cache`, `.githooks/pre-commit`, `tools/test_lesson_repository.sh`, and the CI workflow definitions.
- Require developer approval before changing the minimal-mode required check list or skipping Playwright-related checks through cache beyond the implemented fail-closed cache behavior.

## Implemented Local Verification Scope Policy Requirements

The lesson repository must make local verification practical for day-to-day work without weakening the existing no-tradeoff rule, CI guarantees, pre-commit behavior, or sync-contract enforcement.
This implemented policy records a high-priority everyday agent rule that remains subordinate to the invariant that no existing-feature tradeoff is allowed.

- Agents must select verification from the workflow contract, changed paths, change risk, and user approval rather than personal preference.
- Agents must not add heavy verification, full repository checks, no-cache checks, CI final gates, or remote CI waiting solely by discretion.
- The Test Plan Manifest must remain the source for path-based required checks.
- The Git hooks check catalog must remain the source for check IDs and runnable commands.
- The Git hooks recommendation-path policy may recommend local full/no-cache verification, but a recommendation is not by itself permission for the agent to run a heavy check without presenting the need.
- Lightweight UI, wording, CSS, and layout adjustments must use the narrowest contract-relevant checks unless a safety boundary, schema, shared tool, CI, hook, or sync contract is changed.
- Document synchronization, contract, schema, shared tooling, Git hooks, CI, test infrastructure, and broad implementation changes must continue to use the contract-required synchronization, structure, target, aggregate, and full/no-cache verification paths.
- Required checks and recommended checks must remain distinguishable in user-facing reports and agent behavior.
- Heavy recommended checks must be presented before execution unless an immediate high-confidence safety condition requires stopping work.
- Existing CI and final verification semantics must remain available; this policy limits unnecessary local execution, not coverage.
- The implementation must stay policy-driven, reusable, stack-agnostic, and independent of a single file name, product stack, phrase, or one-off test case.

SYNC-ID: local_verification_scope_policy
STATUS: implemented
ARTIFACTS: AGENTS.MD,docs/workflow/AS_BUILT_SYNC_CONTRACT.tsv,docs/workflow/TEST_PLAN_MANIFEST.tsv,docs/workflow/GIT_HOOKS_POLICY.tsv,docs/workflow/GIT_HOOK_CHECKS.tsv,docs/workflow/GIT_HOOK_RECOMMENDATION_PATHS.tsv,learning/GIT_HOOK_SETTINGS.tsv,tools/lib/test_plan.sh,tools/test-plan,tools/lib/git_hooks_policy.sh,tools/git-hooks,tools/check_test_plan_coverage.sh,tools/test_test_plan.sh,tools/test_git_hooks.sh
TESTS: tools/check_test_plan_coverage.sh,tools/test_test_plan.sh,tools/test_git_hooks.sh,tools/check_as_built_sync_contract.sh,tools/check_as_built_docs.sh

## Implemented Security Guard Backfill Requirements

The lesson repository must provide an implemented Security guard backfill with runtime artifacts, standalone checks, aggregate-test wiring, Git hooks wiring, CI wiring, and pre-commit wiring.
This implemented work is additive and must not trade away the existing 7-day lesson, 14-day lesson, applied lesson, Free Development Mode, Product Improvement, External Integration, lesson-maintenance behavior, menu behavior, dashboard behavior, Git workflow policy, Git hooks policy, CI, pre-commit, docs-tour, resource guard, or as-built sync-contract behavior.

- Add security invariants to the lesson repository's agent rules so agent work treats untrusted text as data, resists prompt injection, protects secrets, requires least privilege for external APIs, and rejects UI-only, prompt-only, or keyword-filter-only security fixes as sufficient primary security controls.
- Keep Security guard backfill separate from learner-context work even though both touch safety-oriented learning material.
- Track Security guard backfill as its own sync scope instead of merging it into learner-context work.
- Require the Security guard backfill policy to cover prompt injection, secrets, destructive operations, dependency changes, Git/CI safety, and external service permissions.
- Require mechanical checks for security invariants to be runnable standalone and from aggregate tests.
- Keep the first implementation scoped to repository-local policy, documentation synchronization, and non-network checks; do not introduce Security guard control-plane migration, OS/WSL mutation, Docker/cgroups enforcement, swap mutation, process killing, or destructive cleanup.
- Require high-risk security findings to fail closed only when the check is high-confidence; warnings must remain distinct from blocking failures to avoid stopping safe existing workflows.

## Implemented Product Security Workflow Gate Requirements

The lesson repository must provide an implemented product-security workflow gate for menu items 4, 5, and 6 without replacing their existing gates.
The product-security gate must make Free Development, Product Improvement, and External Integration safer while preserving their current document, repository-boundary, Git sync, CI, and approval behavior.

- Provide a `product-security` command surface for product-side work, including status, preflight, advice, check, and gate behavior.
- Reuse existing repository-boundary checks and product repository configuration; do not scan unrelated directories or the user's full home directory.
- Add an advice layer that explains the relevant security concern without blocking progress.
- Add a non-destructive check layer that can inspect configured product-repository state for secrets, environment-file hygiene, external API/OAuth risk, dependency changes, log exposure, CI readiness, and product-repository boundary issues.
- Add a fail-closed gate layer for high-confidence unsafe states such as secret exposure, missing required external-integration approval, product-boundary violation, or failed required CI for the relevant product commit.
- Require menu item 6, External Integration, to collect explicit pre-implementation confirmation for connected service, sent data, received data, write behavior, OAuth scopes, token storage, redirect URI, token refresh and revoke behavior, webhook signature handling, rate limits, sandbox or test-account behavior, prohibited log output, and rollback or recovery approach.
- Require product security behavior to remain stack-agnostic so it can support user-selected languages, frameworks, databases, payment systems, APIs, and deployment tools.
- Require product security checks to avoid printing secret values; safe output may include categories, filenames, and safe location references only.
- Require dashboard and menu readiness output to show short learner-facing safety guidance before raw policy detail where appropriate.

## Implemented Test And CI Safe Time Optimization Requirements

The lesson repository should make local tests and remote CI faster without weakening safety, correctness, auditability, existing checks, or existing lesson behavior.
The implemented first phase adds observe-only planning, fail-closed coverage validation, result attestation, CI-safe Git hooks parallelism, and lightweight fixture copying while preserving all existing required verification.

- Preserve the existing 7-day lesson, 14-day lesson, menu, dashboard, Git workflow, Git hooks, product-security, Security guard checks, as-built sync, pre-commit, Playwright, and CI guarantees.
- Treat speed improvements as removal of duplicate work, redundant waiting, repeated setup, and repeated validation within the same verification path.
- Do not remove required safety gates, do not make security or as-built checks optional, and do not let changed-only test selection become authoritative in CI until observe-only evidence proves it is safe.
- Provide a Test Plan Manifest that can show which checks are required, which changes force full verification, and why each decision was made.
- Provide a Coverage Guard that fails closed when the Test Plan policy is malformed, references unknown Git hook checks, omits required dangerous-change patterns, weakens required dangerous-change full/CI escalation, or emits a force decision without full escalation.
- Provide Result Attestation that records policy hash, check-catalog hash, repository-state hash, manifest hash, generated run/force decisions, and final observe-only authority.
- Keep dangerous changes full/no-cache by default, including `AGENTS.MD`, `.github/workflows/`, `.githooks/`, `tools/git-hooks`, `tools/as-built-sync`, security/product-security logic, dependency lockfiles, Playwright configuration/tests, contract TSV files, and unknown paths.
- Keep local `minimal` and `fast` modes useful for feedback while preserving full/no-cache completion and CI verification.
- Prefer observe-only changed-only planning before using any changed-only decision to skip CI checks.
- Allow CI full-hooks execution to request an explicit runner-oriented worker count while local execution remains capped by resource guard recommendations.
- Provide a shared fixture-copy helper that excludes `.git`, `node_modules`, Playwright reports, test results, and cache directories from temporary repository copies.
- Keep gap-only final gates, strict-command single-pass reuse, Playwright evidence reuse, and authoritative changed-only CI selection as future work requiring additional mechanical proof and developer approval.
- Allow CI runner-oriented parallelism and dependency caching, but do not cache CI verification results.
- Require developer approval before changing required CI check names, making changed-only authoritative in CI, introducing quarantine, reducing full/no-cache scope, or merging workflow files in a way that affects required branch protection contexts.

## Implemented Test And CI Final Gate Optimization Requirements

The implemented test and CI final-gate optimization removes duplicate final-gate execution while preserving safety, correctness, auditability, and existing lesson behavior.
The implementation targets the current `aggregate-and-full-hooks` bottleneck without weakening the 7-day lesson, 14-day lesson, existing CI, existing checks, pre-commit behavior, as-built synchronization, security checks, product-security checks, or document routes.

- Replace the full hook's duplicate `test_lesson_repository.sh` execution with a hook-specific gap-only final gate that proves the hook catalog plus final gate still covers the standalone aggregate requirements.
- Keep `tools/test_lesson_repository.sh` available as the standalone exhaustive aggregate command.
- Reuse same-run Playwright success evidence in final aggregation when the commit SHA, workflow run, source job identity, Playwright configuration hash, test file hashes, dependency lockfile hash, and command identity match.
- Reuse same-run as-built and sync success evidence only when the relevant document hashes, sync-contract hash, checker hashes, command identity, and repository state hash match.
- Separate common final-gate behavior from Lesson14-specific final-gate behavior so `CI` keeps the common aggregate/full-hooks gate and `Lesson14 CI` keeps a Lesson14-specific final gate instead of duplicating the same heavy common final verification.
- Preserve existing `Lesson14 CI` `playwright-tests` and `aggregate-and-full-hooks` job contexts as compatibility gates unless developer approval is granted to change required check names.
- Recommend local `full --no-cache` verification when final-gate coverage, final-gate commands, CI evidence helpers, or as-built evidence helpers change.
- Add CI dependency caching for npm and Playwright browser dependencies where it is safe and supported by GitHub Actions.
- Do not persistently cache verification results across commits, branches, workflow runs, or repositories.
- Store same-run evidence as ephemeral CI artifacts or workspace files only for the current workflow run.
- Fail closed by rerunning or failing the relevant gate when evidence is missing, stale, corrupted, mismatched, or produced by a different command identity.
- Include evidence metadata for commit SHA, workflow name, job name, command ID, policy hash, check catalog hash, relevant input hashes, generated result hash, and creation time.
- Keep dangerous changes full/no-cache by default, including CI workflow changes, Git hook changes, as-built/sync changes, security/product-security changes, Playwright configuration changes, dependency changes, and unknown paths.
- Add cleanup and monitoring coverage for same-run evidence, Playwright reports, test results, temporary fixtures, and repo-local caches while preserving the prohibition on OS cache, global cache, Docker, swap, process, or product-repository cleanup without explicit approval.
- Require mechanical tests that prove the gap-only gate cannot drop aggregate coverage, Playwright evidence reuse cannot hide changed browser-test inputs, and as-built evidence reuse cannot hide changed synchronized documents.
- Require developer approval before changing required CI check names, reducing full/no-cache scope, making changed-only CI authoritative, sharing verification-result cache across runs, or accepting any existing-feature tradeoff.

## Implemented Test And CI Full Pipeline Acceleration Requirements

The test and CI acceleration cycle finishes the remaining safe speed work without reducing safety, correctness, auditability, existing lesson behavior, or required verification.
Runtime behavior is implemented through policy files, focused checks, CI workflow structure checks, and workflow wiring.

- GitHub Actions deprecation regressions are guarded mechanically without changing the meaning of any required check.
- Playwright setup is shortened through the shared `tools/ci-playwright-setup` wrapper, which uses npm's local cache preference, checks for an existing Chromium executable, and falls back to a normal install when cache state is missing or stale.
- Full Git hook parallelization is expanded only for checks classified in policy as mechanically independent; unclassified checks remain serial.
- Same-run evidence reuse remains scoped to the current run and does not introduce persistent verification-result cache across commits, branches, workflow runs, repositories, or users.
- Duplicated `policy-regression-tests` style work between `CI` and `Lesson14 CI` is reduced while preserving required workflow contexts and branch-protection compatibility.
- The `Lesson14 CI` compatibility contexts stay present but avoid rerunning common heavy browser, aggregate, and full-hook work already covered by the main `CI` workflow for the same commit.
- Changed-only CI remains observe-only until Coverage Guard, Result Attestation, full-CI comparison evidence, and developer approval prove that it can become authoritative safely.
- Preserve the existing Step 1-7 lesson path, Step 1-14 lesson path, applied lesson, menu, dashboard, Git workflow policy, Git hooks policy, Security guard checks, product-security checks, as-built sync, docs-tour, pre-commit, local full/no-cache verification, and remote CI behavior.
- Require focused regression coverage through `tools/test_ci_pipeline_acceleration.sh`, which is standalone-callable and aggregate-callable.
- Require developer approval before changing required workflow or job names, reducing full/no-cache scope, making changed-only CI authoritative, adding persistent verification-result cache, adding flaky quarantine, accepting an existing-feature tradeoff, or weakening any safety gate.

## CI Timing And Approved Auto-Improvement Requirements

The CI timing and approved auto-improvement cycle makes `aggregate-and-full-hooks` optimization evidence-driven before any future final-gate behavior change.
This implemented work is additive and does not trade away the Step 1-7 lesson path, Step 1-14 lesson path, applied lesson, menu, dashboard, Git workflow policy, Git hooks policy, Security guard checks, product-security checks, as-built sync, docs-tour, pre-commit, local full/no-cache verification, or remote CI behavior.

- Record per-check execution timing for the main `CI` final common aggregate/full-hooks checks in a machine-readable report.
- Preserve learner/maintainer readability by showing check name, duration, exit status, mode, command identity, relevant input hash, and whether same-run evidence was used.
- Store CI timing reports as workflow artifacts or same-run evidence files without storing secrets, tokens, private messages, environment dumps, or external service payloads.
- Strengthen CI status checking so the agent can distinguish main `CI` from `Lesson14 CI`, can target the current commit SHA, can inspect job state, and does not report success while a required workflow is still running.
- Generate CI improvement candidates from measured evidence rather than intuition.
- Improvement candidates must identify slow checks, same-run evidence reuse candidates, and safe parallelization candidates with reason, affected files, required verification, and developer approval requirement.
- The candidate generator must be proposal-only; it must not rewrite workflows, checks, policies, hook groups, synchronized documents, or tools by itself.
- Require developer approval before implementing any generated improvement candidate.
- Reuse same-run hash evidence only when command identity, relevant input hashes, policy hashes, repository-state hash, workflow/run identity, and success status match.
- Keep `full no-cache` as the safe baseline until measured evidence, same-run evidence validation, and developer approval justify any conditional operation.
- Treat conditional `full no-cache` scope reduction as a later approval-gated step, not as part of this measurement and proposal-only implementation.
- Keep CI optimization configuration-driven through existing policy files, shared libraries, checks, repo-local skills, aggregate tests, CI, and pre-commit.
- Do not introduce fixed one-off string checks, product-stack-specific behavior, or a tool that can only operate on the current task.
- Add new focused checks only when they are standalone-callable and aggregate-callable.
- Preserve fail-closed behavior when timing evidence is missing, stale, corrupted, produced by a different command, or generated for different inputs.

SYNC-ID: ci_timing_auto_improvement_plan
STATUS: implemented
ARTIFACTS: docs/workflow/TEST_PLAN_MANIFEST.tsv,docs/workflow/GIT_HOOK_CHECKS.tsv,docs/workflow/GIT_HOOK_PARALLEL_GROUPS.tsv,docs/workflow/GIT_HOOK_RECOMMENDATION_PATHS.tsv,docs/workflow/FINAL_GATE_GAP_COMMANDS.tsv,docs/workflow/FINAL_GATE_COVERAGE.tsv,tools/check_ci_status.sh,tools/check_ci_workflow_structure.sh,tools/lib/ci_timing.sh,tools/ci-timing,tools/test_ci_timing.sh,tools/test_ci_pipeline_acceleration.sh,tools/test_ci_evidence.sh,tools/test_ci_final_gate.sh,tools/test_git_hooks_parallel.sh,tools/test_lesson_repository.sh,.github/workflows/ci.yml,.github/workflows/lesson14-ci.yml
TESTS: tools/check_ci_workflow_structure.sh,tools/test_ci_timing.sh,tools/test_ci_pipeline_acceleration.sh,tools/test_ci_evidence.sh,tools/test_ci_final_gate.sh,tools/test_git_hooks_parallel.sh,tools/check_as_built_sync_contract.sh

## Implemented CI Aggregate And Full-Hooks Split Requirements

The CI aggregate and full-hooks split shortens the main `CI` workflow wall time by running the lesson aggregate check and full Git hook regression as separate jobs after the same prerequisite gates pass.
It must preserve strict final verification, existing workflow behavior, and current full/no-cache semantics.

- Split only the main `CI` final common verification path into `lesson-aggregate`, `git-hooks-full-no-cache`, and `final-gate`.
- Keep `Lesson14 CI` compatibility contexts intact so existing branch-protection and document routes remain valid.
- Keep `tools/test_lesson_repository.sh --use-evidence --write-evidence` and `tools/git-hooks run --mode full --no-cache --jobs 4` authoritative; the split changes scheduling, not verification scope.
- Require `final-gate` to depend on both split jobs, run even when a split prerequisite fails, and fail closed when a prerequisite result or same-run Git hook evidence is missing, stale, mismatched, or unavailable.
- Preserve timing artifact output by collecting split timing parts, keeping each split job report in a non-colliding report file, and uploading the same final timing artifact pattern.
- Keep `CI_TIMING_REPORT` scoped to the timing wrapper so aggregate tests that include timing self-tests cannot inherit a parent job's report path.
- Keep uploaded same-run evidence filenames artifact-safe while preserving the original evidence id in metadata for verification.
- Use a stable Lesson14 compatibility marker for common split coverage instead of depending on learner-facing prose.
- Do not add persistent verification-result cache, changed-only authoritative CI, Git hook group matrix splitting, flaky quarantine, or conditional full/no-cache skipping in this implementation.
- Preserve the Step 1-7 lesson path, Step 1-14 lesson path, applied lesson, menu, dashboard, Git workflow policy, Git hooks policy, Security guard checks, product-security checks, as-built sync, docs-tour, pre-commit, local full/no-cache verification, and remote CI behavior.
- Require focused structure and acceleration checks that are standalone-callable and aggregate-callable.
- Require developer approval before changing required workflow contexts, reducing full/no-cache coverage, adding persistent cache semantics, making changed-only CI authoritative, or accepting any existing-feature tradeoff.

SYNC-ID: ci_aggregate_full_hooks_split
STATUS: implemented
ARTIFACTS: docs/workflow/AS_BUILT_SYNC_CONTRACT.tsv,docs/workflow/TEST_PLAN_MANIFEST.tsv,tools/check_ci_workflow_structure.sh,tools/test_ci_pipeline_acceleration.sh,tools/check_as_built_sync_contract.sh,tools/ci-timing,tools/test_ci_timing.sh,tools/lib/ci_evidence.sh,tools/test_ci_evidence.sh,.github/workflows/ci.yml,.github/workflows/lesson14-ci.yml
TESTS: tools/check_ci_workflow_structure.sh,tools/test_ci_pipeline_acceleration.sh,tools/test_ci_timing.sh,tools/test_ci_evidence.sh,tools/check_as_built_sync_contract.sh,tools/check_as_built_docs.sh

## Implemented Dashboard Control Center Data Layer Requirements

The implemented dashboard control center data layer provides a read-only, stable JSON contract for an AI-driven development control center before any React or browser UI is introduced.
It must make the current learning, development, maintenance, Git workflow, and Security guard state understandable without turning the dashboard into a new source of truth.

- Preserve `tools/dashboard`, `tools/menu`, `tools/lesson`, `tools/lesson14`, existing checks, existing CI, pre-commit, repo-local skills, document routes, and as-built synchronization behavior.
- Keep existing CLI, TSV, Markdown, policy files, and check commands as the source of truth.
- Provide the generic JSON data layer through `tools/dashboard-data` and shared `tools/lib/dashboard_data.sh` helpers rather than by parsing current CLI prose in a browser.
- Keep future React/Vite mechanics behind the dashboard control-center surface: learners and ordinary users should see a simple dashboard entry point, not Vite commands, dev-server details, package scripts, or implementation internals.
- Require the future control-center UI/UX to be understandable for non-engineers: the ordinary user action is only to open the dashboard/control center through the provided entry point, while setup, Vite startup, URL selection, JSON data loading, and check orchestration remain hidden behind maintained tooling.
- Require a dual-audience control-panel model: show lesson content, lesson progress, and lesson management in plain language for non-engineers, while also showing workflow content, workflow progress, workflow management, gates, evidence, and next operational actions with enough precision for intermediate and senior engineers to use in practical work.
- Preserve the repository's two-sided nature as a strict dashboard invariant: lesson state and workflow state must be visually and structurally distinguishable, easy to scan, easy to understand, and easy to operate without collapsing one side into the other.
- Distinguish lesson-in-progress, lesson-missing, lesson-unknown, and all-steps-completed states so completed 7-day or 14-day lesson state is not shown as unknown.
- Expose stable metadata such as schema version, generation time, source files, warnings, partial failures, current mode, concise guidance items, blockers, and next safe action.
- Separate `policy ready`, `settings ready`, `gate passed`, `approval required`, optional evidence, cached evidence, and unknown state so the UI cannot imply that a policy check is a completed safety gate.
- Keep the first control-center dashboard read-only: it may explain state and preview commands, but it must not run push, PR creation, merge, cleanup, deletion, external integration, OAuth/API, or other dangerous actions.
- Treat Markdown, logs, CLI output, generated content, and external output as untrusted text-as-data before display.
- Avoid storing or emitting secrets, tokens, private messages, full environment dumps, unnecessary raw logs, or external service payloads in dashboard JSON.
- Keep CI and GitHub status optional or evidence-based unless a required check explicitly asks for live validation.
- Require the dashboard schema check and dashboard-data checks to be standalone-callable and aggregate-callable.
- Avoid fixed one-off product-stack branches, UI-only security decisions, route-name-only checks, or text matching that only works for the current wording.
- Require developer approval before adding action execution from the UI, changing existing dashboard semantics, introducing React/Vite dependencies, or making network-dependent status authoritative.

Non-Goals:

- Do not replace `tools/dashboard` or existing command-line workflows.
- Do not move Security guard, Resource guard, Git workflow, CI evidence, or lesson progression logic into React.
- Do not make Vite startup, dev-server URLs, or frontend build tooling part of the ordinary learner-facing dashboard workflow.
- Do not require learners or non-engineer users to run multiple setup, server, URL, data, or verification commands just to access the control center.
- Do not implement dangerous operations, live external integrations, or credential flows from the initial control-center UI.
- Do not reduce full/no-cache, CI, pre-commit, as-built, lesson, product-security, or repository-boundary coverage for convenience.

SYNC-ID: dashboard_control_center_data_layer
STATUS: implemented
ARTIFACTS: docs/workflow/DASHBOARD_DATA_SCHEMA.tsv,docs/workflow/AS_BUILT_SYNC_CONTRACT.tsv,docs/workflow/TEST_PLAN_MANIFEST.tsv,docs/workflow/GIT_HOOK_CHECKS.tsv,docs/workflow/GIT_HOOK_PARALLEL_GROUPS.tsv,docs/workflow/FINAL_GATE_GAP_COMMANDS.tsv,docs/workflow/FINAL_GATE_COVERAGE.tsv,tools/lib/dashboard_data.sh,tools/dashboard-data,tools/test_dashboard_schema.sh,tools/test_dashboard_data.sh,tools/test_lesson_repository.sh,tools/check_lesson_structure.sh,tools/check_lesson14_structure.sh,tools/check_ci_workflow_structure.sh,.github/workflows/ci.yml,.github/workflows/lesson14-ci.yml
TESTS: tools/test_dashboard_schema.sh,tools/test_dashboard_data.sh,tools/check_test_plan_coverage.sh,tools/test_git_hooks.sh,tools/test_git_hooks_parallel.sh,tools/test_ci_final_gate.sh,tools/check_ci_workflow_structure.sh,tools/check_as_built_sync_contract.sh,tools/check_as_built_docs.sh

## Implemented Dashboard Control Center React UI Requirements

The implemented React/Vite control-center UI turns the implemented read-only dashboard JSON layer into a browser dashboard while preserving the existing CLI dashboard, lesson flows, workflow checks, CI, pre-commit, and document routes.
This implementation is additive: it adds approved React/Vite dependencies, package scripts, browser runtime files, maintained entry tooling, and browser tests without replacing existing command-line workflows or adding UI action execution.

Purpose:

- Give non-engineer users a clear control-center view for lesson content, lesson progress, lesson management, concise points, and next safe learning action.
- Give intermediate and senior engineers a practical workflow control panel for workflow content, workflow progress, gate status, evidence, blockers, approvals, Git/CI sync, and next operational action.
- Keep the ordinary user interaction to one dashboard/control-center entry action; Vite startup, dev-server URLs, package scripts, JSON loading, and checks must stay behind maintained tooling.

Problems to solve:

- The current JSON data layer must be presented as an accessible browser control center without becoming a second source of truth.
- Lessons and workflows must both be visible without collapsing learning progress into workflow state or workflow gates into vague learner-only labels.
- Concise notes, points, warnings, and next safe actions need a consistent UI placement so users can understand what matters before starting or resuming work.

Target scope:

- Provide a read-only React/Vite UI that consumes `tools/dashboard-data` output rather than parsing `tools/dashboard` prose.
- Keep lesson and workflow surfaces visually and structurally distinct, with shared summary, guidance, blockers, and next-action areas.
- Use reusable frontend data adapters and component boundaries so the UI remains generic over the dashboard schema instead of hard-coding current wording or product-stack assumptions.
- Defer any lesson points, warnings, or next-action fields that are not present in the dashboard JSON contract until the data layer and schema are explicitly extended and tested.
- Keep UI checks standalone-callable and aggregate-callable, connected through existing dashboard schema/data tests, Playwright, Git hooks, pre-commit, CI, and repo-local validation routes.

Non-scope:

- Do not replace `tools/dashboard`, `tools/dashboard-data`, `tools/menu`, `tools/lesson`, or `tools/lesson14`.
- Do not expose React/Vite dependencies, package scripts, dev-server launchers, dev-server URLs, npm commands, or frontend build mechanics as the ordinary dashboard workflow.
- Do not execute push, PR creation, merge, cleanup, deletion, external integration, OAuth/API, credential, or destructive operations from the initial UI.
- Do not make live network or GitHub status authoritative for rendering unless a later approved check explicitly requires it.

Existing-feature impact:

- Existing 7-day, 14-day, applied lesson, menu, dashboard CLI, Git workflow, Git hooks, Security guard, product-security, as-built sync, docs-tour, CI, local full/no-cache, and pre-commit behavior must remain unchanged.
- No existing-feature tradeoff is allowed; if a future UI implementation appears to require one, it must stop and be redesigned.

Required document updates:

- Synchronize this implementation through `docs/workflow/AS_BUILT_SYNC_CONTRACT.tsv`, the three as-built documents, `docs/workflow/TASK_TRACKER.md`, and `docs/workflow/HANDOFF.md`.
- Keep the implemented dashboard data-layer block separate from this implemented React UI block.

Required tests:

- Run existing dashboard schema/data tests, the new dashboard control-center test, Playwright checks, as-built sync checks, structure checks, aggregate repository tests, full/no-cache Git hooks, pre-commit, and remote CI after synchronization.
- UI tests must avoid route-name-only, UI-only, keyword-only, current-wording-only, and product-stack-specific assertions.

Risks:

- Future frontend changes could accidentally duplicate source-of-truth logic already owned by CLI/helpers.
- The UI could over-simplify workflow gates, evidence, blockers, approvals, or next actions.
- Tooling could expose Vite mechanics to ordinary users.
- Browser rendering could leak untrusted text, secret-like data, raw logs, external payloads, or unnecessary absolute paths if data boundaries are weakened.

SYNC-ID: dashboard_control_center_react_ui_plan
STATUS: implemented
ARTIFACTS: docs/workflow/DASHBOARD_DATA_SCHEMA.tsv,docs/workflow/AS_BUILT_SYNC_CONTRACT.tsv,docs/workflow/TEST_PLAN_MANIFEST.tsv,docs/workflow/GIT_HOOK_CHECKS.tsv,docs/workflow/GIT_HOOK_PARALLEL_GROUPS.tsv,docs/workflow/GIT_HOOK_RECOMMENDATION_PATHS.tsv,docs/workflow/FINAL_GATE_COVERAGE.tsv,tools/dashboard-data,package.json,package-lock.json,vite.config.mjs,dashboard-control-center/index.html,dashboard-control-center/src/main.jsx,dashboard-control-center/src/App.jsx,dashboard-control-center/src/dashboardData.js,dashboard-control-center/src/styles.css,tools/dashboard,tools/dashboard-control-center,tools/test_dashboard_control_center.sh,tools/test_dashboard_schema.sh,tools/test_dashboard_data.sh,tools/test_lesson_playwright.sh,tools/test_lesson_repository.sh,tools/check_lesson_structure.sh,tools/check_lesson14_structure.sh,tools/check_ci_workflow_structure.sh,.github/workflows/ci.yml,.github/workflows/lesson14-ci.yml,tests/fixtures/dashboard-control-center.json,tests/playwright/dashboard-control-center.spec.js
TESTS: tools/test_dashboard_schema.sh,tools/test_dashboard_data.sh,tools/test_dashboard_control_center.sh,tools/test_lesson_playwright.sh,tools/check_test_plan_coverage.sh,tools/test_git_hooks.sh,tools/test_git_hooks_parallel.sh,tools/test_ci_final_gate.sh,tools/check_as_built_sync_contract.sh,tools/check_as_built_docs.sh,tools/check_ci_workflow_structure.sh

## Implemented Dashboard Control Center Information Architecture Requirements

The dashboard control center must remain read-only while becoming easier to understand for ordinary learners and practical for engineers.
This implemented follow-up is additive to `dashboard_control_center_react_ui_plan`; it improves information architecture, visual hierarchy, device-language UI labels, and snapshot freshness visibility without changing the JSON source of truth or enabling browser-side command execution.

Purpose:

- Make the browser dashboard easier to scan by separating overview, lesson, development workflow, maintenance sync, and safety/action-preview content into clear categories.
- Align the implemented UI with the dashboard mock direction stored at `dashboard-control-center/mocks/archive/mock-categorized-dashboard.png` while preserving the repository's existing JSON contract and safety boundaries.
- Let fixed UI chrome follow the user's device language when supported, with English as the default and technical identifiers, commands, file paths, and data-derived text left unmodified when translation would reduce clarity or safety.
- Make snapshot age and generated time visible so users do not mistake optional or live-like fields for authoritative real-time status.

Problems to solve:

- The initial one-page vertical layout made the dashboard hard to understand because lessons, workflow, maintenance, security, and command previews appeared as one long surface.
- Command previews on the first screen made the read-only dashboard look more operational than intended.
- Fixed English-only UI labels were less comfortable for Japanese device environments, while translating all data-derived text in the browser would risk changing operational meaning.
- Snapshot data needed an obvious freshness boundary because the UI does not poll or run live checks.

Target scope:

- Add category navigation with an overview-first default view.
- Keep command previews isolated under Safety Actions while keeping them preview-only and non-executable.
- Add a small UI-localization layer for fixed labels, initially `en` and `ja`, using device language with English fallback.
- Format generated time and relative snapshot age using browser locale APIs.
- Keep lesson and workflow state separate and keep data-derived guidance, warnings, commands, file names, gate IDs, and source strings as data.
- Preserve reusable component and adapter boundaries so later phases can add manual refresh, safe polling, approved action execution, live CI/Git status, and broader localization without rewriting the first UI layer.

Non-scope:

- Do not implement automatic updates, WebSocket/live streaming, browser-triggered checks, command execution, GitHub/Git live authority, or broad multi-language coverage in this phase.
- Do not translate dashboard JSON prose, commands, gate IDs, file paths, raw source identifiers, or structured state ownership in the browser.
- Do not change `tools/dashboard-data`, `tools/dashboard`, 7-day lesson progression, 14-day lesson progression, existing CI, existing checks, existing document routes, or existing approval gates.
- Do not make frontend-only summaries authoritative for safety, CI, Git, approval, or gate decisions.

Existing-feature impact:

- Existing CLI dashboard, dashboard JSON producer, schema checks, React/Vite entry tooling, 7-day and 14-day lesson paths, Git hooks, pre-commit, CI, docs-tour, as-built sync, Security guard, Resource guard, Git workflow, and product-security behavior must remain unchanged.
- No existing-feature tradeoff is allowed; if a later live/action phase appears to require a tradeoff, implementation must stop and request developer approval.

Required document updates:

- Synchronize this follow-up through the as-built sync contract, the three as-built documents, `docs/workflow/TASK_TRACKER.md`, and `docs/workflow/HANDOFF.md`.
- Keep the implemented data-layer and initial React UI sync IDs separate from this categorized information-architecture sync ID.

Required tests:

- Keep `tools/test_dashboard_control_center.sh` standalone-callable and aggregate-callable.
- Extend Playwright coverage to verify overview-first navigation, category separation, Safety Actions command-preview isolation, no executable buttons, secret-like redaction, mobile layout, and `en`/`ja` fixed-label localization.
- Run existing dashboard schema/data checks, as-built sync checks, test-plan coverage, CI workflow structure checks, aggregate checks, Git hooks, and pre-commit before final PASS.

Risks:

- UI-local summaries could be mistaken for owner-layer truth if labels do not emphasize read-only snapshot behavior.
- Browser localization could accidentally translate data-derived operational text and change meaning.
- Category splitting could hide workflow or safety details from engineers if command previews, approvals, blockers, and unknown/optional states are not discoverable.
- Future live update and action-execution phases could blur the read-only boundary unless they are separately specified, approved, and tested.

SYNC-ID: dashboard_control_center_information_architecture
STATUS: implemented
ARTIFACTS: docs/workflow/AS_BUILT_SYNC_CONTRACT.tsv,docs/workflow/TEST_PLAN_MANIFEST.tsv,vite.config.mjs,dashboard-control-center/mocks/archive/mock-categorized-dashboard.png,dashboard-control-center/src/App.jsx,dashboard-control-center/src/dashboardData.js,dashboard-control-center/src/i18n.js,dashboard-control-center/src/styles.css,tests/fixtures/dashboard-control-center.json,tests/playwright/dashboard-control-center.spec.js,tools/test_dashboard_control_center.sh,tools/test_lesson_repository.sh
TESTS: tools/test_dashboard_control_center.sh,tools/test_dashboard_schema.sh,tools/test_dashboard_data.sh,tools/check_as_built_sync_contract.sh,tools/check_as_built_docs.sh,tools/check_test_plan_coverage.sh,tools/check_ci_workflow_structure.sh

## Implemented Dashboard Control Center Visual Polish Requirements

The dashboard control center must more closely match the approved categorized dashboard mock while preserving the implemented read-only JSON boundary, category information architecture, device-language label policy, and Safety Actions isolation.
This work is visual polish only; it must not change lesson progression, dashboard data ownership, command execution safety, CI/Git authority, or existing CLI behavior.

Purpose:

- Make the implemented browser dashboard look closer to `dashboard-control-center/mocks/archive/mock-categorized-dashboard.png` so the visual design matches the approved direction, not only the category structure.
- Improve scanability through a more compact status strip, 2x2 category-health layout, clearer overview hierarchy, and category shortcut cards.
- Keep the dashboard useful in Japanese and English environments without allowing visual polish to translate or reinterpret operational data.

Problems to solve:

- The previous implementation matched the mock's information architecture but still looked visually different from the mock.
- The Overview health area appeared as a vertical stack instead of the mock's compact card grid.
- The top status information used separated cards rather than a segmented operational strip.
- The sidebar lacked the mock-like bottom metadata and the overview lacked an Explore Pages-style secondary navigation area.

Target scope:

- Tune React markup and CSS to better match the mock's operational dashboard look: sidebar density, status strip, overview grid, health cards, category shortcuts, card spacing, borders, subtle depth, and responsive constraints.
- Keep all changes within existing React/Vite files and existing Playwright control-center checks.
- Add behavior-oriented visual layout assertions that check structure, relative layout, and responsive stability without depending on pixel-perfect screenshots or specific live data.

Non-scope:

- Do not add automatic refresh, live CI/Git status, command execution, broad localization, new dependencies, generated runtime images, SVG illustration systems, or backend changes.
- Do not make pixel-perfect matching to the image generator output a correctness requirement.
- Do not weaken existing dashboard schema, dashboard data, control-center safety, 7-day/14-day lesson, CI, Git hooks, pre-commit, or document synchronization checks.

Existing-feature impact:

- Existing dashboard data producer, control-center entry tooling, Playwright tests, aggregate tests, full hooks, pre-commit, CI workflow structure, and documentation routes remain active.
- Existing read-only behavior and preview-only command safety must remain unchanged.
- No existing-feature tradeoff is allowed.

Required document updates:

- Add this visual-polish sync ID to the as-built sync contract and the five synchronized documents.
- Keep `dashboard_control_center_data_layer`, `dashboard_control_center_react_ui_plan`, and `dashboard_control_center_information_architecture` intact as prior implemented layers.

Required tests:

- Extend `tools/test_dashboard_control_center.sh` coverage through the existing Playwright spec.
- Verify segmented snapshot status, 2x2 desktop health-card layout, Explore Pages/category shortcut presence, mobile no-overflow behavior, `en`/`ja` label behavior, no execution buttons, and Safety Actions command isolation.
- Run as-built sync checks, test-plan coverage, CI workflow structure checks, aggregate repository tests, full hooks, pre-commit, and final gate before PASS.

Risks:

- Visual polish could hide operational detail or make command previews appear less isolated.
- Overly exact screenshot matching could make tests brittle.
- Styling changes could regress Japanese text wrapping or mobile layout.
- Adding visual detail could accidentally create button-like action affordances for read-only links or commands.

SYNC-ID: dashboard_control_center_visual_polish
STATUS: implemented
ARTIFACTS: docs/workflow/AS_BUILT_SYNC_CONTRACT.tsv,dashboard-control-center/mocks/archive/mock-categorized-dashboard.png,dashboard-control-center/src/App.jsx,dashboard-control-center/src/i18n.js,dashboard-control-center/src/styles.css,tests/playwright/dashboard-control-center.spec.js,tools/test_dashboard_control_center.sh,tools/test_lesson_repository.sh
TESTS: tools/test_dashboard_control_center.sh,tools/check_as_built_sync_contract.sh,tools/check_as_built_docs.sh,tools/check_test_plan_coverage.sh,tools/check_ci_workflow_structure.sh

## Implemented Dashboard Control Center Mock Parity Requirements

The mock-parity follow-up is implemented as a data-backed visual and information-structure correction for the existing read-only React/Vite dashboard.
It must close the known gap between the visible dashboard and `dashboard-control-center/mocks/archive/mock-categorized-dashboard.png` without making the generated image itself the source of truth.

Problems to solve:

- The Next Safe Action area can become too tall because long issue lists are shown directly in the Overview.
- The mock-level primary action, including the Review lessons and accept for workflow intent, is not represented as structured dashboard data.
- Partial Failures need a compact Overview summary with access to full detail.
- Health cards use icon-like centers where the mock uses data-derived progress percentages.
- Explore Pages cards lack data-derived bottom metrics such as counts, units, progress, and state markers.
- The UI must not invent progress numbers or mock-specific fixed values when the dashboard JSON does not provide those values.

Target scope:

- Extend the dashboard data schema and producer with category metrics and a structured primary action derived from existing lesson, workflow, maintenance, Git, CI, and security status sources.
- Render the mock-aligned Overview composition: compact Next Safe Action, limited issue summaries with full detail preserved outside the Overview, central percentage rings, and Explore Pages metrics.
- Keep fixed UI labels localized through the existing `en`/`ja` boundary while preserving data-originated text, commands, file paths, gate IDs, and technical identifiers.
- Keep optional or unverified live checks as manual follow-ups instead of true Partial Failures.
- Keep the dashboard read-only and keep command previews isolated to Safety Actions.
- Keep tests structure-oriented and data-driven instead of depending on one fixed mock screenshot value.

Non-scope:

- Do not execute commands from the browser.
- Do not parse `tools/dashboard` prose in the browser.
- Do not add live CI/Git authority, broad localization, or new dependency stacks in this mock-parity layer.
- Do not weaken or replace the 7-day flow, 14-day flow, existing CI, existing checks, document routes, data-layer contract, or visual-polish layer.

Existing-feature impact:

- Existing dashboard data, React/Vite entry points, schema checks, Playwright checks, aggregate tests, Git hooks, CI, and pre-commit remain active.
- Existing 7-day and 14-day lesson behavior must be preserved.
- No existing-feature tradeoff is allowed.

Required document updates:

- Keep `dashboard_control_center_data_layer`, `dashboard_control_center_react_ui_plan`, `dashboard_control_center_information_architecture`, and `dashboard_control_center_visual_polish` as implemented layers.
- Add this mock-parity sync ID to the sync contract and the five synchronized documents.
- Update the dashboard data schema only for producer-owned fields needed by the UI.

Required tests:

- Dashboard schema and dashboard data checks must validate category metrics and structured primary action fields.
- Control-center tests must verify compact issue summary behavior, data-derived percentage rings, Explore Pages metrics, localization boundaries, read-only behavior, and command-preview isolation.
- Control-center tests must use at least two valid fixtures with different metrics so hard-coded mock percentages or counts fail.
- Mock-parity acceptance requires compact Next Safe Action, compact issue summaries with full detail reachable through category pages, visible Partial Failures when true failures exist, central percentage rings, Explore Pages bottom metrics, and no fixed mock values.
- Aggregate and sync checks must continue to pass.
- The sync-contract `TESTS` field lists directly wired standalone checks; aggregate test, full/no-cache hooks, pre-commit, and final gate remain required final verification evidence outside that field.

Risks:

- Mock parity could accidentally become pixel-copy testing or fixed-value testing.
- Optional or unverified checks could be mislabelled as true failures.
- New percentages could imply gate authority if they are not clearly derived scan aids.
- Additional cards could regress mobile or Japanese text wrapping.

SYNC-ID: dashboard_control_center_mock_parity
STATUS: implemented
ARTIFACTS: docs/workflow/DASHBOARD_DATA_SCHEMA.tsv,docs/workflow/AS_BUILT_SYNC_CONTRACT.tsv,tools/lib/dashboard_data.sh,tools/dashboard-data,dashboard-control-center/mocks/archive/mock-categorized-dashboard.png,dashboard-control-center/src/App.jsx,dashboard-control-center/src/dashboardData.js,dashboard-control-center/src/i18n.js,dashboard-control-center/src/styles.css,tests/fixtures/dashboard-control-center.json,tests/fixtures/dashboard-control-center-live-update.json,tests/fixtures/dashboard-control-center-invalid.json,tests/playwright/dashboard-control-center.spec.js,tools/test_dashboard_schema.sh,tools/test_dashboard_data.sh,tools/test_dashboard_control_center.sh,tools/test_lesson_repository.sh
TESTS: tools/test_dashboard_schema.sh,tools/test_dashboard_data.sh,tools/test_dashboard_control_center.sh,tools/check_as_built_sync_contract.sh,tools/check_as_built_docs.sh,tools/check_test_plan_coverage.sh,tools/check_ci_workflow_structure.sh

## Implemented Dashboard Control Center Live Snapshot Sync Requirements

The live-snapshot follow-up is implemented as a safe read-only refresh layer for the React/Vite control center.
It must let an already-open dashboard update from newly published dashboard JSON without a page reload and without allowing the browser to run repository commands.

Problems to solve:

- The current dashboard updates only after a page reload.
- The control-center CLI writes one snapshot before opening the UI, so an adjacent running CLI can diverge from the browser display.
- Invalid or partially written JSON could cause a blank or misleading dashboard if refresh is not fail-closed.

Target scope:

- Make the control-center snapshot writer publish JSON atomically through validate-then-rename behavior.
- Make the control-center open command refresh the JSON snapshot on a small configurable interval while the dev server is running.
- Make the React app poll only the dashboard JSON endpoint with GET requests, detect changed snapshots through producer-owned snapshot identity, update without reload, and retain the last known good snapshot on invalid, missing, or temporarily failed reads.
- Surface stale or refresh-error state as UI status without converting it into CI, Git, approval, or security authority.

Non-scope:

- Do not add WebSocket, server-sent events, browser-triggered checks, browser-triggered Git/GitHub/CI calls, or command execution.
- Do not add automatic merge, push, PR creation, destructive operations, or approval bypass.
- Do not weaken existing snapshot, schema, control-center, CI, or pre-commit coverage.

Existing-feature impact:

- Existing manual snapshot generation, Vite dashboard opening, data validation, no-prose parsing rule, and read-only safety boundary must keep working.
- 7-day, 14-day, existing CI, existing checks, and existing document navigation remain unaffected.
- No existing-feature tradeoff is allowed.

Required document updates:

- Add this live-sync sync ID to the sync contract and the five synchronized documents.
- Update the dashboard data schema only where snapshot identity or live refresh state needs a producer-owned field.
- Keep live sync separate from mock parity so future command execution or CI/Git live authority cannot be smuggled into this read-only refresh layer.

Required tests:

- Standalone control-center checks must cover atomic snapshot writing, valid JSON publication, read-only source boundaries, and static no-command-execution invariants.
- Playwright coverage must verify a visible update without page reload and last-known-good behavior on a failed refresh.
- Aggregate, sync, test-plan, and CI-structure checks must continue to pass.
- The sync-contract `TESTS` field lists directly wired standalone checks; aggregate test, full/no-cache hooks, pre-commit, and final gate remain required final verification evidence outside that field.

Risks:

- Polling too often could make local development noisy or slow.
- Partial writes could break the UI if the writer is not atomic.
- Refresh failures could be mistaken for authoritative gate failures.
- Test timing could become flaky unless update tests are deterministic.

SYNC-ID: dashboard_control_center_live_snapshot_sync
STATUS: implemented
ARTIFACTS: docs/workflow/DASHBOARD_DATA_SCHEMA.tsv,docs/workflow/AS_BUILT_SYNC_CONTRACT.tsv,tools/lib/dashboard_data.sh,tools/dashboard-data,tools/dashboard-control-center,vite.config.mjs,dashboard-control-center/src/App.jsx,dashboard-control-center/src/dashboardData.js,dashboard-control-center/src/i18n.js,dashboard-control-center/src/styles.css,tests/fixtures/dashboard-control-center.json,tests/fixtures/dashboard-control-center-live-update.json,tests/fixtures/dashboard-control-center-invalid.json,tests/playwright/dashboard-control-center.spec.js,tools/test_dashboard_control_center.sh,tools/test_lesson_repository.sh
TESTS: tools/test_dashboard_schema.sh,tools/test_dashboard_data.sh,tools/test_dashboard_control_center.sh,tools/check_as_built_sync_contract.sh,tools/check_as_built_docs.sh,tools/check_test_plan_coverage.sh,tools/check_ci_workflow_structure.sh

## Implemented Dashboard Control Center Mock-Aligned Overview Requirements

The mock-aligned Overview follow-up makes the browser control center match `dashboard-control-center/mocks/archive/mock-categorized-dashboard.png` more closely while preserving the read-only repository control-panel boundary.
The work is additive to the implemented data layer, React UI, information architecture, visual polish, mock parity, and live snapshot sync layers.

Problems to solve:

- The visible main header and snapshot explanation add non-mock chrome above the operational dashboard content.
- The Next Safe Action card is not yet visually strong enough as the primary decision area.
- The Next Safe Action heading, emphasized action row, and metadata rows need to match the mock hierarchy instead of using one uniformly colored card.
- Empty Partial Failures are not explicitly represented as a stable no-failure state.
- Manual follow-ups can appear at the same visual level as true Partial Failures.
- Overview expansion controls can change page height and make the control panel less stable.
- Repeated navigation, status, card, summary, and detail rows need mock-aligned left-side visual anchors for scanning.
- The four health rings need stable category color identity so frequent users can recognize lesson, workflow, maintenance, and safety at a glance.
- The bottom read-only notice needs wording specific to this repository control panel.

Implemented scope:

- The Overview begins with compact status information and mock-aligned operational cards instead of a large page header.
- An accessible page title is preserved without displaying the previous large header block.
- The visible snapshot explanation block is removed from the Overview.
- Next Safe Action is structured with a leading safe-action icon outside the emphasized action row, a green-accented action title row, and white icon-led metadata rows.
- Partial Failures is always shown; when there are no true failures, it shows a concise none state instead of hiding the category.
- Manual follow-ups are in a separate third-row summary card that shows necessary summary information and links to detail pages.
- Overview disclosure expansion that changes the page layout is avoided; detailed lists route to the existing category pages.
- Consistent mock-aligned left-side icons or glyphs are added to navigation, status, repeated item rows, summaries, and cards without making them executable controls.
- Health cards and Explore Pages remain data-driven through existing metrics rather than fixed mock values.
- The four health rings use distinct category colors for lessons, workflow, maintenance, and safety.
- The generic bottom read-only warning is replaced with a concise repository-control-panel notice.
- The visible Category Health heading is removed while keeping the category-health region available to assistive technology.
- The four health cards are height-aligned within the grid.

Non-scope:

- Do not add browser command execution, browser-triggered checks, live authoritative CI/Git status, destructive operations, or new dependency stacks.
- Do not change the dashboard JSON producer ownership model or parse `tools/dashboard` prose in the browser.
- Do not change 7-day lessons, 14-day lessons, existing CI, existing checks, pre-commit behavior, document routes, or command-preview safety boundaries.
- Do not make the mock image a pixel-perfect test oracle.

Existing-feature impact:

- Existing dashboard schema, data producer, live snapshot sync, last-known-good behavior, Safety Actions isolation, localization boundary, aggregate tests, Git hooks, CI, and pre-commit must remain active.
- The Overview changes must preserve read-only behavior and all existing category navigation paths.
- No existing-feature tradeoff is allowed.

Implemented document updates:

- Add this sync ID to the sync contract and the five synchronized documents.
- Keep this work separate from the earlier mock-parity and live-snapshot sync layers so future command execution or live authority cannot be smuggled into a visual-alignment follow-up.

Implemented tests:

- Control-center Playwright coverage verifies the removed visible header chrome, removed visible Category Health heading, stable Partial Failures none state, separate manual follow-up summary, mock-aligned Next Safe Action structure, global left-side icon anchors, distinct health-ring category colors, bottom repository notice, and no Overview expansion dependency.
- Existing schema, data, sync, test-plan, CI-structure, aggregate, hook, pre-commit, and final-gate checks remain required.

Risks:

- Removing the visible header could remove the only accessible page title if not replaced with an accessible equivalent.
- Added icons could create mobile overflow or decorative accessibility noise.
- Moving follow-ups could hide necessary operator context unless the summary and detail links remain clear.
- Mock-aligned styling could accidentally create command-like affordances if links and previews are not kept distinct.

SYNC-ID: dashboard_control_center_mock_aligned_overview
STATUS: implemented
ARTIFACTS: docs/workflow/AS_BUILT_SYNC_CONTRACT.tsv,dashboard-control-center/mocks/archive/mock-categorized-dashboard.png,dashboard-control-center/src/App.jsx,dashboard-control-center/src/i18n.js,dashboard-control-center/src/styles.css,tests/fixtures/dashboard-control-center.json,tests/fixtures/dashboard-control-center-live-update.json,tests/playwright/dashboard-control-center.spec.js,tools/test_dashboard_control_center.sh,tools/test_lesson_repository.sh
TESTS: tools/test_dashboard_control_center.sh,tools/check_as_built_sync_contract.sh,tools/check_as_built_docs.sh,tools/check_test_plan_coverage.sh,tools/check_ci_workflow_structure.sh

## Implemented Dashboard Control Center Detail-Page Mock Parity Requirements

The detail-page mock-parity follow-up aligns the four category detail pages with the approved detail mock images while preserving the existing read-only dashboard data model and live snapshot behavior.
The work is additive to the implemented Overview mock alignment and uses the four copied reference images as the UI/UX source of truth for hierarchy, density, color direction, and icon direction while keeping screenshot equality out of the automated contract.

Problems solved:

- Detail pages currently read like raw status data lists, so general repository users cannot immediately tell what they are checking or what decision the page supports.
- The workflow icon still differs from the approved mock direction and can look like eyeglasses.
- The Overview and detail pages do not consistently reuse the same workflow icon, category colors, status hierarchy, and scan-first visual language.
- The risk pill can look off-center for single-character Japanese values such as `低`.
- Workflow detail labels expose technical keys such as `Development.Product Repository` as primary headings.
- Detail cards can be too empty or too evenly weighted, which hides approval-required, unknown, failed, blocked, missing, and manual-follow-up priorities.
- Partial Failures, manual follow-ups, warnings, and command previews need clearer visual separation without adding browser execution affordances.

Implemented scope:

- Added reusable detail-page chrome and decision summaries that show what each page checks, current judgment, must-review items, and the next safe check.
- Applied the summary pattern to Lessons, Development Workflow, Maintenance Sync, and Safety Actions.
- Replaced the workflow category icon with a centralized branching `Network` icon component reused across navigation, Overview, Explore Pages, and workflow detail surfaces.
- Kept Lessons blue, Workflow teal, Maintenance purple, and Safety green while preserving separate warning/error colors.
- Reworked Lessons into mock-aligned inspection panels with a status band, prominent lesson heading, warning callout, and row-based checks.
- Reworked Development Workflow into prioritized must-review and ready row lists with human-readable labels and secondary technical keys.
- Reworked Maintenance Sync into status cards, a manual confirmation table, and an expanded source boundary panel.
- Reworked Safety Actions into safety status cards, a Partial Failures table, display-only command preview cards, and a read-only notice.
- Kept risk/status pill content centered for short and localized labels.
- Preserved English as the repository-standard data language while using the existing translator boundary to display fixed UI labels and known control-center source/intent labels in the viewer's resolved UI locale.
- Kept lesson/workflow language settings as user-selected state fields, not as the UI locale resolver.
- Tightened the detail pages against the approved mocks so the active category icon, page header, first-row decision summary, status-card icon containers, failure severity icons, and display-only command-preview grouping read like the visual source references instead of generic data panels.
- Expanded the first-row decision summaries to support concise bullets, count badges, and safe in-page/category links so non-engineer users can identify what is checked, what can be decided, and where to look next without relying on external explanation.
- Kept all added user-facing labels behind the existing UI locale translator boundary; no Japanese-only runtime literals are added, and source evidence remains displayed as sanitized data.

Non-scope:

- Do not add browser command execution, browser-triggered checks, live authoritative CI/Git status, destructive operations, schema ownership changes, or new dependency stacks.
- Do not change 7-day lessons, 14-day lessons, existing CI, existing checks, pre-commit behavior, document routes, or command-preview safety boundaries.
- Do not make the generated detail mock images pixel-perfect test oracles.
- Do not hard-code fixture-specific counts or wording into runtime logic.
- Do not treat lesson display language or product development language settings as the control-panel UI locale.

Existing-feature impact:

- Existing dashboard schema, data producer, live snapshot sync, last-known-good behavior, Safety Actions isolation, localization boundary, aggregate tests, Git hooks, CI, and pre-commit must remain active.
- The detail-page changes must preserve all existing category routes and read-only source boundaries.
- No existing-feature tradeoff is allowed.

Required document updates:

- Synchronize this sync ID through the sync contract and the five synchronized documents.
- Keep this work distinct from Overview mock alignment so future detail-page changes can be validated independently.

Required tests:

- Control-center Playwright coverage must verify each detail page exposes the decision summary, active navigation, no command execution buttons, readable workflow titles, unified workflow icons, centered short risk labels, safe command-preview presentation, and no mobile overflow.
- Existing sync, test-plan, CI-structure, aggregate, hook, pre-commit, and final-gate checks remain required final verification evidence.

Risks:

- Adding summaries could duplicate data unless they are derived from existing dashboard data and translator helpers.
- Hiding technical keys too aggressively could reduce developer traceability unless raw keys remain available as secondary labels.
- Stronger safety styling could make read-only command previews look actionable unless labels and button absence remain explicit.
- Mock-aligned layouts could break on variable-length data unless responsive constraints and non-hard-coded tests are maintained.

SYNC-ID: dashboard_control_center_detail_mock_parity
STATUS: implemented
ARTIFACTS: docs/workflow/AS_BUILT_SYNC_CONTRACT.tsv,dashboard-control-center/mocks/archive/mock-detail-lessons.png,dashboard-control-center/mocks/archive/mock-detail-workflow.png,dashboard-control-center/mocks/archive/mock-detail-maintenance.png,dashboard-control-center/mocks/archive/mock-detail-safety.png,dashboard-control-center/src/App.jsx,dashboard-control-center/src/i18n.js,dashboard-control-center/src/styles.css,tests/fixtures/dashboard-control-center.json,tests/playwright/dashboard-control-center.spec.js,tools/test_dashboard_control_center.sh,tools/test_lesson_repository.sh
TESTS: tools/test_dashboard_control_center.sh,tools/check_as_built_sync_contract.sh,tools/check_as_built_docs.sh,tools/check_test_plan_coverage.sh,tools/check_ci_workflow_structure.sh

## Mechanical Enforcement

- 14-day progression requires approval receipts through `tools/lesson14 承認`.
- 7-day `setup.index` cannot pass before learning mode, workflow display language, and product development language are selected.
- 14-day `setup.index` cannot pass before learning mode, workflow display language, and product development language are selected.
- Developer-memory requirements are checked by `tools/check_developer_memory_requirements.sh`.
- Lesson-side validation is checked by `tools/test_lesson_repository.sh`.
- 7-day CLI behavior is checked by `tools/test_lesson.sh`.
- 14-day CLI behavior is checked by `tools/test_lesson14.sh`.
- Free/Team product gates are regression-tested with a temporary product repository through `tools/test_product_gate_tools.sh`.
- Product repository cleanup is regression-tested with temporary local repositories and a fake `gh` command through `tools/test_product_repository_cleanup.sh`.
- Product security workflow gates are regression-tested through `tools/test_product_security.sh` and existing product gate tests.
- As-built document consistency is checked by `tools/check_as_built_docs.sh`.
- Security guard invariants are checked by `tools/check_security_invariants.sh` and `tools/test_security_invariants.sh`.
- Sub-agent review protocol presence is checked by `tools/check_review_protocol.sh`.
- Real product operations are checked by `tools/test_production_operations.sh` only when an external product repository exists.
- Free Development Mode is gated by `tools/free-development gate`.
- Team Development and Docker is gated by `tools/team-development gate`.
- Product Improvement is gated by `tools/product-improvement gate`.
- Documentation Map is checked by `tools/test_docs_tour.sh`.
- Documentation Map runtime status is shown by `tools/docs-tour status` and `tools/dashboard docs`.
- Menu prerequisites are checked by `tools/menu check <1|2|3|4|5|6>` and `tools/test_menu_prerequisites.sh`.
- The learner-facing menu is checked by `tools/menu` and developer-memory requirement checks.
- Git workflow policy settings are checked by `tools/git-workflow status`, `tools/git-workflow cleanup-plan`, and `tools/test_git_workflow_policy.sh`.
- Git hooks policy settings are checked by `tools/git-hooks status`, `tools/test_git_hooks.sh`, and full/no-cache CI hook runs.
- Dashboard and illustration entry points are checked by structure and developer-memory requirement checks.
- Remediation remains complete only while the audit items above are implemented, synchronized into these as-built documents, and covered by mechanical checks that fail when the requirement is missing.
- Remediation checks and implementations must remain refactorable, ecosystem-friendly, reusable, and general.

## Non-Goals

- Do not replace the 7-day flow.
- Do not replace the 14-day flow.
- Do not introduce a tradeoff against existing behavior, checks, or learner workflows.
- Do not force a fixed product technology stack.
- Do not require Docker execution when Docker is not installed or the learner has not chosen container implementation.
- Do not skip requirements, specifications, plans, task tracking, handoff, Git sync, tests, or CI in Free Development Mode.
- Do not recreate or depend on `task-tracker-repository` during lesson-repository validation.
- Do not weaken current tests, CLI commands, lesson flows, free-development flow, advanced modules, or repository-boundary rules while implementing remediation.
- Do not change unrelated existing documentation content as part of the remediation.

## Completion Criteria

- All lesson structure and sync checks pass.
- Developer-memory requirements check passes.
- Lesson repository aggregate test passes.
- Implemented 7-day parity verification passes `./tools/test_lesson.sh` and `./tools/test_lesson_repository.sh`.
- Implemented language-list expansion verification passes `./tools/test_lesson.sh`, `./tools/test_lesson14.sh`, and `./tools/test_lesson_repository.sh`.
- `docs/workflow/TASK_TRACKER.md`, `docs/workflow/HANDOFF.md`, `docs/as-built/REQUIREMENTS.md`, `docs/as-built/SPECIFICATION.md`, and `docs/as-built/IMPLEMENTATION_PLAN.md` reflect the same as-built state.
- `task-tracker-repository` remains outside this repository and may remain deleted unless a real product operations test is explicitly requested.
- The developer-memory audit remains cleared only while all remediation requirements in this document are implemented or mechanically enforced.

## Planned Lesson Display Label Policy Requirements

SYNC-ID: lesson_display_label_policy
STATUS: implemented
ARTIFACTS: docs/workflow/LESSON_DISPLAY_LABELS.tsv,tools/lib/lesson_display_labels.sh,tools/lib/lesson_common.sh,tools/lib/lesson_runtime.sh,tools/menu,tools/dashboard,tools/learn,tools/helpdesk,tools/lesson14,tools/roadmap,tools/docs-tour,README.md,AGENTS.MD,index.md,index-14-days.md,ai-driven-task-tracker-scenario.md,guides/LESSON_14_DAYS.md,learning/ROADMAP.md,lesson/LESSON_FLOW_14_DAYS.tsv,prompts/PROMPTS.md,prompts/PROMPTS_14_DAYS.md,playbooks/AGENT_PLAYBOOK.md,playbooks/AGENT_PLAYBOOK_14_DAYS.md,tools/check_learner_display.sh,tools/test_menu_prerequisites.sh,tools/check_lesson14_sync.sh,tools/check_agents_skills.sh
TESTS: tools/check_learner_display.sh,tools/test_menu_prerequisites.sh,tools/check_lesson14_sync.sh,tools/check_agents_skills.sh,tools/test_lesson14.sh

The lesson repository separates learner-facing display labels from internal compatibility names before replacing old lesson-duration wording.
This implemented work improves learner-facing clarity without weakening the existing Step 1-7 path, Step 1-14 path, Lesson14 sync gates, CI, pre-commit, as-built synchronization, skills, prompts, dashboard, or historical learning records.

- Learner-facing menu and dashboard output must use a stable STEP-oriented course label such as `STEP 1-7: 基礎レッスン` and `STEP 1-14: 実践レッスン`.
- Internal compatibility names must remain available, including `tools/lesson`, `tools/lesson14`, `index.md`, `index-14-days.md`, `_14_DAYS` files, `dayN.*` step IDs, and `check_lesson14_*` commands.
- `Step N/14` must not be blindly renamed because it is also used as a Lesson14 sync-gate key.
- Learner-facing documentation, prompts, playbooks, menu output, dashboard output, roadmap output, learning helpdesk output, and new learning records must not keep misleading `7日間レッスン`, `14日間レッスン`, or learner-facing `Day` wording.
- Existing historical learning logs must not be bulk rewritten; new output should use the new display policy while old records remain auditable evidence.
- The learner-display check must detect more than `Day N`; it must also catch learner-facing `Day別`, `各Day`, `DayまたはStep`, Markdown `| Day |` headings, and old course labels outside approved internal or historical contexts.
- The learner-display check detects the active learner-surface regressions listed above while preserving approved internal and historical compatibility contexts.
- Checks must distinguish learner-facing forbidden labels from allowed internal compatibility names instead of relying on a global string replacement.
- Any display-label implementation must remain reusable, policy-driven, and independent of a specific product stack, language, or single hard-coded Japanese phrase.

## Implemented External Product Repository Authority Requirements

SYNC-ID: external_product_repository_authority
STATUS: implemented
ARTIFACTS: docs/workflow/AS_BUILT_SYNC_CONTRACT.tsv,docs/workflow/PRODUCT_REPOSITORY_STRUCTURE.tsv,docs/workflow/PRODUCT_GATE_EVIDENCE_SCHEMA.tsv,docs/workflow/DASHBOARD_DATA_SCHEMA.tsv,tools/lib/product_repository_authority.sh,tools/product-repository-authority,tools/test_product_repository_authority.sh,tools/lib/dashboard_data.sh,tools/dashboard-data,dashboard-control-center/src/dashboardData.js,dashboard-control-center/src/App.jsx,dashboard-control-center/src/i18n.js,dashboard-control-center/src/styles.css,tests/fixtures/dashboard-control-center.json,tests/fixtures/dashboard-control-center-live-update.json,tests/playwright/dashboard-control-center.spec.js,tools/test_dashboard_schema.sh,tools/test_dashboard_data.sh,docs/workflow/TEST_PLAN_MANIFEST.tsv,docs/workflow/GIT_HOOK_CHECKS.tsv,docs/workflow/GIT_HOOK_PARALLEL_GROUPS.tsv,docs/workflow/FINAL_GATE_COVERAGE.tsv,tools/test_lesson_repository.sh,tools/check_lesson_structure.sh,tools/check_lesson14_structure.sh,.github/workflows/ci.yml,.github/workflows/lesson14-ci.yml,tools/check_ci_workflow_structure.sh
TESTS: tools/test_product_repository_authority.sh,tools/test_dashboard_schema.sh,tools/test_dashboard_data.sh,tools/check_test_plan_coverage.sh,tools/test_git_hooks.sh,tools/test_git_hooks_parallel.sh,tools/test_ci_final_gate.sh,tools/check_ci_workflow_structure.sh,tools/check_as_built_sync_contract.sh,tools/check_as_built_docs.sh

The lesson repository must treat external product repositories as first-class workflow sources without copying the lesson repository wholesale.
This implemented work is additive and must not trade away existing 7-day lessons, 14-step lessons, existing CI, existing checks, existing document routes, product-repository cleanup, dashboard read-only behavior, or repository-boundary safety.

- Define a reusable product-repository structure contract that keeps product root files lean while moving product design, workflow, memory, and operation declarations under `docs/` and `ops/`.
- Keep existing product-side `AGENT.md` discoverable as a legacy root entry until the planned product-side `AGENTS.MD` migration replaces it, and keep lesson-side `AGENTS.MD` as the lesson repository rulebook.
- Preserve existing root-level product document compatibility through a shared product document path resolver until all product workflows are migrated.
- Let `task-tracker-repository` and future free-development product repositories share the same operational skeleton while allowing stack-specific additions through manifests.
- Make required, optional, and contextual product repository elements mechanically distinguishable by context and product type.
- Avoid stack-specific dashboard branches by reading product manifests for tests, CI, integrations, security, approvals, and dashboard-visible surfaces.
- Add product gate evidence as the authoritative read model for product Git, document, CI, security, approval, and gate status.
- Bind product evidence to product repository context, product HEAD, observation time, freshness, authority, required-in-context state, blockers, and next manual command previews.
- Keep evidence read-only for dashboard consumers and keep browser pages unable to execute shell, Git, GitHub, CI, or `tools/*` commands.
- Keep `tools/dashboard-data` as a read-only snapshot producer that reads existing product manifests and evidence only; it must not fetch remotes, call GitHub, run CI, create evidence, or mutate repositories.
- Show missing product repository state as a product-operation blocker without blocking unrelated lesson progress.
- Expose product-operation blockers separately from lesson-only blockers so a missing product repository cannot incorrectly stop lesson-only progress.
- Extend dashboard data state handling to distinguish not-run evidence and stale evidence from generic unknown state.
- Preserve English as the repository-standard source data language while allowing UI display to use the existing locale boundary.
- Keep tests and checks policy-driven, standalone-runnable, aggregate-runnable, and independent of one product stack, one wording, or one fixture case.

## Implemented STEP 1-14 Product Launch Quality Gate Requirements

SYNC-ID: step_1_14_product_launch_quality_gate
STATUS: implemented
ARTIFACTS: docs/workflow/AS_BUILT_SYNC_CONTRACT.tsv,lesson/SYNC_GATES_14_DAYS.tsv,lesson/LESSON_FLOW_14_DAYS.tsv,prompts/PROMPTS_14_DAYS.md,skills/lesson-sync-gate/SKILL.md,tools/check_lesson14_sync.sh,tools/test_lesson14.sh,tools/product-launch-check,tools/test_product_launch_check.sh,tools/test_product_gate_tools.sh,tools/check_as_built_sync_contract.sh,tools/check_as_built_docs.sh
TESTS: tools/check_lesson14_sync.sh,tools/test_lesson14.sh,tools/test_product_launch_check.sh,tools/test_product_gate_tools.sh,tools/check_as_built_sync_contract.sh,tools/check_as_built_docs.sh

STEP 1-14 product completion must guarantee that the generated product works through the user-facing launch path documented by the product repository.
This implemented work was the first priority because a lesson product that does not work as documented undermines learner trust before dashboard synchronization or external-repository automation can be meaningful.

Required outcomes:

- Treat the product README launch path as the user-facing authority for final product readiness.
- Require the STEP 1-14 task-tracker product to support opening `index.html` directly unless a later approved specification changes the official launch path.
- Add a lesson-side completion gate that prevents final STEP 1-14 completion when the documented launch path is unverified or failing.
- Ensure the Add Task user flow, task rendering, counters, status changes, and completed-task cleanup are checked through the documented launch path.
- Keep URL query parameters out of the product input contract unless a separate approved requirement adds them.
- Keep product implementation reusable and maintainable rather than adding a one-off browser workaround.
- Keep new launch-path checks standalone-runnable and aggregate-runnable through existing lesson and product-gate verification.
- Expose launch-path verification through `tools/product-launch-check` and `tools/test_product_launch_check.sh`, and keep those runtime artifacts recorded in the sync contract artifacts and tests.
- Preserve STEP 1-7, STEP 1-14 ordered progression, existing CI, existing checks, existing document routes, and existing repository-boundary behavior.

Non-scope:

- Do not change the official launch path from direct `index.html` opening to an HTTP-server-only path without developer approval.
- Do not add a bundler, new dependency, external service, or browser-side command execution as part of this planned gate.
- Do not make the lesson completion gate depend on one hard-coded product phrase, one browser URL, or one fixture-only case.

## Implemented Product Authority Evidence Status Propagation Requirements

SYNC-ID: product_authority_evidence_status_propagation
STATUS: implemented
ARTIFACTS: docs/workflow/AS_BUILT_SYNC_CONTRACT.tsv,docs/workflow/PRODUCT_GATE_EVIDENCE_SCHEMA.tsv,docs/workflow/PRODUCT_REPOSITORY_STRUCTURE.tsv,docs/workflow/DASHBOARD_DATA_SCHEMA.tsv,tools/lib/product_repository_authority.sh,tools/product-repository-authority,tools/test_product_repository_authority.sh,tools/lib/dashboard_data.sh,tools/dashboard-data,tools/test_dashboard_data.sh,tools/test_dashboard_schema.sh,tools/check_as_built_sync_contract.sh,tools/check_as_built_docs.sh
TESTS: tools/test_product_repository_authority.sh,tools/test_dashboard_schema.sh,tools/test_dashboard_data.sh,tools/check_as_built_sync_contract.sh,tools/check_as_built_docs.sh

Product authority must report product evidence accurately before dashboard context or workflow automation relies on it.
This implemented work was the second priority because incorrect evidence aggregation would make later dashboard and free-development displays authoritative-looking but wrong.

Required outcomes:

- Multiple product evidence rows must produce valid JSON.
- Required evidence with `failed`, `blocked`, `unknown`, `stale`, or `not_run` state must become product-operation blocker or manual-required state as appropriate.
- Context-mismatched evidence must not be treated as healthy evidence for the selected workflow context.
- Evidence status, freshness, authority, source id, required-in-context state, blocker reason, and next command preview must remain distinct fields.
- Product-operation blockers must remain scoped to product operations and must not block unrelated lesson-only progress.
- Dashboard-data must read product authority state but must not invent healthier status from missing or stale evidence.
- Tests must remain policy-driven and must not depend on one product stack, one wording, or one evidence row order.

Non-scope:

- Do not add evidence writing, GitHub polling, CI execution, Git fetch, or repository mutation to product authority.
- Do not remove root-level legacy product document compatibility.

## Implemented Free Development Product Repository Scaffold Requirements

SYNC-ID: free_development_product_repo_scaffold
STATUS: implemented
ARTIFACTS: free-development/FREE_DEVELOPMENT_MODE.md,docs/workflow/PRODUCT_REPOSITORY_STRUCTURE.tsv,docs/workflow/PRODUCT_GATE_EVIDENCE_SCHEMA.tsv,tools/free-development,tools/product-improvement,tools/external-integration,tools/product-scaffold-check,tools/test_product_scaffold_check.sh,tools/test_product_gate_tools.sh,tools/test_product_repository_authority.sh,tools/check_workflow_pair_sync.sh,tools/check_as_built_sync_contract.sh,tools/check_as_built_docs.sh
TESTS: tools/test_product_scaffold_check.sh,tools/test_product_gate_tools.sh,tools/test_product_repository_authority.sh,tools/check_workflow_pair_sync.sh,tools/check_as_built_sync_contract.sh,tools/check_as_built_docs.sh

Free Development Mode must create and validate external product repositories with the same operational clarity as the STEP 1-14 product repository while allowing stack-specific additions.
This implemented work was the third priority because selected-context dashboard display needs external repositories to expose a clear product skeleton and source authority.

Required outcomes:

- Keep product repository roots lean and predictable.
- Place product design documents under `docs/product/`, workflow documents under `docs/workflow/`, memory and recovery documents under `docs/memory/`, and operation declarations under `ops/`.
- Keep legacy root-level `AGENT.md`, `README.md`, selected entry files, and standard control directories discoverable until the planned product-side `AGENTS.MD` migration replaces the legacy agent entry.
- Declare entrypoint, runtime source, test source, CI, security, dashboard, and integration evidence through manifests rather than fixed stack-specific branches.
- Block root-level duplicate product documents under the current `product_repository_canonical_docs_only` contract.
- Let Free Development, Product Improvement, and External Integration share the same product repository authority model.
- Ensure scaffold validation is standalone-runnable and aggregate-runnable.
- Expose scaffold validation through `tools/product-scaffold-check` and `tools/test_product_scaffold_check.sh`, and keep those runtime artifacts recorded in the sync contract artifacts and tests.

Non-scope:

- Do not copy the entire lesson repository structure into external product repositories.
- Do not require one product stack, one framework, one language, one CI provider, or one generated app shape.

## Implemented Dashboard Control Center Selected Context Sync Requirements

SYNC-ID: dashboard_control_center_selected_context_sync
STATUS: implemented
ARTIFACTS: docs/workflow/AS_BUILT_SYNC_CONTRACT.tsv,docs/workflow/DASHBOARD_DATA_SCHEMA.tsv,docs/workflow/PRODUCT_REPOSITORY_STRUCTURE.tsv,docs/workflow/PRODUCT_GATE_EVIDENCE_SCHEMA.tsv,tools/lib/dashboard_data.sh,tools/dashboard-data,tools/lib/product_repository_authority.sh,tools/product-repository-authority,tools/test_product_repository_authority.sh,tools/test_dashboard_schema.sh,tools/test_dashboard_data.sh,tools/test_dashboard_control_center.sh,dashboard-control-center/mocks/mock-context-overview.png,dashboard-control-center/mocks/mock-context-lessons.png,dashboard-control-center/mocks/mock-context-workflow.png,dashboard-control-center/mocks/mock-context-maintenance.png,dashboard-control-center/mocks/mock-context-safety.png,dashboard-control-center/src/App.jsx,dashboard-control-center/src/dashboardData.js,dashboard-control-center/src/i18n.js,dashboard-control-center/src/styles.css,tests/fixtures/dashboard-control-center.json,tests/fixtures/dashboard-control-center-live-update.json,tests/playwright/dashboard-control-center.spec.js,tools/check_as_built_sync_contract.sh,tools/check_as_built_docs.sh,tools/check_test_plan_coverage.sh,tools/check_ci_workflow_structure.sh
TESTS: tools/test_product_repository_authority.sh,tools/test_dashboard_schema.sh,tools/test_dashboard_data.sh,tools/test_dashboard_control_center.sh,tools/check_as_built_sync_contract.sh,tools/check_as_built_docs.sh,tools/check_test_plan_coverage.sh,tools/check_ci_workflow_structure.sh

The dashboard control center must use a selected context data contract so the top-level menu selection, product repository, workflow context, lesson progress, Git state, CI state, Security state, evidence, blockers, and next safe action describe the same current target.
This implemented work is additive to the implemented dashboard data layer, live snapshot sync, mock-aligned Overview, detail-page mock parity, and external product repository authority.
This implemented work was the fourth priority in the current sequence and consumes the launch-quality, evidence-status, and scaffold contracts rather than absorbing their responsibilities.

Required outcomes:

- Add producer-owned `selected_context` and `available_contexts` data before the browser UI relies on menu selection.
- Resolve STEP 1-7, STEP 1-14, applied lessons, Free Development, Product Improvement, External Integration, and lesson-repository improvement through a shared context resolver rather than fixed UI branches.
- Keep `task-tracker-repository` as the STEP 1-14 standard product repository while allowing other product repositories to be selected by context without hard-coded repo-name assumptions.
- Remove the `product-improvement` dashboard-data fixed context by passing the selected workflow context to product authority, Git, CI, and Security status readers.
- In this requirement, status readers are read-only readers of existing settings, manifests, and evidence; they are not command executors and must not run Git, GitHub, CI, product-security, product-authority, or shell commands.
- Preserve product authority evidence states, including `failed`, `blocked`, `stale`, and `not_run`, and surface product-operation blockers without blocking unrelated lesson-only progress.
- Keep dashboard-data and browser pages read-only; they may read existing settings, manifests, and evidence but must not run Git, GitHub, CI, shell, product-security, product-authority checks, or evidence writers.
- Separate true Partial Failures from optional, cached, or not-yet-collected manual follow-ups.
- Display Git management settings and Security checks as cross-cutting selected-context status, with details distributed through workflow, maintenance, and safety pages.
- Use the `mock-context-*` images as UI/UX source references for intuitive non-engineer comprehension while keeping generated images out of pixel-perfect automated contracts.
- Keep English as the repository-standard source data language and use the existing UI-locale boundary for fixed labels and known control-center labels.

Non-scope:

- Do not add browser command execution, POST-based dashboard actions, automatic push, merge, remote deletion, OAuth, GitHub API calls, or live authoritative CI/Git polling.
- Do not remove root-level legacy product document compatibility.
- Do not weaken STEP 1-7, STEP 1-14, existing CI, existing checks, existing document routes, Git hooks, pre-commit, or dashboard read-only boundaries.
- Do not depend on one product stack, one repository name, one language, one fixture, or one specific UI phrase.

Required verification:

- Product authority tests must cover multiple evidence rows, failed/blocked/stale/not-run evidence, and context-specific blockers.
- Dashboard schema and data tests must cover selected context, available contexts, context-specific product authority, and safe status vocabulary.
- Browser control-center tests must cover the selected-context selector, mock-context-aligned summaries, read-only behavior, Partial Failures none state, blocker/manual-follow-up separation, and no command execution.
- Synchronization checks must keep this implemented work coherent across the five synchronized documents and sync contract.

## Implemented Dashboard Control Center Context Mock Source Of Truth Requirements

SYNC-ID: dashboard_control_center_context_mock_source_of_truth
STATUS: implemented
ARTIFACTS: docs/workflow/AS_BUILT_SYNC_CONTRACT.tsv,docs/workflow/DASHBOARD_DATA_SCHEMA.tsv,tools/lib/dashboard_data.sh,tools/dashboard-data,dashboard-control-center/mocks/mock-context-overview.png,dashboard-control-center/mocks/mock-context-lessons.png,dashboard-control-center/mocks/mock-context-workflow.png,dashboard-control-center/mocks/mock-context-maintenance.png,dashboard-control-center/mocks/mock-context-safety.png,dashboard-control-center/src/App.jsx,dashboard-control-center/src/dashboardData.js,dashboard-control-center/src/i18n.js,dashboard-control-center/src/styles.css,tests/fixtures/dashboard-control-center.json,tests/fixtures/dashboard-control-center-live-update.json,tests/playwright/dashboard-control-center.spec.js,tools/test_dashboard_schema.sh,tools/test_dashboard_data.sh,tools/test_dashboard_control_center.sh,tools/check_as_built_sync_contract.sh,tools/check_as_built_docs.sh,tools/check_test_plan_coverage.sh,tools/check_ci_workflow_structure.sh
TESTS: tools/test_dashboard_schema.sh,tools/test_dashboard_data.sh,tools/test_dashboard_control_center.sh,tools/check_as_built_sync_contract.sh,tools/check_as_built_docs.sh,tools/check_test_plan_coverage.sh,tools/check_ci_workflow_structure.sh

The dashboard control center must treat `mock-context-overview.png`, `mock-context-lessons.png`, `mock-context-workflow.png`, `mock-context-maintenance.png`, and `mock-context-safety.png` as the UI/UX source of truth for the current control-center redesign.
This implemented work is additive to selected-context sync and must not trade away STEP 1-7, STEP 1-14, existing CI, existing checks, existing document routes, live snapshot sync, localization boundaries, or the read-only dashboard safety model.

Required outcomes:

- Rebuild the browser control-center information architecture around the five `mock-context-*` images rather than extending the older categorized dashboard layout.
- Render a detailed left sidebar with the mock-aligned main navigation, repository group, other/help group, active-page visual identity, and read-only notice.
- Render the Overview with a visible header, seven menu tiles, selected-context strip, four current-status cards, Git management settings, Security confirmation, four Explore Pages cards, and a concise read-only control-panel notice.
- Render Lessons, Development Workflow, Maintenance Sync, and Safety Confirmation as page-specific mock-aligned surfaces that explain what is checked, what can be judged, what needs review, and what safe next step exists.
- Keep all progress numbers, status values, blockers, Git/CI/Security state, Partial Failures, command previews, maintenance evidence rows, and current-step fields producer-owned rather than hard-coded from a screenshot.
- Extend dashboard data only through schema-backed, reusable, policy-aware fields that connect to existing settings, shared libraries, repo-local skills, checks, and fixtures.
- Keep fixed UI labels behind the existing UI-locale boundary. Repository source data remains English; lesson/workflow display language and product development language remain workflow settings and must not be confused with the control-panel UI locale.
- Preserve Partial Failures as true failed, blocked, or unknown current-context conditions. Optional, cached, not-run, or manual-required checks must not be visually promoted to healthy or hidden as no-failure state.
- Keep command previews display-only and non-executable.
- Add tests that validate mock-aligned structure and safety behavior without making generated images pixel-perfect automated oracles.

Non-scope:

- Do not add browser command execution, POST actions, live GitHub/CI polling, Git fetch, product-security execution, product-authority execution, evidence writing, push, merge, remote deletion, OAuth, token handling, or destructive operations.
- Do not encode one product stack, one repository name, one language, one fixture, one Japanese phrase, or one screenshot value as runtime logic.
- Do not remove root-level legacy product document compatibility.
- Do not weaken existing dashboard-data ownership, live snapshot sync, command-preview isolation, Git hooks, pre-commit, CI, or as-built synchronization.

Required verification:

- Dashboard schema and data tests must cover any new producer-owned fields used by the mock-aligned UI.
- Browser control-center tests must cover sidebar groups, seven menu tiles, selected context, four Overview status cards, page-specific detail layouts, read-only behavior, no command execution, i18n labels, and mobile no-overflow.
- Synchronization checks must pass before runtime implementation starts.

## Implemented Dashboard Control Center Exact Mock Alignment Correction Requirements

SYNC-ID: dashboard_control_center_mock_exact_alignment_correction
STATUS: implemented
ARTIFACTS: docs/workflow/AS_BUILT_SYNC_CONTRACT.tsv,docs/workflow/DASHBOARD_DATA_SCHEMA.tsv,docs/workflow/PRODUCT_REPOSITORY_STRUCTURE.tsv,docs/workflow/PRODUCT_GATE_EVIDENCE_SCHEMA.tsv,docs/workflow/TEST_PLAN_MANIFEST.tsv,docs/workflow/GIT_HOOK_CHECKS.tsv,docs/workflow/GIT_HOOK_PARALLEL_GROUPS.tsv,docs/workflow/FINAL_GATE_COVERAGE.tsv,free-development/FREE_DEVELOPMENT_MODE.md,templates/TEMPLATES.md,lesson/SYNC_GATES_14_DAYS.tsv,tools/lib/dashboard_data.sh,tools/dashboard-data,tools/lib/product_repository_authority.sh,tools/free-development,tools/product-improvement,tools/external-integration,tools/product-scaffold-check,tools/product-launch-check,dashboard-control-center/mocks/mock-context-overview.png,dashboard-control-center/mocks/mock-context-lessons.png,dashboard-control-center/mocks/mock-context-workflow.png,dashboard-control-center/mocks/mock-context-maintenance.png,dashboard-control-center/mocks/mock-context-safety.png,dashboard-control-center/src/App.jsx,dashboard-control-center/src/dashboardData.js,dashboard-control-center/src/i18n.js,dashboard-control-center/src/styles.css,tests/fixtures/dashboard-control-center.json,tests/fixtures/dashboard-control-center-live-update.json,tests/playwright/dashboard-control-center.spec.js,tools/test_dashboard_schema.sh,tools/test_dashboard_data.sh,tools/test_dashboard_control_center.sh,tools/test_product_repository_authority.sh,tools/test_product_scaffold_check.sh,tools/test_product_launch_check.sh,tools/test_product_gate_tools.sh,tools/check_lesson14_sync.sh,tools/test_lesson14.sh,tools/check_test_plan_coverage.sh,tools/check_ci_workflow_structure.sh,tools/check_as_built_sync_contract.sh,tools/check_as_built_docs.sh
TESTS: tools/test_dashboard_schema.sh,tools/test_dashboard_data.sh,tools/test_dashboard_control_center.sh,tools/test_product_repository_authority.sh,tools/test_product_scaffold_check.sh,tools/test_product_launch_check.sh,tools/test_product_gate_tools.sh,tools/check_lesson14_sync.sh,tools/test_lesson14.sh,tools/check_test_plan_coverage.sh,tools/test_test_plan.sh,tools/test_git_hooks.sh,tools/test_git_hooks_parallel.sh,tools/test_ci_final_gate.sh,tools/check_ci_workflow_structure.sh,tools/check_as_built_sync_contract.sh,tools/check_as_built_docs.sh

The dashboard control center implemented a corrective pass because the earlier mock-source work did not satisfy developer visual review for exact mock-aligned design, color contrast, icon treatment, content amount, and non-engineer comprehension.
This implemented correction treats the five current `mock-context-*` files as the human UI/UX source of truth while keeping dashboard state producer-owned and the browser read-only.

Required outcomes:

- Keep this explicit correction sync ID separate from earlier implemented dashboard mock-parity IDs.
- Preserve STEP 1-7, STEP 1-14, existing CI, existing checks, existing document routes, Git hooks, pre-commit, live snapshot sync, localization boundaries, and dashboard read-only behavior.
- Align Overview, Lessons, Development Workflow, Maintenance Sync, and Safety Confirmation with the current mocks for layout, density, color contrast, icon shape, icon background fill or transparency, sidebar content, and displayed content amount.
- Replace generic dashboard detail structures where they obscure page-specific judgment with page-specific structures that match what each mock is designed to make understandable.
- Keep fixed labels in the control-panel localization layer and keep repository source data English by default; do not confuse control-panel UI locale with lesson display language or product development language settings.
- Make menu selection a selected-context display concern backed by producer-owned data rather than browser-invented state.
- Require displayed menu choices to have complete producer-owned context data or an explicit incomplete state before the UI treats them as selectable live contexts; a thin menu id/status list is not enough for the corrected runtime.
- Ensure Git, CI, Security, product evidence, blockers, current step, command previews, and Partial Failures are shown from schema-backed producer data or as safe `blocked`, `unknown`, `manual_required`, `not_run`, or `stale` states.
- Propagate external product repository evidence into selected-context Git, CI, and Security status instead of leaving those cards at policy or snapshot defaults.
- Treat required product evidence as ready only when the evidence is current and authoritative; advisory, cached, stale, not-run, blocked, failed, or unknown required evidence must not be promoted to healthy dashboard state.
- Ensure page-level lesson, maintenance, and safety card descriptions are grounded in producer-owned status, evidence rows, snapshot identity, or security rows rather than fixed success or pending prose.
- Keep external product repository handling policy-driven and manifest-backed so Free Development, Product Improvement, and External Integration do not fall back to fixed `task-tracker-repository` or root-document assumptions.
- Keep `docs/memory/` as part of the standard external repository scaffold shape while allowing individual memory files to remain optional until the product workflow uses them.
- Strengthen product launch and scaffold requirements without introducing one stack, one framework, one product name, one screenshot value, one language phrase, or one fixture-only case.

Non-scope:

- Do not add browser command execution, POST actions, GitHub or CI polling, Git fetch, product-security execution, product-authority execution, evidence writing, push, merge, remote deletion, OAuth, token handling, destructive operations, or cleanup automation.
- Do not create pages for repository information, documents, settings, help, or changelog until corresponding mocks and requirements exist.
- Do not delete root-level legacy product document compatibility.
- Do not make generated mock images pixel-perfect automated test oracles.

Implemented verification:

- The five synchronized documents and sync contract agree on this implemented sync ID.
- Dashboard schema, dashboard data, dashboard browser control-center, product authority, scaffold, launch, product gate, STEP 1-14 sync, STEP 1-14 aggregate, and as-built synchronization checks are required for this implemented state.
- Runtime checks remain targeted to the changed producer, UI, product repository, and STEP 1-14 launch-quality surfaces under AGENTS.MD local-verification scope rules.

## Implemented Dashboard Lessons Page Exact Mock Alignment Requirements

SYNC-ID: dashboard_control_center_lessons_page_exact_mock_alignment
STATUS: implemented
ARTIFACTS: docs/workflow/AS_BUILT_SYNC_CONTRACT.tsv,dashboard-control-center/mocks/mock-context-lessons.png,dashboard-control-center/src/App.jsx,dashboard-control-center/src/i18n.js,dashboard-control-center/src/styles.css,tests/playwright/dashboard-control-center.spec.js,tools/test_dashboard_control_center.sh
TESTS: tools/test_dashboard_control_center.sh,tools/check_as_built_sync_contract.sh,tools/check_as_built_docs.sh,tools/check_test_plan_coverage.sh,tools/check_ci_workflow_structure.sh

The completed dashboard UI/UX task focused on the Lessons page and treated `dashboard-control-center/mocks/mock-context-lessons.png` as the human design source of truth.
The goal was to make the Lessons page match the mock in visible hierarchy, content amount, color contrast, icon shape, icon background fill or transparency, and responsive behavior before broad verification.

Required outcomes:

- Preserve the already implemented Overview, Development Workflow, Maintenance Sync, Safety Confirmation, selected-context sync, live snapshot sync, product authority behavior, and read-only browser boundary.
- Align the Lessons page with the mock for page header, common status area, menu selection presentation, lesson-progress presentation, lesson rows, status or evidence cards, action affordances, icon identity, spacing, and responsive layout.
- Keep the page understandable without explanatory text outside the mock-backed hierarchy.
- Keep displayed lesson status, current step, progress, blockers, approvals, language settings, follow-up states, and repository facts producer-owned and schema-backed.
- Keep fixed control-panel labels in the localization layer; do not confuse UI locale with lesson display language or product development language settings.
- Use shared components and design tokens only when they improve exact mock fidelity, reuse, and maintainability without adding fixed screenshot values or one-off branches.

Non-scope:

- Do not redesign other pages except for non-breaking shared tokens or components needed to keep the mock family consistent.
- Do not add browser command execution, POST actions, GitHub or CI polling, product-security execution, product-authority execution, evidence writing, push, merge, remote deletion, OAuth, token handling, destructive operations, or cleanup automation.
- Do not create repository information, documents, settings, help, or changelog pages.
- Do not weaken STEP 1-7, STEP 1-14, existing CI, existing checks, Git hooks, pre-commit, live snapshot sync, as-built synchronization, or canonical product document enforcement.

## Implemented Dashboard Control Center Visual Refinement Follow-up Requirements

SYNC-ID: dashboard_control_center_visual_refinement_followup
STATUS: implemented
ARTIFACTS: docs/workflow/AS_BUILT_SYNC_CONTRACT.tsv,docs/memory/DEVELOPER_MEMORY.md,dashboard-control-center/mocks/mock-context-overview.png,dashboard-control-center/mocks/mock-context-lessons.png,dashboard-control-center/mocks/mock-context-workflow.png,dashboard-control-center/mocks/mock-context-maintenance.png,dashboard-control-center/mocks/mock-context-safety.png,dashboard-control-center/src/App.jsx,dashboard-control-center/src/i18n.js,dashboard-control-center/src/styles.css,tests/playwright/dashboard-control-center.spec.js,tools/test_dashboard_control_center.sh,tools/check_as_built_sync_contract.sh,tools/check_as_built_docs.sh,tools/check_test_plan_coverage.sh,tools/check_ci_workflow_structure.sh
TESTS: tools/test_dashboard_control_center.sh,tools/check_as_built_sync_contract.sh,tools/check_as_built_docs.sh,tools/check_test_plan_coverage.sh,tools/check_ci_workflow_structure.sh

The dashboard control center must preserve the mock-backed design while incorporating developer visual review refinements across Lessons, Development Workflow, Maintenance Sync, Safety Confirmation, and the shared sidebar.
This implemented follow-up is additive to the exact mock alignment correction and does not change the read-only dashboard boundary.

Required outcomes:

- Use the same sidebar menu structure, grouping, active state, and brand color on every dashboard page.
- Keep Lessons and Overview progress animation restrained: it runs once, counts numbers in under one second, and does not animate icons, percentages, gradients, fades, or shine effects.
- Render lesson progress cards with plain white backgrounds, solid progress bars, clear numerator/denominator weight, three lesson choices, and responsive stacking before cramped text appears.
- Keep Workflow, Maintenance, Safety, and Lessons bottom notices visually consistent.
- Make Maintenance source and reference values copyable with copy icons outside the value field, one-line ellipsis, and keyboard or hover tooltip bubbles with a small pointer.
- Make Safety command previews display-only, vertically stacked above Security policy, larger and more readable, with copy controls outside the command field and the same tooltip behavior as Maintenance references.
- Use non-engineer-readable localized fixed labels for known control-center concepts, including security gates, failures or blocking state, approval-required details, and maintenance evidence labels.
- Preserve producer-owned dashboard data and do not invent Git, CI, Security, lesson, evidence, or blocker state in React.
- Preserve responsive no-overflow behavior across desktop, tablet, narrow desktop, and phone widths.

Non-scope:

- Do not add browser command execution, POST actions, live Git/GitHub/CI polling, product-security execution, product-authority execution, evidence writing, push, merge, cleanup, remote deletion, OAuth, token handling, or destructive operations.
- Do not create runtime pages for repository information, documents, settings, help, or changelog.
- Do not make generated mock image equality an automated test oracle.

## Implemented Menu Product Display Profile Confirmation Requirements

SYNC-ID: menu_product_display_profile_confirmation
STATUS: implemented
ARTIFACTS: AGENTS.MD,docs/workflow/AS_BUILT_SYNC_CONTRACT.tsv,docs/workflow/MENU_PRODUCT_PROFILE_POLICY.tsv,docs/workflow/PRODUCT_REPOSITORY_STRUCTURE.tsv,docs/workflow/DASHBOARD_DATA_SCHEMA.tsv,tools/lib/lesson_common.sh,tools/lib/product_repository_authority.sh,tools/product-profile,tools/menu,tools/lesson,tools/lesson14,tools/free-development,tools/product-improvement,tools/external-integration,tools/team-development,tools/product-scaffold-check,tools/test_menu_prerequisites.sh,tools/test_lesson.sh,tools/test_lesson14.sh,tools/test_product_repository_authority.sh,tools/test_product_scaffold_check.sh,tools/test_dashboard_schema.sh,tools/test_dashboard_data.sh
TESTS: tools/test_dashboard_schema.sh,tools/test_product_repository_authority.sh,tools/test_product_scaffold_check.sh,tools/test_menu_prerequisites.sh,tools/test_lesson.sh,tools/test_lesson14.sh,tools/test_dashboard_data.sh,tools/check_lesson_structure.sh,tools/check_agents_skills.sh

The seven progress-menu choices must confirm the learner-visible product name or work-target name before the workflow can proceed.
The dashboard must display that name from a producer-owned profile, not from repository names, UI inference, or prose extraction.

Required outcomes:

- Store product display identity in a small confirmed profile rather than hard-coding `タスク管理表` or any other product name in React.
- Use `docs/workflow/MENU_PRODUCT_PROFILE_POLICY.tsv` for menu-specific scope and recommendation text.
- Use external product repository `ops/PRODUCT_PROFILE.json` for menu items 1 through 6 and a lesson-repository learning profile for menu item 7.
- Treat STEP 1-14's recommended name as `タスク管理表` only as a policy-backed recommendation that still requires confirmation.
- Keep free development and product improvement name entry blank unless a confirmed profile already exists.
- Keep fixed dashboard labels localized by environment while preserving producer-owned product names as profile data.
- Validate the profile as data only; do not execute commands, read secrets, call APIs, poll GitHub, or write evidence from the dashboard.

Non-scope:

- Do not make the dashboard a profile editor.
- Do not infer a confirmed product name from requirements, specification, implementation plan, repository path, branch name, or file tree.
- Do not require menu 7 to use the external product repository.

## Implemented Product Repository Canonical Docs Only Requirements

SYNC-ID: product_repository_canonical_docs_only
STATUS: implemented
ARTIFACTS: AGENTS.MD,docs/workflow/AS_BUILT_SYNC_CONTRACT.tsv,docs/workflow/PRODUCT_REPOSITORY_STRUCTURE.tsv,docs/workflow/PRODUCT_REPOSITORY_FORBIDDEN_ROOT_PATHS.tsv,docs/workflow/PRODUCT_GATE_EVIDENCE_SCHEMA.tsv,prompts/PROMPTS.md,prompts/PROMPTS_14_DAYS.md,lesson/LESSON_FLOW.tsv,lesson/LESSON_FLOW_14_DAYS.tsv,lesson/SYNC_GATES_14_DAYS.tsv,playbooks/AGENT_PLAYBOOK.md,playbooks/AGENT_PLAYBOOK_14_DAYS.md,templates/TEMPLATES.md,skills/task-tracker-docs/SKILL.md,skills/task-tracker-docs/references/product-docs.md,skills/worklog-doc-sync/SKILL.md,skills/worklog-doc-sync/references/worklog-sync.md,skills/lesson-sync-gate/SKILL.md,skills/lesson-sync-gate/references/sync-gates.md,skills/learning-progress-helpdesk/references/progress-helpdesk.md,tools/lib/product_repository_authority.sh,tools/product-scaffold-check,tools/product-improvement,tools/external-integration,tools/dashboard-data,tools/dashboard,tools/check_workflow_pair_sync.sh,tools/check_agents_skills.sh,tools/test_product_repository_authority.sh,tools/test_product_scaffold_check.sh,tools/test_product_security.sh
TESTS: tools/test_product_repository_authority.sh,tools/test_product_scaffold_check.sh,tools/test_product_security.sh,tools/check_agents_skills.sh,tools/test_dashboard_data.sh,tools/test_lesson14.sh,tools/check_lesson_structure.sh,tools/check_lesson14_sync.sh

External product repositories must use canonical documentation paths for product, workflow, and memory documents.
Root-level duplicate Markdown documents are not accepted as compatibility fallbacks because they hide drift, confuse the dashboard, and can cause agents to update the wrong file.

Required outcomes:

- Treat `docs/product/REQUIREMENTS.md`, `docs/product/SPECIFICATION.md`, and `docs/product/IMPLEMENTATION_PLAN.md` as the only product design document locations.
- Treat `docs/workflow/TASK_TRACKER.md` and `docs/workflow/HANDOFF.md` as the only product workflow pair locations.
- Treat product memory files as `docs/memory/*` documents when used, including developer, session, and failure memory.
- Keep legacy root `AGENT.md` and `README.md` discoverable during migration, while the planned product-side `AGENTS.MD` work becomes the future standard agent entry.
- Expose forbidden root duplicate paths as a reusable TSV policy instead of hard-coded one-off branches.
- Make authority, scaffold, dashboard data, workflow-pair sync, prompts, playbooks, and skills all point to the same canonical product paths.
- Keep the dashboard and lesson flows read-only with respect to product documents; they may report blockers but must not repair product repositories automatically.

Non-scope:

- Do not delete or rewrite external product repository content unless the operation is explicitly part of product repository maintenance.
- Do not relax repository boundary checks, approval requirements, security checks, Git/CI gates, or product profile validation.
- Do not trade off existing STEP 1-7, STEP 1-14, dashboard read-only behavior, localization, or product authority evidence semantics.

## Implemented Dashboard Control Center Documents Guided Catalog Requirements

SYNC-ID: dashboard_control_center_documents_guided_catalog
STATUS: implemented
ARTIFACTS: docs/workflow/AS_BUILT_SYNC_CONTRACT.tsv,docs/workflow/DASHBOARD_DATA_SCHEMA.tsv,tools/lib/dashboard_data.sh,tools/lib/document_paths.sh,tools/lib/product_repository_authority.sh,tools/dashboard-data,dashboard-control-center/src/App.jsx,dashboard-control-center/src/dashboardData.js,dashboard-control-center/src/i18n.js,dashboard-control-center/src/styles.css,tests/fixtures/dashboard-control-center.json,tests/fixtures/dashboard-control-center-live-update.json,tests/playwright/dashboard-control-center.spec.js,tools/test_dashboard_schema.sh,tools/test_dashboard_data.sh,tools/test_dashboard_control_center.sh,tools/test_product_repository_authority.sh,tools/test_product_scaffold_check.sh,tools/check_as_built_sync_contract.sh,tools/check_as_built_docs.sh
TESTS: tools/test_dashboard_schema.sh,tools/test_dashboard_data.sh,tools/test_dashboard_control_center.sh,tools/test_product_repository_authority.sh,tools/test_product_scaffold_check.sh,tools/check_as_built_sync_contract.sh,tools/check_as_built_docs.sh

The dashboard control center must make the Documents page a guided, read-only document navigation surface rather than a flat file list or a maintenance evidence surface.
This implemented work is additive and must not trade away STEP 1-7, STEP 1-14, existing CI, existing checks, existing document routes, docs-tour behavior, repository information, maintenance sync, safety confirmation, Git hooks, pre-commit, localization boundaries, or dashboard read-only ownership.

Required outcomes:

- Present documents by learner intent, such as confirming what is being built, checking current progress, understanding decision history, and finding help when stuck.
- Keep Git/CI status, evidence rows, command previews, source-command details, and security gate details on their dedicated pages instead of making them the Documents page's primary content.
- Add a producer-owned documents catalog to dashboard data before the browser UI depends on document groups, status, priority, or related-page routing.
- Keep document structure data in existing dashboard data/schema paths and shared dashboard data helpers; do not add React-only fixed document arrays.
- Use localized fixed labels for known dashboard concepts while keeping file paths, ids, command text, and repository facts as sanitized producer data.
- Show non-engineer-readable display names in the primary UI, with concrete file paths available as secondary copyable or tooltip-backed details.
- Preserve existing `tools/docs-tour`, `guides/DOCUMENT_MAP.md`, `tools/dashboard docs`, maintenance source grounding, and repository information behavior.
- Keep any new document validation runnable standalone and connectable to aggregate checks if a new test entry point is introduced later.

Non-scope:

- Do not add browser command execution, POST actions, live Git/GitHub/CI polling, evidence writing, document editing, product repository mutation, cleanup, merge, push, OAuth, token handling, or destructive operations.
- Do not infer document meaning from one product stack, one repository name, one fixture, one language phrase, or one exact UI sentence.
- Do not remove existing docs-tour, dashboard-data, maintenance, safety, repository information, or update-history routes.
- Do not accept any existing-feature tradeoff to simplify the Documents page.

## Implemented Agent Escalated Verification Policy Requirements

SYNC-ID: agent_escalated_verification_policy
STATUS: implemented
ARTIFACTS: AGENTS.MD,docs/workflow/AS_BUILT_SYNC_CONTRACT.tsv
TESTS: tools/check_as_built_sync_contract.sh,tools/check_as_built_docs.sh,tools/check_agents_skills.sh

Agents must not waste verification time by first running known sandbox-incompatible, non-destructive visual or environment checks without the required execution scope.
When the work requires Playwright/Chromium screenshots, browser-based visual inspection, local port observation, or equivalent non-destructive environment observation that is known to need escalated execution in this environment, the agent must run it with the required execution scope from the start and complete the evidence-gathering step before reporting design conclusions.

Required outcomes:

- Treat Playwright/Chromium real-screen inspection as evidence only after the browser has actually launched, the page has loaded, and screenshots or equivalent observations have been collected.
- Run known sandbox-incompatible, non-destructive checks with the required execution scope from the first attempt instead of failing once and retrying.
- Do not ask for a separate developer policy decision before these non-destructive verification commands when the active task already requires the check.
- Preserve minimum necessary verification scope; this policy does not authorize broad, unrelated, or heavy tests.
- Keep dangerous, credential-bearing, destructive, write-heavy, external-service, dependency-changing, push, merge, cleanup, delete, and CI-failure override actions outside this exception.

Non-scope:

- Do not weaken authentication, secret handling, destructive-operation, external repository, Git/CI, pre-commit, repository-boundary, or security-gate approval rules.
- Do not treat screenshot capture as permission for browser command execution, POST requests, live GitHub/CI polling, evidence writing, dashboard mutation, or product repository mutation.
- Do not replace developer visual judgment with screenshot equality tests or claim visual parity without inspecting the captured page.

## Implemented Dashboard Control Center Settings Safe Change Requirements

SYNC-ID: dashboard_control_center_settings_safe_change_plan
STATUS: implemented
ARTIFACTS: docs/workflow/AS_BUILT_SYNC_CONTRACT.tsv,docs/workflow/DASHBOARD_DATA_SCHEMA.tsv,docs/workflow/TEST_PLAN_MANIFEST.tsv,docs/workflow/GIT_HOOK_CHECKS.tsv,docs/workflow/FINAL_GATE_COVERAGE.tsv,.github/workflows/ci.yml,.github/workflows/lesson14-ci.yml,tools/lib/dashboard_data.sh,tools/lib/git_workflow_policy.sh,tools/dashboard-data,tools/dashboard-settings,tools/dashboard-control-center,vite.config.mjs,dashboard-control-center/src/App.jsx,dashboard-control-center/src/dashboardData.js,dashboard-control-center/src/i18n.js,dashboard-control-center/src/styles.css,tests/fixtures/dashboard-control-center.json,tests/fixtures/dashboard-control-center-live-update.json,tests/playwright/dashboard-control-center.spec.js,tools/test_dashboard_settings.sh,tools/test_dashboard_schema.sh,tools/test_dashboard_data.sh,tools/test_dashboard_control_center.sh
TESTS: tools/test_dashboard_settings.sh,tools/test_dashboard_schema.sh,tools/test_dashboard_data.sh,tools/test_dashboard_control_center.sh,tools/test_git_workflow_policy.sh,tools/test_lesson.sh,tools/test_lesson14.sh,tools/test_menu_prerequisites.sh,tools/check_as_built_sync_contract.sh,tools/check_as_built_docs.sh,tools/check_test_plan_coverage.sh,tools/check_workflow_pair_sync.sh

The Settings page must be a non-engineer-readable surface for reviewing and changing allowlisted lesson and workflow settings through a narrow repo-local settings update path.
This implemented work is additive and must not trade away STEP 1-7, STEP 1-14, existing CI, existing checks, existing document routes, repo-local skills, Git hooks, pre-commit, localization boundaries, or existing read-only pages outside the Settings allowlist.

Required outcomes:

- Show the current selected menu, workflow context, target repository, product type, and freshness from producer-owned dashboard data so the user knows which settings are being inspected.
- Replace the current status-only Settings card gallery with readable setting rows that expose the current value, status, source, changeability, and related page for context, learning, workflow, and safety settings.
- Add a schema-backed `settings` catalog before the browser UI depends on setting groups, values, allowed values, editability, approval level, or update previews.
- Keep `tools/dashboard-data` read-only. It may emit the settings catalog from existing settings, policies, selected context, and status sources, but it must not write settings, refresh evidence, or execute live checks.
- Treat a larger Settings popup as a review and confirmation surface. It must show current value, proposed value, impact, target file, required confirmation, validation state, and safe update preview before applying any change.
- Implement actual writes only through `tools/dashboard-settings` and the Vite `/dashboard-settings/plan` and `/dashboard-settings/apply` middleware; the browser must not write files directly, run arbitrary tools, accept arbitrary paths, or execute shell text.
- Accept Settings mutation requests only as same-origin `application/json` POSTs to the implemented plan/apply endpoints, and reject cross-origin or non-JSON browser mutation attempts before invoking the update tool.
- Restrict editable settings to allowlisted, reusable settings such as lesson learning mode, workflow display language, product development language, and safe Git workflow settings that already have policy-backed storage.
- Treat the workflow display language setting as the source for lesson guidance, workflow display text, and Dashboard Control Center fixed UI labels where dashboard translations exist.
- Emit the selected workflow language and the resolved dashboard UI locale from producer-owned dashboard data so React does not infer the Settings result from browser language alone.
- `tools/dashboard-settings apply ... --confirm` must validate the setting id, value, menu id, target file, and dashboard snapshot output boundary, write through a same-directory temporary file plus atomic rename, and regenerate the dashboard snapshot after a successful write.
- After a successful Settings apply, the browser must refetch the regenerated dashboard snapshot immediately and update fixed UI labels without a full page reload; periodic polling remains a fallback, not the primary apply feedback path.
- Treat product or work target naming as display-only in this sync ID. Any future naming write path must use the existing product-profile authority, repository-boundary checks, and a separate approved write contract.
- Keep approval state, Git/CI execution, merge, push, cleanup, deletion, evidence writing, product-security gates, GitHub polling, OAuth, secrets, and external service operations outside editable Settings rows.
- Use existing setting files, shared libraries, validation commands, repo-local skills, aggregate-capable tests, CI, and pre-commit wiring; do not add fixed values, one-off branches, one stack, one product name, one language phrase, or one fixture-only case.
- Dashboard fixed-label dictionaries now follow `dashboard_control_center_full_locale_ui_support`: all standard lesson language codes resolve to matching Dashboard UI dictionaries, while unsupported custom language values remain workflow-language records unless a later locale policy promotes them.

Non-scope:

- Do not make the browser dashboard a general editor or command runner.
- Do not weaken the existing GET/read-only data-serving guard, browser command execution guard, or display-only command preview contract outside the implemented Settings plan/apply endpoints.
- Do not move Git/CI run history, evidence tables, dangerous-operation execution, repository file-tree education, document catalog behavior, or update history into the Settings page.
- Do not implement external product repository mutation, approval-state mutation, security-gate mutation, Git/CI execution, network polling, push, merge, cleanup, deletion, OAuth, or credential handling from Settings.

## Implemented Dashboard Control Center Full Locale UI Support Requirements

SYNC-ID: dashboard_control_center_full_locale_ui_support
STATUS: implemented
ARTIFACTS: docs/workflow/AS_BUILT_SYNC_CONTRACT.tsv,docs/workflow/DASHBOARD_DATA_SCHEMA.tsv,docs/workflow/TEST_PLAN_MANIFEST.tsv,docs/workflow/GIT_HOOK_CHECKS.tsv,docs/workflow/GIT_HOOK_PARALLEL_GROUPS.tsv,docs/workflow/FINAL_GATE_COVERAGE.tsv,.github/workflows/ci.yml,.github/workflows/lesson14-ci.yml,tools/lib/lesson_common.sh,tools/lib/dashboard_data.sh,tools/dashboard-data,tools/dashboard-settings,tools/dashboard-control-center,tools/test_dashboard_i18n.sh,tools/test_dashboard_settings.sh,tools/test_dashboard_schema.sh,tools/test_dashboard_data.sh,tools/test_dashboard_control_center.sh,tools/check_ci_workflow_structure.sh,tools/test_lesson_repository.sh,vite.config.mjs,dashboard-control-center/src/App.jsx,dashboard-control-center/src/dashboardData.js,dashboard-control-center/src/i18n.js,dashboard-control-center/src/styles.css,tests/fixtures/dashboard-control-center.json,tests/fixtures/dashboard-control-center-live-update.json,tests/playwright/dashboard-control-center.spec.js
TESTS: tools/test_dashboard_i18n.sh,tools/test_dashboard_schema.sh,tools/test_dashboard_data.sh,tools/test_dashboard_settings.sh,tools/test_dashboard_control_center.sh,tools/check_ci_workflow_structure.sh,tools/test_git_hooks.sh,tools/test_git_hooks_parallel.sh,tools/test_ci_final_gate.sh,tools/check_as_built_sync_contract.sh,tools/check_as_built_docs.sh,tools/check_test_plan_coverage.sh,tools/check_workflow_pair_sync.sh

Dashboard Control Center treats the Settings-selected learning and workflow display language as the Dashboard fixed UI language for every standard lesson language, not only Japanese and English.
This implemented work extends the implemented Settings safe-change path and must not trade away STEP 1-7, STEP 1-14, existing CI, existing checks, document routes, repo-local skills, Git hooks, pre-commit, the safe Settings writer, or read-only dashboard pages outside the allowlisted Settings mutation boundary.

Required outcomes:

- Support Dashboard fixed UI labels for the standard language set `ja`, `en`, `ko`, `zh-CN`, `zh-TW`, `es`, `pt-BR`, `fr`, `de`, `id`, `vi`, `th`, `hi`, and `ar`, while preserving the existing `zh` to `zh-CN` alias and existing custom-language recording behavior for lesson settings.
- Keep one shared locale policy for language codes, aliases, browser `Intl` locale ids, text direction, native display name, and English display name; do not duplicate independent language lists in React, shell, schema, fixtures, and tests.
- Let the workflow display language row control lesson guidance, workflow display text, and Dashboard fixed UI labels when the value is one of the supported standard codes.
- Keep the product development language setting separate from Dashboard UI language; it describes the language used in generated product artifacts and must not drive the Dashboard shell.
- After Settings apply succeeds, update the Dashboard fixed UI language in React immediately from the validated apply response, then refetch the regenerated snapshot as authoritative data. Do not change visible UI language before the server-side apply path succeeds.
- Keep the existing snapshot refetch and polling paths as recovery and authority checks, but do not require a full page reload for language changes.
- Add a short Settings-page notice explaining that some data can take a moment to refresh and that the Dashboard updates automatically after the setting is applied.
- Preserve safe fallbacks for legacy snapshots that lack full locale metadata, but do not silently reduce a supported standard language to English once a matching dictionary is required by this sync ID.
- Add Arabic right-to-left support for Dashboard chrome while keeping file paths, commands, ids, hashes, branch names, code, and other technical values readable in left-to-right isolation.
- Keep translations behind the existing dashboard localization boundary. Repository facts, source paths, command previews, ids, and evidence remain sanitized producer data and must not be translated by ad hoc runtime logic.
- Use curated static dictionaries and validation; do not call automatic translation services, external APIs, network services, or model-generated translation at runtime.
- Keep regular CI time bounded by static dictionary completeness checks and representative browser coverage. Full all-language browser smoke is a release or explicit final-gate activity, not a routine per-change explosion.
- The localization check runs standalone and is callable from aggregate dashboard or final-gate tests.

Non-scope:

- Do not add browser file writes, arbitrary command execution, live Git/GitHub/CI polling, evidence writing, approval-state mutation, product repository mutation, push, merge, cleanup, deletion, OAuth, token handling, or credential handling.
- Do not use language-specific component branches, stack-specific fixtures, exact phrase-only assertions, or one-off hardcoded cases as the main implementation strategy.
- Do not weaken the implemented Settings plan/apply same-origin JSON POST boundary, `execFile` use, allowlisted setting ids, atomic writes, snapshot output boundary, or malformed data validation.
- Do not make unsupported custom language values require a full Dashboard dictionary in this sync ID; custom values remain recorded workflow data unless later promoted through a separate approved locale policy.

## Implemented Dashboard Control Center Settings Apply Feedback Requirements

SYNC-ID: dashboard_control_center_settings_apply_feedback
STATUS: implemented
ARTIFACTS: docs/workflow/AS_BUILT_SYNC_CONTRACT.tsv,dashboard-control-center/src/App.jsx,dashboard-control-center/src/i18n.js,dashboard-control-center/src/styles.css,tests/playwright/dashboard-control-center.spec.js,tools/test_dashboard_i18n.sh,tools/test_dashboard_settings.sh,tools/test_dashboard_control_center.sh
TESTS: tools/test_dashboard_i18n.sh,tools/test_dashboard_settings.sh,tools/test_dashboard_control_center.sh,tools/check_ci_workflow_structure.sh,tools/check_as_built_sync_contract.sh,tools/check_as_built_docs.sh,tools/check_test_plan_coverage.sh,tools/check_workflow_pair_sync.sh

Settings apply feedback must make the difference between saved settings and Dashboard snapshot reconciliation clear to non-engineer users.
This implemented work is an additive UX follow-up to `dashboard_control_center_settings_safe_change_plan` and `dashboard_control_center_full_locale_ui_support`; it must not trade away STEP 1-7, STEP 1-14, existing CI, existing checks, existing document routes, repo-local skills, Git hooks, pre-commit, localization boundaries, or the implemented Settings mutation boundary.

Required outcomes:

- After a successful Settings apply, show progress for Dashboard reflection only when reconciliation takes longer than a short named UI-policy delay; instant reflection should not be slowed by a forced modal.
- Treat Settings save success and snapshot reflection confirmation as separate user-visible states. Do not present snapshot reflection as complete until a refetched snapshot confirms the requested value.
- Keep the refetched snapshot authoritative. If a successful apply response and the refetched snapshot disagree, the snapshot wins and the UI shows a safe visible warning instead of keeping an unverified optimistic state.
- For ordinary editable settings, confirm reflection by matching the requested setting id and value against the Settings row in the refetched snapshot.
- For `workflow_language`, additionally confirm `summary.workflow_language`, `summary.display_locale`, `summary.ui_locale`, `summary.ui_direction`, and the Settings row so Dashboard UI language, direction, and settings data converge.
- Close or move away from the existing confirmation dialog before showing apply feedback so the existing focus trap is not nested with a second modal.
- Use a non-modal status window or equivalent small status surface with accessible live-region semantics for normal progress; use an alert state only for timeout, mismatch, or refresh failure.
- Preserve no-reload language switching. The UI may switch from validated apply metadata after server success, but the snapshot remains the final reconciliation source.
- Remove the row-level `確認のみ` and `ここで変更可能` chips from Settings rows. Keep status pills, and move changeability into the right-end action area and accessible row label.
- Show editable rows as `ここで変更可能` in the right-end action area and review-only rows as `確認`, using localized labels and wrapping-safe layout for long standard-language labels.
- Increase the Settings confirmation eyebrow text, such as `設定確認`, slightly without changing the modal title hierarchy, body text, buttons, or compact mobile layout.
- Add any new fixed labels to the existing Dashboard dictionary completeness path for all standard Dashboard UI locales.

Non-scope:

- Do not add browser mutation routes, new writers, new dependencies, external services, automatic translation, runtime translation APIs, evidence writing, Git/GitHub/CI execution, approval-state mutation, push, merge, cleanup, deletion, OAuth, credentials, or external product repository writes.
- Do not reduce or remove existing editable Settings capability in this sync ID. If a future safety review proposes changing currently editable Git workflow settings to display-only, treat that as a separate approval-required contract because it may trade off implemented behavior.
- Do not broaden the snapshot schema, Settings writer allowlist, Vite middleware responsibilities, CI/pre-commit coverage, or test-plan wiring unless the existing contract cannot satisfy this UX feedback safely.
- Do not depend on one language phrase, one fixture, one product stack, or one exact text assertion as the primary guarantee.

## Implemented Dashboard Control Center Settings Consistency Gate Requirements

SYNC-ID: dashboard_control_center_settings_consistency_gate
STATUS: implemented
ARTIFACTS: docs/workflow/AS_BUILT_SYNC_CONTRACT.tsv,docs/workflow/DASHBOARD_DATA_SCHEMA.tsv,docs/workflow/TEST_PLAN_MANIFEST.tsv,tools/lib/git_workflow_policy.sh,tools/git-workflow,tools/dashboard-settings,tools/lib/dashboard_data.sh,tools/dashboard-data,dashboard-control-center/src/App.jsx,dashboard-control-center/src/dashboardData.js,dashboard-control-center/src/i18n.js,dashboard-control-center/src/styles.css,tests/fixtures/dashboard-control-center.json,tests/fixtures/dashboard-control-center-live-update.json,tests/playwright/dashboard-control-center.spec.js,tools/test_git_workflow_policy.sh,tools/test_dashboard_i18n.sh,tools/test_dashboard_settings.sh,tools/test_dashboard_schema.sh,tools/test_dashboard_data.sh,tools/test_dashboard_control_center.sh
TESTS: tools/test_git_workflow_policy.sh,tools/test_dashboard_settings.sh,tools/test_dashboard_schema.sh,tools/test_dashboard_data.sh,tools/test_dashboard_i18n.sh,tools/test_dashboard_control_center.sh,tools/check_as_built_sync_contract.sh,tools/check_as_built_docs.sh,tools/check_test_plan_coverage.sh,tools/check_workflow_pair_sync.sh

The Settings page prevents users from applying combinations that make the Dashboard workflow impossible, misleading, or unsafe while preserving the implemented safe Settings writer and current non-Settings behavior.
This implemented work is additive and must not trade away STEP 1-7, STEP 1-14, existing CI, existing checks, existing document routes, repo-local skills, Git hooks, pre-commit, localization, or read-only dashboard pages outside the implemented Settings mutation boundary.

Required outcomes:

- Validate Settings changes against the candidate full settings state before writing, not only against the single changed value.
- Reject candidate Git workflow settings that leave no approved write path, including `branch_allowed=false` together with `main_direct_work_allowed=false`; `worktree_allowed` must not be treated as an independent write path unless a later approved detached-worktree policy explicitly defines that behavior.
- Reject candidate settings where branch-dependent automation is enabled while normal branch work is disallowed. The implemented gate treats `pr_creation=auto`, `pr_ci_monitoring=auto`, and `merge_execution=after_approval` with `branch_allowed=false` as write-time errors; already persisted inconsistent states are displayed as blocked while still allowing recovery changes.
- Allow users to recover from an already inconsistent settings file by accepting changes that move the full candidate state to a valid state.
- Keep `automation_level` compatible with the current policy model: it may remain a preset or summary while detailed action settings provide explicit behavior. Turning it into a hard upper bound requires separate developer approval.
- Do not silently change the runtime precedence between `merge_execution=manual` and `developer_auto_merge_allowed=true`. Until the developer approves new precedence, the Dashboard must not present the combination as ready automation; it must show a qualified non-ready state such as approval-required, manual-required, or blocked while preserving the existing runtime behavior.
- Show effective workflow status, reason, and next safe action from producer-owned data so a non-engineer can understand whether a setting is ready, blocked, waiting for approval, manual-only, optional, or not applicable.
- Keep Settings write authority in `tools/dashboard-settings` and reusable validation in the owner layer, especially `tools/lib/git_workflow_policy.sh`; React may display validation results but must not be the source of policy truth.
- Keep lesson and workflow language settings separate from product development language while showing the effective Dashboard UI language from the existing full-locale policy.
- Show context-dependent rows as `not_applicable` or blocked when the selected menu does not require a product repository, uses the lesson repository as the work target, or needs an external integration context.
- Separate learner approval status from missing or unknown approval evidence so the Dashboard does not show an approval-dependent workflow as ready when the source is absent.
- Use reusable schema/status fields and tests; do not encode one product name, one stack, one Japanese or English phrase, one fixture value, or one special menu as the main guarantee.

Non-scope:

- Do not add browser mutation endpoints, writers beyond `tools/dashboard-settings`, dependencies, external services, live Git/GitHub/CI polling, evidence writing, approval-state mutation, push, merge, cleanup, deletion, OAuth, credentials, or external product repository writes.
- Do not reduce existing safe Settings editability merely by moving rows to display-only. If an existing editable setting needs a new safety rule, enforce it through candidate validation and clear recovery paths.
- Do not change destructive-operation policy, GitHub authority, approval receipt format, approval expiry, or HEAD-SHA binding in this sync ID; those security hardening items need a separate approved contract if runtime behavior must change.
- Do not weaken schema validation, same-origin JSON POST handling, `execFile`, atomic writes, snapshot output boundaries, CI, pre-commit, or aggregate test wiring.

## Implemented Product Workflow Git Usage Modes Requirements

SYNC-ID: product_workflow_git_usage_modes
STATUS: implemented
ARTIFACTS: docs/workflow/AS_BUILT_SYNC_CONTRACT.tsv,docs/workflow/DASHBOARD_DATA_SCHEMA.tsv,docs/workflow/PRODUCT_GATE_EVIDENCE_SCHEMA.tsv,docs/workflow/MENU_PRODUCT_PROFILE_POLICY.tsv,docs/workflow/PRODUCT_WORKFLOW_GIT_USAGE_POLICY.tsv,docs/workflow/TEST_PLAN_MANIFEST.tsv,docs/workflow/GIT_HOOK_CHECKS.tsv,docs/workflow/GIT_HOOK_PARALLEL_GROUPS.tsv,docs/workflow/FINAL_GATE_COVERAGE.tsv,learning/PRODUCT_WORKFLOW_GIT_USAGE_SETTINGS.tsv,learning/context/WORKFLOW_CONTEXT_MAP.tsv,.github/workflows/ci.yml,.github/workflows/lesson14-ci.yml,tools/lib/product_workflow_git_usage.sh,tools/free-development,tools/product-improvement,tools/external-integration,tools/check_repository_boundary.sh,tools/product-scaffold-check,tools/lib/product_security.sh,tools/product-security,tools/lib/product_repository_authority.sh,tools/product-repository-authority,tools/dashboard-data,tools/dashboard-settings,tools/lib/dashboard_data.sh,dashboard-control-center/src/App.jsx,dashboard-control-center/src/dashboardData.js,dashboard-control-center/src/i18n.js,dashboard-control-center/src/styles.css,vite.config.mjs,tests/fixtures/dashboard-control-center.json,tests/fixtures/dashboard-control-center-live-update.json,tools/test_product_git_usage_modes.sh,tools/test_dashboard_schema.sh,tools/test_dashboard_data.sh,tools/test_dashboard_settings.sh,tools/test_dashboard_control_center.sh,tools/check_ci_workflow_structure.sh
TESTS: tools/test_product_git_usage_modes.sh,tools/test_product_gate_tools.sh,tools/test_product_scaffold_check.sh,tools/test_product_security.sh,tools/test_product_repository_authority.sh,tools/test_dashboard_schema.sh,tools/test_dashboard_data.sh,tools/test_dashboard_settings.sh,tools/test_dashboard_i18n.sh,tools/test_dashboard_control_center.sh,tools/check_ci_workflow_structure.sh,tools/check_as_built_sync_contract.sh,tools/check_as_built_docs.sh,tools/check_test_plan_coverage.sh,tools/check_workflow_pair_sync.sh,tools/check_lesson_structure.sh

Free Development, Product Improvement, and External Integration support small external-product work that does not always need remote Git or CI while preserving the existing strict Git/CI workflow as the default.
This implemented work is additive and does not trade away STEP 1-7, STEP 1-14, existing CI, existing checks, existing document routes, repo-local skills, product-security checks, product authority, Settings writer safety, or Dashboard read-only behavior outside the allowlisted Settings mutation boundary.

Required outcomes:

- Add a product-workflow Git usage mode for product-scoped workflow contexts, separate from the existing Git workflow action settings.
- Support the implemented modes `none`, `local`, `remote_sync`, and `ci`.
- Keep the default mode equivalent to the current strict `ci` behavior so existing Free Development, Product Improvement, External Integration, STEP 1-7, STEP 1-14, Git sync, and CI gates do not weaken by default.
- Treat `none` as "Git/remote/CI not used", not as "no checks". Product workspace boundary, canonical product documents, scaffold authority, product-security checks, secret scanning, external-integration approval, and required local checks remain in force.
- Treat `local` as requiring a local Git worktree and local Git safety checks, without requiring remote sync or CI.
- Treat `remote_sync` as requiring local Git plus remote/upstream sync, without requiring CI unless the workflow separately selects `ci`.
- Treat `ci` as the current strict path: local Git, remote sync, and CI are required.
- Show Git and CI rows as required, optional, or not applicable from producer-owned dashboard data; React must not infer mode applicability from menu names or raw text.
- Let the Settings page change only the Git usage mode through a guarded, allowlisted Settings path when the selected workflow context supports it.
- Keep the existing Git workflow policy as the policy for actions when Git is used. Do not mix "whether Git is used" into `GIT_WORKFLOW_SETTINGS.tsv`.
- Do not create a new `.git`-less authoritative evidence store in this sync ID. When Git is not applicable, Git and CI evidence rows are represented as `not_applicable`; explicit developer approval remains required before accepting a replacement evidence storage, freshness model, or product-head binding design.

Non-scope:

- Do not remove or weaken current strict Git/CI completion gates by default.
- Do not change STEP 1-7 or STEP 1-14 lesson sync gates.
- Do not make Dashboard execute Git, CI, product-security, product-authority, product mutation, push, merge, cleanup, deletion, OAuth, external-service, or evidence-writing operations.
- Do not make React the source of product workflow policy truth.
- Do not reduce existing Settings editability, schema validation, same-origin JSON POST handling, `execFile`, atomic writes, snapshot output boundaries, CI, pre-commit, or aggregate-test coverage.

## Implemented Repository Development Workflow Workflow Skill Requirements

SYNC-ID: repository_development_workflow_skill
STATUS: implemented
ARTIFACTS: AGENTS.MD,docs/workflow/AS_BUILT_SYNC_CONTRACT.tsv,docs/workflow/REPOSITORY_DEVELOPMENT_WORKFLOW.tsv,docs/workflow/GIT_HOOK_CHECKS.tsv,docs/workflow/GIT_HOOK_PARALLEL_GROUPS.tsv,docs/workflow/TEST_PLAN_MANIFEST.tsv,docs/workflow/FINAL_GATE_GAP_COMMANDS.tsv,docs/workflow/FINAL_GATE_COVERAGE.tsv,learning/REPOSITORY_DEVELOPMENT_APPROVALS.tsv,skills/repository-development-workflow/SKILL.md,skills/repository-development-workflow/references/repository-development.md,skills/repository-development-workflow/agents/openai.yaml,tools/lib/repository_development_workflow.sh,tools/repository-development-workflow,tools/check_repository_development_workflow.sh,tools/test_repository_development_workflow.sh,tools/check_agents_skills.sh,tools/test_lesson_repository.sh,tools/check_ci_workflow_structure.sh,.github/workflows/ci.yml,.github/workflows/lesson14-ci.yml
TESTS: tools/check_repository_development_workflow.sh,tools/test_repository_development_workflow.sh

Lesson-repository development requires a repo-local workflow skill and mechanical policy support so agents can move from developer wall discussion to proposal, implementation planning, document synchronization, implementation, focused verification, release gates, PR/main CI, local/remote synchronization, and cleanup planning without weakening AGENTS.MD or existing lesson behavior.

Required outcomes:

- Provide a repo-local `repository-development-workflow` skill for this repository's own development work; it must support AGENTS.MD rather than replace it.
- Keep `worklog-doc-sync` as the product-document synchronization skill and `lesson-sync-gate` as the final lesson/gate closure skill. The new skill must route to them instead of absorbing their responsibilities.
- Define stable machine-readable phase ids for `context_triage`, `proposal`, `implementation_plan`, `fast_loop`, `mid_tests`, `release_gate`, and `main_sync_cleanup`.
- Separate implementation-time fast loops from release proof. Fast local checks may guide work, but release closure must still require the policy-defined sync, structure, aggregate, pre-commit/full, PR CI, main CI, local/remote sync, and cleanup confirmation.
- Provide a policy-backed source of truth, shared validation layer, CLI guidance/gate commands, standalone check, and regression test, then wire them into hooks, aggregate tests, CI, final-gate coverage, and repo-local skill discovery.
- Make all new checks callable directly and from aggregate checks.
- Validate malformed workflow policy rows, missing wiring, weakened AGENTS invariants, missing PR/main CI requirements, and unsafe cleanup guidance.
- Preserve STEP 1-7, STEP 1-14, existing CI, existing checks, existing document routes, repo-local skills, security gates, and document synchronization ownership boundaries.
- Treat branch, worktree, product-repository, remote, and cleanup deletion as approval-bound operations. The workflow may propose cleanup plans, but must not execute destructive cleanup without explicit developer approval.
- Avoid fixed one-off branching based on one product stack, one exact phrase, one menu, or one special case.

Non-scope:

- This implementation does not execute push, merge, main CI waiting, local/remote synchronization, branch deletion, worktree deletion, remote deletion, product-repository deletion, or cleanup deletion; those remain approval-bound closure-phase actions.
- The new workflow skill must not weaken AGENTS.MD, STEP 1-7, STEP 1-14, existing gates, Git hooks, pre-commit, CI, document routes, or existing repo-local skills.
- The new workflow skill must not create a shortcut around developer approvals, security gates, evidence requirements, destructive-operation policy, or final-gate proof.

## Repository Development Workflow Runner Requirements

SYNC-ID: repository_development_workflow_runner
STATUS: implemented
ARTIFACTS: .gitignore,docs/workflow/AS_BUILT_SYNC_CONTRACT.tsv,docs/workflow/REPOSITORY_DEVELOPMENT_WORKFLOW.tsv,docs/workflow/REPOSITORY_DEVELOPMENT_RUNNER_POLICY.tsv,docs/workflow/TEST_PLAN_MANIFEST.tsv,learning/REPOSITORY_DEVELOPMENT_APPROVALS.tsv,skills/repository-development-workflow/SKILL.md,skills/repository-development-workflow/references/repository-development.md,tools/lib/repository_development_workflow.sh,tools/lib/repository_development_runner.sh,tools/repository-development-workflow,tools/check_repository_development_workflow.sh,tools/test_repository_development_workflow.sh,docs/as-built/IMPLEMENTATION_PLAN.md,docs/workflow/TASK_TRACKER.md,docs/workflow/HANDOFF.md
TESTS: tools/check_repository_development_workflow.sh,tools/test_repository_development_workflow.sh,tools/check_test_plan_coverage.sh,tools/test_test_plan.sh,tools/check_as_built_sync_contract.sh,tools/check_as_built_docs.sh,tools/check_workflow_pair_sync.sh

The repository development workflow runner must turn the existing policy-backed skill into an approval-bound execution controller for lesson-repository development without weakening AGENTS.MD, existing gates, or the current release-proof model.
The runner is additive: it coordinates phase detection, check selection, execution records, reuse decisions, and stop conditions while existing commands, tests, CI, hooks, and repo-local skills remain authoritative.

Required outcomes:

- Detect or accept the active repository-development phase from the existing seven-phase model.
- Produce a dry-run execution plan before running checks.
- Execute non-destructive local checks for `fast_loop` and `mid_tests` when explicitly requested and allowed.
- Record phase, command, commit, policy fingerprint, input fingerprint, result, and timestamp.
- Reuse prior PASS records only when commit, relevant inputs, policy, and command identity still match.
- Keep release proof strict; `release_gate` must not be satisfied by stale fast-loop records.
- Keep merge, main CI waiting, local/remote sync, branch/worktree deletion, remote deletion, product-repository deletion, and cleanup execution approval-bound.
- Make new runner validation callable directly and from aggregate checks.
- Store runner policy in machine-readable workflow files and shared shell helpers rather than one-off branches.
- Preserve STEP 1-7, STEP 1-14, existing CI, existing checks, existing document routes, repo-local skills, security gates, and document synchronization ownership boundaries.

Non-scope:

- The runner must not become a dashboard mutation route, browser command executor, CI bypass, approval bypass, destructive cleanup tool, or replacement for `worklog-doc-sync` or `lesson-sync-gate`.
- The runner must not cache CI verification results as release proof.

## Implemented Product Development Workflow Skill And Alias Requirements

SYNC-ID: product_development_workflow_skill_aliases
STATUS: implemented
ARTIFACTS: AGENTS.MD,docs/workflow/AS_BUILT_SYNC_CONTRACT.tsv,docs/workflow/TEST_PLAN_MANIFEST.tsv,skills/SKILL_ALIASES.tsv,skills/product-development-workflow/SKILL.md,skills/product-development-workflow/references/product-development.md,skills/product-development-workflow/agents/openai.yaml,tools/menu,tools/check_agents_skills.sh,tools/test_menu_prerequisites.sh,tools/test_dashboard_settings.sh,dashboard-control-center/src/App.jsx,dashboard-control-center/src/i18n.js,dashboard-control-center/src/styles.css,tests/playwright/dashboard-control-center.spec.js,tools/test_dashboard_control_center.sh
TESTS: tools/check_agents_skills.sh,tools/test_menu_prerequisites.sh,tools/test_dashboard_settings.sh,tools/test_dashboard_control_center.sh,tools/check_as_built_sync_contract.sh,tools/check_as_built_docs.sh,tools/check_test_plan_coverage.sh,tools/check_workflow_pair_sync.sh

External product development must have a repo-local workflow skill that applies the same development discipline as this repository while keeping Dashboard Settings as the source of truth.
The implementation is additive and must not trade away STEP 1-7, STEP 1-14, existing CI, existing checks, existing document routes, product-security checks, Settings safety, or repo-local skill ownership.

Required outcomes:

- Add `$product-development-workflow` for Free Development, Product Improvement, and External Integration.
- Route Lesson Repository Improvement to `$repository-development-workflow`, not to the external-product workflow.
- Treat Dashboard Settings as the authoritative source for product Git usage mode and workflow action behavior.
- Do not force Git, CI, commit, push, PR, merge, main CI, local/remote sync, or cleanup when the selected product mode does not allow that phase.
- Keep Git usage `none` as "Git/CI not applicable", not "no checks"; product workspace, canonical documents, scaffold, security, external-integration approvals, and required local checks remain applicable.
- Provide short English skill aliases through `./tools/menu skills` and `./tools/menu skill-aliases` without replacing canonical skill names.
- Keep workflow action-mode display consistent in Settings: `禁止`, `都度確認`, and `自動` represent prohibited execution, per-run confirmation, and Settings-as-prior-approval execution.
- Keep boolean permission rows, including Developer auto-merge, aligned with their actual writer values as allowed/not allowed rather than action-mode labels.
- Add a short Settings confirmation note explaining that `自動` can execute without another confirmation only after all required conditions pass.
- Keep new checks standalone and aggregate-callable through existing menu, AGENTS/skills, dashboard-settings, dashboard UI, sync, and test-plan checks.

Non-scope:

- Do not create a Dashboard Git/GitHub/CI executor, browser mutation path, new writer, credential handler, OAuth approver, external-service authority changer, product repository deleter, or destructive cleanup tool.
- Do not weaken product Git usage modes, existing Git workflow validation, product-security gates, Settings writer boundaries, CI/pre-commit wiring, or document synchronization checks.
- Do not make aliases replace canonical skill names or bypass `AGENTS.MD`.

## Implemented External Product Workflow Release Readiness Requirements

SYNC-ID: external_product_workflow_release_readiness
STATUS: implemented
ARTIFACTS: docs/workflow/AS_BUILT_SYNC_CONTRACT.tsv,docs/workflow/TEST_PLAN_MANIFEST.tsv,free-development/FREE_DEVELOPMENT_MODE.md,skills/product-development-workflow/SKILL.md,skills/product-development-workflow/references/product-development.md,skills/worklog-doc-sync/SKILL.md,skills/worklog-doc-sync/references/worklog-sync.md,skills/task-tracker-docs/SKILL.md,skills/task-tracker-docs/references/product-docs.md,tools/lib/product_workflow_git_usage.sh,tools/product-profile,tools/menu,tools/dashboard-data,tools/test_product_git_usage_modes.sh,tools/test_menu_prerequisites.sh,tools/test_dashboard_data.sh,docs/as-built/REQUIREMENTS.md,docs/as-built/SPECIFICATION.md,docs/as-built/IMPLEMENTATION_PLAN.md,docs/workflow/TASK_TRACKER.md,docs/workflow/HANDOFF.md
TESTS: tools/test_product_git_usage_modes.sh,tools/test_menu_prerequisites.sh,tools/test_dashboard_data.sh,tools/check_agents_skills.sh,tools/check_test_plan_coverage.sh,tools/test_test_plan.sh,tools/check_as_built_sync_contract.sh,tools/check_as_built_docs.sh,tools/check_workflow_pair_sync.sh

External product workflows must be release-ready across Free Development, Product Improvement, and External Integration without forcing Git or CI when Dashboard Settings says they are not applicable.
The Settings product workflow Git usage mode remains the source of truth for whether external-product work stops at local verification, local Git, remote sync, or CI-backed PR/main workflow.

Required outcomes:

- Free Development, Product Improvement, and External Integration must resolve product workspace, Git worktree, remote sync, CI, Dashboard rows, menu readiness, and product profile boundaries from product workflow mode rather than from fixed menu names or hard-coded Git requirements.
- Git usage `none` must still require product workspace, product documents, scaffold authority, product-security checks, external-integration approvals, and required local checks. It must not require `.git`, remote sync, PR CI, merge, main CI, or Git cleanup.
- Git usage `local`, `remote_sync`, and `ci` must preserve their existing increasing strictness, with `ci` remaining the default strict behavior.
- `PRODUCT_WORKFLOW_GIT_USAGE_MODE` must not be accepted as a general runtime override. It may be used only with an explicit test override flag so Dashboard Settings cannot be silently bypassed.
- `tools/product-profile` and `tools/menu` must accept a configured non-Git product workspace for product contexts whose mode is `none`, while preserving strict Git repository requirements for structured lesson product work and product contexts whose mode requires Git.
- Dashboard producer data must mark Git operation rows as `not_applicable` when the selected external-product mode does not include that operation, rather than presenting those rows as failed or blocked.
- Worklog and product-document skills must refer to the configured product workspace; `$HOME/projects/task-tracker-repository/` remains the structured lesson default example, not the only product workspace.
- STEP 1-7, STEP 1-14, and Advanced Lesson keep their lesson flows authoritative. They may use product checks and product documents as learning gates, but the full external-product workflow automation is limited to Free Development, Product Improvement, and External Integration.

Non-scope:

- Do not weaken STEP 1-7, STEP 1-14, product-security, existing CI, existing checks, pre-commit, synchronized document gates, or default strict `ci` behavior.
- Do not add a Dashboard Git/GitHub/CI executor, credential handler, OAuth approver, destructive cleanup executor, product repository deleter, or release-proof shortcut.
- Do not make skill prose or environment variables stronger than Dashboard Settings and policy files.

## Implemented External Product Local Scaffold Controls Requirements

SYNC-ID: external_product_local_scaffold_controls
STATUS: implemented
ARTIFACTS: AGENTS.MD,docs/workflow/AS_BUILT_SYNC_CONTRACT.tsv,docs/workflow/PRODUCT_REPOSITORY_STRUCTURE.tsv,docs/workflow/TEST_PLAN_MANIFEST.tsv,free-development/FREE_DEVELOPMENT_MODE.md,templates/TEMPLATES.md,skills/product-development-workflow/SKILL.md,skills/product-development-workflow/references/product-development.md,tools/lib/product_workflow_git_usage.sh,tools/lib/product_repository_registry.sh,tools/lib/product_repository_authority.sh,tools/product-gate-evidence-bootstrap,tools/product-scaffold-check,tools/product-launch-check,tools/dashboard-data,tools/test_product_scaffold_check.sh,tools/test_product_git_usage_modes.sh,tools/test_product_repository_authority.sh,tools/test_product_gate_tools.sh,tools/test_product_launch_check.sh,tools/test_dashboard_data.sh,docs/as-built/REQUIREMENTS.md,docs/as-built/SPECIFICATION.md,docs/as-built/IMPLEMENTATION_PLAN.md,docs/workflow/TASK_TRACKER.md,docs/workflow/HANDOFF.md
TESTS: tools/test_product_scaffold_check.sh,tools/test_product_git_usage_modes.sh,tools/test_product_repository_authority.sh,tools/test_product_gate_tools.sh,tools/test_product_launch_check.sh,tools/test_dashboard_data.sh,tools/check_agents_skills.sh,tools/check_test_plan_coverage.sh,tools/test_test_plan.sh,tools/check_as_built_sync_contract.sh,tools/check_as_built_docs.sh,tools/check_workflow_pair_sync.sh

External product repositories must be maintainable from inside the configured product workspace while this lesson repository provides the control basis.
The default product scaffold must include only product-safe local maintenance controls that are useful for Free Development, Product Improvement, and External Integration, without copying the lesson repository's internal automation wholesale.

Required outcomes:

- Standard product repositories must include product-local `skills/` and `tools/` entries for workflow guidance, document sync, security checks, product tests, a shared product helper, and Dashboard-readable product gate evidence recording.
- Product-local controls must be minimal, product-scoped, and safe to run inside the external product repository.
- Product documents remain canonical under `docs/product/`, workflow state remains under `docs/workflow/`, optional product memory remains under `docs/memory/`, and operational manifests remain under `ops/`.
- `AGENTS.MD` must route non-lesson product workflow work to the configured product workspace instead of treating the structured lesson task-tracker repository as the only product target.
- Free Development guidance and templates must show the same default scaffold so developers and agents do not create incompatible product repositories.
- Product workflow Git usage mode remains the source of truth for Git and CI applicability. Non-CI modes must not require `ops/CI_MANIFEST.tsv` or `.github/workflows/`, while strict default `ci` behavior remains unchanged.
- Product gate evidence producer installation must be available from this repository, but it must write only approved product-local producer files and leave `.git/product-gate-evidence/index.tsv` to be created by real product-local check execution.
- Product authority must compare evidence `product_head` with the current product repository HEAD when Git is available, and treat mismatched evidence as stale instead of reporting it as ready.
- Product launch checks must preserve strict Git requirements by default and allow a Git-optional path only when the product workflow mode makes Git not applicable.
- Dashboard data must evaluate selected product Git operation modes against the configured product repository for external-product contexts.
- New checks must remain standalone and aggregate-callable through existing test plan, hook, CI, sync, and workflow-pair checks.

Non-scope:

- Do not generate external product `AGENTS.MD`, credentials, secrets, dependency caches, build outputs, Git internals, or CI files when CI is not applicable.
- Do not weaken STEP 1-7, STEP 1-14, Advanced Lesson, existing CI, existing checks, product-security, document synchronization, or default strict `ci` behavior.
- Do not make external product scaffolds a copy of this lesson repository's internal tooling.
- Do not add Dashboard mutation, Git execution, CI execution, merge, cleanup, deletion, OAuth, credential handling, or external-service authority changes.

## Implemented Dashboard Control Center Design System Requirements

SYNC-ID: dashboard_control_center_design_system
STATUS: implemented
ARTIFACTS: docs/design-system/dashboard-control-center/DESIGN_SYSTEM.md,docs/workflow/AS_BUILT_SYNC_CONTRACT.tsv,docs/workflow/TEST_PLAN_MANIFEST.tsv,guides/DOCUMENT_MAP.md,tools/docs-tour,dashboard-control-center/src/App.jsx,dashboard-control-center/src/i18n.js,dashboard-control-center/src/styles.css,tests/playwright/dashboard-control-center.spec.js,tools/test_docs_tour.sh,tools/test_dashboard_control_center.sh,docs/memory/DEVELOPER_MEMORY.md,docs/as-built/REQUIREMENTS.md,docs/as-built/SPECIFICATION.md,docs/as-built/IMPLEMENTATION_PLAN.md,docs/workflow/TASK_TRACKER.md,docs/workflow/HANDOFF.md
TESTS: tools/test_docs_tour.sh,tools/test_dashboard_i18n.sh,tools/test_dashboard_control_center.sh,tools/check_developer_memory_requirements.sh,tools/check_test_plan_coverage.sh,tools/test_test_plan.sh,tools/check_as_built_sync_contract.sh,tools/check_as_built_docs.sh,tools/check_workflow_pair_sync.sh

Dashboard Control Center must have a documented design system that keeps Repository Control Center pages visually and behaviorally consistent while improving non-engineer comprehension.
The design system must be a repository-owned document route, not an implicit CSS convention.

Required outcomes:

- `docs/design-system/dashboard-control-center/DESIGN_SYSTEM.md` must define the purpose, scope, typography, colors, spacing, icons, page headers, badges, cards, detail surfaces, tooltips, copy controls, command previews, localization, responsive rules, accessibility, and verification contract for Dashboard Control Center UI.
- Development Workflow, Maintenance Sync, Safety Actions, and Help must lead with practical decisions and plain-language meaning before technical files, commands, or IDs.
- Card action affordances must open useful detail or be replaced with non-false affordances.
- Evidence and source displays must explain role and purpose first; raw paths and commands remain accessible through copy or technical detail.
- Help glossary entries must be categorized and open a deeper detail surface for non-engineers.
- Command previews and safety policy surfaces must preserve display-only and approval-bound semantics.
- The document map and docs tour must route developers and agents to the design-system document.
- New checks must remain callable independently and through existing aggregate, hook, CI, and repository-development workflow routes.

Non-scope:

- Do not redesign product application UI, learner lesson prose, external product landing pages, Git/CI execution semantics, Settings mutation authority, command execution, credential handling, merge, cleanup, OAuth, or external-service authority.
- Do not weaken read-only behavior outside Settings, Safety Actions command isolation, STEP 1-7, STEP 1-14, existing CI, existing checks, product-security, synchronized documents, or repo-local skills.
- Do not implement page-specific one-off styling that bypasses the design-system contract.

## Implemented Dashboard Control Center Design System Full-Application Requirements

SYNC-ID: dashboard_control_center_design_system_full_application
STATUS: implemented
ARTIFACTS: docs/design-system/dashboard-control-center/DESIGN_SYSTEM.md,docs/workflow/AS_BUILT_SYNC_CONTRACT.tsv,dashboard-control-center/src/App.jsx,dashboard-control-center/src/i18n.js,dashboard-control-center/src/styles.css,tests/playwright/dashboard-control-center.spec.js,docs/memory/DEVELOPER_MEMORY.md,docs/as-built/REQUIREMENTS.md,docs/as-built/SPECIFICATION.md,docs/as-built/IMPLEMENTATION_PLAN.md,docs/workflow/TASK_TRACKER.md,docs/workflow/HANDOFF.md
TESTS: tools/test_docs_tour.sh,tools/test_dashboard_i18n.sh,tools/test_dashboard_control_center.sh,tools/check_developer_memory_requirements.sh,tools/check_test_plan_coverage.sh,tools/test_test_plan.sh,tools/check_as_built_sync_contract.sh,tools/check_as_built_docs.sh,tools/check_workflow_pair_sync.sh

Dashboard Control Center must apply the documented design system to source, evidence, tooltip, copy, and detail surfaces across all repository-control pages, not only to the initial design-system document route.
The full application must keep technical evidence inspectable while preventing long tooltip text from clipping or becoming the primary explanation channel.

Required outcomes:

- Page headers, decision summaries, cards, operational rows, technical chips, and tooltip surfaces must visibly share the design-system frame, spacing, border, radius, focus, and evidence-display rules in the running Dashboard Control Center.
- Source and evidence fields may show raw paths, commands, and technical IDs directly when those values are the inspectable field value.
- Tooltip text must be short role-oriented help for the field, not a long technical explanation.
- Long explanations must move to the shared detail popup or Help glossary.
- Copy controls must copy the raw value and expose the copied value through accessible names or titles without replacing the field body.
- Development Workflow, Maintenance Sync, Safety Actions, Repository Info, Documents, Settings, Help, History, Overview, and Lessons must keep the same design-system roles for page headers, decision summaries, cards, rows, badges, source displays, and details.
- Existing Dashboard read-only behavior outside Settings and display-only command previews must remain unchanged.

Non-scope:

- Do not change Settings persistence, Git/CI/merge/sync execution semantics, product workflow logic, document ownership, credentials, external-service authority, CI/pre-commit/final-gate behavior, or any existing lesson flow.
- Do not add page-specific one-off tooltip branches that cannot be reused by source, evidence, command, and reference surfaces.

## Implemented Dashboard Control Center Design System Source-To-Runtime Requirements

SYNC-ID: dashboard_control_center_design_system_source_runtime
STATUS: implemented
ARTIFACTS: docs/design-system/dashboard-control-center/DESIGN_SYSTEM.md,docs/design-system/dashboard-control-center/tokens.json,docs/design-system/dashboard-control-center/components.json,dashboard-control-center/src/design-system.generated.css,dashboard-control-center/src/design-system.generated.js,dashboard-control-center/src/main.jsx,dashboard-control-center/src/App.jsx,dashboard-control-center/src/styles.css,tools/dashboard-design-system,tools/check_dashboard_design_system.sh,tools/test_dashboard_control_center.sh,tools/test_lesson_repository.sh,docs/workflow/GIT_HOOK_CHECKS.tsv,docs/workflow/GIT_HOOK_PARALLEL_GROUPS.tsv,docs/workflow/TEST_PLAN_MANIFEST.tsv,docs/workflow/AS_BUILT_SYNC_CONTRACT.tsv,tests/playwright/dashboard-control-center.spec.js,docs/memory/DEVELOPER_MEMORY.md,docs/as-built/REQUIREMENTS.md,docs/as-built/SPECIFICATION.md,docs/as-built/IMPLEMENTATION_PLAN.md,docs/workflow/TASK_TRACKER.md,docs/workflow/HANDOFF.md
TESTS: tools/test_dashboard_i18n.sh,tools/test_dashboard_control_center.sh,tools/check_developer_memory_requirements.sh,tools/check_test_plan_coverage.sh,tools/test_test_plan.sh,tools/check_as_built_sync_contract.sh,tools/check_as_built_docs.sh,tools/check_workflow_pair_sync.sh,tools/check_repository_development_workflow.sh,tools/test_repository_development_workflow.sh

Dashboard Control Center design-system changes must be driven by a source-to-runtime contract.
`DESIGN_SYSTEM.md` remains the human-readable source of truth, while machine-readable token and component files make CSS/JS generation and drift checks repeatable.

Required outcomes:

- `DESIGN_SYSTEM.md` must describe the source-to-runtime sequence: design-system source, machine-readable tokens and components, generated CSS/JS, prototype or browser preview, developer visual approval, runtime implementation, and drift check.
- `tokens.json` must define reusable Dashboard Control Center tokens for color, radius, shadow, focus, page accent fallback, and surface roles.
- `components.json` must define reusable component contracts for page headers, status badges, operational cards, detail surfaces, tooltip/copy surfaces, and command previews.
- Generated CSS and JS must be produced from the machine-readable sources and must not be edited by hand.
- The running React entry must import the generated CSS, and the app shell must expose a stable design-system marker for browser inspection.
- A standalone drift check must verify generated CSS/JS, source document contract text, and runtime wiring.
- The drift check must be callable directly and through Dashboard focused tests, Git hooks, aggregate tests, and repository-development workflow checks.

Non-scope:

- Do not change Settings mutation authority, Git/CI/merge/sync execution semantics, product workflow logic, command execution authority, credentials, CI/pre-commit/final-gate behavior, or existing lesson flows.
- Do not replace the human-readable `DESIGN_SYSTEM.md` with generated JSON-only configuration.
- Do not introduce dependency changes for this contract; the generator uses the existing Node runtime and standard library only.

## Implemented Dashboard Control Center Design Studio Requirements

SYNC-ID: dashboard_control_center_design_studio
STATUS: implemented
ARTIFACTS: docs/design-system/dashboard-control-center/DESIGN_SYSTEM.md,docs/design-system/dashboard-control-center/components.json,dashboard-control-center/src/design-system.generated.css,dashboard-control-center/src/design-system.generated.js,dashboard-control-center/src/App.jsx,dashboard-control-center/src/dashboardData.js,dashboard-control-center/src/i18n.js,dashboard-control-center/src/styles.css,vite.config.mjs,tools/dashboard-design-system,tools/check_dashboard_design_system.sh,tests/playwright/dashboard-control-center.spec.js,tools/test_dashboard_control_center.sh,docs/memory/DEVELOPER_MEMORY.md,docs/workflow/AS_BUILT_SYNC_CONTRACT.tsv,docs/as-built/REQUIREMENTS.md,docs/as-built/SPECIFICATION.md,docs/as-built/IMPLEMENTATION_PLAN.md,docs/workflow/TASK_TRACKER.md,docs/workflow/HANDOFF.md
TESTS: tools/test_dashboard_i18n.sh,tools/test_dashboard_control_center.sh,tools/check_developer_memory_requirements.sh,tools/check_test_plan_coverage.sh,tools/test_test_plan.sh,tools/check_as_built_sync_contract.sh,tools/check_as_built_docs.sh,tools/check_workflow_pair_sync.sh,tools/check_repository_development_workflow.sh,tools/test_repository_development_workflow.sh

Dashboard Control Center must provide a guarded Design Studio page so approved design-system changes can be edited, previewed, planned, confirmed, and applied from the dashboard without turning the dashboard into an arbitrary CSS editor.

Required outcomes:

- The Repository navigation must expose Design Studio without removing existing Dashboard, Lessons, Workflow, Maintenance, Safety, Repository Info, Documents, Settings, Help, or History routes.
- Design Studio must show the design-system source-to-runtime boundary in non-engineer-readable language.
- Tooltip and copy-popup interaction rules must be editable only through validated presets backed by `components.json`.
- Tooltip bubbles must be hover-only, must hide when the pointer leaves the trigger, and must appear above the trigger.
- Copy popups must appear above the copy button and hide when the pointer leaves the copy button.
- Copy popup duration and collision presets must affect generated runtime behavior, not only stored metadata.
- Applying a Design Studio change must update `components.json` and regenerate `design-system.generated.css` and `design-system.generated.js` through `tools/dashboard-design-system`.
- Design Studio mutations must use same-origin JSON POST endpoints, explicit confirmation for apply, a matching one-time plan token, and whitelist validation.
- Browser tests must verify the new navigation route, interaction preview, mocked plan/apply flow, tooltip hide behavior, and copy popup placement.

Non-scope:

- Do not add free-form CSS editing, arbitrary script execution, external service authority, credential handling, Git/CI/merge authority, or Settings authority changes.
- Do not weaken existing source-to-runtime drift checks or Dashboard read-only/display-only boundaries.

## Implemented Dashboard Control Center Visual Design-System Editor Requirements

SYNC-ID: dashboard_control_center_design_studio_visual_editor
STATUS: implemented
ARTIFACTS: docs/design-system/dashboard-control-center/DESIGN_SYSTEM.md,docs/design-system/dashboard-control-center/tokens.json,docs/design-system/dashboard-control-center/components.json,dashboard-control-center/src/design-system.generated.css,dashboard-control-center/src/design-system.generated.js,dashboard-control-center/src/App.jsx,dashboard-control-center/src/dashboardData.js,dashboard-control-center/src/i18n.js,dashboard-control-center/src/styles.css,vite.config.mjs,tools/dashboard-design-system,tools/check_dashboard_design_system.sh,tests/playwright/dashboard-control-center.spec.js,tools/test_dashboard_control_center.sh,docs/workflow/PRODUCT_REPOSITORY_STRUCTURE.tsv,templates/TEMPLATES.md,tools/test_product_scaffold_check.sh,docs/memory/DEVELOPER_MEMORY.md,docs/workflow/AS_BUILT_SYNC_CONTRACT.tsv,docs/as-built/REQUIREMENTS.md,docs/as-built/SPECIFICATION.md,docs/as-built/IMPLEMENTATION_PLAN.md,docs/workflow/TASK_TRACKER.md,docs/workflow/HANDOFF.md
TESTS: tools/check_dashboard_design_system.sh,tools/test_dashboard_i18n.sh,tools/test_dashboard_control_center.sh,tools/test_product_scaffold_check.sh,tools/check_developer_memory_requirements.sh,tools/check_test_plan_coverage.sh,tools/test_test_plan.sh,tools/check_as_built_sync_contract.sh,tools/check_as_built_docs.sh,tools/check_workflow_pair_sync.sh,tools/check_repository_development_workflow.sh,tools/test_repository_development_workflow.sh

Dashboard Control Center Design Studio must become a visual design-system editor rather than a warning-only surface about direct CSS editing.
It must let developers tune shared design decisions through source-backed controls, preview the result, and apply the generated runtime contract without exposing arbitrary CSS or script editing.

Required outcomes:

- Design Studio must describe the boundary as "edit the design source of truth", not as "do not edit CSS" as the primary user-facing value.
- The page must expose source-backed visual editing controls for foundation presets such as theme accent, density, radius, and typography scale.
- Foundation changes must update `tokens.json` and regenerate generated CSS/JS through `tools/dashboard-design-system`; generated files remain non-authoritative artifacts.
- Interaction changes for tooltip/copy behavior must remain whitelist-validated and plan-token protected.
- The live preview must show atom, molecule, and organism examples so upstream foundation changes visibly affect downstream UI consistently.
- Design Studio must distinguish the current lesson repository target from an external product repository target. External product design editing must use product-local design-system files when present; the lesson repository remains the control plane and must not become the external product design authority.
- External product repositories must have a standard place for product-local design-system sources so future product workflows can maintain design decisions inside the product repository.
- Existing Dashboard pages, Settings mutation authority, command execution boundaries, Git/CI/merge/sync semantics, STEP 1-7, STEP 1-14, and existing checks must remain unchanged.

Non-scope:

- Do not implement a full Figma replacement, arbitrary canvas editor, arbitrary CSS editor, external-service integration, asset hosting, plugin marketplace, credential handling, or cross-repository writes without explicit product workflow approval.
- Do not make external product design settings override the Dashboard Control Center design system.

## Implemented Dashboard Design Studio Orchestration Foundation Requirements

SYNC-ID: dashboard_design_studio_orchestration_foundation
STATUS: implemented
ARTIFACTS: .github/workflows/ci.yml,.github/workflows/lesson14-ci.yml,docs/design-system/dashboard-control-center/DESIGN_SYSTEM.md,docs/design-system/dashboard-control-center/tokens.json,docs/design-system/dashboard-control-center/components.json,docs/design-system/dashboard-control-center/orchestration.json,dashboard-control-center/src/design-system.generated.css,dashboard-control-center/src/design-system.generated.js,dashboard-control-center/src/App.jsx,dashboard-control-center/src/i18n.js,dashboard-control-center/src/styles.css,tests/playwright/dashboard-control-center.spec.js,tools/dashboard-design-system,tools/check_dashboard_design_system.sh,tools/check_ci_workflow_structure.sh,docs/workflow/AS_BUILT_SYNC_CONTRACT.tsv,docs/as-built/REQUIREMENTS.md,docs/as-built/SPECIFICATION.md,docs/as-built/IMPLEMENTATION_PLAN.md,docs/workflow/TASK_TRACKER.md,docs/workflow/HANDOFF.md
TESTS: tools/check_ci_workflow_structure.sh,tools/check_dashboard_design_system.sh,tools/test_dashboard_i18n.sh,tools/test_dashboard_control_center.sh,tools/check_as_built_sync_contract.sh,tools/check_as_built_docs.sh,tools/check_workflow_pair_sync.sh,tools/check_repository_development_workflow.sh,tools/test_repository_development_workflow.sh

Dashboard Design Studio now has a proposal orchestration foundation for future design-system work.
This implementation keeps the guarded visual editor and source-to-runtime contract intact, then adds machine-readable orchestration contracts, source validation, generated runtime exposure, and a non-engineer-readable Design Studio panel for the request/proposal, AI provider, mock/template, target-adapter, approval, verification, and rollback model.
It does not make AI, mock artifacts, templates, or external product files authoritative, and it does not introduce direct cross-repository mutation.

Implemented outcomes:

- Design Studio keeps the existing source-to-runtime contract and remains outside arbitrary CSS, JavaScript, shell, Git, CI, and external-service execution.
- The design-system source now includes `orchestration.json` as the machine-readable contract for `Design Intent / Mock / Template -> Candidate Envelope -> AI or Manual Proposal -> Preview / Diff -> Plan Token -> Explicit Approval -> Apply through owner tool -> Verification -> Rollback-ready Evidence`.
- The source contract separates UI, Request / Proposal Store, Event Runner, Target Adapter, provider mode, mock bridge, template library, validation, approval, and rollback responsibilities.
- `DesignIntentRequest`, `DesignChangeProposal`, `CandidateEnvelope`, `MockArtifact`, `MockAnalysisProposal`, `TemplateDefinition`, `TemplateProposal`, and `ApplyEvidence` are first-class schema contracts in the design-system source.
- Manual, subscription-agent, and API-key provider modes are represented as proposal-only provider strategies. None has direct apply authority.
- API-key mode is documented and validated as secret-reference-only. Raw secrets must not be sent to the browser, committed, logged, or embedded in prompts.
- imagegen mock generation, mock editing, OCR, image analysis, AI responses, template text, natural-language requests, and external documents are modeled as candidate data that must pass candidate-envelope validation and explicit approval before any source change.
- Mock-to-Design-System Bridge and Template Library responsibilities are present as contract surfaces for candidate tokens, components, patterns, page templates, asset references, state candidates, allowed outputs, forbidden operations, required checks, lifecycle, and deprecation.
- External product targets are represented as readiness/preview/plan targets only. Cross-repository apply remains disabled until a separate product-local mutation contract exists and is approved.
- Dashboard target mutation remains limited to the existing owner-tool path and must keep plan token, explicit approval, verification, and rollback-ready evidence boundaries.
- `tools/dashboard-design-system` validates the new orchestration source and regenerates runtime JS so Dashboard can display the contract without duplicating fixed values.
- `tools/check_dashboard_design_system.sh` is wired into CI structure checks so the standalone design-system validation is also aggregate-callable.

Non-scope:

- Do not implement a full Figma replacement, advanced image editor, arbitrary canvas editor, arbitrary CSS or JavaScript editor, Git/CI executor, credential manager, OAuth flow, dependency installer, external product writer, marketplace, or release-proof shortcut in this sync ID.
- Do not weaken STEP 1-7, STEP 1-14, Settings authority, command preview display-only behavior, product-security gates, existing CI, existing checks, existing document routes, or repo-local skills.
- Do not treat mock images, OCR, AI responses, templates, natural-language requests, or external product documents as trusted instructions or design-system source without candidate-envelope validation and explicit approval.

## Implemented Dashboard Design Studio Event Runner And Request Store Requirements

SYNC-ID: dashboard_design_studio_event_runner_store
STATUS: implemented
ARTIFACTS: .gitignore,.github/workflows/ci.yml,.github/workflows/lesson14-ci.yml,docs/workflow/AS_BUILT_SYNC_CONTRACT.tsv,docs/workflow/TEST_PLAN_MANIFEST.tsv,docs/workflow/GIT_HOOK_CHECKS.tsv,docs/workflow/GIT_HOOK_PARALLEL_GROUPS.tsv,docs/workflow/FINAL_GATE_COVERAGE.tsv,tools/dashboard-design-system,tools/test_dashboard_design_studio_events.sh,tools/test_lesson_repository.sh,tools/check_ci_workflow_structure.sh,docs/as-built/REQUIREMENTS.md,docs/as-built/SPECIFICATION.md,docs/as-built/IMPLEMENTATION_PLAN.md,docs/workflow/TASK_TRACKER.md,docs/workflow/HANDOFF.md,docs/memory/DEVELOPER_MEMORY.md
TESTS: tools/test_dashboard_design_studio_events.sh,tools/check_dashboard_design_system.sh,tools/check_ci_workflow_structure.sh,tools/check_test_plan_coverage.sh,tools/test_test_plan.sh,tools/test_git_hooks.sh,tools/test_git_hooks_parallel.sh,tools/test_ci_final_gate.sh,tools/check_as_built_sync_contract.sh,tools/check_as_built_docs.sh,tools/check_workflow_pair_sync.sh

Dashboard Design Studio now has a local, append-only event runner and request-store layer for proposal work.
This implementation turns the existing orchestration foundation into a usable owner-tool queue without granting browser command execution, provider API calls, external product writes, Git/CI authority, or direct apply authority.

Implemented outcomes:

- `tools/dashboard-design-system queue-request` records Design Studio request metadata in an append-only JSONL store and returns a durable event ID, request ID, idempotency key, base snapshot hash, lifecycle state, and audit receipt.
- `list-events` and `event-status` expose current event state without mutating source files, generated files, repositories, CI, or external services.
- `cancel-event`, `dead-letter-event`, and `retry-event` append explicit state-transition records and require `--confirm` for mutation.
- Manual and subscription-agent provider modes are accepted only as proposal/import boundaries. API-key mode remains blocked until a separately approved secret-reference, consent, cost, rate-limit, and provider policy exists.
- Dashboard Control Center targets stay owner-tool mediated. External product targets stay plan-only and manual-required.
- Event records store metadata, hashes, and bounded redacted previews only; raw `intent_text`, secret-like payloads, shell commands, direct-apply fields, and credential values are rejected or omitted.
- The default event store path is ignored as repo-local runtime state, while tests use a temporary store through `DASHBOARD_DESIGN_STUDIO_EVENT_STORE_DIR`.
- The new standalone regression is wired into aggregate tests, Git hooks, CI workflows, final-gate coverage, and test-plan policy.

Non-scope:

- Do not dispatch subscription agents, call provider APIs, store raw API keys, run imagegen, edit mock images, extract OCR as trusted instructions, write external product files, execute shell commands, push, merge, wait for main CI, or change Settings authority in this sync ID.
- Do not treat the event store as release proof or as approval for apply; it is request/proposal metadata only.
## Planned External Product AGENTS And Operation Mode Control Requirements

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
## Implemented External Product Repository Registry Requirements

SYNC-ID: external_product_repository_registry
STATUS: implemented
ARTIFACTS: docs/workflow/AS_BUILT_SYNC_CONTRACT.tsv,docs/workflow/DASHBOARD_DATA_SCHEMA.tsv,docs/workflow/PRODUCT_REPOSITORY_REGISTRY_SCHEMA.tsv,docs/workflow/PRODUCT_GATE_EVIDENCE_SCHEMA.tsv,docs/workflow/PRODUCT_WORKFLOW_GIT_USAGE_POLICY.tsv,docs/workflow/PRODUCT_REPOSITORY_STRUCTURE.tsv,learning/PRODUCT_WORKFLOW_GIT_USAGE_SETTINGS.tsv,learning/context/WORKFLOW_CONTEXT_MAP.tsv,learning/PRODUCT_REPOSITORY_REGISTRY.tsv,learning/PRODUCT_REPOSITORY_SELECTION.tsv,tools/lib/lesson_common.sh,tools/lib/product_workflow_git_usage.sh,tools/lib/product_repository_registry.sh,tools/lib/product_repository_authority.sh,tools/lib/dashboard_data.sh,tools/dashboard-data,tools/free-development,tools/product-improvement,tools/external-integration,tools/menu,tools/product-repository-registry,tools/product-gate-evidence-bootstrap,dashboard-control-center/src/App.jsx,dashboard-control-center/src/dashboardData.js,dashboard-control-center/src/i18n.js,dashboard-control-center/src/styles.css,tests/fixtures/dashboard-control-center.json,tests/fixtures/dashboard-control-center-live-update.json,tests/playwright/dashboard-control-center.spec.js,tools/test_dashboard_schema.sh,tools/test_dashboard_data.sh,tools/test_dashboard_control_center.sh,tools/test_product_git_usage_modes.sh,tools/test_product_repository_authority.sh,tools/test_product_scaffold_check.sh,tools/test_product_gate_tools.sh,tools/test_menu_prerequisites.sh,docs/as-built/REQUIREMENTS.md,docs/as-built/SPECIFICATION.md,docs/as-built/IMPLEMENTATION_PLAN.md,docs/workflow/TASK_TRACKER.md,docs/workflow/HANDOFF.md
TESTS: tools/test_dashboard_schema.sh,tools/test_dashboard_data.sh,tools/test_dashboard_control_center.sh,tools/test_product_git_usage_modes.sh,tools/test_product_repository_authority.sh,tools/test_product_scaffold_check.sh,tools/test_product_gate_tools.sh,tools/test_menu_prerequisites.sh,tools/check_as_built_sync_contract.sh,tools/check_as_built_docs.sh,tools/check_workflow_pair_sync.sh,tools/check_repository_development_workflow.sh,tools/test_repository_development_workflow.sh

External product workflows must support more than one repository per product workflow context.
Free Development can have multiple active product candidates such as FrameCue and Browser Debug CLI, while Product Improvement and External Integration must remain unavailable until a concrete eligible repository is selected.

Required outcomes:

- The lesson repository must own a parent-side registry for external product repositories and a separate active selection for each repo-backed menu.
- Menu selection and target repository selection must be separate concepts in Dashboard data, Dashboard UI, and CLI tools.
- Free Development must allow multiple registered repositories and let the user switch the active repository without overwriting another free-development product.
- Product Improvement and External Integration must not become selectable merely because any legacy product repository exists.
- Product Improvement must require an explicitly selected improvement target with product documents, workflow documents, AGENTS.MD, operation mode, scaffold, and authority status ready enough for the selected Git usage mode.
- External Integration must require an explicitly selected target plus integration/security readiness before implementation guidance becomes selectable.
- Dashboard pages must read the same selected menu and repository identity across overview, workflow, maintenance, safety, repository information, documents, settings, design studio, help, and history.
- Live status, product authority, repository inventory, documents, recent workflow rows, and evidence details must be keyed by the selected repository identity rather than inferred from repository basename or lesson defaults.
- Existing STEP 1-7, STEP 1-14, advanced lesson behavior, existing product Git usage settings, existing product authority checks, and product-local AGENTS.MD operation-mode rules must remain compatible.

Implemented state:

- Parent-side registry state, resolver helpers, and guarded CLI mutation exist for multiple external product repositories.
- `frame-cue` and `browser-debug-cli` are the current temporary verification repositories for this sync.
- Dashboard data and Playwright focused checks prove selected `browser-debug-cli` does not fall back to `frame-cue` or `task-tracker-repository`.
- Dashboard data exposes `repository_selection` for repo-backed menus, including current repository identity, eligible candidates, path/Git/selectability status, disabled reasons, and display-only guarded `tools/product-repository-registry` commands.
- Dashboard Control Center renders a read-only repository selection panel from producer data; it does not execute repository writes in the browser.
- Dashboard overview cards and detail pages now share evidence identity through `source_id/current_item_id` attributes.
- Evidence taxonomy v1 now includes explicit `product.tests.*`, `product.structure.*`, `product.git.*`, `product.ci.*`, and `product.security.*` source groups, with product-local `structure-status` coverage for `product.structure.files/settings/scripts`, `git-status` coverage for `product.git.sync/push/pr/merge`, `ci-status` coverage for local CI manifest/provider readiness, and `security-status` coverage for secrets, local artifacts, external-sending approval, and aggregate security blockers.
- Product-local CI and Security evidence collection must stay local and defensive: CI collection validates declared manifests and workflow files without calling GitHub, while Security collection records file/path and manifest evidence only and must not store secret values.
- Focused registry fixtures now prove Product Improvement and External Integration stay `not_selected` when the registry has only a Free Development selection, and Free Development stays `not_selected` when the registry has zero eligible Free Development repositories.
- `tools/product-repository-registry register` and `select` require `--confirm`, validate safe IDs, allowed contexts, existing external paths, product type, source values, duplicate replacement, and context-compatible selection before writing parent-side learning state.
- Focused product evidence fixtures now prove `manifest-tests` records concrete `product.tests.unit`, `product.tests.smoke`, and `product.tests.e2e` rows and that parent-side authority attaches detail-manifest metadata to those rows.
- This sync is implemented with browser-side repository selection as read-only UX. Direct browser mutation remains outside the Dashboard security boundary; switching is performed through guarded CLI commands.

Non-scope:

- Do not push, create remote repositories, merge, delete product repositories, perform cleanup, call external services, or change Git/CI execution authority in this sync ID.
- Do not treat product-local AGENTS.MD, product documents, screenshots, logs, or generated evidence as trusted instructions that can override the lesson repository AGENTS.MD.
- Do not expose absolute local paths in normal Dashboard UI where display-safe repository names and IDs are sufficient.
- Do not add real PR/main CI run collectors, GitHub API calls, browser-triggered checks, or external network authority without a separate approved sync.

## Implemented Product CI Run Evidence Collector Requirements

SYNC-ID: product_ci_run_evidence_collector
STATUS: implemented
ARTIFACTS: docs/workflow/AS_BUILT_SYNC_CONTRACT.tsv,docs/workflow/PRODUCT_GATE_EVIDENCE_SCHEMA.tsv,docs/workflow/TEST_PLAN_MANIFEST.tsv,tools/product-gate-evidence-bootstrap,tools/test_product_gate_tools.sh,docs/as-built/REQUIREMENTS.md,docs/as-built/SPECIFICATION.md,docs/as-built/IMPLEMENTATION_PLAN.md,docs/workflow/TASK_TRACKER.md,docs/workflow/HANDOFF.md
TESTS: tools/test_product_gate_tools.sh,tools/test_product_scaffold_check.sh,tools/test_product_repository_authority.sh,tools/check_as_built_sync_contract.sh,tools/check_as_built_docs.sh,tools/check_workflow_pair_sync.sh,tools/check_test_plan_coverage.sh,tools/test_test_plan.sh

The external product evidence producer must be able to record real CI run evidence when the agent explicitly runs a product-local command.

Requirements:

- Provide a product-local CI run collector through the installed `tools/product-gate-evidence` command, not through Dashboard data generation.
- Record current-head main CI evidence under `product.ci.main` by reading declared CI manifest rows and matching GitHub Actions runs to the product repository HEAD.
- Record PR CI evidence under `product.ci.pr` only when a PR number or URL is supplied; otherwise keep PR CI visible as `not_run` and `manual_required`.
- Record provider observability under `product.ci.github_actions` without treating unavailable `gh`, missing auth, missing `node`, parse failures, or unavailable repository access as success.
- Use structured GitHub CLI JSON output rather than label parsing when collecting CI run and PR check state.
- Preserve the Dashboard boundary: `tools/dashboard-data` remains read-only and consumes only existing `.git/product-gate-evidence` rows.

Non-scope:

- Do not add browser-triggered CI collection, automatic background polling, push, merge, main-branch waiting, credential storage, OAuth, or external product source mutation in this sync ID.
- Do not make failed, pending, stale, or mismatched CI runs count as authoritative pass evidence.

## Implemented CI Final Gate Gap-Only Safety Requirements

SYNC-ID: ci_final_gate_gap_only_safety
STATUS: implemented
ARTIFACTS: docs/workflow/AS_BUILT_SYNC_CONTRACT.tsv,docs/workflow/FINAL_GATE_COVERAGE.tsv,docs/workflow/FINAL_GATE_GAP_COMMANDS.tsv,tools/ci-final-gate,tools/test_ci_final_gate.sh,docs/as-built/REQUIREMENTS.md,docs/as-built/SPECIFICATION.md,docs/as-built/IMPLEMENTATION_PLAN.md,docs/workflow/TASK_TRACKER.md,docs/workflow/HANDOFF.md,docs/memory/SESSION_MEMORY.md
TESTS: tools/test_ci_final_gate.sh,tools/check_ci_workflow_structure.sh,tools/check_as_built_sync_contract.sh,tools/check_as_built_docs.sh,tools/check_workflow_pair_sync.sh

The CI final gate gap-only mode must not become a shortcut that can skip aggregate coverage validation.
It is a safety repair for the implemented final-gate optimization and preserves every existing full/no-cache, aggregate, hook, CI, and standalone verification contract.

Requirements:

- `tools/ci-final-gate --gap-only` must validate `docs/workflow/FINAL_GATE_COVERAGE.tsv` before it runs any `docs/workflow/FINAL_GATE_GAP_COMMANDS.tsv` command.
- Gap-only mode must fail closed when an aggregate requirement is uncovered, stale, malformed, mapped to the final-gate hook itself, mapped to a missing hook, or mapped to a missing gap command.
- Gap-only mode must remain standalone-callable for regression testing and callable from optimized full-hook or CI final-gate paths.
- The default final-gate path must keep validating coverage before checking same-run Git hook evidence or falling back to the exhaustive aggregate command.
- The exhaustive `tools/test_lesson_repository.sh`, full/no-cache hook behavior, required CI workflow names, same-run evidence identity checks, and fallback aggregate behavior must remain available.
- No existing feature tradeoff is allowed. If this safety check conflicts with an existing valid behavior, the implementation must repair the safety check instead of weakening coverage, hiding a failure, or removing the existing behavior.

Non-scope:

- Do not change required CI check names, branch-protection contexts, full/no-cache meaning, final-gap command semantics, same-run evidence metadata, Dashboard behavior, Playwright coverage, or product repository behavior in this sync ID.
- Do not make changed-only CI authoritative or introduce persistent verification-result caching.
## Implemented Product Authority Evidence Detail Contract Requirements

SYNC-ID: product_authority_evidence_detail_contract
STATUS: implemented
ARTIFACTS: docs/workflow/AS_BUILT_SYNC_CONTRACT.tsv,docs/workflow/DASHBOARD_DATA_SCHEMA.tsv,tools/lib/product_repository_authority.sh,tools/product-repository-authority,dashboard-control-center/src/dashboardData.js,tests/fixtures/dashboard-control-center.json,tests/fixtures/dashboard-control-center-live-update.json,tools/test_product_repository_authority.sh,tools/test_dashboard_schema.sh,tools/test_dashboard_data.sh,docs/as-built/REQUIREMENTS.md,docs/as-built/SPECIFICATION.md,docs/as-built/IMPLEMENTATION_PLAN.md,docs/workflow/TASK_TRACKER.md,docs/workflow/HANDOFF.md,docs/memory/SESSION_MEMORY.md
TESTS: tools/test_product_repository_authority.sh,tools/test_dashboard_schema.sh,tools/test_dashboard_data.sh,tools/check_as_built_sync_contract.sh,tools/check_as_built_docs.sh,tools/check_workflow_pair_sync.sh

Dashboard product authority evidence items must expose producer-owned detail fields instead of requiring the UI to infer operational judgment from `status` alone.
Each evidence item must include context, requirement status, observation time, max age, sanitized product root, product head, source artifacts, blockers, next command, detail code, current item id, optional detail manifest/artifact references, summary, reason, next action, and risk level.

The contract must remain additive.
It must not change product evidence collection behavior, external repository mutation, browser-side command execution, existing Dashboard routes, existing status vocabulary, or existing product-operation blocker semantics.

## Implemented Dashboard Browser Debug Manifest Boundary Requirements

SYNC-ID: dashboard_browser_debug_manifest
STATUS: implemented
ARTIFACTS: docs/workflow/AS_BUILT_SYNC_CONTRACT.tsv,docs/workflow/TEST_PLAN_MANIFEST.tsv,docs/workflow/GIT_HOOK_CHECKS.tsv,docs/workflow/GIT_HOOK_PARALLEL_GROUPS.tsv,docs/workflow/FINAL_GATE_COVERAGE.tsv,tools/dashboard-browser-debug-manifest,tools/test_dashboard_browser_debug_manifest.sh,tools/test_lesson_repository.sh,docs/as-built/REQUIREMENTS.md,docs/as-built/SPECIFICATION.md,docs/as-built/IMPLEMENTATION_PLAN.md,docs/workflow/TASK_TRACKER.md,docs/workflow/HANDOFF.md
TESTS: tools/test_dashboard_browser_debug_manifest.sh,tools/check_test_plan_coverage.sh,tools/test_test_plan.sh,tools/test_git_hooks.sh,tools/test_git_hooks_parallel.sh,tools/test_ci_final_gate.sh,tools/check_as_built_sync_contract.sh,tools/check_as_built_docs.sh,tools/check_workflow_pair_sync.sh

Dashboard Control Center Browser Debug review must keep lesson-specific workflow, Git, CI, blocker, repository-selection, evidence-freshness, and next-safe-action meaning in this repository rather than in Browser Debug CLI runtime code.

The manifest generator must project `tools/dashboard-data` into bounded inline `sourceData` for Browser Debug CLI target review.
It must not add arbitrary external loaders to Browser Debug CLI, expose secrets or raw warnings, execute browser-side commands, mutate product repositories, or require Vite/Playwright startup to validate the manifest contract.

## Implemented Dashboard Browser Debug Agent Handoff Requirements

SYNC-ID: dashboard_browser_debug_agent_handoff
STATUS: implemented
ARTIFACTS: docs/workflow/AS_BUILT_SYNC_CONTRACT.tsv,docs/workflow/DASHBOARD_DATA_SCHEMA.tsv,tools/dashboard-data,dashboard-control-center/src/dashboardData.js,dashboard-control-center/src/App.jsx,dashboard-control-center/src/i18n.js,tests/playwright/dashboard-control-center.spec.js,tools/test_dashboard_schema.sh,tools/test_dashboard_data.sh,docs/as-built/REQUIREMENTS.md,docs/as-built/SPECIFICATION.md,docs/as-built/IMPLEMENTATION_PLAN.md,docs/workflow/TASK_TRACKER.md,docs/workflow/HANDOFF.md
TESTS: tools/test_dashboard_schema.sh,tools/test_dashboard_data.sh,tools/test_dashboard_i18n.sh,tools/test_dashboard_control_center.sh,tools/check_as_built_sync_contract.sh,tools/check_as_built_docs.sh,tools/check_workflow_pair_sync.sh,tools/check_repository_development_workflow.sh,tools/test_repository_development_workflow.sh

Dashboard Control Center must show whether its Browser Debug CLI review handoff has local evidence for target manifest generation, review artifacts, agent package creation, agent result ingest, and advisory report creation.

Requirements:

- The handoff state must be produced by `tools/dashboard-data` as structured `browser_debug` JSON, not inferred from React copy or screenshots.
- The Dashboard must keep this panel read-only and must not launch Browser Debug CLI, call provider APIs, upload artifacts, store credentials, or mutate any product repository.
- The state must support both subscription-agent and API-agent workflows by showing local evidence packet and ingest/report stages without depending on a single provider.
- The handoff evidence must remain additive; it must not change Git, CI, product authority, release readiness, existing maintenance status, Browser Debug findings, or existing dashboard routes.
- The implementation must keep lesson-specific Dashboard Control Center semantics in this repository and leave Browser Debug CLI generic.

## Dashboard Control Center Operational Decision Evidence Requirements

SYNC-ID: dashboard_control_center_operational_decision_evidence
STATUS: implemented
ARTIFACTS: docs/workflow/AS_BUILT_SYNC_CONTRACT.tsv,docs/workflow/DASHBOARD_DATA_SCHEMA.tsv,tools/lib/dashboard_data.sh,tools/dashboard-data,dashboard-control-center/src/dashboardData.js,dashboard-control-center/src/App.jsx,tools/test_dashboard_schema.sh,tools/test_dashboard_data.sh,tools/test_dashboard_control_center.sh,docs/as-built/REQUIREMENTS.md,docs/as-built/SPECIFICATION.md,docs/as-built/IMPLEMENTATION_PLAN.md,docs/workflow/TASK_TRACKER.md,docs/workflow/HANDOFF.md
TESTS: tools/test_dashboard_schema.sh,tools/test_dashboard_data.sh,tools/test_dashboard_control_center.sh,tools/check_as_built_sync_contract.sh,tools/check_as_built_docs.sh,tools/check_workflow_pair_sync.sh,tools/check_repository_development_workflow.sh,tools/test_repository_development_workflow.sh

Dashboard Control Center publishes an operational decision layer that answers the user's immediate development question without requiring them to interpret raw CLI output.
`tools/dashboard-data` produces the current decision, reason, evidence confidence, blocker, and next safe action; React renders those facts and does not invent operational truth from labels or copy.

Requirements:

- Publish producer-owned `operational_decision` data for the selected context and repository, including status, primary blocker source, why it matters, next safe action, done condition, approval boundary, and audience briefs for non-engineers and junior engineers.
- Publish typed Git, worktree, repository change, workflow phase, runner-record freshness, and CI/test evidence as structured data with source IDs, authority, freshness, and safe display text.
- Separate authoritative stored evidence from advisory live lookup so the UI never presents policy readiness, stale records, or network availability as proof of completion.
- Give every primary Control Center page the same decision contract: scope, current judgment, top reason, evidence confidence, next safe action, and technical drilldown.
- Keep command previews display-only and keep push, PR creation, merge, main CI waiting, cleanup, external product writes, OAuth, credentials, and browser-side command execution outside this sync.
- Preserve STEP 1-7, STEP 1-14, existing CI, existing checks, existing document routes, existing Dashboard routes, and all product authority semantics.

Non-scope:

- Do not run or wait for GitHub Actions from ordinary Dashboard data generation.
- Do not add browser-triggered repository mutation, product evidence collection, approval writes, cleanup, push, PR creation, merge, or main-sync execution.
- Do not encode FrameCue, Browser Debug CLI, task-tracker, or any single product repository as a permanent implementation requirement.

## Implemented Product Authority Evidence Source Completion Requirements

SYNC-ID: product_authority_evidence_source_completion
STATUS: implemented
ARTIFACTS: docs/workflow/AS_BUILT_SYNC_CONTRACT.tsv,docs/workflow/DASHBOARD_DATA_SCHEMA.tsv,docs/workflow/PRODUCT_GATE_EVIDENCE_SCHEMA.tsv,tools/lib/product_repository_authority.sh,tools/product-repository-authority,tools/product-gate-evidence-bootstrap,tools/test_product_repository_authority.sh,tools/test_dashboard_schema.sh,tools/test_dashboard_data.sh,docs/as-built/REQUIREMENTS.md,docs/as-built/SPECIFICATION.md,docs/as-built/IMPLEMENTATION_PLAN.md,docs/workflow/TASK_TRACKER.md,docs/workflow/HANDOFF.md
TESTS: tools/test_product_repository_authority.sh,tools/test_dashboard_schema.sh,tools/test_dashboard_data.sh,tools/check_as_built_sync_contract.sh,tools/check_as_built_docs.sh,tools/check_workflow_pair_sync.sh,tools/check_repository_development_workflow.sh,tools/test_repository_development_workflow.sh

Product authority evidence must be complete enough for Dashboard decisions to cite source-owned facts instead of UI inference.
The product authority layer must publish source IDs, freshness, authority, product HEAD, detail artifact references, blockers, risk, and next safe action consistently for product documents, Git, tests, CI, Security, and repository structure evidence.
It must not grant Dashboard data generation new external network authority, product mutation authority, or browser-triggered evidence collection.

Non-scope:

- Do not change existing product operation semantics, scaffold rules, Git usage mode rules, evidence source vocabulary compatibility, or product-local AGENTS.MD boundaries.
- Do not treat stale, missing, advisory, or head-mismatched evidence as release proof.
- Do not store secret-like values, raw credentials, private messages, or unsafe absolute paths in fixtures, logs, browser data, or product authority output.

## Implemented Dashboard Control Center Decision Projection Requirements

SYNC-ID: dashboard_control_center_decision_projection
STATUS: implemented
ARTIFACTS: docs/workflow/AS_BUILT_SYNC_CONTRACT.tsv,docs/workflow/DASHBOARD_DATA_SCHEMA.tsv,tools/lib/dashboard_data.sh,tools/dashboard-data,dashboard-control-center/src/dashboardData.js,tests/fixtures/dashboard-control-center.json,tests/fixtures/dashboard-control-center-live-update.json,tools/test_dashboard_schema.sh,tools/test_dashboard_data.sh,docs/as-built/REQUIREMENTS.md,docs/as-built/SPECIFICATION.md,docs/as-built/IMPLEMENTATION_PLAN.md,docs/workflow/TASK_TRACKER.md,docs/workflow/HANDOFF.md
TESTS: tools/test_dashboard_schema.sh,tools/test_dashboard_data.sh,tools/check_as_built_sync_contract.sh,tools/check_as_built_docs.sh,tools/check_workflow_pair_sync.sh,tools/check_repository_development_workflow.sh,tools/test_repository_development_workflow.sh

Dashboard data must project product authority, repository-development workflow, Git/worktree state, diff state, local test state, CI evidence, and blocker state into one producer-owned decision model.
The model must tell non-engineers what is happening now and tell junior/intermediate engineers which evidence supports the next development decision.
React may render this model but must not compute readiness from labels, route names, local UI state, or copied CLI wording.

Non-scope:

- Do not run GitHub Actions, poll GitHub, mutate repositories, write approvals, or collect product evidence from ordinary Dashboard data generation.
- Do not remove existing Dashboard schema compatibility for older snapshots.
- Do not hard-code FrameCue, Browser Debug CLI, task-tracker, branch names, or product stacks as permanent behavior.

## Implemented Dashboard Control Center Decision Page Rendering Requirements

SYNC-ID: dashboard_control_center_decision_page_rendering
STATUS: implemented
ARTIFACTS: docs/workflow/AS_BUILT_SYNC_CONTRACT.tsv,docs/workflow/DASHBOARD_DATA_SCHEMA.tsv,dashboard-control-center/src/App.jsx,dashboard-control-center/src/DecisionSummary.jsx,dashboard-control-center/src/dashboardData.js,dashboard-control-center/src/i18n.js,tests/fixtures/dashboard-control-center.json,tests/fixtures/dashboard-control-center-live-update.json,tests/playwright/dashboard-control-center.spec.js,tools/test_dashboard_schema.sh,tools/test_dashboard_data.sh,tools/test_dashboard_i18n.sh,tools/test_dashboard_control_center.sh,docs/as-built/REQUIREMENTS.md,docs/as-built/SPECIFICATION.md,docs/as-built/IMPLEMENTATION_PLAN.md,docs/workflow/TASK_TRACKER.md,docs/workflow/HANDOFF.md
TESTS: tools/test_dashboard_schema.sh,tools/test_dashboard_data.sh,tools/test_dashboard_i18n.sh,tools/test_dashboard_control_center.sh,tools/check_as_built_sync_contract.sh,tools/check_as_built_docs.sh,tools/check_workflow_pair_sync.sh,tools/check_repository_development_workflow.sh,tools/test_repository_development_workflow.sh

Every primary Control Center page must render the producer-owned decision model in a way that answers: current judgment, top blocker or reason, supporting evidence, next safe action, and technical drilldown target.
The overview must serve non-engineers, while detail pages must preserve enough evidence identity and context for junior/intermediate engineers to decide whether implementation, repair, test, Git sync, CI, or approval work is next.
Command previews must remain display/copy references only.

Non-scope:

- Do not add browser command execution, repository writes, Git operations, CI waiting, approval mutation, cleanup, provider API calls, or credential handling.
- Do not make React the authority for readiness, freshness, risk, or blocker semantics.
- Do not trade off existing Dashboard routes, i18n, Settings behavior, Browser Debug handoff, repository selection, or existing Playwright coverage.

## Implemented Dashboard Control Center Density And Mobile CSS Refinement Requirements

SYNC-ID: dashboard_control_center_density_mobile_css_refinement
STATUS: implemented
ARTIFACTS: docs/workflow/AS_BUILT_SYNC_CONTRACT.tsv,docs/design-system/dashboard-control-center/DESIGN_SYSTEM.md,docs/design-system/dashboard-control-center/tokens.json,docs/design-system/dashboard-control-center/components.json,dashboard-control-center/src/design-system.generated.css,dashboard-control-center/src/design-system.generated.js,dashboard-control-center/src/App.jsx,dashboard-control-center/src/styles.css,tests/playwright/dashboard-control-center.spec.js,tools/check_dashboard_design_system.sh,tools/test_dashboard_control_center.sh,docs/as-built/REQUIREMENTS.md,docs/as-built/SPECIFICATION.md,docs/as-built/IMPLEMENTATION_PLAN.md,docs/workflow/TASK_TRACKER.md,docs/workflow/HANDOFF.md
TESTS: tools/check_dashboard_design_system.sh,tools/test_dashboard_control_center.sh,tools/check_as_built_sync_contract.sh,tools/check_as_built_docs.sh,tools/check_workflow_pair_sync.sh,tools/check_repository_development_workflow.sh,tools/test_repository_development_workflow.sh

Decision-heavy Dashboard pages must remain scannable on desktop and mobile without overlapping text, clipped controls, nested-card clutter, or one-off CSS exceptions.
Shared visual behavior must be changed through the Dashboard design-system source and generated runtime path; handwritten CSS may cover only page-specific layout glue that respects the source tokens and components.

Non-scope:

- Do not directly edit generated design-system CSS/JS as source.
- Do not introduce a new visual theme, new dependency, marketing-style landing page, or page-specific styling that bypasses the design-system contract.
- Do not reduce existing page density, route coverage, accessibility, i18n, or mobile behavior to make the new decision surfaces fit.

## Implemented Dashboard Control Center Package And CI Verification Wiring Requirements

SYNC-ID: dashboard_control_center_package_ci_verification_wiring
STATUS: implemented
ARTIFACTS: docs/workflow/AS_BUILT_SYNC_CONTRACT.tsv,docs/workflow/TEST_PLAN_MANIFEST.tsv,docs/workflow/GIT_HOOK_CHECKS.tsv,docs/workflow/GIT_HOOK_PARALLEL_GROUPS.tsv,docs/workflow/FINAL_GATE_COVERAGE.tsv,package.json,package-lock.json,.github/workflows/ci.yml,.github/workflows/lesson14-ci.yml,tools/check_ci_workflow_structure.sh,tools/check_test_plan_coverage.sh,tools/test_dashboard_control_center.sh,tools/test_lesson_repository.sh,docs/as-built/REQUIREMENTS.md,docs/as-built/SPECIFICATION.md,docs/as-built/IMPLEMENTATION_PLAN.md,docs/workflow/TASK_TRACKER.md,docs/workflow/HANDOFF.md
TESTS: tools/check_ci_workflow_structure.sh,tools/check_test_plan_coverage.sh,tools/test_test_plan.sh,tools/test_git_hooks.sh,tools/test_git_hooks_parallel.sh,tools/test_ci_final_gate.sh,tools/test_dashboard_control_center.sh,tools/check_as_built_sync_contract.sh,tools/check_as_built_docs.sh,tools/check_workflow_pair_sync.sh,tools/check_repository_development_workflow.sh,tools/test_repository_development_workflow.sh

Package scripts and CI workflow wiring must change only if the decision projection or page rendering work creates a real verification gap that existing standalone and aggregate checks cannot cover.
If needed, the wiring must keep Dashboard checks standalone-callable, aggregate-callable, hook-callable, and CI-callable without weakening final gates, required CI names, Lesson14 compatibility, or release proof boundaries.

Non-scope:

- Do not add dependencies, change package scripts, or edit CI workflows unless an implemented owner-layer change requires it.
- Do not make changed-only, cached, runner-record, or advisory evidence authoritative release proof.
- Do not rename required CI checks, remove existing tests, reduce full/no-cache coverage, or introduce one-off CI behavior for a single product repository.

## Implemented Dashboard Control Center Component Module Extraction Requirements

SYNC-ID: dashboard_control_center_component_module_extraction
STATUS: implemented
ARTIFACTS: docs/workflow/AS_BUILT_SYNC_CONTRACT.tsv,dashboard-control-center/src/App.jsx,dashboard-control-center/src/dashboardContext.js,dashboard-control-center/src/DecisionSummary.jsx,dashboard-control-center/src/dashboardData.js,dashboard-control-center/src/i18n.js,dashboard-control-center/src/styles.css,tests/playwright/dashboard-control-center.spec.js,tools/test_dashboard_i18n.sh,tools/test_dashboard_control_center.sh,docs/as-built/REQUIREMENTS.md,docs/as-built/SPECIFICATION.md,docs/as-built/IMPLEMENTATION_PLAN.md,docs/workflow/TASK_TRACKER.md,docs/workflow/HANDOFF.md
TESTS: tools/test_dashboard_i18n.sh,tools/test_dashboard_control_center.sh,tools/check_as_built_sync_contract.sh,tools/check_as_built_docs.sh,tools/check_workflow_pair_sync.sh,tools/check_repository_development_workflow.sh,tools/test_repository_development_workflow.sh

App.jsx may be split into reusable Dashboard page and evidence components only after the decision rendering behavior is stable enough that extraction is behavior-preserving.
The extraction must reduce future maintenance cost without changing routes, text meaning, readiness decisions, data validation, styling authority, or test expectations.
Current extraction also separates menu/context resolution into `dashboard-control-center/src/dashboardContext.js`, keeping active menu selection, selectable-state rules, selected-context projection, and partial-failure scoping outside the React page file without changing Dashboard authority.

Non-scope:

- Do not perform cosmetic churn, rename-only churn, route rewrites, dependency changes, or design-system bypasses under the extraction sync.
- Do not use module extraction to change product authority, Dashboard data production, Git/CI behavior, Settings authority, or Browser Debug handoff semantics.

## Dashboard Control Center Settings Control Policy Refinement Requirements

SYNC-ID: dashboard_control_center_settings_control_policy_refinement
STATUS: implemented
ARTIFACTS: docs/workflow/AS_BUILT_SYNC_CONTRACT.tsv,tools/dashboard-settings,vite.config.mjs,dashboard-control-center/src/dashboardData.js,dashboard-control-center/src/App.jsx,dashboard-control-center/src/i18n.js,tests/playwright/dashboard-control-center.spec.js,tools/test_dashboard_settings.sh,tools/test_dashboard_control_center.sh,tools/test_dashboard_i18n.sh,tools/check_dashboard_design_system.sh,tools/test_dashboard_design_studio_events.sh,docs/as-built/REQUIREMENTS.md,docs/as-built/SPECIFICATION.md,docs/as-built/IMPLEMENTATION_PLAN.md,docs/workflow/TASK_TRACKER.md,docs/workflow/HANDOFF.md
TESTS: tools/test_dashboard_settings.sh,tools/test_dashboard_control_center.sh,tools/test_dashboard_i18n.sh,tools/check_dashboard_design_system.sh,tools/test_dashboard_design_studio_events.sh,tools/check_as_built_sync_contract.sh,tools/check_as_built_docs.sh,tools/check_workflow_pair_sync.sh,tools/check_repository_development_workflow.sh,tools/test_repository_development_workflow.sh

Dashboard Control Center Settings must remain a narrowly guarded settings surface, not a general browser command executor.
Settings changes must be planned, token-bound, revalidated against the owner-layer current state, and applied only when the requested setting, menu context, target file, current value, and snapshot identity still match the approved plan.

Requirements:

- Settings plan success returns a one-time `plan_token`; blocked or invalid plans return no token.
- Settings apply requires the current token and fails closed for missing, replayed, stale, mismatched, or owner-layer-replanned changes.
- `tools/dashboard-settings` remains the owner layer for catalog, plan, apply, target-file, value, and current-state validation; React copy and middleware labels are not the security boundary.
- Git workflow settings must be clearly described as saved policy settings only. The browser must not execute commit, push, PR creation, CI waiting, merge, main sync, cleanup, OAuth, external service calls, or credential handling.
- Settings and Design Studio technical commands must be visible as technical details, not as the main non-engineer decision surface.
- UI labels must distinguish manual, auto, approval-required, allowed, disallowed, and not-applicable states without presenting approval-required work as automatic.
- Design Studio mutation scope remains limited to the Dashboard design-system source and generated runtime path; drift detection must not broaden the editable target set.

Non-scope:

- Do not add arbitrary command execution, a browser Git workflow runner, product repository writes, external product design writes, credential storage, OAuth, dependency changes, push, PR creation, merge, main CI waiting, local/remote sync, cleanup, or delete operations.
- Do not weaken existing same-origin, JSON-only, POST-only, body-size, unknown-field, execFile, or generated design-system boundaries.

## Dashboard Control Center Display Depth Settings Requirements

SYNC-ID: dashboard_control_center_display_depth_settings
STATUS: implemented
ARTIFACTS: docs/workflow/AS_BUILT_SYNC_CONTRACT.tsv,learning/DASHBOARD_DISPLAY_DEPTH.tsv,tools/lib/dashboard_display_depth.sh,tools/dashboard-settings,tools/dashboard-data,docs/workflow/DASHBOARD_DATA_SCHEMA.tsv,docs/workflow/TEST_PLAN_MANIFEST.tsv,vite.config.mjs,dashboard-control-center/src/dashboardData.js,dashboard-control-center/src/App.jsx,dashboard-control-center/src/i18n.js,tests/fixtures/dashboard-control-center.json,tests/fixtures/dashboard-control-center-live-update.json,tests/playwright/dashboard-control-center.spec.js,tools/test_dashboard_settings.sh,tools/test_dashboard_data.sh,tools/test_dashboard_i18n.sh,tools/test_dashboard_control_center.sh,docs/as-built/REQUIREMENTS.md,docs/as-built/SPECIFICATION.md,docs/as-built/IMPLEMENTATION_PLAN.md,docs/workflow/TASK_TRACKER.md,docs/workflow/HANDOFF.md
TESTS: tools/test_dashboard_settings.sh,tools/test_dashboard_schema.sh,tools/test_dashboard_data.sh,tools/test_dashboard_i18n.sh,tools/test_dashboard_control_center.sh,tools/check_dashboard_design_system.sh,tools/check_test_plan_coverage.sh,tools/check_as_built_sync_contract.sh,tools/check_as_built_docs.sh,tools/check_workflow_pair_sync.sh,tools/check_repository_development_workflow.sh,tools/test_repository_development_workflow.sh

Dashboard Control Center Settings must expose one dashboard-scoped display depth setting so non-engineers, AI beginners, and technical learners can choose guide, standard, or technical detail presentation without changing workflow authority.
The display depth must affect explanation density and disclosure defaults only; it must not hide blockers, approvals, security state, stale evidence, command preview access, Settings boundaries, Design Studio boundaries, or owner-layer protections.

Requirements:

- The setting accepts exactly `friendly`, `standard`, and `technical`; `standard` remains the current baseline.
- The setting is stored as dashboard state, not as a lesson progression mode or Design Studio density token.
- Settings mutation remains owner-layer planned, token-bound, stale-current guarded, and target-file validated.
- Technical mode makes source files, commands, evidence references, and technical keys easier to inspect.
- Guide mode reduces technical clutter by default while preserving all safety, approval, blocker, and evidence signals.
- All labels are localized through the dashboard i18n layer.

Non-scope:

- Do not change lesson step content, lesson settings semantics, Git workflow policy semantics, Design Studio source authority, dependency versions, or product repository authority.

Implemented verification:

- Dashboard Settings, schema, data, i18n, Control Center Playwright, design-system drift, and test-plan coverage checks passed before promotion.

## Dashboard Control Center Display Depth Phase 2 Requirements

SYNC-ID: dashboard_control_center_display_depth_phase_2
STATUS: implemented
ARTIFACTS: docs/workflow/AS_BUILT_SYNC_CONTRACT.tsv,tools/lib/dashboard_data.sh,tools/dashboard-data,dashboard-control-center/src/displayDepth.js,dashboard-control-center/src/App.jsx,dashboard-control-center/src/DecisionSummary.jsx,dashboard-control-center/src/dashboardData.js,dashboard-control-center/src/i18n.js,tests/fixtures/dashboard-control-center.json,tests/fixtures/dashboard-control-center-live-update.json,tests/playwright/dashboard-control-center.spec.js,tools/test_dashboard_schema.sh,tools/test_dashboard_data.sh,tools/test_dashboard_i18n.sh,tools/test_dashboard_control_center.sh,docs/as-built/REQUIREMENTS.md,docs/as-built/SPECIFICATION.md,docs/as-built/IMPLEMENTATION_PLAN.md,docs/workflow/TASK_TRACKER.md,docs/workflow/HANDOFF.md
TESTS: tools/test_dashboard_schema.sh,tools/test_dashboard_data.sh,tools/test_dashboard_i18n.sh,tools/test_dashboard_control_center.sh,tools/check_as_built_sync_contract.sh,tools/check_as_built_docs.sh,tools/check_workflow_pair_sync.sh,tools/check_repository_development_workflow.sh,tools/test_repository_development_workflow.sh

Dashboard Control Center display depth must become a reusable presentation policy across shared decision, source, evidence, command-preview, and Settings result surfaces.

Acceptance requirements:

- `standard` preserves the current Control Center baseline.
- `friendly` prioritizes what is happening, why it matters, and the next safe action while collapsing non-critical source ids, file paths, commands, and evidence references by default.
- `technical` opens or prioritizes existing producer-owned source, authority, freshness, detail target, command-preview, and evidence references.
- No mode may hide blockers, approval requirements, failed or stale evidence, command-preview access, security state, Settings boundaries, Design Studio boundaries, or read-only/display-only wording.
- The browser must not gain new command execution, Git/CI mutation, product repository write, dependency, credential, cleanup, or arbitrary Settings authority.

## Dashboard Control Center Operational Situation Board Requirements

SYNC-ID: dashboard_control_center_operational_situation_board
STATUS: implemented
ARTIFACTS: docs/workflow/AS_BUILT_SYNC_CONTRACT.tsv,dashboard-control-center/src/App.jsx,dashboard-control-center/src/i18n.js,dashboard-control-center/src/styles.css,tests/playwright/dashboard-control-center.spec.js,tools/test_dashboard_i18n.sh,tools/test_dashboard_control_center.sh,tools/check_dashboard_design_system.sh,docs/as-built/REQUIREMENTS.md,docs/as-built/SPECIFICATION.md,docs/as-built/IMPLEMENTATION_PLAN.md,docs/workflow/TASK_TRACKER.md,docs/workflow/HANDOFF.md
TESTS: tools/test_dashboard_i18n.sh,tools/test_dashboard_control_center.sh,tools/check_dashboard_design_system.sh,tools/check_as_built_sync_contract.sh,tools/check_as_built_docs.sh,tools/check_workflow_pair_sync.sh,tools/check_repository_development_workflow.sh,tools/test_repository_development_workflow.sh

The Dashboard overview must include an operational situation board that makes the current workflow understandable before users inspect detailed pages.
It must summarize the selected menu and repository, current blockers, Git/worktree state, local test and CI state, and the next safe check using existing producer-owned snapshot and live-status fields.

Acceptance requirements:

- Non-engineers can read one board to understand what is happening now, whether anything is blocked, and where to look next.
- Junior and intermediate engineers can see branch, dirty/untracked counts, ahead/behind counts, test/CI status, source evidence, and command-preview references without opening the CLI first.
- The board must not compute new authority from labels, routes, colors, or local UI state; it may only summarize existing snapshot or live-status fields.
- Missing, unknown, stale, not-run, manual-required, approval-required, and not-applicable states must remain distinct.
- Display depth may reduce secondary technical detail, but it must not hide blockers, approvals, failed or stale evidence, security state, or read-only/display-only boundaries.
- The browser must not gain command execution, Git/CI mutation, repository writes, approval writes, cleanup, dependency changes, credential handling, or external service calls.

## Dashboard Control Center Operational Detail Decisions Requirements

SYNC-ID: dashboard_control_center_operational_detail_decisions
STATUS: implemented
ARTIFACTS: docs/workflow/AS_BUILT_SYNC_CONTRACT.tsv,dashboard-control-center/src/App.jsx,dashboard-control-center/src/i18n.js,dashboard-control-center/src/styles.css,tests/playwright/dashboard-control-center.spec.js,tools/test_dashboard_i18n.sh,tools/test_dashboard_control_center.sh,tools/check_dashboard_design_system.sh,docs/as-built/REQUIREMENTS.md,docs/as-built/SPECIFICATION.md,docs/as-built/IMPLEMENTATION_PLAN.md,docs/workflow/TASK_TRACKER.md,docs/workflow/HANDOFF.md
TESTS: tools/test_dashboard_i18n.sh,tools/test_dashboard_control_center.sh,tools/check_dashboard_design_system.sh,tools/check_as_built_sync_contract.sh,tools/check_as_built_docs.sh,tools/check_workflow_pair_sync.sh,tools/check_repository_development_workflow.sh,tools/test_repository_development_workflow.sh

Workflow, Maintenance Sync, Safety, and Repository Info detail pages must show a shared operational decision panel that turns existing snapshot and live-status evidence into page-level development judgment material.
The panel must help non-engineers understand what is happening now and help junior/intermediate engineers inspect Git/worktree state, tests/CI evidence, blockers, and the next safe check without leaving the Control Center.

Acceptance requirements:

- The panel appears on the major operational detail pages, not only on the overview.
- The same read-only summarization rules used by the overview situation board are reused for Git/worktree, tests/CI, blockers, and next-safe-action facts.
- Detail pages include a compact evidence queue with status, observed time, source, and command-preview references where available.
- Display depth may collapse secondary source ids in friendly mode, but it must preserve blocker, approval, failed/stale evidence, security, command-preview, and read-only/display-only signals.
- Missing live-status evidence must degrade to existing snapshot context rather than inventing a pass state.
- The browser must not gain command execution, Git/CI mutation, repository writes, approval writes, cleanup, dependency changes, credential handling, external service calls, or any expanded Settings/Design Studio authority.

## Dashboard Control Center Bundle Contract Requirements

SYNC-ID: dashboard_control_center_bundle_contract
STATUS: implemented
ARTIFACTS: docs/workflow/AS_BUILT_SYNC_CONTRACT.tsv,package.json,vite.config.mjs,dashboard-control-center/src/dashboardData.js,dashboard-control-center/src/i18n.js,dashboard-control-center/src/localePolicy.js,tools/check_dashboard_bundle_contract.mjs,tools/check_dashboard_bundle_contract.sh,docs/workflow/TEST_PLAN_MANIFEST.tsv,docs/workflow/GIT_HOOK_CHECKS.tsv,docs/workflow/GIT_HOOK_PARALLEL_GROUPS.tsv,docs/workflow/FINAL_GATE_COVERAGE.tsv,.github/workflows/ci.yml,.github/workflows/lesson14-ci.yml,tools/test_lesson_repository.sh,tools/check_ci_workflow_structure.sh,docs/as-built/REQUIREMENTS.md,docs/as-built/SPECIFICATION.md,docs/as-built/IMPLEMENTATION_PLAN.md,docs/workflow/TASK_TRACKER.md,docs/workflow/HANDOFF.md
TESTS: tools/check_dashboard_bundle_contract.sh,tools/test_dashboard_i18n.sh,tools/test_dashboard_control_center.sh,tools/check_test_plan_coverage.sh,tools/test_test_plan.sh,tools/test_git_hooks.sh,tools/test_git_hooks_parallel.sh,tools/test_ci_final_gate.sh,tools/check_ci_workflow_structure.sh,tools/check_as_built_sync_contract.sh,tools/check_as_built_docs.sh,tools/check_workflow_pair_sync.sh,tools/check_repository_development_workflow.sh,tools/test_repository_development_workflow.sh

Dashboard Control Center must have a reusable production-build contract that fails when Vite emits a large chunk warning or when runtime JS chunks exceed the default-scale budget.
The check must prevent hiding warnings by raising `chunkSizeWarningLimit` and must remain callable from package scripts, Git hooks, CI policy jobs, final-gate coverage, and aggregate repository verification.

Acceptance requirements:

- `npm run dashboard:build-check` runs a fresh production build and inspects the emitted assets.
- The build must not print Vite large-chunk warnings.
- Each emitted JavaScript chunk must stay within the default-scale 500 KB budget.
- The entry shell must stay within a stricter 300 KB budget.
- React, icons, dashboard data runtime, i18n, and generated design-system runtime must remain separated into deterministic named chunks.
- Dashboard locale metadata used by validation must remain separate from the full translation dictionary so the i18n chunk can be isolated.
- `chunkSizeWarningLimit` must not be raised above the default-scale value to hide the warning.
- The check must be wired into standalone verification, test-plan policy, Git hooks, final-gate coverage, CI structure checks, and aggregate repository verification.

## Implemented Product AGENTS Lesson Gate Alignment Requirements

SYNC-ID: product_agents_lesson_gate_alignment
STATUS: implemented
ARTIFACTS: docs/workflow/AS_BUILT_SYNC_CONTRACT.tsv,lesson/SYNC_GATES_14_DAYS.tsv,lesson/LESSON_FLOW_14_DAYS.tsv,lesson/LESSON_FLOW.tsv,tools/check_lesson14_sync.sh,tools/test_lesson14.sh,docs/as-built/REQUIREMENTS.md,docs/as-built/SPECIFICATION.md,docs/as-built/IMPLEMENTATION_PLAN.md,docs/workflow/TASK_TRACKER.md,docs/workflow/HANDOFF.md
TESTS: tools/check_lesson14_sync.sh,tools/test_lesson14.sh,tools/test_product_scaffold_check.sh,tools/check_agents_skills.sh,tools/check_as_built_sync_contract.sh,tools/check_as_built_docs.sh,tools/check_workflow_pair_sync.sh,tools/check_repository_development_workflow.sh,tools/test_repository_development_workflow.sh

Lesson flows and synchronization gates must teach the current product repository agent entry standard.
The product repository standard is `AGENTS.MD`; legacy product-side `AGENT.md` may be mentioned only as a deprecated migration target.
STEP 1-7 and STEP 1-14 guidance must not require or normalize new `AGENT.md` files.

Acceptance requirements:

- STEP 1-14 sync gates require `AGENTS.MD` where product agent rules are required.
- STEP 1-7 and STEP 1-14 lesson prose points learners to `AGENTS.MD` and explains legacy `AGENT.md` only as a migration/deprecation concern.
- Lesson14 sync checks fail when required product-document lists reintroduce legacy `AGENT.md`.
- Existing product scaffold checks remain the product-side authority for rejecting legacy root `AGENT.md`.

Non-scope:

- Do not write to an external product repository, delete a product-side legacy file, or change AGENTS.MD invariants.
- Do not change lesson progression, Git/CI authority, Dashboard UI, or product scaffold semantics beyond the lesson/gate alignment.

## Implemented Dashboard Control Center Evidence Presentation Clarity Requirements

SYNC-ID: dashboard_control_center_evidence_presentation_clarity
STATUS: implemented
ARTIFACTS: docs/workflow/AS_BUILT_SYNC_CONTRACT.tsv,dashboard-control-center/src/displayDepth.js,dashboard-control-center/src/App.jsx,dashboard-control-center/src/DecisionSummary.jsx,dashboard-control-center/src/i18n.js,tests/playwright/dashboard-control-center.spec.js,tools/test_dashboard_i18n.sh,tools/test_dashboard_control_center.sh,docs/as-built/REQUIREMENTS.md,docs/as-built/SPECIFICATION.md,docs/as-built/IMPLEMENTATION_PLAN.md,docs/workflow/TASK_TRACKER.md,docs/workflow/HANDOFF.md
TESTS: tools/test_dashboard_i18n.sh,tools/test_dashboard_control_center.sh,tools/check_dashboard_design_system.sh,tools/check_as_built_sync_contract.sh,tools/check_as_built_docs.sh,tools/check_workflow_pair_sync.sh,tools/check_repository_development_workflow.sh,tools/test_repository_development_workflow.sh

Dashboard display depth and operational freshness labels must help both non-engineers and junior/intermediate engineers understand what they are seeing.
Friendly mode remains a guide-level mode, standard remains the current baseline, and technical mode prioritizes existing technical evidence.
Live-status absence or failure must not be labeled as a live update.

Acceptance requirements:

- Display-depth policy names and rendered behavior make clear that friendly keeps technical references available as folded detail, standard preserves the baseline, and technical opens or prioritizes technical evidence.
- Overview and detail operational panels distinguish live observation, saved snapshot fallback, and last validated snapshot wording.
- Live-status fetch failure may safely fall back to snapshot data, but the UI must not imply fresh live evidence when only snapshot data is displayed.
- No mode hides blockers, approvals, failed/stale evidence, command previews, read-only boundaries, Settings boundaries, or Design Studio boundaries.

Non-scope:

- Do not add new authority fields, execute commands, call GitHub, mutate repositories, change Settings authority, change Design Studio authority, add dependencies, or redesign the dashboard.

## Implemented Dashboard Control Center CI Evidence Guidance Requirements

SYNC-ID: dashboard_control_center_ci_evidence_guidance
STATUS: implemented
ARTIFACTS: docs/workflow/AS_BUILT_SYNC_CONTRACT.tsv,docs/workflow/PRODUCT_GATE_EVIDENCE_SCHEMA.tsv,tools/product-gate-evidence-bootstrap,tools/lib/dashboard_data.sh,tools/dashboard-data,dashboard-control-center/src/App.jsx,dashboard-control-center/src/i18n.js,tests/playwright/dashboard-control-center.spec.js,tools/test_product_gate_tools.sh,tools/test_dashboard_data.sh,tools/test_dashboard_i18n.sh,tools/test_dashboard_control_center.sh,docs/as-built/REQUIREMENTS.md,docs/as-built/SPECIFICATION.md,docs/as-built/IMPLEMENTATION_PLAN.md,docs/workflow/TASK_TRACKER.md,docs/workflow/HANDOFF.md
TESTS: tools/test_product_gate_tools.sh,tools/test_dashboard_data.sh,tools/test_dashboard_i18n.sh,tools/test_dashboard_control_center.sh,tools/check_as_built_sync_contract.sh,tools/check_as_built_docs.sh,tools/check_workflow_pair_sync.sh,tools/check_repository_development_workflow.sh,tools/test_repository_development_workflow.sh

The Control Center must explain CI evidence without becoming a CI runner.
Existing product-local `ci-runs` evidence collection remains an explicit agent-run command outside the browser.
The dashboard may show read-only command previews and missing/stale/manual-required reasons so users know what evidence to collect next.

Acceptance requirements:

- Product CI evidence keeps local manifest/provider readiness distinct from real PR/main run evidence.
- Missing, not-run, stale, failed, manual-required, and unavailable provider states are preserved instead of being collapsed to ready.
- Suggested CI collection commands are rendered as display-only command previews.
- The browser does not call `gh`, poll GitHub, run product-local commands, store credentials, push, merge, wait for CI, or write product repositories.

Non-scope:

- Do not add browser-triggered CI collection, background polling, OAuth, credential storage, new CI authority, or external product source mutation.

## Implemented Dashboard Design Studio Candidate Import Foundation Requirements

SYNC-ID: dashboard_design_studio_candidate_import_foundation
STATUS: implemented
ARTIFACTS: docs/workflow/AS_BUILT_SYNC_CONTRACT.tsv,tools/dashboard-design-system,tools/test_dashboard_design_studio_events.sh,docs/as-built/REQUIREMENTS.md,docs/as-built/SPECIFICATION.md,docs/as-built/IMPLEMENTATION_PLAN.md,docs/workflow/TASK_TRACKER.md,docs/workflow/HANDOFF.md
TESTS: tools/test_dashboard_design_studio_events.sh,tools/check_dashboard_design_system.sh,tools/check_as_built_sync_contract.sh,tools/check_as_built_docs.sh,tools/check_workflow_pair_sync.sh,tools/check_repository_development_workflow.sh,tools/test_repository_development_workflow.sh

Design Studio must be able to import local structured candidate and proposal metadata without trusting it as instructions or granting apply authority.
CandidateEnvelope and DesignChangeProposal import is an owner-tool boundary for local structured JSON only.

Acceptance requirements:

- `tools/dashboard-design-system` accepts valid local CandidateEnvelope and DesignChangeProposal JSON and stores append-only redacted metadata.
- Required fields and forbidden fields are validated against the orchestration contract.
- Secret-like payloads, raw credentials, shell commands, trusted-instruction fields, direct apply fields, apply tokens, CSS patches, script patches, and external product apply authority are rejected.
- Import does not generate plan tokens, apply tokens, approval receipts, provider dispatch, subscription-agent execution, imagegen calls, Git/CI operations, or product repository writes.

Non-scope:

- Do not implement provider API dispatch, imagegen execution, mock image mutation, automatic apply, external product source writes, browser mutation endpoints, dependency changes, or credential handling.

## Implemented Dashboard Design Studio Proposal Workflow Foundation Requirements

SYNC-ID: dashboard_design_studio_proposal_workflow_foundation
STATUS: implemented
ARTIFACTS: docs/workflow/AS_BUILT_SYNC_CONTRACT.tsv,docs/workflow/DASHBOARD_DATA_SCHEMA.tsv,docs/design-system/dashboard-control-center/orchestration.json,dashboard-control-center/src/design-system.generated.js,tools/dashboard-design-system,tools/dashboard-data,dashboard-control-center/src/App.jsx,dashboard-control-center/src/i18n.js,tests/playwright/dashboard-control-center.spec.js,tools/test_dashboard_design_studio_events.sh,tools/test_dashboard_data.sh,tools/test_dashboard_i18n.sh,tools/test_dashboard_control_center.sh,docs/as-built/REQUIREMENTS.md,docs/as-built/SPECIFICATION.md,docs/as-built/IMPLEMENTATION_PLAN.md,docs/workflow/TASK_TRACKER.md,docs/workflow/HANDOFF.md
TESTS: tools/test_dashboard_design_studio_events.sh,tools/check_dashboard_design_system.sh,tools/test_dashboard_data.sh,tools/test_dashboard_i18n.sh,tools/test_dashboard_control_center.sh,tools/check_as_built_sync_contract.sh,tools/check_as_built_docs.sh,tools/check_workflow_pair_sync.sh,tools/check_repository_development_workflow.sh,tools/test_repository_development_workflow.sh

Design Studio turns imported candidates and proposals into visible, reviewable proposal state before any broader provider, image, external-product, or apply work is considered.
The workflow remains proposal-only and helps non-engineers understand what was imported while giving junior/intermediate engineers enough structured detail to judge risk, required decisions, affected files, and checks.

Acceptance requirements:

- Imported CandidateEnvelope and DesignChangeProposal records are visible in Dashboard data and the Control Center Design Studio page without exposing raw payloads or secrets.
- DesignChangeProposal imports produce a read-only preview/decision gate that summarizes operation count, affected source and generated files, risk, confidence, manual decision points, rollback outline, and check plan.
- Subscription-agent handoff is available as redacted local metadata only; no background agent dispatch, provider API call, command execution, or credential handling occurs.
- Mock/image/imagegen-related input remains CandidateEnvelope data and can be reviewed as untrusted candidates; imagegen execution and mock image mutation are not implemented.
- External-product proposals can be exported as plan-only metadata and do not write product files or claim product-local apply authority.
- API-key provider policy is represented as blocked, secret-reference-only, consent/cost/rate-limit required metadata; API calls remain unavailable.
- Owner-tool apply transaction design is represented as a dry-run, proposal-only transaction preview; no plan token, apply token, approval receipt, or direct apply authority is created.

Non-scope:

- Do not implement provider API dispatch, subscription-agent execution, imagegen execution, image editing, OCR trust, automatic apply, browser mutation endpoints, external product writes, dependency changes, Git/CI execution, push, merge, main sync, or credentials.

## Implemented Dashboard Design Studio History Detail Requirements

SYNC-ID: dashboard_design_studio_history_detail
STATUS: implemented
ARTIFACTS: docs/workflow/AS_BUILT_SYNC_CONTRACT.tsv,docs/workflow/DASHBOARD_DATA_SCHEMA.tsv,tools/dashboard-design-system,tools/dashboard-data,dashboard-control-center/src/dashboardData.js,dashboard-control-center/src/App.jsx,dashboard-control-center/src/i18n.js,tests/playwright/dashboard-control-center.spec.js,tools/test_dashboard_design_studio_events.sh,tools/test_dashboard_data.sh,tools/test_dashboard_i18n.sh,tools/test_dashboard_control_center.sh,docs/as-built/REQUIREMENTS.md,docs/as-built/SPECIFICATION.md,docs/as-built/IMPLEMENTATION_PLAN.md,docs/workflow/TASK_TRACKER.md,docs/workflow/HANDOFF.md
TESTS: tools/test_dashboard_design_studio_events.sh,tools/check_dashboard_design_system.sh,tools/test_dashboard_data.sh,tools/test_dashboard_i18n.sh,tools/test_dashboard_control_center.sh,tools/check_as_built_sync_contract.sh,tools/check_as_built_docs.sh,tools/check_workflow_pair_sync.sh,tools/check_repository_development_workflow.sh,tools/test_repository_development_workflow.sh

The History page shows Design Studio event/import/proposal history as producer-owned, redacted, proposal-only dashboard data.
It helps non-engineers see what happened and whether human review is needed while giving junior/intermediate engineers safe ids, schemas, affected files, checks, risk, and audit metadata for investigation.

Acceptance requirements:

- `tools/dashboard-design-system proposal-status` exposes bounded `history_rows[]` derived from existing event/import records without raw prompts, raw payloads, proposal operations, secrets, or executable browser commands.
- Dashboard data validation and schema define item-level history fields and preserve `proposal_only: true` with all execution/write capability flags false.
- The Control Center History page renders Design Studio history rows, empty state, manual-required status, source/check chips, and explicit no-apply/no-provider/no-imagegen/no-product-write boundaries.
- Existing Design Studio summary, Settings, Lessons, and History behavior remain compatible with legacy snapshots where `design_studio` is absent.

Non-scope:

- Do not add provider dispatch, subscription-agent background execution, imagegen, OCR trust, mock editing, automatic apply, approval mutation, external product writes, Git/CI execution, credentials, dependencies, push, merge, or browser command execution.

## Implemented Dashboard Design Studio Subscription-Agent Handoff Package Requirements

SYNC-ID: dashboard_design_studio_subscription_agent_handoff_package
STATUS: implemented
ARTIFACTS: docs/workflow/AS_BUILT_SYNC_CONTRACT.tsv,docs/workflow/DASHBOARD_DATA_SCHEMA.tsv,tools/dashboard-design-system,tools/dashboard-data,dashboard-control-center/src/dashboardData.js,dashboard-control-center/src/App.jsx,dashboard-control-center/src/i18n.js,tests/playwright/dashboard-control-center.spec.js,tools/test_dashboard_design_studio_events.sh,tools/test_dashboard_data.sh,tools/test_dashboard_i18n.sh,tools/test_dashboard_control_center.sh,docs/as-built/REQUIREMENTS.md,docs/as-built/SPECIFICATION.md,docs/as-built/IMPLEMENTATION_PLAN.md,docs/workflow/TASK_TRACKER.md,docs/workflow/HANDOFF.md
TESTS: tools/test_dashboard_design_studio_events.sh,tools/check_dashboard_design_system.sh,tools/test_dashboard_data.sh,tools/test_dashboard_i18n.sh,tools/test_dashboard_control_center.sh,tools/check_as_built_sync_contract.sh,tools/check_as_built_docs.sh,tools/check_workflow_pair_sync.sh,tools/check_repository_development_workflow.sh,tools/test_repository_development_workflow.sh

Design Studio creates a local, redacted, display-only package for handing a subscription-agent event to an external CLI agent without running that agent.
The package makes return contracts clear and preserves proposal-only boundaries while the dashboard renders only safe package metadata.

Acceptance requirements:

- `tools/dashboard-design-system agent-package --event-id ... --output ...` writes only under `.dashboard-design-studio-events/agent-packages/` or the test event-store equivalent and records metadata without executing agents, providers, browsers, Git/CI, imagegen, or product writes.
- Package metadata includes package id/version, event/request ids, target, provider mode, response contracts, import commands, digest, expiry, and explicit false execution/write boundary flags.
- Package contents and dashboard projections exclude raw prompt text, raw payloads, proposal operations, secrets, credentials, plan tokens, apply tokens, approval receipts, absolute paths, and executable browser commands.
- `proposal-status` exposes subscription-agent handoff metadata only for subscription-agent events, not arbitrary manual events.
- Dashboard validation, tests, and UI show package readiness as read-only metadata.

Non-scope:

- Do not execute subscription agents, call provider APIs, upload packages, store credentials, create approval receipts, create plan/apply tokens, apply changes, mutate external products, run Git/CI, add dependencies, push, merge, or add browser command execution.

## Dashboard Design Studio Template Proposal Library Requirements

SYNC-ID: dashboard_design_studio_template_proposal_library
STATUS: implemented
ARTIFACTS: docs/workflow/AS_BUILT_SYNC_CONTRACT.tsv,docs/workflow/DASHBOARD_DATA_SCHEMA.tsv,docs/design-system/dashboard-control-center/DESIGN_SYSTEM.md,docs/design-system/dashboard-control-center/orchestration.json,docs/design-system/dashboard-control-center/templates.json,tools/dashboard-design-system,tools/dashboard-data,dashboard-control-center/src/dashboardData.js,dashboard-control-center/src/App.jsx,dashboard-control-center/src/i18n.js,tests/playwright/dashboard-control-center.spec.js,tools/test_dashboard_design_studio_events.sh,tools/test_dashboard_data.sh,tools/test_dashboard_schema.sh,tools/test_dashboard_i18n.sh,tools/test_dashboard_control_center.sh,docs/as-built/REQUIREMENTS.md,docs/as-built/SPECIFICATION.md,docs/as-built/IMPLEMENTATION_PLAN.md,docs/workflow/TASK_TRACKER.md,docs/workflow/HANDOFF.md
TESTS: tools/test_dashboard_design_studio_events.sh,tools/check_dashboard_design_system.sh,tools/test_dashboard_schema.sh,tools/test_dashboard_data.sh,tools/test_dashboard_i18n.sh,tools/test_dashboard_control_center.sh,tools/check_as_built_sync_contract.sh,tools/check_as_built_docs.sh,tools/check_workflow_pair_sync.sh,tools/check_repository_development_workflow.sh,tools/test_repository_development_workflow.sh

Design Studio must expose reusable design templates as proposal-only metadata that can be listed and previewed without treating template text as instructions.
Template previews must explain candidate operations and checks for manual review while preserving the existing DesignChangeProposal import boundary.

Acceptance requirements:

- Template definitions are stored as safe manifests with id, version, product type, supported targets, allowed outputs, forbidden operations, required checks, lifecycle state, and bounded compatibility notes.
- `tools/dashboard-design-system` can list templates and preview a TemplateProposal for a selected template/target without creating plan tokens, approval receipts, provider calls, imagegen, product writes, Git/CI operations, or browser execution.
- Dashboard data validates and renders template library status, counts, latest preview metadata, checks, and proposal-only boundaries as read-only information.
- Template definitions and previews reject dependency installs, network calls, credential requirements, auto-apply, Git/CI operations, scripts, raw payloads, secret-like data, absolute paths, and unsafe commands.
- Existing candidate/proposal import, subscription handoff, external product export, provider policy, and owner-tool transaction behavior remains compatible.

Non-scope:

- Do not implement template apply, automatic DesignChangeProposal conversion, dependency installation, network calls, provider execution, image generation, external product writes, Git/CI execution, approval mutation, plan/apply tokens, or browser command execution.

## Dashboard Control Center Agentic Control Tower P0-P10 Requirements

SYNC-ID: dashboard_control_center_agentic_control_tower_p0_p10
STATUS: implemented
ARTIFACTS: docs/workflow/AS_BUILT_SYNC_CONTRACT.tsv,tools/lib/control_center_core.mjs,tools/lib/control_center_evidence_store.mjs,tools/lib/control_center_mcp_stdio_adapter.mjs,tools/control-center,tools/control-center-mcp,tools/test_control_center_core.sh,tools/test_control_center_core.mjs,dashboard-control-center/src/App.jsx,dashboard-control-center/src/DecisionSummary.jsx,dashboard-control-center/src/dashboardContext.js,dashboard-control-center/src/dashboardData.js,dashboard-control-center/src/displayDepth.js,dashboard-control-center/src/i18n.js,dashboard-control-center/src/styles.css,tools/dashboard-data,docs/as-built/REQUIREMENTS.md,docs/as-built/SPECIFICATION.md,docs/as-built/IMPLEMENTATION_PLAN.md,docs/workflow/TASK_TRACKER.md,docs/workflow/HANDOFF.md
TESTS: tools/test_dashboard_schema.sh,tools/test_dashboard_data.sh,tools/test_dashboard_i18n.sh,tools/check_dashboard_bundle_contract.sh,tools/check_as_built_sync_contract.sh,tools/check_as_built_docs.sh,tools/check_workflow_pair_sync.sh,tools/check_repository_development_workflow.sh,tools/test_repository_development_workflow.sh,tools/test_dashboard_browser_debug_manifest.sh

The Control Center must behave as a real-time, menu-scoped control tower for lesson and product workflows.
It must help non-engineers understand what is happening now and help junior/intermediate engineers inspect source IDs, commands, Git/worktree, tests/CI, blockers, evidence freshness, and next safe action.

Acceptance requirements:

- P0: Detail pages must not render stale producer-owned data after a menu switch; evidence-backed pages require a snapshot whose producer menu matches the selected menu.
- P1: User-visible state labels and producer fallback text must be key/code driven so Japanese UI does not leak raw English strings for common dashboard decisions.
- P2: Display depth must expose an actual audience split: non-engineer view prioritizes plain decision language; junior/intermediate engineer view exposes Git/CI/worktree/source/command references.
- P3: The current work board must be driven by `operational_decision`, blocker, Git/worktree, tests/CI, and next-safe-action data instead of only menu labels.
- P4-P7: CLI and MCP must share a Control Center command core, capability profiles, dry-run/execute boundaries, and audit/evidence receipt storage.
- P6-P9: Manual, subscription-agent, API-key, image/mock artifact, external product export, and owner-tool paths must be visible as proposal-only or blocked pathways with no direct apply authority.
- P10: Browser Debug CLI integration must remain target-owned from this repository and must not modify Browser Debug CLI; final review artifacts stay under this repository.

Non-scope:

- Do not implement provider API dispatch, automatic apply, image generation, Browser Debug CLI source edits, credential storage, external product writes, dashboard-triggered Git/CI mutations, push, merge, cleanup, or any gate weakening.

## Dashboard Control Center Contextual Repair Requirements

SYNC-ID: dashboard_control_center_contextual_repair
STATUS: implemented
ARTIFACTS: docs/workflow/AS_BUILT_SYNC_CONTRACT.tsv,docs/workflow/DASHBOARD_DATA_SCHEMA.tsv,docs/design-system/dashboard-control-center/DESIGN_SYSTEM.md,docs/design-system/dashboard-control-center/tokens.json,docs/design-system/dashboard-control-center/components.json,tools/dashboard-design-system,tools/dashboard-data,vite.config.mjs,dashboard-control-center/src/App.jsx,dashboard-control-center/src/dashboardContext.js,dashboard-control-center/src/dashboardData.js,dashboard-control-center/src/displayDepth.js,dashboard-control-center/src/i18n.js,dashboard-control-center/src/styles.css,dashboard-control-center/src/design-system.generated.css,tests/playwright/dashboard-control-center.spec.js,tools/test_dashboard_schema.sh,docs/as-built/REQUIREMENTS.md,docs/as-built/SPECIFICATION.md,docs/as-built/IMPLEMENTATION_PLAN.md,docs/workflow/TASK_TRACKER.md,docs/workflow/HANDOFF.md
TESTS: tools/test_dashboard_schema.sh,tools/test_dashboard_data.sh,tools/test_dashboard_data_product_repository_selection.sh,tools/test_dashboard_i18n.sh,tools/test_dashboard_control_center.sh,tools/check_dashboard_design_system.sh,tools/check_as_built_sync_contract.sh,tools/check_as_built_docs.sh,tools/check_workflow_pair_sync.sh,tools/check_repository_development_workflow.sh,tools/test_repository_development_workflow.sh

The Control Center must recover from the observed regression where menu pages, repository selection, document briefs, live Git/test/CI status, and audience-specific summaries can show stale or wrong-context information.
It must be useful as a control tower without hard-coded product names, repository names, URLs, file paths, thresholds, or tool identities.

Acceptance requirements:

- Initial URL, stored menu selection, and menu switching must request a producer-owned snapshot for the selected menu before evidence-backed pages render.
- Detail pages must not reuse task-tracker, lesson, or another product repository evidence when a different menu or repository is selected.
- Free Development and other product workflows must expose all configured candidate repositories and keep the current selection keyed by stable repository id.
- Document briefs must be scoped by menu and repository role so task tracker, handoff, requirements, specification, and implementation plan summaries come from the selected context.
- The Overview must prioritize current work, blockers, Git/worktree, local tests, CI, and next safe action using live evidence and task/handoff context instead of generic readiness labels.
- Non-engineer and junior/intermediate engineer display modes must show different wording and detail density while sharing one underlying evidence model.
- Status codes such as `manual_required`, `not_collected`, `optional`, and `unknown` must be translated into useful meaning, cause, and next action before they reach user-facing cards.
- Dashboard menu icon color and card spacing changes must use the design system source of truth and generated runtime artifacts.
- CLI and MCP evidence fields must remain safe and near-equivalent for observation, proposal, and review handoff while preserving explicit blocked boundaries for provider dispatch, image generation, automatic apply, external product writes, and dashboard-triggered Git/CI mutations.
- Browser Debug CLI or TraceCue review is read-only from this repository; external review tool source files are not edited.

Non-scope:

- Do not implement provider API dispatch, automatic apply, image generation, external product writes, Browser Debug CLI or TraceCue source edits, credential storage, dependency changes, dashboard-triggered Git/CI mutation, push, merge, cleanup, or gate weakening.

## Implemented Dashboard Control Center Workflow Activity History Requirements

SYNC-ID: dashboard_control_center_workflow_activity_history
STATUS: implemented
ARTIFACTS: docs/workflow/AS_BUILT_SYNC_CONTRACT.tsv,docs/workflow/DASHBOARD_DATA_SCHEMA.tsv,docs/design-system/dashboard-control-center/DESIGN_SYSTEM.md,docs/design-system/dashboard-control-center/tokens.json,docs/design-system/dashboard-control-center/components.json,dashboard-control-center/src/design-system.generated.css,dashboard-control-center/src/design-system.generated.js,tools/dashboard-data,tools/lib/dashboard_data.sh,vite.config.mjs,dashboard-control-center/src/App.jsx,dashboard-control-center/src/dashboardData.js,dashboard-control-center/src/i18n.js,dashboard-control-center/src/i18nCatalog.js,dashboard-control-center/src/styles.css,tests/fixtures/dashboard-control-center.json,tests/fixtures/dashboard-control-center-live-update.json,tests/playwright/dashboard-control-center.spec.js,tools/test_dashboard_schema.sh,tools/test_dashboard_data.sh,tools/test_dashboard_i18n.sh,tools/test_dashboard_control_center.sh,docs/as-built/REQUIREMENTS.md,docs/as-built/SPECIFICATION.md,docs/as-built/IMPLEMENTATION_PLAN.md,docs/workflow/TASK_TRACKER.md,docs/workflow/HANDOFF.md
TESTS: tools/test_dashboard_schema.sh,tools/test_dashboard_data.sh,tools/test_dashboard_i18n.sh,tools/test_dashboard_control_center.sh,tools/check_dashboard_bundle_contract.sh,tools/check_dashboard_design_system.sh,tools/check_as_built_sync_contract.sh,tools/check_as_built_docs.sh,tools/check_workflow_pair_sync.sh,tools/check_repository_development_workflow.sh,tools/test_repository_development_workflow.sh

The Development Workflow page must help the user decide what changed recently, what was verified, what remains uncertain or blocked, and which action is safe next for the selected repository.
The browser must render producer-owned material activity and status meaning without inferring operational truth from command text, repository names, timestamps, or display labels.

Acceptance requirements:

- Publish bounded material update events for real commits, merges, tests, CI, Security, document synchronization, and product-gate evidence while excluding observation refreshes and unsafe raw logs.
- Keep event time, selected repository, source id, authority, freshness, repository head, safe command preview, and artifact reference traceable where applicable.
- Preserve `unknown`, `stale`, `not_run`, `manual_required`, and other incomplete-evidence states; evidence presence alone must not convert them to `ready`.
- Keep explicit blocker counts and blocker evidence visible without treating review-only freshness states as failures.
- Show one chronological material-update surface and a concise current-position summary with distinct Git, tests, CI, worklog, and blocker responsibilities.
- Collapse only genuinely adjacent duplicate test or CI display rows and apply display limits after grouping.
- Use structured purpose codes and localization keys instead of browser-side command-string inference or Japanese-versus-English branches.
- Support the repository standard language list without fixed product, repository, path, command, or language-specific runtime branches.
- Keep Dashboard visual changes synchronized through the Design System source-to-runtime path and preserve read-only command and external-operation boundaries.
- Add negative coverage for wrong repository, stale or unknown evidence shown as ready, lost blocker counts, unsafe event values, duplicate history, unsupported locale fallback, and removed legacy coverage without replacement.

Non-scope:

- Do not add provider dispatch, browser command execution, external product writes, dependency changes, generated activity, placeholder timestamps, automatic Git/CI execution, push, merge, cleanup, or gate weakening.
- Do not treat the product repository registry path and current selection alignment as part of this feature contract; verify and commit that configuration alignment as a separate change unit.

## Implemented Parent Repository Change-Aware Document Sync Requirements

SYNC-ID: repository_document_sync_enforcement
STATUS: implemented
ARTIFACTS: AGENTS.MD,docs/workflow/AS_BUILT_SYNC_CONTRACT.tsv,docs/workflow/REPOSITORY_DOCUMENT_SYNC.md,docs/workflow/REPOSITORY_DOCUMENT_SYNC_POLICY.json,docs/workflow/SAFEFLOW_SECURITY_BACKFILL.tsv,docs/workflow/PRODUCT_SECURITY_POLICY.tsv,docs/workflow/TEST_PLAN_MANIFEST.tsv,docs/workflow/GIT_HOOK_CHECKS.tsv,docs/workflow/GIT_HOOK_PARALLEL_GROUPS.tsv,docs/workflow/GIT_HOOK_RECOMMENDATION_PATHS.tsv,docs/workflow/FINAL_GATE_COVERAGE.tsv,guides/DOCUMENT_MAP.md,.githooks/pre-push,tools/lib/repository_document_sync.mjs,tools/check_repository_document_sync.mjs,tools/check_repository_document_sync.sh,tools/test_repository_document_sync.mjs,tools/test_repository_document_sync.sh,tools/check_lesson_structure.sh,tools/test_lesson_repository.sh,tools/check_ci_workflow_structure.sh,tools/test_ci_pipeline_acceleration.sh,.github/workflows/ci.yml,docs/as-built/REQUIREMENTS.md,docs/as-built/SPECIFICATION.md,docs/as-built/IMPLEMENTATION_PLAN.md,docs/workflow/TASK_TRACKER.md,docs/workflow/HANDOFF.md
TESTS: tools/check_repository_document_sync.sh,tools/test_repository_document_sync.sh,tools/check_lesson_structure.sh,tools/check_test_plan_coverage.sh,tools/test_test_plan.sh,tools/test_git_hooks.sh,tools/test_git_hooks_parallel.sh,tools/check_ci_workflow_structure.sh,tools/test_ci_pipeline_acceleration.sh,tools/check_security_invariants.sh,tools/test_security_invariants.sh,tools/check_agents_skills.sh,tools/check_as_built_sync_contract.sh,tools/check_as_built_docs.sh,tools/check_workflow_pair_sync.sh

The parent repository must reject missing category-relevant document updates over one PR or push range without making ordinary CI depend on the number of registered product repositories.

- Inspect only parent Git metadata and changed path names; never expand product registry paths, run child checks, or call network services from this gate.
- Classify STEP 1-7, STEP 1-14, Free Development, product registry/selection, scaffold/templates, Dashboard data, Dashboard design, CI/hooks, and security/evidence boundaries separately.
- Add requirements when classifications overlap; do not allow a weaker category to remove Security or Verification requirements.
- Use PR merge-base-to-head, exact push before-to-after, and complete-head-tree initial-push semantics.
- Treat rename source and destination as triggers, but allow only non-deleted destinations to satisfy required document changes.
- Reject session memory, generated output, deleted paths, rename sources, malformed paths/status, symlinked policy files, oversized policy/input collections, and weakened self-protection as synchronization evidence.
- Preserve the existing AS_BUILT sync registry, static document checks, lesson gates, product-local CI, and child-repository authority as separate owner layers.
- Keep the CI job standard-library-only and parallel; it must not install dependencies, start browsers, generate Dashboard data, use `gh`, or traverse external products.
