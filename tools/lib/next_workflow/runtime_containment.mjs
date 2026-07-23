import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { existsSync, lstatSync, readFileSync, readlinkSync, readdirSync, realpathSync } from "node:fs";
import path from "node:path";
import { protectedRuntimeAuthority } from "./runtime_trust.mjs";

const PROTECTED_CONTAINMENT = new WeakSet();

function canonicalJson(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(",")}}`;
  return JSON.stringify(value);
}

function digest(value) {
  const bytes = Buffer.isBuffer(value) ? value : Buffer.from(typeof value === "string" ? value : canonicalJson(value));
  return createHash("sha256").update(bytes).digest("hex");
}

function within(root, candidate) {
  const relative = path.relative(root, candidate);
  return relative === "" || (relative !== ".." && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative));
}

function overlaps(left, right) {
  return within(left, right) || within(right, left);
}

function protectedExecutable(descriptor, code) {
  if (!descriptor || typeof descriptor.path !== "string" || !path.isAbsolute(descriptor.path) || !/^[a-f0-9]{64}$/.test(descriptor.fingerprint ?? "")) throw new Error(code);
  const candidate = realpathSync(descriptor.path);
  if (candidate !== descriptor.path) throw new Error(code);
  const info = lstatSync(candidate);
  if (!info.isFile() || info.isSymbolicLink() || (info.mode & 0o111) === 0 || (info.mode & 0o022) !== 0 || digest(readFileSync(candidate)) !== descriptor.fingerprint) throw new Error(code);
  return { path: candidate, fingerprint: descriptor.fingerprint };
}

function protectedFile(descriptor, code) {
  if (!descriptor || typeof descriptor.path !== "string" || !path.isAbsolute(descriptor.path) || !/^[a-f0-9]{64}$/.test(descriptor.fingerprint ?? "")) throw new Error(code);
  const candidate = realpathSync(descriptor.path);
  if (candidate !== descriptor.path) throw new Error(code);
  const info = lstatSync(candidate);
  if (!info.isFile() || info.isSymbolicLink() || (info.mode & 0o022) !== 0 || digest(readFileSync(candidate)) !== descriptor.fingerprint) throw new Error(code);
  return { path: candidate, fingerprint: descriptor.fingerprint };
}

function privateRoot(candidate, code) {
  const canonical = realpathSync(path.resolve(candidate));
  const info = lstatSync(canonical);
  if (!info.isDirectory() || info.isSymbolicLink() || (info.mode & 0o077) !== 0 || (typeof process.getuid === "function" && info.uid !== process.getuid())) throw new Error(code);
  return canonical;
}

function assertNoControlMetadata(root) {
  const controlNames = new Set([".git", ".agents", ".codex"]);
  if (controlNames.has(path.basename(root))) throw new Error("LINUX_CONTAINMENT_CONTROL_METADATA_FORBIDDEN");
  const pending = [root];
  let visited = 0;
  while (pending.length > 0) {
    const current = pending.pop();
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      visited += 1;
      if (visited > 100_000) throw new Error("LINUX_CONTAINMENT_CONTROL_METADATA_SCAN_LIMIT");
      if (controlNames.has(entry.name)) throw new Error("LINUX_CONTAINMENT_CONTROL_METADATA_FORBIDDEN");
      if (entry.isSymbolicLink()) throw new Error("LINUX_CONTAINMENT_SYMLINK_FORBIDDEN");
      if (entry.isDirectory()) pending.push(path.join(current, entry.name));
    }
  }
}

function looksLikeGitAdministrativeDirectory(candidate) {
  try {
    return lstatSync(candidate).isDirectory()
      && existsSync(path.join(candidate, "HEAD"))
      && ["objects", "commondir", "gitdir"].some((entry) => existsSync(path.join(candidate, entry)));
  } catch {
    return false;
  }
}

function assertOutsideControlAncestors(root) {
  const controlNames = new Set([".git", ".agents", ".codex"]);
  let current = root;
  for (;;) {
    if (controlNames.has(path.basename(current)) || looksLikeGitAdministrativeDirectory(current)) throw new Error("LINUX_CONTAINMENT_CONTROL_ROOT_OVERLAP_FORBIDDEN");
    const parent = path.dirname(current);
    if (parent === current) return;
    current = parent;
  }
}

function repositoryGitControlRoots(repositoryRoot) {
  const roots = [];
  const marker = path.join(repositoryRoot, ".git");
  if (!existsSync(marker)) return roots;
  const markerInfo = lstatSync(marker);
  let gitDirectory;
  if (markerInfo.isDirectory()) gitDirectory = realpathSync(marker);
  else if (markerInfo.isFile()) {
    const match = /^gitdir:\s*(.+)\s*$/u.exec(readFileSync(marker, "utf8"));
    if (!match) throw new Error("LINUX_CONTAINMENT_GIT_CONTROL_PATH_INVALID");
    gitDirectory = realpathSync(path.resolve(repositoryRoot, match[1]));
  } else throw new Error("LINUX_CONTAINMENT_GIT_CONTROL_PATH_INVALID");
  roots.push(gitDirectory);
  const commonMarker = path.join(gitDirectory, "commondir");
  if (existsSync(commonMarker)) roots.push(realpathSync(path.resolve(gitDirectory, readFileSync(commonMarker, "utf8").trim())));
  return [...new Set(roots)];
}

function processMarker(pid) {
  if (!Number.isSafeInteger(pid) || pid < 1 || process.platform !== "linux") return null;
  try {
    const stat = readFileSync(`/proc/${pid}/stat`, "utf8");
    const close = stat.lastIndexOf(")");
    if (close < 0) return null;
    const fields = stat.slice(close + 2).trim().split(/\s+/u);
    const startTimeTicks = fields[19];
    const bootId = readFileSync("/proc/sys/kernel/random/boot_id", "utf8").trim();
    if (!/^\d+$/u.test(startTimeTicks ?? "") || !/^[a-f0-9-]{36}$/u.test(bootId)) return null;
    return { pid, boot_id: bootId, start_time_ticks: startTimeTicks };
  } catch (error) {
    if (error?.code === "ENOENT" || error?.code === "ESRCH") return null;
    throw error;
  }
}

function namespaceSnapshot(pid = "self") {
  const result = {};
  for (const name of ["user", "net", "mnt", "pid", "uts", "ipc"]) result[name] = readlinkSync(`/proc/${pid}/ns/${name}`);
  return result;
}

function mapPath(root, sandboxRoot, candidate) {
  const canonical = path.resolve(candidate);
  if (!within(root, canonical)) return null;
  const relative = path.relative(root, canonical);
  return relative === "" ? sandboxRoot : path.posix.join(sandboxRoot, ...relative.split(path.sep));
}

const PROVIDER_ONLY_DISABLED_FEATURES = Object.freeze([
  "shell_tool",
  "unified_exec",
  "code_mode_host",
  "apps",
  "browser_use",
  "in_app_browser",
  "computer_use",
  "image_generation",
  "standalone_web_search",
  "multi_agent",
  "skill_search",
  "plugin_sharing",
  "remote_plugin",
  "tool_suggest",
]);

function hasDisabledFeature(argv, feature) {
  return argv.some((argument, index) => argument === "--disable" && argv[index + 1] === feature);
}

export function createLinuxIsolatedContainment({ runtimeTrust, authorityId, inputRoot, outputRoot, recoveryOnly = false } = {}) {
  if (process.platform !== "linux") throw new Error("LINUX_CONTAINMENT_REQUIRED");
  if (typeof recoveryOnly !== "boolean") throw new Error("LINUX_CONTAINMENT_RECOVERY_MODE_INVALID");
  const authority = protectedRuntimeAuthority(runtimeTrust, authorityId, "linux_isolation");
  const providerNetwork = authority.profile_id === "linux-user-mount-provider-net-v1";
  if (!new Set(["linux-user-mount-net-v1", "linux-user-mount-provider-net-v1"]).has(authority.profile_id) || !Number.isSafeInteger(authority.revision) || authority.revision < 1) throw new Error("LINUX_CONTAINMENT_AUTHORITY_INVALID");
  const unshare = protectedExecutable(authority.unshare, "LINUX_CONTAINMENT_UNSHARE_INVALID");
  const bubblewrap = protectedExecutable(authority.bubblewrap, "LINUX_CONTAINMENT_BUBBLEWRAP_INVALID");
  const barrierInterpreter = protectedExecutable(authority.barrier_interpreter, "LINUX_CONTAINMENT_BARRIER_INTERPRETER_INVALID");
  const barrierScript = protectedFile(authority.barrier_script, "LINUX_CONTAINMENT_BARRIER_SCRIPT_INVALID");
  const providerAuthFile = providerNetwork && !recoveryOnly ? protectedFile(authority.provider_auth_file, "LINUX_CONTAINMENT_PROVIDER_AUTH_INVALID") : null;
  const input = privateRoot(inputRoot, "LINUX_CONTAINMENT_INPUT_ROOT_INVALID");
  const output = privateRoot(outputRoot, "LINUX_CONTAINMENT_OUTPUT_ROOT_INVALID");
  if (within(input, output) || within(output, input)) throw new Error("LINUX_CONTAINMENT_ROOTS_MUST_BE_DISJOINT");
  const forbiddenRoots = [runtimeTrust.repository_root, runtimeTrust.source_directory, runtimeTrust.source_path, ...repositoryGitControlRoots(runtimeTrust.repository_root)];
  if (forbiddenRoots.some((candidate) => typeof candidate === "string" && (overlaps(input, candidate) || overlaps(output, candidate)))) throw new Error("LINUX_CONTAINMENT_CONTROL_ROOT_OVERLAP_FORBIDDEN");
  for (const root of [input, output]) {
    assertOutsideControlAncestors(root);
    assertNoControlMetadata(root);
  }
  if (!existsSync("/usr/lib") || !existsSync("/usr/lib64")) throw new Error("LINUX_CONTAINMENT_RUNTIME_LIBRARIES_MISSING");
  const parentNamespaces = namespaceSnapshot();
  const authorityFingerprint = digest({ authority, input_root: input, output_root: output });
  const containment = Object.freeze({
    profile_id: authority.profile_id,
    authority_id: authorityId,
    authority_fingerprint: authorityFingerprint,
    unshare,
    bubblewrap,
    barrier_interpreter: barrierInterpreter,
    barrier_script: barrierScript,
    provider_auth_file: providerAuthFile,
    provider_network: providerNetwork,
    task_network_access: false,
    task_tools_enabled: false,
    input_root: input,
    output_root: output,
    validatePlan(plan) {
      if (recoveryOnly) throw new Error("LINUX_CONTAINMENT_RECOVERY_ONLY");
      const working = mapPath(input, "/input", plan.working_directory);
      const prompt = mapPath(input, "/input", plan.stdin_file);
      const response = mapPath(output, "/output", plan.response_file);
      if (!working || !prompt || !response || Object.keys(plan.environment ?? {}).length !== 0) throw new Error("RUN_LIFECYCLE_CONTAINMENT_PATH_INVALID");
      const argv = plan.argv.map((argument) => {
        if (!path.isAbsolute(argument)) return argument;
        const mappedInput = mapPath(input, "/input", argument);
        const mappedOutput = mapPath(output, "/output", argument);
        if (!mappedInput && !mappedOutput) throw new Error("RUN_LIFECYCLE_CONTAINMENT_ARGUMENT_PATH_INVALID");
        return mappedInput ?? mappedOutput;
      });
      return { working_directory: working, stdin_file: prompt, response_file: response, argv };
    },
    buildSpawn({ plan, hasInterpreter = false }) {
      if (recoveryOnly) throw new Error("LINUX_CONTAINMENT_RECOVERY_ONLY");
      const mapped = this.validatePlan(plan);
      const target = hasInterpreter ? "/runtime/interpreter" : "/runtime/executable";
      const targetArgv = hasInterpreter ? ["/runtime/executable", ...mapped.argv] : mapped.argv;
      const bubblewrapArgs = [
        "/proc/self/fd/4", "--die-with-parent", "--unshare-pid", "--unshare-uts", "--unshare-ipc", "--cap-drop", "ALL",
        "--clearenv",
        "--dir", "/usr", "--ro-bind", "/usr/lib", "/usr/lib", "--ro-bind", "/usr/lib64", "/usr/lib64", "--symlink", "usr/lib", "/lib", "--symlink", "usr/lib64", "/lib64",
        "--proc", "/proc", "--dev", "/dev", "--tmpfs", "/tmp", "--dir", "/runtime", "--dir", "/input", "--dir", "/output",
        ...(providerNetwork ? [
          "--dir", "/etc", "--dir", "/home", "--dir", "/home/agent", "--tmpfs", "/provider-home",
          "--ro-bind", "/proc/self/fd/13", "/provider-home/auth.json",
          "--ro-bind", "/etc/ssl", "/etc/ssl",
          "--ro-bind", "/etc/resolv.conf", "/etc/resolv.conf",
          "--ro-bind", "/etc/hosts", "/etc/hosts",
          "--ro-bind", "/etc/nsswitch.conf", "/etc/nsswitch.conf",
          "--setenv", "CODEX_HOME", "/provider-home",
          "--setenv", "HOME", "/home/agent",
          "--setenv", "LANG", "C.UTF-8",
          "--setenv", "LC_ALL", "C.UTF-8",
        ] : []),
        "--ro-bind", "/proc/self/fd/5", "/runtime/executable",
        ...(hasInterpreter ? ["--ro-bind", "/proc/self/fd/8", "/runtime/interpreter"] : []),
        "--ro-bind", "/proc/self/fd/6", "/input", "--bind", "/proc/self/fd/7", "/output", "--chdir", mapped.working_directory, "--block-fd", "9", target, ...targetArgv,
      ];
      const unshareArgv = ["--user", "--map-root-user", ...(providerNetwork ? [] : ["--net"]), "--mount", "--fork", "--kill-child", ...bubblewrapArgs];
      return { executable: "/proc/self/fd/11", argv: ["/proc/self/fd/10", "/proc/self/fd/3", ...unshareArgv], mapped };
    },
    observeBarrierProcess({ pid, processGroupId, startNonce }) {
      const marker = processMarker(pid);
      if (!marker) throw new Error("RUN_LIFECYCLE_PROCESS_MARKER_UNAVAILABLE");
      const argv = readFileSync(`/proc/${pid}/cmdline`).toString("utf8").split("\0").filter(Boolean);
      if (!argv.includes("/proc/self/fd/10") || !argv.includes("/proc/self/fd/3")) throw new Error("RUN_LIFECYCLE_BARRIER_OBSERVATION_FAILED");
      const processIdentity = { ...marker, process_group_id: processGroupId, start_nonce: startNonce, containment_authority_fingerprint: authorityFingerprint };
      const processIdentityFingerprint = digest(processIdentity);
      const evidence = { verified: true, barrier_ready: true, contained: false, profile_id: authority.profile_id, authority_id: authorityId, authority_fingerprint: authorityFingerprint, process_identity: processIdentity, process_identity_fingerprint: processIdentityFingerprint, argv };
      return Object.freeze({ ...evidence, fingerprint: digest(evidence) });
    },
    observeProcess({ pid, barrierPid, processGroupId, plan, startNonce }) {
      const marker = processMarker(barrierPid);
      const containedMarker = processMarker(pid);
      if (!marker || !containedMarker) throw new Error("RUN_LIFECYCLE_PROCESS_MARKER_UNAVAILABLE");
      const namespaces = namespaceSnapshot(pid);
      const namespaceSeparated = ["user", "mnt"].every((name) => namespaces[name] !== parentNamespaces[name])
        && (providerNetwork ? namespaces.net === parentNamespaces.net : namespaces.net !== parentNamespaces.net);
      const argv = readFileSync(`/proc/${pid}/cmdline`).toString("utf8").split("\0").filter(Boolean);
      const requiredArguments = [
        "--mount", "--ro-bind", "--bind", "--model", plan.selected_model, "-c", `model_reasoning_effort="${plan.selected_effort}"`,
        ...(providerNetwork ? ["/provider-home/auth.json"] : ["--net"]),
      ];
      if (!namespaceSeparated
        || requiredArguments.some((argument) => !argv.includes(argument))
        || (providerNetwork && PROVIDER_ONLY_DISABLED_FEATURES.some((feature) => !hasDisabledFeature(argv, feature)))) throw new Error("RUN_LIFECYCLE_CONTAINMENT_OBSERVATION_FAILED");
      const processIdentity = { ...marker, process_group_id: processGroupId, start_nonce: startNonce, containment_authority_fingerprint: authorityFingerprint };
      const processIdentityFingerprint = digest(processIdentity);
      const evidence = { verified: true, barrier_ready: true, contained: true, contained_pid: pid, contained_process_identity: containedMarker, profile_id: authority.profile_id, authority_id: authorityId, authority_fingerprint: authorityFingerprint, process_identity: processIdentity, process_identity_fingerprint: processIdentityFingerprint, namespaces, argv, provider_network: providerNetwork, provider_network_boundary: providerNetwork ? "pinned_provider_process_only" : "disabled", disabled_task_features: providerNetwork ? [...PROVIDER_ONLY_DISABLED_FEATURES] : [], task_network_access: false, task_tools_enabled: false };
      return Object.freeze({ ...evidence, fingerprint: digest(evidence) });
    },
    matchPersistedProcess({ pid, observation }) {
      const expected = observation?.process_identity;
      if (!expected || pid !== expected.pid) return "unknown";
      const current = processMarker(pid);
      if (!current) return "absent";
      return current.boot_id === expected.boot_id && current.start_time_ticks === expected.start_time_ticks ? "matched" : "reused";
    },
    matchPersistedContainedProcess({ observation }) {
      const expected = observation?.contained_process_identity;
      if (!expected || !Number.isSafeInteger(expected.pid)) return "unbound";
      const current = processMarker(expected.pid);
      if (!current) return "absent";
      return current.boot_id === expected.boot_id && current.start_time_ticks === expected.start_time_ticks ? "matched" : "reused";
    },
  });
  PROTECTED_CONTAINMENT.add(containment);
  return containment;
}

export function assertProtectedContainment(containment) {
  if (!PROTECTED_CONTAINMENT.has(containment)) throw new Error("PROTECTED_RUNTIME_CONTAINMENT_REQUIRED");
  return containment;
}

export function runtimeContainmentDigest(value) {
  return digest(value);
}

function operatingSystemId() {
  try {
    const fields = Object.fromEntries(readFileSync("/etc/os-release", "utf8").split(/\r?\n/u).filter((line) => line.includes("=")).map((line) => {
      const index = line.indexOf("=");
      return [line.slice(0, index), line.slice(index + 1).replace(/^['"]|['"]$/gu, "")];
    }));
    return { id: fields.ID ?? "linux", id_like: fields.ID_LIKE ?? "", name: fields.PRETTY_NAME ?? fields.NAME ?? "Linux" };
  } catch {
    return { id: "linux", id_like: "", name: "Linux" };
  }
}

export function diagnoseLinuxIsolationPrerequisites({ runner = spawnSync } = {}) {
  if (process.platform !== "linux") return { status: "unsupported", available: false, platform: process.platform, summary: "Linux isolation is unavailable on this operating system.", missing: ["linux"], disabled: [], install_commands: [], verification_command: "node tools/next-workflow.mjs runtime isolation-check", automatic_install: false };
  const os = operatingSystemId();
  const bwrapPath = ["/usr/bin/bwrap", "/usr/local/bin/bwrap"].find((candidate) => existsSync(candidate)) ?? null;
  const unsharePath = ["/usr/bin/unshare", "/bin/unshare"].find((candidate) => existsSync(candidate)) ?? null;
  const runtimeLibraries = ["/usr/lib", "/usr/lib64"];
  const missing = [...(!bwrapPath ? ["bubblewrap"] : []), ...(!unsharePath ? ["util-linux unshare"] : []), ...runtimeLibraries.filter((candidate) => !existsSync(candidate)).map((candidate) => `runtime library directory ${candidate}`)];
  const disabled = [];
  if (missing.length === 0) {
    const probe = runner(unsharePath, [
      "--user", "--map-root-user", "--net", "--mount", "--fork",
      bwrapPath, "--die-with-parent", "--unshare-pid", "--cap-drop", "ALL",
      "--dir", "/usr", "--ro-bind", "/usr/lib", "/usr/lib", "--ro-bind", "/usr/lib64", "/usr/lib64",
      "--symlink", "usr/lib", "/lib", "--symlink", "usr/lib64", "/lib64",
      "--proc", "/proc", "--dev", "/dev", "--tmpfs", "/tmp", "--dir", "/runtime",
      "--ro-bind", "/usr/bin/true", "/runtime/executable", "--clearenv", "/runtime/executable",
    ], { env: {}, encoding: "utf8", timeout: 5000, shell: false });
    if (probe?.status !== 0) disabled.push("unprivileged user or network namespaces");
  }
  const family = `${os.id} ${os.id_like}`.toLowerCase();
  const installCommands = missing.length === 0 ? []
    : family.includes("ubuntu") || family.includes("debian") ? ["sudo apt update", "sudo apt install bubblewrap util-linux"]
      : family.includes("fedora") || family.includes("rhel") ? ["sudo dnf install bubblewrap util-linux"]
        : family.includes("arch") ? ["sudo pacman -S bubblewrap util-linux"]
          : ["Install the bubblewrap and util-linux packages using the operating system package manager."];
  const available = missing.length === 0 && disabled.length === 0;
  return {
    status: available ? "available" : missing.length > 0 ? "installation_required" : "operating_system_policy_blocked",
    available,
    platform: "linux",
    operating_system: os,
    summary: available ? "Lightweight CLI isolation is available." : missing.length > 0 ? "Required isolation components are missing." : "Isolation components are installed, but the operating system has disabled a required namespace feature.",
    missing,
    disabled,
    verified_prerequisites: available ? ["bubblewrap executable", "util-linux unshare executable", "user namespace", "mount namespace", "network namespace", "Bubblewrap process namespace", ...runtimeLibraries] : [],
    install_commands: installCommands,
    namespace_checks: disabled.length > 0 ? ["sysctl kernel.unprivileged_userns_clone", "sysctl user.max_user_namespaces"] : [],
    verification_command: "node tools/next-workflow.mjs runtime isolation-check",
    automatic_install: false,
  };
}
