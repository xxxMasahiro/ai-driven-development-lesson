#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TMP_DIR="$(mktemp -d)"
cleanup() {
  if [[ "${TEST_KEEP_TMP:-0}" == "1" ]]; then
    printf 'Preserved CI final-gate fixture: %s\n' "$TMP_DIR" >&2
  else
    rm -rf "$TMP_DIR"
  fi
}
trap cleanup EXIT

TEST_REPO="$TMP_DIR/repo"
POLICY_FILE="$TMP_DIR/git-hooks-policy.tsv"
SETTINGS_FILE="$TMP_DIR/git-hooks-settings.tsv"
CHECKS_FILE="$TMP_DIR/git-hooks-checks.tsv"
GROUPS_FILE="$TMP_DIR/git-hooks-parallel-groups.tsv"
RECOMMENDATION_FILE="$TMP_DIR/git-hooks-recommendations.tsv"
GAP_FILE="$TMP_DIR/final-gate-gap.tsv"
COVERAGE_FILE="$TMP_DIR/final-gate-coverage.tsv"
AGGREGATE_FILE="$TMP_DIR/aggregate.sh"
EVIDENCE_DIR="$TMP_DIR/evidence"
GAP_COUNT="$TMP_DIR/gap-count"
GAP_SHORT_COUNT="$TMP_DIR/gap-short-count"
FALLBACK_COUNT="$TMP_DIR/fallback-count"

mkdir -p "$TEST_REPO"
git -C "$TEST_REPO" init -q
git -C "$TEST_REPO" config user.name "CI Final Gate Test"
git -C "$TEST_REPO" config user.email "ci-final-gate@example.com"
printf 'fixture\n' >"$TEST_REPO/README.md"
git -C "$TEST_REPO" add README.md
git -C "$TEST_REPO" commit -q -m "Initial final-gate fixture"

cat >"$POLICY_FILE" <<'EOF'
# key	allowed_values	default_value	label	description
hook_mode	full|fast|minimal	full	Git hooks mode	Test policy.
EOF

cat >"$SETTINGS_FILE" <<'EOF'
# key	value
hook_mode	full
EOF

cat >"$RECOMMENDATION_FILE" <<'EOF'
# pattern	recommendation	reason
tools/test_*.sh	full-no-cache	Regression-test changes need full verification.
EOF

write_counter_script() {
  local path="$1"
  local counter="$2"
  cat >"$path" <<EOF
#!/usr/bin/env bash
set -euo pipefail
count=0
if [[ -f "$counter" ]]; then
  count="\$(cat "$counter")"
fi
count=\$((count + 1))
printf '%s\n' "\$count" >"$counter"
EOF
  chmod +x "$path"
}

write_counter_script "$TMP_DIR/check_a.sh" "$TMP_DIR/check-a-count"
write_counter_script "$TMP_DIR/check_b.sh" "$TMP_DIR/check-b-count"
write_counter_script "$TMP_DIR/gap.sh" "$GAP_COUNT"
write_counter_script "$TMP_DIR/gap_short.sh" "$GAP_SHORT_COUNT"
write_counter_script "$TMP_DIR/fallback.sh" "$FALLBACK_COUNT"

cat >"$GAP_FILE" <<EOF
# command_id	argv	output	description
gap_check	["$TMP_DIR/gap.sh"]	discard	Final gap fixture command.
gap_short_check	["$TMP_DIR/gap_short.sh"]	discard	Final gap fixture command with an extra aggregate option.
EOF

cat >"$AGGREGATE_FILE" <<'EOF'
#!/usr/bin/env bash
set -euo pipefail
./tools/check_a.sh
./tools/check_b.sh
./tools/gap.sh
./tools/resource-guard summary --short >/dev/null
EOF

cat >"$COVERAGE_FILE" <<'EOF'
# aggregate_requirement	coverage_kind	coverage_id	description
./tools/check_a.sh	hook	check_a	Fixture aggregate check A is covered by hook evidence.
./tools/check_b.sh	hook	check_b	Fixture aggregate check B is covered by hook evidence.
./tools/gap.sh	gap	gap_check	Fixture aggregate gap is covered by a gap command.
./tools/resource-guard summary --short	gap	gap_short_check	Fixture aggregate command with an extra option is covered by a gap command.
EOF

cat >"$CHECKS_FILE" <<EOF
# check_id	modes	command	description
check_a	full	$TMP_DIR/check_a.sh	First fixture check.
check_b	full	$TMP_DIR/check_b.sh	Second fixture check.
ci_final_gate	full	$ROOT/tools/ci-final-gate	Final gate fixture.
EOF

cat >"$GROUPS_FILE" <<'EOF'
# check_id	parallel_group	execution_kind	description
check_a	fixture	parallel	Fixture check can run in parallel.
check_b	fixture	parallel	Fixture check can run in parallel.
ci_final_gate	final	final-gate	Fixture final gate.
EOF

