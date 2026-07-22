#!/usr/bin/env node
import assert from "node:assert/strict";
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { classifyRepositoryIdentityTransition, compareShadowRuns, compatibilityDigest, composeParentManagementPolicy, LEGACY_LIFECYCLE_ALIASES, loadCompatibilityProfileFixtures, mapLegacyLifecycle, migrateLegacyRecord, resolveLegacyInstructionCompatibility, resolveRuntimeAuthorityInputs, validateManagedChildCompatibility } from "./lib/next_workflow/compatibility.mjs";

const repositoryRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const temporaryRoots = [];
test.after(() => temporaryRoots.forEach((root) => rmSync(root, { recursive: true, force: true })));

function trustedVerifier() {
  return {
    trusted: true,
    trust_root_id: "fixture-trust-root",
    verify: (payload) => ({ verified: true, trust_root_id: "fixture-trust-root", payload_fingerprint: compatibilityDigest(payload), signer_id: "fixture-signer", key_id: "fixture-key", relationship_id: payload.relationship.relationship_id, authority_epoch: payload.relationship.authority_epoch, fresh_until: "2030-01-01T00:00:00.000Z" })
  };
}

test("legacy A-F aliases map to descriptive lifecycle stages without normal-display leakage", () => {
  assert.deepEqual(Object.keys(LEGACY_LIFECYCLE_ALIASES), ["E", "F", "A", "B", "C", "D"]);
  for (const alias of Object.keys(LEGACY_LIFECYCLE_ALIASES)) {
    const mapped = mapLegacyLifecycle(alias);
    assert.equal(mapped.lifecycle_stage, LEGACY_LIFECYCLE_ALIASES[alias]);
    assert.equal(mapped.normal_display_uses_alias, false);
  }
  assert.throws(() => mapLegacyLifecycle("UNKNOWN"), /LEGACY_LIFECYCLE_UNKNOWN/);
});

test("valid local instruction wins, exact absence falls back, and invalid local blocks", () => {
  assert.equal(resolveLegacyInstructionCompatibility({ localState: "valid", version: "1.0.0", obligations: [], parsedObligations: [] }).source, "child_local");
  assert.equal(resolveLegacyInstructionCompatibility({ localState: "missing" }).source, "parent_fallback");
  assert.equal(resolveLegacyInstructionCompatibility({ localState: "invalid", obligations: [{ obligation_id: "workflow.approval", enforcement: "required" }] }).decision, "BLOCK");
});

test("FrameCue and TraceCue-style stronger legacy obligations are never silently downgraded", () => {
  const obligations = [{ obligation_id: "workflow.independent-review", enforcement: "required" }, { obligation_id: "workflow.developer-approval", enforcement: "required" }];
  const versionless = resolveLegacyInstructionCompatibility({ localState: "valid", version: "versionless", obligations, parsedObligations: ["workflow.independent-review"] });
  assert.equal(versionless.decision, "BLOCK");
  assert.deepEqual(versionless.preserved_obligations, obligations);
  const unsupported = resolveLegacyInstructionCompatibility({ localState: "valid", version: "2.0.0", obligations, parsedObligations: obligations });
  assert.equal(unsupported.decision, "BLOCK");
  assert.equal(unsupported.reason, "UNKNOWN_PROFILE_VERSION");
  const unknownObligation = resolveLegacyInstructionCompatibility({ localState: "valid", version: "1.0.0", obligations, parsedObligations: ["workflow.independent-review"] });
  assert.equal(unknownObligation.reason, "UNKNOWN_OBLIGATION_ID");
});

test("parent, TraceCue, and FrameCue compatibility profiles are frozen isolated fixtures with machine obligation IDs", () => {
  const fixtures = loadCompatibilityProfileFixtures({ repositoryRoot });
  assert.equal(Object.isFrozen(fixtures), true);
  assert.deepEqual(fixtures.profiles.map((profile) => profile.repository_fixture_id).sort(), ["frame-cue", "parent", "trace-cue"]);
  for (const profile of fixtures.profiles) {
    assert.equal(Object.isFrozen(profile), true);
    for (const obligation of profile.obligations) assert.match(obligation.obligation_id, /^[a-z][a-z0-9]*(?:[._-][a-z0-9]+)+$/);
  }
});

