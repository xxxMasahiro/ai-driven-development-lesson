# Document Map

This guide explains the document system used by this lesson repository.
It is written for learners who may not yet know why an AI-driven development workflow uses many Markdown files.

The short version:

- `AGENTS.MD` tells an agent how to operate inside this lesson repository.
- `docs/as-built/` describes what this lesson repository is meant to provide and how it is implemented.
- `docs/design-system/` records durable UI design rules for control-center screens.
- `docs/workflow/` records current work state and restart context.
- `docs/memory/` may hold optional Git-ignored local temporary notes; durable maintainer intent and decisions belong in tracked authority and workflow documents.
- `learning/context/` stores learner-facing source context that future lesson implementation can render in the selected display language.
- `skills/*/SKILL.md` stores reusable agent procedures.
- Product repositories have their own documents, such as product-local `AGENTS.MD`, `docs/workflow/TASK_TRACKER.md`, `docs/workflow/HANDOFF.md`, and `docs/memory/FAILURE_MEMORY.md`; legacy product `AGENT.md` is a migration target.

## Why This Exists

AI-driven development works best when the agent can inspect clear context instead of guessing.
These documents give the agent a stable map:

- rules that must not be broken,
- design intent,
- current progress,
- restart notes,
- durable maintainer preferences,
- reusable procedures.

For a learner, the documents are not homework.
They are the shared workspace that lets a learner and an agent keep the same understanding over time.

## Agent Rulebook

`AGENTS.MD` is the first file an agent should read in this repository.
It is the lesson-side agent rulebook.

It contains:

- invariant rules,
- the document root table,
- the routing table,
- repo-local skills,
- standard checks.

Important distinction:

- Lesson-side `AGENTS.MD` belongs to this lesson repository.
- Product-side `AGENTS.MD` belongs to a product repository created by a learner.
- Product-side `AGENT.md` is legacy drift that should be migrated after product `AGENTS.MD` is validated.

Do not merge these roles.
The lesson repository teaches and controls the workflow.
The product repository records product-specific context.

## Design Documents

The design documents live in `docs/as-built/`.

| File | Plain-language role |
| --- | --- |
| `docs/as-built/REQUIREMENTS.md` | What this lesson repository must provide |
| `docs/as-built/SPECIFICATION.md` | How the repository behavior is specified |
| `docs/as-built/IMPLEMENTATION_PLAN.md` | How the repository is implemented and verified |

These documents are useful when a learner asks:

- What are we trying to build or improve?
- What behavior should exist?
- What should be changed first?
- How do we know the change is complete?

## Design System Documents

Design-system documents live in `docs/design-system/`.

| File | Plain-language role |
| --- | --- |
| `docs/design-system/dashboard-control-center/DESIGN_SYSTEM.md` | Visual, interaction, accessibility, and safety-display rules for Repository Control Center and Dashboard Control Center screens |

This document is useful when a developer asks:

- Why do status badges, cards, source chips, tooltips, or glossary details need to look consistent?
- Which information should appear first for non-engineers?
- How should raw file paths, commands, and technical IDs be exposed without overwhelming the main UI?
- How do we keep command previews display-only and Settings as the only mutation surface?

## Workflow Documents

The workflow documents live in `docs/workflow/`.

| File | Plain-language role |
| --- | --- |
| `docs/workflow/TASK_TRACKER.md` | What is done, in progress, planned, or blocked |
| `docs/workflow/HANDOFF.md` | How to restart the work safely later |
| `docs/workflow/GIT_HOOKS_POLICY.tsv` | Which Git hook modes exist and which mode is the default |
| `docs/workflow/GIT_HOOK_CHECKS.tsv` | Which checks run in each Git hook mode |
| `docs/workflow/GIT_HOOK_RECOMMENDATION_PATHS.tsv` | Which changed files should make the agent recommend local `full --no-cache` verification |
| `docs/workflow/REPOSITORY_DOCUMENT_SYNC.md` | How parent PR/push changes require category-relevant document updates without scanning child repositories |
| `docs/workflow/REPOSITORY_DOCUMENT_SYNC_POLICY.json` | Machine-readable parent path classifications and required document groups |
| `docs/workflow/INSTRUCTION_MEMORY.md` | Parent A-F development fallback used only when an eligible target has no valid local instruction-memory file |
| `docs/workflow/DEVELOPMENT_INSTRUCTION_POLICY.tsv` | AGENTS invariant authority plus procedural local-first resolution, exact-absence fallback, eligibility, version, path, operation-mode, and Settings locators |
| `docs/workflow/DEVELOPMENT_AUTONOMY_WORKFLOW.tsv` | Data-driven A-F stage mapping, write scope, continuation, Git policy, and stop conditions |
| `docs/workflow/next-workflow/*.json` | Versioned next-workflow contracts for lifecycle, team/Agent security, providers, parent-child authority, context/impact, state storage, and shadow compatibility |
| `learning/NEXT_WORKFLOW_*.json` | Repository-local next-workflow activation, Agent selection, provider-family, public release-trust, and repository-identity settings; private signing material is never stored here |
| `learning/GIT_HOOK_SETTINGS.tsv` | The current local Git hook mode selected for this workspace |

