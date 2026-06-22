#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

project_root="$TMP_DIR/projects"
frame_repo="$project_root/frame-cue"
browser_repo="$project_root/browser-debug-cli"
trace_repo="$project_root/trace-cue"
config="$TMP_DIR/LESSON_CONFIG.tsv"
registry="$TMP_DIR/PRODUCT_REPOSITORY_REGISTRY.tsv"
selection="$TMP_DIR/PRODUCT_REPOSITORY_SELECTION.tsv"
json_file="$TMP_DIR/dashboard-data.json"

mkdir -p "$frame_repo" "$browser_repo"
printf '# FrameCue Fixture\n' >"$frame_repo/README.md"

git -C "$browser_repo" init -q
mkdir -p "$browser_repo/docs/product" "$browser_repo/docs/workflow" "$browser_repo/docs/memory" "$browser_repo/docs/design-system"
mkdir -p "$browser_repo/ops" "$browser_repo/src" "$browser_repo/tests" "$browser_repo/skills/product-development-workflow"
mkdir -p "$browser_repo/skills/product-doc-sync" "$browser_repo/skills/product-security" "$browser_repo/skills/product-test" "$browser_repo/skills/product-design-system"
mkdir -p "$browser_repo/bin" "$browser_repo/tools/lib" "$browser_repo/.github/workflows"
printf '# Browser Debug CLI Agents\n' >"$browser_repo/AGENTS.MD"
printf '# Browser Debug CLI\n' >"$browser_repo/README.md"
printf '#!/usr/bin/env node\n' >"$browser_repo/bin/browser-debug.js"
cat >"$browser_repo/package.json" <<'DOC'
{
  "name": "review-cli-fixture",
  "private": true,
  "type": "module",
  "bin": {
    "review-cli-fixture": "./bin/browser-debug.js"
  }
}
DOC
cat >"$browser_repo/.gitignore" <<'DOC'
.env
.env.*
node_modules/
coverage/
test-results/
DOC
printf '# Requirements\n' >"$browser_repo/docs/product/REQUIREMENTS.md"
printf '# Specification\n' >"$browser_repo/docs/product/SPECIFICATION.md"
printf '# Implementation Plan\n' >"$browser_repo/docs/product/IMPLEMENTATION_PLAN.md"
printf '# Task Tracker\n\n## Current Status\nReady.\n\n## Remaining Work\n- Continue.\n\nHANDOFF\n' >"$browser_repo/docs/workflow/TASK_TRACKER.md"
printf '# Handoff\n\n## Current State\nReady.\n\n## Next Step\n- Continue.\n\nTASK_TRACKER\n' >"$browser_repo/docs/workflow/HANDOFF.md"
printf '# Memory\n' >"$browser_repo/docs/memory/README.md"
printf '# Security\n' >"$browser_repo/docs/workflow/SECURITY.md"
printf '# Verification\n' >"$browser_repo/docs/workflow/VERIFICATION.md"
printf '# Design System\n' >"$browser_repo/docs/design-system/DESIGN_SYSTEM.md"
printf '{"schema_version":"1.0.0","tokens":[]}\n' >"$browser_repo/docs/design-system/tokens.json"
printf '{"schema_version":"1.0.0","components":[]}\n' >"$browser_repo/docs/design-system/components.json"
printf 'source\n' >"$browser_repo/src/index.txt"
printf 'test\n' >"$browser_repo/tests/test.txt"

