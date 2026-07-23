#!/usr/bin/env node
import assert from "node:assert/strict";
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { admitAgentRun, authorizeCliLaunchPlan, buildApiRequestPlan, buildCliLaunchPlan, buildLocalRuntimePlan, createLaunchIntent, createNodeDescriptorPinnedExecutor, createOperationalProviderAdapter, createSelectionDryRun, dispatchApiRequestPlan, dispatchCliLaunchPlan, loadProviderRegistry, providerDigest, providerIdentityKey, providerManifestFingerprint, selectAgentConfiguration, simulateAgentStart, transitionProviderCertification, validateCustomManifest, validateEndpointObservation, validateSecretReference } from "./lib/next_workflow/providers.mjs";
import { discoverBuiltinProviderInputs } from "./lib/next_workflow/provider_discovery.mjs";

const temporaryRoots = [];
test.after(() => temporaryRoots.forEach((root) => rmSync(root, { recursive: true, force: true })));

function installFixtureCodex(root, nativeBytes) {
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
  writeFileSync(nativePath, nativeBytes, { mode: 0o500 });
  chmodSync(cliPath, 0o500);
  chmodSync(nativePath, 0o500);
  return cliPath;
}

const identity = { execution_provider_id: "fixture-provider", model_publisher_id: "fixture-publisher", agent_product_id: "fixture-product", adapter_id: "fixture-cli", transport_id: "cli_process", model_id: "fixture-model" };
const identityKey = providerIdentityKey(identity);
const codexArgvTemplate = ["exec", "--ephemeral", "--sandbox", "{{sandbox}}", "--model", "{{model_id}}", "-c", "{{reasoning_config}}", "--cd", "{{working_directory}}", "--output-last-message", "{{response_file}}", "{{stdin_marker}}"];
const codexArgvSchema = ["sandbox", "model_id", "reasoning_config", "working_directory", "response_file", "stdin_marker"];
const manifest = { manifest_id: "fixture", version: "1.0.0", identity, capabilities: ["read", "structured_output"], native_reasoning_values: ["high"], effort_mapping: { high: "enhanced" }, reasoning_mapping_provenance: { source_id: "fixture-reviewed-mapping", revision: "1", reviewed_by: "fixture-independent-reviewer", proof_fingerprint: providerDigest("fixture-mapping-proof") }, selection_profile: { correctness: 90, safety: 90, efficiency: 70, roles: ["Independent Review Lead"] }, certification_profile: { probe_authority: "independent", certification_authority: "independent", isolated_probe: true }, resource_bounds: { cost: 2 }, priority: 1, estimated_cost: 1, transport_descriptor: { argv_template: codexArgvTemplate, argv_schema: codexArgvSchema, environment_allowlist: [], private_response_file: true, executable: { canonical_path: "/usr/bin/fixture", digest: "digest" } } };
const fixtureCertificationProof = providerDigest("fixture-certification-proof");
const certificationCore = { certification_id: "cert", certifier_id: "fixture-certifier", identity_key: identityKey, manifest_version: "1.0.0", adapter_version: "1", platform: "linux-x64", manifest_fingerprint: providerManifestFingerprint(manifest), capability_fingerprint: providerDigest(manifest.capabilities.slice().sort()), state: "CERTIFIED", certified_at: "2028-01-01T00:00:00.000Z", expires_at: "2030-01-01T00:00:00.000Z", revocation_epoch: 0, revocation_state: "active", observation_fingerprint: providerDigest("observation"), probe_lineage: "fixture-probe-1", probe_authority_id: "fixture-probe-authority", probe_fingerprint: providerDigest("fixture-probe"), certification_proof_fingerprint: fixtureCertificationProof, clock_fingerprint: providerDigest({ certified_at: "2028-01-01T00:00:00.000Z", expires_at: "2030-01-01T00:00:00.000Z" }), authority_fingerprint: providerDigest({ certifier_id: "fixture-certifier", probe_authority_id: "fixture-probe-authority", certification_proof_fingerprint: fixtureCertificationProof }) };
const certification = { ...certificationCore, drift_fingerprint: providerDigest({ identity_key: certificationCore.identity_key, manifest_version: certificationCore.manifest_version, adapter_version: certificationCore.adapter_version, platform: certificationCore.platform, manifest_fingerprint: certificationCore.manifest_fingerprint, capability_fingerprint: certificationCore.capability_fingerprint, observation_fingerprint: certificationCore.observation_fingerprint, revocation_epoch: certificationCore.revocation_epoch }) };

function certificationWith(overrides = {}) {
  const value = { ...certification, ...overrides };
  return { ...value, clock_fingerprint: providerDigest({ certified_at: value.certified_at, expires_at: value.expires_at }), drift_fingerprint: providerDigest({ identity_key: value.identity_key, manifest_version: value.manifest_version, adapter_version: value.adapter_version, platform: value.platform, manifest_fingerprint: value.manifest_fingerprint, capability_fingerprint: value.capability_fingerprint, observation_fingerprint: value.observation_fingerprint, revocation_epoch: value.revocation_epoch }) };
}

function runtimeObservation(overrides = {}) {
  return {
    identity,
    native_reasoning: "high",
    normalized_effort: "enhanced",
    source: "adapter-observation",
    process_identity: { process_id: "pid-123", adapter_instance_id: "adapter-instance-1", executable_fingerprint: providerDigest("fixture-executable") },
    sandbox: { mode: "read_only", network: false, writable_paths: [] },
    capabilities: ["read", "structured_output"],
    actions: ["read"],
    tools: ["rg"],
    resource_limits: { max_runtime_ms: 100, max_tokens: 100, max_cost: 1, max_retries: 1 },
    targets: ["repo"],
    ...overrides,
  };
}

function registry(cert = certification) {
  const certificationVerifier = { trusted: true, verify: ({ certification: value, fingerprint }) => ({ verified: true, fingerprint, certification_id: value.certification_id, certifier_id: value.certifier_id, identity_key: value.identity_key, authority_fingerprint: value.authority_fingerprint }) };
  return loadProviderRegistry({ manifests: [manifest], certifications: [cert], certificationVerifier, platform: "linux-x64", clock: () => "2029-01-01T00:00:00.000Z" });
}

test("certified registry entry is eligible and deterministic", () => {
  const value = registry();
  assert.equal(value.entries[0].eligible, true);
  assert.match(value.fingerprint, /^[a-f0-9]{64}$/);
});

test("certification and observation verifiers cannot authenticate with booleans or unbound verdicts", () => {
  const forged = loadProviderRegistry({ manifests: [manifest], certifications: [certification], certificationVerifier: { trusted: true, verify: () => true }, platform: "linux-x64", clock: () => "2029-01-01T00:00:00.000Z" });
  assert.ok(forged.entries[0].blockers.includes("CERTIFICATION_PROVENANCE_UNTRUSTED"));
});

test("expired, revoked, platform-drifted, and capability-drifted certifications fail closed", () => {
  const cases = [
    [certificationWith({ certified_at: "2019-01-01T00:00:00.000Z", expires_at: "2020-01-01T00:00:00.000Z" }), "CERTIFICATION_EXPIRED"],
    [certificationWith({ state: "REVOKED", revocation_state: "revoked" }), "CERTIFICATION_REVOKED"],
    [certificationWith({ platform: "other" }), "PLATFORM_MISMATCH"],
    [certificationWith({ capability_fingerprint: providerDigest("drift") }), "CAPABILITY_DRIFT"]
  ];
  for (const [cert, blocker] of cases) assert.ok(registry(cert).entries[0].blockers.includes(blocker));
});

