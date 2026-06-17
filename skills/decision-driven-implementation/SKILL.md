---
name: decision-driven-implementation
description: Guide implementation from the user's decision and real evidence instead of superficial labels or placeholder behavior. Use when designing, revising, or reviewing UI, automation, documentation, workflows, reports, tests, or data-driven features that must help people make accurate operational decisions.
---

# Decision-Driven Implementation

Use this skill before implementing or revising any user-facing or decision-supporting behavior.
The goal is to make each change answer a real user question with trustworthy evidence, not merely rename components, restyle labels, or display plausible placeholders.

## Required Sequence

1. Define the user decision in one sentence.
   Use the form: "The user needs to decide whether/what/where/when/how to <action> for <target>."

2. Identify the decision frame:
   - actor: who is deciding
   - target: what object, record, repository, environment, document, or operation the decision concerns
   - next action: what the user can do after seeing the result
   - risk: what can go wrong if the information is wrong, stale, or vague

3. Choose the decision depth for each surface.
   - Overview or status surfaces should show one current-position statement, the selected target, and the last trustworthy observation or missing-evidence gap.
   - Detail or drilldown surfaces should show the evidence chain, timeline, files, commands, blockers, approvals, and next safe action that explain the overview.
   - Settings, help, history, and reference surfaces should explain meaning, impact, and change history for the user's decision, not repeat generic descriptions.

4. Map every visible claim to evidence.
   For each claim, record the source field, file, command, API response, database query, log, or runtime observation that proves it.
   If the source does not exist, mark the claim as unavailable and either implement the producer first or show a precise gap. Do not invent certainty from labels, timestamps, fixtures, or aggregate status alone.

5. Design the output around the decision.
   Put the strongest decision signal first. Show supporting details only when they help the user choose the next action.
   Prefer concrete statements such as "uncommitted changes exist", "remote is behind", "approval is missing", "evidence is stale", or "no blocking failure was observed" over category labels such as "sync", "status", "evidence", or "security".

6. Treat operational checks as progress signals.
   For CI, local tests, synchronization, security gates, approvals, and publication flows, the primary display should answer "what is being checked or progressing now" at a stable level.
   Avoid top-level lifecycle checklists or log dumps when the user only needs the current position. Put detailed steps, run links, command output, and historical rows in the detail surface.

7. Implement from the owner layer outward.
   Update data producers, schemas, fixtures, localization, and tests before or alongside UI rendering.
   A UI-only change is acceptable only when the required evidence already exists and the change does not imply new facts.

8. Write acceptance checks as user decisions.
   A passing check should prove that the user can identify the target, current state, last trustworthy observation, missing evidence, next action, and risk.
   Include negative checks for wrong target, stale data, repeated generic details, fixed fallback values, and unavailable sources.

9. Use independent review for complex or high-risk surfaces.
   Ask reviewers or subagents whether the result supports the decision, which claims lack evidence, and what a non-expert would misunderstand.
   Reconcile their findings against the user decision instead of treating all suggestions as equal.

10. Report the outcome in decision terms.
   State what decision is now supported, which evidence drives it, what remains unavailable, and which checks were run.

## Guardrails

- Do not treat label changes, visual polish, or component reshuffling as implementation unless they improve the decision.
- Do not show the same explanation for different rows, links, files, commands, or statuses unless they genuinely share the same meaning.
- Do not use fixed timestamps, generated-looking activity, generic "latest" claims, or placeholder links as evidence.
- Do not collapse distinct lifecycle steps into one vague status when users need to distinguish preparation, execution, review, approval, publication, synchronization, or cleanup.
- Do not expand a summary surface into many lifecycle rows when the user needs a concise current-position signal.
- Do not hide uncertainty behind "unknown", "not collected", or "manual check" without explaining what was not checked and what would make it trustworthy.
- Do not ask the user to run a command from a decision surface when the surface's purpose is to answer that question. Show the command only as a producer gap or next safe action when the system cannot yet collect the evidence.
- Do not add one-off branches for a single name, phrase, language, product, repository, environment, or fixture. Prefer reusable producers and interpreters.
- Do not weaken existing safety, approval, synchronization, or verification boundaries to make a surface look complete.

## Review Checklist

Before considering the implementation complete, verify:

- The primary display answers a real user decision, not a component category.
- The selected target is visible and cannot silently fall back to another target.
- Overview and detail surfaces have distinct jobs: overview gives current position; detail proves and explains it.
- Each important claim has a traceable source or a clear unavailable reason.
- The user can see what changed, what was checked, when it was checked, and what action is safe next.
- CI, local tests, synchronization, safety, and approval surfaces show progress in decision terms, not raw process theater.
- Missing data is represented as a gap in the system, not as a polished status.
- Tests fail if the wrong target, stale evidence, repeated generic detail, or placeholder value appears.
