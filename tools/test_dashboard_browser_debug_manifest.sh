#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

manifest="$TMP_DIR/dashboard-browser-debug-target.json"
renamed_manifest="$TMP_DIR/dashboard-review-target-renamed.json"
compat_manifest="$TMP_DIR/dashboard-browser-debug-compat-target.json"

DASHBOARD_REVIEW_TARGET_ID="ai-driven-development-lesson-dashboard-control-center" \
  "$ROOT/tools/dashboard-review-manifest" \
  --source tests/fixtures/dashboard-control-center.json \
  --base-url http://127.0.0.1:5173/ \
  --output "$manifest"

DASHBOARD_REVIEW_TARGET_ID="ai-driven-development-lesson-dashboard-control-center" \
  "$ROOT/tools/dashboard-browser-debug-manifest" \
  --source tests/fixtures/dashboard-control-center.json \
  --base-url http://127.0.0.1:5173/ \
  --output "$compat_manifest"

DASHBOARD_REVIEW_TARGET_ID="renamed-control-center" \
DASHBOARD_CONTROL_CENTER_BASE_URL="http://127.0.0.1:6199/" \
  "$ROOT/tools/dashboard-review-manifest" \
    --source tests/fixtures/dashboard-control-center.json \
    --output "$renamed_manifest"

MANIFEST="$manifest" node <<'NODE'
const fs = require('node:fs');

const manifest = JSON.parse(fs.readFileSync(process.env.MANIFEST, 'utf8'));

function fail(message) {
  console.error(message);
  process.exit(1);
}

function assertCondition(condition, message) {
  if (!condition) fail(message);
}

assertCondition(manifest.schemaVersion === '0.1.0', 'manifest schema version must match review CLI target schema');
assertCondition(manifest.name === 'ai-driven-development-lesson-dashboard-control-center', 'manifest name must identify the lesson-owned target');
assertCondition(manifest.baseUrl === 'http://127.0.0.1:5173/?menu_id=step_1_14', 'base URL must include the selected menu_id used by the dashboard');
assertCondition(manifest.localContentUxAdvisory?.enabled === true, 'content UX advisory must be enabled for lesson-owned review manifest');
assertCondition(manifest.sourceData?.[0]?.id === 'dashboard_context', 'manifest must inline bounded dashboard_context sourceData');
assertCondition(manifest.sourceData[0].data.selected_context.git_status === 'unknown', 'selected context Git status must remain in lesson sourceData');
assertCondition(manifest.sourceData[0].data.selected_context.ci_status === 'optional', 'selected context CI status must remain in lesson sourceData');
assertCondition(manifest.sourceData[0].data.selected_context.blocker_count === 1, 'selected context blocker count must remain in lesson sourceData');
assertCondition(!JSON.stringify(manifest).includes('TOKEN=abcdefghijklmnop'), 'manifest must not copy raw dashboard warnings or token-like text');

const expectedRoutes = new Set(manifest.expectedRoutes);
for (const route of ['http://127.0.0.1:5173/?menu_id=step_1_14#workflow', 'http://127.0.0.1:5173/?menu_id=step_1_14#repository-info', 'http://127.0.0.1:5173/?menu_id=step_1_14#settings']) {
  assertCondition(expectedRoutes.has(route), `missing expected route: ${route}`);
}

const pageIds = new Set(manifest.pages.map((page) => new URL(page.url).hash.replace(/^#\/?/, '') || 'overview'));
for (const pageId of ['overview', 'workflow', 'repository-info', 'settings', 'help']) {
  assertCondition(pageIds.has(pageId), `missing manifest page: ${pageId}`);
}

const categories = new Set(manifest.localContentUxAdvisory.rubric.map((item) => item.category));
assertCondition(categories.has('workflow_state_clarity'), 'lesson-owned rubric must retain workflow_state_clarity semantics');
assertCondition(categories.has('next_action_clarity'), 'lesson-owned rubric must retain next_action_clarity semantics');
assertCondition(categories.has('decision_support'), 'lesson-owned rubric must include repository decision support');

const overview = manifest.pages.find((page) => page.role === 'workflow_overview');
assertCondition(overview, 'overview page must keep lesson workflow role');
assertCondition(overview.expectations.dataBindings.some((binding) => binding.pointer === '/selected_context/evidence_status'), 'overview must bind selected_context evidence status');
assertCondition(overview.expectations.dataBindings.some((binding) => binding.pointer === '/selected_context/next_safe_action/risk_level'), 'overview must bind next safe action risk level');
assertCondition(overview.expectations.dataBindings.every((binding) => binding.selector === '#overview'), 'overview bindings must target the stable overview root');
NODE

MANIFEST="$renamed_manifest" node <<'NODE'
const fs = require('node:fs');

const manifest = JSON.parse(fs.readFileSync(process.env.MANIFEST, 'utf8'));

function fail(message) {
  console.error(message);
  process.exit(1);
}

function assertCondition(condition, message) {
  if (!condition) fail(message);
}

assertCondition(manifest.name === 'renamed-control-center', 'manifest target id must be configurable');
assertCondition(manifest.baseUrl === 'http://127.0.0.1:6199/?menu_id=step_1_14', 'manifest base URL must be configurable from environment');
assertCondition(manifest.appHints?.reviewGoal === 'renamed_control_center_review', 'review goal id must derive from the configured target id');
NODE

MANIFEST="$compat_manifest" node <<'NODE'
const fs = require('node:fs');

const manifest = JSON.parse(fs.readFileSync(process.env.MANIFEST, 'utf8'));
if (manifest.schemaVersion !== '0.1.0') {
  console.error('compat wrapper must generate the review manifest schema');
  process.exit(1);
}
NODE

printf 'dashboard review manifest test passed\n'
