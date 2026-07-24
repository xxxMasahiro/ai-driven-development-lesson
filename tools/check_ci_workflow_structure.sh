#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

workflow_block() {
  local file="$1"
  local job="$2"
  awk -v job="$job" '
    $0 == "  " job ":" {
      in_job = 1
      print
      next
    }
    in_job && $0 ~ /^  [A-Za-z0-9_-]+:$/ {
      exit
    }
    in_job {
      print
    }
  ' "$file"
}

require_file_contains() {
  local file="$1"
  local pattern="$2"
  if ! grep -Fq -- "$pattern" "$file"; then
    printf 'Missing required workflow text in %s: %s\n' "$file" "$pattern" >&2
    return 1
  fi
}

require_delivery_aware_triggers() {
  local file="$1"
  if ! awk '
    $0 == "on:" { in_on = 1; next }
    in_on && $0 ~ /^[^ ]/ { in_on = 0 }
    in_on && $0 == "  push:" { push = 1; next }
    in_on && push && $0 == "    branches:" { branches = 1; next }
    in_on && branches && $0 == "      - main" { main = 1; next }
    in_on && $0 == "  pull_request:" { pull_request = 1 }
    END { exit (push && branches && main && pull_request) ? 0 : 1 }
  ' "$file"; then
    printf 'Workflow must run on pull requests and main pushes only: %s\n' "$file" >&2
    return 1
  fi
}

require_job() {
  local file="$1"
  local job="$2"
  local block
  block="$(workflow_block "$file" "$job")"
  if [[ -z "$block" ]]; then
    printf 'Missing required job in %s: %s\n' "$file" "$job" >&2
    return 1
  fi
}

require_job_contains() {
  local file="$1"
  local job="$2"
  local pattern="$3"
  local block
  block="$(workflow_block "$file" "$job")"
  if ! grep -Fq -- "$pattern" <<<"$block"; then
    printf 'Missing required text in %s job %s: %s\n' "$file" "$job" "$pattern" >&2
    return 1
  fi
}

reject_job_contains() {
  local file="$1"
  local job="$2"
  local pattern="$3"
  local block
  block="$(workflow_block "$file" "$job")"
  if grep -Fq -- "$pattern" <<<"$block"; then
    printf 'Forbidden workflow text in %s job %s: %s\n' "$file" "$job" "$pattern" >&2
    return 1
  fi
}

require_job_node_profile() {
  local file="$1"
  local job="$2"
  local version="$3"
  require_job_contains "$file" "$job" "actions/setup-node@v6"
  require_job_contains "$file" "$job" "node-version: \"$version\""
}

check_explicit_node_profiles() {
  local main="$ROOT/.github/workflows/ci.yml"
  local lesson14="$ROOT/.github/workflows/lesson14-ci.yml"
  local job
  for job in syntax-checks repository-document-sync structure-docs-checks lesson-cli-tests lesson-aggregate git-hooks-full-no-cache final-gate; do
    require_job_node_profile "$main" "$job" "24"
  done
  for job in policy-regression-tests playwright-tests; do
    require_job_node_profile "$main" "$job" "24"
  done
  for job in syntax-checks lesson14-structure-sync policy-regression-tests lesson14-cli-tests playwright-tests lesson14-final-gate aggregate-and-full-hooks; do
    require_job_node_profile "$lesson14" "$job" "24"
  done
  require_job_contains "$main" policy-regression-tests "./tools/verification-ci run-job --workflow main --job policy-regression-tests"
  require_job_contains "$main" playwright-tests "./tools/verification-ci run-job --workflow main --job playwright-tests"
  if ! grep -Fq '"node": ">=24.0.0"' "$ROOT/package.json" || ! grep -Fxq '24.0.0' "$ROOT/.node-version" || ! grep -Fxq '24.0.0' "$ROOT/.nvmrc"; then
    printf 'Root Node baseline must match the Node 24 workflow-state runtime.\n' >&2
    return 1
  fi
}

composition_engine="$(awk -F '\t' '$1 == "setting" && $2 == "ci_composition_engine" { print $3; found = 1; exit } END { if (!found) exit 1 }' "$ROOT/docs/workflow/FINAL_GATE_EXECUTION_POLICY.tsv")" || {
  printf 'CI composition engine policy is missing.\n' >&2
  exit 1
}

