# Dashboard Control Center Design System

This document is the visual and interaction source of truth for Repository Control Center and Dashboard Control Center screens.
It exists so future work can improve non-engineer comprehension without weakening existing lesson, repository, CI, security, Settings, or document-sync behavior.

## Goals

- Make every page feel like one control center, not separate page-specific designs.
- Show practical judgment first, then evidence and technical details.
- Keep status, risk, approval, source, command preview, and copy affordances visually consistent.
- Make external product workflow screens reusable without adding product-stack-specific branches.
- Preserve read-only and display-only boundaries outside Settings.
- Keep safety accents readable on white operational surfaces; `--dcc-safety-accent` is the green source token for safety buttons, labels, and filled safety icons.

## Scope

Applies to:

- Dashboard overview
- Lessons
- Development Workflow
- Maintenance Sync
- Safety Actions
- Repository Info
- Documents
- Settings
- Help
- Update History
- shared navigation, status badges, evidence rows, source chips, command previews, detail surfaces, and glossary entries

Does not define:

- learner lesson prose,
- product application UI,
- external product landing pages,
- Git, CI, merge, cleanup, credential, or external-service execution authority.

## Foundations

## Source-To-Runtime Contract

The design system is not only a descriptive Markdown document.
It is the source-of-truth sequence that agents and maintainers must follow before page-specific CSS changes:

```text
DESIGN_SYSTEM.md
-> tokens.json and components.json
-> dashboard-control-center/src/design-system.generated.css
-> dashboard-control-center/src/design-system.generated.js
-> prototype or browser preview
-> developer visual approval
-> Dashboard Control Center implementation
-> drift check
```

`DESIGN_SYSTEM.md` remains the human-readable authority for intent, scope, safety boundaries, accessibility, and component behavior.
`tokens.json` and `components.json` are the machine-readable contract that keeps runtime CSS and JS generation repeatable.
Generated files must not be edited directly; update the design-system source files and regenerate them through `tools/dashboard-design-system`.

### Prototype Preview Gate

Before a broad visual change is treated as complete, the implementation must be visible in the running Dashboard Control Center or an equivalent prototype view.
The developer visual review happens after the generated tokens and component contracts are applied, not after isolated page-local CSS tweaks.

### Drift Check

`tools/check_dashboard_design_system.sh` is the standalone drift check.
It verifies that:

- generated CSS matches `tokens.json` and `components.json`;
- generated JS matches the same source files;
- the running React entry imports the generated CSS;
- the app shell exposes a stable design-system marker for browser inspection;
- this document keeps the source-to-runtime, prototype preview, and drift-check contract visible.

The check is also reachable from focused Dashboard tests, Git hooks, and the aggregate repository test.

## Design Studio

Design Studio is the Dashboard Control Center page for guarded visual-system edits.
It must edit design-system sources, not page-local CSS.

The safe mutation path is:

```text
Design Studio draft
-> browser preview
-> plan through /dashboard-design-system/plan
-> server-issued one-time plan token
-> explicit confirmation
-> apply through /dashboard-design-system/apply
-> components.json update
-> generated CSS/JS regeneration
-> drift check and focused dashboard verification
```

Design Studio must not become an arbitrary CSS editor.
It may expose only validated presets that are backed by `tokens.json`, `components.json`, and `tools/dashboard-design-system`.
Any new editable control must have:

- a human-readable rule in this document;
- a machine-readable field in `tokens.json` or `components.json`;
- generated runtime CSS or JS;
- a standalone check;
- focused UI verification for the visible behavior.

### Visual Editor Contract

Design Studio is a visual design-system editor, not a warning-only page.
Its user-facing value is:

```text
edit design intent
-> preview tokens and component behavior
-> plan source changes
-> apply source changes
-> regenerate runtime CSS/JS
```

The UI must not lead with "do not edit CSS".
The correct user-facing boundary is that developers edit the design-system source of truth through safe controls.
Generated CSS and JS remain artifacts of that source.

Minimum visual editor controls:

- target selection: Dashboard Control Center now, selected external product repository when product-local design-system sources exist;
- foundation presets: theme accent, density, radius scale, and typography scale;
- component preview: atom, molecule, and organism examples that all consume the same upstream tokens;
- interaction presets: tooltip and copy-popup behavior;
- diff preview: foundation and interaction changes before apply;
- plan/apply boundary: same-origin JSON, whitelisted values, explicit confirmation, and a one-time plan token.

