import { execFileSync } from "node:child_process";
import { accessSync, constants as fsConstants, lstatSync, readFileSync, realpathSync } from "node:fs";
import path from "node:path";
import { providerDigest, providerIdentityKey, validateExecutableDescriptor } from "./providers.mjs";

const CODEX_ARGUMENT_TEMPLATE = Object.freeze([
  "exec",
  "--ephemeral",
  "--ignore-user-config",
  "--sandbox",
  "{{sandbox}}",
  "--model",
  "{{model_id}}",
  "-c",
  "{{reasoning_config}}",
  "--cd",
  "{{working_directory}}",
  "--output-last-message",
  "{{response_file}}",
  "{{stdin_marker}}",
]);
const CODEX_ARGUMENT_SCHEMA = Object.freeze(["sandbox", "model_id", "reasoning_config", "working_directory", "response_file", "stdin_marker"]);
const VERSION = /^codex-cli\s+([0-9]+\.[0-9]+\.[0-9]+(?:[-+][0-9A-Za-z.-]+)?)$/;
const MODEL_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const REASONING_ID = /^[a-z][a-z0-9_-]{0,31}$/;

function locateExecutable(name, environmentPath = process.env.PATH ?? "") {
  if (!/^[A-Za-z0-9._-]+$/.test(name)) throw new Error("PROVIDER_EXECUTABLE_NAME_INVALID");
  for (const directory of environmentPath.split(path.delimiter)) {
    if (!directory || !path.isAbsolute(directory)) continue;
    const candidate = path.join(directory, name);
    try {
      accessSync(candidate, fsConstants.X_OK);
      const canonical = realpathSync(candidate);
      if (lstatSync(canonical).isFile()) return canonical;
    } catch {}
  }
  throw new Error(`PROVIDER_EXECUTABLE_NOT_FOUND:${name}`);
}

function runObservedCommand(executable, argv, { runner = execFileSync, maxBuffer = 16 * 1024 * 1024 } = {}) {
  const output = runner(executable, argv, {
    encoding: "utf8",
    maxBuffer,
    timeout: 30000,
    stdio: ["ignore", "pipe", "pipe"],
    env: {
      PATH: process.env.PATH,
      LANG: "C.UTF-8",
      LC_ALL: "C.UTF-8",
    },
  });
  if (typeof output !== "string") throw new Error("PROVIDER_DISCOVERY_OUTPUT_INVALID");
  return output.trim();
}

function normalizeCodexModels(raw) {
  let document;
  try { document = JSON.parse(raw); } catch { throw new Error("CODEX_MODEL_CATALOG_INVALID"); }
  if (!Array.isArray(document?.models)) throw new Error("CODEX_MODEL_CATALOG_INVALID");
  const models = [];
  for (const model of document.models) {
    if (!MODEL_ID.test(model?.slug ?? "") || model.visibility !== "list") continue;
    const nativeReasoning = [...new Set((model.supported_reasoning_levels ?? []).map((entry) => entry?.effort).filter((value) => REASONING_ID.test(value ?? "")))];
    if (nativeReasoning.length === 0) continue;
    models.push({
      model_id: model.slug,
      native_reasoning_values: nativeReasoning,
      default_native_reasoning: nativeReasoning.includes(model.default_reasoning_level) ? model.default_reasoning_level : nativeReasoning[0],
      supported_in_api: model.supported_in_api === true,
    });
  }
  models.sort((left, right) => left.model_id.localeCompare(right.model_id));
  if (models.length === 0) throw new Error("CODEX_MODEL_CATALOG_EMPTY");
  return models;
}

