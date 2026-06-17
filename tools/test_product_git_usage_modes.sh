#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

make_config() {
  local config="$1"
  local project_root="$2"
  local product_name="$3"
  cat >"$config" <<CONFIG
# key	value
lesson_repo_name	ai-driven-development-lesson
product_repo_name	$product_name
project_root	$project_root
flow_file	lesson/LESSON_FLOW.tsv
state_file	learning/LESSON_STATE.tsv
learning_tracker_file	learning/LEARNING_TASK_TRACKER.md
learning_handoff_file	learning/LEARNING_HANDOFF.md
learning_mode_file	$tmp/LESSON_MODE.tsv
workflow_language_file	$tmp/WORKFLOW_DISPLAY_LANGUAGE.tsv
product_language_file	$tmp/PRODUCT_DEVELOPMENT_LANGUAGE.tsv
CONFIG
}

write_common_settings() {
  cat >"$tmp/LESSON_MODE.tsv" <<'DOC'
# selected_at	mode	description
2026-06-12 00:00:00	A	じっくり説明
DOC
  cat >"$tmp/WORKFLOW_DISPLAY_LANGUAGE.tsv" <<'DOC'
# selected_at	code	label
2026-06-12 00:00:00	ja	日本語
DOC
  cat >"$tmp/PRODUCT_DEVELOPMENT_LANGUAGE.tsv" <<'DOC'
# selected_at	code	label
2026-06-12 00:00:00	ja	日本語
DOC
}

