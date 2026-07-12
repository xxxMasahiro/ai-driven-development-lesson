import { execFileSync } from 'node:child_process';
import { lstat, mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';

import {
  fingerprintRepository,
  loadExecutionPolicy,
  resolvePolicyLocator,
  validateArgv,
  verificationDigest,
  VerificationError,
} from './verification_core.mjs';
import { loadGitHookExecution } from './verification_git_hooks.mjs';
import { buildExecutionPlan, runExecutionPlan } from './verification_runner.mjs';

const GRAPH_ROLES = new Set(['auxiliary', 'owner', 'proof', 'final']);
const COVERAGE_SCOPES = new Set(['full', 'compatibility']);

function fail(code, message) {
  throw new VerificationError(code, message);
}

function safeRelative(value, label) {
  if (typeof value !== 'string' || !value || value.includes('\0') || path.isAbsolute(value)) fail('CI_GRAPH_PATH', `${label} must be repository-relative`);
  const normalized = path.posix.normalize(value.replaceAll('\\', '/')).replace(/^\.\//, '');
  if (!normalized || normalized === '..' || normalized.startsWith('../')) fail('CI_GRAPH_PATH', `${label} escapes the repository`);
  return normalized;
}

async function readAuthority(file, label) {
  await rejectSymlinkAncestors(path.resolve(file), label);
  const info = await lstat(file).catch((error) => {
    if (error?.code === 'ENOENT') fail('CI_AUTHORITY_MISSING', `${label} is missing`);
    throw error;
  });
  if (info.isSymbolicLink()) fail('CI_AUTHORITY_SYMLINK', `${label} must not be a symbolic link`);
  if (!info.isFile()) fail('CI_AUTHORITY_TYPE', `${label} must be a regular file`);
  const value = await readFile(file, 'utf8');
  const after = await lstat(file);
  if (info.dev !== after.dev || info.ino !== after.ino || info.size !== after.size || info.mtimeMs !== after.mtimeMs) fail('CI_AUTHORITY_CHANGED', `${label} changed while it was read`);
  return value;
}

async function rejectSymlinkAncestors(candidate, label) {
  const resolved = path.resolve(candidate);
  const parsed = path.parse(resolved);
  let cursor = parsed.root;
  const segments = resolved.slice(parsed.root.length).split(path.sep).filter(Boolean);
  for (const segment of segments.slice(0, -1)) {
    cursor = path.join(cursor, segment);
    const info = await lstat(cursor).catch((error) => {
      if (error?.code === 'ENOENT') fail('CI_AUTHORITY_MISSING', `${label} parent is missing`);
      throw error;
    });
    if (info.isSymbolicLink() || !info.isDirectory()) fail('CI_AUTHORITY_SYMLINK', `${label} parent path is unsafe`);
  }
}

async function ensureSafeDirectory(directory) {
  const resolved = path.resolve(directory);
  const parsed = path.parse(resolved);
  let cursor = parsed.root;
  for (const segment of resolved.slice(parsed.root.length).split(path.sep).filter(Boolean)) {
    cursor = path.join(cursor, segment);
    try {
      const info = await lstat(cursor);
      if (info.isSymbolicLink() || !info.isDirectory()) fail('CI_PROOF_PATH', 'proof parent contains an unsafe path component');
    } catch (error) {
      if (error?.code !== 'ENOENT') throw error;
      await mkdir(cursor, { mode: 0o700 });
    }
  }
}

function parseCsv(value) {
  if (value === 'none') return [];
  const values = value.split(',').map((item) => item.trim()).filter(Boolean);
  if (new Set(values).size !== values.length) fail('CI_GRAPH_DUPLICATE', `duplicate graph list value: ${value}`);
  return values;
}

function parseSelector(raw, label) {
  let selector;
  try {
    selector = JSON.parse(raw);
  } catch {
    fail('CI_GRAPH_SELECTOR', `${label} selector must contain JSON`);
  }
  if (!selector || typeof selector !== 'object' || Array.isArray(selector)) fail('CI_GRAPH_SELECTOR', `${label} selector must be an object`);
  const allowed = new Set(['include', 'exclude', 'groups', 'kinds']);
  for (const key of Object.keys(selector)) if (!allowed.has(key)) fail('CI_GRAPH_SELECTOR', `${label} selector contains an unknown key: ${key}`);
  const normalized = {};
  for (const key of allowed) {
    if (!(key in selector)) continue;
    if (!Array.isArray(selector[key]) || selector[key].some((item) => typeof item !== 'string' || !item) || new Set(selector[key]).size !== selector[key].length) {
      fail('CI_GRAPH_SELECTOR', `${label} selector ${key} must be a unique string array`);
    }
    normalized[key] = Object.freeze([...selector[key]]);
  }
  return Object.freeze(normalized);
}

function parseGraph(text) {
  const rows = [];
  const keys = new Set();
  const workflowMetadata = new Map();
  for (const [index, raw] of text.split('\n').entries()) {
    const line = raw.endsWith('\r') ? raw.slice(0, -1) : raw;
    if (!line.trim() || line.startsWith('#')) continue;
    const fields = line.split('\t');
    if (fields.length !== 9) fail('CI_GRAPH_FIELDS', `CI graph row ${index + 1} must contain exactly 9 fields`);
    const [workflowId, workflowFileRaw, workflowName, coverageScope, jobId, role, needsRaw, selectorRaw, description] = fields;
    if (![workflowId, workflowName, jobId, description].every(Boolean)) fail('CI_GRAPH_EMPTY', `CI graph row ${index + 1} contains an empty required field`);
    if (!/^[A-Za-z0-9_.-]+$/.test(workflowId) || !/^[A-Za-z0-9_-]+$/.test(jobId)) fail('CI_GRAPH_ID', `CI graph row ${index + 1} contains an unsafe identity`);
    if (!GRAPH_ROLES.has(role)) fail('CI_GRAPH_ROLE', `CI graph row ${index + 1} has an unknown role: ${role}`);
    if (!COVERAGE_SCOPES.has(coverageScope)) fail('CI_GRAPH_SCOPE', `CI graph row ${index + 1} has an unknown coverage scope: ${coverageScope}`);
    const workflowFile = safeRelative(workflowFileRaw, 'workflow file');
    const metadata = `${workflowFile}\0${workflowName}\0${coverageScope}`;
    if (workflowMetadata.has(workflowId) && workflowMetadata.get(workflowId) !== metadata) fail('CI_GRAPH_WORKFLOW', `workflow metadata is inconsistent: ${workflowId}`);
    workflowMetadata.set(workflowId, metadata);
    const key = `${workflowId}\0${jobId}`;
    if (keys.has(key)) fail('CI_GRAPH_DUPLICATE', `duplicate CI graph job: ${workflowId}/${jobId}`);
    keys.add(key);
    const needs = Object.freeze(parseCsv(needsRaw));
    const selector = parseSelector(selectorRaw, `${workflowId}/${jobId}`);
    if ((role === 'auxiliary' || role === 'proof') && Object.keys(selector).length) fail('CI_GRAPH_SELECTOR', `${role} job cannot own compatibility executions: ${workflowId}/${jobId}`);
    rows.push(Object.freeze({ workflowId, workflowFile, workflowName, coverageScope, jobId, role, needs, selector, description }));
  }
  return Object.freeze(rows);
}

export function parseCiWorkflowText(text, file = 'workflow fixture') {
  const name = text.split('\n').find((line) => line.startsWith('name: '))?.slice(6).trim() ?? '';
  const jobs = new Map();
  const lines = text.split('\n');
  let inJobs = false;
  let current = null;
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (line === 'jobs:') {
      inJobs = true;
      continue;
    }
    if (!inJobs) continue;
    const job = line.match(/^  ([A-Za-z0-9_-]+):\s*$/);
    if (job) {
      current = { id: job[1], lines: [], needs: [] };
      if (jobs.has(current.id)) fail('CI_WORKFLOW_JOB', `duplicate workflow job in ${file}: ${current.id}`);
      jobs.set(current.id, current);
      continue;
    }
    if (current) current.lines.push(line);
  }
  for (const job of jobs.values()) {
    for (let index = 0; index < job.lines.length; index += 1) {
      const match = job.lines[index].match(/^    needs:\s*(.*)$/);
      if (!match) continue;
      const inline = match[1].trim();
      if (inline) {
        if (inline.startsWith('[') && inline.endsWith(']')) job.needs.push(...inline.slice(1, -1).split(',').map((value) => value.trim()).filter(Boolean));
        else job.needs.push(inline);
      } else {
        for (let cursor = index + 1; cursor < job.lines.length; cursor += 1) {
          const item = job.lines[cursor].match(/^      - ([A-Za-z0-9_-]+)\s*$/);
          if (!item) break;
          job.needs.push(item[1]);
        }
      }
    }
    job.text = job.lines.join('\n');
    job.commandLines = job.lines.map((line) => line.trim()).filter(Boolean);
    job.needs = Object.freeze(job.needs);
    Object.freeze(job.lines);
    Object.freeze(job.commandLines);
    Object.freeze(job);
  }
  return Object.freeze({ name, jobs, text });
}

function taskMatches(task, selector) {
  const included = selector.include?.includes(task.id) ?? false;
  const grouped = selector.groups?.includes(task.group) ?? false;
  const kind = selector.kinds?.includes(task.kind) ?? false;
  const selected = included || grouped || kind;
  return selected && !(selector.exclude?.includes(task.id) ?? false);
}

function sorted(values) {
  return [...values].sort((left, right) => left.localeCompare(right));
}

function sameSet(left, right) {
  return JSON.stringify(sorted(left)) === JSON.stringify(sorted(right));
}

function expectedCommand(row) {
  if (row.role === 'owner') return `./tools/verification-ci run-job --workflow ${row.workflowId} --job ${row.jobId}`;
  if (row.role === 'proof') return `./tools/verification-ci proof --workflow ${row.workflowId} --job ${row.jobId}`;
  if (row.role === 'final') return './tools/ci-final-gate';
  return null;
}

function catalogDigest(execution) {
  return verificationDigest({
    hooks: execution.catalog.hooks.map((row) => ({ id: row.id, command: row.command, modes: row.modes })),
    groups: execution.catalog.groups.map((row) => ({ id: row.id, group: row.group, kind: row.kind })),
    relationships: [...execution.policy.relationships].map(([owner, targets]) => [owner, [...targets]]),
  });
}

export async function loadCiComposition({ root, policyPath, graphPath, env = process.env } = {}) {
  const resolvedRoot = path.resolve(root ?? process.cwd());
  const policy = await loadExecutionPolicy({ root: resolvedRoot, policyPath });
  const resolvedGraph = path.resolve(graphPath ?? resolvePolicyLocator(policy, 'ci_composition_graph', env));
  const graphText = await readAuthority(resolvedGraph, 'CI composition graph');
  const rows = parseGraph(graphText);
  const execution = await loadGitHookExecution({ root: resolvedRoot, policyPath: policy.file, env, mode: 'full' });
  const workflows = new Map();
  for (const row of rows) {
    if (workflows.has(row.workflowId)) continue;
    const file = path.join(resolvedRoot, ...row.workflowFile.split('/'));
    workflows.set(row.workflowId, Object.freeze({ file: row.workflowFile, parsed: parseCiWorkflowText(await readAuthority(file, `workflow ${row.workflowId}`), row.workflowFile) }));
  }
  const assignments = new Map();
  for (const row of rows) {
    const ids = execution.plan.tasks.filter((task) => taskMatches(task, row.selector)).map((task) => task.id);
    assignments.set(`${row.workflowId}:${row.jobId}`, Object.freeze(ids));
  }
  return Object.freeze({
    root: resolvedRoot,
    policy,
    graphPath: resolvedGraph,
    graphFingerprint: verificationDigest(graphText),
    rows,
    workflows,
    execution,
    assignments,
    catalogFingerprint: catalogDigest(execution),
  });
}

export function validateCiComposition(composition) {
  const errors = [];
  const rowsByWorkflow = new Map();
  for (const row of composition.rows) {
    const rows = rowsByWorkflow.get(row.workflowId) ?? [];
    rows.push(row);
    rowsByWorkflow.set(row.workflowId, rows);
    for (const id of [...(row.selector.include ?? []), ...(row.selector.exclude ?? [])]) {
      if (!composition.execution.plan.compatibilityIds.includes(id)) errors.push(`unknown selector subject ${id} in ${row.workflowId}/${row.jobId}`);
    }
  }
  for (const [workflowId, rows] of rowsByWorkflow) {
    const workflow = composition.workflows.get(workflowId)?.parsed;
    if (!workflow) {
      errors.push(`missing parsed workflow: ${workflowId}`);
      continue;
    }
    if (workflow.name !== rows[0].workflowName) errors.push(`workflow name mismatch for ${workflowId}`);
    if (!workflow.text.includes('  push:') || !workflow.text.includes('  pull_request:')) errors.push(`workflow triggers changed for ${workflowId}`);
    if (!workflow.text.includes('concurrency:') || !workflow.text.includes('cancel-in-progress: true')) errors.push(`workflow concurrency contract changed for ${workflowId}`);
    if (!sameSet(workflow.jobs.keys(), rows.map((row) => row.jobId))) errors.push(`workflow job set does not match graph for ${workflowId}`);
    for (const row of rows) {
      const job = workflow.jobs.get(row.jobId);
      if (!job) continue;
      if (!sameSet(job.needs, row.needs)) errors.push(`workflow needs mismatch for ${workflowId}/${row.jobId}`);
      const command = expectedCommand(row);
      if (command && !job.text.includes(command)) errors.push(`workflow owner command is missing for ${workflowId}/${row.jobId}`);
      if (row.role === 'final' && !job.text.includes('if: ${{ always() }}')) errors.push(`final workflow job must run with always(): ${workflowId}/${row.jobId}`);
    }
    const owners = new Map();
    for (const row of rows.filter((item) => item.role === 'owner' || item.role === 'final')) {
      for (const id of composition.assignments.get(`${row.workflowId}:${row.jobId}`) ?? []) {
        const current = owners.get(id) ?? [];
        current.push(row.jobId);
        owners.set(id, current);
      }
    }
    for (const [id, jobs] of owners) if (jobs.length !== 1) errors.push(`duplicate execution owner for ${workflowId}/${id}: ${jobs.join(',')}`);
    if (rows[0].coverageScope === 'full') {
      for (const task of composition.execution.plan.tasks) {
        const jobs = owners.get(task.id) ?? [];
        if (jobs.length === 0) errors.push(`missing execution owner for ${workflowId}/${task.id}`);
      }
    }
    for (const job of workflow.jobs.values()) {
      for (const hook of composition.execution.catalog.hooks) {
        const direct = job.commandLines.some((line) => {
          if (line.startsWith('bash -n ') || line.startsWith('node --check ')) return false;
          return line === hook.command || line.startsWith(`${hook.command} `) || line.includes(` ${hook.command} `);
        });
        if (direct && !(hook.id === 'test_lesson_repository' && rows.find((row) => row.jobId === job.id)?.role === 'final')) {
          errors.push(`direct compatibility command bypasses composed ownership in ${workflowId}/${job.id}: ${hook.id}`);
        }
      }
    }
  }
  return Object.freeze(errors);
}

function rowFor(composition, workflowId, jobId) {
  const row = composition.rows.find((item) => item.workflowId === workflowId && item.jobId === jobId);
  if (!row) fail('CI_GRAPH_JOB', `CI graph job is unknown: ${workflowId}/${jobId}`);
  return row;
}

function subsetPlan(composition, row) {
  const assigned = new Set(composition.assignments.get(`${row.workflowId}:${row.jobId}`) ?? []);
  if (!assigned.size) fail('CI_GRAPH_OWNER_EMPTY', `owner job has no assigned executions: ${row.workflowId}/${row.jobId}`);
  const logical = new Set(assigned);
  for (const task of composition.execution.plan.tasks) if (assigned.has(task.id)) for (const provided of task.provides) logical.add(provided);
  const hooks = composition.execution.catalog.hooks.filter((hook) => logical.has(hook.id));
  const groups = composition.execution.catalog.groups.filter((group) => logical.has(group.id));
  const relationships = new Map();
  for (const [owner, targets] of composition.policy.relationships) if (assigned.has(owner)) relationships.set(owner, targets.filter((target) => logical.has(target)));
  const plan = buildExecutionPlan({ hooks, groups, relationships, mode: 'full' });
  if (!sameSet(plan.executionIds, assigned)) fail('CI_GRAPH_PLAN', `owner plan drifted from graph assignment: ${row.workflowId}/${row.jobId}`);
  return plan;
}

function positiveSetting(policy, key) {
  const value = Number(policy.settings.get(key));
  if (!Number.isSafeInteger(value) || value <= 0) fail('CI_POLICY', `invalid positive setting: ${key}`);
  return value;
}

export async function runCiOwner({ composition, workflowId, jobId, jobs = 1, env = process.env } = {}) {
  const errors = validateCiComposition(composition);
  if (errors.length) fail('CI_GRAPH_INVALID', errors.join('\n'));
  const row = rowFor(composition, workflowId, jobId);
  if (row.role !== 'owner') fail('CI_GRAPH_ROLE', `run-job requires an owner row: ${workflowId}/${jobId}`);
  const plan = subsetPlan(composition, row);
  const before = await fingerprintRepository({ root: composition.root });
  const run = await runExecutionPlan({
    plan,
    root: composition.root,
    maxJobs: jobs,
    timeoutMs: positiveSetting(composition.policy, 'default_timeout_seconds') * 1000,
    cancellationGraceMs: positiveSetting(composition.policy, 'cancellation_grace_seconds') * 1000,
    maxLogBytes: positiveSetting(composition.policy, 'local_max_log_bytes'),
    environment: env,
  });
  const after = await fingerprintRepository({ root: composition.root });
  if (before.inputFingerprint !== after.inputFingerprint || before.repositoryFingerprint !== after.repositoryFingerprint || before.headSha !== after.headSha) {
    fail('CI_OWNER_REPOSITORY_CHANGED', `repository changed during CI owner execution: ${workflowId}/${jobId}`);
  }
  if (!run.ok) {
    const failed = run.results.find((result) => result.id === run.failedTaskId);
    const diagnostic = String(failed?.output || failed?.error || '').trim();
    fail('CI_OWNER_FAILED', `CI owner failed at ${run.failedTaskId}: ${workflowId}/${jobId} (${failed?.status || 'unknown'}, exit=${failed?.exitCode ?? 'none'}, signal=${failed?.signal ?? 'none'})${diagnostic ? `\n${diagnostic}` : ''}`);
  }
  return Object.freeze({ row, plan, run, repository: after });
}

function gitHead(root) {
  try {
    return execFileSync('git', ['-C', root, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
  } catch {
    return 'unknown';
  }
}

function parseResults(raw) {
  let value;
  try {
    value = JSON.parse(raw);
  } catch {
    fail('CI_PROOF_RESULTS', 'provider results must contain JSON');
  }
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail('CI_PROOF_RESULTS', 'provider results must be an object');
  for (const [key, status] of Object.entries(value)) {
    if (!/^[A-Za-z0-9_-]+$/.test(key) || !['success', 'failure', 'cancelled', 'skipped'].includes(status)) fail('CI_PROOF_RESULTS', 'provider results contain an unsafe key or status');
  }
  return value;
}

async function proofBase(composition, row, results) {
  const repository = await fingerprintRepository({ root: composition.root });
  return {
    marker: composition.policy.settings.get('ci_proof_marker'),
    schema_version: composition.policy.settings.get('ci_proof_schema_version'),
    workflow_id: row.workflowId,
    source_job: row.jobId,
    revision: gitHead(composition.root),
    repository_fingerprint: repository.repositoryFingerprint,
    input_fingerprint: repository.inputFingerprint,
    worktree_state: repository.worktreeState,
    graph_fingerprint: composition.graphFingerprint,
    policy_fingerprint: composition.policy.fingerprint,
    catalog_fingerprint: composition.catalogFingerprint,
    assignment_fingerprint: verificationDigest([...composition.assignments].sort(([left], [right]) => left.localeCompare(right))),
    provider_results: Object.fromEntries(Object.entries(results).sort(([left], [right]) => left.localeCompare(right))),
  };
}

async function atomicJson(file, value) {
  const resolved = path.resolve(file);
  await ensureSafeDirectory(path.dirname(resolved));
  const parent = await lstat(path.dirname(resolved));
  if (parent.isSymbolicLink() || !parent.isDirectory()) fail('CI_PROOF_PATH', 'proof parent must be a non-symlink directory');
  try {
    const current = await lstat(resolved);
    if (current.isSymbolicLink() || !current.isFile()) fail('CI_PROOF_PATH', 'proof output path is unsafe');
    fail('CI_PROOF_EXISTS', 'proof output already exists');
  } catch (error) {
    if (error?.code !== 'ENOENT') throw error;
  }
  const temporary = `${resolved}.tmp`;
  await writeFile(temporary, `${JSON.stringify(value)}\n`, { flag: 'wx', mode: 0o600 });
  await rename(temporary, resolved);
}

export async function createCiProof({ composition, workflowId, jobId, resultsJson, output } = {}) {
  const errors = validateCiComposition(composition);
  if (errors.length) fail('CI_GRAPH_INVALID', errors.join('\n'));
  const row = rowFor(composition, workflowId, jobId);
  if (row.role !== 'proof') fail('CI_GRAPH_ROLE', `proof requires a proof row: ${workflowId}/${jobId}`);
  const results = parseResults(resultsJson);
  if (!sameSet(Object.keys(results), row.needs)) fail('CI_PROOF_RESULTS', `provider result keys do not match graph needs: ${workflowId}/${jobId}`);
  for (const need of row.needs) if (results[need] !== 'success') fail('CI_PROOF_FAILED', `provider prerequisite did not succeed: ${need}=${results[need]}`);
  const base = await proofBase(composition, row, results);
  const proof = Object.freeze({ ...base, proof_digest: verificationDigest(base) });
  if (output) await atomicJson(output, proof);
  return proof;
}

export async function verifyCiProof({ composition, file, workflowId, jobId } = {}) {
  const row = rowFor(composition, workflowId, jobId);
  if (row.role !== 'proof') fail('CI_GRAPH_ROLE', `proof source is not a proof row: ${workflowId}/${jobId}`);
  let proof;
  try {
    proof = JSON.parse(await readAuthority(path.resolve(file), 'CI composed proof'));
  } catch (error) {
    if (error instanceof VerificationError) throw error;
    fail('CI_PROOF_JSON', 'CI composed proof contains invalid JSON');
  }
  const base = { ...proof };
  delete base.proof_digest;
  if (proof.proof_digest !== verificationDigest(base)) fail('CI_PROOF_DIGEST', 'CI composed proof digest is invalid');
  const current = await proofBase(composition, row, proof.provider_results ?? {});
  for (const [key, value] of Object.entries(current)) if (verificationDigest(proof[key]) !== verificationDigest(value)) fail('CI_PROOF_MISMATCH', `CI composed proof ${key} does not match current authorities`);
  if (!sameSet(Object.keys(proof.provider_results ?? {}), row.needs)) fail('CI_PROOF_RESULTS', 'CI composed proof provider keys do not match graph');
  for (const need of row.needs) if (proof.provider_results[need] !== 'success') fail('CI_PROOF_FAILED', `CI composed proof contains a failed provider: ${need}`);
  return Object.freeze(proof);
}

export async function verifyConfiguredFinalProof({ composition, file } = {}) {
  const workflowId = composition.policy.settings.get('ci_final_proof_workflow');
  const jobId = composition.policy.settings.get('ci_final_proof_job');
  if (!workflowId || !jobId) fail('CI_PROOF_POLICY', 'configured final proof identity is missing');
  return verifyCiProof({ composition, file, workflowId, jobId });
}

function parseGapCommands(text) {
  const rows = [];
  const ids = new Set();
  for (const [index, raw] of text.split('\n').entries()) {
    const line = raw.endsWith('\r') ? raw.slice(0, -1) : raw;
    if (!line.trim() || line.startsWith('#')) continue;
    const fields = line.split('\t');
    if (fields.length !== 4) fail('CI_GAP_FIELDS', `gap command row ${index + 1} must contain exactly 4 fields`);
    const [id, argvRaw, output, description] = fields;
    if (!/^[A-Za-z0-9_.-]+$/.test(id) || ids.has(id) || !description) fail('CI_GAP_ROW', `gap command row ${index + 1} is invalid`);
    if (!['discard', 'inherit'].includes(output)) fail('CI_GAP_OUTPUT', `gap command ${id} has an invalid output mode`);
    let argv;
    try {
      argv = validateArgv(JSON.parse(argvRaw));
    } catch (error) {
      if (error instanceof VerificationError) throw error;
      fail('CI_GAP_ARGV', `gap command ${id} must contain JSON argv`);
    }
    ids.add(id);
    rows.push(Object.freeze({ id, argv, output, description }));
  }
  return Object.freeze(rows);
}

export async function loadGapCommands({ composition, env = process.env } = {}) {
  const file = resolvePolicyLocator(composition.policy, 'final_gate_gap_commands', env);
  return parseGapCommands(await readAuthority(file, 'final-gap commands'));
}

function commandPlan(rows) {
  const tasks = rows.map((row, order) => Object.freeze({
    id: row.id,
    order,
    argv: row.argv,
    command: JSON.stringify(row.argv),
    kind: 'serial',
    group: 'final-gap',
    locks: Object.freeze([]),
    provides: Object.freeze([]),
    outputMode: row.output,
  }));
  return Object.freeze({
    tasks: Object.freeze(tasks),
    stages: Object.freeze(tasks.map((task) => Object.freeze({ kind: 'serial', tasks: Object.freeze([task]) }))),
  });
}

export async function runGapCommands({ composition, env = process.env } = {}) {
  const rows = await loadGapCommands({ composition, env });
  const plan = commandPlan(rows);
  const run = await runExecutionPlan({
    plan,
    root: composition.root,
    maxJobs: 1,
    timeoutMs: positiveSetting(composition.policy, 'ci_gap_timeout_seconds') * 1000,
    cancellationGraceMs: positiveSetting(composition.policy, 'cancellation_grace_seconds') * 1000,
    maxLogBytes: positiveSetting(composition.policy, 'ci_gap_max_log_bytes'),
    environment: env,
  });
  if (!run.ok) fail('CI_GAP_FAILED', `final-gap command failed: ${run.failedTaskId}`);
  return Object.freeze({ rows, run });
}

export async function runFallback({ composition, env = process.env } = {}) {
  let argv = composition.policy.argv.get('ci_final_gate_fallback');
  if (env.CI_FINAL_GATE_FALLBACK_ARGV_JSON) {
    try {
      argv = validateArgv(JSON.parse(env.CI_FINAL_GATE_FALLBACK_ARGV_JSON));
    } catch (error) {
      if (error instanceof VerificationError) throw error;
      fail('CI_FALLBACK_ARGV', 'fallback override must contain JSON argv');
    }
  }
  if (!argv) fail('CI_FALLBACK_ARGV', 'fallback argv policy is missing');
  const plan = commandPlan([{ id: 'aggregate_fallback', argv, output: 'inherit' }]);
  const run = await runExecutionPlan({
    plan,
    root: composition.root,
    maxJobs: 1,
    timeoutMs: positiveSetting(composition.policy, 'default_timeout_seconds') * 1000,
    cancellationGraceMs: positiveSetting(composition.policy, 'cancellation_grace_seconds') * 1000,
    maxLogBytes: positiveSetting(composition.policy, 'local_max_log_bytes'),
    environment: env,
  });
  if (!run.ok) fail('CI_FALLBACK_FAILED', 'aggregate fallback failed');
  return run;
}
