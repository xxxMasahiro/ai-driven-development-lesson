#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT
export PRODUCT_REPOSITORY_REGISTRY_FILE="$tmp/EMPTY_PRODUCT_REPOSITORY_REGISTRY.tsv"
export PRODUCT_REPOSITORY_SELECTION_FILE="$tmp/EMPTY_PRODUCT_REPOSITORY_SELECTION.tsv"

project_root="$tmp/projects"
product_name="sample-product"
product_repo="$project_root/$product_name"
origin="$tmp/origin.git"
config="$tmp/LESSON_CONFIG.tsv"
fake_bin="$tmp/bin"

mkdir -p "$project_root" "$fake_bin"
export PRODUCT_REPOSITORY_AUTHORITY_NOW="2026-06-02T00:30:00Z"

cat > "$config" <<CONFIG
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

cat > "$tmp/LESSON_MODE.tsv" <<'DOC'
# selected_at	mode	description
2026-06-02 00:00:00	A	じっくり説明
DOC
cat > "$tmp/WORKFLOW_DISPLAY_LANGUAGE.tsv" <<'DOC'
# selected_at	code	label
2026-06-02 00:00:00	ja	日本語
DOC
cat > "$tmp/PRODUCT_DEVELOPMENT_LANGUAGE.tsv" <<'DOC'
# selected_at	code	label
2026-06-02 00:00:00	ja	日本語
DOC

git -c init.defaultBranch=main init --bare "$origin" >/dev/null
git -c init.defaultBranch=main init "$product_repo" >/dev/null
git -C "$product_repo" config user.name "Lesson Test"
git -C "$product_repo" config user.email "lesson-test@example.com"
mkdir -p "$product_repo/docs/product" "$product_repo/docs/workflow" "$product_repo/docs/memory" "$product_repo/docs/design-system" "$product_repo/ops" "$product_repo/src" "$product_repo/tests"
mkdir -p "$product_repo/.github/workflows"
mkdir -p "$product_repo/skills/product-development-workflow" "$product_repo/skills/product-doc-sync" "$product_repo/skills/product-security" "$product_repo/skills/product-test" "$product_repo/skills/product-design-system" "$product_repo/tools/lib"
printf '# Product Agents\n' > "$product_repo/AGENTS.MD"
printf '# Sample Product\n' > "$product_repo/README.md"
cat > "$product_repo/.gitignore" <<'DOC'
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
cat > "$product_repo/docs/product/REQUIREMENTS.md" <<'DOC'
# REQUIREMENTS.md

## Purpose

Provide a sample product for gate testing.
DOC
cat > "$product_repo/docs/product/SPECIFICATION.md" <<'DOC'
# SPECIFICATION.md

## Behavior

The sample product supports gate testing.
DOC
cat > "$product_repo/docs/product/IMPLEMENTATION_PLAN.md" <<'DOC'
# IMPLEMENTATION_PLAN.md

## Plan

Use the sample product to verify lesson gates.
DOC
cat > "$product_repo/docs/workflow/TASK_TRACKER.md" <<'DOC'
# TASK_TRACKER.md

## Current Status

Sample product is ready for gate testing.

## Remaining Work

- Continue the sample workflow.

HANDOFF
DOC
cat > "$product_repo/docs/workflow/HANDOFF.md" <<'DOC'
# HANDOFF.md

## Current State

Sample product is ready for gate testing.

## Next Step

- Continue the sample workflow.

TASK_TRACKER
DOC
cat > "$product_repo/docs/memory/README.md" <<'DOC'
# Product Memory

Optional product memory files live here when the workflow needs them.
DOC
cat > "$product_repo/docs/workflow/SECURITY.md" <<'DOC'
# Product Security

Do not commit secrets, tokens, private keys, or credential-bearing env files.
DOC
cat > "$product_repo/docs/workflow/VERIFICATION.md" <<'DOC'
# Product Verification

Use ops/TEST_PLAN_MANIFEST.tsv to map product test ids to local commands and evidence.
DOC
cat > "$product_repo/docs/design-system/DESIGN_SYSTEM.md" <<'DOC'
# Product Design System

