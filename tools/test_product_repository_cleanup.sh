#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

assert_contains() {
  local haystack="$1"
  local needle="$2"
  if [[ "$haystack" != *"$needle"* ]]; then
    printf 'Expected output to contain: %s\n' "$needle" >&2
    printf 'Actual output:\n%s\n' "$haystack" >&2
    exit 1
  fi
}

assert_fails_with() {
  local expected="$1"
  shift
  local output

  set +e
  output="$("$@" 2>&1)"
  local status=$?
  set -e

  if [[ $status -eq 0 ]]; then
    printf 'Expected command to fail, but it succeeded: %s\n' "$*" >&2
    exit 1
  fi
  assert_contains "$output" "$expected"
}

write_config() {
  local config_path="$1"
  local project_root="$2"
  local product_name="$3"
  cat >"$config_path" <<EOF
project_root	$project_root
product_repo_name	$product_name
display_language	en
development_language	en
learning_mode	guide
EOF
}

create_git_repo() {
  local repo_path="$1"
  mkdir -p "$repo_path"
  git -C "$repo_path" init -q
  git -C "$repo_path" remote add origin "https://github.com/xxxMasahiro/$(basename "$repo_path").git"
}

make_fake_gh() {
  local bin_dir="$1"
  local log_path="$2"
  mkdir -p "$bin_dir"
  cat >"$bin_dir/gh" <<'EOF'
#!/usr/bin/env bash
set -euo pipefail

case "${1:-}" in
  auth)
    exit 0
    ;;
  repo)
    case "${2:-}" in
      view)
        printf 'https://github.com/%s\n' "${3:-}"
        ;;
      delete)
        printf 'delete %s\n' "${3:-}" >>"${FAKE_GH_LOG:?}"
        ;;
      *)
        exit 1
        ;;
    esac
    ;;
  *)
    exit 1
    ;;
esac
EOF
  chmod +x "$bin_dir/gh"
  : >"$log_path"
}

CONFIG="$TMP_DIR/lesson.conf"
PROJECT_ROOT="$TMP_DIR/projects"
PRODUCT_NAME="sample-product"
PRODUCT_REPO="$PROJECT_ROOT/$PRODUCT_NAME"
write_config "$CONFIG" "$PROJECT_ROOT" "$PRODUCT_NAME"
create_git_repo "$PRODUCT_REPO"

status_output="$(LESSON_CONFIG="$CONFIG" "$ROOT/tools/product-repository-cleanup" status)"
assert_contains "$status_output" "Product repository cleanup status"
assert_contains "$status_output" "Configured product repository name: $PRODUCT_NAME"
assert_contains "$status_output" "Local product repository: exists"
assert_contains "$status_output" "Boundary check: target is outside the lesson repository"

plan_output="$(LESSON_CONFIG="$CONFIG" "$ROOT/tools/product-repository-cleanup" plan)"
assert_contains "$plan_output" "Product repository cleanup plan"
assert_contains "$plan_output" "Nothing is deleted by the plan command."
assert_contains "$plan_output" "local --confirm $PRODUCT_NAME"
[[ -d "$PRODUCT_REPO" ]] || {
  printf 'Plan command must not delete the local product repository.\n' >&2
  exit 1
}

assert_fails_with "confirmation is required" env LESSON_CONFIG="$CONFIG" "$ROOT/tools/product-repository-cleanup" local
assert_fails_with "local cleanup confirmation must match" env LESSON_CONFIG="$CONFIG" "$ROOT/tools/product-repository-cleanup" local --confirm wrong-name

NESTED_CONFIG="$TMP_DIR/nested.conf"
write_config "$NESTED_CONFIG" "$ROOT" "nested-product"
assert_fails_with "inside the lesson repository" env LESSON_CONFIG="$NESTED_CONFIG" "$ROOT/tools/product-repository-cleanup" local --confirm nested-product

ANCESTOR_BASE="$TMP_DIR/ancestor"
ANCESTOR_PRODUCT_NAME="container"
ANCESTOR_PRODUCT="$ANCESTOR_BASE/$ANCESTOR_PRODUCT_NAME"
ANCESTOR_LESSON_ROOT="$ANCESTOR_PRODUCT/lesson"
ANCESTOR_CONFIG="$TMP_DIR/ancestor.conf"
mkdir -p "$ANCESTOR_LESSON_ROOT"
git -C "$ANCESTOR_PRODUCT" init -q
write_config "$ANCESTOR_CONFIG" "$ANCESTOR_BASE" "$ANCESTOR_PRODUCT_NAME"
assert_fails_with "contains the lesson repository" env LESSON_ROOT="$ANCESTOR_LESSON_ROOT" LESSON_CONFIG="$ANCESTOR_CONFIG" "$ROOT/tools/product-repository-cleanup" local --confirm "$ANCESTOR_PRODUCT_NAME"
[[ -d "$ANCESTOR_LESSON_ROOT" ]] || {
  printf 'Ancestor rejection must not delete the lesson repository.\n' >&2
  exit 1
}

