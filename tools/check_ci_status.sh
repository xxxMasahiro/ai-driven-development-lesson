#!/usr/bin/env bash
set -euo pipefail

required=0
branch=""
workflow=""
while [[ $# -gt 0 ]]; do
  case "$1" in
    --required)
      required=1
      shift
      ;;
    --branch)
      branch="${2:-}"
      [[ -n "$branch" ]] || { printf '%s\n' '--branch requires a value' >&2; exit 1; }
      shift 2
      ;;
    --workflow)
      workflow="${2:-}"
      [[ -n "$workflow" ]] || { printf '%s\n' '--workflow requires a value' >&2; exit 1; }
      shift 2
      ;;
    *)
      printf 'unknown option: %s\n' "$1" >&2
      exit 1
      ;;
  esac
done

if ! command -v gh >/dev/null 2>&1; then
  printf 'gh is not installed; CI status check skipped.\n'
  [[ "$required" -eq 1 ]] && exit 1 || exit 0
fi

if ! gh auth status -h github.com >/dev/null 2>&1; then
  printf 'gh is not authenticated; CI status check skipped.\n'
  [[ "$required" -eq 1 ]] && exit 1 || exit 0
fi

if ! repo="$(gh repo view --json nameWithOwner --jq .nameWithOwner 2>/dev/null)"; then
  printf 'GitHub repository could not be resolved; CI status check skipped.\n'
  [[ "$required" -eq 1 ]] && exit 1 || exit 0
fi

args=(run list --repo "$repo" --limit 1)
[[ -n "$branch" ]] && args+=(--branch "$branch")
[[ -n "$workflow" ]] && args+=(--workflow "$workflow")
latest="$(gh "${args[@]}" 2>/dev/null || true)"
if [[ -z "$latest" ]]; then
  printf 'No GitHub Actions runs found for %s.\n' "$repo"
  [[ "$required" -eq 1 ]] && exit 1 || exit 0
fi

printf '%s\n' "$latest"
if printf '%s\n' "$latest" | grep -q '^completed[[:space:]]\+success'; then
  printf 'CI status: latest run succeeded.\n'
else
  printf 'CI status: latest run is not successful.\n' >&2
  exit 1
fi