This file is the product-local design-system source of truth.
DOC
cat > "$product_repo/docs/design-system/tokens.json" <<'DOC'
{
  "schema_version": "1.0.0",
  "name": "sample-product",
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
cat > "$product_repo/docs/design-system/components.json" <<'DOC'
{
  "schema_version": "1.0.0",
  "name": "sample-product",
  "components": [
    {
      "id": "button",
      "tokens": ["accent"],
      "contract": ["Use product-local tokens."]
    }
  ]
}
DOC
cat > "$product_repo/index.html" <<'DOC'
<!doctype html>
<html lang="en">
  <body>
    <main id="app"></main>
    <script src="src/app.js"></script>
  </body>
</html>
DOC
printf 'document.querySelector("#app").textContent = "Sample product";\n' > "$product_repo/src/app.js"
printf 'test("sample product", () => true);\n' > "$product_repo/tests/app.test.js"
cat > "$product_repo/.github/workflows/ci.yml" <<'DOC'
name: CI

on:
  push:
  pull_request:

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm test
DOC
cat > "$product_repo/ops/STAGE_MANIFEST.tsv" <<'DOC'
# stage_id	required_mode	contexts	product_types	dashboard_group	description
build	required	all	all	workflow	Build stage.
DOC
cat > "$product_repo/ops/TEST_PLAN_MANIFEST.tsv" <<'DOC'
# test_id	required_mode	contexts	product_types	command_id	evidence_source	dashboard_group	description
unit	required	all	all	npm_test	product.gates.tests	workflow	Unit test.
smoke	contextual	all	all	npm_smoke	product.gates.tests	workflow	Smoke test.
e2e	contextual	all	all	npm_e2e	product.gates.tests	workflow	End-to-end test.
DOC
cat > "$product_repo/ops/CI_MANIFEST.tsv" <<'DOC'
# ci_id	required_mode	contexts	workflow_file	workflow_name	branch_policy	evidence_source	description
main	contextual	product-improvement|external-integration	.github/workflows/ci.yml	CI	main	product.ci.main	Main CI.
DOC
cat > "$product_repo/ops/SECURITY_MANIFEST.tsv" <<'DOC'
# security_id	required_mode	contexts	policy_source	evidence_source	dashboard_group	description
secrets	required	all	docs/workflow/SECURITY.md	product.security.secrets	security	Secret scan.
DOC
cat > "$product_repo/ops/DESIGN_SYSTEM_MANIFEST.tsv" <<'DOC'
# design_id	required_mode	contexts	source_path	generated_path	check_command	description
product-design-system	required	all	docs/design-system/DESIGN_SYSTEM.md	none	tools/check_product_design_system.sh	Product-local design-system source and check.
DOC
cat > "$product_repo/ops/INTEGRATION_MANIFEST.tsv" <<'DOC'
# integration_id	required_mode	contexts	service_kind	approval_source	security_source	dashboard_group	description
calendar	contextual	external-integration	calendar	EXTERNAL_INTEGRATION_SECURITY.md	ops/SECURITY_MANIFEST.tsv	workflow	Calendar integration.
DOC
cat > "$product_repo/ops/DASHBOARD_MANIFEST.tsv" <<'DOC'
# surface_id	required_mode	contexts	source_id	label_key	dashboard_group	description
overview	required	all	product.overview	overview	overview	Product overview.
DOC
cat > "$product_repo/ops/PRODUCT_MANIFEST.tsv" <<'DOC'
# authority_id	required_mode	contexts	product_types	path	path_role	validation_rule	dashboard_group	description
product.entrypoint	required	all	all	index.html	entrypoint	file_exists	workflow	Browser entrypoint.
product.source	required	all	all	src/app.js	source	file_nonempty	workflow	Application source authority.
product.test	required	all	all	tests/app.test.js	test	file_nonempty	workflow	Test authority.
DOC
cat > "$product_repo/ops/PRODUCT_PROFILE.json" <<'DOC'
{
  "schema_version": "1.0.0",
  "profile_kind": "product_display_profile",
  "menu_id": "free-development",
  "profile_scope": "product",
  "display_name": {
    "ja": "サンプル成果物",
    "en": "Sample Product"
  },
  "description": {
    "ja": "検査用の成果物です。",
    "en": "A product used by product gate checks."
  },
  "source": "learner_confirmed",
  "confirmed_at": "2026-06-05T00:00:00Z",
  "source_documents": [
    "docs/product/REQUIREMENTS.md"
  ]
}
DOC
cat > "$product_repo/ops/REPOSITORY_INDEX.json" <<'DOC'
{
  "schema_version": "1.0.0",
  "root_name": "sample-product",
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
cat > "$product_repo/ops/PRODUCT_OPERATION_MODE.tsv" <<'DOC'
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
  cat > "$product_repo/skills/$skill/SKILL.md" <<DOC
---
name: $skill
description: Product-local $skill guidance.
---

# $skill

Use this product-local skill inside this product repository.
DOC
done
for tool in product-gate check_product_structure.sh check_product_docs.sh check_product_security.sh check_product_design_system.sh test_product_repository.sh product-mode npm_test npm_smoke npm_e2e; do
  cat > "$product_repo/tools/$tool" <<DOC
#!/usr/bin/env bash
set -euo pipefail
printf '%s passed\n' "$tool"
DOC
  chmod +x "$product_repo/tools/$tool"
done
cat > "$product_repo/tools/lib/product_common.sh" <<'DOC'
#!/usr/bin/env bash
product_repo_root() {
  cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd
}
DOC
"$ROOT/tools/product-gate-evidence-bootstrap" install --repo "$product_repo" --confirm >/dev/null
context_registry="$tmp/PRODUCT_REPOSITORY_REGISTRY.tsv"
context_selection="$tmp/PRODUCT_REPOSITORY_SELECTION.tsv"
cat > "$context_registry" <<REGISTRY
# repo_id	primary_menu_id	allowed_contexts	display_name	repository_path	product_type	source
sample-product	free-development	free-development	Sample Product	$product_repo	all	test
REGISTRY
cat > "$context_selection" <<'SELECTION'
# menu_id	repo_id	selected_at	source
free-development	sample-product	2026-06-02T00:00:00Z	test
SELECTION
PRODUCT_REPOSITORY_REGISTRY_FILE="$context_registry" \
PRODUCT_REPOSITORY_SELECTION_FILE="$context_selection" \
  "$ROOT/tools/product-gate-evidence-bootstrap" status --context free-development \
  | grep 'ready: tools/product-gate-evidence' >/dev/null
PRODUCT_REPOSITORY_REGISTRY_FILE="$context_registry" \
PRODUCT_REPOSITORY_SELECTION_FILE="$context_selection" \
  "$ROOT/tools/product-gate-evidence-bootstrap" install --context free-development --confirm --force >/dev/null
PRODUCT_REPOSITORY_REGISTRY_FILE="$context_registry" \
PRODUCT_REPOSITORY_SELECTION_FILE="$context_selection" \
  "$ROOT/tools/product-gate-evidence-bootstrap" status --context product-improvement \
  >/tmp/product-gate-evidence-bootstrap-unselected-context.out 2>&1 && exit 1 || true
grep 'No repository selected for product-improvement' /tmp/product-gate-evidence-bootstrap-unselected-context.out >/dev/null

no_target_registry="$tmp/PRODUCT_REPOSITORY_REGISTRY_NO_TARGET.tsv"
no_target_selection="$tmp/PRODUCT_REPOSITORY_SELECTION_NO_TARGET.tsv"
cat > "$no_target_registry" <<REGISTRY
# repo_id	primary_menu_id	allowed_contexts	display_name	repository_path	product_type	source
sample-product	free-development	free-development	Sample Product	$product_repo	all	test
REGISTRY
cat > "$no_target_selection" <<'SELECTION'
# menu_id	repo_id	selected_at	source
free-development	sample-product	2026-06-02T00:00:00Z	test
SELECTION
for no_target_context in product-improvement external-integration; do
  PRODUCT_REPOSITORY_REGISTRY_FILE="$no_target_registry" \
  PRODUCT_REPOSITORY_SELECTION_FILE="$no_target_selection" \
  LESSON_CONFIG="$config" \
    "$ROOT/tools/$no_target_context" status \
    | grep 'Product repository: not_selected' >/dev/null
  PRODUCT_REPOSITORY_REGISTRY_FILE="$no_target_registry" \
  PRODUCT_REPOSITORY_SELECTION_FILE="$no_target_selection" \
  LESSON_CONFIG="$config" \
    "$ROOT/tools/$no_target_context" gate \
    >"/tmp/$no_target_context-no-target.out" 2>&1 && exit 1 || true
  grep "no external product repository is selected for $no_target_context" "/tmp/$no_target_context-no-target.out" >/dev/null
done
mkdir -p "$product_repo/.git/product-gate-evidence"
cat > "$product_repo/.git/product-gate-evidence/index.tsv" <<'DOC'
# source_id	context	status	freshness_state	required_in_context	authority	observed_at	max_age_seconds	product_root	product_head	source_artifacts	blocked_by	next_command
product.gates.smoke	all	passed	current	true	authoritative	2026-06-02T00:00:00Z	3600	[external-product-repository]/sample-product	none	ops/PRODUCT_MANIFEST.tsv		./tools/product-repository-authority status --json
product.gates.tests	all	passed	current	true	authoritative	2026-06-02T00:00:00Z	3600	[external-product-repository]/sample-product	none	ops/TEST_PLAN_MANIFEST.tsv		npm test
product.ci.main	all	passed	current	true	authoritative	2026-06-02T00:00:00Z	3600	[external-product-repository]/sample-product	none	ops/CI_MANIFEST.tsv		./tools/check_ci_status.sh --product --required
product.security.secrets	all	passed	current	true	authoritative	2026-06-02T00:00:00Z	3600	[external-product-repository]/sample-product	none	ops/SECURITY_MANIFEST.tsv		./tools/product-security gate
DOC
cat > "$product_repo/EXTERNAL_INTEGRATION_SECURITY.md" <<'DOC'
# EXTERNAL_INTEGRATION_SECURITY.md

- Connected service: test calendar
- Data sent: task title only
- Data received: event identifier
- Write behavior: create test event only
- OAuth scopes: calendar.events
- Token storage: local environment variable
- Redirect URI: local test redirect
- Token refresh: documented
- Token revoke: documented
- Webhook signature: not used
- Rate limits: documented
- Sandbox: test account
- Prohibited log output: tokens and private event details
- Rollback: disable integration and revoke token
DOC
git -C "$product_repo" add AGENTS.MD README.md .gitignore .github docs ops skills tools src tests index.html EXTERNAL_INTEGRATION_SECURITY.md
git -C "$product_repo" commit -m "Initial sample product" >/dev/null
git -C "$product_repo" remote add origin "$origin"
git -C "$product_repo" push -u origin main >/dev/null

cat > "$fake_bin/gh" <<'GH'
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
    printf 'completed\tsuccess\tCI\tCI\tmain\t1\t0\t1s\t2026-06-02T00:00:00Z\n'
    exit 0
    ;;
  run)
    if [[ "${2:-}" == "list" ]]; then
      if [[ " $* " == *" --json "* ]]; then
        head_sha="$(git rev-parse HEAD 2>/dev/null || printf 'deadbeef')"
        printf '[{"status":"completed","conclusion":"success","workflowName":"CI","event":"push","headSha":"%s","createdAt":"2026-06-02T00:00:00Z","url":"https://example.invalid/actions/runs/1","databaseId":1,"headBranch":"main"}]\n' "$head_sha"
        exit 0
      fi
      printf 'completed\tsuccess\tCI\tCI\tmain\t1\t0\t1s\t2026-06-02T00:00:00Z\n'
      exit 0
    fi
    ;;
  pr)
    if [[ "${2:-}" == "view" ]]; then
      head_sha="$(git rev-parse HEAD 2>/dev/null || printf 'deadbeef')"
      printf '{"number":12,"url":"https://example.invalid/pull/12","state":"OPEN","mergeStateStatus":"CLEAN","headRefOid":"%s","statusCheckRollup":[{"name":"CI","status":"COMPLETED","conclusion":"SUCCESS","workflowName":"CI","detailsUrl":"https://example.invalid/actions/runs/1"}]}\n' "$head_sha"
      exit 0
    fi
    ;;
  repo)
    if [[ "${2:-}" == "view" ]]; then
      printf 'xxxMasahiro/sample-product\n'
      exit 0
    fi
    ;;
