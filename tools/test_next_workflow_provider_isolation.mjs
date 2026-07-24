#!/usr/bin/env node
import assert from "node:assert/strict";
import { closeSync, constants as fsConstants, existsSync, mkdirSync, mkdtempSync, openSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { providerDigest } from "./lib/next_workflow/providers.mjs";
import { runIsolatedProviderProbe } from "./lib/next_workflow/provider_discovery.mjs";
import { resolveProviderRuntimeClosure } from "./lib/next_workflow/provider_runtime_closure.mjs";
import { diagnoseLinuxIsolationPrerequisites } from "./lib/next_workflow/runtime_containment.mjs";

const temporaryRoots = [];
test.after(() => temporaryRoots.forEach((root) => rmSync(root, { recursive: true, force: true })));

function pinnedDescriptor(executable) {
  const fd = openSync(executable, fsConstants.O_RDONLY | (fsConstants.O_NOFOLLOW ?? 0));
  return {
    fd,
    path: executable,
    digest: providerDigest(readFileSync(executable)),
  };
}

test("provider runtime closure pins only the executable and its exact ELF runtime files", () => {
  const descriptor = pinnedDescriptor("/usr/bin/true");
  try {
    const closure = resolveProviderRuntimeClosure(descriptor);
    try {
      assert.match(closure.fingerprint, /^[a-f0-9]{64}$/u);
      assert.equal(closure.files[0].kind, "provider");
      assert.deepEqual(closure.files[0].mount_targets, ["/runtime/provider"]);
      assert.equal(closure.files[0].sha256, descriptor.digest);
      assert.ok(closure.files.length >= 1);
      assert.ok(closure.files.every((file) => /^[a-f0-9]{64}$/u.test(file.sha256)));
      assert.ok(closure.files.every((file) => file.mount_targets.every((target) => target === "/runtime/provider"
        || ["/lib/", "/lib64/", "/usr/lib/", "/usr/lib64/"].some((prefix) => target.startsWith(prefix)))));
      assert.ok(closure.files.every((file) => file.mount_targets.every((target) => !["/", "/home", "/root", "/etc", "/var"].includes(target))));
      assert.equal(new Set(closure.files.map((file) => `${file.device}:${file.inode}:${file.sha256}`)).size, closure.files.length);
    } finally {
      closure.close();
    }
  } finally {
    closeSync(descriptor.fd);
  }
});

test("provider probe command source contains no host-root bind", () => {
  const source = readFileSync(new URL("./lib/next_workflow/provider_discovery.mjs", import.meta.url), "utf8");
  assert.doesNotMatch(source, /"--ro-bind",\s*"\/",\s*"\/"/u);
  assert.match(source, /"--tmpfs",\s*"\/"/u);
  assert.match(source, /"--user",\s*"--map-root-user",\s*"--net",\s*"--mount"/u);
});

test("malicious contained probe cannot read authority, credential, repository, home, etc, or var canaries", (context) => {
  const isolation = diagnoseLinuxIsolationPrerequisites();
  if (!isolation.available) {
    context.skip(`real Linux containment unavailable: ${[...isolation.missing, ...isolation.disabled].join(",")}`);
    return;
  }

  const canaryRoot = mkdtempSync(path.join(process.cwd(), ".next-provider-isolation-canary-"));
  temporaryRoots.push(canaryRoot);
  const categories = [
    "owner-trust",
    "source-key",
    "release-key",
    "provider-auth",
    "unrelated-repository",
  ];
  const canaries = categories.map((category) => {
    const directory = path.join(canaryRoot, category);
    mkdirSync(directory, { recursive: true, mode: 0o700 });
    const canary = path.join(directory, "canary");
    writeFileSync(canary, `${category}-canary\n`, { mode: 0o600 });
    return canary;
  });
  canaries.push(path.join(process.cwd(), "AGENTS.MD"));
  if (existsSync(process.execPath)) canaries.push(process.execPath);
  if (existsSync("/etc/passwd")) canaries.push("/etc/passwd");
  if (existsSync("/var/lib/dpkg/status")) canaries.push("/var/lib/dpkg/status");

  const descriptor = pinnedDescriptor("/usr/bin/dash");
  try {
    const output = runIsolatedProviderProbe(descriptor, [
      "-c",
      'for candidate do if cat "$candidate" >/dev/null 2>&1; then printf "EXPOSED:%s\\n" "$candidate"; exit 97; fi; done; printf "isolated\\n"',
      "provider-isolation-canary",
      ...canaries,
    ], {
      encoding: "utf8",
      maxBuffer: 1024 * 1024,
      timeout: 5000,
    });
    assert.equal(output, "isolated\n");
  } finally {
    closeSync(descriptor.fd);
  }
});
