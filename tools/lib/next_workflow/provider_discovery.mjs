import { execFileSync } from "node:child_process";
import { accessSync, closeSync, constants as fsConstants, fstatSync, lstatSync, openSync, readFileSync, readSync, realpathSync } from "node:fs";
import path from "node:path";
import { providerDigest, providerIdentityKey, providerManifestFingerprint, validateExecutableDescriptor } from "./providers.mjs";

const CODEX_ARGUMENT_TEMPLATE = Object.freeze([
  "exec",
  "--ephemeral",
  "--ignore-user-config",
  "--ignore-rules",
  "--strict-config",
  "--skip-git-repo-check",
  "--disable",
  "shell_tool",
  "--disable",
  "unified_exec",
  "--disable",
  "code_mode_host",
  "--disable",
  "apps",
  "--disable",
  "browser_use",
  "--disable",
  "in_app_browser",
  "--disable",
  "computer_use",
  "--disable",
  "image_generation",
  "--disable",
  "standalone_web_search",
  "--disable",
  "multi_agent",
  "--disable",
  "skill_search",
  "--disable",
  "plugin_sharing",
  "--disable",
  "remote_plugin",
  "--disable",
  "tool_suggest",
  "--color",
  "never",
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

function locateCodexNativeExecutable(cliExecutable) {
  const architecture = { x64: "x86_64", arm64: "aarch64" }[process.arch];
  if (process.platform !== "linux" || !architecture) throw new Error("CODEX_NATIVE_PLATFORM_UNSUPPORTED");
  const packageName = process.platform === "linux" ? `@openai/codex-linux-${process.arch}` : null;
  const candidates = [
    path.resolve(path.dirname(realpathSync(process.execPath)), "..", "lib", "node_modules", "@openai", "codex", "node_modules", packageName, "vendor", `${architecture}-unknown-linux-musl`, "bin", "codex"),
    path.resolve(path.dirname(cliExecutable), "..", "node_modules", packageName, "vendor", `${architecture}-unknown-linux-musl`, "bin", "codex"),
  ].filter(Boolean);
  for (const candidate of candidates) {
    let descriptor;
    try {
      const canonical = realpathSync(candidate);
      const info = lstatSync(canonical);
      if (!info.isFile() || (info.mode & 0o111) === 0) continue;
      descriptor = openSync(canonical, fsConstants.O_RDONLY | (fsConstants.O_NOFOLLOW ?? 0));
      const pinned = fstatSync(descriptor);
      if (!pinned.isFile() || (pinned.mode & 0o111) === 0 || (pinned.mode & 0o022) !== 0) continue;
      const prefix = Buffer.alloc(2);
      readSync(descriptor, prefix, 0, prefix.length, 0);
      if (!prefix.equals(Buffer.from("#!"))) return canonical;
    } catch {
    } finally {
      if (descriptor !== undefined) closeSync(descriptor);
    }
  }
  throw new Error("CODEX_NATIVE_EXECUTABLE_NOT_FOUND");
}

function readPinnedFile(fd, size) {
  const bytes = Buffer.allocUnsafe(size);
  let offset = 0;
  while (offset < size) {
    const count = readSync(fd, bytes, offset, size - offset, offset);
    if (count === 0) throw new Error("PROVIDER_EXECUTABLE_SHORT_READ");
    offset += count;
  }
  return bytes;
}

function pinProviderExecutable(candidate) {
  const canonical = realpathSync(candidate);
  if (canonical !== path.resolve(candidate) || lstatSync(canonical).isSymbolicLink()) throw new Error("PROVIDER_EXECUTABLE_PATH_INVALID");
  const fd = openSync(canonical, fsConstants.O_RDONLY | (fsConstants.O_NOFOLLOW ?? 0));
  try {
    const info = fstatSync(fd);
    if (!info.isFile() || (info.mode & 0o111) === 0 || (info.mode & 0o022) !== 0) throw new Error("PROVIDER_EXECUTABLE_MODE_INVALID");
    const bytes = readPinnedFile(fd, info.size);
    return {
      fd,
      path: canonical,
      digest: providerDigest(bytes),
      device: String(info.dev),
      inode: String(info.ino),
      size: info.size,
    };
  } catch (error) {
    closeSync(fd);
    throw error;
  }
}

export function resolveBuiltinCodexExecutable({ executableLocator = locateExecutable } = {}) {
  const cliExecutable = executableLocator("codex");
  const executable = locateCodexNativeExecutable(cliExecutable);
  const pinned = pinProviderExecutable(executable);
  try {
    return Object.freeze({ path: pinned.path, fingerprint: pinned.digest, device: pinned.device, inode: pinned.inode });
  } finally {
    closeSync(pinned.fd);
  }
}

function runObservedCommand(executableDescriptor, argv, { runner = runIsolatedProviderProbe, maxBuffer = 16 * 1024 * 1024 } = {}) {
  const output = runner(executableDescriptor, argv, {
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

export function runIsolatedProviderProbe(executableDescriptor, argv, options) {
  if (process.platform !== "linux") throw new Error("PROVIDER_ISOLATED_PROBE_UNAVAILABLE");
  if (!executableDescriptor || !Number.isSafeInteger(executableDescriptor.fd) || !/^[a-f0-9]{64}$/.test(executableDescriptor.digest ?? "")) throw new Error("PROVIDER_PINNED_EXECUTABLE_REQUIRED");
  const unshare = ["/usr/bin/unshare", "/bin/unshare"].find((candidate) => {
    try { return lstatSync(candidate).isFile(); } catch { return false; }
  });
  const bwrap = ["/usr/bin/bwrap", "/usr/local/bin/bwrap"].find((candidate) => {
    try { return lstatSync(candidate).isFile(); } catch { return false; }
  });
  if (!unshare || !bwrap) throw new Error("PROVIDER_ISOLATED_PROBE_UNAVAILABLE");
  return execFileSync(unshare, [
    "--user", "--map-root-user", "--net", "--mount", "--fork",
    bwrap, "--die-with-parent", "--unshare-pid", "--cap-drop", "ALL",
    "--ro-bind", "/", "/", "--proc", "/proc", "--dev", "/dev", "--tmpfs", "/tmp",
    "--clearenv", "--setenv", "HOME", "/tmp", "--setenv", "LANG", "C.UTF-8", "--setenv", "LC_ALL", "C.UTF-8",
    "--dir", "/tmp/runtime", "--ro-bind", "/proc/self/fd/3", "/tmp/runtime/executable",
    "/tmp/runtime/executable", ...argv,
  ], { ...options, env: {}, shell: false, stdio: ["ignore", "pipe", "pipe", executableDescriptor.fd] });
}

function normalizeCodexModels(raw) {
  let document;
  try { document = JSON.parse(raw); } catch { throw new Error("CODEX_MODEL_CATALOG_INVALID"); }
  if (!Array.isArray(document?.models)) throw new Error("CODEX_MODEL_CATALOG_INVALID");
  const models = [];
  for (const [index, model] of document.models.entries()) {
    if (!MODEL_ID.test(model?.slug ?? "") || model.visibility !== "list") continue;
    const nativeReasoning = [...new Set((model.supported_reasoning_levels ?? []).map((entry) => entry?.effort).filter((value) => REASONING_ID.test(value ?? "")))];
    if (nativeReasoning.length === 0) continue;
    const recommendationRank = Number.isSafeInteger(model.priority) && model.priority > 0 ? model.priority : index + 1;
    models.push({
      model_id: model.slug,
      native_reasoning_values: nativeReasoning,
      default_native_reasoning: nativeReasoning.includes(model.default_reasoning_level) ? model.default_reasoning_level : nativeReasoning[0],
      supported_in_api: model.supported_in_api === true,
      recommendation_rank: recommendationRank,
    });
  }
  models.sort((left, right) => left.model_id.localeCompare(right.model_id));
  if (models.length === 0 || models.length > 256) throw new Error("CODEX_MODEL_CATALOG_SIZE_INVALID");
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
  return Object.fromEntries(nativeValues.map((value) => [value, value === "ultra" ? "max" : value]));
}

function requireDiscoveryAuthorities(probeAuthority, certificationAuthority) {
  if (!probeAuthority || probeAuthority.trusted !== true || probeAuthority.independent !== true || typeof probeAuthority.authority_id !== "string" || typeof probeAuthority.verify !== "function") throw new Error("PROVIDER_PROBE_AUTHORITY_REQUIRED");
  if (!certificationAuthority || certificationAuthority.trusted !== true || certificationAuthority.independent !== true || typeof certificationAuthority.authority_id !== "string" || typeof certificationAuthority.issue !== "function" || typeof certificationAuthority.verify !== "function") throw new Error("PROVIDER_CERTIFICATION_AUTHORITY_REQUIRED");
  if (probeAuthority.authority_id === certificationAuthority.authority_id || [probeAuthority.authority_id, certificationAuthority.authority_id].includes("next-workflow-local-provider-discovery")) throw new Error("PROVIDER_DISCOVERY_AUTHORITIES_NOT_INDEPENDENT");
  return { probeAuthority, certificationAuthority };
}

function observeCodexFamily({ family, observedAt, freshUntil, executableLocator, runner, probeAuthority = null, requireConfiguredVersion = false }) {
  if (family?.adapter_id !== "codex_cli" || family.transport_id !== "cli_process") throw new Error("PROVIDER_DISCOVERY_FAMILY_UNSUPPORTED");
  if (!family.resource_bounds || typeof family.resource_bounds !== "object" || Array.isArray(family.resource_bounds) || Object.keys(family.resource_bounds).length === 0 || Object.values(family.resource_bounds).some((value) => !Number.isFinite(value) || value < 0) || !Number.isFinite(family.estimated_cost) || family.estimated_cost < 0) throw new Error("PROVIDER_DISCOVERY_RESOURCE_POLICY_REQUIRED");
  const cliExecutable = executableLocator("codex");
  const executable = locateCodexNativeExecutable(cliExecutable);
  const pinnedExecutable = pinProviderExecutable(executable);
  const interpreterDescriptor = observedInterpreterDescriptor(executable, family, executableLocator);
  try {
    if (probeAuthority) {
      const executableDescriptor = { canonical_path: pinnedExecutable.path, digest: pinnedExecutable.digest, device: pinnedExecutable.device, inode: pinnedExecutable.inode };
      const preflight = {
        adapter_id: family.adapter_id,
        executable: executableDescriptor,
        interpreter: interpreterDescriptor,
        observed_at: observedAt,
        fresh_until: freshUntil,
        operation: "provider_discovery_pre_execution",
      };
      const fingerprint = providerDigest(preflight);
      const verdict = probeAuthority.verify({ probe: structuredClone(preflight), fingerprint });
      if (verdict?.verified !== true || verdict.authority_id !== probeAuthority.authority_id || verdict.fingerprint !== fingerprint || typeof verdict.evidence_ref !== "string") throw new Error("PROVIDER_EXECUTABLE_NOT_AUTHORIZED_BEFORE_PROBE");
    }
    const versionOutput = runObservedCommand(pinnedExecutable, ["--version"], { runner, maxBuffer: 1024 * 1024 });
    const adapterVersion = VERSION.exec(versionOutput)?.[1];
    if (!adapterVersion) throw new Error("CODEX_VERSION_OUTPUT_INVALID");
    if (requireConfiguredVersion && family.observed_adapter_version !== adapterVersion) throw new Error("PROVIDER_DISCOVERY_ADAPTER_VERSION_DRIFT");
    const models = normalizeCodexModels(runObservedCommand(pinnedExecutable, ["debug", "models", "--bundled"], { runner }));
    return {
      family,
      executable: pinnedExecutable.path,
      executableDescriptor: {
        canonical_path: pinnedExecutable.path,
        digest: pinnedExecutable.digest,
        device: pinnedExecutable.device,
        inode: pinnedExecutable.inode,
      },
      interpreterDescriptor,
      adapterVersion,
      models,
      observedAt,
      freshUntil,
    };
  } finally {
    closeSync(pinnedExecutable.fd);
  }
}

function publicDevelopmentCatalog(observation) {
  const { family, executableDescriptor, interpreterDescriptor, adapterVersion, models, observedAt, freshUntil } = observation;
  const core = {
    schema_version: "1.0.0",
    catalog_kind: "development_advisory",
    catalog_id: `${family.family_id}:development-catalog`,
    execution_provider_id: family.execution_provider_id,
    model_publisher_id: family.model_publisher_id,
    agent_product_id: family.agent_product_id,
    adapter_id: family.adapter_id,
    transport_id: family.transport_id,
    adapter_version: adapterVersion,
    configured_adapter_version: family.observed_adapter_version ?? null,
    adapter_version_matches_configuration: family.observed_adapter_version === adapterVersion,
    catalog_source: family.model_catalog_source,
    observed_at: observedAt,
    fresh_until: freshUntil,
    executable_fingerprint: executableDescriptor.digest,
    interpreter_fingerprint: interpreterDescriptor?.digest ?? null,
    capabilities: [...new Set(family.capabilities ?? [])].sort(),
    resource_bounds: { ...family.resource_bounds },
    estimated_cost: family.estimated_cost,
    models: models.map((model) => ({ ...model, native_reasoning_values: [...model.native_reasoning_values] })),
    production_eligible: false,
    selection_grants_launch_authority: false,
  };
  return { ...core, fingerprint: providerDigest(core) };
}

export function observeBuiltinProviderCatalogs({ adapterFamilies, clock = () => new Date().toISOString(), executableLocator = locateExecutable, runner = runIsolatedProviderProbe, freshnessMs = 5 * 60 * 1000 } = {}) {
  if (!Array.isArray(adapterFamilies) || !Number.isSafeInteger(freshnessMs) || freshnessMs <= 0) throw new Error("PROVIDER_DISCOVERY_INPUT_INVALID");
  const observedAt = clock();
  const observedTimestamp = Date.parse(observedAt);
  if (!Number.isFinite(observedTimestamp)) throw new Error("PROVIDER_DISCOVERY_CLOCK_INVALID");
  const freshUntil = new Date(observedTimestamp + freshnessMs).toISOString();
  const catalogs = [];
  const blockers = [];
  for (const family of adapterFamilies) {
    if (family?.adapter_id !== "codex_cli" || family.transport_id !== "cli_process") continue;
    try {
      catalogs.push(publicDevelopmentCatalog(observeCodexFamily({ family, observedAt, freshUntil, executableLocator, runner, requireConfiguredVersion: false })));
    } catch (error) {
      blockers.push({ family_id: family?.family_id ?? "unknown", code: error?.message ?? "PROVIDER_DISCOVERY_FAILED" });
    }
  }
  const core = { schema_version: "1.0.0", catalog_kind: "development_advisory_set", observed_at: observedAt, fresh_until: freshUntil, catalogs, blockers };
  return { ...core, fingerprint: providerDigest(core) };
}

function codexFamilyInputs({ family, executable, executableDescriptor, interpreterDescriptor, adapterVersion, models, observedAt, freshUntil, platform, probeAuthority, certificationAuthority }) {
  if (family.adapter_id !== "codex_cli" || family.transport_id !== "cli_process") throw new Error("PROVIDER_DISCOVERY_FAMILY_UNSUPPORTED");
  if (family.observed_adapter_version !== adapterVersion) throw new Error("PROVIDER_DISCOVERY_ADAPTER_VERSION_DRIFT");
  if (!family.resource_bounds || typeof family.resource_bounds !== "object" || Array.isArray(family.resource_bounds) || Object.keys(family.resource_bounds).length === 0 || Object.values(family.resource_bounds).some((value) => !Number.isFinite(value) || value < 0) || !Number.isFinite(family.estimated_cost) || family.estimated_cost < 0) throw new Error("PROVIDER_DISCOVERY_RESOURCE_POLICY_REQUIRED");
  const rankedModels = [...models].sort((left, right) => left.recommendation_rank - right.recommendation_rank || left.model_id.localeCompare(right.model_id));
  const rankPosition = new Map(rankedModels.map((model, index) => [model.model_id, index]));
  const manifests = models.map((model) => {
    const familyPriority = Number.isSafeInteger(family.priority) && family.priority >= 0 ? family.priority : 100;
    const position = rankPosition.get(model.model_id) ?? rankedModels.length;
    const correctness = family.selection_profile?.correctness ?? Math.max(0, 100 - (position * 10));
    const safety = family.selection_profile?.safety ?? Math.max(0, 100 - (position * 10));
    const efficiency = family.selection_profile?.efficiency ?? Math.max(0, 100 - ((rankedModels.length - position - 1) * 10));
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
      reasoning_mapping_provenance: { source_id: `${family.model_catalog_source}:${model.model_id}`, revision: adapterVersion, reviewed_by: probeAuthority.authority_id, proof_fingerprint: providerDigest({ kind: "exact_native_identity", catalog_source: family.model_catalog_source, model_id: model.model_id, observed_at: observedAt, probe_authority_id: probeAuthority.authority_id }) },
      selection_profile: { correctness, safety, efficiency, roles: [...new Set(family.selection_profile?.roles ?? [])].sort() },
      resource_bounds: { ...family.resource_bounds },
      priority: (familyPriority * 1000) + model.recommendation_rank,
      recommendation_rank: model.recommendation_rank,
      estimated_cost: family.estimated_cost,
      requires_observation: true,
      transport_descriptor: {
        argv_template: [...CODEX_ARGUMENT_TEMPLATE],
        argv_schema: [...CODEX_ARGUMENT_SCHEMA],
        environment_allowlist: [],
        private_response_file: true,
        executable: executableDescriptor,
        interpreter: interpreterDescriptor,
        execution_policy: {
          timeout_ms: 30 * 60 * 1000,
          max_prompt_bytes: 4 * 1024 * 1024,
          max_response_bytes: 4 * 1024 * 1024,
          max_stderr_bytes: 1024 * 1024,
        },
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
      manifest_fingerprint: providerManifestFingerprint(manifest),
      executable: executableDescriptor,
      interpreter: interpreterDescriptor,
      model_id: manifest.identity.model_id,
      observed_at: observedAt,
      fresh_until: freshUntil,
    };
    const probeFingerprint = providerDigest(probeCandidate);
    const probeVerdict = probeAuthority.verify({ probe: structuredClone(probeCandidate), fingerprint: probeFingerprint });
    if (probeVerdict?.verified !== true || probeVerdict.authority_id !== probeAuthority.authority_id || probeVerdict.fingerprint !== probeFingerprint || typeof probeVerdict.evidence_ref !== "string") throw new Error("PROVIDER_ISOLATED_PROBE_VERIFICATION_FAILED");
    const certificationCore = {
      certification_id: `${manifest.manifest_id}:runtime-certification`,
      certifier_id: certificationAuthority.authority_id,
      identity_key: providerIdentityKey(manifest.identity),
      manifest_version: manifest.version,
      adapter_version: adapterVersion,
      platform,
      manifest_fingerprint: providerManifestFingerprint(manifest),
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
    const unsignedCertification = {
      ...certificationCore,
      drift_fingerprint: providerDigest({
        identity_key: certificationCore.identity_key,
        manifest_version: certificationCore.manifest_version,
        adapter_version: certificationCore.adapter_version,
        platform: certificationCore.platform,
        manifest_fingerprint: certificationCore.manifest_fingerprint,
        capability_fingerprint: certificationCore.capability_fingerprint,
        observation_fingerprint: certificationCore.observation_fingerprint,
        revocation_epoch: certificationCore.revocation_epoch,
      }),
    };
    const certificationRequestFingerprint = providerDigest(unsignedCertification);
    const issued = certificationAuthority.issue({ certification: structuredClone(unsignedCertification), fingerprint: certificationRequestFingerprint, probe_verdict: structuredClone(probeVerdict) });
    if (issued?.issued !== true || issued.authority_id !== certificationAuthority.authority_id || issued.certification_fingerprint !== certificationRequestFingerprint || !/^[a-f0-9]{64}$/.test(issued.proof_fingerprint ?? "")) throw new Error("PROVIDER_CERTIFICATION_ISSUANCE_FAILED");
    return {
      ...unsignedCertification,
      certification_proof_fingerprint: issued.proof_fingerprint,
      authority_fingerprint: providerDigest({
        certifier_id: certificationAuthority.authority_id,
        probe_authority_id: probeAuthority.authority_id,
        certification_proof_fingerprint: issued.proof_fingerprint,
      }),
    };
  });
  return { manifests, certifications, observations, observationVerifier, certificationAuthority };
}

export function discoverBuiltinProviderInputs({ adapterFamilies, probeAuthority, certificationAuthority, clock = () => new Date().toISOString(), executableLocator = locateExecutable, runner = runIsolatedProviderProbe, platform = `${process.platform}-${process.arch}`, freshnessMs = 5 * 60 * 1000 } = {}) {
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
      const observation = observeCodexFamily({ family, observedAt, freshUntil, executableLocator, runner, probeAuthority: authorities.probeAuthority, requireConfiguredVersion: true });
      const result = codexFamilyInputs({ family, executable: observation.executable, executableDescriptor: observation.executableDescriptor, interpreterDescriptor: observation.interpreterDescriptor, adapterVersion: observation.adapterVersion, models: observation.models, observedAt, freshUntil, platform, ...authorities });
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
