import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import {
  lstat,
  mkdir,
  open,
  readFile,
  readdir,
  readlink,
  realpath,
  rename,
  stat,
  writeFile,
} from 'node:fs/promises';
import path from 'node:path';

const POLICY_DEFAULT = 'docs/workflow/FINAL_GATE_EXECUTION_POLICY.tsv';
const EVIDENCE_SCHEMA_DEFAULT = 'docs/workflow/FINAL_GATE_EVIDENCE_SCHEMA.tsv';
const EVIDENCE_MARKER = 'verification-evidence-v2';
const MAX_AUTHORITY_BYTES = 4 * 1024 * 1024;
const MAX_METADATA_LENGTH = 4096;
const DIGEST_PATTERN = /^[0-9a-f]{64}$/;
const SAFE_KEY_PATTERN = /^[A-Za-z0-9_.:-]+$/;
const ALLOWED_POLICY_TYPES = new Set([
  'setting',
  'locator',
  'source',
  'relationship',
  'argv',
  'environment_profile',
  'input_profile',
  'output_profile',
  'resource_profile',
  'ci_job',
]);
const ALLOWED_ACTIVATION_MODES = new Set(['legacy', 'record-only', 'shadow', 'enforce']);
const ALLOWED_EVIDENCE_CLASSIFICATIONS = new Set(['public-metadata', 'digest', 'forbidden']);

export class VerificationError extends Error {
  constructor(code, message, details = undefined) {
    super(message);
    this.name = 'VerificationError';
    this.code = code;
    if (details !== undefined) this.details = details;
  }
}

function fail(code, message, details) {
  throw new VerificationError(code, message, details);
}

function digest(value) {
  const hash = createHash('sha256');
  hash.update(value);
  return hash.digest('hex');
}

function stableValue(value) {
  if (Array.isArray(value)) return value.map(stableValue);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, stableValue(value[key])]),
    );
  }
  return value;
}

function stableStringify(value) {
  return JSON.stringify(stableValue(value));
}

function pathInside(root, candidate) {
  const relative = path.relative(root, candidate);
  return relative === '' || (!relative.startsWith(`..${path.sep}`) && relative !== '..' && !path.isAbsolute(relative));
}

async function authorityPath(root, configured, fallback) {
  const candidate = configured ?? path.join(root, fallback);
  const resolved = path.resolve(candidate);
  let info;
  try {
    info = await lstat(resolved);
  } catch (error) {
    if (error?.code === 'ENOENT') fail('AUTHORITY_MISSING', `Verification authority is missing: ${configured ?? fallback}`);
    throw error;
  }
  if (info.isSymbolicLink()) fail('AUTHORITY_SYMLINK', `Verification authority cannot be a symbolic link: ${configured ?? fallback}`);
  if (!info.isFile()) fail('AUTHORITY_NOT_FILE', `Verification authority is not a regular file: ${configured ?? fallback}`);
  if (info.size > MAX_AUTHORITY_BYTES) fail('AUTHORITY_TOO_LARGE', `Verification authority exceeds the size limit: ${configured ?? fallback}`);
  return resolved;
}

async function readAuthority(root, configured, fallback) {
  const file = await authorityPath(root, configured, fallback);
  const value = await readFile(file, 'utf8');
  if (value.includes('\0')) fail('AUTHORITY_NUL', `Verification authority contains NUL data: ${configured ?? fallback}`);
  return { file, value };
}

function tsvRows(text, expectedFields, codePrefix) {
  const rows = [];
  for (const [index, raw] of text.split('\n').entries()) {
    const line = raw.endsWith('\r') ? raw.slice(0, -1) : raw;
    if (!line.trim() || line.startsWith('#')) continue;
    const fields = line.split('\t');
    if (fields.length !== expectedFields) {
      fail(`${codePrefix}_FIELD_COUNT`, `Malformed TSV row ${index + 1}: expected ${expectedFields} fields, got ${fields.length}`);
    }
    if (fields.some((field) => field.includes('\0'))) {
      fail(`${codePrefix}_NUL`, `Malformed TSV row ${index + 1}: NUL data is forbidden`);
    }
    rows.push({ line: index + 1, fields });
  }
  return rows;
}

function validateKey(value, code = 'POLICY_KEY') {
  if (!SAFE_KEY_PATTERN.test(value)) fail(code, `Unsafe or empty identifier: ${value}`);
  return value;
}

function validateMetadata(value, field) {
  if (typeof value !== 'string' || value.length === 0 || value.length > MAX_METADATA_LENGTH) {
    fail('EVIDENCE_METADATA', `Evidence field ${field} must be a bounded non-empty string`);
  }
  if (/\0|[\r\n]/.test(value) || value.includes('://') || path.isAbsolute(value)) {
    fail('EVIDENCE_METADATA', `Evidence field ${field} contains unsafe metadata`);
  }
  return value;
}

