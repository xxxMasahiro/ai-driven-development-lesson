#!/usr/bin/env node
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { buildNextWorkflowProjection, loadDefaultNextWorkflowProjection, permittedControlsForMode, projectValidatedProviderRegistry, validateActivationRecord } from "./lib/next_workflow/projection.mjs";
import { providerManifestFingerprint } from "./lib/next_workflow/providers.mjs";
import { createAgentSelectionSettingsManager, decodeSettingsPlanToken } from "./lib/next_workflow/settings.mjs";
import { createDelegationGrant, persistDelegationGrant, persistResourceCostReservation, teamDigest } from "./lib/next_workflow/agents.mjs";
import { persistRelationshipInitialization } from "./lib/next_workflow/saga.mjs";
import { openWorkflowStateStore } from "./lib/next_workflow/store.mjs";

const roots = [];
const REPOSITORY_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
test.after(() => roots.forEach((root) => rmSync(root, { recursive: true, force: true })));

test("projection exposes producer-owned mode controls and never infers launch authority", () => {
  assert.deepEqual(permittedControlsForMode("planned"), ["inspect", "refresh", "settings_dry_run", "settings_apply", "settings_revert"]);
  assert.ok(permittedControlsForMode("enforced").includes("launch_through_gateway"));
  assert.deepEqual(permittedControlsForMode("enforced", ["blocked"]), ["inspect", "refresh", "review_blockers", "settings_dry_run"]);
  const projection = buildNextWorkflowProjection({ activation: { mode: "planned" }, blockers: ["provider_missing"] });
  assert.equal(projection.activation.mode, "planned");
  assert.equal(projection.activation.permitted_controls.includes("launch_through_gateway"), false);
});

test("projection rejects secret, command, raw payload, and absolute-path fields", () => {
  for (const team of [{ api_key: "x" }, { command: "run" }, { raw_payload: "x" }, { absolute_path: "/tmp" }]) assert.throws(() => buildNextWorkflowProjection({ team }), /PROJECTION_(?:SECRET_MATERIAL_FORBIDDEN|PROHIBITED_FIELD)/);
});

test("provider projection exposes only validated eligibility and redacted configuration metadata", () => {
  const identity = { execution_provider_id: "provider", model_publisher_id: "publisher", agent_product_id: "agent", adapter_id: "adapter", transport_id: "cli_process", model_id: "model" };
  const projected = projectValidatedProviderRegistry({
    document: { registry_id: "registry", revision: 1, activation_mode: "planned", adapter_families: [{ family_id: "family", execution_provider_id: "provider", model_publisher_id: "publisher", agent_product_id: "agent", adapter_id: "adapter", transport_id: "cli_process", availability: "observed", certification_state: "CERTIFIED", model_catalog_source: "runtime_discovery", capabilities: ["read"] }] },
    runtimeRegistry: { observed_at: "2029-01-01T00:00:00.000Z", entries: [{ manifest: { identity_key: "provider:publisher:agent:adapter:cli_process:model", identity, capabilities: ["read"], native_reasoning_values: ["high"], effort_mapping: { high: "enhanced" }, transport_descriptor: { executable: { canonical_path: "/private/provider" } } }, certification: { state: "CERTIFIED", adapter_version: "1", platform: "linux-x64", expires_at: "2030-01-01T00:00:00.000Z", observation_fingerprint: "private" }, eligible: true, blockers: [] }] },
  });
  assert.equal(projected.entries[0].eligible, true);
  assert.equal(projected.entries[0].manifest.identity.model_id, "model");
  assert.equal(JSON.stringify(projected).includes("transport_descriptor"), false);
  assert.equal(JSON.stringify(projected).includes("/private/provider"), false);
  assert.equal(Object.hasOwn(projected.entries[0].certification, "observation_fingerprint"), false);
});

