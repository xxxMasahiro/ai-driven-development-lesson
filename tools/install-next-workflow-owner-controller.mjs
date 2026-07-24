#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import {
  chmodSync,
  cpSync,
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  realpathSync,
  renameSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  createOwnerControllerManifest,
  defaultOwnerControllerBase,
  ownerControllerDigest,
} from "./lib/next_workflow/owner_controller.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);

function option(name) {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
}

function git(argv) {
  return execFileSync("/usr/bin/git", [
    "--no-replace-objects",
    "--no-optional-locks",
    "-c", "core.hooksPath=/dev/null",
    "-C", ROOT,
    ...argv,
  ], {
    encoding: "utf8",
    env: {
      PATH: "/usr/bin:/bin",
      LANG: "C.UTF-8",
      LC_ALL: "C.UTF-8",
      GIT_CONFIG_NOSYSTEM: "1",
      GIT_CONFIG_GLOBAL: "/dev/null",
      GIT_OPTIONAL_LOCKS: "0",
      GIT_TERMINAL_PROMPT: "0",
      GIT_NO_REPLACE_OBJECTS: "1",
    },
  }).trim();
}

function protectTree(root) {
  cpSync(path.join(ROOT, "tools", "next-workflow.mjs"), path.join(root, "tools", "next-workflow.mjs"));
  cpSync(path.join(ROOT, "tools", "lib", "development_instruction.mjs"), path.join(root, "tools", "lib", "development_instruction.mjs"));
  cpSync(path.join(ROOT, "tools", "lib", "next_workflow"), path.join(root, "tools", "lib", "next_workflow"), { recursive: true, dereference: false });
  const visit = (directory) => {
    chmodSync(directory, 0o700);
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const candidate = path.join(directory, entry.name);
      if (entry.isSymbolicLink() || lstatSync(candidate).isSymbolicLink()) throw new Error("OWNER_CONTROLLER_INSTALL_SYMLINK_FORBIDDEN");
      if (entry.isDirectory()) visit(candidate);
      else if (entry.isFile()) chmodSync(candidate, 0o400);
      else throw new Error("OWNER_CONTROLLER_INSTALL_ENTRY_INVALID");
    }
  };
  // cpSync preserves no authority; normalize every copied object explicitly.
  visit(root);
}

if (!args.includes("--confirm")) throw new Error("OWNER_CONTROLLER_INSTALL_CONFIRMATION_REQUIRED");
if (git(["status", "--porcelain=v1", "--untracked-files=all"]) !== "") throw new Error("OWNER_CONTROLLER_INSTALL_REQUIRES_CLEAN_WORKTREE");
if (git(["symbolic-ref", "--quiet", "--short", "HEAD"]) !== "main") throw new Error("OWNER_CONTROLLER_INSTALL_REQUIRES_MAIN");
const head = git(["rev-parse", "HEAD"]);
const remoteHead = git(["rev-parse", "refs/remotes/origin/main"]);
if (head !== remoteHead) throw new Error("OWNER_CONTROLLER_INSTALL_REQUIRES_SYNCHRONIZED_MAIN");
const tree = git(["rev-parse", "HEAD^{tree}"]);
const identity = JSON.parse(readFileSync(path.join(ROOT, "learning", "NEXT_WORKFLOW_REPOSITORY_IDENTITY.json"), "utf8"));
const base = path.resolve(option("--base") ?? defaultOwnerControllerBase());
mkdirSync(base, { recursive: true, mode: 0o700 });
chmodSync(base, 0o700);
const versionId = ownerControllerDigest({ head, tree }).slice(0, 24);
const target = path.join(base, versionId);
if (existsSync(target)) throw new Error("OWNER_CONTROLLER_VERSION_ALREADY_INSTALLED");
const stagingParent = mkdtempSync(path.join(base, ".install-"));
const staging = path.join(stagingParent, versionId);
mkdirSync(path.join(staging, "tools", "lib"), { recursive: true, mode: 0o700 });
try {
  protectTree(staging);
  renameSync(staging, target);
  const manifest = createOwnerControllerManifest({
    repositoryRoot: ROOT,
    snapshotRoot: target,
    repositoryLogicalId: identity.repository_logical_id,
    checkoutInstanceId: identity.checkout_instance_id,
    sourceHead: head,
    sourceTree: tree,
    controllerBase: base,
  });
  writeFileSync(path.join(target, "controller-manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`, { mode: 0o400 });
  const wrapper = `#!/bin/sh
set -eu
export NEXT_WORKFLOW_OWNER_CONTROLLER_MANIFEST='${path.join(target, "controller-manifest.json")}'
export NEXT_WORKFLOW_VERIFIED_REPOSITORY_ROOT='${realpathSync(ROOT)}'
exec '${process.execPath}' '${path.join(target, "tools", "next-workflow.mjs")}' "$@"
`;
  writeFileSync(path.join(target, "next-workflow-owner-controller"), wrapper, { mode: 0o500 });
  rmSync(stagingParent, { recursive: true, force: true });
  process.stdout.write(`${JSON.stringify({
    status: "installed",
    controller_path: path.join(target, "next-workflow-owner-controller"),
    manifest_path: path.join(target, "controller-manifest.json"),
    source_head: head,
    source_tree: tree,
    manifest_fingerprint: manifest.fingerprint,
  }, null, 2)}\n`);
} catch (error) {
  rmSync(stagingParent, { recursive: true, force: true });
  rmSync(target, { recursive: true, force: true });
  throw error;
}
