#!/usr/bin/env bash

if [[ -z "${LESSON_ROOT:-}" ]]; then
  SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
  # shellcheck source=lesson_common.sh
  source "$SCRIPT_DIR/lesson_common.sh"
fi

git_workflow_policy_file() {
  printf '%s\n' "${GIT_WORKFLOW_POLICY_FILE:-$LESSON_ROOT/docs/workflow/GIT_WORKFLOW_POLICY.tsv}"
}

git_workflow_settings_file() {
  printf '%s\n' "${GIT_WORKFLOW_SETTINGS_FILE:-$LESSON_ROOT/learning/GIT_WORKFLOW_SETTINGS.tsv}"
}

git_workflow_developer_auto_merge_gates_file() {
  printf '%s\n' "${GIT_WORKFLOW_DEVELOPER_AUTO_MERGE_GATES_FILE:-$LESSON_ROOT/learning/GIT_WORKFLOW_DEVELOPER_AUTO_MERGE_GATES.tsv}"
}

git_workflow_approvals_file() {
  printf '%s\n' "${GIT_WORKFLOW_APPROVALS_FILE:-$LESSON_ROOT/learning/GIT_WORKFLOW_APPROVALS.tsv}"
}

git_workflow_policy_rows() {
  local policy_file
  policy_file="$(git_workflow_policy_file)"
  awk -F '\t' 'NF >= 5 && $1 !~ /^#/ { print }' "$policy_file"
}

git_workflow_policy_field() {
  local key="$1"
  local field="$2"
  local policy_file
  policy_file="$(git_workflow_policy_file)"
  awk -F '\t' -v key="$key" -v field="$field" '
    NF >= 5 && $1 == key { print $field; found = 1 }
    END { if (!found) exit 1 }
  ' "$policy_file"
}

git_workflow_policy_has_key() {
  git_workflow_policy_field "$1" 1 >/dev/null 2>&1
}

git_workflow_policy_allowed_values() {
  git_workflow_policy_field "$1" 2
}

git_workflow_policy_default_value() {
  git_workflow_policy_field "$1" 3
}

git_workflow_policy_label() {
  git_workflow_policy_field "$1" 4
}

git_workflow_validate_value() {
  local key="$1"
  local value="$2"
  local allowed

  if ! allowed="$(git_workflow_policy_allowed_values "$key")"; then
    printf 'Unknown Git workflow setting: %s\n' "$key" >&2
    return 1
  fi

  case "|$allowed|" in
    *"|$value|"*) return 0 ;;
  esac

  printf 'Invalid value for %s: %s (allowed: %s)\n' "$key" "$value" "$allowed" >&2
  return 1
}

git_workflow_raw_setting_value() {
  local key="$1"
  local settings_file
  settings_file="$(git_workflow_settings_file)"
  [[ -f "$settings_file" ]] || return 1
  awk -F '\t' -v key="$key" 'NF >= 2 && $1 == key { print $2; found = 1 } END { if (!found) exit 1 }' "$settings_file"
}

git_workflow_setting_value() {
  local key="$1"
  local value

  if value="$(git_workflow_raw_setting_value "$key" 2>/dev/null)"; then
    git_workflow_validate_value "$key" "$value" >/dev/null
    printf '%s\n' "$value"
    return 0
  fi

  git_workflow_policy_default_value "$key"
}

git_workflow_candidate_setting_value() {
  local key="$1"
  local candidate_key="${2:-}"
  local candidate_value="${3:-}"

  if [[ -n "$candidate_key" && "$key" == "$candidate_key" ]]; then
    printf '%s\n' "$candidate_value"
    return 0
  fi

  git_workflow_setting_value "$key"
}

git_workflow_consistency_row() {
  local severity="$1"
  local status="$2"
  local reason_code="$3"
  local affected_ids="$4"
  local reason_key="$5"
  local next_action_key="$6"

  printf '%s\t%s\t%s\t%s\t%s\t%s\n' \
    "$severity" "$status" "$reason_code" "$affected_ids" "$reason_key" "$next_action_key"
}

