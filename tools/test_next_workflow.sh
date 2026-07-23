#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

tests=(
  test_next_workflow_contracts.sh
  test_next_workflow_store.sh
  test_next_workflow_run_lifecycle.sh
  test_next_workflow_task_delivery.sh
  test_next_workflow_authority.sh
  test_next_workflow_planning.sh
  test_next_workflow_context.sh
  test_next_workflow_providers.sh
  test_next_workflow_runtime.sh
  test_next_workflow_isolated_runtime.sh
  test_next_workflow_agents.sh
  test_next_workflow_saga.sh
  test_next_workflow_projection_settings.sh
  test_next_workflow_compatibility.sh
  test_next_workflow_identity.sh
  test_next_workflow_child_isolation.sh
  test_next_workflow_release.sh
)

for test_script in "${tests[@]}"; do
  "$ROOT/tools/$test_script"
done
