#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

repo="$TMP_DIR/product"
fake_bin="$TMP_DIR/bin"
mkdir -p "$repo" "$fake_bin"
export PRODUCT_REPOSITORY_AUTHORITY_NOW="2026-06-07T00:30:00Z"
git -C "$repo" init -q
git -C "$repo" config user.name "Product Authority Test"
git -C "$repo" config user.email "product-authority@example.com"

cat >"$fake_bin/gh" <<'GH'
#!/usr/bin/env bash
printf 'product-repository-authority must not call gh\n' >&2
exit 99
GH
chmod +x "$fake_bin/gh"

require_evidence_schema_row() {
  local section="$1"
  local field="$2"
  if ! awk -F '\t' -v section="$section" -v field="$field" '
    $1 !~ /^#/ && $1 == section && $2 == field { found = 1 }
    END { exit found ? 0 : 1 }
  ' "$ROOT/docs/workflow/PRODUCT_GATE_EVIDENCE_SCHEMA.tsv"; then
    printf 'missing product gate evidence schema row: %s.%s\n' "$section" "$field" >&2
    exit 1
  fi
}

for schema_field in \
  ledger_path \
  details_path \
  detail_artifact_common_fields \
  event_id \
  detail_artifact_redaction; do
  require_evidence_schema_row evidence "$schema_field"
done
for schema_field in \
  evidence_detail_manifest_path \
  evidence_detail_manifest_columns; do
  require_evidence_schema_row manifest "$schema_field"
done

write_product_manifest() {
  local path="$1"
  mkdir -p "$(dirname "$path")"
  cat >"$path" <<'DOC'
# authority_id	required_mode	contexts	product_types	path	path_role	validation_rule	dashboard_group	description
product.entrypoint	required	all	all	README.md	entrypoint	file_exists	workflow	Product entrypoint.
product.source	required	all	all	src/index.txt	source	file_nonempty	workflow	Product source authority.
product.test	required	all	all	tests/test.txt	test	file_nonempty	workflow	Product test authority.
DOC
}

write_product_local_runtime() {
  local target_repo="${1:-$repo}"
  mkdir -p "$target_repo/docs/design-system" "$target_repo/docs/memory" "$target_repo/docs/workflow" "$target_repo/ops" "$target_repo/skills/product-development-workflow" "$target_repo/skills/product-doc-sync" "$target_repo/skills/product-security" "$target_repo/skills/product-test" "$target_repo/skills/product-design-system" "$target_repo/tools/lib"
  cat >"$target_repo/.gitignore" <<'DOC'
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
  cat >"$target_repo/docs/memory/README.md" <<'DOC'
# Product Memory

Optional product memory files live here when the workflow needs them.
DOC
  cat >"$target_repo/docs/workflow/SECURITY.md" <<'DOC'
# Product Security

Do not commit secrets, tokens, private keys, or credential-bearing env files.
DOC
  cat >"$target_repo/docs/workflow/VERIFICATION.md" <<'DOC'
# Product Verification

Use ops/TEST_PLAN_MANIFEST.tsv to map product test ids to local commands and evidence.
DOC
  cat >"$target_repo/docs/design-system/DESIGN_SYSTEM.md" <<'DOC'
# Product Design System

This file is the product-local design-system source of truth.
DOC
  cat >"$target_repo/docs/design-system/tokens.json" <<'DOC'
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
  cat >"$target_repo/docs/design-system/components.json" <<'DOC'
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
  cat >"$target_repo/ops/REPOSITORY_INDEX.json" <<'DOC'
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
  cat >"$target_repo/ops/PRODUCT_OPERATION_MODE.tsv" <<'DOC'
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
    cat >"$target_repo/skills/$skill/SKILL.md" <<DOC
---
name: $skill
description: Product-local $skill guidance.
---

# $skill

Use this product-local skill inside this product repository.
DOC
  done
  for tool in product-gate check_product_structure.sh check_product_docs.sh check_product_security.sh check_product_design_system.sh test_product_repository.sh product-mode; do
    cat >"$target_repo/tools/$tool" <<DOC
#!/usr/bin/env bash
set -euo pipefail
printf '%s passed\n' "$tool"
DOC
  done
  cat >"$target_repo/tools/lib/product_common.sh" <<'DOC'
#!/usr/bin/env bash
product_repo_root() {
  cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd
}
DOC
  "$ROOT/tools/product-gate-evidence-bootstrap" install --repo "$target_repo" --confirm >/dev/null
  cat >"$target_repo/ops/DESIGN_SYSTEM_MANIFEST.tsv" <<'DOC'
# design_id	required_mode	contexts	source_path	generated_path	check_command	description
product-design-system	required	all	docs/design-system/DESIGN_SYSTEM.md	none	tools/check_product_design_system.sh	Product-local design-system source and check.
DOC
}

