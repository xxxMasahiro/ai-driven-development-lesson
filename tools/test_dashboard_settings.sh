#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

lesson_mode="$TMP_DIR/LESSON_MODE.tsv"
workflow_language="$TMP_DIR/WORKFLOW_DISPLAY_LANGUAGE.tsv"
product_language="$TMP_DIR/PRODUCT_DEVELOPMENT_LANGUAGE.tsv"
lesson14_mode="$TMP_DIR/LESSON_MODE_14_DAYS.tsv"
lesson14_workflow_language="$TMP_DIR/WORKFLOW_DISPLAY_LANGUAGE_14_DAYS.tsv"
lesson14_product_language="$TMP_DIR/PRODUCT_DEVELOPMENT_LANGUAGE_14_DAYS.tsv"
git_settings="$TMP_DIR/GIT_WORKFLOW_SETTINGS.tsv"
dashboard_display_depth="$TMP_DIR/DASHBOARD_DISPLAY_DEPTH.tsv"
lesson_config="$TMP_DIR/LESSON_CONFIG.tsv"
lesson14_config="$TMP_DIR/LESSON_CONFIG_14_DAYS.tsv"

printf '# selected_at\tmode\tdescription\n2026-06-05 00:00:00\tA\tじっくり説明\n' >"$lesson_mode"
printf '# selected_at\tcode\tlabel\n2026-06-05 00:00:00\tja\t日本語\n' >"$workflow_language"
printf '# selected_at\tcode\tlabel\n2026-06-05 00:00:00\ten\tEnglish\n' >"$product_language"
printf '# selected_at\tmode\tdescription\n2026-06-05 00:00:00\tA\tじっくり説明\n' >"$lesson14_mode"
printf '# selected_at\tcode\tlabel\n2026-06-05 00:00:00\tja\t日本語\n' >"$lesson14_workflow_language"
printf '# selected_at\tcode\tlabel\n2026-06-05 00:00:00\ten\tEnglish\n' >"$lesson14_product_language"
printf '# selected_at\tdepth\tlabel\n2026-06-05 00:00:00\tstandard\tStandard\n' >"$dashboard_display_depth"
cat >"$git_settings" <<'DOC'
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
cat >"$lesson_config" <<DOC
# key	value
learning_mode_file	$lesson_mode
workflow_language_file	$workflow_language
product_language_file	$product_language
DOC
cat >"$lesson14_config" <<DOC
# key	value
learning_mode_file	$lesson14_mode
workflow_language_file	$lesson14_workflow_language
product_language_file	$lesson14_product_language
DOC

run_settings() {
  DASHBOARD_SETTINGS_TEST_MODE=1 \
  DASHBOARD_SETTINGS_TEST_ROOT="$TMP_DIR" \
  DASHBOARD_SETTINGS_SKIP_SNAPSHOT=1 \
  DASHBOARD_SETTINGS_CATALOG_FIXTURE="$ROOT/tests/fixtures/dashboard-control-center.json" \
  DASHBOARD_LESSON_CONFIG="$lesson_config" \
  DASHBOARD_LESSON14_CONFIG="$lesson14_config" \
  LESSON_CONFIG="$lesson14_config" \
  GIT_WORKFLOW_SETTINGS_FILE="$git_settings" \
  GIT_WORKFLOW_POLICY_FILE="$ROOT/docs/workflow/GIT_WORKFLOW_POLICY.tsv" \
  DASHBOARD_DISPLAY_DEPTH_FILE="$dashboard_display_depth" \
  "$ROOT/tools/dashboard-settings" "$@"
}

plan_json="$TMP_DIR/plan.json"
run_settings plan learning_mode B --menu step_1_14 >"$plan_json"
node - "$plan_json" <<'NODE'
const fs = require("fs");
const data = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
if (data.status !== "ready" || data.setting_id !== "learning_mode" || data.requested_value !== "B" || data.applied !== false) {
  console.error("lesson setting plan did not expose the expected safe plan");
  process.exit(1);
}
if (data.plan_token !== undefined) {
  console.error("dashboard-settings CLI plan must not mint browser middleware plan tokens");
  process.exit(1);
}
if (!data.requires_confirmation || data.snapshot_regenerated !== false) {
  console.error("settings plan must require confirmation without regenerating a snapshot");
  process.exit(1);
}
NODE