test("activation records stay shadow-only until all same-candidate proofs exist", () => {
  const candidateFingerprint = "a".repeat(64);
  const base = { schema_version: "1.0.0", activation_id: "next-development-workflow", revision: 1, mode: "shadow", candidate_fingerprint: candidateFingerprint, evidence: [], transition_evidence: [{ mode: "shadow", fingerprint: "b".repeat(64) }], correctness: { status: "not_run" }, activated_at: null };
  assert.equal(validateActivationRecord(base).mode, "shadow");
  assert.throws(() => validateActivationRecord({ ...base, mode: "enforced" }), /NEXT_WORKFLOW_ACTIVATION_PREMATURE/);
  assert.throws(() => validateActivationRecord({ ...base, candidate_fingerprint: "bad" }), /NEXT_WORKFLOW_ACTIVATION_CANDIDATE_INVALID/);
  assert.throws(() => validateActivationRecord({ ...base, candidate_fingerprint: null }), /NEXT_WORKFLOW_ACTIVATION_CANDIDATE_REQUIRED/);
});

test("default projection derives runs, delegations, relationships, and store health from persisted state", async () => {
  const root = mkdtempSync(path.join(tmpdir(), "next-projection-store-"));
  roots.push(root);
  const store = openWorkflowStateStore({ repositoryRoot: root, expectedIdentity: { repository_logical_id: "repo", checkout_instance_id: "checkout" }, clock: () => "2029-01-01T00:00:00.000Z" });
  const authorityBindings = { task_id: "task", policy_fingerprint: "policy", authority_epoch: 0, revocation_epoch: 0, fresh_until: "2030-01-01T00:00:00.000Z" };
  const grant = createDelegationGrant({ grantId: "grant-one", parent: { agent_id: "orchestrator", depth: 0, role: "Orchestrator Agent", may_delegate: true }, child: { agent_id: "lead", depth: 1, role: "Implementation Lead", parent_agent_id: "orchestrator", may_delegate: true }, scope: { paths: ["tools"] }, authorityFingerprint: "projection-authority", budget: { max_runtime_ms: 100, max_tokens: 100, max_cost: 1, max_retries: 1 }, ownership: { read_only: true, paths: [] }, expiresAt: "2030-01-01T00:00:00.000Z", allowedActions: ["read"], allowedTools: ["rg"], capabilities: ["read"], sandbox: { mode: "read_only", network: false, writable_paths: [] }, now: "2029-01-01T00:00:00.000Z" });
  const authorityVerifier = { trusted: true, independent: true, authority_id: "projection-agent-authority", verify: ({ fingerprint }) => ({ verified: true, authority_id: "projection-agent-authority", fingerprint, proof_fingerprint: teamDigest({ fingerprint, authority: "projection-agent-authority" }) }) };
  persistDelegationGrant({ store, grant, authorityBindings, verifier: authorityVerifier, now: "2029-01-01T00:00:00.000Z" });
  const grantFingerprint = grant.fingerprint;
  store.commitAgentLifecycle({ expectedRevision: store.revision, authorityEpoch: 0, records: [
    { id: "run-observed", kind: "AgentRun", schema_version: "1.0.0", record_revision: 1, authority_scope: "task", lineage_id: "run-lineage", lifecycle_state: "RUNNING", payload: { parent_agent_id: "orchestrator", child_agent_id: "lead", depth: 1, authority_epoch: 0, state_history: ["PLANNED", "RUNNING"], attestation_fingerprint: "attestation", admission_receipt_id: "receipt" }, source_revision: grantFingerprint, policy_fp: "policy", input_fp: "intent" },
  ] });
  const relationship = { relationship_id: "relationship-one", parent_logical_id: "parent", child_logical_id: "child", state: "ACTIVE", authority_epoch: 0, policy_fingerprint: "policy" };
  persistRelationshipInitialization({ store, relationship, evidence: { source: "projection-fixture" }, verifier: { independent: true, verifier_id: "projection-relationship-authority", verify: ({ initialization_fingerprint }) => ({ verified: true, verifier_id: "projection-relationship-authority", initialization_fingerprint, proof_fingerprint: teamDigest({ initialization_fingerprint, authority: "projection-relationship-authority" }) }) }, now: "2029-01-01T00:00:00.000Z" });
  persistResourceCostReservation({ store, reservation: { reservation_id: "projection-reservation", purpose: "launch", grant_fingerprint: grantFingerprint, child_agent_id: "lead", budget: { max_runtime_ms: 100, max_tokens: 100, max_cost: 1, max_retries: 1 }, targets: ["tools"], expires_at: "2030-01-01T00:00:00.000Z" }, authorityBindings, verifier: { trusted: true, independent: true, authority_id: "projection-budget-authority", verify: ({ fingerprint }) => ({ verified: true, authority_id: "projection-budget-authority", fingerprint, proof_fingerprint: teamDigest({ fingerprint, authority: "projection-budget-authority" }) }) }, now: "2029-01-01T00:00:00.000Z" });
  const projection = await loadDefaultNextWorkflowProjection({ repositoryRoot: REPOSITORY_ROOT, providerRegistry: { observed_at: "2029-01-01T00:00:00.000Z", entries: [] }, store, storeStatus: "available" });
  assert.equal(projection.store.status, "healthy");
  assert.equal(projection.team.runs[0].run_id, "run-observed");
  assert.equal(projection.team.delegations[0].grant_id, "grant-one");
  assert.equal(projection.relationships[0].relationship_id, "relationship-one");
  assert.equal(projection.team.budgets.reservations[0].reservation_id, "projection-reservation");
  assert.equal(projection.transaction.status, "settled");
  store.close();
});

