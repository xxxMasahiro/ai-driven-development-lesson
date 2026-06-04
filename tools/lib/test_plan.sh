#!/usr/bin/env bash

if [[ -z "${LESSON_ROOT:-}" ]]; then
  TEST_PLAN_LIB_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
  # shellcheck source=lesson_common.sh
  source "$TEST_PLAN_LIB_DIR/lesson_common.sh"
fi

test_plan_policy_file() {
  printf '%s\n' "${TEST_PLAN_POLICY_FILE:-$LESSON_ROOT/docs/workflow/TEST_PLAN_MANIFEST.tsv}"
}

test_plan_checks_file() {
  printf '%s\n' "${GIT_HOOKS_CHECKS_FILE:-$LESSON_ROOT/docs/workflow/GIT_HOOK_CHECKS.tsv}"
}

test_plan_now() {
  date '+%Y-%m-%d %H:%M:%S'
}

test_plan_trim() {
  local value="$1"
  value="${value#"${value%%[![:space:]]*}"}"
  value="${value%"${value##*[![:space:]]}"}"
  printf '%s' "$value"
}

test_plan_hash_stream() {
  sha256sum | awk '{ print $1 }'
}

test_plan_file_hash() {
  local file="$1"
  if [[ -f "$file" ]]; then
    sha256sum "$file" | awk '{ print $1 }'
  else
    printf 'missing'
  fi
}

test_plan_repo_state_hash() {
  local root="${1:-$LESSON_ROOT}"
  {
    git -C "$root" rev-parse HEAD 2>/dev/null || true
    git -C "$root" status --porcelain --untracked-files=all 2>/dev/null || true
    git -C "$root" diff --binary 2>/dev/null || true
    git -C "$root" diff --cached --binary 2>/dev/null || true
  } | test_plan_hash_stream
}

test_plan_changed_paths() {
  local root="${1:-$LESSON_ROOT}"
  {
    git -C "$root" diff --name-only --diff-filter=ACDMRTUXB 2>/dev/null || true
    git -C "$root" diff --cached --name-only --diff-filter=ACDMRTUXB 2>/dev/null || true
    git -C "$root" ls-files --others --exclude-standard 2>/dev/null || true
  } | sed '/^[[:space:]]*$/d' | sort -u
}

test_plan_normalize_path() {
  local path="$1"
  path="${path#./}"
  if [[ "$path" == "$LESSON_ROOT/"* ]]; then
    path="${path#"$LESSON_ROOT/"}"
  fi
  printf '%s\n' "$path"
}

test_plan_path_matches_pattern() {
  local pattern="$1"
  local path="$2"
  path="$(test_plan_normalize_path "$path")"
  if [[ "$pattern" == */ ]]; then
    [[ "$path" == "$pattern"* ]]
    return
  fi
  case "$path" in
    $pattern) return 0 ;;
  esac
  return 1
}

test_plan_policy_rows() {
  local policy_file
  policy_file="$(test_plan_policy_file)"
  awk -F '\t' '
    /^[[:space:]]*$/ { next }
    $1 ~ /^#/ { next }
    {
      if (NF != 8) {
        printf "invalid test plan policy row: %s\n", $0 > "/dev/stderr"
        invalid = 1
        next
      }
      print
    }
    END { exit invalid ? 1 : 0 }
  ' "$policy_file"
}

test_plan_collect_policy_rows() {
  local -n out_ref="$1"
  local tmp_file
  tmp_file="$(mktemp)"
  if ! test_plan_policy_rows >"$tmp_file"; then
    rm -f "$tmp_file"
    return 1
  fi
  mapfile -t out_ref <"$tmp_file"
  rm -f "$tmp_file"
}

test_plan_check_id_exists() {
  local check_id="$1"
  local checks_file
  checks_file="$(test_plan_checks_file)"
  awk -F '\t' -v check_id="$check_id" '
    /^[[:space:]]*$/ { next }
    $1 ~ /^#/ { next }
    $1 == check_id { found = 1; exit }
    END { exit found ? 0 : 1 }
  ' "$checks_file"
}

test_plan_required_patterns() {
  cat <<'PATTERNS'
AGENTS.MD
.github/workflows/
.githooks/
docs/workflow/AS_BUILT_SYNC_CONTRACT.tsv
docs/workflow/GIT_HOOK_CHECKS.tsv
docs/workflow/SAFEFLOW_SECURITY_BACKFILL.tsv
docs/workflow/PRODUCT_SECURITY_POLICY.tsv
package.json
package-lock.json
playwright.config.js
tests/playwright/
tools/git-hooks
tools/as-built-sync
PATTERNS
}

test_plan_policy_has_pattern() {
  local expected="$1"
  test_plan_policy_rows | awk -F '\t' -v expected="$expected" '$1 == expected { found = 1 } END { exit found ? 0 : 1 }'
}

