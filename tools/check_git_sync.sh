#!/usr/bin/env bash
set -euo pipefail

required=0
if [[ "${1:-}" == "--required" ]]; then
  required=1
fi

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
