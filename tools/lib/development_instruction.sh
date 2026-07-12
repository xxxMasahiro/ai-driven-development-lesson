#!/usr/bin/env bash

if [[ -z "${LESSON_ROOT:-}" ]]; then
  DEVELOPMENT_INSTRUCTION_LIB_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
  # shellcheck source=lesson_common.sh
  source "$DEVELOPMENT_INSTRUCTION_LIB_DIR/lesson_common.sh"
fi

development_instruction_policy_file() {
  printf '%s\n' "${DEVELOPMENT_INSTRUCTION_POLICY_FILE:-$LESSON_ROOT/docs/workflow/DEVELOPMENT_INSTRUCTION_POLICY.tsv}"
}

development_instruction_activation_mode() {
  awk -F '\t' '
    /^[[:space:]]*$/ { next }
    $1 ~ /^#/ { next }
    $1 == "activation_mode" { print $2; found = 1; exit }
    END { exit found ? 0 : 1 }
  ' "$(development_instruction_policy_file)"
}

development_instruction_policy_value() {
  local key="$1"
  awk -F '\t' -v key="$key" '
    /^[[:space:]]*$/ { next }
    $1 ~ /^#/ { next }
    $1 == key { print $2; found = 1; exit }
    END { exit found ? 0 : 1 }
  ' "$(development_instruction_policy_file)"
}

development_instruction_parent_file() {
  printf '%s/%s\n' "$LESSON_ROOT" "$(development_instruction_policy_value parent_instruction_path)"
}

development_instruction_autonomy_file() {
  printf '%s/%s\n' "$LESSON_ROOT" "$(development_instruction_policy_value autonomy_workflow_path)"
}

development_instruction_status_parent() {
  local stage="${1:-}"
  local scope_id="${2:-}"
  local args=(status --target parent)
  [[ -z "$stage" ]] || args+=(--stage "$stage")
  [[ -z "$scope_id" ]] || args+=(--scope-id "$scope_id")
  "$LESSON_ROOT/tools/development-instruction" "${args[@]}"
}

development_instruction_status_product() {
  local context="$1"
  local repo="$2"
  local stage="${3:-}"
  local scope_id="${4:-}"
  local args=(status --context "$context" --repo "$repo")
  [[ -z "$stage" ]] || args+=(--stage "$stage")
  [[ -z "$scope_id" ]] || args+=(--scope-id "$scope_id")
  "$LESSON_ROOT/tools/development-instruction" "${args[@]}"
}

development_instruction_gate_product() {
  local context="$1"
  local repo="$2"
  local output
  if output="$(development_instruction_status_product "$context" "$repo" 2>&1)"; then
    printf '%s\n' "$output"
    return 0
  fi
  if [[ "$(development_instruction_activation_mode 2>/dev/null || printf 'enforce')" == "shadow" ]]; then
    printf 'Development instruction shadow warning: %s\n' "$output" >&2
    return 0
  fi
  printf '%s\n' "$output" >&2
  return 1
}