function observedInterpreterDescriptor(executable, family, executableLocator) {
  const firstLine = readFileSync(executable, "utf8").split(/\r?\n/, 1)[0];
  if (!firstLine.startsWith("#!")) return null;
  const tokens = firstLine.slice(2).trim().split(/\s+/);
  let name;
  if (tokens[0] === "/usr/bin/env" && tokens.length === 2) name = tokens[1];
  else if (tokens.length === 1 && path.isAbsolute(tokens[0])) name = path.basename(tokens[0]);
  else throw new Error("PROVIDER_SCRIPT_INTERPRETER_DECLARATION_INVALID");
  if (!family.runtime_discovery?.allowed_script_interpreters?.includes(name)) throw new Error("PROVIDER_SCRIPT_INTERPRETER_NOT_ALLOWLISTED");
  const canonicalPath = executableLocator(name);
  return { canonical_path: canonicalPath, digest: providerDigest(readFileSync(canonicalPath)), name };
}

function exactEffortMapping(nativeValues) {
  return Object.fromEntries(nativeValues.map((value) => [value, value]));
}

function requireDiscoveryAuthorities(probeAuthority, certificationAuthority) {
  if (!probeAuthority || probeAuthority.trusted !== true || probeAuthority.independent !== true || typeof probeAuthority.authority_id !== "string" || typeof probeAuthority.verify !== "function") throw new Error("PROVIDER_PROBE_AUTHORITY_REQUIRED");
  if (!certificationAuthority || certificationAuthority.trusted !== true || certificationAuthority.independent !== true || typeof certificationAuthority.authority_id !== "string" || typeof certificationAuthority.issue !== "function" || typeof certificationAuthority.verify !== "function") throw new Error("PROVIDER_CERTIFICATION_AUTHORITY_REQUIRED");
  if (probeAuthority.authority_id === certificationAuthority.authority_id || [probeAuthority.authority_id, certificationAuthority.authority_id].includes("next-workflow-local-provider-discovery")) throw new Error("PROVIDER_DISCOVERY_AUTHORITIES_NOT_INDEPENDENT");
  return { probeAuthority, certificationAuthority };
}

