#!/usr/bin/env node
import assert from "node:assert/strict";
import test from "node:test";
import { createHeadlessRunController, headlessRunControllerDigest } from "./lib/next_workflow/run_controller.mjs";

function storeFixture() {
  const records = new Map();
  const store = {
    revision: 0,
    revocation_epoch: 0,
    get({ id }) { return records.get(id); },
    query({ kind }) { return { records: [...records.values()].filter((record) => record.kind === kind) }; },
    persistDelegationGrantAuthority({ record }) { record.payload.authority_proof_fingerprint = headlessRunControllerDigest(record); records.set(record.id, record); this.revision += 1; return { revision: this.revision }; },
    persistResourceCostReservationAuthority({ record }) { record.payload.authority_proof_fingerprint = headlessRunControllerDigest(record); records.set(record.id, record); this.revision += 1; return { revision: this.revision }; },
    persistReviewerAssignmentAuthority({ record }) { record.payload.authority_proof_fingerprint = headlessRunControllerDigest(record); records.set(record.id, record); this.revision += 1; return { revision: this.revision }; },
    persistAgentReviewAuthority({ record }) { record.payload.authority_proof_fingerprint = headlessRunControllerDigest(record); records.set(record.id, record); this.revision += 1; return { revision: this.revision }; },
    commitAgentLifecycle({ records: incoming }) { for (const record of incoming) records.set(record.id, record); this.revision += 1; return { revision: this.revision }; },
    commit({ records: incoming }) { for (const record of incoming) records.set(record.id, record); this.revision += 1; return { revision: this.revision }; },
  };
  return { store, records };
}

function authorityVerifier() {
  return { trusted: true, independent: true, authority_id: "headless-agent-authority", verify: ({ fingerprint }) => ({ verified: true, fingerprint }) };
}

function candidateRuntime(store, records, model = "gpt-5.6-terra", effort = "medium", resultStatus = "succeeded") {
  let counter = 0;
  return {
    async reconcilePending() {
      return { attempted: 0, remaining: 0, results: [], runtime_attempted: 0, runtime_remaining: 0, runtime_results: [] };
    },
    async launchAgent({ grant }) {
      counter += 1;
      const runId = `agent-run-${counter}`;
      const lifecycleRunId = `effect-${counter}`;
      const candidateId = `agent-result-candidate-${runId}`;
      const reviewSubjectFingerprint = grant.scope?.review_subject_fingerprint;
      const raw = {
        schema_version: "1.0.0",
        run_id: lifecycleRunId,
        status: resultStatus,
        summary: "Bounded review passed",
        findings: [],
        artifacts: reviewSubjectFingerprint ? [{
          kind: "review_disposition",
          fingerprint: reviewSubjectFingerprint,
          media_type: "application/vnd.next-workflow.review-disposition+json",
          size_bytes: 0,
        }] : [],
        metrics: { duration_ms: 1, input_tokens: 1, output_tokens: 1 },
      };
      const resultFingerprint = headlessRunControllerDigest(raw);
      records.set(runId, { id: runId, kind: "AgentRun", lifecycle_state: "RUNNING", source_revision: grant.fingerprint, payload: { authority_epoch: store.revocation_epoch, parent_agent_id: grant.parent_agent_id, child_agent_id: grant.child_agent_id, depth: grant.child_depth, result_candidate_record_id: candidateId, lifecycle_run_id: lifecycleRunId } });
      records.set(candidateId, { id: candidateId, kind: "AgentResultCandidate", lifecycle_state: "REPORTED", lineage_id: runId, policy_fp: "policy", source_revision: resultFingerprint, input_fp: resultFingerprint, payload: { result: raw, result_fingerprint: resultFingerprint, lifecycle_run_id: lifecycleRunId, process_identity_fingerprint: headlessRunControllerDigest({ process: counter }), launch_report: { provider: "codex", model, effort }, accepted: false } });
      return {
        decision: "PASS",
        run_id: runId,
        result_candidate_record_id: candidateId,
        result: raw,
        result_fingerprint: resultFingerprint,
        launch_effect_id: lifecycleRunId,
        admission_effect_id: `admission-${counter}`,
        review_required: true,
        attestation: { actual_observed: { identity: { model_id: model }, native_reasoning: effort } },
      };
    },
  };
}

const reviewers = {
  leads: [{ agent_id: "review-lead", role: "Independent Review Lead" }],
  orchestrator: { agent_id: "review-orchestrator", role: "Orchestrator Agent" },
  validator: { agent_id: "review-validator", role: "Safety and Acceptance Decision Lead" },
};

