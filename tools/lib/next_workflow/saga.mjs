import { createHash, sign as cryptoSign, verify as cryptoVerify } from "node:crypto";
import { findSecretMaterial } from "./secret_policy.mjs";

const EFFECT_STATES = new Set(["PREPARED", "DISPATCHING", "OBSERVED", "RECONCILED", "CONFLICT", "UNKNOWN", "MANUAL_RECOVERY_REQUIRED"]);
const RELATIONSHIP_TRANSITIONS = {
  ACTIVE: ["DRAINING", "REVOKED", "DETACHED"],
  DRAINING: ["ARCHIVED", "REVOKED"],
  ARCHIVED: [],
  REVOKED: [],
  DETACHED: ["ACTIVE", "ARCHIVED"]
};
const ROLLBACK_ORDER = ["FENCING", "DRAINING_OR_QUARANTINING", "STATE_RESTORED", "LEGACY_VERIFIED", "ROLLED_BACK"];
const ACTIVATION_ORDER = ["planned", "shadow", "release_verified", "recovery_verified", "rollback_verified", "archive_decommission_verified", "ready", "enforced"];
const DRAINING_MESSAGE_TYPES = new Set(["observation", "reconciliation", "existing_intent_delivery"]);
const PROHIBITED_KEYS = /(^|_)(absolute_path|child_path|raw_payload|command)($|_)/i;

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

function containsProhibitedKey(value) {
  if (findSecretMaterial(value)) return true;
  if (Array.isArray(value)) return value.some(containsProhibitedKey);
  if (!value || typeof value !== "object") return false;
  return Object.entries(value).some(([key, child]) => PROHIBITED_KEYS.test(key) || containsProhibitedKey(child));
}

function relationshipCoreFromPersistedPayload(payload) {
  const {
    initialization_fingerprint: ignoredInitialization,
    initialization_proof_fingerprint: ignoredInitializationProof,
    transition_fingerprint: ignoredTransition,
    transition_proof_fingerprint: ignoredTransitionProof,
    ...relationship
  } = payload ?? {};
  return relationship;
}

export function prepareEffect({ decision, target, operation, expectedObject, request, attemptLineage }) {
  if (decision?.decision !== "ALLOW" || typeof decision.fingerprint !== "string") throw new Error("SAGA_AUTHORITY_ALLOW_REQUIRED");
  if (!target || typeof target !== "object") throw new Error("SAGA_TARGET_REQUIRED");
  if (containsProhibitedKey({ target, expectedObject, request })) throw new Error("SAGA_PROHIBITED_FIELD");
  const requestFingerprint = digest(request ?? {});
  const expectedSelector = structuredClone(expectedObject ?? {});
  const effectKey = digest({ authority: decision.fingerprint, target, operation, expected: expectedSelector, request: requestFingerprint });
  const intent = { schema_version: "1.0.0", effect_id: `effect-${effectKey.slice(0, 24)}`, effect_key: effectKey, request_fingerprint: requestFingerprint, authority_decision_id: decision.fingerprint, target, operation: requireString(operation, "SAGA_OPERATION_REQUIRED"), expected_object_selector: expectedSelector, attempt_lineage: requireString(attemptLineage, "SAGA_ATTEMPT_LINEAGE_REQUIRED"), state: "PREPARED", observation_state: "not_observed", recovery_disposition: "pending" };
  return { ...intent, fingerprint: digest(intent) };
}

