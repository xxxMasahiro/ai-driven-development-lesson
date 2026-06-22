import { DASHBOARD_LOCALE_CODES } from "./localePolicy.js";
import { DASHBOARD_DISPLAY_DEPTHS } from "./displayDepth.js";

export const ALLOWED_STATES = new Set([
  "missing",
  "ready",
  "passed",
  "failed",
  "blocked",
  "unknown",
  "approval_required",
  "optional",
  "cached",
  "not_run",
  "stale",
  "manual_required",
  "not_applicable",
]);

export const RISK_LEVELS = new Set(["low", "medium", "high", "critical"]);
export const MANUAL_FOLLOWUP_STATES = new Set(["optional", "cached", "unknown"]);
export const PARTIAL_FAILURE_STATES = new Set(["failed", "blocked", "unknown"]);
export const PRODUCT_OPERATION_BLOCKER_STATES = new Set(["missing", "failed", "blocked", "unknown", "stale", "not_run"]);
export const DASHBOARD_UI_LOCALES = new Set(DASHBOARD_LOCALE_CODES);
export const DASHBOARD_UI_DIRECTIONS = new Set(["ltr", "rtl"]);

const SECRET_PATTERN =
  /(SECRET|TOKEN|API_KEY|PASSWORD|PRIVATE_KEY)\s*[:=]\s*[^\s#]{8,}|Authorization:\s*Bearer\s+[A-Za-z0-9._-]{16,}|Bearer\s+eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}|gh[pousr]_[A-Za-z0-9_]{20,}|sk-[A-Za-z0-9]{20,}|AKIA[0-9A-Z]{16}|BEGIN (RSA |OPENSSH |EC |DSA )?PRIVATE KEY/i;
const RAW_ABSOLUTE_PATH_PATTERN = /(^|\s)(\/(?:home|tmp|mnt|var|etc|root|opt|Users)\/|[A-Za-z]:[\\/]|\\\\[^\s\\]+[\\/])/;
const SIGNED_PRIVATE_URL_PATTERN = /https?:\/\/[^\s"'<>]*(?:X-Amz-Signature|X-Goog-Signature|signature=|sig=|token=|access_token=)[^\s"'<>]*/i;
const COMMAND_TOKEN_PATTERN = /^(\[absolute-path\]|\.[/][A-Za-z0-9._/-]+|[A-Za-z0-9._:@/%+=,\-[\]]+)$/;

const MENU_IDS = new Set([
  "step_1_7",
  "step_1_14",
  "advanced",
  "free-development",
  "product-improvement",
  "external-integration",
  "lesson-repository-improvement",
  "unknown",
]);

const WORKFLOW_CONTEXTS = new Set([
  "none",
  "lesson",
  "free-development",
  "product-improvement",
  "external-integration",
  "lesson-maintenance",
  "custom",
  "unknown",
]);

const REPOSITORY_PATH_STATES = new Set(["configured", "missing", "not_applicable", "unknown"]);
const PRODUCT_TYPES = new Set(["all", "web", "api", "cli", "library", "integration", "custom", "unknown"]);
const PRODUCT_GIT_USAGE_MODES = new Set(["none", "local", "remote_sync", "ci", "not_applicable"]);
const PRODUCT_GIT_REQUIREMENTS = new Set(["required", "not_applicable", "unknown"]);
const EVIDENCE_FRESHNESS_STATES = new Set(["current", "stale", "not_collected", "unknown"]);
const EVIDENCE_AUTHORITIES = new Set(["authoritative", "manual_required", "advisory", "not_collected"]);
const EVIDENCE_CONFIDENCE_LEVELS = new Set(["high", "medium", "low", "unknown"]);
const PRODUCT_HEAD_PATTERN = /^(none|not_collected|[a-f0-9]{7,64})$/i;
const LIVE_CHECK_KEYS = ["local_tests", "git_sync", "ci", "security"];
const LIVE_DETAIL_PAGES = new Set(["#workflow", "#maintenance", "#safety", "#repository-info", "#documents", "#history", "#help"]);
const CI_HEAD_MATCH_STATES = new Set(["matched", "different", "unknown"]);
const RUNTIME_ACTIVITY_CATEGORIES = new Set(["ai_agent", "browser_review", "control_center", "data_refresh", "git", "ci", "test", "build", "check", "other"]);
const RUNTIME_ACTIVITY_STATES = new Set(["running", "exited", "unknown"]);
const RUNTIME_ACTIVITY_CWD_ROLES = new Set(["lesson_repository", "product_repository", "unknown"]);
const RUNTIME_REDACTION_STATES = new Set(["redacted"]);
const AGENT_OBSERVATION_REDACTION_STATES = new Set(["redacted"]);
const AGENT_OBSERVATION_AUTHORITY = new Set(["authoritative", "manual_required", "advisory", "not_collected"]);
const AGENT_OBSERVATION_FRESHNESS = new Set(["current", "stale", "not_collected", "unknown"]);
const DECISION_PAGE_IDS = new Set(["overview", "lessons", "workflow", "maintenance", "safety", "repository-info", "documents", "settings", "history"]);
const DECISION_PAGE_TARGETS = new Set(["#overview", "#lessons", "#workflow", "#maintenance", "#safety", "#repository-info", "#documents", "#settings", "#history"]);
const OVERVIEW_DETAIL_PAGES = new Set([...DECISION_PAGE_TARGETS, "#help"]);
const OVERVIEW_SECTION_IDS = new Set(["overall", "current_work", "docs_sync", "task_tracker", "handoff", "git_pr_ci", "tests", "safety", "blockers", "next_safe_action"]);
const DECISION_AUDIENCES = new Set(["non_engineer", "junior_engineer"]);
const DECISION_OWNER_SOURCES = new Set(["dashboard-data", "product-authority", "git-workflow", "repository-development-workflow"]);
const DECISION_COMMAND_EXECUTION_MODES = new Set(["preview_only"]);
const REPOSITORY_DEVELOPMENT_PHASES = new Set(["context_triage", "proposal", "implementation_plan", "fast_loop", "mid_tests", "release_gate", "main_sync_cleanup"]);
const REPOSITORY_DEVELOPMENT_RUNNER_RECORD_STATUSES = new Set(["missing", "current", "stale"]);
const CI_EVIDENCE_ROLES = new Set(["branch_ci", "pr_ci", "main_ci", "local_tests", "provider_visibility"]);
const DOCUMENT_AUDIENCES = new Set(["non_engineer", "engineer", "all"]);
const DOCUMENT_RELATED_PAGES = new Set(["#documents", "#maintenance", "#workflow", "#safety", "#repository-info", "#history"]);
const DOCUMENT_SUMMARY_PROVIDER_MODES = new Set(["local_summary", "subscription_agent", "api_key", "unknown"]);
const LIVE_AGENT_LOCALIZATION_PROVIDER_MODES = DOCUMENT_SUMMARY_PROVIDER_MODES;
const LOCALIZED_TEXT_OBJECT_KEYS = new Set([...DASHBOARD_LOCALE_CODES, "key"]);
const SETTING_SCOPES = new Set(["selected_context", "learning", "workflow", "security", "repository", "dashboard"]);
const SETTINGS_RELATED_PAGES = new Set(["#overview", "#lessons", "#workflow", "#maintenance", "#safety", "#repository-info", "#documents", "#settings", "#history", "#help"]);
const PRODUCT_REPOSITORY_REGISTRY_CONTEXTS = new Set(["free-development", "product-improvement", "external-integration"]);
const REPOSITORY_SELECTION_STATES = new Set(["none", "explicit", "fallback", "request", "not_applicable"]);
const REPOSITORY_REGISTRATION_SOURCES = new Set(["explicit", "discover", "legacy", "unknown"]);
const SECURITY_BOUNDARY_STATES = new Set(["closed", "open", "approval_required", "unknown"]);
const SECURITY_DISPLAY_POLICY_STATES = new Set(["do_not_display", "redact", "safe", "recommended", "unknown"]);
const SECURITY_CONFIRMATION_ACTION_STATES = new Set(["safe", "recommended", "approval_required", "blocked", "unknown"]);
const SECURITY_CONFIRMATION_RECEIPT_STATES = new Set(["closed", "open", "not_configured", "unknown"]);
const SECURITY_UNSAFE_COMMAND_POLICY_STATES = new Set(["display_only", "blocked", "approval_required", "unknown"]);
const MAINTENANCE_ACTION_TYPES = new Set(["immediate", "later", "blocked"]);
const MAINTENANCE_GIT_ACTIONS = new Set(["none", "commit_or_discard", "pull_required", "push_required", "reconcile_diverged", "select_repository", "not_applicable"]);
const LANGUAGE_CODE_PATTERN = /^[A-Za-z]{2,3}(?:-[A-Za-z0-9]{2,8})?$|^custom$/;
const LIVE_PARTIAL_FAILURE_SOURCES = new Set([
  "as_built_sync_live",
  "workflow_pair_live",
  "git_workflow_gate_live",
  "product_git_sync_live",
  "product_ci_live",
  "product_security_gate_live",
]);
const DASHBOARD_DATA_FETCH_TIMEOUT_MS = 10000;
const DASHBOARD_LIVE_STATUS_FETCH_TIMEOUT_MS = 10000;

function safeRelativePath(value) {
  if (typeof value !== "string") {
    return "";
  }
  const normalized = value.replace(/[\u0000-\u001f]/g, "").trim();
  if (
    !normalized ||
    normalized.startsWith("/") ||
    normalized.startsWith("\\") ||
    /^[A-Za-z]:[\\/]/.test(normalized) ||
    normalized.split(/[\\/]+/).some((part) => part === "..")
  ) {
    return "";
  }
  return normalized;
}

function safeRelativePathList(value) {
  const paths = displayText(value, "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  if (!paths.length) {
    return [];
  }
  const normalized = paths.map((item) => safeRelativePath(item));
  return normalized.length === paths.length && normalized.every(Boolean) ? normalized : [];
}

function safeScopedRelativePath(value) {
  if (typeof value !== "string") {
    return "";
  }
  if (/^[A-Za-z][A-Za-z0-9+.-]*:\/\//.test(value)) {
    return "";
  }
  if (value.startsWith("product:")) {
    return safeRelativePath(value.slice("product:".length));
  }
  if (value.includes(":")) {
    return "";
  }
  return safeRelativePath(value);
}

function safeScopedReferenceList(value) {
  if (typeof value !== "string" || !value.trim()) {
    return "";
  }
  const references = value
    .split(/[;,]/)
    .map((item) => item.trim())
    .filter(Boolean);
  if (!references.length) {
    return "";
  }
  return references.every((item) => item === "not_collected" || item === "not_applicable" || item === "none" || safeScopedRelativePath(item)) ? references.join(";") : "";
}

function safeDisplayCommand(value) {
  if (typeof value !== "string") {
    return "";
  }
  const normalized = value.replace(/[\u0000-\u001f]/g, "").replace(/\s+/g, " ").trim();
  if (!normalized || /[;&|`$<>\\]/.test(normalized)) {
    return "";
  }
  return /^tools\/[A-Za-z0-9._-]+(?: [A-Za-z0-9._:@/%+=,-]+)*$/.test(normalized) ? normalized : "";
}

function safeRuntimePreview(value) {
  if (typeof value !== "string") {
    return "";
  }
  const normalized = value.replace(/[\u0000-\u001f]/g, "").replace(/\s+/g, " ").trim();
  if (!normalized || normalized.length > 160 || SECRET_PATTERN.test(normalized)) {
    return "";
  }
  if (/(^|\s)(\/|[A-Za-z]:[\\/]|\\\\)/.test(normalized)) {
    return "";
  }
  return normalized;
}

function isDashboardWarningValuePath(label) {
  return /^dashboard data\.warnings\[\d+\]$/.test(label);
}

function assertNoUnsafeDashboardValue(value, label = "dashboard data", seen = new Set()) {
  if (value === null || value === undefined) {
    return;
  }
  if (typeof value === "string") {
    if ((SECRET_PATTERN.test(value) && !isDashboardWarningValuePath(label)) || RAW_ABSOLUTE_PATH_PATTERN.test(value) || SIGNED_PRIVATE_URL_PATTERN.test(value)) {
      throw new Error(`${label} contains unsafe raw value`);
    }
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) => assertNoUnsafeDashboardValue(item, `${label}[${index}]`, seen));
    return;
  }
  if (typeof value === "object") {
    if (seen.has(value)) {
      return;
    }
    seen.add(value);
    for (const [key, nested] of Object.entries(value)) {
      assertNoUnsafeDashboardValue(nested, `${label}.${key}`, seen);
    }
  }
}

function safeCommandPreviewToken(value) {
  if (typeof value !== "string") {
    return "";
  }
  const normalized = value.replace(/[\u0000-\u001f]/g, "").trim();
  if (!normalized || normalized.length > 160 || SECRET_PATTERN.test(normalized) || RAW_ABSOLUTE_PATH_PATTERN.test(normalized) || SIGNED_PRIVATE_URL_PATTERN.test(normalized)) {
    return "";
  }
  if (/[;&|`$<>]/.test(normalized) || /\s/.test(normalized)) {
    return "";
  }
  return COMMAND_TOKEN_PATTERN.test(normalized) ? normalized : "";
}

function safeCommandPreviewText(value) {
  if (typeof value !== "string") {
    return "";
  }
  const normalized = value.replace(/[\u0000-\u001f]/g, "").replace(/\s+/g, " ").trim();
  if (!normalized || normalized.length > 240 || SECRET_PATTERN.test(normalized) || RAW_ABSOLUTE_PATH_PATTERN.test(normalized) || SIGNED_PRIVATE_URL_PATTERN.test(normalized)) {
    return "";
  }
  if (/[;&|`$<>]/.test(normalized)) {
    return "";
  }
  return normalized;
}

function safeDesignStudioScopedPath(value) {
  if (typeof value !== "string") {
    return "";
  }
  if (value.startsWith("product:")) {
    const productPath = safeRelativePath(value.slice("product:".length));
    return productPath ? `product:${productPath}` : "";
  }
  return safeRelativePath(value);
}

function safeDesignStudioCheckReference(value) {
  if (safeDisplayCommand(value)) {
    return displayText(value, "");
  }
  if (typeof value !== "string") {
    return "";
  }
  const normalized = value.replace(/[\u0000-\u001f]/g, "").trim();
  if (!normalized || /[;&|`$<>\\/\s]/.test(normalized) || SECRET_PATTERN.test(normalized)) {
    return "";
  }
  return /^[A-Za-z0-9._:-]{4,120}$/.test(normalized) ? normalized : "";
}

function safeBrowserDebugCommand(value) {
  if (typeof value !== "string") {
    return "";
  }
  const normalized = value.replace(/[\u0000-\u001f]/g, "").replace(/\s+/g, " ").trim();
  if (
    !normalized ||
    /[;&|`$<>\\]/.test(normalized) ||
    /(^|\s)\/|[A-Za-z]:[\\/]|https?:\/\//.test(normalized)
  ) {
    return "";
  }
  return normalized;
}

export function displayText(value, fallback = "unknown") {
  if (value === null || value === undefined || value === "") {
    return fallback;
  }
  const text = Array.isArray(value) ? value.join(", ") : String(value);
  const normalized = text.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, "").replace(/\s+/g, " ").trim();
  if (!normalized) {
    return fallback;
  }
  if (SECRET_PATTERN.test(normalized)) {
    return "Sensitive text hidden";
  }
  return normalized.replace(/(^|\s)\/[^\s]+/g, "$1[absolute-path]");
}

export function displayKey(value) {
  return displayText(value)
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function validateLocalizedTextObject(value, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} must be a localized object`);
  }
  assertAllowedKeys(value, LOCALIZED_TEXT_OBJECT_KEYS, label);
  if (![...LOCALIZED_TEXT_OBJECT_KEYS].some((key) => displayText(value[key], ""))) {
    throw new Error(`${label} is missing localized text`);
  }
}

export function normalizeState(value) {
  const state = displayText(value, "unknown");
  return ALLOWED_STATES.has(state) ? state : "unknown";
}

export function stateLabelKey(value) {
  return `state.${normalizeState(value)}`;
}

export function normalizeRisk(value) {
  const risk = displayText(value, "low");
  return RISK_LEVELS.has(risk) ? risk : "low";
}

export function asArray(value) {
  if (Array.isArray(value)) {
    return value;
  }
  if (value === null || value === undefined || value === "") {
    return [];
  }
  return [value];
}

export function asObject(value, name = "value") {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${name} must be an object`);
  }
  return value;
}

export function objectEntries(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return [];
  }
  return Object.entries(value);
}

function stableStringify(value) {
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  }
  if (value && typeof value === "object") {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function assertAllowedKeys(object, allowedKeys, label) {
  for (const key of Object.keys(object)) {
    if (!allowedKeys.has(key)) {
      throw new Error(`${label} has unsupported key ${key}`);
    }
  }
}

export function pickFirst(object, keys) {
  if (!object || typeof object !== "object") {
    return undefined;
  }
  return keys.find((key) => object[key] !== undefined);
}

export function validateCommandPreviews(actions) {
  const previews = asArray(actions?.command_previews);
  for (const preview of previews) {
    if (!preview || typeof preview !== "object" || Array.isArray(preview)) {
      throw new Error("dashboard command preview must be an object");
    }
    assertAllowedKeys(
      preview,
      new Set(["command_id", "intent", "target", "risk_level", "requires_approval", "approval_gate_id", "argv", "safe_argv", "argv_redacted", "command_text", "execution_mode", "non_executable", "copy_allowed", "copy_block_reason"]),
      "dashboard command preview",
    );
    if (preview.command_id !== undefined && !/^cmd-[a-f0-9]{12}$/.test(displayText(preview.command_id, ""))) {
      throw new Error("dashboard command preview command_id is invalid");
    }
    for (const key of ["intent", "target", "approval_gate_id", "command_text"]) {
      if (!displayText(preview[key], "")) {
        throw new Error(`dashboard command preview ${key} is missing`);
      }
    }
    if (preview.copy_block_reason !== undefined && !displayText(preview.copy_block_reason, "")) {
      throw new Error("dashboard command preview copy_block_reason is invalid");
    }
    if (displayText(preview.execution_mode, "") !== "preview_only") {
      throw new Error("dashboard command preview execution mode must be preview_only");
    }
    if (preview.non_executable !== true) {
      throw new Error("dashboard command preview must be non-executable");
    }
    if (!RISK_LEVELS.has(displayText(preview.risk_level, ""))) {
      throw new Error("dashboard command preview risk level is invalid");
    }
    if (typeof preview.requires_approval !== "boolean") {
      throw new Error("dashboard command preview approval flag is invalid");
    }
    if ((preview.argv_redacted !== undefined && typeof preview.argv_redacted !== "boolean") || (preview.copy_allowed !== undefined && typeof preview.copy_allowed !== "boolean")) {
      throw new Error("dashboard command preview safety flags are invalid");
    }
    const argv = asArray(preview.argv);
    const safeArgv = preview.safe_argv === undefined ? argv : asArray(preview.safe_argv);
    if (!argv.length || argv.length !== safeArgv.length) {
      throw new Error("dashboard command preview argv contract is invalid");
    }
    for (const token of [...argv, ...safeArgv]) {
      if (!safeCommandPreviewToken(token)) {
        throw new Error("dashboard command preview argv contains unsafe token");
      }
    }
    if (stableStringify(argv) !== stableStringify(safeArgv)) {
      throw new Error("dashboard command preview argv must match safe_argv");
    }
    if (!safeCommandPreviewText(preview.command_text)) {
      throw new Error("dashboard command preview text is unsafe");
    }
    if (preview.copy_allowed === true && (preview.requires_approval === true || preview.argv_redacted === true || displayText(preview.risk_level, "") !== "low")) {
      throw new Error("dashboard command preview copy_allowed contradicts safety state");
    }
  }
}

function validateIdentity(data) {
  if (!displayText(data.snapshot_id, "").startsWith(`${displayText(data.generated_at, "")}-`)) {
    throw new Error("dashboard snapshot_id is invalid");
  }
  if (!/^[a-f0-9]{64}$/.test(displayText(data.content_hash, ""))) {
    throw new Error("dashboard content_hash is invalid");
  }
  if (!displayText(data.snapshot_id, "").endsWith(displayText(data.content_hash, "").slice(0, 12))) {
    throw new Error("dashboard snapshot_id and content_hash do not match");
  }
}

function validatePrimaryAction(summary) {
  const primaryAction = asObject(summary.primary_action, "dashboard primary action");
  for (const key of ["title", "description", "target", "expected_result", "source"]) {
    if (!displayText(primaryAction[key], "")) {
      throw new Error(`dashboard primary action is missing ${key}`);
    }
  }
  if (!RISK_LEVELS.has(displayText(primaryAction.risk_level, ""))) {
    throw new Error("dashboard primary action risk level is invalid");
  }
  if (!ALLOWED_STATES.has(displayText(primaryAction.status, ""))) {
    throw new Error("dashboard primary action status is invalid");
  }
}

function validateOverviewSections(summary) {
  if (summary.overview_sections === undefined) {
    return;
  }
  const sections = asArray(summary.overview_sections);
  const seen = new Set();
  for (const section of sections) {
    const row = asObject(section, "dashboard overview section");
    assertAllowedKeys(row, new Set(["id", "title_key", "status", "value", "detail", "source_id", "owner_source", "freshness_state", "authority", "detail_page", "required_command"]), "dashboard overview section");
    const id = displayText(row.id, "");
    if (!OVERVIEW_SECTION_IDS.has(id) || seen.has(id)) {
      throw new Error("dashboard overview section id is invalid");
    }
    seen.add(id);
    for (const key of ["title_key", "value", "detail", "source_id", "required_command"]) {
      if (!displayText(row[key], "")) {
        throw new Error(`dashboard overview section ${id}.${key} is missing`);
      }
    }
    if (!ALLOWED_STATES.has(displayText(row.status, ""))) {
      throw new Error("dashboard overview section status is invalid");
    }
    if (!DECISION_OWNER_SOURCES.has(displayText(row.owner_source, ""))) {
      throw new Error("dashboard overview section owner_source is invalid");
    }
    if (!EVIDENCE_FRESHNESS_STATES.has(displayText(row.freshness_state, ""))) {
      throw new Error("dashboard overview section freshness_state is invalid");
    }
    if (!EVIDENCE_AUTHORITIES.has(displayText(row.authority, ""))) {
      throw new Error("dashboard overview section authority is invalid");
    }
    if (!OVERVIEW_DETAIL_PAGES.has(displayText(row.detail_page, ""))) {
      throw new Error("dashboard overview section detail_page is invalid");
    }
    if (displayText(row.required_command, "") !== "not_applicable" && !safeCommandPreviewText(row.required_command)) {
      throw new Error("dashboard overview section required_command is unsafe");
    }
  }
  for (const id of OVERVIEW_SECTION_IDS) {
    if (!seen.has(id)) {
      throw new Error(`dashboard overview section is missing: ${id}`);
    }
  }
}

function validateCategoryMetrics(summary) {
  const metrics = asObject(summary.category_metrics, "dashboard category metrics");
  for (const key of ["overview", "lessons", "workflow", "maintenance", "security"]) {
    const metric = asObject(metrics[key], `dashboard category metric ${key}`);
    for (const field of ["total", "healthy", "warning", "problem", "percent"]) {
      if (!Number.isInteger(metric[field]) || metric[field] < 0) {
        throw new Error(`dashboard category metric ${key}.${field} is invalid`);
      }
    }
    if (metric.percent > 100 || metric.total !== metric.healthy + metric.warning + metric.problem) {
      throw new Error(`dashboard category metric ${key} counts are invalid`);
    }
    if (!displayText(metric.unit, "")) {
      throw new Error(`dashboard category metric ${key}.unit is invalid`);
    }
    if (!ALLOWED_STATES.has(displayText(metric.status, ""))) {
      throw new Error(`dashboard category metric ${key}.status is invalid`);
    }
  }
}

function validateSummaryLocale(summary) {
  const workflowLanguage = displayText(summary.workflow_language, "");
  const displayLocale = displayText(summary.display_locale, "");
  const uiLocale = displayText(summary.ui_locale, "");
  const uiDirection = displayText(summary.ui_direction, "");
  if (!workflowLanguage && !displayLocale && !uiLocale && !uiDirection) {
    return;
  }
  if (!workflowLanguage || !displayLocale || !uiLocale || !uiDirection) {
    throw new Error("dashboard summary locale fields must be emitted together");
  }
  if (!LANGUAGE_CODE_PATTERN.test(workflowLanguage) || !LANGUAGE_CODE_PATTERN.test(displayLocale)) {
    throw new Error("dashboard summary locale code is invalid");
  }
  if (displayLocale !== workflowLanguage) {
    throw new Error("dashboard display_locale must match workflow_language");
  }
  if (!DASHBOARD_UI_LOCALES.has(uiLocale)) {
    throw new Error("dashboard ui_locale is unsupported");
  }
  if (!DASHBOARD_UI_DIRECTIONS.has(uiDirection)) {
    throw new Error("dashboard ui_direction is unsupported");
  }
  if ((uiLocale === "ar") !== (uiDirection === "rtl")) {
    throw new Error("dashboard ui_direction does not match ui_locale");
  }
}

function validateIssues(data) {
  for (const failure of asArray(data.partial_failures)) {
    if (!failure || typeof failure !== "object" || Array.isArray(failure)) {
      throw new Error("dashboard partial failure must be an object");
    }
    if (!PARTIAL_FAILURE_STATES.has(displayText(failure.status, ""))) {
      throw new Error("dashboard partial failure status is invalid");
    }
  }
  for (const followup of asArray(data.summary?.manual_followups)) {
    if (!followup || typeof followup !== "object" || Array.isArray(followup)) {
      throw new Error("dashboard manual follow-up must be an object");
    }
    if (!MANUAL_FOLLOWUP_STATES.has(displayText(followup.status, ""))) {
      throw new Error("dashboard manual follow-up status is invalid");
    }
  }
}

function normalizePartialFailureState(status) {
  const state = displayText(status, "unknown");
  if (state === "failed") {
    return "failed";
  }
  if (state === "blocked") {
    return "blocked";
  }
  return "unknown";
}

function validatePartialFailureScope(data) {
  const blockers = asArray(data.selected_context?.blockers);
  const failures = asArray(data.partial_failures);
  for (const blocker of blockers) {
    const source = displayText(blocker.source, "");
    const failure = failures.find((item) => displayText(item.source, "") === source);
    if (!failure) {
      throw new Error(`dashboard partial failures missing selected-context blocker ${source}`);
    }
    if (displayText(failure.status, "") !== normalizePartialFailureState(blocker.status)) {
      throw new Error(`dashboard partial failure status does not match selected-context blocker ${source}`);
    }
  }
  for (const failure of failures) {
    const source = displayText(failure.source, "");
    if (!blockers.some((blocker) => displayText(blocker.source, "") === source) && !LIVE_PARTIAL_FAILURE_SOURCES.has(source)) {
      throw new Error(`dashboard partial failure is outside selected context: ${source}`);
    }
  }
}

function validateProductAuthority(development) {
  const authority = asObject(development.product_authority, "dashboard product authority");
  if (!ALLOWED_STATES.has(displayText(authority.status, ""))) {
    throw new Error("dashboard product authority status is invalid");
  }
  const repository = asObject(authority.repository, "dashboard product authority repository");
  if (!ALLOWED_STATES.has(displayText(repository.status, ""))) {
    throw new Error("dashboard product authority repository status is invalid");
  }
  if (!["product_operations", "none"].includes(displayText(repository.blocker_scope, ""))) {
    throw new Error("dashboard product authority blocker scope is invalid");
  }
  const productSummary = asObject(authority.product_summary, "dashboard product summary");
  if (!ALLOWED_STATES.has(displayText(productSummary.status, ""))) {
    throw new Error("dashboard product summary status is invalid");
  }
  const productSummaryStatus = displayText(productSummary.status, "");
  if (productSummaryStatus === "ready" && !displayText(productSummary.name, "")) {
    throw new Error("dashboard product summary name is missing");
  }
  const displayName = asObject(productSummary.display_name, "dashboard product summary display name");
  if (productSummaryStatus === "ready" && (!displayText(displayName.ja, "") || !displayText(displayName.en, ""))) {
    throw new Error("dashboard product summary display_name is incomplete");
  }
  if (productSummary.description !== undefined) {
    asObject(productSummary.description, "dashboard product summary description");
  }
  if (!Array.isArray(productSummary.source_documents)) {
    throw new Error("dashboard product summary source_documents must be an array");
  }
  for (const path of productSummary.source_documents) {
    if (!safeRelativePath(displayText(path, ""))) {
      throw new Error("dashboard product summary source_documents path is invalid");
    }
  }
  if (!safeRelativePath(displayText(productSummary.source_path, ""))) {
    throw new Error("dashboard product summary source_path is invalid");
  }
  const operationMode = asObject(authority.operation_mode, "dashboard product operation mode");
  if (!ALLOWED_STATES.has(displayText(operationMode.status, "")) && displayText(operationMode.status, "") !== "repair_required") {
    throw new Error("dashboard product operation mode status is invalid");
  }
  if (!["parent_managed", "standalone", "reconnecting", "repair_required"].includes(displayText(operationMode.workflow_mode, ""))) {
    throw new Error("dashboard product operation mode workflow_mode is invalid");
  }
  if (!["ready", "repair_required", "not_applicable", "unknown"].includes(displayText(operationMode.rule_connection_status, ""))) {
    throw new Error("dashboard product operation mode rule connection is invalid");
  }
  const operationModeStatus = displayText(operationMode.status, "");
  if (operationModeStatus !== "ready" && !displayText(operationMode.repair_reason, "")) {
    throw new Error("dashboard product operation mode repair reason is missing");
  }
  if (!displayText(operationMode.next_safe_action, "")) {
    throw new Error("dashboard product operation mode next action is missing");
  }
  const repositoryIndex = asObject(authority.repository_index, "dashboard product repository index");
  if (!["not_run", "ready", "unknown"].includes(displayText(repositoryIndex.status, ""))) {
    throw new Error("dashboard product repository index status is invalid");
  }
  if (!safeRelativePath(displayText(repositoryIndex.path, ""))) {
    throw new Error("dashboard product repository index path is invalid");
  }
  asObject(repositoryIndex.summary, "dashboard product repository index summary");
  if (!Array.isArray(repositoryIndex.files)) {
    throw new Error("dashboard product repository index files must be an array");
  }
  for (const row of repositoryIndex.files) {
    const indexRow = asObject(row, "dashboard product repository index file");
    if (!safeRelativePath(displayText(indexRow.path, ""))) {
      throw new Error("dashboard product repository index file path is invalid");
    }
  }
  asObject(repositoryIndex.roles, "dashboard product repository index roles");
  const manifestSummary = asObject(authority.manifest_summary, "dashboard product manifest summary");
  for (const key of ["required_missing", "optional_missing"]) {
    if (!Array.isArray(manifestSummary[key])) {
      throw new Error(`dashboard product manifest summary ${key} must be an array`);
    }
  }
  const evidenceSummary = asObject(authority.evidence_summary, "dashboard product evidence summary");
  for (const item of asArray(evidenceSummary.items)) {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      throw new Error("dashboard product evidence item must be an object");
    }
    assertAllowedKeys(
      item,
      new Set([
        "source_id",
        "context",
        "status",
        "freshness_state",
        "required_in_context",
        "authority",
        "observed_at",
        "max_age_seconds",
        "product_root",
        "product_head",
        "source_artifacts",
        "blocked_by",
        "next_command",
        "detail_code",
        "current_item_id",
        "detail_manifest_source",
        "detail_artifact_path",
        "summary",
        "reason",
        "next_action",
        "risk_level",
      ]),
      "dashboard product evidence item",
    );
    if (!displayText(item.source_id, "")) {
      throw new Error("dashboard product evidence item source_id is missing");
    }
    if (!WORKFLOW_CONTEXTS.has(displayText(item.context, "")) && displayText(item.context, "") !== "all") {
      throw new Error("dashboard product evidence item context is invalid");
    }
    if (!ALLOWED_STATES.has(displayText(item.status, ""))) {
      throw new Error("dashboard product evidence item status is invalid");
    }
    if (!EVIDENCE_FRESHNESS_STATES.has(displayText(item.freshness_state, ""))) {
      throw new Error("dashboard product evidence item freshness state is invalid");
    }
    if (typeof item.required_in_context !== "boolean") {
      throw new Error("dashboard product evidence item required_in_context must be a boolean");
    }
    if (!EVIDENCE_AUTHORITIES.has(displayText(item.authority, ""))) {
      throw new Error("dashboard product evidence item authority is invalid");
    }
    if (!displayText(item.observed_at, "")) {
      throw new Error("dashboard product evidence item observed_at is missing");
    }
    if (!Number.isInteger(Number(item.max_age_seconds)) || Number(item.max_age_seconds) < 0) {
      throw new Error("dashboard product evidence item max_age_seconds is invalid");
    }
    if (!displayText(item.product_root, "") || displayText(item.product_root, "").includes("[absolute-path]")) {
      throw new Error("dashboard product evidence item product_root is invalid");
    }
    if (!PRODUCT_HEAD_PATTERN.test(displayText(item.product_head, ""))) {
      throw new Error("dashboard product evidence item product_head is invalid");
    }
    for (const field of ["source_artifacts", "blocked_by", "next_command"]) {
      if (typeof item[field] !== "string") {
        throw new Error(`dashboard product evidence item ${field} must be a string`);
      }
    }
    for (const field of ["detail_code", "current_item_id", "summary", "reason", "next_action"]) {
      if (!displayText(item[field], "")) {
        throw new Error(`dashboard product evidence item ${field} is missing`);
      }
    }
    if (item.detail_manifest_source && !safeRelativePath(item.detail_manifest_source)) {
      throw new Error("dashboard product evidence item detail_manifest_source is invalid");
    }
    if (item.detail_artifact_path && !safeRelativePath(item.detail_artifact_path)) {
      throw new Error("dashboard product evidence item detail_artifact_path is invalid");
    }
    if (!RISK_LEVELS.has(displayText(item.risk_level, ""))) {
      throw new Error("dashboard product evidence item risk_level is invalid");
    }
  }
  for (const blocker of asArray(authority.product_operation_blockers)) {
    if (!blocker || typeof blocker !== "object" || Array.isArray(blocker)) {
      throw new Error("dashboard product operation blocker must be an object");
    }
    if (!displayText(blocker.source, "")) {
      throw new Error("dashboard product operation blocker source is missing");
    }
    if (!PRODUCT_OPERATION_BLOCKER_STATES.has(displayText(blocker.status, ""))) {
      throw new Error("dashboard product operation blocker status is invalid");
    }
  }
}

function validateProductRepository(development) {
  const repository = asObject(development.product_repository, "dashboard product repository");
  if (!ALLOWED_STATES.has(displayText(repository.status, ""))) {
    throw new Error("dashboard product repository status is invalid");
  }
  if (repository.configured_name !== undefined && !displayText(repository.configured_name, "")) {
    throw new Error("dashboard product repository configured_name is invalid");
  }
  if (repository.workflow_context !== undefined && !WORKFLOW_CONTEXTS.has(displayText(repository.workflow_context, ""))) {
    throw new Error("dashboard product repository workflow_context is invalid");
  }
  for (const key of ["path_state", "git_state"]) {
    if (repository[key] !== undefined && !REPOSITORY_PATH_STATES.has(displayText(repository[key], ""))) {
      throw new Error(`dashboard product repository ${key} is invalid`);
    }
  }
  for (const key of ["git_requirement", "ci_requirement"]) {
    if (repository[key] !== undefined && !PRODUCT_GIT_REQUIREMENTS.has(displayText(repository[key], ""))) {
      throw new Error(`dashboard product repository ${key} is invalid`);
    }
  }
}

function validateRepositoryScope(data) {
  if (data.repository_scope === undefined) {
    return;
  }
  const scope = asObject(data.repository_scope, "dashboard repository scope");
  const menuId = displayText(scope.menu_id, "");
  if (!MENU_IDS.has(menuId) || menuId === "unknown") {
    throw new Error("dashboard repository scope menu_id is invalid");
  }
  if (menuId !== displayText(data.selected_context?.menu_id, "")) {
    throw new Error("dashboard repository scope must match selected context menu_id");
  }
  if (!WORKFLOW_CONTEXTS.has(displayText(scope.workflow_context, ""))) {
    throw new Error("dashboard repository scope workflow_context is invalid");
  }
  if (displayText(scope.workflow_context, "") !== displayText(data.selected_context?.workflow_context, "")) {
    throw new Error("dashboard repository scope must match selected context workflow_context");
  }
  const repositoryName = displayText(scope.repository_name, "");
  if (!repositoryName) {
    throw new Error("dashboard repository scope repository_name is missing");
  }
  const selectedRepositoryId = displayText(data.selected_context?.target_repository?.repo_id, "");
  const selectedSelectionId = displayText(data.repository_selection?.current_repo_id, "");
  const repositoryId = displayText(scope.repo_id || scope.scope_id || selectedRepositoryId || selectedSelectionId || repositoryName, "");
  if (!repositoryId) {
    throw new Error("dashboard repository scope repo_id is missing");
  }
  if (scope.repo_id !== undefined && selectedRepositoryId && repositoryId !== selectedRepositoryId) {
    throw new Error("dashboard repository scope must match selected context repo_id");
  }
  if (scope.repo_id !== undefined && selectedSelectionId && !["not_applicable", "not_selected"].includes(selectedSelectionId) && repositoryId !== selectedSelectionId) {
    throw new Error("dashboard repository scope must match repository selection repo_id");
  }
  const selectedRepositoryName = displayText(data.selected_context?.target_repository?.name, "");
  const developmentRepositoryName = displayText(data.development?.product_repository?.configured_name, "");
  if (selectedRepositoryName && repositoryName !== selectedRepositoryName) {
    throw new Error("dashboard repository scope must match selected context repository");
  }
  if (developmentRepositoryName && repositoryName !== developmentRepositoryName) {
    throw new Error("dashboard repository scope must match development product repository");
  }
  for (const key of ["path_state", "git_state"]) {
    if (scope[key] !== undefined && !REPOSITORY_PATH_STATES.has(displayText(scope[key], ""))) {
      throw new Error(`dashboard repository scope ${key} is invalid`);
    }
  }
  for (const key of ["observed_at", "stale_after", "inventory_hash", "change_summary"]) {
    if (scope[key] !== undefined && typeof scope[key] !== "string") {
      throw new Error(`dashboard repository scope ${key} must be a string`);
    }
  }
  const inventory = asObject(scope.inventory, "dashboard repository scope inventory");
  if (!ALLOWED_STATES.has(displayText(inventory.status, ""))) {
    throw new Error("dashboard repository scope inventory status is invalid");
  }
  if (!ALLOWED_STATES.has(displayText(inventory.drift_status, inventory.status))) {
    throw new Error("dashboard repository scope inventory drift_status is invalid");
  }
  const summary = asObject(inventory.summary, "dashboard repository scope inventory summary");
  for (const key of ["directories", "files", "indexed_files", "added_since_index", "missing_from_worktree"]) {
    validateNonNegativeInteger(Number(summary[key] || 0), `dashboard repository scope summary ${key}`);
  }
  for (const row of asArray(inventory.files)) {
    if (!row || typeof row !== "object" || Array.isArray(row)) {
      throw new Error("dashboard repository scope inventory file must be an object");
    }
    if (!safeRelativePath(displayText(row.path, ""))) {
      throw new Error("dashboard repository scope inventory file path is invalid");
    }
    if (!["file", "directory"].includes(displayText(row.type, "file"))) {
      throw new Error("dashboard repository scope inventory file type is invalid");
    }
    if (!ALLOWED_STATES.has(displayText(row.status, ""))) {
      throw new Error("dashboard repository scope inventory file status is invalid");
    }
  }
  for (const key of ["added_since_index", "missing_from_worktree"]) {
    for (const item of asArray(inventory[key])) {
      if (!safeRelativePath(displayText(item, ""))) {
        throw new Error(`dashboard repository scope ${key} path is invalid`);
      }
    }
  }
}

function validateNonNegativeInteger(value, label) {
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`${label} must be a non-negative integer`);
  }
}

function validateContextObject(contextValue, label) {
  const context = asObject(contextValue, label);
  assertAllowedKeys(
    context,
    new Set([
      "menu_id",
      "workflow_context",
      "target_repository",
      "product_type",
      "git_usage_mode",
      "git_requirement",
      "ci_requirement",
      "current_step_id",
      "current_step_label",
      "current_step_index",
      "current_step_total",
      "updated_at",
      "git_status",
      "ci_status",
      "security_status",
      "evidence_status",
      "next_safe_action",
      "blockers",
    ]),
    label,
  );
  if (!MENU_IDS.has(displayText(context.menu_id, ""))) {
    throw new Error(`${label} menu_id is invalid`);
  }
  if (!WORKFLOW_CONTEXTS.has(displayText(context.workflow_context, ""))) {
    throw new Error(`${label} workflow_context is invalid`);
  }
  const targetRepository = asObject(context.target_repository, `${label} target_repository`);
  assertAllowedKeys(targetRepository, new Set(["repo_id", "name", "path_state", "selection_state"]), `${label} target_repository`);
  if (targetRepository.repo_id !== undefined && !displayText(targetRepository.repo_id, "")) {
    throw new Error(`${label} target_repository.repo_id is invalid`);
  }
  if (!displayText(targetRepository.name, "")) {
    throw new Error(`${label} target_repository.name is missing`);
  }
  if (!REPOSITORY_PATH_STATES.has(displayText(targetRepository.path_state, ""))) {
    throw new Error(`${label} target_repository.path_state is invalid`);
  }
  if (targetRepository.selection_state !== undefined && !REPOSITORY_SELECTION_STATES.has(displayText(targetRepository.selection_state, ""))) {
    throw new Error(`${label} target_repository.selection_state is invalid`);
  }
  if (!PRODUCT_TYPES.has(displayText(context.product_type, ""))) {
    throw new Error(`${label} product_type is invalid`);
  }
  if (!PRODUCT_GIT_USAGE_MODES.has(displayText(context.git_usage_mode, ""))) {
    throw new Error(`${label} git_usage_mode is invalid`);
  }
  for (const key of ["git_requirement", "ci_requirement"]) {
    if (!PRODUCT_GIT_REQUIREMENTS.has(displayText(context[key], ""))) {
      throw new Error(`${label} ${key} is invalid`);
    }
  }
  for (const key of ["current_step_id", "current_step_label", "updated_at"]) {
    if (!displayText(context[key], "")) {
      throw new Error(`${label} ${key} is missing`);
    }
  }
  validateNonNegativeInteger(context.current_step_index, `${label} current_step_index`);
  validateNonNegativeInteger(context.current_step_total, `${label} current_step_total`);
  for (const key of ["git_status", "ci_status", "security_status", "evidence_status"]) {
    if (!ALLOWED_STATES.has(displayText(context[key], ""))) {
      throw new Error(`${label} ${key} is invalid`);
    }
  }
  const nextSafeAction = asObject(context.next_safe_action, `${label} next_safe_action`);
  assertAllowedKeys(nextSafeAction, new Set(["title", "description", "target", "expected_result", "risk_level", "status", "source"]), `${label} next_safe_action`);
  for (const key of ["title", "description", "target", "expected_result", "source"]) {
    if (!displayText(nextSafeAction[key], "")) {
      throw new Error(`${label} next_safe_action.${key} is missing`);
    }
  }
  if (!RISK_LEVELS.has(displayText(nextSafeAction.risk_level, ""))) {
    throw new Error(`${label} next_safe_action.risk_level is invalid`);
  }
  if (!ALLOWED_STATES.has(displayText(nextSafeAction.status, ""))) {
    throw new Error(`${label} next_safe_action.status is invalid`);
  }
  for (const blocker of asArray(context.blockers)) {
    if (!blocker || typeof blocker !== "object" || Array.isArray(blocker)) {
      throw new Error(`${label} blocker must be an object`);
    }
    assertAllowedKeys(blocker, new Set(["source", "status", "reason", "required_command"]), `${label} blocker`);
    for (const key of ["source", "reason", "required_command"]) {
      if (!displayText(blocker[key], "")) {
        throw new Error(`${label} blocker ${key} is missing`);
      }
    }
    if (!PRODUCT_OPERATION_BLOCKER_STATES.has(displayText(blocker.status, ""))) {
      throw new Error(`${label} blocker status is invalid`);
    }
  }
}

function validateSelectedContext(data) {
  validateContextObject(data.selected_context, "dashboard selected context");
  const contextsByMenu = asObject(data.contexts_by_menu, "dashboard contexts_by_menu");
  const available = asArray(data.available_contexts);
  const availableMenuIds = new Set();
  for (const menuId of Object.keys(contextsByMenu)) {
    if (!MENU_IDS.has(menuId) || menuId === "unknown") {
      throw new Error(`dashboard contexts_by_menu has invalid key ${menuId}`);
    }
  }
  for (const context of available) {
    if (!context || typeof context !== "object" || Array.isArray(context)) {
      throw new Error("dashboard available context must be an object");
    }
    assertAllowedKeys(
      context,
      new Set(["menu_id", "workflow_context", "target_repository_name", "status", "selectable", "disabled_reason_key", "disabled_detail", "required_next_action"]),
      "dashboard available context",
    );
    const menuId = displayText(context.menu_id, "");
    availableMenuIds.add(menuId);
    if (!MENU_IDS.has(menuId) || menuId === "unknown") {
      throw new Error("dashboard available context menu_id is invalid");
    }
    if (!WORKFLOW_CONTEXTS.has(displayText(context.workflow_context, ""))) {
      throw new Error("dashboard available context workflow_context is invalid");
    }
    if (!displayText(context.target_repository_name, "")) {
      throw new Error("dashboard available context target_repository_name is missing");
    }
    if (!ALLOWED_STATES.has(displayText(context.status, ""))) {
      throw new Error("dashboard available context status is invalid");
    }
    if (context.selectable !== undefined && typeof context.selectable !== "boolean") {
      throw new Error("dashboard available context selectable flag is invalid");
    }
    for (const key of ["disabled_reason_key", "disabled_detail", "required_next_action"]) {
      if (context[key] !== undefined && !displayText(context[key], "")) {
        throw new Error(`dashboard available context ${key} is invalid`);
      }
    }
    if (context.selectable === false && (!displayText(context.disabled_reason_key, "") || !displayText(context.required_next_action, ""))) {
      throw new Error("dashboard unavailable context must include reason and next action");
    }
    if (!contextsByMenu[menuId]) {
      throw new Error(`dashboard contexts_by_menu is missing ${menuId}`);
    }
    validateContextObject(contextsByMenu[menuId], `dashboard contexts_by_menu.${menuId}`);
    if (displayText(contextsByMenu[menuId].menu_id, "") !== menuId) {
      throw new Error(`dashboard contexts_by_menu.${menuId} menu_id must match its key`);
    }
  }
  for (const menuId of Object.keys(contextsByMenu)) {
    if (!availableMenuIds.has(menuId)) {
      throw new Error(`dashboard contexts_by_menu has no available_contexts entry for ${menuId}`);
    }
  }
  const selectedMenuId = displayText(data.selected_context.menu_id, "");
  if (!contextsByMenu[selectedMenuId]) {
    throw new Error("dashboard selected context has no contexts_by_menu entry");
  }
  if (stableStringify(data.selected_context) !== stableStringify(contextsByMenu[selectedMenuId])) {
    throw new Error("dashboard selected context must match contexts_by_menu selected entry");
  }
}

function validateRepositorySelection(data) {
  const selection = asObject(data.repository_selection, "dashboard repository selection");
  assertAllowedKeys(
    selection,
    new Set(["status", "menu_id", "workflow_context", "current_repo_id", "current_repository_name", "selection_state", "registry_file", "selection_file", "options"]),
    "dashboard repository selection",
  );
  if (!["missing", "ready", "unknown", "manual_required", "not_applicable"].includes(displayText(selection.status, ""))) {
    throw new Error("dashboard repository selection status is invalid");
  }
  const menuId = displayText(selection.menu_id, "");
  if (!MENU_IDS.has(menuId)) {
    throw new Error("dashboard repository selection menu_id is invalid");
  }
  if (menuId !== displayText(data.selected_context?.menu_id, "")) {
    throw new Error("dashboard repository selection must match selected context menu_id");
  }
  if (!WORKFLOW_CONTEXTS.has(displayText(selection.workflow_context, ""))) {
    throw new Error("dashboard repository selection workflow_context is invalid");
  }
  if (displayText(selection.workflow_context, "") !== displayText(data.selected_context?.workflow_context, "")) {
    throw new Error("dashboard repository selection must match selected context workflow_context");
  }
  if (!displayText(selection.current_repo_id, "") || !displayText(selection.current_repository_name, "")) {
    throw new Error("dashboard repository selection current repository is missing");
  }
  if (!REPOSITORY_SELECTION_STATES.has(displayText(selection.selection_state, ""))) {
    throw new Error("dashboard repository selection state is invalid");
  }
  if (!safeRelativePath(selection.registry_file) || !safeRelativePath(selection.selection_file)) {
    throw new Error("dashboard repository selection source files must be safe relative paths");
  }
  const options = asArray(selection.options);
  if (normalizeState(selection.status) === "not_applicable" && options.length) {
    throw new Error("dashboard repository selection not_applicable must not expose options");
  }
  const selectedOptions = [];
  for (const option of options) {
    if (!option || typeof option !== "object" || Array.isArray(option)) {
      throw new Error("dashboard repository selection option must be an object");
    }
    assertAllowedKeys(
      option,
      new Set([
        "repo_id",
        "display_name",
        "primary_menu_id",
        "allowed_contexts",
        "product_type",
        "registration_source",
        "path_state",
        "git_state",
        "status",
        "selectable",
        "selected",
        "disabled_reason_key",
        "disabled_detail",
        "select_command",
      ]),
      "dashboard repository selection option",
    );
    for (const key of ["repo_id", "display_name", "disabled_reason_key", "disabled_detail", "select_command"]) {
      if (!displayText(option[key], "")) {
        throw new Error(`dashboard repository selection option ${key} is missing`);
      }
    }
    if (!PRODUCT_REPOSITORY_REGISTRY_CONTEXTS.has(displayText(option.primary_menu_id, ""))) {
      throw new Error("dashboard repository selection option primary_menu_id is invalid");
    }
    const allowedContexts = asArray(option.allowed_contexts).map((item) => displayText(item, ""));
    if (!allowedContexts.length || allowedContexts.some((context) => !PRODUCT_REPOSITORY_REGISTRY_CONTEXTS.has(context))) {
      throw new Error("dashboard repository selection option allowed_contexts is invalid");
    }
    if (PRODUCT_REPOSITORY_REGISTRY_CONTEXTS.has(menuId) && !allowedContexts.includes(menuId)) {
      throw new Error("dashboard repository selection option is outside the selected menu context");
    }
    if (!PRODUCT_TYPES.has(displayText(option.product_type, ""))) {
      throw new Error("dashboard repository selection option product_type is invalid");
    }
    if (!REPOSITORY_REGISTRATION_SOURCES.has(displayText(option.registration_source, ""))) {
      throw new Error("dashboard repository selection option registration source is invalid");
    }
    if (!["configured", "missing", "unknown"].includes(displayText(option.path_state, ""))) {
      throw new Error("dashboard repository selection option path_state is invalid");
    }
    if (!REPOSITORY_PATH_STATES.has(displayText(option.git_state, ""))) {
      throw new Error("dashboard repository selection option git_state is invalid");
    }
    if (!["missing", "ready", "unknown"].includes(displayText(option.status, ""))) {
      throw new Error("dashboard repository selection option status is invalid");
    }
    if (typeof option.selectable !== "boolean" || typeof option.selected !== "boolean") {
      throw new Error("dashboard repository selection option boolean flags are invalid");
    }
    if (option.selectable === true && displayText(option.status, "") !== "ready") {
      throw new Error("dashboard repository selection option selectable must be backed by ready status");
    }
    if (option.selected === true) {
      selectedOptions.push(option);
      if (displayText(option.repo_id, "") !== displayText(selection.current_repo_id, "")) {
        throw new Error("dashboard repository selection selected option must match current repo id");
      }
    }
    if (!safeDisplayCommand(option.select_command)) {
      throw new Error("dashboard repository selection option select_command is invalid");
    }
  }
  if (selectedOptions.length > 1) {
    throw new Error("dashboard repository selection has multiple selected options");
  }
  if (displayText(selection.current_repo_id, "") !== "not_selected" && displayText(selection.current_repo_id, "") !== "not_applicable" && selectedOptions.length !== 1) {
    throw new Error("dashboard repository selection current repo id must have one selected option");
  }
}

function validateOperationRows(development) {
  for (const row of asArray(development.git_operations)) {
    if (!row || typeof row !== "object" || Array.isArray(row)) {
      throw new Error("dashboard Git operation row must be an object");
    }
    for (const key of ["id", "label", "mode", "detail"]) {
      if (!displayText(row[key], "")) {
        throw new Error(`dashboard Git operation row ${key} is missing`);
      }
    }
    if (!ALLOWED_STATES.has(displayText(row.status, ""))) {
      throw new Error("dashboard Git operation row status is invalid");
    }
  }
}

function validateWorkflowEvidenceRows(development) {
  for (const key of ["git_sync_status", "ci_status"]) {
    if (!ALLOWED_STATES.has(displayText(development[key], ""))) {
      throw new Error(`dashboard development ${key} is invalid`);
    }
  }
  for (const row of asArray(development.recent_runs)) {
    if (!row || typeof row !== "object" || Array.isArray(row)) {
      throw new Error("dashboard workflow evidence row must be an object");
    }
    assertAllowedKeys(
      row,
      new Set(["id", "time", "type", "target", "detail", "status", "reference", "source_role", "required_command", "scope", "evidence_path", "observed_at"]),
      "dashboard workflow evidence row",
    );
    for (const key of ["id", "type", "target", "detail", "reference", "source_role", "scope"]) {
      if (!displayText(row[key], "")) {
        throw new Error(`dashboard workflow evidence row ${key} is missing`);
      }
    }
    if (row.time !== undefined && row.time !== "" && !displayText(row.time, "")) {
      throw new Error("dashboard workflow evidence row time is invalid");
    }
    if (!ALLOWED_STATES.has(displayText(row.status, ""))) {
      throw new Error("dashboard workflow evidence row status is invalid");
    }
    if (row.required_command !== undefined && row.required_command !== "" && !displayText(row.required_command, "")) {
      throw new Error("dashboard workflow evidence row required_command is invalid");
    }
    if (row.evidence_path !== undefined && row.evidence_path !== "" && !displayText(row.evidence_path, "")) {
      throw new Error("dashboard workflow evidence row evidence_path is invalid");
    }
    if (row.observed_at !== undefined && row.observed_at !== "" && !displayText(row.observed_at, "")) {
      throw new Error("dashboard workflow evidence row observed_at is invalid");
    }
  }
}

function validateEvidenceSourceFields(row, label) {
  if (!ALLOWED_STATES.has(displayText(row.status, ""))) {
    throw new Error(`${label} status is invalid`);
  }
  if (!EVIDENCE_AUTHORITIES.has(displayText(row.authority, ""))) {
    throw new Error(`${label} authority is invalid`);
  }
  if (!EVIDENCE_FRESHNESS_STATES.has(displayText(row.freshness_state, ""))) {
    throw new Error(`${label} freshness_state is invalid`);
  }
}

function validateOperationalDecision(data) {
  if (data.operational_decision === undefined || data.operational_decision === null) {
    return;
  }
  const decision = asObject(data.operational_decision, "dashboard operational decision");
  assertAllowedKeys(
    decision,
    new Set([
      "status",
      "decision_question",
      "primary_blocker_source_id",
      "why_blocked",
      "next_safe_action",
      "done_condition",
      "approval_boundary",
      "risk_level",
      "freshness_state",
      "authority",
      "source_id",
      "audience_briefs",
      "command_execution_mode",
    ]),
    "dashboard operational decision",
  );
  validateEvidenceSourceFields(decision, "dashboard operational decision");
  if (!RISK_LEVELS.has(displayText(decision.risk_level, ""))) {
    throw new Error("dashboard operational decision risk_level is invalid");
  }
  if (!DECISION_COMMAND_EXECUTION_MODES.has(displayText(decision.command_execution_mode, ""))) {
    throw new Error("dashboard operational decision command execution mode must be preview_only");
  }
  for (const key of ["decision_question", "primary_blocker_source_id", "why_blocked", "next_safe_action", "done_condition", "approval_boundary", "source_id"]) {
    if (!displayText(decision[key], "")) {
      throw new Error(`dashboard operational decision ${key} is missing`);
    }
  }
  const audienceBriefs = asObject(decision.audience_briefs, "dashboard operational decision audience briefs");
  assertAllowedKeys(audienceBriefs, DECISION_AUDIENCES, "dashboard operational decision audience briefs");
  for (const audience of DECISION_AUDIENCES) {
    if (!displayText(audienceBriefs[audience], "")) {
      throw new Error(`dashboard operational decision audience brief is missing: ${audience}`);
    }
  }
}

function validateDecisionPages(data) {
  if (data.decision_pages === undefined || data.decision_pages === null) {
    return;
  }
  const pages = asArray(data.decision_pages);
  if (pages.length < DECISION_PAGE_IDS.size) {
    throw new Error("dashboard decision pages must cover all primary pages");
  }
  const seen = new Set();
  for (const page of pages) {
    if (!page || typeof page !== "object" || Array.isArray(page)) {
      throw new Error("dashboard decision page must be an object");
    }
    assertAllowedKeys(
      page,
      new Set([
        "id",
        "title",
        "scope",
        "audiences",
        "status",
        "decision_question",
        "decision_question_key",
        "current_judgment",
        "current_judgment_key",
        "top_reason",
        "top_reason_key",
        "evidence_confidence",
        "evidence_confidence_key",
        "must_review",
        "must_review_keys",
        "next_safe_action",
        "next_safe_action_key",
        "detail_page",
        "owner_source",
        "source_id",
        "authority",
        "freshness_state",
        "confidence_level",
        "risk_level",
        "command_execution_mode",
      ]),
      "dashboard decision page",
    );
    const pageId = displayText(page.id, "");
    if (!DECISION_PAGE_IDS.has(pageId)) {
      throw new Error(`dashboard decision page id is invalid: ${pageId}`);
    }
    if (seen.has(pageId)) {
      throw new Error(`dashboard decision page id is duplicated: ${pageId}`);
    }
    seen.add(pageId);
    for (const key of ["title", "scope", "decision_question", "current_judgment", "top_reason", "evidence_confidence", "next_safe_action", "source_id"]) {
      if (!displayText(page[key], "")) {
        throw new Error(`dashboard decision page ${pageId}.${key} is missing`);
      }
    }
    const mustReview = asArray(page.must_review);
    const mustReviewKeys = page.must_review_keys === undefined ? [] : asArray(page.must_review_keys);
    if (mustReviewKeys.length && (mustReviewKeys.length !== mustReview.length || mustReviewKeys.some((key) => !displayText(key, "")))) {
      throw new Error(`dashboard decision page ${pageId}.must_review_keys is invalid`);
    }
    validateEvidenceSourceFields(page, `dashboard decision page ${pageId}`);
    if (page.confidence_level !== undefined && !EVIDENCE_CONFIDENCE_LEVELS.has(displayText(page.confidence_level, ""))) {
      throw new Error(`dashboard decision page ${pageId} confidence_level is invalid`);
    }
    if (!RISK_LEVELS.has(displayText(page.risk_level, ""))) {
      throw new Error(`dashboard decision page ${pageId} risk_level is invalid`);
    }
    if (!DECISION_COMMAND_EXECUTION_MODES.has(displayText(page.command_execution_mode, ""))) {
      throw new Error(`dashboard decision page ${pageId} command execution mode must be preview_only`);
    }
    const ownerSource = displayText(page.owner_source, "");
    if (ownerSource === "ui" || !DECISION_OWNER_SOURCES.has(ownerSource)) {
      throw new Error(`dashboard decision page ${pageId} owner_source is invalid`);
    }
    const detailPage = displayText(page.detail_page, "");
    if (!DECISION_PAGE_TARGETS.has(detailPage) || detailPage !== `#${pageId}`) {
      throw new Error(`dashboard decision page ${pageId} detail_page is invalid`);
    }
    const audiences = new Set(asArray(page.audiences).map((audience) => displayText(audience, "")));
    for (const audience of audiences) {
      if (!DECISION_AUDIENCES.has(audience)) {
        throw new Error(`dashboard decision page ${pageId} audience is invalid: ${audience}`);
      }
    }
    for (const requiredAudience of DECISION_AUDIENCES) {
      if (!audiences.has(requiredAudience)) {
        throw new Error(`dashboard decision page ${pageId} is missing audience: ${requiredAudience}`);
      }
    }
    if (!mustReview.length || mustReview.some((item) => !displayText(item, ""))) {
      throw new Error(`dashboard decision page ${pageId} must_review is invalid`);
    }
  }
  for (const pageId of DECISION_PAGE_IDS) {
    if (!seen.has(pageId)) {
      throw new Error(`dashboard decision pages are missing ${pageId}`);
    }
  }
}