cat >"$browser_repo/ops/STAGE_MANIFEST.tsv" <<'DOC'
# stage_id	required_mode	contexts	product_types	dashboard_group	description
build	required	all	all	workflow	Build stage.
DOC
cat >"$browser_repo/ops/TEST_PLAN_MANIFEST.tsv" <<'DOC'
# test_id	required_mode	contexts	product_types	command_id	evidence_source	dashboard_group	description
unit	required	all	all	test_product_repository	product.gates.tests	workflow	Unit test.
DOC
cat >"$browser_repo/ops/SECURITY_MANIFEST.tsv" <<'DOC'
# security_id	required_mode	contexts	policy_source	evidence_source	dashboard_group	description
secrets	required	all	docs/workflow/SECURITY.md	product.security.secrets	security	Secret scan.
DOC
cat >"$browser_repo/ops/CI_MANIFEST.tsv" <<'DOC'
# ci_id	required_mode	contexts	workflow_file	workflow_name	branch_policy	evidence_source	description
main	contextual	product-improvement|external-integration	.github/workflows/ci.yml	CI	main	product.ci.main	Main CI.
DOC
cat >"$browser_repo/ops/DASHBOARD_MANIFEST.tsv" <<'DOC'
# surface_id	required_mode	contexts	source_id	label_key	dashboard_group	description
overview	required	all	product.overview	overview	overview	Product overview.
DOC
cat >"$browser_repo/ops/DESIGN_SYSTEM_MANIFEST.tsv" <<'DOC'
# design_id	required_mode	contexts	source_path	generated_path	check_command	description
product-design-system	required	all	docs/design-system/DESIGN_SYSTEM.md	none	tools/check_product_design_system.sh	Product design-system check.
DOC
cat >"$browser_repo/ops/PRODUCT_MANIFEST.tsv" <<'DOC'
# authority_id	required_mode	contexts	product_types	path	path_role	validation_rule	dashboard_group	description
product.entrypoint	required	all	cli	README.md	entrypoint	file_exists	workflow	Product entrypoint.
product.source	required	all	cli	src/index.txt	source	file_nonempty	workflow	Product source authority.
product.test	required	all	cli	tests/test.txt	test	file_nonempty	workflow	Product test authority.
DOC
cat >"$browser_repo/ops/PRODUCT_PROFILE.json" <<'DOC'
{
  "schema_version": "1.0.0",
  "profile_kind": "product_display_profile",
  "menu_id": "free-development",
  "profile_scope": "product",
  "display_name": {
    "ja": "Browser Debug CLI",
    "en": "Browser Debug CLI"
  },
  "description": {
    "ja": "自由開発で選択されたブラウザデバッグCLIです。",
    "en": "The selected browser debugging CLI for free-development."
  },
  "source": "learner_confirmed",
  "confirmed_at": "2026-06-17T00:00:00Z",
  "source_documents": [
    "docs/product/REQUIREMENTS.md"
  ]
}
DOC
cat >"$browser_repo/ops/REPOSITORY_INDEX.json" <<'DOC'
{
  "schema_version": "1.0.0",
  "root_name": "browser-debug-cli",
  "source": "external_product_repository",
  "default_expand_depth": 1,
  "excludes": [],
  "roles": {
    "repository_file": {
      "label": "Repository file",
      "description": "Product repository file"
    }
  },
  "files": [
    {"path":"AGENTS.MD","type":"file","tracked":true,"description":"Agent entry.","role_ids":["repository_file"]},
    {"path":"README.md","type":"file","tracked":true,"description":"Repository overview.","role_ids":["repository_file"]}
  ]
}
DOC
cat >"$browser_repo/ops/PRODUCT_OPERATION_MODE.tsv" <<'DOC'
# key	value
workflow_mode	parent_managed
managed_by_parent	true
parent_repository	lesson_repository
parent_rules_ref	AGENTS.MD
last_parent_sync	2026-06-17T00:00:00Z
active_parent_run	none
local_agents_version	1
routing_table_version	1
DOC

for skill in product-development-workflow product-doc-sync product-security product-test product-design-system; do
  cat >"$browser_repo/skills/$skill/SKILL.md" <<DOC
---
name: $skill
description: Product-local $skill guidance.
---

# $skill
DOC
done
for tool in product-gate check_product_structure.sh check_product_docs.sh check_product_security.sh check_product_design_system.sh test_product_repository.sh product-mode; do
  cat >"$browser_repo/tools/$tool" <<DOC
#!/usr/bin/env bash
set -euo pipefail
printf '%s passed\n' "$tool"
DOC
  chmod +x "$browser_repo/tools/$tool"
done
cat >"$browser_repo/tools/lib/product_common.sh" <<'DOC'
#!/usr/bin/env bash
product_repo_root() {
  cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd
}
DOC
"$ROOT/tools/product-gate-evidence-bootstrap" install --repo "$browser_repo" --confirm >/dev/null
/bin/cp -a "$browser_repo" "$trace_repo"
printf '#!/usr/bin/env node\n' >"$trace_repo/bin/trace-cue.js"
cat >"$trace_repo/package.json" <<'DOC'
{
  "name": "trace-cue-fixture",
  "private": true,
  "type": "module",
  "bin": {
    "trace-cue-fixture": "./bin/trace-cue.js"
  }
}
DOC

mutation_registry="$TMP_DIR/PRODUCT_REPOSITORY_REGISTRY_MUTATION.tsv"
mutation_selection="$TMP_DIR/PRODUCT_REPOSITORY_SELECTION_MUTATION.tsv"
PRODUCT_REPOSITORY_REGISTRY_FILE="$mutation_registry" \
PRODUCT_REPOSITORY_SELECTION_FILE="$mutation_selection" \
  "$ROOT/tools/product-repository-registry" register \
    --repo-id browser-debug-cli \
    --menu free-development \
    --contexts free-development \
    --name "Browser Debug CLI" \
    --path "$browser_repo" \
    --product-type cli \
    --confirm >/dev/null
