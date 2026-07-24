import { createHash, createPublicKey, verify } from "node:crypto";
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
  return createHash("sha256").update(Buffer.isBuffer(value) ? value : typeof value === "string" ? value : canonicalJson(value)).digest("hex");
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

export function defaultOwnerAnchorPath() {
  return join(userInfo().homedir, ".config", "ai-driven-development-lesson", "next-workflow", "owner-anchor.json");
}

export function loadProtectedOwnerAnchor({
  repositoryRoot,
  anchorPath = defaultOwnerAnchorPath(),
  expectedUid = process.getuid?.(),
} = {}) {
  const canonicalPath = assertProtectedPath({ repositoryRoot, trustPath: anchorPath, expectedUid });
  let document;
  try {
    document = JSON.parse(readFileSync(canonicalPath, "utf8"));
  } catch (error) {
    throw new Error(`OWNER_ANCHOR_DOCUMENT_INVALID:${error.message}`);
  }
  const { fingerprint, ...body } = document ?? {};
  requireExactKeys(body, ["schema_version", "purpose", "revision", "owner_key_id", "owner_public_key_pem", "created_at"], "OWNER_ANCHOR_SCHEMA_INVALID");
  if (body.schema_version !== "1.0.0"
    || body.purpose !== "next-workflow-owner-anchor"
    || body.revision !== 1
    || typeof body.owner_key_id !== "string"
    || !Number.isFinite(Date.parse(body.created_at))
    || fingerprint !== digest(body)) throw new Error("OWNER_ANCHOR_DOCUMENT_INVALID");
  let publicKey;
  try { publicKey = createPublicKey(body.owner_public_key_pem); } catch { throw new Error("OWNER_ANCHOR_PUBLIC_KEY_INVALID"); }
  if (publicKey.asymmetricKeyType !== "ed25519" || body.owner_key_id !== `headless-owner-${digest(body.owner_public_key_pem).slice(0, 24)}`) throw new Error("OWNER_ANCHOR_PUBLIC_KEY_INVALID");
  return deepFreeze({
    ...structuredClone(document),
    source_path: canonicalPath,
  });
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
  const productionOwnerTrust = document?.trust_source_id === "headless-runtime-owner-trust";
  requireExactKeys(document, ["schema_version", "trust_source_id", "revision", "repository_logical_id", "checkout_instance_id", "issued_at", "expires_at", "release_trust", "release_prerequisites", ...(productionOwnerTrust ? ["owner_acceptance", "owner_anchor", "production_state", "repository_identity", "runtime_launcher"] : []), "runtime_authorities"], "OWNER_TRUST_SCHEMA_INVALID");
  if (document.schema_version !== "1.0.0" || typeof document.trust_source_id !== "string" || document.trust_source_id.length === 0 || !Number.isSafeInteger(document.revision) || document.revision < 1) throw new Error("OWNER_TRUST_IDENTITY_INVALID");
  if (document.repository_logical_id !== repositoryLogicalId || document.checkout_instance_id !== checkoutInstanceId) throw new Error("OWNER_TRUST_REPOSITORY_BINDING_INVALID");
  requireTimestamp(document.issued_at, "OWNER_TRUST_ISSUED_AT_INVALID");
  requireTimestamp(document.expires_at, "OWNER_TRUST_EXPIRY_INVALID");
  if (Date.parse(document.issued_at) > Date.parse(now) || Date.parse(document.expires_at) < Date.parse(now)) throw new Error("OWNER_TRUST_NOT_CURRENT");
  if (!document.release_trust || typeof document.release_trust !== "object" || !document.release_prerequisites || typeof document.release_prerequisites !== "object" || !document.runtime_authorities || typeof document.runtime_authorities !== "object") throw new Error("OWNER_TRUST_AUTHORITIES_INVALID");
  if (productionOwnerTrust) {
    requireExactKeys(document.repository_identity, ["repository_logical_id", "checkout_instance_id", "origin_digest", "checkout_anchor_digest", "config_digest", "attested_at"], "OWNER_TRUST_REPOSITORY_IDENTITY_INVALID");
    if (document.repository_identity.repository_logical_id !== repositoryLogicalId
      || document.repository_identity.checkout_instance_id !== checkoutInstanceId
      || ["origin_digest", "checkout_anchor_digest", "config_digest"].some((field) => !/^[a-f0-9]{64}$/u.test(document.repository_identity[field] ?? ""))
      || !Number.isFinite(Date.parse(document.repository_identity.attested_at))) throw new Error("OWNER_TRUST_REPOSITORY_IDENTITY_INVALID");
    requireExactKeys(document.production_state, ["generation_id", "database_relative_path"], "OWNER_TRUST_PRODUCTION_STATE_INVALID");
    if (typeof document.production_state.generation_id !== "string" || !/^[0-9a-f-]{36}$/u.test(document.production_state.generation_id) || document.production_state.database_relative_path !== `.workflow-state/headless-production-${checkoutInstanceId}.sqlite`) throw new Error("OWNER_TRUST_PRODUCTION_STATE_INVALID");
    requireExactKeys(document.runtime_launcher, ["path", "fingerprint", "wrapper_interpreter_path", "wrapper_interpreter_fingerprint", "script_path", "script_fingerprint", "interpreter_path", "interpreter_fingerprint"], "OWNER_TRUST_RUNTIME_LAUNCHER_INVALID");
    const launcherPath = assertProtectedPath({ repositoryRoot, trustPath: document.runtime_launcher.path, expectedUid });
    const launcherInfo = statSync(launcherPath);
    if ((launcherInfo.mode & 0o277) !== 0 || !/^[a-f0-9]{64}$/u.test(document.runtime_launcher.fingerprint) || digest(readFileSync(launcherPath)) !== document.runtime_launcher.fingerprint) throw new Error("OWNER_TRUST_RUNTIME_LAUNCHER_INVALID");
    const launcherScriptPath = assertProtectedPath({ repositoryRoot, trustPath: document.runtime_launcher.script_path, expectedUid });
    const launcherScriptInfo = statSync(launcherScriptPath);
    if ((launcherScriptInfo.mode & 0o277) !== 0 || !/^[a-f0-9]{64}$/u.test(document.runtime_launcher.script_fingerprint) || digest(readFileSync(launcherScriptPath)) !== document.runtime_launcher.script_fingerprint) throw new Error("OWNER_TRUST_RUNTIME_LAUNCHER_INVALID");
    if (!isAbsolute(document.runtime_launcher.wrapper_interpreter_path) || !existsSync(document.runtime_launcher.wrapper_interpreter_path) || lstatSync(document.runtime_launcher.wrapper_interpreter_path).isSymbolicLink()) throw new Error("OWNER_TRUST_RUNTIME_LAUNCHER_INVALID");
    const wrapperInterpreterPath = realpathSync(document.runtime_launcher.wrapper_interpreter_path);
    const wrapperInterpreterInfo = statSync(wrapperInterpreterPath);
    if (!wrapperInterpreterInfo.isFile() || (wrapperInterpreterInfo.mode & 0o111) === 0 || (wrapperInterpreterInfo.mode & 0o022) !== 0 || !/^[a-f0-9]{64}$/u.test(document.runtime_launcher.wrapper_interpreter_fingerprint) || digest(readFileSync(wrapperInterpreterPath)) !== document.runtime_launcher.wrapper_interpreter_fingerprint) throw new Error("OWNER_TRUST_RUNTIME_LAUNCHER_INVALID");
    if (!isAbsolute(document.runtime_launcher.interpreter_path) || !existsSync(document.runtime_launcher.interpreter_path) || lstatSync(document.runtime_launcher.interpreter_path).isSymbolicLink()) throw new Error("OWNER_TRUST_RUNTIME_LAUNCHER_INVALID");
    const interpreterPath = realpathSync(document.runtime_launcher.interpreter_path);
    const interpreterInfo = statSync(interpreterPath);
    if (!interpreterInfo.isFile() || (interpreterInfo.mode & 0o111) === 0 || (interpreterInfo.mode & 0o022) !== 0 || !/^[a-f0-9]{64}$/u.test(document.runtime_launcher.interpreter_fingerprint) || digest(readFileSync(interpreterPath)) !== document.runtime_launcher.interpreter_fingerprint) throw new Error("OWNER_TRUST_RUNTIME_LAUNCHER_INVALID");
    if (!Array.isArray(document.release_trust?.verifiers) || document.release_trust.verifiers.length === 0 || !Array.isArray(document.release_trust?.source_verifiers) || document.release_trust.source_verifiers.length === 0) throw new Error("OWNER_TRUST_RELEASE_AUTHORITIES_INVALID");
    const releaseKeys = new Set(document.release_trust.verifiers.map((entry) => entry?.key_id));
    const releaseKeyMaterial = new Set();
    for (const entry of document.release_trust.verifiers) {
      let key;
      try { key = createPublicKey(entry?.public_key_pem); } catch { throw new Error("OWNER_TRUST_RELEASE_AUTHORITIES_INVALID"); }
      if (key.type !== "public" || key.asymmetricKeyType !== "ed25519") throw new Error("OWNER_TRUST_RELEASE_AUTHORITIES_INVALID");
      const material = digest(key.export({ type: "spki", format: "der" }));
      if (releaseKeyMaterial.has(material)) throw new Error("OWNER_TRUST_RELEASE_AUTHORITY_SEPARATION_INVALID");
      releaseKeyMaterial.add(material);
    }
    const sourceKeyMaterial = new Set();
    for (const entry of document.release_trust.source_verifiers) {
      let key;
      try { key = createPublicKey(entry?.public_key_pem); } catch { throw new Error("OWNER_TRUST_RELEASE_AUTHORITIES_INVALID"); }
      if (key.type !== "public" || key.asymmetricKeyType !== "ed25519") throw new Error("OWNER_TRUST_RELEASE_AUTHORITIES_INVALID");
      const material = digest(key.export({ type: "spki", format: "der" }));
      if (releaseKeys.has(entry?.key_id) || releaseKeyMaterial.has(material) || sourceKeyMaterial.has(material)) throw new Error("OWNER_TRUST_RELEASE_AUTHORITY_SEPARATION_INVALID");
      sourceKeyMaterial.add(material);
    }
    requireExactKeys(document.owner_anchor, ["path", "fingerprint", "owner_key_id"], "OWNER_TRUST_ANCHOR_BINDING_INVALID");
    const ownerAnchor = loadProtectedOwnerAnchor({ repositoryRoot, anchorPath: document.owner_anchor.path, expectedUid });
    if (ownerAnchor.fingerprint !== document.owner_anchor.fingerprint || ownerAnchor.owner_key_id !== document.owner_anchor.owner_key_id) throw new Error("OWNER_TRUST_ANCHOR_BINDING_INVALID");
    const receipt = document.owner_acceptance;
    const { fingerprint, signature, ...body } = receipt ?? {};
    const expectedKeys = ["schema_version", "purpose", "decision", "repository_logical_id", "checkout_instance_id", "release_prerequisites_fingerprint", "provider_executable", "owner_key_id", "owner_public_key_pem", "owner_anchor_fingerprint", "issued_at", "expires_at"];
    requireExactKeys(body, expectedKeys, "OWNER_ACCEPTANCE_RECEIPT_INVALID");
    const launchAuthority = document.runtime_authorities?.["headless-launch-observer"];
    const probeAuthority = document.runtime_authorities?.["headless-provider-probe"];
    if (body.schema_version !== "1.0.0" || body.purpose !== "next-workflow-owner-acceptance" || body.decision !== "accepted" || body.repository_logical_id !== repositoryLogicalId || body.checkout_instance_id !== checkoutInstanceId || body.release_prerequisites_fingerprint !== digest(document.release_prerequisites) || typeof body.provider_executable?.path !== "string" || !isAbsolute(body.provider_executable.path) || !/^[a-f0-9]{64}$/u.test(body.provider_executable?.fingerprint ?? "") || !launchAuthority?.allowed_executable_paths?.includes(body.provider_executable.path) || !launchAuthority?.allowed_executable_fingerprints?.includes(body.provider_executable.fingerprint) || !probeAuthority?.allowed_executable_paths?.includes(body.provider_executable.path) || !probeAuthority?.allowed_executable_fingerprints?.includes(body.provider_executable.fingerprint) || body.owner_anchor_fingerprint !== ownerAnchor.fingerprint || body.owner_key_id !== ownerAnchor.owner_key_id || body.owner_public_key_pem !== ownerAnchor.owner_public_key_pem || !Number.isFinite(Date.parse(body.issued_at)) || !Number.isFinite(Date.parse(body.expires_at)) || Date.parse(body.issued_at) > Date.parse(now) || Date.parse(body.expires_at) <= Date.parse(now) || fingerprint !== digest(body) || typeof signature !== "string") throw new Error("OWNER_ACCEPTANCE_RECEIPT_INVALID");
    let publicKey;
    try { publicKey = createPublicKey(body.owner_public_key_pem); } catch { throw new Error("OWNER_ACCEPTANCE_PUBLIC_KEY_INVALID"); }
    if (publicKey.asymmetricKeyType !== "ed25519" || body.owner_key_id !== `headless-owner-${digest(body.owner_public_key_pem).slice(0, 24)}` || verify(null, Buffer.from(canonicalJson(body)), publicKey, Buffer.from(signature, "base64url")) !== true) throw new Error("OWNER_ACCEPTANCE_SIGNATURE_INVALID");
  }
  const core = deepFreeze(structuredClone(document));
  const canonicalRepositoryRoot = realpathSync(repositoryRoot);
  const protectedSourceDirectory = dirname(canonicalPath);
  const snapshot = Object.freeze({
    document: core,
    release_trust: core.release_trust,
    release_prerequisites: core.release_prerequisites,
    production_state: core.production_state ?? null,
    runtime_launcher: core.runtime_launcher ?? null,
    owner_acceptance: core.owner_acceptance ?? null,
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
  const allowedManifestFingerprints = Array.isArray(authority.allowed_manifest_fingerprints) ? authority.allowed_manifest_fingerprints : [];
  const allowedAdapterIds = Array.isArray(authority.allowed_adapter_ids) ? authority.allowed_adapter_ids : [];
  if (!Array.isArray(authority.allowed_executable_fingerprints) || authority.allowed_executable_fingerprints.some((value) => !/^[a-f0-9]{64}$/.test(value)) || allowedManifestFingerprints.some((value) => !/^[a-f0-9]{64}$/.test(value)) || allowedAdapterIds.some((value) => typeof value !== "string" || value.length === 0) || (allowedManifestFingerprints.length === 0 && allowedAdapterIds.length === 0) || authority.source !== "pinned_process_and_certified_provider_metadata") throw new Error("LAUNCH_OBSERVATION_AUTHORITY_INVALID");
  const verifier = Object.freeze({
    verifier_id: authorityId,
    observe({ plan, process_evidence: processEvidence, fingerprint }) {
      if (!processEvidence || processEvidence.verified !== true || processEvidence.contained !== true || !/^[a-f0-9]{64}$/.test(processEvidence.process_identity_fingerprint ?? "") || !Array.isArray(processEvidence.argv)) throw new Error("RUN_LIFECYCLE_PROCESS_EVIDENCE_REQUIRED");
      const adapterId = plan.selected_provider?.split(":")?.[3] ?? null;
      if (!authority.allowed_executable_fingerprints.includes(plan.executable_fingerprint) || (!allowedManifestFingerprints.includes(plan.manifest_fingerprint) && !allowedAdapterIds.includes(adapterId))) throw new Error("RUN_LIFECYCLE_OBSERVATION_SOURCE_UNAUTHORIZED");
      const modelIndexes = processEvidence.argv.flatMap((value, index) => value === "--model" ? [index] : []);
      const configIndexes = processEvidence.argv.flatMap((value, index) => value === "-c" ? [index] : []);
      if (modelIndexes.length !== 1 || configIndexes.length !== 1) throw new Error("RUN_LIFECYCLE_SELECTED_ARGUMENT_NOT_OBSERVED");
      const observedModel = processEvidence.argv[modelIndexes[0] + 1];
      const reasoningConfiguration = processEvidence.argv[configIndexes[0] + 1];
      const reasoningMatch = /^model_reasoning_effort="([a-z][a-z0-9_-]{0,31})"$/u.exec(reasoningConfiguration ?? "");
      if (observedModel !== plan.selected_model || reasoningMatch?.[1] !== plan.selected_effort) throw new Error("RUN_LIFECYCLE_SELECTED_ARGUMENT_NOT_OBSERVED");
      const observed = { provider: plan.selected_provider, model: observedModel, effort: reasoningMatch[1] };
      const proofFingerprint = digest({ authority_id: authorityId, authority_revision: authority.revision, observed, process_evidence_fingerprint: processEvidence.fingerprint, plan_fingerprint: plan.plan_fingerprint, fingerprint });
      return { verified: true, verifier_id: authorityId, fingerprint, proof_fingerprint: proofFingerprint, actual_provider: observed.provider, actual_model: observed.model, actual_effort: observed.effort, observation_scope: "pinned_cli_launch_configuration", backend_attestation: null, backend_attestation_available: false };
    },
    verifyPersisted({ run, fingerprint }) {
      const observation = run?.observation;
      const terminal = ["FAILED", "CANCELLED", "TIMED_OUT"].includes(run?.state);
      const selectedConfiguration = [
        observation?.selected_provider,
        observation?.selected_model,
        observation?.selected_effort,
      ];
      const actualConfiguration = [
        observation?.actual_provider,
        observation?.actual_model,
        observation?.actual_effort,
      ];
      const verified = terminal
        && typeof run?.run_id === "string"
        && run.run_id.length > 0
        && selectedConfiguration.every((value) => typeof value === "string" && value.length > 0)
        && canonicalJson(selectedConfiguration) === canonicalJson(actualConfiguration)
        && observation.observation_scope === "pinned_cli_launch_configuration"
        && observation.backend_attestation === null
        && observation.backend_attestation_available === false
        && observation.launch_observation_verifier_id === authorityId
        && /^[a-f0-9]{64}$/u.test(observation.launch_observation_proof_fingerprint ?? "")
        && /^[a-f0-9]{64}$/u.test(observation.process_identity_fingerprint ?? "")
        && /^[a-f0-9]{64}$/u.test(observation.containment_evidence_fingerprint ?? "")
        && typeof observation.containment_profile_id === "string"
        && observation.containment_profile_id.length > 0
        && observation.task_network_access === false
        && observation.task_tools_enabled === false
        && /^[a-f0-9]{64}$/u.test(fingerprint ?? "");
      return {
        verified,
        verifier_id: authorityId,
        fingerprint,
        proof_fingerprint: verified
          ? digest({
            authority_id: authorityId,
            authority_revision: authority.revision,
            run_id: run.run_id,
            state: run.state,
            launch_observation_proof_fingerprint: observation.launch_observation_proof_fingerprint,
            process_identity_fingerprint: observation.process_identity_fingerprint,
            containment_evidence_fingerprint: observation.containment_evidence_fingerprint,
            fingerprint,
          })
          : null,
      };
    },
  });
  return brandRuntimeVerifier(verifier, "launch_observation", runtimeTrust, authority);
}

export function createProtectedProviderProbeAuthority({ runtimeTrust, authorityId } = {}) {
  const authority = runtimeAuthority(runtimeTrust, authorityId, "provider_probe");
  if (authority.source !== "owner_protected_provider_probe" || !Number.isSafeInteger(authority.revision) || authority.revision < 1 || !Array.isArray(authority.allowed_adapter_ids) || authority.allowed_adapter_ids.length === 0 || !Array.isArray(authority.allowed_executable_fingerprints) || authority.allowed_executable_fingerprints.some((value) => !/^[a-f0-9]{64}$/.test(value))) throw new Error("PROVIDER_PROBE_AUTHORITY_INVALID");
  const allowedAdapters = new Set(authority.allowed_adapter_ids);
  const verifier = {
    trusted: true,
    independent: true,
    authority_id: authorityId,
    verify({ probe, observation, fingerprint }) {
      const candidate = probe ?? observation;
      const executableFingerprint = candidate?.executable?.digest ?? candidate?.executable_fingerprint ?? null;
      const adapterId = candidate?.identity_key?.split(":")?.[3] ?? candidate?.adapter_id ?? null;
      const verified = /^[a-f0-9]{64}$/.test(fingerprint ?? "")
        && (observation ? typeof observation.identity_key === "string" : authority.allowed_executable_fingerprints.includes(executableFingerprint))
        && allowedAdapters.has(adapterId);
      if (!verified) return { verified: false, authority_id: authorityId, fingerprint };
      return {
        verified: true,
        authority_id: authorityId,
        fingerprint,
        identity_key: observation?.identity_key ?? probe?.identity_key,
        evidence_ref: `provider-probe-${digest({ authority_id: authorityId, revision: authority.revision, fingerprint })}`,
      };
    },
  };
  return brandRuntimeVerifier(Object.freeze(verifier), "provider_probe", runtimeTrust, authority);
}

export function createProtectedProviderCertificationAuthority({ runtimeTrust, authorityId, probeAuthorityId } = {}) {
  const authority = runtimeAuthority(runtimeTrust, authorityId, "provider_certification");
  if (authority.source !== "owner_protected_provider_certification" || !Number.isSafeInteger(authority.revision) || authority.revision < 1 || authority.probe_authority_id !== probeAuthorityId || !Array.isArray(authority.allowed_adapter_ids) || authority.allowed_adapter_ids.length === 0) throw new Error("PROVIDER_CERTIFICATION_AUTHORITY_INVALID");
  const allowedAdapters = new Set(authority.allowed_adapter_ids);
  const bindingFingerprint = (candidate) => {
    if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) return null;
    const {
      certification_proof_fingerprint: certificationProofFingerprint,
      authority_fingerprint: authorityFingerprint,
      ...binding
    } = candidate;
    void certificationProofFingerprint;
    void authorityFingerprint;
    return digest(binding);
  };
  const proofFor = (candidate) => {
    const certificationFingerprint = bindingFingerprint(candidate);
    return certificationFingerprint
      ? digest({ authority_id: authorityId, revision: authority.revision, probe_authority_id: probeAuthorityId, certification_fingerprint: certificationFingerprint })
      : null;
  };
  const certification = {
    trusted: true,
    independent: true,
    authority_id: authorityId,
    issue({ certification: candidate, fingerprint, probe_verdict: probeVerdict }) {
      const adapterId = candidate?.identity_key?.split(":")?.[3] ?? null;
      const issued = /^[a-f0-9]{64}$/.test(fingerprint ?? "")
        && fingerprint === bindingFingerprint(candidate)
        && allowedAdapters.has(adapterId)
        && probeVerdict?.verified === true
        && probeVerdict.authority_id === probeAuthorityId
        && typeof probeVerdict.evidence_ref === "string";
      return { issued, authority_id: authorityId, certification_fingerprint: fingerprint, proof_fingerprint: issued ? proofFor(candidate) : null };
    },
    verify({ certification: candidate, fingerprint }) {
      const adapterId = candidate?.identity_key?.split(":")?.[3] ?? null;
      const verified = allowedAdapters.has(adapterId)
        && candidate?.certifier_id === authorityId
        && candidate?.probe_authority_id === probeAuthorityId
        && /^[a-f0-9]{64}$/.test(fingerprint ?? "")
        && candidate?.certification_proof_fingerprint === proofFor(candidate);
      return {
        verified,
        authority_id: authorityId,
        fingerprint,
        certification_id: candidate?.certification_id,
        certifier_id: candidate?.certifier_id,
        identity_key: candidate?.identity_key,
        authority_fingerprint: candidate?.authority_fingerprint,
      };
    },
  };
  return brandRuntimeVerifier(Object.freeze(certification), "provider_certification", runtimeTrust, authority);
}

export function createProtectedAgentObservationAuthority({ runtimeTrust, authorityId } = {}) {
  const authority = runtimeAuthority(runtimeTrust, authorityId, "agent_observation");
  if (authority.source !== "owner_protected_agent_observation" || !Number.isSafeInteger(authority.revision) || authority.revision < 1 || typeof authority.evidence_strength !== "string" || authority.evidence_strength.length === 0) throw new Error("AGENT_OBSERVATION_AUTHORITY_INVALID");
  const proofFor = (actualObserved) => digest({ authority_id: authorityId, revision: authority.revision, actual_observation_fingerprint: digest(actualObserved), evidence_strength: authority.evidence_strength });
  const issue = Object.freeze((actualObserved) => {
    const fingerprint = digest(actualObserved);
    return Object.freeze({
      verified: true,
      independent: true,
      verified_by: authorityId,
      fingerprint,
      evidence_strength: authority.evidence_strength,
      authority_proof_fingerprint: proofFor(actualObserved),
    });
  });
  const verifier = {
    trusted: true,
    independent: true,
    verifier_id: authorityId,
    verify({ candidate_observation: candidateObservation, candidate_proof: candidateProof }) {
      const expected = issue(candidateObservation);
      const verified = candidateProof?.verified === true
        && candidateProof?.independent === true
        && candidateProof?.verified_by === authorityId
        && candidateProof?.fingerprint === expected.fingerprint
        && candidateProof?.evidence_strength === authority.evidence_strength
        && candidateProof?.authority_proof_fingerprint === expected.authority_proof_fingerprint;
      return verified
        ? { actual_observed: structuredClone(candidateObservation), observation_proof: structuredClone(candidateProof) }
        : { actual_observed: null, observation_proof: null };
    },
  };
  brandRuntimeVerifier(issue, "agent_observation_issuer", runtimeTrust, authority);
  brandRuntimeVerifier(verifier, "agent_observation", runtimeTrust, authority);
  return Object.freeze({ issue, verifier: Object.freeze(verifier) });
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

export function createProtectedRuntimeRecoveryAuthorizer({ runtimeTrust, authorityId } = {}) {
  const authority = runtimeAuthority(runtimeTrust, authorityId, "runtime_recovery");
  if (authority.source !== "owner_protected_runtime_recovery" || !Number.isSafeInteger(authority.revision) || authority.revision < 1 || !Array.isArray(authority.allowed_actions) || authority.allowed_actions.length === 0) throw new Error("RUNTIME_RECOVERY_AUTHORITY_INVALID");
  const allowedActions = new Set(authority.allowed_actions);
  const authorizer = Object.freeze(({ request, fingerprint }) => {
    const valid = request
      && typeof request.run_id === "string"
      && request.run_id.length > 0
      && Number.isSafeInteger(request.authority_epoch)
      && request.authority_epoch >= 0
      && allowedActions.has(request.requested_action)
      && fingerprint === digest(request);
    return valid
      ? { decision: "ALLOW", fingerprint, run_id: request.run_id, authority_epoch: request.authority_epoch, proof_fingerprint: digest({ authority_id: authorityId, authority_revision: authority.revision, fingerprint }) }
      : { decision: "DENY", fingerprint: fingerprint ?? null, run_id: request?.run_id ?? null, authority_epoch: request?.authority_epoch ?? null };
  });
  return brandRuntimeVerifier(authorizer, "runtime_recovery", runtimeTrust, authority);
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
