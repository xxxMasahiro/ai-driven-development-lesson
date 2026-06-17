#!/usr/bin/env bash

if [[ -z "${LESSON_ROOT:-}" ]]; then
  PRODUCT_WORKFLOW_GIT_USAGE_LIB_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
  # shellcheck source=lesson_common.sh
  source "$PRODUCT_WORKFLOW_GIT_USAGE_LIB_DIR/lesson_common.sh"
fi

if ! declare -F product_repository_authority_gate >/dev/null 2>&1; then
  # shellcheck source=product_repository_authority.sh
  source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/product_repository_authority.sh"
fi

if ! declare -F product_repository_registry_root_for_menu >/dev/null 2>&1; then
  # shellcheck source=product_repository_registry.sh
  source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/product_repository_registry.sh"
fi

product_workflow_git_usage_policy_file() {
  printf '%s\n' "${PRODUCT_WORKFLOW_GIT_USAGE_POLICY_FILE:-$LESSON_ROOT/docs/workflow/PRODUCT_WORKFLOW_GIT_USAGE_POLICY.tsv}"
}

product_workflow_git_usage_settings_file() {
  printf '%s\n' "${PRODUCT_WORKFLOW_GIT_USAGE_SETTINGS_FILE:-$LESSON_ROOT/learning/PRODUCT_WORKFLOW_GIT_USAGE_SETTINGS.tsv}"
}

product_workflow_git_usage_policy_rows() {
  local file
  file="$(product_workflow_git_usage_policy_file)"
  awk -F '\t' '
    /^[[:space:]]*$/ { next }
    $1 ~ /^#/ { next }
    {
      if (NF != 5) {
        printf "invalid product workflow Git usage policy row: %s\n", $0 > "/dev/stderr"
        invalid = 1
        next
      }
      print
    }
    END { exit invalid ? 1 : 0 }
  ' "$file"
}

product_workflow_git_usage_settings_rows() {
  local file
  file="$(product_workflow_git_usage_settings_file)"
  [[ -f "$file" ]] || return 0
  awk -F '\t' '
    /^[[:space:]]*$/ { next }
    $1 ~ /^#/ { next }
    {
      if (NF != 3) {
        printf "invalid product workflow Git usage settings row: %s\n", $0 > "/dev/stderr"
        invalid = 1
        next
      }
      print
    }
    END { exit invalid ? 1 : 0 }
  ' "$file"
}

product_workflow_git_usage_policy_field() {
  local context="$1"
  local field="$2"
  local field_index
  case "$field" in
    allowed_modes) field_index=2 ;;
    default_mode) field_index=3 ;;
    label) field_index=4 ;;
    description) field_index=5 ;;
    *) printf 'unknown product workflow Git usage policy field: %s\n' "$field" >&2; return 1 ;;
  esac
  product_workflow_git_usage_policy_rows | awk -F '\t' -v context="$context" -v field_index="$field_index" '
    $1 == context { print $field_index; found = 1; exit }
    END { exit found ? 0 : 1 }
  '
}

product_workflow_git_usage_context_supported() {
  local context="$1"
  product_workflow_git_usage_policy_rows | awk -F '\t' -v context="$context" '$1 == context { found = 1 } END { exit found ? 0 : 1 }'
}

product_workflow_git_usage_context_for_menu() {
  case "$1" in
    free-development|product-improvement|external-integration) printf '%s' "$1" ;;
    *) printf 'not_applicable' ;;
  esac
}

product_workflow_git_usage_mode_valid() {
  case "$1" in
    none|local|remote_sync|ci) return 0 ;;
  esac
  return 1
}

product_workflow_git_usage_mode_allowed_for_context() {
  local context="$1"
  local mode="$2"
  local allowed item
  product_workflow_git_usage_mode_valid "$mode" || return 1
  allowed="$(product_workflow_git_usage_policy_field "$context" allowed_modes)" || return 1
  IFS='|' read -r -a items <<<"$allowed"
  for item in "${items[@]}"; do
    if [[ "$item" == "$mode" ]]; then
      return 0
    fi
  done
  return 1
}

