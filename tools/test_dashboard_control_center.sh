#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

search_guard() {
  local pattern="$1"
  shift
  if command -v rg >/dev/null 2>&1; then
    rg -n "$pattern" "$@"
    return
  fi
  grep -RInE "$pattern" "$@"
}

if [[ ! -x "$ROOT/node_modules/.bin/vite" || ! -x "$ROOT/node_modules/.bin/playwright" ]]; then
  printf 'Dashboard control-center dependencies are not installed.\n' >&2
  printf 'Run npm install before running this check.\n' >&2
  exit 1
fi

SNAPSHOT="$TMP_DIR/dashboard-data.json"
DASHBOARD_DATA_GENERATED_AT="2026-06-05T00:00:00Z" "$ROOT/tools/dashboard-control-center" snapshot --output "$SNAPSHOT" >/dev/null

node - "$SNAPSHOT" <<'NODE'
const fs = require("fs");
const file = process.argv[2];
const data = JSON.parse(fs.readFileSync(file, "utf8"));

function fail(message) {
  console.error(message);
  process.exit(1);
}

if (data.generated_at !== "2026-06-05T00:00:00Z") {
  fail("dashboard-control-center snapshot did not preserve dashboard-data output");
}
if (!/^[a-f0-9]{64}$/.test(data.content_hash || "") || !String(data.snapshot_id || "").endsWith(data.content_hash.slice(0, 12))) {
  fail("dashboard-control-center snapshot must include producer-owned snapshot identity");
}
if (!Array.isArray(data.source_commands) || !data.source_commands.includes("tools/dashboard-data")) {
  fail("dashboard-control-center snapshot must use tools/dashboard-data as the source command");
}
if (data.source_commands.some((command) => /^(\.\/)?tools\/dashboard(\s|$)/.test(command))) {
  fail("dashboard-control-center snapshot must not claim tools/dashboard prose as a source command");
}
if (!data.actions?.command_previews?.every((preview) => preview.execution_mode === "preview_only" && preview.non_executable === true)) {
  fail("dashboard-control-center command previews must remain preview-only and non-executable");
}
if (data.partial_failures?.some((failure) => failure.status === "optional")) {
  fail("dashboard-control-center partial failures must not contain optional manual follow-ups");
}
if (!data.summary?.manual_followups?.some((followup) => followup.source === "product_ci_live")) {
  fail("dashboard-control-center manual follow-ups must contain optional live checks");
}
NODE

(cd "$ROOT" && node --input-type=module - "$SNAPSHOT" "$TMP_DIR/not-dashboard.json" "$TMP_DIR/unsafe-preview.json" "$TMP_DIR/missing-metrics.json" "$TMP_DIR/optional-partial.json" "$TMP_DIR/invalid-followup.json") <<'NODE'
import fs from "node:fs";
import { validateDashboardData } from "./vite.config.mjs";

const validFile = process.argv[2];
const invalidFile = process.argv[3];
const unsafePreviewFile = process.argv[4];
const missingMetricsFile = process.argv[5];
const optionalPartialFile = process.argv[6];
const invalidFollowupFile = process.argv[7];
const validBody = fs.readFileSync(validFile, "utf8");
fs.writeFileSync(invalidFile, JSON.stringify({
  schema_version: "0.1.0",
  source_commands: ["tools/dashboard all"],
  summary: {},
  lessons: {},
  development: {},
  maintenance: {},
  git_workflow: {},
  security: {},
  actions: {},
}));
const unsafePreview = JSON.parse(validBody);
unsafePreview.actions.command_previews[0].execution_mode = "manual_after_approval";
fs.writeFileSync(unsafePreviewFile, JSON.stringify(unsafePreview));
const missingMetrics = JSON.parse(validBody);
delete missingMetrics.summary.category_metrics;
fs.writeFileSync(missingMetricsFile, JSON.stringify(missingMetrics));
const optionalPartial = JSON.parse(validBody);
optionalPartial.partial_failures.push({
  source: "optional_live_check",
  status: "optional",
  reason: "optional must not be a true partial failure",
  required_command: "./tools/check_ci_status.sh --required",
});
fs.writeFileSync(optionalPartialFile, JSON.stringify(optionalPartial));
const invalidFollowup = JSON.parse(validBody);
invalidFollowup.summary.manual_followups[0].status = "failed";
fs.writeFileSync(invalidFollowupFile, JSON.stringify(invalidFollowup));

function fail(message) {
  console.error(message);
  process.exit(1);
}

if (!validateDashboardData(validBody)) {
  fail("vite middleware rejected dashboard-data output");
}
if (validateDashboardData(fs.readFileSync(invalidFile, "utf8"))) {
  fail("vite middleware accepted tools/dashboard prose as a data source");
}
if (validateDashboardData(fs.readFileSync(unsafePreviewFile, "utf8"))) {
  fail("vite middleware accepted executable command preview data");
}
if (validateDashboardData(fs.readFileSync(missingMetricsFile, "utf8"))) {
  fail("vite middleware accepted dashboard data without producer-owned metrics");
}
if (validateDashboardData(fs.readFileSync(optionalPartialFile, "utf8"))) {
  fail("vite middleware accepted optional status inside partial_failures");
}
if (validateDashboardData(fs.readFileSync(invalidFollowupFile, "utf8"))) {
  fail("vite middleware accepted failed status inside manual_followups");
}
NODE

if grep -Eq 'npm run dashboard:dev|--port <port>|Data snapshot:' "$ROOT/tools/dashboard-control-center"; then
  printf 'dashboard-control-center ordinary entry leaks npm, port selection, or data snapshot details\n' >&2
  exit 1
fi

if ! grep -q 'mktemp' "$ROOT/tools/dashboard-control-center" || ! grep -q 'mv "$tmp" "$output"' "$ROOT/tools/dashboard-control-center"; then
  printf 'dashboard-control-center snapshot writer must validate a temporary file before atomic rename\n' >&2
  exit 1
fi

if ! grep -q 'validateDashboardData' "$ROOT/tools/dashboard-control-center"; then
  printf 'dashboard-control-center snapshot writer must schema-validate before atomic rename\n' >&2
  exit 1
fi

if grep -Eq 'dashboard-data" >"\$output"|dashboard-data" >\$output' "$ROOT/tools/dashboard-control-center"; then
  printf 'dashboard-control-center snapshot writer must not write dashboard-data directly to the published output\n' >&2
  exit 1
fi

if search_guard "child_process|exec\\(|spawn\\(" "$ROOT/dashboard-control-center/src" "$ROOT/vite.config.mjs"; then
  printf 'dashboard-control-center browser surface must not expose command execution paths\n' >&2
  exit 1
fi

if search_guard "method:[[:space:]]*[\"'](POST|PUT|PATCH|DELETE)" "$ROOT/dashboard-control-center/src" "$ROOT/vite.config.mjs"; then
  printf 'dashboard-control-center browser fetches must not use non-GET mutation methods\n' >&2
  exit 1
fi

if search_guard "fetch\\([\"'](\\./)?tools/" "$ROOT/dashboard-control-center/src"; then
  printf 'dashboard-control-center browser surface must not fetch tool command paths\n' >&2
  exit 1
fi

(cd "$ROOT" && npm run dashboard:build >/dev/null)
(cd "$ROOT" && PLAYWRIGHT_WORKERS=1 npm run test:dashboard-control-center)

printf 'Dashboard control-center tests passed.\n'
