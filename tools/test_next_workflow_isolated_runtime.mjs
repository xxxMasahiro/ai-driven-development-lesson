#!/usr/bin/env node
import assert from "node:assert/strict";
import { chmodSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { createDelegationGrant, persistDelegationGrant } from "./lib/next_workflow/agents.mjs";
import { buildCliLaunchPlan, createRunLifecycleCliExecutor, providerDigest, providerIdentityKey } from "./lib/next_workflow/providers.mjs";
import { createRunLifecyclePort, runLifecycleDigest } from "./lib/next_workflow/run_lifecycle.mjs";
import { createLinuxIsolatedContainment, diagnoseLinuxIsolationPrerequisites } from "./lib/next_workflow/runtime_containment.mjs";
import { createIsolatedVerificationRuntime } from "./lib/next_workflow/runtime.mjs";
import { createProtectedAgentAuthorityVerifier, createProtectedApprovalAuthority, createProtectedFinalizationFenceVerifier, createProtectedIsolatedAuthorityVerifier, createProtectedLaunchObservationVerifier, createProtectedReceiptAuthority, loadProtectedRuntimeTrust } from "./lib/next_workflow/runtime_trust.mjs";
import { openWorkflowStateStore } from "./lib/next_workflow/store.mjs";

const roots = [];
const isolatedRuntimeTest = diagnoseLinuxIsolationPrerequisites().available ? test : test.skip;
test.after(() => roots.forEach((root) => rmSync(root, { recursive: true, force: true })));

function fileDigest(candidate) {
  return providerDigest(readFileSync(candidate));
}

isolatedRuntimeTest("an isolated local CLI runs through the common gateway with explicit observed model and effort", async () => {
  const root = mkdtempSync(path.join(tmpdir(), "next-workflow-isolated-runtime-"));
  const repositoryRoot = mkdtempSync(path.join(tmpdir(), "next-workflow-isolated-repository-"));
  const trustRoot = mkdtempSync(path.join(tmpdir(), "next-workflow-isolated-trust-"));
  roots.push(root, repositoryRoot, trustRoot);
  chmodSync(root, 0o700);
  chmodSync(repositoryRoot, 0o700);
  chmodSync(trustRoot, 0o700);
  const inputRoot = path.join(root, "input");
  const outputRoot = path.join(root, "output");
  mkdirSync(inputRoot, { mode: 0o700 });
  mkdirSync(outputRoot, { mode: 0o700 });
  const script = path.join(inputRoot, "fixture-agent.mjs");
  const prompt = path.join(inputRoot, "task-envelope.json");
  const response = path.join(outputRoot, "agent-result.json");
  const fixedEffectId = "effect-isolated-fixed";
  const identity = { execution_provider_id: "isolated-cli", model_publisher_id: "fixture-publisher", agent_product_id: "fixture-agent", adapter_id: "isolated-adapter", transport_id: "cli_process", model_id: "fixture-model" };
  const identityKey = providerIdentityKey(identity);
  writeFileSync(script, `
import { readFileSync, writeFileSync, writeSync } from "node:fs";
const [response, runId, provider, model, effort] = process.argv.slice(2);
const taskEnvelope = readFileSync(0, "utf8");
if (!taskEnvelope.includes("schema_version")) throw new Error("task envelope missing from stdin");
writeSync(2, JSON.stringify({ type: "launch_observation", provider, model, effort }) + "\\n");
writeFileSync(response, JSON.stringify({ schema_version: "1.0.0", run_id: runId, status: "succeeded", summary: "isolated fixture completed", findings: [], artifacts: [], metrics: { duration_ms: 1 } }));
`, { mode: 0o600 });
  writeFileSync(prompt, "{\"schema_version\":\"2.0.0\"}\n", { mode: 0o600 });
  const executable = realpathSync(process.execPath);
  const executableDigest = providerDigest(readFileSync(executable));
  const manifest = {
    manifest_id: "isolated-fixture-manifest",
    version: "1.0.0",
    identity,
    identity_key: identityKey,
    capabilities: ["read", "structured_output"],
    native_reasoning_values: ["high"],
    effort_mapping: { high: "enhanced" },
    reasoning_mapping_provenance: { source_id: "fixture-reviewed-mapping", revision: "1", reviewed_by: "independent-fixture-reviewer", proof_fingerprint: providerDigest("fixture-mapping-proof") },
    selection_profile: { correctness: 95, safety: 95, efficiency: 80, roles: ["reviewer"] },
    certification_profile: { probe_authority: "independent", certification_authority: "independent", isolated_probe: true },
    resource_bounds: { cost: 1 },
    priority: 1,
    estimated_cost: 1,
    transport_descriptor: {
      argv_template: [script, "{{response_file}}", fixedEffectId, identityKey, "{{model_id}}", "{{native_reasoning}}"],
      argv_schema: ["response_file", "model_id", "native_reasoning"],
      environment_allowlist: [],
      private_response_file: true,
      executable: { canonical_path: executable, digest: executableDigest },
      execution_policy: { allowed_owner_uids: [process.getuid()], executable_mode_mask: 0o755, allowed_working_roots: [inputRoot], allowed_response_roots: [outputRoot], timeout_ms: 5000, max_prompt_bytes: 65536, max_response_bytes: 65536, max_stderr_bytes: 65536 },
    },
  };
  const registry = { fingerprint: providerDigest("isolated-registry"), observed_at: "2029-01-01T00:00:00.000Z", entries: [{ eligible: true, manifest, certification: { certification_id: "isolated-certification" } }] };
  const plan = buildCliLaunchPlan({ manifest, promptFile: prompt, promptFingerprint: providerDigest(readFileSync(prompt)), responseFile: response, modelId: identity.model_id, nativeReasoning: "high", sandbox: "read-only", workingDirectory: inputRoot });
  const repositoryIdentity = { repository_logical_id: "isolated-repository", checkout_instance_id: "isolated-checkout" };
  const candidateFingerprint = providerDigest("isolated-candidate");
  const isolatedAuthority = { schema_version: "1.0.0", profile: "isolated_verification", authority_id: "isolated-authority", repository_logical_id: repositoryIdentity.repository_logical_id, checkout_instance_id: repositoryIdentity.checkout_instance_id, fixture_root_fingerprint: providerDigest(root), candidate_fingerprint: candidateFingerprint, repository_head: "b".repeat(40), authority_epoch: 0, fresh_until: "2030-01-01T00:00:00.000Z", production_authority: false, activation_transition_allowed: false };
  let activationFingerprint = null;
  const unshare = realpathSync("/usr/bin/unshare");
  const bubblewrap = realpathSync("/usr/bin/bwrap");
  const manifestFingerprint = providerDigest(manifest);
  const trustPath = path.join(trustRoot, "owner-trust.json");
  const barrierScript = realpathSync(path.join(path.dirname(new URL(import.meta.url).pathname), "lib", "next_workflow", "runtime_barrier.cjs"));
  writeFileSync(trustPath, JSON.stringify({ schema_version: "1.0.0", trust_source_id: "isolated-owner-trust", revision: 1, repository_logical_id: repositoryIdentity.repository_logical_id, checkout_instance_id: repositoryIdentity.checkout_instance_id, issued_at: "2028-01-01T00:00:00.000Z", expires_at: "2030-01-01T00:00:00.000Z", release_trust: {}, release_prerequisites: {}, runtime_authorities: { "isolated-launch-observer": { authority_id: "isolated-launch-observer", kind: "launch_observation", enabled: true, revision: 1, source: "pinned_process_and_certified_provider_metadata", allowed_executable_fingerprints: [fileDigest(executable)], allowed_manifest_fingerprints: [manifestFingerprint] }, "isolated-linux-containment": { authority_id: "isolated-linux-containment", kind: "linux_isolation", enabled: true, revision: 1, profile_id: "linux-user-mount-net-v1", unshare: { path: unshare, fingerprint: fileDigest(unshare) }, bubblewrap: { path: bubblewrap, fingerprint: fileDigest(bubblewrap) }, barrier_interpreter: { path: executable, fingerprint: fileDigest(executable) }, barrier_script: { path: barrierScript, fingerprint: fileDigest(barrierScript) } }, "isolated-authority": { authority_id: "isolated-authority", kind: "isolated_authority", enabled: true, revision: 1, source: "owner_protected_isolated_profile", profile_id: "isolated_verification", allowed_candidate_fingerprints: [candidateFingerprint] }, "isolated-receipt-verifier": { authority_id: "isolated-receipt-verifier", kind: "receipt_proof", enabled: true, revision: 1, source: "owner_protected_deterministic_binding", owner_id: "isolated-adapter-owner" }, "isolated-approval-issuer": { authority_id: "isolated-approval-issuer", kind: "approval_issuer", enabled: true, revision: 1, source: "owner_protected_approval_binding" }, "isolated-agent-authority": { authority_id: "isolated-agent-authority", kind: "agent_authority", enabled: true, revision: 1, source: "owner_protected_agent_authority", allowed_record_kinds: ["DelegationGrant", "ResourceCostReservation", "AgentReviewerAssignment", "AgentLeadReview", "AgentOrchestratorReview", "AgentValidatorDisposition", "ValidatorDecision"] }, "isolated-finalization-verifier": { authority_id: "isolated-finalization-verifier", kind: "finalization_fence", enabled: true, revision: 1, source: "owner_protected_live_fence" } } }), { mode: 0o600 });
  const runtimeTrust = loadProtectedRuntimeTrust({ repositoryRoot, repositoryLogicalId: repositoryIdentity.repository_logical_id, checkoutInstanceId: repositoryIdentity.checkout_instance_id, trustPath, now: "2029-01-01T00:00:00.000Z" });
  assert.throws(() => { runtimeTrust.runtime_authorities["forged-authority"] = { authority_id: "forged-authority", kind: "receipt_proof", enabled: true }; }, TypeError);
  const isolatedAuthorityVerifier = createProtectedIsolatedAuthorityVerifier({ runtimeTrust, authorityId: "isolated-authority" });
  const receiptAuthority = createProtectedReceiptAuthority({ runtimeTrust, authorityId: "isolated-receipt-verifier" });
  const approvalAuthority = createProtectedApprovalAuthority({ runtimeTrust, authorityId: "isolated-approval-issuer" });
  const agentAuthorityVerifier = createProtectedAgentAuthorityVerifier({ runtimeTrust, authorityId: "isolated-agent-authority" });
  const finalizationFenceVerifier = createProtectedFinalizationFenceVerifier({ runtimeTrust, authorityId: "isolated-finalization-verifier", activationFingerprintProvider: () => activationFingerprint, policyRevisionProvider: () => providerDigest("isolated-policy"), settingsRevisionProvider: () => "isolated-settings-1", authorityEpochProvider: () => 0 });
  mkdirSync(path.join(repositoryRoot, ".workflow-state"), { mode: 0o700 });
  assert.throws(() => openWorkflowStateStore({ repositoryRoot, expectedIdentity: repositoryIdentity, receiptProofVerifier: { trusted: true, independent: true, verifier_id: receiptAuthority.verifier.verifier_id, verify: () => ({ verified: true }) }, finalizationFenceVerifier, protectedRuntimeVerifiers: true, clock: () => "2029-01-01T00:00:00.000Z" }), /PROTECTED_RUNTIME_VERIFIER_REQUIRED/);
  const store = openWorkflowStateStore({ repositoryRoot, expectedIdentity: repositoryIdentity, receiptProofVerifier: receiptAuthority.verifier, finalizationFenceVerifier, protectedRuntimeVerifiers: true, clock: () => "2029-01-01T00:00:00.000Z" });
  const approvalCore = { reason: "fixture approval", approval_id: "isolated-approval", repository_logical_id: repositoryIdentity.repository_logical_id, checkout_instance_id: repositoryIdentity.checkout_instance_id, task_id: "isolated-task", run_id: fixedEffectId, operation: "isolated_cli", target_id: "isolated:local-cli", request_fingerprint: providerDigest("isolated-request"), policy_revision: providerDigest("isolated-policy"), settings_revision: "isolated-settings-1", authority_epoch: 0, issued_at: "2029-01-01T00:00:00.000Z", fresh_until: "2029-01-01T00:05:00.000Z" };
  const approval = approvalAuthority.issue(approvalCore);
  assert.throws(() => store.issueRuntimeApproval({ expectedRevision: store.revision, approval, verifier: { trusted: true, independent: true, verifier_id: approvalAuthority.verifier.verifier_id, verify: () => ({ verified: true }) } }), /PROTECTED_RUNTIME_VERIFIER_REQUIRED/);
  assert.equal(store.issueRuntimeApproval({ expectedRevision: store.revision, approval, verifier: approvalAuthority.verifier }).state, "pending");
  const launchObservationVerifier = createProtectedLaunchObservationVerifier({ runtimeTrust, authorityId: "isolated-launch-observer" });
  const containment = createLinuxIsolatedContainment({ runtimeTrust, authorityId: "isolated-linux-containment", inputRoot, outputRoot });
  const lifecycle = createRunLifecyclePort({
    store,
    clock: () => "2029-01-01T00:00:00.000Z",
    pathPolicy: ({ plan: candidate }) => ({ allowed: candidate.working_directory === inputRoot && path.dirname(candidate.stdin_file) === inputRoot && path.dirname(candidate.response_file) === outputRoot }),
    fenceGuard: async ({ plan: candidate }) => ({ allowed: candidate.authority_epoch === store.revocation_epoch, fence_fingerprint: candidate.fence_fingerprint, authority_epoch: candidate.authority_epoch }),
    effectFencer: async ({ run_id: runId, reason }) => ({ fenced: true, fingerprint: runLifecycleDigest({ run_id: runId, reason }) }),
    launchObservationVerifier,
    containment,
    limits: { maxRuntimeMs: 5000, maxResultBytes: 65536, maxStderrBytes: 65536, maxPromptBytes: 65536, maxArgv: 32 },
  });
  assert.throws(() => store.createRuntimeRun({ expectedRevision: store.revision, run: {} }), /PROTECTED_RUN_LIFECYCLE_WRITER_REQUIRED/);
  const cliExecutor = createRunLifecycleCliExecutor({ lifecyclePort: lifecycle });
  const runtimeOptions = { store, registryProvider: () => registry, cliExecutor, receiptVerifier: receiptAuthority.issuer, receiptProofVerifier: receiptAuthority.verifier, finalizationFenceVerifier, isolatedAuthority, isolatedAuthorityVerifier, fixtureRoot: root, targetId: "isolated:local-cli", instructionFingerprint: providerDigest("isolated-instruction"), policyFingerprint: providerDigest("isolated-policy"), settingsRevision: "isolated-settings-1", runtimeCapabilityFingerprint: providerDigest("isolated-runtime-capability"), clock: () => "2029-01-01T00:00:00.000Z", idFactory: () => "isolated-fixed" };
  assert.throws(() => createIsolatedVerificationRuntime({ ...runtimeOptions, isolatedAuthorityVerifier: { trusted: true, independent: true, verifier_id: "forged", verify: async () => ({ verified: true }) } }), /PROTECTED_RUNTIME_VERIFIER_REQUIRED/);
  assert.throws(() => createIsolatedVerificationRuntime({ ...runtimeOptions, cliExecutor: { descriptor_pinned: true, authority_fence_enforced: true, execute: async () => ({}) } }), /PROTECTED_AUTHORITY_FENCED_CLI_EXECUTOR_REQUIRED/);
  const runtime = createIsolatedVerificationRuntime(runtimeOptions);
  activationFingerprint = runtime.activation_fingerprint;
  const providerExecution = { identity_key: identityKey, registry_fingerprint: registry.fingerprint, manifest_fingerprint: manifestFingerprint, certification_fingerprint: providerDigest(registry.entries[0].certification), plan_fingerprint: plan.fingerprint, plan, executable_observation: { path: executable }, inherited_environment: {} };
  const result = await runtime.executeCliFixture({ providerExecution });
  assert.equal(result.result.launch_report.model, "fixture-model");
  assert.equal(result.result.launch_report.effort, "high");
  assert.equal(store.getRuntimeRun({ runId: fixedEffectId }).state, "COMPLETED");
  assert.equal(store.getIntent(result.effect_id).state, "RECONCILED");
  const grant = createDelegationGrant({
    grantId: "isolated-report-grant",
    parent: { agent_id: "orchestrator", depth: 0, role: "Orchestrator Agent", may_delegate: true },
    child: { agent_id: "isolated-lead", depth: 1, role: "Implementation Lead", parent_agent_id: "orchestrator", may_delegate: true },
    scope: { paths: ["fixture"] },
    authorityFingerprint: providerDigest("isolated-agent-authority"),
    budget: { max_runtime_ms: 5000, max_tokens: 1000, max_cost: 1, max_retries: 1 },
    ownership: { read_only: true, paths: [] },
    expiresAt: "2030-01-01T00:00:00.000Z",
    allowedActions: ["read"],
    allowedTools: ["rg"],
    capabilities: ["read"],
    sandbox: { mode: "read_only", network: false, writable_paths: [] },
    now: "2029-01-01T00:00:00.000Z",
  });
  const grantAuthority = { task_id: "isolated-task", policy_fingerprint: providerDigest("isolated-policy"), authority_epoch: 0, revocation_epoch: 0, fresh_until: "2030-01-01T00:00:00.000Z" };
  const forgedGrantVerifier = { trusted: true, independent: true, authority_id: "isolated-grant-verifier", verify: ({ fingerprint }) => ({ verified: true, authority_id: "isolated-grant-verifier", fingerprint, proof_fingerprint: providerDigest({ fingerprint, authority: "isolated-grant-verifier" }) }) };
  assert.throws(() => persistDelegationGrant({ store, grant, authorityBindings: grantAuthority, verifier: forgedGrantVerifier, now: "2029-01-01T00:00:00.000Z" }), /PROTECTED_RUNTIME_VERIFIER_REQUIRED/);
  persistDelegationGrant({ store, grant, authorityBindings: grantAuthority, verifier: agentAuthorityVerifier, now: "2029-01-01T00:00:00.000Z" });
  const reportRunId = "agent-run-isolated-launch-intent";
  const candidateId = `agent-result-candidate-${reportRunId}`;
  const reported = result.result.agent_result;
  const reportedFingerprint = result.result.result_fingerprint;
  const forgedLaunchIntentFingerprint = providerDigest("isolated-launch-intent");
  const reportRun = { id: reportRunId, kind: "AgentRun", schema_version: "1.0.0", authority_scope: "isolated-task", lineage_id: "isolated-launch-intent", lifecycle_state: "RUNNING", payload: { intent_id: "isolated-launch-intent", launch_intent_fingerprint: forgedLaunchIntentFingerprint, authority_epoch: 0, admission_effect_id: "missing-admission", admission_receipt_id: "missing-receipt", lifecycle_run_id: fixedEffectId, result_candidate_record_id: candidateId, state_history: ["PLANNED", "AUTHORIZED", "STARTING", "RUNNING"] }, source_revision: grant.fingerprint, policy_fp: grantAuthority.policy_fingerprint, input_fp: forgedLaunchIntentFingerprint };
  const reportCandidate = { id: candidateId, kind: "AgentResultCandidate", schema_version: "1.0.0", authority_scope: "isolated-task", lineage_id: reportRunId, lifecycle_state: "REPORTED", payload: { result: reported, result_fingerprint: reportedFingerprint, lifecycle_run_id: fixedEffectId, process_identity_fingerprint: result.result.lifecycle_process_identity_fingerprint, launch_report: result.result.launch_report, accepted: false }, source_revision: reportedFingerprint, policy_fp: grantAuthority.policy_fingerprint, input_fp: reportedFingerprint };
  const reportEvents = ["PLANNED", "AUTHORIZED", "STARTING", "RUNNING"].map((state, index) => ({ event_id: `event-${reportRunId}-${index + 1}`, aggregate_id: reportRunId, event_type: `AGENT_RUN_${state}`, payload: { launch_effect_id: fixedEffectId, state } }));
  reportEvents.push({ event_id: `event-${candidateId}`, aggregate_id: reportRunId, event_type: "AGENT_RESULT_CANDIDATE_REPORTED", payload: { result_candidate_record_id: candidateId, result_fingerprint: reportedFingerprint, review_required: true } });
  assert.throws(() => store.commitAgentLifecycle({ expectedRevision: store.revision, authorityEpoch: 0, records: [reportRun, reportCandidate], relations: [{ from_id: reportRunId, relation_kind: "reported_candidate", to_id: candidateId }], events: reportEvents }), /AGENT_RESULT_CANDIDATE_.*PROVENANCE_INVALID/);
  const replay = await runtime.executeCliFixture({ providerExecution });
  assert.equal(replay.effect_id, result.effect_id);
  assert.equal(replay.state, "RECONCILED");
  assert.equal(replay.reused, true);
  assert.equal(replay.proof_record_id, result.proof_record_id);
  assert.deepEqual(runtime.status(), { profile: "isolated_verification", production_available: false, activation_transition_allowed: false, network_allowed: false, registered_child_traversal_allowed: false, git_delivery_allowed: false, activation_fingerprint: runtime.activation_fingerprint, unresolved_effects: 0 });
  await assert.rejects(() => runtime.executeCliFixture({ providerExecution: { ...providerExecution, inherited_environment: { HTTPS_PROXY: "http://proxy.invalid" } }, taskId: "proxy-task", runId: "proxy-run" }), /SIDE_EFFECT_DENIED:ISOLATED_EFFECT_OUTSIDE_PROFILE/);
  await assert.rejects(() => runtime.executeCliFixture({ providerExecution: { ...providerExecution, plan: { ...plan, sandbox: "workspace-write" } }, taskId: "write-task", runId: "write-run" }), /SIDE_EFFECT_DENIED:ISOLATED_EFFECT_OUTSIDE_PROFILE/);
  const { fingerprint: ignoredPlanFingerprint, ...planCore } = plan;
  const unboundedPlanCore = { ...planCore, execution_policy: null };
  const unboundedPlan = { ...unboundedPlanCore, fingerprint: providerDigest(unboundedPlanCore) };
  await assert.rejects(() => runtime.executeCliFixture({ providerExecution: { ...providerExecution, plan: unboundedPlan, plan_fingerprint: unboundedPlan.fingerprint }, taskId: "unbounded-task", runId: "unbounded-run" }), /SIDE_EFFECT_DENIED:ISOLATED_EFFECT_OUTSIDE_PROFILE/);
  store.close();
});
