import { spawn } from 'node:child_process';
import { createWriteStream } from 'node:fs';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { performance } from 'node:perf_hooks';

import { validateArgv, VerificationError } from './verification_core.mjs';

const ALLOWED_KINDS = new Set(['parallel', 'serial', 'heavy', 'final-gate']);

function runnerFail(code, message, details) {
  throw new VerificationError(code, message, details);
}

function relationshipGraph(relationships, ids) {
  const graph = new Map();
  const provider = new Map();
  for (const [owner, providedValues] of relationships) {
    if (!ids.has(owner)) runnerFail('RUNNER_UNKNOWN_PROVIDER', `Relationship owner is not a compatibility check: ${owner}`);
    const provided = [...providedValues];
    for (const target of provided) {
      if (!ids.has(target)) runnerFail('RUNNER_UNKNOWN_PROVIDED', `Relationship target is not a compatibility check: ${target}`);
      if (target === owner) runnerFail('RUNNER_RELATIONSHIP_CYCLE', `Relationship cannot provide itself: ${owner}`);
      if (provider.has(target) && provider.get(target) !== owner) {
        runnerFail('RUNNER_DUPLICATE_PROVIDER', `Logical subject has more than one provider: ${target}`);
      }
      provider.set(target, owner);
    }
    graph.set(owner, provided);
  }
  const visiting = new Set();
  const visited = new Set();
  function visit(id) {
    if (visiting.has(id)) runnerFail('RUNNER_RELATIONSHIP_CYCLE', `Relationship cycle includes: ${id}`);
    if (visited.has(id)) return;
    visiting.add(id);
    for (const target of graph.get(id) ?? []) visit(target);
    visiting.delete(id);
    visited.add(id);
  }
  for (const id of ids) visit(id);
  return { graph, provider };
}

function stagesFor(tasks) {
  const stages = [];
  let parallel = [];
  let sawFinal = false;
  function flushParallel() {
    if (parallel.length) stages.push(Object.freeze({ kind: 'parallel', tasks: Object.freeze(parallel) }));
    parallel = [];
  }
  for (const task of tasks) {
    if (sawFinal) runnerFail('RUNNER_FINAL_ORDER', `Task appears after the final gate: ${task.id}`);
    if (task.kind === 'parallel') {
      parallel.push(task);
      continue;
    }
    flushParallel();
    if (task.kind === 'final-gate') sawFinal = true;
    stages.push(Object.freeze({ kind: task.kind, tasks: Object.freeze([task]) }));
  }
  flushParallel();
  return Object.freeze(stages);
}

export function buildExecutionPlan({ hooks, groups, relationships = new Map(), mode }) {
  if (!mode || !Array.isArray(hooks) || !Array.isArray(groups)) runnerFail('RUNNER_INPUT', 'Hooks, groups, and mode are required');
  const selected = hooks.filter((hook) => hook.modes.includes(mode));
  const compatibilityIds = selected.map((hook) => hook.id);
  const ids = new Set(compatibilityIds);
  if (ids.size !== compatibilityIds.length) runnerFail('RUNNER_DUPLICATE_CHECK', 'Compatibility hook IDs must be unique');
  const classifications = new Map();
  for (const row of groups) {
    if (classifications.has(row.id)) runnerFail('RUNNER_DUPLICATE_CLASSIFICATION', `Duplicate execution classification: ${row.id}`);
    if (!ALLOWED_KINDS.has(row.kind)) runnerFail('RUNNER_KIND', `Unknown execution kind for ${row.id}: ${row.kind}`);
    classifications.set(row.id, row);
  }
  for (const hook of selected) {
    if (!classifications.has(hook.id)) runnerFail('RUNNER_UNCLASSIFIED', `Compatibility check is not explicitly classified: ${hook.id}`);
    validateArgv(hook.argv);
  }
  const relevantRelationships = new Map();
  for (const [owner, targets] of relationships) {
    const relevantTargets = targets.filter((target) => ids.has(target));
    if (!ids.has(owner) && relevantTargets.length === 0) continue;
    if (!ids.has(owner)) runnerFail('RUNNER_UNKNOWN_PROVIDER', `Relationship owner is absent while a provided subject is selected: ${owner}`);
    const missingTargets = targets.filter((target) => !ids.has(target));
    if (missingTargets.length) runnerFail('RUNNER_UNKNOWN_PROVIDED', `Relationship target is absent from the selected catalog: ${missingTargets[0]}`);
    relevantRelationships.set(owner, targets);
  }
  const { graph, provider } = relationshipGraph(relevantRelationships, ids);
  const selectedOwners = new Set([...graph.keys()].filter((owner) => ids.has(owner)));
  const omitted = new Set();
  for (const [target, owner] of provider) if (selectedOwners.has(owner)) omitted.add(target);

  const tasks = selected
    .filter((hook) => !omitted.has(hook.id))
    .map((hook, order) => {
      const classification = classifications.get(hook.id);
      const provides = (graph.get(hook.id) ?? []).filter((target) => ids.has(target));
      if (classification.kind === 'final-gate' && provides.length) {
        runnerFail('RUNNER_FINAL_PROVIDER', `Final gate cannot provide another logical subject: ${hook.id}`);
      }
      return Object.freeze({
        ...hook,
        order,
        argv: Object.freeze(validateArgv(hook.argv)),
        kind: classification.kind,
        group: classification.group,
        locks: Object.freeze([...new Set(hook.locks ?? (classification.kind === 'heavy' ? ['heavy'] : []))].sort()),
        provides: Object.freeze(provides),
      });
    });
  return Object.freeze({
    mode,
    compatibilityIds: Object.freeze(compatibilityIds),
    executionIds: Object.freeze(tasks.map((task) => task.id)),
    compatibilityCount: compatibilityIds.length,
    executionCount: tasks.length,
    tasks: Object.freeze(tasks),
    stages: stagesFor(tasks),
  });
}

