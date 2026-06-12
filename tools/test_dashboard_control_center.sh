#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TMP_DIR="$(mktemp -d)"
PIDS=()
CLEANUP_FILES=()

cleanup() {
  local pid file
  for pid in "${PIDS[@]:-}"; do
    kill "$pid" >/dev/null 2>&1 || true
    wait "$pid" >/dev/null 2>&1 || true
  done
  for file in "${CLEANUP_FILES[@]:-}"; do
    rm -f "$file"
  done
  rm -rf "$TMP_DIR"
}
trap cleanup EXIT

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
"$ROOT/tools/test_dashboard_i18n.sh" >/dev/null
"$ROOT/tools/test_dashboard_settings.sh" >/dev/null

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
import { requestHasJsonContentType, requestIsSameOrigin, validateDashboardData } from "./vite.config.mjs";

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

const sameOriginJson = {
  headers: {
    host: "127.0.0.1:5173",
    origin: "http://127.0.0.1:5173",
    "sec-fetch-site": "same-origin",
    "content-type": "application/json; charset=utf-8",
  },
};
const crossOriginJson = {
  headers: {
    host: "127.0.0.1:5173",
    origin: "http://example.invalid",
    "sec-fetch-site": "cross-site",
    "content-type": "application/json",
  },
};
const formPost = {
  headers: {
    host: "127.0.0.1:5173",
    origin: "http://127.0.0.1:5173",
    "sec-fetch-site": "same-origin",
    "content-type": "text/plain",
  },
};
const missingBrowserOrigin = {
  headers: {
    host: "127.0.0.1:5173",
    "content-type": "application/json",
  },
};
if (!requestHasJsonContentType(sameOriginJson) || !requestIsSameOrigin(sameOriginJson)) {
  fail("settings mutation guard rejected same-origin JSON");
}
if (requestIsSameOrigin(crossOriginJson)) {
  fail("settings mutation guard accepted cross-origin mutation");
}
if (requestHasJsonContentType(formPost)) {
  fail("settings mutation guard accepted non-JSON mutation content type");
}
if (requestIsSameOrigin(missingBrowserOrigin)) {
  fail("settings mutation guard accepted missing browser origin metadata");
}
NODE