These two files should be treated as a pair.
If one changes, check whether the other should change too.

The pair helps answer:

- Where are we now?
- What changed recently?
- What should happen next?
- What should a future agent know before continuing?
- Which Git checks run automatically before commit?

Instruction-memory priority is deliberately one-way: a valid target-local file
owns its procedure; only exact absence can select the parent fallback. The
resolver does not merge both documents, does not repair a child by writing a
copy, and does not apply to structured lesson workflow kinds.

The next-workflow runtime remains fail-closed until the exact repository and
immutable Git candidate pass the external owner-trust bootstrap, signed source
and release evidence, ordered activation transitions, recovery closure, PR/main
CI, and local/remote synchronization. `tools/next-workflow` provides read-only
projection, catalog, health, activation, and release status plus guarded
mutation and release commands. Read-only commands do not initialize repository
identity or SQLite state. Production entry is accepted only through the
externally installed launcher; direct repository CLI invocation cannot claim
Production authority. The remaining Control Center presentation work is
recorded as paused in `TASK_TRACKER.md` and `HANDOFF.md`; partial UI artifacts
are neither required nor accepted as activation evidence.
The launcher's installation manifest gets its local checkout instance from the
ignored checkout-identity owner, not from the tracked repository identity
configuration. Bounded Owner actions read that same identity without creating
it, while the installed wrapper pins the verified Controller base.

`REPOSITORY_DOCUMENT_SYNC_POLICY.json` also classifies Next Workflow core
changes explicitly. Their PR or push range must include the complete as-built,
instruction, verification, Security, CI/hook, and workflow-state authority set.
This strict synchronization remains local to the parent repository and does
not inspect TraceCue, FrameCue, or another registered child checkout.

The protected non-UI runtime is implemented by the versioned migrations and
the runtime, trust, containment, lifecycle, task-delivery, model-selection,
release-signing, source-receipt, and headless-team owners under
`tools/lib/next_workflow/`. `./tools/next-workflow runtime isolation-check`
reports prerequisites without installing them. `tools/test_next_workflow.sh`
is the focused aggregate; environments with real isolation run containment
fixtures, while environments without it must pass the explicit guided-refusal
path. After the exact signed Activation completes, the installed external
launcher can run L1 as one Orchestrator or L2-L5 as the admitted
Orchestrator/Lead/Task Agent hierarchy without waiting for the Control Center.
Bootstrap regression remains runnable on CI hosts without Codex by creating a
private non-executed executable-layout fixture inside the test directory.
Operational discovery is unchanged and requires the real installed native
provider binary; the fixture is never an installation or Activation source.
Unlike the non-executed provider descriptor, containment executables are never
simulated. CI without fixed-path Bubblewrap or unshare marks positive bootstrap
as prerequisite-skipped and still verifies the separate safe-stop guidance.
The installed-launcher integrity suite also uses that private provider
descriptor for signed fixture construction only; its wrapper commands never
launch the descriptor and run only when real containment is present.
Provider discovery has its own complete CLI/native fixture with an injected
runner; it proves pinning and rejection without becoming an installed provider.
Development-selection discovery reuses that fixture shape for portable
model/effort assertions, never as an operational provider.
Operational provider discovery instead uses the pinned real executable under a
private `/tmp` tmpfs while the host root remains read-only; the real
Bubblewrap path is covered by the focused aggregate when prerequisites exist.
`release.mjs` and `store.mjs` also own candidate roll-forward: a different
candidate restarts at `shadow`, repeats the complete signed lifecycle, and
becomes usable only after the newest record is enforced. The release regression
keeps prior records and rejects direct skips, same-candidate rewind, rolled-back
restart, and incomplete cycle revisions.

## Memory Documents

The lesson memory documents live in `docs/memory/`.

| File | Plain-language role |
| --- | --- |
| `docs/memory/DEVELOPER_MEMORY.md` | Optional Git-ignored local temporary notes; never a permanent source of truth |
| `docs/memory/SESSION_MEMORY.md` | Optional Git-ignored local session notes; never a permanent source of truth |