export function createSagaMessage({ messageId, senderId, verifierId, recipientInstanceId, relationship, sequence, nonce, causationId, idempotencyKey, receiptLinkage = null, messageType, payload, intentRecord, createdAt, maxBytes = 65536 }) {
  if (relationship?.state !== "ACTIVE" && relationship?.state !== "DRAINING") throw new Error("SAGA_RELATIONSHIP_NOT_SENDABLE");
  if (relationship.revocation_state !== "active" || relationship.lease?.state !== "active" || !Number.isFinite(Date.parse(relationship.lease?.expires_at)) || Date.parse(relationship.lease.expires_at) < Date.parse(createdAt)) throw new Error("SAGA_RELATIONSHIP_LEASE_INVALID");
  if (!Number.isFinite(Date.parse(createdAt))) throw new Error("SAGA_CREATED_AT_INVALID");
  if (senderId !== relationship.sender_id || verifierId !== relationship.verifier_id || recipientInstanceId !== relationship.recipient_instance_id) throw new Error("SAGA_PEER_IDENTITY_MISMATCH");
  requireString(relationship.lease?.id, "SAGA_LEASE_ID_REQUIRED");
  if (relationship.state === "DRAINING") {
    if (!DRAINING_MESSAGE_TYPES.has(messageType)) throw new Error("SAGA_DRAINING_NEW_WORK_FORBIDDEN");
    if (!payload?.intent_id || intentRecord?.effect_id !== payload.intent_id || intentRecord?.target_id !== relationship.relationship_id || !Number.isFinite(Date.parse(intentRecord?.created_at)) || !Number.isFinite(Date.parse(relationship.draining_started_at)) || Date.parse(intentRecord.created_at) >= Date.parse(relationship.draining_started_at)) throw new Error("SAGA_DRAINING_PREEXISTING_INTENT_REQUIRED");
  }
  if (!Number.isInteger(sequence) || sequence < 1) throw new Error("SAGA_SEQUENCE_INVALID");
  if (containsProhibitedKey(payload)) throw new Error("SAGA_PROHIBITED_FIELD");
  if (receiptLinkage !== null && (typeof receiptLinkage !== "string" || receiptLinkage.length === 0)) throw new Error("SAGA_RECEIPT_LINKAGE_INVALID");
  const payloadDigest = digest(payload);
  const message = {
    protocol_version: "1.1.0",
    message_id: requireString(messageId, "SAGA_MESSAGE_ID_REQUIRED"),
    sender_id: requireString(senderId, "SAGA_SENDER_REQUIRED"),
    verifier_id: requireString(verifierId, "SAGA_VERIFIER_REQUIRED"),
    recipient_instance_id: requireString(recipientInstanceId, "SAGA_RECIPIENT_REQUIRED"),
    relationship_id: requireString(relationship.relationship_id, "SAGA_RELATIONSHIP_REQUIRED"),
    lease_id: relationship.lease.id,
    authority_epoch: relationship.authority_epoch,
    revocation_state: relationship.revocation_state,
    sequence,
    nonce: requireString(nonce, "SAGA_NONCE_REQUIRED"),
    causation_id: requireString(causationId, "SAGA_CAUSATION_REQUIRED"),
    idempotency_key: requireString(idempotencyKey, "SAGA_IDEMPOTENCY_KEY_REQUIRED"),
    receipt_linkage: receiptLinkage,
    message_type: requireString(messageType, "SAGA_MESSAGE_TYPE_REQUIRED"),
    payload,
    payload_digest: payloadDigest,
    projection_hash: payloadDigest,
    created_at: requireString(createdAt, "SAGA_CREATED_AT_REQUIRED")
  };
  if (Buffer.byteLength(canonicalJson(message), "utf8") > maxBytes) throw new Error("SAGA_MESSAGE_TOO_LARGE");
  return { ...message, fingerprint: digest(message) };
}

export function signAdapterMessage({ message, keyReference, signer }) {
  if (!message?.fingerprint || message.fingerprint !== digest(Object.fromEntries(Object.entries(message).filter(([key]) => key !== "fingerprint")))) throw new Error("SAGA_MESSAGE_FINGERPRINT_INVALID");
  requireString(keyReference, "SAGA_KEY_REFERENCE_REQUIRED");
  const bytes = Buffer.from(canonicalJson(message));
  const signature = typeof signer === "function" ? signer(bytes) : cryptoSign(null, bytes, signer);
  if (!Buffer.isBuffer(signature)) throw new Error("SAGA_SIGNATURE_INVALID");
  return { algorithm: "Ed25519", key_reference: keyReference, message_fingerprint: message.fingerprint, signature: signature.toString("base64") };
}