esac

printf 'unsupported fake gh command: %s\n' "$*" >&2
exit 1
GH
chmod +x "$fake_bin/gh"

"$product_repo/tools/product-gate-evidence" manifest-tests free-development 3600 all >/dev/null
awk -F '\t' '$1 == "product.tests.unit" && $2 == "free-development" && $3 == "passed" && $4 == "current" && $6 == "authoritative" { found = 1 } END { exit found ? 0 : 1 }' \
  "$product_repo/.git/product-gate-evidence/index.tsv"
awk -F '\t' '$1 == "product.tests.smoke" && $2 == "free-development" && $3 == "passed" && $4 == "current" && $6 == "authoritative" { found = 1 } END { exit found ? 0 : 1 }' \
  "$product_repo/.git/product-gate-evidence/index.tsv"
awk -F '\t' '$1 == "product.tests.e2e" && $2 == "free-development" && $3 == "passed" && $4 == "current" && $6 == "authoritative" { found = 1 } END { exit found ? 0 : 1 }' \
  "$product_repo/.git/product-gate-evidence/index.tsv"
"$product_repo/tools/product-gate-evidence" structure-status free-development 3600 >/dev/null
awk -F '\t' '$1 == "product.structure.files" && $2 == "free-development" && $3 == "passed" && $4 == "current" && $6 == "authoritative" { found = 1 } END { exit found ? 0 : 1 }' \
  "$product_repo/.git/product-gate-evidence/index.tsv"