write_product_local_runtime() {
  local repo="$1"
  mkdir -p "$repo/docs/design-system" "$repo/docs/memory" "$repo/docs/workflow" "$repo/ops" "$repo/skills/product-development-workflow" "$repo/skills/product-doc-sync" "$repo/skills/product-security" "$repo/skills/product-test" "$repo/skills/product-design-system" "$repo/tools/lib"
  cat >"$repo/.gitignore" <<'DOC'
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
  cat >"$repo/docs/memory/README.md" <<'DOC'
# Product Memory

Optional product memory files live here when the workflow needs them.
DOC
  cat >"$repo/docs/workflow/SECURITY.md" <<'DOC'
# Product Security

Do not commit secrets, tokens, private keys, or credential-bearing env files.
DOC
  cat >"$repo/docs/workflow/VERIFICATION.md" <<'DOC'
# Product Verification

Use ops/TEST_PLAN_MANIFEST.tsv to map product test ids to local commands and evidence.
DOC
  cat >"$repo/docs/design-system/DESIGN_SYSTEM.md" <<'DOC'
# Product Design System

This file is the product-local design-system source of truth.
DOC
  cat >"$repo/docs/design-system/tokens.json" <<'DOC'
{
  "schema_version": "1.0.0",
  "name": "product",
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
  cat >"$repo/docs/design-system/components.json" <<'DOC'
{
  "schema_version": "1.0.0",
  "name": "product",
  "components": [
    {
      "id": "button",
      "tokens": ["accent"],
      "contract": ["Use product-local tokens."]
    }
  ]
}
DOC
  cat >"$repo/ops/REPOSITORY_INDEX.json" <<'DOC'
{
  "schema_version": "1.0.0",
  "root_name": "product",
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
  cat >"$repo/ops/PRODUCT_OPERATION_MODE.tsv" <<'DOC'
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
    cat >"$repo/skills/$skill/SKILL.md" <<DOC
---
name: $skill
description: Product-local $skill guidance.
---

# $skill

Use this product-local skill inside this product repository.
DOC
  done
  for tool in product-gate check_product_structure.sh check_product_docs.sh check_product_security.sh check_product_design_system.sh test_product_repository.sh product-mode; do
    cat >"$repo/tools/$tool" <<DOC
#!/usr/bin/env bash
set -euo pipefail
printf '%s passed\n' "$tool"
DOC
  done
  cat >"$repo/tools/lib/product_common.sh" <<'DOC'
#!/usr/bin/env bash
product_repo_root() {
  cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd
}
DOC
  "$ROOT/tools/product-gate-evidence-bootstrap" install --repo "$repo" --confirm >/dev/null
  cat >"$repo/ops/DESIGN_SYSTEM_MANIFEST.tsv" <<'DOC'
# design_id	required_mode	contexts	source_path	generated_path	check_command	description
product-design-system	required	all	docs/design-system/DESIGN_SYSTEM.md	none	tools/check_product_design_system.sh	Product-local design-system source and check.
DOC
}

write_product_workspace() {
  local repo="$1"
  mkdir -p "$repo/docs/product" "$repo/docs/workflow" "$repo/docs/memory" "$repo/ops" "$repo/src" "$repo/tests" "$repo/.github/workflows"
  write_product_local_runtime "$repo"
  printf '# Product Agents\n' >"$repo/AGENTS.MD"
  printf '# Product\n' >"$repo/README.md"
  printf '# Requirements\n' >"$repo/docs/product/REQUIREMENTS.md"
  printf '# Specification\n' >"$repo/docs/product/SPECIFICATION.md"
  printf '# Implementation Plan\n' >"$repo/docs/product/IMPLEMENTATION_PLAN.md"
  printf '# Task Tracker\n\n## Current Status\nReady.\n\n## Remaining Work\n- Continue.\n\nHANDOFF\n' >"$repo/docs/workflow/TASK_TRACKER.md"
  printf '# Handoff\n\n## Current State\nReady.\n\n## Next Step\n- Continue.\n\nTASK_TRACKER\n' >"$repo/docs/workflow/HANDOFF.md"
  printf 'source\n' >"$repo/src/index.txt"
  printf 'test\n' >"$repo/tests/test.txt"
  cat >"$repo/ops/STAGE_MANIFEST.tsv" <<'DOC'
# stage_id	required_mode	contexts	product_types	dashboard_group	description
build	required	all	all	workflow	Build stage.
DOC
  cat >"$repo/ops/TEST_PLAN_MANIFEST.tsv" <<'DOC'
# test_id	required_mode	contexts	product_types	command_id	evidence_source	dashboard_group	description
unit	optional	all	all	local_test	product.gates.tests	workflow	Optional local product test.
DOC
  cat >"$repo/ops/SECURITY_MANIFEST.tsv" <<'DOC'
# security_id	required_mode	contexts	policy_source	evidence_source	dashboard_group	description
secrets	optional	all	docs/workflow/SECURITY.md	product.security.secrets	security	Optional secret scan.
DOC
  cat >"$repo/ops/CI_MANIFEST.tsv" <<'DOC'
# ci_id	required_mode	contexts	workflow_file	workflow_name	branch_policy	evidence_source	description
main	contextual	product-improvement|external-integration	.github/workflows/ci.yml	CI	main	product.ci.main	Main CI.
DOC
  cat >"$repo/ops/INTEGRATION_MANIFEST.tsv" <<'DOC'
# integration_id	required_mode	contexts	service_kind	approval_source	security_source	dashboard_group	description
fixture	contextual	external-integration	fixture	EXTERNAL_INTEGRATION_SECURITY.md	ops/SECURITY_MANIFEST.tsv	workflow	Fixture integration.
DOC
  cat >"$repo/ops/DASHBOARD_MANIFEST.tsv" <<'DOC'
# surface_id	required_mode	contexts	source_id	label_key	dashboard_group	description
overview	required	all	product.overview	overview	overview	Product overview.
DOC
  cat >"$repo/ops/PRODUCT_MANIFEST.tsv" <<'DOC'
# authority_id	required_mode	contexts	product_types	path	path_role	validation_rule	dashboard_group	description
product.entrypoint	required	all	all	README.md	entrypoint	file_exists	workflow	Product entrypoint.
product.source	required	all	all	src/index.txt	source	file_nonempty	workflow	Product source authority.
product.test	required	all	all	tests/test.txt	test	file_nonempty	workflow	Product test authority.
DOC
  cat >"$repo/ops/PRODUCT_PROFILE.json" <<'DOC'
{
  "schema_version": "1.0.0",
  "profile_kind": "product_display_profile",
  "display_name": {
    "ja": "Git 利用モード検査",
    "en": "Git Usage Mode Test"
  },
  "description": {
    "ja": "成果物 Git 利用モード検査用です。",
    "en": "A product used by Git usage mode tests."
  },
  "source_documents": [
    "docs/product/REQUIREMENTS.md"
  ]
}
DOC
  cat >"$repo/EXTERNAL_INTEGRATION_SECURITY.md" <<'DOC'
# EXTERNAL_INTEGRATION_SECURITY.md

- Connected service: test service
- Data sent: public fixture data
- Data received: fixture identifier
- Write behavior: disabled in tests
- OAuth scopes: none
- Token storage: not used
- Redirect URI: local fixture
- Token refresh: not applicable
- Webhook signature: not used
- Rate limits: documented
- Sandbox: fixture workspace
- Prohibited log output: credentials and private data
- Rollback: remove fixture integration
DOC
  cat >"$repo/.github/workflows/ci.yml" <<'DOC'
name: CI

on:
  push:
  pull_request:

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: echo test
DOC
}

assert_json_field() {
  local json="$1"
  local script="$2"
  node - "$json" "$script" <<'NODE'
const data = JSON.parse(process.argv[2]);
const script = process.argv[3];
const fail = (message) => {
  console.error(message);
  process.exit(1);
};
const fn = new Function("data", "fail", script);
fn(data, fail);
NODE
}

tmp="$TMP_DIR/settings"
project_root="$TMP_DIR/projects"
fake_bin="$TMP_DIR/bin"
no_git_name="product-no-git"
required_no_git_name="product-no-git-required"
git_name="product-git"
ci_optional_name="product-ci-optional"
no_git_repo="$project_root/$no_git_name"
required_no_git_repo="$project_root/$required_no_git_name"
git_repo="$project_root/$git_name"
ci_optional_repo="$project_root/$ci_optional_name"
origin="$TMP_DIR/origin.git"
config_no_git="$TMP_DIR/LESSON_CONFIG_NO_GIT.tsv"
config_required_no_git="$TMP_DIR/LESSON_CONFIG_REQUIRED_NO_GIT.tsv"
config_git="$TMP_DIR/LESSON_CONFIG_GIT.tsv"
config_ci_optional="$TMP_DIR/LESSON_CONFIG_CI_OPTIONAL.tsv"
settings_file="$TMP_DIR/PRODUCT_WORKFLOW_GIT_USAGE_SETTINGS.tsv"
empty_registry_file="$TMP_DIR/EMPTY_PRODUCT_REPOSITORY_REGISTRY.tsv"
empty_selection_file="$TMP_DIR/EMPTY_PRODUCT_REPOSITORY_SELECTION.tsv"

export PRODUCT_REPOSITORY_REGISTRY_FILE="$empty_registry_file"
export PRODUCT_REPOSITORY_SELECTION_FILE="$empty_selection_file"

mkdir -p "$project_root" "$tmp" "$fake_bin"
write_common_settings
make_config "$config_no_git" "$project_root" "$no_git_name"
make_config "$config_required_no_git" "$project_root" "$required_no_git_name"
make_config "$config_git" "$project_root" "$git_name"
make_config "$config_ci_optional" "$project_root" "$ci_optional_name"
write_product_workspace "$no_git_repo"
write_product_workspace "$required_no_git_repo"
write_product_workspace "$git_repo"
write_product_workspace "$ci_optional_repo"
awk -F '\t' 'BEGIN { OFS = "\t" } /^#/ { print; next } $1 == "unit" { $2 = "required"; $8 = "Required local product test."; print; next } { print }' \
  "$required_no_git_repo/ops/TEST_PLAN_MANIFEST.tsv" >"$required_no_git_repo/ops/TEST_PLAN_MANIFEST.tsv.tmp"
mv "$required_no_git_repo/ops/TEST_PLAN_MANIFEST.tsv.tmp" "$required_no_git_repo/ops/TEST_PLAN_MANIFEST.tsv"
rm -f "$ci_optional_repo/ops/CI_MANIFEST.tsv"
rm -rf "$ci_optional_repo/.github/workflows"
git -c init.defaultBranch=main init --bare "$origin" >/dev/null
git -C "$ci_optional_repo" init -q
git -C "$git_repo" init -q
git -C "$git_repo" config user.name "Product Git Usage Test"
git -C "$git_repo" config user.email "product-git-usage@example.com"
git -C "$git_repo" add .
git -C "$git_repo" commit -m "Initial product fixture" >/dev/null
git -C "$git_repo" branch -M main
git -C "$git_repo" remote add origin "$origin"
git -C "$git_repo" push -u origin main >/dev/null
mkdir -p "$git_repo/.git/product-gate-evidence"
cat >"$git_repo/.git/product-gate-evidence/index.tsv" <<'DOC'
# source_id	context	status	freshness_state	required_in_context	authority	observed_at	max_age_seconds	product_root	product_head	source_artifacts	blocked_by	next_command
product.gates.tests	all	passed	current	true	authoritative	2026-06-12T00:00:00Z	3600	[external-product-repository]/product-git	none	ops/TEST_PLAN_MANIFEST.tsv		local_test
product.security.secrets	all	passed	current	true	authoritative	2026-06-12T00:00:00Z	3600	[external-product-repository]/product-git	none	ops/SECURITY_MANIFEST.tsv		./tools/product-security gate
product.ci.main	all	passed	current	true	authoritative	2026-06-12T00:00:00Z	3600	[external-product-repository]/product-git	none	ops/CI_MANIFEST.tsv		./tools/check_ci_status.sh --product --required
DOC
cat >"$fake_bin/gh" <<'GH'
#!/usr/bin/env bash
set -euo pipefail
case "${1:-}" in
  auth)
    if [[ "${2:-}" == "token" ]]; then
      printf 'fake-token\n'
      exit 0
    fi
    ;;
  api)
    printf 'completed\tsuccess\tCI\tCI\tmain\t1\t0\t1s\t2026-06-12T00:00:00Z\n'
    exit 0
    ;;
  run)
    if [[ "${2:-}" == "list" ]]; then
      printf 'completed\tsuccess\tCI\tCI\tmain\t1\t0\t1s\t2026-06-12T00:00:00Z\n'
      exit 0
    fi
    ;;
  repo)
    if [[ "${2:-}" == "view" ]]; then
      printf 'xxxMasahiro/product-git\n'
      exit 0
    fi
    ;;
