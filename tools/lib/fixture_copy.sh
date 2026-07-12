#!/usr/bin/env bash

FIXTURE_COPY_LIB_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

fixture_copy_policy_file() {
  printf '%s\n' "${FIXTURE_COPY_POLICY_FILE:-$FIXTURE_COPY_LIB_DIR/../../docs/workflow/FINAL_GATE_EXECUTION_POLICY.tsv}"
}

fixture_copy_default_excludes() {
  local policy_file raw
  policy_file="$(fixture_copy_policy_file)"
  if [[ ! -f "$policy_file" || -L "$policy_file" ]]; then
    printf 'Fixture copy policy is missing or unsafe: %s\n' "$policy_file" >&2
    return 1
  fi
  raw="$(awk -F '\t' '$1 == "input_profile" && $2 == "fixture_excludes" { print $3; found = 1; exit } END { if (!found) exit 1 }' "$policy_file")" || {
    printf 'Fixture copy exclusion profile is missing: %s\n' "$policy_file" >&2
    return 1
  }
  node -e '
    let values;
    try { values = JSON.parse(process.argv[1]); } catch { process.exit(2); }
    if (!Array.isArray(values) || values.length === 0 || values.some((value) => typeof value !== "string" || !value || value.includes("\0") || value.includes("\n"))) process.exit(2);
    for (const value of values) process.stdout.write(`${value}\n`);
  ' "$raw" || {
    printf 'Fixture copy exclusion profile is invalid: %s\n' "$policy_file" >&2
    return 1
  }
}

fixture_copy_repo() {
  local source="$1"
  local target="$2"
  local exclude
  local source_real
  local target_real
  local excludes_text
  local -a tar_excludes=()

  if [[ ! -d "$source" ]]; then
    printf 'Fixture copy source is not a directory: %s\n' "$source" >&2
    return 1
  fi
  if [[ -L "$source" ]]; then
    printf 'Fixture copy source must not be a symlink: %s\n' "$source" >&2
    return 1
  fi
  source_real="$(readlink -f "$source")" || {
    printf 'Fixture copy source cannot be resolved: %s\n' "$source" >&2
    return 1
  }
  target_real="$(readlink -m "$target")" || {
    printf 'Fixture copy target cannot be resolved: %s\n' "$target" >&2
    return 1
  }
  if [[ -L "$target" ]]; then
    printf 'Fixture copy target must not be a symlink: %s\n' "$target" >&2
    return 1
  fi
  if [[ "$target_real" == "$source_real" || "$target_real/" == "$source_real/"* ]]; then
    printf 'Fixture copy target must not be inside the source tree: %s\n' "$target" >&2
    return 1
  fi
  if [[ -e "$target" ]]; then
    if [[ ! -d "$target" ]]; then
      printf 'Fixture copy target exists and is not a directory: %s\n' "$target" >&2
      return 1
    fi
    if find "$target" -mindepth 1 -maxdepth 1 | grep -q .; then
      printf 'Fixture copy target must be empty: %s\n' "$target" >&2
      return 1
    fi
  else
    mkdir -p "$target"
  fi

  excludes_text="$(fixture_copy_default_excludes)" || return 1
  while IFS= read -r exclude; do
    [[ -n "$exclude" ]] || continue
    tar_excludes+=("--exclude=$exclude")
  done <<<"$excludes_text"

  (
    cd "$source"
    tar "${tar_excludes[@]}" -cf - .
  ) | (
    cd "$target"
    tar -xf -
  )
}
