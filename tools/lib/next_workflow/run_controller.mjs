import { createHash, randomUUID } from "node:crypto";
import {
  acceptAgentResult,
  acceptDirectOrchestratorResult,
  agentResultEvidenceFingerprint,
  createDelegationGrant,
  evaluateAgentRetry,
  persistAgentReview,
  persistDelegationGrant,
  persistResourceCostReservation,
  persistReviewerAssignment,
  planTeamTopology,
} from "./agents.mjs";

function canonicalJson(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(",")}}`;
  return JSON.stringify(value);
}

function digest(value) {
  return createHash("sha256").update(canonicalJson(value)).digest("hex");
}

function requireString(value, code) {
  if (typeof value !== "string" || value.length === 0) throw new Error(code);
  return value;
}

function agentBudget(budget) {
  const normalized = {
    max_runtime_ms: budget?.max_runtime_ms,
    max_tokens: budget?.max_tokens,
    max_cost: budget?.max_cost,
    max_retries: budget?.max_retries,
  };
  for (const [field, value] of Object.entries(normalized)) if (!Number.isFinite(value) || value < 0) throw new Error(`HEADLESS_AGENT_BUDGET_INVALID:${field}`);
  return normalized;
}

function normalizedTask(task, fallbackPaths) {
  const scopePaths = [...new Set(task?.scope_paths ?? fallbackPaths ?? [])].sort();
  if (scopePaths.length === 0 || scopePaths.some((entry) => typeof entry !== "string" || entry.length === 0)) throw new Error("HEADLESS_AGENT_SCOPE_REQUIRED");
  return {
    task_id: requireString(task?.task_id, "HEADLESS_TASK_ID_REQUIRED"),
    summary: requireString(task?.summary, "HEADLESS_TASK_SUMMARY_REQUIRED"),
    scope_paths: scopePaths,
    data: Array.isArray(task?.data) ? structuredClone(task.data) : [],
  };
}

function chooseReviewers(agentId, configured) {
  const leadCandidates = configured.leads.filter((candidate) => candidate.agent_id !== agentId);
  const lead = leadCandidates[0];
  const orchestrator = configured.orchestrator;
  const validator = configured.validator;
  if (!lead || [lead.agent_id, orchestrator.agent_id, validator.agent_id].includes(agentId) || new Set([lead.agent_id, orchestrator.agent_id, validator.agent_id]).size !== 3) throw new Error("HEADLESS_INDEPENDENT_REVIEWERS_REQUIRED");
  return { lead, orchestrator, validator };
}

function reviewAssignment(runId, kind, reviewer) {
  return {
    run_id: runId,
    assignment_kind: kind,
    agent_id: reviewer.agent_id,
    agent_role: reviewer.role,
    read_only: true,
  };
}

function reviewerAgent(kind, reviewer) {
  return {
    agent_id: reviewer.agent_id,
    layer: "lead",
    depth: 1,
    role: kind === "orchestrator" ? "Orchestrator Review Lead" : reviewer.role,
    parent_agent_id: "orchestrator",
    may_delegate: false,
    writer: false,
    review_kind: kind,
    selection_role_id: { lead: "reviewer_gate", orchestrator: "orchestrator", validator: "validator" }[kind],
  };
}

function authoritativeCandidate({ launch, grant }) {
  const raw = launch.result;
  return {
    run_id: launch.run_id,
    candidate_record_id: launch.result_candidate_record_id,
    provenance: {
      source_fingerprint: launch.result_fingerprint,
      launch_effect_id: launch.launch_effect_id,
      admission_effect_id: launch.admission_effect_id,
    },
    scope_fingerprint: digest(grant.scope),
    conclusion: raw.summary,
    evidence_references: [...new Set(raw.findings.flatMap((finding) => finding.evidence_refs))].sort(),
    changed_artifact_manifest: raw.artifacts.map((artifact) => artifact.fingerprint).sort(),
    unresolved_items: raw.findings.filter((finding) => finding.severity === "error").map((finding) => finding.code).sort(),
  };
}

function recoveryDisposition(recovery) {
  if (!recovery || typeof recovery !== "object") return { safe: false, code: "HEADLESS_RECOVERY_RESULT_REQUIRED" };
  const effectUnsafe = recovery.remaining !== 0
    || (recovery.results ?? []).some((entry) => entry?.state === "MANUAL_RECOVERY_REQUIRED" || entry?.state === "CONFLICT");
  const runtimeUnsafe = recovery.runtime_remaining !== 0
    || (recovery.runtime_results ?? []).some((entry) => entry?.result === "unknown" || entry?.result === "conflict" || entry?.recovery === "manual_required");
  const agentUnsafe = Number(recovery.agent_remaining ?? 0) !== 0;
  return effectUnsafe || runtimeUnsafe || agentUnsafe
    ? { safe: false, code: "HEADLESS_MANUAL_RECOVERY_REQUIRED" }
    : { safe: true, code: "HEADLESS_RECOVERY_CLEAR" };
}

function stoppedResult({ topology, store, outcomes, code = null }) {
  const normalizedOutcomes = code && outcomes.length === 0
    ? [{ agent_id: "orchestrator", decision: "STOP", code }]
    : outcomes;
  const core = {
    schema_version: "1.0.0",
    decision: "STOP",
    profile: "headless_production",
    topology_fingerprint: topology.fingerprint,
    outcomes: normalizedOutcomes,
    authority_epoch: store.revocation_epoch,
  };
  return { ...core, fingerprint: digest(core) };
}

function persistRunStop({
  store,
  runId,
  candidateRecordId,
  resultFingerprint,
  code,
  authorityBindings,
  evidence = {},
  now,
}) {
  if (typeof runId !== "string" || typeof candidateRecordId !== "string" || !/^[a-f0-9]{64}$/.test(resultFingerprint ?? "")) return null;
  const dispositionId = `agent-run-stop-disposition-${runId}`;
  const closureId = `agent-run-stop-closure-${runId}`;
  const existing = store.get({ id: closureId });
  if (existing) return { disposition_id: dispositionId, closure_id: closureId };
  const payload = {
    run_id: runId,
    result_candidate_record_id: candidateRecordId,
    candidate_result_fingerprint: resultFingerprint,
    decision: "STOP",
    code,
    authority_epoch: authorityBindings.authority_epoch,
    evidence: structuredClone(evidence),
    stopped_at: now,
  };
  store.commitAgentLifecycle({
    expectedRevision: store.revision,
    authorityEpoch: authorityBindings.authority_epoch,
    records: [
      {
        id: dispositionId,
        kind: "AgentRunStopDisposition",
        schema_version: "1.0.0",
        authority_scope: authorityBindings.task_id,
        lineage_id: runId,
        lifecycle_state: "STOP",
        payload,
        source_revision: candidateRecordId,
        policy_fp: authorityBindings.policy_fingerprint,
        input_fp: resultFingerprint,
        fresh_until: authorityBindings.fresh_until,
      },
      {
        id: closureId,
        kind: "AgentRunStopClosure",
        schema_version: "1.0.0",
        authority_scope: authorityBindings.task_id,
        lineage_id: runId,
        lifecycle_state: "STOPPED",
        payload: {
          run_id: runId,
          disposition_id: dispositionId,
          result_candidate_record_id: candidateRecordId,
          candidate_result_fingerprint: resultFingerprint,
          decision: "STOP",
          code,
          authority_epoch: authorityBindings.authority_epoch,
          stopped_at: now,
        },
        source_revision: dispositionId,
        policy_fp: authorityBindings.policy_fingerprint,
        input_fp: resultFingerprint,
        fresh_until: authorityBindings.fresh_until,
      },
    ],
    relations: [
      { from_id: runId, relation_kind: "stopped_by", to_id: dispositionId },
      { from_id: dispositionId, relation_kind: "closed_by", to_id: closureId },
    ],
    events: [{
      event_id: `event-${closureId}`,
      aggregate_id: runId,
      event_type: "AGENT_RUN_STOPPED",
      payload: { run_id: runId, disposition_id: dispositionId, code, authority_epoch: authorityBindings.authority_epoch },
    }],
  });
  return { disposition_id: dispositionId, closure_id: closureId };
}

export async function recoverUnresolvedAgentRun({
  store,
  runId,
  recoveryAuthorizer,
  now = new Date().toISOString(),
} = {}) {
  if (!store || typeof store.get !== "function" || typeof store.listUnresolvedAgentRuns !== "function" || typeof recoveryAuthorizer !== "function" || typeof runId !== "string") throw new Error("AGENT_RUN_RECOVERY_INPUT_INVALID");
  const run = store.get({ id: runId });
  const candidateRecordId = run?.payload?.result_candidate_record_id;
  const candidate = candidateRecordId ? store.get({ id: candidateRecordId }) : null;
  if (run?.kind !== "AgentRun" || candidate?.kind !== "AgentResultCandidate" || candidate.lineage_id !== run.id || !/^[a-f0-9]{64}$/u.test(candidate.payload?.result_fingerprint ?? "")) {
    return { run_id: runId, decision: "STOP", recovery: "manual_required", code: "AGENT_RUN_RECOVERY_CANDIDATE_REQUIRED" };
  }
  const request = {
    run_id: runId,
    authority_epoch: store.revocation_epoch,
    requested_action: "record_manual_recovery",
    candidate_record_id: candidate.id,
    candidate_result_fingerprint: candidate.payload.result_fingerprint,
  };
  const fingerprint = digest(request);
  const authorization = await recoveryAuthorizer({ request: structuredClone(request), fingerprint });
  if (authorization?.decision !== "ALLOW"
    || authorization.fingerprint !== fingerprint
    || authorization.run_id !== runId
    || authorization.authority_epoch !== store.revocation_epoch
    || !/^[a-f0-9]{64}$/u.test(authorization.proof_fingerprint ?? "")) {
    return { run_id: runId, decision: "STOP", recovery: "manual_required", code: "AGENT_RUN_RECOVERY_AUTHORIZATION_REQUIRED" };
  }
  const authorityBindings = {
    task_id: run.authority_scope,
    policy_fingerprint: run.policy_fp,
    authority_epoch: store.revocation_epoch,
    revocation_epoch: store.revocation_epoch,
    fresh_until: run.fresh_until,
  };
  const closure = persistRunStop({
    store,
    runId,
    candidateRecordId: candidate.id,
    resultFingerprint: candidate.payload.result_fingerprint,
    code: "AGENT_RUN_RECOVERED_TO_STOP",
    authorityBindings,
    evidence: {
      recovery_request: request,
      recovery_authorization: authorization,
    },
    now,
  });
  return { run_id: runId, decision: "PASS", recovery: "stopped", ...closure };
}

function chargeLedger(ledger, launch) {
  const durationMs = Number(launch?.controller_metrics?.duration_ms);
  if (!Number.isFinite(durationMs) || durationMs < 0) return "HEADLESS_CONTROLLER_RUNTIME_METRICS_REQUIRED";
  ledger.runtime_ms += durationMs;
  if (ledger.runtime_ms > ledger.max_runtime_ms) return "HEADLESS_AGGREGATE_RUNTIME_BUDGET_EXCEEDED";
  return null;
}

function persistReviewerRunClosure({
  store,
  reviewLaunch,
  subjectRunId,
  assignmentKind,
  decision,
  authorityBindings,
  now,
}) {
  if (typeof reviewLaunch?.run_id !== "string" || typeof reviewLaunch?.result_candidate_record_id !== "string" || !/^[a-f0-9]{64}$/.test(reviewLaunch?.result_fingerprint ?? "")) return null;
  const closureId = `agent-reviewer-run-closure-${reviewLaunch.run_id}`;
  if (store.get({ id: closureId })) return closureId;
  const payload = {
    run_id: reviewLaunch.run_id,
    result_candidate_record_id: reviewLaunch.result_candidate_record_id,
    result_fingerprint: reviewLaunch.result_fingerprint,
    review_subject_run_id: subjectRunId,
    assignment_kind: assignmentKind,
    decision,
    authority_epoch: authorityBindings.authority_epoch,
    closed_at: now,
  };
  store.commitAgentLifecycle({
    expectedRevision: store.revision,
    authorityEpoch: authorityBindings.authority_epoch,
    records: [{
      id: closureId,
      kind: "AgentReviewerRunClosure",
      schema_version: "1.0.0",
      authority_scope: authorityBindings.task_id,
      lineage_id: reviewLaunch.run_id,
      lifecycle_state: "CLOSED",
      payload,
      source_revision: reviewLaunch.result_candidate_record_id,
      policy_fp: authorityBindings.policy_fingerprint,
      input_fp: reviewLaunch.result_fingerprint,
      fresh_until: authorityBindings.fresh_until,
    }],
    relations: [
      { from_id: reviewLaunch.run_id, relation_kind: "consumed_as_review", to_id: closureId },
      { from_id: closureId, relation_kind: "reviews", to_id: subjectRunId },
    ],
    events: [{
      event_id: `event-${closureId}`,
      aggregate_id: reviewLaunch.run_id,
      event_type: "AGENT_REVIEWER_RUN_CLOSED",
      payload: { run_id: reviewLaunch.run_id, review_subject_run_id: subjectRunId, assignment_kind: assignmentKind, decision, authority_epoch: authorityBindings.authority_epoch },
    }],
  });
  return closureId;
}

export function createHeadlessRunController({
  store,
  runtime,
  agentAuthorityVerifier,
  launchFactory,
  reviewer,
  clock = () => new Date().toISOString(),
  idFactory = randomUUID,
} = {}) {
  if (!store || typeof store.get !== "function" || typeof store.commitAgentLifecycle !== "function" || !runtime || typeof runtime.launchAgent !== "function" || typeof runtime.reconcilePending !== "function" || !agentAuthorityVerifier || typeof launchFactory !== "function" || typeof reviewer !== "function") throw new Error("HEADLESS_RUN_CONTROLLER_DEPENDENCY_REQUIRED");

  return Object.freeze({
    plan(input) {
      return planTeamTopology(structuredClone(input));
    },

    async run({
      topology,
      expectedRigor,
      taskId,
      policyFingerprint,
      authorityFingerprint,
      budget,
      scopePaths,
      task,
      tasks = [],
      reviewers,
      expiresAt,
    } = {}) {
      if (topology?.decision !== "PASS" || !Array.isArray(topology.agents)) throw new Error("HEADLESS_TOPOLOGY_NOT_ADMITTED");
      if (!new Set(["L1", "L2", "L3", "L4", "L5"]).has(expectedRigor) || topology.rigor !== expectedRigor) throw new Error("HEADLESS_TOPOLOGY_RIGOR_BINDING_INVALID");
      const { fingerprint: topologyFingerprint, ...topologyCore } = topology;
      if (!/^[a-f0-9]{64}$/u.test(topologyFingerprint ?? "") || digest(topologyCore) !== topologyFingerprint) throw new Error("HEADLESS_TOPOLOGY_FINGERPRINT_INVALID");
      const rootAgents = topology.agents.filter((agent) => agent.depth === 0);
      if (rootAgents.length !== 1
        || canonicalJson(Object.keys(rootAgents[0]).sort()) !== canonicalJson(["agent_id", "depth", "layer", "may_delegate", "parent_agent_id", "role", "writer"].sort())
        || rootAgents[0].agent_id !== "orchestrator"
        || rootAgents[0].layer !== "orchestrator"
        || rootAgents[0].role !== "Orchestrator Agent"
        || rootAgents[0].parent_agent_id !== null
        || rootAgents[0].may_delegate !== true
        || rootAgents[0].writer !== (topology.rigor === "L1")
        || new Set(topology.agents.map((agent) => agent.agent_id)).size !== topology.agents.length) throw new Error("HEADLESS_TOPOLOGY_STRUCTURE_INVALID");
      if (topology.rigor === "L1"
        && (topology.agents.length !== 1 || topology.planned_process_launches !== 1)) throw new Error("HEADLESS_L1_TOPOLOGY_INVALID");
      if (topology.rigor !== "L1"
        && topology.planned_process_launches !== topology.agents.length * 4) throw new Error("HEADLESS_TEAM_TOPOLOGY_INVALID");
      const startupRecovery = {
        ...await runtime.reconcilePending(),
        agent_remaining: typeof store.listUnresolvedAgentRuns === "function" ? store.listUnresolvedAgentRuns().length : 0,
      };
      const startupDisposition = recoveryDisposition(startupRecovery);
      if (!startupDisposition.safe) {
        const core = {
          schema_version: "1.0.0",
          decision: "STOP",
          profile: "headless_production",
          topology_fingerprint: topology.fingerprint,
          outcomes: [{ agent_id: "orchestrator", decision: "STOP", code: startupDisposition.code, recovery_fingerprint: digest(startupRecovery) }],
          authority_epoch: store.revocation_epoch,
        };
        return { ...core, fingerprint: digest(core) };
      }
      const now = clock();
      const commonBudget = agentBudget(budget);
      if (commonBudget.max_retries !== 0) return stoppedResult({ topology, store, outcomes: [], code: "HEADLESS_RETRY_POLICY_UNSUPPORTED" });
      const authorityBindings = {
        task_id: requireString(taskId, "HEADLESS_AUTHORITY_TASK_REQUIRED"),
        policy_fingerprint: requireString(policyFingerprint, "HEADLESS_AUTHORITY_POLICY_REQUIRED"),
        authority_epoch: store.revocation_epoch,
        revocation_epoch: store.revocation_epoch,
        fresh_until: requireString(expiresAt, "HEADLESS_AUTHORITY_EXPIRY_REQUIRED"),
      };
      const rootTask = normalizedTask(task ?? {
        task_id: taskId,
        summary: "Execute the bounded developer task",
        scope_paths: scopePaths,
        data: [],
      }, scopePaths);
      const definitions = new Map(tasks.map((taskDefinition) => [taskDefinition.task_id, normalizedTask(taskDefinition, scopePaths)]));
      const directOrchestratorMode = topology.rigor === "L1";
      const agents = topology.agents;
      if (agents.length === 0) return stoppedResult({ topology, store, outcomes: [], code: "HEADLESS_EXECUTABLE_AGENT_REQUIRED" });
      const maxProcessLaunches = topology.budgets?.max_process_launches;
      const requiredLaunches = directOrchestratorMode ? 1 : agents.length * 4;
      if (!Number.isSafeInteger(maxProcessLaunches) || maxProcessLaunches < requiredLaunches) return stoppedResult({ topology, store, outcomes: [], code: "HEADLESS_PROCESS_LAUNCH_BUDGET_EXCEEDED" });
      const ledger = {
        launches: 0,
        max_launches: maxProcessLaunches,
        runtime_ms: 0,
        max_runtime_ms: commonBudget.max_runtime_ms * maxProcessLaunches,
      };
      const grants = new Map();
      const outcomes = [];
      const acceptedByAgent = new Map();
      for (const agent of agents) {
        const rootOrchestrator = agent.depth === 0;
        const parent = rootOrchestrator
          ? { agent_id: "run-controller", layer: "runtime", depth: -1, role: "Runtime Adapter", parent_agent_id: null, may_delegate: true, writer: false }
          : topology.agents.find((candidate) => candidate.agent_id === agent.parent_agent_id);
        if (!parent) throw new Error(`HEADLESS_PARENT_AGENT_REQUIRED:${agent.agent_id}`);
        const taskKey = rootOrchestrator ? rootTask.task_id : agent.agent_id.startsWith("task-") ? agent.agent_id.slice(5) : agent.agent_id;
        const parentOutcome = parent.depth < 0 ? null : acceptedByAgent.get(parent.agent_id);
        if (parent.depth >= 0 && (!parentOutcome || parentOutcome.decision !== "PASS")) {
          outcomes.push({ agent_id: agent.agent_id, decision: "STOP", code: "HEADLESS_PARENT_RESULT_REQUIRED", parent_agent_id: parent.agent_id });
          break;
        }
        const definedTask = definitions.get(taskKey);
        const task = normalizedTask({
          task_id: definedTask?.task_id ?? taskKey,
          summary: definedTask?.summary ?? rootTask.summary,
          scope_paths: definedTask?.scope_paths ?? rootTask.scope_paths,
          data: [
            ...rootTask.data,
            ...(definedTask?.data ?? []),
            ...(parentOutcome ? [{
              source: "parent_result",
              value: {
                parent_agent_id: parent.agent_id,
                decision: parentOutcome.decision,
                result_fingerprint: parentOutcome.result_fingerprint,
                evidence_fingerprint: parentOutcome.evidence_fingerprint,
              },
            }] : []),
          ],
        }, scopePaths);
        const parentGrant = parent.depth <= 0 ? null : grants.get(parent.agent_id);
        const grantAgent = rootOrchestrator ? { ...agent, parent_agent_id: "run-controller" } : agent;
        const grant = createDelegationGrant({
          grantId: `grant-${idFactory()}`,
          parent,
          child: grantAgent,
          scope: { paths: task.scope_paths },
          authorityFingerprint,
          budget: commonBudget,
          ownership: { read_only: true, paths: [] },
          expiresAt,
          parentGrant,
          allowedActions: ["analyze", "read", "report"],
          allowedTools: [],
          capabilities: ["bounded_analysis"],
          sandbox: { mode: "read_only", network: false, writable_paths: [] },
          now,
        });
        persistDelegationGrant({ store, grant, authorityBindings, verifier: agentAuthorityVerifier, now });
        grants.set(agent.agent_id, grant);
        const reservation = {
          reservation_id: `reservation-${idFactory()}`,
          purpose: "launch",
          grant_fingerprint: grant.fingerprint,
          child_agent_id: agent.agent_id,
          budget: commonBudget,
          targets: task.scope_paths,
          expires_at: expiresAt,
        };
        persistResourceCostReservation({ store, reservation, authorityBindings, verifier: agentAuthorityVerifier, now });
        let launch;
        try {
          ledger.launches += 1;
          if (ledger.launches > ledger.max_launches) throw new Error("HEADLESS_PROCESS_LAUNCH_BUDGET_EXCEEDED");
          const launchInput = await launchFactory({ agent: structuredClone(agent), grant: structuredClone(grant), reservation: structuredClone(reservation), task: structuredClone(task), authorityBindings: structuredClone(authorityBindings) });
          const controllerStartedAt = performance.now();
          launch = await runtime.launchAgent({
            ...structuredClone(launchInput),
            grant,
            reservation,
            targets: task.scope_paths,
            authorityBindings: { ...authorityBindings, ...structuredClone(launchInput.authorityBindings ?? {}) },
            taskData: [{ source: "developer_task", value: task.summary }, ...task.data],
          });
          launch.controller_metrics = {
            duration_ms: Math.max(0, performance.now() - controllerStartedAt),
            source: "run_controller_monotonic_clock",
          };
        } catch (error) {
          const recovery = await runtime.reconcilePending();
          const disposition = recoveryDisposition(recovery);
          const failureCode = error?.message ?? "HEADLESS_AGENT_LAUNCH_FAILED";
          const failureFingerprint = digest({
            agent_id: agent.agent_id,
            code: failureCode,
            effect_id: error?.effect_id ?? null,
          });
          const retry = evaluateAgentRetry({
            failureFingerprint,
            previousFailureFingerprint: failureFingerprint,
            attempt: 0,
            limit: commonBudget.max_retries,
            totalLimit: commonBudget.max_retries,
            unchangedAttempt: 0,
            materialProgressVerified: false,
            maxRuntimeMs: commonBudget.max_runtime_ms,
            maxTokens: commonBudget.max_tokens,
            maxCost: commonBudget.max_cost,
          });
          outcomes.push({
            agent_id: agent.agent_id,
            decision: "STOP",
            code: disposition.safe ? `HEADLESS_${retry.reason}` : disposition.code,
            failure_code: failureCode,
            failure_fingerprint: failureFingerprint,
            recovery_fingerprint: digest(recovery),
          });
          break;
        }
        if (launch.decision !== "PASS" || launch.review_required !== true || !launch.result_candidate_record_id) {
          outcomes.push({ agent_id: agent.agent_id, decision: "STOP", code: launch.code ?? "HEADLESS_AGENT_RESULT_NOT_REVIEWABLE" });
          break;
        }
        const subjectBudgetCode = chargeLedger(ledger, launch);
        if (subjectBudgetCode || launch.result?.status !== "succeeded" || launch.result.findings?.some((finding) => finding?.severity === "error")) {
          const code = subjectBudgetCode ?? `HEADLESS_AGENT_RESULT_${String(launch.result?.status ?? "invalid").toUpperCase()}`;
          persistRunStop({
            store,
            runId: launch.run_id,
            candidateRecordId: launch.result_candidate_record_id,
            resultFingerprint: launch.result_fingerprint,
            code,
            authorityBindings,
            evidence: { subject_status: launch.result?.status ?? null },
            now: clock(),
          });
          outcomes.push({ agent_id: agent.agent_id, decision: "STOP", code, result_fingerprint: launch.result_fingerprint });
          break;
        }
        const candidate = authoritativeCandidate({ launch, grant });
        if (directOrchestratorMode) {
          const accepted = acceptDirectOrchestratorResult({
            store,
            result: candidate,
            grant,
            authorityBindings,
            now: clock(),
          });
          outcomes.push({ agent_id: agent.agent_id, ...accepted, selected_model: launch.attestation.actual_observed.identity.model_id, selected_effort: launch.attestation.actual_observed.native_reasoning });
          if (accepted.decision === "PASS") acceptedByAgent.set(agent.agent_id, outcomes.at(-1));
          if (accepted.decision !== "PASS") break;
          continue;
        }
        const assigned = chooseReviewers(agent.agent_id, reviewers);
        for (const [kind, assignedReviewer] of Object.entries(assigned)) persistReviewerAssignment({ store, assignment: reviewAssignment(launch.run_id, kind, assignedReviewer), grant, authorityBindings, verifier: agentAuthorityVerifier, now: clock() });
        const evidenceFingerprint = agentResultEvidenceFingerprint(candidate);
        const subjectCandidateRecord = store.get({ id: launch.result_candidate_record_id });
        const reviewerProcessIdentities = new Set();
        for (const [kind, assignedReviewer] of Object.entries(assigned)) {
          const reviewAgent = reviewerAgent(kind, assignedReviewer);
          const reviewNow = clock();
          const reviewGrant = createDelegationGrant({
            grantId: `grant-${idFactory()}`,
            parent: topology.agents.find((candidateAgent) => candidateAgent.depth === 0),
            child: reviewAgent,
            scope: { paths: task.scope_paths, review_subject_fingerprint: evidenceFingerprint, assignment_kind: kind },
            authorityFingerprint: digest({ authority_fingerprint: authorityFingerprint, review_subject_fingerprint: evidenceFingerprint, assignment_kind: kind }),
            budget: commonBudget,
            ownership: { read_only: true, paths: [] },
            expiresAt,
            allowedActions: ["analyze", "read", "report"],
            allowedTools: [],
            capabilities: ["bounded_analysis"],
            sandbox: { mode: "read_only", network: false, writable_paths: [] },
            now: reviewNow,
          });
          persistDelegationGrant({ store, grant: reviewGrant, authorityBindings, verifier: agentAuthorityVerifier, now: reviewNow });
          const reviewReservation = {
            reservation_id: `reservation-${idFactory()}`,
            purpose: "launch",
            grant_fingerprint: reviewGrant.fingerprint,
            child_agent_id: reviewAgent.agent_id,
            budget: commonBudget,
            targets: task.scope_paths,
            expires_at: expiresAt,
          };
          persistResourceCostReservation({ store, reservation: reviewReservation, authorityBindings, verifier: agentAuthorityVerifier, now: reviewNow });
          let reviewLaunch;
          try {
            ledger.launches += 1;
            if (ledger.launches > ledger.max_launches) throw new Error("HEADLESS_PROCESS_LAUNCH_BUDGET_EXCEEDED");
            const reviewTask = {
              task_id: `review-${kind}-${agent.agent_id}`,
              summary: `${assignedReviewer.role} independently reviews result ${evidenceFingerprint} and reports blocking findings.`,
              scope_paths: task.scope_paths,
              data: [{ source: "review_subject", value: { result_fingerprint: evidenceFingerprint, candidate, raw_result: launch.result } }],
            };
            const reviewLaunchInput = await launchFactory({ agent: structuredClone(reviewAgent), grant: structuredClone(reviewGrant), reservation: structuredClone(reviewReservation), task: structuredClone(reviewTask), authorityBindings: structuredClone(authorityBindings), review: { kind, subject_result_fingerprint: evidenceFingerprint } });
            const reviewControllerStartedAt = performance.now();
            reviewLaunch = await runtime.launchAgent({
              ...structuredClone(reviewLaunchInput),
              grant: reviewGrant,
              reservation: reviewReservation,
              targets: task.scope_paths,
              authorityBindings: { ...authorityBindings, ...structuredClone(reviewLaunchInput.authorityBindings ?? {}) },
              taskData: [{ source: "review_directive", value: reviewTask.summary }, ...reviewTask.data],
            });
            reviewLaunch.controller_metrics = {
              duration_ms: Math.max(0, performance.now() - reviewControllerStartedAt),
              source: "run_controller_monotonic_clock",
            };
          } catch (error) {
            const code = error?.message ?? `HEADLESS_${kind.toUpperCase()}_REVIEW_LAUNCH_FAILED`;
            persistRunStop({
              store,
              runId: launch.run_id,
              candidateRecordId: launch.result_candidate_record_id,
              resultFingerprint: launch.result_fingerprint,
              code,
              authorityBindings,
              evidence: { assignment_kind: kind },
              now: clock(),
            });
            outcomes.push({ agent_id: agent.agent_id, decision: "STOP", code });
            return stoppedResult({ topology, store, outcomes });
          }
          const reviewerBudgetCode = chargeLedger(ledger, reviewLaunch);
          const reviewCandidateRecord = store.get({ id: reviewLaunch?.result_candidate_record_id });
          const reviewProcessIdentity = reviewCandidateRecord?.payload?.process_identity_fingerprint;
          if (reviewLaunch?.decision !== "PASS"
            || reviewLaunch.review_required !== true
            || reviewCandidateRecord?.kind !== "AgentResultCandidate"
            || reviewCandidateRecord.lineage_id !== reviewLaunch.run_id
            || reviewCandidateRecord.payload?.result_fingerprint !== reviewLaunch.result_fingerprint
            || !/^[a-f0-9]{64}$/.test(reviewProcessIdentity ?? "")
            || reviewProcessIdentity === subjectCandidateRecord?.payload?.process_identity_fingerprint
            || reviewerProcessIdentities.has(reviewProcessIdentity)) {
            const code = `HEADLESS_${kind.toUpperCase()}_REVIEW_EVIDENCE_INVALID`;
            try {
              persistReviewerRunClosure({
                store,
                reviewLaunch,
                subjectRunId: launch.run_id,
                assignmentKind: kind,
                decision: "STOP",
                authorityBindings,
                now: clock(),
              });
            } catch {}
            persistRunStop({
              store,
              runId: launch.run_id,
              candidateRecordId: launch.result_candidate_record_id,
              resultFingerprint: launch.result_fingerprint,
              code,
              authorityBindings,
              evidence: {
                assignment_kind: kind,
                review_run_id: reviewLaunch?.run_id ?? null,
                review_result_fingerprint: reviewLaunch?.result_fingerprint ?? null,
              },
              now: clock(),
            });
            outcomes.push({ agent_id: agent.agent_id, decision: "STOP", code });
            return stoppedResult({ topology, store, outcomes });
          }
          reviewerProcessIdentities.add(reviewProcessIdentity);
          const verdict = reviewerBudgetCode ? { accepted: false, decision: "STOP", code: reviewerBudgetCode } : await reviewer({ kind, reviewer: structuredClone(assignedReviewer), agent: structuredClone(agent), candidate: structuredClone(candidate), subject_result_fingerprint: evidenceFingerprint, subject_raw_result: structuredClone(launch.result), review_launch: structuredClone(reviewLaunch), raw_result: structuredClone(reviewLaunch.result) });
          if (verdict?.accepted !== true || (kind === "validator" && verdict.decision !== "PASS")) {
            const code = verdict?.code ?? `HEADLESS_${kind.toUpperCase()}_REVIEW_REJECTED`;
            persistReviewerRunClosure({
              store,
              reviewLaunch,
              subjectRunId: launch.run_id,
              assignmentKind: kind,
              decision: "STOP",
              authorityBindings,
              now: clock(),
            });
            persistRunStop({
              store,
              runId: launch.run_id,
              candidateRecordId: launch.result_candidate_record_id,
              resultFingerprint: launch.result_fingerprint,
              code,
              authorityBindings,
              evidence: {
                assignment_kind: kind,
                review_run_id: reviewLaunch?.run_id ?? null,
                review_result_fingerprint: reviewLaunch?.result_fingerprint ?? null,
              },
              now: clock(),
            });
            outcomes.push({ agent_id: agent.agent_id, decision: "STOP", code });
            return stoppedResult({ topology, store, outcomes });
          }
          persistAgentReview({
            store,
            runId: launch.run_id,
            assignmentKind: kind,
            review: {
              agent_id: assignedReviewer.agent_id,
              accepted: true,
              result_fingerprint: evidenceFingerprint,
              review_run_id: reviewLaunch.run_id,
              review_candidate_record_id: reviewLaunch.result_candidate_record_id,
              review_result_fingerprint: reviewLaunch.result_fingerprint,
              review_process_identity_fingerprint: reviewProcessIdentity,
              ...(kind === "validator" ? { decision: "PASS" } : {}),
            },
            authorityBindings,
            verifier: agentAuthorityVerifier,
            now: clock(),
          });
          persistReviewerRunClosure({
            store,
            reviewLaunch,
            subjectRunId: launch.run_id,
            assignmentKind: kind,
            decision: "PASS",
            authorityBindings,
            now: clock(),
          });
        }
        const accepted = acceptAgentResult({
          store,
          result: candidate,
          grant,
          leadAgentId: assigned.lead.agent_id,
          orchestratorAgentId: assigned.orchestrator.agent_id,
          validatorAgentId: assigned.validator.agent_id,
          authorityBindings,
          now: clock(),
        });
        outcomes.push({ agent_id: agent.agent_id, ...accepted, selected_model: launch.attestation.actual_observed.identity.model_id, selected_effort: launch.attestation.actual_observed.native_reasoning });
        if (accepted.decision === "PASS") acceptedByAgent.set(agent.agent_id, outcomes.at(-1));
        if (accepted.decision !== "PASS") break;
      }
      const subjectsPassed = outcomes.length === agents.length && outcomes.every((outcome) => outcome.decision === "PASS");
      if (subjectsPassed) {
        const integratedOutcomes = outcomes.map((outcome) => ({
          agent_id: outcome.agent_id,
          result_fingerprint: outcome.result_fingerprint,
          evidence_fingerprint: outcome.evidence_fingerprint,
        }));
        outcomes.push({
          component_id: "integration-controller",
          component_kind: "deterministic_integration",
          decision: "PASS",
          state: "DETERMINISTIC_SYNTHESIS",
          task_fingerprint: digest(rootTask),
          integrated_outcomes: integratedOutcomes,
          synthesis_fingerprint: digest({ task: rootTask, integrated_outcomes: integratedOutcomes }),
        });
      }
      const decision = subjectsPassed ? "PASS" : "STOP";
      const core = { schema_version: "1.0.0", decision, profile: "headless_production", topology_fingerprint: topology.fingerprint, outcomes, aggregate_usage: { launches: ledger.launches, runtime_ms: ledger.runtime_ms, tokens: null, token_accounting: "provider_usage_unavailable_no_claim" }, authority_epoch: store.revocation_epoch };
      return { ...core, fingerprint: digest(core) };
    },
  });
}

export function headlessRunControllerDigest(value) {
  return digest(value);
}