if run_settings apply learning_mode B --menu step_1_14 --expect-current-value C --confirm >/dev/null 2>&1; then
  printf 'dashboard-settings must reject stale expected current values\n' >&2
  exit 1
fi
awk -F '\t' '$1 !~ /^#/ && $2 == "A" { found = 1 } END { exit found ? 0 : 1 }' "$lesson14_mode"

if run_settings apply learning_mode B --menu step_1_14 --expect-target-file learning/OTHER.tsv --confirm >/dev/null 2>&1; then
  printf 'dashboard-settings must reject mismatched expected target files\n' >&2
  exit 1
fi
awk -F '\t' '$1 !~ /^#/ && $2 == "A" { found = 1 } END { exit found ? 0 : 1 }' "$lesson14_mode"

run_settings apply learning_mode B --menu step_1_14 --expect-current-value A --expect-setting-kind lesson --confirm >/dev/null
awk -F '\t' '$1 !~ /^#/ && $2 == "B" { found = 1 } END { exit found ? 0 : 1 }' "$lesson14_mode"

workflow_apply_json="$(run_settings apply workflow_language ar --menu step_1_14 --confirm)"
WORKFLOW_APPLY_JSON="$workflow_apply_json" node <<'NODE'
const data = JSON.parse(process.env.WORKFLOW_APPLY_JSON);
if (
  data.workflow_language !== "ar" ||
  data.display_locale !== "ar" ||
  data.ui_locale !== "ar" ||
  data.direction !== "rtl"
) {
  console.error("workflow language apply must return canonical locale metadata");
  process.exit(1);
}
NODE
run_settings apply workflow_language en --menu step_1_14 --confirm >/dev/null
awk -F '\t' '$1 !~ /^#/ && $2 == "en" && $3 == "English" { found = 1 } END { exit found ? 0 : 1 }' "$lesson14_workflow_language"

run_settings apply product_language zh-CN --menu step_1_14 --confirm >/dev/null
awk -F '\t' '$1 !~ /^#/ && $2 == "zh-CN" && $3 != "" { found = 1 } END { exit found ? 0 : 1 }' "$lesson14_product_language"

dashboard_depth_plan_json="$(run_settings plan dashboard_display_depth technical --menu step_1_14)"
DASHBOARD_DEPTH_PLAN_JSON="$dashboard_depth_plan_json" node <<'NODE'
const data = JSON.parse(process.env.DASHBOARD_DEPTH_PLAN_JSON);
if (data.status !== "ready" || data.setting_kind !== "dashboard" || data.setting_id !== "dashboard_display_depth" || data.requested_value !== "technical") {
  console.error("dashboard display depth plan must expose a dashboard-scoped safe plan");
  process.exit(1);
}
if (data.current_value !== "standard" || data.target_file !== "settings-test-target") {
  console.error("dashboard display depth plan must report the current value and target file");
  process.exit(1);
}
NODE
run_settings apply dashboard_display_depth technical --menu step_1_14 --expect-current-value standard --expect-setting-kind dashboard --confirm >/dev/null
awk -F '\t' '$1 !~ /^#/ && $2 == "technical" && $3 == "Technical detail" { found = 1 } END { exit found ? 0 : 1 }' "$dashboard_display_depth"
if run_settings plan dashboard_display_depth verbose --menu step_1_14 >/dev/null 2>&1; then
  printf 'dashboard-settings must reject invalid dashboard display depth values\n' >&2
  exit 1
fi

