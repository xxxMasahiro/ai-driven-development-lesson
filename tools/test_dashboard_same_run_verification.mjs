#!/usr/bin/env node

import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, symlink, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import {
  createBrowserReceipt,
  createBuildManifest,
  createFileInventory,
  createOutputInventory,
  inspectDashboardBundle,
  verifyBrowserReceipt,
  verifyBuildManifest,
  withDashboardRunLock,
} from './lib/dashboard_verification.mjs';
import { VerificationError } from './lib/verification_core.mjs';
import viteConfiguration from '../vite.config.mjs';

function expectCode(code) {
  return (error) => error instanceof VerificationError && error.code === code;
}

function configuration() {
  return {
    marker: 'fixture-verification',
    schemaVersion: '1.0.0',
    outputPath: 'output/site',
    assetsPath: 'assets',
    packageManifest: 'package.json',
    viteConfig: 'build.config.mjs',
    expectedPackageScripts: { build: 'fixture-build' },
    viteMarkers: ['split-marker'],
    warningLimitPattern: /warningLimit\s*:\s*(\d+)/,
    maxWarningLimit: 10,
    jsSuffix: '.js',
    entryPattern: /^entry-[a-z]+\.js$/,
    requiredChunkPrefixes: ['vendor-'],
    minimumJsChunks: 2,
    maxJsBytes: 1024,
    maxEntryJsBytes: 512,
    forbiddenAssetPatterns: [/forbidden-source/],
    buildWarningPatterns: [/forbidden-warning/],
    buildArgv: ['fixture-build', '--production'],
    browserArgv: ['fixture-browser', '--json'],
    maxInputFileBytes: 4096,
    maxOutputFileBytes: 4096,
  };
}

function repository(overrides = {}) {
  return {
    headSha: 'a'.repeat(40),
    repositoryFingerprint: 'b'.repeat(64),
    inputFingerprint: 'c'.repeat(64),
    worktreeState: 'clean',
    ...overrides,
  };
}

async function fixture() {
  const root = await mkdtemp(path.join(os.tmpdir(), 'dashboard-same-run-'));
  await mkdir(path.join(root, 'source'), { recursive: true });
  await mkdir(path.join(root, 'output', 'site', 'assets'), { recursive: true });
  await writeFile(path.join(root, 'source', 'main.js'), 'source-one\n');
  await writeFile(path.join(root, 'package.json'), JSON.stringify({ scripts: { build: 'fixture-build' } }));
  await writeFile(path.join(root, 'build.config.mjs'), 'warningLimit: 10; split-marker\n');
  await writeFile(path.join(root, 'output', 'site', 'index.html'), '<main>fixture</main>\n');
  await writeFile(path.join(root, 'output', 'site', 'assets', 'entry-main.js'), 'entry\n');
  await writeFile(path.join(root, 'output', 'site', 'assets', 'vendor-main.js'), 'vendor\n');
  return root;
}

test('Vite mutable cache stays outside the configured application source root', () => {
  assert.equal(typeof viteConfiguration.cacheDir, 'string');
  const applicationRoot = path.resolve(viteConfiguration.root);
  const cacheRoot = path.resolve(viteConfiguration.cacheDir);
  const relative = path.relative(applicationRoot, cacheRoot);
  assert.equal(relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative)), false);
});

test('one build inventory produces an exact manifest and bundle inspection', async () => {
  const root = await fixture();
  const config = configuration();
  const sourceInventory = await createFileInventory({ root, paths: ['source', 'package.json', 'build.config.mjs'], maxFileBytes: 4096 });
  const inspection = await inspectDashboardBundle({ root, configuration: config });
  const policy = { fingerprint: 'd'.repeat(64) };
  const manifest = createBuildManifest({ configuration: config, policy, repository: repository(), sourceInventory, outputInventory: inspection.output });
  assert.equal(manifest.output_files.length, 3);
  assert.equal(verifyBuildManifest({ manifest, configuration: config, policy, repository: repository(), sourceInventory, outputInventory: inspection.output }).manifest_digest, manifest.manifest_digest);
});

