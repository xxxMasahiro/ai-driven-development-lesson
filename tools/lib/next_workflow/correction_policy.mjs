const CORRECTION_PHASES = Object.freeze([
  "fast_loop",
  "mid_tests",
  "implementation_plan",
  "release_gate",
  "main_sync_cleanup",
]);
const CORRECTION_PHASE_SET = new Set(CORRECTION_PHASES);
const ROUTABLE_FAILURE_TYPES = new Set(["correctable", "material_change", "owner_decision"]);
const TERMINAL_FAILURE_TYPES = new Set(["authority", "safety", "unknown"]);

export const HEADLESS_PRODUCTION_CORRECTION_PROFILE = Object.freeze({
  schema_version: "1.0.0",
  profile_id: "headless_production_stop_only_v1",
  max_retries: 0,
  allowed_decisions: Object.freeze(["PASS", "STOP"]),
  correction_phases: CORRECTION_PHASES,
});

function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}

export function routeCorrectionFailure({
  failureType = "unknown",
  phase = null,
  ownerDecisionRequired = false,
} = {}) {
  const normalizedFailureType = ROUTABLE_FAILURE_TYPES.has(failureType) || TERMINAL_FAILURE_TYPES.has(failureType)
    ? failureType
    : "unknown";
  const routable = ROUTABLE_FAILURE_TYPES.has(normalizedFailureType) && CORRECTION_PHASE_SET.has(phase);
  const route = routable ? phase : "STOP";
  const resumeAdvice = {
    schema_version: "1.0.0",
    advisory_type: "non_authorizing_resume_advice",
    route,
    authorizes_resume: false,
    authorizes_retry: false,
    requires_owner_decision: routable && (normalizedFailureType === "owner_decision" || ownerDecisionRequired === true),
    requires_material_change: routable,
  };
  return deepFreeze({
    schema_version: "1.0.0",
    profile_id: HEADLESS_PRODUCTION_CORRECTION_PROFILE.profile_id,
    decision: "STOP",
    failure_type: normalizedFailureType,
    resume_advice: resumeAdvice,
  });
}
