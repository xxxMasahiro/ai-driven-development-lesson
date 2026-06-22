# Developer Memory

## Dashboard Control Center: Dashboard Page Direction

STATUS: initialized-and-synced

This developer memory has been initialized for the current Control Center redesign work.
All previous developer-memory entries were intentionally removed by developer instruction.

This entry records the current Dashboard page direction as the English source text.
The Dashboard page, Development Workflow page, Maintenance Sync page, and Safety Confirmation page directions are synchronized.

### Original English Text

The Control Center dashboard must not be rebuilt as a larger collection of static cards.
It must be rebuilt as a producer-owned Decision Snapshot that answers one practical question first:

Can the current workflow safely continue now?

The top dashboard must show whether the selected workflow can continue, needs confirmation before continuing, or must stop.
It must also show the reason, the selected target, the latest reliable observation, the primary blocker when one exists, and the next safe action.

The browser UI must not calculate readiness from labels, colors, route names, or display depth.
The producer must calculate the decision.
The UI must render that producer-owned decision.

The source of truth for this direction is the dashboard data producer and schema:

- `tools/dashboard-data`
- `docs/workflow/DASHBOARD_DATA_SCHEMA.tsv`

Existing fields such as `operational_decision`, `decision_pages`, `development.repository_changes`, `development.product_authority`, `documents.brief_cards`, and `live_status.checks` should be strengthened and normalized rather than replaced with an unrelated second source of truth.

If a new normalized view is added, it should be named generically, such as `repository_status_snapshot`, and should remain additive and backward-compatible while the existing dashboard contract is preserved.

### Required Dashboard Role

The top dashboard is the control tower.
It is not the place for raw evidence dumps.
It is not the place for generic missing-evidence labels.
It is not the place for repeated "not collected", "manual confirmation", or "optional check" text unless those states are directly relevant to the decision.

The top dashboard must show:

- whether work can safely continue;
- what is currently selected;
- what was most recently completed or observed;
- what remains or what must be decided next;
- whether Git, PR, CI, tests, documents, and safety boundaries support the decision;
- whether any blocker prevents safe continuation;
- where to open the detailed evidence.

Detailed pages remain the place for full evidence, history, source IDs, artifacts, run IDs, command previews, and technical diagnostics.

### Dashboard Sections

The top dashboard should be organized around these generic sections:

| Section | Purpose |
| --- | --- |
| Primary Decision | Show continue, confirm first, or stop, with the main reason and next safe action. |
| Current Work | Show the latest completed task, current resume target, remaining work, and restart readiness. |
| Docs and Worklog | Show whether requirements, specification, implementation plan, task tracker, and handoff are aligned. |
| Git, PR, and CI | Show branch, HEAD, worktree state, local/remote sync, PR state, and CI result when available. |
| Tests | Show the latest local, product, build, E2E, or focused checks, plus skipped-test reasons. |
| Safety | Show dangerous-operation boundaries, external send boundaries, credentials, approvals, and provider or MCP expansion state. |
| Blockers | Show stop conditions, unblock conditions, and the detail page that explains them. |
| Observations | Show supporting notes such as build warnings, CI annotations, chunk warnings, or known limitations. |

The top dashboard should not show every available detail at equal weight.
It should show one primary decision, then the most important supporting facets.

### Generic Data Model Direction

The normalized snapshot should be generic and must not contain fixed product names, repository names, paths, URLs, task IDs, PR numbers, thresholds, or product-specific branches.
All such values must come from selected context, repository registry, product profile, manifests, documents, Git observation, CI evidence, or structured evidence.

A generic normalized snapshot should contain these concepts:

```json
{
  "snapshot_id": "...",
  "generated_at": "...",
  "scope": {
    "menu_id": "...",
    "workflow_context": "...",
    "repo_id": "...",
    "repository_role": "lesson_repository|product_repository|selected_repository",
    "repository_display_name": "...",
    "product_type": "...",
    "selection_state": "explicit|fallback|request|not_applicable"
  },
  "decision": {
    "question": "Can the current workflow safely continue?",
    "status": "ready|blocked|manual_required|stale|unknown|not_applicable",
    "confidence_level": "high|medium|low|none",
    "authority": "authoritative|manual_required|advisory|not_collected",
    "freshness_state": "current|stale|not_collected|unknown",
    "primary_blocker_ref": "...",
    "next_safe_action": "...",
    "approval_boundary": "...",
    "risk_level": "low|medium|high|critical"
  },
  "facets": [
    { "id": "worklog", "roles": ["task_tracker", "handoff"], "status": "...", "evidence_refs": [] },
    { "id": "product_docs", "roles": ["requirements", "specification", "implementation_plan"], "status": "...", "evidence_refs": [] },
    { "id": "repository", "status": "...", "head": "...", "dirty_count": 0, "evidence_refs": [] },
    { "id": "git_pr_ci", "status": "...", "head_match_status": "...", "evidence_refs": [] },
    { "id": "tests", "status": "...", "evidence_refs": [] },
    { "id": "safety", "status": "...", "evidence_refs": [] },
    { "id": "observations", "status": "...", "evidence_refs": [] }
  ],
  "evidence_refs": [
    {
      "ref_id": "...",
      "source_type": "live_observation|structured_evidence|document_report|policy|setting",
      "owner_source": "dashboard-data|product-authority|git-workflow|repository-development-workflow",
      "source_id": "...",
      "document_role": "...",
      "status": "...",
      "authority": "...",
      "freshness_state": "...",
      "confidence_level": "...",
      "observed_at": "...",
      "repository_head": "...",
      "source_hash": "...",
      "artifact_ref": "...",
      "command_preview": "..."
    }
  ],
  "conflicts": [
    {
      "fact_id": "...",
      "winner_ref": "...",
      "losing_refs": [],
      "reason": "..."
    }
  ]
}
```

### Evidence Priority

Evidence priority depends on the fact being decided.

| Fact | Priority |
| --- | --- |
| Current worktree, branch, HEAD, dirty count, ahead, and behind | live observation, then structured evidence, then document report |
| CI and test pass proof | structured evidence, then live observation, then document report |
| Requirements, specification, and implementation intent | document report, then structured evidence |
| Task tracker and handoff progress or restart point | document report with source hash, then live observation |
| Safety boundaries, approvals, dangerous operations, secrets, and external sending | policy and structured safety evidence first |
| User-facing summary | normalized producer decision, then evidence references |

Live observation is strong for current state.
It is weaker as completion proof.
Document reports are strong for intent and handoff context.
They are weaker as current Git, CI, or test proof.