function managerFixture() {
  const root = mkdtempSync(path.join(tmpdir(), "next-settings-"));
  roots.push(root);
  mkdirSync(path.join(root, ".workflow-state"));
  const store = openWorkflowStateStore({ repositoryRoot: root, expectedIdentity: { repository_logical_id: "repo", checkout_instance_id: "checkout" } });
  const defaults = { schema_version: "1.0.0", revision: 0, values: [{ scope: "global", subject_id: "default", mode: "auto", identity_key: null, source: "default" }] };
  const registry = { fingerprint: "registry", entries: [{ manifest: { identity_key: "provider", identity: { model_id: "fixture-model" }, priority: 1, estimated_cost: 0, resource_bounds: {}, capabilities: [], native_reasoning_values: ["high"], effort_mapping: { high: "enhanced" } }, blockers: [], eligible: true }] };
  const authority = { decision: "ALLOW", fingerprint: "authority" };
  let now = "2029-01-01T00:00:00.000Z";
  let tokenSequence = 0;
  const manager = createAgentSelectionSettingsManager({ store, defaults, registryProvider: () => registry, authorityProvider: () => authority, teamProvider: () => [{ agent_id: "agent-1", role_id: "role", team_id: "team", repository_id: "repository", context_id: "context" }], clock: () => now, ttlMs: 1000, idFactory: () => `fixture-token-${String(++tokenSequence).padStart(8, "0")}` });
  return { store, manager, setNow: (value) => { now = value; }, registry, authority };
}

test("settings dry-run is revision/fingerprint/expiry bound and grants no authority", () => {
  const { store, manager } = managerFixture();
  const plan = manager.dryRun({ scope: "global", subjectId: "default", mode: "inherit", expectedRevision: 0 });
  assert.equal(plan.grants_authority, false);
  assert.deepEqual(decodeSettingsPlanToken(plan.token), { opaque: true });
  assert.equal(plan.token.includes(plan.plan_fingerprint), false);
  const hash = createHash("sha256").update(plan.token).digest("hex");
  assert.equal(store.getSettingsChangePlan({ tokenHash: hash }).plan.plan_fingerprint, plan.plan_fingerprint);
  assert.throws(() => manager.dryRun({ scope: "global", subjectId: "default", mode: "auto", expectedRevision: 1 }), /SETTINGS_REVISION_CONFLICT/);
  store.close();
});

test("settings apply is atomic, auditable, and stale plans are refused", () => {
  const { store, manager, setNow } = managerFixture();
  const plan = manager.dryRun({ scope: "team", subjectId: "team", mode: "inherit", expectedRevision: 0 });
  assert.throws(() => manager.apply({ token: plan.token, confirm: false }), /SETTINGS_CONFIRMATION_REQUIRED/);
  const receipt = manager.apply({ token: plan.token, confirm: true });
  assert.equal(receipt.revision, 1);
  assert.equal(manager.current().revision, 1);
  assert.throws(() => manager.apply({ token: plan.token, confirm: true }), /SETTINGS_PLAN_ALREADY_USED/);
  const hash = createHash("sha256").update(plan.token).digest("hex");
  assert.equal(store.getSettingsChangePlan({ tokenHash: hash }).state, "used");
  const expiring = manager.dryRun({ scope: "global", subjectId: "default", mode: "auto", expectedRevision: 1 });
  setNow("2029-01-01T00:00:02.000Z");
  assert.throws(() => manager.apply({ token: expiring.token, confirm: true }), /SETTINGS_PLAN_EXPIRED/);
  store.close();
});

