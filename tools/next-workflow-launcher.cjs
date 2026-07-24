#!/usr/bin/env node
"use strict";

const { createHash, createPublicKey, verify } = require("node:crypto");
const { execFileSync, spawnSync } = require("node:child_process");
const { chmodSync, existsSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync, writeSync } = require("node:fs");
const path = require("node:path");
const { DatabaseSync } = require("node:sqlite");

const REQUIRED_PROOFS = Object.freeze([
  "local_release",
  "pr_ci",
  "main_ci",
  "local_remote_sync",
  "recovery",
  "fenced_rollback",
  "archive_decommission",
  "outbox_disposition",
]);
const TRANSITION_MODES = Object.freeze([
  "shadow",
  "release_verified",
  "recovery_verified",
  "rollback_verified",
  "archive_decommission_verified",
  "ready",
]);
const ACTIVATION_CYCLE = Object.freeze([...TRANSITION_MODES, "enforced"]);
const CURRENT_ACTIVATION_SCHEMA_VERSION = "1.1.0";
const PROOF_EVIDENCE_FIELDS = Object.freeze({
  local_release: { repository_head: "git", checkout_instance_id: "string", command_manifest_fingerprint: "fingerprint", input_manifest_fingerprint: "fingerprint", artifact_manifest_fingerprint: "fingerprint" },
  pr_ci: { repository: "string", pr_number: "integer", head_sha: "git", run_id: "integer", check_names: "strings", artifact_digest: "fingerprint" },
  main_ci: { repository: "string", branch: "string", pr_number: "integer", candidate_head_sha: "git", merge_sha: "git", run_id: "integer", check_names: "strings", artifact_digest: "fingerprint" },
  local_remote_sync: { repository_logical_id: "string", local_head: "git", remote_head: "git", remote_ref: "string" },
  recovery: { database_identity_fingerprint: "fingerprint", candidate_fingerprint: "fingerprint", backup_manifest_fingerprint: "fingerprint", restore_proof_fingerprint: "fingerprint" },
  fenced_rollback: { candidate_fingerprint: "fingerprint", authority_epoch: "integer", checkpoint_ids: "strings", state_proof_fingerprint: "fingerprint" },
  archive_decommission: { relationship_id: "string", from_state: "string", to_state: "string", transition_proof_fingerprint: "fingerprint" },
  outbox_disposition: { relationship_id: "string", effect_ids: "strings", outbox_ids: "strings", disposition: "string", receipt_manifest_fingerprint: "fingerprint" },
});

