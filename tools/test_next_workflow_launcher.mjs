#!/usr/bin/env node
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { chmodSync, copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";
import { bootstrapHeadlessRuntimeTrust, createHeadlessOwnerAcceptance, createHeadlessOwnerIdentity, headlessBootstrapDigest } from "./lib/next_workflow/headless_bootstrap.mjs";
import { loadRepositoryIdentity, repositoryOriginDigest } from "./lib/next_workflow/identity.mjs";
import { completeActivation, freezeRepositoryReleaseCandidate, persistActivationTransition, releaseDigest } from "./lib/next_workflow/release.mjs";
import { createSignedReleaseBundle, createSignedTransitionEvidence } from "./lib/next_workflow/release_signing.mjs";
import { createSignedReleaseSourceReceipt, createSignedTransitionSourceReceipt } from "./lib/next_workflow/release_source_receipts.mjs";
import { createSignedReleaseProofVerifier, createSignedTransitionVerifier } from "./lib/next_workflow/release_trust.mjs";
import { openWorkflowStateStore } from "./lib/next_workflow/store.mjs";

const roots = [];
const originalPath = process.env.PATH;
test.after(() => {
  process.env.PATH = originalPath;
  roots.forEach((root) => rmSync(root, { recursive: true, force: true }));
});

function installFixtureCodex(root) {
  const binRoot = path.join(root, "bin");
  const packageRoot = path.join(
    root,
    "node_modules",
    "@openai",
    `codex-linux-${process.arch}`,
    "vendor",
    `${{ x64: "x86_64", arm64: "aarch64" }[process.arch]}-unknown-linux-musl`,
    "bin",
  );
  mkdirSync(binRoot, { recursive: true, mode: 0o700 });
  mkdirSync(packageRoot, { recursive: true, mode: 0o700 });
  const cliPath = path.join(binRoot, "codex");
  const nativePath = path.join(packageRoot, "codex");
  writeFileSync(cliPath, "#!/bin/sh\nexit 0\n", { mode: 0o500 });
  writeFileSync(nativePath, Buffer.from([0x7f, 0x45, 0x4c, 0x46]), { mode: 0o500 });
  chmodSync(cliPath, 0o500);
  chmodSync(nativePath, 0o500);
  process.env.PATH = `${binRoot}:${originalPath ?? ""}`;
}

const providerRoot = mkdtempSync(path.join(tmpdir(), "next-workflow-launcher-provider-"));
roots.push(providerRoot);
chmodSync(providerRoot, 0o700);
installFixtureCodex(providerRoot);

function requireRealContainment(t) {
  if (existsSync("/usr/bin/unshare") && existsSync("/usr/bin/bwrap")) return true;
  t.skip("real Linux containment prerequisites are unavailable; guided refusal is verified separately");
  return false;
}

function launcherFixture() {
  const sourceRoot = realpathSync(path.resolve(path.dirname(new URL(import.meta.url).pathname), ".."));
  const root = mkdtempSync(path.join(tmpdir(), "next-workflow-launcher-"));
  roots.push(root);
  chmodSync(root, 0o700);
  const repositoryRoot = path.join(root, "repository");
  mkdirSync(path.join(repositoryRoot, "tools", "lib", "next_workflow"), { recursive: true });
  mkdirSync(path.join(repositoryRoot, "learning"), { recursive: true });
  copyFileSync(path.join(sourceRoot, "tools", "next-workflow-launcher.cjs"), path.join(repositoryRoot, "tools", "next-workflow-launcher.cjs"));
  copyFileSync(path.join(sourceRoot, "tools", "lib", "next_workflow", "runtime_barrier.cjs"), path.join(repositoryRoot, "tools", "lib", "next_workflow", "runtime_barrier.cjs"));
  writeFileSync(path.join(repositoryRoot, "tools", "next-workflow.mjs"), `process.stdout.write(JSON.stringify({ decision: "PASS", verified_runtime: true }) + "\\n");\n`);
  writeFileSync(path.join(repositoryRoot, ".gitignore"), ".workflow-state/\n");
  const origin = "https://example.com/owner/portable-launcher-fixture.git";
  const originDigest = repositoryOriginDigest(origin);
  writeFileSync(path.join(repositoryRoot, "learning", "NEXT_WORKFLOW_REPOSITORY_IDENTITY.json"), `${JSON.stringify({
    schema_version: "1.0.0",
    config_id: "next-workflow-repository-identity",
    management_mode: "managed",
    repository_logical_id: "portable-launcher-fixture",
    attested_origin_digest: originDigest,
  }, null, 2)}\n`);
  for (const args of [
    ["init", "-q"],
    ["config", "user.name", "Fixture"],
    ["config", "user.email", "fixture@example.com"],
    ["remote", "add", "origin", origin],
  ]) {
    const result = spawnSync("/usr/bin/git", args, { cwd: repositoryRoot, encoding: "utf8" });
    assert.equal(result.status, 0, result.stderr);
  }
  const repositoryIdentity = loadRepositoryIdentity({ repositoryRoot, create: true });
  for (const args of [["add", "."], ["commit", "-qm", "fixture"]]) {
    const result = spawnSync("/usr/bin/git", args, { cwd: repositoryRoot, encoding: "utf8" });
    assert.equal(result.status, 0, result.stderr);
  }
  const trustRoot = path.join(root, "trust");
  const stateRoot = path.join(root, "state");
  mkdirSync(trustRoot, { mode: 0o700 });
  const providerAuthPath = path.join(trustRoot, "auth.json");
  const ownerAcceptancePath = path.join(trustRoot, "owner-acceptance.json");
  const ownerAcceptanceKeyPath = path.join(trustRoot, "owner-acceptance-key.pem");
  const ownerAnchorPath = path.join(trustRoot, "owner-anchor.json");
  const trustPath = path.join(trustRoot, "owner-trust.json");
  writeFileSync(providerAuthPath, "{\"fixture\":true}\n", { mode: 0o600 });
  const now = new Date(Date.now() - 1000).toISOString();
  const releasePrerequisites = {
    schema_version: "1.0.0",
    prerequisite_id: "next-development-workflow-release-prerequisites",
    revision: 1,
    headless_runtime: {
      state: "accepted",
      developer_accepted: true,
      evidence_fingerprint: "a".repeat(64),
      accepted_at: now,
    },
    control_center: {
      state: "paused",
      developer_accepted: false,
      evidence_fingerprint: null,
      accepted_at: null,
      resume_required: true,
      blocks_headless_activation: false,
    },
  };
  createHeadlessOwnerIdentity({ repositoryRoot, anchorPath: ownerAnchorPath, privateKeyPath: ownerAcceptanceKeyPath, now });
  createHeadlessOwnerAcceptance({
    repositoryRoot,
    repositoryIdentity,
    releasePrerequisites,
    acceptancePath: ownerAcceptancePath,
    privateKeyPath: ownerAcceptanceKeyPath,
    ownerAnchorPath,
    now,
  });
  const initialized = bootstrapHeadlessRuntimeTrust({
    repositoryRoot,
    repositoryIdentity,
    releasePrerequisites,
    ownerAcceptancePath,
    ownerAnchorPath,
    trustPath,
    providerAuthPath,
    runtimeStateRoot: stateRoot,
    now,
  });
  const trust = JSON.parse(readFileSync(trustPath, "utf8"));
  const databasePath = path.join(repositoryRoot, trust.production_state.database_relative_path);
  const store = openWorkflowStateStore({
    repositoryRoot,
    databasePath,
    expectedIdentity: repositoryIdentity,
    expectedGenerationId: trust.production_state.generation_id,
  });
  store.close();
  return { repositoryRoot, root, trustPath, trust, databasePath, initialized, repositoryIdentity, releasePrerequisites, now };
}

async function enforceFixtureActivation(fixture) {
  const candidateDefinition = freezeRepositoryReleaseCandidate({
    repositoryRoot: fixture.repositoryRoot,
    artifactPaths: ["tools/next-workflow.mjs"],
    contractFingerprint: releaseDigest("launcher-positive-contract"),
    releasePrerequisites: fixture.releasePrerequisites,
  });
  const freshUntil = new Date(Date.parse(fixture.now) + 24 * 60 * 60 * 1000).toISOString();
  const head = candidateDefinition.repository_head;
  const evidence = {
    local_release: {
      repository_head: head,
      checkout_instance_id: fixture.repositoryIdentity.checkout_instance_id,
      command_manifest_fingerprint: releaseDigest("commands"),
      input_manifest_fingerprint: releaseDigest("inputs"),
      artifact_manifest_fingerprint: releaseDigest(candidateDefinition.artifact_fingerprints),
    },
    pr_ci: {
      repository: "owner/portable-launcher-fixture",
      pr_number: 1,
      head_sha: head,
      run_id: 1,
      check_names: ["fixture-pr-ci"],
      artifact_digest: releaseDigest("pr-ci"),
    },
    main_ci: {
      repository: "owner/portable-launcher-fixture",
      branch: "main",
      pr_number: 1,
      candidate_head_sha: head,
      merge_sha: head,
      run_id: 2,
      check_names: ["fixture-main-ci"],
      artifact_digest: releaseDigest("main-ci"),
    },
    local_remote_sync: {
      repository_logical_id: fixture.repositoryIdentity.repository_logical_id,
      local_head: head,
      remote_head: head,
      remote_ref: "refs/remotes/origin/main",
    },
    recovery: {
      database_identity_fingerprint: releaseDigest("database"),
      candidate_fingerprint: candidateDefinition.candidate_fingerprint,
      backup_manifest_fingerprint: releaseDigest("backup"),
      restore_proof_fingerprint: releaseDigest("restore"),
    },
    fenced_rollback: {
      candidate_fingerprint: candidateDefinition.candidate_fingerprint,
      authority_epoch: 0,
      checkpoint_ids: ["fixture-checkpoint"],
      state_proof_fingerprint: releaseDigest("rollback"),
    },
    archive_decommission: {
      relationship_id: "fixture-relationship",
      from_state: "DETACHED",
      to_state: "ARCHIVED",
      transition_proof_fingerprint: releaseDigest("archive"),
    },
    outbox_disposition: {
      relationship_id: "fixture-relationship",
      effect_ids: ["fixture-effect"],
      outbox_ids: ["fixture-outbox"],
      disposition: "reconciled",
      receipt_manifest_fingerprint: releaseDigest("outbox"),
    },
  };
  const sourceReceipts = Object.fromEntries(Object.entries(evidence).map(([kind, proofEvidence]) => [kind, createSignedReleaseSourceReceipt({
    repositoryRoot: fixture.repositoryRoot,
    runtimeTrust: fixture.trust,
    privateKeyPath: fixture.initialized.release_source_private_key_path,
    kind,
    candidateFingerprint: candidateDefinition.candidate_fingerprint,
    evidence: proofEvidence,
    now: fixture.now,
    freshUntil,
  })]));
  const bundle = createSignedReleaseBundle({
    repositoryRoot: fixture.repositoryRoot,
    runtimeTrust: fixture.trust,
    privateKeyPath: fixture.initialized.release_private_key_path,
    candidateDefinition,
    sourceReceipts,
    now: fixture.now,
    freshUntil,
  });
  const transitionVerifier = createSignedTransitionVerifier({ trustDocument: fixture.trust.release_trust, now: () => fixture.now });
  const proofVerifier = createSignedReleaseProofVerifier({ trustDocument: fixture.trust.release_trust, now: () => fixture.now });
  const store = openWorkflowStateStore({
    repositoryRoot: fixture.repositoryRoot,
    databasePath: fixture.databasePath,
    expectedIdentity: fixture.repositoryIdentity,
    expectedGenerationId: fixture.trust.production_state.generation_id,
  });
  try {
    for (const nextMode of ["shadow", "release_verified", "recovery_verified", "rollback_verified", "archive_decommission_verified", "ready"]) {
      const transitionSource = createSignedTransitionSourceReceipt({
        repositoryRoot: fixture.repositoryRoot,
        runtimeTrust: fixture.trust,
        privateKeyPath: fixture.initialized.release_source_private_key_path,
        nextMode,
        candidateFingerprint: candidateDefinition.candidate_fingerprint,
        evidence: {
          acceptance_prerequisite_fingerprint: candidateDefinition.release_prerequisite_fingerprint,
          repository_head: candidateDefinition.repository_head,
          stage_evidence_fingerprint: releaseDigest(`stage:${nextMode}`),
        },
        now: fixture.now,
        freshUntil,
      });
      const transition = createSignedTransitionEvidence({
        repositoryRoot: fixture.repositoryRoot,
        runtimeTrust: fixture.trust,
        privateKeyPath: fixture.initialized.release_private_key_path,
        candidateDefinition,
        nextMode,
        stageReceipt: transitionSource,
        now: fixture.now,
        freshUntil,
      });
      await persistActivationTransition({
        store,
        expectedRevision: store.revision,
        candidateFingerprint: candidateDefinition.candidate_fingerprint,
        candidateDefinition,
        nextMode,
        evidence: transition,
        transitionVerifier,
        releasePrerequisites: fixture.releasePrerequisites,
        now: fixture.now,
      });
    }
    await completeActivation({
      store,
      expectedRevision: store.revision,
      candidateFingerprint: candidateDefinition.candidate_fingerprint,
      proofs: bundle.proofs,
      proofVerifier,
      transitionVerifier,
      releasePrerequisites: fixture.releasePrerequisites,
      now: fixture.now,
    });
  } finally {
    store.close();
  }
  return candidateDefinition;
}

test("the installed wrapper removes pre-Node injection variables and rejects a forged enforced row", (t) => {
  if (!requireRealContainment(t)) return;
  const fixture = launcherFixture();
  const database = new DatabaseSync(fixture.databasePath);
  database.prepare(`
    INSERT INTO records(
      id,kind,schema_version,record_revision,repository_id,checkout_id,authority_scope,
      lineage_id,lifecycle_state,payload_json,source_revision,policy_fp,input_fp,content_fp,
      sensitivity,fresh_until,created_at,superseded_by
    ) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
  `).run(
    "forged-activation",
    "NextWorkflowActivation",
    "1.0.0",
    7,
    fixture.trust.repository_logical_id,
    fixture.trust.checkout_instance_id,
    "release",
    "next-development-workflow",
    "enforced",
    JSON.stringify({ mode: "enforced" }),
    "forged",
    "forged",
    "forged",
    "f".repeat(64),
    "internal",
    new Date(Date.now() + 60_000).toISOString(),
    new Date().toISOString(),
    null,
  );
  database.close();
  const injectionMarker = path.join(fixture.root, "node-options-executed");
  const injectionModule = path.join(fixture.root, "node-options-injection.cjs");
  writeFileSync(injectionModule, `require("node:fs").writeFileSync(${JSON.stringify(injectionMarker)}, "executed");\n`, { mode: 0o600 });
  const result = spawnSync(fixture.initialized.runtime_launcher_path, [fixture.repositoryRoot, "runtime", "status", ""], {
    cwd: fixture.repositoryRoot,
    encoding: "utf8",
    env: {
      ...process.env,
      NODE_OPTIONS: `--require=${injectionModule}`,
      NODE_PATH: fixture.root,
      NEXT_WORKFLOW_OWNER_TRUST_PATH: path.join(fixture.root, "attacker-selected.json"),
    },
  });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /VERIFIED_LAUNCH_ACTIVATION_INVALID/);
  assert.equal(existsSync(injectionMarker), false);
});

