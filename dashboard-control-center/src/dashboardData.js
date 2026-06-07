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
]);

export const RISK_LEVELS = new Set(["low", "medium", "high", "critical"]);
export const MANUAL_FOLLOWUP_STATES = new Set(["optional", "cached", "unknown"]);
export const PARTIAL_FAILURE_STATES = new Set(["failed", "blocked", "unknown"]);

const SECRET_PATTERN =
  /(SECRET|TOKEN|API_KEY|PASSWORD|PRIVATE_KEY)\s*[:=]\s*[^\s#]{8,}|gh[pousr]_[A-Za-z0-9_]{20,}|sk-[A-Za-z0-9]{20,}|AKIA[0-9A-Z]{16}|BEGIN (RSA |OPENSSH |EC |DSA )?PRIVATE KEY/i;

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
    return "[redacted secret-like data]";
  }
  return normalized.replace(/(^|\s)\/[^\s]+/g, "$1[absolute-path]");
}

export function displayKey(value) {
  return displayText(value)
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

export function normalizeState(value) {
  const state = displayText(value, "unknown");
  return ALLOWED_STATES.has(state) ? state : "unknown";
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

export function validateDashboardData(data) {
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw new Error("dashboard data must be an object");
  }
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
  validatePrimaryAction(data.summary);
  validateCategoryMetrics(data.summary);
  validateIssues(data);
  validateCommandPreviews(data.actions);
  return data;
}

export async function fetchDashboardDataSnapshot() {
  const response = await fetch("./dashboard-data.json", {
    cache: "no-store",
    credentials: "same-origin",
    method: "GET",
  });
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

export async function fetchDashboardData() {
  const snapshot = await fetchDashboardDataSnapshot();
  return snapshot.data;
}
