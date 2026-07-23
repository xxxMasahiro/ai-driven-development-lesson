#!/usr/bin/env node
import { existsSync, lstatSync, readFileSync, realpathSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadContracts, validateContractSet } from "./lib/next_workflow/contracts.mjs";
import { compatibilityDigest, resolveRuntimeAuthorityInputs } from "./lib/next_workflow/compatibility.mjs";
import { composeAuthorityDecision } from "./lib/next_workflow/authority.mjs";
import { loadRepositoryIdentity } from "./lib/next_workflow/identity.mjs";
import { buildHeadlessTeamPlan } from "./lib/next_workflow/headless_plan.mjs";
import { loadDefaultNextWorkflowProjection } from "./lib/next_workflow/projection.mjs";
import { loadProviderRegistry, selectDevelopmentAgentConfiguration, verifyDevelopmentAgentConfiguration } from "./lib/next_workflow/providers.mjs";
import { discoverBuiltinProviderInputs, observeBuiltinProviderCatalogs } from "./lib/next_workflow/provider_discovery.mjs";
import { bootstrapHeadlessRuntimeTrust, createHeadlessOwnerAcceptance, createHeadlessOwnerIdentity, defaultHeadlessRuntimeStateRoot, HEADLESS_RUNTIME_AUTHORITIES } from "./lib/next_workflow/headless_bootstrap.mjs";
import { createHeadlessProductionService } from "./lib/next_workflow/headless_service.mjs";
import { createHeadlessRecoveryLifecycle } from "./lib/next_workflow/headless_runtime.mjs";
import { recoverUnresolvedAgentRun } from "./lib/next_workflow/run_controller.mjs";
import { completeActivation, freezeRepositoryReleaseCandidate, persistActivationTransition, verifyEnforcedActivationRecord, verifyReleaseProofs, verifyRepositoryReleaseDeployment } from "./lib/next_workflow/release.mjs";
import { createSignedReleaseBundle, createSignedTransitionEvidence } from "./lib/next_workflow/release_signing.mjs";
import { createSignedReleaseSourceReceipt, createSignedTransitionSourceReceipt } from "./lib/next_workflow/release_source_receipts.mjs";
import { createSignedReleaseProofVerifier, createSignedTransitionVerifier } from "./lib/next_workflow/release_trust.mjs";
import { createNextWorkflowRuntime } from "./lib/next_workflow/runtime.mjs";
import { createLinuxIsolatedContainment, diagnoseLinuxIsolationPrerequisites } from "./lib/next_workflow/runtime_containment.mjs";
import { createProtectedFinalizationFenceVerifier, createProtectedLaunchObservationVerifier, createProtectedProviderCertificationAuthority, createProtectedProviderProbeAuthority, createProtectedReceiptAuthority, createProtectedRuntimeRecoveryAuthorizer, defaultOwnerTrustPath, loadProtectedRuntimeTrust } from "./lib/next_workflow/runtime_trust.mjs";
import { createAgentSelectionSettingsManager, resolveAgentSelectionPolicy } from "./lib/next_workflow/settings.mjs";
import { openWorkflowStateStore } from "./lib/next_workflow/store.mjs";

const SOURCE_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ROOT = process.env.NEXT_WORKFLOW_VERIFIED_REPOSITORY_ROOT
  ? realpathSync(process.env.NEXT_WORKFLOW_VERIFIED_REPOSITORY_ROOT)
  : SOURCE_ROOT;
const args = process.argv.slice(2);

function readJson(relativePath) {
  return JSON.parse(readFileSync(path.join(ROOT, relativePath), "utf8"));
}

function readRepositoryBoundJson(configuredPath, fallbackRelativePath) {
  const candidate = configuredPath ? path.resolve(ROOT, configuredPath) : path.join(ROOT, fallbackRelativePath);
  if (lstatSync(candidate).isSymbolicLink()) throw new Error("NEXT_WORKFLOW_CONFIG_SYMLINK_FORBIDDEN");
  const resolved = realpathSync(candidate);
  const relative = path.relative(ROOT, resolved);
  if (relative === "" || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) throw new Error("NEXT_WORKFLOW_CONFIG_OUTSIDE_REPOSITORY");
  return JSON.parse(readFileSync(resolved, "utf8"));
}

function option(name, fallback = undefined) {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : fallback;
}

function options(name) {
  const values = [];
  for (let index = 0; index < args.length; index += 1) if (args[index] === name && args[index + 1] !== undefined) values.push(args[index + 1]);
  return values;
}

function print(value) {
  writeFileSync(process.stdout.fd, `${JSON.stringify(value, null, 2)}\n`);
}

function developmentSelectionStop(code, details = {}) {
  const core = { schema_version: "1.0.0", decision: "STOP", profile: "development_advisory", code, ...details, production_eligible: false, selection_grants_launch_authority: false, backend_attestation: false };
  return { ...core, fingerprint: compatibilityDigest(core) };
}

function runtimeRegistry({ issuedAt, runtimeTrust } = {}) {
  const document = readRepositoryBoundJson(process.env.NEXT_WORKFLOW_PROVIDER_REGISTRY_FILE, "learning/NEXT_WORKFLOW_PROVIDER_REGISTRY.json");
  const entries = [
    ...(document.entries ?? []).map((entry) => ({ ...entry, manifest: entry.manifest ? { ...entry.manifest, requires_observation: true } : entry.manifest })),
    ...(document.custom_entries ?? []).map((entry) => ({ ...entry, manifest: entry.manifest ? { ...entry.manifest, custom: true, requires_observation: true } : entry.manifest })),
  ];
  const observedAt = issuedAt || process.env.NEXT_WORKFLOW_SETTINGS_REGISTRY_OBSERVED_AT || new Date().toISOString();
  const probeAuthority = runtimeTrust ? createProtectedProviderProbeAuthority({ runtimeTrust, authorityId: HEADLESS_RUNTIME_AUTHORITIES.providerProbe }) : undefined;
  const certificationAuthority = runtimeTrust ? createProtectedProviderCertificationAuthority({ runtimeTrust, authorityId: HEADLESS_RUNTIME_AUTHORITIES.providerCertification, probeAuthorityId: HEADLESS_RUNTIME_AUTHORITIES.providerProbe }) : undefined;
  const discovered = discoverBuiltinProviderInputs({ adapterFamilies: document.adapter_families ?? [], clock: () => observedAt, probeAuthority, certificationAuthority });
  const manifests = [...entries.map((entry) => entry.manifest).filter(Boolean), ...discovered.manifests];
  const certifications = [...entries.map((entry) => entry.certification).filter(Boolean), ...discovered.certifications];
  const observations = [...entries.map((entry) => entry.observation).filter(Boolean), ...discovered.observations];
  const registry = loadProviderRegistry({ manifests, certifications, observations, observationVerifier: discovered.observationVerifier, certificationVerifier: discovered.certificationVerifier, platform: `${process.platform}-${process.arch}`, clock: () => observedAt });
  return { ...registry, discovery_blockers: discovered.blockers };
}

