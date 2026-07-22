import path from 'node:path';
import { lstat, readFile } from 'node:fs/promises';

const POLICY_VERSION = '1.0.0';
const MAX_RULES = 128;
const MAX_GROUPS = 64;
const MAX_PATTERNS = 2048;
const MAX_PATTERN_LENGTH = 512;
const MAX_RECORDS = 20000;
const MAX_POLICY_BYTES = 512 * 1024;
const STATUS_KINDS = new Set(['A', 'C', 'D', 'M', 'R', 'T', 'U', 'X']);
const IMMUTABLE_RULES = [
  {
    id: 'document-sync-governance',
    label: 'self-protection',
    groups: new Set(['as_built_core', 'verification', 'security', 'ci_hooks', 'document_sync_governance']),
    paths: new Set([
      'AGENTS.MD',
      'docs/workflow/REPOSITORY_DOCUMENT_SYNC.md',
      'docs/workflow/REPOSITORY_DOCUMENT_SYNC_POLICY.json',
      'tools/check_repository_document_sync.mjs',
      'tools/check_ci_workflow_structure.sh',
      'tools/lib/repository_document_sync.mjs',
      'tools/test_repository_document_sync.mjs'
    ])
  },
  {
    id: 'development-instruction-governance',
    label: 'development-instruction protection',
    groups: new Set(['as_built_core', 'verification', 'security', 'ci_hooks', 'development_instruction_governance']),
    paths: new Set([
      'docs/workflow/DEVELOPMENT_INSTRUCTION_POLICY.tsv',
      'docs/workflow/DEVELOPMENT_AUTONOMY_WORKFLOW.tsv',
      'docs/workflow/INSTRUCTION_MEMORY.md',
      'tools/development-instruction',
      'tools/lib/development_instruction.mjs',
      'tools/check_development_instruction.sh',
      'tools/test_development_instruction.mjs'
    ])
  },
  {
    id: 'next-workflow-core',
    label: 'next-workflow protection',
    groups: new Set(['as_built_core', 'verification', 'security', 'ci_hooks', 'development_instruction_governance']),
    paths: new Set([
      'docs/workflow/next-workflow/**',
      'learning/NEXT_WORKFLOW_*.json',
      'tools/agent-selection-settings',
      'tools/next-workflow',
      'tools/next-workflow.mjs',
      'tools/lib/next_workflow/**',
      'tools/check_next_workflow*',
      'tools/test_next_workflow*'
    ])
  }
];

function assertObject(value, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`${label} must be an object.`);
}

function assertKeys(value, allowed, label) {
  const unsupported = Object.keys(value).filter((key) => !allowed.includes(key));
  if (unsupported.length) throw new Error(`${label} contains unsupported field(s): ${unsupported.join(', ')}.`);
}

function assertStrings(value, label, { empty = true } = {}) {
  if (!Array.isArray(value) || (!empty && value.length === 0) || value.some((item) => typeof item !== 'string' || item.length === 0)) {
    throw new Error(`${label} must be ${empty ? 'an' : 'a non-empty'} array of non-empty strings.`);
  }
  if (new Set(value).size !== value.length) throw new Error(`${label} must not contain duplicates.`);
}

export function normalizeRepoPath(value) {
  if (typeof value !== 'string' || value.length === 0 || value.length > MAX_PATTERN_LENGTH || /[\0-\x1f\x7f]/.test(value) || value.includes('\\')) {
    throw new Error(`Path must be a bounded printable POSIX repository-relative path: ${String(value)}`);
  }
  if (value.startsWith('/') || value.startsWith('./') || value.endsWith('/') || value.split('/').some((part) => part === '' || part === '.' || part === '..')) {
    throw new Error(`Path must stay repository-relative and normalized: ${value}`);
  }
  const normalized = path.posix.normalize(value);
  if (normalized !== value || normalized === '..' || normalized.startsWith('../') || path.posix.isAbsolute(normalized)) {
    throw new Error(`Path must stay repository-relative and normalized: ${value}`);
  }
  return normalized;
}

export function globToRegExp(pattern) {
  normalizeRepoPath(pattern);
  if (/[?\[\]{}()!+@]/.test(pattern) || /\*{3,}/.test(pattern)) throw new Error(`Unsupported document-sync glob syntax: ${pattern}`);
  let source = '';
  for (let index = 0; index < pattern.length; index += 1) {
    const char = pattern[index];
    if (char === '*' && pattern[index + 1] === '*') {
      const slash = pattern[index + 2] === '/';
      source += slash ? '(?:.*/)?' : '.*';
      index += slash ? 2 : 1;
    } else if (char === '*') source += '[^/]*';
    else source += char.replace(/[|\\{}()[\]^$+?.]/g, '\\$&');
  }
  return new RegExp(`^${source}$`);
}

