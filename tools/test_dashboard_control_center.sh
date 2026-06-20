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

TEST_PROJECT_ROOT="$TMP_DIR/projects"
TEST_LESSON_MODE="$TMP_DIR/LESSON_MODE.tsv"
TEST_WORKFLOW_LANGUAGE="$TMP_DIR/WORKFLOW_DISPLAY_LANGUAGE.tsv"
TEST_PRODUCT_LANGUAGE="$TMP_DIR/PRODUCT_DEVELOPMENT_LANGUAGE.tsv"
TEST_LESSON14_MODE="$TMP_DIR/LESSON_MODE_14_DAYS.tsv"
TEST_LESSON14_WORKFLOW_LANGUAGE="$TMP_DIR/WORKFLOW_DISPLAY_LANGUAGE_14_DAYS.tsv"
TEST_LESSON14_PRODUCT_LANGUAGE="$TMP_DIR/PRODUCT_DEVELOPMENT_LANGUAGE_14_DAYS.tsv"
TEST_LESSON_CONFIG="$TMP_DIR/LESSON_CONFIG.tsv"
TEST_LESSON14_CONFIG="$TMP_DIR/LESSON_CONFIG_14_DAYS.tsv"
TEST_GIT_SETTINGS="$TMP_DIR/GIT_WORKFLOW_SETTINGS.tsv"
TEST_PRODUCT_REGISTRY="$TMP_DIR/PRODUCT_REPOSITORY_REGISTRY.tsv"
TEST_PRODUCT_SELECTION="$TMP_DIR/PRODUCT_REPOSITORY_SELECTION.tsv"

write_test_dashboard_environment() {
  mkdir -p "$TEST_PROJECT_ROOT"
  printf '# selected_at\tmode\tdescription\n2026-06-05 00:00:00\tA\tじっくり説明\n' >"$TEST_LESSON_MODE"
  printf '# selected_at\tcode\tlabel\n2026-06-05 00:00:00\tja\t日本語\n' >"$TEST_WORKFLOW_LANGUAGE"
  printf '# selected_at\tcode\tlabel\n2026-06-05 00:00:00\ten\tEnglish\n' >"$TEST_PRODUCT_LANGUAGE"
  printf '# selected_at\tmode\tdescription\n2026-06-05 00:00:00\tA\tじっくり説明\n' >"$TEST_LESSON14_MODE"
  printf '# selected_at\tcode\tlabel\n2026-06-05 00:00:00\tja\t日本語\n' >"$TEST_LESSON14_WORKFLOW_LANGUAGE"
  printf '# selected_at\tcode\tlabel\n2026-06-05 00:00:00\ten\tEnglish\n' >"$TEST_LESSON14_PRODUCT_LANGUAGE"
  cat >"$TEST_LESSON_CONFIG" <<DOC
# key	value
project_root	$TEST_PROJECT_ROOT
product_repo_name	task-tracker-repository
learning_mode_file	$TEST_LESSON_MODE
workflow_language_file	$TEST_WORKFLOW_LANGUAGE
product_language_file	$TEST_PRODUCT_LANGUAGE
DOC
  cat >"$TEST_LESSON14_CONFIG" <<DOC
# key	value
project_root	$TEST_PROJECT_ROOT
product_repo_name	task-tracker-repository
learning_mode_file	$TEST_LESSON14_MODE
workflow_language_file	$TEST_LESSON14_WORKFLOW_LANGUAGE
product_language_file	$TEST_LESSON14_PRODUCT_LANGUAGE
DOC
  cat >"$TEST_GIT_SETTINGS" <<'DOC'
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
  printf '# repo_id\tprimary_menu_id\tallowed_contexts\tdisplay_name\trepository_path\tproduct_type\tsource\n' >"$TEST_PRODUCT_REGISTRY"
  printf '# menu_id\trepo_id\tselected_at\tsource\n' >"$TEST_PRODUCT_SELECTION"
}

write_test_dashboard_environment

