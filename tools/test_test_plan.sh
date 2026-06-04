#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT

"$ROOT/tools/test-plan" status | grep 'Coverage guard: passed' >/dev/null
"$ROOT/tools/test-plan" manifest --paths AGENTS.MD | grep 'force: full-no-cache for AGENTS.MD' >/dev/null
"$ROOT/tools/test-plan" manifest --paths docs/as-built/REQUIREMENTS.md >"$tmp/test-plan-doc.out"
grep 'run: check_as_built_docs (path: docs/as-built/REQUIREMENTS.md; full: true;' "$tmp/test-plan-doc.out" >/dev/null
"$ROOT/tools/test-plan" manifest --paths unknown/new-file.xyz | grep 'Unknown path is classified as full/no-cache' >/dev/null
"$ROOT/tools/test-plan" attest --paths .github/workflows/ci.yml | grep 'Format: test-plan-attestation-v1' >/dev/null
"$ROOT/tools/check_test_plan_coverage.sh" --paths package-lock.json >/dev/null

cat >"$tmp/checks.tsv" <<'DOC'
# check_id	modes	command	description
check_as_built_sync_contract	full|fast|minimal	./tools/check_as_built_sync_contract.sh	Test check.
DOC
cat >"$tmp/policy.tsv" <<'DOC'
# pattern	risk_class	required_checks	force_full	ci_required	cache_scope	quarantine_allowed	reason
AGENTS.MD	critical	missing_check	true	true	none	false	Broken row.
DOC

bad_out="$tmp/test-plan-bad.out"
TEST_PLAN_POLICY_FILE="$tmp/policy.tsv" GIT_HOOKS_CHECKS_FILE="$tmp/checks.tsv" "$ROOT/tools/check_test_plan_coverage.sh" >"$bad_out" 2>&1 && exit 1 || true
grep 'unknown check id in test plan policy row AGENTS.MD: missing_check' "$bad_out" >/dev/null
TEST_PLAN_POLICY_FILE="$tmp/policy.tsv" GIT_HOOKS_CHECKS_FILE="$tmp/checks.tsv" "$ROOT/tools/test-plan" manifest --paths AGENTS.MD >"$tmp/test-plan-manifest-bad.out" 2>&1 && exit 1 || true
grep 'unknown check id in test plan policy row AGENTS.MD: missing_check' "$tmp/test-plan-manifest-bad.out" >/dev/null
TEST_PLAN_POLICY_FILE="$tmp/policy.tsv" GIT_HOOKS_CHECKS_FILE="$tmp/checks.tsv" "$ROOT/tools/test-plan" attest --paths AGENTS.MD >"$tmp/test-plan-attest-bad.out" 2>&1 && exit 1 || true
grep 'unknown check id in test plan policy row AGENTS.MD: missing_check' "$tmp/test-plan-attest-bad.out" >/dev/null

cat >"$tmp/policy.tsv" <<'DOC'
# pattern	risk_class	required_checks	force_full	ci_required	cache_scope	quarantine_allowed	reason
AGENTS.MD	critical	check_as_built_sync_contract	true	true	none	false	One row only.
DOC

missing_pattern_out="$tmp/test-plan-missing-pattern.out"
TEST_PLAN_POLICY_FILE="$tmp/policy.tsv" GIT_HOOKS_CHECKS_FILE="$tmp/checks.tsv" "$ROOT/tools/check_test_plan_coverage.sh" >"$missing_pattern_out" 2>&1 && exit 1 || true
grep 'missing required dangerous-change pattern in test plan policy: .github/workflows/' "$missing_pattern_out" >/dev/null

