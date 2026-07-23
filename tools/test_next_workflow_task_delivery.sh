#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
exec node --no-warnings "$SCRIPT_DIR/test_next_workflow_task_delivery.mjs"