test_plan_generate_tsv() {
  local paths=("$@")
  local path pattern risk checks force_full ci_required cache_scope quarantine_allowed reason
  local matched
  local check_id
  local policy_row
  local -a policy_rows=()

  test_plan_validate_policy || return 1
  test_plan_collect_policy_rows policy_rows || return 1

  if [[ "${#paths[@]}" -eq 0 ]]; then
    mapfile -t paths < <(test_plan_changed_paths)
  fi

  if [[ "${#paths[@]}" -eq 0 ]]; then
    printf 'run\tno-local-changes\tcheck_as_built_sync_contract\tfalse\ttrue\tnone\tNo local changes were detected; baseline sync status remains safe to inspect.\n'
    return 0
  fi

  for path in "${paths[@]}"; do
    [[ -n "$path" ]] || continue
    path="$(test_plan_normalize_path "$path")"
    matched=0
    for policy_row in "${policy_rows[@]}"; do
      IFS=$'\t' read -r pattern risk checks force_full ci_required cache_scope quarantine_allowed reason <<<"$policy_row"
      if test_plan_path_matches_pattern "$pattern" "$path"; then
        matched=1
        IFS='|' read -r -a check_items <<<"$checks"
        for check_id in "${check_items[@]}"; do
          check_id="$(test_plan_trim "$check_id")"
          [[ -n "$check_id" ]] || continue
          printf 'run\t%s\t%s\t%s\t%s\t%s\t%s\n' "$path" "$check_id" "$force_full" "$ci_required" "$cache_scope" "$reason"
        done
        if [[ "$force_full" == "true" ]]; then
          printf 'force\t%s\tfull-no-cache\ttrue\t%s\tnone\t%s\n' "$path" "$ci_required" "$reason"
        fi
      fi
    done
    if [[ "$matched" -eq 0 ]]; then
      printf 'force\t%s\tfull-no-cache\ttrue\ttrue\tnone\tUnknown path is classified as full/no-cache until policy coverage is added.\n' "$path"
      printf 'run\t%s\ttest_lesson_repository\ttrue\ttrue\tnone\tUnknown path requires aggregate verification.\n' "$path"
    fi
  done | awk -F '\t' -v OFS='\t' '
    function bool_or(left, right) {
      return (left == "true" || right == "true") ? "true" : "false"
    }
    function conservative_cache(left, right) {
      if (left == "") return right
      if (left == "none" || right == "none") return "none"
      if (left == "dependency" || right == "dependency") return "dependency"
      return "same-run"
    }
    NF == 7 {
      key = $1 SUBSEP $2 SUBSEP $3
      if (!(key in seen)) {
        seen[key] = 1
        order[++count] = key
        action[key] = $1
        path[key] = $2
        check[key] = $3
        force_full[key] = $4
        ci_required[key] = $5
        cache_scope[key] = $6
        reason[key] = $7
        next
      }
      force_full[key] = bool_or(force_full[key], $4)
      ci_required[key] = bool_or(ci_required[key], $5)
      cache_scope[key] = conservative_cache(cache_scope[key], $6)
      if (index(reason[key], $7) == 0) {
        reason[key] = reason[key] " | " $7
      }
    }
    END {
      for (i = 1; i <= count; i++) {
        key = order[i]
        print action[key], path[key], check[key], force_full[key], ci_required[key], cache_scope[key], reason[key]
      }
    }
  '
}

test_plan_manifest() {
  local paths=("$@")
  local action path check force_full ci_required cache_scope reason
  test_plan_validate_policy || return 1
  printf 'Test Plan Manifest\n'
  printf 'Mode: observe-only\n'
  printf 'Policy file: %s\n' "$(test_plan_policy_file)"
  printf 'Policy hash: %s\n' "$(test_plan_file_hash "$(test_plan_policy_file)")"
  printf 'Repository state hash: %s\n' "$(test_plan_repo_state_hash)"
  printf 'Generated at: %s\n' "$(test_plan_now)"
  printf 'Decisions:\n'
  while IFS=$'\t' read -r action path check force_full ci_required cache_scope reason; do
    [[ -n "${action:-}" ]] || continue
    case "$action" in
      run)
        printf 'run: %s (path: %s; full: %s; ci: %s; cache: %s)\n' "$check" "$path" "$force_full" "$ci_required" "$cache_scope"
        ;;
      force)
        printf 'force: %s for %s (ci: %s)\n' "$check" "$path" "$ci_required"
        ;;
      *)
        printf '%s: %s for %s\n' "$action" "$check" "$path"
        ;;
    esac
    printf 'reason: %s\n' "$reason"
  done < <(test_plan_generate_tsv "${paths[@]}")
  printf 'Decision: observe-only; existing full/no-cache, CI, pre-commit, Playwright, security, product-security, and as-built gates remain authoritative.\n'
}