esac
printf 'unsupported fake gh command: %s\n' "$*" >&2
exit 1
GH
chmod +x "$fake_bin/gh"

for context in free-development product-improvement external-integration; do
  default_mode="$(PRODUCT_WORKFLOW_GIT_USAGE_SETTINGS_FILE="$settings_file" bash -c "source '$ROOT/tools/lib/product_workflow_git_usage.sh'; product_workflow_git_usage_mode_for_context '$context'")"
  [[ "$default_mode" == "ci" ]] || { printf 'default mode for %s must be ci, got %s\n' "$context" "$default_mode" >&2; exit 1; }
  PRODUCT_WORKFLOW_GIT_USAGE_MODE=none bash -c "source '$ROOT/tools/lib/product_workflow_git_usage.sh'; product_workflow_git_usage_mode_for_context '$context'" \
    >"$TMP_DIR/product-git-usage-unapproved-override.out" 2>&1 && exit 1 || true
  grep 'requires PRODUCT_WORKFLOW_GIT_USAGE_ALLOW_ENV_OVERRIDE=1' "$TMP_DIR/product-git-usage-unapproved-override.out" >/dev/null
  approved_mode="$(PRODUCT_WORKFLOW_GIT_USAGE_ALLOW_ENV_OVERRIDE=1 PRODUCT_WORKFLOW_GIT_USAGE_MODE=none bash -c "source '$ROOT/tools/lib/product_workflow_git_usage.sh'; product_workflow_git_usage_mode_for_context '$context'")"
  [[ "$approved_mode" == "none" ]] || { printf 'approved env override for %s must be none, got %s\n' "$context" "$approved_mode" >&2; exit 1; }
  for mode in none local remote_sync ci; do
    git_requirement="$(bash -c "source '$ROOT/tools/lib/product_workflow_git_usage.sh'; product_workflow_git_usage_requirement_for_axis '$mode' git")"
    ci_requirement="$(bash -c "source '$ROOT/tools/lib/product_workflow_git_usage.sh'; product_workflow_git_usage_requirement_for_axis '$mode' ci")"
    case "$mode" in
      none)
        [[ "$git_requirement" == "not_applicable" && "$ci_requirement" == "not_applicable" ]] || exit 1
        ;;
      local|remote_sync)
        [[ "$git_requirement" == "required" && "$ci_requirement" == "not_applicable" ]] || exit 1
        ;;
      ci)
        [[ "$git_requirement" == "required" && "$ci_requirement" == "required" ]] || exit 1
        ;;
    esac
  done
