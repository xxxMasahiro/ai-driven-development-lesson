import { createHash, randomUUID } from "node:crypto";
import path from "node:path";
import { admitAgentRun, createLaunchIntent } from "./providers.mjs";

const LEAD_ROLES = ["Value Design Lead", "Planning Design Lead", "Implementation Lead", "Independent Review Lead", "Safety and Acceptance Decision Lead"];
const MINIMUM_PERSPECTIVES = { L1: 0, L2: 0, L3: 1, L4: 2, L5: 3 };
const STRICT_PERSPECTIVES = ["technical", "independent_review", "safety_acceptance"];
const RUN_TRANSITIONS = {
  PLANNED: ["AUTHORIZED", "BLOCKED", "STOPPED"],
  AUTHORIZED: ["STARTING", "BLOCKED", "STOPPED"],
  STARTING: ["RUNNING", "FAILED", "TIMED_OUT", "STOPPED"],
  RUNNING: ["REPORTED", "FAILED", "TIMED_OUT", "INTERRUPTED", "STOPPED"],
  REPORTED: ["REVIEWED", "BLOCKED", "FAILED", "STOPPED"],
  REVIEWED: ["CLOSED", "BLOCKED", "FAILED", "STOPPED"],
  CLOSED: [],
  BLOCKED: ["AUTHORIZED", "STOPPED"],
  FAILED: ["AUTHORIZED", "STOPPED"],
  TIMED_OUT: ["AUTHORIZED", "STOPPED"],
  INTERRUPTED: ["AUTHORIZED", "STOPPED"],
  STOPPED: []
};

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

function normalizeOwnedPath(value) {
  requireString(value, "DELEGATION_PATH_REQUIRED");
  if (value.includes("\0") || value.includes("\\") || path.posix.isAbsolute(value)) throw new Error("DELEGATION_PATH_INVALID");
  const normalized = path.posix.normalize(value);
  if (normalized === "." || normalized === ".." || normalized.startsWith("../")) throw new Error("DELEGATION_PATH_INVALID");
  return normalized;
}

function normalizePathSet(values, code) {
  if (!Array.isArray(values)) throw new Error(code);
  return [...new Set(values.map(normalizeOwnedPath))].sort();
}

function pathContains(parentPath, childPath) {
  return parentPath === childPath || childPath.startsWith(`${parentPath}/`);
}

function isSubset(childValues, parentValues) {
  const parent = new Set(parentValues ?? []);
  return (childValues ?? []).every((value) => parent.has(value));
}

function grantCore(grant) {
  const { fingerprint: ignored, ...core } = grant;
  return core;
}

function grantFromPersistedPayload(payload) {
  const { scope_fingerprint: ignoredScope, budget_fingerprint: ignoredBudget, ownership_fingerprint: ignoredOwnership, authority_epoch: ignoredEpoch, authority_id: ignoredAuthority, authority_proof_fingerprint: ignoredProof, ...grant } = payload ?? {};
  return grant;
}

function sandboxIsSubset(child, parent) {
  const modeRank = { read_only: 0, workspace_write: 1, danger_full_access: 2 };
  if (!(child?.mode in modeRank) || !(parent?.mode in modeRank) || modeRank[child.mode] > modeRank[parent.mode]) return false;
  if (child.network === true && parent.network !== true) return false;
  const childRoots = normalizePathSet(child.writable_paths ?? [], "DELEGATION_SANDBOX_PATHS_INVALID");
  const parentRoots = normalizePathSet(parent.writable_paths ?? [], "DELEGATION_SANDBOX_PATHS_INVALID");
  return childRoots.every((childPath) => parentRoots.some((parentPath) => pathContains(parentPath, childPath)));
}

function normalizeDelegationSandbox(sandbox, ownership) {
  if (!sandbox || typeof sandbox !== "object" || Array.isArray(sandbox)) throw new Error("DELEGATION_SANDBOX_REQUIRED");
  if (!new Set(["read_only", "workspace_write"]).has(sandbox.mode)) throw new Error("DELEGATION_SANDBOX_MODE_INVALID");
  if (sandbox.network !== undefined && typeof sandbox.network !== "boolean") throw new Error("DELEGATION_SANDBOX_NETWORK_INVALID");
  const writablePaths = normalizePathSet(sandbox.writable_paths ?? [], "DELEGATION_SANDBOX_PATHS_INVALID");
  if (ownership.read_only === true) {
    if (sandbox.mode !== "read_only" || writablePaths.length !== 0) throw new Error("READ_ONLY_OWNERSHIP_REQUIRES_READ_ONLY_SANDBOX");
  } else {
    if (sandbox.mode !== "workspace_write" || writablePaths.length === 0) throw new Error("WRITABLE_OWNERSHIP_REQUIRES_BOUNDED_SANDBOX");
    if (writablePaths.some((writablePath) => !ownership.paths.some((ownedPath) => pathContains(ownedPath, writablePath)))) throw new Error("DELEGATION_SANDBOX_OUTSIDE_OWNERSHIP");
  }
  return { ...structuredClone(sandbox), network: sandbox.network === true, writable_paths: writablePaths };
}

export function validateDelegationGrant(grant, { now = new Date().toISOString() } = {}) {
  if (!grant || typeof grant !== "object" || Array.isArray(grant)) throw new Error("DELEGATION_GRANT_REQUIRED");
  for (const field of ["grant_id", "parent_agent_id", "parent_role", "child_agent_id", "child_role", "authority_fingerprint", "expires_at", "issued_at"]) requireString(grant[field], `DELEGATION_GRANT_FIELD_REQUIRED:${field}`);
  if (!Number.isSafeInteger(grant.parent_depth) || !Number.isSafeInteger(grant.child_depth) || grant.parent_depth < 0 || grant.child_depth !== grant.parent_depth + 1 || grant.child_depth > 2) throw new Error("DELEGATION_TOPOLOGY_DEPTH_INVALID");
  if (!Number.isFinite(Date.parse(now)) || !Number.isFinite(Date.parse(grant.expires_at)) || !Number.isFinite(Date.parse(grant.issued_at)) || Date.parse(grant.issued_at) > Date.parse(now) || Date.parse(grant.expires_at) <= Date.parse(now)) throw new Error("DELEGATION_GRANT_EXPIRED_OR_INVALID");
  for (const key of ["max_runtime_ms", "max_tokens", "max_cost", "max_retries"]) if (!Number.isFinite(grant.budget?.[key]) || grant.budget[key] < 0) throw new Error(`DELEGATION_BUDGET_INVALID:${key}`);
  const scopePaths = normalizePathSet(grant.scope?.paths ?? [], "DELEGATION_SCOPE_PATHS_INVALID");
  const ownershipPaths = normalizePathSet(grant.ownership?.paths ?? [], "DELEGATION_OWNERSHIP_PATHS_INVALID");
  const ownership = { ...structuredClone(grant.ownership), read_only: grant.ownership?.read_only !== false, paths: ownershipPaths };
  if (!ownership.read_only && ((grant.child_depth === 1 && grant.child_role !== "Implementation Lead") || (grant.child_depth === 2 && grant.parent_role !== "Implementation Lead"))) throw new Error("WRITE_DELEGATION_REQUIRES_IMPLEMENTATION_LEAD");
  if (grant.ownership?.read_only === false && (ownershipPaths.length === 0 || ownershipPaths.some((owned) => !scopePaths.some((scoped) => pathContains(scoped, owned))))) throw new Error("DELEGATION_OWNERSHIP_OUTSIDE_SCOPE");
  if (!Array.isArray(grant.allowed_actions) || !Array.isArray(grant.allowed_tools) || !Array.isArray(grant.capabilities)) throw new Error("DELEGATION_ALLOWLIST_REQUIRED");
  const sandbox = normalizeDelegationSandbox(grant.sandbox, ownership);
  if (grant.child_depth === 2 && (typeof grant.parent_grant_id !== "string" || grant.parent_grant_id.length === 0 || !/^[a-f0-9]{64}$/.test(grant.parent_grant_fingerprint ?? ""))) throw new Error("DELEGATION_PARENT_GRANT_REFERENCE_REQUIRED");
  if (grant.child_depth === 1 && (grant.parent_agent_id !== "orchestrator" || grant.parent_role !== "Orchestrator Agent" || grant.parent_depth !== 0 || grant.parent_grant_id !== null || grant.parent_grant_fingerprint !== null)) throw new Error("DELEGATION_ROOT_PARENT_REFERENCE_INVALID");
  if (grant.fingerprint !== digest(grantCore(grant))) throw new Error("DELEGATION_GRANT_FINGERPRINT_INVALID");
  return { ...structuredClone(grant), scope: { ...structuredClone(grant.scope), paths: scopePaths }, ownership, sandbox };
}