export function verifyAdapterMessage({ message, proof, relationship, verifier, replayState, now, maxAgeMs = 300000 }) {
  const reasons = [];
  const messageWithoutFingerprint = message && typeof message === "object" ? Object.fromEntries(Object.entries(message).filter(([key]) => key !== "fingerprint")) : {};
  if (message?.fingerprint !== digest(messageWithoutFingerprint)) reasons.push("MESSAGE_FINGERPRINT_INVALID");
  if (proof?.algorithm !== "Ed25519" || proof?.message_fingerprint !== message?.fingerprint) reasons.push("PROOF_BINDING_INVALID");
  if (proof?.key_reference !== relationship?.message_key_reference) reasons.push("MESSAGE_KEY_REFERENCE_MISMATCH");
  if (message?.relationship_id !== relationship?.relationship_id) reasons.push("RELATIONSHIP_MISMATCH");
  if (message?.authority_epoch !== relationship?.authority_epoch) reasons.push("AUTHORITY_EPOCH_MISMATCH");
  if (message?.lease_id !== relationship?.lease?.id || message?.revocation_state !== relationship?.revocation_state) reasons.push("LEASE_OR_REVOCATION_BINDING_MISMATCH");
  if (relationship?.state !== "ACTIVE" && relationship?.state !== "DRAINING") reasons.push("RELATIONSHIP_NOT_ACCEPTING");
  if (relationship?.revocation_state !== "active" || relationship?.lease?.state !== "active" || !Number.isFinite(Date.parse(relationship?.lease?.expires_at)) || Date.parse(relationship.lease.expires_at) < Date.parse(now)) reasons.push("RELATIONSHIP_LEASE_INVALID");
  if (message?.verifier_id !== relationship?.verifier_id || message?.sender_id !== relationship?.sender_id || message?.recipient_instance_id !== relationship?.recipient_instance_id) reasons.push("PEER_IDENTITY_MISMATCH");
  const projected = digest(message?.payload);
  if (message?.payload_digest !== projected || message?.projection_hash !== projected) reasons.push("PAYLOAD_DIGEST_MISMATCH");
  if (typeof message?.message_id !== "string" || typeof message?.idempotency_key !== "string" || (message?.receipt_linkage !== null && typeof message?.receipt_linkage !== "string")) reasons.push("MESSAGE_SCHEMA_INVALID");
  const created = Date.parse(message?.created_at);
  if (Number.isNaN(created) || Math.abs(Date.parse(now) - created) > maxAgeMs) reasons.push("MESSAGE_STALE");
  let persistedReplay;
  let persistedRelationship;
  if (replayState?.store_backed !== true || replayState?.relationship_id !== relationship?.relationship_id || typeof replayState.inspect !== "function" || typeof replayState.inspectRelationship !== "function" || typeof replayState.accept !== "function" || typeof replayState.hasPreexistingIntent !== "function") reasons.push("DURABLE_REPLAY_STATE_REQUIRED");
  else {
    try {
      persistedRelationship = replayState.inspectRelationship();
      const persistedCore = relationshipCoreFromPersistedPayload(persistedRelationship?.record?.payload);
      if (!persistedRelationship?.record || canonicalJson(persistedCore) !== canonicalJson(relationship) || persistedRelationship.revocation_epoch !== relationship.authority_epoch) reasons.push("PERSISTED_RELATIONSHIP_MISMATCH");
      persistedReplay = replayState.inspect();
      if (message?.sequence !== Number(persistedReplay?.last_sequence ?? 0) + 1) reasons.push("SEQUENCE_GAP_OR_REPLAY");
      if (persistedReplay?.nonces?.some((entry) => entry.nonce === message?.nonce)) reasons.push("NONCE_REPLAY");
      if (persistedReplay?.authority_epoch !== null && persistedReplay?.authority_epoch !== relationship?.authority_epoch) reasons.push("REPLAY_AUTHORITY_EPOCH_MISMATCH");
    } catch {
      reasons.push("DURABLE_REPLAY_STATE_UNAVAILABLE");
    }
  }
  if (relationship?.state === "DRAINING") {
    const drainingAllowed = DRAINING_MESSAGE_TYPES.has(message?.message_type) && typeof message?.payload?.intent_id === "string" && Number.isFinite(Date.parse(relationship?.draining_started_at)) && replayState?.store_backed === true && replayState.hasPreexistingIntent({ intentId: message.payload.intent_id, before: relationship.draining_started_at });
    if (!drainingAllowed) reasons.push("DRAINING_SCOPE_INVALID");
  }
  let signatureValid = false;
  try {
    const bytes = Buffer.from(canonicalJson(message));
    const signature = Buffer.from(proof?.signature ?? "", "base64");
    signatureValid = typeof verifier === "function" ? verifier(bytes, signature, proof?.key_reference) : cryptoVerify(null, bytes, verifier, signature);
  } catch {}
  if (!signatureValid) reasons.push("SIGNATURE_INVALID");
  if (reasons.length) return { decision: "STOP", reasons: [...new Set(reasons)].sort() };
  try {
    const accepted = replayState.accept({ message, proofKeyReference: proof.key_reference, relationshipRecordFingerprint: persistedRelationship.record.content_fp, acceptedAt: now });
    return { decision: "PASS", verified_at: now, message_fingerprint: message.fingerprint, next_sequence: message.sequence + 1, store_revision: accepted.revision };
  } catch (error) {
    return { decision: "STOP", reasons: [String(error?.message ?? "DURABLE_REPLAY_ACCEPT_FAILED")] };
  }
}

