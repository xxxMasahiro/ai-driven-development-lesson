import { createHash } from 'node:crypto';
import { spawn } from 'node:child_process';
import {
  lstat,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rename,
  rm,
  writeFile,
} from 'node:fs/promises';
import path from 'node:path';

import {
  canonicalCommandDigest,
  fingerprintRepository,
  loadExecutionPolicy,
  resolvePolicyLocator,
  verificationDigest,
  VerificationError,
} from './verification_core.mjs';

function fail(code, message) {
  throw new VerificationError(code, message);
}

function positiveInteger(value, label) {
  if (!Number.isSafeInteger(value) || value <= 0) fail('DASHBOARD_POLICY', `${label} must be a positive integer`);
  return value;
}

function relativePath(value, label) {
  if (typeof value !== 'string' || !value || value.includes('\0') || path.isAbsolute(value)) {
    fail('DASHBOARD_PATH', `${label} must be a repository-relative path`);
  }
  const normalized = path.posix.normalize(value.replaceAll('\\', '/')).replace(/^\.\//, '').replace(/\/$/, '');
  if (!normalized || normalized === '..' || normalized.startsWith('../')) fail('DASHBOARD_PATH', `${label} escapes the repository`);
  return normalized;
}

function inside(root, candidate) {
  const relative = path.relative(root, candidate);
  return relative === '' || (relative !== '..' && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative));
}

function requireArray(value, label) {
  if (!Array.isArray(value) || value.length === 0 || value.some((item) => typeof item !== 'string' || !item)) {
    fail('DASHBOARD_POLICY', `${label} must be a non-empty string array`);
  }
  return Object.freeze([...value]);
}

function requireObject(value, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail('DASHBOARD_POLICY', `${label} must be an object`);
  return value;
}

function compilePatterns(values, label) {
  return requireArray(values, label).map((value) => {
    try {
      return new RegExp(value);
    } catch {
      fail('DASHBOARD_POLICY', `${label} contains an invalid regular expression`);
    }
  });
}

async function readStableFile(file, maxBytes, label) {
  const before = await lstat(file, { bigint: true }).catch((error) => {
    if (error?.code === 'ENOENT') fail('DASHBOARD_INPUT_MISSING', `${label} is missing`);
    throw error;
  });
  if (before.isSymbolicLink()) fail('DASHBOARD_INPUT_SYMLINK', `${label} must not be a symbolic link`);
  if (!before.isFile()) fail('DASHBOARD_INPUT_TYPE', `${label} must be a regular file`);
  if (before.size > BigInt(maxBytes)) fail('DASHBOARD_INPUT_SIZE', `${label} exceeds the configured byte limit`);
  const value = await readFile(file);
  const after = await lstat(file, { bigint: true });
  if (
    before.dev !== after.dev ||
    before.ino !== after.ino ||
    before.size !== after.size ||
    before.mtimeNs !== after.mtimeNs
  ) {
    fail('DASHBOARD_INPUT_CHANGED', `${label} changed while it was read`);
  }
  return Object.freeze({ value, info: after });
}

async function collectPath(root, configured, maxBytes, entries, labelPrefix) {
  const relative = relativePath(configured, labelPrefix);
  const absolute = path.join(root, ...relative.split('/'));
  const info = await lstat(absolute).catch((error) => {
    if (error?.code === 'ENOENT') fail('DASHBOARD_INPUT_MISSING', `${labelPrefix} is missing: ${relative}`);
    throw error;
  });
  if (info.isSymbolicLink()) fail('DASHBOARD_INPUT_SYMLINK', `${labelPrefix} must not contain a symbolic link: ${relative}`);
  if (info.isFile()) {
    const snapshot = await readStableFile(absolute, maxBytes, `${labelPrefix} ${relative}`);
    entries.push(Object.freeze({ path: relative, bytes: snapshot.value.length, mode: Number(snapshot.info.mode & 0o777n), digest: verificationDigest(snapshot.value) }));
    return;
  }
  if (!info.isDirectory()) fail('DASHBOARD_INPUT_TYPE', `${labelPrefix} has an unsupported filesystem type: ${relative}`);
  const children = await readdir(absolute, { withFileTypes: true });
  children.sort((left, right) => left.name.localeCompare(right.name));
  for (const child of children) await collectPath(root, `${relative}/${child.name}`, maxBytes, entries, labelPrefix);
}