product_workflow_git_usage_default_mode() {
  local context="$1"
  local default_mode allowed
  local -a allowed_modes
  default_mode="$(product_workflow_git_usage_policy_field "$context" default_mode 2>/dev/null || printf 'ci')"
  if product_workflow_git_usage_mode_allowed_for_context "$context" "$default_mode"; then
    printf '%s' "$default_mode"
    return 0
  fi
  if product_workflow_git_usage_mode_allowed_for_context "$context" "ci"; then
    printf 'ci'
    return 0
  fi
  allowed="$(product_workflow_git_usage_policy_field "$context" allowed_modes 2>/dev/null || true)"
  IFS='|' read -r -a allowed_modes <<<"$allowed"
  for default_mode in "${allowed_modes[@]}"; do
    if product_workflow_git_usage_mode_allowed_for_context "$context" "$default_mode"; then
      printf '%s' "$default_mode"
      return 0
    fi
  done
  printf 'invalid product workflow Git usage policy for %s\n' "$context" >&2
  return 1
}

product_workflow_git_usage_setting_mode() {
  local context="$1"
  product_workflow_git_usage_settings_rows | awk -F '\t' -v context="$context" '
    $1 == context { value = $2; found = 1 }
    END {
      if (found) print value
      else exit 1
    }
  '
}

product_workflow_git_usage_env_override_allowed() {
  [[ "${PRODUCT_WORKFLOW_GIT_USAGE_ALLOW_ENV_OVERRIDE:-}" == "1" ]]
}

product_workflow_git_usage_mode_for_context() {
  local context="$1"
  local mode
  product_workflow_git_usage_context_supported "$context" || { printf 'not_applicable'; return 0; }
  if [[ -n "${PRODUCT_WORKFLOW_GIT_USAGE_MODE:-}" ]]; then
    product_workflow_git_usage_env_override_allowed || {
      printf 'PRODUCT_WORKFLOW_GIT_USAGE_MODE requires PRODUCT_WORKFLOW_GIT_USAGE_ALLOW_ENV_OVERRIDE=1; Dashboard Settings are the source of truth.\n' >&2
      return 1
    }
    mode="$PRODUCT_WORKFLOW_GIT_USAGE_MODE"
    product_workflow_git_usage_mode_allowed_for_context "$context" "$mode" || {
      printf 'invalid product workflow Git usage mode for %s: %s\n' "$context" "$mode" >&2
      return 1
    }
    printf '%s' "$mode"
    return 0
  fi
  if mode="$(product_workflow_git_usage_setting_mode "$context" 2>/dev/null)"; then
    if product_workflow_git_usage_mode_allowed_for_context "$context" "$mode"; then
      printf '%s' "$mode"
      return 0
    fi
  fi
  product_workflow_git_usage_default_mode "$context"
}

product_workflow_git_usage_mode_label() {
  case "$1" in
    none) printf 'Git not used' ;;
    local) printf 'Local Git only' ;;
    remote_sync) printf 'Remote sync' ;;
    ci) printf 'CI-backed Git' ;;
    not_applicable) printf 'Not applicable' ;;
    *) printf '%s' "$1" ;;
  esac
}

product_workflow_git_usage_requires_git_worktree() {
  case "$1" in
    local|remote_sync|ci) return 0 ;;
  esac
  return 1
}

product_workflow_git_usage_requires_remote_sync() {
  case "$1" in
    remote_sync|ci) return 0 ;;
  esac
  return 1
}

product_workflow_git_usage_requires_ci() {
  case "$1" in
    ci) return 0 ;;
  esac
  return 1
}

product_workflow_git_usage_bool() {
  if "$@"; then
    printf 'true'
  else
    printf 'false'
  fi
}

product_workflow_git_usage_requirement_for_axis() {
  local mode="$1"
  local axis="$2"
  case "$axis" in
    git)
      if product_workflow_git_usage_requires_git_worktree "$mode"; then printf 'required'; else printf 'not_applicable'; fi
      ;;
    remote_sync)
      if product_workflow_git_usage_requires_remote_sync "$mode"; then printf 'required'; else printf 'not_applicable'; fi
      ;;
    ci)
      if product_workflow_git_usage_requires_ci "$mode"; then printf 'required'; else printf 'not_applicable'; fi
      ;;
    *) printf 'unknown' ;;
  esac
}

