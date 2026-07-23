# Lesson Repository Development Workflow

The workflow source of truth is `docs/workflow/REPOSITORY_DEVELOPMENT_WORKFLOW.tsv`.
The owner-layer helpers are `tools/lib/repository_development_workflow.sh` and `tools/repository-development-workflow`.
The A-F instruction overlay is resolved by `tools/development-instruction` from
`DEVELOPMENT_INSTRUCTION_POLICY.tsv` and
`DEVELOPMENT_AUTONOMY_WORKFLOW.tsv`.

## Phases

- `context_triage`: read AGENTS.MD, route tables, memory, changed files, branch state, and synchronized docs before proposing changes.
- `proposal`: structure the wall discussion into purpose, solved problem, scope, non-scope, existing-feature impact, document updates, tests, and risks.
- `implementation_plan`: prepare change targets, order, sync policy, verification, recovery, and approval boundaries; use read-only sub-agent review when feasible.
- `fast_loop`: implement scoped runtime changes with focused checks only, while keeping release stop conditions active.
- `mid_tests`: run medium verification for changed owner layers, hooks, tests, policy, or CI wiring.
- `release_gate`: prove the implemented state with synchronized docs, structure checks, aggregate checks, full hooks, and PR CI before merge.
- `main_sync_cleanup`: after approved merge, verify main CI, local/remote sync, and cleanup planning or execution only with explicit developer approval.

## Command Pattern

```bash
./tools/repository-development-workflow status
./tools/repository-development-workflow plan --phase implementation_plan
./tools/repository-development-workflow guidance --phase fast_loop
./tools/repository-development-workflow gate --phase release_gate
./tools/repository-development-workflow detect
./tools/repository-development-workflow plan-run --phase fast_loop --check-set required
./tools/repository-development-workflow run --phase fast_loop --check-set required --execute
./tools/repository-development-workflow instruction --stage D --scope-id <safe-task-scope-id>
./tools/repository-development-workflow status --runs
./tools/repository-development-workflow next --phase fast_loop
./tools/repository-development-workflow check
```

The workflow command explains required and recommended checks.
The Runner can dry-run every phase and can execute only policy-allowed non-destructive local checks for phases such as `fast_loop` and `mid_tests`.
It records phase, check, command, result, repository HEAD, policy fingerprint, input fingerprint, and working-tree summary in the local ignored `.repository-development-runs/` directory.
It does not run push, merge, remote sync, main CI waiting, deletion, cleanup,
arbitrary shell, dashboard mutation, credential handling, or release-proof
shortcuts. The instruction projection reports which normal D actions are
eligible; their owner tools and required evidence remain authoritative.

Before a direct development-session Lead Agent or Task Agent CLI launch, run
`tools/next-workflow agent-selection plan` with the exact Agent, role, rigor,
risk, complexity, capabilities, and task-local model policy. Report the
selected model and native effort, pass them explicitly to the CLI, and run
`agent-selection verify-config` against the prepared values. STOP, stale
catalog, ineligible model, unsupported effort, or configuration mismatch means
do not launch that Agent. This advisory configuration binding does not certify
the provider, attest backend execution, activate Production, or grant launch,
Git, network, credential, API-spend, or filesystem authority.

## Ownership Boundaries

- AGENTS.MD remains the top-level invariant source.
- `worklog-doc-sync` remains responsible for product requirement/specification/implementation-plan and product tracker/handoff synchronization.
- `lesson-sync-gate` remains responsible for STEP 1-14 final lesson and synchronization gates.
- This skill governs the lesson repository development workflow only.

## Release Proof

Fast-loop checks can keep implementation moving, but they are not proof for release. Release proof must include the synchronized document checks, structure checks, aggregate checks, full hooks or equivalent same-run evidence, PR CI, and later main CI plus local/remote sync when that phase is explicitly approved.
Runner records may be reused only for fast-loop or medium local decisions when HEAD, policy fingerprint, and input fingerprint match.
They must not be reused as release proof.

## Task Scope And Approval Boundaries

The current developer-requested task scope may carry normal A-D work through
document sync, implementation, required checks, and the configured Git/CI route
without per-phase prompts. Existing target-local instruction memory remains
procedurally authoritative when present. The parent fallback is selected only
on exact absence and never creates task scope by itself.

Stop and ask before:

- Editing AGENTS.MD beyond already-approved scope.
- Editing pre-commit, CI, final-gate coverage, or hook policy in a way not documented for the active sync ID.
- History rewrite, branch/worktree/product/remote deletion, credentials,
  secrets, OAuth, external authority changes, administrative bypass, or other
  destructive operations.
- Merging failed or unknown required CI, acting on unowned dirty changes, or
  expanding beyond the current task scope.
- Weakening existing gates, removing required checks, changing STEP 1-7 or STEP 1-14 behavior, changing repo-local skill ownership, or accepting an existing-feature tradeoff.

Destructive cleanup is plan-only by default. Normal merge, main CI monitoring,
and synchronization follow task scope plus saved Settings; convert destructive
cleanup execution into an approval-bound plan unless explicit developer
approval exists.
