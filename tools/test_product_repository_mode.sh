#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

repo="$TMP_DIR/product"
mkdir -p "$repo/ops"
git -C "$repo" init -q

printf '# Product Agents\n' >"$repo/AGENTS.MD"
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

status_json="$("$ROOT/tools/product-repository-mode" status --repo "$repo" --json)"
node - "$status_json" <<'NODE'
const data = JSON.parse(process.argv[2]);
function fail(message) {
  console.error(message);
  process.exit(1);
}
if (data.status !== "ready") fail(`expected ready status, got ${data.status}`);
if (data.workflow_mode !== "parent_managed") fail("expected parent_managed mode");
if (data.managed_by_parent !== true) fail("expected managed_by_parent true");
if (data.agents_path_status !== "ready") fail("expected AGENTS.MD ready");
NODE

"$ROOT/tools/product-repository-mode" check --repo "$repo" >/dev/null

printf '# Legacy Agent\n' >"$repo/AGENT.md"
"$ROOT/tools/product-repository-mode" check --repo "$repo" >"$TMP_DIR/legacy.out" 2>&1 && exit 1 || true
grep 'Legacy product AGENT.md is present' "$TMP_DIR/legacy.out" >/dev/null
rm "$repo/AGENT.md"

rm "$repo/ops/PRODUCT_OPERATION_MODE.tsv"
"$ROOT/tools/product-repository-mode" check --repo "$repo" >"$TMP_DIR/missing-mode.out" 2>&1 && exit 1 || true
grep 'PRODUCT_OPERATION_MODE.tsv is missing' "$TMP_DIR/missing-mode.out" >/dev/null

"$ROOT/tools/product-repository-mode" detach --repo "$repo" >"$TMP_DIR/detach-unconfirmed.out" 2>&1 && exit 1 || true
grep 'Run again with --confirm' "$TMP_DIR/detach-unconfirmed.out" >/dev/null

"$ROOT/tools/product-repository-mode" detach --repo "$repo" --confirm >/dev/null
standalone_json="$("$ROOT/tools/product-repository-mode" status --repo "$repo" --json)"
node - "$standalone_json" <<'NODE'
const data = JSON.parse(process.argv[2]);
function fail(message) {
  console.error(message);
  process.exit(1);
}
if (data.status !== "ready") fail(`expected ready standalone mode, got ${data.status}`);
if (data.workflow_mode !== "standalone") fail(`expected standalone, got ${data.workflow_mode}`);
if (data.managed_by_parent !== false) fail("standalone must not be managed by parent");
if (data.rule_connection_status !== "not_applicable") fail("standalone rule connection must be not_applicable");
NODE

cat >"$repo/ops/PRODUCT_OPERATION_MODE.tsv" <<'DOC'
# key	value
workflow_mode	parent_managed
managed_by_parent	true
parent_repository	/home/example/lesson
parent_rules_ref	AGENTS.MD
last_parent_sync	2026-06-05T00:00:00Z
active_parent_run	none
local_agents_version	1
routing_table_version	1
DOC
"$ROOT/tools/product-repository-mode" check --repo "$repo" >"$TMP_DIR/absolute-parent.out" 2>&1 && exit 1 || true
grep 'repair_required' "$TMP_DIR/absolute-parent.out" >/dev/null

printf 'Product repository mode tests passed.\n'
