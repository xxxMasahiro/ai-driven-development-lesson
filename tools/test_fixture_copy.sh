#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT

source_dir="$tmp/source"
target_dir="$tmp/target"
mkdir -p \
  "$source_dir/.git/pre-commit-cache" \
  "$source_dir/node_modules/pkg" \
  "$source_dir/playwright-report" \
	  "$source_dir/test-results" \
	  "$source_dir/tmp/resource-guard" \
	  "$source_dir/docs" \
	  "$source_dir/packages/app/node_modules/pkg" \
	  "$source_dir/packages/app/playwright-report" \
	  "$source_dir/packages/app/test-results"
printf 'keep\n' >"$source_dir/docs/keep.md"
printf 'git\n' >"$source_dir/.git/config"
printf 'cache\n' >"$source_dir/.git/pre-commit-cache/check.cache"
printf 'node\n' >"$source_dir/node_modules/pkg/index.js"
printf 'report\n' >"$source_dir/playwright-report/index.html"
printf 'result\n' >"$source_dir/test-results/result.txt"
printf 'resource\n' >"$source_dir/tmp/resource-guard/state"
printf 'nested-node\n' >"$source_dir/packages/app/node_modules/pkg/index.js"
printf 'nested-report\n' >"$source_dir/packages/app/playwright-report/index.html"
printf 'nested-result\n' >"$source_dir/packages/app/test-results/result.txt"

"$ROOT/tools/fixture-copy" "$source_dir" "$target_dir" >/dev/null

[[ -f "$target_dir/docs/keep.md" ]]
[[ ! -e "$target_dir/.git" ]]
[[ ! -e "$target_dir/node_modules" ]]
[[ ! -e "$target_dir/playwright-report" ]]
[[ ! -e "$target_dir/test-results" ]]
[[ ! -e "$target_dir/tmp/resource-guard" ]]
[[ ! -e "$target_dir/packages/app/node_modules" ]]
[[ ! -e "$target_dir/packages/app/playwright-report" ]]
[[ ! -e "$target_dir/packages/app/test-results" ]]

non_empty_target="$tmp/non-empty"
mkdir -p "$non_empty_target"
printf 'existing\n' >"$non_empty_target/file.txt"
if "$ROOT/tools/fixture-copy" "$source_dir" "$non_empty_target" >"$tmp/fixture-copy-non-empty.out" 2>&1; then
  printf 'fixture copy allowed a non-empty target unexpectedly\n' >&2
  exit 1
fi
grep 'Fixture copy target must be empty' "$tmp/fixture-copy-non-empty.out" >/dev/null

if "$ROOT/tools/fixture-copy" "$tmp/missing" "$tmp/missing-target" >"$tmp/fixture-copy-missing.out" 2>&1; then
  printf 'fixture copy allowed a missing source unexpectedly\n' >&2
  exit 1
fi
grep 'Fixture copy source is not a directory' "$tmp/fixture-copy-missing.out" >/dev/null

ln -s "$tmp/outside-target" "$tmp/symlink-target"
if "$ROOT/tools/fixture-copy" "$source_dir" "$tmp/symlink-target" >"$tmp/fixture-copy-symlink.out" 2>&1; then
  printf 'fixture copy allowed a symlink target unexpectedly\n' >&2
  exit 1
fi
grep 'Fixture copy target must not be a symlink' "$tmp/fixture-copy-symlink.out" >/dev/null

if "$ROOT/tools/fixture-copy" "$source_dir" "$source_dir/nested-copy" >"$tmp/fixture-copy-inside-source.out" 2>&1; then
  printf 'fixture copy allowed a target inside the source tree unexpectedly\n' >&2
  exit 1
fi
grep 'Fixture copy target must not be inside the source tree' "$tmp/fixture-copy-inside-source.out" >/dev/null
[[ ! -e "$source_dir/nested-copy" ]]

if "$ROOT/tools/fixture-copy" "$source_dir" "$source_dir/new-parent/nested-copy" >"$tmp/fixture-copy-inside-missing-parent.out" 2>&1; then
  printf 'fixture copy allowed a target inside the source tree with a missing parent unexpectedly\n' >&2
  exit 1
fi
grep 'Fixture copy target must not be inside the source tree' "$tmp/fixture-copy-inside-missing-parent.out" >/dev/null
[[ ! -e "$source_dir/new-parent" ]]

printf 'Fixture copy tests passed.\n'
