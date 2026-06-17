#!/usr/bin/env bash

if [[ -z "${LESSON_ROOT:-}" ]]; then
  LESSON_CONTEXT_LIB_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
  # shellcheck source=lesson_common.sh
  source "$LESSON_CONTEXT_LIB_DIR/lesson_common.sh"
fi

lesson_context_dir() {
  printf '%s\n' "${LESSON_CONTEXT_DIR:-$LESSON_ROOT/learning/context}"
}

lesson_context_map_file() {
  printf '%s\n' "${LESSON_CONTEXT_MAP_FILE:-$(lesson_context_dir)/LESSON_CONTEXT_MAP.tsv}"
}

lesson_context_workflow_map_file() {
  printf '%s\n' "${LESSON_WORKFLOW_CONTEXT_MAP_FILE:-$(lesson_context_dir)/WORKFLOW_CONTEXT_MAP.tsv}"
}

lesson_context_ai_foundation_file() {
  printf '%s\n' "${LESSON_CONTEXT_AI_FOUNDATION_FILE:-$(lesson_context_dir)/AI_DRIVEN_DEVELOPMENT_FOUNDATION.md}"
}

lesson_context_security_foundation_file() {
  printf '%s\n' "${LESSON_CONTEXT_SECURITY_FOUNDATION_FILE:-$(lesson_context_dir)/SECURITY_FOUNDATION.md}"
}

lesson_context_readme_file() {
  printf '%s\n' "${LESSON_CONTEXT_README_FILE:-$(lesson_context_dir)/README.md}"
}

lesson_context_normalize_scope() {
  case "${1:-all}" in
    all)
      printf 'all'
      ;;
    lesson-7|lesson_7|seven-day|seven_day|7-day|7day)
      printf 'seven_day'
      ;;
    lesson-14|lesson_14|fourteen-day|fourteen_day|14-day|14day)
      printf 'fourteen_day'
      ;;
    applied|free-development|free_development|applied-or-free-development|applied_or_free_development)
      printf 'applied_or_free_development'
      ;;
    security|security_required)
      printf 'security_required'
      ;;
    dashboard|dashboard_candidate)
      printf 'dashboard_candidate'
      ;;
    prompt|prompt_example|prompt_example_required)
      printf 'prompt_example_required'
      ;;
    *)
      printf 'unknown learner context scope: %s\n' "$1" >&2
      return 1
      ;;
  esac
}

lesson_context_scope_label() {
  case "$1" in
    all) printf 'all' ;;
    seven_day) printf 'lesson-7' ;;
    fourteen_day) printf 'lesson-14' ;;
    applied_or_free_development) printf 'applied' ;;
    security_required) printf 'security' ;;
    dashboard_candidate) printf 'dashboard' ;;
    prompt_example_required) printf 'prompt-example' ;;
    *) printf '%s' "$1" ;;
  esac
}

lesson_context_scope_column() {
  case "$1" in
    seven_day) printf '6' ;;
    fourteen_day) printf '7' ;;
    applied_or_free_development) printf '8' ;;
    security_required) printf '9' ;;
    prompt_example_required) printf '10' ;;
    dashboard_candidate) printf '11' ;;
    all) printf '0' ;;
    *)
      printf 'unknown learner context scope: %s\n' "$1" >&2
      return 1
      ;;
  esac
}

lesson_context_phase_field() {
  case "$1" in
    opening) printf '3' ;;
    step|section) printf '4' ;;
    recap|final_recap) printf '5' ;;
    *)
      printf 'unknown learner context phase: %s\n' "$1" >&2
      return 1
      ;;
  esac
}

lesson_context_rows() {
  local map_file
  map_file="$(lesson_context_map_file)"
  awk -F '\t' '$1 !~ /^#/ && NF > 0 { print }' "$map_file"
}

lesson_context_workflow_rows() {
  local map_file
  map_file="$(lesson_context_workflow_map_file)"
  awk -F '\t' '$1 !~ /^#/ && NF > 0 { print }' "$map_file"
}