These two lesson-side files may be absent in a fresh clone. Durable intent, policy, requirements, and handoff state must be recorded in the tracked authoritative documents instead.

Product repositories may also use memory documents.
For example, a product-side `docs/memory/FAILURE_MEMORY.md` records failures, recovery steps, and prevention notes.

This lesson repository does not currently have a lesson-side `docs/memory/FAILURE_MEMORY.md`.
When the lesson discusses failure memory, it means product-side `docs/memory/FAILURE_MEMORY.md` or failure-recovery records used in lesson practice.

## Learner Context Documents

Learner context documents live in `learning/context/`.

| File | Plain-language role |
| --- | --- |
| `learning/context/README.md` | Explains how learner context is organized and how future lesson work should use it |
| `learning/context/AI_DRIVEN_DEVELOPMENT_FOUNDATION.md` | Provides the main conceptual text for AI-driven development lessons |
| `learning/context/SECURITY_FOUNDATION.md` | Provides staged security context for 7-day, 14-day, and applied lessons |
| `learning/context/LESSON_CONTEXT_MAP.tsv` | Maps context topics to lesson openings, per-topic explanations, recaps, and dashboard candidates |

These documents are source context for lesson text.
They are not proof that runtime lesson output has already changed.
Future implementation work should connect this context to lesson commands, prompts, dashboards, and review material while preserving selected display-language behavior.

## Skills

Repo-local skills live under `skills/*/SKILL.md`.

They are reusable procedures for the agent, not extra reading assignments for the learner.
For example:

- `skills/lesson-sync-gate/SKILL.md` explains synchronization-gate validation.
- `skills/worklog-doc-sync/SKILL.md` explains how to keep work logs and design documents aligned.

When a skill points to `references/*.md`, that reference file is part of the same route and must be read through the parent `SKILL.md`.

Skills help the agent repeat the same workflow consistently.

## Prompt Examples

Use these prompts when the document set feels overwhelming.

```text
Read docs/workflow/TASK_TRACKER.md and docs/workflow/HANDOFF.md.
Explain the current progress, what was completed, and the next safe action in plain language.
Do not edit files yet.
```

```text
Read docs/as-built/REQUIREMENTS.md, docs/as-built/SPECIFICATION.md, and docs/as-built/IMPLEMENTATION_PLAN.md.
Explain what each document is responsible for and whether they describe the same planned or implemented state.
Do not edit files yet.
```

```text
Read AGENTS.MD.
Explain the invariant rules, document root, routing table, and repo-local skills in learner-friendly language.
Do not edit files yet.
```

## CLI Tour

The command-line tour is:

```bash
./tools/check_document_root.sh
./tools/docs-tour status
./tools/docs-tour rules
./tools/docs-tour design
./tools/docs-tour workflow
./tools/docs-tour memory
./tools/docs-tour skills
./tools/docs-tour all
```

The tour adapts its explanation depth to the current learning mode when a mode has been selected:

- A: fuller explanations with purpose, benefit, and examples.
- B: concise explanations with short context.
- C: direct file names and purposes.

## Dashboard View

The dashboard view is:

```bash
./tools/dashboard docs
./tools/dashboard all
```

The docs view summarizes:

- document categories,
- key files,
- current workflow relevance,
- `TASK_TRACKER` and `HANDOFF` pair status,
- as-built synchronization status,
- the next recommended document action.

## Suggested Learning Order

For a first pass, use this order:

1. Read `AGENTS.MD` only enough to understand the rulebook role.
2. Read this document map.
3. Use `./tools/docs-tour status`.
4. Learn the as-built trio.
5. Learn the `TASK_TRACKER` and `HANDOFF` pair.
6. Learn developer memory after seeing a real improvement or problem recorded.
7. Learn skills when the lesson reaches reusable agent procedures.

The goal is not to memorize files.
The goal is to know which document to ask the agent about when you need context.

For Next Workflow runtime result safety, begin with the synchronized
post-exit identity settlement sections in the as-built trio and
`docs/workflow/INSTRUCTION_MEMORY.md`. They define the bounded transient wait,
immediate reuse handling, and persistent-unknown stop shared by the parent
authority documents.

For recovery authority, use the Owner reconciliation sections in the same
as-built and workflow documents. They distinguish the immutable external
Controller action from the Production launcher, which deliberately strips
Owner authority before Agent execution.

For terminal launch recovery, continue with the terminal reconciliation
sections. They explain why protected process absence and persisted launch
evidence may settle the spawn effect while the failed Agent result remains
rejected.
