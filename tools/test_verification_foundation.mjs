#!/usr/bin/env node

import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtemp, mkdir, readFile, symlink, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  VerificationError,
  canonicalCommandDigest,
  commandsEquivalent,
  fingerprintRepository,
  loadCompatibilityCatalog,
  loadEvidenceSchema,
  loadExecutionPolicy,
  parseCommandIdentity,
  recordEvidenceV2,
  verifyEvidenceV2,
} from './lib/verification_core.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function git(root, ...args) {
  return execFileSync('git', ['-C', root, ...args], { encoding: 'utf8' }).trim();
}

async function makeRepository() {
  const root = await mkdtemp(path.join(os.tmpdir(), 'verification-foundation-'));
  git(root, 'init', '-q');
  git(root, 'config', 'user.name', 'Verification Test');
  git(root, 'config', 'user.email', 'verification@example.invalid');
  await writeFile(path.join(root, '.gitignore'), 'ignored.txt\n');
  await writeFile(path.join(root, 'tracked.txt'), 'initial\n');
  git(root, 'add', '.gitignore', 'tracked.txt');
  git(root, 'commit', '-q', '-m', 'fixture');
  return root;
}

async function copyEvidenceAuthorities(root) {
  const target = path.join(root, 'docs', 'workflow');
  await mkdir(target, { recursive: true });
  await writeFile(
    path.join(target, 'FINAL_GATE_EVIDENCE_SCHEMA.tsv'),
    await readFile(path.join(ROOT, 'docs', 'workflow', 'FINAL_GATE_EVIDENCE_SCHEMA.tsv')),
  );
}

function expectCode(code) {
  return (error) => error instanceof VerificationError && error.code === code;
}

test('execution policy and compatibility catalogs are derived from authorities', async () => {
  const policy = await loadExecutionPolicy({ root: ROOT });
  assert.equal(policy.settings.get('activation_mode'), 'record-only');
  assert.deepEqual(policy.relationships.get('check_as_built_docs'), ['check_as_built_sync_contract']);

  const catalog = await loadCompatibilityCatalog({ root: ROOT, policy });
  assert.ok(catalog.hooks.length > 0);
  assert.ok(catalog.coverage.length > catalog.gaps.length);
  assert.equal(catalog.hooks.length, new Set(catalog.hooks.map((row) => row.id)).size);
  assert.equal(catalog.groups.length, catalog.hooks.length);
  assert.equal(catalog.counts.hooks, catalog.hooks.length);
  assert.equal(catalog.counts.gaps, catalog.gaps.length);
});

test('malformed, duplicate, and unsafe policy input fails closed', async () => {
  const fixture = await mkdtemp(path.join(os.tmpdir(), 'verification-policy-'));
  const policyPath = path.join(fixture, 'policy.tsv');
  const base = await readFile(path.join(ROOT, 'docs', 'workflow', 'FINAL_GATE_EXECUTION_POLICY.tsv'), 'utf8');

  await writeFile(policyPath, `${base}setting\tbroken\n`);
  await assert.rejects(loadExecutionPolicy({ root: fixture, policyPath }), expectCode('POLICY_FIELD_COUNT'));

  await writeFile(policyPath, `${base}setting\tactivation_mode\tlegacy\tduplicate\n`);
  await assert.rejects(loadExecutionPolicy({ root: fixture, policyPath }), expectCode('POLICY_DUPLICATE'));

  await writeFile(policyPath, `${base}argv\tunsafe\t["bash","-c","echo unsafe"]\tunsafe\n`);
  await assert.rejects(loadExecutionPolicy({ root: fixture, policyPath }), expectCode('UNSAFE_ARGV'));
});

test('command identity is canonical and rejects shell evaluation syntax', () => {
  assert.deepEqual(parseCommandIdentity('./tools/check.sh --mode "value two"'), [
    './tools/check.sh',
    '--mode',
    'value two',
  ]);
  assert.equal(
    canonicalCommandDigest(['./tools/check.sh', '--mode', 'value two']),
    canonicalCommandDigest(parseCommandIdentity('./tools/check.sh --mode "value two"')),
  );
  for (const unsafe of [
    './tools/check.sh; echo unsafe',
    './tools/check.sh $(id)',
    './tools/check.sh `id`',
    'bash -c "./tools/check.sh"',
    './tools/check.sh > output.txt',
  ]) {
    assert.throws(() => parseCommandIdentity(unsafe), expectCode('UNSAFE_ARGV'));
  }
});

test('equivalence reports every material mismatch', () => {
  const left = {
    subjectId: 'check',
    argv: ['./tools/check.sh'],
    environmentProfile: 'default',
    inputs: ['source'],
    prerequisites: ['setup'],
    outputs: ['receipt'],
    policyFingerprint: 'a'.repeat(64),
  };
  assert.deepEqual(commandsEquivalent(left, structuredClone(left)), { equivalent: true, mismatches: [] });
  const right = structuredClone(left);
  right.argv.push('--changed');
  right.outputs = ['different'];
  assert.deepEqual(commandsEquivalent(left, right), {
    equivalent: false,
    mismatches: ['argv', 'outputs'],
  });
});

