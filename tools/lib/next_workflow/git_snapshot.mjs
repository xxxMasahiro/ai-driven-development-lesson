import { createHash } from "node:crypto";
import { lstatSync, readFileSync, realpathSync } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const FINGERPRINT = /^[a-f0-9]{64}$/u;
const GIT_OBJECT = /^[a-f0-9]{40,64}$/u;
const MAX_GIT_OUTPUT = 64 * 1024 * 1024;
const MAX_UNTRACKED_BYTES = 16 * 1024 * 1024;
const AUTHORITY_PATHS = Object.freeze([
  "AGENTS.MD",
  "docs/workflow/DEVELOPMENT_INSTRUCTION_POLICY.tsv",
  "docs/workflow/GIT_WORKFLOW_POLICY.tsv",
  "docs/workflow/PRODUCT_WORKFLOW_GIT_USAGE_POLICY.tsv",
  "docs/workflow/REPOSITORY_DOCUMENT_SYNC_POLICY.json",
  "docs/workflow/TEST_PLAN_MANIFEST.tsv",
  "docs/workflow/next-workflow/context-impact.json",
  "learning/GIT_WORKFLOW_SETTINGS.tsv",
  "learning/NEXT_WORKFLOW_DELIVERY_SETTINGS.json",
  "learning/NEXT_WORKFLOW_REPOSITORY_IDENTITY.json",
  "learning/PRODUCT_WORKFLOW_GIT_USAGE_SETTINGS.tsv",
]);

