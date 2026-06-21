#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

assert_contains() {
  local haystack="$1"
  local needle="$2"
  if [[ "$haystack" != *"$needle"* ]]; then
    printf 'missing expected text: %s\n' "$needle" >&2
    exit 1
  fi
}

TEST_PROJECT_ROOT="$TMP_DIR/projects"
TEST_LESSON_MODE="$TMP_DIR/LESSON_MODE.tsv"
TEST_WORKFLOW_LANGUAGE="$TMP_DIR/WORKFLOW_DISPLAY_LANGUAGE.tsv"
TEST_PRODUCT_LANGUAGE="$TMP_DIR/PRODUCT_DEVELOPMENT_LANGUAGE.tsv"
TEST_LESSON14_MODE="$TMP_DIR/LESSON_MODE_14_DAYS.tsv"
TEST_LESSON14_WORKFLOW_LANGUAGE="$TMP_DIR/WORKFLOW_DISPLAY_LANGUAGE_14_DAYS.tsv"
TEST_LESSON14_PRODUCT_LANGUAGE="$TMP_DIR/PRODUCT_DEVELOPMENT_LANGUAGE_14_DAYS.tsv"
TEST_LESSON_CONFIG="$TMP_DIR/LESSON_CONFIG.tsv"
TEST_LESSON14_CONFIG="$TMP_DIR/LESSON_CONFIG_14_DAYS.tsv"
TEST_GIT_SETTINGS="$TMP_DIR/GIT_WORKFLOW_SETTINGS.tsv"
TEST_PRODUCT_REGISTRY="$TMP_DIR/PRODUCT_REPOSITORY_REGISTRY.tsv"
TEST_PRODUCT_SELECTION="$TMP_DIR/PRODUCT_REPOSITORY_SELECTION.tsv"

mkdir -p "$TEST_PROJECT_ROOT"
printf '# selected_at\tmode\tdescription\n2026-06-05 00:00:00\tA\tじっくり説明\n' >"$TEST_LESSON_MODE"
printf '# selected_at\tcode\tlabel\n2026-06-05 00:00:00\tja\t日本語\n' >"$TEST_WORKFLOW_LANGUAGE"
printf '# selected_at\tcode\tlabel\n2026-06-05 00:00:00\ten\tEnglish\n' >"$TEST_PRODUCT_LANGUAGE"
printf '# selected_at\tmode\tdescription\n2026-06-05 00:00:00\tA\tじっくり説明\n' >"$TEST_LESSON14_MODE"
printf '# selected_at\tcode\tlabel\n2026-06-05 00:00:00\tja\t日本語\n' >"$TEST_LESSON14_WORKFLOW_LANGUAGE"
printf '# selected_at\tcode\tlabel\n2026-06-05 00:00:00\ten\tEnglish\n' >"$TEST_LESSON14_PRODUCT_LANGUAGE"
cat >"$TEST_LESSON_CONFIG" <<DOC
# key	value
project_root	$TEST_PROJECT_ROOT
product_repo_name	task-tracker-repository
state_file	$ROOT/learning/LESSON_STATE.tsv
flow_file	$ROOT/lesson/LESSON_FLOW.tsv
approval_file	$ROOT/learning/LESSON_APPROVALS.tsv
learning_mode_file	$TEST_LESSON_MODE
workflow_language_file	$TEST_WORKFLOW_LANGUAGE
product_language_file	$TEST_PRODUCT_LANGUAGE
DOC
cat >"$TEST_LESSON14_CONFIG" <<DOC
# key	value
project_root	$TEST_PROJECT_ROOT
product_repo_name	task-tracker-repository
state_file	$ROOT/learning/LESSON_STATE_14_DAYS.tsv
flow_file	$ROOT/lesson/LESSON_FLOW_14_DAYS.tsv
approval_file	$ROOT/learning/LESSON_APPROVALS_14_DAYS.tsv
learning_mode_file	$TEST_LESSON14_MODE
workflow_language_file	$TEST_LESSON14_WORKFLOW_LANGUAGE
product_language_file	$TEST_LESSON14_PRODUCT_LANGUAGE
DOC
cat >"$TEST_GIT_SETTINGS" <<'DOC'
# key	value
branch_allowed	true
worktree_allowed	false
main_direct_work_allowed	false
automation_level	sync
commit_automation	auto
push_automation	auto
pr_creation	auto
pr_ci_monitoring	auto
merge_execution	after_approval
developer_auto_merge_allowed	true
main_ci_monitoring	auto
sync_monitoring	auto
DOC
printf '# repo_id\tprimary_menu_id\tallowed_contexts\tdisplay_name\trepository_path\tproduct_type\tsource\n' >"$TEST_PRODUCT_REGISTRY"
printf '# menu_id\trepo_id\tselected_at\tsource\n' >"$TEST_PRODUCT_SELECTION"

export DASHBOARD_LESSON_CONFIG="$TEST_LESSON_CONFIG"
export DASHBOARD_LESSON14_CONFIG="$TEST_LESSON14_CONFIG"
export GIT_WORKFLOW_SETTINGS_FILE="$TEST_GIT_SETTINGS"
export PRODUCT_REPOSITORY_REGISTRY_FILE="$TEST_PRODUCT_REGISTRY"
export PRODUCT_REPOSITORY_SELECTION_FILE="$TEST_PRODUCT_SELECTION"
export DASHBOARD_LIVE_STATUS=0
unset DASHBOARD_REVIEW_CLI_ROOT
unset TRACE_CUE_ROOT
unset DASHBOARD_BROWSER_DEBUG_CLI_ROOT
unset DASHBOARD_REVIEW_CLI_ENTRYPOINT
unset TRACE_CUE_CLI_ENTRYPOINT
unset DASHBOARD_BROWSER_DEBUG_CLI_ENTRYPOINT
unset LESSON_CONFIG

JSON_FILE="$TMP_DIR/dashboard-data.json"
DASHBOARD_DATA_GENERATED_AT="2026-06-05T00:00:00Z" "$ROOT/tools/dashboard-data" >"$JSON_FILE"

node - "$JSON_FILE" "$ROOT/dashboard-control-center/src/i18n.js" "$ROOT/tools/dashboard-data" <<'NODE'
const fs = require('fs');
const file = process.argv[2];
const i18nRaw = fs.readFileSync(process.argv[3], 'utf8');
const producerRaw = fs.readFileSync(process.argv[4], 'utf8');
const raw = fs.readFileSync(file, 'utf8');
let data;
try {
  data = JSON.parse(raw);
} catch (error) {
  console.error(`dashboard-data output is not valid JSON: ${error.message}`);
  process.exit(1);
}

function fail(message) {
  console.error(message);
  process.exit(1);
}

function requireField(path) {
  const parts = path.split('.');
  let current = data;
  for (const part of parts) {
    if (current === null || typeof current !== 'object' || !(part in current)) {
      fail(`missing JSON field: ${path}`);
    }
    current = current[part];
  }
  return current;
}