test("Auto and Manual use the same eligibility floor", () => {
  const authority = { decision: "ALLOW" };
  assert.equal(selectAgentConfiguration({ registry: registry(), policy: { mode: "auto" }, requirements: { capabilities: ["read"] }, authority, budget: { cost: 5 } }).decision, "PASS");
  assert.equal(selectAgentConfiguration({ registry: registry(), policy: { mode: "manual", identity_key: identityKey }, requirements: { capabilities: ["missing"] }, authority, budget: { cost: 5 } }).code, "SELECTION_INELIGIBLE");
  const selected = selectAgentConfiguration({ registry: registry(), policy: { mode: "auto" }, requirements: { capabilities: ["read"] }, authority, budget: { cost: 5 } });
  assert.equal(selected.selection_lineage[0].registry_fingerprint, registry().fingerprint);
  assert.equal(selected.selected_model, "fixture-model");
  assert.equal(selected.selected_native_reasoning, "high");
  assert.equal(selected.selected_normalized_effort, "enhanced");
  assert.equal(selected.effort_criteria.normalized_floor, "medium");
  const tooStrict = selectAgentConfiguration({ registry: registry(), policy: { mode: "auto" }, requirements: { capabilities: ["read"], rigor: "L5" }, authority, budget: { cost: 5 } });
  assert.equal(tooStrict.code, "SELECTION_INELIGIBLE");
  assert.ok(tooStrict.blockers.includes("EFFORT_BELOW_REQUIRED_FLOOR"));
  const implicitOnlyRegistry = structuredClone(registry());
  implicitOnlyRegistry.entries[0].manifest.native_reasoning_values = ["none"];
  implicitOnlyRegistry.entries[0].manifest.effort_mapping = { none: "none" };
  const implicitOnly = selectAgentConfiguration({ registry: implicitOnlyRegistry, policy: { mode: "auto" }, requirements: { capabilities: ["read"], rigor: "L1" }, authority, budget: { cost: 5 } });
  assert.equal(implicitOnly.code, "SELECTION_INELIGIBLE");
  assert.ok(implicitOnly.blockers.includes("EFFORT_BELOW_REQUIRED_FLOOR"));
  assert.equal(selectAgentConfiguration({ registry: registry(), policy: { mode: "auto", previous_effective: "previous" }, authority, budget: { cost: 5 } }).code, "RESELECTION_REASON_REQUIRED");
  assert.equal(selectAgentConfiguration({ registry: registry(), policy: { mode: "auto", previous_effective: "previous", reselection_reason: "previous provider became ineligible" }, authority, budget: { cost: 5 } }).previous_effective, "previous");
});

test("automatic model ranking remains policy constrained and effort mappings require reviewed provenance", () => {
  const multi = structuredClone(registry());
  const alternate = structuredClone(multi.entries[0]);
  alternate.manifest.identity.model_id = "gpt-5.6-luna";
  alternate.manifest.identity_key = providerIdentityKey(alternate.manifest.identity);
  alternate.manifest.selection_profile = { correctness: 99, safety: 98, efficiency: 85, roles: ["Independent Review Lead"] };
  multi.entries.push(alternate);
  multi.fingerprint = providerDigest({ entries: multi.entries.map((entry) => entry.manifest.identity_key) });
  const automatic = selectAgentConfiguration({ registry: multi, policy: { mode: "auto" }, requirements: { capabilities: ["read"], role: "Independent Review Lead" }, authority: { decision: "ALLOW" }, budget: { cost: 5 } });
  assert.equal(automatic.selected_model, "gpt-5.6-luna");
  const denied = selectAgentConfiguration({ registry: multi, policy: { mode: "auto", model_policy: { denied_model_prefixes: ["gpt-5.6-luna"], denied_model_ids: ["gpt-5.5"] } }, requirements: { capabilities: ["read"], role: "Independent Review Lead" }, authority: { decision: "ALLOW" }, budget: { cost: 5 } });
  assert.equal(denied.selected_model, "fixture-model");
  assert.ok(denied.selection_lineage.find((entry) => entry.identity_key === alternate.manifest.identity_key).blockers.includes("MODEL_PREFIX_DENIED"));
  const allowOnly = selectAgentConfiguration({ registry: multi, policy: { mode: "auto", model_policy: { allowed_model_ids: ["fixture-model"] } }, requirements: { capabilities: ["read"] }, authority: { decision: "ALLOW" }, budget: { cost: 5 } });
  assert.equal(allowOnly.selected_model, "fixture-model");
  const taskCannotLoosenOwner = selectAgentConfiguration({ registry: multi, policy: { mode: "auto", model_policy: { denied_model_ids: ["gpt-5.6-luna"] } }, requirements: { capabilities: ["read"], model_policy: { allowed_model_ids: ["gpt-5.6-luna", "fixture-model"] } }, authority: { decision: "ALLOW" }, budget: { cost: 5 } });
  assert.equal(taskCannotLoosenOwner.selected_model, "fixture-model");
  const disjointAllowlists = selectAgentConfiguration({ registry: multi, policy: { mode: "auto", model_policy: { allowed_model_ids: ["fixture-model"] } }, requirements: { capabilities: ["read"], model_policy: { allowed_model_ids: ["gpt-5.6-luna"] } }, authority: { decision: "ALLOW" }, budget: { cost: 5 } });
  assert.equal(disjointAllowlists.code, "SELECTION_INELIGIBLE");
  assert.ok(disjointAllowlists.blockers.includes("MODEL_NOT_ALLOWLISTED"));
  const nullOwnerPolicy = selectAgentConfiguration({ registry: multi, policy: { mode: "auto", model_policy: null }, requirements: { capabilities: ["read"] }, authority: { decision: "ALLOW" }, budget: { cost: 5 } });
  assert.ok(nullOwnerPolicy.blockers.includes("MODEL_POLICY_INVALID"));
  const malformedPolicy = selectAgentConfiguration({ registry: multi, policy: { mode: "auto", model_policy: { denied_model_ids: "gpt-5.5" } }, requirements: { capabilities: ["read"] }, authority: { decision: "ALLOW" }, budget: { cost: 5 } });
  assert.equal(malformedPolicy.code, "SELECTION_INELIGIBLE");
  assert.ok(malformedPolicy.blockers.includes("MODEL_POLICY_INVALID"));
  const unknownPolicyField = selectAgentConfiguration({ registry: multi, policy: { mode: "auto", model_policy: { preferred_model_ids: ["fixture-model"] } }, requirements: { capabilities: ["read"] }, authority: { decision: "ALLOW" }, budget: { cost: 5 } });
  assert.ok(unknownPolicyField.blockers.includes("MODEL_POLICY_INVALID"));
  const missingBound = structuredClone(registry());
  delete missingBound.entries[0].manifest.resource_bounds.cost;
  const missingBoundResult = selectAgentConfiguration({ registry: missingBound, policy: { mode: "auto" }, requirements: { capabilities: ["read"] }, authority: { decision: "ALLOW" }, budget: { cost: 5 } });
  assert.ok(missingBoundResult.blockers.includes("RESOURCE_BOUND_MISSING:cost"));
  const underestimated = structuredClone(registry());
  underestimated.entries[0].manifest.estimated_cost = 6;
  const underestimatedResult = selectAgentConfiguration({ registry: underestimated, policy: { mode: "auto" }, requirements: { capabilities: ["read"] }, authority: { decision: "ALLOW" }, budget: { cost: 5 } });
  assert.ok(underestimatedResult.blockers.includes("BUDGET_ESTIMATED_COST_EXCEEDED"));
  const noProvenance = structuredClone(manifest);
  delete noProvenance.reasoning_mapping_provenance;
  assert.throws(() => buildCliLaunchPlan({ manifest: noProvenance, promptFile: "/tmp/prompt", responseFile: "/tmp/response", modelId: "fixture-model", nativeReasoning: "high", sandbox: "read-only", workingDirectory: "/tmp" }), /PROVIDER_EFFORT_MAPPING_PROVENANCE_REQUIRED/);
  assert.throws(() => buildCliLaunchPlan({ manifest: { ...manifest, reasoning_mapping_provenance: { ...manifest.reasoning_mapping_provenance, proof_fingerprint: "self-asserted" } }, promptFile: "/tmp/prompt", responseFile: "/tmp/response", modelId: "fixture-model", nativeReasoning: "high", sandbox: "read-only", workingDirectory: "/tmp" }), /PROVIDER_EFFORT_MAPPING_PROVENANCE_REQUIRED/);
  assert.throws(() => loadProviderRegistry({ manifests: [{ ...manifest, resource_bounds: { cost: Number.NaN } }], certifications: [], platform: "linux-x64" }), /PROVIDER_RESOURCE_BOUNDS_INVALID/);
  assert.throws(() => loadProviderRegistry({ manifests: [{ ...manifest, resource_bounds: {} }], certifications: [], platform: "linux-x64" }), /PROVIDER_RESOURCE_BOUNDS_INVALID/);
  assert.throws(() => loadProviderRegistry({ manifests: [{ ...manifest, estimated_cost: Number.POSITIVE_INFINITY }], certifications: [], platform: "linux-x64" }), /PROVIDER_ESTIMATED_COST_INVALID/);
  const missingResourceBounds = structuredClone(manifest);
  delete missingResourceBounds.resource_bounds;
  assert.throws(() => loadProviderRegistry({ manifests: [missingResourceBounds], certifications: [], platform: "linux-x64" }), /PROVIDER_RESOURCE_BOUNDS_REQUIRED/);
  const missingEstimatedCost = structuredClone(manifest);
  delete missingEstimatedCost.estimated_cost;
  assert.throws(() => loadProviderRegistry({ manifests: [missingEstimatedCost], certifications: [], platform: "linux-x64" }), /PROVIDER_ESTIMATED_COST_REQUIRED/);
  const noCostBudget = selectAgentConfiguration({ registry: registry(), policy: { mode: "auto" }, requirements: { capabilities: ["read"] }, authority: { decision: "ALLOW" }, budget: {} });
  assert.ok(noCostBudget.blockers.includes("BUDGET_COST_REQUIRED"));
});

