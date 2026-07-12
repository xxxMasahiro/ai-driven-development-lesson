import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { lstat, mkdir, open, readFile, readdir, readlink, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';

import {
  computeVerificationPolicyFingerprint,
  fingerprintRepository,
  loadCompatibilityCatalog,
  loadEvidenceSchema,
  loadExecutionPolicy,
  recordEvidenceV2,
  verificationDigest,
  VerificationError,
} from './verification_core.mjs';
import { buildExecutionPlan } from './verification_runner.mjs';

const V1_MARKER = 'ci-evidence-v1';

function sha(value) {
  return createHash('sha256').update(value).digest('hex');
}

function git(root, args, allowFailure = false) {
  try {
    return execFileSync('git', ['-C', root, ...args], { encoding: 'buffer', maxBuffer: 128 * 1024 * 1024 });
  } catch (error) {
    if (allowFailure) return Buffer.alloc(0);
    throw new VerificationError('HOOK_EVIDENCE_GIT', `Git command failed while building evidence: ${args.join(' ')}`);
  }
}

function configuredPath(root, env, name, fallback) {
  const value = env[name] || fallback;
  return path.isAbsolute(value) ? value : path.join(root, value);
}

async function fileHash(file) {
  let info;
  try {
    info = await lstat(file);
  } catch (error) {
    if (error?.code === 'ENOENT') return 'missing';
    throw error;
  }
  if (info.isSymbolicLink()) return sha(Buffer.from(await readlink(file), 'utf8'));
  if (info.isFile()) return sha(await readFile(file));
  if (!info.isDirectory()) return 'missing';
  const entries = [];
  async function visit(directory, relative) {
    const children = await readdir(directory, { withFileTypes: true });
    children.sort((a, b) => a.name.localeCompare(b.name));
    for (const child of children) {
      const nextRelative = relative ? `${relative}/${child.name}` : child.name;
      if (['.git', 'node_modules', 'playwright-report', 'test-results'].includes(child.name)) continue;
      const next = path.join(directory, child.name);
      if (child.isDirectory()) await visit(next, nextRelative);
      else if (child.isFile()) entries.push({ relative: `./${nextRelative}`, digest: sha(await readFile(next)) });
    }
  }
  await visit(file, '');
  let stream = '';
  for (const entry of entries) stream += `file=${entry.relative}\n${entry.digest}  ${entry.relative}\n`;
  return sha(stream);
}

async function inputsHash(root, values) {
  let stream = '';
  for (const value of values) {
    const resolved = path.isAbsolute(value) ? value : path.join(root, value);
    stream += `input=${value}\nhash=${await fileHash(resolved)}\n`;
  }
  return sha(stream);
}

function commandHash(command) {
  return sha(`${command}\n`);
}

function repositoryStateHash(root) {
  return sha(
    Buffer.concat([
      git(root, ['rev-parse', 'HEAD'], true),
      git(root, ['status', '--porcelain', '--untracked-files=all'], true),
      git(root, ['diff', '--binary'], true),
      git(root, ['diff', '--cached', '--binary'], true),
    ]),
  );
}

function evidenceDirectory(root, env) {
  if (env.CI_EVIDENCE_DIR) return path.resolve(env.CI_EVIDENCE_DIR);
  const gitPath = git(root, ['rev-parse', '--git-path', 'ci-evidence'], true).toString('utf8').trim();
  return gitPath ? path.resolve(root, gitPath) : path.join(root, '.git', 'ci-evidence');
}

function safeEvidenceId(raw) {
  const safe = raw.replace(/[^A-Za-z0-9_.-]/g, '_') || 'evidence';
  return `${safe}-${sha(raw).slice(0, 12)}`;
}

async function prepareV1Directory(directory) {
  let exists = true;
  try {
    const info = await lstat(directory);
    if (info.isSymbolicLink() || !info.isDirectory()) throw new VerificationError('HOOK_EVIDENCE_DIR', 'CI evidence path must be a non-symlink directory');
  } catch (error) {
    if (error?.code !== 'ENOENT') throw error;
    exists = false;
  }
  if (!exists) await mkdir(directory, { recursive: true, mode: 0o700 });
  const marker = path.join(directory, '.ci-evidence');
  try {
    const info = await lstat(marker);
    if (info.isSymbolicLink() || !info.isFile() || (await readFile(marker, 'utf8')) !== `${V1_MARKER}\n`) {
      throw new VerificationError('HOOK_EVIDENCE_MARKER', 'CI evidence marker is invalid');
    }
  } catch (error) {
    if (error?.code !== 'ENOENT') throw error;
    const entries = await readdir(directory);
    if (entries.length) throw new VerificationError('HOOK_EVIDENCE_UNMARKED', 'Refusing a non-empty unmarked CI evidence directory');
    await writeFile(marker, `${V1_MARKER}\n`, { flag: 'wx', mode: 0o600 });
  }
}

function evidenceRunId(env) {
  if (env.CI_EVIDENCE_RUN_ID) return env.CI_EVIDENCE_RUN_ID;
  if (env.GITHUB_RUN_ID) return `${env.GITHUB_RUN_ID}-${env.GITHUB_RUN_ATTEMPT || '1'}`;
  return `local-unscoped-${process.pid}`;
}

function evidenceWorkflow(env) {
  return env.GITHUB_WORKFLOW || 'local';
}

function evidenceSourceJob(env) {
  return env.CI_EVIDENCE_SOURCE_JOB || env.GITHUB_JOB || 'local';
}

function policyInputValues(env) {
  return [
    env.GIT_HOOKS_CHECKS_FILE || 'docs/workflow/GIT_HOOK_CHECKS.tsv',
    env.GIT_HOOKS_PARALLEL_GROUPS_FILE || 'docs/workflow/GIT_HOOK_PARALLEL_GROUPS.tsv',
    env.GIT_HOOKS_POLICY_FILE || 'docs/workflow/GIT_HOOKS_POLICY.tsv',
    env.CI_FINAL_GATE_COVERAGE_FILE || 'docs/workflow/FINAL_GATE_COVERAGE.tsv',
    env.CI_FINAL_GATE_GAP_COMMANDS_FILE || 'docs/workflow/FINAL_GATE_GAP_COMMANDS.tsv',
    env.VERIFICATION_EXECUTION_POLICY_FILE || 'docs/workflow/FINAL_GATE_EXECUTION_POLICY.tsv',
    env.VERIFICATION_EVIDENCE_SCHEMA_FILE || 'docs/workflow/FINAL_GATE_EVIDENCE_SCHEMA.tsv',
    'docs/workflow/TEST_PLAN_MANIFEST.tsv',
    env.AS_BUILT_SYNC_CONTRACT_FILE || 'docs/workflow/AS_BUILT_SYNC_CONTRACT.tsv',
    '.github/workflows/ci.yml',
    '.github/workflows/lesson14-ci.yml',
  ];
}

function hookInputValues(command, env) {
  const values = [
    env.GIT_HOOKS_CHECKS_FILE || 'docs/workflow/GIT_HOOK_CHECKS.tsv',
    env.GIT_HOOKS_PARALLEL_GROUPS_FILE || 'docs/workflow/GIT_HOOK_PARALLEL_GROUPS.tsv',
    env.GIT_HOOKS_POLICY_FILE || 'docs/workflow/GIT_HOOKS_POLICY.tsv',
  ];
  const rawFirst = command.split(/\s+/, 1)[0];
  const first = rawFirst.startsWith('./') ? rawFirst.slice(2) : rawFirst;
  return { values, first, includeExecutable: !path.isAbsolute(first) };
}

export async function buildLegacyEvidenceSnapshot({ root, env = process.env }) {
  const policyValues = policyInputValues(env);
  return Object.freeze({
    policyHash: await inputsHash(root, policyValues),
    repositoryStateHash: repositoryStateHash(root),
    gitSha: git(root, ['rev-parse', 'HEAD'], true).toString('utf8').trim() || 'unknown',
    workflow: evidenceWorkflow(env),
    runId: evidenceRunId(env),
    sourceJob: evidenceSourceJob(env),
  });
}

async function writeV1Receipt({ root, directory, id, command, snapshot, env }) {
  const input = hookInputValues(command, env);
  if (input.includeExecutable) {
    try {
      const info = await lstat(path.join(root, input.first));
      if (info.isFile()) input.values.push(input.first);
    } catch (error) {
      if (error?.code !== 'ENOENT') throw error;
    }
  }
  const inputHash = await inputsHash(root, input.values);
  const file = path.join(directory, `${safeEvidenceId(id)}.evidence`);
  const temporary = `${file}.tmp.${process.pid}.${Date.now()}`;
  const lines = [
    `marker=${V1_MARKER}`,
    `id=${id}`,
    'status=success',
    `command_hash=${commandHash(command)}`,
    `input_hash=${inputHash}`,
    `policy_hash=${snapshot.policyHash}`,
    `repo_state_hash=${snapshot.repositoryStateHash}`,
    `git_sha=${snapshot.gitSha}`,
    `workflow=${snapshot.workflow}`,
    `run_id=${snapshot.runId}`,
    `source_job=${snapshot.sourceJob}`,
    `created_at=${new Date().toISOString().replace(/\.\d{3}Z$/, 'Z')}`,
    '',
  ];
  const handle = await open(temporary, 'wx', 0o600);
  try {
    await handle.writeFile(lines.join('\n'), 'utf8');
    await handle.sync();
  } finally {
    await handle.close();
  }
  await rename(temporary, file);
}

export async function loadGitHookExecution({ root, policyPath, env = process.env, mode = 'full' } = {}) {
  const resolvedRoot = path.resolve(root ?? process.cwd());
  const policy = await loadExecutionPolicy({ root: resolvedRoot, policyPath });
  const catalog = await loadCompatibilityCatalog({ root: resolvedRoot, policy, env });
  const overrides = policy.profiles.get('resource_profile:local_task_overrides') ?? {};
  const hooks = catalog.hooks.map((hook) => {
    const override = overrides[hook.id] ?? {};
    return {
      ...hook,
      locks: Array.isArray(override.locks) ? override.locks : [],
      timeoutMs: Number.isSafeInteger(override.timeout_seconds) ? override.timeout_seconds * 1000 : undefined,
    };
  });
  const plan = buildExecutionPlan({ hooks, groups: catalog.groups, relationships: policy.relationships, mode });
  return Object.freeze({ root: resolvedRoot, policy, catalog, plan });
}

export async function writeGitHookEvidenceBatch({
  execution,
  results,
  inputSnapshot,
  env = process.env,
} = {}) {
  const resultById = new Map(results.map((result) => [result.id, result]));
  const logical = new Map();
  for (const task of execution.plan.tasks) {
    if (task.kind === 'final-gate') continue;
    const result = resultById.get(task.id);
    if (result?.status !== 'success') throw new VerificationError('HOOK_EVIDENCE_RESULT', `Cannot record evidence for an unsuccessful task: ${task.id}`);
    if (logical.has(task.id)) throw new VerificationError('HOOK_EVIDENCE_DUPLICATE', `Duplicate logical evidence producer: ${task.id}`);
    logical.set(task.id, task.id);
    for (const provided of task.provides) {
      if (logical.has(provided)) throw new VerificationError('HOOK_EVIDENCE_DUPLICATE', `Duplicate logical evidence producer: ${provided}`);
      logical.set(provided, task.id);
    }
  }
  const kindById = new Map(execution.catalog.groups.map((row) => [row.id, row.kind]));
  for (const id of execution.plan.compatibilityIds) {
    if (kindById.get(id) === 'final-gate') continue;
    if (!logical.has(id)) throw new VerificationError('HOOK_EVIDENCE_MISSING', `No successful logical producer for compatibility check: ${id}`);
  }

  const directory = evidenceDirectory(execution.root, env);
  await prepareV1Directory(directory);
  const legacy = await buildLegacyEvidenceSnapshot({ root: execution.root, env });
  const schema = await loadEvidenceSchema({ root: execution.root, schemaPath: env.VERIFICATION_EVIDENCE_SCHEMA_FILE });
  const policyFingerprint = await computeVerificationPolicyFingerprint({ policy: execution.policy, schema, catalog: execution.catalog });
  const v2Mode = execution.policy.settings.get('v2_evidence_authority');
  const hooks = new Map(execution.catalog.hooks.map((hook) => [hook.id, hook]));
  const warnings = [];

  for (const id of execution.plan.compatibilityIds) {
    if (kindById.get(id) === 'final-gate') continue;
    const hook = hooks.get(id);
    const evidenceId = `git-hook:${id}`;
    await writeV1Receipt({ root: execution.root, directory, id: evidenceId, command: hook.command, snapshot: legacy, env });
    if (v2Mode === 'legacy') continue;
    try {
      await recordEvidenceV2({
        root: execution.root,
        schemaPath: schema.file,
        evidenceDir: path.join(directory, 'v2'),
        evidenceId,
        subjectId: id,
        argv: hook.argv,
        scope: env.VERIFICATION_SCOPE || env.GITHUB_EVENT_NAME || 'local',
        eventName: env.GITHUB_EVENT_NAME || 'local',
        ref: env.GITHUB_REF || 'local',
        workflow: legacy.workflow,
        runId: legacy.runId,
        runAttempt: env.GITHUB_RUN_ATTEMPT || '1',
        sourceJob: legacy.sourceJob,
        policyFingerprint,
        toolchainFingerprint: verificationDigest({ runtime: 'node', version: process.version, platform: process.platform, architecture: process.arch }),
        resultDigest: verificationDigest({ status: 'success', exitCode: 0 }),
        artifactLineageDigest: verificationDigest({ provider: logical.get(id), subject: id }),
        inputSnapshot,
      });
    } catch (error) {
      if (v2Mode === 'enforce') throw error;
      warnings.push(`${id}: ${error.code || error.message}`);
    }
  }
  return Object.freeze({ directory, logicalCount: logical.size, warnings: Object.freeze(warnings) });
}

export function fingerprintsEqual(left, right) {
  return Boolean(
    left &&
      right &&
      left.inputFingerprint === right.inputFingerprint &&
      left.repositoryFingerprint === right.repositoryFingerprint &&
      left.headSha === right.headSha &&
      left.worktreeState === right.worktreeState,
  );
}

export { fingerprintRepository };