function stableStringify(value) {
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(',')}]`;
  }
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

function requireI18nKey(key) {
  if (typeof key !== 'string' || key.length === 0) {
    fail('i18n key must be a non-empty string');
  }
  const marker = `${JSON.stringify(key)}:`;
  const occurrences = i18nRaw.split(marker).length - 1;
  if (occurrences < 2) {
    fail(`document i18n key must exist for en and ja: ${key}`);
  }
}

const allowedStates = new Set([
  'missing',
  'ready',
  'passed',
  'failed',
  'blocked',
  'unknown',
  'approval_required',
  'optional',
  'cached',
  'not_run',
  'stale',
  'manual_required',
  'not_applicable',
]);

if (!/^[0-9]+\.[0-9]+\.[0-9]+$/.test(requireField('schema_version'))) {
  fail('schema_version is not semver-like');
}
if (requireField('generated_at') !== '2026-06-05T00:00:00Z') {
  fail('generated_at override was not honored');
}
const snapshotId = requireField('snapshot_id');
const contentHash = requireField('content_hash');
if (typeof snapshotId !== 'string' || !snapshotId.startsWith('2026-06-05T00:00:00Z-')) {
  fail(`snapshot_id must be generated from producer-owned snapshot identity, got ${snapshotId}`);
}
if (!/^[a-f0-9]{64}$/.test(contentHash)) {
  fail(`content_hash must be a sha256 hex value, got ${contentHash}`);
}
if (!snapshotId.endsWith(contentHash.slice(0, 12))) {
  fail('snapshot_id must include the content_hash prefix');
}
for (const seedToken of [
  '"$documents_catalog_status"',
  '"${documents_groups[*]}"',
  '"${documents_catalog[*]}"',
  '"${documents_related_commands[*]}"',
  '"$summary_workflow_language"',
  '"$summary_ui_locale"',
  '"$settings_status"',
  '"${settings_groups[*]}"',
  '"${settings_items[*]}"',
  '"$browser_debug_json"',
  '"$design_studio_json"',
  '"$operational_decision_json"',
  '"${decision_page_rows[*]}"',
  '"$repository_changes_json"',
  '"$repository_development_json"',
  '"${workflow_evidence_events[*]}"',
  '"${ci_evidence_roles[*]}"',
]) {
  if (!producerRaw.includes(seedToken)) {
    fail(`content_hash seed must include document payload token: ${seedToken}`);
  }
}

for (const path of ['source_files', 'source_commands', 'partial_failures']) {
  if (!Array.isArray(requireField(path))) {
    fail(`${path} must be an array`);
  }
}
if (!Array.isArray(requireField('summary.manual_followups'))) {
  fail('summary.manual_followups must be an array');
}

for (const sourceFile of data.source_files) {
  if (sourceFile.startsWith('/') || /^https?:\/\//.test(sourceFile)) {
    fail(`source_files must stay repository-relative: ${sourceFile}`);
  }
}
if (!data.source_files.includes('docs/workflow/DASHBOARD_DATA_SCHEMA.tsv')) {
  fail('source_files does not include dashboard schema');
}
if (!data.source_files.includes('docs/workflow/PRODUCT_REPOSITORY_STRUCTURE.tsv')) {
  fail('source_files does not include product repository structure policy');
}
if (!data.source_files.includes('docs/workflow/MENU_PRODUCT_PROFILE_POLICY.tsv')) {
  fail('source_files does not include menu product profile policy');
}
if (!data.source_files.includes('docs/workflow/PRODUCT_GATE_EVIDENCE_SCHEMA.tsv')) {
  fail('source_files does not include product gate evidence schema');
}
if (!data.source_files.includes('tools/dashboard-review-manifest')) {
  fail('source_files does not include dashboard review manifest generator');
}
if (!data.source_files.includes('tools/dashboard-design-system')) {
  fail('source_files does not include dashboard Design Studio generator');
}
if (!data.source_files.includes('docs/design-system/dashboard-control-center/orchestration.json')) {
  fail('source_files does not include dashboard Design Studio orchestration contract');
}
if (!data.source_files.includes('docs/design-system/dashboard-control-center/templates.json')) {
  fail('source_files does not include dashboard Design Studio template registry');
}
if (!data.source_commands.includes('tools/dashboard-data')) {
  fail('source_commands does not include dashboard-data');
}
if (!data.source_commands.includes('tools/product-repository-authority status --json')) {
  fail('source_commands does not include product repository authority status');
}
if (!data.source_commands.includes('tools/dashboard-design-system proposal-status')) {
  fail('source_commands does not include Design Studio proposal status');
}
for (const optionalCommand of [
  'tools/check_as_built_sync_contract.sh',
  'tools/check_workflow_pair_sync.sh',
  'tools/check_git_sync.sh',
  'tools/check_ci_status.sh',
  'tools/git-workflow status',
  'tools/product-security status',
]) {
  if (data.source_commands.includes(optionalCommand)) {
    fail(`source_commands must not claim unexecuted optional command as a source: ${optionalCommand}`);
  }
}

for (const path of [
  'selected_context.git_status',
  'selected_context.ci_status',
  'selected_context.security_status',
  'selected_context.evidence_status',
  'summary.mode',
  'development.product_repository.status',
  'development.documents.status',
  'development.git_sync_status',
  'development.ci_status',
  'development.product_authority.status',
  'development.product_authority.repository.status',
  'maintenance.as_built_sync_status',
  'maintenance.workflow_pair_status',
  'maintenance.developer_memory_status',
  'maintenance.skills_status',
  'git_workflow.policy_status',
  'git_workflow.settings_status',
  'git_workflow.gate_status',
  'git_workflow.approval_status',
  'security.policy_status',
  'security.gate_status',
  'security.dangerous_action_approval',
  'browser_debug.status',
  'browser_debug.tool.status',
  'browser_debug.manifest.status',
  'browser_debug.review.status',
  'browser_debug.agent_package.status',
  'browser_debug.agent_result.status',
  'browser_debug.agent_report.status',
  'design_studio.status',
  'operational_decision.status',
  'development.repository_changes.status',
]) {
  const value = requireField(path);
  if (!allowedStates.has(value) && path !== 'summary.mode') {
    fail(`invalid state at ${path}: ${value}`);
  }
}

const selectedContext = requireField('selected_context');
if (![
  'step_1_7',
  'step_1_14',
  'advanced',
  'free-development',
  'product-improvement',
  'external-integration',
  'lesson-repository-improvement',
  'unknown',
].includes(selectedContext.menu_id)) {
  fail(`invalid selected context menu id: ${selectedContext.menu_id}`);
}
if (![
  'none',
  'lesson',
  'free-development',
  'product-improvement',
  'external-integration',
  'lesson-maintenance',
  'custom',
  'unknown',
].includes(selectedContext.workflow_context)) {
  fail(`invalid selected workflow context: ${selectedContext.workflow_context}`);
}
if (!['none', 'local', 'remote_sync', 'ci', 'not_applicable'].includes(selectedContext.git_usage_mode)) {
  fail(`invalid selected context Git usage mode: ${selectedContext.git_usage_mode}`);
}
if (!['required', 'optional', 'not_applicable', 'unknown'].includes(selectedContext.git_requirement)) {
  fail(`invalid selected context Git requirement: ${selectedContext.git_requirement}`);
}
if (!['required', 'optional', 'not_applicable', 'unknown'].includes(selectedContext.ci_requirement)) {
  fail(`invalid selected context CI requirement: ${selectedContext.ci_requirement}`);
}
if (!['free-development', 'product-improvement', 'external-integration'].includes(selectedContext.workflow_context)) {
  if (selectedContext.git_usage_mode !== 'not_applicable') {
    fail(`non-product selected context must report Git usage mode not_applicable, got ${selectedContext.git_usage_mode}`);
  }
  if (data.development.git_sync_status === 'not_applicable' || data.development.ci_status === 'not_applicable') {
    fail('non-product selected context must not downgrade top-level development Git/CI status to not_applicable');
  }
}
const targetRepository = requireField('selected_context.target_repository');
if (typeof targetRepository.name !== 'string' || targetRepository.name.length === 0) {
  fail('selected context target repository name is required');
}
if (!['configured', 'missing', 'not_applicable', 'unknown'].includes(targetRepository.path_state)) {
  fail(`invalid selected target repository path state: ${targetRepository.path_state}`);
}
if (!['all', 'web', 'api', 'cli', 'library', 'integration', 'custom', 'unknown'].includes(selectedContext.product_type)) {
  fail(`invalid selected product type: ${selectedContext.product_type}`);
}
if (typeof selectedContext.current_step_id !== 'string' || selectedContext.current_step_id.length === 0) {
  fail('selected context current_step_id is required');
}
if (typeof selectedContext.current_step_label !== 'string' || selectedContext.current_step_label.length === 0) {
  fail('selected context current_step_label is required');
}
if (!Number.isInteger(selectedContext.current_step_index) || selectedContext.current_step_index < 0) {
  fail('selected context current_step_index must be a non-negative integer');
}
if (!Number.isInteger(selectedContext.current_step_total) || selectedContext.current_step_total < 0) {
  fail('selected context current_step_total must be a non-negative integer');
}
if (typeof selectedContext.updated_at !== 'string' || selectedContext.updated_at.length === 0) {
  fail('selected context updated_at is required');
}
if (!selectedContext.next_safe_action || typeof selectedContext.next_safe_action !== 'object' || Array.isArray(selectedContext.next_safe_action)) {
  fail('selected context next_safe_action must be an object');
}
if (!Array.isArray(selectedContext.blockers)) {
  fail('selected context blockers must be an array');
}
for (const blocker of selectedContext.blockers) {
  if (!blocker || typeof blocker !== 'object' || Array.isArray(blocker)) {
    fail('selected context blocker must be an object');
  }
  if (!['missing', 'failed', 'blocked', 'unknown', 'stale', 'not_run'].includes(blocker.status)) {
    fail(`invalid selected context blocker status: ${blocker.status}`);
  }
}
const availableContexts = requireField('available_contexts');
if (!Array.isArray(availableContexts) || availableContexts.length < 7) {
  fail('available_contexts must include the seven dashboard menu contexts');
}
const contextsByMenu = requireField('contexts_by_menu');
if (!contextsByMenu || typeof contextsByMenu !== 'object' || Array.isArray(contextsByMenu)) {
  fail('contexts_by_menu must be a producer-owned object map');
}
const availableMenuIds = new Set(availableContexts.map((context) => context.menu_id));
const contextMapKeys = new Set(Object.keys(contextsByMenu));
for (const menuId of [
  'step_1_7',
  'step_1_14',
  'advanced',
  'free-development',
  'product-improvement',
  'external-integration',
  'lesson-repository-improvement',
]) {
  if (!availableMenuIds.has(menuId)) {
    fail(`available_contexts is missing ${menuId}`);
  }
  if (!contextsByMenu[menuId]) {
    fail(`contexts_by_menu is missing ${menuId}`);
  }
}
for (const menuId of contextMapKeys) {
  if (!availableMenuIds.has(menuId)) {
    fail(`contexts_by_menu has an entry that is not available: ${menuId}`);
  }
}
for (const context of availableContexts) {
  if (!allowedStates.has(context.status)) {
    fail(`invalid available context status: ${context.status}`);
  }
  if (typeof context.selectable !== 'boolean') {
    fail(`available context ${context.menu_id} selectable must be boolean`);
  }
  for (const field of ['disabled_reason_key', 'disabled_detail', 'required_next_action']) {
    if (typeof context[field] !== 'string' || context[field].length === 0) {
      fail(`available context ${context.menu_id} missing ${field}`);
    }
  }
  if (context.selectable === false && (!context.disabled_reason_key.startsWith('context.menuAvailability.') || !context.required_next_action.length)) {
    fail(`available context ${context.menu_id} unavailable decision is incomplete`);
  }
  if (typeof context.target_repository_name !== 'string' || context.target_repository_name.length === 0) {
    fail('available context target_repository_name is required');
  }
  const fullContext = contextsByMenu[context.menu_id];
  if (!fullContext || typeof fullContext !== 'object' || Array.isArray(fullContext)) {
    fail(`contexts_by_menu.${context.menu_id} must be an object`);
  }
  if (fullContext.menu_id !== context.menu_id) {
    fail(`contexts_by_menu.${context.menu_id}.menu_id must match its key`);
  }
  for (const field of ['workflow_context', 'target_repository', 'product_type', 'current_step_id', 'current_step_label', 'updated_at', 'next_safe_action', 'blockers']) {
    if (!(field in fullContext)) {
      fail(`contexts_by_menu.${context.menu_id} missing ${field}`);
    }
  }
  for (const field of ['git_usage_mode', 'git_requirement', 'ci_requirement']) {
    if (!(field in fullContext)) {
      fail(`contexts_by_menu.${context.menu_id} missing ${field}`);
    }
  }
  for (const field of ['git_status', 'ci_status', 'security_status', 'evidence_status']) {
    if (!allowedStates.has(fullContext[field])) {
      fail(`invalid contexts_by_menu.${context.menu_id}.${field}: ${fullContext[field]}`);
    }
  }
  if (!['configured', 'missing', 'not_applicable', 'unknown'].includes(fullContext.target_repository.path_state)) {
    fail(`invalid contexts_by_menu.${context.menu_id}.target_repository.path_state`);
  }
  if (['missing', 'unknown'].includes(fullContext.target_repository.path_state) && context.workflow_context !== 'lesson' && context.selectable !== false) {
    fail(`available context ${context.menu_id} must not be selectable with target path ${fullContext.target_repository.path_state}`);
  }
  if (!Array.isArray(fullContext.blockers)) {
    fail(`contexts_by_menu.${context.menu_id}.blockers must be an array`);
  }
  if (['step_1_7', 'advanced', 'lesson-repository-improvement'].includes(context.menu_id) && fullContext.blockers.some((blocker) => /^product\.|^repositories\.product/.test(blocker.source))) {
    fail(`${context.menu_id} must not inherit product-operation blockers`);
  }
}
if (!contextsByMenu[selectedContext.menu_id]) {
  fail('selected_context must have a contexts_by_menu entry');
}
if (stableStringify(selectedContext) !== stableStringify(contextsByMenu[selectedContext.menu_id])) {
  fail('selected_context must match contexts_by_menu selected entry');
}

if (!['learning', 'development', 'maintenance', 'unknown'].includes(data.summary.mode)) {
  fail(`invalid summary mode: ${data.summary.mode}`);
}
if (typeof data.summary.workflow_language !== 'string' || data.summary.workflow_language.length === 0) {
  fail('summary.workflow_language must be a selected language code');
}
if (data.summary.display_locale !== data.summary.workflow_language) {
  fail('summary.display_locale must follow the selected workflow language');
}
const dashboardUiLocales = ['ja', 'en', 'ko', 'zh-CN', 'zh-TW', 'es', 'pt-BR', 'fr', 'de', 'id', 'vi', 'th', 'hi', 'ar'];
if (!dashboardUiLocales.includes(data.summary.ui_locale)) {
  fail(`summary.ui_locale must be a supported dashboard UI locale, got ${data.summary.ui_locale}`);
}
if (!['ltr', 'rtl'].includes(data.summary.ui_direction)) {
  fail(`summary.ui_direction must be ltr or rtl, got ${data.summary.ui_direction}`);
}
if ((data.summary.ui_locale === 'ar') !== (data.summary.ui_direction === 'rtl')) {
  fail('summary.ui_direction must match the resolved dashboard UI locale');
}
if (!Array.isArray(data.summary.blocking_items)) {
  fail('summary.blocking_items must be an array');
}
const primaryAction = requireField('summary.primary_action');
for (const field of ['title', 'description', 'target', 'expected_result', 'risk_level', 'status', 'source']) {
  if (!(field in primaryAction)) {
    fail(`summary.primary_action missing ${field}`);
  }
}
if (!['low', 'medium', 'high', 'critical'].includes(primaryAction.risk_level)) {
  fail(`invalid primary action risk level: ${primaryAction.risk_level}`);
}
if (!allowedStates.has(primaryAction.status)) {
  fail(`invalid primary action status: ${primaryAction.status}`);
}

const categoryMetrics = requireField('summary.category_metrics');
for (const metricKey of ['overview', 'lessons', 'workflow', 'maintenance', 'security']) {
  const metric = categoryMetrics[metricKey];
  if (!metric || typeof metric !== 'object' || Array.isArray(metric)) {
    fail(`missing category metric: ${metricKey}`);
  }
  for (const field of ['total', 'healthy', 'warning', 'problem', 'percent']) {
    if (!Number.isInteger(metric[field]) || metric[field] < 0) {
      fail(`invalid ${metricKey} metric ${field}: ${metric[field]}`);
    }
  }
  if (metric.percent > 100) {
    fail(`invalid ${metricKey} percent: ${metric.percent}`);
  }
  if (metric.total !== metric.healthy + metric.warning + metric.problem) {
    fail(`category metric counts do not add up for ${metricKey}`);
  }
  if (typeof metric.unit !== 'string' || metric.unit.length === 0) {
    fail(`missing metric unit for ${metricKey}`);
  }
  if (!allowedStates.has(metric.status)) {
    fail(`invalid category metric status for ${metricKey}: ${metric.status}`);
  }
}

const lessonStatuses = Object.values(data.lessons).map((lesson) => lesson.status);
const expectedLessonHealthy = lessonStatuses.filter((state) => state === 'ready' || state === 'passed').length;
if (categoryMetrics.lessons.total !== lessonStatuses.length || categoryMetrics.lessons.healthy !== expectedLessonHealthy) {
  fail('lesson category metric must be derived from structured lesson statuses');
}
const expectedLessonPercent = lessonStatuses.length ? Math.floor((expectedLessonHealthy * 100) / lessonStatuses.length) : 0;
if (categoryMetrics.lessons.percent !== expectedLessonPercent) {
  fail('lesson category metric percent must be data-derived');
}

const gitOperations = requireField('development.git_operations');
if (!Array.isArray(gitOperations) || gitOperations.length < 6) {
  fail('development.git_operations must include the configured Git operation rows');
}

const recentRuns = requireField('development.recent_runs');
if (!Array.isArray(recentRuns) || recentRuns.length < 5) {
  fail('development.recent_runs must include producer-owned recent workflow rows');
}
for (const row of recentRuns) {
  for (const field of ['id', 'time', 'type', 'target', 'detail', 'status', 'reference', 'source_role', 'required_command', 'scope']) {
    if (!(field in row) || row[field] === '') {
      fail(`recent workflow row missing ${field}`);
    }
  }
  if (!allowedStates.has(row.status)) {
    fail(`invalid recent workflow status: ${row.status}`);
  }
}

const riskLevels = new Set(['low', 'medium', 'high', 'critical']);
const freshnessStates = new Set(['current', 'stale', 'not_collected', 'unknown']);
const evidenceAuthorities = new Set(['authoritative', 'manual_required', 'advisory', 'not_collected']);
const decisionIds = new Set(['overview', 'lessons', 'workflow', 'maintenance', 'safety', 'repository-info', 'documents', 'settings', 'history']);
const decisionOwnerSources = new Set(['dashboard-data', 'product-authority', 'git-workflow', 'repository-development-workflow']);
const decisionAudiences = new Set(['non_engineer', 'junior_engineer']);
const repositoryDevelopmentPhases = new Set(['context_triage', 'proposal', 'implementation_plan', 'fast_loop', 'mid_tests', 'release_gate', 'main_sync_cleanup']);
const runnerRecordStatuses = new Set(['missing', 'current', 'stale']);
const ciEvidenceRoles = new Set(['branch_ci', 'pr_ci', 'main_ci', 'local_tests', 'provider_visibility']);
const ciHeadMatchStates = new Set(['matched', 'different', 'unknown']);

function requireTextObjectField(object, field, label) {
  if (typeof object[field] !== 'string' || object[field].length === 0) {
    fail(`${label} missing ${field}`);
  }
}

function requireEvidenceState(row, label) {
  if (!allowedStates.has(row.status)) {
    fail(`${label} has invalid status: ${row.status}`);
  }
  if (!freshnessStates.has(row.freshness_state)) {
    fail(`${label} has invalid freshness_state: ${row.freshness_state}`);
  }
  if (!evidenceAuthorities.has(row.authority)) {
    fail(`${label} has invalid authority: ${row.authority}`);
  }
}

const operationalDecision = requireField('operational_decision');
if (!operationalDecision || typeof operationalDecision !== 'object' || Array.isArray(operationalDecision)) {
  fail('operational_decision must be an object');
}
for (const field of ['decision_question', 'primary_blocker_source_id', 'why_blocked', 'next_safe_action', 'done_condition', 'approval_boundary', 'source_id']) {
  requireTextObjectField(operationalDecision, field, 'operational_decision');
}
requireEvidenceState(operationalDecision, 'operational_decision');
if (!riskLevels.has(operationalDecision.risk_level)) {
  fail(`operational_decision risk_level is invalid: ${operationalDecision.risk_level}`);
}
if (operationalDecision.command_execution_mode !== 'preview_only') {
  fail('operational_decision command_execution_mode must be preview_only');
}
if (!operationalDecision.audience_briefs || typeof operationalDecision.audience_briefs !== 'object' || Array.isArray(operationalDecision.audience_briefs)) {
  fail('operational_decision audience_briefs must be an object');
}
for (const audience of decisionAudiences) {
  if (typeof operationalDecision.audience_briefs[audience] !== 'string' || operationalDecision.audience_briefs[audience].length === 0) {
    fail(`operational_decision audience brief missing ${audience}`);
  }
}
if (Array.isArray(selectedContext.blockers) && selectedContext.blockers.length > 0) {
  const topLevelBlockers = Array.isArray(data.blocking_items) ? data.blocking_items : [];
  if (topLevelBlockers.length === 0) {
    const selectedBlockerSource = selectedContext.blockers[0].source;
    if (operationalDecision.primary_blocker_source_id !== selectedBlockerSource || operationalDecision.source_id !== selectedBlockerSource) {
      fail(`operational_decision must identify the selected context blocker source: ${selectedBlockerSource}`);
    }
  }
}

const decisionPages = requireField('decision_pages');
if (!Array.isArray(decisionPages) || decisionPages.length < decisionIds.size) {
  fail('decision_pages must cover all primary dashboard pages');
}
const seenDecisionPages = new Set();
for (const page of decisionPages) {
  if (!page || typeof page !== 'object' || Array.isArray(page)) {
    fail('decision page must be an object');
  }
  if (!decisionIds.has(page.id)) {
    fail(`invalid decision page id: ${page.id}`);
  }
  if (seenDecisionPages.has(page.id)) {
    fail(`duplicate decision page id: ${page.id}`);
  }
  seenDecisionPages.add(page.id);
  for (const field of ['title', 'scope', 'decision_question', 'decision_question_key', 'current_judgment', 'current_judgment_key', 'top_reason', 'top_reason_key', 'evidence_confidence', 'evidence_confidence_key', 'next_safe_action', 'next_safe_action_key', 'source_id']) {
    requireTextObjectField(page, field, `decision_pages.${page.id}`);
  }
  if (!Array.isArray(page.must_review_keys) || page.must_review_keys.length !== page.must_review.length || page.must_review_keys.some((key) => typeof key !== 'string' || key.length === 0)) {
    fail(`decision page must_review_keys must align with must_review: ${page.id}`);
  }
  requireEvidenceState(page, `decision_pages.${page.id}`);
  if (!riskLevels.has(page.risk_level)) {
    fail(`decision page risk level is invalid: ${page.id}`);
  }
  if (page.command_execution_mode !== 'preview_only') {
    fail(`decision page command_execution_mode must be preview_only: ${page.id}`);
  }
  if (page.detail_page !== `#${page.id}`) {
    fail(`decision page detail target must match page id: ${page.id}`);
  }
  if (page.owner_source === 'ui' || !decisionOwnerSources.has(page.owner_source)) {
    fail(`decision page owner_source must be producer-owned: ${page.id}`);
  }
  if (!Array.isArray(page.audiences)) {
    fail(`decision page audiences must be an array: ${page.id}`);
  }
  const pageAudiences = new Set(page.audiences);
  for (const audience of decisionAudiences) {
    if (!pageAudiences.has(audience)) {
      fail(`decision page must include ${audience}: ${page.id}`);
    }
  }
  if (!Array.isArray(page.must_review) || page.must_review.length === 0 || page.must_review.some((item) => typeof item !== 'string' || item.length === 0)) {
    fail(`decision page must_review must be a non-empty string list: ${page.id}`);
  }
}
for (const id of decisionIds) {
  if (!seenDecisionPages.has(id)) {
    fail(`missing decision page: ${id}`);
  }
}

