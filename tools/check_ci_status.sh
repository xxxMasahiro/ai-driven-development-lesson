#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=tools/lib/lesson_common.sh
source "$SCRIPT_DIR/lib/lesson_common.sh"

required=0
branch=""
workflow=""
run_id=""
commit=""
commit_explicit=0
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
    --branch)
      branch="${2:-}"
      [[ -n "$branch" ]] || { printf '%s\n' '--branch requires a value' >&2; exit 1; }
      shift 2
      ;;
    --commit)
      commit="${2:-}"
      [[ -n "$commit" ]] || { printf '%s\n' '--commit requires a value' >&2; exit 1; }
      commit_explicit=1
      shift 2
      ;;
    --workflow)
      workflow="${2:-}"
      [[ -n "$workflow" ]] || { printf '%s\n' '--workflow requires a value' >&2; exit 1; }
      shift 2
      ;;
    --run-id)
      run_id="${2:-}"
      [[ -n "$run_id" ]] || { printf '%s\n' '--run-id requires a value' >&2; exit 1; }
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
    printf 'CI target does not exist: %s\n' "$target_dir" >&2
    [[ "$required" -eq 1 ]] && exit 1 || exit 0
  fi
  cd "$target_dir"
fi

printf 'CI target: %s\n' "$target_label"

gh_retry() {
  local attempt
  for attempt in 1 2 3 4 5; do
    if timeout 20 gh "$@"; then
      return 0
    fi
    sleep 5
  done
  return 1
}

if ! command -v gh >/dev/null 2>&1; then
  printf 'gh is not installed; CI status check skipped.\n'
  [[ "$required" -eq 1 ]] && exit 1 || exit 0
fi

if ! gh_retry auth token >/dev/null 2>&1; then
  printf 'gh is not authenticated; CI status check skipped.\n'
  [[ "$required" -eq 1 ]] && exit 1 || exit 0
fi

repo=""
remote_url="$(git remote get-url origin 2>/dev/null || true)"
case "$remote_url" in
  https://github.com/*/*.git)
    repo="${remote_url#https://github.com/}"
    repo="${repo%.git}"
    ;;
  https://github.com/*/*)
    repo="${remote_url#https://github.com/}"
    ;;
  git@github.com:*.git)
    repo="${remote_url#git@github.com:}"
    repo="${repo%.git}"
    ;;
  git@github.com:*)
    repo="${remote_url#git@github.com:}"
    ;;
esac

if [[ -z "$repo" ]]; then
  if ! repo="$(gh repo view --json nameWithOwner --jq .nameWithOwner 2>/dev/null)"; then
    printf 'GitHub repository could not be resolved; CI status check skipped.\n'
    [[ "$required" -eq 1 ]] && exit 1 || exit 0
  fi
fi

if [[ -z "$branch" ]]; then
  branch="$(git branch --show-current 2>/dev/null || true)"
fi

if [[ -z "$commit" ]]; then
  commit="$(git rev-parse HEAD 2>/dev/null || true)"
fi

actions_runs_tsv() {
  local jq_filter api_runs
  jq_filter='.workflow_runs[] | "\(.status)\t\(.conclusion // "")\t\(.name)\t\(.head_branch // "")\t\(.head_sha // "")\t\(.id)\t\(.created_at)"'
  if [[ -n "$run_id" ]]; then
    gh_retry api -X GET "repos/$repo/actions/runs/$run_id" \
      --jq '"\(.status)\t\(.conclusion // "")\t\(.name)\t\(.head_branch // "")\t\(.head_sha // "")\t\(.id)\t\(.created_at)"' \
      2>/dev/null || true
    return 0
  fi
  if [[ -n "$branch" ]]; then
    api_runs="$(gh_retry api -X GET "repos/$repo/actions/runs" -f per_page=50 -f branch="$branch" --jq "$jq_filter" 2>/dev/null || true)"
  else
    api_runs="$(gh_retry api -X GET "repos/$repo/actions/runs" -f per_page=50 --jq "$jq_filter" 2>/dev/null || true)"
  fi
  if [[ -n "$api_runs" ]]; then
    printf '%s\n' "$api_runs"
    return 0
  fi
  if [[ "$commit_explicit" -eq 1 ]]; then
    return 0
  fi

  local list_args
  list_args=(run list --repo "$repo" --limit 50 --json status,conclusion,name,headBranch,databaseId,createdAt)
  [[ -n "$branch" ]] && list_args+=(--branch "$branch")
  [[ -n "$workflow" ]] && list_args+=(--workflow "$workflow")
  gh_retry "${list_args[@]}" \
    --jq '.[] | "\(.status)\t\(.conclusion // "")\t\(.name)\t\(.headBranch // "")\t\t\(.databaseId)\t\(.createdAt)"' \
    2>/dev/null || true
}

