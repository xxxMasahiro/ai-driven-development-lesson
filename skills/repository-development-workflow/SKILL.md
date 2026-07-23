---
name: repository-development-workflow
description: Guide policy-backed development inside this lesson repository. Use when turning developer wall discussion into proposals, implementation plans, document sync, implementation, focused verification, release gates, PR/main CI, local/remote sync, or approval-bound cleanup for the lesson repository itself.
---

# Repository Development Workflow

Use this skill for this repository's own development. It supports `AGENTS.MD`; it does not replace AGENTS.MD, `worklog-doc-sync`, or `lesson-sync-gate`.

## Required Sequence

1. Read `AGENTS.MD`.
2. Run or inspect:

```bash
./tools/repository-development-workflow status
./tools/repository-development-workflow list
./tools/repository-development-workflow instruction --stage A
```

3. Choose the current phase from `docs/workflow/REPOSITORY_DEVELOPMENT_WORKFLOW.tsv`:
   `context_triage`, `proposal`, `implementation_plan`, `fast_loop`, `mid_tests`, `release_gate`, or `main_sync_cleanup`.
4. For detailed steps, read `references/repository-development.md`.
5. Use `./tools/repository-development-workflow guidance --phase <phase_id>` before selecting checks.
6. Use `./tools/repository-development-workflow gate --phase <phase_id>` before moving to a stricter phase.
7. Resolve the A-F overlay for the current task. The parent fallback maps A-F
   onto the existing seven phases; it does not replace their checks or release
   proof. Use the runner dry-run before local execution:

```bash
./tools/repository-development-workflow detect
./tools/repository-development-workflow plan-run --phase fast_loop --check-set required
./tools/repository-development-workflow run --phase fast_loop --check-set required --execute
./tools/repository-development-workflow status --runs
./tools/repository-development-workflow next --phase fast_loop
```

8. Before directly launching a Lead Agent or Task Agent CLI, obtain the
   development-session advisory plan, display its exact selected model and
   native effort, pass those values explicitly, and verify the prepared
   configuration:

```bash
./tools/next-workflow agent-selection plan --agent <agent-id> --role <role-id> --rigor <L1-L5> --risk <risk> --complexity <complexity>
./tools/next-workflow agent-selection verify-config --plan <repository-bound-plan.json> --model <selected-model> --effort <selected-native-effort>
```

   A STOP or mismatch blocks that Agent launch. This read-only advisory step
   grants no launch or other authority and does not activate Production.
9. If product documents are involved, route to `skills/worklog-doc-sync/SKILL.md`.
10. If final lesson gates or STEP 1-14 synchronization are involved, route to `skills/lesson-sync-gate/SKILL.md`.

## Guardrails

- Existing-feature tradeoffs are forbidden.
- STEP 1-7, STEP 1-14, existing CI, existing checks, existing document routes, repo-local skills, and security gates remain authoritative.
- Fast implementation loops do not replace release proof.
- Runner records can support fast-loop and medium-test decisions only when fingerprints match; they are not release proof.
- `plan-run` is the default safe path. `run --phase ... --execute` is limited to allowed non-destructive local checks. The legacy `--approved` flag remains accepted but is not a separate requirement for normal work already inside the current developer-requested task scope.
- New checks must be standalone and aggregate-callable.
- Normal commit, push, PR/CI, eligible merge, main CI monitoring, and sync are
  narrowed by task scope and saved Git settings. Destructive cleanup, history
  rewrite, credentials, external authority, failed-CI merge, and scope
  expansion remain explicit stop conditions.
- Do not add fixed one-off branches for one product stack, phrase, menu, or case.

## Validation

Use the standalone check first:

```bash
./tools/check_repository_development_workflow.sh
./tools/test_repository_development_workflow.sh
./tools/check_development_instruction.sh
./tools/test_development_instruction.sh
```

Then use the workflow's recommended or required checks for the current phase. Release closure remains governed by the existing aggregate, full hooks, CI, and sync gates.
