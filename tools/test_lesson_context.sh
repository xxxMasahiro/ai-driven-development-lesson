#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

assert_command_contains() {
  local label="$1"
  local expected="$2"
  shift 2
  local output
  output="$("$@")" || {
    printf 'lesson-context command failed: %s\n' "$label" >&2
    return 1
  }
  if ! grep -Fq "$expected" <<<"$output"; then
    printf 'lesson-context output mismatch: %s\n' "$label" >&2
    printf 'expected: %s\n' "$expected" >&2
    printf 'actual output:\n%s\n' "$output" >&2
    return 1
  fi
}

assert_command_contains "validate" "Learner context validation passed." "$ROOT/tools/lesson-context" validate
assert_command_contains "status topic count" "Topics: 19" "$ROOT/tools/lesson-context" status
assert_command_contains "status security count" "Security topics: 4" "$ROOT/tools/lesson-context" status
assert_command_contains "lesson-7 list" "ai_driven_development" "$ROOT/tools/lesson-context" list --scope lesson-7
assert_command_contains "lesson-14 opening" "human_agent_roles" "$ROOT/tools/lesson-context" opening lesson-14
assert_command_contains "lesson-7 step" "Step: day1.mode" "$ROOT/tools/lesson-context" step lesson-7 day1.mode
assert_command_contains "applied recap" "workflow applies to the learner" "$ROOT/tools/lesson-context" recap applied
assert_command_contains "security summary" "Required or yes topics: 4" "$ROOT/tools/lesson-context" summary --scope security
assert_command_contains "git ci detail" "Title: Git, GitHub, and CI" "$ROOT/tools/lesson-context" show git_ci
assert_command_contains "external integration workflow" "External approval required: true" "$ROOT/tools/lesson-context" workflow external-integration

bad_map="$TMP_DIR/bad-context-map.tsv"
awk -F '\t' -v OFS='\t' 'NR == 2 { $6 = "bogus" } { print }' "$ROOT/learning/context/LESSON_CONTEXT_MAP.tsv" >"$bad_map"
if LESSON_CONTEXT_MAP_FILE="$bad_map" "$ROOT/tools/lesson-context" validate >"$TMP_DIR/bad.out" 2>&1; then
  printf 'invalid learner context map passed unexpectedly\n' >&2
  exit 1
fi
grep 'invalid learner context lesson value' "$TMP_DIR/bad.out" >/dev/null

bad_workflow="$TMP_DIR/bad-workflow-map.tsv"
awk -F '\t' -v OFS='\t' 'NR == 2 { $4 = "maybe" } { print }' "$ROOT/learning/context/WORKFLOW_CONTEXT_MAP.tsv" >"$bad_workflow"
if LESSON_WORKFLOW_CONTEXT_MAP_FILE="$bad_workflow" "$ROOT/tools/lesson-context" validate >"$TMP_DIR/bad-workflow.out" 2>&1; then
  printf 'invalid workflow context map passed unexpectedly\n' >&2
  exit 1
fi
grep 'invalid workflow context product_repo_required' "$TMP_DIR/bad-workflow.out" >/dev/null

printf 'Lesson context tests passed.\n'
