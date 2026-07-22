#!/usr/bin/env node
import assert from "node:assert/strict";
import test from "node:test";
import path from "node:path";
import {
  assessRigor,
  assertContractSet,
  canReenterStoppedDecision,
  classifyLegacyInstruction,
  compareShadowProjection,
  computeVerifiedProgress,
  evaluateCorrectionLoop,
  loadContracts,
  validateContractSet
} from "./lib/next_workflow/contracts.mjs";

const repositoryRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const loaded = await loadContracts({ repositoryRoot });

function cloneEntries() {
  return loaded.map((entry) => ({ ...entry, value: structuredClone(entry.value) }));
}

test("all seven P0 contracts validate and remain planned", () => {
  const result = assertContractSet(loaded);
  assert.equal(Object.keys(result.fingerprints).length, 7);
  const providers = loaded[2].value;
  const parentChild = loaded[3].value;
  const stateStore = loaded[5].value;
  const compatibility = loaded[6].value;
  assert.equal(providers.custom_manifest.requires_observation, true);
  assert.equal(providers.endpoint_security.configured_first_url_must_equal_observed_hop_zero, true);
  assert.equal(parentChild.instruction_resolution.resolver, "tools/lib/development_instruction.mjs");
  assert.equal(parentChild.relationship.inherited_duties.stable_machine_obligation_id_required, true);
  assert.equal(stateStore.repository_identity.origin_digest_binding_required, true);
  assert.equal(compatibility.compatibility_profiles.versionless_or_unknown, "BLOCK");
});

const mutations = [
  [0, (v) => { v.authority_baseline.unrelated_feature_tradeoffs = "allowed"; }, "TRADEOFF_NOT_FORBIDDEN"],
  [1, (v) => { v.layers[2].may_delegate_to = ["task"]; }, "TASK_DELEGATION_INVALID"],
  [2, (v) => { v.nearest_present_invalid_blocks = false; }, "INVALID_INHERITANCE_FALLTHROUGH"],
  [3, (v) => { v.relationship.active_parent_cardinality = 2; }, "PARENT_CARDINALITY_INVALID"],
  [4, (v) => { v.impact_graph.required_check_miss_tolerance = 1; }, "IMPACT_UNKNOWN_UNSAFE"],
  [5, (v) => { v.sqlite_pragmas.synchronous = "NORMAL"; }, "SQLITE_PRAGMAS_INVALID"],
  [6, (v) => { v.current_runtime_authoritative = false; }, "SHADOW_NOT_ADDITIVE"]
];

for (const [index, mutate, expectedCode] of mutations) {
  test(`contract mutation ${index + 1} fails closed with ${expectedCode}`, () => {
    const entries = cloneEntries();
    mutate(entries[index].value);
    const result = validateContractSet(entries);
    assert.equal(result.ok, false);
    assert.ok(result.issues.some((issue) => issue.code === expectedCode));
  });
}

function leafPaths(value, prefix = []) {
  if (Array.isArray(value)) return value.length === 0 ? [prefix] : value.flatMap((entry, index) => leafPaths(entry, [...prefix, index]));
  if (value && typeof value === "object") {
    const entries = Object.entries(value);
    return entries.length === 0 ? [prefix] : entries.flatMap(([key, entry]) => leafPaths(entry, [...prefix, key]));
  }
  return [prefix];
}

function mutateLeaf(root, targetPath) {
  let parent = root;
  for (const segment of targetPath.slice(0, -1)) parent = parent[segment];
  const key = targetPath.at(-1);
  const current = parent[key];
  if (Array.isArray(current)) parent[key] = ["__mutation__"];
  else if (current && typeof current === "object") parent[key] = { __mutation__: true };
  else if (typeof current === "boolean") parent[key] = !current;
  else if (typeof current === "number") parent[key] = current + 1;
  else if (typeof current === "string") parent[key] = `${current}__mutation__`;
  else parent[key] = "__mutation__";
}

test("every leaf in all seven reviewed contracts is mutation-locked", () => {
  let mutationsChecked = 0;
  for (let contractIndex = 0; contractIndex < loaded.length; contractIndex += 1) {
    for (const targetPath of leafPaths(loaded[contractIndex].value)) {
      const entries = cloneEntries();
      mutateLeaf(entries[contractIndex].value, targetPath);
      const result = validateContractSet(entries);
      assert.equal(result.ok, false, `${loaded[contractIndex].value.contract_id}:${targetPath.join(".")}`);
      mutationsChecked += 1;
    }
  }
  assert.ok(mutationsChecked >= 250, `expected at least 250 locked leaves, got ${mutationsChecked}`);
});

