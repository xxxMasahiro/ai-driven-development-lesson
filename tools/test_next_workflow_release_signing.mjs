#!/usr/bin/env node
import assert from "node:assert/strict";
import { generateKeyPairSync } from "node:crypto";
import { chmodSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { freezeReleaseCandidate, verifyReleaseProofs } from "./lib/next_workflow/release.mjs";
import { createSignedReleaseBundle, createSignedTransitionEvidence, releaseSigningDigest } from "./lib/next_workflow/release_signing.mjs";
import { createSignedReleaseSourceReceipt, createSignedTransitionSourceReceipt } from "./lib/next_workflow/release_source_receipts.mjs";
import { createSignedReleaseProofVerifier, createSignedTransitionVerifier } from "./lib/next_workflow/release_trust.mjs";

const roots = [];
test.after(() => roots.forEach((root) => rmSync(root, { recursive: true, force: true })));

function fixture() {
  const repositoryRoot = realpathSync(path.resolve(path.dirname(new URL(import.meta.url).pathname), ".."));
  const root = mkdtempSync(path.join(tmpdir(), "next-workflow-release-signing-"));
  roots.push(root);
  chmodSync(root, 0o700);
  const { publicKey, privateKey } = generateKeyPairSync("ed25519");
  const privateKeyPath = path.join(root, "release-key.pem");
  writeFileSync(privateKeyPath, privateKey.export({ type: "pkcs8", format: "pem" }), { mode: 0o600 });
  const verifier = {
    verifier: "fixture-release-verifier",
    key_id: "fixture-release-key",
    public_key_pem: publicKey.export({ type: "spki", format: "pem" }),
    allowed_kinds: ["*"],
    revocation_state: "active",
    expires_at: "2030-01-01T00:00:00.000Z",
  };
  const { publicKey: sourcePublicKey, privateKey: sourcePrivateKey } = generateKeyPairSync("ed25519");
  const sourcePrivateKeyPath = path.join(root, "release-source-key.pem");
  writeFileSync(sourcePrivateKeyPath, sourcePrivateKey.export({ type: "pkcs8", format: "pem" }), { mode: 0o600 });
  const sourceVerifier = {
    verifier: "fixture-release-source-verifier",
    key_id: "fixture-release-source-key",
    public_key_pem: sourcePublicKey.export({ type: "spki", format: "pem" }),
    allowed_kinds: ["*"],
    revocation_state: "active",
    expires_at: "2030-01-01T00:00:00.000Z",
  };
  const releasePrerequisites = {
    schema_version: "1.0.0",
    prerequisite_id: "next-development-workflow-release-prerequisites",
    revision: 1,
    headless_runtime: { state: "accepted", developer_accepted: true, evidence_fingerprint: "a".repeat(64), accepted_at: "2029-01-01T00:00:00.000Z" },
    control_center: { state: "paused", developer_accepted: false, evidence_fingerprint: null, accepted_at: null, resume_required: true, blocks_headless_activation: false },
  };
  const candidateDefinition = freezeReleaseCandidate({
    repositoryHead: "1".repeat(40),
    repositoryTree: "0".repeat(40),
    artifactFingerprints: ["2".repeat(64)],
    artifactPaths: ["tools/next-workflow.mjs"],
    nodeVersion: process.versions.node,
    contractFingerprint: "3".repeat(64),
    releasePrerequisites,
  });
  const candidate = candidateDefinition.candidate_fingerprint;
  const evidence = {
    local_release: { repository_head: candidateDefinition.repository_head, checkout_instance_id: "fixture-checkout", command_manifest_fingerprint: "4".repeat(64), input_manifest_fingerprint: "5".repeat(64), artifact_manifest_fingerprint: "6".repeat(64) },
    pr_ci: { repository: "owner/repository", pr_number: 10, head_sha: candidateDefinition.repository_head, run_id: 11, check_names: ["ci"], artifact_digest: "7".repeat(64) },
    main_ci: { repository: "owner/repository", branch: "main", pr_number: 10, candidate_head_sha: candidateDefinition.repository_head, merge_sha: "8".repeat(40), run_id: 12, check_names: ["ci"], artifact_digest: "9".repeat(64) },
    local_remote_sync: { repository_logical_id: "fixture-repository", local_head: "8".repeat(40), remote_head: "8".repeat(40), remote_ref: "refs/remotes/origin/main" },
    recovery: { database_identity_fingerprint: "a".repeat(64), candidate_fingerprint: candidate, backup_manifest_fingerprint: "b".repeat(64), restore_proof_fingerprint: "c".repeat(64) },
    fenced_rollback: { candidate_fingerprint: candidate, authority_epoch: 0, checkpoint_ids: ["fixture-checkpoint"], state_proof_fingerprint: "d".repeat(64) },
    archive_decommission: { relationship_id: "fixture-relationship", from_state: "DRAINING", to_state: "ARCHIVED", transition_proof_fingerprint: "e".repeat(64) },
    outbox_disposition: { relationship_id: "fixture-relationship", effect_ids: ["fixture-effect"], outbox_ids: ["fixture-outbox"], disposition: "reconciled", receipt_manifest_fingerprint: "f".repeat(64) },
  };
  const runtimeTrust = { release_trust: { schema_version: "1.0.0", verifiers: [verifier], source_verifiers: [sourceVerifier] } };
  const sourceReceipts = Object.fromEntries(Object.entries(evidence).map(([kind, proofEvidence]) => [kind, createSignedReleaseSourceReceipt({
    repositoryRoot,
    runtimeTrust,
    privateKeyPath: sourcePrivateKeyPath,
    kind,
    candidateFingerprint: candidate,
    evidence: proofEvidence,
    now: "2029-01-01T00:00:00.000Z",
    freshUntil: "2029-01-02T00:00:00.000Z",
  })]));
  return { root, privateKeyPath, sourcePrivateKeyPath, runtimeTrust, candidateDefinition, sourceReceipts };
}

test("external owner key signs a complete candidate-bound release bundle and transition", () => {
  const repositoryRoot = realpathSync(path.resolve(path.dirname(new URL(import.meta.url).pathname), ".."));
  const values = fixture();
  const now = "2029-01-01T00:00:00.000Z";
  const freshUntil = "2029-01-02T00:00:00.000Z";
  const bundle = createSignedReleaseBundle({ repositoryRoot, ...values, now, freshUntil });
  const verified = verifyReleaseProofs({
    candidateFingerprint: values.candidateDefinition.candidate_fingerprint,
    candidateDefinition: values.candidateDefinition,
    proofs: bundle.proofs,
    proofVerifier: createSignedReleaseProofVerifier({ trustDocument: values.runtimeTrust.release_trust, now: () => now }),
    now,
  });
  assert.equal(verified.status, "passed");
  const transition = createSignedTransitionEvidence({
    repositoryRoot,
    runtimeTrust: values.runtimeTrust,
    privateKeyPath: values.privateKeyPath,
    candidateDefinition: values.candidateDefinition,
    nextMode: "shadow",
    stageReceipt: createSignedTransitionSourceReceipt({
      repositoryRoot,
      runtimeTrust: values.runtimeTrust,
      privateKeyPath: values.sourcePrivateKeyPath,
      nextMode: "shadow",
      candidateFingerprint: values.candidateDefinition.candidate_fingerprint,
      evidence: {
        acceptance_prerequisite_fingerprint: values.candidateDefinition.release_prerequisite_fingerprint,
        repository_head: values.candidateDefinition.repository_head,
        stage_evidence_fingerprint: releaseSigningDigest(verified),
      },
      now,
      freshUntil,
    }),
    now,
    freshUntil,
  });
  const transitionVerdict = createSignedTransitionVerifier({ trustDocument: values.runtimeTrust.release_trust, now: () => now })({
    nextMode: "shadow",
    candidateFingerprint: values.candidateDefinition.candidate_fingerprint,
    evidence: transition,
  });
  assert.equal(transitionVerdict.verified, true);
  assert.equal(transitionVerdict.proof_fingerprint, transition.fingerprint);
});

test("a private key that is not bound to protected owner trust is rejected", () => {
  const repositoryRoot = realpathSync(path.resolve(path.dirname(new URL(import.meta.url).pathname), ".."));
  const values = fixture();
  const other = generateKeyPairSync("ed25519").privateKey.export({ type: "pkcs8", format: "pem" });
  writeFileSync(values.privateKeyPath, other, { mode: 0o600 });
  assert.throws(() => createSignedReleaseBundle({
    repositoryRoot,
    ...values,
    now: "2029-01-01T00:00:00.000Z",
    freshUntil: "2029-01-02T00:00:00.000Z",
  }), /RELEASE_SIGNING_TRUST_BINDING_INVALID/);
});

test("shape-correct raw evidence and tampered source receipts cannot be self-certified", () => {
  const repositoryRoot = realpathSync(path.resolve(path.dirname(new URL(import.meta.url).pathname), ".."));
  const values = fixture();
  assert.throws(() => createSignedReleaseBundle({
    repositoryRoot,
    runtimeTrust: values.runtimeTrust,
    privateKeyPath: values.privateKeyPath,
    candidateDefinition: values.candidateDefinition,
    evidence: Object.fromEntries(Object.keys(values.sourceReceipts).map((kind) => [kind, values.sourceReceipts[kind].evidence])),
    now: "2029-01-01T00:00:00.000Z",
    freshUntil: "2029-01-02T00:00:00.000Z",
  }), /RELEASE_SIGNING_INPUT_INVALID/);
  const tampered = structuredClone(values.sourceReceipts);
  tampered.main_ci.evidence.run_id += 1;
  assert.throws(() => createSignedReleaseBundle({
    repositoryRoot,
    runtimeTrust: values.runtimeTrust,
    privateKeyPath: values.privateKeyPath,
    candidateDefinition: values.candidateDefinition,
    sourceReceipts: tampered,
    now: "2029-01-01T00:00:00.000Z",
    freshUntil: "2029-01-02T00:00:00.000Z",
  }), /RELEASE_SOURCE_RECEIPT_INVALID/);
});