write_valid_product() {
  mkdir -p "$repo/docs/product" "$repo/docs/workflow" "$repo/docs/memory" "$repo/ops" "$repo/src" "$repo/tests" "$repo/.github/workflows"
  write_product_local_runtime "$repo"
  printf '# Product Agents\n' >"$repo/AGENTS.MD"
  printf '# Product\n' >"$repo/README.md"
  printf '# Requirements\n' >"$repo/docs/product/REQUIREMENTS.md"
  printf '# Specification\n' >"$repo/docs/product/SPECIFICATION.md"
  printf '# Implementation Plan\n' >"$repo/docs/product/IMPLEMENTATION_PLAN.md"
  printf '# Task Tracker\n' >"$repo/docs/workflow/TASK_TRACKER.md"
  printf '# Handoff\n' >"$repo/docs/workflow/HANDOFF.md"
  printf 'source\n' >"$repo/src/index.txt"
  printf 'test\n' >"$repo/tests/test.txt"
  cat >"$repo/ops/STAGE_MANIFEST.tsv" <<'DOC'
# stage_id	required_mode	contexts	product_types	dashboard_group	description
build	required	all	all	workflow	Build stage.
DOC
  cat >"$repo/ops/TEST_PLAN_MANIFEST.tsv" <<'DOC'
# test_id	required_mode	contexts	product_types	command_id	evidence_source	dashboard_group	description
unit	required	all	all	npm_test	product.gates.tests	workflow	Unit test.
DOC
  cat >"$repo/ops/CI_MANIFEST.tsv" <<'DOC'
# ci_id	required_mode	contexts	workflow_file	workflow_name	branch_policy	evidence_source	description
main	contextual	product-improvement|external-integration	.github/workflows/ci.yml	CI	main	product.ci.main	Main CI.
DOC
  cat >"$repo/ops/SECURITY_MANIFEST.tsv" <<'DOC'
# security_id	required_mode	contexts	policy_source	evidence_source	dashboard_group	description
secrets	required	all	docs/workflow/SECURITY.md	product.security.secrets	security	Secret scan.
DOC
  cat >"$repo/ops/DASHBOARD_MANIFEST.tsv" <<'DOC'
# surface_id	required_mode	contexts	source_id	label_key	dashboard_group	description
overview	required	all	product.overview	overview	overview	Product overview.
DOC
  write_product_manifest "$repo/ops/PRODUCT_MANIFEST.tsv"
  cat >"$repo/ops/PRODUCT_PROFILE.json" <<'DOC'
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
    "prompts/PROMPTS_14_DAYS.md"
  ]
}
DOC
}

