import fs from "node:fs";
import { execFile } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

import { DASHBOARD_LOCALE_CODES } from "./dashboard-control-center/src/i18n.js";

const repoRoot = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.join(repoRoot, "dashboard-control-center");
const runtimeRoot = path.join(repoRoot, ".dashboard-control-center");
const settingsToolPath = path.join(repoRoot, "tools", "dashboard-settings");
const allowedStates = new Set(["missing", "ready", "passed", "failed", "blocked", "unknown", "approval_required", "optional", "cached", "not_run", "stale", "manual_required", "not_applicable"]);
const riskLevels = new Set(["low", "medium", "high", "critical"]);
const partialFailureStates = new Set(["failed", "blocked", "unknown"]);
const manualFollowupStates = new Set(["optional", "cached", "unknown"]);
const settingScopes = new Set(["selected_context", "learning", "workflow", "security", "repository", "dashboard"]);
const settingsRelatedPages = new Set(["#overview", "#lessons", "#workflow", "#maintenance", "#safety", "#repository-info", "#documents", "#settings", "#history", "#help"]);
const dashboardUiLocales = new Set(DASHBOARD_LOCALE_CODES);
const dashboardUiDirections = new Set(["ltr", "rtl"]);
const languageCodePattern = /^[A-Za-z]{2,3}(?:-[A-Za-z0-9]{2,8})?$|^custom$/;
let lastDashboardDataValidationError = "";

function validationFailure(reason) {
  lastDashboardDataValidationError = reason;
  return false;
}

export function dashboardDataValidationError() {
  return lastDashboardDataValidationError;
}

function isObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function nonEmptyString(value) {
  return typeof value === "string" && value.length > 0;
}

function safeRelativePath(value) {
  if (typeof value !== "string" || !value) {
    return false;
  }
  return (
    !value.startsWith("/") &&
    !value.startsWith("\\") &&
    !/^[A-Za-z]:[\\/]/.test(value) &&
    !value.split(/[\\/]+/).includes("..")
  );
}

function safeScopedRelativePath(value) {
  if (typeof value !== "string") {
    return false;
  }
  return value.startsWith("product:") ? safeRelativePath(value.slice("product:".length)) : safeRelativePath(value);
}

function validateSettingsCatalog(settings) {
  if (settings === undefined || settings === null) {
    return true;
  }
  if (!isObject(settings) || (settings.status !== undefined && !allowedStates.has(String(settings.status || "")))) {
    return validationFailure("invalid_settings_root");
  }
  const groupIds = new Set();
  const groups = Array.isArray(settings.groups) ? settings.groups : [];
  for (const group of groups) {
    if (!isObject(group)) {
      return validationFailure("invalid_settings_group:object");
    }
    const groupId = String(group.id || "unknown");
    if (!nonEmptyString(group.id) || !nonEmptyString(group.label_key) || !nonEmptyString(group.description_key)) {
      return validationFailure(`invalid_settings_group:${groupId}:text`);
    }
    if (!allowedStates.has(String(group.status || ""))) {
      return validationFailure(`invalid_settings_group:${groupId}:status`);
    }
    if (!Number.isInteger(group.order) || group.order <= 0) {
      return validationFailure(`invalid_settings_group:${groupId}:order`);
    }
    if (groupIds.has(group.id)) {
      return validationFailure(`invalid_settings_group:${groupId}:duplicate`);
    }
    groupIds.add(group.id);
  }
  const itemIds = new Set();
  const items = Array.isArray(settings.items) ? settings.items : [];
  for (const item of items) {
    if (!isObject(item)) {
      return validationFailure("invalid_settings_item:object");
    }
    const itemId = String(item.id || "unknown");
    if (!nonEmptyString(item.id)) {
      return validationFailure("invalid_settings_item:missing_id");
    }
    if (itemIds.has(item.id)) {
      return validationFailure(`invalid_settings_item:${itemId}:duplicate`);
    }
    if (groupIds.size > 0 && !groupIds.has(item.group_id)) {
      return validationFailure(`invalid_settings_item:${itemId}:group`);
    }
    if (!settingScopes.has(String(item.scope || ""))) {
      return validationFailure(`invalid_settings_item:${itemId}:scope`);
    }
    if (!nonEmptyString(item.label_key) || !nonEmptyString(item.description_key)) {
      return validationFailure(`invalid_settings_item:${itemId}:text`);
    }
    if (!nonEmptyString(item.current_value) || !nonEmptyString(item.current_label)) {
      return validationFailure(`invalid_settings_item:${itemId}:current_value`);
    }
    if (!allowedStates.has(String(item.status || ""))) {
      return validationFailure(`invalid_settings_item:${itemId}:status`);
    }
    if (!safeScopedRelativePath(item.source_file)) {
      return validationFailure(`invalid_settings_item:${itemId}:source_file`);
    }
    if (!Array.isArray(item.allowed_values)) {
      return validationFailure(`invalid_settings_item:${itemId}:allowed_values`);
    }
    if (typeof item.editable !== "boolean" || typeof item.reviewable !== "boolean") {
      return validationFailure(`invalid_settings_item:${itemId}:booleans`);
    }
    if (!riskLevels.has(String(item.risk_level || ""))) {
      return validationFailure(`invalid_settings_item:${itemId}:risk`);
    }
    if (typeof item.requires_confirmation !== "boolean") {
      return validationFailure(`invalid_settings_item:${itemId}:confirmation`);
    }
    if (!nonEmptyString(item.disabled_reason_key)) {
      return validationFailure(`invalid_settings_item:${itemId}:disabled_reason`);
    }
    if (!settingsRelatedPages.has(String(item.related_page || ""))) {
      return validationFailure(`invalid_settings_item:${itemId}:related_page`);
    }
    if (!nonEmptyString(item.update_action_id)) {
      return validationFailure(`invalid_settings_item:${itemId}:update_action`);
    }
    if (!isObject(item.review)) {
      return validationFailure(`invalid_settings_item:${itemId}:review_object`);
    }
    if (!nonEmptyString(item.review.impact_key) || !safeScopedRelativePath(item.review.target_file) || !allowedStates.has(String(item.review.validation_status || "")) || !nonEmptyString(item.review.update_preview_key)) {
      return validationFailure(`invalid_settings_item:${itemId}:review`);
    }
    if (item.editable) {
      if (!item.reviewable || !["learning", "workflow"].includes(String(item.scope || "")) || item.allowed_values.length === 0 || item.requires_confirmation !== true || String(item.source_file || "").startsWith("product:")) {
        return validationFailure(`invalid_settings_item:${itemId}:editable_contract`);
      }
    }
    itemIds.add(item.id);
  }
  return true;
}