The dashboard must make this distinction visible.
It must not treat a document statement, a stale evidence row, or an advisory observation as authoritative proof.

### Confidence Levels

The producer should provide a structured confidence level.

| Confidence | Meaning |
| --- | --- |
| high | Current authoritative evidence exists and matches the selected repository and HEAD when applicable. |
| medium | Current advisory live observation exists, or a document hash is current but no authoritative proof exists. |
| low | Document-only, cached, manual-required, or head-unknown evidence. |
| none | Missing, not collected, or unknown evidence. |

The UI should display the confidence level.
It should not infer it.

### Display Modes

The existing display-depth model should be used as the audience model:

| Display depth | Intended audience | Dashboard behavior |
| --- | --- | --- |
| friendly | Non-engineers | Show whether to continue, why, and where to look next. Hide source IDs, HEADs, run IDs, and artifact paths by default. |
| standard | Beginner engineers | Show Git, tests, CI, documents, blockers, and command previews in familiar terms. |
| technical | Intermediate engineers and above | Show source IDs, authority, freshness, current item IDs, HEAD matching, artifact refs, and detailed evidence. |

Non-engineer display must not hide blockers.
It should translate blockers into plain language.
Technical display must not obscure safety boundaries.

### Top Dashboard Layout Direction

The top dashboard should be reorganized into:

1. Primary Decision Snapshot
2. Compact controls row for display depth, selected product repository, and language or settings link
3. Key evidence mini cards for Git/CI, Tests, Safety, and Worklog/Docs
4. Blocker strip when blockers exist
5. Detail links into Workflow, Maintenance Sync, Safety Confirmation, Repository Info, Documents, Settings, and History

The current duplicated top-level summaries should be reduced.
The same Git, CI, Safety, and next-action data should not be repeated in multiple unrelated blocks.

Every mini card should have a consistent detail path.
If a card summarizes Git or CI, it should link to Development Workflow or Repository Info.
If a card summarizes safety, it should link to Safety Confirmation.
If a card summarizes documents or handoff, it should link to Maintenance Sync or Documents.

### Detail Page Relationship

The top dashboard must aggregate.
The detail pages must explain.

| Detail page | Required role |
| --- | --- |
| Development Workflow | Show current work, local checks, Git state, PR, CI, merge, main sync, and next safe workflow operation. |
| Maintenance Sync | Show document sync, evidence freshness, source hashes, stale sources, update targets, and repository synchronization state. |
| Safety Confirmation | Show blockers, approvals, dangerous operations, secrets, external sending, provider, MCP, browser, shell, and credential boundaries. |
| Repository Info | Show selected repository identity, branch, HEAD, worktree, structure, and key source files. |
| Documents | Show document roles, paths, readiness, freshness, and relationship to the selected repository. |
| Settings | Show display language, display depth, repository selection, Git/CI mode, and safety boundaries. |
| History | Show when data changed, what was observed, what failed, and which evidence was refreshed. |

The top dashboard and detail pages must use the same evidence references.
They must not tell different stories.

### Safety Boundaries

The dashboard remains a display and decision-support surface.
It must not directly perform Git push, merge, cleanup, destructive operations, OAuth, credential handling, provider dispatch, external sending, or external repository writes.

Command previews may be shown.
Execution authority remains outside the dashboard UI and must follow the repository workflow, approval, and safety rules.

### Implementation Roadmap Draft

#### P0: Contract Freeze

Define the acceptance criteria for the Decision Snapshot.
Before adding UI, identify which fields are already available through `operational_decision`, `decision_pages`, `development.repository_changes`, `documents.brief_cards`, `product_authority`, and `live_status.checks`.

The producer must own:

- `status`
- `confidence_level`
- `authority`
- `freshness_state`
- `primary_blocker_ref`
- `next_safe_action`
- `risk_level`
- `evidence_refs`

#### P1: Evidence Normalization

Add a thin producer adapter that projects existing data into common evidence references:

- document brief cards
- repository changes
- product authority evidence
- live status checks
- CI evidence
- maintenance evidence rows
- selected context blockers

The adapter must be generic and must not contain fixed product names, repository names, paths, PR numbers, or task IDs.

#### P2: Decision Computation

Compute the top-level decision in the producer.

The decision must distinguish:

- current live state;
- authoritative proof;
- document report;
- stale evidence;
- missing evidence;
- advisory observation;
- blockers;
- approval boundaries.

If evidence conflicts, record the conflict rather than hiding it.

#### P3: Overview Rebuild

Rebuild the Overview page around the normalized snapshot:

- one Primary Decision Snapshot;
- compact controls row;
- Git/CI, Tests, Safety, and Worklog/Docs mini cards;
- blocker strip;
- detail links.

Remove duplicated top-level summaries that repeat the same decision in different words.

#### P4: Detail Page Alignment

Align Development Workflow, Maintenance Sync, and Safety Confirmation with the same evidence references.
Each detail page must show:

- current judgment;
- why;
- evidence;
- next safe action;
- source and confidence details when display depth allows.

#### P5: Display Mode and Localization

Make the same snapshot render differently for friendly, standard, and technical modes.
Apply the configured dashboard language.
Known producer text may be localized only when the meaning is controlled by the dashboard contract.
Dynamic repository text should be summarized or translated through the approved agent/provider boundary only when that boundary is implemented.

#### P6: Design System Alignment

Apply visual changes through the Dashboard Control Center design system source of truth.
Do not directly edit generated design-system artifacts.
Move card density, status variants, icon treatments, and Decision Snapshot variants into the design-system contract when visual changes are needed.

#### P7: Verification

Use focused checks first:

- shell syntax for changed scripts;
- dashboard schema test;
- dashboard data test;
- dashboard i18n test when text changes;
- dashboard control-center test when React changes;
- design-system drift check when design-system sources change.

Use Playwright visual checks for desktop and mobile after the Overview structure changes.
Use TraceCue or external browser review only as read-only review.
External repositories must not be modified during dashboard review.

### Stop Gates

Stop before implementation proceeds if any of the following occurs:

- UI begins calculating readiness instead of displaying producer-owned readiness.
- A fixed product name, repository name, PR number, task ID, URL, absolute path, or threshold is introduced.
- Stale, advisory, missing, or document-only evidence is displayed as authoritative proof.
- CI is shown as passed without matching HEAD, current freshness, and authoritative source.
- STEP 1-7, STEP 1-14, free development, product improvement, external integration, or lesson repository improvement contexts are mixed.
- External repository writes, push, merge, cleanup, OAuth, provider API, or destructive actions become necessary.
- Playwright or TraceCue review shows selected-repository leakage, stale evidence presented as current, command previews that look executable, or overflow/overlap in the top dashboard.

