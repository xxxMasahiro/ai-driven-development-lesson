import { createHash, randomUUID } from "node:crypto";
import { validateActivationRecord } from "./projection.mjs";
import { reconcileEffect } from "./saga.mjs";

const AUTHORITY_VARIANTS = new Set(["git_effect", "provider_effect", "agent_launch", "agent_run_admission", "filesystem_write", "adapter_send", "runtime_service", "artifact_dependency", "resource_cost"]);
const APPROVAL_REASONS = new Set(["sandbox_boundary", "network_access", "credential_or_secret", "destructive_operation", "l5_scope_approval", "scope_expansion", "unowned_change_conflict", "ambiguous_owner_decision", "git_push_operation_approval", "git_pr_creation_approval", "git_merge_operation_approval"]);
const COMMON_SOURCES = ["target_invariant", "saved_settings", "task_scope", "rigor", "instruction", "runtime_capability"];
const AUTHORITY_SOURCE_KINDS = new Set([...COMMON_SOURCES, "parent_management", "product_ceiling", "provider_capability"]);
const RIGOR_LEVELS = ["L1", "L2", "L3", "L4", "L5"];

function canonicalJson(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(",")}}`;
  return JSON.stringify(value);
}

function fingerprint(value) {
  return createHash("sha256").update(canonicalJson(value)).digest("hex");
}

function requireString(value, code) {
  if (typeof value !== "string" || value.length === 0) throw new Error(code);
  return value;
}

function requireTimestamp(value, code) {
  requireString(value, code);
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) throw new Error(code);
  return new Date(timestamp).toISOString();
}

function requireEpoch(value, code) {
  if (!Number.isSafeInteger(value) || value < 0) throw new Error(code);
  return value;
}

function normalizeDuty(duty) {
  if (!duty || typeof duty !== "object" || Array.isArray(duty)) throw new Error("AUTHORITY_DUTY_INVALID");
  if (!Object.hasOwn(duty, "input")) throw new Error("AUTHORITY_DUTY_INPUT_REQUIRED");
  return {
    id: requireString(duty.id, "AUTHORITY_DUTY_ID_REQUIRED"),
    input: structuredClone(duty.input),
    owner: requireString(duty.owner, "AUTHORITY_DUTY_OWNER_REQUIRED")
  };
}

function uniqueStructured(values) {
  const unique = new Map(values.map((value) => [canonicalJson(value), value]));
  return [...unique.entries()].sort(([left], [right]) => left.localeCompare(right)).map(([, value]) => value);
}

function requireObject(value, code) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(code);
  return value;
}

function requireStringArray(value, code) {
  if (!Array.isArray(value) || value.length === 0 || value.some((item) => typeof item !== "string" || item.length === 0)) throw new Error(code);
  return [...new Set(value)].sort();
}

function requireSubjectFields(subject, fields, variant) {
  for (const field of fields) requireString(subject[field], `AUTHORITY_SUBJECT_FIELD_REQUIRED:${variant}:${field}`);
}

function normalizeSubject(variant, input) {
  const subject = structuredClone(requireObject(input, "AUTHORITY_SUBJECT_REQUIRED"));
  if (variant === "git_effect") {
    requireSubjectFields(subject, ["branch", "remote", "ref", "tree_sha", "head_sha", "effect_intent_fingerprint", "expected_provider_object"], variant);
  } else if (variant === "provider_effect") {
    requireSubjectFields(subject, ["provider_identity_fingerprint", "configuration_fingerprint", "request_fingerprint", "expected_provider_object"], variant);
  } else if (variant === "agent_launch") {
    requireSubjectFields(subject, ["grant_fingerprint", "launch_intent_fingerprint", "parent_agent_id", "parent_role", "requested_configuration_fingerprint", "selected_configuration_fingerprint", "effective_configuration_fingerprint", "context_fingerprint", "budget_reservation_id", "sandbox_fingerprint", "capability_fingerprint"], variant);
    if (subject.actual_observed !== null) throw new Error("AUTHORITY_AGENT_LAUNCH_ACTUAL_MUST_BE_ABSENT");
    if (!Number.isSafeInteger(subject.authority_epoch) || subject.authority_epoch < 0) throw new Error("AUTHORITY_AGENT_LAUNCH_EPOCH_INVALID");
    subject.owned_targets = requireStringArray(subject.owned_targets, "AUTHORITY_AGENT_LAUNCH_TARGETS_REQUIRED");
  } else if (variant === "agent_run_admission") {
    requireSubjectFields(subject, ["launch_decision_fingerprint", "process_identity_fingerprint", "configuration_attestation_fingerprint", "actual_sandbox_fingerprint", "actual_capability_fingerprint", "actual_targets_fingerprint", "observation_proof_fingerprint", "admission_result"], variant);
    if (!new Set(["admit", "refuse"]).has(subject.admission_result)) throw new Error("AUTHORITY_AGENT_ADMISSION_RESULT_INVALID");
  } else if (variant === "filesystem_write") {
    requireSubjectFields(subject, ["canonical_relative_target", "operation", "owner", "prewrite_identity_fingerprint", "prewrite_content_fingerprint", "symlink_policy", "resource_lock_id"], variant);
    subject.integration_order = requireStringArray(subject.integration_order, "AUTHORITY_FILESYSTEM_INTEGRATION_ORDER_REQUIRED");
  } else if (variant === "adapter_send") {
    requireSubjectFields(subject, ["message_fingerprint", "projection_fingerprint", "outbox_intent_fingerprint", "recipient", "payload_classification"], variant);
    if (!Number.isSafeInteger(subject.relationship_epoch) || subject.relationship_epoch < 0) throw new Error("AUTHORITY_ADAPTER_RELATIONSHIP_EPOCH_INVALID");
  } else if (variant === "runtime_service") {
    requireSubjectFields(subject, ["service_identity_fingerprint", "health_precondition_fingerprint", "owner", "expected_lifecycle_receipt"], variant);
  } else if (variant === "artifact_dependency") {
    requireSubjectFields(subject, ["artifact_identity", "version", "digest", "provenance_fingerprint", "destination", "operation"], variant);
    if (!Number.isSafeInteger(subject.byte_bound) || subject.byte_bound < 0) throw new Error("AUTHORITY_ARTIFACT_BYTE_BOUND_INVALID");
  } else if (variant === "resource_cost") {
    requireSubjectFields(subject, ["reservation_id", "provider_price_revision", "provider_source_fingerprint", "release_condition"], variant);
    requireObject(subject.reservation, "AUTHORITY_RESOURCE_RESERVATION_REQUIRED");
    if (!Number.isSafeInteger(subject.retry_ceiling) || subject.retry_ceiling < 0) throw new Error("AUTHORITY_RESOURCE_RETRY_CEILING_INVALID");
    if (subject.overspend_refusal !== true) throw new Error("AUTHORITY_RESOURCE_OVERSPEND_REFUSAL_REQUIRED");
  }
  return subject;
}

function requiredSourceKinds(variant, managedChild) {
  const kinds = [...COMMON_SOURCES];
  if (managedChild) kinds.push("parent_management");
  if (variant === "git_effect") kinds.push("product_ceiling");
  if (["provider_effect", "agent_launch", "agent_run_admission", "runtime_service", "artifact_dependency", "resource_cost"].includes(variant)) kinds.push("provider_capability");
  return kinds;
}

function deny(code, reasons, basis) {
  const decision = { schema_version: "1.0.0", decision: "DENY", code, reasons: [...new Set(reasons)].sort(), basis };
  return { ...decision, fingerprint: fingerprint(decision) };
}

function normalizeSource(source) {
  if (!source || typeof source !== "object") throw new Error("AUTHORITY_SOURCE_INVALID");
  const normalized = {
    kind: requireString(source.kind, "AUTHORITY_SOURCE_KIND_REQUIRED"),
    source_id: requireString(source.source_id, "AUTHORITY_SOURCE_ID_REQUIRED"),
    decision: source.decision,
    revision: requireString(source.revision, "AUTHORITY_SOURCE_REVISION_REQUIRED"),
    fingerprint: requireString(source.fingerprint, "AUTHORITY_SOURCE_FINGERPRINT_REQUIRED"),
    fresh_until: requireTimestamp(source.fresh_until, "AUTHORITY_SOURCE_FRESHNESS_INVALID"),
    revocation_epoch: requireEpoch(source.revocation_epoch ?? 0, "AUTHORITY_SOURCE_EPOCH_INVALID"),
    actions: [...(source.actions ?? [])].sort(),
    targets: [...(source.targets ?? [])].sort(),
    required_approvals: [...(source.required_approvals ?? [])].sort(),
    duties: uniqueStructured([...(source.duties ?? [])].map(normalizeDuty)),
    resource_ceilings: { ...(source.resource_ceilings ?? {}) },
    rigor_floor: source.rigor_floor ?? "L1"
  };
  if (!AUTHORITY_SOURCE_KINDS.has(normalized.kind)) throw new Error(`AUTHORITY_SOURCE_KIND_INVALID:${normalized.kind}`);
  if (source.kind === "target_invariant") {
    if (!new Set(["parent", "managed_child"]).has(source.repository_management)) throw new Error("TARGET_REPOSITORY_MANAGEMENT_REQUIRED");
    normalized.repository_management = source.repository_management;
  }
  if (!new Set(["allow", "deny"]).has(normalized.decision)) throw new Error("AUTHORITY_SOURCE_DECISION_INVALID");
  if (!RIGOR_LEVELS.includes(normalized.rigor_floor)) throw new Error(`AUTHORITY_RIGOR_FLOOR_INVALID:${normalized.rigor_floor}`);
  requireStringArray(normalized.actions, "AUTHORITY_SOURCE_ACTIONS_REQUIRED");
  for (const reason of normalized.required_approvals) if (!APPROVAL_REASONS.has(reason)) throw new Error(`APPROVAL_REASON_INVALID:${reason}`);
  for (const [key, value] of Object.entries(normalized.resource_ceilings)) if (!Number.isFinite(value) || value < 0) throw new Error(`AUTHORITY_RESOURCE_CEILING_INVALID:${key}`);
  return normalized;
}

function normalizeApprovalGrants(approvals, bindings, decisionTime, approvalVerifier) {
  if (approvals === undefined) return [];
  if (!Array.isArray(approvals)) throw new Error("AUTHORITY_APPROVAL_GRANTS_INVALID");
  if (approvals.length > 0 && (!approvalVerifier || approvalVerifier.trusted !== true || approvalVerifier.independent !== true || typeof approvalVerifier.verifier_id !== "string" || typeof approvalVerifier.verify !== "function")) throw new Error("AUTHORITY_APPROVAL_VERIFIER_REQUIRED");
  return approvals.map((approval) => {
    if (!approval || typeof approval !== "object" || Array.isArray(approval)) throw new Error("AUTHORITY_APPROVAL_GRANT_INVALID");
    const normalized = {
      reason: requireString(approval.reason, "AUTHORITY_APPROVAL_REASON_REQUIRED"),
      approval_id: requireString(approval.approval_id, "AUTHORITY_APPROVAL_ID_REQUIRED"),
      target_id: requireString(approval.target_id, "AUTHORITY_APPROVAL_TARGET_REQUIRED"),
      task_id: requireString(approval.task_id, "AUTHORITY_APPROVAL_TASK_REQUIRED"),
      authority_epoch: requireEpoch(approval.authority_epoch, "AUTHORITY_APPROVAL_EPOCH_INVALID"),
      fresh_until: requireTimestamp(approval.fresh_until, "AUTHORITY_APPROVAL_FRESHNESS_INVALID"),
      proof_fingerprint: requireString(approval.proof_fingerprint, "AUTHORITY_APPROVAL_PROOF_REQUIRED")
    };
    if (!APPROVAL_REASONS.has(normalized.reason)) throw new Error(`APPROVAL_REASON_INVALID:${normalized.reason}`);
    if (normalized.target_id !== bindings.target_id || normalized.task_id !== bindings.task_id || normalized.authority_epoch !== bindings.revocation_epoch || Date.parse(normalized.fresh_until) < Date.parse(decisionTime)) throw new Error("AUTHORITY_APPROVAL_BINDING_INVALID");
    const bindingFingerprint = fingerprint({ reason: normalized.reason, approval_id: normalized.approval_id, target_id: normalized.target_id, task_id: normalized.task_id, authority_epoch: normalized.authority_epoch, fresh_until: normalized.fresh_until });
    const verification = approvalVerifier.verify({ approval: structuredClone(normalized), binding_fingerprint: bindingFingerprint, decision_time: decisionTime });
    if (verification?.verified !== true || verification.verifier_id !== approvalVerifier.verifier_id || verification.approval_id !== normalized.approval_id || verification.proof_fingerprint !== normalized.proof_fingerprint || verification.binding_fingerprint !== bindingFingerprint) throw new Error("AUTHORITY_APPROVAL_PROOF_INVALID");
    return normalized;
  });
}

export function composeAuthorityDecision({ variant, action, subject, bindings, sources, approvalVerifier, now = new Date().toISOString() }) {
  if (!AUTHORITY_VARIANTS.has(variant)) throw new Error("AUTHORITY_VARIANT_INVALID");
  requireString(action, "AUTHORITY_ACTION_REQUIRED");
  const normalizedSubject = normalizeSubject(variant, subject);
  if (!bindings || typeof bindings !== "object") throw new Error("AUTHORITY_BINDINGS_REQUIRED");
  if (Object.hasOwn(bindings, "required_source_kinds")) throw new Error("AUTHORITY_REQUIRED_SOURCE_KINDS_OVERRIDE_FORBIDDEN");
  for (const field of ["repository_logical_id", "checkout_instance_id", "task_id", "run_id", "target_id", "instruction_fingerprint", "policy_fingerprint", "settings_revision", "runtime_capability_fingerprint"]) requireString(bindings[field], `AUTHORITY_BINDING_REQUIRED:${field}`);
  if (bindings.managed_child === true) {
    requireString(bindings.parent_instance_id, "AUTHORITY_BINDING_REQUIRED:parent_instance_id");
    requireString(bindings.relationship_id, "AUTHORITY_BINDING_REQUIRED:relationship_id");
  }
  const decisionTime = requireTimestamp(now, "AUTHORITY_NOW_INVALID");
  if (!Array.isArray(sources)) throw new Error("AUTHORITY_SOURCES_REQUIRED");
  const normalized = sources.map(normalizeSource).sort((a, b) => `${a.kind}:${a.source_id}`.localeCompare(`${b.kind}:${b.source_id}`));
  if (new Set(normalized.map((source) => source.kind)).size !== normalized.length) throw new Error("AUTHORITY_SOURCE_KIND_DUPLICATE");
  if (new Set(normalized.map((source) => source.source_id)).size !== normalized.length) throw new Error("AUTHORITY_SOURCE_ID_DUPLICATE");
  const byKind = new Map(normalized.map((source) => [source.kind, source]));
  const managedChild = byKind.get("target_invariant")?.repository_management === "managed_child";
  if (Object.hasOwn(bindings, "managed_child") && bindings.managed_child !== managedChild) throw new Error("AUTHORITY_MANAGEMENT_BINDING_MISMATCH");
  if (managedChild) {
    requireString(bindings.parent_instance_id, "AUTHORITY_BINDING_REQUIRED:parent_instance_id");
    requireString(bindings.relationship_id, "AUTHORITY_BINDING_REQUIRED:relationship_id");
  }
  const required = requiredSourceKinds(variant, managedChild);
  const missing = required.filter((kind) => !byKind.has(kind));
  const basis = { variant, action, subject: normalizedSubject, bindings, sources: normalized.map((source) => ({ kind: source.kind, source_id: source.source_id, revision: source.revision, fingerprint: source.fingerprint, revocation_epoch: source.revocation_epoch })) };
  if (missing.length) return deny("MISSING_AUTHORITY_SOURCE", missing, basis);
  const denied = normalized.filter((source) => source.decision === "deny").map((source) => source.source_id);
  if (denied.length) return deny("SOURCE_DENIED", denied, basis);
  const stale = normalized.filter((source) => Date.parse(source.fresh_until) < Date.parse(decisionTime)).map((source) => source.source_id);
  if (stale.length) return deny("AUTHORITY_STALE", stale, basis);
  const expectedEpoch = bindings.revocation_epoch === undefined ? Math.max(...normalized.map((source) => source.revocation_epoch)) : requireEpoch(bindings.revocation_epoch, "AUTHORITY_BINDING_EPOCH_INVALID");
  if (variant === "agent_launch" && normalizedSubject.authority_epoch !== expectedEpoch) return deny("AGENT_LAUNCH_AUTHORITY_EPOCH_MISMATCH", [String(normalizedSubject.authority_epoch), String(expectedEpoch)], basis);
  const wrongEpoch = normalized.filter((source) => source.revocation_epoch !== expectedEpoch).map((source) => source.source_id);
  if (wrongEpoch.length) return deny("REVOCATION_EPOCH_MISMATCH", wrongEpoch, basis);
  const actionDenied = normalized.filter((source) => !source.actions.includes("*") && !source.actions.includes(action)).map((source) => source.source_id);
  if (actionDenied.length) return deny("ACTION_OUTSIDE_INTERSECTION", actionDenied, basis);
  const targetDenied = normalized.filter((source) => source.targets.length > 0 && !source.targets.includes("*") && !source.targets.includes(bindings.target_id)).map((source) => source.source_id);
  if (targetDenied.length) return deny("TARGET_OUTSIDE_INTERSECTION", targetDenied, basis);
  const requiredApprovals = [...new Set(normalized.flatMap((source) => source.required_approvals))].sort();
  const approvalGrants = normalizeApprovalGrants(bindings.approvals, bindings, decisionTime, approvalVerifier);
  const grantedApprovals = new Set(approvalGrants.map((approval) => approval.reason));
  const missingApprovals = requiredApprovals.filter((reason) => !grantedApprovals.has(reason));
  if (missingApprovals.length) return deny("APPROVAL_REQUIRED", missingApprovals, basis);
  const rigor = normalized.reduce((highest, source) => RIGOR_LEVELS[Math.max(RIGOR_LEVELS.indexOf(highest), RIGOR_LEVELS.indexOf(source.rigor_floor))], "L1");
  const resourceKeys = [...new Set(normalized.flatMap((source) => Object.keys(source.resource_ceilings)))].sort();
  const resourceCeilings = Object.fromEntries(resourceKeys.map((key) => [key, Math.min(...normalized.filter((source) => Number.isFinite(source.resource_ceilings[key])).map((source) => source.resource_ceilings[key]))]));
  if (variant === "resource_cost") {
    for (const [key, amount] of Object.entries(normalizedSubject.reservation)) {
      if (!Number.isFinite(amount) || amount < 0) throw new Error(`AUTHORITY_RESOURCE_RESERVATION_INVALID:${key}`);
      if (!Number.isFinite(resourceCeilings[key]) || amount > resourceCeilings[key]) return deny("RESOURCE_CEILING_EXCEEDED", [key], basis);
    }
  }
  const expiry = new Date(Math.min(...normalized.map((source) => Date.parse(source.fresh_until)))).toISOString();
  const decision = {
    schema_version: "1.0.0",
    decision: "ALLOW",
    variant,
    action,
    subject: normalizedSubject,
    target_id: bindings.target_id,
    repository_logical_id: bindings.repository_logical_id,
    checkout_instance_id: bindings.checkout_instance_id,
    parent_instance_id: bindings.parent_instance_id ?? null,
    relationship_id: bindings.relationship_id ?? null,
    task_id: bindings.task_id,
    run_id: bindings.run_id,
    instruction_fingerprint: bindings.instruction_fingerprint,
    policy_fingerprint: bindings.policy_fingerprint,
    settings_revision: bindings.settings_revision,
    approval_fingerprint: fingerprint(approvalGrants),
    runtime_capability_fingerprint: bindings.runtime_capability_fingerprint,
    rigor,
    required_approvals: requiredApprovals,
    resource_ceilings: resourceCeilings,
    duties: uniqueStructured(normalized.flatMap((source) => source.duties)),
    issued_at: decisionTime,
    expires_at: expiry,
    revocation_epoch: expectedEpoch,
    source_fingerprint: fingerprint(basis.sources)
  };
  return { ...decision, fingerprint: fingerprint(decision) };
}

export function isAuthorityDecisionAllowed(decision) {
  return decision?.decision === "ALLOW";
}

function decisionCriticalFingerprint(decision) {
  const { fingerprint: ignoredFingerprint, issued_at: ignoredIssuedAt, ...critical } = decision ?? {};
  return fingerprint(critical);
}

export function effectReceiptBindingFingerprint({ intent, observation }) {
  if (!intent || typeof intent !== "object" || !observation || typeof observation !== "object") throw new Error("RECEIPT_BINDING_INPUT_REQUIRED");
  return fingerprint({
    effect_key: requireString(intent.effect_key, "RECEIPT_EFFECT_KEY_REQUIRED"),
    request_fingerprint: requireString(intent.request_fp ?? intent.request_fingerprint, "RECEIPT_REQUEST_FINGERPRINT_REQUIRED"),
    authority_decision_id: requireString(intent.authority_fp ?? intent.authority_decision_id, "RECEIPT_AUTHORITY_FINGERPRINT_REQUIRED"),
    target_id: requireString(intent.target_id, "RECEIPT_TARGET_ID_REQUIRED"),
    operation: requireString(intent.operation, "RECEIPT_OPERATION_REQUIRED"),
    expected_selector: structuredClone(intent.expected_selector ?? intent.expected_object_selector ?? {}),
    observed_object: requireString(observation.object_identity, "RECEIPT_OBJECT_IDENTITY_REQUIRED"),
    observation_fingerprint: requireString(observation.fingerprint, "RECEIPT_OBSERVATION_FINGERPRINT_REQUIRED")
  });
}

function canonicalizeGatewayEffect(input) {
  const effect = structuredClone(requireObject(input, "EFFECT_REQUIRED"));
  if (!AUTHORITY_VARIANTS.has(effect.variant)) throw new Error("AUTHORITY_VARIANT_INVALID");
  requireString(effect.action, "AUTHORITY_ACTION_REQUIRED");
  requireObject(effect.bindings, "AUTHORITY_BINDINGS_REQUIRED");
  const target = structuredClone(effect.target ?? {});
  const request = structuredClone(effect.request ?? {});
  const expectedSelector = structuredClone(effect.expected_selector ?? {});
  const intentBinding = {
    variant: effect.variant,
    action: effect.action,
    target_id: effect.bindings.target_id,
    target_fingerprint: fingerprint(target),
    request_fingerprint: fingerprint(request),
    expected_selector_fingerprint: fingerprint(expectedSelector)
  };
  return {
    ...effect,
    target,
    request,
    expected_selector: expectedSelector,
    subject: {
      ...(effect.subject ?? {}),
      target_fingerprint: intentBinding.target_fingerprint,
      request_fingerprint: intentBinding.request_fingerprint,
      expected_selector_fingerprint: intentBinding.expected_selector_fingerprint,
      effect_intent_fingerprint: fingerprint(intentBinding)
    },
    effect_key: fingerprint(intentBinding)
  };
}

function canonicalReconciliationVerdict(intent, observation) {
  return reconcileEffect({
    intent: {
      effect_key: intent.effect_key,
      request_fingerprint: intent.request_fp,
      authority_decision_id: intent.authority_fp,
      target_id: intent.target_id,
      operation: intent.operation,
      expected_object_selector: intent.expected_selector
    },
    observation
  });
}

export function createSideEffectGateway({ composer = composeAuthorityDecision, store, sourceProvider, activationProvider, activationVerifier, currentCandidateProvider, reconciliationAuthorizer, adapters, receiptVerifier, approvalVerifier, clock = () => new Date().toISOString(), idFactory = randomUUID }) {
  if (!store || typeof store.commit !== "function" || typeof store.getIntent !== "function" || typeof store.claimEffectDispatch !== "function" || typeof store.assertAuthorityEpoch !== "function") throw new Error("GATEWAY_STORE_REQUIRED");
  if (typeof sourceProvider !== "function") throw new Error("GATEWAY_SOURCE_PROVIDER_REQUIRED");
  if (typeof activationProvider !== "function") throw new Error("GATEWAY_ACTIVATION_PROVIDER_REQUIRED");
  if (typeof activationVerifier !== "function") throw new Error("GATEWAY_ACTIVATION_VERIFIER_REQUIRED");
  if (typeof currentCandidateProvider !== "function") throw new Error("GATEWAY_CURRENT_CANDIDATE_PROVIDER_REQUIRED");
  if (typeof reconciliationAuthorizer !== "function") throw new Error("GATEWAY_RECONCILIATION_AUTHORIZER_REQUIRED");
  if (!adapters || typeof adapters !== "object") throw new Error("GATEWAY_ADAPTERS_REQUIRED");
  if (typeof receiptVerifier !== "function") throw new Error("GATEWAY_INDEPENDENT_RECEIPT_VERIFIER_REQUIRED");

  async function activationSnapshot({ effect, phase }) {
    const activation = await activationProvider({ effect: structuredClone(effect), phase });
    try {
      validateActivationRecord(activation);
    } catch {
      return { allowed: false, decision: deny("NEXT_WORKFLOW_ACTIVATION_INVALID", [activation?.mode ?? "missing"], { phase, activation_mode: activation?.mode ?? "missing" }) };
    }
    const verification = await activationVerifier({ record: structuredClone(activation), phase, record_fingerprint: fingerprint(activation) });
    if (!verification || verification.trusted !== true || verification.record_fingerprint !== fingerprint(activation) || typeof verification.proof_fingerprint !== "string") {
      return { allowed: false, decision: deny("NEXT_WORKFLOW_ACTIVATION_UNTRUSTED", [activation?.mode ?? "missing"], { phase, activation_mode: activation?.mode ?? "missing" }) };
    }
    if (activation.mode !== "enforced") {
      return { allowed: false, decision: deny("NEXT_WORKFLOW_NOT_ENFORCED", [activation?.mode ?? "missing"], { phase, activation_mode: activation?.mode ?? "missing" }) };
    }
    const currentCandidate = await currentCandidateProvider({ activation: structuredClone(activation), effect: structuredClone(effect), phase });
    if (!currentCandidate || !/^[a-f0-9]{64}$/.test(currentCandidate.candidate_fingerprint ?? "") || !/^[a-f0-9]{40,64}$/.test(currentCandidate.repository_head ?? "") || currentCandidate.candidate_fingerprint !== activation.candidate_fingerprint) {
      return { allowed: false, decision: deny("NEXT_WORKFLOW_CANDIDATE_DRIFT", [activation.candidate_fingerprint, currentCandidate?.candidate_fingerprint ?? "missing"], { phase, activation_mode: activation.mode }) };
    }
    const snapshot = { mode: activation.mode, candidate_fingerprint: activation.candidate_fingerprint, repository_head: currentCandidate.repository_head, revision: activation.revision ?? null };
    return { allowed: true, fingerprint: fingerprint(snapshot), snapshot };
  }

  async function observe(effect, adapter) {
    if (typeof adapter.observe !== "function") throw new Error("ADAPTER_OBSERVE_REQUIRED");
    const observation = await adapter.observe({ target: structuredClone(effect.target), action: effect.action });
    if (!observation || typeof observation.fingerprint !== "string") throw new Error("TARGET_OBSERVATION_INVALID");
    return observation;
  }

  async function decide(effect, observation, bindingsSnapshot, phase) {
    const sources = await sourceProvider({ effect: structuredClone(effect), observation: structuredClone(observation), phase });
    return composer({ variant: effect.variant, action: effect.action, subject: { ...effect.subject, observation_fingerprint: observation.fingerprint }, bindings: bindingsSnapshot, sources, approvalVerifier, now: clock() });
  }

  async function preview(effect) {
    const canonicalEffect = canonicalizeGatewayEffect(effect);
    const adapter = adapters[canonicalEffect.variant];
    if (!adapter) throw new Error("ADAPTER_NOT_CONFIGURED");
    const activation = await activationSnapshot({ effect: canonicalEffect, phase: "preview" });
    if (!activation.allowed) return { decision: activation.decision, observation: null, bindings_fingerprint: fingerprint(canonicalEffect.bindings), activation_fingerprint: null, effect: canonicalEffect };
    const bindingsSnapshot = structuredClone(canonicalEffect.bindings);
    const observation = await observe(canonicalEffect, adapter);
    const decision = await decide(canonicalEffect, observation, bindingsSnapshot, "preview");
    return { decision, observation, bindings_fingerprint: fingerprint(bindingsSnapshot), activation_fingerprint: activation.fingerprint, effect: canonicalEffect };
  }

  async function verifyReceipt({ mode, effect, intent, observation, dispatchResult, reconciliationResult, decision }) {
    const proof = await receiptVerifier({ mode, effect, intent, observation: structuredClone(observation), dispatchResult, reconciliationResult });
    if (!proof || proof.verified !== true) throw new Error("RECEIPT_INDEPENDENT_VERIFICATION_FAILED");
    const proofRecordId = requireString(proof.proof_record_id, "RECEIPT_PROOF_RECORD_REQUIRED");
    const owner = requireString(proof.owner, "RECEIPT_PROOF_OWNER_REQUIRED");
    const verifier = requireString(proof.verifier, "RECEIPT_PROOF_VERIFIER_REQUIRED");
    if (owner === verifier) throw new Error("RECEIPT_VERIFIER_NOT_INDEPENDENT");
    if (proof.observation_fingerprint !== observation.fingerprint) throw new Error("RECEIPT_PROOF_BINDING_INVALID");
    const effectIdentityFingerprint = effectReceiptBindingFingerprint({ intent, observation });
    if (proof.effect_identity_fingerprint !== effectIdentityFingerprint) throw new Error("RECEIPT_EFFECT_IDENTITY_BINDING_INVALID");
    requireString(proof.proof_fingerprint, "RECEIPT_PROOF_FINGERPRINT_REQUIRED");
    if (reconciliationResult?.receipt) {
      if (proofRecordId !== reconciliationResult.receipt.proof_record_id
        || reconciliationResult.proof_record?.id !== proofRecordId
        || reconciliationResult.proof_record?.payload?.proof_fingerprint !== proof.proof_fingerprint
        || reconciliationResult.proof_record?.payload?.effect_identity_fingerprint !== effectIdentityFingerprint) throw new Error("RECEIPT_STORED_PROOF_BINDING_INVALID");
    }
    const effectId = intent?.effect_id ?? effect?.effect_id;
    return {
      proof_record_id: proofRecordId,
      record: {
        id: proofRecordId,
        kind: "EffectReceiptProof",
        schema_version: "1.0.0",
        record_revision: 1,
        authority_scope: intent?.target_id ?? effect.bindings.target_id,
        lineage_id: effectId,
        lifecycle_state: "verified",
        payload: { effect_id: effectId, owner, verifier, observation_fingerprint: observation.fingerprint, effect_identity_fingerprint: effectIdentityFingerprint, proof_fingerprint: proof.proof_fingerprint, verification_mode: mode },
        source_revision: "independent-receipt-verifier",
        policy_fp: decision?.fingerprint ?? intent.authority_fp,
        input_fp: proof.proof_fingerprint
      }
    };
  }

  async function execute(effect) {
    const first = await preview(effect);
    if (!isAuthorityDecisionAllowed(first.decision)) {
      const error = new Error(`SIDE_EFFECT_DENIED:${first.decision.code}`);
      error.decision = first.decision;
      throw error;
    }
    const canonicalEffect = first.effect;
    const adapter = adapters[canonicalEffect.variant];
    const currentActivation = await activationSnapshot({ effect: canonicalEffect, phase: "pre_dispatch" });
    if (!currentActivation.allowed) throw new Error(`SIDE_EFFECT_ACTIVATION_BLOCKED:${currentActivation.decision.code}`);
    if (currentActivation.fingerprint !== first.activation_fingerprint) throw new Error("ACTIVATION_CHANGED_BEFORE_DISPATCH");
    const secondObservation = await observe(canonicalEffect, adapter);
    if (secondObservation.fingerprint !== first.observation.fingerprint) throw new Error("TARGET_CHANGED_BEFORE_DISPATCH");
    const secondBindings = structuredClone(canonicalEffect.bindings);
    if (fingerprint(secondBindings) !== first.bindings_fingerprint) throw new Error("AUTHORITY_BINDINGS_CHANGED_BEFORE_DISPATCH");
    const secondDecision = await decide(canonicalEffect, secondObservation, secondBindings, "pre_dispatch");
    if (!isAuthorityDecisionAllowed(secondDecision)) {
      const error = new Error(`SIDE_EFFECT_REVALIDATION_DENIED:${secondDecision.code}`);
      error.decision = secondDecision;
      throw error;
    }
    if (decisionCriticalFingerprint(secondDecision) !== decisionCriticalFingerprint(first.decision)) throw new Error("AUTHORITY_CHANGED_BEFORE_DISPATCH");
    const effectId = canonicalEffect.effect_id ?? `effect-${idFactory()}`;
    const effectKey = canonicalEffect.effect_key;
    const messageFingerprint = fingerprint({ effect_id: effectId, effect_key: effectKey, decision: secondDecision.fingerprint, request: canonicalEffect.request });
    store.commit({
      expectedRevision: store.revision,
      authorityEpoch: secondDecision.revocation_epoch,
      effectIntent: {
        effect_id: effectId,
        effect_key: effectKey,
        request_fp: fingerprint(canonicalEffect.request),
        authority_fp: secondDecision.fingerprint,
        target_id: canonicalEffect.bindings.target_id,
        operation: `${canonicalEffect.variant}:${canonicalEffect.action}`,
        expected_selector: canonicalEffect.expected_selector,
        attempt_lineage: canonicalEffect.attempt_lineage ?? effectId,
        state: "PREPARED"
      },
      outboxItem: { outbox_id: `outbox-${effectId}`, intent_id: effectId, message_fp: messageFingerprint, sequence: effect.sequence ?? 1, state: "pending" }
    });
    const outboxId = `outbox-${effectId}`;
    store.claimEffectDispatch({ effectId, outboxId, authorityEpoch: secondDecision.revocation_epoch });
    try {
      store.assertAuthorityEpoch({ authorityEpoch: secondDecision.revocation_epoch });
    } catch (error) {
      store.transitionIntent({ effectId, expectedState: "DISPATCHING", nextState: "MANUAL_RECOVERY_REQUIRED" });
      store.transitionOutbox({ outboxId, expectedState: "sending", nextState: "quarantined" });
      throw new Error(`SIDE_EFFECT_AUTHORITY_EPOCH_STALE_BEFORE_DISPATCH:${error.message}`);
    }
    let dispatchResult;
    try {
      dispatchResult = await adapter.dispatch({ effect: structuredClone(canonicalEffect), decision: structuredClone(secondDecision), observation: structuredClone(secondObservation), effect_id: effectId, effect_key: effectKey, authority_epoch: secondDecision.revocation_epoch, fencing_token: fingerprint({ effect_id: effectId, authority_fingerprint: secondDecision.fingerprint, authority_epoch: secondDecision.revocation_epoch }) });
    } catch (error) {
      store.transitionIntent({ effectId, expectedState: "DISPATCHING", nextState: "UNKNOWN" });
      const wrapped = new Error(`SIDE_EFFECT_OUTCOME_UNKNOWN:${error.message}`);
      wrapped.effect_id = effectId;
      throw wrapped;
    }
    const finalObservation = await observe(canonicalEffect, adapter);
    if (typeof adapter.matches !== "function" || adapter.matches({ expected: structuredClone(canonicalEffect.expected_selector), dispatchResult, observation: finalObservation }) !== true) {
      store.transitionIntent({ effectId, expectedState: "DISPATCHING", nextState: "CONFLICT" });
      throw new Error("SIDE_EFFECT_OBSERVATION_CONFLICT");
    }
    const persistedIntent = store.getIntent(effectId);
    const reconciliation = canonicalReconciliationVerdict(persistedIntent, finalObservation);
    if (reconciliation.decision !== "PASS") {
      store.transitionIntent({ effectId, expectedState: "DISPATCHING", nextState: reconciliation.state });
      throw new Error(`SIDE_EFFECT_RECONCILIATION_${reconciliation.code}`);
    }
    const verified = await verifyReceipt({ mode: "dispatch", effect: { ...canonicalEffect, effect_id: effectId }, intent: persistedIntent, observation: finalObservation, dispatchResult, decision: secondDecision });
    store.transitionIntent({ effectId, expectedState: "DISPATCHING", nextState: "OBSERVED" });
    store.finalizeReconciliation({
      expectedRevision: store.revision,
      effectId,
      records: [verified.record],
      receipt: { receipt_id: `receipt-${effectId}`, intent_id: effectId, object_identity: finalObservation.object_identity ?? canonicalEffect.bindings.target_id, observation_fp: finalObservation.fingerprint, proof_record_id: verified.proof_record_id, result: "matched" },
      events: [{ event_id: `event-${effectId}`, event_type: "SIDE_EFFECT_RECONCILED", payload: { effect_id: effectId, effect_key: effectKey, authority_fingerprint: secondDecision.fingerprint, proof_record_id: verified.proof_record_id } }]
    });
    return { effect_id: effectId, effect_key: effectKey, decision: secondDecision, receipt_id: `receipt-${effectId}`, proof_record_id: verified.proof_record_id, result: dispatchResult };
  }

  async function reconcile(effectId) {
    const intent = store.getIntent(effectId);
    if (!intent) throw new Error("EFFECT_INTENT_NOT_FOUND");
    const [variant, action] = intent.operation.split(":");
    const adapter = adapters[variant];
    if (!adapter || typeof adapter.reconcile !== "function") throw new Error("ADAPTER_RECONCILE_REQUIRED");
    if (intent.state === "RECONCILED") {
      const receipt = store.getReceipt(effectId);
      const proofRecord = receipt ? store.get({ id: receipt.proof_record_id }) : undefined;
      const observation = receipt ? { fingerprint: receipt.observation_fp, object_identity: receipt.object_identity } : undefined;
      if (!receipt || !proofRecord) throw new Error("RECONCILED_RECEIPT_PROOF_MISSING");
      await verifyReceipt({ mode: "stored_reconcile", intent, observation, reconciliationResult: { receipt, proof_record: proofRecord } });
      return { effect_id: effectId, state: "RECONCILED", reused: true, proof_record_id: receipt.proof_record_id };
    }
    const reconcileEffect = { variant, action, target: { target_id: intent.target_id }, request: { effect_id: effectId }, expected_selector: intent.expected_selector, bindings: { target_id: intent.target_id } };
    const activation = await activationSnapshot({ effect: reconcileEffect, phase: "reconcile" });
    if (!activation.allowed) throw new Error(`RECONCILIATION_ACTIVATION_BLOCKED:${activation.decision.code}`);
    async function currentAuthorization(phase) {
      const authorization = await reconciliationAuthorizer({ intent: structuredClone(intent), phase, now: clock() });
      if (!authorization || authorization.decision !== "ALLOW" || authorization.original_authority_fingerprint !== intent.authority_fp || authorization.target_id !== intent.target_id || authorization.operation !== intent.operation || !Number.isSafeInteger(authorization.current_revocation_epoch) || authorization.current_revocation_epoch < 0 || !Number.isFinite(Date.parse(authorization.fresh_until)) || Date.parse(authorization.fresh_until) < Date.parse(clock()) || typeof authorization.proof_fingerprint !== "string") throw new Error("RECONCILIATION_AUTHORITY_DENIED");
      return fingerprint(authorization);
    }
    const firstAuthorization = await currentAuthorization("before_observation");
    const result = await adapter.reconcile(intent);
    if (result.state === "matched") {
      const secondActivation = await activationSnapshot({ effect: reconcileEffect, phase: "reconcile_finalize" });
      if (!secondActivation.allowed || secondActivation.fingerprint !== activation.fingerprint) throw new Error("RECONCILIATION_ACTIVATION_CHANGED");
      if (await currentAuthorization("before_finalize") !== firstAuthorization) throw new Error("RECONCILIATION_AUTHORITY_CHANGED");
      const reconciliation = canonicalReconciliationVerdict(intent, result);
      if (reconciliation.decision !== "PASS") {
        const expectedState = intent.state;
        const nextState = reconciliation.state === "CONFLICT" && expectedState !== "PREPARED" ? "CONFLICT" : "MANUAL_RECOVERY_REQUIRED";
        if (expectedState !== nextState) store.transitionIntent({ effectId, expectedState, nextState, recovery: true });
        return { effect_id: effectId, state: nextState, code: reconciliation.code };
      }
      const observation = { fingerprint: requireString(result.observation_fingerprint, "RECONCILE_OBSERVATION_FINGERPRINT_REQUIRED"), object_identity: requireString(result.object_identity, "RECONCILE_OBJECT_IDENTITY_REQUIRED") };
      const verified = await verifyReceipt({ mode: "reconcile", intent, observation, reconciliationResult: result });
      if (intent.state === "PREPARED") store.transitionIntent({ effectId, expectedState: "PREPARED", nextState: "UNKNOWN", recovery: true });
      const observedFrom = intent.state === "PREPARED" ? "UNKNOWN" : intent.state;
      if (["UNKNOWN", "CONFLICT", "DISPATCHING", "MANUAL_RECOVERY_REQUIRED"].includes(observedFrom)) store.transitionIntent({ effectId, expectedState: observedFrom, nextState: "OBSERVED", recovery: true });
      store.finalizeReconciliation({ expectedRevision: store.revision, effectId, recovery: true, records: [verified.record], receipt: { receipt_id: `receipt-${effectId}`, intent_id: effectId, object_identity: result.object_identity, observation_fp: result.observation_fingerprint, proof_record_id: verified.proof_record_id, result: "reconstructed" } });
      return { effect_id: effectId, state: "RECONCILED", reconstructed: true, proof_record_id: verified.proof_record_id };
    }
    const next = result.state === "conflict" ? "CONFLICT" : "MANUAL_RECOVERY_REQUIRED";
    if (intent.state !== next) {
      const safeNext = intent.state === "PREPARED" ? "MANUAL_RECOVERY_REQUIRED" : next;
      store.transitionIntent({ effectId, expectedState: intent.state, nextState: safeNext, recovery: true });
      return { effect_id: effectId, state: safeNext };
    }
    return { effect_id: effectId, state: next };
  }

  return {
    preview,
    execute,
    reconcile,
    fence({ scope, reason, expectedEpoch }) {
      requireString(scope, "FENCE_SCOPE_REQUIRED");
      return store.fence({ reason: `${scope}:${reason}`, expectedEpoch });
    }
  };
}

export function authorityFingerprint(value) {
  return fingerprint(value);
}
