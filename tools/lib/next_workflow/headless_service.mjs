import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync } from "node:fs";
import path from "node:path";
import { resolveDevelopmentInstruction } from "../development_instruction.mjs";
import { createHeadlessRunController } from "./run_controller.mjs";
import { normalizeHeadlessTask, buildHeadlessTeamPlan } from "./headless_plan.mjs";
import { HEADLESS_RUNTIME_AUTHORITIES, defaultHeadlessRuntimeStateRoot } from "./headless_bootstrap.mjs";
import { createHeadlessAuthoritySourceProvider, createHeadlessProductionRuntime } from "./headless_runtime.mjs";
import { buildCliLaunchPlan, providerDigest, selectAgentConfiguration } from "./providers.mjs";
import { validateContractSet, loadContracts } from "./contracts.mjs";
import { trustedGitEnvironment, trustedGitExecutable, verifyEnforcedActivationRecord, verifyRepositoryReleaseDeployment } from "./release.mjs";
import { createSignedReleaseProofVerifier, createSignedTransitionVerifier } from "./release_trust.mjs";
import { createLinuxIsolatedContainment } from "./runtime_containment.mjs";
import {
  createProtectedAgentAuthorityVerifier,
  createProtectedAgentObservationAuthority,
  createProtectedApprovalAuthority,
  createProtectedFinalizationFenceVerifier,
  createProtectedLaunchObservationVerifier,
  createProtectedReceiptAuthority,
  createProtectedRuntimeRecoveryAuthorizer,
} from "./runtime_trust.mjs";
import { resolveAgentSelectionPolicy } from "./settings.mjs";
import { openWorkflowStateStore } from "./store.mjs";

