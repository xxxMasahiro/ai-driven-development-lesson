#!/usr/bin/env bash

if [[ -z "${LESSON_ROOT:-}" ]]; then
  DASHBOARD_DISPLAY_DEPTH_LIB_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
  # shellcheck source=lesson_common.sh
  source "$DASHBOARD_DISPLAY_DEPTH_LIB_DIR/lesson_common.sh"
fi

dashboard_display_depth_file() {
  printf '%s\n' "${DASHBOARD_DISPLAY_DEPTH_FILE:-$LESSON_ROOT/learning/DASHBOARD_DISPLAY_DEPTH.tsv}"
}

dashboard_display_depth_valid() {
  case "$1" in
    friendly|standard|technical) return 0 ;;
  esac
  return 1
}

dashboard_display_depth_label() {
  case "$1" in
    friendly) printf 'Guide' ;;
    standard) printf 'Standard' ;;
    technical) printf 'Technical detail' ;;
    *) printf '%s' "$1" ;;
  esac
}

dashboard_display_depth_normalize() {
  local value="$1"
  dashboard_display_depth_valid "$value" || {
    printf 'invalid dashboard display depth: %s\n' "$value" >&2
    return 1
  }
  printf '%s\t%s\n' "$value" "$(dashboard_display_depth_label "$value")"
}

dashboard_display_depth_setting_row() {
  local file="${1:-$(dashboard_display_depth_file)}"
  [[ -f "$file" ]] || return 1
  awk -F '\t' '
    /^[[:space:]]*$/ { next }
    $1 ~ /^#/ { next }
    NF >= 2 && $2 != "" {
      label = (NF >= 3 && $3 != "") ? $3 : $2
      print $2 "\t" label
      found = 1
      exit
    }
    END { exit found ? 0 : 1 }
  ' "$file"
}

dashboard_display_depth_current_value() {
  local file="${1:-$(dashboard_display_depth_file)}"
  local row value
  row="$(dashboard_display_depth_setting_row "$file" 2>/dev/null || true)"
  value="${row%%$'\t'*}"
  if dashboard_display_depth_valid "$value"; then
    printf '%s' "$value"
  else
    printf 'standard'
  fi
}

dashboard_display_depth_current_label() {
  local file="${1:-$(dashboard_display_depth_file)}"
  local row value label
  row="$(dashboard_display_depth_setting_row "$file" 2>/dev/null || true)"
  value="${row%%$'\t'*}"
  label="${row#*$'\t'}"
  if dashboard_display_depth_valid "$value" && [[ -n "$label" && "$label" != "$value" ]]; then
    printf '%s' "$label"
    return 0
  fi
  dashboard_display_depth_label "$(dashboard_display_depth_current_value "$file")"
}

dashboard_display_depth_write_setting() {
  local file="$1"
  local value="$2"
  local label="${3:-}"
  local target_dir tmp stamp
  dashboard_display_depth_valid "$value" || {
    printf 'invalid dashboard display depth: %s\n' "$value" >&2
    return 1
  }
  [[ -n "$label" ]] || label="$(dashboard_display_depth_label "$value")"
  target_dir="$(dirname "$file")"
  mkdir -p "$target_dir"
  stamp="$(date '+%Y-%m-%d %H:%M:%S')"
  tmp="$(mktemp "$target_dir/.dashboard-display-depth.XXXXXX.tmp")"
  printf '# selected_at\tdepth\tlabel\n%s\t%s\t%s\n' "$stamp" "$value" "$label" >"$tmp"
  dashboard_display_depth_valid "$(dashboard_display_depth_current_value "$tmp")" || {
    rm -f "$tmp"
    return 1
  }
  mv "$tmp" "$file"
}
