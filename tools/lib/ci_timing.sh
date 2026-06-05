#!/usr/bin/env bash

if [[ -z "${LESSON_ROOT:-}" ]]; then
  SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
  # shellcheck source=lesson_common.sh
  source "$SCRIPT_DIR/lesson_common.sh"
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=ci_evidence.sh
source "$SCRIPT_DIR/ci_evidence.sh"

ci_timing_marker_text() {
  printf 'ci-timing-v1\n'
}

ci_timing_dir() {
  if [[ -n "${CI_TIMING_DIR:-}" ]]; then
    printf '%s\n' "$CI_TIMING_DIR"
    return 0
  fi

  local root git_path
  root="${LESSON_ROOT:-$(pwd)}"
  git_path="$(git -C "$root" rev-parse --git-path ci-timing 2>/dev/null || true)"
  if [[ -z "$git_path" ]]; then
    printf '%s\n' "$root/.git/ci-timing"
  elif [[ "$git_path" == /* ]]; then
    printf '%s\n' "$git_path"
  else
    printf '%s\n' "$root/$git_path"
  fi
}

ci_timing_marker_file() {
  printf '%s/.ci-timing\n' "$(ci_timing_dir)"
}

ci_timing_report_file() {
  if [[ -n "${CI_TIMING_REPORT:-}" ]]; then
    printf '%s\n' "$CI_TIMING_REPORT"
  else
    printf '%s/ci-timing.tsv\n' "$(ci_timing_dir)"
  fi
}

ci_timing_dir_empty() {
  local dir="$1"
  [[ -z "$(find "$dir" -mindepth 1 -maxdepth 1 -print -quit 2>/dev/null)" ]]
}

ci_timing_marker_valid() {
  local marker
  marker="$(ci_timing_marker_file)"
  [[ -f "$marker" ]] && [[ "$(sed -n '1p' "$marker")" == "$(ci_timing_marker_text)" ]]
}

ci_timing_prepare_dir() {
  local dir marker
  dir="$(ci_timing_dir)"
  marker="$(ci_timing_marker_file)"

  if [[ -z "$dir" || "$dir" == "/" ]]; then
    printf 'Unsafe CI timing directory: %s\n' "$dir" >&2
    return 1
  fi
  if [[ -L "$dir" ]]; then
    printf 'Refusing symlinked CI timing directory: %s\n' "$dir" >&2
    return 1
  fi
  if [[ -e "$dir" && ! -d "$dir" ]]; then
    printf 'CI timing path is not a directory: %s\n' "$dir" >&2
    return 1
  fi

  if [[ -d "$dir" ]]; then
    if ci_timing_marker_valid; then
      return 0
    fi
    if [[ -e "$marker" ]]; then
      printf 'Invalid CI timing marker: %s\n' "$marker" >&2
      return 1
    fi
    if ! ci_timing_dir_empty "$dir"; then
      printf 'Refusing unmarked non-empty CI timing directory: %s\n' "$dir" >&2
      return 1
    fi
  fi

  mkdir -p "$dir"
  ci_timing_marker_text >"$marker"
}

ci_timing_header() {
  printf '%s\n' 'check_id	display_name	command_id	mode	start_epoch	end_epoch	duration_seconds	exit_status	command_hash	input_hash	policy_hash	repo_state_hash	evidence_status	workflow	job	run_id	git_sha	created_at'
}

ci_timing_safe_field() {
  printf '%s' "$1" | tr '\t\r\n' '   '
}

ci_timing_ensure_report() {
  local report
  ci_timing_prepare_dir || return 1
  report="$(ci_timing_report_file)"
  if [[ ! -f "$report" ]]; then
    ci_timing_header >"$report"
  fi
}

ci_timing_record() {
  local check_id="$1"
  local display_name="$2"
  local command_id="$3"
  local mode="$4"
  local start_epoch="$5"
  local end_epoch="$6"
  local exit_status="$7"
  local evidence_status="$8"
  shift 8
  local report duration
  ci_timing_ensure_report || return 1
  report="$(ci_timing_report_file)"
  duration=$((end_epoch - start_epoch))
  {
    printf '%s\t' "$(ci_timing_safe_field "$check_id")"
    printf '%s\t' "$(ci_timing_safe_field "$display_name")"
    printf '%s\t' "$(ci_timing_safe_field "$command_id")"
    printf '%s\t' "$(ci_timing_safe_field "$mode")"
    printf '%s\t' "$start_epoch"
    printf '%s\t' "$end_epoch"
    printf '%s\t' "$duration"
    printf '%s\t' "$exit_status"
    printf '%s\t' "$(ci_evidence_command_hash "$command_id")"
    printf '%s\t' "$(ci_evidence_inputs_hash "$@")"
    printf '%s\t' "$(ci_evidence_policy_hash)"
    printf '%s\t' "$(ci_evidence_repo_state_hash)"
    printf '%s\t' "$(ci_timing_safe_field "$evidence_status")"
    printf '%s\t' "$(ci_timing_safe_field "$(ci_evidence_workflow_id)")"
    printf '%s\t' "$(ci_timing_safe_field "$(ci_evidence_source_job)")"
    printf '%s\t' "$(ci_timing_safe_field "$(ci_evidence_run_id)")"
    printf '%s\t' "$(ci_timing_safe_field "$(ci_evidence_git_sha)")"
    printf '%s\n' "$(date -u '+%Y-%m-%dT%H:%M:%SZ')"
  } >>"$report"
}

ci_timing_print_status() {
  printf 'CI timing\n'
  printf 'Directory: %s\n' "$(ci_timing_dir)"
  printf 'Marker: %s\n' "$(ci_timing_marker_file)"
  printf 'Report: %s\n' "$(ci_timing_report_file)"
  if ci_timing_marker_valid && [[ -f "$(ci_timing_report_file)" ]]; then
    printf 'Status: available\n'
  else
    printf 'Status: not-initialized\n'
  fi
}

ci_timing_propose() {
  local input="$1"
  local slow_threshold="$2"
  local emitted=0
  [[ -f "$input" ]] || {
    printf 'CI timing report is missing: %s\n' "$input" >&2
    return 1
  }

  printf 'CI timing improvement proposals\n'
  awk -F '\t' -v slow_threshold="$slow_threshold" '
    function fail(message) {
      printf "%s\n", message > "/dev/stderr"
      invalid = 1
    }
    function numeric(value) {
      return value ~ /^[0-9]+$/
    }
    function hash_value(value) {
      return value ~ /^[0-9a-f]{64}$/
    }
    function nonempty(value) {
      return value != ""
    }
    function metadata_available(idx) {
      return hash_value(command_hash[idx]) &&
        hash_value(input_hash[idx]) &&
        hash_value(policy_hash[idx]) &&
        hash_value(repo_state_hash[idx]) &&
        nonempty(workflow[idx]) &&
        nonempty(job[idx]) &&
        nonempty(run_id[idx]) &&
        nonempty(git_sha[idx]) &&
        git_sha[idx] != "unknown"
    }
    NR == 1 {
      expected = "check_id\tdisplay_name\tcommand_id\tmode\tstart_epoch\tend_epoch\tduration_seconds\texit_status\tcommand_hash\tinput_hash\tpolicy_hash\trepo_state_hash\tevidence_status\tworkflow\tjob\trun_id\tgit_sha\tcreated_at"
      if ($0 != expected || NF != 18) {
        fail("Malformed timing header")
      }
      next
    }
    NF != 18 {
      printf "Malformed timing row: %d\n", NR > "/dev/stderr"
      invalid = 1
      next
    }
    {
      row = ++count
      check_id[row] = $1
      display_name[row] = $2
      command_id[row] = $3
      mode[row] = $4
      start_epoch[row] = $5
      end_epoch[row] = $6
      duration[row] = $7
      exit_status[row] = $8
      command_hash[row] = $9
      input_hash[row] = $10
      policy_hash[row] = $11
      repo_state_hash[row] = $12
      evidence_status[row] = $13
      workflow[row] = $14
      job[row] = $15
      run_id[row] = $16
      git_sha[row] = $17
      created_at[row] = $18

      if (!nonempty(check_id[row]) || !nonempty(command_id[row]) || !nonempty(mode[row]) || !nonempty(evidence_status[row]) || !nonempty(created_at[row])) {
        fail("Malformed timing row: required field is empty at row " NR)
      }
      if (!numeric(start_epoch[row]) || !numeric(end_epoch[row]) || !numeric(duration[row]) || !numeric(exit_status[row])) {
        fail("Malformed timing row: numeric field is invalid at row " NR)
      }
      if (numeric(start_epoch[row]) && numeric(end_epoch[row]) && numeric(duration[row])) {
        expected_duration = end_epoch[row] - start_epoch[row]
        if (expected_duration < 0 || expected_duration != duration[row] + 0) {
          fail("Malformed timing row: duration does not match start/end at row " NR)
        }
      }
      if (!metadata_available(row)) {
        fail("Malformed timing row: required hashes or workflow identity are unavailable at row " NR)
      }
    }
    END {
      if (invalid) {
        exit 1
      }
      for (i = 1; i <= count; i++) {
        if (duration[i] + 0 >= slow_threshold) {
          printf "- slow-check: %s (%ss)\n", check_id[i], duration[i]
        printf "  reason: duration is at or above the configured threshold.\n"
          printf "  affected files: CI workflow, timing report, and check policy files for %s.\n", check_id[i]
        printf "  required verification: rerun focused timing tests, CI workflow structure checks, and aggregate repository tests.\n"
        printf "  approval: developer approval is required before changing workflow or full/no-cache behavior.\n"
        emitted = 1
      }
        if (exit_status[i] == "0" && evidence_status[i] == "none") {
          printf "- evidence-candidate: %s\n", check_id[i]
        printf "  reason: successful check has timing metadata but no same-run evidence-use status.\n"
          printf "  affected files: same-run evidence helper and the command wrapper for %s.\n", check_id[i]
        printf "  required verification: prove command identity, input hash, policy hash, repository-state hash, workflow/run identity, and success status match.\n"
        printf "  approval: developer approval is required before using the candidate to skip or reduce any strict rerun.\n"
        emitted = 1
      }
        if (mode[i] ~ /parallel-candidate/) {
          printf "- parallel-candidate: %s\n", check_id[i]
        printf "  reason: check is marked as a candidate, but grouping must be policy-driven.\n"
        printf "  affected files: Git hook parallel groups and related tests.\n"
        printf "  required verification: prove inputs, outputs, temporary paths, logs, and side effects are independent.\n"
        printf "  approval: developer approval is required before changing execution groups.\n"
        emitted = 1
      }
      }
      if (!emitted) {
        print "- none: no timing-based improvement proposals were generated."
      }
    }
  ' "$input" || return 1
}
