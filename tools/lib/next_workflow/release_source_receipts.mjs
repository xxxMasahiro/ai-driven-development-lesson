import { createHash, createPrivateKey, createPublicKey, sign, verify } from "node:crypto";
import { lstatSync, readFileSync, realpathSync } from "node:fs";
import path from "node:path";
import { validateReleaseProofEvidence } from "./release.mjs";

const RELEASE_KINDS = new Set(["local_release", "pr_ci", "main_ci", "local_remote_sync", "recovery", "fenced_rollback", "archive_decommission", "outbox_disposition"]);
const TRANSITION_MODES = new Set(["shadow", "release_verified", "recovery_verified", "rollback_verified", "archive_decommission_verified", "ready"]);

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

function sourceVerifiers(trustDocument, now) {
  if (!trustDocument || !Array.isArray(trustDocument.source_verifiers) || trustDocument.source_verifiers.length === 0) throw new Error("RELEASE_SOURCE_TRUST_REQUIRED");
  const result = new Map();
  const keyMaterial = new Set();
  for (const entry of trustDocument.source_verifiers) {
    if (!entry || typeof entry.verifier !== "string" || typeof entry.key_id !== "string" || typeof entry.public_key_pem !== "string" || !Array.isArray(entry.allowed_kinds) || entry.revocation_state !== "active" || !Number.isFinite(Date.parse(entry.expires_at)) || Date.parse(entry.expires_at) <= Date.parse(now)) throw new Error("RELEASE_SOURCE_TRUST_INVALID");
    let publicKey;
    try { publicKey = createPublicKey(entry.public_key_pem); } catch { throw new Error("RELEASE_SOURCE_PUBLIC_KEY_INVALID"); }
    if (publicKey.asymmetricKeyType !== "ed25519") throw new Error("RELEASE_SOURCE_KEY_TYPE_INVALID");
    const key = `${entry.verifier}:${entry.key_id}`;
    const material = digest(publicKey.export({ type: "spki", format: "der" }));
    if (result.has(key) || keyMaterial.has(material)) throw new Error("RELEASE_SOURCE_TRUST_DUPLICATE");
    keyMaterial.add(material);
    result.set(key, { ...entry, publicKey });
  }
  return result;
}

function loadSourceIdentity({ repositoryRoot, runtimeTrust, privateKeyPath, kind, now }) {
  if (!runtimeTrust?.release_trust || typeof privateKeyPath !== "string" || !path.isAbsolute(privateKeyPath)) throw new Error("RELEASE_SOURCE_SIGNING_CONFIGURATION_INVALID");
  if (lstatSync(privateKeyPath).isSymbolicLink()) throw new Error("RELEASE_SOURCE_PRIVATE_KEY_UNSAFE");
  const canonical = realpathSync(privateKeyPath);
  const info = lstatSync(canonical);
  if (!outsideRepository(repositoryRoot, canonical) || !info.isFile() || (info.mode & 0o077) !== 0 || (typeof process.getuid === "function" && info.uid !== process.getuid())) throw new Error("RELEASE_SOURCE_PRIVATE_KEY_UNSAFE");
  let privateKey;
  try { privateKey = createPrivateKey(readFileSync(canonical)); } catch { throw new Error("RELEASE_SOURCE_PRIVATE_KEY_INVALID"); }
  if (privateKey.asymmetricKeyType !== "ed25519") throw new Error("RELEASE_SOURCE_KEY_TYPE_INVALID");
  const publicDer = createPublicKey(privateKey).export({ type: "spki", format: "der" });
  const matching = [...sourceVerifiers(runtimeTrust.release_trust, now).values()].filter((entry) => (entry.allowed_kinds.includes(kind) || entry.allowed_kinds.includes("*")) && entry.publicKey.export({ type: "spki", format: "der" }).equals(publicDer));
  if (matching.length !== 1) throw new Error("RELEASE_SOURCE_SIGNING_TRUST_BINDING_INVALID");
  return { privateKey, verifier: matching[0] };
}