### Deferred Memory Sections

No detail-page directions remain reserved for later synchronization in this initialized developer memory.

## Dashboard Control Center: Development Workflow Page Direction

STATUS: synced

This section records the Development Workflow page direction. It extends the Dashboard page direction above and must remain consistent with the Dashboard Control Center source-of-truth rules, repository-development workflow, design-system contract, producer-owned evidence boundary, localization policy, and changeability invariant.

### Page Purpose

The Development Workflow page should be the evidence-backed current-position page for development decisions.
If the top Dashboard page is the overall signal, the Development Workflow page explains why the selected workflow is in its current state and what can safely happen next.

The page must answer five questions:

1. What is the current development target?
2. What was most recently completed?
3. Are requirements, specifications, implementation plans, task tracking, and handoff context synchronized?
4. Is there any next autonomous work that can safely proceed?
5. Which verification evidence supports the completion or continuation judgment?

The page must not become a generic activity feed.
It must help a developer decide whether to continue implementation, prepare a new proposal, repair evidence, inspect Git and CI, or stop for approval.

### Required First-Viewport Judgment

The first viewport must lead with the next decision, not with background explanation.
It should show:

- current judgment: continue, confirm first, closed, blocked, or stop;
- selected target scope: workflow context, repository identity, branch or HEAD when relevant, and selection source;
- latest reliable observation, including source and observed time;
- autonomous continuation state: allowed, not allowed, or approval required;
- top reason or blocker;
- next safe action.

Friendly, standard, and technical display depths must show the same truth with different disclosure density.
Friendly mode should hide technical IDs, hashes, run IDs, source paths, and command previews unless the user opens details.
Technical mode may show evidence chains, HEAD matches, source IDs, command IDs, CI run metadata, and file references.

### Required Sections

The page should organize its body around these sections:

- Current Position
- Latest Completed Task
- Roadmap Progress
- Documentation Sync
- Implementation Results
- Verification Results
- Next Decision
- Evidence Links

The lead summary should prioritize Next Decision and Current Position.
Latest Completed Task and Roadmap Progress should support the current judgment, not replace it with a historical list.
Implementation Results must explain what changed and whether that work is complete.

### Data Contract Direction

The FrameCue FC-208 example is useful as a current-state example only.
Task IDs, product names, repository names, PR numbers, CI run IDs, branch names, file paths, URLs, command strings, and thresholds must be data-derived and configurable.
They must not be hard-coded in React, shell scripts, schema defaults, tests, fixtures, or prose-specific branches.

Before rendering the full Development Workflow page, add or align a producer-owned workflow state contract.
The preferred shape is a structured object such as `workflow_state` generated by `tools/dashboard-data` and validated by the dashboard data contract.
It should expose:

- `current_target`
- `latest_completed`
- `roadmap_progress`
- `document_sync`
- `implementation_results`
- `verification_results`
- `handoff_readiness`
- `next_autonomous_decision`
- `evidence_links`

Each item that can influence a decision must include enough evidence metadata to avoid UI inference:

- stable id;
- label and localized label key when controlled by the dashboard;
- status;
- source id;
- selected repository id;
- observed time;
- freshness state;
- authority level;
- related evidence reference;
- next safe action;
- optional command id and redacted arguments for display-only command previews.

The browser must display this producer-owned state.
It must not calculate readiness from colors, labels, section order, source names, route names, or matched prose.

### Source Mapping

The producer should derive current state from structured sources first:

- selected context and repository selection for scope;
- lesson or workflow state files joined with their flow definitions for current target;
- structured task or workflow rows for latest completed work and roadmap progress;
- requirements, specification, implementation plan, task tracker, and handoff sync checks for document state;
- product authority and repository authority evidence for product workflow readiness;
- Git worktree, branch, remote sync, PR, merge, and main synchronization evidence for repository operations;
- local test, focused check, aggregate check, PR CI, and main CI evidence for verification;
- security, approval, and dangerous-operation policies for autonomous continuation boundaries.

Markdown documents may remain human-readable sources, but the dashboard should not depend on brittle prose parsing for authoritative workflow decisions.
If Markdown content is still needed during migration, display it as advisory or summarized context and expose the weaker authority or freshness state.

### Git, PR, CI, and Test Evidence

Git and CI evidence should be structured separately instead of folded into one generic status.
The page should distinguish:

- branch and upstream;
- worktree cleanliness and change counts;
- local and remote synchronization;
- pull request identity and state when available;
- PR CI status and matching HEAD;
- main CI status and matching HEAD;
- merge state;
- branch cleanup state when applicable;
- local test commands and latest results;
- visual checks and why they were run or skipped.

CI must not be shown as passed without matching current HEAD, freshness, and authoritative source.
Missing, stale, cached, manual-required, or advisory evidence must remain visibly different from proof.

### Documentation, Task Tracker, and Handoff

The page must show what the selected repository's task tracker and handoff currently say, not generic explanations of what those documents are.
It should summarize:

- latest completed task or phase;
- remaining task or next target;
- whether the handoff is sufficient for the next session;
- whether the task tracker, handoff, requirements, specification, and implementation plan agree;
- which exact source rows or sections support the summary when display depth allows.

The page should avoid checklist progress labels that do not help the developer decide what to do next.
The key decision is whether the next session can resume safely from the recorded handoff and implementation plan.

### AI Summary and Localization Boundary

AI-style summaries may improve readability, especially for dynamic repository prose and multilingual display.
However, AI summaries are explanatory display text only.
They must not become the authority for readiness, completion, approval, CI state, Git state, command execution, or safety boundaries.

Language settings must apply to dashboard-controlled labels and summaries.
Dynamic repository text may be summarized or translated only through the approved agent or provider boundary when that boundary is implemented.
Until then, dynamic text should be displayed with clear source and authority metadata instead of pretending to be fully localized proof.

### Cross-Page Responsibilities

The Development Workflow page should link to related detail pages instead of duplicating everything:

- Maintenance Sync for document synchronization, evidence freshness, source hashes, and stale sources;
- Safety Confirmation for approvals, blockers, dangerous operations, credentials, provider, MCP, browser, shell, and external-send boundaries;
- Repository Info for repository identity, branch, worktree, and file scope;
- History for observed events and evidence timelines;
- Documents for source document review.

The Dashboard Overview should remain the aggregate signal.
The Development Workflow page should provide the evidence-backed workflow current position.