SNAPSHOT="$TMP_DIR/dashboard-data.json"
DASHBOARD_DATA_GENERATED_AT="2026-06-05T00:00:00Z" \
  DASHBOARD_LIVE_STATUS=0 \
  DASHBOARD_LESSON_CONFIG="$TEST_LESSON_CONFIG" \
  DASHBOARD_LESSON14_CONFIG="$TEST_LESSON14_CONFIG" \
  LESSON_CONFIG="$TEST_LESSON14_CONFIG" \
  GIT_WORKFLOW_SETTINGS_FILE="$TEST_GIT_SETTINGS" \
  PRODUCT_REPOSITORY_REGISTRY_FILE="$TEST_PRODUCT_REGISTRY" \
  PRODUCT_REPOSITORY_SELECTION_FILE="$TEST_PRODUCT_SELECTION" \
  "$ROOT/tools/dashboard-control-center" snapshot --output "$SNAPSHOT" >/dev/null
"$ROOT/tools/check_dashboard_design_system.sh" >/dev/null
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
import { requestHasJsonContentType, requestIsSameOrigin, validateDashboardData, validateDashboardLiveStatus } from "./vite.config.mjs";

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

const liveStatus = {
  schema_version: "0.1.0",
  generated_at: "2026-06-05T00:00:00Z",
  menu_id: "free-development",
  workflow_context: "free-development",
  target_repository: {
    name: "frame-cue",
    path_state: "configured",
    git_state: "configured",
    git_usage_mode: "ci",
  },
  repository_state: {
    branch: "main",
    head: "abcdef123456",
    upstream: "origin/main",
    dirty_count: 0,
    untracked_count: 0,
    ahead: 0,
    behind: 0,
  },
  checks: Object.fromEntries(["local_tests", "git_sync", "ci", "security"].map((key) => [key, {
    status: key === "ci" ? "manual_required" : "passed",
    observed_at: key === "ci" ? "not_collected" : "2026-06-05T00:00:00Z",
    detail_code: `${key}_checked`,
    source_id: key === "ci" ? "product_ci_live" : key === "git_sync" ? "product_git_sync_live" : key === "security" ? "product.security.local_artifacts" : "product.gates.tests",
    summary: `${key} current state`,
    reason: `${key} evidence is available for review.`,
    next_action: `Review ${key} details.`,
    detail_page: key === "security" ? "#safety" : "#workflow",
    freshness_state: key === "ci" ? "not_collected" : "current",
    authority: key === "ci" ? "manual_required" : "authoritative",
    risk_level: key === "ci" ? "medium" : "low",
    required_command: "not_applicable",
    current_item_id: `${key}.current`,
    ...(key === "ci" ? {
      workflow_name: "CI",
      run_status: "in_progress",
      conclusion: "",
      run_id: "12345",
      run_url: "https://github.com/example/repo/actions/runs/12345",
      repository_head: "abcdef123456",
      run_head_sha: "abcdef1234567890",
      run_head_branch: "main",
      head_match_status: "matched",
    } : {}),
    items: [{
      source_id: `${key}.current`,
      category: key,
      kind: "current",
      status: key === "ci" ? "manual_required" : "passed",
      observed_at: key === "ci" ? "not_collected" : "2026-06-05T00:00:00Z",
      freshness_state: key === "ci" ? "not_collected" : "current",
      authority: key === "ci" ? "manual_required" : "authoritative",
      summary: `${key} item current state`,
      source_artifacts: "",
      next_command: "not_applicable",
      blocker_count: 0,
    }],
  }])),
};
if (!validateDashboardLiveStatus(JSON.stringify(liveStatus))) {
  fail("vite middleware rejected valid dashboard live status output");
}
const incompleteLiveStatus = JSON.parse(JSON.stringify(liveStatus));
delete incompleteLiveStatus.checks.local_tests.reason;
if (validateDashboardLiveStatus(JSON.stringify(incompleteLiveStatus))) {
  fail("vite middleware accepted incomplete dashboard live status output");
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
  local runtime_data_file port vite_log vite_pid

  runtime_data_file="$ROOT/.dashboard-control-center/dashboard-data-middleware-$$.json"
  vite_log="$TMP_DIR/vite-settings-middleware.log"

  mkdir -p "$(dirname "$runtime_data_file")"
  cp "$SNAPSHOT" "$runtime_data_file"
  CLEANUP_FILES+=("$runtime_data_file")

  port="$(node -e 'const net = require("node:net"); const server = net.createServer(); server.listen(0, "127.0.0.1", () => { console.log(server.address().port); server.close(); });')"
  (
    cd "$ROOT"
    DASHBOARD_LIVE_STATUS=0 \
      DASHBOARD_SETTINGS_TEST_MODE=1 \
      DASHBOARD_SETTINGS_TEST_ROOT="$TMP_DIR" \
      DASHBOARD_SETTINGS_SKIP_SNAPSHOT=1 \
      DASHBOARD_LESSON_CONFIG="$TEST_LESSON_CONFIG" \
      DASHBOARD_LESSON14_CONFIG="$TEST_LESSON14_CONFIG" \
      LESSON_CONFIG="$TEST_LESSON14_CONFIG" \
      GIT_WORKFLOW_SETTINGS_FILE="$TEST_GIT_SETTINGS" \
      GIT_WORKFLOW_POLICY_FILE="$ROOT/docs/workflow/GIT_WORKFLOW_POLICY.tsv" \
      PRODUCT_REPOSITORY_REGISTRY_FILE="$TEST_PRODUCT_REGISTRY" \
      PRODUCT_REPOSITORY_SELECTION_FILE="$TEST_PRODUCT_SELECTION" \
      DASHBOARD_CONTROL_CENTER_DATA_FILE="$runtime_data_file" \
      "$ROOT/node_modules/.bin/vite" --host 127.0.0.1 --port "$port" --strictPort --clearScreen false >"$vite_log" 2>&1
  ) &
  vite_pid="$!"
  PIDS+=("$vite_pid")

  node - "$port" "$TEST_LESSON14_MODE" "$TEST_LESSON14_WORKFLOW_LANGUAGE" "$runtime_data_file" "$vite_log" <<'NODE'
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
  if (
    planJson.status !== "ready" ||
    planJson.setting_id !== "learning_mode" ||
    planJson.requested_value !== "C" ||
    planJson.applied !== false ||
    !/^[0-9a-f-]{36}$/i.test(String(planJson.plan_token || ""))
  ) {
    fail("settings plan middleware returned an unexpected payload");
  }

  const applyWithoutToken = await request(
    "POST",
    "/dashboard-settings/apply",
    sameOriginHeaders,
    JSON.stringify({ setting_id: "learning_mode", value: "C", menu_id: "step_1_14", confirm: true }),
  );
  if (applyWithoutToken.status !== 409) {
    fail(`settings apply middleware accepted apply without a current plan token with ${applyWithoutToken.status}`);
  }

  const applyWrongValue = await request(
    "POST",
    "/dashboard-settings/apply",
    sameOriginHeaders,
    JSON.stringify({
      setting_id: "learning_mode",
      value: "B",
      menu_id: "step_1_14",
      plan_token: planJson.plan_token,
      snapshot_id: planJson.snapshot_id || undefined,
      confirm: true,
    }),
  );
  if (applyWrongValue.status !== 409) {
    fail(`settings apply middleware accepted a mismatched plan token with ${applyWrongValue.status}`);
  }

  const freshPlan = await request(
    "POST",
    "/dashboard-settings/plan",
    sameOriginHeaders,
    JSON.stringify({ setting_id: "learning_mode", value: "C", menu_id: "step_1_14" }),
  );
  const freshPlanJson = parseJson(freshPlan, "fresh settings plan middleware");
  const applyWrongSnapshot = await request(
    "POST",
    "/dashboard-settings/apply",
    sameOriginHeaders,
    JSON.stringify({
      setting_id: "learning_mode",
      value: "C",
      menu_id: "step_1_14",
      plan_token: freshPlanJson.plan_token,
      snapshot_id: "stale-snapshot",
      confirm: true,
    }),
  );
  if (applyWrongSnapshot.status !== 409) {
    fail(`settings apply middleware accepted a stale snapshot with ${applyWrongSnapshot.status}`);
  }

  const apply = await request(
    "POST",
    "/dashboard-settings/apply",
    sameOriginHeaders,
    JSON.stringify({ setting_id: "learning_mode", value: "C", menu_id: "step_1_14", plan_token: freshPlanJson.plan_token, confirm: true }),
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
  const replay = await request(
    "POST",
    "/dashboard-settings/apply",
    sameOriginHeaders,
    JSON.stringify({ setting_id: "learning_mode", value: "C", menu_id: "step_1_14", plan_token: freshPlanJson.plan_token, confirm: true }),
  );
  if (replay.status !== 409) {
    fail(`settings apply middleware accepted a replayed plan token with ${replay.status}`);
  }
  const snapshotAfterLearningMode = parseJson(await request("GET", "/dashboard-data.json"), "dashboard data after learning-mode apply");
  if (
    !snapshotAfterLearningMode.content_hash ||
    snapshotAfterLearningMode.summary.workflow_language !== "ja" ||
    snapshotAfterLearningMode.summary.ui_locale !== "ja" ||
    snapshotAfterLearningMode.summary.ui_direction !== "ltr"
  ) {
    fail("settings apply middleware did not serve a locale-aware dashboard snapshot after learning-mode apply");
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
  if (workflowPlanJson.status !== "ready" || workflowPlanJson.setting_id !== "workflow_language" || workflowPlanJson.requested_value !== "en" || !/^[0-9a-f-]{36}$/i.test(String(workflowPlanJson.plan_token || ""))) {
    fail("workflow language plan middleware returned an unexpected payload");
  }

  const workflowApply = await request(
    "POST",
    "/dashboard-settings/apply",
    sameOriginHeaders,
    JSON.stringify({ setting_id: "workflow_language", value: "en", menu_id: "step_1_14", plan_token: workflowPlanJson.plan_token, confirm: true }),
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
    fail(`dashboard data endpoint rejected the last valid workflow-language snapshot with ${snapshotResponse.status}: ${snapshotResponse.body}`);
  }
  const snapshotAfterWorkflowLanguage = parseJson(snapshotResponse, "dashboard data after workflow-language apply");
  if (
    !snapshotAfterWorkflowLanguage.content_hash ||
    snapshotAfterWorkflowLanguage.summary.workflow_language !== "ja" ||
    snapshotAfterWorkflowLanguage.summary.display_locale !== "ja" ||
    snapshotAfterWorkflowLanguage.summary.ui_locale !== "ja" ||
    snapshotAfterWorkflowLanguage.summary.ui_direction !== "ltr"
  ) {
    fail("dashboard data endpoint did not keep serving the last valid snapshot after workflow-language apply");
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

  const designPayload = {
    component_id: "tooltip-copy",
    target_scope: "dashboard-control-center",
    theme_accent: "blue",
    density: "balanced",
    radius_scale: "standard",
    typography_scale: "standard",
    technical_affordance_gap: "4px",
    technical_source_max_width: "260px",
    technical_evidence_max_width: "292px",
    technical_preview_chip_max_width: "360px",
    tooltip_trigger: "hover-only",
    tooltip_hide_policy: "pointer-leave",
    tooltip_placement: "top",
    tooltip_max_width: "300px",
    copy_feedback_trigger: "hover-only",
    copy_feedback_hide_policy: "pointer-leave",
    copy_feedback_placement: "top",
    copy_feedback_collision: "shift",
    copy_feedback_duration_ms: "1200",
  };
  const designApplyWithoutPlan = await request(
    "POST",
    "/dashboard-design-system/apply",
    sameOriginHeaders,
    JSON.stringify({ ...designPayload, confirm: true }),
  );
  if (designApplyWithoutPlan.status !== 409) {
    fail(`design-system middleware accepted apply without a current plan token with ${designApplyWithoutPlan.status}`);
  }
  const designPlan = await request(
    "POST",
    "/dashboard-design-system/plan",
    sameOriginHeaders,
    JSON.stringify(designPayload),
  );
  if (designPlan.status !== 200) {
    fail(`design-system plan middleware failed with ${designPlan.status}: ${designPlan.body}`);
  }
  const designPlanJson = parseJson(designPlan, "design-system plan middleware");
  if (designPlanJson.status !== "ready" || designPlanJson.applied !== false || !/^[0-9a-f-]{36}$/i.test(String(designPlanJson.plan_token || ""))) {
    fail("design-system plan middleware did not return a one-time plan token");
  }
  const designApply = await request(
    "POST",
    "/dashboard-design-system/apply",
    sameOriginHeaders,
    JSON.stringify({ ...designPayload, plan_token: designPlanJson.plan_token, confirm: true }),
  );
  if (designApply.status !== 200) {
    fail(`design-system apply middleware failed with ${designApply.status}: ${designApply.body}`);
  }
  const designApplyJson = parseJson(designApply, "design-system apply middleware");
  if (designApplyJson.status !== "passed" || designApplyJson.applied !== true) {
    fail("design-system apply middleware returned an unexpected payload");
  }
  const designReplay = await request(
    "POST",
    "/dashboard-design-system/apply",
    sameOriginHeaders,
    JSON.stringify({ ...designPayload, plan_token: designPlanJson.plan_token, confirm: true }),
  );
  if (designReplay.status !== 409) {
    fail(`design-system middleware accepted a replayed plan token with ${designReplay.status}`);
  }
})().catch((error) => fail(error.message));
NODE
}

run_vite_settings_middleware_check

if grep -Eq 'npm run dashboard:dev|--port <port>|Data snapshot:' "$ROOT/tools/dashboard-control-center"; then
  printf 'dashboard-control-center ordinary entry leaks npm, port selection, or data snapshot details\n' >&2
  exit 1
fi

if ! grep -q 'port_is_listening "$DEFAULT_PORT"' "$ROOT/tools/dashboard-control-center" || ! grep -q 'already running through maintained tooling' "$ROOT/tools/dashboard-control-center"; then
  printf 'dashboard-control-center open entry must be idempotent when the maintained port is already running\n' >&2
  exit 1
fi

if ! grep -q -- '--strictPort' "$ROOT/tools/dashboard-control-center"; then
  printf 'dashboard-control-center open entry must not fall through to a second Vite port\n' >&2
  exit 1
fi

if grep -q -- '--open' "$ROOT/tools/dashboard-control-center" || ! grep -q 'open_dashboard_when_ready' "$ROOT/tools/dashboard-control-center"; then
  printf 'dashboard-control-center open entry must not delegate browser opening to Vite\n' >&2
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

if ! grep -q 'execFile(' "$ROOT/vite.config.mjs" || ! grep -q 'dashboard-settings' "$ROOT/vite.config.mjs" || ! grep -q 'dashboard-design-system' "$ROOT/vite.config.mjs"; then
  printf 'dashboard-control-center mutation middleware must call approved tools through execFile\n' >&2
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
  if ! grep -q '"/dashboard-settings/plan"' "$ROOT/dashboard-control-center/src/dashboardData.js" \
    || ! grep -q '"/dashboard-settings/apply"' "$ROOT/dashboard-control-center/src/dashboardData.js" \
    || ! grep -q '"/dashboard-design-system/plan"' "$ROOT/dashboard-control-center/src/dashboardData.js" \
    || ! grep -q '"/dashboard-design-system/apply"' "$ROOT/dashboard-control-center/src/dashboardData.js"; then
    printf 'dashboard-control-center POST fetches must be limited to approved Settings and Design Studio plan/apply endpoints\n' >&2
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