test("premature P0 activation is rejected", () => {
  const entries = cloneEntries();
  entries[0].value.activation_mode = "enforced";
  assert.ok(validateContractSet(entries).issues.some((issue) => issue.code === "P0_PREMATURE_ACTIVATION"));
});

test("rigor is automatic, developer minimum only raises, and hard triggers force L5", () => {
  const zeroScores = { user_impact: 0, change_scope: 0, recoverability: 0, uncertainty: 0, verification_difficulty: 0, permission_boundary_impact: 0 };
  const scoreReasons = Object.fromEntries(Object.keys(zeroScores).map((key) => [key, `objective evidence for ${key}`]));
  const low = assessRigor({ scores: zeroScores, scoreReasons });
  assert.equal(low.level, "L1");
  assert.equal(assessRigor({ scores: zeroScores, scoreReasons, developerMinimum: "L4" }).level, "L4");
  assert.equal(assessRigor({ scores: zeroScores, scoreReasons, hardTriggers: ["secrets"], hardTriggerEvidence: { secrets: "secret material is in scope" } }).level, "L5");
  assert.equal(assessRigor({ scores: { ...zeroScores, user_impact: 2 }, scoreReasons }).level, "L2");
  assert.equal(assessRigor({ scores: Object.fromEntries(Object.keys(zeroScores).map((key) => [key, 2])), scoreReasons }).level, "L5");
  assert.throws(() => assessRigor({ scores: { ...zeroScores, unexpected: 0 }, scoreReasons }), /RIGOR_SCORE_COMPONENTS_INVALID/);
  assert.throws(() => assessRigor({ scores: { ...zeroScores, user_impact: 3 }, scoreReasons }), /RIGOR_SCORE_INVALID/);
  assert.throws(() => assessRigor({ scores: zeroScores, scoreReasons, hardTriggers: ["ordinary_git_delivery"] }), /RIGOR_HARD_TRIGGER_INVALID/);
  assert.throws(() => assessRigor({ scores: zeroScores }), /RIGOR_SCORE_REASONS_REQUIRED/);
  assert.throws(() => assessRigor({ scores: zeroScores, scoreReasons, hardTriggers: ["secrets"] }), /RIGOR_HARD_TRIGGER_EVIDENCE_REQUIRED/);
});

test("correction loop stops after unchanged finite retries", () => {
  assert.deepEqual(evaluateCorrectionLoop({ decision: "REVISE", failureFingerprint: "x", previousFailureFingerprint: "x", retryCount: 3, retryLimit: 3 }), { decision: "STOP", may_retry: false, reason: "TOTAL_RETRY_LIMIT" });
  assert.deepEqual(evaluateCorrectionLoop({ decision: "REVISE", failureFingerprint: "y", previousFailureFingerprint: "x", retryCount: 99, retryLimit: 3 }), { decision: "STOP", may_retry: false, reason: "TOTAL_RETRY_LIMIT" });
});

test("immutable STOP re-entry needs changed input and a linked validator decision", () => {
  const linked = { decision: "PASS", decision_id: "validator-2", stopped_fingerprint: "a", candidate_fingerprint: "b", authority_epoch: 2 };
  assert.equal(canReenterStoppedDecision({ stoppedFingerprint: "a", candidateFingerprint: "a", linkedValidatorDecision: linked }), false);
  assert.equal(canReenterStoppedDecision({ stoppedFingerprint: "a", candidateFingerprint: "b", linkedValidatorDecision: linked }), true);
  assert.equal(canReenterStoppedDecision({ stoppedFingerprint: "a", candidateFingerprint: "b", linkedValidatorDecision: { ...linked, decision: "ASK_OWNER" } }), false);
});

test("stronger legacy local obligations are preserved and unsupported input is manual", () => {
  assert.equal(classifyLegacyInstruction({ version: "1.0.0", strongerLocalObligations: true }).action, "preserve");
  assert.equal(classifyLegacyInstruction({ parsed: false }).action, "manual_required");
  assert.equal(classifyLegacyInstruction({ version: undefined }).action, "block");
  assert.equal(classifyLegacyInstruction({ version: "2.0.0" }).action, "block");
});

test("verified progress excludes started work without current evidence", () => {
  assert.deepEqual(computeVerifiedProgress([{ weight: 3, accepted: true, current_evidence: true }, { weight: 1, accepted: true, current_evidence: false }]), { accepted_weight: 3, total_weight: 4, percent: 75 });
});

test("shadow comparison stops on a required field mismatch", () => {
  assert.equal(compareShadowProjection({ legacy: { phase: "fast_loop" }, candidate: { phase: "focused_checks" }, requiredFields: ["phase"] }).decision, "STOP");
  assert.equal(compareShadowProjection({ legacy: { phase: "fast_loop" }, candidate: { phase: "fast_loop" }, requiredFields: ["phase"] }).decision, "PASS");
});