function canonicalJson(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(",")}}`;
  return JSON.stringify(value);
}

function digest(value) {
  return createHash("sha256").update(Buffer.isBuffer(value) ? value : canonicalJson(value)).digest("hex");
}

function rawDigest(value) {
  return createHash("sha256").update(value).digest("hex");
}

function fail(code) {
  writeSync(process.stderr.fd, `${JSON.stringify({ decision: "STOP", code })}\n`);
  process.exit(1);
}

function exactKeys(value, expected) {
  return Boolean(value)
    && typeof value === "object"
    && !Array.isArray(value)
    && canonicalJson(Object.keys(value).sort()) === canonicalJson([...expected].sort());
}

function privatePath(candidate, code, { executable = false } = {}) {
  if (typeof candidate !== "string" || !path.isAbsolute(candidate) || !existsSync(candidate) || lstatSync(candidate).isSymbolicLink()) fail(code);
  const canonical = realpathSync(candidate);
  if (canonical !== candidate) fail(code);
  const info = lstatSync(canonical);
  if (!info.isFile()
    || (info.mode & 0o077) !== 0
    || (executable && (info.mode & 0o100) === 0)
    || (typeof process.getuid === "function" && info.uid !== process.getuid())) fail(code);
  return canonical;
}

function trustedExecutable(candidate, expectedFingerprint, code) {
  if (typeof candidate !== "string" || !path.isAbsolute(candidate) || !existsSync(candidate)) fail(code);
  const canonical = realpathSync(candidate);
  const info = lstatSync(canonical);
  if (!info.isFile() || (info.mode & 0o111) === 0 || (info.mode & 0o022) !== 0 || digest(readFileSync(canonical)) !== expectedFingerprint) fail(code);
  return canonical;
}

function privateJson(candidate, code) {
  const canonical = privatePath(candidate, code);
  try {
    return { path: canonical, value: JSON.parse(readFileSync(canonical, "utf8")) };
  } catch {
    fail(code);
  }
}

function publicKey(entry, now, source = false) {
  if (!entry
    || typeof entry.verifier !== "string"
    || typeof entry.key_id !== "string"
    || typeof entry.public_key_pem !== "string"
    || !Array.isArray(entry.allowed_kinds)
    || entry.revocation_state !== "active"
    || !Number.isFinite(Date.parse(entry.expires_at))
    || Date.parse(entry.expires_at) <= Date.parse(now)) fail(source ? "VERIFIED_LAUNCH_SOURCE_TRUST_INVALID" : "VERIFIED_LAUNCH_RELEASE_TRUST_INVALID");
  let key;
  try {
    key = createPublicKey(entry.public_key_pem);
  } catch {
    fail(source ? "VERIFIED_LAUNCH_SOURCE_TRUST_INVALID" : "VERIFIED_LAUNCH_RELEASE_TRUST_INVALID");
  }
  if (key.type !== "public" || key.asymmetricKeyType !== "ed25519") fail(source ? "VERIFIED_LAUNCH_SOURCE_TRUST_INVALID" : "VERIFIED_LAUNCH_RELEASE_TRUST_INVALID");
  return { ...entry, key };
}

function trustedVerifiers(releaseTrust, now) {
  if (!releaseTrust || releaseTrust.schema_version !== "1.0.0" || !Array.isArray(releaseTrust.verifiers) || !Array.isArray(releaseTrust.source_verifiers) || releaseTrust.verifiers.length === 0 || releaseTrust.source_verifiers.length === 0) fail("VERIFIED_LAUNCH_RELEASE_TRUST_INVALID");
  const release = new Map();
  const source = new Map();
  const releaseKeyMaterial = new Set();
  const sourceKeyMaterial = new Set();
  for (const entry of releaseTrust.verifiers) {
    const validated = publicKey(entry, now, false);
    const id = `${validated.verifier}:${validated.key_id}`;
    const material = digest(validated.key.export({ type: "spki", format: "der" }));
    if (release.has(id) || releaseKeyMaterial.has(material)) fail("VERIFIED_LAUNCH_RELEASE_TRUST_INVALID");
    release.set(id, validated);
    releaseKeyMaterial.add(material);
  }
  for (const entry of releaseTrust.source_verifiers) {
    const validated = publicKey(entry, now, true);
    const id = `${validated.verifier}:${validated.key_id}`;
    const material = digest(validated.key.export({ type: "spki", format: "der" }));
    if (source.has(id)
      || sourceKeyMaterial.has(material)
      || releaseKeyMaterial.has(material)
      || [...release.values()].some((candidate) => candidate.key_id === validated.key_id)) fail("VERIFIED_LAUNCH_SOURCE_TRUST_INVALID");
    source.set(id, validated);
    sourceKeyMaterial.add(material);
  }
  return { release, source };
}

function signaturePayload({ purpose, kind, candidateFingerprint, proofFingerprint, freshUntil }) {
  return Buffer.from(canonicalJson({
    schema_version: "1.0.0",
    purpose,
    kind,
    candidate_fingerprint: candidateFingerprint,
    proof_fingerprint: proofFingerprint,
    fresh_until: freshUntil,
  }));
}

function sourcePayload({ purpose, kind, candidateFingerprint, receiptFingerprint, freshUntil }) {
  return Buffer.from(canonicalJson({
    schema_version: "1.0.0",
    purpose,
    kind,
    candidate_fingerprint: candidateFingerprint,
    receipt_fingerprint: receiptFingerprint,
    fresh_until: freshUntil,
  }));
}

function verifySourceReceipt({ receipt, purpose, kind, candidateFingerprint, verifiers, now }) {
  const { fingerprint, signature, ...body } = receipt ?? {};
  if (!exactKeys(body, ["schema_version", "purpose", "kind", "candidate_fingerprint", "verifier", "verifier_key_id", "observed_at", "fresh_until", "evidence"])
    || body.schema_version !== "1.0.0"
    || body.purpose !== purpose
    || body.kind !== kind
    || body.candidate_fingerprint !== candidateFingerprint
    || !body.evidence
    || typeof body.evidence !== "object"
    || Array.isArray(body.evidence)
    || !Number.isFinite(Date.parse(body.observed_at))
    || !Number.isFinite(Date.parse(body.fresh_until))
    || Date.parse(body.observed_at) > Date.parse(now)
    || Date.parse(body.fresh_until) <= Date.parse(now)
    || fingerprint !== digest(body)
    || typeof signature !== "string") fail("VERIFIED_LAUNCH_SOURCE_RECEIPT_INVALID");
  const trusted = verifiers.get(`${body.verifier}:${body.verifier_key_id}`);
  if (!trusted || (!trusted.allowed_kinds.includes(kind) && !trusted.allowed_kinds.includes("*"))) fail("VERIFIED_LAUNCH_SOURCE_RECEIPT_INVALID");
  let bytes;
  try {
    bytes = Buffer.from(signature, "base64url");
  } catch {
    fail("VERIFIED_LAUNCH_SOURCE_RECEIPT_INVALID");
  }
  if (bytes.length !== 64 || verify(null, sourcePayload({ purpose, kind, candidateFingerprint, receiptFingerprint: fingerprint, freshUntil: body.fresh_until }), trusted.key, bytes) !== true) fail("VERIFIED_LAUNCH_SOURCE_RECEIPT_INVALID");
  return {
    evidence: body.evidence,
    receipt_fingerprint: fingerprint,
    fresh_until: body.fresh_until,
    verification_fingerprint: digest({ fingerprint, signature }),
  };
}

function proofBody(kind, proof) {
  return {
    kind,
    owner: proof.owner,
    verifier: proof.verifier,
    candidate_fingerprint: proof.candidate_fingerprint,
    fresh_until: proof.fresh_until,
    correctness: proof.correctness,
    evidence: proof.evidence,
    ...(proof.source_receipt ? { source_receipt: proof.source_receipt } : {}),
  };
}

function validEvidenceValue(value, type) {
  if (type === "string") return typeof value === "string" && value.length > 0;
  if (type === "integer") return Number.isSafeInteger(value) && value >= 0;
  if (type === "fingerprint") return typeof value === "string" && /^[a-f0-9]{64}$/u.test(value);
  if (type === "git") return typeof value === "string" && /^[a-f0-9]{40,64}$/u.test(value);
  if (type === "strings") return Array.isArray(value) && value.length > 0 && value.every((entry) => typeof entry === "string" && entry.length > 0) && new Set(value).size === value.length;
  return false;
}

function validProofEvidence(kind, evidence, candidateFingerprint) {
  const schema = PROOF_EVIDENCE_FIELDS[kind];
  if (!schema || !exactKeys(evidence, Object.keys(schema)) || !Object.entries(schema).every(([field, type]) => validEvidenceValue(evidence[field], type))) return false;
  if (["recovery", "fenced_rollback"].includes(kind) && evidence.candidate_fingerprint !== candidateFingerprint) return false;
  if (["pr_ci", "main_ci"].includes(kind) && evidence.pr_number < 1) return false;
  if (kind === "local_remote_sync" && evidence.local_head !== evidence.remote_head) return false;
  if (kind === "archive_decommission" && !["DRAINING", "DETACHED"].includes(evidence.from_state)) return false;
  if (kind === "archive_decommission" && evidence.to_state !== "ARCHIVED") return false;
  return true;
}

function verifySignedProof({ purpose, kind, proof, candidateFingerprint, releaseVerifiers, sourceVerifiers, now, sourcePurpose, sourceKind }) {
  if (!proof
    || proof.candidate_fingerprint !== candidateFingerprint
    || typeof proof.owner !== "string"
    || typeof proof.verifier !== "string"
    || proof.owner === proof.verifier
    || typeof proof.verifier_key_id !== "string"
    || typeof proof.signature !== "string"
    || typeof proof.fingerprint !== "string"
    || !Number.isFinite(Date.parse(proof.fresh_until))
    || Date.parse(proof.fresh_until) <= Date.parse(now)
    || proof.correctness?.status !== "passed"
    || typeof proof.correctness?.fingerprint !== "string"
    || proof.fingerprint !== digest(proofBody(kind, proof))) fail("VERIFIED_LAUNCH_SIGNED_PROOF_INVALID");
  const trusted = releaseVerifiers.get(`${proof.verifier}:${proof.verifier_key_id}`);
  if (!trusted || (!trusted.allowed_kinds.includes(kind) && !trusted.allowed_kinds.includes("*"))) fail("VERIFIED_LAUNCH_SIGNED_PROOF_INVALID");
  let signature;
  try {
    signature = Buffer.from(proof.signature, "base64url");
  } catch {
    fail("VERIFIED_LAUNCH_SIGNED_PROOF_INVALID");
  }
  if (signature.length !== 64 || verify(null, signaturePayload({ purpose, kind, candidateFingerprint, proofFingerprint: proof.fingerprint, freshUntil: proof.fresh_until }), trusted.key, signature) !== true) fail("VERIFIED_LAUNCH_SIGNED_PROOF_INVALID");
  const source = verifySourceReceipt({
    receipt: proof.source_receipt,
    purpose: sourcePurpose,
    kind: sourceKind,
    candidateFingerprint,
    verifiers: sourceVerifiers,
    now,
  });
  if (canonicalJson(source.evidence) !== canonicalJson(proof.evidence)
    || Date.parse(source.fresh_until) < Date.parse(proof.fresh_until)
    || proof.correctness.fingerprint !== digest({ kind, candidate_fingerprint: candidateFingerprint, evidence: proof.evidence, source_receipt_fingerprint: source.receipt_fingerprint })) fail("VERIFIED_LAUNCH_SIGNED_PROOF_INVALID");
  return {
    owner: proof.owner,
    verifier: proof.verifier,
    candidate_fingerprint: candidateFingerprint,
    proof_fingerprint: proof.fingerprint,
    fresh_until: proof.fresh_until,
    correctness: true,
    verification_fingerprint: digest({
      purpose,
      kind,
      verifier: proof.verifier,
      verifier_key_id: proof.verifier_key_id,
      candidate_fingerprint: candidateFingerprint,
      proof_fingerprint: proof.fingerprint,
      signature: proof.signature,
    }),
  };
}

function validReleaseLineage(proofs, candidate, candidateFingerprint, repositoryIdentity) {
  const localRelease = proofs?.local_release?.evidence;
  const prCi = proofs?.pr_ci?.evidence;
  const mainCi = proofs?.main_ci?.evidence;
  const synchronization = proofs?.local_remote_sync?.evidence;
  return localRelease?.repository_head === candidate.repository_head
    && localRelease?.checkout_instance_id === repositoryIdentity.checkout_instance_id
    && prCi?.head_sha === candidate.repository_head
    && mainCi?.candidate_head_sha === candidate.repository_head
    && prCi?.repository === mainCi?.repository
    && prCi?.pr_number === mainCi?.pr_number
    && mainCi?.branch === "main"
    && synchronization?.local_head === mainCi?.merge_sha
    && synchronization?.remote_head === mainCi?.merge_sha
    && synchronization?.remote_ref === "refs/remotes/origin/main"
    && synchronization?.repository_logical_id === repositoryIdentity.repository_logical_id
    && candidate.candidate_fingerprint === candidateFingerprint;
}

function releaseSummary({ proofs, candidate, candidateFingerprint, repositoryIdentity, verifiers, now }) {
  if (!validReleaseLineage(proofs, candidate, candidateFingerprint, repositoryIdentity)) fail("VERIFIED_LAUNCH_RELEASE_LINEAGE_INVALID");
  const verifiedProofs = {};
  for (const kind of REQUIRED_PROOFS) {
    const proof = proofs?.[kind];
    if (!validProofEvidence(kind, proof?.evidence, candidateFingerprint)) fail("VERIFIED_LAUNCH_RELEASE_EVIDENCE_INVALID");
    const verified = verifySignedProof({
      purpose: "next-workflow-release-proof",
      kind,
      proof,
      candidateFingerprint,
      releaseVerifiers: verifiers.release,
      sourceVerifiers: verifiers.source,
      now,
      sourcePurpose: "next-workflow-release-source",
      sourceKind: kind,
    });
    verifiedProofs[kind] = {
      owner: proof.owner,
      verifier: proof.verifier,
      candidate_fingerprint: candidateFingerprint,
      proof_fingerprint: proof.fingerprint,
      fresh_until: proof.fresh_until,
      correctness_fingerprint: proof.correctness.fingerprint,
      evidence_fingerprint: digest(proof.evidence),
      verification_fingerprint: verified.verification_fingerprint,
    };
  }
  const summary = {
    status: "passed",
    candidate_fingerprint: candidateFingerprint,
    missing: [],
    mismatched: [],
    stale: [],
    incorrect: [],
    invalid: [],
    verified_proofs: verifiedProofs,
    verified_at: new Date(Date.parse(now)).toISOString(),
  };
  return { ...summary, fingerprint: digest(summary) };
}

function activationCycleId({ activationId, candidateFingerprint, cycleStartRevision, previousRecordRevision, previousRecordContentFingerprint }) {
  return digest({
    activation_id: activationId,
    candidate_fingerprint: candidateFingerprint,
    cycle_start_revision: cycleStartRevision,
    predecessor_record_revision: previousRecordRevision,
    predecessor_record_content_fingerprint: previousRecordContentFingerprint,
  });
}

function activationVerificationError(code) {
  const error = new Error(code);
  error.code = code;
  throw error;
}

function decodeActivationRow(row, { repositoryId, checkoutId }) {
  let payload;
  try {
    payload = JSON.parse(row?.payload_json);
  } catch {
    activationVerificationError("VERIFIED_LAUNCH_ACTIVATION_PAYLOAD_INVALID");
  }
  const revision = Number(row?.record_revision);
  if (!row
    || row.kind !== "NextWorkflowActivation"
    || row.repository_id !== repositoryId
    || row.checkout_id !== checkoutId
    || row.authority_scope !== "release"
    || row.lineage_id !== "next-development-workflow"
    || row.lineage_id !== payload.activation_id
    || row.schema_version !== payload.schema_version
    || !["1.0.0", CURRENT_ACTIVATION_SCHEMA_VERSION].includes(payload.schema_version)
    || !Number.isSafeInteger(revision)
    || revision < 1
    || revision !== payload.revision
    || row.lifecycle_state !== payload.mode
    || row.input_fp !== payload.candidate_fingerprint
    || row.content_fp !== digest(payload)) {
    activationVerificationError("VERIFIED_LAUNCH_ACTIVATION_ROW_BINDING_INVALID");
  }
  const previousRevision = payload.schema_version === CURRENT_ACTIVATION_SCHEMA_VERSION
    ? payload.previous_record_revision
    : revision - 1;
  if (!Number.isSafeInteger(previousRevision)
    || previousRevision !== revision - 1
    || row.source_revision !== String(previousRevision)) {
    activationVerificationError("VERIFIED_LAUNCH_ACTIVATION_SOURCE_BINDING_INVALID");
  }
  if (payload.mode === "enforced" && row.policy_fp !== payload.proof_summary?.fingerprint) {
    activationVerificationError("VERIFIED_LAUNCH_ACTIVATION_POLICY_BINDING_INVALID");
  }
  return { row, payload, revision };
}

function verifyActivationRows(rows, { repositoryId, checkoutId }) {
  if (!Array.isArray(rows) || rows.length === 0 || typeof repositoryId !== "string" || typeof checkoutId !== "string") {
    activationVerificationError("VERIFIED_LAUNCH_ACTIVATION_HISTORY_REQUIRED");
  }
  const revisions = new Map();
  const ids = new Set();
  for (const row of rows) {
    const revision = Number(row?.record_revision);
    if (!Number.isSafeInteger(revision) || revision < 1 || ids.has(row?.id)) activationVerificationError("VERIFIED_LAUNCH_ACTIVATION_REVISION_INVALID");
    ids.add(row.id);
    const entries = revisions.get(revision) ?? [];
    entries.push(row);
    revisions.set(revision, entries);
  }
  const newestRevision = Math.max(...revisions.keys());
  if (revisions.get(newestRevision).length !== 1) activationVerificationError("VERIFIED_LAUNCH_ACTIVATION_NEWEST_DUPLICATE");
  const latest = decodeActivationRow(revisions.get(newestRevision)[0], { repositoryId, checkoutId });
  if (latest.payload.mode !== "enforced") activationVerificationError("VERIFIED_LAUNCH_ACTIVATION_NEWEST_NOT_ENFORCED");
  if (latest.payload.schema_version === "1.0.0") {
    if (latest.revision !== ACTIVATION_CYCLE.length) activationVerificationError("VERIFIED_LAUNCH_LEGACY_ACTIVATION_REVISION_INVALID");
    const cycleRows = ACTIVATION_CYCLE.map((mode, index) => {
      const matches = revisions.get(index + 1);
      if (!matches || matches.length !== 1) activationVerificationError("VERIFIED_LAUNCH_LEGACY_ACTIVATION_HISTORY_INVALID");
      const entry = decodeActivationRow(matches[0], { repositoryId, checkoutId });
      if (entry.payload.schema_version !== "1.0.0"
        || entry.payload.mode !== mode
        || entry.payload.candidate_fingerprint !== latest.payload.candidate_fingerprint) {
        activationVerificationError("VERIFIED_LAUNCH_LEGACY_ACTIVATION_HISTORY_INVALID");
      }
      return entry;
    });
    return { activation: latest.payload, row: latest.row, cycleRows };
  }
  if (latest.payload.cycle_step !== ACTIVATION_CYCLE.length
    || latest.revision !== latest.payload.cycle_start_revision + ACTIVATION_CYCLE.length - 1
    || !/^[a-f0-9]{64}$/u.test(latest.payload.cycle_id ?? "")) {
    activationVerificationError("VERIFIED_LAUNCH_ACTIVATION_CYCLE_INVALID");
  }
  const cycleRows = ACTIVATION_CYCLE.map((mode, index) => {
    const revision = latest.payload.cycle_start_revision + index;
    const matches = revisions.get(revision);
    if (!matches || matches.length !== 1) activationVerificationError("VERIFIED_LAUNCH_ACTIVATION_CYCLE_HISTORY_INVALID");
    const entry = decodeActivationRow(matches[0], { repositoryId, checkoutId });
    if (entry.payload.schema_version !== CURRENT_ACTIVATION_SCHEMA_VERSION
      || entry.payload.mode !== mode
      || entry.payload.revision !== revision
      || entry.payload.cycle_id !== latest.payload.cycle_id
      || entry.payload.cycle_start_revision !== latest.payload.cycle_start_revision
      || entry.payload.cycle_step !== index + 1
      || entry.payload.candidate_fingerprint !== latest.payload.candidate_fingerprint) {
      activationVerificationError("VERIFIED_LAUNCH_ACTIVATION_CYCLE_HISTORY_INVALID");
    }
    return entry;
  });
  const first = cycleRows[0];
  const predecessorRevision = first.payload.previous_record_revision;
  const predecessor = predecessorRevision === 0 ? null : revisions.get(predecessorRevision);
  if (predecessorRevision !== first.revision - 1
    || (predecessorRevision === 0
      ? first.payload.previous_record_content_fingerprint !== null
      : (!predecessor
        || predecessor.length !== 1
        || predecessor[0].content_fp !== first.payload.previous_record_content_fingerprint))
    || first.payload.cycle_id !== activationCycleId({
      activationId: first.payload.activation_id,
      candidateFingerprint: first.payload.candidate_fingerprint,
      cycleStartRevision: first.payload.cycle_start_revision,
      previousRecordRevision: first.payload.previous_record_revision,
      previousRecordContentFingerprint: first.payload.previous_record_content_fingerprint,
    })) {
    activationVerificationError("VERIFIED_LAUNCH_ACTIVATION_CYCLE_START_INVALID");
  }
  for (let index = 1; index < cycleRows.length; index += 1) {
    if (cycleRows[index].payload.previous_record_revision !== cycleRows[index - 1].revision
      || cycleRows[index].payload.previous_record_content_fingerprint !== cycleRows[index - 1].row.content_fp) {
      activationVerificationError("VERIFIED_LAUNCH_ACTIVATION_PREDECESSOR_INVALID");
    }
  }
  return { activation: latest.payload, row: latest.row, cycleRows };
}

function verifyEnforcedActivation(activation, trust, authorityEpoch, now) {
  const legacyFields = ["activated_at", "activation_id", "authority_epoch", "candidate_definition", "candidate_fingerprint", "correctness", "evidence", "mode", "proof_summary", "release_prerequisite_fingerprint", "revision", "schema_version", "signed_release_proofs", "signed_transition_proofs", "transition_evidence"];
  const currentFields = [...legacyFields, "cycle_id", "cycle_start_revision", "cycle_step", "previous_record_content_fingerprint", "previous_record_revision"];
  const legacy = activation?.schema_version === "1.0.0";
  const allowedFields = legacy ? legacyFields : currentFields;
  if (!exactKeys(activation, allowedFields)
    || !["1.0.0", CURRENT_ACTIVATION_SCHEMA_VERSION].includes(activation.schema_version)
    || activation.activation_id !== "next-development-workflow"
    || activation.mode !== "enforced"
    || !Number.isSafeInteger(activation.revision)
    || (legacy
      ? activation.revision !== ACTIVATION_CYCLE.length
      : (activation.cycle_step !== ACTIVATION_CYCLE.length
        || activation.revision !== activation.cycle_start_revision + ACTIVATION_CYCLE.length - 1
        || activation.previous_record_revision !== activation.revision - 1
        || !/^[a-f0-9]{64}$/u.test(activation.previous_record_content_fingerprint ?? "")
        || !/^[a-f0-9]{64}$/u.test(activation.cycle_id ?? "")))
    || activation.authority_epoch !== authorityEpoch
    || !Number.isFinite(Date.parse(activation.activated_at))
    || Date.parse(activation.activated_at) > Date.parse(now)) fail("VERIFIED_LAUNCH_ACTIVATION_INVALID");
  const prerequisites = trust.release_prerequisites;
  if (!prerequisites
    || prerequisites.schema_version !== "1.0.0"
    || prerequisites.prerequisite_id !== "next-development-workflow-release-prerequisites"
    || !Number.isSafeInteger(prerequisites.revision)
    || prerequisites.revision < 1
    || prerequisites.headless_runtime?.state !== "accepted"
    || prerequisites.headless_runtime?.developer_accepted !== true
    || !/^[a-f0-9]{64}$/u.test(prerequisites.headless_runtime?.evidence_fingerprint ?? "")
    || !Number.isFinite(Date.parse(prerequisites.headless_runtime?.accepted_at))
    || !["paused", "accepted"].includes(prerequisites.control_center?.state)
    || typeof prerequisites.control_center?.blocks_headless_activation !== "boolean"
    || (prerequisites.control_center.state === "paused" && prerequisites.control_center.blocks_headless_activation !== false)
    || (prerequisites.control_center.state === "accepted"
      && (prerequisites.control_center.developer_accepted !== true
        || !/^[a-f0-9]{64}$/u.test(prerequisites.control_center.evidence_fingerprint ?? "")
        || !Number.isFinite(Date.parse(prerequisites.control_center.accepted_at))))) fail("VERIFIED_LAUNCH_RELEASE_PREREQUISITES_INVALID");
  const candidate = activation.candidate_definition;
  const { candidate_fingerprint: claimedCandidateFingerprint, ...candidateCore } = candidate ?? {};
  if (!candidate
    || claimedCandidateFingerprint !== activation.candidate_fingerprint
    || digest(candidateCore) !== claimedCandidateFingerprint
    || candidate.release_prerequisite_fingerprint !== activation.release_prerequisite_fingerprint
    || digest(trust.release_prerequisites) !== activation.release_prerequisite_fingerprint
    || !Array.isArray(candidate.artifact_paths)
    || !Array.isArray(candidate.artifact_fingerprints)) fail("VERIFIED_LAUNCH_CANDIDATE_INVALID");
  const verifiers = trustedVerifiers(trust.release_trust, now);
  releaseSummary({ proofs: activation.signed_release_proofs, candidate, candidateFingerprint: claimedCandidateFingerprint, repositoryIdentity: trust.repository_identity, verifiers, now });
  const storedSummary = releaseSummary({
    proofs: activation.signed_release_proofs,
    candidate,
    candidateFingerprint: claimedCandidateFingerprint,
    repositoryIdentity: trust.repository_identity,
    verifiers,
    now: activation.activated_at,
  });
  if (canonicalJson(storedSummary) !== canonicalJson(activation.proof_summary)
    || canonicalJson(activation.correctness) !== canonicalJson({ status: "passed", fingerprint: storedSummary.fingerprint })) fail("VERIFIED_LAUNCH_ACTIVATION_SUMMARY_INVALID");
  const expectedEvidence = REQUIRED_PROOFS.map((kind) => ({
    kind,
    status: "passed",
    candidate_fingerprint: claimedCandidateFingerprint,
    fingerprint: storedSummary.verified_proofs[kind].proof_fingerprint,
  }));
  if (canonicalJson(expectedEvidence) !== canonicalJson(activation.evidence)
    || !Array.isArray(activation.signed_transition_proofs)
    || activation.signed_transition_proofs.length !== TRANSITION_MODES.length) fail("VERIFIED_LAUNCH_ACTIVATION_EVIDENCE_INVALID");
  const expectedTransitions = TRANSITION_MODES.map((mode, index) => {
    const proof = activation.signed_transition_proofs[index];
    if (!exactKeys(proof?.evidence, ["acceptance_prerequisite_fingerprint", "repository_head", "stage_evidence_fingerprint"])
      || proof.evidence.acceptance_prerequisite_fingerprint !== activation.release_prerequisite_fingerprint
      || proof.evidence.repository_head !== candidate.repository_head
      || !/^[a-f0-9]{64}$/u.test(proof.evidence.stage_evidence_fingerprint ?? "")) fail("VERIFIED_LAUNCH_TRANSITION_EVIDENCE_INVALID");
    const verified = verifySignedProof({
      purpose: "next-workflow-activation-transition",
      kind: mode,
      proof,
      candidateFingerprint: claimedCandidateFingerprint,
      releaseVerifiers: verifiers.release,
      sourceVerifiers: verifiers.source,
      now,
      sourcePurpose: "next-workflow-transition-source",
      sourceKind: `transition:${mode}`,
    });
    return {
      mode,
      fingerprint: proof.fingerprint,
      kind: mode,
      owner: proof.owner,
      verifier: proof.verifier,
      candidate_fingerprint: claimedCandidateFingerprint,
      fresh_until: proof.fresh_until,
      correctness_fingerprint: proof.correctness.fingerprint,
      verification_fingerprint: verified.verification_fingerprint,
    };
  });
  expectedTransitions.push({ mode: "enforced", fingerprint: digest({ nextMode: "enforced", release: storedSummary.fingerprint }) });
  if (canonicalJson(expectedTransitions) !== canonicalJson(activation.transition_evidence)) fail("VERIFIED_LAUNCH_TRANSITION_LINEAGE_INVALID");
  return { candidate, candidateFingerprint: claimedCandidateFingerprint, activationFingerprint: digest(activation) };
}

function main() {
const repositoryInput = process.argv[2];
if (!repositoryInput || !path.isAbsolute(repositoryInput)) fail("VERIFIED_LAUNCH_REPOSITORY_REQUIRED");
const repository = realpathSync(repositoryInput);
const trustPathInput = process.env.NEXT_WORKFLOW_OWNER_TRUST_PATH;
if (!trustPathInput) fail("VERIFIED_LAUNCH_OWNER_TRUST_REQUIRED");
const loadedTrust = privateJson(trustPathInput, "VERIFIED_LAUNCH_OWNER_TRUST_INVALID");
const trust = loadedTrust.value;
const now = new Date().toISOString();
if (trust.trust_source_id !== "headless-runtime-owner-trust"
  || typeof trust.repository_logical_id !== "string"
  || trust.repository_logical_id.length === 0
  || typeof trust.checkout_instance_id !== "string"
  || trust.checkout_instance_id.length === 0
  || !exactKeys(trust.repository_identity, ["repository_logical_id", "checkout_instance_id", "origin_digest", "checkout_anchor_digest", "config_digest", "attested_at"])
  || trust.repository_identity.repository_logical_id !== trust.repository_logical_id
  || trust.repository_identity.checkout_instance_id !== trust.checkout_instance_id
  || ["origin_digest", "checkout_anchor_digest", "config_digest"].some((field) => !/^[a-f0-9]{64}$/u.test(trust.repository_identity[field] ?? ""))
  || !Number.isFinite(Date.parse(trust.repository_identity.attested_at))
  || !Number.isFinite(Date.parse(trust.issued_at))
  || !Number.isFinite(Date.parse(trust.expires_at))
  || Date.parse(trust.issued_at) > Date.parse(now)
  || Date.parse(trust.expires_at) <= Date.parse(now)
  || typeof trust.production_state?.generation_id !== "string"
  || typeof trust.production_state?.database_relative_path !== "string"
  || !exactKeys(trust.runtime_launcher, ["path", "fingerprint", "wrapper_interpreter_path", "wrapper_interpreter_fingerprint", "script_path", "script_fingerprint", "interpreter_path", "interpreter_fingerprint"])) fail("VERIFIED_LAUNCH_TRUST_BINDING_INVALID");

const wrapperPath = privatePath(trust.runtime_launcher.path, "VERIFIED_LAUNCH_WRAPPER_INVALID", { executable: true });
const scriptPath = privatePath(trust.runtime_launcher.script_path, "VERIFIED_LAUNCH_SCRIPT_INVALID");
if (scriptPath !== realpathSync(__filename)
  || digest(readFileSync(wrapperPath)) !== trust.runtime_launcher.fingerprint
  || digest(readFileSync(scriptPath)) !== trust.runtime_launcher.script_fingerprint) fail("VERIFIED_LAUNCH_TRUST_BINDING_INVALID");
const interpreterPath = trustedExecutable(trust.runtime_launcher.interpreter_path, trust.runtime_launcher.interpreter_fingerprint, "VERIFIED_LAUNCH_INTERPRETER_INVALID");
if (interpreterPath !== realpathSync(process.execPath)) fail("VERIFIED_LAUNCH_INTERPRETER_INVALID");
const wrapperInterpreterPath = trustedExecutable(trust.runtime_launcher.wrapper_interpreter_path, trust.runtime_launcher.wrapper_interpreter_fingerprint, "VERIFIED_LAUNCH_WRAPPER_INTERPRETER_INVALID");
let parentExecutable;
let parentArguments;
try {
  parentExecutable = realpathSync(`/proc/${process.ppid}/exe`);
  parentArguments = readFileSync(`/proc/${process.ppid}/cmdline`).toString("utf8").split("\0");
  if (parentArguments.at(-1) !== "") fail("VERIFIED_LAUNCH_WRAPPER_PARENT_REQUIRED");
  parentArguments.pop();
} catch {
  fail("VERIFIED_LAUNCH_WRAPPER_PARENT_REQUIRED");
}
if (parentExecutable !== wrapperInterpreterPath
  || parentArguments[1] !== wrapperPath
  || canonicalJson(parentArguments.slice(2)) !== canonicalJson(process.argv.slice(2))) fail("VERIFIED_LAUNCH_WRAPPER_PARENT_REQUIRED");
const expectedSanitizedLaunch = digest({
  script_fingerprint: trust.runtime_launcher.script_fingerprint,
  interpreter_fingerprint: trust.runtime_launcher.interpreter_fingerprint,
});
if (process.env.NEXT_WORKFLOW_SANITIZED_LAUNCH !== expectedSanitizedLaunch
  || process.env.NODE_OPTIONS !== undefined
  || process.env.NODE_PATH !== undefined) fail("VERIFIED_LAUNCH_SANITIZED_ENTRY_REQUIRED");

const databasePath = path.resolve(repository, trust.production_state.database_relative_path);
if (!databasePath.startsWith(`${repository}${path.sep}`)) fail("VERIFIED_LAUNCH_DATABASE_PATH_INVALID");
let activation;
let generation;
let identity;
let authorityEpoch;
let activationRows;
try {
  const database = new DatabaseSync(databasePath, { readOnly: true, allowExtension: false });
  try {
    generation = JSON.parse(database.prepare("SELECT value_json FROM store_meta WHERE key='state_generation_id'").get()?.value_json ?? "null");
    identity = JSON.parse(database.prepare("SELECT value_json FROM store_meta WHERE key='identity'").get()?.value_json ?? "null");
    authorityEpoch = JSON.parse(database.prepare("SELECT value_json FROM store_meta WHERE key='revocation_epoch'").get()?.value_json ?? "null");
    activationRows = database.prepare("SELECT * FROM records WHERE kind='NextWorkflowActivation' ORDER BY record_revision,id").all();
  } finally {
    database.close();
  }
} catch {
  fail("VERIFIED_LAUNCH_PRODUCTION_STATE_UNAVAILABLE");
}
if (generation !== trust.production_state.generation_id
  || identity?.repository_logical_id !== trust.repository_logical_id
  || identity?.checkout_instance_id !== trust.checkout_instance_id
  || !Number.isSafeInteger(authorityEpoch)
  || authorityEpoch < 0) fail("VERIFIED_LAUNCH_PRODUCTION_STATE_BINDING_INVALID");
try {
  activation = verifyActivationRows(activationRows, {
    repositoryId: trust.repository_logical_id,
    checkoutId: trust.checkout_instance_id,
  }).activation;
} catch {
  fail("VERIFIED_LAUNCH_ACTIVATION_INVALID");
}
const verifiedActivation = verifyEnforcedActivation(activation, trust, authorityEpoch, now);
const candidate = verifiedActivation.candidate;

const rootOwnerAppearsAsOverflow = (() => {
  try {
    return readFileSync("/proc/self/uid_map", "utf8").split(/\r?\n/u).some((line) => {
      const [inside, outside, length] = line.trim().split(/\s+/u).map(Number);
      return inside === process.getuid?.() && outside === 0 && length === 1;
    });
  } catch {
    return false;
  }
})();
const git = ["/usr/bin/git", "/bin/git"].find((entry) => {
  try {
    const canonical = realpathSync(entry);
    const info = lstatSync(canonical);
    return info.isFile()
      && (info.mode & 0o111) !== 0
      && (info.mode & 0o022) === 0
      && (info.uid === 0 || (info.uid === 65534 && rootOwnerAppearsAsOverflow))
      && ["/usr/bin", "/bin"].includes(path.dirname(canonical));
  } catch {
    return false;
  }
});
if (!git) fail("VERIFIED_LAUNCH_TRUSTED_GIT_UNAVAILABLE");
const gitEnvironment = {
  PATH: "/usr/bin:/bin",
  LANG: "C.UTF-8",
  LC_ALL: "C.UTF-8",
  GIT_CONFIG_NOSYSTEM: "1",
  GIT_CONFIG_GLOBAL: "/dev/null",
  GIT_OPTIONAL_LOCKS: "0",
  GIT_TERMINAL_PROMPT: "0",
  GIT_NO_REPLACE_OBJECTS: "1",
};
function runGit(arguments_, encoding = "utf8") {
  return execFileSync(git, ["--no-replace-objects", "--no-optional-locks", "-c", "core.hooksPath=/dev/null", "-c", "protocol.file.allow=never", "-C", repository, ...arguments_], {
    encoding,
    env: gitEnvironment,
    stdio: ["ignore", "pipe", "pipe"],
    timeout: 30000,
    maxBuffer: 64 * 1024 * 1024,
  });
}
function repositoryFile(relativePath, code) {
  if (typeof relativePath !== "string"
    || relativePath !== path.posix.normalize(relativePath)
    || relativePath.startsWith("../")
    || path.isAbsolute(relativePath)) fail(code);
  const candidatePath = path.resolve(repository, relativePath);
  if (!candidatePath.startsWith(`${repository}${path.sep}`) || !existsSync(candidatePath) || lstatSync(candidatePath).isSymbolicLink()) fail(code);
  const canonical = realpathSync(candidatePath);
  if (canonical !== candidatePath || !lstatSync(canonical).isFile()) fail(code);
  return canonical;
}
function canonicalOrigin(rawOrigin) {
  if (typeof rawOrigin !== "string" || !rawOrigin.trim() || rawOrigin.includes("\0") || /[\r\n]/u.test(rawOrigin)) fail("VERIFIED_LAUNCH_REPOSITORY_ORIGIN_INVALID");
  const raw = rawOrigin.trim();
  const scp = /^(?:[^@/]+@)?([^:/]+):(.+)$/u.exec(raw);
  if (scp && !/^[a-z][a-z0-9+.-]*:\/\//iu.test(raw)) {
    const pathname = `/${scp[2]}`.replace(/\/{2,}/gu, "/").replace(/\.git\/?$/iu, "").replace(/\/$/u, "");
    return `remote://${scp[1].toLowerCase()}${pathname}`;
  }
  let url;
  try {
    url = new URL(raw);
  } catch {
    return `local://${path.resolve(raw)}`;
  }
  if (url.password) fail("VERIFIED_LAUNCH_REPOSITORY_ORIGIN_INVALID");
  if (url.protocol === "file:") return `local://${path.resolve(decodeURIComponent(url.pathname))}`;
  if (!url.hostname) fail("VERIFIED_LAUNCH_REPOSITORY_ORIGIN_INVALID");
  const pathname = url.pathname.replace(/\/{2,}/gu, "/").replace(/\.git\/?$/iu, "").replace(/\/$/u, "");
  return `remote://${url.hostname.toLowerCase()}${url.port ? `:${url.port}` : ""}${pathname}`;
}
const managedIdentityBytes = readFileSync(repositoryFile("learning/NEXT_WORKFLOW_REPOSITORY_IDENTITY.json", "VERIFIED_LAUNCH_REPOSITORY_IDENTITY_CONFIG_INVALID"));
let persistedIdentityDocument;
let managedIdentity;
try {
  persistedIdentityDocument = JSON.parse(readFileSync(repositoryFile(".workflow-state/checkout-identity.json", "VERIFIED_LAUNCH_CHECKOUT_IDENTITY_INVALID"), "utf8"));
  managedIdentity = JSON.parse(managedIdentityBytes);
} catch {
  fail("VERIFIED_LAUNCH_REPOSITORY_IDENTITY_INVALID");
}
const repositoryStats = lstatSync(repository);
const derivedIdentity = {
  repository_logical_id: managedIdentity.repository_logical_id,
  checkout_instance_id: persistedIdentityDocument.checkout_instance_id,
  origin_digest: rawDigest(canonicalOrigin(runGit(["config", "--get", "remote.origin.url"]).trim())),
  checkout_anchor_digest: rawDigest(`${repositoryStats.dev}:${repositoryStats.ino}`),
  config_digest: rawDigest(managedIdentityBytes),
  attested_at: persistedIdentityDocument.attested_at,
};
if (!exactKeys(persistedIdentityDocument, ["schema_version", "repository_logical_id", "checkout_instance_id", "origin_digest", "checkout_anchor_digest", "config_digest", "attested_at"])
  || persistedIdentityDocument.schema_version !== "1.0.0"
  || !exactKeys(managedIdentity, ["schema_version", "config_id", "management_mode", "repository_logical_id", "attested_origin_digest"])
  || managedIdentity.schema_version !== "1.0.0"
  || managedIdentity.management_mode !== "managed"
  || managedIdentity.attested_origin_digest !== derivedIdentity.origin_digest
  || canonicalJson({
    repository_logical_id: persistedIdentityDocument.repository_logical_id,
    checkout_instance_id: persistedIdentityDocument.checkout_instance_id,
    origin_digest: persistedIdentityDocument.origin_digest,
    checkout_anchor_digest: persistedIdentityDocument.checkout_anchor_digest,
    config_digest: persistedIdentityDocument.config_digest,
    attested_at: persistedIdentityDocument.attested_at,
  }) !== canonicalJson(derivedIdentity)
  || canonicalJson(derivedIdentity) !== canonicalJson(trust.repository_identity)) fail("VERIFIED_LAUNCH_REPOSITORY_IDENTITY_INVALID");