awk -F '\t' '$1 == "browser-debug-cli" && $2 == "free-development" && $3 == "free-development" && $4 == "Browser Debug CLI" && $5 != "" && $6 == "cli" && $7 == "explicit" { found = 1 } END { exit found ? 0 : 1 }' \
  "$mutation_registry"
PRODUCT_REPOSITORY_REGISTRY_FILE="$mutation_registry" \
PRODUCT_REPOSITORY_SELECTION_FILE="$mutation_selection" \
  "$ROOT/tools/product-repository-registry" register \
    --repo-id browser-debug-cli \
    --menu free-development \
    --contexts free-development \
    --name "Browser Debug CLI" \
    --path "$browser_repo" \
    --product-type cli \
    --confirm >/tmp/product-repository-registry-duplicate.out 2>&1 && exit 1 || true
grep 'repository id already registered: browser-debug-cli' /tmp/product-repository-registry-duplicate.out >/dev/null
PRODUCT_REPOSITORY_REGISTRY_FILE="$mutation_registry" \
PRODUCT_REPOSITORY_SELECTION_FILE="$mutation_selection" \
  "$ROOT/tools/product-repository-registry" register \
    --repo-id browser-debug-cli \
    --menu free-development \
    --contexts free-development \
    --name "Browser Debug CLI Updated" \
    --path "$browser_repo" \
    --product-type cli \
    --replace \
    --confirm >/dev/null
grep 'Browser Debug CLI Updated' "$mutation_registry" >/dev/null
PRODUCT_REPOSITORY_REGISTRY_FILE="$mutation_registry" \
PRODUCT_REPOSITORY_SELECTION_FILE="$mutation_selection" \
  "$ROOT/tools/product-repository-registry" select free-development browser-debug-cli --confirm >/dev/null
PRODUCT_REPOSITORY_REGISTRY_FILE="$mutation_registry" \
PRODUCT_REPOSITORY_SELECTION_FILE="$mutation_selection" \
  "$ROOT/tools/product-repository-registry" selected free-development \
  | awk -F '\t' '$1 == "free-development" && $2 == "browser-debug-cli" && $3 != "" { found = 1 } END { exit found ? 0 : 1 }'
PRODUCT_REPOSITORY_REGISTRY_FILE="$mutation_registry" \
PRODUCT_REPOSITORY_SELECTION_FILE="$mutation_selection" \
  "$ROOT/tools/product-repository-registry" select product-improvement browser-debug-cli --confirm \
  >/tmp/product-repository-registry-disallowed-selection.out 2>&1 && exit 1 || true
grep 'repository browser-debug-cli is not allowed for product-improvement' /tmp/product-repository-registry-disallowed-selection.out >/dev/null

cat >"$config" <<DOC
# key	value
lesson_repo_name	ai-driven-development-lesson
product_repo_name	browser-debug-cli
project_root	$project_root
flow_file	lesson/LESSON_FLOW_14_DAYS.tsv
state_file	learning/LESSON_STATE_14_DAYS.tsv
learning_tracker_file	learning/LEARNING_TASK_TRACKER_14_DAYS.md
learning_handoff_file	learning/LEARNING_HANDOFF_14_DAYS.md
approval_file	learning/LESSON_APPROVALS_14_DAYS.tsv
learning_mode_file	learning/LESSON_MODE_14_DAYS.tsv
workflow_language_file	learning/WORKFLOW_DISPLAY_LANGUAGE_14_DAYS.tsv
product_language_file	learning/PRODUCT_DEVELOPMENT_LANGUAGE_14_DAYS.tsv
roadmap_file	learning/ROADMAP.md
helpdesk_file	learning/HELP_DESK.md
sync_gates_file	lesson/SYNC_GATES_14_DAYS.tsv
prompt_file	prompts/PROMPTS_14_DAYS.md
DOC
cat >"$registry" <<DOC
# repo_id	primary_menu_id	allowed_contexts	display_name	repository_path	product_type	source
frame-cue	free-development	free-development	FrameCue	$frame_repo	all	test
browser-debug-cli	free-development	free-development	Browser Debug CLI	$browser_repo	cli	test
DOC
cat >"$selection" <<'DOC'
# menu_id	repo_id	selected_at	selection_source
free-development	browser-debug-cli	2026-06-17T00:00:00Z	test
DOC