export async function createFileInventory({ root, paths, maxFileBytes }) {
  const resolvedRoot = path.resolve(root);
  const configured = requireArray(paths, 'inventory paths').map((value) => relativePath(value, 'inventory path'));
  if (new Set(configured).size !== configured.length) fail('DASHBOARD_POLICY', 'inventory paths contain a duplicate');
  const entries = [];
  for (const value of configured) await collectPath(resolvedRoot, value, positiveInteger(maxFileBytes, 'max_file_bytes'), entries, 'inventory input');
  entries.sort((left, right) => left.path.localeCompare(right.path));
  if (new Set(entries.map((entry) => entry.path)).size !== entries.length) fail('DASHBOARD_POLICY', 'inventory paths overlap');
  return Object.freeze({ entries: Object.freeze(entries), digest: verificationDigest(entries) });
}

export async function createOutputInventory({ root, outputPath, maxFileBytes }) {
  const resolvedRoot = path.resolve(root);
  const relative = relativePath(outputPath, 'output path');
  const entries = [];
  await collectPath(resolvedRoot, relative, positiveInteger(maxFileBytes, 'max_output_file_bytes'), entries, 'build output');
  const normalized = entries
    .map((entry) => Object.freeze({ ...entry, path: entry.path.slice(relative.length + 1) }))
    .sort((left, right) => left.path.localeCompare(right.path));
  if (normalized.some((entry) => !entry.path)) fail('DASHBOARD_OUTPUT', 'build output must be a directory containing regular files');
  return Object.freeze({ root: relative, entries: Object.freeze(normalized), digest: verificationDigest(normalized) });
}

function sameFingerprint(left, right) {
  return Boolean(
    left &&
      right &&
      left.headSha === right.headSha &&
      left.repositoryFingerprint === right.repositoryFingerprint &&
      left.inputFingerprint === right.inputFingerprint &&
      left.worktreeState === right.worktreeState,
  );
}