git_workflow_consistency_rows() {
  local candidate_key="${1:-}"
  local candidate_value="${2:-}"
  local branch_allowed
  local worktree_allowed
  local main_direct_work_allowed
  local pr_creation
  local pr_ci_monitoring
  local merge_execution
  local developer_auto_merge_allowed

  if [[ -n "$candidate_key" ]]; then
    git_workflow_validate_value "$candidate_key" "$candidate_value" >/dev/null || return 1
  fi

  branch_allowed="$(git_workflow_candidate_setting_value branch_allowed "$candidate_key" "$candidate_value")" || return 1
  worktree_allowed="$(git_workflow_candidate_setting_value worktree_allowed "$candidate_key" "$candidate_value")" || return 1
  main_direct_work_allowed="$(git_workflow_candidate_setting_value main_direct_work_allowed "$candidate_key" "$candidate_value")" || return 1
  pr_creation="$(git_workflow_candidate_setting_value pr_creation "$candidate_key" "$candidate_value")" || return 1
  pr_ci_monitoring="$(git_workflow_candidate_setting_value pr_ci_monitoring "$candidate_key" "$candidate_value")" || return 1
  merge_execution="$(git_workflow_candidate_setting_value merge_execution "$candidate_key" "$candidate_value")" || return 1
  developer_auto_merge_allowed="$(git_workflow_candidate_setting_value developer_auto_merge_allowed "$candidate_key" "$candidate_value")" || return 1

  if [[ "$branch_allowed" == "false" && "$main_direct_work_allowed" == "false" ]]; then
    git_workflow_consistency_row \
      "error" \
      "blocked" \
      "no_approved_write_path" \
      "branch_allowed,main_direct_work_allowed" \
      "settingsPage.consistency.noApprovedWritePath" \
      "settingsPage.consistency.next.enableBranchOrDirectMain"
  fi

  if [[ "$branch_allowed" == "false" && "$worktree_allowed" == "true" ]]; then
    git_workflow_consistency_row \
      "error" \
      "blocked" \
      "worktree_requires_branch" \
      "branch_allowed,worktree_allowed" \
      "settingsPage.consistency.worktreeRequiresBranch" \
      "settingsPage.consistency.next.enableBranchOrDisableWorktree"
  fi

  if [[ "$branch_allowed" == "false" && "$pr_creation" == "auto" ]]; then
    git_workflow_consistency_row \
      "error" \
      "blocked" \
      "pr_creation_requires_branch" \
      "branch_allowed,pr_creation" \
      "settingsPage.consistency.prCreationRequiresBranch" \
      "settingsPage.consistency.next.enableBranchOrManualPr"
  fi

  if [[ "$branch_allowed" == "false" && "$pr_ci_monitoring" == "auto" ]]; then
    git_workflow_consistency_row \
      "error" \
      "blocked" \
      "pr_ci_requires_branch" \
      "branch_allowed,pr_ci_monitoring" \
      "settingsPage.consistency.prCiRequiresBranch" \
      "settingsPage.consistency.next.enableBranchOrManualPrCi"
  fi

  if [[ "$branch_allowed" == "false" && "$merge_execution" == "after_approval" ]]; then
    git_workflow_consistency_row \
      "error" \
      "blocked" \
      "merge_after_approval_requires_branch" \
      "branch_allowed,merge_execution" \
      "settingsPage.consistency.mergeRequiresBranch" \
      "settingsPage.consistency.next.enableBranchOrManualMerge"
  fi

  if [[ "$merge_execution" == "manual" && "$developer_auto_merge_allowed" == "true" ]]; then
    git_workflow_consistency_row \
      "warning" \
      "manual_required" \
      "developer_auto_merge_overrides_manual_when_gates_pass" \
      "merge_execution,developer_auto_merge_allowed" \
      "settingsPage.consistency.developerAutoMergeTakesPrecedence" \
      "settingsPage.consistency.next.reviewDeveloperAutoMergeGates"
  fi
}

git_workflow_consistency_has_blocking_rows() {
  local rows="$1"
  local severity status _reason_code _affected_ids _reason_key _next_action_key

  while IFS=$'\t' read -r severity status _reason_code _affected_ids _reason_key _next_action_key; do
    [[ -n "$severity$status" ]] || continue
    if [[ "$severity" == "error" || "$status" == "blocked" ]]; then
      return 0
    fi
  done <<<"$rows"

  return 1
}

