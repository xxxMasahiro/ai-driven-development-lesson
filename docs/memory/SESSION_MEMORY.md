# Session Memory

## 2026-06-18 Product Authority Evidence Detail Contract Slice

This continuation stayed under `repository-development-workflow` after PR #13 for `ci_final_gate_gap_only_safety` was merged to `main` and main CI/local aggregate verification passed.
The active constraint remains that existing Dashboard routes, product authority behavior, evidence collection, browser command execution boundaries, and CI/final-gate semantics must not be weakened.

Completed in this slice so far:

- Promoted product authority evidence detail fields in `docs/workflow/DASHBOARD_DATA_SCHEMA.tsv` from `planned` to `implemented`.
- Added implemented schema rows for emitted `context`, `max_age_seconds`, and `product_root` fields.
- Strengthened `dashboard-control-center/src/dashboardData.js` validation so evidence items must carry context, required flag, observation time, max age, sanitized product root, product head, artifacts, blockers, command preview, detail ids, detail references, summary, reason, next action, and risk level.
- Updated Dashboard Control Center fixtures to match the producer-owned evidence item detail contract.
- Strengthened `tools/test_product_repository_authority.sh`, `tools/test_dashboard_schema.sh`, and `tools/test_dashboard_data.sh` for this contract.
- Added `product_authority_evidence_detail_contract` to the as-built sync contract and synchronized requirements, specification, implementation plan, TASK_TRACKER, and HANDOFF.

Verification passed so far:

- `bash -n tools/test_dashboard_data.sh`
- `bash -n tools/test_dashboard_schema.sh`
- `bash -n tools/test_product_repository_authority.sh`
- `node --check dashboard-control-center/src/dashboardData.js`
- `./tools/test_dashboard_schema.sh`
- `./tools/test_product_repository_authority.sh`
- `./tools/test_dashboard_data.sh`

Next recommended work:

- Run the as-built/workflow sync checks, repository-development fast_loop/mid_tests checks, and then release-gate proof for this slice.

## 2026-06-18 CI Final Gate Gap-Only Safety Slice

This continuation stays under `repository-development-workflow` after the product CI run evidence collector slice.
The active constraint is that no existing-feature tradeoff is allowed: required CI names, full/no-cache behavior, standalone aggregate verification, final-gap command semantics, Dashboard behavior, Playwright coverage, and product repository behavior must remain intact.

Completed in this slice so far:

- Added aggregate coverage validation to `tools/ci-final-gate --gap-only` before final-gap commands run.
- Kept the default final-gate path aligned with the existing evidence and aggregate fallback behavior.
- Extended `tools/test_ci_final_gate.sh` so an uncovered aggregate requirement fails in both default and gap-only modes.
- Added a valid gap-only assertion for `CI final gate gap-only coverage and commands passed.`
- Added `ci_final_gate_gap_only_safety` to the as-built sync contract and synchronized requirements, specification, implementation plan, TASK_TRACKER, and HANDOFF.
- Added `tools/as-built-sync status` lookup caching after aggregate release proof exposed repeated active-command and Git hook runner scans; output and pass/fail semantics are unchanged.

Verification passed:

- `bash -n tools/ci-final-gate`
- `bash -n tools/test_ci_final_gate.sh`
- `bash -n tools/as-built-sync`
- `./tools/test_ci_final_gate.sh`
- `./tools/test_as_built_sync_contract.sh`
- `./tools/check_ci_workflow_structure.sh`
- `./tools/check_as_built_sync_contract.sh`
- `./tools/check_as_built_docs.sh`
- `./tools/check_workflow_pair_sync.sh`
- `./tools/check_test_plan_coverage.sh`
- `./tools/test_test_plan.sh`
- `./tools/repository-development-workflow run --phase fast_loop --check-set required --execute --approved`
- `./tools/repository-development-workflow run --phase mid_tests --check-set required --execute --approved`
- `./tools/test_lesson_repository.sh`
- `./tools/git-hooks run --mode full --no-cache`
- `.githooks/pre-commit`
- `git diff --check`