function canonicalJson(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(",")}}`;
  return JSON.stringify(value);
}

function digest(value) {
  return createHash("sha256").update(typeof value === "string" ? value : canonicalJson(value)).digest("hex");
}

function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}

function persistedActivation(store, fallback) {
  const records = store.query({ kind: "NextWorkflowActivation", limit: 1000 }).records;
  return records.length === 0 ? structuredClone(fallback) : structuredClone(records.sort((left, right) => right.record_revision - left.record_revision)[0].payload);
}

function repositoryHead(repositoryRoot) {
  return execFileSync(trustedGitExecutable(), ["--no-replace-objects", "--no-optional-locks", "-c", "core.hooksPath=/dev/null", "-c", "protocol.file.allow=never", "-C", repositoryRoot, "rev-parse", "HEAD"], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    timeout: 30000,
    env: trustedGitEnvironment(),
  }).trim();
}

function activationSnapshotFingerprint({ store, fallbackActivation, repositoryRoot }) {
  const activation = persistedActivation(store, fallbackActivation);
  return digest({
    mode: activation.mode,
    candidate_fingerprint: activation.candidate_fingerprint,
    repository_head: repositoryHead(repositoryRoot),
    revision: activation.revision,
  });
}

function roleId(agent) {
  if (agent.layer === "orchestrator" || agent.role === "Orchestrator Agent") return "orchestrator";
  if (agent.layer === "task") return "task";
  return {
    "Value Design Lead": "director",
    "Planning Design Lead": "planner",
    "Implementation Lead": "builder",
    "Independent Review Lead": "reviewer_gate",
    "Safety and Acceptance Decision Lead": "validator",
  }[agent.role];
}

function defaultBudget(rigor) {
  return {
    max_runtime_ms: 30 * 60 * 1000,
    max_tokens: 200_000,
    max_cost: 0,
    max_retries: 0,
  };
}

function reviewerDisposition({ kind, subject_result_fingerprint: subjectResultFingerprint, raw_result: rawResult }) {
  const subjectBinding = rawResult?.artifacts?.find((artifact) => artifact?.kind === "review_disposition"
    && artifact?.fingerprint === subjectResultFingerprint
    && artifact?.media_type === "application/vnd.next-workflow.review-disposition+json");
  const accepted = rawResult?.status === "succeeded"
    && Array.isArray(rawResult.findings)
    && rawResult.findings.every((finding) => finding?.severity !== "error")
    && Boolean(subjectBinding);
  return {
    accepted,
    decision: kind === "validator" ? (accepted ? "PASS" : "STOP") : undefined,
    ...(accepted ? {} : { code: subjectBinding ? `HEADLESS_${kind.toUpperCase()}_RESULT_REJECTED` : `HEADLESS_${kind.toUpperCase()}_SUBJECT_BINDING_REQUIRED` }),
  };
}

export function createHeadlessProductionService({
  repositoryRoot,
  repositoryIdentity,
  runtimeTrust,
  registry,
  selectionSettings,
  selectionSettingsProvider = () => selectionSettings,
  fallbackActivation,
  releasePrerequisites,
  releaseArtifactPaths,
  task,
  databasePath,
  runtimeStateRoot = defaultHeadlessRuntimeStateRoot(),
  clock = () => new Date().toISOString(),
} = {}) {
  const repository = realpathSync(repositoryRoot);
  const normalizedTask = normalizeHeadlessTask(task);
  if (!repositoryIdentity || !runtimeTrust || !registry || !selectionSettings || typeof selectionSettingsProvider !== "function" || !fallbackActivation || !releasePrerequisites || !Array.isArray(releaseArtifactPaths) || releaseArtifactPaths.length === 0) throw new Error("HEADLESS_SERVICE_CONFIGURATION_INVALID");
  mkdirSync(runtimeStateRoot, { recursive: true, mode: 0o700 });
  const runtimeRoot = mkdtempSync(path.join(realpathSync(runtimeStateRoot), "run-"));
  const inputRoot = path.join(runtimeRoot, "input");
  const outputRoot = path.join(runtimeRoot, "output");
  mkdirSync(inputRoot, { mode: 0o700 });
  mkdirSync(outputRoot, { mode: 0o700 });
  let store;

  try {
  const instruction = resolveDevelopmentInstruction({
    root: repository,
    targetKind: "parent",
    stage: "C",
    scopeId: "next-development-workflow",
  });
  if (instruction.status !== "ready" || !/^[a-f0-9]{64}$/.test(instruction.source_digest ?? "")) throw new Error("HEADLESS_SERVICE_INSTRUCTION_NOT_READY");
  const instructionFingerprint = instruction.source_digest;
  const settingsRevision = String(selectionSettings.revision);
  const settingsFingerprint = digest(selectionSettings);
  const liveSelectionSettings = () => {
    const current = selectionSettingsProvider();
    if (!current || String(current.revision) !== settingsRevision || digest(current) !== settingsFingerprint) throw new Error("HEADLESS_SETTINGS_CHANGED_DURING_RUN");
    return current;
  };
  const policyFingerprint = digest({
    activation: fallbackActivation,
    settings: selectionSettings,
    task: normalizedTask.fingerprint,
    instruction_fingerprint: instructionFingerprint,
  });
  const runtimeCapabilityFingerprint = digest({
    profile: "headless_production",
    containment: "linux-user-mount-provider-net-v1",
    node: process.versions.node,
    platform: process.platform,
    architecture: process.arch,
  });

  const receiptAuthority = createProtectedReceiptAuthority({ runtimeTrust, authorityId: HEADLESS_RUNTIME_AUTHORITIES.receipt });
  const approvalAuthority = createProtectedApprovalAuthority({ runtimeTrust, authorityId: HEADLESS_RUNTIME_AUTHORITIES.approval });
  const runtimeRecoveryAuthorizer = createProtectedRuntimeRecoveryAuthorizer({ runtimeTrust, authorityId: HEADLESS_RUNTIME_AUTHORITIES.runtimeRecovery });
  const finalizationFenceVerifier = createProtectedFinalizationFenceVerifier({
    runtimeTrust,
    authorityId: HEADLESS_RUNTIME_AUTHORITIES.finalization,
    activationFingerprintProvider: () => activationSnapshotFingerprint({ store, fallbackActivation, repositoryRoot: repository }),
    policyRevisionProvider: () => policyFingerprint,
    settingsRevisionProvider: () => String(selectionSettingsProvider()?.revision),
    authorityEpochProvider: () => store.revocation_epoch,
  });
  store = openWorkflowStateStore({
    repositoryRoot: repository,
    databasePath,
    expectedIdentity: repositoryIdentity,
    expectedGenerationId: runtimeTrust.production_state?.generation_id,
    receiptProofVerifier: receiptAuthority.verifier,
    finalizationFenceVerifier,
    runtimeRecoveryAuthorizer,
    protectedRuntimeVerifiers: true,
    clock,
  });

  const activationProvider = () => persistedActivation(store, fallbackActivation);
  const proofVerifier = createSignedReleaseProofVerifier({ trustDocument: runtimeTrust.release_trust, now: clock });
  const transitionVerifier = createSignedTransitionVerifier({ trustDocument: runtimeTrust.release_trust, now: clock });
  const activationVerifier = ({ record, record_fingerprint: recordFingerprint }) => {
    try {
      const verified = verifyEnforcedActivationRecord({
        record,
        proofVerifier,
        transitionVerifier,
        expectedRevocationEpoch: store.revocation_epoch,
        now: clock(),
      });
      return verified.record_fingerprint === recordFingerprint
        ? verified
        : { trusted: false, record_fingerprint: recordFingerprint, proof_fingerprint: digest("activation-fingerprint-mismatch") };
    } catch {
      return { trusted: false, record_fingerprint: recordFingerprint, proof_fingerprint: digest("activation-verification-failed") };
    }
  };
  const currentCandidateProvider = async ({ activation }) => {
    const contracts = await loadContracts({ repositoryRoot: repository });
    const validation = validateContractSet(contracts);
    if (!validation.ok) throw new Error("HEADLESS_ACTIVE_CONTRACT_INVALID");
    return verifyRepositoryReleaseDeployment({
      repositoryRoot: repository,
      candidateDefinition: activation.candidate_definition,
      signedReleaseProofs: activation.signed_release_proofs,
      contractFingerprint: digest(validation.fingerprints),
      releasePrerequisites,
      nodeVersion: process.versions.node,
    });
  };
  const containment = createLinuxIsolatedContainment({
    runtimeTrust,
    authorityId: HEADLESS_RUNTIME_AUTHORITIES.containment,
    inputRoot,
    outputRoot,
  });
  const agentObservationAuthority = createProtectedAgentObservationAuthority({ runtimeTrust, authorityId: HEADLESS_RUNTIME_AUTHORITIES.agentObservation });
  const agentAuthorityVerifier = createProtectedAgentAuthorityVerifier({ runtimeTrust, authorityId: HEADLESS_RUNTIME_AUTHORITIES.agentAuthority });
  const launchObservationVerifier = createProtectedLaunchObservationVerifier({ runtimeTrust, authorityId: HEADLESS_RUNTIME_AUTHORITIES.launchObservation });
  const sourceProvider = createHeadlessAuthoritySourceProvider({
    store,
    registryProvider: () => registry,
    policyFingerprint,
    instructionFingerprint,
    runtimeCapabilityFingerprint,
    rigorProvider: () => normalizedTask.rigor,
    clock,
  });
  const composition = createHeadlessProductionRuntime({
    store,
    registryProvider: () => registry,
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
    runtimeRecoveryAuthorizer,
    authorityRoot: repository,
    repositoryRoot: repository,
    inputRoot,
    outputRoot,
    clock,
  });

  const selections = new Map();
  const selectionFor = (agent, explicitRoleId = roleId(agent)) => {
    const agentContext = {
      agent_id: agent.agent_id,
      role_id: explicitRoleId,
      team_id: "next-development-workflow-team",
      repository_id: repositoryIdentity.repository_logical_id,
      context_id: "next-development-workflow",
    };
    const resolved = resolveAgentSelectionPolicy(liveSelectionSettings(), agentContext);
    if (resolved.decision !== "PASS") return resolved;
    const selected = selectAgentConfiguration({
      registry,
      policy: resolved.policy,
      requirements: {
        role: agentContext.role_id,
        rigor: normalizedTask.rigor,
        risk: normalizedTask.risk,
        complexity: normalizedTask.complexity,
      },
      authority: { decision: "ALLOW", rigor: normalizedTask.rigor },
      budget: { cost: 0 },
    });
    if (selected.decision !== "PASS") return selected;
    const { fingerprint: sourceSelectionFingerprint, ...selectedCore } = selected;
    const core = {
      ...selectedCore,
      source_selection_fingerprint: sourceSelectionFingerprint,
      profile: "production",
      production_eligible: true,
    };
    const result = { ...core, fingerprint: providerDigest(core) };
    selections.set(agent.agent_id, result);
    return result;
  };
  const plan = buildHeadlessTeamPlan({
    task: normalizedTask,
    selectionPlanner: ({ agent_id: agentId, role_id: selectedRoleId }) => {
      return selectionFor({ agent_id: agentId }, selectedRoleId);
    },
  });

  if (plan.decision !== "PASS") throw new Error(`HEADLESS_SERVICE_PLAN_BLOCKED:${plan.blocker?.code ?? plan.topology?.code ?? "unknown"}`);
  const admittedTopology = structuredClone(plan.topology);
  const publicPlan = deepFreeze(structuredClone(plan));
  const executableAgents = plan.topology.agents;
  for (const agent of executableAgents) if (!selections.has(agent.agent_id)) selectionFor(agent);
  const budget = defaultBudget(normalizedTask.rigor);
  let launchIndex = 0;
  const controller = createHeadlessRunController({
    store,
    runtime: composition.runtime,
    agentAuthorityVerifier,
    launchFactory: async ({ agent, grant }) => {
      launchIndex += 1;
      liveSelectionSettings();
      const selection = selections.get(agent.agent_id) ?? selectionFor(agent, agent.selection_role_id ?? roleId(agent));
      if (!selection || selection.decision !== "PASS") throw new Error("HEADLESS_PRODUCTION_SELECTION_REQUIRED");
      const entry = registry.entries.find((candidate) => candidate.eligible === true && candidate.manifest.identity_key === selection.effective);
      if (!entry) throw new Error("HEADLESS_PRODUCTION_REGISTRY_ENTRY_REQUIRED");
      const promptFile = path.join(inputRoot, `task-${launchIndex}.json`);
      const responseFile = path.join(outputRoot, `result-${launchIndex}.json`);
      const plan = buildCliLaunchPlan({
        manifest: entry.manifest,
        promptFile,
        responseFile,
        modelId: selection.selected_model,
        nativeReasoning: selection.selected_native_reasoning,
        sandbox: "read-only",
        workingDirectory: inputRoot,
        attestationExpectation: {
          identity: entry.manifest.identity,
          native_reasoning: selection.selected_native_reasoning,
          normalized_effort: selection.selected_normalized_effort,
          adapter_instance_id: `headless-${normalizedTask.task_id}-${agent.agent_id}-${launchIndex}`,
          sandbox: { mode: "read_only", network: false, writable_paths: [] },
          capabilities: ["bounded_analysis"],
          actions: ["analyze", "read", "report"],
          tools: [],
          resource_limits: budget,
          targets: grant.scope.paths,
        },
      });
      return {
        selection,
        context: {
          task_id: normalizedTask.task_id,
          agent_id: agent.agent_id,
          role: agent.role,
          fingerprint: digest({ task_id: normalizedTask.task_id, agent_id: agent.agent_id, role: agent.role }),
        },
        providerExecution: {
          identity_key: entry.manifest.identity_key,
          registry_fingerprint: registry.fingerprint,
          manifest_fingerprint: providerDigest(entry.manifest),
          certification_fingerprint: providerDigest(entry.certification),
          plan_fingerprint: plan.fingerprint,
          plan,
          executable_observation: {
            path: entry.manifest.transport_descriptor.executable.canonical_path,
            ...(entry.manifest.transport_descriptor.interpreter ? {
              interpreter_observation: { path: entry.manifest.transport_descriptor.interpreter.canonical_path },
            } : {}),
          },
          inherited_environment: {},
        },
        authorityBindings: {
          repository_logical_id: repositoryIdentity.repository_logical_id,
          checkout_instance_id: repositoryIdentity.checkout_instance_id,
          run_id: normalizedTask.task_id,
          target_id: `headless-task:${normalizedTask.task_id}`,
          instruction_fingerprint: instructionFingerprint,
          settings_revision: settingsRevision,
          runtime_capability_fingerprint: runtimeCapabilityFingerprint,
          approvals: [],
        },
      };
    },
    reviewer: reviewerDisposition,
    clock,
  });

  return Object.freeze({
    plan: publicPlan,
    runtime_root: runtimeRoot,
    runtime: composition.runtime,
    async run() {
      const expiresAt = new Date(Date.parse(clock()) + 2 * 60 * 60 * 1000).toISOString();
      return controller.run({
        topology: admittedTopology,
        expectedRigor: normalizedTask.rigor,
        taskId: normalizedTask.task_id,
        policyFingerprint,
        authorityFingerprint: digest({
          trust_fingerprint: runtimeTrust.fingerprint,
          policy_fingerprint: policyFingerprint,
          instruction_fingerprint: instructionFingerprint,
        }),
        budget,
        scopePaths: normalizedTask.scope_paths,
        task: {
          task_id: normalizedTask.task_id,
          summary: normalizedTask.summary,
          scope_paths: normalizedTask.scope_paths,
          data: [],
        },
        tasks: normalizedTask.tasks,
        reviewers: {
          leads: [{ agent_id: "headless-review-lead", role: "Independent Review Lead" }],
          orchestrator: { agent_id: "headless-review-orchestrator", role: "Orchestrator Review Lead" },
          validator: { agent_id: "headless-review-validator", role: "Safety and Acceptance Decision Lead" },
        },
        expiresAt,
      });
    },
    close({ cleanup = true } = {}) {
      const unresolvedAgentRuns = store.listUnresolvedAgentRuns().length;
      const unresolved = store.listUnresolvedEffects().length + store.listUnresolvedRuntimeRuns().length + unresolvedAgentRuns;
      store.close();
      if (cleanup && unresolved === 0) rmSync(runtimeRoot, { recursive: true, force: true });
      return { unresolved, runtime_root_retained: unresolved > 0 || cleanup !== true };
    },
  });
  } catch (error) {
    try { store?.close(); } catch {}
    try { rmSync(runtimeRoot, { recursive: true, force: true }); } catch {}
    throw error;
  }
}

export function headlessServiceDigest(value) {
  return digest(value);
}