function assertDelegationContained(childGrant, parentGrant) {
  if (childGrant.parent_grant_id !== parentGrant.grant_id || childGrant.parent_grant_fingerprint !== parentGrant.fingerprint || childGrant.parent_agent_id !== parentGrant.child_agent_id || childGrant.parent_role !== parentGrant.child_role || childGrant.parent_depth !== parentGrant.child_depth || childGrant.authority_fingerprint !== parentGrant.authority_fingerprint) throw new Error("DELEGATION_PARENT_GRANT_MISMATCH");
  if (Date.parse(childGrant.expires_at) > Date.parse(parentGrant.expires_at)) throw new Error("DELEGATION_EXPIRY_EXPANSION");
  for (const key of ["max_runtime_ms", "max_tokens", "max_cost", "max_retries"]) if (childGrant.budget[key] > parentGrant.budget[key]) throw new Error(`DELEGATION_BUDGET_EXPANSION:${key}`);
  if (childGrant.scope.paths.some((childPath) => !parentGrant.scope.paths.some((parentPath) => pathContains(parentPath, childPath)))) throw new Error("DELEGATION_SCOPE_EXPANSION");
  if (!childGrant.ownership.read_only && (parentGrant.ownership.read_only !== false || childGrant.ownership.paths.some((childPath) => !parentGrant.ownership.paths.some((parentPath) => pathContains(parentPath, childPath))))) throw new Error("DELEGATION_OWNERSHIP_EXPANSION");
  if (!isSubset(childGrant.allowed_actions, parentGrant.allowed_actions) || !isSubset(childGrant.allowed_tools, parentGrant.allowed_tools) || !isSubset(childGrant.capabilities, parentGrant.capabilities)) throw new Error("DELEGATION_CAPABILITY_EXPANSION");
  if (!sandboxIsSubset(childGrant.sandbox, parentGrant.sandbox)) throw new Error("DELEGATION_SANDBOX_EXPANSION");
}

export function planTeamTopology({ rigor, requiredRoles = [], tasks = [], requiredPerspectives = [], budgets }) {
  if (!new Set(["L1", "L2", "L3", "L4", "L5"]).has(rigor)) throw new Error("TEAM_RIGOR_INVALID");
  if (!budgets || !Number.isInteger(budgets.max_agents) || !Number.isInteger(budgets.max_parallel) || budgets.max_agents < 0 || budgets.max_parallel < 1) throw new Error("TEAM_BUDGET_INVALID");
  const unknownRoles = requiredRoles.filter((role) => !LEAD_ROLES.includes(role));
  if (unknownRoles.length) throw new Error(`TEAM_ROLE_INVALID:${unknownRoles.join(",")}`);
  const agents = [{ agent_id: "orchestrator", layer: "orchestrator", depth: 0, role: "Orchestrator Agent", parent_agent_id: null, may_delegate: true, writer: rigor === "L1" }];
  const compressedRoles = [];
  if (rigor === "L1") compressedRoles.push(...requiredRoles);
  else if (rigor === "L2") {
    const implementationRequired = requiredRoles.includes("Implementation Lead") || tasks.length > 0;
    if (implementationRequired) agents.push({ agent_id: "lead-implementation", layer: "lead", depth: 1, role: "Implementation Lead", parent_agent_id: "orchestrator", may_delegate: false, writer: true });
    compressedRoles.push(...requiredRoles.filter((role) => role !== "Implementation Lead"));
  } else {
    for (const role of [...new Set(requiredRoles)].sort()) agents.push({ agent_id: `lead-${role.toLowerCase().replace(/[^a-z]+/g, "-").replace(/^-|-$/g, "")}`, layer: "lead", depth: 1, role, parent_agent_id: "orchestrator", may_delegate: true, writer: role === "Implementation Lead" });
    const implementationLead = agents.find((agent) => agent.role === "Implementation Lead");
    for (const task of tasks) {
      requireString(task.task_id, "TASK_ID_REQUIRED");
      const parentRole = task.parent_role ?? (task.writer === true ? "Implementation Lead" : "Implementation Lead");
      const parentLead = agents.find((agent) => agent.role === parentRole);
      if (!parentLead) throw new Error(`TASK_PARENT_LEAD_REQUIRED:${parentRole}`);
      if (task.writer === true && parentRole !== "Implementation Lead") throw new Error("WRITE_TASK_REQUIRES_IMPLEMENTATION_LEAD");
      agents.push({ agent_id: `task-${task.task_id}`, layer: "task", depth: 2, role: task.role ?? "Implementation Task", parent_agent_id: parentLead.agent_id, parent_role: parentRole, may_delegate: false, writer: task.writer === true, owned_paths: [...(task.owned_paths ?? [])].sort(), perspectives: [...(task.perspectives ?? [])].sort() });
    }
  }
  if (agents.length - 1 > budgets.max_agents) throw new Error("TEAM_AGENT_BUDGET_EXCEEDED");
  if (tasks.filter((task) => task.parallel !== false).length > budgets.max_parallel && rigor !== "L1" && rigor !== "L2") throw new Error("TEAM_PARALLEL_BUDGET_EXCEEDED");
  const effectiveRequiredPerspectives = [...new Set([...(rigor === "L5" ? STRICT_PERSPECTIVES : []), ...requiredPerspectives])].sort();
  const covered = new Set(agents.flatMap((agent) => agent.perspectives ?? []).concat(agents.filter((agent) => agent.role === "Independent Review Lead").map(() => "independent_review"), agents.filter((agent) => agent.role === "Safety and Acceptance Decision Lead").map(() => "safety_acceptance")));
  const missingPerspectives = effectiveRequiredPerspectives.filter((perspective) => !covered.has(perspective));
  const coverageBelowRigorFloor = covered.size < MINIMUM_PERSPECTIVES[rigor];
  const result = { schema_version: "1.0.0", rigor, agents, compressed_roles: compressedRoles, required_perspectives: effectiveRequiredPerspectives, covered_perspectives: [...covered].sort(), minimum_perspective_count: MINIMUM_PERSPECTIVES[rigor], missing_perspectives: missingPerspectives.sort(), budgets, decision: missingPerspectives.length || coverageBelowRigorFloor ? "STOP" : "PASS" };
  return { ...result, fingerprint: digest(result) };
}

export function createDelegationGrant({ grantId, parent, child, scope, authorityFingerprint, budget, ownership, expiresAt, parentGrant = null, allowedActions = [], allowedTools = [], capabilities = [], sandbox = { mode: "read_only" }, now = new Date().toISOString() }) {
  if (!parent || !child) throw new Error("DELEGATION_AGENTS_REQUIRED");
  if (parent.depth === 2 || child.depth !== parent.depth + 1) throw new Error("DELEGATION_DEPTH_INVALID");
  if (child.parent_agent_id !== parent.agent_id) throw new Error("DELEGATION_PARENT_MISMATCH");
  if (parent.depth === 0 && (parent.agent_id !== "orchestrator" || parent.role !== "Orchestrator Agent")) throw new Error("DELEGATION_ROOT_ORCHESTRATOR_REQUIRED");
  if (parent.may_delegate !== true) throw new Error("DELEGATION_NOT_ALLOWED");
  for (const key of ["max_runtime_ms", "max_tokens", "max_cost", "max_retries"]) if (!Number.isFinite(budget?.[key]) || budget[key] < 0) throw new Error(`DELEGATION_BUDGET_INVALID:${key}`);
  const normalizedScope = { ...structuredClone(scope ?? {}), paths: normalizePathSet(scope?.paths ?? [], "DELEGATION_SCOPE_PATHS_INVALID") };
  const normalizedOwnership = { read_only: ownership?.read_only !== false, paths: normalizePathSet(ownership?.paths ?? [], "DELEGATION_OWNERSHIP_PATHS_INVALID") };
  if (!normalizedOwnership.read_only && ((child.depth === 1 && child.role !== "Implementation Lead") || (child.depth === 2 && parent.role !== "Implementation Lead"))) throw new Error("WRITE_DELEGATION_REQUIRES_IMPLEMENTATION_LEAD");
  if (!normalizedOwnership.read_only && (normalizedOwnership.paths.length === 0 || normalizedOwnership.paths.some((owned) => !normalizedScope.paths.some((scoped) => pathContains(scoped, owned))))) throw new Error("DELEGATION_OWNERSHIP_OUTSIDE_SCOPE");
  const expiryInput = requireString(expiresAt, "DELEGATION_EXPIRY_REQUIRED");
  if (!Number.isFinite(Date.parse(now)) || !Number.isFinite(Date.parse(expiryInput)) || Date.parse(expiryInput) <= Date.parse(now)) throw new Error("DELEGATION_EXPIRY_INVALID");
  const issuedAt = new Date(Date.parse(now)).toISOString();
  const expiry = new Date(Date.parse(expiryInput)).toISOString();
  const normalizedParentGrant = parent.depth === 0 ? null : validateDelegationGrant(parentGrant, { now: issuedAt });
  const normalizedSandbox = normalizeDelegationSandbox(sandbox, normalizedOwnership);
  if (normalizedParentGrant) {
    const candidate = { grant_id: grantId, parent_agent_id: parent.agent_id, parent_role: parent.role, parent_depth: parent.depth, child_agent_id: child.agent_id, child_role: child.role, child_depth: child.depth, scope: normalizedScope, authority_fingerprint: authorityFingerprint, budget, ownership: normalizedOwnership, allowed_actions: allowedActions, allowed_tools: allowedTools, capabilities, sandbox: normalizedSandbox, parent_grant_id: normalizedParentGrant.grant_id, parent_grant_fingerprint: normalizedParentGrant.fingerprint, issued_at: issuedAt, expires_at: expiry };
    assertDelegationContained(candidate, normalizedParentGrant);
  }
  const grant = { schema_version: "1.0.0", grant_id: requireString(grantId, "GRANT_ID_REQUIRED"), parent_agent_id: parent.agent_id, parent_role: requireString(parent.role, "DELEGATION_PARENT_ROLE_REQUIRED"), parent_depth: parent.depth, child_agent_id: child.agent_id, child_role: child.role, child_depth: child.depth, scope: normalizedScope, authority_fingerprint: requireString(authorityFingerprint, "DELEGATION_AUTHORITY_REQUIRED"), budget: { ...budget }, ownership: normalizedOwnership, allowed_actions: [...new Set(allowedActions)].sort(), allowed_tools: [...new Set(allowedTools)].sort(), capabilities: [...new Set(capabilities)].sort(), sandbox: normalizedSandbox, parent_grant_id: normalizedParentGrant?.grant_id ?? null, parent_grant_fingerprint: normalizedParentGrant?.fingerprint ?? null, issued_at: issuedAt, expires_at: expiry };
  return { ...grant, fingerprint: digest(grant) };
}