test("Inherit selects the nearest present source and never skips an invalid one", () => {
  const authority = { decision: "ALLOW" };
  const blocked = selectAgentConfiguration({ registry: registry(), policy: { mode: "inherit" }, inheritanceChain: [{ scope: "agent", valid: false, identity_key: identityKey }, { scope: "global", valid: true, identity_key: identityKey }], authority });
  assert.equal(blocked.code, "NEAREST_INHERITED_SOURCE_INVALID");
  const selected = selectAgentConfiguration({ registry: registry(), policy: { mode: "inherit" }, inheritanceChain: [{ scope: "role", valid: true, identity_key: identityKey }, { scope: "global", valid: true, identity_key: "other" }], authority, budget: { cost: 5 } });
  assert.equal(selected.selected, identityKey);
});

test("launch intent keeps actual absent until a verified observation admits the run", () => {
  const grant = { fingerprint: "grant", sandbox: { mode: "read_only", network: false, writable_paths: [] }, capabilities: ["read", "structured_output"], allowed_actions: ["read"], allowed_tools: ["rg"], budget: { max_runtime_ms: 100, max_tokens: 100, max_cost: 1, max_retries: 1 } };
  const selection = selectAgentConfiguration({ registry: registry(), policy: { mode: "manual", identity_key: identityKey }, authority: { decision: "ALLOW" }, budget: { cost: 5 } });
  const intent = createLaunchIntent({ grant, selection, context: { fingerprint: "context" }, reservation: { reservation_id: "reservation" }, targets: ["repo"], authorityEpoch: 0, intentId: "intent", createdAt: "2029-01-01T00:00:00.000Z" });
  assert.equal(intent.actual_observed, null);
  assert.equal(simulateAgentStart({ intent }).process_spawned, false);
  assert.throws(() => simulateAgentStart({ intent, observedConfiguration: identity }), /SIMULATION_CANNOT_ACCEPT_ACTUAL_OBSERVATION/);
  const actualObserved = runtimeObservation();
  const proof = { verified: true, independent: true, verified_by: "independent-fixture", fingerprint: providerDigest(actualObserved), evidence_strength: "direct" };
  const verifier = { independent: true, verifier_id: "independent-fixture", verify: () => ({ actual_observed: actualObserved, observation_proof: proof }) };
  assert.throws(() => admitAgentRun({ intent, grant, actualObserved, observationProof: proof, admittedAt: "2029-01-01T00:00:01.000Z" }), /INDEPENDENT_AGENT_OBSERVATION_VERIFIER_REQUIRED/);
  const admitted = admitAgentRun({ intent, grant, actualObserved, observationProof: proof, verifier, admittedAt: "2029-01-01T00:00:01.000Z" });
  assert.equal(admitted.decision, "PASS");
  assert.match(admitted.attestation.observation_proof_fingerprint, /^[a-f0-9]{64}$/);
  const wrongEffort = runtimeObservation({ native_reasoning: "medium", normalized_effort: "balanced" });
  const wrongEffortProof = { ...proof, fingerprint: providerDigest(wrongEffort) };
  const wrongEffortVerifier = { ...verifier, verify: () => ({ actual_observed: wrongEffort, observation_proof: wrongEffortProof }) };
  assert.equal(admitAgentRun({ intent, grant, actualObserved: wrongEffort, observationProof: wrongEffortProof, verifier: wrongEffortVerifier, admittedAt: "2029-01-01T00:00:01.000Z" }).code, "ACTUAL_MODEL_OR_EFFORT_MISMATCH");
  assert.equal(admitAgentRun({ intent, grant, actualObserved: { ...actualObserved, placeholder: true }, observationProof: proof, verifier }).code, "INDEPENDENT_OBSERVATION_MISMATCH");
  const wrongTarget = runtimeObservation({ targets: ["other"] });
  const wrongTargetProof = { ...proof, fingerprint: providerDigest(wrongTarget) };
  const wrongTargetVerifier = { ...verifier, verify: () => ({ actual_observed: wrongTarget, observation_proof: wrongTargetProof }) };
  assert.equal(admitAgentRun({ intent, grant, actualObserved: wrongTarget, observationProof: wrongTargetProof, verifier: wrongTargetVerifier, admittedAt: "2029-01-01T00:00:01.000Z" }).code, "ACTUAL_TARGETS_MISMATCH");
  assert.throws(() => admitAgentRun({ intent, grant, actualObserved: runtimeObservation({ process_identity: null }), observationProof: proof, verifier: { ...verifier, verify: () => ({ actual_observed: runtimeObservation({ process_identity: null }), observation_proof: proof }) }, admittedAt: "2029-01-01T00:00:01.000Z" }), /ACTUAL_PROCESS_IDENTITY_REQUIRED/);

  for (const [observed, code] of [
    [runtimeObservation({ sandbox: { mode: "danger_full_access", network: true, writable_paths: ["/"] } }), "ACTUAL_SANDBOX_EXCEEDS_GRANT"],
    [runtimeObservation({ capabilities: ["read", "structured_output", "write"] }), "ACTUAL_CAPABILITIES_EXCEED_GRANT"],
    [runtimeObservation({ actions: ["read", "write"] }), "ACTUAL_ACTIONS_EXCEED_GRANT"],
    [runtimeObservation({ tools: ["rg", "shell"] }), "ACTUAL_TOOLS_EXCEED_GRANT"],
    [runtimeObservation({ resource_limits: { max_runtime_ms: 101, max_tokens: 100, max_cost: 1, max_retries: 1 } }), "ACTUAL_RESOURCE_LIMIT_EXCEEDS_GRANT:max_runtime_ms"]
  ]) {
    const observedProof = { ...proof, fingerprint: providerDigest(observed) };
    const observedVerifier = { ...verifier, verify: () => ({ actual_observed: observed, observation_proof: observedProof }) };
    assert.equal(admitAgentRun({ intent, grant, actualObserved: observed, observationProof: observedProof, verifier: observedVerifier, admittedAt: "2029-01-01T00:00:01.000Z" }).code, code);
  }
});

