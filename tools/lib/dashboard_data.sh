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
    *secret*|*token*|*api_key*|*password*|*private_key*|*authorization:*|*bearer\ *|*signedurl*|*signed_url*|*x-amz-signature*|*x-goog-signature*|*ghp_*|*gho_*|*ghu_*|*ghs_*|*ghr_*|*sk-*|*akia*|*begin*private*key*)
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

dashboard_data_validate_evidence_freshness_state() {
  case "$1" in
    current|stale|not_collected|unknown) return 0 ;;
  esac
  printf 'invalid dashboard evidence freshness state: %s\n' "$1" >&2
  return 1
}

dashboard_data_validate_evidence_authority() {
  case "$1" in
    authoritative|manual_required|advisory|not_collected) return 0 ;;
  esac
  printf 'invalid dashboard evidence authority: %s\n' "$1" >&2
  return 1
}

dashboard_data_validate_security_boundary_state() {
  case "$1" in
    closed|approval_required|unknown) return 0 ;;
  esac
  printf 'invalid dashboard security boundary state: %s\n' "$1" >&2
  return 1
}

dashboard_data_validate_security_display_state() {
  case "$1" in
    do_not_display|redact|safe|recommended|unknown) return 0 ;;
  esac
  printf 'invalid dashboard security display policy state: %s\n' "$1" >&2
  return 1
}

dashboard_data_validate_security_action_state() {
  case "$1" in
    safe|recommended|approval_required|blocked|unknown) return 0 ;;
  esac
  printf 'invalid dashboard security action state: %s\n' "$1" >&2
  return 1
}

dashboard_data_validate_detail_page() {
  case "$1" in
    '#overview'|'#lessons'|'#workflow'|'#maintenance'|'#safety'|'#repository-info'|'#documents'|'#settings'|'#history'|'#help') return 0 ;;
  esac
  printf 'invalid dashboard detail page: %s\n' "$1" >&2
  return 1
}

dashboard_data_validate_owner_source() {
  case "$1" in
    dashboard-data|product-authority|git-workflow|repository-development-workflow) return 0 ;;
  esac
  printf 'invalid dashboard owner source: %s\n' "$1" >&2
  return 1
}

