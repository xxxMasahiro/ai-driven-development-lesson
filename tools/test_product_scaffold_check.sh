#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

make_repo() {
  local repo="$1"
  mkdir -p "$repo"
  git -C "$repo" init -q
  git -C "$repo" config user.name "Product Scaffold Test"
  git -C "$repo" config user.email "product-scaffold@example.com"
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
  for tool in product-gate check_product_structure.sh check_product_docs.sh check_product_security.sh check_product_design_system.sh test_product_repository.sh product-mode npm_test npm_smoke npm_e2e; do
    cat >"$repo/tools/$tool" <<DOC
#!/usr/bin/env bash
set -euo pipefail
printf '%s passed\n' "$tool"
DOC
    chmod +x "$repo/tools/$tool"
  done
  cat >"$repo/tools/lib/product_common.sh" <<'DOC'
#!/usr/bin/env bash
product_repo_root() {
  cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd
}
DOC
  "$ROOT/tools/product-gate-evidence-bootstrap" install --repo "$repo" --confirm >/dev/null
}

write_common_manifests() {
  local repo="$1"
  cat >"$repo/ops/STAGE_MANIFEST.tsv" <<'DOC'
# stage_id	required_mode	contexts	product_types	dashboard_group	description
build	required	all	all	workflow	Build stage.
DOC
  cat >"$repo/ops/TEST_PLAN_MANIFEST.tsv" <<'DOC'
# test_id	required_mode	contexts	product_types	command_id	evidence_source	dashboard_group	description
unit	required	all	all	npm_test	product.gates.tests	workflow	Unit test.
smoke	contextual	all	all	npm_smoke	product.gates.tests	workflow	Smoke test.
e2e	contextual	all	all	npm_e2e	product.gates.tests	workflow	End-to-end test.
DOC
  cat >"$repo/ops/CI_MANIFEST.tsv" <<'DOC'
# ci_id	required_mode	contexts	workflow_file	workflow_name	branch_policy	evidence_source	description
main	contextual	product-improvement|external-integration	.github/workflows/ci.yml	CI	main	product.ci.main	Main CI.
DOC
  cat >"$repo/ops/SECURITY_MANIFEST.tsv" <<'DOC'
# security_id	required_mode	contexts	policy_source	evidence_source	dashboard_group	description
secrets	required	all	docs/workflow/SECURITY.md	product.security.secrets	security	Secret scan.
DOC
  cat >"$repo/ops/DESIGN_SYSTEM_MANIFEST.tsv" <<'DOC'
# design_id	required_mode	contexts	source_path	generated_path	check_command	description
product-design-system	required	all	docs/design-system/DESIGN_SYSTEM.md	none	tools/check_product_design_system.sh	Product-local design-system source and check.
DOC
  cat >"$repo/ops/DASHBOARD_MANIFEST.tsv" <<'DOC'
# surface_id	required_mode	contexts	source_id	label_key	dashboard_group	description
overview	required	all	product.overview	overview	overview	Product overview.
DOC
}