run_git_hooks() {
  LESSON_ROOT="$TEST_REPO" \
  GIT_HOOKS_POLICY_FILE="$POLICY_FILE" \
  GIT_HOOKS_SETTINGS_FILE="$SETTINGS_FILE" \
  GIT_HOOKS_CHECKS_FILE="$CHECKS_FILE" \
  GIT_HOOKS_PARALLEL_GROUPS_FILE="$GROUPS_FILE" \
  GIT_HOOKS_RECOMMENDATION_PATHS_FILE="$RECOMMENDATION_FILE" \
  CI_EVIDENCE_DIR="$EVIDENCE_DIR" \
  CI_FINAL_GATE_GAP_COMMANDS_FILE="$GAP_FILE" \
  CI_FINAL_GATE_COVERAGE_FILE="$COVERAGE_FILE" \
  CI_FINAL_GATE_AGGREGATE_FILE="$AGGREGATE_FILE" \
  VERIFICATION_EVIDENCE_SCHEMA_FILE="$ROOT/docs/workflow/FINAL_GATE_EVIDENCE_SCHEMA.tsv" \
  VERIFICATION_EXECUTION_POLICY_FILE="$ROOT/docs/workflow/FINAL_GATE_EXECUTION_POLICY.tsv" \
  RESOURCE_GUARD_SKIP_LOCAL_CHECK="1" \
  "$ROOT/tools/git-hooks" "$@"
}

run_final_gate() {
  LESSON_ROOT="$TEST_REPO" \
  GIT_HOOKS_POLICY_FILE="$POLICY_FILE" \
  GIT_HOOKS_SETTINGS_FILE="$SETTINGS_FILE" \
  GIT_HOOKS_CHECKS_FILE="$CHECKS_FILE" \
  GIT_HOOKS_PARALLEL_GROUPS_FILE="$GROUPS_FILE" \
  GIT_HOOKS_RECOMMENDATION_PATHS_FILE="$RECOMMENDATION_FILE" \
  CI_EVIDENCE_DIR="$EVIDENCE_DIR" \
  CI_EVIDENCE_RUN_ID="${TEST_RUN_ID:-standalone-run}" \
  CI_FINAL_GATE_REQUIRE_HOOK_EVIDENCE="${TEST_FINAL_GATE_REQUIRE_HOOK_EVIDENCE:-0}" \
  CI_FINAL_GATE_GAP_COMMANDS_FILE="$GAP_FILE" \
  CI_FINAL_GATE_COVERAGE_FILE="$COVERAGE_FILE" \
  CI_FINAL_GATE_AGGREGATE_FILE="$AGGREGATE_FILE" \
  CI_FINAL_GATE_FALLBACK_ARGV_JSON="[\"$TMP_DIR/fallback.sh\"]" \
  VERIFICATION_EXECUTION_POLICY_FILE="$ROOT/docs/workflow/FINAL_GATE_EXECUTION_POLICY.tsv" \
  "$ROOT/tools/ci-final-gate" "$@"
}

run_output="$(run_git_hooks run --mode full --no-cache --jobs 2)"
[[ "$run_output" == *"CI final gate passed with same-run Git hook evidence."* ]]
[[ "$(cat "$GAP_COUNT")" == "1" ]]
[[ "$(cat "$GAP_SHORT_COUNT")" == "1" ]]
[[ ! -f "$FALLBACK_COUNT" ]]

rm -rf "$EVIDENCE_DIR"
fallback_output="$(run_final_gate)"
[[ "$fallback_output" == *"CI final gate passed with aggregate fallback."* ]]
[[ "$(cat "$FALLBACK_COUNT")" == "1" ]]

rm -rf "$EVIDENCE_DIR"
if TEST_FINAL_GATE_REQUIRE_HOOK_EVIDENCE=1 run_final_gate >/dev/null 2>&1; then
  printf 'strict final gate accepted missing hook evidence\n' >&2
  exit 1
fi

cat >"$AGGREGATE_FILE" <<'EOF'
#!/usr/bin/env bash
set -euo pipefail
./tools/check_a.sh
./tools/uncovered.sh
EOF
if run_final_gate >/tmp/final-gate-uncovered.out 2>&1; then
  printf 'uncovered aggregate requirement passed unexpectedly\n' >&2
  exit 1
fi
grep 'missing final-gate coverage for aggregate requirement: ./tools/uncovered.sh' /tmp/final-gate-uncovered.out >/dev/null
if run_final_gate --gap-only >/tmp/final-gate-gap-only-uncovered.out 2>&1; then
  printf 'gap-only accepted uncovered aggregate requirement unexpectedly\n' >&2
  exit 1
fi
grep 'missing final-gate coverage for aggregate requirement: ./tools/uncovered.sh' /tmp/final-gate-gap-only-uncovered.out >/dev/null

cat >"$AGGREGATE_FILE" <<'EOF'
#!/usr/bin/env bash
set -euo pipefail
./tools/check_a.sh
./tools/check_b.sh
./tools/gap.sh
./tools/resource-guard summary --short >/dev/null
EOF

gap_only_output="$(run_final_gate --gap-only)"
[[ "$gap_only_output" == *"CI final gate gap-only coverage and commands passed."* ]]

cat >"$GAP_FILE" <<'EOF'
# command_id	argv	output	description
malformed_gap		inherit	Malformed gap command must fail closed.
EOF
if run_final_gate --gap-only >/dev/null 2>&1; then
  printf 'malformed final-gate gap row passed unexpectedly\n' >&2
  exit 1
fi

printf 'CI final gate tests passed.\n'
