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

write_product_workspace() {
  local repo="$1"
  mkdir -p "$repo/docs/product" "$repo/docs/workflow" "$repo/docs/memory" "$repo/ops" "$repo/src" "$repo/tests" "$repo/.github/workflows"
  printf '# Product Agent\n' >"$repo/AGENT.md"
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
no_git_repo="$project_root/$no_git_name"
required_no_git_repo="$project_root/$required_no_git_name"
git_repo="$project_root/$git_name"
origin="$TMP_DIR/origin.git"
config_no_git="$TMP_DIR/LESSON_CONFIG_NO_GIT.tsv"
config_required_no_git="$TMP_DIR/LESSON_CONFIG_REQUIRED_NO_GIT.tsv"
config_git="$TMP_DIR/LESSON_CONFIG_GIT.tsv"
settings_file="$TMP_DIR/PRODUCT_WORKFLOW_GIT_USAGE_SETTINGS.tsv"

mkdir -p "$project_root" "$tmp" "$fake_bin"
write_common_settings
make_config "$config_no_git" "$project_root" "$no_git_name"
make_config "$config_required_no_git" "$project_root" "$required_no_git_name"
make_config "$config_git" "$project_root" "$git_name"
write_product_workspace "$no_git_repo"
write_product_workspace "$required_no_git_repo"
write_product_workspace "$git_repo"
awk -F '\t' 'BEGIN { OFS = "\t" } /^#/ { print; next } $1 == "unit" { $2 = "required"; $8 = "Required local product test."; print; next } { print }' \
  "$required_no_git_repo/ops/TEST_PLAN_MANIFEST.tsv" >"$required_no_git_repo/ops/TEST_PLAN_MANIFEST.tsv.tmp"
mv "$required_no_git_repo/ops/TEST_PLAN_MANIFEST.tsv.tmp" "$required_no_git_repo/ops/TEST_PLAN_MANIFEST.tsv"
git -c init.defaultBranch=main init --bare "$origin" >/dev/null
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
  for mode in none local remote_sync ci; do
    git_requirement="$(PRODUCT_WORKFLOW_GIT_USAGE_MODE="$mode" bash -c "source '$ROOT/tools/lib/product_workflow_git_usage.sh'; product_workflow_git_usage_requirement_for_axis '$mode' git")"
    ci_requirement="$(PRODUCT_WORKFLOW_GIT_USAGE_MODE="$mode" bash -c "source '$ROOT/tools/lib/product_workflow_git_usage.sh'; product_workflow_git_usage_requirement_for_axis '$mode' ci")"
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

LESSON_CONFIG="$config_no_git" "$ROOT/tools/check_repository_boundary.sh" --product-workspace-required >/dev/null
"$ROOT/tools/product-scaffold-check" check --repo "$no_git_repo" --context free-development --git-optional >/dev/null
"$ROOT/tools/product-security" gate --repo "$no_git_repo" --context free-development --git-optional >/dev/null

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
    PRODUCT_WORKFLOW_GIT_USAGE_MODE="$mode" PATH="$fake_bin:$PATH" LESSON_CONFIG="$gate_config" \
      bash -c "source '$ROOT/tools/lib/product_workflow_git_usage.sh'; product_workflow_git_usage_gate '$context' '$product_type'" \
      >"$TMP_DIR/product-git-usage-gate-$context-$mode.out"
    if [[ "$mode" == "none" || "$mode" == "local" || "$mode" == "remote_sync" ]]; then
      grep 'Product CI gate: not applicable' "$TMP_DIR/product-git-usage-gate-$context-$mode.out" >/dev/null
    fi
  done
done

PRODUCT_WORKFLOW_GIT_USAGE_MODE=local LESSON_CONFIG="$config_git" bash -c "source '$ROOT/tools/lib/product_workflow_git_usage.sh'; product_workflow_git_usage_git_ci_gate free-development" >"$TMP_DIR/product-git-usage-local.out"
grep 'Product CI gate: not applicable' "$TMP_DIR/product-git-usage-local.out" >/dev/null

remote_command="$(PRODUCT_WORKFLOW_GIT_USAGE_MODE=remote_sync bash -c "source '$ROOT/tools/lib/product_workflow_git_usage.sh'; product_workflow_git_usage_git_command remote_sync")"
ci_command="$(PRODUCT_WORKFLOW_GIT_USAGE_MODE=ci bash -c "source '$ROOT/tools/lib/product_workflow_git_usage.sh'; product_workflow_git_usage_ci_command ci")"
[[ "$remote_command" == "./tools/check_git_sync.sh --product --required" ]] || exit 1
[[ "$ci_command" == "./tools/check_ci_status.sh --product --required" ]] || exit 1

printf 'Product Git usage mode tests passed.\n'