function validateRepositoryChanges(development) {
  if (development.repository_changes === undefined || development.repository_changes === null) {
    return;
  }
  const changes = asObject(development.repository_changes, "dashboard repository changes");
  assertAllowedKeys(
    changes,
    new Set([
      "status",
      "observed_at",
      "path_state",
      "git_state",
      "branch",
      "head",
      "upstream",
      "main_target",
      "detached",
      "staged_count",
      "unstaged_count",
      "untracked_count",
      "ahead",
      "behind",
      "worktree_count",
      "changed_role_counts",
      "safe_changed_file_samples",
      "stale_reason",
    ]),
    "dashboard repository changes",
  );
  if (!ALLOWED_STATES.has(displayText(changes.status, ""))) {
    throw new Error("dashboard repository changes status is invalid");
  }
  if (!REPOSITORY_PATH_STATES.has(displayText(changes.path_state, "")) || !REPOSITORY_PATH_STATES.has(displayText(changes.git_state, ""))) {
    throw new Error("dashboard repository changes path or Git state is invalid");
  }
  if (!displayText(changes.observed_at, "") || !displayText(changes.stale_reason, "")) {
    throw new Error("dashboard repository changes observation fields are missing");
  }
  if (typeof changes.detached !== "boolean") {
    throw new Error("dashboard repository changes detached must be boolean");
  }
  for (const key of ["staged_count", "unstaged_count", "untracked_count", "ahead", "behind", "worktree_count"]) {
    validateNonNegativeInteger(changes[key], `dashboard repository changes ${key}`);
  }
  const roleCounts = asObject(changes.changed_role_counts, "dashboard repository changes role counts");
  assertAllowedKeys(roleCounts, new Set(["staged", "unstaged", "untracked"]), "dashboard repository changes role counts");
  for (const key of ["staged", "unstaged", "untracked"]) {
    validateNonNegativeInteger(roleCounts[key], `dashboard repository changes role count ${key}`);
  }
  if (roleCounts.staged !== changes.staged_count || roleCounts.unstaged !== changes.unstaged_count || roleCounts.untracked !== changes.untracked_count) {
    throw new Error("dashboard repository changes role counts must match top-level counts");
  }
  for (const sample of asArray(changes.safe_changed_file_samples)) {
    if (!safeRelativePath(sample)) {
      throw new Error(`dashboard repository changes sample path is unsafe: ${displayText(sample, "")}`);
    }
  }
}