test('source, policy, revision, command, and output drift reject a build manifest', async () => {
  const root = await fixture();
  const config = configuration();
  const policy = { fingerprint: 'd'.repeat(64) };
  const source = await createFileInventory({ root, paths: ['source'], maxFileBytes: 4096 });
  const output = await createOutputInventory({ root, outputPath: config.outputPath, maxFileBytes: 4096 });
  const manifest = createBuildManifest({ configuration: config, policy, repository: repository(), sourceInventory: source, outputInventory: output });

  await writeFile(path.join(root, 'source', 'main.js'), 'source-two\n');
  const changedSource = await createFileInventory({ root, paths: ['source'], maxFileBytes: 4096 });
  assert.throws(() => verifyBuildManifest({ manifest, configuration: config, policy, repository: repository(), sourceInventory: changedSource, outputInventory: output }), expectCode('DASHBOARD_MANIFEST_MISMATCH'));
  assert.throws(() => verifyBuildManifest({ manifest, configuration: config, policy: { fingerprint: 'e'.repeat(64) }, repository: repository(), sourceInventory: source, outputInventory: output }), expectCode('DASHBOARD_MANIFEST_MISMATCH'));
  assert.throws(() => verifyBuildManifest({ manifest, configuration: config, policy, repository: repository({ headSha: 'f'.repeat(40) }), sourceInventory: source, outputInventory: output }), expectCode('DASHBOARD_MANIFEST_MISMATCH'));

  await writeFile(path.join(root, 'output', 'site', 'assets', 'entry-main.js'), 'changed-output\n');
  const changedOutput = await createOutputInventory({ root, outputPath: config.outputPath, maxFileBytes: 4096 });
  assert.throws(() => verifyBuildManifest({ manifest, configuration: config, policy, repository: repository(), sourceInventory: source, outputInventory: changedOutput }), expectCode('DASHBOARD_MANIFEST_MISMATCH'));

  const changedCommand = { ...config, buildArgv: ['different-build'] };
  assert.throws(() => verifyBuildManifest({ manifest, configuration: changedCommand, policy, repository: repository(), sourceInventory: source, outputInventory: output }), expectCode('DASHBOARD_MANIFEST_MISMATCH'));
});

test('browser receipt is bound to exact test inventory, revision, build, and result', async () => {
  const root = await fixture();
  const config = configuration();
  const policy = { fingerprint: 'd'.repeat(64) };
  const inventory = await createFileInventory({ root, paths: ['source'], maxFileBytes: 4096 });
  const output = await createOutputInventory({ root, outputPath: config.outputPath, maxFileBytes: 4096 });
  const manifest = createBuildManifest({ configuration: config, policy, repository: repository(), sourceInventory: inventory, outputInventory: output });
  const result = { code: 0, report: { stats: { expected: 4, skipped: 0, unexpected: 0, flaky: 0 } } };
  const receipt = createBrowserReceipt({ configuration: config, repository: repository(), browserInventory: inventory, buildManifest: manifest, result });
  assert.equal(verifyBrowserReceipt({ receipt, configuration: config, repository: repository(), browserInventory: inventory, buildManifest: manifest, result }).receipt_digest, receipt.receipt_digest);
  assert.throws(() => verifyBrowserReceipt({ receipt, configuration: config, repository: repository({ inputFingerprint: 'f'.repeat(64) }), browserInventory: inventory, buildManifest: manifest, result }), expectCode('DASHBOARD_RECEIPT_MISMATCH'));
  assert.throws(() => verifyBrowserReceipt({ receipt, configuration: config, repository: repository(), browserInventory: { ...inventory, digest: '0'.repeat(64) }, buildManifest: manifest, result }), expectCode('DASHBOARD_RECEIPT_MISMATCH'));
  assert.throws(() => createBrowserReceipt({ configuration: config, repository: repository(), browserInventory: inventory, buildManifest: manifest, result: { code: 1, report: result.report } }), expectCode('DASHBOARD_BROWSER_RESULT'));
});

test('symlinked inputs and outputs fail closed', async () => {
  const root = await fixture();
  await symlink(path.join(root, 'source', 'main.js'), path.join(root, 'source', 'linked.js'));
  await assert.rejects(createFileInventory({ root, paths: ['source'], maxFileBytes: 4096 }), expectCode('DASHBOARD_INPUT_SYMLINK'));
  await symlink(path.join(root, 'output', 'site', 'index.html'), path.join(root, 'output', 'site', 'linked.html'));
  await assert.rejects(createOutputInventory({ root, outputPath: 'output/site', maxFileBytes: 4096 }), expectCode('DASHBOARD_INPUT_SYMLINK'));
});

test('the runtime lock rejects a concurrent owner and leaves no reusable receipt cache', async () => {
  const root = await fixture();
  let nestedRejected = false;
  await withDashboardRunLock({
    root,
    runtimeDirectory: 'runtime/verification',
    action: async (runDirectory) => {
      await writeFile(path.join(runDirectory, 'ephemeral.json'), '{}\n');
      try {
        await withDashboardRunLock({ root, runtimeDirectory: 'runtime/verification', action: async () => undefined });
      } catch (error) {
        nestedRejected = expectCode('DASHBOARD_LOCKED')(error);
      }
    },
  });
  assert.equal(nestedRejected, true);
  const remaining = await readFile(path.join(root, 'output', 'site', 'index.html'), 'utf8');
  assert.match(remaining, /fixture/);
});
