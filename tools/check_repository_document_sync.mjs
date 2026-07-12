#!/usr/bin/env node
// sync_id: repository_document_sync_enforcement
import { execFileSync } from 'node:child_process';
import { realpath } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import {
  evaluateRepositoryDocumentSync,
  loadRepositoryDocumentSyncPolicy,
  parseNameStatusZ,
  recordsFromPaths,
} from './lib/repository_document_sync.mjs';

const defaultRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ZERO_SHA = /^0{40,64}$/;

function parseArgs(argv) {
  const options = { changedFiles: [] };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--json') options.json = true;
    else if (arg === '--validate-policy') options.validatePolicy = true;
    else if (arg === '--worktree') options.worktree = true;
    else if (['--base', '--head', '--initial-head', '--repo', '--range-mode', '--changed-file'].includes(arg)) {
      const value = argv[++index];
      if (!value) throw new Error(`${arg} requires a value.`);
      if (arg === '--changed-file') options.changedFiles.push(value);
      else options[arg.slice(2).replace(/-([a-z])/g, (_, char) => char.toUpperCase())] = value;
    } else throw new Error(`Unsupported argument: ${arg}`);
  }
  return options;
}

function git(root, args, encoding = 'utf8') {
  return execFileSync('git', ['-C', root, ...args], { encoding, stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 16 * 1024 * 1024 });
}

function commit(root, ref, label) {
  if (!ref || ZERO_SHA.test(ref)) throw new Error(`${label} must be a non-zero commit.`);
  try { return git(root, ['rev-parse', '--verify', `${ref}^{commit}`]).trim(); }
  catch { throw new Error(`${label} is not an available commit: ${ref}`); }
}

function diffRecords(root, base, head, mode) {
  const baseSha = commit(root, base, 'base');
  const headSha = commit(root, head, 'head');
  let effectiveBase = baseSha;
  if (mode === 'pr') {
    try { effectiveBase = git(root, ['merge-base', baseSha, headSha]).trim(); }
    catch { throw new Error(`base and head do not have an available merge base: ${baseSha} ${headSha}`); }
  } else if (mode !== 'push') throw new Error('--range-mode must be pr or push.');
  return {
    records: parseNameStatusZ(git(root, ['diff', '--name-status', '-z', '--find-renames', `${effectiveBase}..${headSha}`], 'buffer')),
    metadata: { mode: `${mode}-range`, base: baseSha, head: headSha, effective_base: effectiveBase }
  };
}

function initialRecords(root, head) {
  const headSha = commit(root, head, 'initial head');
  const paths = git(root, ['ls-tree', '-r', '-z', '--name-only', headSha], 'buffer').toString('utf8').split('\0').filter(Boolean);
  return { records: paths.map((pathname) => ({ status: 'A', path: pathname })), metadata: { mode: 'initial-tree', head: headSha } };
}

function worktreeRecords(root) {
  const tracked = parseNameStatusZ(git(root, ['diff', '--name-status', '-z', '--find-renames', 'HEAD'], 'buffer'));
  const staged = parseNameStatusZ(git(root, ['diff', '--cached', '--name-status', '-z', '--find-renames', 'HEAD'], 'buffer'));
  const untracked = git(root, ['ls-files', '--others', '--exclude-standard', '-z'], 'buffer').toString('utf8').split('\0').filter(Boolean).map((pathname) => ({ status: 'A', path: pathname }));
  const unique = new Map([...tracked, ...staged, ...untracked].map((record) => [`${record.status}:${record.old_path ?? ''}:${record.path}`, record]));
  return [...unique.values()];
}

function report(result, metadata, json) {
  const output = { schema_version: '1.0.0', kind: 'repository-document-sync-check', repository_scope: 'current-repository-only', external_repository_access: false, ...metadata, ...result };
  if (json) return process.stdout.write(`${JSON.stringify(output, null, 2)}\n`);
  if (result.status === 'pass') return process.stdout.write(`Repository document sync passed (${result.trigger_paths.length} classified path(s), ${result.matched_rules.length} rule(s); external repositories not accessed).\n`);
  process.stderr.write(`Repository document sync failed for: ${result.matched_rules.map((rule) => rule.id).join(', ')}\n`);
  result.missing_all_of.forEach((pathname) => process.stderr.write(`  missing required change: ${pathname}\n`));
  result.missing_any_of.forEach((group) => process.stderr.write(`  change at least one for ${group.group_id}: ${group.alternatives.join(', ')}\n`));
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const requestedRoot = path.resolve(options.repo ?? defaultRoot);
  const root = await realpath(requestedRoot);
  const gitRoot = await realpath(git(root, ['rev-parse', '--show-toplevel']).trim());
  if (root !== gitRoot) throw new Error(`--repo must be the Git repository root: ${requestedRoot}`);
  const policy = await loadRepositoryDocumentSyncPolicy(root);
  if (options.validatePolicy) {
    if (options.worktree || options.initialHead || options.base || options.head || options.rangeMode || options.changedFiles.length) throw new Error('--validate-policy cannot be combined with a change selection.');
    process.stdout.write('Repository document-sync policy is valid and current-repository-only.\n');
    return;
  }
  const modes = [options.worktree, options.initialHead, options.base || options.head || options.rangeMode, options.changedFiles.length].filter(Boolean).length;
  if (modes !== 1) throw new Error('Choose exactly one of --worktree, --initial-head, a complete range, or --changed-file.');
  let selection;
  if (options.worktree) selection = { records: worktreeRecords(root), metadata: { mode: 'worktree' } };
  else if (options.initialHead) selection = initialRecords(root, options.initialHead);
  else if (options.base || options.head || options.rangeMode) {
    if (!options.base || !options.head || !options.rangeMode) throw new Error('--base, --head, and --range-mode are all required.');
    selection = diffRecords(root, options.base, options.head, options.rangeMode);
  } else selection = { records: recordsFromPaths(options.changedFiles), metadata: { mode: 'explicit-files' } };
  const result = evaluateRepositoryDocumentSync(policy, selection.records);
  report(result, selection.metadata, options.json);
  if (result.status !== 'pass') process.exitCode = 1;
}

main().catch((error) => {
  process.stderr.write(`Repository document sync error: ${error.message}\n`);
  process.exitCode = 2;
});