function validateRepositoryDevelopment(development) {
  if (development.repository_development === undefined || development.repository_development === null) {
    return;
  }
  const repositoryDevelopment = asObject(development.repository_development, "dashboard repository development workflow");
  assertAllowedKeys(
    repositoryDevelopment,
    new Set([
      "current_phase",
      "phase_order",
      "inference_reason",
      "purpose",
      "required_inputs",
      "allowed_writes",
      "recommended_checks",
      "required_checks",
      "git_ci_expectations",
      "required_approvals",
      "cleanup_behavior",
      "stop_conditions",
      "runner_records_status",
      "source_files",
    ]),
    "dashboard repository development workflow",
  );
  if (!REPOSITORY_DEVELOPMENT_PHASES.has(displayText(repositoryDevelopment.current_phase, ""))) {
    throw new Error("dashboard repository development phase is invalid");
  }
  validateNonNegativeInteger(repositoryDevelopment.phase_order, "dashboard repository development phase_order");
  if (!REPOSITORY_DEVELOPMENT_RUNNER_RECORD_STATUSES.has(displayText(repositoryDevelopment.runner_records_status, ""))) {
    throw new Error("dashboard repository development runner_records_status is invalid");
  }
  for (const key of ["inference_reason", "purpose", "required_inputs", "allowed_writes", "recommended_checks", "required_checks", "git_ci_expectations", "required_approvals", "cleanup_behavior", "stop_conditions"]) {
    if (!displayText(repositoryDevelopment[key], "")) {
      throw new Error(`dashboard repository development ${key} is missing`);
    }
  }
  const sourceFiles = asArray(repositoryDevelopment.source_files);
  if (!sourceFiles.length) {
    throw new Error("dashboard repository development source_files is missing");
  }
  for (const sourceFile of sourceFiles) {
    if (!safeRelativePath(sourceFile)) {
      throw new Error(`dashboard repository development source file is unsafe: ${displayText(sourceFile, "")}`);
    }
  }
}

