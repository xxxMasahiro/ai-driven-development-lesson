import { createHash } from "node:crypto";
import { spawn } from "node:child_process";
import {
  closeSync,
  constants as fsConstants,
  existsSync,
  fstatSync,
  lstatSync,
  openSync,
  readFileSync,
  readSync,
  realpathSync,
  unlinkSync,
} from "node:fs";
import { basename, dirname, isAbsolute, resolve } from "node:path";
import { assertNoSecretMaterial, redactSecretText } from "./secret_policy.mjs";
import { assertProtectedContainment } from "./runtime_containment.mjs";
import { assertProtectedRuntimeVerifier } from "./runtime_trust.mjs";

const RUN_STATES = new Set(["STARTING", "RUNNING", "CANCELLING", "TERMINATING", "COMPLETED", "FAILED", "CANCELLED", "TIMED_OUT", "UNKNOWN", "CONFLICT"]);
const TERMINAL_STATES = new Set(["COMPLETED", "FAILED", "CANCELLED", "TIMED_OUT"]);
const RESULT_STATUSES = new Set(["succeeded", "failed", "blocked"]);
const RESULT_SEVERITIES = new Set(["info", "warning", "error"]);
const PATH_OR_COMMAND_TEXT = /(?:^|\s)(?:\/[^\s]+|[A-Za-z]:[\\/]|\\\\|git\s+(?:push|commit|merge|reset|checkout)|rm\s+-|curl\s+|wget\s+|ssh\s+|sudo\s+)|[`$<>|&\\]/iu;
const PROTECTED_RUN_LIFECYCLE_PORTS = new WeakMap();
const PROTECTED_RUN_LIFECYCLE_WRITERS = new WeakMap();

function canonicalJson(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(",")}}`;
  return JSON.stringify(value);
}

function digest(value) {
  const bytes = Buffer.isBuffer(value) ? value : Buffer.from(typeof value === "string" ? value : canonicalJson(value));
  return createHash("sha256").update(bytes).digest("hex");
}

function readPinnedFile(fd, size) {
  const bytes = Buffer.allocUnsafe(size);
  let offset = 0;
  while (offset < size) {
    const count = readSync(fd, bytes, offset, size - offset, offset);
    if (count === 0) throw new Error("RUN_LIFECYCLE_PINNED_FILE_SHORT_READ");
    offset += count;
  }
  return bytes;
}

function plainObject(value, code) {
  if (!value || typeof value !== "object" || Array.isArray(value) || Object.getPrototypeOf(value) !== Object.prototype) throw new Error(code);
  return value;
}

function closed(value, allowed, prefix) {
  plainObject(value, `${prefix}_INVALID`);
  for (const key of Object.keys(value)) if (!allowed.has(key)) throw new Error(`${prefix}_UNKNOWN_FIELD:${key}`);
}

function requiredString(value, field, prefix) {
  if (typeof value !== "string" || value.length === 0) throw new Error(`${prefix}_FIELD_REQUIRED:${field}`);
  return value;
}

function sha256(value, code) {
  if (!/^[a-f0-9]{64}$/.test(value ?? "")) throw new Error(code);
  return value;
}

function boundedText(value, maxBytes, code) {
  if (typeof value !== "string" || Buffer.byteLength(value) > maxBytes || /[\r\n\0]/u.test(value) || PATH_OR_COMMAND_TEXT.test(value)) throw new Error(code);
  assertNoSecretMaterial(value, code);
  return value;
}

function validateEnvironment(environment) {
  plainObject(environment, "RUN_LIFECYCLE_ENVIRONMENT_INVALID");
  assertNoSecretMaterial(environment, "RUN_LIFECYCLE_RAW_SECRET_FORBIDDEN");
  for (const [key, value] of Object.entries(environment)) {
    if (!/^[A-Z][A-Z0-9_]{0,63}$/.test(key) || typeof value !== "string" || Buffer.byteLength(value) > 4096) throw new Error("RUN_LIFECYCLE_ENVIRONMENT_INVALID");
  }
  return Object.freeze({ ...environment });
}

function validateFilePath(path, code) {
  requiredString(path, "path", code);
  if (!isAbsolute(path) || resolve(path) !== path) throw new Error(code);
  return path;
}

function pinnedChildPath(directoryFd, childName) {
  if (typeof childName !== "string" || childName.length === 0 || childName === "." || childName === ".." || childName.includes("/")) throw new Error("RUN_LIFECYCLE_RESPONSE_PATH_INVALID");
  return `/proc/self/fd/${directoryFd}/${childName}`;
}

function pinRegularFile(path, { expectedFingerprint, maxBytes, privateFile = false, executable = false, code }) {
  validateFilePath(path, code);
  const fd = openSync(path, fsConstants.O_RDONLY | (fsConstants.O_NOFOLLOW ?? 0));
  try {
    const info = fstatSync(fd);
    if (!info.isFile() || info.size > maxBytes || (privateFile && (info.mode & 0o077) !== 0) || (executable && (info.mode & 0o111) === 0)) throw new Error(code);
    // Positional reads preserve the descriptor's offset. The same pinned
    // descriptor can therefore be inherited as child stdin from byte zero.
    const fingerprint = digest(readPinnedFile(fd, info.size));
    if (expectedFingerprint && fingerprint !== expectedFingerprint) throw new Error(`${code}_FINGERPRINT_MISMATCH`);
    return { fd, info, fingerprint };
  } catch (error) {
    closeSync(fd);
    throw error;
  }
}

