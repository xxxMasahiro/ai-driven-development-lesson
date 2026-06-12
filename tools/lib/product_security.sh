#!/usr/bin/env bash

if [[ -z "${LESSON_ROOT:-}" ]]; then
  PRODUCT_SECURITY_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
  # shellcheck source=lesson_common.sh
  source "$PRODUCT_SECURITY_DIR/lesson_common.sh"
fi

product_security_policy_file() {
  printf '%s\n' "${PRODUCT_SECURITY_POLICY_FILE:-$LESSON_ROOT/docs/workflow/PRODUCT_SECURITY_POLICY.tsv}"
}

product_security_context_map_file() {
  printf '%s\n' "${PRODUCT_SECURITY_CONTEXT_MAP_FILE:-$LESSON_ROOT/learning/context/WORKFLOW_CONTEXT_MAP.tsv}"
}

product_security_policy_rows() {
  local policy_file
  policy_file="$(product_security_policy_file)"
  awk -F '\t' '
    /^[[:space:]]*$/ { next }
    $1 ~ /^#/ { next }
    {
      if (NF != 6) {
        printf "invalid product security policy row: %s\n", $0 > "/dev/stderr"
        invalid = 1
        next
      }
      print
    }
    END { exit invalid ? 1 : 0 }
  ' "$policy_file"
}

product_security_context_rows() {
  local map_file
  map_file="$(product_security_context_map_file)"
  awk -F '\t' '
    /^[[:space:]]*$/ { next }
    $1 ~ /^#/ { next }
    {
      if (NF != 6) {
        printf "invalid workflow context map row: %s\n", $0 > "/dev/stderr"
        invalid = 1
        next
      }
      print
    }
    END { exit invalid ? 1 : 0 }
  ' "$map_file"
}

product_security_validate_policy() {
  local policy_file map_file context
  local missing=0
  policy_file="$(product_security_policy_file)"
  map_file="$(product_security_context_map_file)"

  [[ -f "$policy_file" ]] || { printf 'missing product security policy: %s\n' "$policy_file" >&2; return 1; }
  [[ -f "$map_file" ]] || { printf 'missing workflow context map: %s\n' "$map_file" >&2; return 1; }

  product_security_policy_rows >/dev/null || missing=1
  product_security_context_rows >/dev/null || missing=1

  for context in free-development product-improvement external-integration lesson-maintenance; do
    if ! product_security_context_rows | awk -F '\t' -v context="$context" '$1 == context { found = 1 } END { exit found ? 0 : 1 }'; then
      printf 'missing workflow security context: %s\n' "$context" >&2
      missing=1
    fi
  done

  for check_id in repository_boundary secret_exposure external_integration_approval git_ci_sync_awareness warning_block_separation safe_output_metadata; do
    if ! product_security_policy_rows | awk -F '\t' -v check_id="$check_id" '$1 == check_id { found = 1 } END { exit found ? 0 : 1 }'; then
      printf 'missing product security policy check: %s\n' "$check_id" >&2
      missing=1
    fi
  done

  [[ "$missing" -eq 0 ]]
}

product_security_context_exists() {
  local context="$1"
  product_security_context_rows | awk -F '\t' -v context="$context" '$1 == context { found = 1 } END { exit found ? 0 : 1 }'
}

product_security_context_field() {
  local context="$1"
  local field="$2"
  local field_index
  case "$field" in
    menu_item) field_index=2 ;;
    workflow_kind) field_index=3 ;;
    product_repo_required) field_index=4 ;;
    external_approval_required) field_index=5 ;;
    safety_summary) field_index=6 ;;
    *) printf 'unknown product security context field: %s\n' "$field" >&2; return 1 ;;
  esac
  product_security_context_rows | awk -F '\t' -v context="$context" -v field_index="$field_index" '$1 == context { print $field_index; found = 1; exit } END { exit found ? 0 : 1 }'
}

product_security_resolve_repo() {
  local repo="${1:-}"
  if [[ -n "$repo" ]]; then
    printf '%s\n' "$repo"
  else
    lesson_product_repo_root
  fi
}