test("the headless RunController closes an Orchestrator-Lead-Task team only after three independent reviews", async () => {
  const { store, records } = storeFixture();
  let nextId = 0;
  const observedTasks = [];
  const controller = createHeadlessRunController({
    store,
    runtime: candidateRuntime(store, records),
    agentAuthorityVerifier: authorityVerifier(),
    launchFactory: async ({ agent, task }) => {
      observedTasks.push({ agent: structuredClone(agent), task: structuredClone(task) });
      return { selection: {}, context: {}, providerExecution: {} };
    },
    reviewer: async () => ({ accepted: true, decision: "PASS" }),
    clock: () => "2029-01-01T00:00:00.000Z",
    idFactory: () => `id-${++nextId}`,
  });
  const topology = controller.plan({
    rigor: "L3",
    requiredRoles: ["Implementation Lead", "Independent Review Lead", "Safety and Acceptance Decision Lead"],
    tasks: [{ task_id: "implementation", parent_role: "Implementation Lead", perspectives: ["technical"], writer: false }],
    requiredPerspectives: ["technical", "independent_review", "safety_acceptance"],
    budgets: { max_agents: 8, max_parallel: 4, max_process_launches: 20 },
  });
  assert.equal(topology.decision, "PASS");
  const result = await controller.run({
    topology,
    expectedRigor: "L3",
    taskId: "headless-task",
    policyFingerprint: "policy",
    authorityFingerprint: "authority",
    budget: { max_runtime_ms: 1000, max_tokens: 1000, max_cost: 1, max_retries: 0 },
    scopePaths: ["tools"],
    task: { task_id: "headless-task", summary: "Review the bounded implementation", scope_paths: ["tools"] },
    tasks: [{ task_id: "implementation", summary: "Review the bounded implementation", scope_paths: ["tools"] }],
    reviewers,
    expiresAt: "2029-01-01T01:00:00.000Z",
  });
  assert.equal(result.decision, "PASS");
  assert.equal(result.outcomes.length, topology.agents.length + 1);
  assert.ok(result.outcomes.slice(0, -1).every((outcome) => outcome.state === "CLOSED"));
  assert.equal(result.outcomes.at(-1).state, "DETERMINISTIC_SYNTHESIS");
  assert.ok([...records.values()].some((record) => record.kind === "AgentResult"));
  assert.ok([...records.values()].some((record) => record.kind === "AgentRunClosure"));
  const taskLaunch = observedTasks.find((entry) => entry.agent.layer === "task");
  assert.ok(taskLaunch);
  assert.equal(taskLaunch.task.summary, "Review the bounded implementation");
  assert.ok(taskLaunch.task.data.some((entry) => entry.source === "parent_result" && entry.value.parent_agent_id === "lead-implementation" && /^[a-f0-9]{64}$/.test(entry.value.result_fingerprint)));
});

test("L1 launches one direct Orchestrator and closes without independent reviewer launches", async () => {
  const { store, records } = storeFixture();
  let launched = 0;
  let reviewerCalled = false;
  const runtime = candidateRuntime(store, records);
  const controller = createHeadlessRunController({
    store,
    runtime: {
      ...runtime,
      async launchAgent(input) {
        launched += 1;
        return runtime.launchAgent(input);
      },
    },
    agentAuthorityVerifier: authorityVerifier(),
    launchFactory: async () => ({ selection: {}, context: {}, providerExecution: {} }),
    reviewer: async () => {
      reviewerCalled = true;
      return { accepted: true, decision: "PASS" };
    },
    clock: () => "2029-01-01T00:00:00.000Z",
    idFactory: (() => { let id = 0; return () => `l1-${++id}`; })(),
  });
  const topology = controller.plan({
    rigor: "L1",
    requiredRoles: [],
    tasks: [],
    requiredPerspectives: [],
    budgets: { max_agents: 0, max_parallel: 1, max_process_launches: 1 },
  });
  const result = await controller.run({
    topology,
    expectedRigor: "L1",
    taskId: "title",
    policyFingerprint: "policy",
    authorityFingerprint: "authority",
    budget: { max_runtime_ms: 1000, max_tokens: 1000, max_cost: 0, max_retries: 0 },
    scopePaths: ["index.md"],
    task: { task_id: "title", summary: "Change one title", scope_paths: ["index.md"] },
    reviewers,
    expiresAt: "2029-01-01T01:00:00.000Z",
  });
  assert.equal(result.decision, "PASS");
  assert.equal(result.outcomes[0].agent_id, "orchestrator");
  assert.equal(result.outcomes[0].review_mode, "single_agent_internal");
  assert.equal(result.outcomes.at(-1).state, "DETERMINISTIC_SYNTHESIS");
  assert.equal(launched, 1);
  assert.equal(reviewerCalled, false);
  assert.equal([...records.values()].filter((record) => record.kind === "AgentReviewerAssignment").length, 0);
});