function runtimeIdentity(options = {}) {
  const reattestGuard = options.reattest === true ? ({ persisted_identity }) => {
    const databasePath = process.env.NEXT_WORKFLOW_STORE_PATH || path.join(ROOT, ".workflow-state", `workflow-${persisted_identity.checkout_instance_id}.sqlite`);
    if (!existsSync(databasePath)) return { allowed: true, proof_fingerprint: compatibilityDigest({ checkout_instance_id: persisted_identity.checkout_instance_id, state: "no-operational-store" }) };
    const store = openWorkflowStateStore({ repositoryRoot: ROOT, databasePath, expectedIdentity: persisted_identity, mode: "readonly" });
    try {
      const unresolved = store.listUnresolvedEffects();
      const relationships = store.query({ kind: "Relationship", limit: 1000 }).records.filter((record) => !["ARCHIVED", "REVOKED"].includes(record.payload?.state ?? record.lifecycle_state));
      const activations = store.query({ kind: "NextWorkflowActivation", limit: 1000 }).records.filter((record) => record.payload?.candidate_fingerprint || !["planned", "rolled_back"].includes(record.payload?.mode));
      if (unresolved.length > 0 || relationships.length > 0 || activations.length > 0) return { allowed: false, proof_fingerprint: compatibilityDigest({ unresolved: unresolved.map((item) => item.effect_id), relationships: relationships.map((item) => item.id), activations: activations.map((item) => item.id) }) };
      return { allowed: true, proof_fingerprint: compatibilityDigest({ checkout_instance_id: persisted_identity.checkout_instance_id, store_revision: store.revision, state: "operational-state-clear" }) };
    } finally {
      store.close();
    }
  } : undefined;
  return loadRepositoryIdentity({ repositoryRoot: ROOT, checkoutStatePath: process.env.NEXT_WORKFLOW_CHECKOUT_IDENTITY_PATH, create: false, ...options, ...(reattestGuard ? { reattestGuard } : {}) });
}

function authoritySource(kind, sourceId, payload, { issuedAt, expiresAt, action, targetId }) {
  const sourceFingerprint = compatibilityDigest(payload);
  return {
    kind,
    source_id: sourceId,
    decision: "allow",
    revision: sourceFingerprint,
    fingerprint: sourceFingerprint,
    fresh_until: expiresAt,
    revocation_epoch: 0,
    actions: [action],
    targets: [targetId],
    required_approvals: [],
    duties: [],
    resource_ceilings: {},
    rigor_floor: "L1",
    observed_at: issuedAt,
    ...(kind === "target_invariant" ? { repository_management: payload.repository_management } : {}),
  };
}

function runtimeSettingsAuthority({ issuedAt, expiresAt, settingsRevision } = {}) {
  if (!Number.isFinite(Date.parse(issuedAt)) || !Number.isFinite(Date.parse(expiresAt)) || !Number.isSafeInteger(settingsRevision) || settingsRevision < 0) throw new Error("SETTINGS_AUTHORITY_CONTEXT_INVALID");
  const identity = runtimeIdentity({ create: true });
  const action = "configure_agent_selection";
  const targetId = "next-workflow-agent-selection";
  const targetInvariant = { target_id: targetId, repository_management: "parent", entry_contract: compatibilityDigest(readFileSync(path.join(ROOT, "AGENTS.MD"), "utf8")) };
  const savedSettings = readJson("learning/NEXT_WORKFLOW_AGENT_SELECTION_SETTINGS.json");
  const activation = readJson("learning/NEXT_WORKFLOW_ACTIVATION.json");
  const taskScope = { action, target_id: targetId, grants_launch_authority: false, grants_git_authority: false, grants_network_authority: false };
  const runtimeCapability = { node: process.versions.node, platform: process.platform, architecture: process.arch, state_store: "sqlite-v1" };
  const sourceContext = { issuedAt, expiresAt, action, targetId };
  const sources = [
    authoritySource("target_invariant", "agent-selection-target", targetInvariant, sourceContext),
    authoritySource("saved_settings", "agent-selection-saved-settings", savedSettings, sourceContext),
    authoritySource("task_scope", "agent-selection-task-scope", taskScope, sourceContext),
    authoritySource("rigor", "next-workflow-activation-rigor", activation, sourceContext),
    authoritySource("runtime_capability", "next-workflow-runtime-capability", runtimeCapability, sourceContext),
  ];
  const bindings = {
    repository_logical_id: identity.repository_logical_id,
    checkout_instance_id: identity.checkout_instance_id,
    task_id: "control-center-agent-selection-settings",
    run_id: `settings-evaluation-${settingsRevision}`,
    target_id: targetId,
    policy_fingerprint: compatibilityDigest(activation),
    settings_revision: String(settingsRevision),
    runtime_capability_fingerprint: compatibilityDigest(runtimeCapability),
    revocation_epoch: 0,
  };
  const resolved = resolveRuntimeAuthorityInputs({
    repositoryRoot: ROOT,
    resolverInput: { targetKind: "parent" },
    bindings,
    sources,
    instructionFreshUntil: expiresAt,
    instructionActions: [action],
    instructionTargets: [targetId],
  });
  return composeAuthorityDecision({
    variant: "filesystem_write",
    action,
    subject: {
      kind: "AgentSelectionSettings",
      grants_authority: false,
      canonical_relative_target: "learning/NEXT_WORKFLOW_AGENT_SELECTION_SETTINGS.json",
      operation: "atomic_replace",
      owner: "next-workflow-settings-manager",
      prewrite_identity_fingerprint: compatibilityDigest({ settings_id: savedSettings.settings_id, revision: settingsRevision }),
      prewrite_content_fingerprint: compatibilityDigest(savedSettings),
      symlink_policy: "forbid",
      resource_lock_id: "next-workflow-agent-selection-settings",
      integration_order: ["next-workflow-settings-manager"]
    },
    bindings: resolved.bindings,
    sources: resolved.sources,
    now: issuedAt,
  });
}

function runtimeStoreOptions({ createIdentity = false } = {}) {
  const identity = runtimeIdentity({ create: createIdentity });
  const databasePath = process.env.NEXT_WORKFLOW_STORE_PATH || path.join(ROOT, ".workflow-state", `workflow-${identity.checkout_instance_id}.sqlite`);
  return { repositoryRoot: ROOT, databasePath, expectedIdentity: identity };
}

function protectedProductionStore({ createIdentity = false, mode = "readwrite" } = {}) {
  const identity = runtimeIdentity({ create: createIdentity });
  const runtimeTrust = loadProtectedRuntimeTrust({
    repositoryRoot: ROOT,
    repositoryLogicalId: identity.repository_logical_id,
    checkoutInstanceId: identity.checkout_instance_id,
    trustPath: process.env.NEXT_WORKFLOW_OWNER_TRUST_PATH || defaultOwnerTrustPath(),
  });
  const databasePath = path.join(ROOT, runtimeTrust.production_state.database_relative_path);
  const options = {
    repositoryRoot: ROOT,
    databasePath,
    expectedIdentity: identity,
    expectedGenerationId: runtimeTrust.production_state.generation_id,
  };
  const receiptAuthority = createProtectedReceiptAuthority({ runtimeTrust, authorityId: HEADLESS_RUNTIME_AUTHORITIES.receipt });
  const runtimeRecoveryAuthorizer = createProtectedRuntimeRecoveryAuthorizer({ runtimeTrust, authorityId: HEADLESS_RUNTIME_AUTHORITIES.runtimeRecovery });
  let store;
  const finalizationFenceVerifier = createProtectedFinalizationFenceVerifier({
    runtimeTrust,
    authorityId: HEADLESS_RUNTIME_AUTHORITIES.finalization,
    activationFingerprintProvider: ({ intent }) => intent.activation_fp,
    policyRevisionProvider: ({ intent }) => intent.policy_revision,
    settingsRevisionProvider: ({ intent }) => intent.settings_revision,
    authorityEpochProvider: () => store.revocation_epoch,
  });
  store = openWorkflowStateStore({
    ...options,
    receiptProofVerifier: receiptAuthority.verifier,
    finalizationFenceVerifier,
    runtimeRecoveryAuthorizer,
    protectedRuntimeVerifiers: true,
    mode,
  });
  return { store, runtimeTrust, identity: options.expectedIdentity, databasePath: options.databasePath };
}

function defaultProductionTask() {
  return {
    schema_version: "1.0.0",
    task_id: "runtime-recovery",
    summary: "Reconcile pending headless runtime effects without expanding task authority",
    scope_paths: ["tools"],
    rigor: "L1",
    risk: "high",
    complexity: "low",
  };
}