function assertCurrentAuthorityEpoch(store, authorityBindings, code = "AGENT_AUTHORITY_EPOCH_STALE") {
  if (!Number.isSafeInteger(store?.revocation_epoch) || store.revocation_epoch !== authorityBindings.revocation_epoch) throw new Error(code);
}

function validatePersistedGrantRecord(record, expectedGrant, now, code, expectedAuthorityEpoch) {
  if (!record || record.kind !== "DelegationGrant" || record.lifecycle_state !== "AUTHORIZED" || !Number.isSafeInteger(expectedAuthorityEpoch) || record.payload?.authority_epoch !== expectedAuthorityEpoch || !Number.isFinite(Date.parse(record.fresh_until)) || Date.parse(record.fresh_until) <= Date.parse(now)) throw new Error(code);
  const persisted = validateDelegationGrant(grantFromPersistedPayload(record.payload), { now });
  if (persisted.fingerprint !== expectedGrant.fingerprint || record.payload?.fingerprint !== expectedGrant.fingerprint || record.input_fp !== expectedGrant.fingerprint || record.fresh_until !== persisted.expires_at || record.payload?.scope_fingerprint !== digest(persisted.scope) || record.payload?.budget_fingerprint !== digest(persisted.budget) || record.payload?.ownership_fingerprint !== digest(persisted.ownership)) throw new Error(code);
  return persisted;
}

function resolvePersistedGrantChain(store, grant, now, authorityEpoch) {
  if (typeof store.get !== "function") throw new Error("DELEGATION_STORE_GET_REQUIRED");
  const current = store.get({ id: `delegation-grant-${grant.grant_id}` });
  validatePersistedGrantRecord(current, grant, now, "AGENT_PERSISTED_GRANT_REQUIRED", authorityEpoch);
  if (grant.child_depth === 1) return [current];
  const parent = store.get({ id: `delegation-grant-${grant.parent_grant_id}` });
  const parentGrant = validatePersistedGrantRecord(parent, grantFromPersistedPayload(parent?.payload), now, "DELEGATION_PERSISTED_PARENT_CHAIN_REQUIRED", authorityEpoch);
  try { assertDelegationContained(grant, parentGrant); } catch { throw new Error("DELEGATION_PERSISTED_PARENT_CHAIN_REQUIRED"); }
  return [parent, current];
}

export function persistDelegationGrant({ store, grant, authorityBindings, verifier, now = new Date().toISOString() } = {}) {
  requireAgentAuthorityWriter(store, verifier);
  const validated = validateDelegationGrant(grant, { now });
  validateAgentAuthorityBindings(authorityBindings, now, "DELEGATION_AUTHORITY_BINDINGS_REQUIRED");
  assertCurrentAuthorityEpoch(store, authorityBindings, "DELEGATION_AUTHORITY_EPOCH_STALE");
  const recordId = `delegation-grant-${validated.grant_id}`;
  const payload = {
    ...structuredClone(validated),
    scope_fingerprint: digest(validated.scope),
    budget_fingerprint: digest(validated.budget),
    ownership_fingerprint: digest(validated.ownership),
    authority_epoch: authorityBindings.authority_epoch,
  };
  const expectedRevision = store.revision;
  if (validated.child_depth === 2) {
    const parent = store.get({ id: `delegation-grant-${validated.parent_grant_id}` });
    const parentGrant = validatePersistedGrantRecord(parent, grantFromPersistedPayload(parent?.payload), now, "DELEGATION_PERSISTED_PARENT_CHAIN_REQUIRED", authorityBindings.authority_epoch);
    try { assertDelegationContained(validated, parentGrant); } catch { throw new Error("DELEGATION_PERSISTED_PARENT_CHAIN_REQUIRED"); }
    if (parent.payload?.authority_epoch !== authorityBindings.authority_epoch) throw new Error("DELEGATION_PERSISTED_PARENT_CHAIN_REQUIRED");
  }
  if (typeof store.persistDelegationGrantAuthority !== "function") throw new Error("DELEGATION_GRANT_STORE_WRITER_REQUIRED");
  const persisted = store.persistDelegationGrantAuthority({ expectedRevision, record: { id: recordId, kind: "DelegationGrant", schema_version: "1.0.0", record_revision: 1, authority_scope: authorityBindings.task_id, lineage_id: validated.grant_id, lifecycle_state: "AUTHORIZED", payload, source_revision: validated.parent_grant_fingerprint ?? "orchestrator-root", policy_fp: authorityBindings.policy_fingerprint, input_fp: validated.fingerprint, fresh_until: validated.expires_at }, event: { event_id: `event-${recordId}`, aggregate_id: recordId, event_type: "DELEGATION_GRANT_AUTHORIZED", authority_decision_id: validated.authority_fingerprint, payload: { grant_id: validated.grant_id, parent_agent_id: validated.parent_agent_id, child_agent_id: validated.child_agent_id, scope_fingerprint: payload.scope_fingerprint, authority_epoch: authorityBindings.authority_epoch, expires_at: validated.expires_at } }, verifier });
  return { ...persisted, grant_id: validated.grant_id, state: "AUTHORIZED", fingerprint: validated.fingerprint };
}

function validateAgentAuthorityBindings(authorityBindings, now, code = "AGENT_AUTHORITY_BINDINGS_REQUIRED") {
  if (!authorityBindings || !Number.isSafeInteger(authorityBindings.authority_epoch) || authorityBindings.authority_epoch < 0 || !Number.isSafeInteger(authorityBindings.revocation_epoch) || authorityBindings.revocation_epoch !== authorityBindings.authority_epoch || typeof authorityBindings.task_id !== "string" || authorityBindings.task_id.length === 0 || typeof authorityBindings.policy_fingerprint !== "string" || authorityBindings.policy_fingerprint.length === 0 || !Number.isFinite(Date.parse(authorityBindings.fresh_until)) || Date.parse(authorityBindings.fresh_until) <= Date.parse(now)) throw new Error(code);
  return authorityBindings;
}

function requireAgentAuthorityWriter(store, verifier) {
  if (!store || typeof store.get !== "function" || typeof store.revision !== "number") throw new Error("AGENT_AUTHORITY_RECORD_STORE_REQUIRED");
  if (!verifier || verifier.trusted !== true || verifier.independent !== true || typeof verifier.authority_id !== "string" || typeof verifier.verify !== "function") throw new Error("AGENT_AUTHORITY_RECORD_VERIFIER_REQUIRED");
}

export function persistResourceCostReservation({ store, reservation, authorityBindings, verifier, now = new Date().toISOString() } = {}) {
  requireAgentAuthorityWriter(store, verifier);
  validateAgentAuthorityBindings(authorityBindings, now, "RESOURCE_RESERVATION_AUTHORITY_BINDINGS_REQUIRED");
  assertCurrentAuthorityEpoch(store, authorityBindings, "RESOURCE_RESERVATION_AUTHORITY_EPOCH_STALE");
  if (!reservation || !new Set(["launch", "retry"]).has(reservation.purpose)) throw new Error("RESOURCE_RESERVATION_INVALID");
  for (const field of ["reservation_id", "grant_fingerprint", "child_agent_id"]) requireString(reservation[field], `RESOURCE_RESERVATION_FIELD_REQUIRED:${field}`);
  for (const field of ["max_runtime_ms", "max_tokens", "max_cost", "max_retries"]) if (!Number.isFinite(reservation.budget?.[field]) || reservation.budget[field] < 0) throw new Error(`RESOURCE_RESERVATION_BUDGET_INVALID:${field}`);
  const targets = normalizePathSet(reservation.targets ?? [], "RESOURCE_RESERVATION_TARGETS_REQUIRED");
  if (targets.length === 0 || !Number.isFinite(Date.parse(reservation.expires_at)) || Date.parse(reservation.expires_at) <= Date.parse(now) || Date.parse(reservation.expires_at) > Date.parse(authorityBindings.fresh_until)) throw new Error("RESOURCE_RESERVATION_EXPIRY_INVALID");
  if (reservation.purpose === "retry") for (const field of ["run_id", "material_change_fingerprint"]) requireString(reservation[field], `RESOURCE_RESERVATION_RETRY_FIELD_REQUIRED:${field}`);
  const payload = { ...structuredClone(reservation), targets, authority_epoch: authorityBindings.authority_epoch, consumed: false };
  const record = { id: reservation.reservation_id, kind: "ResourceCostReservation", schema_version: "1.0.0", record_revision: 1, authority_scope: authorityBindings.task_id, lineage_id: reservation.purpose === "retry" ? reservation.run_id : reservation.child_agent_id, lifecycle_state: "AUTHORIZED", payload, source_revision: verifier.authority_id, policy_fp: authorityBindings.policy_fingerprint, input_fp: digest(payload), fresh_until: reservation.expires_at };
  if (typeof store.persistResourceCostReservationAuthority !== "function") throw new Error("RESOURCE_RESERVATION_STORE_WRITER_REQUIRED");
  const persisted = store.persistResourceCostReservationAuthority({ expectedRevision: store.revision, record, verifier, event: { event_id: `event-${record.id}`, aggregate_id: record.id, event_type: "RESOURCE_COST_RESERVED", payload: { reservation_id: reservation.reservation_id, purpose: reservation.purpose, authority_epoch: authorityBindings.authority_epoch } } });
  return { ...persisted, reservation: store.get({ id: record.id }).payload };
}