product_workflow_git_usage_status_for_axis() {
  local mode="$1"
  local axis="$2"
  local fallback="$3"
  if [[ "$(product_workflow_git_usage_requirement_for_axis "$mode" "$axis")" == "not_applicable" ]]; then
    printf 'not_applicable'
  else
    printf '%s' "$fallback"
  fi
}

product_workflow_git_usage_git_command() {
  local mode="$1"
  local repo="${2:-}"
  local repo_arg="--product"
  [[ -z "$repo" ]] || repo_arg="--repo $repo"
  case "$mode" in
    none) printf 'not_applicable' ;;
    local) printf './tools/check_git_sync.sh %s --clean-required' "$repo_arg" ;;
    remote_sync|ci) printf './tools/check_git_sync.sh %s --required' "$repo_arg" ;;
    *) printf 'not_applicable' ;;
  esac
}

product_workflow_git_usage_ci_command() {
  local mode="$1"
  local repo="${2:-}"
  local repo_arg="--product"
  [[ -z "$repo" ]] || repo_arg="--repo $repo"
  if product_workflow_git_usage_requires_ci "$mode"; then
    printf './tools/check_ci_status.sh %s --required' "$repo_arg"
  else
    printf 'not_applicable'
  fi
}

product_workflow_git_usage_operation_mode_gate() {
  local repo="${1:-$(lesson_product_repo_root)}"
  "$LESSON_ROOT/tools/product-repository-mode" check --repo "$repo"
}

product_workflow_git_usage_repository_root_for_context() {
  local context="$1"
  local root
  if product_repository_registry_has_rows; then
    root="$(product_repository_registry_root_for_menu "$context" 2>/dev/null || true)"
    [[ -n "$root" ]] || {
      printf 'no external product repository is selected for %s\n' "$context" >&2
      return 1
    }
    printf '%s' "$root"
    return 0
  fi
  lesson_product_repo_root
}

product_workflow_git_usage_repository_boundary_gate_for_repo() {
  local context="$1"
  local repo="$2"
  local mode
  mode="$(product_workflow_git_usage_mode_for_context "$context")"
  if [[ -z "$repo" ]]; then
    printf 'missing selected product repository for %s: not_selected\n' "$context" >&2
    return 1
  fi
  if [[ ! -d "$repo" ]]; then
    printf 'expected product repository does not exist: %s\n' "$repo" >&2
    return 1
  fi
  case "$repo/" in
    "$LESSON_ROOT/"*)
      printf 'product repository must not be inside the lesson repository: %s\n' "$repo" >&2
      return 1
      ;;
  esac
  if product_workflow_git_usage_requires_git_worktree "$mode"; then
    git -C "$repo" rev-parse --is-inside-work-tree >/dev/null 2>&1 || {
      printf 'selected product repository is not a Git worktree: %s\n' "$repo" >&2
      return 1
    }
  fi
}

product_workflow_git_usage_gate_plan_row() {
  local context="$1"
  local mode="$2"
  local gate_id="$3"
  local requirement="$4"
  local command="$5"
  local description="$6"
  printf '%s\t%s\t%s\t%s\t%s\t%s\n' "$context" "$mode" "$gate_id" "$requirement" "$command" "$description"
}

