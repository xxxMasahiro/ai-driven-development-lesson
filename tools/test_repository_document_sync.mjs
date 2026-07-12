import test from 'node:test';
// sync_id: repository_document_sync_enforcement
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, symlink, writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  evaluateRepositoryDocumentSync,
  globToRegExp,
  loadRepositoryDocumentSyncPolicy,
  parseNameStatusZ,
  recordsFromPaths,
  validateRepositoryDocumentSyncPolicy
} from './lib/repository_document_sync.mjs';

const root = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const policyPath = path.join(root, 'docs/workflow/REPOSITORY_DOCUMENT_SYNC_POLICY.json');
const policy = validateRepositoryDocumentSyncPolicy(JSON.parse(await readFile(policyPath, 'utf8')));
const checker = path.join(root, 'tools/check_repository_document_sync.mjs');
const asRecords = (paths) => recordsFromPaths(paths);
const workflowPair = ['docs/workflow/TASK_TRACKER.md', 'docs/workflow/HANDOFF.md'];
const groupPaths = (...ids) => [...new Set(ids.flatMap((id) => policy.document_groups[id].all_of ?? []))];
const childEnv = { ...process.env };
for (const key of Object.keys(childEnv)) {
  if (key.startsWith('NODE') || ['SHELLOPTS', 'BASHOPTS'].includes(key)) delete childEnv[key];
}

test('policy is parent-scoped, bounded, self-protected, and uses a small glob language', () => {
  assert.equal(policy.repository_scope, 'current-repository-only');
  assert.equal(policy.external_repository_access, false);
  assert.equal(globToRegExp('tools/*security*').test('tools/product-security'), true);
  assert.equal(globToRegExp('tools/*security*').test('tools/lib/product_security.sh'), false);
  assert.equal(globToRegExp('docs/**').test('docs/nested/file.md'), true);
  for (const invalid of ['/abs', '../escape', 'a\\b', 'a/[bc]', 'a/?', 'a\nspoof']) assert.throws(() => globToRegExp(invalid));
  assert.throws(() => validateRepositoryDocumentSyncPolicy({}), /Unsupported repository document-sync policy version/);
  assert.throws(() => validateRepositoryDocumentSyncPolicy({ ...policy, external_repository_access: true }), /must remain false/);
  assert.throws(() => validateRepositoryDocumentSyncPolicy({ ...policy, extra: true }), /unsupported field/);

  const missingSelf = structuredClone(policy);
  missingSelf.rules = missingSelf.rules.filter((rule) => rule.id !== 'document-sync-governance');
  assert.throws(() => validateRepositoryDocumentSyncPolicy(missingSelf), /self-protection rule/);
  const weakenedSelf = structuredClone(policy);
  weakenedSelf.rules.find((rule) => rule.id === 'document-sync-governance').required_groups = ['document_sync_governance'];
  assert.throws(() => validateRepositoryDocumentSyncPolicy(weakenedSelf), /missing required group/);
  const missingInstructionRule = structuredClone(policy);
  missingInstructionRule.rules = missingInstructionRule.rules.filter((rule) => rule.id !== 'development-instruction-governance');
  assert.throws(() => validateRepositoryDocumentSyncPolicy(missingInstructionRule), /development-instruction protection rule/);
  const weakenedInstructionRule = structuredClone(policy);
  weakenedInstructionRule.rules.find((rule) => rule.id === 'development-instruction-governance').required_groups = ['development_instruction_governance'];
  assert.throws(() => validateRepositoryDocumentSyncPolicy(weakenedInstructionRule), /development-instruction protection rule is missing required group/);
});

test('parent categories require only their own authorities while rules add requirements', () => {
  const lesson7 = evaluateRepositoryDocumentSync(policy, asRecords(['tools/lesson']));
  assert.equal(lesson7.status, 'fail');
  assert.ok(lesson7.required_groups.includes('lesson_1_7'));
  assert.equal(lesson7.required_groups.includes('lesson_1_14'), false);
  assert.equal(evaluateRepositoryDocumentSync(policy, asRecords(['tools/lesson', ...groupPaths('lesson_1_7')])).status, 'pass');

  const registry = evaluateRepositoryDocumentSync(policy, asRecords(['tools/product-repository-registry']));
  assert.ok(registry.required_groups.includes('product_registry'));
  assert.equal(registry.required_groups.includes('product_scaffold_template'), false);

  const scaffold = evaluateRepositoryDocumentSync(policy, asRecords(['templates/TEMPLATES.md']));
  assert.ok(scaffold.required_groups.includes('product_scaffold_template'));
  assert.equal(evaluateRepositoryDocumentSync(policy, asRecords(['templates/TEMPLATES.md', ...groupPaths('product_scaffold_template')])).status, 'pass');
});

