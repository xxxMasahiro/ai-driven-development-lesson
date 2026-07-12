---
name: product-development-workflow
description: Guide Settings-aware external product development. Use when Free Development, Product Improvement, or External Integration work needs proposal, planning, product document sync, implementation, verification, Git/CI phase selection, and cleanup boundaries without forcing Git or CI outside Dashboard Settings.
---

# Product Development Workflow

Use this skill for external product development through Free Development, Product Improvement, or External Integration.
It supports `AGENTS.MD`; it does not replace AGENTS.MD, `worklog-doc-sync`, `lesson-sync-gate`, product security gates, or Dashboard Settings.

## Required Sequence

1. Read `AGENTS.MD`.
2. Confirm repository context before any write:
   - lesson repository: `$HOME/projects/ai-driven-development-lesson/`
   - product repository: the configured product workspace
   - product work must use a separate Ubuntu/WSL CLI window before entering the product repository.
3. Read the Settings source of truth:
   - selected workflow menu
   - product Git usage mode
   - Git workflow action settings
   - target product repository
   - product profile and security context
   - product-local scaffold, including `skills/`, `tools/`, `docs/workflow/SECURITY.md`, and `docs/workflow/VERIFICATION.md`
   - resolved instruction memory: a valid target-local
     `docs/workflow/INSTRUCTION_MEMORY.md` first, otherwise the parent fallback
     only when the selected repository is parent-managed and the local path is
     exactly absent
4. Classify the request:
   - Free Development
   - Product Improvement
   - External Integration
   - Structured lesson product work in STEP 1-7, STEP 1-14, or Advanced Lesson keeps the lesson flow authoritative and uses product checks only as lesson gates, not as this full external-product workflow.
   - Lesson Repository Improvement routes to `skills/repository-development-workflow/SKILL.md`.
5. Structure the proposal with purpose, problems, scope, non-scope, existing-feature impact, required documents, tests, and risks.
6. Build the implementation plan with change targets, order, document synchronization policy, verification, recovery, and approval boundaries.
7. If product documents are involved, route to `skills/worklog-doc-sync/SKILL.md`.
8. If lesson gates, final sync gates, or STEP 1-14 synchronization are involved, route to `skills/lesson-sync-gate/SKILL.md`.
9. Implement in small slices and run the checks required by the product mode, security policy, and changed files.
10. Select the final phase from Settings:
    - `none`: no Git or CI phase is required; local product safety checks still apply.
    - `local`: proceed through local Git checks and commit when approved by the workflow.
    - `remote_sync`: proceed through push and sync according to approval settings.
    - `ci`: proceed through PR CI, merge, main CI, sync, and cleanup only when Settings and approvals allow it.

## Guardrails

- Dashboard Settings are the source of truth. Do not override them from skill text.
- Do not force Git, CI, commit, push, PR, merge, main CI, local/remote sync, or cleanup when the product Git usage mode does not allow that phase.
- `none` means Git/CI is not applicable; it does not mean no checks.
- Product workspace boundary, canonical product documents, scaffold checks, product-security checks, secret handling, external-integration approvals, and required local tests remain applicable.
- Product-local skills and tools are part of the standard product scaffold. Keep them product-scoped and minimal; do not copy lesson-repository development automation wholesale into product repositories.
- Never merge, generate, or overwrite product-local instruction memory from the
  parent fallback. A present invalid local file is a blocker, not an absence.
- External Integration must include external-service, API, OAuth, webhook, credential, and secret-handling boundaries before implementation.
- Destructive operations, product repository deletion, remote deletion, OAuth, credentials, secrets, and external-service authority changes need explicit developer approval.
- Do not add one-off branches for one product stack, exact phrase, menu, language, or special case.
- Preserve STEP 1-7, STEP 1-14, existing CI, existing checks, existing document routes, repo-local skills, and security gates.

## Validation

Use the standalone discovery and menu checks first:

```bash
./tools/check_agents_skills.sh
./tools/test_menu_prerequisites.sh
```

Then select product checks from the Settings mode and changed files, commonly:

```bash
./tools/product-security check --context <free-development|product-improvement|external-integration>
./tools/free-development gate
./tools/product-improvement gate
./tools/external-integration gate
```

Use Git, CI, PR, merge, main CI, sync, and cleanup commands only when the product Git usage mode and workflow action settings allow that phase.
Read `references/product-development.md` for the full operating protocol.
