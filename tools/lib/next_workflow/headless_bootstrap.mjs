import { createHash, createPrivateKey, createPublicKey, generateKeyPairSync, randomUUID, sign, verify } from "node:crypto";
import {
  chmodSync,
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  realpathSync,
  renameSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { userInfo } from "node:os";
import path from "node:path";
import { resolveBuiltinCodexExecutable } from "./provider_discovery.mjs";
import { defaultOwnerAnchorPath, defaultOwnerTrustPath, loadProtectedOwnerAnchor, loadProtectedRuntimeTrust } from "./runtime_trust.mjs";

export const HEADLESS_RUNTIME_AUTHORITIES = Object.freeze({
  launchObservation: "headless-launch-observer",
  providerProbe: "headless-provider-probe",
  providerCertification: "headless-provider-certifier",
  containment: "headless-provider-containment",
  receipt: "headless-receipt",
  approval: "headless-approval",
  finalization: "headless-finalization",
  agentObservation: "headless-agent-observation",
  agentAuthority: "headless-agent-authority",
  runtimeRecovery: "headless-runtime-recovery",
});

function canonicalJson(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(",")}}`;
  return JSON.stringify(value);
}

function digest(value) {
  const bytes = Buffer.isBuffer(value) ? value : Buffer.from(typeof value === "string" ? value : canonicalJson(value));
  return createHash("sha256").update(bytes).digest("hex");
}

function executableDescriptor(candidate, code) {
  const canonical = realpathSync(candidate);
  const info = lstatSync(canonical);
  if (!info.isFile() || info.isSymbolicLink() || (info.mode & 0o111) === 0 || (info.mode & 0o022) !== 0) throw new Error(code);
  return { path: canonical, fingerprint: digest(readFileSync(canonical)) };
}

function privateFileDescriptor(candidate, code) {
  const canonical = realpathSync(candidate);
  const info = lstatSync(canonical);
  if (!info.isFile() || info.isSymbolicLink() || (info.mode & 0o077) !== 0 || (typeof process.getuid === "function" && info.uid !== process.getuid())) throw new Error(code);
  return { path: canonical, fingerprint: digest(readFileSync(canonical)) };
}

function protectedFileDescriptor(candidate, code) {
  const canonical = realpathSync(candidate);
  const info = lstatSync(canonical);
  if (!info.isFile() || info.isSymbolicLink() || (info.mode & 0o022) !== 0) throw new Error(code);
  return { path: canonical, fingerprint: digest(readFileSync(canonical)) };
}

function validatePrivateDirectory(candidate) {
  const canonical = realpathSync(candidate);
  const info = lstatSync(canonical);
  if (!info.isDirectory() || info.isSymbolicLink() || (info.mode & 0o077) !== 0 || (typeof process.getuid === "function" && info.uid !== process.getuid())) throw new Error("HEADLESS_BOOTSTRAP_DIRECTORY_NOT_PRIVATE");
  return canonical;
}

function atomicPrivateWrite(target, bytes) {
  if (existsSync(target)) throw new Error(`HEADLESS_BOOTSTRAP_TARGET_EXISTS:${path.basename(target)}`);
  const temporary = `${target}.tmp-${randomUUID()}`;
  try {
    writeFileSync(temporary, bytes, { mode: 0o600, flag: "wx" });
    chmodSync(temporary, 0o600);
    renameSync(temporary, target);
  } catch (error) {
    try { if (existsSync(temporary)) unlinkSync(temporary); } catch {}
    throw error;
  }
}

function atomicExecutableWrite(target, bytes) {
  if (existsSync(target)) throw new Error(`HEADLESS_BOOTSTRAP_TARGET_EXISTS:${path.basename(target)}`);
  const temporary = `${target}.tmp-${randomUUID()}`;
  try {
    writeFileSync(temporary, bytes, { mode: 0o500, flag: "wx" });
    chmodSync(temporary, 0o500);
    renameSync(temporary, target);
  } catch (error) {
    try { if (existsSync(temporary)) unlinkSync(temporary); } catch {}
    throw error;
  }
}

function atomicReadOnlyWrite(target, bytes) {
  if (existsSync(target)) throw new Error(`HEADLESS_BOOTSTRAP_TARGET_EXISTS:${path.basename(target)}`);
  const temporary = `${target}.tmp-${randomUUID()}`;
  try {
    writeFileSync(temporary, bytes, { mode: 0o400, flag: "wx" });
    chmodSync(temporary, 0o400);
    renameSync(temporary, target);
  } catch (error) {
    try { if (existsSync(temporary)) unlinkSync(temporary); } catch {}
    throw error;
  }
}

function shellQuote(value) {
  return `'${String(value).replaceAll("'", "'\"'\"'")}'`;
}