validate_catalog_allowed_values_for_menu() {
  local menu_id="$1"
  local settings_catalog_json
  settings_catalog_json="$(run_settings catalog --menu "$menu_id")"
  SETTINGS_CATALOG_JSON="$settings_catalog_json" node <<'NODE'
const catalog = JSON.parse(process.env.SETTINGS_CATALOG_JSON);
if (!catalog || !Array.isArray(catalog.items)) {
  console.error('dashboard-settings catalog must expose settings items');
  process.exit(1);
}
const editableItems = catalog.items.filter((item) => item.editable);
if (!editableItems.length) {
  console.error('dashboard-settings catalog must expose editable items');
  process.exit(1);
}
for (const item of editableItems) {
  if (!Array.isArray(item.allowed_values) || item.allowed_values.length === 0) {
    console.error(`editable item must expose allowed values: ${item.id}`);
    process.exit(1);
  }
}
NODE
  while IFS=$'\t' read -r setting_id allowed_value; do
    [[ -n "$setting_id" && -n "$allowed_value" ]] || continue
    run_settings plan "$setting_id" "$allowed_value" --menu "$menu_id" >/dev/null
  done < <(SETTINGS_CATALOG_JSON="$settings_catalog_json" node <<'NODE'
const catalog = JSON.parse(process.env.SETTINGS_CATALOG_JSON);
for (const item of catalog.items.filter((entry) => entry.editable)) {
  for (const value of item.allowed_values) {
    process.stdout.write(`${item.id}\t${value}\n`);
  }
}
NODE
  )
}

for catalog_menu in step_1_14 free-development product-improvement external-integration lesson-repository-improvement; do
  validate_catalog_allowed_values_for_menu "$catalog_menu"
done

run_settings apply git_push_automation manual --menu step_1_14 --confirm >/dev/null
awk -F '\t' '$1 == "push_automation" && $2 == "manual" { found = 1 } END { exit found ? 0 : 1 }' "$git_settings"

run_settings apply git_developer_auto_merge_allowed false --menu step_1_14 --confirm >/dev/null
awk -F '\t' '$1 == "developer_auto_merge_allowed" && $2 == "false" { found = 1 } END { exit found ? 0 : 1 }' "$git_settings"
run_settings apply git_developer_auto_merge_allowed true --menu step_1_14 --confirm >/dev/null
awk -F '\t' '$1 == "developer_auto_merge_allowed" && $2 == "true" { found = 1 } END { exit found ? 0 : 1 }' "$git_settings"

blocked_git_plan_json="$(run_settings plan git_branch_allowed false --menu step_1_14)"
BLOCKED_GIT_PLAN_JSON="$blocked_git_plan_json" node <<'NODE'
const data = JSON.parse(process.env.BLOCKED_GIT_PLAN_JSON);
if (data.status !== "blocked" || data.applied !== false || data.snapshot_regenerated !== false) {
  console.error("blocked Git workflow plan must be structured as an unapplied blocked result");
  process.exit(1);
}
if (data.reason_code !== "no_approved_write_path" || !Array.isArray(data.affected_setting_ids) || !data.affected_setting_ids.includes("branch_allowed")) {
  console.error("blocked Git workflow plan must expose the no-write-path reason and affected settings");
  process.exit(1);
}
NODE
blocked_git_apply_json="$(run_settings apply git_branch_allowed false --menu step_1_14 --confirm)"
BLOCKED_GIT_APPLY_JSON="$blocked_git_apply_json" node <<'NODE'
const data = JSON.parse(process.env.BLOCKED_GIT_APPLY_JSON);
if (data.status !== "blocked" || data.applied !== false || data.snapshot_regenerated !== false) {
  console.error("blocked Git workflow apply must not write or regenerate snapshots");
  process.exit(1);
}
NODE
awk -F '\t' '$1 == "branch_allowed" && $2 == "true" { found = 1 } END { exit found ? 0 : 1 }' "$git_settings"

manual_required_plan_json="$(run_settings plan git_merge_execution manual --menu step_1_14)"
MANUAL_REQUIRED_PLAN_JSON="$manual_required_plan_json" node <<'NODE'
const data = JSON.parse(process.env.MANUAL_REQUIRED_PLAN_JSON);
if (data.status !== "manual_required" || data.reason_code !== "developer_auto_merge_overrides_manual_when_gates_pass") {
  console.error("manual merge with developer auto-merge must be reported as manual_required policy feedback");
  process.exit(1);
}
NODE