awk -F '\t' '$1 == "product.structure.settings" && $2 == "free-development" && $3 == "passed" && $4 == "current" && $6 == "authoritative" { found = 1 } END { exit found ? 0 : 1 }' \
  "$product_repo/.git/product-gate-evidence/index.tsv"
awk -F '\t' '$1 == "product.structure.scripts" && $2 == "free-development" && $3 == "passed" && $4 == "current" && $6 == "authoritative" { found = 1 } END { exit found ? 0 : 1 }' \
  "$product_repo/.git/product-gate-evidence/index.tsv"
"$product_repo/tools/product-gate-evidence" git-status product-improvement 300 >/dev/null
awk -F '\t' '$1 == "product.git.sync" && $2 == "product-improvement" && $3 == "passed" && $5 == "true" && $6 == "authoritative" { found = 1 } END { exit found ? 0 : 1 }' \
  "$product_repo/.git/product-gate-evidence/index.tsv"
awk -F '\t' '$1 == "product.git.push" && $2 == "product-improvement" && $3 == "passed" && $5 == "true" && $6 == "authoritative" { found = 1 } END { exit found ? 0 : 1 }' \
  "$product_repo/.git/product-gate-evidence/index.tsv"
awk -F '\t' '$1 == "product.git.pr" && $2 == "product-improvement" && $3 == "not_run" && $5 == "false" && $6 == "manual_required" { found = 1 } END { exit found ? 0 : 1 }' \
  "$product_repo/.git/product-gate-evidence/index.tsv"