test("endpoint validation rejects private destinations without an exact local policy", () => {
  const endpoint = { url: "https://provider.example/v1", certificate_policy: "system" };
  assert.throws(() => validateEndpointObservation(endpoint, { hops: [{ url: endpoint.url, addresses: ["127.0.0.1"], tls_peer_verified: true, sni: "provider.example", certificate_policy: "system" }] }), /ENDPOINT_DESTINATION_FORBIDDEN/);
  assert.equal(validateEndpointObservation(endpoint, { hops: [{ url: endpoint.url, addresses: ["93.184.216.34"], tls_peer_verified: true, sni: "provider.example", certificate_policy: "system" }] }).valid, true);
  assert.throws(() => validateEndpointObservation(endpoint, { hops: [{ url: endpoint.url, addresses: ["::ffff:127.0.0.1"], tls_peer_verified: true, sni: "provider.example", certificate_policy: "system" }] }), /ENDPOINT_DESTINATION_FORBIDDEN:loopback/);
  assert.throws(() => validateEndpointObservation(endpoint, { hops: [{ url: endpoint.url, addresses: ["::ffff:a9fe:a9fe"], tls_peer_verified: true, sni: "provider.example", certificate_policy: "system" }] }), /ENDPOINT_DESTINATION_FORBIDDEN:metadata/);
  for (const address of ["::", "ff02::1", "2001:db8::1", "203.0.113.10", "0.0.0.0", "224.0.0.1"]) {
    assert.throws(() => validateEndpointObservation(endpoint, { hops: [{ url: endpoint.url, addresses: [address], tls_peer_verified: true, sni: "provider.example", certificate_policy: "system" }] }), /ENDPOINT_DESTINATION_FORBIDDEN/);
  }
});

test("endpoint observations are bound to the configured URL and continuous allowlisted redirects", () => {
  const endpoint = { url: "https://provider.example/v1", certificate_policy: "system", allowed_redirect_origins: ["https://edge.example"] };
  const tls = (url, addresses, extra = {}) => ({ url, addresses, tls_peer_verified: true, sni: new URL(url).hostname, certificate_policy: "system", ...extra });
  assert.throws(() => validateEndpointObservation(endpoint, { hops: [tls("https://attacker.example/v1", ["93.184.216.34"])] }), /ENDPOINT_INITIAL_URL_MISMATCH/);
  assert.throws(() => validateEndpointObservation(endpoint, { hops: [tls(endpoint.url, ["93.184.216.34"]), tls("https://edge.example/final", ["1.1.1.1"])] }), /ENDPOINT_REDIRECT_CONTINUITY_REQUIRED/);
  assert.throws(() => validateEndpointObservation(endpoint, { hops: [tls(endpoint.url, ["93.184.216.34"], { redirect_to: "https://attacker.example/final" }), tls("https://attacker.example/final", ["1.1.1.1"])] }), /ENDPOINT_REDIRECT_NOT_ALLOWLISTED/);
  assert.throws(() => validateEndpointObservation(endpoint, { hops: [tls(endpoint.url, ["93.184.216.34"], { redirect_to: "https://edge.example/unobserved" })] }), /ENDPOINT_REDIRECT_CHAIN_INCOMPLETE/);
  const valid = validateEndpointObservation(endpoint, { final_url: "https://edge.example/final", hops: [tls(endpoint.url, ["93.184.216.34"], { redirect_to: "https://edge.example/final" }), tls("https://edge.example/final", ["1.1.1.1"], { redirected_from: endpoint.url })] });
  assert.equal(valid.observed_hops, 2);
});

test("proxy and tunnel connection legs require exact allowlisting, addresses, continuity, and TLS identity", () => {
  const endpoint = { url: "https://provider.example/v1", certificate_policy: "system", connection_path_policy: "observed", allowed_intermediary_origins: ["https://proxy.example"] };
  const finalHop = { url: endpoint.url, addresses: ["93.184.216.34"], tls_peer_verified: true, sni: "provider.example", certificate_policy: "system" };
  const proxy = { kind: "proxy", destination_origin: "https://proxy.example", addresses: ["1.1.1.1"], tls_peer_verified: true, sni: "proxy.example", certificate_policy: "system" };
  const destination = { kind: "tunnel", source_origin: "https://proxy.example", destination_origin: "https://provider.example", addresses: ["93.184.216.34"], tls_peer_verified: true, sni: "provider.example", certificate_policy: "system" };
  assert.equal(validateEndpointObservation(endpoint, { connection_path: [proxy, destination], hops: [finalHop] }).valid, true);
  assert.throws(() => validateEndpointObservation(endpoint, { connection_path: [{ ...proxy, addresses: undefined }, destination], hops: [finalHop] }), /CONNECTION_PATH_ADDRESSES_REQUIRED/);
  assert.throws(() => validateEndpointObservation(endpoint, { connection_path: [{ ...proxy, tls_peer_verified: false }, destination], hops: [finalHop] }), /CONNECTION_PATH_TLS_MISMATCH/);
  assert.throws(() => validateEndpointObservation(endpoint, { connection_path: [proxy, { ...destination, source_origin: "https://other.example" }], hops: [finalHop] }), /CONNECTION_PATH_CONTINUITY_MISMATCH/);
});

test("custom providers remain ineligible without a trusted fresh executable observation bound to certification", () => {
  const root = mkdtempSync(path.join(tmpdir(), "next-provider-observation-"));
  temporaryRoots.push(root);
  const executable = path.join(root, "fixture-cli");
  writeFileSync(executable, "#!/bin/sh\nexit 0\n", { mode: 0o700 });
  chmodSync(executable, 0o700);
  const customIdentity = { ...identity, execution_provider_id: "custom-provider", adapter_id: "custom-cli" };
  const customKey = providerIdentityKey(customIdentity);
  const customManifest = {
    ...manifest,
    manifest_id: "custom-fixture",
    custom: true,
    identity: customIdentity,
    transport_descriptor: { argv_template: codexArgvTemplate, argv_schema: codexArgvSchema, environment_allowlist: [], private_response_file: true, executable: { canonical_path: executable, digest: providerDigest(Buffer.from("#!/bin/sh\nexit 0\n")) }, execution_policy: { allowed_owner_uids: [process.getuid()], executable_mode_mask: 0o700, allowed_working_roots: [root], allowed_response_roots: [root], timeout_ms: 30000, max_prompt_bytes: 1048576, max_response_bytes: 1048576, max_stderr_bytes: 262144 } }
  };
  const customCertification = certificationWith({ identity_key: customKey, manifest_fingerprint: providerManifestFingerprint(customManifest), capability_fingerprint: providerDigest(customManifest.capabilities.slice().sort()), observation_fingerprint: providerDigest("unbound") });
  const trustedCertificationVerifier = { trusted: true, verify: ({ certification: value, fingerprint }) => ({ verified: true, fingerprint, certification_id: value.certification_id, certifier_id: value.certifier_id, identity_key: value.identity_key, authority_fingerprint: value.authority_fingerprint }) };
  const unobserved = loadProviderRegistry({ manifests: [customManifest], certifications: [customCertification], certificationVerifier: trustedCertificationVerifier, platform: "linux-x64", clock: () => "2029-01-01T00:00:00.000Z" });
  assert.equal(unobserved.entries[0].eligible, false);
  assert.ok(unobserved.entries[0].blockers.includes("PROVIDER_OBSERVATION_REQUIRED"));

  const observation = { trust_class: "trusted_runtime_observation", identity_key: customKey, manifest_version: "1.0.0", observer_id: "runtime-probe", observed_at: "2028-12-31T23:59:00.000Z", fresh_until: "2029-01-01T00:05:00.000Z", executable_observation: { path: executable } };
  const trustedVerifier = { trusted: true, verify: ({ observation: value, fingerprint }) => ({ verified: true, fingerprint, observer_id: value.observer_id, identity_key: value.identity_key }) };
  const discovered = loadProviderRegistry({ manifests: [customManifest], certifications: [customCertification], observations: [observation], observationVerifier: trustedVerifier, certificationVerifier: trustedCertificationVerifier, platform: "linux-x64", clock: () => "2029-01-01T00:00:00.000Z" });
  assert.ok(discovered.entries[0].blockers.includes("CERTIFICATION_OBSERVATION_MISMATCH"));
  const boundCertification = certificationWith({ ...customCertification, observation_fingerprint: discovered.entries[0].observation.fingerprint });
  const eligible = loadProviderRegistry({ manifests: [customManifest], certifications: [boundCertification], observations: [observation], observationVerifier: trustedVerifier, certificationVerifier: trustedCertificationVerifier, platform: "linux-x64", clock: () => "2029-01-01T00:00:00.000Z" });
  assert.equal(eligible.entries[0].eligible, true);
  const stale = loadProviderRegistry({ manifests: [customManifest], certifications: [boundCertification], observations: [{ ...observation, fresh_until: "2028-12-31T23:59:59.000Z" }], observationVerifier: trustedVerifier, certificationVerifier: trustedCertificationVerifier, platform: "linux-x64", clock: () => "2029-01-01T00:00:00.000Z" });
  assert.ok(stale.entries[0].blockers.includes("PROVIDER_OBSERVATION_STALE"));
});