write_good_repo() {
  local repo="$1"
  make_repo "$repo"
  mkdir -p "$repo/docs/product" "$repo/docs/workflow" "$repo/docs/memory" "$repo/ops" "$repo/src" "$repo/tests"
  write_product_local_runtime "$repo"
  printf '# Product Agents\n' >"$repo/AGENTS.MD"
  printf '# Product\n' >"$repo/README.md"
  printf '# Requirements\n' >"$repo/docs/product/REQUIREMENTS.md"
  printf '# Specification\n' >"$repo/docs/product/SPECIFICATION.md"
  printf '# Implementation Plan\n' >"$repo/docs/product/IMPLEMENTATION_PLAN.md"
  printf '# Task Tracker\n\n## Current Status\nReady.\n\n## Remaining Work\n- Continue.\n\nHANDOFF\n' >"$repo/docs/workflow/TASK_TRACKER.md"
  printf '# Handoff\n\n## Current State\nReady.\n\n## Next Step\n- Continue.\n\nTASK_TRACKER\n' >"$repo/docs/workflow/HANDOFF.md"
  printf '<!doctype html>\n<script src="src/app.js"></script>\n' >"$repo/index.html"
  printf 'console.log("product");\n' >"$repo/src/app.js"
  printf 'test("product", () => true);\n' >"$repo/tests/app.test.js"
  write_common_manifests "$repo"
  cat >"$repo/ops/PRODUCT_MANIFEST.tsv" <<'DOC'
# authority_id	required_mode	contexts	product_types	path	path_role	validation_rule	dashboard_group	description
product.entrypoint	required	all	all	index.html	entrypoint	file_exists	workflow	Browser entrypoint.
product.source	required	all	all	src/app.js	source	file_nonempty	workflow	Application source authority.
product.test	required	all	all	tests/app.test.js	test	file_nonempty	workflow	Test authority.
DOC
  cat >"$repo/ops/PRODUCT_PROFILE.json" <<'DOC'
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
    "en": "A product used by scaffold checks."
  },
  "source": "learner_confirmed",
  "confirmed_at": "2026-06-05T00:00:00Z",
  "source_documents": [
    "docs/product/REQUIREMENTS.md"
  ]
}
DOC
}

good_repo="$TMP_DIR/good"
write_good_repo "$good_repo"
"$ROOT/tools/product-scaffold-check" check --repo "$good_repo" --context free-development --product-type web \
  | grep 'Product scaffold check passed'
"$ROOT/tools/product-gate-evidence-bootstrap" status --repo "$good_repo" | grep 'ready: tools/product-gate-evidence' >/dev/null
"$ROOT/tools/product-gate-evidence-bootstrap" status --repo "$good_repo" | grep 'ready: ops/EVIDENCE_DETAIL_MANIFEST.tsv' >/dev/null
"$good_repo/tools/product-gate-evidence" record product.gates.tests free-development passed ops/TEST_PLAN_MANIFEST.tsv "npm test" 3600 >/dev/null
awk -F '\t' '$1 == "product.gates.tests" && $2 == "free-development" && $3 == "passed" && $4 == "current" && $6 == "authoritative" { found = 1 } END { exit found ? 0 : 1 }' \
  "$good_repo/.git/product-gate-evidence/index.tsv"
"$good_repo/tools/product-gate-evidence" record product.structure.files free-development passed ops/PRODUCT_MANIFEST.tsv "tools/product-scaffold-check check" 3600 >/dev/null
awk -F '\t' '$1 == "product.structure.files" && $2 == "free-development" && $3 == "passed" && $4 == "current" && $6 == "authoritative" { found = 1 } END { exit found ? 0 : 1 }' \
  "$good_repo/.git/product-gate-evidence/index.tsv"
"$good_repo/tools/product-gate-evidence" structure-status free-development 3600 >/dev/null
awk -F '\t' '$1 == "product.structure.files" && $2 == "free-development" && $3 == "passed" && $4 == "current" && $6 == "authoritative" { found = 1 } END { exit found ? 0 : 1 }' \
  "$good_repo/.git/product-gate-evidence/index.tsv"
awk -F '\t' '$1 == "product.structure.settings" && $2 == "free-development" && $3 == "passed" && $4 == "current" && $6 == "authoritative" { found = 1 } END { exit found ? 0 : 1 }' \
  "$good_repo/.git/product-gate-evidence/index.tsv"
awk -F '\t' '$1 == "product.structure.scripts" && $2 == "free-development" && $3 == "passed" && $4 == "current" && $6 == "authoritative" { found = 1 } END { exit found ? 0 : 1 }' \
  "$good_repo/.git/product-gate-evidence/index.tsv"