function codexFamilyInputs({ family, executable, interpreterDescriptor, adapterVersion, models, observedAt, freshUntil, platform, probeAuthority, certificationAuthority }) {
  if (family.adapter_id !== "codex_cli" || family.transport_id !== "cli_process") throw new Error("PROVIDER_DISCOVERY_FAMILY_UNSUPPORTED");
  if (family.observed_adapter_version !== adapterVersion) throw new Error("PROVIDER_DISCOVERY_ADAPTER_VERSION_DRIFT");
  const executableDescriptor = { canonical_path: executable, digest: providerDigest(readFileSync(executable)) };
  const manifests = models.map((model) => {
    const identity = {
      execution_provider_id: family.execution_provider_id,
      model_publisher_id: family.model_publisher_id,
      agent_product_id: family.agent_product_id,
      adapter_id: family.adapter_id,
      transport_id: family.transport_id,
      model_id: model.model_id,
    };
    return {
      manifest_id: `${family.family_id}:${model.model_id}`,
      version: `1.0.0+${adapterVersion}`,
      identity,
      capabilities: [...new Set(family.capabilities ?? [])].sort(),
      native_reasoning_values: model.native_reasoning_values,
      effort_mapping: exactEffortMapping(model.native_reasoning_values),
      certification_profile: { probe_authority: "independent", certification_authority: "independent", isolated_probe: true },
      reasoning_mapping_provenance: { kind: "exact_native_identity", catalog_source: family.model_catalog_source, observed_at: observedAt },
      resource_bounds: {},
      priority: Number.isSafeInteger(family.priority) ? family.priority : 100,
      estimated_cost: Number.isFinite(family.estimated_cost) ? family.estimated_cost : 0,
      requires_observation: true,
      transport_descriptor: {
        argv_template: [...CODEX_ARGUMENT_TEMPLATE],
        argv_schema: [...CODEX_ARGUMENT_SCHEMA],
        environment_allowlist: ["PATH", "LANG", "LC_ALL"],
        private_response_file: true,
        executable: executableDescriptor,
        interpreter: interpreterDescriptor,
      },
    };
  });
  const observations = manifests.map((manifest) => ({
    trust_class: "trusted_runtime_observation",
    identity_key: providerIdentityKey(manifest.identity),
    manifest_version: manifest.version,
    observer_id: probeAuthority.authority_id,
    observed_at: observedAt,
    fresh_until: freshUntil,
    executable_observation: { path: executable },
    ...(manifest.transport_descriptor.interpreter ? { interpreter_observation: { path: manifest.transport_descriptor.interpreter.canonical_path } } : {}),
  }));
  const observationVerifier = {
    trusted: true,
    verify({ observation, fingerprint }) {
      const verdict = probeAuthority.verify({ observation: structuredClone(observation), fingerprint });
      if (verdict?.verified !== true || verdict.authority_id !== probeAuthority.authority_id || verdict.fingerprint !== fingerprint || verdict.identity_key !== observation?.identity_key) return false;
      return { verified: true, fingerprint, observer_id: observation.observer_id, identity_key: observation.identity_key };
    },
  };
  const certifications = manifests.map((manifest, index) => {
    const observation = observations[index];
    const normalizedObservation = {
      identity_key: providerIdentityKey(manifest.identity),
      manifest_version: manifest.version,
      observer_id: observation.observer_id,
      observed_at: observedAt,
      fresh_until: freshUntil,
      evidence: {
        executable: validateExecutableDescriptor(manifest.transport_descriptor.executable, observation.executable_observation),
        ...(manifest.transport_descriptor.interpreter ? { interpreter: validateExecutableDescriptor(manifest.transport_descriptor.interpreter, observation.interpreter_observation) } : {}),
      },
    };
    const probeCandidate = {
      identity_key: providerIdentityKey(manifest.identity),
      manifest_version: manifest.version,
      adapter_version: adapterVersion,
      platform,
      executable: executableDescriptor,
      interpreter: interpreterDescriptor,
      model_id: manifest.identity.model_id,
      observed_at: observedAt,
      fresh_until: freshUntil,
    };
    const probeFingerprint = providerDigest(probeCandidate);
    const probeVerdict = probeAuthority.verify({ probe: structuredClone(probeCandidate), fingerprint: probeFingerprint });
    if (probeVerdict?.verified !== true || probeVerdict.authority_id !== probeAuthority.authority_id || probeVerdict.fingerprint !== probeFingerprint || typeof probeVerdict.evidence_ref !== "string") throw new Error("PROVIDER_ISOLATED_PROBE_VERIFICATION_FAILED");
    const unsignedCertification = {
      certification_id: `${manifest.manifest_id}:runtime-certification`,
      certifier_id: certificationAuthority.authority_id,
      identity_key: providerIdentityKey(manifest.identity),
      manifest_version: manifest.version,
      adapter_version: adapterVersion,
      platform,
      capability_fingerprint: providerDigest(manifest.capabilities),
      state: "CERTIFIED",
      certified_at: observedAt,
      expires_at: freshUntil,
      revocation_epoch: 0,
      revocation_state: "active",
      observation_fingerprint: providerDigest(normalizedObservation),
      probe_lineage: probeVerdict.evidence_ref,
      probe_authority_id: probeAuthority.authority_id,
      probe_fingerprint: probeFingerprint,
      clock_fingerprint: providerDigest({ certified_at: observedAt, expires_at: freshUntil }),
    };
    const certificationRequestFingerprint = providerDigest(unsignedCertification);
    const issued = certificationAuthority.issue({ certification: structuredClone(unsignedCertification), fingerprint: certificationRequestFingerprint, probe_verdict: structuredClone(probeVerdict) });
    if (issued?.issued !== true || issued.authority_id !== certificationAuthority.authority_id || issued.certification_fingerprint !== certificationRequestFingerprint || !/^[a-f0-9]{64}$/.test(issued.proof_fingerprint ?? "")) throw new Error("PROVIDER_CERTIFICATION_ISSUANCE_FAILED");
    const certification = { ...unsignedCertification, certification_proof_fingerprint: issued.proof_fingerprint, authority_fingerprint: providerDigest({ certifier_id: certificationAuthority.authority_id, probe_authority_id: probeAuthority.authority_id, certification_proof_fingerprint: issued.proof_fingerprint }) };
    return { ...certification, drift_fingerprint: providerDigest({ identity_key: certification.identity_key, manifest_version: certification.manifest_version, adapter_version: certification.adapter_version, platform: certification.platform, capability_fingerprint: certification.capability_fingerprint, observation_fingerprint: certification.observation_fingerprint, revocation_epoch: certification.revocation_epoch }) };
  });
  return { manifests, certifications, observations, observationVerifier, certificationAuthority };
}

