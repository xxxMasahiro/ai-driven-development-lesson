#!/usr/bin/env bash

if [[ -z "${LESSON_ROOT:-}" ]]; then
  DASHBOARD_DATA_LIB_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
  # shellcheck source=lesson_common.sh
  source "$DASHBOARD_DATA_LIB_DIR/lesson_common.sh"
fi

if ! declare -F git_workflow_policy_file >/dev/null 2>&1; then
  # shellcheck source=git_workflow_policy.sh
  source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/git_workflow_policy.sh"
fi

if ! declare -F product_security_policy_file >/dev/null 2>&1; then
  # shellcheck source=product_security.sh
  source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/product_security.sh"
fi

dashboard_data_schema_version() {
  printf '0.9.0'
}

dashboard_standard_ui_locale_codes() {
  printf 'ja|en|ko|zh-CN|zh-TW|es|pt-BR|fr|de|id|vi|th|hi|ar'
}

dashboard_ui_locale_for_workflow_language() {
  case "$1" in
    ja|ja-*) printf 'ja' ;;
    en|en-*) printf 'en' ;;
    ko|ko-*) printf 'ko' ;;
    zh|zh-CN|zh-cn|zh_CN|zh-Hans|zh-hans|zh-Hans-*|zh-hans-*) printf 'zh-CN' ;;
    zh-TW|zh-tw|zh_TW|zh-Hant|zh-hant|zh-Hant-*|zh-hant-*) printf 'zh-TW' ;;
    es|es-*) printf 'es' ;;
    pt|pt-*|pt_BR|pt-BR|pt-br) printf 'pt-BR' ;;
    fr|fr-*) printf 'fr' ;;
    de|de-*) printf 'de' ;;
    id|id-*) printf 'id' ;;
    vi|vi-*) printf 'vi' ;;
    th|th-*) printf 'th' ;;
    hi|hi-*) printf 'hi' ;;
    ar|ar-*) printf 'ar' ;;
    *) printf 'en' ;;
  esac
}

dashboard_ui_direction_for_locale() {
  case "$1" in
    ar) printf 'rtl' ;;
    *) printf 'ltr' ;;
  esac
}

dashboard_data_generated_at() {
  if [[ -n "${DASHBOARD_DATA_GENERATED_AT:-}" ]]; then
    printf '%s' "$DASHBOARD_DATA_GENERATED_AT"
  else
    date -u '+%Y-%m-%dT%H:%M:%SZ'
  fi
}

dashboard_data_control_chars=(
  $'\001' $'\002' $'\003' $'\004' $'\005' $'\006' $'\007' $'\010'
  $'\013' $'\014' $'\016' $'\017' $'\020' $'\021' $'\022' $'\023'
  $'\024' $'\025' $'\026' $'\027' $'\030' $'\031' $'\032' $'\033'
  $'\034' $'\035' $'\036' $'\037'
)

declare -gA DASHBOARD_JSON_ESCAPE_CACHE=()

dashboard_data_has_unsafe_control_chars() {
  local value="$1"
  local char
  for char in "${dashboard_data_control_chars[@]}"; do
    [[ "$value" == *"$char"* ]] && return 0
  done
  return 1
}

dashboard_data_strip_unsafe_control_chars() {
  local value="$1"
  local char
  if ! dashboard_data_has_unsafe_control_chars "$value"; then
    printf '%s' "$value"
    return
  fi
  for char in "${dashboard_data_control_chars[@]}"; do
    value="${value//$char/}"
  done
  printf '%s' "$value"
}

dashboard_data_may_contain_secret_like_data() {
  local value="$1"
  local lower
  lower="${value,,}"
  case "$lower" in
    *secret*|*token*|*api_key*|*password*|*private_key*|*ghp_*|*gho_*|*ghu_*|*ghs_*|*ghr_*|*sk-*|*akia*|*begin*private*key*)
      return 0
      ;;
  esac
  return 1
}