test("caller-supplied certifications are ineligible without trusted provenance", () => {
  const value = loadProviderRegistry({ manifests: [manifest], certifications: [certification], platform: "linux-x64", clock: () => "2029-01-01T00:00:00.000Z" });
  assert.equal(value.entries[0].eligible, false);
  assert.ok(value.entries[0].blockers.includes("CERTIFICATION_PROVENANCE_UNTRUSTED"));
});

test("secret references carry only resolver metadata and revoked references fail", () => {
  const reference = secretReference();
  assert.equal(validateSecretReference(reference, { now: "2029-01-01T00:00:00.000Z" }).valid, true);
  assert.throws(() => validateSecretReference({ ...reference, revocation_state: "revoked" }, { now: "2029-01-01T00:00:00.000Z" }), /SECRET_REFERENCE_REVOKED/);
  assert.throws(() => validateSecretReference({ ...reference, api_key: "raw" }, { now: "2029-01-01T00:00:00.000Z" }), /RAW_SECRET_REFERENCE_FORBIDDEN/);
  assert.throws(() => validateSecretReference({ ...reference, expires_at: "2028-01-01T00:00:00.000Z" }, { now: "2029-01-01T00:00:00.000Z" }), /SECRET_REFERENCE_EXPIRED/);
});

function secretReference(overrides = {}) {
  return { reference_id: "provider-session-key", namespace: "session", resolver: "host", audience: "provider", adapter_id: "fixture-api", scope: "provider-inference", issued_at: "2026-01-01T00:00:00.000Z", expires_at: "2030-01-01T00:00:00.000Z", revocation_state: "active", rotation_epoch: 2, revocation_epoch: 0, delivery_mode: "authorization_header", ...overrides };
}

function secretPolicy(overrides = {}) {
  return { allowed_namespaces: ["session"], allowed_resolvers: ["host"], allowed_audiences: ["provider"], allowed_adapter_ids: ["fixture-api"], allowed_scopes: ["provider-inference"], allowed_delivery_modes: ["authorization_header"], minimum_rotation_epoch: 2, current_revocation_epoch: 0, ...overrides };
}

function apiRequestPolicy(overrides = {}) {
  return { timeout_ms: 30000, max_attempts: 1, retry_methods: [], max_request_bytes: 1048576, max_response_bytes: 1048576, redirect_limit: 1, ...overrides };
}

test("custom API manifests require bounded schemas, methods, endpoint policy, and secret references", () => {
  const apiIdentity = { ...identity, agent_product_id: null, adapter_id: "fixture-api", transport_id: "api_request" };
  const base = {
    ...manifest,
    manifest_id: "custom-api",
    custom: true,
    identity: apiIdentity,
    transport_descriptor: {
      endpoint: { url: "https://provider.example/v1", certificate_policy: "system", connection_path_policy: "observed" },
      methods: ["POST"],
      request_schema: { type: "object" },
      response_schema: { type: "object" },
      request_policy: apiRequestPolicy(),
      response_attestation_required: true,
      secret_reference: secretReference(),
      secret_reference_policy: secretPolicy(),
    },
  };
  assert.equal(validateCustomManifest(base).valid, true);
  assert.throws(() => validateCustomManifest({ ...base, transport_descriptor: { ...base.transport_descriptor, methods: [] } }), /API_METHOD_INVALID/);
  assert.throws(() => validateCustomManifest({ ...base, transport_descriptor: { ...base.transport_descriptor, request_schema: null } }), /API_REQUEST_SCHEMA_REQUIRED/);
  assert.throws(() => validateCustomManifest({ ...base, transport_descriptor: { ...base.transport_descriptor, request_policy: { ...base.transport_descriptor.request_policy, timeout_ms: 0 } } }), /API_REQUEST_POLICY_INVALID/);
  assert.throws(() => validateCustomManifest({ ...base, transport_descriptor: { ...base.transport_descriptor, secret_reference_policy: null } }), /SECRET_REFERENCE_POLICY_INVALID/);
  assert.throws(() => validateCustomManifest({ ...base, transport_descriptor: { ...base.transport_descriptor, secret_reference: { ...base.transport_descriptor.secret_reference, audience: "other" } } }), /SECRET_REFERENCE_AUDIENCE_FORBIDDEN/);
  assert.throws(() => validateCustomManifest({ ...base, transport_descriptor: { ...base.transport_descriptor, endpoint: { url: "https://user:password@provider.example/v1", certificate_policy: "system", connection_path_policy: "observed" } } }), /ENDPOINT_USERINFO_FORBIDDEN/);
  assert.throws(() => validateCustomManifest({ ...base, transport_descriptor: { ...base.transport_descriptor, secret_reference: { ...base.transport_descriptor.secret_reference, api_key: "raw" } } }), /RAW_SECRET_IN_MANIFEST/);
});

test("provider certification lifecycle is canonical, fail-closed, and fresh-lineage bound", () => {
  const candidate = { state: "CANDIDATE", probe_lineage: "probe-1" };
  assert.equal(transitionProviderCertification({ certification: candidate, toState: "CERTIFIED" }).state, "CERTIFIED");
  assert.throws(() => transitionProviderCertification({ certification: candidate, toState: "DEGRADED" }), /CERTIFICATION_TRANSITION_FORBIDDEN/);
  assert.throws(() => transitionProviderCertification({ certification: { state: "EXPIRED", probe_lineage: "probe-1" }, toState: "CANDIDATE", freshProbeLineage: "probe-1" }), /CERTIFICATION_FRESH_PROBE_LINEAGE_REQUIRED/);
  assert.equal(transitionProviderCertification({ certification: { state: "EXPIRED", probe_lineage: "probe-1" }, toState: "CANDIDATE", freshProbeLineage: "probe-2" }).probe_lineage, "probe-2");
  assert.throws(() => transitionProviderCertification({ certification: { state: "REVOKED" }, toState: "CANDIDATE", freshProbeLineage: "probe-2" }), /CERTIFICATION_REVOKED_TERMINAL/);
});

test("CLI plans are structured argv and never shell templates", () => {
  const plan = buildCliLaunchPlan({ manifest, promptFile: "/tmp/prompt", responseFile: "/tmp/response", modelId: "fixture-model", nativeReasoning: "high", sandbox: "read-only", workingDirectory: "/tmp/work" });
  assert.equal(plan.shell, false);
  assert.deepEqual(plan.argv.slice(0, 2), ["exec", "--ephemeral"]);
  assert.equal(plan.implicit_network_authority, false);
  assert.equal(plan.requires_executable_revalidation, true);
});

test("CLI dispatch is descriptor-pinned by a fresh executable observation", () => {
  const root = mkdtempSync(path.join(tmpdir(), "next-provider-dispatch-"));
  temporaryRoots.push(root);
  const executable = path.join(root, "fixture-cli");
  writeFileSync(executable, "#!/bin/sh\nexit 0\n", { mode: 0o700 });
  const pinnedManifest = { ...manifest, transport_descriptor: { ...manifest.transport_descriptor, executable: { canonical_path: executable, digest: providerDigest(Buffer.from("#!/bin/sh\nexit 0\n")) } } };
  const plan = buildCliLaunchPlan({ manifest: pinnedManifest, promptFile: "/tmp/prompt", responseFile: "/tmp/response", modelId: "fixture-model", nativeReasoning: "high", sandbox: "read-only", workingDirectory: "/tmp/work" });
  const admission = authorizeCliLaunchPlan({ manifest: pinnedManifest, plan, executableObservation: { path: executable } });
  assert.equal(admission.descriptor_pinned, true);
  assert.throws(() => authorizeCliLaunchPlan({ manifest: pinnedManifest, plan: { ...plan, argv: [...plan.argv, "unexpected"] }, executableObservation: { path: executable } }), /CLI_LAUNCH_PLAN_FINGERPRINT_MISMATCH/);
});