export function createStoreBackedReplayState({ store, relationshipId }) {
  if (!store || typeof store.getSagaReplayState !== "function" || typeof store.getCurrentRelationship !== "function" || typeof store.acceptSagaMessage !== "function" || typeof store.hasPreexistingIntent !== "function") throw new Error("DURABLE_REPLAY_STORE_REQUIRED");
  requireString(relationshipId, "SAGA_RELATIONSHIP_REQUIRED");
  return Object.freeze({
    store_backed: true,
    relationship_id: relationshipId,
    inspect: () => store.getSagaReplayState({ relationshipId }),
    inspectRelationship: () => store.getCurrentRelationship({ relationshipId }),
    hasPreexistingIntent: ({ intentId, before }) => store.hasPreexistingIntent({ effectId: intentId, targetId: relationshipId, before }),
    accept: ({ message, proofKeyReference, relationshipRecordFingerprint, acceptedAt }) => store.acceptSagaMessage({
      expectedRevision: store.revision,
      relationshipId,
      relationshipRecordFingerprint,
      authorityEpoch: message.authority_epoch,
      sequence: message.sequence,
      nonce: message.nonce,
      messageFingerprint: message.fingerprint,
      senderId: message.sender_id,
      verifierId: message.verifier_id,
      recipientInstanceId: message.recipient_instance_id,
      leaseId: message.lease_id,
      revocationState: message.revocation_state,
      messageKeyReference: proofKeyReference,
      messageType: message.message_type,
      intentId: message.payload?.intent_id ?? null,
      acceptedAt,
      event: { event_id: `saga-message-${message.fingerprint}`, created_at: acceptedAt, payload: { relationship_id: relationshipId, authority_epoch: message.authority_epoch, sequence: message.sequence, message_id: message.message_id, idempotency_key: message.idempotency_key, message_fingerprint: message.fingerprint } }
    })
  });
}

export function createEffectReceipt({ intent, observation, proof, verifier, createdAt }) {
  if (!intent?.effect_key || !EFFECT_STATES.has(intent.state)) throw new Error("SAGA_INTENT_INVALID");
  if (!observation || typeof observation !== "object" || containsProhibitedKey(observation)) throw new Error("SAGA_OBSERVATION_INVALID");
  if (!verifier || verifier.independent !== true || typeof verifier.verifier_id !== "string" || typeof verifier.verify !== "function") throw new Error("SAGA_INDEPENDENT_OBSERVATION_VERIFIER_REQUIRED");
  const observationFingerprint = digest(observation);
  const verified = verifier.verify({ intent: structuredClone(intent), observation: structuredClone(observation), candidate_proof: structuredClone(proof), observation_fingerprint: observationFingerprint });
  if (verified && typeof verified.then === "function") throw new Error("SAGA_ASYNC_OBSERVATION_VERIFIER_UNSUPPORTED");
  if (!verified || verified.verified !== true || verified.verifier_id !== verifier.verifier_id || verified.observation_fingerprint !== observationFingerprint || typeof verified.proof_fingerprint !== "string" || verified.proof_fingerprint.length === 0) throw new Error("SAGA_OBSERVATION_PROOF_INVALID");
  const receipt = { schema_version: "1.0.0", receipt_id: `receipt-${intent.effect_key.slice(0, 24)}`, effect_key: intent.effect_key, request_fingerprint: intent.request_fingerprint, authority_decision_id: intent.authority_decision_id, target: intent.target, operation: intent.operation, observed_object: observation.object_identity, observation_fingerprint: digest(observation), result: observation.result, created_at: createdAt };
  return { ...receipt, verifier_id: verifier.verifier_id, proof_fingerprint: verified.proof_fingerprint, fingerprint: digest({ ...receipt, verifier_id: verifier.verifier_id, proof_fingerprint: verified.proof_fingerprint }) };
}

export function reconcileEffect({ intent, observation }) {
  if (!intent?.effect_key) throw new Error("SAGA_INTENT_REQUIRED");
  if (!observation || observation.status === "unavailable" || observation.status === "unknown") return { state: "MANUAL_RECOVERY_REQUIRED", decision: "STOP", code: "EXTERNAL_OUTCOME_UNKNOWN" };
  if (observation.effect_key !== intent.effect_key || observation.request_fingerprint !== intent.request_fingerprint || observation.authority_decision_id !== intent.authority_decision_id || observation.operation !== intent.operation) return { state: "CONFLICT", decision: "STOP", code: "EFFECT_IDENTITY_MISMATCH" };
  if (intent.target_id !== undefined && observation.target_id !== intent.target_id) return { state: "CONFLICT", decision: "STOP", code: "EFFECT_TARGET_MISMATCH" };
  if (intent.target !== undefined && canonicalJson(observation.target) !== canonicalJson(intent.target)) return { state: "CONFLICT", decision: "STOP", code: "EFFECT_TARGET_MISMATCH" };
  if (canonicalJson(observation.object_selector) !== canonicalJson(intent.expected_object_selector)) return { state: "CONFLICT", decision: "STOP", code: "EXPECTED_OBJECT_MISMATCH" };
  if (observation.status === "succeeded") return { state: "OBSERVED", decision: "PASS", code: "MATCHED_SUCCESS" };
  return { state: "MANUAL_RECOVERY_REQUIRED", decision: "STOP", code: "IRREVERSIBLE_OR_FAILED_EFFECT" };
}

