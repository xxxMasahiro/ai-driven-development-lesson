import { createHash, createPrivateKey, createPublicKey, sign } from "node:crypto";
import { lstatSync, readFileSync, realpathSync } from "node:fs";
import path from "node:path";
import { validateReleaseProofEvidence } from "./release.mjs";
import { releaseSignaturePayload } from "./release_trust.mjs";
import { verifySignedSourceReceipt } from "./release_source_receipts.mjs";

const RELEASE_PROOF_KINDS = Object.freeze([
  "local_release",
  "pr_ci",
  "main_ci",
  "local_remote_sync",
  "recovery",
  "fenced_rollback",
  "archive_decommission",
  "outbox_disposition",
]);
const TRANSITION_MODES = new Set([
  "shadow",
  "release_verified",
  "recovery_verified",
  "rollback_verified",
  "archive_decommission_verified",
  "ready",
]);

function canonicalJson(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(",")}}`;
  return JSON.stringify(value);
}

function digest(value) {
  return createHash("sha256").update(canonicalJson(value)).digest("hex");
}

function outsideRepository(repositoryRoot, candidate) {
  const relative = path.relative(realpathSync(repositoryRoot), candidate);
  return relative === ".." || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative);
}

function loadSigningIdentity({ repositoryRoot, runtimeTrust, privateKeyPath }) {
  if (!runtimeTrust?.release_trust || typeof privateKeyPath !== "string" || !path.isAbsolute(privateKeyPath)) throw new Error("RELEASE_SIGNING_CONFIGURATION_INVALID");
  if (lstatSync(privateKeyPath).isSymbolicLink()) throw new Error("RELEASE_SIGNING_PRIVATE_KEY_UNSAFE");
  const canonical = realpathSync(privateKeyPath);
  const info = lstatSync(canonical);
  if (!outsideRepository(repositoryRoot, canonical) || !info.isFile() || (info.mode & 0o077) !== 0 || (typeof process.getuid === "function" && info.uid !== process.getuid())) throw new Error("RELEASE_SIGNING_PRIVATE_KEY_UNSAFE");
  let privateKey;
  try {
    privateKey = createPrivateKey(readFileSync(canonical));
  } catch {
    throw new Error("RELEASE_SIGNING_PRIVATE_KEY_INVALID");
  }
  if (privateKey.asymmetricKeyType !== "ed25519") throw new Error("RELEASE_SIGNING_KEY_TYPE_INVALID");
  const publicDer = createPublicKey(privateKey).export({ type: "spki", format: "der" });
  const matching = runtimeTrust.release_trust.verifiers?.filter((entry) => {
    try {
      return entry.revocation_state === "active"
        && (entry.allowed_kinds?.includes("*") || RELEASE_PROOF_KINDS.some((kind) => entry.allowed_kinds?.includes(kind)))
        && createPublicKey(entry.public_key_pem).export({ type: "spki", format: "der" }).equals(publicDer);
    } catch {
      return false;
    }
  }) ?? [];
  if (matching.length !== 1) throw new Error("RELEASE_SIGNING_TRUST_BINDING_INVALID");
  return { privateKey, verifier: matching[0] };
}

function validateFreshUntil(freshUntil, now, verifier) {
  const nowTimestamp = Date.parse(now);
  const freshTimestamp = Date.parse(freshUntil);
  if (!Number.isFinite(nowTimestamp) || !Number.isFinite(freshTimestamp) || freshTimestamp <= nowTimestamp || freshTimestamp > Date.parse(verifier.expires_at)) throw new Error("RELEASE_SIGNING_EXPIRY_INVALID");
  return new Date(freshTimestamp).toISOString();
}

function signedProof({ purpose, kind, candidateFingerprint, body, freshUntil, identity }) {
  const fingerprint = digest(body);
  const signature = sign(null, releaseSignaturePayload({
    purpose,
    kind,
    candidateFingerprint,
    proofFingerprint: fingerprint,
    freshUntil,
  }), identity.privateKey).toString("base64url");
  return {
    ...body,
    fingerprint,
    verifier_key_id: identity.verifier.key_id,
    signature,
  };
}

export function createSignedReleaseBundle({
  repositoryRoot,
  runtimeTrust,
  privateKeyPath,
  candidateDefinition,
  sourceReceipts,
  now = new Date().toISOString(),
  freshUntil = new Date(Date.parse(now) + 24 * 60 * 60 * 1000).toISOString(),
} = {}) {
  if (!candidateDefinition || !/^[a-f0-9]{64}$/.test(candidateDefinition.candidate_fingerprint ?? "") || !sourceReceipts || typeof sourceReceipts !== "object" || Array.isArray(sourceReceipts)) throw new Error("RELEASE_SIGNING_INPUT_INVALID");
  if (Object.keys(sourceReceipts).sort().join("\0") !== [...RELEASE_PROOF_KINDS].sort().join("\0")) throw new Error("RELEASE_SIGNING_SOURCE_RECEIPT_SET_INVALID");
  const identity = loadSigningIdentity({ repositoryRoot, runtimeTrust, privateKeyPath });
  const normalizedFreshUntil = validateFreshUntil(freshUntil, now, identity.verifier);
  const proofs = Object.fromEntries(RELEASE_PROOF_KINDS.map((kind) => {
    const source = verifySignedSourceReceipt({ trustDocument: runtimeTrust.release_trust, receipt: sourceReceipts[kind], purpose: "next-workflow-release-source", kind, candidateFingerprint: candidateDefinition.candidate_fingerprint, now });
    if (Date.parse(source.fresh_until) < Date.parse(normalizedFreshUntil)) throw new Error("RELEASE_SIGNING_SOURCE_RECEIPT_STALE");
    const proofEvidence = validateReleaseProofEvidence({ kind, evidence: source.evidence, candidateFingerprint: candidateDefinition.candidate_fingerprint });
    const correctness = {
      status: "passed",
      fingerprint: digest({
        kind,
        candidate_fingerprint: candidateDefinition.candidate_fingerprint,
        evidence: proofEvidence,
        source_receipt_fingerprint: source.receipt_fingerprint,
      }),
    };
    const body = {
      kind,
      owner: "headless-release-evidence-owner",
      verifier: identity.verifier.verifier,
      candidate_fingerprint: candidateDefinition.candidate_fingerprint,
      fresh_until: normalizedFreshUntil,
      correctness,
      evidence: proofEvidence,
      source_receipt: structuredClone(sourceReceipts[kind]),
    };
    return [kind, signedProof({
      purpose: "next-workflow-release-proof",
      kind,
      candidateFingerprint: candidateDefinition.candidate_fingerprint,
      body,
      freshUntil: normalizedFreshUntil,
      identity,
    })];
  }));
  const core = {
    schema_version: "1.0.0",
    candidate_definition: structuredClone(candidateDefinition),
    proofs,
  };
  return { ...core, bundle_fingerprint: digest(core) };
}

export function createSignedTransitionEvidence({
  repositoryRoot,
  runtimeTrust,
  privateKeyPath,
  candidateDefinition,
  nextMode,
  stageReceipt,
  now = new Date().toISOString(),
  freshUntil = new Date(Date.parse(now) + 24 * 60 * 60 * 1000).toISOString(),
} = {}) {
  if (!candidateDefinition || !/^[a-f0-9]{64}$/.test(candidateDefinition.candidate_fingerprint ?? "") || !/^[a-f0-9]{40,64}$/.test(candidateDefinition.repository_head ?? "") || !/^[a-f0-9]{64}$/.test(candidateDefinition.release_prerequisite_fingerprint ?? "") || !TRANSITION_MODES.has(nextMode) || !stageReceipt) throw new Error("TRANSITION_SIGNING_INPUT_INVALID");
  const identity = loadSigningIdentity({ repositoryRoot, runtimeTrust, privateKeyPath });
  const normalizedFreshUntil = validateFreshUntil(freshUntil, now, identity.verifier);
  const source = verifySignedSourceReceipt({ trustDocument: runtimeTrust.release_trust, receipt: stageReceipt, purpose: "next-workflow-transition-source", kind: `transition:${nextMode}`, candidateFingerprint: candidateDefinition.candidate_fingerprint, now });
  if (Date.parse(source.fresh_until) < Date.parse(normalizedFreshUntil)) throw new Error("TRANSITION_SIGNING_SOURCE_RECEIPT_STALE");
  const transitionEvidence = structuredClone(source.evidence);
  if (Object.keys(transitionEvidence).sort().join("\0") !== ["acceptance_prerequisite_fingerprint", "repository_head", "stage_evidence_fingerprint"].sort().join("\0")
    || transitionEvidence.acceptance_prerequisite_fingerprint !== candidateDefinition.release_prerequisite_fingerprint
    || transitionEvidence.repository_head !== candidateDefinition.repository_head
    || !/^[a-f0-9]{64}$/.test(transitionEvidence.stage_evidence_fingerprint ?? "")) throw new Error("TRANSITION_SIGNING_SOURCE_RECEIPT_BINDING_INVALID");
  const correctness = {
    status: "passed",
    fingerprint: digest({
      kind: nextMode,
      candidate_fingerprint: candidateDefinition.candidate_fingerprint,
      evidence: transitionEvidence,
      source_receipt_fingerprint: source.receipt_fingerprint,
    }),
  };
  const body = {
    kind: nextMode,
    owner: "headless-activation-evidence-owner",
    verifier: identity.verifier.verifier,
    candidate_fingerprint: candidateDefinition.candidate_fingerprint,
    fresh_until: normalizedFreshUntil,
    correctness,
    evidence: transitionEvidence,
    source_receipt: structuredClone(stageReceipt),
  };
  return signedProof({
    purpose: "next-workflow-activation-transition",
    kind: nextMode,
    candidateFingerprint: candidateDefinition.candidate_fingerprint,
    body,
    freshUntil: normalizedFreshUntil,
    identity,
  });
}

export function releaseSigningDigest(value) {
  return digest(value);
}