select_matching_run() {
  local wanted_workflow="$1"
  local runs_tsv="$2"
  awk -F '\t' \
    -v wanted_workflow="$wanted_workflow" \
    -v wanted_branch="$branch" \
    -v wanted_commit="$commit" \
    -v commit_explicit="$commit_explicit" \
    -v wanted_run_id="$run_id" '
    {
      status = $1
      conclusion = $2
      name = $3
      if (NF >= 9) {
        head_branch = $5
        head_sha = ""
        id = $6
        created_at = $9
      } else {
        head_branch = $4
        head_sha = $5
        id = $6
        created_at = $7
      }
      if (wanted_workflow != "" && name != wanted_workflow) {
        next
      }
      if (wanted_run_id != "" && id != wanted_run_id) {
        next
      }
      if (wanted_branch != "" && head_branch != "" && head_branch != wanted_branch) {
        next
      }
      if (wanted_commit != "") {
        if (commit_explicit == 1 && head_sha == "") {
          next
        }
        if (head_sha != "" && head_sha != wanted_commit) {
          next
        }
      }
      printf "%s\t%s\t%s\t%s\t%s\t%s\t0\t0s\t%s\n", status, conclusion, name, name, head_branch, id, created_at
      exit
    }
  ' <<<"$runs_tsv"
}

run_jobs_success() {
  local selected_run="$1"
  local selected_workflow="$2"
  local selected_run_id jobs_tsv
  selected_run_id="$(awk -F '\t' '{ print $6 }' <<<"$selected_run")"
  [[ -n "$selected_run_id" ]] || {
    printf 'CI run id is missing for workflow: %s\n' "$selected_workflow" >&2
    return 1
  }
  jobs_tsv="$(
    gh_retry api -X GET "repos/$repo/actions/runs/$selected_run_id/jobs" \
      --jq '.jobs[] | "\(.name)\t\(.status)\t\(.conclusion // "")"' \
      2>/dev/null || true
  )"
  if [[ -z "$jobs_tsv" ]]; then
    printf 'No GitHub Actions jobs found for workflow %s run %s.\n' "$selected_workflow" "$selected_run_id" >&2
    return 1
  fi
  awk -F '\t' -v workflow="$selected_workflow" '
    {
      if ($2 != "completed" || $3 != "success") {
        printf "CI job is not successful for workflow %s: %s (%s/%s)\n", workflow, $1, $2, $3 > "/dev/stderr"
        failed = 1
      }
    }
    END { exit failed ? 1 : 0 }
  ' <<<"$jobs_tsv"
}

required_workflows=()
require_workflow_jobs=0
lesson_repo_root="$(cd "$SCRIPT_DIR/.." && pwd -P)"
current_repo_root="$(pwd -P)"
if [[ "$required" -eq 1 && -z "$workflow" && "$current_repo_root" == "$lesson_repo_root" && -f .github/workflows/ci.yml && -f .github/workflows/lesson14-ci.yml ]]; then
  required_workflows=("CI" "Lesson14 CI")
  require_workflow_jobs=1
fi

runs_tsv=""
for _attempt in 1 2 3; do
  runs_tsv="$(actions_runs_tsv)"
  [[ -n "$runs_tsv" ]] && break
  sleep 5
done

if [[ -z "$runs_tsv" ]]; then
  printf 'No GitHub Actions runs found for %s.\n' "$repo"
  [[ -n "$commit" ]] && printf 'Commit: %s\n' "$commit"
  [[ "$required" -eq 1 ]] && exit 1 || exit 0
fi

if [[ "${#required_workflows[@]}" -eq 0 ]]; then
  latest="$(select_matching_run "$workflow" "$runs_tsv")"
  if [[ -z "$latest" ]]; then
    printf 'No GitHub Actions runs matched the requested target for %s.\n' "$repo"
    [[ -n "$commit" ]] && printf 'Commit: %s\n' "$commit"
    [[ "$required" -eq 1 ]] && exit 1 || exit 0
  fi
  printf '%s\n' "$latest"
  if printf '%s\n' "$latest" | grep -q '^completed[[:space:]]\+success'; then
    printf 'CI status: latest run succeeded.\n'
  else
    printf 'CI status: latest run is not successful.\n' >&2
    exit 1
  fi
  exit 0
fi

all_success=1
for required_workflow in "${required_workflows[@]}"; do
  selected="$(select_matching_run "$required_workflow" "$runs_tsv")"
  if [[ -z "$selected" ]]; then
    printf 'No GitHub Actions run found for required workflow: %s\n' "$required_workflow" >&2
    [[ -n "$commit" ]] && printf 'Commit: %s\n' "$commit" >&2
    all_success=0
    continue
  fi
  printf '%s\n' "$selected"
  if ! printf '%s\n' "$selected" | grep -q '^completed[[:space:]]\+success'; then
    printf 'CI status: required workflow is not successful: %s\n' "$required_workflow" >&2
    all_success=0
    continue
  fi
  if [[ "$require_workflow_jobs" -eq 1 ]] && ! run_jobs_success "$selected" "$required_workflow"; then
    all_success=0
  fi
done

if [[ "$all_success" -eq 1 ]]; then
  if [[ "${#required_workflows[@]}" -eq 1 ]]; then
    printf 'CI status: latest run succeeded.\n'
  else
    printf 'CI status: required workflows succeeded.\n'
  fi
else
  printf 'CI status: one or more required workflows are not successful.\n' >&2
  exit 1
fi