function runtimeLauncherWrapper({ wrapperInterpreter, interpreter, script, trustPath, home, username }) {
  const sanitizedLaunch = digest({
    script_fingerprint: script.fingerprint,
    interpreter_fingerprint: interpreter.fingerprint,
  });
  return Buffer.from([
    `#!${wrapperInterpreter.path}`,
    `/usr/bin/env -i HOME=${shellQuote(home)} USER=${shellQuote(username)} LOGNAME=${shellQuote(username)} PATH=${shellQuote(`${path.dirname(interpreter.path)}:/usr/bin:/bin`)} LANG='C.UTF-8' LC_ALL='C.UTF-8' NEXT_WORKFLOW_OWNER_TRUST_PATH=${shellQuote(trustPath)} NEXT_WORKFLOW_SANITIZED_LAUNCH=${shellQuote(sanitizedLaunch)} ${shellQuote(interpreter.path)} ${shellQuote(script.path)} "$@"`,
    "status=$?",
    "exit \"$status\"",
    "",
  ].join("\n"));
}

function outsideRepository(repositoryRoot, candidate) {
  const relative = path.relative(realpathSync(repositoryRoot), candidate);
  return relative === ".." || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative);
}

function ownerAcceptanceBody({ repositoryIdentity, releasePrerequisites, providerExecutable, publicKeyPem, keyId, ownerAnchorFingerprint, issuedAt, expiresAt }) {
  return {
    schema_version: "1.0.0",
    purpose: "next-workflow-owner-acceptance",
    decision: "accepted",
    repository_logical_id: repositoryIdentity.repository_logical_id,
    checkout_instance_id: repositoryIdentity.checkout_instance_id,
    release_prerequisites_fingerprint: digest(releasePrerequisites),
    provider_executable: structuredClone(providerExecutable),
    owner_key_id: keyId,
    owner_public_key_pem: publicKeyPem,
    owner_anchor_fingerprint: ownerAnchorFingerprint,
    issued_at: issuedAt,
    expires_at: expiresAt,
  };
}

export function createHeadlessOwnerIdentity({
  repositoryRoot,
  anchorPath = defaultOwnerAnchorPath(),
  privateKeyPath = path.join(path.dirname(anchorPath), "owner-acceptance-key.pem"),
  now = new Date().toISOString(),
} = {}) {
  if (typeof repositoryRoot !== "string"
    || typeof anchorPath !== "string"
    || typeof privateKeyPath !== "string"
    || !path.isAbsolute(anchorPath)
    || !path.isAbsolute(privateKeyPath)
    || !outsideRepository(repositoryRoot, path.resolve(anchorPath))
    || !outsideRepository(repositoryRoot, path.resolve(privateKeyPath))
    || path.dirname(path.resolve(anchorPath)) !== path.dirname(path.resolve(privateKeyPath))
    || !Number.isFinite(Date.parse(now))) throw new Error("OWNER_IDENTITY_INPUT_INVALID");
  const directory = path.dirname(path.resolve(anchorPath));
  mkdirSync(directory, { recursive: true, mode: 0o700 });
  chmodSync(directory, 0o700);
  validatePrivateDirectory(directory);
  if (existsSync(anchorPath) || existsSync(privateKeyPath)) throw new Error("OWNER_IDENTITY_ALREADY_EXISTS");
  const { privateKey, publicKey } = generateKeyPairSync("ed25519");
  const publicKeyPem = publicKey.export({ type: "spki", format: "pem" });
  const keyId = `headless-owner-${digest(publicKeyPem).slice(0, 24)}`;
  const body = {
    schema_version: "1.0.0",
    purpose: "next-workflow-owner-anchor",
    revision: 1,
    owner_key_id: keyId,
    owner_public_key_pem: publicKeyPem,
    created_at: new Date(Date.parse(now)).toISOString(),
  };
  const anchor = { ...body, fingerprint: digest(body) };
  atomicPrivateWrite(privateKeyPath, privateKey.export({ type: "pkcs8", format: "pem" }));
  try {
    atomicPrivateWrite(anchorPath, `${JSON.stringify(anchor, null, 2)}\n`);
  } catch (error) {
    try { unlinkSync(privateKeyPath); } catch {}
    throw error;
  }
  return {
    status: "created",
    anchor_path: realpathSync(anchorPath),
    private_key_path: realpathSync(privateKeyPath),
    owner_key_id: keyId,
    anchor_fingerprint: anchor.fingerprint,
  };
}