const repositoryChanges = requireField('development.repository_changes');
if (!repositoryChanges || typeof repositoryChanges !== 'object' || Array.isArray(repositoryChanges)) {
  fail('development.repository_changes must be an object');
}
if (!allowedStates.has(repositoryChanges.status)) {
  fail(`invalid repository_changes status: ${repositoryChanges.status}`);
}
for (const field of ['observed_at', 'path_state', 'git_state', 'stale_reason']) {
  requireTextObjectField(repositoryChanges, field, 'development.repository_changes');
}
if (!['configured', 'missing', 'not_applicable', 'unknown'].includes(repositoryChanges.path_state) || !['configured', 'missing', 'not_applicable', 'unknown'].includes(repositoryChanges.git_state)) {
  fail('repository_changes path_state/git_state must use repository state vocabulary');
}
if (typeof repositoryChanges.detached !== 'boolean') {
  fail('repository_changes.detached must be boolean');
}
for (const field of ['staged_count', 'unstaged_count', 'untracked_count', 'ahead', 'behind', 'worktree_count']) {
  if (!Number.isInteger(repositoryChanges[field]) || repositoryChanges[field] < 0) {
    fail(`repository_changes ${field} must be a non-negative integer`);
  }
}
if (!repositoryChanges.changed_role_counts || typeof repositoryChanges.changed_role_counts !== 'object' || Array.isArray(repositoryChanges.changed_role_counts)) {
  fail('repository_changes.changed_role_counts must be an object');
}
if (
  repositoryChanges.changed_role_counts.staged !== repositoryChanges.staged_count ||
  repositoryChanges.changed_role_counts.unstaged !== repositoryChanges.unstaged_count ||
  repositoryChanges.changed_role_counts.untracked !== repositoryChanges.untracked_count
) {
  fail('repository_changes changed_role_counts must match top-level counts');
}
if (!Array.isArray(repositoryChanges.safe_changed_file_samples)) {
  fail('repository_changes.safe_changed_file_samples must be an array');
}
for (const sample of repositoryChanges.safe_changed_file_samples) {
  if (!isSafeScopedPath(sample)) {
    fail(`repository_changes safe_changed_file_samples must be safe relative paths: ${sample}`);
  }
}

const repositoryDevelopment = requireField('development.repository_development');
if (!repositoryDevelopment || typeof repositoryDevelopment !== 'object' || Array.isArray(repositoryDevelopment)) {
  fail('development.repository_development must be an object');
}
if (!repositoryDevelopmentPhases.has(repositoryDevelopment.current_phase)) {
  fail(`invalid repository_development current_phase: ${repositoryDevelopment.current_phase}`);
}
if (!Number.isInteger(repositoryDevelopment.phase_order) || repositoryDevelopment.phase_order < 0) {
  fail('repository_development.phase_order must be a non-negative integer');
}
if (!runnerRecordStatuses.has(repositoryDevelopment.runner_records_status)) {
  fail(`invalid repository_development runner_records_status: ${repositoryDevelopment.runner_records_status}`);
}
for (const field of ['inference_reason', 'purpose', 'required_inputs', 'allowed_writes', 'recommended_checks', 'required_checks', 'git_ci_expectations', 'required_approvals', 'cleanup_behavior', 'stop_conditions']) {
  requireTextObjectField(repositoryDevelopment, field, 'development.repository_development');
}
if (!Array.isArray(repositoryDevelopment.source_files) || repositoryDevelopment.source_files.length < 2) {
  fail('repository_development.source_files must identify workflow policy files');
}
for (const sourceFile of repositoryDevelopment.source_files) {
  if (!isSafeScopedPath(sourceFile)) {
    fail(`repository_development source file must be safe: ${sourceFile}`);
  }
}
if (!repositoryDevelopment.source_files.includes('docs/workflow/REPOSITORY_DEVELOPMENT_WORKFLOW.tsv')) {
  fail('repository_development.source_files must include repository workflow policy');
}

const workflowEvidenceEvents = requireField('development.workflow_evidence_events');
if (!Array.isArray(workflowEvidenceEvents) || workflowEvidenceEvents.length < 5) {
  fail('development.workflow_evidence_events must include the core evidence events');
}
const workflowEventIds = new Set();
for (const event of workflowEvidenceEvents) {
  if (!event || typeof event !== 'object' || Array.isArray(event)) {
    fail('workflow evidence event must be an object');
  }
  for (const field of ['event_id', 'source_id', 'observed_at', 'repository_head', 'detail_artifact_path', 'summary']) {
    requireTextObjectField(event, field, 'development.workflow_evidence_events');
  }
  if (workflowEventIds.has(event.event_id)) {
    fail(`duplicate workflow evidence event id: ${event.event_id}`);
  }
  workflowEventIds.add(event.event_id);
  requireEvidenceState(event, `workflow evidence event ${event.event_id}`);
  if (event.detail_artifact_path.includes(';')) {
    fail(`workflow evidence event detail_artifact_path must be a single artifact reference: ${event.detail_artifact_path}`);
  }
  if (event.detail_artifact_path !== 'not_collected' && !isSafeScopedPath(event.detail_artifact_path)) {
    fail(`workflow evidence event detail_artifact_path must be safe: ${event.detail_artifact_path}`);
  }
}
for (const eventId of ['repository-observation', 'repository-index-drift', 'git-sync', 'ci-main', 'security-gate']) {
  if (!workflowEventIds.has(eventId)) {
    fail(`missing workflow evidence event: ${eventId}`);
  }
}

const ciEvidence = requireField('development.ci_evidence');
if (!Array.isArray(ciEvidence) || ciEvidence.length < ciEvidenceRoles.size) {
  fail('development.ci_evidence must include branch, PR, main, local, and provider roles');
}
const seenCiRoles = new Set();
for (const row of ciEvidence) {
  if (!row || typeof row !== 'object' || Array.isArray(row)) {
    fail('CI evidence row must be an object');
  }
  if (!ciEvidenceRoles.has(row.role)) {
    fail(`invalid CI evidence role: ${row.role}`);
  }
  if (seenCiRoles.has(row.role)) {
    fail(`duplicate CI evidence role: ${row.role}`);
  }
  seenCiRoles.add(row.role);
  requireEvidenceState(row, `CI evidence role ${row.role}`);
  if (!ciHeadMatchStates.has(row.head_match_status)) {
    fail(`invalid CI evidence head_match_status: ${row.head_match_status}`);
  }
  if (
    row.status === 'passed' &&
    (row.head_match_status !== 'matched' || row.freshness_state !== 'current' || row.authority !== 'authoritative')
  ) {
    fail(`passed CI evidence must be current authoritative matching HEAD proof: ${row.role}`);
  }
  for (const field of ['source_id', 'summary', 'observed_at']) {
    requireTextObjectField(row, field, `development.ci_evidence.${row.role}`);
  }
}
for (const role of ciEvidenceRoles) {
  if (!seenCiRoles.has(role)) {
    fail(`missing CI evidence role: ${role}`);
  }
}

for (const row of gitOperations) {
  for (const field of ['id', 'label', 'status', 'mode', 'detail']) {
    if (!(field in row) || row[field] === '') {
      fail(`git operation row missing ${field}`);
    }
  }
  if (!allowedStates.has(row.status)) {
    fail(`invalid git operation status: ${row.status}`);
  }
}

if (!Array.isArray(data.summary.guidance_items) || data.summary.guidance_items.length < 2) {
  fail('summary.guidance_items must be a non-empty array for lesson and workflow guidance');
}
const guidanceSurfaces = new Set();
const guidanceAudiences = new Set();
for (const item of data.summary.guidance_items) {
  for (const field of ['surface', 'audience', 'priority', 'message', 'related_command']) {
    if (!(field in item)) {
      fail(`guidance item missing ${field}`);
    }
  }
  if (!['lesson', 'workflow'].includes(item.surface)) {
    fail(`invalid guidance surface: ${item.surface}`);
  }
  if (!['non_engineer', 'engineer', 'all'].includes(item.audience)) {
    fail(`invalid guidance audience: ${item.audience}`);
  }
  if (!['info', 'attention', 'action'].includes(item.priority)) {
    fail(`invalid guidance priority: ${item.priority}`);
  }
  if (typeof item.message !== 'string' || item.message.length === 0 || item.message.length > 180) {
    fail('guidance messages must be concise non-empty strings');
  }
  guidanceSurfaces.add(item.surface);
  guidanceAudiences.add(item.audience);
}
if (!guidanceSurfaces.has('lesson') || !guidanceSurfaces.has('workflow')) {
  fail('guidance items must cover both lesson and workflow surfaces');
}
if (!guidanceAudiences.has('non_engineer') || !guidanceAudiences.has('engineer')) {
  fail('guidance items must cover non-engineer and engineer audiences');
}

const maintenanceEvidenceRows = requireField('maintenance.evidence_rows');
if (!Array.isArray(maintenanceEvidenceRows) || maintenanceEvidenceRows.length < 4) {
  fail('maintenance.evidence_rows must expose dashboard maintenance evidence');
}
for (const row of maintenanceEvidenceRows) {
  for (const field of ['id', 'label', 'importance', 'status', 'reference', 'target', 'detail', 'required_command', 'source_role']) {
    if (!(field in row) || row[field] === '') {
      fail(`maintenance evidence row missing ${field}`);
    }
  }
  if (!allowedStates.has(row.status)) {
    fail(`invalid maintenance evidence status: ${row.status}`);
  }
}
if (!maintenanceEvidenceRows.some((row) => row.id === 'browser_debug_agent_handoff')) {
  fail('maintenance evidence rows must include browser_debug_agent_handoff');
}

const browserDebug = requireField('browser_debug');
if (!browserDebug || typeof browserDebug !== 'object' || Array.isArray(browserDebug)) {
  fail('browser_debug must be an object');
}
if (!/^[0-9]+\.[0-9]+\.[0-9]+$/.test(String(browserDebug.schema_version || ''))) {
  fail('browser_debug.schema_version must be semver-like');
}
if (!allowedStates.has(browserDebug.status)) {
  fail(`invalid browser_debug.status: ${browserDebug.status}`);
}
if (browserDebug.target !== 'Dashboard Control Center') {
  fail(`browser_debug target must be Dashboard Control Center, got ${browserDebug.target}`);
}
if (!/^(not_selected|[A-Za-z0-9._-]{1,120})$/.test(String(browserDebug.selected_cli_repository || ''))) {
  fail(`browser_debug selected CLI repository is invalid: ${browserDebug.selected_cli_repository}`);
}
if (browserDebug.selected_cli_repository !== 'not_selected') {
  fail(`browser_debug must not discover an unconfigured review CLI from a built-in path: ${browserDebug.selected_cli_repository}`);
}
if (browserDebug.tool.status !== 'manual_required') {
  fail(`browser_debug tool must require explicit configuration when no review CLI is selected, got ${browserDebug.tool.status}`);
}
if (producerRaw.includes('$HOME/projects/agent-toolbox/browser-debug-cli') || producerRaw.includes('agent-toolbox/browser-debug-cli')) {
  fail('dashboard-data must not contain a built-in legacy review CLI repository URI');
}
function requireSafeDisplayCommand(command, label) {
  if (typeof command !== 'string' || command.length === 0) {
    fail(`${label} command is required`);
  }
  if (/(^|\s)\/|[A-Za-z]:[\\/]|https?:\/\//.test(command) || /[;&|`$<>\\]/.test(command)) {
    fail(`${label} command must be display-only and safe: ${command}`);
  }
}
function requireSafeRelativeArtifact(value, label) {
  if (value === 'not_collected') {
    return;
  }
  if (!isSafeScopedPath(value)) {
    fail(`${label} must be a safe relative artifact path or not_collected: ${value}`);
  }
}
const browserDebugStages = [
  ['tool', ['status', 'command', 'source']],
  ['manifest', ['status', 'path', 'command']],
  ['review', ['status', 'artifact_index_path', 'command']],
  ['agent_package', ['status', 'path', 'command']],
  ['agent_result', ['status', 'path', 'command']],
  ['agent_report', ['status', 'path', 'command']],
];
for (const [stageName, fields] of browserDebugStages) {
  const stage = browserDebug[stageName];
  if (!stage || typeof stage !== 'object' || Array.isArray(stage)) {
    fail(`browser_debug.${stageName} must be an object`);
  }
  for (const field of fields) {
    if (!(field in stage) || stage[field] === '') {
      fail(`browser_debug.${stageName} missing ${field}`);
    }
  }
  if (!allowedStates.has(stage.status)) {
    fail(`invalid browser_debug.${stageName}.status: ${stage.status}`);
  }
  requireSafeDisplayCommand(stage.command, `browser_debug.${stageName}`);
  if (String(stage.command).includes('browser-debug-cli:')) {
    fail(`browser_debug.${stageName} command must not hard-code the old repository id: ${stage.command}`);
  }
}
if (browserDebug.manifest.path !== 'tools/dashboard-review-manifest') {
  fail(`browser_debug manifest path must identify the lesson-owned generator: ${browserDebug.manifest.path}`);
}
requireSafeRelativeArtifact(browserDebug.review.artifact_index_path, 'browser_debug.review.artifact_index_path');
for (const stageName of ['agent_package', 'agent_result', 'agent_report']) {
  requireSafeRelativeArtifact(browserDebug[stageName].path, `browser_debug.${stageName}.path`);
}
const browserBoundary = browserDebug.boundary;
if (!browserBoundary || typeof browserBoundary !== 'object' || Array.isArray(browserBoundary)) {
  fail('browser_debug.boundary must be an object');
}
for (const key of ['dashboard_executes_browser_debug', 'external_upload', 'provider_api', 'credential_storage', 'product_repository_mutated']) {
  if (browserBoundary[key] !== false) {
    fail(`browser_debug boundary must keep ${key} false`);
  }
}