test("L1 rejects a topology that is re-fingerprinted with more than one Orchestrator", async () => {
  const { store, records } = storeFixture();
  const controller = createHeadlessRunController({
    store,
    runtime: candidateRuntime(store, records),
    agentAuthorityVerifier: authorityVerifier(),
    launchFactory: async () => ({ selection: {}, context: {}, providerExecution: {} }),
    reviewer: async () => ({ accepted: true, decision: "PASS" }),
  });
  const valid = controller.plan({
    rigor: "L1",
    requiredRoles: [],
    tasks: [],
    requiredPerspectives: [],
    budgets: { max_agents: 0, max_parallel: 1, max_process_launches: 1 },
  });
  const { fingerprint: _fingerprint, ...core } = valid;
  const tamperedCore = {
    ...core,
    agents: [...core.agents, { ...core.agents[0] }],
    planned_process_launches: 2,
    budgets: { ...core.budgets, max_process_launches: 2 },
  };
  const tampered = { ...tamperedCore, fingerprint: headlessRunControllerDigest(tamperedCore) };
  await assert.rejects(() => controller.run({
    topology: tampered,
    expectedRigor: "L1",
    taskId: "tampered-l1",
    policyFingerprint: "policy",
    authorityFingerprint: "authority",
    budget: { max_runtime_ms: 1000, max_tokens: 1000, max_cost: 0, max_retries: 0 },
    scopePaths: ["index.md"],
    task: { task_id: "tampered-l1", summary: "Change one title", scope_paths: ["index.md"] },
    reviewers,
    expiresAt: "2029-01-01T01:00:00.000Z",
  }), /HEADLESS_TOPOLOGY_STRUCTURE_INVALID|HEADLESS_L1_TOPOLOGY_INVALID/);
  const invalidRootCore = {
    ...core,
    agents: [{ ...core.agents[0], may_delegate: false, writer: false }],
  };
  const invalidRoot = { ...invalidRootCore, fingerprint: headlessRunControllerDigest(invalidRootCore) };
  await assert.rejects(() => controller.run({
    topology: invalidRoot,
    expectedRigor: "L1",
    taskId: "tampered-l1-root",
    policyFingerprint: "policy",
    authorityFingerprint: "authority",
    budget: { max_runtime_ms: 1000, max_tokens: 1000, max_cost: 0, max_retries: 0 },
    scopePaths: ["index.md"],
    task: { task_id: "tampered-l1-root", summary: "Change one title", scope_paths: ["index.md"] },
    reviewers,
    expiresAt: "2029-01-01T01:00:00.000Z",
  }), /HEADLESS_TOPOLOGY_STRUCTURE_INVALID/);
  await assert.rejects(() => controller.run({
    topology: valid,
    expectedRigor: "L5",
    taskId: "downgraded-l5",
    policyFingerprint: "policy",
    authorityFingerprint: "authority",
    budget: { max_runtime_ms: 1000, max_tokens: 1000, max_cost: 0, max_retries: 0 },
    scopePaths: ["index.md"],
    task: { task_id: "downgraded-l5", summary: "Attempt to replace strict planning", scope_paths: ["index.md"] },
    reviewers,
    expiresAt: "2029-01-01T01:00:00.000Z",
  }), /HEADLESS_TOPOLOGY_RIGOR_BINDING_INVALID/);
});