export function createHeadlessOwnerAcceptance({
  repositoryRoot,
  repositoryIdentity,
  releasePrerequisites,
  acceptancePath,
  privateKeyPath,
  ownerAnchorPath = defaultOwnerAnchorPath(),
  now = new Date().toISOString(),
  validityDays = 365,
} = {}) {
  if (typeof repositoryRoot !== "string" || typeof acceptancePath !== "string" || typeof privateKeyPath !== "string" || typeof ownerAnchorPath !== "string" || !path.isAbsolute(acceptancePath) || !path.isAbsolute(privateKeyPath) || !path.isAbsolute(ownerAnchorPath) || !outsideRepository(repositoryRoot, path.resolve(acceptancePath)) || !outsideRepository(repositoryRoot, path.resolve(privateKeyPath)) || !outsideRepository(repositoryRoot, path.resolve(ownerAnchorPath)) || !releasePrerequisites || !Number.isSafeInteger(validityDays) || validityDays < 1 || validityDays > 3660 || !Number.isFinite(Date.parse(now))) throw new Error("OWNER_ACCEPTANCE_INPUT_INVALID");
  const directory = path.dirname(path.resolve(acceptancePath));
  if (directory !== path.dirname(path.resolve(privateKeyPath))) throw new Error("OWNER_ACCEPTANCE_DIRECTORY_MISMATCH");
  mkdirSync(directory, { recursive: true, mode: 0o700 });
  chmodSync(directory, 0o700);
  validatePrivateDirectory(directory);
  if (existsSync(acceptancePath)) throw new Error("OWNER_ACCEPTANCE_RECEIPT_EXISTS");
  if (!existsSync(privateKeyPath) || !existsSync(ownerAnchorPath)) throw new Error("OWNER_IDENTITY_ENROLLMENT_REQUIRED");
  privateFileDescriptor(privateKeyPath, "OWNER_ACCEPTANCE_PRIVATE_KEY_UNSAFE");
  const privateKey = createPrivateKey(readFileSync(privateKeyPath));
  const publicKey = createPublicKey(privateKey);
  if (privateKey.asymmetricKeyType !== "ed25519") throw new Error("OWNER_ACCEPTANCE_PRIVATE_KEY_INVALID");
  const publicKeyPem = publicKey.export({ type: "spki", format: "pem" });
  const keyId = `headless-owner-${digest(publicKeyPem).slice(0, 24)}`;
  const ownerAnchor = loadProtectedOwnerAnchor({ repositoryRoot, anchorPath: ownerAnchorPath });
  if (ownerAnchor.owner_key_id !== keyId || ownerAnchor.owner_public_key_pem !== publicKeyPem) throw new Error("OWNER_ACCEPTANCE_ANCHOR_KEY_MISMATCH");
  const providerExecutable = resolveBuiltinCodexExecutable();
  const issuedAt = new Date(Date.parse(now)).toISOString();
  const expiresAt = new Date(Date.parse(now) + validityDays * 24 * 60 * 60 * 1000).toISOString();
  const body = ownerAcceptanceBody({ repositoryIdentity, releasePrerequisites, providerExecutable, publicKeyPem, keyId, ownerAnchorFingerprint: ownerAnchor.fingerprint, issuedAt, expiresAt });
  const receipt = { ...body, fingerprint: digest(body), signature: sign(null, Buffer.from(canonicalJson(body)), privateKey).toString("base64url") };
  atomicPrivateWrite(acceptancePath, `${JSON.stringify(receipt, null, 2)}\n`);
  return { status: "created", acceptance_path: realpathSync(acceptancePath), private_key_path: realpathSync(privateKeyPath), owner_key_id: keyId, fingerprint: receipt.fingerprint, expires_at: expiresAt };
}

