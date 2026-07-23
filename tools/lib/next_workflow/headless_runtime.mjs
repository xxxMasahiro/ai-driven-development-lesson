import { createHash } from "node:crypto";
import path from "node:path";
import { createObservedAuthorityFencedCliExecutor, createRunLifecycleCliExecutor } from "./providers.mjs";
import { prepareAgentTaskDelivery } from "./task_delivery.mjs";
import { createRunLifecyclePort } from "./run_lifecycle.mjs";
import { createNextWorkflowRuntime } from "./runtime.mjs";

function canonicalJson(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(",")}}`;
  return JSON.stringify(value);
}

function digest(value) {
  return createHash("sha256").update(typeof value === "string" ? value : canonicalJson(value)).digest("hex");
}

function within(root, candidate) {
  const relative = path.relative(path.resolve(root), path.resolve(candidate));
  return relative === "" || (relative !== ".." && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative));
}

function authoritySource({ kind, effect, store, clock, sourceFingerprint, rigor }) {
  const targetId = effect.bindings.target_id;
  return {
    kind,
    source_id: `headless-production:${kind}`,
    decision: "allow",
    revision: sourceFingerprint,
    fingerprint: digest({ kind, source_fingerprint: sourceFingerprint, target_id: targetId }),
    fresh_until: effect.bindings.fresh_until,
    revocation_epoch: store.revocation_epoch,
    actions: [effect.action],
    targets: [targetId],
    required_approvals: [],
    duties: [],
    resource_ceilings: {},
    rigor_floor: rigor,
    ...(kind === "target_invariant" ? { repository_management: "parent" } : {}),
  };
}

export function createHeadlessAuthoritySourceProvider({ store, registryProvider, policyFingerprint, instructionFingerprint, runtimeCapabilityFingerprint, rigorProvider = () => "L3", clock = () => new Date().toISOString() } = {}) {
  if (!store || typeof registryProvider !== "function" || !/^[a-f0-9]{64}$/.test(policyFingerprint ?? "") || !/^[a-f0-9]{64}$/.test(instructionFingerprint ?? "") || !/^[a-f0-9]{64}$/.test(runtimeCapabilityFingerprint ?? "") || typeof rigorProvider !== "function") throw new Error("HEADLESS_SOURCE_PROVIDER_CONFIGURATION_INVALID");
  return ({ effect }) => {
    if (effect.bindings.revocation_epoch !== store.revocation_epoch || Date.parse(effect.bindings.fresh_until) < Date.parse(clock())) throw new Error("HEADLESS_SOURCE_AUTHORITY_STALE");
    const rigor = rigorProvider(effect.bindings.task_id);
    if (!new Set(["L1", "L2", "L3", "L4", "L5"]).has(rigor)) throw new Error("HEADLESS_SOURCE_RIGOR_INVALID");
    const sourceFingerprints = {
      target_invariant: digest({ repository_logical_id: store.identity.repository_logical_id, checkout_instance_id: store.identity.checkout_instance_id }),
      saved_settings: policyFingerprint,
      task_scope: digest({ task_id: effect.bindings.task_id, run_id: effect.bindings.run_id, target_id: effect.bindings.target_id }),
      rigor: digest({ rigor }),
      instruction: instructionFingerprint,
      runtime_capability: runtimeCapabilityFingerprint,
      provider_capability: registryProvider().fingerprint,
    };
    return Object.entries(sourceFingerprints).map(([kind, sourceFingerprint]) => authoritySource({ kind, effect, store, clock, sourceFingerprint, rigor }));
  };
}

export function createPersistedAgentAdmissionAdapter({ store, clock = () => new Date().toISOString() } = {}) {
  if (!store || typeof store.commit !== "function" || typeof store.get !== "function") throw new Error("HEADLESS_ADMISSION_ADAPTER_STORE_REQUIRED");
  const markerId = (targetId) => `agent-admission-marker-${digest(targetId)}`;
  const observation = (targetId) => {
    const marker = store.get({ id: markerId(targetId) });
    const intent = marker?.payload?.effect_id ? store.getIntent(marker.payload.effect_id) : null;
    const core = {
      object_identity: `agent-admission:${targetId}`,
      admitted: marker?.lifecycle_state === "ADMITTED",
      effect_key: marker?.payload?.effect_key ?? null,
      marker_fingerprint: marker?.content_fp ?? null,
      ...(intent ? {
        request_fingerprint: intent.request_fp,
        authority_decision_id: intent.authority_fp,
        target_id: intent.target_id,
        operation: intent.operation,
        object_selector: structuredClone(intent.expected_selector),
        status: "succeeded",
      } : {}),
    };
    return { ...core, fingerprint: digest(core) };
  };
  return Object.freeze({
    async observe({ target }) {
      if (typeof target?.run !== "string" || target.run.length === 0) throw new Error("HEADLESS_ADMISSION_TARGET_REQUIRED");
      return observation(target.run);
    },
    async dispatch({ effect, effect_id: effectId, effect_key: effectKey, authority_epoch: authorityEpoch }) {
      const targetId = effect?.target?.run;
      if (effect?.action !== "admit" || typeof targetId !== "string" || effect?.request?.attestation_fingerprint === undefined) throw new Error("HEADLESS_ADMISSION_REQUEST_INVALID");
      store.assertAuthorityEpoch({ authorityEpoch });
      const marker = {
        id: markerId(targetId),
        kind: "AgentAdmissionMarker",
        schema_version: "1.0.0",
        record_revision: 1,
        authority_scope: effect.bindings.task_id,
        lineage_id: effectId,
        lifecycle_state: "ADMITTED",
        payload: { target_id: targetId, effect_id: effectId, effect_key: effectKey, attestation_fingerprint: effect.request.attestation_fingerprint, admitted_at: clock() },
        source_revision: effectKey,
        policy_fp: effect.bindings.policy_fingerprint,
        input_fp: effect.request.attestation_fingerprint,
      };
      store.commit({ expectedRevision: store.revision, authorityEpoch, records: [marker], events: [{ event_id: `event-${marker.id}`, aggregate_id: marker.id, event_type: "AGENT_RUN_ADMITTED", payload: { effect_id: effectId, target_id: targetId } }] });
      return { admitted: true, effect_id: effectId, effect_key: effectKey };
    },
    matches({ expected, dispatchResult, observation: actual }) {
      return expected?.admitted === true && actual?.admitted === true && dispatchResult?.effect_key === actual.effect_key;
    },
    async reconcile(intent) {
      const targetId = intent.target_id;
      const actual = observation(targetId);
      if (actual.admitted !== true || actual.effect_key !== intent.effect_key) return { state: "unknown" };
      return {
        state: "matched",
        status: "succeeded",
        effect_key: intent.effect_key,
        request_fingerprint: intent.request_fp,
        authority_decision_id: intent.authority_fp,
        target_id: intent.target_id,
        operation: intent.operation,
        object_selector: intent.expected_selector,
        object_identity: actual.object_identity,
        observation_fingerprint: actual.fingerprint,
      };
    },
  });
}

export function createRuntimeProviderObserver({ store } = {}) {
  if (!store || typeof store.getIntent !== "function" || typeof store.getRuntimeRun !== "function") throw new Error("HEADLESS_PROVIDER_OBSERVER_STORE_REQUIRED");
  let lastDispatch = null;
  const completedObservation = (effectId, effectKey, resultFingerprint) => {
    const intent = store.getIntent(effectId);
    if (!intent) throw new Error("HEADLESS_PROVIDER_INTENT_REQUIRED");
    const core = {
      object_identity: `provider-run:${effectId}`,
      completed: true,
      effect_key: effectKey,
      request_fingerprint: intent.request_fp,
      authority_decision_id: intent.authority_fp,
      target_id: intent.target_id,
      operation: intent.operation,
      object_selector: intent.expected_selector,
      status: "succeeded",
      response_fingerprint: resultFingerprint,
    };
    return { ...core, fingerprint: digest(core) };
  };
  return Object.freeze({
    observeDispatch(result, binding) {
      lastDispatch = { ...structuredClone(result), ...structuredClone(binding) };
    },
    async observe({ target }) {
      if (!lastDispatch) {
        const core = { object_identity: `provider-target:${digest(target)}`, completed: false };
        return { ...core, fingerprint: digest(core) };
      }
      return completedObservation(lastDispatch.effect_id, lastDispatch.effect_key, lastDispatch.result_fingerprint ?? lastDispatch.response_fingerprint);
    },
    async reconcile(intent) {
      const run = store.getRuntimeRun({ runId: intent.effect_id });
      if (run?.state !== "COMPLETED" || !/^[a-f0-9]{64}$/.test(run.result_fp ?? "")) return { state: run ? "conflict" : "unknown" };
      const actual = completedObservation(intent.effect_id, intent.effect_key, run.result_fp);
      return {
        state: "matched",
        status: "succeeded",
        effect_key: intent.effect_key,
        request_fingerprint: intent.request_fp,
        authority_decision_id: intent.authority_fp,
        target_id: intent.target_id,
        operation: intent.operation,
        object_selector: intent.expected_selector,
        object_identity: actual.object_identity,
        observation_fingerprint: actual.fingerprint,
      };
    },
  });
}

export function createAgentObservationBuilder({ store, observationAuthority, containmentProfileId = "linux-user-mount-provider-net-v1" } = {}) {
  if (!store || !observationAuthority || typeof observationAuthority.issue !== "function") throw new Error("HEADLESS_OBSERVATION_BUILDER_CONFIGURATION_INVALID");
  return ({ input, started, collected }) => {
    const expected = input.attestation_expectation;
    const run = store.getRuntimeRun({ runId: started.run_id });
    if (!expected || !run || run.state !== "COMPLETED" || run.observation?.containment_profile_id !== containmentProfileId || run.observation?.task_network_access !== false || run.observation?.task_tools_enabled !== false) throw new Error("HEADLESS_RUNTIME_CONTAINMENT_ATTESTATION_INVALID");
    if (collected.launch_report?.provider !== input.selected_provider || collected.launch_report?.model !== input.selected_model || collected.launch_report?.effort !== input.selected_effort) throw new Error("HEADLESS_RUNTIME_CONFIGURATION_ATTESTATION_INVALID");
    if (run.observation?.actual_provider !== input.selected_provider || run.observation?.actual_model !== input.selected_model || run.observation?.actual_effort !== input.selected_effort || run.observation?.observation_scope !== "pinned_cli_launch_configuration") throw new Error("HEADLESS_RUNTIME_LAUNCH_OBSERVATION_INVALID");
    const actualObserved = {
      identity: { ...structuredClone(expected.identity), model_id: run.observation.actual_model },
      native_reasoning: run.observation.actual_effort,
      normalized_effort: expected.normalized_effort,
      observation_scope: run.observation.observation_scope,
      backend_attestation: null,
      backend_attestation_available: false,
      process_identity: {
        process_id: String(run.pid),
        adapter_instance_id: expected.adapter_instance_id,
        executable_fingerprint: input.executable_identity.digest,
      },
      sandbox: structuredClone(expected.sandbox),
      capabilities: [...expected.capabilities],
      actions: [...expected.actions],
      tools: [...expected.tools],
      resource_limits: structuredClone(expected.resource_limits),
      targets: [...expected.targets],
    };
    return { actual_observed: actualObserved, observation_proof: observationAuthority.issue(actualObserved) };
  };
}

export function createHeadlessProductionRuntime({
  store,
  registryProvider,
  runtimeTrust,
  receiptAuthority,
  approvalAuthority,
  finalizationFenceVerifier,
  agentObservationAuthority,
  agentAuthorityVerifier,
  launchObservationVerifier,
  containment,
  activationProvider,
  activationVerifier,
  currentCandidateProvider,
  sourceProvider,
  reconciliationAuthorizer = () => ({ decision: "DENY" }),
  runtimeRecoveryAuthorizer = () => ({ decision: "DENY" }),
  authorityRoot,
  repositoryRoot,
  inputRoot,
  outputRoot,
  instructionStage = "C",
  instructionScopeId = "next-development-workflow",
  clock = () => new Date().toISOString(),
  idFactory,
} = {}) {
  if (!store || typeof registryProvider !== "function" || !runtimeTrust || !receiptAuthority || !agentObservationAuthority || !agentAuthorityVerifier || !launchObservationVerifier || !containment || typeof activationProvider !== "function" || typeof activationVerifier !== "function" || typeof currentCandidateProvider !== "function" || typeof sourceProvider !== "function") throw new Error("HEADLESS_PRODUCTION_RUNTIME_CONFIGURATION_INVALID");
  if (![authorityRoot, repositoryRoot, inputRoot, outputRoot].every((candidate) => typeof candidate === "string" && path.isAbsolute(candidate))) throw new Error("HEADLESS_PRODUCTION_RUNTIME_PATH_REQUIRED");
  const providerObserver = createRuntimeProviderObserver({ store });
  let runtime;
  const fenceRuntimeRun = ({ runId, authorityEpoch, reason }) => {
    const fenceId = `runtime-run-fence-${runId}`;
    const existing = store.get({ id: fenceId });
    if (existing) {
      if (existing.kind !== "RuntimeRunFence" || existing.payload?.run_id !== runId || existing.payload?.authority_epoch !== authorityEpoch || existing.lifecycle_state !== "FENCED") throw new Error("HEADLESS_RUNTIME_RUN_FENCE_CONFLICT");
      return { fenced: true, fingerprint: existing.input_fp, fence_id: fenceId, authority_epoch: authorityEpoch };
    }
    store.assertAuthorityEpoch({ authorityEpoch });
    const payload = {
      run_id: runId,
      authority_epoch: authorityEpoch,
      first_reason: reason,
      fenced_at: clock(),
    };
    const fingerprint = digest(payload);
    store.commit({
      expectedRevision: store.revision,
      authorityEpoch,
      records: [{
        id: fenceId,
        kind: "RuntimeRunFence",
        schema_version: "1.0.0",
        authority_scope: `runtime-run:${runId}`,
        lineage_id: runId,
        lifecycle_state: "FENCED",
        payload,
        source_revision: String(authorityEpoch),
        policy_fp: fingerprint,
        input_fp: fingerprint,
      }],
      events: [{
        event_id: `event-${fenceId}`,
        aggregate_id: runId,
        event_type: "RUNTIME_RUN_FENCED",
        payload: { run_id: runId, authority_epoch: authorityEpoch, reason },
      }],
    });
    return { fenced: true, fingerprint, fence_id: fenceId, authority_epoch: authorityEpoch };
  };
  const lifecyclePort = createRunLifecyclePort({
    store,
    fenceGuard: ({ operation, plan }) => {
      store.assertAuthorityEpoch({ authorityEpoch: plan.authority_epoch });
      if (operation === "release" && store.get({ id: `runtime-run-fence-${plan.run_id}` })) return { allowed: false, fence_fingerprint: plan.fence_fingerprint, authority_epoch: plan.authority_epoch };
      return { allowed: true, fence_fingerprint: plan.fence_fingerprint, authority_epoch: plan.authority_epoch };
    },
    effectFencer: async ({ run_id: runId, authority_epoch: authorityEpoch, reason }) => fenceRuntimeRun({ runId, authorityEpoch, reason }),
    launchObservationVerifier,
    containment,
    pathPolicy: ({ plan }) => ({ allowed: within(inputRoot, plan.working_directory) && within(inputRoot, plan.stdin_file) && within(outputRoot, plan.response_file) }),
    beforeExecutionRelease: ({ run }) => store.assertAuthorityEpoch({ authorityEpoch: Number(run.authority_epoch) }),
    recoveryAuthorizer: runtimeRecoveryAuthorizer,
    clock,
  });
  const lifecycleExecutor = createRunLifecycleCliExecutor({
    lifecyclePort,
    observationBuilder: createAgentObservationBuilder({ store, observationAuthority: agentObservationAuthority, containmentProfileId: containment.profile_id }),
  });
  const observedExecutor = createObservedAuthorityFencedCliExecutor({
    executor: lifecycleExecutor,
    onResult: (result, binding) => providerObserver.observeDispatch(result, binding),
  });
  const admissionAdapter = createPersistedAgentAdmissionAdapter({ store, clock });
  const taskDeliveryPreparer = ({ grant, promptFile, data, resultContract }) => prepareAgentTaskDelivery({
    grant,
    authorityRoot,
    repositoryRoot,
    resolverInput: { targetKind: "parent" },
    stage: instructionStage,
    scopeId: instructionScopeId,
    data,
    resultContract,
    promptFile,
  });
  const processContainment = Object.freeze({
    async quarantineOrTerminate({ launch, reason }) {
      const lifecycleRunId = launch?.result?.lifecycle_run_id ?? launch?.effect_id;
      const run = lifecycleRunId ? store.getRuntimeRun({ runId: lifecycleRunId }) : null;
      if (!run) return { contained: false, action: "failed", fingerprint: digest({ lifecycle_run_id: lifecycleRunId, reason, state: "missing" }) };
      if (["COMPLETED", "FAILED", "CANCELLED", "TIMED_OUT"].includes(run.state)) return { contained: true, action: "terminate", fingerprint: digest({ lifecycle_run_id: lifecycleRunId, reason, state: run.state, process_identity_fingerprint: run.observation?.process_identity_fingerprint }) };
      const terminated = await lifecyclePort.terminate(lifecycleRunId);
      return { contained: ["terminal_absent", "absent"].includes(terminated.observed_state), action: "terminate", fingerprint: digest({ lifecycle_run_id: lifecycleRunId, reason, terminated }) };
    },
  });
  runtime = createNextWorkflowRuntime({
    store,
    registryProvider,
    sourceProvider,
    activationProvider,
    activationVerifier,
    currentCandidateProvider,
    reconciliationAuthorizer,
    receiptVerifier: receiptAuthority.issuer,
    approvalVerifier: approvalAuthority?.verifier,
    providerObserver,
    cliExecutor: observedExecutor,
    effectAdapters: { agent_run_admission: admissionAdapter },
    agentObservationVerifier: agentObservationAuthority.verifier,
    containment: processContainment,
    taskDeliveryPreparer,
    runLifecyclePort: lifecyclePort,
    clock,
    ...(idFactory ? { idFactory } : {}),
  });
  return Object.freeze({ runtime, lifecycle_port: lifecyclePort, provider_observer: providerObserver, agent_authority_verifier: agentAuthorityVerifier, finalization_fence_verifier: finalizationFenceVerifier });
}

export function createHeadlessRecoveryLifecycle({
  store,
  launchObservationVerifier,
  containment,
  recoveryAuthorizer,
  clock = () => new Date().toISOString(),
} = {}) {
  if (!store || !launchObservationVerifier || !containment || typeof recoveryAuthorizer !== "function") throw new Error("HEADLESS_RECOVERY_LIFECYCLE_CONFIGURATION_INVALID");
  const effectFencer = async ({ run_id: runId, authority_epoch: authorityEpoch, reason }) => {
    store.assertAuthorityEpoch({ authorityEpoch });
    const payload = { run_id: runId, authority_epoch: authorityEpoch, reason, recovery_only: store.recovery_only === true };
    return {
      fenced: true,
      fingerprint: digest(payload),
      fence_id: `runtime-recovery-fence-${runId}`,
      authority_epoch: authorityEpoch,
      recovery_only: store.recovery_only === true,
    };
  };
  return createRunLifecyclePort({
    store,
    fenceGuard: ({ plan }) => ({ allowed: false, fence_fingerprint: plan.fence_fingerprint, authority_epoch: plan.authority_epoch }),
    effectFencer,
    launchObservationVerifier,
    containment,
    pathPolicy: () => ({ allowed: false }),
    recoveryAuthorizer,
    clock,
  });
}

export function headlessRuntimeDigest(value) {
  return digest(value);
}
