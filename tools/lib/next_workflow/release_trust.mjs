import { createHash, createPublicKey, verify as verifySignature } from "node:crypto";
import { assertNoSecretMaterial } from "./secret_policy.mjs";
import { verifySignedSourceReceipt } from "./release_source_receipts.mjs";

function canonicalJson(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(",")}}`;
  return JSON.stringify(value);
}

function digest(value) {
  return createHash("sha256").update(canonicalJson(value)).digest("hex");
}

function validateTrustDocument(document, now) {
  assertNoSecretMaterial(document, "RELEASE_TRUST_PRIVATE_MATERIAL_FORBIDDEN");
  if (!document || document.schema_version !== "1.0.0" || !Array.isArray(document.verifiers)) throw new Error("RELEASE_TRUST_DOCUMENT_INVALID");
  const current = Date.parse(now);
  if (!Number.isFinite(current)) throw new Error("RELEASE_TRUST_TIME_INVALID");
  const keys = new Set();
  const keyMaterial = new Set();
  const verifiers = new Map();
  for (const entry of document.verifiers) {
    if (!entry || typeof entry.verifier !== "string" || typeof entry.key_id !== "string" || typeof entry.public_key_pem !== "string" || !Array.isArray(entry.allowed_kinds) || entry.revocation_state !== "active" || !Number.isFinite(Date.parse(entry.expires_at)) || Date.parse(entry.expires_at) < current) throw new Error("RELEASE_TRUST_ENTRY_INVALID");
    const key = `${entry.verifier}:${entry.key_id}`;
    if (keys.has(key)) throw new Error("RELEASE_TRUST_ENTRY_DUPLICATE");
    keys.add(key);
    let publicKey;
    try { publicKey = createPublicKey(entry.public_key_pem); } catch { throw new Error("RELEASE_TRUST_PUBLIC_KEY_INVALID"); }
    if (publicKey.type !== "public" || publicKey.asymmetricKeyType !== "ed25519") throw new Error("RELEASE_TRUST_KEY_TYPE_INVALID");
    const material = digest(publicKey.export({ type: "spki", format: "der" }));
    if (keyMaterial.has(material)) throw new Error("RELEASE_TRUST_KEY_MATERIAL_DUPLICATE");
    keyMaterial.add(material);
    verifiers.set(key, { ...entry, publicKey });
  }
  if (Array.isArray(document.source_verifiers)) {
    const sourceKeys = new Set();
    for (const entry of document.source_verifiers) {
      let publicKey;
      try { publicKey = createPublicKey(entry?.public_key_pem); } catch { throw new Error("RELEASE_SOURCE_PUBLIC_KEY_INVALID"); }
      const material = digest(publicKey.export({ type: "spki", format: "der" }));
      if (keyMaterial.has(material) || sourceKeys.has(material)) throw new Error("RELEASE_TRUST_AUTHORITY_MATERIAL_SEPARATION_REQUIRED");
      sourceKeys.add(material);
    }
  }
  return verifiers;
}

export function releaseSignaturePayload({ purpose, kind, candidateFingerprint, proofFingerprint, freshUntil }) {
  const payload = { schema_version: "1.0.0", purpose, kind, candidate_fingerprint: candidateFingerprint, proof_fingerprint: proofFingerprint, fresh_until: freshUntil };
  return Buffer.from(canonicalJson(payload));
}

function signedVerification({ trustDocument, purpose, kind, proof, candidateFingerprint, now }) {
  const verifiers = validateTrustDocument(trustDocument, now);
  if (!proof || proof.candidate_fingerprint !== candidateFingerprint || typeof proof.verifier !== "string" || typeof proof.verifier_key_id !== "string" || typeof proof.signature !== "string" || typeof proof.fingerprint !== "string") throw new Error("RELEASE_SIGNED_PROOF_INVALID");
  const trusted = verifiers.get(`${proof.verifier}:${proof.verifier_key_id}`);
  if (!trusted || (!trusted.allowed_kinds.includes(kind) && !trusted.allowed_kinds.includes("*"))) throw new Error("RELEASE_SIGNED_VERIFIER_NOT_TRUSTED");
  let signature;
  try { signature = Buffer.from(proof.signature, "base64url"); } catch { throw new Error("RELEASE_SIGNED_PROOF_ENCODING_INVALID"); }
  if (signature.length !== 64 || verifySignature(null, releaseSignaturePayload({ purpose, kind, candidateFingerprint, proofFingerprint: proof.fingerprint, freshUntil: proof.fresh_until }), trusted.publicKey, signature) !== true) throw new Error("RELEASE_SIGNED_PROOF_VERIFICATION_FAILED");
  return {
    owner: proof.owner,
    verifier: proof.verifier,
    candidate_fingerprint: candidateFingerprint,
    proof_fingerprint: proof.fingerprint,
    fresh_until: proof.fresh_until,
    verification_fingerprint: digest({ purpose, kind, verifier: proof.verifier, verifier_key_id: proof.verifier_key_id, candidate_fingerprint: candidateFingerprint, proof_fingerprint: proof.fingerprint, signature: proof.signature }),
  };
}

export function createSignedReleaseProofVerifier({ trustDocument, now = () => new Date().toISOString() } = {}) {
  return ({ kind, proof, candidateFingerprint }) => {
    const current = now();
    const signed = signedVerification({ trustDocument, purpose: "next-workflow-release-proof", kind, proof, candidateFingerprint, now: current });
    if (Array.isArray(trustDocument?.source_verifiers) && trustDocument.source_verifiers.length > 0) {
      const source = verifySignedSourceReceipt({ trustDocument, receipt: proof.source_receipt, purpose: "next-workflow-release-source", kind, candidateFingerprint, now: current });
      if (canonicalJson(source.evidence) !== canonicalJson(proof.evidence) || Date.parse(source.fresh_until) < Date.parse(proof.fresh_until) || proof.correctness?.fingerprint !== digest({ kind, candidate_fingerprint: candidateFingerprint, evidence: proof.evidence, source_receipt_fingerprint: source.receipt_fingerprint })) throw new Error("RELEASE_SOURCE_RECEIPT_BINDING_INVALID");
      return { ...signed, verified: true, correctness: true, source_verification_fingerprint: source.verification_fingerprint };
    }
    return { ...signed, verified: true, correctness: true };
  };
}

export function createSignedTransitionVerifier({ trustDocument, now = () => new Date().toISOString() } = {}) {
  return ({ nextMode, candidateFingerprint, evidence }) => {
    const current = now();
    const signed = signedVerification({ trustDocument, purpose: "next-workflow-activation-transition", kind: nextMode, proof: evidence, candidateFingerprint, now: current });
    if (Array.isArray(trustDocument?.source_verifiers) && trustDocument.source_verifiers.length > 0) {
      const source = verifySignedSourceReceipt({ trustDocument, receipt: evidence.source_receipt, purpose: "next-workflow-transition-source", kind: `transition:${nextMode}`, candidateFingerprint, now: current });
      if (canonicalJson(source.evidence) !== canonicalJson(evidence.evidence) || Date.parse(source.fresh_until) < Date.parse(evidence.fresh_until) || evidence.correctness?.fingerprint !== digest({ kind: nextMode, candidate_fingerprint: candidateFingerprint, evidence: evidence.evidence, source_receipt_fingerprint: source.receipt_fingerprint })) throw new Error("TRANSITION_SOURCE_RECEIPT_BINDING_INVALID");
      return { ...signed, verified: true, correctness: true, source_verification_fingerprint: source.verification_fingerprint };
    }
    return { ...signed, verified: true, correctness: true };
  };
}

export function releaseTrustDigest(value) {
  return digest(value);
}