Next recommended work:

- Continue remaining approved roadmap slices as separate sync IDs after this slice is clean.

## 2026-06-18 Product CI Run Evidence Collector Slice

This continuation stayed under `repository-development-workflow` after PR #11 for `external_product_repository_registry` was merged to `main` and local/remote sync was clean.

Completed in this slice:

- Added generated product-local `tools/product-gate-evidence ci-runs` from `tools/product-gate-evidence-bootstrap`.
- Kept `ci-status` local-only for CI manifest/provider readiness; the new `ci-runs` command is the explicit GitHub-observing collector.
- Recorded current-head main CI evidence under `product.ci.main` by parsing `gh run list --json` output and declared `ops/CI_MANIFEST.tsv` rows.
- Recorded PR CI evidence under `product.ci.pr` only when `--pr` is supplied, using `gh pr view --json` and product HEAD matching.
- Preserved provider observability under `product.ci.github_actions`, failing closed for missing `gh`, auth, repository visibility, `node`, or JSON parsing.
- Extended fake-`gh` product gate fixtures so parent-side authority reads authoritative main and PR CI detail metadata.
- Added `product_ci_run_evidence_collector` to the as-built sync contract and synchronized the evidence schema, test-plan policy, as-built docs, TASK_TRACKER, and HANDOFF.

Verification passed so far:

- `bash -n tools/product-gate-evidence-bootstrap`
- `bash -n tools/test_product_gate_tools.sh`
- `./tools/test_product_gate_tools.sh`
- `./tools/test_product_scaffold_check.sh`

Next recommended work:

- Run `./tools/test_product_repository_authority.sh`, as-built/test-plan sync checks, repository-development workflow fast_loop/mid_tests, and `git diff --check`.
- Playwright visual review is not needed unless a later slice changes Dashboard UI/CSS/layout.

## 2026-06-17 Repository Selection UX Completion Slice

This continuation stayed under `repository-development-workflow` and completed the remaining `external_product_repository_registry` selection UX scope in the lesson repository.

Completed in this slice:

- Added producer-owned `repository_selection` output for repo-backed menus, including current repository identity, eligible candidates, selection state, path/Git/selectability status, disabled reasons, and guarded selection command previews.
- Added Dashboard data schema coverage, fixture coverage, and browser-side validation for `repository_selection`.
- Added a read-only Dashboard Control Center repository selection panel that separates menu intent from repository target selection without adding browser-side repository mutation.
- Added focused Dashboard data and Playwright assertions proving selected `browser-debug-cli` remains selected, `frame-cue` and raw local paths do not leak in the selection panel, and no-target/zero-eligible states stay non-selected.
- Adjusted Control Center aggregate test setup so settings middleware checks use test-owned dashboard settings and skip snapshot regeneration inside the middleware path, avoiding external product repository live-state hangs.
- Promoted `external_product_repository_registry` from `planned` to `implemented` across the as-built sync contract, as-built documents, TASK_TRACKER, and HANDOFF.
- Follow-up completion: optimized `dashboard-data` JSON safety handling and Git workflow consistency reuse so the full Dashboard data test no longer times out.
- Release-gate local follow-up: added the missing `FINAL_GATE_COVERAGE.tsv` row for `./tools/test_product_repository_mode.sh`, preserving aggregate/final-gate coverage instead of weakening the gate.
- Release-gate local follow-up: completed local release proof through aggregate repository testing, full/no-cache Git hooks, and the pre-commit entrypoint. PR CI, push, merge, main CI, local/remote sync, and cleanup remain explicit phase-boundary work.

Verification passed:

- `bash -n tools/dashboard-data`
- `bash -n tools/dashboard-settings`
- `bash -n tools/test_dashboard_schema.sh`
- `bash -n tools/test_dashboard_settings.sh`
- `bash -n tools/test_dashboard_data_product_repository_selection.sh`
- `bash -n tools/test_dashboard_control_center.sh`
- `./tools/test_dashboard_data_product_repository_selection.sh`
- `./tools/test_dashboard_data.sh`
- `./tools/test_dashboard_schema.sh`
- `./tools/check_dashboard_design_system.sh`
- `./tools/test_dashboard_i18n.sh`
- `./tools/test_dashboard_settings.sh`
- `npm run dashboard:build`
- `./node_modules/.bin/playwright test tests/playwright/dashboard-control-center.spec.js`
- `./tools/test_dashboard_control_center.sh`
- `./tools/check_as_built_sync_contract.sh`
- `./tools/check_as_built_docs.sh`
- `./tools/check_workflow_pair_sync.sh`
- `./tools/check_document_root.sh`
- `./tools/check_agents_skills.sh`
- `./tools/check_repository_development_workflow.sh`
- `./tools/test_repository_development_workflow.sh`
- `./tools/check_test_plan_coverage.sh`
- `./tools/test_test_plan.sh`
- `./tools/test_git_hooks.sh`
- `./tools/test_git_hooks_parallel.sh`
- `./tools/check_ci_workflow_structure.sh`
- `./tools/repository-development-workflow run --phase fast_loop --check-set required --execute --approved`
- `./tools/repository-development-workflow run --phase mid_tests --check-set required --execute --approved`
- `./tools/test_lesson_repository.sh`
- `./tools/test_ci_final_gate.sh`
- `./tools/git-hooks run --mode full --no-cache`
- `.githooks/pre-commit`
- `git diff --check`

Visual review:

- Playwright screenshot review was performed for the repository selection panel on desktop and mobile.
- The command preview wrapping was adjusted after visual review so the full guarded command remains visible without overlap.

Next recommended work:

- Treat future real PR/main CI run collectors as a separate approval-bound scope.
- Stop at the `release_gate` phase boundary unless PR CI/push/merge/main-sync/cleanup is explicitly requested as that phase.
- Keep `frame-cue` and `browser-debug-cli` as temporary verification targets only.

## 2026-06-18 Dashboard Browser Debug Manifest Boundary

- Added `tools/dashboard-browser-debug-manifest` so ai-driven-development-lesson owns the Dashboard Control Center Browser Debug target manifest.
- The generator keeps workflow, Git, CI, blocker, repository-selection, evidence-freshness, and next-safe-action semantics in bounded lesson-side `sourceData`, user questions, review brief, and rubric.
- Browser Debug CLI remains generic; it consumes the generated manifest without adding Dashboard-specific runtime branches or lesson file loaders.
- Added `tools/test_dashboard_browser_debug_manifest.sh` and wired it into `tools/test_lesson_repository.sh`.

## 2026-06-17 Concrete Product Test Evidence Slice

This continuation stayed under `repository-development-workflow` after the guarded registry mutation slice and closed the concrete product-test fixture gap without changing Dashboard UI/CSS.

Completed in this slice:

- Extended product-local test plan fixtures to include `unit`, `smoke`, and `e2e` rows.
- Verified generated product-local `tools/product-gate-evidence manifest-tests` records `product.tests.unit`, `product.tests.smoke`, and `product.tests.e2e`.
- Added parent-side authority readback assertions for the three concrete product-test rows and their detail-manifest metadata.
- Updated the as-built documents, TASK_TRACKER, HANDOFF, and this session memory while keeping `external_product_repository_registry` planned.

Verification passed:

- `bash -n tools/test_product_scaffold_check.sh`
- `bash -n tools/test_product_gate_tools.sh`
- `./tools/test_product_scaffold_check.sh`
- `./tools/test_product_gate_tools.sh`
- `./tools/check_as_built_sync_contract.sh`
- `./tools/check_as_built_docs.sh`
- `./tools/check_workflow_pair_sync.sh`
- `./tools/test_dashboard_schema.sh`
- `./tools/check_document_root.sh`
- `./tools/check_agents_skills.sh`
- `./tools/check_repository_development_workflow.sh`
- `./tools/test_repository_development_workflow.sh`
- `./tools/repository-development-workflow run --phase fast_loop --check-set required --execute --approved`
- `./tools/repository-development-workflow run --phase mid_tests --check-set required --execute --approved`
- `git diff --check`