export function transitionRelationship(relationship, nextState, { unresolvedOutbox = [], now = new Date().toISOString() } = {}) {
  if (!RELATIONSHIP_TRANSITIONS[relationship?.state]?.includes(nextState)) throw new Error(`RELATIONSHIP_TRANSITION_INVALID:${relationship?.state}:${nextState}`);
  if (nextState === "ARCHIVED" && unresolvedOutbox.some((item) => item.state !== "delivered" && item.state !== "quarantined")) throw new Error("ARCHIVE_REQUIRES_OUTBOX_DISPOSITION");
  const emergency = nextState === "REVOKED";
  const outbox = unresolvedOutbox.map((item) => emergency && item.state !== "delivered" ? { ...item, state: "quarantined", disposition: "emergency_revoke" } : item);
  return { relationship: { ...relationship, state: nextState, authority_epoch: relationship.authority_epoch + (emergency || nextState === "ARCHIVED" ? 1 : 0), lease_state: nextState === "ACTIVE" || nextState === "DRAINING" ? relationship.lease_state : "revoked", lease: nextState === "ACTIVE" || nextState === "DRAINING" ? relationship.lease : { ...(relationship.lease ?? {}), state: "revoked" }, revocation_state: emergency || nextState === "ARCHIVED" ? "revoked" : relationship.revocation_state, ...(nextState === "DRAINING" ? { draining_started_at: now } : {}) }, outbox };
}

export function persistRelationshipInitialization({ store, relationship, evidence, verifier, now = new Date().toISOString() } = {}) {
  if (!store || typeof store.persistRelationshipInitialization !== "function" || typeof store.revision !== "number") throw new Error("RELATIONSHIP_INITIALIZATION_STORE_REQUIRED");
  if (!relationship || typeof relationship.relationship_id !== "string" || !["ACTIVE", "DETACHED"].includes(relationship.state) || !Number.isSafeInteger(relationship.authority_epoch) || relationship.authority_epoch < 0) throw new Error("RELATIONSHIP_INITIALIZATION_INVALID");
  if (!verifier || verifier.independent !== true || typeof verifier.verifier_id !== "string" || typeof verifier.verify !== "function") throw new Error("RELATIONSHIP_INITIALIZATION_VERIFIER_REQUIRED");
  const initializationFingerprint = digest({ relationship, evidence });
  const verification = verifier.verify({ relationship: structuredClone(relationship), candidate_evidence: structuredClone(evidence), initialization_fingerprint: initializationFingerprint });
  if (verification && typeof verification.then === "function") throw new Error("RELATIONSHIP_INITIALIZATION_ASYNC_VERIFIER_UNSUPPORTED");
  if (verification?.verified !== true || verification.verifier_id !== verifier.verifier_id || verification.initialization_fingerprint !== initializationFingerprint || !/^[a-f0-9]{64}$/.test(verification.proof_fingerprint ?? "")) throw new Error("RELATIONSHIP_INITIALIZATION_EVIDENCE_INVALID");
  const payload = { ...structuredClone(relationship), initialization_fingerprint: initializationFingerprint, initialization_proof_fingerprint: verification.proof_fingerprint };
  const recordId = `relationship-${relationship.relationship_id}-1-${relationship.state.toLowerCase()}`;
  const event = { event_id: `relationship-initialized-${initializationFingerprint.slice(0, 24)}`, aggregate_id: recordId, event_type: "RELATIONSHIP_INITIALIZED", payload: { relationship_id: relationship.relationship_id, state: relationship.state, initialization_fingerprint: initializationFingerprint, proof_fingerprint: verification.proof_fingerprint } };
  const persisted = store.persistRelationshipInitialization({
    expectedRevision: store.revision,
    relationshipId: relationship.relationship_id,
    initialState: relationship.state,
    record: { id: recordId, kind: "Relationship", schema_version: "1.0.0", record_revision: 1, authority_scope: relationship.relationship_id, lineage_id: relationship.relationship_id, lifecycle_state: relationship.state, payload, source_revision: "verified-initialization", policy_fp: verification.proof_fingerprint, input_fp: initializationFingerprint },
    event,
    verifier: {
      trusted: true,
      independent: true,
      verifier_id: verifier.verifier_id,
      verify({ proposed_record: proposedRecord, fingerprint }) {
        const { initialization_fingerprint: ignoredFingerprint, initialization_proof_fingerprint: ignoredProof, ...lockedRelationship } = proposedRecord.payload;
        const lockedFingerprint = digest({ relationship: lockedRelationship, evidence });
        if (lockedFingerprint !== proposedRecord.payload.initialization_fingerprint) return false;
        const lockedVerification = verifier.verify({ relationship: structuredClone(lockedRelationship), candidate_evidence: structuredClone(evidence), initialization_fingerprint: lockedFingerprint });
        if (lockedVerification && typeof lockedVerification.then === "function") return false;
        return lockedVerification?.verified === true && lockedVerification.verifier_id === verifier.verifier_id && lockedVerification.initialization_fingerprint === lockedFingerprint && lockedVerification.proof_fingerprint === proposedRecord.payload.initialization_proof_fingerprint
          ? { verified: true, verifier_id: verifier.verifier_id, fingerprint, proof_fingerprint: lockedVerification.proof_fingerprint }
          : false;
      }
    }
  });
  return { decision: "PASS", relationship: structuredClone(relationship), record_id: recordId, store_revision: persisted.revision, proof_fingerprint: verification.proof_fingerprint };
}

