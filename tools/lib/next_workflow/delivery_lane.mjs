import { createHash } from "node:crypto";

const LANE_ORDER = Object.freeze(["none", "local", "remote_sync", "ci"]);
const REQUESTED_LANES = new Set(["auto", ...LANE_ORDER]);
const OUTCOME_FLOORS = Object.freeze({
  working_change: "none",
  local_history: "local",
  shared_branch: "remote_sync",
  pr_validation: "ci",
  main_release: "ci",
});
const RISK = new Set(["low", "medium", "high", "critical"]);
const CACHE_SCOPE = new Set(["none", "same-run", "dependency"]);
const IMMUTABLE_CI_EXACT = new Set([
  "AGENTS.MD",
  "learning/NEXT_WORKFLOW_DELIVERY_SETTINGS.json",
]);
const IMMUTABLE_CI_PREFIXES = Object.freeze([
  ".github/",
  ".githooks/",
  "docs/as-built/",
  "docs/workflow/",
  "tools/lib/next_workflow/",
  "tools/next-workflow",
]);

function canonicalJson(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(",")}}`;
  return JSON.stringify(value);
}

function digest(value) {
  return createHash("sha256").update(canonicalJson(value)).digest("hex");
}

function laneRank(lane) {
  const rank = LANE_ORDER.indexOf(lane);
  if (rank < 0) throw new Error("DELIVERY_LANE_INVALID");
  return rank;
}

function maximumLane(...lanes) {
  return lanes.reduce((maximum, lane) => laneRank(lane) > laneRank(maximum) ? lane : maximum, "none");
}

function safePattern(value) {
  return typeof value === "string" && value.length > 0 && value.length <= 4096 && !value.includes("\0") && !value.includes("\\") && !value.startsWith("/");
}

function globExpression(pattern) {
  const escaped = pattern.replace(/[.+?^${}()|[\]\\]/gu, "\\$&").replaceAll("*", ".*");
  return new RegExp(`^${escaped}$`, "u");
}

function pathMatches(pattern, changedPath) {
  return pattern.endsWith("/") ? changedPath.startsWith(pattern) : globExpression(pattern).test(changedPath);
}

export function validateDeliveryPreferences(input) {
  const keys = Object.keys(input ?? {}).sort().join("\0");
  if (keys !== ["requested_lane", "revision", "schema_version", "settings_id"].sort().join("\0")
    || input.schema_version !== "2.0.0"
    || input.settings_id !== "next-workflow-delivery-settings"
    || !Number.isSafeInteger(input.revision)
    || input.revision < 1
    || !REQUESTED_LANES.has(input.requested_lane)) throw new Error("DELIVERY_PREFERENCES_INVALID");
  const core = {
    schema_version: input.schema_version,
    settings_id: input.settings_id,
    revision: input.revision,
    requested_lane: input.requested_lane,
  };
  return { ...core, fingerprint: digest(core) };
}

export function parseTestPlanManifest(text) {
  if (typeof text !== "string" || text.length === 0 || text.length > 16 * 1024 * 1024) throw new Error("DELIVERY_TEST_MANIFEST_INVALID");
  const rows = [];
  for (const rawLine of text.split(/\r?\n/u)) {
    if (!rawLine.trim() || rawLine.startsWith("#")) continue;
    const fields = rawLine.split("\t");
    if (fields.length !== 8) throw new Error("DELIVERY_TEST_MANIFEST_INVALID");
    const [pattern, risk, checks, forceFull, ciRequired, cacheScope, quarantineAllowed, reason] = fields;
    if (!safePattern(pattern)
      || !RISK.has(risk)
      || !checks
      || !["true", "false"].includes(forceFull)
      || !["true", "false"].includes(ciRequired)
      || !CACHE_SCOPE.has(cacheScope)
      || !["true", "false"].includes(quarantineAllowed)
      || !reason) throw new Error("DELIVERY_TEST_MANIFEST_INVALID");
    rows.push({
      pattern,
      risk,
      checks: [...new Set(checks.split("|").filter(Boolean))].sort(),
      force_full: forceFull === "true",
      ci_required: ciRequired === "true",
      cache_scope: cacheScope,
    });
  }
  if (rows.length === 0) throw new Error("DELIVERY_TEST_MANIFEST_INVALID");
  return rows;
}

function evaluateManifest(paths, manifestText, source) {
  if (manifestText === null) return {
    source,
    available: false,
    unknown_paths: [...paths],
    matched_paths: [],
    required_checks: [],
    force_full: false,
    ci_required: false,
  };
  const rows = parseTestPlanManifest(manifestText);
  const requiredChecks = new Set();
  const unknownPaths = [];
  const matchedPaths = [];
  let forceFull = false;
  let ciRequired = false;
  for (const changedPath of paths) {
    const matches = rows.filter((row) => pathMatches(row.pattern, changedPath));
    if (matches.length === 0) {
      unknownPaths.push(changedPath);
      continue;
    }
    matchedPaths.push(changedPath);
    for (const match of matches) {
      match.checks.forEach((check) => requiredChecks.add(check));
      forceFull ||= match.force_full;
      ciRequired ||= match.ci_required;
    }
  }
  return {
    source,
    available: true,
    unknown_paths: unknownPaths,
    matched_paths: [...new Set(matchedPaths)].sort(),
    required_checks: [...requiredChecks].sort(),
    force_full: forceFull,
    ci_required: ciRequired,
  };
}

export function evaluateDeliveryImpact({ snapshot } = {}) {
  if (!snapshot
    || snapshot.kind !== "next-workflow-delivery-git-snapshot"
    || !/^[a-f0-9]{64}$/u.test(snapshot.fingerprint ?? "")
    || !Array.isArray(snapshot.changed_paths)) throw new Error("DELIVERY_IMPACT_SNAPSHOT_INVALID");
  const baseline = evaluateManifest(snapshot.changed_paths, snapshot.baseline_test_manifest, "integration_base");
  const current = evaluateManifest(snapshot.changed_paths, snapshot.current_test_manifest, "worktree");
  const baselineUnknown = new Set(baseline.unknown_paths);
  const currentUnknown = new Set(current.unknown_paths);
  const immutableCiPaths = snapshot.changed_paths.filter((changedPath) => IMMUTABLE_CI_EXACT.has(changedPath)
    || IMMUTABLE_CI_PREFIXES.some((prefix) => changedPath === prefix || changedPath.startsWith(prefix)));
  const unknownPaths = snapshot.changed_paths.filter((changedPath) => baselineUnknown.has(changedPath)
    && currentUnknown.has(changedPath)
    && !immutableCiPaths.includes(changedPath)).sort();
  const requiredChecks = [...new Set([...baseline.required_checks, ...current.required_checks])].sort();
  const core = {
    schema_version: "1.0.0",
    status: unknownPaths.length === 0 ? "known" : "unknown",
    required_lane: baseline.ci_required || current.ci_required || immutableCiPaths.length > 0 || unknownPaths.length > 0 ? "ci" : "none",
    force_full: baseline.force_full || current.force_full || unknownPaths.length > 0,
    hook_mode: baseline.force_full || current.force_full || unknownPaths.length > 0 ? "full-no-cache" : "saved",
    ci_required: baseline.ci_required || current.ci_required || immutableCiPaths.length > 0 || unknownPaths.length > 0,
    required_checks: requiredChecks,
    unknown_paths: unknownPaths,
    immutable_ci_paths: immutableCiPaths,
    evaluations: [baseline, current],
    git_snapshot_fingerprint: snapshot.fingerprint,
  };
  return { ...core, fingerprint: digest(core) };
}

function emptyCandidates() {
  return { automatic: [], manual: [], not_applicable: [] };
}

export function selectDeliveryLane({
  snapshot,
  impact,
  preferences: rawPreferences,
  outcome = "main_release",
  explicitLane,
  effectiveCeiling = "ci",
  gitPolicyCandidates = emptyCandidates(),
} = {}) {
  const preferences = validateDeliveryPreferences(rawPreferences);
  if (!Object.hasOwn(OUTCOME_FLOORS, outcome) || !LANE_ORDER.includes(effectiveCeiling)) throw new Error("DELIVERY_SELECTION_INPUT_INVALID");
  if (explicitLane !== undefined && !LANE_ORDER.includes(explicitLane)) throw new Error("DELIVERY_EXPLICIT_LANE_INVALID");
  if (!snapshot || impact?.git_snapshot_fingerprint !== snapshot.fingerprint || impact?.fingerprint === undefined) throw new Error("DELIVERY_IMPACT_BINDING_INVALID");
  const requestedLane = explicitLane ?? preferences.requested_lane;
  const requestSource = explicitLane ? "explicit" : preferences.requested_lane === "auto" ? "automatic" : "saved_preference";
  const requiredLane = maximumLane(OUTCOME_FLOORS[outcome], impact.required_lane);
  const selectedLane = requestedLane === "auto" ? requiredLane : requestedLane;
  const blockers = [];
  if (impact.status !== "known") blockers.push("DELIVERY_IMPACT_UNKNOWN");
  if (laneRank(selectedLane) < laneRank(requiredLane)) blockers.push("DELIVERY_LANE_BELOW_REQUIRED");
  if (laneRank(selectedLane) > laneRank(effectiveCeiling)) blockers.push("DELIVERY_LANE_EXCEEDS_TARGET_CEILING");
  const passed = blockers.length === 0;
  const candidates = passed ? {
    automatic: [...(gitPolicyCandidates.automatic ?? [])].sort(),
    manual: [...(gitPolicyCandidates.manual ?? [])].sort(),
    not_applicable: [...(gitPolicyCandidates.not_applicable ?? [])].sort(),
  } : emptyCandidates();
  const core = {
    schema_version: "2.0.0",
    kind: "next-workflow-delivery-plan",
    decision: passed ? "PASS" : "STOP",
    code: blockers[0] ?? "DELIVERY_LANE_SELECTED",
    outcome,
    requested_lane: requestedLane,
    request_source: requestSource,
    required_lane: requiredLane,
    selected_lane: selectedLane,
    effective_ceiling: effectiveCeiling,
    git_snapshot_fingerprint: snapshot.fingerprint,
    impact_fingerprint: impact.fingerprint,
    preference_fingerprint: preferences.fingerprint,
    verification: {
      required_checks: [...impact.required_checks],
      hook_mode: impact.hook_mode,
      no_cache: impact.force_full,
      pr_ci_required: selectedLane === "ci",
      main_ci_required: selectedLane === "ci" && outcome === "main_release",
    },
    actions: [],
    git_policy_candidates: candidates,
    grants_git_authority: false,
    requires_recheck_before_each_git_effect: true,
    blockers,
  };
  return { ...core, fingerprint: digest(core) };
}

export function verifyDeliveryLanePlan({
  plan,
  currentSnapshot,
  currentImpact,
  preferences,
  outcome,
  explicitLane,
  effectiveCeiling,
  gitPolicyCandidates,
} = {}) {
  if (!plan || !/^[a-f0-9]{64}$/u.test(plan.fingerprint ?? "")) throw new Error("DELIVERY_PLAN_INVALID");
  const current = selectDeliveryLane({
    snapshot: currentSnapshot,
    impact: currentImpact,
    preferences,
    outcome,
    explicitLane,
    effectiveCeiling,
    gitPolicyCandidates,
  });
  const matched = current.fingerprint === plan.fingerprint;
  const core = {
    schema_version: "2.0.0",
    decision: matched && current.decision === "PASS" ? "PASS" : "STOP",
    code: matched ? current.code : "DELIVERY_PLAN_INPUT_DRIFT",
    matched,
    planned_fingerprint: plan.fingerprint,
    current_fingerprint: current.fingerprint,
    selected_lane: current.selected_lane,
    required_lane: current.required_lane,
    actions: [],
    git_policy_candidates: matched && current.decision === "PASS" ? current.git_policy_candidates : emptyCandidates(),
    blockers: matched ? current.blockers : [...new Set(["DELIVERY_PLAN_INPUT_DRIFT", ...current.blockers])],
    replacement_plan: matched ? null : current,
    grants_git_authority: false,
  };
  return { ...core, fingerprint: digest(core) };
}

export function deliveryLaneDigest(value) {
  return digest(value);
}
