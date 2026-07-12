#!/usr/bin/env node

import assert from 'node:assert/strict';
import { chmod, mkdir, mkdtemp, readFile, symlink, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  createCiProof,
  loadCiComposition,
  loadGapCommands,
  parseCiWorkflowText,
  runFallback,
  runGapCommands,
  validateCiComposition,
  verifyCiProof,
} from './lib/ci_composition.mjs';
import { verificationDigest, VerificationError } from './lib/verification_core.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function expectCode(code) {
  return (error) => error instanceof VerificationError && error.code === code;
}

function successfulResults(row) {
  return JSON.stringify(Object.fromEntries(row.needs.map((need) => [need, 'success'])));
}

test('current workflows have exact semantic owners and proof-only terminal jobs', async () => {
  const composition = await loadCiComposition({ root: ROOT });
  assert.deepEqual(validateCiComposition(composition), []);
  const mainRows = composition.rows.filter((row) => row.workflowId === 'main');
  const owners = new Map();
  for (const row of mainRows.filter((item) => item.role === 'owner' || item.role === 'final')) {
    for (const id of composition.assignments.get(`main:${row.jobId}`)) {
      assert.equal(owners.has(id), false, `duplicate owner: ${id}`);
      owners.set(id, row.jobId);
    }
  }
  assert.equal(owners.size, composition.execution.plan.executionCount);
  assert.equal(mainRows.find((row) => row.jobId === 'lesson-aggregate').role, 'proof');
  assert.equal(mainRows.find((row) => row.jobId === 'git-hooks-full-no-cache').role, 'proof');
});

test('missing, duplicate, and unknown graph ownership fails closed', async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'ci-graph-refusal-'));
  const source = await readFile(path.join(ROOT, 'docs', 'workflow', 'FINAL_GATE_CI_GRAPH.tsv'), 'utf8');

  const duplicate = source.replace(
    '{"groups":["regression"],"exclude":["test_repository_document_sync"]}',
    '{"include":["check_lesson_structure"],"groups":["regression"],"exclude":["test_repository_document_sync"]}',
  );
  const duplicateFile = path.join(directory, 'duplicate.tsv');
  await writeFile(duplicateFile, duplicate);
  const duplicateComposition = await loadCiComposition({ root: ROOT, graphPath: duplicateFile });
  assert.ok(validateCiComposition(duplicateComposition).some((error) => error.includes('duplicate execution owner')));

  const missingFile = path.join(directory, 'missing.tsv');
  await writeFile(missingFile, source.replace('{"groups":["structure","sync"],"exclude":["check_repository_document_sync"]}', '{"groups":["structure"],"exclude":["check_repository_document_sync"]}'));
  const missingComposition = await loadCiComposition({ root: ROOT, graphPath: missingFile });
  assert.ok(validateCiComposition(missingComposition).some((error) => error.includes('missing execution owner')));

  const unknownFile = path.join(directory, 'unknown.tsv');
  await writeFile(unknownFile, source.replace('{"groups":["lesson-cli"]}', '{"include":["unknown_check"],"groups":["lesson-cli"]}'));
  const unknownComposition = await loadCiComposition({ root: ROOT, graphPath: unknownFile });
  assert.ok(validateCiComposition(unknownComposition).some((error) => error.includes('unknown selector subject')));
});

test('workflow command and dependency drift are rejected semantically', async () => {
  const composition = await loadCiComposition({ root: ROOT });
  const current = composition.workflows.get('main');
  const changedText = current.parsed.text.replace(
    './tools/verification-ci run-job --workflow main --job structure-docs-checks',
    './tools/verification-ci run-job --workflow main --job removed-owner',
  );
  const workflows = new Map(composition.workflows);
  workflows.set('main', { ...current, parsed: parseCiWorkflowText(changedText, current.file) });
  const changed = { ...composition, workflows };
  assert.ok(validateCiComposition(changed).some((error) => error.includes('workflow owner command is missing')));

  const needsText = current.parsed.text.replace('      - repository-document-sync\n', '');
  const needsWorkflows = new Map(composition.workflows);
  needsWorkflows.set('main', { ...current, parsed: parseCiWorkflowText(needsText, current.file) });
  assert.ok(validateCiComposition({ ...composition, workflows: needsWorkflows }).some((error) => error.includes('workflow needs mismatch')));
});