test('development instruction governance is additive, cannot be exempted, and parent-only', () => {
  const result = evaluateRepositoryDocumentSync(policy, asRecords(['tools/development-instruction']));
  for (const group of ['as_built_core', 'verification', 'security', 'ci_hooks', 'development_instruction_governance']) {
    assert.ok(result.required_groups.includes(group), group);
  }
  assert.equal(result.matched_rules.find((rule) => rule.id === 'development-instruction-governance').cannot_be_exempted, true);
  assert.equal(policy.external_repository_access, false);
});

test('dashboard data and design authorities remain separate', () => {
  const data = evaluateRepositoryDocumentSync(policy, asRecords(['tools/dashboard-data']));
  assert.ok(data.required_groups.includes('dashboard_data'));
  assert.equal(data.required_groups.includes('dashboard_design'), false);
  const design = evaluateRepositoryDocumentSync(policy, asRecords(['dashboard-control-center/src/styles.css']));
  assert.ok(design.required_groups.includes('dashboard_design'));
  assert.equal(design.required_groups.includes('dashboard_data'), false);
});

test('security, external execution, browser, MCP, and evidence paths add verification and security', () => {
  for (const pathname of ['tools/product-security', 'tools/control-center-mcp', 'tools/dashboard-browser-debug-manifest', 'tools/ci-evidence']) {
    const result = evaluateRepositoryDocumentSync(policy, asRecords([pathname]));
    assert.equal(result.status, 'fail');
    assert.ok(result.required_groups.includes('security'), pathname);
    assert.ok(result.required_groups.includes('verification'), pathname);
    assert.ok(result.missing_all_of.includes('docs/workflow/PRODUCT_SECURITY_POLICY.tsv'), pathname);
    assert.ok(result.missing_all_of.includes('docs/workflow/TEST_PLAN_MANIFEST.tsv'), pathname);
  }
});

test('unknown parent implementation paths cannot silently pass while tests-only changes can', () => {
  const unknown = evaluateRepositoryDocumentSync(policy, asRecords(['tools/new-parent-runtime']));
  assert.equal(unknown.status, 'fail');
  assert.ok(unknown.required_groups.includes('workflow_pair'));
  assert.equal(evaluateRepositoryDocumentSync(policy, asRecords(['tools/new-parent-runtime', ...workflowPair])).status, 'pass');
  assert.equal(evaluateRepositoryDocumentSync(policy, asRecords(['tools/test_unrelated_refactor.sh'])).status, 'pass');
  assert.equal(evaluateRepositoryDocumentSync(policy, asRecords(['tests/unit/example.test.js'])).status, 'pass');
});

test('session memory and generated outputs neither trigger nor satisfy synchronization', () => {
  const ignored = evaluateRepositoryDocumentSync(policy, asRecords([
    'docs/memory/SESSION_MEMORY.md',
    'dist/dashboard.js',
    'dashboard-control-center/src/design-system.generated.js'
  ]));
  assert.equal(ignored.status, 'pass');
  assert.deepEqual(ignored.trigger_paths, []);
  const failed = evaluateRepositoryDocumentSync(policy, asRecords(['tools/new-parent-runtime', 'docs/memory/SESSION_MEMORY.md']));
  assert.equal(failed.status, 'fail');
});

test('rename sources trigger rules but only live destinations satisfy required documents', () => {
  const records = parseNameStatusZ(Buffer.from(
    'R100\0tools/product-security\0tools/renamed-security\0D\0docs/workflow/PRODUCT_SECURITY_POLICY.tsv\0'
  ));
  const result = evaluateRepositoryDocumentSync(policy, [
    ...records,
    ...asRecords(groupPaths('security', 'verification').filter((pathname) => pathname !== 'docs/workflow/PRODUCT_SECURITY_POLICY.tsv'))
  ]);
  assert.equal(result.status, 'fail');
  assert.ok(result.matched_rules.some((rule) => rule.id === 'security-external-execution-evidence'));
  assert.ok(result.missing_all_of.includes('docs/workflow/PRODUCT_SECURITY_POLICY.tsv'));
  assert.equal(result.satisfaction_paths.includes('tools/product-security'), false);
});

