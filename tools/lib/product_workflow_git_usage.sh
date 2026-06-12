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

product_workflow_git_usage_mode_for_context() {
  local context="$1"
  local mode
  product_workflow_git_usage_context_supported "$context" || { printf 'not_applicable'; return 0; }
  if [[ -n "${PRODUCT_WORKFLOW_GIT_USAGE_MODE:-}" ]]; then
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
  case "$mode" in
    none) printf 'not_applicable' ;;
    local) printf './tools/check_git_sync.sh --product --clean-required' ;;
    remote_sync|ci) printf './tools/check_git_sync.sh --product --required' ;;
    *) printf 'not_applicable' ;;
  esac
}

product_workflow_git_usage_ci_command() {
  local mode="$1"
  if product_workflow_git_usage_requires_ci "$mode"; then
    printf './tools/check_ci_status.sh --product --required'
  else
    printf 'not_applicable'
  fi
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
  local mode
  mode="$(product_workflow_git_usage_mode_for_context "$context")"
  if product_workflow_git_usage_requires_git_worktree "$mode"; then
    "$LESSON_ROOT/tools/check_repository_boundary.sh" --product-required >/dev/null
  else
    "$LESSON_ROOT/tools/check_repository_boundary.sh" --product-workspace-required >/dev/null
  fi
}

product_workflow_git_usage_scaffold_gate() {
  local context="$1"
  local product_type="${2:-all}"
  local mode
  mode="$(product_workflow_git_usage_mode_for_context "$context")"
  if product_workflow_git_usage_requires_git_worktree "$mode"; then
    "$LESSON_ROOT/tools/product-scaffold-check" check --context "$context" --product-type "$product_type"
  else
    "$LESSON_ROOT/tools/product-scaffold-check" check --context "$context" --product-type "$product_type" --git-optional
  fi
}

product_workflow_git_usage_authority_gate() {
  local context="$1"
  local product_type="${2:-all}"
  local mode git_required ci_required
  mode="$(product_workflow_git_usage_mode_for_context "$context")"
  git_required="$(product_workflow_git_usage_bool product_workflow_git_usage_requires_git_worktree "$mode")"
  ci_required="$(product_workflow_git_usage_bool product_workflow_git_usage_requires_ci "$mode")"
  product_repository_authority_gate "$(lesson_product_repo_root)" "$context" "$product_type" "$git_required" "$ci_required"
}

product_workflow_git_usage_security_gate() {
  local context="$1"
  local mode
  mode="$(product_workflow_git_usage_mode_for_context "$context")"
  if product_workflow_git_usage_requires_git_worktree "$mode"; then
    "$LESSON_ROOT/tools/product-security" gate --context "$context"
  else
    "$LESSON_ROOT/tools/product-security" gate --context "$context" --git-optional
  fi
}

product_workflow_git_usage_git_ci_gate() {
  local context="$1"
  local mode
  mode="$(product_workflow_git_usage_mode_for_context "$context")"
  if product_workflow_git_usage_requires_git_worktree "$mode"; then
    if product_workflow_git_usage_requires_remote_sync "$mode"; then
      "$LESSON_ROOT/tools/check_git_sync.sh" --product --required
    else
      "$LESSON_ROOT/tools/check_git_sync.sh" --product --clean-required
    fi
  else
    printf 'Product Git sync gate: not applicable for product workflow Git usage mode "%s".\n' "$mode"
  fi
  if product_workflow_git_usage_requires_ci "$mode"; then
    "$LESSON_ROOT/tools/check_ci_status.sh" --product --required
  else
    printf 'Product CI gate: not applicable for product workflow Git usage mode "%s".\n' "$mode"
  fi
}

product_workflow_git_usage_gate() {
  local context="$1"
  local product_type="${2:-all}"
  product_workflow_git_usage_repository_boundary_gate "$context"
  product_workflow_git_usage_scaffold_gate "$context" "$product_type"
  product_workflow_git_usage_authority_gate "$context" "$product_type"
  product_workflow_git_usage_security_gate "$context"
  "$LESSON_ROOT/tools/check_workflow_pair_sync.sh" --product
  product_workflow_git_usage_git_ci_gate "$context"
}
