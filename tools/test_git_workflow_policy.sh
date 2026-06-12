#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

unset GIT_DIR GIT_WORK_TREE GIT_INDEX_FILE GIT_PREFIX

export GIT_WORKFLOW_SETTINGS_FILE="$TMP_DIR/settings.tsv"
export GIT_WORKFLOW_APPROVALS_FILE="$TMP_DIR/approvals.tsv"

assert_contains() {
  local haystack="$1"
  local needle="$2"
  if [[ "$haystack" != *"$needle"* ]]; then
    printf 'Expected output to contain: %s\n' "$needle" >&2
    printf 'Actual output:\n%s\n' "$haystack" >&2
    exit 1
  fi
}

assert_fails() {
  if "$@" >/tmp/git-workflow-policy-test.out 2>/tmp/git-workflow-policy-test.err; then
    printf 'Expected command to fail: %s\n' "$*" >&2
    exit 1
  fi
}

status_output="$("$ROOT/tools/git-workflow" status --repo "$ROOT")"
assert_contains "$status_output" "Git workflow policy status"
assert_contains "$status_output" "Approval file: $TMP_DIR/approvals.tsv"
assert_contains "$status_output" "branch_allowed: true"
assert_contains "$status_output" "worktree_allowed: false"
assert_contains "$status_output" "automation_level: manual"
assert_contains "$status_output" "commit_automation: auto"
assert_contains "$status_output" "push_automation: manual"
assert_contains "$status_output" "pr_creation: manual"
assert_contains "$status_output" "pr_ci_monitoring: auto"
assert_contains "$status_output" "merge_execution: after_approval"
assert_contains "$status_output" "developer_auto_merge_allowed: false"
assert_contains "$status_output" "main_ci_monitoring: auto"
assert_contains "$status_output" "sync_monitoring: auto"
assert_contains "$status_output" "Action modes"
assert_contains "$status_output" "commit: manual"
assert_contains "$status_output" "push: manual"
assert_contains "$status_output" "PR creation: manual"
assert_contains "$status_output" "PR CI monitoring: manual"
assert_contains "$status_output" "merge execution: manual"
assert_contains "$status_output" "developer auto-merge allowed: false"
assert_contains "$status_output" "main CI monitoring: manual"
assert_contains "$status_output" "sync monitoring: manual"
assert_contains "$status_output" "Repository context: lesson"

assert_fails "$ROOT/tools/git-workflow" set branch_allowed false

RECOVERY_SETTINGS="$TMP_DIR/recovery-settings.tsv"
cat >"$RECOVERY_SETTINGS" <<'DOC'
# key	value
branch_allowed	false
worktree_allowed	false
main_direct_work_allowed	false
pr_creation	auto
pr_ci_monitoring	auto
merge_execution	after_approval
DOC
if GIT_WORKFLOW_SETTINGS_FILE="$RECOVERY_SETTINGS" "$ROOT/tools/git-workflow" set sync_monitoring manual >/dev/null 2>&1; then
  printf 'Git workflow must reject unrelated writes while persisted settings remain inconsistent.\n' >&2
  exit 1
fi
assert_fails env GIT_WORKFLOW_SETTINGS_FILE="$RECOVERY_SETTINGS" "$ROOT/tools/git-workflow" allow pr-ci
GIT_WORKFLOW_SETTINGS_FILE="$RECOVERY_SETTINGS" "$ROOT/tools/git-workflow" set pr_creation manual >/dev/null
grep $'pr_creation\tmanual' "$RECOVERY_SETTINGS" >/dev/null
GIT_WORKFLOW_SETTINGS_FILE="$RECOVERY_SETTINGS" "$ROOT/tools/git-workflow" set branch_allowed true >/dev/null
grep $'branch_allowed\ttrue' "$RECOVERY_SETTINGS" >/dev/null

BLOCKED_ALLOW_SETTINGS="$TMP_DIR/blocked-allow-settings.tsv"
cat >"$BLOCKED_ALLOW_SETTINGS" <<'DOC'
# key	value
branch_allowed	false
worktree_allowed	true
main_direct_work_allowed	true
pr_creation	manual
pr_ci_monitoring	manual
merge_execution	manual
DOC
assert_fails env GIT_WORKFLOW_SETTINGS_FILE="$BLOCKED_ALLOW_SETTINGS" "$ROOT/tools/git-workflow" allow worktree
cat >"$BLOCKED_ALLOW_SETTINGS" <<'DOC'
# key	value
branch_allowed	false
worktree_allowed	false
main_direct_work_allowed	true
pr_creation	manual
pr_ci_monitoring	auto
merge_execution	manual
DOC
assert_fails env GIT_WORKFLOW_SETTINGS_FILE="$BLOCKED_ALLOW_SETTINGS" "$ROOT/tools/git-workflow" allow pr-ci
cat >"$BLOCKED_ALLOW_SETTINGS" <<'DOC'
# key	value
branch_allowed	false
worktree_allowed	false
main_direct_work_allowed	true
pr_creation	manual
pr_ci_monitoring	manual
merge_execution	after_approval
DOC
assert_fails env GIT_WORKFLOW_SETTINGS_FILE="$BLOCKED_ALLOW_SETTINGS" "$ROOT/tools/git-workflow" allow merge

