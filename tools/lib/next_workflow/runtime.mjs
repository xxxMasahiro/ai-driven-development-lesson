import { createHash } from "node:crypto";
import { lstatSync, realpathSync } from "node:fs";
import path from "node:path";
import { createAgentLauncher } from "./agents.mjs";
import { createSideEffectGateway } from "./authority.mjs";
import { assertProtectedAuthorityFencedCliExecutor, createNodeDescriptorPinnedExecutor, createObservedAuthorityFencedCliExecutor, createOperationalProviderAdapter } from "./providers.mjs";
import { assertProtectedRuntimeVerifier, protectedRuntimeVerifierFingerprint, protectedRuntimeVerifierTrustFingerprint } from "./runtime_trust.mjs";

const PROVIDER_EFFECT_VARIANTS = Object.freeze(["provider_effect", "agent_launch"]);

function canonicalJson(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(",")}}`;
  return JSON.stringify(value);
}

function digest(value) {
  return createHash("sha256").update(typeof value === "string" ? value : canonicalJson(value)).digest("hex");
}

function within(root, candidate) {
  const relative = path.relative(root, candidate);
  return relative === "" || (!relative.startsWith(`..${path.sep}`) && relative !== ".." && !path.isAbsolute(relative));
}

export function createNextWorkflowRuntime({
  store,
  registryProvider,
  sourceProvider,
  activationProvider,
  activationVerifier,
  currentCandidateProvider,
  reconciliationAuthorizer,
  receiptVerifier,
  approvalVerifier,
  providerObserver,
  cliExecutor,
  apiTransport,
  localTransport,
  secretResolver,
  endpointObservationProvider,
  effectAdapters = {},
  agentObservationVerifier,
  containment,
  taskDeliveryPreparer,
  runLifecyclePort,
  runtimeProfile = "production",
  clock = () => new Date().toISOString(),
  idFactory,
} = {}) {
  if (!store || typeof store.listUnresolvedEffects !== "function" || typeof registryProvider !== "function" || typeof currentCandidateProvider !== "function") throw new Error("NEXT_WORKFLOW_RUNTIME_DEPENDENCY_REQUIRED");
  const providerAdapter = createOperationalProviderAdapter({
    registryProvider,
    observer: providerObserver,
    cliExecutor: cliExecutor ?? createNodeDescriptorPinnedExecutor(),
    dispatchFenceGuard: ({ authority_epoch: authorityEpoch, fencing_token: fencingToken }) => {
      store.assertAuthorityEpoch({ authorityEpoch });
      return { current: true, authority_epoch: authorityEpoch, fencing_token: fencingToken };
    },
    apiTransport,
    localTransport,
    secretResolver,
    endpointObservationProvider,
    clock,
  });
  const adapters = { ...effectAdapters };
  for (const variant of PROVIDER_EFFECT_VARIANTS) {
    if (adapters[variant] !== undefined) throw new Error(`PROVIDER_GATEWAY_ADAPTER_OVERRIDE_FORBIDDEN:${variant}`);
    adapters[variant] = providerAdapter;
  }
  const gateway = createSideEffectGateway({ store, sourceProvider, activationProvider, activationVerifier, currentCandidateProvider, reconciliationAuthorizer, adapters, receiptVerifier, approvalVerifier, runtimeProfile, clock, ...(idFactory ? { idFactory } : {}) });
  let protectedOperationalAuthority = false;
  try {
    assertProtectedRuntimeVerifier(receiptVerifier, "receipt_issuer");
    protectedOperationalAuthority = store.protected_runtime_verifiers === true
      && typeof store.receipt_proof_verifier_fingerprint === "string"
      && typeof store.finalization_fence_verifier_fingerprint === "string"
      && store.runtime_trust_fingerprint === protectedRuntimeVerifierTrustFingerprint(receiptVerifier, "receipt_issuer");
  } catch {}
  const requireProtectedOperationalAuthority = () => {
    if (!protectedOperationalAuthority) throw new Error("PROTECTED_RUNTIME_AUTHORITY_REQUIRED");
  };
  const launcher = agentObservationVerifier && containment && taskDeliveryPreparer
    ? createAgentLauncher({ gateway, store, registryProvider, observationVerifier: agentObservationVerifier, containment, taskDeliveryPreparer, clock, ...(idFactory ? { idFactory } : {}) })
    : null;

  return Object.freeze({
    async previewEffect(effect) {
      return gateway.preview(structuredClone(effect));
    },
    async executeEffect(effect) {
      requireProtectedOperationalAuthority();
      return gateway.execute(structuredClone(effect));
    },
    async launchAgent(input) {
      if (!launcher) throw new Error("AGENT_LAUNCH_RUNTIME_NOT_CONFIGURED");
      requireProtectedOperationalAuthority();
      return launcher.launch(structuredClone(input));
    },
    async reconcilePending({ targetId, limit = 100 } = {}) {
      requireProtectedOperationalAuthority();
      if (!Number.isSafeInteger(limit) || limit < 1 || limit > 1000) throw new Error("RECONCILIATION_LIMIT_INVALID");
      const unresolved = store.listUnresolvedEffects({ targetId }).slice(0, limit);
      const results = [];
      for (const item of unresolved) {
        try {
          results.push(await gateway.reconcile(item.effect_id));
        } catch (error) {
          results.push({ effect_id: item.effect_id, state: "MANUAL_RECOVERY_REQUIRED", code: error?.message ?? "RECONCILIATION_FAILED" });
        }
      }
      const runtimeRuns = runLifecyclePort && typeof runLifecyclePort.recover === "function" ? store.listUnresolvedRuntimeRuns().slice(0, Math.max(0, limit - unresolved.length)) : [];
      const runtimeResults = [];
      for (const run of runtimeRuns) {
        try {
          runtimeResults.push(await runLifecyclePort.recover(run.run_id));
        } catch (error) {
          runtimeResults.push({ run_id: run.run_id, result: "unknown", recovery: "manual_required", code: error?.message ?? "RUNTIME_RECOVERY_FAILED" });
        }
      }
      return { attempted: unresolved.length, remaining: store.listUnresolvedEffects({ targetId }).length, results, runtime_attempted: runtimeRuns.length, runtime_remaining: store.listUnresolvedRuntimeRuns().length, runtime_results: runtimeResults };
    },
    status() {
      const registry = registryProvider();
      return {
        store: store.health({ integrity: "quick" }),
        provider_registry_fingerprint: registry.fingerprint ?? null,
        eligible_providers: (registry.entries ?? []).filter((entry) => entry.eligible === true).length,
        unresolved_effects: store.listUnresolvedEffects().length,
        agent_launcher_configured: launcher !== null,
        operational_authority_protected: protectedOperationalAuthority,
        direct_adapter_access: false,
      };
    },
    fence(input) {
      requireProtectedOperationalAuthority();
      return gateway.fence(structuredClone(input));
    },
  });
}

export function createIsolatedVerificationRuntime({
  store,
  registryProvider,
  cliExecutor,
  receiptVerifier,
  receiptProofVerifier,
  finalizationFenceVerifier,
  isolatedAuthority,
  isolatedAuthorityVerifier,
  fixtureRoot,
  targetId,
  instructionFingerprint,
  policyFingerprint,
  settingsRevision,
  runtimeCapabilityFingerprint,
  clock = () => new Date().toISOString(),
  idFactory,
} = {}) {
  if (!store || typeof store.listUnresolvedEffects !== "function" || typeof registryProvider !== "function" || !cliExecutor || cliExecutor.authority_fence_enforced !== true || typeof receiptVerifier !== "function" || !isolatedAuthority || isolatedAuthority.profile !== "isolated_verification" || isolatedAuthority.production_authority === true || isolatedAuthority.activation_transition_allowed !== false || typeof targetId !== "string" || !targetId.startsWith("isolated:") || !/^[a-f0-9]{64}$/.test(instructionFingerprint ?? "") || !/^[a-f0-9]{64}$/.test(policyFingerprint ?? "") || typeof settingsRevision !== "string" || !/^[a-f0-9]{64}$/.test(runtimeCapabilityFingerprint ?? "")) throw new Error("ISOLATED_RUNTIME_CONFIGURATION_INVALID");
  assertProtectedAuthorityFencedCliExecutor(cliExecutor);
  assertProtectedRuntimeVerifier(isolatedAuthorityVerifier, "isolated_authority");
  assertProtectedRuntimeVerifier(receiptVerifier, "receipt_issuer");
  assertProtectedRuntimeVerifier(receiptProofVerifier, "receipt_proof");
  assertProtectedRuntimeVerifier(finalizationFenceVerifier, "finalization_fence");
  if (store.protected_runtime_verifiers !== true
    || store.receipt_proof_verifier_id !== receiptProofVerifier.verifier_id
    || store.finalization_fence_verifier_id !== finalizationFenceVerifier.verifier_id
    || store.receipt_proof_verifier_fingerprint !== protectedRuntimeVerifierFingerprint(receiptProofVerifier, "receipt_proof")
    || store.finalization_fence_verifier_fingerprint !== protectedRuntimeVerifierFingerprint(finalizationFenceVerifier, "finalization_fence")) throw new Error("ISOLATED_RUNTIME_STORE_VERIFIER_MISMATCH");
  const root = realpathSync(path.resolve(fixtureRoot));
  const rootInfo = lstatSync(root);
  if (!rootInfo.isDirectory() || rootInfo.isSymbolicLink() || (rootInfo.mode & 0o077) !== 0 || (typeof process.getuid === "function" && rootInfo.uid !== process.getuid())) throw new Error("ISOLATED_RUNTIME_FIXTURE_ROOT_INVALID");
  if (isolatedAuthority.repository_logical_id !== store.identity.repository_logical_id || isolatedAuthority.checkout_instance_id !== store.identity.checkout_instance_id || isolatedAuthority.authority_epoch !== store.revocation_epoch || isolatedAuthority.fixture_root_fingerprint !== digest(root)) throw new Error("ISOLATED_RUNTIME_AUTHORITY_BINDING_INVALID");
  const guardFingerprint = digest({ profile: "isolated_verification", repository_logical_id: store.identity.repository_logical_id, checkout_instance_id: store.identity.checkout_instance_id, fixture_root_fingerprint: digest(root), target_id: targetId, network: false, production_authority: false });
  const snapshot = { mode: "isolated_verification", authority_id: isolatedAuthority.authority_id, candidate_fingerprint: isolatedAuthority.candidate_fingerprint, repository_head: isolatedAuthority.repository_head, authority_epoch: isolatedAuthority.authority_epoch, fixture_root_fingerprint: isolatedAuthority.fixture_root_fingerprint, guard_fingerprint: guardFingerprint };
  const activationFingerprint = digest(snapshot);
  let lastDispatch = null;
  const lifecycleExecutor = createObservedAuthorityFencedCliExecutor({
    executor: cliExecutor,
    onResult(result, binding) {
      lastDispatch = { ...result, ...binding };
    },
  });
  const providerObserver = {
    async observe({ target }) {
      const result = lastDispatch;
      if (!result) return { fingerprint: digest({ target_id: targetId, state: "not_started" }), object_identity: targetId, completed: false };
      const intent = store.getIntent(result.effect_id);
      return { fingerprint: digest({ target_id: targetId, effect_key: result.effect_key, state: "completed", response_fingerprint: result.response_fingerprint }), object_identity: `${targetId}:${result.effect_key}`, effect_key: result.effect_key, request_fingerprint: intent.request_fp, authority_decision_id: intent.authority_fp, target_id: intent.target_id, operation: intent.operation, object_selector: intent.expected_selector, status: "succeeded", completed: true, response_fingerprint: result.response_fingerprint };
    },
    async reconcile(intent) {
      const result = lastDispatch?.effect_key === intent.effect_key ? lastDispatch : null;
      if (!result) return { state: "unknown" };
      return { state: "matched", status: "succeeded", effect_key: intent.effect_key, request_fingerprint: intent.request_fp, authority_decision_id: intent.authority_fp, target_id: intent.target_id, operation: intent.operation, object_selector: intent.expected_selector, object_identity: `${targetId}:${intent.effect_key}`, observation_fingerprint: digest({ target_id: targetId, effect_key: intent.effect_key, state: "completed", response_fingerprint: result.response_fingerprint }) };
    },
  };
  const adapter = createOperationalProviderAdapter({
    registryProvider,
    observer: providerObserver,
    cliExecutor: lifecycleExecutor,
    dispatchFenceGuard: ({ authority_epoch: authorityEpoch, fencing_token: fencingToken }) => {
      store.assertAuthorityEpoch({ authorityEpoch });
      return { current: true, authority_epoch: authorityEpoch, fencing_token: fencingToken };
    },
    clock,
  });
  const sourceKinds = ["target_invariant", "saved_settings", "task_scope", "rigor", "instruction", "runtime_capability", "provider_capability"];
  const sourceProvider = ({ effect }) => {
    const requestedRuntimeMs = effect?.request?.provider_execution?.plan?.execution_policy?.timeout_ms;
    return sourceKinds.map((kind) => ({ kind, source_id: `isolated:${kind}`, decision: "allow", revision: "isolated-1", fingerprint: digest({ kind, target_id: targetId, authority_id: isolatedAuthority.authority_id }), fresh_until: isolatedAuthority.fresh_until, revocation_epoch: isolatedAuthority.authority_epoch, actions: ["invoke"], targets: [targetId], required_approvals: [], duties: [{ id: `isolated.${kind}`, input: { source_profile_id: `isolated.${kind}`, target_id: targetId }, owner: "isolated.runtime" }], resource_ceilings: { max_runtime_ms: Number.isSafeInteger(requestedRuntimeMs) && requestedRuntimeMs > 0 ? requestedRuntimeMs : 0 }, rigor_floor: "L5", ...(kind === "target_invariant" ? { repository_management: "parent" } : {}) }));
  };
  const isolatedEffectGuard = ({ effect }) => {
    const execution = effect?.request?.provider_execution;
    const plan = execution?.plan;
    const registryEntry = registryProvider().entries?.find((entry) => entry.eligible === true && entry.manifest.identity_key === execution?.identity_key);
    let fixturePathsAllowed = false;
    try {
      fixturePathsAllowed = path.isAbsolute(plan?.working_directory ?? "")
        && path.isAbsolute(plan?.stdin_file ?? "")
        && path.isAbsolute(plan?.response_file ?? "")
        && within(root, realpathSync(plan.working_directory))
        && within(root, realpathSync(path.dirname(plan.stdin_file)))
        && within(root, realpathSync(path.dirname(plan.response_file)));
    } catch {}
    const allowed = effect?.variant === "provider_effect"
      && effect?.action === "invoke"
      && effect?.bindings?.target_id === targetId
      && effect?.bindings?.repository_logical_id === store.identity.repository_logical_id
      && effect?.bindings?.checkout_instance_id === store.identity.checkout_instance_id
      && registryEntry?.manifest?.identity?.transport_id === "cli_process"
      && plan?.transport === "cli_process"
      && plan?.shell === false
      && plan?.sandbox === "read-only"
      && Number.isSafeInteger(plan?.execution_policy?.timeout_ms)
      && plan.execution_policy.timeout_ms > 0
      && fixturePathsAllowed
      && Object.keys(plan?.environment ?? {}).length === 0
      && Object.keys(execution.inherited_environment ?? {}).length === 0;
    return { allowed, guard_fingerprint: guardFingerprint, code: allowed ? "isolated_fixture_allowed" : "isolated_fixture_boundary_violation" };
  };
  const gateway = createSideEffectGateway({
    store,
    sourceProvider,
    activationProvider: () => { throw new Error("ISOLATED_PROFILE_CANNOT_READ_PRODUCTION_ACTIVATION"); },
    activationVerifier: () => { throw new Error("ISOLATED_PROFILE_CANNOT_VERIFY_PRODUCTION_ACTIVATION"); },
    currentCandidateProvider: () => { throw new Error("ISOLATED_PROFILE_CANNOT_FREEZE_PRODUCTION_CANDIDATE"); },
    reconciliationAuthorizer: () => ({ decision: "DENY" }),
    adapters: { provider_effect: adapter },
    receiptVerifier,
    runtimeProfile: "isolated_verification",
    isolatedVerificationAuthorityProvider: () => structuredClone(isolatedAuthority),
    isolatedVerificationVerifier: isolatedAuthorityVerifier,
    isolatedEffectGuard,
    clock,
    ...(idFactory ? { idFactory } : {}),
  });
  return Object.freeze({
    profile: "isolated_verification",
    activation_fingerprint: activationFingerprint,
    async executeCliFixture({ providerExecution, taskId = "isolated-task", runId = "isolated-run" } = {}) {
      lastDispatch = null;
      const request = { provider_execution: structuredClone(providerExecution) };
      const effectKey = digest({ profile: "isolated_verification", provider_plan_fingerprint: providerExecution?.plan_fingerprint, task_id: taskId, run_id: runId, target_id: targetId });
      const bindings = { repository_logical_id: store.identity.repository_logical_id, checkout_instance_id: store.identity.checkout_instance_id, task_id: taskId, run_id: runId, target_id: targetId, instruction_fingerprint: instructionFingerprint, policy_fingerprint: policyFingerprint, settings_revision: settingsRevision, runtime_capability_fingerprint: runtimeCapabilityFingerprint, revocation_epoch: store.revocation_epoch, approvals: [] };
      const subject = { provider_identity_fingerprint: digest(providerExecution?.identity_key ?? "missing"), configuration_fingerprint: digest({ model: providerExecution?.plan?.model_id, effort: providerExecution?.plan?.native_reasoning }), request_fingerprint: digest(request), expected_provider_object: `${targetId}:${effectKey}` };
      return gateway.execute({ variant: "provider_effect", action: "invoke", subject, bindings, target: { target_id: targetId }, request, expected_selector: { completed: true }, idempotency_key: effectKey });
    },
    status() {
      return { profile: "isolated_verification", production_available: false, activation_transition_allowed: false, network_allowed: false, registered_child_traversal_allowed: false, git_delivery_allowed: false, activation_fingerprint: activationFingerprint, unresolved_effects: store.listUnresolvedEffects().length };
    },
  });
}
