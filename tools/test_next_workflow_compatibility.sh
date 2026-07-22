#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
exec node --no-warnings "$ROOT/tools/test_next_workflow_compatibility.mjs"