test("operational CLI dispatch retains the executable descriptor through executor handoff", async () => {
  const root = mkdtempSync(path.join(tmpdir(), "next-provider-pinned-executor-"));
  temporaryRoots.push(root);
  const executable = path.join(root, "fixture-cli");
  writeFileSync(executable, "#!/bin/sh\nexit 0\n", { mode: 0o700 });
  const pinnedManifest = { ...manifest, transport_descriptor: { ...manifest.transport_descriptor, executable: { canonical_path: executable, digest: providerDigest(Buffer.from("#!/bin/sh\nexit 0\n")) } } };
  const plan = buildCliLaunchPlan({ manifest: pinnedManifest, promptFile: path.join(root, "prompt"), responseFile: path.join(root, "response"), modelId: "fixture-model", nativeReasoning: "high", sandbox: "read-only", workingDirectory: root });
  let observedDescriptor;
  const result = await dispatchCliLaunchPlan({
    manifest: pinnedManifest,
    plan,
    executableObservation: { path: executable },
    executor: { descriptor_pinned: true, execute: async (input) => { observedDescriptor = input; return { descriptor_pinned: true, plan_fingerprint: input.plan_fingerprint, exit_code: 0 }; } },
    inheritedEnvironment: {},
  });
  assert.equal(result.exit_code, 0);
  assert.equal(observedDescriptor.executable_identity.digest, pinnedManifest.transport_descriptor.executable.digest);
  assert.match(observedDescriptor.executable_path, /^\/proc\/self\/fd\/\d+$/);
});

test("the default descriptor-pinned executor fails closed when downstream fencing is unavailable", async () => {
  const root = mkdtempSync(path.join(tmpdir(), "next-provider-fence-boundary-"));
  temporaryRoots.push(root);
  chmodSync(root, 0o700);
  const executable = path.join(root, "fixture-cli");
  const prompt = path.join(root, "prompt");
  const response = path.join(root, "response");
  writeFileSync(executable, "#!/bin/sh\nexit 0\n", { mode: 0o700 });
  writeFileSync(prompt, "safe prompt\n", { mode: 0o600 });
  const pinnedManifest = { ...manifest, transport_descriptor: { ...manifest.transport_descriptor, executable: { canonical_path: executable, digest: providerDigest(readFileSync(executable)) } } };
  const plan = buildCliLaunchPlan({ manifest: pinnedManifest, promptFile: prompt, responseFile: response, modelId: "fixture-model", nativeReasoning: "high", sandbox: "read-only", workingDirectory: root });
  let spawned = false;
  const executor = createNodeDescriptorPinnedExecutor({ spawnRunner: () => { spawned = true; return { status: 0, signal: null, stderr: "" }; } });
  await assert.rejects(() => dispatchCliLaunchPlan({
    manifest: pinnedManifest,
    plan,
    executableObservation: { path: executable },
    executor,
    inheritedEnvironment: {},
    authorityFence: { authority_epoch: 3, fencing_token: "fence-token", effect_id: "effect-1", effect_key: "effect-key", guard: () => ({ current: false, authority_epoch: 4, fencing_token: "fence-token" }) }
  }), /PROTECTED_AUTHORITY_FENCED_CLI_EXECUTOR_REQUIRED/);
  assert.equal(spawned, false);
  assert.equal(existsSync(response), false);
});

test("the operational provider adapter rejects a forged boolean-only fencing executor", async () => {
  const root = mkdtempSync(path.join(tmpdir(), "next-provider-enforced-fence-"));
  temporaryRoots.push(root);
  const executable = path.join(root, "fixture-cli");
  writeFileSync(executable, "#!/bin/sh\nexit 0\n", { mode: 0o700 });
  const pinnedManifest = { ...manifest, identity_key: identityKey, transport_descriptor: { ...manifest.transport_descriptor, executable: { canonical_path: executable, digest: providerDigest(readFileSync(executable)) } } };
  const plan = buildCliLaunchPlan({ manifest: pinnedManifest, promptFile: path.join(root, "prompt"), responseFile: path.join(root, "response"), modelId: "fixture-model", nativeReasoning: "high", sandbox: "read-only", workingDirectory: root });
  let guarded;
  const executor = {
    descriptor_pinned: true,
    authority_fence_enforced: true,
    async execute(input) {
      guarded = input.authority_fence.guard(input.authority_fence);
      return { descriptor_pinned: true, plan_fingerprint: input.plan_fingerprint, exit_code: 0, fencing_enforced: guarded.current, authority_epoch: guarded.authority_epoch, fence_fingerprint: providerDigest(guarded.fencing_token) };
    }
  };
  const adapter = createOperationalProviderAdapter({
    registryProvider: () => ({ entries: [{ eligible: true, manifest: pinnedManifest }] }),
    observer: { observe: async () => ({ fingerprint: "observation", object_identity: "provider" }), reconcile: async () => ({ state: "manual_recovery_required" }) },
    cliExecutor: executor,
    dispatchFenceGuard: ({ authority_epoch: authorityEpoch, fencing_token: fencingToken }) => ({ current: true, authority_epoch: authorityEpoch, fencing_token: fencingToken })
  });
  const authorityEpoch = 3;
  const effectId = "effect-1";
  const effectKey = "effect-key";
  const decision = { fingerprint: "authority-decision" };
  const fencingToken = providerDigest({ effect_id: effectId, authority_fingerprint: decision.fingerprint, authority_epoch: authorityEpoch });
  await assert.rejects(() => adapter.dispatch({ effect: { request: { provider_execution: { identity_key: identityKey, plan, plan_fingerprint: plan.fingerprint, executable_observation: { path: executable }, inherited_environment: {} } } }, decision, effect_id: effectId, effect_key: effectKey, authority_epoch: authorityEpoch, fencing_token: fencingToken }), /PROTECTED_AUTHORITY_FENCED_CLI_EXECUTOR_REQUIRED/);
  assert.equal(guarded, undefined);
});

test("default CLI executor pins both script and interpreter and writes only a private response file", async () => {
  const root = mkdtempSync(path.join(tmpdir(), "next-provider-default-executor-"));
  temporaryRoots.push(root);
  const executable = path.join(root, "fixture-cli");
  const prompt = path.join(root, "prompt");
  const response = path.join(root, "response");
  writeFileSync(executable, "#!/bin/sh\nIFS= read -r task\n[ \"$task\" = \"safe prompt\" ] || exit 9\nprintf completed > \"$1\"\n", { mode: 0o700 });
  writeFileSync(prompt, "safe prompt\n", { mode: 0o600 });
  const interpreter = realpathSync("/bin/sh");
  const executableDescriptor = { canonical_path: executable, digest: providerDigest(readFileSync(executable)) };
  const interpreterDescriptor = { canonical_path: interpreter, digest: providerDigest(readFileSync(interpreter)), name: "sh" };
  const scriptManifest = { ...manifest, manifest_id: "script-fixture", transport_descriptor: { argv_template: ["{{response_file}}"], argv_schema: ["response_file"], environment_allowlist: [], private_response_file: true, executable: executableDescriptor, interpreter: interpreterDescriptor } };
  const plan = buildCliLaunchPlan({ manifest: scriptManifest, promptFile: prompt, responseFile: response, modelId: "fixture-model", nativeReasoning: "high", sandbox: "read-only", workingDirectory: root });
  chmodSync(root, 0o755);
  await assert.rejects(() => dispatchCliLaunchPlan({ manifest: scriptManifest, plan, executableObservation: { path: executable, interpreter_observation: { path: interpreter } }, executor: createNodeDescriptorPinnedExecutor(), inheritedEnvironment: {} }), /CLI_RESPONSE_DIRECTORY_INVALID/);
  chmodSync(root, 0o700);
  const result = await dispatchCliLaunchPlan({ manifest: scriptManifest, plan, executableObservation: { path: executable, interpreter_observation: { path: interpreter } }, executor: createNodeDescriptorPinnedExecutor(), inheritedEnvironment: {} });
  assert.equal(result.exit_code, 0);
  assert.equal(result.response_fingerprint, providerDigest("completed"));
  assert.equal(existsSync(response), false);
  assert.equal(result.interpreter_fingerprint, interpreterDescriptor.digest);
});

