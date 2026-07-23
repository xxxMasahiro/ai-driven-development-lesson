#!/usr/bin/env node
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { createNextWorkflowRuntime } from "./lib/next_workflow/runtime.mjs";
import { openWorkflowStateStore } from "./lib/next_workflow/store.mjs";

const roots = [];
test.after(() => roots.forEach((root) => rmSync(root, { recursive: true, force: true })));

function runtimeFixture() {
  const root = mkdtempSync(path.join(tmpdir(), "next-workflow-runtime-"));
  roots.push(root);
  const store = openWorkflowStateStore({ repositoryRoot: root, expectedIdentity: { repository_logical_id: "repo", checkout_instance_id: "checkout" } });
  let observed = 0;
  const runtime = createNextWorkflowRuntime({
    store,
    registryProvider: () => ({ fingerprint: "registry", entries: [] }),
    sourceProvider: () => { throw new Error("sources must not be loaded before activation"); },
    activationProvider: () => ({ schema_version: "1.0.0", activation_id: "next-development-workflow", revision: 1, mode: "planned", candidate_fingerprint: null, evidence: [], transition_evidence: [], correctness: { status: "not_run" }, activated_at: null }),
    activationVerifier: ({ record_fingerprint }) => ({ trusted: true, record_fingerprint, proof_fingerprint: "release-proof" }),
    currentCandidateProvider: () => { throw new Error("candidate must not be loaded before enforcement"); },
    reconciliationAuthorizer: () => ({ decision: "DENY" }),
    receiptVerifier: () => { throw new Error("receipt verifier must not run"); },
    providerObserver: {
      observe: async () => { observed += 1; return { fingerprint: "observation", object_identity: "provider" }; },
      reconcile: async () => ({ state: "manual_recovery_required" }),
    },
    effectAdapters: {},
  });
  return { store, runtime, observed: () => observed };
}

test("the production composition root fails closed before provider observation when activation is not enforced", async () => {
  const { store, runtime, observed } = runtimeFixture();
  const effect = { variant: "provider_effect", action: "invoke", subject: {}, bindings: { target_id: "provider" }, target: {}, request: {} };
  const preview = await runtime.previewEffect(effect);
  assert.equal(preview.decision.code, "NEXT_WORKFLOW_NOT_ENFORCED");
  await assert.rejects(() => runtime.executeEffect(effect), /PROTECTED_RUNTIME_AUTHORITY_REQUIRED/);
  assert.equal(observed(), 0);
  assert.equal(store.listUnresolvedEffects().length, 0);
  assert.equal(runtime.status().direct_adapter_access, false);
  assert.equal(runtime.status().operational_authority_protected, false);
  store.close();
});

test("the composition root forbids replacing the common provider gateway adapter", () => {
  const { store } = runtimeFixture();
  assert.throws(() => createNextWorkflowRuntime({
    store,
    registryProvider: () => ({ entries: [] }),
    sourceProvider: () => [],
    activationProvider: () => ({}),
    activationVerifier: () => ({}),
    currentCandidateProvider: () => ({ candidate_fingerprint: "a".repeat(64), repository_head: "b".repeat(40) }),
    reconciliationAuthorizer: () => ({}),
    receiptVerifier: () => ({}),
    providerObserver: { observe() {}, reconcile() {} },
    effectAdapters: { provider_effect: {} },
  }), /PROVIDER_GATEWAY_ADAPTER_OVERRIDE_FORBIDDEN/);
  store.close();
});

test("agent launch remains unavailable unless independent admission and containment are both configured", async () => {
  const { store, runtime } = runtimeFixture();
  await assert.rejects(() => runtime.launchAgent({}), /AGENT_LAUNCH_RUNTIME_NOT_CONFIGURED/);
  store.close();
});
