#!/usr/bin/env node

import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { chmod, mkdtemp, mkdir, readFile, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { performance } from 'node:perf_hooks';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { loadAsBuiltIndex, validateAsBuiltIndex } from './lib/as_built_index.mjs';
import { loadExecutionPolicy, VerificationError } from './lib/verification_core.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const POLICY = path.join(ROOT, 'docs', 'workflow', 'FINAL_GATE_EXECUTION_POLICY.tsv');
const CHECKER = path.join(ROOT, 'tools', 'check_as_built_sync_contract.sh');

async function writeFixture() {
  const root = await mkdtemp(path.join(os.tmpdir(), 'as-built-single-pass-'));
  const policy = await loadExecutionPolicy({ root, policyPath: POLICY });
  const documents = policy.profiles.get('input_profile:as_built_documents');
  const wiring = policy.profiles.get('input_profile:as_built_wiring');
  for (const relative of [...documents, ...wiring, 'docs/workflow/GIT_HOOKS_POLICY.tsv']) {
    await mkdir(path.dirname(path.join(root, relative)), { recursive: true });
  }
  const testPath = path.join(root, 'tools', 'sample_test.sh');
  await writeFile(testPath, '#!/usr/bin/env bash\nset -euo pipefail\n');
  await chmod(testPath, 0o755);
  const documentList = documents.join(',');
  await writeFile(
    path.join(root, 'docs', 'workflow', 'AS_BUILT_SYNC_CONTRACT.tsv'),
    `# sync_id\tstatus\ttitle\trequired_artifacts\trequired_tests\trequired_docs\truntime_evidence\n` +
      `single_pass_fixture\timplemented\tSingle pass fixture\ttools/sample_test.sh\ttools/sample_test.sh\t${documentList}\ttools/test_lesson_repository.sh\n`,
  );
  const block = [
    '# Fixture',
    'SYNC-ID: single_pass_fixture',
    'STATUS: implemented',
    'ARTIFACTS: tools/sample_test.sh',
    'TESTS: tools/sample_test.sh',
    '',
  ].join('\n');
  for (const relative of documents) await writeFile(path.join(root, relative), block);
  for (const relative of wiring) await writeFile(path.join(root, relative), './tools/sample_test.sh\n');
  await writeFile(
    path.join(root, 'docs', 'workflow', 'GIT_HOOKS_POLICY.tsv'),
    '# key\tallowed_values\tdefault_value\tlabel\tdescription\n' +
      'hook_mode\tfull|fast|minimal\tfast\tMode\tFixture.\n',
  );
  return { root, documents };
}

function runChecker(root, engine) {
  return spawnSync(CHECKER, [], {
    encoding: 'utf8',
    env: {
      ...process.env,
      AS_BUILT_SYNC_ROOT: root,
      AS_BUILT_SYNC_CONTRACT_FILE: path.join(root, 'docs', 'workflow', 'AS_BUILT_SYNC_CONTRACT.tsv'),
      AS_BUILT_SYNC_EXECUTION_POLICY_FILE: POLICY,
      AS_BUILT_SYNC_ENGINE: engine,
    },
  });
}

test('single-pass and legacy adapters agree on valid and rejected fixture outcomes', async () => {
  const { root, documents } = await writeFixture();
  const indexedPass = runChecker(root, 'single-pass');
  const legacyPass = runChecker(root, 'legacy');
  assert.equal(indexedPass.status, 0, indexedPass.stderr);
  assert.equal(legacyPass.status, 0, legacyPass.stderr);

  const specification = path.join(root, documents[1]);
  await writeFile(specification, (await readFile(specification, 'utf8')).replace('STATUS: implemented', 'STATUS: planned'));
  const indexedFail = runChecker(root, 'single-pass');
  const legacyFail = runChecker(root, 'legacy');
  assert.notEqual(indexedFail.status, 0);
  assert.notEqual(legacyFail.status, 0);
  assert.match(indexedFail.stderr, /status mismatch for single_pass_fixture/);
  assert.match(legacyFail.stderr, /status mismatch for single_pass_fixture/);
});

test('indexed owner rejects an authority mutation during the run', async () => {
  const { root, documents } = await writeFixture();
  await assert.rejects(
    loadAsBuiltIndex({
      root,
      policyPath: POLICY,
      beforeFinalize: async () => {
        const target = path.join(root, documents[0]);
        await writeFile(target, `${await readFile(target, 'utf8')}mutation\n`);
      },
    }),
    (error) => error instanceof VerificationError && error.code === 'AS_BUILT_INPUT_CHANGED',
  );
});

test('current repository indexed validation stays within its configured ceiling', async () => {
  const policy = await loadExecutionPolicy({ root: ROOT, policyPath: POLICY });
  const ceiling = Number(policy.settings.get('as_built_max_validation_ms'));
  assert.ok(Number.isSafeInteger(ceiling) && ceiling > 0);
  const started = performance.now();
  const index = await loadAsBuiltIndex({ root: ROOT, policyPath: POLICY });
  const errors = await validateAsBuiltIndex(index);
  const elapsed = performance.now() - started;
  assert.deepEqual(errors, []);
  assert.ok(elapsed <= ceiling, `indexed validation took ${elapsed.toFixed(1)}ms; ceiling is ${ceiling}ms`);
});
