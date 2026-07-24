#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
node "$SCRIPT_DIR/test_next_workflow_providers.mjs"
exec node "$SCRIPT_DIR/test_next_workflow_provider_isolation.mjs"