awk -F '\t' '$1 == "product.git.merge" && $2 == "product-improvement" && $3 == "not_run" && $5 == "false" && $6 == "manual_required" { found = 1 } END { exit found ? 0 : 1 }' \
  "$product_repo/.git/product-gate-evidence/index.tsv"
"$product_repo/tools/product-gate-evidence" ci-status product-improvement 3600 >/dev/null
awk -F '\t' '$1 == "product.ci.github_actions" && $2 == "product-improvement" && $3 == "passed" && $5 == "true" && $6 == "authoritative" { found = 1 } END { exit found ? 0 : 1 }' \
  "$product_repo/.git/product-gate-evidence/index.tsv"
awk -F '\t' '$1 == "product.ci.main" && $2 == "all" && $3 == "passed" && $5 == "true" && $6 == "authoritative" { found = 1 } END { exit found ? 0 : 1 }' \
  "$product_repo/.git/product-gate-evidence/index.tsv"
awk -F '\t' '$1 == "product.ci.pr" && $2 == "product-improvement" && $3 == "not_run" && $5 == "false" && $6 == "manual_required" { found = 1 } END { exit found ? 0 : 1 }' \
  "$product_repo/.git/product-gate-evidence/index.tsv"
PATH="$fake_bin:$PATH" "$product_repo/tools/product-gate-evidence" ci-runs product-improvement 3600 --pr 12 >/dev/null
awk -F '\t' '$1 == "product.ci.github_actions" && $2 == "product-improvement" && $3 == "passed" && $5 == "true" && $6 == "authoritative" { found = 1 } END { exit found ? 0 : 1 }' \
  "$product_repo/.git/product-gate-evidence/index.tsv"
awk -F '\t' '$1 == "product.ci.main" && $2 == "product-improvement" && $3 == "passed" && $5 == "true" && $6 == "authoritative" { found = 1 } END { exit found ? 0 : 1 }' \
  "$product_repo/.git/product-gate-evidence/index.tsv"
awk -F '\t' '$1 == "product.ci.pr" && $2 == "product-improvement" && $3 == "passed" && $5 == "true" && $6 == "authoritative" { found = 1 } END { exit found ? 0 : 1 }' \
  "$product_repo/.git/product-gate-evidence/index.tsv"
"$product_repo/tools/product-gate-evidence" security-status external-integration 3600 >/dev/null
awk -F '\t' '$1 == "product.security.secrets" && $2 == "external-integration" && $3 == "passed" && $5 == "true" && $6 == "authoritative" { found = 1 } END { exit found ? 0 : 1 }' \
  "$product_repo/.git/product-gate-evidence/index.tsv"
awk -F '\t' '$1 == "product.security.local_artifacts" && $2 == "external-integration" && $3 == "passed" && $5 == "true" && $6 == "authoritative" { found = 1 } END { exit found ? 0 : 1 }' \
  "$product_repo/.git/product-gate-evidence/index.tsv"
awk -F '\t' '$1 == "product.security.external_sending" && $2 == "external-integration" && $3 == "passed" && $5 == "true" && $6 == "authoritative" { found = 1 } END { exit found ? 0 : 1 }' \
  "$product_repo/.git/product-gate-evidence/index.tsv"