function signedSourceReceipt({ repositoryRoot, runtimeTrust, privateKeyPath, purpose, kind, candidateFingerprint, evidence, now, freshUntil }) {
  if (!/^[a-f0-9]{64}$/.test(candidateFingerprint ?? "") || !evidence || typeof evidence !== "object" || Array.isArray(evidence) || !Number.isFinite(Date.parse(now)) || !Number.isFinite(Date.parse(freshUntil)) || Date.parse(freshUntil) <= Date.parse(now)) throw new Error("RELEASE_SOURCE_RECEIPT_INPUT_INVALID");
  const identity = loadSourceIdentity({ repositoryRoot, runtimeTrust, privateKeyPath, kind, now });
  if (Date.parse(freshUntil) > Date.parse(identity.verifier.expires_at)) throw new Error("RELEASE_SOURCE_RECEIPT_EXPIRY_INVALID");
  const body = {
    schema_version: "1.0.0",
    purpose,
    kind,
    candidate_fingerprint: candidateFingerprint,
    verifier: identity.verifier.verifier,
    verifier_key_id: identity.verifier.key_id,
    observed_at: new Date(Date.parse(now)).toISOString(),
    fresh_until: new Date(Date.parse(freshUntil)).toISOString(),
    evidence: structuredClone(evidence),
  };
  const fingerprint = digest(body);
  const signature = sign(null, sourcePayload({ purpose, kind, candidateFingerprint, receiptFingerprint: fingerprint, freshUntil: body.fresh_until }), identity.privateKey).toString("base64url");
  return { ...body, fingerprint, signature };
}

export function createSignedReleaseSourceReceipt(input = {}) {
  if (!RELEASE_KINDS.has(input.kind)) throw new Error("RELEASE_SOURCE_KIND_INVALID");
  return signedSourceReceipt({ ...input, evidence: validateReleaseProofEvidence({ kind: input.kind, evidence: input.evidence, candidateFingerprint: input.candidateFingerprint }), purpose: "next-workflow-release-source" });
}

export function createSignedTransitionSourceReceipt(input = {}) {
  if (!TRANSITION_MODES.has(input.nextMode)) throw new Error("TRANSITION_SOURCE_MODE_INVALID");
  const evidence = input.evidence;
  if (!evidence || typeof evidence !== "object" || Array.isArray(evidence)
    || Object.keys(evidence).sort().join("\0") !== ["acceptance_prerequisite_fingerprint", "repository_head", "stage_evidence_fingerprint"].sort().join("\0")
    || !/^[a-f0-9]{64}$/.test(evidence.acceptance_prerequisite_fingerprint ?? "")
    || !/^[a-f0-9]{40,64}$/.test(evidence.repository_head ?? "")
    || !/^[a-f0-9]{64}$/.test(evidence.stage_evidence_fingerprint ?? "")) throw new Error("TRANSITION_SOURCE_EVIDENCE_INVALID");
  return signedSourceReceipt({ ...input, purpose: "next-workflow-transition-source", kind: `transition:${input.nextMode}` });
}

export function verifySignedSourceReceipt({ trustDocument, receipt, purpose, kind, candidateFingerprint, now = new Date().toISOString() } = {}) {
  const verifiers = sourceVerifiers(trustDocument, now);
  const { fingerprint, signature, ...body } = receipt ?? {};
  if (body.schema_version !== "1.0.0" || body.purpose !== purpose || body.kind !== kind || body.candidate_fingerprint !== candidateFingerprint || typeof body.verifier !== "string" || typeof body.verifier_key_id !== "string" || !body.evidence || typeof body.evidence !== "object" || Array.isArray(body.evidence) || !Number.isFinite(Date.parse(body.observed_at)) || !Number.isFinite(Date.parse(body.fresh_until)) || Date.parse(body.observed_at) > Date.parse(now) || Date.parse(body.fresh_until) <= Date.parse(now) || fingerprint !== digest(body) || typeof signature !== "string") throw new Error("RELEASE_SOURCE_RECEIPT_INVALID");
  const trusted = verifiers.get(`${body.verifier}:${body.verifier_key_id}`);
  if (!trusted || (!trusted.allowed_kinds.includes(kind) && !trusted.allowed_kinds.includes("*"))) throw new Error("RELEASE_SOURCE_VERIFIER_NOT_TRUSTED");
  if (verify(null, sourcePayload({ purpose, kind, candidateFingerprint, receiptFingerprint: fingerprint, freshUntil: body.fresh_until }), trusted.publicKey, Buffer.from(signature, "base64url")) !== true) throw new Error("RELEASE_SOURCE_RECEIPT_SIGNATURE_INVALID");
  return { verified: true, evidence: structuredClone(body.evidence), receipt_fingerprint: fingerprint, verifier: body.verifier, fresh_until: body.fresh_until, verification_fingerprint: digest({ fingerprint, signature }) };
}

export function releaseSourceReceiptDigest(value) {
  return digest(value);
}