function validateSummaryLocale(summary) {
  const workflowLanguage = String(summary.workflow_language || "");
  const displayLocale = String(summary.display_locale || "");
  const uiLocale = String(summary.ui_locale || "");
  const uiDirection = String(summary.ui_direction || "");
  if (!workflowLanguage && !displayLocale && !uiLocale && !uiDirection) {
    return true;
  }
  return (
    nonEmptyString(workflowLanguage) &&
    nonEmptyString(displayLocale) &&
    nonEmptyString(uiLocale) &&
    nonEmptyString(uiDirection) &&
    languageCodePattern.test(workflowLanguage) &&
    languageCodePattern.test(displayLocale) &&
    displayLocale === workflowLanguage &&
    dashboardUiLocales.has(uiLocale) &&
    dashboardUiDirections.has(uiDirection) &&
    ((uiLocale === "ar") === (uiDirection === "rtl"))
  );
}

function realpathInside(child, parent) {
  const realChild = fs.realpathSync.native(child);
  const realParent = fs.realpathSync.native(parent);
  return realChild === realParent || realChild.startsWith(`${realParent}${path.sep}`);
}

export function dashboardDataFile() {
  const configuredFile = process.env.DASHBOARD_CONTROL_CENTER_DATA_FILE;
  if (!configuredFile) {
    return null;
  }
  const resolvedFile = path.resolve(repoRoot, configuredFile);
  try {
    if (!fs.statSync(resolvedFile).isFile()) {
      return null;
    }
    if (!fs.existsSync(runtimeRoot) || !realpathInside(resolvedFile, runtimeRoot)) {
      return null;
    }
  } catch {
    return null;
  }
  return resolvedFile;
}

