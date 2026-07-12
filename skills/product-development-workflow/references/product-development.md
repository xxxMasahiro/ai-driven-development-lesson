# Product Development Workflow Reference

This reference defines how agents use `$product-development-workflow` for external product work while keeping Dashboard Settings as the source of truth.

## Context Boundary

Before product work starts, confirm the active repository.
Lesson-repository work stays in `$HOME/projects/ai-driven-development-lesson/`.
Product work uses the configured product workspace and must be handled in a separate Ubuntu/WSL CLI window so Git state and file writes do not mix with the lesson repository.

If the request is about improving this lesson repository itself, stop using this skill and route to `skills/repository-development-workflow/SKILL.md`.

## Source Of Truth

Settings source of truth means the skill reads the saved Dashboard Settings and policy files before deciding Git, CI, merge, sync, or cleanup behavior.
Read these sources before deciding how far the agent may proceed:

- Dashboard Settings selected workflow menu.
- `learning/PRODUCT_WORKFLOW_GIT_USAGE_SETTINGS.tsv` for product Git usage mode.
- `docs/workflow/PRODUCT_WORKFLOW_GIT_USAGE_POLICY.tsv` for mode semantics.
- `learning/GIT_WORKFLOW_SETTINGS.tsv` for action settings when Git is used.
- `docs/workflow/GIT_WORKFLOW_POLICY.tsv` for action policy.
- Product profile and repository boundary data for the selected menu.
- Product security policy and external integration approval context.
- Product-local scaffold policy, including `skills/`, `tools/`, `docs/workflow/SECURITY.md`, `docs/workflow/VERIFICATION.md`, and `ops/REPOSITORY_INDEX.json`.
- `tools/development-instruction status --context <context>` for local-first,
  absence-only parent fallback resolution. The output is safe metadata and does
  not write or copy a file into the product repository.

The skill must never treat its own wording as stronger than these settings.

## Menu Routing

- Free Development: use the product workflow mode and product security checks for new or exploratory external-product work.
- Product Improvement: use the product workflow mode for changes to an existing product repository.
- External Integration: use the product workflow mode plus explicit external-service security and approval review.
- STEP 1-7, STEP 1-14, and Advanced Lesson product work: keep the lesson flow authoritative. These menus may use product checks, product documents, and product security gates as learning gates, but they do not expose the full external-product workflow automation because that would undermine the lesson sequence.
- Lesson Repository Improvement: route to `$repository-development-workflow`.

## Proposal Step

After wall discussion, structure the proposal with:

- purpose
- problems to solve
- scope
- non-scope
- impact on existing behavior
- required document updates
- required tests
- risks

No existing-feature tradeoff is acceptable.
If the proposal appears to need a tradeoff, stop and ask the developer before planning implementation.

## Implementation Plan Step

The plan must include:

- change targets
- implementation order
- document synchronization policy
- verification method
- recovery path
- developer approval boundaries

Use existing configuration, shared libraries, checks, repo-local skills, aggregate tests, CI, and pre-commit wiring where applicable.
New checks, if any, must be callable directly and from aggregate verification.

## Document Sync Step

Synchronize the external product documents according to their role:

- `REQUIREMENTS.md`: user-visible outcomes and constraints.
- `SPECIFICATION.md`: behavior, data, security, and workflow contracts.
- `IMPLEMENTATION_PLAN.md`: implementation order, checks, recovery, and approval boundaries.
- `TASK_TRACKER.md`: current work state and completion status.
- `HANDOFF.md`: restart context, next safe action, and stop conditions.

For External Integration, also synchronize `EXTERNAL_INTEGRATION_SECURITY.md`.

Do not mechanically duplicate the same text into every document.
Keep each document role-specific while preserving the same approved plan.

## Implementation And Verification

Implement in small slices.
Keep local feedback fast while preserving release proof when Settings calls for it.

Always keep these checks in scope when relevant:

- product workspace boundary
- canonical product documents
- product scaffold authority
- product-local skills and tools
- product security
- external-integration approval and least-privilege review
- required unit or local checks
- menu gate checks

## Settings-Selected Final Phase

The product Git usage mode selects the maximum required final phase:

- `none`: Git, remote sync, and CI are not applicable. Finish with local product safety verification and document/task state.
- `local`: local Git is applicable. Commit can be proposed or executed only when workflow action settings and approval boundaries allow it.
- `remote_sync`: local Git and remote sync are applicable. Push and sync follow the Git workflow action settings.
- `ci`: Git, remote sync, and CI are applicable. PR CI, merge, main CI, sync, and cleanup follow the Git workflow action settings.

Workflow action display values are:

- `禁止`: the agent must not execute the action.
- `都度確認`: the agent asks each time after required conditions pass.
- `自動`: the saved Settings value is treated as prior approval, and the action may run without another confirmation after every required condition passes.

Even when `自動` is selected, the agent must still stop for destructive operations, secrets, credentials, OAuth, external-service authority changes, unsafe CI states, missing checks, or any existing-feature tradeoff.

An existing product-local instruction memory controls its own A-F approval
procedure. Parent autonomy applies only when the local path is exactly absent;
invalid, unreadable, symlinked, malformed, or unsupported local content fails
closed without fallback.

## Recovery

If product mode, Git settings, product security, or document sync disagree, repair the owner-layer policy or product documents before changing the UI or skill wording.
If Git/CI is being demanded while product mode is `none`, treat that as a workflow bug unless another approved policy explicitly requires Git/CI.
If a check fails three times with the same condition, stop and report the blocker.
If a specification conflict or existing-feature tradeoff appears necessary, stop and ask the developer.