node - "$good_repo/.git/product-gate-evidence/ledger.jsonl" "$good_repo/.git/product-gate-evidence/details/product.gates.tests" <<'NODE'
const fs = require("node:fs");
const ledgerPath = process.argv[2];
const detailsDir = process.argv[3];
function fail(message) {
  console.error(message);
  process.exit(1);
}
const entries = fs.readFileSync(ledgerPath, "utf8").trim().split(/\r?\n/).filter(Boolean).map((line) => JSON.parse(line));
const entry = entries.find((item) => item.source_id === "product.gates.tests" && item.context === "free-development" && item.status === "passed");
if (!entry) fail("missing product gate evidence ledger entry");
if (!entry.event_id || !entry.detail_artifact_path) fail("ledger entry did not expose event_id and detail_artifact_path");
const detailFiles = fs.readdirSync(detailsDir).filter((name) => name.endsWith(".json"));
if (!detailFiles.length) fail("missing product gate evidence detail artifact");
const detail = JSON.parse(fs.readFileSync(`${detailsDir}/${detailFiles[0]}`, "utf8"));
for (const key of ["artifact_schema_version", "event_id", "source_id", "context", "status", "freshness_state", "authority", "observed_at", "product_root", "product_head", "detail_code", "safe_summary", "reason", "next_action", "source_artifacts", "blocked_by"]) {
  if (!(key in detail)) fail(`detail artifact missing ${key}`);
}
if (detail.source_id !== "product.gates.tests") fail("detail artifact source_id mismatch");
if (detail.status !== "passed") fail("detail artifact status mismatch");
NODE
"$good_repo/tools/product-gate-evidence" run product.gates.tests free-development ops/TEST_PLAN_MANIFEST.tsv "false" 3600 -- false \
  >/tmp/product-gate-evidence-run-failed.out 2>&1 && exit 1 || true
awk -F '\t' '$1 == "product.gates.tests" && $2 == "free-development" && $3 == "failed" && $4 == "current" && $6 == "authoritative" { found = 1 } END { exit found ? 0 : 1 }' \
  "$good_repo/.git/product-gate-evidence/index.tsv"
grep '"status":"failed"' "$good_repo/.git/product-gate-evidence/ledger.jsonl" >/dev/null
"$good_repo/tools/product-gate-evidence" git-status free-development 300 >/dev/null
awk -F '\t' '$1 == "product.git.worktree" && $2 == "free-development" && $3 == "failed" && $6 == "authoritative" { found = 1 } END { exit found ? 0 : 1 }' \
  "$good_repo/.git/product-gate-evidence/index.tsv"
awk -F '\t' '$1 == "product.git.sync" && $2 == "free-development" && $3 == "failed" && $5 == "true" && $6 == "authoritative" && $12 == "product.git.worktree" { found = 1 } END { exit found ? 0 : 1 }' \
  "$good_repo/.git/product-gate-evidence/index.tsv"
awk -F '\t' '$1 == "product.git.upstream" && $2 == "free-development" && $3 == "not_run" && $5 == "false" && $6 == "advisory" { found = 1 } END { exit found ? 0 : 1 }' \
  "$good_repo/.git/product-gate-evidence/index.tsv"
awk -F '\t' '$1 == "product.git.local_remote_sync" && $2 == "free-development" && $3 == "not_run" && $5 == "false" && $6 == "advisory" && $12 == "product.git.upstream" { found = 1 } END { exit found ? 0 : 1 }' \
  "$good_repo/.git/product-gate-evidence/index.tsv"
awk -F '\t' '$1 == "product.git.push" && $2 == "free-development" && $3 == "not_applicable" && $5 == "false" && $6 == "advisory" { found = 1 } END { exit found ? 0 : 1 }' \
  "$good_repo/.git/product-gate-evidence/index.tsv"
awk -F '\t' '$1 == "product.git.pr" && $2 == "free-development" && $3 == "not_applicable" && $5 == "false" && $6 == "advisory" { found = 1 } END { exit found ? 0 : 1 }' \
  "$good_repo/.git/product-gate-evidence/index.tsv"
awk -F '\t' '$1 == "product.git.merge" && $2 == "free-development" && $3 == "not_applicable" && $5 == "false" && $6 == "advisory" { found = 1 } END { exit found ? 0 : 1 }' \
  "$good_repo/.git/product-gate-evidence/index.tsv"
