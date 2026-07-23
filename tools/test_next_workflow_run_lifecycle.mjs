#!/usr/bin/env node
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { spawn } from "node:child_process";
import { chmodSync, closeSync, constants as fsConstants, existsSync, mkdirSync, mkdtempSync, openSync, readFileSync, realpathSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { createRunLifecyclePort, runLifecycleDigest } from "./lib/next_workflow/run_lifecycle.mjs";
import { createLinuxIsolatedContainment, diagnoseLinuxIsolationPrerequisites } from "./lib/next_workflow/runtime_containment.mjs";
import { createProtectedLaunchObservationVerifier, loadProtectedRuntimeTrust } from "./lib/next_workflow/runtime_trust.mjs";
import { openWorkflowStateStore } from "./lib/next_workflow/store.mjs";

const roots = [];
test.after(() => roots.forEach((root) => rmSync(root, { recursive: true, force: true })));

function fileDigest(candidate) {
  return createHash("sha256").update(readFileSync(candidate)).digest("hex");
}

function fixture() {
  const root = mkdtempSync(path.join(tmpdir(), "next-workflow-run-lifecycle-execution-"));
  const repositoryRoot = mkdtempSync(path.join(tmpdir(), "next-workflow-run-lifecycle-repository-"));
  const trustRoot = mkdtempSync(path.join(tmpdir(), "next-workflow-runtime-trust-"));
  roots.push(root, repositoryRoot, trustRoot);
  chmodSync(root, 0o700);
  chmodSync(repositoryRoot, 0o700);
  chmodSync(trustRoot, 0o700);
  const inputRoot = path.join(root, "input");
  const outputRoot = path.join(root, "output");
  mkdirSync(inputRoot, { mode: 0o700 });
  mkdirSync(outputRoot, { mode: 0o700 });
  const script = path.join(inputRoot, "fixture-agent.mjs");
  const childScript = path.join(inputRoot, "fixture-child.mjs");
  const trustPath = path.join(trustRoot, "owner-trust.json");
  const hostRepository = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
  writeFileSync(childScript, "setInterval(() => {}, 1000);\n", { mode: 0o600 });
  writeFileSync(script, `
import { spawn } from "node:child_process";
import { readFileSync, writeFileSync, writeSync } from "node:fs";
import { createConnection } from "node:net";
const [response, runId, provider, model, selectedEffort, reportedEffort, mode, childScript] = process.argv.slice(2);
writeSync(2, JSON.stringify({ type: "launch_observation", provider, model, effort: reportedEffort }) + "\\n");
if (mode === "sleep") {
  spawn(process.execPath, [childScript], { stdio: "ignore" });
  setInterval(() => {}, 1000);
} else if (mode === "probe") {
  const deniedRead = (candidate) => { try { readFileSync(candidate); return false; } catch { return true; } };
  let inputWriteDenied = false;
  try { writeFileSync(${JSON.stringify(script)}, "tamper"); } catch { inputWriteDenied = true; }
  const networkDenied = await new Promise((resolve) => {
    const socket = createConnection({ host: "1.1.1.1", port: 53 });
    const timer = setTimeout(() => { socket.destroy(); resolve(true); }, 250);
    socket.once("connect", () => { clearTimeout(timer); socket.destroy(); resolve(false); });
    socket.once("error", () => { clearTimeout(timer); resolve(true); });
  });
  const findings = [
    ["network-denied", networkDenied],
    ["repository-denied", deniedRead(${JSON.stringify(path.join(hostRepository, "AGENTS.MD"))})],
    ["git-denied", deniedRead(${JSON.stringify(path.join(hostRepository, ".git", "HEAD"))})],
    ["owner-trust-denied", deniedRead(${JSON.stringify(trustPath)})],
    ["input-write-denied", inputWriteDenied],
  ].map(([code, denied]) => ({ code, severity: denied ? "info" : "error", message: denied ? "access denied" : "access escaped", evidence_refs: [] }));
  writeFileSync(response, JSON.stringify({ schema_version: "1.0.0", run_id: runId, status: findings.every((item) => item.severity === "info") ? "succeeded" : "failed", summary: "isolation probe completed", findings, artifacts: [], metrics: { duration_ms: 1 } }));
} else {
  const result = { schema_version: "1.0.0", run_id: runId, status: "succeeded", summary: "fixture completed", findings: [], artifacts: [], metrics: { duration_ms: 1 } };
  if (mode === "unsafe") result.authority = { allow: true };
  if (mode === "invalid-finding-code") result.findings = [{ code: "../../covert-channel", severity: "error", message: "bounded message", evidence_refs: [] }];
  writeFileSync(response, JSON.stringify(result));
}
`, { mode: 0o600 });
  const prompt = path.join(inputRoot, "prompt.json");
  writeFileSync(prompt, "{}\n", { mode: 0o600 });
  const databasePath = path.join(repositoryRoot, ".workflow-state", "workflow.sqlite");
  mkdirSync(path.dirname(databasePath), { mode: 0o700 });
  const identity = { repository_logical_id: "runtime-fixture", checkout_instance_id: `checkout-${path.basename(root)}`, parent_instance_id: "parent-fixture", relationship_id: "relationship-fixture" };
  const now = "2029-01-01T00:00:00.000Z";
  const store = openWorkflowStateStore({ repositoryRoot, databasePath, expectedIdentity: identity, clock: () => now });
  const node = realpathSync(process.execPath);
  const manifestFingerprint = runLifecycleDigest("fixture-manifest");
  const unshare = realpathSync("/usr/bin/unshare");
  const bubblewrap = realpathSync("/usr/bin/bwrap");
  const barrierScript = realpathSync(path.join(path.dirname(new URL(import.meta.url).pathname), "lib", "next_workflow", "runtime_barrier.cjs"));
  writeFileSync(trustPath, JSON.stringify({ schema_version: "1.0.0", trust_source_id: "fixture-owner-trust", revision: 1, repository_logical_id: identity.repository_logical_id, checkout_instance_id: identity.checkout_instance_id, issued_at: "2028-01-01T00:00:00.000Z", expires_at: "2030-01-01T00:00:00.000Z", release_trust: {}, release_prerequisites: {}, runtime_authorities: { "fixture-launch-observer": { authority_id: "fixture-launch-observer", kind: "launch_observation", enabled: true, revision: 1, source: "pinned_process_and_certified_provider_metadata", allowed_executable_fingerprints: [fileDigest(node)], allowed_manifest_fingerprints: [manifestFingerprint] }, "fixture-linux-containment": { authority_id: "fixture-linux-containment", kind: "linux_isolation", enabled: true, revision: 1, profile_id: "linux-user-mount-net-v1", unshare: { path: unshare, fingerprint: fileDigest(unshare) }, bubblewrap: { path: bubblewrap, fingerprint: fileDigest(bubblewrap) }, barrier_interpreter: { path: node, fingerprint: fileDigest(node) }, barrier_script: { path: barrierScript, fingerprint: fileDigest(barrierScript) } } } }), { mode: 0o600 });
  const runtimeTrust = loadProtectedRuntimeTrust({ repositoryRoot, repositoryLogicalId: identity.repository_logical_id, checkoutInstanceId: identity.checkout_instance_id, trustPath, now });
  const launchObservationVerifier = createProtectedLaunchObservationVerifier({ runtimeTrust, authorityId: "fixture-launch-observer" });
  const containment = createLinuxIsolatedContainment({ runtimeTrust, authorityId: "fixture-linux-containment", inputRoot, outputRoot });
  const portOptions = {
    store,
    clock: () => now,
    nonceFactory: () => "fixture-start-nonce",
    terminationGraceMs: 500,
    pathPolicy: ({ plan }) => ({ allowed: plan.working_directory === inputRoot && path.dirname(plan.response_file) === outputRoot && plan.stdin_file === prompt }),
    fenceGuard: async ({ plan }) => ({ allowed: true, fence_fingerprint: plan.fence_fingerprint, authority_epoch: plan.authority_epoch }),
    effectFencer: async ({ run_id: runId, reason }) => ({ fenced: true, fingerprint: runLifecycleDigest({ run_id: runId, reason }) }),
    launchObservationVerifier,
    containment,
    limits: { maxRuntimeMs: 5000, maxResultBytes: 64 * 1024, maxStderrBytes: 64 * 1024, maxPromptBytes: 1024, maxArgv: 16 },
  };
  const makePort = () => createRunLifecyclePort(portOptions);
  const port = makePort();
  return { root, repositoryRoot, inputRoot, outputRoot, manifestFingerprint, script, childScript, prompt, databasePath, identity, now, store, port, portOptions, makePort, runtimeTrust };
}

function plan(f, { runId = "run-1", selectedEffort = "high", actualEffort = selectedEffort, mode = "success", timeoutMs = 5000 } = {}) {
  const node = realpathSync(process.execPath);
  const response = path.join(f.outputRoot, `${runId}-result.json`);
  const core = { run_id: runId, selected_provider: "codex-cli", selected_model: "gpt-5.6-sol", selected_effort: selectedEffort, actual_effort: actualEffort, mode };
  return {
    run_id: runId,
    idempotency_key: `idempotency-${runId}`,
    plan_fingerprint: runLifecycleDigest(core),
    manifest_fingerprint: f.manifestFingerprint,
    authority_epoch: 0,
    fence_fingerprint: runLifecycleDigest({ run_id: runId, authority_epoch: 0 }),
    executable_path: node,
    executable_fingerprint: fileDigest(node),
    argv: [f.script, response, runId, core.selected_provider, core.selected_model, selectedEffort, actualEffort, mode, f.childScript],
    working_directory: f.inputRoot,
    stdin_file: f.prompt,
    stdin_fingerprint: fileDigest(f.prompt),
    response_file: response,
    environment: {},
    timeout_ms: timeoutMs,
    max_result_bytes: 64 * 1024,
    max_stderr_bytes: 64 * 1024,
    selected_provider: core.selected_provider,
    selected_model: core.selected_model,
    selected_effort: core.selected_effort,
  };
}

test("RunLifecyclePort persists a detached run and confirms selected versus actual model and effort", async () => {
  const f = fixture();
  const launchPlan = plan(f);
  const started = await f.port.start(launchPlan);
  assert.equal(started.state, "RUNNING");
  const collected = await f.port.collect_result("run-1");
  assert.equal(collected.state, "COMPLETED");
  assert.deepEqual({ model: collected.launch_report.model, effort: collected.launch_report.effort }, { model: "gpt-5.6-sol", effort: "high" });
  assert.equal(f.store.getRuntimeRun({ runId: "run-1" }).observation.actual_effort, "high");
  const replay = await f.port.collect_result("run-1");
  assert.equal(replay.reused, true);
  assert.equal(replay.result_fingerprint, collected.result_fingerprint);
  assert.equal((await f.port.reconcile("run-1")).result, "matched");
  f.store.close();
});

test("response IO remains bound to the pinned private output directory across pathname replacement", async () => {
  const f = fixture();
  const displacedOutput = `${f.outputRoot}-displaced`;
  const port = createRunLifecyclePort({
    ...f.portOptions,
    beforeExecutionRelease: () => {
      renameSync(f.outputRoot, displacedOutput);
      mkdirSync(f.outputRoot, { mode: 0o700 });
    },
  });
  await port.start(plan(f));
  const collected = await port.collect_result("run-1");
  assert.equal(collected.state, "COMPLETED");
  assert.equal(existsSync(path.join(f.outputRoot, "run-1-result.json")), false);
  assert.equal(existsSync(path.join(displacedOutput, "run-1-result.json")), false);
  f.store.close();
});

test("response output requires an owner-controlled exact 0700 directory", async () => {
  const f = fixture();
  chmodSync(f.outputRoot, 0o750);
  await assert.rejects(() => f.port.start(plan(f)), /RUN_LIFECYCLE_RESPONSE_DIRECTORY_INVALID/);
  assert.equal(f.store.getRuntimeRun({ runId: "run-1" }).state, "FAILED");
  f.store.close();
});

test("RunLifecyclePort ignores task self-reporting and rejects launch-argument substitution", async () => {
  const f = fixture();
  await f.port.start(plan(f, { selectedEffort: "high", actualEffort: "medium" }));
  const collected = await f.port.collect_result("run-1");
  assert.equal(collected.launch_report.effort, "high");
  assert.equal(f.store.getRuntimeRun({ runId: "run-1" }).state, "COMPLETED");
  f.store.close();
  const substituted = fixture();
  const substitutedPlan = plan(substituted, { selectedEffort: "high", actualEffort: "medium" });
  substitutedPlan.argv = substitutedPlan.argv.map((argument) => argument === "high" ? "medium" : argument);
  await assert.rejects(() => substituted.port.start(substitutedPlan), /RUN_LIFECYCLE_CONTAINMENT_OBSERVATION_FAILED/);
  assert.equal(substituted.store.getRuntimeRun({ runId: "run-1" }).state, "FAILED");
  substituted.store.close();
  const implicit = fixture();
  await assert.rejects(() => implicit.port.start(plan(implicit, { selectedEffort: "none", actualEffort: "none" })), /RUN_LIFECYCLE_IMPLICIT_EFFORT_FORBIDDEN/);
  assert.equal(implicit.store.getRuntimeRun({ runId: "run-1" }).state, "FAILED");
  implicit.store.close();
});

test("RunLifecyclePort durably binds process identity before releasing provider execution", async () => {
  const f = fixture();
  let snapshot;
  const port = createRunLifecyclePort({
    ...f.portOptions,
    beforeExecutionRelease: ({ run }) => { snapshot = run; throw new Error("FORCED_CONTROLLER_CRASH_WINDOW"); },
  });
  await assert.rejects(() => port.start(plan(f, { mode: "sleep" })), /FORCED_CONTROLLER_CRASH_WINDOW/);
  assert.equal(snapshot.state, "RUNNING");
  assert.ok(Number.isSafeInteger(snapshot.pid));
  assert.match(snapshot.observation.process_identity_fingerprint, /^[a-f0-9]{64}$/);
  assert.equal(f.store.getRuntimeRun({ runId: "run-1" }).state, "FAILED");
  f.store.close();
});

test("the two-stage barrier never turns controller EOF into provider execution", async () => {
  const executionRoot = mkdtempSync(path.join(tmpdir(), "next-workflow-barrier-crash-"));
  roots.push(executionRoot);
  chmodSync(executionRoot, 0o700);
  const marker = path.join(executionRoot, "provider-ran");
  const node = realpathSync(process.execPath);
  const barrierScriptPath = realpathSync(path.join(path.dirname(new URL(import.meta.url).pathname), "lib", "next_workflow", "runtime_barrier.cjs"));
  const paths = [realpathSync("/usr/bin/unshare"), realpathSync("/usr/bin/bwrap"), realpathSync("/usr/bin/touch"), executionRoot, barrierScriptPath, node];
  const fds = paths.map((candidate, index) => openSync(candidate, fsConstants.O_RDONLY | (index === 3 ? (fsConstants.O_DIRECTORY ?? 0) : 0)));
  const [unshareFd, bwrapFd, touchFd, outputFd, barrierFd, nodeFd] = fds;
  const args = [
    "/proc/self/fd/10", "/proc/self/fd/3", "--user", "--map-root-user", "--net", "--mount", "--fork", "--kill-child",
    "/proc/self/fd/4", "--die-with-parent", "--new-session", "--unshare-pid", "--cap-drop", "ALL",
    "--dir", "/usr", "--ro-bind", "/usr/lib", "/usr/lib", "--ro-bind", "/usr/lib64", "/usr/lib64", "--symlink", "usr/lib", "/lib", "--symlink", "usr/lib64", "/lib64",
    "--proc", "/proc", "--dev", "/dev", "--tmpfs", "/tmp", "--dir", "/runtime", "--dir", "/output",
    "--ro-bind", "/proc/self/fd/5", "/runtime/executable", "--bind", "/proc/self/fd/7", "/output", "--block-fd", "9", "--clearenv", "/runtime/executable", "/output/provider-ran",
  ];
  const controllerChild = spawn("/proc/self/fd/11", args, { cwd: "/", env: {}, shell: false, detached: true, stdio: ["ignore", "ignore", "ignore", unshareFd, bwrapFd, touchFd, "ignore", outputFd, "ignore", "pipe", barrierFd, nodeFd, "pipe"] });
  for (const fd of fds) closeSync(fd);
  await new Promise((resolvePromise, reject) => { controllerChild.once("spawn", resolvePromise); controllerChild.once("error", reject); });
  controllerChild.stdio[9].write("S");
  let statusBody = "";
  await new Promise((resolvePromise, reject) => {
    const timeout = setTimeout(() => reject(new Error("BARRIER_TEST_STATUS_TIMEOUT")), 2000);
    controllerChild.stdio[12].on("data", (chunk) => {
      statusBody += chunk.toString("utf8");
      if (statusBody.includes("contained_process_spawned")) { clearTimeout(timeout); resolvePromise(); }
    });
  });
  controllerChild.stdio[9].end();
  await new Promise((resolvePromise) => setTimeout(resolvePromise, 300));
  assert.equal(existsSync(marker), false);
  assert.doesNotThrow(() => process.kill(-controllerChild.pid, 0));
  try { process.kill(-controllerChild.pid, "SIGKILL"); } catch {}
  await new Promise((resolvePromise) => controllerChild.once("close", resolvePromise));
});

test("RunLifecyclePort containment denies host repository, owner trust, Git, input writes, and network", async () => {
  const f = fixture();
  await f.port.start(plan(f, { mode: "probe" }));
  const collected = await f.port.collect_result("run-1");
  assert.equal(collected.state, "COMPLETED");
  assert.equal(collected.result.status, "succeeded");
  assert.deepEqual(collected.result.findings.map((finding) => finding.code), ["network-denied", "repository-denied", "git-denied", "owner-trust-denied", "input-write-denied"]);
  assert.ok(collected.result.findings.every((finding) => finding.severity === "info"));
  f.store.close();
});

test("RunLifecyclePort rejects unknown authority-like result fields", async () => {
  const f = fixture();
  await f.port.start(plan(f, { mode: "unsafe" }));
  await assert.rejects(() => f.port.collect_result("run-1"), /AGENT_RESULT_UNKNOWN_FIELD:authority/);
  assert.equal(f.store.getRuntimeRun({ runId: "run-1" }).state, "FAILED");
  f.store.close();
});

test("RunLifecyclePort bounds finding codes to identifiers", async () => {
  const f = fixture();
  await f.port.start(plan(f, { mode: "invalid-finding-code" }));
  await assert.rejects(() => f.port.collect_result("run-1"), /AGENT_RESULT_FINDING_CODE_INVALID/);
  assert.equal(f.store.getRuntimeRun({ runId: "run-1" }).state, "FAILED");
  f.store.close();
});

test("containment refuses repository and protected-control root overlap", () => {
  const f = fixture();
  assert.throws(() => createLinuxIsolatedContainment({ runtimeTrust: f.runtimeTrust, authorityId: "fixture-linux-containment", inputRoot: f.repositoryRoot, outputRoot: f.outputRoot }), /LINUX_CONTAINMENT_CONTROL_ROOT_OVERLAP_FORBIDDEN/);
  const nestedControl = path.join(f.inputRoot, "nested", ".git");
  mkdirSync(nestedControl, { recursive: true, mode: 0o700 });
  assert.throws(() => createLinuxIsolatedContainment({ runtimeTrust: f.runtimeTrust, authorityId: "fixture-linux-containment", inputRoot: f.inputRoot, outputRoot: f.outputRoot }), /LINUX_CONTAINMENT_CONTROL_METADATA_FORBIDDEN/);
  rmSync(path.join(f.inputRoot, "nested"), { recursive: true, force: true });
  const externalGit = path.join(f.root, "relocated-git-admin");
  const nestedPrivateRoot = path.join(externalGit, "private-task-root");
  mkdirSync(path.join(externalGit, "objects"), { recursive: true, mode: 0o700 });
  mkdirSync(nestedPrivateRoot, { mode: 0o700 });
  writeFileSync(path.join(externalGit, "HEAD"), "ref: refs/heads/main\n", { mode: 0o600 });
  chmodSync(externalGit, 0o700);
  assert.throws(() => createLinuxIsolatedContainment({ runtimeTrust: f.runtimeTrust, authorityId: "fixture-linux-containment", inputRoot: nestedPrivateRoot, outputRoot: f.outputRoot }), /LINUX_CONTAINMENT_CONTROL_ROOT_OVERLAP_FORBIDDEN/);
  f.store.close();
});

test("RunLifecyclePort terminates the detached process group and verifies absence", async () => {
  const f = fixture();
  await f.port.start(plan(f, { mode: "sleep" }));
  const terminated = await f.port.terminate("run-1");
  assert.equal(terminated.persisted_state, "CANCELLED");
  assert.equal(terminated.observed_state, "terminal_absent");
  const collected = await f.port.collect_result("run-1");
  assert.equal(collected.state, "CANCELLED");
  assert.equal((await f.port.reconcile("run-1")).result, "matched");
  f.store.close();
});

test("RunLifecyclePort times out, escalates termination, and returns no result", async () => {
  const f = fixture();
  await f.port.start(plan(f, { mode: "sleep", timeoutMs: 50 }));
  const collected = await f.port.collect_result("run-1");
  assert.equal(collected.state, "TIMED_OUT");
  assert.equal(collected.result, null);
  assert.equal((await f.port.reconcile("run-1")).result, "matched");
  f.store.close();
});

test("RunLifecyclePort restart recovery reacquires the persisted process identity and terminates fail-closed", async () => {
  const f = fixture();
  await f.port.start(plan(f, { mode: "sleep" }));
  const containedIdentity = f.store.getRuntimeRun({ runId: "run-1" }).observation.contained_process_identity;
  assert.ok(Number.isSafeInteger(containedIdentity.pid));
  f.store.close();
  const restartedStore = openWorkflowStateStore({ repositoryRoot: f.repositoryRoot, databasePath: f.databasePath, expectedIdentity: f.identity, clock: () => f.now });
  assert.equal(restartedStore.recovery_only, true);
  const restartedPort = createRunLifecyclePort({ ...f.portOptions, store: restartedStore });
  const recovered = await restartedPort.recover("run-1");
  assert.equal(recovered.recovery, "fenced_and_terminated");
  assert.equal(restartedStore.getRuntimeRun({ runId: "run-1" }).state, "CANCELLED");
  assert.equal(restartedStore.recovery_only, false);
  assert.equal((await restartedPort.reconcile("run-1")).result, "matched");
  assert.equal(existsSync(`/proc/${containedIdentity.pid}`), false);
  await assert.rejects(() => f.port.collect_result("run-1"));
  restartedStore.close();
});

test("isolation prerequisite diagnostics are non-installing and give actionable fail-closed guidance", () => {
  const available = diagnoseLinuxIsolationPrerequisites();
  assert.equal(available.status, "available");
  assert.equal(available.available, true);
  assert.equal(available.automatic_install, false);
  assert.deepEqual(available.install_commands, []);
  const blocked = diagnoseLinuxIsolationPrerequisites({ runner: () => ({ status: 1, stderr: "namespace disabled" }) });
  assert.equal(blocked.status, "operating_system_policy_blocked");
  assert.equal(blocked.available, false);
  assert.ok(blocked.namespace_checks.length > 0);
});