### UI and Implementation Direction

Do not continue growing the Development Workflow page as ad hoc logic inside `App.jsx`.
Extract workflow-specific rendering and derivation into focused components and helpers while preserving the existing route, stale snapshot handling, selected-context handling, shared status components, and detail surfaces.

Use the Dashboard Control Center design-system source of truth for visual changes.
Reuse existing page headers, operational cards, status pills, source chips, command previews, detail surfaces, and decision summary patterns before introducing new page-local UI rules.

Card details must be useful.
Opening a detail surface should show where the claim came from, why it matters, what is missing or stale, and the next safe check.
It should not repeat a static definition of the card title.

### Acceptance Criteria

The Development Workflow page is acceptable when:

- the first viewport answers current target, current judgment, latest reliable observation, autonomous continuation, top reason, and next safe action;
- every readiness or completion claim maps to producer-owned data;
- selected repository scope does not leak across free development, product improvement, external integration, lesson workflows, or lesson-repository maintenance;
- friendly, standard, and technical display depths show the same state with appropriate detail density;
- configured dashboard language applies to dashboard-controlled text;
- stale, missing, cached, manual-required, and advisory evidence cannot appear as ready proof;
- task tracker and handoff summaries reflect the selected repository's current state;
- Git, PR, CI, tests, and synchronization evidence are separated enough for developer judgment;
- command previews are display-only and cannot be mistaken for executable controls;
- detail surfaces remain keyboard accessible and return focus correctly;
- tests cover ready, closed, approval-required, stale CI, missing repository selection, multiple repositories, no PR, multiple PRs, non-GitHub CI, missing task tracker or handoff, and selected-repository leakage.

### Implementation Roadmap

1. Confirm the information map for the Development Workflow page and map each visible section to an existing or new producer-owned field.
2. Add the `workflow_state` contract to the dashboard data schema only where existing fields are insufficient.
3. Generate `workflow_state` in `tools/dashboard-data` from structured sources before Markdown prose.
4. Add structured Git, PR, CI, test, and synchronization evidence where current strings are too weak for generic display.
5. Strengthen repository selection metadata so product workflows with multiple repositories can select and display the correct target without menu-specific assumptions.
6. Replace brittle task tracker and handoff prose parsing with structured rows, indexes, or manifests where available, while preserving Markdown as human-readable context.
7. Render the Development Workflow page from the producer-owned contract using design-system components and localized labels.
8. Add detail surfaces that explain evidence, freshness, authority, missing data, and next safe checks.
9. Add focused tests for schema, dashboard data, i18n, selected repository scope, stale evidence, and workflow page rendering.
10. Use Playwright and read-only TraceCue review after the page can show realistic selected-repository states.

### Stop Conditions

Stop or redesign before implementation proceeds if:

- a fixed product name, repository name, task id, PR number, CI run id, branch, URL, path, command, or threshold is introduced;
- React infers workflow readiness instead of displaying producer-owned readiness;
- Markdown prose parsing becomes the only authority for latest completion, handoff readiness, or next autonomous decision;
- stale or advisory evidence is shown as proof;
- selected repository data is mixed across workflow contexts;
- AI-generated summaries are treated as authoritative evidence;
- a detail card repeats generic definitions instead of showing current evidence and next safe checks;
- UI changes bypass the design-system source of truth.

## Dashboard Control Center: Maintenance Sync Page Direction

STATUS: synced

This section records the Maintenance Sync page direction. It extends the Dashboard page and Development Workflow page directions above and must remain consistent with the Dashboard Control Center source-of-truth rules, repository-development workflow, design-system contract, producer-owned evidence boundary, localization policy, and changeability invariant.

### Page Purpose

The Maintenance Sync page should answer whether the selected repository is safe to move to the next phase after implementation work.
If the Development Workflow page explains what was built and what can be built next, the Maintenance Sync page explains whether post-build consistency is still intact.

The page must answer six questions:

1. Is the Git worktree clean or intentionally dirty?
2. Do local and remote references match when the selected workflow requires remote synchronization?
3. Did the relevant pull request CI and main CI pass, or are they missing, stale, advisory, or not applicable?
4. Is product gate evidence current enough to trust?
5. Are requirements, specifications, implementation plans, task tracker, handoff, and memory synchronized?
6. Is any maintenance action required now, or is the item only a later warning?

The page must distinguish immediate blockers from non-blocking maintenance warnings.
Its most important output is not a generic pass or fail label.
It must show whether no immediate maintenance action is required, which warnings should be reviewed later, and which actions are blocked until a new scope, approval, evidence refresh, or synchronization step exists.

### Required First-Viewport Judgment

The first viewport should lead with the overall sync judgment and the next maintenance decision.
It should show:

- overall sync status;
- selected repository identity and selection source;
- branch and upstream when Git applies;
- worktree state;
- local and remote ahead or behind counts when available;
- latest reliable HEAD or equivalent revision when available;
- latest merge or release event when available;
- PR CI and main CI state when applicable;
- product gate freshness;
- document sync state;
- immediate maintenance action;
- non-blocking warnings count.

The page should make push and pull needs explicit.
For example, it should not only show that the worktree is clean.
It should also show whether ahead and behind are zero, whether upstream is configured, and whether push or pull is unnecessary.

### Required Sections

The page should organize its body around these sections:

- Sync Summary
- Git State
- CI State
- Product Gate Evidence
- Documentation Sync
- Maintenance Warnings
- Recommended Actions

Sync Summary should lead the page.
Git State, CI State, Product Gate Evidence, and Documentation Sync should provide the supporting evidence.
Maintenance Warnings should separate later work from current blockers.
Recommended Actions should state what can safely happen next and what must not happen without a new scope or approval.

### Data Contract Direction

Current product examples such as specific pull request numbers, CI run ids, task ids, product names, branch names, file paths, command strings, timestamps, or annotations are examples only.
They must be data-derived from the selected repository, product authority evidence, Git evidence, CI evidence, product gate evidence, document sync evidence, and workflow settings.
They must not be hard-coded in React, shell scripts, schema defaults, tests, fixtures, or prose-specific branches.

Before rendering the full Maintenance Sync page, align or add a producer-owned maintenance state contract.
The preferred shape is a structured object such as `maintenance_sync_state` generated by `tools/dashboard-data` and validated by the dashboard data contract.
It should expose:

- `sync_summary`
- `git_state`
- `ci_state`
- `product_gate_evidence`
- `documentation_sync`
- `maintenance_warnings`
- `recommended_actions`
- `blocked_actions`
- `evidence_links`

