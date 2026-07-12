#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
missing=0

require_file() {
  local file="$1"
  if [[ ! -f "$ROOT/$file" ]]; then
    printf 'missing development instruction artifact: %s\n' "$file" >&2
    missing=1
  fi
}

require_executable() {
  local file="$1"
  require_file "$file"
  if [[ -f "$ROOT/$file" && ! -x "$ROOT/$file" ]]; then
    printf 'development instruction command is not executable: %s\n' "$file" >&2
    missing=1
  fi
}

require_pattern() {
  local file="$1"
  local pattern="$2"
  local label="$3"
  if ! grep -Eq "$pattern" "$ROOT/$file"; then
    printf 'missing development instruction %s in %s\n' "$label" "$file" >&2
    missing=1
  fi
}

for file in \
  docs/workflow/DEVELOPMENT_INSTRUCTION_POLICY.tsv \
  docs/workflow/DEVELOPMENT_AUTONOMY_WORKFLOW.tsv \
  docs/workflow/INSTRUCTION_MEMORY.md \
  tools/lib/development_instruction.mjs \
  tools/lib/development_instruction.sh \
  tools/test_development_instruction.mjs
do
  require_file "$file"
done

for file in \
  tools/development-instruction \
  tools/check_development_instruction.sh \
  tools/test_development_instruction.sh
do
  require_executable "$file"
done

for stage in A B C D E F; do
  require_pattern "docs/workflow/INSTRUCTION_MEMORY.md" "^## ${stage}[.] " "stage ${stage} heading"
  require_pattern "docs/workflow/DEVELOPMENT_AUTONOMY_WORKFLOW.tsv" "^${stage}[[:space:]]" "stage ${stage} policy"
done

require_pattern "docs/workflow/DEVELOPMENT_INSTRUCTION_POLICY.tsv" '^activation_mode[[:space:]]+(shadow|enforce)[[:space:]]' "activation policy"
require_pattern "docs/workflow/DEVELOPMENT_INSTRUCTION_POLICY.tsv" '^local_instruction_path[[:space:]]+' "local path locator"
require_pattern "docs/workflow/DEVELOPMENT_INSTRUCTION_POLICY.tsv" '^parent_instruction_path[[:space:]]+' "parent path locator"
require_pattern "docs/workflow/DEVELOPMENT_INSTRUCTION_POLICY.tsv" '^parent_workflow_kinds[[:space:]]+' "parent workflow kind"
require_pattern "docs/workflow/DEVELOPMENT_INSTRUCTION_POLICY.tsv" '^product_workflow_kinds[[:space:]]+' "product workflow kind"
require_pattern "docs/workflow/INSTRUCTION_MEMORY.md" 'This document alone never creates a task scope' "non-authorizing fallback boundary"
require_pattern "docs/workflow/INSTRUCTION_MEMORY.md" 'failed or unknown required CI' "failed-CI merge boundary"
require_pattern "tools/lib/development_instruction.mjs" "parent_fallback_on: 'exact_absence_only'" "exact-absence result"
require_pattern "tools/lib/development_instruction.mjs" "result.source === 'local'" "local authority rendering"

if [[ "$missing" -ne 0 ]]; then
  printf '\nDevelopment instruction check failed.\n' >&2
  exit 1
fi

"$ROOT/tools/development-instruction" check >/dev/null
printf 'Development instruction check passed.\n'