done

DASHBOARD_SETTINGS_TEST_MODE=1 \
DASHBOARD_SETTINGS_TEST_ROOT="$TMP_DIR" \
DASHBOARD_SETTINGS_SKIP_SNAPSHOT=1 \
PRODUCT_WORKFLOW_GIT_USAGE_SETTINGS_FILE="$settings_file" \
LESSON_CONFIG="$config_no_git" \
"$ROOT/tools/dashboard-settings" apply product_git_usage_mode none --menu free-development --confirm --snapshot "$TMP_DIR/snapshot.json" \
  | grep '"setting_kind":"product_workflow_git_usage"' >/dev/null

selected_mode="$(PRODUCT_WORKFLOW_GIT_USAGE_SETTINGS_FILE="$settings_file" bash -c "source '$ROOT/tools/lib/product_workflow_git_usage.sh'; product_workflow_git_usage_mode_for_context free-development")"
[[ "$selected_mode" == "none" ]] || { printf 'Settings apply did not write product Git usage mode.\n' >&2; exit 1; }

LESSON_CONFIG="$config_no_git" PRODUCT_WORKFLOW_GIT_USAGE_SETTINGS_FILE="$settings_file" \
  "$ROOT/tools/free-development" gate-plan >"$TMP_DIR/product-git-usage-free-development-plan.tsv"