test('proof receipt binds graph, policy, catalog, revision, job, and provider results', async () => {
  const composition = await loadCiComposition({ root: ROOT });
  const row = composition.rows.find((item) => item.workflowId === 'main' && item.jobId === 'lesson-aggregate');
  const directory = await mkdtemp(path.join(os.tmpdir(), 'ci-proof-'));
  const file = path.join(directory, 'proof.json');
  const proof = await createCiProof({ composition, workflowId: 'main', jobId: 'lesson-aggregate', resultsJson: successfulResults(row), output: file });
  assert.equal((await verifyCiProof({ composition, file, workflowId: 'main', jobId: 'lesson-aggregate' })).proof_digest, proof.proof_digest);

  const failed = Object.fromEntries(row.needs.map((need, index) => [need, index === 0 ? 'failure' : 'success']));
  await assert.rejects(createCiProof({ composition, workflowId: 'main', jobId: 'lesson-aggregate', resultsJson: JSON.stringify(failed) }), expectCode('CI_PROOF_FAILED'));

  const tampered = JSON.parse(await readFile(file, 'utf8'));
  tampered.revision = '0'.repeat(40);
  const base = { ...tampered };
  delete base.proof_digest;
  tampered.proof_digest = verificationDigest(base);
  const tamperedFile = path.join(directory, 'tampered.json');
  await writeFile(tamperedFile, JSON.stringify(tampered));
  await assert.rejects(verifyCiProof({ composition, file: tamperedFile, workflowId: 'main', jobId: 'lesson-aggregate' }), expectCode('CI_PROOF_MISMATCH'));

  const linked = path.join(directory, 'linked.json');
  await symlink(file, linked);
  await assert.rejects(verifyCiProof({ composition, file: linked, workflowId: 'main', jobId: 'lesson-aggregate' }), expectCode('CI_AUTHORITY_SYMLINK'));

  const realParent = path.join(directory, 'real-parent');
  const linkedParent = path.join(directory, 'linked-parent');
  await mkdir(realParent);
  await symlink(realParent, linkedParent);
  await assert.rejects(
    createCiProof({ composition, workflowId: 'main', jobId: 'lesson-aggregate', resultsJson: successfulResults(row), output: path.join(linkedParent, 'proof.json') }),
    expectCode('CI_PROOF_PATH'),
  );
});

test('final-gap and fallback commands use validated argv without shell evaluation', async () => {
  const composition = await loadCiComposition({ root: ROOT });
  const directory = await mkdtemp(path.join(os.tmpdir(), 'ci-gap-'));
  const valid = path.join(directory, 'valid.tsv');
  await writeFile(valid, `# command_id\targv\toutput\tdescription\nversion\t${JSON.stringify([process.execPath, '--version'])}\tdiscard\tVersion fixture.\n`);
  const env = { ...process.env, CI_FINAL_GATE_GAP_COMMANDS_FILE: valid };
  assert.equal((await loadGapCommands({ composition, env })).length, 1);
  assert.equal((await runGapCommands({ composition, env })).run.ok, true);
  assert.equal((await runFallback({ composition, env: { ...process.env, CI_FINAL_GATE_FALLBACK_ARGV_JSON: JSON.stringify([process.execPath, '--version']) } })).ok, true);

  const unsafe = path.join(directory, 'unsafe.tsv');
  await writeFile(unsafe, '# command_id\targv\toutput\tdescription\nunsafe\t["bash","-c","echo unsafe"]\tdiscard\tUnsafe fixture.\n');
  await assert.rejects(loadGapCommands({ composition, env: { ...process.env, CI_FINAL_GATE_GAP_COMMANDS_FILE: unsafe } }), expectCode('UNSAFE_ARGV'));

  const executable = path.join(directory, 'executable.sh');
  await writeFile(executable, '#!/usr/bin/env bash\nexit 0\n');
  await chmod(executable, 0o755);
  assert.ok((await readFile(executable, 'utf8')).includes('exit 0'));
});
