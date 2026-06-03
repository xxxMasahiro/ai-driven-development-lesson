#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

POLICY_FILE="$TMP_DIR/resource-policy.tsv"
SETTINGS_FILE="$TMP_DIR/resource-settings.tsv"
MEMINFO_FILE="$TMP_DIR/meminfo"

cat >"$POLICY_FILE" <<'EOF'
# row_type	key	value	label	description
default	memory_budget_percent	40	Memory budget percent	Test default.
default	swap_storage_percent	20	Swap storage percent	Test default.
default	swap_gib_limit	16	Swap GiB limit	Test default.
default	max_parallel_jobs	auto	Maximum parallel jobs	Test default.
default	resource_mode	automatic	Resource mode	Test default.
default	available_memory_floor_percent	25	Available memory floor percent	Test default.
default	cleanup_safe_delete_enabled	true	Cleanup safe delete enabled	Test default.
default	cleanup_older_than_hours	0	Cleanup older-than hours	Test default.
default	cleanup_require_explicit_safe	true	Cleanup requires explicit safe flag	Test default.
threshold	record_10	10	Record only	Test threshold.
threshold	record_20	20	Record only	Test threshold.
threshold	record_30	30	Record only	Test threshold.
threshold	record_40	40	Record only	Test threshold.
threshold	notice_50	50	Notice	Test threshold.
threshold	warning_60	60	Warning	Test threshold.
threshold	strong_warning_70	70	Strong warning	Test threshold.
threshold	stop_new_parallel_80	80	Stop new parallel work	Test threshold.
threshold	serial_fallback_90	90	Serial fallback or safe stop	Test threshold.
profile	git-hooks-full	2048	Git hooks full verification	Test profile.
profile	playwright	4096	Playwright browser checks	Test profile.
profile	aggregate	4096	Aggregate lesson checks	Test profile.
profile	default	2048	Default heavy work	Test profile.
EOF

cat >"$SETTINGS_FILE" <<'EOF'
# key	value	description
memory_budget_percent	70	Test memory budget.
swap_storage_percent	20	Test swap storage percentage.
swap_gib_limit	16	Test swap GiB cap.
max_parallel_jobs	auto	Test automatic job selection.
resource_mode	automatic	Test automatic mode.
available_memory_floor_percent	25	Test available memory floor.
cleanup_safe_delete_enabled	true	Test cleanup toggle.
cleanup_older_than_hours	0	Test cleanup age.
cleanup_require_explicit_safe	true	Test cleanup safety.
EOF

cat >"$MEMINFO_FILE" <<'EOF'
MemTotal:       16777216 kB
MemAvailable:   8388608 kB
SwapTotal:       4194304 kB
SwapFree:        4194304 kB
EOF

run_guard() {
  RESOURCE_GUARD_POLICY_FILE="$POLICY_FILE" \
  RESOURCE_GUARD_SETTINGS_FILE="$SETTINGS_FILE" \
  RESOURCE_GUARD_MEMINFO_FILE="$MEMINFO_FILE" \
  RESOURCE_GUARD_DISK_FREE_MIB="102400" \
  RESOURCE_GUARD_CPU_COUNT="8" \
  RESOURCE_GUARD_ACTIVE_HEAVY_COUNT="${TEST_ACTIVE_HEAVY_COUNT:-0}" \
  "$ROOT/tools/resource-guard" "$@"
}

summary_output="$(run_guard summary)"
[[ "$summary_output" == *"Resource guard summary"* ]]
[[ "$summary_output" == *"Memory budget percent: 70%"* ]]
[[ "$summary_output" == *"Memory budget MiB: 11468"* ]]
[[ "$summary_output" == *"Repository swap-budget usage percent: 0%"* ]]
[[ "$summary_output" == *"Usage stage: record-only"* ]]
[[ "$summary_output" == *"Decision: parallel-allowed"* ]]
[[ "$summary_output" == *"- git-hooks-full: 5 recommended job(s), 2048 MiB/job"* ]]
[[ "$summary_output" == *"- playwright: 2 recommended job(s), 4096 MiB/job"* ]]
[[ "$summary_output" == *"GitHub Actions uses workflow job splitting for CI parallelism."* ]]
[[ "$summary_output" == *"does not force Playwright or aggregate checks"* ]]

short_output="$(run_guard summary --short)"
[[ "$short_output" == *"Resource guard summary (short)"* ]]
[[ "$short_output" == *"memory_budget_percent=70"* ]]
[[ "$short_output" == *"memory_budget_mib=11468"* ]]
[[ "$short_output" == *"profile=git-hooks-full recommended_jobs=5 job_mib=2048"* ]]
[[ "$short_output" == *"profile=playwright recommended_jobs=2 job_mib=4096"* ]]
[[ "$short_output" == *"ci_parallelism=workflow-job-splitting"* ]]

fallback_output="$(TEST_ACTIVE_HEAVY_COUNT=1 run_guard summary --short)"
[[ "$fallback_output" == *"decision=serial-fallback"* ]]
[[ "$fallback_output" == *"profile=git-hooks-full recommended_jobs=1 job_mib=2048"* ]]

cat >"$MEMINFO_FILE" <<'EOF'
MemTotal:       16777216 kB
MemAvailable:   8388608 kB
SwapTotal:      41943040 kB
SwapFree:        2097152 kB
EOF

safe_stop_output="$(run_guard summary --short)"
[[ "$safe_stop_output" == *"decision=safe-stop"* ]]
[[ "$safe_stop_output" == *"profile=git-hooks-full recommended_jobs=not-available-safe-stop job_mib=2048"* ]]

printf 'Resource guard summary tests passed.\n'