grep $'^free-development\tnone\toperation_mode\trequired\t./tools/product-repository-mode check --repo ' "$TMP_DIR/product-git-usage-free-development-plan.tsv" >/dev/null
grep $'^free-development\tnone\tgit_sync\tnot_applicable\tnot_applicable\t' "$TMP_DIR/product-git-usage-free-development-plan.tsv" >/dev/null

LESSON_CONFIG="$config_no_git" "$ROOT/tools/check_repository_boundary.sh" --product-workspace-required >/dev/null
"$ROOT/tools/product-scaffold-check" check --repo "$no_git_repo" --context free-development --git-optional >/dev/null
"$ROOT/tools/product-security" gate --repo "$no_git_repo" --context free-development --git-optional >/dev/null
LESSON_CONFIG="$config_no_git" PRODUCT_WORKFLOW_GIT_USAGE_SETTINGS_FILE="$settings_file" \
  "$ROOT/tools/product-profile" set --menu 4 --name-ja "Git なし成果物" --confirm \
  | grep 'Product profile recorded: free-development' >/dev/null

LESSON_CONFIG="$config_no_git" PRODUCT_WORKFLOW_GIT_USAGE_SETTINGS_FILE="$settings_file" \
  "$ROOT/tools/product-profile" set --menu 5 --name-ja "Git 必須成果物" --confirm \
  >"$TMP_DIR/product-git-usage-profile-strict.out" 2>&1 && exit 1 || true
grep 'not a Git worktree' "$TMP_DIR/product-git-usage-profile-strict.out" >/dev/null

no_git_json="$("$ROOT/tools/product-repository-authority" status --repo "$no_git_repo" --context free-development --json --git-optional --ci-optional)"
assert_json_field "$no_git_json" '
if (data.status !== "ready") fail(`expected ready for Git-optional workspace, got ${data.status}`);
if (data.repository.status !== "ready") fail(`expected ready repository, got ${data.repository.status}`);
if (data.evidence_summary.index_status !== "not_applicable") fail(`expected not_applicable evidence index, got ${data.evidence_summary.index_status}`);
if (data.product_operation_blockers.length !== 0) fail("Git-optional workspace must not create product-operation blockers");
'

required_no_git_json="$("$ROOT/tools/product-repository-authority" status --repo "$required_no_git_repo" --context free-development --json --git-optional --ci-optional)"
assert_json_field "$required_no_git_json" '
if (data.status !== "not_run") fail(`required local checks must block as not_run for Git-optional workspace, got ${data.status}`);
if (!data.product_operation_blockers.some((item) => item.source === "product.gates.tests" && item.status === "not_run")) {
  fail("Git-optional workspace must still require local product test evidence when TEST_PLAN_MANIFEST.tsv marks it required");
}
'

