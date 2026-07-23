#!/usr/bin/env node
import { existsSync, lstatSync, readFileSync, realpathSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadContracts, validateContractSet } from "./lib/next_workflow/contracts.mjs";
import { compatibilityDigest, resolveRuntimeAuthorityInputs } from "./lib/next_workflow/compatibility.mjs";
import { composeAuthorityDecision } from "./lib/next_workflow/authority.mjs";
import { loadRepositoryIdentity } from "./lib/next_workflow/identity.mjs";
import { loadDefaultNextWorkflowProjection } from "./lib/next_workflow/projection.mjs";
import { loadProviderRegistry } from "./lib/next_workflow/providers.mjs";
import { discoverBuiltinProviderInputs } from "./lib/next_workflow/provider_discovery.mjs";
import { completeActivation, freezeRepositoryReleaseCandidate, persistActivationTransition, verifyEnforcedActivationRecord, verifyReleaseProofs } from "./lib/next_workflow/release.mjs";
import { createSignedReleaseProofVerifier, createSignedTransitionVerifier } from "./lib/next_workflow/release_trust.mjs";
import { createNextWorkflowRuntime } from "./lib/next_workflow/runtime.mjs";
import { diagnoseLinuxIsolationPrerequisites } from "./lib/next_workflow/runtime_containment.mjs";
import { loadProtectedRuntimeTrust } from "./lib/next_workflow/runtime_trust.mjs";
import { createAgentSelectionSettingsManager } from "./lib/next_workflow/settings.mjs";
import { openWorkflowStateStore } from "./lib/next_workflow/store.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
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

function runtimeRegistry({ issuedAt } = {}) {
  const document = readRepositoryBoundJson(process.env.NEXT_WORKFLOW_PROVIDER_REGISTRY_FILE, "learning/NEXT_WORKFLOW_PROVIDER_REGISTRY.json");
  const entries = [
    ...(document.entries ?? []).map((entry) => ({ ...entry, manifest: entry.manifest ? { ...entry.manifest, requires_observation: true } : entry.manifest })),
    ...(document.custom_entries ?? []).map((entry) => ({ ...entry, manifest: entry.manifest ? { ...entry.manifest, custom: true, requires_observation: true } : entry.manifest })),
  ];
  const observedAt = issuedAt || process.env.NEXT_WORKFLOW_SETTINGS_REGISTRY_OBSERVED_AT || new Date().toISOString();
  const discovered = discoverBuiltinProviderInputs({ adapterFamilies: document.adapter_families ?? [], clock: () => observedAt });
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

function persistedActivation(store) {
  const records = store.query({ kind: "NextWorkflowActivation", limit: 1000 }).records;
  if (records.length === 0) return null;
  return structuredClone(records.sort((left, right) => right.record_revision - left.record_revision)[0].payload);
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
    if (!definition || !Array.isArray(definition.artifact_paths) || definition.artifact_paths.length === 0) throw new Error("ACTIVE_CANDIDATE_DEFINITION_REQUIRED");
    const contracts = await loadContracts({ repositoryRoot: ROOT });
    const validation = validateContractSet(contracts);
    if (!validation.ok) throw new Error("ACTIVE_CANDIDATE_CONTRACT_INVALID");
    return freezeRepositoryReleaseCandidate({ repositoryRoot: ROOT, artifactPaths: definition.artifact_paths, contractFingerprint: compatibilityDigest(validation.fingerprints), releasePrerequisites: releasePrerequisites(), nodeVersion: process.versions.node });
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
  });
}

