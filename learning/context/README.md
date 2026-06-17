# Learner Context Foundation

This directory contains source context for learner-facing AI-driven development lessons.
The files here are structured teaching source, and `tools/lesson-context` validates and renders read-only views from them.
Lesson commands can reference this context without treating the source documents as generated lesson text.

Repository source documents stay in English.
When a learner selects a workflow display language, the lesson facilitator or runtime output can translate and summarize this source context for that language.

## Files

| File | Role |
| --- | --- |
| `AI_DRIVEN_DEVELOPMENT_FOUNDATION.md` | The main learner-facing conceptual text for AI-driven development. |
| `SECURITY_FOUNDATION.md` | Staged security context for 7-day, 14-day, and applied lessons. |
| `LESSON_CONTEXT_MAP.tsv` | A machine-readable map that connects context topics to lesson phases. |

## How Runtime Lesson Work Uses This Directory

Use these documents in three lesson moments:

1. **Lesson opening**
   - Show the big picture before the learner starts the workflow.
   - Explain why AI-driven development uses documents, prompts, Git, tests, approvals, and review loops.

2. **Per-topic lesson guidance**
   - Show the matching context section when a lesson reaches that topic.
   - Add concrete examples, prompt examples, safety notes, and small checks.
   - Keep the explanation depth aligned with the selected learning mode.

3. **Final reflection**
   - Summarize what the learner can now do.
   - Connect structured lessons to Free Development Mode, applied lessons, and product improvement.

## Runtime Integration

Use `tools/lesson-context` for read-only runtime views:

- `tools/lesson-context status`
- `tools/lesson-context opening lesson-7|lesson-14|applied`
- `tools/lesson-context step lesson-7|lesson-14 <step_id>`
- `tools/lesson-context recap lesson-7|lesson-14|applied`
- `tools/lesson-context workflow free-development|product-improvement|external-integration|lesson-maintenance`

## Synchronization Rules

These context files are synchronized with the runtime context CLI and tests.
Future lesson-content work may decide how deeply each context topic is rendered in:

- `index.md`
- `index-14-days.md`
- `lesson/LESSON_FLOW.tsv`
- `lesson/LESSON_FLOW_14_DAYS.tsv`
- `tools/lesson`
- `tools/lesson14`
- `tools/dashboard`
- future browser dashboard views

Do not bypass `tools/lesson-context` when adding new runtime references.
Keep learning contexts and product workflow contexts separated by the two context maps.