git_workflow_consistency_blocking_count() {
  local rows="$1"
  local severity status _reason_code _affected_ids _reason_key _next_action_key
  local count=0

  while IFS=$'\t' read -r severity status _reason_code _affected_ids _reason_key _next_action_key; do
    [[ -n "$severity$status" ]] || continue
    if [[ "$severity" == "error" || "$status" == "blocked" ]]; then
      count=$((count + 1))
    fi
  done <<<"$rows"

  printf '%d\n' "$count"
}

git_workflow_candidate_write_allowed() {
  local candidate_key="$1"
  local candidate_value="$2"
  local current_rows candidate_rows
  local current_count candidate_count

  current_rows="$(git_workflow_consistency_rows)" || return 1
  candidate_rows="$(git_workflow_consistency_rows "$candidate_key" "$candidate_value")" || return 1
  candidate_count="$(git_workflow_consistency_blocking_count "$candidate_rows")"
  [[ "$candidate_count" -eq 0 ]] && return 0

  current_count="$(git_workflow_consistency_blocking_count "$current_rows")"
  [[ "$current_count" -gt 0 && "$candidate_count" -lt "$current_count" ]]
}

git_workflow_current_consistency_allows_runtime() {
  local rows
  local severity status reason_code affected_ids _reason_key _next_action_key

  rows="$(git_workflow_consistency_rows)" || return 1
  while IFS=$'\t' read -r severity status reason_code affected_ids _reason_key _next_action_key; do
    [[ -n "$severity$status" ]] || continue
    if [[ "$severity" == "error" || "$status" == "blocked" ]]; then
      printf 'Git workflow action blocked by consistency policy: %s affects %s\n' "$reason_code" "$affected_ids" >&2
      return 1
    fi
  done <<<"$rows"
}

git_workflow_validate_candidate_consistency() {
  local candidate_key="$1"
  local candidate_value="$2"
  local rows
  local severity status reason_code affected_ids _reason_key _next_action_key
  local failed=0

  git_workflow_candidate_write_allowed "$candidate_key" "$candidate_value" && return 0

  rows="$(git_workflow_consistency_rows "$candidate_key" "$candidate_value")" || return 1
  while IFS=$'\t' read -r severity status reason_code affected_ids _reason_key _next_action_key; do
    [[ -n "$severity$status" ]] || continue
    if [[ "$severity" == "error" || "$status" == "blocked" ]]; then
      printf 'Git workflow setting rejected by consistency policy: %s affects %s\n' "$reason_code" "$affected_ids" >&2
      failed=1
    fi
  done <<<"$rows"

  [[ "$failed" -eq 0 ]]
}

git_workflow_consistency_row_for_setting() {
  local setting_key="$1"
  local rows
  local severity status reason_code affected_ids reason_key next_action_key
  local best_row=""

  rows="$(git_workflow_consistency_rows 2>/dev/null || true)"
  while IFS=$'\t' read -r severity status reason_code affected_ids reason_key next_action_key; do
    [[ -n "$severity$status" ]] || continue
    case ",$affected_ids," in
      *",$setting_key,"*)
        if [[ "$status" == "blocked" ]]; then
          printf '%s\t%s\t%s\t%s\t%s\t%s\n' "$severity" "$status" "$reason_code" "$affected_ids" "$reason_key" "$next_action_key"
          return 0
        fi
        [[ -n "$best_row" ]] || best_row="$(printf '%s\t%s\t%s\t%s\t%s\t%s\n' "$severity" "$status" "$reason_code" "$affected_ids" "$reason_key" "$next_action_key")"
        ;;
    esac
  done <<<"$rows"

  if [[ -n "$best_row" ]]; then
    printf '%s' "$best_row"
    return 0
  fi

  return 1
}

git_workflow_consistency_status_for_setting() {
  local setting_key="$1"
  local row status
  if row="$(git_workflow_consistency_row_for_setting "$setting_key" 2>/dev/null)"; then
    status="$(awk -F '\t' '{ print $2; exit }' <<<"$row")"
    printf '%s\n' "$status"
  else
    printf 'ready\n'
  fi
}