const designStudio = requireField('design_studio');
if (!designStudio || typeof designStudio !== 'object' || Array.isArray(designStudio)) {
  fail('design_studio must be an object');
}
if (!allowedStates.has(designStudio.status)) {
  fail(`invalid design_studio.status: ${designStudio.status}`);
}
if (designStudio.sync_id !== 'dashboard_design_studio_proposal_workflow_foundation') {
  fail(`design_studio sync id is invalid: ${designStudio.sync_id}`);
}
if (!designStudio.summary || typeof designStudio.summary !== 'object' || Array.isArray(designStudio.summary)) {
  fail('design_studio.summary must be an object');
}
for (const field of ['event_count', 'import_count', 'candidate_count', 'proposal_count']) {
  if (!Number.isInteger(Number(designStudio.summary[field])) || Number(designStudio.summary[field]) < 0) {
    fail(`design_studio.summary.${field} must be a non-negative integer`);
  }
}
if (typeof designStudio.summary.next_action !== 'string' || !designStudio.summary.next_action) {
  fail('design_studio.summary.next_action must be a safe display string');
}
for (const collectionName of ['events', 'imports']) {
  if (!Array.isArray(designStudio[collectionName])) {
    fail(`design_studio.${collectionName} must be an array`);
  }
}
if (!Array.isArray(designStudio.history_rows)) {
  fail('design_studio.history_rows must be an array');
}
for (const row of designStudio.history_rows) {
  for (const field of ['row_id', 'row_kind', 'status', 'schema_id', 'source_id', 'next_action']) {
    if (typeof row[field] !== 'string' || !row[field]) {
      fail(`design_studio.history_rows[].${field} must be a safe display string`);
    }
  }
  if (!['event', 'import'].includes(row.row_kind)) {
    fail(`design_studio.history_rows[].row_kind is invalid: ${row.row_kind}`);
  }
  if (!Number.isInteger(Number(row.event_order)) || Number(row.event_order) < 0) {
    fail('design_studio.history_rows[].event_order must be a non-negative integer');
  }
  if ('intent_text' in row || 'payload' in row || 'operations' in row) {
    fail('design_studio history rows must not expose raw prompt, payload, or operations');
  }
  if (row.proposal_only !== true) {
    fail('design_studio history rows must remain proposal-only');
  }
  for (const key of ['writes_allowed', 'direct_apply_authority', 'external_product_apply', 'provider_dispatch', 'imagegen_executed', 'plan_token_created', 'apply_token_created', 'approval_receipt_created']) {
    if (row[key] !== false) {
      fail(`design_studio history rows must keep ${key} false`);
    }
  }
}
for (const imported of designStudio.imports) {
  if ('payload' in imported || 'operations' in imported) {
    fail('design_studio imports must not expose raw payload or proposal operations');
  }
  if (imported.proposal_only !== true) {
    fail('design_studio imports must remain proposal-only');
  }
}
const designBoundary = designStudio.boundaries;
if (!designBoundary || typeof designBoundary !== 'object' || Array.isArray(designBoundary)) {
  fail('design_studio.boundaries must be an object');
}
if (designBoundary.proposal_only !== true) {
  fail('design_studio boundary must be proposal-only');
}
for (const key of ['writes_allowed', 'direct_apply_authority', 'external_product_apply', 'provider_dispatch', 'imagegen_executed', 'plan_token_created', 'apply_token_created', 'approval_receipt_created']) {
  if (designBoundary[key] !== false) {
    fail(`design_studio boundary must keep ${key} false`);
  }
}
if (!designStudio.api_key_provider_policy || designStudio.api_key_provider_policy.api_call_available !== false) {
  fail('design_studio api-key provider policy must keep API calls unavailable');
}
if (!['blocked', 'unknown'].includes(designStudio.api_key_provider_policy.status)) {
  fail(`design_studio api-key provider status is invalid: ${designStudio.api_key_provider_policy.status}`);
}
if (designStudio.latest_proposal_preview) {
  if (designStudio.latest_proposal_preview.decision_gate?.status !== 'manual_required') {
    fail('design_studio proposal preview must require a manual gate');
  }
  if (designStudio.latest_proposal_preview.proposal_only !== true) {
    fail('design_studio proposal preview must remain proposal-only');
  }
  if (designStudio.latest_proposal_preview.writes_allowed !== false || designStudio.latest_proposal_preview.provider_dispatch !== false) {
    fail('design_studio proposal preview must preserve proposal-only boundaries');
  }
}
if (designStudio.latest_candidate_review) {
  if (designStudio.latest_candidate_review.decision_gate?.status !== 'manual_required') {
    fail('design_studio candidate review must require a manual gate');
  }
  if (designStudio.latest_candidate_review.proposal_only !== true) {
    fail('design_studio candidate review must remain proposal-only');
  }
  if (designStudio.latest_candidate_review.imagegen_executed !== false || designStudio.latest_candidate_review.external_product_apply !== false) {
    fail('design_studio candidate review must not execute imagegen or product writes');
  }
}
if (!designStudio.template_library || typeof designStudio.template_library !== 'object' || Array.isArray(designStudio.template_library)) {
  fail('design_studio.template_library must expose the template proposal library');
}
const templateLibrary = designStudio.template_library;
if (templateLibrary.sync_id !== 'dashboard_design_studio_template_proposal_library') {
  fail(`design_studio.template_library sync id is invalid: ${templateLibrary.sync_id}`);
}
if (!templateLibrary.registry || templateLibrary.registry.path !== 'docs/design-system/dashboard-control-center/templates.json') {
  fail('design_studio.template_library registry path is invalid');
}
for (const field of ['template_count', 'ready_count']) {
  if (!Number.isInteger(Number(templateLibrary[field])) || Number(templateLibrary[field]) < 1) {
    fail(`design_studio.template_library.${field} must be a positive integer`);
  }
}
if (!Array.isArray(templateLibrary.templates) || templateLibrary.templates.length < 1) {
  fail('design_studio.template_library.templates must expose safe template metadata');
}
for (const template of templateLibrary.templates) {
  for (const field of ['template_id', 'version', 'display_name', 'summary', 'product_type', 'lifecycle_state', 'redaction_state']) {
    if (typeof template[field] !== 'string' || !template[field]) {
      fail(`design_studio.template_library template ${field} is missing`);
    }
  }
  if (!/^sha256:[a-f0-9]{64}$/.test(template.template_digest || '')) {
    fail('design_studio.template_library template must expose a sha256 digest');
  }
  if ('payload' in template || 'operations' in template || 'candidate_operations' in template) {
    fail('design_studio.template_library templates must not expose raw payload or candidate operations');
  }
  for (const check of template.required_checks || []) {
    requireSafeDisplayCommand(check, 'design_studio.template_library required check');
  }
  if (template.proposal_only !== true || template.writes_allowed !== false || template.provider_dispatch !== false) {
    fail('design_studio.template_library templates must remain proposal-only');
  }
}
const templatePreview = templateLibrary.latest_preview;
if (!templatePreview || typeof templatePreview !== 'object' || Array.isArray(templatePreview)) {
  fail('design_studio.template_library.latest_preview must expose a template proposal preview');
}
if (templatePreview.schema_id !== 'TemplateProposal' || templatePreview.decision_gate?.status !== 'manual_required') {
  fail('design_studio.template_library.latest_preview must be a manual TemplateProposal preview');
}
if (!/^sha256:[a-f0-9]{64}$/.test(templatePreview.template_digest || '')) {
  fail('design_studio.template_library.latest_preview must expose a sha256 digest');
}
if (!Number.isInteger(Number(templatePreview.candidate_operation_count)) || Number(templatePreview.candidate_operation_count) < 1) {
  fail('design_studio.template_library.latest_preview must expose candidate operation count');
}
for (const operation of templatePreview.candidate_operations || []) {
  for (const field of ['operation_id', 'kind', 'summary', 'target_ref', 'allowed_output', 'authority']) {
    if (typeof operation[field] !== 'string' || !operation[field]) {
      fail(`design_studio.template_library.latest_preview candidate operation ${field} is missing`);
    }
  }
  if (operation.authority !== 'proposal_only' || !isSafeScopedPath(operation.allowed_output)) {
    fail('design_studio.template_library.latest_preview candidate operation must stay proposal-only and path-scoped');
  }
}
for (const file of [...(templatePreview.affected_source_files || []), ...(templatePreview.affected_generated_files || [])]) {
  if (!isSafeScopedPath(file)) {
    fail(`design_studio.template_library.latest_preview affected file is unsafe: ${file}`);
  }
}
for (const check of templatePreview.check_plan || []) {
  requireSafeDisplayCommand(check, 'design_studio.template_library.latest_preview check');
}
if (templatePreview.proposal_only !== true || templatePreview.writes_allowed !== false || templatePreview.provider_dispatch !== false || templatePreview.imagegen_executed !== false || templatePreview.external_product_apply !== false) {
  fail('design_studio.template_library.latest_preview must preserve proposal-only boundaries');
}
if (templateLibrary.proposal_only !== true || templateLibrary.writes_allowed !== false || templateLibrary.provider_dispatch !== false) {
  fail('design_studio.template_library must preserve proposal-only boundaries');
}
if (designStudio.subscription_agent_handoff) {
  const handoff = designStudio.subscription_agent_handoff;
  if (handoff.provider_mode !== 'subscription-agent') {
    fail(`design_studio subscription handoff provider_mode is invalid: ${handoff.provider_mode}`);
  }
  if (handoff.raw_prompt_included !== false || handoff.background_execution !== false || handoff.credential_storage !== false || handoff.browser_command_execution !== false || handoff.package_uploaded !== false) {
    fail('design_studio subscription handoff must remain a display-only package boundary');
  }
  for (const key of ['proposal_only', 'writes_allowed', 'direct_apply_authority', 'external_product_apply', 'provider_dispatch', 'imagegen_executed', 'plan_token_created', 'apply_token_created', 'approval_receipt_created']) {
    const expected = key === 'proposal_only';
    if (handoff[key] !== expected) {
      fail(`design_studio subscription handoff ${key} boundary is invalid`);
    }
  }
  if (!/^sha256:[a-f0-9]{64}$/.test(handoff.intent_digest || '')) {
    fail('design_studio subscription handoff must expose an intent digest');
  }
  requireSafeDisplayCommand(handoff.package_command, 'design_studio subscription handoff package');
  const schemaIds = new Set((handoff.response_contracts || []).map((contract) => contract.schema_id));
  if (!schemaIds.has('CandidateEnvelope') || !schemaIds.has('DesignChangeProposal')) {
    fail('design_studio subscription handoff must expose candidate and proposal response contracts');
  }
  for (const command of handoff.import_commands || []) {
    requireSafeDisplayCommand(command, 'design_studio subscription handoff import');
  }
  if (handoff.package) {
    const pkg = handoff.package;
    if (pkg.event_id !== handoff.event_id || pkg.request_id !== handoff.request_id) {
      fail('design_studio subscription handoff package must match the parent handoff event and request');
    }
    if (pkg.package_status !== 'ready' || !isDesignStudioPackagePath(pkg.package_path)) {
      fail('design_studio subscription handoff package must be ready and scoped to a safe path');
    }
    if (!/^sha256:[a-f0-9]{64}$/.test(pkg.package_digest || '')) {
      fail('design_studio subscription handoff package must expose a sha256 digest');
    }
    for (const key of ['proposal_only', 'writes_allowed', 'direct_apply_authority', 'external_product_apply', 'provider_dispatch', 'imagegen_executed', 'plan_token_created', 'apply_token_created', 'approval_receipt_created']) {
      const expected = key === 'proposal_only';
      if (pkg[key] !== expected) {
        fail(`design_studio subscription package ${key} boundary is invalid`);
      }
    }
    for (const key of ['background_execution', 'credential_storage', 'browser_command_execution', 'raw_prompt_included', 'package_uploaded']) {
      if (pkg[key] !== false) {
        fail(`design_studio subscription package ${key} must be false`);
      }
    }
  }
}
if (designStudio.external_product_export && designStudio.external_product_export.target_apply_mode !== 'plan-only') {
  fail('design_studio external product export must stay plan-only');
}
if (designStudio.owner_tool_transaction_preview && designStudio.owner_tool_transaction_preview.dry_run !== true) {
  fail('design_studio owner-tool transaction preview must stay dry-run');
}

for (const [collectionName, minCount] of [['approvals', 1], ['dangerous_operations', 1]]) {
  const rows = requireField(`security.${collectionName}`);
  if (!Array.isArray(rows) || rows.length < minCount) {
    fail(`security.${collectionName} must expose structured rows`);
  }
  for (const row of rows) {
    for (const field of ['id', 'label', 'status', 'detail', 'last_checked']) {
      if (!(field in row) || row[field] === '') {
        fail(`security ${collectionName} row missing ${field}`);
      }
    }
    if (!allowedStates.has(row.status)) {
      fail(`invalid security ${collectionName} status: ${row.status}`);
    }
  }
}

for (const failure of data.partial_failures) {
  for (const field of ['source', 'status', 'reason', 'required_command']) {
    if (!(field in failure)) {
      fail(`partial failure missing ${field}`);
    }
  }
  if (!['failed', 'blocked', 'unknown'].includes(failure.status)) {
    fail(`invalid partial failure status: ${failure.status}`);
  }
}
if (data.partial_failures.some((failure) => failure.status === 'optional')) {
  fail('partial_failures must not include optional manual follow-ups');
}
for (const blocker of selectedContext.blockers) {
  const expectedStatus = blocker.status === 'failed' ? 'failed' : blocker.status === 'blocked' ? 'blocked' : 'unknown';
  const match = data.partial_failures.find((failure) => failure.source === blocker.source);
  if (!match) {
    fail(`selected context blocker ${blocker.source} must appear in partial_failures`);
  }
  if (match.status !== expectedStatus) {
    fail(`selected context blocker ${blocker.source} partial status ${match.status} did not normalize from ${blocker.status}`);
  }
}
for (const failure of data.partial_failures) {
  if (!selectedContext.blockers.some((blocker) => blocker.source === failure.source)) {
    fail(`partial failure ${failure.source} is not scoped to selected_context.blockers`);
  }
}
for (const followup of data.summary.manual_followups) {
  for (const field of ['source', 'status', 'reason', 'required_command']) {
    if (!(field in followup)) {
      fail(`manual follow-up missing ${field}`);
    }
  }
  if (!['optional', 'cached', 'unknown'].includes(followup.status)) {
    fail(`invalid manual follow-up status: ${followup.status}`);
  }
}
if (!data.summary.manual_followups.some((followup) => followup.source === 'product_ci_live')) {
  fail('manual follow-ups must include optional product CI lookup');
}

if ('status' in data.git_workflow || 'status' in data.security) {
  fail('git_workflow/security must not collapse separate policy and gate statuses');
}
if (data.git_workflow.policy_status !== 'ready') {
  fail(`expected git workflow policy ready, got ${data.git_workflow.policy_status}`);
}
if (data.git_workflow.settings_status !== 'ready') {
  fail(`expected git workflow settings ready, got ${data.git_workflow.settings_status}`);
}
if (data.git_workflow.gate_status === data.git_workflow.policy_status) {
  fail('git workflow gate status must not be inferred from policy readiness');
}
if (data.security.policy_status !== 'ready') {
  fail(`expected security policy ready, got ${data.security.policy_status}`);
}
if (data.security.gate_status === data.security.policy_status) {
  fail('security gate status must not be inferred from policy readiness');
}

