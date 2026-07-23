import { createHash } from "node:crypto";
import path from "node:path";
import { planTeamTopology } from "./agents.mjs";
import { assessRigor } from "./contracts.mjs";

const RIGOR = new Set(["L1", "L2", "L3", "L4", "L5"]);
const RISK = new Set(["low", "normal", "high", "critical"]);
const COMPLEXITY = new Set(["low", "normal", "high", "extreme"]);
const EXECUTION_PREFERENCES = new Set(["auto", "single_agent", "team"]);
const HARD_TRIGGER_PATTERNS = Object.freeze({
  security: /\bsecurity|secure|vulnerabilit|threat\b/iu,
  authentication: /\bauthentication|authenticate|login|oauth|sso\b/iu,
  secrets: /\bsecret|credential|api[ _-]?key|access[ _-]?token\b/iu,
  permissions: /\bpermission|authorization|access control|privilege|sandbox\b/iu,
  destructive_operation: /\bdelete|remove|destroy|purge|truncate\b/iu,
  history_rewrite: /\bhistory rewrite|force[ -]?push|rebase\b/iu,
  ci_or_safety_gate_change: /\bci\b|safety gate|release gate|quality gate/iu,
  external_repository_write: /\bpush\b|pull request|\bpr\b|\bmerge\b|external repository/iu,
  data_migration: /\bmigration|migrate|schema change|database upgrade\b/iu,
  breaking_compatibility: /\bbreaking|incompatible|compatibility break\b/iu,
});
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

function boundedClassificationText(input, scopePaths) {
  const fragments = [];
  let totalBytes = 0;
  const append = (value) => {
    if (typeof value !== "string") throw new Error("HEADLESS_TASK_CLASSIFICATION_FRAGMENT_INVALID");
    const bytes = Buffer.byteLength(value);
    if (bytes > 16 * 1024 || totalBytes + bytes + 1 > 64 * 1024) throw new Error("HEADLESS_TASK_CLASSIFICATION_INPUT_TOO_LARGE");
    totalBytes += bytes + 1;
    fragments.push(value);
  };
  append(input.summary);
  for (const entry of scopePaths) append(entry);
  for (const task of Array.isArray(input.tasks) ? input.tasks : []) {
    if (typeof task?.summary === "string") append(task.summary);
    if (Array.isArray(task?.scope_paths)) for (const entry of task.scope_paths) append(entry);
    if (Array.isArray(task?.data)) {
      for (const entry of task.data) {
        let serialized;
        try {
          serialized = JSON.stringify(entry);
        } catch {
          throw new Error("HEADLESS_TASK_CLASSIFICATION_FRAGMENT_INVALID");
        }
        if (typeof serialized !== "string") throw new Error("HEADLESS_TASK_CLASSIFICATION_FRAGMENT_INVALID");
        append(serialized);
      }
    }
  }
  return fragments.join("\n");
}

function safeChangeSignals(value) {
  if (value === undefined) return [];
  if (!Array.isArray(value)
    || value.length > Object.keys(HARD_TRIGGER_PATTERNS).length
    || value.some((entry) => typeof entry !== "string" || !Object.hasOwn(HARD_TRIGGER_PATTERNS, entry))
    || new Set(value).size !== value.length) throw new Error("HEADLESS_TASK_CHANGE_SIGNALS_INVALID");
  return [...value].sort();
}

function automaticClassification(input, { risk, complexity, scopePaths, explicitSignals }) {
  const searchable = boundedClassificationText(input, scopePaths);
  const inferred = Object.entries(HARD_TRIGGER_PATTERNS).filter(([, pattern]) => pattern.test(searchable)).map(([trigger]) => trigger);
  const hardTriggers = [...new Set([...explicitSignals, ...inferred])].sort();
  const hardTriggerEvidence = Object.fromEntries(hardTriggers.map((trigger) => [
    trigger,
    explicitSignals.includes(trigger) ? `task.change_signals:${trigger}` : `independent_summary_scope_match:${trigger}`,
  ]));
  const riskScore = { low: 0, normal: 1, high: 2, critical: 2 }[risk];
  const complexityScore = { low: 0, normal: 1, high: 2, extreme: 2 }[complexity];
  const scores = {
    user_impact: riskScore,
    change_scope: Math.max(complexityScore, scopePaths.length > 3 ? 2 : scopePaths.length > 1 ? 1 : 0),
    recoverability: hardTriggers.some((trigger) => ["destructive_operation", "history_rewrite", "data_migration"].includes(trigger)) ? 2 : riskScore > 1 ? 1 : 0,
    uncertainty: complexityScore,
    verification_difficulty: complexityScore,
    permission_boundary_impact: hardTriggers.some((trigger) => ["security", "authentication", "secrets", "permissions", "external_repository_write"].includes(trigger)) ? 2 : 0,
  };
  const scoreReasons = {
    user_impact: `derived from risk:${risk}`,
    change_scope: `derived from complexity:${complexity} and ${scopePaths.length} scope path(s)`,
    recoverability: "derived from destructive, history, migration, and risk signals",
    uncertainty: `derived from complexity:${complexity}`,
    verification_difficulty: `derived from complexity:${complexity}`,
    permission_boundary_impact: "derived from independently detected authority-boundary signals",
  };
  return { scores, scoreReasons, hardTriggers, hardTriggerEvidence };
}