test("opaque plans cannot be forged, decoded into authority, replayed, or applied without mandatory recomputation", () => {
  const { store, manager, registry, authority } = managerFixture();
  const plan = manager.dryRun({ scope: "team", subjectId: "team", mode: "inherit", expectedRevision: 0 });
  const selfContainedForgery = Buffer.from(JSON.stringify({ ...plan, blockers: [], grants_authority: true })).toString("base64url");
  assert.throws(() => manager.apply({ token: selfContainedForgery, confirm: true }), /SETTINGS_TOKEN_INVALID/);
  assert.throws(() => manager.apply({ token: "settings-plan-forged-token-that-was-never-persisted", confirm: true }), /SETTINGS_PLAN_NOT_FOUND/);
  registry.entries = [];
  assert.throws(() => manager.apply({ token: plan.token, confirm: true, recompute: false }), /SETTINGS_(?:AUTHORITY_REGISTRY_OR_TEAM_DRIFT|PLAN_LIVE_BLOCKED)/);
  registry.entries = [{ manifest: { identity_key: "provider", identity: { model_id: "fixture-model" }, priority: 1, estimated_cost: 0, resource_bounds: {}, capabilities: [], native_reasoning_values: ["high"], effort_mapping: { high: "enhanced" } }, blockers: [], eligible: true }];
  authority.decision = "DENY";
  assert.throws(() => manager.apply({ token: plan.token, confirm: true, recompute: false }), /SETTINGS_AUTHORITY_REGISTRY_OR_TEAM_DRIFT/);
  authority.decision = "ALLOW";
  manager.apply({ token: plan.token, confirm: true, recompute: false });
  assert.throws(() => manager.apply({ token: plan.token, confirm: true }), /SETTINGS_PLAN_ALREADY_USED/);
  store.close();
});

test("guarded revert creates a fresh dry-run and never deletes history", () => {
  const { store, manager } = managerFixture();
  const plan = manager.dryRun({ scope: "team", subjectId: "team", mode: "inherit", expectedRevision: 0 });
  const receipt = manager.apply({ token: plan.token, confirm: true });
  const revertPlan = manager.revert({ receipt, expectedRevision: 1 });
  assert.equal(revertPlan.base_revision, 1);
  assert.equal(revertPlan.after.revision, 2);
  assert.equal(revertPlan.after.values.some((entry) => entry.scope === "team" && entry.subject_id === "team"), false);
  const persistedReceiptPlan = manager.revertDryRun({ receiptId: receipt.receipt_id, expectedRevision: 1 });
  assert.equal(persistedReceiptPlan.plan_fingerprint, revertPlan.plan_fingerprint);
  assert.throws(() => manager.revertDryRun({ receiptId: "settings-receipt-000000000000000000000000", expectedRevision: 1 }), /SETTINGS_REVERT_RECEIPT_NOT_FOUND/);
  store.close();
});

test("revert restores or deletes only the exact changed key from the persisted receipt", () => {
  const { store, manager } = managerFixture();
  const added = manager.dryRun({ scope: "role", subjectId: "role", mode: "inherit", expectedRevision: 0 });
  const receipt = manager.apply({ token: added.token, confirm: true });
  assert.equal(manager.current().values.some((entry) => entry.scope === "role" && entry.subject_id === "role"), true);
  const forgedReceipt = { ...receipt, settings_before: { revision: 0, values: [] }, change: { scope: "global", subject_id: "default", before_entry: null, after_entry: null } };
  const revertPlan = manager.revert({ receipt: forgedReceipt, expectedRevision: 1 });
  assert.deepEqual(revertPlan.change, { scope: "role", subject_id: "role", before_entry: { scope: "role", subject_id: "role", mode: "inherit", identity_key: null, source: "control_center" }, after_entry: null });
  const reverted = manager.apply({ token: revertPlan.token, confirm: true });
  assert.equal(reverted.settings.values.some((entry) => entry.scope === "role" && entry.subject_id === "role"), false);
  assert.equal(reverted.settings.values.some((entry) => entry.scope === "global" && entry.subject_id === "default"), true);
  store.close();
});

