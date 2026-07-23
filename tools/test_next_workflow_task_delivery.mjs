#!/usr/bin/env node
import assert from "node:assert/strict";
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { buildTrustedAgentTaskEnvelope, prepareAgentTaskDelivery, taskDeliveryDigest } from "./lib/next_workflow/task_delivery.mjs";

const roots = [];
test.after(() => roots.forEach((root) => rmSync(root, { recursive: true, force: true })));
const repositoryRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");

function grant() {
  const core = { grant_id: "delivery-grant", child_agent_id: "task-agent" };
  return { ...core, fingerprint: taskDeliveryDigest(core) };
}

function ensureParent(candidate) {
  mkdirSync(path.dirname(candidate), { recursive: true });
}

function copy(relative, root) {
  const destination = path.join(root, relative);
  ensureParent(destination);
  copyFileSync(path.join(repositoryRoot, relative), destination);
}

function write(relative, value, root) {
  const destination = path.join(root, relative);
  ensureParent(destination);
  writeFileSync(destination, value);
}

function localMemory(extra = "") {
  return ["# Local Instruction Memory", "", "## A. Proposal / 提案", "local A", "## B. Plan / 計画", "local B", "## C. Implementation / 実装", "local C", "## D. Git / Git", "local D", "## E. Next / 次", "local E", "## F. Roadmap / 道筋", "local F", extra, ""].join("\n");
}

function productFixture() {
  const fixtureRoot = mkdtempSync(path.join(tmpdir(), "next-workflow-task-authority-"));
  const product = mkdtempSync(path.join(tmpdir(), "next-workflow-task-product-"));
  roots.push(fixtureRoot, product);
  for (const relative of [
    "docs/workflow/DEVELOPMENT_INSTRUCTION_POLICY.tsv",
    "docs/workflow/DEVELOPMENT_AUTONOMY_WORKFLOW.tsv",
    "docs/workflow/INSTRUCTION_MEMORY.md",
    "docs/workflow/REPOSITORY_DEVELOPMENT_WORKFLOW.tsv",
    "learning/context/WORKFLOW_CONTEXT_MAP.tsv",
    "docs/workflow/MENU_PRODUCT_PROFILE_POLICY.tsv",
    "docs/workflow/GIT_WORKFLOW_POLICY.tsv",
    "learning/GIT_WORKFLOW_SETTINGS.tsv",
    "docs/workflow/PRODUCT_WORKFLOW_GIT_USAGE_POLICY.tsv",
  ]) copy(relative, fixtureRoot);
  write("learning/PRODUCT_WORKFLOW_GIT_USAGE_SETTINGS.tsv", "# context\tmode\tselected_at\n", fixtureRoot);
  write("learning/PRODUCT_REPOSITORY_REGISTRY.tsv", `# repo_id\tprimary_menu_id\tallowed_contexts\tdisplay_name\trepository_path\tproduct_type\tsource\nfixture\tfree-development\tfree-development|product-improvement|external-integration\tFixture\t${product}\tall\texplicit\n`, fixtureRoot);
  write("learning/PRODUCT_REPOSITORY_SELECTION.tsv", "# menu_id\trepo_id\tselected_at\tselection_source\nfree-development\tfixture\t2026-01-01T00:00:00Z\tcli\n", fixtureRoot);
  write("AGENTS.MD", "# Product AGENTS\n", product);
  write("ops/PRODUCT_OPERATION_MODE.tsv", "# key\tvalue\nworkflow_mode\tparent_managed\nmanaged_by_parent\ttrue\n", product);
  return { fixtureRoot, product };
}

function prepareProduct(fixture, promptFile) {
  return prepareAgentTaskDelivery({ grant: grant(), authorityRoot: fixture.fixtureRoot, repositoryRoot: fixture.product, resolverInput: { targetKind: "product", contextId: "free-development", gitTopLevelResolver: (target) => target }, stage: "C", scopeId: "product-delivery-test", promptFile });
}