function productionService({ task = defaultProductionTask() } = {}) {
  const identity = runtimeIdentity({ create: false });
  const runtimeTrust = loadProtectedRuntimeTrust({
    repositoryRoot: ROOT,
    repositoryLogicalId: identity.repository_logical_id,
    checkoutInstanceId: identity.checkout_instance_id,
    trustPath: process.env.NEXT_WORKFLOW_OWNER_TRUST_PATH || defaultOwnerTrustPath(),
  });
  const registry = runtimeRegistry({ runtimeTrust });
  if (registry.entries.filter((entry) => entry.eligible === true).length === 0) throw new Error(`HEADLESS_PRODUCTION_PROVIDER_UNAVAILABLE:${(registry.discovery_blockers ?? []).map((entry) => entry.code).join(",")}`);
  const selectionState = readOnlyState();
  let selectionSettings;
  try {
    selectionSettings = readOnlySelectionSettings(selectionState.store);
  } finally {
    selectionState.store?.close();
  }
  return createHeadlessProductionService({
    repositoryRoot: ROOT,
    repositoryIdentity: identity,
    runtimeTrust,
    registry,
    selectionSettings,
    selectionSettingsProvider: () => {
      const state = readOnlyState();
      try {
        return readOnlySelectionSettings(state.store);
      } finally {
        state.store?.close();
      }
    },
    fallbackActivation: readJson("learning/NEXT_WORKFLOW_ACTIVATION.json"),
    releasePrerequisites: runtimeTrust.release_prerequisites,
    releaseArtifactPaths: DEFAULT_RELEASE_ARTIFACTS,
    task,
    databasePath: path.join(ROOT, runtimeTrust.production_state.database_relative_path),
    runtimeStateRoot: process.env.NEXT_WORKFLOW_RUNTIME_STATE_ROOT || defaultHeadlessRuntimeStateRoot(),
  });
}

async function recoverRuntimeProcesses({ limit = 100 } = {}) {
  const state = protectedProductionStore({ createIdentity: false });
  const { store, runtimeTrust } = state;
  const results = [];
  try {
    const runs = store.listUnresolvedRuntimeRuns().slice(0, limit);
    const launchObservationVerifier = createProtectedLaunchObservationVerifier({ runtimeTrust, authorityId: HEADLESS_RUNTIME_AUTHORITIES.launchObservation });
    const recoveryAuthorizer = createProtectedRuntimeRecoveryAuthorizer({ runtimeTrust, authorityId: HEADLESS_RUNTIME_AUTHORITIES.runtimeRecovery });
    for (const run of runs) {
      const recoveryPlan = run.observation?.recovery_plan;
      if (typeof recoveryPlan?.input_root !== "string" || typeof recoveryPlan?.output_root !== "string") {
        results.push({ run_id: run.run_id, result: "unknown", recovery: "manual_required", code: "RUNTIME_RECOVERY_ROOTS_UNAVAILABLE" });
        continue;
      }
      try {
        const containment = createLinuxIsolatedContainment({
          runtimeTrust,
          authorityId: HEADLESS_RUNTIME_AUTHORITIES.containment,
          inputRoot: recoveryPlan.input_root,
          outputRoot: recoveryPlan.output_root,
          recoveryOnly: true,
        });
        const lifecycle = createHeadlessRecoveryLifecycle({ store, launchObservationVerifier, containment, recoveryAuthorizer });
        results.push(await lifecycle.recover(run.run_id));
      } catch (error) {
        results.push({ run_id: run.run_id, result: "unknown", recovery: "manual_required", code: error?.message ?? "RUNTIME_RECOVERY_FAILED" });
      }
    }
    const remainingCapacity = Math.max(0, limit - runs.length);
    const agentRuns = store.listUnresolvedAgentRuns().slice(0, remainingCapacity);
    for (const run of agentRuns) {
      try {
        results.push(await recoverUnresolvedAgentRun({
          store,
          runId: run.id,
          recoveryAuthorizer,
        }));
      } catch (error) {
        results.push({ run_id: run.id, decision: "STOP", recovery: "manual_required", code: error?.message ?? "AGENT_RUN_RECOVERY_FAILED" });
      }
    }
    return {
      attempted: runs.length + agentRuns.length,
      results,
      runtime_remaining: store.listUnresolvedRuntimeRuns().length,
      effect_remaining: store.listUnresolvedEffects().length,
      agent_remaining: store.listUnresolvedAgentRuns().length,
      provider_started: false,
    };
  } finally {
    store.close();
  }
}

function runtimeSelectionTeam() {
  const repositoryIdentity = readJson("learning/NEXT_WORKFLOW_REPOSITORY_IDENTITY.json");
  return [
    ["orchestrator", "orchestrator"],
    ["lead-value-design", "director"],
    ["lead-planning-design", "planner"],
    ["lead-implementation", "builder"],
    ["lead-independent-review", "reviewer_gate"],
    ["lead-safety-acceptance", "validator"],
    ["task-template", "task"],
  ].map(([agent_id, role_id]) => ({ agent_id, role_id, team_id: "next-development-workflow-team", repository_id: repositoryIdentity.repository_logical_id, context_id: "next-development-workflow" }));
}

function settingsManager() {
  const defaults = readJson("learning/NEXT_WORKFLOW_AGENT_SELECTION_SETTINGS.json");
  const store = openWorkflowStateStore(runtimeStoreOptions({ createIdentity: true }));
  return {
    store,
    manager: createAgentSelectionSettingsManager({
      store,
      defaults,
      registryProvider: (context) => runtimeRegistry(context),
      authorityProvider: (context) => runtimeSettingsAuthority(context),
      teamProvider: runtimeSelectionTeam,
    }),
  };
}

function readOnlyState() {
  let identity;
  try {
    identity = runtimeIdentity({ create: false });
  } catch (error) {
    if (error?.code === "CHECKOUT_IDENTITY_MISSING") return { status: "not_initialized", identity: null, store: null };
    throw error;
  }
  try {
    const store = openWorkflowStateStore({ ...runtimeStoreOptions({ createIdentity: false }), mode: "readonly" });
    return { status: "available", identity, store };
  } catch (error) {
    if (error?.message === "STORE_NOT_FOUND") return { status: "not_initialized", identity, store: null };
    throw error;
  }
}

function readOnlySelectionCatalog({ store, registry }) {
  const defaults = readJson("learning/NEXT_WORKFLOW_AGENT_SELECTION_SETTINGS.json");
  const queryStore = store ?? { query: () => ({ records: [] }) };
  return createAgentSelectionSettingsManager({
    store: queryStore,
    defaults,
    registryProvider: () => registry,
    authorityProvider: () => { throw new Error("READ_ONLY_CATALOG_HAS_NO_WRITE_AUTHORITY"); },
    teamProvider: runtimeSelectionTeam,
  }).catalog();
}

function readOnlySelectionSettings(store) {
  const defaults = readJson("learning/NEXT_WORKFLOW_AGENT_SELECTION_SETTINGS.json");
  const queryStore = store ?? { query: () => ({ records: [] }) };
  return createAgentSelectionSettingsManager({
    store: queryStore,
    defaults,
    registryProvider: () => { throw new Error("READ_ONLY_SETTINGS_HAS_NO_PROVIDER_REGISTRY"); },
    authorityProvider: () => { throw new Error("READ_ONLY_SETTINGS_HAS_NO_WRITE_AUTHORITY"); },
    teamProvider: runtimeSelectionTeam,
  }).current();
}

