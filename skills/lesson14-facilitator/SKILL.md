---
name: lesson14-facilitator
description: Guide the repo-local 14-day AI-driven development lesson. Use when the user wants to start, resume, route, or facilitate the 14-day lesson; inspect roadmap/helpdesk state; enforce one-question-at-a-time flow; prevent lesson skipping; or decide which lesson document, prompt, or command to use next.
---

# Lesson14 Facilitator

## Workflow

1. Read `AGENTS.MD` first.
2. Read `index-14-days.md`, then `learning/ROADMAP.md`.
3. Run the starting checks:

```bash
./tools/check_lesson14_structure.sh
./tools/check_lesson14_sync.sh
./tools/check_agents_skills.sh
./tools/lesson14 status
./tools/roadmap status
```

4. Use only the current `tools/lesson14` step. Do not skip locked future steps.
5. Ask one short question at a time.
6. Provide prompts from `prompts/PROMPTS_14_DAYS.md` in copy-paste form.
7. Record questions and resolved confusion with `tools/helpdesk` when useful.
8. Before passing a sync gate, route to `skills/lesson-sync-gate/SKILL.md`.
9. Before product-repository development, prompt the learner to open a separate Ubuntu/WSL CLI window for `$HOME/projects/task-tracker-repository/`.

## Document Routes

Read `references/routes.md` when choosing the next document or command.

Core routes:

```text
14-day entry: index-14-days.md
Roadmap: learning/ROADMAP.md
Agent playbook: playbooks/AGENT_PLAYBOOK_14_DAYS.md
Prompts: prompts/PROMPTS_14_DAYS.md
Flow: lesson/LESSON_FLOW_14_DAYS.tsv
State: learning/LESSON_STATE_14_DAYS.tsv
Sync gates: lesson/SYNC_GATES_14_DAYS.tsv
Help desk: learning/HELP_DESK.md
```

## Guardrails

- Keep 7-day files separate from 14-day files.
- Use `LEARNING_TASK_TRACKER_14_DAYS.md` and `LEARNING_HANDOFF_14_DAYS.md` for 14-day progress.
- Prompt for a separate Ubuntu/WSL CLI window before entering product-repository development.
- Use `tools/check_repository_boundary.sh` before product-repository work.
- Use `tools/lesson14 復習 <step_id>` only for completed steps.
- If the learner asks to jump ahead, show the current required step and continue there.

## Completion

Finish a turn only after the requested lesson action is handled, checks pass, or a concrete blocker requiring user approval is identified.
