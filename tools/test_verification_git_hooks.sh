#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

dry_run="$TMP_DIR/current-plan.json"
node "$ROOT/tools/verification-runner" git-hooks --mode full --jobs 4 --no-cache --dry-run >"$dry_run"
node -e '
  const fs = require("node:fs");
  const plan = JSON.parse(fs.readFileSync(process.argv[1], "utf8"));
  if (plan.compatibility_count !== plan.compatibility_ids.length) process.exit(1);
  if (plan.execution_count !== plan.execution_ids.length) process.exit(1);
  if (new Set(plan.compatibility_ids).size !== plan.compatibility_ids.length) process.exit(1);
  if (!plan.provided.some((row) => row.id === "check_as_built_sync_contract" && row.owner === "check_as_built_docs")) process.exit(1);
  if (plan.execution_ids.includes("check_as_built_sync_contract")) process.exit(1);
' "$dry_run"

TEST_REPO="$TMP_DIR/repo"
mkdir -p "$TEST_REPO"
git -C "$TEST_REPO" init -q
git -C "$TEST_REPO" config user.name "Verification Hook Test"
git -C "$TEST_REPO" config user.email "verification-hook@example.invalid"
printf 'initial\n' >"$TEST_REPO/README.md"
git -C "$TEST_REPO" add README.md
git -C "$TEST_REPO" commit -q -m fixture

POLICY_FILE="$TMP_DIR/git-hooks-policy.tsv"
SETTINGS_FILE="$TMP_DIR/git-hooks-settings.tsv"
CHECKS_FILE="$TMP_DIR/git-hooks-checks.tsv"
GROUPS_FILE="$TMP_DIR/git-hooks-groups.tsv"
RECOMMENDATION_FILE="$TMP_DIR/git-hooks-recommendations.tsv"
COVERAGE_FILE="$TMP_DIR/final-coverage.tsv"
GAP_FILE="$TMP_DIR/final-gaps.tsv"
EVIDENCE_DIR="$TMP_DIR/evidence"
FINAL_MARKER="$TMP_DIR/final-ran"

cat >"$POLICY_FILE" <<'EOF'
# key	allowed_values	default_value	label	description
hook_mode	full|fast|minimal	full	Mode	Fixture policy.
EOF
printf '# key\tvalue\nhook_mode\tfull\n' >"$SETTINGS_FILE"
printf '# pattern\trecommendation\treason\n' >"$RECOMMENDATION_FILE"
printf '# aggregate_requirement\tcoverage_kind\tcoverage_id\tdescription\n' >"$COVERAGE_FILE"
printf '# command_id\targv\toutput\tdescription\n' >"$GAP_FILE"

cat >"$TMP_DIR/mutate.sh" <<EOF
#!/usr/bin/env bash
set -euo pipefail
printf 'mutated\n' >"$TEST_REPO/README.md"
EOF
cat >"$TMP_DIR/final.sh" <<EOF
#!/usr/bin/env bash
set -euo pipefail
printf 'ran\n' >"$FINAL_MARKER"
EOF
cat >"$TMP_DIR/pass.sh" <<'EOF'
#!/usr/bin/env bash
set -euo pipefail
printf 'pass\n'
EOF
chmod +x "$TMP_DIR/mutate.sh" "$TMP_DIR/final.sh" "$TMP_DIR/pass.sh"

cat >"$CHECKS_FILE" <<EOF
# check_id	modes	command	description
mutate	full	$TMP_DIR/mutate.sh	Mutate tracked input.
final	full	$TMP_DIR/final.sh	Final task must not run after mutation.
EOF
cat >"$GROUPS_FILE" <<'EOF'
# check_id	parallel_group	execution_kind	description
mutate	fixture	parallel	Mutation fixture.
final	final	final-gate	Final fixture.
EOF

run_hooks() {
  LESSON_ROOT="$TEST_REPO" \
  GIT_HOOKS_POLICY_FILE="$POLICY_FILE" \
  GIT_HOOKS_SETTINGS_FILE="$SETTINGS_FILE" \
  GIT_HOOKS_CHECKS_FILE="$CHECKS_FILE" \
  GIT_HOOKS_PARALLEL_GROUPS_FILE="$GROUPS_FILE" \
  GIT_HOOKS_RECOMMENDATION_PATHS_FILE="$RECOMMENDATION_FILE" \
  CI_FINAL_GATE_COVERAGE_FILE="$COVERAGE_FILE" \
  CI_FINAL_GATE_GAP_COMMANDS_FILE="$GAP_FILE" \
  CI_EVIDENCE_DIR="$EVIDENCE_DIR" \
  VERIFICATION_EVIDENCE_SCHEMA_FILE="$ROOT/docs/workflow/FINAL_GATE_EVIDENCE_SCHEMA.tsv" \
  RESOURCE_GUARD_SKIP_LOCAL_CHECK=1 \
  GIT_HOOKS_EXECUTION_ENGINE="${TEST_ENGINE:-enforce}" \
  "$ROOT/tools/git-hooks" run --mode full --no-cache --jobs 2
}

if run_hooks >"$TMP_DIR/mutation.out" 2>&1; then
  printf 'composed Git hooks accepted a tracked repository mutation\n' >&2
  exit 1
fi
grep 'Repository inputs changed during composed verification' "$TMP_DIR/mutation.out" >/dev/null
[[ ! -e "$FINAL_MARKER" ]]
if [[ -d "$EVIDENCE_DIR" ]] && find "$EVIDENCE_DIR" -type f -name '*.evidence' -print -quit | grep -q .; then
  printf 'composed Git hooks wrote authoritative evidence after repository mutation\n' >&2
  exit 1
fi

printf 'initial\n' >"$TEST_REPO/README.md"
cat >"$CHECKS_FILE" <<EOF
# check_id	modes	command	description
pass	full	$TMP_DIR/pass.sh	Legacy rollback fixture.
EOF
cat >"$GROUPS_FILE" <<'EOF'
# check_id	parallel_group	execution_kind	description
pass	fixture	parallel	Legacy rollback fixture.
EOF
legacy_output="$(TEST_ENGINE=legacy run_hooks)"
grep 'Git hooks checks passed: full mode (1 checks).' <<<"$legacy_output" >/dev/null

shadow_output="$(TEST_ENGINE=shadow run_hooks)"
grep 'Git hooks checks passed: full mode (1 checks).' <<<"$shadow_output" >/dev/null

if TEST_ENGINE=invalid run_hooks >"$TMP_DIR/invalid-engine.out" 2>&1; then
  printf 'Git hooks accepted an invalid execution engine\n' >&2
  exit 1
fi
grep 'Invalid Git hooks execution engine' "$TMP_DIR/invalid-engine.out" >/dev/null

printf 'Verification Git hook adapter tests passed.\n'