function developmentSelectionAgent() {
  const agentId = option("--agent");
  if (typeof agentId !== "string" || !/^[a-z0-9][a-z0-9_-]{0,63}$/.test(agentId)) throw new Error("DEVELOPMENT_SELECTION_AGENT_REQUIRED");
  const existing = runtimeSelectionTeam().find((agent) => agent.agent_id === agentId);
  if (existing) return existing;
  const roleId = option("--role");
  if (typeof roleId !== "string" || !/^[a-z0-9][a-z0-9_-]{0,63}$/.test(roleId)) throw new Error("DEVELOPMENT_SELECTION_ROLE_REQUIRED");
  const repositoryIdentity = readJson("learning/NEXT_WORKFLOW_REPOSITORY_IDENTITY.json");
  return { agent_id: agentId, role_id: roleId, team_id: "next-development-workflow-team", repository_id: repositoryIdentity.repository_logical_id, context_id: "next-development-workflow" };
}

function developmentTaskModelPolicy() {
  return {
    allowed_model_ids: options("--allow-model"),
    denied_model_ids: options("--deny-model"),
    allowed_model_publishers: options("--allow-publisher"),
    denied_model_publishers: options("--deny-publisher"),
    denied_model_prefixes: options("--deny-prefix"),
  };
}

function developmentAgentPlan({ agent, requirements, catalogSet, state, taskModelPolicy = developmentTaskModelPolicy() }) {
  const resolved = resolveAgentSelectionPolicy(readOnlySelectionSettings(state.store), agent);
  if (resolved.decision !== "PASS") return developmentSelectionStop(resolved.code, { inheritance_trace: resolved.trace });
  return selectDevelopmentAgentConfiguration({
    catalogSet,
    policy: resolved.policy,
    requirements: {
      ...requirements,
      capabilities: options("--capability"),
      model_policy: taskModelPolicy,
    },
    budget: { cost: Number(option("--max-cost", "0")) },
    now: catalogSet.observed_at,
  });
}

function persistedActivation(store) {
  const records = store.query({ kind: "NextWorkflowActivation", limit: 1000 }).records;
  if (records.length === 0) return null;
  return structuredClone(records.sort((left, right) => right.record_revision - left.record_revision)[0].payload);
}

function currentActivationStatus() {
  try {
    const { store, runtimeTrust } = protectedProductionStore({ createIdentity: false, mode: "readonly" });
    try {
      const activation = persistedActivation(store);
      if (!activation) throw new Error("PROTECTED_ACTIVATION_RECORD_MISSING");
      if (activation.mode !== "enforced") {
        return {
          schema_version: "1.0.0",
          status: "not_activated",
          decision: "STOP",
          mode: activation.mode,
          protected_state_verified: false,
          candidate_fingerprint: activation.candidate_fingerprint ?? null,
        };
      }
      const now = new Date().toISOString();
      const verified = verifyEnforcedActivationRecord({
        record: activation,
        proofVerifier: createSignedReleaseProofVerifier({ trustDocument: runtimeTrust.release_trust, now: () => now }),
        transitionVerifier: createSignedTransitionVerifier({ trustDocument: runtimeTrust.release_trust, now: () => now }),
        expectedRevocationEpoch: store.revocation_epoch,
        now,
      });
      return {
        schema_version: "1.0.0",
        status: "activated",
        decision: "PASS",
        mode: activation.mode,
        candidate_fingerprint: activation.candidate_fingerprint,
        protected_state_verified: true,
        verification_fingerprint: verified.proof_fingerprint,
      };
    } finally {
      store.close();
    }
  } catch (error) {
    return {
      schema_version: "1.0.0",
      status: "unavailable",
      decision: "STOP",
      mode: "planned",
      code: error?.message ?? "PROTECTED_PRODUCTION_STATE_UNAVAILABLE",
      protected_state_verified: false,
    };
  }
}

function requireVerifiedProductionLaunch() {
  const identity = runtimeIdentity({ create: false });
  const runtimeTrust = loadProtectedRuntimeTrust({
    repositoryRoot: ROOT,
    repositoryLogicalId: identity.repository_logical_id,
    checkoutInstanceId: identity.checkout_instance_id,
    trustPath: process.env.NEXT_WORKFLOW_OWNER_TRUST_PATH || defaultOwnerTrustPath(),
  });
  const runtimeRoot = process.env.NEXT_WORKFLOW_VERIFIED_RUNTIME_ROOT;
  if (typeof runtimeRoot !== "string"
    || !path.isAbsolute(runtimeRoot)
    || realpathSync(runtimeRoot) !== SOURCE_ROOT
    || !fileURLToPath(import.meta.url).startsWith(`${SOURCE_ROOT}${path.sep}`)) throw new Error("VERIFIED_PRODUCTION_RUNTIME_SNAPSHOT_REQUIRED");
  let parentExecutable;
  let parentArguments;
  try {
    parentExecutable = realpathSync(`/proc/${process.ppid}/exe`);
    parentArguments = readFileSync(`/proc/${process.ppid}/cmdline`).toString("utf8").split("\0").filter(Boolean);
  } catch {
    throw new Error("VERIFIED_PRODUCTION_LAUNCHER_PARENT_REQUIRED");
  }
  if (parentExecutable !== runtimeTrust.runtime_launcher.interpreter_path
    || parentArguments.length < 2
    || realpathSync(parentArguments[1]) !== runtimeTrust.runtime_launcher.script_path) throw new Error("VERIFIED_PRODUCTION_LAUNCHER_PARENT_REQUIRED");
  const { store } = protectedProductionStore({ createIdentity: false, mode: "readonly" });
  try {
    const activation = persistedActivation(store);
    if (activation?.mode !== "enforced" || !/^[a-f0-9]{64}$/u.test(activation.candidate_fingerprint ?? "")) throw new Error("VERIFIED_PRODUCTION_LAUNCH_ACTIVATION_REQUIRED");
    const expected = compatibilityDigest({
      candidate_fingerprint: activation.candidate_fingerprint,
      launcher_fingerprint: runtimeTrust.runtime_launcher.fingerprint,
    });
    if (process.env.NEXT_WORKFLOW_VERIFIED_LAUNCH !== expected) throw new Error(`VERIFIED_PRODUCTION_LAUNCH_REQUIRED:${runtimeTrust.runtime_launcher.path}`);
  } finally {
    store.close();
  }
}

function productionActivationVerifier(clock = () => new Date().toISOString(), revocationEpochProvider) {
  return async ({ record, record_fingerprint: recordFingerprint }) => {
    if (record.mode !== "enforced") return { trusted: true, record_fingerprint: recordFingerprint, proof_fingerprint: compatibilityDigest({ source: "non-enforced-fail-closed", record_fingerprint: recordFingerprint }) };
    try {
      if (typeof revocationEpochProvider !== "function") throw new Error("ACTIVATION_LIVE_EPOCH_PROVIDER_REQUIRED");
      const expectedRevocationEpoch = revocationEpochProvider();
      const trustDocument = releaseTrustDocument();
      const verification = verifyEnforcedActivationRecord({ record, proofVerifier: createSignedReleaseProofVerifier({ trustDocument, now: clock }), transitionVerifier: createSignedTransitionVerifier({ trustDocument, now: clock }), expectedRevocationEpoch, now: clock() });
      return verification.trusted === true && verification.record_fingerprint === recordFingerprint
        ? verification
        : { trusted: false, record_fingerprint: recordFingerprint, proof_fingerprint: compatibilityDigest({ reason: "ACTIVATION_RECORD_BINDING_INVALID", record_fingerprint: recordFingerprint }) };
    } catch {
      return { trusted: false, record_fingerprint: recordFingerprint, proof_fingerprint: compatibilityDigest({ reason: "ACTIVATION_RECORD_VERIFICATION_FAILED", record_fingerprint: recordFingerprint }) };
    }
  };
}