awk -F '\t' '$1 == "product.security.blockers" && $2 == "external-integration" && $3 == "passed" && $5 == "true" && $6 == "authoritative" { found = 1 } END { exit found ? 0 : 1 }' \
  "$product_repo/.git/product-gate-evidence/index.tsv"
PRODUCT_REPOSITORY_AUTHORITY_NOW="2026-06-02T00:30:00Z" "$ROOT/tools/product-repository-authority" status --json --context free-development --repo "$product_repo" \
  | node -e '
const chunks = [];
process.stdin.on("data", (chunk) => chunks.push(chunk));
process.stdin.on("end", () => {
  const data = JSON.parse(Buffer.concat(chunks).toString("utf8"));
  for (const sourceId of ["product.tests.unit", "product.tests.smoke", "product.tests.e2e"]) {
    const item = data.evidence_summary.items.find((row) => row.source_id === sourceId);
    if (!item) throw new Error(`missing ${sourceId} evidence`);
    if (item.status !== "passed" || item.freshness_state !== "current" || item.authority !== "authoritative" || item.detail_manifest_source !== "ops/EVIDENCE_DETAIL_MANIFEST.tsv" || item.risk_level !== "high") {
      throw new Error(`unexpected ${sourceId} state: ${JSON.stringify(item)}`);
    }
  }
  for (const sourceId of ["product.structure.files", "product.structure.settings", "product.structure.scripts"]) {
    const structure = data.evidence_summary.items.find((row) => row.source_id === sourceId);
    if (!structure) throw new Error(`missing ${sourceId} evidence`);
    if (structure.status !== "passed" || structure.risk_level !== "high" || structure.detail_manifest_source !== "ops/EVIDENCE_DETAIL_MANIFEST.tsv") {
      throw new Error(`unexpected ${sourceId} state: ${JSON.stringify(structure)}`);
    }
  }
});
'
PRODUCT_REPOSITORY_AUTHORITY_NOW="2026-06-02T00:30:00Z" "$ROOT/tools/product-repository-authority" status --json --context external-integration --repo "$product_repo" \
  | node -e '
const chunks = [];
process.stdin.on("data", (chunk) => chunks.push(chunk));
process.stdin.on("end", () => {
  const data = JSON.parse(Buffer.concat(chunks).toString("utf8"));
  if (data.status !== "ready") {
    throw new Error(`unexpected external-integration authority state after security evidence: ${data.status}`);
  }
  const expected = new Map([
    ["product.security.secrets", "critical"],
    ["product.security.local_artifacts", "high"],
    ["product.security.external_sending", "critical"],
    ["product.security.blockers", "critical"],
  ]);
  for (const [sourceId, riskLevel] of expected) {
    const item = data.evidence_summary.items.find((row) => row.source_id === sourceId);
    if (!item) throw new Error(`missing ${sourceId} evidence`);
    if (item.status !== "passed" || item.required_in_context !== true || item.authority !== "authoritative" || item.detail_manifest_source !== "ops/EVIDENCE_DETAIL_MANIFEST.tsv" || item.risk_level !== riskLevel) {
      throw new Error(`unexpected ${sourceId} state: ${JSON.stringify(item)}`);
    }
  }
});
'
PRODUCT_REPOSITORY_AUTHORITY_NOW="2026-06-02T00:30:00Z" "$ROOT/tools/product-repository-authority" status --json --context product-improvement --repo "$product_repo" \
  | node -e '
