import {
  closeSync,
  constants as fsConstants,
  fstatSync,
  lstatSync,
  openSync,
  readFileSync,
  realpathSync,
} from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

export class DevelopmentInstructionError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'DevelopmentInstructionError';
    this.code = code;
  }
}

const POLICY_KEYS = new Set([
  'schema_version',
  'activation_mode',
  'invariant_authority_path',
  'instruction_authority_scope',
  'parent_fallback_trigger',
  'parent_instruction_path',
  'local_instruction_path',
  'autonomy_workflow_path',
  'repository_workflow_path',
  'workflow_context_map_path',
  'menu_profile_policy_path',
  'product_registry_path',
  'product_selection_path',
  'product_operation_mode_path',
  'product_agents_path',
  'product_git_usage_policy_path',
  'product_git_usage_settings_path',
  'git_workflow_policy_path',
  'git_workflow_settings_path',
  'parent_workflow_kinds',
  'product_workflow_kinds',
  'parent_profile_scope',
  'product_profile_scope',
  'parent_workflow_skill',
  'product_workflow_skill',
  'required_product_operation_mode',
  'required_product_managed_flag',
  'supported_instruction_versions',
  'parent_instruction_version',
  'required_stages',
  'required_parent_anchors',
  'maximum_instruction_bytes',
  'maximum_scope_id_length',
  'parent_git_usage_mode',
  'next_workflow_activation_path',
  'next_workflow_release_prerequisites_path',
  'next_workflow_parent_child_contract_path',
  'next_workflow_team_contract_path',
]);

const REQUIRED_GIT_KEYS = new Set([
  'automation_level',
  'commit_automation',
  'push_automation',
  'pr_creation',
  'pr_ci_monitoring',
  'merge_execution',
  'developer_auto_merge_allowed',
  'main_ci_monitoring',
  'sync_monitoring',
]);

function fail(code, message) {
  throw new DevelopmentInstructionError(code, message);
}

function splitList(value) {
  return String(value ?? '').split('|').map((item) => item.trim()).filter(Boolean);
}

function isSafeId(value) {
  return /^[a-z0-9][a-z0-9._:-]*$/.test(String(value ?? ''));
}

