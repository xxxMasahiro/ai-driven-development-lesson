#!/usr/bin/env node
import assert from "node:assert/strict";
import { chmodSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { authorityFingerprint, composeAuthorityDecision, createSideEffectGateway as createGateway, effectReceiptBindingFingerprint } from "./lib/next_workflow/authority.mjs";
import { createProtectedFinalizationFenceVerifier, createProtectedReceiptAuthority, loadProtectedRuntimeTrust } from "./lib/next_workflow/runtime_trust.mjs";
import { openWorkflowStateStore } from "./lib/next_workflow/store.mjs";

const roots = [];
const gatewayReceiptIssuers = new WeakMap();
const alternateGatewayReceiptIssuers = new WeakMap();
test.after(() => roots.forEach((root) => rmSync(root, { recursive: true, force: true })));

function createSideEffectGateway(options) {
  const operationalReceiptVerifier = options.receiptVerifier === receiptVerifier ? gatewayReceiptIssuers.get(options.store) : options.receiptVerifier;
  return createGateway({ ...options, receiptVerifier: operationalReceiptVerifier });
}

function bindings(overrides = {}) {
  return { repository_logical_id: "repo", checkout_instance_id: "checkout", task_id: "task", run_id: "run", target_id: "target", instruction_fingerprint: "instruction", policy_fingerprint: "policy", settings_revision: "settings-1", runtime_capability_fingerprint: "runtime", revocation_epoch: 2, approvals: [], ...overrides };
}

function sources({ action = "push", target = "target", freshUntil = "2030-01-01T00:00:00.000Z", includeProduct = true, includeParent = false, managedChild = false, overrides = {} } = {}) {
  const kinds = ["target_invariant", "saved_settings", "task_scope", "rigor", "instruction", "runtime_capability", ...(includeProduct ? ["product_ceiling"] : []), ...(includeParent ? ["parent_management"] : [])];
  return kinds.map((kind) => ({ kind, source_id: `${kind}-source`, decision: "allow", revision: "1", fingerprint: `${kind}-fp`, fresh_until: freshUntil, revocation_epoch: 2, actions: [action], targets: [target], duties: [{ id: `duty-${kind}`, input: { action }, owner: `owner-${kind}` }], resource_ceilings: { cost: 100 }, rigor_floor: "L1", ...(kind === "target_invariant" ? { repository_management: managedChild ? "managed_child" : "parent" } : {}), ...(overrides[kind] ?? {}) }));
}

function gitSubject(overrides = {}) {
  return {
    branch: "feature",
    remote: "origin",
    ref: "refs/heads/feature",
    tree_sha: "tree-before",
    head_sha: "head-before",
    effect_intent_fingerprint: "git-effect-intent",
    expected_provider_object: "refs/heads/feature@head-before",
    request_fingerprint: "request-fingerprint",
    ...overrides
  };
}

function providerSubject(overrides = {}) {
  return {
    provider_identity_fingerprint: "provider-identity",
    configuration_fingerprint: "provider-configuration",
    request_fingerprint: "provider-request",
    expected_provider_object: "provider-object",
    ...overrides
  };
}

function receiptVerifier({ effect, intent, observation }) {
  const effectId = intent?.effect_id ?? effect?.effect_id;
  return {
    verified: true,
    proof_record_id: `proof-${effectId}`,
    owner: "effect-adapter-owner",
    verifier: "independent-receipt-verifier",
    observation_fingerprint: observation.fingerprint,
    effect_identity_fingerprint: effectReceiptBindingFingerprint({ intent, observation }),
    proof_fingerprint: authorityFingerprint({ effect_id: effectId, observation: observation.fingerprint })
  };
}

const receiptStoreVerifier = {
  trusted: true,
  independent: true,
  verifier_id: "independent-receipt-verifier",
  verify({ proof_record: proofRecord, effect_identity_fingerprint: effectIdentityFingerprint, fingerprint }) {
    if (proofRecord.payload.effect_identity_fingerprint !== effectIdentityFingerprint) return false;
    return { verified: true, verifier_id: "independent-receipt-verifier", fingerprint, proof_fingerprint: proofRecord.payload.proof_fingerprint };
  }
};

function matchedResult(intent, overrides = {}) {
  return {
    state: "matched",
    status: "succeeded",
    effect_key: intent.effect_key,
    request_fingerprint: intent.request_fp,
    authority_decision_id: intent.authority_fp,
    target_id: intent.target_id,
    operation: intent.operation,
    object_selector: intent.expected_selector,
    object_identity: "remote-object",
    observation_fingerprint: "after",
    ...overrides,
  };
}

const releaseProofKinds = ["local_release", "pr_ci", "main_ci", "local_remote_sync", "recovery", "fenced_rollback", "archive_decommission", "outbox_disposition"];
const candidateFingerprint = "a".repeat(64);
const enforcedActivation = () => {
  const summaryFingerprint = "f".repeat(64);
  return { schema_version: "1.0.0", activation_id: "next-development-workflow", authority_epoch: 2, mode: "enforced", candidate_fingerprint: candidateFingerprint, revision: 7, evidence: releaseProofKinds.map((kind, index) => ({ kind, status: "passed", candidate_fingerprint: candidateFingerprint, fingerprint: String(index + 1).padStart(64, "0") })), signed_release_proofs: Object.fromEntries(releaseProofKinds.map((kind) => [kind, { kind }])), signed_transition_proofs: ["shadow", "release_verified", "recovery_verified", "rollback_verified", "archive_decommission_verified", "ready"].map((kind) => ({ kind })), transition_evidence: ["shadow", "release_verified", "recovery_verified", "rollback_verified", "archive_decommission_verified", "ready", "enforced"].map((mode, index) => ({ mode, fingerprint: String(index + 11).padStart(64, "0") })), proof_summary: { status: "passed", candidate_fingerprint: candidateFingerprint, fingerprint: summaryFingerprint }, correctness: { status: "passed", fingerprint: summaryFingerprint }, activated_at: "2029-01-01T00:00:00.000Z" };
};
const activationVerifier = ({ record_fingerprint }) => ({ trusted: true, record_fingerprint, proof_fingerprint: authorityFingerprint({ record_fingerprint, trust_owner: "release-owner" }) });
const currentCandidateProvider = () => ({ candidate_fingerprint: candidateFingerprint, repository_head: "b".repeat(40) });
const reconciliationAuthorizer = ({ intent }) => ({ decision: "ALLOW", original_authority_fingerprint: intent.authority_fp, target_id: intent.target_id, operation: intent.operation, current_revocation_epoch: 2, fresh_until: "2030-01-01T00:00:00.000Z", proof_fingerprint: authorityFingerprint({ effect_id: intent.effect_id, authority: intent.authority_fp }) });

test("authority composes an exact allow decision from the full intersection", () => {
  const decision = composeAuthorityDecision({ variant: "git_effect", action: "push", subject: gitSubject(), bindings: bindings(), sources: sources(), now: "2029-01-01T00:00:00.000Z" });
  assert.equal(decision.decision, "ALLOW");
  assert.equal(decision.target_id, "target");
  assert.equal(decision.revocation_epoch, 2);
  assert.equal(decision.resource_ceilings.cost, 100);
  assert.equal(decision.duties.length, 7);
  assert.deepEqual(decision.duties.find((duty) => duty.id === "duty-task_scope"), { id: "duty-task_scope", input: { action: "push" }, owner: "owner-task_scope" });
  assert.match(decision.fingerprint, /^[a-f0-9]{64}$/);
});

test("authority rejects source-list overrides, duplicate kinds or IDs, invalid epochs, and invalid timestamps", () => {
  const input = { variant: "git_effect", action: "push", subject: gitSubject(), bindings: bindings(), sources: sources(), now: "2029-01-01T00:00:00.000Z" };
  assert.throws(() => composeAuthorityDecision({ ...input, bindings: bindings({ required_source_kinds: [] }) }), /AUTHORITY_REQUIRED_SOURCE_KINDS_OVERRIDE_FORBIDDEN/);
  assert.throws(() => composeAuthorityDecision({ ...input, sources: [...sources(), { ...sources()[0], source_id: "different-id" }] }), /AUTHORITY_SOURCE_KIND_DUPLICATE/);
  const duplicateId = sources();
  duplicateId[1].source_id = duplicateId[0].source_id;
  assert.throws(() => composeAuthorityDecision({ ...input, sources: duplicateId }), /AUTHORITY_SOURCE_ID_DUPLICATE/);
  for (const revocation_epoch of [Infinity, NaN, 1.5, "2"]) {
    assert.throws(() => composeAuthorityDecision({ ...input, sources: sources({ overrides: { task_scope: { revocation_epoch } } }) }), /AUTHORITY_SOURCE_EPOCH_INVALID/);
    assert.throws(() => composeAuthorityDecision({ ...input, bindings: bindings({ revocation_epoch }) }), /AUTHORITY_BINDING_EPOCH_INVALID/);
  }
  assert.throws(() => composeAuthorityDecision({ ...input, now: "not-a-time" }), /AUTHORITY_NOW_INVALID/);
  assert.throws(() => composeAuthorityDecision({ ...input, sources: sources({ freshUntil: "not-a-time" }) }), /AUTHORITY_SOURCE_FRESHNESS_INVALID/);
  assert.throws(() => composeAuthorityDecision({ ...input, sources: sources({ overrides: { rigor: { rigor_floor: "NOT_A_LEVEL" } } }) }), /AUTHORITY_RIGOR_FLOOR_INVALID/);
  assert.throws(() => composeAuthorityDecision({ ...input, sources: sources({ overrides: { task_scope: { kind: "invented_source" } } }) }), /AUTHORITY_SOURCE_KIND_INVALID/);
  assert.throws(() => composeAuthorityDecision({ ...input, subject: {} }), /AUTHORITY_SUBJECT_FIELD_REQUIRED/);
});

test("duties must be structured and retain id, input, and owner", () => {
  const input = { variant: "git_effect", action: "push", subject: gitSubject(), bindings: bindings(), now: "2029-01-01T00:00:00.000Z" };
  assert.throws(() => composeAuthorityDecision({ ...input, sources: sources({ overrides: { task_scope: { duties: ["forgeable-duty"] } } }) }), /AUTHORITY_DUTY_INVALID/);
  assert.throws(() => composeAuthorityDecision({ ...input, sources: sources({ overrides: { task_scope: { duties: [{ id: "duty", owner: "owner" }] } } }) }), /AUTHORITY_DUTY_INPUT_REQUIRED/);
});

test("missing, stale, denied, wrong-epoch, action, target, and approval sources fail closed", () => {
  const cases = [
    [sources().slice(1), bindings(), "MISSING_AUTHORITY_SOURCE"],
    [sources({ freshUntil: "2020-01-01T00:00:00.000Z" }), bindings(), "AUTHORITY_STALE"],
    [sources({ overrides: { task_scope: { decision: "deny" } } }), bindings(), "SOURCE_DENIED"],
    [sources({ overrides: { task_scope: { revocation_epoch: 1 } } }), bindings(), "REVOCATION_EPOCH_MISMATCH"],
    [sources({ overrides: { task_scope: { actions: ["commit"] } } }), bindings(), "ACTION_OUTSIDE_INTERSECTION"],
    [sources({ overrides: { task_scope: { targets: ["other"] } } }), bindings(), "TARGET_OUTSIDE_INTERSECTION"],
    [sources({ overrides: { task_scope: { required_approvals: ["git_push_operation_approval"] } } }), bindings(), "APPROVAL_REQUIRED"]
  ];
  for (const [inputSources, inputBindings, code] of cases) {
    assert.equal(composeAuthorityDecision({ variant: "git_effect", action: "push", subject: gitSubject(), bindings: inputBindings, sources: inputSources, now: "2029-01-01T00:00:00.000Z" }).code, code);
  }
  const approval = { reason: "git_push_operation_approval", approval_id: "approval-1", repository_logical_id: "repo", checkout_instance_id: "checkout", target_id: "target", task_id: "task", run_id: "run", operation: "git_effect:push", request_fingerprint: "request-fingerprint", policy_revision: "policy", settings_revision: "settings-1", authority_epoch: 2, issued_at: "2028-12-31T00:00:00.000Z", fresh_until: "2030-01-01T00:00:00.000Z", proof_fingerprint: authorityFingerprint({ approval_id: "approval-1", signer: "developer-authority" }) };
  const approvalSources = sources({ overrides: { task_scope: { required_approvals: ["git_push_operation_approval"] } } });
  const approvalInput = { variant: "git_effect", action: "push", subject: gitSubject(), bindings: bindings({ approvals: [approval] }), sources: approvalSources, now: "2029-01-01T00:00:00.000Z" };
  assert.throws(() => composeAuthorityDecision(approvalInput), /AUTHORITY_APPROVAL_VERIFIER_REQUIRED/);
  const forgedVerifier = { trusted: true, independent: true, verifier_id: "approval-verifier", verify: ({ binding_fingerprint }) => ({ verified: true, verifier_id: "approval-verifier", approval_id: approval.approval_id, proof_fingerprint: "caller-string", binding_fingerprint }) };
  assert.throws(() => composeAuthorityDecision({ ...approvalInput, approvalVerifier: forgedVerifier }), /AUTHORITY_APPROVAL_PROOF_INVALID/);
  const approvalVerifier = { ...forgedVerifier, verify: ({ binding_fingerprint }) => ({ verified: true, verifier_id: "approval-verifier", approval_id: approval.approval_id, proof_fingerprint: approval.proof_fingerprint, binding_fingerprint }) };
  assert.equal(composeAuthorityDecision({ ...approvalInput, approvalVerifier }).decision, "ALLOW");
});

test("managed child and provider variants require their exact extra sources", () => {
  assert.throws(() => composeAuthorityDecision({ variant: "git_effect", action: "push", subject: gitSubject(), bindings: bindings({ managed_child: true }), sources: sources(), now: "2029-01-01T00:00:00.000Z" }), /AUTHORITY_BINDING_REQUIRED:parent_instance_id/);
  assert.throws(() => composeAuthorityDecision({ variant: "git_effect", action: "push", subject: gitSubject(), bindings: bindings({ managed_child: true, parent_instance_id: "parent" }), sources: sources(), now: "2029-01-01T00:00:00.000Z" }), /AUTHORITY_BINDING_REQUIRED:relationship_id/);
  assert.equal(composeAuthorityDecision({ variant: "git_effect", action: "push", subject: gitSubject(), bindings: bindings({ managed_child: true, parent_instance_id: "parent", relationship_id: "relationship" }), sources: sources({ managedChild: true }), now: "2029-01-01T00:00:00.000Z" }).code, "MISSING_AUTHORITY_SOURCE");
  assert.equal(composeAuthorityDecision({ variant: "git_effect", action: "push", subject: gitSubject(), bindings: bindings({ managed_child: true, parent_instance_id: "parent", relationship_id: "relationship" }), sources: sources({ includeParent: true, managedChild: true }), now: "2029-01-01T00:00:00.000Z" }).decision, "ALLOW");
  assert.equal(composeAuthorityDecision({ variant: "provider_effect", action: "invoke", subject: providerSubject(), bindings: bindings(), sources: sources({ action: "invoke", includeProduct: false }), now: "2029-01-01T00:00:00.000Z" }).code, "MISSING_AUTHORITY_SOURCE");
});

function fixtureStore() {
  const root = mkdtempSync(path.join(tmpdir(), "next-authority-"));
  const trustRoot = mkdtempSync(path.join(tmpdir(), "next-authority-trust-"));
  roots.push(root, trustRoot);
  chmodSync(root, 0o700);
  chmodSync(trustRoot, 0o700);
  mkdirSync(path.join(root, ".workflow-state"));
  const activationFingerprint = authorityFingerprint({ mode: "enforced", candidate_fingerprint: candidateFingerprint, repository_head: "b".repeat(40), revision: 7 });
  const trustPath = path.join(trustRoot, "owner-trust.json");
  writeFileSync(trustPath, JSON.stringify({ schema_version: "1.0.0", trust_source_id: "authority-test-trust", revision: 1, repository_logical_id: "repo", checkout_instance_id: "checkout", issued_at: "2028-01-01T00:00:00.000Z", expires_at: "2030-01-01T00:00:00.000Z", release_trust: {}, release_prerequisites: {}, runtime_authorities: { "authority-test-receipt": { authority_id: "authority-test-receipt", kind: "receipt_proof", enabled: true, revision: 1, source: "owner_protected_deterministic_binding", owner_id: "authority-test-adapter-owner" }, "authority-test-receipt-alternate": { authority_id: "authority-test-receipt-alternate", kind: "receipt_proof", enabled: true, revision: 1, source: "owner_protected_deterministic_binding", owner_id: "authority-test-alternate-owner" }, "authority-test-finalization": { authority_id: "authority-test-finalization", kind: "finalization_fence", enabled: true, revision: 1, source: "owner_protected_live_fence" } } }), { mode: 0o600 });
  const runtimeTrust = loadProtectedRuntimeTrust({ repositoryRoot: root, repositoryLogicalId: "repo", checkoutInstanceId: "checkout", trustPath, now: "2029-01-01T00:00:00.000Z" });
  const receiptAuthority = createProtectedReceiptAuthority({ runtimeTrust, authorityId: "authority-test-receipt" });
  const alternateReceiptAuthority = createProtectedReceiptAuthority({ runtimeTrust, authorityId: "authority-test-receipt-alternate" });
  const finalizationFenceVerifier = createProtectedFinalizationFenceVerifier({ runtimeTrust, authorityId: "authority-test-finalization", activationFingerprintProvider: () => activationFingerprint, policyRevisionProvider: () => "policy", settingsRevisionProvider: () => "settings-1", authorityEpochProvider: () => 2 });
  const store = openWorkflowStateStore({ repositoryRoot: root, expectedIdentity: { repository_logical_id: "repo", checkout_instance_id: "checkout" }, receiptProofVerifier: receiptAuthority.verifier, finalizationFenceVerifier, protectedRuntimeVerifiers: true });
  gatewayReceiptIssuers.set(store, receiptAuthority.issuer);
  alternateGatewayReceiptIssuers.set(store, alternateReceiptAuthority.issuer);
  store.fence({ reason: "fixture-authority-epoch-1", expectedEpoch: 0 });
  store.fence({ reason: "fixture-authority-epoch-2", expectedEpoch: 1 });
  return { root, store };
}

test("gateway grants no new side-effect authority before enforced activation", async () => {
  const { store } = fixtureStore();
  let observed = false;
  const adapter = { async observe() { observed = true; return { fingerprint: "same" }; }, async dispatch() { throw new Error("must not run"); }, matches() { return true; } };
  const gateway = createSideEffectGateway({ store, adapters: { git_effect: adapter }, sourceProvider: () => sources(), activationProvider: () => ({ schema_version: "1.0.0", activation_id: "next-development-workflow", mode: "planned", candidate_fingerprint: null, revision: 1, evidence: [] }), activationVerifier, currentCandidateProvider, reconciliationAuthorizer, receiptVerifier });
  const preview = await gateway.preview({ variant: "git_effect", action: "push", subject: gitSubject(), bindings: bindings(), target: {}, request: {} });
  assert.equal(preview.decision.code, "NEXT_WORKFLOW_NOT_ENFORCED");
  assert.equal(observed, false);
  await assert.rejects(() => gateway.execute({ variant: "git_effect", action: "push", subject: gitSubject(), bindings: bindings(), target: {}, request: {} }), /SIDE_EFFECT_DENIED:NEXT_WORKFLOW_NOT_ENFORCED/);
  store.close();
});

test("gateway denies an enforced activation when the current repository candidate has drifted", async () => {
  const { store } = fixtureStore();
  let observed = false;
  const adapter = { async observe() { observed = true; return { fingerprint: "same" }; } };
  const gateway = createSideEffectGateway({ store, adapters: { git_effect: adapter }, sourceProvider: () => sources(), activationProvider: enforcedActivation, activationVerifier, currentCandidateProvider: () => ({ candidate_fingerprint: "d".repeat(64), repository_head: "e".repeat(40) }), reconciliationAuthorizer, receiptVerifier });
  const preview = await gateway.preview({ variant: "git_effect", action: "push", subject: gitSubject(), bindings: bindings(), target: {}, request: {} });
  assert.equal(preview.decision.code, "NEXT_WORKFLOW_CANDIDATE_DRIFT");
  assert.equal(observed, false);
  store.close();
});

test("gateway stops when activation changes before dispatch", async () => {
  const { store } = fixtureStore();
  let activationCalls = 0;
  let dispatched = false;
  const adapter = { async observe() { return { fingerprint: "same" }; }, async dispatch() { dispatched = true; }, matches() { return true; } };
  const gateway = createSideEffectGateway({ store, adapters: { git_effect: adapter }, sourceProvider: () => sources(), activationProvider: () => (++activationCalls === 1 ? enforcedActivation() : { ...enforcedActivation(), mode: "rolled_back", revision: 2 }), activationVerifier, currentCandidateProvider, reconciliationAuthorizer, receiptVerifier, clock: () => "2029-01-01T00:00:00.000Z" });
  await assert.rejects(() => gateway.execute({ variant: "git_effect", action: "push", subject: gitSubject(), bindings: bindings(), target: {}, request: {} }), /SIDE_EFFECT_ACTIVATION_BLOCKED:NEXT_WORKFLOW_NOT_ENFORCED/);
  assert.equal(dispatched, false);
  store.close();
});

test("gateway re-observes, re-fetches authority, independently verifies proof, and atomically delivers before reconciliation", async () => {
  const { store } = fixtureStore();
  let objectState = "before";
  let dispatchSawIntent = false;
  let sourceFetches = 0;
  const adapter = {
    async observe() { return objectState === "before" ? { fingerprint: objectState, object_identity: "remote-object" } : { ...matchedResult(store.getIntent("effect-fixed")), fingerprint: objectState }; },
    async dispatch({ effect_id }) { dispatchSawIntent = store.getIntent(effect_id)?.state === "DISPATCHING"; objectState = "after"; return { ok: true }; },
    matches({ observation }) { return observation.fingerprint === "after"; },
    async reconcile(intent) { return matchedResult(intent); }
  };
  const gateway = createSideEffectGateway({ store, adapters: { git_effect: adapter }, sourceProvider: () => { sourceFetches += 1; return sources(); }, activationProvider: enforcedActivation, activationVerifier, currentCandidateProvider, reconciliationAuthorizer, receiptVerifier, clock: () => "2029-01-01T00:00:00.000Z", idFactory: () => "fixed" });
  const result = await gateway.execute({ variant: "git_effect", action: "push", subject: gitSubject(), bindings: bindings(), target: { remote: "origin" }, request: { ref: "feature" }, expected_selector: { sha: "after" } });
  assert.equal(dispatchSawIntent, true);
  assert.equal(sourceFetches, 2);
  assert.equal(store.getIntent(result.effect_id).state, "RECONCILED");
  assert.equal(store.getOutbox({ intentId: result.effect_id }).state, "delivered");
  assert.equal(store.getReceipt(result.effect_id).proof_record_id, result.proof_record_id);
  assert.equal(store.get({ id: result.proof_record_id }).kind, "EffectReceiptProof");
  assert.equal(result.receipt_id, `receipt-${result.effect_id}`);
  assert.equal((await gateway.reconcile(result.effect_id)).reused, true);
  store.close();
});

test("gateway rechecks caller-owned immutable delivery immediately before finalization", async () => {
  const { store } = fixtureStore();
  let objectState = "before";
  const adapter = {
    async observe() { return objectState === "before" ? { fingerprint: "before", object_identity: "remote-object" } : { ...matchedResult(store.getIntent("effect-delivery-race")), fingerprint: "after" }; },
    async dispatch() { objectState = "after"; return { ok: true }; },
    matches({ observation }) { return observation.fingerprint === "after"; },
  };
  const gateway = createSideEffectGateway({ store, adapters: { git_effect: adapter }, sourceProvider: () => sources(), activationProvider: enforcedActivation, activationVerifier, currentCandidateProvider, reconciliationAuthorizer, receiptVerifier, clock: () => "2029-01-01T00:00:00.000Z", idFactory: () => "delivery-race" });
  await assert.rejects(() => gateway.execute({ variant: "git_effect", action: "push", subject: gitSubject(), bindings: bindings(), target: {}, request: {}, expected_selector: { sha: "after" } }, { beforeFinalize: () => { throw new Error("TASK_DELIVERY_CHANGED"); } }), /TASK_DELIVERY_CHANGED/);
  assert.equal(store.getIntent("effect-delivery-race").state, "DISPATCHING");
  assert.equal(store.getReceipt("effect-delivery-race"), undefined);
  assert.equal(store.getOutbox({ intentId: "effect-delivery-race" }).state, "sending");
  store.close();
});

test("gateway refuses authority drift or a second non-allow decision before dispatch", async () => {
  for (const mutateSecond of [
    (second) => { second[0].fingerprint = "changed-source"; },
    (second) => { second[0].decision = "deny"; }
  ]) {
    const { store } = fixtureStore();
    let calls = 0;
    let dispatched = false;
    const adapter = { async observe() { return { fingerprint: "same" }; }, async dispatch() { dispatched = true; }, matches() { return true; } };
    const gateway = createSideEffectGateway({ store, adapters: { git_effect: adapter }, sourceProvider: () => { calls += 1; const value = sources(); if (calls === 2) mutateSecond(value); return value; }, activationProvider: enforcedActivation, activationVerifier, currentCandidateProvider, reconciliationAuthorizer, receiptVerifier, clock: () => "2029-01-01T00:00:00.000Z" });
    await assert.rejects(() => gateway.execute({ variant: "git_effect", action: "push", subject: gitSubject(), bindings: bindings(), target: {}, request: {} }), /AUTHORITY_CHANGED_BEFORE_DISPATCH|SIDE_EFFECT_REVALIDATION_DENIED/);
    assert.equal(dispatched, false);
    assert.equal(store.revision, 2);
    store.close();
  }
});

test("gateway snapshots bindings so caller mutation cannot retarget a dispatched effect", async () => {
  const { store } = fixtureStore();
  let calls = 0;
  let dispatched = false;
  const effect = { variant: "git_effect", action: "push", subject: gitSubject(), bindings: bindings(), target: {}, request: {} };
  const adapter = {
    async observe() { return dispatched ? { ...matchedResult(store.getIntent("effect-snapshot")), fingerprint: "after" } : { fingerprint: "before" }; },
    async dispatch({ effect: dispatchedEffect }) { dispatched = dispatchedEffect.bindings.target_id === "target"; },
    matches() { return true; }
  };
  const gateway = createSideEffectGateway({ store, adapters: { git_effect: adapter }, sourceProvider: () => { calls += 1; if (calls === 1) effect.bindings.target_id = "mutated-target"; return sources(); }, activationProvider: enforcedActivation, activationVerifier, currentCandidateProvider, reconciliationAuthorizer, receiptVerifier, clock: () => "2029-01-01T00:00:00.000Z", idFactory: () => "snapshot" });
  const result = await gateway.execute(effect);
  assert.equal(dispatched, true);
  assert.equal(result.decision.target_id, "target");
  store.close();
});

test("gateway requires a protected receipt issuer and rejects a forged issuer before intent creation", async () => {
  const { store } = fixtureStore();
  assert.throws(() => createSideEffectGateway({ store, adapters: {}, sourceProvider: () => [], activationProvider: enforcedActivation, activationVerifier, currentCandidateProvider, reconciliationAuthorizer }), /GATEWAY_INDEPENDENT_RECEIPT_VERIFIER_REQUIRED/);
  let dispatched = false;
  const adapter = { async observe() { return dispatched ? { ...matchedResult(store.getIntent("effect-forged"), { observation_fingerprint: "same" }), fingerprint: "same" } : { fingerprint: "same" }; }, async dispatch() { dispatched = true; return { ok: true }; }, matches() { return true; } };
  const gateway = createSideEffectGateway({ store, adapters: { git_effect: adapter }, sourceProvider: () => sources(), activationProvider: enforcedActivation, activationVerifier, currentCandidateProvider, reconciliationAuthorizer, receiptVerifier: (input) => ({ ...receiptVerifier(input), owner: "same-party", verifier: "same-party" }), clock: () => "2029-01-01T00:00:00.000Z", idFactory: () => "forged" });
  await assert.rejects(() => gateway.execute({ variant: "git_effect", action: "push", subject: gitSubject(), bindings: bindings(), target: {}, request: {} }), /PROTECTED_GATEWAY_OPERATIONAL_AUTHORITY_REQUIRED/);
  assert.equal(store.getIntent("effect-forged"), undefined);
  store.close();
});

test("gateway refuses target TOCTOU before dispatch", async () => {
  const { store } = fixtureStore();
  let count = 0;
  const adapter = { async observe() { count += 1; return { fingerprint: `state-${count}` }; }, async dispatch() { throw new Error("must not run"); }, matches() { return true; } };
  const gateway = createSideEffectGateway({ store, adapters: { git_effect: adapter }, sourceProvider: () => sources(), activationProvider: enforcedActivation, activationVerifier, currentCandidateProvider, reconciliationAuthorizer, receiptVerifier, clock: () => "2029-01-01T00:00:00.000Z" });
  await assert.rejects(() => gateway.execute({ variant: "git_effect", action: "push", subject: gitSubject(), bindings: bindings(), target: {}, request: {} }), /TARGET_CHANGED_BEFORE_DISPATCH/);
  assert.equal(store.revision, 2);
  store.close();
});

test("gateway refuses an authority epoch fenced between decision and atomic intent commit", async () => {
  const { store } = fixtureStore();
  let sourceFetches = 0;
  let dispatched = false;
  const adapter = { async observe() { return { fingerprint: "same" }; }, async dispatch() { dispatched = true; }, matches() { return true; } };
  const gateway = createSideEffectGateway({
    store,
    adapters: { git_effect: adapter },
    sourceProvider: () => {
      sourceFetches += 1;
      if (sourceFetches === 2) store.fence({ reason: "revoked-before-intent-commit", expectedEpoch: 2 });
      return sources();
    },
    activationProvider: enforcedActivation,
    activationVerifier,
    currentCandidateProvider,
    reconciliationAuthorizer,
    receiptVerifier,
    clock: () => "2029-01-01T00:00:00.000Z",
    idFactory: () => "epoch-commit"
  });
  await assert.rejects(() => gateway.execute({ variant: "git_effect", action: "push", subject: gitSubject(), bindings: bindings(), target: {}, request: {} }), /AUTHORITY_EPOCH_STALE/);
  assert.equal(dispatched, false);
  assert.equal(store.getIntent("effect-epoch-commit"), undefined);
  store.close();
});

test("gateway quarantines a claimed effect when authority is fenced immediately before dispatch", async () => {
  const { store } = fixtureStore();
  let dispatched = false;
  const originalClaimEffectDispatch = store.claimEffectDispatch;
  store.claimEffectDispatch = (input) => {
    const claimed = originalClaimEffectDispatch(input);
    store.fence({ reason: "revoked-after-dispatch-claim", expectedEpoch: input.authorityEpoch });
    return claimed;
  };
  const adapter = { async observe() { return { fingerprint: "same" }; }, async dispatch() { dispatched = true; }, matches() { return true; } };
  const gateway = createSideEffectGateway({ store, adapters: { git_effect: adapter }, sourceProvider: () => sources(), activationProvider: enforcedActivation, activationVerifier, currentCandidateProvider, reconciliationAuthorizer, receiptVerifier, clock: () => "2029-01-01T00:00:00.000Z", idFactory: () => "epoch-race" });
  await assert.rejects(() => gateway.execute({ variant: "git_effect", action: "push", subject: gitSubject(), bindings: bindings(), target: {}, request: {} }), /SIDE_EFFECT_AUTHORITY_EPOCH_STALE_BEFORE_DISPATCH/);
  assert.equal(dispatched, false);
  assert.equal(store.getIntent("effect-epoch-race").state, "MANUAL_RECOVERY_REQUIRED");
  assert.equal(store.getOutbox({ intentId: "effect-epoch-race" }).state, "quarantined");
  store.close();
});

test("unknown dispatch outcomes stop and can only be reconciled by observation", async () => {
  const { store } = fixtureStore();
  const adapter = {
    async observe() { return { fingerprint: "same" }; },
    async dispatch() { throw new Error("transport lost"); },
    matches() { return false; },
    async reconcile(intent) { return matchedResult(intent, { observation_fingerprint: "same" }); }
  };
  const gateway = createSideEffectGateway({ store, adapters: { git_effect: adapter }, sourceProvider: () => sources(), activationProvider: enforcedActivation, activationVerifier, currentCandidateProvider, reconciliationAuthorizer, receiptVerifier, clock: () => "2029-01-01T00:00:00.000Z", idFactory: () => "unknown" });
  await assert.rejects(() => gateway.execute({ variant: "git_effect", action: "push", subject: gitSubject(), bindings: bindings(), target: {}, request: {} }), /SIDE_EFFECT_OUTCOME_UNKNOWN/);
  assert.equal(store.getIntent("effect-unknown").state, "UNKNOWN");
  assert.equal((await gateway.reconcile("effect-unknown")).state, "RECONCILED");
  assert.equal(store.getOutbox({ intentId: "effect-unknown" }).state, "delivered");
  store.close();
});

test("reconciliation cannot persist or reuse a receipt without independent proof", async () => {
  const { store } = fixtureStore();
  const adapter = {
    async observe() { return { fingerprint: "same" }; },
    async dispatch() { throw new Error("transport lost"); },
    matches() { return false; },
    async reconcile(intent) { return matchedResult(intent, { observation_fingerprint: "same" }); }
  };
  const alternateIssuer = alternateGatewayReceiptIssuers.get(store);
  const gateway = createSideEffectGateway({ store, adapters: { git_effect: adapter }, sourceProvider: () => sources(), activationProvider: enforcedActivation, activationVerifier, currentCandidateProvider, reconciliationAuthorizer, receiptVerifier: alternateIssuer, clock: () => "2029-01-01T00:00:00.000Z", idFactory: () => "proof-check" });
  await assert.rejects(() => gateway.execute({ variant: "git_effect", action: "push", subject: gitSubject(), bindings: bindings(), target: {}, request: {} }), /SIDE_EFFECT_OUTCOME_UNKNOWN/);
  await assert.rejects(() => gateway.reconcile("effect-proof-check"), /RECONCILIATION_PROOF_VERIFIER_MISMATCH/);
  assert.equal(store.getReceipt("effect-proof-check"), undefined);
  const correctGateway = createSideEffectGateway({ store, adapters: { git_effect: adapter }, sourceProvider: () => sources(), activationProvider: enforcedActivation, activationVerifier, currentCandidateProvider, reconciliationAuthorizer, receiptVerifier, clock: () => "2029-01-01T00:00:00.000Z", idFactory: () => "proof-check" });
  await correctGateway.reconcile("effect-proof-check");
  assert.ok(store.getReceipt("effect-proof-check"));
  store.close();
});

test("reconciliation rejects a different external effect identity before any receipt is persisted", async () => {
  const { store } = fixtureStore();
  const adapter = {
    async observe() { return { fingerprint: "same" }; },
    async dispatch() { throw new Error("transport lost"); },
    matches() { return false; },
    async reconcile(intent) { return matchedResult(intent, { effect_key: "different-effect" }); }
  };
  const gateway = createSideEffectGateway({ store, adapters: { git_effect: adapter }, sourceProvider: () => sources(), activationProvider: enforcedActivation, activationVerifier, currentCandidateProvider, reconciliationAuthorizer, receiptVerifier, clock: () => "2029-01-01T00:00:00.000Z", idFactory: () => "wrong-object" });
  await assert.rejects(() => gateway.execute({ variant: "git_effect", action: "push", subject: gitSubject(), bindings: bindings(), target: {}, request: {}, expected_selector: { sha: "after" } }), /SIDE_EFFECT_OUTCOME_UNKNOWN/);
  const reconciled = await gateway.reconcile("effect-wrong-object");
  assert.equal(reconciled.state, "CONFLICT");
  assert.equal(reconciled.code, "EFFECT_IDENTITY_MISMATCH");
  assert.equal(store.getReceipt("effect-wrong-object"), undefined);
  store.close();
});

test("fencing increments revocation epoch before later work", () => {
  const { store } = fixtureStore();
  const gateway = createSideEffectGateway({ store, adapters: {}, sourceProvider: () => [], activationProvider: enforcedActivation, activationVerifier, currentCandidateProvider, reconciliationAuthorizer, receiptVerifier });
  const revision = store.revision;
  assert.throws(() => gateway.fence({ scope: "relationship", reason: "stale", expectedEpoch: 1 }), /FENCE_EPOCH_CONFLICT/);
  assert.equal(store.revocation_epoch, 2);
  assert.equal(store.revision, revision);
  assert.equal(gateway.fence({ scope: "relationship", reason: "emergency", expectedEpoch: 2 }).revocation_epoch, 3);
  store.close();
});