Each maintenance item that can influence a decision must include enough evidence metadata to avoid UI inference:

- stable id;
- label and localized label key when controlled by the dashboard;
- status;
- severity or maintenance priority;
- source id;
- selected repository id;
- observed time;
- freshness state;
- authority level;
- related evidence reference;
- impact;
- next safe action;
- optional command id and redacted arguments for display-only command previews.

The browser must display this producer-owned state.
It must not calculate sync readiness from labels, colors, route names, source names, command text, or matched prose.

### Git State

Git State should show repository synchronization as actionable facts:

- worktree state;
- staged, unstaged, modified, deleted, and untracked counts when relevant;
- current branch;
- upstream branch;
- local and remote relationship;
- ahead count;
- behind count;
- local and remote HEAD or equivalent revision when available;
- latest merge or release event when available;
- branch cleanup state when applicable;
- worktree count when the selected workflow uses Git worktrees.

The page should explain whether push, pull, commit, merge, cleanup, or no action is currently needed.
It should not collapse all Git information into a single failed or passed label.
Dirty worktree, missing upstream, ahead-only, behind-only, diverged, stale observation, and not-applicable states should remain visibly different.

### CI State

CI State should separate:

- PR CI;
- branch CI;
- main CI;
- provider visibility;
- CI annotations;
- CI freshness;
- HEAD match;
- skipped or not-applicable CI;
- failed or missing CI evidence.

A CI annotation is not automatically a failure.
It should be displayed as a maintenance warning when the job passed but the provider reported future-facing concerns, deprecations, runtime warnings, or advisories.

CI must not be shown as passed without current authoritative evidence and matching HEAD.
If the selected workflow does not require CI, the page should show CI as not applicable instead of unknown failure.

### Product Gate Evidence

Product gate evidence should be grouped by layer instead of shown as one generic product gate result.
At minimum, the page should be able to show:

- local tests;
- structure checks;
- product-specific focused checks;
- security checks;
- local artifact checks;
- secrets checks;
- external sending checks;
- Git synchronization checks;
- final or aggregate product gate checks when present.

Each row should show command or check id, result, latest evidence time, source, freshness, authority, and selected repository.
The page should make clear which layer passed, which layer was not run, which layer is stale, and which layer is not applicable.

### Documentation Sync

Documentation Sync should focus on synchronization gaps, not on repeating implementation content.
It should show whether the selected repository's source-of-truth documents agree:

- Requirements;
- Specification;
- Implementation Plan;
- Task Tracker;
- Handoff;
- Developer Memory;
- Session Memory;
- other configured workflow documents when the selected repository declares them.

The page should state whether each document is synced, missing, stale, advisory, or not applicable.
It should show the current source row or evidence reference when display depth allows.

For task tracker and handoff, the page should show whether the pair is consistent enough for the next session.
It should avoid generic definitions of task trackers and handoffs.

### Maintenance Warnings

Maintenance Warnings should capture non-blocking issues that are worth remembering but should not be confused with current failure.
Examples include:

- provider annotations where the job passed;
- known legacy content that was intentionally not modified;
- future runtime deprecation warnings;
- cleanup candidates that require explicit scope;
- stale advisory evidence that is not used as proof;
- optional checks that are useful but not required for the selected workflow.

Each warning should show:

- status;
- impact;
- reason;
- suggested follow-up;
- whether it blocks the current phase.

The page should clearly separate immediate blockers from scheduled or optional maintenance follow-up.

### Recommended Actions

Recommended Actions should state:

- whether immediate maintenance action is required;
- next safe actions;
- later maintenance follow-ups;
- blocked actions;
- why each blocked action is blocked.

When no immediate maintenance action is required, say so clearly.
If the current roadmap is closed, the page should not suggest continuing autonomous implementation without a new roadmap proposal.
If historical documents contain legacy content that is intentionally out of scope, the page should not suggest modifying that content unless the change is explicitly scoped.

### Cross-Page Responsibilities

The Maintenance Sync page should link to related detail pages instead of duplicating everything:

- Development Workflow for current target, latest completed work, roadmap progress, and next autonomous decision;
- Safety Confirmation for blockers, approvals, dangerous operations, credentials, provider, MCP, browser, shell, and external-send boundaries;
- Repository Info for repository identity, branch, worktree, and file scope;
- History for observed events and evidence timelines;
- Documents for source document review.

The Dashboard Overview should remain the aggregate signal.
The Maintenance Sync page should provide the evidence-backed post-build consistency view.

### AI Summary and Localization Boundary

AI-style summaries may improve readability for maintenance warnings, document sync summaries, and dynamic repository prose.
However, AI summaries are explanatory display text only.
They must not become the authority for Git cleanliness, local and remote sync, CI result, product gate result, document sync, approval state, command execution, or safety boundaries.

Language settings must apply to dashboard-controlled labels and summaries.
Dynamic repository text may be summarized or translated only through the approved agent or provider boundary when that boundary is implemented.
Until then, dynamic text should be displayed with clear source and authority metadata instead of pretending to be fully localized proof.

### UI and Implementation Direction

Do not implement the Maintenance Sync page as a larger static checklist.
Render it from producer-owned sync, evidence, warning, and action rows.

Use the Dashboard Control Center design-system source of truth for visual changes.
Reuse existing page headers, operational cards, status pills, source chips, command previews, detail surfaces, and decision summary patterns before introducing new page-local UI rules.

Card details must be useful.
Opening a detail surface should show where the claim came from, why it matters, what is stale or missing, whether it blocks the current phase, and the next safe check.
It should not repeat a static definition of the card title.

### Acceptance Criteria

The Maintenance Sync page is acceptable when:

- the first viewport answers overall sync status, selected repository, Git sync, CI state, product gate freshness, document sync, immediate maintenance action, and non-blocking warnings;
- every sync, CI, product gate, or document claim maps to producer-owned data;
- selected repository scope does not leak across free development, product improvement, external integration, lesson workflows, or lesson-repository maintenance;
- friendly, standard, and technical display depths show the same state with appropriate detail density;
- configured dashboard language applies to dashboard-controlled text;
- stale, missing, cached, manual-required, optional, advisory, and not-applicable evidence cannot appear as ready proof;
- Git ahead and behind state is visible when Git applies;
- PR CI and main CI are separate when both exist;
- product gate evidence is grouped by useful layers rather than one generic passed label;
- maintenance warnings are separated from blockers;
- recommended actions distinguish immediate action, later follow-up, and blocked action;
- command previews are display-only and cannot be mistaken for executable controls;
- detail surfaces remain keyboard accessible and return focus correctly;
- tests cover clean sync, dirty worktree, ahead-only, behind-only, diverged branch, missing upstream, stale CI, CI annotation with passed job, no CI required, missing product gate evidence, stale product gate evidence, missing document sync evidence, known non-blocking warning, multiple repositories, and selected-repository leakage.