### Atom, Molecule, Organism Preview

The preview must show at least three levels:

- atom: a badge, chip, button, or status label;
- molecule: a compact row or card using atoms;
- organism: a page-header or section-like preview using molecules.

A change to an upstream token, such as radius or typography scale, must be visible in all three levels without page-specific CSS exceptions.

### Target And External Product Boundary

Dashboard Control Center has its own design-system source under:

```text
docs/design-system/dashboard-control-center/
```

External product repositories must own their own product-local design-system sources under:

```text
docs/design-system/
```

The lesson repository may expose a control-plane UI for selecting and planning changes against a product repository, but it must not become the product design authority.
Cross-repository writes require product workflow approval and must use product-local skills, product-local checks, and product-local design-system files.
If the selected product repository does not yet have product-local design-system sources, Design Studio may show the target model and readiness status, but it must not silently write ad hoc files outside the approved product workflow.

### Proposal Orchestration Foundation

Design Studio must support a proposal-first design workflow before it supports broader visual editing.
The user-facing model is:

```text
Design Intent / Mock / Template
-> Candidate Envelope
-> AI or Manual Proposal
-> Preview / Diff
-> Plan Token
-> Explicit Approval
-> Owner Tool Apply
-> Verification
-> Rollback-Ready Evidence
```

The orchestration source is:

```text
docs/design-system/dashboard-control-center/orchestration.json
```

`orchestration.json` defines the request, proposal, candidate, mock, template, event-runner, provider, target-adapter, and evidence contracts.
Generated runtime JS exposes this contract to the Dashboard page so users can inspect the design workflow boundary from Design Studio.

The Design Studio UI may create, show, and route design intent requests and proposal artifacts.
It must not convert natural language, images, AI output, templates, or external product documents into direct writes.

### Candidate Envelope

Natural-language prompts, OCR text, image analysis, imagegen output, template text, external product documents, and AI responses are untrusted candidate data.
They must be wrapped in a Candidate Envelope before they can influence a design proposal.

A Candidate Envelope records:

- source kind and provenance;
- payload reference rather than raw secret-like payload;
- confidence and unknowns;
- redaction state;
- expiry or retention boundary;
- instruction-denial metadata that prevents prompt-injection text from becoming agent instructions.

Candidate data can produce suggested tokens, components, patterns, page templates, asset references, and state candidates.
Each candidate must require an explicit accept, adjust, reject, or hold decision before it can become part of a proposal.

### AI Provider Boundary

Manual, subscription-agent, and API-key modes all produce the same DesignChangeProposal schema.
None of them receives direct apply authority.

API-key mode is a provider strategy, not a browser credential feature.
It must use secret references, provider capability gates, send-scope consent, prompt redaction, cost limits, rate limits, timeout, retry, fallback approval, and audit receipts.
Raw API keys must never be sent to the browser, committed, logged, stored in fixtures, included in prompt payloads, or written into design-system source files.

AI output is proposal-only.
Approval, apply authority, Git/CI authority, external product write authority, and cleanup authority remain outside the AI provider boundary.

### Mock And Template Bridge

Imagegen mocks and edited mock variants are strong visual references, not source of truth.
Design Studio may register mock artifacts with relative path, content hash, prompt hash, dimensions, lineage, selected region metadata, approval state, and retention state.

The mock edit loop is limited to simple rectangle or circle region selections, versioned outputs, before/after comparison, and revert-by-version planning.
It is not an advanced image editor.

The Mock-to-Design-System bridge extracts candidates only.
It may propose color, typography, spacing, radius, layout, component family, asset reference, and state candidates with evidence and confidence, but it may not apply them directly.

Templates are reusable design decisions encoded as manifests.
They may define tokens, components, patterns, page templates, compatibility, allowed outputs, forbidden operations, required checks, lifecycle state, and deprecation metadata.
Templates must not add dependencies, external network calls, credential requirements, Git/CI operations, script execution, or external product writes implicitly.

## Interaction Editing Contract

The first editable interaction contract is `tooltip-copy`.
It covers source chips, evidence reference chips, command preview chips, sidebar reference chips, and their copy controls.

Default required behavior:

- tooltip bubbles are hover-only;
- tooltip bubbles hide when the pointer leaves the trigger;
- tooltip bubbles appear above the trigger;
- copy popups appear above the copy button;
- copy popups hide when the pointer leaves the copy button;
- file/path role tooltip display conditions and copy-button popup display conditions are controlled separately;
- either display surface may be disabled independently, but the visible field body and copy button remain usable;
- hidden copy popups must not contribute to horizontal page overflow;
- copy popup duration must visibly drive the generated transition timing;
- copy popup collision handling must shift edge buttons inward instead of creating viewport overflow;
- raw paths and commands remain in the visible field or copy affordance;
- tooltips stay short and explain the role of the value.
- technical values and copy controls stay on one row with `--dcc-technical-affordance-gap`;
- source, evidence, and preview chip maximum widths are tokenized and generated instead of patched page by page.

Design Studio may tune safe presets such as tooltip width or copy popup duration.
It must not allow a setting that weakens hover-only hiding, reintroduces native browser `title` positioning for copy feedback, hides essential meaning in pseudo-content only, or creates page-specific exceptions.
Apply operations must use a current one-time plan token from the matching plan response.

## Page Header And Card Contract

Page headers and operational cards are generated from the design-system source instead of patched page by page.
The generated layer owns:

- neutral page-title and detail-page-header surfaces;
- filled page icons with white icon color;
- shared operational-card borders, radii, surface color, and elevation;
- metadata chip spacing and simple bordered metadata controls;
- transparent wrappers for sections that must not become nested cards.

Page-local CSS may still define layout structure, responsive grid behavior, and page-specific content density.
It must not reintroduce decorative left accent bars, nested decorative card wrappers, or one-off page-header icon treatments.

### Typography

- Use the existing Inter-first stack for UI text.
- Page titles, section titles, card titles, body text, metadata, chips, and code must have stable roles.
- Do not scale text with viewport width.
- Do not shrink important status labels below readable badge size. Long labels must wrap, stack, or use a wider layout before font-size workarounds.

### Color

- Category color identifies a page or section.
- Semantic color identifies state, risk, or required attention.
- Red and orange are reserved for failure, blockers, approval, missing evidence, or warnings.
- Green is reserved for ready, passed, allowed, or safe-to-continue states.
- Raw hex colors must not be added outside token or intentionally documented component rules.

### Spacing And Radius

- Cards, panels, rows, and modals use an 8px default radius unless an existing established component requires otherwise.
- Dense operational rows may use compact spacing, but the clickable or focusable target must remain usable.
- Do not nest decorative cards inside decorative cards.

### Icons

- Use lucide icons already imported by the dashboard when a matching icon exists.
- Icons support the text; they do not replace the text.
- State must never be communicated by color alone.

## Component Contracts

### Page Header

All pages use one page-header contract:

- icon,
- title,
- plain-language subtitle,
- generated snapshot time when available,
- read-only or Settings mutation boundary,
- explicit action if the surface is interactive.

If an element looks like an action, it must be a real button or link.

### Status, Risk, And Mode Badges

Use shared badge semantics:

- `ready` / `passed`: safe or complete,
- `failed` / `blocked`: stop and repair,
- `approval_required` / `manual_required`: ask or confirm before proceeding,
- `unknown` / `missing` / `not_run` / `stale`: evidence is incomplete,
- `not_applicable`: not required for this selected workflow,
- `allowed`: operation is permitted by policy or Settings,
- `prohibited`: operation is not permitted.

Settings action modes use:

- prohibited,
- ask each time,
- auto.

Workflow operation states use allowed/prohibited/not-applicable language when the question is permission, not execution timing.

The generated design-system layer owns badge shape and readability:

- shared minimum height and pill radius,
- text/icon gap,
- compact and common-mode padding,
- base font size and weight,
- icon alignment.

Page CSS may keep semantic state colors, but it must not redefine the base badge box model one page at a time.

### Context Menu Tiles

Context menu tiles use design-system generated icon state variables:

- selected menu icons use the category filled color and a white icon;
- unselected menu icons use the category soft color and a darker icon from the same category;
- unavailable menu options keep readable text and muted icons so they do not look selected;
- the selected state is visible through icon fill, border, check mark, text, and `aria-pressed`.

Page CSS may keep the grid layout, tile sizing, and responsive stacking.
It must not redefine selected and unselected menu icon colors one page at a time.

### Interactive Controls

Buttons, select boxes, and icon-only controls use shared control tokens for:

- action button minimum height and padding,
- compact button minimum height and padding,
- form control minimum height and padding,
- icon-only button size,
- control text size,
- keyboard focus ring.

Feature CSS may keep semantic colors, disabled states, destructive-action rules, and page-specific layout.
It must not redefine the base control dimensions page by page.

