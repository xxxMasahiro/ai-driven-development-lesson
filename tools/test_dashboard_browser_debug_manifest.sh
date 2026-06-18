#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

manifest="$TMP_DIR/dashboard-browser-debug-target.json"

"$ROOT/tools/dashboard-browser-debug-manifest" \
  --source tests/fixtures/dashboard-control-center.json \
  --base-url http://127.0.0.1:5173/ \
  --output "$manifest"

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

assertCondition(manifest.schemaVersion === '0.1.0', 'manifest schema version must match Browser Debug CLI target schema');
assertCondition(manifest.name === 'ai-driven-development-lesson-dashboard-control-center', 'manifest name must identify the lesson-owned target');
assertCondition(manifest.baseUrl === 'http://127.0.0.1:5173/', 'base URL must be configurable');
assertCondition(manifest.localContentUxAdvisory?.enabled === true, 'content UX advisory must be enabled for lesson-owned review manifest');
assertCondition(manifest.sourceData?.[0]?.id === 'dashboard_context', 'manifest must inline bounded dashboard_context sourceData');
assertCondition(manifest.sourceData[0].data.selected_context.git_status === 'unknown', 'selected context Git status must remain in lesson sourceData');
assertCondition(manifest.sourceData[0].data.selected_context.ci_status === 'optional', 'selected context CI status must remain in lesson sourceData');
assertCondition(manifest.sourceData[0].data.selected_context.blocker_count === 1, 'selected context blocker count must remain in lesson sourceData');
assertCondition(!JSON.stringify(manifest).includes('TOKEN=abcdefghijklmnop'), 'manifest must not copy raw dashboard warnings or token-like text');

const expectedRoutes = new Set(manifest.expectedRoutes);
for (const route of ['http://127.0.0.1:5173/#workflow', 'http://127.0.0.1:5173/#repository-info', 'http://127.0.0.1:5173/#settings']) {
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
NODE

printf 'dashboard browser-debug manifest test passed\n'
