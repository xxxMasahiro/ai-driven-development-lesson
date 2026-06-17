#!/usr/bin/env bash

if [[ -z "${LESSON_ROOT:-}" ]]; then
  PRODUCT_REPOSITORY_REGISTRY_LIB_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
  # shellcheck source=lesson_common.sh
  source "$PRODUCT_REPOSITORY_REGISTRY_LIB_DIR/lesson_common.sh"
fi

product_repository_registry_file() {
  printf '%s\n' "${PRODUCT_REPOSITORY_REGISTRY_FILE:-$LESSON_ROOT/learning/PRODUCT_REPOSITORY_REGISTRY.tsv}"
}

product_repository_registry_selection_file() {
  printf '%s\n' "${PRODUCT_REPOSITORY_SELECTION_FILE:-$LESSON_ROOT/learning/PRODUCT_REPOSITORY_SELECTION.tsv}"
}

product_repository_registry_rows() {
  local file
  file="$(product_repository_registry_file)"
  [[ -f "$file" ]] || return 0
  awk -F '\t' '
    /^[[:space:]]*$/ { next }
    $1 ~ /^#/ { next }
    {
      if (NF != 7) {
        printf "invalid product repository registry row: %s\n", $0 > "/dev/stderr"
        invalid = 1
        next
      }
      print
    }
    END { exit invalid ? 1 : 0 }
  ' "$file"
}

product_repository_registry_selection_rows() {
  local file
  file="$(product_repository_registry_selection_file)"
  [[ -f "$file" ]] || return 0
  awk -F '\t' '
    /^[[:space:]]*$/ { next }
    $1 ~ /^#/ { next }
    {
      if (NF != 4) {
        printf "invalid product repository selection row: %s\n", $0 > "/dev/stderr"
        invalid = 1
        next
      }
      print
    }
    END { exit invalid ? 1 : 0 }
  ' "$file"
}

product_repository_registry_has_rows() {
  [[ -n "$(product_repository_registry_rows 2>/dev/null | head -n 1)" ]]
}

product_repository_registry_context_supported() {
  case "$1" in
    free-development|product-improvement|external-integration) return 0 ;;
    *) return 1 ;;
  esac
}

product_repository_registry_context_allowed() {
  local allowed="$1"
  local context="$2"
  local item
  IFS='|' read -r -a items <<<"$allowed"
  for item in "${items[@]}"; do
    if [[ "$item" == "$context" ]]; then
      return 0
    fi
  done
  return 1
}

product_repository_registry_row_for_id() {
  local repo_id="$1"
  product_repository_registry_rows | awk -F '\t' -v repo_id="$repo_id" '$1 == repo_id { print; found = 1; exit } END { exit found ? 0 : 1 }'
}

product_repository_registry_selected_id_for_menu() {
  local menu_id="$1"
  local requested="${PRODUCT_REPOSITORY_ID:-${DASHBOARD_SELECTED_REPOSITORY_ID:-}}"
  if [[ -n "$requested" ]]; then
    printf '%s' "$requested"
    return 0
  fi
  product_repository_registry_selection_rows | awk -F '\t' -v menu_id="$menu_id" '$1 == menu_id { print $2; found = 1; exit } END { exit found ? 0 : 1 }'
}

product_repository_registry_first_id_for_menu() {
  local menu_id="$1"
  product_repository_registry_rows | awk -F '\t' -v menu_id="$menu_id" '
    function allowed(list, context, item_count, items, i) {
      item_count = split(list, items, "|")
      for (i = 1; i <= item_count; i++) {
        if (items[i] == context) return 1
      }
      return 0
    }
    allowed($3, menu_id) { print $1; found = 1; exit }
    END { exit found ? 0 : 1 }
  '
}

product_repository_registry_rows_for_context() {
  local menu_id="$1"
  product_repository_registry_rows | awk -F '\t' -v menu_id="$menu_id" '
    function allowed(list, context, item_count, items, i) {
      item_count = split(list, items, "|")
      for (i = 1; i <= item_count; i++) {
        if (items[i] == context) return 1
      }
      return 0
    }
    allowed($3, menu_id) { print }
  '
}

product_repository_registry_field_for_id() {
  local repo_id="$1"
  local field="$2"
  local field_index
  case "$field" in
    repo_id) field_index=1 ;;
    primary_menu_id) field_index=2 ;;
    allowed_contexts) field_index=3 ;;
    display_name) field_index=4 ;;
    repository_path) field_index=5 ;;
    product_type) field_index=6 ;;
    source) field_index=7 ;;
    *) printf 'unknown product repository registry field: %s\n' "$field" >&2; return 1 ;;
  esac
  product_repository_registry_row_for_id "$repo_id" | awk -F '\t' -v field_index="$field_index" '{ print $field_index }'
}

product_repository_registry_root_for_id() {
  local repo_id="$1"
  local raw_path
  raw_path="$(product_repository_registry_field_for_id "$repo_id" repository_path)" || return 1
  lesson_expand_path "$raw_path"
}

product_repository_registry_id_for_menu() {
  local menu_id="$1"
  local selected_id
  product_repository_registry_context_supported "$menu_id" || return 1
  selected_id="$(product_repository_registry_selected_id_for_menu "$menu_id" 2>/dev/null || true)"
  if [[ -n "$selected_id" ]]; then
    product_repository_registry_row_for_id "$selected_id" >/dev/null || return 1
    product_repository_registry_context_allowed "$(product_repository_registry_field_for_id "$selected_id" allowed_contexts)" "$menu_id" || return 1
    printf '%s' "$selected_id"
    return 0
  fi
  if [[ "$menu_id" == "free-development" ]]; then
    product_repository_registry_first_id_for_menu "$menu_id"
    return
  fi
  return 1
}

product_repository_registry_root_for_menu() {
  local menu_id="$1"
  local repo_id
  repo_id="$(product_repository_registry_id_for_menu "$menu_id")" || return 1
  product_repository_registry_root_for_id "$repo_id"
}

product_repository_registry_name_for_menu() {
  local menu_id="$1"
  local repo_id
  repo_id="$(product_repository_registry_id_for_menu "$menu_id")" || return 1
  product_repository_registry_field_for_id "$repo_id" display_name
}

product_repository_registry_status_for_id() {
  local repo_id="$1"
  local root
  root="$(product_repository_registry_root_for_id "$repo_id")" || {
    printf 'missing'
    return 0
  }
  if [[ -d "$root" ]]; then
    printf 'ready'
  else
    printf 'missing'
  fi
}

product_repository_registry_print_status() {
  local row repo_id primary allowed name raw_path product_type source root status selected_marker selected_id
  printf 'Product repository registry: %s\n' "$(product_repository_registry_file)"
  selected_id="$(product_repository_registry_selected_id_for_menu free-development 2>/dev/null || true)"
  while IFS=$'\t' read -r repo_id primary allowed name raw_path product_type source; do
    root="$(lesson_expand_path "$raw_path")"
    status="$(product_repository_registry_status_for_id "$repo_id")"
    selected_marker=""
    [[ "$repo_id" != "$selected_id" ]] || selected_marker=" selected"
    printf '%s\t%s\t%s\t%s\t%s\t%s%s\n' "$repo_id" "$primary" "$allowed" "$name" "$root" "$status" "$selected_marker"
  done < <(product_repository_registry_rows)
}