lesson_context_rows_for_scope() {
  local raw_scope="${1:-all}"
  local scope column
  scope="$(lesson_context_normalize_scope "$raw_scope")" || return 1
  column="$(lesson_context_scope_column "$scope")" || return 1
  lesson_context_rows | awk -F '\t' -v scope="$scope" -v column="$column" '
    scope == "all" {
      print
      next
    }
    scope == "security_required" || scope == "prompt_example_required" || scope == "dashboard_candidate" {
      if ($column == "yes") print
      next
    }
    column > 0 && $column != "no" {
      print
    }
  '
}

lesson_context_count_for_scope() {
  local raw_scope="${1:-all}"
  lesson_context_rows_for_scope "$raw_scope" | awk 'END { print NR + 0 }'
}

lesson_context_required_count_for_scope() {
  local raw_scope="${1:-all}"
  local scope column
  scope="$(lesson_context_normalize_scope "$raw_scope")" || return 1
  column="$(lesson_context_scope_column "$scope")" || return 1
  if [[ "$column" == "0" ]]; then
    printf '0\n'
    return 0
  fi
  lesson_context_rows | awk -F '\t' -v column="$column" '$column == "required" || $column == "yes" { count++ } END { print count + 0 }'
}

lesson_context_validate_foundation_file() {
  local file="$1"
  local heading="$2"
  [[ -f "$file" ]] || {
    printf 'missing learner context file: %s\n' "$file" >&2
    return 1
  }
  if ! grep -Fq "$heading" "$file"; then
    printf 'learner context file is missing required heading %s: %s\n' "$heading" "$file" >&2
    return 1
  fi
}

lesson_context_validate_lesson_map() {
  local map_file
  map_file="$(lesson_context_map_file)"
  [[ -f "$map_file" ]] || {
    printf 'missing learner context map: %s\n' "$map_file" >&2
    return 1
  }
  awk -F '\t' '
    BEGIN {
      expected = "# context_id\ttitle\topening\tsection_deepening\tfinal_recap\tseven_day\tfourteen_day\tapplied_or_free_development\tsecurity_required\tprompt_example_required\tdashboard_candidate"
      split("required recommended optional no", lesson_values, " ")
      for (i in lesson_values) allowed_lesson[lesson_values[i]] = 1
      split("yes no", bool_values, " ")
      for (i in bool_values) allowed_bool[bool_values[i]] = 1
    }
    NR == 1 {
      if ($0 != expected) {
        printf "invalid learner context map header in %s\n", FILENAME > "/dev/stderr"
        bad = 1
      }
      next
    }
    /^[[:space:]]*$/ { next }
    $1 ~ /^#/ { next }
    NF != 11 {
      printf "invalid learner context map column count in %s row %d: %d\n", FILENAME, NR, NF > "/dev/stderr"
      bad = 1
      next
    }
    {
      count++
      if ($1 !~ /^[a-z0-9_]+$/) {
        printf "invalid learner context id in %s row %d: %s\n", FILENAME, NR, $1 > "/dev/stderr"
        bad = 1
      }
      if ($1 in seen) {
        printf "duplicate learner context id in %s row %d: %s\n", FILENAME, NR, $1 > "/dev/stderr"
        bad = 1
      }
      seen[$1] = 1
      for (i = 1; i <= 5; i++) {
        if ($i == "") {
          printf "empty learner context field in %s row %d column %d\n", FILENAME, NR, i > "/dev/stderr"
          bad = 1
        }
      }
      for (i = 6; i <= 8; i++) {
        if (!($i in allowed_lesson)) {
          printf "invalid learner context lesson value in %s row %d column %d: %s\n", FILENAME, NR, i, $i > "/dev/stderr"
          bad = 1
        }
      }
      for (i = 9; i <= 11; i++) {
        if (!($i in allowed_bool)) {
          printf "invalid learner context boolean value in %s row %d column %d: %s\n", FILENAME, NR, i, $i > "/dev/stderr"
          bad = 1
        }
      }
    }
    END {
      if (count == 0) {
        printf "learner context map has no topic rows: %s\n", FILENAME > "/dev/stderr"
        bad = 1
      }
      exit bad ? 1 : 0
    }
  ' "$map_file"
}