if (runGit(["status", "--porcelain=v1", "--untracked-files=all"]).trim() !== "") fail("VERIFIED_LAUNCH_REQUIRES_CLEAN_WORKTREE");
const head = runGit(["rev-parse", "HEAD"]).trim();
const tree = runGit(["rev-parse", `${head}^{tree}`]).trim();
const deployedHead = activation.signed_release_proofs.main_ci.evidence.merge_sha;
if (head !== deployedHead || tree !== candidate.repository_tree) fail("VERIFIED_LAUNCH_REPOSITORY_MISMATCH");
const verifiedArtifactBytes = new Map();
const artifactFingerprints = [...candidate.artifact_paths].sort().map((relativePath) => {
  if (typeof relativePath !== "string" || relativePath !== path.posix.normalize(relativePath) || relativePath.startsWith("../") || path.isAbsolute(relativePath)) fail("VERIFIED_LAUNCH_ARTIFACT_PATH_INVALID");
  const gitBytes = runGit(["show", `${head}:${relativePath}`], null);
  const actualPath = repositoryFile(relativePath, "VERIFIED_LAUNCH_DEPLOYED_ARTIFACT_INVALID");
  const actualBytes = readFileSync(actualPath);
  if (!actualBytes.equals(gitBytes)) fail("VERIFIED_LAUNCH_DEPLOYED_ARTIFACT_INVALID");
  verifiedArtifactBytes.set(relativePath, gitBytes);
  return `${relativePath}:${digest(gitBytes)}`;
});
if (canonicalJson(artifactFingerprints) !== canonicalJson(candidate.artifact_fingerprints)) fail("VERIFIED_LAUNCH_ARTIFACT_MISMATCH");
if (!verifiedArtifactBytes.has("tools/next-workflow.mjs")) fail("VERIFIED_LAUNCH_RUNTIME_ENTRY_NOT_SIGNED");