test('name-status parsing fails closed for unknown, incomplete, and control-character records', () => {
  assert.deepEqual(parseNameStatusZ(Buffer.from('R100\0old/path\0new/path\0D\0gone/path\0')), [
    { status: 'R', old_path: 'old/path', path: 'new/path' },
    { status: 'D', path: 'gone/path' }
  ]);
  assert.throws(() => parseNameStatusZ(Buffer.from('Z\0path\0')), /Unsupported git name-status/);
  assert.throws(() => parseNameStatusZ(Buffer.from('R100\0only-old\0')), /Incomplete/);
  assert.throws(() => parseNameStatusZ(Buffer.from('M\0bad\npath\0')), /printable/);
});

async function writeRepoFile(repo, pathname, content = 'fixture\n') {
  const target = path.join(repo, pathname);
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, content);
}

function runGit(repo, ...args) {
  return spawnSync('git', ['-C', repo, ...args], { encoding: 'utf8' });
}

async function createPolicyFixtureRepo() {
  const repo = await mkdtemp(path.join(tmpdir(), 'parent-document-sync-git-'));
  assert.equal(runGit(repo, 'init', '-q').status, 0);
  runGit(repo, 'config', 'user.name', 'Document Sync Test');
  runGit(repo, 'config', 'user.email', 'document-sync@example.invalid');
  await writeRepoFile(repo, 'docs/workflow/REPOSITORY_DOCUMENT_SYNC_POLICY.json', `${JSON.stringify(policy, null, 2)}\n`);
  for (const pathname of new Set([
    ...Object.values(policy.document_groups).flatMap((group) => [...(group.all_of ?? []), ...(group.any_of ?? []).flat()]),
    'AGENTS.MD',
    'docs/workflow/REPOSITORY_DOCUMENT_SYNC.md'
  ])) {
    if (pathname !== 'docs/workflow/REPOSITORY_DOCUMENT_SYNC_POLICY.json') await writeRepoFile(repo, pathname);
  }
  runGit(repo, 'add', '.');
  assert.equal(runGit(repo, 'commit', '-qm', 'base authorities').status, 0);
  return repo;
}

test('CLI distinguishes push, PR merge-base, and initial-tree ranges', async () => {
  const repo = await createPolicyFixtureRepo();
  const base = runGit(repo, 'rev-parse', 'HEAD').stdout.trim();
  await writeRepoFile(repo, 'tools/new-parent-runtime', '#!/usr/bin/env bash\n');
  runGit(repo, 'add', '.');
  runGit(repo, 'commit', '-qm', 'implementation only');
  const implementation = runGit(repo, 'rev-parse', 'HEAD').stdout.trim();
  for (const pathname of workflowPair) await writeRepoFile(repo, pathname, 'updated\n');
  runGit(repo, 'add', '.');
  runGit(repo, 'commit', '-qm', 'workflow docs');
  const head = runGit(repo, 'rev-parse', 'HEAD').stdout.trim();
  const invoke = (...args) => spawnSync(process.execPath, [checker, '--repo', repo, ...args], { encoding: 'utf8', env: childEnv });
  assert.equal(invoke('--range-mode', 'push', '--base', base, '--head', implementation).status, 1);
  assert.equal(invoke('--range-mode', 'push', '--base', base, '--head', head).status, 0);
  assert.equal(invoke('--range-mode', 'pr', '--base', base, '--head', head).status, 0);
  assert.equal(invoke('--initial-head', head).status, 0);
  assert.equal(invoke('--range-mode', 'push', '--base', '0000000000000000000000000000000000000000', '--head', head).status, 2);
});

test('registry path names are classified without external repository access', () => {
  const result = evaluateRepositoryDocumentSync(policy, asRecords([
    'learning/PRODUCT_REPOSITORY_REGISTRY.tsv',
    ...groupPaths('product_registry')
  ]));
  assert.equal(result.status, 'pass');
  assert.equal(policy.repository_scope, 'current-repository-only');
  assert.equal(policy.external_repository_access, false);
});

test('policy loader rejects a symlinked mutable policy', async () => {
  const repo = await mkdtemp(path.join(tmpdir(), 'parent-document-sync-symlink-'));
  assert.equal(runGit(repo, 'init', '-q').status, 0);
  await mkdir(path.join(repo, 'docs/workflow'), { recursive: true });
  await symlink(policyPath, path.join(repo, 'docs/workflow/REPOSITORY_DOCUMENT_SYNC_POLICY.json'));
  await assert.rejects(loadRepositoryDocumentSyncPolicy(repo), /regular non-symlink/);
});