"$ROOT/tools/product-scaffold-check" check --repo "$no_git_repo" --context free-development >"$TMP_DIR/product-git-usage-scaffold.out" 2>&1 && exit 1 || true
grep 'not a Git repository' "$TMP_DIR/product-git-usage-scaffold.out" >/dev/null
"$ROOT/tools/product-security" gate --repo "$no_git_repo" --context free-development >"$TMP_DIR/product-git-usage-security.out" 2>&1 && exit 1 || true
grep 'not a Git repository' "$TMP_DIR/product-git-usage-security.out" >/dev/null
PRODUCT_WORKFLOW_GIT_USAGE_ALLOW_ENV_OVERRIDE=1 PRODUCT_WORKFLOW_GIT_USAGE_MODE=local LESSON_CONFIG="$config_ci_optional" \
  bash -c "source '$ROOT/tools/lib/product_workflow_git_usage.sh'; product_workflow_git_usage_scaffold_gate product-improvement all" >/dev/null
"$ROOT/tools/product-scaffold-check" check --repo "$ci_optional_repo" --context product-improvement --product-type all --ci-optional >/dev/null
"$ROOT/tools/product-scaffold-check" check --repo "$ci_optional_repo" --context product-improvement --product-type all \
  >"$TMP_DIR/product-git-usage-ci-required-scaffold.out" 2>&1 && exit 1 || true
grep 'product_ops.ci_manifest' "$TMP_DIR/product-git-usage-ci-required-scaffold.out" >/dev/null
strict_json="$("$ROOT/tools/product-repository-authority" status --repo "$no_git_repo" --context free-development --json)"
assert_json_field "$strict_json" '
if (data.status !== "blocked") fail(`strict authority must block non-Git product workspace, got ${data.status}`);
if (!data.product_operation_blockers.some((item) => item.source === "repositories.product")) fail("strict authority must report repository blocker");
'