export function persistReviewerAssignment({ store, assignment, grant, authorityBindings, verifier, now = new Date().toISOString() } = {}) {
  requireAgentAuthorityWriter(store, verifier);
  const validatedGrant = validateDelegationGrant(grant, { now });
  validateAgentAuthorityBindings(authorityBindings, now, "REVIEWER_ASSIGNMENT_AUTHORITY_BINDINGS_REQUIRED");
  assertCurrentAuthorityEpoch(store, authorityBindings, "REVIEWER_ASSIGNMENT_AUTHORITY_EPOCH_STALE");
  if (!assignment || !new Set(["lead", "orchestrator", "validator"]).has(assignment.assignment_kind)) throw new Error("REVIEWER_ASSIGNMENT_INVALID");
  for (const field of ["run_id", "agent_id", "agent_role"]) requireString(assignment[field], `REVIEWER_ASSIGNMENT_FIELD_REQUIRED:${field}`);
  const allowedRoles = assignment.assignment_kind === "lead" ? LEAD_ROLES : assignment.assignment_kind === "orchestrator" ? ["Orchestrator Agent"] : ["Safety and Acceptance Decision Lead"];
  if (!allowedRoles.includes(assignment.agent_role) || assignment.agent_id === validatedGrant.child_agent_id || assignment.read_only !== true) throw new Error("REVIEWER_ASSIGNMENT_INDEPENDENCE_INVALID");
  const payload = { ...structuredClone(assignment), grant_fingerprint: validatedGrant.fingerprint, authority_epoch: authorityBindings.authority_epoch };
  const id = `agent-reviewer-assignment-${assignment.run_id}-${assignment.assignment_kind}`;
  const record = { id, kind: "AgentReviewerAssignment", schema_version: "1.0.0", record_revision: 1, authority_scope: authorityBindings.task_id, lineage_id: assignment.run_id, lifecycle_state: "AUTHORIZED", payload, source_revision: validatedGrant.fingerprint, policy_fp: authorityBindings.policy_fingerprint, input_fp: digest(payload), fresh_until: authorityBindings.fresh_until };
  if (typeof store.persistReviewerAssignmentAuthority !== "function") throw new Error("REVIEWER_ASSIGNMENT_STORE_WRITER_REQUIRED");
  const persisted = store.persistReviewerAssignmentAuthority({ expectedRevision: store.revision, record, verifier, event: { event_id: `event-${id}`, aggregate_id: assignment.run_id, event_type: "AGENT_REVIEWER_ASSIGNED", payload: { assignment_kind: assignment.assignment_kind, agent_id: assignment.agent_id, authority_epoch: authorityBindings.authority_epoch } } });
  return { ...persisted, assignment: store.get({ id }).payload };
}

export function persistAgentReview({ store, runId, assignmentKind, review, authorityBindings, verifier, now = new Date().toISOString() } = {}) {
  requireAgentAuthorityWriter(store, verifier);
  validateAgentAuthorityBindings(authorityBindings, now, "AGENT_REVIEW_AUTHORITY_BINDINGS_REQUIRED");
  assertCurrentAuthorityEpoch(store, authorityBindings, "AGENT_REVIEW_AUTHORITY_EPOCH_STALE");
  if (!new Set(["lead", "orchestrator", "validator"]).has(assignmentKind)) throw new Error("AGENT_REVIEW_KIND_INVALID");
  requireString(runId, "AGENT_REVIEW_RUN_REQUIRED");
  const assignmentId = `agent-reviewer-assignment-${runId}-${assignmentKind}`;
  const assignment = store.get({ id: assignmentId });
  if (assignment?.kind !== "AgentReviewerAssignment" || assignment.lifecycle_state !== "AUTHORIZED" || assignment.payload?.assignment_kind !== assignmentKind || assignment.payload?.agent_id !== review?.agent_id || assignment.payload?.authority_epoch !== authorityBindings.authority_epoch || assignment.policy_fp !== authorityBindings.policy_fingerprint || Date.parse(assignment.fresh_until) < Date.parse(now)) throw new Error("AGENT_REVIEW_ASSIGNMENT_INVALID");
  if (review.result_fingerprint === undefined || review.accepted !== true || (assignmentKind === "validator" && review.decision !== "PASS")) throw new Error("AGENT_REVIEW_DISPOSITION_INVALID");
  const payload = { ...structuredClone(review), assignment_kind: assignmentKind, assignment_fingerprint: digest(assignment.payload), authority_epoch: authorityBindings.authority_epoch };
  const kinds = { lead: "AgentLeadReview", orchestrator: "AgentOrchestratorReview", validator: "AgentValidatorDisposition" };
  const id = `agent-review-${runId}-${assignmentKind}`;
  const record = { id, kind: kinds[assignmentKind], schema_version: "1.0.0", record_revision: 1, authority_scope: authorityBindings.task_id, lineage_id: runId, lifecycle_state: "accepted", payload, source_revision: assignmentId, policy_fp: authorityBindings.policy_fingerprint, input_fp: review.result_fingerprint, fresh_until: authorityBindings.fresh_until };
  if (typeof store.persistAgentReviewAuthority !== "function") throw new Error("AGENT_REVIEW_STORE_WRITER_REQUIRED");
  const persisted = store.persistAgentReviewAuthority({ expectedRevision: store.revision, record, verifier, event: { event_id: `event-${id}`, aggregate_id: runId, event_type: assignmentKind === "validator" ? "AGENT_VALIDATOR_DISPOSITION_RECORDED" : "AGENT_REVIEW_RECORDED", payload: { assignment_kind: assignmentKind, agent_id: review.agent_id, result_fingerprint: review.result_fingerprint } } });
  return { ...persisted, review: store.get({ id }).payload };
}

export function persistValidatorDecision({ store, decision, authorityBindings, verifier, now = new Date().toISOString() } = {}) {
  requireAgentAuthorityWriter(store, verifier);
  validateAgentAuthorityBindings(authorityBindings, now, "VALIDATOR_DECISION_AUTHORITY_BINDINGS_REQUIRED");
  assertCurrentAuthorityEpoch(store, authorityBindings, "VALIDATOR_DECISION_AUTHORITY_EPOCH_STALE");
  if (!decision || decision.decision !== "PASS" || decision.independent !== true) throw new Error("VALIDATOR_DECISION_INVALID");
  for (const field of ["decision_id", "run_id", "failure_fingerprint", "material_change_fingerprint", "retry_reservation_id", "validator_agent_id"]) requireString(decision[field], `VALIDATOR_DECISION_FIELD_REQUIRED:${field}`);
  const payload = { ...structuredClone(decision), authority_epoch: authorityBindings.authority_epoch };
  const record = { id: decision.decision_id, kind: "ValidatorDecision", schema_version: "1.0.0", record_revision: 1, authority_scope: authorityBindings.task_id, lineage_id: decision.run_id, lifecycle_state: "PASS", payload, source_revision: verifier.authority_id, policy_fp: authorityBindings.policy_fingerprint, input_fp: decision.failure_fingerprint, fresh_until: authorityBindings.fresh_until };
  if (typeof store.persistValidatorDecisionAuthority !== "function") throw new Error("VALIDATOR_DECISION_STORE_WRITER_REQUIRED");
  const persisted = store.persistValidatorDecisionAuthority({ expectedRevision: store.revision, record, verifier, event: { event_id: `event-${record.id}`, aggregate_id: decision.run_id, event_type: "VALIDATOR_DECISION_RECORDED", payload: { decision_id: decision.decision_id, run_id: decision.run_id, decision: decision.decision, authority_epoch: authorityBindings.authority_epoch } } });
  return { ...persisted, decision: store.get({ id: record.id }).payload };
}

export function validateWriteOwnership({ grants, integrationOrder = [] }) {
  const writers = grants.filter((grant) => grant.ownership?.read_only === false).map((grant) => ({ ...grant, ownership: { ...grant.ownership, paths: normalizePathSet(grant.ownership.paths ?? [], "DELEGATION_OWNERSHIP_PATHS_INVALID") } }));
  const conflicts = [];
  for (let i = 0; i < writers.length; i += 1) {
    for (let j = i + 1; j < writers.length; j += 1) {
      const overlap = writers[i].ownership.paths.flatMap((left) => writers[j].ownership.paths.filter((right) => pathContains(left, right) || pathContains(right, left)).map((right) => [left, right].sort()[0]));
      if (overlap.length) conflicts.push({ agents: [writers[i].child_agent_id, writers[j].child_agent_id].sort(), paths: overlap.sort() });
    }
  }
  if (conflicts.length) return { decision: "STOP", code: "WRITE_OWNERSHIP_CONFLICT", conflicts };
  const writerIds = writers.map((grant) => grant.child_agent_id).sort();
  if (writerIds.length > 1 && (integrationOrder.length !== writerIds.length || !writerIds.every((id) => integrationOrder.includes(id)))) return { decision: "STOP", code: "INTEGRATION_ORDER_REQUIRED", writers: writerIds };
  return { decision: "PASS", writers: writerIds, integration_order: [...integrationOrder] };
}

