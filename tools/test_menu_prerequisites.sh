#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
work="$(mktemp -d)"
trap 'rm -rf "$work"' EXIT

cp -a "$ROOT" "$work/lesson"
cd "$work/lesson"

project_root="$work/projects"
product_name="menu-product"
product_repo="$project_root/$product_name"
mkdir -p "$project_root"

cat > lesson/LESSON_CONFIG.tsv <<CONFIG
# key	value
lesson_repo_name	ai-driven-development-lesson
product_repo_name	$product_name
project_root	$project_root
flow_file	lesson/LESSON_FLOW.tsv
state_file	learning/LESSON_STATE.tsv
learning_tracker_file	learning/LEARNING_TASK_TRACKER.md
learning_handoff_file	learning/LEARNING_HANDOFF.md
learning_mode_file	learning/LESSON_MODE.tsv
workflow_language_file	learning/WORKFLOW_DISPLAY_LANGUAGE.tsv
product_language_file	learning/PRODUCT_DEVELOPMENT_LANGUAGE.tsv
CONFIG

cat > lesson/LESSON_CONFIG_14_DAYS.tsv <<CONFIG
# key	value
lesson_repo_name	ai-driven-development-lesson
product_repo_name	$product_name
project_root	$project_root
flow_file	lesson/LESSON_FLOW_14_DAYS.tsv
state_file	learning/LESSON_STATE_14_DAYS.tsv
learning_tracker_file	learning/LEARNING_TASK_TRACKER_14_DAYS.md
learning_handoff_file	learning/LEARNING_HANDOFF_14_DAYS.md
approval_file	learning/LESSON_APPROVALS_14_DAYS.tsv
learning_mode_file	learning/LESSON_MODE_14_DAYS.tsv
workflow_language_file	learning/WORKFLOW_DISPLAY_LANGUAGE_14_DAYS.tsv
product_language_file	learning/PRODUCT_DEVELOPMENT_LANGUAGE_14_DAYS.tsv
roadmap_file	learning/ROADMAP.md
helpdesk_file	learning/HELP_DESK.md
sync_gates_file	lesson/SYNC_GATES_14_DAYS.tsv
prompt_file	prompts/PROMPTS_14_DAYS.md
CONFIG

printf '# selected_at\tmode\tdescription\n' > learning/LESSON_MODE.tsv
printf '# selected_at\tcode\tlabel\n' > learning/WORKFLOW_DISPLAY_LANGUAGE.tsv
printf '# selected_at\tcode\tlabel\n' > learning/PRODUCT_DEVELOPMENT_LANGUAGE.tsv
printf '# selected_at\tmode\tdescription\n' > learning/LESSON_MODE_14_DAYS.tsv
printf '# selected_at\tcode\tlabel\n' > learning/WORKFLOW_DISPLAY_LANGUAGE_14_DAYS.tsv
printf '# selected_at\tcode\tlabel\n' > learning/PRODUCT_DEVELOPMENT_LANGUAGE_14_DAYS.tsv

./tools/menu | grep '3\. 応用レッスン' >/dev/null
./tools/menu | grep '3\. 発展・応用レッスン' >/dev/null && exit 1 || true
./tools/menu | grep './tools/product-improvement status' >/dev/null

for item in 1 2 3 4 5 6; do
  ./tools/menu start "$item" --confirm >/tmp/menu-missing-prerequisite-"$item".out 2>&1 && exit 1 || true
  grep 'missing menu prerequisite' /tmp/menu-missing-prerequisite-"$item".out >/dev/null
done

./tools/menu start 4 >/tmp/menu-approval-required.out 2>&1 && exit 1 || true
grep 'learner approval is required before starting' /tmp/menu-approval-required.out >/dev/null

./tools/lesson 学習モード A >/dev/null
./tools/lesson 表示言語 ja >/dev/null
./tools/lesson 開発言語 ja >/dev/null
./tools/lesson14 学習モード B >/dev/null
./tools/lesson14 表示言語 en >/dev/null
./tools/lesson14 開発言語 en >/dev/null

for item in 1 2 3 4; do
  ./tools/menu check "$item" | grep 'Menu prerequisite check passed' >/dev/null
done

git -c init.defaultBranch=main init "$product_repo" >/dev/null
git -C "$product_repo" config user.name "Menu Test"
git -C "$product_repo" config user.email "menu-test@example.com"
for item in 5 6; do
  ./tools/menu check "$item" | grep 'Menu prerequisite check passed' >/dev/null
done

./tools/menu readiness | grep 'Menu prerequisite readiness: 自由開発' >/dev/null
./tools/menu readiness | grep 'Product repository boundary: ready' >/dev/null

printf 'Menu prerequisite tests passed.\n'