run_vite_settings_middleware_check() {
  local lesson_mode workflow_language product_language lesson_config
  local lesson14_mode lesson14_workflow_language lesson14_product_language lesson14_config
  local git_settings runtime_data_file port vite_log vite_pid

  lesson_mode="$TMP_DIR/VITE_LESSON_MODE.tsv"
  workflow_language="$TMP_DIR/VITE_WORKFLOW_DISPLAY_LANGUAGE.tsv"
  product_language="$TMP_DIR/VITE_PRODUCT_DEVELOPMENT_LANGUAGE.tsv"
  lesson14_mode="$TMP_DIR/VITE_LESSON_MODE_14_DAYS.tsv"
  lesson14_workflow_language="$TMP_DIR/VITE_WORKFLOW_DISPLAY_LANGUAGE_14_DAYS.tsv"
  lesson14_product_language="$TMP_DIR/VITE_PRODUCT_DEVELOPMENT_LANGUAGE_14_DAYS.tsv"
  lesson_config="$TMP_DIR/VITE_LESSON_CONFIG.tsv"
  lesson14_config="$TMP_DIR/VITE_LESSON_CONFIG_14_DAYS.tsv"
  git_settings="$TMP_DIR/VITE_GIT_WORKFLOW_SETTINGS.tsv"
  runtime_data_file="$ROOT/.dashboard-control-center/dashboard-data-middleware-$$.json"
  vite_log="$TMP_DIR/vite-settings-middleware.log"

  printf '# selected_at\tmode\tdescription\n2026-06-05 00:00:00\tA\tじっくり説明\n' >"$lesson_mode"
  printf '# selected_at\tcode\tlabel\n2026-06-05 00:00:00\tja\t日本語\n' >"$workflow_language"
  printf '# selected_at\tcode\tlabel\n2026-06-05 00:00:00\ten\tEnglish\n' >"$product_language"
  printf '# selected_at\tmode\tdescription\n2026-06-05 00:00:00\tA\tじっくり説明\n' >"$lesson14_mode"
  printf '# selected_at\tcode\tlabel\n2026-06-05 00:00:00\tja\t日本語\n' >"$lesson14_workflow_language"
  printf '# selected_at\tcode\tlabel\n2026-06-05 00:00:00\ten\tEnglish\n' >"$lesson14_product_language"
  cat >"$lesson_config" <<DOC
# key	value
learning_mode_file	$lesson_mode
workflow_language_file	$workflow_language
product_language_file	$product_language
DOC
  cat >"$lesson14_config" <<DOC
# key	value
learning_mode_file	$lesson14_mode
workflow_language_file	$lesson14_workflow_language
product_language_file	$lesson14_product_language
DOC
  cat >"$git_settings" <<'DOC'
# key	value
branch_allowed	true
worktree_allowed	false
main_direct_work_allowed	false
automation_level	sync
commit_automation	auto
push_automation	auto
pr_creation	auto
pr_ci_monitoring	auto
merge_execution	after_approval
developer_auto_merge_allowed	true
main_ci_monitoring	auto
sync_monitoring	auto
DOC
  mkdir -p "$(dirname "$runtime_data_file")"
  printf '{}\n' >"$runtime_data_file"
  CLEANUP_FILES+=("$runtime_data_file")

  port="$(node -e 'const net = require("node:net"); const server = net.createServer(); server.listen(0, "127.0.0.1", () => { console.log(server.address().port); server.close(); });')"
  (
    cd "$ROOT"
    DASHBOARD_SETTINGS_TEST_MODE=1 \
      DASHBOARD_SETTINGS_TEST_ROOT="$TMP_DIR" \
      DASHBOARD_LESSON_CONFIG="$lesson_config" \
      DASHBOARD_LESSON14_CONFIG="$lesson14_config" \
      LESSON_CONFIG="$lesson14_config" \
      GIT_WORKFLOW_SETTINGS_FILE="$git_settings" \
      GIT_WORKFLOW_POLICY_FILE="$ROOT/docs/workflow/GIT_WORKFLOW_POLICY.tsv" \
      DASHBOARD_CONTROL_CENTER_DATA_FILE="$runtime_data_file" \
      "$ROOT/node_modules/.bin/vite" --host 127.0.0.1 --port "$port" --strictPort --clearScreen false >"$vite_log" 2>&1
  ) &
  vite_pid="$!"
  PIDS+=("$vite_pid")

  node - "$port" "$lesson14_mode" "$lesson14_workflow_language" "$runtime_data_file" "$vite_log" <<'NODE'
const fs = require("node:fs");
const http = require("node:http");

const port = Number(process.argv[2]);
const lessonMode = process.argv[3];
const workflowLanguage = process.argv[4];
const runtimeDataFile = process.argv[5];
const viteLog = process.argv[6];
const host = `127.0.0.1:${port}`;

function fail(message) {
  console.error(message);
  if (fs.existsSync(viteLog)) {
    console.error(fs.readFileSync(viteLog, "utf8"));
  }
  process.exit(1);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function request(method, requestPath, headers = {}, body = "") {
  return new Promise((resolve, reject) => {
    const requestOptions = {
      hostname: "127.0.0.1",
      port,
      path: requestPath,
      method,
      headers: {
        host,
        ...headers,
      },
    };
    const req = http.request(requestOptions, (res) => {
      let data = "";
      res.setEncoding("utf8");
      res.on("data", (chunk) => {
        data += chunk;
      });
      res.on("end", () => resolve({ status: res.statusCode, body: data }));
    });
    req.on("error", reject);
    if (body) {
      req.write(body);
    }
    req.end();
  });
}

async function waitForVite() {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    try {
      const response = await request("GET", "/");
      if (response.status && response.status < 500) {
        return;
      }
    } catch {
      await sleep(100);
    }
  }
  fail("vite settings middleware test server did not become ready");
}

function parseJson(response, label) {
  try {
    return JSON.parse(response.body);
  } catch {
    fail(`${label} returned invalid JSON: ${response.body}`);
  }
}

(async () => {
  await waitForVite();
  const sameOriginHeaders = {
    origin: `http://${host}`,
    "sec-fetch-site": "same-origin",
    "content-type": "application/json; charset=utf-8",
  };
  const plan = await request(
    "POST",
    "/dashboard-settings/plan",
    sameOriginHeaders,
    JSON.stringify({ setting_id: "learning_mode", value: "C", menu_id: "step_1_14" }),
  );
  if (plan.status !== 200) {
    fail(`settings plan middleware failed with ${plan.status}: ${plan.body}`);
  }
  const planJson = parseJson(plan, "settings plan middleware");
  if (planJson.status !== "ready" || planJson.setting_id !== "learning_mode" || planJson.requested_value !== "C" || planJson.applied !== false) {
    fail("settings plan middleware returned an unexpected payload");
  }

  const apply = await request(
    "POST",
    "/dashboard-settings/apply",
    sameOriginHeaders,
    JSON.stringify({ setting_id: "learning_mode", value: "C", menu_id: "step_1_14", confirm: true }),
  );
  if (apply.status !== 200) {
    fail(`settings apply middleware failed with ${apply.status}: ${apply.body}`);
  }
  const applyJson = parseJson(apply, "settings apply middleware");
  if (applyJson.status !== "passed" || applyJson.applied !== true || applyJson.snapshot_regenerated !== true) {
    fail("settings apply middleware returned an unexpected payload");
  }
  if (!/\tC\t/.test(fs.readFileSync(lessonMode, "utf8"))) {
    fail("settings apply middleware did not update the configured lesson setting file");
  }
  const snapshotAfterLearningMode = parseJson(await request("GET", "/dashboard-data.json"), "dashboard data after learning-mode apply");
  if (
    !snapshotAfterLearningMode.content_hash ||
    snapshotAfterLearningMode.summary.workflow_language !== "ja" ||
    snapshotAfterLearningMode.summary.ui_locale !== "ja" ||
    snapshotAfterLearningMode.summary.ui_direction !== "ltr"
  ) {
    fail("settings apply middleware did not regenerate a locale-aware dashboard snapshot after learning-mode apply");
  }

  const workflowPlan = await request(
    "POST",
    "/dashboard-settings/plan",
    sameOriginHeaders,
    JSON.stringify({ setting_id: "workflow_language", value: "en", menu_id: "step_1_14" }),
  );
  if (workflowPlan.status !== 200) {
    fail(`workflow language plan middleware failed with ${workflowPlan.status}: ${workflowPlan.body}`);
  }
  const workflowPlanJson = parseJson(workflowPlan, "workflow language plan middleware");
  if (workflowPlanJson.status !== "ready" || workflowPlanJson.setting_id !== "workflow_language" || workflowPlanJson.requested_value !== "en") {
    fail("workflow language plan middleware returned an unexpected payload");
  }

  const workflowApply = await request(
    "POST",
    "/dashboard-settings/apply",
    sameOriginHeaders,
    JSON.stringify({ setting_id: "workflow_language", value: "en", menu_id: "step_1_14", confirm: true }),
  );
  if (workflowApply.status !== 200) {
    fail(`workflow language apply middleware failed with ${workflowApply.status}: ${workflowApply.body}`);
  }
  const workflowApplyJson = parseJson(workflowApply, "workflow language apply middleware");
  if (workflowApplyJson.status !== "passed" || workflowApplyJson.applied !== true || workflowApplyJson.snapshot_regenerated !== true) {
    fail("workflow language apply middleware returned an unexpected payload");
  }
  if (
    workflowApplyJson.workflow_language !== "en" ||
    workflowApplyJson.display_locale !== "en" ||
    workflowApplyJson.ui_locale !== "en" ||
    workflowApplyJson.direction !== "ltr"
  ) {
    fail("workflow language apply middleware did not return locale metadata");
  }
  if (!/\ten\tEnglish/.test(fs.readFileSync(workflowLanguage, "utf8"))) {
    fail("workflow language apply middleware did not update the configured workflow language file");
  }
  if (!fs.existsSync(runtimeDataFile)) {
    fail("workflow language apply middleware did not write the configured dashboard snapshot file");
  }
  const snapshotResponse = await request("GET", "/dashboard-data.json");
  if (snapshotResponse.status !== 200) {
    fail(`dashboard data endpoint rejected regenerated workflow-language snapshot with ${snapshotResponse.status}: ${snapshotResponse.body}`);
  }
  const snapshotAfterWorkflowLanguage = parseJson(snapshotResponse, "dashboard data after workflow-language apply");
  if (snapshotAfterWorkflowLanguage.content_hash === snapshotAfterLearningMode.content_hash) {
    fail("workflow language apply did not change the dashboard content hash");
  }
  if (
    snapshotAfterWorkflowLanguage.summary.workflow_language !== "en" ||
    snapshotAfterWorkflowLanguage.summary.display_locale !== "en" ||
    snapshotAfterWorkflowLanguage.summary.ui_locale !== "en" ||
    snapshotAfterWorkflowLanguage.summary.ui_direction !== "ltr"
  ) {
    fail("workflow language apply did not regenerate the expected summary locale fields");
  }
  const workflowLanguageItem = snapshotAfterWorkflowLanguage.settings.items.find((item) => item.id === "workflow_language");
  if (!workflowLanguageItem || workflowLanguageItem.current_value !== "en") {
    fail("workflow language apply did not update the Settings workflow_language row");
  }

  const crossOrigin = await request(
    "POST",
    "/dashboard-settings/apply",
    {
      origin: "http://example.invalid",
      "sec-fetch-site": "cross-site",
      "content-type": "application/json",
    },
    JSON.stringify({ setting_id: "learning_mode", value: "B", menu_id: "step_1_14", confirm: true }),
  );
  if (crossOrigin.status !== 403) {
    fail(`settings middleware accepted cross-origin apply with ${crossOrigin.status}`);
  }

  const textPlain = await request(
    "POST",
    "/dashboard-settings/apply",
    {
      origin: `http://${host}`,
      "sec-fetch-site": "same-origin",
      "content-type": "text/plain",
    },
    JSON.stringify({ setting_id: "learning_mode", value: "B", menu_id: "step_1_14", confirm: true }),
  );
  if (textPlain.status !== 415) {
    fail(`settings middleware accepted non-JSON apply with ${textPlain.status}`);
  }
})().catch((error) => fail(error.message));
NODE
}

