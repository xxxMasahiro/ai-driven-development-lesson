#!/usr/bin/env node
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { copyFileSync, existsSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { DatabaseSync } from "node:sqlite";
import { effectReceiptBindingFingerprint } from "./lib/next_workflow/authority.mjs";
import { releaseDigest } from "./lib/next_workflow/release.mjs";
import { createFinalizationFenceVerifier } from "./lib/next_workflow/runtime_trust.mjs";
import { importLegacyRecords, importWorkflowStateStore, openWorkflowStateStore, readLegacyJsonlState, readLegacyTsvState, restoreWorkflowStateStore, verifyBackupManifest } from "./lib/next_workflow/store.mjs";

const roots = [];
test.after(() => roots.forEach((root) => rmSync(root, { recursive: true, force: true })));

function fixture() {
  const root = mkdtempSync(path.join(tmpdir(), "next-workflow-store-"));
  roots.push(root);
  const state = path.join(root, ".workflow-state");
  mkdirSync(state, { mode: 0o700 });
  const identity = { repository_logical_id: "repo-fixture", checkout_instance_id: "checkout-fixture", parent_instance_id: "parent-fixture", relationship_id: "relationship-fixture" };
  return { root, state, databasePath: path.join(state, "workflow.sqlite"), identity };
}

function record(id = "record-1") {
  return { id, kind: "WorkflowTask", schema_version: "1.0.0", authority_scope: "task-1", lineage_id: "lineage-1", lifecycle_state: "planned", payload: { title: "safe fixture" }, source_revision: "source-1", policy_fp: "policy-1", input_fp: "input-1" };
}

function effect(effectId = "effect-1") {
  return { effect_id: effectId, effect_key: `key-${effectId}`, request_fp: `request-${effectId}`, authority_fp: `authority-${effectId}`, target_id: "target-1", operation: "push", expected_selector: {}, attempt_lineage: `attempt-${effectId}`, task_id: "task-1", run_id: "run-1", authority_epoch: 0, decision_expires_at: "2030-01-01T00:00:00.000Z", settings_revision: "settings-1", policy_revision: "policy-1", activation_fp: "b".repeat(64), approval_ids: [], binding_fingerprint: createHash("sha256").update(`binding:${effectId}`).digest("hex") };
}

function receiptProof(id, effectId = "effect-1", observationFingerprint = "observation", verificationMode = "dispatch") {
  const proofFingerprint = createHash("sha256").update(`${id}:${effectId}:${observationFingerprint}`).digest("hex");
  const effectIdentityFingerprint = effectReceiptBindingFingerprint({ intent: { ...effect(effectId), expected_selector: {} }, observation: { object_identity: "object", fingerprint: observationFingerprint } });
  return {
    id,
    kind: "EffectReceiptProof",
    schema_version: "1.0.0",
    authority_scope: "target-1",
    lineage_id: effectId,
    lifecycle_state: "verified",
    payload: {
      effect_id: effectId,
      owner: "effect-owner",
      verifier: "independent-verifier",
      observation_fingerprint: observationFingerprint,
      effect_identity_fingerprint: effectIdentityFingerprint,
      proof_fingerprint: proofFingerprint,
      verification_mode: verificationMode
    },
    source_revision: "independent-receipt-verifier",
    policy_fp: `authority-${effectId}`,
    input_fp: proofFingerprint
  };
}

const receiptProofVerifier = {
  trusted: true,
  independent: true,
  verifier_id: "independent-verifier",
  verify({ proof_record: proofRecord, effect_identity_fingerprint: effectIdentityFingerprint, fingerprint }) {
    if (proofRecord.payload.effect_identity_fingerprint !== effectIdentityFingerprint) return false;
    return { verified: true, verifier_id: "independent-verifier", fingerprint, proof_fingerprint: proofRecord.payload.proof_fingerprint };
  }
};

const defaultFinalizationFenceVerifier = createFinalizationFenceVerifier({ verifierId: "default-finalization-owner", activationFingerprintProvider: () => "b".repeat(64), policyRevisionProvider: () => "policy-1", settingsRevisionProvider: () => "settings-1", authorityEpochProvider: () => 0 });

function finalizationFenceFor(value = effect()) {
  return { activation_fingerprint: value.activation_fp, policy_revision: value.policy_revision, settings_revision: value.settings_revision, authority_epoch: value.authority_epoch, decision_expires_at: value.decision_expires_at };
}

function updateBackupManifestDigest(backup) {
  const manifest = JSON.parse(readFileSync(backup.manifest_path, "utf8"));
  manifest.database_digest = createHash("sha256").update(readFileSync(backup.destination)).digest("hex");
  writeFileSync(backup.manifest_path, `${JSON.stringify(manifest)}\n`);
}

const stateTransferVerifier = {
  trusted: true,
  independent: true,
  verifier_id: "independent-state-transfer-verifier",
  verify({ fingerprint }) {
    return { verified: true, verifier_id: "independent-state-transfer-verifier", fingerprint, proof_fingerprint: createHash("sha256").update(`state-transfer:${fingerprint}`).digest("hex") };
  }
};

test("store atomically commits canonical state, event, intent, and outbox", () => {
  const f = fixture();
  const store = openWorkflowStateStore({ repositoryRoot: f.root, databasePath: f.databasePath, expectedIdentity: f.identity });
  const result = store.commit({
    expectedRevision: 0,
    authorityEpoch: 0,
    records: [record()],
    events: [{ event_id: "event-1", aggregate_id: "record-1", event_type: "TASK_PLANNED", payload: { safe: true } }],
    evidenceRefs: ["evidence-1"],
    effectIntent: { ...effect("effect-1"), effect_key: "key-1", request_fp: "request-1", authority_fp: "authority-1", expected_selector: { ref: "refs/heads/feature" }, attempt_lineage: "attempt-1" },
    outboxItem: { outbox_id: "outbox-1", intent_id: "effect-1", message_fp: "message-1", sequence: 1 }
  });
  assert.equal(result.revision, 1);
  assert.equal(store.get({ id: "record-1" }).payload.title, "safe fixture");
  assert.equal(store.getIntent("effect-1").state, "PREPARED");
  assert.equal(store.health().ok, true);
  store.close();
});

test("optimistic revision and duplicate idempotency keys fail closed", () => {
  const f = fixture();
  const store = openWorkflowStateStore({ repositoryRoot: f.root, databasePath: f.databasePath, expectedIdentity: f.identity });
  store.commit({ expectedRevision: 0, records: [record()] });
  assert.throws(() => store.commit({ expectedRevision: 0 }), /REVISION_CONFLICT/);
  assert.throws(() => store.commit({ expectedRevision: 1, records: [record()] }), /UNIQUE constraint/);
  assert.equal(store.revision, 1);
  store.close();

  const raced = fixture();
  let competitor;
  let injectRace = false;
  const first = openWorkflowStateStore({ repositoryRoot: raced.root, databasePath: raced.databasePath, expectedIdentity: raced.identity, clock: () => {
    if (injectRace) {
      injectRace = false;
      competitor.commit({ expectedRevision: competitor.revision, records: [record("competing-commit")] });
    }
    return "2029-01-01T00:00:00.000Z";
  } });
  competitor = openWorkflowStateStore({ repositoryRoot: raced.root, databasePath: raced.databasePath, expectedIdentity: raced.identity });
  injectRace = true;
  assert.throws(() => first.commit({ expectedRevision: 0, records: [record("stale-commit")] }), /REVISION_CONFLICT/);
  assert.equal(first.get({ id: "stale-commit" }), undefined);
  assert.equal(first.get({ id: "competing-commit" }).id, "competing-commit");
  competitor.close();
  first.close();

  const fenced = fixture();
  let fenceCompetitor;
  let injectFenceRace = false;
  const fenceOwner = openWorkflowStateStore({ repositoryRoot: fenced.root, databasePath: fenced.databasePath, expectedIdentity: fenced.identity, clock: () => {
    if (injectFenceRace) {
      injectFenceRace = false;
      fenceCompetitor.commit({ expectedRevision: fenceCompetitor.revision, records: [record("competing-fence-commit")] });
    }
    return "2029-01-01T00:00:00.000Z";
  } });
  fenceCompetitor = openWorkflowStateStore({ repositoryRoot: fenced.root, databasePath: fenced.databasePath, expectedIdentity: fenced.identity });
  injectFenceRace = true;
  assert.throws(() => fenceOwner.fence({ reason: "stale-revision-fence", expectedEpoch: 0, expectedRevision: 0 }), /REVISION_CONFLICT/);
  assert.equal(fenceOwner.revocation_epoch, 0);
  const fencedResult = fenceOwner.fence({ reason: "current-fence", expectedEpoch: 0 });
  assert.equal(fencedResult.revocation_epoch, 1);
  const fencedRevision = fenceOwner.revision;
  assert.throws(() => fenceOwner.fence({ reason: "stale-epoch-fence", expectedEpoch: 0 }), /FENCE_EPOCH_CONFLICT/);
  assert.equal(fenceOwner.revocation_epoch, 1);
  assert.equal(fenceOwner.revision, fencedRevision);
  fenceCompetitor.close();
  fenceOwner.close();
});

test("runtime approvals are exact-bound, independently issued, atomically one-use, and replay-safe", () => {
  const f = fixture();
  const now = "2029-01-01T00:00:00.000Z";
  const store = openWorkflowStateStore({ repositoryRoot: f.root, databasePath: f.databasePath, expectedIdentity: f.identity, clock: () => now });
  const approval = {
    reason: "l5_scope_approval",
    approval_id: "approval-1",
    repository_logical_id: f.identity.repository_logical_id,
    checkout_instance_id: f.identity.checkout_instance_id,
    task_id: "task-1",
    run_id: "run-1",
    operation: "provider_effect:invoke",
    target_id: "target-1",
    request_fingerprint: "request-1",
    policy_revision: "policy-1",
    settings_revision: "settings-1",
    authority_epoch: 0,
    issued_at: "2028-12-31T00:00:00.000Z",
    fresh_until: "2030-01-01T00:00:00.000Z",
    proof_fingerprint: "a".repeat(64),
  };
  const issuer = { trusted: true, independent: true, verifier_id: "owner-approval-verifier", verify: ({ binding_fingerprint: bindingFingerprint, fingerprint }) => ({ verified: true, verifier_id: "owner-approval-verifier", fingerprint, binding_fingerprint: bindingFingerprint, proof_fingerprint: approval.proof_fingerprint }) };
  store.issueRuntimeApproval({ expectedRevision: 0, approval, verifier: issuer });
  const verifier = store.runtimeApprovalVerifier();
  const stored = store.getRuntimeApproval({ approvalId: approval.approval_id });
  const verified = verifier.verify({ approval, binding_fingerprint: stored.binding_fp, decision_time: now });
  assert.equal(verified.verified, true);

  const approvedEffect = { ...effect("effect-approved"), effect_key: "approval-key", request_fp: approval.request_fingerprint, operation: approval.operation, target_id: approval.target_id, task_id: approval.task_id, run_id: approval.run_id, policy_revision: approval.policy_revision, settings_revision: approval.settings_revision, approval_ids: [approval.approval_id] };
  store.commit({ expectedRevision: 1, authorityEpoch: 0, effectIntent: approvedEffect, outboxItem: { outbox_id: "outbox-approved", intent_id: approvedEffect.effect_id, message_fp: "message-approved", sequence: 1 }, approvalUses: [approval.approval_id] });
  assert.equal(store.getRuntimeApproval({ approvalId: approval.approval_id }).state, "consumed");
  assert.equal(verifier.verify({ approval, binding_fingerprint: stored.binding_fp, decision_time: now }).verified, false);

  const replay = store.commit({ expectedRevision: 2, authorityEpoch: 0, effectIntent: { ...approvedEffect, effect_id: "effect-retry" }, outboxItem: { outbox_id: "outbox-retry", intent_id: "effect-retry", message_fp: "message-retry", sequence: 1 }, approvalUses: [approval.approval_id] });
  assert.equal(replay.reused, true);
  assert.equal(replay.effect_id, approvedEffect.effect_id);
  assert.throws(() => store.commit({ expectedRevision: 2, authorityEpoch: 0, effectIntent: { ...approvedEffect, effect_id: "effect-conflict", request_fp: "different-request" }, outboxItem: { outbox_id: "outbox-conflict", intent_id: "effect-conflict", message_fp: "message-conflict", sequence: 1 }, approvalUses: [approval.approval_id] }), /EFFECT_IDEMPOTENCY_PAYLOAD_CONFLICT/);
  assert.equal(store.listRuntimeConflicts({ conflictKind: "effect" }).length, 1);
  assert.throws(() => store.commit({ expectedRevision: 3, authorityEpoch: 0, effectIntent: { ...approvedEffect, effect_id: "effect-second", effect_key: "second-key" }, outboxItem: { outbox_id: "outbox-second", intent_id: "effect-second", message_fp: "message-second", sequence: 1 }, approvalUses: [approval.approval_id] }), /RUNTIME_APPROVAL_CONSUMPTION_BINDING_INVALID/);
  store.close();
});

test("receipt finalization atomically rejects live settings or authority fence changes", () => {
  const f = fixture();
  let settingsRevision = "settings-1";
  let authorityEpoch = 0;
  const activationFingerprint = "b".repeat(64);
  const finalizationFenceVerifier = createFinalizationFenceVerifier({ verifierId: "finalization-owner", activationFingerprintProvider: () => activationFingerprint, policyRevisionProvider: () => "policy-1", settingsRevisionProvider: () => settingsRevision, authorityEpochProvider: () => authorityEpoch });
  const store = openWorkflowStateStore({ repositoryRoot: f.root, databasePath: f.databasePath, expectedIdentity: f.identity, receiptProofVerifier, finalizationFenceVerifier, clock: () => "2029-01-01T00:00:00.000Z" });
  const fencedEffect = { ...effect(), activation_fp: activationFingerprint };
  store.commit({ expectedRevision: 0, authorityEpoch: 0, effectIntent: fencedEffect, outboxItem: { outbox_id: "outbox-1", intent_id: "effect-1", message_fp: "message-1", sequence: 1 } });
  store.claimEffectDispatch({ effectId: "effect-1", outboxId: "outbox-1", authorityEpoch: 0 });
  store.transitionIntent({ effectId: "effect-1", expectedState: "DISPATCHING", nextState: "OBSERVED" });
  const proof = receiptProof("proof-finalization");
  const receipt = { receipt_id: "receipt-finalization", intent_id: "effect-1", object_identity: "object", observation_fp: "observation", proof_record_id: proof.id, result: "matched" };
  const finalizationFence = { activation_fingerprint: activationFingerprint, policy_revision: "policy-1", settings_revision: "settings-1", authority_epoch: 0, decision_expires_at: fencedEffect.decision_expires_at };
  settingsRevision = "settings-2";
  assert.throws(() => store.finalizeReconciliation({ expectedRevision: 1, effectId: "effect-1", records: [proof], receipt, finalizationFence }), /EFFECT_FINALIZATION_FENCE_VERIFICATION_FAILED/);
  assert.equal(store.getIntent("effect-1").state, "OBSERVED");
  settingsRevision = "settings-1";
  store.fence({ reason: "revoke-before-finalization", expectedEpoch: 0 });
  authorityEpoch = 1;
  assert.throws(() => store.finalizeReconciliation({ expectedRevision: 2, effectId: "effect-1", records: [proof], receipt, finalizationFence }), /EFFECT_FINALIZATION_AUTHORITY_EPOCH_STALE/);
  assert.equal(store.getReceipt("effect-1"), undefined);
  store.close();
});

test("runtime runs are idempotent, compare-and-set, and recovered before ordinary writes", () => {
  const f = fixture();
  const now = "2029-01-01T00:00:00.000Z";
  const run = {
    run_id: "runtime-run-1",
    idempotency_key: "runtime-idempotency-1",
    plan_fingerprint: createHash("sha256").update("runtime-plan-1").digest("hex"),
    authority_epoch: 0,
    fence_fingerprint: createHash("sha256").update("runtime-fence-1").digest("hex"),
    start_nonce: "runtime-start-nonce-1",
    started_at: now,
    observation: { selected_model: "gpt-5.6-sol", selected_effort: "high" },
  };
  let store = openWorkflowStateStore({ repositoryRoot: f.root, databasePath: f.databasePath, expectedIdentity: f.identity, clock: () => now });
  const created = store.createRuntimeRun({ expectedRevision: 0, run });
  assert.equal(created.run.state, "STARTING");
  assert.equal(store.createRuntimeRun({ expectedRevision: 1, run }).reused, true);
  assert.throws(() => store.createRuntimeRun({ expectedRevision: 1, run: { ...run, plan_fingerprint: createHash("sha256").update("different-runtime-plan").digest("hex") } }), /RUNTIME_RUN_IDEMPOTENCY_CONFLICT/);
  assert.equal(store.listRuntimeConflicts({ conflictKind: "runtime_run" }).length, 1);
  const running = store.transitionRuntimeRun({ expectedRevision: 2, runId: run.run_id, expectedStates: ["STARTING"], nextState: "RUNNING", patch: { pid: 1234, process_group_id: 1234, observation: { selected_model: "gpt-5.6-sol", selected_effort: "high", actual_model: "gpt-5.6-sol", actual_effort: "high" } } });
  assert.equal(running.run.process_group_id, 1234);
  assert.throws(() => store.transitionRuntimeRun({ expectedRevision: 3, runId: run.run_id, expectedStates: ["STARTING"], nextState: "FAILED" }), /RUNTIME_RUN_STATE_CONFLICT/);
  store.close();

  store = openWorkflowStateStore({ repositoryRoot: f.root, databasePath: f.databasePath, expectedIdentity: f.identity, clock: () => now });
  assert.equal(store.recovery_only, true);
  assert.equal(store.recovery_state.runs[0].run_id, run.run_id);
  assert.throws(() => store.commit({ expectedRevision: 3, records: [record("blocked-during-runtime-recovery")] }), /STORE_RECOVERY_ONLY/);
  const completed = store.transitionRuntimeRun({ expectedRevision: 3, runId: run.run_id, expectedStates: ["RUNNING"], nextState: "COMPLETED", patch: { exit_code: 0, result_fingerprint: createHash("sha256").update("runtime-result-1").digest("hex"), result_size: 42 }, recovery: true });
  assert.equal(completed.run.state, "COMPLETED");
  assert.equal(store.recovery_only, false);
  store.close();
});

test("raw secret-shaped fields are refused before a transaction", () => {
  const f = fixture();
  const store = openWorkflowStateStore({ repositoryRoot: f.root, databasePath: f.databasePath, expectedIdentity: f.identity });
  const unsafe = record();
  unsafe.payload = { api_key: "not-a-real-secret" };
  assert.throws(() => store.commit({ expectedRevision: 0, records: [unsafe] }), /RAW_SECRET_FIELD_FORBIDDEN/);
  assert.equal(store.revision, 0);
  store.close();
});

test("intent transitions are compare-and-set and fencing increments the epoch", () => {
  const f = fixture();
  const store = openWorkflowStateStore({ repositoryRoot: f.root, databasePath: f.databasePath, expectedIdentity: f.identity });
  store.commit({ expectedRevision: 0, authorityEpoch: 0, effectIntent: { ...effect("effect-1"), effect_key: "key-1", request_fp: "request-1", authority_fp: "authority-1", operation: "push", attempt_lineage: "attempt-1" }, outboxItem: { outbox_id: "outbox-1", intent_id: "effect-1", message_fp: "message-1", sequence: 1 } });
  assert.equal(store.transitionIntent({ effectId: "effect-1", expectedState: "PREPARED", nextState: "DISPATCHING" }).state, "DISPATCHING");
  assert.throws(() => store.transitionIntent({ effectId: "effect-1", expectedState: "PREPARED", nextState: "OBSERVED" }), /EFFECT_STATE_TRANSITION_INVALID/);
  assert.throws(() => store.transitionIntent({ effectId: "effect-1", expectedState: "DISPATCHING", nextState: "PREPARED" }), /EFFECT_STATE_TRANSITION_INVALID/);
  assert.equal(store.fence({ reason: "test" }).revocation_epoch, 1);
  assert.equal(store.fence({ reason: "test-again" }).revocation_epoch, 2);
  assert.throws(() => store.commit({ expectedRevision: store.revision, authorityEpoch: 0, records: [record("stale-authority-write")] }), /AUTHORITY_EPOCH_STALE/);
  assert.equal(store.get({ id: "stale-authority-write" }), undefined);
  store.close();
});

test("effect persistence and dispatch claims are atomically bound to the live authority epoch", () => {
  const f = fixture();
  const store = openWorkflowStateStore({ repositoryRoot: f.root, databasePath: f.databasePath, expectedIdentity: f.identity });
  assert.throws(() => store.commit({ expectedRevision: 0, effectIntent: effect(), outboxItem: { outbox_id: "outbox-1", intent_id: "effect-1", message_fp: "message-1", sequence: 1 } }), /EFFECT_AUTHORITY_EPOCH_REQUIRED/);
  store.commit({ expectedRevision: 0, authorityEpoch: 0, effectIntent: effect(), outboxItem: { outbox_id: "outbox-1", intent_id: "effect-1", message_fp: "message-1", sequence: 1 } });
  store.fence({ reason: "revoke-before-claim", expectedEpoch: 0 });
  assert.throws(() => store.claimEffectDispatch({ effectId: "effect-1", outboxId: "outbox-1", authorityEpoch: 0 }), /AUTHORITY_EPOCH_STALE/);
  assert.equal(store.getIntent("effect-1").state, "PREPARED");
  assert.equal(store.getOutbox({ intentId: "effect-1" }).state, "pending");
  store.close();
});

test("outbox transitions are compare-and-set and reject terminal-state replay", () => {
  const f = fixture();
  const store = openWorkflowStateStore({ repositoryRoot: f.root, databasePath: f.databasePath, expectedIdentity: f.identity });
  store.commit({ expectedRevision: 0, authorityEpoch: 0, effectIntent: effect(), outboxItem: { outbox_id: "outbox-1", intent_id: "effect-1", message_fp: "message-1", sequence: 1 } });
  assert.equal(store.transitionOutbox({ outboxId: "outbox-1", expectedState: "pending", nextState: "sending" }).state, "sending");
  assert.equal(store.getOutbox({ intentId: "effect-1" }).attempts, 1);
  assert.throws(() => store.transitionOutbox({ outboxId: "outbox-1", expectedState: "sending", nextState: "delivered" }), /OUTBOX_DELIVERY_FINALIZER_REQUIRED/);
  assert.equal(store.transitionOutbox({ outboxId: "outbox-1", expectedState: "sending", nextState: "quarantined" }).state, "quarantined");
  assert.throws(() => store.transitionOutbox({ outboxId: "outbox-1", expectedState: "quarantined", nextState: "sending" }), /OUTBOX_STATE_TRANSITION_INVALID/);
  store.close();
});

test("outbox delivery and RECONCILED are one transaction and cannot be bypassed", () => {
  const f = fixture();
  let competitor;
  let injectRace = false;
  const store = openWorkflowStateStore({ repositoryRoot: f.root, databasePath: f.databasePath, expectedIdentity: f.identity, receiptProofVerifier, finalizationFenceVerifier: defaultFinalizationFenceVerifier, clock: () => {
    if (injectRace) {
      injectRace = false;
      competitor.commit({ expectedRevision: competitor.revision, records: [record("competing-finalizer-commit")] });
    }
    return "2029-01-01T00:00:00.000Z";
  } });
  competitor = openWorkflowStateStore({ repositoryRoot: f.root, databasePath: f.databasePath, expectedIdentity: f.identity });
  store.commit({ expectedRevision: 0, authorityEpoch: 0, effectIntent: effect(), outboxItem: { outbox_id: "outbox-1", intent_id: "effect-1", message_fp: "message-1", sequence: 1 } });
  store.transitionIntent({ effectId: "effect-1", expectedState: "PREPARED", nextState: "DISPATCHING" });
  store.transitionOutbox({ outboxId: "outbox-1", expectedState: "pending", nextState: "sending" });
  store.transitionIntent({ effectId: "effect-1", expectedState: "DISPATCHING", nextState: "OBSERVED" });
  assert.throws(() => store.transitionIntent({ effectId: "effect-1", expectedState: "OBSERVED", nextState: "RECONCILED" }), /EFFECT_RECONCILIATION_FINALIZER_REQUIRED/);
  assert.throws(() => store.finalizeReconciliation({ expectedRevision: store.revision, effectId: "effect-1", receipt: { receipt_id: "receipt-1", intent_id: "effect-1", object_identity: "object", observation_fp: "observation", proof_record_id: "missing-proof", result: "matched" } }), /RECONCILIATION_PROOF_RECORD_REQUIRED/);
  for (const [kind, code] of [["DelegationGrant", /AGENT_AUTHORITY_RECORD_WRITER_REQUIRED/], ["Relationship", /RELATIONSHIP_LIFECYCLE_WRITER_REQUIRED/], ["NextWorkflowActivation", /ACTIVATION_LIFECYCLE_WRITER_REQUIRED/]]) {
    const forgedId = `forged-${kind}`;
    assert.throws(() => store.finalizeReconciliation({ expectedRevision: store.revision, effectId: "effect-1", records: [{ ...record(forgedId), kind }], receipt: { receipt_id: `receipt-${forgedId}`, intent_id: "effect-1", object_identity: "object", observation_fp: "observation", proof_record_id: forgedId, result: "matched" } }), code);
    assert.equal(store.get({ id: forgedId }), undefined);
  }
  assert.equal(store.getIntent("effect-1").state, "OBSERVED");
  assert.equal(store.getOutbox({ intentId: "effect-1" }).state, "sending");
  const unverifiedStore = openWorkflowStateStore({ repositoryRoot: f.root, databasePath: f.databasePath, expectedIdentity: f.identity, finalizationFenceVerifier: defaultFinalizationFenceVerifier });
  assert.throws(() => unverifiedStore.finalizeReconciliation({ expectedRevision: unverifiedStore.revision, effectId: "effect-1", recovery: true, records: [receiptProof("proof-unverified")], receipt: { receipt_id: "receipt-unverified", intent_id: "effect-1", object_identity: "object", observation_fp: "observation", proof_record_id: "proof-unverified", result: "matched" } }), /RECONCILIATION_PROOF_VERIFIER_REQUIRED/);
  unverifiedStore.close();
  injectRace = true;
  assert.throws(() => store.finalizeReconciliation({ expectedRevision: store.revision, effectId: "effect-1", records: [receiptProof("proof-raced")], receipt: { receipt_id: "receipt-raced", intent_id: "effect-1", object_identity: "object", observation_fp: "observation", proof_record_id: "proof-raced", result: "matched" } }), /REVISION_CONFLICT/);
  assert.equal(store.get({ id: "proof-raced" }), undefined);
  store.finalizeReconciliation({ expectedRevision: store.revision, effectId: "effect-1", records: [receiptProof("proof-1")], receipt: { receipt_id: "receipt-1", intent_id: "effect-1", object_identity: "object", observation_fp: "observation", proof_record_id: "proof-1", result: "matched" }, finalizationFence: finalizationFenceFor() });
  assert.equal(store.getOutbox({ intentId: "effect-1" }).state, "delivered");
  assert.equal(store.getIntent("effect-1").state, "RECONCILED");
  competitor.close();
  store.close();
});

test("intent and outbox terminal states cannot be injected at initial commit", () => {
  const f = fixture();
  const store = openWorkflowStateStore({ repositoryRoot: f.root, databasePath: f.databasePath, expectedIdentity: f.identity });
  assert.throws(() => store.commit({ expectedRevision: 0, authorityEpoch: 0, effectIntent: { ...effect(), state: "RECONCILED" }, outboxItem: { outbox_id: "outbox-1", intent_id: "effect-1", message_fp: "message-1", sequence: 1 } }), /EFFECT_INITIAL_STATE_INVALID/);
  assert.throws(() => store.commit({ expectedRevision: 0, authorityEpoch: 0, effectIntent: effect(), outboxItem: { outbox_id: "outbox-1", intent_id: "effect-1", message_fp: "message-1", sequence: 1, state: "delivered" } }), /OUTBOX_INITIAL_STATE_INVALID/);
  assert.throws(() => store.commit({ expectedRevision: 0, effectIntent: effect() }), /EFFECT_OUTBOX_ATOMIC_PAIR_REQUIRED/);
  assert.equal(store.revision, 0);
  assert.equal(store.getIntent("effect-1"), undefined);
  store.close();
});

test("startup is recovery-only for every nonterminal effect or pending/inflight outbox", () => {
  for (const unresolved of ["PREPARED", "DISPATCHING", "OBSERVED", "UNKNOWN", "CONFLICT", "MANUAL_RECOVERY_REQUIRED", "pending", "sending"]) {
    const f = fixture();
    let store = openWorkflowStateStore({ repositoryRoot: f.root, databasePath: f.databasePath, expectedIdentity: f.identity });
    store.commit({ expectedRevision: 0, authorityEpoch: 0, effectIntent: effect(), outboxItem: { outbox_id: "outbox-1", intent_id: "effect-1", message_fp: "message-1", sequence: 1 } });
    if (["DISPATCHING", "OBSERVED", "UNKNOWN", "CONFLICT"].includes(unresolved)) store.transitionIntent({ effectId: "effect-1", expectedState: "PREPARED", nextState: "DISPATCHING" });
    if (unresolved === "OBSERVED") store.transitionIntent({ effectId: "effect-1", expectedState: "DISPATCHING", nextState: "OBSERVED" });
    if (unresolved === "UNKNOWN") store.transitionIntent({ effectId: "effect-1", expectedState: "DISPATCHING", nextState: "UNKNOWN" });
    if (unresolved === "CONFLICT") store.transitionIntent({ effectId: "effect-1", expectedState: "DISPATCHING", nextState: "CONFLICT" });
    if (unresolved === "MANUAL_RECOVERY_REQUIRED") store.transitionIntent({ effectId: "effect-1", expectedState: "PREPARED", nextState: "MANUAL_RECOVERY_REQUIRED" });
    if (!["pending", "sending", "PREPARED"].includes(unresolved)) store.transitionOutbox({ outboxId: "outbox-1", expectedState: "pending", nextState: "quarantined" });
    if (unresolved === "sending") store.transitionOutbox({ outboxId: "outbox-1", expectedState: "pending", nextState: "sending" });
    store.close();
    store = openWorkflowStateStore({ repositoryRoot: f.root, databasePath: f.databasePath, expectedIdentity: f.identity });
    assert.equal(store.recovery_only, true, unresolved);
    assert.equal(store.mode, "recovery-only", unresolved);
    assert.throws(() => store.commit({ expectedRevision: store.revision, records: [record(`blocked-${unresolved}`)] }), /STORE_RECOVERY_ONLY/);
    store.close();
  }
});

test("startup is recovery-only while any persisted AgentRun lacks a terminal closure", () => {
  const f = fixture();
  let store = openWorkflowStateStore({ repositoryRoot: f.root, databasePath: f.databasePath, expectedIdentity: f.identity });
  store.close();
  const database = new DatabaseSync(f.databasePath);
  const payload = JSON.stringify({ child_agent_id: "task-agent", authority_epoch: 0 });
  database.prepare(`
    INSERT INTO records(
      id,kind,schema_version,record_revision,repository_id,checkout_id,authority_scope,
      lineage_id,lifecycle_state,payload_json,source_revision,policy_fp,input_fp,content_fp,
      sensitivity,fresh_until,created_at,superseded_by
    ) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
  `).run(
    "agent-run-open",
    "AgentRun",
    "1.0.0",
    1,
    f.identity.repository_logical_id,
    f.identity.checkout_instance_id,
    "task-1",
    "open",
    "RUNNING",
    payload,
    "grant",
    "policy",
    "input",
    createHash("sha256").update(payload).digest("hex"),
    "internal",
    "2030-01-01T00:00:00.000Z",
    "2029-01-01T00:00:00.000Z",
    null,
  );
  const malformedClosurePayload = JSON.stringify({ run_id: "agent-run-open" });
  database.prepare(`
    INSERT INTO records(
      id,kind,schema_version,record_revision,repository_id,checkout_id,authority_scope,
      lineage_id,lifecycle_state,payload_json,source_revision,policy_fp,input_fp,content_fp,
      sensitivity,fresh_until,created_at,superseded_by
    ) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
  `).run(
    "agent-run-nonterminal-closure",
    "AgentRunClosure",
    "1.0.0",
    1,
    f.identity.repository_logical_id,
    f.identity.checkout_instance_id,
    "task-1",
    "agent-run-open",
    "PENDING",
    malformedClosurePayload,
    "candidate",
    "policy",
    "input",
    createHash("sha256").update(malformedClosurePayload).digest("hex"),
    "internal",
    "2030-01-01T00:00:00.000Z",
    "2029-01-01T00:00:00.000Z",
    null,
  );
  database.close();
  store = openWorkflowStateStore({ repositoryRoot: f.root, databasePath: f.databasePath, expectedIdentity: f.identity });
  assert.equal(store.recovery_only, true);
  assert.equal(store.mode, "recovery-only");
  assert.deepEqual(store.recovery_state.agent_runs.map((entry) => entry.id), ["agent-run-open"]);
  assert.throws(() => store.commit({ expectedRevision: store.revision, records: [record("blocked-by-agent-run")] }), /STORE_RECOVERY_ONLY/);
  store.close();
});

test("canonical JSONL export can rebuild a fresh store without authority drift", () => {
  const f = fixture();
  const store = openWorkflowStateStore({ repositoryRoot: f.root, databasePath: f.databasePath, expectedIdentity: f.identity });
  store.commit({ expectedRevision: 0, records: [record()] });
  const exported = store.export({ destination: path.join(f.state, "canonical.jsonl") });
  store.close();
  const importedPath = path.join(f.state, "imported.sqlite");
  assert.throws(() => importWorkflowStateStore({ repositoryRoot: f.root, databasePath: importedPath, exportPath: exported.destination, expectedIdentity: f.identity, stateTransferVerifier }), /STATE_IMPORT_MANIFEST_REQUIRED/);
  assert.throws(() => importWorkflowStateStore({ repositoryRoot: f.root, databasePath: importedPath, exportPath: exported.destination, manifestPath: `${exported.destination}.manifest.json`, expectedIdentity: f.identity }), /STATE_TRANSFER_VERIFIER_REQUIRED/);
  assert.throws(() => importWorkflowStateStore({ repositoryRoot: f.root, databasePath: importedPath, exportPath: exported.destination, manifestPath: `${exported.destination}.manifest.json`, expectedIdentity: f.identity, stateTransferVerifier: { ...stateTransferVerifier, verify: ({ fingerprint }) => ({ verified: true, verifier_id: stateTransferVerifier.verifier_id, fingerprint: `${fingerprint}-forged`, proof_fingerprint: "a".repeat(64) }) } }), /STATE_TRANSFER_VERIFICATION_FAILED/);
  const imported = importWorkflowStateStore({ repositoryRoot: f.root, databasePath: importedPath, exportPath: exported.destination, manifestPath: `${exported.destination}.manifest.json`, expectedIdentity: f.identity, stateTransferVerifier });
  assert.equal(imported.imported, importedPath);
  const reopened = openWorkflowStateStore({ repositoryRoot: f.root, databasePath: importedPath, expectedIdentity: f.identity });
  assert.equal(reopened.get({ id: "record-1" }).payload.title, "safe fixture");
  assert.equal(reopened.revision, 1);
  reopened.close();
});

test("canonical export refuses restricted records instead of disclosing their payload", () => {
  const f = fixture();
  const store = openWorkflowStateStore({ repositoryRoot: f.root, databasePath: f.databasePath, expectedIdentity: f.identity });
  store.commit({ expectedRevision: 0, records: [{ ...record("restricted-record"), sensitivity: "restricted", payload: { private_context: "bounded but non-exportable" } }] });
  assert.throws(() => store.export({ destination: path.join(f.state, "restricted.jsonl") }), /CANONICAL_EXPORT_RESTRICTED_DATA_REQUIRES_SECURE_BACKUP/);
  assert.equal(existsSync(path.join(f.state, "restricted.jsonl")), false);
  store.close();
});

test("legacy TSV and JSONL readers feed an explicit canonical import adapter", () => {
  const f = fixture();
  const tsv = path.join(f.root, "legacy.tsv");
  const jsonl = path.join(f.root, "legacy.jsonl");
  writeFileSync(tsv, "id\ttitle\nlegacy-1\tImported safely\n");
  writeFileSync(jsonl, '{"id":"legacy-2","title":"Imported from JSONL"}\n');
  const tsvState = readLegacyTsvState({ repositoryRoot: f.root, source: tsv, requiredColumns: ["id", "title"] });
  const jsonlState = readLegacyJsonlState({ repositoryRoot: f.root, source: jsonl });
  assert.equal(tsvState.rows[0].id, "legacy-1");
  assert.equal(jsonlState.rows[0].id, "legacy-2");
  const store = openWorkflowStateStore({ repositoryRoot: f.root, databasePath: f.databasePath, expectedIdentity: f.identity });
  const imported = importLegacyRecords({ store, adapterId: "legacy-task-v1", legacyState: tsvState, authorityScope: "migration", policyFingerprint: "legacy-policy", mapRecord: (row) => ({ id: row.id, kind: "LegacyWorkflowTask", schema_version: "1.0.0", lineage_id: "legacy-import", lifecycle_state: "imported", payload: { title: row.title } }) });
  assert.equal(imported.imported_records, 1);
  assert.equal(store.get({ id: "legacy-1" }).payload.title, "Imported safely");
  store.close();
});

test("export sidecar replacement never follows a pre-created symlink", () => {
  const f = fixture();
  const victim = path.join(f.root, "victim.txt");
  const destination = path.join(f.state, "safe-export.jsonl");
  writeFileSync(victim, "unchanged");
  symlinkSync(victim, `${destination}.manifest.json`);
  const store = openWorkflowStateStore({ repositoryRoot: f.root, databasePath: f.databasePath, expectedIdentity: f.identity });
  store.export({ destination });
  assert.equal(readFileSync(victim, "utf8"), "unchanged");
  assert.equal(lstatSync(`${destination}.manifest.json`).isSymbolicLink(), false);
  store.close();
});

test("recovery-only mode permits only explicitly marked recovery transitions", () => {
  const f = fixture();
  let store = openWorkflowStateStore({ repositoryRoot: f.root, databasePath: f.databasePath, expectedIdentity: f.identity });
  store.commit({ expectedRevision: 0, authorityEpoch: 0, effectIntent: effect(), outboxItem: { outbox_id: "outbox-1", intent_id: "effect-1", message_fp: "message-1", sequence: 1 } });
  store.close();
  store = openWorkflowStateStore({ repositoryRoot: f.root, databasePath: f.databasePath, expectedIdentity: f.identity });
  assert.throws(() => store.transitionIntent({ effectId: "effect-1", expectedState: "PREPARED", nextState: "MANUAL_RECOVERY_REQUIRED" }), /STORE_RECOVERY_ONLY/);
  assert.throws(() => store.transitionOutbox({ outboxId: "outbox-1", expectedState: "pending", nextState: "quarantined" }), /STORE_RECOVERY_ONLY/);
  assert.equal(store.transitionIntent({ effectId: "effect-1", expectedState: "PREPARED", nextState: "MANUAL_RECOVERY_REQUIRED", recovery: true }).state, "MANUAL_RECOVERY_REQUIRED");
  assert.equal(store.transitionOutbox({ outboxId: "outbox-1", expectedState: "pending", nextState: "quarantined", recovery: true }).state, "quarantined");
  store.close();
});

test("a fully reconciled recovery refreshes the store back to normal writes", () => {
  const f = fixture();
  let store = openWorkflowStateStore({ repositoryRoot: f.root, databasePath: f.databasePath, expectedIdentity: f.identity });
  store.commit({ expectedRevision: 0, authorityEpoch: 0, effectIntent: effect(), outboxItem: { outbox_id: "outbox-1", intent_id: "effect-1", message_fp: "message-1", sequence: 1 } });
  store.close();
  store = openWorkflowStateStore({ repositoryRoot: f.root, databasePath: f.databasePath, expectedIdentity: f.identity, receiptProofVerifier, finalizationFenceVerifier: defaultFinalizationFenceVerifier });
  assert.equal(store.recovery_only, true);
  store.transitionIntent({ effectId: "effect-1", expectedState: "PREPARED", nextState: "DISPATCHING", recovery: true });
  store.transitionOutbox({ outboxId: "outbox-1", expectedState: "pending", nextState: "sending", recovery: true });
  store.transitionIntent({ effectId: "effect-1", expectedState: "DISPATCHING", nextState: "OBSERVED", recovery: true });
  store.finalizeReconciliation({ expectedRevision: store.revision, effectId: "effect-1", recovery: true, records: [receiptProof("proof-recovered", "effect-1", "observation", "reconcile")], receipt: { receipt_id: "receipt-recovered", intent_id: "effect-1", object_identity: "object", observation_fp: "observation", proof_record_id: "proof-recovered", result: "reconstructed" }, finalizationFence: finalizationFenceFor() });
  assert.equal(store.recovery_only, false);
  assert.equal(store.mode, "readwrite");
  assert.doesNotThrow(() => store.commit({ expectedRevision: store.revision, records: [record("normal-write-after-recovery")] }));
  store.close();
});

test("relationship lifecycle changes cannot bypass the verified lifecycle writer", () => {
  const f = fixture();
  const store = openWorkflowStateStore({ repositoryRoot: f.root, databasePath: f.databasePath, expectedIdentity: f.identity });
  const initializationFingerprint = "c".repeat(64);
  const initializationProof = "d".repeat(64);
  const initial = { id: "relationship-initial", kind: "Relationship", schema_version: "1.0.0", record_revision: 1, authority_scope: "relationship", lineage_id: "relationship-1", lifecycle_state: "ACTIVE", payload: { relationship_id: "relationship-1", state: "ACTIVE", authority_epoch: 0, initialization_fingerprint: initializationFingerprint, initialization_proof_fingerprint: initializationProof }, source_revision: "verified-initialization", policy_fp: initializationProof, input_fp: initializationFingerprint };
  store.persistRelationshipInitialization({ expectedRevision: 0, relationshipId: "relationship-1", initialState: "ACTIVE", record: initial, event: { event_id: "relationship-initialized", event_type: "RELATIONSHIP_INITIALIZED" }, verifier: { trusted: true, independent: true, verifier_id: "initializer", verify: ({ fingerprint }) => ({ verified: true, verifier_id: "initializer", fingerprint, proof_fingerprint: initializationProof }) } });
  assert.throws(() => store.commit({ expectedRevision: 1, records: [{ ...initial, id: "relationship-bypass", record_revision: 2, lifecycle_state: "ARCHIVED", payload: { ...initial.payload, state: "ARCHIVED" } }] }), /RELATIONSHIP_INITIAL_RECORD_INVALID|RELATIONSHIP_LIFECYCLE_WRITER_REQUIRED/);
  const proof = "b".repeat(64);
  const forgedTransition = { ...initial, id: "relationship-forged-direct", record_revision: 2, lifecycle_state: "REVOKED", payload: { ...initial.payload, state: "REVOKED", authority_epoch: 1, transition_fingerprint: "a".repeat(64), transition_proof_fingerprint: proof }, source_revision: "1", policy_fp: proof, input_fp: "a".repeat(64) };
  assert.throws(() => store.persistRelationshipLifecycle({ expectedRevision: 1, relationshipId: "relationship-1", expectedState: "ACTIVE", nextState: "REVOKED", record: forgedTransition, event: { event_id: "forged", event_type: "RELATIONSHIP_REVOKED" } }), /RELATIONSHIP_LIFECYCLE_VERIFIER_REQUIRED/);
  assert.throws(() => store.persistRelationshipLifecycle({ expectedRevision: 1, relationshipId: "relationship-1", expectedState: "ACTIVE", nextState: "REVOKED", record: forgedTransition, event: { event_id: "forged", event_type: "RELATIONSHIP_REVOKED" }, verifier: { trusted: true, independent: true, verifier_id: "forged", verify: () => ({ verified: true, verifier_id: "forged", fingerprint: "caller", proof_fingerprint: proof }) } }), /RELATIONSHIP_LIFECYCLE_VERIFICATION_FAILED/);
  const exactVerifier = { trusted: true, independent: true, verifier_id: "exact", verify: ({ fingerprint }) => ({ verified: true, verifier_id: "exact", fingerprint, proof_fingerprint: proof }) };
  assert.throws(() => store.persistRelationshipLifecycle({ expectedRevision: 1, relationshipId: "relationship-1", expectedState: "ACTIVE", nextState: "REVOKED", record: { ...forgedTransition, lineage_id: "other-relationship" }, event: { event_id: "wrong-lineage", event_type: "RELATIONSHIP_REVOKED" }, verifier: exactVerifier }), /RELATIONSHIP_LIFECYCLE_RECORD_INVALID/);
  assert.throws(() => store.persistRelationshipLifecycle({ expectedRevision: 1, relationshipId: "relationship-1", expectedState: "ACTIVE", nextState: "REVOKED", record: { ...forgedTransition, record_revision: 9 }, event: { event_id: "wrong-revision", event_type: "RELATIONSHIP_REVOKED" }, verifier: exactVerifier }), /RELATIONSHIP_LIFECYCLE_RECORD_INVALID/);
  assert.throws(() => store.persistRelationshipLifecycle({ expectedRevision: 1, relationshipId: "relationship-1", expectedState: "ACTIVE", nextState: "REVOKED", record: forgedTransition, event: { event_id: "wrong-event", event_type: "RELATIONSHIP_ARCHIVED" }, verifier: exactVerifier }), /RELATIONSHIP_LIFECYCLE_RECORD_INVALID/);
  assert.equal(store.query({ kind: "Relationship" }).records.length, 1);
  store.close();
});

test("activation lifecycle records cannot be injected through the generic writer", () => {
  const f = fixture();
  const store = openWorkflowStateStore({ repositoryRoot: f.root, databasePath: f.databasePath, expectedIdentity: f.identity });
  assert.throws(() => store.commit({ expectedRevision: 0, records: [{ id: "forged-activation", kind: "NextWorkflowActivation", schema_version: "1.0.0", record_revision: 1, authority_scope: "release", lineage_id: "next-development-workflow", lifecycle_state: "enforced", payload: { activation_id: "next-development-workflow", revision: 1, mode: "enforced", candidate_fingerprint: "a".repeat(64) }, source_revision: "forged", policy_fp: "b".repeat(64), input_fp: "a".repeat(64) }] }), /ACTIVATION_LIFECYCLE_WRITER_REQUIRED/);
  const candidateFingerprint = "a".repeat(64);
  const cycleStart = {
    schema_version: "1.1.0",
    activation_id: "next-development-workflow",
    authority_epoch: 0,
    revision: 1,
    mode: "shadow",
    candidate_fingerprint: candidateFingerprint,
    cycle_start_revision: 1,
    cycle_step: 1,
    previous_record_revision: 0,
    previous_record_content_fingerprint: null,
  };
  cycleStart.cycle_id = releaseDigest({
    activation_id: cycleStart.activation_id,
    candidate_fingerprint: candidateFingerprint,
    cycle_start_revision: cycleStart.cycle_start_revision,
    predecessor_record_revision: cycleStart.previous_record_revision,
    predecessor_record_content_fingerprint: cycleStart.previous_record_content_fingerprint,
  });
  const direct = { id: "forged-shadow", kind: "NextWorkflowActivation", schema_version: "1.1.0", record_revision: 1, authority_scope: "release", lineage_id: "next-development-workflow", lifecycle_state: "shadow", payload: cycleStart, source_revision: "0", policy_fp: "b".repeat(64), input_fp: candidateFingerprint };
  assert.throws(() => store.persistActivationLifecycle({ expectedRevision: 0, authorityEpoch: 0, activationId: "next-development-workflow", expectedMode: "planned", nextMode: "shadow", candidateFingerprint: "a".repeat(64), record: direct, event: { event_id: "forged-shadow", event_type: "NEXT_WORKFLOW_ACTIVATION_TRANSITIONED" } }), /ACTIVATION_LIFECYCLE_VERIFIER_REQUIRED/);
  const exactEvent = { event_id: "exact-shadow", aggregate_id: direct.id, event_type: "NEXT_WORKFLOW_ACTIVATION_TRANSITIONED", payload: { activation_id: "next-development-workflow", candidate_fingerprint: "a".repeat(64), authority_epoch: 0, from_mode: "planned", requested_mode: "shadow", to_mode: "shadow" } };
  const exactVerifier = { trusted: true, independent: true, verifier_id: "activation-exact", verify: ({ fingerprint }) => ({ verified: true, verifier_id: "activation-exact", fingerprint, proof_fingerprint: direct.policy_fp }) };
  assert.throws(() => store.persistActivationLifecycle({ expectedRevision: 0, authorityEpoch: 0, activationId: "next-development-workflow", expectedMode: "planned", nextMode: "shadow", candidateFingerprint: "a".repeat(64), record: { ...direct, record_revision: 2, payload: { ...direct.payload, revision: 2 } }, event: exactEvent, verifier: exactVerifier }), /ACTIVATION_LIFECYCLE_RECORD_INVALID/);
  assert.throws(() => store.persistActivationLifecycle({ expectedRevision: 0, authorityEpoch: 0, activationId: "next-development-workflow", expectedMode: "planned", nextMode: "shadow", candidateFingerprint: "a".repeat(64), record: direct, event: { ...exactEvent, aggregate_id: "other-record" }, verifier: exactVerifier }), /ACTIVATION_LIFECYCLE_RECORD_INVALID/);
  assert.equal(store.persistActivationLifecycle({ expectedRevision: 0, authorityEpoch: 0, activationId: "next-development-workflow", expectedMode: "planned", nextMode: "shadow", candidateFingerprint: "a".repeat(64), record: direct, event: exactEvent, verifier: exactVerifier }).mode, "shadow");
  assert.equal(store.revision, 1);
  store.close();
});

test("agent authority records cannot bypass their dedicated verified writers", () => {
  const f = fixture();
  const store = openWorkflowStateStore({ repositoryRoot: f.root, databasePath: f.databasePath, expectedIdentity: f.identity });
  assert.throws(() => store.commit({ expectedRevision: 0, records: [{ ...record("forged-validator"), kind: "ValidatorDecision" }] }), /AGENT_AUTHORITY_RECORD_WRITER_REQUIRED/);
  assert.throws(() => store.commit({ expectedRevision: 0, records: [{ ...record("forged-delegation"), kind: "DelegationGrant" }] }), /AGENT_AUTHORITY_RECORD_WRITER_REQUIRED/);
  assert.throws(() => store.commit({ expectedRevision: 0, records: [{ ...record("forged-receipt-proof"), kind: "EffectReceiptProof" }] }), /RECONCILIATION_PROOF_WRITER_REQUIRED/);
  assert.throws(() => store.commit({ expectedRevision: 0, records: [{ ...record("forged-agent-run"), kind: "AgentRun" }] }), /AGENT_LIFECYCLE_RECORD_WRITER_REQUIRED/);
  assert.throws(() => store.commit({ expectedRevision: 0, records: [{ ...record("forged-agent-stop"), kind: "AgentRunStopClosure" }] }), /AGENT_LIFECYCLE_RECORD_WRITER_REQUIRED/);
  assert.throws(() => store.commit({ expectedRevision: 0, records: [{ ...record("forged-reviewer-closure"), kind: "AgentReviewerRunClosure" }] }), /AGENT_LIFECYCLE_RECORD_WRITER_REQUIRED/);
  assert.equal(store.persistAgentAuthorityRecord, undefined);
  assert.throws(() => store.persistResourceCostReservationAuthority({ expectedRevision: 0, record: { ...record("wrong-kind"), kind: "ValidatorDecision" }, event: { event_id: "wrong-kind", event_type: "RESOURCE_COST_RESERVED" }, verifier: { trusted: true, independent: true, authority_id: "authority", verify: () => ({}) } }), /AGENT_AUTHORITY_RECORD_KIND_MISMATCH/);
  assert.equal(store.revision, 0);
  store.close();
});

test("backup, manifest verification, restore, export, and derivative rebuild work", async () => {
  const f = fixture();
  let store = openWorkflowStateStore({ repositoryRoot: f.root, databasePath: f.databasePath, expectedIdentity: f.identity });
  store.commit({ expectedRevision: 0, records: [record()] });
  store.rebuild({ projections: ["full_text"] });
  const exported = store.export({ destination: path.join(f.state, "export.jsonl") });
  assert.match(readFileSync(exported.destination, "utf8"), /workflow-state-jsonl-v1/);
  const backup = await store.backup({ destination: path.join(f.state, "backup.sqlite") });
  verifyBackupManifest({ backup: backup.destination, manifestPath: backup.manifest_path, expectedIdentity: f.identity });
  assert.throws(() => restoreWorkflowStateStore({ repositoryRoot: f.root, databasePath: f.databasePath, backup: backup.destination, manifestPath: backup.manifest_path, expectedIdentity: f.identity, stateTransferVerifier }), /RESTORE_DESTINATION_OPEN/);
  store.close();
  assert.throws(() => restoreWorkflowStateStore({ repositoryRoot: f.root, databasePath: f.databasePath, backup: backup.destination, manifestPath: backup.manifest_path, expectedIdentity: f.identity }), /STATE_TRANSFER_VERIFIER_REQUIRED/);
  store = openWorkflowStateStore({ repositoryRoot: f.root, databasePath: f.databasePath, expectedIdentity: f.identity });
  store.commit({ expectedRevision: 1, records: [record("record-2")] });
  store.close();
  writeFileSync(`${f.databasePath}-wal`, "old-wal-component");
  writeFileSync(`${f.databasePath}-shm`, "old-shm-component");
  const restored = restoreWorkflowStateStore({ repositoryRoot: f.root, databasePath: f.databasePath, backup: backup.destination, manifestPath: backup.manifest_path, expectedIdentity: f.identity, stateTransferVerifier });
  assert.deepEqual(readdirSync(restored.quarantine).sort(), ["workflow.sqlite", "workflow.sqlite-shm", "workflow.sqlite-wal"]);
  store = openWorkflowStateStore({ repositoryRoot: f.root, databasePath: f.databasePath, expectedIdentity: f.identity });
  assert.equal(store.revision, 1);
  assert.equal(store.get({ id: "record-2" }), undefined);
  store.close();
});

test("restore validates migration and foreign keys before quarantining the destination", async () => {
  for (const mutate of [
    (db) => db.prepare("UPDATE schema_migrations SET checksum='forged' WHERE version=1").run(),
    (db) => { db.exec("PRAGMA foreign_keys=OFF"); db.prepare("INSERT INTO outbox(outbox_id,intent_id,message_fp,sequence,state,attempts) VALUES('dangling','missing','dangling-message',1,'pending',0)").run(); }
  ]) {
    const f = fixture();
    let store = openWorkflowStateStore({ repositoryRoot: f.root, databasePath: f.databasePath, expectedIdentity: f.identity });
    store.commit({ expectedRevision: 0, records: [record("destination-record")] });
    const backup = await store.backup({ destination: path.join(f.state, "invalid-backup.sqlite") });
    store.close();
    const copied = new DatabaseSync(backup.destination);
    mutate(copied);
    copied.close();
    updateBackupManifestDigest(backup);
    assert.throws(() => restoreWorkflowStateStore({ repositoryRoot: f.root, databasePath: f.databasePath, backup: backup.destination, manifestPath: backup.manifest_path, expectedIdentity: f.identity, stateTransferVerifier }), /RESTORE_MIGRATION_INVALID|RESTORE_FOREIGN_KEY_FAILURE/);
    store = openWorkflowStateStore({ repositoryRoot: f.root, databasePath: f.databasePath, expectedIdentity: f.identity });
    assert.equal(store.get({ id: "destination-record" }).payload.title, "safe fixture");
    store.close();
  }
});

test("foreign-key corruption is detected before normal writes are enabled", () => {
  const f = fixture();
  let store = openWorkflowStateStore({ repositoryRoot: f.root, databasePath: f.databasePath, expectedIdentity: f.identity });
  store.close();
  const db = new DatabaseSync(f.databasePath);
  db.exec("PRAGMA foreign_keys=OFF");
  db.prepare("INSERT INTO outbox(outbox_id,intent_id,message_fp,sequence,state,attempts) VALUES('dangling','missing','dangling-message',1,'pending',0)").run();
  db.close();
  assert.throws(() => openWorkflowStateStore({ repositoryRoot: f.root, databasePath: f.databasePath, expectedIdentity: f.identity }), /STORE_FOREIGN_KEY_FAILURE/);
});

test("backup digest tampering and foreign checkout restore are refused", async () => {
  const f = fixture();
  const store = openWorkflowStateStore({ repositoryRoot: f.root, databasePath: f.databasePath, expectedIdentity: f.identity });
  const backup = await store.backup({ destination: path.join(f.state, "backup.sqlite") });
  store.close();
  writeFileSync(backup.destination, Buffer.concat([readFileSync(backup.destination), Buffer.from("tamper")]));
  assert.throws(() => verifyBackupManifest({ backup: backup.destination, manifestPath: backup.manifest_path, expectedIdentity: f.identity }), /BACKUP_DIGEST_MISMATCH/);
  assert.throws(() => verifyBackupManifest({ backup: backup.destination, manifestPath: backup.manifest_path, expectedIdentity: { ...f.identity, checkout_instance_id: "foreign" } }), /BACKUP_DIGEST_MISMATCH|BACKUP_IDENTITY_MISMATCH/);
});

test("identity mismatch and symlink database paths fail closed", () => {
  const f = fixture();
  const store = openWorkflowStateStore({ repositoryRoot: f.root, databasePath: f.databasePath, expectedIdentity: f.identity });
  store.close();
  assert.throws(() => openWorkflowStateStore({ repositoryRoot: f.root, databasePath: f.databasePath, expectedIdentity: { ...f.identity, checkout_instance_id: "foreign" } }), /STORE_IDENTITY_MISMATCH/);
  const actual = path.join(f.state, "actual");
  const link = path.join(f.state, "linked");
  mkdirSync(actual);
  symlinkSync(actual, link);
  assert.throws(() => openWorkflowStateStore({ repositoryRoot: f.root, databasePath: path.join(link, "state.sqlite"), expectedIdentity: f.identity }), /SYMLINK_DATABASE_PATH/);
});

test("database and export paths cannot escape the repository state directory", () => {
  const f = fixture();
  assert.throws(() => openWorkflowStateStore({ repositoryRoot: f.root, databasePath: path.join(f.root, "outside.sqlite"), expectedIdentity: f.identity }), /UNSAFE_DATABASE_PATH/);
});

test("incomplete and checksum-drifted SQLite migrations fail closed", () => {
  for (const mutation of [
    (db) => db.prepare("UPDATE schema_migrations SET state='pending' WHERE version=1").run(),
    (db) => db.prepare("UPDATE schema_migrations SET checksum='drifted' WHERE version=1").run(),
    (db) => db.prepare("UPDATE schema_migrations SET name='renamed' WHERE version=1").run(),
  ]) {
    const f = fixture();
    const store = openWorkflowStateStore({ repositoryRoot: f.root, databasePath: f.databasePath, expectedIdentity: f.identity });
    store.close();
    const db = new DatabaseSync(f.databasePath);
    mutation(db);
    db.close();
    assert.throws(() => openWorkflowStateStore({ repositoryRoot: f.root, databasePath: f.databasePath, expectedIdentity: f.identity }), /MIGRATION_INCOMPLETE|MIGRATION_CHECKSUM_DRIFT/);
    assert.throws(() => openWorkflowStateStore({ repositoryRoot: f.root, databasePath: f.databasePath, expectedIdentity: f.identity, mode: "readonly" }), /STORE_MIGRATION_INVALID/);
  }
});

test("actual SQLite schema drift fails closed on open and health", () => {
  for (const mode of ["readwrite", "readonly"]) {
    const f = fixture();
    let store = openWorkflowStateStore({ repositoryRoot: f.root, databasePath: f.databasePath, expectedIdentity: f.identity });
    store.close();
    const db = new DatabaseSync(f.databasePath);
    db.exec("CREATE TABLE injected_schema_drift (id TEXT PRIMARY KEY) STRICT");
    db.close();
    assert.throws(() => openWorkflowStateStore({ repositoryRoot: f.root, databasePath: f.databasePath, expectedIdentity: f.identity, mode }), /STORE_SQLITE_SCHEMA_INVALID/);
  }
  const f = fixture();
  const store = openWorkflowStateStore({ repositoryRoot: f.root, databasePath: f.databasePath, expectedIdentity: f.identity });
  const db = new DatabaseSync(f.databasePath);
  db.exec("CREATE TABLE post_open_schema_drift (id TEXT PRIMARY KEY) STRICT");
  db.close();
  assert.throws(() => store.health(), /STORE_SQLITE_SCHEMA_INVALID/);
  store.close();
});

test("stored schema identity tampering or deletion is not silently re-blessed", () => {
  for (const mutation of ["update", "delete"]) {
    for (const mode of ["readwrite", "readonly"]) {
      const f = fixture();
      const store = openWorkflowStateStore({ repositoryRoot: f.root, databasePath: f.databasePath, expectedIdentity: f.identity });
      store.close();
      let db = new DatabaseSync(f.databasePath);
      if (mutation === "update") db.prepare("UPDATE store_meta SET value_json=? WHERE key='schema'").run(JSON.stringify({ version: 999, migration_checksum: "forged", sqlite_schema_fingerprint: "forged" }));
      else db.prepare("DELETE FROM store_meta WHERE key='schema'").run();
      db.close();
      assert.throws(() => openWorkflowStateStore({ repositoryRoot: f.root, databasePath: f.databasePath, expectedIdentity: f.identity, mode }), /STORE_SCHEMA_IDENTITY_INVALID|STORE_REQUIRED_METADATA_INVALID/);
      if (mutation === "delete" && mode === "readwrite") {
        db = new DatabaseSync(f.databasePath);
        assert.equal(db.prepare("SELECT COUNT(*) AS count FROM store_meta WHERE key='schema'").get().count, 0);
        db.close();
      }
    }
  }
});

test("critical store metadata deletion fails closed in readwrite and readonly modes", () => {
  for (const key of ["identity", "store_revision", "revocation_epoch"]) {
    for (const mode of ["readwrite", "readonly"]) {
      const f = fixture();
      const store = openWorkflowStateStore({ repositoryRoot: f.root, databasePath: f.databasePath, expectedIdentity: f.identity });
      store.close();
      const db = new DatabaseSync(f.databasePath);
      db.prepare("DELETE FROM store_meta WHERE key=?").run(key);
      db.close();
      assert.throws(() => openWorkflowStateStore({ repositoryRoot: f.root, databasePath: f.databasePath, expectedIdentity: f.identity, mode }), /STORE_IDENTITY_MISMATCH|STORE_REQUIRED_METADATA_INVALID/);
    }
  }
});

test("a nonempty database missing bootstrap anchors is never reinitialized or re-blessed", () => {
  const f = fixture();
  let store = openWorkflowStateStore({ repositoryRoot: f.root, databasePath: f.databasePath, expectedIdentity: f.identity });
  store.commit({ expectedRevision: 0, records: [record("surviving-authority-state")] });
  store.fence({ reason: "preserve-nonzero-epoch" });
  store.close();

  const db = new DatabaseSync(f.databasePath);
  db.exec("DROP TABLE store_meta; DROP TABLE schema_migrations");
  const survivingCount = Number(db.prepare("SELECT COUNT(*) AS count FROM records").get().count);
  db.close();

  assert.throws(() => openWorkflowStateStore({ repositoryRoot: f.root, databasePath: f.databasePath, expectedIdentity: f.identity }), /STORE_BOOTSTRAP_SCHEMA_INCOMPLETE/);
  const unchanged = new DatabaseSync(f.databasePath);
  assert.equal(unchanged.prepare("SELECT COUNT(*) AS count FROM records").get().count, survivingCount);
  assert.equal(unchanged.prepare("SELECT COUNT(*) AS count FROM sqlite_schema WHERE type='table' AND name IN ('store_meta','schema_migrations')").get().count, 0);
  unchanged.close();
});

test("an unrelated or partially anchored SQLite database is not treated as a fresh workflow store", () => {
  for (const setup of [
    "CREATE TABLE unrelated_data(id TEXT PRIMARY KEY) STRICT",
    "CREATE TABLE store_meta(key TEXT PRIMARY KEY,value_json TEXT NOT NULL) STRICT"
  ]) {
    const f = fixture();
    const db = new DatabaseSync(f.databasePath);
    db.exec(setup);
    db.close();
    assert.throws(() => openWorkflowStateStore({ repositoryRoot: f.root, databasePath: f.databasePath, expectedIdentity: f.identity }), /STORE_BOOTSTRAP_SCHEMA_INCOMPLETE/);
  }
});

test("a pre-created empty SQLite container remains a legitimate first run", () => {
  const f = fixture();
  const db = new DatabaseSync(f.databasePath);
  db.close();
  const store = openWorkflowStateStore({ repositoryRoot: f.root, databasePath: f.databasePath, expectedIdentity: f.identity });
  assert.equal(store.revision, 0);
  assert.equal(store.revocation_epoch, 0);
  assert.equal(store.health().ok, true);
  store.close();
});

test("an ordered schema upgrade safely reuses an interrupted backup and quarantines unresolved legacy effects", () => {
  const f = fixture();
  const initialSql = readFileSync(path.join(path.dirname(new URL(import.meta.url).pathname), "lib", "next_workflow", "migrations", "001_initial.sql"), "utf8");
  const initialChecksum = createHash("sha256").update(initialSql).digest("hex");
  const db = new DatabaseSync(f.databasePath);
  db.exec("CREATE TABLE IF NOT EXISTS schema_migrations (version INTEGER PRIMARY KEY, name TEXT NOT NULL UNIQUE, checksum TEXT NOT NULL, state TEXT NOT NULL CHECK(state IN ('pending','applied','failed')), started_at TEXT NOT NULL, applied_at TEXT) STRICT");
  db.exec(initialSql);
  db.prepare("INSERT INTO schema_migrations(version,name,checksum,state,started_at,applied_at) VALUES(1,'initial',?,'applied',?,?)").run(initialChecksum, "2028-01-01T00:00:00.000Z", "2028-01-01T00:00:00.000Z");
  db.prepare("INSERT INTO store_meta(key,value_json) VALUES('identity',?),('store_revision','0'),('schema',?),('revocation_epoch','0')").run(JSON.stringify(f.identity), JSON.stringify({ version: 1, migration_checksum: initialChecksum }));
  db.prepare("INSERT INTO effect_intents(effect_id,effect_key,request_fp,authority_fp,target_id,operation,expected_selector_json,attempt_lineage,state) VALUES('legacy-effect','legacy-key','legacy-request','legacy-authority','legacy-target','provider_effect:invoke','{}','legacy-lineage','DISPATCHING')").run();
  db.prepare("INSERT INTO outbox(outbox_id,intent_id,message_fp,sequence,state,attempts) VALUES('legacy-outbox','legacy-effect','legacy-message',1,'sending',1)").run();
  db.close();
  const interruptedBackup = `${f.databasePath}.pre-migration-v1.sqlite`;
  copyFileSync(f.databasePath, interruptedBackup);
  const store = openWorkflowStateStore({ repositoryRoot: f.root, databasePath: f.databasePath, expectedIdentity: f.identity, clock: () => "2029-01-01T00:00:00.000Z" });
  assert.equal(store.health().ok, true);
  assert.equal(store.recovery_only, true);
  assert.equal(store.getIntent("legacy-effect").state, "MANUAL_RECOVERY_REQUIRED");
  assert.equal(existsSync(interruptedBackup), true);
  assert.equal(existsSync(`${interruptedBackup}.manifest.json`), true);
  verifyBackupManifest({ backup: interruptedBackup, manifestPath: `${interruptedBackup}.manifest.json`, expectedIdentity: f.identity });
  store.close();
  const restored = restoreWorkflowStateStore({ repositoryRoot: f.root, databasePath: f.databasePath, backup: interruptedBackup, manifestPath: `${interruptedBackup}.manifest.json`, expectedIdentity: f.identity, stateTransferVerifier });
  assert.ok(restored.quarantine);
  const reopened = openWorkflowStateStore({ repositoryRoot: f.root, databasePath: f.databasePath, expectedIdentity: f.identity, clock: () => "2029-01-01T00:00:00.000Z" });
  assert.equal(reopened.getIntent("legacy-effect").state, "MANUAL_RECOVERY_REQUIRED");
  reopened.close();
});
