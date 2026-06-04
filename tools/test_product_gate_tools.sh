#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT

project_root="$tmp/projects"
product_name="sample-product"
product_repo="$project_root/$product_name"
origin="$tmp/origin.git"
config="$tmp/LESSON_CONFIG.tsv"
fake_bin="$tmp/bin"

mkdir -p "$project_root" "$fake_bin"

cat > "$config" <<CONFIG
# key	value
lesson_repo_name	ai-driven-development-lesson
product_repo_name	$product_name
project_root	$project_root
flow_file	lesson/LESSON_FLOW.tsv
state_file	learning/LESSON_STATE.tsv
learning_tracker_file	learning/LEARNING_TASK_TRACKER.md
learning_handoff_file	learning/LEARNING_HANDOFF.md
learning_mode_file	$tmp/LESSON_MODE.tsv
workflow_language_file	$tmp/WORKFLOW_DISPLAY_LANGUAGE.tsv
product_language_file	$tmp/PRODUCT_DEVELOPMENT_LANGUAGE.tsv
CONFIG

cat > "$tmp/LESSON_MODE.tsv" <<'DOC'
# selected_at	mode	description
2026-06-02 00:00:00	A	じっくり説明
DOC
cat > "$tmp/WORKFLOW_DISPLAY_LANGUAGE.tsv" <<'DOC'
# selected_at	code	label
2026-06-02 00:00:00	ja	日本語
DOC
cat > "$tmp/PRODUCT_DEVELOPMENT_LANGUAGE.tsv" <<'DOC'
# selected_at	code	label
2026-06-02 00:00:00	ja	日本語
DOC

git -c init.defaultBranch=main init --bare "$origin" >/dev/null
git -c init.defaultBranch=main init "$product_repo" >/dev/null
git -C "$product_repo" config user.name "Lesson Test"
git -C "$product_repo" config user.email "lesson-test@example.com"
printf '# Sample Product\n' > "$product_repo/README.md"
cat > "$product_repo/REQUIREMENTS.md" <<'DOC'
# REQUIREMENTS.md

## Purpose

Provide a sample product for gate testing.
DOC
cat > "$product_repo/SPECIFICATION.md" <<'DOC'
# SPECIFICATION.md

## Behavior

The sample product supports gate testing.
DOC
cat > "$product_repo/IMPLEMENTATION_PLAN.md" <<'DOC'
# IMPLEMENTATION_PLAN.md

## Plan

Use the sample product to verify lesson gates.
DOC
cat > "$product_repo/TASK_TRACKER.md" <<'DOC'
# TASK_TRACKER.md

## Current Status

Sample product is ready for gate testing.

## Remaining Work

- Continue the sample workflow.
DOC
cat > "$product_repo/HANDOFF.md" <<'DOC'
# HANDOFF.md

## Current State

Sample product is ready for gate testing.

## Next Step

- Continue the sample workflow.
DOC
cat > "$product_repo/EXTERNAL_INTEGRATION_SECURITY.md" <<'DOC'
# EXTERNAL_INTEGRATION_SECURITY.md

- Connected service: test calendar
- Data sent: task title only
- Data received: event identifier
- Write behavior: create test event only
- OAuth scopes: calendar.events
- Token storage: local environment variable
- Redirect URI: local test redirect
- Token refresh: documented
- Token revoke: documented
- Webhook signature: not used
- Rate limits: documented
- Sandbox: test account
- Prohibited log output: tokens and private event details
- Rollback: disable integration and revoke token
DOC
git -C "$product_repo" add README.md REQUIREMENTS.md SPECIFICATION.md IMPLEMENTATION_PLAN.md
git -C "$product_repo" add TASK_TRACKER.md HANDOFF.md EXTERNAL_INTEGRATION_SECURITY.md
git -C "$product_repo" commit -m "Initial sample product" >/dev/null
git -C "$product_repo" remote add origin "$origin"
git -C "$product_repo" push -u origin main >/dev/null