test("CLI response IO remains bound to the verified directory descriptor across pathname replacement", async () => {
  const base = mkdtempSync(path.join(tmpdir(), "next-provider-response-race-"));
  temporaryRoots.push(base);
  chmodSync(base, 0o700);
  const responseDirectory = path.join(base, "responses");
  const movedDirectory = path.join(base, "responses-pinned");
  mkdirSync(responseDirectory, { mode: 0o700 });
  const executable = path.join(base, "fixture-cli");
  const prompt = path.join(base, "prompt");
  const response = path.join(responseDirectory, "response");
  writeFileSync(executable, "#!/bin/sh\nexit 0\n", { mode: 0o700 });
  writeFileSync(prompt, "safe prompt\n", { mode: 0o600 });
  const pinnedManifest = { ...manifest, manifest_id: "response-race-fixture", transport_descriptor: { argv_template: ["{{response_file}}"], argv_schema: ["response_file"], environment_allowlist: [], private_response_file: true, executable: { canonical_path: executable, digest: providerDigest(readFileSync(executable)) } } };
  const plan = buildCliLaunchPlan({ manifest: pinnedManifest, promptFile: prompt, responseFile: response, modelId: "fixture-model", nativeReasoning: "high", sandbox: "read-only", workingDirectory: base });
  const executor = createNodeDescriptorPinnedExecutor({ spawnRunner: (_executablePath, argv, options) => {
    const pinnedDirectoryFd = options.stdio.at(-1);
    assert.match(argv[0], /^\/proc\/self\/fd\/4\/response$/);
    renameSync(responseDirectory, movedDirectory);
    mkdirSync(responseDirectory, { mode: 0o700 });
    writeFileSync(`/proc/self/fd/${pinnedDirectoryFd}/response`, "pinned-result", { mode: 0o600 });
    writeFileSync(response, "attacker-result", { mode: 0o600 });
    return { status: 0, signal: null, stderr: "" };
  } });
  const result = await dispatchCliLaunchPlan({ manifest: pinnedManifest, plan, executableObservation: { path: executable }, executor, inheritedEnvironment: {} });
  assert.equal(result.response_fingerprint, providerDigest("pinned-result"));
  assert.equal(readFileSync(response, "utf8"), "attacker-result");
  assert.equal(existsSync(path.join(movedDirectory, "response")), false);
});

test("API and local runtime adapters produce structured gateway-only plans", () => {
  const connectionPath = [{ kind: "direct", destination_origin: "https://provider.example", addresses: ["93.184.216.34"], tls_peer_verified: true, sni: "provider.example", certificate_policy: "system" }];
  const endpointObservation = { connection_path: connectionPath, hops: [{ url: "https://provider.example/v1", addresses: ["93.184.216.34"], tls_peer_verified: true, sni: "provider.example", certificate_policy: "system" }] };
  const apiIdentity = { ...identity, agent_product_id: null, adapter_id: "fixture-api-plan", transport_id: "api_request" };
  const apiManifest = { ...manifest, manifest_id: "api-plan", custom: true, identity: apiIdentity, transport_descriptor: { endpoint: { url: "https://provider.example/v1", certificate_policy: "system", connection_path_policy: "observed" }, methods: ["POST"], request_schema: { type: "object" }, response_schema: { type: "object" }, request_policy: apiRequestPolicy(), response_attestation_required: true, secret_reference: secretReference({ adapter_id: "fixture-api-plan" }), secret_reference_policy: secretPolicy({ allowed_adapter_ids: ["fixture-api-plan"] }) } };
  const apiPlan = buildApiRequestPlan({ manifest: apiManifest, method: "POST", requestBody: { prompt_reference: "prompt-1" }, endpointObservation, now: "2029-01-01T00:00:00.000Z" });
  assert.equal(apiPlan.requires_gateway_dispatch, true);
  assert.equal(JSON.stringify(apiPlan).includes("api_key"), false);

  const localIdentity = { ...identity, execution_provider_id: "local", model_publisher_id: "local", agent_product_id: null, adapter_id: "local-runtime", transport_id: "local_runtime" };
  const localManifest = { ...manifest, manifest_id: "local-plan", custom: true, identity: localIdentity, transport_descriptor: { endpoint: { url: "http://127.0.0.1:11434/v1", connection_path_policy: "observed", exact_destination: { origin: "http://127.0.0.1:11434", addresses: ["127.0.0.1"], service_id: "fixture-local-runtime" } }, start_stop_authority: "explicit", operations: ["generate"] } };
  const localObservation = { service_id: "fixture-local-runtime", connection_path: [{ kind: "direct", destination_origin: "http://127.0.0.1:11434", addresses: ["127.0.0.1"] }], hops: [{ url: "http://127.0.0.1:11434/v1", addresses: ["127.0.0.1"] }] };
  assert.equal(buildLocalRuntimePlan({ manifest: localManifest, operation: "generate", payload: { prompt_reference: "prompt-1" }, endpointObservation: localObservation }).requires_gateway_dispatch, true);
  assert.throws(() => buildLocalRuntimePlan({ manifest: { ...localManifest, transport_descriptor: { ...localManifest.transport_descriptor, endpoint: { url: "http://127.0.0.1:11434/v1", connection_path_policy: "observed", allowed_destination_classes: ["loopback"] } } }, operation: "generate", payload: {}, endpointObservation: localObservation }), /LOCAL_RUNTIME_EXACT_DESTINATION_REQUIRED/);
  assert.throws(() => buildLocalRuntimePlan({ manifest: localManifest, operation: "generate", payload: {}, endpointObservation: { ...localObservation, service_id: "other" } }), /LOCAL_RUNTIME_SERVICE_IDENTITY_MISMATCH/);
});

test("API execution remains fail-closed until a gateway-owned network and secret-delivery transport exists", async () => {
  const connectionPath = [{ kind: "direct", destination_origin: "https://provider.example", addresses: ["93.184.216.34"], tls_peer_verified: true, sni: "provider.example", certificate_policy: "system" }];
  const endpointObservation = { connection_path: connectionPath, hops: [{ url: "https://provider.example/v1", addresses: ["93.184.216.34"], tls_peer_verified: true, sni: "provider.example", certificate_policy: "system" }] };
  const apiIdentity = { ...identity, agent_product_id: null, adapter_id: "fixture-api", transport_id: "api_request" };
  const apiManifest = { ...manifest, manifest_id: "api-dispatch", custom: true, identity: apiIdentity, transport_descriptor: { endpoint: { url: "https://provider.example/v1", certificate_policy: "system", connection_path_policy: "observed" }, methods: ["POST"], request_schema: { type: "object" }, response_schema: { type: "object" }, request_policy: apiRequestPolicy(), response_attestation_required: true, secret_reference: secretReference(), secret_reference_policy: secretPolicy() } };
  const plan = buildApiRequestPlan({ manifest: apiManifest, method: "POST", requestBody: { prompt_reference: "prompt-1" }, endpointObservation, now: "2029-01-01T00:00:00.000Z" });
  const bytes = Buffer.from("fixture-auth-material");
  await assert.rejects(() => dispatchApiRequestPlan({
    manifest: apiManifest,
    plan,
    endpointObservation,
    endpointObservationProvider: async () => endpointObservation,
    now: "2029-01-01T00:00:00.000Z",
    secretResolver: { resolver_id: "host", authorized_adapter_ids: ["fixture-api"], resolve: async ({ reference_fingerprint: referenceFingerprint }) => ({ bytes, reference_fingerprint: referenceFingerprint, delivery_mode: "authorization_header", rotation_epoch: 2, revocation_epoch: 0 }) },
    transport: { adapter_id: "fixture-api", ephemeral_secret_delivery: true, continuous_endpoint_enforcement: true, dispatch: async ({ secret_bytes: secretBytes, plan_fingerprint: planFingerprint, endpoint_validator: endpointValidator }) => { assert.equal(secretBytes.toString(), "fixture-auth-material"); assert.equal(endpointValidator(endpointObservation).valid, true); return { plan_fingerprint: planFingerprint, secret_persisted: false, status: "passed", response_body: {} }; } },
  }), /API_OPERATIONAL_TRANSPORT_UNAVAILABLE/);
  assert.equal(bytes.toString(), "fixture-auth-material");
});

