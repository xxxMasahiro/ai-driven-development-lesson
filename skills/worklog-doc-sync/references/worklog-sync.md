# Worklog Sync Reference

Product documentation has two roles:

Before product-repository development or product-document edits, prompt the learner to open a separate Ubuntu/WSL CLI window for `$HOME/projects/task-tracker-repository/`.

```text
REQUIREMENTS.md / SPECIFICATION.md / IMPLEMENTATION_PLAN.md: current design
TASK_TRACKER.md / HANDOFF.md: work history and restart context
```

Initial creation records design first, then work history.

Feature changes and removals record work history first, then update current design after implementation is complete.

## Consistency Checks

```text
TASK_TRACKER.md completed work matches implementation
HANDOFF.md next action matches current state
REQUIREMENTS.md describes current desired behavior
SPECIFICATION.md describes current actual behavior
IMPLEMENTATION_PLAN.md matches completed and remaining work
```
