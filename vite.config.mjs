import fs from "node:fs";
import crypto from "node:crypto";
import { execFile } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

import { DASHBOARD_LOCALE_CODES } from "./dashboard-control-center/src/localePolicy.js";

const repoRoot = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.join(repoRoot, "dashboard-control-center");
const runtimeRoot = path.join(repoRoot, ".dashboard-control-center");
const dashboardDataToolPath = path.join(repoRoot, "tools", "dashboard-data");
const settingsToolPath = path.join(repoRoot, "tools", "dashboard-settings");
const designSystemToolPath = path.join(repoRoot, "tools", "dashboard-design-system");
const productRepositoryRegistryToolPath = path.join(repoRoot, "tools", "product-repository-registry");
const allowedStates = new Set(["missing", "ready", "passed", "failed", "blocked", "unknown", "approval_required", "optional", "cached", "not_run", "stale", "manual_required", "not_applicable"]);
const riskLevels = new Set(["low", "medium", "high", "critical"]);
const partialFailureStates = new Set(["failed", "blocked", "unknown"]);
const manualFollowupStates = new Set(["optional", "cached", "unknown"]);
const settingScopes = new Set(["selected_context", "learning", "workflow", "security", "repository", "dashboard"]);
const dashboardDisplayDepths = new Set(["friendly", "standard", "technical"]);
const settingsRelatedPages = new Set(["#overview", "#lessons", "#workflow", "#maintenance", "#safety", "#repository-info", "#documents", "#settings", "#history", "#help"]);
const dashboardUiLocales = new Set(DASHBOARD_LOCALE_CODES);
const dashboardUiDirections = new Set(["ltr", "rtl"]);
const dashboardMenuIds = new Set(["step_1_7", "step_1_14", "advanced", "free-development", "product-improvement", "external-integration", "lesson-repository-improvement", "unknown"]);
const dashboardProductMenuIds = new Set(["free-development", "product-improvement", "external-integration"]);
const dashboardWorkflowContexts = new Set(["none", "lesson", "free-development", "product-improvement", "external-integration", "lesson-maintenance", "custom", "unknown"]);
const repositoryPathStates = new Set(["configured", "missing", "not_applicable", "unknown"]);
const repositorySelectionStates = new Set(["none", "explicit", "fallback", "request", "not_applicable"]);
const evidenceFreshnessStates = new Set(["current", "stale", "not_collected", "unknown"]);
const evidenceAuthorities = new Set(["authoritative", "manual_required", "advisory", "not_collected"]);
const overviewSectionIds = new Set(["overall", "current_work", "docs_sync", "task_tracker", "handoff", "git_pr_ci", "tests", "safety", "blockers", "next_safe_action"]);
const overviewDetailPages = new Set(["#overview", "#lessons", "#workflow", "#maintenance", "#safety", "#repository-info", "#documents", "#settings", "#history", "#help"]);
const decisionOwnerSources = new Set(["dashboard-data", "product-authority", "git-workflow", "repository-development-workflow"]);
const securityBoundaryStates = new Set(["closed", "open", "approval_required", "unknown"]);
const securityDisplayPolicyStates = new Set(["do_not_display", "redact", "safe", "recommended", "unknown"]);
const securityConfirmationActionStates = new Set(["safe", "recommended", "approval_required", "blocked", "unknown"]);
const securityConfirmationReceiptStates = new Set(["closed", "open", "not_configured", "unknown"]);
const securityUnsafeCommandPolicyStates = new Set(["display_only", "blocked", "approval_required", "unknown"]);
const maintenanceActionTypes = new Set(["immediate", "later", "blocked"]);
const maintenanceGitActions = new Set(["none", "commit_or_discard", "pull_required", "push_required", "reconcile_diverged", "select_repository", "not_applicable"]);
const liveCheckKeys = ["local_tests", "git_sync", "ci", "security"];
const liveDetailPages = new Set(["#workflow", "#maintenance", "#safety", "#repository-info", "#documents", "#history", "#help"]);
const ciHeadMatchStates = new Set(["matched", "different", "unknown"]);
const runtimeActivityCategories = new Set(["ai_agent", "browser_review", "control_center", "data_refresh", "git", "ci", "test", "build", "check", "other"]);
const runtimeActivityStates = new Set(["running", "exited", "unknown"]);
const runtimeActivityCwdRoles = new Set(["lesson_repository", "product_repository", "unknown"]);
const runtimeRedactionStates = new Set(["redacted"]);
const secretLikePattern = /(SECRET|TOKEN|API_KEY|PASSWORD|PRIVATE_KEY)\s*[:=]\s*[^\s#]{8,}|Authorization:\s*Bearer\s+[A-Za-z0-9._-]{16,}|Bearer\s+eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}|gh[pousr]_[A-Za-z0-9_]{20,}|sk-[A-Za-z0-9]{20,}|AKIA[0-9A-Z]{16}|BEGIN (RSA |OPENSSH |EC |DSA )?PRIVATE KEY/i;
const rawAbsolutePathPattern = /(^|\s)(\/(?:home|tmp|mnt|var|etc|root|opt|Users)\/|[A-Za-z]:[\\/]|\\\\[^\s\\]+[\\/])/;
const signedPrivateUrlPattern = /https?:\/\/[^\s"'<>]*(?:X-Amz-Signature|X-Goog-Signature|signature=|sig=|token=|access_token=)[^\s"'<>]*/i;
const commandTokenPattern = /^(\[absolute-path\]|\.[/][A-Za-z0-9._/-]+|[A-Za-z0-9._:@/%+=,\-[\]]+)$/;
const safeIdPattern = /^[A-Za-z0-9._:-]{1,160}$/;
const languageCodePattern = /^[A-Za-z]{2,3}(?:-[A-Za-z0-9]{2,8})?$|^custom$/;
const designSystemPlanTokenTtlMs = 10 * 60 * 1000;
const settingsPlanTokenTtlMs = designSystemPlanTokenTtlMs;
const designSystemPlanTokens = new Map();
const settingsPlanTokens = new Map();
const dashboardDataGenerationByMenu = new Map();
const dashboardLiveStatusGenerationByMenu = new Map();
const dashboardDataCacheEpochByMenu = new Map();
const dashboardDataGenerationTimeoutMs = Math.max(5000, Number(process.env.DASHBOARD_DATA_GENERATION_TIMEOUT_MS || 60000));
const dashboardLiveStatusGenerationTimeoutMs = Math.max(3000, Number(process.env.DASHBOARD_LIVE_STATUS_GENERATION_TIMEOUT_MS || 10000));
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
  if (/^[A-Za-z][A-Za-z0-9+.-]*:\/\//.test(value)) {
    return false;
  }
  if (value.startsWith("product:")) {
    return safeRelativePath(value.slice("product:".length));
  }
  if (value.includes(":")) {
    return false;
  }
  return safeRelativePath(value);
}

function safeScopedReferenceList(value) {
  if (typeof value !== "string" || !value.trim()) {
    return false;
  }
  return value
    .split(/[;,]/)
    .map((item) => item.trim())
    .filter(Boolean)
    .every((item) => item === "not_collected" || item === "not_applicable" || item === "none" || safeScopedRelativePath(item));
}

function safeRuntimePreview(value) {
  if (typeof value !== "string") {
    return false;
  }
  const normalized = value.replace(/[\u0000-\u001f]/g, "").replace(/\s+/g, " ").trim();
  if (!normalized || normalized.length > 160 || secretLikePattern.test(normalized)) {
    return false;
  }
  return !/(^|\s)(\/|[A-Za-z]:[\\/]|\\\\)/.test(normalized);
}

function isDashboardWarningValuePath(pathSegments) {
  return pathSegments.length === 2 && pathSegments[0] === "warnings" && Number.isInteger(pathSegments[1]);
}

function dashboardDataContainsUnsafeValue(value, seen = new Set(), pathSegments = []) {
  if (value === null || value === undefined) {
    return false;
  }
  if (typeof value === "string") {
    return (secretLikePattern.test(value) && !isDashboardWarningValuePath(pathSegments)) || rawAbsolutePathPattern.test(value) || signedPrivateUrlPattern.test(value);
  }
  if (Array.isArray(value)) {
    return value.some((item, index) => dashboardDataContainsUnsafeValue(item, seen, [...pathSegments, index]));
  }
  if (typeof value === "object") {
    if (seen.has(value)) {
      return false;
    }
    seen.add(value);
    return Object.entries(value).some(([key, item]) => dashboardDataContainsUnsafeValue(item, seen, [...pathSegments, key]));
  }
  return false;
}

function safeCommandPreviewToken(value) {
  if (typeof value !== "string") {
    return false;
  }
  const normalized = value.replace(/[\u0000-\u001f]/g, "").trim();
  return Boolean(
    normalized &&
      normalized.length <= 160 &&
      !secretLikePattern.test(normalized) &&
      !rawAbsolutePathPattern.test(normalized) &&
      !signedPrivateUrlPattern.test(normalized) &&
      !/[;&|`$<>]/.test(normalized) &&
      !/\s/.test(normalized) &&
      commandTokenPattern.test(normalized),
  );
}

function safeCommandPreviewText(value) {
  if (typeof value !== "string") {
    return false;
  }
  const normalized = value.replace(/[\u0000-\u001f]/g, "").replace(/\s+/g, " ").trim();
  return Boolean(
    normalized &&
      normalized.length <= 240 &&
      !secretLikePattern.test(normalized) &&
      !rawAbsolutePathPattern.test(normalized) &&
      !signedPrivateUrlPattern.test(normalized) &&
      !/[;&|`$<>]/.test(normalized),
  );
}

function validateRepositoryContextScope(data) {
  const selected = data.selected_context;
  const selection = data.repository_selection;
  const scope = data.repository_scope;
  if (scope === undefined) {
    return true;
  }
  if (!isObject(selected) || !isObject(selected.target_repository) || !isObject(selection) || !isObject(scope)) {
    return validationFailure("invalid_repository_context_scope");
  }
  const menuId = String(selected.menu_id || "");
  const workflowContext = String(selected.workflow_context || "");
  const selectedRepoId = String(selected.target_repository.repo_id || "");
  const currentRepoId = String(selection.current_repo_id || "");
  const scopeRepoId = String(scope.repo_id || "");
  const effectiveRepoId = selectedRepoId || currentRepoId || scopeRepoId || String(scope.scope_id || "");
  if (!dashboardMenuIds.has(menuId) || !dashboardWorkflowContexts.has(workflowContext) || !safeIdPattern.test(effectiveRepoId)) {
    return validationFailure("invalid_selected_context_scope");
  }
  if (
    String(selection.menu_id || "") !== menuId ||
    String(selection.workflow_context || "") !== workflowContext ||
    !repositorySelectionStates.has(String(selection.selection_state || "")) ||
    !nonEmptyString(selection.current_repo_id) ||
    !nonEmptyString(selection.current_repository_name) ||
    !safeRelativePath(selection.registry_file) ||
    !safeRelativePath(selection.selection_file)
  ) {
    return validationFailure("invalid_repository_selection_scope");
  }
  if (selectedRepoId && !["not_applicable", "not_selected"].includes(currentRepoId) && currentRepoId !== selectedRepoId) {
    return validationFailure("repository_selection_selected_context_mismatch");
  }
  if (
    String(scope.menu_id || "") !== menuId ||
    String(scope.workflow_context || "") !== workflowContext ||
    (scope.repo_id !== undefined && String(scope.repo_id || "") !== effectiveRepoId) ||
    !repositoryPathStates.has(String(scope.path_state || "")) ||
    !repositoryPathStates.has(String(scope.git_state || ""))
  ) {
    return validationFailure("invalid_repository_scope");
  }
  return true;
}

function validateSecurityConfirmation(data) {
  const confirmation = data.security?.confirmation;
  if (confirmation === undefined) {
    return true;
  }
  if (!isObject(confirmation)) {
    return validationFailure("invalid_security_confirmation");
  }
  const allowedKeys = new Set(["status", "observed_at", "menu_id", "workflow_context", "repo_id", "repository_name", "product_head", "current_result", "safe_next_action", "approval_receipts", "unsafe_command_policy", "evidence", "authority_boundaries", "display_policy", "blockers", "recommended_actions", "restricted_actions"]);
  for (const key of Object.keys(confirmation)) {
    if (!allowedKeys.has(key)) {
      return validationFailure(`invalid_security_confirmation_key:${key}`);
    }
  }
  if (
    !allowedStates.has(String(confirmation.status || "")) ||
    String(confirmation.menu_id || "") !== String(data.selected_context?.menu_id || "") ||
    String(confirmation.workflow_context || "") !== String(data.selected_context?.workflow_context || "") ||
    String(confirmation.repo_id || "") !== String(data.selected_context?.target_repository?.repo_id || "") ||
    !nonEmptyString(confirmation.repository_name) ||
    !nonEmptyString(confirmation.current_result) ||
    !nonEmptyString(confirmation.safe_next_action)
  ) {
    return validationFailure("invalid_security_confirmation_scope");
  }
  const receipts = confirmation.approval_receipts;
  if (!isObject(receipts) || !securityConfirmationReceiptStates.has(String(receipts.state || "")) || receipts.read_allowed !== false || receipts.write_allowed !== false || !nonEmptyString(receipts.receipt_reference)) {
    return validationFailure("invalid_security_confirmation_receipts");
  }
  const commandPolicy = confirmation.unsafe_command_policy;
  if (!isObject(commandPolicy) || !securityUnsafeCommandPolicyStates.has(String(commandPolicy.state || "")) || commandPolicy.execution_mode !== "preview_only" || commandPolicy.copy_requires_safe_argv !== true) {
    return validationFailure("invalid_security_confirmation_command_policy");
  }
  const evidenceRows = Array.isArray(confirmation.evidence) ? confirmation.evidence : [];
  if (!evidenceRows.length) {
    return validationFailure("invalid_security_confirmation_evidence_empty");
  }
  for (const row of evidenceRows) {
    if (
      !isObject(row) ||
      !nonEmptyString(row.id) ||
      !nonEmptyString(row.label) ||
      !allowedStates.has(String(row.status || "")) ||
      !nonEmptyString(row.source_id) ||
      !evidenceFreshnessStates.has(String(row.freshness_state || "")) ||
      !evidenceAuthorities.has(String(row.authority || "")) ||
      !nonEmptyString(row.observed_at) ||
      !safeScopedReferenceList(row.source_artifacts) ||
      !nonEmptyString(row.meaning) ||
      !nonEmptyString(row.next_action)
    ) {
      return validationFailure("invalid_security_confirmation_evidence");
    }
  }
  const boundaries = Array.isArray(confirmation.authority_boundaries) ? confirmation.authority_boundaries : [];
  if (!boundaries.length) {
    return validationFailure("invalid_security_confirmation_boundaries_empty");
  }
  for (const row of boundaries) {
    if (!isObject(row) || !nonEmptyString(row.id) || !nonEmptyString(row.label) || !securityBoundaryStates.has(String(row.state || "")) || typeof row.approval_required !== "boolean" || !riskLevels.has(String(row.risk_level || "")) || !nonEmptyString(row.detail)) {
      return validationFailure("invalid_security_confirmation_boundary");
    }
    if (row.state === "open") {
      return validationFailure("open_security_confirmation_boundary");
    }
  }
  const displayPolicyRows = Array.isArray(confirmation.display_policy) ? confirmation.display_policy : [];
  if (!displayPolicyRows.length) {
    return validationFailure("invalid_security_confirmation_display_policy_empty");
  }
  for (const row of displayPolicyRows) {
    if (!isObject(row) || !nonEmptyString(row.id) || !nonEmptyString(row.label) || !securityDisplayPolicyStates.has(String(row.state || "")) || !nonEmptyString(row.detail)) {
      return validationFailure("invalid_security_confirmation_display_policy");
    }
  }
  for (const collectionName of ["recommended_actions", "restricted_actions"]) {
    const rows = Array.isArray(confirmation[collectionName]) ? confirmation[collectionName] : [];
    if (!rows.length) {
      return validationFailure(`invalid_security_confirmation_${collectionName}_empty`);
    }
    for (const row of rows) {
      if (!isObject(row) || !nonEmptyString(row.id) || !nonEmptyString(row.label) || !securityConfirmationActionStates.has(String(row.state || "")) || !nonEmptyString(row.detail)) {
        return validationFailure(`invalid_security_confirmation_${collectionName}`);
      }
    }
  }
  const blockers = Array.isArray(confirmation.blockers) ? confirmation.blockers : [];
  for (const blocker of blockers) {
    if (!isObject(blocker) || !nonEmptyString(blocker.id) || !allowedStates.has(String(blocker.status || "")) || !nonEmptyString(blocker.source_id) || !nonEmptyString(blocker.detail) || !nonEmptyString(blocker.next_action)) {
      return validationFailure("invalid_security_confirmation_blocker");
    }
  }
  return true;
}

function safeMaintenanceReference(value) {
  return nonEmptyString(value) && (safeScopedReferenceList(value) || safeIdPattern.test(value));
}

function validateMaintenanceSyncRow(row) {
  return Boolean(
    isObject(row) &&
      nonEmptyString(row.id) &&
      nonEmptyString(row.label) &&
      allowedStates.has(String(row.status || "")) &&
      nonEmptyString(row.source_id) &&
      evidenceFreshnessStates.has(String(row.freshness_state || "")) &&
      evidenceAuthorities.has(String(row.authority || "")) &&
      nonEmptyString(row.observed_at) &&
      nonEmptyString(row.detail) &&
      nonEmptyString(row.next_action) &&
      safeMaintenanceReference(row.reference) &&
      riskLevels.has(String(row.priority || "")),
  );
}

function validateMaintenanceAction(row) {
  return Boolean(
    isObject(row) &&
      nonEmptyString(row.id) &&
      nonEmptyString(row.label) &&
      allowedStates.has(String(row.status || "")) &&
      maintenanceActionTypes.has(String(row.action_type || "")) &&
      nonEmptyString(row.detail) &&
      nonEmptyString(row.source_id),
  );
}

function validateNonNegativeInteger(value) {
  return Number.isInteger(value) && value >= 0;
}

function validateMaintenanceSyncState(data) {
  const state = data.maintenance_sync_state;
  if (state === undefined || state === null) {
    return true;
  }
  if (!isObject(state)) {
    return validationFailure("invalid_maintenance_sync_state");
  }
  if (
    !allowedStates.has(String(state.status || "")) ||
    String(state.menu_id || "") !== String(data.selected_context?.menu_id || "") ||
    String(state.workflow_context || "") !== String(data.selected_context?.workflow_context || "") ||
    String(state.repo_id || "") !== String(data.selected_context?.target_repository?.repo_id || "") ||
    !nonEmptyString(state.repository_name) ||
    !nonEmptyString(state.observed_at)
  ) {
    return validationFailure("invalid_maintenance_sync_state_scope");
  }
  const summary = state.sync_summary;
  if (
    !isObject(summary) ||
    !allowedStates.has(String(summary.status || "")) ||
    typeof summary.immediate_action_required !== "boolean" ||
    !validateNonNegativeInteger(summary.blocker_count) ||
    !validateNonNegativeInteger(summary.warning_count) ||
    !nonEmptyString(summary.current_result) ||
    !nonEmptyString(summary.next_safe_action)
  ) {
    return validationFailure("invalid_maintenance_sync_summary");
  }
  const gitState = state.git_state;
  if (
    !isObject(gitState) ||
    !allowedStates.has(String(gitState.status || "")) ||
    !allowedStates.has(String(gitState.sync_status || "")) ||
    !maintenanceGitActions.has(String(gitState.action_needed || "")) ||
    !nonEmptyString(gitState.source_id) ||
    !nonEmptyString(gitState.observed_at) ||
    !["staged_count", "unstaged_count", "untracked_count", "changed_count", "ahead", "behind", "worktree_count"].every((field) => validateNonNegativeInteger(gitState[field]))
  ) {
    return validationFailure("invalid_maintenance_git_state");
  }
  const ciState = state.ci_state;
  if (
    !isObject(ciState) ||
    !["status", "branch_ci_status", "pr_ci_status", "main_ci_status", "provider_visibility_status", "local_tests_status"].every((field) => allowedStates.has(String(ciState[field] || ""))) ||
    !ciHeadMatchStates.has(String(ciState.head_match_status || "")) ||
    !Array.isArray(ciState.annotations) ||
    ciState.annotations.some((row) => !validateMaintenanceSyncRow(row))
  ) {
    return validationFailure("invalid_maintenance_ci_state");
  }
  const productGateEvidence = state.product_gate_evidence;
  if (
    !isObject(productGateEvidence) ||
    !allowedStates.has(String(productGateEvidence.status || "")) ||
    !Array.isArray(productGateEvidence.layers) ||
    productGateEvidence.layers.length < 4 ||
    productGateEvidence.layers.some((row) => !validateMaintenanceSyncRow(row))
  ) {
    return validationFailure("invalid_maintenance_product_gate_evidence");
  }
  const documentationSync = state.documentation_sync;
  if (
    !isObject(documentationSync) ||
    !allowedStates.has(String(documentationSync.status || "")) ||
    !Array.isArray(documentationSync.rows) ||
    documentationSync.rows.length < 5 ||
    documentationSync.rows.some((row) => !validateMaintenanceSyncRow(row))
  ) {
    return validationFailure("invalid_maintenance_documentation_sync");
  }
  for (const key of ["maintenance_warnings", "evidence_links"]) {
    if (!Array.isArray(state[key]) || state[key].some((row) => !validateMaintenanceSyncRow(row))) {
      return validationFailure(`invalid_maintenance_${key}`);
    }
  }
  for (const key of ["recommended_actions", "blocked_actions"]) {
    if (!Array.isArray(state[key]) || state[key].some((row) => !validateMaintenanceAction(row))) {
      return validationFailure(`invalid_maintenance_${key}`);
    }
  }
  return true;
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
      if (!item.reviewable || !["learning", "workflow", "dashboard"].includes(String(item.scope || "")) || item.allowed_values.length === 0 || item.requires_confirmation !== true || String(item.source_file || "").startsWith("product:")) {
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
  if (dashboardDataContainsUnsafeValue(data)) {
    return validationFailure("unsafe_dashboard_value");
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
  if (!dashboardDisplayDepths.has(String(data.summary.display_depth || "standard"))) {
    return validationFailure("invalid_summary_display_depth");
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
  if (data.summary.overview_sections !== undefined) {
    const overviewSections = Array.isArray(data.summary.overview_sections) ? data.summary.overview_sections : null;
    if (!overviewSections) {
      return validationFailure("invalid_overview_sections");
    }
    const seenOverviewSections = new Set();
    for (const section of overviewSections) {
      const id = String(section?.id || "");
      const requiredCommand = String(section?.required_command || "");
      if (
        !isObject(section) ||
        !overviewSectionIds.has(id) ||
        seenOverviewSections.has(id) ||
        !nonEmptyString(section.title_key) ||
        !allowedStates.has(String(section.status || "")) ||
        !nonEmptyString(section.value) ||
        !nonEmptyString(section.detail) ||
        !nonEmptyString(section.source_id) ||
        !decisionOwnerSources.has(String(section.owner_source || "")) ||
        !evidenceFreshnessStates.has(String(section.freshness_state || "")) ||
        !evidenceAuthorities.has(String(section.authority || "")) ||
        !overviewDetailPages.has(String(section.detail_page || "")) ||
        !nonEmptyString(requiredCommand) ||
        (requiredCommand !== "not_applicable" && !safeCommandPreviewText(requiredCommand))
      ) {
        return validationFailure(`invalid_overview_section:${id || "missing"}`);
      }
      seenOverviewSections.add(id);
    }
    for (const id of overviewSectionIds) {
      if (!seenOverviewSections.has(id)) {
        return validationFailure(`missing_overview_section:${id}`);
      }
    }
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
  if (!validateRepositoryContextScope(data)) {
    return false;
  }
  if (!validateSecurityConfirmation(data)) {
    return false;
  }
  if (!validateMaintenanceSyncState(data)) {
    return false;
  }
  const workflowLanguageItem = Array.isArray(data.settings?.items) ? data.settings.items.find((item) => item?.id === "workflow_language") : null;
  if (workflowLanguageItem && data.summary.workflow_language && workflowLanguageItem.current_value !== data.summary.workflow_language) {
    return validationFailure("workflow_language_summary_mismatch");
  }
  const previews = Array.isArray(data.actions?.command_previews) ? data.actions.command_previews : [];
  for (const preview of previews) {
    const argv = Array.isArray(preview?.argv) ? preview.argv : [];
    const safeArgv = preview?.safe_argv === undefined ? argv : Array.isArray(preview?.safe_argv) ? preview.safe_argv : [];
    if (
      !preview ||
      typeof preview !== "object" ||
      (preview.command_id !== undefined && !/^cmd-[a-f0-9]{12}$/.test(String(preview.command_id || ""))) ||
      preview.execution_mode !== "preview_only" ||
      preview.non_executable !== true ||
      !riskLevels.has(String(preview.risk_level || "")) ||
      typeof preview.requires_approval !== "boolean" ||
      (preview.argv_redacted !== undefined && typeof preview.argv_redacted !== "boolean") ||
      (preview.copy_allowed !== undefined && typeof preview.copy_allowed !== "boolean") ||
      (preview.copy_block_reason !== undefined && !nonEmptyString(preview.copy_block_reason)) ||
      argv.length === 0 ||
      argv.length !== safeArgv.length ||
      JSON.stringify(argv) !== JSON.stringify(safeArgv) ||
      [...argv, ...safeArgv].some((token) => !safeCommandPreviewToken(token)) ||
      !safeCommandPreviewText(preview.command_text) ||
      (preview.copy_allowed === true && (preview.requires_approval === true || preview.argv_redacted === true || String(preview.risk_level || "") !== "low"))
    ) {
      return validationFailure("invalid_command_preview");
    }
  }
  return true;
}

function validNonNegativeNumber(value) {
  return Number.isFinite(Number(value)) && Number(value) >= 0;
}

function validateDashboardLiveCheckItemPayload(item, key) {
  if (!isObject(item)) {
    return validationFailure(`invalid_live_status_check_item:${key}`);
  }
  if (!nonEmptyString(item.source_id) || !nonEmptyString(item.category) || !nonEmptyString(item.kind)) {
    return validationFailure(`invalid_live_status_check_item_identity:${key}`);
  }
  if (!allowedStates.has(String(item.status || ""))) {
    return validationFailure(`invalid_live_status_check_item_status:${key}`);
  }
  if (!nonEmptyString(item.observed_at) || !evidenceFreshnessStates.has(String(item.freshness_state || "")) || !evidenceAuthorities.has(String(item.authority || ""))) {
    return validationFailure(`invalid_live_status_check_item_evidence:${key}`);
  }
  if (!nonEmptyString(item.summary) || !nonEmptyString(item.next_command)) {
    return validationFailure(`invalid_live_status_check_item_decision:${key}`);
  }
  if (item.source_artifacts !== undefined && (typeof item.source_artifacts !== "string" || (item.source_artifacts && !safeScopedReferenceList(item.source_artifacts)))) {
    return validationFailure(`invalid_live_status_check_item_source_artifacts:${key}`);
  }
  if (item.blocker_count !== undefined && !validNonNegativeNumber(item.blocker_count)) {
    return validationFailure(`invalid_live_status_check_item_blocker_count:${key}`);
  }
  return true;
}

function validateDashboardLiveCheckPayload(check, key) {
  if (!isObject(check) || !allowedStates.has(String(check.status || "")) || !nonEmptyString(check.observed_at) || !nonEmptyString(check.detail_code) || !nonEmptyString(check.source_id)) {
    return validationFailure(`invalid_live_status_check:${key}`);
  }
  for (const field of ["summary", "reason", "next_action", "required_command", "current_item_id"]) {
    if (!nonEmptyString(check[field])) {
      return validationFailure(`invalid_live_status_check_${field}:${key}`);
    }
  }
  if (!liveDetailPages.has(String(check.detail_page || ""))) {
    return validationFailure(`invalid_live_status_check_detail_page:${key}`);
  }
  if (!evidenceFreshnessStates.has(String(check.freshness_state || ""))) {
    return validationFailure(`invalid_live_status_check_freshness:${key}`);
  }
  if (!evidenceAuthorities.has(String(check.authority || ""))) {
    return validationFailure(`invalid_live_status_check_authority:${key}`);
  }
  if (!riskLevels.has(String(check.risk_level || ""))) {
    return validationFailure(`invalid_live_status_check_risk:${key}`);
  }
  if (check.blocker_count !== undefined && !validNonNegativeNumber(check.blocker_count)) {
    return validationFailure(`invalid_live_status_check_blocker_count:${key}`);
  }
  if (key === "ci") {
    if (!ciHeadMatchStates.has(String(check.head_match_status || "unknown"))) {
      return validationFailure("invalid_live_status_check_ci_head_match");
    }
    for (const field of ["workflow_name", "run_status", "conclusion", "run_id", "run_url", "repository_head", "run_head_sha", "run_head_branch"]) {
      if (check[field] !== undefined && typeof check[field] !== "string") {
        return validationFailure(`invalid_live_status_check_ci_${field}`);
      }
    }
  }
  if (!Array.isArray(check.items)) {
    return validationFailure(`invalid_live_status_check_items:${key}`);
  }
  return check.items.every((item) => validateDashboardLiveCheckItemPayload(item, key));
}

function validateDashboardRuntimeActivityItemPayload(item, label) {
  if (!isObject(item)) {
    return validationFailure(`invalid_${label}_item`);
  }
  if (!nonEmptyString(item.command_id) || !nonEmptyString(item.pid_hash) || !/^[a-f0-9]{8,32}$/.test(String(item.pid_hash))) {
    return validationFailure(`invalid_${label}_item_identity`);
  }
  if (!runtimeActivityCategories.has(String(item.category || ""))) {
    return validationFailure(`invalid_${label}_item_category`);
  }
  if (!runtimeActivityStates.has(String(item.state || ""))) {
    return validationFailure(`invalid_${label}_item_state`);
  }
  if (!validNonNegativeNumber(item.elapsed_ms)) {
    return validationFailure(`invalid_${label}_item_elapsed`);
  }
  if (!runtimeActivityCwdRoles.has(String(item.cwd_role || ""))) {
    return validationFailure(`invalid_${label}_item_cwd_role`);
  }
  if (!safeRuntimePreview(item.argv_preview)) {
    return validationFailure(`invalid_${label}_item_argv_preview`);
  }
  if (!runtimeRedactionStates.has(String(item.redaction_status || ""))) {
    return validationFailure(`invalid_${label}_item_redaction`);
  }
  return true;
}

function validateDashboardRuntimeActivityPayload(activity, label) {
  if (activity === undefined || activity === null) {
    return true;
  }
  if (!isObject(activity) || !nonEmptyString(activity.observed_at) || !validNonNegativeNumber(activity.process_count)) {
    return validationFailure(`invalid_${label}`);
  }
  if (!runtimeRedactionStates.has(String(activity.redaction_status || ""))) {
    return validationFailure(`invalid_${label}_redaction`);
  }
  const items = Array.isArray(activity.items) ? activity.items : Array.isArray(activity.processes) ? activity.processes : null;
  if (!Array.isArray(items)) {
    return validationFailure(`invalid_${label}_items`);
  }
  return items.every((item) => validateDashboardRuntimeActivityItemPayload(item, label));
}

export function validateDashboardLiveStatus(body) {
  let data;
  try {
    data = JSON.parse(body);
  } catch {
    return validationFailure("invalid_live_status_json");
  }
  if (dashboardDataContainsUnsafeValue(data)) {
    return validationFailure("unsafe_live_status_value");
  }
  if (!isObject(data) || data.schema_version !== "0.1.0" || !nonEmptyString(data.generated_at)) {
    return validationFailure("invalid_live_status_identity");
  }
  if (!dashboardMenuIds.has(String(data.menu_id || "")) || !nonEmptyString(data.workflow_context)) {
    return validationFailure("invalid_live_status_context");
  }
  const targetRepository = data.target_repository;
  if (
    !isObject(targetRepository) ||
    (targetRepository.repo_id !== undefined && !nonEmptyString(targetRepository.repo_id)) ||
    !nonEmptyString(targetRepository.name) ||
    !repositoryPathStates.has(String(targetRepository.path_state || "")) ||
    !repositoryPathStates.has(String(targetRepository.git_state || "")) ||
    !nonEmptyString(targetRepository.git_usage_mode) ||
    (targetRepository.selection_state !== undefined && !repositorySelectionStates.has(String(targetRepository.selection_state || "")))
  ) {
    return validationFailure("invalid_live_status_repository");
  }
  const repositoryState = data.repository_state;
  if (!isObject(repositoryState) || !["dirty_count", "untracked_count", "ahead", "behind"].every((key) => validNonNegativeNumber(repositoryState[key]))) {
    return validationFailure("invalid_live_status_repository_state");
  }
  if (data.runtime_activity !== undefined && !validateDashboardRuntimeActivityPayload(data.runtime_activity, "live_status_runtime_activity")) {
    return false;
  }
  if (data.active_operations !== undefined && !validateDashboardRuntimeActivityPayload(data.active_operations, "live_status_active_operations")) {
    return false;
  }
  const checks = data.checks;
  if (!isObject(checks)) {
    return validationFailure("invalid_live_status_checks");
  }
  for (const key of liveCheckKeys) {
    const check = checks[key];
    if (!validateDashboardLiveCheckPayload(check, key)) {
      return false;
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

function safeFailurePayload(error, detailCode) {
  return { error, detail_code: detailCode };
}

function dashboardRuntimeDataFile() {
  return dashboardDataFile() || path.join(runtimeRoot, "dashboard-data.json");
}

function dashboardSnapshotMenuId(body) {
  try {
    const data = JSON.parse(body);
    return String(data?.selected_context?.menu_id || "");
  } catch {
    return "";
  }
}

function dashboardDataMatchesRequestedMenu(body, menuId) {
  return !menuId || dashboardSnapshotMenuId(body) === menuId;
}

function readCachedDashboardDataForMenu(menuId) {
  const dataFile = dashboardRuntimeDataFile();
  try {
    const body = fs.readFileSync(dataFile, "utf8");
    if (!validateDashboardData(body)) {
      return null;
    }
    if (!dashboardDataMatchesRequestedMenu(body, menuId)) {
      return null;
    }
    return { body, dataFile };
  } catch {
    return null;
  }
}

function dashboardDataCacheEpoch(menuId) {
  return dashboardDataCacheEpochByMenu.get(menuId) || 0;
}

function bumpDashboardDataCacheEpoch(menuId) {
  const nextEpoch = dashboardDataCacheEpoch(menuId) + 1;
  dashboardDataCacheEpochByMenu.set(menuId, nextEpoch);
  return nextEpoch;
}

function writeDashboardDataCache(body, menuId = "", expectedEpoch = null) {
  if (!validateDashboardData(body)) {
    return false;
  }
  if (menuId && expectedEpoch !== null && dashboardDataCacheEpoch(menuId) !== expectedEpoch) {
    return false;
  }
  const dataFile = dashboardRuntimeDataFile();
  fs.mkdirSync(path.dirname(dataFile), { recursive: true });
  const tmpFile = path.join(path.dirname(dataFile), `.dashboard-data.${process.pid}.${Date.now()}.tmp`);
  fs.writeFileSync(tmpFile, body, { mode: 0o600 });
  fs.renameSync(tmpFile, dataFile);
  return true;
}

function sendDashboardDataBody(response, method, body, source) {
  response.statusCode = 200;
  response.setHeader("cache-control", "no-store");
  response.setHeader("content-type", "application/json; charset=utf-8");
  response.setHeader("x-dashboard-data-source", source);
  response.end(method === "HEAD" ? "" : body);
}

function safeSettingsToken(value) {
  return typeof value === "string" && /^[A-Za-z0-9_.:-]+$/.test(value) ? value : "";
}

function safeProductRepositoryId(value) {
  return typeof value === "string" && /^[A-Za-z0-9._-]+$/.test(value) ? value : "";
}

function safeSettingsPlanToken(value) {
  return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value) ? value : "";
}

function purgeExpiredSettingsPlanTokens(now = Date.now()) {
  for (const [token, record] of settingsPlanTokens.entries()) {
    if (!record || record.expiresAt <= now) {
      settingsPlanTokens.delete(token);
    }
  }
}

function createSettingsPlanToken(fingerprint) {
  const now = Date.now();
  purgeExpiredSettingsPlanTokens(now);
  const token = crypto.randomUUID();
  settingsPlanTokens.set(token, { fingerprint, expiresAt: now + settingsPlanTokenTtlMs });
  return token;
}

function consumeSettingsPlanToken(token, fingerprint) {
  purgeExpiredSettingsPlanTokens();
  const safeToken = safeSettingsPlanToken(token);
  if (!safeToken) {
    return false;
  }
  const record = settingsPlanTokens.get(safeToken);
  settingsPlanTokens.delete(safeToken);
  return Boolean(record && record.fingerprint === fingerprint);
}

function settingsSnapshotIdentity(dataFile) {
  try {
    const body = fs.readFileSync(dataFile, "utf8");
    if (!validateDashboardData(body)) {
      return { snapshotId: "invalid", contentHash: "invalid" };
    }
    const data = JSON.parse(body);
    return {
      snapshotId: String(data.snapshot_id || ""),
      contentHash: String(data.content_hash || ""),
    };
  } catch {
    return { snapshotId: "missing", contentHash: "missing" };
  }
}

function settingsSnapshotMatchesMenu(dataFile, menuId) {
  try {
    const body = fs.readFileSync(dataFile, "utf8");
    return validateDashboardData(body) && dashboardDataMatchesRequestedMenu(body, menuId);
  } catch {
    return false;
  }
}

function settingsPlanFingerprint(result, snapshotIdentity) {
  return JSON.stringify([
    result.setting_id,
    result.requested_value,
    result.menu_id,
    result.setting_kind,
    result.current_value,
    result.current_label,
    result.target_file,
    result.status,
    result.reason_code,
    snapshotIdentity.snapshotId,
    snapshotIdentity.contentHash,
  ]);
}

function settingsPlanCanCreateToken(result) {
  return Boolean(result && result.applied === false && result.status !== "blocked");
}

function runSettingsTool(args, menuId, dataFile) {
  return new Promise((resolve) => {
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
        windowsHide: true,
      },
      (error, stdout = "", stderr = "") => {
        if (error) {
          resolve({ error, stdout, stderr });
          return;
        }
        resolve({ stdout, stderr });
      },
    );
  });
}

function runProductRepositoryRegistryTool(args) {
  return new Promise((resolve) => {
    execFile(
      productRepositoryRegistryToolPath,
      args,
      {
        cwd: repoRoot,
        env: process.env,
        maxBuffer: 1024 * 1024,
        windowsHide: true,
      },
      (error, stdout = "", stderr = "") => {
        if (error) {
          resolve({ error, stdout, stderr });
          return;
        }
        resolve({ stdout, stderr });
      },
    );
  });
}

function parseSettingsToolResult(stdout) {
  try {
    return JSON.parse(stdout);
  } catch {
    return null;
  }
}

function dashboardMenuIdFromRequest(request) {
  let raw = "";
  try {
    const requestUrl = new URL(request.url || "", "http://127.0.0.1");
    raw = requestUrl.searchParams.get("menu_id") || "";
  } catch {
    raw = "";
  }
  if (!raw) {
    return { menuId: "" };
  }
  const menuId = safeSettingsToken(raw);
  if (!dashboardMenuIds.has(menuId)) {
    return { error: "dashboard data request contains an invalid menu id" };
  }
  return { menuId };
}

function runDashboardTool(args, menuId, timeoutMs, maxBufferBytes, label, extraEnv = {}) {
  return new Promise((resolve) => {
    execFile(
      dashboardDataToolPath,
      args,
      {
        cwd: repoRoot,
        env: {
          ...process.env,
          ...extraEnv,
          DASHBOARD_SELECTED_MENU_ID: menuId,
        },
        maxBuffer: maxBufferBytes,
        timeout: timeoutMs,
        windowsHide: true,
      },
      (error, stdout = "", stderr = "") => {
      if (error) {
        if (error.killed) {
          resolve({ error: new Error(`${label} timed out after ${timeoutMs}ms`), stdout, stderr });
          return;
        }
        if (/maxBuffer/i.test(String(error.message || ""))) {
          resolve({ error: new Error(`${label} exceeded output buffer`), stdout, stderr });
          return;
        }
        if (typeof error.code === "number") {
          resolve({ error: new Error(`${label} exited with ${error.code}`), stdout, stderr });
          return;
        }
        resolve({ error, stdout, stderr });
        return;
      }
      resolve({ stdout, stderr });
      },
    );
  });
}

function runDashboardDataTool(menuId) {
  return runDashboardTool([], menuId, dashboardDataGenerationTimeoutMs, 8 * 1024 * 1024, "dashboard data generation");
}

function runDashboardLiveStatusTool(menuId) {
  return runDashboardTool(
    ["live-status"],
    menuId,
    dashboardLiveStatusGenerationTimeoutMs,
    512 * 1024,
    "dashboard live status",
    { DASHBOARD_LIVE_STATUS_TIMEOUT_SECONDS: process.env.DASHBOARD_LIVE_STATUS_TIMEOUT_SECONDS || "2" },
  );
}

function generateDashboardDataForMenu(menuId, response, method) {
  const cached = readCachedDashboardDataForMenu(menuId);
  let generation = dashboardDataGenerationByMenu.get(menuId);
  if (!generation) {
    const cacheEpoch = dashboardDataCacheEpoch(menuId);
    generation = runDashboardDataTool(menuId).finally(() => {
      dashboardDataGenerationByMenu.delete(menuId);
    });
    generation.cacheEpoch = cacheEpoch;
    dashboardDataGenerationByMenu.set(menuId, generation);
  }
  if (cached) {
    generation.then(({ error, stdout }) => {
      if (!error && validateDashboardData(stdout) && dashboardDataMatchesRequestedMenu(stdout, menuId)) {
        writeDashboardDataCache(stdout, menuId, generation.cacheEpoch);
      }
    });
    sendDashboardDataBody(response, method, cached.body, "cache");
    return;
  }
  generation.then(({ error, stdout, stderr }) => {
    if (error) {
      response.statusCode = 503;
      response.setHeader("content-type", "application/json; charset=utf-8");
      response.end(JSON.stringify(safeFailurePayload("dashboard data generation failed", "dashboard_data_generation_failed")));
      return;
    }
    if (!validateDashboardData(stdout)) {
      response.statusCode = 422;
      response.setHeader("content-type", "application/json; charset=utf-8");
      response.end(JSON.stringify({ error: "dashboard data failed validation" }));
      return;
    }
    if (!dashboardDataMatchesRequestedMenu(stdout, menuId)) {
      response.statusCode = 422;
      response.setHeader("content-type", "application/json; charset=utf-8");
      response.end(JSON.stringify({ error: "dashboard data selected menu mismatch" }));
      return;
    }
    writeDashboardDataCache(stdout, menuId, generation.cacheEpoch);
    sendDashboardDataBody(response, method, stdout, "generated");
  });
}

function generateDashboardLiveStatusForMenu(menuId, response, method) {
  let generation = dashboardLiveStatusGenerationByMenu.get(menuId);
  if (!generation) {
    generation = runDashboardLiveStatusTool(menuId).finally(() => {
      dashboardLiveStatusGenerationByMenu.delete(menuId);
    });
    dashboardLiveStatusGenerationByMenu.set(menuId, generation);
  }
  generation.then(({ error, stdout, stderr }) => {
    if (error) {
      response.statusCode = 503;
      response.setHeader("content-type", "application/json; charset=utf-8");
      response.end(JSON.stringify(safeFailurePayload("dashboard live status failed", "dashboard_live_status_failed")));
      return;
    }
    if (!validateDashboardLiveStatus(stdout)) {
      response.statusCode = 422;
      response.setHeader("content-type", "application/json; charset=utf-8");
      response.end(JSON.stringify({ error: "dashboard live status failed validation" }));
      return;
    }
    response.statusCode = 200;
    response.setHeader("cache-control", "no-store");
    response.setHeader("content-type", "application/json; charset=utf-8");
    response.end(method === "HEAD" ? "" : stdout);
  });
}

function safeDesignSystemToken(value) {
  return typeof value === "string" && /^[A-Za-z0-9_.:()%,# -]+$/.test(value) ? value : "";
}

function designSystemPlanFingerprint(values) {
  return JSON.stringify([
    values.componentId,
    values.targetScope,
    values.themeAccent,
    values.density,
    values.radiusScale,
    values.typographyScale,
    values.actionControlHeight,
    values.actionControlPadding,
    values.compactControlHeight,
    values.compactControlPadding,
    values.formControlHeight,
    values.formControlPadding,
    values.iconButtonSize,
    values.controlFontSize,
    values.cardPadding,
    values.cardGap,
    values.rowPadding,
    values.rowGap,
    values.technicalAffordanceGap,
    values.technicalSourceMaxWidth,
    values.technicalEvidenceMaxWidth,
    values.technicalPreviewChipMaxWidth,
    values.pageHeaderPadding,
    values.metadataGap,
    values.pageIconSize,
    values.badgeGap,
    values.badgeHeight,
    values.modeBadgePadding,
    values.badgeFontSize,
    values.modeBadgeFontSize,
    values.tooltipTrigger,
    values.tooltipHidePolicy,
    values.tooltipPlacement,
    values.tooltipMaxWidth,
    values.copyFeedbackTrigger,
    values.copyFeedbackHidePolicy,
    values.copyFeedbackPlacement,
    values.copyFeedbackCollision,
    values.copyFeedbackDurationMs,
  ]);
}

function purgeExpiredDesignSystemPlanTokens(now = Date.now()) {
  for (const [token, record] of designSystemPlanTokens.entries()) {
    if (!record || record.expiresAt <= now) {
      designSystemPlanTokens.delete(token);
    }
  }
}

function createDesignSystemPlanToken(fingerprint) {
  const now = Date.now();
  purgeExpiredDesignSystemPlanTokens(now);
  const token = crypto.randomUUID();
  designSystemPlanTokens.set(token, { fingerprint, expiresAt: now + designSystemPlanTokenTtlMs });
  return token;
}

function consumeDesignSystemPlanToken(token, fingerprint) {
  purgeExpiredDesignSystemPlanTokens();
  if (typeof token !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(token)) {
    return false;
  }
  const record = designSystemPlanTokens.get(token);
  designSystemPlanTokens.delete(token);
  return Boolean(record && record.fingerprint === fingerprint);
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

    const allowedPayloadKeys = new Set(["setting_id", "value", "menu_id", "confirm", "plan_token", "snapshot_id", "content_hash"]);
    if (!payload || typeof payload !== "object" || Array.isArray(payload) || Object.keys(payload).some((key) => !allowedPayloadKeys.has(key))) {
      sendJson(response, 400, { error: "settings request contains unsupported fields" });
      return;
    }

    const settingId = safeSettingsToken(payload.setting_id);
    const value = safeSettingsToken(payload.value);
    const menuId = safeSettingsToken(payload.menu_id || "step_1_14");
    if (!settingId || !value || !menuId || !dashboardMenuIds.has(menuId)) {
      sendJson(response, 400, { error: "settings request contains an invalid setting id, value, or menu id" });
      return;
    }
    if (command === "apply" && payload.confirm !== true) {
      sendJson(response, 400, { error: "settings apply requires explicit confirmation" });
      return;
    }

    const dataFile = dashboardDataFile() || path.join(runtimeRoot, "dashboard-data.json");
    const planArgs = ["plan", settingId, value, "--menu", menuId];
    const snapshotIdentity = settingsSnapshotIdentity(dataFile);

    if (command === "apply") {
      const planToken = safeSettingsPlanToken(payload.plan_token);
      if (!planToken) {
        sendJson(response, 409, { error: "settings apply requires a matching current plan token" });
        return;
      }
      if (payload.snapshot_id !== undefined && String(payload.snapshot_id || "") !== snapshotIdentity.snapshotId) {
        sendJson(response, 409, { error: "settings apply requires the current dashboard snapshot" });
        return;
      }
      if (payload.content_hash !== undefined && String(payload.content_hash || "") !== snapshotIdentity.contentHash) {
        sendJson(response, 409, { error: "settings apply requires the current dashboard snapshot" });
        return;
      }
    }

    const planned = await runSettingsTool(planArgs, menuId, dataFile);
    if (planned.error) {
      sendJson(response, 422, safeFailurePayload("settings update failed", "settings_update_failed"));
      return;
    }
    const parsedPlan = parseSettingsToolResult(planned.stdout);
    if (!parsedPlan) {
      sendJson(response, 502, { error: "settings tool returned invalid JSON" });
      return;
    }
    const planFingerprint = settingsPlanFingerprint(parsedPlan, snapshotIdentity);

    if (command === "plan") {
      if (settingsPlanCanCreateToken(parsedPlan)) {
        parsedPlan.plan_token = createSettingsPlanToken(planFingerprint);
      } else {
        delete parsedPlan.plan_token;
      }
      sendJson(response, 200, parsedPlan);
      return;
    }

    if (!settingsPlanCanCreateToken(parsedPlan) || !consumeSettingsPlanToken(payload.plan_token, planFingerprint)) {
      sendJson(response, 409, { error: "settings apply requires a matching current plan token" });
      return;
    }

    const applyArgs = [
      "apply",
      settingId,
      value,
      "--menu",
      menuId,
      "--snapshot",
      dataFile,
      "--expect-current-value",
      String(parsedPlan.current_value || ""),
      "--expect-current-label",
      String(parsedPlan.current_label || ""),
      "--expect-target-file",
      String(parsedPlan.target_file || ""),
      "--expect-setting-kind",
      String(parsedPlan.setting_kind || ""),
      "--confirm",
    ];
    const applied = await runSettingsTool(applyArgs, menuId, dataFile);
    if (applied.error) {
      sendJson(response, 422, safeFailurePayload("settings update failed", "settings_update_failed"));
      return;
    }
    const parsedApply = parseSettingsToolResult(applied.stdout);
    if (!parsedApply) {
      sendJson(response, 502, { error: "settings tool returned invalid JSON" });
      return;
    }
    sendJson(response, 200, parsedApply);
  };
}

function dashboardProductRepositorySelectionMiddleware() {
  return async (request, response) => {
    if (request.method !== "POST") {
      response.statusCode = 405;
      response.end("method not allowed");
      return;
    }
    if (!requestHasJsonContentType(request)) {
      sendJson(response, 415, { error: "product repository selection requires application/json" });
      return;
    }
    if (!requestIsSameOrigin(request)) {
      sendJson(response, 403, { error: "product repository selection requires same-origin dashboard access" });
      return;
    }

    let payload;
    try {
      payload = await readSettingsJsonBody(request);
    } catch (error) {
      sendJson(response, 400, { error: error.message });
      return;
    }

    const allowedPayloadKeys = new Set(["menu_id", "repo_id", "confirm", "snapshot_id", "content_hash"]);
    if (!payload || typeof payload !== "object" || Array.isArray(payload) || Object.keys(payload).some((key) => !allowedPayloadKeys.has(key))) {
      sendJson(response, 400, { error: "product repository selection contains unsupported fields" });
      return;
    }
    if (payload.confirm !== true) {
      sendJson(response, 400, { error: "product repository selection requires explicit confirmation" });
      return;
    }

    const menuId = safeSettingsToken(payload.menu_id);
    const repoId = safeProductRepositoryId(payload.repo_id);
    if (!menuId || !repoId || !dashboardProductMenuIds.has(menuId)) {
      sendJson(response, 400, { error: "product repository selection contains an invalid menu or repository id" });
      return;
    }

    const dataFile = dashboardRuntimeDataFile();
    const snapshotIdentity = settingsSnapshotIdentity(dataFile);
    if (!payload.snapshot_id || String(payload.snapshot_id || "") !== snapshotIdentity.snapshotId) {
      sendJson(response, 409, { error: "product repository selection requires the current dashboard snapshot" });
      return;
    }
    if (!payload.content_hash || String(payload.content_hash || "") !== snapshotIdentity.contentHash) {
      sendJson(response, 409, { error: "product repository selection requires the current dashboard snapshot" });
      return;
    }
    if (!settingsSnapshotMatchesMenu(dataFile, menuId)) {
      sendJson(response, 409, { error: "product repository selection requires a dashboard snapshot for the selected menu" });
      return;
    }

    const selectEpoch = bumpDashboardDataCacheEpoch(menuId);
    const selected = await runProductRepositoryRegistryTool(["select", menuId, repoId, "--confirm", "--source", "dashboard"]);
    if (selected.error) {
      sendJson(response, 422, safeFailurePayload("product repository selection failed", "product_repository_selection_failed"));
      return;
    }

    const regenerated = await runDashboardDataTool(menuId);
    if (regenerated.error) {
      sendJson(response, 503, safeFailurePayload("dashboard data regeneration failed after product repository selection", "dashboard_data_regeneration_failed_after_product_repository_selection"));
      return;
    }
    if (!validateDashboardData(regenerated.stdout)) {
      sendJson(response, 422, { error: "regenerated dashboard data failed validation after product repository selection" });
      return;
    }
    if (!dashboardDataMatchesRequestedMenu(regenerated.stdout, menuId)) {
      sendJson(response, 422, { error: "regenerated dashboard data selected menu mismatch after product repository selection" });
      return;
    }
    if (!writeDashboardDataCache(regenerated.stdout, menuId, selectEpoch)) {
      sendJson(response, 409, { error: "dashboard data changed while product repository selection was refreshing" });
      return;
    }

    let snapshot = {};
    try {
      snapshot = JSON.parse(regenerated.stdout);
    } catch {
      snapshot = {};
    }
    sendJson(response, 200, {
      status: "passed",
      applied: true,
      menu_id: menuId,
      repo_id: repoId,
      snapshot_regenerated: true,
      snapshot_id: String(snapshot.snapshot_id || ""),
      content_hash: String(snapshot.content_hash || ""),
      tool_command: `tools/product-repository-registry select ${menuId} ${repoId} --confirm --source dashboard`,
    });
  };
}

function dashboardDesignSystemMutationMiddleware(command) {
  return async (request, response) => {
    if (request.method !== "POST") {
      response.statusCode = 405;
      response.end("method not allowed");
      return;
    }
    if (!requestHasJsonContentType(request)) {
      sendJson(response, 415, { error: "design-system mutation requires application/json" });
      return;
    }
    if (!requestIsSameOrigin(request)) {
      sendJson(response, 403, { error: "design-system mutation requires same-origin dashboard access" });
      return;
    }

    let payload;
    try {
      payload = await readSettingsJsonBody(request);
    } catch (error) {
      sendJson(response, 400, { error: error.message });
      return;
    }

    const allowedPayloadKeys = new Set([
      "component_id",
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
      "plan_token",
      "confirm",
    ]);
    if (!payload || typeof payload !== "object" || Array.isArray(payload) || Object.keys(payload).some((key) => !allowedPayloadKeys.has(key))) {
      sendJson(response, 400, { error: "design-system request contains unsupported fields" });
      return;
    }

    const componentId = safeDesignSystemToken(payload.component_id || "tooltip-copy");
    const targetScope = safeDesignSystemToken(payload.target_scope || "dashboard-control-center");
    const themeAccent = safeDesignSystemToken(payload.theme_accent || "blue");
    const density = safeDesignSystemToken(payload.density || "balanced");
    const radiusScale = safeDesignSystemToken(payload.radius_scale || "standard");
    const typographyScale = safeDesignSystemToken(payload.typography_scale || "standard");
    const actionControlHeight = safeDesignSystemToken(payload.action_control_height || "34px");
    const actionControlPadding = safeDesignSystemToken(payload.action_control_padding || "8px 11px");
    const compactControlHeight = safeDesignSystemToken(payload.compact_control_height || "32px");
    const compactControlPadding = safeDesignSystemToken(payload.compact_control_padding || "5px 10px");
    const formControlHeight = safeDesignSystemToken(payload.form_control_height || "40px");
    const formControlPadding = safeDesignSystemToken(payload.form_control_padding || "0 10px");
    const iconButtonSize = safeDesignSystemToken(payload.icon_button_size || "38px");
    const controlFontSize = safeDesignSystemToken(payload.control_font_size || "0.84rem");
    const cardPadding = safeDesignSystemToken(payload.card_padding || "14px");
    const cardGap = safeDesignSystemToken(payload.card_gap || "10px");
    const rowPadding = safeDesignSystemToken(payload.row_padding || "10px 12px");
    const rowGap = safeDesignSystemToken(payload.row_gap || "10px");
    const technicalAffordanceGap = safeDesignSystemToken(payload.technical_affordance_gap || "4px");
    const technicalSourceMaxWidth = safeDesignSystemToken(payload.technical_source_max_width || "260px");
    const technicalEvidenceMaxWidth = safeDesignSystemToken(payload.technical_evidence_max_width || "292px");
    const technicalPreviewChipMaxWidth = safeDesignSystemToken(payload.technical_preview_chip_max_width || "360px");
    const pageHeaderPadding = safeDesignSystemToken(payload.page_header_padding || "18px 20px");
    const metadataGap = safeDesignSystemToken(payload.metadata_gap || "8px");
    const pageIconSize = safeDesignSystemToken(payload.page_icon_size || "52px");
    const badgeGap = safeDesignSystemToken(payload.badge_gap || "5px");
    const badgeHeight = safeDesignSystemToken(payload.badge_height || "26px");
    const modeBadgePadding = safeDesignSystemToken(payload.mode_badge_padding || "4px 14px");
    const badgeFontSize = safeDesignSystemToken(payload.badge_font_size || "0.76rem");
    const modeBadgeFontSize = safeDesignSystemToken(payload.mode_badge_font_size || "0.78rem");
    const tooltipTrigger = safeDesignSystemToken(payload.tooltip_trigger || "hover-only");
    const tooltipHidePolicy = safeDesignSystemToken(payload.tooltip_hide_policy || "pointer-leave");
    const tooltipPlacement = safeDesignSystemToken(payload.tooltip_placement || "top");
    const tooltipMaxWidth = safeDesignSystemToken(payload.tooltip_max_width || "300px");
    const copyFeedbackTrigger = safeDesignSystemToken(payload.copy_feedback_trigger || "hover-only");
    const copyFeedbackHidePolicy = safeDesignSystemToken(payload.copy_feedback_hide_policy || "pointer-leave");
    const copyFeedbackPlacement = safeDesignSystemToken(payload.copy_feedback_placement || "top");
    const copyFeedbackCollision = safeDesignSystemToken(payload.copy_feedback_collision || "shift");
    const copyFeedbackDurationMs = safeDesignSystemToken(String(payload.copy_feedback_duration_ms || "1200"));
    const valid =
      componentId === "tooltip-copy" &&
      targetScope === "dashboard-control-center" &&
      ["blue", "teal", "slate"].includes(themeAccent) &&
      ["compact", "balanced", "comfortable"].includes(density) &&
      ["compact", "standard", "soft"].includes(radiusScale) &&
      ["standard", "large"].includes(typographyScale) &&
      ["32px", "34px", "38px"].includes(actionControlHeight) &&
      ["6px 10px", "8px 11px", "9px 13px"].includes(actionControlPadding) &&
      ["30px", "32px", "34px"].includes(compactControlHeight) &&
      ["4px 8px", "5px 10px", "6px 12px"].includes(compactControlPadding) &&
      ["38px", "40px", "44px"].includes(formControlHeight) &&
      ["0 9px", "0 10px", "0 12px"].includes(formControlPadding) &&
      ["34px", "38px", "42px"].includes(iconButtonSize) &&
      ["0.82rem", "0.84rem", "0.9rem"].includes(controlFontSize) &&
      ["12px", "14px", "16px"].includes(cardPadding) &&
      ["8px", "10px", "12px"].includes(cardGap) &&
      ["9px 10px", "10px 12px", "12px 14px"].includes(rowPadding) &&
      ["8px", "10px", "12px"].includes(rowGap) &&
      ["4px", "6px", "8px"].includes(technicalAffordanceGap) &&
      ["220px", "260px", "300px"].includes(technicalSourceMaxWidth) &&
      ["260px", "292px", "320px"].includes(technicalEvidenceMaxWidth) &&
      ["320px", "360px", "420px"].includes(technicalPreviewChipMaxWidth) &&
      ["16px 18px", "18px 20px", "20px 22px"].includes(pageHeaderPadding) &&
      ["6px", "8px", "10px"].includes(metadataGap) &&
      ["44px", "52px", "56px"].includes(pageIconSize) &&
      ["4px", "5px", "6px"].includes(badgeGap) &&
      ["24px", "26px", "28px"].includes(badgeHeight) &&
      ["3px 10px", "4px 14px", "5px 16px"].includes(modeBadgePadding) &&
      ["0.72rem", "0.76rem", "0.8rem"].includes(badgeFontSize) &&
      ["0.74rem", "0.78rem", "0.82rem"].includes(modeBadgeFontSize) &&
      ["hover-only", "disabled"].includes(tooltipTrigger) &&
      tooltipHidePolicy === "pointer-leave" &&
      tooltipPlacement === "top" &&
      ["260px", "300px", "360px"].includes(tooltipMaxWidth) &&
      ["hover-only", "disabled"].includes(copyFeedbackTrigger) &&
      copyFeedbackHidePolicy === "pointer-leave" &&
      copyFeedbackPlacement === "top" &&
      copyFeedbackCollision === "shift" &&
      ["800", "1200", "1800"].includes(copyFeedbackDurationMs);
    if (!valid) {
      sendJson(response, 400, { error: "design-system request contains an unsupported interaction value" });
      return;
    }
    if (command === "apply-interaction" && payload.confirm !== true) {
      sendJson(response, 400, { error: "design-system apply requires explicit confirmation" });
      return;
    }
    const planFingerprint = designSystemPlanFingerprint({
      componentId,
      targetScope,
      themeAccent,
      density,
      radiusScale,
      typographyScale,
      actionControlHeight,
      actionControlPadding,
      compactControlHeight,
      compactControlPadding,
      formControlHeight,
      formControlPadding,
      iconButtonSize,
      controlFontSize,
      cardPadding,
      cardGap,
      rowPadding,
      rowGap,
      technicalAffordanceGap,
      technicalSourceMaxWidth,
      technicalEvidenceMaxWidth,
      technicalPreviewChipMaxWidth,
      pageHeaderPadding,
      metadataGap,
      pageIconSize,
      badgeGap,
      badgeHeight,
      modeBadgePadding,
      badgeFontSize,
      modeBadgeFontSize,
      tooltipTrigger,
      tooltipHidePolicy,
      tooltipPlacement,
      tooltipMaxWidth,
      copyFeedbackTrigger,
      copyFeedbackHidePolicy,
      copyFeedbackPlacement,
      copyFeedbackCollision,
      copyFeedbackDurationMs,
    });
    if (command === "apply-interaction" && !consumeDesignSystemPlanToken(payload.plan_token, planFingerprint)) {
      sendJson(response, 409, { error: "design-system apply requires a matching current plan token" });
      return;
    }

    const args = [
      command,
      "--component",
      componentId,
      "--target-scope",
      targetScope,
      "--theme-accent",
      themeAccent,
      "--density",
      density,
      "--radius-scale",
      radiusScale,
      "--typography-scale",
      typographyScale,
      "--action-control-height",
      actionControlHeight,
      "--action-control-padding",
      actionControlPadding,
      "--compact-control-height",
      compactControlHeight,
      "--compact-control-padding",
      compactControlPadding,
      "--form-control-height",
      formControlHeight,
      "--form-control-padding",
      formControlPadding,
      "--icon-button-size",
      iconButtonSize,
      "--control-font-size",
      controlFontSize,
      "--card-padding",
      cardPadding,
      "--card-gap",
      cardGap,
      "--row-padding",
      rowPadding,
      "--row-gap",
      rowGap,
      "--technical-affordance-gap",
      technicalAffordanceGap,
      "--technical-source-max-width",
      technicalSourceMaxWidth,
      "--technical-evidence-max-width",
      technicalEvidenceMaxWidth,
      "--technical-preview-chip-max-width",
      technicalPreviewChipMaxWidth,
      "--page-header-padding",
      pageHeaderPadding,
      "--metadata-gap",
      metadataGap,
      "--page-icon-size",
      pageIconSize,
      "--badge-gap",
      badgeGap,
      "--badge-height",
      badgeHeight,
      "--mode-badge-padding",
      modeBadgePadding,
      "--badge-font-size",
      badgeFontSize,
      "--mode-badge-font-size",
      modeBadgeFontSize,
      "--tooltip-trigger",
      tooltipTrigger,
      "--tooltip-hide-policy",
      tooltipHidePolicy,
      "--tooltip-placement",
      tooltipPlacement,
      "--tooltip-max-width",
      tooltipMaxWidth,
      "--copy-feedback-trigger",
      copyFeedbackTrigger,
      "--copy-feedback-hide-policy",
      copyFeedbackHidePolicy,
      "--copy-feedback-placement",
      copyFeedbackPlacement,
      "--copy-feedback-collision",
      copyFeedbackCollision,
      "--copy-feedback-duration-ms",
      copyFeedbackDurationMs,
    ];
    if (command === "apply-interaction") {
      args.push("--confirm");
    }

    execFile(
      designSystemToolPath,
      args,
      {
        cwd: repoRoot,
        env: process.env,
        maxBuffer: 1024 * 1024,
      },
      (error, stdout, stderr) => {
        if (error) {
          sendJson(response, 422, safeFailurePayload("design-system update failed", "design_system_update_failed"));
          return;
        }
        try {
          const parsed = JSON.parse(stdout);
          if (command === "plan-interaction" && parsed && parsed.status === "ready" && parsed.applied === false) {
            parsed.plan_token = createDesignSystemPlanToken(planFingerprint);
          }
          sendJson(response, 200, parsed);
        } catch {
          sendJson(response, 502, { error: "design-system tool returned invalid JSON" });
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
      server.middlewares.use("/dashboard-product-repository/select", dashboardProductRepositorySelectionMiddleware());
      server.middlewares.use("/dashboard-design-system/plan", dashboardDesignSystemMutationMiddleware("plan-interaction"));
      server.middlewares.use("/dashboard-design-system/apply", dashboardDesignSystemMutationMiddleware("apply-interaction"));
      server.middlewares.use("/dashboard-live-status.json", (request, response) => {
        if (request.method !== "GET" && request.method !== "HEAD") {
          response.statusCode = 405;
          response.end("method not allowed");
          return;
        }
        const requestedMenu = dashboardMenuIdFromRequest(request);
        if (requestedMenu.error) {
          response.statusCode = 400;
          response.setHeader("content-type", "application/json; charset=utf-8");
          response.end(JSON.stringify({ error: requestedMenu.error }));
          return;
        }
        const menuId = requestedMenu.menuId || "step_1_14";
        generateDashboardLiveStatusForMenu(menuId, response, request.method);
      });
      server.middlewares.use("/dashboard-data.json", (request, response, next) => {
        const dataFile = dashboardRuntimeDataFile();
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
        const requestedMenu = dashboardMenuIdFromRequest(request);
        if (requestedMenu.error) {
          response.statusCode = 400;
          response.setHeader("content-type", "application/json; charset=utf-8");
          response.end(JSON.stringify({ error: requestedMenu.error }));
          return;
        }
        if (requestedMenu.menuId) {
          generateDashboardDataForMenu(requestedMenu.menuId, response, request.method);
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
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            {
              name: "react-vendor",
              test: /node_modules[\\/](react|react-dom|scheduler)[\\/]/,
              priority: 40,
            },
            {
              name: "icons-vendor",
              test: /node_modules[\\/]lucide-react[\\/]/,
              priority: 30,
            },
            {
              name: "dashboard-data-runtime",
              test: /dashboard-control-center[\\/]src[\\/]dashboardData\.js$/,
              priority: 24,
            },
            {
              name: "dashboard-i18n",
              test: /dashboard-control-center[\\/]src[\\/]i18n\.js$/,
              priority: 23,
            },
            {
              name: "dashboard-decision-summary",
              test: /dashboard-control-center[\\/]src[\\/]DecisionSummary\.jsx$/,
              priority: 22,
            },
            {
              name: "dashboard-context-runtime",
              test: /dashboard-control-center[\\/]src[\\/](dashboardContext|displayDepth)\.js$/,
              priority: 21,
            },
            {
              name: "dashboard-design-system",
              test: /dashboard-control-center[\\/]src[\\/]design-system\.generated\.js$/,
              priority: 20,
            },
            {
              name: "vendor",
              test: /node_modules[\\/]/,
              priority: 10,
            },
          ],
        },
      },
    },
  },
  server: {
    host: "127.0.0.1",
  },
});