test("managed children require exactly one active parent and relationship-bound structured inherited duties", () => {
  const fixture = loadCompatibilityProfileFixtures({ repositoryRoot }).profiles.find((profile) => profile.repository_fixture_id === "frame-cue");
  const verifier = trustedVerifier();
  const input = { managedChild: true, relationships: fixture.relationships, inheritedDuties: fixture.inherited_duties, parentManagementPolicies: fixture.parent_management_policies, relationshipVerifier: verifier, managementPolicyVerifier: verifier, now: "2029-01-01T00:00:00.000Z" };
  assert.equal(validateManagedChildCompatibility(input).decision, "PASS");
  assert.equal(validateManagedChildCompatibility({ ...input, relationships: [...fixture.relationships, { ...fixture.relationships[0], relationship_id: "fixture.relationship.other.v1" }] }).reason, "ACTIVE_PARENT_CARDINALITY_INVALID");
  assert.equal(validateManagedChildCompatibility({ ...input, inheritedDuties: [{ id: "free text", input: {}, owner: "parent" }] }).reason, "INHERITED_DUTY_INVALID");
  assert.equal(validateManagedChildCompatibility({ ...input, relationships: [{ ...fixture.relationships[0], lease: { state: "active", expires_at: "2020-01-01T00:00:00.000Z" } }] }).reason, "PARENT_RELATIONSHIP_STALE_EXPIRED_OR_REVOKED");
  assert.equal(validateManagedChildCompatibility({ ...input, relationshipVerifier: null }).reason, "PARENT_RELATIONSHIP_ATTESTATION_INVALID");
  assert.equal(validateManagedChildCompatibility({ ...input, relationshipVerifier: { trusted: true, verify: () => true } }).reason, "PARENT_RELATIONSHIP_ATTESTATION_INVALID");
  assert.equal(validateManagedChildCompatibility({ ...input, relationshipVerifier: { ...trustedVerifier(), verify: (payload) => ({ ...trustedVerifier().verify(payload), relationship_id: "other" }) } }).reason, "PARENT_RELATIONSHIP_ATTESTATION_INVALID");
});

test("parent management policy is recomputed with maximum, intersection, additive, and minimum-ceiling operators", () => {
  const fixture = loadCompatibilityProfileFixtures({ repositoryRoot }).profiles.find((profile) => profile.repository_fixture_id === "frame-cue");
  const relationship = fixture.relationships[0];
  const base = fixture.parent_management_policies[0];
  const inputs = [
    { ...base, policy_id: "component-one", policy_fingerprint: "component-one", actions: ["*"], targets: ["*"], required_approvals: ["git_push_operation_approval"], duties: [{ id: "policy.review", input: { kind: "review" }, owner: "parent.policy" }], resource_ceilings: { max_cost: 100, max_runtime_ms: 1000 }, rigor_floor: "L3" },
    { ...base, policy_id: "component-two", policy_fingerprint: "component-two", actions: ["merge", "push"], targets: ["child-target"], required_approvals: ["git_merge_operation_approval"], duties: [{ id: "policy.security", input: { kind: "security" }, owner: "parent.policy" }], resource_ceilings: { max_cost: 50 }, rigor_floor: "L4" }
  ];
  const composed = composeParentManagementPolicy({ relationship, policyInputs: inputs });
  assert.deepEqual(composed.actions, ["merge", "push"]);
  assert.deepEqual(composed.targets, ["child-target"]);
  assert.equal(composed.rigor_floor, "L4");
  assert.equal(composed.resource_ceilings.max_cost, 50);
  const claimed = { ...base, ...composed };
  const verifier = trustedVerifier();
  const validated = validateManagedChildCompatibility({ managedChild: true, relationships: fixture.relationships, inheritedDuties: fixture.inherited_duties, parentManagementPolicies: [claimed], parentManagementPolicyInputs: inputs, relationshipVerifier: verifier, managementPolicyVerifier: verifier, now: "2029-01-01T00:00:00.000Z" });
  assert.equal(validated.decision, "PASS");
  assert.equal(validated.management_policy.composition_fingerprint, composed.composition_fingerprint);
  assert.equal(validateManagedChildCompatibility({ managedChild: true, relationships: fixture.relationships, inheritedDuties: fixture.inherited_duties, parentManagementPolicies: [{ ...claimed, rigor_floor: "L2" }], parentManagementPolicyInputs: inputs, relationshipVerifier: verifier, managementPolicyVerifier: verifier, now: "2029-01-01T00:00:00.000Z" }).reason, "PARENT_MANAGEMENT_CLAIM_MISMATCH");
});