Verification not run:

- `./tools/test_dashboard_data.sh` was not rerun because previous sessions observed it hanging with nested `dashboard-data` processes.
- Playwright visual review was not run because this slice did not change Dashboard UI, CSS, or layout behavior.

Next recommended work after this slice:

- Continue only future real PR/main CI run collectors if approved, and optional repository picker / selection UX work.
- Keep `external_product_repository_registry` as `planned` until optional repository picker / selection UX scope is complete.
- Playwright visual review is only needed if Dashboard UI/CSS/layout changes in a later slice.

## 2026-06-17 Guarded Registry Mutation Slice

This continuation stayed under `repository-development-workflow` after the no-target fixture slice and added guarded parent-side registry mutation without changing Dashboard UI/CSS.

Completed in this slice:

- Added `tools/product-repository-registry register` for confirmed parent-side repository registration.
- Added `tools/product-repository-registry select` for confirmed per-menu repository selection.
- Kept mutation guarded: both commands require `--confirm`; registration validates safe IDs, contexts, existing external paths, product type, source values, duplicate replacement, and tab/newline-free fields; selection validates known repository IDs, allowed contexts, and source values.
- Added focused registry mutation coverage to `tools/test_dashboard_data_product_repository_selection.sh`, including duplicate rejection, `--replace`, selection write/readback, and disallowed-context selection rejection.
- Updated the as-built documents, TASK_TRACKER, HANDOFF, and this session memory while keeping `external_product_repository_registry` planned.

Verification passed:

- `bash -n tools/product-repository-registry`
- `bash -n tools/test_dashboard_data_product_repository_selection.sh`
- `./tools/test_dashboard_data_product_repository_selection.sh`
- `./tools/check_as_built_sync_contract.sh`
- `./tools/check_as_built_docs.sh`
- `./tools/check_workflow_pair_sync.sh`
- `./tools/test_dashboard_schema.sh`
- `./tools/check_document_root.sh`
- `./tools/check_agents_skills.sh`
- `./tools/check_repository_development_workflow.sh`
- `./tools/test_repository_development_workflow.sh`
- `./tools/repository-development-workflow run --phase fast_loop --check-set required --execute --approved`
- `./tools/repository-development-workflow run --phase mid_tests --check-set required --execute --approved`
- `git diff --check`

Verification not run:

- `./tools/test_dashboard_data.sh` was not rerun because previous sessions observed it hanging with nested `dashboard-data` processes.
- Playwright visual review was not run because this slice did not change Dashboard UI, CSS, or layout behavior.

Next recommended work after this slice:

- Continue only future real PR/main CI run collectors if approved, and optional repository picker / selection UX work.
- Keep `external_product_repository_registry` as `planned` until optional repository picker / selection UX scope is complete.
- Playwright visual review is only needed if Dashboard UI/CSS/layout changes in a later slice.

## 2026-06-17 No-Target Registry Fixture Slice

This continuation stayed under `repository-development-workflow` after the CI/Security evidence slice and fixed the remaining no-target registry coverage without changing Dashboard UI/CSS.

Completed in this slice:

- Added Dashboard data fixtures proving Product Improvement and External Integration stay `not_selected` when the registry has only a Free Development selection.
- Added a zero-eligible Free Development fixture proving a registry with no eligible Free Development repository does not fall back to the legacy product root.
- Added CLI gate fixture coverage proving `tools/product-improvement` and `tools/external-integration` fail before gate execution when no explicit registry target is selected.
- Updated the as-built documents, TASK_TRACKER, HANDOFF, and this session memory while keeping `external_product_repository_registry` planned.

Verification passed:

