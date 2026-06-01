---
name: worklog-doc-sync
description: Synchronize REQUIREMENTS.md, SPECIFICATION.md, IMPLEMENTATION_PLAN.md, TASK_TRACKER.md, and HANDOFF.md according to the lesson's initial-creation and change-management rules. Use when checking consistency, recording a change, starting a new feature/removal, completing implementation, or preparing final documentation sync.
---

# Worklog Doc Sync

## Sync Order

Initial creation:

```text
REQUIREMENTS.md
SPECIFICATION.md
IMPLEMENTATION_PLAN.md
TASK_TRACKER.md
HANDOFF.md
```

Later change:

```text
TASK_TRACKER.md
HANDOFF.md
implementation or deletion
REQUIREMENTS.md
SPECIFICATION.md
IMPLEMENTATION_PLAN.md
```

## Workflow

1. Read `AGENTS.MD`.
2. Confirm whether this is initial creation or later change.
3. Before product-repository development or product-document edits, prompt the learner to open a separate Ubuntu/WSL CLI window for `$HOME/projects/task-tracker-repository/`.
4. Read the existing related files before proposing edits.
5. Present an update plan before writing protected product documents.
6. Do not write unfinished decisions into the three design documents.
7. After sync, route to `skills/lesson-sync-gate/SKILL.md` for validation.

## References

Read `references/worklog-sync.md` for the non-engineer explanation and failure cases.