test("rename, move, reclone, and fork retain distinct stable-identity semantics", () => {
  const base = { repository_logical_id: "repo", checkout_instance_id: "checkout-a", remote_identity_fingerprint: "remote-a", canonical_location: "one" };
  assert.equal(classifyRepositoryIdentityTransition({ before: base, after: { ...base, canonical_location: "two" } }).transition, "rename_or_move");
  assert.equal(classifyRepositoryIdentityTransition({ before: base, after: { ...base, checkout_instance_id: "checkout-b" } }).transition, "reclone");
  assert.equal(classifyRepositoryIdentityTransition({ before: base, after: { ...base, remote_identity_fingerprint: "remote-b" } }).transition, "fork");
});

test("legacy migration is additive and unknown records remain manual", () => {
  const migrated = migrateLegacyRecord({ stage: "C", revision: 4, execution_phase: "fast_loop" });
  assert.equal(migrated.status, "migrated");
  assert.equal(migrated.record.additive, true);
  assert.equal(migrateLegacyRecord({ stage: "unknown" }).status, "manual_required");
});

test("shadow comparison accepts speed measurement only after correctness passes", () => {
  const legacy = { checks: [{ id: "tests", required: true }], authority_decisions: ["PASS"], trace_ids: ["requirement", "test"], result: { status: "passed" } };
  const candidate = { checks: [{ id: "tests", executed: true }], authority_decisions: ["PASS"], trace_ids: ["requirement", "test"], result: { status: "passed" }, regressions: [] };
  const passed = compareShadowRuns({ legacy, candidate, requiredChecks: ["tests"] });
  assert.equal(passed.accepted, true);
  assert.equal(passed.speed_eligible_for_evaluation, true);
  const failed = compareShadowRuns({ legacy, candidate: { ...candidate, checks: [] }, requiredChecks: ["tests"] });
  assert.equal(failed.accepted, false);
  assert.equal(failed.speed_eligible_for_evaluation, false);
});

function copyFixtureFile(fromRoot, toRoot, relativePath) {
  const target = path.join(toRoot, relativePath);
  mkdirSync(path.dirname(target), { recursive: true });
  cpSync(path.join(fromRoot, relativePath), target);
}

function developmentInstructionFixture() {
  const parent = mkdtempSync(path.join(tmpdir(), "next-instruction-parent-"));
  const child = mkdtempSync(path.join(tmpdir(), "next-instruction-child-"));
  temporaryRoots.push(parent, child);
  for (const relativePath of [
    "docs/workflow/DEVELOPMENT_INSTRUCTION_POLICY.tsv",
    "docs/workflow/REPOSITORY_DEVELOPMENT_WORKFLOW.tsv",
    "docs/workflow/DEVELOPMENT_AUTONOMY_WORKFLOW.tsv",
    "docs/workflow/MENU_PRODUCT_PROFILE_POLICY.tsv",
    "docs/workflow/GIT_WORKFLOW_POLICY.tsv",
    "docs/workflow/PRODUCT_WORKFLOW_GIT_USAGE_POLICY.tsv",
    "docs/workflow/INSTRUCTION_MEMORY.md",
    "learning/context/WORKFLOW_CONTEXT_MAP.tsv",
    "learning/GIT_WORKFLOW_SETTINGS.tsv",
    "learning/PRODUCT_WORKFLOW_GIT_USAGE_SETTINGS.tsv"
  ]) copyFixtureFile(repositoryRoot, parent, relativePath);
  mkdirSync(path.join(parent, "learning"), { recursive: true });
  writeFileSync(path.join(parent, "learning/PRODUCT_REPOSITORY_REGISTRY.tsv"), `fixture-child\tfree-development\tfree-development\tFixture Child\t${child}\tcli\ttest\n`);
  writeFileSync(path.join(parent, "learning/PRODUCT_REPOSITORY_SELECTION.tsv"), "free-development\tfixture-child\t2029-01-01T00:00:00Z\ttest\n");
  writeFileSync(path.join(child, "AGENTS.MD"), "# Fixture child invariants\n");
  mkdirSync(path.join(child, "ops"), { recursive: true });
  writeFileSync(path.join(child, "ops/PRODUCT_OPERATION_MODE.tsv"), "workflow_mode\tparent_managed\nmanaged_by_parent\ttrue\n");
  return { parent, child };
}