for context in free-development product-improvement external-integration; do
  product_type="all"
  [[ "$context" != "external-integration" ]] || product_type="integration"
  for mode in none local remote_sync ci; do
    gate_config="$config_git"
    [[ "$mode" != "none" ]] || gate_config="$config_no_git"
    PRODUCT_WORKFLOW_GIT_USAGE_ALLOW_ENV_OVERRIDE=1 PRODUCT_WORKFLOW_GIT_USAGE_MODE="$mode" LESSON_CONFIG="$gate_config" \
      bash -c "source '$ROOT/tools/lib/product_workflow_git_usage.sh'; product_workflow_git_usage_gate_plan '$context' '$product_type'" \
      >"$TMP_DIR/product-git-usage-gate-plan-$context-$mode.tsv"
    awk -F '\t' '$3 == "operation_mode" && $4 == "required" && $5 ~ /^\.\/tools\/product-repository-mode check --repo / { found = 1 } END { exit found ? 0 : 1 }' "$TMP_DIR/product-git-usage-gate-plan-$context-$mode.tsv"
    case "$mode" in
      none)
        awk -F '\t' '$3 == "scaffold" && $5 ~ /--git-optional/ && $5 ~ /--ci-optional/ { found = 1 } END { exit found ? 0 : 1 }' "$TMP_DIR/product-git-usage-gate-plan-$context-$mode.tsv"
        awk -F '\t' '$3 == "git_sync" && $4 == "not_applicable" && $5 == "not_applicable" { found = 1 } END { exit found ? 0 : 1 }' "$TMP_DIR/product-git-usage-gate-plan-$context-$mode.tsv"
        awk -F '\t' '$3 == "ci" && $4 == "not_applicable" && $5 == "not_applicable" { found = 1 } END { exit found ? 0 : 1 }' "$TMP_DIR/product-git-usage-gate-plan-$context-$mode.tsv"
        ;;
      local)
        awk -F '\t' '$3 == "scaffold" && $5 !~ /--git-optional/ && $5 ~ /--ci-optional/ { found = 1 } END { exit found ? 0 : 1 }' "$TMP_DIR/product-git-usage-gate-plan-$context-$mode.tsv"
        awk -F '\t' '$3 == "git_sync" && $4 == "required" && $5 ~ /^\.\/tools\/check_git_sync\.sh --repo .* --clean-required$/ { found = 1 } END { exit found ? 0 : 1 }' "$TMP_DIR/product-git-usage-gate-plan-$context-$mode.tsv"
        awk -F '\t' '$3 == "ci" && $4 == "not_applicable" && $5 == "not_applicable" { found = 1 } END { exit found ? 0 : 1 }' "$TMP_DIR/product-git-usage-gate-plan-$context-$mode.tsv"
        ;;
      remote_sync)
        awk -F '\t' '$3 == "git_sync" && $4 == "required" && $5 ~ /^\.\/tools\/check_git_sync\.sh --repo .* --required$/ { found = 1 } END { exit found ? 0 : 1 }' "$TMP_DIR/product-git-usage-gate-plan-$context-$mode.tsv"
        awk -F '\t' '$3 == "ci" && $4 == "not_applicable" && $5 == "not_applicable" { found = 1 } END { exit found ? 0 : 1 }' "$TMP_DIR/product-git-usage-gate-plan-$context-$mode.tsv"
        ;;
      ci)
        awk -F '\t' '$3 == "git_sync" && $4 == "required" && $5 ~ /^\.\/tools\/check_git_sync\.sh --repo .* --required$/ { found = 1 } END { exit found ? 0 : 1 }' "$TMP_DIR/product-git-usage-gate-plan-$context-$mode.tsv"
        awk -F '\t' '$3 == "ci" && $4 == "required" && $5 ~ /^\.\/tools\/check_ci_status\.sh --repo .* --required$/ { found = 1 } END { exit found ? 0 : 1 }' "$TMP_DIR/product-git-usage-gate-plan-$context-$mode.tsv"
        ;;
    esac
    PRODUCT_WORKFLOW_GIT_USAGE_ALLOW_ENV_OVERRIDE=1 PRODUCT_WORKFLOW_GIT_USAGE_MODE="$mode" PATH="$fake_bin:$PATH" LESSON_CONFIG="$gate_config" \
      bash -c "source '$ROOT/tools/lib/product_workflow_git_usage.sh'; product_workflow_git_usage_gate '$context' '$product_type'" \
      >"$TMP_DIR/product-git-usage-gate-$context-$mode.out"
    if [[ "$mode" == "none" || "$mode" == "local" || "$mode" == "remote_sync" ]]; then
      grep 'Product CI gate: not applicable' "$TMP_DIR/product-git-usage-gate-$context-$mode.out" >/dev/null
    fi
  done
done

PRODUCT_WORKFLOW_GIT_USAGE_ALLOW_ENV_OVERRIDE=1 PRODUCT_WORKFLOW_GIT_USAGE_MODE=local LESSON_CONFIG="$config_git" bash -c "source '$ROOT/tools/lib/product_workflow_git_usage.sh'; product_workflow_git_usage_git_ci_gate free-development" >"$TMP_DIR/product-git-usage-local.out"
grep 'Product CI gate: not applicable' "$TMP_DIR/product-git-usage-local.out" >/dev/null

remote_command="$(bash -c "source '$ROOT/tools/lib/product_workflow_git_usage.sh'; product_workflow_git_usage_git_command remote_sync")"
ci_command="$(bash -c "source '$ROOT/tools/lib/product_workflow_git_usage.sh'; product_workflow_git_usage_ci_command ci")"
[[ "$remote_command" == "./tools/check_git_sync.sh --product --required" ]] || exit 1
[[ "$ci_command" == "./tools/check_ci_status.sh --product --required" ]] || exit 1

