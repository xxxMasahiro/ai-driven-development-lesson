#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

tests=(
  test_next_workflow_contracts.sh
  test_next_workflow_store.sh
  test_next_workflow_run_lifecycle.sh
  test_next_workflow_headless_plan.sh
  test_next_workflow_headless_bootstrap.sh
  test_next_workflow_launcher.sh
  test_next_workflow_headless_runtime.sh
  test_next_workflow_run_controller.sh
  test_next_workflow_task_delivery.sh
  test_next_workflow_authority.sh
  test_next_workflow_planning.sh
  test_next_workflow_context.sh
  test_next_workflow_providers.sh
  test_next_workflow_development_selection.sh
  test_next_workflow_delivery.sh
  test_next_workflow_owner_controller.sh
  test_next_workflow_runtime.sh
  test_next_workflow_isolated_runtime.sh
  test_next_workflow_agents.sh
  test_next_workflow_saga.sh
  test_next_workflow_projection_settings.sh
  test_next_workflow_compatibility.sh
  test_next_workflow_identity.sh
  test_next_workflow_child_isolation.sh
  test_next_workflow_release.sh
  test_next_workflow_release_observation.sh
  test_next_workflow_release_signing.sh
)

for test_script in "${tests[@]}"; do
  "$ROOT/tools/$test_script"
done
