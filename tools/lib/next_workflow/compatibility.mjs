import { createHash } from "node:crypto";
import { lstatSync, readFileSync, realpathSync } from "node:fs";
import path from "node:path";
import { resolveDevelopmentInstruction } from "../development_instruction.mjs";

export const LEGACY_LIFECYCLE_ALIASES = Object.freeze({
  E: "outcome_discovery",
  F: "roadmap_decomposition",
  A: "solution_proposal_review",
  B: "implementation_planning",
  C: "build_and_verify",
  D: "release_and_sync",
});

const SUPPORTED_COMPATIBILITY_VERSIONS = new Set(["1.0.0"]);
const OBLIGATION_ID = /^[a-z][a-z0-9]*(?:[._-][a-z0-9]+)+$/;
const RIGOR_ORDER = ["L1", "L2", "L3", "L4", "L5"];
const GIT_APPROVALS = {
  push: "git_push_operation_approval",
  pr_creation: "git_pr_creation_approval",
  pr_create: "git_pr_creation_approval",
  merge: "git_merge_operation_approval",
};

function canonicalJson(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(",")}}`;
  return JSON.stringify(value);
}

function digest(value) {
  return createHash("sha256").update(canonicalJson(value)).digest("hex");
}

function requiredTimestamp(value, code) {
  if (typeof value !== "string" || !Number.isFinite(Date.parse(value))) throw new Error(code);
  return new Date(Date.parse(value)).toISOString();
}

export function resolveRuntimeAuthorityInputs({ repositoryRoot, resolverInput = {}, bindings = {}, sources = [], relationships = [], inheritedDuties = [], parentManagementPolicies = [], parentManagementPolicyInputs = [], relationshipVerifier, managementPolicyVerifier, now = new Date().toISOString(), instructionFreshUntil, instructionActions, instructionTargets, revocationEpoch = 0 } = {}) {
  if (sources.some((source) => source?.kind === "instruction")) throw new Error("RUNTIME_INSTRUCTION_SOURCE_MUST_BE_RESOLVED");
  if (sources.some((source) => source?.kind === "parent_management")) throw new Error("RUNTIME_PARENT_MANAGEMENT_SOURCE_MUST_BE_VALIDATED");
  const resolution = resolveDevelopmentInstruction({ root: repositoryRoot, ...resolverInput });
  if (resolution.status !== "ready") throw new Error("RUNTIME_INSTRUCTION_NOT_APPLICABLE");
  if (resolution.source_version !== "1.0.0" || resolution.source_profile === "local_compatibility") throw new Error("RUNTIME_INSTRUCTION_PROFILE_BLOCKED");
  if (!Number.isSafeInteger(revocationEpoch) || revocationEpoch < 0) throw new Error("RUNTIME_INSTRUCTION_EPOCH_INVALID");
  if (!Array.isArray(instructionActions) || instructionActions.length === 0 || instructionActions.includes("*") || instructionActions.some((value) => typeof value !== "string" || value.length === 0)) throw new Error("RUNTIME_INSTRUCTION_ACTIONS_EXACT_REQUIRED");
  if (!Array.isArray(instructionTargets) || instructionTargets.length === 0 || instructionTargets.includes("*") || instructionTargets.some((value) => typeof value !== "string" || value.length === 0)) throw new Error("RUNTIME_INSTRUCTION_TARGETS_EXACT_REQUIRED");
  const manualActions = new Set(resolution.git_plan?.manual ?? []);
  const requiredApprovals = [...new Set(instructionActions.flatMap((action) => manualActions.has(action) && GIT_APPROVALS[action] ? [GIT_APPROVALS[action]] : []))].sort();
  const procedural = resolution.procedural_contract;
  if (!procedural?.contract_fingerprint || !procedural.section_fingerprints || !Array.isArray(procedural.rule_ids)) throw new Error("RUNTIME_INSTRUCTION_PROCEDURAL_CONTRACT_REQUIRED");
  const instructionDuties = [
    { id: "instruction.procedural-contract", input: { source_profile_id: `instruction.${resolution.source_profile}`, source_fingerprint: resolution.source_digest, contract_fingerprint: procedural.contract_fingerprint, stage: resolution.stage }, owner: "development.instruction-resolver" },
    ...procedural.rule_ids.map((ruleId) => ({ id: ruleId.replace("workflow-rule:", "instruction.rule."), input: { source_profile_id: `instruction.${resolution.source_profile}`, source_fingerprint: resolution.source_digest, rule_id: ruleId }, owner: "development.instruction-resolver" }))
  ];
  const instructionSource = {
    kind: "instruction",
    source_id: `development-instruction:${resolution.context_id}:${resolution.source}`,
    decision: "allow",
    revision: `${resolution.source_version}:${resolution.source_digest}`,
    fingerprint: resolution.source_digest,
    fresh_until: requiredTimestamp(instructionFreshUntil, "RUNTIME_INSTRUCTION_FRESHNESS_INVALID"),
    revocation_epoch: revocationEpoch,
    actions: [...new Set(instructionActions)].sort(),
    targets: [...new Set(instructionTargets)].sort(),
    required_approvals: requiredApprovals,
    duties: instructionDuties,
    resource_ceilings: {},
    rigor_floor: "L3"
  };
  let effectiveBindings = { ...bindings, instruction_fingerprint: resolution.source_digest };
  const effectiveSources = [...sources, instructionSource];
  let managedChildCompatibility = null;
  if (resolution.target_kind === "product") {
    managedChildCompatibility = validateManagedChildCompatibility({ managedChild: true, relationships, inheritedDuties, parentManagementPolicies, parentManagementPolicyInputs, relationshipVerifier, managementPolicyVerifier, now });
    if (managedChildCompatibility.decision !== "PASS") throw new Error(`MANAGED_CHILD_COMPATIBILITY_BLOCKED:${managedChildCompatibility.reason}`);
    const relationship = managedChildCompatibility.relationship;
    if (bindings.repository_logical_id !== relationship.repository_logical_id || bindings.checkout_instance_id !== relationship.checkout_instance_id) throw new Error("MANAGED_CHILD_IDENTITY_BINDING_MISMATCH");
    effectiveBindings = { ...effectiveBindings, managed_child: true, parent_instance_id: relationship.parent_instance_id, relationship_id: relationship.relationship_id };
    const policy = managedChildCompatibility.management_policy;
    const managementPayload = { relationship, policy, inherited_duties: managedChildCompatibility.inherited_duties };
    effectiveSources.push({
      kind: "parent_management",
      source_id: `parent-management:${relationship.relationship_id}`,
      decision: "allow",
      revision: policy.revision,
      fingerprint: digest(managementPayload),
      fresh_until: policy.fresh_until,
      revocation_epoch: policy.revocation_epoch,
      actions: [...policy.actions],
      targets: [...policy.targets],
      required_approvals: [...policy.required_approvals],
      duties: uniqueDuties([...policy.duties, ...managedChildCompatibility.inherited_duties]),
      resource_ceilings: { ...policy.resource_ceilings },
      rigor_floor: policy.rigor_floor
    });
  }
  return {
    bindings: effectiveBindings,
    sources: effectiveSources,
    instruction: {
      source: resolution.source,
      source_profile: resolution.source_profile,
      source_version: resolution.source_version,
      source_digest: resolution.source_digest,
      local_state: resolution.instruction_authority.local_state,
      precedence: resolution.instruction_authority.precedence,
      fallback_trigger: resolution.instruction_authority.fallback_trigger
    },
    managed_child_compatibility: managedChildCompatibility
  };
}

export function mapLegacyLifecycle(value) {
  if (!Object.hasOwn(LEGACY_LIFECYCLE_ALIASES, value)) throw new Error(`LEGACY_LIFECYCLE_UNKNOWN:${value}`);
  return { legacy_alias: value, lifecycle_stage: LEGACY_LIFECYCLE_ALIASES[value], normal_display_uses_alias: false };
}

function normalizeObligation(obligation) {
  if (!obligation || typeof obligation !== "object" || Array.isArray(obligation) || !OBLIGATION_ID.test(obligation.obligation_id ?? "")) throw new Error("OBLIGATION_ID_INVALID");
  if (!new Set(["required", "advisory"]).has(obligation.enforcement)) throw new Error("OBLIGATION_ENFORCEMENT_INVALID");
  return { obligation_id: obligation.obligation_id, enforcement: obligation.enforcement };
}

export function resolveLegacyInstructionCompatibility({ localState, version = "versionless", obligations = [], parsedObligations = [] }) {
  if (localState === "invalid") return { decision: "BLOCK", source: "child_local", reason: "INVALID_LOCAL_BLOCKS", preserved_obligations: obligations };
  if (localState === "missing") return { decision: "PASS", source: "parent_fallback", reason: "EXACT_ABSENCE_ALLOWS_FALLBACK", preserved_obligations: [] };
  if (localState !== "valid") return { decision: "MANUAL_REQUIRED", source: "unresolved", reason: "LOCAL_STATE_UNKNOWN", preserved_obligations: obligations };
  if (version === "versionless") return { decision: "BLOCK", source: "child_local", reason: "VERSIONLESS_PROFILE_BLOCKED", preserved_obligations: obligations };
  if (!SUPPORTED_COMPATIBILITY_VERSIONS.has(version)) return { decision: "BLOCK", source: "child_local", reason: "UNKNOWN_PROFILE_VERSION", preserved_obligations: obligations };
  let normalized;
  try {
    normalized = obligations.map(normalizeObligation);
  } catch (error) {
    return { decision: "BLOCK", source: "child_local", reason: error.message, preserved_obligations: obligations };
  }
  const parsed = new Set(parsedObligations);
  const unparsed = normalized.filter((item) => !parsed.has(item.obligation_id));
  if (unparsed.length) {
    return { decision: "BLOCK", source: "child_local", reason: "UNKNOWN_OBLIGATION_ID", preserved_obligations: normalized, unparsed_obligations: unparsed };
  }
  return { decision: "PASS", source: "child_local", reason: "VALID_LOCAL_FIRST", preserved_obligations: normalized };
}

function uniqueDuties(duties) {
  return [...new Map(duties.map((duty) => [`${duty.input?.source_profile_id ?? duty.owner}:${duty.id}`, duty])).values()]
    .sort((left, right) => `${left.owner}:${left.id}`.localeCompare(`${right.owner}:${right.id}`));
}

function intersectAllowlist(lists) {
  let result = null;
  for (const values of lists) {
    const exact = new Set(values);
    if (exact.has("*")) continue;
    result = result === null ? exact : new Set([...result].filter((value) => exact.has(value)));
  }
  return [...(result ?? new Set(["*"]))].sort();
}

export function composeParentManagementPolicy({ relationship, policyInputs, claimedPolicy }) {
  if (!Array.isArray(policyInputs) || policyInputs.length === 0) throw new Error("PARENT_MANAGEMENT_POLICY_INPUTS_REQUIRED");
  const dutyById = new Map();
  const approvals = new Set();
  const resourceKeys = new Set();
  for (const input of policyInputs) {
    if (!input || input.relationship_id !== relationship.relationship_id || input.parent_instance_id !== relationship.parent_instance_id || input.decision !== "allow" || input.revocation_epoch !== relationship.authority_epoch || !Array.isArray(input.actions) || input.actions.length === 0 || !Array.isArray(input.targets) || input.targets.length === 0 || !Array.isArray(input.required_approvals) || !Array.isArray(input.duties) || !input.resource_ceilings || !RIGOR_ORDER.includes(input.rigor_floor) || !Number.isFinite(Date.parse(input.fresh_until))) throw new Error("PARENT_MANAGEMENT_POLICY_INPUT_INVALID");
    for (const approval of input.required_approvals) approvals.add(approval);
    for (const [key, value] of Object.entries(input.resource_ceilings)) {
      if (!Number.isFinite(value) || value < 0) throw new Error("PARENT_MANAGEMENT_RESOURCE_CEILING_INVALID");
      resourceKeys.add(key);
    }
    for (const duty of input.duties) {
      if (!duty || typeof duty.id !== "string" || !duty.input || typeof duty.owner !== "string") throw new Error("PARENT_MANAGEMENT_DUTY_INVALID");
      const prior = dutyById.get(duty.id);
      if (prior && canonicalJson(prior) !== canonicalJson(duty)) throw new Error("PARENT_MANAGEMENT_SEMANTIC_CONFLICT");
      dutyById.set(duty.id, structuredClone(duty));
    }
  }
  const resourceCeilings = Object.fromEntries([...resourceKeys].sort().map((key) => [key, Math.min(...policyInputs.map((input) => input.resource_ceilings[key]).filter(Number.isFinite))]));
  const semantic = {
    decision: "allow",
    actions: intersectAllowlist(policyInputs.map((input) => input.actions)),
    targets: intersectAllowlist(policyInputs.map((input) => input.targets)),
    required_approvals: [...approvals].sort(),
    duties: [...dutyById.values()].sort((left, right) => left.id.localeCompare(right.id)),
    resource_ceilings: resourceCeilings,
    rigor_floor: RIGOR_ORDER[Math.max(...policyInputs.map((input) => RIGOR_ORDER.indexOf(input.rigor_floor)))],
    fresh_until: new Date(Math.min(...policyInputs.map((input) => Date.parse(input.fresh_until)))).toISOString(),
    revocation_epoch: relationship.authority_epoch,
  };
  const compositionFingerprint = digest({ relationship_id: relationship.relationship_id, source_fingerprints: policyInputs.map((input) => input.policy_fingerprint ?? digest(input)).sort(), semantic });
  if (claimedPolicy) {
    const claimedSemantic = Object.fromEntries(Object.keys(semantic).map((key) => [key, claimedPolicy[key]]));
    if (canonicalJson(claimedSemantic) !== canonicalJson(semantic) || (policyInputs.length > 1 && claimedPolicy.composition_fingerprint !== compositionFingerprint)) throw new Error("PARENT_MANAGEMENT_CLAIM_MISMATCH");
  }
  return { ...semantic, composition_fingerprint: compositionFingerprint, source_fingerprints: policyInputs.map((input) => input.policy_fingerprint ?? digest(input)).sort() };
}

function verifyTrusted(verifier, payload, code, { relationship, now }) {
  if (!verifier || verifier.trusted !== true || typeof verifier.trust_root_id !== "string" || verifier.trust_root_id.length === 0 || typeof verifier.verify !== "function") return false;
  const payloadFingerprint = digest(payload);
  const result = verifier.verify(structuredClone(payload));
  if (result && typeof result.then === "function") throw new Error(`${code}_ASYNC_UNSUPPORTED`);
  return result?.verified === true
    && result.trust_root_id === verifier.trust_root_id
    && result.payload_fingerprint === payloadFingerprint
    && typeof result.signer_id === "string" && result.signer_id.length > 0
    && typeof result.key_id === "string" && result.key_id.length > 0
    && result.relationship_id === relationship.relationship_id
    && result.authority_epoch === relationship.authority_epoch
    && Number.isFinite(Date.parse(result.fresh_until))
    && Date.parse(result.fresh_until) >= Date.parse(now);
}

export function validateManagedChildCompatibility({ managedChild, relationships = [], inheritedDuties = [], parentManagementPolicies = [], parentManagementPolicyInputs = [], relationshipVerifier, managementPolicyVerifier, now = new Date().toISOString() }) {
  if (managedChild !== true) return { decision: "PASS", managed_child: false, relationship: null, inherited_duties: [] };
  if (!Array.isArray(relationships)) return { decision: "BLOCK", reason: "PARENT_RELATIONSHIPS_INVALID" };
  const nowTimestamp = Date.parse(now);
  if (!Number.isFinite(nowTimestamp)) return { decision: "BLOCK", reason: "RELATIONSHIP_TIME_INVALID" };
  const active = relationships.filter((relationship) => relationship?.state === "ACTIVE");
  if (active.length !== 1) return { decision: "BLOCK", reason: "ACTIVE_PARENT_CARDINALITY_INVALID", active_parent_cardinality: active.length };
  const relationship = active[0];
  for (const field of ["relationship_id", "parent_instance_id", "repository_logical_id", "checkout_instance_id"]) {
    if (typeof relationship[field] !== "string" || relationship[field].length === 0) return { decision: "BLOCK", reason: `PARENT_RELATIONSHIP_FIELD_REQUIRED:${field}` };
  }
  if (!Number.isSafeInteger(relationship.authority_epoch) || relationship.authority_epoch < 0 || relationship.revocation_state !== "active" || relationship.lease?.state !== "active" || !Number.isFinite(Date.parse(relationship.lease?.expires_at)) || Date.parse(relationship.lease.expires_at) < nowTimestamp || typeof relationship.policy_fingerprint !== "string" || typeof relationship.settings_fingerprint !== "string") return { decision: "BLOCK", reason: "PARENT_RELATIONSHIP_STALE_EXPIRED_OR_REVOKED" };
  if (!verifyTrusted(relationshipVerifier, { relationship }, "RELATIONSHIP_VERIFIER", { relationship, now })) return { decision: "BLOCK", reason: "PARENT_RELATIONSHIP_ATTESTATION_INVALID" };
  if (!Array.isArray(parentManagementPolicies)) return { decision: "BLOCK", reason: "PARENT_MANAGEMENT_POLICY_INVALID" };
  const matchingPolicies = parentManagementPolicies.filter((policy) => policy?.relationship_id === relationship.relationship_id && policy?.parent_instance_id === relationship.parent_instance_id);
  if (matchingPolicies.length !== 1) return { decision: "BLOCK", reason: "PARENT_MANAGEMENT_POLICY_CARDINALITY_INVALID" };
  const policy = matchingPolicies[0];
  if (typeof policy.policy_id !== "string" || typeof policy.revision !== "string" || policy.decision !== "allow" || policy.policy_fingerprint !== relationship.policy_fingerprint || policy.settings_fingerprint !== relationship.settings_fingerprint || policy.revocation_epoch !== relationship.authority_epoch || !Number.isFinite(Date.parse(policy.fresh_until)) || Date.parse(policy.fresh_until) < nowTimestamp || !Array.isArray(policy.actions) || policy.actions.length === 0 || !Array.isArray(policy.targets) || policy.targets.length === 0 || !Array.isArray(policy.required_approvals) || !Array.isArray(policy.duties) || !policy.resource_ceilings || typeof policy.resource_ceilings !== "object" || !new Set(["L1", "L2", "L3", "L4", "L5"]).has(policy.rigor_floor)) return { decision: "BLOCK", reason: "PARENT_MANAGEMENT_POLICY_STALE_OR_INVALID" };
  const policyInputs = parentManagementPolicyInputs.length > 0 ? parentManagementPolicyInputs.filter((input) => input?.relationship_id === relationship.relationship_id && input?.parent_instance_id === relationship.parent_instance_id) : [policy];
  let composition;
  try { composition = composeParentManagementPolicy({ relationship, policyInputs, claimedPolicy: policy }); } catch (error) { return { decision: "BLOCK", reason: error.message }; }
  if (!verifyTrusted(managementPolicyVerifier, { relationship, policy, policy_inputs: policyInputs, recomputed_policy: composition }, "MANAGEMENT_POLICY_VERIFIER", { relationship, now })) return { decision: "BLOCK", reason: "PARENT_MANAGEMENT_POLICY_ATTESTATION_INVALID" };
  if (!Array.isArray(inheritedDuties) || inheritedDuties.length === 0) return { decision: "BLOCK", reason: "STRUCTURED_INHERITED_DUTIES_REQUIRED" };
  const normalized = [];
  const keys = new Set();
  for (const duty of inheritedDuties) {
    if (!duty || typeof duty !== "object" || Array.isArray(duty) || !OBLIGATION_ID.test(duty.id ?? "") || !OBLIGATION_ID.test(duty.input?.source_profile_id ?? "") || duty.input?.relationship_id !== relationship.relationship_id || !new Set(["required", "advisory"]).has(duty.input?.enforcement) || !OBLIGATION_ID.test(duty.owner ?? "")) return { decision: "BLOCK", reason: "INHERITED_DUTY_INVALID" };
    const key = `${duty.input.source_profile_id}:${duty.id}`;
    if (keys.has(key)) return { decision: "BLOCK", reason: "INHERITED_DUTY_DUPLICATE" };
    keys.add(key);
    normalized.push({ id: duty.id, input: { source_profile_id: duty.input.source_profile_id, relationship_id: duty.input.relationship_id, enforcement: duty.input.enforcement }, owner: duty.owner });
  }
  normalized.sort((left, right) => `${left.input.source_profile_id}:${left.id}`.localeCompare(`${right.input.source_profile_id}:${right.id}`));
  return { decision: "PASS", managed_child: true, relationship: structuredClone(relationship), management_policy: { ...structuredClone(policy), ...composition }, inherited_duties: normalized };
}

function deepFreeze(value) {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value)) deepFreeze(child);
  }
  return value;
}

function hasForbiddenFixtureKey(value) {
  if (Array.isArray(value)) return value.some(hasForbiddenFixtureKey);
  if (!value || typeof value !== "object") return false;
  return Object.entries(value).some(([key, child]) => /(^|_)(absolute_)?(path|url|command|secret|credential)($|_)/i.test(key) || hasForbiddenFixtureKey(child));
}

export function loadCompatibilityProfileFixtures({ repositoryRoot, fixturePath } = {}) {
  const root = realpathSync(path.resolve(repositoryRoot));
  const candidate = path.resolve(fixturePath ?? path.join(root, "docs/workflow/next-workflow/fixtures/compatibility-profiles.json"));
  if (candidate !== root && !candidate.startsWith(`${root}${path.sep}`)) throw new Error("COMPATIBILITY_FIXTURE_PATH_ESCAPE");
  const stat = lstatSync(candidate);
  if (!stat.isFile() || stat.isSymbolicLink() || stat.size > 131072) throw new Error("COMPATIBILITY_FIXTURE_UNSAFE");
  const document = JSON.parse(readFileSync(candidate, "utf8"));
  if (document.schema_version !== "1.0.0" || document.isolated !== true || document.frozen !== true || !Array.isArray(document.profiles)) throw new Error("COMPATIBILITY_FIXTURE_INVALID");
  const ids = new Set();
  const fixtureIds = new Set();
  for (const profile of document.profiles) {
    if (!OBLIGATION_ID.test(profile.profile_id ?? "") || ids.has(profile.profile_id) || typeof profile.repository_fixture_id !== "string" || fixtureIds.has(profile.repository_fixture_id) || profile.instruction_profile_version !== "1.0.0" || profile.fixture_only !== true || hasForbiddenFixtureKey(profile)) throw new Error("COMPATIBILITY_PROFILE_INVALID");
    ids.add(profile.profile_id);
    fixtureIds.add(profile.repository_fixture_id);
    for (const obligation of profile.obligations ?? []) normalizeObligation(obligation);
    const fixtureVerifier = { trusted: true, trust_root_id: "isolated-fixture-trust-root", verify: (payload) => ({ verified: true, trust_root_id: "isolated-fixture-trust-root", payload_fingerprint: digest(payload), signer_id: "isolated-fixture-signer", key_id: "isolated-fixture-key", relationship_id: payload.relationship.relationship_id, authority_epoch: payload.relationship.authority_epoch, fresh_until: "2030-01-01T00:00:00.000Z" }) };
    const managed = validateManagedChildCompatibility({ managedChild: profile.managed_child, relationships: profile.relationships, inheritedDuties: profile.inherited_duties, parentManagementPolicies: profile.parent_management_policies, relationshipVerifier: fixtureVerifier, managementPolicyVerifier: fixtureVerifier, now: "2029-01-01T00:00:00.000Z" });
    if (profile.managed_child === true && managed.decision !== "PASS") throw new Error(`COMPATIBILITY_PROFILE_MANAGEMENT_INVALID:${managed.reason}`);
  }
  if (ids.size !== 3 || ["parent", "trace-cue", "frame-cue"].some((id) => !fixtureIds.has(id))) throw new Error("COMPATIBILITY_PROFILE_CARDINALITY_INVALID");
  return deepFreeze(document);
}

export function classifyRepositoryIdentityTransition({ before, after }) {
  if (!before || !after || before.repository_logical_id !== after.repository_logical_id) return { transition: "fork_or_replacement", requires_new_relationship: true, preserve_checkout_evidence: false };
  if (before.remote_identity_fingerprint !== after.remote_identity_fingerprint) return { transition: "fork", requires_new_relationship: true, preserve_checkout_evidence: false };
  if (before.checkout_instance_id !== after.checkout_instance_id) return { transition: "reclone", requires_new_relationship: false, preserve_checkout_evidence: false };
  if (before.canonical_location !== after.canonical_location) return { transition: "rename_or_move", requires_new_relationship: false, preserve_checkout_evidence: true };
  return { transition: "same_checkout", requires_new_relationship: false, preserve_checkout_evidence: true };
}

export function migrateLegacyRecord(record) {
  if (!record || typeof record !== "object") throw new Error("LEGACY_RECORD_INVALID");
  if (!Object.hasOwn(LEGACY_LIFECYCLE_ALIASES, record.stage)) return { status: "manual_required", reason: "LEGACY_UNKNOWN_BLOCKS", source_record: structuredClone(record) };
  const migrated = {
    schema_version: "1.0.0",
    lifecycle_stage: LEGACY_LIFECYCLE_ALIASES[record.stage],
    execution_phase: record.execution_phase ?? "context_triage",
    legacy_alias: record.stage,
    legacy_source_revision: String(record.revision ?? "unknown"),
    additive: true,
  };
  return { status: "migrated", record: migrated, fingerprint: digest(migrated) };
}

export function compareShadowRuns({ legacy, candidate, requiredChecks = [] }) {
  const legacyChecks = new Map((legacy.checks ?? []).map((item) => [item.id, item]));
  const candidateChecks = new Map((candidate.checks ?? []).map((item) => [item.id, item]));
  const requiredCheckMisses = requiredChecks.filter((id) => legacyChecks.get(id)?.required && !candidateChecks.get(id)?.executed);
  const authorityDecisionParity = canonicalJson(legacy.authority_decisions ?? []) === canonicalJson(candidate.authority_decisions ?? []);
  const traceabilityCoverage = (legacy.trace_ids ?? []).length === 0 ? 1 : (legacy.trace_ids ?? []).filter((id) => (candidate.trace_ids ?? []).includes(id)).length / legacy.trace_ids.length;
  const existingFeatureRegressions = (candidate.regressions ?? []).filter((item) => item.existing_feature === true);
  const legacyResultCompatibility = canonicalJson(legacy.result) === canonicalJson(candidate.result);
  const accepted = requiredCheckMisses.length === 0 && authorityDecisionParity && traceabilityCoverage === 1 && existingFeatureRegressions.length === 0 && legacyResultCompatibility;
  const metrics = { required_check_misses: requiredCheckMisses.length, authority_decision_parity: authorityDecisionParity, traceability_coverage: traceabilityCoverage, existing_feature_regressions: existingFeatureRegressions.length, legacy_result_compatibility: legacyResultCompatibility };
  return { status: accepted ? "passed" : "failed", accepted, metrics, fingerprint: digest(metrics), speed_eligible_for_evaluation: accepted };
}

export function compatibilityDigest(value) {
  return digest(value);
}