git_workflow_settings_consistency_status() {
  local rows
  local _severity status _reason_code _affected_ids _reason_key _next_action_key
  local best_status="ready"

  rows="$(git_workflow_consistency_rows 2>/dev/null || true)"
  while IFS=$'\t' read -r _severity status _reason_code _affected_ids _reason_key _next_action_key; do
    [[ -n "$status" ]] || continue
    case "$status" in
      blocked)
        printf 'blocked\n'
        return
        ;;
      manual_required)
        [[ "$best_status" == "ready" ]] && best_status="manual_required"
        ;;
      approval_required)
        [[ "$best_status" == "ready" ]] && best_status="approval_required"
        ;;
      optional|cached|stale|not_run|missing|unknown|failed)
        [[ "$best_status" == "ready" ]] && best_status="$status"
        ;;
    esac
  done <<<"$rows"

  printf '%s\n' "$best_status"
}

git_workflow_write_setting() {
  local key="$1"
  local value="$2"
  local settings_file
  local settings_dir
  local tmp_file

  git_workflow_validate_value "$key" "$value" || return 1
  git_workflow_validate_candidate_consistency "$key" "$value" || return 1
  settings_file="$(git_workflow_settings_file)"
  settings_dir="$(dirname "$settings_file")"
  mkdir -p "$settings_dir"
  tmp_file="$(mktemp "$settings_dir/.git-workflow-settings.XXXXXX.tmp")"

  {
    printf '# key\tvalue\n'
    while IFS=$'\t' read -r row_key _allowed default_value _label _description; do
      local selected
      if [[ "$row_key" == "$key" ]]; then
        selected="$value"
      elif selected="$(git_workflow_raw_setting_value "$row_key" 2>/dev/null)"; then
        git_workflow_validate_value "$row_key" "$selected" >/dev/null
      else
        continue
      fi
      printf '%s\t%s\n' "$row_key" "$selected"
    done < <(git_workflow_policy_rows)
  } >"$tmp_file"

  awk -F '\t' '$1 !~ /^#/ && NF >= 2 { print $1 "\t" $2 }' "$tmp_file" |
    while IFS=$'\t' read -r row_key row_value; do
      git_workflow_validate_value "$row_key" "$row_value" >/dev/null
    done

  mv "$tmp_file" "$settings_file"
}

git_workflow_bool_enabled() {
  [[ "$(git_workflow_setting_value "$1")" == "true" ]]
}

git_workflow_automation_level() {
  git_workflow_setting_value automation_level
}

git_workflow_normalize_action() {
  local action="$1"
  case "$action" in
    pr-ci) printf 'pr_ci\n' ;;
    main-ci) printf 'main_ci\n' ;;
    developer-auto-merge) printf 'developer_auto_merge\n' ;;
    *) printf '%s\n' "$action" ;;
  esac
}

git_workflow_legacy_action_mode() {
  local action="$1"
  local level
  level="$(git_workflow_automation_level)"

  case "$level:$action" in
    commit:commit) printf 'auto\n' ;;
    pr_ci:commit|pr_ci:push|pr_ci:pr|pr_ci:ci|pr_ci:pr_ci) printf 'auto\n' ;;
    sync:commit|sync:push|sync:pr|sync:ci|sync:pr_ci|sync:main_ci|sync:sync) printf 'auto\n' ;;
    *) printf 'manual\n' ;;
  esac
}

git_workflow_gate_value() {
  local key="$1"
  local gates_file
  gates_file="$(git_workflow_developer_auto_merge_gates_file)"
  [[ -f "$gates_file" ]] || return 1
  awk -F '\t' -v key="$key" 'NF >= 2 && $1 == key { print $2; found = 1 } END { if (!found) exit 1 }' "$gates_file"
}

git_workflow_require_gate_true() {
  local key="$1"
  local value
  value="$(git_workflow_gate_value "$key")" || {
    printf 'Developer auto-merge gate missing: %s\n' "$key" >&2
    return 1
  }
  if [[ "$value" != "true" ]]; then
    printf 'Developer auto-merge gate is not true: %s=%s\n' "$key" "$value" >&2
    return 1
  fi
}