### Implementation Roadmap

1. Confirm the information map for the Maintenance Sync page and map each visible section to an existing or new producer-owned field.
2. Add the `maintenance_sync_state` contract to the dashboard data schema only where existing fields are insufficient.
3. Generate `maintenance_sync_state` in `tools/dashboard-data` from structured Git, CI, product gate, document sync, warning, and action sources.
4. Add or align structured Git sync evidence so worktree state, upstream, ahead, behind, HEAD, merge, and cleanup are displayed without parsing prose.
5. Add or align structured CI evidence so PR CI, main CI, annotations, provider visibility, HEAD match, and freshness remain separate.
6. Add or align product gate layer evidence so tests, structure, security, local artifacts, secrets, external sending, and Git sync can be displayed independently.
7. Add or align document sync evidence so requirements, specifications, implementation plans, task tracker, handoff, and memory synchronization can be displayed without generic fallback text.
8. Render the Maintenance Sync page from the producer-owned contract using design-system components and localized labels.
9. Add detail surfaces that explain evidence, freshness, authority, warning impact, missing data, and next safe checks.
10. Add focused tests for schema, dashboard data, i18n, selected repository scope, Git sync variants, CI variants, product gate freshness, document sync, warnings, and page rendering.
11. Use Playwright and read-only TraceCue review after the page can show realistic selected-repository maintenance states.

### Stop Conditions

Stop or redesign before implementation proceeds if:

- a fixed product name, repository name, task id, PR number, CI run id, branch, URL, path, command, timestamp, annotation, or threshold is introduced;
- React infers maintenance readiness instead of displaying producer-owned readiness;
- Markdown prose parsing becomes the only authority for Git sync, CI, product gate, document sync, warnings, or recommended actions;
- stale or advisory evidence is shown as proof;
- selected repository data is mixed across workflow contexts;
- AI-generated summaries are treated as authoritative evidence;
- non-blocking warnings are shown as failures;
- current blockers are hidden as optional warnings;
- product gate is collapsed into one passed label without useful layer detail;
- UI changes bypass the design-system source of truth.

## Dashboard Control Center: Safety Confirmation Page Direction

STATUS: synced

This section records the Safety Confirmation page direction. It extends the Dashboard page, Development Workflow page, and Maintenance Sync page directions above and must remain consistent with the Dashboard Control Center source-of-truth rules, repository-development workflow, design-system contract, producer-owned evidence boundary, localization policy, and changeability invariant.

### Page Purpose

The Safety Confirmation page should answer one practical question first:

Can the selected workflow safely continue now?

Internally, the page verifies whether dangerous authority is closed before the next action.
For user-facing copy, especially friendly mode, the page should lead with safe to continue, approval required, blocked, or evidence missing or stale.
The authority matrix belongs in standard or technical details, not as the main first-viewport message.

If the Development Workflow page explains what was built or what can be built next, and the Maintenance Sync page explains whether post-build consistency is intact, the Safety Confirmation page explains whether execution, sending, authentication, credential, provider, browser, shell, MCP, and destructive-operation boundaries remain closed.

The page must answer seven questions:

1. Are secrets, credentials, tokens, private URLs, or secret-like values exposed?
2. Are raw artifacts, generated local outputs, media bodies, OCR bodies, transcript bodies, logs, prompts, provider payloads, or receipt bodies kept out of dashboard output and source control?
3. Are external send, provider dispatch, API execution, and provider request or response handling closed unless explicitly scoped and approved?
4. Are browser, shell, MCP, endpoint, action, and settings-write execution boundaries unchanged?
5. Are destructive actions, cleanup, delete, push, merge, OAuth, credential rotation, or external-service operations blocked or approval-gated as required?
6. Which operations are allowed, prohibited, or approval-required in the current scope?
7. If a blocker exists, which source and next safe check explain it?

### Required First-Viewport Judgment

The first viewport should lead with:

- safety status;
- current judgment;
- selected repository and workflow scope;
- current safety result;
- active stop condition, if any;
- evidence freshness and authority;
- latest security evidence summary;
- next safe check or next safe action.

Friendly mode should say whether the user can continue, stop, or ask for approval, with the reason.
Standard mode should show blockers, gates, evidence names, and display-only command previews.
Technical mode may show source ids, freshness, authority, HEAD or source references, safe receipt metadata, redacted argv, and the authority matrix.

Missing, stale, cached, advisory, not-collected, or manual-required evidence must never appear as safe proof.
"Not checked" is not safe.

### Required Sections

The page should organize its body around these sections:

- Safety Status
- Scope
- Security Evidence
- Authority Boundaries
- Safety Boundary
- Authority Matrix
- Security Blockers
- Redaction and Sensitive Data
- Recommended Actions

The first viewport should emphasize Safety Status, Scope, Current Judgment, and Next Safe Check.
Authority Boundaries and Security Evidence should be primary detail.
Authority Matrix, source ids, command previews, safe receipt metadata, and redaction policy should be technical detail.

### Route and Page Composition

Do not add a separate `#safety-confirmation` route unless a later implementation plan explicitly justifies the extra route, schema, navigation, fixture, and Playwright coverage.
Implement Safety Confirmation inside the existing `#safety` page.

The preferred UI shape is a `SafetyConfirmationPanel` inside the existing Safety page.
It should reuse shared status, detail, source, command-preview, and modal patterns instead of creating a second modal or page-local visual system.

### Data Contract Direction

Current product examples such as specific task ids, product names, repository names, HEAD values, timestamps, evidence ids, provider names, command names, URLs, paths, or approval labels are examples only.
They must be data-derived from the selected repository, product security policy, workflow context map, product-local security manifest, evidence detail manifest, product gate evidence, approval policy, command-preview policy, and product authority evidence.
They must not be hard-coded in React, shell scripts, schema defaults, tests, fixtures, or prose-specific branches.

Before rendering the full Safety Confirmation page, add or align a producer-owned safety confirmation contract.
The preferred shape is `security.confirmation` generated by `tools/dashboard-data` and validated by the dashboard data contract.
It should expose:

- `status`
- `scope`
- `current_judgment`
- `active_stop_condition`
- `groups[]`
- `items[]`
- `boundaries`
- `authority_matrix`
- `redaction_policy`
- `recommended_actions`
- `blocked_actions`
- `source_artifacts`

Each safety item that can influence a decision must include enough evidence metadata to avoid UI inference:

- stable id;
- group id;
- label and localized label key when controlled by the dashboard;
- status;
- risk level;
- source id;
- selected repository id;
- observed time;
- freshness state;
- authority level;
- evidence reference;
- product HEAD or source revision when applicable;
- approval requirement;
- next safe action;
- optional command id and redacted arguments for display-only command previews.

The browser must display this producer-owned state.
It must not calculate safety readiness from labels, colors, source names, route names, copied text, command text, first array rows, or matched prose.

### Producer Sources

The producer should derive safety confirmation items from structured sources first:

- `PRODUCT_SECURITY_POLICY.tsv`
- `WORKFLOW_CONTEXT_MAP.tsv`
- product-local `ops/SECURITY_MANIFEST.tsv`
- product-local `ops/EVIDENCE_DETAIL_MANIFEST.tsv`
- product gate evidence;
- product authority evidence;
- Git workflow approval policy;
- action and command-preview policy;
- dashboard design-system provider and proposal boundaries where relevant;
- product-local security documents when the selected repository declares them.

Avoid parsing `tools/product-security` stdout or stderr as an authority source.
If product-security data is needed, add a JSON or evidence-export path, or route Safety Confirmation through product-authority evidence.
Human-readable CLI output may remain advisory display text only.

### Security Evidence Categories

The page should normalize safety evidence into reusable categories:

- local artifacts;
- secrets and secret-like data;
- external sending;
- provider dispatch;
- provider request building;
- provider response handling;
- API execution;
- credential reads;
- approval receipt reads and writes;
- browser execution expansion;
- shell execution expansion;
- MCP execution expansion;
- endpoint or action expansion;
- settings-write expansion;
- destructive execution;
- raw body forwarding;
- raw artifact reads and writes;
- output path changes;
- preview id changes;
- runtime dependency additions;
- duplicate locale or authority sources when relevant.

Each category should be able to show open, closed, blocked, approval-required, missing, stale, not applicable, or unknown states.
Closed means the authority is not available in the current scope.
Closed does not mean the feature is implemented or usable.

### Authority Boundaries

The page should show which capabilities are closed, approval-required, or allowed for the current scope.
The authority matrix should include capability, state, approval requirement, evidence source, and next safe check.

At minimum, the matrix should cover:

- translation execution;
- provider dispatch;
- external send;
- credential read;
- approval receipt read and write;
- browser execution expansion;
- shell execution expansion;
- MCP execution expansion;
- endpoint or action expansion;
- settings-write expansion;
- destructive delete or cleanup;
- raw body forwarding.

For each approval-required capability, show who or which external workflow owns the approval path when known.
Do not add browser approval buttons unless a later owner-tool contract explicitly introduces that capability.

### Redaction and Sensitive Data

Leak prevention must happen before browser delivery, not only at React render time.
Dashboard snapshot JSON and live-status JSON must not contain raw secrets, raw prompts, raw provider payloads, raw logs, raw stderr with sensitive values, raw approval receipt bodies, plan or apply tokens, private messages, signed URLs, raw transcripts, raw OCR bodies, raw artifact bodies, frame pixels, private media previews, absolute local paths, or executable browser or shell commands.

The page must not display:

- API key values;
- tokens or credentials;
- signed or private URLs;
- raw transcript bodies;
- raw OCR bodies;
- frame pixels or private media previews;
- provider prompts or responses;
- full local artifact bodies;
- raw approval receipt bodies or memos;
- raw shell output or stderr when it can contain sensitive data;
- absolute paths when a product-scoped or artifact-scoped reference is enough.

Allowed display patterns include:

- environment variable name without value;
- value present or missing as a boolean;
- inert receipt id or receipt hash;
- product-scoped artifact reference;
- run-relative artifact reference;
- redacted argv;
- digest or source hash;
- provider mode and capability status without provider payload.

### Command Preview Boundary

Command previews must remain display-only.
The page must not introduce run, execute, approve, dispatch, send, merge, push, cleanup, delete, OAuth, credential, provider, browser, shell, or MCP execution buttons.

Command preview data should use command ids and redacted argv where possible.
Approval-bound, destructive, provider-dispatch, external-send, credential, raw-path, or unsafe command previews should not expose copy affordances unless they are representable as validated safe argv and explicitly marked non-executable.

The Safety page should have focused tests that fail if opening the page triggers POST requests, token creation, receipt creation, mutation endpoints, provider calls, browser execution, shell execution, MCP execution, or repository writes.

### Approval Receipt Boundary

Approval receipts are sensitive contract data.
The page may show only safe receipt metadata:

- present or missing;
- action id;
- repository id;
- branch or scope;
- HEAD-match status;
- expiry status;
- receipt hash or inert id;
- authority source;
- next safe check.

It must never show raw receipt bodies, raw memos, secret-bearing receipt fields, or approval tokens.

### External Integration Boundary

External integration requires first-class safety rows when the selected workflow can involve external services.
The page should surface service, data movement, OAuth or API permissions, token storage, webhook behavior, logging, rate limit, sandbox, rollback, and audit evidence as separate producer-owned rows.
If required external-integration evidence is absent, Safety must not be shown as ready.

### Worst-State Aggregation

The page must compute the safety headline from all relevant rows, not from the first approval row or first dangerous-operation row.
Aggregate the strictest state across:

- `security.gate_status`;
- `security.confirmation` rows;
- all approvals;
- all dangerous operations;
- partial failures;
- live security evidence;
- command previews;
- external-integration evidence when applicable.

The producer should own the headline whenever possible.
If the UI must aggregate for display, the aggregation rules must be generic, tested, and conservative.

### Cross-Page Responsibilities

The Safety Confirmation page should link to related detail pages instead of duplicating everything:

- Development Workflow for current target, latest completed work, roadmap progress, and autonomous continuation;
- Maintenance Sync for Git, CI, product gate, document sync, and maintenance warnings;
- Repository Info for repository identity, branch, worktree, and file scope;
- History for observed events and evidence timelines;
- Documents for source document review;
- Settings only for guarded settings visibility, not unsafe execution.

The Dashboard Overview should remain the aggregate signal.
The Safety Confirmation page should provide the evidence-backed authority and blocker boundary view.

### AI Summary and Localization Boundary