test("Codex discovery creates only direct-observation-bound eligible model entries", () => {
  const root = mkdtempSync(path.join(tmpdir(), "next-provider-discovery-"));
  temporaryRoots.push(root);
  const executable = installFixtureCodex(root, Buffer.from("fixture-native-binary"));
  const family = { family_id: "codex-openai", execution_provider_id: "openai", model_publisher_id: "openai", agent_product_id: "codex", adapter_id: "codex_cli", transport_id: "cli_process", observed_adapter_version: "1.2.3", certification_state: "CERTIFIED", model_catalog_source: "runtime_discovery", capabilities: ["read"], resource_bounds: { cost: 0 }, estimated_cost: 0, priority: 1 };
  const runner = (_executable, argv) => argv[0] === "--version"
    ? "codex-cli 1.2.3\n"
    : JSON.stringify({ models: [
      { slug: "fixture-balanced", priority: 2, visibility: "list", default_reasoning_level: "high", supported_reasoning_levels: [{ effort: "low" }, { effort: "high" }] },
      { slug: "fixture-efficient", priority: 3, visibility: "list", default_reasoning_level: "high", supported_reasoning_levels: [{ effort: "low" }, { effort: "high" }] },
      { slug: "fixture-model", priority: 1, visibility: "list", default_reasoning_level: "high", supported_reasoning_levels: [{ effort: "low" }, { effort: "high" }] },
    ] });
  const probeAuthority = {
    trusted: true,
    independent: true,
    authority_id: "fixture-isolated-probe",
    verify({ observation, probe, fingerprint }) {
      const candidate = observation ?? probe;
      return { verified: true, authority_id: this.authority_id, fingerprint, identity_key: candidate.identity_key, evidence_ref: `probe:${candidate.identity_key}` };
    }
  };
  const certificationAuthority = {
    trusted: true,
    independent: true,
    authority_id: "fixture-certification-authority",
    issue({ fingerprint }) { return { issued: true, authority_id: this.authority_id, certification_fingerprint: fingerprint, proof_fingerprint: providerDigest({ authority_id: this.authority_id, fingerprint }) }; },
    verify({ certification: value, fingerprint }) { return { verified: true, authority_id: this.authority_id, fingerprint, certification_id: value.certification_id, identity_key: value.identity_key, authority_fingerprint: value.authority_fingerprint }; }
  };
  const discovered = discoverBuiltinProviderInputs({ adapterFamilies: [family], probeAuthority, certificationAuthority, executableLocator: () => executable, runner, platform: "linux-x64", clock: () => "2029-01-01T00:00:00.000Z" });
  const runtime = loadProviderRegistry({ ...discovered, platform: "linux-x64", clock: () => "2029-01-01T00:00:00.000Z" });
  assert.equal(runtime.entries.length, 3, JSON.stringify(discovered.blockers));
  assert.equal(runtime.entries.every((entry) => entry.eligible), true);
  const recommended = selectAgentConfiguration({
    registry: runtime,
    policy: { mode: "auto" },
    requirements: { capabilities: ["read"], normalized_effort: "high", role: "Implementation Lead", rigor: "L3", risk: "normal", complexity: "normal", objective: "correctness" },
    authority: { decision: "ALLOW", rigor: "L3" },
    budget: { cost: 0 },
  });
  assert.equal(recommended.decision, "PASS");
  assert.equal(recommended.selected_model, "fixture-model");
  assert.equal(recommended.manifest.recommendation_rank, 1);
  assert.deepEqual(recommended.manifest.native_reasoning_values, ["high", "low"]);
  const balanced = selectAgentConfiguration({
    registry: runtime,
    policy: { mode: "auto" },
    requirements: { capabilities: ["read"], normalized_effort: "high", role: "Implementation Lead", rigor: "L3", risk: "normal", complexity: "normal" },
    authority: { decision: "ALLOW", rigor: "L3" },
    budget: { cost: 0 },
  });
  assert.equal(balanced.selected_model, "fixture-balanced");
  assert.equal(balanced.objective, "balanced");
  const efficient = selectAgentConfiguration({
    registry: runtime,
    policy: { mode: "auto" },
    requirements: { capabilities: ["read"], normalized_effort: "low", role: "Implementation Lead", rigor: "L1", risk: "low", complexity: "low" },
    authority: { decision: "ALLOW", rigor: "L1" },
    budget: { cost: 0 },
  });
  assert.equal(efficient.selected_model, "fixture-efficient");
  assert.equal(efficient.objective, "efficiency");
  const blocked = discoverBuiltinProviderInputs({ adapterFamilies: [family], executableLocator: () => executable, runner, platform: "linux-x64", clock: () => "2029-01-01T00:00:00.000Z" });
  assert.equal(blocked.entries?.length ?? blocked.manifests.length, 0);
  assert.equal(blocked.blockers[0].code, "PROVIDER_PROBE_AUTHORITY_REQUIRED");
});

test("Production discovery refuses an untrusted executable before invoking it", () => {
  const root = mkdtempSync(path.join(tmpdir(), "next-provider-preflight-"));
  temporaryRoots.push(root);
  const executable = installFixtureCodex(root, Buffer.from("substituted-native-binary"));
  const family = { family_id: "codex-openai", execution_provider_id: "openai", model_publisher_id: "openai", agent_product_id: "codex", adapter_id: "codex_cli", transport_id: "cli_process", observed_adapter_version: "1.2.3", certification_state: "CERTIFIED", model_catalog_source: "runtime_discovery", capabilities: ["read"], resource_bounds: { cost: 0 }, estimated_cost: 0, priority: 1 };
  let invoked = false;
  const probeAuthority = {
    trusted: true,
    independent: true,
    authority_id: "fixture-isolated-probe",
    verify({ fingerprint }) {
      return { verified: false, authority_id: this.authority_id, fingerprint };
    },
  };
  const certificationAuthority = {
    trusted: true,
    independent: true,
    authority_id: "fixture-certification-authority",
    issue() { throw new Error("must not issue"); },
    verify() { return false; },
  };
  const discovered = discoverBuiltinProviderInputs({
    adapterFamilies: [family],
    probeAuthority,
    certificationAuthority,
    executableLocator: () => executable,
    runner: () => {
      invoked = true;
      throw new Error("must not execute");
    },
    platform: "linux-x64",
    clock: () => "2029-01-01T00:00:00.000Z",
  });
  assert.equal(invoked, false);
  assert.equal(discovered.manifests.length, 0);
  assert.equal(discovered.blockers[0].code, "PROVIDER_EXECUTABLE_NOT_AUTHORIZED_BEFORE_PROBE");
});

test("selection dry-run is non-authorizing and revision bound", () => {
  const dryRun = createSelectionDryRun({ change: { mode: "auto" }, baseRevision: 3, before: {}, after: {}, affectedAgents: ["b", "a"], authorityDelta: {}, capabilityDelta: {}, costDelta: {}, networkDelta: {}, expiresAt: "2030-01-01T00:00:00.000Z" });
  assert.equal(dryRun.grants_authority, false);
  assert.deepEqual(dryRun.affected_agents, ["a", "b"]);
});
