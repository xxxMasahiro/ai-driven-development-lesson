import { createHash } from "node:crypto";
import path from "node:path";
import { planTeamTopology } from "./agents.mjs";
import { assessRigor, RIGOR_HARD_L5_TRIGGERS } from "./contracts.mjs";
import {
  classifyHeadlessTaskImpact,
  normalizeHeadlessOperations,
} from "./rigor_classification.mjs";

const RIGOR = new Set(["L1", "L2", "L3", "L4", "L5"]);
const RISK = new Set(["low", "normal", "high", "critical"]);
const COMPLEXITY = new Set(["low", "normal", "high", "extreme"]);
const EXECUTION_PREFERENCES = new Set(["auto", "single_agent", "team"]);
const TASK_SCHEMA_VERSIONS = new Set(["1.0.0", "1.1.0"]);
const LEAD_ROLE_ID = Object.freeze({
  "Value Design Lead": "director",
  "Planning Design Lead": "planner",
  "Implementation Lead": "builder",
  "Independent Review Lead": "reviewer_gate",
  "Safety and Acceptance Decision Lead": "validator",
});

function canonicalJson(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(",")}}`;
  return JSON.stringify(value);
}

function digest(value) {
  return createHash("sha256").update(canonicalJson(value)).digest("hex");
}

function requireId(value, code) {
  if (typeof value !== "string" || !/^[a-z0-9][a-z0-9_-]{0,63}$/u.test(value)) throw new Error(code);
  return value;
}

function requiredRoles(rigor) {
  if (rigor === "L1") return [];
  if (rigor === "L2") return ["Implementation Lead"];
  if (rigor === "L3") return ["Implementation Lead", "Independent Review Lead", "Safety and Acceptance Decision Lead"];
  if (rigor === "L4") return ["Planning Design Lead", "Implementation Lead", "Independent Review Lead", "Safety and Acceptance Decision Lead"];
  return Object.keys(LEAD_ROLE_ID);
}

function requiredPerspectives(rigor) {
  if (["L1", "L2"].includes(rigor)) return [];
  if (rigor === "L3") return ["technical", "independent_review", "safety_acceptance"];
  if (rigor === "L4") return ["technical", "planning", "independent_review", "safety_acceptance"];
  return ["technical", "value", "planning", "independent_review", "safety_acceptance"];
}

function defaultTasks(input) {
  if (["L1", "L2"].includes(input.rigor)) return [];
  return [{
    task_id: "implementation",
    summary: input.summary,
    scope_paths: input.scope_paths,
    operations: input.operations,
    role: "Implementation Task",
    parent_role: "Implementation Lead",
    writer: false,
    parallel: false,
    owned_paths: [],
    perspectives: requiredPerspectives(input.rigor),
  }];
}

function safeScopePaths(entries, code) {
  if (!Array.isArray(entries) || entries.length === 0 || entries.length > 256) throw new Error(code);
  const paths = [...new Set(entries ?? [])].sort();
  if (paths.some((entry) => typeof entry !== "string"
    || entry.length === 0
    || entry.length > 4096
    || entry.startsWith("/")
    || entry !== path.posix.normalize(entry)
    || entry === "."
    || entry === ".."
    || entry.startsWith("../")
    || entry.includes("\0")
    || entry.includes("\\"))) throw new Error(code);
  return paths;
}

function safeChangeSignals(value) {
  if (value === undefined) return [];
  if (!Array.isArray(value)
    || value.length > RIGOR_HARD_L5_TRIGGERS.length
    || value.some((entry) => typeof entry !== "string" || !RIGOR_HARD_L5_TRIGGERS.includes(entry))
    || new Set(value).size !== value.length) throw new Error("HEADLESS_TASK_CHANGE_SIGNALS_INVALID");
  return [...value].sort();
}

function safeTaskData(value) {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.length > 256) throw new Error("HEADLESS_SUBTASK_DATA_INVALID");
  let cloned;
  try {
    cloned = structuredClone(value);
  } catch {
    throw new Error("HEADLESS_SUBTASK_DATA_INVALID");
  }
  return cloned;
}

export function normalizeHeadlessTask(input) {
  if (!input || !TASK_SCHEMA_VERSIONS.has(input.schema_version) || typeof input.summary !== "string" || input.summary.length === 0 || Buffer.byteLength(input.summary) > 16 * 1024) throw new Error("HEADLESS_TASK_INVALID");
  const normalizedInput = typeof input.fingerprint === "string";
  if (!normalizedInput && ["developer_minimum_rigor", "developer_minimum_risk", "developer_minimum_complexity", "impact_assessment"].some((field) => input[field] !== undefined)) throw new Error("HEADLESS_TASK_INTERNAL_FIELDS_INVALID");
  const developerMinimum = normalizedInput ? input.developer_minimum_rigor : (input.rigor ?? "L1");
  const riskMinimum = normalizedInput ? input.developer_minimum_risk : (input.risk ?? "normal");
  const complexityMinimum = normalizedInput ? input.developer_minimum_complexity : (input.complexity ?? "normal");
  const executionPreference = input.execution_preference ?? "auto";
  if (!RIGOR.has(developerMinimum) || !RISK.has(riskMinimum) || !COMPLEXITY.has(complexityMinimum) || !EXECUTION_PREFERENCES.has(executionPreference)) throw new Error("HEADLESS_TASK_CLASSIFICATION_INVALID");
  if (input.tasks !== undefined && (!Array.isArray(input.tasks) || input.tasks.length > 64)) throw new Error("HEADLESS_TASK_COUNT_INVALID");
  const explicitSignals = safeChangeSignals(input.change_signals);
  const scopePaths = safeScopePaths(input.scope_paths, "HEADLESS_TASK_SCOPE_INVALID");
  const operations = input.schema_version === "1.1.0" ? normalizeHeadlessOperations(input.operations) : [];
  const tasks = (input.tasks ?? []).map((task) => ({
    task_id: requireId(task.task_id, "HEADLESS_SUBTASK_ID_INVALID"),
    summary: task.summary === undefined
      ? input.summary
      : (typeof task.summary === "string" && task.summary.length > 0 && Buffer.byteLength(task.summary) <= 16 * 1024
        ? task.summary
        : (() => { throw new Error("HEADLESS_SUBTASK_SUMMARY_INVALID"); })()),
    scope_paths: safeScopePaths(task.scope_paths ?? scopePaths, "HEADLESS_SUBTASK_SCOPE_INVALID"),
    operations: input.schema_version === "1.1.0" ? normalizeHeadlessOperations(task.operations, "HEADLESS_SUBTASK_OPERATIONS_INVALID") : [],
    role: task.role ?? "Implementation Task",
    parent_role: task.parent_role ?? "Implementation Lead",
    writer: false,
    parallel: task.parallel === true,
    owned_paths: [],
    perspectives: [...new Set(task.perspectives ?? [])].sort(),
    data: safeTaskData(task.data),
  }));
  const classification = classifyHeadlessTaskImpact({
    schemaVersion: input.schema_version,
    summary: input.summary,
    scopePaths,
    operations,
    tasks,
    explicitSignals,
    riskMinimum,
    complexityMinimum,
  });
  let rigorAssessment = assessRigor({
    ...classification,
    developerMinimum,
  });
  if (executionPreference === "team" && rigorAssessment.effective_level === "L1") {
    rigorAssessment = {
      ...rigorAssessment,
      level: "L2",
      effective_level: "L2",
      reason: "team_preference_raise",
      adjustment_actor: "developer",
    };
  }
  const rigor = rigorAssessment.effective_level;
  const normalized = {
    schema_version: input.schema_version,
    schema_id: input.schema_version === "1.1.0" ? "HeadlessTask@1.1" : "HeadlessTask@1.0",
    task_id: requireId(input.task_id, "HEADLESS_TASK_ID_INVALID"),
    summary: input.summary,
    scope_paths: scopePaths,
    operations: classification.impactAssessment.root_operations,
    rigor,
    developer_minimum_rigor: developerMinimum,
    execution_preference: executionPreference,
    effective_execution_mode: rigor === "L1" ? "single_agent" : "team",
    rigor_assessment: rigorAssessment,
    impact_assessment: classification.impactAssessment,
    risk: classification.effectiveRisk,
    complexity: classification.effectiveComplexity,
    developer_minimum_risk: riskMinimum,
    developer_minimum_complexity: complexityMinimum,
    required_roles: requiredRoles(rigor),
    required_perspectives: requiredPerspectives(rigor),
    change_signals: explicitSignals,
    tasks: tasks.map((task) => ({
      ...task,
      perspectives: task.perspectives.length > 0 ? task.perspectives : requiredPerspectives(rigor),
    })),
  };
  const result = { ...normalized, fingerprint: digest(normalized) };
  if (normalizedInput && input.fingerprint !== result.fingerprint) throw new Error("HEADLESS_TASK_FINGERPRINT_INVALID");
  return result;
}

export function buildHeadlessTeamPlan({ task, selectionPlanner, maxAgents = 16, maxParallel = 4, maxProcessLaunches = 32 } = {}) {
  const normalizedTask = normalizeHeadlessTask(task);
  if (normalizedTask.impact_assessment.status === "unknown") {
    const blocker = {
      code: "HEADLESS_IMPACT_UNKNOWN",
      impact_assessment_fingerprint: normalizedTask.impact_assessment.classification_input_fingerprint,
      reasons: normalizedTask.impact_assessment.unknown_reasons,
    };
    const stopped = {
      schema_version: "1.0.0",
      decision: "STOP",
      profile: "headless_production_plan",
      production_executable: false,
      code: blocker.code,
      task: normalizedTask,
      selections: [],
      blocker,
    };
    return { ...stopped, fingerprint: digest(stopped) };
  }
  if (typeof selectionPlanner !== "function") throw new Error("HEADLESS_SELECTION_PLANNER_REQUIRED");
  const topologyTasks = normalizedTask.tasks.length > 0 ? normalizedTask.tasks : defaultTasks(normalizedTask);
  const topology = planTeamTopology({
    rigor: normalizedTask.rigor,
    requiredRoles: normalizedTask.required_roles,
    tasks: topologyTasks,
    requiredPerspectives: normalizedTask.required_perspectives,
    budgets: { max_agents: maxAgents, max_parallel: maxParallel, max_process_launches: maxProcessLaunches },
  });
  if (topology.decision !== "PASS") {
    const stopped = { schema_version: "1.0.0", decision: "STOP", profile: "headless_production_plan", task: normalizedTask, topology };
    return { ...stopped, fingerprint: digest(stopped) };
  }
  const selections = [];
  let advisoryOnly = false;
  const executableAgents = topology.agents;
  for (const agent of executableAgents) {
    const roleId = agent.layer === "orchestrator" ? "orchestrator" : agent.layer === "task" ? "task" : LEAD_ROLE_ID[agent.role];
    const selection = selectionPlanner({
      agent_id: agent.agent_id,
      role_id: roleId,
      rigor: normalizedTask.rigor,
      risk: normalizedTask.risk,
      complexity: normalizedTask.complexity,
    });
    if (!["PASS", "RECOMMEND"].includes(selection?.decision)) {
      const stopped = { schema_version: "1.0.0", decision: "STOP", profile: "headless_production_plan", task: normalizedTask, topology, selections, blocker: selection };
      return { ...stopped, fingerprint: digest(stopped) };
    }
    if (selection.decision === "RECOMMEND" || selection.production_eligible !== true) advisoryOnly = true;
    selections.push({
      agent_id: agent.agent_id,
      role_id: roleId,
      model: selection.selected_model,
      native_effort: selection.selected_native_reasoning,
      normalized_effort: selection.selected_normalized_effort,
      advisory_plan_fingerprint: selection.fingerprint,
      selection_profile: selection.profile ?? "production",
      production_eligible: selection.production_eligible === true,
    });
  }
  if (advisoryOnly) {
    const core = { schema_version: "1.0.0", decision: "RECOMMEND", profile: "development_advisory_plan", production_executable: false, task: normalizedTask, topology, selections };
    return { ...core, fingerprint: digest(core) };
  }
  const core = { schema_version: "1.0.0", decision: "PASS", profile: "headless_production_plan", task: normalizedTask, topology, selections };
  return { ...core, fingerprint: digest(core) };
}

export function verifyHeadlessTeamPlan(plan) {
  if (!plan || plan.schema_version !== "1.0.0" || plan.profile !== "headless_production_plan" || plan.decision !== "PASS" || !/^[a-f0-9]{64}$/u.test(plan.fingerprint ?? "")) throw new Error("HEADLESS_PLAN_INVALID");
  const { fingerprint, ...core } = plan;
  if (digest(core) !== fingerprint) throw new Error("HEADLESS_PLAN_FINGERPRINT_INVALID");
  const task = normalizeHeadlessTask(plan.task);
  const expectedSelections = plan.topology.agents.length;
  if (task.fingerprint !== plan.task.fingerprint || plan.topology?.decision !== "PASS" || plan.topology?.rigor !== task.rigor || !Array.isArray(plan.selections) || plan.selections.length !== expectedSelections) throw new Error("HEADLESS_PLAN_BINDING_INVALID");
  return structuredClone(plan);
}

export function headlessPlanDigest(value) {
  return digest(value);
}