function canonicalJson(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  if (value && typeof value === 'object') return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(',')}}`;
  return JSON.stringify(value);
}

function digest(value) {
  return createHash('sha256').update(typeof value === 'string' ? value : canonicalJson(value)).digest('hex');
}

function isSafeRelativePath(value) {
  if (typeof value !== 'string' || !value || value.includes('\0') || value.includes('\\')) return false;
  if (path.posix.isAbsolute(value)) return false;
  return !value.split('/').some((part) => !part || part === '.' || part === '..');
}

function ensureInside(root, candidate, label) {
  const resolvedRoot = path.resolve(root);
  const resolved = path.resolve(candidate);
  if (resolved !== resolvedRoot && !resolved.startsWith(resolvedRoot + path.sep)) {
    fail('PATH_ESCAPE', label + ' escapes its configured repository root.');
  }
  return resolved;
}

function statIdentity(stat) {
  return [stat.dev, stat.ino, stat.mode, stat.size, stat.mtimeMs, stat.ctimeMs].join(':');
}

export function readSafeTextFile(file, {
  root,
  label,
  maximumBytes,
  allowMissing = false,
} = {}) {
  const safeLabel = label || 'configured file';
  const resolved = ensureInside(root, file, safeLabel);
  let before;
  try {
    before = lstatSync(resolved);
  } catch (error) {
    if (allowMissing && error?.code === 'ENOENT') return null;
    fail('FILE_UNREADABLE', safeLabel + ' is not readable.');
  }
  if (before.isSymbolicLink()) fail('FILE_SYMLINK', safeLabel + ' must not be a symbolic link.');
  if (!before.isFile()) fail('FILE_TYPE', safeLabel + ' must be a regular file.');
  if (before.size > maximumBytes) fail('FILE_OVERSIZED', safeLabel + ' exceeds the configured byte limit.');

  let descriptor;
  let bytes;
  try {
    descriptor = openSync(resolved, fsConstants.O_RDONLY | (fsConstants.O_NOFOLLOW || 0));
    const opened = fstatSync(descriptor);
    if (statIdentity(before) !== statIdentity(opened)) {
      fail('FILE_CHANGED', safeLabel + ' changed while it was opened.');
    }
    bytes = readFileSync(descriptor);
    const after = fstatSync(descriptor);
    if (statIdentity(opened) !== statIdentity(after) || bytes.length !== after.size) {
      fail('FILE_CHANGED', safeLabel + ' changed while it was read.');
    }
  } catch (error) {
    if (error instanceof DevelopmentInstructionError) throw error;
    fail('FILE_UNREADABLE', safeLabel + ' could not be read safely.');
  } finally {
    if (descriptor !== undefined) closeSync(descriptor);
  }

  if (bytes.length > maximumBytes) fail('FILE_OVERSIZED', safeLabel + ' exceeds the configured byte limit.');
  if (bytes.includes(0)) fail('FILE_NUL', safeLabel + ' contains a NUL byte.');
  let text;
  try {
    text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    fail('FILE_ENCODING', safeLabel + ' must be valid UTF-8.');
  }
  return {
    text,
    bytes,
    digest: createHash('sha256').update(bytes).digest('hex'),
  };
}

function parseRows(text, columns, label) {
  const rows = [];
  const lines = text.split(/\r?\n/);
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (!line.trim() || line.startsWith('#')) continue;
    const parts = line.split('\t');
    if (parts.length !== columns) {
      fail('POLICY_COLUMNS', label + ' row ' + (index + 1) + ' must have ' + columns + ' tab-separated fields.');
    }
    if (parts.some((part) => !part.trim())) {
      fail('POLICY_EMPTY', label + ' row ' + (index + 1) + ' contains an empty field.');
    }
    rows.push(parts);
  }
  return rows;
}

function readConfigured(parentRoot, relativePath, label, maximumBytes = 1048576) {
  if (!isSafeRelativePath(relativePath)) fail('POLICY_PATH', label + ' must be a safe configured relative path.');
  return readSafeTextFile(path.join(parentRoot, relativePath), {
    root: parentRoot,
    label,
    maximumBytes,
  }).text;
}

function parsePolicy(parentRoot, policyPath) {
  const resolvedPolicy = policyPath
    ? ensureInside(parentRoot, policyPath, 'development instruction policy')
    : path.join(parentRoot, 'docs/workflow/DEVELOPMENT_INSTRUCTION_POLICY.tsv');
  const text = readSafeTextFile(resolvedPolicy, {
    root: parentRoot,
    label: 'development instruction policy',
    maximumBytes: 131072,
  }).text;
  const rows = parseRows(text, 3, 'development instruction policy');
  const policy = new Map();
  for (const [key, value] of rows) {
    if (!POLICY_KEYS.has(key)) fail('POLICY_KEY', 'Unknown development instruction policy key: ' + key);
    if (policy.has(key)) fail('POLICY_DUPLICATE', 'Duplicate development instruction policy key: ' + key);
    policy.set(key, value);
  }
  for (const key of POLICY_KEYS) {
    if (!policy.has(key)) fail('POLICY_MISSING', 'Missing development instruction policy key: ' + key);
  }
  if (policy.get('schema_version') !== '1.1.0') fail('POLICY_VERSION', 'Unsupported development instruction policy version.');
  if (!['shadow', 'enforce'].includes(policy.get('activation_mode'))) {
    fail('POLICY_ACTIVATION', 'Development instruction activation mode must be shadow or enforce.');
  }
  for (const key of [
    'invariant_authority_path',
    'parent_instruction_path',
    'local_instruction_path',
    'autonomy_workflow_path',
    'repository_workflow_path',
    'workflow_context_map_path',
    'menu_profile_policy_path',
    'product_registry_path',
    'product_selection_path',
    'product_operation_mode_path',
    'product_agents_path',
    'product_git_usage_policy_path',
    'product_git_usage_settings_path',
    'git_workflow_policy_path',
    'git_workflow_settings_path',
    'next_workflow_activation_path',
    'next_workflow_release_prerequisites_path',
    'next_workflow_parent_child_contract_path',
    'next_workflow_team_contract_path',
  ]) {
    if (!isSafeRelativePath(policy.get(key))) fail('POLICY_PATH', key + ' must be a safe relative path.');
  }
  if (policy.get('instruction_authority_scope') !== 'procedural') {
    fail('POLICY_AUTHORITY_SCOPE', 'instruction_authority_scope must be procedural.');
  }
  if (policy.get('parent_fallback_trigger') !== 'exact_absence_only') {
    fail('POLICY_FALLBACK_TRIGGER', 'parent_fallback_trigger must be exact_absence_only.');
  }
  for (const key of ['maximum_instruction_bytes', 'maximum_scope_id_length']) {
    const value = Number(policy.get(key));
    if (!Number.isSafeInteger(value) || value < 1) fail('POLICY_NUMBER', key + ' must be a positive integer.');
  }
  if (!['none', 'local', 'remote_sync', 'ci'].includes(policy.get('parent_git_usage_mode'))) {
    fail('POLICY_GIT_MODE', 'parent_git_usage_mode is unsupported.');
  }
  return policy;
}

function parseRepositoryPhases(parentRoot, policy) {
  const rows = parseRows(
    readConfigured(parentRoot, policy.get('repository_workflow_path'), 'repository workflow policy'),
    11,
    'repository workflow policy',
  );
  const ids = new Set();
  const orders = new Set();
  for (const row of rows) {
    const phaseId = row[0];
    const order = Number(row[1]);
    if (!isSafeId(phaseId) || !Number.isSafeInteger(order) || order < 1) {
      fail('REPOSITORY_PHASE', 'Repository workflow phase identity or order is invalid.');
    }
    if (ids.has(phaseId) || orders.has(order)) fail('REPOSITORY_PHASE', 'Repository workflow phase identity or order is duplicated.');
    ids.add(phaseId);
    orders.add(order);
  }
  const sorted = [...orders].sort((left, right) => left - right);
  if (sorted.some((order, index) => order !== index + 1)) {
    fail('REPOSITORY_PHASE', 'Repository workflow phase order must be contiguous.');
  }
  return ids;
}

function parseAutonomy(parentRoot, policy, repositoryPhases) {
  const text = readConfigured(parentRoot, policy.get('autonomy_workflow_path'), 'development autonomy workflow');
  const rows = parseRows(text, 10, 'development autonomy workflow');
  const requiredStages = splitList(policy.get('required_stages'));
  const byStage = new Map();
  const orders = new Set();
  for (const row of rows) {
    const [stageId, rawOrder, stageName, repositoryPhaseList, cycleScope, writeScope, approvalMode, continuationMode, gitPolicy, stopConditions] = row;
    const order = Number(rawOrder);
    if (!requiredStages.includes(stageId) || byStage.has(stageId)) {
      fail('AUTONOMY_STAGE', 'Development autonomy workflow has an unknown or duplicate stage.');
    }
    if (!Number.isSafeInteger(order) || order < 1 || orders.has(order)) {
      fail('AUTONOMY_ORDER', 'Development autonomy workflow order is invalid or duplicated.');
    }
    for (const phaseId of splitList(repositoryPhaseList)) {
      if (!repositoryPhases.has(phaseId)) {
        fail('AUTONOMY_PHASE', 'Development autonomy workflow references an unknown repository phase.');
      }
    }
    if (![stageName, cycleScope, writeScope, approvalMode, continuationMode, gitPolicy].every(isSafeId)) {
      fail('AUTONOMY_VALUE', 'Development autonomy workflow contains an unsafe policy identifier.');
    }
    const stops = splitList(stopConditions);
    if (!stops.length || !stops.every(isSafeId)) fail('AUTONOMY_STOP', 'Development autonomy stop conditions are invalid.');
    byStage.set(stageId, {
      stage_id: stageId,
      order,
      stage_name: stageName,
      repository_phases: splitList(repositoryPhaseList),
      cycle_scope: cycleScope,
      write_scope: writeScope,
      approval_mode: approvalMode,
      continuation_mode: continuationMode,
      git_policy: gitPolicy,
      stop_conditions: stops,
    });
    orders.add(order);
  }
  if (requiredStages.length !== rows.length || requiredStages.some((stage) => !byStage.has(stage))) {
    fail('AUTONOMY_STAGE', 'Development autonomy workflow must define every required stage exactly once.');
  }
  const sorted = [...byStage.values()].sort((left, right) => left.order - right.order);
  if (sorted.some((item, index) => item.order !== index + 1 || item.stage_id !== requiredStages[index])) {
    fail('AUTONOMY_ORDER', 'Development autonomy stages must follow the configured required order.');
  }
  return { byStage, stages: sorted };
}

function parseContextMaps(parentRoot, policy) {
  const contextRows = parseRows(
    readConfigured(parentRoot, policy.get('workflow_context_map_path'), 'workflow context map'),
    6,
    'workflow context map',
  ).map((row) => ({
    context_id: row[0],
    menu_item: row[1],
    workflow_kind: row[2],
    product_repo_required: row[3],
  }));
  const profileRows = parseRows(
    readConfigured(parentRoot, policy.get('menu_profile_policy_path'), 'menu product profile policy'),
    8,
    'menu product profile policy',
  ).map((row) => ({
    menu_item: row[0],
    menu_id: row[1],
    profile_scope: row[2],
  }));
  const contextIds = new Set();
  const menuItems = new Set();
  for (const row of contextRows) {
    if (!isSafeId(row.context_id) || !/^[1-9][0-9]*$/.test(row.menu_item) || contextIds.has(row.context_id) || menuItems.has(row.menu_item)) {
      fail('CONTEXT_MAP', 'Workflow context map identity is invalid or duplicated.');
    }
    contextIds.add(row.context_id);
    menuItems.add(row.menu_item);
  }
  const profileItems = new Set();
  for (const row of profileRows) {
    if (!/^[1-9][0-9]*$/.test(row.menu_item) || !isSafeId(row.menu_id) || profileItems.has(row.menu_item)) {
      fail('MENU_PROFILE', 'Menu profile identity is invalid or duplicated.');
    }
    profileItems.add(row.menu_item);
  }
  for (const row of contextRows) {
    if (!profileItems.has(row.menu_item)) fail('CONTEXT_JOIN', 'Workflow context has no menu profile joined by menu item.');
  }
  return { contextRows, profileRows };
}

function contextTarget({ policy, maps, contextId, targetKind }) {
  const parentKinds = new Set(splitList(policy.get('parent_workflow_kinds')));
  const productKinds = new Set(splitList(policy.get('product_workflow_kinds')));
  let context;
  if (targetKind === 'parent') {
    const candidates = maps.contextRows.filter((row) => parentKinds.has(row.workflow_kind));
    if (candidates.length !== 1) fail('TARGET_CONTEXT', 'Parent target kind must resolve to exactly one configured workflow context.');
    context = candidates[0];
  } else {
    context = maps.contextRows.find((row) => row.context_id === contextId);
    if (!context) fail('TARGET_CONTEXT', 'Unknown development workflow context.');
  }
  const profile = maps.profileRows.find((row) => row.menu_item === context.menu_item);
  if (!profile) fail('CONTEXT_JOIN', 'Development workflow context has no joined menu profile.');
  if (parentKinds.has(context.workflow_kind)) {
    if (profile.profile_scope !== policy.get('parent_profile_scope')) {
      fail('TARGET_SCOPE', 'Parent development context has the wrong configured profile scope.');
    }
    return { applicable: true, targetKind: 'parent', context, profile };
  }
  if (productKinds.has(context.workflow_kind)) {
    if (profile.profile_scope !== policy.get('product_profile_scope') || context.product_repo_required !== 'true') {
      fail('TARGET_SCOPE', 'Product development context has the wrong configured target contract.');
    }
    return { applicable: true, targetKind: 'product', context, profile };
  }
  return { applicable: false, targetKind: 'not_applicable', context, profile };
}

function expandConfiguredRepositoryPath(raw, home) {
  let expanded = raw;
  if (expanded === '$HOME') expanded = home;
  else if (expanded.startsWith('$HOME/')) expanded = path.join(home, expanded.slice(6));
  if (!path.isAbsolute(expanded) || expanded.includes('\0')) {
    fail('REGISTRY_PATH', 'Selected repository path must be an absolute configured path or use the supported home placeholder.');
  }
  return path.resolve(expanded);
}

function selectedProductTarget(parentRoot, policy, contextId, requestedRepo, home) {
  const registryRows = parseRows(
    readConfigured(parentRoot, policy.get('product_registry_path'), 'product repository registry'),
    7,
    'product repository registry',
  );
  const selectionRows = parseRows(
    readConfigured(parentRoot, policy.get('product_selection_path'), 'product repository selection'),
    4,
    'product repository selection',
  );
  const matchingSelections = selectionRows.filter((row) => row[0] === contextId);
  if (matchingSelections.length !== 1) {
    fail('SELECTION_REQUIRED', 'Product development fallback requires exactly one explicit selected repository for the context.');
  }
  const selectedId = matchingSelections[0][1];
  const matches = registryRows.filter((row) => row[0] === selectedId);
  if (matches.length !== 1) fail('REGISTRY_SELECTION', 'Selected product repository is missing or duplicated in the registry.');
  const row = matches[0];
  if (!splitList(row[2]).includes(contextId)) fail('REGISTRY_CONTEXT', 'Selected product repository is not allowed for this context.');
  const configured = expandConfiguredRepositoryPath(row[4], home);
  let real;
  try {
    const stat = lstatSync(configured);
    if (stat.isSymbolicLink() || !stat.isDirectory()) fail('REGISTRY_PATH', 'Selected product repository must be a real directory.');
    real = realpathSync(configured);
  } catch (error) {
    if (error instanceof DevelopmentInstructionError) throw error;
    fail('REGISTRY_PATH', 'Selected product repository directory is unavailable.');
  }
  if (requestedRepo) {
    let requestedReal;
    try {
      requestedReal = realpathSync(path.resolve(requestedRepo));
    } catch {
      fail('REGISTRY_MISMATCH', 'Requested repository does not match the selected product repository.');
    }
    if (requestedReal !== real) fail('REGISTRY_MISMATCH', 'Requested repository does not match the selected product repository.');
  }
  return real;
}

function defaultGitTopLevel(root) {
  let top;
  try {
    top = execFileSync('git', ['-C', root, 'rev-parse', '--show-toplevel'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    fail('GIT_TOPLEVEL', 'Target repository must be a readable Git worktree.');
  }
  return top;
}

function verifyGitTopLevel(root, resolver = defaultGitTopLevel) {
  let top;
  try {
    top = resolver(root);
  } catch (error) {
    if (error instanceof DevelopmentInstructionError) throw error;
    fail('GIT_TOPLEVEL', 'Target Git top-level is unavailable.');
  }
  let realTop;
  try {
    realTop = realpathSync(top);
  } catch {
    fail('GIT_TOPLEVEL', 'Target Git top-level is unavailable.');
  }
  if (realTop !== realpathSync(root)) fail('GIT_TOPLEVEL', 'Target path must equal its Git top-level.');
}

function validateProductMode(root, policy) {
  const agents = readSafeTextFile(path.join(root, policy.get('product_agents_path')), {
    root,
    label: 'product AGENTS entry',
    maximumBytes: Number(policy.get('maximum_instruction_bytes')),
  });
  if (!agents.text.trim()) fail('PRODUCT_AGENTS', 'Product AGENTS entry must not be empty.');
  const modeText = readSafeTextFile(path.join(root, policy.get('product_operation_mode_path')), {
    root,
    label: 'product operation mode',
    maximumBytes: Number(policy.get('maximum_instruction_bytes')),
  }).text;
  const rows = parseRows(modeText, 2, 'product operation mode');
  const values = new Map();
  for (const [key, value] of rows) {
    if (values.has(key)) fail('PRODUCT_MODE', 'Product operation mode contains duplicate keys.');
    values.set(key, value);
  }
  if (values.get('workflow_mode') !== policy.get('required_product_operation_mode')
    || values.get('managed_by_parent') !== policy.get('required_product_managed_flag')) {
    fail('PRODUCT_MODE', 'Selected product repository is not in the required parent-managed operation mode.');
  }
}

export function validateInstructionText(text, policy, profile) {
  const requiredStages = splitList(policy.get('required_stages'));
  const stageCounts = new Map(requiredStages.map((stage) => [stage, 0]));
  for (const line of text.split(/\r?\n/)) {
    const match = /^##[ \t]+([A-F])\.(?:[ \t]|$)/.exec(line);
    if (match && stageCounts.has(match[1])) stageCounts.set(match[1], stageCounts.get(match[1]) + 1);
  }
  for (const stage of requiredStages) {
    if (stageCounts.get(stage) !== 1) {
      fail('INSTRUCTION_STAGE', 'Instruction memory must contain exactly one heading for stage ' + stage + '.');
    }
  }
  const versionMatches = [...text.matchAll(/^Instruction-Memory-Version:[ \t]*([^\s]+)[ \t]*$/gm)];
  if (versionMatches.length > 1) fail('INSTRUCTION_VERSION', 'Instruction memory declares its version more than once.');
  const version = versionMatches.length === 1 ? versionMatches[0][1] : 'versionless';
  if (!splitList(policy.get('supported_instruction_versions')).includes(version)) {
    fail('INSTRUCTION_VERSION', 'Instruction memory declares an unsupported version.');
  }
  if (profile === 'parent_fallback') {
    if (version !== policy.get('parent_instruction_version')) {
      fail('INSTRUCTION_VERSION', 'Parent fallback instruction memory must declare the configured strict version.');
    }
    for (const anchor of splitList(policy.get('required_parent_anchors'))) {
      if (!text.includes(anchor)) fail('INSTRUCTION_ANCHOR', 'Parent fallback instruction memory is missing a required rule anchor.');
    }
  }
  const sectionMatches = [...text.matchAll(/^##[ \t]+([A-F])\.(?:[ \t]|$).*$/gm)];
  const sectionFingerprints = Object.fromEntries(sectionMatches.map((match, index) => {
    const end = sectionMatches[index + 1]?.index ?? text.length;
    return [match[1], digest(text.slice(match.index, end).trim())];
  }));
  const ruleIds = [...new Set([...text.matchAll(/`(workflow-rule:[a-z0-9][a-z0-9-]*)`/g)].map((match) => match[1]))].sort();
  const proceduralContract = { version, stages: requiredStages, section_fingerprints: sectionFingerprints, rule_ids: ruleIds };
  return {
    version,
    profile: profile === 'parent_fallback' ? 'parent_strict' : (version === 'versionless' ? 'local_compatibility' : 'local_versioned'),
    stages: requiredStages,
    procedural_contract: { ...proceduralContract, contract_fingerprint: digest(proceduralContract) },
  };
}

function parseGitSettings(parentRoot, policy) {
  const policyRows = parseRows(
    readConfigured(parentRoot, policy.get('git_workflow_policy_path'), 'Git workflow policy'),
    5,
    'Git workflow policy',
  );
  const settingsRows = parseRows(
    readConfigured(parentRoot, policy.get('git_workflow_settings_path'), 'Git workflow settings'),
    2,
    'Git workflow settings',
  );
  const definitions = new Map();
  for (const [key, allowed, defaultValue] of policyRows) {
    if (definitions.has(key)) fail('GIT_POLICY', 'Git workflow policy contains duplicate keys.');
    const allowedValues = splitList(allowed);
    if (!allowedValues.includes(defaultValue)) fail('GIT_POLICY', 'Git workflow policy default is not allowed.');
    definitions.set(key, { allowed: allowedValues, defaultValue });
  }
  for (const key of REQUIRED_GIT_KEYS) {
    if (!definitions.has(key)) fail('GIT_POLICY', 'Git workflow policy is missing a required action setting.');
  }
  const settings = new Map();
  for (const [key, value] of settingsRows) {
    if (!definitions.has(key) || settings.has(key) || !definitions.get(key).allowed.includes(value)) {
      fail('GIT_SETTINGS', 'Git workflow settings contain an unknown, duplicate, or unsupported value.');
    }
    settings.set(key, value);
  }
  for (const [key, definition] of definitions) {
    if (!settings.has(key)) settings.set(key, definition.defaultValue);
  }
  return settings;
}

function productGitMode(parentRoot, policy, contextId) {
  const policyRows = parseRows(
    readConfigured(parentRoot, policy.get('product_git_usage_policy_path'), 'product Git usage policy'),
    5,
    'product Git usage policy',
  );
  const settingsRows = parseRows(
    readConfigured(parentRoot, policy.get('product_git_usage_settings_path'), 'product Git usage settings'),
    3,
    'product Git usage settings',
  );
  const definitions = policyRows.filter((row) => row[0] === contextId);
  if (definitions.length !== 1) fail('PRODUCT_GIT_POLICY', 'Product development context must have exactly one Git usage policy row.');
  const allowed = splitList(definitions[0][1]);
  const defaultMode = definitions[0][2];
  if (!allowed.includes(defaultMode)) fail('PRODUCT_GIT_POLICY', 'Product Git usage default is unsupported.');
  const selected = settingsRows.filter((row) => row[0] === contextId);
  if (selected.length > 1) fail('PRODUCT_GIT_SETTINGS', 'Product Git usage setting is duplicated.');
  const mode = selected.length === 1 ? selected[0][1] : defaultMode;
  if (!allowed.includes(mode)) fail('PRODUCT_GIT_SETTINGS', 'Product Git usage setting is unsupported.');
  return mode;
}

function buildGitPlan({ parentRoot, policy, targetKind, contextId, stage, taskScope }) {
  if (stage !== 'D') {
    return { mode: 'not_applicable', ceiling: 'none', task_scope: taskScope ? 'present' : 'not_required', automatic: [], manual: [], not_applicable: [] };
  }
  const settings = parseGitSettings(parentRoot, policy);
  const mode = targetKind === 'product' ? productGitMode(parentRoot, policy, contextId) : policy.get('parent_git_usage_mode');
  const modeActions = {
    none: [],
    local: ['commit'],
    remote_sync: ['commit', 'push', 'sync_monitoring'],
    ci: ['commit', 'push', 'pr_creation', 'pr_ci_monitoring', 'merge', 'main_ci_monitoring', 'sync_monitoring'],
  };
  const levels = { manual: 0, commit: 1, pr_ci: 2, sync: 3 };
  const actionLevel = {
    commit: 1,
    push: 2,
    pr_creation: 2,
    pr_ci_monitoring: 2,
    merge: 3,
    main_ci_monitoring: 3,
    sync_monitoring: 3,
  };
  const automationLevel = levels[settings.get('automation_level')];
  if (automationLevel === undefined) fail('GIT_SETTINGS', 'Git automation level is unsupported.');
  const automaticSetting = {
    commit: settings.get('commit_automation') === 'auto',
    push: settings.get('push_automation') === 'auto',
    pr_creation: settings.get('pr_creation') === 'auto',
    pr_ci_monitoring: settings.get('pr_ci_monitoring') === 'auto',
    merge: settings.get('merge_execution') === 'after_approval' && settings.get('developer_auto_merge_allowed') === 'true',
    main_ci_monitoring: settings.get('main_ci_monitoring') === 'auto',
    sync_monitoring: settings.get('sync_monitoring') === 'auto',
  };
  const automatic = [];
  const manual = [];
  const notApplicable = [];
  for (const action of Object.keys(actionLevel)) {
    if (!modeActions[mode].includes(action)) {
      notApplicable.push(action);
    } else if (automationLevel >= actionLevel[action] && automaticSetting[action] && taskScope) {
      automatic.push(action);
    } else {
      manual.push(action);
    }
  }
  let ceiling = 'none';
  if (automationLevel >= 1) ceiling = 'commit';
  if (automationLevel >= 2) ceiling = 'pr_ci';
  if (automationLevel >= 3) ceiling = 'sync';
  return {
    mode,
    ceiling,
    task_scope: taskScope ? 'present' : 'required_for_automatic_actions',
    automatic,
    manual,
    not_applicable: notApplicable,
  };
}

export function loadDevelopmentInstructionAuthorities({ root, policyPath } = {}) {
  const parentRoot = realpathSync(path.resolve(root));
  const policy = parsePolicy(parentRoot, policyPath);
  const repositoryPhases = parseRepositoryPhases(parentRoot, policy);
  const autonomy = parseAutonomy(parentRoot, policy, repositoryPhases);
  const maps = parseContextMaps(parentRoot, policy);
  return { parentRoot, policy, autonomy, maps };
}

export function resolveDevelopmentInstruction({
  root,
  policyPath,
  contextId,
  targetKind,
  repo,
  stage,
  scopeId,
  home = process.env.HOME || '',
  gitTopLevelResolver,
} = {}) {
  const authorities = loadDevelopmentInstructionAuthorities({ root, policyPath });
  const { parentRoot, policy, autonomy, maps } = authorities;
  if (stage && !autonomy.byStage.has(stage)) fail('STAGE', 'Unknown development instruction stage.');
  if (scopeId && (!isSafeId(scopeId) || scopeId.length > Number(policy.get('maximum_scope_id_length')))) {
    fail('TASK_SCOPE', 'Task scope identifier is unsafe or exceeds the configured limit.');
  }
  const target = contextTarget({ policy, maps, contextId, targetKind });
  if (!target.applicable) {
    return {
      status: 'not_applicable',
      activation_mode: policy.get('activation_mode'),
      context_id: target.context.context_id,
      menu_id: target.profile.menu_id,
      workflow_kind: target.context.workflow_kind,
      target_kind: 'not_applicable',
      reason: 'workflow_kind_not_eligible',
    };
  }

  let targetRoot = parentRoot;
  if (target.targetKind === 'product') {
    targetRoot = selectedProductTarget(parentRoot, policy, target.context.context_id, repo, home);
    verifyGitTopLevel(targetRoot, gitTopLevelResolver);
    validateProductMode(targetRoot, policy);
  } else {
    verifyGitTopLevel(parentRoot, gitTopLevelResolver);
  }

  const maximumBytes = Number(policy.get('maximum_instruction_bytes'));
  const localPath = path.join(targetRoot, policy.get('local_instruction_path'));
  let source = 'local';
  let sourceProfile = 'local';
  let relativeSource = policy.get('local_instruction_path');
  let localInstructionState = 'not_applicable';
  let file;
  if (target.targetKind === 'parent') {
    source = 'parent_fallback';
    sourceProfile = 'parent_fallback';
    relativeSource = policy.get('parent_instruction_path');
    file = readSafeTextFile(path.join(parentRoot, relativeSource), {
      root: parentRoot,
      label: 'parent fallback instruction memory',
      maximumBytes,
    });
  } else {
    file = readSafeTextFile(localPath, {
      root: targetRoot,
      label: 'target-local instruction memory',
      maximumBytes,
      allowMissing: true,
    });
    if (file === null) {
      localInstructionState = 'exactly_absent';
      source = 'parent_fallback';
      sourceProfile = 'parent_fallback';
      relativeSource = policy.get('parent_instruction_path');
      file = readSafeTextFile(path.join(parentRoot, relativeSource), {
        root: parentRoot,
        label: 'parent fallback instruction memory',
        maximumBytes,
      });
    } else {
      localInstructionState = 'present_valid';
    }
  }
  const validated = validateInstructionText(file.text, policy, sourceProfile);
  const workflowSkill = target.targetKind === 'parent'
    ? policy.get('parent_workflow_skill')
    : policy.get('product_workflow_skill');
  const stagePolicy = stage && source === 'parent_fallback' ? autonomy.byStage.get(stage) : null;
  let gitPlan = buildGitPlan({
    parentRoot,
    policy,
    targetKind: target.targetKind,
    contextId: target.context.context_id,
    stage,
    taskScope: Boolean(scopeId),
  });
  if (source === 'local' && stage === 'D') {
    gitPlan = {
      ...gitPlan,
      decision_authority: 'local_instruction',
      manual: [...new Set([...gitPlan.manual, ...gitPlan.automatic])],
      automatic: [],
    };
  } else {
    gitPlan.decision_authority = source === 'parent_fallback' ? 'parent_fallback_settings_intersection' : 'not_applicable';
  }
  const fallbackTrigger = policy.get('parent_fallback_trigger');
  const instructionPrecedence = target.targetKind === 'parent'
    ? 'parent_canonical'
    : source === 'local'
      ? 'target_local_first'
      : 'parent_fallback_after_exact_absence';
  return {
    status: 'ready',
    activation_mode: policy.get('activation_mode'),
    source,
    source_path: relativeSource,
    source_profile: validated.profile,
    source_version: validated.version,
    source_digest: file.digest,
    context_id: target.context.context_id,
    menu_id: target.profile.menu_id,
    workflow_kind: target.context.workflow_kind,
    target_kind: target.targetKind,
    workflow_skill: workflowSkill,
    stages: validated.stages,
    stage: stage || 'none',
    stage_policy: stagePolicy,
    invariant_authority: {
      kind: 'agents',
      path: policy.get('invariant_authority_path'),
    },
    instruction_authority: {
      scope: policy.get('instruction_authority_scope'),
      precedence: instructionPrecedence,
      local_state: localInstructionState,
      fallback_trigger: fallbackTrigger,
    },
    local_instruction_priority: true,
    parent_fallback_on: fallbackTrigger,
    git_plan: gitPlan,
    procedural_contract: validated.procedural_contract,
  };
}

export function formatDevelopmentInstruction(result) {
  const lines = [
    'Development instruction status: ' + result.status,
    'Activation mode: ' + result.activation_mode,
    'Context: ' + result.context_id,
    'Menu: ' + result.menu_id,
    'Workflow kind: ' + result.workflow_kind,
    'Target kind: ' + result.target_kind,
  ];
  if (result.status === 'not_applicable') {
    lines.push('Reason: ' + result.reason);
    return lines.join('\n') + '\n';
  }
  lines.push(
    'Instruction source: ' + result.source,
    'Instruction path: ' + result.source_path,
    'Instruction profile: ' + result.source_profile,
    'Instruction digest: ' + result.source_digest,
    'Invariant authority: ' + result.invariant_authority.path,
    'Instruction authority scope: ' + result.instruction_authority.scope,
    'Instruction precedence: ' + result.instruction_authority.precedence,
    'Local instruction state: ' + result.instruction_authority.local_state,
    'Parent fallback trigger: ' + result.instruction_authority.fallback_trigger,
    'Workflow skill: ' + result.workflow_skill,
    'Stage: ' + result.stage,
  );
  if (result.stage_policy) {
    lines.push(
      'Repository phases: ' + result.stage_policy.repository_phases.join('|'),
      'Write scope: ' + result.stage_policy.write_scope,
      'Approval mode: ' + result.stage_policy.approval_mode,
      'Continuation mode: ' + result.stage_policy.continuation_mode,
      'Stop conditions: ' + result.stage_policy.stop_conditions.join('|'),
    );
  } else if (result.source === 'local' && result.stage !== 'none') {
    lines.push('Stage authority: target-local instruction memory');
  }
  if (result.stage === 'D') {
    lines.push(
      'Git usage mode: ' + result.git_plan.mode,
      'Git action authority: ' + result.git_plan.decision_authority,
      'Git automation ceiling: ' + result.git_plan.ceiling,
      'Task scope: ' + result.git_plan.task_scope,
      'Automatic actions: ' + (result.git_plan.automatic.join('|') || 'none'),
      'Manual or blocked actions: ' + (result.git_plan.manual.join('|') || 'none'),
    );
  }
  return lines.join('\n') + '\n';
}