test("Manual mode cannot bypass an empty or uncertified registry", () => {
  const { store, manager } = managerFixture();
  const plan = manager.dryRun({ scope: "global", subjectId: "default", mode: "manual", identityKey: "missing", expectedRevision: 0 });
  assert.ok(plan.blockers.includes("SELECTION_NOT_FOUND"));
  assert.throws(() => manager.apply({ token: plan.token, confirm: true }), /SETTINGS_PLAN_BLOCKED/);
  store.close();
});

test("Auto and Inherit cannot bypass the same affected-agent eligibility floor", () => {
  const { store, manager, registry } = managerFixture();
  registry.entries = [];
  assert.ok(manager.dryRun({ scope: "global", subjectId: "default", mode: "auto", expectedRevision: 0 }).blockers.includes("SELECTION_NOT_FOUND"));
  assert.ok(manager.dryRun({ scope: "team", subjectId: "team", mode: "inherit", expectedRevision: 0 }).blockers.includes("SELECTION_NOT_FOUND"));
  store.close();
});

test("apply rechecks live provider eligibility and rejects certification expiry after planning", () => {
  const root = mkdtempSync(path.join(tmpdir(), "next-settings-live-"));
  roots.push(root);
  mkdirSync(path.join(root, ".workflow-state"));
  const store = openWorkflowStateStore({ repositoryRoot: root, expectedIdentity: { repository_logical_id: "repo", checkout_instance_id: "checkout" } });
  const defaults = { schema_version: "1.0.0", revision: 0, values: [{ scope: "global", subject_id: "default", mode: "auto", identity_key: null, source: "default" }] };
  const manifest = { identity_key: "provider", identity: { model_id: "fixture-model" }, priority: 1, estimated_cost: 0, resource_bounds: {}, capabilities: [], native_reasoning_values: ["high"], effort_mapping: { high: "enhanced" } };
  const authority = { decision: "ALLOW", fingerprint: "authority" };
  let now = "2029-01-01T00:00:00.000Z";
  const registryProvider = ({ issuedAt } = {}) => {
    const expired = Date.parse(issuedAt ?? now) > Date.parse("2029-01-01T00:00:00.250Z");
    return { fingerprint: expired ? "live-expired" : "registry", entries: [{ manifest, eligible: !expired, blockers: expired ? ["CERTIFICATION_EXPIRED"] : [] }] };
  };
  const manager = createAgentSelectionSettingsManager({ store, defaults, registryProvider, authorityProvider: () => authority, teamProvider: () => [{ agent_id: "agent-1", role_id: "role", team_id: "team", repository_id: "repository", context_id: "context" }], clock: () => now, ttlMs: 1000, idFactory: () => "fixture-token-live-expiry-00000001" });
  const plan = manager.dryRun({ scope: "team", subjectId: "team", mode: "inherit", expectedRevision: 0 });
  assert.deepEqual(plan.blockers, []);
  now = "2029-01-01T00:00:00.500Z";
  assert.throws(() => manager.apply({ token: plan.token, confirm: true }), /SETTINGS_PLAN_LIVE_BLOCKED:CERTIFICATION_EXPIRED/);
  store.close();
});

