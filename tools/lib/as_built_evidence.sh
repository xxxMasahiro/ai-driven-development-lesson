#!/usr/bin/env bash

AS_BUILT_EVIDENCE_LIB_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=ci_evidence.sh
source "$AS_BUILT_EVIDENCE_LIB_DIR/ci_evidence.sh"

as_built_docs_evidence_id="as_built_docs"
as_built_docs_command_identity="check_as_built_docs_v1"
as_built_sync_evidence_id="as_built_sync_contract"
as_built_sync_command_identity="check_as_built_sync_contract_v1"
as_built_evidence_inputs=(
  docs/as-built
  docs/workflow/AS_BUILT_SYNC_CONTRACT.tsv
  docs/workflow/TASK_TRACKER.md
  docs/workflow/HANDOFF.md
  tools/check_as_built_docs.sh
  tools/check_as_built_sync_contract.sh
  tools/as-built-sync
)

as_built_evidence_use_enabled() {
  [[ "${CI_EVIDENCE_USE:-0}" == "1" ]]
}

as_built_evidence_write_enabled() {
  [[ "${CI_EVIDENCE_WRITE:-0}" == "1" ]]
}

as_built_evidence_record_if_enabled() {
  local evidence_id="$1"
  local command_identity="$2"
  shift 2
  if as_built_evidence_write_enabled; then
    ci_evidence_record_success "$evidence_id" "$command_identity" "$@"
  fi
}

as_built_evidence_run_docs_check() {
  if as_built_evidence_use_enabled; then
    if ci_evidence_verify_success "$as_built_docs_evidence_id" "$as_built_docs_command_identity" "${as_built_evidence_inputs[@]}" >/dev/null 2>&1; then
      printf 'As-built docs same-run evidence accepted.\n'
      return 0
    fi
  fi

  "${LESSON_ROOT:-$(pwd)}/tools/check_as_built_docs.sh"
  as_built_evidence_record_if_enabled "$as_built_docs_evidence_id" "$as_built_docs_command_identity" "${as_built_evidence_inputs[@]}"
  as_built_evidence_record_if_enabled "$as_built_sync_evidence_id" "$as_built_sync_command_identity" "${as_built_evidence_inputs[@]}"
}

as_built_evidence_run_sync_contract_check() {
  if as_built_evidence_use_enabled; then
    if ci_evidence_verify_success "$as_built_sync_evidence_id" "$as_built_sync_command_identity" "${as_built_evidence_inputs[@]}" >/dev/null 2>&1; then
      printf 'As-built sync-contract same-run evidence accepted.\n'
      return 0
    fi
  fi

  "${LESSON_ROOT:-$(pwd)}/tools/check_as_built_sync_contract.sh"
  as_built_evidence_record_if_enabled "$as_built_sync_evidence_id" "$as_built_sync_command_identity" "${as_built_evidence_inputs[@]}"
}