run_vite_settings_middleware_check

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

if search_guard "child_process|exec\\(|spawn\\(" "$ROOT/dashboard-control-center/src"; then
  printf 'dashboard-control-center browser surface must not expose command execution paths\n' >&2
  exit 1
fi

if grep -Eq 'shell:[[:space:]]*true|exec\(|spawn\(' "$ROOT/vite.config.mjs"; then
  printf 'dashboard-control-center settings middleware must not use shell execution or generic command execution\n' >&2
  exit 1
fi

if ! grep -q 'execFile(' "$ROOT/vite.config.mjs" || ! grep -q 'dashboard-settings' "$ROOT/vite.config.mjs"; then
  printf 'dashboard-control-center settings middleware must call tools/dashboard-settings through execFile\n' >&2
  exit 1
fi

if ! grep -q 'requestHasJsonContentType' "$ROOT/vite.config.mjs" || ! grep -q 'requestIsSameOrigin' "$ROOT/vite.config.mjs"; then
  printf 'dashboard-control-center settings middleware must enforce JSON and same-origin mutation guards\n' >&2
  exit 1
fi

if search_guard "method:[[:space:]]*[\"'](PUT|PATCH|DELETE)" "$ROOT/dashboard-control-center/src" "$ROOT/vite.config.mjs"; then
  printf 'dashboard-control-center browser fetches must not use unsafe mutation methods\n' >&2
  exit 1