AI-style summaries may improve readability for safety warnings, blocker summaries, and dynamic repository prose.
However, AI summaries are explanatory display text only.
They must not become the authority for safety readiness, secrets, external sending, provider dispatch, approval state, receipt validity, command execution, Git state, CI state, or destructive-operation boundaries.

Language settings must apply to dashboard-controlled labels and summaries.
Dynamic repository text may be summarized or translated only through the approved agent or provider boundary when that boundary is implemented.
Until then, dynamic text should be displayed with clear source and authority metadata instead of pretending to be fully localized proof.

### UI and Implementation Direction

Do not implement the Safety Confirmation page as a long compliance checklist.
Render it from producer-owned confirmation, evidence, boundary, blocker, warning, and action rows.

Use the Dashboard Control Center design-system source of truth for visual changes.
Reuse existing page headers, operational cards, status pills, source chips, command previews, detail surfaces, and decision summary patterns before introducing new page-local UI rules.

Card details must be useful.
Opening a detail surface should show where the claim came from, why it matters, what is missing or stale, whether it blocks the current phase, what authority is closed or approval-required, and the next safe check.
It should not repeat a static definition of the card title.

### Acceptance Criteria

The Safety Confirmation page is acceptable when:

- the first viewport answers whether the selected workflow can safely continue now;
- every safety, blocker, authority, approval, command, or redaction claim maps to producer-owned data;
- selected repository scope does not leak across free development, product improvement, external integration, lesson workflows, or lesson-repository maintenance;
- friendly, standard, and technical display depths show the same state with appropriate detail density;
- configured dashboard language applies to dashboard-controlled text;
- missing, stale, cached, manual-required, optional, advisory, not-collected, and not-applicable evidence cannot appear as ready proof;
- secrets, raw artifacts, raw prompts, raw payloads, raw logs, raw receipt bodies, tokens, private URLs, and absolute paths do not reach dashboard JSON or live-status JSON;
- external send, provider, browser, shell, MCP, credential, approval receipt, and destructive-operation boundaries are visible when relevant;
- external-integration evidence is first-class when the selected workflow requires it;
- command previews remain display-only and unsafe command previews cannot be mistaken for executable controls;
- opening the Safety page does not call mutation endpoints, create tokens, create receipts, dispatch providers, execute commands, or write repositories;
- detail surfaces remain keyboard accessible and return focus correctly;
- tests cover safe, blocked, approval-required, missing evidence, stale evidence, external-integration missing approval, secret-like data, raw artifact leakage, unsafe command previews, no POST from Safety, multiple repositories, selected-repository leakage, and display-depth behavior.

### Implementation Roadmap

1. Confirm the information map for the Safety Confirmation page and map each visible section to an existing or new producer-owned field.
2. Add or align `security.confirmation` in the dashboard data schema only where existing `security`, `partial_failures`, `actions.command_previews`, and `decision_pages[id=safety]` fields are insufficient.
3. Generate `security.confirmation` in `tools/dashboard-data` from structured security policy, workflow context, product-local manifests, product authority evidence, command-preview policy, and approval policy sources.
4. Add or align a product-security JSON or evidence-export path, or route Safety Confirmation through product-authority evidence, so the dashboard does not parse `product-security` stdout or stderr.
5. Add producer-side and validator-side leak rejection for snapshot JSON and live-status JSON.
6. Add safe command grammar, command ids, redacted argv, and copy restrictions for unsafe or approval-bound command previews.
7. Add safe approval receipt metadata fields without raw receipt bodies or approval tokens.
8. Add first-class external-send, provider, credential, OAuth, webhook, token-storage, browser, shell, MCP, and destructive-operation rows where applicable.
9. Render `SafetyConfirmationPanel` inside the existing `#safety` page using design-system components and localized labels.
10. Aggregate worst-state conservatively across all safety rows or display a producer-owned headline.
11. Add detail surfaces that explain evidence, freshness, authority, missing data, approval requirements, redaction boundaries, and next safe checks.
12. Add focused tests for schema, dashboard data, live-status leak rejection, i18n, selected repository scope, no mutation endpoints, command preview safety, external-integration safety, and Safety page rendering.
13. Use Playwright and read-only TraceCue review after the page can show realistic selected-repository safety states.

### Stop Conditions

Stop or redesign before implementation proceeds if:

- a fixed product name, repository name, task id, PR number, CI run id, branch, URL, path, command, provider name, timestamp, annotation, or threshold is introduced;
- React infers safety readiness instead of displaying producer-owned readiness;
- Markdown prose, stdout, or stderr parsing becomes the only authority for safety confirmation, approval, external sending, provider dispatch, command preview, or blocker state;
- stale or advisory evidence is shown as proof;
- selected repository data is mixed across workflow contexts;
- AI-generated summaries are treated as authoritative evidence;
- Safety lacks current authoritative rows for secrets, external send, provider, MCP, browser, shell, credentials, approvals, destructive operations, and command previews when those boundaries are relevant;
- any dashboard JSON includes raw secrets, private messages, raw prompts, raw payloads, raw logs, raw stderr with sensitive values, raw approval receipts, plan or apply tokens, provider payloads, absolute paths, or executable browser or shell commands;
- a copied command is destructive, approval-bound, contains raw paths or secrets, or is not representable as validated safe argv;
- external-integration evidence lacks service, data movement, OAuth or API permissions, token storage, webhook, logging, rate limit, sandbox, and rollback confirmation when required;
- opening the Safety page calls mutation endpoints, creates receipts, creates tokens, dispatches providers, executes commands, or writes repositories;
- UI changes bypass the design-system source of truth.

## Repository Invariant Records Required By Local Gates

STATUS: synced

This section preserves repository-wide lesson and implementation invariants that must remain visible in developer memory even when the dashboard redesign memory is initialized.

- Approval checkpoints now have tooling enforcement.
- `tools/lesson 学習モード <A|B|C>` records the 7-day learning mode.
- `tools/lesson14 学習モード <A|B|C>` records the 14-day learning mode.
- Learners can change learning mode at any time during either lesson.
- Standard language choices should include `ja`, `en`, `ko`, `zh-CN`, `zh-TW`, `es`, `pt-BR`, `fr`, `de`, `id`, `vi`, `th`, `hi`, and `ar`.
- Implementation work must stay refactorable, ecosystem-friendly, reusable, and general.
- Existing functionality must not be traded away for a new implementation.
- Final tests pass only when every improvement or problem recorded in this developer memory has been cleared, implemented, deferred with explicit reason, or converted into a tracked next plan.
- Explain MCP Purpose Before MCP Workflows.