"$good_repo/tools/product-gate-evidence" ci-status product-improvement 3600 >/tmp/product-gate-evidence-ci-status-missing-workflow.out 2>&1 && exit 1 || true
awk -F '\t' '$1 == "product.ci.github_actions" && $2 == "product-improvement" && $3 == "blocked" && $5 == "true" && $6 == "manual_required" && $12 == "product.ci.github_actions" { found = 1 } END { exit found ? 0 : 1 }' \
  "$good_repo/.git/product-gate-evidence/index.tsv"
awk -F '\t' '$1 == "product.ci.main" && $2 == "product-improvement" && $3 == "blocked" && $5 == "true" && $6 == "manual_required" && $12 == "product.ci.github_actions" { found = 1 } END { exit found ? 0 : 1 }' \
  "$good_repo/.git/product-gate-evidence/index.tsv"
awk -F '\t' '$1 == "product.ci.pr" && $2 == "product-improvement" && $3 == "not_run" && $5 == "false" && $6 == "manual_required" { found = 1 } END { exit found ? 0 : 1 }' \
  "$good_repo/.git/product-gate-evidence/index.tsv"
"$good_repo/tools/product-gate-evidence" security-status free-development 3600 >/dev/null
awk -F '\t' '$1 == "product.security.secrets" && $2 == "free-development" && $3 == "passed" && $5 == "true" && $6 == "authoritative" { found = 1 } END { exit found ? 0 : 1 }' \
  "$good_repo/.git/product-gate-evidence/index.tsv"
awk -F '\t' '$1 == "product.security.local_artifacts" && $2 == "free-development" && $3 == "passed" && $5 == "true" && $6 == "authoritative" { found = 1 } END { exit found ? 0 : 1 }' \
  "$good_repo/.git/product-gate-evidence/index.tsv"
awk -F '\t' '$1 == "product.security.external_sending" && $2 == "free-development" && $3 == "not_applicable" && $5 == "false" && $6 == "advisory" { found = 1 } END { exit found ? 0 : 1 }' \
  "$good_repo/.git/product-gate-evidence/index.tsv"
awk -F '\t' '$1 == "product.security.blockers" && $2 == "free-development" && $3 == "passed" && $5 == "true" && $6 == "authoritative" { found = 1 } END { exit found ? 0 : 1 }' \
  "$good_repo/.git/product-gate-evidence/index.tsv"
"$good_repo/tools/product-gate-evidence" manifest-tests free-development 3600 all >/dev/null
awk -F '\t' '$1 == "product.tests.unit" && $2 == "free-development" && $3 == "passed" && $4 == "current" && $6 == "authoritative" { found = 1 } END { exit found ? 0 : 1 }' \
  "$good_repo/.git/product-gate-evidence/index.tsv"
awk -F '\t' '$1 == "product.tests.smoke" && $2 == "free-development" && $3 == "passed" && $4 == "current" && $6 == "authoritative" { found = 1 } END { exit found ? 0 : 1 }' \
  "$good_repo/.git/product-gate-evidence/index.tsv"
awk -F '\t' '$1 == "product.tests.e2e" && $2 == "free-development" && $3 == "passed" && $4 == "current" && $6 == "authoritative" { found = 1 } END { exit found ? 0 : 1 }' \
  "$good_repo/.git/product-gate-evidence/index.tsv"

secret_file_repo="$TMP_DIR/secret-file"
write_good_repo "$secret_file_repo"
printf 'SECRET_TOKEN=dummysecretvalue\n' >"$secret_file_repo/.env"
"$secret_file_repo/tools/product-gate-evidence" security-status free-development 3600 >/tmp/product-gate-evidence-security-status-secret.out 2>&1 && exit 1 || true
awk -F '\t' '$1 == "product.security.secrets" && $2 == "free-development" && $3 == "blocked" && $5 == "true" && $6 == "manual_required" && $12 == "product.security.secrets" { found = 1 } END { exit found ? 0 : 1 }' \
  "$secret_file_repo/.git/product-gate-evidence/index.tsv"
awk -F '\t' '$1 == "product.security.blockers" && $2 == "free-development" && $3 == "blocked" && $5 == "true" && $6 == "manual_required" && $12 ~ /product\.security\.secrets/ { found = 1 } END { exit found ? 0 : 1 }' \
  "$secret_file_repo/.git/product-gate-evidence/index.tsv"
