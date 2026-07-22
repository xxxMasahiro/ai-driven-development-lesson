import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { loadContracts, validateContractSet } from "./contracts.mjs";
import { assertNoSecretMaterial } from "./secret_policy.mjs";

const PROHIBITED = /(^|_)(raw_payload|absolute_path|command)($|_)/i;
const ACTIVATION_MODES = new Set(["planned", "shadow", "release_verified", "recovery_verified", "rollback_verified", "archive_decommission_verified", "ready", "enforced", "rolled_back", "manual_recovery_required"]);
const REQUIRED_RELEASE_PROOFS = new Set(["local_release", "pr_ci", "main_ci", "local_remote_sync", "recovery", "fenced_rollback", "archive_decommission", "outbox_disposition"]);
const ENFORCEMENT_TRANSITION_ORDER = ["shadow", "release_verified", "recovery_verified", "rollback_verified", "archive_decommission_verified", "ready", "enforced"];

function canonicalJson(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(",")}}`;
  return JSON.stringify(value);
}

function digest(value) {
  return createHash("sha256").update(canonicalJson(value)).digest("hex");
}

function rejectProhibited(value, path = "projection") {
  if (path === "projection") assertNoSecretMaterial(value, "PROJECTION_SECRET_MATERIAL_FORBIDDEN");
  if (Array.isArray(value)) return value.forEach((item, index) => rejectProhibited(item, `${path}[${index}]`));
  if (!value || typeof value !== "object") return;
  for (const [key, child] of Object.entries(value)) {
    if (PROHIBITED.test(key)) throw new Error(`PROJECTION_PROHIBITED_FIELD:${path}.${key}`);
    rejectProhibited(child, `${path}.${key}`);
  }
}

export function permittedControlsForMode(mode, blockers = []) {
  if (blockers.length) return ["inspect", "refresh", "review_blockers", "settings_dry_run"];
  if (mode === "planned") return ["inspect", "refresh", "settings_dry_run", "settings_apply", "settings_revert"];
  if (mode === "shadow") return ["inspect", "refresh", "settings_dry_run", "settings_apply", "settings_revert", "compare_shadow", "verify_recovery"];
  if (["release_verified", "recovery_verified", "rollback_verified", "archive_decommission_verified", "ready"].includes(mode)) return ["inspect", "refresh", "review_release_evidence", "continue_ordered_activation"];
  if (mode === "enforced") return ["inspect", "refresh", "settings_dry_run", "settings_apply", "settings_revert", "launch_through_gateway"];
  if (mode === "rolled_back") return ["inspect", "refresh", "review_recovery"];
  return ["inspect", "refresh"];
}

export function validateActivationRecord(record) {
  if (!record || record.schema_version !== "1.0.0" || record.activation_id !== "next-development-workflow" || !Number.isInteger(record.revision) || record.revision < 1 || !ACTIVATION_MODES.has(record.mode) || !Array.isArray(record.evidence)) throw new Error("NEXT_WORKFLOW_ACTIVATION_INVALID");
  if (record.candidate_fingerprint !== null && !/^[a-f0-9]{64}$/.test(record.candidate_fingerprint)) throw new Error("NEXT_WORKFLOW_ACTIVATION_CANDIDATE_INVALID");
  const seen = new Set();
  for (const proof of record.evidence) {
    if (!proof || !REQUIRED_RELEASE_PROOFS.has(proof.kind) || seen.has(proof.kind) || proof.status !== "passed" || proof.candidate_fingerprint !== record.candidate_fingerprint || !/^[a-f0-9]{64}$/.test(proof.fingerprint ?? "")) throw new Error("NEXT_WORKFLOW_ACTIVATION_EVIDENCE_INVALID");
    seen.add(proof.kind);
  }
  if (record.mode === "enforced") {
    const proofSummary = record.proof_summary;
    const transitionModes = (record.transition_evidence ?? []).map((entry) => entry?.mode);
    if (!record.candidate_fingerprint
      || !Number.isSafeInteger(record.authority_epoch)
      || record.authority_epoch < 0
      || seen.size !== REQUIRED_RELEASE_PROOFS.size
      || record.correctness?.status !== "passed"
      || !/^[a-f0-9]{64}$/.test(record.correctness?.fingerprint ?? "")
      || !Number.isFinite(Date.parse(record.activated_at))
      || proofSummary?.status !== "passed"
      || proofSummary?.candidate_fingerprint !== record.candidate_fingerprint
      || !/^[a-f0-9]{64}$/.test(proofSummary?.fingerprint ?? "")
      || record.correctness.fingerprint !== proofSummary.fingerprint
      || !record.signed_release_proofs
      || !Array.isArray(record.signed_transition_proofs)
      || record.signed_transition_proofs.length !== ENFORCEMENT_TRANSITION_ORDER.length - 1
      || canonicalJson(transitionModes) !== canonicalJson(ENFORCEMENT_TRANSITION_ORDER)
      || (record.transition_evidence ?? []).some((entry) => !/^[a-f0-9]{64}$/.test(entry?.fingerprint ?? ""))) throw new Error("NEXT_WORKFLOW_ACTIVATION_PREMATURE");
  }
  if (record.mode === "rolled_back" && (!record.candidate_fingerprint || typeof record.activated_at !== "string")) throw new Error("NEXT_WORKFLOW_ROLLBACK_INVALID");
  if (record.mode !== "planned" && !record.candidate_fingerprint) throw new Error("NEXT_WORKFLOW_ACTIVATION_CANDIDATE_REQUIRED");
  if (["shadow", "release_verified", "recovery_verified", "rollback_verified", "archive_decommission_verified", "ready"].includes(record.mode) && (!Array.isArray(record.transition_evidence) || record.transition_evidence.length === 0)) throw new Error("NEXT_WORKFLOW_TRANSITION_EVIDENCE_REQUIRED");
  return record;
}

export function buildNextWorkflowProjection({ activation, lifecycle, rigor, authority, instruction, storeHealth, team, providerRegistry, selectionSettings, selectionDryRun, attestations = [], transaction, shadowMetrics, releaseEvidence, impact, progress, relationships = [], blockers = [], nextAction, evidenceFreshUntil }) {
  const mode = activation?.mode ?? "planned";
  if (!ACTIVATION_MODES.has(mode)) throw new Error("PROJECTION_ACTIVATION_MODE_INVALID");
  const normalizedBlockers = [...new Set(blockers)].sort();
  const projection = {
    schema_version: "1.0.0",
    activation: {
      mode,
      candidate_fingerprint: activation?.candidate_fingerprint ?? null,
      policy_revision: activation?.policy_revision ?? "1.0.0",
      registry_revision: providerRegistry?.revision ?? 0,
      evidence_fresh_until: evidenceFreshUntil ?? null,
      blockers: normalizedBlockers,
      permitted_controls: permittedControlsForMode(mode, normalizedBlockers)
    },
    lifecycle: lifecycle ?? { stage: "outcome_discovery", execution_phase: "context_triage", decision: "PASS" },
    rigor: rigor ?? { level: "L1", reason: "not_assessed", scores: {} },
    authority: authority ?? { decision: "legacy_authoritative", effective_git_authority: "unchanged", runtime_capability: "observed_only" },
    instruction: instruction ?? { source_state: "unresolved", profile: null, local_state: "unknown", fallback_state: "unknown" },
    store: storeHealth ?? { status: "not_initialized", integrity: "not_run", revision: 0, freshness: "unknown" },
    team: team ?? { topology: [], runs: [], delegations: [], budgets: {}, ownership: [], status: "not_started" },
    provider_registry: providerRegistry ?? { revision: 0, adapter_families: [], entries: [], custom_entries: [] },
    selection_settings: selectionSettings ?? { revision: 0, values: [], inheritance_order: ["agent", "role", "team", "repository", "context", "global"] },
    selection_dry_run: selectionDryRun ?? null,
    configuration_attestations: attestations,
    transaction: transaction ?? null,
    shadow_metrics: shadowMetrics ?? { status: "not_run", required_check_misses: null, authority_decision_parity: null, traceability_coverage: null, existing_feature_regressions: null },
    release_evidence: releaseEvidence ?? { status: "not_run", candidate_fingerprint: null, release: null, recovery: null, rollback: null, archive_decommission: null, outbox_disposition: null },
    impact: impact ?? { status: "not_planned", required_checks: [], blockers: [] },
    progress: progress ?? { accepted_weight: 0, total_weight: 20, percent: 0, basis: "current_verified_evidence_only" },
    relationships,
    blockers: normalizedBlockers,
    next_action: nextAction ?? "Complete focused implementation evidence before activation."
  };
  rejectProhibited(projection);
  return { ...projection, fingerprint: digest(projection) };
}

export function projectValidatedProviderRegistry({ document, runtimeRegistry }) {
  if (!document || !Number.isInteger(document.revision) || !Array.isArray(document.adapter_families) || !runtimeRegistry || !Array.isArray(runtimeRegistry.entries)) throw new Error("PROVIDER_REGISTRY_PROJECTION_INPUT_INVALID");
  const entries = runtimeRegistry.entries.map((entry) => ({
    manifest: {
      identity_key: entry.manifest.identity_key,
      identity: structuredClone(entry.manifest.identity),
      capabilities: [...entry.manifest.capabilities],
      native_reasoning_values: [...entry.manifest.native_reasoning_values],
      effort_mapping: { ...entry.manifest.effort_mapping },
    },
    certification: entry.certification === null ? null : {
      state: entry.certification.state,
      adapter_version: entry.certification.adapter_version,
      platform: entry.certification.platform,
      expires_at: entry.certification.expires_at,
    },
    eligible: entry.eligible === true,
    blockers: [...(entry.blockers ?? [])].sort(),
  }));
  const projected = {
    schema_version: "1.0.0",
    registry_id: document.registry_id,
    revision: document.revision,
    activation_mode: document.activation_mode,
    observed_at: runtimeRegistry.observed_at,
    adapter_families: document.adapter_families.map((family) => {
      const familyEntries = runtimeRegistry.entries.filter((entry) => entry.manifest.identity.execution_provider_id === family.execution_provider_id && entry.manifest.identity.model_publisher_id === family.model_publisher_id && entry.manifest.identity.agent_product_id === family.agent_product_id && entry.manifest.identity.adapter_id === family.adapter_id && entry.manifest.identity.transport_id === family.transport_id);
      const discoveryBlocker = (runtimeRegistry.discovery_blockers ?? []).find((blocker) => blocker.family_id === family.family_id);
      const observedEligible = familyEntries.some((entry) => entry.eligible === true);
      return {
        family_id: family.family_id,
        execution_provider_id: family.execution_provider_id,
        model_publisher_id: family.model_publisher_id,
        agent_product_id: family.agent_product_id,
        adapter_id: family.adapter_id,
        transport_id: family.transport_id,
        availability: observedEligible ? "observed" : discoveryBlocker ? "unavailable" : familyEntries.length ? "blocked" : family.availability,
        certification_state: observedEligible ? "CERTIFIED" : discoveryBlocker ? "UNAVAILABLE" : familyEntries[0]?.certification?.state ?? family.certification_state,
        discovery_blocker: discoveryBlocker?.code ?? null,
        discovered_models: familyEntries.length,
        eligible_models: familyEntries.filter((entry) => entry.eligible === true).length,
        model_catalog_source: family.model_catalog_source,
        capabilities: [...(family.capabilities ?? [])],
      };
    }),
    entries,
  };
  rejectProhibited(projected);
  return { ...projected, fingerprint: digest(projected) };
}

function queryAll(store, kind) {
  if (!store) return [];
  const records = [];
  let cursor = 0;
  do {
    const page = store.query({ kind, limit: 1000, cursor });
    records.push(...page.records);
    cursor = page.next_cursor;
  } while (cursor !== null);
  return records;
}

function latestPerLineage(records) {
  const latest = new Map();
  for (const record of records) {
    const prior = latest.get(record.lineage_id);
    if (!prior || record.record_revision > prior.record_revision || (record.record_revision === prior.record_revision && record.created_at > prior.created_at)) latest.set(record.lineage_id, record);
  }
  return [...latest.values()].sort((left, right) => left.lineage_id.localeCompare(right.lineage_id));
}

function projectStoreState(store, status = store ? "available" : "not_initialized") {
  if (!store) {
    return {
      store_health: { status, integrity: "not_run", revision: 0, freshness: "unknown" },
      runs: [],
      delegations: [],
      budgets: { status: "not_reserved", reservations: [] },
      ownership: [],
      relationships: [],
      transaction: { status: status === "not_initialized" ? "not_initialized" : "unavailable", unresolved_effects: [] },
    };
  }
  const health = store.health({ integrity: "quick" });
  const closures = new Map(latestPerLineage(queryAll(store, "AgentRunClosure")).map((record) => [record.payload?.run_id, record]));
  const runs = latestPerLineage(queryAll(store, "AgentRun")).map((record) => {
    const closure = closures.get(record.id);
    return {
      run_id: record.id,
      parent_agent_id: record.payload?.parent_agent_id ?? null,
      child_agent_id: record.payload?.child_agent_id ?? null,
      depth: record.payload?.depth ?? null,
      state: closure?.lifecycle_state ?? record.lifecycle_state,
      state_history: [...(closure?.payload?.state_history ?? record.payload?.state_history ?? [])],
      attestation_fingerprint: record.payload?.attestation_fingerprint ?? null,
      admission_receipt_id: record.payload?.admission_receipt_id ?? null,
      created_at: record.created_at,
    };
  });
  const delegations = latestPerLineage(queryAll(store, "DelegationGrant")).map((record) => ({
    grant_id: record.payload?.grant_id ?? record.id,
    parent_agent_id: record.payload?.parent_agent_id ?? null,
    child_agent_id: record.payload?.child_agent_id ?? null,
    state: record.lifecycle_state,
    expires_at: record.payload?.expires_at ?? record.fresh_until,
    scope_fingerprint: record.payload?.scope_fingerprint ?? null,
    ownership: record.payload?.ownership ?? null,
  }));
  const reservationConsumptions = new Set(queryAll(store, "ResourceCostReservationConsumption").map((record) => record.payload?.reservation_id));
  const reservations = queryAll(store, "ResourceCostReservation").map((record) => ({
    reservation_id: record.payload?.reservation_id ?? record.id,
    state: reservationConsumptions.has(record.payload?.reservation_id ?? record.id) ? "CONSUMED" : record.lifecycle_state,
    purpose: record.payload?.purpose ?? null,
    limits: record.payload?.budget ?? record.payload?.limits ?? {},
    consumed: reservationConsumptions.has(record.payload?.reservation_id ?? record.id),
    expires_at: record.payload?.expires_at ?? record.fresh_until,
  }));
  const relationships = latestPerLineage(queryAll(store, "Relationship")).map((record) => ({
    relationship_id: record.payload?.relationship_id ?? record.lineage_id,
    parent_logical_id: record.payload?.parent_logical_id ?? null,
    child_logical_id: record.payload?.child_logical_id ?? null,
    state: record.payload?.state ?? record.lifecycle_state,
    authority_epoch: record.payload?.authority_epoch ?? null,
    policy_fingerprint: record.payload?.policy_fingerprint ?? record.policy_fp,
    instruction_fingerprint: record.payload?.instruction_fingerprint ?? null,
    updated_at: record.created_at,
  }));
  const unresolvedEffects = store.listUnresolvedEffects().map((effect) => ({ effect_id: effect.effect_id, target_id: effect.target_id, operation: effect.operation, intent_state: effect.intent_state, outbox_state: effect.outbox_state ?? "missing", attempts: effect.attempts ?? 0 }));
  return {
    store_health: { status: health.ok ? "healthy" : "blocked", integrity: health.integrity, revision: health.revision, freshness: "current", recovery_only: health.recovery_only, outbox: health.outbox },
    runs,
    delegations,
    budgets: { status: reservations.length ? "tracked" : "not_reserved", reservations },
    ownership: delegations.filter((grant) => grant.ownership).map((grant) => ({ grant_id: grant.grant_id, child_agent_id: grant.child_agent_id, ...grant.ownership })),
    relationships,
    transaction: { status: unresolvedEffects.length ? "reconciliation_required" : "settled", unresolved_effects: unresolvedEffects },
  };
}

export async function loadDefaultNextWorkflowProjection({ repositoryRoot, providerRegistry, activationRecord: suppliedActivationRecord, activationVerifier, selectionCatalog, store = null, storeStatus } = {}) {
  const contracts = await loadContracts({ repositoryRoot });
  const validation = validateContractSet(contracts);
  const registryDocument = JSON.parse(readFileSync(join(repositoryRoot, "learning", "NEXT_WORKFLOW_PROVIDER_REGISTRY.json"), "utf8"));
  const registry = projectValidatedProviderRegistry({ document: registryDocument, runtimeRegistry: providerRegistry ?? { observed_at: null, entries: [] } });
  const settings = selectionCatalog?.settings ?? JSON.parse(readFileSync(join(repositoryRoot, "learning", "NEXT_WORKFLOW_AGENT_SELECTION_SETTINGS.json"), "utf8"));
  const activationRecord = validateActivationRecord(suppliedActivationRecord ?? JSON.parse(readFileSync(join(repositoryRoot, "learning", "NEXT_WORKFLOW_ACTIVATION.json"), "utf8")));
  const blockers = [];
  if (!validation.ok) blockers.push("contract_validation_failed");
  const storeState = projectStoreState(store, storeStatus);
  if (storeState.store_health.recovery_only === true) blockers.push("store_reconciliation_required");
  let activationTrusted = activationRecord.mode !== "enforced";
  if (activationRecord.mode === "enforced") {
    if (typeof activationVerifier !== "function") blockers.push("activation_verification_required");
    else {
      const recordFingerprint = digest(activationRecord);
      try {
        const verified = await activationVerifier({ record: structuredClone(activationRecord), phase: "projection", record_fingerprint: recordFingerprint });
        activationTrusted = verified?.trusted === true && verified.record_fingerprint === recordFingerprint && typeof verified.proof_fingerprint === "string";
      } catch {
        activationTrusted = false;
      }
      if (!activationTrusted) blockers.push("activation_verification_failed");
    }
  }
  const topology = [
    { agent_id: "orchestrator", parent_agent_id: null, depth: 0, layer: "Orchestrator", role: "Orchestrator Agent", selection_source: "global", state: "planned" },
    { agent_id: "lead-value-design", parent_agent_id: "orchestrator", depth: 1, layer: "Lead", role: "Value Design Lead", selection_source: "global", state: "compressed_at_L1" },
    { agent_id: "lead-planning-design", parent_agent_id: "orchestrator", depth: 1, layer: "Lead", role: "Planning Design Lead", selection_source: "global", state: "compressed_at_L1" },
    { agent_id: "lead-implementation", parent_agent_id: "orchestrator", depth: 1, layer: "Lead", role: "Implementation Lead", selection_source: "global", state: "compressed_at_L1" },
    { agent_id: "lead-independent-review", parent_agent_id: "orchestrator", depth: 1, layer: "Lead", role: "Independent Review Lead", selection_source: "global", state: "compressed_at_L1" },
    { agent_id: "lead-safety-acceptance", parent_agent_id: "orchestrator", depth: 1, layer: "Lead", role: "Safety and Acceptance Decision Lead", selection_source: "global", state: "compressed_at_L1" },
    { agent_id: "task-template", parent_agent_id: "lead-implementation", depth: 2, layer: "Task", role: "Task Agent", selection_source: "inherit", state: "instantiate_only_when_required" }
  ];
  return buildNextWorkflowProjection({
    activation: { mode: activationRecord.mode, policy_revision: "1.0.0", registry_revision: registry.revision, candidate_fingerprint: activationRecord.candidate_fingerprint },
    providerRegistry: registry,
    selectionSettings: { ...settings, subjects: selectionCatalog?.subjects ?? [], eligible_entries: selectionCatalog?.eligible_entries ?? [], team_fingerprint: selectionCatalog?.team_fingerprint ?? null },
    storeHealth: storeState.store_health,
    team: { topology, runs: storeState.runs, delegations: storeState.delegations, budgets: storeState.budgets, ownership: storeState.ownership, status: storeState.runs.length ? "observed" : "not_started" },
    relationships: storeState.relationships,
    transaction: storeState.transaction,
    blockers,
    releaseEvidence: { status: activationRecord.mode === "enforced" && activationTrusted ? "passed" : activationRecord.mode === "enforced" ? "failed" : "pending", candidate_fingerprint: activationRecord.candidate_fingerprint, proofs: activationRecord.evidence.map((proof) => ({ kind: proof.kind, status: proof.status, fingerprint: proof.fingerprint })) },
    shadowMetrics: activationRecord.correctness,
    nextAction: activationRecord.mode === "enforced"
      ? "The next development workflow is active; every side effect remains subject to the effective authority gateway."
      : registry.entries.length === 0
        ? `Register and certify an eligible model, then complete release proof before activation; ${activationRecord.mode} mode grants no launch authority.`
        : `Complete release proof before activation; ${activationRecord.mode} mode grants no launch authority.`,
    progress: {
      accepted_weight: activationRecord.mode === "enforced" ? 20 : Number(((activationRecord.evidence.length / REQUIRED_RELEASE_PROOFS.size) * 20).toFixed(2)),
      total_weight: 20,
      percent: activationRecord.mode === "enforced" ? 100 : Math.floor((activationRecord.evidence.length / REQUIRED_RELEASE_PROOFS.size) * 100),
      basis: "activation_candidate_release_evidence_only",
    }
  });
}

export function projectionDigest(value) {
  return digest(value);
}
