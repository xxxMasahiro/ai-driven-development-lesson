import { createHash } from "node:crypto";
import { existsSync, lstatSync, readFileSync, realpathSync, statSync } from "node:fs";
import { userInfo } from "node:os";
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path";

const PROTECTED_TRUST_SNAPSHOTS = new WeakSet();
const PROTECTED_RUNTIME_VERIFIERS = new WeakMap();

function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}

function canonicalJson(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(",")}}`;
  return JSON.stringify(value);
}

function digest(value) {
  return createHash("sha256").update(typeof value === "string" ? value : canonicalJson(value)).digest("hex");
}

function isWithin(root, candidate) {
  const rel = relative(root, candidate);
  return rel === "" || (rel !== ".." && !rel.startsWith(`..${sep}`) && !isAbsolute(rel));
}

function requireExactKeys(value, keys, code) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(code);
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  if (actual.length !== expected.length || actual.some((key, index) => key !== expected[index])) throw new Error(code);
}

function requireTimestamp(value, code) {
  if (typeof value !== "string" || !Number.isFinite(Date.parse(value))) throw new Error(code);
  return value;
}

function assertProtectedPath({ repositoryRoot, trustPath, expectedUid = process.getuid?.() }) {
  if (!isAbsolute(trustPath)) throw new Error("OWNER_TRUST_PATH_ABSOLUTE_REQUIRED");
  const repository = realpathSync(repositoryRoot);
  const candidate = resolve(trustPath);
  if (isWithin(repository, candidate)) throw new Error("OWNER_TRUST_INSIDE_CANDIDATE_FORBIDDEN");
  if (!existsSync(candidate)) throw new Error("OWNER_TRUST_FILE_MISSING");
  if (lstatSync(candidate).isSymbolicLink()) throw new Error("OWNER_TRUST_SYMLINK_FORBIDDEN");
  const real = realpathSync(candidate);
  if (real !== candidate) throw new Error("OWNER_TRUST_CANONICAL_PATH_REQUIRED");
  const stats = statSync(real);
  if (!stats.isFile()) throw new Error("OWNER_TRUST_FILE_REQUIRED");
  if (expectedUid !== undefined && stats.uid !== expectedUid) throw new Error("OWNER_TRUST_OWNER_INVALID");
  if ((stats.mode & 0o077) !== 0) throw new Error("OWNER_TRUST_MODE_INVALID");
  const parent = dirname(real);
  const parentLstat = lstatSync(parent);
  const parentStats = statSync(parent);
  if (parentLstat.isSymbolicLink()) throw new Error("OWNER_TRUST_PARENT_SYMLINK_FORBIDDEN");
  if (expectedUid !== undefined && parentStats.uid !== expectedUid) throw new Error("OWNER_TRUST_PARENT_OWNER_INVALID");
  if ((parentStats.mode & 0o077) !== 0) throw new Error("OWNER_TRUST_PARENT_MODE_INVALID");
  return real;
}

export function defaultOwnerTrustPath() {
  return join(userInfo().homedir, ".config", "ai-driven-development-lesson", "next-workflow", "owner-trust.json");
}

export function loadProtectedRuntimeTrust({
  repositoryRoot,
  repositoryLogicalId,
  checkoutInstanceId,
  trustPath = defaultOwnerTrustPath(),
  now = new Date().toISOString(),
  expectedUid = process.getuid?.(),
} = {}) {
  if (typeof repositoryRoot !== "string" || typeof repositoryLogicalId !== "string" || typeof checkoutInstanceId !== "string") throw new Error("OWNER_TRUST_BINDING_REQUIRED");
  const canonicalPath = assertProtectedPath({ repositoryRoot, trustPath, expectedUid });
  let document;
  try {
    document = JSON.parse(readFileSync(canonicalPath, "utf8"));
  } catch (error) {
    throw new Error(`OWNER_TRUST_DOCUMENT_INVALID:${error.message}`);
  }
  requireExactKeys(document, ["schema_version", "trust_source_id", "revision", "repository_logical_id", "checkout_instance_id", "issued_at", "expires_at", "release_trust", "release_prerequisites", "runtime_authorities"], "OWNER_TRUST_SCHEMA_INVALID");
  if (document.schema_version !== "1.0.0" || typeof document.trust_source_id !== "string" || document.trust_source_id.length === 0 || !Number.isSafeInteger(document.revision) || document.revision < 1) throw new Error("OWNER_TRUST_IDENTITY_INVALID");
  if (document.repository_logical_id !== repositoryLogicalId || document.checkout_instance_id !== checkoutInstanceId) throw new Error("OWNER_TRUST_REPOSITORY_BINDING_INVALID");
  requireTimestamp(document.issued_at, "OWNER_TRUST_ISSUED_AT_INVALID");
  requireTimestamp(document.expires_at, "OWNER_TRUST_EXPIRY_INVALID");
  if (Date.parse(document.issued_at) > Date.parse(now) || Date.parse(document.expires_at) < Date.parse(now)) throw new Error("OWNER_TRUST_NOT_CURRENT");
  if (!document.release_trust || typeof document.release_trust !== "object" || !document.release_prerequisites || typeof document.release_prerequisites !== "object" || !document.runtime_authorities || typeof document.runtime_authorities !== "object") throw new Error("OWNER_TRUST_AUTHORITIES_INVALID");
  const core = deepFreeze(structuredClone(document));
  const canonicalRepositoryRoot = realpathSync(repositoryRoot);
  const protectedSourceDirectory = dirname(canonicalPath);
  const snapshot = Object.freeze({
    document: core,
    release_trust: core.release_trust,
    release_prerequisites: core.release_prerequisites,
    runtime_authorities: core.runtime_authorities,
    repository_root: canonicalRepositoryRoot,
    source_path: canonicalPath,
    source_directory: protectedSourceDirectory,
    fingerprint: digest({ document: core, repository_root: canonicalRepositoryRoot, source_path: canonicalPath, source_directory: protectedSourceDirectory }),
  });
  PROTECTED_TRUST_SNAPSHOTS.add(snapshot);
  return snapshot;
}

function brandRuntimeVerifier(verifier, kind, runtimeTrust, authority) {
  PROTECTED_RUNTIME_VERIFIERS.set(verifier, Object.freeze({
    kind,
    trust_fingerprint: runtimeTrust.fingerprint,
    fingerprint: digest({ kind, trust_fingerprint: runtimeTrust.fingerprint, authority }),
  }));
  return verifier;
}

function runtimeAuthority(snapshot, authorityId, kind) {
  if (!PROTECTED_TRUST_SNAPSHOTS.has(snapshot)) throw new Error("PROTECTED_RUNTIME_TRUST_REQUIRED");
  if (typeof authorityId !== "string" || authorityId.length === 0) throw new Error("RUNTIME_AUTHORITY_ID_REQUIRED");
  const authority = snapshot.runtime_authorities?.[authorityId];
  if (!authority || authority.authority_id !== authorityId || authority.kind !== kind || authority.enabled !== true) throw new Error(`RUNTIME_AUTHORITY_NOT_AUTHORIZED:${authorityId}`);
  return structuredClone(authority);
}

export function createProtectedLaunchObservationVerifier({ runtimeTrust, authorityId } = {}) {
  const authority = runtimeAuthority(runtimeTrust, authorityId, "launch_observation");
  if (!Array.isArray(authority.allowed_executable_fingerprints) || authority.allowed_executable_fingerprints.some((value) => !/^[a-f0-9]{64}$/.test(value)) || !Array.isArray(authority.allowed_manifest_fingerprints) || authority.allowed_manifest_fingerprints.some((value) => !/^[a-f0-9]{64}$/.test(value)) || authority.source !== "pinned_process_and_certified_provider_metadata") throw new Error("LAUNCH_OBSERVATION_AUTHORITY_INVALID");
  const verifier = Object.freeze({
    verifier_id: authorityId,
    observe({ plan, process_evidence: processEvidence, fingerprint }) {
      if (!processEvidence || processEvidence.verified !== true || processEvidence.contained !== true || !/^[a-f0-9]{64}$/.test(processEvidence.process_identity_fingerprint ?? "") || !Array.isArray(processEvidence.argv)) throw new Error("RUN_LIFECYCLE_PROCESS_EVIDENCE_REQUIRED");
      if (!authority.allowed_executable_fingerprints.includes(plan.executable_fingerprint) || !authority.allowed_manifest_fingerprints.includes(plan.manifest_fingerprint)) throw new Error("RUN_LIFECYCLE_OBSERVATION_SOURCE_UNAUTHORIZED");
      for (const expected of [plan.selected_model, plan.selected_effort]) if (!processEvidence.argv.includes(expected)) throw new Error("RUN_LIFECYCLE_SELECTED_ARGUMENT_NOT_OBSERVED");
      const observed = { provider: plan.selected_provider, model: plan.selected_model, effort: plan.selected_effort };
      const proofFingerprint = digest({ authority_id: authorityId, authority_revision: authority.revision, observed, process_evidence_fingerprint: processEvidence.fingerprint, plan_fingerprint: plan.plan_fingerprint, fingerprint });
      return { verified: true, verifier_id: authorityId, fingerprint, proof_fingerprint: proofFingerprint, actual_provider: observed.provider, actual_model: observed.model, actual_effort: observed.effort, observation_scope: "pinned_cli_launch_configuration" };
    },
  });
  return brandRuntimeVerifier(verifier, "launch_observation", runtimeTrust, authority);
}

export function assertProtectedRuntimeVerifier(verifier, expectedKind = "launch_observation") {
  if (PROTECTED_RUNTIME_VERIFIERS.get(verifier)?.kind !== expectedKind) throw new Error("PROTECTED_RUNTIME_VERIFIER_REQUIRED");
  if (expectedKind === "launch_observation" && typeof verifier.observe !== "function") throw new Error("PROTECTED_LAUNCH_OBSERVER_REQUIRED");
  return verifier;
}

export function protectedRuntimeVerifierFingerprint(verifier, expectedKind) {
  assertProtectedRuntimeVerifier(verifier, expectedKind);
  return PROTECTED_RUNTIME_VERIFIERS.get(verifier).fingerprint;
}

export function protectedRuntimeVerifierTrustFingerprint(verifier, expectedKind) {
  assertProtectedRuntimeVerifier(verifier, expectedKind);
  return PROTECTED_RUNTIME_VERIFIERS.get(verifier).trust_fingerprint;
}

export function createProtectedIsolatedAuthorityVerifier({ runtimeTrust, authorityId } = {}) {
  const authority = runtimeAuthority(runtimeTrust, authorityId, "isolated_authority");
  if (authority.source !== "owner_protected_isolated_profile" || authority.profile_id !== "isolated_verification" || !Number.isSafeInteger(authority.revision) || authority.revision < 1 || !Array.isArray(authority.allowed_candidate_fingerprints) || authority.allowed_candidate_fingerprints.some((value) => !/^[a-f0-9]{64}$/.test(value))) throw new Error("ISOLATED_AUTHORITY_CONFIGURATION_INVALID");
  const verifier = Object.freeze({
    trusted: true,
    independent: true,
    verifier_id: authorityId,
    verify({ authority: candidate, authority_fingerprint: authorityFingerprint, guard_fingerprint: guardFingerprint, phase, now }) {
      const verified = candidate?.authority_id === authorityId
        && candidate?.profile === authority.profile_id
        && candidate?.repository_logical_id === runtimeTrust.document.repository_logical_id
        && candidate?.checkout_instance_id === runtimeTrust.document.checkout_instance_id
        && candidate?.authority_epoch >= 0
        && candidate?.production_authority === false
        && candidate?.activation_transition_allowed === false
        && authority.allowed_candidate_fingerprints.includes(candidate?.candidate_fingerprint)
        && Number.isFinite(Date.parse(candidate?.fresh_until))
        && Date.parse(candidate.fresh_until) >= Date.parse(now);
      return { verified, verifier_id: authorityId, authority_fingerprint: authorityFingerprint, guard_fingerprint: guardFingerprint, proof_fingerprint: digest({ authority_id: authorityId, authority_revision: authority.revision, authority_fingerprint: authorityFingerprint, guard_fingerprint: guardFingerprint, phase }) };
    },
  });
  return brandRuntimeVerifier(verifier, "isolated_authority", runtimeTrust, authority);
}

export function createProtectedAgentAuthorityVerifier({ runtimeTrust, authorityId } = {}) {
  const authority = runtimeAuthority(runtimeTrust, authorityId, "agent_authority");
  if (authority.source !== "owner_protected_agent_authority" || !Number.isSafeInteger(authority.revision) || authority.revision < 1 || !Array.isArray(authority.allowed_record_kinds) || authority.allowed_record_kinds.length === 0 || authority.allowed_record_kinds.some((value) => typeof value !== "string" || value.length === 0)) throw new Error("AGENT_AUTHORITY_CONFIGURATION_INVALID");
  const allowedRecordKinds = new Set(authority.allowed_record_kinds);
  const verifier = Object.freeze({
    trusted: true,
    independent: true,
    authority_id: authorityId,
    verify({ record, fingerprint, locked_revision: lockedRevision }) {
      const verified = allowedRecordKinds.has(record?.kind) && Number.isSafeInteger(lockedRevision) && lockedRevision >= 0;
      return { verified, authority_id: authorityId, fingerprint, proof_fingerprint: digest({ authority_id: authorityId, authority_revision: authority.revision, record_kind: record?.kind, record_id: record?.id, fingerprint, locked_revision: lockedRevision }) };
    },
  });
  return brandRuntimeVerifier(verifier, "agent_authority", runtimeTrust, authority);
}

function receiptBindingFingerprint(intent, observation) {
  return digest({ effect_key: intent.effect_key, request_fingerprint: intent.request_fp ?? intent.request_fingerprint, authority_decision_id: intent.authority_fp ?? intent.authority_decision_id, target_id: intent.target_id, operation: intent.operation, expected_selector: structuredClone(intent.expected_selector ?? intent.expected_object_selector ?? {}), observed_object: observation.object_identity, observation_fingerprint: observation.fingerprint });
}

export function createProtectedReceiptAuthority({ runtimeTrust, authorityId } = {}) {
  const authority = runtimeAuthority(runtimeTrust, authorityId, "receipt_proof");
  if (authority.source !== "owner_protected_deterministic_binding" || !Number.isSafeInteger(authority.revision) || authority.revision < 1 || typeof authority.owner_id !== "string" || authority.owner_id.length === 0 || authority.owner_id === authorityId) throw new Error("RECEIPT_AUTHORITY_CONFIGURATION_INVALID");
  const proofFor = ({ intent, observation, effectIdentityFingerprint }) => digest({ authority_id: authorityId, authority_revision: authority.revision, effect_id: intent.effect_id, request_fingerprint: intent.request_fp, observation_fingerprint: observation.fingerprint, effect_identity_fingerprint: effectIdentityFingerprint });
  const issuer = Object.freeze(async ({ intent, observation }) => {
    const effectIdentityFingerprint = receiptBindingFingerprint(intent, observation);
    const proofFingerprint = proofFor({ intent, observation, effectIdentityFingerprint });
    return { verified: true, proof_record_id: `proof-${digest({ effect_id: intent.effect_id, proof_fingerprint: proofFingerprint })}`, owner: authority.owner_id, verifier: authorityId, observation_fingerprint: observation.fingerprint, effect_identity_fingerprint: effectIdentityFingerprint, proof_fingerprint: proofFingerprint };
  });
  const verifier = Object.freeze({
    trusted: true,
    independent: true,
    verifier_id: authorityId,
    verify({ intent, proof_record: proofRecord, effect_identity_fingerprint: effectIdentityFingerprint, fingerprint }) {
      const expected = proofFor({ intent, observation: { fingerprint: proofRecord?.payload?.observation_fingerprint }, effectIdentityFingerprint });
      const verified = proofRecord?.payload?.verifier === authorityId && proofRecord?.payload?.owner === authority.owner_id && proofRecord?.payload?.effect_identity_fingerprint === effectIdentityFingerprint && proofRecord?.payload?.proof_fingerprint === expected;
      return { verified, verifier_id: authorityId, fingerprint, proof_fingerprint: expected };
    },
  });
  brandRuntimeVerifier(issuer, "receipt_issuer", runtimeTrust, authority);
  brandRuntimeVerifier(verifier, "receipt_proof", runtimeTrust, authority);
  return Object.freeze({ issuer, verifier });
}

export function createProtectedApprovalAuthority({ runtimeTrust, authorityId } = {}) {
  const authority = runtimeAuthority(runtimeTrust, authorityId, "approval_issuer");
  if (authority.source !== "owner_protected_approval_binding" || !Number.isSafeInteger(authority.revision) || authority.revision < 1) throw new Error("APPROVAL_AUTHORITY_CONFIGURATION_INVALID");
  const proofFor = (bindingFingerprint) => digest({ authority_id: authorityId, authority_revision: authority.revision, binding_fingerprint: bindingFingerprint });
  const issue = Object.freeze((approvalCore) => {
    const bindingFingerprint = digest(approvalCore);
    return Object.freeze({ ...structuredClone(approvalCore), proof_fingerprint: proofFor(bindingFingerprint) });
  });
  const verifier = Object.freeze({
    trusted: true,
    independent: true,
    verifier_id: authorityId,
    verify({ approval, binding_fingerprint: bindingFingerprint, fingerprint }) {
      const proofFingerprint = proofFor(bindingFingerprint);
      return { verified: approval?.proof_fingerprint === proofFingerprint, verifier_id: authorityId, fingerprint, binding_fingerprint: bindingFingerprint, proof_fingerprint: proofFingerprint };
    },
  });
  brandRuntimeVerifier(issue, "approval_issuer", runtimeTrust, authority);
  brandRuntimeVerifier(verifier, "approval_issuer", runtimeTrust, authority);
  return Object.freeze({ issue, verifier });
}

export function createProtectedFinalizationFenceVerifier({ runtimeTrust, authorityId, activationFingerprintProvider, policyRevisionProvider, settingsRevisionProvider, authorityEpochProvider } = {}) {
  const authority = runtimeAuthority(runtimeTrust, authorityId, "finalization_fence");
  if (authority.source !== "owner_protected_live_fence" || !Number.isSafeInteger(authority.revision) || authority.revision < 1) throw new Error("FINALIZATION_FENCE_AUTHORITY_INVALID");
  const verifier = createFinalizationFenceVerifier({ verifierId: authorityId, activationFingerprintProvider, policyRevisionProvider, settingsRevisionProvider, authorityEpochProvider });
  return brandRuntimeVerifier(verifier, "finalization_fence", runtimeTrust, authority);
}

export function protectedRuntimeAuthority(runtimeTrust, authorityId, kind) {
  return runtimeAuthority(runtimeTrust, authorityId, kind);
}

export function runtimeTrustDigest(value) {
  return digest(value);
}

export function createFinalizationFenceVerifier({ verifierId, activationFingerprintProvider, policyRevisionProvider, settingsRevisionProvider, authorityEpochProvider } = {}) {
  if (typeof verifierId !== "string" || verifierId.length === 0 || ![activationFingerprintProvider, policyRevisionProvider, settingsRevisionProvider, authorityEpochProvider].every((provider) => typeof provider === "function")) throw new Error("FINALIZATION_FENCE_VERIFIER_CONFIGURATION_INVALID");
  return Object.freeze({
    trusted: true,
    independent: true,
    verifier_id: verifierId,
    verify({ intent, finalization_fence: fence, fingerprint }) {
      const activationFingerprint = activationFingerprintProvider({ intent: structuredClone(intent) });
      const policyRevision = policyRevisionProvider({ intent: structuredClone(intent) });
      const settingsRevision = settingsRevisionProvider({ intent: structuredClone(intent) });
      const authorityEpoch = authorityEpochProvider({ intent: structuredClone(intent) });
      const verified = activationFingerprint === fence.activation_fingerprint
        && policyRevision === fence.policy_revision
        && settingsRevision === fence.settings_revision
        && authorityEpoch === fence.authority_epoch;
      return { verified, verifier_id: verifierId, fingerprint, activation_fingerprint: activationFingerprint, policy_revision: policyRevision, settings_revision: settingsRevision, authority_epoch: authorityEpoch };
    },
  });
}