check_explicit_node_profiles

if [[ "$composition_engine" == "enforce" ]]; then
  "$ROOT/tools/verification-ci" check >/dev/null
  for workflow_file in "$ROOT/.github/workflows/ci.yml" "$ROOT/.github/workflows/lesson14-ci.yml"; do
    if grep -Eq 'actions/(checkout|setup-node|cache|upload-artifact|download-artifact)@v[123]' "$workflow_file"; then
      printf 'Deprecated Node-action major version in %s\n' "$workflow_file" >&2
      exit 1
    fi
    if grep -Fq 'continue-on-error: true' "$workflow_file"; then
      printf 'CI workflow must not use continue-on-error: true: %s\n' "$workflow_file" >&2
      exit 1
    fi
  done
  printf 'CI workflow structure check passed.\n'
  exit 0
fi

if [[ "$composition_engine" != "legacy" ]]; then
  printf 'Invalid CI composition engine: %s\n' "$composition_engine" >&2
  exit 1
fi

check_main_ci() {
  local file="$ROOT/.github/workflows/ci.yml"
  local job
  local required_jobs=(
    syntax-checks
    repository-document-sync
    structure-docs-checks
    policy-regression-tests
    lesson-cli-tests
    playwright-tests
    lesson-aggregate
    git-hooks-full-no-cache
    final-gate
  )

  for job in "${required_jobs[@]}"; do
    require_job "$file" "$job"
  done

  require_job_contains "$file" syntax-checks "bash -n tools/check_ci_workflow_structure.sh"
  require_job_contains "$file" syntax-checks "bash -n tools/lib/lesson_runtime.sh"
  require_job_contains "$file" syntax-checks "bash -n tools/lib/lesson_context.sh"
  require_job_contains "$file" syntax-checks "bash -n tools/lib/ci_evidence.sh"
  require_job_contains "$file" syntax-checks "bash -n tools/lib/ci_timing.sh"
  require_job_contains "$file" syntax-checks "bash -n tools/lib/as_built_evidence.sh"
  require_job_contains "$file" syntax-checks "bash -n tools/lib/repository_development_workflow.sh"
  require_job_contains "$file" syntax-checks "bash -n tools/repository-development-workflow"
  require_job_contains "$file" syntax-checks "bash -n tools/check_repository_development_workflow.sh"
  require_job_contains "$file" syntax-checks "bash -n tools/test_repository_development_workflow.sh"
  require_job_contains "$file" syntax-checks "bash -n tools/check_dashboard_design_system.sh"
  require_job_contains "$file" syntax-checks "bash -n tools/check_dashboard_bundle_contract.sh"
  require_job_contains "$file" syntax-checks "bash -n tools/test-plan"
  require_job_contains "$file" syntax-checks "bash -n tools/check_test_plan_coverage.sh"
  require_job_contains "$file" syntax-checks "bash -n tools/fixture-copy"
  require_job_contains "$file" syntax-checks "bash -n tools/test_fixture_copy.sh"
  require_job_contains "$file" syntax-checks "bash -n tools/ci-evidence"
  require_job_contains "$file" syntax-checks "bash -n tools/ci-timing"
  require_job_contains "$file" syntax-checks "bash -n tools/ci-final-gate"
  require_job_contains "$file" syntax-checks "bash -n tools/ci-playwright-setup"
  require_job_contains "$file" syntax-checks "bash -n tools/test_ci_evidence.sh"
  require_job_contains "$file" syntax-checks "bash -n tools/test_ci_timing.sh"
  require_job_contains "$file" syntax-checks "bash -n tools/test_ci_final_gate.sh"
  require_job_contains "$file" syntax-checks "bash -n tools/test_ci_pipeline_acceleration.sh"
  require_job_contains "$file" syntax-checks "bash -n tools/test_lesson_start_position.sh"
  require_job_contains "$file" syntax-checks "bash -n tools/test_lesson_context.sh"
  require_job_contains "$file" syntax-checks "bash -n tools/test_lesson14.sh"
  require_job_contains "$file" syntax-checks "bash -n tools/check_security_invariants.sh"
  require_job_contains "$file" syntax-checks "bash -n tools/product-security"
  require_job_contains "$file" syntax-checks "bash -n tools/lib/product_repository_authority.sh"
  require_job_contains "$file" syntax-checks "bash -n tools/lib/product_workflow_git_usage.sh"
  require_job_contains "$file" syntax-checks "bash -n tools/product-repository-authority"
  require_job_contains "$file" syntax-checks "bash -n tools/product-repository-mode"
  require_job_contains "$file" syntax-checks "bash -n tools/test_product_repository_authority.sh"
  require_job_contains "$file" syntax-checks "bash -n tools/test_product_repository_mode.sh"
  require_job_contains "$file" syntax-checks "bash -n tools/test_product_git_usage_modes.sh"
	  require_job_contains "$file" syntax-checks "node --check tools/lib/repository_document_sync.mjs"
	  require_job_contains "$file" syntax-checks "node --check tools/check_repository_document_sync.mjs"
	  require_job_contains "$file" syntax-checks "node --check tools/test_repository_document_sync.mjs"
	  require_job_contains "$file" repository-document-sync "fetch-depth: 0"
	  require_job_contains "$file" repository-document-sync "actions/setup-node@v6"
	  require_job_contains "$file" repository-document-sync "node-version: \"20\""
	  require_job_contains "$file" repository-document-sync "./tools/check_repository_document_sync.sh"
	  require_job_contains "$file" repository-document-sync "./tools/test_repository_document_sync.sh"
	  require_job_contains "$file" repository-document-sync "--range-mode pr"
	  require_job_contains "$file" repository-document-sync "--range-mode push"
	  require_job_contains "$file" repository-document-sync "--initial-head"
	  reject_job_contains "$file" repository-document-sync "npm ci"
	  reject_job_contains "$file" repository-document-sync "product-repository-authority"
	  require_job_contains "$file" syntax-checks "bash -n tools/lib/dashboard_data.sh"
	  require_job_contains "$file" syntax-checks "bash -n tools/dashboard-data"
	  require_job_contains "$file" syntax-checks "bash -n tools/dashboard-control-center"
	  require_job_contains "$file" syntax-checks "bash -n tools/test_dashboard_schema.sh"
	  require_job_contains "$file" syntax-checks "bash -n tools/test_dashboard_data.sh"
	  require_job_contains "$file" syntax-checks "bash -n tools/test_dashboard_i18n.sh"
	  require_job_contains "$file" syntax-checks "bash -n tools/test_dashboard_browser_debug_manifest.sh"
	  require_job_contains "$file" syntax-checks "bash -n tools/test_dashboard_design_studio_events.sh"
	  require_job_contains "$file" syntax-checks "bash -n tools/test_dashboard_control_center.sh"
  require_job_contains "$file" structure-docs-checks "./tools/check_lesson_structure.sh"
  require_job_contains "$file" structure-docs-checks "./tools/check_as_built_docs.sh"
  require_job_contains "$file" structure-docs-checks "./tools/check_test_plan_coverage.sh"
  require_job_contains "$file" structure-docs-checks "./tools/check_security_invariants.sh"
  require_job_contains "$file" structure-docs-checks "./tools/check_repository_development_workflow.sh"
	  require_job_contains "$file" structure-docs-checks "./tools/check_dashboard_design_system.sh"
  require_job_contains "$file" structure-docs-checks "./tools/lesson-context status"
  require_job_contains "$file" policy-regression-tests "./tools/test_resource_guard_summary.sh"
  require_job_contains "$file" policy-regression-tests "./tools/test_test_plan.sh"
  require_job_contains "$file" policy-regression-tests "./tools/test_repository_development_workflow.sh"
  require_job_contains "$file" policy-regression-tests "./tools/test_repository_document_sync.sh"
  require_job_contains "$file" policy-regression-tests "./tools/test_git_hooks_parallel.sh"
  require_job_contains "$file" policy-regression-tests "./tools/test_fixture_copy.sh"
  require_job_contains "$file" policy-regression-tests "./tools/test_lesson_context.sh"
  require_job_contains "$file" policy-regression-tests "./tools/test_ci_evidence.sh"
  require_job_contains "$file" policy-regression-tests "./tools/test_ci_timing.sh"
  require_job_contains "$file" policy-regression-tests "actions/setup-node@v6"
  require_job_contains "$file" policy-regression-tests "npm ci"
  require_job_contains "$file" policy-regression-tests "./tools/test_dashboard_schema.sh"
  require_job_contains "$file" policy-regression-tests "./tools/test_dashboard_data.sh"
  require_job_contains "$file" policy-regression-tests "./tools/test_dashboard_i18n.sh"
  require_job_contains "$file" policy-regression-tests "./tools/check_dashboard_bundle_contract.sh"
  require_job_contains "$file" policy-regression-tests "./tools/test_dashboard_browser_debug_manifest.sh"
  require_job_contains "$file" policy-regression-tests "./tools/test_dashboard_design_studio_events.sh"
  require_job_contains "$file" policy-regression-tests "./tools/test_ci_final_gate.sh"
  require_job_contains "$file" policy-regression-tests "./tools/test_ci_pipeline_acceleration.sh"
  require_job_contains "$file" policy-regression-tests "./tools/test_security_invariants.sh"
  require_job_contains "$file" policy-regression-tests "./tools/test_lesson_start_position.sh"
  require_job_contains "$file" policy-regression-tests "./tools/test_product_gate_tools.sh"
  require_job_contains "$file" policy-regression-tests "./tools/test_product_repository_authority.sh"
  require_job_contains "$file" policy-regression-tests "./tools/test_product_repository_mode.sh"
  require_job_contains "$file" policy-regression-tests "./tools/test_product_security.sh"
  require_job_contains "$file" policy-regression-tests "./tools/test_product_git_usage_modes.sh"
  require_job_contains "$file" policy-regression-tests "./tools/check_ci_workflow_structure.sh"
  require_job_contains "$file" lesson-cli-tests "./tools/test_lesson.sh"
  require_job_contains "$file" playwright-tests "actions/setup-node@v6"
  require_job_contains "$file" playwright-tests "actions/cache@v5.0.5"
  require_job_contains "$file" playwright-tests "cache: npm"
  require_job_contains "$file" playwright-tests "path: ~/.cache/ms-playwright"
  require_job_contains "$file" playwright-tests "./tools/ci-playwright-setup"
  reject_job_contains "$file" playwright-tests "npm install"
  reject_job_contains "$file" playwright-tests "npx playwright install chromium"
  require_job_contains "$file" playwright-tests 'CI_EVIDENCE_DIR: ${{ runner.temp }}/ci-evidence'
	  require_job_contains "$file" playwright-tests "CI_EVIDENCE_SOURCE_JOB: playwright-tests"
	  require_job_contains "$file" playwright-tests "./tools/test_lesson_playwright.sh --write-evidence"
	  require_job_contains "$file" playwright-tests "./tools/test_dashboard_control_center.sh"
	  require_job_contains "$file" playwright-tests "actions/upload-artifact@v7.0.1"
  require_job_contains "$file" playwright-tests "include-hidden-files: true"
  require_job_contains "$file" lesson-aggregate "needs:"
  require_job_contains "$file" lesson-aggregate "- syntax-checks"
  require_job_contains "$file" lesson-aggregate "- structure-docs-checks"
  require_job_contains "$file" lesson-aggregate "- policy-regression-tests"
  require_job_contains "$file" lesson-aggregate "- lesson-cli-tests"
  require_job_contains "$file" lesson-aggregate "- playwright-tests"
  require_job_contains "$file" lesson-aggregate "actions/setup-node@v6"
  require_job_contains "$file" lesson-aggregate "actions/cache@v5.0.5"
  require_job_contains "$file" lesson-aggregate "actions/download-artifact@v8.0.1"
  require_job_contains "$file" lesson-aggregate "cache: npm"
  require_job_contains "$file" lesson-aggregate "path: ~/.cache/ms-playwright"
  require_job_contains "$file" lesson-aggregate "./tools/ci-playwright-setup"
  reject_job_contains "$file" lesson-aggregate "npm install"
  reject_job_contains "$file" lesson-aggregate "npx playwright install chromium"
  require_job_contains "$file" lesson-aggregate 'CI_EVIDENCE_DIR: ${{ runner.temp }}/ci-evidence'
  require_job_contains "$file" lesson-aggregate "CI_EVIDENCE_SOURCE_JOB: lesson-aggregate"
  require_job_contains "$file" lesson-aggregate "CI_EVIDENCE_PLAYWRIGHT_SOURCE_JOB: playwright-tests"
  require_job_contains "$file" lesson-aggregate 'CI_TIMING_DIR: ${{ runner.temp }}/ci-timing'
  require_job_contains "$file" lesson-aggregate 'CI_TIMING_REPORT: ${{ runner.temp }}/ci-timing/lesson-aggregate.tsv'
  require_job_contains "$file" lesson-aggregate "./tools/ci-timing run lesson_aggregate"
  require_job_contains "$file" lesson-aggregate "./tools/test_lesson_repository.sh --use-evidence --write-evidence"
  require_job_contains "$file" lesson-aggregate "Upload lesson aggregate timing"
  require_job_contains "$file" lesson-aggregate 'ci-timing-part-lesson-aggregate-${{ github.run_id }}-${{ github.run_attempt }}'
  require_job_contains "$file" git-hooks-full-no-cache "needs:"
  require_job_contains "$file" git-hooks-full-no-cache "- syntax-checks"
  require_job_contains "$file" git-hooks-full-no-cache "- structure-docs-checks"
  require_job_contains "$file" git-hooks-full-no-cache "- policy-regression-tests"
  require_job_contains "$file" git-hooks-full-no-cache "- lesson-cli-tests"
  require_job_contains "$file" git-hooks-full-no-cache "- playwright-tests"
  require_job_contains "$file" git-hooks-full-no-cache "actions/setup-node@v6"
  require_job_contains "$file" git-hooks-full-no-cache "actions/cache@v5.0.5"
  require_job_contains "$file" git-hooks-full-no-cache "actions/download-artifact@v8.0.1"
  require_job_contains "$file" git-hooks-full-no-cache "cache: npm"
  require_job_contains "$file" git-hooks-full-no-cache "path: ~/.cache/ms-playwright"
  require_job_contains "$file" git-hooks-full-no-cache "./tools/ci-playwright-setup"
  reject_job_contains "$file" git-hooks-full-no-cache "npm install"
  reject_job_contains "$file" git-hooks-full-no-cache "npx playwright install chromium"
  require_job_contains "$file" git-hooks-full-no-cache "RESOURCE_GUARD_SKIP_LOCAL_CHECK: \"1\""
  require_job_contains "$file" git-hooks-full-no-cache 'CI_EVIDENCE_DIR: ${{ runner.temp }}/ci-evidence'
  require_job_contains "$file" git-hooks-full-no-cache "CI_EVIDENCE_SOURCE_JOB: git-hooks-full-no-cache"
  require_job_contains "$file" git-hooks-full-no-cache "CI_EVIDENCE_PLAYWRIGHT_SOURCE_JOB: playwright-tests"
  require_job_contains "$file" git-hooks-full-no-cache 'CI_TIMING_DIR: ${{ runner.temp }}/ci-timing'
  require_job_contains "$file" git-hooks-full-no-cache 'CI_TIMING_REPORT: ${{ runner.temp }}/ci-timing/git-hooks-full-no-cache.tsv'
  require_job_contains "$file" git-hooks-full-no-cache "./tools/ci-timing run git_hooks_full_no_cache"
  require_job_contains "$file" git-hooks-full-no-cache "./tools/git-hooks run --mode full --no-cache --jobs 4"
  require_job_contains "$file" git-hooks-full-no-cache "Upload Git hook evidence"
  require_job_contains "$file" git-hooks-full-no-cache "Upload Git hooks timing"
  require_job_contains "$file" git-hooks-full-no-cache 'ci-evidence-git-hooks-${{ github.run_id }}-${{ github.run_attempt }}'
  require_job_contains "$file" git-hooks-full-no-cache 'ci-timing-part-git-hooks-full-no-cache-${{ github.run_id }}-${{ github.run_attempt }}'
  require_job_contains "$file" final-gate "needs:"
  require_job_contains "$file" final-gate 'if: ${{ always() }}'
  require_job_contains "$file" final-gate "- lesson-aggregate"
  require_job_contains "$file" final-gate "- git-hooks-full-no-cache"
  require_job_contains "$file" final-gate "- repository-document-sync"
  require_job_contains "$file" final-gate "Verify split prerequisites"
  require_job_contains "$file" final-gate 'LESSON_AGGREGATE_RESULT: ${{ needs.lesson-aggregate.result }}'
  require_job_contains "$file" final-gate 'GIT_HOOKS_FULL_NO_CACHE_RESULT: ${{ needs.git-hooks-full-no-cache.result }}'
  require_job_contains "$file" final-gate 'REPOSITORY_DOCUMENT_SYNC_RESULT: ${{ needs.repository-document-sync.result }}'
  require_job_contains "$file" final-gate "Split prerequisite failed:"
  require_job_contains "$file" final-gate "actions/download-artifact@v8.0.1"
  require_job_contains "$file" final-gate "CI_FINAL_GATE_REQUIRE_HOOK_EVIDENCE: \"1\""
  require_job_contains "$file" final-gate 'CI_EVIDENCE_DIR: ${{ runner.temp }}/ci-evidence'
  require_job_contains "$file" final-gate "CI_EVIDENCE_EXPECT_SOURCE_JOB: git-hooks-full-no-cache"
  require_job_contains "$file" final-gate "./tools/ci-final-gate"
  require_job_contains "$file" final-gate "Download CI timing parts"
  require_job_contains "$file" final-gate "merge-multiple: true"
  require_job_contains "$file" final-gate "Upload CI timing report"
  require_job_contains "$file" final-gate 'ci-timing-${{ github.run_id }}-${{ github.run_attempt }}'
}