function canonicalJson(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(",")}}`;
  return JSON.stringify(value);
}

function digest(value) {
  return createHash("sha256").update(Buffer.isBuffer(value) ? value : typeof value === "string" ? value : canonicalJson(value)).digest("hex");
}

function safeRelativePath(value) {
  return typeof value === "string"
    && value.length > 0
    && value.length <= 4096
    && !value.includes("\0")
    && !value.includes("\\")
    && !value.startsWith("/")
    && path.posix.normalize(value) === value
    && value !== "."
    && value !== ".."
    && !value.startsWith("../");
}

function git(repositoryRoot, argv, { allowFailure = false, encoding = "utf8" } = {}) {
  const result = spawnSync("git", ["-C", repositoryRoot, ...argv], {
    encoding,
    maxBuffer: MAX_GIT_OUTPUT,
    env: {
      PATH: process.env.PATH,
      GIT_CONFIG_GLOBAL: "/dev/null",
      GIT_CONFIG_NOSYSTEM: "1",
      GIT_OPTIONAL_LOCKS: "0",
      LANG: "C",
      LC_ALL: "C",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  if (result.error) throw new Error(`DELIVERY_GIT_OBSERVATION_FAILED:${result.error.message}`);
  if (result.status !== 0) {
    if (allowFailure) return null;
    throw new Error(`DELIVERY_GIT_OBSERVATION_FAILED:${argv[0]}:${String(result.stderr).trim()}`);
  }
  return encoding === null ? result.stdout : String(result.stdout).trim();
}

function nulValues(buffer) {
  return Buffer.from(buffer).toString("utf8").split("\0").filter(Boolean);
}

function currentDefaultRemoteRef(repositoryRoot) {
  const symbolic = git(repositoryRoot, ["symbolic-ref", "--quiet", "refs/remotes/origin/HEAD"], { allowFailure: true });
  if (symbolic && symbolic.startsWith("refs/remotes/")) return symbolic;
  return git(repositoryRoot, ["show-ref", "--verify", "--quiet", "refs/remotes/origin/main"], { allowFailure: true }) === null
    ? null
    : "refs/remotes/origin/main";
}

function safeTrackedOrUntrackedFile(repositoryRoot, relativePath) {
  if (!safeRelativePath(relativePath)) throw new Error("DELIVERY_GIT_PATH_INVALID");
  const candidate = path.join(repositoryRoot, relativePath);
  const info = lstatSync(candidate);
  if (!info.isFile() || info.isSymbolicLink() || info.size > MAX_UNTRACKED_BYTES) throw new Error("DELIVERY_UNTRACKED_FILE_UNSAFE");
  return digest(readFileSync(candidate));
}

function readAuthorityFingerprints(repositoryRoot) {
  return Object.fromEntries(AUTHORITY_PATHS.map((relativePath) => {
    const candidate = path.join(repositoryRoot, relativePath);
    let body;
    try {
      const info = lstatSync(candidate);
      if (!info.isFile() || info.isSymbolicLink() || info.size > MAX_UNTRACKED_BYTES) throw new Error("unsafe");
      body = readFileSync(candidate);
    } catch {
      throw new Error(`DELIVERY_AUTHORITY_FILE_INVALID:${relativePath}`);
    }
    return [relativePath, digest(body)];
  }));
}

function observationMark(repositoryRoot, baseRevision) {
  const head = git(repositoryRoot, ["rev-parse", "HEAD"]);
  const tree = git(repositoryRoot, ["rev-parse", "HEAD^{tree}"]);
  const branch = git(repositoryRoot, ["symbolic-ref", "--quiet", "HEAD"], { allowFailure: true });
  const status = git(repositoryRoot, ["status", "--porcelain=v2", "-z", "--untracked-files=all"], { encoding: null });
  const diff = git(repositoryRoot, ["diff", "--binary", "--no-ext-diff", "--no-renames", baseRevision], { encoding: null });
  return { head, tree, branch, status_fingerprint: digest(status), diff_fingerprint: digest(diff) };
}

export function observeDeliveryGitSnapshot({
  repositoryRoot,
  authorityRoot: configuredAuthorityRoot = repositoryRoot,
  repositoryLogicalId,
  checkoutInstanceId,
} = {}) {
  if (typeof repositoryRoot !== "string") throw new Error("DELIVERY_REPOSITORY_ROOT_REQUIRED");
  const repository = realpathSync(repositoryRoot);
  const authorityRoot = realpathSync(configuredAuthorityRoot);
  if (git(repository, ["rev-parse", "--show-toplevel"]) !== repository) throw new Error("DELIVERY_REPOSITORY_ROOT_MISMATCH");
  const defaultRemoteRef = currentDefaultRemoteRef(repository);
  const baseRevision = defaultRemoteRef
    ? git(repository, ["merge-base", "HEAD", defaultRemoteRef])
    : git(repository, ["rev-parse", "HEAD"]);
  if (!GIT_OBJECT.test(baseRevision)) throw new Error("DELIVERY_INTEGRATION_BASE_INVALID");
  const start = observationMark(repository, baseRevision);
  const changedPaths = nulValues(git(repository, ["diff", "--name-only", "-z", "--diff-filter=ACDMRTUXB", "--no-renames", baseRevision], { encoding: null }));
  const untrackedPaths = nulValues(git(repository, ["ls-files", "--others", "--exclude-standard", "-z"], { encoding: null }));
  const allPaths = [...new Set([...changedPaths, ...untrackedPaths])].sort();
  if (allPaths.some((entry) => !safeRelativePath(entry))) throw new Error("DELIVERY_GIT_PATH_INVALID");
  const untrackedFingerprints = Object.fromEntries(untrackedPaths.sort().map((relativePath) => [relativePath, safeTrackedOrUntrackedFile(repository, relativePath)]));
  const authorityFingerprints = readAuthorityFingerprints(authorityRoot);
  let identity;
  if (repositoryLogicalId && checkoutInstanceId) {
    identity = {
      repository_logical_id: repositoryLogicalId,
      checkout_instance_id: checkoutInstanceId,
    };
  } else {
    identity = JSON.parse(readFileSync(path.join(repository, "learning/NEXT_WORKFLOW_REPOSITORY_IDENTITY.json"), "utf8"));
  }
  const authorityRemoteRef = currentDefaultRemoteRef(authorityRoot);
  const authorityBase = authorityRemoteRef
    ? git(authorityRoot, ["merge-base", "HEAD", authorityRemoteRef])
    : git(authorityRoot, ["rev-parse", "HEAD"]);
  const baselineManifest = git(authorityRoot, ["show", `${authorityBase}:docs/workflow/TEST_PLAN_MANIFEST.tsv`], { allowFailure: true });
  const currentManifest = readFileSync(path.join(authorityRoot, "docs/workflow/TEST_PLAN_MANIFEST.tsv"), "utf8");
  const end = observationMark(repository, baseRevision);
  if (canonicalJson(start) !== canonicalJson(end)) throw new Error("DELIVERY_GIT_OBSERVATION_DRIFT");
  const core = {
    schema_version: "1.0.0",
    kind: "next-workflow-delivery-git-snapshot",
    repository_logical_id: identity.repository_logical_id,
    checkout_instance_id: identity.checkout_instance_id,
    authority_repository_fingerprint: digest({
      repository_root: authorityRoot === repository ? "target" : "parent",
      head: git(authorityRoot, ["rev-parse", "HEAD"]),
      integration_base: authorityBase,
    }),
    branch_ref: start.branch,
    head: start.head,
    head_tree: start.tree,
    default_remote_ref: defaultRemoteRef,
    integration_base: baseRevision,
    changed_paths: allPaths,
    untracked_paths: [...untrackedPaths].sort(),
    untracked_fingerprints: untrackedFingerprints,
    status_fingerprint: start.status_fingerprint,
    diff_fingerprint: start.diff_fingerprint,
    authority_fingerprints: authorityFingerprints,
    baseline_test_manifest: baselineManifest,
    baseline_test_manifest_fingerprint: baselineManifest === null ? null : digest(baselineManifest),
    current_test_manifest: currentManifest,
    current_test_manifest_fingerprint: digest(currentManifest),
  };
  return { ...core, fingerprint: digest(core) };
}

export function verifyDeliveryGitSnapshot({ snapshot, repositoryRoot, observationOptions = {} } = {}) {
  if (!snapshot || !FINGERPRINT.test(snapshot.fingerprint ?? "")) throw new Error("DELIVERY_GIT_SNAPSHOT_INVALID");
  const current = observeDeliveryGitSnapshot({ repositoryRoot, ...observationOptions });
  const matched = current.fingerprint === snapshot.fingerprint;
  const core = {
    schema_version: "1.0.0",
    decision: matched ? "PASS" : "STOP",
    code: matched ? "DELIVERY_GIT_SNAPSHOT_CURRENT" : "DELIVERY_GIT_SNAPSHOT_DRIFT",
    matched,
    planned_fingerprint: snapshot.fingerprint,
    current_fingerprint: current.fingerprint,
    replacement_snapshot: matched ? null : current,
  };
  return { ...core, fingerprint: digest(core) };
}

export function deliveryGitSnapshotFingerprint(value) {
  return digest(value);
}