- `bash -n tools/test_dashboard_data_product_repository_selection.sh`
- `bash -n tools/test_product_gate_tools.sh`
- `./tools/test_dashboard_data_product_repository_selection.sh`
- `./tools/test_product_gate_tools.sh`
- `./tools/check_as_built_sync_contract.sh`
- `./tools/check_as_built_docs.sh`
- `./tools/check_workflow_pair_sync.sh`
- `./tools/test_dashboard_schema.sh`
- `./tools/check_document_root.sh`
- `./tools/check_agents_skills.sh`
- `./tools/check_repository_development_workflow.sh`
- `./tools/test_repository_development_workflow.sh`
- `./tools/repository-development-workflow run --phase fast_loop --check-set required --execute --approved`
- `./tools/repository-development-workflow run --phase mid_tests --check-set required --execute --approved`
- `git diff --check`

Verification not run:

- `./tools/test_dashboard_data.sh` was not rerun because previous sessions observed it hanging with nested `dashboard-data` processes.
- Playwright visual review was not run because this slice did not change Dashboard UI, CSS, or layout behavior.

Next recommended work after this slice:

- Continue only the remaining concrete `product.tests.*` collection gaps, future real PR/main CI run collectors if approved, and optional repository picker / selection UX work.
- Keep `external_product_repository_registry` as `planned` until optional repository picker / selection UX scope is complete.
- Playwright visual review is only needed if Dashboard UI/CSS/layout changes in a later slice.

## 2026-06-17 CI And Security Evidence Detail Slice

This continuation stayed under `repository-development-workflow` and extended the product-local evidence taxonomy without changing Dashboard UI/CSS.

Completed in this slice:

- Added generated product-local `tools/product-gate-evidence ci-status`, which records `product.ci.github_actions` from `ops/CI_MANIFEST.tsv` and declared workflow files, preserves existing current authoritative CI run evidence, and keeps unobserved PR CI as manual-required.
- Added generated product-local `tools/product-gate-evidence security-status`, which records `product.security.secrets`, `product.security.local_artifacts`, `product.security.external_sending`, and `product.security.blockers`.
- Kept Security evidence defensive: it records manifest/path/Git tracking facts only and does not store secret values.
- Added focused coverage for the generated writer, product gate wrapper fixture, and parent-side authority detail-manifest readback for CI and Security evidence rows.
- Updated the as-built documents, TASK_TRACKER, HANDOFF, and this session memory while keeping `external_product_repository_registry` planned.

Verification passed:

- `bash -n tools/product-gate-evidence-bootstrap`
- `bash -n tools/test_product_scaffold_check.sh`
- `bash -n tools/test_product_gate_tools.sh`
- `bash -n tools/test_product_repository_authority.sh`
- `./tools/test_product_scaffold_check.sh`
- `./tools/test_product_repository_authority.sh`
- `./tools/test_product_gate_tools.sh`
- `./tools/check_as_built_sync_contract.sh`
- `./tools/check_as_built_docs.sh`
- `./tools/check_workflow_pair_sync.sh`
- `./tools/test_dashboard_schema.sh`
- `./tools/test_dashboard_data_product_repository_selection.sh`
- `./tools/check_document_root.sh`
- `./tools/check_agents_skills.sh`
- `./tools/check_repository_development_workflow.sh`
- `./tools/test_repository_development_workflow.sh`
- `./tools/repository-development-workflow run --phase fast_loop --check-set required --execute --approved`
- `./tools/repository-development-workflow run --phase mid_tests --check-set required --execute --approved`
- `git diff --check`

Verification not run:

- `./tools/test_dashboard_data.sh` was not rerun because previous sessions observed it hanging with nested `dashboard-data` processes.
- Playwright visual review was not run because this slice did not change Dashboard UI, CSS, or layout behavior.

Next recommended work after this slice:

- Continue only the remaining concrete `product.tests.*` collection gaps, future real PR/main CI run collectors if approved, guarded registry selection mutation, and optional repository picker work.
- Keep `external_product_repository_registry` as `planned` until register/select mutation, optional repository picker, zero eligible repository fixtures, and no-target Product Improvement / External Integration coverage are done.
- Playwright visual review is only needed if Dashboard UI/CSS/layout changes in a later slice.

