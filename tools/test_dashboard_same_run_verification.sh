#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
exec node --test "$ROOT/tools/test_dashboard_same_run_verification.mjs"