export function normalizeHeadlessTask(input) {
  if (!input || input.schema_version !== "1.0.0" || typeof input.summary !== "string" || input.summary.length === 0 || Buffer.byteLength(input.summary) > 16 * 1024) throw new Error("HEADLESS_TASK_INVALID");
  const developerMinimum = input.rigor ?? "L1";
  const risk = input.risk ?? "normal";
  const complexity = input.complexity ?? "normal";
  const executionPreference = input.execution_preference ?? "auto";
  if (!RIGOR.has(developerMinimum) || !RISK.has(risk) || !COMPLEXITY.has(complexity) || !EXECUTION_PREFERENCES.has(executionPreference)) throw new Error("HEADLESS_TASK_CLASSIFICATION_INVALID");
  if (input.tasks !== undefined && (!Array.isArray(input.tasks) || input.tasks.length > 64)) throw new Error("HEADLESS_TASK_COUNT_INVALID");
  const explicitSignals = safeChangeSignals(input.change_signals);
  const scopePaths = safeScopePaths(input.scope_paths, "HEADLESS_TASK_SCOPE_INVALID");
  if (scopePaths.length === 0) throw new Error("HEADLESS_TASK_SCOPE_INVALID");
  const classification = automaticClassification(input, { risk, complexity, scopePaths, explicitSignals });
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
  const tasks = Array.isArray(input.tasks) && input.tasks.length > 0 ? input.tasks : defaultTasks({ rigor });
  const normalized = {
    schema_version: "1.0.0",
    task_id: requireId(input.task_id, "HEADLESS_TASK_ID_INVALID"),
    summary: input.summary,
    scope_paths: scopePaths,
    rigor,
    developer_minimum_rigor: developerMinimum,
    execution_preference: executionPreference,
    effective_execution_mode: rigor === "L1" ? "single_agent" : "team",
    rigor_assessment: rigorAssessment,
    risk,
    complexity,
    required_roles: requiredRoles(rigor),
    required_perspectives: requiredPerspectives(rigor),
    tasks: tasks.map((task) => ({
      task_id: requireId(task.task_id, "HEADLESS_SUBTASK_ID_INVALID"),
      summary: task.summary === undefined
        ? input.summary
        : (typeof task.summary === "string" && task.summary.length > 0 && Buffer.byteLength(task.summary) <= 16 * 1024
          ? task.summary
          : (() => { throw new Error("HEADLESS_SUBTASK_SUMMARY_INVALID"); })()),
      scope_paths: safeScopePaths(task.scope_paths ?? scopePaths, "HEADLESS_SUBTASK_SCOPE_INVALID"),
      role: task.role ?? "Implementation Task",
      parent_role: task.parent_role ?? "Implementation Lead",
      writer: false,
      parallel: task.parallel === true,
      owned_paths: [],
      perspectives: [...new Set(task.perspectives ?? requiredPerspectives(rigor))].sort(),
      data: task.data === undefined
        ? []
        : (Array.isArray(task.data) && task.data.length <= 256
          ? structuredClone(task.data)
          : (() => { throw new Error("HEADLESS_SUBTASK_DATA_INVALID"); })()),
    })),
  };
  return { ...normalized, fingerprint: digest(normalized) };
}

export function buildHeadlessTeamPlan({ task, selectionPlanner, maxAgents = 16, maxParallel = 4, maxProcessLaunches = 32 } = {}) {
  const normalizedTask = normalizeHeadlessTask(task);
  if (typeof selectionPlanner !== "function") throw new Error("HEADLESS_SELECTION_PLANNER_REQUIRED");
  const topology = planTeamTopology({
    rigor: normalizedTask.rigor,
    requiredRoles: normalizedTask.required_roles,
    tasks: normalizedTask.tasks,
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