function validateDigest(value, field) {
  if (!DIGEST_PATTERN.test(value)) fail('EVIDENCE_DIGEST', `Evidence field ${field} must be a SHA-256 digest`);
  return value;
}

export function validateArgv(argv) {
  if (!Array.isArray(argv) || argv.length === 0 || argv.some((value) => typeof value !== 'string' || value.length === 0)) {
    fail('UNSAFE_ARGV', 'Command argv must be a non-empty array of non-empty strings');
  }
  for (const value of argv) {
    if (/\0|[\r\n]/.test(value) || /\$\(|`/.test(value)) {
      fail('UNSAFE_ARGV', `Command argument contains evaluation syntax: ${value}`);
    }
    if (/^(?:;|&&|\|\||\||>|>>|<|<<|&)$/.test(value) || /^(?:>|>>|<|<<).+/.test(value)) {
      fail('UNSAFE_ARGV', `Command argument contains a shell control operator: ${value}`);
    }
  }
  if (/^[A-Za-z_][A-Za-z0-9_]*=/.test(argv[0])) {
    fail('UNSAFE_ARGV', 'Environment assignments must use a declared environment profile');
  }
  const executable = path.basename(argv[0]);
  if ((executable === 'bash' || executable === 'sh') && argv[1] === '-c') {
    fail('UNSAFE_ARGV', 'Shell evaluation commands are forbidden');
  }
  return [...argv];
}

export function parseCommandIdentity(command) {
  if (typeof command !== 'string' || command.length === 0 || /\0|[\r\n]/.test(command)) {
    fail('UNSAFE_ARGV', 'Command identity must be a bounded single-line string');
  }
  const argv = [];
  let token = '';
  let quote = null;
  let escaped = false;
  let tokenStarted = false;
  for (let index = 0; index < command.length; index += 1) {
    const char = command[index];
    if (escaped) {
      token += char;
      tokenStarted = true;
      escaped = false;
      continue;
    }
    if (char === '\\' && quote !== "'") {
      escaped = true;
      tokenStarted = true;
      continue;
    }
    if (quote) {
      if (char === quote) quote = null;
      else token += char;
      tokenStarted = true;
      continue;
    }
    if (char === "'" || char === '"') {
      quote = char;
      tokenStarted = true;
      continue;
    }
    if (/\s/.test(char)) {
      if (tokenStarted) {
        argv.push(token);
        token = '';
        tokenStarted = false;
      }
      continue;
    }
    if (';|<>`'.includes(char) || (char === '&' && command[index + 1] === '&') || (char === '$' && command[index + 1] === '(')) {
      fail('UNSAFE_ARGV', `Command identity contains shell evaluation syntax: ${command}`);
    }
    token += char;
    tokenStarted = true;
  }
  if (escaped || quote) fail('UNSAFE_ARGV', 'Command identity contains an incomplete escape or quote');
  if (tokenStarted) argv.push(token);
  return validateArgv(argv);
}

export function canonicalCommandDigest(argv, environmentProfile = 'default') {
  validateKey(environmentProfile, 'ENVIRONMENT_PROFILE');
  return digest(stableStringify({ argv: validateArgv(argv), environmentProfile }));
}

function normalizedSet(value) {
  if (!Array.isArray(value) || value.some((item) => typeof item !== 'string')) return null;
  return [...new Set(value)].sort();
}

export function commandsEquivalent(left, right) {
  const mismatches = [];
  const scalarFields = ['subjectId', 'environmentProfile', 'policyFingerprint'];
  for (const field of scalarFields) {
    if (left?.[field] !== right?.[field]) mismatches.push(field);
  }
  if (stableStringify(left?.argv) !== stableStringify(right?.argv)) mismatches.push('argv');
  for (const field of ['inputs', 'prerequisites', 'outputs']) {
    if (stableStringify(normalizedSet(left?.[field])) !== stableStringify(normalizedSet(right?.[field]))) {
      mismatches.push(field);
    }
  }
  const order = ['subjectId', 'argv', 'environmentProfile', 'inputs', 'prerequisites', 'outputs', 'policyFingerprint'];
  mismatches.sort((a, b) => order.indexOf(a) - order.indexOf(b));
  return { equivalent: mismatches.length === 0, mismatches };
}

export async function loadExecutionPolicy({
  root,
  policyPath = process.env.VERIFICATION_EXECUTION_POLICY_FILE,
} = {}) {
  const resolvedRoot = path.resolve(root ?? process.cwd());
  const { file, value } = await readAuthority(resolvedRoot, policyPath, POLICY_DEFAULT);
  const settings = new Map();
  const locators = new Map();
  const sources = new Map();
  const relationships = new Map();
  const argv = new Map();
  const profiles = new Map();
  const records = [];
  const unique = new Set();

  for (const row of tsvRows(value, 4, 'POLICY')) {
    const [type, key, rawValue, description] = row.fields;
    if (!ALLOWED_POLICY_TYPES.has(type)) fail('POLICY_TYPE', `Unknown policy row type on line ${row.line}: ${type}`);
    validateKey(key);
    if (!rawValue || !description) fail('POLICY_EMPTY', `Policy row ${row.line} has an empty value or description`);
    const duplicateKey = type === 'relationship' ? `${type}\0${key}\0${rawValue}` : `${type}\0${key}`;
    if (unique.has(duplicateKey)) fail('POLICY_DUPLICATE', `Duplicate policy record: ${type}/${key}`);
    unique.add(duplicateKey);

    if (type === 'setting') settings.set(key, rawValue);
    else if (type === 'locator') {
      let parsed;
      try {
        parsed = JSON.parse(rawValue);
      } catch {
        fail('POLICY_LOCATOR', `Locator ${key} must contain JSON`);
      }
      if (
        !parsed ||
        typeof parsed !== 'object' ||
        !/^[A-Z][A-Z0-9_]*$/.test(parsed.env ?? '') ||
        typeof parsed.default !== 'string' ||
        !parsed.default ||
        path.isAbsolute(parsed.default) ||
        parsed.default.split('/').includes('..')
      ) {
        fail('POLICY_LOCATOR', `Locator ${key} is unsafe or incomplete`);
      }
      locators.set(key, Object.freeze({ env: parsed.env, default: parsed.default }));
    } else if (type === 'source') sources.set(key, rawValue);
    else if (type === 'relationship') {
      validateKey(rawValue);
      const values = relationships.get(key) ?? [];
      values.push(rawValue);
      relationships.set(key, values);
    } else if (type === 'argv') {
      let parsed;
      try {
        parsed = JSON.parse(rawValue);
      } catch {
        fail('UNSAFE_ARGV', `Argv record ${key} must contain a JSON array`);
      }
      argv.set(key, validateArgv(parsed));
    } else if (type.endsWith('_profile')) {
      let parsed;
      try {
        parsed = JSON.parse(rawValue);
      } catch {
        fail('POLICY_PROFILE', `Profile ${type}/${key} must contain JSON`);
      }
      if (!parsed || typeof parsed !== 'object' || (Array.isArray(parsed) && (parsed.length === 0 || parsed.some((item) => typeof item !== 'string' || !item)))) {
        fail('POLICY_PROFILE', `Profile ${type}/${key} must contain a non-empty JSON array or object`);
      }
      profiles.set(`${type}:${key}`, Object.freeze(Array.isArray(parsed) ? [...parsed] : structuredClone(parsed)));
    }
    records.push(Object.freeze({ type, key, value: rawValue, description }));
  }

  if (settings.get('schema_version') !== '1.0.0') fail('POLICY_SCHEMA', 'Unsupported execution policy schema version');
  if (!ALLOWED_ACTIVATION_MODES.has(settings.get('activation_mode'))) fail('POLICY_ACTIVATION', 'Invalid activation mode');
  if (settings.get('command_execution') !== 'argv') fail('POLICY_COMMAND_MODE', 'Command execution must remain argv-based');
  if (settings.get('unknown_state_policy') !== 'fail-closed') fail('POLICY_FAIL_CLOSED', 'Unknown state policy must remain fail-closed');
  if (settings.get('cross_workflow_reuse') !== 'disabled') fail('POLICY_CROSS_WORKFLOW', 'Cross-workflow reuse is not allowed');
  if (settings.get('persistent_result_cache') !== 'disabled') fail('POLICY_PERSISTENT_CACHE', 'Persistent result caching is not allowed');
  for (const locator of sources.values()) {
    if (!locators.has(locator)) fail('POLICY_SOURCE', `Policy source references an unknown locator: ${locator}`);
  }

  return Object.freeze({
    file,
    root: resolvedRoot,
    settings,
    locators,
    sources,
    relationships,
    argv,
    profiles,
    records: Object.freeze(records),
    fingerprint: digest(value),
  });
}

export function resolvePolicyLocator(policy, key, env = process.env) {
  const locator = policy.locators.get(key);
  if (!locator) fail('POLICY_LOCATOR_MISSING', `Unknown policy locator: ${key}`);
  const configured = env[locator.env];
  return path.resolve(configured || path.join(policy.root, locator.default));
}

async function readCatalogFile(file, fieldCount, code) {
  const resolved = path.resolve(file);
  let info;
  try {
    info = await lstat(resolved);
  } catch (error) {
    if (error?.code === 'ENOENT') fail(`${code}_MISSING`, `Catalog file is missing: ${file}`);
    throw error;
  }
  if (info.isSymbolicLink() || !info.isFile() || info.size > MAX_AUTHORITY_BYTES) {
    fail(`${code}_AUTHORITY`, `Catalog authority is unsafe: ${file}`);
  }
  return tsvRows(await readFile(resolved, 'utf8'), fieldCount, code);
}

export async function loadCompatibilityCatalog({ root, policy, env = process.env } = {}) {
  const loadedPolicy = policy ?? (await loadExecutionPolicy({ root }));
  const hooksFile = resolvePolicyLocator(loadedPolicy, 'hook_checks', env);
  const groupsFile = resolvePolicyLocator(loadedPolicy, 'hook_parallel_groups', env);
  const coverageFile = resolvePolicyLocator(loadedPolicy, 'final_gate_coverage', env);
  const gapsFile = resolvePolicyLocator(loadedPolicy, 'final_gate_gap_commands', env);

  const hooks = [];
  const hookIds = new Set();
  for (const row of await readCatalogFile(hooksFile, 4, 'HOOK_CATALOG')) {
    const [id, modes, command, description] = row.fields;
    validateKey(id, 'HOOK_ID');
    if (hookIds.has(id)) fail('HOOK_DUPLICATE', `Duplicate hook id: ${id}`);
    hookIds.add(id);
    const modeValues = modes.split('|');
    if (modeValues.some((mode) => !mode || !SAFE_KEY_PATTERN.test(mode))) fail('HOOK_MODE', `Invalid modes for ${id}`);
    hooks.push(Object.freeze({ id, modes: Object.freeze(modeValues), command, argv: Object.freeze(parseCommandIdentity(command)), description }));
  }

  const groups = [];
  const groupIds = new Set();
  for (const row of await readCatalogFile(groupsFile, 4, 'PARALLEL_CATALOG')) {
    const [id, group, kind, description] = row.fields;
    validateKey(id, 'PARALLEL_ID');
    if (groupIds.has(id)) fail('PARALLEL_DUPLICATE', `Duplicate parallel classification: ${id}`);
    if (!hookIds.has(id)) fail('PARALLEL_UNKNOWN_HOOK', `Parallel classification references an unknown hook: ${id}`);
    if (!['parallel', 'serial', 'heavy', 'final-gate'].includes(kind)) fail('PARALLEL_KIND', `Invalid execution kind for ${id}: ${kind}`);
    validateKey(group, 'PARALLEL_GROUP');
    groupIds.add(id);
    groups.push(Object.freeze({ id, group, kind, description }));
  }

  const gaps = [];
  const gapIds = new Set();
  for (const row of await readCatalogFile(gapsFile, 4, 'GAP_CATALOG')) {
    const [id, argvRaw, output, description] = row.fields;
    validateKey(id, 'GAP_ID');
    if (gapIds.has(id)) fail('GAP_DUPLICATE', `Duplicate gap id: ${id}`);
    if (!argvRaw || !description || !['discard', 'inherit'].includes(output)) fail('GAP_EMPTY', `Gap command ${id} is incomplete`);
    let argv;
    try {
      argv = validateArgv(JSON.parse(argvRaw));
    } catch (error) {
      if (error instanceof VerificationError) throw error;
      fail('GAP_ARGV', `Gap command ${id} must contain JSON argv`);
    }
    gapIds.add(id);
    gaps.push(Object.freeze({ id, argv: Object.freeze(argv), output, description }));
  }

  const coverage = [];
  const requirements = new Set();
  for (const row of await readCatalogFile(coverageFile, 4, 'COVERAGE_CATALOG')) {
    const [requirement, kind, id, description] = row.fields;
    if (!requirement || requirements.has(requirement)) fail('COVERAGE_DUPLICATE', `Duplicate or empty aggregate requirement: ${requirement}`);
    if (kind === 'hook' && !hookIds.has(id)) fail('COVERAGE_UNKNOWN_HOOK', `Coverage references an unknown hook: ${id}`);
    if (kind === 'gap' && !gapIds.has(id)) fail('COVERAGE_UNKNOWN_GAP', `Coverage references an unknown gap: ${id}`);
    if (kind !== 'hook' && kind !== 'gap') fail('COVERAGE_KIND', `Invalid coverage kind: ${kind}`);
    requirements.add(requirement);
    coverage.push(Object.freeze({ requirement, kind, id, description }));
  }

  return Object.freeze({
    hooks: Object.freeze(hooks),
    groups: Object.freeze(groups),
    gaps: Object.freeze(gaps),
    coverage: Object.freeze(coverage),
    counts: Object.freeze({ hooks: hooks.length, groups: groups.length, gaps: gaps.length, coverage: coverage.length }),
    files: Object.freeze({ hooksFile, groupsFile, gapsFile, coverageFile }),
  });
}

function gitBuffer(root, args, allowFailure = false) {
  try {
    return execFileSync('git', ['-C', root, ...args], {
      encoding: 'buffer',
      maxBuffer: 64 * 1024 * 1024,
      stdio: ['ignore', 'pipe', allowFailure ? 'ignore' : 'pipe'],
    });
  } catch (error) {
    if (allowFailure) return Buffer.alloc(0);
    fail('GIT_COMMAND', `Git command failed: git ${args.join(' ')}`, { status: error?.status });
  }
}

function nulValues(buffer) {
  if (!buffer.length) return [];
  const values = buffer.toString('utf8').split('\0');
  if (values.at(-1) === '') values.pop();
  return values;
}

function normalizeInputPath(value) {
  if (typeof value !== 'string' || !value || value.includes('\0') || path.isAbsolute(value)) {
    fail('INPUT_PATH', `Input path must be repository-relative: ${value}`);
  }
  const normalized = path.posix.normalize(value.replaceAll('\\', '/')).replace(/^\.\//, '').replace(/\/$/, '');
  if (!normalized || normalized === '..' || normalized.startsWith('../')) fail('INPUT_PATH', `Input path escapes the repository: ${value}`);
  return normalized;
}

function pathSelected(candidate, requested) {
  if (requested.length === 0) return true;
  return requested.some((item) => candidate === item || candidate.startsWith(`${item}/`));
}

function pathArgs(requested) {
  return requested.length ? ['--', ...requested] : [];
}

async function collectFileRecord(root, relative) {
  const absolute = path.join(root, ...relative.split('/'));
  if (!pathInside(root, absolute)) fail('INPUT_PATH', `Input path escapes the repository: ${relative}`);
  let before;
  try {
    before = await lstat(absolute, { bigint: true });
  } catch (error) {
    if (error?.code === 'ENOENT') return { path: relative, kind: 'missing', mode: '000000', content: digest('missing') };
    throw error;
  }
  const mode = Number(before.mode & 0o7777n).toString(8).padStart(4, '0');
  let kind;
  let bytes;
  if (before.isSymbolicLink()) {
    kind = 'symlink';
    bytes = Buffer.from(await readlink(absolute), 'utf8');
  } else if (before.isFile()) {
    kind = 'file';
    bytes = await readFile(absolute);
  } else {
    fail('INPUT_SPECIAL_FILE', `Unsupported repository entry type: ${relative}`);
  }
  const after = await lstat(absolute, { bigint: true });
  if (
    before.dev !== after.dev ||
    before.ino !== after.ino ||
    before.mode !== after.mode ||
    before.size !== after.size ||
    before.mtimeNs !== after.mtimeNs
  ) {
    fail('INPUT_CHANGED', `Repository input changed while it was being read: ${relative}`);
  }
  return { path: relative, kind, mode, content: digest(bytes) };
}

async function collectWorktreeRecords(root, paths) {
  const records = [];
  for (const relative of paths) records.push(await collectFileRecord(root, relative));
  return records;
}

function indexRecords(buffer, requested) {
  return nulValues(buffer)
    .map((value) => {
      const tab = value.indexOf('\t');
      if (tab < 0) fail('GIT_INDEX_FORMAT', 'Git index output is malformed');
      const metadata = value.slice(0, tab).split(' ');
      const file = value.slice(tab + 1);
      if (metadata.length !== 3 || !pathSelected(file, requested)) return null;
      return { path: file, mode: metadata[0], object: metadata[1], stage: metadata[2] };
    })
    .filter(Boolean)
    .sort((a, b) => a.path.localeCompare(b.path) || a.stage.localeCompare(b.stage));
}

function firstCommits(root) {
  return gitBuffer(root, ['rev-list', '--max-parents=0', 'HEAD'], true)
    .toString('utf8')
    .trim()
    .split('\n')
    .filter(Boolean)
    .sort();
}

export async function fingerprintRepository({ root, inputPaths = [], beforeFinalize } = {}) {
  const requestedRoot = path.resolve(root ?? process.cwd());
  let resolvedRoot;
  try {
    resolvedRoot = await realpath(requestedRoot);
  } catch {
    fail('REPOSITORY_MISSING', 'Repository root does not exist');
  }
  const topLevel = gitBuffer(resolvedRoot, ['rev-parse', '--show-toplevel']).toString('utf8').trim();
  const realTop = await realpath(topLevel);
  if (realTop !== resolvedRoot) fail('REPOSITORY_MISMATCH', 'Configured root is not the Git repository top level');

  const requested = [...new Set(inputPaths.map(normalizeInputPath))].sort();
  const scopedArgs = pathArgs(requested);
  const startStatus = gitBuffer(resolvedRoot, ['status', '--porcelain=v2', '-z', '--untracked-files=all', '--ignored=no', ...scopedArgs]);
  const startIndex = gitBuffer(resolvedRoot, ['ls-files', '-z', '--stage', ...scopedArgs]);
  const headSha = gitBuffer(resolvedRoot, ['rev-parse', 'HEAD'], true).toString('utf8').trim() || 'unknown';
  const headPaths = headSha === 'unknown' ? [] : nulValues(gitBuffer(resolvedRoot, ['ls-tree', '-rz', '--name-only', 'HEAD']));
  const indexPaths = indexRecords(startIndex, requested).map((record) => record.path);
  const trackedPaths = nulValues(gitBuffer(resolvedRoot, ['ls-files', '-z', ...scopedArgs]));
  const untrackedPaths = nulValues(gitBuffer(resolvedRoot, ['ls-files', '--others', '--exclude-standard', '-z', ...scopedArgs]));
  const candidates = new Set([...indexPaths, ...trackedPaths, ...untrackedPaths]);
  for (const item of headPaths) if (pathSelected(item, requested)) candidates.add(item);
  for (const item of requested) {
    try {
      const info = await stat(path.join(resolvedRoot, ...item.split('/')));
      if (!info.isDirectory()) candidates.add(item);
    } catch (error) {
      if (error?.code !== 'ENOENT') throw error;
      candidates.add(item);
    }
  }
  const paths = [...candidates].filter((item) => pathSelected(item, requested)).sort();
  const firstRecords = await collectWorktreeRecords(resolvedRoot, paths);
  if (beforeFinalize) await beforeFinalize();
  const secondRecords = await collectWorktreeRecords(resolvedRoot, paths);
  const endStatus = gitBuffer(resolvedRoot, ['status', '--porcelain=v2', '-z', '--untracked-files=all', '--ignored=no', ...scopedArgs]);
  const endIndex = gitBuffer(resolvedRoot, ['ls-files', '-z', '--stage', ...scopedArgs]);
  if (
    !startStatus.equals(endStatus) ||
    !startIndex.equals(endIndex) ||
    stableStringify(firstRecords) !== stableStringify(secondRecords)
  ) {
    fail('INPUT_CHANGED', 'Repository inputs changed while the fingerprint was being calculated');
  }

  const manifest = {
    headSha,
    requested,
    status: digest(startStatus),
    index: indexRecords(startIndex, requested),
    worktree: firstRecords,
  };
  return Object.freeze({
    inputFingerprint: digest(stableStringify(manifest)),
    repositoryFingerprint: digest(stableStringify({ roots: firstCommits(resolvedRoot) })),
    headSha,
    worktreeState: startStatus.length === 0 ? 'clean' : 'dirty',
    entriesCount: firstRecords.length,
  });
}

export async function loadEvidenceSchema({
  root,
  schemaPath = process.env.VERIFICATION_EVIDENCE_SCHEMA_FILE,
} = {}) {
  const resolvedRoot = path.resolve(root ?? process.cwd());
  const { file, value } = await readAuthority(resolvedRoot, schemaPath, EVIDENCE_SCHEMA_DEFAULT);
  const fields = new Map();
  for (const row of tsvRows(value, 4, 'SCHEMA')) {
    const [field, requiredRaw, classification, description] = row.fields;
    validateKey(field, 'SCHEMA_FIELD');
    if (fields.has(field)) fail('SCHEMA_DUPLICATE', `Duplicate evidence schema field: ${field}`);
    if (requiredRaw !== 'true' && requiredRaw !== 'false') fail('SCHEMA_REQUIRED', `Invalid required value for ${field}`);
    if (!ALLOWED_EVIDENCE_CLASSIFICATIONS.has(classification)) fail('SCHEMA_CLASSIFICATION', `Invalid classification for ${field}`);
    const required = requiredRaw === 'true';
    if (required && classification === 'forbidden') fail('SCHEMA_FORBIDDEN_REQUIRED', `Forbidden field cannot be required: ${field}`);
    fields.set(field, Object.freeze({ required, classification, description }));
  }
  return Object.freeze({ file, fields, fingerprint: digest(value) });
}

function evidenceSafeId(value) {
  const safe = value.replace(/[^A-Za-z0-9_.-]/g, '_') || 'evidence';
  return `${safe}-${digest(value).slice(0, 12)}`;
}

async function prepareEvidenceDir(directory) {
  if (!directory || path.resolve(directory) === path.parse(path.resolve(directory)).root) {
    fail('EVIDENCE_DIRECTORY', 'Unsafe evidence directory');
  }
  let exists = true;
  try {
    const info = await lstat(directory);
    if (info.isSymbolicLink() || !info.isDirectory()) fail('EVIDENCE_DIRECTORY', 'Evidence path must be a non-symlink directory');
  } catch (error) {
    if (error?.code !== 'ENOENT') throw error;
    exists = false;
  }
  if (!exists) await mkdir(directory, { recursive: true, mode: 0o700 });
  const marker = path.join(directory, '.verification-evidence-v2');
  try {
    const markerInfo = await lstat(marker);
    if (markerInfo.isSymbolicLink() || !markerInfo.isFile()) fail('EVIDENCE_MARKER', 'Evidence marker is unsafe');
    if ((await readFile(marker, 'utf8')) !== `${EVIDENCE_MARKER}\n`) fail('EVIDENCE_MARKER', 'Evidence marker is invalid');
  } catch (error) {
    if (error?.code !== 'ENOENT') throw error;
    const entries = await readdir(directory);
    if (entries.length !== 0) fail('EVIDENCE_UNMARKED', 'Refusing a non-empty unmarked evidence directory');
    await writeFile(marker, `${EVIDENCE_MARKER}\n`, { flag: 'wx', mode: 0o600 });
  }
}

function receiptExpectedFields(schema) {
  return [...schema.fields.entries()]
    .filter(([, rule]) => rule.required)
    .map(([field]) => field);
}

function validateReceiptAgainstSchema(receipt, schema) {
  for (const [field, rule] of schema.fields) {
    if (rule.classification === 'forbidden' && Object.hasOwn(receipt, field)) {
      fail('EVIDENCE_FORBIDDEN_FIELD', `Forbidden evidence field is present: ${field}`);
    }
    if (rule.required && !Object.hasOwn(receipt, field)) fail('EVIDENCE_REQUIRED_FIELD', `Required evidence field is missing: ${field}`);
  }
  const allowed = new Set(receiptExpectedFields(schema));
  for (const field of Object.keys(receipt)) {
    if (!allowed.has(field)) fail('EVIDENCE_UNKNOWN_FIELD', `Unknown evidence field is present: ${field}`);
  }
}

function contextForbiddenFields(context, schema) {
  for (const [field, rule] of schema.fields) {
    if (rule.classification === 'forbidden' && Object.hasOwn(context, field)) {
      fail('EVIDENCE_FORBIDDEN_FIELD', `Forbidden evidence input is present: ${field}`);
    }
  }
}

async function buildReceipt(context, schema) {
  contextForbiddenFields(context, schema);
  const snapshot = context.inputSnapshot ?? (await fingerprintRepository({ root: context.root, inputPaths: context.inputPaths ?? [] }));
  for (const field of ['inputFingerprint', 'repositoryFingerprint']) validateDigest(snapshot[field], field);
  if (typeof snapshot.headSha !== 'string' || !snapshot.headSha) fail('EVIDENCE_INPUT_SNAPSHOT', 'Evidence input snapshot is incomplete');
  if (!['clean', 'dirty', 'unknown'].includes(snapshot.worktreeState)) fail('EVIDENCE_INPUT_SNAPSHOT', 'Evidence worktree state is invalid');
  const evidenceId = validateMetadata(context.evidenceId, 'evidence_id');
  const scope = validateMetadata(context.scope, 'scope');
  const eventName = validateMetadata(context.eventName, 'event_name');
  const ref = validateMetadata(context.ref, 'ref');
  const workflow = validateMetadata(context.workflow, 'workflow');
  const runId = validateMetadata(context.runId, 'run_id');
  const runAttempt = validateMetadata(String(context.runAttempt), 'run_attempt');
  if (!/^[1-9][0-9]*$/.test(runAttempt)) fail('EVIDENCE_ATTEMPT', 'Run attempt must be a positive integer');
  const sourceJob = validateMetadata(context.sourceJob, 'source_job');
  const subjectId = validateMetadata(context.subjectId, 'subject_id');
  const commandDigest = canonicalCommandDigest(context.argv, context.environmentProfile ?? 'default');
  const policyFingerprint = validateDigest(context.policyFingerprint, 'policy_fingerprint');
  const toolchainFingerprint = validateDigest(context.toolchainFingerprint, 'toolchain_fingerprint');
  const resultDigest = validateDigest(context.resultDigest, 'result_digest');
  const artifactLineageDigest = validateDigest(context.artifactLineageDigest, 'artifact_lineage_digest');
  const attemptKey = digest(
    stableStringify({
      scope,
      eventName,
      ref,
      headSha: snapshot.headSha,
      runId,
      runAttempt,
      subjectId,
      inputFingerprint: snapshot.inputFingerprint,
    }),
  );
  const receipt = {
    schema_version: '2.0.0',
    marker: EVIDENCE_MARKER,
    evidence_id: evidenceId,
    attempt_key: attemptKey,
    status: 'success',
    scope,
    event_name: eventName,
    ref,
    head_sha: snapshot.headSha,
    workflow,
    run_id: runId,
    run_attempt: runAttempt,
    source_job: sourceJob,
    subject_id: subjectId,
    repository_fingerprint: snapshot.repositoryFingerprint,
    command_digest: commandDigest,
    input_fingerprint: snapshot.inputFingerprint,
    policy_fingerprint: policyFingerprint,
    worktree_state: snapshot.worktreeState,
    toolchain_fingerprint: toolchainFingerprint,
    result_digest: resultDigest,
    artifact_lineage_digest: artifactLineageDigest,
    created_at: new Date().toISOString(),
  };
  validateReceiptAgainstSchema(receipt, schema);
  return receipt;
}

function compareReceipt(actual, expected) {
  const fields = Object.keys(expected).filter((field) => field !== 'created_at');
  const mismatches = fields.filter((field) => actual?.[field] !== expected[field]);
  if (mismatches.includes('input_fingerprint') || mismatches.includes('attempt_key') || mismatches.includes('worktree_state')) {
    fail('EVIDENCE_INPUT_MISMATCH', 'Version 2 evidence does not match the current repository inputs', { mismatches });
  }
  if (mismatches.length) fail('EVIDENCE_PROVENANCE_MISMATCH', 'Version 2 evidence provenance does not match', { mismatches });
}

async function evidenceCandidates(directory, evidenceId) {
  const prefix = `${evidenceSafeId(evidenceId)}-`;
  let entries;
  try {
    entries = await readdir(directory, { withFileTypes: true });
  } catch (error) {
    if (error?.code === 'ENOENT') return [];
    throw error;
  }
  return entries.filter((entry) => entry.isDirectory() && entry.name.startsWith(prefix)).map((entry) => path.join(directory, entry.name, 'receipt.json'));
}

export async function recordEvidenceV2(context) {
  const schema = await loadEvidenceSchema({ root: context.root, schemaPath: context.schemaPath });
  const receipt = await buildReceipt(context, schema);
  const directory = path.resolve(context.evidenceDir);
  await prepareEvidenceDir(directory);
  const claim = path.join(directory, `${evidenceSafeId(receipt.evidence_id)}-${receipt.attempt_key}`);
  try {
    await mkdir(claim, { mode: 0o700 });
  } catch (error) {
    if (error?.code === 'EEXIST') fail('EVIDENCE_DUPLICATE_PRODUCER', `Evidence producer already claimed this attempt: ${receipt.evidence_id}`);
    throw error;
  }
  const temporary = path.join(claim, 'receipt.tmp');
  const final = path.join(claim, 'receipt.json');
  try {
    const handle = await open(temporary, 'wx', 0o600);
    try {
      await handle.writeFile(`${stableStringify(receipt)}\n`, 'utf8');
      await handle.sync();
    } finally {
      await handle.close();
    }
    await rename(temporary, final);
  } catch (error) {
    fail('EVIDENCE_WRITE', `Failed to atomically write version 2 evidence: ${error.message}`);
  }
  return Object.freeze({ path: final, receipt: Object.freeze(receipt) });
}

export async function verifyEvidenceV2(context) {
  const schema = await loadEvidenceSchema({ root: context.root, schemaPath: context.schemaPath });
  const expected = await buildReceipt(context, schema);
  const directory = path.resolve(context.evidenceDir);
  const exact = path.join(directory, `${evidenceSafeId(expected.evidence_id)}-${expected.attempt_key}`, 'receipt.json');
  let receiptPath = exact;
  try {
    await lstat(exact);
  } catch (error) {
    if (error?.code !== 'ENOENT') throw error;
    const candidates = await evidenceCandidates(directory, expected.evidence_id);
    if (candidates.length === 0) fail('EVIDENCE_MISSING', `Version 2 evidence is missing: ${expected.evidence_id}`);
    receiptPath = candidates.sort()[0];
  }
  let actual;
  try {
    actual = JSON.parse(await readFile(receiptPath, 'utf8'));
  } catch {
    fail('EVIDENCE_INVALID_JSON', `Version 2 evidence is invalid: ${expected.evidence_id}`);
  }
  validateReceiptAgainstSchema(actual, schema);
  if (actual.status !== 'success') fail('EVIDENCE_STATUS', `Version 2 evidence is not successful: ${expected.evidence_id}`);
  compareReceipt(actual, expected);
  return Object.freeze({ path: receiptPath, receipt: Object.freeze(actual) });
}

export function verificationDigest(value) {
  return digest(typeof value === 'string' || Buffer.isBuffer(value) ? value : stableStringify(value));
}

export async function computeVerificationPolicyFingerprint({ policy, schema, catalog }) {
  const loadedPolicy = policy ?? (await loadExecutionPolicy());
  const loadedSchema = schema ?? (await loadEvidenceSchema({ root: loadedPolicy.root }));
  const loadedCatalog = catalog ?? (await loadCompatibilityCatalog({ root: loadedPolicy.root, policy: loadedPolicy }));
  const authorities = {};
  for (const [key, file] of Object.entries(loadedCatalog.files)) {
    authorities[key] = digest(await readFile(file));
  }
  return digest(
    stableStringify({
      executionPolicy: loadedPolicy.fingerprint,
      evidenceSchema: loadedSchema.fingerprint,
      authorities,
    }),
  );
}