const documents = requireField('documents');
if (!documents || typeof documents !== 'object' || Array.isArray(documents)) {
  fail('documents must be an object');
}
if (!allowedStates.has(documents.status)) {
  fail(`invalid documents status: ${documents.status}`);
}
if (!Array.isArray(documents.groups) || documents.groups.length < 3) {
  fail('documents.groups must contain purpose-based groups');
}
if (!Array.isArray(documents.catalog) || documents.catalog.length < 5) {
  fail('documents.catalog must contain producer-owned document items');
}
const documentGroupIds = new Set();
for (const group of documents.groups) {
  for (const field of ['id', 'label_key', 'description_key', 'order']) {
    if (!(field in group)) {
      fail(`document group missing ${field}`);
    }
  }
  if (!Number.isInteger(group.order) || group.order <= 0) {
    fail(`document group order is invalid: ${group.order}`);
  }
  if (documentGroupIds.has(group.id)) {
    fail(`duplicate document group: ${group.id}`);
  }
  requireI18nKey(group.label_key);
  requireI18nKey(group.description_key);
  documentGroupIds.add(group.id);
}
const relatedPages = new Set(['#documents', '#maintenance', '#workflow', '#safety', '#repository-info', '#history']);
const audiences = new Set(['non_engineer', 'engineer', 'all']);
const catalogIds = new Set();
for (const item of documents.catalog) {
  for (const field of ['id', 'group_id', 'role_id', 'path', 'status', 'status_source', 'audience', 'order', 'related_page']) {
    if (!(field in item)) {
      fail(`document catalog item missing ${field}`);
    }
  }
  if (catalogIds.has(item.id)) {
    fail(`duplicate document catalog item: ${item.id}`);
  }
  catalogIds.add(item.id);
  if (!documentGroupIds.has(item.group_id)) {
    fail(`document catalog item references unknown group: ${item.group_id}`);
  }
  if (
    typeof item.path !== 'string' ||
    item.path.startsWith('/') ||
    item.path.startsWith('\\') ||
    /^[A-Za-z]:[\\/]/.test(item.path) ||
    item.path.split(/[\\/]+/).includes('..')
  ) {
    fail(`document catalog item path must be safe relative path: ${item.path}`);
  }
  requireI18nKey(`documentsPage.item.${item.id}`);
  requireI18nKey(`documentsPage.detail.${item.id}`);
  if (!allowedStates.has(item.status)) {
    fail(`invalid document catalog status: ${item.status}`);
  }
  if (!audiences.has(item.audience)) {
    fail(`invalid document catalog audience: ${item.audience}`);
  }
  if (!Number.isInteger(item.order) || item.order <= 0) {
    fail(`document catalog item order is invalid: ${item.order}`);
  }
  if (!relatedPages.has(item.related_page)) {
    fail(`invalid document catalog related page: ${item.related_page}`);
  }
}
for (const expectedId of ['agents', 'documentMap', 'requirements', 'specification', 'implementationPlan', 'taskTracker', 'handoff']) {
  if (!catalogIds.has(expectedId)) {
    fail(`missing expected document catalog item: ${expectedId}`);
  }
}
if (!Array.isArray(documents.related_commands) || documents.related_commands.length < 2) {
  fail('documents.related_commands must expose docs-tour and dashboard docs reference commands');
}
const documentCommandIds = new Set();
for (const command of documents.related_commands) {
  for (const field of ['id', 'label_key', 'description_key', 'command', 'order']) {
    if (!(field in command)) {
      fail(`document related command missing ${field}`);
    }
  }
  if (documentCommandIds.has(command.id)) {
    fail(`duplicate document related command: ${command.id}`);
  }
  documentCommandIds.add(command.id);
  requireI18nKey(command.label_key);
  requireI18nKey(command.description_key);
  if (typeof command.command !== 'string' || !/^tools\/[A-Za-z0-9._-]+(?: [A-Za-z0-9._:@/%+=,-]+)*$/.test(command.command)) {
    fail(`document related command must be a safe display command: ${command.command}`);
  }
  if (!Number.isInteger(command.order) || command.order <= 0) {
    fail(`document related command order is invalid: ${command.order}`);
  }
}
for (const expectedCommand of ['tools/docs-tour all', 'tools/dashboard docs']) {
  if (!documents.related_commands.some((command) => command.command === expectedCommand)) {
    fail(`missing document guidance command: ${expectedCommand}`);
  }
}

const settings = requireField('settings');
if (!settings || typeof settings !== 'object' || Array.isArray(settings)) {
  fail('settings must be an object');
}
if (!allowedStates.has(settings.status)) {
  fail(`invalid settings status: ${settings.status}`);
}
if (!Array.isArray(settings.groups) || settings.groups.length < 4) {
  fail('settings.groups must contain context, learning, workflow, and security groups');
}
if (!Array.isArray(settings.items) || settings.items.length < 10) {
  fail('settings.items must contain producer-owned setting rows');
}
function isSafeScopedPath(pathValue) {
  if (typeof pathValue !== 'string' || !pathValue) {
    return false;
  }
  const path = pathValue.startsWith('product:') ? pathValue.slice('product:'.length) : pathValue;
  return !path.startsWith('/') && !path.startsWith('\\') && !/^[A-Za-z]:[\\/]/.test(path) && !path.split(/[\\/]+/).includes('..');
}
function isDesignStudioPackagePath(pathValue) {
  if (!isSafeScopedPath(pathValue)) {
    return false;
  }
  return (
    (pathValue.startsWith('.dashboard-design-studio-events/agent-packages/') ||
      pathValue.startsWith('external-test-store/agent-packages/')) &&
    pathValue.endsWith('/package.json')
  );
}
const settingsGroupIds = new Set();
for (const group of settings.groups) {
  for (const field of ['id', 'label_key', 'description_key', 'status', 'order']) {
    if (!(field in group)) {
      fail(`settings group missing ${field}`);
    }
  }
  if (settingsGroupIds.has(group.id)) {
    fail(`duplicate settings group: ${group.id}`);
  }
  settingsGroupIds.add(group.id);
  requireI18nKey(group.label_key);
  requireI18nKey(group.description_key);
  if (!allowedStates.has(group.status)) {
    fail(`invalid settings group status: ${group.status}`);
  }
  if (!Number.isInteger(group.order) || group.order <= 0) {
    fail(`settings group order is invalid: ${group.order}`);
  }
}
const settingScopes = new Set(['selected_context', 'learning', 'workflow', 'security', 'repository', 'dashboard']);
const settingsRelatedPages = new Set(['#overview', '#lessons', '#workflow', '#maintenance', '#safety', '#repository-info', '#documents', '#settings', '#history', '#help']);
const settingIds = new Set();
const editableSettingIds = new Set();
for (const item of settings.items) {
  for (const field of ['id', 'group_id', 'scope', 'label_key', 'description_key', 'current_value', 'current_label', 'status', 'source_file', 'allowed_values', 'editable', 'reviewable', 'risk_level', 'requires_confirmation', 'consistency', 'disabled_reason_key', 'related_page', 'update_action_id', 'review']) {
    if (!(field in item)) {
      fail(`settings item missing ${field}`);
    }
  }
  if (settingIds.has(item.id)) {
    fail(`duplicate settings item: ${item.id}`);
  }
  settingIds.add(item.id);
  if (!settingsGroupIds.has(item.group_id)) {
    fail(`settings item references unknown group: ${item.group_id}`);
  }
  if (!settingScopes.has(item.scope)) {
    fail(`invalid settings item scope: ${item.scope}`);
  }
  if (!allowedStates.has(item.status)) {
    fail(`invalid settings item status: ${item.status}`);
  }
  if (!isSafeScopedPath(item.source_file) || !isSafeScopedPath(item.review.target_file)) {
    fail(`settings item path must be safe and scoped: ${item.id}`);
  }
  if (!Array.isArray(item.allowed_values)) {
    fail(`settings item allowed_values must be an array: ${item.id}`);
  }
  if (typeof item.editable !== 'boolean' || typeof item.reviewable !== 'boolean' || typeof item.requires_confirmation !== 'boolean') {
    fail(`settings item boolean contract is invalid: ${item.id}`);
  }
  const consistency = item.consistency;
  if (!consistency || typeof consistency !== 'object' || Array.isArray(consistency)) {
    fail(`settings item consistency must be an object: ${item.id}`);
  }
  for (const field of ['status', 'severity', 'reason_code', 'reason_key', 'next_action_key', 'effective_mode', 'affected_setting_ids']) {
    if (!(field in consistency)) {
      fail(`settings item consistency missing ${field}: ${item.id}`);
    }
  }
  if (!allowedStates.has(consistency.status)) {
    fail(`settings item consistency status is invalid: ${item.id}`);
  }
  if (!['info', 'warning', 'error'].includes(consistency.severity)) {
    fail(`settings item consistency severity is invalid: ${item.id}`);
  }
  requireI18nKey(consistency.reason_key);
  requireI18nKey(consistency.next_action_key);
  if (!Array.isArray(consistency.affected_setting_ids)) {
    fail(`settings item consistency affected_setting_ids must be an array: ${item.id}`);
  }
  if (!['low', 'medium', 'high', 'critical'].includes(item.risk_level)) {
    fail(`settings item risk is invalid: ${item.id}`);
  }
  if (!settingsRelatedPages.has(item.related_page)) {
    fail(`settings item related_page is invalid: ${item.id}`);
  }
  requireI18nKey(item.label_key);
  requireI18nKey(item.description_key);
  requireI18nKey(item.disabled_reason_key);
  requireI18nKey(item.review.impact_key);
  requireI18nKey(item.review.update_preview_key);
  if (!allowedStates.has(item.review.validation_status)) {
    fail(`settings item review validation status is invalid: ${item.id}`);
  }
  if (item.editable) {
    editableSettingIds.add(item.id);
    if (!item.reviewable || !['learning', 'workflow', 'dashboard'].includes(item.scope)) {
      fail(`editable settings item has invalid scope: ${item.id}`);
    }
    if (!item.allowed_values.length || item.requires_confirmation !== true) {
      fail(`editable settings item must expose allowed values and require confirmation: ${item.id}`);
    }
    if (item.source_file.startsWith('product:') || item.review.target_file.startsWith('product:')) {
      fail(`editable settings item must stay inside the lesson repository: ${item.id}`);
    }
  }
}
for (const expectedEditable of ['dashboard_display_depth', 'learning_mode', 'workflow_language', 'product_language', 'git_push_automation']) {
  if (!editableSettingIds.has(expectedEditable)) {
    fail(`missing expected editable settings row: ${expectedEditable}`);
  }
}
const dashboardDisplayDepthItem = settings.items.find((item) => item.id === 'dashboard_display_depth');
if (!dashboardDisplayDepthItem) {
  fail('settings.items must include dashboard_display_depth');
}
if (!['friendly', 'standard', 'technical'].includes(data.summary.display_depth)) {
  fail(`summary.display_depth is invalid: ${data.summary.display_depth}`);
}
if (data.summary.display_depth !== dashboardDisplayDepthItem.current_value) {
  fail('summary.display_depth must match the Settings dashboard_display_depth current value');
}
const workflowLanguageItem = settings.items.find((item) => item.id === 'workflow_language');
if (!workflowLanguageItem) {
  fail('settings.items must include workflow_language');
}
const productGitUsageItem = settings.items.find((item) => item.id === 'product_git_usage_mode');
if (!productGitUsageItem) {
  fail('settings.items must include product_git_usage_mode');
}
if (!['free-development', 'product-improvement', 'external-integration'].includes(selectedContext.workflow_context)) {
  if (productGitUsageItem.editable !== false || productGitUsageItem.current_value !== 'not_applicable' || productGitUsageItem.allowed_values.length !== 0) {
    fail('product_git_usage_mode must be display-only and not_applicable outside product workflow contexts');
  }
}
if (data.summary.workflow_language !== workflowLanguageItem.current_value) {
  fail('summary.workflow_language must match the Settings workflow_language current value');
}
if (settings.items.some((item) => item.consistency.reason_code !== 'none' && item.consistency.status === 'ready')) {
  fail('settings item consistency must not hide a recorded conflict as ready');
}
for (const displayOnly of ['product_name', 'product_type', 'learner_approval', 'git_gate', 'git_approval', 'security_gate', 'dangerous_action_approval']) {
  if (editableSettingIds.has(displayOnly)) {
    fail(`display-only settings row must not be editable: ${displayOnly}`);
  }
}

const productAuthority = requireField('development.product_authority');
if (!productAuthority || typeof productAuthority !== 'object' || Array.isArray(productAuthority)) {
  fail('development.product_authority must be an object');
}
if (!allowedStates.has(productAuthority.status)) {
  fail(`invalid product authority status: ${productAuthority.status}`);
}
if (!['product_operations', 'none'].includes(productAuthority.repository.blocker_scope)) {
  fail(`invalid product authority blocker scope: ${productAuthority.repository.blocker_scope}`);
}
if (!productAuthority.product_summary || typeof productAuthority.product_summary !== 'object' || Array.isArray(productAuthority.product_summary)) {
  fail('product authority product_summary must be an object');
}
if (!['missing', 'ready', 'failed', 'unknown'].includes(productAuthority.product_summary.status)) {
  fail(`invalid product summary status: ${productAuthority.product_summary.status}`);
}
if (productAuthority.product_summary.source_path !== 'ops/PRODUCT_PROFILE.json') {
  fail(`product summary source_path must be ops/PRODUCT_PROFILE.json, got ${productAuthority.product_summary.source_path}`);
}
if (JSON.stringify(productAuthority.product_summary).includes('/tmp/')) {
  fail('product summary must not leak temporary absolute paths');
}
if (!Array.isArray(productAuthority.product_summary.source_documents)) {
  fail('product summary source_documents must be an array');
}
if (!productAuthority.operation_mode || typeof productAuthority.operation_mode !== 'object' || Array.isArray(productAuthority.operation_mode)) {
  fail('product authority operation_mode must be an object');
}
if (!['missing', 'ready', 'failed', 'unknown', 'repair_required'].includes(productAuthority.operation_mode.status)) {
  fail(`invalid product operation mode status: ${productAuthority.operation_mode.status}`);
}
if (!['parent_managed', 'standalone', 'reconnecting', 'repair_required'].includes(productAuthority.operation_mode.workflow_mode)) {
  fail(`invalid product workflow_mode: ${productAuthority.operation_mode.workflow_mode}`);
}
if (!['ready', 'repair_required', 'not_applicable', 'unknown'].includes(productAuthority.operation_mode.rule_connection_status)) {
  fail(`invalid product rule connection status: ${productAuthority.operation_mode.rule_connection_status}`);
}
if (!Array.isArray(productAuthority.document_paths)) {
  fail('product authority document_paths must be an array');
}
for (const pathItem of productAuthority.document_paths) {
  for (const field of ['source_id', 'status', 'required_in_context', 'canonical_path', 'resolved_path', 'resolved_source']) {
    if (!(field in pathItem)) {
      fail(`product authority document path missing ${field}`);
    }
  }
  if (!allowedStates.has(pathItem.status)) {
    fail(`invalid product authority document path status: ${pathItem.status}`);
  }
}
if (!Array.isArray(productAuthority.manifest_summary.required_missing)) {
  fail('product authority required_missing must be an array');
}
if (!Array.isArray(productAuthority.manifest_summary.optional_missing)) {
  fail('product authority optional_missing must be an array');
}
if (!Array.isArray(productAuthority.evidence_summary.items)) {
  fail('product authority evidence items must be an array');
}
const productEvidenceRiskLevels = new Set(['low', 'medium', 'high', 'critical']);
const productHeadPattern = /^(none|[a-f0-9]{40}|[a-f0-9]{64})$/;
for (const item of productAuthority.evidence_summary.items) {
  for (const field of [
    'source_id',
    'context',
    'status',
    'freshness_state',
    'required_in_context',
    'authority',
    'observed_at',
    'max_age_seconds',
    'product_root',
    'product_head',
    'source_artifacts',
    'blocked_by',
    'next_command',
    'detail_code',
    'current_item_id',
    'detail_manifest_source',
    'detail_artifact_path',
    'summary',
    'reason',
    'next_action',
    'risk_level',
  ]) {
    if (!(field in item)) {
      fail(`product authority evidence item missing ${field}`);
    }
  }
  if (!['all', 'none', 'lesson', 'free-development', 'product-improvement', 'external-integration', 'lesson-maintenance', 'custom', 'unknown'].includes(item.context)) {
    fail(`invalid product evidence context: ${item.context}`);
  }
  if (!allowedStates.has(item.status)) {
    fail(`invalid product evidence status: ${item.status}`);
  }
  if (!['current', 'stale', 'not_collected', 'unknown'].includes(item.freshness_state)) {
    fail(`invalid product evidence freshness: ${item.freshness_state}`);
  }
  if (typeof item.required_in_context !== 'boolean') {
    fail('product evidence required_in_context must be a boolean');
  }
  if (!['authoritative', 'manual_required', 'advisory', 'not_collected'].includes(item.authority)) {
    fail(`invalid product evidence authority: ${item.authority}`);
  }
  if (typeof item.observed_at !== 'string' || item.observed_at.length === 0) {
    fail('product evidence observed_at is missing');
  }
  if (!Number.isInteger(Number(item.max_age_seconds)) || Number(item.max_age_seconds) < 0) {
    fail(`invalid product evidence max_age_seconds: ${item.max_age_seconds}`);
  }
  if (typeof item.product_root !== 'string' || item.product_root.includes('/tmp/')) {
    fail(`invalid product evidence product_root: ${item.product_root}`);
  }
  if (!productHeadPattern.test(item.product_head)) {
    fail(`invalid product evidence product_head: ${item.product_head}`);
  }
  for (const field of ['source_artifacts', 'blocked_by', 'next_command', 'detail_manifest_source', 'detail_artifact_path']) {
    if (typeof item[field] !== 'string') {
      fail(`product evidence ${field} must be a string`);
    }
  }
  for (const field of ['detail_code', 'current_item_id', 'summary', 'reason', 'next_action']) {
    if (typeof item[field] !== 'string' || item[field].length === 0) {
      fail(`product evidence ${field} is missing`);
    }
  }
  if (!productEvidenceRiskLevels.has(item.risk_level)) {
    fail(`invalid product evidence risk_level: ${item.risk_level}`);
  }
}
if (!Array.isArray(productAuthority.product_operation_blockers)) {
  fail('product authority product_operation_blockers must be an array');
}
for (const blocker of productAuthority.product_operation_blockers) {
  for (const field of ['source', 'status', 'reason', 'required_command']) {
    if (!(field in blocker)) {
      fail(`product authority blocker missing ${field}`);
    }
  }
  if (!['missing', 'failed', 'blocked', 'unknown', 'stale', 'not_run'].includes(blocker.status)) {
    fail(`invalid product operation blocker status: ${blocker.status}`);
  }
}
const productRepository = requireField('development.product_repository');
for (const field of ['configured_name', 'workflow_context', 'path_state', 'git_state', 'git_requirement', 'ci_requirement']) {
  if (!(field in productRepository)) {
    fail(`product repository missing ${field}`);
  }
}
if (!['configured', 'missing', 'not_applicable', 'unknown'].includes(productRepository.path_state)) {
  fail(`invalid product repository path_state: ${productRepository.path_state}`);
}
if (!['configured', 'missing', 'not_applicable', 'unknown'].includes(productRepository.git_state)) {
  fail(`invalid product repository git_state: ${productRepository.git_state}`);
}
if (!['required', 'not_applicable', 'unknown'].includes(productRepository.git_requirement)) {
  fail(`invalid product repository git_requirement: ${productRepository.git_requirement}`);
}
if (!['required', 'not_applicable', 'unknown'].includes(productRepository.ci_requirement)) {
  fail(`invalid product repository ci_requirement: ${productRepository.ci_requirement}`);
}
if (['step_1_7', 'advanced', 'lesson-repository-improvement'].includes(data.selected_context.menu_id)) {
  if (productRepository.status !== 'not_applicable' || productRepository.git_requirement !== 'not_applicable' || productRepository.ci_requirement !== 'not_applicable') {
    fail('lesson-only selected context must keep top-level product repository status not_applicable');
  }
}
if (data.development.product_repository.status === 'missing') {
  if (!productAuthority.product_operation_blockers.some((blocker) => blocker.source === 'repositories.product')) {
    fail('missing product repository must be scoped as a product-operation blocker');
  }
  if (data.summary.blocking_items.some((blocker) => blocker.source === 'repositories.product')) {
    fail('missing product repository must not be mixed into lesson-only summary blockers');
  }
}