## 2026-06-17 Git Evidence Detail Slice

This continuation stayed under `repository-development-workflow` and extended the evidence taxonomy v1 work without changing Dashboard UI/CSS.

Completed in this slice:

- Extended product-local `tools/product-gate-evidence git-status` so it now records `product.git.sync`, `product.git.push`, `product.git.pr`, and `product.git.merge` in addition to the existing worktree, upstream, and local-remote rows.
- Kept local Git sync and push evidence authoritative only when observable from local Git state.
- Kept PR and merge readiness as `manual_required` detail rows without calling GitHub, creating PRs, waiting on CI, or treating unobserved external state as passed.
- Added focused coverage for the generated writer, product gate wrapper fixture, and parent-side authority detail-manifest readback for the new Git evidence rows.
- Synchronized the planned `external_product_repository_registry` notes in the as-built documents, TASK_TRACKER, HANDOFF, and this session memory without promoting the sync ID to implemented.

Verification passed:

- `bash -n tools/product-gate-evidence-bootstrap`
- `./tools/test_product_scaffold_check.sh`
- `./tools/test_product_gate_tools.sh`
- `./tools/test_product_repository_authority.sh`
- `./tools/check_as_built_sync_contract.sh`
- `./tools/check_as_built_docs.sh`
- `./tools/check_workflow_pair_sync.sh`
- `./tools/test_dashboard_schema.sh`
- `./tools/test_dashboard_data_product_repository_selection.sh`
- `./tools/check_document_root.sh`
- `./tools/check_agents_skills.sh`
- `./tools/repository-development-workflow run --phase fast_loop --check-set required --execute --approved`
- `./tools/repository-development-workflow run --phase mid_tests --check-set required --execute --approved`
- `git diff --check`

Verification not passed / not run:

- `./tools/product-repository-registry verify --context free-development --all` failed because the external product repositories currently report dirty Git state and one scaffold failure; do not repair external repositories without explicit approval.
- `./tools/test_dashboard_data.sh` was not rerun because the previous session observed it hanging with nested `dashboard-data` processes.
- Playwright visual review was not run because this slice did not change Dashboard UI, CSS, or layout behavior.

Next recommended work:

- Continue evidence collection standardization for `product.ci.*` and `product.security.*`, plus any remaining concrete `product.tests.*` collection gaps.
- Keep `external_product_repository_registry` as `planned` until register/select mutation, optional repository picker, zero eligible repository fixtures, and no-target Product Improvement / External Integration coverage are done.

## 2026-06-17 Evidence Taxonomy v1 Slice

This session continued `ai-driven-development-lesson` repository development under `repository-development-workflow`.

The first evidence taxonomy v1 slice is implemented while `external_product_repository_registry` intentionally remains `planned`.

Completed in this slice:

- Added `product.structure` to the product gate evidence source namespace contract.
- Updated product-local evidence bootstrap so generated `ops/EVIDENCE_DETAIL_MANIFEST.tsv` includes concrete `product.tests.unit`, `product.tests.smoke`, `product.tests.e2e`, `product.structure.files`, `product.structure.settings`, and `product.structure.scripts` rows while preserving existing `product.gates.*` compatibility rows.
- Updated product-local writer validation and parent-side product authority validation to accept `product.structure.*`.
- Added focused coverage proving `product.structure.files` can be recorded, persisted to ledger/detail artifacts, and read back through product authority with manifest-backed detail metadata.
- Extended the product-local writer with `tools/product-gate-evidence structure-status`, which records `product.structure.files`, `product.structure.settings`, and `product.structure.scripts` into the Dashboard-readable index, ledger, and detail artifacts.
- Extended the product-local writer with detailed `tools/product-gate-evidence git-status` output for `product.git.sync`, `product.git.push`, `product.git.pr`, and `product.git.merge`; local sync/push are authoritative when observable, while PR/merge remain manual-required rows without external calls.
- Synchronized the planned `external_product_repository_registry` metadata and notes across the as-built documents, TASK_TRACKER, HANDOFF, and AS_BUILT_SYNC_CONTRACT without promoting the sync ID to implemented.