DASHBOARD_DATA_GENERATED_AT="2026-06-17T00:00:00Z" \
  DASHBOARD_LIVE_STATUS=0 \
  DASHBOARD_SELECTED_MENU_ID="free-development" \
  DASHBOARD_LESSON14_CONFIG="$config" \
  PRODUCT_REPOSITORY_REGISTRY_FILE="$registry" \
  PRODUCT_REPOSITORY_SELECTION_FILE="$selection" \
  PRODUCT_REPOSITORY_AUTHORITY_NOW="2026-06-17T00:30:00Z" \
  "$ROOT/tools/dashboard-data" >"$json_file"

node - "$json_file" <<'NODE'
const fs = require('fs');
const data = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
function fail(message) {
  console.error(message);
  process.exit(1);
}
const availableFree = Array.isArray(data.available_contexts)
  ? data.available_contexts.find((item) => item.menu_id === 'free-development')
  : data.available_contexts?.['free-development'];
const targetSetting = data.settings.items.find((item) => item.id === 'target_repository');
const selectedFields = {
  selected_context: data.selected_context?.target_repository?.name,
  contexts_by_menu: data.contexts_by_menu?.['free-development']?.target_repository?.name,
  available_contexts: availableFree?.target_repository_name,
  settings_target_repository: targetSetting?.current_value,
  development_product_repository: data.development?.product_repository?.configured_name,
  authority_repository: data.development?.product_authority?.repository?.configured_name,
  repository_scope: data.repository_scope?.repository_name
};
for (const [field, value] of Object.entries(selectedFields)) {
  if (!value) fail(`missing selected free-development repository field: ${field}`);
  const text = String(value);
  if (!text.includes('Browser Debug CLI') && !text.includes('browser-debug-cli')) {
    fail(`${field} did not point at browser-debug-cli: ${value}`);
  }
  if (text.includes('FrameCue') || text.includes('frame-cue') || text.includes('task-tracker-repository')) {
    fail(`${field} mixed another repository into selected free-development context: ${value}`);
  }
}
if (data.selected_context.menu_id !== 'free-development') {
  fail(`expected free-development selected context, got ${data.selected_context.menu_id}`);
}
if (data.selected_context.target_repository.repo_id !== 'browser-debug-cli') {
  fail(`selected context repo_id must be browser-debug-cli, got ${data.selected_context.target_repository.repo_id}`);
}
if (data.contexts_by_menu?.['free-development']?.target_repository?.repo_id !== 'browser-debug-cli') {
  fail(`contexts_by_menu free-development repo_id must be browser-debug-cli, got ${data.contexts_by_menu?.['free-development']?.target_repository?.repo_id}`);
}
if (data.selected_context.target_repository.selection_state !== 'explicit') {
  fail(`selected context selection_state must be explicit, got ${data.selected_context.target_repository.selection_state}`);
}
if (data.development.product_authority.repository.configured_name !== 'browser-debug-cli') {
  fail(`authority configured_name must come from selected repo basename, got ${data.development.product_authority.repository.configured_name}`);
}
const selection = data.repository_selection;
if (!selection || selection.menu_id !== 'free-development') {
  fail('free-development repository_selection must match the selected menu');
}
if (selection.status !== 'ready') {
  fail(`selected free-development repository_selection must be ready, got ${selection.status}`);
}
if (selection.current_repo_id !== 'browser-debug-cli' || selection.current_repository_name !== 'Browser Debug CLI') {
  fail(`selected free-development repository_selection must point at browser-debug-cli: ${JSON.stringify(selection)}`);
}
if (selection.selection_state !== 'explicit') {
  fail(`selected free-development repository_selection must use explicit selection_state, got ${selection.selection_state}`);
}
if (!Array.isArray(selection.options) || selection.options.length !== 2) {
  fail(`selected free-development repository_selection must expose two eligible candidates: ${JSON.stringify(selection.options)}`);
}
const selectedOption = selection.options.find((option) => option.repo_id === 'browser-debug-cli');
const otherOption = selection.options.find((option) => option.repo_id === 'frame-cue');
if (!selectedOption || !otherOption) {
  fail(`selected free-development repository_selection must expose both fixture candidates: ${JSON.stringify(selection.options)}`);
}
if (selectedOption.display_name !== 'Browser Debug CLI' || selectedOption.selected !== true || selectedOption.selectable !== true || selectedOption.status !== 'ready') {
  fail(`selected candidate must be ready, selectable, and selected: ${JSON.stringify(selectedOption)}`);
}
if (selectedOption.primary_menu_id !== 'free-development' || selectedOption.allowed_contexts.join('|') !== 'free-development') {
  fail(`selected candidate contexts must come from registry eligibility: ${JSON.stringify(selectedOption)}`);
}
if (selectedOption.product_type !== 'cli' || selectedOption.registration_source !== 'unknown') {
  fail(`selected candidate product type/source must be generic and normalized: ${JSON.stringify(selectedOption)}`);
}
if (selectedOption.path_state !== 'configured' || selectedOption.git_state !== 'configured') {
  fail(`selected candidate must expose configured path/git states without raw paths: ${JSON.stringify(selectedOption)}`);
}
if (selectedOption.select_command !== 'tools/product-repository-registry selected free-development') {
  fail(`selected candidate command must be a display-only selected check, got ${selectedOption.select_command}`);
}
if (otherOption.selected !== false || otherOption.selectable !== false || otherOption.status !== 'missing') {
  fail(`non-git fixture candidate must stay unavailable instead of being selected: ${JSON.stringify(otherOption)}`);
}
if (otherOption.select_command !== 'tools/product-repository-registry verify --context free-development --all') {
  fail(`unavailable candidate command must be verification preview, got ${otherOption.select_command}`);
}
for (const option of selection.options) {
  if ('repository_path' in option || 'path' in option) {
    fail(`repository_selection options must not expose raw local paths: ${JSON.stringify(option)}`);
  }
}
if (JSON.stringify(selection).includes('/projects/') || JSON.stringify(selection).includes('task-tracker-repository')) {
  fail('repository_selection must not leak raw paths or legacy fallback repository names');
}
const browserDebug = data.browser_debug;
if (!browserDebug || browserDebug.selected_cli_repository !== 'browser-debug-cli') {
  fail(`browser_debug handoff must come from the explicitly selected repository id: ${JSON.stringify(browserDebug)}`);
}
if (browserDebug.tool.status !== 'ready') {
  fail(`browser_debug tool must be ready for a selected CLI repository, got ${browserDebug.tool.status}`);
}
for (const stage of ['tool', 'review', 'agent_package', 'agent_result', 'agent_report']) {
  const command = String(browserDebug[stage]?.command || '');
  if (!command.startsWith('node product:bin/browser-debug.js')) {
    fail(`browser_debug ${stage} command must use a product-scoped command preview: ${command}`);
  }
  if (command.includes('browser-debug-cli:') || command.includes('/projects/')) {
    fail(`browser_debug ${stage} command must not hard-code a repository id or local path: ${command}`);
  }
}
NODE