lesson_context_validate_workflow_map() {
  local map_file
  map_file="$(lesson_context_workflow_map_file)"
  [[ -f "$map_file" ]] || {
    printf 'missing workflow context map: %s\n' "$map_file" >&2
    return 1
  }
  awk -F '\t' '
    BEGIN {
      expected = "# context_id\tmenu_item\tworkflow_kind\tproduct_repo_required\texternal_approval_required\tsafety_summary"
    }
    NR == 1 {
      if ($0 != expected) {
        printf "invalid workflow context map header in %s\n", FILENAME > "/dev/stderr"
        bad = 1
      }
      next
    }
    /^[[:space:]]*$/ { next }
    $1 ~ /^#/ { next }
    NF != 6 {
      printf "invalid workflow context map column count in %s row %d: %d\n", FILENAME, NR, NF > "/dev/stderr"
      bad = 1
      next
    }
    {
      count++
      if ($1 !~ /^[a-z0-9_-]+$/) {
        printf "invalid workflow context id in %s row %d: %s\n", FILENAME, NR, $1 > "/dev/stderr"
        bad = 1
      }
      if ($1 in seen) {
        printf "duplicate workflow context id in %s row %d: %s\n", FILENAME, NR, $1 > "/dev/stderr"
        bad = 1
      }
      seen[$1] = 1
      if ($2 !~ /^[0-9]+$/) {
        printf "invalid workflow context menu item in %s row %d: %s\n", FILENAME, NR, $2 > "/dev/stderr"
        bad = 1
      }
      if ($3 != "lesson" && $3 != "workflow" && $3 != "maintenance") {
        printf "invalid workflow context kind in %s row %d: %s\n", FILENAME, NR, $3 > "/dev/stderr"
        bad = 1
      }
      if ($4 != "true" && $4 != "false") {
        printf "invalid workflow context product_repo_required in %s row %d: %s\n", FILENAME, NR, $4 > "/dev/stderr"
        bad = 1
      }
      if ($5 != "true" && $5 != "false") {
        printf "invalid workflow context external_approval_required in %s row %d: %s\n", FILENAME, NR, $5 > "/dev/stderr"
        bad = 1
      }
      if ($6 == "") {
        printf "empty workflow context safety summary in %s row %d\n", FILENAME, NR > "/dev/stderr"
        bad = 1
      }
    }
    END {
      if (count == 0) {
        printf "workflow context map has no rows: %s\n", FILENAME > "/dev/stderr"
        bad = 1
      }
      exit bad ? 1 : 0
    }
  ' "$map_file"
}

lesson_context_validate() {
  local failed=0
  lesson_context_validate_foundation_file "$(lesson_context_readme_file)" "# Learner Context Foundation" || failed=1
  lesson_context_validate_foundation_file "$(lesson_context_ai_foundation_file)" "# AI-Driven Development Foundation" || failed=1
  lesson_context_validate_foundation_file "$(lesson_context_security_foundation_file)" "# AI-Driven Development Security Foundation" || failed=1
  lesson_context_validate_lesson_map || failed=1
  lesson_context_validate_workflow_map || failed=1
  [[ "$failed" -eq 0 ]]
}

lesson_context_print_status() {
  lesson_context_validate
  printf 'Learner Context Status\n'
  printf 'Directory: %s\n' "$(lesson_context_dir)"
  printf 'Map: %s\n' "$(lesson_context_map_file)"
  printf 'Workflow context map: %s\n' "$(lesson_context_workflow_map_file)"
  printf 'AI foundation: %s\n' "$(lesson_context_ai_foundation_file)"
  printf 'Security foundation: %s\n' "$(lesson_context_security_foundation_file)"
  printf 'Topics: %s\n' "$(lesson_context_count_for_scope all)"
  printf '7-day active topics: %s\n' "$(lesson_context_count_for_scope seven_day)"
  printf '7-day required topics: %s\n' "$(lesson_context_required_count_for_scope seven_day)"
  printf '14-day active topics: %s\n' "$(lesson_context_count_for_scope fourteen_day)"
  printf '14-day required topics: %s\n' "$(lesson_context_required_count_for_scope fourteen_day)"
  printf 'Applied active topics: %s\n' "$(lesson_context_count_for_scope applied_or_free_development)"
  printf 'Security topics: %s\n' "$(lesson_context_count_for_scope security_required)"
  printf 'Dashboard candidates: %s\n' "$(lesson_context_count_for_scope dashboard_candidate)"
}