test("separate CLI processes preserve the untrusted-provider blocker", () => {
  const stateRoot = path.join(REPOSITORY_ROOT, ".workflow-state");
  mkdirSync(stateRoot, { recursive: true });
  const root = mkdtempSync(path.join(stateRoot, "settings-cli-test-"));
  roots.push(root);
  const databasePath = path.join(root, "workflow.sqlite");
  const registryPath = path.join(root, "provider-registry.json");
  const identity = { execution_provider_id: "settings-fixture", model_publisher_id: "fixture", agent_product_id: "fixture-agent", adapter_id: "fixture-cli", transport_id: "cli_process", model_id: "fixture-model" };
  const manifest = { manifest_id: "settings-cli-fixture", version: "1.0.0", identity, capabilities: [], native_reasoning_values: [], effort_mapping: {}, reasoning_mapping_provenance: { source_id: "settings-cli-fixture", revision: "1", reviewed_by: "fixture-reviewer", proof_fingerprint: teamDigest("settings-cli-fixture-effort-mapping") }, selection_profile: { correctness: 0, safety: 0, efficiency: 0, roles: [] }, certification_profile: { probe_authority: "independent", certification_authority: "independent", isolated_probe: true }, resource_bounds: { cost: 0 }, priority: 1, estimated_cost: 0, transport_descriptor: { argv_template: ["exec", "--ephemeral", "--sandbox", "{{sandbox}}", "--model", "{{model_id}}", "-c", "{{reasoning_config}}", "--cd", "{{working_directory}}", "--output-last-message", "{{response_file}}", "{{stdin_marker}}"], argv_schema: ["sandbox", "model_id", "reasoning_config", "working_directory", "response_file", "stdin_marker"], environment_allowlist: [], private_response_file: true, executable: { canonical_path: "/usr/bin/true", digest: "not-launched" } } };
  const identityKey = Object.values(identity).join(":");
  const certificationProof = teamDigest("settings-fixture-certification-proof");
  const certificationCore = { certification_id: "settings-cli-fixture-certification", certifier_id: "settings-fixture-certifier", identity_key: identityKey, manifest_version: "1.0.0", adapter_version: "1", platform: `${process.platform}-${process.arch}`, manifest_fingerprint: providerManifestFingerprint(manifest), capability_fingerprint: createHash("sha256").update(JSON.stringify([])).digest("hex"), state: "CERTIFIED", certified_at: "2026-01-01T00:00:00.000Z", expires_at: "2030-01-01T00:00:00.000Z", revocation_epoch: 0, revocation_state: "active", observation_fingerprint: createHash("sha256").update(JSON.stringify("fixture-observation")).digest("hex"), probe_lineage: "settings-fixture-probe", probe_authority_id: "settings-fixture-probe-authority", probe_fingerprint: createHash("sha256").update(JSON.stringify("probe")).digest("hex"), certification_proof_fingerprint: certificationProof, clock_fingerprint: createHash("sha256").update(JSON.stringify({ certified_at: "2026-01-01T00:00:00.000Z", expires_at: "2030-01-01T00:00:00.000Z" }, Object.keys({ certified_at: 1, expires_at: 1 }).sort())).digest("hex"), authority_fingerprint: teamDigest({ certifier_id: "settings-fixture-certifier", probe_authority_id: "settings-fixture-probe-authority", certification_proof_fingerprint: certificationProof }) };
  const driftEvidence = { identity_key: certificationCore.identity_key, manifest_version: certificationCore.manifest_version, adapter_version: certificationCore.adapter_version, platform: certificationCore.platform, manifest_fingerprint: certificationCore.manifest_fingerprint, capability_fingerprint: certificationCore.capability_fingerprint, observation_fingerprint: certificationCore.observation_fingerprint, revocation_epoch: certificationCore.revocation_epoch };
  const certification = { ...certificationCore, drift_fingerprint: createHash("sha256").update(JSON.stringify(driftEvidence, Object.keys(driftEvidence).sort())).digest("hex") };
  writeFileSync(registryPath, `${JSON.stringify({ schema_version: "1.0.0", registry_id: "settings-cli-test", revision: 1, activation_mode: "planned", entries: [{ manifest, certification }], custom_entries: [] })}\n`, { mode: 0o600 });
  const toolPath = path.join(REPOSITORY_ROOT, "tools", "next-workflow.mjs");
  const environment = { ...process.env, NEXT_WORKFLOW_STORE_PATH: databasePath, NEXT_WORKFLOW_PROVIDER_REGISTRY_FILE: registryPath };
  delete environment.NODE_TEST_CONTEXT;
  const run = (arguments_) => {
    const result = spawnSync(process.execPath, ["--no-warnings", toolPath, ...arguments_], { cwd: REPOSITORY_ROOT, env: environment, encoding: "utf8" });
    assert.equal(result.status, 0, result.stderr || result.stdout);
    assert.notEqual(result.stdout, "", JSON.stringify({ signal: result.signal, error: result.error?.message ?? null, stderr: result.stderr }));
    return JSON.parse(result.stdout);
  };
  const plan = run(["settings", "dry-run", "--scope", "team", "--subject", "next-development-workflow-team", "--mode", "inherit", "--expect-revision", "0"]);
  assert.equal(plan.grants_authority, false);
  assert.match(plan.authority_fingerprint, /^[a-f0-9]{64}$/);
  assert.ok(plan.blockers.includes("CERTIFICATION_PROVENANCE_UNTRUSTED"));
  const refused = spawnSync(process.execPath, ["--no-warnings", toolPath, "settings", "apply", "--token", plan.token, "--confirm"], { cwd: REPOSITORY_ROOT, env: environment, encoding: "utf8" });
  assert.notEqual(refused.status, 0);
  assert.match(refused.stderr, /SETTINGS_PLAN_BLOCKED:[^\n]*CERTIFICATION_PROVENANCE_UNTRUSTED/);
});