export function discoverBuiltinProviderInputs({ adapterFamilies, probeAuthority, certificationAuthority, clock = () => new Date().toISOString(), executableLocator = locateExecutable, runner = execFileSync, platform = `${process.platform}-${process.arch}`, freshnessMs = 5 * 60 * 1000 } = {}) {
  if (!Array.isArray(adapterFamilies) || !Number.isSafeInteger(freshnessMs) || freshnessMs <= 0) throw new Error("PROVIDER_DISCOVERY_INPUT_INVALID");
  const observedAt = clock();
  const observedTimestamp = Date.parse(observedAt);
  if (!Number.isFinite(observedTimestamp)) throw new Error("PROVIDER_DISCOVERY_CLOCK_INVALID");
  const freshUntil = new Date(observedTimestamp + freshnessMs).toISOString();
  const manifests = [];
  const certifications = [];
  const observations = [];
  const verifierByIdentity = new Map();
  const blockers = [];

  for (const family of adapterFamilies) {
    if (family?.adapter_id !== "codex_cli" || family.transport_id !== "cli_process") continue;
    try {
      const authorities = requireDiscoveryAuthorities(probeAuthority, certificationAuthority);
      const executable = executableLocator("codex");
      const interpreterDescriptor = observedInterpreterDescriptor(executable, family, executableLocator);
      const versionOutput = runObservedCommand(executable, ["--version"], { runner, maxBuffer: 1024 * 1024 });
      const version = VERSION.exec(versionOutput)?.[1];
      if (!version) throw new Error("CODEX_VERSION_OUTPUT_INVALID");
      const models = normalizeCodexModels(runObservedCommand(executable, ["debug", "models", "--bundled"], { runner }));
      const result = codexFamilyInputs({ family, executable, interpreterDescriptor, adapterVersion: version, models, observedAt, freshUntil, platform, ...authorities });
      for (const manifest of result.manifests) manifests.push(manifest);
      for (const observation of result.observations) observations.push(observation);
      for (const certification of result.certifications) certifications.push(certification);
      for (const identityKey of result.manifests.map((manifest) => providerIdentityKey(manifest.identity))) verifierByIdentity.set(identityKey, result.observationVerifier);
    } catch (error) {
      blockers.push({ family_id: family.family_id ?? "unknown", code: error?.message ?? "PROVIDER_DISCOVERY_FAILED" });
    }
  }

  const observationVerifier = {
    trusted: true,
    verify(input) {
      const verifier = verifierByIdentity.get(input?.observation?.identity_key);
      return verifier ? verifier.verify(input) : false;
    },
  };
  const certificationVerifier = {
    trusted: true,
    verify({ certification, fingerprint }) {
      if (!certificationAuthority || certification?.certifier_id !== certificationAuthority.authority_id) return false;
      const verdict = certificationAuthority.verify({ certification: structuredClone(certification), fingerprint });
      return verdict?.verified === true
        && verdict.authority_id === certificationAuthority.authority_id
        && verdict.fingerprint === fingerprint
        && verdict.certification_id === certification.certification_id
        && verdict.identity_key === certification.identity_key
        && verdict.authority_fingerprint === certification.authority_fingerprint
        ? { verified: true, fingerprint, certification_id: certification.certification_id, certifier_id: certification.certifier_id, identity_key: certification.identity_key, authority_fingerprint: certification.authority_fingerprint }
        : false;
    },
  };
  return {
    manifests,
    certifications,
    observations,
    observationVerifier,
    certificationVerifier,
    blockers,
    observed_at: observedAt,
    fresh_until: freshUntil,
  };
}

export function providerDiscoveryDigest(value) {
  return providerDigest(value);
}