function validateRequirements(value, label, patternCounter) {
  assertObject(value, label);
  assertKeys(value, ['all_of', 'any_of'], label);
  if (value.all_of !== undefined) assertStrings(value.all_of, `${label}.all_of`);
  if (value.any_of !== undefined) {
    if (!Array.isArray(value.any_of)) throw new Error(`${label}.any_of must be an array of path arrays.`);
    value.any_of.forEach((group, index) => assertStrings(group, `${label}.any_of[${index}]`, { empty: false }));
  }
  if (!(value.all_of?.length || value.any_of?.length)) throw new Error(`${label} needs all_of or any_of requirements.`);
  for (const item of [...(value.all_of ?? []), ...(value.any_of ?? []).flat()]) {
    normalizeRepoPath(item);
    patternCounter.count += 1;
  }
}

export function validateRepositoryDocumentSyncPolicy(policy) {
  assertObject(policy, 'policy');
  assertKeys(policy, ['schema_version', 'kind', 'repository_scope', 'external_repository_access', 'excluded_paths', 'document_groups', 'rules'], 'policy');
  if (policy.schema_version !== POLICY_VERSION) throw new Error(`Unsupported repository document-sync policy version: ${policy.schema_version ?? 'missing'}.`);
  if (policy.kind !== 'repository-document-sync-policy') throw new Error('Policy kind must be repository-document-sync-policy.');
  if (policy.repository_scope !== 'current-repository-only') throw new Error('repository_scope must remain current-repository-only.');
  if (policy.external_repository_access !== false) throw new Error('external_repository_access must remain false.');
  assertStrings(policy.excluded_paths, 'excluded_paths');
  const patternCounter = { count: 0 };
  for (const pattern of policy.excluded_paths) {
    globToRegExp(pattern);
    patternCounter.count += 1;
  }
  assertObject(policy.document_groups, 'document_groups');
  const groupEntries = Object.entries(policy.document_groups);
  if (groupEntries.length === 0 || groupEntries.length > MAX_GROUPS) throw new Error(`document_groups must contain 1-${MAX_GROUPS} entries.`);
  for (const [id, requirements] of groupEntries) {
    if (!/^[a-z0-9][a-z0-9_-]*$/.test(id)) throw new Error(`Invalid document group id: ${id}.`);
    validateRequirements(requirements, `document_groups.${id}`, patternCounter);
  }
  if (!Array.isArray(policy.rules) || policy.rules.length === 0 || policy.rules.length > MAX_RULES) throw new Error(`rules must contain 1-${MAX_RULES} entries.`);
  const ids = new Set();
  for (const [index, rule] of policy.rules.entries()) {
    assertObject(rule, `rules[${index}]`);
    assertKeys(rule, ['id', 'description', 'trigger', 'required_groups', 'cannot_be_exempted'], `rules[${index}]`);
    if (typeof rule.id !== 'string' || !/^[a-z0-9][a-z0-9_-]*$/.test(rule.id) || ids.has(rule.id)) throw new Error(`Invalid or duplicate rule id: ${String(rule.id)}.`);
    ids.add(rule.id);
    if (typeof rule.description !== 'string' || !rule.description.trim() || rule.description.length > 1000) throw new Error(`rules.${rule.id}.description is invalid.`);
    assertObject(rule.trigger, `rules.${rule.id}.trigger`);
    assertKeys(rule.trigger, ['any_of', 'all_of', 'exclude'], `rules.${rule.id}.trigger`);
    for (const key of ['any_of', 'all_of', 'exclude']) {
      if (rule.trigger[key] !== undefined) {
        assertStrings(rule.trigger[key], `rules.${rule.id}.trigger.${key}`);
        for (const pattern of rule.trigger[key]) {
          globToRegExp(pattern);
          patternCounter.count += 1;
        }
      }
    }
    if (!(rule.trigger.any_of?.length || rule.trigger.all_of?.length)) throw new Error(`rules.${rule.id}.trigger needs any_of or all_of.`);
    assertStrings(rule.required_groups, `rules.${rule.id}.required_groups`, { empty: false });
    for (const id of rule.required_groups) if (!Object.hasOwn(policy.document_groups, id)) throw new Error(`rules.${rule.id} references unknown group ${id}.`);
    if (rule.cannot_be_exempted !== undefined && typeof rule.cannot_be_exempted !== 'boolean') throw new Error(`rules.${rule.id}.cannot_be_exempted must be boolean.`);
  }
  if (patternCounter.count > MAX_PATTERNS) throw new Error(`Policy exceeds the ${MAX_PATTERNS} pattern limit.`);
  for (const immutable of IMMUTABLE_RULES) {
    const rule = policy.rules.find((candidate) => candidate.id === immutable.id);
    if (!rule || rule.cannot_be_exempted !== true) throw new Error(`Immutable ${immutable.label} rule is missing or exemptible: ${immutable.id}.`);
    for (const group of immutable.groups) if (!rule.required_groups.includes(group)) throw new Error(`${immutable.label} rule is missing required group: ${group}.`);
    for (const pathname of immutable.paths) if (!(rule.trigger.any_of ?? []).includes(pathname)) throw new Error(`${immutable.label} rule is missing protected path: ${pathname}.`);
  }
  return policy;
}