test("CLI provider-registry overrides remain repository-bound and reject symlinks", () => {
  const repositoryStateRoot = path.join(REPOSITORY_ROOT, ".workflow-state");
  mkdirSync(repositoryStateRoot, { recursive: true });
  const insideRoot = mkdtempSync(path.join(repositoryStateRoot, "registry-boundary-test-"));
  const outsideRoot = mkdtempSync(path.join(tmpdir(), "registry-outside-test-"));
  roots.push(insideRoot, outsideRoot);
  const registryBody = `${JSON.stringify({ schema_version: "1.0.0", registry_id: "boundary-fixture", revision: 1, activation_mode: "planned", entries: [], custom_entries: [] })}\n`;
  const insideTarget = path.join(insideRoot, "registry.json");
  const insideLink = path.join(insideRoot, "registry-link.json");
  const outsideTarget = path.join(outsideRoot, "registry.json");
  writeFileSync(insideTarget, registryBody, { mode: 0o600 });
  writeFileSync(outsideTarget, registryBody, { mode: 0o600 });
  symlinkSync(insideTarget, insideLink);
  const toolPath = path.join(REPOSITORY_ROOT, "tools", "next-workflow.mjs");
  const run = (registryPath) => spawnSync(process.execPath, ["--no-warnings", toolPath, "settings", "catalog"], {
    cwd: REPOSITORY_ROOT,
    env: { ...process.env, NEXT_WORKFLOW_STORE_PATH: path.join(insideRoot, "workflow.sqlite"), NEXT_WORKFLOW_PROVIDER_REGISTRY_FILE: registryPath },
    encoding: "utf8",
  });
  const outside = run(outsideTarget);
  assert.notEqual(outside.status, 0);
  assert.match(outside.stderr, /NEXT_WORKFLOW_CONFIG_OUTSIDE_REPOSITORY/);
  const symlink = run(insideLink);
  assert.notEqual(symlink.status, 0);
  assert.match(symlink.stderr, /NEXT_WORKFLOW_CONFIG_SYMLINK_FORBIDDEN/);
  const inside = run(insideTarget);
  assert.equal(inside.status, 0, inside.stderr);
});

test("status, catalog, activation, and projection commands do not initialize identity or SQLite state", () => {
  const repositoryStateRoot = path.join(REPOSITORY_ROOT, ".workflow-state");
  mkdirSync(repositoryStateRoot, { recursive: true });
  const isolated = mkdtempSync(path.join(repositoryStateRoot, "read-only-cli-test-"));
  roots.push(isolated);
  const identityPath = path.join(isolated, "checkout-identity.json");
  const databasePath = path.join(isolated, "workflow.sqlite");
  const toolPath = path.join(REPOSITORY_ROOT, "tools", "next-workflow.mjs");
  const environment = { ...process.env, NEXT_WORKFLOW_CHECKOUT_IDENTITY_PATH: identityPath, NEXT_WORKFLOW_STORE_PATH: databasePath };
  for (const arguments_ of [["identity", "status"], ["store-health"], ["activation", "status"], ["runtime", "status"], ["settings", "catalog"], ["projection"]]) {
    const result = spawnSync(process.execPath, ["--no-warnings", toolPath, ...arguments_], { cwd: REPOSITORY_ROOT, env: environment, encoding: "utf8" });
    assert.equal(result.status, 0, result.stderr || result.stdout);
    assert.doesNotThrow(() => JSON.parse(result.stdout));
  }
  assert.equal(existsSync(identityPath), false);
  assert.equal(existsSync(databasePath), false);
  assert.equal(existsSync(`${databasePath}-wal`), false);
  assert.equal(existsSync(`${databasePath}-shm`), false);
});
