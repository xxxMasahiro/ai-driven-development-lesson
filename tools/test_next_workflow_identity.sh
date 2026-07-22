#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
node --test "$ROOT/tools/test_next_workflow_identity.mjs"