test('repository fingerprint covers worktree, index, untracked content, modes, and links', async () => {
  const root = await makeRepository();
  const clean = await fingerprintRepository({ root });
  assert.equal(clean.worktreeState, 'clean');
  assert.ok(!JSON.stringify(clean).includes(root));

  await writeFile(path.join(root, 'tracked.txt'), 'worktree-change\n');
  const dirty = await fingerprintRepository({ root });
  assert.notEqual(dirty.inputFingerprint, clean.inputFingerprint);
  assert.equal(dirty.worktreeState, 'dirty');

  git(root, 'add', 'tracked.txt');
  const staged = await fingerprintRepository({ root });
  assert.notEqual(staged.inputFingerprint, dirty.inputFingerprint);

  await writeFile(path.join(root, 'untracked.txt'), 'one\n');
  const untrackedOne = await fingerprintRepository({ root });
  await writeFile(path.join(root, 'untracked.txt'), 'two\n');
  const untrackedTwo = await fingerprintRepository({ root });
  assert.notEqual(untrackedOne.inputFingerprint, untrackedTwo.inputFingerprint);

  await writeFile(path.join(root, 'ignored.txt'), 'ignored-one\n');
  const ignoredOne = await fingerprintRepository({ root });
  await writeFile(path.join(root, 'ignored.txt'), 'ignored-two\n');
  const ignoredTwo = await fingerprintRepository({ root });
  assert.equal(ignoredOne.inputFingerprint, ignoredTwo.inputFingerprint);

  await symlink('tracked.txt', path.join(root, 'link.txt'));
  const linkOne = await fingerprintRepository({ root });
  await writeFile(path.join(root, 'other.txt'), 'other\n');
  await import('node:fs/promises').then(({ unlink }) => unlink(path.join(root, 'link.txt')));
  await symlink('other.txt', path.join(root, 'link.txt'));
  const linkTwo = await fingerprintRepository({ root });
  assert.notEqual(linkOne.inputFingerprint, linkTwo.inputFingerprint);

  await assert.rejects(
    fingerprintRepository({
      root,
      beforeFinalize: () => writeFile(path.join(root, 'tracked.txt'), 'raced\n'),
    }),
    expectCode('INPUT_CHANGED'),
  );
});

test('version 2 evidence is atomic, single-producer, provenance-bound, and redacted', async () => {
  const root = await makeRepository();
  await copyEvidenceAuthorities(root);
  const evidenceDir = path.join(root, '.git', 'verification-evidence-v2');
  const base = {
    root,
    evidenceDir,
    evidenceId: 'foundation:sample',
    subjectId: 'sample_check',
    argv: ['./tools/sample-check', '--strict'],
    scope: 'local',
    eventName: 'local',
    ref: 'refs/heads/test',
    workflow: 'local-verification',
    runId: 'run-1',
    runAttempt: '1',
    sourceJob: 'foundation-test',
    policyFingerprint: 'a'.repeat(64),
    toolchainFingerprint: 'b'.repeat(64),
    resultDigest: 'c'.repeat(64),
    artifactLineageDigest: 'd'.repeat(64),
    inputPaths: ['tracked.txt'],
  };

  const recorded = await recordEvidenceV2(base);
  assert.equal(recorded.receipt.status, 'success');
  await verifyEvidenceV2(base);
  await assert.rejects(recordEvidenceV2(base), expectCode('EVIDENCE_DUPLICATE_PRODUCER'));
  await assert.rejects(
    verifyEvidenceV2({ ...base, sourceJob: 'different-owner' }),
    expectCode('EVIDENCE_PROVENANCE_MISMATCH'),
  );

  await writeFile(path.join(root, 'tracked.txt'), 'changed-after-evidence\n');
  await assert.rejects(verifyEvidenceV2(base), expectCode('EVIDENCE_INPUT_MISMATCH'));

  const serialized = await readFile(recorded.path, 'utf8');
  assert.ok(!serialized.includes(root));
  assert.ok(!serialized.includes('raw_log'));
  assert.ok(!serialized.includes('environment_dump'));
  await assert.rejects(
    recordEvidenceV2({ ...base, evidenceId: 'forbidden', raw_log: 'do not store' }),
    expectCode('EVIDENCE_FORBIDDEN_FIELD'),
  );
});

test('evidence schema rejects duplicates and forbidden required fields', async () => {
  const fixture = await mkdtemp(path.join(os.tmpdir(), 'verification-schema-'));
  const schemaPath = path.join(fixture, 'schema.tsv');
  const schema = await readFile(path.join(ROOT, 'docs', 'workflow', 'FINAL_GATE_EVIDENCE_SCHEMA.tsv'), 'utf8');
  await writeFile(schemaPath, `${schema}status\ttrue\tpublic-metadata\tduplicate\n`);
  await assert.rejects(loadEvidenceSchema({ root: fixture, schemaPath }), expectCode('SCHEMA_DUPLICATE'));

  await writeFile(schemaPath, schema.replace('raw_log\tfalse\tforbidden', 'raw_log\ttrue\tforbidden'));
  await assert.rejects(loadEvidenceSchema({ root: fixture, schemaPath }), expectCode('SCHEMA_FORBIDDEN_REQUIRED'));
});
