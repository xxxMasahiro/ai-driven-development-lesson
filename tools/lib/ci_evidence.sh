#!/usr/bin/env bash

CI_EVIDENCE_LIB_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if [[ -z "${LESSON_ROOT:-}" ]]; then
  # shellcheck source=lesson_common.sh
  source "$CI_EVIDENCE_LIB_DIR/lesson_common.sh"
fi

ci_evidence_marker_text() {
  printf 'ci-evidence-v1\n'
}

ci_evidence_dir() {
  if [[ -n "${CI_EVIDENCE_DIR:-}" ]]; then
    printf '%s\n' "$CI_EVIDENCE_DIR"
    return 0
  fi

  local root git_path
  root="${LESSON_ROOT:-$(pwd)}"
  git_path="$(git -C "$root" rev-parse --git-path ci-evidence 2>/dev/null || true)"
  if [[ -z "$git_path" ]]; then
    printf '%s\n' "$root/.git/ci-evidence"
  elif [[ "$git_path" == /* ]]; then
    printf '%s\n' "$git_path"
  else
    printf '%s\n' "$root/$git_path"
  fi
}

ci_evidence_marker_file() {
  printf '%s/.ci-evidence\n' "$(ci_evidence_dir)"
}

ci_evidence_hash_stream() {
  sha256sum | awk '{ print $1 }'
}

ci_evidence_safe_id() {
  local raw="$1"
  local safe digest
  safe="$(printf '%s' "$raw" | tr -c 'A-Za-z0-9_.-' '_')"
  [[ -n "$safe" ]] || safe="evidence"
  digest="$(printf '%s' "$raw" | sha256sum | awk '{ print substr($1, 1, 12) }')"
  printf '%s-%s' "$safe" "$digest"
}

ci_evidence_file_for() {
  local evidence_id="$1"
  printf '%s/%s.evidence\n' "$(ci_evidence_dir)" "$(ci_evidence_safe_id "$evidence_id")"
}

ci_evidence_dir_empty() {
  local dir="$1"
  [[ -z "$(find "$dir" -mindepth 1 -maxdepth 1 -print -quit 2>/dev/null)" ]]
}

ci_evidence_marker_valid() {
  local marker
  marker="$(ci_evidence_marker_file)"
  [[ -f "$marker" ]] && [[ "$(sed -n '1p' "$marker")" == "$(ci_evidence_marker_text)" ]]
}

ci_evidence_prepare_dir() {
  local dir marker
  dir="$(ci_evidence_dir)"
  marker="$(ci_evidence_marker_file)"

  if [[ -z "$dir" || "$dir" == "/" ]]; then
    printf 'Unsafe CI evidence directory: %s\n' "$dir" >&2
    return 1
  fi
  if [[ -L "$dir" ]]; then
    printf 'Refusing symlinked CI evidence directory: %s\n' "$dir" >&2
    return 1
  fi
  if [[ -e "$dir" && ! -d "$dir" ]]; then
    printf 'CI evidence path is not a directory: %s\n' "$dir" >&2
    return 1
  fi

  if [[ -d "$dir" ]]; then
    if ci_evidence_marker_valid; then
      return 0
    fi
    if [[ -e "$marker" ]]; then
      printf 'Invalid CI evidence marker: %s\n' "$marker" >&2
      return 1
    fi
    if ! ci_evidence_dir_empty "$dir"; then
      printf 'Refusing unmarked non-empty CI evidence directory: %s\n' "$dir" >&2
      return 1
    fi
  fi

  mkdir -p "$dir"
  ci_evidence_marker_text >"$marker"
}

ci_evidence_run_id() {
  if [[ -n "${CI_EVIDENCE_RUN_ID:-}" ]]; then
    printf '%s\n' "$CI_EVIDENCE_RUN_ID"
  elif [[ -n "${GITHUB_RUN_ID:-}" ]]; then
    printf '%s-%s\n' "$GITHUB_RUN_ID" "${GITHUB_RUN_ATTEMPT:-1}"
  else
    printf 'local-unscoped-%s-%s\n' "$$" "$(date +%s)"
  fi
}

ci_evidence_git_sha() {
  git -C "${LESSON_ROOT:-$(pwd)}" rev-parse HEAD 2>/dev/null || printf 'unknown\n'
}

ci_evidence_workflow_id() {
  printf '%s\n' "${GITHUB_WORKFLOW:-local}"
}

ci_evidence_source_job() {
  printf '%s\n' "${CI_EVIDENCE_SOURCE_JOB:-${GITHUB_JOB:-local}}"
}

ci_evidence_file_hash() {
  local path="$1"
  if [[ -f "$path" ]]; then
    sha256sum "$path" | awk '{ print $1 }'
  elif [[ -d "$path" ]]; then
    (
      cd "$path"
      find . \
        -path './.git' -prune -o \
        -path './node_modules' -prune -o \
        -path './playwright-report' -prune -o \
        -path './test-results' -prune -o \
        -type f -print | sort | while IFS= read -r file; do
          printf 'file=%s\n' "$file"
          sha256sum "$file"
        done
    ) | ci_evidence_hash_stream
  else
    printf 'missing\n'
  fi
}

ci_evidence_command_hash() {
  printf '%s\n' "$1" | ci_evidence_hash_stream
}

ci_evidence_inputs_hash() {
  local root path resolved
  root="${LESSON_ROOT:-$(pwd)}"
  {
    for path in "$@"; do
      [[ -n "$path" ]] || continue
      if [[ "$path" == /* ]]; then
        resolved="$path"
      else
        resolved="$root/$path"
      fi
      printf 'input=%s\n' "$path"
      printf 'hash=%s\n' "$(ci_evidence_file_hash "$resolved")"
    done
  } | ci_evidence_hash_stream
}

ci_evidence_repo_state_hash() {
  local root
  root="${LESSON_ROOT:-$(pwd)}"
  {
    git -C "$root" rev-parse HEAD 2>/dev/null || true
    git -C "$root" status --porcelain --untracked-files=all 2>/dev/null || true
    git -C "$root" diff --binary 2>/dev/null || true
    git -C "$root" diff --cached --binary 2>/dev/null || true
  } | ci_evidence_hash_stream
}

ci_evidence_policy_hash() {
  ci_evidence_inputs_hash \
    "${GIT_HOOKS_CHECKS_FILE:-docs/workflow/GIT_HOOK_CHECKS.tsv}" \
    "${GIT_HOOKS_PARALLEL_GROUPS_FILE:-docs/workflow/GIT_HOOK_PARALLEL_GROUPS.tsv}" \
    "${GIT_HOOKS_POLICY_FILE:-docs/workflow/GIT_HOOKS_POLICY.tsv}" \
    "${CI_FINAL_GATE_COVERAGE_FILE:-docs/workflow/FINAL_GATE_COVERAGE.tsv}" \
    "${CI_FINAL_GATE_GAP_COMMANDS_FILE:-docs/workflow/FINAL_GATE_GAP_COMMANDS.tsv}" \
    "${VERIFICATION_EXECUTION_POLICY_FILE:-docs/workflow/FINAL_GATE_EXECUTION_POLICY.tsv}" \
    "${VERIFICATION_EVIDENCE_SCHEMA_FILE:-docs/workflow/FINAL_GATE_EVIDENCE_SCHEMA.tsv}" \
    docs/workflow/TEST_PLAN_MANIFEST.tsv \
    "${AS_BUILT_SYNC_CONTRACT_FILE:-docs/workflow/AS_BUILT_SYNC_CONTRACT.tsv}" \
    .github/workflows/ci.yml \
    .github/workflows/lesson14-ci.yml
}

ci_evidence_metadata_value() {
  local file="$1"
  local key="$2"
  awk -F '=' -v key="$key" '$1 == key { print substr($0, length(key) + 2); found = 1; exit } END { if (!found) exit 1 }' "$file"
}

ci_evidence_v2_policy_file() {
  printf '%s\n' "${VERIFICATION_EXECUTION_POLICY_FILE:-${LESSON_ROOT:-$(pwd)}/docs/workflow/FINAL_GATE_EXECUTION_POLICY.tsv}"
}

ci_evidence_v2_mode() {
  local policy_file
  policy_file="$(ci_evidence_v2_policy_file)"
  if [[ ! -f "$policy_file" || -L "$policy_file" ]]; then
    printf 'legacy\n'
    return 0
  fi
  awk -F '\t' '
    $1 == "setting" && $2 == "activation_mode" { print $3; found = 1; exit }
    END { if (!found) print "legacy" }
  ' "$policy_file"
}

ci_evidence_v2_cli() {
  if [[ -n "${VERIFICATION_CLI:-}" ]]; then
    printf '%s\n' "$VERIFICATION_CLI"
  else
    printf '%s/../verification\n' "$CI_EVIDENCE_LIB_DIR"
  fi
}

ci_evidence_v2_dir() {
  printf '%s\n' "${VERIFICATION_EVIDENCE_V2_DIR:-$(ci_evidence_dir)/v2}"
}

ci_evidence_v2_context_args() {
  local source_job
  source_job="${CI_EVIDENCE_EXPECT_SOURCE_JOB:-$(ci_evidence_source_job)}"
  printf '%s\n' \
    --root "${LESSON_ROOT:-$(pwd)}" \
    --evidence-dir "$(ci_evidence_v2_dir)" \
    --scope "${VERIFICATION_SCOPE:-${GITHUB_EVENT_NAME:-local}}" \
    --event "${GITHUB_EVENT_NAME:-local}" \
    --ref "${GITHUB_REF:-local}" \
    --workflow "$(ci_evidence_workflow_id)" \
    --run-id "$(ci_evidence_run_id)" \
    --run-attempt "${GITHUB_RUN_ATTEMPT:-1}" \
    --source-job "$source_job"
}

ci_evidence_v2_operation() {
  local operation="$1"
  local evidence_id="$2"
  local command_identity="$3"
  shift 3
  local cli mode input
  local -a args=()
  local -a context_args=()
  mode="$(ci_evidence_v2_mode)"
  [[ "$mode" != "legacy" ]] || return 0
  cli="$(ci_evidence_v2_cli)"
  [[ -x "$cli" ]] || {
    [[ "$mode" != "enforce" ]] && return 0
    printf 'Version 2 evidence CLI is missing or not executable.\n' >&2
    return 1
  }
  mapfile -t context_args < <(ci_evidence_v2_context_args)
  args=(
    evidence "$operation" "$evidence_id"
    --subject "$evidence_id"
    --command "$command_identity"
    "${context_args[@]}"
  )
  for input in "$@"; do
    [[ -n "$input" ]] || continue
    args+=(--input "$input")
  done
  if "$cli" "${args[@]}" >/dev/null 2>&1; then
    return 0
  fi
  if [[ "$mode" == "enforce" ]]; then
    printf 'Version 2 evidence %s failed: %s\n' "$operation" "$evidence_id" >&2
    return 1
  fi
  printf 'Version 2 evidence %s did not match in %s mode: %s\n' "$operation" "$mode" "$evidence_id" >&2
  return 0
}

ci_evidence_record_success() {
  local evidence_id="$1"
  local command_identity="$2"
  shift 2
  local evidence_file tmp_file
  ci_evidence_prepare_dir || return 1
  evidence_file="$(ci_evidence_file_for "$evidence_id")"
  tmp_file="$evidence_file.tmp.$$"
  {
    printf 'marker=%s\n' "$(ci_evidence_marker_text | tr -d '\n')"
    printf 'id=%s\n' "$evidence_id"
    printf 'status=success\n'
    printf 'command_hash=%s\n' "$(ci_evidence_command_hash "$command_identity")"
    printf 'input_hash=%s\n' "$(ci_evidence_inputs_hash "$@")"
    printf 'policy_hash=%s\n' "$(ci_evidence_policy_hash)"
    printf 'repo_state_hash=%s\n' "$(ci_evidence_repo_state_hash)"
    printf 'git_sha=%s\n' "$(ci_evidence_git_sha)"
    printf 'workflow=%s\n' "$(ci_evidence_workflow_id)"
    printf 'run_id=%s\n' "$(ci_evidence_run_id)"
    printf 'source_job=%s\n' "$(ci_evidence_source_job)"
    printf 'created_at=%s\n' "$(date -u '+%Y-%m-%dT%H:%M:%SZ')"
  } >"$tmp_file"
  mv "$tmp_file" "$evidence_file"
  ci_evidence_v2_operation record "$evidence_id" "$command_identity" "$@"
}

ci_evidence_verify_success() {
  local evidence_id="$1"
  local command_identity="$2"
  shift 2
  local evidence_file expected actual v2_mode
  v2_mode="$(ci_evidence_v2_mode)"
  if [[ "$v2_mode" == "enforce" ]]; then
    ci_evidence_v2_operation verify "$evidence_id" "$command_identity" "$@"
    return
  fi
  evidence_file="$(ci_evidence_file_for "$evidence_id")"
  [[ -f "$evidence_file" ]] || {
    printf 'missing same-run evidence: %s\n' "$evidence_id" >&2
    return 1
  }
  [[ "$(ci_evidence_metadata_value "$evidence_file" marker 2>/dev/null || true)" == "$(ci_evidence_marker_text | tr -d '\n')" ]] || {
    printf 'invalid same-run evidence marker: %s\n' "$evidence_id" >&2
    return 1
  }
  for key in id status git_sha workflow run_id source_job command_hash input_hash policy_hash repo_state_hash; do
    ci_evidence_metadata_value "$evidence_file" "$key" >/dev/null || {
      printf 'missing same-run evidence field %s for %s\n' "$key" "$evidence_id" >&2
      return 1
    }
  done
  [[ "$(ci_evidence_metadata_value "$evidence_file" id)" == "$evidence_id" ]] || {
    printf 'same-run evidence id mismatch: %s\n' "$evidence_id" >&2
    return 1
  }
  [[ "$(ci_evidence_metadata_value "$evidence_file" status)" == "success" ]] || {
    printf 'same-run evidence is not successful: %s\n' "$evidence_id" >&2
    return 1
  }

  expected="$(ci_evidence_command_hash "$command_identity")"
  actual="$(ci_evidence_metadata_value "$evidence_file" command_hash)"
  [[ "$actual" == "$expected" ]] || {
    printf 'same-run evidence command mismatch: %s\n' "$evidence_id" >&2
    return 1
  }

  expected="$(ci_evidence_inputs_hash "$@")"
  actual="$(ci_evidence_metadata_value "$evidence_file" input_hash)"
  [[ "$actual" == "$expected" ]] || {
    printf 'same-run evidence input mismatch: %s\n' "$evidence_id" >&2
    return 1
  }

  expected="$(ci_evidence_policy_hash)"
  actual="$(ci_evidence_metadata_value "$evidence_file" policy_hash)"
  [[ "$actual" == "$expected" ]] || {
    printf 'same-run evidence policy mismatch: %s\n' "$evidence_id" >&2
    return 1
  }

  expected="$(ci_evidence_repo_state_hash)"
  actual="$(ci_evidence_metadata_value "$evidence_file" repo_state_hash)"
  [[ "$actual" == "$expected" ]] || {
    printf 'same-run evidence repository-state mismatch: %s\n' "$evidence_id" >&2
    return 1
  }

  expected="$(ci_evidence_git_sha)"
  actual="$(ci_evidence_metadata_value "$evidence_file" git_sha)"
  [[ "$actual" == "$expected" ]] || {
    printf 'same-run evidence commit mismatch: %s\n' "$evidence_id" >&2
    return 1
  }

  expected="$(ci_evidence_workflow_id)"
  actual="$(ci_evidence_metadata_value "$evidence_file" workflow)"
  [[ "$actual" == "$expected" ]] || {
    printf 'same-run evidence workflow mismatch: %s\n' "$evidence_id" >&2
    return 1
  }

  expected="$(ci_evidence_run_id)"
  actual="$(ci_evidence_metadata_value "$evidence_file" run_id)"
  [[ "$actual" == "$expected" ]] || {
    printf 'same-run evidence run mismatch: %s\n' "$evidence_id" >&2
    return 1
  }

  if [[ -n "${CI_EVIDENCE_EXPECT_SOURCE_JOB:-}" ]]; then
    actual="$(ci_evidence_metadata_value "$evidence_file" source_job)"
    [[ "$actual" == "$CI_EVIDENCE_EXPECT_SOURCE_JOB" ]] || {
      printf 'same-run evidence source job mismatch: %s\n' "$evidence_id" >&2
      return 1
    }
  fi

  if [[ "$v2_mode" == "shadow" ]]; then
    ci_evidence_v2_operation verify "$evidence_id" "$command_identity" "$@"
  fi
}

ci_evidence_git_hook_inputs() {
  local command="$1"
  local first="$command"
  first="${first#*=}"
  first="${first%% *}"
  if [[ "$first" == ./* ]]; then
    first="${first#./}"
  fi
  printf '%s\n' \
    "${GIT_HOOKS_CHECKS_FILE:-docs/workflow/GIT_HOOK_CHECKS.tsv}" \
    "${GIT_HOOKS_PARALLEL_GROUPS_FILE:-docs/workflow/GIT_HOOK_PARALLEL_GROUPS.tsv}" \
    "${GIT_HOOKS_POLICY_FILE:-docs/workflow/GIT_HOOKS_POLICY.tsv}"
  if [[ -n "$first" && -f "${LESSON_ROOT:-$(pwd)}/$first" ]]; then
    printf '%s\n' "$first"
  fi
}

ci_evidence_record_git_hook() {
  local check_id="$1"
  local command="$2"
  local -a inputs=()
  mapfile -t inputs < <(ci_evidence_git_hook_inputs "$command")
  ci_evidence_record_success "git-hook:$check_id" "$command" "${inputs[@]}"
}

ci_evidence_verify_git_hook() {
  local check_id="$1"
  local command="$2"
  local -a inputs=()
  mapfile -t inputs < <(ci_evidence_git_hook_inputs "$command")
  ci_evidence_verify_success "git-hook:$check_id" "$command" "${inputs[@]}"
}
