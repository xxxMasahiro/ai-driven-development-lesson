import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const CONTRACT_FILE_ORDER = Object.freeze([
  "authority-lifecycle.json",
  "team-agent-security.json",
  "provider-registry.json",
  "parent-child-authority.json",
  "context-impact.json",
  "state-store.json",
  "shadow-compatibility.json"
]);

const CONTRACT_IDS = Object.freeze([
  "next_workflow_authority_lifecycle",
  "next_workflow_team_agent_security",
  "next_workflow_provider_registry",
  "next_workflow_parent_child_authority",
  "next_workflow_context_impact",
  "next_workflow_state_store",
  "next_workflow_shadow_compatibility"
]);
const CONTRACT_BASELINE_FINGERPRINTS = Object.freeze({
  next_workflow_authority_lifecycle: "2f2816879a6be9f62473f039ee24fcf763afa6ddc027a73d6e5f628360ad7b55",
  next_workflow_team_agent_security: "f5eaed08429f41708728bca88b72d8d0c8938c6e68770b6b8b86f70d425238de",
  next_workflow_provider_registry: "6e6db35338e38e29d13fb90a6f2cef9229b392526a779893dc62299767fa2b1b",
  next_workflow_parent_child_authority: "41376b9d0cfd1d14c867fe75b5199ad4d316324f19dec4d0ab06d6de9a92f6f9",
  next_workflow_context_impact: "098742b7ac7ca1ba584eb865170add311a8adef1dbddc7c296ab94d418621f8e",
  next_workflow_state_store: "01139799dcaea0195e574967bf64e534b6940d67be0df289bdb642d07a0059c7",
  next_workflow_shadow_compatibility: "58bdea09673fa700affa10cc2d7abf895f9d76df75c8eadcc44f4ab25f054244",
});

const DECISIONS = Object.freeze(["PASS", "REVISE", "ASK_OWNER", "STOP"]);
const LIFECYCLE_IDS = Object.freeze(["outcome_discovery", "roadmap_decomposition", "solution_proposal_review", "implementation_planning", "build_and_verify", "release_and_sync"]);
const EXECUTION_PHASE_IDS = Object.freeze(["context_triage", "proposal", "implementation_plan", "fast_loop", "mid_tests", "release_gate", "main_sync_cleanup"]);
const RIGOR_SCORE_IDS = Object.freeze(["user_impact", "change_scope", "recoverability", "uncertainty", "verification_difficulty", "permission_boundary_impact"]);
const HARD_L5_TRIGGERS = Object.freeze(["security", "authentication", "secrets", "permissions", "destructive_operation", "history_rewrite", "ci_or_safety_gate_change", "external_repository_write", "data_migration", "breaking_compatibility", "unknown_impact"]);
const REPOSITORY_PHASE_MAPPING = Object.freeze({
  context_triage: ["outcome_discovery"],
  proposal: ["outcome_discovery", "roadmap_decomposition", "solution_proposal_review"],
  implementation_plan: ["roadmap_decomposition", "solution_proposal_review", "implementation_planning"],
  fast_loop: ["build_and_verify"],
  mid_tests: ["build_and_verify"],
  release_gate: ["release_and_sync"],
  main_sync_cleanup: ["release_and_sync"],
});
const ACTIVATION_ORDER = Object.freeze([
  "planned",
  "shadow",
  "release_verified",
  "recovery_verified",
  "rollback_verified",
  "archive_decommission_verified",
  "ready",
  "enforced"
]);

function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function semver(value) {
  return typeof value === "string" && /^\d+\.\d+\.\d+$/.test(value);
}

function sameMembers(actual, expected) {
  return Array.isArray(actual) && actual.length === expected.length && expected.every((item) => actual.includes(item));
}

function requireCondition(issues, condition, code, message, contractId) {
  if (!condition) issues.push({ code, message, contract_id: contractId });
}

function contractDigest(value) {
  return createHash("sha256").update(canonicalJson(value)).digest("hex");
}