export function resolveDashboardVerificationPolicy(policy) {
  const bundle = requireObject(policy.profiles.get('output_profile:dashboard_bundle'), 'dashboard bundle output profile');
  const resources = requireObject(policy.profiles.get('resource_profile:dashboard_validation'), 'dashboard validation resource profile');
  const buildInputs = requireArray(policy.profiles.get('input_profile:dashboard_build_inputs'), 'dashboard build input profile');
  const browserInputs = requireArray(policy.profiles.get('input_profile:dashboard_browser_inputs'), 'dashboard browser input profile');
  const buildArgv = policy.argv.get('dashboard_build');
  const staticArgv = policy.argv.get('dashboard_control_center_static');
  const browserArgv = policy.argv.get('dashboard_control_center_browser');
  if (!buildArgv || !staticArgv || !browserArgv) fail('DASHBOARD_POLICY', 'dashboard verification argv policy is incomplete');
  const engine = policy.settings.get('dashboard_validation_engine');
  if (!['legacy', 'same-run'].includes(engine)) fail('DASHBOARD_POLICY', 'dashboard_validation_engine must be legacy or same-run');
  return Object.freeze({
    engine,
    marker: String(bundle.manifest_marker || ''),
    schemaVersion: String(bundle.schema_version || ''),
    outputPath: relativePath(bundle.output_path, 'dashboard output path'),
    assetsPath: relativePath(bundle.assets_path, 'dashboard assets path'),
    packageManifest: relativePath(bundle.package_manifest, 'package manifest path'),
    viteConfig: relativePath(bundle.vite_config, 'Vite config path'),
    expectedPackageScripts: requireObject(bundle.expected_package_scripts, 'expected package scripts'),
    viteMarkers: requireArray(bundle.vite_markers, 'Vite markers'),
    warningLimitPattern: new RegExp(String(bundle.warning_limit_pattern || '')),
    maxWarningLimit: positiveInteger(bundle.max_warning_limit, 'max_warning_limit'),
    jsSuffix: String(bundle.js_suffix || ''),
    entryPattern: new RegExp(String(bundle.entry_pattern || '')),
    requiredChunkPrefixes: requireArray(bundle.required_chunk_prefixes, 'required chunk prefixes'),
    minimumJsChunks: positiveInteger(bundle.minimum_js_chunks, 'minimum_js_chunks'),
    maxJsBytes: positiveInteger(bundle.max_js_bytes, 'max_js_bytes'),
    maxEntryJsBytes: positiveInteger(bundle.max_entry_js_bytes, 'max_entry_js_bytes'),
    forbiddenAssetPatterns: compilePatterns(bundle.forbidden_asset_patterns, 'forbidden asset patterns'),
    buildWarningPatterns: compilePatterns(bundle.build_warning_patterns, 'build warning patterns'),
    buildInputs,
    browserInputs,
    buildArgv,
    staticArgv,
    browserArgv,
    workers: positiveInteger(resources.workers, 'dashboard workers'),
    timeoutMs: positiveInteger(resources.timeout_seconds, 'dashboard timeout_seconds') * 1000,
    cancellationGraceMs: positiveInteger(resources.cancellation_grace_seconds, 'dashboard cancellation_grace_seconds') * 1000,
    maxLogBytes: positiveInteger(resources.max_log_bytes, 'dashboard max_log_bytes'),
    maxInputFileBytes: positiveInteger(resources.max_input_file_bytes, 'dashboard max_input_file_bytes'),
    maxOutputFileBytes: positiveInteger(resources.max_output_file_bytes, 'dashboard max_output_file_bytes'),
  });
}