const chunks = [];
process.stdin.on("data", (chunk) => chunks.push(chunk));
process.stdin.on("end", () => {
  const data = JSON.parse(Buffer.concat(chunks).toString("utf8"));
  if (data.status !== "ready") {
    throw new Error(`unexpected product-improvement authority state after advisory PR/merge evidence: ${data.status}`);
  }
  for (const sourceId of ["product.git.sync", "product.git.push"]) {
    const item = data.evidence_summary.items.find((row) => row.source_id === sourceId);
    if (!item) throw new Error(`missing ${sourceId} evidence`);
    if (item.status !== "passed" || item.required_in_context !== true || item.authority !== "authoritative" || item.detail_manifest_source !== "ops/EVIDENCE_DETAIL_MANIFEST.tsv" || item.risk_level !== "high") {
      throw new Error(`unexpected ${sourceId} state: ${JSON.stringify(item)}`);
    }
  }
  const pr = data.evidence_summary.items.find((row) => row.source_id === "product.git.pr");
  if (!pr || pr.status !== "not_run" || pr.required_in_context !== false || pr.authority !== "manual_required" || pr.detail_manifest_source !== "ops/EVIDENCE_DETAIL_MANIFEST.tsv" || pr.risk_level !== "high") {
    throw new Error(`unexpected product.git.pr state: ${JSON.stringify(pr)}`);
  }
  const merge = data.evidence_summary.items.find((row) => row.source_id === "product.git.merge");
  if (!merge || merge.status !== "not_run" || merge.required_in_context !== false || merge.authority !== "manual_required" || merge.detail_manifest_source !== "ops/EVIDENCE_DETAIL_MANIFEST.tsv" || merge.risk_level !== "critical") {
    throw new Error(`unexpected product.git.merge state: ${JSON.stringify(merge)}`);
  }
  const ciProvider = data.evidence_summary.items.find((row) => row.source_id === "product.ci.github_actions");
  if (!ciProvider || ciProvider.status !== "passed" || ciProvider.required_in_context !== true || ciProvider.authority !== "authoritative" || ciProvider.detail_manifest_source !== "ops/EVIDENCE_DETAIL_MANIFEST.tsv" || ciProvider.risk_level !== "critical") {
    throw new Error(`unexpected product.ci.github_actions state: ${JSON.stringify(ciProvider)}`);
  }
  const ciMain = data.evidence_summary.items.find((row) => row.source_id === "product.ci.main");
  if (!ciMain || ciMain.status !== "passed" || ciMain.required_in_context !== true || ciMain.authority !== "authoritative" || ciMain.detail_manifest_source !== "ops/EVIDENCE_DETAIL_MANIFEST.tsv" || ciMain.risk_level !== "critical") {
    throw new Error(`unexpected product.ci.main state: ${JSON.stringify(ciMain)}`);
  }
  const ciPr = data.evidence_summary.items.find((row) => row.source_id === "product.ci.pr");
  if (!ciPr || ciPr.status !== "passed" || ciPr.required_in_context !== true || ciPr.authority !== "authoritative" || ciPr.detail_manifest_source !== "ops/EVIDENCE_DETAIL_MANIFEST.tsv" || ciPr.risk_level !== "critical") {
    throw new Error(`unexpected product.ci.pr state: ${JSON.stringify(ciPr)}`);
  }
});
'

PATH="$fake_bin:$PATH" LESSON_CONFIG="$config" "$ROOT/tools/free-development" gate
PATH="$fake_bin:$PATH" LESSON_CONFIG="$config" "$ROOT/tools/team-development" gate
PATH="$fake_bin:$PATH" LESSON_CONFIG="$config" "$ROOT/tools/product-improvement" gate
PATH="$fake_bin:$PATH" LESSON_CONFIG="$config" "$ROOT/tools/external-integration" gate
mv "$product_repo/docs/product/SPECIFICATION.md" "$product_repo/docs/product/SPECIFICATION.md.off"
PATH="$fake_bin:$PATH" LESSON_CONFIG="$config" "$ROOT/tools/external-integration" gate >/tmp/external-integration-missing-scope.out 2>&1 && exit 1 || true
grep 'missing external-integration scope document' /tmp/external-integration-missing-scope.out >/dev/null
PATH="$fake_bin:$PATH" LESSON_CONFIG="$config" "$ROOT/tools/product-improvement" gate >/tmp/product-improvement-missing-scope.out 2>&1 && exit 1 || true
grep 'missing product-improvement scope document' /tmp/product-improvement-missing-scope.out >/dev/null
mv "$product_repo/docs/product/SPECIFICATION.md.off" "$product_repo/docs/product/SPECIFICATION.md"
LESSON_CONFIG="$config" "$ROOT/tools/free-development" status | grep 'Free Development Mode'
LESSON_CONFIG="$config" "$ROOT/tools/free-development" start --confirm | grep 'Free Development Mode start prompt'
LESSON_CONFIG="$config" "$ROOT/tools/team-development" status | grep 'Team Development and Docker'
LESSON_CONFIG="$config" "$ROOT/tools/team-development" start --confirm | grep 'Team Development and Docker start prompt'
LESSON_CONFIG="$config" "$ROOT/tools/product-improvement" status | grep 'Product Improvement'
LESSON_CONFIG="$config" "$ROOT/tools/product-improvement" start --confirm | grep 'Product Improvement start prompt'
LESSON_CONFIG="$config" "$ROOT/tools/external-integration" status | grep 'External Integration'
LESSON_CONFIG="$config" "$ROOT/tools/external-integration" start --confirm | grep 'External Integration start prompt'