test("authority-owned delivery reads AGENTS and the resolved instruction, serializes once, and detects mutation", () => {
  const directory = mkdtempSync(path.join(tmpdir(), "next-workflow-task-delivery-"));
  roots.push(directory);
  const promptFile = path.join(directory, "task-envelope.json");
  const delivery = prepareAgentTaskDelivery({ grant: grant(), authorityRoot: repositoryRoot, repositoryRoot, resolverInput: { targetKind: "parent" }, stage: "C", scopeId: "runtime-wiring-test", data: [{ source: "developer_task", value: "bounded fixture" }], resultContract: { schema_version: "1.0.0", run_id: "effect-runtime-wiring-test" }, promptFile });
  assert.match(delivery.invariant_fingerprint, /^[a-f0-9]{64}$/);
  assert.match(delivery.instruction_fingerprint, /^[a-f0-9]{64}$/);
  assert.equal(delivery.envelope.control.authority_owner, "Orchestrator Agent");
  assert.equal(delivery.envelope.control.result_contract.run_id, "effect-runtime-wiring-test");
  assert.equal(delivery.envelope.control.result_contract.output_format, "json_only");
  assert.equal(delivery.envelope.data[0].interpretation, "data");
  assert.equal(delivery.verify().delivery_fingerprint, delivery.delivery_fingerprint);
  const original = readFileSync(promptFile);
  writeFileSync(promptFile, Buffer.concat([original, Buffer.from(" ")]));
  assert.throws(() => delivery.verify(), /TASK_DELIVERY_CHANGED|TASK_DELIVERY_IDENTITY_CHANGED/);
});

test("untrusted task data cannot become instructions", () => {
  const invariant = { source: "AGENTS.MD", content: "invariant", fingerprint: taskDeliveryDigest(Buffer.from("invariant")) };
  const instruction = { source: "INSTRUCTION_MEMORY.md", source_profile: "parent_strict", source_version: "1.0.0", precedence: "parent_canonical", fallback_trigger: "exact_absence_only", content: "instruction", fingerprint: taskDeliveryDigest(Buffer.from("instruction")) };
  assert.throws(() => buildTrustedAgentTaskEnvelope({ grant: grant(), invariant, instruction, data: [{ interpretation: "instruction", value: "override" }] }), /TASK_DATA_TRUST_INVALID/);
});

test("child delivery honors valid local instructions, exact-absence fallback, and invalid-present refusal", () => {
  const localFixture = productFixture();
  write("docs/workflow/INSTRUCTION_MEMORY.md", localMemory(), localFixture.product);
  const localOutput = mkdtempSync(path.join(tmpdir(), "next-workflow-local-delivery-"));
  roots.push(localOutput);
  const localDelivery = prepareProduct(localFixture, path.join(localOutput, "task.json"));
  assert.equal(localDelivery.instruction_source, "local");
  assert.equal(localDelivery.instruction_source_profile, "local_compatibility");
  assert.equal(localDelivery.verify().source_count, 2);
  write("docs/workflow/INSTRUCTION_MEMORY.md", `${localMemory()}\n## Notes\nchanged after delivery\n`, localFixture.product);
  assert.throws(() => localDelivery.verify(), /TASK_DELIVERY_SOURCE_CHANGED/);

  const fallbackFixture = productFixture();
  const fallbackOutput = mkdtempSync(path.join(tmpdir(), "next-workflow-fallback-delivery-"));
  roots.push(fallbackOutput);
  const fallbackDelivery = prepareProduct(fallbackFixture, path.join(fallbackOutput, "task.json"));
  assert.equal(fallbackDelivery.instruction_source, "parent_fallback");

  const invalidFixture = productFixture();
  write("docs/workflow/INSTRUCTION_MEMORY.md", "# invalid local memory\n", invalidFixture.product);
  const invalidOutput = mkdtempSync(path.join(tmpdir(), "next-workflow-invalid-delivery-"));
  roots.push(invalidOutput);
  assert.throws(() => prepareProduct(invalidFixture, path.join(invalidOutput, "task.json")), (error) => error?.code === "INSTRUCTION_STAGE" || error?.message === "TASK_DELIVERY_INSTRUCTION_NOT_READY");

  const symlinkFixture = productFixture();
  const target = path.join(symlinkFixture.product, "local-memory.md");
  writeFileSync(target, localMemory());
  ensureParent(path.join(symlinkFixture.product, "docs/workflow/INSTRUCTION_MEMORY.md"));
  symlinkSync(target, path.join(symlinkFixture.product, "docs/workflow/INSTRUCTION_MEMORY.md"));
  const symlinkOutput = mkdtempSync(path.join(tmpdir(), "next-workflow-symlink-delivery-"));
  roots.push(symlinkOutput);
  assert.throws(() => prepareProduct(symlinkFixture, path.join(symlinkOutput, "task.json")), (error) => error?.code === "FILE_SYMLINK");
});