export function verifyHeadlessOwnerAcceptance({
  repositoryRoot,
  repositoryIdentity,
  releasePrerequisites,
  acceptancePath,
  ownerAnchorPath = defaultOwnerAnchorPath(),
  providerExecutable = resolveBuiltinCodexExecutable(),
  now = new Date().toISOString(),
} = {}) {
  if (typeof repositoryRoot !== "string" || typeof acceptancePath !== "string" || !path.isAbsolute(acceptancePath) || !outsideRepository(repositoryRoot, path.resolve(acceptancePath))) throw new Error("OWNER_ACCEPTANCE_PATH_INVALID");
  const descriptor = privateFileDescriptor(acceptancePath, "OWNER_ACCEPTANCE_RECEIPT_UNSAFE");
  const ownerAnchor = loadProtectedOwnerAnchor({ repositoryRoot, anchorPath: ownerAnchorPath });
  let receipt;
  try { receipt = JSON.parse(readFileSync(descriptor.path, "utf8")); } catch { throw new Error("OWNER_ACCEPTANCE_RECEIPT_INVALID"); }
  const { fingerprint, signature, ...body } = receipt ?? {};
  if (Object.keys(body).sort().join("\0") !== Object.keys(ownerAcceptanceBody({ repositoryIdentity, releasePrerequisites, providerExecutable: {}, publicKeyPem: "", keyId: "", ownerAnchorFingerprint: "", issuedAt: "", expiresAt: "" })).sort().join("\0") || body.schema_version !== "1.0.0" || body.purpose !== "next-workflow-owner-acceptance" || body.decision !== "accepted" || body.repository_logical_id !== repositoryIdentity?.repository_logical_id || body.checkout_instance_id !== repositoryIdentity?.checkout_instance_id || body.release_prerequisites_fingerprint !== digest(releasePrerequisites) || body.provider_executable?.path !== providerExecutable.path || body.provider_executable?.fingerprint !== providerExecutable.fingerprint || body.owner_anchor_fingerprint !== ownerAnchor.fingerprint || body.owner_key_id !== ownerAnchor.owner_key_id || body.owner_public_key_pem !== ownerAnchor.owner_public_key_pem || !Number.isFinite(Date.parse(body.issued_at)) || !Number.isFinite(Date.parse(body.expires_at)) || Date.parse(body.issued_at) > Date.parse(now) || Date.parse(body.expires_at) <= Date.parse(now) || fingerprint !== digest(body) || typeof signature !== "string") throw new Error("OWNER_ACCEPTANCE_RECEIPT_INVALID");
  let publicKey;
  try { publicKey = createPublicKey(body.owner_public_key_pem); } catch { throw new Error("OWNER_ACCEPTANCE_PUBLIC_KEY_INVALID"); }
  if (publicKey.asymmetricKeyType !== "ed25519" || body.owner_key_id !== `headless-owner-${digest(body.owner_public_key_pem).slice(0, 24)}` || verify(null, Buffer.from(canonicalJson(body)), publicKey, Buffer.from(signature, "base64url")) !== true) throw new Error("OWNER_ACCEPTANCE_SIGNATURE_INVALID");
  return structuredClone(receipt);
}

export function defaultHeadlessRuntimeStateRoot() {
  return path.join(userInfo().homedir, ".local", "state", "ai-driven-development-lesson", "next-workflow");
}

