#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

"$ROOT/tools/lesson-context" validate | grep 'Learner context validation passed.' >/dev/null
"$ROOT/tools/lesson-context" status | grep 'Topics: 19' >/dev/null
"$ROOT/tools/lesson-context" status | grep 'Security topics: 4' >/dev/null
"$ROOT/tools/lesson-context" list --scope lesson-7 | grep 'ai_driven_development' >/dev/null
"$ROOT/tools/lesson-context" opening lesson-14 | grep 'human_agent_roles' >/dev/null
"$ROOT/tools/lesson-context" step lesson-7 day1.mode | grep 'Step: day1.mode' >/dev/null
"$ROOT/tools/lesson-context" recap applied | grep 'workflow applies to the learner' >/dev/null
"$ROOT/tools/lesson-context" summary --scope security | grep 'Required or yes topics: 4' >/dev/null
"$ROOT/tools/lesson-context" show git_ci | grep 'Title: Git, GitHub, and CI' >/dev/null
"$ROOT/tools/lesson-context" workflow external-integration | grep 'External approval required: true' >/dev/null

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