trace_registry="$TMP_DIR/PRODUCT_REPOSITORY_REGISTRY_TRACE.tsv"
trace_selection="$TMP_DIR/PRODUCT_REPOSITORY_SELECTION_TRACE.tsv"
trace_json="$TMP_DIR/dashboard-data-trace-cue.json"
cat >"$trace_registry" <<DOC
# repo_id	primary_menu_id	allowed_contexts	display_name	repository_path	product_type	source
trace-cue	free-development	free-development	Trace Cue	$trace_repo	cli	test
DOC
cat >"$trace_selection" <<'DOC'
# menu_id	repo_id	selected_at	selection_source
free-development	trace-cue	2026-06-17T00:00:00Z	test
DOC
DASHBOARD_DATA_GENERATED_AT="2026-06-17T00:00:00Z" \
  DASHBOARD_LIVE_STATUS=0 \
  DASHBOARD_SELECTED_MENU_ID="free-development" \
  DASHBOARD_LESSON14_CONFIG="$config" \
  PRODUCT_REPOSITORY_REGISTRY_FILE="$trace_registry" \
  PRODUCT_REPOSITORY_SELECTION_FILE="$trace_selection" \
  PRODUCT_REPOSITORY_AUTHORITY_NOW="2026-06-17T00:30:00Z" \
  "$ROOT/tools/dashboard-data" >"$trace_json"
node - "$trace_json" <<'NODE'
const fs = require('fs');
const data = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
function fail(message) {
  console.error(message);
  process.exit(1);
}
const browserDebug = data.browser_debug;
if (!browserDebug || browserDebug.selected_cli_repository !== 'trace-cue') {
  fail(`browser_debug must support renamed review CLI repository ids, got ${JSON.stringify(browserDebug)}`);
}
if (browserDebug.tool.status !== 'ready') {
  fail(`renamed review CLI repository must be ready, got ${browserDebug.tool.status}`);
}
const serialized = JSON.stringify(browserDebug);
if (!serialized.includes('node product:bin/trace-cue.js')) {
  fail(`renamed review CLI handoff must use the renamed package bin entrypoint: ${serialized}`);
}
if (serialized.includes('browser-debug-cli:') || serialized.includes('/projects/agent-toolbox/browser-debug-cli')) {
  fail('renamed review CLI handoff must not rely on the old repository id or URI');
}
NODE