Verification passed:

- `./tools/check_repository_boundary.sh`
- `./tools/check_agents_skills.sh`
- `./tools/product-repository-registry verify --context free-development --all`
- `./tools/test_dashboard_data_product_repository_selection.sh`
- `bash -n tools/product-gate-evidence-bootstrap`
- `bash -n tools/lib/product_repository_authority.sh`
- `./tools/test_product_scaffold_check.sh`
- `./tools/test_product_gate_tools.sh`
- `./tools/test_product_repository_authority.sh`
- `./tools/check_as_built_sync_contract.sh`
- `./tools/check_as_built_docs.sh`
- `./tools/check_workflow_pair_sync.sh`
- `./tools/test_dashboard_schema.sh`
- `./tools/check_document_root.sh`
- `./tools/check_repository_development_workflow.sh`
- `./tools/test_repository_development_workflow.sh`
- `./tools/repository-development-workflow run --phase fast_loop --check-set required --execute --approved`
- `./tools/repository-development-workflow run --phase mid_tests --check-set required --execute --approved`
- `git diff --check`

`./tools/test_dashboard_data.sh` was started after the focused checks but did not complete after several minutes of no output while running nested `dashboard-data` processes; it was stopped and should be treated as not completed for this slice.

Next recommended work:

- Continue evidence collection standardization for the remaining taxonomy rows: `product.ci.*` and `product.security.*`, plus any remaining concrete `product.tests.*` collection gaps.
- Keep `frame-cue` and `browser-debug-cli` as temporary verification targets only.
- Keep `external_product_repository_registry` as `planned` until register/select mutation, optional repository picker, zero eligible repository fixtures, and no-target Product Improvement / External Integration coverage are done.

## 2026-06-17 Handoff

The latest work completed read-only multi-repository support for Free Development enough for the Dashboard Control Center to verify `frame-cue` and `browser-debug-cli`, keep the selected `browser-debug-cli` repository across key pages, and connect the four overview cards to matching live evidence rows through `source_id/current_item_id`.

`external_product_repository_registry` intentionally remains `planned` because explicit register/select mutation behavior and optional browser-side repository picking are still future work. The next session should resume from `AGENTS.MD`, `skills/repository-development-workflow/SKILL.md`, and `docs/workflow/HANDOFF.md` at the `external_product_repository_registry` block, then proceed to evidence taxonomy v1 and external product evidence collection standardization.

Use `frame-cue` and `browser-debug-cli` only as temporary verification targets for now. Before runtime edits, run focused context checks for registry verify and dashboard-data selected-repository behavior; after UI changes, run targeted Playwright visual checks.

## 2026-06-17 Document Root Gate

The latest session added `tools/check_document_root.sh` and wired it through `tools/check_agents_skills.sh` and `tools/test_docs_tour.sh`. The check enforces that `docs/**/*.md` is reachable from `AGENTS.MD` directly or through `guides/DOCUMENT_MAP.md`, that every `skills/*/SKILL.md` is routed from `AGENTS.MD`, and that `skills/*/references/*.md` files are routed by their parent skill.

The documentation route was synchronized in `AGENTS.MD`, `guides/DOCUMENT_MAP.md`, `tools/docs-tour`, `tools/dashboard docs`, `docs/workflow/AS_BUILT_SYNC_CONTRACT.tsv`, the as-built trio, `docs/workflow/TASK_TRACKER.md`, and `docs/workflow/HANDOFF.md`.

Latest focused verification passed:

- `./tools/check_document_root.sh`
- `./tools/check_agents_skills.sh`
- `./tools/test_docs_tour.sh`
- `./tools/check_as_built_sync_contract.sh`
- `./tools/check_as_built_docs.sh`
- `./tools/check_workflow_pair_sync.sh`
- `./tools/check_repository_development_workflow.sh`
- `./tools/test_repository_development_workflow.sh`
- `git diff --check` for the touched document-root files
