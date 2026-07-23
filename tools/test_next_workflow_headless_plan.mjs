#!/usr/bin/env node
import assert from "node:assert/strict";
import test from "node:test";
import { buildHeadlessTeamPlan, headlessPlanDigest, verifyHeadlessTeamPlan } from "./lib/next_workflow/headless_plan.mjs";

const selectionPlanner = ({ agent_id: agentId, rigor }) => ({
  decision: "PASS",
  selected_model: rigor === "L5" ? "gpt-5.6-sol" : "gpt-5.6-terra",
  selected_native_reasoning: rigor === "L5" ? "xhigh" : "medium",
  selected_normalized_effort: rigor === "L5" ? "xhigh" : "medium",
  production_eligible: true,
  fingerprint: "a".repeat(63) + String(agentId.length % 10),
});

test("headless planning derives a bounded hierarchy and explicit per-Agent model and effort", () => {
  const plan = buildHeadlessTeamPlan({
    task: { schema_version: "1.0.0", task_id: "fixture", summary: "Implement the bounded runtime change", scope_paths: ["tools"], rigor: "L3", risk: "normal", complexity: "normal" },
    selectionPlanner,
  });
  assert.equal(plan.decision, "PASS");
  assert.ok(plan.topology.agents.some((agent) => agent.layer === "lead"));
  assert.ok(plan.topology.agents.some((agent) => agent.layer === "task"));
  assert.ok(plan.selections.every((selection) => selection.model === "gpt-5.6-terra" && selection.native_effort === "medium"));
  assert.deepEqual(verifyHeadlessTeamPlan(plan), plan);
});

test("L1 is routed to direct Orchestrator execution instead of reporting a zero-launch team success", () => {
  const plan = buildHeadlessTeamPlan({
    task: { schema_version: "1.0.0", task_id: "title", summary: "Change one title", scope_paths: ["index.md"], rigor: "L1", risk: "low", complexity: "low" },
    selectionPlanner,
  });
  assert.equal(plan.decision, "PASS");
  assert.equal(plan.task.rigor, "L1");
  assert.equal(plan.task.effective_execution_mode, "single_agent");
  assert.equal(plan.topology.planned_process_launches, 1);
  assert.deepEqual(plan.selections.map((selection) => selection.agent_id), ["orchestrator"]);
  assert.deepEqual(verifyHeadlessTeamPlan(plan), plan);
});

test("automatic classification raises security-sensitive work to mandatory L5", () => {
  const plan = buildHeadlessTeamPlan({
    task: {
      schema_version: "1.0.0",
      task_id: "credential",
      summary: "Change the credential permission boundary",
      scope_paths: ["tools"],
      rigor: "L1",
      risk: "low",
      complexity: "low",
      execution_preference: "single_agent",
    },
    selectionPlanner,
  });
  assert.equal(plan.decision, "PASS");
  assert.equal(plan.task.rigor, "L5");
  assert.equal(plan.task.effective_execution_mode, "team");
  assert.ok(plan.task.rigor_assessment.hard_triggers.includes("secrets"));
  assert.ok(plan.task.rigor_assessment.hard_triggers.includes("permissions"));
});

test("automatic classification cannot miss a safety-critical child task hidden behind a benign root summary", () => {
  const plan = buildHeadlessTeamPlan({
    task: {
      schema_version: "1.0.0",
      task_id: "benign-root",
      summary: "Update the application wording",
      scope_paths: ["docs"],
      rigor: "L1",
      risk: "low",
      complexity: "low",
      execution_preference: "single_agent",
      tasks: [{
        task_id: "unsafe-child",
        summary: "Delete credentials and remove authentication permissions",
        scope_paths: ["tools/auth"],
      }],
    },
    selectionPlanner,
  });
  assert.equal(plan.decision, "PASS");
  assert.equal(plan.task.rigor, "L5");
  assert.equal(plan.task.effective_execution_mode, "team");
  assert.ok(plan.task.rigor_assessment.hard_triggers.includes("authentication"));
  assert.ok(plan.task.rigor_assessment.hard_triggers.includes("destructive_operation"));
  assert.ok(plan.task.rigor_assessment.hard_triggers.includes("permissions"));
});

test("child task scope paths are validated independently", () => {
  assert.throws(() => buildHeadlessTeamPlan({
    task: {
      schema_version: "1.0.0",
      task_id: "unsafe-scope",
      summary: "Update one bounded file",
      scope_paths: ["docs"],
      rigor: "L2",
      tasks: [{ task_id: "child", summary: "Update child", scope_paths: ["../outside"] }],
    },
    selectionPlanner,
  }), /HEADLESS_SUBTASK_SCOPE_INVALID/);
});

test("classification stops on oversized late child evidence instead of truncating safety signals", () => {
  assert.throws(() => buildHeadlessTeamPlan({
    task: {
      schema_version: "1.0.0",
      task_id: "oversized",
      summary: "Bounded root task",
      scope_paths: ["tools"],
      rigor: "L1",
      risk: "low",
      complexity: "low",
      tasks: Array.from({ length: 5 }, (_, index) => ({
        task_id: `child-${index}`,
        summary: "x".repeat(15 * 1024),
        scope_paths: ["tools"],
        data: index === 4 ? [{ directive: "change authentication permissions" }] : [],
      })),
    },
    selectionPlanner,
  }), /HEADLESS_TASK_CLASSIFICATION_INPUT_TOO_LARGE/);
});