function positiveInteger(value, label) {
  if (!Number.isSafeInteger(value) || value <= 0) runnerFail('RUNNER_LIMIT', `${label} must be a positive integer`);
  return value;
}

function killProcessGroup(child, signal) {
  if (!child?.pid) return;
  try {
    if (process.platform !== 'win32') process.kill(-child.pid, signal);
    else child.kill(signal);
  } catch (error) {
    if (error?.code !== 'ESRCH') throw error;
  }
}

async function executeTask({ task, root, environment, logDirectory, timeoutMs, cancellationGraceMs, maxLogBytes }) {
  const started = performance.now();
  const logFile = path.join(logDirectory, `${String(task.order).padStart(4, '0')}-${task.id.replace(/[^A-Za-z0-9_.-]/g, '_')}.log`);
  const stream = createWriteStream(logFile, { flags: 'wx', mode: 0o600 });
  let child;
  let bytes = 0;
  let settled = false;
  let cancellationReason = null;
  let timeoutHandle;
  let forceHandle;

  const completion = new Promise((resolve) => {
    const finish = (code, signal, spawnError = null) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeoutHandle);
      clearTimeout(forceHandle);
      stream.end(() => {
        let status;
        if (spawnError) status = 'spawn-error';
        else if (cancellationReason) status = cancellationReason;
        else status = code === 0 ? 'success' : 'failed';
        resolve({
          id: task.id,
          status,
          exitCode: code,
          signal,
          startedAtMs: started,
          endedAtMs: performance.now(),
          durationMs: performance.now() - started,
          logFile,
          error: spawnError?.message,
        });
      });
    };

    try {
      child = spawn(task.argv[0], task.argv.slice(1), {
        cwd: root,
        env: { ...process.env, ...environment, ...(task.environment ?? {}) },
        detached: process.platform !== 'win32',
        stdio: ['ignore', 'pipe', 'pipe'],
      });
    } catch (error) {
      finish(null, null, error);
      return;
    }

    const consume = (chunk) => {
      if (settled) return;
      bytes += chunk.length;
      if (bytes <= maxLogBytes) stream.write(chunk);
      if (bytes > maxLogBytes && !cancellationReason) {
        cancellationReason = 'output-limit';
        stream.write(Buffer.from('\nverification output limit exceeded\n'));
        killProcessGroup(child, 'SIGTERM');
        forceHandle = setTimeout(() => killProcessGroup(child, 'SIGKILL'), cancellationGraceMs);
      }
    };
    child.stdout.on('data', consume);
    child.stderr.on('data', consume);
    child.once('error', (error) => finish(null, null, error));
    child.once('close', (code, signal) => finish(code, signal));
    const effectiveTimeout = task.timeoutMs ?? timeoutMs;
    timeoutHandle = setTimeout(() => {
      if (settled || cancellationReason) return;
      cancellationReason = 'timed-out';
      killProcessGroup(child, 'SIGTERM');
      forceHandle = setTimeout(() => killProcessGroup(child, 'SIGKILL'), cancellationGraceMs);
    }, effectiveTimeout);
  });

  return {
    task,
    completion,
    cancel(reason = 'cancelled') {
      if (settled || cancellationReason) return;
      cancellationReason = reason;
      killProcessGroup(child, 'SIGTERM');
      forceHandle = setTimeout(() => killProcessGroup(child, 'SIGKILL'), cancellationGraceMs);
    },
  };
}