export function bootstrapHeadlessRuntimeTrust({
  repositoryRoot,
  repositoryIdentity,
  releasePrerequisites,
  ownerAcceptancePath,
  ownerAnchorPath = defaultOwnerAnchorPath(),
  trustPath = defaultOwnerTrustPath(),
  providerAuthPath = path.join(userInfo().homedir, ".codex", "auth.json"),
  runtimeStateRoot = defaultHeadlessRuntimeStateRoot(),
  now = new Date().toISOString(),
  validityDays = 365,
} = {}) {
  const identityFields = ["repository_logical_id", "checkout_instance_id", "origin_digest", "checkout_anchor_digest", "config_digest", "attested_at"];
  if (typeof repositoryRoot !== "string"
    || identityFields.some((field) => typeof repositoryIdentity?.[field] !== "string" || repositoryIdentity[field].length === 0)
    || ["origin_digest", "checkout_anchor_digest", "config_digest"].some((field) => !/^[a-f0-9]{64}$/u.test(repositoryIdentity[field]))
    || !Number.isFinite(Date.parse(repositoryIdentity.attested_at))
    || !releasePrerequisites
    || typeof ownerAcceptancePath !== "string"
    || !Number.isSafeInteger(validityDays)
    || validityDays < 1
    || validityDays > 3660
    || !Number.isFinite(Date.parse(now))) throw new Error("HEADLESS_BOOTSTRAP_INPUT_INVALID");
  const repository = realpathSync(repositoryRoot);
  const ownerAnchor = loadProtectedOwnerAnchor({ repositoryRoot: repository, anchorPath: ownerAnchorPath });
  const codexExecutable = resolveBuiltinCodexExecutable();
  const ownerAcceptance = verifyHeadlessOwnerAcceptance({ repositoryRoot: repository, repositoryIdentity, releasePrerequisites, acceptancePath: ownerAcceptancePath, ownerAnchorPath, providerExecutable: codexExecutable, now });
  const trustTarget = path.resolve(trustPath);
  const trustDirectory = path.dirname(trustTarget);
  mkdirSync(trustDirectory, { recursive: true, mode: 0o700 });
  chmodSync(trustDirectory, 0o700);
  validatePrivateDirectory(trustDirectory);
  mkdirSync(runtimeStateRoot, { recursive: true, mode: 0o700 });
  chmodSync(runtimeStateRoot, 0o700);
  const stateRoot = validatePrivateDirectory(runtimeStateRoot);
  if (existsSync(trustTarget)) {
    const existing = loadProtectedRuntimeTrust({
      repositoryRoot: repository,
      repositoryLogicalId: repositoryIdentity.repository_logical_id,
      checkoutInstanceId: repositoryIdentity.checkout_instance_id,
      trustPath: trustTarget,
      now,
    });
    return {
      status: "already_initialized",
      trust_path: existing.source_path,
      trust_fingerprint: existing.fingerprint,
      runtime_state_root: stateRoot,
      release_private_key_path: path.join(trustDirectory, "release-signing-key.pem"),
      release_source_private_key_path: path.join(trustDirectory, "release-source-signing-key.pem"),
      runtime_launcher_path: existing.runtime_launcher.path,
    };
  }

  const providerAuth = privateFileDescriptor(providerAuthPath, "HEADLESS_PROVIDER_AUTH_NOT_PRIVATE");
  const unshare = executableDescriptor("/usr/bin/unshare", "HEADLESS_UNSHARE_EXECUTABLE_INVALID");
  const bubblewrap = executableDescriptor("/usr/bin/bwrap", "HEADLESS_BUBBLEWRAP_EXECUTABLE_INVALID");
  const barrierInterpreter = executableDescriptor(process.execPath, "HEADLESS_BARRIER_INTERPRETER_INVALID");
  const barrierScript = protectedFileDescriptor(path.join(repository, "tools", "lib", "next_workflow", "runtime_barrier.cjs"), "HEADLESS_BARRIER_SCRIPT_INVALID");
  const launcherSource = protectedFileDescriptor(path.join(repository, "tools", "next-workflow-launcher.cjs"), "HEADLESS_RUNTIME_LAUNCHER_SOURCE_INVALID");
  const launcherScriptTarget = path.join(stateRoot, "next-workflow-launcher.cjs");
  const launcherTarget = path.join(stateRoot, "next-workflow-launcher");
  const wrapperInterpreter = executableDescriptor("/bin/sh", "HEADLESS_RUNTIME_WRAPPER_INTERPRETER_INVALID");
  const launcherInterpreter = executableDescriptor(process.execPath, "HEADLESS_RUNTIME_LAUNCHER_INTERPRETER_INVALID");
  const installedLauncherScript = {
    path: launcherScriptTarget,
    fingerprint: launcherSource.fingerprint,
  };
  const launcherWrapper = runtimeLauncherWrapper({
    wrapperInterpreter,
    interpreter: launcherInterpreter,
    script: installedLauncherScript,
    trustPath: trustTarget,
    home: userInfo().homedir,
    username: userInfo().username,
  });
  const expiresAt = new Date(Date.parse(now) + validityDays * 24 * 60 * 60 * 1000).toISOString();
  const { publicKey, privateKey } = generateKeyPairSync("ed25519");
  const { publicKey: sourcePublicKey, privateKey: sourcePrivateKey } = generateKeyPairSync("ed25519");
  const releasePrivateKeyPath = path.join(trustDirectory, "release-signing-key.pem");
  const releaseSourcePrivateKeyPath = path.join(trustDirectory, "release-source-signing-key.pem");
  const releasePublicKey = publicKey.export({ type: "spki", format: "pem" });
  const releasePrivateKey = privateKey.export({ type: "pkcs8", format: "pem" });
  const keyId = `headless-release-${digest(releasePublicKey).slice(0, 24)}`;
  const sourcePublicKeyPem = sourcePublicKey.export({ type: "spki", format: "pem" });
  const sourcePrivateKeyPem = sourcePrivateKey.export({ type: "pkcs8", format: "pem" });
  const sourceKeyId = `headless-release-source-${digest(sourcePublicKeyPem).slice(0, 24)}`;
  const releaseTrust = {
    schema_version: "1.0.0",
    trust_id: "next-workflow-headless-release-verifiers",
    revision: 1,
    activation_mode: "headless",
    verifiers: [{
      verifier: "headless-release-verifier",
      key_id: keyId,
      public_key_pem: releasePublicKey,
      allowed_kinds: ["*"],
      revocation_state: "active",
      expires_at: expiresAt,
    }],
    source_verifiers: [{
      verifier: "headless-release-source-verifier",
      key_id: sourceKeyId,
      public_key_pem: sourcePublicKeyPem,
      allowed_kinds: ["local_release", "pr_ci", "main_ci", "local_remote_sync", "recovery", "fenced_rollback", "archive_decommission", "outbox_disposition", "transition:shadow", "transition:release_verified", "transition:recovery_verified", "transition:rollback_verified", "transition:archive_decommission_verified", "transition:ready"],
      revocation_state: "active",
      expires_at: expiresAt,
    }],
  };
  const runtimeAuthorities = {
    [HEADLESS_RUNTIME_AUTHORITIES.launchObservation]: {
      authority_id: HEADLESS_RUNTIME_AUTHORITIES.launchObservation,
      kind: "launch_observation",
      enabled: true,
      revision: 1,
      source: "pinned_process_and_certified_provider_metadata",
      allowed_executable_fingerprints: [codexExecutable.fingerprint],
      allowed_executable_paths: [codexExecutable.path],
      allowed_adapter_ids: ["codex_cli"],
    },
    [HEADLESS_RUNTIME_AUTHORITIES.providerProbe]: {
      authority_id: HEADLESS_RUNTIME_AUTHORITIES.providerProbe,
      kind: "provider_probe",
      enabled: true,
      revision: 1,
      source: "owner_protected_provider_probe",
      allowed_adapter_ids: ["codex_cli"],
      allowed_executable_fingerprints: [codexExecutable.fingerprint],
      allowed_executable_paths: [codexExecutable.path],
    },
    [HEADLESS_RUNTIME_AUTHORITIES.providerCertification]: {
      authority_id: HEADLESS_RUNTIME_AUTHORITIES.providerCertification,
      kind: "provider_certification",
      enabled: true,
      revision: 1,
      source: "owner_protected_provider_certification",
      probe_authority_id: HEADLESS_RUNTIME_AUTHORITIES.providerProbe,
      allowed_adapter_ids: ["codex_cli"],
    },
    [HEADLESS_RUNTIME_AUTHORITIES.containment]: {
      authority_id: HEADLESS_RUNTIME_AUTHORITIES.containment,
      kind: "linux_isolation",
      enabled: true,
      revision: 1,
      profile_id: "linux-user-mount-provider-net-v1",
      unshare,
      bubblewrap,
      barrier_interpreter: barrierInterpreter,
      barrier_script: barrierScript,
      provider_auth_file: providerAuth,
    },
    [HEADLESS_RUNTIME_AUTHORITIES.receipt]: {
      authority_id: HEADLESS_RUNTIME_AUTHORITIES.receipt,
      kind: "receipt_proof",
      enabled: true,
      revision: 1,
      source: "owner_protected_deterministic_binding",
      owner_id: "headless-runtime-adapter-owner",
    },
    [HEADLESS_RUNTIME_AUTHORITIES.approval]: {
      authority_id: HEADLESS_RUNTIME_AUTHORITIES.approval,
      kind: "approval_issuer",
      enabled: true,
      revision: 1,
      source: "owner_protected_approval_binding",
    },
    [HEADLESS_RUNTIME_AUTHORITIES.finalization]: {
      authority_id: HEADLESS_RUNTIME_AUTHORITIES.finalization,
      kind: "finalization_fence",
      enabled: true,
      revision: 1,
      source: "owner_protected_live_fence",
    },
    [HEADLESS_RUNTIME_AUTHORITIES.agentObservation]: {
      authority_id: HEADLESS_RUNTIME_AUTHORITIES.agentObservation,
      kind: "agent_observation",
      enabled: true,
      revision: 1,
      source: "owner_protected_agent_observation",
      evidence_strength: "pinned_process_and_containment",
    },
    [HEADLESS_RUNTIME_AUTHORITIES.agentAuthority]: {
      authority_id: HEADLESS_RUNTIME_AUTHORITIES.agentAuthority,
      kind: "agent_authority",
      enabled: true,
      revision: 1,
      source: "owner_protected_agent_authority",
      allowed_record_kinds: [
        "DelegationGrant",
        "ResourceCostReservation",
        "AgentReviewerAssignment",
        "AgentLeadReview",
        "AgentOrchestratorReview",
        "AgentValidatorDisposition",
        "ValidatorDecision",
      ],
    },
    [HEADLESS_RUNTIME_AUTHORITIES.runtimeRecovery]: {
      authority_id: HEADLESS_RUNTIME_AUTHORITIES.runtimeRecovery,
      kind: "runtime_recovery",
      enabled: true,
      revision: 1,
      source: "owner_protected_runtime_recovery",
      allowed_actions: ["fence_and_terminate", "fail_closed", "record_manual_recovery"],
    },
  };
  const trustDocument = {
    schema_version: "1.0.0",
    trust_source_id: "headless-runtime-owner-trust",
    revision: 1,
    repository_logical_id: repositoryIdentity.repository_logical_id,
    checkout_instance_id: repositoryIdentity.checkout_instance_id,
    repository_identity: structuredClone(repositoryIdentity),
    issued_at: new Date(Date.parse(now)).toISOString(),
    expires_at: expiresAt,
    production_state: {
      generation_id: randomUUID(),
      database_relative_path: `.workflow-state/headless-production-${repositoryIdentity.checkout_instance_id}.sqlite`,
    },
    runtime_launcher: {
      path: launcherTarget,
      fingerprint: digest(launcherWrapper),
      wrapper_interpreter_path: wrapperInterpreter.path,
      wrapper_interpreter_fingerprint: wrapperInterpreter.fingerprint,
      script_path: launcherScriptTarget,
      script_fingerprint: launcherSource.fingerprint,
      interpreter_path: launcherInterpreter.path,
      interpreter_fingerprint: launcherInterpreter.fingerprint,
    },
    release_trust: releaseTrust,
    release_prerequisites: structuredClone(releasePrerequisites),
    owner_acceptance: ownerAcceptance,
    owner_anchor: {
      path: ownerAnchor.source_path,
      fingerprint: ownerAnchor.fingerprint,
      owner_key_id: ownerAnchor.owner_key_id,
    },
    runtime_authorities: runtimeAuthorities,
  };

  atomicPrivateWrite(releasePrivateKeyPath, releasePrivateKey);
  try {
    atomicPrivateWrite(releaseSourcePrivateKeyPath, sourcePrivateKeyPem);
    atomicReadOnlyWrite(launcherScriptTarget, readFileSync(launcherSource.path));
    atomicExecutableWrite(launcherTarget, launcherWrapper);
    atomicPrivateWrite(trustTarget, `${JSON.stringify(trustDocument, null, 2)}\n`);
  } catch (error) {
    try { unlinkSync(releasePrivateKeyPath); } catch {}
    try { unlinkSync(releaseSourcePrivateKeyPath); } catch {}
    try { unlinkSync(launcherScriptTarget); } catch {}
    try { unlinkSync(launcherTarget); } catch {}
    throw error;
  }
  const loaded = loadProtectedRuntimeTrust({
    repositoryRoot: repository,
    repositoryLogicalId: repositoryIdentity.repository_logical_id,
    checkoutInstanceId: repositoryIdentity.checkout_instance_id,
    trustPath: trustTarget,
    now,
  });
  return {
    status: "initialized",
    trust_path: loaded.source_path,
    trust_fingerprint: loaded.fingerprint,
    runtime_state_root: stateRoot,
    release_private_key_path: releasePrivateKeyPath,
    release_source_private_key_path: releaseSourcePrivateKeyPath,
    release_key_id: keyId,
    release_source_key_id: sourceKeyId,
    runtime_launcher_path: launcherTarget,
    expires_at: expiresAt,
  };
}

export function headlessBootstrapDigest(value) {
  return digest(value);
}
