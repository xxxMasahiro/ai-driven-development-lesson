#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
AGENTS_FILE="$ROOT/AGENTS.MD"
DOCUMENT_MAP_FILE="$ROOT/guides/DOCUMENT_MAP.md"

missing=0
checked=0

report_missing() {
  printf '%s\n' "$1" >&2
  missing=1
}

contains_text() {
  local file="$1"
  local text="$2"
  grep -Fq -- "$text" "$file"
}

require_file() {
  local rel="$1"
  if [[ ! -f "$ROOT/$rel" ]]; then
    report_missing "missing required document-root file: $rel"
  fi
}

require_file "AGENTS.MD"
require_file "guides/DOCUMENT_MAP.md"

if [[ -f "$AGENTS_FILE" && -f "$DOCUMENT_MAP_FILE" ]]; then
  if ! contains_text "$AGENTS_FILE" "guides/DOCUMENT_MAP.md"; then
    report_missing "AGENTS.MD does not route to guides/DOCUMENT_MAP.md"
  fi
  if ! contains_text "$AGENTS_FILE" "skills/*/SKILL.md"; then
    report_missing "AGENTS.MD does not define the repo-local skills root: skills/*/SKILL.md"
  fi
fi

document_is_routed() {
  local rel="$1"
  contains_text "$AGENTS_FILE" "$rel" || contains_text "$DOCUMENT_MAP_FILE" "$rel"
}

skill_is_routed() {
  local rel="$1"
  contains_text "$AGENTS_FILE" "$rel"
}

skill_reference_is_routed() {
  local rel="$1"
  local skill_dir parent ref_rel
  skill_dir="${rel%%/references/*}"
  parent="$skill_dir/SKILL.md"
  ref_rel="${rel#"$skill_dir/"}"

  if [[ ! -f "$ROOT/$parent" ]]; then
    report_missing "skill reference has no parent SKILL.md: $rel"
    return
  fi
  if ! skill_is_routed "$parent"; then
    report_missing "skill reference parent is not routed from AGENTS.MD: $parent -> $rel"
  fi
  if ! contains_text "$ROOT/$parent" "$ref_rel" && ! contains_text "$ROOT/$parent" "$rel"; then
    report_missing "skill reference is not routed from its parent SKILL.md: $parent -> $rel"
  fi
}

mapfile -t markdown_files < <(find "$ROOT/docs" "$ROOT/skills" -type f -name '*.md' | sort)

for absolute in "${markdown_files[@]}"; do
  rel="${absolute#"$ROOT"/}"
  checked=$((checked + 1))

  case "$rel" in
    skills/*/references/*.md)
      skill_reference_is_routed "$rel"
      ;;
    skills/*/SKILL.md)
      if ! skill_is_routed "$rel"; then
        report_missing "repo-local skill is not routed from AGENTS.MD: $rel"
      fi
      ;;
    docs/*)
      if ! document_is_routed "$rel"; then
        report_missing "docs markdown is not reachable from AGENTS.MD or guides/DOCUMENT_MAP.md: $rel"
      fi
      ;;
    *)
      report_missing "unexpected markdown under document-root scope: $rel"
      ;;
  esac
done

if [[ $missing -ne 0 ]]; then
  printf '\nDocument root check failed.\n' >&2
  exit 1
fi

printf 'Document root check passed (%d markdown files checked).\n' "$checked"
