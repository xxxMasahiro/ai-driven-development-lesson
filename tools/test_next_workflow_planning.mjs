#!/usr/bin/env node
import assert from "node:assert/strict";
import test from "node:test";
import { buildImpactGraph, generateContractProjection, planImpactClosure, scheduleSlices, selectReviewCoverage } from "./lib/next_workflow/planning.mjs";

function graph(overrides = {}) {
  return buildImpactGraph({
    requirements: [{ id: "req" }], specifications: [{ id: "spec" }], owners: [{ id: "owner" }], files: [{ id: "file" }], checks: [{ id: "check" }], aggregates: [{ id: "aggregate" }], ciJobs: [{ id: "ci" }], evidenceTypes: [{ id: "evidence" }],
    edges: [
      { from: "req", to: "spec", relation: "specified_by" }, { from: "spec", to: "owner", relation: "owned_by" }, { from: "owner", to: "file", relation: "implements" }, { from: "file", to: "check", relation: "verified_by" }, { from: "check", to: "aggregate", relation: "included_in" }, { from: "aggregate", to: "ci", relation: "runs_in" }, { from: "ci", to: "evidence", relation: "produces" }, ...(overrides.edges ?? [])
    ]
  });
}

test("impact closure traces a requirement through exact checks to evidence", () => {
  const result = planImpactClosure({ graph: graph(), changedNodes: ["req"] });
  assert.equal(result.decision, "PASS");
  assert.deepEqual(result.required_checks, ["aggregate", "check", "ci"]);
  assert.deepEqual(result.evidence_types, ["evidence"]);
  assert.equal(result.traceability[0].has_evidence, true);
});

test("unknown impact expands conservatively or stops by policy", () => {
  const g = graph({ edges: [{ from: "unknown", to: "file", relation: "may_affect" }] });
  const expanded = planImpactClosure({ graph: g, changedNodes: ["req"] });
  assert.equal(expanded.expanded_unknown, true);
  assert.equal(expanded.impacted_nodes.length, 8);
  assert.equal(planImpactClosure({ graph: g, changedNodes: ["req"], unknownPolicy: "stop" }).code, "UNKNOWN_IMPACT");
});

test("missing requirement evidence stops", () => {
  const g = buildImpactGraph({ requirements: [{ id: "req" }], files: [{ id: "file" }], edges: [{ from: "req", to: "file", relation: "implements" }] });
  assert.equal(planImpactClosure({ graph: g, changedNodes: ["req"] }).code, "MISSING_REQUIREMENT_EVIDENCE");
});

test("scheduler follows dependencies and separates writer conflicts", () => {
  const result = scheduleSlices({
    slices: [
      { id: "a", duration: 3, files: ["same"], owner: "builder" },
      { id: "b", duration: 2, files: ["same"], owner: "builder" },
      { id: "c", duration: 1, depends_on: ["a"], files: ["other"], owner: "reviewer", writes: false }
    ],
    limits: { max_parallel: 2 }
  });
  assert.ok(result.order.indexOf("a") < result.order.indexOf("c"));
  assert.notEqual(result.batches.findIndex((batch) => batch.slices.includes("a")), result.batches.findIndex((batch) => batch.slices.includes("b")));
});

test("scheduler detects dependency cycles and unsatisfied resources", () => {
  assert.throws(() => scheduleSlices({ slices: [{ id: "a", owner: "builder-a", duration: 1, depends_on: ["b"] }, { id: "b", owner: "builder-b", duration: 1, depends_on: ["a"] }] }), /SCHEDULE_DEPENDENCY_CYCLE/);
  assert.throws(() => scheduleSlices({ slices: [{ id: "a", owner: "builder", duration: 1, resources: { token: 2 } }], limits: { max_parallel: 1, resources: { token: 1 } } }), /SCHEDULE_RESOURCE_UNSATISFIABLE/);
});

test("scheduler rejects ownerless work, negative resources, and overlapping write paths", () => {
  assert.throws(() => scheduleSlices({ slices: [{ id: "a", duration: 1 }] }), /SCHEDULE_SLICE_INVALID/);
  assert.throws(() => scheduleSlices({ slices: [{ id: "a", owner: "builder", duration: 1, resources: { cpu: -1 } }] }), /SCHEDULE_RESOURCE_INVALID/);
  const result = scheduleSlices({ slices: [
    { id: "parent", owner: "one", duration: 1, files: ["src"] },
    { id: "child", owner: "two", duration: 1, files: ["src/child/file.mjs"] }
  ], limits: { max_parallel: 2 } });
  assert.equal(result.batches.length, 2);
});

test("a changed implementation node without requirement ancestry stops", () => {
  const disconnected = buildImpactGraph({ requirements: [{ id: "req" }], files: [{ id: "file" }], evidenceTypes: [{ id: "evidence" }], edges: [{ from: "req", to: "evidence", relation: "verified_by" }] });
  assert.equal(planImpactClosure({ graph: disconnected, changedNodes: ["file"] }).code, "CHANGED_NODE_WITHOUT_REQUIREMENT");
});

test("review selector finds the smallest independent perspective cover", () => {
  const result = selectReviewCoverage({ requiredPerspectives: ["technical", "security", "procedure"], candidates: [
    { id: "one", independent: true, perspectives: ["technical", "security"], cost: 2 },
    { id: "two", independent: true, perspectives: ["procedure"], cost: 1 },
    { id: "writer", independent: true, writer: true, perspectives: ["technical", "security", "procedure"], cost: 0 }
  ] });
  assert.deepEqual(result.selected, ["one", "two"]);
  assert.equal(result.decision, "PASS");
});

test("review selector stops if a required perspective is absent", () => {
  assert.equal(selectReviewCoverage({ requiredPerspectives: ["security"], candidates: [{ id: "technical", independent: true, perspectives: ["technical"] }] }).decision, "STOP");
});

test("schema-derived projections are deterministic and explicitly non-authoritative", () => {
  const result = generateContractProjection({ schemaId: "team", owner: "team-contract", fields: ["b", "a", "a"] });
  assert.deepEqual(result.fields, ["a", "b"]);
  assert.equal(result.authoritative, false);
});
