import { createHash } from 'node:crypto';
import { constants as fsConstants } from 'node:fs';
import { access, lstat, readFile } from 'node:fs/promises';
import path from 'node:path';

import { loadExecutionPolicy, resolvePolicyLocator, VerificationError } from './verification_core.mjs';

const MAX_INDEX_INPUT_BYTES = 32 * 1024 * 1024;
const FULL_MODE = 'full';

function hash(value) {
  return createHash('sha256').update(value).digest('hex');
}

function normalizedRelative(value) {
  if (typeof value !== 'string' || !value || value.includes('\0') || path.isAbsolute(value)) {
    throw new VerificationError('AS_BUILT_PATH', `As-built path must be repository-relative: ${value}`);
  }
  const result = path.posix.normalize(value.replaceAll('\\', '/')).replace(/^\.\//, '').replace(/\/$/, '');
  if (!result || result === '..' || result.startsWith('../')) {
    throw new VerificationError('AS_BUILT_PATH', `As-built path escapes the repository: ${value}`);
  }
  return result;
}

function splitList(value) {
  if (value === 'none') return [];
  const values = value.split(',').map((item) => item.trim()).filter(Boolean);
  if (new Set(values).size !== values.length) throw new VerificationError('AS_BUILT_DUPLICATE_LIST', `Duplicate value in contract list: ${value}`);
  return values;
}

function parseTsv(text, fields, label) {
  const rows = [];
  for (const [index, raw] of text.split('\n').entries()) {
    const line = raw.endsWith('\r') ? raw.slice(0, -1) : raw;
    if (!line.trim() || line.startsWith('#')) continue;
    const values = line.split('\t');
    if (values.length !== fields) {
      throw new VerificationError('AS_BUILT_TSV', `malformed ${label} row ${index + 1}: expected exactly ${fields} tab-separated fields`);
    }
    rows.push({ line: index + 1, values });
  }
  return rows;
}

async function fileSnapshot(file, label, required = true) {
  let info;
  try {
    info = await lstat(file, { bigint: true });
  } catch (error) {
    if (error?.code === 'ENOENT' && !required) return null;
    if (error?.code === 'ENOENT') throw new VerificationError('AS_BUILT_INPUT_MISSING', `missing ${label}: ${file}`);
    throw error;
  }
  if (info.isSymbolicLink()) throw new VerificationError('AS_BUILT_INPUT_SYMLINK', `refusing symlinked ${label}: ${file}`);
  if (!info.isFile()) throw new VerificationError('AS_BUILT_INPUT_TYPE', `${label} is not a regular file: ${file}`);
  if (info.size > BigInt(MAX_INDEX_INPUT_BYTES)) throw new VerificationError('AS_BUILT_INPUT_SIZE', `${label} exceeds the indexed input limit: ${file}`);
  const content = await readFile(file);
  const after = await lstat(file, { bigint: true });
  if (info.dev !== after.dev || info.ino !== after.ino || info.size !== after.size || info.mtimeNs !== after.mtimeNs) {
    throw new VerificationError('AS_BUILT_INPUT_CHANGED', `as-built input changed while reading: ${file}`);
  }
  return {
    content,
    text: content.toString('utf8'),
    digest: hash(content),
    size: after.size,
    mode: after.mode,
    mtimeNs: after.mtimeNs,
    dev: after.dev,
    ino: after.ino,
  };
}

function parseContract(text) {
  const records = [];
  const ids = new Set();
  for (const row of parseTsv(text, 7, 'as-built contract')) {
    const [id, status, title, artifactsRaw, testsRaw, documentsRaw, evidenceRaw] = row.values;
    if (!id || !title || !artifactsRaw || !testsRaw || !documentsRaw || !evidenceRaw) {
      throw new VerificationError('AS_BUILT_CONTRACT_EMPTY', `invalid empty field in contract row for ${id || 'unknown'}`);
    }
    if (ids.has(id)) throw new VerificationError('AS_BUILT_CONTRACT_DUPLICATE', `duplicate sync ID in contract: ${id}`);
    if (status !== 'planned' && status !== 'implemented') {
      throw new VerificationError('AS_BUILT_CONTRACT_STATUS', `invalid status for ${id}: ${status}`);
    }
    ids.add(id);
    records.push(Object.freeze({
      id,
      status,
      title,
      artifacts: Object.freeze(splitList(artifactsRaw)),
      tests: Object.freeze(splitList(testsRaw)),
      documents: Object.freeze(splitList(documentsRaw)),
      runtimeEvidence: Object.freeze(splitList(evidenceRaw)),
    }));
  }
  return { records: Object.freeze(records), ids };
}

function parseDocumentBlocks(text) {
  const blocks = new Map();
  let current = null;
  for (const line of text.split('\n')) {
    if (line.startsWith('SYNC-ID: ')) {
      const id = line.slice('SYNC-ID: '.length);
      const values = blocks.get(id) ?? [];
      current = { id, fields: new Map(), duplicateFields: new Set() };
      values.push(current);
      blocks.set(id, values);
      continue;
    }
    if (!current) continue;
    for (const field of ['STATUS', 'ARTIFACTS', 'TESTS']) {
      const prefix = `${field}: `;
      if (!line.startsWith(prefix)) continue;
      if (current.fields.has(field)) current.duplicateFields.add(field);
      else current.fields.set(field, line.slice(prefix.length));
    }
  }
  return blocks;
}

function normalizeCommandToken(token, root) {
  let value = token.replace(/^['"]|['"]$/g, '');
  if (value.startsWith('./')) return value.slice(2);
  if (value.startsWith('$ROOT/')) return value.slice('$ROOT/'.length);
  if (value.startsWith('${ROOT}/')) return value.slice('${ROOT}/'.length);
  const rootPrefix = `${root}${path.sep}`;
  if (value.startsWith(rootPrefix)) return value.slice(rootPrefix.length).replaceAll(path.sep, '/');
  return null;
}

function activeCommandReferences(text, root) {
  const commands = new Set();
  for (let raw of text.split('\n')) {
    let line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    if (line.includes('as_built_evidence_run_docs_check')) commands.add('tools/check_as_built_docs.sh');
    if (line.includes('as_built_evidence_run_sync_contract_check')) commands.add('tools/check_as_built_sync_contract.sh');
    if (line.startsWith('run:')) line = line.slice('run:'.length).trim();
    while (/^[A-Za-z_][A-Za-z0-9_]*=[^\s]+\s+/.test(line)) line = line.replace(/^[^\s]+\s+/, '').trim();
    const token = line.split(/\s+/, 1)[0];
    const normalized = normalizeCommandToken(token, root);
    if (normalized) commands.add(normalized);
  }
  return commands;
}

function parseHookPolicy(text) {
  for (const row of parseTsv(text, 5, 'Git hooks policy')) {
    if (row.values[0] === 'hook_mode') return row.values[1].split('|');
  }
  return [];
}

function parseHookChecks(text, allowedModes, root) {
  const tests = new Set();
  let valid = allowedModes.includes(FULL_MODE);
  const seen = new Set();
  let rows;
  try {
    rows = parseTsv(text, 4, 'Git hook check');
  } catch {
    return { valid: false, tests };
  }
  for (const row of rows) {
    const [id, modesRaw, command] = row.values.map((value) => value.trim());
    if (!id || !modesRaw || !command || seen.has(id)) {
      valid = false;
      continue;
    }
    seen.add(id);
    const modes = modesRaw.split('|');
    if (modes.some((mode) => !mode || !allowedModes.includes(mode))) {
      valid = false;
      continue;
    }
    if (!modes.includes(FULL_MODE)) continue;
    const normalized = normalizeCommandToken(command.split(/\s+/, 1)[0], root);
    if (normalized) tests.add(normalized);
  }
  return { valid, tests };
}

function listMatches(actual, expected, context, errors) {
  const actualSet = new Set(actual);
  const expectedSet = new Set(expected);
  for (const item of expectedSet) if (!actualSet.has(item)) errors.push(`missing ${item} in ${context}`);
  for (const item of actualSet) if (!expectedSet.has(item)) errors.push(`unexpected ${item} in ${context}`);
}

async function regularFile(root, relative) {
  if (!relative || relative === 'none') return false;
  const file = path.join(root, ...relative.split('/'));
  try {
    const info = await lstat(file);
    return info.isFile() && !info.isSymbolicLink();
  } catch {
    return false;
  }
}

async function executableFile(root, relative) {
  if (!(await regularFile(root, relative))) return false;
  try {
    await access(path.join(root, ...relative.split('/')), fsConstants.X_OK);
    return true;
  } catch {
    return false;
  }
}

function lesson14Compatibility(text) {
  return (
    text.includes('common policy regressions are provided by CI / policy-regression-tests') ||
    text.includes('browser coverage is provided by CI / playwright-tests') ||
    text.includes('CI_COMMON_COVERAGE_SOURCE: ci-split-common-coverage')
  );
}

export async function loadAsBuiltIndex({
  root,
  contractPath,
  policyPath,
  env = process.env,
  beforeFinalize,
} = {}) {
  const resolvedRoot = path.resolve(root ?? process.cwd());
  const policy = await loadExecutionPolicy({ root: resolvedRoot, policyPath });
  const documents = policy.profiles.get('input_profile:as_built_documents');
  const wiring = policy.profiles.get('input_profile:as_built_wiring');
  if (!documents || !wiring) throw new VerificationError('AS_BUILT_PROFILE', 'As-built documents or wiring profile is missing');
  const requiredDocuments = Object.freeze(documents.map(normalizedRelative));
  const wiringPaths = Object.freeze(wiring.map(normalizedRelative));
  const resolvedContract = path.resolve(contractPath ?? resolvePolicyLocator(policy, 'as_built_contract', env));
  const snapshots = new Map();
  const content = new Map();

  async function load(file, label, required = true) {
    const absolute = path.resolve(file);
    if (content.has(absolute)) return content.get(absolute);
    const snapshot = await fileSnapshot(absolute, label, required);
    content.set(absolute, snapshot);
    if (snapshot) snapshots.set(absolute, snapshot);
    return snapshot;
  }

  const contractSnapshot = await load(resolvedContract, 'as-built sync contract');
  const contract = parseContract(contractSnapshot.text);
  const documentData = new Map();
  for (const relative of requiredDocuments) {
    const snapshot = await load(path.join(resolvedRoot, ...relative.split('/')), `synchronized document ${relative}`, false);
    documentData.set(relative, snapshot ? { text: snapshot.text, blocks: parseDocumentBlocks(snapshot.text) } : null);
  }
  const wiringData = new Map();
  for (const relative of wiringPaths) {
    const snapshot = await load(path.join(resolvedRoot, ...relative.split('/')), `wiring file ${relative}`, false);
    wiringData.set(relative, snapshot ? { text: snapshot.text, commands: activeCommandReferences(snapshot.text, resolvedRoot) } : null);
  }
  const hookPolicyRelative = 'docs/workflow/GIT_HOOKS_POLICY.tsv';
  const hookChecksRelative = 'docs/workflow/GIT_HOOK_CHECKS.tsv';
  const hookPolicySnapshot = await load(path.join(resolvedRoot, hookPolicyRelative), hookPolicyRelative, false);
  const hookChecksSnapshot = await load(path.join(resolvedRoot, hookChecksRelative), hookChecksRelative, false);
  const hookCatalog = hookPolicySnapshot && hookChecksSnapshot
    ? parseHookChecks(hookChecksSnapshot.text, parseHookPolicy(hookPolicySnapshot.text), resolvedRoot)
    : { valid: false, tests: new Set() };

  const runtimeData = new Map();
  for (const record of contract.records) {
    for (const relative of record.runtimeEvidence) {
      if (runtimeData.has(relative)) continue;
      const snapshot = await load(path.join(resolvedRoot, ...relative.split('/')), `runtime evidence ${relative}`, false);
      runtimeData.set(relative, snapshot?.text ?? null);
    }
  }

  if (beforeFinalize) await beforeFinalize();
  for (const [file, snapshot] of snapshots) {
    const current = await fileSnapshot(file, 'indexed as-built input');
    if (current.digest !== snapshot.digest || current.mode !== snapshot.mode || current.ino !== snapshot.ino || current.dev !== snapshot.dev) {
      throw new VerificationError('AS_BUILT_INPUT_CHANGED', `as-built input changed during indexed validation: ${file}`);
    }
  }

  const mainWiring = wiringData.get('.github/workflows/ci.yml');
  const lesson14Wiring = wiringData.get('.github/workflows/lesson14-ci.yml');
  const compatibility = Boolean(mainWiring && lesson14Wiring && lesson14Compatibility(lesson14Wiring.text));

  function directlyWired(test, relative) {
    return wiringData.get(relative)?.commands.has(test) ?? false;
  }

  function runnerWired(test, relative) {
    const data = wiringData.get(relative);
    return Boolean(
      data &&
      hookCatalog.valid &&
      hookCatalog.tests.has(test) &&
      (data.commands.has('tools/git-hooks') || data.commands.has('tools/verification-ci'))
    );
  }

  function testWired(test, relative) {
    if (directlyWired(test, relative) || runnerWired(test, relative)) return true;
    if (relative === '.github/workflows/lesson14-ci.yml' && compatibility) {
      return directlyWired(test, '.github/workflows/ci.yml') || runnerWired(test, '.github/workflows/ci.yml');
    }
    return false;
  }

  return Object.freeze({
    root: resolvedRoot,
    policy,
    contractPath: resolvedContract,
    records: contract.records,
    ids: contract.ids,
    requiredDocuments,
    wiringPaths,
    documentData,
    wiringData,
    runtimeData,
    hookCatalog,
    testWired,
  });
}

export async function validateAsBuiltIndex(index) {
  const errors = [];
  const documentSet = new Set(index.requiredDocuments);

  for (const record of index.records) {
    listMatches(record.documents, index.requiredDocuments, `${record.id} required_docs`, errors);
    for (const relative of index.requiredDocuments) {
      const data = index.documentData.get(relative);
      if (!data) {
        errors.push(`missing synchronized document: ${relative}`);
        continue;
      }
      const blocks = data.blocks.get(record.id) ?? [];
      if (blocks.length !== 1) {
        errors.push(`expected one SYNC-ID block for ${record.id} in ${relative}, found ${blocks.length}`);
        continue;
      }
      const block = blocks[0];
      const status = block.fields.get('STATUS') ?? '';
      if (status !== record.status) errors.push(`status mismatch for ${record.id} in ${relative}: expected ${record.status}, got ${status || 'missing'}`);
      let artifacts = [];
      let tests = [];
      try {
        artifacts = splitList(block.fields.get('ARTIFACTS') ?? '');
      } catch (error) {
        errors.push(error.message);
      }
      try {
        tests = splitList(block.fields.get('TESTS') ?? '');
      } catch (error) {
        errors.push(error.message);
      }
      listMatches(artifacts, record.artifacts, `${relative} ARTIFACTS for ${record.id}`, errors);
      listMatches(tests, record.tests, `${relative} TESTS for ${record.id}`, errors);
    }

    for (const relative of record.artifacts) {
      if (!(await regularFile(index.root, relative))) errors.push(`missing required artifact: ${relative}`);
    }
    for (const relative of record.tests) {
      if (!(await regularFile(index.root, relative))) errors.push(`missing required test: ${relative}`);
      else if (!(await executableFile(index.root, relative))) errors.push(`not executable: ${relative}`);
    }
    for (const relative of record.runtimeEvidence) {
      const text = index.runtimeData.get(relative);
      if (text === null || text === undefined) {
        errors.push(`missing runtime evidence: ${relative}`);
        continue;
      }
      let referenced = text.includes(record.id);
      if (!referenced) referenced = record.artifacts.some((item) => text.includes(item));
      if (!referenced) referenced = record.tests.some((item) => text.includes(item));
      if (!referenced) referenced = record.tests.some((test) => index.hookCatalog.valid && index.hookCatalog.tests.has(test) && activeCommandReferences(text, index.root).has('tools/git-hooks'));
      if (!referenced) errors.push(`runtime evidence does not reference ${record.id} artifacts or tests: ${relative}`);
    }
    if (record.status === 'implemented') {
      for (const test of record.tests) {
        for (const wiring of index.wiringPaths) {
          if (!index.wiringData.get(wiring)) errors.push(`missing wiring file: ${wiring}`);
          else if (!index.testWired(test, wiring)) errors.push(`missing active test wiring for ${test} in ${wiring}`);
        }
      }
    }
  }

  for (const relative of index.requiredDocuments) {
    const data = index.documentData.get(relative);
    if (!data) continue;
    for (const id of data.blocks.keys()) {
      if (!index.ids.has(id)) errors.push(`unknown SYNC-ID block in ${relative}: ${id}`);
    }
  }
  if (documentSet.size !== index.requiredDocuments.length) errors.push('duplicate synchronized document in policy profile');
  return Object.freeze(errors);
}

async function countRegular(index, values) {
  let present = 0;
  for (const value of values) if (await regularFile(index.root, value)) present += 1;
  return { present, total: values.length };
}

export async function formatAsBuiltStatus(index) {
  const lines = ['As-Built Sync Status', `Contract: ${index.contractPath}`, ''];
  for (const record of index.records) {
    const documents = await countRegular(index, record.documents);
    const artifacts = await countRegular(index, record.artifacts);
    const tests = await countRegular(index, record.tests);
    const evidence = await countRegular(index, record.runtimeEvidence);
    let blocks = 0;
    for (const relative of record.documents) {
      if ((index.documentData.get(relative)?.blocks.get(record.id) ?? []).length === 1) blocks += 1;
    }
    let wired = 0;
    for (const test of record.tests) for (const wiring of index.wiringPaths) if (index.testWired(test, wiring)) wired += 1;
    lines.push(`SYNC-ID: ${record.id}`);
    lines.push(`Status: ${record.status}`);
    lines.push(`Title: ${record.title}`);
    lines.push(`Document files: ${documents.present}/${documents.total} present`);
    lines.push(`Document blocks: ${blocks}/${record.documents.length} present`);
    lines.push(`Artifacts: ${artifacts.present}/${artifacts.total} present`);
    lines.push(`Tests: ${tests.present}/${tests.total} present`);
    lines.push(`Active test wiring: ${wired}/${record.tests.length * index.wiringPaths.length} present`);
    lines.push(`Runtime evidence: ${evidence.present}/${evidence.total} present`);
    lines.push('');
  }
  return `${lines.join('\n')}\n`;
}