missing_selected_registry="$TMP_DIR/PRODUCT_REPOSITORY_REGISTRY_MISSING_SELECTED.tsv"
missing_selected_selection="$TMP_DIR/PRODUCT_REPOSITORY_SELECTION_MISSING_SELECTED.tsv"
missing_selected_json="$TMP_DIR/dashboard-data-missing-selected-ready-alternative.json"
cat >"$missing_selected_registry" <<DOC
# repo_id	primary_menu_id	allowed_contexts	display_name	repository_path	product_type	source
old-review-cli	free-development	free-development	Old Review CLI	$TMP_DIR/missing-review-cli	cli	test
current-review-cli	free-development	free-development	Current Review CLI	$trace_repo	cli	test
DOC
cat >"$missing_selected_selection" <<'DOC'
# menu_id	repo_id	selected_at	selection_source
free-development	old-review-cli	2026-06-17T00:00:00Z	test
DOC
DASHBOARD_DATA_GENERATED_AT="2026-06-17T00:00:00Z" \
  DASHBOARD_LIVE_STATUS=0 \
  DASHBOARD_SELECTED_MENU_ID="free-development" \
  DASHBOARD_LESSON14_CONFIG="$config" \
  PRODUCT_REPOSITORY_REGISTRY_FILE="$missing_selected_registry" \
  PRODUCT_REPOSITORY_SELECTION_FILE="$missing_selected_selection" \
  PRODUCT_REPOSITORY_AUTHORITY_NOW="2026-06-17T00:30:00Z" \
  "$ROOT/tools/dashboard-data" >"$missing_selected_json"
node - "$missing_selected_json" <<'NODE'
const fs = require('fs');
const data = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
function fail(message) {
  console.error(message);
  process.exit(1);
}
const availableFree = data.available_contexts.find((item) => item.menu_id === 'free-development');
if (!availableFree || availableFree.selectable !== true) {
  fail(`free-development must stay selectable when a ready alternative repository exists: ${JSON.stringify(availableFree)}`);
}
if (availableFree.disabled_reason_key !== 'context.menuAvailability.selectable') {
  fail(`selectable free-development must expose the selectable reason key: ${JSON.stringify(availableFree)}`);
}
const selection = data.repository_selection;
if (!selection || selection.menu_id !== 'free-development') {
  fail('repository_selection must describe the selected free-development menu');
}
const selectedMissing = selection.options.find((option) => option.repo_id === 'old-review-cli');
const readyAlternative = selection.options.find((option) => option.repo_id === 'current-review-cli');
if (!selectedMissing || selectedMissing.selected !== true || selectedMissing.selectable !== false || selectedMissing.status !== 'missing') {
  fail(`selected missing repository must remain visible as the selected problem: ${JSON.stringify(selectedMissing)}`);
}
if (!readyAlternative || readyAlternative.selected !== false || readyAlternative.selectable !== true || readyAlternative.status !== 'ready') {
  fail(`ready alternative repository must stay selectable inside the menu: ${JSON.stringify(readyAlternative)}`);
}
if (readyAlternative.select_command !== 'tools/product-repository-registry select free-development current-review-cli --confirm') {
  fail(`ready alternative command must use the guarded registry selector: ${readyAlternative.select_command}`);
}
NODE

for no_target_menu in product-improvement external-integration; do
  no_target_json="$TMP_DIR/dashboard-data-$no_target_menu-no-target.json"
  DASHBOARD_DATA_GENERATED_AT="2026-06-17T00:00:00Z" \
    DASHBOARD_LIVE_STATUS=0 \
    DASHBOARD_SELECTED_MENU_ID="$no_target_menu" \
    DASHBOARD_LESSON14_CONFIG="$config" \
    PRODUCT_REPOSITORY_REGISTRY_FILE="$registry" \
    PRODUCT_REPOSITORY_SELECTION_FILE="$selection" \
    PRODUCT_REPOSITORY_AUTHORITY_NOW="2026-06-17T00:30:00Z" \
    "$ROOT/tools/dashboard-data" >"$no_target_json"
  node - "$no_target_json" "$no_target_menu" <<'NODE'
const fs = require('fs');
const data = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const menuId = process.argv[3];
function fail(message) {
  console.error(message);
  process.exit(1);
}
const available = Array.isArray(data.available_contexts)
  ? data.available_contexts.find((item) => item.menu_id === menuId)
  : data.available_contexts?.[menuId];
