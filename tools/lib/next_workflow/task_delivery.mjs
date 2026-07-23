import { createHash } from "node:crypto";
import {
  closeSync,
  constants as fsConstants,
  existsSync,
  fstatSync,
  fsyncSync,
  lstatSync,
  openSync,
  readFileSync,
  realpathSync,
  unlinkSync,
  writeSync,
} from "node:fs";
import path from "node:path";
import { readSafeTextFile, resolveDevelopmentInstruction } from "../development_instruction.mjs";
import { assertNoSecretMaterial } from "./secret_policy.mjs";

function canonicalJson(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(",")}}`;
  return JSON.stringify(value);
}

function digest(value) {
  const bytes = Buffer.isBuffer(value) ? value : Buffer.from(typeof value === "string" ? value : canonicalJson(value));
  return createHash("sha256").update(bytes).digest("hex");
}

function plain(value, code) {
  if (!value || typeof value !== "object" || Array.isArray(value) || Object.getPrototypeOf(value) !== Object.prototype) throw new Error(code);
  return value;
}

export function buildTrustedAgentTaskEnvelope({ grant, invariant, instruction, resultContract = null, data = [] } = {}) {
  if (!/^[a-f0-9]{64}$/.test(grant?.fingerprint ?? "")) throw new Error("TASK_GRANT_REQUIRED");
  for (const [value, prefix] of [[invariant, "TASK_INVARIANT"], [instruction, "TASK_INSTRUCTION"]]) {
    plain(value, `${prefix}_REQUIRED`);
    if (!/^[a-f0-9]{64}$/.test(value.fingerprint ?? "") || typeof value.content !== "string" || value.content.length === 0 || typeof value.source !== "string" || value.source.length === 0) throw new Error(`${prefix}_INVALID`);
    if (digest(Buffer.from(value.content)) !== value.fingerprint) throw new Error(`${prefix}_FINGERPRINT_MISMATCH`);
  }
  if (!Array.isArray(data) || data.length > 1000) throw new Error("TASK_DATA_TRUST_INVALID");
  const normalizedData = data.map((entry) => {
    plain(entry, "TASK_DATA_ENTRY_INVALID");
    if (entry.trust_class === "trusted_control" || entry.interpretation === "instruction" || entry.envelope?.trust_class === "trusted_control" || entry.envelope?.interpretation === "instruction") throw new Error("TASK_DATA_TRUST_INVALID");
    return { ...structuredClone(entry), trust_class: "untrusted_data", interpretation: "data", ...(entry.envelope ? { envelope: { ...structuredClone(entry.envelope), trust_class: "untrusted_data", interpretation: "data" } } : {}) };
  });
  const control = {
    trust_class: "trusted_control",
    interpretation: "instruction",
    authority_owner: "Orchestrator Agent",
    invariant: { source: invariant.source, fingerprint: invariant.fingerprint, content: invariant.content },
    procedural_instruction: { source: instruction.source, source_profile: instruction.source_profile, source_version: instruction.source_version, precedence: instruction.precedence, fallback_trigger: instruction.fallback_trigger, fingerprint: instruction.fingerprint, content: instruction.content },
    ...(resultContract ? { result_contract: normalizeResultContract(resultContract) } : {}),
  };
  const envelope = { schema_version: "2.0.0", grant_fingerprint: grant.fingerprint, control, data: normalizedData };
  assertNoSecretMaterial(envelope, "TASK_ENVELOPE_SECRET_FORBIDDEN");
  return Object.freeze({ ...envelope, fingerprint: digest(envelope) });
}

function normalizeResultContract(value) {
  plain(value, "TASK_RESULT_CONTRACT_INVALID");
  if (value.schema_version !== "1.0.0" || typeof value.run_id !== "string" || value.run_id.length === 0) throw new Error("TASK_RESULT_CONTRACT_INVALID");
  const reviewSubjectFingerprint = value.review_subject_fingerprint;
  if (reviewSubjectFingerprint !== undefined && !/^[a-f0-9]{64}$/.test(reviewSubjectFingerprint)) throw new Error("TASK_RESULT_CONTRACT_REVIEW_SUBJECT_INVALID");
  const contract = {
    schema_version: "1.0.0",
    run_id: value.run_id,
    output_format: "json_only",
    required_top_level_fields: ["schema_version", "run_id", "status", "summary", "findings", "artifacts", "metrics"],
    status_values: ["succeeded", "failed", "blocked"],
    finding_severity_values: ["info", "warning", "error"],
    summary_format: "single_line_plain_text_without_paths_commands_or_secrets",
    authority_fields_forbidden: true,
    markdown_fences_forbidden: true,
    ...(reviewSubjectFingerprint ? {
      review_disposition: {
        subject_fingerprint: reviewSubjectFingerprint,
        required_artifact: {
          kind: "review_disposition",
          fingerprint: reviewSubjectFingerprint,
          media_type: "application/vnd.next-workflow.review-disposition+json",
          size_bytes: 0,
        },
        pass_requires_status: "succeeded",
        revise_or_stop_requires_status: ["failed", "blocked"],
      },
    } : {}),
  };
  return Object.freeze(contract);
}

function verifyPrivateDirectory(directory) {
  const info = lstatSync(directory);
  if (info.isSymbolicLink() || !info.isDirectory() || realpathSync(directory) !== directory || (info.mode & 0o077) !== 0 || (typeof process.getuid === "function" && info.uid !== process.getuid())) throw new Error("TASK_DELIVERY_DIRECTORY_INVALID");
  return info;
}

function writeExclusivePrivate(candidate, bytes) {
  if (existsSync(candidate)) throw new Error("TASK_DELIVERY_ALREADY_EXISTS");
  const fd = openSync(candidate, fsConstants.O_WRONLY | fsConstants.O_CREAT | fsConstants.O_EXCL | (fsConstants.O_NOFOLLOW ?? 0), 0o600);
  try {
    let offset = 0;
    while (offset < bytes.length) offset += writeSync(fd, bytes, offset, bytes.length - offset);
    fsyncSync(fd);
    const info = fstatSync(fd);
    if (!info.isFile() || info.size !== bytes.length || (info.mode & 0o077) !== 0) throw new Error("TASK_DELIVERY_FILE_INVALID");
    return { device: info.dev, inode: info.ino };
  } finally {
    closeSync(fd);
  }
}

export function verifyAgentTaskDelivery({ promptFile, deliveryFingerprint, sourceDescriptors = [], maximumBytes = 4 * 1024 * 1024 } = {}) {
  if (!path.isAbsolute(promptFile) || path.resolve(promptFile) !== promptFile || !/^[a-f0-9]{64}$/.test(deliveryFingerprint ?? "")) throw new Error("TASK_DELIVERY_VERIFICATION_INPUT_INVALID");
  const directory = path.dirname(promptFile);
  verifyPrivateDirectory(directory);
  const read = readSafeTextFile(promptFile, { root: directory, label: "agent task delivery", maximumBytes });
  if (read.digest !== deliveryFingerprint) throw new Error("TASK_DELIVERY_CHANGED");
  for (const descriptor of sourceDescriptors) {
    plain(descriptor, "TASK_DELIVERY_SOURCE_DESCRIPTOR_INVALID");
    if (!path.isAbsolute(descriptor.root) || !path.isAbsolute(descriptor.path) || !/^[a-f0-9]{64}$/.test(descriptor.fingerprint ?? "")) throw new Error("TASK_DELIVERY_SOURCE_DESCRIPTOR_INVALID");
    const source = readSafeTextFile(descriptor.path, { root: descriptor.root, label: descriptor.label, maximumBytes: descriptor.maximum_bytes });
    if (source.digest !== descriptor.fingerprint) throw new Error(`TASK_DELIVERY_SOURCE_CHANGED:${descriptor.label}`);
    const identity = lstatSync(descriptor.path);
    if (identity.isSymbolicLink() || identity.dev !== descriptor.device || identity.ino !== descriptor.inode) throw new Error(`TASK_DELIVERY_SOURCE_IDENTITY_CHANGED:${descriptor.label}`);
  }
  return { prompt_file: promptFile, delivery_fingerprint: read.digest, delivery_size: read.bytes.length, source_count: sourceDescriptors.length };
}

export function prepareAgentTaskDelivery({
  grant,
  authorityRoot,
  repositoryRoot,
  resolverInput = {},
  stage,
  scopeId,
  data = [],
  resultContract = null,
  promptFile,
  maximumInstructionBytes = 4 * 1024 * 1024,
  maximumDeliveryBytes = 4 * 1024 * 1024,
} = {}) {
  const canonicalAuthorityRoot = realpathSync(path.resolve(authorityRoot));
  const canonicalRepositoryRoot = realpathSync(path.resolve(repositoryRoot));
  if (!path.isAbsolute(promptFile) || path.resolve(promptFile) !== promptFile) throw new Error("TASK_DELIVERY_PATH_INVALID");
  const resolution = resolveDevelopmentInstruction({ root: canonicalAuthorityRoot, ...resolverInput, ...(resolverInput.targetKind === "product" ? { repo: canonicalRepositoryRoot } : {}), stage, scopeId });
  if (resolution.status !== "ready") throw new Error("TASK_DELIVERY_INSTRUCTION_NOT_READY");
  const invariantPath = path.join(canonicalRepositoryRoot, resolution.invariant_authority.path);
  const invariantRead = readSafeTextFile(invariantPath, { root: canonicalRepositoryRoot, label: "applicable AGENTS.MD", maximumBytes: maximumInstructionBytes });
  const instructionRoot = resolution.source === "local" ? canonicalRepositoryRoot : canonicalAuthorityRoot;
  const instructionPath = path.join(instructionRoot, resolution.source_path);
  const instructionRead = readSafeTextFile(instructionPath, { root: instructionRoot, label: "resolved procedural instruction", maximumBytes: maximumInstructionBytes });
  if (instructionRead.digest !== resolution.source_digest) throw new Error("TASK_DELIVERY_INSTRUCTION_RESOLUTION_DRIFT");
  const envelope = buildTrustedAgentTaskEnvelope({
    grant,
    invariant: { source: resolution.invariant_authority.path, fingerprint: invariantRead.digest, content: invariantRead.text },
    instruction: { source: resolution.source_path, source_profile: resolution.source_profile, source_version: resolution.source_version, precedence: resolution.instruction_authority.precedence, fallback_trigger: resolution.instruction_authority.fallback_trigger, fingerprint: instructionRead.digest, content: instructionRead.text },
    resultContract,
    data,
  });
  const bytes = Buffer.from(`${canonicalJson(envelope)}\n`);
  if (bytes.length > maximumDeliveryBytes) throw new Error("TASK_DELIVERY_TOO_LARGE");
  const directory = path.dirname(promptFile);
  verifyPrivateDirectory(directory);
  if (path.dirname(path.resolve(promptFile)) !== directory || [".", "..", ""].includes(path.basename(promptFile))) throw new Error("TASK_DELIVERY_PATH_INVALID");
  const identity = writeExclusivePrivate(promptFile, bytes);
  const deliveryFingerprint = digest(bytes);
  const sourceDescriptors = [
    { root: canonicalRepositoryRoot, path: invariantPath, label: "applicable AGENTS.MD", maximum_bytes: maximumInstructionBytes, fingerprint: invariantRead.digest, device: lstatSync(invariantPath).dev, inode: lstatSync(invariantPath).ino },
    { root: instructionRoot, path: instructionPath, label: "resolved procedural instruction", maximum_bytes: maximumInstructionBytes, fingerprint: instructionRead.digest, device: lstatSync(instructionPath).dev, inode: lstatSync(instructionPath).ino },
  ];
  let cleaned = false;
  return Object.freeze({
    envelope,
    invariant_fingerprint: invariantRead.digest,
    instruction_fingerprint: instructionRead.digest,
    envelope_fingerprint: envelope.fingerprint,
    delivery_fingerprint: deliveryFingerprint,
    delivery_size: bytes.length,
    prompt_file: promptFile,
    instruction_source: resolution.source,
    instruction_source_profile: resolution.source_profile,
    verify() {
      if (cleaned) throw new Error("TASK_DELIVERY_ALREADY_CLEANED");
      const verified = verifyAgentTaskDelivery({ promptFile, deliveryFingerprint, sourceDescriptors, maximumBytes: maximumDeliveryBytes });
      const info = lstatSync(promptFile);
      if (info.dev !== identity.device || info.ino !== identity.inode) throw new Error("TASK_DELIVERY_IDENTITY_CHANGED");
      return verified;
    },
    cleanup() {
      if (cleaned) return { cleaned: false, already_cleaned: true };
      const info = lstatSync(promptFile);
      if (info.isSymbolicLink() || info.dev !== identity.device || info.ino !== identity.inode) throw new Error("TASK_DELIVERY_CLEANUP_IDENTITY_CHANGED");
      unlinkSync(promptFile);
      cleaned = true;
      return { cleaned: true, already_cleaned: false };
    },
  });
}

export function taskDeliveryDigest(value) {
  return digest(value);
}