function validateWorkflowEvidenceEvents(development) {
  if (development.workflow_evidence_events === undefined || development.workflow_evidence_events === null) {
    return;
  }
  const events = asArray(development.workflow_evidence_events);
  if (events.length < 5) {
    throw new Error("dashboard workflow evidence events must include core evidence roles");
  }
  const seen = new Set();
  for (const event of events) {
    if (!event || typeof event !== "object" || Array.isArray(event)) {
      throw new Error("dashboard workflow evidence event must be an object");
    }
    assertAllowedKeys(event, new Set(["event_id", "source_id", "observed_at", "repository_head", "status", "freshness_state", "authority", "detail_artifact_path", "summary"]), "dashboard workflow evidence event");
    for (const key of ["event_id", "source_id", "observed_at", "repository_head", "detail_artifact_path", "summary"]) {
      if (!displayText(event[key], "")) {
        throw new Error(`dashboard workflow evidence event ${key} is missing`);
      }
    }
    const eventId = displayText(event.event_id, "");
    if (seen.has(eventId)) {
      throw new Error(`dashboard workflow evidence event is duplicated: ${eventId}`);
    }
    seen.add(eventId);
    validateEvidenceSourceFields(event, `dashboard workflow evidence event ${eventId}`);
    const artifactPath = displayText(event.detail_artifact_path, "");
    if (artifactPath.includes(";")) {
      throw new Error(`dashboard workflow evidence event ${eventId} detail_artifact_path must be a single artifact reference`);
    }
    if (artifactPath !== "not_collected" && !safeScopedRelativePath(artifactPath)) {
      throw new Error(`dashboard workflow evidence event ${eventId} detail_artifact_path is unsafe`);
    }
  }
}

function validateCiEvidence(development) {
  if (development.ci_evidence === undefined || development.ci_evidence === null) {
    return;
  }
  const evidenceRows = asArray(development.ci_evidence);
  const seen = new Set();
  for (const row of evidenceRows) {
    if (!row || typeof row !== "object" || Array.isArray(row)) {
      throw new Error("dashboard CI evidence row must be an object");
    }
    assertAllowedKeys(row, new Set(["role", "status", "source_id", "head_match_status", "authority", "freshness_state", "summary", "observed_at"]), "dashboard CI evidence row");
    const role = displayText(row.role, "");
    if (!CI_EVIDENCE_ROLES.has(role)) {
      throw new Error(`dashboard CI evidence role is invalid: ${role}`);
    }
    if (seen.has(role)) {
      throw new Error(`dashboard CI evidence role is duplicated: ${role}`);
    }
    seen.add(role);
    validateEvidenceSourceFields(row, `dashboard CI evidence row ${role}`);
    const headMatchStatus = displayText(row.head_match_status, "");
    if (!CI_HEAD_MATCH_STATES.has(headMatchStatus)) {
      throw new Error(`dashboard CI evidence row ${role} head_match_status is invalid`);
    }
    if (
      displayText(row.status, "") === "passed" &&
      (headMatchStatus !== "matched" ||
        displayText(row.freshness_state, "") !== "current" ||
        displayText(row.authority, "") !== "authoritative")
    ) {
      throw new Error(`dashboard CI evidence row ${role} passed status requires current authoritative matching HEAD evidence`);
    }
    for (const key of ["source_id", "summary", "observed_at"]) {
      if (!displayText(row[key], "")) {
        throw new Error(`dashboard CI evidence row ${role}.${key} is missing`);
      }
    }
  }
  for (const role of CI_EVIDENCE_ROLES) {
    if (!seen.has(role)) {
      throw new Error(`dashboard CI evidence is missing role: ${role}`);
    }
  }
}

function validateDocuments(data) {
  if (data.documents === undefined || data.documents === null) {
    return;
  }
  const documents = asObject(data.documents, "dashboard documents");
  assertAllowedKeys(documents, new Set(["status", "groups", "catalog", "related_commands", "brief_cards", "next_actions"]), "dashboard documents");
  if (documents.status !== undefined && !ALLOWED_STATES.has(displayText(documents.status, ""))) {
    throw new Error("dashboard documents status is invalid");
  }
  const groupIds = new Set();
  for (const group of asArray(documents.groups)) {
    if (!group || typeof group !== "object" || Array.isArray(group)) {
      throw new Error("dashboard document group must be an object");
    }
    assertAllowedKeys(group, new Set(["id", "label_key", "description_key", "order"]), "dashboard document group");
    for (const key of ["id", "label_key", "description_key"]) {
      if (!displayText(group[key], "")) {
        throw new Error(`dashboard document group ${key} is missing`);
      }
    }
    if (!Number.isInteger(group.order) || group.order <= 0) {
      throw new Error("dashboard document group order is invalid");
    }
    const groupId = displayText(group.id, "");
    if (groupIds.has(groupId)) {
      throw new Error("dashboard document group id is duplicated");
    }
    groupIds.add(groupId);
  }
  const catalogIds = new Set();
  for (const item of asArray(documents.catalog)) {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      throw new Error("dashboard document catalog item must be an object");
    }
    assertAllowedKeys(item, new Set(["id", "group_id", "role_id", "path", "status", "status_source", "audience", "order", "related_page"]), "dashboard document catalog item");
    for (const key of ["id", "group_id", "role_id", "path", "status_source"]) {
      if (!displayText(item[key], "")) {
        throw new Error(`dashboard document catalog item ${key} is missing`);
      }
    }
    if (groupIds.size && !groupIds.has(displayText(item.group_id, ""))) {
      throw new Error("dashboard document catalog item references an unknown group");
    }
    const itemId = displayText(item.id, "");
    if (catalogIds.has(itemId)) {
      throw new Error("dashboard document catalog item id is duplicated");
    }
    catalogIds.add(itemId);
    if (!safeScopedRelativePath(item.path)) {
      throw new Error("dashboard document catalog item path must be a safe relative path");
    }
    if (!ALLOWED_STATES.has(displayText(item.status, ""))) {
      throw new Error("dashboard document catalog item status is invalid");
    }
    if (!DOCUMENT_AUDIENCES.has(displayText(item.audience, ""))) {
      throw new Error("dashboard document catalog item audience is invalid");
    }
    if (!Number.isInteger(item.order) || item.order <= 0) {
      throw new Error("dashboard document catalog item order is invalid");
    }
    if (!DOCUMENT_RELATED_PAGES.has(displayText(item.related_page, ""))) {
      throw new Error("dashboard document catalog item related_page is invalid");
    }
  }
  const commandIds = new Set();
  for (const command of asArray(documents.related_commands)) {
    if (!command || typeof command !== "object" || Array.isArray(command)) {
      throw new Error("dashboard document related command must be an object");
    }
    assertAllowedKeys(command, new Set(["id", "label_key", "description_key", "command", "order"]), "dashboard document related command");
    for (const key of ["id", "label_key", "description_key", "command"]) {
      if (!displayText(command[key], "")) {
        throw new Error(`dashboard document related command ${key} is missing`);
      }
    }
    const commandId = displayText(command.id, "");
    if (commandIds.has(commandId)) {
      throw new Error("dashboard document related command id is duplicated");
    }
    commandIds.add(commandId);
    if (!safeDisplayCommand(command.command)) {
      throw new Error("dashboard document related command is invalid");
    }
    if (!Number.isInteger(command.order) || command.order <= 0) {
      throw new Error("dashboard document related command order is invalid");
    }
  }
  const briefIds = new Set();
  for (const card of asArray(documents.brief_cards)) {
    if (!card || typeof card !== "object" || Array.isArray(card)) {
      throw new Error("dashboard document brief card must be an object");
    }
    assertAllowedKeys(card, new Set(["id", "menu_id", "workflow_context", "repo_id", "document_role", "source_label_key", "title", "title_key", "detail", "detail_key", "summary", "summary_key", "action", "action_key", "agent_summary", "status", "metric_label_key", "metric_value", "source_paths", "source_hash", "stored_source_hash", "brief_updated_at", "freshness_state", "related_page", "order"]), "dashboard document brief card");
    for (const key of ["id", "source_label_key", "title_key", "detail_key", "summary_key", "action_key", "metric_label_key", "metric_value"]) {
      if (!displayText(card[key], "")) {
        throw new Error(`dashboard document brief card ${key} is missing`);
      }
    }
    for (const key of ["title", "detail", "summary", "action"]) {
      validateLocalizedTextObject(card[key], `dashboard document brief card ${key}`);
    }
    if (card.agent_summary !== undefined && card.agent_summary !== null) {
      const agentSummary = asObject(card.agent_summary, "dashboard document brief card agent_summary");
      assertAllowedKeys(agentSummary, new Set(["status", "provider_mode", "source", "summary", "detail", "generated_at", "source_paths"]), "dashboard document brief card agent_summary");
      if (!ALLOWED_STATES.has(displayText(agentSummary.status, ""))) {
        throw new Error("dashboard document brief card agent_summary status is invalid");
      }
      if (!DOCUMENT_SUMMARY_PROVIDER_MODES.has(displayText(agentSummary.provider_mode, ""))) {
        throw new Error("dashboard document brief card agent_summary provider_mode is invalid");
      }
      if (!displayText(agentSummary.source, "") || !displayText(agentSummary.generated_at, "")) {
        throw new Error("dashboard document brief card agent_summary source fields are missing");
      }
      validateLocalizedTextObject(agentSummary.summary, "dashboard document brief card agent_summary summary");
      validateLocalizedTextObject(agentSummary.detail, "dashboard document brief card agent_summary detail");
      for (const sourcePath of asArray(agentSummary.source_paths)) {
        if (!safeScopedRelativePath(sourcePath)) {
          throw new Error("dashboard document brief card agent_summary source_paths is invalid");
        }
      }
    }
    const briefId = displayText(card.id, "");
    if (briefIds.has(briefId)) {
      throw new Error("dashboard document brief card id is duplicated");
    }
    briefIds.add(briefId);
    if (card.menu_id !== undefined && !MENU_IDS.has(displayText(card.menu_id, ""))) {
      throw new Error("dashboard document brief card menu_id is invalid");
    }
    if (card.workflow_context !== undefined && !WORKFLOW_CONTEXTS.has(displayText(card.workflow_context, ""))) {
      throw new Error("dashboard document brief card workflow_context is invalid");
    }
    if (card.repo_id !== undefined && !displayText(card.repo_id, "")) {
      throw new Error("dashboard document brief card repo_id is invalid");
    }
    if (card.document_role !== undefined && !displayText(card.document_role, "")) {
      throw new Error("dashboard document brief card document_role is invalid");
    }
    if (!ALLOWED_STATES.has(displayText(card.status, ""))) {
      throw new Error("dashboard document brief card status is invalid");
    }
    if (!ALLOWED_STATES.has(displayText(card.freshness_state, "unknown"))) {
      throw new Error("dashboard document brief card freshness_state is invalid");
    }
    for (const sourcePath of asArray(card.source_paths)) {
      if (!safeScopedRelativePath(sourcePath)) {
        throw new Error("dashboard document brief card source_paths is invalid");
      }
    }
    if (!DOCUMENT_RELATED_PAGES.has(displayText(card.related_page, ""))) {
      throw new Error("dashboard document brief card related_page is invalid");
    }
    if (!Number.isInteger(card.order) || card.order <= 0) {
      throw new Error("dashboard document brief card order is invalid");
    }
  }
  const actionIds = new Set();
  for (const action of asArray(documents.next_actions)) {
    if (!action || typeof action !== "object" || Array.isArray(action)) {
      throw new Error("dashboard document next action must be an object");
    }
    assertAllowedKeys(action, new Set(["id", "title_key", "detail_key", "status", "related_page", "order"]), "dashboard document next action");
    for (const key of ["id", "title_key", "detail_key"]) {
      if (!displayText(action[key], "")) {
        throw new Error(`dashboard document next action ${key} is missing`);
      }
    }
    const actionId = displayText(action.id, "");
    if (actionIds.has(actionId)) {
      throw new Error("dashboard document next action id is duplicated");
    }
    actionIds.add(actionId);
    if (!ALLOWED_STATES.has(displayText(action.status, ""))) {
      throw new Error("dashboard document next action status is invalid");
    }
    if (!DOCUMENT_RELATED_PAGES.has(displayText(action.related_page, ""))) {
      throw new Error("dashboard document next action related_page is invalid");
    }
    if (!Number.isInteger(action.order) || action.order <= 0) {
      throw new Error("dashboard document next action order is invalid");
    }
  }
}

function validateSettings(data) {
  if (data.settings === undefined || data.settings === null) {
    return;
  }
  const settings = asObject(data.settings, "dashboard settings");
  assertAllowedKeys(settings, new Set(["status", "groups", "items"]), "dashboard settings");
  if (settings.status !== undefined && !ALLOWED_STATES.has(displayText(settings.status, ""))) {
    throw new Error("dashboard settings status is invalid");
  }

  const groupIds = new Set();
  for (const group of asArray(settings.groups)) {
    if (!group || typeof group !== "object" || Array.isArray(group)) {
      throw new Error("dashboard settings group must be an object");
    }
    assertAllowedKeys(group, new Set(["id", "label_key", "description_key", "status", "order"]), "dashboard settings group");
    for (const key of ["id", "label_key", "description_key"]) {
      if (!displayText(group[key], "")) {
        throw new Error(`dashboard settings group ${key} is missing`);
      }
    }
    if (!ALLOWED_STATES.has(displayText(group.status, ""))) {
      throw new Error("dashboard settings group status is invalid");
    }
    if (!Number.isInteger(group.order) || group.order <= 0) {
      throw new Error("dashboard settings group order is invalid");
    }
    const groupId = displayText(group.id, "");
    if (groupIds.has(groupId)) {
      throw new Error("dashboard settings group id is duplicated");
    }
    groupIds.add(groupId);
  }

  const itemIds = new Set();
  let workflowLanguageValue = "";
  for (const item of asArray(settings.items)) {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      throw new Error("dashboard settings item must be an object");
    }
    assertAllowedKeys(
      item,
      new Set([
        "id",
        "group_id",
        "scope",
        "label_key",
        "description_key",
        "current_value",
        "current_label",
        "status",
        "source_file",
        "allowed_values",
        "editable",
        "reviewable",
        "risk_level",
      "requires_confirmation",
      "consistency",
      "disabled_reason_key",
      "related_page",
      "update_action_id",
      "review",
      ]),
      "dashboard settings item",
    );
    for (const key of ["id", "group_id", "scope", "label_key", "description_key", "current_value", "current_label", "source_file", "disabled_reason_key", "related_page", "update_action_id"]) {
      if (!displayText(item[key], "")) {
        throw new Error(`dashboard settings item ${key} is missing`);
      }
    }
    const itemId = displayText(item.id, "");
    if (itemIds.has(itemId)) {
      throw new Error("dashboard settings item id is duplicated");
    }
    itemIds.add(itemId);
    if (itemId === "workflow_language") {
      workflowLanguageValue = displayText(item.current_value, "");
    }
    if (groupIds.size && !groupIds.has(displayText(item.group_id, ""))) {
      throw new Error("dashboard settings item references an unknown group");
    }
    if (!SETTING_SCOPES.has(displayText(item.scope, ""))) {
      throw new Error("dashboard settings item scope is invalid");
    }
    if (!ALLOWED_STATES.has(displayText(item.status, ""))) {
      throw new Error("dashboard settings item status is invalid");
    }
    if (!safeScopedRelativePath(item.source_file)) {
      throw new Error("dashboard settings item source_file must be a safe relative path");
    }
    for (const allowedValue of asArray(item.allowed_values)) {
      if (!displayText(allowedValue, "")) {
        throw new Error("dashboard settings item allowed value is invalid");
      }
    }
    if (typeof item.editable !== "boolean" || typeof item.reviewable !== "boolean") {
      throw new Error("dashboard settings item editability flags are invalid");
    }
    const itemScope = displayText(item.scope, "");
    if (item.editable === true) {
      if (!item.reviewable || !["learning", "workflow", "dashboard"].includes(itemScope)) {
        throw new Error("dashboard settings item editable scope is invalid");
      }
      if (displayText(item.source_file, "").startsWith("product:")) {
        throw new Error("dashboard settings item editable source_file must stay repo-local");
      }
      if (!asArray(item.allowed_values).length || item.requires_confirmation !== true) {
        throw new Error("dashboard settings item editable contract is incomplete");
      }
    }
    if (!RISK_LEVELS.has(displayText(item.risk_level, ""))) {
      throw new Error("dashboard settings item risk level is invalid");
    }
    if (typeof item.requires_confirmation !== "boolean") {
      throw new Error("dashboard settings item confirmation flag is invalid");
    }
    const consistency = asObject(item.consistency, "dashboard settings item consistency");
    assertAllowedKeys(
      consistency,
      new Set(["status", "severity", "reason_code", "reason_key", "next_action_key", "effective_mode", "affected_setting_ids"]),
      "dashboard settings item consistency",
    );
    for (const key of ["status", "severity", "reason_code", "reason_key", "next_action_key", "affected_setting_ids"]) {
      if (consistency[key] === undefined) {
        throw new Error(`dashboard settings item consistency ${key} is missing`);
      }
    }
    if (!ALLOWED_STATES.has(displayText(consistency.status, ""))) {
      throw new Error("dashboard settings item consistency status is invalid");
    }
    if (!["info", "warning", "error"].includes(displayText(consistency.severity, ""))) {
      throw new Error("dashboard settings item consistency severity is invalid");
    }
    if (!displayText(consistency.reason_code, "") || !displayText(consistency.reason_key, "") || !displayText(consistency.next_action_key, "")) {
      throw new Error("dashboard settings item consistency reason fields are invalid");
    }
    for (const affectedId of asArray(consistency.affected_setting_ids)) {
      if (!displayText(affectedId, "")) {
        throw new Error("dashboard settings item consistency affected id is invalid");
      }
    }
    if (!SETTINGS_RELATED_PAGES.has(displayText(item.related_page, ""))) {
      throw new Error("dashboard settings item related_page is invalid");
    }
    const review = asObject(item.review, "dashboard settings item review");
    assertAllowedKeys(review, new Set(["impact_key", "target_file", "validation_status", "update_preview_key"]), "dashboard settings item review");
    for (const key of ["impact_key", "target_file", "validation_status", "update_preview_key"]) {
      if (!displayText(review[key], "")) {
        throw new Error(`dashboard settings item review ${key} is missing`);
      }
    }
    if (!safeScopedRelativePath(review.target_file)) {
      throw new Error("dashboard settings item review target_file must be a safe relative path");
    }
    if (!ALLOWED_STATES.has(displayText(review.validation_status, ""))) {
      throw new Error("dashboard settings item review validation_status is invalid");
    }
  }
  const summaryWorkflowLanguage = displayText(data.summary?.workflow_language, "");
  if (workflowLanguageValue && summaryWorkflowLanguage && workflowLanguageValue !== summaryWorkflowLanguage) {
    throw new Error("dashboard summary workflow_language must match the Settings workflow_language row");
  }
}

