#!/usr/bin/env node
import assert from "node:assert/strict";
import { chmodSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";
import { createHeadlessRunController, recoverUnresolvedAgentRun } from "./lib/next_workflow/run_controller.mjs";
import { createHeadlessAuthoritySourceProvider, createHeadlessProductionRuntime, createRuntimeProviderObserver, headlessRuntimeDigest } from "./lib/next_workflow/headless_runtime.mjs";
import { buildCliLaunchPlan, providerDigest, providerIdentityKey } from "./lib/next_workflow/providers.mjs";
import { createLinuxIsolatedContainment, diagnoseLinuxIsolationPrerequisites } from "./lib/next_workflow/runtime_containment.mjs";
import {
  createProtectedAgentAuthorityVerifier,
  createProtectedAgentObservationAuthority,
  createProtectedApprovalAuthority,
  createProtectedFinalizationFenceVerifier,
  createProtectedLaunchObservationVerifier,
  createProtectedReceiptAuthority,
  createProtectedRuntimeRecoveryAuthorizer,
  loadProtectedRuntimeTrust,
} from "./lib/next_workflow/runtime_trust.mjs";
import { openWorkflowStateStore } from "./lib/next_workflow/store.mjs";

const roots = [];
const databasePaths = [];
const runtimeTest = diagnoseLinuxIsolationPrerequisites().available ? test : test.skip;
test.after(() => roots.forEach((root) => rmSync(root, { recursive: true, force: true })));
test.after(() => databasePaths.flatMap((candidate) => [candidate, `${candidate}-wal`, `${candidate}-shm`]).forEach((candidate) => rmSync(candidate, { force: true })));

test("terminal isolated launches reconcile the spawn effect only after process absence and persisted launch verification", async () => {
  const effectId = "effect-terminal-launch";
  const intent = {
    effect_id: effectId,
    effect_key: "a".repeat(64),
    request_fp: "b".repeat(64),
    authority_fp: "c".repeat(64),
    target_id: "headless-task:terminal-launch",
    operation: "agent_launch:spawn",
    expected_selector: {},
  };
  const run = {
    run_id: effectId,
    state: "FAILED",
    exit_code: 0,
    signal: null,
    result_fp: null,
    observation: {
      selected_provider: "provider",
      selected_model: "model",
      selected_effort: "high",
      actual_provider: "provider",
      actual_model: "model",
      actual_effort: "high",
      observation_scope: "pinned_cli_launch_configuration",
      backend_attestation: null,
      backend_attestation_available: false,
      launch_observation_verifier_id: "launch-observer",
      launch_observation_proof_fingerprint: "d".repeat(64),
      process_identity_fingerprint: "e".repeat(64),
      containment_evidence_fingerprint: "f".repeat(64),
      containment_profile_id: "linux-user-mount-provider-net-v1",
      task_network_access: false,
      task_tools_enabled: false,
    },
  };
  const store = {
    getIntent: () => intent,
    getRuntimeRun: () => structuredClone(run),
  };
  const verifier = {
    verifier_id: "launch-observer",
    verifyPersisted({ fingerprint }) {
      return {
        verified: true,
        verifier_id: "launch-observer",
        fingerprint,
        proof_fingerprint: "1".repeat(64),
      };
    },
  };
  const matched = createRuntimeProviderObserver({
    store,
    runtimeRunReconciler: async () => ({ result: "matched" }),
    launchObservationVerifier: verifier,
  });
  const result = await matched.reconcile(intent);
  assert.equal(result.state, "matched");
  assert.equal(result.status, "succeeded");
  assert.match(result.observation_fingerprint, /^[a-f0-9]{64}$/u);

  const unknown = createRuntimeProviderObserver({
    store,
    runtimeRunReconciler: async () => ({ result: "unknown" }),
    launchObservationVerifier: verifier,
  });
  assert.deepEqual(await unknown.reconcile(intent), { state: "unknown" });
});

function fileDigest(candidate) {
  return providerDigest(readFileSync(candidate));
}

runtimeTest("headless Production launches a bounded CLI Agent and closes only its independently reviewed result", async () => {
  const repositoryRoot = realpathSync(path.resolve(path.dirname(new URL(import.meta.url).pathname), ".."));
  const runtimeRoot = mkdtempSync(path.join(tmpdir(), "next-workflow-headless-production-"));
  const trustRoot = mkdtempSync(path.join(tmpdir(), "next-workflow-headless-trust-"));
  roots.push(runtimeRoot, trustRoot);
  chmodSync(runtimeRoot, 0o700);
  chmodSync(trustRoot, 0o700);
  const inputRoot = path.join(runtimeRoot, "input");
  const outputRoot = path.join(runtimeRoot, "output");
  mkdirSync(inputRoot, { mode: 0o700 });
  mkdirSync(outputRoot, { mode: 0o700 });
  const fixtureAgent = path.join(inputRoot, "fixture-agent.mjs");
  const providerAuth = path.join(trustRoot, "provider-auth.json");
  writeFileSync(providerAuth, "{\"fixture\":true}\n", { mode: 0o600 });
  writeFileSync(fixtureAgent, `
import { readFileSync, writeFileSync } from "node:fs";
const [response, runId, provider, model, effort] = process.argv.slice(-5);
let summary = "Bounded Production review completed";
let effectiveRunId = runId;
try {
  const envelope = readFileSync(0, "utf8");
  const parsed = JSON.parse(envelope);
  if (!parsed.control?.result_contract?.run_id) summary = "Fixture task envelope invalid";
  else effectiveRunId = parsed.control.result_contract.run_id;
} catch {
  summary = "Fixture task envelope unreadable";
}
writeFileSync(response, JSON.stringify({
  schema_version: "1.0.0",
  run_id: effectiveRunId,
  status: "succeeded",
  summary,
  findings: [],
  artifacts: [],
  metrics: { duration_ms: 1, input_tokens: 1, output_tokens: 1 }
}));
`, { mode: 0o600 });

  const executable = realpathSync(process.execPath);
  const identity = { execution_provider_id: "fixture", model_publisher_id: "fixture", agent_product_id: "fixture-agent", adapter_id: "fixture-cli", transport_id: "cli_process", model_id: "fixture-model" };
  const identityKey = providerIdentityKey(identity);
  const manifest = {
    manifest_id: "headless-production-fixture",
    version: "1.0.0",
    identity,
    identity_key: identityKey,
    capabilities: ["bounded_analysis"],
    native_reasoning_values: ["high"],
    effort_mapping: { high: "high" },
    reasoning_mapping_provenance: { source_id: "fixture", revision: "1", reviewed_by: "fixture-reviewer", proof_fingerprint: providerDigest("fixture-effort") },
    selection_profile: { correctness: 100, safety: 100, efficiency: 100, roles: ["builder"] },
    certification_profile: { probe_authority: "independent", certification_authority: "independent", isolated_probe: true },
    resource_bounds: { cost: 0 },
    priority: 1,
    estimated_cost: 0,
    transport_descriptor: {
      argv_template: [
        fixtureAgent,
        ...["shell_tool", "unified_exec", "code_mode_host", "apps", "browser_use", "in_app_browser", "computer_use", "image_generation", "standalone_web_search", "multi_agent", "skill_search", "plugin_sharing", "remote_plugin", "tool_suggest"].flatMap((feature) => ["--disable", feature]),
        "--model", "{{model_id}}", "-c", "{{reasoning_config}}", "{{response_file}}", "effect-launch-1", identityKey, "{{model_id}}", "{{native_reasoning}}",
      ],
      argv_schema: ["response_file", "model_id", "native_reasoning", "reasoning_config"],
      environment_allowlist: [],
      private_response_file: true,
      executable: { canonical_path: executable, digest: fileDigest(executable) },
      execution_policy: { allowed_owner_uids: [process.getuid()], executable_mode_mask: 0o755, allowed_working_roots: [inputRoot], allowed_response_roots: [outputRoot], timeout_ms: 5000, max_prompt_bytes: 4 * 1024 * 1024, max_response_bytes: 65536, max_stderr_bytes: 65536 },
    },
  };
  const manifestFingerprint = providerDigest(manifest);
  const certification = { certification_id: "headless-production-certification", state: "CERTIFIED", revocation_state: "active", certified_at: "2028-01-01T00:00:00.000Z", expires_at: "2029-01-02T00:00:00.000Z" };
  const observation = { fresh_until: "2029-01-02T00:00:00.000Z" };
  const registry = { schema_version: "1.0.0", observed_at: "2029-01-01T00:00:00.000Z", entries: [{ eligible: true, manifest, certification, observation }] };
  registry.fingerprint = providerDigest(registry);
  const identityDocument = JSON.parse(readFileSync(path.join(repositoryRoot, "learning", "NEXT_WORKFLOW_REPOSITORY_IDENTITY.json"), "utf8"));
  const repositoryIdentity = { repository_logical_id: identityDocument.repository_logical_id, checkout_instance_id: "headless-production-test" };
  const unshare = realpathSync("/usr/bin/unshare");
  const bubblewrap = realpathSync("/usr/bin/bwrap");
  const barrierScript = realpathSync(path.join(repositoryRoot, "tools", "lib", "next_workflow", "runtime_barrier.cjs"));
  const trustPath = path.join(trustRoot, "owner-trust.json");
  const runtimeAuthorities = {
    "fixture-launch-observer": { authority_id: "fixture-launch-observer", kind: "launch_observation", enabled: true, revision: 1, source: "pinned_process_and_certified_provider_metadata", allowed_executable_fingerprints: [fileDigest(executable)], allowed_manifest_fingerprints: [manifestFingerprint] },
    "fixture-provider-containment": { authority_id: "fixture-provider-containment", kind: "linux_isolation", enabled: true, revision: 1, profile_id: "linux-user-mount-provider-net-v1", unshare: { path: unshare, fingerprint: fileDigest(unshare) }, bubblewrap: { path: bubblewrap, fingerprint: fileDigest(bubblewrap) }, barrier_interpreter: { path: executable, fingerprint: fileDigest(executable) }, barrier_script: { path: barrierScript, fingerprint: fileDigest(barrierScript) }, provider_auth_file: { path: providerAuth, fingerprint: fileDigest(providerAuth) } },
    "fixture-receipt": { authority_id: "fixture-receipt", kind: "receipt_proof", enabled: true, revision: 1, source: "owner_protected_deterministic_binding", owner_id: "fixture-adapter-owner" },
    "fixture-approval": { authority_id: "fixture-approval", kind: "approval_issuer", enabled: true, revision: 1, source: "owner_protected_approval_binding" },
    "fixture-finalization": { authority_id: "fixture-finalization", kind: "finalization_fence", enabled: true, revision: 1, source: "owner_protected_live_fence" },
    "fixture-agent-observation": { authority_id: "fixture-agent-observation", kind: "agent_observation", enabled: true, revision: 1, source: "owner_protected_agent_observation", evidence_strength: "pinned_process_and_containment" },
    "fixture-agent-authority": { authority_id: "fixture-agent-authority", kind: "agent_authority", enabled: true, revision: 1, source: "owner_protected_agent_authority", allowed_record_kinds: ["DelegationGrant", "ResourceCostReservation", "AgentReviewerAssignment", "AgentLeadReview", "AgentOrchestratorReview", "AgentValidatorDisposition", "ValidatorDecision"] },
    "fixture-runtime-recovery": { authority_id: "fixture-runtime-recovery", kind: "runtime_recovery", enabled: true, revision: 1, source: "owner_protected_runtime_recovery", allowed_actions: ["record_manual_recovery"] },
  };
  writeFileSync(trustPath, JSON.stringify({ schema_version: "1.0.0", trust_source_id: "headless-production-test", revision: 1, repository_logical_id: repositoryIdentity.repository_logical_id, checkout_instance_id: repositoryIdentity.checkout_instance_id, issued_at: "2028-01-01T00:00:00.000Z", expires_at: "2030-01-01T00:00:00.000Z", release_trust: {}, release_prerequisites: {}, runtime_authorities: runtimeAuthorities }), { mode: 0o600 });
  const runtimeTrust = loadProtectedRuntimeTrust({ repositoryRoot, repositoryLogicalId: repositoryIdentity.repository_logical_id, checkoutInstanceId: repositoryIdentity.checkout_instance_id, trustPath, now: "2029-01-01T00:00:00.000Z" });
  const receiptAuthority = createProtectedReceiptAuthority({ runtimeTrust, authorityId: "fixture-receipt" });
  const approvalAuthority = createProtectedApprovalAuthority({ runtimeTrust, authorityId: "fixture-approval" });
  const agentObservationAuthority = createProtectedAgentObservationAuthority({ runtimeTrust, authorityId: "fixture-agent-observation" });
  const agentAuthorityVerifier = createProtectedAgentAuthorityVerifier({ runtimeTrust, authorityId: "fixture-agent-authority" });
  const launchObservationVerifier = createProtectedLaunchObservationVerifier({ runtimeTrust, authorityId: "fixture-launch-observer" });
  const runtimeRecoveryAuthorizer = createProtectedRuntimeRecoveryAuthorizer({ runtimeTrust, authorityId: "fixture-runtime-recovery" });
  const candidateFingerprint = "c".repeat(64);
  const releaseProofKinds = ["local_release", "pr_ci", "main_ci", "local_remote_sync", "recovery", "fenced_rollback", "archive_decommission", "outbox_disposition"];
  const transitionModes = ["shadow", "release_verified", "recovery_verified", "rollback_verified", "archive_decommission_verified", "ready", "enforced"];
  const proofSummaryFingerprint = providerDigest("headless-production-proof-summary");
  const activation = {
    schema_version: "1.0.0",
    activation_id: "next-development-workflow",
    authority_epoch: 0,
    mode: "enforced",
    candidate_fingerprint: candidateFingerprint,
    revision: 7,
    evidence: releaseProofKinds.map((kind, index) => ({
      kind,
      status: "passed",
      candidate_fingerprint: candidateFingerprint,
      fingerprint: providerDigest({ kind, index }),
    })),
    signed_release_proofs: Object.fromEntries(releaseProofKinds.map((kind) => [kind, { kind }])),
    signed_transition_proofs: transitionModes.slice(0, -1).map((mode) => ({ mode })),
    transition_evidence: transitionModes.map((mode, index) => ({
      mode,
      fingerprint: providerDigest({ mode, index }),
    })),
    proof_summary: {
      status: "passed",
      candidate_fingerprint: candidateFingerprint,
      fingerprint: proofSummaryFingerprint,
    },
    correctness: { status: "passed", fingerprint: proofSummaryFingerprint },
    activated_at: "2029-01-01T00:00:00.000Z",
    candidate_definition: { artifact_paths: ["learning/NEXT_WORKFLOW_ACTIVATION.json"] },
  };
  const candidate = { candidate_fingerprint: activation.candidate_fingerprint, repository_head: "d".repeat(40) };
  const activationFingerprint = headlessRuntimeDigest({ mode: activation.mode, candidate_fingerprint: activation.candidate_fingerprint, repository_head: candidate.repository_head, revision: activation.revision });
  const policyFingerprint = providerDigest("headless-production-policy");
  const instructionFingerprint = providerDigest("headless-production-instruction");
  const runtimeCapabilityFingerprint = providerDigest("headless-production-runtime-capability");
  const finalizationFenceVerifier = createProtectedFinalizationFenceVerifier({ runtimeTrust, authorityId: "fixture-finalization", activationFingerprintProvider: () => activationFingerprint, policyRevisionProvider: () => policyFingerprint, settingsRevisionProvider: () => "0", authorityEpochProvider: () => 0 });
  const databasePath = path.join(repositoryRoot, ".workflow-state", `headless-production-test-${path.basename(runtimeRoot)}.sqlite`);
  databasePaths.push(databasePath);
  let store = openWorkflowStateStore({ repositoryRoot, databasePath, expectedIdentity: repositoryIdentity, receiptProofVerifier: receiptAuthority.verifier, finalizationFenceVerifier, runtimeRecoveryAuthorizer, protectedRuntimeVerifiers: true, clock: () => "2029-01-01T00:00:00.000Z" });
  const containment = createLinuxIsolatedContainment({ runtimeTrust, authorityId: "fixture-provider-containment", inputRoot, outputRoot });
  const sourceProvider = createHeadlessAuthoritySourceProvider({ store, registryProvider: () => registry, policyFingerprint, instructionFingerprint, runtimeCapabilityFingerprint, rigorProvider: () => "L2", clock: () => "2029-01-01T00:00:00.000Z" });
  let runtimeId = 0;
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
    activationProvider: () => activation,
    activationVerifier: ({ record, record_fingerprint: recordFingerprint }) => ({
      trusted: providerDigest(record) === providerDigest(activation),
      record_fingerprint: recordFingerprint,
      proof_fingerprint: providerDigest("fixture-activation-proof"),
    }),
    currentCandidateProvider: () => candidate,
    sourceProvider,
    runtimeRecoveryAuthorizer,
    authorityRoot: repositoryRoot,
    repositoryRoot,
    inputRoot,
    outputRoot,
    clock: () => "2029-01-01T00:00:00.000Z",
    idFactory: () => `${++runtimeId === 1 ? "launch-1" : `runtime-${runtimeId}`}`,
  });
  const selectionCore = { decision: "PASS", mode: "auto", requested: "auto", selected: identityKey, effective: identityKey, selected_model: identity.model_id, selected_native_reasoning: "high", selected_normalized_effort: "high", effort_criteria: { rigor: "L2", risk: "normal", complexity: "normal", normalized_floor: "low" }, previous_effective: null, reselection_reason: null, fallback_count: 0, selection_lineage: [{ rank: 1, identity_key: identityKey, eligible: true, blockers: [], registry_fingerprint: registry.fingerprint, observed_at: registry.observed_at }], manifest, inheritance_trace: [], actual_observed: null };
  const selection = { ...selectionCore, fingerprint: providerDigest(selectionCore) };
  let launchIndex = 0;
  const budget = { max_runtime_ms: 5000, max_tokens: 2000, max_cost: 1, max_retries: 0 };
  const controller = createHeadlessRunController({
    store,
    runtime: composition.runtime,
    agentAuthorityVerifier,
    launchFactory: async ({ agent, grant }) => {
      launchIndex += 1;
      const promptFile = path.join(inputRoot, `task-${launchIndex}.json`);
      const responseFile = path.join(outputRoot, `result-${launchIndex}.json`);
      const plan = buildCliLaunchPlan({
        manifest,
        promptFile,
        responseFile,
        modelId: identity.model_id,
        nativeReasoning: "high",
        sandbox: "read-only",
        workingDirectory: inputRoot,
        attestationExpectation: {
          identity,
          native_reasoning: "high",
          normalized_effort: "high",
          adapter_instance_id: `fixture-${agent.agent_id}`,
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
        context: { task_id: "headless-production", agent_id: agent.agent_id, fingerprint: providerDigest({ task_id: "headless-production", agent_id: agent.agent_id }) },
        providerExecution: { identity_key: identityKey, registry_fingerprint: registry.fingerprint, manifest_fingerprint: manifestFingerprint, certification_fingerprint: providerDigest(certification), plan_fingerprint: plan.fingerprint, plan, executable_observation: { path: executable }, inherited_environment: {} },
        authorityBindings: { repository_logical_id: repositoryIdentity.repository_logical_id, checkout_instance_id: repositoryIdentity.checkout_instance_id, run_id: "headless-production-run", target_id: "headless-production-target", instruction_fingerprint: instructionFingerprint, settings_revision: "0", runtime_capability_fingerprint: runtimeCapabilityFingerprint, approvals: [] },
      };
    },
    reviewer: async ({ raw_result: rawResult }) => {
      assert.equal(rawResult.summary, "Bounded Production review completed");
      return { accepted: true, decision: "PASS" };
    },
    clock: () => "2029-01-01T00:00:00.000Z",
    idFactory: (() => { let value = 0; return () => `controller-${++value}`; })(),
  });
  const topology = controller.plan({ rigor: "L2", requiredRoles: ["Implementation Lead"], tasks: [], requiredPerspectives: [], budgets: { max_agents: 2, max_parallel: 1, max_process_launches: 8 } });
  const result = await controller.run({
    topology,
    expectedRigor: "L2",
    taskId: "headless-production",
    policyFingerprint,
    authorityFingerprint: providerDigest("headless-production-authority"),
    budget,
    scopePaths: ["tools"],
    task: { task_id: "headless-production", summary: "Review the bounded Production implementation", scope_paths: ["tools"] },
    reviewers: {
      leads: [{ agent_id: "review-lead", role: "Independent Review Lead" }],
      orchestrator: { agent_id: "review-orchestrator", role: "Orchestrator Agent" },
      validator: { agent_id: "review-validator", role: "Safety and Acceptance Decision Lead" },
    },
    expiresAt: "2029-01-01T01:00:00.000Z",
  });
  assert.equal(result.decision, "PASS", JSON.stringify(result));
  assert.equal(result.outcomes.length, 3);
  assert.equal(result.outcomes[0].selected_model, "fixture-model");
  assert.equal(result.outcomes[0].selected_effort, "high");
  assert.equal(result.outcomes[1].agent_id, "lead-implementation");
  assert.equal(result.outcomes[2].state, "DETERMINISTIC_SYNTHESIS");
  const reviewerAssignmentsBeforeL1 = store.query({ kind: "AgentReviewerAssignment", limit: 100 }).records.length;
  const l1Topology = controller.plan({ rigor: "L1", requiredRoles: [], tasks: [], requiredPerspectives: [], budgets: { max_agents: 0, max_parallel: 1, max_process_launches: 1 } });
  const l1Result = await controller.run({
    topology: l1Topology,
    expectedRigor: "L1",
    taskId: "headless-production",
    policyFingerprint,
    authorityFingerprint: providerDigest("headless-production-l1-authority"),
    budget,
    scopePaths: ["tools"],
    task: { task_id: "headless-production-l1", summary: "Perform one bounded direct Orchestrator review", scope_paths: ["tools"] },
    reviewers: {
      leads: [{ agent_id: "review-lead", role: "Independent Review Lead" }],
      orchestrator: { agent_id: "review-orchestrator", role: "Orchestrator Agent" },
      validator: { agent_id: "review-validator", role: "Safety and Acceptance Decision Lead" },
    },
    expiresAt: "2029-01-01T01:00:00.000Z",
  });
  assert.equal(l1Result.decision, "PASS", JSON.stringify(l1Result));
  assert.equal(l1Result.aggregate_usage.launches, 1);
  assert.equal(l1Result.outcomes[0].agent_id, "orchestrator");
  assert.equal(l1Result.outcomes[0].review_mode, "single_agent_internal");
  assert.equal(store.query({ kind: "AgentReviewerAssignment", limit: 100 }).records.length, reviewerAssignmentsBeforeL1);
  assert.equal(composition.runtime.status().agent_launcher_configured, true);
  assert.equal(store.listUnresolvedEffects().length, 0);
  assert.equal(store.listUnresolvedRuntimeRuns().length, 0);
  const l1RunId = l1Result.outcomes[0].run_id;
  const l1ClosureId = l1Result.outcomes[0].closure_id;
  store.close();
  const database = new DatabaseSync(databasePath);
  for (let index = 1; index <= 3; index += 1) database.prepare("DELETE FROM events WHERE event_id=?").run(`event-${l1ClosureId}-${index}`);
  database.prepare("DELETE FROM relations WHERE to_id=? OR from_id=?").run(l1ClosureId, l1ClosureId);
  database.prepare("DELETE FROM records WHERE id=?").run(l1ClosureId);
  database.close();
  store = openWorkflowStateStore({ repositoryRoot, databasePath, expectedIdentity: repositoryIdentity, receiptProofVerifier: receiptAuthority.verifier, finalizationFenceVerifier, runtimeRecoveryAuthorizer, protectedRuntimeVerifiers: true, clock: () => "2029-01-01T00:00:00.000Z" });
  assert.equal(store.mode, "recovery-only");
  await assert.rejects(() => recoverUnresolvedAgentRun({
    store,
    runId: l1RunId,
    recoveryAuthorizer: async ({ request, fingerprint }) => ({
      decision: "ALLOW",
      fingerprint,
      run_id: request.run_id,
      authority_epoch: request.authority_epoch,
      proof_fingerprint: "f".repeat(64),
    }),
    now: "2029-01-01T00:00:01.000Z",
  }), /AGENT_RUN_RECOVERY_AUTHORIZATION_INVALID/);
  const recovered = await recoverUnresolvedAgentRun({
    store,
    runId: l1RunId,
    recoveryAuthorizer: runtimeRecoveryAuthorizer,
    now: "2029-01-01T00:00:01.000Z",
  });
  assert.equal(recovered.decision, "PASS");
  assert.equal(store.mode, "readwrite");
  store.close();
  rmSync(databasePath, { force: true });
  rmSync(`${databasePath}-wal`, { force: true });
  rmSync(`${databasePath}-shm`, { force: true });
});
