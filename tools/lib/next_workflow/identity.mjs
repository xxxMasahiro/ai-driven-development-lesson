import { createHash, randomUUID } from "node:crypto";
import { execFileSync } from "node:child_process";
import { closeSync, constants as fsConstants, existsSync, fsyncSync, lstatSync, mkdirSync, openSync, realpathSync, renameSync, writeSync } from "node:fs";
import path from "node:path";
import { readSafeTextFile } from "../development_instruction.mjs";

const CONFIG_RELATIVE_PATH = "learning/NEXT_WORKFLOW_REPOSITORY_IDENTITY.json";
const STATE_RELATIVE_PATH = ".workflow-state/checkout-identity.json";
const LOGICAL_ID = /^[a-z0-9][a-z0-9._:-]{2,127}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function digest(value) {
  const serialized = typeof value === "string" ? value : JSON.stringify(value, Object.keys(value).sort());
  return createHash("sha256").update(serialized).digest("hex");
}

function fail(code) {
  const error = new Error(code);
  error.code = code;
  throw error;
}

function safeRoot(repositoryRoot) {
  if (typeof repositoryRoot !== "string" || repositoryRoot.length === 0) fail("REPOSITORY_ROOT_REQUIRED");
  let root;
  try {
    root = realpathSync(path.resolve(repositoryRoot));
  } catch {
    fail("REPOSITORY_ROOT_INVALID");
  }
  if (!lstatSync(root).isDirectory()) fail("REPOSITORY_ROOT_INVALID");
  return root;
}

function parseManagedConfig(root, configPath) {
  const configuredPath = configPath ? (path.isAbsolute(configPath) ? configPath : path.join(root, configPath)) : path.join(root, CONFIG_RELATIVE_PATH);
  const file = readSafeTextFile(configuredPath, {
    root,
    label: "managed repository identity config",
    maximumBytes: 16384,
  });
  let config;
  try {
    config = JSON.parse(file.text);
  } catch {
    fail("REPOSITORY_IDENTITY_CONFIG_JSON_INVALID");
  }
  if (!config || typeof config !== "object" || Array.isArray(config)) fail("REPOSITORY_IDENTITY_CONFIG_INVALID");
  if (config.schema_version !== "1.0.0") fail("REPOSITORY_IDENTITY_CONFIG_VERSION_UNSUPPORTED");
  if (config.management_mode !== "managed") fail("REPOSITORY_IDENTITY_CONFIG_NOT_MANAGED");
  if (typeof config.config_id !== "string" || !LOGICAL_ID.test(config.config_id)) fail("REPOSITORY_IDENTITY_CONFIG_ID_INVALID");
  if (typeof config.repository_logical_id !== "string" || !LOGICAL_ID.test(config.repository_logical_id)) fail("REPOSITORY_LOGICAL_ID_INVALID");
  if (!/^[a-f0-9]{64}$/.test(config.attested_origin_digest ?? "")) fail("REPOSITORY_IDENTITY_ORIGIN_ATTESTATION_INVALID");
  const allowed = new Set(["schema_version", "config_id", "management_mode", "repository_logical_id", "attested_origin_digest"]);
  if (Object.keys(config).some((key) => !allowed.has(key))) fail("REPOSITORY_IDENTITY_CONFIG_FIELD_UNSUPPORTED");
  return { config, config_digest: file.digest };
}