cat >"$tmp/policy.tsv" <<'DOC'
# pattern	risk_class	required_checks	force_full	ci_required	cache_scope	quarantine_allowed	reason
AGENTS.MD	critical	check_as_built_sync_contract	true	true	none	false	Required row.
.github/workflows/	critical	check_as_built_sync_contract	false	false	none	false	Unsafe weakening.
.githooks/	critical	check_as_built_sync_contract	true	true	none	false	Required row.
docs/workflow/AS_BUILT_SYNC_CONTRACT.tsv	critical	check_as_built_sync_contract	true	true	none	false	Required row.
docs/workflow/GIT_HOOK_CHECKS.tsv	critical	check_as_built_sync_contract	true	true	none	false	Required row.
docs/workflow/SAFEFLOW_SECURITY_BACKFILL.tsv	critical	check_as_built_sync_contract	true	true	none	false	Required row.
docs/workflow/PRODUCT_SECURITY_POLICY.tsv	critical	check_as_built_sync_contract	true	true	none	false	Required row.
package.json	critical	check_as_built_sync_contract	true	true	none	false	Required row.
package-lock.json	critical	check_as_built_sync_contract	true	true	none	false	Required row.
playwright.config.js	critical	check_as_built_sync_contract	true	true	none	false	Required row.
tests/playwright/	critical	check_as_built_sync_contract	true	true	none	false	Required row.
tools/git-hooks	critical	check_as_built_sync_contract	true	true	none	false	Required row.
tools/as-built-sync	critical	check_as_built_sync_contract	true	true	none	false	Required row.
DOC
unsafe_required_out="$tmp/test-plan-unsafe-required.out"
TEST_PLAN_POLICY_FILE="$tmp/policy.tsv" GIT_HOOKS_CHECKS_FILE="$tmp/checks.tsv" "$ROOT/tools/check_test_plan_coverage.sh" >"$unsafe_required_out" 2>&1 && exit 1 || true
grep 'required dangerous-change pattern must force full verification: .github/workflows/' "$unsafe_required_out" >/dev/null
grep 'required dangerous-change pattern must require CI verification: .github/workflows/' "$unsafe_required_out" >/dev/null

cat >"$tmp/policy.tsv" <<'DOC'
# pattern	risk_class	required_checks	force_full	ci_required	cache_scope	quarantine_allowed	reason
AGENTS.MD	urgent	check_as_built_sync_contract	true	true	none	false	Invalid risk.
.github/workflows/	critical	check_as_built_sync_contract	true	true	remote	false	Invalid cache.
.githooks/	critical	check_as_built_sync_contract	true	true	none	false	Required row.
docs/workflow/AS_BUILT_SYNC_CONTRACT.tsv	critical	check_as_built_sync_contract	true	true	none	false	Required row.
docs/workflow/GIT_HOOK_CHECKS.tsv	critical	check_as_built_sync_contract	true	true	none	false	Required row.
docs/workflow/SAFEFLOW_SECURITY_BACKFILL.tsv	critical	check_as_built_sync_contract	true	true	none	false	Required row.
docs/workflow/PRODUCT_SECURITY_POLICY.tsv	critical	check_as_built_sync_contract	true	true	none	false	Required row.
package.json	critical	check_as_built_sync_contract	true	true	none	false	Required row.
package-lock.json	critical	check_as_built_sync_contract	true	true	none	false	Required row.
playwright.config.js	critical	check_as_built_sync_contract	true	true	none	false	Required row.
tests/playwright/	critical	check_as_built_sync_contract	true	true	none	false	Required row.
tools/git-hooks	critical	check_as_built_sync_contract	true	true	none	false	Required row.
tools/as-built-sync	critical	check_as_built_sync_contract	true	true	none	false	Required row.
DOC
invalid_policy_out="$tmp/test-plan-invalid-policy.out"
TEST_PLAN_POLICY_FILE="$tmp/policy.tsv" GIT_HOOKS_CHECKS_FILE="$tmp/checks.tsv" "$ROOT/tools/check_test_plan_coverage.sh" >"$invalid_policy_out" 2>&1 && exit 1 || true
grep 'invalid risk_class for AGENTS.MD: urgent' "$invalid_policy_out" >/dev/null
grep 'invalid cache_scope for .github/workflows/: remote' "$invalid_policy_out" >/dev/null

printf 'Test plan tests passed.\n'