empty_config="$tmp/EMPTY_SETTINGS_CONFIG.tsv"
cat > "$empty_config" <<CONFIG
# key	value
lesson_repo_name	ai-driven-development-lesson
product_repo_name	$product_name
project_root	$project_root
flow_file	lesson/LESSON_FLOW.tsv
state_file	learning/LESSON_STATE.tsv
learning_tracker_file	learning/LEARNING_TASK_TRACKER.md
learning_handoff_file	learning/LEARNING_HANDOFF.md
learning_mode_file	$tmp/EMPTY_LESSON_MODE.tsv
workflow_language_file	$tmp/EMPTY_WORKFLOW_DISPLAY_LANGUAGE.tsv
product_language_file	$tmp/EMPTY_PRODUCT_DEVELOPMENT_LANGUAGE.tsv
CONFIG
printf '# selected_at\tmode\tdescription\n' > "$tmp/EMPTY_LESSON_MODE.tsv"
printf '# selected_at\tcode\tlabel\n' > "$tmp/EMPTY_WORKFLOW_DISPLAY_LANGUAGE.tsv"
printf '# selected_at\tcode\tlabel\n' > "$tmp/EMPTY_PRODUCT_DEVELOPMENT_LANGUAGE.tsv"
LESSON_MENU_SETTINGS_STRICT_CONFIG=1 LESSON_CONFIG="$empty_config" "$ROOT/tools/free-development" gate >/tmp/free-development-missing-prerequisite.out 2>&1 && exit 1 || true
grep 'missing menu prerequisite' /tmp/free-development-missing-prerequisite.out >/dev/null
LESSON_MENU_SETTINGS_STRICT_CONFIG=1 LESSON_CONFIG="$empty_config" "$ROOT/tools/product-improvement" start --confirm >/tmp/product-improvement-missing-prerequisite.out 2>&1 && exit 1 || true
grep 'missing menu prerequisite' /tmp/product-improvement-missing-prerequisite.out >/dev/null

missing_config="$tmp/MISSING_CONFIG.tsv"
cat > "$missing_config" <<CONFIG
# key	value
lesson_repo_name	ai-driven-development-lesson
product_repo_name	missing-product
project_root	$project_root
flow_file	lesson/LESSON_FLOW.tsv
state_file	learning/LESSON_STATE.tsv
learning_tracker_file	learning/LEARNING_TASK_TRACKER.md
learning_handoff_file	learning/LEARNING_HANDOFF.md
learning_mode_file	$tmp/LESSON_MODE.tsv
workflow_language_file	$tmp/WORKFLOW_DISPLAY_LANGUAGE.tsv
product_language_file	$tmp/PRODUCT_DEVELOPMENT_LANGUAGE.tsv
CONFIG
LESSON_CONFIG="$missing_config" "$ROOT/tools/free-development" gate >/tmp/free-development-missing.out 2>&1 && exit 1 || true
grep 'expected product repository does not exist' /tmp/free-development-missing.out >/dev/null

printf 'dirty\n' >> "$product_repo/README.md"
PATH="$fake_bin:$PATH" LESSON_CONFIG="$config" "$ROOT/tools/free-development" gate >/tmp/free-development-dirty.out 2>&1 && exit 1 || true
grep 'Working tree: dirty' /tmp/free-development-dirty.out >/dev/null
git -C "$product_repo" add README.md
git -C "$product_repo" commit -m "Record dirty-state test cleanup" >/dev/null
git -C "$product_repo" push >/dev/null
"$product_repo/tools/product-gate-evidence" manifest-tests free-development 3600 all >/dev/null
"$product_repo/tools/product-gate-evidence" structure-status free-development 3600 >/dev/null

cat > "$fake_bin/gh" <<'GH'
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
    printf 'completed\tfailure\tCI\tCI\tmain\t1\t0\t1s\t2026-06-02T00:00:00Z\n'
    exit 0
    ;;
  run)
    if [[ "${2:-}" == "list" ]]; then
      printf 'completed\tfailure\tCI\tCI\tmain\t1\t0\t1s\t2026-06-02T00:00:00Z\n'
      exit 0
    fi
    ;;
  repo)
    if [[ "${2:-}" == "view" ]]; then
      printf 'xxxMasahiro/sample-product\n'
      exit 0
    fi
    ;;
esac

printf 'unsupported fake gh command: %s\n' "$*" >&2
exit 1
GH
chmod +x "$fake_bin/gh"
PATH="$fake_bin:$PATH" LESSON_CONFIG="$config" "$ROOT/tools/free-development" gate >/tmp/free-development-ci-fail.out 2>&1 && exit 1 || true
grep 'CI status: latest run is not successful' /tmp/free-development-ci-fail.out >/dev/null

printf 'Product gate tool tests passed.\n'