cat >"$git_settings" <<'DOC'
# key	value
branch_allowed	false
worktree_allowed	false
main_direct_work_allowed	false
pr_creation	auto
pr_ci_monitoring	auto
merge_execution	after_approval
DOC
recovery_git_apply_json="$(run_settings apply git_pr_creation manual --menu step_1_14 --confirm)"
RECOVERY_GIT_APPLY_JSON="$recovery_git_apply_json" node <<'NODE'
const data = JSON.parse(process.env.RECOVERY_GIT_APPLY_JSON);
if (data.status !== "passed" || data.applied !== true) {
  console.error("dashboard-settings must allow recovery writes that reduce persisted Git workflow conflicts");
  process.exit(1);
}
NODE
awk -F '\t' '$1 == "pr_creation" && $2 == "manual" { found = 1 } END { exit found ? 0 : 1 }' "$git_settings"

cat >"$git_settings" <<'DOC'
# key	value
branch_allowed	true
worktree_allowed	false
main_direct_work_allowed	false
automation_level	sync
commit_automation	auto
push_automation	manual
pr_creation	auto
pr_ci_monitoring	auto
merge_execution	after_approval
developer_auto_merge_allowed	true
main_ci_monitoring	auto
sync_monitoring	auto
DOC

if run_settings apply git_approval ready --menu step_1_14 --confirm >/dev/null 2>&1; then
  printf 'dashboard-settings must reject non-policy Git rows\n' >&2
  exit 1
fi

if run_settings apply git_push_automation maybe --menu step_1_14 --confirm >/dev/null 2>&1; then
  printf 'dashboard-settings must reject invalid Git workflow values\n' >&2
  exit 1
fi

if run_settings apply learning_mode C --menu step_1_14 >/dev/null 2>&1; then
  printf 'dashboard-settings must require --confirm for apply\n' >&2
  exit 1
fi

outside_config="$TMP_DIR/OUTSIDE_CONFIG.tsv"
cat >"$outside_config" <<'DOC'
# key	value
learning_mode_file	/etc/passwd
DOC
if DASHBOARD_SETTINGS_TEST_MODE=1 \
  DASHBOARD_SETTINGS_TEST_ROOT="$TMP_DIR" \
  DASHBOARD_SETTINGS_SKIP_SNAPSHOT=1 \
  DASHBOARD_LESSON14_CONFIG="$outside_config" \
  LESSON_CONFIG="$outside_config" \
  GIT_WORKFLOW_SETTINGS_FILE="$git_settings" \
  GIT_WORKFLOW_POLICY_FILE="$ROOT/docs/workflow/GIT_WORKFLOW_POLICY.tsv" \
  DASHBOARD_DISPLAY_DEPTH_FILE="$dashboard_display_depth" \
  "$ROOT/tools/dashboard-settings" apply learning_mode A --menu step_1_14 --confirm >/dev/null 2>&1; then
  printf 'dashboard-settings must reject files outside the approved boundary\n' >&2
  exit 1
fi

if run_settings apply learning_mode A --menu step_1_14 --snapshot /etc/dashboard-data.json --confirm >/dev/null 2>&1; then
  printf 'dashboard-settings must reject dashboard snapshots outside the approved boundary\n' >&2
  exit 1
fi
awk -F '\t' '$1 !~ /^#/ && $2 == "B" { found = 1 } END { exit found ? 0 : 1 }' "$lesson14_mode"

if run_settings apply learning_mode A --menu step_1_14 --snapshot "$ROOT/AGENTS.MD" --confirm >/dev/null 2>&1; then
  printf 'dashboard-settings must reject repository files as dashboard snapshot targets\n' >&2
  exit 1
fi
awk -F '\t' '$1 !~ /^#/ && $2 == "B" { found = 1 } END { exit found ? 0 : 1 }' "$lesson14_mode"

printf 'Dashboard settings tests passed.\n'