function defaultOriginResolver(root) {
  try {
    return execFileSync("git", ["-C", root, "config", "--get", "remote.origin.url"], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
  } catch {
    fail("REPOSITORY_ORIGIN_REQUIRED");
  }
}

function defaultCheckoutAnchorResolver(root) {
  const stat = lstatSync(root);
  return `${stat.dev}:${stat.ino}`;
}

function canonicalOrigin(rawOrigin) {
  if (typeof rawOrigin !== "string" || !rawOrigin.trim() || rawOrigin.includes("\0") || /[\r\n]/.test(rawOrigin)) fail("REPOSITORY_ORIGIN_INVALID");
  const raw = rawOrigin.trim();
  const scp = /^(?:[^@/]+@)?([^:/]+):(.+)$/.exec(raw);
  if (scp && !/^[a-z][a-z0-9+.-]*:\/\//i.test(raw)) {
    const pathname = `/${scp[2]}`.replace(/\/{2,}/g, "/").replace(/\.git\/?$/i, "").replace(/\/$/, "");
    return `remote://${scp[1].toLowerCase()}${pathname}`;
  }
  let url;
  try {
    url = new URL(raw);
  } catch {
    const absolute = path.resolve(raw);
    return `local://${absolute}`;
  }
  if (url.password) fail("REPOSITORY_ORIGIN_CREDENTIAL_FORBIDDEN");
  if (url.protocol === "file:") return `local://${path.resolve(decodeURIComponent(url.pathname))}`;
  if (!url.hostname) fail("REPOSITORY_ORIGIN_INVALID");
  const pathname = url.pathname.replace(/\/{2,}/g, "/").replace(/\.git\/?$/i, "").replace(/\/$/, "");
  return `remote://${url.hostname.toLowerCase()}${url.port ? `:${url.port}` : ""}${pathname}`;
}

export function repositoryOriginDigest(origin) {
  return digest(canonicalOrigin(origin));
}

function validatePersistedIdentity(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) fail("CHECKOUT_IDENTITY_INVALID");
  if (value.schema_version !== "1.0.0" || !LOGICAL_ID.test(value.repository_logical_id ?? "") || !UUID.test(value.checkout_instance_id ?? "") || !/^[a-f0-9]{64}$/.test(value.origin_digest ?? "") || !/^[a-f0-9]{64}$/.test(value.checkout_anchor_digest ?? "") || !/^[a-f0-9]{64}$/.test(value.config_digest ?? "") || Number.isNaN(Date.parse(value.attested_at))) fail("CHECKOUT_IDENTITY_INVALID");
  return value;
}

function writePrivateJson(target, value, { replace = false } = {}) {
  const content = `${JSON.stringify(value, null, 2)}\n`;
  if (!replace) {
    let descriptor;
    try {
      descriptor = openSync(target, fsConstants.O_WRONLY | fsConstants.O_CREAT | fsConstants.O_EXCL, 0o600);
      writeSync(descriptor, content);
      fsyncSync(descriptor);
    } finally {
      if (descriptor !== undefined) closeSync(descriptor);
    }
    return;
  }
  const temporary = `${target}.reattest-${randomUUID()}`;
  let descriptor;
  try {
    descriptor = openSync(temporary, fsConstants.O_WRONLY | fsConstants.O_CREAT | fsConstants.O_EXCL, 0o600);
    writeSync(descriptor, content);
    fsyncSync(descriptor);
  } finally {
    if (descriptor !== undefined) closeSync(descriptor);
  }
  renameSync(temporary, target);
}