export function buildAgentTaskEnvelope({ grant, control, data }) {
  if (!grant?.fingerprint) throw new Error("TASK_GRANT_REQUIRED");
  if (!control || control.trust_class !== "trusted_control" || control.interpretation !== "instruction") throw new Error("TASK_CONTROL_NOT_TRUSTED");
  if (!Array.isArray(data) || data.some((entry) => entry?.trust_class === "trusted_control" || entry?.interpretation === "instruction" || entry?.envelope?.trust_class === "trusted_control" || entry?.envelope?.interpretation === "instruction")) throw new Error("TASK_DATA_TRUST_INVALID");
  const normalizedData = data.map((entry) => ({ ...structuredClone(entry), interpretation: "data", ...(entry?.envelope ? { envelope: { ...structuredClone(entry.envelope), interpretation: "data" } } : {}) }));
  const envelope = { schema_version: "1.0.0", grant_fingerprint: grant.fingerprint, control: structuredClone(control), data: normalizedData };
  return { ...envelope, fingerprint: digest(envelope) };
}

export function transitionAgentRun(run, nextState, { materialChangeFingerprint, validatorDecisionFingerprint } = {}) {
  if (!run || !RUN_TRANSITIONS[run.state]) throw new Error("AGENT_RUN_STATE_INVALID");
  if (!RUN_TRANSITIONS[run.state].includes(nextState)) throw new Error(`AGENT_RUN_TRANSITION_INVALID:${run.state}:${nextState}`);
  if (run.state === "STOPPED") throw new Error("IMMUTABLE_STOP");
  if (["FAILED", "TIMED_OUT", "INTERRUPTED", "BLOCKED"].includes(run.state) && nextState === "AUTHORIZED") throw new Error("AUTHORITATIVE_REAUTHORIZATION_REQUIRED");
  return { ...run, state: nextState, state_revision: (run.state_revision ?? 0) + 1, material_change_fingerprint: materialChangeFingerprint ?? null, validator_decision_fingerprint: validatorDecisionFingerprint ?? run.validator_decision_fingerprint ?? null };
}

export function reauthorizeAgentRun({ store, runId, materialChangeFingerprint, validatorDecisionId, retryReservationId, authorityBindings, verifier, now = new Date().toISOString() }) {
  if (!store || typeof store.get !== "function" || typeof store.commit !== "function" || typeof store.revision !== "number") throw new Error("AGENT_REAUTHORIZATION_STORE_REQUIRED");
  for (const [value, code] of [[runId, "AGENT_REAUTHORIZATION_RUN_ID_REQUIRED"], [materialChangeFingerprint, "AGENT_REAUTHORIZATION_MATERIAL_CHANGE_REQUIRED"], [validatorDecisionId, "AGENT_REAUTHORIZATION_VALIDATOR_DECISION_REQUIRED"], [retryReservationId, "AGENT_REAUTHORIZATION_RESERVATION_REQUIRED"]]) requireString(value, code);
  validateAgentAuthorityBindings(authorityBindings, now, "AGENT_REAUTHORIZATION_AUTHORITY_BINDINGS_REQUIRED");
  assertCurrentAuthorityEpoch(store, authorityBindings, "AGENT_REAUTHORIZATION_AUTHORITY_EPOCH_STALE");
  if (!verifier || verifier.trusted !== true || typeof verifier.verify !== "function") throw new Error("AGENT_REAUTHORIZATION_VERIFIER_REQUIRED");
  const run = store.get({ id: runId });
  const state = run?.payload?.state ?? run?.lifecycle_state;
  if (run?.kind !== "AgentRun" || !["FAILED", "TIMED_OUT", "INTERRUPTED", "BLOCKED"].includes(state)) throw new Error("AGENT_REAUTHORIZATION_RUN_STATE_INVALID");
  const failureFingerprint = requireString(run.payload?.failure_fingerprint, "AGENT_REAUTHORIZATION_FAILURE_FINGERPRINT_REQUIRED");
  if (materialChangeFingerprint === failureFingerprint) throw new Error("AGENT_REAUTHORIZATION_MATERIAL_CHANGE_UNCHANGED");
  const decision = store.get({ id: validatorDecisionId });
  const reservation = store.get({ id: retryReservationId });
  if (decision?.kind !== "ValidatorDecision" || decision.lifecycle_state !== "PASS" || decision.policy_fp !== authorityBindings.policy_fingerprint || Date.parse(decision.fresh_until) < Date.parse(now) || typeof decision.payload?.authority_proof_fingerprint !== "string") throw new Error("AGENT_REAUTHORIZATION_VALIDATOR_DECISION_INVALID");
  const expectedDecision = { run_id: runId, failure_fingerprint: failureFingerprint, material_change_fingerprint: materialChangeFingerprint, retry_reservation_id: retryReservationId, authority_epoch: authorityBindings.authority_epoch, decision: "PASS" };
  for (const [field, value] of Object.entries(expectedDecision)) if (decision.payload?.[field] !== value) throw new Error(`AGENT_REAUTHORIZATION_VALIDATOR_BINDING_MISMATCH:${field}`);
  if (typeof decision.payload?.validator_agent_id !== "string" || decision.payload.independent !== true) throw new Error("AGENT_REAUTHORIZATION_INDEPENDENT_VALIDATOR_REQUIRED");
  const decisionFingerprint = digest(decision.payload);
  const verdict = verifier.verify({ decision: structuredClone(decision), expected: structuredClone(expectedDecision), fingerprint: decisionFingerprint, now });
  if (verdict && typeof verdict.then === "function") throw new Error("AGENT_REAUTHORIZATION_VERIFIER_ASYNC_UNSUPPORTED");
  if (verdict?.verified !== true || verdict.fingerprint !== decisionFingerprint || verdict.authority_epoch !== authorityBindings.authority_epoch) throw new Error("AGENT_REAUTHORIZATION_VALIDATOR_PROOF_INVALID");
  if (reservation?.kind !== "ResourceCostReservation" || reservation.lifecycle_state !== "AUTHORIZED" || reservation.policy_fp !== authorityBindings.policy_fingerprint || Date.parse(reservation.fresh_until) < Date.parse(now) || reservation.payload?.purpose !== "retry" || reservation.payload?.run_id !== runId || reservation.payload?.material_change_fingerprint !== materialChangeFingerprint || reservation.payload?.authority_epoch !== authorityBindings.authority_epoch || reservation.payload?.reservation_id !== retryReservationId || reservation.payload?.consumed !== false || typeof reservation.payload?.authority_proof_fingerprint !== "string") throw new Error("AGENT_REAUTHORIZATION_RESERVATION_INVALID");
  if (store.get({ id: `resource-reservation-consumption-${retryReservationId}` })) throw new Error("AGENT_REAUTHORIZATION_RESERVATION_SPENT");
  const reauthorizationId = `agent-reauthorization-${runId}-${(run.record_revision ?? 1) + 1}`;
  const payload = { run_id: runId, from_state: state, state: "AUTHORIZED", failure_fingerprint: failureFingerprint, material_change_fingerprint: materialChangeFingerprint, validator_decision_id: validatorDecisionId, validator_decision_fingerprint: decisionFingerprint, retry_reservation_id: retryReservationId, authority_epoch: authorityBindings.authority_epoch, reauthorized_at: now };
  store.commit({
    expectedRevision: store.revision,
    authorityEpoch: authorityBindings.authority_epoch,
    records: [
      { id: reauthorizationId, kind: "AgentRunReauthorization", schema_version: "1.0.0", authority_scope: authorityBindings.task_id, lineage_id: runId, lifecycle_state: "AUTHORIZED", payload, source_revision: decisionFingerprint, policy_fp: authorityBindings.policy_fingerprint, input_fp: digest({ expectedDecision, reservation: reservation.payload }) },
      { id: `resource-reservation-consumption-${retryReservationId}`, kind: "ResourceCostReservationConsumption", schema_version: "1.0.0", authority_scope: authorityBindings.task_id, lineage_id: retryReservationId, lifecycle_state: "CONSUMED", payload: { reservation_id: retryReservationId, purpose: "retry", run_id: runId, authority_epoch: authorityBindings.authority_epoch, consumed_at: now }, source_revision: reservation.content_fp, policy_fp: authorityBindings.policy_fingerprint, input_fp: materialChangeFingerprint }
    ],
    relations: [{ from_id: runId, relation_kind: "reauthorized_by", to_id: reauthorizationId }, { from_id: reauthorizationId, relation_kind: "uses_validator_decision", to_id: validatorDecisionId }, { from_id: reauthorizationId, relation_kind: "uses_retry_reservation", to_id: retryReservationId }],
    events: [{ event_id: `event-${reauthorizationId}`, aggregate_id: runId, event_type: "AGENT_RUN_REAUTHORIZED", authority_decision_id: validatorDecisionId, payload: { run_id: runId, reauthorization_id: reauthorizationId, authority_epoch: authorityBindings.authority_epoch, material_change_fingerprint: materialChangeFingerprint } }]
  });
  return { decision: "PASS", run_id: runId, state: "AUTHORIZED", reauthorization_id: reauthorizationId, validator_decision_fingerprint: decisionFingerprint };
}