product_workflow_git_usage_gate_plan() {
  local context="$1"
  local product_type="${2:-all}"
  local mode git_requirement ci_requirement scaffold_command authority_command security_command git_command ci_command boundary_command repo repo_arg
  mode="$(product_workflow_git_usage_mode_for_context "$context")"
  repo="$(product_workflow_git_usage_repository_root_for_context "$context" 2>/dev/null || true)"
  repo_arg=""
  [[ -z "$repo" ]] || repo_arg=" --repo $repo"
  git_requirement="$(product_workflow_git_usage_requirement_for_axis "$mode" git)"
  ci_requirement="$(product_workflow_git_usage_requirement_for_axis "$mode" ci)"
  if product_repository_registry_has_rows; then
    boundary_command="./tools/product-repository-registry selected $context"
  else
    boundary_command="./tools/check_repository_boundary.sh --product-workspace-required"
  fi
  if product_workflow_git_usage_requires_git_worktree "$mode"; then
    security_command="./tools/product-security gate --context $context"
  else
    security_command="./tools/product-security gate --context $context --git-optional"
  fi
  scaffold_command="./tools/product-scaffold-check check --context $context --product-type $product_type$repo_arg"
  authority_command="./tools/product-repository-authority status --context $context --product-type $product_type --json$repo_arg"
  if [[ "$git_requirement" == "not_applicable" ]]; then
    scaffold_command="$scaffold_command --git-optional"
    authority_command="$authority_command --git-optional"
  fi
  if [[ "$ci_requirement" == "not_applicable" ]]; then
    scaffold_command="$scaffold_command --ci-optional"
    authority_command="$authority_command --ci-optional"
  fi
  git_command="$(product_workflow_git_usage_git_command "$mode" "$repo")"
  ci_command="$(product_workflow_git_usage_ci_command "$mode" "$repo")"
  printf '# context\tmode\tgate_id\trequirement\tcommand\tdescription\n'
  product_workflow_git_usage_gate_plan_row "$context" "$mode" "repository_boundary" "required" "$boundary_command" "Confirm the product target path matches the selected Git usage mode."
  product_workflow_git_usage_gate_plan_row "$context" "$mode" "operation_mode" "required" "./tools/product-repository-mode check$repo_arg" "Confirm product AGENTS.MD and ops/PRODUCT_OPERATION_MODE.tsv are ready."
  product_workflow_git_usage_gate_plan_row "$context" "$mode" "scaffold" "required" "$scaffold_command" "Validate product-local docs, manifests, skills, tools, and source/test authorities."
  product_workflow_git_usage_gate_plan_row "$context" "$mode" "authority" "required" "$authority_command" "Read product manifests and evidence with the selected Git/CI applicability."
  product_workflow_git_usage_gate_plan_row "$context" "$mode" "security" "required" "$security_command" "Run product security checks with matching Git applicability."
  product_workflow_git_usage_gate_plan_row "$context" "$mode" "workflow_pair_sync" "required" "./tools/check_workflow_pair_sync.sh$repo_arg" "Confirm product task tracker and handoff stay synchronized."
  product_workflow_git_usage_gate_plan_row "$context" "$mode" "git_sync" "$git_requirement" "$git_command" "Check product Git state only when the selected mode requires Git."
  product_workflow_git_usage_gate_plan_row "$context" "$mode" "ci" "$ci_requirement" "$ci_command" "Check product CI only when the selected mode requires CI."
}

product_workflow_git_usage_write_setting() {
  local context="$1"
  local mode="$2"
  local file dir tmp stamp row row_context existing_rows
  product_workflow_git_usage_context_supported "$context" || { printf 'unsupported product workflow context: %s\n' "$context" >&2; return 1; }
  product_workflow_git_usage_mode_allowed_for_context "$context" "$mode" || { printf 'unsupported product workflow Git usage mode for %s: %s\n' "$context" "$mode" >&2; return 1; }
  file="$(product_workflow_git_usage_settings_file)"
  dir="$(dirname "$file")"
  mkdir -p "$dir"
  stamp="$(date -u '+%Y-%m-%dT%H:%M:%SZ')"
  tmp="$(mktemp "$dir/.product-workflow-git-usage.XXXXXX.tmp")"
  existing_rows="$(product_workflow_git_usage_settings_rows 2>/dev/null)" || {
    rm -f "$tmp"
    return 1
  }
  printf '# context\tmode\tselected_at\n' >"$tmp"
  while IFS= read -r row; do
    [[ -n "$row" ]] || continue
    row_context="$(printf '%s\n' "$row" | awk -F '\t' '{ print $1 }')"
    [[ "$row_context" != "$context" ]] || continue
    printf '%s\n' "$row" >>"$tmp"
  done <<<"$existing_rows"
  printf '%s\t%s\t%s\n' "$context" "$mode" "$stamp" >>"$tmp"
  awk -F '\t' '
    /^[[:space:]]*$/ { next }
    $1 ~ /^#/ { next }
    NF != 3 { invalid = 1 }
    END { exit invalid ? 1 : 0 }
  ' "$tmp"
  mv "$tmp" "$file"
}