export function loadRepositoryIdentity({ repositoryRoot, configPath, checkoutStatePath, originResolver = defaultOriginResolver, checkoutAnchorResolver = defaultCheckoutAnchorResolver, uuidFactory = randomUUID, clock = () => new Date().toISOString(), create = true, reattest = false, reattestGuard } = {}) {
  const root = safeRoot(repositoryRoot);
  const { config, config_digest: configDigest } = parseManagedConfig(root, configPath);
  const originDigest = repositoryOriginDigest(originResolver(root));
  if (originDigest !== config.attested_origin_digest) fail("REPOSITORY_MANAGED_ORIGIN_MISMATCH");
  const checkoutAnchorDigest = digest(checkoutAnchorResolver(root));
  const stateDirectory = path.join(root, ".workflow-state");
  const statePath = checkoutStatePath ? (path.isAbsolute(checkoutStatePath) ? checkoutStatePath : path.join(root, checkoutStatePath)) : path.join(root, STATE_RELATIVE_PATH);
  const relative = path.relative(stateDirectory, path.resolve(statePath));
  if (!relative || relative.startsWith("..") || path.isAbsolute(relative)) fail("CHECKOUT_IDENTITY_PATH_INVALID");
  if (existsSync(stateDirectory) && (lstatSync(stateDirectory).isSymbolicLink() || !lstatSync(stateDirectory).isDirectory())) fail("CHECKOUT_IDENTITY_STATE_DIRECTORY_INVALID");
  if (!existsSync(stateDirectory)) {
    if (!create && !reattest) fail("CHECKOUT_IDENTITY_MISSING");
    mkdirSync(stateDirectory, { recursive: false, mode: 0o700 });
  }
  const stateDirectoryStat = lstatSync(stateDirectory);
  if (stateDirectoryStat.isSymbolicLink() || !stateDirectoryStat.isDirectory() || (stateDirectoryStat.mode & 0o022) !== 0 || realpathSync(stateDirectory) !== stateDirectory) fail("CHECKOUT_IDENTITY_STATE_DIRECTORY_INVALID");

  const loaded = readSafeTextFile(statePath, { root: stateDirectory, label: "persisted checkout identity", maximumBytes: 16384, allowMissing: true });
  let persisted = null;
  if (loaded !== null) {
    try {
      persisted = validatePersistedIdentity(JSON.parse(loaded.text));
    } catch (error) {
      if (error?.code) throw error;
      fail("CHECKOUT_IDENTITY_INVALID");
    }
  }
  const mismatch = persisted && (persisted.repository_logical_id !== config.repository_logical_id || persisted.origin_digest !== originDigest || persisted.checkout_anchor_digest !== checkoutAnchorDigest || persisted.config_digest !== configDigest);
  if (mismatch && !reattest) fail("CHECKOUT_REATTESTATION_REQUIRED");
  if (!persisted && !create) fail("CHECKOUT_IDENTITY_MISSING");
  if (persisted && reattest) {
    if (typeof reattestGuard !== "function") fail("CHECKOUT_REATTESTATION_GUARD_REQUIRED");
    const guardResult = reattestGuard({ repository_root: root, state_path: statePath, persisted_identity: structuredClone(persisted), proposed_identity: { repository_logical_id: config.repository_logical_id, origin_digest: originDigest, checkout_anchor_digest: checkoutAnchorDigest, config_digest: configDigest } });
    if (guardResult && typeof guardResult.then === "function") fail("CHECKOUT_REATTESTATION_ASYNC_GUARD_UNSUPPORTED");
    if (!guardResult || guardResult.allowed !== true || !/^[a-f0-9]{64}$/.test(guardResult.proof_fingerprint ?? "")) fail("CHECKOUT_REATTESTATION_BLOCKED");
  }
  if (!persisted || reattest) {
    const checkoutInstanceId = uuidFactory();
    if (!UUID.test(checkoutInstanceId)) fail("CHECKOUT_UUID_INVALID");
    persisted = {
      schema_version: "1.0.0",
      repository_logical_id: config.repository_logical_id,
      checkout_instance_id: checkoutInstanceId,
      origin_digest: originDigest,
      checkout_anchor_digest: checkoutAnchorDigest,
      config_digest: configDigest,
      attested_at: clock(),
    };
    try {
      writePrivateJson(statePath, persisted, { replace: reattest });
    } catch (error) {
      if (error?.code === "EEXIST" && !reattest) return loadRepositoryIdentity({ repositoryRoot: root, configPath, checkoutStatePath: statePath, originResolver, checkoutAnchorResolver, uuidFactory, clock, create: false });
      throw error;
    }
  }
  return Object.freeze({
    repository_logical_id: persisted.repository_logical_id,
    checkout_instance_id: persisted.checkout_instance_id,
    origin_digest: persisted.origin_digest,
    checkout_anchor_digest: persisted.checkout_anchor_digest,
    config_digest: persisted.config_digest,
    attested_at: persisted.attested_at,
  });
}