if (data.selected_context.menu_id !== menuId) {
  fail(`expected selected context ${menuId}, got ${data.selected_context.menu_id}`);
}
for (const [field, value] of Object.entries({
  selected_context: data.selected_context?.target_repository?.name,
  contexts_by_menu: data.contexts_by_menu?.[menuId]?.target_repository?.name,
  available_contexts: available?.target_repository_name,
  development_product_repository: data.development?.product_repository?.configured_name,
  authority_repository: data.development?.product_authority?.repository?.configured_name,
  repository_scope: data.repository_scope?.repository_name,
})) {
  if (value !== 'not_selected') {
    fail(`${menuId} ${field} must stay not_selected without an explicit registry selection, got ${value}`);
  }
}
if (data.selected_context.target_repository.path_state !== 'missing') {
  fail(`${menuId} selected context target_repository.path_state must be missing without a target, got ${data.selected_context.target_repository.path_state}`);
}
if (data.selected_context.target_repository.repo_id !== 'not_selected') {
  fail(`${menuId} selected context repo_id must be not_selected without a target, got ${data.selected_context.target_repository.repo_id}`);
}
if (data.selected_context.target_repository.selection_state !== 'none') {
  fail(`${menuId} selected context selection_state must be none without a target, got ${data.selected_context.target_repository.selection_state}`);
}
if (data.selected_context.evidence_status !== 'missing') {
  fail(`${menuId} selected context evidence_status must be missing without a target, got ${data.selected_context.evidence_status}`);
}
if (!available || available.selectable !== false || available.status !== 'missing') {
  fail(`${menuId} available context must be disabled as missing: ${JSON.stringify(available)}`);
}
const blockers = data.development?.product_authority?.product_operation_blockers || [];
if (!blockers.some((item) => item.source === 'repositories.product' && item.status === 'missing')) {
  fail(`${menuId} must expose a repositories.product missing blocker`);
}
const selection = data.repository_selection;
if (!selection || selection.menu_id !== menuId) {
  fail(`${menuId} repository_selection must match the selected menu`);
}
if (selection.status !== 'missing') {
  fail(`${menuId} repository_selection must be missing without eligible candidates, got ${selection.status}`);
}
if (selection.current_repo_id !== 'not_selected' || selection.current_repository_name !== 'not_selected') {
  fail(`${menuId} repository_selection must stay not_selected without a target: ${JSON.stringify(selection)}`);
}
if (selection.selection_state !== 'none') {
  fail(`${menuId} repository_selection must expose none selection_state, got ${selection.selection_state}`);
}
if (!Array.isArray(selection.options) || selection.options.length !== 0) {
  fail(`${menuId} repository_selection must not expose options when no registry row is eligible: ${JSON.stringify(selection.options)}`);
}
if (JSON.stringify(data.selected_context).includes('Browser Debug CLI') || JSON.stringify(data.selected_context).includes('FrameCue') || JSON.stringify(data.selected_context).includes('task-tracker-repository')) {
  fail(`${menuId} leaked a repository fallback into selected_context`);
}
NODE
done

zero_registry="$TMP_DIR/PRODUCT_REPOSITORY_REGISTRY_ZERO_ELIGIBLE.tsv"
zero_selection="$TMP_DIR/PRODUCT_REPOSITORY_SELECTION_ZERO_ELIGIBLE.tsv"
zero_json="$TMP_DIR/dashboard-data-zero-eligible.json"
cat >"$zero_registry" <<DOC
# repo_id	primary_menu_id	allowed_contexts	display_name	repository_path	product_type	source
improvement-only	product-improvement	product-improvement	Improvement Only	$browser_repo	cli	test
DOC
printf '# menu_id\trepo_id\tselected_at\tselection_source\n' >"$zero_selection"
DASHBOARD_DATA_GENERATED_AT="2026-06-17T00:00:00Z" \
  DASHBOARD_LIVE_STATUS=0 \
  DASHBOARD_SELECTED_MENU_ID="free-development" \
  DASHBOARD_LESSON14_CONFIG="$config" \
  PRODUCT_REPOSITORY_REGISTRY_FILE="$zero_registry" \
  PRODUCT_REPOSITORY_SELECTION_FILE="$zero_selection" \
  PRODUCT_REPOSITORY_AUTHORITY_NOW="2026-06-17T00:30:00Z" \
  "$ROOT/tools/dashboard-data" >"$zero_json"
node - "$zero_json" <<'NODE'
const fs = require('fs');
const data = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
function fail(message) {
  console.error(message);
  process.exit(1);
}
const free = Array.isArray(data.available_contexts)
  ? data.available_contexts.find((item) => item.menu_id === 'free-development')
  : data.available_contexts?.['free-development'];
