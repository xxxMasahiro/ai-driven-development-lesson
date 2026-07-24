#!/usr/bin/env node
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { generateKeyPairSync, sign } from "node:crypto";
import { chmodSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { completeActivation, evaluateCorrectness, evaluatePerformance, freezeReleaseCandidate, freezeRepositoryReleaseCandidate, persistActivationTransition, releaseDigest, rollbackActivation, verifyEnforcedActivationRecord, verifyReleaseProofs, verifyRepositoryReleaseDeployment } from "./lib/next_workflow/release.mjs";
import { createSignedReleaseProofVerifier, createSignedTransitionVerifier, releaseSignaturePayload } from "./lib/next_workflow/release_trust.mjs";
import { loadProtectedRuntimeTrust } from "./lib/next_workflow/runtime_trust.mjs";
import { validateActivationRecord } from "./lib/next_workflow/projection.mjs";
import { openWorkflowStateStore } from "./lib/next_workflow/store.mjs";

const PROOF_KINDS = ["local_release", "pr_ci", "main_ci", "local_remote_sync", "recovery", "fenced_rollback", "archive_decommission", "outbox_disposition"];
const NOW = "2029-01-01T00:00:00.000Z";
const CANDIDATE_TREE = "e".repeat(40);
const ACCEPTED_PREREQUISITES = { schema_version: "1.0.0", prerequisite_id: "next-development-workflow-release-prerequisites", revision: 2, headless_runtime: { state: "accepted", developer_accepted: true, evidence_fingerprint: "c".repeat(64), accepted_at: "2028-12-31T00:00:00.000Z" }, control_center: { state: "paused", developer_accepted: false, evidence_fingerprint: null, accepted_at: null, resume_required: true, blocks_headless_activation: false } };
const PAUSED_PREREQUISITES = { schema_version: "1.0.0", prerequisite_id: "next-development-workflow-release-prerequisites", revision: 1, headless_runtime: { state: "pending", developer_accepted: false, evidence_fingerprint: null, accepted_at: null }, control_center: { state: "paused", developer_accepted: false, evidence_fingerprint: null, accepted_at: null, resume_required: true, blocks_headless_activation: false } };
const candidate = freezeReleaseCandidate({ repositoryHead: "a".repeat(40), repositoryTree: CANDIDATE_TREE, artifactFingerprints: ["artifact-b", "artifact-a"], nodeVersion: "24.14.1", contractFingerprint: "contracts", releasePrerequisites: ACCEPTED_PREREQUISITES });
const roots = [];
test.after(() => roots.forEach((root) => rmSync(root, { recursive: true, force: true })));

test("release proofs-verify CLI refuses missing protected identity or trust before signed verification", () => {
  const repositoryRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
  const { NODE_TEST_CONTEXT: ignoredNodeTestContext, ...childEnvironment } = process.env;
  const result = spawnSync(process.execPath, [path.join(repositoryRoot, "tools/next-workflow.mjs"), "release", "proofs-verify", "--candidate", "a".repeat(64), "--bundle", "learning/NEXT_WORKFLOW_RELEASE_PREREQUISITES.json"], { cwd: repositoryRoot, encoding: "utf8", env: childEnvironment });
  assert.notEqual(result.status, 0, result.stdout);
  assert.doesNotMatch(result.stderr, /ReferenceError|verifyReleaseProofs is not defined/);
  assert.match(result.stderr, /CHECKOUT_IDENTITY_MISSING|OWNER_TRUST/);
});

test("protected runtime trust is external, private, closed-schema, current, and repository-bound", () => {
  const repositoryRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
  const ownerRoot = mkdtempSync(path.join(tmpdir(), "next-workflow-owner-trust-"));
  roots.push(ownerRoot);
  const trustPath = path.join(ownerRoot, "owner-trust.json");
  const document = {
    schema_version: "1.0.0",
    trust_source_id: "owner-source",
    revision: 1,
    repository_logical_id: "repo",
    checkout_instance_id: "checkout",
    issued_at: "2028-12-31T00:00:00.000Z",
    expires_at: "2029-01-02T00:00:00.000Z",
    release_trust: { schema_version: "1.0.0", verifiers: [] },
    release_prerequisites: ACCEPTED_PREREQUISITES,
    runtime_authorities: { source_verifiers: [], receipt_verifiers: [], approval_verifiers: [] },
  };
  writeFileSync(trustPath, `${JSON.stringify(document)}\n`, { mode: 0o600 });
  chmodSync(trustPath, 0o600);
  const loaded = loadProtectedRuntimeTrust({ repositoryRoot, repositoryLogicalId: "repo", checkoutInstanceId: "checkout", trustPath, now: NOW });
  assert.equal(loaded.document.trust_source_id, "owner-source");
  assert.equal(loaded.release_prerequisites.headless_runtime.state, "accepted");
  assert.equal(loaded.release_prerequisites.control_center.blocks_headless_activation, false);
  assert.match(loaded.fingerprint, /^[a-f0-9]{64}$/);
  assert.throws(() => loadProtectedRuntimeTrust({ repositoryRoot, repositoryLogicalId: "other", checkoutInstanceId: "checkout", trustPath, now: NOW }), /OWNER_TRUST_REPOSITORY_BINDING_INVALID/);
  writeFileSync(trustPath, `${JSON.stringify({ ...document, unexpected: true })}\n`, { mode: 0o600 });
  assert.throws(() => loadProtectedRuntimeTrust({ repositoryRoot, repositoryLogicalId: "repo", checkoutInstanceId: "checkout", trustPath, now: NOW }), /OWNER_TRUST_SCHEMA_INVALID/);
});

function proofEvidence(kind, candidateDefinition = candidate) {
  const fingerprint = (label) => releaseDigest({ kind, label });
  const git = candidateDefinition.repository_head;
  const merge = "c".repeat(40);
  return {
    local_release: { repository_head: git, checkout_instance_id: "checkout", command_manifest_fingerprint: fingerprint("commands"), input_manifest_fingerprint: fingerprint("inputs"), artifact_manifest_fingerprint: fingerprint("artifacts") },
    pr_ci: { repository: "owner/repository", pr_number: 42, head_sha: git, run_id: 1001, check_names: ["required"], artifact_digest: fingerprint("pr-artifact") },
    main_ci: { repository: "owner/repository", branch: "main", pr_number: 42, candidate_head_sha: git, merge_sha: merge, run_id: 1002, check_names: ["required"], artifact_digest: fingerprint("main-artifact") },
    local_remote_sync: { repository_logical_id: "repository", local_head: merge, remote_head: merge, remote_ref: "refs/remotes/origin/main" },
    recovery: { database_identity_fingerprint: fingerprint("database"), candidate_fingerprint: candidateDefinition.candidate_fingerprint, backup_manifest_fingerprint: fingerprint("backup"), restore_proof_fingerprint: fingerprint("restore") },
    fenced_rollback: { candidate_fingerprint: candidateDefinition.candidate_fingerprint, authority_epoch: 7, checkpoint_ids: ["checkpoint-1"], state_proof_fingerprint: fingerprint("rollback-state") },
    archive_decommission: { relationship_id: "relationship-1", from_state: "DRAINING", to_state: "ARCHIVED", transition_proof_fingerprint: fingerprint("archive-transition") },
    outbox_disposition: { relationship_id: "relationship-1", effect_ids: ["effect-1"], outbox_ids: ["outbox-1"], disposition: "delivered", receipt_manifest_fingerprint: fingerprint("outbox-receipts") }
  }[kind];
}

function proofFor(kind, overrides = {}, candidateDefinition = candidate) {
  const proof = {
    owner: `owner-${kind}`,
    verifier: `verifier-${kind}`,
    candidate_fingerprint: candidateDefinition.candidate_fingerprint,
    fresh_until: "2029-01-02T00:00:00.000Z",
    correctness: { status: "passed", fingerprint: releaseDigest({ kind, correctness: true }) },
    evidence: proofEvidence(kind, candidateDefinition),
    ...overrides
  };
  return { ...proof, fingerprint: overrides.fingerprint ?? releaseDigest({ kind, owner: proof.owner, verifier: proof.verifier, candidate_fingerprint: proof.candidate_fingerprint, fresh_until: proof.fresh_until, correctness: proof.correctness, evidence: proof.evidence }) };
}

function proofs(candidateDefinition = candidate) {
  return Object.fromEntries(PROOF_KINDS.map((kind) => [kind, proofFor(kind, {}, candidateDefinition)]));
}

function independentVerifier({ proof }) {
  return {
    verified: true,
    owner: proof.owner,
    verifier: proof.verifier,
    candidate_fingerprint: proof.candidate_fingerprint,
    proof_fingerprint: proof.fingerprint,
    fresh_until: proof.fresh_until,
    correctness: true,
    verification_fingerprint: releaseDigest({ independently_verified: proof.fingerprint })
  };
}

function transitionEvidence(nextMode, candidateDefinition = candidate) {
  const value = { kind: nextMode, owner: `owner-${nextMode}`, verifier: `verifier-${nextMode}`, candidate_fingerprint: candidateDefinition.candidate_fingerprint, fresh_until: "2029-01-02T00:00:00.000Z", correctness: { status: "passed", fingerprint: releaseDigest({ nextMode, correctness: true }) }, evidence: { acceptance_prerequisite_fingerprint: releaseDigest(ACCEPTED_PREREQUISITES), repository_head: candidateDefinition.repository_head, stage_evidence_fingerprint: releaseDigest({ nextMode, stage: true }) } };
  return { ...value, fingerprint: releaseDigest(value) };
}

function transitionVerifier({ evidence }) {
  return { verified: true, owner: evidence.owner, verifier: evidence.verifier, candidate_fingerprint: evidence.candidate_fingerprint, proof_fingerprint: evidence.fingerprint, fresh_until: evidence.fresh_until, correctness: true, verification_fingerprint: releaseDigest({ transition_verified: evidence.fingerprint }) };
}

const rollbackVerifier = {
  independent: true,
  verifier_id: "independent-rollback-verifier",
  verify({ step, candidate_fingerprint, evidence }) {
    return { verified: true, verifier_id: "independent-rollback-verifier", step, candidate_fingerprint, proof_fingerprint: releaseDigest({ step, candidate_fingerprint, evidence }) };
  }
};

function fixtureStore() {
  const root = mkdtempSync(path.join(tmpdir(), "next-release-"));
  roots.push(root);
  mkdirSync(path.join(root, ".workflow-state"));
  return openWorkflowStateStore({ repositoryRoot: root, expectedIdentity: { repository_logical_id: "repo", checkout_instance_id: "checkout" }, clock: () => NOW });
}

async function prepareReady(store, candidateDefinition = candidate) {
  return prepareThrough(store, candidateDefinition, ["shadow", "release_verified", "recovery_verified", "rollback_verified", "archive_decommission_verified", "ready"]);
}

async function prepareThrough(store, candidateDefinition, modes) {
  let expectedRevision = store.revision;
  for (const nextMode of modes) {
    const transitioned = await persistActivationTransition({ store, expectedRevision, candidateFingerprint: candidateDefinition.candidate_fingerprint, candidateDefinition, nextMode, evidence: transitionEvidence(nextMode, candidateDefinition), transitionVerifier, releasePrerequisites: ACCEPTED_PREREQUISITES, now: NOW });
    expectedRevision = transitioned.store_revision;
  }
  return expectedRevision;
}

function cycleHistory(store, record, { payloadsOnly = false } = {}) {
  const rows = store.query({ kind: "NextWorkflowActivation", limit: 1000 }).records
    .filter((entry) => entry.record_revision >= record.cycle_start_revision && entry.record_revision <= record.revision)
    .sort((left, right) => left.record_revision - right.record_revision);
  return payloadsOnly ? rows.map((entry) => structuredClone(entry.payload)) : rows;
}

test("one deterministic candidate fingerprint binds ordered artifacts and repository head", () => {
  assert.match(candidate.candidate_fingerprint, /^[a-f0-9]{64}$/);
  assert.deepEqual(candidate.artifact_paths, []);
  const repeated = freezeReleaseCandidate({ repositoryHead: "a".repeat(40), repositoryTree: CANDIDATE_TREE, artifactFingerprints: ["artifact-a", "artifact-b"], nodeVersion: "24.14.1", contractFingerprint: "contracts", releasePrerequisites: ACCEPTED_PREREQUISITES });
  assert.equal(repeated.candidate_fingerprint, candidate.candidate_fingerprint);
});

test("paused prerequisites and candidate-definition drift block every release transition", async () => {
  assert.throws(() => freezeReleaseCandidate({ repositoryHead: "a".repeat(40), repositoryTree: CANDIDATE_TREE, artifactFingerprints: ["artifact"], nodeVersion: "24.14.1", contractFingerprint: "contracts", releasePrerequisites: PAUSED_PREREQUISITES }), /HEADLESS_RUNTIME_ACCEPTANCE_PREREQUISITE_UNMET/);
  const store = fixtureStore();
  await assert.rejects(() => persistActivationTransition({ store, expectedRevision: 0, candidateFingerprint: candidate.candidate_fingerprint, candidateDefinition: candidate, nextMode: "shadow", evidence: transitionEvidence("shadow"), transitionVerifier, releasePrerequisites: PAUSED_PREREQUISITES, now: NOW }), /HEADLESS_RUNTIME_ACCEPTANCE_PREREQUISITE_UNMET/);
  await assert.rejects(() => persistActivationTransition({ store, expectedRevision: 0, candidateFingerprint: candidate.candidate_fingerprint, candidateDefinition: { ...candidate, artifact_paths: ["changed"] }, nextMode: "shadow", evidence: transitionEvidence("shadow"), transitionVerifier, releasePrerequisites: ACCEPTED_PREREQUISITES, now: NOW }), /RELEASE_CANDIDATE_DEFINITION_INVALID/);
  const wrongHead = transitionEvidence("shadow");
  wrongHead.evidence.repository_head = "b".repeat(40);
  const { fingerprint: ignoredWrongHeadFingerprint, ...wrongHeadBody } = wrongHead;
  wrongHead.fingerprint = releaseDigest(wrongHeadBody);
  await assert.rejects(() => persistActivationTransition({ store, expectedRevision: 0, candidateFingerprint: candidate.candidate_fingerprint, candidateDefinition: candidate, nextMode: "shadow", evidence: wrongHead, transitionVerifier, releasePrerequisites: ACCEPTED_PREREQUISITES, now: NOW }), /ACTIVATION_TRANSITION_EVIDENCE_INVALID/);
  assert.equal(store.revision, 0);
  store.close();
});

test("repository candidate freeze refuses dirt and binds safe repository-relative artifacts", () => {
  const root = mkdtempSync(path.join(tmpdir(), "next-release-candidate-"));
  roots.push(root);
  writeFileSync(path.join(root, "artifact.txt"), "candidate\n");
  const cleanRunner = (_executable, arguments_) => {
    if (arguments_.includes("status")) return "";
    if (arguments_.includes("rev-parse")) return `${arguments_.at(-1).endsWith("^{tree}") ? CANDIDATE_TREE : "b".repeat(40)}\n`;
    if (arguments_.includes("ls-tree")) return "artifact.txt\n";
    if (arguments_.includes("show")) return "candidate\n";
    throw new Error(`unexpected git arguments:${arguments_.join(" ")}`);
  };
  const frozen = freezeRepositoryReleaseCandidate({ repositoryRoot: root, artifactPaths: ["artifact.txt"], contractFingerprint: "contracts", releasePrerequisites: ACCEPTED_PREREQUISITES, nodeVersion: "24.14.1", gitRunner: cleanRunner });
  assert.match(frozen.candidate_fingerprint, /^[a-f0-9]{64}$/);
  assert.throws(() => freezeRepositoryReleaseCandidate({ repositoryRoot: root, artifactPaths: ["artifact.txt"], contractFingerprint: "contracts", releasePrerequisites: ACCEPTED_PREREQUISITES, gitRunner: () => " M artifact.txt\n" }), /REQUIRES_CLEAN_WORKTREE/);
  assert.throws(() => freezeRepositoryReleaseCandidate({ repositoryRoot: root, artifactPaths: ["../outside"], contractFingerprint: "contracts", releasePrerequisites: ACCEPTED_PREREQUISITES, gitRunner: cleanRunner }), /RELEASE_ARTIFACT_PATH_INVALID/);
  let statusCalls = 0;
  const mutatingRunner = (_executable, arguments_) => {
    if (arguments_.includes("status")) return ++statusCalls === 1 ? "" : " M artifact.txt\n";
    return cleanRunner(_executable, arguments_);
  };
  assert.throws(() => freezeRepositoryReleaseCandidate({ repositoryRoot: root, artifactPaths: ["artifact.txt"], contractFingerprint: "contracts", releasePrerequisites: ACCEPTED_PREREQUISITES, gitRunner: mutatingRunner }), /RELEASE_CANDIDATE_CHANGED_DURING_FREEZE/);
  assert.throws(() => freezeRepositoryReleaseCandidate({ repositoryRoot: root, artifactPaths: ["artifact.txt"], contractFingerprint: "contracts", releasePrerequisites: PAUSED_PREREQUISITES, gitRunner: cleanRunner }), /HEADLESS_RUNTIME_ACCEPTANCE_PREREQUISITE_UNMET/);
});

test("deployed release preserves candidate content while binding the proven main merge", () => {
  const root = mkdtempSync(path.join(tmpdir(), "next-release-deployment-"));
  roots.push(root);
  writeFileSync(path.join(root, "artifact.txt"), "candidate\n");
  const candidateHead = "b".repeat(40);
  const mergeHead = "c".repeat(40);
  const gitRunnerFor = ({ head, tree = CANDIDATE_TREE, content = "candidate\n" }) => (_executable, arguments_) => {
    if (arguments_.includes("status")) return "";
    if (arguments_.includes("rev-parse")) return `${arguments_.at(-1).endsWith("^{tree}") ? tree : head}\n`;
    if (arguments_.includes("ls-tree")) return "artifact.txt\n";
    if (arguments_.includes("show")) return content;
    throw new Error(`unexpected git arguments:${arguments_.join(" ")}`);
  };
  const candidateDefinition = freezeRepositoryReleaseCandidate({
    repositoryRoot: root,
    artifactPaths: ["artifact.txt"],
    contractFingerprint: "contracts",
    releasePrerequisites: ACCEPTED_PREREQUISITES,
    nodeVersion: "24.14.1",
    gitRunner: gitRunnerFor({ head: candidateHead }),
  });
  const signedReleaseProofs = {
    main_ci: { fingerprint: releaseDigest("main-ci"), evidence: { merge_sha: mergeHead } },
    local_remote_sync: {
      fingerprint: releaseDigest("sync"),
      evidence: { local_head: mergeHead, remote_head: mergeHead, remote_ref: "refs/remotes/origin/main" },
    },
  };
  const deployed = verifyRepositoryReleaseDeployment({
    repositoryRoot: root,
    candidateDefinition,
    signedReleaseProofs,
    contractFingerprint: "contracts",
    releasePrerequisites: ACCEPTED_PREREQUISITES,
    nodeVersion: "24.14.1",
    gitRunner: gitRunnerFor({ head: mergeHead }),
  });
  assert.equal(deployed.candidate_fingerprint, candidateDefinition.candidate_fingerprint);
  assert.equal(deployed.repository_head, mergeHead);
  assert.match(deployed.deployment_fingerprint, /^[a-f0-9]{64}$/);
  assert.throws(() => verifyRepositoryReleaseDeployment({
    repositoryRoot: root,
    candidateDefinition,
    signedReleaseProofs,
    contractFingerprint: "contracts",
    releasePrerequisites: ACCEPTED_PREREQUISITES,
    nodeVersion: "24.14.1",
    gitRunner: gitRunnerFor({ head: mergeHead, content: "changed\n" }),
  }), /DEPLOYED_RELEASE_CONTENT_DRIFT/);
  assert.throws(() => verifyRepositoryReleaseDeployment({
    repositoryRoot: root,
    candidateDefinition,
    signedReleaseProofs,
    contractFingerprint: "contracts",
    releasePrerequisites: ACCEPTED_PREREQUISITES,
    nodeVersion: "24.14.1",
    gitRunner: gitRunnerFor({ head: mergeHead, tree: "f".repeat(40) }),
  }), /DEPLOYED_RELEASE_CONTENT_DRIFT/);
  assert.throws(() => verifyRepositoryReleaseDeployment({
    repositoryRoot: root,
    candidateDefinition,
    signedReleaseProofs,
    contractFingerprint: "contracts",
    releasePrerequisites: ACCEPTED_PREREQUISITES,
    nodeVersion: "24.14.1",
    gitRunner: gitRunnerFor({ head: "d".repeat(40) }),
  }), /DEPLOYED_RELEASE_LINEAGE_DRIFT/);
});

test("release and transition evidence require trusted Ed25519 verifier signatures", async () => {
  const { publicKey, privateKey } = generateKeyPairSync("ed25519");
  const trustDocument = { schema_version: "1.0.0", verifiers: [{ verifier: "release-verifier", key_id: "key-1", public_key_pem: publicKey.export({ type: "spki", format: "pem" }), allowed_kinds: ["*"], expires_at: "2030-01-01T00:00:00.000Z", revocation_state: "active" }] };
  const signedProofs = proofs();
  for (const [kind, proof] of Object.entries(signedProofs)) {
    proof.verifier = "release-verifier";
    proof.fingerprint = releaseDigest({ kind, owner: proof.owner, verifier: proof.verifier, candidate_fingerprint: proof.candidate_fingerprint, fresh_until: proof.fresh_until, correctness: proof.correctness, evidence: proof.evidence });
    proof.verifier_key_id = "key-1";
    proof.signature = sign(null, releaseSignaturePayload({ purpose: "next-workflow-release-proof", kind, candidateFingerprint: proof.candidate_fingerprint, proofFingerprint: proof.fingerprint, freshUntil: proof.fresh_until }), privateKey).toString("base64url");
  }
  const releaseVerifier = createSignedReleaseProofVerifier({ trustDocument, now: () => NOW });
  assert.equal((await verifyReleaseProofs({ candidateFingerprint: candidate.candidate_fingerprint, candidateDefinition: candidate, proofs: signedProofs, proofVerifier: releaseVerifier, now: NOW })).status, "passed");
  signedProofs.main_ci.signature = `${signedProofs.main_ci.signature.slice(0, -2)}aa`;
  assert.equal((await verifyReleaseProofs({ candidateFingerprint: candidate.candidate_fingerprint, candidateDefinition: candidate, proofs: signedProofs, proofVerifier: releaseVerifier, now: NOW })).status, "failed");

  const transition = transitionEvidence("shadow");
  transition.verifier = "release-verifier";
  transition.fingerprint = releaseDigest({ kind: "shadow", owner: transition.owner, verifier: transition.verifier, candidate_fingerprint: transition.candidate_fingerprint, fresh_until: transition.fresh_until, correctness: transition.correctness, evidence: transition.evidence });
  transition.verifier_key_id = "key-1";
  transition.signature = sign(null, releaseSignaturePayload({ purpose: "next-workflow-activation-transition", kind: "shadow", candidateFingerprint: transition.candidate_fingerprint, proofFingerprint: transition.fingerprint, freshUntil: transition.fresh_until }), privateKey).toString("base64url");
  const store = fixtureStore();
  const transitioned = await persistActivationTransition({ store, expectedRevision: 0, candidateFingerprint: candidate.candidate_fingerprint, candidateDefinition: candidate, nextMode: "shadow", evidence: transition, transitionVerifier: createSignedTransitionVerifier({ trustDocument, now: () => NOW }), releasePrerequisites: ACCEPTED_PREREQUISITES, now: NOW });
  assert.equal(transitioned.mode, "shadow");
  store.close();
});

test("speed is considered only after all correctness measures pass", () => {
  const failed = evaluateCorrectness({ requiredCheckMisses: 1, authorityDecisionParity: true, traceabilityCoverage: 1, existingFeatureRegressions: 0, unknownGreenStates: 0 });
  assert.equal(evaluatePerformance({ correctness: failed, legacyDurationMs: 10, candidateDurationMs: 5 }).status, "blocked");
  const passed = evaluateCorrectness({ requiredCheckMisses: 0, authorityDecisionParity: true, traceabilityCoverage: 1, existingFeatureRegressions: 0, unknownGreenStates: 0 });
  assert.equal(evaluatePerformance({ correctness: passed, legacyDurationMs: 10, candidateDurationMs: 5 }).accepted, true);
});

test("every proof carries independently verified owner, verifier, candidate, fingerprint, freshness, and correctness bindings", async () => {
  const summary = await verifyReleaseProofs({ candidateFingerprint: candidate.candidate_fingerprint, candidateDefinition: candidate, proofs: proofs(), proofVerifier: independentVerifier, now: NOW });
  assert.equal(summary.status, "passed");
  assert.deepEqual(Object.keys(summary.verified_proofs), PROOF_KINDS);
  assert.notEqual(summary.verified_proofs.main_ci.owner, summary.verified_proofs.main_ci.verifier);

  const exploitCases = [
    ["owner equals verifier", { owner: "same", verifier: "same" }, "invalid"],
    ["candidate mismatch", { candidate_fingerprint: "changed" }, "mismatched"],
    ["stale", { fresh_until: "2028-12-31T00:00:00.000Z" }, "stale"],
    ["incorrect", { correctness: { status: "failed", fingerprint: "failed" } }, "incorrect"],
    ["content-free evidence", { evidence: {} }, "invalid"],
    ["forged fingerprint", { fingerprint: "forged" }, "invalid"]
  ];
  for (const [label, mutation, bucket] of exploitCases) {
    const input = proofs();
    input.main_ci = proofFor("main_ci", mutation);
    const failed = await verifyReleaseProofs({ candidateFingerprint: candidate.candidate_fingerprint, candidateDefinition: candidate, proofs: input, proofVerifier: independentVerifier, now: NOW });
    assert.equal(failed.status, "failed", label);
    assert.ok(failed[bucket].includes("main_ci"), label);
  }
});

test("release proofs reconstruct one exact candidate-head, merge, and synchronization lineage", () => {
  const cases = [
    ["local candidate head", "local_release", { ...proofEvidence("local_release"), repository_head: "b".repeat(40) }],
    ["PR candidate head", "pr_ci", { ...proofEvidence("pr_ci"), head_sha: "b".repeat(40) }],
    ["main candidate ancestry", "main_ci", { ...proofEvidence("main_ci"), candidate_head_sha: "b".repeat(40) }],
    ["repository identity", "main_ci", { ...proofEvidence("main_ci"), repository: "other/repository" }],
    ["pull request identity", "main_ci", { ...proofEvidence("main_ci"), pr_number: 43 }],
    ["main branch", "main_ci", { ...proofEvidence("main_ci"), branch: "release" }],
    ["merge synchronization", "main_ci", { ...proofEvidence("main_ci"), merge_sha: "b".repeat(40) }],
    ["one-sided synchronization", "local_remote_sync", { ...proofEvidence("local_remote_sync"), local_head: "b".repeat(40) }],
    ["remote main ref", "local_remote_sync", { ...proofEvidence("local_remote_sync"), remote_ref: "refs/remotes/origin/release" }]
  ];
  for (const [label, kind, evidence] of cases) {
    const input = proofs();
    input[kind] = proofFor(kind, { evidence });
    const result = verifyReleaseProofs({ candidateFingerprint: candidate.candidate_fingerprint, candidateDefinition: candidate, proofs: input, proofVerifier: independentVerifier, now: NOW });
    assert.equal(result.status, "failed", label);
    assert.ok(result.invalid.includes("release_lineage"), label);
  }
});

test("caller proof assertions fail when the injected verifier does not independently attest them", async () => {
  const summary = await verifyReleaseProofs({
    candidateFingerprint: candidate.candidate_fingerprint,
    candidateDefinition: candidate,
    proofs: proofs(),
    proofVerifier: async ({ proof }) => ({ verified: true, owner: proof.owner, verifier: proof.verifier, candidate_fingerprint: proof.candidate_fingerprint, proof_fingerprint: "caller-asserted", fresh_until: proof.fresh_until, correctness: true, verification_fingerprint: "forged" }),
    now: NOW
  });
  assert.equal(summary.status, "failed");
  assert.deepEqual(summary.invalid, PROOF_KINDS);
  assert.throws(() => verifyReleaseProofs({ candidateFingerprint: candidate.candidate_fingerprint, candidateDefinition: candidate, proofs: proofs(), now: NOW }), /RELEASE_PROOF_VERIFIER_REQUIRED/);
});

test("activation independently re-verifies proofs and persists through expected-revision CAS", async () => {
  const store = fixtureStore();
  const readyRevision = await prepareReady(store);
  const activation = await completeActivation({ candidateFingerprint: candidate.candidate_fingerprint, proofs: proofs(), proofVerifier: independentVerifier, transitionVerifier, store, expectedRevision: readyRevision, releasePrerequisites: ACCEPTED_PREREQUISITES, now: NOW });
  assert.equal(activation.mode, "enforced");
  assert.equal(activation.store_revision, readyRevision + 1);
  const persisted = store.get({ id: activation.activation_record_id }).payload;
  assert.equal(persisted.proof_summary.status, "passed");
  assert.deepEqual(persisted.candidate_definition, candidate);
  assert.deepEqual(Object.keys(persisted.signed_release_proofs).sort(), [...PROOF_KINDS].sort());
  assert.equal(validateActivationRecord(persisted).mode, "enforced");
  const history = cycleHistory(store, persisted);
  assert.equal(verifyEnforcedActivationRecord({ record: persisted, cycleHistory: history, proofVerifier: independentVerifier, transitionVerifier, expectedRevocationEpoch: store.revocation_epoch, now: NOW }).trusted, true);
  assert.throws(() => verifyEnforcedActivationRecord({ record: persisted, cycleHistory: history.slice(1), proofVerifier: independentVerifier, transitionVerifier, expectedRevocationEpoch: store.revocation_epoch, now: NOW }), /ENFORCED_ACTIVATION_CYCLE_HISTORY_REQUIRED/);
  const {
    cycle_id: ignoredCycleId,
    cycle_start_revision: ignoredCycleStart,
    cycle_step: ignoredCycleStep,
    previous_record_revision: ignoredPreviousRevision,
    previous_record_content_fingerprint: ignoredPreviousFingerprint,
    ...legacy
  } = structuredClone(persisted);
  legacy.schema_version = "1.0.0";
  assert.equal(legacy.revision, 7);
  assert.equal(verifyEnforcedActivationRecord({ record: legacy, proofVerifier: independentVerifier, transitionVerifier, expectedRevocationEpoch: store.revocation_epoch, now: NOW }).trusted, true);
  const forgedEvidence = structuredClone(persisted);
  forgedEvidence.evidence[0].fingerprint = "f".repeat(64);
  const forgedEvidenceHistory = cycleHistory(store, persisted, { payloadsOnly: true });
  forgedEvidenceHistory[6] = forgedEvidence;
  assert.throws(() => verifyEnforcedActivationRecord({ record: forgedEvidence, cycleHistory: forgedEvidenceHistory, proofVerifier: independentVerifier, transitionVerifier, expectedRevocationEpoch: store.revocation_epoch, now: NOW }), /ENFORCED_ACTIVATION_EVIDENCE_BINDING_INVALID/);
  const forgedTransition = structuredClone(persisted);
  forgedTransition.transition_evidence[0].owner = "forged-owner";
  const forgedTransitionHistory = cycleHistory(store, persisted, { payloadsOnly: true });
  forgedTransitionHistory[6] = forgedTransition;
  assert.throws(() => verifyEnforcedActivationRecord({ record: forgedTransition, cycleHistory: forgedTransitionHistory, proofVerifier: independentVerifier, transitionVerifier, expectedRevocationEpoch: store.revocation_epoch, now: NOW }), /ENFORCED_ACTIVATION_TRANSITION_BINDING_INVALID/);
  store.close();
});

test("a different candidate replaces an abandoned partial cycle through seven fresh contiguous stages", async () => {
  const store = fixtureStore();
  const firstReadyRevision = await prepareReady(store);
  const firstActivation = await completeActivation({ candidateFingerprint: candidate.candidate_fingerprint, proofs: proofs(), proofVerifier: independentVerifier, transitionVerifier, store, expectedRevision: firstReadyRevision, releasePrerequisites: ACCEPTED_PREREQUISITES, now: NOW });
  const abandoned = freezeReleaseCandidate({
    repositoryHead: candidate.repository_head,
    repositoryTree: candidate.repository_tree,
    artifactFingerprints: ["abandoned-artifact"],
    nodeVersion: candidate.node_version,
    contractFingerprint: candidate.contract_fingerprint,
    releasePrerequisites: ACCEPTED_PREREQUISITES,
  });
  assert.notEqual(abandoned.candidate_fingerprint, candidate.candidate_fingerprint);
  await assert.rejects(() => persistActivationTransition({
    store,
    expectedRevision: store.revision,
    candidateFingerprint: abandoned.candidate_fingerprint,
    candidateDefinition: abandoned,
    nextMode: "release_verified",
    evidence: transitionEvidence("release_verified", abandoned),
    transitionVerifier,
    releasePrerequisites: ACCEPTED_PREREQUISITES,
    now: NOW,
  }), /ACTIVATION_CANDIDATE_DEFINITION_DRIFT|CANDIDATE_DRIFT_REQUIRES_SHADOW/);
  await prepareThrough(store, abandoned, ["shadow", "release_verified"]);
  const replacement = freezeReleaseCandidate({
    repositoryHead: candidate.repository_head,
    repositoryTree: candidate.repository_tree,
    artifactFingerprints: ["replacement-artifact"],
    nodeVersion: candidate.node_version,
    contractFingerprint: candidate.contract_fingerprint,
    releasePrerequisites: ACCEPTED_PREREQUISITES,
  });
  await assert.rejects(() => persistActivationTransition({
    store,
    expectedRevision: store.revision,
    candidateFingerprint: replacement.candidate_fingerprint,
    candidateDefinition: replacement,
    nextMode: "recovery_verified",
    evidence: transitionEvidence("recovery_verified", replacement),
    transitionVerifier,
    releasePrerequisites: ACCEPTED_PREREQUISITES,
    now: NOW,
  }), /ACTIVATION_CANDIDATE_DEFINITION_DRIFT|CANDIDATE_DRIFT_REQUIRES_SHADOW/);
  const replacementReadyRevision = await prepareReady(store, replacement);
  const replacementActivation = await completeActivation({ candidateFingerprint: replacement.candidate_fingerprint, proofs: proofs(replacement), proofVerifier: independentVerifier, transitionVerifier, store, expectedRevision: replacementReadyRevision, releasePrerequisites: ACCEPTED_PREREQUISITES, now: NOW });
  assert.equal(replacementActivation.mode, "enforced");
  assert.equal(replacementActivation.store_revision, firstActivation.store_revision + 9);
  assert.equal(replacementActivation.revision, 16);
  assert.notEqual(replacementActivation.revision % 7, 0);
  assert.equal(store.get({ id: firstActivation.activation_record_id }).payload.candidate_fingerprint, candidate.candidate_fingerprint);
  const latest = store.get({ id: replacementActivation.activation_record_id }).payload;
  assert.deepEqual(latest.candidate_definition, replacement);
  assert.equal(latest.cycle_start_revision, 10);
  assert.equal(latest.cycle_step, 7);
  assert.equal(latest.transition_evidence[0].mode, "shadow");
  assert.equal(latest.transition_evidence.length, 7);
  const allRows = store.query({ kind: "NextWorkflowActivation", limit: 1000 }).records.sort((left, right) => left.record_revision - right.record_revision);
  assert.equal(allRows.length, 16);
  assert.deepEqual(allRows.map((row) => row.record_revision), Array.from({ length: 16 }, (_, index) => index + 1));
  const replacementHistory = cycleHistory(store, latest);
  assert.deepEqual(replacementHistory.map((row) => row.payload.cycle_step), [1, 2, 3, 4, 5, 6, 7]);
  assert.ok(replacementHistory.every((row) => row.schema_version === "1.1.0"
    && row.payload.cycle_start_revision === 10
    && typeof row.payload.cycle_id === "string"
    && Number.isSafeInteger(row.payload.previous_record_revision)
    && Object.hasOwn(row.payload, "previous_record_content_fingerprint")));
  assert.equal(verifyEnforcedActivationRecord({ record: latest, cycleHistory: replacementHistory, proofVerifier: independentVerifier, transitionVerifier, expectedRevocationEpoch: store.revocation_epoch, now: NOW }).trusted, true);
  const incompleteCycle = { ...structuredClone(latest), revision: latest.revision - 1 };
  assert.throws(() => verifyEnforcedActivationRecord({ record: incompleteCycle, proofVerifier: independentVerifier, transitionVerifier, expectedRevocationEpoch: store.revocation_epoch, now: NOW }), /ENFORCED_ACTIVATION_RECORD_INVALID/);
  await assert.rejects(() => persistActivationTransition({
    store,
    expectedRevision: store.revision,
    candidateFingerprint: replacement.candidate_fingerprint,
    candidateDefinition: replacement,
    nextMode: "shadow",
    evidence: transitionEvidence("shadow", replacement),
    transitionVerifier,
    releasePrerequisites: ACCEPTED_PREREQUISITES,
    now: NOW,
  }), /ACTIVATION_ORDER_INVALID|ACTIVATION_LIFECYCLE_TRANSITION_INVALID/);
  store.close();
});

test("final activation requires a live transition verifier and never reuses cached verdicts", async () => {
  const store = fixtureStore();
  const readyRevision = await prepareReady(store);
  await assert.rejects(() => completeActivation({ candidateFingerprint: candidate.candidate_fingerprint, proofs: proofs(), proofVerifier: independentVerifier, store, expectedRevision: readyRevision, releasePrerequisites: ACCEPTED_PREREQUISITES, now: NOW }), /ACTIVATION_TRANSITION_VERIFIER_REQUIRED/);
  await assert.rejects(() => completeActivation({ candidateFingerprint: candidate.candidate_fingerprint, proofs: proofs(), proofVerifier: independentVerifier, transitionVerifier: () => false, store, expectedRevision: readyRevision, releasePrerequisites: ACCEPTED_PREREQUISITES, now: NOW }), /ACTIVATION_LIFECYCLE_VERIFICATION_FAILED/);
  assert.equal(store.revision, readyRevision);
  assert.equal(store.query({ kind: "NextWorkflowActivation", limit: 1000 }).records.some((record) => record.lifecycle_state === "enforced"), false);
  store.close();
});

test("a fence invalidates the complete activation chain even when revision CAS is current", async () => {
  const store = fixtureStore();
  await prepareReady(store);
  store.fence({ reason: "revoke-ready-chain" });
  await assert.rejects(() => completeActivation({ candidateFingerprint: candidate.candidate_fingerprint, proofs: proofs(), proofVerifier: independentVerifier, transitionVerifier, store, expectedRevision: store.revision, releasePrerequisites: ACCEPTED_PREREQUISITES, now: NOW }), /AUTHORITY_EPOCH_STALE/);
  assert.equal(store.query({ kind: "NextWorkflowActivation", limit: 1000 }).records.some((record) => record.lifecycle_state === "enforced"), false);
  store.close();
});

test("internally signed but cross-lineage Git evidence cannot create an enforced record", async () => {
  const store = fixtureStore();
  const readyRevision = await prepareReady(store);
  const inconsistent = proofs();
  inconsistent.main_ci = proofFor("main_ci", { evidence: { ...proofEvidence("main_ci"), pr_number: 99 } });
  await assert.rejects(() => completeActivation({ candidateFingerprint: candidate.candidate_fingerprint, proofs: inconsistent, proofVerifier: independentVerifier, transitionVerifier, store, expectedRevision: readyRevision, releasePrerequisites: ACCEPTED_PREREQUISITES, now: NOW }), /ACTIVATION_RELEASE_PROOF_INVALID/);
  assert.equal(store.revision, readyRevision);
  assert.equal(store.query({ kind: "NextWorkflowActivation", limit: 1000 }).records.some((record) => record.lifecycle_state === "enforced"), false);
  store.close();
});

test("a fence after enforcement immediately invalidates runtime activation verification", async () => {
  const store = fixtureStore();
  const readyRevision = await prepareReady(store);
  const activation = await completeActivation({ candidateFingerprint: candidate.candidate_fingerprint, proofs: proofs(), proofVerifier: independentVerifier, transitionVerifier, store, expectedRevision: readyRevision, releasePrerequisites: ACCEPTED_PREREQUISITES, now: NOW });
  const persisted = store.get({ id: activation.activation_record_id }).payload;
  store.fence({ reason: "revoke-enforced-chain" });
  assert.throws(() => verifyEnforcedActivationRecord({ record: persisted, proofVerifier: independentVerifier, transitionVerifier, expectedRevocationEpoch: store.revocation_epoch, now: NOW }), /ENFORCED_ACTIVATION_RECORD_INVALID/);
  store.close();
});

test("activation rollback is CAS-guarded, evidence-bound, and producer-readable", async () => {
  const store = fixtureStore();
  const readyRevision = await prepareReady(store);
  const activation = await completeActivation({ candidateFingerprint: candidate.candidate_fingerprint, proofs: proofs(), proofVerifier: independentVerifier, transitionVerifier, store, expectedRevision: readyRevision, releasePrerequisites: ACCEPTED_PREREQUISITES, now: NOW });
  const evidence = { reason: "verified rollback drill", requested_by: "release-owner" };
  const rolledBack = await rollbackActivation({ store, expectedRevision: activation.store_revision, candidateFingerprint: activation.candidate_fingerprint, evidence, rollbackVerifier, stateRestorer: async () => ({ restored: true, fingerprint: releaseDigest("state-restored") }), legacyVerifier: async () => ({ verified: true, fingerprint: releaseDigest("legacy-verified") }), now: NOW });
  assert.equal(rolledBack.mode, "rolled_back");
  assert.deepEqual(rolledBack.rollback_evidence.steps.map((step) => step.state), ["FENCING", "DRAINING_OR_QUARANTINING", "STATE_RESTORED", "LEGACY_VERIFIED", "ROLLED_BACK"]);
  assert.equal(validateActivationRecord(rolledBack).mode, "rolled_back");
  const replacement = freezeReleaseCandidate({ repositoryHead: candidate.repository_head, repositoryTree: candidate.repository_tree, artifactFingerprints: ["after-rollback"], nodeVersion: candidate.node_version, contractFingerprint: candidate.contract_fingerprint, releasePrerequisites: ACCEPTED_PREREQUISITES });
  await assert.rejects(() => persistActivationTransition({ store, expectedRevision: store.revision, candidateFingerprint: replacement.candidate_fingerprint, candidateDefinition: replacement, nextMode: "shadow", evidence: transitionEvidence("shadow", replacement), transitionVerifier, releasePrerequisites: ACCEPTED_PREREQUISITES, now: NOW }), /ACTIVATION_TRANSITION_TARGET_INVALID|ACTIVATION_ROLLBACK_TERMINAL/);
  await assert.rejects(() => rollbackActivation({ store, expectedRevision: activation.store_revision, candidateFingerprint: activation.candidate_fingerprint, evidence, rollbackVerifier, stateRestorer: async () => ({ restored: true, fingerprint: "restore" }), legacyVerifier: async () => ({ verified: true, fingerprint: "legacy" }), now: NOW }), /ACTIVATION_ROLLBACK_TARGET_INVALID|REVISION_CONFLICT/);
  store.close();
});

test("rollback fences first and persists manual recovery when real unresolved effects remain", async () => {
  const store = fixtureStore();
  const readyRevision = await prepareReady(store);
  const activation = await completeActivation({ candidateFingerprint: candidate.candidate_fingerprint, proofs: proofs(), proofVerifier: independentVerifier, transitionVerifier, store, expectedRevision: readyRevision, releasePrerequisites: ACCEPTED_PREREQUISITES, now: NOW });
  store.commit({ expectedRevision: activation.store_revision, authorityEpoch: store.revocation_epoch, effectIntent: { effect_id: "effect-pending", effect_key: "pending-key", request_fp: "request", authority_fp: "authority", target_id: "target", operation: "git_effect:push", expected_selector: {}, attempt_lineage: "attempt", task_id: "task", run_id: "run", authority_epoch: store.revocation_epoch, decision_expires_at: "2030-01-01T00:00:00.000Z", settings_revision: "settings", policy_revision: "policy", activation_fp: "legacy", approval_ids: [], binding_fingerprint: releaseDigest({ effect_key: "pending-key", target_id: "target", operation: "git_effect:push" }) }, outboxItem: { outbox_id: "outbox-pending", intent_id: "effect-pending", message_fp: "pending-message", sequence: 1 } });
  await assert.rejects(() => rollbackActivation({ store, expectedRevision: store.revision, candidateFingerprint: activation.candidate_fingerprint, evidence: { reason: "emergency" }, rollbackVerifier, stateRestorer: async () => ({ restored: true, fingerprint: "must-not-run" }), legacyVerifier: async () => ({ verified: true, fingerprint: "must-not-run" }), now: NOW }), /ACTIVATION_ROLLBACK_UNRESOLVED_EFFECTS/);
  const checkpoints = store.query({ kind: "RollbackCheckpoint", limit: 1000 }).records;
  assert.ok(checkpoints.some((record) => record.lifecycle_state === "blocked" && record.payload.blocker === "UNRESOLVED_EFFECTS"));
  assert.equal(store.getOutbox({ outboxId: "outbox-pending" }).state, "pending");
  store.close();
});

test("activation rejects caller summaries and stale store revisions", async () => {
  const store = fixtureStore();
  await assert.rejects(() => completeActivation({ candidateFingerprint: candidate.candidate_fingerprint, proofSummary: { status: "passed", candidate_fingerprint: candidate.candidate_fingerprint }, proofVerifier: independentVerifier, transitionVerifier, store, expectedRevision: 0, releasePrerequisites: ACCEPTED_PREREQUISITES, now: NOW }), /ACTIVATION_READY_RECORD_REQUIRED/);
  const readyRevision = await prepareReady(store);
  store.commit({ expectedRevision: readyRevision });
  await assert.rejects(() => completeActivation({ candidateFingerprint: candidate.candidate_fingerprint, proofs: proofs(), proofVerifier: independentVerifier, transitionVerifier, store, expectedRevision: readyRevision, releasePrerequisites: ACCEPTED_PREREQUISITES, now: NOW }), /REVISION_CONFLICT/);
  store.close();
});
