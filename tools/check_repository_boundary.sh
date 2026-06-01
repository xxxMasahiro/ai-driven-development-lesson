#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=tools/lib/lesson_common.sh
source "$SCRIPT_DIR/lib/lesson_common.sh"

PROJECT_ROOT="$(lesson_project_root)"
PRODUCT_REPO="$(lesson_product_repo_root)"
PRODUCT_REPO_NAME="$(lesson_product_repo_name)"
CURRENT_DIR="$(pwd)"
GIT_ROOT=""

if command -v git >/dev/null 2>&1; then
  GIT_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || true)"
fi

printf 'Lesson repository root:\n%s\n\n' "$LESSON_ROOT"
printf 'Expected product repository root from lesson config:\n%s\n\n' "$PRODUCT_REPO"
printf 'Current directory:\n%s\n\n' "$CURRENT_DIR"

if [[ -n "$GIT_ROOT" ]]; then
  printf 'Current Git root:\n%s\n\n' "$GIT_ROOT"
else
  printf 'Current Git root:\nnot a git repository\n\n'
fi

case "$CURRENT_DIR/" in
  "$LESSON_ROOT/$PRODUCT_REPO_NAME/"*)
    printf 'ERROR: product repository is inside the lesson repository.\n' >&2
    printf 'Move it to: %s\n' "$PRODUCT_REPO" >&2
    exit 1
    ;;
  "$LESSON_ROOT/"*)
    printf 'Context: lesson repository\n'
    printf 'Allowed edits: lesson files, guides, prompts, templates, playbooks, lesson state, tools.\n'
    ;;
  "$PRODUCT_REPO/"*)
    printf 'Context: product repository\n'
    printf 'Allowed edits: AGENT.md, requirements/spec/plan, task tracker, handoff, app files.\n'
    ;;
  *)
    printf 'Context: outside expected lesson/product repositories\n'
    ;;
esac

if [[ -d "$LESSON_ROOT/$PRODUCT_REPO_NAME" ]]; then
  printf '\nERROR: unexpected nested product repository directory exists:\n%s/%s\n' "$LESSON_ROOT" "$PRODUCT_REPO_NAME" >&2
  printf 'The product repository must be placed under configured project root:\n%s\n' "$PROJECT_ROOT" >&2
  exit 1
fi