export function persistRelationshipTransition({ store, relationshipId, nextState, evidence, verifier, now = new Date().toISOString() }) {
  if (!store || typeof store.query !== "function" || typeof store.listUnresolvedEffects !== "function" || typeof store.persistRelationshipLifecycle !== "function") throw new Error("RELATIONSHIP_LIFECYCLE_STORE_REQUIRED");
  requireString(relationshipId, "RELATIONSHIP_ID_REQUIRED");
  if (!verifier || verifier.independent !== true || typeof verifier.verifier_id !== "string" || typeof verifier.verify !== "function") throw new Error("RELATIONSHIP_TRANSITION_VERIFIER_REQUIRED");
  const currentRecord = store.query({ kind: "Relationship", limit: 1000 }).records.filter((record) => record.lineage_id === relationshipId && record.payload?.relationship_id === relationshipId).sort((left, right) => right.record_revision - left.record_revision)[0];
  if (!currentRecord) throw new Error("RELATIONSHIP_RECORD_REQUIRED");
  const unresolved = store.listUnresolvedEffects({ targetId: relationshipId });
  const transitioned = transitionRelationship(currentRecord.payload, nextState, { unresolvedOutbox: unresolved.map((item) => ({ id: item.outbox_id, state: item.outbox_state })), now });
  const transitionFingerprint = digest({ relationship_id: relationshipId, from: currentRecord.payload.state, to: nextState, current_fingerprint: currentRecord.content_fp, unresolved: unresolved.map((item) => ({ effect_id: item.effect_id, intent_state: item.intent_state, outbox_state: item.outbox_state })), evidence });
  const verification = verifier.verify({ relationship: structuredClone(currentRecord.payload), next_relationship: structuredClone(transitioned.relationship), unresolved_effects: structuredClone(unresolved), candidate_evidence: structuredClone(evidence), transition_fingerprint: transitionFingerprint });
  if (verification && typeof verification.then === "function") throw new Error("RELATIONSHIP_ASYNC_VERIFIER_UNSUPPORTED");
  if (!verification || verification.verified !== true || verification.verifier_id !== verifier.verifier_id || verification.transition_fingerprint !== transitionFingerprint || typeof verification.proof_fingerprint !== "string") throw new Error("RELATIONSHIP_TRANSITION_EVIDENCE_INVALID");
  const revision = currentRecord.record_revision + 1;
  const recordId = `relationship-${relationshipId}-${revision}-${nextState.toLowerCase()}`;
  const persisted = store.persistRelationshipLifecycle({
    expectedRevision: store.revision,
    relationshipId,
    expectedState: currentRecord.payload.state,
    nextState,
    quarantine: nextState === "REVOKED",
    record: { id: recordId, kind: "Relationship", schema_version: "1.0.0", record_revision: revision, authority_scope: relationshipId, lineage_id: relationshipId, lifecycle_state: nextState, payload: { ...transitioned.relationship, transition_proof_fingerprint: verification.proof_fingerprint, transition_fingerprint: transitionFingerprint }, source_revision: String(currentRecord.record_revision), policy_fp: verification.proof_fingerprint, input_fp: transitionFingerprint },
    event: { event_id: `relationship-transition-${transitionFingerprint.slice(0, 24)}`, event_type: `RELATIONSHIP_${nextState}`, payload: { relationship_id: relationshipId, from_state: currentRecord.payload.state, to_state: nextState, transition_fingerprint: transitionFingerprint, proof_fingerprint: verification.proof_fingerprint } },
    verifier: {
      trusted: true,
      independent: true,
      verifier_id: verifier.verifier_id,
      verify({ current_record: lockedCurrent, proposed_record: proposedRecord, unresolved_effects: lockedUnresolved, fingerprint }) {
        const lockedTransitionFingerprint = digest({ relationship_id: relationshipId, from: lockedCurrent.payload.state, to: nextState, current_fingerprint: lockedCurrent.content_fp, unresolved: lockedUnresolved.map((item) => ({ effect_id: item.effect_id, intent_state: item.intent_state, outbox_state: item.state })), evidence });
        if (lockedTransitionFingerprint !== proposedRecord.payload.transition_fingerprint) return false;
        const lockedVerification = verifier.verify({ relationship: structuredClone(lockedCurrent.payload), next_relationship: structuredClone(proposedRecord.payload), unresolved_effects: structuredClone(lockedUnresolved), candidate_evidence: structuredClone(evidence), transition_fingerprint: lockedTransitionFingerprint });
        if (lockedVerification && typeof lockedVerification.then === "function") return false;
        return lockedVerification?.verified === true && lockedVerification.verifier_id === verifier.verifier_id && lockedVerification.transition_fingerprint === lockedTransitionFingerprint && lockedVerification.proof_fingerprint === proposedRecord.payload.transition_proof_fingerprint
          ? { verified: true, verifier_id: verifier.verifier_id, fingerprint, proof_fingerprint: lockedVerification.proof_fingerprint }
          : false;
      }
    }
  });
  return { decision: "PASS", relationship: { ...transitioned.relationship, authority_epoch: persisted.revocation_epoch > 0 && ["REVOKED", "ARCHIVED"].includes(nextState) ? Math.max(transitioned.relationship.authority_epoch, persisted.revocation_epoch) : transitioned.relationship.authority_epoch }, record_id: recordId, store_revision: persisted.revision, quarantined_outbox: persisted.quarantined, proof_fingerprint: verification.proof_fingerprint };
}