export function canonicalJson(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (isObject(value)) {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

export function defaultContractDirectory(repositoryRoot) {
  return path.join(repositoryRoot, "docs", "workflow", "next-workflow");
}

export async function loadContracts({ repositoryRoot, contractDirectory } = {}) {
  const root = repositoryRoot ?? path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
  const directory = contractDirectory ?? defaultContractDirectory(root);
  const contracts = [];
  for (const file of CONTRACT_FILE_ORDER) {
    const filePath = path.join(directory, file);
    const raw = await readFile(filePath, "utf8");
    let value;
    try {
      value = JSON.parse(raw);
    } catch (error) {
      throw new Error(`INVALID_CONTRACT_JSON:${file}:${error.message}`);
    }
    contracts.push({ file, filePath, value, digest: contractDigest(value) });
  }
  return contracts;
}

export function validateContractSet(entries) {
  const issues = [];
  requireCondition(issues, Array.isArray(entries), "CONTRACT_SET_INVALID", "contracts must be an array", "contract_set");
  if (!Array.isArray(entries)) return { ok: false, issues, fingerprints: {} };
  requireCondition(issues, entries.length === CONTRACT_FILE_ORDER.length, "CONTRACT_COUNT_INVALID", "exactly seven P0 contracts are required", "contract_set");
  const fingerprints = {};

  entries.forEach((entry, index) => {
    const value = entry?.value ?? entry;
    const id = value?.contract_id ?? `index_${index}`;
    requireCondition(issues, isObject(value), "CONTRACT_NOT_OBJECT", "contract must be an object", id);
    if (!isObject(value)) return;
    requireCondition(issues, semver(value.schema_version), "SCHEMA_VERSION_INVALID", "schema_version must be semantic", id);
    requireCondition(issues, id === CONTRACT_IDS[index], "CONTRACT_ORDER_OR_ID_INVALID", `expected ${CONTRACT_IDS[index]}`, id);
    requireCondition(issues, value.activation_mode === "planned", "P0_PREMATURE_ACTIVATION", "P0 contracts must remain planned", id);
    fingerprints[id] = contractDigest(value);
    requireCondition(issues, CONTRACT_BASELINE_FINGERPRINTS[id] === fingerprints[id], "CONTRACT_FINGERPRINT_DRIFT", "every contract field is locked to the reviewed schema baseline; intentional changes require a versioned baseline update", id);
  });

  const values = Object.fromEntries(entries.map((entry) => [(entry.value ?? entry)?.contract_id, entry.value ?? entry]));
  validateAuthority(values.next_workflow_authority_lifecycle, issues);
  validateTeam(values.next_workflow_team_agent_security, issues);
  validateProviders(values.next_workflow_provider_registry, issues);
  validateParentChild(values.next_workflow_parent_child_authority, issues);
  validateContext(values.next_workflow_context_impact, issues);
  validateStore(values.next_workflow_state_store, issues);
  validateShadow(values.next_workflow_shadow_compatibility, issues);
  return { ok: issues.length === 0, issues, fingerprints };
}

function validateAuthority(value, issues) {
  const id = "next_workflow_authority_lifecycle";
  if (!isObject(value)) return;
  requireCondition(issues, value.objective?.optimization === "lexicographic" && value.objective?.speed_is_eligible_only_after_correctness === true, "OBJECTIVE_INVALID", "correctness must be lexicographically prior to speed", id);
  requireCondition(issues, value.authority_baseline?.legacy_runtime_remains_authoritative_until_enforced === true, "LEGACY_AUTHORITY_NOT_PRESERVED", "legacy runtime must remain authoritative", id);
  requireCondition(issues, value.authority_baseline?.unrelated_feature_tradeoffs === "forbidden", "TRADEOFF_NOT_FORBIDDEN", "unrelated feature tradeoffs must be forbidden", id);
  const aliases = value.lifecycle?.map((stage) => stage.legacy_alias);
  requireCondition(issues, sameMembers(aliases, ["E", "F", "A", "B", "C", "D"]), "LIFECYCLE_ALIAS_INVALID", "six lifecycle aliases must be E,F,A,B,C,D", id);
  const lifecycleIds = value.lifecycle?.map((stage) => stage.id);
  requireCondition(issues, JSON.stringify(lifecycleIds) === JSON.stringify(LIFECYCLE_IDS), "LIFECYCLE_ID_INVALID", "the six canonical lifecycle IDs and order are fixed", id);
  const phaseMapping = value.repository_phase_mapping ?? {};
  requireCondition(issues, sameMembers(Object.keys(phaseMapping), EXECUTION_PHASE_IDS), "PHASE_MAPPING_INVALID", "all seven canonical execution phases must be mapped", id);
  requireCondition(issues, canonicalJson(phaseMapping) === canonicalJson(REPOSITORY_PHASE_MAPPING), "PHASE_LIFECYCLE_EDGE_INVALID", "the exact canonical execution-phase to lifecycle-stage edges are required", id);
  requireCondition(issues, sameMembers(Object.keys(value.rigor_levels ?? {}), ["L1", "L2", "L3", "L4", "L5"]), "RIGOR_LEVEL_INVALID", "L1-L5 are required", id);
  requireCondition(issues, JSON.stringify(value.rigor_scores) === JSON.stringify(RIGOR_SCORE_IDS), "RIGOR_SCORE_COMPONENTS_INVALID", "the six canonical 0-2 rigor score components are fixed", id);
  requireCondition(issues, sameMembers(value.hard_l5_triggers, HARD_L5_TRIGGERS), "RIGOR_HARD_TRIGGER_SET_INVALID", "the canonical hard L5 trigger vocabulary is required", id);
  requireCondition(issues, value.rigor_levels?.L5?.formal_start_approval === true && ["L1", "L2", "L3", "L4"].every((level) => value.rigor_levels?.[level]?.formal_start_approval === false), "APPROVAL_TIMING_INVALID", "only L5 has normal start approval", id);
  requireCondition(issues, sameMembers(value.decisions, DECISIONS), "DECISION_SET_INVALID", "four finite loop decisions are required", id);
  requireCondition(issues, value.immutable_stop?.terminal_for_same_decision_fingerprint === true && value.immutable_stop?.reentry_requires_material_change === true, "STOP_NOT_IMMUTABLE", "STOP must be immutable for an unchanged decision", id);
  requireCondition(issues, value.git_approval_migration?.reinterpret_in_place === false && value.git_approval_migration?.requires_versioned_preview_and_apply === true, "LEGACY_GIT_MIGRATION_UNSAFE", "legacy Git approvals require versioned migration", id);
  requireCondition(issues, Object.values(value.retry?.unchanged_failure_limit ?? {}).every((limit) => Number.isInteger(limit) && limit > 0), "RETRY_LIMIT_INVALID", "retry limits must be finite positive integers", id);
  requireCondition(issues, value.runtime_execution?.candidate_controlled_trust === "forbidden" && value.runtime_execution?.missing_production_trust === "fail_closed" && value.runtime_execution?.isolated_verification?.production_authority === false && value.runtime_execution?.isolated_verification?.activation_transition_allowed === false && value.runtime_execution?.activation_remains === "planned", "RUNTIME_EXECUTION_AUTHORITY_INVALID", "production trust is external and the isolated profile cannot grant production or activation authority", id);
}

function validateTeam(value, issues) {
  const id = "next_workflow_team_agent_security";
  if (!isObject(value)) return;
  requireCondition(issues, JSON.stringify(value.layers?.map((layer) => layer.depth)) === "[0,1,2]", "TEAM_DEPTH_INVALID", "team depth must be exactly 0/1/2", id);
  requireCondition(issues, value.layers?.[2]?.may_delegate_to?.length === 0, "TASK_DELEGATION_INVALID", "Task Agents cannot delegate", id);
  requireCondition(issues, value.rigor_topology?.L1?.max_leads === 0 && value.rigor_topology?.L2?.max_tasks === 0, "ROLE_COMPRESSION_INVALID", "L1/L2 topology limits are required", id);
  requireCondition(issues, value.trust_envelopes?.untrusted_data_cannot_become_instruction === true, "TRUST_ENVELOPE_INVALID", "untrusted data cannot become instruction", id);
  requireCondition(issues, value.launch_security?.actual_observed_absent_pre_spawn === true && value.launch_security?.actual_observed_required_before_running === true, "LAUNCH_ATTESTATION_INVALID", "actual observation must be absent before spawn and required before running", id);
  requireCondition(issues, value.launch_security?.authority_owned_task_delivery === true && value.launch_security?.applicable_agents_and_instruction_fingerprinted === true && value.launch_security?.exact_delivery_fingerprint_bound === true && value.launch_security?.control_metadata_ancestors_and_descendants === "forbidden" && value.launch_security?.private_response_directory_is_descriptor_pinned === true && value.launch_security?.contained_process_identity_is_persisted_for_recovery === true && value.launch_security?.run_lifecycle_port_requires_protected_factory_brand === true && value.launch_security?.run_lifecycle_runtime_writer_is_private_and_store_bound === true && value.launch_security?.authority_fenced_cli_executor_requires_protected_lifecycle_brand === true && value.launch_security?.prompt_fingerprint_read_preserves_child_stdin_offset === true && value.launch_security?.candidate_requires_completed_runtime_run_provenance === true && value.launch_security?.candidate_requires_durable_launch_intent_and_exact_admission_subject === true && value.launch_security?.candidate_requires_exact_launch_request_fingerprint === true && value.launch_security?.candidate_relation_and_event_topology_is_exact === true && value.launch_security?.agent_authority_records_require_protected_owner_trust_brand === true && value.launch_security?.completed_runtime_replay_preserves_result_fingerprint === true && sameMembers(value.launch_security?.provider_neutral_run_lifecycle_port, ["start", "observe", "cancel", "terminate", "collect_result", "reconcile", "recover"]), "AGENT_RUNTIME_WIRING_INVALID", "task delivery and the provider-neutral run lifecycle must be authority-owned, factory-branded, store-bound, descriptor-pinned, stdin-preserving, provenance-bound, replay-safe, and recovery-bound", id);
  requireCondition(issues, value.ownership?.read_only_default === true && value.ownership?.concurrent_writes_require_disjoint_paths === true, "WRITE_OWNERSHIP_INVALID", "read-only default and disjoint writes are required", id);
}

function validateProviders(value, issues) {
  const id = "next_workflow_provider_registry";
  if (!isObject(value)) return;
  requireCondition(issues, value.identity_fields?.length === 6, "PROVIDER_IDENTITY_INVALID", "provider identity must have six parts", id);
  requireCondition(issues, sameMembers(value.selection_modes, ["auto", "manual", "inherit"]), "SELECTION_MODES_INVALID", "Auto, Manual, and Inherit share one selector", id);
  requireCondition(issues, JSON.stringify(value.inheritance_order) === JSON.stringify(["agent", "role", "team", "repository", "context", "global"]), "INHERITANCE_ORDER_INVALID", "inheritance order must be fixed", id);
  requireCondition(issues, value.nearest_present_invalid_blocks === true, "INVALID_INHERITANCE_FALLTHROUGH", "nearest invalid source must block", id);
  requireCondition(issues, value.certification?.eligible_state === "CERTIFIED" && value.certification?.drift_or_outage_fails_closed === true, "CERTIFICATION_INVALID", "only current certified entries are eligible", id);
  requireCondition(issues, sameMembers(value.certification?.states, ["CANDIDATE", "CERTIFIED", "EXPIRED", "REVOKED", "FAILED", "DEGRADED", "UNAVAILABLE", "REPROBE_REQUIRED"]), "CERTIFICATION_STATE_SET_INVALID", "the canonical provider certification lifecycle is required", id);
  requireCondition(issues, sameMembers(value.configuration_states, ["requested", "selected", "effective", "actual_observed"]), "ATTESTATION_STATES_INVALID", "four configuration states are required", id);
  requireCondition(issues, value.attestation?.copied_or_predicted_actual_refused === true, "PLACEHOLDER_ACTUAL_ALLOWED", "predicted actual observation must be refused", id);
  requireCondition(issues, value.automatic_effort_selection?.explicit_native_value_passed_to_cli === true && value.automatic_effort_selection?.selected_model_and_effort_bound_to_launch === true && value.automatic_effort_selection?.independent_runtime_observation_required === true && value.automatic_effort_selection?.selected_actual_mismatch === "STOP" && value.automatic_effort_selection?.implicit_none_observation === "forbidden", "AUTOMATIC_EFFORT_SELECTION_INVALID", "automatic effort must be explicit at launch and independently verified at runtime", id);
  requireCondition(issues, value.selection_policy?.resource_bounds_required === true && value.selection_policy?.resource_bounds_must_be_nonempty === true && value.selection_policy?.every_resource_bound_requires_a_matching_budget === true && value.selection_policy?.estimated_cost_required === true, "PROVIDER_RESOURCE_POLICY_INVALID", "provider resource bounds must be explicit, nonempty, and matched by owner budget", id);
  requireCondition(issues, value.selection_policy?.launch_revalidates_manifest_against_reservation === true && value.selection_policy?.operational_timeout_requires_explicit_bound === true, "PROVIDER_LAUNCH_BUDGET_POLICY_INVALID", "launch must revalidate the current manifest against its reservation and require an explicit runtime bound", id);
  requireCondition(issues, value.custom_manifest?.shell_templates === "forbidden" && value.custom_manifest?.implicit_download_install_or_service_start === "forbidden", "CUSTOM_MANIFEST_UNSAFE", "shell templates and implicit runtime effects are forbidden", id);
  requireCondition(issues, value.endpoint_security?.connection_path_requires_exact_intermediary_allowlist === true && value.endpoint_security?.connection_path_requires_address_and_continuity_evidence === true && value.endpoint_security?.validate_tls_peer_each_handshake === true, "ENDPOINT_CONNECTION_PATH_POLICY_INVALID", "every direct, proxy, and tunnel leg requires allowlisted address, continuity, and TLS evidence", id);
  requireCondition(issues, value.secret_reference?.raw_secret_in_manifest === "forbidden" && value.secret_reference?.resolver_must_be_authorized_for_adapter === true && value.secret_reference?.rotation_and_revocation_epoch_binding === true && value.secret_reference?.ephemeral_delivery_only === true && value.secret_reference?.resolved_bytes_must_be_zeroed_after_dispatch === true, "RAW_SECRET_ALLOWED", "raw secrets are forbidden and ephemeral secret delivery must be adapter, scope, rotation, and revocation bound", id);
  requireCondition(issues, sameMembers(value.secret_reference?.required_fields, ["reference_id", "namespace", "resolver", "audience", "adapter_id", "scope", "issued_at", "expires_at", "revocation_state", "rotation_epoch", "revocation_epoch", "delivery_mode"]), "SECRET_REFERENCE_FIELDS_INVALID", "the complete secret reference lifecycle fields are required", id);
}

function validateParentChild(value, issues) {
  const id = "next_workflow_parent_child_authority";
  if (!isObject(value)) return;
  requireCondition(issues, value.instruction_resolution?.parent_fallback_only_on_exact_absence === true && value.instruction_resolution?.present_invalid_blocks === true, "INSTRUCTION_FALLBACK_INVALID", "fallback is absence-only and invalid local blocks", id);
  requireCondition(issues, value.relationship?.active_parent_cardinality === 1, "PARENT_CARDINALITY_INVALID", "managed child must have exactly one active parent", id);
  requireCondition(issues, value.authority_variants?.length === 9, "AUTHORITY_VARIANTS_INVALID", "nine tagged authority variants are required", id);
  requireCondition(issues, value.side_effect_gateway?.required_for_all_effects === true && value.side_effect_gateway?.direct_adapter_bypass === "forbidden", "SIDE_EFFECT_BYPASS_ALLOWED", "all effects must use the common gateway", id);
  requireCondition(issues, value.saga?.claims_exactly_once === false && value.saga?.receipt_requires_independent_proof === true, "SAGA_SEMANTICS_INVALID", "Saga must use verified idempotent reconciliation", id);
  requireCondition(issues, JSON.stringify(value.activation_order) === JSON.stringify(ACTIVATION_ORDER), "ACTIVATION_ORDER_INVALID", "activation order is fixed", id);
  requireCondition(issues, value.registered_child_traversal_from_parent_ci === "forbidden", "CHILD_TRAVERSAL_ALLOWED", "parent CI cannot traverse registered children", id);
}

function validateContext(value, issues) {
  const id = "next_workflow_context_impact";
  if (!isObject(value)) return;
  requireCondition(issues, value.work_context_frame?.provider_repository_agent_text_is_instruction === false, "CONTEXT_INJECTION_ALLOWED", "provider, repository, and agent text stays data", id);
  requireCondition(issues, value.impact_graph?.unknown_policy === "expand_or_stop" && value.impact_graph?.required_check_miss_tolerance === 0, "IMPACT_UNKNOWN_UNSAFE", "unknown impact expands or stops with zero missed checks", id);
  requireCondition(issues, value.scheduler?.cycles === "STOP" && value.scheduler?.concurrent_writers_require_disjoint_ownership === true, "SCHEDULER_GUARD_INVALID", "cycles stop and writes must be disjoint", id);
  requireCondition(issues, value.progress?.started_work_counts === false && value.progress?.report_interval_minutes === 15, "PROGRESS_INVALID", "progress is verified and reported every 15 minutes", id);
}

function validateStore(value, issues) {
  const id = "next_workflow_state_store";
  if (!isObject(value)) return;
  requireCondition(issues, value.adr?.port === "WorkflowStateStore" && value.adr?.replaceable_driver === true, "STORE_PORT_INVALID", "storage driver must be replaceable", id);
  requireCondition(issues, value.adr?.driver === "node:sqlite DatabaseSync" && value.adr?.minimum_node === "24.0.0", "STORE_DRIVER_INVALID", "SQLite driver and Node baseline must be explicit", id);
  requireCondition(issues, value.placement === ".workflow-state/", "STORE_PLACEMENT_INVALID", "state must use the ignored local directory", id);
  requireCondition(issues, value.sqlite_pragmas?.foreign_keys === "ON" && value.sqlite_pragmas?.synchronous === "FULL" && value.sqlite_pragmas?.trusted_schema === "OFF", "SQLITE_PRAGMAS_INVALID", "fail-safe SQLite pragmas are required", id);
  requireCondition(issues, value.migration?.checksummed === true && value.migration?.backup_required_before_upgrade === true, "MIGRATION_INVALID", "migrations require checksum and backup", id);
  requireCondition(issues, value.recovery?.foreign_checkout_requires_separate_identity_migration === true && value.recovery?.stage_then_atomic_rename === true, "RESTORE_INVALID", "restore must verify identity and replace atomically", id);
  requireCondition(issues, value.runtime_wiring?.migration_version === 3 && value.runtime_wiring?.approval_capability?.single_use === true && value.runtime_wiring?.effect_idempotency?.same_key_same_payload_reuses_state === true && value.runtime_wiring?.effect_idempotency?.same_key_different_payload === "CONFLICT" && value.runtime_wiring?.agent_closure_reloads_authoritative_reviews === true && value.runtime_wiring?.agent_closure_requires_exact_relation_and_event_topology === true && value.runtime_wiring?.unresolved_run_recovery === true, "RUNTIME_STORE_WIRING_INVALID", "runtime approvals, idempotency, reviewed agent closure, run lifecycle, and recovery must remain durable and fail closed", id);
  requireCondition(issues, value.runtime_wiring?.agent_candidate_requires_completed_runtime_run_provenance === true && value.runtime_wiring?.protected_agent_candidate_requires_launch_and_admission_receipts === true && value.runtime_wiring?.protected_agent_candidate_requires_durable_launch_intent_and_exact_admission_subject === true && value.runtime_wiring?.protected_agent_candidate_requires_exact_launch_request_fingerprint === true && value.runtime_wiring?.completed_runtime_replay_preserves_result_fingerprint === true && value.runtime_wiring?.protected_store_runtime_writes_require_private_store_bound_lifecycle_writer === true && value.runtime_wiring?.protected_agent_authority_records_require_owner_trust_brand === true && value.runtime_wiring?.restart_recovery_uses_recovery_only_transitions === true, "STORE_AGENT_RUNTIME_PROVENANCE_INVALID", "reported candidates must bind a completed runtime run, exact launch request, durable launch intent, and exact protected admission; runtime and agent-authority writers must be store-bound and owner-trusted; recovery-only transition authority must survive restart; completed replay must preserve its result fingerprint", id);
}

function validateShadow(value, issues) {
  const id = "next_workflow_shadow_compatibility";
  if (!isObject(value)) return;
  requireCondition(issues, value.current_runtime_authoritative === true && value.additive_parser === true, "SHADOW_NOT_ADDITIVE", "legacy runtime remains authoritative under additive parsing", id);
  requireCondition(issues, value.shadow_comparison?.zero_required_check_misses === true && value.shadow_comparison?.zero_green_unknown_states === true, "SHADOW_THRESHOLD_INVALID", "correctness thresholds must be zero-miss", id);
  requireCondition(issues, value.fixture_families?.length >= 13, "REFUSAL_FIXTURES_INCOMPLETE", "all refusal fixture families are required", id);
  requireCondition(issues, JSON.stringify(value.activation_gate?.required_order) === JSON.stringify(ACTIVATION_ORDER.slice(1)), "SHADOW_ACTIVATION_INVALID", "shadow activation proof order is fixed", id);
  requireCondition(issues, value.rollback?.restores_legacy_authority === true && value.rollback?.failed_or_incomplete_is_manual_recovery_required === true, "ROLLBACK_INVALID", "rollback restores legacy or stops for manual recovery", id);
}

export function assertContractSet(entries) {
  const result = validateContractSet(entries);
  if (!result.ok) {
    const detail = result.issues.map((issue) => `${issue.contract_id}:${issue.code}`).join(",");
    const error = new Error(`NEXT_WORKFLOW_CONTRACT_INVALID:${detail}`);
    error.issues = result.issues;
    throw error;
  }
  return result;
}

export function assessRigor({ scores, scoreReasons, hardTriggers = [], hardTriggerEvidence = {}, developerMinimum = "L1" }) {
  const order = ["L1", "L2", "L3", "L4", "L5"];
  if (!isObject(scores)) throw new Error("RIGOR_SCORES_REQUIRED");
  if (JSON.stringify(Object.keys(scores).sort()) !== JSON.stringify([...RIGOR_SCORE_IDS].sort())) throw new Error("RIGOR_SCORE_COMPONENTS_INVALID");
  const normalizedScores = Object.fromEntries(RIGOR_SCORE_IDS.map((id) => [id, scores[id]]));
  const values = Object.values(normalizedScores);
  if (values.some((score) => !Number.isInteger(score) || score < 0 || score > 2)) throw new Error("RIGOR_SCORE_INVALID");
  if (!isObject(scoreReasons) || RIGOR_SCORE_IDS.some((id) => typeof scoreReasons[id] !== "string" || scoreReasons[id].trim().length === 0) || Object.keys(scoreReasons).some((id) => !RIGOR_SCORE_IDS.includes(id))) throw new Error("RIGOR_SCORE_REASONS_REQUIRED");
  if (!Array.isArray(hardTriggers) || hardTriggers.some((trigger) => !HARD_L5_TRIGGERS.includes(trigger))) throw new Error("RIGOR_HARD_TRIGGER_INVALID");
  if (!isObject(hardTriggerEvidence) || hardTriggers.some((trigger) => typeof hardTriggerEvidence[trigger] !== "string" || hardTriggerEvidence[trigger].trim().length === 0) || Object.keys(hardTriggerEvidence).some((trigger) => !hardTriggers.includes(trigger))) throw new Error("RIGOR_HARD_TRIGGER_EVIDENCE_REQUIRED");
  if (!order.includes(developerMinimum)) throw new Error("RIGOR_DEVELOPER_MINIMUM_INVALID");
  const total = values.reduce((sum, score) => sum + score, 0);
  const calculatedLevel = total <= 1 ? "L1" : total <= 3 ? "L2" : total <= 6 ? "L3" : total <= 9 ? "L4" : "L5";
  const triggers = [...new Set(hardTriggers)].sort();
  const automatic = triggers.length > 0 ? "L5" : calculatedLevel;
  const level = order[Math.max(order.indexOf(automatic), order.indexOf(developerMinimum))];
  const reason = triggers.length > 0 ? "hard_trigger" : level === automatic ? "score_band" : "developer_minimum";
  return {
    level,
    calculated_level: calculatedLevel,
    effective_level: level,
    reason,
    adjustment_actor: level !== automatic ? "developer" : "ai",
    score: total,
    scores: normalizedScores,
    score_reasons: Object.fromEntries(RIGOR_SCORE_IDS.map((id) => [id, scoreReasons[id].trim()])),
    hard_triggers: triggers,
    hard_trigger_evidence: Object.fromEntries(triggers.map((trigger) => [trigger, hardTriggerEvidence[trigger].trim()])),
    lowering_prohibited: triggers.length > 0,
  };
}

export function evaluateCorrectionLoop({ decision, failureFingerprint, previousFailureFingerprint, retryCount, retryLimit }) {
  if (!DECISIONS.includes(decision)) throw new Error("DECISION_INVALID");
  if (!Number.isSafeInteger(retryCount) || retryCount < 0 || !Number.isSafeInteger(retryLimit) || retryLimit < 0) throw new Error("RETRY_LIMIT_INVALID");
  if (decision !== "REVISE") return { decision, may_retry: false };
  if (retryCount >= retryLimit) return { decision: "STOP", may_retry: false, reason: "TOTAL_RETRY_LIMIT" };
  const unchanged = failureFingerprint === previousFailureFingerprint;
  return { decision: "REVISE", may_retry: true, reason: unchanged ? "BOUNDED_RETRY" : "MATERIAL_PROGRESS" };
}

export function canReenterStoppedDecision({ stoppedFingerprint, candidateFingerprint, linkedValidatorDecision }) {
  return Boolean(stoppedFingerprint && candidateFingerprint && stoppedFingerprint !== candidateFingerprint && linkedValidatorDecision?.decision === "PASS" && linkedValidatorDecision?.stopped_fingerprint === stoppedFingerprint && linkedValidatorDecision?.candidate_fingerprint === candidateFingerprint && typeof linkedValidatorDecision?.decision_id === "string" && linkedValidatorDecision.decision_id.length > 0 && typeof linkedValidatorDecision?.authority_epoch === "number" && Number.isSafeInteger(linkedValidatorDecision.authority_epoch) && linkedValidatorDecision.authority_epoch >= 0);
}

export function classifyLegacyInstruction({ version, strongerLocalObligations = false, parsed = true }) {
  if (!parsed) return { compatibility: "unsupported", action: "manual_required" };
  if (version !== "1.0.0") return { compatibility: "unsupported", action: "block" };
  if (strongerLocalObligations) return { compatibility: "legacy_stronger", action: "preserve" };
  return { compatibility: "supported", action: "shadow_compare" };
}

export function computeVerifiedProgress(items) {
  if (!Array.isArray(items) || items.length === 0) return { accepted_weight: 0, total_weight: 0, percent: 0 };
  let accepted = 0;
  let total = 0;
  for (const item of items) {
    if (!Number.isFinite(item.weight) || item.weight <= 0) throw new Error("PROGRESS_WEIGHT_INVALID");
    total += item.weight;
    if (item.accepted === true && item.current_evidence === true) accepted += item.weight;
  }
  return { accepted_weight: accepted, total_weight: total, percent: Number(((accepted / total) * 100).toFixed(2)) };
}

export function compareShadowProjection({ legacy, candidate, requiredFields }) {
  const mismatches = [];
  for (const field of requiredFields) {
    if (canonicalJson(legacy?.[field]) !== canonicalJson(candidate?.[field])) mismatches.push(field);
  }
  return { pass: mismatches.length === 0, mismatches, decision: mismatches.length === 0 ? "PASS" : "STOP" };
}