export async function inspectDashboardBundle({ root, configuration, buildOutput = '' }) {
  const packageSnapshot = await readStableFile(path.join(root, ...configuration.packageManifest.split('/')), configuration.maxInputFileBytes, 'package manifest');
  let packageJson;
  try {
    packageJson = JSON.parse(packageSnapshot.value.toString('utf8'));
  } catch {
    fail('DASHBOARD_PACKAGE', 'package manifest contains invalid JSON');
  }
  for (const [key, value] of Object.entries(configuration.expectedPackageScripts)) {
    if (packageJson.scripts?.[key] !== value) fail('DASHBOARD_PACKAGE', `package script ${key} does not match policy`);
  }
  const vite = (await readStableFile(path.join(root, ...configuration.viteConfig.split('/')), configuration.maxInputFileBytes, 'Vite config')).value.toString('utf8');
  const warningLimit = vite.match(configuration.warningLimitPattern);
  if (warningLimit && Number(warningLimit[1]) > configuration.maxWarningLimit) fail('DASHBOARD_BUNDLE_LIMIT', 'Vite warning limit exceeds policy');
  for (const marker of configuration.viteMarkers) if (!vite.includes(marker)) fail('DASHBOARD_VITE_MARKER', `Vite config is missing required policy marker: ${marker}`);
  for (const pattern of configuration.buildWarningPatterns) if (pattern.test(buildOutput)) fail('DASHBOARD_BUILD_WARNING', 'Dashboard build emitted a policy-forbidden warning');

  const output = await createOutputInventory({ root, outputPath: configuration.outputPath, maxFileBytes: configuration.maxOutputFileBytes });
  const jsAssets = [];
  for (const entry of output.entries) {
    if (!entry.path.startsWith(`${configuration.assetsPath}/`) || !entry.path.endsWith(configuration.jsSuffix)) continue;
    const file = path.join(root, ...configuration.outputPath.split('/'), ...entry.path.split('/'));
    const body = (await readStableFile(file, configuration.maxOutputFileBytes, `bundle asset ${entry.path}`)).value.toString('utf8');
    jsAssets.push({ ...entry, file: entry.path.slice(configuration.assetsPath.length + 1), body });
  }
  jsAssets.sort((left, right) => right.bytes - left.bytes || left.file.localeCompare(right.file));
  if (jsAssets.length < configuration.minimumJsChunks) fail('DASHBOARD_BUNDLE_CHUNKS', 'Dashboard build emitted fewer JS chunks than policy requires');
  const entry = jsAssets.find((asset) => configuration.entryPattern.test(asset.file));
  if (!entry) fail('DASHBOARD_BUNDLE_ENTRY', 'Dashboard build did not emit a policy-matching entry JS asset');
  if (entry.bytes > configuration.maxEntryJsBytes) fail('DASHBOARD_BUNDLE_SIZE', `Dashboard entry JS chunk ${entry.file} exceeds policy`);
  for (const prefix of configuration.requiredChunkPrefixes) {
    if (!jsAssets.some((asset) => asset.file.startsWith(prefix))) fail('DASHBOARD_BUNDLE_CHUNK', `Dashboard build is missing required chunk prefix: ${prefix}`);
  }
  for (const asset of jsAssets) {
    if (asset.bytes > configuration.maxJsBytes) fail('DASHBOARD_BUNDLE_SIZE', `Dashboard JS chunk ${asset.file} exceeds policy`);
    for (const pattern of configuration.forbiddenAssetPatterns) if (pattern.test(asset.body)) fail('DASHBOARD_BUNDLE_IMPORT', `Dashboard JS chunk ${asset.file} contains a forbidden import`);
  }
  return Object.freeze({
    output,
    assets: Object.freeze(jsAssets.map(({ body, ...asset }) => Object.freeze(asset))),
    summary: jsAssets.map((asset) => `${asset.file}:${asset.bytes}`).join(' '),
  });
}