for (const resultStatus of ["failed", "blocked"]) {
  test(`${resultStatus} subject results STOP before review and persist a terminal stop disposition`, async () => {
    const { store, records } = storeFixture();
    let reviewerCalled = false;
    const controller = createHeadlessRunController({
      store,
      runtime: candidateRuntime(store, records, "gpt-5.6-sol", "high", resultStatus),
      agentAuthorityVerifier: authorityVerifier(),
      launchFactory: async () => ({ selection: {}, context: {}, providerExecution: {} }),
      reviewer: async () => {
        reviewerCalled = true;
        return { accepted: true, decision: "PASS" };
      },
      clock: () => "2029-01-01T00:00:00.000Z",
      idFactory: (() => { let id = 0; return () => `${resultStatus}-${++id}`; })(),
    });
    const topology = controller.plan({
      rigor: "L2",
      requiredRoles: ["Implementation Lead"],
      tasks: [],
      requiredPerspectives: [],
      budgets: { max_agents: 1, max_parallel: 1, max_process_launches: 8 },
    });
    const result = await controller.run({
      topology,
      expectedRigor: "L2",
      taskId: `${resultStatus}-task`,
      policyFingerprint: "policy",
      authorityFingerprint: "authority",
      budget: { max_runtime_ms: 1000, max_tokens: 1000, max_cost: 1, max_retries: 0 },
      scopePaths: ["tools"],
      task: { task_id: `${resultStatus}-task`, summary: "Review the bounded implementation", scope_paths: ["tools"] },
      reviewers,
      expiresAt: "2029-01-01T01:00:00.000Z",
    });
    assert.equal(result.decision, "STOP");
    assert.equal(result.outcomes[0].code, `HEADLESS_AGENT_RESULT_${resultStatus.toUpperCase()}`);
    assert.equal(reviewerCalled, false);
    assert.ok([...records.values()].some((record) => record.kind === "AgentRunStopDisposition" && record.payload.code === `HEADLESS_AGENT_RESULT_${resultStatus.toUpperCase()}`));
    assert.ok([...records.values()].some((record) => record.kind === "AgentRunStopClosure" && record.lifecycle_state === "STOPPED"));
  });
}

test("startup recovery blocks every launch while an effect outcome is unresolved", async () => {
  const { store } = storeFixture();
  let launched = false;
  const runtime = {
    async reconcilePending() {
      return {
        attempted: 1,
        remaining: 1,
        results: [{ effect_id: "effect-unknown", state: "MANUAL_RECOVERY_REQUIRED" }],
        runtime_attempted: 0,
        runtime_remaining: 0,
        runtime_results: [],
      };
    },
    async launchAgent() {
      launched = true;
      throw new Error("must not launch");
    },
  };
  const controller = createHeadlessRunController({
    store,
    runtime,
    agentAuthorityVerifier: authorityVerifier(),
    launchFactory: async () => ({ selection: {}, context: {}, providerExecution: {} }),
    reviewer: async () => ({ accepted: true, decision: "PASS" }),
    clock: () => "2029-01-01T00:00:00.000Z",
    idFactory: () => "recovery-stop",
  });
  const topology = controller.plan({ rigor: "L2", requiredRoles: ["Implementation Lead"], tasks: [], requiredPerspectives: [], budgets: { max_agents: 1, max_parallel: 1, max_process_launches: 8 } });
  const result = await controller.run({
    topology,
    expectedRigor: "L2",
    taskId: "recovery-stop-task",
    policyFingerprint: "policy",
    authorityFingerprint: "authority",
    budget: { max_runtime_ms: 1000, max_tokens: 1000, max_cost: 1, max_retries: 0 },
    scopePaths: ["tools"],
    task: { task_id: "recovery-stop-task", summary: "Reconcile the bounded runtime", scope_paths: ["tools"] },
    reviewers,
    expiresAt: "2029-01-01T01:00:00.000Z",
  });
  assert.equal(result.decision, "STOP");
  assert.equal(result.outcomes[0].code, "HEADLESS_MANUAL_RECOVERY_REQUIRED");
  assert.equal(launched, false);
});

test("a reconciled launch failure still requires verified material progress before retry", async () => {
  const { store } = storeFixture();
  let recoveryCalls = 0;
  const runtime = {
    async reconcilePending() {
      recoveryCalls += 1;
      return { attempted: 0, remaining: 0, results: [], runtime_attempted: 0, runtime_remaining: 0, runtime_results: [] };
    },
    async launchAgent() {
      throw new Error("TRANSIENT_PROVIDER_FAILURE");
    },
  };
  const controller = createHeadlessRunController({
    store,
    runtime,
    agentAuthorityVerifier: authorityVerifier(),
    launchFactory: async () => ({ selection: {}, context: {}, providerExecution: {} }),
    reviewer: async () => ({ accepted: true, decision: "PASS" }),
    clock: () => "2029-01-01T00:00:00.000Z",
    idFactory: (() => { let id = 0; return () => `retry-stop-${++id}`; })(),
  });
  const topology = controller.plan({ rigor: "L2", requiredRoles: ["Implementation Lead"], tasks: [], requiredPerspectives: [], budgets: { max_agents: 1, max_parallel: 1, max_process_launches: 8 } });
  const result = await controller.run({
    topology,
    expectedRigor: "L2",
    taskId: "retry-stop-task",
    policyFingerprint: "policy",
    authorityFingerprint: "authority",
    budget: { max_runtime_ms: 1000, max_tokens: 1000, max_cost: 1, max_retries: 0 },
    scopePaths: ["tools"],
    task: { task_id: "retry-stop-task", summary: "Attempt the bounded provider launch", scope_paths: ["tools"] },
    reviewers,
    expiresAt: "2029-01-01T01:00:00.000Z",
  });
  assert.equal(result.decision, "STOP");
  assert.equal(result.outcomes[0].code, "HEADLESS_TOTAL_RETRY_LIMIT");
  assert.equal(result.outcomes[0].failure_code, "TRANSIENT_PROVIDER_FAILURE");
  assert.equal(recoveryCalls, 2);
});

