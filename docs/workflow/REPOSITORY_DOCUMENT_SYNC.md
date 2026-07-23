# Repository Document Synchronization

## Purpose

This parent-repository gate checks whether the documents required by the paths
changed in one pull request or push were also changed in that integration
range. It is an omission guard, not a semantic review of document prose.

The gate reads only this repository's Git metadata, changed path names, and the
fixed policy file. It never expands product registry paths, walks FrameCue,
TraceCue, or another registered repository, runs a child repository test, or
calls GitHub or another network service. The number of registered child
repositories therefore does not affect ordinary parent CI duration.

## Parent-Specific Classifications

`docs/workflow/REPOSITORY_DOCUMENT_SYNC_POLICY.json` is the machine-readable
authority. Its additive rules distinguish:

- STEP 1-7 and STEP 1-14 lesson authorities;
- Free Development and external-product workflow policy;
- parent-side product registry and selection contracts;
- product scaffold and template authorities;
- Dashboard data contracts and Dashboard design authorities;
- CI, Git hooks, test-plan, and final-gate governance;
- semantic CI execution ownership, provider-result proof, and direct-argv final gaps;
- security, external sending, MCP, browser execution, and evidence boundaries;
- the as-built trio and TASK_TRACKER/HANDOFF workflow pair.
- local-first development instruction resolution, the AGENTS-invariant versus
  procedural-instruction boundary, and the A-F autonomy overlay.

The fail-closed Next Workflow core has an explicit additive classification.
Changes to its contracts, persistent settings/activation authorities, CLI,
external launcher, model selection, signed release chain, or runtime owners
must synchronize the canonical as-built set, verification and security
authorities, development-instruction governance, CI/hook ownership, and
workflow-state pair. This classification remains parent-only and never opens
or tests a registered child repository. The Dashboard data schema is updated
separately when its producer contract changes; paused Control Center source and
browser work are not required merely because the headless core changes.
Protected runtime-wiring follow-ups are not exempt: containment, trust,
lifecycle, task delivery, state migration, provider execution, immutable
candidate release, source receipts, activation transitions, and their tests
must carry this complete parent authority set in the same PR or push range.
Portable test fixtures are included in that obligation when they model a
protected executable. Such a fixture may satisfy isolated test setup only; it
cannot satisfy Production provider discovery, certification, launch evidence,
or Activation.
Containment is stricter: absent fixed-path Bubblewrap or unshare is never
fixture-substituted. The positive bootstrap case is then an explicit
prerequisite skip and synchronized verification must retain a passing
guided-refusal/status case.
Installed-launcher integrity fixtures that reuse the private provider
descriptor are covered by the same complete synchronization obligation; reuse
does not change its non-authorizing status, and missing real containment
requires the same explicit positive-case skip.

Multiple matching rules add requirements; a weaker rule cannot remove a
security or verification requirement. The existing
`AS_BUILT_SYNC_CONTRACT.tsv` remains the feature-level implementation registry.
This range gate does not replace its metadata and semantic consistency checks.

Development-instruction governance has its own immutable rule. Changes to the
parent fallback, invariant/procedural authority contract, resolver policy, A-F
mapping, repository workflow integration, or standalone checker must update
the as-built authorities, Security,
verification/CI catalogs, and instruction governance together. The checker
rejects removal of this rule, removal of a protected trigger, or reduction of
its required groups.

This rule remains parent-only. CI validates the parent source and isolated
temporary product fixtures; it does not resolve the live product registry,
open a selected child repository, or copy an instruction file to a child.

## Range And Change Semantics

- Pull requests inspect merge-base to head.
- Pushes inspect the exact before-to-after range.
- An initial push inspects every tracked file in the head tree. This verifies
  tree consistency; the later pull-request range remains the branch-change
  guarantee.
- Rename source and destination paths can trigger classifications.
- Only non-deleted destination paths can satisfy required-document changes.
- Deleted documents, rename sources, session memory, generated runtime output,
  dependencies, reports, and ignored evidence cannot satisfy synchronization.
- Tests-only changes do not automatically require product/as-built documents;
  changes to verification meaning, CI, hooks, or evidence boundaries do.

The checker rejects unnormalized or control-character paths, unsupported Git
status records, symlinked policy files, oversized policy/input collections,
unknown policy fields, and attempts to weaken its immutable self-protection
rule.

## CI, Verification Ownership, And Git Hook

The main CI workflow keeps one small parent document-sync owner with full Git
history. It uses Node standard-library code only: no `npm ci`, Playwright,
Dashboard generation, child-repository traversal, `gh`, secrets, write
permissions, or provider call. The number of registered child repositories
does not change this job's work.

Common verification is assigned by `FINAL_GATE_CI_GRAPH.tsv`. Structure,
non-browser regression, lesson CLI, and browser owners may run concurrently,
but every authoritative compatibility execution has exactly one main-CI
owner. `lesson-aggregate` and `git-hooks-full-no-cache` remain required job
contexts as proof-only terminal jobs; they do not rerun their former common
suites. `final-gate` verifies the graph/policy/catalog/HEAD/input-bound proof,
then runs each configured final gap once. Gap and fallback commands are JSON
argument arrays executed directly without `bash -c`, `sh -c`, or `eval`.

Lesson14 workflow/job contexts remain present. They run only Lesson14-specific
owners or semantic compatibility proofs; the main workflow still owns the
common heavy browser and regression executions for the same commit. A failure
in either required workflow remains blocking. This is required-context
composition, not persistent or cross-workflow result caching.

`.githooks/pre-push` provides optional repository-local early feedback when
the existing local `.githooks` path is installed. It does not fetch. CI is the
final authority because local hooks can be bypassed and first pushes inspect a
complete tree rather than the later PR range.

## Recovery

Fix an omission by updating the missing authority in the same PR/push range.
Fix a false classification by changing the parent policy, checker tests, this
guide, and the synchronized governance authorities together. Do not bypass a
rule with a commit message, session-memory entry, generated file, deletion,
rename source, Dashboard display, or external product evidence.

Rollback is a normal Git revert of the policy, graph, checker, hook, and CI
wiring. The strict standalone checks and local full/no-cache path remain
available independently of the CI distribution graph.
No product-repository mutation, credential action, provider call, external
transfer, or browser execution is required.
