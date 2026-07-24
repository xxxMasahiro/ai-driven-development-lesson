#!/usr/bin/env node
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";

const require = createRequire(import.meta.url);
const { verifyActivationRows } = require("./next-workflow-launcher.cjs");

const MODES = ["shadow", "release_verified", "recovery_verified", "rollback_verified", "archive_decommission_verified", "ready", "enforced"];
const REPOSITORY_ID = "repository";
const CHECKOUT_ID = "checkout";

function canonicalJson(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(",")}}`;
  return JSON.stringify(value);
}

function digest(value) {
  return createHash("sha256").update(canonicalJson(value)).digest("hex");
}

function cycleId({ candidateFingerprint, cycleStartRevision, previousRecordRevision, previousRecordContentFingerprint }) {
  return digest({
    activation_id: "next-development-workflow",
    candidate_fingerprint: candidateFingerprint,
    cycle_start_revision: cycleStartRevision,
    predecessor_record_revision: previousRecordRevision,
    predecessor_record_content_fingerprint: previousRecordContentFingerprint,
  });
}

function rowFor(payload, { id = `activation-${payload.revision}`, contentFingerprint = digest(payload) } = {}) {
  return {
    id,
    kind: "NextWorkflowActivation",
    schema_version: payload.schema_version,
    record_revision: payload.revision,
    repository_id: REPOSITORY_ID,
    checkout_id: CHECKOUT_ID,
    authority_scope: "release",
    lineage_id: "next-development-workflow",
    lifecycle_state: payload.mode,
    payload_json: canonicalJson(payload),
    source_revision: String(payload.schema_version === "1.1.0" ? payload.previous_record_revision : payload.revision - 1),
    policy_fp: payload.mode === "enforced" ? payload.proof_summary.fingerprint : "e".repeat(64),
    input_fp: payload.candidate_fingerprint,
    content_fp: contentFingerprint,
    sensitivity: "internal",
    fresh_until: null,
    created_at: "2028-01-01T00:00:00.000Z",
    superseded_by: null,
  };
}

function currentRows() {
  const candidateFingerprint = "c".repeat(64);
  const predecessor = {
    id: "abandoned-release-2",
    record_revision: 2,
    content_fp: "b".repeat(64),
  };
  const startRevision = 3;
  const id = cycleId({
    candidateFingerprint,
    cycleStartRevision: startRevision,
    previousRecordRevision: predecessor.record_revision,
    previousRecordContentFingerprint: predecessor.content_fp,
  });
  const rows = [predecessor];
  let previousRevision = predecessor.record_revision;
  let previousContentFingerprint = predecessor.content_fp;
  for (let index = 0; index < MODES.length; index += 1) {
    const revision = startRevision + index;
    const mode = MODES[index];
    const payload = {
      schema_version: "1.1.0",
      activation_id: "next-development-workflow",
      authority_epoch: 0,
      revision,
      mode,
      candidate_fingerprint: candidateFingerprint,
      cycle_id: id,
      cycle_start_revision: startRevision,
      cycle_step: index + 1,
      previous_record_revision: previousRevision,
      previous_record_content_fingerprint: previousContentFingerprint,
      evidence: [],
      ...(mode === "enforced" ? { proof_summary: { status: "passed", fingerprint: "f".repeat(64) } } : {}),
    };
    const row = rowFor(payload);
    rows.push(row);
    previousRevision = revision;
    previousContentFingerprint = row.content_fp;
  }
  return rows;
}

function legacyRows() {
  const candidateFingerprint = "a".repeat(64);
  return MODES.map((mode, index) => rowFor({
    schema_version: "1.0.0",
    activation_id: "next-development-workflow",
    authority_epoch: 0,
    revision: index + 1,
    mode,
    candidate_fingerprint: candidateFingerprint,
    evidence: [],
    ...(mode === "enforced" ? { proof_summary: { status: "passed", fingerprint: "d".repeat(64) } } : {}),
  }, { id: `legacy-${index + 1}` }));
}

function verify(rows) {
  return verifyActivationRows(rows, { repositoryId: REPOSITORY_ID, checkoutId: CHECKOUT_ID });
}

function replacePayload(row, mutate) {
  const payload = JSON.parse(row.payload_json);
  mutate(payload);
  return { ...row, payload_json: canonicalJson(payload), content_fp: digest(payload) };
}

test("the pure CommonJS verifier accepts one exact non-modulus current cycle", () => {
  const source = readFileSync(new URL("./next-workflow-launcher.cjs", import.meta.url), "utf8");
  assert.doesNotMatch(source, /\bimport\s*(?:\(|[\s{*])/u);
  assert.doesNotMatch(source, /release\.mjs/u);
  const verified = verify(currentRows());
  assert.equal(verified.activation.revision, 9);
  assert.equal(verified.activation.cycle_start_revision, 3);
  assert.equal(verified.cycleRows.length, 7);
});

test("the pure CommonJS verifier preserves the exact legacy revision-7 cycle", () => {
  const verified = verify(legacyRows());
  assert.equal(verified.activation.schema_version, "1.0.0");
  assert.equal(verified.activation.revision, 7);
  assert.equal(verified.cycleRows.length, 7);
});

test("the pure CommonJS verifier rejects row, payload, lifecycle, content, and source mismatches", () => {
  const rowMismatch = currentRows();
  rowMismatch[7] = replacePayload(rowMismatch[7], (payload) => { payload.revision = 21; });
  assert.throws(() => verify(rowMismatch), /ROW_BINDING_INVALID/);

  const lifecycleMismatch = currentRows();
  lifecycleMismatch[7] = { ...lifecycleMismatch[7], lifecycle_state: "ready" };
  assert.throws(() => verify(lifecycleMismatch), /ROW_BINDING_INVALID/);

  const contentMismatch = currentRows();
  contentMismatch[7] = { ...contentMismatch[7], content_fp: "0".repeat(64) };
  assert.throws(() => verify(contentMismatch), /ROW_BINDING_INVALID/);

  const sourceMismatch = currentRows();
  sourceMismatch[7] = { ...sourceMismatch[7], source_revision: "1" };
  assert.throws(() => verify(sourceMismatch), /SOURCE_BINDING_INVALID/);

  const schemaMismatch = currentRows();
  schemaMismatch[7] = { ...schemaMismatch[7], schema_version: "1.0.0" };
  assert.throws(() => verify(schemaMismatch), /ROW_BINDING_INVALID/);
});

test("the pure CommonJS verifier rejects missing current history and a duplicate newest revision", () => {
  const missing = currentRows().filter((row) => row.record_revision !== 5);
  assert.throws(() => verify(missing), /CYCLE_HISTORY_INVALID/);
  assert.throws(() => verify(legacyRows().filter((row) => row.record_revision !== 4)), /LEGACY_ACTIVATION_HISTORY_INVALID/);

  const duplicate = currentRows();
  duplicate.push({ ...duplicate.at(-1), id: "duplicate-newest" });
  assert.throws(() => verify(duplicate), /NEWEST_DUPLICATE/);
});

test("the pure CommonJS verifier never falls back past a newer incomplete candidate", () => {
  const rows = currentRows();
  const previous = rows.at(-1);
  const candidateFingerprint = "9".repeat(64);
  const startRevision = previous.record_revision + 1;
  const payload = {
    schema_version: "1.1.0",
    activation_id: "next-development-workflow",
    authority_epoch: 0,
    revision: startRevision,
    mode: "shadow",
    candidate_fingerprint: candidateFingerprint,
    cycle_id: cycleId({
      candidateFingerprint,
      cycleStartRevision: startRevision,
      previousRecordRevision: previous.record_revision,
      previousRecordContentFingerprint: previous.content_fp,
    }),
    cycle_start_revision: startRevision,
    cycle_step: 1,
    previous_record_revision: previous.record_revision,
    previous_record_content_fingerprint: previous.content_fp,
    evidence: [],
  };
  rows.push(rowFor(payload, { id: "newest-shadow" }));
  assert.throws(() => verify(rows), /NEWEST_NOT_ENFORCED/);
});