test("runtime authority inputs use the repository safe resolver for local-first, exact-absence fallback, and invalid-local blocking", () => {
  const { parent, child } = developmentInstructionFixture();
  const resolverInput = { contextId: "free-development", repo: child, gitTopLevelResolver: (target) => target };
  const childProfile = loadCompatibilityProfileFixtures({ repositoryRoot }).profiles.find((profile) => profile.repository_fixture_id === "trace-cue");
  const relationship = childProfile.relationships[0];
  const verifier = trustedVerifier();
  const base = { repositoryRoot: parent, resolverInput, bindings: { task_id: "task", repository_logical_id: relationship.repository_logical_id, checkout_instance_id: relationship.checkout_instance_id }, relationships: childProfile.relationships, inheritedDuties: childProfile.inherited_duties, parentManagementPolicies: childProfile.parent_management_policies, relationshipVerifier: verifier, managementPolicyVerifier: verifier, now: "2029-01-01T00:00:00.000Z", instructionFreshUntil: "2030-01-01T00:00:00.000Z", instructionActions: ["push"], instructionTargets: ["child-target"] };
  const fallback = resolveRuntimeAuthorityInputs(base);
  assert.equal(fallback.instruction.source, "parent_fallback");
  assert.equal(fallback.instruction.local_state, "exactly_absent");
  assert.equal(fallback.sources.filter((source) => source.kind === "instruction").length, 1);
  assert.equal(fallback.sources.find((source) => source.kind === "instruction").rigor_floor, "L3");
  assert.ok(fallback.sources.find((source) => source.kind === "instruction").duties.some((duty) => duty.id === "instruction.procedural-contract"));
  assert.equal(fallback.sources.filter((source) => source.kind === "parent_management").length, 1);
  assert.equal(fallback.bindings.relationship_id, relationship.relationship_id);
  assert.equal(fallback.sources.find((source) => source.kind === "parent_management").rigor_floor, "L3");

  mkdirSync(path.join(child, "docs/workflow"), { recursive: true });
  const strict = readFileSync(path.join(repositoryRoot, "docs/workflow/INSTRUCTION_MEMORY.md"), "utf8");
  writeFileSync(path.join(child, "docs/workflow/INSTRUCTION_MEMORY.md"), strict);
  const local = resolveRuntimeAuthorityInputs(base);
  assert.equal(local.instruction.source, "local");
  assert.equal(local.instruction.precedence, "target_local_first");
  const localDelivery = resolveRuntimeAuthorityInputs({ ...base, resolverInput: { ...resolverInput, stage: "D", scopeId: "current-task" } });
  assert.deepEqual(localDelivery.sources.find((source) => source.kind === "instruction").required_approvals, ["git_push_operation_approval"]);

  writeFileSync(path.join(child, "docs/workflow/INSTRUCTION_MEMORY.md"), strict.replace(/^Instruction-Memory-Version:.*\n/m, ""));
  assert.throws(() => resolveRuntimeAuthorityInputs(base), /RUNTIME_INSTRUCTION_PROFILE_BLOCKED/);
  writeFileSync(path.join(child, "docs/workflow/INSTRUCTION_MEMORY.md"), "# invalid but present\n");
  assert.throws(() => resolveRuntimeAuthorityInputs(base), /Instruction memory must contain exactly one heading/);
});
