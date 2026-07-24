import { createHash } from "node:crypto";
import {
  lstatSync,
  readFileSync,
  readdirSync,
  realpathSync,
  statSync,
} from "node:fs";
import { userInfo } from "node:os";
import path from "node:path";

const FINGERPRINT = /^[a-f0-9]{64}$/u;
const GIT_OBJECT = /^[a-f0-9]{40,64}$/u;
const ALLOWED_ACTIONS = Object.freeze([
  "identity_reattest",
  "runtime_owner_enroll",
  "runtime_acceptance_create",
  "runtime_bootstrap",
  "runtime_reconcile",
  "release_activate_observed",
]);

function canonicalJson(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

function digest(value) {
  return createHash("sha256").update(Buffer.isBuffer(value) ? value : canonicalJson(value)).digest("hex");
}

function within(root, candidate) {
  const relative = path.relative(root, candidate);
  return relative === "" || (relative !== ".." && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative));
}

function protectedDirectory(candidate, expectedUid) {
  const canonical = realpathSync(candidate);
  const info = statSync(canonical);
  if (!info.isDirectory()
    || (info.mode & 0o077) !== 0
    || (Number.isSafeInteger(expectedUid) && info.uid !== expectedUid)) {
    throw new Error("OWNER_CONTROLLER_DIRECTORY_UNSAFE");
  }
  return canonical;
}

function protectedFile(candidate, root, expectedUid) {
  if (lstatSync(candidate).isSymbolicLink()) throw new Error("OWNER_CONTROLLER_FILE_UNSAFE");
  const canonical = realpathSync(candidate);
  const info = statSync(canonical);
  if (!within(root, canonical)
    || !info.isFile()
    || (info.mode & 0o022) !== 0
    || (Number.isSafeInteger(expectedUid) && info.uid !== expectedUid)) {
    throw new Error("OWNER_CONTROLLER_FILE_UNSAFE");
  }
  return { canonical, info, fingerprint: digest(readFileSync(canonical)) };
}

function snapshotFiles(root) {
  const files = [];
  const visit = (directory) => {
    for (const entry of readdirSync(directory, { withFileTypes: true }).sort((left, right) => left.name.localeCompare(right.name))) {
      const candidate = path.join(directory, entry.name);
      if (entry.isSymbolicLink()) throw new Error("OWNER_CONTROLLER_SNAPSHOT_SYMLINK_FORBIDDEN");
      if (entry.isDirectory()) visit(candidate);
      else if (entry.isFile()) files.push(path.relative(root, candidate).split(path.sep).join("/"));
      else throw new Error("OWNER_CONTROLLER_SNAPSHOT_ENTRY_INVALID");
    }
  };
  visit(path.join(root, "tools"));
  return files;
}

export function defaultOwnerControllerBase() {
  return path.join(userInfo().homedir, ".local", "state", "ai-driven-development-lesson", "next-workflow", "owner-controller");
}

export function createOwnerControllerManifest({
  repositoryRoot,
  snapshotRoot,
  repositoryLogicalId,
  checkoutInstanceId,
  sourceHead,
  sourceTree,
  installedAt = new Date().toISOString(),
  expectedUid = process.getuid?.(),
  controllerBase = defaultOwnerControllerBase(),
} = {}) {
  const repository = realpathSync(repositoryRoot);
  const base = protectedDirectory(controllerBase, expectedUid);
  const snapshot = protectedDirectory(snapshotRoot, expectedUid);
  if (!within(base, snapshot) || within(repository, snapshot)) throw new Error("OWNER_CONTROLLER_SNAPSHOT_LOCATION_INVALID");
  if (typeof repositoryLogicalId !== "string"
    || typeof checkoutInstanceId !== "string"
    || !GIT_OBJECT.test(sourceHead ?? "")
    || !GIT_OBJECT.test(sourceTree ?? "")
    || !Number.isFinite(Date.parse(installedAt))) throw new Error("OWNER_CONTROLLER_MANIFEST_INPUT_INVALID");
  const relativeFiles = snapshotFiles(snapshot);
  if (!relativeFiles.includes("tools/next-workflow.mjs")
    || !relativeFiles.includes("tools/lib/development_instruction.mjs")
    || !relativeFiles.some((entry) => entry.startsWith("tools/lib/next_workflow/"))) {
    throw new Error("OWNER_CONTROLLER_SNAPSHOT_INCOMPLETE");
  }
  const files = relativeFiles.map((relativePath) => {
    const observed = protectedFile(path.join(snapshot, relativePath), snapshot, expectedUid);
    return { path: relativePath, sha256: observed.fingerprint, size: observed.info.size };
  });
  const core = {
    schema_version: "1.0.0",
    purpose: "next-workflow-owner-controller",
    repository_logical_id: repositoryLogicalId,
    checkout_instance_id: checkoutInstanceId,
    repository_root: repository,
    source_head: sourceHead,
    source_tree: sourceTree,
    snapshot_root: snapshot,
    entry_path: path.join(snapshot, "tools", "next-workflow.mjs"),
    installed_at: new Date(Date.parse(installedAt)).toISOString(),
    allowed_actions: [...ALLOWED_ACTIONS],
    files,
  };
  return { ...core, fingerprint: digest(core) };
}

