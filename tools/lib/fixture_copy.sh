#!/usr/bin/env bash

fixture_copy_default_excludes() {
  cat <<'EOF'
./.git
*/.git
./node_modules
*/node_modules
./playwright-report
*/playwright-report
./test-results
*/test-results
./.git/pre-commit-cache
*/.git/pre-commit-cache
./tmp/resource-guard
*/tmp/resource-guard
./.cache
*/.cache
./.pytest_cache
*/.pytest_cache
./coverage
*/coverage
./dist
*/dist
./build
*/build
EOF
}

fixture_copy_repo() {
  local source="$1"
  local target="$2"
  local exclude
  local source_real
  local target_real
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

  while IFS= read -r exclude; do
    [[ -n "$exclude" ]] || continue
    tar_excludes+=("--exclude=$exclude")
  done < <(fixture_copy_default_excludes)

  (
    cd "$source"
    tar "${tar_excludes[@]}" -cf - .
  ) | (
    cd "$target"
    tar -xf -
  )
}
