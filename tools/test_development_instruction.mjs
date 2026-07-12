#!/usr/bin/env node

import {
  chmodSync,
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  DevelopmentInstructionError,
  resolveDevelopmentInstruction,
} from './lib/development_instruction.mjs';

const SOURCE_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TEMP_ROOT = mkdtempSync(path.join(tmpdir(), 'development-instruction-'));

function ensureParent(file) {
  mkdirSync(path.dirname(file), { recursive: true });
}

function copy(relative, root) {
  const destination = path.join(root, relative);
  ensureParent(destination);
  copyFileSync(path.join(SOURCE_ROOT, relative), destination);
}

function write(relative, value, root) {
  const destination = path.join(root, relative);
  ensureParent(destination);
  writeFileSync(destination, value);
}

function localMemory(extra = '') {
  return [
    '# Local Instruction Memory',
    '',
    '## A. Proposal / 提案',
    'local A',
    '## B. Plan / 計画',
    'local B',
    '## C. Implementation / 実装',
    'local C',
    '## D. Git / Git',
    'local D',
    '## E. Next / 次',
    'local E',
    '## F. Roadmap / 道筋',
    'local F',
    extra,
    '',
  ].join('\n');
}

function configuredInstructionLimit(root) {
  const policy = readFileSync(path.join(root, 'docs/workflow/DEVELOPMENT_INSTRUCTION_POLICY.tsv'), 'utf8');
  const row = policy.split(/\r?\n/).find((line) => line.startsWith('maximum_instruction_bytes\t'));
  return Number(row.split('\t')[1]);
}

function createFixture() {
  const root = path.join(TEMP_ROOT, 'parent-' + Math.random().toString(16).slice(2));
  const product = path.join(TEMP_ROOT, 'product-' + Math.random().toString(16).slice(2));
  mkdirSync(root, { recursive: true });
  mkdirSync(product, { recursive: true });
  for (const relative of [
    'docs/workflow/DEVELOPMENT_INSTRUCTION_POLICY.tsv',
    'docs/workflow/DEVELOPMENT_AUTONOMY_WORKFLOW.tsv',
    'docs/workflow/INSTRUCTION_MEMORY.md',
    'docs/workflow/REPOSITORY_DEVELOPMENT_WORKFLOW.tsv',
    'learning/context/WORKFLOW_CONTEXT_MAP.tsv',
    'docs/workflow/MENU_PRODUCT_PROFILE_POLICY.tsv',
    'docs/workflow/GIT_WORKFLOW_POLICY.tsv',
    'learning/GIT_WORKFLOW_SETTINGS.tsv',
    'docs/workflow/PRODUCT_WORKFLOW_GIT_USAGE_POLICY.tsv',
  ]) copy(relative, root);
  write('learning/PRODUCT_WORKFLOW_GIT_USAGE_SETTINGS.tsv', '# context\tmode\tselected_at\n', root);
  write('learning/PRODUCT_REPOSITORY_REGISTRY.tsv', [
    '# repo_id\tprimary_menu_id\tallowed_contexts\tdisplay_name\trepository_path\tproduct_type\tsource',
    'fixture\tfree-development\tfree-development|product-improvement|external-integration\tFixture\t' + product + '\tall\texplicit',
    '',
  ].join('\n'), root);
  write('learning/PRODUCT_REPOSITORY_SELECTION.tsv', [
    '# menu_id\trepo_id\tselected_at\tselection_source',
    'free-development\tfixture\t2026-01-01T00:00:00Z\tcli',
    '',
  ].join('\n'), root);
  write('AGENTS.MD', '# Product AGENTS\n', product);
  write('ops/PRODUCT_OPERATION_MODE.tsv', [
    '# key\tvalue',
    'workflow_mode\tparent_managed',
    'managed_by_parent\ttrue',
    '',
  ].join('\n'), product);
  return { root, product };
}

function expect(condition, message) {
  if (!condition) throw new Error(message);
}

function expectCode(code, callback) {
  try {
    callback();
  } catch (error) {
    if (error instanceof DevelopmentInstructionError && error.code === code) return;
    throw new Error('Expected ' + code + ', received ' + String(error?.code || error));
  }
  throw new Error('Expected failure did not occur: ' + code);
}

function resolveProduct(fixture, options = {}) {
  return resolveDevelopmentInstruction({
    root: fixture.root,
    contextId: 'free-development',
    repo: fixture.product,
    gitTopLevelResolver: (target) => target,
    ...options,
  });
}

function resolveParent(fixture, options = {}) {
  return resolveDevelopmentInstruction({
    root: fixture.root,
    targetKind: 'parent',
    gitTopLevelResolver: (target) => target,
    ...options,
  });
}