registry_file="$TMP_DIR/PRODUCT_REPOSITORY_REGISTRY.tsv"
selection_file="$TMP_DIR/PRODUCT_REPOSITORY_SELECTION.tsv"
cat >"$registry_file" <<DOC
# repo_id	primary_menu_id	allowed_contexts	display_name	repository_path	product_type	source
registry-a	free-development	free-development	Registry Product A	$git_repo	all	test
registry-b	free-development	free-development	Registry Product B	$ci_optional_repo	cli	test
DOC
cat >"$selection_file" <<'DOC'
# menu_id	repo_id	selected_at	selection_source
free-development	registry-b	2026-06-17T00:00:00Z	test
DOC
registry_status="$(
  PRODUCT_REPOSITORY_REGISTRY_FILE="$registry_file" \
  PRODUCT_REPOSITORY_SELECTION_FILE="$selection_file" \
  "$ROOT/tools/product-repository-registry" status
)"
grep $'registry-a\tfree-development\tfree-development\tRegistry Product A' <<<"$registry_status" >/dev/null
grep $'registry-b\tfree-development\tfree-development\tRegistry Product B' <<<"$registry_status" >/dev/null
grep $'registry-b\tfree-development\tfree-development\tRegistry Product B\t' <<<"$registry_status" | grep 'selected' >/dev/null
selected_registry="$(
  PRODUCT_REPOSITORY_REGISTRY_FILE="$registry_file" \
  PRODUCT_REPOSITORY_SELECTION_FILE="$selection_file" \
  "$ROOT/tools/product-repository-registry" selected free-development
)"
[[ "$selected_registry" == $'free-development\tregistry-b\t'"$ci_optional_repo" ]] || {
  printf 'unexpected selected registry row: %s\n' "$selected_registry" >&2
  exit 1
}
registry_verify="$(
  PRODUCT_REPOSITORY_REGISTRY_FILE="$registry_file" \
  PRODUCT_REPOSITORY_SELECTION_FILE="$selection_file" \
  "$ROOT/tools/product-repository-registry" verify --context free-development --all
)"
grep $'registry-a\tRegistry Product A\tfree-development\t'"$git_repo" <<<"$registry_verify" >/dev/null
grep $'registry-b\tRegistry Product B\tfree-development\t'"$ci_optional_repo" <<<"$registry_verify" >/dev/null
awk -F '\t' -v repo="$git_repo" '$1 == "registry-a" && $4 == repo && $7 == "passed" && $8 == "ready" && $11 != "" && $14 != "" && $16 == "ready" { found = 1 } END { exit found ? 0 : 1 }' <<<"$registry_verify"
awk -F '\t' -v repo="$ci_optional_repo" '$1 == "registry-b" && $4 == repo && $7 == "passed" && $8 == "ready" && $11 != "" && $14 != "" && $16 == "ready" { found = 1 } END { exit found ? 0 : 1 }' <<<"$registry_verify"
registry_verify_selected="$(
  PRODUCT_REPOSITORY_REGISTRY_FILE="$registry_file" \
  PRODUCT_REPOSITORY_SELECTION_FILE="$selection_file" \
  "$ROOT/tools/product-repository-registry" verify --context free-development
)"
grep $'registry-b\tRegistry Product B\tfree-development\t'"$ci_optional_repo" <<<"$registry_verify_selected" >/dev/null
if grep $'registry-a\tRegistry Product A' <<<"$registry_verify_selected" >/dev/null; then
  printf 'selected registry verification included an unselected repository\n' >&2
  exit 1
fi
registry_root="$(
  PRODUCT_REPOSITORY_REGISTRY_FILE="$registry_file" \
  PRODUCT_REPOSITORY_SELECTION_FILE="$selection_file" \
  bash -c "source '$ROOT/tools/lib/product_workflow_git_usage.sh'; product_workflow_git_usage_repository_root_for_context free-development"
)"
[[ "$registry_root" == "$ci_optional_repo" ]] || {
  printf 'registry-backed free-development root mismatch: %s\n' "$registry_root" >&2
  exit 1
}
PRODUCT_REPOSITORY_REGISTRY_FILE="$registry_file" \
PRODUCT_REPOSITORY_SELECTION_FILE="$selection_file" \
bash -c "source '$ROOT/tools/lib/product_workflow_git_usage.sh'; product_workflow_git_usage_repository_root_for_context product-improvement" \
  >"$TMP_DIR/product-registry-unselected.out" 2>&1 && exit 1 || true
grep 'no external product repository is selected for product-improvement' "$TMP_DIR/product-registry-unselected.out" >/dev/null

printf 'Product Git usage mode tests passed.\n'
