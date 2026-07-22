#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

"$ROOT/tools/check_next_workflow_contracts.sh"
node --check "$ROOT/tools/next-workflow.mjs"
node --check "$ROOT/tools/lib/next_workflow/store.mjs"
node --check "$ROOT/tools/lib/next_workflow/authority.mjs"
node --check "$ROOT/tools/lib/next_workflow/planning.mjs"
node --check "$ROOT/tools/lib/next_workflow/context.mjs"
node --check "$ROOT/tools/lib/next_workflow/providers.mjs"
node --check "$ROOT/tools/lib/next_workflow/provider_discovery.mjs"
node --check "$ROOT/tools/lib/next_workflow/runtime.mjs"
node --check "$ROOT/tools/lib/next_workflow/agents.mjs"
node --check "$ROOT/tools/lib/next_workflow/saga.mjs"
node --check "$ROOT/tools/lib/next_workflow/projection.mjs"
node --check "$ROOT/tools/lib/next_workflow/settings.mjs"
node --check "$ROOT/tools/lib/next_workflow/compatibility.mjs"
node --check "$ROOT/tools/lib/next_workflow/release.mjs"
node --check "$ROOT/tools/lib/next_workflow/release_trust.mjs"
"$ROOT/tools/next-workflow" projection >/dev/null
"$ROOT/tools/next-workflow" activation status >/dev/null
"$ROOT/tools/next-workflow" release status >/dev/null