git_workflow_developer_auto_merge_gates_pass() {
  local repo="${1:-$PWD}"
  local root
  local upstream
  local counts
  local ahead
  local behind

  git_workflow_bool_enabled developer_auto_merge_allowed || {
    printf 'Developer auto-merge is disabled.\n' >&2
    return 1
  }

  git_workflow_require_gate_true pr_ci_success || return 1
  git_workflow_require_gate_true target_pr_clear || return 1
  git_workflow_require_gate_true target_branch_clear || return 1
  git_workflow_require_gate_true merge_base_verified || return 1
  git_workflow_require_gate_true local_remote_checked || return 1
  git_workflow_require_gate_true failure_stop_enabled || return 1

  root="$(git_workflow_git_root "$repo")" || {
    printf 'Developer auto-merge gate failed: Git repository not found (%s).\n' "$repo" >&2
    return 1
  }
  if [[ "$(git_workflow_worktree_state "$root")" != "clean" ]]; then
    printf 'Developer auto-merge gate failed: working tree is not clean.\n' >&2
    return 1
  fi

  upstream="$(git_workflow_upstream_name "$root")"
  if [[ -z "$upstream" ]]; then
    printf 'Developer auto-merge gate failed: upstream is not configured.\n' >&2
    return 1
  fi
  counts="$(git_workflow_upstream_counts "$root" "$upstream")" || {
    printf 'Developer auto-merge gate failed: upstream cannot be resolved.\n' >&2
    return 1
  }
  ahead="${counts%% *}"
  behind="${counts##* }"
  if [[ "$ahead" != "0" || "$behind" != "0" ]]; then
    printf 'Developer auto-merge gate failed: local and upstream differ.\n' >&2
    return 1
  fi
}

git_workflow_normalize_approval_action() {
  local action
  action="$(git_workflow_normalize_action "$1")"
  case "$action" in
    push|pr|merge) printf '%s\n' "$action" ;;
    *)
      printf 'Git workflow approval action must be push, pr, or merge.\n' >&2
      return 1
      ;;
  esac
}

git_workflow_approval_context() {
  local repo="${1:-$PWD}"
  local root
  local branch
  root="$(git_workflow_git_root "$repo")" || {
    printf 'Git workflow approval requires a Git repository: %s\n' "$repo" >&2
    return 1
  }
  branch="$(git_workflow_branch_name "$root")"
  printf '%s\t%s\n' "$root" "$branch"
}

git_workflow_write_approval() {
  local raw_action="$1"
  local repo="$2"
  local memo="$3"
  local action
  local context
  local root
  local branch
  local approvals_file
  local approvals_dir
  local stamp

  action="$(git_workflow_normalize_approval_action "$raw_action")" || return 1
  [[ -n "$memo" ]] || {
    printf 'Git workflow approval memo is required.\n' >&2
    return 1
  }
  context="$(git_workflow_approval_context "$repo")" || return 1
  root="${context%%$'\t'*}"
  branch="${context#*$'\t'}"
  memo="${memo//$'\t'/ }"
  approvals_file="$(git_workflow_approvals_file)"
  approvals_dir="$(dirname "$approvals_file")"
  mkdir -p "$approvals_dir"
  if [[ ! -f "$approvals_file" ]]; then
    printf '# action\trepo_root\tbranch\tapproved_at\tmemo\n' >"$approvals_file"
  fi
  stamp="$(date '+%Y-%m-%d %H:%M:%S')"
  printf '%s\t%s\t%s\t%s\t%s\n' "$action" "$root" "$branch" "$stamp" "$memo" >>"$approvals_file"
  printf 'Git workflow approval recorded: %s (%s %s)\n' "$action" "$root" "$branch"
}

git_workflow_has_approval() {
  local raw_action="$1"
  local repo="${2:-$PWD}"
  local action
  local context
  local root
  local branch
  local approvals_file

  action="$(git_workflow_normalize_approval_action "$raw_action")" || return 1
  context="$(git_workflow_approval_context "$repo")" || return 1
  root="${context%%$'\t'*}"
  branch="${context#*$'\t'}"
  approvals_file="$(git_workflow_approvals_file)"
  [[ -f "$approvals_file" ]] || return 1
  awk -F '\t' -v action="$action" -v root="$root" -v branch="$branch" '
    $1 !~ /^#/ && $1 == action && $2 == root && $3 == branch { found = 1; exit }
    END { exit found ? 0 : 1 }
  ' "$approvals_file"
}