product_workflow_git_usage_repository_boundary_gate() {
  local context="$1"
  local repo
  repo="$(product_workflow_git_usage_repository_root_for_context "$context")" || return 1
  product_workflow_git_usage_repository_boundary_gate_for_repo "$context" "$repo"
}

product_workflow_git_usage_scaffold_gate() {
  local context="$1"
  local product_type="${2:-all}"
  local mode args repo
  repo="$(product_workflow_git_usage_repository_root_for_context "$context")" || return 1
  mode="$(product_workflow_git_usage_mode_for_context "$context")"
  args=(check --repo "$repo" --context "$context" --product-type "$product_type")
  if ! product_workflow_git_usage_requires_git_worktree "$mode"; then
    args+=(--git-optional)
  fi
  if ! product_workflow_git_usage_requires_ci "$mode"; then
    args+=(--ci-optional)
  fi
  "$LESSON_ROOT/tools/product-scaffold-check" "${args[@]}"
}

product_workflow_git_usage_authority_gate() {
  local context="$1"
  local product_type="${2:-all}"
  local mode git_required ci_required repo
  repo="$(product_workflow_git_usage_repository_root_for_context "$context")" || return 1
  mode="$(product_workflow_git_usage_mode_for_context "$context")"
  git_required="$(product_workflow_git_usage_bool product_workflow_git_usage_requires_git_worktree "$mode")"
  ci_required="$(product_workflow_git_usage_bool product_workflow_git_usage_requires_ci "$mode")"
  product_repository_authority_gate "$repo" "$context" "$product_type" "$git_required" "$ci_required"
}

product_workflow_git_usage_security_gate() {
  local context="$1"
  local mode repo
  repo="$(product_workflow_git_usage_repository_root_for_context "$context")" || return 1
  mode="$(product_workflow_git_usage_mode_for_context "$context")"
  if product_workflow_git_usage_requires_git_worktree "$mode"; then
    "$LESSON_ROOT/tools/product-security" gate --context "$context" --repo "$repo"
  else
    "$LESSON_ROOT/tools/product-security" gate --context "$context" --repo "$repo" --git-optional
  fi
}

product_workflow_git_usage_git_ci_gate() {
  local context="$1"
  local mode repo
  repo="$(product_workflow_git_usage_repository_root_for_context "$context")" || return 1
  mode="$(product_workflow_git_usage_mode_for_context "$context")"
  if product_workflow_git_usage_requires_git_worktree "$mode"; then
    if product_workflow_git_usage_requires_remote_sync "$mode"; then
      "$LESSON_ROOT/tools/check_git_sync.sh" --repo "$repo" --required
    else
      "$LESSON_ROOT/tools/check_git_sync.sh" --repo "$repo" --clean-required
    fi
  else
    printf 'Product Git sync gate: not applicable for product workflow Git usage mode "%s".\n' "$mode"
  fi
  if product_workflow_git_usage_requires_ci "$mode"; then
    "$LESSON_ROOT/tools/check_ci_status.sh" --repo "$repo" --required
  else
    printf 'Product CI gate: not applicable for product workflow Git usage mode "%s".\n' "$mode"
  fi
}

product_workflow_git_usage_gate() {
  local context="$1"
  local product_type="${2:-all}"
  local repo
  repo="$(product_workflow_git_usage_repository_root_for_context "$context")" || return 1
  product_workflow_git_usage_repository_boundary_gate "$context"
  product_workflow_git_usage_operation_mode_gate "$repo"
  product_workflow_git_usage_scaffold_gate "$context" "$product_type"
  product_workflow_git_usage_authority_gate "$context" "$product_type"
  product_workflow_git_usage_security_gate "$context"
  "$LESSON_ROOT/tools/check_workflow_pair_sync.sh" --repo "$repo"
  product_workflow_git_usage_git_ci_gate "$context"
}