try {
  {
    const fixture = createFixture();
    const result = resolveParent(fixture, {
      stage: 'D',
      scopeId: 'fixture-scope',
    });
    expect(result.status === 'ready', 'parent fallback was not ready');
    expect(result.activation_mode === 'enforce', 'parent fixture did not use enforce activation');
    expect(result.source === 'parent_fallback', 'parent source must be fallback');
    expect(result.stage_policy.repository_phases.join('|') === 'release_gate|main_sync_cleanup', 'D mapping changed');
    expect(result.git_plan.automatic.includes('commit'), 'task-scoped D did not enable configured commit');
    expect(!JSON.stringify(result).includes(fixture.root), 'safe result leaked parent absolute path');
  }

  {
    const fixture = createFixture();
    rmSync(path.join(fixture.root, 'learning/PRODUCT_REPOSITORY_REGISTRY.tsv'));
    rmSync(path.join(fixture.root, 'learning/PRODUCT_REPOSITORY_SELECTION.tsv'));
    const result = resolveDevelopmentInstruction({ root: fixture.root, contextId: 'step_1_7' });
    expect(result.status === 'not_applicable', 'lesson context must be not_applicable');
  }

  {
    const fixture = createFixture();
    const result = resolveProduct(fixture, { stage: 'C', scopeId: 'fixture-scope' });
    expect(result.source === 'parent_fallback', 'missing local memory must use parent fallback');
    expect(result.workflow_skill === 'product-development-workflow', 'product workflow skill mapping changed');
  }

  {
    const fixture = createFixture();
    write('docs/workflow/INSTRUCTION_MEMORY.md', localMemory('## Notes\nallowed extra heading'), fixture.product);
    const result = resolveProduct(fixture, { stage: 'C', scopeId: 'fixture-scope' });
    expect(result.source === 'local', 'valid local memory did not take priority');
    expect(result.source_profile === 'local_compatibility', 'versionless local memory did not use compatibility profile');
    expect(result.stage_policy === null, 'parent autonomy policy overrode local instruction procedure');
    const localD = resolveProduct(fixture, { stage: 'D', scopeId: 'fixture-scope' });
    expect(localD.git_plan.automatic.length === 0, 'parent Git autonomy overrode local D procedure');
    expect(localD.git_plan.decision_authority === 'local_instruction', 'local D authority was not explicit');
  }

  for (const invalid of [
    localMemory().replace('## F. Roadmap / 道筋', '## Notes'),
    localMemory() + '\n## A. Duplicate\n',
  ]) {
    const fixture = createFixture();
    write('docs/workflow/INSTRUCTION_MEMORY.md', invalid, fixture.product);
    expectCode('INSTRUCTION_STAGE', () => resolveProduct(fixture));
  }

  {
    const fixture = createFixture();
    write('docs/workflow/INSTRUCTION_MEMORY.md', 'Instruction-Memory-Version: 9.9.9\n' + localMemory(), fixture.product);
    expectCode('INSTRUCTION_VERSION', () => resolveProduct(fixture));
  }

  {
    const fixture = createFixture();
    const target = path.join(fixture.product, 'local-memory.md');
    writeFileSync(target, localMemory());
    ensureParent(path.join(fixture.product, 'docs/workflow/INSTRUCTION_MEMORY.md'));
    symlinkSync(target, path.join(fixture.product, 'docs/workflow/INSTRUCTION_MEMORY.md'));
    expectCode('FILE_SYMLINK', () => resolveProduct(fixture));
  }

  {
    const fixture = createFixture();
    mkdirSync(path.join(fixture.product, 'docs/workflow/INSTRUCTION_MEMORY.md'), { recursive: true });
    expectCode('FILE_TYPE', () => resolveProduct(fixture));
  }

  {
    const fixture = createFixture();
    write('docs/workflow/INSTRUCTION_MEMORY.md', Buffer.concat([Buffer.from(localMemory()), Buffer.from([0])]), fixture.product);
    expectCode('FILE_NUL', () => resolveProduct(fixture));
  }

  {
    const fixture = createFixture();
    write('docs/workflow/INSTRUCTION_MEMORY.md', Buffer.from([0xc3, 0x28]), fixture.product);
    expectCode('FILE_ENCODING', () => resolveProduct(fixture));
  }

  {
    const fixture = createFixture();
    write('docs/workflow/INSTRUCTION_MEMORY.md', localMemory() + 'x'.repeat(configuredInstructionLimit(fixture.root) + 1), fixture.product);
    expectCode('FILE_OVERSIZED', () => resolveProduct(fixture));
  }

  {
    const fixture = createFixture();
    write('ops/PRODUCT_OPERATION_MODE.tsv', '# key\tvalue\nworkflow_mode\tstandalone\nmanaged_by_parent\tfalse\n', fixture.product);
    expectCode('PRODUCT_MODE', () => resolveProduct(fixture));
  }

  {
    const fixture = createFixture();
    write('learning/PRODUCT_REPOSITORY_SELECTION.tsv', '# menu_id\trepo_id\tselected_at\tselection_source\n', fixture.root);
    expectCode('SELECTION_REQUIRED', () => resolveProduct(fixture));
  }

  {
    const fixture = createFixture();
    const other = path.join(TEMP_ROOT, 'other-' + Math.random().toString(16).slice(2));
    mkdirSync(other);
    expectCode('REGISTRY_MISMATCH', () => resolveProduct(fixture, { repo: other }));
  }

  {
    const fixture = createFixture();
    const nested = path.join(fixture.product, 'nested');
    mkdirSync(nested);
    write('AGENTS.MD', '# nested\n', nested);
    write('ops/PRODUCT_OPERATION_MODE.tsv', '# key\tvalue\nworkflow_mode\tparent_managed\nmanaged_by_parent\ttrue\n', nested);
    write('learning/PRODUCT_REPOSITORY_REGISTRY.tsv', [
      '# repo_id\tprimary_menu_id\tallowed_contexts\tdisplay_name\trepository_path\tproduct_type\tsource',
      'fixture\tfree-development\tfree-development\tFixture\t' + nested + '\tall\texplicit',
      '',
    ].join('\n'), fixture.root);
    expectCode('GIT_TOPLEVEL', () => resolveProduct(fixture, {
      repo: nested,
      gitTopLevelResolver: () => fixture.product,
    }));
  }

  {
    const fixture = createFixture();
    const policyFile = path.join(fixture.root, 'docs/workflow/DEVELOPMENT_INSTRUCTION_POLICY.tsv');
    writeFileSync(policyFile, readFileSync(policyFile, 'utf8').replace(
      'local_instruction_path\tdocs/workflow/INSTRUCTION_MEMORY.md',
      'local_instruction_path\t../INSTRUCTION_MEMORY.md',
    ));
    expectCode('POLICY_PATH', () => resolveProduct(fixture));
  }

  {
    const fixture = createFixture();
    const policyFile = path.join(fixture.root, 'docs/workflow/DEVELOPMENT_INSTRUCTION_POLICY.tsv');
    const realPolicy = path.join(fixture.root, 'policy-real.tsv');
    copyFileSync(policyFile, realPolicy);
    rmSync(policyFile);
    symlinkSync(realPolicy, policyFile);
    expectCode('FILE_SYMLINK', () => resolveParent(fixture));
  }

  {
    const fixture = createFixture();
    expectCode('TASK_SCOPE', () => resolveProduct(fixture, { stage: 'D', scopeId: '../unsafe' }));
    const result = resolveProduct(fixture, { stage: 'D' });
    expect(result.git_plan.automatic.length === 0, 'D became automatic without task scope');
    expect(result.git_plan.manual.includes('commit'), 'D did not preserve manual commit without task scope');
  }

  for (const [mode, expectedAutomatic, expectedNotApplicable] of [
    ['none', [], ['commit']],
    ['local', ['commit'], ['push']],
    ['remote_sync', ['commit', 'push', 'sync_monitoring'], ['pr_creation']],
    ['ci', ['commit', 'push', 'pr_creation'], []],
  ]) {
    const fixture = createFixture();
    write('learning/PRODUCT_WORKFLOW_GIT_USAGE_SETTINGS.tsv', [
      '# context\tmode\tselected_at',
      'free-development\t' + mode + '\t2026-01-01T00:00:00Z',
      '',
    ].join('\n'), fixture.root);
    const result = resolveProduct(fixture, { stage: 'D', scopeId: 'fixture-scope' });
    for (const action of expectedAutomatic) expect(result.git_plan.automatic.includes(action), mode + ' omitted ' + action);
    for (const action of expectedNotApplicable) expect(result.git_plan.not_applicable.includes(action), mode + ' wrongly applied ' + action);
  }

  {
    const fixture = createFixture();
    const memory = path.join(fixture.root, 'docs/workflow/INSTRUCTION_MEMORY.md');
    writeFileSync(memory, readFileSync(memory, 'utf8').replace('workflow-rule:workflow-evidence', 'workflow-rule:missing'));
    expectCode('INSTRUCTION_ANCHOR', () => resolveParent(fixture));
  }

  {
    const fixture = createFixture();
    rmSync(path.join(fixture.root, 'learning/PRODUCT_REPOSITORY_REGISTRY.tsv'));
    rmSync(path.join(fixture.root, 'learning/PRODUCT_REPOSITORY_SELECTION.tsv'));
    const result = resolveParent(fixture);
    expect(result.status === 'ready', 'parent check traversed product registry');
  }

  process.stdout.write('Development instruction tests passed.\n');
} finally {
  chmodSync(TEMP_ROOT, 0o700);
  rmSync(TEMP_ROOT, { recursive: true, force: true });
}