git_workflow_require_approval() {
  local action="$1"
  local repo="${2:-$PWD}"
  if git_workflow_has_approval "$action" "$repo"; then
    return 0
  fi
  printf 'Git workflow approval required before %s.\n' "$action" >&2
  printf 'Record approval with: ./tools/git-workflow approve %s "User approved %s"\n' "$action" "$action" >&2
  return 1
}

git_workflow_action_setting_key() {
  local action="$1"
  case "$action" in
    commit) printf 'commit_automation\n' ;;
    push) printf 'push_automation\n' ;;
    pr) printf 'pr_creation\n' ;;
    ci|pr_ci) printf 'pr_ci_monitoring\n' ;;
    main_ci) printf 'main_ci_monitoring\n' ;;
    sync) printf 'sync_monitoring\n' ;;
    *) return 1 ;;
  esac
}

git_workflow_detailed_action_setting_present() {
  local action
  local key
  action="$(git_workflow_normalize_action "$1")"
  case "$action" in
    merge)
      git_workflow_raw_setting_value merge_execution >/dev/null 2>&1
      ;;
    developer_auto_merge)
      git_workflow_raw_setting_value developer_auto_merge_allowed >/dev/null 2>&1
      ;;
    *)
      key="$(git_workflow_action_setting_key "$action")" || return 1
      git_workflow_raw_setting_value "$key" >/dev/null 2>&1
      ;;
  esac
}

git_workflow_action_mode() {
  local action
  local key
  local value
  local repo="${2:-$PWD}"
  action="$(git_workflow_normalize_action "$1")"

  case "$action" in
    merge)
      if git_workflow_policy_has_key developer_auto_merge_allowed && git_workflow_developer_auto_merge_gates_pass "$repo" >/dev/null 2>&1; then
        printf 'developer_auto\n'
      elif value="$(git_workflow_raw_setting_value merge_execution 2>/dev/null)"; then
        git_workflow_validate_value merge_execution "$value" >/dev/null
        printf '%s\n' "$value"
      else
        git_workflow_legacy_action_mode merge
      fi
      return 0
      ;;
    developer_auto_merge)
      if git_workflow_policy_has_key developer_auto_merge_allowed && git_workflow_developer_auto_merge_gates_pass "$repo" >/dev/null 2>&1; then
        printf 'auto\n'
      else
        printf 'manual\n'
      fi
      return 0
      ;;
  esac

  if key="$(git_workflow_action_setting_key "$action")" && value="$(git_workflow_raw_setting_value "$key" 2>/dev/null)"; then
    git_workflow_validate_value "$key" "$value" >/dev/null
    printf '%s\n' "$value"
    return 0
  fi

  git_workflow_legacy_action_mode "$action"
}

git_workflow_automation_allows() {
  local action="$1"
  local repo="${2:-$PWD}"
  local mode
  local normalized
  normalized="$(git_workflow_normalize_action "$action")"
  mode="$(git_workflow_action_mode "$action" "$repo")"

  case "$normalized:$mode" in
    push:auto|pr:auto|merge:after_approval)
      if git_workflow_detailed_action_setting_present "$normalized"; then
        git_workflow_require_approval "$normalized" "$repo" || return 1
      fi
      ;;
  esac

  case "$mode" in
    auto|after_approval|developer_auto) return 0 ;;
  esac

  return 1
}

git_workflow_absolute_dir() {
  local path="$1"
  (cd "$path" && pwd -P)
}

git_workflow_git_root() {
  local repo="${1:-$PWD}"
  git -C "$repo" rev-parse --show-toplevel 2>/dev/null
}

git_workflow_repository_context() {
  local repo="${1:-$PWD}"
  local git_root
  local abs_root
  local abs_lesson
  local product_root

  git_root="$(git_workflow_git_root "$repo")" || {
    printf 'not-git\n'
    return 1
  }

  abs_root="$(git_workflow_absolute_dir "$git_root")"
  abs_lesson="$(git_workflow_absolute_dir "$LESSON_ROOT")"
  if [[ "$abs_root" == "$abs_lesson" ]]; then
    printf 'lesson\n'
    return 0
  fi

  if product_root="$(lesson_product_repo_root 2>/dev/null)" && [[ -n "$product_root" && -e "$product_root" ]]; then
    local product_git_root
    local abs_product
    product_git_root="$(git_workflow_git_root "$product_root" 2>/dev/null || true)"
    if [[ -n "$product_git_root" ]]; then
      abs_product="$(git_workflow_absolute_dir "$product_git_root")"
    fi
    if [[ -n "${abs_product:-}" && "$abs_root" == "$abs_product" ]]; then
      printf 'product\n'
      return 0
    fi
  fi

  printf 'custom\n'
}

