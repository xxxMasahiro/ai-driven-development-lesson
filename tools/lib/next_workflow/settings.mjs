import { createHash, randomUUID } from "node:crypto";
import { isAuthorityDecisionAllowed } from "./authority.mjs";
import { selectAgentConfiguration } from "./providers.mjs";

const SCOPES = ["agent", "role", "team", "repository", "context", "global"];
const MODEL_POLICY_FIELDS = ["allowed_model_ids", "denied_model_ids", "allowed_model_publishers", "denied_model_publishers", "denied_model_prefixes"];

function canonicalJson(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(",")}}`;
  return JSON.stringify(value);
}

function digest(value) {
  return createHash("sha256").update(canonicalJson(value)).digest("hex");
}

function tokenHash(token) {
  if (typeof token !== "string" || !token.startsWith("settings-plan-") || token.length < 30) throw new Error("SETTINGS_TOKEN_INVALID");
  return createHash("sha256").update(token).digest("hex");
}

function validateSettings(settings) {
  if (!settings || settings.schema_version !== "1.0.0" || !Number.isInteger(settings.revision) || !Array.isArray(settings.values)) throw new Error("AGENT_SETTINGS_INVALID");
  const keys = new Set();
  for (const entry of settings.values) {
    if (!SCOPES.includes(entry.scope) || typeof entry.subject_id !== "string" || !new Set(["auto", "manual", "inherit"]).has(entry.mode)) throw new Error("AGENT_SETTING_ENTRY_INVALID");
    const key = `${entry.scope}:${entry.subject_id}`;
    if (keys.has(key)) throw new Error("AGENT_SETTING_KEY_DUPLICATE");
    keys.add(key);
    if (entry.mode === "manual" && typeof entry.identity_key !== "string") throw new Error("MANUAL_SELECTION_IDENTITY_REQUIRED");
    if (entry.mode !== "manual" && entry.identity_key !== null) throw new Error("NON_MANUAL_IDENTITY_FORBIDDEN");
    for (const field of MODEL_POLICY_FIELDS) if (entry.model_policy?.[field] !== undefined && (!Array.isArray(entry.model_policy[field]) || entry.model_policy[field].some((value) => typeof value !== "string" || value.length === 0))) throw new Error("MODEL_SELECTION_POLICY_INVALID");
  }
  return settings;
}

function requireFingerprint(value, code) {
  if (typeof value !== "string" || value.length === 0) throw new Error(code);
  return value;
}

function registrySemanticFingerprint(registry) {
  const { fingerprint: ignoredFingerprint, observed_at: ignoredObservedAt, ...semantic } = registry ?? {};
  return digest(semantic);
}

function authoritySemanticFingerprint(authority) {
  const { fingerprint: ignoredFingerprint, issued_at: ignoredIssuedAt, ...semantic } = authority ?? {};
  return digest(semantic);
}

function validateIntent(intent, subjectCatalog) {
  if (!intent || !SCOPES.includes(intent.scope) || typeof intent.subject_id !== "string" || intent.subject_id.length === 0) throw new Error("SETTINGS_CHANGE_INVALID");
  if (!subjectCatalog.some((choice) => choice.scope === intent.scope && choice.subject_id === intent.subject_id)) throw new Error("SETTINGS_SUBJECT_NOT_FOUND");
  if (intent.operation === "delete") return intent;
  if (intent.operation !== "set" || !new Set(["auto", "manual", "inherit"]).has(intent.entry?.mode)) throw new Error("SETTINGS_CHANGE_INVALID");
  if (intent.entry.scope !== intent.scope || intent.entry.subject_id !== intent.subject_id) throw new Error("SETTINGS_CHANGE_KEY_MISMATCH");
  if (intent.entry.mode === "manual" && typeof intent.entry.identity_key !== "string") throw new Error("MANUAL_SELECTION_IDENTITY_REQUIRED");
  if (intent.entry.mode !== "manual" && intent.entry.identity_key !== null) throw new Error("NON_MANUAL_IDENTITY_FORBIDDEN");
  return intent;
}

function subjectForScope(agent, scope) {
  if (scope === "global") return "default";
  return agent?.[`${scope}_id`] ?? null;
}

export function buildSettingsSubjectCatalog(agents) {
  if (!Array.isArray(agents)) throw new Error("SETTINGS_TEAM_INVALID");
  const choices = [];
  for (const scope of SCOPES) {
    const subjects = scope === "global"
      ? ["default"]
      : [...new Set(agents.map((agent) => subjectForScope(agent, scope)).filter((value) => typeof value === "string" && value.length > 0))].sort();
    for (const subjectId of subjects) {
      choices.push({
        key: `${scope}:${subjectId}`,
        scope,
        subject_id: subjectId,
        label: scope === "global" ? "Global default" : `${scope}: ${subjectId}`,
      });
    }
  }
  return choices;
}

export function resolveAgentSelectionPolicy(settings, agent) {
  const trace = [];
  for (const scope of SCOPES) {
    const subjectId = subjectForScope(agent, scope);
    const entry = subjectId === null ? null : settings.values.find((value) => value.scope === scope && value.subject_id === subjectId) ?? null;
    trace.push({ scope, subject_id: subjectId, state: entry === null ? "absent" : entry.mode === "inherit" ? "inherit" : "selected_source" });
    if (entry === null || entry.mode === "inherit") continue;
    return { decision: "PASS", policy: { mode: entry.mode, identity_key: entry.identity_key, model_policy: structuredClone(entry.model_policy ?? {}) }, source: entry, trace };
  }
  return { decision: "STOP", code: "NO_INHERITED_SELECTION", trace };
}

function evaluateAffectedAgents({ settings, registry, authority, agents, authorityEvaluator = isAuthorityDecisionAllowed }) {
  const blockers = [];
  const evaluations = [];
  for (const agent of agents) {
    const resolved = resolveAgentSelectionPolicy(settings, agent);
    if (resolved.decision !== "PASS") {
      blockers.push(resolved.code);
      evaluations.push({ agent_id: agent.agent_id, decision: "STOP", code: resolved.code, source: null, selected: null, effective: null, blockers: [resolved.code], inheritance_trace: resolved.trace });
      continue;
    }
    const selected = selectAgentConfiguration({
      registry,
      policy: resolved.policy,
      authority,
      requirements: agent.requirements ?? {},
      budget: agent.budget ?? {},
    });
    if (selected.decision !== "PASS") blockers.push(selected.code, ...(selected.blockers ?? []));
    evaluations.push({
      agent_id: agent.agent_id,
      decision: selected.decision,
      code: selected.code ?? null,
      source: { scope: resolved.source.scope, subject_id: resolved.source.subject_id, mode: resolved.source.mode },
      requested: selected.requested ?? resolved.policy.mode,
      selected: selected.selected ?? null,
      effective: selected.effective ?? null,
      blockers: [...new Set([selected.code, ...(selected.blockers ?? [])].filter(Boolean))].sort(),
      inheritance_trace: resolved.trace,
      requirements_fingerprint: digest(agent.requirements ?? {}),
      budget_fingerprint: digest(agent.budget ?? {}),
    });
  }
  if (authorityEvaluator(authority) !== true) blockers.push("AUTHORITY_DENIED");
  return { blockers: [...new Set(blockers.filter(Boolean))].sort(), evaluations: evaluations.sort((left, right) => left.agent_id.localeCompare(right.agent_id)) };
}

function planPresentation({ intent, baseRevision, targetRevision, affected, evaluations, blockers, planFingerprint = null }) {
  const affectedTeamIds = [...new Set(affected.map((agent) => agent.team_id).filter(Boolean))].sort();
  const inheritanceTrace = evaluations.flatMap((evaluation) => (evaluation.inheritance_trace ?? []).map((entry) => ({ agent_id: evaluation.agent_id, ...entry })));
  const revisionConsequence = (revision) => ({ settings_revision: revision, status: "requires_launch_evaluation" });
  return {
    requested_change: { operation: intent.operation, scope: intent.scope, subject_id: intent.subject_id, mode: intent.entry?.mode ?? null, identity_key: intent.entry?.identity_key ?? null },
    inheritance_trace: inheritanceTrace,
    affected_team: { team_ids: affectedTeamIds, scope: intent.scope, subject_id: intent.subject_id },
    before_after_authority: { before: { settings_revision: baseRevision, grants_authority: false }, after: { settings_revision: targetRevision, grants_authority: false } },
    before_after_capability: { before: revisionConsequence(baseRevision), after: revisionConsequence(targetRevision) },
    before_after_cost: { before: { settings_revision: baseRevision, reservation_authority: "not_granted" }, after: { settings_revision: targetRevision, reservation_authority: "not_granted" } },
    before_after_network: { before: { settings_revision: baseRevision, network_authority: "not_granted" }, after: { settings_revision: targetRevision, network_authority: "not_granted" } },
    eligibility: { decision: blockers.length ? "BLOCKED" : "PASS", blockers },
    fingerprint: planFingerprint,
  };
}

export function createAgentSelectionSettingsManager({ store, defaults, registryProvider, authorityProvider, authorityEvaluator = isAuthorityDecisionAllowed, teamProvider = () => [], clock = () => new Date().toISOString(), ttlMs = 300000, idFactory = randomUUID }) {
  validateSettings(defaults);
  if (!store || !registryProvider || !authorityProvider || typeof authorityEvaluator !== "function" || typeof idFactory !== "function") throw new Error("SETTINGS_MANAGER_DEPENDENCY_REQUIRED");
  if (!Number.isSafeInteger(ttlMs) || ttlMs <= 0) throw new Error("SETTINGS_PLAN_TTL_INVALID");
  function current() {
    const rows = store.query({ kind: "AgentSelectionSettings", limit: 1000 }).records;
    if (rows.length === 0) return structuredClone(defaults);
    return structuredClone(rows.sort((a, b) => b.record_revision - a.record_revision)[0].payload);
  }
  function catalog() {
    const settings = current();
    const registry = registryProvider();
    const team = teamProvider();
    return { settings, registry_fingerprint: registry.fingerprint, eligible_entries: registry.entries.filter((entry) => entry.eligible).map((entry) => entry.manifest.identity_key), scopes: SCOPES, subjects: buildSettingsSubjectCatalog(team), team_fingerprint: digest(team) };
  }
  function computePlan({ intent, before, registry, authority, team, issuedAt, expiresAt }) {
    const subjectCatalog = buildSettingsSubjectCatalog(team);
    validateIntent(intent, subjectCatalog);
    const after = structuredClone(before);
    after.revision += 1;
    const index = after.values.findIndex((entry) => entry.scope === intent.scope && entry.subject_id === intent.subject_id);
    const beforeEntry = index >= 0 ? structuredClone(after.values[index]) : null;
    if (intent.operation === "delete") {
      if (index >= 0) after.values.splice(index, 1);
    } else if (index >= 0) after.values[index] = structuredClone(intent.entry);
    else after.values.push(structuredClone(intent.entry));
    after.values.sort((a, b) => `${a.scope}:${a.subject_id}`.localeCompare(`${b.scope}:${b.subject_id}`));
    validateSettings(after);
    const affected = team.filter((agent) => intent.scope === "global" || agent[`${intent.scope}_id`] === intent.subject_id);
    if (affected.length === 0) throw new Error("SETTINGS_SUBJECT_NOT_FOUND");
    const affectedAgents = affected.map((agent) => agent.agent_id).sort();
    const evaluation = evaluateAffectedAgents({ settings: after, registry, authority, agents: affected, authorityEvaluator });
    const blockers = evaluation.blockers;
    if (authorityEvaluator(authority) !== true && !blockers.includes("AUTHORITY_DENIED")) blockers.push("AUTHORITY_DENIED");
    const change = { scope: intent.scope, subject_id: intent.subject_id, before_entry: beforeEntry, after_entry: intent.operation === "delete" ? null : structuredClone(intent.entry) };
    const planCore = { schema_version: "1.0.0", base_revision: before.revision, target_revision: after.revision, intent: structuredClone(intent), before, after, change, registry_fingerprint: requireFingerprint(registry.fingerprint, "SETTINGS_REGISTRY_FINGERPRINT_REQUIRED"), registry_semantic_fingerprint: registrySemanticFingerprint(registry), authority_fingerprint: requireFingerprint(authority.fingerprint, "SETTINGS_AUTHORITY_FINGERPRINT_REQUIRED"), authority_semantic_fingerprint: authoritySemanticFingerprint(authority), team_fingerprint: digest(team), subject_catalog_fingerprint: digest(subjectCatalog), affected_agents: affectedAgents, agent_evaluations: evaluation.evaluations, blockers: [...new Set(blockers)].sort(), issued_at: issuedAt, expires_at: expiresAt, grants_authority: false };
    const plan = { ...planCore, ...planPresentation({ intent, baseRevision: before.revision, targetRevision: after.revision, affected, evaluations: evaluation.evaluations, blockers: planCore.blockers }) };
    const planFingerprint = digest(plan);
    return { ...plan, fingerprint: planFingerprint, plan_fingerprint: planFingerprint };
  }

  function persistPlan({ intent, expectedRevision }) {
    const before = current();
    if (before.revision !== expectedRevision) throw new Error("SETTINGS_REVISION_CONFLICT");
    const issuedAt = clock();
    const issuedTimestamp = Date.parse(issuedAt);
    if (!Number.isFinite(issuedTimestamp)) throw new Error("SETTINGS_PLAN_TIME_INVALID");
    const expiresAt = new Date(issuedTimestamp + ttlMs).toISOString();
    const evaluationContext = { issuedAt: new Date(issuedTimestamp).toISOString(), expiresAt, settingsRevision: before.revision };
    const registry = registryProvider(evaluationContext);
    const authority = authorityProvider(evaluationContext);
    const team = teamProvider();
    const plan = computePlan({ intent, before, registry, authority, team, issuedAt: new Date(issuedTimestamp).toISOString(), expiresAt });
    const token = `settings-plan-${idFactory()}`;
    const hash = tokenHash(token);
    store.commit({ expectedRevision: store.revision, settingsPlan: { token_hash: hash, plan_fingerprint: plan.plan_fingerprint, plan, issued_at: plan.issued_at, expires_at: plan.expires_at } });
    return { ...plan, token };
  }

  function dryRun({ scope, subjectId, mode, identityKey = null, expectedRevision }) {
    const entry = { scope, subject_id: subjectId, mode, identity_key: identityKey, source: "control_center" };
    return persistPlan({ intent: { operation: "set", scope, subject_id: subjectId, entry }, expectedRevision });
  }

  function apply({ token, confirm }) {
    if (confirm !== true) throw new Error("SETTINGS_CONFIRMATION_REQUIRED");
    const hash = tokenHash(token);
    const stored = store.getSettingsChangePlan({ tokenHash: hash });
    if (!stored) throw new Error("SETTINGS_PLAN_NOT_FOUND");
    if (stored.state !== "pending") throw new Error("SETTINGS_PLAN_ALREADY_USED");
    const plan = stored.plan;
    const { plan_fingerprint: claimedFingerprint, fingerprint: claimedDisplayFingerprint, ...planBody } = plan;
    if (claimedFingerprint !== claimedDisplayFingerprint || claimedFingerprint !== digest({ ...planBody, fingerprint: null }) || stored.plan_fingerprint !== claimedFingerprint) throw new Error("SETTINGS_PLAN_STORAGE_TAMPERED");
    const before = current();
    if (before.revision !== plan.base_revision) throw new Error("SETTINGS_REVISION_CONFLICT");
    const appliedAt = clock();
    const appliedTimestamp = Date.parse(appliedAt);
    if (!Number.isFinite(appliedTimestamp)) throw new Error("SETTINGS_PLAN_TIME_INVALID");
    if (!Number.isFinite(Date.parse(plan.expires_at)) || Date.parse(plan.expires_at) < appliedTimestamp) throw new Error("SETTINGS_PLAN_EXPIRED");
    const evaluationContext = { issuedAt: new Date(appliedTimestamp).toISOString(), planIssuedAt: plan.issued_at, expiresAt: plan.expires_at, settingsRevision: before.revision };
    const registry = registryProvider(evaluationContext);
    const authority = authorityProvider(evaluationContext);
    const team = teamProvider();
    if (plan.blockers.length) throw new Error(`SETTINGS_PLAN_BLOCKED:${plan.blockers.join(",")}`);
    if (authorityEvaluator(authority) !== true || digest(team) !== plan.team_fingerprint || digest(buildSettingsSubjectCatalog(team)) !== plan.subject_catalog_fingerprint) throw new Error("SETTINGS_AUTHORITY_REGISTRY_OR_TEAM_DRIFT");
    const affected = team.filter((agent) => plan.intent.scope === "global" || agent[`${plan.intent.scope}_id`] === plan.intent.subject_id);
    const liveEvaluation = evaluateAffectedAgents({ settings: plan.after, registry, authority, agents: affected, authorityEvaluator });
    if (liveEvaluation.blockers.length) throw new Error(`SETTINGS_PLAN_LIVE_BLOCKED:${liveEvaluation.blockers.join(",")}`);
    if (registrySemanticFingerprint(registry) !== plan.registry_semantic_fingerprint || authoritySemanticFingerprint(authority) !== plan.authority_semantic_fingerprint) throw new Error("SETTINGS_AUTHORITY_REGISTRY_OR_TEAM_DRIFT");
    const receiptId = `settings-receipt-${plan.plan_fingerprint.slice(0, 24)}`;
    store.commit({ expectedRevision: store.revision, settingsPlanUse: { token_hash: hash, used_at: new Date(appliedTimestamp).toISOString() }, records: [{ id: `agent-settings-${plan.target_revision}`, kind: "AgentSelectionSettings", schema_version: "1.0.0", record_revision: plan.target_revision, authority_scope: "control_center", lineage_id: "agent-selection-settings", lifecycle_state: "applied", payload: plan.after, source_revision: String(plan.base_revision), policy_fp: authority.fingerprint, input_fp: plan.plan_fingerprint }], events: [{ event_id: receiptId, aggregate_id: `agent-settings-${plan.target_revision}`, event_type: "AGENT_SELECTION_SETTINGS_APPLIED", authority_decision_id: authority.fingerprint, payload: { receipt_id: receiptId, prior_revision: plan.base_revision, revision: plan.target_revision, affected_agents: plan.affected_agents, agent_evaluations: plan.agent_evaluations, team_fingerprint: plan.team_fingerprint, subject_catalog_fingerprint: plan.subject_catalog_fingerprint, settings_before: plan.before, settings_after: plan.after, change: plan.change, plan_fingerprint: plan.plan_fingerprint } }] });
    return { status: "passed", receipt_id: receiptId, prior_revision: plan.base_revision, revision: plan.target_revision, settings: plan.after, settings_before: plan.before, change: plan.change, guarded_revert_eligible: true, applied_at: new Date(appliedTimestamp).toISOString() };
  }
  function revert({ receipt, expectedRevision }) {
    const receiptId = typeof receipt === "string" ? receipt : receipt?.receipt_id;
    const event = store.getEvent(receiptId);
    if (!event || event.event_type !== "AGENT_SELECTION_SETTINGS_APPLIED" || event.payload?.receipt_id !== receiptId) throw new Error("SETTINGS_REVERT_RECEIPT_NOT_FOUND");
    if (event.payload.revision !== expectedRevision) throw new Error("SETTINGS_REVERT_NOT_ELIGIBLE");
    const currentSettings = current();
    if (currentSettings.revision !== expectedRevision) throw new Error("SETTINGS_REVISION_CONFLICT");
    const change = event.payload.change;
    if (!change || !SCOPES.includes(change.scope) || typeof change.subject_id !== "string") throw new Error("SETTINGS_REVERT_CHANGE_REQUIRED");
    const currentEntry = currentSettings.values.find((entry) => entry.scope === change.scope && entry.subject_id === change.subject_id) ?? null;
    if (canonicalJson(currentEntry) !== canonicalJson(change.after_entry)) throw new Error("SETTINGS_REVERT_TARGET_DRIFT");
    const intent = change.before_entry === null
      ? { operation: "delete", scope: change.scope, subject_id: change.subject_id }
      : { operation: "set", scope: change.scope, subject_id: change.subject_id, entry: structuredClone(change.before_entry) };
    return persistPlan({ intent, expectedRevision });
  }
  function revertDryRun({ receiptId, expectedRevision }) {
    const event = store.getEvent(receiptId);
    if (!event || event.event_type !== "AGENT_SELECTION_SETTINGS_APPLIED" || event.payload?.receipt_id !== receiptId) throw new Error("SETTINGS_REVERT_RECEIPT_NOT_FOUND");
    return revert({ receipt: receiptId, expectedRevision });
  }
  return { catalog, current, dryRun, apply, revert, revertDryRun };
}

export function decodeSettingsPlanToken(token) {
  tokenHash(token);
  return { opaque: true };
}
