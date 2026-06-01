# Product Document Reference

The product repository is separate from this lesson repository.
Before product-repository development, prompt the learner to open a separate Ubuntu/WSL CLI window for `$HOME/projects/task-tracker-repository/`.

Standard product files:

```text
AGENT.md
REQUIREMENTS.md
SPECIFICATION.md
IMPLEMENTATION_PLAN.md
TASK_TRACKER.md
HANDOFF.md
SESSION_MEMORY.md
FAILURE_MEMORY.md
DEVELOPER_MEMORY.md
index.html
style.css
app.js
README.md
```

## Roles

```text
REQUIREMENTS.md: what to build
SPECIFICATION.md: how it behaves
IMPLEMENTATION_PLAN.md: order of work
TASK_TRACKER.md: work progress
HANDOFF.md: next-session handoff
SESSION_MEMORY.md: session-specific facts
FAILURE_MEMORY.md: failures and recovery
DEVELOPER_MEMORY.md: stable developer preferences
```

## Sync Order

Initial setup:

```text
requirements -> specification -> implementation plan -> task tracker -> handoff
```

Feature change:

```text
task tracker -> handoff -> implementation -> requirements/specification/plan sync
```
