---
name: learning-progress-helpdesk
description: Manage learner progress, restart handoffs, roadmap checks, and helpdesk consultation logs for the AI-driven development lesson. Use when the learner says they understood, are stuck, want to pause/resume, ask for the roadmap, or need learning progress recorded in the 7-day or 14-day lesson.
---

# Learning Progress Helpdesk

## Workflow

1. Read `AGENTS.MD`.
2. Decide whether the active lesson is 7-day or 14-day.
3. For 7-day learning records, use `tools/learn`.
4. For 14-day roadmap/helpdesk, use `tools/roadmap` and `tools/helpdesk`.
5. Record only when the learner asks for a record or a lesson gate requires it.
6. On resume, read current status and the latest handoff before asking the next question.

## Commands

```bash
./tools/learn 現在地
./tools/learn 記録 "内容"
./tools/learn つまずき "内容"
./tools/learn 中断 "内容"
./tools/roadmap status
./tools/helpdesk 相談 "内容"
./tools/helpdesk 解決 "内容"
./tools/helpdesk 一覧
```

## References

Read `references/progress-helpdesk.md` for file ownership and routing.