function validateSettingsMutationResponse(value, label) {
  const result = asObject(value, label);
  assertAllowedKeys(
    result,
    new Set([
      "status",
      "severity",
      "reason_code",
      "reason_key",
      "next_action_key",
      "affected_setting_ids",
      "setting_id",
      "menu_id",
      "setting_kind",
      "requested_value",
      "requested_label",
      "current_value",
      "current_label",
      "target_file",
      "requires_confirmation",
      "applied",
      "snapshot_regenerated",
      "snapshot_file",
      "tool_command",
      "plan_token",
      "workflow_language",
      "display_locale",
      "ui_locale",
      "direction",
    ]),
    label,
  );
  if (!["ready", "passed", "blocked", "manual_required", "approval_required"].includes(displayText(result.status, ""))) {
    throw new Error(`${label} status is invalid`);
  }
  if (!["info", "warning", "error"].includes(displayText(result.severity, ""))) {
    throw new Error(`${label} severity is invalid`);
  }
  for (const key of ["reason_code", "reason_key", "next_action_key"]) {
    if (!displayText(result[key], "")) {
      throw new Error(`${label} ${key} is missing`);
    }
  }
  for (const affectedId of asArray(result.affected_setting_ids)) {
    if (!displayText(affectedId, "")) {
      throw new Error(`${label} affected_setting_ids is invalid`);
    }
  }
  for (const key of ["setting_id", "menu_id", "setting_kind", "requested_value", "requested_label", "current_value", "current_label", "target_file", "tool_command"]) {
    if (!displayText(result[key], "")) {
      throw new Error(`${label} ${key} is missing`);
    }
  }
  if (!["lesson", "git", "product_workflow_git_usage", "dashboard"].includes(displayText(result.setting_kind, ""))) {
    throw new Error(`${label} setting_kind is invalid`);
  }
  if (!safeScopedRelativePath(result.target_file)) {
    throw new Error(`${label} target_file is invalid`);
  }
  if (result.snapshot_file !== undefined && !safeScopedRelativePath(result.snapshot_file)) {
    throw new Error(`${label} snapshot_file is invalid`);
  }
  if (typeof result.requires_confirmation !== "boolean" || typeof result.applied !== "boolean" || typeof result.snapshot_regenerated !== "boolean") {
    throw new Error(`${label} boolean fields are invalid`);
  }
  if (displayText(result.status, "") === "blocked" && (result.applied !== false || result.snapshot_regenerated !== false)) {
    throw new Error(`${label} blocked responses must not apply or regenerate snapshots`);
  }
  if (!safeDisplayCommand(result.tool_command)) {
    throw new Error(`${label} tool command is invalid`);
  }
  if (result.plan_token !== undefined && !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(displayText(result.plan_token, ""))) {
    throw new Error(`${label} plan_token is invalid`);
  }
  if (result.applied === false && displayText(result.status, "") !== "blocked" && !result.plan_token) {
    throw new Error(`${label} plan_token is required for unapplied non-blocked plans`);
  }
  if (result.setting_id === "workflow_language") {
    for (const key of ["workflow_language", "display_locale", "ui_locale", "direction"]) {
      if (!displayText(result[key], "")) {
        throw new Error(`${label} ${key} is missing`);
      }
    }
    if (result.workflow_language !== result.requested_value || result.display_locale !== result.workflow_language) {
      throw new Error(`${label} locale metadata is inconsistent`);
    }
    if (!DASHBOARD_UI_LOCALES.has(result.ui_locale) || !DASHBOARD_UI_DIRECTIONS.has(result.direction)) {
      throw new Error(`${label} locale metadata is unsupported`);
    }
    if ((result.ui_locale === "ar") !== (result.direction === "rtl")) {
      throw new Error(`${label} locale direction is inconsistent`);
    }
  }
  return result;
}

function validateProductRepositorySelectionMutationResponse(value, label) {
  const result = asObject(value, label);
  assertAllowedKeys(
    result,
    new Set([
      "status",
      "applied",
      "menu_id",
      "repo_id",
      "snapshot_regenerated",
      "snapshot_id",
      "content_hash",
      "tool_command",
    ]),
    label,
  );
  if (!["passed", "ready"].includes(displayText(result.status, ""))) {
    throw new Error(`${label} status is invalid`);
  }
  if (typeof result.applied !== "boolean" || typeof result.snapshot_regenerated !== "boolean") {
    throw new Error(`${label} boolean fields are invalid`);
  }
  if (result.applied !== true || result.snapshot_regenerated !== true) {
    throw new Error(`${label} must apply and regenerate a snapshot`);
  }
  if (!MENU_IDS.has(displayText(result.menu_id, "")) || displayText(result.menu_id, "") === "unknown") {
    throw new Error(`${label} menu_id is invalid`);
  }
  if (!/^[A-Za-z0-9._-]+$/.test(displayText(result.repo_id, ""))) {
    throw new Error(`${label} repo_id is invalid`);
  }
  if (!displayText(result.snapshot_id, "") || !/^[a-f0-9]{64}$/.test(displayText(result.content_hash, ""))) {
    throw new Error(`${label} snapshot identity is invalid`);
  }
  if (!safeDisplayCommand(result.tool_command)) {
    throw new Error(`${label} tool command is invalid`);
  }
  return result;
}

function validateDesignSystemInteraction(value, label) {
  const interaction = asObject(value, label);
  assertAllowedKeys(interaction, new Set(["tooltip", "copyFeedback"]), label);
  const tooltip = asObject(interaction.tooltip, `${label} tooltip`);
  const copyFeedback = asObject(interaction.copyFeedback, `${label} copyFeedback`);
  assertAllowedKeys(tooltip, new Set(["trigger", "hidePolicy", "placement", "maxWidth", "delayMs"]), `${label} tooltip`);
  assertAllowedKeys(copyFeedback, new Set(["trigger", "hidePolicy", "placement", "collision", "durationMs"]), `${label} copyFeedback`);
  if (!["hover-only", "disabled"].includes(tooltip.trigger) || tooltip.hidePolicy !== "pointer-leave" || tooltip.placement !== "top") {
    throw new Error(`${label} tooltip policy is invalid`);
  }
  if (!/^[1-9][0-9]{1,3}px$/.test(displayText(tooltip.maxWidth, "")) || !Number.isInteger(tooltip.delayMs)) {
    throw new Error(`${label} tooltip sizing is invalid`);
  }
  if (!["hover-only", "disabled"].includes(copyFeedback.trigger) || copyFeedback.hidePolicy !== "pointer-leave" || copyFeedback.placement !== "top" || copyFeedback.collision !== "shift") {
    throw new Error(`${label} copy feedback policy is invalid`);
  }
  if (!Number.isInteger(copyFeedback.durationMs)) {
    throw new Error(`${label} copy feedback duration is invalid`);
  }
  return interaction;
}

function validateDesignSystemFoundation(value, label) {
  const foundation = asObject(value, label);
  assertAllowedKeys(foundation, new Set(["targetScope", "themeAccent", "density", "radiusScale", "typographyScale", "actionControlHeight", "actionControlPadding", "compactControlHeight", "compactControlPadding", "formControlHeight", "formControlPadding", "iconButtonSize", "controlFontSize", "cardPadding", "cardGap", "rowPadding", "rowGap", "technicalAffordanceGap", "technicalSourceMaxWidth", "technicalEvidenceMaxWidth", "technicalPreviewChipMaxWidth", "pageHeaderPadding", "metadataGap", "pageIconSize", "badgeGap", "badgeHeight", "modeBadgePadding", "badgeFontSize", "modeBadgeFontSize"]), label);
  if (foundation.targetScope !== "dashboard-control-center") {
    throw new Error(`${label} target scope is invalid`);
  }
  if (!["blue", "teal", "slate"].includes(foundation.themeAccent)) {
    throw new Error(`${label} theme accent is invalid`);
  }
  if (!["compact", "balanced", "comfortable"].includes(foundation.density)) {
    throw new Error(`${label} density is invalid`);
  }
  if (!["compact", "standard", "soft"].includes(foundation.radiusScale)) {
    throw new Error(`${label} radius scale is invalid`);
  }
  if (!["standard", "large"].includes(foundation.typographyScale)) {
    throw new Error(`${label} typography scale is invalid`);
  }
  if (!["32px", "34px", "38px"].includes(foundation.actionControlHeight)) {
    throw new Error(`${label} action control height is invalid`);
  }
  if (!["6px 10px", "8px 11px", "9px 13px"].includes(foundation.actionControlPadding)) {
    throw new Error(`${label} action control padding is invalid`);
  }
  if (!["30px", "32px", "34px"].includes(foundation.compactControlHeight)) {
    throw new Error(`${label} compact control height is invalid`);
  }
  if (!["4px 8px", "5px 10px", "6px 12px"].includes(foundation.compactControlPadding)) {
    throw new Error(`${label} compact control padding is invalid`);
  }
  if (!["38px", "40px", "44px"].includes(foundation.formControlHeight)) {
    throw new Error(`${label} form control height is invalid`);
  }
  if (!["0 9px", "0 10px", "0 12px"].includes(foundation.formControlPadding)) {
    throw new Error(`${label} form control padding is invalid`);
  }
  if (!["34px", "38px", "42px"].includes(foundation.iconButtonSize)) {
    throw new Error(`${label} icon button size is invalid`);
  }
  if (!["0.82rem", "0.84rem", "0.9rem"].includes(foundation.controlFontSize)) {
    throw new Error(`${label} control font size is invalid`);
  }
  if (!["12px", "14px", "16px"].includes(foundation.cardPadding)) {
    throw new Error(`${label} card padding is invalid`);
  }
  if (!["8px", "10px", "12px"].includes(foundation.cardGap)) {
    throw new Error(`${label} card gap is invalid`);
  }
  if (!["9px 10px", "10px 12px", "12px 14px"].includes(foundation.rowPadding)) {
    throw new Error(`${label} row padding is invalid`);
  }
  if (!["8px", "10px", "12px"].includes(foundation.rowGap)) {
    throw new Error(`${label} row gap is invalid`);
  }
  if (!["4px", "6px", "8px"].includes(foundation.technicalAffordanceGap)) {
    throw new Error(`${label} technical affordance gap is invalid`);
  }
  if (!["220px", "260px", "300px"].includes(foundation.technicalSourceMaxWidth)) {
    throw new Error(`${label} technical source width is invalid`);
  }
  if (!["260px", "292px", "320px"].includes(foundation.technicalEvidenceMaxWidth)) {
    throw new Error(`${label} technical evidence width is invalid`);
  }
  if (!["320px", "360px", "420px"].includes(foundation.technicalPreviewChipMaxWidth)) {
    throw new Error(`${label} technical preview width is invalid`);
  }
  if (!["16px 18px", "18px 20px", "20px 22px"].includes(foundation.pageHeaderPadding)) {
    throw new Error(`${label} page header padding is invalid`);
  }
  if (!["6px", "8px", "10px"].includes(foundation.metadataGap)) {
    throw new Error(`${label} metadata gap is invalid`);
  }
  if (!["44px", "52px", "56px"].includes(foundation.pageIconSize)) {
    throw new Error(`${label} page icon size is invalid`);
  }
  if (!["4px", "5px", "6px"].includes(foundation.badgeGap)) {
    throw new Error(`${label} badge gap is invalid`);
  }
  if (!["24px", "26px", "28px"].includes(foundation.badgeHeight)) {
    throw new Error(`${label} badge height is invalid`);
  }
  if (!["3px 10px", "4px 14px", "5px 16px"].includes(foundation.modeBadgePadding)) {
    throw new Error(`${label} mode badge padding is invalid`);
  }
  if (!["0.72rem", "0.76rem", "0.8rem"].includes(foundation.badgeFontSize)) {
    throw new Error(`${label} badge font size is invalid`);
  }
  if (!["0.74rem", "0.78rem", "0.82rem"].includes(foundation.modeBadgeFontSize)) {
    throw new Error(`${label} mode badge font size is invalid`);
  }
  return foundation;
}

function validateDesignSystemMutationResponse(value, label) {
  const result = asObject(value, label);
  assertAllowedKeys(
    result,
    new Set([
      "status",
      "severity",
      "reason_code",
      "reason_key",
      "next_action_key",
      "component_id",
      "target_scope",
      "target_file",
      "requested_changes",
      "current_foundation",
      "proposed_foundation",
      "current_interaction",
      "proposed_interaction",
      "applied",
      "generated_files",
      "tool_command",
      "plan_token",
    ]),
    label,
  );
  if (!["ready", "passed", "blocked", "manual_required", "approval_required"].includes(displayText(result.status, ""))) {
    throw new Error(`${label} status is invalid`);
  }
  if (!["info", "warning", "error"].includes(displayText(result.severity, ""))) {
    throw new Error(`${label} severity is invalid`);
  }
  if (displayText(result.component_id, "") !== "tooltip-copy") {
    throw new Error(`${label} component_id is invalid`);
  }
  if (!safeRelativePathList(result.target_file).length) {
    throw new Error(`${label} target_file is invalid`);
  }
  if (displayText(result.target_scope, "") !== "dashboard-control-center") {
    throw new Error(`${label} target_scope is invalid`);
  }
  const requested = asObject(result.requested_changes, `${label} requested_changes`);
  assertAllowedKeys(
    requested,
    new Set([
      "target_scope",
      "theme_accent",
      "density",
      "radius_scale",
      "typography_scale",
      "action_control_height",
      "action_control_padding",
      "compact_control_height",
      "compact_control_padding",
      "form_control_height",
      "form_control_padding",
      "icon_button_size",
      "control_font_size",
      "card_padding",
      "card_gap",
      "row_padding",
      "row_gap",
      "technical_affordance_gap",
      "technical_source_max_width",
      "technical_evidence_max_width",
      "technical_preview_chip_max_width",
      "page_header_padding",
      "metadata_gap",
      "page_icon_size",
      "badge_gap",
      "badge_height",
      "mode_badge_padding",
      "badge_font_size",
      "mode_badge_font_size",
      "tooltip_trigger",
      "tooltip_hide_policy",
      "tooltip_placement",
      "tooltip_max_width",
      "copy_feedback_trigger",
      "copy_feedback_hide_policy",
      "copy_feedback_placement",
      "copy_feedback_collision",
      "copy_feedback_duration_ms",
    ]),
    `${label} requested_changes`,
  );
  if (
    requested.target_scope !== "dashboard-control-center" ||
    !["blue", "teal", "slate"].includes(requested.theme_accent) ||
    !["compact", "balanced", "comfortable"].includes(requested.density) ||
    !["compact", "standard", "soft"].includes(requested.radius_scale) ||
    !["standard", "large"].includes(requested.typography_scale) ||
    !["32px", "34px", "38px"].includes(requested.action_control_height) ||
    !["6px 10px", "8px 11px", "9px 13px"].includes(requested.action_control_padding) ||
    !["30px", "32px", "34px"].includes(requested.compact_control_height) ||
    !["4px 8px", "5px 10px", "6px 12px"].includes(requested.compact_control_padding) ||
    !["38px", "40px", "44px"].includes(requested.form_control_height) ||
    !["0 9px", "0 10px", "0 12px"].includes(requested.form_control_padding) ||
    !["34px", "38px", "42px"].includes(requested.icon_button_size) ||
    !["0.82rem", "0.84rem", "0.9rem"].includes(requested.control_font_size) ||
    !["12px", "14px", "16px"].includes(requested.card_padding) ||
    !["8px", "10px", "12px"].includes(requested.card_gap) ||
    !["9px 10px", "10px 12px", "12px 14px"].includes(requested.row_padding) ||
    !["8px", "10px", "12px"].includes(requested.row_gap) ||
    !["4px", "6px", "8px"].includes(requested.technical_affordance_gap) ||
    !["220px", "260px", "300px"].includes(requested.technical_source_max_width) ||
    !["260px", "292px", "320px"].includes(requested.technical_evidence_max_width) ||
    !["320px", "360px", "420px"].includes(requested.technical_preview_chip_max_width) ||
    !["16px 18px", "18px 20px", "20px 22px"].includes(requested.page_header_padding) ||
    !["6px", "8px", "10px"].includes(requested.metadata_gap) ||
    !["44px", "52px", "56px"].includes(requested.page_icon_size) ||
    !["4px", "5px", "6px"].includes(requested.badge_gap) ||
    !["24px", "26px", "28px"].includes(requested.badge_height) ||
    !["3px 10px", "4px 14px", "5px 16px"].includes(requested.mode_badge_padding) ||
    !["0.72rem", "0.76rem", "0.8rem"].includes(requested.badge_font_size) ||
    !["0.74rem", "0.78rem", "0.82rem"].includes(requested.mode_badge_font_size) ||
    !["hover-only", "disabled"].includes(requested.tooltip_trigger) ||
    requested.tooltip_hide_policy !== "pointer-leave" ||
    requested.tooltip_placement !== "top" ||
    !["260px", "300px", "360px"].includes(requested.tooltip_max_width) ||
    !["hover-only", "disabled"].includes(requested.copy_feedback_trigger) ||
    requested.copy_feedback_hide_policy !== "pointer-leave" ||
    requested.copy_feedback_placement !== "top" ||
    requested.copy_feedback_collision !== "shift" ||
    !["800", "1200", "1800"].includes(String(requested.copy_feedback_duration_ms))
  ) {
    throw new Error(`${label} requested_changes are invalid`);
  }
  validateDesignSystemFoundation(result.current_foundation, `${label} current_foundation`);
  validateDesignSystemFoundation(result.proposed_foundation, `${label} proposed_foundation`);
  validateDesignSystemInteraction(result.current_interaction, `${label} current_interaction`);
  validateDesignSystemInteraction(result.proposed_interaction, `${label} proposed_interaction`);
  for (const file of asArray(result.generated_files)) {
    if (!safeRelativePath(file)) {
      throw new Error(`${label} generated_files contains an unsafe path`);
    }
  }
  if (typeof result.applied !== "boolean") {
    throw new Error(`${label} applied flag is invalid`);
  }
  if (!safeDisplayCommand(result.tool_command)) {
    throw new Error(`${label} tool command is invalid`);
  }
  if (result.plan_token !== undefined && !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(displayText(result.plan_token, ""))) {
    throw new Error(`${label} plan_token is invalid`);
  }
  return result;
}

function validateMaintenanceEvidence(maintenance) {
  for (const row of asArray(maintenance.evidence_rows)) {
    if (!row || typeof row !== "object" || Array.isArray(row)) {
      throw new Error("dashboard maintenance evidence row must be an object");
    }
    for (const key of ["id", "label", "importance", "reference"]) {
      if (!displayText(row[key], "")) {
        throw new Error(`dashboard maintenance evidence row ${key} is missing`);
      }
    }
    if (!ALLOWED_STATES.has(displayText(row.status, ""))) {
      throw new Error("dashboard maintenance evidence row status is invalid");
    }
  }
}

function safeMaintenanceReference(value) {
  const text = displayText(value, "");
  if (!text) {
    return "";
  }
  if (safeScopedReferenceList(text)) {
    return text;
  }
  return /^[A-Za-z0-9._:-]+$/.test(text) ? text : "";
}

function validateMaintenanceSyncRow(row, label) {
  const source = asObject(row, label);
  assertAllowedKeys(
    source,
    new Set(["id", "label", "status", "source_id", "freshness_state", "authority", "observed_at", "detail", "next_action", "reference", "priority"]),
    label,
  );
  for (const key of ["id", "label", "source_id", "observed_at", "detail", "next_action", "reference", "priority"]) {
    if (!displayText(source[key], "")) {
      throw new Error(`${label} ${key} is missing`);
    }
  }
  if (!ALLOWED_STATES.has(displayText(source.status, ""))) {
    throw new Error(`${label} status is invalid`);
  }
  if (!EVIDENCE_FRESHNESS_STATES.has(displayText(source.freshness_state, "")) || !EVIDENCE_AUTHORITIES.has(displayText(source.authority, ""))) {
    throw new Error(`${label} evidence metadata is invalid`);
  }
  if (!RISK_LEVELS.has(displayText(source.priority, ""))) {
    throw new Error(`${label} priority is invalid`);
  }
  if (!safeMaintenanceReference(source.reference)) {
    throw new Error(`${label} reference is invalid`);
  }
}

function validateMaintenanceAction(row, label) {
  const source = asObject(row, label);
  assertAllowedKeys(source, new Set(["id", "label", "status", "action_type", "detail", "source_id"]), label);
  for (const key of ["id", "label", "action_type", "detail", "source_id"]) {
    if (!displayText(source[key], "")) {
      throw new Error(`${label} ${key} is missing`);
    }
  }
  if (!ALLOWED_STATES.has(displayText(source.status, "")) || !MAINTENANCE_ACTION_TYPES.has(displayText(source.action_type, ""))) {
    throw new Error(`${label} state is invalid`);
  }
}

