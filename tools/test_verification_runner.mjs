#!/usr/bin/env node

import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { buildExecutionPlan, runExecutionPlan } from './lib/verification_runner.mjs';
import { VerificationError } from './lib/verification_core.mjs';

async function fixture() {
  const root = await mkdtemp(path.join(os.tmpdir(), 'verification-runner-'));
  const helper = path.join(root, 'helper.mjs');
  await writeFile(
    helper,
    `import { appendFileSync, writeFileSync } from 'node:fs';
import { spawn } from 'node:child_process';
const [mode, label, delayRaw, events, extra] = process.argv.slice(2);
const delay = Number(delayRaw);
const emit = (event) => appendFileSync(events, JSON.stringify({event,label,time:Date.now(),pid:process.pid}) + '\\n');
if (mode === 'child-marker') {
  setTimeout(() => { writeFileSync(extra, 'leaked\\n'); process.exit(0); }, delay);
} else {
  emit('start');
  if (mode === 'tree') spawn(process.execPath, [new URL(import.meta.url).pathname, 'child-marker', label, '1200', events, extra], {stdio:'ignore'});
  setTimeout(() => {
    writeFileSync(1, (mode === 'spam' ? label.repeat(4096) : label + ' output') + '\\n');
    emit('finish');
    process.exit(mode === 'fail' ? 7 : 0);
  }, delay);
}
`,
  );
  return { root, helper, events: path.join(root, 'events.jsonl') };
}

function hook(id, argv, options = {}) {
  return {
    id,
    modes: ['full'],
    command: argv.join(' '),
    argv,
    description: `${id} fixture`,
    locks: options.locks ?? [],
    timeoutMs: options.timeoutMs,
  };
}

function group(id, kind = 'parallel', name = 'fixture') {
  return { id, group: name, kind, description: `${id} ${kind}` };
}

async function events(file) {
  try {
    return (await readFile(file, 'utf8')).trim().split('\n').filter(Boolean).map((line) => JSON.parse(line));
  } catch (error) {
    if (error?.code === 'ENOENT') return [];
    throw error;
  }
}

test('plan preserves compatibility ids and removes only declared provided execution', () => {
  const hooks = [
    hook('docs', ['./docs']),
    hook('sync', ['./sync']),
    hook('final', ['./final']),
  ];
  const groups = [group('docs'), group('sync'), group('final', 'final-gate', 'final')];
  const relationships = new Map([['docs', ['sync']]]);
  const plan = buildExecutionPlan({ hooks, groups, relationships, mode: 'full' });
  assert.deepEqual(plan.compatibilityIds, ['docs', 'sync', 'final']);
  assert.deepEqual(plan.executionIds, ['docs', 'final']);
  assert.deepEqual(plan.tasks[0].provides, ['sync']);
  assert.equal(plan.compatibilityCount, 3);
  assert.equal(plan.executionCount, 2);
});

test('plan rejects unclassified checks, duplicate providers, cycles, and unsafe argv', () => {
  const hooks = [hook('a', ['./a']), hook('b', ['./b'])];
  assert.throws(
    () => buildExecutionPlan({ hooks, groups: [group('a')], relationships: new Map(), mode: 'full' }),
    (error) => error instanceof VerificationError && error.code === 'RUNNER_UNCLASSIFIED',
  );
  assert.throws(
    () => buildExecutionPlan({
      hooks,
      groups: [group('a'), group('b')],
      relationships: new Map([['a', ['b']], ['b', ['a']]]),
      mode: 'full',
    }),
    (error) => error instanceof VerificationError && error.code === 'RUNNER_RELATIONSHIP_CYCLE',
  );
  const hooksWithThird = [...hooks, hook('c', ['./c'])];
  assert.throws(
    () => buildExecutionPlan({
      hooks: hooksWithThird,
      groups: [group('a'), group('b'), group('c')],
      relationships: new Map([['a', ['c']], ['b', ['c']]]),
      mode: 'full',
    }),
    (error) => error instanceof VerificationError && error.code === 'RUNNER_DUPLICATE_PROVIDER',
  );
  assert.throws(
    () => buildExecutionPlan({
      hooks: [hook('a', ['bash', '-c', 'echo unsafe'])],
      groups: [group('a')],
      relationships: new Map(),
      mode: 'full',
    }),
    (error) => error instanceof VerificationError && error.code === 'UNSAFE_ARGV',
  );
});

test('rolling pool overlaps work and replays output in catalog order', async () => {
  const { root, helper, events: eventFile } = await fixture();
  const hooks = [
    hook('slow_a', [process.execPath, helper, 'pass', 'A', '500', eventFile]),
    hook('fast_b', [process.execPath, helper, 'pass', 'B', '30', eventFile]),
    hook('slow_c', [process.execPath, helper, 'pass', 'C', '100', eventFile]),
  ];
  const plan = buildExecutionPlan({ hooks, groups: hooks.map(({ id }) => group(id)), relationships: new Map(), mode: 'full' });
  const run = await runExecutionPlan({ plan, root, maxJobs: 2, timeoutMs: 2000, cancellationGraceMs: 100 });
  assert.equal(run.ok, true);
  assert.equal(run.maxObservedConcurrency, 2);
  const observed = await events(eventFile);
  const time = (label, event) => observed.find((row) => row.label === label && row.event === event)?.time;
  assert.ok(time('C', 'start') < time('A', 'finish'), 'third task waited for the entire first wave');
  assert.ok(run.output.indexOf('A output') < run.output.indexOf('B output'), `unexpected replay output: ${JSON.stringify(run.output)}`);
  assert.ok(run.output.indexOf('B output') < run.output.indexOf('C output'), `unexpected replay output: ${JSON.stringify(run.output)}`);
});

