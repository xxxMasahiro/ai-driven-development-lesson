#!/usr/bin/env node
import assert from "node:assert/strict";
import { chmodSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { observeBuiltinProviderCatalogs } from "./lib/next_workflow/provider_discovery.mjs";
import { providerIdentityKey, selectDevelopmentAgentConfiguration, verifyDevelopmentAgentConfiguration } from "./lib/next_workflow/providers.mjs";
import { resolveAgentSelectionPolicy } from "./lib/next_workflow/settings.mjs";

const roots = [];
test.after(() => roots.forEach((root) => rmSync(root, { recursive: true, force: true })));

function family() {
  return {
    family_id: "fixture_codex",
    execution_provider_id: "openai",
    model_publisher_id: "openai",
    agent_product_id: "codex",
    adapter_id: "codex_cli",
    transport_id: "cli_process",
    observed_adapter_version: "0.0.1",
    runtime_discovery: { allowed_script_interpreters: ["bash"] },
    resource_bounds: { cost: 0 },
    estimated_cost: 0,
    model_catalog_source: "fixture",
    capabilities: ["model_selection", "native_reasoning_configuration"],
  };
}

function fixtureCatalogSet() {
  const root = mkdtempSync(path.join(tmpdir(), "next-workflow-development-selection-"));
  roots.push(root);
  const executable = path.join(root, "codex");
  writeFileSync(executable, "#!/usr/bin/env bash\nexit 0\n", { mode: 0o755 });
  chmodSync(executable, 0o755);
  const models = [
    ["gpt-5.6-sol", 1],
    ["gpt-5.6-terra", 2],
    ["gpt-5.6-luna", 3],
    ["gpt-5.5", 7],
  ].map(([slug, priority]) => ({
    slug,
    priority,
    visibility: "list",
    supported_reasoning_levels: ["low", "medium", "high", "xhigh", "max", "ultra"].map((effort) => ({ effort })),
    default_reasoning_level: "medium",
    supported_in_api: true,
  }));
  return observeBuiltinProviderCatalogs({
    adapterFamilies: [family()],
    clock: () => "2030-01-01T00:00:00.000Z",
    freshnessMs: 300000,
    executableLocator: (name) => name === "codex" ? executable : "/usr/bin/bash",
    runner: (_executable, argv) => argv[0] === "--version" ? "codex-cli 1.2.3" : JSON.stringify({ models }),
  });
}

function select(catalogSet, overrides = {}, policy = { mode: "auto", model_policy: {} }) {
  return selectDevelopmentAgentConfiguration({
    catalogSet,
    policy,
    requirements: {
      agent_id: "lead-implementation",
      role: "builder",
      rigor: "L3",
      risk: "normal",
      complexity: "normal",
      objective: "auto",
      capabilities: [],
      model_policy: {},
      ...overrides,
    },
    budget: { cost: 0 },
    now: "2030-01-01T00:01:00.000Z",
  });
}

test("development observation is bounded, path-free, and does not grant production or launch authority", () => {
  const value = fixtureCatalogSet();
  assert.equal(value.catalogs.length, 1);
  assert.equal(value.catalogs[0].adapter_version, "1.2.3");
  assert.equal(value.catalogs[0].configured_adapter_version, "0.0.1");
  assert.equal(value.catalogs[0].adapter_version_matches_configuration, false);
  assert.equal(value.catalogs[0].production_eligible, false);
  assert.equal(value.catalogs[0].selection_grants_launch_authority, false);
  assert.equal(JSON.stringify(value).includes(roots[0]), false);
  assert.deepEqual(value.catalogs[0].models.map((model) => model.recommendation_rank), [7, 3, 1, 2]);
});

test("automatic objective chooses efficiency, balance, and correctness from the current recommended cohort", () => {
  const catalogs = fixtureCatalogSet();
  const efficiency = select(catalogs, { rigor: "L2", risk: "low", complexity: "low" });
  assert.equal(efficiency.decision, "RECOMMEND");
  assert.equal(efficiency.objective, "efficiency");
  assert.equal(efficiency.selected_model, "gpt-5.6-luna");
  assert.equal(efficiency.selected_native_reasoning, "low");
  const balanced = select(catalogs);
  assert.equal(balanced.objective, "balanced");
  assert.equal(balanced.selected_model, "gpt-5.6-terra");
  assert.equal(balanced.selected_native_reasoning, "medium");
  const correctness = select(catalogs, { rigor: "L5" });
  assert.equal(correctness.objective, "correctness");
  assert.equal(correctness.selected_model, "gpt-5.6-sol");
  assert.equal(correctness.selected_native_reasoning, "xhigh");
  const maximum = select(catalogs, { rigor: "L4", risk: "critical", complexity: "extreme" });
  assert.equal(maximum.selected_model, "gpt-5.6-sol");
  assert.equal(maximum.selected_native_reasoning, "max");
  assert.equal(maximum.selected_normalized_effort, "max");
});

test("saved and task model policies compose restrictively without an unspecified fallback", () => {
  const catalogs = fixtureCatalogSet();
  const ownerPolicy = { mode: "auto", model_policy: { denied_model_ids: ["gpt-5.6-terra"] } };
  const fallback = select(catalogs, {}, ownerPolicy);
  assert.equal(fallback.selected_model, "gpt-5.6-sol");
  const disjoint = select(catalogs, { model_policy: { allowed_model_ids: ["gpt-5.6-sol"] } }, { mode: "auto", model_policy: { allowed_model_ids: ["gpt-5.6-luna"] } });
  assert.equal(disjoint.decision, "STOP");
  assert.equal(disjoint.code, "SELECTION_INELIGIBLE");
  assert.ok(disjoint.blockers.includes("MODEL_NOT_ALLOWLISTED"));
});

test("manual selection may use an observed model outside the automatic recommended cohort", () => {
  const catalogs = fixtureCatalogSet();
  const catalog = catalogs.catalogs[0];
  const identityKey = providerIdentityKey({
    execution_provider_id: catalog.execution_provider_id,
    model_publisher_id: catalog.model_publisher_id,
    agent_product_id: catalog.agent_product_id,
    adapter_id: catalog.adapter_id,
    transport_id: catalog.transport_id,
    model_id: "gpt-5.5",
  });
  const selected = select(catalogs, {}, { mode: "manual", identity_key: identityKey, model_policy: {} });
  assert.equal(selected.decision, "RECOMMEND");
  assert.equal(selected.selected_model, "gpt-5.5");
});

test("stale, tampered, empty, and unsupported catalog evidence fails closed", () => {
  const catalogs = fixtureCatalogSet();
  assert.equal(selectDevelopmentAgentConfiguration({ catalogSet: catalogs, policy: { mode: "auto" }, now: "2030-01-01T01:00:00.000Z" }).code, "DEVELOPMENT_CATALOG_SET_STALE");
  const tampered = structuredClone(catalogs);
  tampered.catalogs[0].models[0].model_id = "tampered";
  assert.equal(select(tampered).code, "DEVELOPMENT_CATALOG_SET_FINGERPRINT_INVALID");
  const empty = structuredClone(catalogs);
  empty.catalogs = [];
  assert.equal(select(empty).code, "DEVELOPMENT_CATALOG_SET_FINGERPRINT_INVALID");
  const unsupported = fixtureCatalogSet();
  unsupported.catalogs[0].models[0].native_reasoning_values = ["impossible"];
  assert.equal(select(unsupported).code, "DEVELOPMENT_CATALOG_SET_FINGERPRINT_INVALID");
});

test("prepared CLI values bind to the exact advisory plan without claiming backend attestation", () => {
  const plan = select(fixtureCatalogSet());
  const verified = verifyDevelopmentAgentConfiguration({ plan, preparedModel: plan.selected_model, preparedNativeReasoning: plan.selected_native_reasoning });
  assert.equal(verified.decision, "PASS");
  assert.equal(verified.configuration_binding, "prepared_cli_arguments");
  assert.equal(verified.backend_attestation, false);
  assert.equal(verifyDevelopmentAgentConfiguration({ plan, preparedModel: "wrong", preparedNativeReasoning: plan.selected_native_reasoning }).code, "PREPARED_CONFIGURATION_MISMATCH");
  const tampered = structuredClone(plan);
  tampered.prepared_configuration.model_argument[1] = "wrong";
  assert.equal(verifyDevelopmentAgentConfiguration({ plan: tampered, preparedModel: plan.selected_model, preparedNativeReasoning: plan.selected_native_reasoning }).code, "DEVELOPMENT_SELECTION_PLAN_FINGERPRINT_INVALID");
});

test("nearest saved setting resolves before planning and does not grant authority", () => {
  const settings = {
    values: [
      { scope: "global", subject_id: "default", mode: "auto", identity_key: null, model_policy: {} },
      { scope: "role", subject_id: "builder", mode: "manual", identity_key: "fixture", model_policy: {} },
    ],
  };
  const resolved = resolveAgentSelectionPolicy(settings, { agent_id: "lead-implementation", role_id: "builder", team_id: "team", repository_id: "repo", context_id: "context" });
  assert.equal(resolved.decision, "PASS");
  assert.equal(resolved.policy.mode, "manual");
  assert.equal(resolved.policy.identity_key, "fixture");
  assert.equal(Object.hasOwn(resolved.policy, "launch_authority"), false);
});

test("repository defaults initially allow only the selected GPT-5.6 family", () => {
  const settings = JSON.parse(readFileSync(new URL("../learning/NEXT_WORKFLOW_AGENT_SELECTION_SETTINGS.json", import.meta.url), "utf8"));
  const globalDefault = settings.values.find((entry) => entry.scope === "global" && entry.subject_id === "default");
  assert.deepEqual(globalDefault.model_policy.allowed_model_ids, ["gpt-5.6-luna", "gpt-5.6-sol", "gpt-5.6-terra"]);
  assert.equal(globalDefault.model_policy.allowed_model_ids.includes("gpt-5.5"), false);
  assert.equal(globalDefault.model_policy.allowed_model_ids.includes("gpt-5.4"), false);
});
