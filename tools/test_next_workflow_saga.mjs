#!/usr/bin/env node
import assert from "node:assert/strict";
import { generateKeyPairSync } from "node:crypto";
import { mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { advanceActivation, advanceRollback, beginRollback, createEffectReceipt, createSagaMessage, createStoreBackedReplayState, persistRelationshipInitialization, persistRelationshipTransition, prepareEffect, projectChildProgress, reconcileEffect, sagaDigest, signAdapterMessage, transitionRelationship, verifyAdapterMessage } from "./lib/next_workflow/saga.mjs";
import { openWorkflowStateStore } from "./lib/next_workflow/store.mjs";

const { privateKey, publicKey } = generateKeyPairSync("ed25519");
const relationship = { relationship_id: "relationship", state: "ACTIVE", authority_epoch: 0, sender_id: "child", verifier_id: "parent", recipient_instance_id: "parent-instance", message_key_reference: "key-1", lease_state: "active", lease: { id: "lease-1", state: "active", expires_at: "2030-01-01T00:00:00.000Z" }, revocation_state: "active" };
const temporaryRoots = [];
test.after(() => temporaryRoots.forEach((root) => rmSync(root, { recursive: true, force: true })));

function message(overrides = {}) {
  return createSagaMessage({ messageId: "message-1", senderId: "child", verifierId: "parent", recipientInstanceId: "parent-instance", relationship, sequence: 1, nonce: "nonce-1", causationId: "cause", idempotencyKey: "idempotency-1", messageType: "projection", payload: { execution_phase: "fast_loop" }, createdAt: "2029-01-01T00:00:00.000Z", ...overrides });
}

function replayStore() {
  const root = mkdtempSync(path.join(tmpdir(), "next-saga-replay-"));
  temporaryRoots.push(root);
  mkdirSync(path.join(root, ".workflow-state"));
  const store = openWorkflowStateStore({ repositoryRoot: root, expectedIdentity: { repository_logical_id: "repo", checkout_instance_id: "checkout", relationship_id: relationship.relationship_id }, clock: () => "2029-01-01T00:00:01.000Z" });
  const verifier = { independent: true, verifier_id: "replay-relationship-initializer", verify: ({ initialization_fingerprint }) => ({ verified: true, verifier_id: "replay-relationship-initializer", initialization_fingerprint, proof_fingerprint: sagaDigest({ initialization_fingerprint, independently_verified: true }) }) };
  persistRelationshipInitialization({ store, relationship, evidence: { source: "replay-fixture" }, verifier, now: "2029-01-01T00:00:00.000Z" });
  return { store, replayState: createStoreBackedReplayState({ store, relationshipId: relationship.relationship_id }) };
}

test("authenticated message verifies once with exact relationship, epoch, sequence, and payload", () => {
  const value = message();
  const proof = signAdapterMessage({ message: value, keyReference: "key-1", signer: privateKey });
  let { store, replayState } = replayStore();
  assert.equal(verifyAdapterMessage({ message: value, proof, relationship, verifier: publicKey, replayState, now: "2029-01-01T00:00:01.000Z" }).decision, "PASS");
  store.close();
  store = openWorkflowStateStore({ repositoryRoot: path.dirname(path.dirname(store.path)), databasePath: store.path, expectedIdentity: { repository_logical_id: "repo", checkout_instance_id: "checkout", relationship_id: relationship.relationship_id }, clock: () => "2029-01-01T00:00:01.000Z" });
  replayState = createStoreBackedReplayState({ store, relationshipId: relationship.relationship_id });
  assert.equal(verifyAdapterMessage({ message: value, proof, relationship, verifier: publicKey, replayState, now: "2029-01-01T00:00:01.000Z" }).decision, "STOP");
  store.close();
});

test("forged proof, old epoch, gap, and payload mutation stop", () => {
  const value = message();
  const proof = signAdapterMessage({ message: value, keyReference: "key-1", signer: privateKey });
  const cases = [
    [{ ...proof, signature: Buffer.from("forged").toString("base64") }, value, relationship],
    [proof, value, { ...relationship, authority_epoch: 1 }],
    [proof, { ...value, sequence: 2 }, relationship],
    [proof, { ...value, payload: { execution_phase: "delivery" } }, relationship]
  ];
  for (const [candidateProof, candidateMessage, candidateRelationship] of cases) {
    const { store, replayState } = replayStore();
    assert.equal(verifyAdapterMessage({ message: candidateMessage, proof: candidateProof, relationship: candidateRelationship, verifier: publicKey, replayState, now: "2029-01-01T00:00:01.000Z" }).decision, "STOP");
    store.close();
  }
});

test("messages stop when the relationship is absent or its authority epoch changes after signing", () => {
  const value = message();
  const proof = signAdapterMessage({ message: value, keyReference: "key-1", signer: privateKey });
  const root = mkdtempSync(path.join(tmpdir(), "next-saga-missing-relationship-"));
  temporaryRoots.push(root);
  mkdirSync(path.join(root, ".workflow-state"));
  const missingStore = openWorkflowStateStore({ repositoryRoot: root, expectedIdentity: { repository_logical_id: "repo", checkout_instance_id: "checkout", relationship_id: relationship.relationship_id }, clock: () => "2029-01-01T00:00:01.000Z" });
  const missingReplay = createStoreBackedReplayState({ store: missingStore, relationshipId: relationship.relationship_id });
  assert.equal(verifyAdapterMessage({ message: value, proof, relationship, verifier: publicKey, replayState: missingReplay, now: "2029-01-01T00:00:01.000Z" }).decision, "STOP");
  assert.equal(missingStore.getSagaReplayState({ relationshipId: relationship.relationship_id }).last_sequence, 0);
  missingStore.close();

  const { store, replayState } = replayStore();
  store.fence({ reason: "relationship-revoked-after-signing", expectedEpoch: 0 });
  assert.equal(verifyAdapterMessage({ message: value, proof, relationship, verifier: publicKey, replayState, now: "2029-01-01T00:00:01.000Z" }).decision, "STOP");
  assert.equal(store.getSagaReplayState({ relationshipId: relationship.relationship_id }).last_sequence, 0);
  store.close();
});

test("effect intent is deterministic and unknown or mismatched outcomes never become success", () => {
  const decision = { decision: "ALLOW", fingerprint: "authority" };
  const intent = prepareEffect({ decision, target: { repository_id: "repo" }, operation: "merge", expectedObject: { sha: "abc" }, request: { pr: 1 }, attemptLineage: "attempt" });
  assert.equal(intent.effect_key, prepareEffect({ decision, target: { repository_id: "repo" }, operation: "merge", expectedObject: { sha: "abc" }, request: { pr: 1 }, attemptLineage: "attempt" }).effect_key);
  assert.equal(reconcileEffect({ intent, observation: { status: "unknown" } }).state, "MANUAL_RECOVERY_REQUIRED");
  const matched = { status: "succeeded", effect_key: intent.effect_key, request_fingerprint: intent.request_fingerprint, authority_decision_id: intent.authority_decision_id, target: intent.target, operation: "merge", object_selector: { sha: "abc" } };
  assert.equal(reconcileEffect({ intent, observation: { ...matched, effect_key: "other" } }).state, "CONFLICT");
  assert.equal(reconcileEffect({ intent, observation: matched }).state, "OBSERVED");
});

test("receipt requires independent observation proof", () => {
  const intent = prepareEffect({ decision: { decision: "ALLOW", fingerprint: "authority" }, target: { repository_id: "repo" }, operation: "push", expectedObject: { sha: "abc" }, request: {}, attemptLineage: "attempt" });
  const observation = { object_identity: "ref", result: "matched" };
  const verifier = { independent: true, verifier_id: "independent-observer", verify: ({ observation_fingerprint }) => ({ verified: true, verifier_id: "independent-observer", observation_fingerprint, proof_fingerprint: sagaDigest({ observation_fingerprint }) }) };
  assert.throws(() => createEffectReceipt({ intent, observation, proof: { verified: false }, createdAt: "2029-01-01T00:00:00.000Z" }), /SAGA_INDEPENDENT_OBSERVATION_VERIFIER_REQUIRED/);
  assert.equal(createEffectReceipt({ intent, observation, proof: { evidence: "direct" }, verifier, createdAt: "2029-01-01T00:00:00.000Z" }).effect_key, intent.effect_key);
  assert.throws(() => createEffectReceipt({ intent, observation, proof: { verified: true }, verifier: { ...verifier, verify: () => ({ verified: true, verifier_id: "other", observation_fingerprint: sagaDigest(observation), proof_fingerprint: "forged" }) }, createdAt: "2029-01-01T00:00:00.000Z" }), /SAGA_OBSERVATION_PROOF_INVALID/);
});

test("graceful archive drains first while emergency revoke quarantines immediately", () => {
  const draining = transitionRelationship(relationship, "DRAINING", { unresolvedOutbox: [{ id: "one", state: "pending" }] });
  assert.equal(draining.relationship.state, "DRAINING");
  assert.throws(() => transitionRelationship(draining.relationship, "ARCHIVED", { unresolvedOutbox: draining.outbox }), /ARCHIVE_REQUIRES_OUTBOX_DISPOSITION/);
  const revoked = transitionRelationship(relationship, "REVOKED", { unresolvedOutbox: [{ id: "one", state: "pending" }] });
  assert.equal(revoked.outbox[0].state, "quarantined");
  assert.equal(revoked.relationship.authority_epoch, 1);
});

test("relationship transitions are independently verified and atomically persisted with emergency quarantine", () => {
  const root = mkdtempSync(path.join(tmpdir(), "next-saga-relationship-"));
  temporaryRoots.push(root);
  mkdirSync(path.join(root, ".workflow-state"));
  const store = openWorkflowStateStore({ repositoryRoot: root, expectedIdentity: { repository_logical_id: "repo", checkout_instance_id: "checkout", relationship_id: relationship.relationship_id }, clock: () => "2029-01-01T00:00:00.000Z" });
  const initializationVerifier = { independent: true, verifier_id: "relationship-initializer", verify: ({ initialization_fingerprint }) => ({ verified: true, verifier_id: "relationship-initializer", initialization_fingerprint, proof_fingerprint: sagaDigest({ initialization_fingerprint, independently_verified: true }) }) };
  persistRelationshipInitialization({ store, relationship, evidence: { source: "fixture" }, verifier: initializationVerifier, now: "2029-01-01T00:00:00.000Z" });
  store.commit({ expectedRevision: 1, authorityEpoch: store.revocation_epoch, effectIntent: { effect_id: "effect-one", effect_key: "effect-key", request_fp: "request", authority_fp: "authority", target_id: relationship.relationship_id, operation: "adapter_send:send", expected_selector: {}, attempt_lineage: "attempt" }, outboxItem: { outbox_id: "outbox-one", intent_id: "effect-one", message_fp: "message", sequence: 1 } });
  const verifier = { independent: true, verifier_id: "relationship-verifier", verify: ({ transition_fingerprint }) => ({ verified: true, verifier_id: "relationship-verifier", transition_fingerprint, proof_fingerprint: sagaDigest({ transition_fingerprint, independently_verified: true }) }) };
  const revoked = persistRelationshipTransition({ store, relationshipId: relationship.relationship_id, nextState: "REVOKED", evidence: { reason: "emergency" }, verifier, now: "2029-01-01T00:00:00.000Z" });
  assert.equal(revoked.relationship.state, "REVOKED");
  assert.deepEqual(revoked.quarantined_outbox, ["outbox-one"]);
  assert.equal(store.getOutbox({ outboxId: "outbox-one" }).state, "quarantined");
  assert.equal(store.get({ id: revoked.record_id }).payload.transition_proof_fingerprint, revoked.proof_fingerprint);
  assert.equal(store.recovery_only, false);
  store.close();
});

test("a global fence blocks every stale non-revoking Relationship transition", () => {
  const verifier = { independent: true, verifier_id: "relationship-verifier", verify: ({ transition_fingerprint }) => ({ verified: true, verifier_id: "relationship-verifier", transition_fingerprint, proof_fingerprint: sagaDigest({ transition_fingerprint, independently_verified: true }) }) };
  for (const nextState of ["DRAINING", "DETACHED"]) {
    const { store } = replayStore();
    const fenced = store.fence({ reason: `block-stale-${nextState.toLowerCase()}` });
    assert.throws(() => persistRelationshipTransition({ store, relationshipId: relationship.relationship_id, nextState, evidence: { reason: "must-not-refresh" }, verifier, now: "2029-01-01T00:00:01.000Z" }), /RELATIONSHIP_AUTHORITY_EPOCH_STALE/);
    assert.equal(store.revision, fenced.revision);
    assert.deepEqual(store.query({ kind: "Relationship", limit: 1000 }).records.map((record) => [record.lifecycle_state, record.payload.authority_epoch]), [["ACTIVE", 0]]);
    store.close();
  }

  const { store } = replayStore();
  persistRelationshipTransition({ store, relationshipId: relationship.relationship_id, nextState: "DETACHED", evidence: { reason: "pre-fence-detach" }, verifier, now: "2029-01-01T00:00:01.000Z" });
  const fenced = store.fence({ reason: "block-stale-reactivation" });
  assert.throws(() => persistRelationshipTransition({ store, relationshipId: relationship.relationship_id, nextState: "ACTIVE", evidence: { reason: "must-not-reactivate" }, verifier, now: "2029-01-01T00:00:01.000Z" }), /RELATIONSHIP_AUTHORITY_EPOCH_STALE/);
  assert.equal(store.revision, fenced.revision);
  assert.equal(store.query({ kind: "Relationship", limit: 1000 }).records.sort((left, right) => right.record_revision - left.record_revision)[0].lifecycle_state, "DETACHED");
  store.close();
});

test("draining relationships reject new work and admit only pre-drain reconciliation", () => {
  const draining = { ...relationship, state: "DRAINING", draining_started_at: "2029-01-01T00:00:00.000Z" };
  const base = { messageId: "message-drain", senderId: "child", verifierId: "parent", recipientInstanceId: "parent-instance", relationship: draining, sequence: 1, causationId: "cause", idempotencyKey: "drain-idempotency", createdAt: "2029-01-01T00:00:01.000Z" };
  assert.throws(() => createSagaMessage({ ...base, nonce: "new-work", messageType: "new_task", payload: {} }), /SAGA_DRAINING_NEW_WORK_FORBIDDEN/);
  assert.doesNotThrow(() => createSagaMessage({ ...base, nonce: "existing", messageType: "reconciliation", payload: { intent_id: "intent-1" }, intentRecord: { effect_id: "intent-1", target_id: relationship.relationship_id, created_at: "2028-12-31T23:59:59.000Z" } }));
});

test("rollback fences first and fails closed on missing evidence or unresolved effects", () => {
  let rollback = beginRollback({ candidateFingerprint: "candidate", expectedEpoch: 3 });
  assert.equal(rollback.authority_epoch, 4);
  rollback = advanceRollback(rollback, { nextState: "DRAINING_OR_QUARANTINING", evidenceFingerprint: "drain", verified: true });
  const failed = advanceRollback(rollback, { nextState: "STATE_RESTORED", evidenceFingerprint: "restore", verified: true, unresolvedEffects: 1 });
  assert.equal(failed.state, "MANUAL_RECOVERY_REQUIRED");
});

test("activation is ordered and candidate drift returns to shadow", () => {
  let activation = { mode: "planned", candidate_fingerprint: null, evidence: [] };
  activation = advanceActivation(activation, { nextMode: "shadow", candidateFingerprint: "candidate", evidenceFingerprint: "shadow-proof" });
  assert.equal(activation.mode, "shadow");
  assert.throws(() => advanceActivation(activation, { nextMode: "enforced", candidateFingerprint: "candidate", evidenceFingerprint: "bad-order" }), /ACTIVATION_ORDER_INVALID/);
  assert.throws(() => advanceActivation(activation, { nextMode: "release_verified", candidateFingerprint: "changed", evidenceFingerprint: "release" }), /CANDIDATE_DRIFT_REQUIRES_SHADOW/);
  const drift = advanceActivation(activation, { nextMode: "shadow", candidateFingerprint: "changed", evidenceFingerprint: "new-shadow" });
  assert.equal(drift.mode, "shadow");
  assert.equal(drift.reason, "CANDIDATE_DRIFT");
});

test("child projection is bounded and cannot leak paths or foreign evidence", () => {
  const projection = projectChildProgress({ relationship_id: "relationship", repository_logical_id: "child", verified_completed_weight: 2, accepted_total_weight: 4, lifecycle_stage: "build_and_verify", execution_phase: "fast_loop", blocker_codes: [], evidence_fresh_until: "2030-01-01T00:00:00.000Z", next_action: "focused checks" });
  assert.match(projection.fingerprint, /^[a-f0-9]{64}$/);
  assert.throws(() => projectChildProgress({ ...projection, child_path: "/child" }), /CHILD_PROJECTION_FIELD_FORBIDDEN/);
});

test("messages reject secret, raw command, and child path fields", () => {
  for (const payload of [{ api_key: "x" }, { command: "rm" }, { child_path: "/child" }]) assert.throws(() => message({ payload }), /SAGA_PROHIBITED_FIELD/);
});