test("classification rejects oversized task and explicit-signal collections before traversal", () => {
  assert.throws(() => buildHeadlessTeamPlan({
    task: {
      schema_version: "1.0.0",
      task_id: "too-many-tasks",
      summary: "Bounded root task",
      scope_paths: ["tools"],
      tasks: Array.from({ length: 65 }, (_, index) => ({ task_id: `task-${index}` })),
    },
    selectionPlanner,
  }), /HEADLESS_TASK_COUNT_INVALID/);
  assert.throws(() => buildHeadlessTeamPlan({
    task: {
      schema_version: "1.0.0",
      task_id: "too-many-signals",
      summary: "Bounded root task",
      scope_paths: ["tools"],
      change_signals: Array.from({ length: 1000 }, () => "security"),
    },
    selectionPlanner,
  }), /HEADLESS_TASK_CHANGE_SIGNALS_INVALID/);
  assert.throws(() => buildHeadlessTeamPlan({
    task: {
      schema_version: "1.0.0",
      task_id: "unknown-signal",
      summary: "Bounded root task",
      scope_paths: ["tools"],
      change_signals: ["unreviewed_signal"],
    },
    selectionPlanner,
  }), /HEADLESS_TASK_CHANGE_SIGNALS_INVALID/);
});

test("root and child scope paths must already be canonical POSIX-relative paths", () => {
  for (const invalid of ["tools/../secrets", "./tools", "tools//nested", "tools\\nested"]) {
    assert.throws(() => buildHeadlessTeamPlan({
      task: { schema_version: "1.0.0", task_id: "bad-path", summary: "Read one file", scope_paths: [invalid], rigor: "L1", risk: "low", complexity: "low" },
      selectionPlanner,
    }), /HEADLESS_TASK_SCOPE_INVALID/);
  }
  assert.throws(() => buildHeadlessTeamPlan({
    task: {
      schema_version: "1.0.0",
      task_id: "bad-child-path",
      summary: "Read one file",
      scope_paths: ["tools"],
      rigor: "L3",
      risk: "normal",
      complexity: "normal",
      tasks: [{ task_id: "child", scope_paths: ["tools/../outside"] }],
    },
    selectionPlanner,
  }), /HEADLESS_SUBTASK_SCOPE_INVALID/);
});

test("team preference raises otherwise minimal work to a small team without weakening rigor", () => {
  const plan = buildHeadlessTeamPlan({
    task: {
      schema_version: "1.0.0",
      task_id: "title-team",
      summary: "Change one title",
      scope_paths: ["index.md"],
      rigor: "L1",
      risk: "low",
      complexity: "low",
      execution_preference: "team",
    },
    selectionPlanner,
  });
  assert.equal(plan.decision, "PASS");
  assert.equal(plan.task.rigor, "L2");
  assert.equal(plan.task.effective_execution_mode, "team");
  assert.equal(plan.task.rigor_assessment.reason, "team_preference_raise");
  assert.equal(plan.selections.length, 2);
  assert.deepEqual(plan.selections.map((selection) => selection.agent_id), ["orchestrator", "lead-implementation"]);
});

test("advisory recommendations plan explicit Agents without granting launch authority", () => {
  const plan = buildHeadlessTeamPlan({
    task: { schema_version: "1.0.0", task_id: "advisory", summary: "Plan one bounded Agent", scope_paths: ["tools"], rigor: "L2", risk: "low", complexity: "normal" },
    selectionPlanner: ({ agent_id: agentId, role_id: roleId }) => ({
      decision: "RECOMMEND",
      profile: "development_advisory",
      selected_model: "gpt-5.6-sol",
      selected_native_reasoning: "medium",
      selected_normalized_effort: "medium",
      production_eligible: false,
      fingerprint: headlessPlanDigest({ agentId, roleId }),
    }),
  });
  assert.equal(plan.decision, "RECOMMEND");
  assert.equal(plan.profile, "development_advisory_plan");
  assert.equal(plan.production_executable, false);
  assert.equal(plan.selections.length, 2);
  assert.equal(plan.selections[0].selection_profile, "development_advisory");
  assert.equal(plan.selections[0].production_eligible, false);
  assert.throws(() => verifyHeadlessTeamPlan(plan), /HEADLESS_PLAN_INVALID/);
});

test("tampering with a planned model is rejected before launch", () => {
  const plan = buildHeadlessTeamPlan({
    task: { schema_version: "1.0.0", task_id: "strict", summary: "Review a strict change", scope_paths: ["tools"], rigor: "L5", risk: "high", complexity: "high" },
    selectionPlanner,
  });
  const tampered = structuredClone(plan);
  tampered.selections[0].model = "gpt-5.5";
  assert.throws(() => verifyHeadlessTeamPlan(tampered), /HEADLESS_PLAN_FINGERPRINT_INVALID/);
});