if (data.selected_context.menu_id !== 'free-development') {
  fail(`expected free-development selected context, got ${data.selected_context.menu_id}`);
}
if (data.selected_context?.target_repository?.name !== 'not_selected') {
  fail(`free-development must be not_selected when registry has zero eligible repositories, got ${data.selected_context?.target_repository?.name}`);
}
if (!free || free.selectable !== false || free.status !== 'missing' || free.target_repository_name !== 'not_selected') {
  fail(`free-development zero-eligible context must be disabled as missing: ${JSON.stringify(free)}`);
}
const selection = data.repository_selection;
if (!selection || selection.menu_id !== 'free-development') {
  fail('free-development zero-eligible repository_selection must match the selected menu');
}
if (selection.status !== 'missing' || selection.current_repo_id !== 'not_selected' || selection.current_repository_name !== 'not_selected') {
  fail(`free-development zero-eligible repository_selection must be missing/not_selected: ${JSON.stringify(selection)}`);
}
if (selection.selection_state !== 'none') {
  fail(`free-development zero-eligible repository_selection selection_state must be none, got ${selection.selection_state}`);
}
if (!Array.isArray(selection.options) || selection.options.length !== 0) {
  fail(`free-development zero-eligible repository_selection must not expose unrelated candidates: ${JSON.stringify(selection.options)}`);
}
const serialized = JSON.stringify(data.selected_context);
if (serialized.includes('Browser Debug CLI') || serialized.includes('browser-debug-cli') || serialized.includes('task-tracker-repository')) {
  fail('zero eligible free-development leaked a legacy repository fallback');
}
NODE

manual_required_json="$TMP_DIR/dashboard-data-product-improvement-manual-required.json"
DASHBOARD_DATA_GENERATED_AT="2026-06-17T00:00:00Z" \
  DASHBOARD_LIVE_STATUS=0 \
  DASHBOARD_SELECTED_MENU_ID="product-improvement" \
  DASHBOARD_LESSON14_CONFIG="$config" \
  PRODUCT_REPOSITORY_REGISTRY_FILE="$zero_registry" \
  PRODUCT_REPOSITORY_SELECTION_FILE="$zero_selection" \
  PRODUCT_REPOSITORY_AUTHORITY_NOW="2026-06-17T00:30:00Z" \
  "$ROOT/tools/dashboard-data" >"$manual_required_json"
node - "$manual_required_json" <<'NODE'
const fs = require('fs');
const data = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
function fail(message) {
  console.error(message);
  process.exit(1);
}
const selection = data.repository_selection;
if (!selection || selection.menu_id !== 'product-improvement') {
  fail('product-improvement manual-required repository_selection must match the selected menu');
}
if (selection.status !== 'manual_required') {
  fail(`product-improvement repository_selection must require manual selection when candidates exist, got ${selection.status}`);
}
if (selection.current_repo_id !== 'not_selected' || selection.current_repository_name !== 'not_selected') {
  fail(`product-improvement repository_selection must not invent a current repository: ${JSON.stringify(selection)}`);
}
if (selection.selection_state !== 'none') {
  fail(`product-improvement repository_selection selection_state must be none, got ${selection.selection_state}`);
}
if (!Array.isArray(selection.options) || selection.options.length !== 1) {
  fail(`product-improvement repository_selection must expose the single eligible candidate: ${JSON.stringify(selection.options)}`);
}
const option = selection.options[0];
if (option.repo_id !== 'improvement-only' || option.display_name !== 'Improvement Only') {
  fail(`product-improvement candidate identity came from the wrong registry row: ${JSON.stringify(option)}`);
}
if (option.primary_menu_id !== 'product-improvement' || !Array.isArray(option.allowed_contexts) || option.allowed_contexts.join('|') !== 'product-improvement') {
  fail(`product-improvement candidate contexts must come from registry eligibility: ${JSON.stringify(option)}`);
}
if (option.status !== 'ready' || option.selectable !== true || option.selected !== false) {
  fail(`product-improvement candidate must be selectable but not selected: ${JSON.stringify(option)}`);
}
if (option.registration_source !== 'unknown') {
  fail(`fixture-specific registration source must be normalized to unknown, got ${option.registration_source}`);
}
if (option.path_state !== 'configured' || option.git_state !== 'configured') {
  fail(`product-improvement candidate must expose configured path/git states without raw paths: ${JSON.stringify(option)}`);
}
if (option.select_command !== 'tools/product-repository-registry select product-improvement improvement-only --confirm') {
  fail(`product-improvement candidate select_command must be guarded CLI preview, got ${option.select_command}`);
}
if ('repository_path' in option || 'path' in option) {
  fail(`repository_selection options must not expose raw local paths: ${JSON.stringify(option)}`);
}
if (JSON.stringify(selection).includes('/projects/') || JSON.stringify(selection).includes('task-tracker-repository')) {
  fail('repository_selection must not leak raw paths or legacy fallback repository names');
}
NODE

printf 'Dashboard data product repository selection tests passed.\n'