export async function runArgv({ root, argv, environment = {}, timeoutMs, cancellationGraceMs, maxLogBytes }) {
  return new Promise((resolve, reject) => {
    const child = spawn(argv[0], argv.slice(1), {
      cwd: root,
      env: { ...process.env, ...environment },
      shell: false,
      detached: process.platform !== 'win32',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    const output = { stdout: [], stderr: [], bytes: 0 };
    let settled = false;
    let reason = '';
    const append = (stream, chunk) => {
      output.bytes += chunk.length;
      if (output.bytes > maxLogBytes && !reason) {
        reason = 'command output exceeded the configured byte limit';
        stop('SIGTERM');
      }
      if (output.bytes <= maxLogBytes) output[stream].push(chunk);
    };
    const stop = (signal) => {
      if (!child.pid) return;
      try {
        if (process.platform !== 'win32') process.kill(-child.pid, signal);
        else child.kill(signal);
      } catch (error) {
        if (error?.code !== 'ESRCH') reject(error);
      }
    };
    child.stdout.on('data', (chunk) => append('stdout', chunk));
    child.stderr.on('data', (chunk) => append('stderr', chunk));
    child.on('error', reject);
    const timeout = setTimeout(() => {
      reason = 'command exceeded the configured timeout';
      stop('SIGTERM');
    }, timeoutMs);
    const force = setTimeout(() => {
      if (reason && !settled) stop('SIGKILL');
    }, timeoutMs + cancellationGraceMs);
    child.on('close', (code, signal) => {
      settled = true;
      clearTimeout(timeout);
      clearTimeout(force);
      const stdout = Buffer.concat(output.stdout).toString('utf8');
      const stderr = Buffer.concat(output.stderr).toString('utf8');
      if (reason) return reject(new VerificationError('DASHBOARD_COMMAND_LIMIT', reason));
      resolve(Object.freeze({ code: code ?? 1, signal: signal ?? '', stdout, stderr }));
    });
  });
}

export function createBuildManifest({ configuration, policy, repository, sourceInventory, outputInventory }) {
  const manifest = {
    marker: configuration.marker,
    schema_version: configuration.schemaVersion,
    revision: repository.headSha,
    repository_fingerprint: repository.repositoryFingerprint,
    input_fingerprint: repository.inputFingerprint,
    worktree_state: repository.worktreeState,
    source_inventory_digest: sourceInventory.digest,
    policy_fingerprint: policy.fingerprint,
    command_digest: canonicalCommandDigest(configuration.buildArgv),
    output_root: outputInventory.root,
    output_digest: outputInventory.digest,
    output_files: outputInventory.entries,
  };
  return Object.freeze({ ...manifest, manifest_digest: verificationDigest(manifest) });
}

export function verifyBuildManifest({ manifest, configuration, policy, repository, sourceInventory, outputInventory }) {
  if (!manifest || typeof manifest !== 'object' || Array.isArray(manifest)) fail('DASHBOARD_MANIFEST', 'build manifest is malformed');
  const expected = createBuildManifest({ configuration, policy, repository, sourceInventory, outputInventory });
  for (const [key, value] of Object.entries(expected)) {
    if (verificationDigest(manifest[key]) !== verificationDigest(value)) fail('DASHBOARD_MANIFEST_MISMATCH', `build manifest ${key} does not match the current run`);
  }
  return expected;
}

export function createBrowserReceipt({ configuration, repository, browserInventory, buildManifest, result }) {
  if (!result || result.code !== 0) fail('DASHBOARD_BROWSER_RESULT', 'browser validation did not pass');
  const normalized = {
    exit_code: result.code,
    expected: Number(result.report?.stats?.expected ?? 0),
    skipped: Number(result.report?.stats?.skipped ?? 0),
    unexpected: Number(result.report?.stats?.unexpected ?? 0),
    flaky: Number(result.report?.stats?.flaky ?? 0),
  };
  if (normalized.unexpected !== 0) fail('DASHBOARD_BROWSER_RESULT', 'browser report contains unexpected results');
  const receipt = {
    marker: configuration.marker,
    schema_version: configuration.schemaVersion,
    revision: repository.headSha,
    repository_fingerprint: repository.repositoryFingerprint,
    input_fingerprint: repository.inputFingerprint,
    browser_inventory_digest: browserInventory.digest,
    browser_command_digest: canonicalCommandDigest(configuration.browserArgv),
    build_manifest_digest: buildManifest.manifest_digest,
    result: normalized,
  };
  return Object.freeze({ ...receipt, receipt_digest: verificationDigest(receipt) });
}

export function verifyBrowserReceipt({ receipt, configuration, repository, browserInventory, buildManifest, result }) {
  const expected = createBrowserReceipt({ configuration, repository, browserInventory, buildManifest, result });
  for (const [key, value] of Object.entries(expected)) {
    if (verificationDigest(receipt?.[key]) !== verificationDigest(value)) fail('DASHBOARD_RECEIPT_MISMATCH', `browser receipt ${key} does not match the current run`);
  }
  return expected;
}

async function ensureRuntimeParent(root, configured) {
  const relative = relativePath(configured, 'runtime directory');
  const target = path.resolve(root, ...relative.split('/'));
  if (!inside(root, target)) fail('DASHBOARD_RUNTIME', 'runtime directory escapes the repository');
  let cursor = root;
  for (const segment of relative.split('/')) {
    cursor = path.join(cursor, segment);
    try {
      const info = await lstat(cursor);
      if (info.isSymbolicLink() || !info.isDirectory()) fail('DASHBOARD_RUNTIME', 'runtime directory contains an unsafe path component');
    } catch (error) {
      if (error?.code !== 'ENOENT') throw error;
      await mkdir(cursor, { mode: 0o700 });
    }
  }
  return target;
}

async function atomicJson(file, value) {
  const temporary = `${file}.tmp`;
  await writeFile(temporary, `${JSON.stringify(value)}\n`, { flag: 'wx', mode: 0o600 });
  await rename(temporary, file);
}

export async function withDashboardRunLock({ root, runtimeDirectory, keep = false, action }) {
  const parent = await ensureRuntimeParent(path.resolve(root), runtimeDirectory);
  const lock = path.join(parent, '.lock');
  try {
    await mkdir(lock, { mode: 0o700 });
  } catch (error) {
    if (error?.code === 'EEXIST') fail('DASHBOARD_LOCKED', 'another dashboard verification owner holds the configured run lock');
    throw error;
  }
  const runDirectory = await mkdtemp(path.join(parent, 'run-'));
  try {
    return await action(runDirectory);
  } finally {
    await rm(lock, { recursive: true, force: true });
    if (!keep) await rm(runDirectory, { recursive: true, force: true });
  }
}

export async function runDashboardSameRun({ root, policyPath, env = process.env, keepRunDirectory = false } = {}) {
  const resolvedRoot = path.resolve(root ?? process.cwd());
  const policy = await loadExecutionPolicy({ root: resolvedRoot, policyPath });
  const configuration = resolveDashboardVerificationPolicy(policy);
  const requestedEngine = env.DASHBOARD_VERIFICATION_ENGINE || configuration.engine;
  if (!['legacy', 'same-run'].includes(requestedEngine)) fail('DASHBOARD_POLICY', 'DASHBOARD_VERIFICATION_ENGINE must be legacy or same-run');
  if (requestedEngine === 'legacy') {
    const legacyArgv = ['./tools/test_dashboard_control_center.sh', '--legacy-full'];
    const legacy = await runArgv({
      root: resolvedRoot,
      argv: legacyArgv,
      timeoutMs: configuration.timeoutMs,
      cancellationGraceMs: configuration.cancellationGraceMs,
      maxLogBytes: configuration.maxLogBytes,
    });
    if (legacy.code !== 0) fail('DASHBOARD_LEGACY_FAILED', legacy.stderr.trim() || 'Legacy Dashboard validation failed');
    return Object.freeze({ legacy: true, staticOutput: legacy.stdout });
  }
  const runtimeDirectory = path.relative(resolvedRoot, resolvePolicyLocator(policy, 'dashboard_verification_runtime', env)).replaceAll(path.sep, '/');
  return withDashboardRunLock({
    root: resolvedRoot,
    runtimeDirectory,
    keep: keepRunDirectory,
    action: async (runDirectory) => {
      const repository = await fingerprintRepository({ root: resolvedRoot });
      const sourceInventory = await createFileInventory({ root: resolvedRoot, paths: configuration.buildInputs, maxFileBytes: configuration.maxInputFileBytes });
      const browserInventory = await createFileInventory({ root: resolvedRoot, paths: configuration.browserInputs, maxFileBytes: configuration.maxInputFileBytes });

      const staticResult = await runArgv({ root: resolvedRoot, argv: configuration.staticArgv, timeoutMs: configuration.timeoutMs, cancellationGraceMs: configuration.cancellationGraceMs, maxLogBytes: configuration.maxLogBytes });
      if (staticResult.code !== 0) fail('DASHBOARD_STATIC_FAILED', staticResult.stderr.trim() || 'Dashboard static validation failed');

      const buildResult = await runArgv({ root: resolvedRoot, argv: configuration.buildArgv, timeoutMs: configuration.timeoutMs, cancellationGraceMs: configuration.cancellationGraceMs, maxLogBytes: configuration.maxLogBytes });
      if (buildResult.code !== 0) fail('DASHBOARD_BUILD_FAILED', buildResult.stderr.trim() || 'Dashboard build failed');
      const inspection = await inspectDashboardBundle({ root: resolvedRoot, configuration, buildOutput: `${buildResult.stdout}\n${buildResult.stderr}` });
      const buildManifest = createBuildManifest({ configuration, policy, repository, sourceInventory, outputInventory: inspection.output });
      await atomicJson(path.join(runDirectory, 'build-manifest.json'), buildManifest);
      verifyBuildManifest({ manifest: buildManifest, configuration, policy, repository, sourceInventory, outputInventory: inspection.output });

      const browserResult = await runArgv({
        root: resolvedRoot,
        argv: configuration.browserArgv,
        environment: { PLAYWRIGHT_WORKERS: String(configuration.workers), FORCE_COLOR: '0' },
        timeoutMs: configuration.timeoutMs,
        cancellationGraceMs: configuration.cancellationGraceMs,
        maxLogBytes: configuration.maxLogBytes,
      });
      if (browserResult.code !== 0) fail('DASHBOARD_BROWSER_FAILED', browserResult.stderr.trim() || browserResult.stdout.trim() || 'Dashboard browser validation failed');
      let report;
      try {
        report = JSON.parse(browserResult.stdout);
      } catch {
        fail('DASHBOARD_BROWSER_REPORT', 'browser validation did not emit machine-readable JSON');
      }
      const afterRepository = await fingerprintRepository({ root: resolvedRoot });
      if (!sameFingerprint(repository, afterRepository)) fail('DASHBOARD_REPOSITORY_CHANGED', 'repository inputs changed during Dashboard validation');
      const afterSource = await createFileInventory({ root: resolvedRoot, paths: configuration.buildInputs, maxFileBytes: configuration.maxInputFileBytes });
      const afterBrowser = await createFileInventory({ root: resolvedRoot, paths: configuration.browserInputs, maxFileBytes: configuration.maxInputFileBytes });
      const afterOutput = await createOutputInventory({ root: resolvedRoot, outputPath: configuration.outputPath, maxFileBytes: configuration.maxOutputFileBytes });
      if (sourceInventory.digest !== afterSource.digest) fail('DASHBOARD_SOURCE_CHANGED', 'Dashboard source/config inventory changed during validation');
      if (browserInventory.digest !== afterBrowser.digest) fail('DASHBOARD_TEST_CHANGED', 'Dashboard browser-test inventory changed during validation');
      verifyBuildManifest({ manifest: buildManifest, configuration, policy, repository, sourceInventory: afterSource, outputInventory: afterOutput });
      const result = { code: browserResult.code, report };
      const browserReceipt = createBrowserReceipt({ configuration, repository, browserInventory: afterBrowser, buildManifest, result });
      verifyBrowserReceipt({ receipt: browserReceipt, configuration, repository, browserInventory: afterBrowser, buildManifest, result });
      await atomicJson(path.join(runDirectory, 'browser-receipt.json'), browserReceipt);
      return Object.freeze({ runDirectory, inspection, buildManifest, browserReceipt, staticOutput: staticResult.stdout });
    },
  });
}

export async function runDashboardBundleStandalone({ root, policyPath } = {}) {
  const resolvedRoot = path.resolve(root ?? process.cwd());
  const policy = await loadExecutionPolicy({ root: resolvedRoot, policyPath });
  const configuration = resolveDashboardVerificationPolicy(policy);
  const result = await runArgv({ root: resolvedRoot, argv: configuration.buildArgv, timeoutMs: configuration.timeoutMs, cancellationGraceMs: configuration.cancellationGraceMs, maxLogBytes: configuration.maxLogBytes });
  if (result.code !== 0) fail('DASHBOARD_BUILD_FAILED', result.stderr.trim() || 'Dashboard build failed');
  const inspection = await inspectDashboardBundle({ root: resolvedRoot, configuration, buildOutput: `${result.stdout}\n${result.stderr}` });
  return Object.freeze({ result, inspection });
}