export function evaluateAgentRetry({ failureFingerprint, previousFailureFingerprint, attempt, limit, totalLimit = limit, unchangedAttempt = attempt, validatorDecision, materialProgressVerified = false, elapsedMs = 0, maxRuntimeMs = Infinity, spentTokens = 0, maxTokens = Infinity, spentCost = 0, maxCost = Infinity }) {
  if (!Number.isInteger(attempt) || !Number.isInteger(limit) || !Number.isInteger(totalLimit) || !Number.isInteger(unchangedAttempt) || attempt < 0 || limit < 0 || totalLimit < 0 || unchangedAttempt < 0 || [elapsedMs, maxRuntimeMs, spentTokens, maxTokens, spentCost, maxCost].some((value) => typeof value !== "number" || Number.isNaN(value) || value < 0)) throw new Error("AGENT_RETRY_INPUT_INVALID");
  if (validatorDecision === "STOP") return { decision: "STOP", retry: false, reason: "VALIDATOR_STOP" };
  if (attempt >= totalLimit) return { decision: "STOP", retry: false, reason: "TOTAL_RETRY_LIMIT" };
  if (elapsedMs >= maxRuntimeMs || spentTokens >= maxTokens || spentCost >= maxCost) return { decision: "STOP", retry: false, reason: "RESOURCE_RETRY_LIMIT" };
  if (failureFingerprint === previousFailureFingerprint && unchangedAttempt >= limit) return { decision: "STOP", retry: false, reason: "UNCHANGED_FAILURE_LIMIT" };
  if (failureFingerprint !== previousFailureFingerprint && materialProgressVerified !== true) return { decision: "STOP", retry: false, reason: "MATERIAL_PROGRESS_UNVERIFIED" };
  return { decision: "REVISE", retry: true, reason: failureFingerprint === previousFailureFingerprint ? "BOUNDED_RETRY" : "MATERIAL_PROGRESS" };
}

export function agentResultEvidenceFingerprint(result) {
  return digest({ run_id: result?.run_id, provenance: result?.provenance, scope_fingerprint: result?.scope_fingerprint, conclusion: result?.conclusion ?? null, evidence_references: result?.evidence_references ?? [], changed_artifact_manifest: result?.changed_artifact_manifest ?? [], unresolved_items: result?.unresolved_items ?? [] });
}

export function validateAgentResult({ result, grant, leadAgentId, orchestratorAgentId, validatorAgentId }) {
  if (!result || result.run_id === undefined || !result.provenance?.source_fingerprint) throw new Error("AGENT_RESULT_PROVENANCE_REQUIRED");
  if (result.scope_fingerprint !== digest(grant.scope)) return { decision: "STOP", code: "RESULT_SCOPE_MISMATCH" };
  const reviewAgents = [leadAgentId, orchestratorAgentId, validatorAgentId];
  if (reviewAgents.some((agentId) => typeof agentId !== "string" || agentId.length === 0) || new Set(reviewAgents).size !== reviewAgents.length || reviewAgents.includes(grant.child_agent_id)) return { decision: "STOP", code: "INDEPENDENT_REVIEWER_IDENTITIES_REQUIRED" };
  const evidenceFingerprint = agentResultEvidenceFingerprint(result);
  if (result.lead_review?.agent_id !== leadAgentId || result.lead_review?.accepted !== true || result.lead_review?.result_fingerprint !== evidenceFingerprint) return { decision: "STOP", code: "LEAD_REVIEW_REQUIRED" };
  if (result.orchestrator_review?.agent_id !== orchestratorAgentId || result.orchestrator_review?.accepted !== true || result.orchestrator_review?.result_fingerprint !== evidenceFingerprint) return { decision: "STOP", code: "ORCHESTRATOR_REVIEW_REQUIRED" };
  if (result.validator_disposition?.agent_id !== validatorAgentId || result.validator_disposition?.decision !== "PASS" || result.validator_disposition?.accepted !== true || result.validator_disposition?.result_fingerprint !== evidenceFingerprint) return { decision: "STOP", code: "VALIDATOR_DISPOSITION_REQUIRED" };
  return { decision: "PASS", evidence_fingerprint: evidenceFingerprint, result_fingerprint: digest(result) };
}

export function acceptAgentResult({ store, result, grant, leadAgentId, orchestratorAgentId, validatorAgentId, authorityBindings, now = new Date().toISOString() }) {
  if (!store || typeof store.get !== "function" || typeof store.commit !== "function") throw new Error("AGENT_RESULT_STORE_REQUIRED");
  const validatedGrant = validateDelegationGrant(grant, { now });
  validateAgentAuthorityBindings(authorityBindings, now, "AGENT_RESULT_AUTHORITY_BINDINGS_REQUIRED");
  assertCurrentAuthorityEpoch(store, authorityBindings, "AGENT_RESULT_AUTHORITY_EPOCH_STALE");
  const run = store.get({ id: result?.run_id });
  if (!run || run.kind !== "AgentRun" || run.lifecycle_state !== "RUNNING" || run.source_revision !== validatedGrant.fingerprint || run.payload?.authority_epoch !== authorityBindings.authority_epoch) return { decision: "STOP", code: "AGENT_RUN_NOT_ACCEPTABLE" };
  const assignmentIds = {
    lead: `agent-reviewer-assignment-${result.run_id}-lead`,
    orchestrator: `agent-reviewer-assignment-${result.run_id}-orchestrator`,
    validator: `agent-reviewer-assignment-${result.run_id}-validator`
  };
  const assignments = Object.fromEntries(Object.entries(assignmentIds).map(([role, id]) => [role, store.get({ id })]));
  const expectedAssignments = {
    lead: { agent_id: leadAgentId, allowed_roles: LEAD_ROLES },
    orchestrator: { agent_id: orchestratorAgentId, allowed_roles: ["Orchestrator Agent"] },
    validator: { agent_id: validatorAgentId, allowed_roles: ["Safety and Acceptance Decision Lead"] }
  };
  for (const role of Object.keys(assignments)) {
    const assignment = assignments[role];
    const expected = expectedAssignments[role];
    if (assignment?.kind !== "AgentReviewerAssignment" || assignment.lifecycle_state !== "AUTHORIZED" || assignment.source_revision !== validatedGrant.fingerprint || assignment.policy_fp !== authorityBindings.policy_fingerprint || Date.parse(assignment.fresh_until) < Date.parse(now) || typeof assignment.payload?.authority_proof_fingerprint !== "string" || assignment.payload?.run_id !== result.run_id || assignment.payload?.assignment_kind !== role || assignment.payload?.agent_id !== expected.agent_id || !expected.allowed_roles.includes(assignment.payload?.agent_role) || assignment.payload?.read_only !== true || assignment.payload?.grant_fingerprint !== validatedGrant.fingerprint || assignment.payload?.authority_epoch !== authorityBindings.authority_epoch) return { decision: "STOP", code: "AUTHORITATIVE_REVIEWER_ASSIGNMENTS_REQUIRED" };
  }
  const assignedAgents = Object.values(assignments).map((assignment) => assignment.payload.agent_id);
  if (new Set(assignedAgents).size !== assignedAgents.length || assignedAgents.includes(validatedGrant.child_agent_id)) return { decision: "STOP", code: "INDEPENDENT_REVIEWER_IDENTITIES_REQUIRED" };
  const reviewIds = {
    lead: `agent-review-${result?.run_id}-lead`,
    orchestrator: `agent-review-${result?.run_id}-orchestrator`,
    validator: `agent-review-${result?.run_id}-validator`
  };
  const reviewRecords = Object.fromEntries(Object.entries(reviewIds).map(([role, id]) => [role, store.get({ id })]));
  if (reviewRecords.lead?.kind !== "AgentLeadReview" || reviewRecords.orchestrator?.kind !== "AgentOrchestratorReview" || reviewRecords.validator?.kind !== "AgentValidatorDisposition") return { decision: "STOP", code: "AUTHORITATIVE_REVIEW_RECORDS_REQUIRED" };
  for (const role of Object.keys(reviewRecords)) {
    if (reviewRecords[role].payload?.assignment_fingerprint !== digest(assignments[role].payload) || reviewRecords[role].source_revision !== assignments[role].id || reviewRecords[role].policy_fp !== authorityBindings.policy_fingerprint || Date.parse(reviewRecords[role].fresh_until) < Date.parse(now) || reviewRecords[role].payload?.authority_epoch !== authorityBindings.authority_epoch || typeof reviewRecords[role].payload?.authority_proof_fingerprint !== "string") return { decision: "STOP", code: "AUTHORITATIVE_REVIEW_ASSIGNMENT_BINDING_REQUIRED" };
  }
  const authoritativeResult = {
    ...structuredClone(result),
    lead_review: reviewRecords.lead.payload,
    orchestrator_review: reviewRecords.orchestrator.payload,
    validator_disposition: reviewRecords.validator.payload
  };
  const verdict = validateAgentResult({ result: authoritativeResult, grant: validatedGrant, leadAgentId, orchestratorAgentId, validatorAgentId });
  if (verdict.decision !== "PASS") return verdict;
  const resultId = `agent-result-${result.run_id}`;
  const closureId = `agent-run-closure-${result.run_id}`;
  const stateHistory = ["REPORTED", "REVIEWED", "CLOSED"];
  store.commit({
    expectedRevision: store.revision,
    authorityEpoch: authorityBindings.authority_epoch,
    records: [
      { id: resultId, kind: "AgentResult", schema_version: "1.0.0", authority_scope: authorityBindings.task_id, lineage_id: result.run_id, lifecycle_state: "accepted", payload: { ...authoritativeResult, evidence_fingerprint: verdict.evidence_fingerprint, validator_disposition_fingerprint: digest(authoritativeResult.validator_disposition) }, source_revision: validatedGrant.fingerprint, policy_fp: authorityBindings.policy_fingerprint, input_fp: verdict.result_fingerprint },
      { id: closureId, kind: "AgentRunClosure", schema_version: "1.0.0", authority_scope: authorityBindings.task_id, lineage_id: result.run_id, lifecycle_state: "CLOSED", payload: { run_id: result.run_id, result_id: resultId, state_history: stateHistory, lead_review_fingerprint: digest(authoritativeResult.lead_review), orchestrator_review_fingerprint: digest(authoritativeResult.orchestrator_review), validator_disposition_fingerprint: digest(authoritativeResult.validator_disposition), reviewer_assignment_ids: assignmentIds, review_record_ids: reviewIds, authority_epoch: authorityBindings.authority_epoch, closed_at: now }, source_revision: validatedGrant.fingerprint, policy_fp: authorityBindings.policy_fingerprint, input_fp: verdict.result_fingerprint }
    ],
    relations: [{ from_id: result.run_id, relation_kind: "produced_result", to_id: resultId }, { from_id: resultId, relation_kind: "closed_by", to_id: closureId }],
    events: stateHistory.map((state, index) => ({ event_id: `event-${closureId}-${index + 1}`, aggregate_id: result.run_id, event_type: `AGENT_RUN_${state}`, payload: { run_id: result.run_id, result_id: resultId, state, validator_disposition_fingerprint: digest(authoritativeResult.validator_disposition) } })),
    evidenceRefs: [...new Set(result.evidence_references ?? [])]
  });
  return { decision: "PASS", run_id: result.run_id, result_id: resultId, closure_id: closureId, state: "CLOSED", result_fingerprint: verdict.result_fingerprint };
}