export function beginRollback({ candidateFingerprint, expectedEpoch }) {
  return { schema_version: "1.0.0", candidate_fingerprint: requireString(candidateFingerprint, "ROLLBACK_CANDIDATE_REQUIRED"), state: "FENCING", authority_epoch: expectedEpoch + 1, steps: [{ state: "FENCING", verified: true }], decision: "REVISE" };
}

export function advanceRollback(rollback, { nextState, evidenceFingerprint, verified, unresolvedEffects = 0 }) {
  const index = ROLLBACK_ORDER.indexOf(rollback.state);
  if (nextState !== ROLLBACK_ORDER[index + 1]) throw new Error(`ROLLBACK_ORDER_INVALID:${rollback.state}:${nextState}`);
  if (verified !== true || typeof evidenceFingerprint !== "string") return { ...rollback, state: "MANUAL_RECOVERY_REQUIRED", decision: "STOP", failure: nextState };
  if (nextState === "STATE_RESTORED" && unresolvedEffects > 0) return { ...rollback, state: "MANUAL_RECOVERY_REQUIRED", decision: "STOP", failure: "UNRESOLVED_EFFECTS" };
  const next = { ...rollback, state: nextState, steps: [...rollback.steps, { state: nextState, verified: true, evidence_fingerprint: evidenceFingerprint }] };
  return { ...next, decision: nextState === "ROLLED_BACK" ? "PASS" : "REVISE" };
}

function candidateCycleMetadata({ activationId, candidateFingerprint, cycleStartRevision, cycleStep, previousRecordRevision, previousRecordContentFingerprint }) {
  const cycleId = digest({
    activation_id: activationId,
    candidate_fingerprint: candidateFingerprint,
    cycle_start_revision: cycleStartRevision,
    predecessor_record_revision: previousRecordRevision,
    predecessor_record_content_fingerprint: previousRecordContentFingerprint,
  });
  return {
    cycle_id: cycleId,
    cycle_start_revision: cycleStartRevision,
    cycle_step: cycleStep,
    previous_record_revision: previousRecordRevision,
    previous_record_content_fingerprint: previousRecordContentFingerprint,
  };
}