if grep -Fq 'dummysecretvalue' /tmp/product-gate-evidence-security-status-secret.out "$secret_file_repo/.git/product-gate-evidence/index.tsv" "$secret_file_repo/.git/product-gate-evidence/ledger.jsonl"; then
  printf 'product-gate-evidence leaked a secret value\n' >&2
  exit 1
fi

missing_manifest="$TMP_DIR/missing-manifest"
write_good_repo "$missing_manifest"
rm "$missing_manifest/ops/PRODUCT_MANIFEST.tsv"
"$ROOT/tools/product-scaffold-check" check --repo "$missing_manifest" --context free-development \
  >/tmp/product-scaffold-missing-manifest.out 2>&1 && exit 1 || true
grep 'ops/PRODUCT_MANIFEST.tsv' /tmp/product-scaffold-missing-manifest.out >/dev/null

missing_role="$TMP_DIR/missing-role"
write_good_repo "$missing_role"
awk -F '\t' '$1 ~ /^#/ || $6 != "test"' "$missing_role/ops/PRODUCT_MANIFEST.tsv" >"$missing_role/ops/PRODUCT_MANIFEST.tsv.next"
mv "$missing_role/ops/PRODUCT_MANIFEST.tsv.next" "$missing_role/ops/PRODUCT_MANIFEST.tsv"
"$ROOT/tools/product-scaffold-check" check --repo "$missing_role" --context free-development \
  >/tmp/product-scaffold-missing-role.out 2>&1 && exit 1 || true
grep 'required test authority' /tmp/product-scaffold-missing-role.out >/dev/null

missing_source="$TMP_DIR/missing-source"
write_good_repo "$missing_source"
rm "$missing_source/src/app.js"
"$ROOT/tools/product-scaffold-check" check --repo "$missing_source" --context free-development \
  >/tmp/product-scaffold-missing-source.out 2>&1 && exit 1 || true
grep 'product.source' /tmp/product-scaffold-missing-source.out >/dev/null

missing_skill="$TMP_DIR/missing-skill"
write_good_repo "$missing_skill"
rm "$missing_skill/skills/product-test/SKILL.md"
"$ROOT/tools/product-scaffold-check" check --repo "$missing_skill" --context free-development \
  >/tmp/product-scaffold-missing-skill.out 2>&1 && exit 1 || true
grep 'product_skills.product_test' /tmp/product-scaffold-missing-skill.out >/dev/null

missing_evidence_helper="$TMP_DIR/missing-evidence-helper"
write_good_repo "$missing_evidence_helper"
rm "$missing_evidence_helper/tools/lib/product_gate_evidence.sh"
"$ROOT/tools/product-scaffold-check" check --repo "$missing_evidence_helper" --context free-development \
  >/tmp/product-scaffold-missing-evidence-helper.out 2>&1 && exit 1 || true
grep 'product_tools.product_gate_evidence_helper' /tmp/product-scaffold-missing-evidence-helper.out >/dev/null

missing_evidence_command="$TMP_DIR/missing-evidence-command"
write_good_repo "$missing_evidence_command"
rm "$missing_evidence_command/tools/product-gate-evidence"
"$ROOT/tools/product-scaffold-check" check --repo "$missing_evidence_command" --context free-development \
  >/tmp/product-scaffold-missing-evidence-command.out 2>&1 && exit 1 || true
grep 'product_tools.product_gate_evidence_command' /tmp/product-scaffold-missing-evidence-command.out >/dev/null

missing_evidence_detail_manifest="$TMP_DIR/missing-evidence-detail-manifest"
write_good_repo "$missing_evidence_detail_manifest"
rm "$missing_evidence_detail_manifest/ops/EVIDENCE_DETAIL_MANIFEST.tsv"
"$ROOT/tools/product-scaffold-check" check --repo "$missing_evidence_detail_manifest" --context free-development \
  >/tmp/product-scaffold-missing-evidence-detail-manifest.out 2>&1 && exit 1 || true
