#!/usr/bin/env node
import assert from "node:assert/strict";
import {
  chmodSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import {
  createOwnerControllerManifest,
  verifyOwnerControllerExecution,
} from "./lib/next_workflow/owner_controller.mjs";

const roots = [];
test.after(() => roots.forEach((root) => rmSync(root, { recursive: true, force: true })));

function fixture() {
  const root = mkdtempSync(path.join(tmpdir(), "next-workflow-owner-controller-"));
  roots.push(root);
  chmodSync(root, 0o700);
  const repository = path.join(root, "repository");
  const base = path.join(root, "owner-controller");
  const snapshot = path.join(base, "version-1");
  mkdirSync(repository, { recursive: true, mode: 0o700 });
  mkdirSync(path.join(snapshot, "tools", "lib", "next_workflow"), { recursive: true, mode: 0o700 });
  const files = {
    "tools/next-workflow.mjs": "export const installed = true;\n",
    "tools/lib/development_instruction.mjs": "export const instruction = true;\n",
    "tools/lib/next_workflow/example.mjs": "export const runtime = true;\n",
  };
  for (const [relativePath, body] of Object.entries(files)) {
    const target = path.join(snapshot, relativePath);
    writeFileSync(target, body, { mode: 0o400 });
    chmodSync(target, 0o400);
  }
  const manifest = createOwnerControllerManifest({
    repositoryRoot: repository,
    snapshotRoot: snapshot,
    repositoryLogicalId: "repository",
    checkoutInstanceId: "checkout",
    sourceHead: "a".repeat(40),
    sourceTree: "b".repeat(40),
    installedAt: "2029-01-01T00:00:00.000Z",
    controllerBase: base,
  });
  const manifestPath = path.join(snapshot, "controller-manifest.json");
  writeFileSync(manifestPath, `${JSON.stringify(manifest)}\n`, { mode: 0o400 });
  chmodSync(manifestPath, 0o400);
  return { repository, base, snapshot, manifestPath };
}

test("only an exact protected external snapshot admits Production authority actions", () => {
  const f = fixture();
  const verified = verifyOwnerControllerExecution({
    action: "release_activate_observed",
    repositoryRoot: f.repository,
    sourceRoot: f.snapshot,
    entryPath: path.join(f.snapshot, "tools", "next-workflow.mjs"),
    repositoryLogicalId: "repository",
    checkoutInstanceId: "checkout",
    manifestPath: f.manifestPath,
    controllerBase: f.base,
  });
  assert.equal(verified.verified, true);
  assert.equal(verified.action, "release_activate_observed");

  assert.throws(() => verifyOwnerControllerExecution({
    action: "release_activate_observed",
    repositoryRoot: f.repository,
    sourceRoot: f.repository,
    entryPath: path.join(f.snapshot, "tools", "next-workflow.mjs"),
    repositoryLogicalId: "repository",
    checkoutInstanceId: "checkout",
    manifestPath: f.manifestPath,
    controllerBase: f.base,
  }), /RELEASE_OWNER_CONTROLLER_REQUIRED/);
});

test("snapshot, manifest, identity, and action drift fail before Production mutation", () => {
  for (const mutation of ["snapshot", "identity", "action"]) {
    const f = fixture();
    if (mutation === "snapshot") {
      chmodSync(path.join(f.snapshot, "tools", "lib", "next_workflow", "example.mjs"), 0o600);
      writeFileSync(path.join(f.snapshot, "tools", "lib", "next_workflow", "example.mjs"), "tampered\n");
      chmodSync(path.join(f.snapshot, "tools", "lib", "next_workflow", "example.mjs"), 0o400);
    }
    assert.throws(() => verifyOwnerControllerExecution({
      action: mutation === "action" ? "release_activate" : "release_activate_observed",
      repositoryRoot: f.repository,
      sourceRoot: f.snapshot,
      entryPath: path.join(f.snapshot, "tools", "next-workflow.mjs"),
      repositoryLogicalId: mutation === "identity" ? "other" : "repository",
      checkoutInstanceId: "checkout",
      manifestPath: f.manifestPath,
      controllerBase: f.base,
    }), /RELEASE_OWNER_CONTROLLER_REQUIRED|OWNER_CONTROLLER_(?:MANIFEST_INVALID|SNAPSHOT_DRIFT)/);
  }
});