function productionRuntime(store) {
  const clock = () => new Date().toISOString();
  const activationProvider = () => persistedActivation(store) ?? readJson("learning/NEXT_WORKFLOW_ACTIVATION.json");
  const activationVerifier = productionActivationVerifier(clock, () => store.revocation_epoch);
  const currentCandidateProvider = async ({ activation }) => {
    const definition = activation.candidate_definition;
    if (!definition || !/^[a-f0-9]{40,64}$/.test(definition.repository_tree ?? "")) throw new Error("ACTIVE_CANDIDATE_DEFINITION_REQUIRED");
    const contracts = await loadContracts({ repositoryRoot: ROOT });
    const validation = validateContractSet(contracts);
    if (!validation.ok) throw new Error("ACTIVE_CANDIDATE_CONTRACT_INVALID");
    return verifyRepositoryReleaseDeployment({
      repositoryRoot: ROOT,
      candidateDefinition: definition,
      signedReleaseProofs: activation.signed_release_proofs,
      contractFingerprint: compatibilityDigest(validation.fingerprints),
      releasePrerequisites: releasePrerequisites(),
      nodeVersion: process.versions.node,
    });
  };
  const unavailableObserver = {
    async observe() { throw new Error("PROVIDER_OPERATIONAL_OBSERVER_NOT_CONFIGURED"); },
    async reconcile() { throw new Error("PROVIDER_RECONCILIATION_OBSERVER_NOT_CONFIGURED"); },
  };
  return createNextWorkflowRuntime({
    store,
    registryProvider: () => runtimeRegistry(),
    sourceProvider: () => { throw new Error("AUTHORITATIVE_RUNTIME_SOURCE_PROVIDER_NOT_CONFIGURED"); },
    activationProvider,
    activationVerifier,
    currentCandidateProvider,
    reconciliationAuthorizer: () => ({ decision: "DENY" }),
    receiptVerifier: () => { throw new Error("INDEPENDENT_RUNTIME_RECEIPT_VERIFIER_NOT_CONFIGURED"); },
    providerObserver: unavailableObserver,
    clock,
  });
}

function releaseTrustDocument() {
  return protectedTrustBundle().release_trust;
}

function releasePrerequisites() {
  return protectedTrustBundle().release_prerequisites;
}

function protectedTrustBundle() {
  const identity = runtimeIdentity({ create: false });
  return loadProtectedRuntimeTrust({
    repositoryRoot: ROOT,
    repositoryLogicalId: identity.repository_logical_id,
    checkoutInstanceId: identity.checkout_instance_id,
    trustPath: process.env.NEXT_WORKFLOW_OWNER_TRUST_PATH || defaultOwnerTrustPath(),
  });
}

function releasePrivateKeyPath() {
  return process.env.NEXT_WORKFLOW_RELEASE_PRIVATE_KEY_PATH
    || path.join(path.dirname(process.env.NEXT_WORKFLOW_OWNER_TRUST_PATH || defaultOwnerTrustPath()), "release-signing-key.pem");
}

function releaseSourcePrivateKeyPath() {
  return process.env.NEXT_WORKFLOW_RELEASE_SOURCE_PRIVATE_KEY_PATH
    || path.join(path.dirname(process.env.NEXT_WORKFLOW_OWNER_TRUST_PATH || defaultOwnerTrustPath()), "release-source-signing-key.pem");
}

const DEFAULT_RELEASE_ARTIFACTS = [
  "docs/as-built/IMPLEMENTATION_PLAN.md",
  "docs/as-built/REQUIREMENTS.md",
  "docs/as-built/SPECIFICATION.md",
  "docs/workflow/AS_BUILT_SYNC_CONTRACT.tsv",
  "docs/workflow/DEVELOPMENT_INSTRUCTION_POLICY.tsv",
  "docs/workflow/FINAL_GATE_GAP_COMMANDS.tsv",
  "docs/workflow/HANDOFF.md",
  "docs/workflow/INSTRUCTION_MEMORY.md",
  "docs/workflow/TASK_TRACKER.md",
  "docs/workflow/TEST_PLAN_MANIFEST.tsv",
  "docs/workflow/next-workflow/authority-lifecycle.json",
  "docs/workflow/next-workflow/context-impact.json",
  "docs/workflow/next-workflow/parent-child-authority.json",
  "docs/workflow/next-workflow/provider-registry.json",
  "docs/workflow/next-workflow/shadow-compatibility.json",
  "docs/workflow/next-workflow/state-store.json",
  "docs/workflow/next-workflow/team-agent-security.json",
  "learning/NEXT_WORKFLOW_ACTIVATION.json",
  "learning/NEXT_WORKFLOW_AGENT_SELECTION_SETTINGS.json",
  "learning/NEXT_WORKFLOW_PROVIDER_REGISTRY.json",
  "learning/NEXT_WORKFLOW_RELEASE_PREREQUISITES.json",
  "learning/NEXT_WORKFLOW_RELEASE_TRUST.json",
  "skills/repository-development-workflow/SKILL.md",
  "skills/repository-development-workflow/references/repository-development.md",
  "tools/next-workflow.mjs",
  "tools/lib/development_instruction.mjs",
  "tools/lib/next_workflow/agents.mjs",
  "tools/lib/next_workflow/authority.mjs",
  "tools/lib/next_workflow/compatibility.mjs",
  "tools/lib/next_workflow/contracts.mjs",
  "tools/lib/next_workflow/headless_bootstrap.mjs",
  "tools/lib/next_workflow/headless_plan.mjs",
  "tools/lib/next_workflow/headless_runtime.mjs",
  "tools/lib/next_workflow/headless_service.mjs",
  "tools/lib/next_workflow/identity.mjs",
  "tools/lib/next_workflow/provider_discovery.mjs",
  "tools/lib/next_workflow/providers.mjs",
  "tools/lib/next_workflow/projection.mjs",
  "tools/lib/next_workflow/release.mjs",
  "tools/lib/next_workflow/release_signing.mjs",
  "tools/lib/next_workflow/release_source_receipts.mjs",
  "tools/lib/next_workflow/release_trust.mjs",
  "tools/lib/next_workflow/run_controller.mjs",
  "tools/lib/next_workflow/run_lifecycle.mjs",
  "tools/lib/next_workflow/runtime.mjs",
  "tools/lib/next_workflow/runtime_barrier.cjs",
  "tools/lib/next_workflow/runtime_containment.mjs",
  "tools/lib/next_workflow/runtime_trust.mjs",
  "tools/lib/next_workflow/saga.mjs",
  "tools/lib/next_workflow/secret_policy.mjs",
  "tools/next-workflow-launcher.cjs",
  "tools/lib/next_workflow/settings.mjs",
  "tools/lib/next_workflow/store.mjs",
  "tools/lib/next_workflow/task_delivery.mjs",
  "tools/lib/next_workflow/migrations/001_initial.sql",
  "tools/lib/next_workflow/migrations/002_saga_replay.sql",
  "tools/lib/next_workflow/migrations/003_runtime_wiring.sql",
  "tools/test_next_workflow.sh",
  "tools/test_next_workflow_agents.mjs",
  "tools/test_next_workflow_development_selection.mjs",
  "tools/test_next_workflow_development_selection.sh",
  "tools/test_next_workflow_headless_bootstrap.mjs",
  "tools/test_next_workflow_headless_bootstrap.sh",
  "tools/test_next_workflow_headless_plan.mjs",
  "tools/test_next_workflow_headless_plan.sh",
  "tools/test_next_workflow_headless_runtime.mjs",
  "tools/test_next_workflow_headless_runtime.sh",
  "tools/test_next_workflow_release.mjs",
  "tools/test_next_workflow_release_signing.mjs",
  "tools/test_next_workflow_release_signing.sh",
  "tools/test_next_workflow_run_controller.mjs",
  "tools/test_next_workflow_run_controller.sh",
  "tools/test_next_workflow_task_delivery.mjs",
];