function validateMaintenanceSyncState(data) {
  if (data.maintenance_sync_state === undefined || data.maintenance_sync_state === null) {
    return;
  }
  const state = asObject(data.maintenance_sync_state, "dashboard maintenance_sync_state");
  assertAllowedKeys(
    state,
    new Set(["status", "observed_at", "menu_id", "workflow_context", "repo_id", "repository_name", "sync_summary", "git_state", "ci_state", "product_gate_evidence", "documentation_sync", "maintenance_warnings", "recommended_actions", "blocked_actions", "evidence_links"]),
    "dashboard maintenance_sync_state",
  );
  if (!ALLOWED_STATES.has(displayText(state.status, "")) || !MENU_IDS.has(displayText(state.menu_id, "")) || !WORKFLOW_CONTEXTS.has(displayText(state.workflow_context, ""))) {
    throw new Error("dashboard maintenance_sync_state status or context is invalid");
  }
  for (const key of ["observed_at", "repo_id", "repository_name"]) {
    if (!displayText(state[key], "")) {
      throw new Error(`dashboard maintenance_sync_state ${key} is missing`);
    }
  }
  const selectedRepoId = displayText(data.selected_context?.target_repository?.repo_id, "");
  if (selectedRepoId && selectedRepoId !== "not_applicable" && displayText(state.repo_id, "") !== selectedRepoId) {
    throw new Error("dashboard maintenance_sync_state repo_id must match selected context");
  }

  const summary = asObject(state.sync_summary, "dashboard maintenance sync_summary");
  assertAllowedKeys(summary, new Set(["status", "current_result", "immediate_action_required", "blocker_count", "warning_count", "next_safe_action"]), "dashboard maintenance sync_summary");
  if (!ALLOWED_STATES.has(displayText(summary.status, "")) || typeof summary.immediate_action_required !== "boolean") {
    throw new Error("dashboard maintenance sync_summary state is invalid");
  }
  for (const key of ["current_result", "next_safe_action"]) {
    if (!displayText(summary[key], "")) {
      throw new Error(`dashboard maintenance sync_summary ${key} is missing`);
    }
  }
  validateNonNegativeInteger(summary.blocker_count, "dashboard maintenance sync_summary blocker_count");
  validateNonNegativeInteger(summary.warning_count, "dashboard maintenance sync_summary warning_count");

  const gitState = asObject(state.git_state, "dashboard maintenance git_state");
  assertAllowedKeys(gitState, new Set(["status", "source_id", "observed_at", "branch", "upstream", "main_target", "head", "worktree_state", "staged_count", "unstaged_count", "untracked_count", "changed_count", "ahead", "behind", "worktree_count", "sync_status", "action_needed"]), "dashboard maintenance git_state");
  if (!ALLOWED_STATES.has(displayText(gitState.status, "")) || !ALLOWED_STATES.has(displayText(gitState.sync_status, "")) || !MAINTENANCE_GIT_ACTIONS.has(displayText(gitState.action_needed, ""))) {
    throw new Error("dashboard maintenance git_state state is invalid");
  }
  for (const field of ["staged_count", "unstaged_count", "untracked_count", "changed_count", "ahead", "behind", "worktree_count"]) {
    validateNonNegativeInteger(gitState[field], `dashboard maintenance git_state ${field}`);
  }
  for (const key of ["source_id", "observed_at", "worktree_state"]) {
    if (!displayText(gitState[key], "")) {
      throw new Error(`dashboard maintenance git_state ${key} is missing`);
    }
  }

  const ciState = asObject(state.ci_state, "dashboard maintenance ci_state");
  assertAllowedKeys(ciState, new Set(["status", "observed_at", "branch_ci_status", "pr_ci_status", "main_ci_status", "provider_visibility_status", "local_tests_status", "head_match_status", "annotations"]), "dashboard maintenance ci_state");
  for (const key of ["status", "branch_ci_status", "pr_ci_status", "main_ci_status", "provider_visibility_status", "local_tests_status"]) {
    if (!ALLOWED_STATES.has(displayText(ciState[key], ""))) {
      throw new Error(`dashboard maintenance ci_state ${key} is invalid`);
    }
  }
  if (!CI_HEAD_MATCH_STATES.has(displayText(ciState.head_match_status, ""))) {
    throw new Error("dashboard maintenance ci_state head_match_status is invalid");
  }
  for (const annotation of asArray(ciState.annotations)) {
    validateMaintenanceSyncRow(annotation, "dashboard maintenance ci_state annotation");
  }

  const productGateEvidence = asObject(state.product_gate_evidence, "dashboard maintenance product_gate_evidence");
  assertAllowedKeys(productGateEvidence, new Set(["status", "layers"]), "dashboard maintenance product_gate_evidence");
  if (!ALLOWED_STATES.has(displayText(productGateEvidence.status, ""))) {
    throw new Error("dashboard maintenance product_gate_evidence status is invalid");
  }
  for (const layer of asArray(productGateEvidence.layers)) {
    validateMaintenanceSyncRow(layer, "dashboard maintenance product_gate_evidence layer");
  }

  const documentationSync = asObject(state.documentation_sync, "dashboard maintenance documentation_sync");
  assertAllowedKeys(documentationSync, new Set(["status", "rows"]), "dashboard maintenance documentation_sync");
  if (!ALLOWED_STATES.has(displayText(documentationSync.status, ""))) {
    throw new Error("dashboard maintenance documentation_sync status is invalid");
  }
  for (const row of asArray(documentationSync.rows)) {
    validateMaintenanceSyncRow(row, "dashboard maintenance documentation_sync row");
  }
  for (const row of asArray(state.maintenance_warnings)) {
    validateMaintenanceSyncRow(row, "dashboard maintenance warning row");
  }
  for (const row of asArray(state.evidence_links)) {
    validateMaintenanceSyncRow(row, "dashboard maintenance evidence link");
  }
  for (const row of asArray(state.recommended_actions)) {
    validateMaintenanceAction(row, "dashboard maintenance recommended action");
  }
  for (const row of asArray(state.blocked_actions)) {
    validateMaintenanceAction(row, "dashboard maintenance blocked action");
  }
}

function validateBrowserDebugStage(stage, label, pathKey = "path") {
  if (!stage || typeof stage !== "object" || Array.isArray(stage)) {
    throw new Error(`${label} must be an object`);
  }
  if (!ALLOWED_STATES.has(displayText(stage.status, ""))) {
    throw new Error(`${label} status is invalid`);
  }
  if (!safeBrowserDebugCommand(stage.command)) {
    throw new Error(`${label} command is invalid`);
  }
  if (pathKey && stage[pathKey] !== undefined && displayText(stage[pathKey], "") !== "not_collected" && !safeScopedRelativePath(stage[pathKey])) {
    throw new Error(`${label} path is invalid`);
  }
}

function validateBrowserDebug(data) {
  if (data.browser_debug === undefined || data.browser_debug === null) {
    return;
  }
  const browserDebug = asObject(data.browser_debug, "dashboard browser_debug");
  if (!/^[0-9]+\.[0-9]+\.[0-9]+$/.test(displayText(browserDebug.schema_version, ""))) {
    throw new Error("dashboard browser_debug schema version is invalid");
  }
  if (!ALLOWED_STATES.has(displayText(browserDebug.status, ""))) {
    throw new Error("dashboard browser_debug status is invalid");
  }
  if (!displayText(browserDebug.target, "")) {
    throw new Error("dashboard browser_debug target is missing");
  }
  if (!displayText(browserDebug.selected_cli_repository, "")) {
    throw new Error("dashboard browser_debug selected_cli_repository is missing");
  }
  validateBrowserDebugStage(browserDebug.tool, "dashboard browser_debug tool", "");
  if (!displayText(browserDebug.tool.source, "")) {
    throw new Error("dashboard browser_debug tool source is missing");
  }
  validateBrowserDebugStage(browserDebug.manifest, "dashboard browser_debug manifest");
  if (!["tools/dashboard-review-manifest", "tools/dashboard-browser-debug-manifest"].includes(safeRelativePath(browserDebug.manifest.path))) {
    throw new Error("dashboard browser_debug manifest path is invalid");
  }
  validateBrowserDebugStage(browserDebug.review, "dashboard browser_debug review", "artifact_index_path");
  validateBrowserDebugStage(browserDebug.agent_package, "dashboard browser_debug agent_package");
  validateBrowserDebugStage(browserDebug.agent_result, "dashboard browser_debug agent_result");
  validateBrowserDebugStage(browserDebug.agent_report, "dashboard browser_debug agent_report");
  const boundary = asObject(browserDebug.boundary, "dashboard browser_debug boundary");
  for (const key of ["dashboard_executes_browser_debug", "external_upload", "provider_api", "credential_storage", "product_repository_mutated"]) {
    if (boundary[key] !== false) {
      throw new Error(`dashboard browser_debug boundary ${key} must be false`);
    }
  }
}

function validateDesignStudioBoundary(boundary, label) {
  const source = asObject(boundary, label);
  if (source.proposal_only !== true) {
    throw new Error(`${label} proposal_only must be true`);
  }
  for (const key of [
    "writes_allowed",
    "direct_apply_authority",
    "external_product_apply",
    "provider_dispatch",
    "imagegen_executed",
    "plan_token_created",
    "apply_token_created",
    "approval_receipt_created",
  ]) {
    if (source[key] !== false) {
      throw new Error(`${label} ${key} must be false`);
    }
  }
}

const DESIGN_STUDIO_BOUNDARY_KEYS = [
  "proposal_only",
  "writes_allowed",
  "direct_apply_authority",
  "external_product_apply",
  "provider_dispatch",
  "imagegen_executed",
  "plan_token_created",
  "apply_token_created",
  "approval_receipt_created",
];

const DESIGN_STUDIO_PACKAGE_BOUNDARY_KEYS = [
  ...DESIGN_STUDIO_BOUNDARY_KEYS,
  "background_execution",
  "credential_storage",
  "browser_command_execution",
  "raw_prompt_included",
  "package_uploaded",
];

function validateDesignStudioPackageBoundary(boundary, label) {
  validateDesignStudioBoundary(boundary, label);
  const source = asObject(boundary, label);
  for (const key of ["background_execution", "credential_storage", "browser_command_execution", "raw_prompt_included", "package_uploaded"]) {
    if (source[key] !== false) {
      throw new Error(`${label} ${key} must be false`);
    }
  }
}

function validateDesignStudioSha256Digest(value, label) {
  if (!/^sha256:[a-f0-9]{64}$/i.test(displayText(value, ""))) {
    throw new Error(`${label} must be a sha256 digest`);
  }
}

function safeDesignStudioPackagePath(value) {
  const normalized = safeRelativePath(displayText(value, ""));
  if (!normalized) {
    return "";
  }
  const allowedPrefixes = [
    ".dashboard-design-studio-events/agent-packages/",
    "external-test-store/agent-packages/",
  ];
  if (!allowedPrefixes.some((prefix) => normalized.startsWith(prefix)) || !normalized.endsWith("/package.json")) {
    return "";
  }
  return normalized;
}

function validateDesignStudioResponseContracts(value, label) {
  const contracts = asArray(value);
  const schemaIds = new Set();
  for (const contractValue of contracts) {
    const contract = asObject(contractValue, `${label} response contract`);
    assertAllowedKeys(contract, new Set(["schema_id", "required_fields", "forbidden_fields"]), `${label} response contract`);
    const schemaId = displayText(contract.schema_id, "");
    if (!["CandidateEnvelope", "DesignChangeProposal"].includes(schemaId)) {
      throw new Error(`${label} response contract schema_id is invalid`);
    }
    schemaIds.add(schemaId);
    for (const field of [...asArray(contract.required_fields), ...asArray(contract.forbidden_fields)]) {
      if (!displayText(field, "")) {
        throw new Error(`${label} response contract field is invalid`);
      }
    }
  }
  if (!schemaIds.has("CandidateEnvelope") || !schemaIds.has("DesignChangeProposal")) {
    throw new Error(`${label} response contracts must include candidate and proposal schemas`);
  }
}

function validateDesignStudioHandoffPackage(value, label, parent = {}) {
  if (value === undefined || value === null) {
    return;
  }
  const source = asObject(value, label);
  assertAllowedKeys(source, new Set([
    "package_id",
    "package_version",
    "package_status",
    "package_path",
    "package_digest",
    "event_id",
    "request_id",
    "created_at",
    "expires_at",
    "next_action",
    ...DESIGN_STUDIO_PACKAGE_BOUNDARY_KEYS,
  ]), label);
  for (const key of ["package_id", "package_version", "event_id", "request_id", "created_at", "expires_at", "next_action"]) {
    if (!displayText(source[key], "")) {
      throw new Error(`${label} ${key} is missing`);
    }
  }
  if (displayText(source.package_status, "") !== "ready") {
    throw new Error(`${label} package_status must be ready`);
  }
  if (!safeDesignStudioPackagePath(source.package_path)) {
    throw new Error(`${label} package_path is invalid`);
  }
  if (parent.event_id && displayText(source.event_id, "") !== displayText(parent.event_id, "")) {
    throw new Error(`${label} event_id must match the parent handoff`);
  }
  if (parent.request_id && displayText(source.request_id, "") !== displayText(parent.request_id, "")) {
    throw new Error(`${label} request_id must match the parent handoff`);
  }
  validateDesignStudioSha256Digest(source.package_digest, `${label} package_digest`);
  validateDesignStudioPackageBoundary(source, label);
}

function validateDesignStudioSubscriptionHandoff(value, label) {
  const handoff = asObject(value, label);
  assertAllowedKeys(handoff, new Set([
    "handoff_id",
    "event_id",
    "request_id",
    "target_ref",
    "provider_mode",
    "provider_status",
    "request_kind",
    "intent_digest",
    "purpose_preview",
    "base_snapshot_hash",
    "response_contracts",
    "import_commands",
    "package_command",
    "package",
    "next_action",
    ...DESIGN_STUDIO_PACKAGE_BOUNDARY_KEYS,
  ]), label);
  for (const key of ["handoff_id", "event_id", "request_id", "target_ref", "provider_status", "request_kind", "purpose_preview", "base_snapshot_hash", "next_action"]) {
    if (!displayText(handoff[key], "")) {
      throw new Error(`${label} ${key} is missing`);
    }
  }
  if (displayText(handoff.provider_mode, "") !== "subscription-agent") {
    throw new Error(`${label} provider_mode must be subscription-agent`);
  }
  validateDesignStudioSha256Digest(handoff.intent_digest, `${label} intent_digest`);
  validateDesignStudioResponseContracts(handoff.response_contracts, label);
  for (const command of asArray(handoff.import_commands)) {
    if (!safeDisplayCommand(command)) {
      throw new Error(`${label} import command is invalid`);
    }
  }
  if (!safeDisplayCommand(handoff.package_command)) {
    throw new Error(`${label} package command is invalid`);
  }
  validateDesignStudioHandoffPackage(handoff.package, `${label} package`, handoff);
  validateDesignStudioPackageBoundary(handoff, label);
}

function validateDesignStudioTemplateOperation(value, label) {
  const operation = asObject(value, label);
  assertAllowedKeys(operation, new Set(["operation_id", "kind", "summary", "target_ref", "allowed_output", "authority"]), label);
  for (const key of ["operation_id", "kind", "summary", "target_ref", "allowed_output", "authority"]) {
    if (!displayText(operation[key], "")) {
      throw new Error(`${label} ${key} is missing`);
    }
  }
  if (operation.authority !== "proposal_only") {
    throw new Error(`${label} authority must be proposal_only`);
  }
  if (!safeDesignStudioScopedPath(operation.allowed_output)) {
    throw new Error(`${label} allowed_output is unsafe`);
  }
}

function validateDesignStudioTemplatePreview(value, label) {
  if (value === undefined || value === null) {
    return;
  }
  const preview = asObject(value, label);
  assertAllowedKeys(preview, new Set([
    "template_proposal_id",
    "record_version",
    "schema_id",
    "template_id",
    "template_version",
    "target_ref",
    "target_apply_mode",
    "owner_tool",
    "compatibility",
    "candidate_operation_count",
    "candidate_operations",
    "affected_source_files",
    "affected_generated_files",
    "manual_decisions",
    "check_plan",
    "risk_assessment",
    "accessibility_notes",
    "confidence",
    "rollback_outline",
    "decision_gate",
    "template_digest",
    "redaction_state",
    "next_action",
    ...DESIGN_STUDIO_BOUNDARY_KEYS,
  ]), label);
  for (const key of ["template_proposal_id", "record_version", "schema_id", "template_id", "template_version", "target_ref", "target_apply_mode", "template_digest", "redaction_state", "next_action"]) {
    if (!displayText(preview[key], "")) {
      throw new Error(`${label} ${key} is missing`);
    }
  }
  if (preview.schema_id !== "TemplateProposal") {
    throw new Error(`${label} schema_id must be TemplateProposal`);
  }
  validateNonNegativeInteger(Number(preview.candidate_operation_count || 0), `${label} candidate_operation_count`);
  if (Number(preview.candidate_operation_count || 0) < 1) {
    throw new Error(`${label} candidate_operation_count must be positive`);
  }
  const compatibility = asObject(preview.compatibility, `${label} compatibility`);
  assertAllowedKeys(compatibility, new Set(["status", "target_ref", "target_apply_mode", "notes"]), `${label} compatibility`);
  if (!ALLOWED_STATES.has(displayText(compatibility.status, ""))) {
    throw new Error(`${label} compatibility status is invalid`);
  }
  for (const operation of asArray(preview.candidate_operations)) {
    validateDesignStudioTemplateOperation(operation, `${label} candidate_operation`);
  }
  for (const file of [...asArray(preview.affected_source_files), ...asArray(preview.affected_generated_files)]) {
    if (!safeDesignStudioScopedPath(file)) {
      throw new Error(`${label} affected file is unsafe`);
    }
  }
  for (const command of asArray(preview.check_plan)) {
    if (!safeDesignStudioCheckReference(command)) {
      throw new Error(`${label} check_plan contains an unsafe command or check id`);
    }
  }
  validateDesignStudioDecisionGate(preview.decision_gate, `${label} decision_gate`);
  validateDesignStudioSha256Digest(preview.template_digest, `${label} template_digest`);
  validateDesignStudioBoundary(preview, label);
}

function validateDesignStudioTemplateLibrary(value, label) {
  if (value === undefined || value === null) {
    return;
  }
  const library = asObject(value, label);
  assertAllowedKeys(library, new Set([
    "status",
    "sync_id",
    "registry",
    "registry_path",
    "template_count",
    "ready_count",
    "supported_operations",
    "unsupported_operations",
    "templates",
    "latest_preview",
    ...DESIGN_STUDIO_BOUNDARY_KEYS,
  ]), label);
  if (library.sync_id !== "dashboard_design_studio_template_proposal_library") {
    throw new Error(`${label} sync_id is invalid`);
  }
  if (!ALLOWED_STATES.has(displayText(library.status, ""))) {
    throw new Error(`${label} status is invalid`);
  }
  const registry = asObject(library.registry, `${label} registry`);
  assertAllowedKeys(registry, new Set(["registry_id", "version", "path", "source", "updated_at"]), `${label} registry`);
  if (safeRelativePath(registry.path) !== "docs/design-system/dashboard-control-center/templates.json") {
    throw new Error(`${label} registry path is invalid`);
  }
  if (safeRelativePath(library.registry_path) !== "docs/design-system/dashboard-control-center/templates.json") {
    throw new Error(`${label} registry_path is invalid`);
  }
  validateNonNegativeInteger(Number(library.template_count || 0), `${label} template_count`);
  validateNonNegativeInteger(Number(library.ready_count || 0), `${label} ready_count`);
  for (const operation of [...asArray(library.supported_operations), ...asArray(library.unsupported_operations)]) {
    if (!displayText(operation, "")) {
      throw new Error(`${label} operation metadata is invalid`);
    }
  }
  for (const templateValue of asArray(library.templates)) {
    const template = asObject(templateValue, `${label} template`);
    assertAllowedKeys(template, new Set([
      "template_id",
      "version",
      "display_name",
      "summary",
      "product_type",
      "supported_targets",
      "allowed_outputs",
      "required_checks",
      "lifecycle_state",
      "redaction_state",
      "candidate_operation_count",
      "template_digest",
      ...DESIGN_STUDIO_BOUNDARY_KEYS,
    ]), `${label} template`);
    for (const key of ["template_id", "version", "display_name", "summary", "product_type", "lifecycle_state", "redaction_state"]) {
      if (!displayText(template[key], "")) {
        throw new Error(`${label} template ${key} is missing`);
      }
    }
    validateNonNegativeInteger(Number(template.candidate_operation_count || 0), `${label} template candidate_operation_count`);
    validateDesignStudioSha256Digest(template.template_digest, `${label} template_digest`);
    for (const output of asArray(template.allowed_outputs)) {
      if (!safeDesignStudioScopedPath(output)) {
        throw new Error(`${label} template allowed_outputs contains an unsafe path`);
      }
    }
    for (const command of asArray(template.required_checks)) {
      if (!safeDesignStudioCheckReference(command)) {
        throw new Error(`${label} template required_checks contains an unsafe command or check id`);
      }
    }
    validateDesignStudioBoundary(template, `${label} template`);
  }
  validateDesignStudioTemplatePreview(library.latest_preview, `${label} latest_preview`);
  validateDesignStudioBoundary(library, label);
}

function validateDesignStudioDecisionGate(value, label) {
  if (value === undefined || value === null) {
    return;
  }
  const gate = asObject(value, label);
  if (displayText(gate.status, "") !== "manual_required") {
    throw new Error(`${label} status must be manual_required`);
  }
}

function validateDesignStudioProposalPreview(preview, label) {
  if (preview === undefined || preview === null) {
    return;
  }
  const source = asObject(preview, label);
  validateNonNegativeInteger(Number(source.operation_count || 0), `${label} operation_count`);
  for (const file of asArray(source.affected_source_files)) {
    if (!safeRelativePath(file)) {
      throw new Error(`${label} affected_source_files contains an unsafe path`);
    }
  }
  for (const file of asArray(source.affected_generated_files)) {
    if (!safeRelativePath(file)) {
      throw new Error(`${label} affected_generated_files contains an unsafe path`);
    }
  }
  for (const command of asArray(source.check_plan)) {
    if (!safeDisplayCommand(command)) {
      throw new Error(`${label} check_plan contains an unsafe command`);
    }
  }
  validateDesignStudioDecisionGate(source.decision_gate, `${label} decision_gate`);
  validateDesignStudioBoundary(source, label);
}

function validateDesignStudioCandidateReview(review, label) {
  if (review === undefined || review === null) {
    return;
  }
  const source = asObject(review, label);
  for (const key of ["import_id", "candidate_id", "source_kind", "payload_digest"]) {
    if (!displayText(source[key], "")) {
      throw new Error(`${label} ${key} is missing`);
    }
  }
  validateDesignStudioDecisionGate(source.decision_gate, `${label} decision_gate`);
  validateDesignStudioBoundary(source, label);
}

function validateDesignStudioHistoryRow(row, label) {
  const source = asObject(row, label);
  for (const key of ["row_id", "row_kind", "status", "source_id", "schema_id", "next_action"]) {
    if (!displayText(source[key], "")) {
      throw new Error(`${label} ${key} is missing`);
    }
  }
  if (!["event", "import"].includes(displayText(source.row_kind, ""))) {
    throw new Error(`${label} row_kind is invalid`);
  }
  if (!ALLOWED_STATES.has(displayText(source.status, "")) && displayText(source.status, "") !== "queued") {
    throw new Error(`${label} status is invalid`);
  }
  if ("intent_text" in source || "payload" in source || "operations" in source) {
    throw new Error(`${label} must not expose raw prompt, payload, or operations`);
  }
  validateNonNegativeInteger(Number(source.event_order || 0), `${label} event_order`);
  for (const file of asArray(source.affected_source_files)) {
    if (!safeRelativePath(file)) {
      throw new Error(`${label} affected_source_files contains an unsafe path`);
    }
  }
  for (const file of asArray(source.affected_generated_files)) {
    if (!safeRelativePath(file)) {
      throw new Error(`${label} affected_generated_files contains an unsafe path`);
    }
  }
  for (const command of asArray(source.check_plan)) {
    if (!safeDisplayCommand(command)) {
      throw new Error(`${label} check_plan contains an unsafe command`);
    }
  }
  validateDesignStudioBoundary(source, label);
}