function requireIndependentVerifier(verifier) {
  if (!verifier || verifier.independent !== true || typeof verifier.verifier_id !== "string" || verifier.verifier_id.length === 0 || typeof verifier.verify !== "function") throw new Error("INDEPENDENT_AGENT_OBSERVATION_VERIFIER_REQUIRED");
  return verifier;
}

function persistAdmissionFailure({ store, intent, grant, authorityBindings, launchEffectId, code, containment }) {
  const fence = store.fence({ reason: `agent-admission:${intent.intent_id}:${code}` });
  const failureId = `admission-failure-${intent.intent_id}`;
  store.commit({
    expectedRevision: store.revision,
    records: [{
      id: failureId,
      kind: "AgentAdmissionFailure",
      schema_version: "1.0.0",
      authority_scope: authorityBindings.task_id,
      lineage_id: intent.intent_id,
      lifecycle_state: containment.contained === true ? "STOPPED" : "MANUAL_RECOVERY_REQUIRED",
      payload: {
        intent_id: intent.intent_id,
        parent_agent_id: grant.parent_agent_id,
        child_agent_id: grant.child_agent_id,
        launch_effect_id: launchEffectId,
        failure_code: code,
        containment_action: containment.action,
        containment_fingerprint: containment.fingerprint,
        contained: containment.contained === true,
        revocation_epoch: fence.revocation_epoch,
      },
      source_revision: grant.fingerprint,
      policy_fp: authorityBindings.policy_fingerprint,
      input_fp: intent.fingerprint,
    }],
    events: [{
      event_id: `event-${failureId}`,
      aggregate_id: failureId,
      event_type: containment.contained === true ? "AGENT_ADMISSION_FAILED_CONTAINED" : "AGENT_ADMISSION_FAILED_UNCONTAINED",
      payload: { launch_effect_id: launchEffectId, failure_code: code, revocation_epoch: fence.revocation_epoch },
    }],
  });
  return { failure_id: failureId, fence };
}