const snapshotRoot = mkdtempSync(path.join(path.dirname(loadedTrust.path), "verified-runtime-"));
const snapshotDirectories = new Set([snapshotRoot]);
try {
  for (const [relativePath, bytes] of verifiedArtifactBytes) {
    const target = path.join(snapshotRoot, ...relativePath.split("/"));
    const directory = path.dirname(target);
    mkdirSync(directory, { recursive: true, mode: 0o700 });
    let cursor = directory;
    while (cursor.startsWith(snapshotRoot)) {
      snapshotDirectories.add(cursor);
      if (cursor === snapshotRoot) break;
      cursor = path.dirname(cursor);
    }
    writeFileSync(target, bytes, { mode: 0o400, flag: "wx" });
    chmodSync(target, 0o400);
  }
  for (const directory of [...snapshotDirectories].sort((left, right) => right.length - left.length)) chmodSync(directory, 0o500);

  const home = typeof process.env.HOME === "string" && path.isAbsolute(process.env.HOME) ? process.env.HOME : path.dirname(path.dirname(loadedTrust.path));
  const providerPath = trust.owner_acceptance?.provider_executable?.path;
  const environment = {
    HOME: home,
    USER: process.env.USER ?? "",
    LOGNAME: process.env.LOGNAME ?? "",
    PATH: `${typeof providerPath === "string" ? path.dirname(providerPath) : ""}:/usr/bin:/bin`,
    LANG: "C.UTF-8",
    LC_ALL: "C.UTF-8",
    NEXT_WORKFLOW_OWNER_TRUST_PATH: loadedTrust.path,
    NEXT_WORKFLOW_VERIFIED_REPOSITORY_ROOT: repository,
    NEXT_WORKFLOW_VERIFIED_RUNTIME_ROOT: snapshotRoot,
    NEXT_WORKFLOW_VERIFIED_LAUNCH: digest({
      candidate_fingerprint: verifiedActivation.candidateFingerprint,
      launcher_fingerprint: trust.runtime_launcher.fingerprint,
    }),
  };
  for (const name of ["TERM", "COLORTERM", "NO_COLOR"]) if (typeof process.env[name] === "string") environment[name] = process.env[name];
  const result = spawnSync(interpreterPath, [path.join(snapshotRoot, "tools", "next-workflow.mjs"), ...process.argv.slice(3)], {
    cwd: repository,
    env: environment,
    encoding: null,
    maxBuffer: 16 * 1024 * 1024,
    stdio: ["inherit", "pipe", "pipe"],
  });
  if (result.error) fail("VERIFIED_LAUNCH_CHILD_FAILED");
  if (!Buffer.isBuffer(result.stdout) || result.stdout.length === 0) fail("VERIFIED_LAUNCH_CHILD_STDOUT_INVALID");
  if (Buffer.isBuffer(result.stdout) && result.stdout.length > 0) writeSync(process.stdout.fd, result.stdout);
  if (Buffer.isBuffer(result.stderr) && result.stderr.length > 0) writeSync(process.stderr.fd, result.stderr);
  process.exitCode = result.status ?? 1;
} finally {
  for (const directory of [...snapshotDirectories].sort((left, right) => left.length - right.length)) {
    try { chmodSync(directory, 0o700); } catch {}
  }
  try { rmSync(snapshotRoot, { recursive: true, force: true }); } catch {}
}
}

module.exports = Object.freeze({
  verifyActivationRows,
});

if (require.main === module) main();