const command = args[0] ?? "help";
if (command === "projection") {
  const state = readOnlyState();
  try {
    const registry = runtimeRegistry();
    const projection = await loadDefaultNextWorkflowProjection({ repositoryRoot: ROOT, providerRegistry: registry, activationRecord: state.store ? persistedActivation(state.store) ?? undefined : undefined, activationVerifier: productionActivationVerifier(() => new Date().toISOString(), state.store ? () => state.store.revocation_epoch : undefined), selectionCatalog: readOnlySelectionCatalog({ store: state.store, registry }), store: state.store, storeStatus: state.status });
    print(projection);
  } finally {
    state.store?.close();
  }
} else if (command === "contracts") {
  print(validateContractSet(await loadContracts({ repositoryRoot: ROOT })));
} else if (command === "store-health") {
  const state = readOnlyState();
  try { print(state.store ? state.store.health({ integrity: option("--integrity", "quick") }) : { status: state.status, integrity: "not_run", revision: 0 }); } finally { state.store?.close(); }
} else if (command === "identity") {
  const action = args[1] ?? "status";
  if (action === "status") {
    const state = readOnlyState();
    try { print(state.identity ? { status: "available", ...state.identity } : { status: state.status }); } finally { state.store?.close(); }
  }
  else if (action === "reattest") {
    if (!args.includes("--confirm")) throw new Error("IDENTITY_REATTEST_CONFIRMATION_REQUIRED");
    print(runtimeIdentity({ create: true, reattest: true }));
  } else throw new Error(`UNKNOWN_IDENTITY_ACTION:${action}`);
} else if (command === "activation") {
  const action = args[1] ?? "status";
  if (action !== "status") throw new Error(`UNKNOWN_ACTIVATION_ACTION:${action}`);
  print(currentActivationStatus());
} else if (command === "release") {
  const action = args[1] ?? "status";
  if (action === "status") {
    print(currentActivationStatus());
  } else if (action === "candidate") {
    const contracts = await loadContracts({ repositoryRoot: ROOT });
    const validation = validateContractSet(contracts);
    if (!validation.ok) throw new Error("RELEASE_CONTRACT_VALIDATION_FAILED");
    print(freezeRepositoryReleaseCandidate({ repositoryRoot: ROOT, artifactPaths: options("--artifact").length ? options("--artifact") : DEFAULT_RELEASE_ARTIFACTS, contractFingerprint: compatibilityDigest(validation.fingerprints), releasePrerequisites: releasePrerequisites() }));
  } else if (action === "proofs-verify") {
    const candidateFingerprint = option("--candidate");
    const bundle = readRepositoryBoundJson(option("--bundle"), "learning/NEXT_WORKFLOW_RELEASE_PROOFS.json");
    const now = new Date().toISOString();
    const candidateDefinition = bundle.candidate_definition ?? bundle.candidate;
    const proofVerifier = createSignedReleaseProofVerifier({ trustDocument: releaseTrustDocument(), now: () => now });
    print(candidateDefinition
      ? await verifyReleaseProofs({ candidateFingerprint, candidateDefinition, proofs: bundle.proofs ?? bundle, proofVerifier, now })
      : { status: "failed", candidate_fingerprint: candidateFingerprint, missing: ["candidate_definition"], mismatched: [], stale: [], incorrect: [], invalid: ["release_lineage"], verified_proofs: {}, verified_at: now });
  } else if (action === "source-receipt") {
    if (!args.includes("--confirm")) throw new Error("RELEASE_SOURCE_RECEIPT_CONFIRMATION_REQUIRED");
    const candidateDefinition = readRepositoryBoundJson(option("--candidate-file"), ".workflow-state/next-workflow-release-candidate.json");
    const evidence = readRepositoryBoundJson(option("--evidence"), ".workflow-state/next-workflow-source-evidence.json");
    const runtimeTrust = protectedTrustBundle();
    const common = {
      repositoryRoot: ROOT,
      runtimeTrust,
      privateKeyPath: releaseSourcePrivateKeyPath(),
      candidateFingerprint: candidateDefinition.candidate_fingerprint,
      evidence,
      ...(option("--fresh-until") ? { freshUntil: option("--fresh-until") } : {}),
    };
    print(option("--mode")
      ? createSignedTransitionSourceReceipt({ ...common, nextMode: option("--mode") })
      : createSignedReleaseSourceReceipt({ ...common, kind: option("--kind") }));
  } else if (action === "sign-bundle") {
    if (!args.includes("--confirm")) throw new Error("RELEASE_SIGNING_CONFIRMATION_REQUIRED");
    const candidateDefinition = readRepositoryBoundJson(option("--candidate-file"), ".workflow-state/next-workflow-release-candidate.json");
    const sourceReceipts = readRepositoryBoundJson(option("--receipts"), ".workflow-state/next-workflow-release-source-receipts.json");
    const runtimeTrust = protectedTrustBundle();
    print(createSignedReleaseBundle({
      repositoryRoot: ROOT,
      runtimeTrust,
      privateKeyPath: releasePrivateKeyPath(),
      candidateDefinition,
      sourceReceipts,
      ...(option("--fresh-until") ? { freshUntil: option("--fresh-until") } : {}),
    }));
  } else if (action === "sign-transition") {
    if (!args.includes("--confirm")) throw new Error("TRANSITION_SIGNING_CONFIRMATION_REQUIRED");
    const candidateDefinition = readRepositoryBoundJson(option("--candidate-file"), ".workflow-state/next-workflow-release-candidate.json");
    const stageReceipt = readRepositoryBoundJson(option("--stage-receipt"), ".workflow-state/next-workflow-transition-source-receipt.json");
    const runtimeTrust = protectedTrustBundle();
    print(createSignedTransitionEvidence({
      repositoryRoot: ROOT,
      runtimeTrust,
      privateKeyPath: releasePrivateKeyPath(),
      candidateDefinition,
      nextMode: option("--mode"),
      stageReceipt,
      ...(option("--fresh-until") ? { freshUntil: option("--fresh-until") } : {}),
    }));
  } else if (action === "transition") {
    if (!args.includes("--confirm")) throw new Error("ACTIVATION_TRANSITION_CONFIRMATION_REQUIRED");
    const bundle = readRepositoryBoundJson(option("--evidence"), "learning/NEXT_WORKFLOW_ACTIVATION_TRANSITION.json");
    const now = new Date().toISOString();
    const { store } = protectedProductionStore({ createIdentity: false });
    try { print(await persistActivationTransition({ store, expectedRevision: Number(option("--expect-revision")), candidateFingerprint: option("--candidate"), candidateDefinition: bundle.candidate_definition ?? bundle.candidate, nextMode: option("--mode"), evidence: bundle.evidence ?? bundle, transitionVerifier: createSignedTransitionVerifier({ trustDocument: releaseTrustDocument(), now: () => now }), releasePrerequisites: releasePrerequisites(), now })); } finally { store.close(); }
  } else if (action === "activate") {
    if (!args.includes("--confirm")) throw new Error("ACTIVATION_CONFIRMATION_REQUIRED");
    const bundle = readRepositoryBoundJson(option("--bundle"), "learning/NEXT_WORKFLOW_RELEASE_PROOFS.json");
    const now = new Date().toISOString();
    const { store } = protectedProductionStore({ createIdentity: false });
    try { const trustDocument = releaseTrustDocument(); print(await completeActivation({ store, expectedRevision: Number(option("--expect-revision")), candidateFingerprint: option("--candidate"), proofs: bundle.proofs ?? bundle, proofVerifier: createSignedReleaseProofVerifier({ trustDocument, now: () => now }), transitionVerifier: createSignedTransitionVerifier({ trustDocument, now: () => now }), releasePrerequisites: releasePrerequisites(), now })); } finally { store.close(); }
  } else throw new Error(`UNKNOWN_RELEASE_ACTION:${action}`);
} else if (command === "runtime") {
  const action = args[1] ?? "status";
  if (action === "isolation-check") {
    print(diagnoseLinuxIsolationPrerequisites());
  } else if (action === "owner-enroll") {
    if (!args.includes("--confirm")) throw new Error("OWNER_IDENTITY_CONFIRMATION_REQUIRED");
    const trustDirectory = path.dirname(process.env.NEXT_WORKFLOW_OWNER_TRUST_PATH || defaultOwnerTrustPath());
    print(createHeadlessOwnerIdentity({
      repositoryRoot: ROOT,
      anchorPath: path.resolve(option("--anchor", path.join(trustDirectory, "owner-anchor.json"))),
      privateKeyPath: path.resolve(option("--private-key", path.join(trustDirectory, "owner-acceptance-key.pem"))),
    }));
  } else if (action === "acceptance-create") {
    if (!args.includes("--confirm")) throw new Error("OWNER_ACCEPTANCE_CONFIRMATION_REQUIRED");
    const identity = runtimeIdentity({ create: true });
    const trustDirectory = path.dirname(process.env.NEXT_WORKFLOW_OWNER_TRUST_PATH || defaultOwnerTrustPath());
    print(createHeadlessOwnerAcceptance({
      repositoryRoot: ROOT,
      repositoryIdentity: identity,
      releasePrerequisites: readJson("learning/NEXT_WORKFLOW_RELEASE_PREREQUISITES.json"),
      acceptancePath: path.resolve(option("--output", path.join(trustDirectory, "owner-acceptance.json"))),
      privateKeyPath: path.resolve(option("--private-key", path.join(trustDirectory, "owner-acceptance-key.pem"))),
      ownerAnchorPath: path.resolve(option("--anchor", path.join(trustDirectory, "owner-anchor.json"))),
    }));
  } else if (action === "bootstrap") {
    if (!args.includes("--confirm")) throw new Error("HEADLESS_RUNTIME_BOOTSTRAP_CONFIRMATION_REQUIRED");
    const prerequisites = diagnoseLinuxIsolationPrerequisites();
    if (prerequisites.available !== true) {
      print({ decision: "STOP", code: "HEADLESS_RUNTIME_ISOLATION_UNAVAILABLE", prerequisites });
      process.exitCode = 1;
    } else {
      const identity = runtimeIdentity({ create: true });
      print(bootstrapHeadlessRuntimeTrust({
        repositoryRoot: ROOT,
        repositoryIdentity: identity,
        releasePrerequisites: readJson("learning/NEXT_WORKFLOW_RELEASE_PREREQUISITES.json"),
        ownerAcceptancePath: path.resolve(option("--owner-acceptance", path.join(path.dirname(process.env.NEXT_WORKFLOW_OWNER_TRUST_PATH || defaultOwnerTrustPath()), "owner-acceptance.json"))),
        ownerAnchorPath: path.resolve(option("--owner-anchor", path.join(path.dirname(process.env.NEXT_WORKFLOW_OWNER_TRUST_PATH || defaultOwnerTrustPath()), "owner-anchor.json"))),
        trustPath: process.env.NEXT_WORKFLOW_OWNER_TRUST_PATH || defaultOwnerTrustPath(),
        providerAuthPath: process.env.NEXT_WORKFLOW_CODEX_AUTH_PATH,
        runtimeStateRoot: process.env.NEXT_WORKFLOW_RUNTIME_STATE_ROOT || defaultHeadlessRuntimeStateRoot(),
      }));
    }
  } else if (action === "status") {
    try {
      const { store, runtimeTrust, databasePath } = protectedProductionStore({ createIdentity: false, mode: "readonly" });
      try {
        const isolation = diagnoseLinuxIsolationPrerequisites();
        if (isolation.available !== true) throw new Error("HEADLESS_RUNTIME_ISOLATION_UNAVAILABLE");
        const activation = persistedActivation(store);
        if (!activation) throw new Error("PROTECTED_ACTIVATION_RECORD_MISSING");
        const health = store.health({ integrity: "quick" });
        const unresolvedEffects = store.listUnresolvedEffects().length;
        const unresolvedRuntimeRuns = store.listUnresolvedRuntimeRuns().length;
        const unresolvedAgentRuns = store.listUnresolvedAgentRuns().length;
        if (activation.mode !== "enforced") {
          print({
            status: "not_activated",
            decision: "STOP",
            production_available: false,
            code: "HEADLESS_RUNTIME_ACTIVATION_REQUIRED",
            activation,
            isolation,
            store: health,
            database_path: databasePath,
            trust_fingerprint: runtimeTrust.fingerprint,
            provider_preflight_required: true,
            unresolved_effects: unresolvedEffects,
            unresolved_runtime_runs: unresolvedRuntimeRuns,
            unresolved_agent_runs: unresolvedAgentRuns,
            direct_adapter_access: false,
          });
        } else {
          const now = new Date().toISOString();
          const verifiedActivation = verifyEnforcedActivationRecord({
          record: activation,
          proofVerifier: createSignedReleaseProofVerifier({ trustDocument: runtimeTrust.release_trust, now: () => now }),
          transitionVerifier: createSignedTransitionVerifier({ trustDocument: runtimeTrust.release_trust, now: () => now }),
          expectedRevocationEpoch: store.revocation_epoch,
          now,
        });
          if (unresolvedEffects !== 0 || unresolvedRuntimeRuns !== 0 || unresolvedAgentRuns !== 0) throw new Error("HEADLESS_RUNTIME_RECOVERY_REQUIRED");
          print({
            status: "preflight_required",
            decision: "STOP",
            production_available: false,
            code: "HEADLESS_RUNTIME_OPERATIONAL_PREFLIGHT_REQUIRED",
            activation,
            activation_verification_fingerprint: verifiedActivation.proof_fingerprint,
            isolation,
            store: health,
            database_path: databasePath,
            trust_fingerprint: runtimeTrust.fingerprint,
            provider_preflight_required: true,
            candidate_preflight_required: true,
            unresolved_effects: unresolvedEffects,
            unresolved_runtime_runs: unresolvedRuntimeRuns,
            unresolved_agent_runs: unresolvedAgentRuns,
            direct_adapter_access: false,
          });
        }
      } finally {
        store.close();
      }
    } catch (error) {
      print({
        status: "initialization_required",
        decision: "STOP",
        production_available: false,
        code: error?.message ?? "HEADLESS_RUNTIME_UNAVAILABLE",
        activation_mode: readJson("learning/NEXT_WORKFLOW_ACTIVATION.json").mode,
        setup_steps: [
          {
            order: 1,
            id: "isolation_check",
            command: "node tools/next-workflow.mjs runtime isolation-check",
          },
          {
            order: 2,
            id: "owner_enrollment",
            command: "node tools/next-workflow.mjs runtime owner-enroll --confirm",
            produces: "owner_anchor_path",
          },
          {
            order: 3,
            id: "owner_acceptance",
            command: "node tools/next-workflow.mjs runtime acceptance-create --confirm",
            produces: "owner_acceptance_path",
          },
          {
            order: 4,
            id: "bootstrap",
            command: "node tools/next-workflow.mjs runtime bootstrap --owner-acceptance <owner_acceptance_path> --owner-anchor <owner_anchor_path> --confirm",
          },
        ],
        direct_adapter_access: false,
      });
    }
  } else if (action === "effect-preview") {
    const effectPath = option("--effect");
    if (!effectPath) throw new Error("RUNTIME_EFFECT_FILE_REQUIRED");
    const state = readOnlyState();
    if (!state.store) throw new Error("RUNTIME_STORE_NOT_INITIALIZED");
    try { print(await productionRuntime(state.store).previewEffect(readRepositoryBoundJson(effectPath, effectPath))); } finally { state.store.close(); }
  } else if (action === "reconcile") {
    if (!args.includes("--confirm")) throw new Error("RUNTIME_RECONCILIATION_CONFIRMATION_REQUIRED");
    requireVerifiedProductionLaunch();
    const limit = Number(option("--limit", "100"));
    const recovery = await recoverRuntimeProcesses({ limit });
    if (recovery.runtime_remaining !== 0 || recovery.agent_remaining !== 0) {
      print({ decision: "STOP", code: recovery.agent_remaining !== 0 ? "AGENT_RUN_RECOVERY_REQUIRED" : "RUNTIME_PROCESS_RECOVERY_INCOMPLETE", recovery });
      process.exitCode = 1;
    } else if (recovery.effect_remaining === 0) {
      print({ decision: "PASS", recovery, reconciliation: { attempted: 0, remaining: 0, results: [] } });
    } else {
      let service;
      try {
        service = productionService();
        const reconciliation = await service.runtime.reconcilePending({ targetId: option("--target"), limit: Math.max(1, limit - recovery.attempted) });
        print({ decision: reconciliation.remaining === 0 && reconciliation.runtime_remaining === 0 ? "PASS" : "STOP", recovery, reconciliation });
        if (reconciliation.remaining !== 0 || reconciliation.runtime_remaining !== 0) process.exitCode = 1;
      } catch (error) {
        print({ decision: "STOP", code: error?.message ?? "RUNTIME_EFFECT_RECONCILIATION_UNAVAILABLE", recovery, provider_started: false });
        process.exitCode = 1;
      } finally {
        service?.close({ cleanup: true });
      }
    }
  } else throw new Error(`UNKNOWN_RUNTIME_ACTION:${action}`);
} else if (command === "settings") {
  const action = args[1] ?? "catalog";
  if (action === "catalog") {
    const state = readOnlyState();
    try { const registry = runtimeRegistry(); print(readOnlySelectionCatalog({ store: state.store, registry })); } finally { state.store?.close(); }
  } else {
    const { store, manager } = settingsManager();
    try {
      if (action === "dry-run") print(manager.dryRun({ scope: option("--scope"), subjectId: option("--subject"), mode: option("--mode"), identityKey: option("--identity", null), expectedRevision: Number(option("--expect-revision")) }));
      else if (action === "revert-dry-run") print(manager.revertDryRun({ receiptId: option("--receipt"), expectedRevision: Number(option("--expect-revision")) }));
      else if (action === "apply") print(manager.apply({ token: option("--token"), confirm: args.includes("--confirm") }));
      else throw new Error(`UNKNOWN_SETTINGS_ACTION:${action}`);
    } finally { store.close(); }
  }
} else if (command === "agent-selection") {
  const action = args[1] ?? "plan";
  if (action === "plan") {
    const now = new Date().toISOString();
    const providerDocument = readRepositoryBoundJson(process.env.NEXT_WORKFLOW_PROVIDER_REGISTRY_FILE, "learning/NEXT_WORKFLOW_PROVIDER_REGISTRY.json");
    const catalogSet = observeBuiltinProviderCatalogs({ adapterFamilies: providerDocument.adapter_families ?? [], clock: () => now });
    const state = readOnlyState();
    try {
      const agent = developmentSelectionAgent();
      print(developmentAgentPlan({
        agent,
        catalogSet,
        state,
        requirements: {
          agent_id: agent.agent_id,
          role: agent.role_id,
          rigor: option("--rigor", "L3"),
          risk: option("--risk", "normal"),
          complexity: option("--complexity", "normal"),
          objective: option("--objective", "auto"),
        },
      }));
    } finally {
      state.store?.close();
    }
  } else if (action === "verify-config") {
    const planPath = option("--plan");
    if (!planPath) throw new Error("DEVELOPMENT_SELECTION_PLAN_FILE_REQUIRED");
    print(verifyDevelopmentAgentConfiguration({
      plan: readRepositoryBoundJson(planPath, planPath),
      preparedModel: option("--model"),
      preparedNativeReasoning: option("--effort"),
    }));
  } else throw new Error(`UNKNOWN_AGENT_SELECTION_ACTION:${action}`);
} else if (command === "team") {
  const action = args[1] ?? "plan";
  if (action === "plan") {
    const task = readRepositoryBoundJson(option("--task"), ".workflow-state/headless-task.json");
    const now = new Date().toISOString();
    const providerDocument = readRepositoryBoundJson(process.env.NEXT_WORKFLOW_PROVIDER_REGISTRY_FILE, "learning/NEXT_WORKFLOW_PROVIDER_REGISTRY.json");
    const catalogSet = observeBuiltinProviderCatalogs({ adapterFamilies: providerDocument.adapter_families ?? [], clock: () => now });
    const state = readOnlyState();
    try {
      const repositoryIdentity = readJson("learning/NEXT_WORKFLOW_REPOSITORY_IDENTITY.json");
      print(buildHeadlessTeamPlan({
        task,
        selectionPlanner: ({ agent_id: agentId, role_id: roleId, rigor, risk, complexity }) => developmentAgentPlan({
          agent: { agent_id: agentId, role_id: roleId, team_id: "next-development-workflow-team", repository_id: repositoryIdentity.repository_logical_id, context_id: "next-development-workflow" },
          catalogSet,
          state,
          requirements: { agent_id: agentId, role: roleId, rigor, risk, complexity, objective: "auto" },
        }),
      }));
    } finally {
      state.store?.close();
    }
  } else if (action === "run") {
    requireVerifiedProductionLaunch();
    const task = readRepositoryBoundJson(option("--task"), ".workflow-state/headless-task.json");
    let service;
    try {
      service = productionService({ task });
      const result = await service.run();
      print(result);
      if (result.decision !== "PASS") process.exitCode = 1;
    } finally {
      service?.close({ cleanup: true });
    }
  } else throw new Error(`UNKNOWN_TEAM_ACTION:${action}`);
} else {
  process.stdout.write("Usage: tools/next-workflow projection|contracts|activation status|identity status|identity reattest --confirm|store-health|release status|release candidate [--artifact PATH ...]|release proofs-verify --candidate FP --bundle PATH|release source-receipt --candidate-file PATH (--kind KIND|--mode MODE) --evidence PATH [--fresh-until ISO] --confirm|release sign-bundle --candidate-file PATH --receipts PATH [--fresh-until ISO] --confirm|release sign-transition --candidate-file PATH --mode MODE --stage-receipt PATH [--fresh-until ISO] --confirm|release transition --candidate FP --mode MODE --evidence PATH --expect-revision N --confirm|release activate --candidate FP --bundle PATH --expect-revision N --confirm|runtime status|runtime isolation-check|runtime owner-enroll [--anchor PATH] [--private-key PATH] --confirm|runtime acceptance-create [--output PATH] [--private-key PATH] --confirm|runtime bootstrap --owner-acceptance PATH --confirm|runtime effect-preview --effect PATH|runtime reconcile [--target ID] [--limit N] --confirm|settings catalog|settings dry-run --scope S --subject ID --mode auto|manual|inherit --expect-revision N [--identity KEY]|settings revert-dry-run --receipt ID --expect-revision N|settings apply --token TOKEN --confirm|agent-selection plan --agent ID [--role ID] [--rigor L1..L5] [--risk low|normal|high|critical] [--complexity low|normal|high|extreme] [--objective auto|correctness|balanced|efficiency] [--capability ID] [--allow-model ID] [--deny-model ID] [--deny-prefix PREFIX] [--max-cost N]|agent-selection verify-config --plan PATH --model ID --effort VALUE|team plan --task PATH|team run --task PATH\n");
}