export function validateDashboardData(body) {
  lastDashboardDataValidationError = "";
  let data;
  try {
    data = JSON.parse(body);
  } catch {
    return validationFailure("invalid_json");
  }
  if (!data || typeof data !== "object" || !/^[0-9]+\.[0-9]+\.[0-9]+$/.test(String(data.schema_version || ""))) {
    return validationFailure("invalid_schema_version");
  }
  if (
    typeof data.generated_at !== "string" ||
    typeof data.snapshot_id !== "string" ||
    typeof data.content_hash !== "string" ||
    !/^[a-f0-9]{64}$/.test(data.content_hash) ||
    !data.snapshot_id.startsWith(`${data.generated_at}-`) ||
    !data.snapshot_id.endsWith(data.content_hash.slice(0, 12))
  ) {
    return validationFailure("invalid_snapshot_identity");
  }
  if (!Array.isArray(data.source_commands) || !data.source_commands.includes("tools/dashboard-data")) {
    return validationFailure("missing_dashboard_data_source_command");
  }
  if (data.source_commands.some((command) => /^(\.\/)?tools\/dashboard(\s|$)/.test(String(command)))) {
    return validationFailure("unsafe_dashboard_source_command");
  }
  for (const key of ["summary", "lessons", "development", "maintenance", "git_workflow", "security", "actions"]) {
    if (!isObject(data[key])) {
      return validationFailure(`missing_object:${key}`);
    }
  }
  if (!["learning", "development", "maintenance", "unknown"].includes(String(data.summary.mode || ""))) {
    return validationFailure("invalid_summary_mode");
  }
  if (!validateSummaryLocale(data.summary)) {
    return validationFailure("invalid_summary_locale");
  }
  const primaryAction = data.summary.primary_action;
  if (
    !isObject(primaryAction) ||
    !["title", "description", "target", "expected_result", "source"].every((field) => nonEmptyString(primaryAction[field])) ||
    !riskLevels.has(String(primaryAction.risk_level || "")) ||
    !allowedStates.has(String(primaryAction.status || ""))
  ) {
    return validationFailure("invalid_primary_action");
  }
  const metrics = data.summary.category_metrics;
  for (const key of ["overview", "lessons", "workflow", "maintenance", "security"]) {
    const metric = metrics?.[key];
    if (
      !metric ||
      typeof metric !== "object" ||
      !Number.isInteger(metric.total) ||
      !Number.isInteger(metric.healthy) ||
      !Number.isInteger(metric.warning) ||
      !Number.isInteger(metric.problem) ||
      !Number.isInteger(metric.percent) ||
      metric.total !== metric.healthy + metric.warning + metric.problem ||
      metric.percent < 0 ||
      metric.percent > 100 ||
      !nonEmptyString(metric.unit) ||
      !allowedStates.has(String(metric.status || ""))
    ) {
      return validationFailure(`invalid_category_metric:${key}`);
    }
  }
  if (!Array.isArray(data.partial_failures) || data.partial_failures.some((failure) => !isObject(failure) || !partialFailureStates.has(String(failure.status || "")))) {
    return validationFailure("invalid_partial_failures");
  }
  if (
    !Array.isArray(data.summary.manual_followups) ||
    data.summary.manual_followups.some((followup) => !isObject(followup) || !manualFollowupStates.has(String(followup.status || "")))
  ) {
    return validationFailure("invalid_manual_followups");
  }
  if (!validateSettingsCatalog(data.settings)) {
    return validationFailure(lastDashboardDataValidationError || "invalid_settings_catalog");
  }
  const workflowLanguageItem = Array.isArray(data.settings?.items) ? data.settings.items.find((item) => item?.id === "workflow_language") : null;
  if (workflowLanguageItem && data.summary.workflow_language && workflowLanguageItem.current_value !== data.summary.workflow_language) {
    return validationFailure("workflow_language_summary_mismatch");
  }
  const previews = Array.isArray(data.actions?.command_previews) ? data.actions.command_previews : [];
  for (const preview of previews) {
    if (
      !preview ||
      typeof preview !== "object" ||
      preview.execution_mode !== "preview_only" ||
      preview.non_executable !== true ||
      !riskLevels.has(String(preview.risk_level || "")) ||
      typeof preview.requires_approval !== "boolean"
    ) {
      return validationFailure("invalid_command_preview");
    }
  }
  return true;
}

function sendJson(response, statusCode, payload) {
  response.statusCode = statusCode;
  response.setHeader("cache-control", "no-store");
  response.setHeader("content-type", "application/json; charset=utf-8");
  response.end(JSON.stringify(payload));
}

function safeSettingsToken(value) {
  return typeof value === "string" && /^[A-Za-z0-9_.:-]+$/.test(value) ? value : "";
}

export function requestHasJsonContentType(request) {
  const contentType = String(request.headers["content-type"] || "").toLowerCase();
  return contentType.split(";")[0].trim() === "application/json";
}

export function requestIsSameOrigin(request) {
  const host = String(request.headers.host || "");
  const origin = String(request.headers.origin || "");
  const fetchSite = String(request.headers["sec-fetch-site"] || "").toLowerCase();

  if (!host) {
    return false;
  }
  if (fetchSite && !["same-origin", "none"].includes(fetchSite)) {
    return false;
  }
  if (!origin) {
    return fetchSite === "same-origin" || fetchSite === "none";
  }

  try {
    const originUrl = new URL(origin);
    return ["http:", "https:"].includes(originUrl.protocol) && originUrl.host === host;
  } catch {
    return false;
  }
}