test('resource locks serialize conflicting tasks while unrelated work can proceed', async () => {
  const { root, helper, events: eventFile } = await fixture();
  const hooks = [
    hook('locked_a', [process.execPath, helper, 'pass', 'A', '150', eventFile], { locks: ['shared'] }),
    hook('locked_b', [process.execPath, helper, 'pass', 'B', '150', eventFile], { locks: ['shared'] }),
    hook('free_c', [process.execPath, helper, 'pass', 'C', '150', eventFile]),
  ];
  const plan = buildExecutionPlan({ hooks, groups: hooks.map(({ id }) => group(id)), relationships: new Map(), mode: 'full' });
  const run = await runExecutionPlan({ plan, root, maxJobs: 3, timeoutMs: 2000, cancellationGraceMs: 100 });
  assert.equal(run.ok, true);
  const observed = await events(eventFile);
  const byLabel = Object.fromEntries(['A', 'B', 'C'].map((label) => [label, Object.fromEntries(observed.filter((row) => row.label === label).map((row) => [row.event, row.time]))]));
  assert.ok(byLabel.B.start >= byLabel.A.finish || byLabel.A.start >= byLabel.B.finish);
  assert.ok(byLabel.C.start < Math.max(byLabel.A.finish, byLabel.B.finish));
});

test('first failure cancels the active process group and its descendants', async () => {
  const { root, helper, events: eventFile } = await fixture();
  const marker = path.join(root, 'child-marker.txt');
  const hooks = [
    hook('tree', [process.execPath, helper, 'tree', 'TREE', '4000', eventFile, marker]),
    hook('fail', [process.execPath, helper, 'fail', 'FAIL', '50', eventFile]),
    hook('never', [process.execPath, helper, 'pass', 'NEVER', '10', eventFile]),
  ];
  const plan = buildExecutionPlan({ hooks, groups: hooks.map(({ id }) => group(id)), relationships: new Map(), mode: 'full' });
  const run = await runExecutionPlan({ plan, root, maxJobs: 2, timeoutMs: 5000, cancellationGraceMs: 100 });
  assert.equal(run.ok, false);
  assert.equal(run.failedTaskId, 'fail');
  assert.ok(run.durationMs < 1000, `cancelled run took ${run.durationMs}ms`);
  assert.equal(run.results.find((result) => result.id === 'never').status, 'not-started');
  await new Promise((resolve) => setTimeout(resolve, 1300));
  await assert.rejects(readFile(marker), (error) => error?.code === 'ENOENT');
});

test('timeout and output limits fail closed', async () => {
  const { root, helper, events: eventFile } = await fixture();
  const hooks = [hook('timeout', [process.execPath, helper, 'pass', 'LATE', '500', eventFile], { timeoutMs: 40 })];
  const plan = buildExecutionPlan({ hooks, groups: [group('timeout')], relationships: new Map(), mode: 'full' });
  const run = await runExecutionPlan({ plan, root, maxJobs: 1, timeoutMs: 1000, cancellationGraceMs: 50, maxLogBytes: 1024 });
  assert.equal(run.ok, false);
  assert.equal(run.results[0].status, 'timed-out');

  const spamHooks = [hook('spam', [process.execPath, helper, 'spam', 'X', '1', eventFile])];
  const spamPlan = buildExecutionPlan({ hooks: spamHooks, groups: [group('spam')], relationships: new Map(), mode: 'full' });
  const spamRun = await runExecutionPlan({ plan: spamPlan, root, maxJobs: 1, timeoutMs: 1000, cancellationGraceMs: 50, maxLogBytes: 128 });
  assert.equal(spamRun.ok, false, `spam result: ${JSON.stringify(spamRun)}`);
  assert.equal(spamRun.results[0].status, 'output-limit');
});

test('an abort signal cancels active work and leaves pending work unstarted', async () => {
  const { root, helper, events: eventFile } = await fixture();
  const hooks = [
    hook('active', [process.execPath, helper, 'pass', 'ACTIVE', '2000', eventFile]),
    hook('pending', [process.execPath, helper, 'pass', 'PENDING', '20', eventFile]),
  ];
  const plan = buildExecutionPlan({ hooks, groups: hooks.map(({ id }) => group(id)), relationships: new Map(), mode: 'full' });
  const controller = new AbortController();
  setTimeout(() => controller.abort(), 40);
  const run = await runExecutionPlan({
    plan,
    root,
    maxJobs: 1,
    timeoutMs: 3000,
    cancellationGraceMs: 50,
    signal: controller.signal,
  });
  assert.equal(run.ok, false);
  assert.equal(run.failedTaskId, 'signal');
  assert.equal(run.results[0].status, 'cancelled');
  assert.equal(run.results[1].status, 'not-started');
});