### Cards And Rows

Operational pages follow this order:

1. practical question,
2. current judgment,
3. why it matters,
4. evidence role,
5. source or command for technical inspection.

Technical IDs, file paths, and commands are secondary metadata.
They remain accessible through copy controls or detail panels.

The generated design-system layer owns shared card and row density:

- repeated operational cards use `--dcc-card-padding` and `--dcc-card-gap`;
- repeated table, settings, evidence, and activity rows use `--dcc-row-padding` and `--dcc-row-gap`;
- short decision-progress summaries use one row per group and place the `passed/total` fraction on the same line as the plain-language label;
- decision-progress summary text matches the size and weight of other Overview primary values, with tabular numerals for the fraction;
- the decision-progress summary is reusable for local checks, CI stages, sync stages, safety review groups, and future operational progress groups;
- Design Studio exposes these values as validated presets and previews both a card and a row before apply.

Page CSS may keep layout grids, responsive stacking, semantic state colors, and page-specific column structure.
It must not redefine repeated card or row padding one page at a time when the shared density tokens apply.

### Detail Surfaces

Use a shared detail surface for cards, glossary terms, evidence rows, and source explanations.
The detail surface must include:

- title,
- plain-language meaning,
- where it appears,
- why it matters,
- status or risk when relevant,
- next safe action when relevant,
- optional technical source.

It must support mouse, keyboard, Escape close, focus return, and screen-reader labeling.

### Tooltips And Copy

Tooltips should explain role or meaning first.
Copy controls may expose raw paths, commands, IDs, or technical source text.

For `dashboard_control_center_design_system_full_application`, source and evidence controls use this stricter split:

- the field body may show the raw file path, command, or technical ID when that is the value the user needs to inspect;
- the tooltip is a short role explanation, normally one sentence and no more than two short lines;
- long explanations move to the shared detail surface or Help glossary;
- copy-button titles and accessible names identify the raw value being copied without replacing the field body;
- tooltip content must wrap inside the viewport and must not be the only place where essential meaning lives.

Do not place essential information only in CSS pseudo-content.
If the information is required for understanding, render it as real DOM text in a detail surface or accessible description.

### Command Previews

Command previews are display-only.
They must never look like execution controls.
They must show:

- display-only label,
- non-executable label,
- intent,
- risk,
- command text,
- copy affordance.

The dashboard must not add command execution authority.

## Page Recipes

### Development Workflow

Lead with:

- whether the workflow can proceed,
- which approval or evidence is missing,
- what the next safe action is.

Git, CI, PR, merge, product evidence, and next step cards must open useful detail instead of linking to the same page without new information.

Recent workflow runs should expose reference meaning through detail or hover/focus help. Remove or reduce false "reference" affordances when no detail is available.

### Maintenance Sync

Lead with:

- whether documents and evidence are synchronized enough to trust the dashboard,
- which maintenance source needs review,
- what to collect or synchronize next.

Evidence rows explain the role of each file or command first.
Raw paths are available through copy controls or technical detail.

### Safety Actions

Lead with:

- safe to continue,
- approval required,
- dangerous operation waiting,
- blocker exists.

Security policy must be concrete:

- protect secrets and secret-like data,
- keep dangerous operations approval-bound,
- keep commands display-only,
- stop on blockers,
- proceed only after safety gates pass.

### Help

The glossary must be categorized and searchable or scannable by topic.
Each term card opens a detail surface with plain-language meaning, where it appears, why it matters, related action, example, and optional technical source.

## Localization And Responsive Rules

- All visible strings go through the dashboard i18n layer.
- Long translated labels must wrap without horizontal overflow.
- Primary labels stack before truncating.
- Check desktop and mobile widths, including narrow mobile around 390px.
- Right-to-left locales must not depend on left-only positioning for core meaning.

## Accessibility Rules

- Interactive surfaces need visible focus.
- Dismissible surfaces need Escape close and focus return.
- Modal-like surfaces use dialog semantics and labels.
- Tooltip-like help uses accessible descriptions or real detail surfaces.
- Normal text contrast must meet WCAG AA.
- Icon-only controls require accessible names.

## Verification

Focused verification should include:

- dashboard i18n test,
- dashboard control-center browser test,
- documentation tour test when design-system docs or document routes change,
- developer-memory requirement check when review issues are closed or deferred,
- as-built and workflow-pair sync checks.

Release proof remains governed by the repository development workflow and existing aggregate gates.
