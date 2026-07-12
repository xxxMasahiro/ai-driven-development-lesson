#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

TEST_REPO="$TMP_DIR/repo"
EVIDENCE_DIR="$TMP_DIR/evidence"
mkdir -p "$TEST_REPO"
git -C "$TEST_REPO" init -q
git -C "$TEST_REPO" config user.name "CI Evidence Test"
git -C "$TEST_REPO" config user.email "ci-evidence@example.com"
printf 'input\n' >"$TEST_REPO/input.txt"
git -C "$TEST_REPO" add input.txt
git -C "$TEST_REPO" commit -q -m "Initial evidence fixture"

run_evidence() {
  LESSON_ROOT="$TEST_REPO" \
  CI_EVIDENCE_DIR="$EVIDENCE_DIR" \
  CI_EVIDENCE_RUN_ID="${TEST_RUN_ID:-run-1}" \
  GITHUB_WORKFLOW="Evidence Test" \
  GITHUB_JOB="${TEST_JOB_ID:-evidence-job}" \
  "$ROOT/tools/ci-evidence" "$@"
}

run_evidence status >/dev/null
run_evidence record sample --command command-v1 --inputs input.txt >/dev/null
run_evidence verify sample --command command-v1 --inputs input.txt >/dev/null
run_evidence record 'git-hook:sample_check' --command command-v1 --inputs input.txt >/dev/null
run_evidence verify 'git-hook:sample_check' --command command-v1 --inputs input.txt >/dev/null

if find "$EVIDENCE_DIR" -name '*:*' -print -quit | grep -q .; then
  printf 'artifact-unsafe evidence filename was created\n' >&2
  exit 1
fi
if ! grep -R -F 'id=git-hook:sample_check' "$EVIDENCE_DIR" >/dev/null; then
  printf 'original evidence id was not preserved in metadata\n' >&2
  exit 1
fi

if run_evidence verify sample --command command-v2 --inputs input.txt >/dev/null 2>&1; then
  printf 'command-mismatched evidence verified unexpectedly\n' >&2
  exit 1
fi

printf 'changed\n' >"$TEST_REPO/input.txt"
if run_evidence verify sample --command command-v1 --inputs input.txt >/dev/null 2>&1; then
  printf 'input-mismatched evidence verified unexpectedly\n' >&2
  exit 1
fi
printf 'input\n' >"$TEST_REPO/input.txt"

if TEST_RUN_ID="run-2" run_evidence verify sample --command command-v1 --inputs input.txt >/dev/null 2>&1; then
  printf 'run-mismatched evidence verified unexpectedly\n' >&2
  exit 1
fi

if run_evidence verify missing --command command-v1 --inputs input.txt >/dev/null 2>&1; then
  printf 'missing evidence verified unexpectedly\n' >&2
  exit 1
fi

BROKEN_DIR="$TMP_DIR/broken-evidence"
mkdir -p "$BROKEN_DIR"
printf 'not marked\n' >"$BROKEN_DIR/file.txt"
if LESSON_ROOT="$TEST_REPO" \
  CI_EVIDENCE_DIR="$BROKEN_DIR" \
  CI_EVIDENCE_RUN_ID="run-1" \
  "$ROOT/tools/ci-evidence" record broken --command command-v1 --inputs input.txt >/dev/null 2>&1; then
  printf 'unmarked non-empty evidence directory was accepted\n' >&2
  exit 1
fi

mkdir -p "$TEST_REPO/docs/workflow"
for authority in \
  FINAL_GATE_EXECUTION_POLICY.tsv \
  FINAL_GATE_EVIDENCE_SCHEMA.tsv \
  GIT_HOOK_CHECKS.tsv \
  GIT_HOOK_PARALLEL_GROUPS.tsv \
  FINAL_GATE_COVERAGE.tsv \
  FINAL_GATE_GAP_COMMANDS.tsv
do
  cp "$ROOT/docs/workflow/$authority" "$TEST_REPO/docs/workflow/$authority"
done
run_evidence record version-two --command command-v2 --inputs input.txt >/dev/null
v2_receipt="$(find "$EVIDENCE_DIR/v2" -type f -name receipt.json -print -quit)"
if [[ -z "$v2_receipt" || ! -f "$v2_receipt" ]]; then
  printf 'version 2 evidence receipt was not recorded in record-only mode\n' >&2
  exit 1
fi
node -e '
  const fs = require("node:fs");
  const receipt = JSON.parse(fs.readFileSync(process.argv[1], "utf8"));
  if (receipt.schema_version !== "2.0.0" || receipt.status !== "success") process.exit(1);
  for (const forbidden of ["raw_log", "environment_dump", "secret_value", "absolute_path"]) {
    if (Object.hasOwn(receipt, forbidden)) process.exit(1);
  }
' "$v2_receipt"

printf 'CI evidence tests passed.\n'
