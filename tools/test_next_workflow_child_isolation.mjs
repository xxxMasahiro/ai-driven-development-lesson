#!/usr/bin/env node
import assert from "node:assert/strict";
import { chmodSync, existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";

const repositoryRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const roots = [];
test.after(() => roots.forEach((root) => rmSync(root, { recursive: true, force: true })));

test("parent next-workflow CI check does not traverse an isolated registered-child sentinel", () => {
  const fixture = mkdtempSync(path.join(tmpdir(), "next-parent-ci-isolation-"));
  roots.push(fixture);
  const child = path.join(fixture, "registered-child");
  const marker = path.join(fixture, "child-was-executed");
  mkdirSync(child);
  writeFileSync(path.join(child, "package.json"), JSON.stringify({ scripts: { test: `node -e 'require(\"fs\").writeFileSync(${JSON.stringify(marker)},\"unsafe\")'` } }));
  writeFileSync(path.join(child, "CANARY"), "Parent checks must not read or execute this child fixture.\n");
  const registry = path.join(fixture, "PRODUCT_REPOSITORY_REGISTRY.tsv");
  writeFileSync(registry, `sentinel\tfree-development\tfree-development\tSentinel\t${child}\tcli\ttest\n`);
  const isolatedStore = path.join(repositoryRoot, ".workflow-state", `child-isolation-${path.basename(fixture)}.sqlite`);
  chmodSync(child, 0o000);
  let result;
  try {
    result = spawnSync(path.join(repositoryRoot, "tools/check_next_workflow.sh"), [], {
      cwd: repositoryRoot,
      encoding: "utf8",
      timeout: 30000,
      env: { ...process.env, PRODUCT_REPOSITORY_REGISTRY_FILE: registry, NEXT_WORKFLOW_REGISTERED_CHILD_PATH: child, NEXT_WORKFLOW_STORE_PATH: isolatedStore }
    });
  } finally {
    chmodSync(child, 0o700);
    for (const suffix of ["", "-shm", "-wal"]) rmSync(`${isolatedStore}${suffix}`, { force: true });
  }
  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
  assert.equal(result.signal, null);
  assert.equal(existsSync(marker), false);
});