function validateDesignStudio(data) {
  if (data.design_studio === undefined || data.design_studio === null) {
    return;
  }
  const designStudio = asObject(data.design_studio, "dashboard design_studio");
  if (!ALLOWED_STATES.has(displayText(designStudio.status, ""))) {
    throw new Error("dashboard design_studio status is invalid");
  }
  if (!displayText(designStudio.sync_id, "")) {
    throw new Error("dashboard design_studio sync_id is missing");
  }
  const summary = asObject(designStudio.summary, "dashboard design_studio summary");
  for (const key of ["event_count", "import_count", "candidate_count", "proposal_count"]) {
    validateNonNegativeInteger(Number(summary[key] || 0), `dashboard design_studio summary ${key}`);
  }
  if (!displayText(summary.next_action, "")) {
    throw new Error("dashboard design_studio next_action is missing");
  }
  for (const event of asArray(designStudio.events)) {
    const source = asObject(event, "dashboard design_studio event");
    if (!displayText(source.event_id, "") || "intent_text" in source) {
      throw new Error("dashboard design_studio event must expose redacted metadata");
    }
  }
  for (const imported of asArray(designStudio.imports)) {
    const source = asObject(imported, "dashboard design_studio import");
    if (!displayText(source.import_id, "") || "payload" in source || "operations" in source) {
      throw new Error("dashboard design_studio import must expose redacted metadata");
    }
    validateDesignStudioBoundary(source, "dashboard design_studio import");
  }
  for (const row of asArray(designStudio.history_rows)) {
    validateDesignStudioHistoryRow(row, "dashboard design_studio history row");
  }
  validateDesignStudioCandidateReview(designStudio.latest_candidate_review, "dashboard design_studio latest_candidate_review");
  validateDesignStudioProposalPreview(designStudio.latest_proposal_preview, "dashboard design_studio latest_proposal_preview");
  validateDesignStudioTemplateLibrary(designStudio.template_library, "dashboard design_studio template_library");
  if (designStudio.subscription_agent_handoff) {
    validateDesignStudioSubscriptionHandoff(
      designStudio.subscription_agent_handoff,
      "dashboard design_studio subscription_agent_handoff",
    );
  }
  if (designStudio.external_product_export) {
    const exported = asObject(designStudio.external_product_export, "dashboard design_studio external_product_export");
    if (displayText(exported.target_apply_mode, "") !== "plan-only") {
      throw new Error("dashboard design_studio external_product_export must be plan-only");
    }
    validateDesignStudioBoundary(exported, "dashboard design_studio external_product_export");
  }
  const providerPolicy = asObject(designStudio.api_key_provider_policy, "dashboard design_studio api_key_provider_policy");
  if (providerPolicy.api_call_available !== false) {
    throw new Error("dashboard design_studio api_key_provider_policy api_call_available must be false");
  }
  if (designStudio.owner_tool_transaction_preview) {
    const transaction = asObject(designStudio.owner_tool_transaction_preview, "dashboard design_studio owner_tool_transaction_preview");
    if (transaction.dry_run !== true) {
      throw new Error("dashboard design_studio owner_tool_transaction_preview must be dry-run");
    }
    validateDesignStudioBoundary(transaction, "dashboard design_studio owner_tool_transaction_preview");
  }
  validateDesignStudioBoundary(designStudio.boundaries, "dashboard design_studio boundaries");
}

function validateSecurityConfirmation(data) {
  const security = asObject(data.security, "dashboard security");
  if (security.confirmation === undefined) {
    return;
  }
  const selectedContext = asObject(data.selected_context, "dashboard selected_context");
  const selectedRepository = asObject(selectedContext.target_repository, "dashboard selected_context target_repository");
  const confirmation = asObject(security.confirmation, "dashboard security confirmation");
  assertAllowedKeys(
    confirmation,
    new Set(["status", "observed_at", "menu_id", "workflow_context", "repo_id", "repository_name", "product_head", "current_result", "safe_next_action", "approval_receipts", "unsafe_command_policy", "evidence", "authority_boundaries", "display_policy", "blockers", "recommended_actions", "restricted_actions"]),
    "dashboard security confirmation",
  );
  if (!ALLOWED_STATES.has(displayText(confirmation.status, ""))) {
    throw new Error("dashboard security confirmation status is invalid");
  }
  if (!MENU_IDS.has(displayText(confirmation.menu_id, "")) || !WORKFLOW_CONTEXTS.has(displayText(confirmation.workflow_context, ""))) {
    throw new Error("dashboard security confirmation context is invalid");
  }
  if (
    displayText(confirmation.menu_id, "") !== displayText(selectedContext.menu_id, "") ||
    displayText(confirmation.workflow_context, "") !== displayText(selectedContext.workflow_context, "") ||
    displayText(confirmation.repo_id, "") !== displayText(selectedRepository.repo_id, "")
  ) {
    throw new Error("dashboard security confirmation scope does not match selected context");
  }
  for (const key of ["repo_id", "repository_name", "observed_at", "current_result", "safe_next_action"]) {
    if (!displayText(confirmation[key], "")) {
      throw new Error(`dashboard security confirmation ${key} is missing`);
    }
  }
  if (!PRODUCT_HEAD_PATTERN.test(displayText(confirmation.product_head, "none"))) {
    throw new Error("dashboard security confirmation product_head is invalid");
  }
  const approvalReceipts = asObject(confirmation.approval_receipts, "dashboard security approval_receipts");
  assertAllowedKeys(approvalReceipts, new Set(["state", "read_allowed", "write_allowed", "receipt_reference"]), "dashboard security approval_receipts");
  if (!SECURITY_CONFIRMATION_RECEIPT_STATES.has(displayText(approvalReceipts.state, "")) || typeof approvalReceipts.read_allowed !== "boolean" || typeof approvalReceipts.write_allowed !== "boolean") {
    throw new Error("dashboard security approval_receipts state is invalid");
  }
  if (approvalReceipts.read_allowed || approvalReceipts.write_allowed) {
    throw new Error("dashboard security approval_receipts must not open read/write authority");
  }
  if (!displayText(approvalReceipts.receipt_reference, "")) {
    throw new Error("dashboard security approval_receipts receipt_reference is missing");
  }
  const unsafeCommandPolicy = asObject(confirmation.unsafe_command_policy, "dashboard security unsafe_command_policy");
  assertAllowedKeys(unsafeCommandPolicy, new Set(["state", "execution_mode", "copy_requires_safe_argv"]), "dashboard security unsafe_command_policy");
  if (!SECURITY_UNSAFE_COMMAND_POLICY_STATES.has(displayText(unsafeCommandPolicy.state, "")) || displayText(unsafeCommandPolicy.execution_mode, "") !== "preview_only" || unsafeCommandPolicy.copy_requires_safe_argv !== true) {
    throw new Error("dashboard security unsafe_command_policy is invalid");
  }
  const evidenceRows = asArray(confirmation.evidence);
  if (!evidenceRows.length) {
    throw new Error("dashboard security confirmation evidence is empty");
  }
  for (const evidence of evidenceRows) {
    if (!evidence || typeof evidence !== "object" || Array.isArray(evidence)) {
      throw new Error("dashboard security confirmation evidence must be an object");
    }
    assertAllowedKeys(evidence, new Set(["id", "label", "status", "source_id", "freshness_state", "authority", "observed_at", "source_artifacts", "meaning", "next_action"]), "dashboard security confirmation evidence");
    for (const key of ["id", "label", "source_id", "observed_at", "meaning", "next_action"]) {
      if (!displayText(evidence[key], "")) {
        throw new Error(`dashboard security confirmation evidence ${key} is missing`);
      }
    }
    if (!ALLOWED_STATES.has(displayText(evidence.status, "")) || !EVIDENCE_FRESHNESS_STATES.has(displayText(evidence.freshness_state, "")) || !EVIDENCE_AUTHORITIES.has(displayText(evidence.authority, ""))) {
      throw new Error("dashboard security confirmation evidence state is invalid");
    }
    if (!safeScopedReferenceList(evidence.source_artifacts)) {
      throw new Error("dashboard security confirmation evidence source_artifacts is invalid");
    }
  }
  const boundaries = asArray(confirmation.authority_boundaries);
  if (!boundaries.length) {
    throw new Error("dashboard security authority boundaries are empty");
  }
  for (const boundary of boundaries) {
    if (!boundary || typeof boundary !== "object" || Array.isArray(boundary)) {
      throw new Error("dashboard security authority boundary must be an object");
    }
    assertAllowedKeys(boundary, new Set(["id", "label", "state", "approval_required", "risk_level", "detail"]), "dashboard security authority boundary");
    for (const key of ["id", "label", "detail"]) {
      if (!displayText(boundary[key], "")) {
        throw new Error(`dashboard security authority boundary ${key} is missing`);
      }
    }
    if (!SECURITY_BOUNDARY_STATES.has(displayText(boundary.state, "")) || typeof boundary.approval_required !== "boolean" || !RISK_LEVELS.has(displayText(boundary.risk_level, ""))) {
      throw new Error("dashboard security authority boundary state is invalid");
    }
    if (displayText(boundary.state, "") === "open") {
      throw new Error("dashboard security authority boundary must not be open");
    }
  }
  const displayPolicyRows = asArray(confirmation.display_policy);
  if (!displayPolicyRows.length) {
    throw new Error("dashboard security display_policy is empty");
  }
  for (const row of displayPolicyRows) {
    if (!row || typeof row !== "object" || Array.isArray(row)) {
      throw new Error("dashboard security display_policy row must be an object");
    }
    assertAllowedKeys(row, new Set(["id", "label", "state", "detail"]), "dashboard security display_policy row");
    if (!displayText(row.id, "") || !displayText(row.label, "") || !displayText(row.detail, "") || !SECURITY_DISPLAY_POLICY_STATES.has(displayText(row.state, ""))) {
      throw new Error("dashboard security display_policy row is invalid");
    }
  }
  for (const collectionName of ["recommended_actions", "restricted_actions"]) {
    const rows = asArray(confirmation[collectionName]);
    if (!rows.length) {
      throw new Error(`dashboard security ${collectionName} is empty`);
    }
    for (const row of rows) {
      if (!row || typeof row !== "object" || Array.isArray(row)) {
        throw new Error(`dashboard security ${collectionName} row must be an object`);
      }
      assertAllowedKeys(row, new Set(["id", "label", "state", "detail"]), `dashboard security ${collectionName} row`);
      if (!displayText(row.id, "") || !displayText(row.label, "") || !displayText(row.detail, "") || !SECURITY_CONFIRMATION_ACTION_STATES.has(displayText(row.state, ""))) {
        throw new Error(`dashboard security ${collectionName} row is invalid`);
      }
    }
  }
  for (const blocker of asArray(confirmation.blockers)) {
    if (!blocker || typeof blocker !== "object" || Array.isArray(blocker)) {
      throw new Error("dashboard security confirmation blocker must be an object");
    }
    assertAllowedKeys(blocker, new Set(["id", "status", "source_id", "detail", "next_action"]), "dashboard security confirmation blocker");
    if (!displayText(blocker.id, "") || !displayText(blocker.source_id, "") || !displayText(blocker.detail, "") || !displayText(blocker.next_action, "") || !ALLOWED_STATES.has(displayText(blocker.status, ""))) {
      throw new Error("dashboard security confirmation blocker is invalid");
    }
  }
}

function validateSecurityRows(security) {
  for (const collectionName of ["approvals", "dangerous_operations"]) {
    for (const row of asArray(security[collectionName])) {
      if (!row || typeof row !== "object" || Array.isArray(row)) {
        throw new Error(`dashboard security ${collectionName} row must be an object`);
      }
      for (const key of ["id", "label", "detail", "last_checked"]) {
        if (!displayText(row[key], "")) {
          throw new Error(`dashboard security ${collectionName} row ${key} is missing`);
        }
      }
      if (!ALLOWED_STATES.has(displayText(row.status, ""))) {
        throw new Error(`dashboard security ${collectionName} row status is invalid`);
      }
    }
  }
}

function validateCommandPreviewGroups(actions) {
  for (const group of asArray(actions?.command_preview_groups)) {
    if (!group || typeof group !== "object" || Array.isArray(group)) {
      throw new Error("dashboard command preview group must be an object");
    }
    for (const key of ["id", "label"]) {
      if (!displayText(group[key], "")) {
        throw new Error(`dashboard command preview group ${key} is missing`);
      }
    }
    if (!RISK_LEVELS.has(displayText(group.risk_level, ""))) {
      throw new Error("dashboard command preview group risk level is invalid");
    }
    validateNonNegativeInteger(group.preview_count, "dashboard command preview group preview_count");
  }
}

export function validateDashboardData(data) {
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw new Error("dashboard data must be an object");
  }
  assertNoUnsafeDashboardValue(data);
  if (!/^[0-9]+\.[0-9]+\.[0-9]+$/.test(displayText(data.schema_version, ""))) {
    throw new Error("dashboard data schema version is invalid");
  }
  validateIdentity(data);
  const sourceCommands = asArray(data.source_commands).map((command) => displayText(command, ""));
  if (!sourceCommands.includes("tools/dashboard-data")) {
    throw new Error("dashboard data source command is missing");
  }
  if (sourceCommands.some((command) => /^(\.\/)?tools\/dashboard(\s|$)/.test(command))) {
    throw new Error("dashboard prose is not an allowed data source");
  }
  for (const key of ["summary", "lessons", "development", "maintenance", "git_workflow", "security", "actions"]) {
    if (!data[key] || typeof data[key] !== "object" || Array.isArray(data[key])) {
      throw new Error(`dashboard data section is missing: ${key}`);
    }
  }
  if (!["learning", "development", "maintenance", "unknown"].includes(displayText(data.summary.mode, "unknown"))) {
    throw new Error("dashboard mode is invalid");
  }
  if (!DASHBOARD_DISPLAY_DEPTHS.has(displayText(data.summary.display_depth, "standard"))) {
    throw new Error("dashboard display depth is invalid");
  }
  validateSummaryLocale(data.summary);
  validatePrimaryAction(data.summary);
  validateOverviewSections(data.summary);
  validateCategoryMetrics(data.summary);
  validateIssues(data);
  validateSelectedContext(data);
  validateRepositorySelection(data);
  validatePartialFailureScope(data);
  validateOperationalDecision(data);
  validateDecisionPages(data);
  validateOperationRows(data.development);
  validateWorkflowEvidenceRows(data.development);
  validateRepositoryChanges(data.development);
  validateRepositoryDevelopment(data.development);
  validateWorkflowEvidenceEvents(data.development);
  validateCiEvidence(data.development);
  validateProductRepository(data.development);
  validateProductAuthority(data.development);
  validateRepositoryScope(data);
  validateDocuments(data);
  validateSettings(data);
  validateMaintenanceSyncState(data);
  validateBrowserDebug(data);
  validateDesignStudio(data);
  validateMaintenanceEvidence(data.maintenance);
  validateSecurityConfirmation(data);
  validateSecurityRows(data.security);
  validateCommandPreviews(data.actions);
  validateCommandPreviewGroups(data.actions);
  return data;
}

function dashboardDataSnapshotUrl(options = {}) {
  const menuId = displayText(typeof options === "string" ? options : options.menuId, "");
  if (!menuId) {
    return "./dashboard-data.json";
  }
  const params = new URLSearchParams({ menu_id: menuId });
  return `./dashboard-data.json?${params.toString()}`;
}

function dashboardLiveStatusUrl(options = {}) {
  const menuId = displayText(typeof options === "string" ? options : options.menuId, "");
  if (!menuId) {
    return "./dashboard-live-status.json";
  }
  const params = new URLSearchParams({ menu_id: menuId });
  return `./dashboard-live-status.json?${params.toString()}`;
}

function validateDashboardLiveAgentLocalization(value, label) {
  const localization = asObject(value, label);
  assertAllowedKeys(localization, new Set(["status", "provider_mode", "source", "summary", "reason", "next_action", "generated_at"]), label);
  if (!ALLOWED_STATES.has(displayText(localization.status, ""))) {
    throw new Error(`${label} status is invalid`);
  }
  if (!LIVE_AGENT_LOCALIZATION_PROVIDER_MODES.has(displayText(localization.provider_mode, ""))) {
    throw new Error(`${label} provider_mode is invalid`);
  }
  if (!displayText(localization.source, "") || !displayText(localization.generated_at, "")) {
    throw new Error(`${label} source fields are missing`);
  }
  validateLocalizedTextObject(localization.summary, `${label} summary`);
  validateLocalizedTextObject(localization.reason, `${label} reason`);
  validateLocalizedTextObject(localization.next_action, `${label} next_action`);
}

function validateDashboardLiveCheckItem(item, key) {
  const liveItem = asObject(item, `dashboard live check ${key} item`);
  if (!displayText(liveItem.source_id, "") || !displayText(liveItem.category, "") || !displayText(liveItem.kind, "")) {
    throw new Error(`dashboard live check ${key} item identity is invalid`);
  }
  if (!ALLOWED_STATES.has(displayText(liveItem.status, ""))) {
    throw new Error(`dashboard live check ${key} item status is invalid`);
  }
  if (!displayText(liveItem.observed_at, "") || !EVIDENCE_FRESHNESS_STATES.has(displayText(liveItem.freshness_state, "")) || !EVIDENCE_AUTHORITIES.has(displayText(liveItem.authority, ""))) {
    throw new Error(`dashboard live check ${key} item evidence state is invalid`);
  }
  if (!displayText(liveItem.summary, "") || !displayText(liveItem.next_command, "")) {
    throw new Error(`dashboard live check ${key} item decision text is missing`);
  }
  if (liveItem.source_artifacts !== undefined && displayText(liveItem.source_artifacts, "") && !safeScopedReferenceList(liveItem.source_artifacts)) {
    throw new Error(`dashboard live check ${key} item source_artifacts is invalid`);
  }
  if (liveItem.blocker_count !== undefined) {
    validateNonNegativeInteger(Number(liveItem.blocker_count), `dashboard live check ${key} item blocker_count`);
  }
  if (liveItem.agent_localization !== undefined && liveItem.agent_localization !== null) {
    validateDashboardLiveAgentLocalization(liveItem.agent_localization, `dashboard live check ${key} item agent_localization`);
  }
}

function validateDashboardLiveCheck(check, key) {
  if (!ALLOWED_STATES.has(displayText(check.status, "")) || !displayText(check.observed_at, "") || !displayText(check.detail_code, "") || !displayText(check.source_id, "")) {
    throw new Error(`dashboard live check ${key} is invalid`);
  }
  for (const field of ["summary", "reason", "next_action", "required_command", "current_item_id"]) {
    if (!displayText(check[field], "")) {
      throw new Error(`dashboard live check ${key} ${field} is missing`);
    }
  }
  if (!LIVE_DETAIL_PAGES.has(displayText(check.detail_page, ""))) {
    throw new Error(`dashboard live check ${key} detail_page is invalid`);
  }
  if (!EVIDENCE_FRESHNESS_STATES.has(displayText(check.freshness_state, ""))) {
    throw new Error(`dashboard live check ${key} freshness_state is invalid`);
  }
  if (!EVIDENCE_AUTHORITIES.has(displayText(check.authority, ""))) {
    throw new Error(`dashboard live check ${key} authority is invalid`);
  }
  if (!RISK_LEVELS.has(displayText(check.risk_level, ""))) {
    throw new Error(`dashboard live check ${key} risk_level is invalid`);
  }
  if (check.blocker_count !== undefined) {
    validateNonNegativeInteger(Number(check.blocker_count), `dashboard live check ${key} blocker_count`);
  }
  if (check.agent_localization !== undefined && check.agent_localization !== null) {
    validateDashboardLiveAgentLocalization(check.agent_localization, `dashboard live check ${key} agent_localization`);
  }
  if (key === "ci") {
    const headMatchStatus = displayText(check.head_match_status, "unknown");
    if (!CI_HEAD_MATCH_STATES.has(headMatchStatus)) {
      throw new Error("dashboard live check ci head_match_status is invalid");
    }
    if (
      displayText(check.status, "") === "passed" &&
      (headMatchStatus !== "matched" ||
        displayText(check.freshness_state, "") !== "current" ||
        displayText(check.authority, "") !== "authoritative")
    ) {
      throw new Error("dashboard live check ci passed status requires current authoritative matching HEAD evidence");
    }
    for (const field of ["workflow_name", "run_status", "conclusion", "run_id", "run_url", "repository_head", "run_head_sha", "run_head_branch"]) {
      if (check[field] !== undefined && typeof check[field] !== "string") {
        throw new Error(`dashboard live check ci ${field} must be a string`);
      }
    }
  }
  if (!Array.isArray(check.items)) {
    throw new Error(`dashboard live check ${key} items must be an array`);
  }
  for (const item of check.items) {
    validateDashboardLiveCheckItem(item, key);
  }
}

