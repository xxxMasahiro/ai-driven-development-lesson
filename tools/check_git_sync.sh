#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=tools/lib/lesson_common.sh
source "$SCRIPT_DIR/lib/lesson_common.sh"

required=0
target_dir=""
target_label="current"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --required)
      required=1
      shift
      ;;
    --lesson)
      target_dir="$LESSON_ROOT"
      target_label="lesson"
      shift
      ;;
    --product)
      target_dir="$(lesson_product_repo_root)"
      target_label="product"
      shift
      ;;
    --repo)
      target_dir="$(lesson_expand_path "${2:-}")"
      [[ -n "$target_dir" ]] || { printf '%s\n' '--repo requires a value' >&2; exit 1; }
      target_label="custom"
      shift 2
      ;;
    *)
      printf 'unknown option: %s\n' "$1" >&2
      exit 1
      ;;
  esac
done

if [[ -n "$target_dir" ]]; then
  if [[ ! -d "$target_dir" ]]; then
    printf 'Git target does not exist: %s\n' "$target_dir" >&2
    exit 1
  fi
  cd "$target_dir"
fi

printf 'Git target: %s\n' "$target_label"

if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  printf 'not inside a Git worktree\n' >&2
  exit 1
fi

root="$(git rev-parse --show-toplevel)"
branch="$(git branch --show-current)"
status="$(git status --short)"

printf 'Git root: %s\n' "$root"
printf 'Branch: %s\n' "${branch:-detached}"

if [[ -n "$status" ]]; then
  printf 'Working tree: dirty\n'
  printf '%s\n' "$status"
  exit 1
fi

printf 'Working tree: clean\n'

if [[ -z "$branch" ]]; then
  printf 'Upstream: detached HEAD, remote sync cannot be determined\n'
  [[ "$required" -eq 1 ]] && exit 1
  exit 0
fi

if ! upstream="$(git rev-parse --abbrev-ref --symbolic-full-name '@{upstream}' 2>/dev/null)"; then
  printf 'Upstream: none\n'
  [[ "$required" -eq 1 ]] && exit 1
  exit 0
fi

read -r behind ahead < <(git rev-list --left-right --count "$upstream...HEAD")
printf 'Upstream: %s\n' "$upstream"
printf 'Behind: %s\n' "$behind"
printf 'Ahead: %s\n' "$ahead"

if [[ "$behind" != "0" || "$ahead" != "0" ]]; then
  printf 'Git sync: local and upstream differ\n' >&2
  exit 1
fi

printf 'Git sync: local and upstream match\n'