cat > "$fake_bin/gh" <<'GH'
#!/usr/bin/env bash
set -euo pipefail

case "${1:-}" in
  auth)
    if [[ "${2:-}" == "token" ]]; then
      printf 'fake-token\n'
      exit 0
    fi
    ;;
  api)
    printf 'completed\tsuccess\tCI\tCI\tmain\t1\t0\t1s\t2026-06-02T00:00:00Z\n'
    exit 0
    ;;
  run)
    if [[ "${2:-}" == "list" ]]; then
      printf 'completed\tsuccess\tCI\tCI\tmain\t1\t0\t1s\t2026-06-02T00:00:00Z\n'
      exit 0
    fi
    ;;
  repo)
    if [[ "${2:-}" == "view" ]]; then
      printf 'xxxMasahiro/sample-product\n'
      exit 0
    fi
    ;;
esac

printf 'unsupported fake gh command: %s\n' "$*" >&2
exit 1
GH
chmod +x "$fake_bin/gh"

PATH="$fake_bin:$PATH" LESSON_CONFIG="$config" "$ROOT/tools/free-development" gate
PATH="$fake_bin:$PATH" LESSON_CONFIG="$config" "$ROOT/tools/team-development" gate
PATH="$fake_bin:$PATH" LESSON_CONFIG="$config" "$ROOT/tools/product-improvement" gate
PATH="$fake_bin:$PATH" LESSON_CONFIG="$config" "$ROOT/tools/external-integration" gate
mv "$product_repo/SPECIFICATION.md" "$product_repo/SPECIFICATION.md.off"
PATH="$fake_bin:$PATH" LESSON_CONFIG="$config" "$ROOT/tools/external-integration" gate >/tmp/external-integration-missing-scope.out 2>&1 && exit 1 || true
grep 'missing external-integration scope document' /tmp/external-integration-missing-scope.out >/dev/null
PATH="$fake_bin:$PATH" LESSON_CONFIG="$config" "$ROOT/tools/product-improvement" gate >/tmp/product-improvement-missing-scope.out 2>&1 && exit 1 || true
grep 'missing product-improvement scope document' /tmp/product-improvement-missing-scope.out >/dev/null
mv "$product_repo/SPECIFICATION.md.off" "$product_repo/SPECIFICATION.md"
LESSON_CONFIG="$config" "$ROOT/tools/free-development" status | grep 'Free Development Mode'
LESSON_CONFIG="$config" "$ROOT/tools/free-development" start --confirm | grep 'Free Development Mode start prompt'
LESSON_CONFIG="$config" "$ROOT/tools/team-development" status | grep 'Team Development and Docker'
LESSON_CONFIG="$config" "$ROOT/tools/team-development" start --confirm | grep 'Team Development and Docker start prompt'
LESSON_CONFIG="$config" "$ROOT/tools/product-improvement" status | grep 'Product Improvement'
LESSON_CONFIG="$config" "$ROOT/tools/product-improvement" start --confirm | grep 'Product Improvement start prompt'
LESSON_CONFIG="$config" "$ROOT/tools/external-integration" status | grep 'External Integration'
LESSON_CONFIG="$config" "$ROOT/tools/external-integration" start --confirm | grep 'External Integration start prompt'