if (data.lessons.step_1_14.status === 'unknown' && data.lessons.step_1_14.current_step === 'unknown') {
  fail('completed or inactive STEP 1-14 state must not collapse to unknown without checking completion');
}
for (const lessonPath of ['lessons.step_1_7', 'lessons.step_1_14', 'lessons.advanced']) {
  const lesson = requireField(lessonPath);
  if (!Array.isArray(lesson.points) || !Array.isArray(lesson.warnings)) {
    fail(`${lessonPath} must expose structured points and warnings arrays`);
  }
  if (typeof lesson.next_learning_action !== 'string' || lesson.next_learning_action.length === 0) {
    fail(`${lessonPath} must expose a structured next learning action`);
  }
  for (const item of [...lesson.points, ...lesson.warnings, lesson.next_learning_action]) {
    if (/\/home\/|\/tmp\/|gh[pousr]_[A-Za-z0-9_]{20,}|sk-[A-Za-z0-9]{20,}|AKIA[0-9A-Z]{16}/.test(item)) {
      fail(`${lessonPath} leaked unsafe lesson guidance text`);
    }
  }
}

const previews = requireField('actions.command_previews');
if (!Array.isArray(previews) || previews.length !== 4) {
  fail('command previews must expose the four display-only mock preview cards');
}
for (const preview of previews) {
  for (const field of ['intent', 'target', 'risk_level', 'requires_approval', 'approval_gate_id', 'argv', 'command_text', 'execution_mode', 'non_executable']) {
    if (!(field in preview)) {
      fail(`command preview missing ${field}`);
    }
  }
  if (!['low', 'medium', 'high', 'critical'].includes(preview.risk_level)) {
    fail(`invalid command preview risk: ${preview.risk_level}`);
  }
  if (!Array.isArray(preview.argv)) {
    fail('command preview argv must be an array');
  }
  if (preview.execution_mode !== 'preview_only' || preview.non_executable !== true) {
    fail('command previews must remain preview_only and non_executable');
  }
  if (preview.requires_approval !== false) {
    fail('Safety command preview cards must stay review-only; dangerous operations are reported under security.dangerous_operations');
  }
}
const commandPreviewGroups = requireField('actions.command_preview_groups');
if (!Array.isArray(commandPreviewGroups) || commandPreviewGroups.length < 1) {
  fail('actions.command_preview_groups must expose preview grouping data');
}
const previewGroupTotal = commandPreviewGroups.reduce((sum, group) => sum + (Number.isInteger(group.preview_count) ? group.preview_count : 0), 0);
if (previewGroupTotal !== previews.length) {
  fail('command preview group counts must match the producer-owned preview card total');
}
for (const group of commandPreviewGroups) {
  for (const field of ['id', 'label', 'risk_level', 'preview_count']) {
    if (!(field in group)) {
      fail(`command preview group missing ${field}`);
    }
  }
  if (!['low', 'medium', 'high', 'critical'].includes(group.risk_level)) {
    fail(`invalid command preview group risk level: ${group.risk_level}`);
  }
  if (!Number.isInteger(group.preview_count) || group.preview_count < 0) {
    fail('command preview group preview_count must be non-negative integer');
  }
}

if (/\/home\/|\/tmp\/|gh[pousr]_[A-Za-z0-9_]{20,}|sk-[A-Za-z0-9]{20,}|AKIA[0-9A-Z]{16}/.test(raw)) {
  fail('dashboard-data JSON leaked absolute paths or secret-like data');
}
NODE

LEGACY_LANG_DIR="$TMP_DIR/legacy-language"
mkdir -p "$LEGACY_LANG_DIR"
cat >"$LEGACY_LANG_DIR/LESSON_CONFIG_14_DAYS.tsv" <<EOF
# key	value
project_root	$TEST_PROJECT_ROOT
product_repo_name	task-tracker-repository
learning_mode_file	$LEGACY_LANG_DIR/LESSON_MODE.tsv
workflow_language_file	$LEGACY_LANG_DIR/WORKFLOW_DISPLAY_LANGUAGE_14_DAYS.tsv
product_language_file	$LEGACY_LANG_DIR/PRODUCT_DEVELOPMENT_LANGUAGE_14_DAYS.tsv
approval_file	$LEGACY_LANG_DIR/LESSON_APPROVALS_14_DAYS.tsv
state_file	$ROOT/learning/LESSON_STATE_14_DAYS.tsv
flow_file	$ROOT/lesson/LESSON_FLOW_14_DAYS.tsv
EOF
cat >"$LEGACY_LANG_DIR/LESSON_MODE.tsv" <<'EOF'
# selected_at	mode	label
2026-06-05 00:00:00	A	じっくり説明
EOF
cat >"$LEGACY_LANG_DIR/WORKFLOW_DISPLAY_LANGUAGE_14_DAYS.tsv" <<'EOF'
# selected_at	code	label
2026-06-05 00:00:00	zh	Legacy Chinese alias
EOF
cat >"$LEGACY_LANG_DIR/PRODUCT_DEVELOPMENT_LANGUAGE_14_DAYS.tsv" <<'EOF'
# selected_at	code	label
2026-06-05 00:00:00	en	English
EOF
cat >"$LEGACY_LANG_DIR/LESSON_APPROVALS_14_DAYS.tsv" <<'EOF'
# timestamp	step_id	action	status	note
EOF
LEGACY_LANG_JSON="$TMP_DIR/dashboard-data-legacy-zh.json"
DASHBOARD_DATA_GENERATED_AT="2026-06-05T00:00:00Z" DASHBOARD_LESSON14_CONFIG="$LEGACY_LANG_DIR/LESSON_CONFIG_14_DAYS.tsv" DASHBOARD_SELECTED_MENU_ID="step_1_14" "$ROOT/tools/dashboard-data" >"$LEGACY_LANG_JSON"
node - "$LEGACY_LANG_JSON" <<'NODE'
const fs = require('fs');
const data = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
function fail(message) {
  console.error(message);
  process.exit(1);
}
if (data.summary.workflow_language !== 'zh-CN' || data.summary.display_locale !== 'zh-CN' || data.summary.ui_locale !== 'zh-CN') {
  fail(`legacy zh must be emitted as canonical zh-CN in summary, got ${JSON.stringify(data.summary)}`);
}
const workflowLanguage = data.settings?.items?.find((item) => item.id === 'workflow_language');
if (!workflowLanguage || workflowLanguage.current_value !== 'zh-CN') {
  fail('legacy zh workflow_language setting row must be emitted as canonical zh-CN');
}
NODE

redacted="$(
  # shellcheck source=tools/lib/dashboard_data.sh
  source "$ROOT/tools/lib/dashboard_data.sh"
  dashboard_data_safe_text 'TOKEN=abcdefghijklmnop'
)"
if [[ "$redacted" != "[redacted secret-like data]" ]]; then
  printf 'dashboard_data_safe_text did not redact secret-like text\n' >&2
  exit 1
fi

escaped_control="$(
  # shellcheck source=tools/lib/dashboard_data.sh
  source "$ROOT/tools/lib/dashboard_data.sh"
  dashboard_json_string $'bad\001text\033done'
)"
node - "$escaped_control" <<'NODE'
let decoded;
try {
  decoded = JSON.parse(process.argv[2]);
} catch (error) {
  console.error(`dashboard_json_string did not escape control characters: ${error.message}`);
  process.exit(1);
}
if (decoded !== 'badtextdone') {
  console.error(`dashboard_json_string did not strip unsafe control characters: ${decoded}`);
  process.exit(1);
}
NODE

output="$(cat "$JSON_FILE")"
assert_contains "$output" '"schema_version"'
assert_contains "$output" '"command_previews"'
assert_contains "$output" '"command_preview_groups"'
assert_contains "$output" '"git_operations"'
assert_contains "$output" '"recent_runs"'
assert_contains "$output" '"contexts_by_menu"'
assert_contains "$output" '"evidence_rows"'

LIVE_STATUS_FILE="$TMP_DIR/dashboard-live-status.json"
FAKE_GH_CALLED="$TMP_DIR/fake-gh-called"
FAKE_BIN="$TMP_DIR/fake-bin"
mkdir -p "$FAKE_BIN"
cat >"$FAKE_BIN/gh" <<'SH'
#!/usr/bin/env bash
: >"${FAKE_GH_CALLED:?}"
exit 99
SH
chmod +x "$FAKE_BIN/gh"
DASHBOARD_DATA_GENERATED_AT="2026-06-05T00:00:00Z" \
  DASHBOARD_SELECTED_MENU_ID="free-development" \
  DASHBOARD_LIVE_STATUS_TIMEOUT_SECONDS="1" \
  FAKE_GH_CALLED="$FAKE_GH_CALLED" \
  PATH="$FAKE_BIN:$PATH" \
  "$ROOT/tools/dashboard-data" live-status >"$LIVE_STATUS_FILE"
if [[ -e "$FAKE_GH_CALLED" ]]; then
  printf 'dashboard live-status must not call gh unless DASHBOARD_LIVE_STATUS_CI_NETWORK is enabled\n' >&2
  exit 1
fi
node - "$LIVE_STATUS_FILE" <<'NODE'
const fs = require('fs');
const data = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const allowedStates = new Set([
  'missing',
  'ready',
  'passed',
  'failed',
  'blocked',
  'unknown',
  'approval_required',
  'optional',
  'cached',
  'not_run',
  'stale',
  'manual_required',
  'not_applicable',
]);
const freshnessStates = new Set(['current', 'stale', 'not_collected', 'unknown']);
const authorities = new Set(['authoritative', 'manual_required', 'advisory', 'not_collected']);
const riskLevels = new Set(['low', 'medium', 'high', 'critical']);
const detailPages = new Set(['#workflow', '#maintenance', '#safety', '#repository-info', '#documents', '#history', '#help']);
const headMatchStates = new Set(['matched', 'different', 'unknown']);
function fail(message) {
  console.error(message);
  process.exit(1);
}
function requireObject(value, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    fail(`${label} must be an object`);
  }
  return value;
}
if (data.schema_version !== '0.1.0') {
  fail(`unexpected live status schema version: ${data.schema_version}`);
}
if (data.generated_at !== '2026-06-05T00:00:00Z') {
  fail(`live status generated_at override was not honored: ${data.generated_at}`);
}
if (data.menu_id !== 'free-development' || data.workflow_context !== 'free-development') {
  fail(`live status must honor selected free-development context, got ${data.menu_id}/${data.workflow_context}`);
}
requireObject(data.target_repository, 'live target_repository');
requireObject(data.repository_state, 'live repository_state');
for (const key of ['dirty_count', 'untracked_count', 'ahead', 'behind']) {
  if (!Number.isFinite(Number(data.repository_state[key])) || Number(data.repository_state[key]) < 0) {
    fail(`live repository_state ${key} must be non-negative`);
  }
}
const checks = requireObject(data.checks, 'live checks');
for (const key of ['local_tests', 'git_sync', 'ci', 'security']) {
  const check = requireObject(checks[key], `live check ${key}`);
  for (const field of ['status', 'observed_at', 'detail_code', 'source_id', 'summary', 'reason', 'next_action', 'detail_page', 'freshness_state', 'authority', 'risk_level', 'required_command', 'current_item_id']) {
    if (!(field in check) || check[field] === '') {
      fail(`live check ${key} missing ${field}`);
    }
  }
  if (!allowedStates.has(check.status)) {
    fail(`invalid live check status for ${key}: ${check.status}`);
  }
  if (!freshnessStates.has(check.freshness_state)) {
    fail(`invalid live check freshness for ${key}: ${check.freshness_state}`);
  }
  if (!authorities.has(check.authority)) {
    fail(`invalid live check authority for ${key}: ${check.authority}`);
  }
  if (!riskLevels.has(check.risk_level)) {
    fail(`invalid live check risk for ${key}: ${check.risk_level}`);
  }
  if (!detailPages.has(check.detail_page)) {
    fail(`invalid live check detail_page for ${key}: ${check.detail_page}`);
  }
  if (!Array.isArray(check.items)) {
    fail(`live check ${key} items must be an array`);
  }
  if (key === 'ci') {
    for (const field of ['workflow_name', 'run_status', 'conclusion', 'run_id', 'run_url', 'repository_head', 'run_head_sha', 'run_head_branch', 'head_match_status']) {
      if (!(field in check)) {
        fail(`live check ci missing ${field}`);
      }
    }
    if (!headMatchStates.has(check.head_match_status)) {
      fail(`live check ci has invalid head_match_status: ${check.head_match_status}`);
    }
    if (
      check.status === 'passed' &&
      (check.head_match_status !== 'matched' || check.freshness_state !== 'current' || check.authority !== 'authoritative')
    ) {
      fail('passed live CI check must be current authoritative matching HEAD proof');
    }
  }
  for (const item of check.items) {
    for (const field of ['source_id', 'category', 'kind', 'status', 'observed_at', 'freshness_state', 'authority', 'summary', 'next_command', 'blocker_count']) {
      if (!(field in item) || item[field] === '') {
        fail(`live check ${key} item missing ${field}`);
      }
    }
    if (!allowedStates.has(item.status) || !freshnessStates.has(item.freshness_state) || !authorities.has(item.authority)) {
      fail(`live check ${key} item has invalid state vocabulary`);
    }
  }
}
NODE