function readSettingsJsonBody(request) {
  return new Promise((resolve, reject) => {
    let body = "";
    request.setEncoding("utf8");
    request.on("data", (chunk) => {
      body += chunk;
      if (body.length > 8192) {
        reject(new Error("settings request body is too large"));
        request.destroy();
      }
    });
    request.on("end", () => {
      try {
        resolve(JSON.parse(body || "{}"));
      } catch {
        reject(new Error("settings request body must be JSON"));
      }
    });
    request.on("error", reject);
  });
}

function dashboardSettingsMutationMiddleware(command) {
  return async (request, response) => {
    if (request.method !== "POST") {
      response.statusCode = 405;
      response.end("method not allowed");
      return;
    }
    if (!requestHasJsonContentType(request)) {
      sendJson(response, 415, { error: "settings mutation requires application/json" });
      return;
    }
    if (!requestIsSameOrigin(request)) {
      sendJson(response, 403, { error: "settings mutation requires same-origin dashboard access" });
      return;
    }

    let payload;
    try {
      payload = await readSettingsJsonBody(request);
    } catch (error) {
      sendJson(response, 400, { error: error.message });
      return;
    }

    const allowedPayloadKeys = new Set(["setting_id", "value", "menu_id", "confirm"]);
    if (!payload || typeof payload !== "object" || Array.isArray(payload) || Object.keys(payload).some((key) => !allowedPayloadKeys.has(key))) {
      sendJson(response, 400, { error: "settings request contains unsupported fields" });
      return;
    }

    const settingId = safeSettingsToken(payload.setting_id);
    const value = safeSettingsToken(payload.value);
    const menuId = safeSettingsToken(payload.menu_id || "step_1_14");
    if (!settingId || !value || !menuId) {
      sendJson(response, 400, { error: "settings request contains an invalid setting id, value, or menu id" });
      return;
    }
    if (command === "apply" && payload.confirm !== true) {
      sendJson(response, 400, { error: "settings apply requires explicit confirmation" });
      return;
    }

    const dataFile = dashboardDataFile() || path.join(runtimeRoot, "dashboard-data.json");
    const args = [command, settingId, value, "--menu", menuId];
    if (command === "apply") {
      args.push("--snapshot", dataFile, "--confirm");
    }

    execFile(
      settingsToolPath,
      args,
      {
        cwd: repoRoot,
        env: {
          ...process.env,
          DASHBOARD_SELECTED_MENU_ID: menuId,
          DASHBOARD_CONTROL_CENTER_DATA_FILE: dataFile,
        },
        maxBuffer: 1024 * 1024,
      },
      (error, stdout, stderr) => {
        if (error) {
          sendJson(response, 422, { error: String(stderr || error.message).trim() || "settings update failed" });
          return;
        }
        try {
          const parsed = JSON.parse(stdout);
          sendJson(response, 200, parsed);
        } catch {
          sendJson(response, 502, { error: "settings tool returned invalid JSON" });
        }
      },
    );
  };
}

function dashboardDataFilePlugin() {
  return {
    name: "dashboard-control-center-data-file",
    configureServer(server) {
      server.middlewares.use("/dashboard-settings/plan", dashboardSettingsMutationMiddleware("plan"));
      server.middlewares.use("/dashboard-settings/apply", dashboardSettingsMutationMiddleware("apply"));
      server.middlewares.use("/dashboard-data.json", (request, response, next) => {
        const dataFile = dashboardDataFile();
        if (!dataFile) {
          response.statusCode = 503;
          response.setHeader("content-type", "application/json; charset=utf-8");
          response.end(JSON.stringify({ error: "dashboard data is unavailable" }));
          return;
        }
        if (request.method !== "GET" && request.method !== "HEAD") {
          response.statusCode = 405;
          response.end("method not allowed");
          return;
        }
        fs.readFile(dataFile, "utf8", (error, body) => {
          if (error) {
            response.statusCode = 503;
            response.setHeader("content-type", "application/json; charset=utf-8");
            response.end(JSON.stringify({ error: "dashboard data is unavailable" }));
            return;
          }
          if (!validateDashboardData(body)) {
            response.statusCode = 422;
            response.setHeader("content-type", "application/json; charset=utf-8");
            response.end(JSON.stringify({ error: "dashboard data failed validation" }));
            return;
          }
          response.statusCode = 200;
          response.setHeader("cache-control", "no-store");
          response.setHeader("content-type", "application/json; charset=utf-8");
          response.end(request.method === "HEAD" ? "" : body);
        });
      });
    },
  };
}

export default defineConfig({
  root: appRoot,
  base: "./",
  plugins: [react(), dashboardDataFilePlugin()],
  build: {
    outDir: path.join(repoRoot, "dist/dashboard-control-center"),
    emptyOutDir: true,
  },
  server: {
    host: "127.0.0.1",
  },
});