function validateDashboardRuntimeActivityItem(item, label) {
  const activityItem = asObject(item, `${label} item`);
  if (!displayText(activityItem.command_id, "") || !displayText(activityItem.pid_hash, "") || !/^[a-f0-9]{8,32}$/.test(displayText(activityItem.pid_hash, ""))) {
    throw new Error(`${label} item identity is invalid`);
  }
  if (!RUNTIME_ACTIVITY_CATEGORIES.has(displayText(activityItem.category, ""))) {
    throw new Error(`${label} item category is invalid`);
  }
  if (!RUNTIME_ACTIVITY_STATES.has(displayText(activityItem.state, ""))) {
    throw new Error(`${label} item state is invalid`);
  }
  validateNonNegativeInteger(Number(activityItem.elapsed_ms), `${label} item elapsed_ms`);
  if (!RUNTIME_ACTIVITY_CWD_ROLES.has(displayText(activityItem.cwd_role, ""))) {
    throw new Error(`${label} item cwd_role is invalid`);
  }
  if (!safeRuntimePreview(activityItem.argv_preview)) {
    throw new Error(`${label} item argv_preview is unsafe`);
  }
  if (!RUNTIME_REDACTION_STATES.has(displayText(activityItem.redaction_status, ""))) {
    throw new Error(`${label} item redaction_status is invalid`);
  }
}

function validateDashboardRuntimeActivity(activity, label) {
  if (activity === undefined || activity === null) {
    return;
  }
  const payload = asObject(activity, label);
  if (!displayText(payload.observed_at, "")) {
    throw new Error(`${label} observed_at is missing`);
  }
  validateNonNegativeInteger(Number(payload.process_count), `${label} process_count`);
  if (!RUNTIME_REDACTION_STATES.has(displayText(payload.redaction_status, ""))) {
    throw new Error(`${label} redaction_status is invalid`);
  }
  const items = Array.isArray(payload.items) ? payload.items : Array.isArray(payload.processes) ? payload.processes : null;
  if (!Array.isArray(items)) {
    throw new Error(`${label} items must be an array`);
  }
  for (const item of items) {
    validateDashboardRuntimeActivityItem(item, label);
  }
}

function validateAgentObservationId(value, label) {
  if (!/^[A-Za-z0-9_.:-]{2,160}$/.test(displayText(value, ""))) {
    throw new Error(`${label} is invalid`);
  }
}

function validateAgentStringList(value, label) {
  for (const item of asArray(value)) {
    validateAgentObservationId(item, `${label} item`);
  }
}

function validateDashboardAgentSession(row) {
  const session = asObject(row, "dashboard live agent session");
  for (const key of ["session_id", "agent_kind", "surface", "cwd_role", "menu_id", "repo_id", "authority_profile"]) {
    validateAgentObservationId(session[key], `dashboard live agent session ${key}`);
  }
  if (!safeScopedReferenceList(session.source_artifacts)) {
    throw new Error("dashboard live agent session source_artifacts is invalid");
  }
  if (!ALLOWED_STATES.has(displayText(session.status, ""))) {
    throw new Error("dashboard live agent session status is invalid");
  }
  if (!displayText(session.started_at, "") || !displayText(session.last_seen_at, "")) {
    throw new Error("dashboard live agent session timing is invalid");
  }
  if (!AGENT_OBSERVATION_REDACTION_STATES.has(displayText(session.redaction_status, ""))) {
    throw new Error("dashboard live agent session redaction status is invalid");
  }
}

function validateDashboardAgentAssignment(row) {
  const assignment = asObject(row, "dashboard live agent assignment");
  for (const key of ["assignment_id", "session_id", "role_id", "work_item_id", "repo_id", "priority"]) {
    validateAgentObservationId(assignment[key], `dashboard live agent assignment ${key}`);
  }
  if (!ALLOWED_STATES.has(displayText(assignment.status, ""))) {
    throw new Error("dashboard live agent assignment status is invalid");
  }
  validateAgentStringList(assignment.required_capabilities, "dashboard live agent assignment required_capabilities");
  validateAgentStringList(assignment.forbidden_capabilities, "dashboard live agent assignment forbidden_capabilities");
  validateAgentStringList(assignment.evidence_refs, "dashboard live agent assignment evidence_refs");
  if (!safeRuntimePreview(assignment.next_safe_action)) {
    throw new Error("dashboard live agent assignment next_safe_action is invalid");
  }
}

function validateDashboardToolCall(row) {
  const call = asObject(row, "dashboard live tool call");
  for (const key of ["tool_call_id", "session_id", "assignment_id", "command_id", "surface", "profile_id", "run_mode", "boundary", "receipt_id", "error_code", "redacted_args_digest"]) {
    validateAgentObservationId(call[key], `dashboard live tool call ${key}`);
  }
  if (!ALLOWED_STATES.has(displayText(call.status, ""))) {
    throw new Error("dashboard live tool call status is invalid");
  }
  if (typeof call.dry_run !== "boolean") {
    throw new Error("dashboard live tool call dry_run is invalid");
  }
  if (!safeRuntimePreview(call.result_summary)) {
    throw new Error("dashboard live tool call result_summary is invalid");
  }
}

function validateDashboardOperationEvent(row) {
  const event = asObject(row, "dashboard live operation event");
  for (const key of ["event_id", "event_type", "source", "session_id", "assignment_id", "tool_call_id", "scope", "repo_id", "payload_digest"]) {
    validateAgentObservationId(event[key], `dashboard live operation event ${key}`);
  }
  if (!displayText(event.occurred_at, "")) {
    throw new Error("dashboard live operation event occurred_at is invalid");
  }
  if (!ALLOWED_STATES.has(displayText(event.status, "")) || !AGENT_OBSERVATION_AUTHORITY.has(displayText(event.authority, "")) || !AGENT_OBSERVATION_FRESHNESS.has(displayText(event.freshness, "")) || !RISK_LEVELS.has(displayText(event.risk_level, ""))) {
    throw new Error("dashboard live operation event state is invalid");
  }
  if (!AGENT_OBSERVATION_REDACTION_STATES.has(displayText(event.redaction_status, ""))) {
    throw new Error("dashboard live operation event redaction status is invalid");
  }
}

function validateDashboardLiveGitActivity(activity) {
  if (activity === undefined || activity === null) {
    return;
  }
  const payload = asObject(activity, "dashboard live git activity");
  if (!displayText(payload.observed_at, "") || !ALLOWED_STATES.has(displayText(payload.status, ""))) {
    throw new Error("dashboard live git activity identity is invalid");
  }
  for (const key of ["staged_count", "unstaged_count", "untracked_count", "dirty_count", "ahead", "behind"]) {
    if (payload[key] !== undefined) {
      validateNonNegativeInteger(Number(payload[key]), `dashboard live git activity ${key}`);
    }
  }
  const operations = asArray(payload.operations);
  for (const operation of operations) {
    const row = asObject(operation, "dashboard live git operation");
    if (!displayText(row.id, "") || !ALLOWED_STATES.has(displayText(row.status, "")) || !displayText(row.detail_code, "")) {
      throw new Error("dashboard live git operation is invalid");
    }
  }
  const branches = asObject(payload.branches || {}, "dashboard live git branches");
  for (const key of ["total_count", "unused_count"]) {
    if (branches[key] !== undefined) {
      validateNonNegativeInteger(Number(branches[key]), `dashboard live git branches ${key}`);
    }
  }
  for (const branch of asArray(branches.unused_candidates)) {
    const row = asObject(branch, "dashboard live unused branch");
    if (!displayText(row.branch, "")) {
      throw new Error("dashboard live unused branch name is missing");
    }
    validateNonNegativeInteger(Number(row.last_commit_age_days || 0), "dashboard live unused branch age");
  }
  const worktrees = asObject(payload.worktrees || {}, "dashboard live git worktrees");
  if (worktrees.count !== undefined) {
    validateNonNegativeInteger(Number(worktrees.count), "dashboard live git worktree count");
  }
  for (const worktree of asArray(worktrees.items)) {
    const row = asObject(worktree, "dashboard live git worktree");
    if (!displayText(row.path_role, "")) {
      throw new Error("dashboard live git worktree path_role is missing");
    }
  }
}

function validateDashboardLiveTestActivity(activity) {
  if (activity === undefined || activity === null) {
    return;
  }
  const payload = asObject(activity, "dashboard live test activity");
  if (!displayText(payload.observed_at, "") || !ALLOWED_STATES.has(displayText(payload.status, ""))) {
    throw new Error("dashboard live test activity identity is invalid");
  }
  for (const key of ["running_count", "completed_count", "failed_count"]) {
    validateNonNegativeInteger(Number(payload[key] || 0), `dashboard live test activity ${key}`);
  }
  for (const row of [...asArray(payload.running), ...asArray(payload.recent), ...(payload.latest_completed ? [payload.latest_completed] : [])]) {
    const item = asObject(row, "dashboard live test activity row");
    if (!displayText(item.id, "") || !ALLOWED_STATES.has(displayText(item.status, "")) || !displayText(item.category, "")) {
      throw new Error("dashboard live test activity row is invalid");
    }
  }
}

function validateDashboardLiveStatus(data) {
  const liveStatus = asObject(data, "dashboard live status");
  if (displayText(liveStatus.schema_version, "") !== "0.1.0" || !displayText(liveStatus.generated_at, "")) {
    throw new Error("dashboard live status identity is invalid");
  }
  if (!MENU_IDS.has(displayText(liveStatus.menu_id, "")) || !WORKFLOW_CONTEXTS.has(displayText(liveStatus.workflow_context, ""))) {
    throw new Error("dashboard live status context is invalid");
  }
  const targetRepository = asObject(liveStatus.target_repository, "dashboard live target repository");
  if (!displayText(targetRepository.name, "") || !REPOSITORY_PATH_STATES.has(displayText(targetRepository.path_state, "")) || !REPOSITORY_PATH_STATES.has(displayText(targetRepository.git_state, ""))) {
    throw new Error("dashboard live status repository is invalid");
  }
  if (targetRepository.repo_id !== undefined && !displayText(targetRepository.repo_id, "")) {
    throw new Error("dashboard live status repository repo_id is invalid");
  }
  if (targetRepository.selection_state !== undefined && !REPOSITORY_SELECTION_STATES.has(displayText(targetRepository.selection_state, ""))) {
    throw new Error("dashboard live status repository selection_state is invalid");
  }
  const repositoryState = asObject(liveStatus.repository_state, "dashboard live repository state");
  for (const key of ["dirty_count", "untracked_count", "ahead", "behind"]) {
    const value = Number(repositoryState[key]);
    if (!Number.isFinite(value) || value < 0) {
      throw new Error(`dashboard live repository state ${key} is invalid`);
    }
  }
  if (liveStatus.git_activity !== undefined) {
    validateDashboardLiveGitActivity(liveStatus.git_activity);
  }
  if (liveStatus.test_activity !== undefined) {
    validateDashboardLiveTestActivity(liveStatus.test_activity);
  }
  if (liveStatus.runtime_activity !== undefined) {
    validateDashboardRuntimeActivity(liveStatus.runtime_activity, "dashboard live runtime_activity");
  }
  if (liveStatus.active_operations !== undefined) {
    validateDashboardRuntimeActivity(liveStatus.active_operations, "dashboard live active_operations");
  }
  for (const session of asArray(liveStatus.agent_sessions)) {
    validateDashboardAgentSession(session);
  }
  for (const assignment of asArray(liveStatus.agent_assignments)) {
    validateDashboardAgentAssignment(assignment);
  }
  for (const call of asArray(liveStatus.tool_calls)) {
    validateDashboardToolCall(call);
  }
  for (const event of asArray(liveStatus.operation_events)) {
    validateDashboardOperationEvent(event);
  }
  const checks = asObject(liveStatus.checks, "dashboard live checks");
  for (const key of LIVE_CHECK_KEYS) {
    const check = asObject(checks[key], `dashboard live check ${key}`);
    validateDashboardLiveCheck(check, key);
  }
  return liveStatus;
}

export async function fetchDashboardDataSnapshot(options = {}) {
  const timeoutMs = Math.max(1000, Number(options.timeoutMs || DASHBOARD_DATA_FETCH_TIMEOUT_MS));
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  let response;
  try {
    response = await fetch(dashboardDataSnapshotUrl(options), {
      cache: "no-store",
      credentials: "same-origin",
      method: "GET",
      signal: controller.signal,
    });
  } catch (error) {
    if (error?.name === "AbortError") {
      throw new Error(`dashboard data request timed out after ${timeoutMs}ms`);
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
  if (!response.ok) {
    throw new Error(`dashboard data request failed with ${response.status}`);
  }
  const raw = await response.text();
  const data = validateDashboardData(JSON.parse(raw));
  return {
    data,
    signature: `${data.snapshot_id}:${data.content_hash}`,
  };
}

export async function fetchDashboardLiveStatus(options = {}) {
  const timeoutMs = Math.max(1000, Number(options.timeoutMs || DASHBOARD_LIVE_STATUS_FETCH_TIMEOUT_MS));
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  let response;
  try {
    response = await fetch(dashboardLiveStatusUrl(options), {
      cache: "no-store",
      credentials: "same-origin",
      method: "GET",
      signal: controller.signal,
    });
  } catch (error) {
    if (error?.name === "AbortError") {
      throw new Error(`dashboard live status request timed out after ${timeoutMs}ms`);
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
  if (!response.ok) {
    throw new Error(`dashboard live status request failed with ${response.status}`);
  }
  return validateDashboardLiveStatus(await response.json());
}

async function postDashboardSettingMutation(endpoint, payload, label) {
  const response = await fetch(endpoint, {
    method: "POST",
    cache: "no-store",
    credentials: "same-origin",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  const raw = await response.text();
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error(`${label} returned invalid JSON`);
  }
  if (!response.ok) {
    throw new Error(displayText(parsed.error || parsed.message, `${label} failed`));
  }
  return validateSettingsMutationResponse(parsed, label);
}

async function postDashboardProductRepositorySelection(endpoint, payload, label) {
  const response = await fetch(endpoint, {
    method: "POST",
    cache: "no-store",
    credentials: "same-origin",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  const raw = await response.text();
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error(`${label} returned invalid JSON`);
  }
  if (!response.ok) {
    throw new Error(displayText(parsed.error || parsed.message, `${label} failed`));
  }
  return validateProductRepositorySelectionMutationResponse(parsed, label);
}

async function postDashboardDesignSystemMutation(endpoint, payload, label) {
  const response = await fetch(endpoint, {
    method: "POST",
    cache: "no-store",
    credentials: "same-origin",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  const raw = await response.text();
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error(`${label} returned invalid JSON`);
  }
  if (!response.ok) {
    throw new Error(displayText(parsed.error || parsed.message, `${label} failed`));
  }
  return validateDesignSystemMutationResponse(parsed, label);
}

export async function planDashboardSettingChange(settingId, value, menuId) {
  return postDashboardSettingMutation(
    "/dashboard-settings/plan",
    {
      setting_id: settingId,
      value,
      menu_id: menuId,
    },
    "dashboard settings plan",
  );
}

export async function applyDashboardSettingChange(settingId, value, menuId, planToken, snapshotIdentity = {}) {
  return postDashboardSettingMutation(
    "/dashboard-settings/apply",
    {
      setting_id: settingId,
      value,
      menu_id: menuId,
      plan_token: planToken,
      snapshot_id: snapshotIdentity.snapshotId,
      content_hash: snapshotIdentity.contentHash,
      confirm: true,
    },
    "dashboard settings apply",
  );
}

export async function selectDashboardProductRepository(menuId, repoId, snapshotIdentity = {}) {
  return postDashboardProductRepositorySelection(
    "/dashboard-product-repository/select",
    {
      menu_id: menuId,
      repo_id: repoId,
      snapshot_id: snapshotIdentity.snapshotId,
      content_hash: snapshotIdentity.contentHash,
      confirm: true,
    },
    "dashboard product repository selection",
  );
}

export async function planDashboardDesignSystemChange(interaction) {
  return postDashboardDesignSystemMutation(
    "/dashboard-design-system/plan",
    {
      component_id: "tooltip-copy",
      target_scope: interaction.foundation?.targetScope || "dashboard-control-center",
      theme_accent: interaction.foundation?.themeAccent || "blue",
      density: interaction.foundation?.density || "balanced",
      radius_scale: interaction.foundation?.radiusScale || "standard",
      typography_scale: interaction.foundation?.typographyScale || "standard",
      action_control_height: interaction.foundation?.actionControlHeight || "34px",
      action_control_padding: interaction.foundation?.actionControlPadding || "8px 11px",
      compact_control_height: interaction.foundation?.compactControlHeight || "32px",
      compact_control_padding: interaction.foundation?.compactControlPadding || "5px 10px",
      form_control_height: interaction.foundation?.formControlHeight || "40px",
      form_control_padding: interaction.foundation?.formControlPadding || "0 10px",
      icon_button_size: interaction.foundation?.iconButtonSize || "38px",
      control_font_size: interaction.foundation?.controlFontSize || "0.84rem",
      card_padding: interaction.foundation?.cardPadding || "14px",
      card_gap: interaction.foundation?.cardGap || "10px",
      row_padding: interaction.foundation?.rowPadding || "10px 12px",
      row_gap: interaction.foundation?.rowGap || "10px",
      technical_affordance_gap: interaction.foundation?.technicalAffordanceGap || "4px",
      technical_source_max_width: interaction.foundation?.technicalSourceMaxWidth || "260px",
      technical_evidence_max_width: interaction.foundation?.technicalEvidenceMaxWidth || "292px",
      technical_preview_chip_max_width: interaction.foundation?.technicalPreviewChipMaxWidth || "360px",
      page_header_padding: interaction.foundation?.pageHeaderPadding || "18px 20px",
      metadata_gap: interaction.foundation?.metadataGap || "8px",
      page_icon_size: interaction.foundation?.pageIconSize || "52px",
      badge_gap: interaction.foundation?.badgeGap || "5px",
      badge_height: interaction.foundation?.badgeHeight || "26px",
      mode_badge_padding: interaction.foundation?.modeBadgePadding || "4px 14px",
      badge_font_size: interaction.foundation?.badgeFontSize || "0.76rem",
      mode_badge_font_size: interaction.foundation?.modeBadgeFontSize || "0.78rem",
      tooltip_trigger: interaction.tooltip.trigger,
      tooltip_hide_policy: interaction.tooltip.hidePolicy,
      tooltip_placement: interaction.tooltip.placement,
      tooltip_max_width: interaction.tooltip.maxWidth,
      copy_feedback_trigger: interaction.copyFeedback.trigger,
      copy_feedback_hide_policy: interaction.copyFeedback.hidePolicy,
      copy_feedback_placement: interaction.copyFeedback.placement,
      copy_feedback_collision: interaction.copyFeedback.collision,
      copy_feedback_duration_ms: String(interaction.copyFeedback.durationMs),
    },
    "dashboard design-system plan",
  );
}

export async function applyDashboardDesignSystemChange(interaction, planToken) {
  return postDashboardDesignSystemMutation(
    "/dashboard-design-system/apply",
    {
      component_id: "tooltip-copy",
      target_scope: interaction.foundation?.targetScope || "dashboard-control-center",
      theme_accent: interaction.foundation?.themeAccent || "blue",
      density: interaction.foundation?.density || "balanced",
      radius_scale: interaction.foundation?.radiusScale || "standard",
      typography_scale: interaction.foundation?.typographyScale || "standard",
      action_control_height: interaction.foundation?.actionControlHeight || "34px",
      action_control_padding: interaction.foundation?.actionControlPadding || "8px 11px",
      compact_control_height: interaction.foundation?.compactControlHeight || "32px",
      compact_control_padding: interaction.foundation?.compactControlPadding || "5px 10px",
      form_control_height: interaction.foundation?.formControlHeight || "40px",
      form_control_padding: interaction.foundation?.formControlPadding || "0 10px",
      icon_button_size: interaction.foundation?.iconButtonSize || "38px",
      control_font_size: interaction.foundation?.controlFontSize || "0.84rem",
      card_padding: interaction.foundation?.cardPadding || "14px",
      card_gap: interaction.foundation?.cardGap || "10px",
      row_padding: interaction.foundation?.rowPadding || "10px 12px",
      row_gap: interaction.foundation?.rowGap || "10px",
      technical_affordance_gap: interaction.foundation?.technicalAffordanceGap || "4px",
      technical_source_max_width: interaction.foundation?.technicalSourceMaxWidth || "260px",
      technical_evidence_max_width: interaction.foundation?.technicalEvidenceMaxWidth || "292px",
      technical_preview_chip_max_width: interaction.foundation?.technicalPreviewChipMaxWidth || "360px",
      page_header_padding: interaction.foundation?.pageHeaderPadding || "18px 20px",
      metadata_gap: interaction.foundation?.metadataGap || "8px",
      page_icon_size: interaction.foundation?.pageIconSize || "52px",
      badge_gap: interaction.foundation?.badgeGap || "5px",
      badge_height: interaction.foundation?.badgeHeight || "26px",
      mode_badge_padding: interaction.foundation?.modeBadgePadding || "4px 14px",
      badge_font_size: interaction.foundation?.badgeFontSize || "0.76rem",
      mode_badge_font_size: interaction.foundation?.modeBadgeFontSize || "0.78rem",
      tooltip_trigger: interaction.tooltip.trigger,
      tooltip_hide_policy: interaction.tooltip.hidePolicy,
      tooltip_placement: interaction.tooltip.placement,
      tooltip_max_width: interaction.tooltip.maxWidth,
      copy_feedback_trigger: interaction.copyFeedback.trigger,
      copy_feedback_hide_policy: interaction.copyFeedback.hidePolicy,
      copy_feedback_placement: interaction.copyFeedback.placement,
      copy_feedback_collision: interaction.copyFeedback.collision,
      copy_feedback_duration_ms: String(interaction.copyFeedback.durationMs),
      plan_token: planToken,
      confirm: true,
    },
    "dashboard design-system apply",
  );
}

export async function fetchDashboardData() {
  const snapshot = await fetchDashboardDataSnapshot();
  return snapshot.data;
}