test("a copied launcher script and forged public marker cannot replace the installed wrapper entry point", (t) => {
  if (!requireRealContainment(t)) return;
  const fixture = launcherFixture();
  const result = spawnSync(process.execPath, [fixture.trust.runtime_launcher.script_path, fixture.repositoryRoot, "runtime", "status"], {
    cwd: fixture.repositoryRoot,
    encoding: "utf8",
    env: {
      ...process.env,
      NEXT_WORKFLOW_OWNER_TRUST_PATH: fixture.trustPath,
      NEXT_WORKFLOW_SANITIZED_LAUNCH: headlessBootstrapDigest({
        script_fingerprint: fixture.trust.runtime_launcher.script_fingerprint,
        interpreter_fingerprint: fixture.trust.runtime_launcher.interpreter_fingerprint,
      }),
      NODE_OPTIONS: undefined,
      NODE_PATH: undefined,
    },
  });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /VERIFIED_LAUNCH_WRAPPER_PARENT_REQUIRED/);
});

test("the installed wrapper runs only the immutable signed runtime snapshot after complete activation", async (t) => {
  if (!requireRealContainment(t)) return;
  const fixture = launcherFixture();
  await enforceFixtureActivation(fixture);
  const result = spawnSync(fixture.initialized.runtime_launcher_path, [fixture.repositoryRoot, "runtime", "status", ""], {
    cwd: fixture.repositoryRoot,
    encoding: "utf8",
    env: process.env,
  });
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(JSON.parse(result.stdout), { decision: "PASS", verified_runtime: true });
  assert.equal(existsSync(path.join(path.dirname(fixture.trustPath), "verified-runtime-tools")), false);
});