test("a rejected independent review stops the remaining team", async () => {
  const { store, records } = storeFixture();
  const controller = createHeadlessRunController({
    store,
    runtime: candidateRuntime(store, records, "gpt-5.6-sol", "high"),
    agentAuthorityVerifier: authorityVerifier(),
    launchFactory: async () => ({ selection: {}, context: {}, providerExecution: {} }),
    reviewer: async ({ kind }) => kind === "validator" ? { accepted: false, decision: "STOP", code: "VALIDATOR_REJECTED" } : { accepted: true, decision: "PASS" },
    clock: () => "2029-01-01T00:00:00.000Z",
    idFactory: () => "stop",
  });
  const topology = controller.plan({ rigor: "L2", requiredRoles: ["Implementation Lead"], tasks: [], requiredPerspectives: [], budgets: { max_agents: 1, max_parallel: 1, max_process_launches: 8 } });
  const result = await controller.run({
    topology,
    expectedRigor: "L2",
    taskId: "stop-task",
    policyFingerprint: "policy",
    authorityFingerprint: "authority",
    budget: { max_runtime_ms: 1000, max_tokens: 1000, max_cost: 1, max_retries: 0 },
    scopePaths: ["tools"],
    task: { task_id: "stop-task", summary: "Review the bounded implementation", scope_paths: ["tools"] },
    reviewers,
    expiresAt: "2029-01-01T01:00:00.000Z",
  });
  assert.equal(result.decision, "STOP");
  assert.equal(result.outcomes.at(-1).code, "VALIDATOR_REJECTED");
  assert.equal([...records.values()].some((record) => record.kind === "AgentResult"), false);
});

test("a candidate cannot close when separately authenticated reviewer runs are unavailable", async () => {
  const { store, records } = storeFixture();
  const candidate = candidateRuntime(store, records);
  let launches = 0;
  const runtime = {
    reconcilePending: (...arguments_) => candidate.reconcilePending(...arguments_),
    async launchAgent(input) {
      launches += 1;
      if (launches > 1) throw new Error("REVIEWER_RUNTIME_UNAVAILABLE");
      return candidate.launchAgent(input);
    },
  };
  const controller = createHeadlessRunController({
    store,
    runtime,
    agentAuthorityVerifier: authorityVerifier(),
    launchFactory: async () => ({ selection: {}, context: {}, providerExecution: {} }),
    reviewer: async () => ({ accepted: true, decision: "PASS" }),
    clock: () => "2029-01-01T00:00:00.000Z",
    idFactory: (() => { let id = 0; return () => `missing-review-${++id}`; })(),
  });
  const topology = controller.plan({ rigor: "L2", requiredRoles: ["Implementation Lead"], tasks: [], requiredPerspectives: [], budgets: { max_agents: 1, max_parallel: 1, max_process_launches: 8 } });
  const result = await controller.run({
    topology,
    expectedRigor: "L2",
    taskId: "review-unavailable",
    policyFingerprint: "policy",
    authorityFingerprint: "authority",
    budget: { max_runtime_ms: 1000, max_tokens: 1000, max_cost: 1, max_retries: 0 },
    scopePaths: ["tools"],
    task: { task_id: "review-unavailable", summary: "Review the bounded implementation", scope_paths: ["tools"] },
    reviewers,
    expiresAt: "2029-01-01T01:00:00.000Z",
  });
  assert.equal(result.decision, "STOP");
  assert.equal(result.outcomes[0].code, "REVIEWER_RUNTIME_UNAVAILABLE");
  assert.equal([...records.values()].some((record) => record.kind === "AgentResult"), false);
  assert.equal([...records.values()].some((record) => record.kind === "AgentRunClosure"), false);
});
