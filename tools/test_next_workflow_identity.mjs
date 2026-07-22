#!/usr/bin/env node
import assert from "node:assert/strict";
import { cpSync, existsSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { loadRepositoryIdentity, repositoryOriginDigest } from "./lib/next_workflow/identity.mjs";

const roots = [];
test.after(() => roots.forEach((root) => rmSync(root, { recursive: true, force: true })));

function fixture(origin = "https://example.invalid/a.git") {
  const root = mkdtempSync(path.join(tmpdir(), "next-repository-identity-"));
  roots.push(root);
  mkdirSync(path.join(root, "learning"));
  writeFileSync(path.join(root, "learning/NEXT_WORKFLOW_REPOSITORY_IDENTITY.json"), `${JSON.stringify({ schema_version: "1.0.0", config_id: "fixture.repository.v1", management_mode: "managed", repository_logical_id: "fixture-repository", attested_origin_digest: repositoryOriginDigest(origin) }, null, 2)}\n`);
  return root;
}

test("logical repository identity comes from managed config and checkout UUID persists privately", () => {
  const root = fixture("https://example.invalid/org/repository.git");
  const first = loadRepositoryIdentity({ repositoryRoot: root, originResolver: () => "https://example.invalid/org/repository.git", uuidFactory: () => "11111111-1111-4111-8111-111111111111", clock: () => "2029-01-01T00:00:00.000Z" });
  const second = loadRepositoryIdentity({ repositoryRoot: root, originResolver: () => "git@example.invalid:org/repository.git", create: false });
  assert.equal(first.repository_logical_id, "fixture-repository");
  assert.equal(second.checkout_instance_id, first.checkout_instance_id);
  assert.equal(first.origin_digest, repositoryOriginDigest("git@example.invalid:org/repository.git"));
  assert.equal(lstatSync(path.join(root, ".workflow-state/checkout-identity.json")).mode & 0o777, 0o600);
});

test("read-only identity lookup never creates the workflow state directory", () => {
  const root = fixture("https://example.invalid/org/read-only.git");
  assert.throws(() => loadRepositoryIdentity({ repositoryRoot: root, originResolver: () => "https://example.invalid/org/read-only.git", create: false }), /CHECKOUT_IDENTITY_MISSING/);
  assert.equal(existsSync(path.join(root, ".workflow-state")), false);
});

test("copied or forked checkout state fails closed until explicit re-attestation", () => {
  const source = fixture("https://example.invalid/org/source.git");
  const identity = loadRepositoryIdentity({ repositoryRoot: source, originResolver: () => "https://example.invalid/org/source.git", uuidFactory: () => "22222222-2222-4222-8222-222222222222", clock: () => "2029-01-01T00:00:00.000Z" });
  const copy = fixture("https://example.invalid/org/source.git");
  cpSync(path.join(source, "learning/NEXT_WORKFLOW_REPOSITORY_IDENTITY.json"), path.join(copy, "learning/NEXT_WORKFLOW_REPOSITORY_IDENTITY.json"));
  cpSync(path.join(source, ".workflow-state"), path.join(copy, ".workflow-state"), { recursive: true });
  assert.throws(() => loadRepositoryIdentity({ repositoryRoot: copy, originResolver: () => "https://example.invalid/org/source.git", create: false }), /CHECKOUT_REATTESTATION_REQUIRED/);
  assert.throws(() => loadRepositoryIdentity({ repositoryRoot: copy, originResolver: () => "https://example.invalid/org/fork.git", create: false }), /REPOSITORY_MANAGED_ORIGIN_MISMATCH/);
  const copiedConfig = JSON.parse(readFileSync(path.join(copy, "learning/NEXT_WORKFLOW_REPOSITORY_IDENTITY.json"), "utf8"));
  copiedConfig.attested_origin_digest = repositoryOriginDigest("https://example.invalid/org/fork.git");
  writeFileSync(path.join(copy, "learning/NEXT_WORKFLOW_REPOSITORY_IDENTITY.json"), `${JSON.stringify(copiedConfig, null, 2)}\n`);
  assert.throws(() => loadRepositoryIdentity({ repositoryRoot: copy, originResolver: () => "https://example.invalid/org/fork.git", uuidFactory: () => "33333333-3333-4333-8333-333333333333", clock: () => "2029-01-02T00:00:00.000Z", reattest: true }), /CHECKOUT_REATTESTATION_GUARD_REQUIRED/);
  assert.throws(() => loadRepositoryIdentity({ repositoryRoot: copy, originResolver: () => "https://example.invalid/org/fork.git", uuidFactory: () => "33333333-3333-4333-8333-333333333333", clock: () => "2029-01-02T00:00:00.000Z", reattest: true, reattestGuard: () => ({ allowed: false, proof_fingerprint: "b".repeat(64) }) }), /CHECKOUT_REATTESTATION_BLOCKED/);
  const reattested = loadRepositoryIdentity({ repositoryRoot: copy, originResolver: () => "https://example.invalid/org/fork.git", uuidFactory: () => "33333333-3333-4333-8333-333333333333", clock: () => "2029-01-02T00:00:00.000Z", reattest: true, reattestGuard: () => ({ allowed: true, proof_fingerprint: "a".repeat(64) }) });
  assert.notEqual(reattested.checkout_instance_id, identity.checkout_instance_id);
  assert.equal(reattested.origin_digest, repositoryOriginDigest("https://example.invalid/org/fork.git"));
});

test("unmanaged, malformed, and symlinked identity config is rejected", () => {
  const unmanaged = fixture();
  const config = path.join(unmanaged, "learning/NEXT_WORKFLOW_REPOSITORY_IDENTITY.json");
  writeFileSync(config, JSON.stringify({ schema_version: "1.0.0", config_id: "fixture.repository.v1", management_mode: "local", repository_logical_id: "fixture", attested_origin_digest: repositoryOriginDigest("https://example.invalid/a.git") }));
  assert.throws(() => loadRepositoryIdentity({ repositoryRoot: unmanaged, originResolver: () => "https://example.invalid/a.git" }), /REPOSITORY_IDENTITY_CONFIG_NOT_MANAGED/);

  const linked = fixture();
  const actual = path.join(linked, "actual-config.json");
  writeFileSync(actual, readFileSync(path.join(linked, "learning/NEXT_WORKFLOW_REPOSITORY_IDENTITY.json")));
  rmSync(path.join(linked, "learning/NEXT_WORKFLOW_REPOSITORY_IDENTITY.json"));
  symlinkSync(actual, path.join(linked, "learning/NEXT_WORKFLOW_REPOSITORY_IDENTITY.json"));
  assert.throws(() => loadRepositoryIdentity({ repositoryRoot: linked, originResolver: () => "https://example.invalid/a.git" }), /must not be a symbolic link/);
});

test("runtime CLI no longer contains the former fixed checkout identity", () => {
  const repositoryRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
  const cli = readFileSync(path.join(repositoryRoot, "tools/next-workflow.mjs"), "utf8");
  assert.equal(cli.includes("local-control-center"), false);
  assert.match(readFileSync(path.join(repositoryRoot, ".gitignore"), "utf8"), /^\/\.workflow-state\/$/m);
});