for menu_id in step_1_7 free-development lesson-repository-improvement; do
  menu_json="$TMP_DIR/dashboard-data-$menu_id.json"
  DASHBOARD_DATA_GENERATED_AT="2026-06-05T00:00:00Z" DASHBOARD_SELECTED_MENU_ID="$menu_id" "$ROOT/tools/dashboard-data" >"$menu_json"
  node - "$menu_json" "$menu_id" <<'NODE'
const fs = require('fs');
const data = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const menuId = process.argv[3];
function fail(message) {
  console.error(message);
  process.exit(1);
}
if (data.selected_context.menu_id !== menuId) {
  fail(`selected context did not honor ${menuId}`);
}
if (!data.contexts_by_menu[menuId]) {
  fail(`contexts_by_menu missing selected ${menuId}`);
}
if (data.selected_context.workflow_context !== data.contexts_by_menu[menuId].workflow_context) {
  fail(`selected context workflow_context does not match contexts_by_menu for ${menuId}`);
}
if (['step_1_7', 'advanced', 'lesson-repository-improvement'].includes(menuId)) {
  const leaked = data.selected_context.blockers.some((blocker) => /^product\.|^repositories\.product/.test(blocker.source));
  if (leaked) {
    fail(`${menuId} selected context leaked product-operation blockers`);
  }
}
if (['step_1_7', 'lesson-repository-improvement'].includes(menuId)) {
  const productName = data.settings?.items?.find((item) => item.id === 'product_name');
  const productType = data.settings?.items?.find((item) => item.id === 'product_type');
  if (productName?.status !== 'not_applicable' || productType?.status !== 'not_applicable') {
    fail(`${menuId} product Settings rows must be not_applicable`);
  }
}
NODE
done

EMPTY_PRODUCT_NAME_CONFIG="$TMP_DIR/LESSON_CONFIG_EMPTY_PRODUCT_NAME.tsv"
EMPTY_PRODUCT_NAME_JSON="$TMP_DIR/dashboard-data-empty-product-name.json"
{
  printf '# key\tvalue\n'
  printf 'project_root\t%s\n' "$TEST_PROJECT_ROOT"
  printf 'product_repo_name\t\n'
} >"$EMPTY_PRODUCT_NAME_CONFIG"
DASHBOARD_DATA_GENERATED_AT="2026-06-05T00:00:00Z" \
  DASHBOARD_SELECTED_MENU_ID="free-development" \
  DASHBOARD_LESSON14_CONFIG="$EMPTY_PRODUCT_NAME_CONFIG" \
  LESSON_CONFIG="$EMPTY_PRODUCT_NAME_CONFIG" \
  "$ROOT/tools/dashboard-data" >"$EMPTY_PRODUCT_NAME_JSON"
node - "$EMPTY_PRODUCT_NAME_JSON" <<'NODE'
const fs = require('fs');
const data = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const productName = data.settings?.items?.find((item) => item.id === 'product_name');
if (!productName || typeof productName.current_value !== 'string' || productName.current_value.length === 0) {
  console.error('product_name Settings row must not expose an empty current_value when product_repo_name is unset');
  process.exit(1);
}
NODE

INCONSISTENT_GIT_SETTINGS="$TMP_DIR/inconsistent-git-settings.tsv"
INCONSISTENT_GIT_JSON="$TMP_DIR/dashboard-data-inconsistent-git.json"
cat >"$INCONSISTENT_GIT_SETTINGS" <<'DOC'
# key	value
branch_allowed	false
worktree_allowed	false
main_direct_work_allowed	false
pr_creation	auto
pr_ci_monitoring	auto
merge_execution	after_approval
DOC
DASHBOARD_DATA_GENERATED_AT="2026-06-05T00:00:00Z" GIT_WORKFLOW_SETTINGS_FILE="$INCONSISTENT_GIT_SETTINGS" "$ROOT/tools/dashboard-data" >"$INCONSISTENT_GIT_JSON"
node - "$INCONSISTENT_GIT_JSON" <<'NODE'
const fs = require('fs');
const data = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
function fail(message) {
  console.error(message);
  process.exit(1);
}
if (data.git_workflow.settings_status !== 'blocked') {
  fail(`persisted inconsistent Git settings must surface as blocked, got ${data.git_workflow.settings_status}`);
}
const branch = data.settings.items.find((item) => item.id === 'git_branch_allowed');
const prCreation = data.settings.items.find((item) => item.id === 'git_pr_creation');
if (branch?.status !== 'blocked' || branch.consistency.reason_code !== 'no_approved_write_path') {
  fail('branch_allowed row must expose the no-write-path consistency blocker');
}
if (prCreation?.status !== 'blocked' || prCreation.consistency.reason_code !== 'pr_creation_requires_branch') {
  fail('pr_creation row must expose the branch-dependent automation blocker');
}
if (!data.development.git_operations.some((row) => row.status === 'blocked' && row.mode !== 'auto')) {
  fail('Git operation rows must reflect effective modes and blocked settings status');
}
NODE

product_project_root="$TMP_DIR/projects"
product_repo="$product_project_root/dashboard-product"
mkdir -p "$product_repo/docs/product" "$product_repo/docs/workflow" "$product_repo/docs/memory" "$product_repo/docs/design-system" "$product_repo/ops" "$product_repo/src" "$product_repo/tests" "$product_repo/.github/workflows" "$product_repo/.git/product-gate-evidence"
mkdir -p "$product_repo/skills/product-development-workflow" "$product_repo/skills/product-doc-sync" "$product_repo/skills/product-security" "$product_repo/skills/product-test" "$product_repo/skills/product-design-system" "$product_repo/tools/lib"
git -C "$product_repo" init -q
printf '# Product Agents\n' >"$product_repo/AGENTS.MD"
printf '# Product\n' >"$product_repo/README.md"
cat >"$product_repo/.gitignore" <<'DOC'
.env
.env.*
node_modules/
.venv/
dist/
build/
coverage/
playwright-report/
test-results/
DOC
printf '# Requirements\n' >"$product_repo/docs/product/REQUIREMENTS.md"
printf '# Specification\n' >"$product_repo/docs/product/SPECIFICATION.md"
printf '# Implementation Plan\n' >"$product_repo/docs/product/IMPLEMENTATION_PLAN.md"
printf '# Task Tracker\n' >"$product_repo/docs/workflow/TASK_TRACKER.md"
printf '# Handoff\n' >"$product_repo/docs/workflow/HANDOFF.md"
cat >"$product_repo/docs/memory/README.md" <<'DOC'
# Product Memory

Optional product memory files live here when the workflow needs them.
DOC
cat >"$product_repo/docs/workflow/SECURITY.md" <<'DOC'
# Product Security

Do not commit secrets, tokens, private keys, or credential-bearing env files.
DOC
cat >"$product_repo/docs/workflow/VERIFICATION.md" <<'DOC'
# Product Verification

Use ops/TEST_PLAN_MANIFEST.tsv to map product test ids to local commands and evidence.
DOC
cat >"$product_repo/docs/design-system/DESIGN_SYSTEM.md" <<'DOC'
# Product Design System

This file is the product-local design-system source of truth.
DOC
cat >"$product_repo/docs/design-system/tokens.json" <<'DOC'
{
  "schema_version": "1.0.0",
  "name": "dashboard-product",
  "tokens": [
    {
      "type": "color",
      "name": "accent",
      "value": "#1559c7",
      "role": "Primary product accent"
    }
  ]
}
DOC
cat >"$product_repo/docs/design-system/components.json" <<'DOC'
{
  "schema_version": "1.0.0",
  "name": "dashboard-product",
  "components": [
    {
      "id": "button",
      "tokens": ["accent"],
      "contract": ["Use product-local tokens."]
    }
  ]
}
DOC
printf 'source\n' >"$product_repo/src/index.txt"
printf 'test\n' >"$product_repo/tests/test.txt"
cat >"$product_repo/ops/STAGE_MANIFEST.tsv" <<'DOC'
# stage_id	required_mode	contexts	product_types	dashboard_group	description
build	required	all	all	workflow	Build stage.
DOC
cat >"$product_repo/ops/TEST_PLAN_MANIFEST.tsv" <<'DOC'
# test_id	required_mode	contexts	product_types	command_id	evidence_source	dashboard_group	description
unit	required	all	all	npm_test	product.gates.tests	workflow	Unit test.
DOC
cat >"$product_repo/ops/CI_MANIFEST.tsv" <<'DOC'
# ci_id	required_mode	contexts	workflow_file	workflow_name	branch_policy	evidence_source	description
main	contextual	product-improvement|external-integration	.github/workflows/ci.yml	CI	main	product.ci.main	Main CI.
DOC
cat >"$product_repo/ops/SECURITY_MANIFEST.tsv" <<'DOC'
# security_id	required_mode	contexts	policy_source	evidence_source	dashboard_group	description
secrets	required	all	docs/workflow/SECURITY.md	product.security.secrets	security	Secret scan.
DOC
cat >"$product_repo/ops/DESIGN_SYSTEM_MANIFEST.tsv" <<'DOC'
# design_id	required_mode	contexts	source_path	generated_path	check_command	description
product-design-system	required	all	docs/design-system/DESIGN_SYSTEM.md	none	tools/check_product_design_system.sh	Product-local design-system source and check.
DOC
cat >"$product_repo/ops/DASHBOARD_MANIFEST.tsv" <<'DOC'
# surface_id	required_mode	contexts	source_id	label_key	dashboard_group	description
overview	required	all	product.overview	overview	overview	Product overview.
DOC
cat >"$product_repo/ops/PRODUCT_MANIFEST.tsv" <<'DOC'
# authority_id	required_mode	contexts	product_types	path	path_role	validation_rule	dashboard_group	description
product.entrypoint	required	all	api|web	README.md	entrypoint	file_exists	workflow	Product entrypoint.
product.source	required	all	web	src/index.txt	source	file_nonempty	workflow	Product source authority.
product.test	required	all	web	tests/test.txt	test	file_nonempty	workflow	Product test authority.
DOC
cat >"$product_repo/ops/PRODUCT_PROFILE.json" <<'DOC'
{
  "schema_version": "1.0.0",
  "profile_kind": "product_display_profile",
  "menu_id": "step_1_14",
  "profile_scope": "product",
  "display_name": {
    "ja": "タスク管理表",
    "en": "Task Management Table"
  },
  "description": {
    "ja": "STEP 1-14 実践レッスンで作成する成果物です。",
    "en": "The product built in the STEP 1-14 practical lesson."
  },
  "source": "learner_confirmed",
  "confirmed_at": "2026-06-05T00:00:00Z",
  "source_documents": [
    "prompts/PROMPTS_14_DAYS.md",
    "lesson/LESSON_FLOW_14_DAYS.tsv"
  ]
}
DOC
cat >"$product_repo/ops/REPOSITORY_INDEX.json" <<'DOC'
{
  "schema_version": "1.0.0",
  "root_name": "dashboard-product",
  "source": "external_product_repository",
  "default_expand_depth": 1,
  "excludes": [
    { "pattern": "node_modules/", "reason": "dependency cache" },
    { "pattern": ".env*", "reason": "secret-bearing configuration" }
  ],
  "roles": {
    "repository_file": {
      "label": "Repository file",
      "description": "Product repository file"
    }
  },
  "files": []
}
DOC
cat >"$product_repo/ops/PRODUCT_OPERATION_MODE.tsv" <<'DOC'
# key	value
workflow_mode	parent_managed
managed_by_parent	true
parent_repository	lesson_repository
parent_rules_ref	AGENTS.MD
last_parent_sync	2026-06-05T00:00:00Z
active_parent_run	none
local_agents_version	1
routing_table_version	1
DOC
for skill in product-development-workflow product-doc-sync product-security product-test product-design-system; do
  cat >"$product_repo/skills/$skill/SKILL.md" <<DOC
---
name: $skill
description: Product-local $skill guidance.
---

# $skill

Use this product-local skill inside this product repository.
DOC
done
for tool in product-gate check_product_structure.sh check_product_docs.sh check_product_security.sh check_product_design_system.sh test_product_repository.sh product-mode; do
  cat >"$product_repo/tools/$tool" <<DOC
#!/usr/bin/env bash
set -euo pipefail
printf '%s passed\n' "$tool"
DOC
done
cat >"$product_repo/tools/lib/product_common.sh" <<'DOC'
#!/usr/bin/env bash
product_repo_root() {
  cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd
}
DOC
"$ROOT/tools/product-gate-evidence-bootstrap" install --repo "$product_repo" --confirm >/dev/null
cat >"$product_repo/.git/product-gate-evidence/index.tsv" <<'DOC'
# source_id	context	status	freshness_state	required_in_context	authority	observed_at	max_age_seconds	product_root	product_head	source_artifacts	blocked_by	next_command
product.git.sync	product-improvement	passed	current	true	authoritative	2026-06-07T00:00:00Z	3600	[external-product-repository]/dashboard-product	none	ops/CI_MANIFEST.tsv		./tools/check_git_sync.sh --product --required
product.gates.tests	product-improvement	passed	current	true	authoritative	2026-06-07T00:00:00Z	3600	[external-product-repository]/dashboard-product	none	ops/TEST_PLAN_MANIFEST.tsv		npm test
product.gates.structure	product-improvement	passed	current	true	authoritative	2026-06-07T00:00:01Z	3600	[external-product-repository]/dashboard-product	none	ops/TEST_PLAN_MANIFEST.tsv;tools/check-framecue		./tools/check-framecue
product.ci.main	product-improvement	failed	current	true	authoritative	2026-06-07T00:00:00Z	3600	[external-product-repository]/dashboard-product	none	ops/CI_MANIFEST.tsv	product.git.sync	./tools/check_ci_status.sh --product --required
product.security.secrets	product-improvement	passed	current	true	authoritative	2026-06-07T00:00:00Z	3600	[external-product-repository]/dashboard-product	none	ops/SECURITY_MANIFEST.tsv		./tools/product-security gate
DOC
dashboard_config="$TMP_DIR/dashboard-lesson-config.tsv"
cat >"$dashboard_config" <<DOC
# key	value
lesson_repo_name	ai-driven-development-lesson
product_repo_name	dashboard-product
project_root	$product_project_root
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
dashboard_product_registry="$TMP_DIR/dashboard-product-registry.tsv"
dashboard_product_selection="$TMP_DIR/dashboard-product-selection.tsv"
cat >"$dashboard_product_registry" <<DOC
# repo_id	primary_menu_id	allowed_contexts	display_name	repository_path	product_type	source
dashboard-product	product-improvement	product-improvement	Dashboard Product	$product_repo	web	test
DOC
cat >"$dashboard_product_selection" <<'DOC'
# menu_id	repo_id	selected_at	selection_source
product-improvement	dashboard-product	2026-06-17T00:00:00Z	test
DOC
evidence_backed_context_json="$TMP_DIR/dashboard-data-product-improvement.json"
DASHBOARD_DATA_GENERATED_AT="2026-06-05T00:00:00Z" \
  DASHBOARD_SELECTED_MENU_ID="product-improvement" \
  DASHBOARD_LESSON14_CONFIG="$dashboard_config" \
  PRODUCT_REPOSITORY_REGISTRY_FILE="$dashboard_product_registry" \
  PRODUCT_REPOSITORY_SELECTION_FILE="$dashboard_product_selection" \
  PRODUCT_REPOSITORY_AUTHORITY_NOW="2026-06-07T00:30:00Z" \
  "$ROOT/tools/dashboard-data" >"$evidence_backed_context_json"