grep 'product_ops.evidence_detail_manifest' /tmp/product-scaffold-missing-evidence-detail-manifest.out >/dev/null
"$ROOT/tools/product-gate-evidence-bootstrap" status --repo "$missing_evidence_detail_manifest" \
  >/tmp/product-gate-evidence-bootstrap-missing-detail-manifest.out 2>&1 && exit 1 || true
grep 'missing: ops/EVIDENCE_DETAIL_MANIFEST.tsv' /tmp/product-gate-evidence-bootstrap-missing-detail-manifest.out >/dev/null

legacy_agent="$TMP_DIR/legacy-agent"
write_good_repo "$legacy_agent"
printf '# Legacy Agent\n' >"$legacy_agent/AGENT.md"
"$ROOT/tools/product-scaffold-check" check --repo "$legacy_agent" --context free-development \
  >/tmp/product-scaffold-legacy-agent.out 2>&1 && exit 1 || true
grep 'legacy product AGENT.md' /tmp/product-scaffold-legacy-agent.out >/dev/null

root_only="$TMP_DIR/root-only"
make_repo "$root_only"
mkdir -p "$root_only/ops" "$root_only/src" "$root_only/tests"
write_product_local_runtime "$root_only"
printf '# Product Agents\n' >"$root_only/AGENTS.MD"
printf '# Product\n' >"$root_only/README.md"
printf '# Requirements\n' >"$root_only/REQUIREMENTS.md"
printf '# Specification\n' >"$root_only/SPECIFICATION.md"
printf '# Implementation Plan\n' >"$root_only/IMPLEMENTATION_PLAN.md"
printf '# Task Tracker\n\n## Current Status\nReady.\n\n## Remaining Work\n- Continue.\n\nHANDOFF\n' >"$root_only/TASK_TRACKER.md"
printf '# Handoff\n\n## Current State\nReady.\n\n## Next Step\n- Continue.\n\nTASK_TRACKER\n' >"$root_only/HANDOFF.md"
printf 'source\n' >"$root_only/src/app.js"
printf 'test\n' >"$root_only/tests/app.test.js"
printf 'entry\n' >"$root_only/index.html"
write_common_manifests "$root_only"
cat >"$root_only/ops/PRODUCT_MANIFEST.tsv" <<'DOC'
# authority_id	required_mode	contexts	product_types	path	path_role	validation_rule	dashboard_group	description
product.entrypoint	required	all	all	index.html	entrypoint	file_exists	workflow	Browser entrypoint.
product.source	required	all	all	src/app.js	source	file_nonempty	workflow	Application source authority.
product.test	required	all	all	tests/app.test.js	test	file_nonempty	workflow	Test authority.
DOC
cat >"$root_only/ops/PRODUCT_PROFILE.json" <<'DOC'
{
  "schema_version": "1.0.0",
  "profile_kind": "product_display_profile",
  "menu_id": "free-development",
  "profile_scope": "product",
  "display_name": {
    "ja": "レガシー成果物",
    "en": "Legacy Product"
  },
  "description": {
    "ja": "レガシー配置検査用の成果物です。",
    "en": "A product used by legacy layout checks."
  },
  "source": "learner_confirmed",
  "confirmed_at": "2026-06-05T00:00:00Z",
  "source_documents": [
    "docs/product/REQUIREMENTS.md"
  ]
}
DOC
"$ROOT/tools/product-scaffold-check" check --repo "$root_only" --context free-development \
  >/tmp/product-scaffold-root-only.out 2>&1 && exit 1 || true
grep 'root-level duplicate for product_docs.requirements' /tmp/product-scaffold-root-only.out >/dev/null

root_memory_duplicate="$TMP_DIR/root-memory-duplicate"
write_good_repo "$root_memory_duplicate"
printf '# Session Memory\n' >"$root_memory_duplicate/SESSION_MEMORY.md"
"$ROOT/tools/product-scaffold-check" check --repo "$root_memory_duplicate" --context free-development \
  >/tmp/product-scaffold-root-memory.out 2>&1 && exit 1 || true
grep 'root-level duplicate for product_memory.session_memory' /tmp/product-scaffold-root-memory.out >/dev/null

printf 'Product scaffold check tests passed.\n'
