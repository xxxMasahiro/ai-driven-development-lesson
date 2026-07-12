# Development Instruction Memory

Instruction-Memory-Version: 1.0.0
Instruction-Memory-Authority: parent-development-fallback

This document is the development-workflow fallback for an eligible parent or
selected child repository only when that target does not already contain its
own valid instruction memory at the configured local path. A target-local
instruction memory has procedural priority inside this layer. Neither source
may override current system, developer, or user instructions, the applicable
`AGENTS.MD`, security rules, repository boundaries, operation mode, task scope,
or saved Git/CI settings.

Structured lesson contexts are not eligible. Context and menu eligibility,
target kind, workflow skill, paths, versions, limits, and Git applicability are
resolved from the parent policy files rather than inferred from product names,
repository names, checkout locations, URLs, or menu labels.

## Invariant Development Rules

1. `workflow-rule:changeability` Keep changeable product identities,
   repository identities, URLs, paths, branch names, provider identities,
   thresholds, and environment values behind explicit configuration or
   replaceable interfaces.
2. `workflow-rule:ecosystem-reuse-generality` Preserve refactorability,
   ecosystem fit, reuse, generality, cohesive ownership, and composable
   standalone-plus-aggregate verification.
3. `workflow-rule:no-unrelated-tradeoff` Do not weaken, remove, or regress
   unrelated existing behavior, lessons, document routes, security gates,
   verification owners, or user workflows.
4. `workflow-rule:verification-orchestration` Give new verification explicit
   reusable roles, isolated mutable state, deterministic assertions, bounded
   concurrency, clear failure attribution, and safe parallel or distributed
   execution only where it is beneficial.
5. `workflow-rule:workflow-evidence` Make configuration boundaries,
   preserved behavior, checks, evidence identity, and unresolved limitations
   visible from proposal through completion.

Normal work inside the current developer-requested task scope proceeds without
per-phase or per-Git-action confirmation when all owner checks and saved
settings allow it. This document alone never creates a task scope or grants
write authority. Destructive Git or filesystem work, history rewriting,
credentials, secrets, OAuth, external sending, administrative bypass,
unselected repositories, unowned dirty changes, failed-CI merge, and material
scope expansion always stop for explicit direction.

## A. Pre-Implementation Proposal

Read the applicable `AGENTS.MD`, resolved instruction source, workflow skill,
current repository state, and routed authorities. Present purpose, problem,
scope, non-scope, changeable inputs, reusable owner layers, ecosystem fit,
preserved behavior, security risks, document synchronization, verification
roles, and accepted/deferred/rejected review findings. Continue to B within the
same requested task unless a stop condition applies.

## B. Implementation Plan

Map the current task to ordered document, contract, implementation, test,
evidence, recovery, and release slices. Synchronize planned authoritative
documents before runtime implementation. New checks must remain independently
callable and aggregate-owned exactly once. Continue to C within the same task
scope when the plan is internally consistent and no stop condition applies.

## C. Implementation

Implement only the synchronized plan in small owner-layer slices. Preserve
unrelated behavior and repository boundaries. Repeat focused and medium checks
until failures are fixed or the configured repeated-failure stop condition is
reached. Do not use child-repository scans, persistent result reuse, or gate
weakening as a shortcut.

## D. Git And GitHub Operations

After the intended diff and required local checks pass, calculate the maximum
normal Git/GitHub phase as the intersection of current task scope, target
operation mode, product Git mode when applicable, and saved action settings.
Commit, push, pull-request/CI integration, merge, main CI monitoring, and sync
may continue without separate prompts only when each action is applicable and
allowed. Never merge failed or unknown required CI. A deterministic in-scope
failure may return to C for repair, with the configured repeated-failure limit.

## E. Next Proposal

After D is complete, prepare the next proposal from the achieved state,
remaining risks, and user value. E is plan-only and cannot mutate a repository,
run Git/GitHub actions, or broaden the completed task scope.

## F. Next Roadmap

Slice the next proposal into independently understandable and verifiable
roadmap items. F is plan-only. A same-scope continuation may return to A/B
without an artificial stop, but automatic entry into a new C implementation is
allowed only when the current developer request already authorizes that exact
scope; otherwise stop for direction.