function validateResult(result, { runId, maxBytes }) {
  const allowedTop = new Set(["schema_version", "run_id", "status", "summary", "findings", "artifacts", "metrics"]);
  closed(result, allowedTop, "AGENT_RESULT");
  if (result.schema_version !== "1.0.0" || result.run_id !== runId || !RESULT_STATUSES.has(result.status)) throw new Error("AGENT_RESULT_IDENTITY_OR_STATUS_INVALID");
  boundedText(result.summary, Math.min(maxBytes, 16 * 1024), "AGENT_RESULT_SUMMARY_INVALID");
  if (!Array.isArray(result.findings) || result.findings.length > 100 || !Array.isArray(result.artifacts) || result.artifacts.length > 100) throw new Error("AGENT_RESULT_COLLECTION_INVALID");
  for (const finding of result.findings) {
    closed(finding, new Set(["code", "severity", "message", "evidence_refs"]), "AGENT_RESULT_FINDING");
    if (typeof finding.code !== "string" || !/^[A-Za-z0-9][A-Za-z0-9_.:-]{0,63}$/.test(finding.code)) throw new Error("AGENT_RESULT_FINDING_CODE_INVALID");
    if (!RESULT_SEVERITIES.has(finding.severity)) throw new Error("AGENT_RESULT_FINDING_SEVERITY_INVALID");
    boundedText(finding.message, 4096, "AGENT_RESULT_FINDING_MESSAGE_INVALID");
    if (!Array.isArray(finding.evidence_refs) || finding.evidence_refs.length > 50 || finding.evidence_refs.some((item) => typeof item !== "string" || !/^[a-z0-9][a-z0-9._:-]{0,127}$/i.test(item))) throw new Error("AGENT_RESULT_FINDING_EVIDENCE_INVALID");
  }
  for (const artifact of result.artifacts) {
    closed(artifact, new Set(["kind", "fingerprint", "media_type", "size_bytes"]), "AGENT_RESULT_ARTIFACT");
    requiredString(artifact.kind, "kind", "AGENT_RESULT_ARTIFACT");
    if (!/^[a-z][a-z0-9._:-]{0,127}$/iu.test(artifact.kind)) throw new Error("AGENT_RESULT_ARTIFACT_KIND_INVALID");
    sha256(artifact.fingerprint, "AGENT_RESULT_ARTIFACT_FINGERPRINT_INVALID");
    if (typeof artifact.media_type !== "string" || !/^[a-z0-9.+-]+\/[a-z0-9.+-]+$/i.test(artifact.media_type) || !Number.isSafeInteger(artifact.size_bytes) || artifact.size_bytes < 0) throw new Error("AGENT_RESULT_ARTIFACT_INVALID");
  }
  const metrics = result.metrics ?? {};
  closed(metrics, new Set(["duration_ms", "input_tokens", "output_tokens"]), "AGENT_RESULT_METRICS");
  for (const value of Object.values(metrics)) if (!Number.isSafeInteger(value) || value < 0) throw new Error("AGENT_RESULT_METRICS_INVALID");
  assertNoSecretMaterial(result, "AGENT_RESULT_SECRET_FORBIDDEN");
  const encoded = canonicalJson(result);
  if (Buffer.byteLength(encoded) > maxBytes) throw new Error("AGENT_RESULT_TOO_LARGE");
  return { value: structuredClone(result), bytes: Buffer.byteLength(encoded), fingerprint: digest(encoded) };
}

function normalizeLaunchObservation(verifier, { stdout, stderr, plan, processEvidence, observedAt }) {
  assertProtectedRuntimeVerifier(verifier, "launch_observation");
  const observationInputFingerprint = digest({ stdout: digest(stdout), stderr: digest(stderr), plan_fingerprint: plan.plan_fingerprint, process_evidence_fingerprint: processEvidence?.fingerprint, observed_at: observedAt });
  const verdict = verifier.observe({ stdout, stderr, plan: structuredClone(plan), process_evidence: structuredClone(processEvidence), fingerprint: observationInputFingerprint, observed_at: observedAt });
  if (verdict && typeof verdict.then === "function") throw new Error("RUN_LIFECYCLE_ASYNC_OBSERVER_UNSUPPORTED");
  const allowed = new Set(["verified", "verifier_id", "fingerprint", "proof_fingerprint", "actual_provider", "actual_model", "actual_effort", "observation_scope"]);
  closed(verdict, allowed, "RUN_LIFECYCLE_LAUNCH_OBSERVATION");
  if (verdict.verified !== true || verdict.verifier_id !== verifier.verifier_id || verdict.fingerprint !== observationInputFingerprint) throw new Error("RUN_LIFECYCLE_LAUNCH_OBSERVATION_INVALID");
  for (const field of ["proof_fingerprint", "actual_provider", "actual_model", "actual_effort"]) requiredString(verdict[field], field, "RUN_LIFECYCLE_LAUNCH_OBSERVATION");
  sha256(verdict.proof_fingerprint, "RUN_LIFECYCLE_LAUNCH_OBSERVATION_PROOF_INVALID");
  if (verdict.actual_provider !== plan.selected_provider || verdict.actual_model !== plan.selected_model || verdict.actual_effort !== plan.selected_effort) throw new Error("RUN_LIFECYCLE_MODEL_OR_EFFORT_SUBSTITUTION");
  if (verdict.actual_effort === "none") throw new Error("RUN_LIFECYCLE_IMPLICIT_EFFORT_FORBIDDEN");
  if (verdict.observation_scope !== "pinned_cli_launch_configuration") throw new Error("RUN_LIFECYCLE_LAUNCH_OBSERVATION_SCOPE_INVALID");
  return Object.freeze({ actual_provider: verdict.actual_provider, actual_model: verdict.actual_model, actual_effort: verdict.actual_effort, observation_scope: verdict.observation_scope, verifier_id: verdict.verifier_id, proof_fingerprint: verdict.proof_fingerprint, observed_at: observedAt });
}

