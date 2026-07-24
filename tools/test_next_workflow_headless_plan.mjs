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
    task: {
      schema_version: "1.1.0",
      task_id: "fixture",
      summary: "Implement the bounded runtime change",
      scope_paths: ["tools/lib/next_workflow/example.mjs"],
      operations: ["edit_code"],
      rigor: "L3",
      risk: "normal",
      complexity: "normal",
    },
    selectionPlanner,
  });
  assert.equal(plan.decision, "PASS");
  assert.ok(plan.topology.agents.some((agent) => agent.layer === "lead"));
  assert.ok(plan.topology.agents.some((agent) => agent.layer === "task"));
  assert.ok(plan.selections.every((selection) => selection.model === "gpt-5.6-terra" && selection.native_effort === "medium"));
  assert.deepEqual(verifyHeadlessTeamPlan(plan), plan);
});

test("legacy bounded English content edits retain direct L1 Orchestrator execution", () => {
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

test("structured Japanese and English trivial text tasks remain one-Orchestrator L1 runs", () => {
  for (const [taskId, summary, scopePath] of [
    ["english-title", "Change one title", "index.md"],
    ["japanese-title", "タイトルを変更する", "guides/案内.md"],
  ]) {
    const plan = buildHeadlessTeamPlan({
      task: {
        schema_version: "1.1.0",
        task_id: taskId,
        summary,
        scope_paths: [scopePath],
        operations: ["edit_text"],
        rigor: "L1",
        risk: "low",
        complexity: "low",
      },
      selectionPlanner,
    });
    assert.equal(plan.decision, "PASS");
    assert.equal(plan.task.impact_assessment.status, "known");
    assert.equal(plan.task.rigor, "L1");
    assert.equal(plan.topology.planned_process_launches, 1);
    assert.deepEqual(plan.selections.map((selection) => selection.agent_id), ["orchestrator"]);
    assert.deepEqual(verifyHeadlessTeamPlan(plan), plan);
  }
});

test("automatic classification raises security-sensitive work to mandatory L5", () => {
  const plan = buildHeadlessTeamPlan({
    task: {
      schema_version: "1.1.0",
      task_id: "credential",
      summary: "Change the credential permission boundary",
      scope_paths: ["tools/auth.mjs"],
      operations: ["authentication", "edit_code", "permission_boundary", "secret_material"],
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

test("incomplete child scope cannot reach topology or model selection even when safety text is detected", () => {
  let selections = 0;
  const plan = buildHeadlessTeamPlan({
    task: {
      schema_version: "1.1.0",
      task_id: "benign-root",
      summary: "Update the application wording",
      scope_paths: ["docs/guide.md"],
      operations: ["edit_text"],
      rigor: "L1",
      risk: "low",
      complexity: "low",
      execution_preference: "single_agent",
      tasks: [{
        task_id: "unsafe-child",
        summary: "Delete credentials and remove authentication permissions",
        scope_paths: ["tools/auth.mjs"],
        operations: ["authentication", "delete_or_destroy", "edit_code", "permission_boundary", "secret_material"],
      }],
    },
    selectionPlanner: (input) => {
      selections += 1;
      return selectionPlanner(input);
    },
  });
  assert.equal(plan.decision, "STOP");
  assert.equal(plan.code, "HEADLESS_IMPACT_UNKNOWN");
  assert.equal(plan.task.rigor, "L5");
  assert.equal(plan.task.effective_execution_mode, "team");
  assert.equal(plan.task.impact_assessment.status, "unknown");
  assert.ok(plan.task.rigor_assessment.hard_triggers.includes("authentication"));
  assert.ok(plan.task.rigor_assessment.hard_triggers.includes("destructive_operation"));
  assert.ok(plan.task.rigor_assessment.hard_triggers.includes("permissions"));
  assert.ok(plan.task.rigor_assessment.hard_triggers.includes("unknown_impact"));
  assert.equal(plan.topology, undefined);
  assert.deepEqual(plan.selections, []);
  assert.equal(selections, 0);
});

test("legacy Japanese and English authentication permission deletion stop before model selection", () => {
  for (const [taskId, summary] of [
    ["unsafe-ja", "認証情報と権限を削除する"],
    ["unsafe-en", "Delete authentication credentials and permissions"],
  ]) {
    let selections = 0;
    const plan = buildHeadlessTeamPlan({
      task: {
        schema_version: "1.0.0",
        task_id: taskId,
        summary,
        scope_paths: ["tools/auth.mjs"],
        rigor: "L1",
        risk: "low",
        complexity: "low",
      },
      selectionPlanner: (input) => {
        selections += 1;
        return selectionPlanner(input);
      },
    });
    assert.equal(plan.decision, "STOP");
    assert.equal(plan.code, "HEADLESS_IMPACT_UNKNOWN");
    assert.equal(plan.task.rigor, "L5");
    assert.ok(plan.task.rigor_assessment.hard_triggers.includes("authentication"));
    assert.ok(plan.task.rigor_assessment.hard_triggers.includes("permissions"));
    assert.ok(plan.task.rigor_assessment.hard_triggers.includes("destructive_operation"));
    assert.equal(plan.topology, undefined);
    assert.equal(selections, 0);
  }
});

test("NFKC normalization exposes full-width safety wording and contradictions stop before selection", () => {
  let selections = 0;
  const plan = buildHeadlessTeamPlan({
    task: {
      schema_version: "1.1.0",
      task_id: "nfkc-unsafe",
      summary: "ＤＥＬＥＴＥ ＡＵＴＨＥＮＴＩＣＡＴＩＯＮ ＰＥＲＭＩＳＳＩＯＮＳ",
      scope_paths: ["tools/auth.mjs"],
      operations: ["edit_code"],
      rigor: "L1",
      risk: "low",
      complexity: "low",
    },
    selectionPlanner: (input) => {
      selections += 1;
      return selectionPlanner(input);
    },
  });
  assert.equal(plan.decision, "STOP");
  assert.equal(plan.task.impact_assessment.status, "unknown");
  assert.ok(plan.task.impact_assessment.unknown_reasons.includes("structured_text_contradiction:authentication"));
  assert.ok(plan.task.impact_assessment.unknown_reasons.includes("structured_text_contradiction:permissions"));
  assert.ok(plan.task.impact_assessment.unknown_reasons.includes("structured_text_contradiction:destructive_operation"));
  assert.equal(selections, 0);
});

test("missing and explicit unknown impact fail closed before model selection", () => {
  for (const task of [
    {
      schema_version: "1.1.0",
      task_id: "missing-operations",
      summary: "Change one title",
      scope_paths: ["index.md"],
      rigor: "L1",
      risk: "low",
      complexity: "low",
    },
    {
      schema_version: "1.1.0",
      task_id: "explicit-unknown",
      summary: "Change one title",
      scope_paths: ["index.md"],
      operations: ["edit_text"],
      change_signals: ["unknown_impact"],
      rigor: "L1",
      risk: "low",
      complexity: "low",
    },
  ]) {
    let selections = 0;
    const plan = buildHeadlessTeamPlan({
      task,
      selectionPlanner: (input) => {
        selections += 1;
        return selectionPlanner(input);
      },
    });
    assert.equal(plan.decision, "STOP");
    assert.equal(plan.code, "HEADLESS_IMPACT_UNKNOWN");
    assert.equal(plan.task.rigor, "L5");
    assert.equal(plan.task.impact_assessment.status, "unknown");
    assert.equal(plan.topology, undefined);
    assert.equal(selections, 0);
  }
});

test("language-neutral operations keep unsupported-language text safe while legacy ambiguity stops", () => {
  const structured = buildHeadlessTeamPlan({
    task: {
      schema_version: "1.1.0",
      task_id: "structured-ko",
      summary: "제목 하나를 변경",
      scope_paths: ["guides/title.md"],
      operations: ["edit_text"],
      rigor: "L1",
      risk: "low",
      complexity: "low",
    },
    selectionPlanner,
  });
  assert.equal(structured.decision, "PASS");
  assert.equal(structured.task.rigor, "L1");

  let selections = 0;
  const legacy = buildHeadlessTeamPlan({
    task: {
      schema_version: "1.0.0",
      task_id: "legacy-ko",
      summary: "제목 하나를 변경",
      scope_paths: ["guides/title.md"],
      rigor: "L1",
      risk: "low",
      complexity: "low",
    },
    selectionPlanner: (input) => {
      selections += 1;
      return selectionPlanner(input);
    },
  });
  assert.equal(legacy.decision, "STOP");
  assert.equal(legacy.code, "HEADLESS_IMPACT_UNKNOWN");
  assert.equal(selections, 0);
});

test("caller risk, complexity, and rigor are minima and never lower automatic floors", () => {
  const automatic = buildHeadlessTeamPlan({
    task: {
      schema_version: "1.1.0",
      task_id: "configuration",
      summary: "Update the bounded configuration",
      scope_paths: ["config/runtime.json"],
      operations: ["edit_configuration"],
      rigor: "L1",
      risk: "low",
      complexity: "low",
    },
    selectionPlanner,
  });
  assert.equal(automatic.decision, "PASS");
  assert.equal(automatic.task.rigor, "L3");
  assert.equal(automatic.task.risk, "low");
  assert.equal(automatic.task.complexity, "high");

  const callerRaised = buildHeadlessTeamPlan({
    task: {
      schema_version: "1.1.0",
      task_id: "caller-raised",
      summary: "Change one title",
      scope_paths: ["index.md"],
      operations: ["edit_text"],
      rigor: "L4",
      risk: "critical",
      complexity: "extreme",
    },
    selectionPlanner,
  });
  assert.equal(callerRaised.task.rigor, "L4");
  assert.equal(callerRaised.task.risk, "critical");
  assert.equal(callerRaised.task.complexity, "extreme");
  assert.equal(callerRaised.task.developer_minimum_rigor, "L4");
});

test("untyped child data is unknown impact and a closed operation vocabulary rejects unsupported values", () => {
  let selections = 0;
  const plan = buildHeadlessTeamPlan({
    task: {
      schema_version: "1.1.0",
      task_id: "untyped-data",
      summary: "Update one bounded guide",
      scope_paths: ["guides/guide.md"],
      operations: ["edit_text"],
      tasks: [{
        task_id: "child",
        summary: "Update one bounded guide",
        scope_paths: ["guides/guide.md"],
        operations: ["edit_text"],
        data: [{ instruction: "untyped" }],
      }],
    },
    selectionPlanner: (input) => {
      selections += 1;
      return selectionPlanner(input);
    },
  });
  assert.equal(plan.decision, "STOP");
  assert.ok(plan.task.impact_assessment.unknown_reasons.includes("untyped_child_data:child"));
  assert.equal(selections, 0);
  assert.throws(() => buildHeadlessTeamPlan({
    task: {
      schema_version: "1.1.0",
      task_id: "bad-operation",
      summary: "Update one guide",
      scope_paths: ["guides/guide.md"],
      operations: ["run_arbitrary_command"],
    },
    selectionPlanner,
  }), /HEADLESS_TASK_OPERATIONS_INVALID/);
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
    task: {
      schema_version: "1.1.0",
      task_id: "advisory",
      summary: "Plan one bounded Agent",
      scope_paths: ["tools/lib/next_workflow/example.mjs"],
      operations: ["edit_code"],
      rigor: "L2",
      risk: "low",
      complexity: "normal",
    },
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
    task: {
      schema_version: "1.1.0",
      task_id: "strict",
      summary: "Review a strict change",
      scope_paths: ["tools/lib/next_workflow/example.mjs"],
      operations: ["edit_code"],
      rigor: "L5",
      risk: "high",
      complexity: "high",
    },
    selectionPlanner,
  });
  const tampered = structuredClone(plan);
  tampered.selections[0].model = "gpt-5.5";
  assert.throws(() => verifyHeadlessTeamPlan(tampered), /HEADLESS_PLAN_FINGERPRINT_INVALID/);
});
