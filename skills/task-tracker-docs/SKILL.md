---
name: task-tracker-docs
description: Create, review, and synchronize the task-tracker product repository documents used by the lesson. Use when working on REQUIREMENTS.md, SPECIFICATION.md, IMPLEMENTATION_PLAN.md, TASK_TRACKER.md, HANDOFF.md, AGENT.md, SESSION_MEMORY.md, FAILURE_MEMORY.md, DEVELOPER_MEMORY.md, or README.md for the task-tracker product, especially when converting learner answers into approved document drafts.
---

# Task Tracker Docs

## Workflow

1. Before product-repository development, prompt the learner to open a separate Ubuntu/WSL CLI window for `$HOME/projects/task-tracker-repository/`.
2. Confirm repository boundary:

```bash
pwd
git rev-parse --show-toplevel
```

3. If unsure, run the lesson-side boundary check from the lesson repository:

```bash
./tools/check_repository_boundary.sh
```

4. Read `templates/TEMPLATES.md`.
5. For initial creation, draft `REQUIREMENTS.md`, `SPECIFICATION.md`, and `IMPLEMENTATION_PLAN.md` first.
6. Record initial creation in `TASK_TRACKER.md` and `HANDOFF.md`.
7. For later changes, update `TASK_TRACKER.md` and `HANDOFF.md` first, implement, then sync the three design documents.
8. Present update proposals before editing protected product documents.

## Edit Policy

- `AGENT.md` and `DEVELOPER_MEMORY.md` may be agent-maintained according to lesson rules.
- Other product memory/history/design files require developer approval before writing.
- Keep learner-facing explanations short and non-engineer friendly.
- Keep generated product docs consistent with current implementation state.

## References

Read `references/product-docs.md` for the product-document roles and sync order.