function normalizePlan(input, { now, limits, pathPolicy }) {
  const allowed = new Set(["run_id", "idempotency_key", "plan_fingerprint", "manifest_fingerprint", "authority_epoch", "fence_fingerprint", "executable_path", "executable_fingerprint", "interpreter_path", "interpreter_fingerprint", "argv", "working_directory", "stdin_file", "stdin_fingerprint", "response_file", "environment", "timeout_ms", "max_result_bytes", "max_stderr_bytes", "selected_provider", "selected_model", "selected_effort"]);
  closed(input, allowed, "RUN_LIFECYCLE_PLAN");
  for (const field of ["run_id", "idempotency_key", "plan_fingerprint", "manifest_fingerprint", "fence_fingerprint", "executable_path", "executable_fingerprint", "working_directory", "stdin_file", "stdin_fingerprint", "response_file", "selected_provider", "selected_model", "selected_effort"]) requiredString(input[field], field, "RUN_LIFECYCLE_PLAN");
  sha256(input.plan_fingerprint, "RUN_LIFECYCLE_PLAN_FINGERPRINT_INVALID");
  sha256(input.manifest_fingerprint, "RUN_LIFECYCLE_MANIFEST_FINGERPRINT_INVALID");
  sha256(input.fence_fingerprint, "RUN_LIFECYCLE_FENCE_FINGERPRINT_INVALID");
  sha256(input.executable_fingerprint, "RUN_LIFECYCLE_EXECUTABLE_FINGERPRINT_INVALID");
  sha256(input.stdin_fingerprint, "RUN_LIFECYCLE_STDIN_FINGERPRINT_INVALID");
  if (input.interpreter_path !== undefined || input.interpreter_fingerprint !== undefined) {
    requiredString(input.interpreter_path, "interpreter_path", "RUN_LIFECYCLE_PLAN");
    sha256(input.interpreter_fingerprint, "RUN_LIFECYCLE_INTERPRETER_FINGERPRINT_INVALID");
  }
  if (!Number.isSafeInteger(input.authority_epoch) || input.authority_epoch < 0) throw new Error("RUN_LIFECYCLE_AUTHORITY_EPOCH_INVALID");
  if (!Array.isArray(input.argv) || input.argv.length > limits.maxArgv || input.argv.some((item) => typeof item !== "string" || Buffer.byteLength(item) > 8192 || item.includes("\0"))) throw new Error("RUN_LIFECYCLE_ARGV_INVALID");
  if (!Number.isSafeInteger(input.timeout_ms) || input.timeout_ms < 1 || input.timeout_ms > limits.maxRuntimeMs || !Number.isSafeInteger(input.max_result_bytes) || input.max_result_bytes < 1 || input.max_result_bytes > limits.maxResultBytes || !Number.isSafeInteger(input.max_stderr_bytes) || input.max_stderr_bytes < 1 || input.max_stderr_bytes > limits.maxStderrBytes) throw new Error("RUN_LIFECYCLE_BOUND_INVALID");
  for (const path of [input.executable_path, input.working_directory, input.stdin_file, input.response_file, ...(input.interpreter_path ? [input.interpreter_path] : [])]) validateFilePath(path, "RUN_LIFECYCLE_PATH_INVALID");
  if (dirname(input.response_file) !== realpathSync(dirname(input.response_file)) || basename(input.response_file) === "." || basename(input.response_file) === "..") throw new Error("RUN_LIFECYCLE_RESPONSE_PATH_INVALID");
  if (typeof pathPolicy !== "function" || pathPolicy({ plan: structuredClone(input) })?.allowed !== true) throw new Error("RUN_LIFECYCLE_PATH_POLICY_DENIED");
  const environment = validateEnvironment(input.environment ?? {});
  assertNoSecretMaterial({ argv: input.argv }, "RUN_LIFECYCLE_RAW_SECRET_FORBIDDEN");
  const immutable = { ...input, environment };
  const derived = digest({ ...immutable, started_at: now });
  return Object.freeze({ ...immutable, derived_start_fingerprint: derived });
}

function groupAlive(processGroupId) {
  if (!Number.isSafeInteger(processGroupId) || processGroupId < 1 || process.platform === "win32") return null;
  try {
    process.kill(-processGroupId, 0);
    return true;
  } catch (error) {
    if (error?.code === "ESRCH") return false;
    if (error?.code === "EPERM") return true;
    return null;
  }
}

function signalGroup(processGroupId, signal) {
  if (process.platform === "win32") throw new Error("RUN_LIFECYCLE_PROCESS_GROUP_UNSUPPORTED");
  try {
    process.kill(-processGroupId, signal);
    return true;
  } catch (error) {
    if (error?.code === "ESRCH") return false;
    throw error;
  }
}

function waitBounded(promise, timeoutMs) {
  return Promise.race([promise.then((value) => ({ settled: true, value })), new Promise((resolvePromise) => setTimeout(() => resolvePromise({ settled: false }), timeoutMs))]);
}

async function observeContainedProcess(containment, input, timeoutMs = 1000) {
  const deadline = Date.now() + timeoutMs;
  let lastError;
  while (Date.now() <= deadline) {
    try { return containment.observeProcess(input); } catch (error) { lastError = error; }
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 5));
  }
  throw lastError ?? new Error("RUN_LIFECYCLE_CONTAINMENT_OBSERVATION_FAILED");
}

function waitForBarrierStatus(stream, expectedStage, timeoutMs = 1000) {
  return new Promise((resolvePromise, reject) => {
    let buffer = "";
    const timeout = setTimeout(() => finish(new Error("RUN_LIFECYCLE_BARRIER_STATUS_TIMEOUT")), timeoutMs);
    const finish = (error, value) => {
      clearTimeout(timeout);
      stream.off("data", onData);
      stream.off("error", onError);
      stream.off("end", onEnd);
      if (error) reject(error); else resolvePromise(value);
    };
    const onError = (error) => finish(error);
    const onEnd = () => finish(new Error("RUN_LIFECYCLE_BARRIER_STATUS_ENDED"));
    const onData = (chunk) => {
      buffer += chunk.toString("utf8");
      while (buffer.includes("\n")) {
        const index = buffer.indexOf("\n");
        const line = buffer.slice(0, index);
        buffer = buffer.slice(index + 1);
        let value;
        try { value = JSON.parse(line); } catch { finish(new Error("RUN_LIFECYCLE_BARRIER_STATUS_INVALID")); return; }
        if (value?.stage === expectedStage) { finish(null, value); return; }
        if (value?.stage === "spawn_error" || value?.stage === "fail_closed") { finish(new Error(`RUN_LIFECYCLE_BARRIER_${String(value.stage).toUpperCase()}`)); return; }
      }
    };
    stream.on("data", onData);
    stream.once("error", onError);
    stream.once("end", onEnd);
  });
}