dashboard_data_safe_text() {
  local value="$1"
  local secret_pattern
  if dashboard_data_has_unsafe_control_chars "$value"; then
    value="$(dashboard_data_strip_unsafe_control_chars "$value")"
  fi
  value="${value//$'\r'/ }"
  value="${value//$'\n'/ }"
  value="${value//$'\t'/ }"

  if dashboard_data_may_contain_secret_like_data "$value"; then
    secret_pattern='([sS][eE][cC][rR][eE][tT]|[tT][oO][kK][eE][nN]|[aA][pP][iI]_[kK][eE][yY]|[pP][aA][sS][sS][wW][oO][rR][dD]|[pP][rR][iI][vV][aA][tT][eE]_[kK][eE][yY])[[:space:]]*[:=][[:space:]]*[^[:space:]#]{8,}|gh[pousr]_[A-Za-z0-9_]{20,}|sk-[A-Za-z0-9]{20,}|AKIA[0-9A-Z]{16}|BEGIN[[:space:]]+(RSA[[:space:]]+|OPENSSH[[:space:]]+|EC[[:space:]]+|DSA[[:space:]]+)?PRIVATE[[:space:]]+KEY'
    if [[ "$value" =~ $secret_pattern ]]; then
      printf '[redacted secret-like data]'
      return
    fi
  fi

  case "$value" in
    /*|*[[:space:]]/*)
      printf '%s' "$value" | sed -E 's#(^|[[:space:]])/[^[:space:]]+#\1[absolute-path]#g'
      ;;
    *)
      printf '%s' "$value"
      ;;
  esac
}

dashboard_json_escape() {
  local value escaped cacheable
  local cache_key
  cacheable=0
  cache_key="$1"
  if [[ -n "$cache_key" && "${#cache_key}" -le 512 ]]; then
    if [[ -n "${DASHBOARD_JSON_ESCAPE_CACHE[$cache_key]+set}" ]]; then
      printf '%s' "${DASHBOARD_JSON_ESCAPE_CACHE[$cache_key]}"
      return
    fi
    cacheable=1
  fi
  value="$(dashboard_data_safe_text "$1")"
  escaped="${value//\\/\\\\}"
  escaped="${escaped//\"/\\\"}"
  escaped="${escaped//$'\r'/\\r}"
  escaped="${escaped//$'\n'/\\n}"
  escaped="${escaped//$'\t'/\\t}"
  if [[ "$cacheable" -eq 1 ]]; then
    DASHBOARD_JSON_ESCAPE_CACHE[$cache_key]="$escaped"
  fi
  printf '%s' "$escaped"
}

dashboard_json_string() {
  printf '"'
  dashboard_json_escape "$1"
  printf '"'
}

dashboard_json_bool() {
  case "$1" in
    true|false) printf '%s' "$1" ;;
    *) printf 'invalid JSON boolean: %s\n' "$1" >&2; return 1 ;;
  esac
}

dashboard_json_string_array() {
  local first=1
  local item
  printf '['
  for item in "$@"; do
    if [[ "$first" -eq 0 ]]; then
      printf ','
    fi
    first=0
    dashboard_json_string "$item"
  done
  printf ']'
}

dashboard_json_raw_array() {
  local first=1
  local item
  printf '['
  for item in "$@"; do
    if [[ "$first" -eq 0 ]]; then
      printf ','
    fi
    first=0
    printf '%s' "$item"
  done
  printf ']'
}

dashboard_json_raw_object() {
  local first=1
  local key
  local value
  printf '{'
  while [[ "$#" -gt 0 ]]; do
    key="$1"
    value="$2"
    shift 2
    if [[ "$first" -eq 0 ]]; then
      printf ','
    fi
    first=0
    dashboard_json_string "$key"
    printf ':'
    printf '%s' "$value"
  done
  printf '}'
}

dashboard_json_get_field() {
  local json="$1"
  local path="$2"
  DASHBOARD_JSON_INPUT="$json" DASHBOARD_JSON_PATH="$path" node -e '
const data = JSON.parse(process.env.DASHBOARD_JSON_INPUT);
let value = data;
for (const key of process.env.DASHBOARD_JSON_PATH.split(".")) {
  if (!key) continue;
  value = value && typeof value === "object" ? value[key] : undefined;
}
if (value === undefined || value === null) {
  process.exit(2);
}
if (typeof value === "object") {
  process.stdout.write(JSON.stringify(value));
} else {
  process.stdout.write(String(value));
}
'
}

dashboard_data_allowed_state() {
  case "$1" in
    missing|ready|passed|failed|blocked|unknown|approval_required|optional|cached|not_run|stale|manual_required|not_applicable) return 0 ;;
  esac
  return 1
}

dashboard_data_validate_state() {
  dashboard_data_allowed_state "$1" || {
    printf 'invalid dashboard data state: %s\n' "$1" >&2
    return 1
  }
}

dashboard_data_validate_partial_status() {
  case "$1" in
    failed|blocked|unknown) return 0 ;;
  esac
  printf 'invalid dashboard partial failure status: %s\n' "$1" >&2
  return 1
}

dashboard_data_validate_manual_followup_status() {
  case "$1" in
    optional|cached|unknown) return 0 ;;
  esac
  printf 'invalid dashboard manual follow-up status: %s\n' "$1" >&2
  return 1
}

dashboard_data_validate_risk_level() {
  case "$1" in
    low|medium|high|critical) return 0 ;;
  esac
  printf 'invalid dashboard command risk level: %s\n' "$1" >&2
  return 1
}

dashboard_data_validate_execution_mode() {
  case "$1" in
    preview_only|manual_after_approval) return 0 ;;
  esac
  printf 'invalid dashboard command execution mode: %s\n' "$1" >&2
  return 1
}

dashboard_data_validate_guidance_surface() {
  case "$1" in
    lesson|workflow) return 0 ;;
  esac
  printf 'invalid dashboard guidance surface: %s\n' "$1" >&2
  return 1
}

dashboard_data_validate_guidance_audience() {
  case "$1" in
    non_engineer|engineer|all) return 0 ;;
  esac
  printf 'invalid dashboard guidance audience: %s\n' "$1" >&2
  return 1
}

dashboard_data_validate_guidance_priority() {
  case "$1" in
    info|attention|action) return 0 ;;
  esac
  printf 'invalid dashboard guidance priority: %s\n' "$1" >&2
  return 1
}

dashboard_data_workflow_context_map_file() {
  printf '%s\n' "${DASHBOARD_WORKFLOW_CONTEXT_MAP_FILE:-$LESSON_ROOT/learning/context/WORKFLOW_CONTEXT_MAP.tsv}"
}

dashboard_data_workflow_context_map_row() {
  local context_id="$1"
  local file
  file="$(dashboard_data_workflow_context_map_file)"
  [[ -f "$file" ]] || return 1
  awk -F '\t' -v context_id="$context_id" '
    /^[[:space:]]*$/ { next }
    $1 ~ /^#/ { next }
    $1 == context_id { print; found = 1; exit }
    END { exit found ? 0 : 1 }
  ' "$file"
}

dashboard_data_workflow_context_map_field() {
  local context_id="$1"
  local field="$2"
  local row field_number
  row="$(dashboard_data_workflow_context_map_row "$context_id")" || return 1
  case "$field" in
    menu_item) field_number=2 ;;
    workflow_kind) field_number=3 ;;
    product_repo_required) field_number=4 ;;
    external_approval_required) field_number=5 ;;
    safety_summary) field_number=6 ;;
    *) return 1 ;;
  esac
  printf '%s\n' "$row" | awk -F '\t' -v field_number="$field_number" '{ print $field_number; exit }'
}

dashboard_json_partial_failure() {
  local source="$1"
  local status="$2"
  local reason="$3"
  local required_command="$4"
  dashboard_data_validate_partial_status "$status"
  printf '{"source":'
  dashboard_json_string "$source"
  printf ',"status":'
  dashboard_json_string "$status"
  printf ',"reason":'
  dashboard_json_string "$reason"
  printf ',"required_command":'
  dashboard_json_string "$required_command"
  printf '}'
}

dashboard_json_manual_followup() {
  local source="$1"
  local status="$2"
  local reason="$3"
  local required_command="$4"
  dashboard_data_validate_manual_followup_status "$status"
  printf '{"source":'
  dashboard_json_string "$source"
  printf ',"status":'
  dashboard_json_string "$status"
  printf ',"reason":'
  dashboard_json_string "$reason"
  printf ',"required_command":'
  dashboard_json_string "$required_command"
  printf '}'
}

dashboard_json_primary_action() {
  local title="$1"
  local description="$2"
  local target="$3"
  local expected_result="$4"
  local risk_level="$5"
  local status="$6"
  local source="$7"

  dashboard_data_validate_risk_level "$risk_level"
  dashboard_data_validate_state "$status"

  printf '{"title":'
  dashboard_json_string "$title"
  printf ',"description":'
  dashboard_json_string "$description"
  printf ',"target":'
  dashboard_json_string "$target"
  printf ',"expected_result":'
  dashboard_json_string "$expected_result"
  printf ',"risk_level":'
  dashboard_json_string "$risk_level"
  printf ',"status":'
  dashboard_json_string "$status"
  printf ',"source":'
  dashboard_json_string "$source"
  printf '}'
}

dashboard_data_metric_bucket() {
  case "$1" in
    ready|passed)
      printf 'healthy'
      ;;
    failed|blocked)
      printf 'problem'
      ;;
    *)
      printf 'warning'
      ;;
  esac
}

dashboard_data_metric_status() {
  local healthy="$1"
  local warning="$2"
  local problem="$3"
  local total="$4"
  if (( problem > 0 )); then
    printf 'blocked'
  elif (( total > 0 && healthy == total )); then
    printf 'ready'
  elif (( warning > 0 )); then
    printf 'unknown'
  else
    printf 'unknown'
  fi
}

dashboard_json_category_metric() {
  local id="$1"
  local label="$2"
  local unit="$3"
  shift 3
  local total=0
  local healthy=0
  local warning=0
  local problem=0
  local state bucket percent status

  for state in "$@"; do
    [[ -n "$state" ]] || continue
    dashboard_data_validate_state "$state"
    total=$((total + 1))
    bucket="$(dashboard_data_metric_bucket "$state")"
    case "$bucket" in
      healthy) healthy=$((healthy + 1)) ;;
      warning) warning=$((warning + 1)) ;;
      problem) problem=$((problem + 1)) ;;
    esac
  done

  if (( total > 0 )); then
    percent=$(((healthy * 100) / total))
  else
    percent=0
  fi
  status="$(dashboard_data_metric_status "$healthy" "$warning" "$problem" "$total")"

  printf '{"id":'
  dashboard_json_string "$id"
  printf ',"label":'
  dashboard_json_string "$label"
  printf ',"unit":'
  dashboard_json_string "$unit"
  printf ',"total":%d,"healthy":%d,"warning":%d,"problem":%d,"percent":%d,' "$total" "$healthy" "$warning" "$problem" "$percent"
  printf '"status":'
  dashboard_json_string "$status"
  printf '}'
}

dashboard_json_blocking_item() {
  local source="$1"
  local status="$2"
  local reason="$3"
  local required_command="$4"
  dashboard_data_validate_state "$status"
  printf '{"source":'
  dashboard_json_string "$source"
  printf ',"status":'
  dashboard_json_string "$status"
  printf ',"reason":'
  dashboard_json_string "$reason"
  printf ',"required_command":'
  dashboard_json_string "$required_command"
  printf '}'
}

dashboard_json_guidance_item() {
  local surface="$1"
  local audience="$2"
  local priority="$3"
  local message="$4"
  local related_command="$5"

  dashboard_data_validate_guidance_surface "$surface"
  dashboard_data_validate_guidance_audience "$audience"
  dashboard_data_validate_guidance_priority "$priority"

  printf '{"surface":'
  dashboard_json_string "$surface"
  printf ',"audience":'
  dashboard_json_string "$audience"
  printf ',"priority":'
  dashboard_json_string "$priority"
  printf ',"message":'
  dashboard_json_string "$message"
  printf ',"related_command":'
  dashboard_json_string "$related_command"
  printf '}'
}

dashboard_json_operation_row() {
  local id="$1"
  local label="$2"
  local status="$3"
  local mode="$4"
  local detail="$5"

  dashboard_data_validate_state "$status"

  printf '{"id":'
  dashboard_json_string "$id"
  printf ',"label":'
  dashboard_json_string "$label"
  printf ',"status":'
  dashboard_json_string "$status"
  printf ',"mode":'
  dashboard_json_string "$mode"
  printf ',"detail":'
  dashboard_json_string "$detail"
  printf '}'
}

dashboard_json_workflow_run_row() {
  local id="$1"
  local time="$2"
  local type="$3"
  local target="$4"
  local detail="$5"
  local status="$6"
  local reference="$7"
  local source_role="${8:-workflow}"
  local required_command="${9:-}"
  local scope="${10:-$target}"
  local evidence_path="${11:-}"
  local observed_at="${12:-$time}"

  dashboard_data_validate_state "$status"

  printf '{"id":'
  dashboard_json_string "$id"
  printf ',"time":'
  dashboard_json_string "$time"
  printf ',"type":'
  dashboard_json_string "$type"
  printf ',"target":'
  dashboard_json_string "$target"
  printf ',"detail":'
  dashboard_json_string "$detail"
  printf ',"status":'
  dashboard_json_string "$status"
  printf ',"reference":'
  dashboard_json_string "$reference"
  printf ',"source_role":'
  dashboard_json_string "$source_role"
  printf ',"required_command":'
  dashboard_json_string "$required_command"
  printf ',"scope":'
  dashboard_json_string "$scope"
  printf ',"evidence_path":'
  dashboard_json_string "$evidence_path"
  printf ',"observed_at":'
  dashboard_json_string "$observed_at"
  printf '}'
}

dashboard_json_evidence_row() {
  local id="$1"
  local label="$2"
  local importance="$3"
  local status="$4"
  local reference="$5"
  local target="${6:-$label}"
  local detail="${7:-}"
  local required_command="${8:-}"
  local source_role="${9:-evidence}"
  local observed_at="${10:-}"
  local impact="${11:-}"
  local completion_condition="${12:-}"
  local priority="${13:-medium}"
  local source_artifacts="${14:-$reference}"
  local unresolved_count="${15:-0}"

  dashboard_data_validate_state "$status"

  printf '{"id":'
  dashboard_json_string "$id"
  printf ',"label":'
  dashboard_json_string "$label"
  printf ',"importance":'
  dashboard_json_string "$importance"
  printf ',"status":'
  dashboard_json_string "$status"
  printf ',"reference":'
  dashboard_json_string "$reference"
  printf ',"target":'
  dashboard_json_string "$target"
  printf ',"detail":'
  dashboard_json_string "$detail"
  printf ',"required_command":'
  dashboard_json_string "$required_command"
  printf ',"source_role":'
  dashboard_json_string "$source_role"
  printf ',"observed_at":'
  dashboard_json_string "$observed_at"
  printf ',"impact":'
  dashboard_json_string "$impact"
  printf ',"completion_condition":'
  dashboard_json_string "$completion_condition"
  printf ',"priority":'
  dashboard_json_string "$priority"
  printf ',"source_artifacts":'
  dashboard_json_string "$source_artifacts"
  printf ',"unresolved_count":'
  dashboard_json_string "$unresolved_count"
  printf '}'
}

dashboard_data_validate_setting_scope() {
  case "$1" in
    selected_context|learning|workflow|security|repository|dashboard) return 0 ;;
  esac
  printf 'invalid dashboard setting scope: %s\n' "$1" >&2
  return 1
}

dashboard_data_validate_settings_related_page() {
  case "$1" in
    \#overview|\#lessons|\#workflow|\#maintenance|\#safety|\#repository-info|\#documents|\#settings|\#history|\#help) return 0 ;;
  esac
  printf 'invalid dashboard setting related page: %s\n' "$1" >&2
  return 1
}

dashboard_json_setting_group() {
  local id="$1"
  local label_key="$2"
  local description_key="$3"
  local status="$4"
  local order="$5"

  dashboard_data_validate_state "$status"

  printf '{"id":'
  dashboard_json_string "$id"
  printf ',"label_key":'
  dashboard_json_string "$label_key"
  printf ',"description_key":'
  dashboard_json_string "$description_key"
  printf ',"status":'
  dashboard_json_string "$status"
  printf ',"order":%d}' "$order"
}

dashboard_setting_consistency_reset() {
  unset DASHBOARD_SETTING_CONSISTENCY_STATUS
  unset DASHBOARD_SETTING_CONSISTENCY_SEVERITY
  unset DASHBOARD_SETTING_CONSISTENCY_REASON_CODE
  unset DASHBOARD_SETTING_CONSISTENCY_REASON_KEY
  unset DASHBOARD_SETTING_CONSISTENCY_NEXT_ACTION_KEY
  unset DASHBOARD_SETTING_CONSISTENCY_EFFECTIVE_MODE
  unset DASHBOARD_SETTING_CONSISTENCY_AFFECTED_IDS
}

dashboard_json_setting_consistency() {
  local fallback_status="$1"
  local status="${DASHBOARD_SETTING_CONSISTENCY_STATUS:-$fallback_status}"
  local severity="${DASHBOARD_SETTING_CONSISTENCY_SEVERITY:-info}"
  local reason_code="${DASHBOARD_SETTING_CONSISTENCY_REASON_CODE:-none}"
  local reason_key="${DASHBOARD_SETTING_CONSISTENCY_REASON_KEY:-settingsPage.consistency.none}"
  local next_action_key="${DASHBOARD_SETTING_CONSISTENCY_NEXT_ACTION_KEY:-settingsPage.consistency.next.none}"
  local effective_mode="${DASHBOARD_SETTING_CONSISTENCY_EFFECTIVE_MODE:-}"
  local affected_ids="${DASHBOARD_SETTING_CONSISTENCY_AFFECTED_IDS:-}"
  local -a affected_array=()

  dashboard_data_validate_state "$status"

  printf '{"status":'
  dashboard_json_string "$status"
  printf ',"severity":'
  dashboard_json_string "$severity"
  printf ',"reason_code":'
  dashboard_json_string "$reason_code"
  printf ',"reason_key":'
  dashboard_json_string "$reason_key"
  printf ',"next_action_key":'
  dashboard_json_string "$next_action_key"
  printf ',"effective_mode":'
  dashboard_json_string "$effective_mode"
  printf ',"affected_setting_ids":'
  if [[ -n "$affected_ids" ]]; then
    IFS=',' read -r -a affected_array <<<"$affected_ids"
    dashboard_json_string_array "${affected_array[@]}"
  else
    dashboard_json_string_array
  fi
  printf '}'
}

dashboard_json_setting_item() {
  local id="$1"
  local group_id="$2"
  local scope="$3"
  local label_key="$4"
  local description_key="$5"
  local current_value="$6"
  local current_label="$7"
  local status="$8"
  local source_file="$9"
  local editable="${10}"
  local reviewable="${11}"
  local risk_level="${12}"
  local requires_confirmation="${13}"
  local disabled_reason_key="${14}"
  local related_page="${15}"
  local update_action_id="${16}"
  local impact_key="${17}"
  local target_file="${18}"
  local validation_status="${19}"
  local update_preview_key="${20}"
  shift 20

  dashboard_data_validate_setting_scope "$scope"
  dashboard_data_validate_state "$status"
  dashboard_data_validate_risk_level "$risk_level"
  dashboard_data_validate_settings_related_page "$related_page"
  dashboard_data_validate_state "$validation_status"

  printf '{"id":'
  dashboard_json_string "$id"
  printf ',"group_id":'
  dashboard_json_string "$group_id"
  printf ',"scope":'
  dashboard_json_string "$scope"
  printf ',"label_key":'
  dashboard_json_string "$label_key"
  printf ',"description_key":'
  dashboard_json_string "$description_key"
  printf ',"current_value":'
  dashboard_json_string "$current_value"
  printf ',"current_label":'
  dashboard_json_string "$current_label"
  printf ',"status":'
  dashboard_json_string "$status"
  printf ',"source_file":'
  dashboard_json_string "$source_file"
  printf ',"allowed_values":'
  dashboard_json_string_array "$@"
  printf ',"editable":'
  dashboard_json_bool "$editable"
  printf ',"reviewable":'
  dashboard_json_bool "$reviewable"
  printf ',"risk_level":'
  dashboard_json_string "$risk_level"
  printf ',"requires_confirmation":'
  dashboard_json_bool "$requires_confirmation"
  printf ',"consistency":'
  dashboard_json_setting_consistency "$status"
  printf ',"disabled_reason_key":'
  dashboard_json_string "$disabled_reason_key"
  printf ',"related_page":'
  dashboard_json_string "$related_page"
  printf ',"update_action_id":'
  dashboard_json_string "$update_action_id"
  printf ',"review":{"impact_key":'
  dashboard_json_string "$impact_key"
  printf ',"target_file":'
  dashboard_json_string "$target_file"
  printf ',"validation_status":'
  dashboard_json_string "$validation_status"
  printf ',"update_preview_key":'
  dashboard_json_string "$update_preview_key"
  printf '}'
  printf '}'
  dashboard_setting_consistency_reset
}

dashboard_json_security_item() {
  local id="$1"
  local label="$2"
  local status="$3"
  local detail="$4"
  local last_checked="$5"

  dashboard_data_validate_state "$status"

  printf '{"id":'
  dashboard_json_string "$id"
  printf ',"label":'
  dashboard_json_string "$label"
  printf ',"status":'
  dashboard_json_string "$status"
  printf ',"detail":'
  dashboard_json_string "$detail"
  printf ',"last_checked":'
  dashboard_json_string "$last_checked"
  printf '}'
}

dashboard_json_command_preview_group() {
  local id="$1"
  local label="$2"
  local risk_level="$3"
  local preview_count="$4"

  dashboard_data_validate_risk_level "$risk_level"

  printf '{"id":'
  dashboard_json_string "$id"
  printf ',"label":'
  dashboard_json_string "$label"
  printf ',"risk_level":'
  dashboard_json_string "$risk_level"
  printf ',"preview_count":%d' "$preview_count"
  printf '}'
}

dashboard_data_add_partial_failure() {
  local -n target_array="$1"
  shift
  target_array+=("$(dashboard_json_partial_failure "$@")")
}

dashboard_data_add_manual_followup() {
  local -n target_array="$1"
  shift
  target_array+=("$(dashboard_json_manual_followup "$@")")
}

dashboard_data_content_hash() {
  local seed="$1"
  if command -v sha256sum >/dev/null 2>&1; then
    printf '%s' "$seed" | sha256sum | awk '{print $1}'
  else
    printf '%s' "$seed" | shasum -a 256 | awk '{print $1}'
  fi
}

dashboard_data_add_blocking_item() {
  local -n target_array="$1"
  shift
  target_array+=("$(dashboard_json_blocking_item "$@")")
}

dashboard_json_command_preview() {
  local intent="$1"
  local target="$2"
  local risk_level="$3"
  local requires_approval="$4"
  local approval_gate_id="$5"
  local command_text="$6"
  local execution_mode="$7"
  local non_executable="$8"
  shift 8

  dashboard_data_validate_risk_level "$risk_level"
  dashboard_json_bool "$requires_approval" >/dev/null
  dashboard_data_validate_execution_mode "$execution_mode"
  dashboard_json_bool "$non_executable" >/dev/null

  printf '{"intent":'
  dashboard_json_string "$intent"
  printf ',"target":'
  dashboard_json_string "$target"
  printf ',"risk_level":'
  dashboard_json_string "$risk_level"
  printf ',"requires_approval":'
  dashboard_json_bool "$requires_approval"
  printf ',"approval_gate_id":'
  dashboard_json_string "$approval_gate_id"
  printf ',"argv":'
  dashboard_json_string_array "$@"
  printf ',"command_text":'
  dashboard_json_string "$command_text"
  printf ',"execution_mode":'
  dashboard_json_string "$execution_mode"
  printf ',"non_executable":'
  dashboard_json_bool "$non_executable"
  printf '}'
}

dashboard_data_relative_path() {
  local path="$1"
  case "$path" in
    "$LESSON_ROOT"/*)
      printf '%s' "${path#$LESSON_ROOT/}"
      ;;
    /*)
      printf '[external-path]'
      ;;
    *)
      printf '%s' "$path"
      ;;
  esac
}

dashboard_data_file_state() {
  local relpath="$1"
  if [[ -f "$LESSON_ROOT/$relpath" ]]; then
    printf 'ready'
  else
    printf 'missing'
  fi
}

dashboard_data_current_lesson_step() {
  local state_file="$1"
  [[ -f "$state_file" ]] || return 1
  awk -F '\t' '$1 !~ /^#/ && $3 == "current" { print $2; found = 1; exit } END { exit found ? 0 : 1 }' "$state_file"
}

dashboard_data_lesson_all_completed() {
  local state_file="$1"
  [[ -f "$state_file" ]] || return 1
  awk -F '\t' '
    $1 !~ /^#/ {
      total++
      if ($3 == "completed") completed++
    }
    END {
      exit (total > 0 && completed == total) ? 0 : 1
    }
  ' "$state_file"
}

dashboard_data_lesson_state_file_from_config() {
  local config_file="$1"
  lesson_abs_path_from_config_file "$config_file" "$(lesson_config_get_from_file "$config_file" state_file "learning/LESSON_STATE.tsv")"
}

dashboard_data_lesson_step_total() {
  local state_file="$1"
  [[ -f "$state_file" ]] || { printf '0'; return; }
  awk -F '\t' '$1 !~ /^#/ { total++ } END { print total + 0 }' "$state_file"
}

dashboard_data_lesson_current_step_index() {
  local state_file="$1"
  [[ -f "$state_file" ]] || { printf '0'; return; }
  awk -F '\t' '
    $1 !~ /^#/ {
      total++
      if ($3 == "current") {
        print total
        found = 1
        exit
      }
    }
    END {
      if (!found) print 0
    }
  ' "$state_file"
}

dashboard_data_lesson_setting_state() {
  local config_file="$1"
  local setting="$2"
  local file
  file="$(lesson_setting_file_from_config "$config_file" "$setting")"
  if lesson_setting_file_has_value "$setting" "$file"; then
    printf 'ready'
  else
    printf 'missing'
  fi
}

dashboard_data_latest_menu_setting_state() {
  local setting="$1"
  if lesson_menu_latest_setting_file "$setting" >/dev/null 2>&1; then
    printf 'ready'
  else
    printf 'missing'
  fi
}

dashboard_data_git_policy_status() {
  local policy_file
  local rows
  policy_file="$(git_workflow_policy_file)"
  [[ -f "$policy_file" ]] || { printf 'missing'; return; }
  if ! rows="$(git_workflow_policy_rows 2>/dev/null)"; then
    printf 'failed'
  elif [[ -n "$rows" ]]; then
    printf 'ready'
  else
    printf 'failed'
  fi
}

dashboard_data_git_settings_status() {
  local settings_file
  local policy_file
  local rows
  local key
  settings_file="$(git_workflow_settings_file)"
  [[ -f "$settings_file" ]] || { printf 'missing'; return; }
  policy_file="$(git_workflow_policy_file)"
  [[ -f "$policy_file" ]] || { printf 'missing'; return; }
  if ! rows="$(git_workflow_policy_rows 2>/dev/null)"; then
    printf 'failed'
    return
  fi
  [[ -n "$rows" ]] || { printf 'failed'; return; }
  while IFS=$'\t' read -r key _allowed _default _label _description; do
    if ! git_workflow_setting_value "$key" >/dev/null 2>&1; then
      printf 'failed'
      return
    fi
  done <<<"$rows"
  git_workflow_settings_consistency_status
}

dashboard_data_product_security_policy_status() {
  [[ -f "$(product_security_policy_file)" ]] || { printf 'missing'; return; }
  [[ -f "$(product_security_context_map_file)" ]] || { printf 'missing'; return; }
  if product_security_validate_policy >/dev/null 2>&1; then
    printf 'ready'
  else
    printf 'failed'
  fi
}