check_lesson14_ci() {
  local file="$ROOT/.github/workflows/lesson14-ci.yml"
  local job
  local required_jobs=(
    syntax-checks
    lesson14-structure-sync
    policy-regression-tests
    lesson14-cli-tests
    playwright-tests
    lesson14-final-gate
    aggregate-and-full-hooks
  )

  for job in "${required_jobs[@]}"; do
    require_job "$file" "$job"
  done

  require_job_contains "$file" syntax-checks "bash -n tools/check_ci_workflow_structure.sh"
  require_job_contains "$file" syntax-checks "bash -n tools/lib/lesson_context.sh"
  require_job_contains "$file" syntax-checks "bash -n tools/lib/ci_evidence.sh"
  require_job_contains "$file" syntax-checks "bash -n tools/lib/ci_timing.sh"
  require_job_contains "$file" syntax-checks "bash -n tools/lib/as_built_evidence.sh"
  require_job_contains "$file" syntax-checks "bash -n tools/lib/repository_development_workflow.sh"
  require_job_contains "$file" syntax-checks "bash -n tools/repository-development-workflow"
  require_job_contains "$file" syntax-checks "bash -n tools/check_repository_development_workflow.sh"
  require_job_contains "$file" syntax-checks "bash -n tools/test_repository_development_workflow.sh"
  require_job_contains "$file" syntax-checks "bash -n tools/check_dashboard_design_system.sh"
  require_job_contains "$file" syntax-checks "bash -n tools/check_dashboard_bundle_contract.sh"
  require_job_contains "$file" syntax-checks "bash -n tools/test-plan"
  require_job_contains "$file" syntax-checks "bash -n tools/check_test_plan_coverage.sh"
  require_job_contains "$file" syntax-checks "bash -n tools/fixture-copy"
  require_job_contains "$file" syntax-checks "bash -n tools/test_fixture_copy.sh"
  require_job_contains "$file" syntax-checks "bash -n tools/ci-evidence"
  require_job_contains "$file" syntax-checks "bash -n tools/ci-timing"
  require_job_contains "$file" syntax-checks "bash -n tools/ci-final-gate"
  require_job_contains "$file" syntax-checks "bash -n tools/ci-playwright-setup"
  require_job_contains "$file" syntax-checks "bash -n tools/test_ci_evidence.sh"
  require_job_contains "$file" syntax-checks "bash -n tools/test_ci_timing.sh"
  require_job_contains "$file" syntax-checks "bash -n tools/test_ci_final_gate.sh"
  require_job_contains "$file" syntax-checks "bash -n tools/test_ci_pipeline_acceleration.sh"
  require_job_contains "$file" syntax-checks "bash -n tools/test_lesson_start_position.sh"
  require_job_contains "$file" syntax-checks "bash -n tools/test_lesson_context.sh"
  require_job_contains "$file" syntax-checks "bash -n tools/check_security_invariants.sh"
  require_job_contains "$file" syntax-checks "bash -n tools/product-security"
  require_job_contains "$file" syntax-checks "bash -n tools/lib/product_repository_authority.sh"
  require_job_contains "$file" syntax-checks "bash -n tools/lib/product_workflow_git_usage.sh"
  require_job_contains "$file" syntax-checks "bash -n tools/product-repository-authority"
  require_job_contains "$file" syntax-checks "bash -n tools/product-repository-mode"
  require_job_contains "$file" syntax-checks "bash -n tools/test_product_repository_authority.sh"
  require_job_contains "$file" syntax-checks "bash -n tools/test_product_repository_mode.sh"
  require_job_contains "$file" syntax-checks "bash -n tools/test_product_git_usage_modes.sh"
	  require_job_contains "$file" syntax-checks "bash -n tools/lib/dashboard_data.sh"
	  require_job_contains "$file" syntax-checks "bash -n tools/dashboard-data"
	  require_job_contains "$file" syntax-checks "bash -n tools/dashboard-control-center"
	  require_job_contains "$file" syntax-checks "bash -n tools/test_dashboard_schema.sh"
	  require_job_contains "$file" syntax-checks "bash -n tools/test_dashboard_data.sh"
	  require_job_contains "$file" syntax-checks "bash -n tools/test_dashboard_i18n.sh"
	  require_job_contains "$file" syntax-checks "bash -n tools/test_dashboard_browser_debug_manifest.sh"
	  require_job_contains "$file" syntax-checks "bash -n tools/test_dashboard_design_studio_events.sh"
	  require_job_contains "$file" syntax-checks "bash -n tools/test_dashboard_control_center.sh"
  require_job_contains "$file" lesson14-structure-sync "./tools/check_lesson14_structure.sh"
  require_job_contains "$file" lesson14-structure-sync "./tools/check_lesson14_sync.sh"
  require_job_contains "$file" lesson14-structure-sync "./tools/check_test_plan_coverage.sh"
  require_job_contains "$file" lesson14-structure-sync "./tools/check_security_invariants.sh"
  require_job_contains "$file" lesson14-structure-sync "./tools/check_repository_development_workflow.sh"
  require_job_contains "$file" policy-regression-tests "./tools/check_test_plan_coverage.sh"
  require_job_contains "$file" policy-regression-tests "./tools/check_security_invariants.sh"
  require_job_contains "$file" policy-regression-tests "./tools/check_ci_workflow_structure.sh"
  require_job_contains "$file" policy-regression-tests "./tools/test_repository_development_workflow.sh"
  require_job_contains "$file" policy-regression-tests "./tools/test_ci_pipeline_acceleration.sh"
  require_job_contains "$file" policy-regression-tests "./tools/test_ci_timing.sh"
  require_job_contains "$file" policy-regression-tests "./tools/test_lesson_context.sh"
  require_job_contains "$file" policy-regression-tests "actions/setup-node@v6"
  require_job_contains "$file" policy-regression-tests "npm ci"
  require_job_contains "$file" policy-regression-tests "./tools/check_dashboard_bundle_contract.sh"
  require_job_contains "$file" policy-regression-tests "./tools/test_dashboard_browser_debug_manifest.sh"
  require_job_contains "$file" policy-regression-tests "./tools/test_dashboard_design_studio_events.sh"
  require_job_contains "$file" policy-regression-tests "Lesson14 CI keeps the policy-regression-tests job context"
  require_job_contains "$file" policy-regression-tests "common policy regressions are provided by CI / policy-regression-tests"
  reject_job_contains "$file" policy-regression-tests "./tools/test_docs_tour.sh"
  reject_job_contains "$file" policy-regression-tests "./tools/test_git_workflow_policy.sh"
  reject_job_contains "$file" policy-regression-tests "./tools/test_git_hooks.sh"
  reject_job_contains "$file" policy-regression-tests "./tools/test_product_gate_tools.sh"
  require_job_contains "$file" lesson14-cli-tests "./tools/test_lesson14.sh"
  require_job_contains "$file" playwright-tests "needs:"
  require_job_contains "$file" playwright-tests "- syntax-checks"
  require_job_contains "$file" playwright-tests "- lesson14-structure-sync"
  require_job_contains "$file" playwright-tests "- policy-regression-tests"
  require_job_contains "$file" playwright-tests "Shared Playwright coverage compatibility gate"
  require_job_contains "$file" playwright-tests "./tools/check_lesson14_structure.sh"
  require_job_contains "$file" playwright-tests "./tools/check_lesson14_sync.sh"
  require_job_contains "$file" playwright-tests "./tools/check_ci_workflow_structure.sh"
  require_job_contains "$file" playwright-tests "browser coverage is provided by CI / playwright-tests"
  reject_job_contains "$file" playwright-tests "npm install"
  reject_job_contains "$file" playwright-tests "npx playwright install chromium"
  reject_job_contains "$file" playwright-tests "./tools/test_lesson_playwright.sh"
  require_job_contains "$file" lesson14-final-gate "needs:"
  require_job_contains "$file" lesson14-final-gate "- syntax-checks"
  require_job_contains "$file" lesson14-final-gate "- lesson14-structure-sync"
  require_job_contains "$file" lesson14-final-gate "- policy-regression-tests"
  require_job_contains "$file" lesson14-final-gate "- lesson14-cli-tests"
  require_job_contains "$file" lesson14-final-gate "./tools/check_lesson14_structure.sh"
  require_job_contains "$file" lesson14-final-gate "./tools/check_lesson14_sync.sh"
  require_job_contains "$file" lesson14-final-gate "./tools/test_lesson_start_position.sh"
  require_job_contains "$file" lesson14-final-gate "./tools/test_lesson14.sh"
  require_job_contains "$file" lesson14-final-gate "./tools/check_ci_workflow_structure.sh"
  require_job_contains "$file" aggregate-and-full-hooks "needs:"
  require_job_contains "$file" aggregate-and-full-hooks "CI_COMMON_COVERAGE_SOURCE: ci-split-common-coverage"
  require_job_contains "$file" aggregate-and-full-hooks "- syntax-checks"
  require_job_contains "$file" aggregate-and-full-hooks "- lesson14-structure-sync"
  require_job_contains "$file" aggregate-and-full-hooks "- policy-regression-tests"
  require_job_contains "$file" aggregate-and-full-hooks "- lesson14-cli-tests"
  require_job_contains "$file" aggregate-and-full-hooks "- playwright-tests"
  require_job_contains "$file" aggregate-and-full-hooks "- lesson14-final-gate"
  require_job_contains "$file" aggregate-and-full-hooks "Compatibility aggregate and full-hooks gate"
  require_job_contains "$file" aggregate-and-full-hooks "./tools/check_lesson14_structure.sh"
  require_job_contains "$file" aggregate-and-full-hooks "./tools/check_lesson14_sync.sh"
  require_job_contains "$file" aggregate-and-full-hooks "./tools/test_lesson_start_position.sh"
  require_job_contains "$file" aggregate-and-full-hooks "./tools/check_ci_workflow_structure.sh"
  require_job_contains "$file" aggregate-and-full-hooks 'common coverage marker: %s'
  reject_job_contains "$file" aggregate-and-full-hooks "./tools/test_lesson_repository.sh"
  reject_job_contains "$file" aggregate-and-full-hooks "./tools/git-hooks run --mode full --no-cache"
}

require_file_contains "$ROOT/.github/workflows/ci.yml" "concurrency:"
require_file_contains "$ROOT/.github/workflows/lesson14-ci.yml" "concurrency:"
for workflow_file in "$ROOT/.github/workflows/ci.yml" "$ROOT/.github/workflows/lesson14-ci.yml"; do
  require_delivery_aware_triggers "$workflow_file"
  if grep -Eq 'actions/(checkout|setup-node|cache|upload-artifact|download-artifact)@v[123]' "$workflow_file"; then
    printf 'Deprecated Node-action major version in %s\n' "$workflow_file" >&2
    exit 1
  fi
  if grep -Fq 'continue-on-error: true' "$workflow_file"; then
    printf 'CI workflow must not use continue-on-error: true: %s\n' "$workflow_file" >&2
    exit 1
  fi
done
check_main_ci
check_lesson14_ci

printf 'CI workflow structure check passed.\n'