dashboard_data_validate_scoped_reference_list() {
  local value="$1"
  local part
  local -a parts
  [[ -n "$value" ]] || {
    printf 'empty dashboard scoped reference list\n' >&2
    return 1
  }
  IFS=';,' read -r -a parts <<<"$value"
  for part in "${parts[@]}"; do
    part="$(printf '%s' "$part" | sed -E 's/^[[:space:]]+//;s/[[:space:]]+$//')"
    [[ -n "$part" ]] || continue
    case "$part" in
      none|not_collected|not_applicable) continue ;;
      product:*)
        local scoped="${part#product:}"
        case "$scoped" in
          ""|/*|../*|*/../*|*\\*|*:*)
            printf 'unsafe dashboard scoped reference: %s\n' "$part" >&2
            return 1
            ;;
        esac
        ;;
      /*|../*|*/../*|*\\*|*:*)
        printf 'unsafe dashboard scoped reference: %s\n' "$part" >&2
        return 1
        ;;
    esac
  done
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

dashboard_json_operational_decision() {
  local status="$1"
  local decision_question="$2"
  local primary_blocker_source_id="$3"
  local why_blocked="$4"
  local next_safe_action="$5"
  local done_condition="$6"
  local approval_boundary="$7"
  local risk_level="$8"
  local freshness_state="$9"
  local authority="${10}"
  local source_id="${11}"
  local non_engineer_brief="${12}"
  local junior_engineer_brief="${13}"

  dashboard_data_validate_state "$status"
  dashboard_data_validate_risk_level "$risk_level"

  printf '{"status":'
  dashboard_json_string "$status"
  printf ',"decision_question":'
  dashboard_json_string "$decision_question"
  printf ',"primary_blocker_source_id":'
  dashboard_json_string "$primary_blocker_source_id"
  printf ',"why_blocked":'
  dashboard_json_string "$why_blocked"
  printf ',"next_safe_action":'
  dashboard_json_string "$next_safe_action"
  printf ',"done_condition":'
  dashboard_json_string "$done_condition"
  printf ',"approval_boundary":'
  dashboard_json_string "$approval_boundary"
  printf ',"risk_level":'
  dashboard_json_string "$risk_level"
  printf ',"freshness_state":'
  dashboard_json_string "$freshness_state"
  printf ',"authority":'
  dashboard_json_string "$authority"
  printf ',"source_id":'
  dashboard_json_string "$source_id"
  printf ',"audience_briefs":{"non_engineer":'
  dashboard_json_string "$non_engineer_brief"
  printf ',"junior_engineer":'
  dashboard_json_string "$junior_engineer_brief"
  printf '},"command_execution_mode":"preview_only"}'
}

dashboard_json_decision_page() {
  local id="$1"
  local title="$2"
  local scope="$3"
  local status="$4"
  local current_judgment="$5"
  local top_reason="$6"
  local evidence_confidence="$7"
  local next_safe_action="$8"
  local detail_page="$9"
  local owner_source="${10}"
  local source_id="${11}"
  local authority="${12}"
  local freshness_state="${13}"
  local risk_level="${14}"
  local must_review_one="${15}"
  local must_review_two="${16}"
  local decision_question
  local confidence_level
  local decision_question_key current_judgment_key top_reason_key evidence_confidence_key next_safe_action_key
  local must_review_one_key must_review_two_key

  dashboard_data_validate_state "$status"
  dashboard_data_validate_risk_level "$risk_level"
  confidence_level="$(dashboard_status_confidence_level "$authority" "$freshness_state")"

  decision_question_key="decisionPage.$id.decision_question"
  current_judgment_key="decisionPage.status.$status.current_judgment"
  top_reason_key="decisionPage.status.$status.top_reason"
  evidence_confidence_key="decisionPage.evidenceConfidence.$authority.$freshness_state"
  next_safe_action_key="decisionPage.$id.next_safe_action"

  case "$id" in
    overview)
      decision_question="Can the current dashboard snapshot be used as the next development decision summary?"
      ;;
    lessons)
      decision_question="Which lesson path or approval state needs attention before learning continues?"
      ;;
    workflow)
      decision_question="Can the selected development workflow safely continue?"
      ;;
    maintenance)
      decision_question="Are synchronized documents and evidence current enough to rely on?"
      ;;
    safety)
      decision_question="Are blockers, approvals, and dangerous-operation boundaries clear enough to proceed?"
      ;;
    repository-info)
      decision_question="Is the selected repository context clear enough for the next operation?"
      ;;
    documents)
      decision_question="Which document should be reviewed for the current decision?"
      ;;
    settings)
      decision_question="Which guarded setting can be reviewed without changing workflow authority?"
      ;;
    history)
      decision_question="Is the recorded evidence recent enough for this decision?"
      ;;
    *)
      decision_question="Can this page be used for the current development decision?"
      ;;
  esac

  case "$must_review_one" in
    "Top blocker") must_review_one_key="decisionPage.mustReview.topBlocker" ;;
    "Current step") must_review_one_key="decisionPage.mustReview.currentStep" ;;
    "Git and CI state") must_review_one_key="decisionPage.mustReview.gitCiState" ;;
    "Synchronized docs") must_review_one_key="decisionPage.mustReview.synchronizedDocs" ;;
    "Approvals") must_review_one_key="decisionPage.mustReview.approvals" ;;
    "Worktree changes") must_review_one_key="decisionPage.mustReview.worktreeChanges" ;;
    "Audience") must_review_one_key="decisionPage.mustReview.audience" ;;
    "Current value") must_review_one_key="decisionPage.mustReview.currentValue" ;;
    "Observed time") must_review_one_key="decisionPage.mustReview.observedTime" ;;
    *) must_review_one_key="" ;;
  esac
  case "$must_review_two" in
    "Evidence confidence") must_review_two_key="decisionPage.mustReview.evidenceConfidence" ;;
    "Next learning action") must_review_two_key="decisionPage.mustReview.nextLearningAction" ;;
    "Approval gates") must_review_two_key="decisionPage.mustReview.approvalGates" ;;
    "Evidence rows") must_review_two_key="decisionPage.mustReview.evidenceRows" ;;
    "Dangerous operations") must_review_two_key="decisionPage.mustReview.dangerousOperations" ;;
    "Ahead/behind state") must_review_two_key="decisionPage.mustReview.aheadBehindState" ;;
    "Status source") must_review_two_key="decisionPage.mustReview.statusSource" ;;
    "Consistency") must_review_two_key="decisionPage.mustReview.consistency" ;;
    "Source identity") must_review_two_key="decisionPage.mustReview.sourceIdentity" ;;
    *) must_review_two_key="" ;;
  esac

  printf '{"id":'
  dashboard_json_string "$id"
  printf ',"title":'
  dashboard_json_string "$title"
  printf ',"scope":'
  dashboard_json_string "$scope"
  printf ',"audiences":'
  dashboard_json_string_array "non_engineer" "junior_engineer"
  printf ',"status":'
  dashboard_json_string "$status"
  printf ',"decision_question":'
  dashboard_json_string "$decision_question"
  printf ',"decision_question_key":'
  dashboard_json_string "$decision_question_key"
  printf ',"current_judgment":'
  dashboard_json_string "$current_judgment"
  printf ',"current_judgment_key":'
  dashboard_json_string "$current_judgment_key"
  printf ',"top_reason":'
  dashboard_json_string "$top_reason"
  printf ',"top_reason_key":'
  dashboard_json_string "$top_reason_key"
  printf ',"evidence_confidence":'
  dashboard_json_string "$evidence_confidence"
  printf ',"evidence_confidence_key":'
  dashboard_json_string "$evidence_confidence_key"
  printf ',"must_review":'
  dashboard_json_string_array "$must_review_one" "$must_review_two"
  printf ',"must_review_keys":'
  dashboard_json_string_array "$must_review_one_key" "$must_review_two_key"
  printf ',"next_safe_action":'
  dashboard_json_string "$next_safe_action"
  printf ',"next_safe_action_key":'
  dashboard_json_string "$next_safe_action_key"
  printf ',"detail_page":'
  dashboard_json_string "$detail_page"
  printf ',"owner_source":'
  dashboard_json_string "$owner_source"
  printf ',"source_id":'
  dashboard_json_string "$source_id"
  printf ',"authority":'
  dashboard_json_string "$authority"
  printf ',"freshness_state":'
  dashboard_json_string "$freshness_state"
  printf ',"confidence_level":'
  dashboard_json_string "$confidence_level"
  printf ',"risk_level":'
  dashboard_json_string "$risk_level"
  printf ',"command_execution_mode":"preview_only"}'
}

dashboard_json_workflow_evidence_event() {
  local event_id="$1"
  local source_id="$2"
  local observed_at="$3"
  local repository_head="$4"
  local status="$5"
  local freshness_state="$6"
  local authority="$7"
  local detail_artifact_path="$8"
  local summary="$9"

  dashboard_data_validate_state "$status"

  printf '{"event_id":'
  dashboard_json_string "$event_id"
  printf ',"source_id":'
  dashboard_json_string "$source_id"
  printf ',"observed_at":'
  dashboard_json_string "$observed_at"
  printf ',"repository_head":'
  dashboard_json_string "$repository_head"
  printf ',"status":'
  dashboard_json_string "$status"
  printf ',"freshness_state":'
  dashboard_json_string "$freshness_state"
  printf ',"authority":'
  dashboard_json_string "$authority"
  printf ',"detail_artifact_path":'
  dashboard_json_string "$detail_artifact_path"
  printf ',"summary":'
  dashboard_json_string "$summary"
  printf '}'
}

dashboard_json_material_update_event() {
  local event_id="$1"
  local event_type="$2"
  local purpose_code="$3"
  local occurred_at="$4"
  local source_id="$5"
  local status="$6"
  local repository_head="$7"
  local summary="$8"
  local command="$9"
  local detail_artifact_path="${10}"

  dashboard_data_validate_state "$status"

  printf '{"event_id":'
  dashboard_json_string "$event_id"
  printf ',"event_type":'
  dashboard_json_string "$event_type"
  printf ',"purpose_code":'
  dashboard_json_string "$purpose_code"
  printf ',"occurred_at":'
  dashboard_json_string "$occurred_at"
  printf ',"source_id":'
  dashboard_json_string "$source_id"
  printf ',"status":'
  dashboard_json_string "$status"
  printf ',"repository_head":'
  dashboard_json_string "$repository_head"
  printf ',"summary":'
  dashboard_json_string "$summary"
  printf ',"command":'
  dashboard_json_string "$command"
  printf ',"detail_artifact_path":'
  dashboard_json_string "$detail_artifact_path"
  printf '}'
}

dashboard_json_ci_evidence_role() {
  local role="$1"
  local status="$2"
  local source_id="$3"
  local head_match_status="$4"
  local authority="$5"
  local freshness_state="$6"
  local summary="$7"
  local observed_at="$8"

  dashboard_data_validate_state "$status"

  printf '{"role":'
  dashboard_json_string "$role"
  printf ',"status":'
  dashboard_json_string "$status"
  printf ',"source_id":'
  dashboard_json_string "$source_id"
  printf ',"head_match_status":'
  dashboard_json_string "$head_match_status"
  printf ',"authority":'
  dashboard_json_string "$authority"
  printf ',"freshness_state":'
  dashboard_json_string "$freshness_state"
  printf ',"summary":'
  dashboard_json_string "$summary"
  printf ',"observed_at":'
  dashboard_json_string "$observed_at"
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

dashboard_json_overview_section() {
  local id="$1"
  local title_key="$2"
  local status="$3"
  local value="$4"
  local detail="$5"
  local source_id="$6"
  local owner_source="$7"
  local freshness_state="$8"
  local authority="$9"
  local detail_page="${10}"
  local required_command="${11:-not_applicable}"

  dashboard_data_validate_state "$status"
  dashboard_data_validate_owner_source "$owner_source"
  dashboard_data_validate_evidence_freshness_state "$freshness_state"
  dashboard_data_validate_evidence_authority "$authority"
  dashboard_data_validate_detail_page "$detail_page"

  printf '{"id":'
  dashboard_json_string "$id"
  printf ',"title_key":'
  dashboard_json_string "$title_key"
  printf ',"status":'
  dashboard_json_string "$status"
  printf ',"value":'
  dashboard_json_string "$value"
  printf ',"detail":'
  dashboard_json_string "$detail"
  printf ',"source_id":'
  dashboard_json_string "$source_id"
  printf ',"owner_source":'
  dashboard_json_string "$owner_source"
  printf ',"freshness_state":'
  dashboard_json_string "$freshness_state"
  printf ',"authority":'
  dashboard_json_string "$authority"
  printf ',"detail_page":'
  dashboard_json_string "$detail_page"
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

dashboard_json_security_confirmation_evidence() {
  local id="$1"
  local label="$2"
  local status="$3"
  local source_id="$4"
  local freshness_state="$5"
  local authority="$6"
  local observed_at="$7"
  local source_artifacts="$8"
  local meaning="$9"
  local next_action="${10}"

  dashboard_data_validate_state "$status"
  dashboard_data_validate_evidence_freshness_state "$freshness_state"
  dashboard_data_validate_evidence_authority "$authority"
  dashboard_data_validate_scoped_reference_list "$source_artifacts"

  printf '{"id":'
  dashboard_json_string "$id"
  printf ',"label":'
  dashboard_json_string "$label"
  printf ',"status":'
  dashboard_json_string "$status"
  printf ',"source_id":'
  dashboard_json_string "$source_id"
  printf ',"freshness_state":'
  dashboard_json_string "$freshness_state"
  printf ',"authority":'
  dashboard_json_string "$authority"
  printf ',"observed_at":'
  dashboard_json_string "$observed_at"
  printf ',"source_artifacts":'
  dashboard_json_string "$source_artifacts"
  printf ',"meaning":'
  dashboard_json_string "$meaning"
  printf ',"next_action":'
  dashboard_json_string "$next_action"
  printf '}'
}

dashboard_json_security_authority_boundary() {
  local id="$1"
  local label="$2"
  local state="$3"
  local approval_required="$4"
  local risk_level="$5"
  local detail="$6"

  dashboard_json_bool "$approval_required" >/dev/null
  dashboard_data_validate_security_boundary_state "$state"
  dashboard_data_validate_risk_level "$risk_level"

  printf '{"id":'
  dashboard_json_string "$id"
  printf ',"label":'
  dashboard_json_string "$label"
  printf ',"state":'
  dashboard_json_string "$state"
  printf ',"approval_required":'
  dashboard_json_bool "$approval_required"
  printf ',"risk_level":'
  dashboard_json_string "$risk_level"
  printf ',"detail":'
  dashboard_json_string "$detail"
  printf '}'
}

dashboard_json_security_display_policy_item() {
  local id="$1"
  local label="$2"
  local state="$3"
  local detail="$4"

  dashboard_data_validate_security_display_state "$state"

  printf '{"id":'
  dashboard_json_string "$id"
  printf ',"label":'
  dashboard_json_string "$label"
  printf ',"state":'
  dashboard_json_string "$state"
  printf ',"detail":'
  dashboard_json_string "$detail"
  printf '}'
}

dashboard_json_security_confirmation_action() {
  local id="$1"
  local label="$2"
  local state="$3"
  local detail="$4"

  dashboard_data_validate_security_action_state "$state"

  printf '{"id":'
  dashboard_json_string "$id"
  printf ',"label":'
  dashboard_json_string "$label"
  printf ',"state":'
  dashboard_json_string "$state"
  printf ',"detail":'
  dashboard_json_string "$detail"
  printf '}'
}

dashboard_json_security_confirmation_blocker() {
  local id="$1"
  local status="$2"
  local source_id="$3"
  local detail="$4"
  local next_action="$5"

  dashboard_data_validate_state "$status"

  printf '{"id":'
  dashboard_json_string "$id"
  printf ',"status":'
  dashboard_json_string "$status"
  printf ',"source_id":'
  dashboard_json_string "$source_id"
  printf ',"detail":'
  dashboard_json_string "$detail"
  printf ',"next_action":'
  dashboard_json_string "$next_action"
  printf '}'
}

dashboard_json_maintenance_sync_row() {
  local id="$1"
  local label="$2"
  local status="$3"
  local source_id="$4"
  local freshness_state="$5"
  local authority="$6"
  local observed_at="$7"
  local detail="$8"
  local next_action="$9"
  local reference="${10}"
  local priority="${11:-medium}"

  dashboard_data_validate_state "$status"

  printf '{"id":'
  dashboard_json_string "$id"
  printf ',"label":'
  dashboard_json_string "$label"
  printf ',"status":'
  dashboard_json_string "$status"
  printf ',"source_id":'
  dashboard_json_string "$source_id"
  printf ',"freshness_state":'
  dashboard_json_string "$freshness_state"
  printf ',"authority":'
  dashboard_json_string "$authority"
  printf ',"observed_at":'
  dashboard_json_string "$observed_at"
  printf ',"detail":'
  dashboard_json_string "$detail"
  printf ',"next_action":'
  dashboard_json_string "$next_action"
  printf ',"reference":'
  dashboard_json_string "$reference"
  printf ',"priority":'
  dashboard_json_string "$priority"
  printf '}'
}

dashboard_json_maintenance_action() {
  local id="$1"
  local label="$2"
  local status="$3"
  local action_type="$4"
  local detail="$5"
  local source_id="$6"

  dashboard_data_validate_state "$status"

  printf '{"id":'
  dashboard_json_string "$id"
  printf ',"label":'
  dashboard_json_string "$label"
  printf ',"status":'
  dashboard_json_string "$status"
  printf ',"action_type":'
  dashboard_json_string "$action_type"
  printf ',"detail":'
  dashboard_json_string "$detail"
  printf ',"source_id":'
  dashboard_json_string "$source_id"
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

dashboard_status_confidence_level() {
  local authority="$1"
  local freshness_state="$2"
  case "$authority:$freshness_state" in
    authoritative:current) printf 'high' ;;
    authoritative:stale|manual_required:current|advisory:current) printf 'medium' ;;
    not_collected:*|*:not_collected) printf 'low' ;;
    *) printf 'unknown' ;;
  esac
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
  local command_id safe_command_text copy_allowed copy_block_reason argv_redacted
  local arg safe_arg
  local -a safe_argv=()

  dashboard_data_validate_risk_level "$risk_level"
  dashboard_json_bool "$requires_approval" >/dev/null
  dashboard_data_validate_execution_mode "$execution_mode"
  dashboard_json_bool "$non_executable" >/dev/null
  command_id="cmd-$(dashboard_data_content_hash "${intent}|${target}|${command_text}" | cut -c1-12)"
  safe_command_text="$(dashboard_data_safe_text "$command_text")"
  argv_redacted="false"
  for arg in "$@"; do
    safe_arg="$(dashboard_data_safe_text "$arg")"
    safe_argv+=("$safe_arg")
    if [[ "$safe_arg" != "$arg" ]]; then
      argv_redacted="true"
    fi
  done
  copy_allowed="false"
  copy_block_reason="display_only"
  if [[ "$risk_level" == "low" && "$requires_approval" == "false" && "$execution_mode" == "preview_only" && "$non_executable" == "true" && "$argv_redacted" == "false" && "$safe_command_text" == "$command_text" ]]; then
    copy_allowed="true"
    copy_block_reason="none"
  elif [[ "$argv_redacted" == "true" || "$safe_command_text" != "$command_text" ]]; then
    copy_block_reason="redacted_sensitive_or_local_value"
  elif [[ "$risk_level" != "low" ]]; then
    copy_block_reason="risk_review_required"
  elif [[ "$requires_approval" != "false" ]]; then
    copy_block_reason="approval_required"
  fi

  printf '{"command_id":'
  dashboard_json_string "$command_id"
  printf ',"intent":'
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
  dashboard_json_string_array "${safe_argv[@]}"
  printf ',"safe_argv":'
  dashboard_json_string_array "${safe_argv[@]}"
  printf ',"argv_redacted":'
  dashboard_json_bool "$argv_redacted"
  printf ',"command_text":'
  dashboard_json_string "$safe_command_text"
  printf ',"execution_mode":'
  dashboard_json_string "$execution_mode"
  printf ',"non_executable":'
  dashboard_json_bool "$non_executable"
  printf ',"copy_allowed":'
  dashboard_json_bool "$copy_allowed"
  printf ',"copy_block_reason":'
  dashboard_json_string "$copy_block_reason"
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