lesson_context_print_list() {
  local raw_scope="${1:-all}"
  local scope column
  lesson_context_validate
  scope="$(lesson_context_normalize_scope "$raw_scope")" || return 1
  column="$(lesson_context_scope_column "$scope")" || return 1
  printf 'Learner context topics: %s\n' "$(lesson_context_scope_label "$scope")"
  printf '# context_id\tcoverage\ttitle\n'
  lesson_context_rows_for_scope "$scope" | awk -F '\t' -v column="$column" '
    {
      coverage = "included"
      if (column > 0) coverage = $column
      printf "%s\t%s\t%s\n", $1, coverage, $2
    }
  '
}

lesson_context_print_phase() {
  local raw_scope="$1"
  local phase="$2"
  local scope column field
  lesson_context_validate
  scope="$(lesson_context_normalize_scope "$raw_scope")" || return 1
  column="$(lesson_context_scope_column "$scope")" || return 1
  field="$(lesson_context_phase_field "$phase")" || return 1
  printf 'Learner context %s: %s\n' "$phase" "$(lesson_context_scope_label "$scope")"
  printf '# context_id\tcoverage\ttext\n'
  lesson_context_rows_for_scope "$scope" | awk -F '\t' -v column="$column" -v field="$field" '
    {
      coverage = "included"
      if (column > 0) coverage = $column
      printf "%s\t%s\t%s\n", $1, coverage, $field
    }
  '
}

lesson_context_print_step() {
  local raw_scope="$1"
  local step_id="$2"
  [[ -n "$step_id" ]] || {
    printf 'step_id is required.\n' >&2
    return 1
  }
  printf 'Step: %s\n' "$step_id"
  lesson_context_print_phase "$raw_scope" step
}

lesson_context_print_summary() {
  local raw_scope="${1:-all}"
  local scope
  lesson_context_validate
  scope="$(lesson_context_normalize_scope "$raw_scope")" || return 1
  printf 'Learner context summary: %s\n' "$(lesson_context_scope_label "$scope")"
  printf 'Topics: %s\n' "$(lesson_context_count_for_scope "$scope")"
  printf 'Required or yes topics: %s\n' "$(lesson_context_required_count_for_scope "$scope")"
  printf 'Use opening: ./tools/lesson-context opening %s\n' "$(lesson_context_scope_label "$scope")"
  printf 'Use recap: ./tools/lesson-context recap %s\n' "$(lesson_context_scope_label "$scope")"
}

lesson_context_print_topic_detail() {
  local context_id="$1"
  lesson_context_validate
  [[ -n "$context_id" ]] || {
    printf 'context_id is required.\n' >&2
    return 1
  }
  lesson_context_rows | awk -F '\t' -v context_id="$context_id" '
    $1 == context_id {
      printf "Context: %s\n", $1
      printf "Title: %s\n", $2
      printf "Opening: %s\n", $3
      printf "Section deepening: %s\n", $4
      printf "Final recap: %s\n", $5
      printf "7-day: %s\n", $6
      printf "14-day: %s\n", $7
      printf "Applied/free-development: %s\n", $8
      printf "Security required: %s\n", $9
      printf "Prompt example required: %s\n", $10
      printf "Dashboard candidate: %s\n", $11
      found = 1
      exit
    }
    END {
      if (!found) {
        printf "unknown learner context id: %s\n", context_id > "/dev/stderr"
        exit 1
      }
    }
  '
}

lesson_context_print_workflow() {
  local context_id="${1:-all}"
  lesson_context_validate
  lesson_context_workflow_rows | awk -F '\t' -v context_id="$context_id" '
    context_id == "all" || $1 == context_id {
      if (printed) print ""
      printf "Workflow context: %s\n", $1
      printf "Menu item: %s\n", $2
      printf "Workflow kind: %s\n", $3
      printf "Product repository required: %s\n", $4
      printf "External approval required: %s\n", $5
      printf "Safety summary: %s\n", $6
      printed = 1
    }
    END {
      if (!printed) {
        printf "unknown workflow context id: %s\n", context_id > "/dev/stderr"
        exit 1
      }
    }
  '
}