"$ROOT/tools/git-workflow" set automation_level pr_ci >/dev/null
assert_contains "$("$ROOT/tools/git-workflow" status --repo "$ROOT")" "automation_level: pr_ci"
"$ROOT/tools/git-workflow" allow commit >/dev/null
"$ROOT/tools/git-workflow" allow push >/dev/null
"$ROOT/tools/git-workflow" allow pr >/dev/null
"$ROOT/tools/git-workflow" allow ci >/dev/null
"$ROOT/tools/git-workflow" allow pr-ci >/dev/null
assert_fails "$ROOT/tools/git-workflow" allow main-ci
assert_fails "$ROOT/tools/git-workflow" allow sync
assert_fails "$ROOT/tools/git-workflow" allow developer-auto-merge

"$ROOT/tools/git-workflow" set commit_automation manual >/dev/null
assert_fails "$ROOT/tools/git-workflow" allow commit
"$ROOT/tools/git-workflow" set commit_automation auto >/dev/null
"$ROOT/tools/git-workflow" allow commit >/dev/null

"$ROOT/tools/git-workflow" set push_automation manual >/dev/null
assert_fails "$ROOT/tools/git-workflow" allow push
"$ROOT/tools/git-workflow" set push_automation auto >/dev/null
assert_fails "$ROOT/tools/git-workflow" allow push
"$ROOT/tools/git-workflow" approve push "User approved push" >/dev/null
"$ROOT/tools/git-workflow" allow push >/dev/null

"$ROOT/tools/git-workflow" set pr_creation manual >/dev/null
assert_fails "$ROOT/tools/git-workflow" allow pr
"$ROOT/tools/git-workflow" set pr_creation auto >/dev/null
assert_fails "$ROOT/tools/git-workflow" allow pr
"$ROOT/tools/git-workflow" approve pr "User approved PR creation" >/dev/null
"$ROOT/tools/git-workflow" allow pr >/dev/null

"$ROOT/tools/git-workflow" set pr_ci_monitoring manual >/dev/null
assert_fails "$ROOT/tools/git-workflow" allow pr-ci
"$ROOT/tools/git-workflow" set pr_ci_monitoring auto >/dev/null
"$ROOT/tools/git-workflow" allow pr-ci >/dev/null

"$ROOT/tools/git-workflow" set main_ci_monitoring auto >/dev/null
"$ROOT/tools/git-workflow" allow main-ci >/dev/null
"$ROOT/tools/git-workflow" set sync_monitoring auto >/dev/null
"$ROOT/tools/git-workflow" allow sync >/dev/null

"$ROOT/tools/git-workflow" set merge_execution after_approval >/dev/null
assert_fails "$ROOT/tools/git-workflow" allow merge
"$ROOT/tools/git-workflow" approve merge "User approved merge" >/dev/null
"$ROOT/tools/git-workflow" allow merge >/dev/null
"$ROOT/tools/git-workflow" set merge_execution manual >/dev/null
assert_fails "$ROOT/tools/git-workflow" allow merge
"$ROOT/tools/git-workflow" set merge_execution after_approval >/dev/null
"$ROOT/tools/git-workflow" allow merge >/dev/null
"$ROOT/tools/git-workflow" set developer_auto_merge_allowed true >/dev/null
assert_fails "$ROOT/tools/git-workflow" allow developer-auto-merge
assert_contains "$("$ROOT/tools/git-workflow" status --repo "$ROOT")" "merge execution: after_approval"
assert_fails "$ROOT/tools/git-workflow" set merge_execution auto
assert_fails "$ROOT/tools/git-workflow" set developer_auto_merge_allowed maybe
assert_fails "$ROOT/tools/git-workflow" approve sync "User approved sync"
grep $'push\t' "$GIT_WORKFLOW_APPROVALS_FILE" >/dev/null
grep $'pr\t' "$GIT_WORKFLOW_APPROVALS_FILE" >/dev/null
grep $'merge\t' "$GIT_WORKFLOW_APPROVALS_FILE" >/dev/null

"$ROOT/tools/git-workflow" set worktree_allowed true >/dev/null
"$ROOT/tools/git-workflow" allow worktree >/dev/null
assert_fails "$ROOT/tools/git-workflow" set worktree_allowed maybe
assert_fails "$ROOT/tools/git-workflow" set unknown_setting true

ORIGIN="$TMP_DIR/origin.git"
REPO="$TMP_DIR/repo"
git init --bare "$ORIGIN" >/dev/null
git init "$REPO" >/dev/null
git -C "$REPO" config user.name "Git Workflow Test"
git -C "$REPO" config user.email "git-workflow-test@example.com"
printf 'initial\n' >"$REPO/file.txt"
git -C "$REPO" add file.txt
git -C "$REPO" commit -m "Initial commit" >/dev/null
git -C "$REPO" branch -M main
git -C "$REPO" remote add origin "$ORIGIN"
git -C "$REPO" push -u origin main >/dev/null