export async function loadRepositoryDocumentSyncPolicy(root) {
  const policyPath = path.join(root, 'docs/workflow/REPOSITORY_DOCUMENT_SYNC_POLICY.json');
  const info = await lstat(policyPath);
  if (!info.isFile() || info.isSymbolicLink()) throw new Error('Repository document-sync policy must be a regular non-symlink file.');
  if (info.size > MAX_POLICY_BYTES) throw new Error(`Repository document-sync policy exceeds ${MAX_POLICY_BYTES} bytes.`);
  return validateRepositoryDocumentSyncPolicy(JSON.parse(await readFile(policyPath, 'utf8')));
}

function matches(pathname, patterns) {
  return patterns.some((pattern) => globToRegExp(pattern).test(pathname));
}

export function parseNameStatusZ(buffer) {
  const fields = buffer.toString('utf8').split('\0');
  if (fields.at(-1) === '') fields.pop();
  const records = [];
  for (let index = 0; index < fields.length;) {
    const rawStatus = fields[index++];
    const status = rawStatus?.[0];
    if (!STATUS_KINDS.has(status)) throw new Error(`Unsupported git name-status record: ${String(rawStatus)}.`);
    if (status === 'R' || status === 'C') {
      if (index + 1 >= fields.length) throw new Error(`Incomplete git name-status record for ${rawStatus}.`);
      records.push({ status, old_path: normalizeRepoPath(fields[index++]), path: normalizeRepoPath(fields[index++]) });
    } else {
      if (index >= fields.length) throw new Error(`Incomplete git name-status record for ${rawStatus}.`);
      records.push({ status, path: normalizeRepoPath(fields[index++]) });
    }
    if (records.length > MAX_RECORDS) throw new Error(`Changed record count exceeds ${MAX_RECORDS}.`);
  }
  return records;
}

export function recordsFromPaths(paths) {
  if (!Array.isArray(paths) || paths.length > MAX_RECORDS) throw new Error(`Changed paths must contain at most ${MAX_RECORDS} entries.`);
  return paths.map((pathname) => ({ status: 'M', path: normalizeRepoPath(pathname) }));
}

function normalizeRecords(records) {
  if (!Array.isArray(records) || records.length > MAX_RECORDS) throw new Error(`Changed records must contain at most ${MAX_RECORDS} entries.`);
  return records.map((record, index) => {
    assertObject(record, `records[${index}]`);
    assertKeys(record, ['status', 'path', 'old_path'], `records[${index}]`);
    if (!STATUS_KINDS.has(record.status)) throw new Error(`records[${index}].status is unsupported.`);
    const normalized = { status: record.status, path: normalizeRepoPath(record.path) };
    if (record.status === 'R' || record.status === 'C') normalized.old_path = normalizeRepoPath(record.old_path);
    else if (record.old_path !== undefined) throw new Error(`records[${index}].old_path is only valid for rename/copy.`);
    return normalized;
  });
}

function ruleMatches(rule, triggerPaths) {
  const candidates = triggerPaths.filter((pathname) => !matches(pathname, rule.trigger.exclude ?? []));
  if (rule.trigger.all_of?.some((pattern) => !candidates.some((pathname) => globToRegExp(pattern).test(pathname)))) return false;
  if (rule.trigger.any_of?.length && !candidates.some((pathname) => matches(pathname, rule.trigger.any_of))) return false;
  return true;
}

export function evaluateRepositoryDocumentSync(policyInput, changedRecords) {
  const policy = validateRepositoryDocumentSyncPolicy(policyInput);
  const records = normalizeRecords(changedRecords);
  const excluded = (pathname) => matches(pathname, policy.excluded_paths);
  const triggerPaths = [...new Set(records.flatMap((record) => [record.path, record.old_path].filter(Boolean)).filter((pathname) => !excluded(pathname)))].sort();
  const satisfactionPaths = [...new Set(records.filter((record) => record.status !== 'D').map((record) => record.path).filter((pathname) => !excluded(pathname)))].sort();
  const matchedRules = policy.rules.filter((rule) => ruleMatches(rule, triggerPaths));
  const groupIds = [...new Set(matchedRules.flatMap((rule) => rule.required_groups))].sort();
  const missingAll = new Set();
  const missingAny = [];
  for (const groupId of groupIds) {
    const requirements = policy.document_groups[groupId];
    for (const required of requirements.all_of ?? []) if (!satisfactionPaths.includes(required)) missingAll.add(required);
    for (const alternatives of requirements.any_of ?? []) {
      if (!alternatives.some((required) => satisfactionPaths.includes(required))) missingAny.push({ group_id: groupId, alternatives });
    }
  }
  return {
    status: missingAll.size || missingAny.length ? 'fail' : 'pass',
    changed_records: records,
    trigger_paths: triggerPaths,
    satisfaction_paths: satisfactionPaths,
    excluded_paths: [...new Set(records.flatMap((record) => [record.path, record.old_path].filter(Boolean)).filter(excluded))].sort(),
    matched_rules: matchedRules.map(({ id, description, cannot_be_exempted }) => ({ id, description, cannot_be_exempted: cannot_be_exempted === true })),
    required_groups: groupIds,
    missing_all_of: [...missingAll].sort(),
    missing_any_of: missingAny
  };
}