missing_json="$(PATH="$fake_bin:$PATH" "$ROOT/tools/product-repository-authority" status --repo "$TMP_DIR/missing" --json)"
node - "$missing_json" <<'NODE'
const data = JSON.parse(process.argv[2]);
function fail(message) {
  console.error(message);
  process.exit(1);
}
if (data.status !== "missing") fail(`expected missing status, got ${data.status}`);
if (data.repository.blocker_scope !== "product_operations") fail("missing repository must block product operations");
if (!data.product_operation_blockers.some((item) => item.source === "repositories.product")) {
  fail("missing repository blocker source is absent");
}
if (/\/tmp\//.test(JSON.stringify(data))) fail("JSON leaked a temporary absolute path");
NODE

write_valid_product
ready_json="$(PATH="$fake_bin:$PATH" "$ROOT/tools/product-repository-authority" status --repo "$repo" --context product-improvement --json)"
node - "$ready_json" <<'NODE'
const data = JSON.parse(process.argv[2]);
function fail(message) {
  console.error(message);
  process.exit(1);
}
if (data.repository.status !== "ready") fail(`expected ready repository, got ${data.repository.status}`);
if (data.status !== "not_run") fail(`expected not_run authority before evidence, got ${data.status}`);
if (data.manifest_summary.required_missing.length !== 0) fail("valid product should not miss required structure");
if (data.product_summary.status !== "ready") fail(`expected ready product summary, got ${data.product_summary.status}`);
if (data.product_summary.display_name.ja !== "タスク管理表") fail("product summary did not preserve Japanese display name");
if (data.product_summary.source_path !== "ops/PRODUCT_PROFILE.json") fail("product summary did not use PRODUCT_PROFILE.json");
if (data.operation_mode.status !== "ready") fail(`expected ready operation mode, got ${data.operation_mode.status}`);
if (data.operation_mode.workflow_mode !== "parent_managed") fail("operation mode did not preserve parent_managed");
if (!data.evidence_summary.items.some((item) => item.source_id === "product.gates.evidence_index" && item.status === "not_run")) {
  fail("missing evidence index should be represented as not_run evidence");
}
for (const source of ["product.gates.tests", "product.ci.main", "product.security.secrets"]) {
  if (!data.evidence_summary.items.some((item) => item.source_id === source && item.status === "not_run" && item.required_in_context)) {
    fail(`missing required evidence ${source} was not represented as not_run`);
  }
}
if (!data.document_paths.some((item) => item.source_id === "product_docs.requirements" && item.resolved_source === "canonical")) {
  fail("canonical product requirements path was not resolved");
}
NODE

mv "$repo/ops/CI_MANIFEST.tsv" "$repo/ops/CI_MANIFEST.tsv.off"
missing_ci_manifest_json="$(PATH="$fake_bin:$PATH" "$ROOT/tools/product-repository-authority" status --repo "$repo" --context product-improvement --json)"
node - "$missing_ci_manifest_json" <<'NODE'
const data = JSON.parse(process.argv[2]);
function fail(message) {
  console.error(message);
  process.exit(1);
}
if (data.status !== "blocked") fail(`expected blocked authority when CI is required but CI manifest is missing, got ${data.status}`);
const item = data.evidence_summary.items.find((entry) => entry.source_id === "product.ci.evidence_manifest");
if (!item) fail("missing CI manifest evidence item was not emitted");
if (item.status !== "not_run" || item.freshness_state !== "not_collected" || !item.required_in_context) {
  fail(`missing CI manifest evidence item had the wrong state: ${JSON.stringify(item)}`);
}
const blocker = data.product_operation_blockers.find((entry) => entry.source === "product.ci.evidence_manifest");
if (!blocker || blocker.status !== "not_run") fail("missing CI manifest did not become a not_run blocker");
NODE
mv "$repo/ops/CI_MANIFEST.tsv.off" "$repo/ops/CI_MANIFEST.tsv"

printf '# Legacy Product Agent\n' >"$repo/AGENT.md"
legacy_agent_json="$(PATH="$fake_bin:$PATH" "$ROOT/tools/product-repository-authority" status --repo "$repo" --context product-improvement --json)"
node - "$legacy_agent_json" <<'NODE'
const data = JSON.parse(process.argv[2]);
function fail(message) {
  console.error(message);
  process.exit(1);
}
if (data.status !== "blocked") fail(`expected blocked status for legacy AGENT.md, got ${data.status}`);
if (data.operation_mode.legacy_agent_status !== "legacy_present") fail("legacy AGENT.md was not surfaced");
if (!data.product_operation_blockers.some((item) => item.source === "product_ops.operation_mode" && /AGENT\.md/.test(item.reason))) {
  fail("legacy AGENT.md operation-mode blocker is absent");
}
NODE
rm "$repo/AGENT.md"

rm -rf "$repo/docs/product" "$repo/docs/workflow" "$repo/docs/memory"
printf '# Requirements\n' >"$repo/REQUIREMENTS.md"
printf '# Specification\n' >"$repo/SPECIFICATION.md"
printf '# Implementation Plan\n' >"$repo/IMPLEMENTATION_PLAN.md"
printf '# Task Tracker\n' >"$repo/TASK_TRACKER.md"
printf '# Handoff\n' >"$repo/HANDOFF.md"
root_only_json="$(PATH="$fake_bin:$PATH" "$ROOT/tools/product-repository-authority" status --repo "$repo" --context product-improvement --json)"
node - "$root_only_json" <<'NODE'
const data = JSON.parse(process.argv[2]);
function fail(message) {
  console.error(message);
  process.exit(1);
}
if (data.status !== "blocked") fail(`expected blocked status for root-only product docs, got ${data.status}`);
const requirementPath = data.document_paths.find((item) => item.source_id === "product_docs.requirements");
if (!requirementPath || requirementPath.status !== "blocked" || requirementPath.resolved_source !== "root_duplicate") {
  fail("root-only product requirements path was not blocked as a root duplicate");
}
NODE

mkdir -p "$repo/docs/product" "$repo/docs/memory"
printf '# Canonical Requirements\n' >"$repo/docs/product/REQUIREMENTS.md"
conflict_json="$(PATH="$fake_bin:$PATH" "$ROOT/tools/product-repository-authority" status --repo "$repo" --context product-improvement --json)"
node - "$conflict_json" <<'NODE'
const data = JSON.parse(process.argv[2]);
function fail(message) {
  console.error(message);
  process.exit(1);
}
if (data.status !== "blocked") fail(`expected blocked status for canonical/root duplicate conflict, got ${data.status}`);
if (!data.manifest_summary.conflicts.includes("product_docs.requirements")) {
  fail("requirements root duplicate was not reported");
}
NODE

rm -f "$repo/REQUIREMENTS.md" "$repo/SPECIFICATION.md" "$repo/IMPLEMENTATION_PLAN.md" "$repo/TASK_TRACKER.md" "$repo/HANDOFF.md"
mkdir -p "$repo/docs/product" "$repo/docs/workflow" "$repo/docs/memory" "$repo/.git/product-gate-evidence"
write_product_local_runtime "$repo"
printf '# Requirements\n' >"$repo/docs/product/REQUIREMENTS.md"
printf '# Specification\n' >"$repo/docs/product/SPECIFICATION.md"
printf '# Implementation Plan\n' >"$repo/docs/product/IMPLEMENTATION_PLAN.md"
printf '# Task Tracker\n' >"$repo/docs/workflow/TASK_TRACKER.md"
printf '# Handoff\n' >"$repo/docs/workflow/HANDOFF.md"
cat >"$repo/.git/product-gate-evidence/index.tsv" <<'DOC'
# source_id	context	status	freshness_state	required_in_context	authority	observed_at	max_age_seconds	product_root	product_head	source_artifacts	blocked_by	next_command
product.git.sync	product-improvement	passed	current	true	authoritative	2026-06-07T00:00:00Z	3600	[external-product-repository]/product	none	ops/CI_MANIFEST.tsv		./tools/check_git_sync.sh --product --required
product.git.push	product-improvement	passed	current	true	authoritative	2026-06-07T00:00:00Z	3600	[external-product-repository]/product	none	git ahead=0;behind=0		git status -sb
product.git.pr	product-improvement	not_run	not_collected	false	manual_required	not_collected	0	[external-product-repository]/product	none	gh pr status	product.git.pr	gh pr status
product.git.merge	product-improvement	not_run	not_collected	false	manual_required	not_collected	0	[external-product-repository]/product	none	gh pr checks	product.git.merge	gh pr checks
DOC
evidence_json="$(PATH="$fake_bin:$PATH" "$ROOT/tools/product-repository-authority" status --repo "$repo" --context product-improvement --json)"
node - "$evidence_json" <<'NODE'
const data = JSON.parse(process.argv[2]);
function fail(message) {
  console.error(message);
  process.exit(1);
}
if (data.status !== "not_run") fail(`expected not_run authority when required evidence is missing, got ${data.status}`);
const item = data.evidence_summary.items.find((entry) => entry.source_id === "product.git.sync");
if (!item) fail("evidence item was not parsed");
if (item.product_root !== "[external-product-repository]/product") fail("evidence product_root was not preserved");
if (item.status !== "passed" || item.freshness_state !== "current" || item.detail_manifest_source !== "ops/EVIDENCE_DETAIL_MANIFEST.tsv" || item.risk_level !== "high") fail("evidence status/freshness/detail metadata was not preserved");
const push = data.evidence_summary.items.find((entry) => entry.source_id === "product.git.push");
if (!push || push.status !== "passed" || push.risk_level !== "high" || push.detail_manifest_source !== "ops/EVIDENCE_DETAIL_MANIFEST.tsv") {
  fail(`product.git.push detail metadata was not preserved: ${JSON.stringify(push)}`);
}
const pr = data.evidence_summary.items.find((entry) => entry.source_id === "product.git.pr");
if (!pr || pr.status !== "not_run" || pr.required_in_context !== false || pr.authority !== "manual_required" || pr.risk_level !== "high" || pr.detail_manifest_source !== "ops/EVIDENCE_DETAIL_MANIFEST.tsv") {
  fail(`product.git.pr detail metadata was not preserved: ${JSON.stringify(pr)}`);
}
const merge = data.evidence_summary.items.find((entry) => entry.source_id === "product.git.merge");
if (!merge || merge.status !== "not_run" || merge.required_in_context !== false || merge.authority !== "manual_required" || merge.risk_level !== "critical" || merge.detail_manifest_source !== "ops/EVIDENCE_DETAIL_MANIFEST.tsv") {
  fail(`product.git.merge detail metadata was not preserved: ${JSON.stringify(merge)}`);
}
for (const source of ["product.gates.tests", "product.ci.main", "product.security.secrets"]) {
  const missing = data.product_operation_blockers.find((entry) => entry.source === source);
  if (!missing || missing.status !== "not_run") fail(`missing required evidence ${source} did not block as not_run`);
}
NODE

cat >"$repo/.git/product-gate-evidence/index.tsv" <<'DOC'
# source_id	context	status	freshness_state	required_in_context	authority	observed_at	max_age_seconds	product_root	product_head	source_artifacts	blocked_by	next_command
product.gates.tests	product-improvement	passed	current	false	advisory	2026-06-07T00:00:00Z	3600	[external-product-repository]/product	none	ops/TEST_PLAN_MANIFEST.tsv		npm test
product.ci.main	product-improvement	passed	current	true	authoritative	2026-06-07T00:00:00Z	3600	[external-product-repository]/product	none	ops/CI_MANIFEST.tsv		./tools/check_ci_status.sh --product --required
product.security.secrets	product-improvement	passed	current	true	authoritative	2026-06-07T00:00:00Z	3600	[external-product-repository]/product	none	ops/SECURITY_MANIFEST.tsv		./tools/product-security gate
DOC
non_required_source_json="$(PATH="$fake_bin:$PATH" "$ROOT/tools/product-repository-authority" status --repo "$repo" --context product-improvement --json)"
node - "$non_required_source_json" <<'NODE'
const data = JSON.parse(process.argv[2]);
function fail(message) {
  console.error(message);
  process.exit(1);
}
if (data.status !== "not_run") fail(`expected not_run when matching source is not required_in_context, got ${data.status}`);
const blocker = data.product_operation_blockers.find((item) => item.source === "product.gates.tests");
if (!blocker || blocker.status !== "not_run") fail("non-required matching source must not satisfy required test evidence");
NODE

cat >"$repo/.git/product-gate-evidence/index.tsv" <<'DOC'
# source_id	context	status	freshness_state	required_in_context	authority	observed_at	max_age_seconds	product_root	product_head	source_artifacts	blocked_by	next_command
product.gates.tests	product-improvement	cached	current	true	advisory	2026-06-07T00:00:00Z	3600	[external-product-repository]/product	none	ops/TEST_PLAN_MANIFEST.tsv		npm test
product.ci.main	product-improvement	passed	current	true	authoritative	2026-06-07T00:00:00Z	3600	[external-product-repository]/product	none	ops/CI_MANIFEST.tsv		./tools/check_ci_status.sh --product --required
product.security.secrets	product-improvement	passed	current	true	authoritative	2026-06-07T00:00:00Z	3600	[external-product-repository]/product	none	ops/SECURITY_MANIFEST.tsv		./tools/product-security gate
DOC
cached_source_json="$(PATH="$fake_bin:$PATH" "$ROOT/tools/product-repository-authority" status --repo "$repo" --context product-improvement --json)"
node - "$cached_source_json" <<'NODE'
const data = JSON.parse(process.argv[2]);
function fail(message) {
  console.error(message);
  process.exit(1);
}
if (data.status !== "not_run") fail(`expected not_run when matching required source is cached, got ${data.status}`);
const blocker = data.product_operation_blockers.find((item) => item.source === "product.gates.tests");
if (!blocker || blocker.status !== "not_run") fail("cached matching source must not satisfy required test evidence");
NODE

cat >"$repo/.git/product-gate-evidence/index.tsv" <<'DOC'
# source_id	context	status	freshness_state	required_in_context	authority	observed_at	max_age_seconds	product_root	product_head	source_artifacts	blocked_by	next_command
product.gates.tests	product-improvement	passed	current	true	advisory	2026-06-07T00:00:00Z	3600	[external-product-repository]/product	none	ops/TEST_PLAN_MANIFEST.tsv		npm test
product.ci.main	product-improvement	passed	current	true	authoritative	2026-06-07T00:00:00Z	3600	[external-product-repository]/product	none	ops/CI_MANIFEST.tsv		./tools/check_ci_status.sh --product --required
product.security.secrets	product-improvement	passed	current	true	authoritative	2026-06-07T00:00:00Z	3600	[external-product-repository]/product	none	ops/SECURITY_MANIFEST.tsv		./tools/product-security gate
DOC
advisory_source_json="$(PATH="$fake_bin:$PATH" "$ROOT/tools/product-repository-authority" status --repo "$repo" --context product-improvement --json)"
node - "$advisory_source_json" <<'NODE'
const data = JSON.parse(process.argv[2]);
function fail(message) {
  console.error(message);
  process.exit(1);
}
if (data.status !== "not_run") fail(`expected not_run when matching required source is advisory, got ${data.status}`);
const blocker = data.product_operation_blockers.find((item) => item.source === "product.gates.tests");
if (!blocker || blocker.status !== "not_run") fail("advisory matching source must not satisfy required test evidence");
NODE

cat >"$repo/.git/product-gate-evidence/index.tsv" <<'DOC'
# source_id	context	status	freshness_state	required_in_context	authority	observed_at	max_age_seconds	product_root	product_head	source_artifacts	blocked_by	next_command
product.gates.tests	product-improvement	passed	current	true	authoritative	2026-06-07T00:00:00Z	3600	[external-product-repository]/product	none	ops/TEST_PLAN_MANIFEST.tsv		npm test
product.ci.main	product-improvement	passed	current	true	authoritative	2026-06-07T00:00:00Z	3600	[external-product-repository]/product	none	ops/CI_MANIFEST.tsv		./tools/check_ci_status.sh --product --required
product.ci.github_actions	product-improvement	passed	current	true	authoritative	2026-06-07T00:00:00Z	3600	[external-product-repository]/product	none	ops/CI_MANIFEST.tsv;.github/workflows		./tools/check_ci_status.sh --product --required
product.ci.pr	product-improvement	not_run	not_collected	false	manual_required	not_collected	0	[external-product-repository]/product	none	ops/CI_MANIFEST.tsv;source=pr-checks-not-observed	product.ci.pr	gh pr checks
product.security.secrets	product-improvement	passed	current	true	authoritative	2026-06-07T00:00:00Z	3600	[external-product-repository]/product	none	ops/SECURITY_MANIFEST.tsv		./tools/product-security gate
DOC
"$repo/tools/product-gate-evidence" record product.gates.tests product-improvement passed ops/TEST_PLAN_MANIFEST.tsv "npm test" 3600 >/dev/null
"$repo/tools/product-gate-evidence" structure-status product-improvement 3600 >/dev/null
"$repo/tools/product-gate-evidence" security-status product-improvement 3600 >/dev/null
complete_evidence_json="$(PATH="$fake_bin:$PATH" "$ROOT/tools/product-repository-authority" status --repo "$repo" --context product-improvement --json)"
node - "$complete_evidence_json" <<'NODE'
const data = JSON.parse(process.argv[2]);
function fail(message) {
  console.error(message);
  process.exit(1);
}
if (data.status !== "ready") fail(`expected ready authority with all required evidence, got ${data.status}`);
for (const source of ["product.gates.tests", "product.ci.main", "product.security.secrets"]) {
  if (!data.evidence_summary.items.some((item) => item.source_id === source && item.status === "passed" && item.freshness_state === "current")) {
    fail(`complete required evidence ${source} was not preserved`);
  }
  if (data.product_operation_blockers.some((item) => item.source === source)) {
    fail(`complete required evidence ${source} must not block product operations`);
  }
}
const testItem = data.evidence_summary.items.find((item) => item.source_id === "product.gates.tests");
if (!testItem.detail_manifest_source || testItem.detail_manifest_source !== "ops/EVIDENCE_DETAIL_MANIFEST.tsv") {
  fail("evidence detail manifest source was not attached");
}
if (!testItem.detail_artifact_path || !testItem.detail_artifact_path.includes(".git/product-gate-evidence/details/product.gates.tests/")) {
  fail("latest evidence detail artifact path was not attached");
}
if (!testItem.current_item_id || testItem.current_item_id === "product.gates.tests") {
  fail("detail artifact event id was not exposed as current_item_id");
}
if (!testItem.summary || !testItem.reason || !testItem.next_action) {
  fail("evidence detail summary, reason, and next_action were not exposed");
}
if (testItem.risk_level !== "high") fail(`expected high local-test risk level, got ${testItem.risk_level}`);
const ciItem = data.evidence_summary.items.find((item) => item.source_id === "product.ci.main");
if (!ciItem || ciItem.risk_level !== "critical") fail("CI evidence did not use the detail manifest risk level");
const ciProvider = data.evidence_summary.items.find((item) => item.source_id === "product.ci.github_actions");
if (!ciProvider || ciProvider.status !== "passed" || ciProvider.risk_level !== "critical" || ciProvider.detail_manifest_source !== "ops/EVIDENCE_DETAIL_MANIFEST.tsv") {
  fail(`GitHub Actions provider evidence did not use the detail manifest contract: ${JSON.stringify(ciProvider)}`);
}
const ciPr = data.evidence_summary.items.find((item) => item.source_id === "product.ci.pr");
if (!ciPr || ciPr.status !== "not_run" || ciPr.required_in_context !== false || ciPr.risk_level !== "critical" || ciPr.detail_manifest_source !== "ops/EVIDENCE_DETAIL_MANIFEST.tsv") {
  fail(`PR CI evidence did not use the detail manifest contract: ${JSON.stringify(ciPr)}`);
}
for (const sourceId of ["product.structure.files", "product.structure.settings", "product.structure.scripts"]) {
  const structureItem = data.evidence_summary.items.find((item) => item.source_id === sourceId);
  if (!structureItem) fail(`${sourceId} evidence was not preserved`);
  if (structureItem.status !== "passed" || structureItem.risk_level !== "high") {
    fail(`${sourceId} did not use the detail manifest contract: ${JSON.stringify(structureItem)}`);
  }
  if (!structureItem.detail_artifact_path || !structureItem.detail_artifact_path.includes(`.git/product-gate-evidence/details/${sourceId}/`)) {
    fail(`${sourceId} detail artifact path was not attached`);
  }
}
const securityExpectations = new Map([
  ["product.security.secrets", { status: "passed", required: true, risk: "critical" }],
  ["product.security.local_artifacts", { status: "passed", required: true, risk: "high" }],
  ["product.security.external_sending", { status: "not_applicable", required: false, risk: "critical" }],
  ["product.security.blockers", { status: "passed", required: true, risk: "critical" }],
]);
for (const [sourceId, expected] of securityExpectations) {
  const securityItem = data.evidence_summary.items.find((item) => item.source_id === sourceId);
  if (!securityItem) fail(`${sourceId} evidence was not preserved`);
  if (securityItem.status !== expected.status || securityItem.required_in_context !== expected.required || securityItem.risk_level !== expected.risk || securityItem.detail_manifest_source !== "ops/EVIDENCE_DETAIL_MANIFEST.tsv") {
    fail(`${sourceId} did not use the detail manifest contract: ${JSON.stringify(securityItem)}`);
  }
  if (!securityItem.detail_artifact_path || !securityItem.detail_artifact_path.includes(`.git/product-gate-evidence/details/${sourceId}/`)) {
    fail(`${sourceId} detail artifact path was not attached`);
  }
}
NODE

cat >"$repo/.git/product-gate-evidence/index.tsv" <<'DOC'
# source_id	context	status	freshness_state	required_in_context	authority	observed_at	max_age_seconds	product_root	product_head	source_artifacts	blocked_by	next_command
product.gates.tests	product-improvement	passed	current	true	authoritative	2026-06-07T00:00:00Z	10	[external-product-repository]/product	none	ops/TEST_PLAN_MANIFEST.tsv		npm test
product.ci.main	product-improvement	passed	current	true	authoritative	2026-06-07T00:00:00Z	3600	[external-product-repository]/product	none	ops/CI_MANIFEST.tsv		./tools/check_ci_status.sh --product --required
product.security.secrets	product-improvement	passed	current	true	authoritative	2026-06-07T00:00:00Z	3600	[external-product-repository]/product	none	ops/SECURITY_MANIFEST.tsv		./tools/product-security gate
DOC
time_stale_json="$(PATH="$fake_bin:$PATH" "$ROOT/tools/product-repository-authority" status --repo "$repo" --context product-improvement --json)"
node - "$time_stale_json" <<'NODE'
const data = JSON.parse(process.argv[2]);
function fail(message) {
  console.error(message);
  process.exit(1);
}
if (data.status !== "stale") fail(`expected stale authority when evidence max_age_seconds expires, got ${data.status}`);
const item = data.evidence_summary.items.find((entry) => entry.source_id === "product.gates.tests");
if (!item || item.status !== "stale" || item.freshness_state !== "stale" || item.authority !== "manual_required") {
  fail("max_age_seconds expiry was not reflected on product.gates.tests");
}
if (!/product\.evidence\.age/.test(item.blocked_by)) fail("time stale evidence did not record product.evidence.age blocker");
const blocker = data.product_operation_blockers.find((entry) => entry.source === "product.gates.tests");
if (!blocker || blocker.status !== "stale") fail("time stale evidence did not become a stale blocker");
NODE

git -C "$repo" add AGENTS.MD README.md .gitignore docs ops skills tools src tests
git -C "$repo" commit -m "Record product authority fixture" >/dev/null
old_head="$(git -C "$repo" rev-parse HEAD)"
printf 'changed after evidence\n' >>"$repo/README.md"
git -C "$repo" add README.md
git -C "$repo" commit -m "Advance product fixture head" >/dev/null
cat >"$repo/.git/product-gate-evidence/index.tsv" <<DOC
# source_id	context	status	freshness_state	required_in_context	authority	observed_at	max_age_seconds	product_root	product_head	source_artifacts	blocked_by	next_command
product.gates.tests	product-improvement	passed	current	true	authoritative	2026-06-07T00:00:00Z	3600	[external-product-repository]/product	$old_head	ops/TEST_PLAN_MANIFEST.tsv		npm test
product.ci.main	product-improvement	passed	current	true	authoritative	2026-06-07T00:00:00Z	3600	[external-product-repository]/product	$old_head	ops/CI_MANIFEST.tsv		./tools/check_ci_status.sh --product --required
product.security.secrets	product-improvement	passed	current	true	authoritative	2026-06-07T00:00:00Z	3600	[external-product-repository]/product	$old_head	ops/SECURITY_MANIFEST.tsv		./tools/product-security gate
DOC
stale_head_json="$(PATH="$fake_bin:$PATH" "$ROOT/tools/product-repository-authority" status --repo "$repo" --context product-improvement --json)"
node - "$stale_head_json" <<'NODE'
const data = JSON.parse(process.argv[2]);
function fail(message) {
  console.error(message);
  process.exit(1);
}
if (data.status !== "stale") fail(`expected stale authority when evidence product_head is stale, got ${data.status}`);
for (const source of ["product.gates.tests", "product.ci.main", "product.security.secrets"]) {
  const item = data.evidence_summary.items.find((entry) => entry.source_id === source);
  if (!item || item.status !== "stale" || item.freshness_state !== "stale" || item.authority !== "manual_required") {
    fail(`stale product_head was not reflected on ${source}`);
  }
  const blocker = data.product_operation_blockers.find((entry) => entry.source === source);
  if (!blocker || blocker.status !== "stale") fail(`stale product_head did not block ${source}`);
}
NODE

cat >"$repo/.git/product-gate-evidence/index.tsv" <<'DOC'
# source_id	context	status	freshness_state	required_in_context	authority	observed_at	max_age_seconds	product_root	product_head	source_artifacts	blocked_by	next_command
product.git.sync	product-improvement	passed	current	true	authoritative	2026-06-07T00:00:00Z	3600	[external-product-repository]/product	none	ops/CI_MANIFEST.tsv		./tools/check_git_sync.sh --product --required
product.ci.main	product-improvement	failed	current	true	authoritative	2026-06-07T00:00:00Z	3600	[external-product-repository]/product	none	ops/CI_MANIFEST.tsv	product.git.sync	./tools/check_ci_status.sh --product --required
product.security.review	product-improvement	stale	stale	true	manual_required	2026-06-01T00:00:00Z	3600	[external-product-repository]/product	none	ops/SECURITY_MANIFEST.tsv		./tools/product-security gate
product.docs.optional	product-improvement	not_run	not_collected	false	advisory	not_collected	0	[external-product-repository]/product	none	docs/product/REQUIREMENTS.md		./tools/product-repository-authority status --json
DOC
failed_evidence_json="$(PATH="$fake_bin:$PATH" "$ROOT/tools/product-repository-authority" status --repo "$repo" --context product-improvement --json)"
node - "$failed_evidence_json" <<'NODE'
const data = JSON.parse(process.argv[2]);
function fail(message) {
  console.error(message);
  process.exit(1);
}
if (data.status !== "blocked") fail(`expected blocked authority with failed evidence, got ${data.status}`);
if (data.repository.blocker_scope !== "product_operations") fail(`expected product_operations blocker scope, got ${data.repository.blocker_scope}`);
const failed = data.product_operation_blockers.find((item) => item.source === "product.ci.main");
if (!failed || failed.status !== "failed") fail("failed required evidence was not promoted to a product-operation blocker");
const stale = data.product_operation_blockers.find((item) => item.source === "product.security.review");
if (!stale || stale.status !== "stale") fail("stale required evidence was not promoted to a product-operation blocker");
if (data.product_operation_blockers.some((item) => item.source === "product.docs.optional")) {
  fail("optional not_run evidence must not block product operations");
}
NODE

cat >"$repo/.git/product-gate-evidence/index.tsv" <<'DOC'
# source_id	context	status	freshness_state	required_in_context	authority	observed_at	max_age_seconds	product_root	product_head	source_artifacts	blocked_by	next_command
product.git.sync	free-development	passed	current	true	authoritative	2026-06-07T00:00:00Z	3600	[external-product-repository]/product	none	ops/STAGE_MANIFEST.tsv		./tools/check_git_sync.sh --product --required
DOC
context_gap_json="$(PATH="$fake_bin:$PATH" "$ROOT/tools/product-repository-authority" status --repo "$repo" --context product-improvement --json)"
node - "$context_gap_json" <<'NODE'
const data = JSON.parse(process.argv[2]);
function fail(message) {
  console.error(message);
  process.exit(1);
}
if (data.status !== "not_run") fail(`expected not_run authority when no evidence matches context, got ${data.status}`);
if (!data.evidence_summary.items.some((item) => item.source_id === "product.gates.evidence_context" && item.required_in_context)) {
  fail("missing context evidence fallback was not emitted");
}
if (!data.product_operation_blockers.some((item) => item.source === "product.gates.evidence_context" && item.status === "not_run")) {
  fail("missing context evidence did not become a not_run blocker");
}
NODE

cat >"$repo/ops/TEST_PLAN_MANIFEST.tsv" <<'DOC'
# test_id	required_mode	contexts	product_types	command_id	evidence_source	dashboard_group	description
unit	required	all	all	npm_test	product.gates.tests	workflow	Unit test.
integration	required	all	all	npm_integration	product.gates.tests	workflow	Integration test.
DOC
cat >"$repo/.git/product-gate-evidence/index.tsv" <<'DOC'
# source_id	context	status	freshness_state	required_in_context	authority	observed_at	max_age_seconds	product_root	product_head	source_artifacts	blocked_by	next_command
product.ci.main	product-improvement	passed	current	true	authoritative	2026-06-07T00:00:00Z	3600	[external-product-repository]/product	none	ops/CI_MANIFEST.tsv		./tools/check_ci_status.sh --product --required
product.security.secrets	product-improvement	passed	current	true	authoritative	2026-06-07T00:00:00Z	3600	[external-product-repository]/product	none	ops/SECURITY_MANIFEST.tsv		./tools/product-security gate
DOC
duplicate_evidence_source_json="$(PATH="$fake_bin:$PATH" "$ROOT/tools/product-repository-authority" status --repo "$repo" --context product-improvement --json)"
node - "$duplicate_evidence_source_json" <<'NODE'
const data = JSON.parse(process.argv[2]);
function fail(message) {
  console.error(message);
  process.exit(1);
}
const blockers = data.product_operation_blockers.filter((item) => item.source === "product.gates.tests");
if (blockers.length !== 1) fail(`duplicate required evidence source must produce one blocker, got ${blockers.length}`);
if (blockers[0].status !== "not_run") fail(`duplicate required evidence blocker must stay not_run, got ${blockers[0].status}`);
NODE

cat >"$repo/ops/TEST_PLAN_MANIFEST.tsv" <<'DOC'
# test_id	required_mode	contexts	product_types	command_id	evidence_source	dashboard_group	description
unit	required	all	all	npm_test	invalid.gates.tests	workflow	Unit test.
DOC
cat >"$repo/.git/product-gate-evidence/index.tsv" <<'DOC'
# source_id	context	status	freshness_state	required_in_context	authority	observed_at	max_age_seconds	product_root	product_head	source_artifacts	blocked_by	next_command
product.ci.main	product-improvement	passed	current	true	authoritative	2026-06-07T00:00:00Z	3600	[external-product-repository]/product	none	ops/CI_MANIFEST.tsv		./tools/check_ci_status.sh --product --required
product.security.secrets	product-improvement	passed	current	true	authoritative	2026-06-07T00:00:00Z	3600	[external-product-repository]/product	none	ops/SECURITY_MANIFEST.tsv		./tools/product-security gate
DOC
invalid_manifest_source_json="$(PATH="$fake_bin:$PATH" "$ROOT/tools/product-repository-authority" status --repo "$repo" --context product-improvement --json)"
node - "$invalid_manifest_source_json" <<'NODE'
const data = JSON.parse(process.argv[2]);
function fail(message) {
  console.error(message);
  process.exit(1);
}
if (data.status !== "blocked") fail(`expected blocked for invalid required evidence source, got ${data.status}`);
const blocker = data.product_operation_blockers.find((item) => item.source === "product.gates.evidence_manifest");
if (!blocker || blocker.status !== "blocked") fail("invalid required evidence source must become a manifest blocker");
NODE

printf 'Product repository authority tests passed.\n'