const DEFAULT_RELEASE_ARTIFACTS = [
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
  "tools/next-workflow.mjs",
  "tools/lib/next_workflow/authority.mjs",
  "tools/lib/next_workflow/release.mjs",
  "tools/lib/next_workflow/runtime.mjs",
  "tools/lib/next_workflow/store.mjs",
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
  const state = readOnlyState();
  try {
    print(state.store ? persistedActivation(state.store) ?? readJson("learning/NEXT_WORKFLOW_ACTIVATION.json") : readJson("learning/NEXT_WORKFLOW_ACTIVATION.json"));
  } finally {
    state.store?.close();
  }
} else if (command === "release") {
  const action = args[1] ?? "status";
  if (action === "status") {
    const state = readOnlyState();
    try { print(state.store ? persistedActivation(state.store) ?? readJson("learning/NEXT_WORKFLOW_ACTIVATION.json") : readJson("learning/NEXT_WORKFLOW_ACTIVATION.json")); } finally { state.store?.close(); }
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
  } else if (action === "transition") {
    if (!args.includes("--confirm")) throw new Error("ACTIVATION_TRANSITION_CONFIRMATION_REQUIRED");
    const bundle = readRepositoryBoundJson(option("--evidence"), "learning/NEXT_WORKFLOW_ACTIVATION_TRANSITION.json");
    const now = new Date().toISOString();
    const { store } = settingsManager();
    try { print(await persistActivationTransition({ store, expectedRevision: Number(option("--expect-revision")), candidateFingerprint: option("--candidate"), candidateDefinition: bundle.candidate_definition ?? bundle.candidate, nextMode: option("--mode"), evidence: bundle.evidence ?? bundle, transitionVerifier: createSignedTransitionVerifier({ trustDocument: releaseTrustDocument(), now: () => now }), releasePrerequisites: releasePrerequisites(), now })); } finally { store.close(); }
  } else if (action === "activate") {
    if (!args.includes("--confirm")) throw new Error("ACTIVATION_CONFIRMATION_REQUIRED");
    const bundle = readRepositoryBoundJson(option("--bundle"), "learning/NEXT_WORKFLOW_RELEASE_PROOFS.json");
    const now = new Date().toISOString();
    const { store } = settingsManager();
    try { const trustDocument = releaseTrustDocument(); print(await completeActivation({ store, expectedRevision: Number(option("--expect-revision")), candidateFingerprint: option("--candidate"), proofs: bundle.proofs ?? bundle, proofVerifier: createSignedReleaseProofVerifier({ trustDocument, now: () => now }), transitionVerifier: createSignedTransitionVerifier({ trustDocument, now: () => now }), releasePrerequisites: releasePrerequisites(), now })); } finally { store.close(); }
  } else throw new Error(`UNKNOWN_RELEASE_ACTION:${action}`);
} else if (command === "runtime") {
  const action = args[1] ?? "status";
  if (action === "isolation-check") {
    print(diagnoseLinuxIsolationPrerequisites());
  } else if (action === "status") {
    const state = readOnlyState();
    try { print(state.store ? productionRuntime(state.store).status() : { status: state.status, activation_mode: readJson("learning/NEXT_WORKFLOW_ACTIVATION.json").mode, direct_adapter_access: false }); } finally { state.store?.close(); }
  } else if (action === "effect-preview") {
    const effectPath = option("--effect");
    if (!effectPath) throw new Error("RUNTIME_EFFECT_FILE_REQUIRED");
    const state = readOnlyState();
    if (!state.store) throw new Error("RUNTIME_STORE_NOT_INITIALIZED");
    try { print(await productionRuntime(state.store).previewEffect(readRepositoryBoundJson(effectPath, effectPath))); } finally { state.store.close(); }
  } else if (action === "reconcile") {
    if (!args.includes("--confirm")) throw new Error("RUNTIME_RECONCILIATION_CONFIRMATION_REQUIRED");
    const store = openWorkflowStateStore(runtimeStoreOptions({ createIdentity: false }));
    try { print(await productionRuntime(store).reconcilePending({ targetId: option("--target"), limit: Number(option("--limit", "100")) })); } finally { store.close(); }
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
} else {
  process.stdout.write("Usage: tools/next-workflow projection|contracts|activation status|identity status|identity reattest --confirm|store-health|release status|release candidate [--artifact PATH ...]|release proofs-verify --candidate FP --bundle PATH|release transition --candidate FP --mode MODE --evidence PATH --expect-revision N --confirm|release activate --candidate FP --bundle PATH --expect-revision N --confirm|runtime status|runtime isolation-check|runtime effect-preview --effect PATH|runtime reconcile [--target ID] [--limit N] --confirm|settings catalog|settings dry-run --scope S --subject ID --mode auto|manual|inherit --expect-revision N [--identity KEY]|settings revert-dry-run --receipt ID --expect-revision N|settings apply --token TOKEN --confirm\n");
}