GATES="$TMP_DIR/developer-auto-merge-gates.tsv"
{
  printf '# key\tvalue\n'
  printf 'pr_ci_success\ttrue\n'
  printf 'target_pr_clear\ttrue\n'
  printf 'target_branch_clear\ttrue\n'
  printf 'merge_base_verified\ttrue\n'
  printf 'local_remote_checked\ttrue\n'
  printf 'failure_stop_enabled\ttrue\n'
} >"$GATES"
"$ROOT/tools/git-workflow" set merge_execution manual >/dev/null
GIT_WORKFLOW_DEVELOPER_AUTO_MERGE_GATES_FILE="$GATES" \
  "$ROOT/tools/git-workflow" status --repo "$REPO" | grep 'merge execution: developer_auto' >/dev/null
(
  cd "$REPO"
  GIT_WORKFLOW_DEVELOPER_AUTO_MERGE_GATES_FILE="$GATES" "$ROOT/tools/git-workflow" allow developer-auto-merge >/dev/null
  GIT_WORKFLOW_DEVELOPER_AUTO_MERGE_GATES_FILE="$GATES" "$ROOT/tools/git-workflow" allow merge >/dev/null
)
printf 'unsafe\n' >"$REPO/unsafe.txt"
if (
  cd "$REPO"
  GIT_WORKFLOW_DEVELOPER_AUTO_MERGE_GATES_FILE="$GATES" "$ROOT/tools/git-workflow" allow developer-auto-merge >/dev/null 2>/tmp/git-workflow-policy-test.err
); then
  printf 'Developer auto-merge should fail when the working tree is dirty.\n' >&2
  exit 1
fi
rm "$REPO/unsafe.txt"

check_output="$("$ROOT/tools/git-workflow" check --repo "$REPO")"
assert_contains "$check_output" "Repository context: custom"
assert_contains "$check_output" "Working tree: clean"
assert_contains "$check_output" "Ahead: 0"
assert_contains "$check_output" "Behind: 0"

printf 'untracked\n' >"$REPO/untracked.txt"
assert_fails "$ROOT/tools/git-workflow" check --repo "$REPO"
rm "$REPO/untracked.txt"

printf 'dirty\n' >>"$REPO/file.txt"
assert_fails "$ROOT/tools/git-workflow" check --repo "$REPO"
git -C "$REPO" restore file.txt

PROJECTS="$TMP_DIR/projects"
PRODUCT_WT="$PROJECTS/product-linked"
CONFIG="$TMP_DIR/lesson-config.tsv"
mkdir -p "$PROJECTS"
git -C "$REPO" worktree add "$PRODUCT_WT" -b product-linked >/dev/null
{
  printf '# key\tvalue\n'
  printf 'product_repo_name\tproduct-linked\n'
  printf 'project_root\t%s\n' "$PROJECTS"
} >"$CONFIG"
product_output="$(LESSON_CONFIG="$CONFIG" "$ROOT/tools/git-workflow" status --repo "$PRODUCT_WT")"
assert_contains "$product_output" "Repository context: product"

git -C "$REPO" branch old-merged-branch
cleanup_output="$("$ROOT/tools/git-workflow" cleanup-plan --repo "$REPO")"
assert_contains "$cleanup_output" "Git cleanup plan"
assert_contains "$cleanup_output" "old-merged-branch"
assert_contains "$cleanup_output" "No deletion is performed by this command."

git -C "$REPO" checkout --detach HEAD >/dev/null
detached_cleanup_output="$("$ROOT/tools/git-workflow" cleanup-plan --repo "$REPO")"
if [[ "$detached_cleanup_output" == *"(HEAD"* ]]; then
  printf 'Detached HEAD pseudo-branch appeared in cleanup output:\n%s\n' "$detached_cleanup_output" >&2
  exit 1
fi
git -C "$REPO" switch main >/dev/null

git -C "$REPO" switch -c stale-upstream >/dev/null
git -C "$REPO" push -u origin stale-upstream >/dev/null
git -C "$REPO" switch main >/dev/null
git -C "$REPO" push origin --delete stale-upstream >/dev/null
git -C "$REPO" switch stale-upstream >/dev/null
assert_fails "$ROOT/tools/git-workflow" check --repo "$REPO"
git -C "$REPO" switch main >/dev/null
git -C "$REPO" branch -D stale-upstream >/dev/null

printf 'ahead\n' >>"$REPO/file.txt"
git -C "$REPO" add file.txt
git -C "$REPO" commit -m "Ahead commit" >/dev/null
assert_fails "$ROOT/tools/git-workflow" check --repo "$REPO"

printf 'Git workflow policy tests passed.\n'
