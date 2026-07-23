#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)"
exec node "$SCRIPT_DIR/test_next_workflow_headless_runtime.mjs"
