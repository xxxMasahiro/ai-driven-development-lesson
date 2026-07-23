#!/usr/bin/env node
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { chmodSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { bootstrapHeadlessRuntimeTrust, createHeadlessOwnerAcceptance, createHeadlessOwnerIdentity, HEADLESS_RUNTIME_AUTHORITIES } from "./lib/next_workflow/headless_bootstrap.mjs";
import { loadProtectedRuntimeTrust } from "./lib/next_workflow/runtime_trust.mjs";

const roots = [];
test.after(() => roots.forEach((root) => rmSync(root, { recursive: true, force: true })));

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
  return { path: `${binRoot}:${process.env.PATH ?? ""}` };
}

test("headless bootstrap creates an external private owner trust and never overwrites it", (t) => {
  const repositoryRoot = realpathSync(path.resolve(path.dirname(new URL(import.meta.url).pathname), ".."));
  const root = mkdtempSync(path.join(tmpdir(), "next-workflow-headless-bootstrap-"));
  roots.push(root);
  chmodSync(root, 0o700);
  const trustRoot = path.join(root, "trust");
  const stateRoot = path.join(root, "state");
  mkdirSync(trustRoot, { mode: 0o700 });
  const providerAuthPath = path.join(trustRoot, "auth.json");
  const trustPath = path.join(trustRoot, "owner-trust.json");
  writeFileSync(providerAuthPath, "{\"fixture\":true}\n", { mode: 0o600 });
  const fixtureCodex = installFixtureCodex(root);
  const previousPath = process.env.PATH;
  process.env.PATH = fixtureCodex.path;
  t.after(() => { process.env.PATH = previousPath; });
  const repositoryIdentity = {
    repository_logical_id: "portable-repository-fixture",
    checkout_instance_id: "headless-bootstrap-test",
    origin_digest: "1".repeat(64),
    checkout_anchor_digest: "2".repeat(64),
    config_digest: "3".repeat(64),
    attested_at: "2029-01-01T00:00:00.000Z",
  };
  const releasePrerequisites = {
    schema_version: "1.0.0",
    prerequisite_id: "next-development-workflow-release-prerequisites",
    revision: 1,
    headless_runtime: {
      state: "accepted",
      developer_accepted: true,
      evidence_fingerprint: "a".repeat(64),
      accepted_at: "2029-01-01T00:00:00.000Z",
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
  const ownerAcceptancePath = path.join(trustRoot, "owner-acceptance.json");
  const ownerAcceptanceKeyPath = path.join(trustRoot, "owner-acceptance-key.pem");
  const ownerAnchorPath = path.join(trustRoot, "owner-anchor.json");
  createHeadlessOwnerIdentity({
    repositoryRoot,
    anchorPath: ownerAnchorPath,
    privateKeyPath: ownerAcceptanceKeyPath,
    now: "2029-01-01T00:00:00.000Z",
  });
  createHeadlessOwnerAcceptance({
    repositoryRoot,
    repositoryIdentity,
    releasePrerequisites,
    acceptancePath: ownerAcceptancePath,
    privateKeyPath: ownerAcceptanceKeyPath,
    ownerAnchorPath,
    now: "2029-01-01T00:00:00.000Z",
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
    now: "2029-01-01T00:00:00.000Z",
  });
  assert.equal(initialized.status, "initialized");
  assert.equal(path.basename(initialized.runtime_launcher_path), "next-workflow-launcher");
  assert.equal((lstatSync(initialized.runtime_launcher_path).mode & 0o077), 0);
  const trust = loadProtectedRuntimeTrust({
    repositoryRoot,
    repositoryLogicalId: repositoryIdentity.repository_logical_id,
    checkoutInstanceId: repositoryIdentity.checkout_instance_id,
    trustPath,
    now: "2029-01-01T00:00:01.000Z",
  });
  assert.equal(trust.runtime_authorities[HEADLESS_RUNTIME_AUTHORITIES.containment].profile_id, "linux-user-mount-provider-net-v1");
  assert.equal(trust.runtime_authorities[HEADLESS_RUNTIME_AUTHORITIES.launchObservation].allowed_executable_paths.length, 1);
  assert.equal(trust.document.repository_logical_id, "portable-repository-fixture");
  assert.equal(trust.runtime_launcher.path, initialized.runtime_launcher_path);
  assert.equal(path.basename(trust.runtime_launcher.script_path), "next-workflow-launcher.cjs");
  assert.equal(realpathSync(trust.runtime_launcher.interpreter_path), realpathSync(process.execPath));
  assert.deepEqual(Object.keys(trust.release_trust.verifiers[0]).sort(), ["allowed_kinds", "expires_at", "key_id", "public_key_pem", "revocation_state", "verifier"].sort());
  const firstTrust = readFileSync(trustPath, "utf8");
  const repeated = bootstrapHeadlessRuntimeTrust({
    repositoryRoot,
    repositoryIdentity,
    releasePrerequisites,
    ownerAcceptancePath,
    ownerAnchorPath,
    trustPath,
    providerAuthPath,
    runtimeStateRoot: stateRoot,
    now: "2029-01-01T00:00:02.000Z",
  });
  assert.equal(repeated.status, "already_initialized");
  assert.equal(readFileSync(trustPath, "utf8"), firstTrust);
  const changedPrerequisites = structuredClone(releasePrerequisites);
  changedPrerequisites.headless_runtime.evidence_fingerprint = "b".repeat(64);
  assert.throws(() => bootstrapHeadlessRuntimeTrust({
    repositoryRoot,
    repositoryIdentity,
    releasePrerequisites: changedPrerequisites,
    ownerAcceptancePath,
    ownerAnchorPath,
    trustPath: path.join(trustRoot, "changed-owner-trust.json"),
    providerAuthPath,
    runtimeStateRoot: path.join(root, "changed-state"),
    now: "2029-01-01T00:00:03.000Z",
  }), /OWNER_ACCEPTANCE_RECEIPT_INVALID/);
});

test("runtime status reports the complete ordered initialization procedure without executing setup", () => {
  const repositoryRoot = realpathSync(path.resolve(path.dirname(new URL(import.meta.url).pathname), ".."));
  const root = mkdtempSync(path.join(tmpdir(), "next-workflow-status-guidance-"));
  roots.push(root);
  chmodSync(root, 0o700);
  const environment = {
    ...process.env,
    NEXT_WORKFLOW_CHECKOUT_IDENTITY_PATH: path.join(root, "missing-checkout-identity.json"),
    NEXT_WORKFLOW_OWNER_TRUST_PATH: path.join(root, "missing-owner-trust.json"),
    NEXT_WORKFLOW_PRODUCTION_STORE_PATH: path.join(root, "missing-production.sqlite"),
  };
  delete environment.NODE_TEST_CONTEXT;
  const result = spawnSync(process.execPath, [
    "--no-warnings",
    path.join(repositoryRoot, "tools", "next-workflow.mjs"),
    "runtime",
    "status",
  ], {
    cwd: repositoryRoot,
    env: environment,
    encoding: "utf8",
  });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  const status = JSON.parse(result.stdout);
  assert.equal(status.decision, "STOP");
  assert.equal(status.production_available, false);
  assert.equal(Object.hasOwn(status, "setup_command"), false);
  assert.deepEqual(status.setup_steps, [
    {
      order: 1,
      id: "isolation_check",
      command: "node tools/next-workflow.mjs runtime isolation-check",
    },
    {
      order: 2,
      id: "owner_enrollment",
      command: "node tools/next-workflow.mjs runtime owner-enroll --confirm",
      produces: "owner_anchor_path",
    },
    {
      order: 3,
      id: "owner_acceptance",
      command: "node tools/next-workflow.mjs runtime acceptance-create --confirm",
      produces: "owner_acceptance_path",
    },
    {
      order: 4,
      id: "bootstrap",
      command: "node tools/next-workflow.mjs runtime bootstrap --owner-acceptance <owner_acceptance_path> --owner-anchor <owner_anchor_path> --confirm",
    },
  ]);
});