export function verifyOwnerControllerExecution({
  action,
  repositoryRoot,
  sourceRoot,
  entryPath,
  repositoryLogicalId,
  checkoutInstanceId,
  manifestPath = process.env.NEXT_WORKFLOW_OWNER_CONTROLLER_MANIFEST,
  expectedUid = process.getuid?.(),
  controllerBase = defaultOwnerControllerBase(),
} = {}) {
  if (!ALLOWED_ACTIONS.includes(action) || typeof manifestPath !== "string" || !path.isAbsolute(manifestPath)) {
    throw new Error("RELEASE_OWNER_CONTROLLER_REQUIRED");
  }
  const repository = realpathSync(repositoryRoot);
  const base = protectedDirectory(controllerBase, expectedUid);
  const manifestFile = protectedFile(manifestPath, base, expectedUid);
  let manifest;
  try { manifest = JSON.parse(readFileSync(manifestFile.canonical, "utf8")); } catch { throw new Error("OWNER_CONTROLLER_MANIFEST_INVALID"); }
  const { fingerprint, ...core } = manifest ?? {};
  const exactKeys = [
    "allowed_actions",
    "checkout_instance_id",
    "entry_path",
    "files",
    "installed_at",
    "purpose",
    "repository_logical_id",
    "repository_root",
    "schema_version",
    "snapshot_root",
    "source_head",
    "source_tree",
  ];
  if (Object.keys(core).sort().join("\0") !== exactKeys.sort().join("\0")
    || core.schema_version !== "1.0.0"
    || core.purpose !== "next-workflow-owner-controller"
    || fingerprint !== digest(core)
    || !FINGERPRINT.test(fingerprint ?? "")
    || core.repository_root !== repository
    || core.repository_logical_id !== repositoryLogicalId
    || core.checkout_instance_id !== checkoutInstanceId
    || !GIT_OBJECT.test(core.source_head ?? "")
    || !GIT_OBJECT.test(core.source_tree ?? "")
    || !Number.isFinite(Date.parse(core.installed_at))
    || canonicalJson(core.allowed_actions) !== canonicalJson(ALLOWED_ACTIONS)
    || !core.allowed_actions.includes(action)) {
    throw new Error("OWNER_CONTROLLER_MANIFEST_INVALID");
  }
  const snapshot = protectedDirectory(core.snapshot_root, expectedUid);
  const source = realpathSync(sourceRoot);
  const entry = realpathSync(entryPath);
  if (!within(base, snapshot)
    || source !== snapshot
    || within(repository, source)
    || entry !== path.join(snapshot, "tools", "next-workflow.mjs")
    || core.entry_path !== entry
    || path.dirname(manifestFile.canonical) !== snapshot) {
    throw new Error("RELEASE_OWNER_CONTROLLER_REQUIRED");
  }
  const currentFiles = snapshotFiles(snapshot);
  if (!Array.isArray(core.files)
    || core.files.length !== currentFiles.length
    || core.files.some((file, index) => file?.path !== currentFiles[index]
      || !FINGERPRINT.test(file?.sha256 ?? "")
      || !Number.isSafeInteger(file?.size)
      || file.size < 0)) {
    throw new Error("OWNER_CONTROLLER_SNAPSHOT_MANIFEST_INVALID");
  }
  for (const file of core.files) {
    const observed = protectedFile(path.join(snapshot, file.path), snapshot, expectedUid);
    if (observed.fingerprint !== file.sha256 || observed.info.size !== file.size) throw new Error("OWNER_CONTROLLER_SNAPSHOT_DRIFT");
  }
  return Object.freeze({
    verified: true,
    action,
    manifest_fingerprint: fingerprint,
    source_head: core.source_head,
    source_tree: core.source_tree,
    snapshot_root: snapshot,
  });
}

export function ownerControllerDigest(value) {
  return digest(value);
}