node - "$evidence_backed_context_json" "$product_repo/ops/PRODUCT_MANIFEST.tsv" <<'NODE'
const fs = require('fs');
const data = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const manifest = fs.readFileSync(process.argv[3], 'utf8');
function fail(message) {
  console.error(message);
  process.exit(1);
}
function expectedProductTypeFromManifest(raw) {
  const allowed = new Set(['web', 'api', 'cli', 'library', 'integration', 'custom']);
  const seen = new Set();
  let hasAll = false;
  for (const line of raw.split(/\r?\n/)) {
    if (!line.trim() || line.startsWith('#')) {
      continue;
    }
    const fields = line.split('\t');
    if (fields.length !== 9) {
      continue;
    }
    for (const rawType of fields[3].split('|')) {
      const type = rawType.trim();
      if (type === 'all') {
        hasAll = true;
      } else if (allowed.has(type) && !seen.has(type)) {
        seen.add(type);
        return type;
      }
    }
  }
  return hasAll ? 'all' : 'unknown';
}
if (data.selected_context.menu_id !== 'product-improvement') {
  fail(`expected product-improvement selected context, got ${data.selected_context.menu_id}`);
}
const expectedProductType = expectedProductTypeFromManifest(manifest);
if (data.selected_context.product_type !== expectedProductType) {
  fail(`selected product type must follow PRODUCT_MANIFEST.tsv order: expected ${expectedProductType}, got ${data.selected_context.product_type}`);
}
if (data.selected_context.git_status !== 'passed') {
  fail(`expected selected_context.git_status to propagate product.git evidence, got ${data.selected_context.git_status}`);
}
if (data.selected_context.ci_status !== 'failed') {
  fail(`expected selected_context.ci_status to propagate product.ci evidence, got ${data.selected_context.ci_status}`);
}
if (data.selected_context.git_usage_mode !== 'ci') {
  fail(`product-improvement must use default ci Git usage mode, got ${data.selected_context.git_usage_mode}`);
}
if (data.selected_context.git_requirement !== 'required' || data.selected_context.ci_requirement !== 'required') {
  fail(`ci mode must require Git and CI, got ${data.selected_context.git_requirement}/${data.selected_context.ci_requirement}`);
}
const productGitUsageItem = data.settings.items.find((item) => item.id === 'product_git_usage_mode');
if (!productGitUsageItem) {
  fail('settings.items must include product_git_usage_mode for product contexts');
}
if (productGitUsageItem.editable !== true || productGitUsageItem.current_value !== 'ci') {
  fail(`product_git_usage_mode must be editable with current ci value in product-improvement, got editable=${productGitUsageItem.editable} value=${productGitUsageItem.current_value}`);
}
const allowedProductModes = productGitUsageItem.allowed_values.slice().sort().join(',');
if (allowedProductModes !== 'ci,local,none,remote_sync') {
  fail(`product_git_usage_mode allowed values are wrong: ${allowedProductModes}`);
}
if (data.selected_context.security_status !== 'passed') {
  fail(`expected selected_context.security_status to propagate product.security evidence, got ${data.selected_context.security_status}`);
}
if (data.development.product_authority.product_summary.status !== 'ready') {
  fail(`expected product summary ready, got ${data.development.product_authority.product_summary.status}`);
}
if (data.development.product_authority.product_summary.display_name.ja !== 'タスク管理表') {
  fail('product summary did not preserve the learner-confirmed Japanese product name');
}
if (data.development.product_authority.product_summary.source_path !== 'ops/PRODUCT_PROFILE.json') {
  fail('product summary did not use PRODUCT_PROFILE.json as the canonical source');
}
if (data.development.product_authority.operation_mode.status !== 'ready') {
  fail(`expected product operation mode ready, got ${data.development.product_authority.operation_mode.status}`);
}
if (data.development.product_authority.operation_mode.workflow_mode !== 'parent_managed') {
  fail('product operation mode did not preserve parent_managed');
}
if (!data.selected_context.blockers.some((blocker) => blocker.source === 'product.ci.main' && blocker.status === 'failed')) {
  fail('failed product CI evidence must remain in selected_context.blockers');
}
const matchingFailure = data.partial_failures.find((failure) => failure.source === 'product.ci.main');
if (!matchingFailure || matchingFailure.status !== 'failed') {
  fail('failed product CI evidence must appear as a current-context partial failure');
}
NODE

product_git_usage_settings="$TMP_DIR/product-git-usage-settings.tsv"
cat >"$product_git_usage_settings" <<'DOC'
# context	mode	selected_at
product-improvement	none	2026-06-05T00:00:00Z
DOC
product_none_context_json="$TMP_DIR/dashboard-data-product-improvement-none.json"
DASHBOARD_DATA_GENERATED_AT="2026-06-05T00:00:00Z" \
  DASHBOARD_SELECTED_MENU_ID="product-improvement" \
  DASHBOARD_LESSON14_CONFIG="$dashboard_config" \
  PRODUCT_WORKFLOW_GIT_USAGE_SETTINGS_FILE="$product_git_usage_settings" \
  PRODUCT_REPOSITORY_REGISTRY_FILE="$dashboard_product_registry" \
  PRODUCT_REPOSITORY_SELECTION_FILE="$dashboard_product_selection" \
  PRODUCT_REPOSITORY_AUTHORITY_NOW="2026-06-07T00:30:00Z" \
  "$ROOT/tools/dashboard-data" >"$product_none_context_json"
node - "$product_none_context_json" <<'NODE'
const fs = require('fs');
const data = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
function fail(message) {
  console.error(message);
  process.exit(1);
}
if (data.selected_context.git_usage_mode !== 'none') {
  fail(`expected product-improvement none mode, got ${data.selected_context.git_usage_mode}`);
}
if (data.selected_context.git_requirement !== 'not_applicable' || data.selected_context.ci_requirement !== 'not_applicable') {
  fail(`none mode must make Git and CI not_applicable, got ${data.selected_context.git_requirement}/${data.selected_context.ci_requirement}`);
}
if (data.selected_context.git_status !== 'not_applicable' || data.selected_context.ci_status !== 'not_applicable') {
  fail(`none mode must report selected Git/CI status as not_applicable, got ${data.selected_context.git_status}/${data.selected_context.ci_status}`);
}
if (data.selected_context.blockers.some((blocker) => blocker.source === 'product.ci.main')) {
  fail('none mode must not keep CI evidence as a selected-context blocker');
}
for (const row of data.development.git_operations) {
  if (row.status !== 'not_applicable' || row.mode !== 'not_applicable') {
    fail(`none mode must mark Git operation rows not_applicable, got ${row.id}:${row.status}/${row.mode}`);
  }
}
NODE

product_nogit_project_root="$TMP_DIR/no-git-product-project"
product_nogit_repo="$product_nogit_project_root/dashboard-product-nogit"
mkdir -p "$product_nogit_project_root"
cp -R "$product_repo" "$product_nogit_repo"
rm -rf "$product_nogit_repo/.git"
product_nogit_config="$TMP_DIR/dashboard-lesson-config-nogit.tsv"
cat >"$product_nogit_config" <<DOC
# key	value
lesson_repo_name	ai-driven-development-lesson
product_repo_name	dashboard-product-nogit
project_root	$product_nogit_project_root
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
product_nogit_registry="$TMP_DIR/dashboard-product-nogit-registry.tsv"
product_nogit_selection="$TMP_DIR/dashboard-product-nogit-selection.tsv"
cat >"$product_nogit_registry" <<DOC
# repo_id	primary_menu_id	allowed_contexts	display_name	repository_path	product_type	source
dashboard-product-nogit	product-improvement	product-improvement	Dashboard Product No Git	$product_nogit_repo	web	test
DOC
cat >"$product_nogit_selection" <<'DOC'
# menu_id	repo_id	selected_at	selection_source
product-improvement	dashboard-product-nogit	2026-06-17T00:00:00Z	test
DOC
product_none_nogit_context_json="$TMP_DIR/dashboard-data-product-improvement-none-nogit.json"
DASHBOARD_DATA_GENERATED_AT="2026-06-05T00:00:00Z" \
  DASHBOARD_SELECTED_MENU_ID="product-improvement" \
  DASHBOARD_LESSON14_CONFIG="$product_nogit_config" \
  PRODUCT_WORKFLOW_GIT_USAGE_SETTINGS_FILE="$product_git_usage_settings" \
  PRODUCT_REPOSITORY_REGISTRY_FILE="$product_nogit_registry" \
  PRODUCT_REPOSITORY_SELECTION_FILE="$product_nogit_selection" \
  PRODUCT_REPOSITORY_AUTHORITY_NOW="2026-06-07T00:30:00Z" \
  "$ROOT/tools/dashboard-data" >"$product_none_nogit_context_json"
node - "$product_none_nogit_context_json" <<'NODE'
const fs = require('fs');
const data = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
function fail(message) {
  console.error(message);
  process.exit(1);
}
const repository = data.development.product_repository;
if (data.selected_context.target_repository.path_state !== 'configured') {
  fail(`none mode with an existing non-Git product path must keep target path configured, got ${data.selected_context.target_repository.path_state}`);
}
if (repository.status !== 'ready' || repository.path_state !== 'configured') {
  fail(`none mode with an existing non-Git product path must report repository ready/configured, got ${repository.status}/${repository.path_state}`);
}
if (repository.git_state !== 'missing' || repository.git_requirement !== 'not_applicable') {
  fail(`none mode must separate missing Git from Git requirement, got ${repository.git_state}/${repository.git_requirement}`);
}
if (data.selected_context.git_status !== 'not_applicable' || data.selected_context.ci_status !== 'not_applicable') {
  fail(`none mode without .git must keep selected Git/CI not_applicable, got ${data.selected_context.git_status}/${data.selected_context.ci_status}`);
}
NODE

invalid_menu_json="$TMP_DIR/dashboard-data-invalid-menu.json"
DASHBOARD_DATA_GENERATED_AT="2026-06-05T00:00:00Z" DASHBOARD_SELECTED_MENU_ID="invalid-menu" "$ROOT/tools/dashboard-data" >"$invalid_menu_json"
node - "$invalid_menu_json" <<'NODE'
const fs = require('fs');
const data = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
if (data.selected_context.menu_id !== 'unknown') {
  console.error(`invalid menu id should fall back to unknown, got ${data.selected_context.menu_id}`);
  process.exit(1);
}
NODE

MISSING_POLICY_JSON="$TMP_DIR/dashboard-data-missing-policy.json"
MISSING_POLICY_ERR="$TMP_DIR/dashboard-data-missing-policy.err"
if ! DASHBOARD_DATA_GENERATED_AT="2026-06-05T00:00:00Z" GIT_WORKFLOW_POLICY_FILE="$TMP_DIR/missing-policy.tsv" "$ROOT/tools/dashboard-data" >"$MISSING_POLICY_JSON" 2>"$MISSING_POLICY_ERR"; then
  printf 'dashboard-data failed when Git workflow policy file was missing\n' >&2
  exit 1
fi
if [[ -s "$MISSING_POLICY_ERR" ]]; then
  printf 'dashboard-data leaked stderr for missing Git workflow policy file:\n' >&2
  cat "$MISSING_POLICY_ERR" >&2
  exit 1
fi
node - "$MISSING_POLICY_JSON" <<'NODE'
const fs = require('fs');
const file = process.argv[2];
const raw = fs.readFileSync(file, 'utf8');
const data = JSON.parse(raw);
function fail(message) {
  console.error(message);
  process.exit(1);
}
if (data.git_workflow.policy_status !== 'missing') {
  fail(`expected missing policy_status for missing policy file, got ${data.git_workflow.policy_status}`);
}
if (data.git_workflow.settings_status !== 'missing') {
  fail(`expected missing settings_status for missing policy file, got ${data.git_workflow.settings_status}`);
}
if (/\/tmp\/|awk:|fatal/.test(raw)) {
  fail('missing policy JSON leaked raw path or tool error text');
}
NODE

EMPTY_POLICY="$TMP_DIR/empty-policy.tsv"
EMPTY_POLICY_JSON="$TMP_DIR/dashboard-data-empty-policy.json"
EMPTY_POLICY_ERR="$TMP_DIR/dashboard-data-empty-policy.err"
: >"$EMPTY_POLICY"
if ! DASHBOARD_DATA_GENERATED_AT="2026-06-05T00:00:00Z" GIT_WORKFLOW_POLICY_FILE="$EMPTY_POLICY" "$ROOT/tools/dashboard-data" >"$EMPTY_POLICY_JSON" 2>"$EMPTY_POLICY_ERR"; then
  printf 'dashboard-data failed when Git workflow policy rows were empty\n' >&2
  exit 1
fi
if [[ -s "$EMPTY_POLICY_ERR" ]]; then
  printf 'dashboard-data leaked stderr for empty Git workflow policy rows:\n' >&2
  cat "$EMPTY_POLICY_ERR" >&2
  exit 1
fi
node - "$EMPTY_POLICY_JSON" <<'NODE'
const fs = require('fs');
const file = process.argv[2];
const data = JSON.parse(fs.readFileSync(file, 'utf8'));
function fail(message) {
  console.error(message);
  process.exit(1);
}
if (data.git_workflow.policy_status !== 'failed') {
  fail(`expected failed policy_status for empty policy rows, got ${data.git_workflow.policy_status}`);
}
if (data.git_workflow.settings_status !== 'failed') {
  fail(`expected failed settings_status for empty policy rows, got ${data.git_workflow.settings_status}`);
}
NODE

COMPLETED_STATE="$TMP_DIR/completed-lesson-state.tsv"
COMPLETED_CONFIG="$TMP_DIR/completed-lesson-config.tsv"
COMPLETED_JSON="$TMP_DIR/dashboard-data-completed-lesson.json"
cat >"$COMPLETED_STATE" <<'EOF_STATE'
# order	step_id	status	started_at	completed_at
001	setup.index	completed	2026-06-05 00:00:00	2026-06-05 00:01:00
002	day1.example	completed	2026-06-05 00:01:00	2026-06-05 00:02:00
EOF_STATE
{
  printf '# key\tvalue\n'
  printf 'project_root\t%s\n' "$TEST_PROJECT_ROOT"
  printf 'product_repo_name\ttask-tracker-repository\n'
  printf 'state_file\t%s\n' "$COMPLETED_STATE"
} >"$COMPLETED_CONFIG"
DASHBOARD_DATA_GENERATED_AT="2026-06-05T00:00:00Z" DASHBOARD_LESSON14_CONFIG="$COMPLETED_CONFIG" "$ROOT/tools/dashboard-data" >"$COMPLETED_JSON"
node - "$COMPLETED_JSON" <<'NODE'
const fs = require('fs');
const data = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
function fail(message) {
  console.error(message);
  process.exit(1);
}
if (data.lessons.step_1_14.status !== 'passed') {
  fail(`expected completed STEP 1-14 fixture to report passed, got ${data.lessons.step_1_14.status}`);
}
if (data.lessons.step_1_14.current_step !== 'all steps completed') {
  fail(`expected completed STEP 1-14 fixture current_step to say all steps completed, got ${data.lessons.step_1_14.current_step}`);
}
NODE

printf 'Dashboard data test passed.\n'