product_security_repo_inside_lesson() {
  local repo="$1"
  local repo_abs lesson_abs
  repo_abs="$(cd "$repo" 2>/dev/null && pwd -P)" || return 1
  lesson_abs="$(cd "$LESSON_ROOT" && pwd -P)"
  case "$repo_abs" in
    "$lesson_abs"|"$lesson_abs"/*) return 0 ;;
  esac
  return 1
}

product_security_check_repository() {
  local repo="$1"
  local git_required="${2:-true}"
  if [[ ! -d "$repo" ]]; then
    printf 'product-security block: product repository does not exist: %s\n' "$repo" >&2
    return 1
  fi
  if product_security_repo_inside_lesson "$repo"; then
    printf 'product-security block: refusing to inspect a product repository inside the lesson repository: %s\n' "$repo" >&2
    return 1
  fi
  if [[ "$git_required" == "true" && ! -d "$repo/.git" ]]; then
    printf 'product-security block: product repository is not a Git repository: %s\n' "$repo" >&2
    return 1
  fi
}

product_security_secret_patterns() {
  cat <<'PATTERNS'
(SECRET|TOKEN|API_KEY|PASSWORD|PRIVATE_KEY)[[:space:]]*[:=][[:space:]]*[^[:space:]#]{8,}
gh[pousr]_[A-Za-z0-9_]{20,}
sk-[A-Za-z0-9]{20,}
AKIA[0-9A-Z]{16}
BEGIN (RSA |OPENSSH |EC |DSA )?PRIVATE KEY
PATTERNS
}

product_security_scan_secret_like_data() {
  local repo="$1"
  local found=0
  local file pattern rel
  while IFS= read -r -d '' file; do
    rel="${file#$repo/}"
    case "$rel" in
      .git/*|node_modules/*|.venv/*|venv/*|dist/*|build/*|coverage/*|playwright-report/*|test-results/*)
        continue
        ;;
    esac
    grep -Iq . "$file" 2>/dev/null || continue
    while IFS= read -r pattern; do
      [[ -n "$pattern" ]] || continue
      if grep -Eq "$pattern" "$file"; then
        printf 'product-security block: secret-like data in %s\n' "$rel" >&2
        found=1
        break
      fi
    done < <(product_security_secret_patterns)
  done < <(find "$repo" -type f -print0)

  [[ "$found" -eq 0 ]]
}

product_security_warn_env_files() {
  local repo="$1"
  local warned=0
  local file rel
  while IFS= read -r -d '' file; do
    rel="${file#$repo/}"
    case "$rel" in
      .git/*|node_modules/*)
        continue
        ;;
    esac
    printf 'product-security warning: environment file should be ignored or documented: %s\n' "$rel"
    warned=1
  done < <(find "$repo" -type f \( -name '.env' -o -name '.env.*' \) -print0)
  return "$warned"
}

product_security_external_approval_file() {
  local repo="$1"
  printf '%s/EXTERNAL_INTEGRATION_SECURITY.md\n' "$repo"
}

product_security_check_external_approval() {
  local repo="$1"
  local file
  local missing=0
  file="$(product_security_external_approval_file "$repo")"
  if [[ ! -f "$file" ]]; then
    printf 'product-security block: missing external integration security approval document: %s\n' "${file#$repo/}" >&2
    return 1
  fi
  for pattern in \
    'Connected service' \
    'Data sent' \
    'Data received' \
    'Write behavior' \
    'OAuth scopes' \
    'Token storage' \
    'Redirect URI' \
    'Token refresh' \
    'Webhook signature' \
    'Rate limits' \
    'Sandbox' \
    'Prohibited log output' \
    'Rollback'; do
    if ! grep -Fq "$pattern" "$file"; then
      printf 'product-security block: external integration approval is missing field: %s\n' "$pattern" >&2
      missing=1
    fi
  done
  [[ "$missing" -eq 0 ]]
}

product_security_print_safety_summary() {
  local context="$1"
  local summary
  summary="$(product_security_context_field "$context" safety_summary)"
  printf 'Product security context: %s\n' "$context"
  printf 'Safety summary: %s\n' "$summary"
  printf 'Next safe action: review product documents, repository boundary, secrets, external permissions, Git sync, and CI before implementation.\n'
  printf 'Do not touch: unrelated repositories, secret values, OS/WSL/Docker settings, live external data, or destructive cleanup without explicit approval.\n'
  printf 'Approval needed: external service connection, OAuth/API permissions, token storage, webhook behavior, remote deletion, credential rotation, or network-dependent audit.\n'
}

product_security_check_context() {
  local context="$1"
  local repo="$2"
  local git_required="${3:-true}"
  local failed=0

  product_security_validate_policy || failed=1
  product_security_context_exists "$context" || {
    printf 'unknown product security context: %s\n' "$context" >&2
    return 1
  }

  product_security_check_repository "$repo" "$git_required" || failed=1
  if [[ "$failed" -eq 0 ]]; then
    product_security_scan_secret_like_data "$repo" || failed=1
    product_security_warn_env_files "$repo" >/dev/null || true
    if [[ "$(product_security_context_field "$context" external_approval_required)" == "true" ]]; then
      product_security_check_external_approval "$repo" || failed=1
    fi
  fi

  [[ "$failed" -eq 0 ]]
}