empty_config="$tmp/EMPTY_SETTINGS_CONFIG.tsv"
cat > "$empty_config" <<CONFIG
# key	value
lesson_repo_name	ai-driven-development-lesson
product_repo_name	$product_name
project_root	$project_root
flow_file	lesson/LESSON_FLOW.tsv
state_file	learning/LESSON_STATE.tsv
learning_tracker_file	learning/LEARNING_TASK_TRACKER.md
learning_handoff_file	learning/LEARNING_HANDOFF.md
learning_mode_file	$tmp/EMPTY_LESSON_MODE.tsv
workflow_language_file	$tmp/EMPTY_WORKFLOW_DISPLAY_LANGUAGE.tsv
product_language_file	$tmp/EMPTY_PRODUCT_DEVELOPMENT_LANGUAGE.tsv
CONFIG
printf '# selected_at\tmode\tdescription\n' > "$tmp/EMPTY_LESSON_MODE.tsv"
printf '# selected_at\tcode\tlabel\n' > "$tmp/EMPTY_WORKFLOW_DISPLAY_LANGUAGE.tsv"
printf '# selected_at\tcode\tlabel\n' > "$tmp/EMPTY_PRODUCT_DEVELOPMENT_LANGUAGE.tsv"
LESSON_MENU_SETTINGS_STRICT_CONFIG=1 LESSON_CONFIG="$empty_config" "$ROOT/tools/free-development" gate >/tmp/free-development-missing-prerequisite.out 2>&1 && exit 1 || true
grep 'missing menu prerequisite' /tmp/free-development-missing-prerequisite.out >/dev/null
LESSON_MENU_SETTINGS_STRICT_CONFIG=1 LESSON_CONFIG="$empty_config" "$ROOT/tools/product-improvement" start --confirm >/tmp/product-improvement-missing-prerequisite.out 2>&1 && exit 1 || true
grep 'missing menu prerequisite' /tmp/product-improvement-missing-prerequisite.out >/dev/null

missing_config="$tmp/MISSING_CONFIG.tsv"
cat > "$missing_config" <<CONFIG
# key	value
lesson_repo_name	ai-driven-development-lesson
product_repo_name	missing-product
project_root	$project_root
flow_file	lesson/LESSON_FLOW.tsv
state_file	learning/LESSON_STATE.tsv
learning_tracker_file	learning/LEARNING_TASK_TRACKER.md
learning_handoff_file	learning/LEARNING_HANDOFF.md
learning_mode_file	$tmp/LESSON_MODE.tsv
workflow_language_file	$tmp/WORKFLOW_DISPLAY_LANGUAGE.tsv
product_language_file	$tmp/PRODUCT_DEVELOPMENT_LANGUAGE.tsv
CONFIG
LESSON_CONFIG="$missing_config" "$ROOT/tools/free-development" gate >/tmp/free-development-missing.out 2>&1 && exit 1 || true
grep 'expected product repository does not exist' /tmp/free-development-missing.out >/dev/null

printf 'dirty\n' >> "$product_repo/README.md"
PATH="$fake_bin:$PATH" LESSON_CONFIG="$config" "$ROOT/tools/free-development" gate >/tmp/free-development-dirty.out 2>&1 && exit 1 || true
grep 'Working tree: dirty' /tmp/free-development-dirty.out >/dev/null
git -C "$product_repo" add README.md
git -C "$product_repo" commit -m "Record dirty-state test cleanup" >/dev/null
git -C "$product_repo" push >/dev/null

cat > "$fake_bin/gh" <<'GH'
#!/usr/bin/env bash
set -euo pipefail

case "${1:-}" in
  auth)
    if [[ "${2:-}" == "token" ]]; then
      printf 'fake-token\n'
      exit 0
    fi
    ;;
  api)
    printf 'completed\tfailure\tCI\tCI\tmain\t1\t0\t1s\t2026-06-02T00:00:00Z\n'
    exit 0
    ;;
  run)
    if [[ "${2:-}" == "list" ]]; then
      printf 'completed\tfailure\tCI\tCI\tmain\t1\t0\t1s\t2026-06-02T00:00:00Z\n'
      exit 0
    fi
    ;;
  repo)
    if [[ "${2:-}" == "view" ]]; then
      printf 'xxxMasahiro/sample-product\n'
      exit 0
    fi
    ;;
esac

printf 'unsupported fake gh command: %s\n' "$*" >&2
exit 1
GH
chmod +x "$fake_bin/gh"
PATH="$fake_bin:$PATH" LESSON_CONFIG="$config" "$ROOT/tools/free-development" gate >/tmp/free-development-ci-fail.out 2>&1 && exit 1 || true
grep 'CI status: latest run is not successful' /tmp/free-development-ci-fail.out >/dev/null

printf 'Product gate tool tests passed.\n'