test_plan_validate_policy() {
  local missing=0
  local policy_file checks_file
  local pattern risk checks force_full ci_required cache_scope quarantine_allowed reason
  local check_id required_pattern
  local policy_row found_required
  local -a policy_rows=()
  policy_file="$(test_plan_policy_file)"
  checks_file="$(test_plan_checks_file)"

  if [[ ! -f "$policy_file" ]]; then
    printf 'missing test plan policy: %s\n' "$policy_file" >&2
    return 1
  fi
  if [[ ! -f "$checks_file" ]]; then
    printf 'missing Git hook checks file: %s\n' "$checks_file" >&2
    return 1
  fi

  test_plan_collect_policy_rows policy_rows || return 1

  for policy_row in "${policy_rows[@]}"; do
    IFS=$'\t' read -r pattern risk checks force_full ci_required cache_scope quarantine_allowed reason <<<"$policy_row"
    if [[ -z "$pattern" || -z "$risk" || -z "$checks" || -z "$force_full" || -z "$ci_required" || -z "$cache_scope" || -z "$quarantine_allowed" || -z "$reason" ]]; then
      printf 'invalid empty test plan policy field for pattern: %s\n' "$pattern" >&2
      missing=1
      continue
    fi
    case "$risk" in critical|high|medium|low) ;; *) printf 'invalid risk_class for %s: %s\n' "$pattern" "$risk" >&2; missing=1 ;; esac
    case "$force_full" in true|false) ;; *) printf 'invalid force_full for %s: %s\n' "$pattern" "$force_full" >&2; missing=1 ;; esac
    case "$ci_required" in true|false) ;; *) printf 'invalid ci_required for %s: %s\n' "$pattern" "$ci_required" >&2; missing=1 ;; esac
    case "$cache_scope" in none|same-run|dependency) ;; *) printf 'invalid cache_scope for %s: %s\n' "$pattern" "$cache_scope" >&2; missing=1 ;; esac
    case "$quarantine_allowed" in true|false) ;; *) printf 'invalid quarantine_allowed for %s: %s\n' "$pattern" "$quarantine_allowed" >&2; missing=1 ;; esac
    IFS='|' read -r -a check_items <<<"$checks"
    for check_id in "${check_items[@]}"; do
      check_id="$(test_plan_trim "$check_id")"
      if [[ -z "$check_id" ]]; then
        printf 'empty check id in test plan policy row: %s\n' "$pattern" >&2
        missing=1
      elif ! test_plan_check_id_exists "$check_id"; then
        printf 'unknown check id in test plan policy row %s: %s\n' "$pattern" "$check_id" >&2
        missing=1
      fi
    done
  done

  while IFS= read -r required_pattern; do
    found_required=0
    for policy_row in "${policy_rows[@]}"; do
      IFS=$'\t' read -r pattern _risk _checks _force_full _ci_required _cache_scope _quarantine_allowed _reason <<<"$policy_row"
      if [[ "$pattern" == "$required_pattern" ]]; then
        found_required=1
        if [[ "$_force_full" != "true" ]]; then
          printf 'required dangerous-change pattern must force full verification: %s\n' "$required_pattern" >&2
          missing=1
        fi
        if [[ "$_ci_required" != "true" ]]; then
          printf 'required dangerous-change pattern must require CI verification: %s\n' "$required_pattern" >&2
          missing=1
        fi
        break
      fi
    done
    if [[ "$found_required" -eq 0 ]]; then
      printf 'missing required dangerous-change pattern in test plan policy: %s\n' "$required_pattern" >&2
      missing=1
    fi
  done < <(test_plan_required_patterns)

  [[ "$missing" -eq 0 ]]
}

test_plan_coverage() {
  local paths=("$@")
  local missing=0
  local action path check force_full ci_required cache_scope reason
  test_plan_validate_policy || return 1

  while IFS=$'\t' read -r action path check force_full ci_required cache_scope reason; do
    [[ -n "${action:-}" ]] || continue
    if [[ "$action" == "run" && "$check" != "no-local-changes" ]] && ! test_plan_check_id_exists "$check"; then
      printf 'manifest references unknown check id: %s\n' "$check" >&2
      missing=1
    fi
    if [[ "$action" == "force" && "$force_full" != "true" ]]; then
      printf 'force decision without full escalation for path: %s\n' "$path" >&2
      missing=1
    fi
  done < <(test_plan_generate_tsv "${paths[@]}")

  [[ "$missing" -eq 0 ]]
}

test_plan_attestation() {
  local paths=("$@")
  local manifest_hash
  test_plan_validate_policy || return 1
  manifest_hash="$(test_plan_generate_tsv "${paths[@]}" | test_plan_hash_stream)"
  printf 'Result Attestation\n'
  printf 'Format: test-plan-attestation-v1\n'
  printf 'Generated at: %s\n' "$(test_plan_now)"
  printf 'Policy file: %s\n' "$(test_plan_policy_file)"
  printf 'Policy hash: %s\n' "$(test_plan_file_hash "$(test_plan_policy_file)")"
  printf 'Checks file: %s\n' "$(test_plan_checks_file)"
  printf 'Checks hash: %s\n' "$(test_plan_file_hash "$(test_plan_checks_file)")"
  printf 'Repository state hash: %s\n' "$(test_plan_repo_state_hash)"
  printf 'Manifest hash: %s\n' "$manifest_hash"
  printf 'Decision authority: observe-only; full/no-cache and CI remain authoritative.\n'
  printf 'Decisions:\n'
  test_plan_generate_tsv "${paths[@]}"
}