NON_GIT_CONFIG="$TMP_DIR/non-git.conf"
NON_GIT_ROOT="$TMP_DIR/non-git-projects"
write_config "$NON_GIT_CONFIG" "$NON_GIT_ROOT" "non-git-product"
mkdir -p "$NON_GIT_ROOT/non-git-product"
assert_fails_with "not a Git repository" env LESSON_CONFIG="$NON_GIT_CONFIG" "$ROOT/tools/product-repository-cleanup" local --confirm non-git-product

FAKE_BIN="$TMP_DIR/bin"
FAKE_LOG="$TMP_DIR/gh.log"
make_fake_gh "$FAKE_BIN" "$FAKE_LOG"

assert_fails_with "remote cleanup confirmation must match" env PATH="$FAKE_BIN:$PATH" FAKE_GH_LOG="$FAKE_LOG" LESSON_CONFIG="$CONFIG" "$ROOT/tools/product-repository-cleanup" remote --confirm xxxMasahiro/wrong-name

remote_output="$(PATH="$FAKE_BIN:$PATH" FAKE_GH_LOG="$FAKE_LOG" LESSON_CONFIG="$CONFIG" "$ROOT/tools/product-repository-cleanup" remote --confirm xxxMasahiro/sample-product)"
assert_contains "$remote_output" "Product repository remote cleanup"
assert_contains "$remote_output" "Remote product repository deleted: xxxMasahiro/sample-product"
assert_contains "$(cat "$FAKE_LOG")" "delete xxxMasahiro/sample-product"
[[ -d "$PRODUCT_REPO" ]] || {
  printf 'Remote cleanup must not delete the local product repository.\n' >&2
  exit 1
}

MISMATCH_ROOT="$TMP_DIR/mismatch-projects"
MISMATCH_NAME="mismatch-product"
MISMATCH_REPO="$MISMATCH_ROOT/$MISMATCH_NAME"
MISMATCH_CONFIG="$TMP_DIR/mismatch.conf"
MISMATCH_LESSON_ROOT="$TMP_DIR/mismatch-lesson"
write_config "$MISMATCH_CONFIG" "$MISMATCH_ROOT" "$MISMATCH_NAME"
mkdir -p "$MISMATCH_LESSON_ROOT"
git -C "$MISMATCH_LESSON_ROOT" init -q
git -C "$MISMATCH_LESSON_ROOT" remote add origin "https://github.com/xxxMasahiro/ai-driven-development-lesson.git"
mkdir -p "$MISMATCH_REPO"
git -C "$MISMATCH_REPO" init -q
git -C "$MISMATCH_REPO" remote add origin "https://github.com/xxxMasahiro/ai-driven-development-lesson.git"
mismatch_plan="$(LESSON_ROOT="$MISMATCH_LESSON_ROOT" LESSON_CONFIG="$MISMATCH_CONFIG" "$ROOT/tools/product-repository-cleanup" plan)"
assert_contains "$mismatch_plan" "remote --confirm xxxMasahiro/mismatch-product"
if [[ "$mismatch_plan" == *"remote --confirm xxxMasahiro/ai-driven-development-lesson"* ]]; then
  printf 'Remote cleanup must not trust a mismatched product origin repository name.\n' >&2
  exit 1
fi
assert_fails_with "remote cleanup confirmation must match" env PATH="$FAKE_BIN:$PATH" FAKE_GH_LOG="$FAKE_LOG" LESSON_ROOT="$MISMATCH_LESSON_ROOT" LESSON_CONFIG="$MISMATCH_CONFIG" "$ROOT/tools/product-repository-cleanup" remote --confirm xxxMasahiro/ai-driven-development-lesson

local_output="$(LESSON_CONFIG="$CONFIG" "$ROOT/tools/product-repository-cleanup" local --confirm "$PRODUCT_NAME")"
assert_contains "$local_output" "Product repository local cleanup"
assert_contains "$local_output" "Local product repository deleted"
[[ ! -d "$PRODUCT_REPO" ]] || {
  printf 'Local cleanup should delete only the configured product repository.\n' >&2
  exit 1
}

printf 'Product repository cleanup tests passed.\n'