export function createAgentLauncher({ gateway, store, registryProvider, observationVerifier, containment, clock = () => new Date().toISOString(), idFactory = randomUUID }) {
  if (!gateway || typeof gateway.execute !== "function") throw new Error("AGENT_AUTHORITY_GATEWAY_REQUIRED");
  if (!store || typeof store.commit !== "function" || typeof store.fence !== "function" || typeof store.get !== "function" || !Number.isSafeInteger(store.revocation_epoch)) throw new Error("AGENT_STORE_REQUIRED");
  if (typeof registryProvider !== "function") throw new Error("AGENT_PROVIDER_REGISTRY_REQUIRED");
  const verifier = requireIndependentVerifier(observationVerifier);
  if (!containment || typeof containment.quarantineOrTerminate !== "function") throw new Error("AGENT_CONTAINMENT_ACTION_REQUIRED");

  async function stopLaunched({ intent, grant, authorityBindings, launch, code }) {
    let contained;
    try {
      contained = await containment.quarantineOrTerminate({ intent: structuredClone(intent), launch: structuredClone(launch), reason: code });
    } catch {
      contained = { contained: false, action: "failed", fingerprint: digest({ intent_id: intent.intent_id, code, contained: false }) };
    }
    if (!contained || typeof contained !== "object" || !new Set(["quarantine", "terminate", "failed"]).has(contained.action) || typeof contained.fingerprint !== "string") {
      contained = { contained: false, action: "failed", fingerprint: digest({ intent_id: intent.intent_id, code, invalid_result: true }) };
    }
    const persisted = persistAdmissionFailure({ store, intent, grant, authorityBindings, launchEffectId: launch.effect_id, code, containment: contained });
    if (contained.contained !== true || !new Set(["quarantine", "terminate"]).has(contained.action)) {
      const error = new Error("AGENT_CONTAINMENT_UNCONFIRMED");
      error.failure_id = persisted.failure_id;
      error.fence = persisted.fence;
      throw error;
    }
    return { decision: "STOP", code, intent, launch_effect_id: launch.effect_id, containment: contained, failure_id: persisted.failure_id, fence: persisted.fence };
  }

  return {
    async launch({ grant, selection, context, reservation, targets, authorityBindings, providerExecution, expectedSelector = {} }) {
      const launchTime = clock();
      const validatedGrant = validateDelegationGrant(grant, { now: launchTime });
      validateAgentAuthorityBindings(authorityBindings, launchTime, "AGENT_LAUNCH_AUTHORITY_BINDINGS_REQUIRED");
      assertCurrentAuthorityEpoch(store, authorityBindings, "AGENT_LAUNCH_AUTHORITY_EPOCH_STALE");
      const normalizedTargets = normalizePathSet(targets, "AGENT_LAUNCH_TARGETS_REQUIRED");
      if (normalizedTargets.length === 0
        || normalizedTargets.some((target) => !validatedGrant.scope.paths.some((scopePath) => pathContains(scopePath, target)))
        || (validatedGrant.ownership.read_only === false && normalizedTargets.some((target) => !validatedGrant.ownership.paths.some((ownedPath) => pathContains(ownedPath, target))))) throw new Error("AGENT_LAUNCH_TARGETS_OUTSIDE_GRANT");
      if (!providerExecution || typeof providerExecution !== "object" || typeof providerExecution.identity_key !== "string" || providerExecution.plan?.fingerprint !== providerExecution.plan_fingerprint) throw new Error("AGENT_PROVIDER_EXECUTION_REQUIRED");
      const persistedChain = resolvePersistedGrantChain(store, validatedGrant, launchTime, authorityBindings.authority_epoch);
      const persistedGrant = persistedChain.at(-1);
      const expectedPlanSandbox = { read_only: "read-only", workspace_write: "workspace-write" }[persistedGrant.payload.sandbox.mode];
      if (providerExecution.plan.sandbox !== expectedPlanSandbox) throw new Error("AGENT_PROVIDER_PLAN_SANDBOX_OUTSIDE_GRANT");
      if (typeof store.repository_root !== "string" || !path.isAbsolute(store.repository_root) || !path.isAbsolute(providerExecution.plan.working_directory) || path.resolve(providerExecution.plan.working_directory) !== path.resolve(store.repository_root)) throw new Error("AGENT_PROVIDER_PLAN_WORKING_DIRECTORY_OUTSIDE_REPOSITORY");
      if (selection?.decision !== "PASS" || selection.selected !== selection.effective || providerExecution.identity_key !== selection.effective) throw new Error("AGENT_PROVIDER_SELECTION_BINDING_INVALID");
      const { fingerprint: selectionFingerprint, ...selectionCore } = selection;
      if (!/^[a-f0-9]{64}$/.test(selectionFingerprint ?? "") || digest(selectionCore) !== selectionFingerprint) throw new Error("AGENT_PROVIDER_SELECTION_FINGERPRINT_INVALID");
      const registry = registryProvider();
      if (!registry || typeof registry.fingerprint !== "string" || providerExecution.registry_fingerprint !== registry.fingerprint) throw new Error("AGENT_PROVIDER_REGISTRY_BINDING_INVALID");
      const registryEntry = registry.entries?.find((entry) => entry.eligible === true && entry.manifest?.identity_key === selection.effective);
      if (!registryEntry || providerExecution.manifest_fingerprint !== digest(registryEntry.manifest) || providerExecution.certification_fingerprint !== digest(registryEntry.certification)) throw new Error("AGENT_PROVIDER_CURRENT_CERTIFICATION_INVALID");
      if (!selection.selection_lineage?.some((entry) => entry.identity_key === selection.effective && entry.eligible === true && entry.registry_fingerprint === registry.fingerprint)) throw new Error("AGENT_PROVIDER_SELECTION_LINEAGE_INVALID");
      const reservationRecord = store.get({ id: reservation?.reservation_id });
      if (reservationRecord?.kind !== "ResourceCostReservation" || reservationRecord.lifecycle_state !== "AUTHORIZED" || reservationRecord.policy_fp !== authorityBindings.policy_fingerprint || Date.parse(reservationRecord.fresh_until) < Date.parse(launchTime) || reservationRecord.payload?.purpose !== "launch" || reservationRecord.payload?.grant_fingerprint !== validatedGrant.fingerprint || reservationRecord.payload?.child_agent_id !== validatedGrant.child_agent_id || reservationRecord.payload?.authority_epoch !== authorityBindings.authority_epoch || reservationRecord.payload?.consumed !== false || typeof reservationRecord.payload?.authority_proof_fingerprint !== "string" || digest(reservationRecord.payload.targets) !== digest(normalizedTargets)) throw new Error("AGENT_LAUNCH_RESERVATION_INVALID");
      for (const field of ["max_runtime_ms", "max_tokens", "max_cost", "max_retries"]) if (reservationRecord.payload.budget[field] > validatedGrant.budget[field]) throw new Error(`AGENT_LAUNCH_RESERVATION_EXCEEDS_GRANT:${field}`);
      if (store.get({ id: `resource-reservation-consumption-${reservation.reservation_id}` })) throw new Error("AGENT_LAUNCH_RESERVATION_SPENT");
      const intentId = `launch-${idFactory()}`;
      const intent = createLaunchIntent({ grant: validatedGrant, selection, context, reservation, targets: normalizedTargets, authorityEpoch: authorityBindings.authority_epoch, intentId, createdAt: launchTime });
      const selectionId = `agent-selection-${intentId}`;
      const contextId = `agent-context-${intentId}`;
      const budgetId = reservationRecord.id;
      const launchIntentId = `agent-launch-intent-${intentId}`;
      const selectionPayload = { ...structuredClone(selection), fingerprint: selection.fingerprint ?? digest(selection) };
      const contextPayload = { ...structuredClone(context), fingerprint: context.fingerprint ?? digest(context) };
      const recordBase = { schema_version: "1.0.0", record_revision: 1, authority_scope: authorityBindings.task_id, lineage_id: intentId, lifecycle_state: "PREPARED", source_revision: validatedGrant.fingerprint, policy_fp: authorityBindings.policy_fingerprint };
      store.commit({
        expectedRevision: store.revision,
        authorityEpoch: authorityBindings.authority_epoch,
        records: [
          { ...recordBase, id: selectionId, kind: "AgentSelectionDecision", payload: selectionPayload, input_fp: selectionPayload.fingerprint },
          { ...recordBase, id: contextId, kind: "AgentContextSnapshot", payload: contextPayload, input_fp: contextPayload.fingerprint },
          { ...recordBase, id: launchIntentId, kind: "AgentLaunchIntent", payload: { ...intent, grant_record_id: persistedGrant.id, selection_record_id: selectionId, context_record_id: contextId, budget_record_id: budgetId, registry_fingerprint: registry.fingerprint, provider_identity_key: providerExecution.identity_key, provider_plan_fingerprint: providerExecution.plan_fingerprint, provider_plan_sandbox: providerExecution.plan.sandbox, provider_plan_working_directory: providerExecution.plan.working_directory }, input_fp: intent.fingerprint },
          { ...recordBase, id: `resource-reservation-consumption-${reservation.reservation_id}`, kind: "ResourceCostReservationConsumption", lineage_id: reservation.reservation_id, lifecycle_state: "CONSUMED", payload: { reservation_id: reservation.reservation_id, purpose: "launch", child_agent_id: validatedGrant.child_agent_id, launch_intent_id: intentId, authority_epoch: authorityBindings.authority_epoch, consumed_at: launchTime }, source_revision: reservationRecord.content_fp, input_fp: intent.fingerprint }
        ],
        events: [{ event_id: `event-${launchIntentId}`, aggregate_id: launchIntentId, event_type: "AGENT_LAUNCH_INTENT_PREPARED", payload: { intent_id: intentId, grant_record_id: persistedGrant.id, selection_record_id: selectionId, context_record_id: contextId, budget_record_id: budgetId, provider_plan_fingerprint: providerExecution.plan_fingerprint } }]
      });
      const persistedInputs = [selectionId, contextId, launchIntentId, `resource-reservation-consumption-${reservation.reservation_id}`].map((id) => store.get({ id }));
      if (persistedInputs.some((record) => !record) || persistedInputs[0].payload.fingerprint !== selectionPayload.fingerprint || persistedInputs[1].payload.fingerprint !== contextPayload.fingerprint || persistedInputs[2].payload.fingerprint !== intent.fingerprint || persistedInputs[3].lifecycle_state !== "CONSUMED") throw new Error("AGENT_LAUNCH_PREPARATION_NOT_DURABLE");
      const launchSubject = {
        grant_fingerprint: validatedGrant.fingerprint,
        launch_intent_fingerprint: intent.fingerprint,
        parent_agent_id: validatedGrant.parent_agent_id,
        parent_role: validatedGrant.parent_role,
        requested_configuration_fingerprint: digest(selection.requested),
        selected_configuration_fingerprint: digest(selection.selected),
        effective_configuration_fingerprint: digest(selection.effective),
        actual_observed: null,
        context_fingerprint: context.fingerprint,
        budget_reservation_id: reservation.reservation_id,
        sandbox_fingerprint: digest(validatedGrant.sandbox),
        capability_fingerprint: digest(validatedGrant.capabilities),
        authority_epoch: authorityBindings.authority_epoch,
        owned_targets: normalizedTargets
      };
      const launch = await gateway.execute({ variant: "agent_launch", action: "spawn", subject: launchSubject, bindings: authorityBindings, target: { targets: normalizedTargets }, request: { intent, provider_execution: structuredClone(providerExecution) }, expected_selector: expectedSelector });
      try {
        assertCurrentAuthorityEpoch(store, authorityBindings, "AGENT_LAUNCH_AUTHORITY_EPOCH_STALE_AFTER_SPAWN");
      } catch {
        return stopLaunched({ intent, grant: validatedGrant, authorityBindings, launch, code: "AGENT_LAUNCH_AUTHORITY_EPOCH_STALE_AFTER_SPAWN" });
      }
      const actualObserved = launch.result?.actual_observed;
      const observationProof = launch.result?.observation_proof;
      let admission;
      try {
        admission = admitAgentRun({ intent, grant: validatedGrant, actualObserved, observationProof, verifier, admittedAt: clock() });
      } catch (error) {
        return stopLaunched({ intent, grant: validatedGrant, authorityBindings, launch, code: error?.message ?? "ACTUAL_OBSERVATION_INVALID" });
      }
      if (admission.decision !== "PASS") return stopLaunched({ intent, grant: validatedGrant, authorityBindings, launch, code: admission.code });
      let admissionEffect;
      try {
        const observed = admission.attestation.actual_observed;
        admissionEffect = await gateway.execute({ variant: "agent_run_admission", action: "admit", subject: { launch_decision_fingerprint: launch.decision?.fingerprint ?? launch.effect_key, process_identity_fingerprint: digest(observed.process_identity), configuration_attestation_fingerprint: admission.attestation.fingerprint, actual_sandbox_fingerprint: digest(observed.sandbox), actual_capability_fingerprint: digest(observed.capabilities), actual_targets_fingerprint: digest(observed.targets), observation_proof_fingerprint: admission.attestation.observation_proof_fingerprint, admission_result: "admit" }, bindings: { ...authorityBindings, target_id: intentId }, target: { run: intentId }, request: { attestation_fingerprint: admission.attestation.fingerprint }, expected_selector: { admitted: true }, effect_key: digest({ intent: intent.fingerprint, attestation: admission.attestation.fingerprint }) });
      } catch {
        return stopLaunched({ intent, grant: validatedGrant, authorityBindings, launch, code: "AGENT_ADMISSION_AUTHORITY_FAILED" });
      }
      if (admissionEffect.decision?.decision !== "ALLOW" || typeof admissionEffect.receipt_id !== "string") return stopLaunched({ intent, grant: validatedGrant, authorityBindings, launch, code: admissionEffect.decision?.code ?? "AGENT_ADMISSION_RECEIPT_REQUIRED" });
      try {
        assertCurrentAuthorityEpoch(store, authorityBindings, "AGENT_LAUNCH_AUTHORITY_EPOCH_STALE_AFTER_ADMISSION");
      } catch {
        return stopLaunched({ intent, grant: validatedGrant, authorityBindings, launch, code: "AGENT_LAUNCH_AUTHORITY_EPOCH_STALE_AFTER_ADMISSION" });
      }
      const runId = `run-${idFactory()}`;
      const stateHistory = ["PLANNED", "AUTHORIZED", "STARTING", "RUNNING"];
      store.commit({ expectedRevision: store.revision, authorityEpoch: authorityBindings.authority_epoch, records: [{ id: runId, kind: "AgentRun", schema_version: "1.0.0", authority_scope: authorityBindings.task_id, lineage_id: intentId, lifecycle_state: "RUNNING", payload: { intent_id: intentId, parent_agent_id: validatedGrant.parent_agent_id, child_agent_id: validatedGrant.child_agent_id, depth: validatedGrant.child_depth, authority_epoch: authorityBindings.authority_epoch, attestation_fingerprint: admission.attestation.fingerprint, admission_effect_id: admissionEffect.effect_id, admission_receipt_id: admissionEffect.receipt_id, ownership: validatedGrant.ownership, state_history: stateHistory, actual_observed: admission.attestation.actual_observed }, source_revision: validatedGrant.fingerprint, policy_fp: authorityBindings.policy_fingerprint, input_fp: intent.fingerprint }], events: stateHistory.map((state, index) => ({ event_id: `event-${runId}-${index + 1}`, aggregate_id: runId, event_type: `AGENT_RUN_${state}`, authority_decision_id: state === "AUTHORIZED" || state === "RUNNING" ? admissionEffect.decision.fingerprint : null, payload: { launch_effect_id: launch.effect_id, admission_effect_id: admissionEffect.effect_id, admission_receipt_id: admissionEffect.receipt_id, state } })) });
      return { decision: "PASS", run_id: runId, state: "RUNNING", intent, attestation: admission.attestation, launch_effect_id: launch.effect_id, admission_effect_id: admissionEffect.effect_id, admission_receipt_id: admissionEffect.receipt_id, admission_decision: admissionEffect.decision };
    }
  };
}

export function teamDigest(value) {
  return digest(value);
}