git_workflow_branch_name() {
  local repo="$1"
  git -C "$repo" symbolic-ref --quiet --short HEAD 2>/dev/null || git -C "$repo" rev-parse --short HEAD
}

git_workflow_upstream_name() {
  local repo="$1"
  local upstream
  if upstream="$(git -C "$repo" rev-parse --abbrev-ref --symbolic-full-name '@{upstream}' 2>/dev/null)" && [[ -n "$upstream" && "$upstream" != "@{upstream}" ]]; then
    printf '%s\n' "$upstream"
  fi
}

git_workflow_upstream_counts() {
  local repo="$1"
  local upstream="$2"
  local counts
  if [[ -z "$upstream" ]]; then
    printf '0 0\n'
    return 0
  fi
  if counts="$(git -C "$repo" rev-list --left-right --count "HEAD...$upstream" 2>/dev/null)"; then
    awk '{ print $1, $2 }' <<<"$counts"
  else
    printf 'unknown unknown\n'
    return 1
  fi
}

git_workflow_worktree_state() {
  local repo="$1"
  if [[ -z "$(git -C "$repo" status --short)" ]]; then
    printf 'clean\n'
  else
    printf 'dirty\n'
  fi
}

git_workflow_candidate_branches() {
  local repo="$1"
  local current="$2"
  git -C "$repo" branch --merged 2>/dev/null \
    | sed 's/^[* ]*//' \
    | awk -v current="$current" '
      $0 != "" &&
      $0 !~ /^\(/ &&
      $0 != current &&
      $0 != "main" &&
      $0 != "master" &&
      $0 != "trunk" &&
      $0 != "develop" { print }
    '
}

git_workflow_candidate_worktrees() {
  local repo="$1"
  local root="$2"
  local abs_root
  abs_root="$(git_workflow_absolute_dir "$root")"
  git -C "$repo" worktree list --porcelain 2>/dev/null \
    | awk '/^worktree / { sub(/^worktree /, ""); print }' \
    | while IFS= read -r path; do
        [[ -d "$path" ]] || continue
        local abs_path
        abs_path="$(git_workflow_absolute_dir "$path")"
        [[ "$abs_path" == "$abs_root" ]] || printf '%s\n' "$path"
      done
}

git_workflow_print_settings() {
  while IFS=$'\t' read -r key _allowed _default label description; do
    printf '%s: %s\n' "$key" "$(git_workflow_setting_value "$key")"
    printf '  %s - %s\n' "$label" "$description"
  done < <(git_workflow_policy_rows)
}

git_workflow_print_action_modes() {
  local repo="${1:-$PWD}"
  printf 'commit: %s\n' "$(git_workflow_action_mode commit "$repo")"
  printf 'push: %s\n' "$(git_workflow_action_mode push "$repo")"
  printf 'PR creation: %s\n' "$(git_workflow_action_mode pr "$repo")"
  printf 'PR CI monitoring: %s\n' "$(git_workflow_action_mode pr_ci "$repo")"
  printf 'merge execution: %s\n' "$(git_workflow_action_mode merge "$repo")"
  printf 'developer auto-merge allowed: %s\n' "$(git_workflow_setting_value developer_auto_merge_allowed)"
  printf 'main CI monitoring: %s\n' "$(git_workflow_action_mode main_ci "$repo")"
  printf 'sync monitoring: %s\n' "$(git_workflow_action_mode sync "$repo")"
}

git_workflow_print_monitor() {
  local repo="${1:-$PWD}"
  local root
  local context
  local branch
  local state
  local upstream
  local counts
  local ahead
  local behind
  local candidates
  local worktrees

  root="$(git_workflow_git_root "$repo")" || {
    printf 'Git repository: not found (%s)\n' "$repo"
    return 1
  }

  context="$(git_workflow_repository_context "$repo")"
  branch="$(git_workflow_branch_name "$root")"
  state="$(git_workflow_worktree_state "$root")"
  upstream="$(git_workflow_upstream_name "$root")"
  if counts="$(git_workflow_upstream_counts "$root" "$upstream")"; then
    ahead="${counts%% *}"
    behind="${counts##* }"
  else
    ahead="unknown"
    behind="unknown"
  fi
  candidates="$(git_workflow_candidate_branches "$root" "$branch")"
  worktrees="$(git_workflow_candidate_worktrees "$root" "$root")"

  printf 'Repository context: %s\n' "$context"
  printf 'Git root: %s\n' "$root"
  printf 'Branch: %s\n' "$branch"
  printf 'Working tree: %s\n' "$state"
  if [[ -n "$upstream" ]]; then
    printf 'Upstream: %s\n' "$upstream"
    printf 'Ahead: %s\n' "$ahead"
    printf 'Behind: %s\n' "$behind"
  else
    printf 'Upstream: none\n'
  fi

  if [[ -n "$candidates" ]]; then
    printf 'Candidate cleanup branches:\n%s\n' "$candidates"
  else
    printf 'Candidate cleanup branches: none\n'
  fi

  if [[ -n "$worktrees" ]]; then
    printf 'Candidate cleanup worktrees:\n%s\n' "$worktrees"
  else
    printf 'Candidate cleanup worktrees: none\n'
  fi
}

git_workflow_check_repository() {
  local repo="${1:-$PWD}"
  local root
  local upstream
  local counts
  local ahead
  local behind
  local failed=0

  root="$(git_workflow_git_root "$repo")" || {
    printf 'Git repository: not found (%s)\n' "$repo" >&2
    return 1
  }

  git_workflow_print_monitor "$root"

  if [[ "$(git_workflow_worktree_state "$root")" != "clean" ]]; then
    printf 'Git monitor failed: uncommitted changes are present.\n' >&2
    failed=1
  fi

  upstream="$(git_workflow_upstream_name "$root")"
  if [[ -z "$upstream" ]]; then
    printf 'Git monitor failed: upstream is not configured.\n' >&2
    failed=1
  else
    if counts="$(git_workflow_upstream_counts "$root" "$upstream")"; then
      ahead="${counts%% *}"
      behind="${counts##* }"
    else
      printf 'Git monitor failed: upstream cannot be resolved.\n' >&2
      failed=1
      ahead="unknown"
      behind="unknown"
    fi
    if [[ "$ahead" != "0" || "$behind" != "0" ]]; then
      printf 'Git monitor failed: local and upstream differ.\n' >&2
      failed=1
    fi
  fi

  return "$failed"
}

git_workflow_require_delivery_plan() {
  local plan="$1"
  local action="$2"
  local repo="${3:-$PWD}"
  [[ -n "$plan" && -f "$plan" ]] || {
    printf 'Current delivery plan is required: %s\n' "$plan" >&2
    return 1
  }
  (
    cd "$LESSON_ROOT"
    "$LESSON_ROOT/tools/next-workflow" delivery recheck --plan "$plan" --git-action "$action" >/dev/null
  ) || {
    printf 'Delivery-plan recheck refused Git action %s for %s.\n' "$action" "$repo" >&2
    return 1
  }
}

git_workflow_allow_policy() {
  local action="$1"
  local repo="${2:-$PWD}"

  git_workflow_current_consistency_allows_runtime || return 1

  case "$action" in
    branch)
      git_workflow_bool_enabled branch_allowed
      ;;
    worktree)
      git_workflow_bool_enabled worktree_allowed
      ;;
    main-direct)
      git_workflow_bool_enabled main_direct_work_allowed
      ;;
    developer_auto_merge|developer-auto-merge)
      git_workflow_developer_auto_merge_gates_pass "$repo"
      ;;
    commit|push|pr|ci|pr_ci|pr-ci|main_ci|main-ci|sync|merge)
      git_workflow_automation_allows "$action" "$repo"
      ;;
    *)
      printf 'Unknown Git workflow action: %s\n' "$action" >&2
      return 1
      ;;
  esac
}