export function createRunLifecyclePort({
  store,
  fenceGuard,
  effectFencer,
  launchObservationVerifier,
  containment,
  pathPolicy,
  spawnRunner = spawn,
  beforeExecutionRelease,
  clock = () => new Date().toISOString(),
  terminationGraceMs = 1500,
  limits = {},
} = {}) {
  if (!store || typeof store.createRuntimeRun !== "function" || typeof store.bindRuntimeProcess !== "function" || typeof store.transitionRuntimeRun !== "function" || typeof fenceGuard !== "function" || typeof effectFencer !== "function" || typeof spawnRunner !== "function" || (beforeExecutionRelease !== undefined && typeof beforeExecutionRelease !== "function") || !Number.isSafeInteger(terminationGraceMs) || terminationGraceMs < 1 || process.platform !== "linux") throw new Error("RUN_LIFECYCLE_CONFIGURATION_INVALID");
  const protectedContainment = assertProtectedContainment(containment);
  assertProtectedRuntimeVerifier(launchObservationVerifier, "launch_observation");
  const effectiveLimits = Object.freeze({ maxRuntimeMs: limits.maxRuntimeMs ?? 30 * 60 * 1000, maxResultBytes: limits.maxResultBytes ?? 4 * 1024 * 1024, maxStderrBytes: limits.maxStderrBytes ?? 1024 * 1024, maxArgv: limits.maxArgv ?? 128, maxPromptBytes: limits.maxPromptBytes ?? 4 * 1024 * 1024 });
  const active = new Map();
  const lifecycleWriter = Object.freeze({});
  let protectedPort;

  function transition(runId, expectedStates, nextState, patch = {}, recovery = false) {
    return store.transitionRuntimeRun({ expectedRevision: store.revision, runId, expectedStates, nextState, patch, recovery, lifecycleWriter });
  }

  function appendBounded(handle, stream, chunk) {
    const bytes = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    const current = handle[stream];
    const capacity = handle.plan.max_stderr_bytes;
    if (current.length < capacity) handle[stream] = Buffer.concat([current, bytes.subarray(0, Math.max(0, capacity - current.length))]);
    if (current.length + bytes.length > capacity) handle[`${stream}_truncated`] = true;
  }

  function persistedProcessStatus(run) {
    if (!run || !Number.isSafeInteger(run.pid) || !Number.isSafeInteger(run.process_group_id)) return "unknown";
    const identity = protectedContainment.matchPersistedProcess({ pid: run.pid, observation: run.observation });
    const contained = protectedContainment.matchPersistedContainedProcess({ observation: run.observation });
    if (identity === "reused" || contained === "reused") return "reused";
    if (identity === "absent") return groupAlive(run.process_group_id) === false && ["absent", "unbound"].includes(contained) ? "absent" : "unknown";
    if (identity !== "matched") return "unknown";
    const alive = groupAlive(run.process_group_id);
    if (alive === true) return ["matched", "unbound"].includes(contained) ? "matched" : "unknown";
    return alive === false && ["absent", "unbound"].includes(contained) ? "absent" : "unknown";
  }

  async function waitForProcessStatus(runId, expected, timeoutMs) {
    const deadline = Date.now() + timeoutMs;
    let status;
    do {
      status = persistedProcessStatus(store.getRuntimeRun({ runId }));
      if (status === expected) return status;
      if (status === "reused" || status === "unknown") return status;
      await new Promise((resolvePromise) => setTimeout(resolvePromise, 10));
    } while (Date.now() <= deadline);
    return status;
  }

  function releaseHandle(runId, { removeResponse = true } = {}) {
    const handle = active.get(runId);
    if (!handle) return false;
    if (handle.timeout) clearTimeout(handle.timeout);
    try { closeSync(handle.response_fd); } catch {}
    if (removeResponse) try { unlinkSync(handle.response_access_path); } catch {}
    try { closeSync(handle.response_directory_fd); } catch {}
    active.delete(runId);
    handle.collected = true;
    return true;
  }

  async function start(input) {
    const startedAt = clock();
    const plan = normalizePlan(input, { now: startedAt, limits: effectiveLimits, pathPolicy });
    const fenceVerdict = await fenceGuard({ operation: "start", plan: structuredClone(plan), now: startedAt });
    if (fenceVerdict?.allowed !== true || fenceVerdict.fence_fingerprint !== plan.fence_fingerprint || fenceVerdict.authority_epoch !== plan.authority_epoch) throw new Error("RUN_LIFECYCLE_START_FENCE_DENIED");
    protectedContainment.validatePlan(plan);
    const startNonce = digest({ run_id: plan.run_id, idempotency_key: plan.idempotency_key, plan_fingerprint: plan.plan_fingerprint, fence_fingerprint: plan.fence_fingerprint });
    const recoveryPlan = { response_file: plan.response_file, max_result_bytes: plan.max_result_bytes, selected_provider: plan.selected_provider, selected_model: plan.selected_model, selected_effort: plan.selected_effort, manifest_fingerprint: plan.manifest_fingerprint };
    const persisted = store.createRuntimeRun({ expectedRevision: store.revision, run: { run_id: plan.run_id, idempotency_key: plan.idempotency_key, plan_fingerprint: plan.plan_fingerprint, authority_epoch: plan.authority_epoch, fence_fingerprint: plan.fence_fingerprint, start_nonce: startNonce, started_at: startedAt, observation: { selected_provider: plan.selected_provider, selected_model: plan.selected_model, selected_effort: plan.selected_effort, containment_authority_fingerprint: protectedContainment.authority_fingerprint, recovery_plan: recoveryPlan } }, lifecycleWriter });
    if (persisted.reused) {
      const existing = active.get(plan.run_id);
      return { reused: true, run_id: plan.run_id, state: persisted.run.state, process_identity_fingerprint: existing?.process_identity_fingerprint ?? null };
    }

    let executable;
    let interpreter;
    let unshare;
    let bubblewrap;
    let barrierInterpreter;
    let barrierScript;
    let prompt;
    let inputRootFd;
    let outputRootFd;
    let responseDirectoryFd;
    let responseFd;
    let responseAccessPath;
    let child;
    try {
      executable = pinRegularFile(plan.executable_path, { expectedFingerprint: plan.executable_fingerprint, maxBytes: 512 * 1024 * 1024, executable: true, code: "RUN_LIFECYCLE_EXECUTABLE_INVALID" });
      if (plan.interpreter_path) interpreter = pinRegularFile(plan.interpreter_path, { expectedFingerprint: plan.interpreter_fingerprint, maxBytes: 512 * 1024 * 1024, executable: true, code: "RUN_LIFECYCLE_INTERPRETER_INVALID" });
      unshare = pinRegularFile(protectedContainment.unshare.path, { expectedFingerprint: protectedContainment.unshare.fingerprint, maxBytes: 32 * 1024 * 1024, executable: true, code: "RUN_LIFECYCLE_UNSHARE_INVALID" });
      bubblewrap = pinRegularFile(protectedContainment.bubblewrap.path, { expectedFingerprint: protectedContainment.bubblewrap.fingerprint, maxBytes: 32 * 1024 * 1024, executable: true, code: "RUN_LIFECYCLE_BUBBLEWRAP_INVALID" });
      barrierInterpreter = pinRegularFile(protectedContainment.barrier_interpreter.path, { expectedFingerprint: protectedContainment.barrier_interpreter.fingerprint, maxBytes: 512 * 1024 * 1024, executable: true, code: "RUN_LIFECYCLE_BARRIER_INTERPRETER_INVALID" });
      barrierScript = pinRegularFile(protectedContainment.barrier_script.path, { expectedFingerprint: protectedContainment.barrier_script.fingerprint, maxBytes: 1024 * 1024, code: "RUN_LIFECYCLE_BARRIER_SCRIPT_INVALID" });
      prompt = pinRegularFile(plan.stdin_file, { expectedFingerprint: plan.stdin_fingerprint, maxBytes: effectiveLimits.maxPromptBytes, privateFile: true, code: "RUN_LIFECYCLE_PROMPT_INVALID" });
      inputRootFd = openSync(protectedContainment.input_root, fsConstants.O_RDONLY | (fsConstants.O_DIRECTORY ?? 0) | (fsConstants.O_NOFOLLOW ?? 0));
      outputRootFd = openSync(protectedContainment.output_root, fsConstants.O_RDONLY | (fsConstants.O_DIRECTORY ?? 0) | (fsConstants.O_NOFOLLOW ?? 0));
      if (dirname(plan.response_file) !== protectedContainment.output_root) throw new Error("RUN_LIFECYCLE_RESPONSE_DIRECTORY_INVALID");
      responseDirectoryFd = outputRootFd;
      outputRootFd = undefined;
      const responseDirectoryStat = fstatSync(responseDirectoryFd);
      if (!responseDirectoryStat.isDirectory() || (responseDirectoryStat.mode & 0o777) !== 0o700 || (typeof process.getuid === "function" && responseDirectoryStat.uid !== process.getuid())) throw new Error("RUN_LIFECYCLE_RESPONSE_DIRECTORY_INVALID");
      responseAccessPath = pinnedChildPath(responseDirectoryFd, basename(plan.response_file));
      if (existsSync(responseAccessPath)) throw new Error("RUN_LIFECYCLE_RESPONSE_DIRECTORY_INVALID");
      responseFd = openSync(responseAccessPath, fsConstants.O_RDWR | fsConstants.O_CREAT | fsConstants.O_EXCL | (fsConstants.O_NOFOLLOW ?? 0), 0o600);
      const responseStat = fstatSync(responseFd);
      const hasInterpreter = Boolean(interpreter);
      const stdio = [prompt.fd, "pipe", "pipe", unshare.fd, bubblewrap.fd, executable.fd, inputRootFd, responseDirectoryFd, hasInterpreter ? interpreter.fd : "ignore", "pipe", barrierScript.fd, barrierInterpreter.fd, "pipe"];
      if (!plan.argv.includes(plan.response_file)) throw new Error("RUN_LIFECYCLE_RESPONSE_ARGUMENT_REQUIRED");
      const spawnPlan = protectedContainment.buildSpawn({ plan, hasInterpreter });
      child = spawnRunner(spawnPlan.executable, spawnPlan.argv, { cwd: "/", env: {}, shell: false, detached: true, windowsHide: true, stdio });
      const handle = { child, completion: null, plan, stdout: Buffer.alloc(0), stderr: Buffer.alloc(0), stdout_truncated: false, stderr_truncated: false, response_fd: responseFd, response_directory_fd: responseDirectoryFd, response_stat: responseStat, response_access_path: responseAccessPath, process_group_id: null, process_identity_fingerprint: null, process_evidence: null, timeout: null, timeout_triggered: false, termination: null, termination_error: null, collected: false };
      responseFd = undefined;
      responseDirectoryFd = undefined;
      child.stdout?.on("data", (chunk) => appendBounded(handle, "stdout", chunk));
      child.stderr?.on("data", (chunk) => appendBounded(handle, "stderr", chunk));
      handle.completion = new Promise((resolvePromise) => {
        child.once("close", (exitCode, signal) => resolvePromise({ exit_code: exitCode, signal: signal ?? null, observed_at: clock() }));
        child.once("error", (error) => resolvePromise({ exit_code: null, signal: null, error_code: error?.code ?? "PROCESS_ERROR", observed_at: clock() }));
      });
      await new Promise((resolvePromise, reject) => {
        child.once("spawn", resolvePromise);
        child.once("error", reject);
      });
      if (!Number.isSafeInteger(child.pid) || child.pid < 1) throw new Error("RUN_LIFECYCLE_PROCESS_IDENTITY_INVALID");
      const barrierEvidence = await observeContainedProcess({ observeProcess: (value) => protectedContainment.observeBarrierProcess(value) }, { pid: child.pid, processGroupId: child.pid, startNonce });
      const processIdentityFingerprint = barrierEvidence.process_identity_fingerprint;
      handle.process_group_id = child.pid;
      handle.process_identity_fingerprint = processIdentityFingerprint;
      handle.process_evidence = barrierEvidence;
      active.set(plan.run_id, handle);
      store.bindRuntimeProcess({ expectedRevision: store.revision, runId: plan.run_id, pid: child.pid, processGroupId: child.pid, processIdentityFingerprint, processEvidence: barrierEvidence, lifecycleWriter });
      child.stdio[9]?.write("S");
      const barrierStatus = await waitForBarrierStatus(child.stdio[12], "contained_process_spawned");
      if (!Number.isSafeInteger(barrierStatus.pid) || barrierStatus.pid < 1) throw new Error("RUN_LIFECYCLE_CONTAINED_PROCESS_IDENTITY_INVALID");
      const processEvidence = await observeContainedProcess(protectedContainment, { pid: barrierStatus.pid, barrierPid: child.pid, processGroupId: child.pid, plan, startNonce });
      if (processEvidence.process_identity_fingerprint !== processIdentityFingerprint) throw new Error("RUN_LIFECYCLE_BARRIER_IDENTITY_CHANGED");
      const launchObservation = normalizeLaunchObservation(launchObservationVerifier, { stdout: "", stderr: "", plan, processEvidence, observedAt: clock() });
      handle.process_evidence = processEvidence;
      const bound = store.getRuntimeRun({ runId: plan.run_id });
      const observation = { ...bound.observation, actual_provider: launchObservation.actual_provider, actual_model: launchObservation.actual_model, actual_effort: launchObservation.actual_effort, launch_observation_scope: launchObservation.observation_scope, launch_observation_verifier_id: launchObservation.verifier_id, launch_observation_proof_fingerprint: launchObservation.proof_fingerprint, process_identity: processEvidence.process_identity, process_identity_fingerprint: processEvidence.process_identity_fingerprint, contained_process_identity: processEvidence.contained_process_identity, containment_evidence_fingerprint: processEvidence.fingerprint };
      transition(plan.run_id, ["STARTING"], "RUNNING", { observation });
      if (beforeExecutionRelease) await beforeExecutionRelease({ run: structuredClone(store.getRuntimeRun({ runId: plan.run_id })), process_evidence: structuredClone(processEvidence) });
      child.stdio[9]?.write("R");
      child.stdio[9]?.end();
      handle.timeout = setTimeout(() => {
        handle.timeout_triggered = true;
        handle.termination = terminate(plan.run_id, { timedOut: true }).catch((error) => { handle.termination_error = error; return null; });
      }, plan.timeout_ms);
      handle.timeout.unref?.();
      return { reused: false, run_id: plan.run_id, state: "RUNNING", process_identity_fingerprint: processIdentityFingerprint, launch_report: { provider: launchObservation.actual_provider, model: launchObservation.actual_model, effort: launchObservation.actual_effort, observation_proof_fingerprint: launchObservation.proof_fingerprint } };
    } catch (error) {
      if (Number.isSafeInteger(child?.pid) && child.pid > 0) {
        try { signalGroup(child.pid, "SIGKILL"); } catch {}
      }
      const orphanedHandle = active.get(plan.run_id);
      if (orphanedHandle?.timeout) clearTimeout(orphanedHandle.timeout);
      if (orphanedHandle?.response_fd !== undefined) try { closeSync(orphanedHandle.response_fd); } catch {}
      if (orphanedHandle?.response_directory_fd !== undefined) try { closeSync(orphanedHandle.response_directory_fd); } catch {}
      active.delete(plan.run_id);
      try { if (responseAccessPath && existsSync(responseAccessPath)) unlinkSync(responseAccessPath); } catch {}
      try {
        const current = store.getRuntimeRun({ runId: plan.run_id });
        if (["STARTING", "RUNNING"].includes(current?.state)) transition(plan.run_id, [current.state], "FAILED", { observation: { ...current.observation, failure_code: error?.code ?? error?.message ?? "START_FAILURE" } });
      } catch {}
      throw error;
    } finally {
      for (const pinned of [executable, interpreter, unshare, bubblewrap, barrierInterpreter, barrierScript, prompt]) if (pinned?.fd !== undefined) try { closeSync(pinned.fd); } catch {}
      for (const directoryFd of [inputRootFd, outputRootFd]) if (directoryFd !== undefined) try { closeSync(directoryFd); } catch {}
      if (responseDirectoryFd !== undefined) try { closeSync(responseDirectoryFd); } catch {}
      if (responseFd !== undefined) try { closeSync(responseFd); } catch {}
    }
  }

  async function observe(runId) {
    let persisted = store.getRuntimeRun({ runId });
    if (!persisted || !RUN_STATES.has(persisted.state)) throw new Error("RUN_LIFECYCLE_RUN_NOT_FOUND");
    const handle = active.get(runId);
    let launchReport = persisted.observation?.actual_model ? { provider: persisted.observation.actual_provider, model: persisted.observation.actual_model, effort: persisted.observation.actual_effort, observation_proof_fingerprint: persisted.observation.launch_observation_proof_fingerprint } : null;
    if (handle && persisted.state === "STARTING") {
      try {
        const launchObservation = normalizeLaunchObservation(launchObservationVerifier, { stdout: redactSecretText(handle.stdout.toString("utf8")), stderr: redactSecretText(handle.stderr.toString("utf8")), plan: handle.plan, processEvidence: handle.process_evidence, observedAt: clock() });
        const observation = { ...persisted.observation, actual_provider: launchObservation.actual_provider, actual_model: launchObservation.actual_model, actual_effort: launchObservation.actual_effort, launch_observation_verifier_id: launchObservation.verifier_id, launch_observation_proof_fingerprint: launchObservation.proof_fingerprint, process_identity: handle.process_evidence.process_identity, process_identity_fingerprint: handle.process_evidence.process_identity_fingerprint, containment_evidence_fingerprint: handle.process_evidence.fingerprint };
        persisted = transition(runId, ["STARTING"], "RUNNING", { observation }).run;
        launchReport = { provider: launchObservation.actual_provider, model: launchObservation.actual_model, effort: launchObservation.actual_effort, observation_proof_fingerprint: launchObservation.proof_fingerprint };
      } catch (error) {
        if (error?.message !== "RUN_LIFECYCLE_LAUNCH_OBSERVATION_PENDING") throw error;
      }
    }
    const processStatus = persistedProcessStatus(persisted);
    let observedState = "unknown";
    if (processStatus === "matched") observedState = "running";
    else if (processStatus === "absent") observedState = handle ? "exited" : "absent";
    else if (processStatus === "reused") observedState = "identity_reused";
    if (TERMINAL_STATES.has(persisted.state) && processStatus === "absent") observedState = "terminal_absent";
    return { run_id: runId, persisted_state: persisted.state, observed_state: observedState, process_identity_fingerprint: handle?.process_identity_fingerprint ?? persisted.observation?.process_identity_fingerprint ?? null, launch_report: launchReport, observed_at: clock() };
  }

  async function cancel(runId) {
    const persisted = store.getRuntimeRun({ runId });
    if (!persisted || persisted.state !== "RUNNING") throw new Error("RUN_LIFECYCLE_CANCEL_STATE_INVALID");
    const fence = await effectFencer({ run_id: runId, authority_epoch: Number(persisted.authority_epoch), reason: "cancel", now: clock() });
    if (fence?.fenced !== true) throw new Error("RUN_LIFECYCLE_EFFECT_FENCE_FAILED");
    transition(runId, ["RUNNING"], "CANCELLING", { observation: { ...persisted.observation, cancellation_fence_fingerprint: fence.fingerprint } });
    if (persistedProcessStatus(persisted) !== "matched") throw new Error("RUN_LIFECYCLE_PROCESS_IDENTITY_UNVERIFIED");
    signalGroup(persisted.process_group_id, "SIGTERM");
    const handle = active.get(runId);
    if (handle) {
      const settled = await waitBounded(handle.completion, terminationGraceMs);
      if (settled.settled && persistedProcessStatus(store.getRuntimeRun({ runId })) === "absent") {
        transition(runId, ["CANCELLING"], "CANCELLED", { exit_code: settled.value.exit_code, signal: settled.value.signal ?? "SIGTERM" });
        releaseHandle(runId);
      }
    }
    return observe(runId);
  }

  async function terminate(runId, { timedOut = false, recovery = false } = {}) {
    const persisted = store.getRuntimeRun({ runId });
    if (!persisted || !["STARTING", "RUNNING", "CANCELLING", "TERMINATING"].includes(persisted.state)) {
      if (persisted && TERMINAL_STATES.has(persisted.state)) return observe(runId);
      throw new Error("RUN_LIFECYCLE_TERMINATE_STATE_INVALID");
    }
    const fence = await effectFencer({ run_id: runId, authority_epoch: Number(persisted.authority_epoch), reason: timedOut ? "timeout" : "terminate", now: clock() });
    if (fence?.fenced !== true) throw new Error("RUN_LIFECYCLE_EFFECT_FENCE_FAILED");
    let current = persisted;
    if (current.state !== "TERMINATING") current = transition(runId, [current.state], "TERMINATING", { observation: { ...current.observation, termination_fence_fingerprint: fence.fingerprint } }, recovery).run;
    const handle = active.get(runId);
    const beforeSignal = persistedProcessStatus(current);
    if (beforeSignal === "reused" || beforeSignal === "unknown") {
      transition(runId, ["TERMINATING"], "UNKNOWN", { observation: { ...current.observation, termination_observation: beforeSignal } }, recovery);
      throw new Error("RUN_LIFECYCLE_PROCESS_IDENTITY_UNVERIFIED");
    }
    if (beforeSignal === "matched") signalGroup(current.process_group_id, "SIGTERM");
    let settled = handle ? await waitBounded(handle.completion, terminationGraceMs) : { settled: beforeSignal === "absent" };
    let afterTermStatus = await waitForProcessStatus(runId, "absent", terminationGraceMs);
    if (afterTermStatus === "matched") {
      signalGroup(current.process_group_id, "SIGKILL");
      settled = handle ? await waitBounded(handle.completion, terminationGraceMs) : { settled: false };
      afterTermStatus = await waitForProcessStatus(runId, "absent", terminationGraceMs);
    }
    const finalStatus = afterTermStatus;
    if (finalStatus !== "absent") {
      transition(runId, ["TERMINATING"], "UNKNOWN", { observation: { ...current.observation, termination_observation: "unknown" } }, recovery);
      throw new Error("RUN_LIFECYCLE_PROCESS_GROUP_ABSENCE_UNVERIFIED");
    }
    const exit = settled.value ?? {};
    transition(runId, ["TERMINATING"], timedOut ? "TIMED_OUT" : "CANCELLED", { exit_code: exit.exit_code ?? null, signal: exit.signal ?? (timedOut ? "SIGKILL" : "SIGTERM") }, recovery);
    const result = await observe(runId);
    releaseHandle(runId);
    return result;
  }

  async function collectResult(runId) {
    const handle = active.get(runId);
    if (!handle) {
      const persisted = store.getRuntimeRun({ runId });
      if (persisted && TERMINAL_STATES.has(persisted.state)) return { run_id: runId, state: persisted.state, exit_code: persisted.exit_code, signal: persisted.signal, launch_report: persisted.observation?.launch_report ?? null, result: persisted.observation?.agent_result ?? null, result_fingerprint: persisted.result_fp ?? null, reused: true };
      throw new Error("RUN_LIFECYCLE_ACTIVE_HANDLE_REQUIRED");
    }
    if (handle.collected) throw new Error("RUN_LIFECYCLE_RESULT_ALREADY_COLLECTED");
    let exit = { exit_code: null, signal: null };
    try {
      exit = await handle.completion;
      if (handle.timeout) clearTimeout(handle.timeout);
      if (handle.timeout_triggered && handle.termination) await handle.termination;
      if (handle.termination_error) throw handle.termination_error;
      let current = store.getRuntimeRun({ runId });
      if (TERMINAL_STATES.has(current.state) && current.state !== "COMPLETED") {
        releaseHandle(runId);
        return { run_id: runId, state: current.state, exit_code: current.exit_code, signal: current.signal, launch_report: null, result: null };
      }
      if (exit.exit_code !== 0 || exit.signal) throw new Error("RUN_LIFECYCLE_PROCESS_FAILED");
      const afterExitStatus = persistedProcessStatus(current);
      if (afterExitStatus === "matched") {
        const fence = await effectFencer({ run_id: runId, authority_epoch: Number(current.authority_epoch), reason: "surviving_descendant", now: clock() });
        if (fence?.fenced !== true) throw new Error("RUN_LIFECYCLE_EFFECT_FENCE_FAILED");
        signalGroup(current.process_group_id, "SIGKILL");
        await new Promise((resolvePromise) => setTimeout(resolvePromise, 10));
        if (persistedProcessStatus(current) !== "absent") {
          transition(runId, [current.state], "UNKNOWN", { observation: { ...current.observation, failure_code: "RUN_LIFECYCLE_DESCENDANT_SURVIVED" } });
          throw new Error("RUN_LIFECYCLE_PROCESS_GROUP_ABSENCE_UNVERIFIED");
        }
        transition(runId, [current.state], "FAILED", { exit_code: 0, observation: { ...current.observation, failure_code: "RUN_LIFECYCLE_DESCENDANT_SURVIVED", descendant_fence_fingerprint: fence.fingerprint } });
        throw new Error("RUN_LIFECYCLE_DESCENDANT_SURVIVED");
      }
      if (afterExitStatus !== "absent") throw new Error("RUN_LIFECYCLE_PROCESS_IDENTITY_UNVERIFIED");
      if (current.state === "STARTING") {
        const launchState = await observe(runId);
        if (!launchState.launch_report) throw new Error("RUN_LIFECYCLE_LAUNCH_OBSERVATION_MISSING");
        current = store.getRuntimeRun({ runId });
      }
      const observedAt = clock();
      const currentResponse = lstatSync(handle.response_access_path, { bigint: false });
      const pinnedResponse = fstatSync(handle.response_fd);
      if (!currentResponse.isFile() || currentResponse.dev !== handle.response_stat.dev || currentResponse.ino !== handle.response_stat.ino || pinnedResponse.dev !== handle.response_stat.dev || pinnedResponse.ino !== handle.response_stat.ino || (currentResponse.mode & 0o077) !== 0 || currentResponse.size > handle.plan.max_result_bytes) throw new Error("RUN_LIFECYCLE_RESPONSE_FILE_INVALID");
      const bytes = readFileSync(handle.response_fd);
      const result = validateResult(JSON.parse(bytes.toString("utf8")), { runId, maxBytes: handle.plan.max_result_bytes });
      const launchObservation = current.observation?.actual_model
        ? { actual_provider: current.observation.actual_provider, actual_model: current.observation.actual_model, actual_effort: current.observation.actual_effort, verifier_id: current.observation.launch_observation_verifier_id, proof_fingerprint: current.observation.launch_observation_proof_fingerprint }
        : normalizeLaunchObservation(launchObservationVerifier, { stdout: redactSecretText(handle.stdout.toString("utf8")), stderr: redactSecretText(handle.stderr.toString("utf8")), plan: handle.plan, processEvidence: handle.process_evidence, observedAt });
      const launchReport = { provider: launchObservation.actual_provider, model: launchObservation.actual_model, effort: launchObservation.actual_effort, observation_proof_fingerprint: launchObservation.proof_fingerprint };
      const observation = { selected_provider: handle.plan.selected_provider, selected_model: handle.plan.selected_model, selected_effort: handle.plan.selected_effort, actual_provider: launchObservation.actual_provider, actual_model: launchObservation.actual_model, actual_effort: launchObservation.actual_effort, launch_observation_proof_fingerprint: launchObservation.proof_fingerprint, launch_observation_verifier_id: launchObservation.verifier_id, process_identity_fingerprint: handle.process_identity_fingerprint, process_identity: handle.process_evidence.process_identity, containment_evidence_fingerprint: handle.process_evidence.fingerprint, stdout_fingerprint: digest(handle.stdout), stderr_fingerprint: digest(handle.stderr), stdout_truncated: handle.stdout_truncated, stderr_truncated: handle.stderr_truncated, launch_report: launchReport, agent_result: result.value };
      transition(runId, ["RUNNING", "UNKNOWN"], "COMPLETED", { exit_code: 0, result_fingerprint: result.fingerprint, result_size: result.bytes, observation });
      handle.collected = true;
      return { run_id: runId, state: "COMPLETED", exit_code: 0, signal: null, launch_report: launchReport, result: result.value, result_fingerprint: result.fingerprint };
    } catch (error) {
      const latest = store.getRuntimeRun({ runId });
      if (["STARTING", "RUNNING"].includes(latest.state)) transition(runId, [latest.state], "FAILED", { exit_code: exit.exit_code ?? null, signal: exit.signal ?? null, observation: { ...latest.observation, failure_code: error?.message ?? "RESULT_FAILURE" } });
      handle.collected = true;
      throw error;
    } finally {
      releaseHandle(runId);
    }
  }

  async function reconcile(runId) {
    const persisted = store.getRuntimeRun({ runId });
    if (!persisted) throw new Error("RUN_LIFECYCLE_RUN_NOT_FOUND");
    const processStatus = persistedProcessStatus(persisted);
    if (processStatus === "unknown") return { run_id: runId, result: "unknown" };
    if (processStatus === "reused") return { run_id: runId, result: "conflict", code: "PROCESS_IDENTITY_REUSED" };
    if (TERMINAL_STATES.has(persisted.state)) return { run_id: runId, result: processStatus === "absent" ? "matched" : "conflict" };
    if (["RUNNING", "CANCELLING", "TERMINATING"].includes(persisted.state)) return { run_id: runId, result: processStatus === "matched" ? "matched" : "conflict" };
    if (persisted.state === "UNKNOWN") return { run_id: runId, result: "unknown" };
    return { run_id: runId, result: "conflict" };
  }

  async function recover(runId) {
    let persisted = store.getRuntimeRun({ runId });
    if (!persisted) throw new Error("RUN_LIFECYCLE_RUN_NOT_FOUND");
    if (TERMINAL_STATES.has(persisted.state)) return { ...(await reconcile(runId)), recovery: "already_terminal" };
    if (persisted.state === "CONFLICT") return { run_id: runId, result: "conflict", recovery: "manual_required", code: persisted.observation?.recovery_code ?? "RUNTIME_CONFLICT" };
    const processStatus = persistedProcessStatus(persisted);
    if (processStatus === "reused") {
      if (persisted.state !== "UNKNOWN") persisted = transition(runId, [persisted.state], "UNKNOWN", { observation: { ...persisted.observation, recovery_code: "PROCESS_IDENTITY_REUSED" } }, true).run;
      const conflict = store.recordRuntimeConflict({ conflictKind: "runtime_run", idempotencyKey: persisted.idempotency_key, existingId: runId, existingFingerprint: persisted.observation?.process_identity_fingerprint ?? digest("missing-process-identity"), incomingFingerprint: digest({ run_id: runId, recovery: "pid_reused" }), details: { recovery_code: "PROCESS_IDENTITY_REUSED" } });
      transition(runId, ["UNKNOWN"], "CONFLICT", { observation: { ...persisted.observation, recovery_code: "PROCESS_IDENTITY_REUSED", conflict_id: conflict.conflict_id } }, true);
      return { run_id: runId, result: "conflict", recovery: "manual_required", code: "PROCESS_IDENTITY_REUSED", conflict_id: conflict.conflict_id };
    }
    if (processStatus === "matched") {
      if (persisted.state === "UNKNOWN") persisted = transition(runId, ["UNKNOWN"], "RUNNING", { observation: { ...persisted.observation, recovery_code: "PROCESS_IDENTITY_REACQUIRED" } }, true).run;
      const terminated = await terminate(runId, { recovery: true });
      return { run_id: runId, result: "matched", recovery: "fenced_and_terminated", state: terminated.persisted_state };
    }
    if (processStatus === "absent") {
      if (persisted.state !== "UNKNOWN") persisted = transition(runId, [persisted.state], "UNKNOWN", { observation: { ...persisted.observation, recovery_code: "PROCESS_ABSENT_RESULT_UNVERIFIED" } }, true).run;
      const failed = transition(runId, ["UNKNOWN"], "FAILED", { observation: { ...persisted.observation, recovery_code: "PROCESS_ABSENT_RESULT_UNVERIFIED" } }, true).run;
      return { run_id: runId, result: "matched", recovery: "failed_closed", state: failed.state, code: "PROCESS_ABSENT_RESULT_UNVERIFIED" };
    }
    if (persisted.state !== "UNKNOWN") transition(runId, [persisted.state], "UNKNOWN", { observation: { ...persisted.observation, recovery_code: "PROCESS_IDENTITY_UNVERIFIED" } }, true);
    return { run_id: runId, result: "unknown", recovery: "manual_required", code: "PROCESS_IDENTITY_UNVERIFIED" };
  }

  protectedPort = Object.freeze({ start, observe, cancel, terminate, collect_result: collectResult, reconcile, recover });
  PROTECTED_RUN_LIFECYCLE_PORTS.set(protectedPort, Object.freeze({ store }));
  PROTECTED_RUN_LIFECYCLE_WRITERS.set(lifecycleWriter, Object.freeze({ store }));
  return protectedPort;
}

export function assertProtectedRunLifecyclePort(port, expectedStore) {
  const binding = port && PROTECTED_RUN_LIFECYCLE_PORTS.get(port);
  if (!binding || (expectedStore !== undefined && binding.store !== expectedStore)) throw new Error("PROTECTED_RUN_LIFECYCLE_PORT_REQUIRED");
  return port;
}

export function assertProtectedRunLifecycleWriter(writer, expectedStore) {
  const binding = writer && PROTECTED_RUN_LIFECYCLE_WRITERS.get(writer);
  if (!binding || binding.store !== expectedStore) throw new Error("PROTECTED_RUN_LIFECYCLE_WRITER_REQUIRED");
  return writer;
}

export function runLifecycleDigest(value) {
  return digest(value);
}