fi

mutation_fetches="$(search_guard "method:[[:space:]]*[\"']POST" "$ROOT/dashboard-control-center/src" || true)"
if [[ -n "$mutation_fetches" ]]; then
  if ! grep -q '"/dashboard-settings/plan"' "$ROOT/dashboard-control-center/src/dashboardData.js" || ! grep -q '"/dashboard-settings/apply"' "$ROOT/dashboard-control-center/src/dashboardData.js"; then
    printf 'dashboard-control-center POST fetches must be limited to Settings plan/apply endpoints\n' >&2
    exit 1
  fi
fi

if grep -Eq 'method:[[:space:]]*[\"'\'']POST[\"'\'']' "$ROOT/dashboard-control-center/src/App.jsx"; then
  printf 'dashboard-control-center React components must not embed POST fetches directly\n' >&2
  exit 1
fi

if search_guard "fetch\\([\"'](\\./)?tools/" "$ROOT/dashboard-control-center/src"; then
  printf 'dashboard-control-center browser surface must not fetch tool command paths\n' >&2
  exit 1
fi

(cd "$ROOT" && npm run dashboard:build >/dev/null)
(cd "$ROOT" && PLAYWRIGHT_WORKERS=1 npm run test:dashboard-control-center)

printf 'Dashboard control-center tests passed.\n'