export function advanceActivation(activation, {
  nextMode,
  candidateFingerprint,
  evidenceFingerprint,
  nextRevision,
  previousRecordRevision,
  previousRecordContentFingerprint,
  activationId = "next-development-workflow",
}) {
  if (activation.mode === "rolled_back") throw new Error("ACTIVATION_ROLLBACK_TERMINAL");
  const cycleInputs = [nextRevision, previousRecordRevision, previousRecordContentFingerprint];
  const hasCycleInputs = cycleInputs.some((value) => value !== undefined);
  if (hasCycleInputs
    && (!Number.isSafeInteger(nextRevision)
      || nextRevision < 1
      || !Number.isSafeInteger(previousRecordRevision)
      || previousRecordRevision !== nextRevision - 1
      || (previousRecordRevision === 0
        ? previousRecordContentFingerprint !== null
        : !/^[a-f0-9]{64}$/.test(previousRecordContentFingerprint ?? "")))) {
    throw new Error("ACTIVATION_CYCLE_PREDECESSOR_INVALID");
  }
  if (activation.candidate_fingerprint && activation.candidate_fingerprint !== candidateFingerprint) {
    if (nextMode !== "shadow") throw new Error("CANDIDATE_DRIFT_REQUIRES_SHADOW");
    if (typeof evidenceFingerprint !== "string" || evidenceFingerprint.length === 0) return { ...activation, decision: "STOP", reason: "ACTIVATION_EVIDENCE_REQUIRED" };
    return {
      mode: "shadow",
      candidate_fingerprint: candidateFingerprint,
      evidence: [{ mode: "shadow", fingerprint: evidenceFingerprint }],
      ...(hasCycleInputs ? candidateCycleMetadata({
        activationId,
        candidateFingerprint,
        cycleStartRevision: nextRevision,
        cycleStep: 1,
        previousRecordRevision,
        previousRecordContentFingerprint,
      }) : {}),
      decision: "REVISE",
      reason: "CANDIDATE_DRIFT",
    };
  }
  const currentIndex = ACTIVATION_ORDER.indexOf(activation.mode);
  if (nextMode !== ACTIVATION_ORDER[currentIndex + 1]) throw new Error(`ACTIVATION_ORDER_INVALID:${activation.mode}:${nextMode}`);
  if (typeof evidenceFingerprint !== "string" || evidenceFingerprint.length === 0) return { ...activation, decision: "STOP", reason: "ACTIVATION_EVIDENCE_REQUIRED" };
  let cycleMetadata = {};
  if (hasCycleInputs) {
    if (activation.candidate_fingerprint === candidateFingerprint) {
      if (activation.schema_version !== "1.1.0"
        || !/^[a-f0-9]{64}$/.test(activation.cycle_id ?? "")
        || !Number.isSafeInteger(activation.cycle_start_revision)
        || !Number.isSafeInteger(activation.cycle_step)
        || activation.cycle_step < 1) {
        throw new Error("ACTIVATION_LEGACY_CYCLE_CONTINUATION_FORBIDDEN");
      }
      cycleMetadata = {
        cycle_id: activation.cycle_id,
        cycle_start_revision: activation.cycle_start_revision,
        cycle_step: activation.cycle_step + 1,
        previous_record_revision: previousRecordRevision,
        previous_record_content_fingerprint: previousRecordContentFingerprint,
      };
    } else {
      cycleMetadata = candidateCycleMetadata({
        activationId,
        candidateFingerprint,
        cycleStartRevision: nextRevision,
        cycleStep: 1,
        previousRecordRevision,
        previousRecordContentFingerprint,
      });
    }
  }
  return {
    mode: nextMode,
    candidate_fingerprint: candidateFingerprint,
    evidence: [...(activation.evidence ?? []), { mode: nextMode, fingerprint: evidenceFingerprint }],
    ...cycleMetadata,
    decision: nextMode === "enforced" ? "PASS" : "REVISE",
  };
}

export function projectChildProgress(input) {
  const allowed = ["relationship_id", "repository_logical_id", "verified_completed_weight", "accepted_total_weight", "lifecycle_stage", "execution_phase", "blocker_codes", "evidence_fresh_until", "next_action"];
  if (Object.keys(input).some((key) => !allowed.includes(key))) throw new Error("CHILD_PROJECTION_FIELD_FORBIDDEN");
  if (input.verified_completed_weight > input.accepted_total_weight || input.verified_completed_weight < 0 || input.accepted_total_weight <= 0) throw new Error("CHILD_PROGRESS_WEIGHT_INVALID");
  const projection = { ...input, blocker_codes: [...(input.blocker_codes ?? [])].sort() };
  return { ...projection, fingerprint: digest(projection) };
}

export function sagaDigest(value) {
  return digest(value);
}