async function runStage({ stage, root, environment, logDirectory, maxJobs, timeoutMs, cancellationGraceMs, maxLogBytes, resultMap, counters, signal }) {
  const pending = [...stage.tasks];
  const active = new Map();
  const activeLocks = new Set();
  let failure = null;
  const abort = () => {
    if (!failure) failure = { id: 'signal', status: 'cancelled', error: 'Verification run was interrupted' };
    for (const entry of active.values()) entry.cancel('cancelled');
  };
  signal?.addEventListener('abort', abort, { once: true });

  function availableIndex() {
    return pending.findIndex((task) => task.locks.every((lock) => !activeLocks.has(lock)));
  }

  async function startAvailable() {
    while (!failure && active.size < maxJobs && pending.length) {
      const index = availableIndex();
      if (index < 0) break;
      const [task] = pending.splice(index, 1);
      for (const lock of task.locks) activeLocks.add(lock);
      const entry = await executeTask({ task, root, environment, logDirectory, timeoutMs, cancellationGraceMs, maxLogBytes });
      active.set(task.id, entry);
      counters.maxObservedConcurrency = Math.max(counters.maxObservedConcurrency, active.size);
    }
  }

  if (signal?.aborted) abort();
  await startAvailable();
  while (active.size) {
    const completed = await Promise.race(
      [...active.values()].map((entry) => entry.completion.then((result) => ({ entry, result }))),
    );
    active.delete(completed.entry.task.id);
    for (const lock of completed.entry.task.locks) activeLocks.delete(lock);
    resultMap.set(completed.result.id, completed.result);
    if (completed.result.status !== 'success' && !failure) {
      failure = completed.result;
      for (const entry of active.values()) entry.cancel('cancelled');
    }
    if (!failure) await startAvailable();
  }
  signal?.removeEventListener('abort', abort);
  return failure;
}

export async function runExecutionPlan({
  plan,
  root,
  maxJobs = 1,
  timeoutMs = 900_000,
  cancellationGraceMs = 5_000,
  maxLogBytes = 8 * 1024 * 1024,
  environment = {},
  onBeforeFinalGate,
  signal,
} = {}) {
  positiveInteger(maxJobs, 'maxJobs');
  positiveInteger(timeoutMs, 'timeoutMs');
  positiveInteger(cancellationGraceMs, 'cancellationGraceMs');
  positiveInteger(maxLogBytes, 'maxLogBytes');
  if (!plan?.tasks || !plan?.stages) runnerFail('RUNNER_PLAN', 'A validated execution plan is required');
  const resolvedRoot = path.resolve(root ?? process.cwd());
  const logDirectory = await mkdtemp(path.join(os.tmpdir(), 'verification-run-'));
  const resultMap = new Map(plan.tasks.map((task) => [task.id, { id: task.id, status: 'not-started' }]));
  const counters = { maxObservedConcurrency: 0 };
  const started = performance.now();
  let failure = null;
  const localController = signal ? null : new AbortController();
  const effectiveSignal = signal ?? localController.signal;
  const interrupt = () => localController?.abort();
  if (localController) {
    process.once('SIGINT', interrupt);
    process.once('SIGTERM', interrupt);
  }

  try {
    for (const stage of plan.stages) {
      if (failure) break;
      if (stage.kind === 'final-gate' && onBeforeFinalGate) {
        try {
          await onBeforeFinalGate({ plan, results: [...resultMap.values()] });
        } catch (error) {
          failure = { id: 'pre-final-gate', status: 'failed', error: error?.message ?? String(error) };
          break;
        }
      }
      failure = await runStage({
        stage,
        root: resolvedRoot,
        environment,
        logDirectory,
        maxJobs: stage.kind === 'parallel' ? maxJobs : 1,
        timeoutMs,
        cancellationGraceMs,
        maxLogBytes,
        resultMap,
        counters,
        signal: effectiveSignal,
      });
    }

    const results = [];
    let output = '';
    for (const task of plan.tasks) {
      const result = resultMap.get(task.id);
      if (result?.logFile) {
        try {
          result.output = await readFile(result.logFile, 'utf8');
        } catch {
          result.output = '';
        }
      }
      if (result?.output) output += result.output;
      results.push(result);
    }
    return Object.freeze({
      ok: !failure,
      failedTaskId: failure?.id ?? null,
      failure,
      results: Object.freeze(results),
      output,
      durationMs: performance.now() - started,
      maxObservedConcurrency: counters.maxObservedConcurrency,
    });
  } finally {
    if (localController) {
      process.removeListener('SIGINT', interrupt);
      process.removeListener('SIGTERM', interrupt);
    }
    await rm(logDirectory, { recursive: true, force: true });
  }
}
