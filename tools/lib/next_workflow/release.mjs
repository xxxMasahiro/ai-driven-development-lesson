import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { lstatSync, readFileSync, realpathSync } from "node:fs";
import path from "node:path";
import { advanceActivation, advanceRollback, beginRollback } from "./saga.mjs";

const REQUIRED_PROOFS = ["local_release", "pr_ci", "main_ci", "local_remote_sync", "recovery", "fenced_rollback", "archive_decommission", "outbox_disposition"];
const ACTIVATION_ORDER = ["planned", "shadow", "release_verified", "recovery_verified", "rollback_verified", "archive_decommission_verified", "ready", "enforced"];
const ACTIVATION_CYCLE = ACTIVATION_ORDER.slice(1);
const CURRENT_ACTIVATION_SCHEMA_VERSION = "1.1.0";
const PROOF_EVIDENCE_FIELDS = {
  local_release: { repository_head: "git", checkout_instance_id: "string", command_manifest_fingerprint: "fingerprint", input_manifest_fingerprint: "fingerprint", artifact_manifest_fingerprint: "fingerprint" },
  pr_ci: { repository: "string", pr_number: "integer", head_sha: "git", run_id: "integer", check_names: "strings", artifact_digest: "fingerprint" },
  main_ci: { repository: "string", branch: "string", pr_number: "integer", candidate_head_sha: "git", merge_sha: "git", run_id: "integer", check_names: "strings", artifact_digest: "fingerprint" },
  local_remote_sync: { repository_logical_id: "string", local_head: "git", remote_head: "git", remote_ref: "string" },
  recovery: { database_identity_fingerprint: "fingerprint", candidate_fingerprint: "fingerprint", backup_manifest_fingerprint: "fingerprint", restore_proof_fingerprint: "fingerprint" },
  fenced_rollback: { candidate_fingerprint: "fingerprint", authority_epoch: "integer", checkpoint_ids: "strings", state_proof_fingerprint: "fingerprint" },
  archive_decommission: { relationship_id: "string", from_state: "string", to_state: "string", transition_proof_fingerprint: "fingerprint" },
  outbox_disposition: { relationship_id: "string", effect_ids: "strings", outbox_ids: "strings", disposition: "string", receipt_manifest_fingerprint: "fingerprint" }
};

function canonicalJson(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(",")}}`;
  return JSON.stringify(value);
}

function digest(value) {
  return createHash("sha256").update(Buffer.isBuffer(value) ? value : canonicalJson(value)).digest("hex");
}

function activationCycleId({ activationId, candidateFingerprint, cycleStartRevision, previousRecordRevision, previousRecordContentFingerprint }) {
  return digest({
    activation_id: activationId,
    candidate_fingerprint: candidateFingerprint,
    cycle_start_revision: cycleStartRevision,
    predecessor_record_revision: previousRecordRevision,
    predecessor_record_content_fingerprint: previousRecordContentFingerprint,
  });
}

function activationRecords(store, activationId = "next-development-workflow") {
  const records = [];
  let cursor = 0;
  do {
    const page = store.query({ kind: "NextWorkflowActivation", limit: 1000, cursor });
    records.push(...page.records.filter((record) => record.lineage_id === activationId));
    cursor = page.next_cursor;
  } while (cursor !== null);
  records.sort((left, right) => left.record_revision - right.record_revision || left.id.localeCompare(right.id));
  const revisions = new Set();
  for (const record of records) {
    if (!Number.isSafeInteger(record.record_revision) || record.record_revision < 1 || revisions.has(record.record_revision)) throw new Error("ACTIVATION_REVISION_HISTORY_INVALID");
    revisions.add(record.record_revision);
  }
  return records;
}

function currentCycleHistory(records, record) {
  if (record?.schema_version !== CURRENT_ACTIVATION_SCHEMA_VERSION || !Number.isSafeInteger(record?.cycle_start_revision)) return undefined;
  return records.filter((entry) => entry.record_revision >= record.cycle_start_revision && entry.record_revision <= record.revision);
}

export function activationCycleHistory(store, record, activationId = "next-development-workflow") {
  if (!store || typeof store.query !== "function") throw new Error("ACTIVATION_STORE_REQUIRED");
  return currentCycleHistory(activationRecords(store, activationId), record);
}

function verifyCurrentActivationCycle(record, cycleHistory) {
  if (!Array.isArray(cycleHistory) || cycleHistory.length !== ACTIVATION_CYCLE.length) throw new Error("ENFORCED_ACTIVATION_CYCLE_HISTORY_REQUIRED");
  const normalized = cycleHistory.map((entry) => {
    const payload = entry?.payload ?? entry;
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) throw new Error("ENFORCED_ACTIVATION_CYCLE_HISTORY_INVALID");
    const contentFingerprint = entry?.payload ? entry.content_fp : digest(payload);
    if (!/^[a-f0-9]{64}$/.test(contentFingerprint ?? "")) throw new Error("ENFORCED_ACTIVATION_CYCLE_HISTORY_INVALID");
    if (entry?.payload
      && (entry.kind !== "NextWorkflowActivation"
        || entry.schema_version !== payload.schema_version
        || Number(entry.record_revision) !== payload.revision
        || entry.lineage_id !== payload.activation_id
        || entry.lifecycle_state !== payload.mode
        || entry.source_revision !== String(payload.previous_record_revision)
        || entry.input_fp !== payload.candidate_fingerprint
        || entry.content_fp !== digest(payload))) {
      throw new Error("ENFORCED_ACTIVATION_CYCLE_ROW_BINDING_INVALID");
    }
    return { payload, content_fingerprint: contentFingerprint };
  });
  for (let index = 0; index < normalized.length; index += 1) {
    const { payload } = normalized[index];
    const expectedRevision = record.cycle_start_revision + index;
    if (payload.schema_version !== CURRENT_ACTIVATION_SCHEMA_VERSION
      || payload.activation_id !== record.activation_id
      || payload.candidate_fingerprint !== record.candidate_fingerprint
      || payload.cycle_id !== record.cycle_id
      || payload.cycle_start_revision !== record.cycle_start_revision
      || payload.cycle_step !== index + 1
      || payload.revision !== expectedRevision
      || payload.mode !== ACTIVATION_CYCLE[index]) {
      throw new Error("ENFORCED_ACTIVATION_CYCLE_HISTORY_INVALID");
    }
    if (index === 0) {
      if (payload.previous_record_revision !== payload.revision - 1
        || (payload.previous_record_revision === 0
          ? payload.previous_record_content_fingerprint !== null
          : !/^[a-f0-9]{64}$/.test(payload.previous_record_content_fingerprint ?? ""))
        || payload.cycle_id !== activationCycleId({
          activationId: payload.activation_id,
          candidateFingerprint: payload.candidate_fingerprint,
          cycleStartRevision: payload.cycle_start_revision,
          previousRecordRevision: payload.previous_record_revision,
          previousRecordContentFingerprint: payload.previous_record_content_fingerprint,
        })) {
        throw new Error("ENFORCED_ACTIVATION_CYCLE_START_INVALID");
      }
    } else if (payload.previous_record_revision !== normalized[index - 1].payload.revision
      || payload.previous_record_content_fingerprint !== normalized[index - 1].content_fingerprint) {
      throw new Error("ENFORCED_ACTIVATION_CYCLE_PREDECESSOR_INVALID");
    }
  }
  if (canonicalJson(normalized.at(-1).payload) !== canonicalJson(record)) throw new Error("ENFORCED_ACTIVATION_CYCLE_HEAD_INVALID");
}

function requireString(value, code) {
  if (typeof value !== "string" || value.length === 0) throw new Error(code);
  return value;
}

export function trustedGitExecutable(candidates = ["/usr/bin/git", "/bin/git"]) {
  const rootOwnerAppearsAsOverflow = (() => {
    try {
      return readFileSync("/proc/self/uid_map", "utf8").split(/\r?\n/u).some((line) => {
        const [inside, outside, length] = line.trim().split(/\s+/u).map(Number);
        return inside === process.getuid?.() && outside === 0 && length === 1;
      });
    } catch {
      return false;
    }
  })();
  for (const candidate of candidates) {
    try {
      const canonical = realpathSync(candidate);
      const info = lstatSync(canonical);
      if (info.isFile()
        && !info.isSymbolicLink()
        && (info.mode & 0o111) !== 0
        && (info.mode & 0o022) === 0
        && (info.uid === 0 || (info.uid === 65534 && rootOwnerAppearsAsOverflow))
        && ["/usr/bin", "/bin"].includes(path.dirname(canonical))) return canonical;
    } catch {}
  }
  throw new Error("TRUSTED_GIT_EXECUTABLE_UNAVAILABLE");
}

export function trustedGitEnvironment() {
  return Object.freeze({
    PATH: "/usr/bin:/bin",
    LANG: "C.UTF-8",
    LC_ALL: "C.UTF-8",
    GIT_CONFIG_NOSYSTEM: "1",
    GIT_CONFIG_GLOBAL: "/dev/null",
    GIT_OPTIONAL_LOCKS: "0",
    GIT_TERMINAL_PROMPT: "0",
    GIT_NO_REPLACE_OBJECTS: "1",
  });
}

export function validateReleasePrerequisites(value) {
  if (!value || value.schema_version !== "1.0.0" || value.prerequisite_id !== "next-development-workflow-release-prerequisites" || !Number.isSafeInteger(value.revision) || value.revision < 1) throw new Error("RELEASE_PREREQUISITES_INVALID");
  const headlessRuntime = value.headless_runtime;
  if (!headlessRuntime || headlessRuntime.state !== "accepted" || headlessRuntime.developer_accepted !== true || !/^[a-f0-9]{64}$/.test(headlessRuntime.evidence_fingerprint ?? "") || !Number.isFinite(Date.parse(headlessRuntime.accepted_at))) throw new Error("HEADLESS_RUNTIME_ACCEPTANCE_PREREQUISITE_UNMET");
  const controlCenter = value.control_center;
  if (!controlCenter || !new Set(["paused", "accepted"]).has(controlCenter.state) || typeof controlCenter.blocks_headless_activation !== "boolean") throw new Error("CONTROL_CENTER_PREREQUISITE_STATE_INVALID");
  if (controlCenter.state === "paused" && controlCenter.blocks_headless_activation !== false) throw new Error("CONTROL_CENTER_MUST_NOT_BLOCK_HEADLESS_ACTIVATION");
  if (controlCenter.state === "accepted" && (controlCenter.developer_accepted !== true || !/^[a-f0-9]{64}$/.test(controlCenter.evidence_fingerprint ?? "") || !Number.isFinite(Date.parse(controlCenter.accepted_at)))) throw new Error("CONTROL_CENTER_ACCEPTANCE_EVIDENCE_INVALID");
  return {
    valid: true,
    fingerprint: digest(value),
    revision: value.revision,
    headless_runtime_evidence_fingerprint: headlessRuntime.evidence_fingerprint,
    control_center_state: controlCenter.state,
  };
}

function validateEvidenceValue(value, type) {
  if (type === "string") return typeof value === "string" && value.length > 0;
  if (type === "integer") return Number.isSafeInteger(value) && value >= 0;
  if (type === "fingerprint") return typeof value === "string" && /^[a-f0-9]{64}$/.test(value);
  if (type === "git") return typeof value === "string" && /^[a-f0-9]{40,64}$/.test(value);
  if (type === "strings") return Array.isArray(value) && value.length > 0 && value.every((item) => typeof item === "string" && item.length > 0) && new Set(value).size === value.length;
  return false;
}

function validProofEvidence(kind, evidence, candidateFingerprint) {
  const schema = PROOF_EVIDENCE_FIELDS[kind];
  if (!schema || !evidence || typeof evidence !== "object" || Array.isArray(evidence) || Object.keys(evidence).sort().join("\0") !== Object.keys(schema).sort().join("\0")) return false;
  if (!Object.entries(schema).every(([field, type]) => validateEvidenceValue(evidence[field], type))) return false;
  if (["recovery", "fenced_rollback"].includes(kind) && evidence.candidate_fingerprint !== candidateFingerprint) return false;
  if (["pr_ci", "main_ci"].includes(kind) && evidence.pr_number < 1) return false;
  if (kind === "local_remote_sync" && evidence.local_head !== evidence.remote_head) return false;
  if (kind === "archive_decommission" && evidence.from_state !== "DRAINING" && evidence.from_state !== "DETACHED") return false;
  if (kind === "archive_decommission" && evidence.to_state !== "ARCHIVED") return false;
  return true;
}

export function validateReleaseProofEvidence({ kind, evidence, candidateFingerprint } = {}) {
  if (!REQUIRED_PROOFS.includes(kind) || !/^[a-f0-9]{64}$/.test(candidateFingerprint ?? "") || !validProofEvidence(kind, evidence, candidateFingerprint)) throw new Error("RELEASE_PROOF_EVIDENCE_INVALID");
  return structuredClone(evidence);
}

function validReleaseProofLineage(proofs, candidateDefinition, candidateFingerprint) {
  if (!candidateDefinition || typeof candidateDefinition !== "object" || Array.isArray(candidateDefinition)) return false;
  const { candidate_fingerprint: claimedFingerprint, ...candidateCore } = candidateDefinition;
  if (claimedFingerprint !== candidateFingerprint || digest(candidateCore) !== candidateFingerprint || !/^[a-f0-9]{40,64}$/.test(candidateDefinition.repository_head ?? "")) return false;
  const localRelease = proofs?.local_release?.evidence;
  const prCi = proofs?.pr_ci?.evidence;
  const mainCi = proofs?.main_ci?.evidence;
  const synchronization = proofs?.local_remote_sync?.evidence;
  return localRelease?.repository_head === candidateDefinition.repository_head
    && prCi?.head_sha === candidateDefinition.repository_head
    && mainCi?.candidate_head_sha === candidateDefinition.repository_head
    && prCi?.repository === mainCi?.repository
    && prCi?.pr_number === mainCi?.pr_number
    && mainCi?.branch === "main"
    && synchronization?.local_head === mainCi?.merge_sha
    && synchronization?.remote_head === mainCi?.merge_sha
    && synchronization?.remote_ref === "refs/remotes/origin/main";
}

function validateCandidateDefinition(candidate, { candidateFingerprint, prerequisiteFingerprint }) {
  if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) throw new Error("RELEASE_CANDIDATE_DEFINITION_REQUIRED");
  const { candidate_fingerprint: claimed, ...core } = candidate;
  if (claimed !== candidateFingerprint || digest(core) !== claimed || candidate.release_prerequisite_fingerprint !== prerequisiteFingerprint || !/^[a-f0-9]{40,64}$/.test(candidate.repository_tree ?? "") || !Array.isArray(candidate.artifact_paths)) throw new Error("RELEASE_CANDIDATE_DEFINITION_INVALID");
  return structuredClone(candidate);
}

function proofBody(kind, proof) {
  return {
    kind,
    owner: proof.owner,
    verifier: proof.verifier,
    candidate_fingerprint: proof.candidate_fingerprint,
    fresh_until: proof.fresh_until,
    correctness: proof.correctness,
    evidence: proof.evidence,
    ...(proof.source_receipt ? { source_receipt: proof.source_receipt } : {}),
  };
}

function transitionProofBody(nextMode, proof) {
  return {
    kind: nextMode,
    owner: proof.owner,
    verifier: proof.verifier,
    candidate_fingerprint: proof.candidate_fingerprint,
    fresh_until: proof.fresh_until,
    correctness: proof.correctness,
    evidence: proof.evidence,
    ...(proof.source_receipt ? { source_receipt: proof.source_receipt } : {}),
  };
}

function verifyTransitionEvidence({ nextMode, candidateFingerprint, repositoryHead, evidence, transitionVerifier, now }) {
  if (typeof transitionVerifier !== "function") throw new Error("ACTIVATION_TRANSITION_VERIFIER_REQUIRED");
  const nowTimestamp = Date.parse(now);
  if (!evidence || evidence.kind !== nextMode || evidence.candidate_fingerprint !== candidateFingerprint || typeof evidence.owner !== "string" || typeof evidence.verifier !== "string" || evidence.owner === evidence.verifier || !Number.isFinite(Date.parse(evidence.fresh_until)) || Date.parse(evidence.fresh_until) < nowTimestamp || evidence.correctness?.status !== "passed" || typeof evidence.correctness?.fingerprint !== "string" || !evidence.evidence || Object.keys(evidence.evidence).sort().join("\0") !== ["acceptance_prerequisite_fingerprint", "repository_head", "stage_evidence_fingerprint"].sort().join("\0") || !/^[a-f0-9]{64}$/.test(evidence.evidence.acceptance_prerequisite_fingerprint) || !/^[a-f0-9]{40,64}$/.test(evidence.evidence.repository_head) || evidence.evidence.repository_head !== repositoryHead || !/^[a-f0-9]{64}$/.test(evidence.evidence.stage_evidence_fingerprint) || evidence.fingerprint !== digest(transitionProofBody(nextMode, evidence))) throw new Error("ACTIVATION_TRANSITION_EVIDENCE_INVALID");
  const verified = transitionVerifier({ nextMode, candidateFingerprint, evidence: structuredClone(evidence), now: new Date(nowTimestamp).toISOString() });
  if (verified && typeof verified.then === "function") throw new Error("ACTIVATION_TRANSITION_ASYNC_VERIFIER_UNSUPPORTED");
  if (!verified || verified.verified !== true || verified.owner !== evidence.owner || verified.verifier !== evidence.verifier || verified.candidate_fingerprint !== candidateFingerprint || verified.proof_fingerprint !== evidence.fingerprint || verified.fresh_until !== evidence.fresh_until || verified.correctness !== true || typeof verified.verification_fingerprint !== "string") throw new Error("ACTIVATION_TRANSITION_VERIFICATION_FAILED");
  return { ...structuredClone(evidence), verification_fingerprint: verified.verification_fingerprint };
}

export function freezeReleaseCandidate({ repositoryHead, repositoryTree, artifactFingerprints, artifactPaths = [], nodeVersion, contractFingerprint, releasePrerequisites }) {
  const prerequisites = validateReleasePrerequisites(releasePrerequisites);
  if (!/^[a-f0-9]{40,64}$/.test(repositoryHead) || !/^[a-f0-9]{40,64}$/.test(repositoryTree ?? "") || !Array.isArray(artifactFingerprints) || artifactFingerprints.length === 0 || typeof contractFingerprint !== "string") throw new Error("RELEASE_CANDIDATE_INPUT_INVALID");
  if (!Array.isArray(artifactPaths) || artifactPaths.some((entry) => typeof entry !== "string")) throw new Error("RELEASE_CANDIDATE_ARTIFACT_PATHS_INVALID");
  const candidate = { schema_version: "1.0.0", repository_head: repositoryHead, repository_tree: repositoryTree, artifact_fingerprints: [...artifactFingerprints].sort(), artifact_paths: [...new Set(artifactPaths)].sort(), node_version: nodeVersion, contract_fingerprint: contractFingerprint, release_prerequisite_fingerprint: prerequisites.fingerprint };
  return { ...candidate, candidate_fingerprint: digest(candidate) };
}

export function freezeRepositoryReleaseCandidate({ repositoryRoot, artifactPaths, contractFingerprint, releasePrerequisites, nodeVersion = process.versions.node, gitRunner = execFileSync } = {}) {
  if (typeof repositoryRoot !== "string" || !Array.isArray(artifactPaths) || artifactPaths.length === 0 || artifactPaths.some((entry) => typeof entry !== "string" || entry.length === 0 || path.isAbsolute(entry))) throw new Error("REPOSITORY_RELEASE_CANDIDATE_INPUT_INVALID");
  const root = realpathSync(repositoryRoot);
  const gitExecutable = trustedGitExecutable();
  const runGit = (arguments_) => {
    const output = gitRunner(gitExecutable, ["--no-replace-objects", "--no-optional-locks", "-c", "core.hooksPath=/dev/null", "-c", "protocol.file.allow=never", "-C", root, ...arguments_], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], timeout: 30000, maxBuffer: 16 * 1024 * 1024, env: trustedGitEnvironment() });
    if (typeof output !== "string") throw new Error("REPOSITORY_RELEASE_GIT_OUTPUT_INVALID");
    return output.trim();
  };
  const runGitBytes = (arguments_) => {
    const output = gitRunner(gitExecutable, ["--no-replace-objects", "--no-optional-locks", "-c", "core.hooksPath=/dev/null", "-c", "protocol.file.allow=never", "-C", root, ...arguments_], { encoding: null, stdio: ["ignore", "pipe", "pipe"], timeout: 30000, maxBuffer: 64 * 1024 * 1024, env: trustedGitEnvironment() });
    if (!Buffer.isBuffer(output) && typeof output !== "string") throw new Error("REPOSITORY_RELEASE_GIT_OUTPUT_INVALID");
    return Buffer.isBuffer(output) ? output : Buffer.from(output);
  };
  if (runGit(["status", "--porcelain=v1", "--untracked-files=all"]) !== "") throw new Error("RELEASE_CANDIDATE_REQUIRES_CLEAN_WORKTREE");
  const repositoryHead = runGit(["rev-parse", "HEAD"]);
  const repositoryTree = runGit(["rev-parse", `${repositoryHead}^{tree}`]);
  const fingerprints = [...new Set(artifactPaths)].sort().map((relativePath) => {
    if (relativePath.includes("\0") || relativePath.includes("\\")) throw new Error(`RELEASE_ARTIFACT_PATH_INVALID:${relativePath}`);
    const normalized = path.posix.normalize(relativePath);
    if (normalized === "." || normalized === ".." || normalized.startsWith("../") || normalized !== relativePath) throw new Error(`RELEASE_ARTIFACT_PATH_INVALID:${relativePath}`);
    const tracked = runGit(["ls-tree", "--full-tree", "--name-only", repositoryHead, "--", normalized]);
    if (tracked !== normalized) throw new Error(`RELEASE_ARTIFACT_NOT_TRACKED:${relativePath}`);
    return `${normalized}:${digest(runGitBytes(["show", `${repositoryHead}:${normalized}`]))}`;
  });
  if (runGit(["rev-parse", "HEAD"]) !== repositoryHead || runGit(["rev-parse", `${repositoryHead}^{tree}`]) !== repositoryTree || runGit(["status", "--porcelain=v1", "--untracked-files=all"]) !== "") throw new Error("RELEASE_CANDIDATE_CHANGED_DURING_FREEZE");
  return freezeReleaseCandidate({ repositoryHead, repositoryTree, artifactFingerprints: fingerprints, artifactPaths, nodeVersion, contractFingerprint, releasePrerequisites });
}

export function verifyRepositoryReleaseDeployment({
  repositoryRoot,
  candidateDefinition,
  signedReleaseProofs,
  contractFingerprint,
  releasePrerequisites,
  nodeVersion = process.versions.node,
  gitRunner = execFileSync,
} = {}) {
  const prerequisites = validateReleasePrerequisites(releasePrerequisites);
  const expected = validateCandidateDefinition(candidateDefinition, {
    candidateFingerprint: candidateDefinition?.candidate_fingerprint,
    prerequisiteFingerprint: prerequisites.fingerprint,
  });
  const deployed = freezeRepositoryReleaseCandidate({
    repositoryRoot,
    artifactPaths: expected.artifact_paths,
    contractFingerprint,
    releasePrerequisites,
    nodeVersion,
    gitRunner,
  });
  const immutableContentMatches = canonicalJson(deployed.artifact_paths) === canonicalJson(expected.artifact_paths)
    && canonicalJson(deployed.artifact_fingerprints) === canonicalJson(expected.artifact_fingerprints)
    && deployed.repository_tree === expected.repository_tree
    && deployed.node_version === expected.node_version
    && deployed.contract_fingerprint === expected.contract_fingerprint
    && deployed.release_prerequisite_fingerprint === expected.release_prerequisite_fingerprint;
  if (!immutableContentMatches) throw new Error("DEPLOYED_RELEASE_CONTENT_DRIFT");
  const mainCi = signedReleaseProofs?.main_ci?.evidence;
  const synchronization = signedReleaseProofs?.local_remote_sync?.evidence;
  if (!mainCi || !synchronization
    || deployed.repository_head !== mainCi.merge_sha
    || synchronization.local_head !== deployed.repository_head
    || synchronization.remote_head !== deployed.repository_head
    || synchronization.remote_ref !== "refs/remotes/origin/main") {
    throw new Error("DEPLOYED_RELEASE_LINEAGE_DRIFT");
  }
  return {
    candidate_fingerprint: expected.candidate_fingerprint,
    repository_head: deployed.repository_head,
    deployment_fingerprint: digest({
      candidate_fingerprint: expected.candidate_fingerprint,
      repository_head: deployed.repository_head,
      artifact_fingerprints: deployed.artifact_fingerprints,
      main_ci_fingerprint: signedReleaseProofs.main_ci.fingerprint,
      synchronization_fingerprint: signedReleaseProofs.local_remote_sync.fingerprint,
    }),
  };
}

export function evaluateCorrectness({ requiredCheckMisses, authorityDecisionParity, traceabilityCoverage, existingFeatureRegressions, unknownGreenStates }) {
  const measures = { required_check_misses: requiredCheckMisses, authority_decision_parity: authorityDecisionParity, traceability_coverage: traceabilityCoverage, existing_feature_regressions: existingFeatureRegressions, unknown_green_states: unknownGreenStates };
  const passed = requiredCheckMisses === 0 && authorityDecisionParity === true && traceabilityCoverage === 1 && existingFeatureRegressions === 0 && unknownGreenStates === 0;
  return { status: passed ? "passed" : "failed", measures, fingerprint: digest(measures), speed_evaluation_allowed: passed };
}

export function evaluatePerformance({ correctness, legacyDurationMs, candidateDurationMs }) {
  if (correctness?.speed_evaluation_allowed !== true) return { status: "blocked", reason: "CORRECTNESS_FIRST", accepted: false };
  if (!(legacyDurationMs > 0) || !(candidateDurationMs > 0)) throw new Error("PERFORMANCE_DURATION_INVALID");
  const speedup = legacyDurationMs / candidateDurationMs;
  return { status: "measured", legacy_duration_ms: legacyDurationMs, candidate_duration_ms: candidateDurationMs, speedup, accepted: candidateDurationMs <= legacyDurationMs };
}

export function verifyReleaseProofs({ candidateFingerprint, candidateDefinition, proofs, proofVerifier, now = new Date().toISOString() }) {
  requireString(candidateFingerprint, "RELEASE_CANDIDATE_FINGERPRINT_REQUIRED");
  if (typeof proofVerifier !== "function") throw new Error("RELEASE_PROOF_VERIFIER_REQUIRED");
  const nowTimestamp = Date.parse(now);
  if (!Number.isFinite(nowTimestamp)) throw new Error("RELEASE_VERIFICATION_TIME_INVALID");
  const missing = [];
  const mismatched = [];
  const stale = [];
  const incorrect = [];
  const invalid = [];
  const verifiedProofs = {};
  if (!validReleaseProofLineage(proofs, candidateDefinition, candidateFingerprint)) invalid.push("release_lineage");
  for (const kind of REQUIRED_PROOFS) {
    const proof = proofs?.[kind];
    if (!proof) { missing.push(kind); continue; }
    if (typeof proof.owner !== "string" || typeof proof.verifier !== "string" || proof.owner.length === 0 || proof.verifier.length === 0 || proof.owner === proof.verifier) { invalid.push(kind); continue; }
    if (proof.candidate_fingerprint !== candidateFingerprint) { mismatched.push(kind); continue; }
    const freshUntil = Date.parse(proof.fresh_until);
    if (!Number.isFinite(freshUntil) || freshUntil < nowTimestamp) { stale.push(kind); continue; }
    if (!proof.correctness || proof.correctness.status !== "passed" || typeof proof.correctness.fingerprint !== "string" || proof.correctness.fingerprint.length === 0) { incorrect.push(kind); continue; }
    if (!validProofEvidence(kind, proof.evidence, candidateFingerprint)) { invalid.push(kind); continue; }
    const expectedFingerprint = digest(proofBody(kind, proof));
    if (proof.fingerprint !== expectedFingerprint) { invalid.push(kind); continue; }
    let verification;
    try {
      verification = proofVerifier({ kind, proof: structuredClone(proof), candidateFingerprint, now: new Date(nowTimestamp).toISOString() });
      if (verification && typeof verification.then === "function") throw new Error("RELEASE_PROOF_ASYNC_VERIFIER_UNSUPPORTED");
    } catch {
      invalid.push(kind);
      continue;
    }
    if (verification?.verified !== true
      || verification.owner !== proof.owner
      || verification.verifier !== proof.verifier
      || verification.candidate_fingerprint !== candidateFingerprint
      || verification.proof_fingerprint !== proof.fingerprint
      || verification.fresh_until !== proof.fresh_until
      || verification.correctness !== true
      || typeof verification.verification_fingerprint !== "string"
      || verification.verification_fingerprint.length === 0) {
      invalid.push(kind);
      continue;
    }
    verifiedProofs[kind] = {
      owner: proof.owner,
      verifier: proof.verifier,
      candidate_fingerprint: proof.candidate_fingerprint,
      proof_fingerprint: proof.fingerprint,
      fresh_until: proof.fresh_until,
      correctness_fingerprint: proof.correctness.fingerprint,
      evidence_fingerprint: digest(proof.evidence),
      verification_fingerprint: verification.verification_fingerprint
    };
  }
  const status = missing.length || mismatched.length || stale.length || incorrect.length || invalid.length ? "failed" : "passed";
  const summary = { status, candidate_fingerprint: candidateFingerprint, missing, mismatched, stale, incorrect, invalid, verified_proofs: verifiedProofs, verified_at: new Date(nowTimestamp).toISOString() };
  return { ...summary, fingerprint: digest(summary) };
}

export function verifyEnforcedActivationRecord({ record, cycleHistory, proofVerifier, transitionVerifier, expectedRevocationEpoch, now = new Date().toISOString() } = {}) {
  const legacyFields = ["activated_at", "activation_id", "authority_epoch", "candidate_definition", "candidate_fingerprint", "correctness", "evidence", "mode", "proof_summary", "release_prerequisite_fingerprint", "revision", "schema_version", "signed_release_proofs", "signed_transition_proofs", "transition_evidence"].sort();
  const currentFields = [...legacyFields, "cycle_id", "cycle_start_revision", "cycle_step", "previous_record_content_fingerprint", "previous_record_revision"].sort();
  const legacy = record?.schema_version === "1.0.0";
  const allowedFields = legacy ? legacyFields : currentFields;
  if (!record
    || Object.keys(record).sort().join("\0") !== allowedFields.join("\0")
    || !new Set(["1.0.0", CURRENT_ACTIVATION_SCHEMA_VERSION]).has(record.schema_version)
    || record.activation_id !== "next-development-workflow"
    || record.mode !== "enforced"
    || !Number.isSafeInteger(record.revision)
    || (legacy
      ? record.revision !== ACTIVATION_CYCLE.length
      : (record.cycle_step !== ACTIVATION_CYCLE.length
        || record.revision !== record.cycle_start_revision + ACTIVATION_CYCLE.length - 1
        || record.previous_record_revision !== record.revision - 1
        || !/^[a-f0-9]{64}$/.test(record.previous_record_content_fingerprint ?? "")
        || !/^[a-f0-9]{64}$/.test(record.cycle_id ?? "")))
    || !Number.isSafeInteger(expectedRevocationEpoch)
    || expectedRevocationEpoch < 0
    || record.authority_epoch !== expectedRevocationEpoch
    || !Number.isFinite(Date.parse(now))
    || !Number.isFinite(Date.parse(record.activated_at))) {
    throw new Error("ENFORCED_ACTIVATION_RECORD_INVALID");
  }
  if (!legacy) verifyCurrentActivationCycle(record, cycleHistory);
  const candidateDefinition = validateCandidateDefinition(record.candidate_definition, { candidateFingerprint: record.candidate_fingerprint, prerequisiteFingerprint: record.release_prerequisite_fingerprint });
  if (canonicalJson(candidateDefinition) !== canonicalJson(record.candidate_definition)) throw new Error("ENFORCED_ACTIVATION_CANDIDATE_BINDING_INVALID");
  const currentSummary = verifyReleaseProofs({ candidateFingerprint: record.candidate_fingerprint, candidateDefinition, proofs: record.signed_release_proofs, proofVerifier, now });
  if (currentSummary.status !== "passed") throw new Error("ENFORCED_ACTIVATION_RELEASE_PROOFS_INVALID");
  const storedVerificationTime = record.proof_summary?.verified_at;
  if (!Number.isFinite(Date.parse(storedVerificationTime)) || storedVerificationTime !== record.activated_at || Date.parse(storedVerificationTime) > Date.parse(now)) throw new Error("ENFORCED_ACTIVATION_TIME_BINDING_INVALID");
  const replayedSummary = verifyReleaseProofs({ candidateFingerprint: record.candidate_fingerprint, candidateDefinition, proofs: record.signed_release_proofs, proofVerifier, now: storedVerificationTime });
  if (replayedSummary.status !== "passed" || canonicalJson(replayedSummary) !== canonicalJson(record.proof_summary)) throw new Error("ENFORCED_ACTIVATION_SUMMARY_BINDING_INVALID");
  const expectedEvidence = REQUIRED_PROOFS.map((kind) => ({ kind, status: "passed", candidate_fingerprint: record.candidate_fingerprint, fingerprint: replayedSummary.verified_proofs[kind].proof_fingerprint }));
  if (canonicalJson(record.evidence) !== canonicalJson(expectedEvidence) || canonicalJson(record.correctness) !== canonicalJson({ status: "passed", fingerprint: replayedSummary.fingerprint })) throw new Error("ENFORCED_ACTIVATION_EVIDENCE_BINDING_INVALID");
  const transitionModes = ACTIVATION_ORDER.slice(1, -1);
  if (!Array.isArray(record.signed_transition_proofs) || record.signed_transition_proofs.length !== transitionModes.length) throw new Error("ENFORCED_ACTIVATION_TRANSITION_PROOFS_REQUIRED");
  const expectedTransitions = transitionModes.map((mode, index) => {
    const verified = verifyTransitionEvidence({ nextMode: mode, candidateFingerprint: record.candidate_fingerprint, repositoryHead: candidateDefinition.repository_head, evidence: record.signed_transition_proofs[index], transitionVerifier, now });
    return { mode, fingerprint: verified.fingerprint, kind: mode, owner: verified.owner, verifier: verified.verifier, candidate_fingerprint: record.candidate_fingerprint, fresh_until: verified.fresh_until, correctness_fingerprint: verified.correctness.fingerprint, verification_fingerprint: verified.verification_fingerprint };
  });
  expectedTransitions.push({ mode: "enforced", fingerprint: digest({ nextMode: "enforced", release: replayedSummary.fingerprint }) });
  if (canonicalJson(record.transition_evidence) !== canonicalJson(expectedTransitions)) throw new Error("ENFORCED_ACTIVATION_TRANSITION_BINDING_INVALID");
  return { trusted: true, record_fingerprint: digest(record), proof_fingerprint: digest({ activation_record_fingerprint: digest(record), release_summary_fingerprint: replayedSummary.fingerprint, transition_verification_fingerprints: expectedTransitions.slice(0, -1).map((entry) => entry.verification_fingerprint) }) };
}

export async function completeActivation({ candidateFingerprint, proofs, proofVerifier, transitionVerifier, store, expectedRevision, releasePrerequisites, now = new Date().toISOString(), activationId = "next-development-workflow" }) {
  const prerequisites = validateReleasePrerequisites(releasePrerequisites);
  if (!store || typeof store.persistActivationLifecycle !== "function") throw new Error("ACTIVATION_STORE_REQUIRED");
  if (typeof transitionVerifier !== "function") throw new Error("ACTIVATION_TRANSITION_VERIFIER_REQUIRED");
  if (!Number.isSafeInteger(expectedRevision) || expectedRevision < 0) throw new Error("ACTIVATION_EXPECTED_REVISION_REQUIRED");
  requireString(activationId, "ACTIVATION_ID_REQUIRED");
  const records = activationRecords(store, activationId);
  const existing = records.at(-1);
  if (!existing
    || existing.schema_version !== CURRENT_ACTIVATION_SCHEMA_VERSION
    || existing.payload?.schema_version !== CURRENT_ACTIVATION_SCHEMA_VERSION
    || existing.payload?.mode !== "ready"
    || existing.payload?.cycle_step !== ACTIVATION_CYCLE.length - 1
    || existing.payload?.candidate_fingerprint !== candidateFingerprint
    || existing.payload?.activation_id !== activationId
    || existing.payload?.release_prerequisite_fingerprint !== prerequisites.fingerprint) {
    throw new Error("ACTIVATION_READY_RECORD_REQUIRED");
  }
  const authorityEpoch = existing.payload.authority_epoch;
  if (!Number.isSafeInteger(authorityEpoch) || authorityEpoch < 0) throw new Error("ACTIVATION_AUTHORITY_EPOCH_INVALID");
  const candidateDefinition = validateCandidateDefinition(existing.payload.candidate_definition, { candidateFingerprint, prerequisiteFingerprint: prerequisites.fingerprint });
  const proofSummary = verifyReleaseProofs({ candidateFingerprint, candidateDefinition, proofs, proofVerifier, now });
  if (proofSummary.status !== "passed" || proofSummary.candidate_fingerprint !== candidateFingerprint) throw new Error("ACTIVATION_RELEASE_PROOF_INVALID");
  const activation = advanceActivation(
    { ...existing.payload, evidence: existing.payload.transition_evidence ?? [] },
    {
      nextMode: "enforced",
      candidateFingerprint,
      evidenceFingerprint: digest({ nextMode: "enforced", release: proofSummary.fingerprint }),
      nextRevision: existing.record_revision + 1,
      previousRecordRevision: existing.record_revision,
      previousRecordContentFingerprint: existing.content_fp,
      activationId,
    },
  );
  const activatedAt = new Date(Date.parse(now)).toISOString();
  const recordId = `${activationId}-${candidateFingerprint.slice(0, 24)}`;
  const activationRecord = {
    schema_version: CURRENT_ACTIVATION_SCHEMA_VERSION,
    activation_id: activationId,
    authority_epoch: authorityEpoch,
    revision: existing.payload.revision + 1,
    mode: "enforced",
    candidate_fingerprint: candidateFingerprint,
    cycle_id: activation.cycle_id,
    cycle_start_revision: activation.cycle_start_revision,
    cycle_step: activation.cycle_step,
    previous_record_revision: activation.previous_record_revision,
    previous_record_content_fingerprint: activation.previous_record_content_fingerprint,
    evidence: REQUIRED_PROOFS.map((kind) => ({ kind, status: "passed", candidate_fingerprint: candidateFingerprint, fingerprint: proofSummary.verified_proofs[kind].proof_fingerprint })),
    correctness: { status: "passed", fingerprint: proofSummary.fingerprint },
    release_prerequisite_fingerprint: prerequisites.fingerprint,
    candidate_definition: candidateDefinition,
    signed_release_proofs: structuredClone(proofs),
    signed_transition_proofs: structuredClone(existing.payload.signed_transition_proofs),
    activated_at: activatedAt,
    transition_evidence: activation.evidence,
    proof_summary: proofSummary,
  };
  const proposedRecord = { id: recordId, kind: "NextWorkflowActivation", schema_version: CURRENT_ACTIVATION_SCHEMA_VERSION, record_revision: activationRecord.revision, authority_scope: "release", lineage_id: activationId, lifecycle_state: "enforced", payload: activationRecord, source_revision: String(existing.record_revision), policy_fp: proofSummary.fingerprint, input_fp: candidateFingerprint, content_fp: digest(activationRecord) };
  const cycleHistory = [...currentCycleHistory(records, activationRecord), proposedRecord];
  const committed = store.persistActivationLifecycle({
    expectedRevision,
    authorityEpoch,
    activationId,
    expectedMode: "ready",
    nextMode: "enforced",
    candidateFingerprint,
    record: proposedRecord,
    event: { event_id: `activation-${proofSummary.fingerprint.slice(0, 24)}`, aggregate_id: recordId, event_type: "NEXT_WORKFLOW_ACTIVATED", payload: { activation_id: activationId, candidate_fingerprint: candidateFingerprint, authority_epoch: authorityEpoch, proof_summary_fingerprint: proofSummary.fingerprint } },
    verifier: {
      trusted: true,
      independent: true,
      verifier_id: "activation-release-proof-verifier",
      verify({ current_record: lockedCurrent, proposed_record: proposedRecord, fingerprint, now: lockedNow }) {
        if (lockedCurrent?.payload?.mode !== "ready"
          || lockedCurrent.payload.candidate_fingerprint !== candidateFingerprint
          || lockedCurrent.payload.authority_epoch !== authorityEpoch
          || lockedCurrent.content_fp !== existing.content_fp
          || proposedRecord.payload?.mode !== "enforced"
          || canonicalJson(proposedRecord.payload?.signed_transition_proofs) !== canonicalJson(lockedCurrent.payload.signed_transition_proofs)) return false;
        try {
          const atomicVerification = verifyEnforcedActivationRecord({ record: proposedRecord.payload, cycleHistory, proofVerifier, transitionVerifier, expectedRevocationEpoch: authorityEpoch, now: lockedNow });
          return atomicVerification.trusted === true && proposedRecord.policy_fp === proposedRecord.payload.proof_summary.fingerprint
            ? { verified: true, verifier_id: "activation-release-proof-verifier", fingerprint, proof_fingerprint: proposedRecord.payload.proof_summary.fingerprint }
            : false;
        } catch {
          return false;
        }
      }
    }
  });
  return { ...activationRecord, activation_record_id: recordId, store_revision: committed.revision };
}

export async function persistActivationTransition({ store, expectedRevision, candidateFingerprint, candidateDefinition, nextMode, evidence, transitionVerifier, releasePrerequisites, now = new Date().toISOString(), activationId = "next-development-workflow" }) {
  const prerequisites = validateReleasePrerequisites(releasePrerequisites);
  if (!store || typeof store.persistActivationLifecycle !== "function") throw new Error("ACTIVATION_STORE_REQUIRED");
  if (!Number.isSafeInteger(expectedRevision) || expectedRevision < 0) throw new Error("ACTIVATION_EXPECTED_REVISION_REQUIRED");
  if (!/^[a-f0-9]{64}$/.test(candidateFingerprint ?? "")) throw new Error("ACTIVATION_CANDIDATE_INVALID");
  if (!Number.isFinite(Date.parse(now))) throw new Error("ACTIVATION_TRANSITION_TIME_INVALID");
  const records = activationRecords(store, activationId);
  const currentRecord = records.at(-1);
  const current = currentRecord?.payload ?? { schema_version: "1.0.0", activation_id: activationId, revision: 0, mode: "planned", candidate_fingerprint: null, evidence: [] };
  const authorityEpoch = currentRecord ? current.authority_epoch : store.revocation_epoch;
  if (!Number.isSafeInteger(authorityEpoch) || authorityEpoch < 0) throw new Error("ACTIVATION_AUTHORITY_EPOCH_INVALID");
  if (current.activation_id !== activationId || current.mode === "rolled_back") throw new Error("ACTIVATION_TRANSITION_TARGET_INVALID");
  if (current.revision > 0 && current.release_prerequisite_fingerprint !== prerequisites.fingerprint) throw new Error("ACTIVATION_PREREQUISITE_DRIFT");
  const effectiveCandidateDefinition = validateCandidateDefinition(candidateDefinition ?? current.candidate_definition, { candidateFingerprint, prerequisiteFingerprint: prerequisites.fingerprint });
  const candidateRestart = nextMode === "shadow" && current.candidate_fingerprint && current.candidate_fingerprint !== candidateFingerprint;
  if (current.candidate_definition && canonicalJson(current.candidate_definition) !== canonicalJson(effectiveCandidateDefinition) && !candidateRestart) throw new Error("ACTIVATION_CANDIDATE_DEFINITION_DRIFT");
  if (currentRecord && !candidateRestart && current.schema_version !== CURRENT_ACTIVATION_SCHEMA_VERSION) throw new Error("ACTIVATION_LEGACY_CYCLE_CONTINUATION_FORBIDDEN");
  const verifiedEvidence = verifyTransitionEvidence({ nextMode, candidateFingerprint, repositoryHead: effectiveCandidateDefinition.repository_head, evidence, transitionVerifier, now });
  if (verifiedEvidence.evidence.acceptance_prerequisite_fingerprint !== prerequisites.fingerprint) throw new Error("ACTIVATION_TRANSITION_PREREQUISITE_MISMATCH");
  const revision = current.revision + 1;
  const advanced = advanceActivation(
    { ...current, evidence: current.transition_evidence ?? [] },
    {
      nextMode,
      candidateFingerprint,
      evidenceFingerprint: verifiedEvidence.fingerprint,
      nextRevision: revision,
      previousRecordRevision: currentRecord?.record_revision ?? 0,
      previousRecordContentFingerprint: currentRecord?.content_fp ?? null,
      activationId,
    },
  );
  if (advanced.decision === "STOP") throw new Error(`ACTIVATION_TRANSITION_BLOCKED:${advanced.reason}`);
  const effectiveMode = advanced.mode;
  const sameCandidate = current.candidate_fingerprint === candidateFingerprint;
  const payload = { schema_version: CURRENT_ACTIVATION_SCHEMA_VERSION, activation_id: activationId, authority_epoch: authorityEpoch, revision, mode: effectiveMode, candidate_fingerprint: candidateFingerprint, candidate_definition: effectiveCandidateDefinition, release_prerequisite_fingerprint: prerequisites.fingerprint, cycle_id: advanced.cycle_id, cycle_start_revision: advanced.cycle_start_revision, cycle_step: advanced.cycle_step, previous_record_revision: advanced.previous_record_revision, previous_record_content_fingerprint: advanced.previous_record_content_fingerprint, evidence: sameCandidate ? (current.evidence ?? []) : [], signed_transition_proofs: [...(sameCandidate ? (current.signed_transition_proofs ?? []) : []), structuredClone(evidence)], transition_evidence: advanced.evidence.map((item, index) => index === advanced.evidence.length - 1 ? { ...item, kind: nextMode, owner: verifiedEvidence.owner, verifier: verifiedEvidence.verifier, candidate_fingerprint: candidateFingerprint, fresh_until: verifiedEvidence.fresh_until, correctness_fingerprint: verifiedEvidence.correctness.fingerprint, verification_fingerprint: verifiedEvidence.verification_fingerprint } : item), decision: advanced.decision, ...(advanced.reason ? { reason: advanced.reason } : {}), transitioned_at: new Date(Date.parse(now)).toISOString() };
  const recordId = `${activationId}-${candidateFingerprint.slice(0, 24)}-${effectiveMode}`;
  const proposedRecord = { id: recordId, kind: "NextWorkflowActivation", schema_version: CURRENT_ACTIVATION_SCHEMA_VERSION, record_revision: revision, authority_scope: "release", lineage_id: activationId, lifecycle_state: effectiveMode, payload, source_revision: String(currentRecord?.record_revision ?? 0), policy_fp: verifiedEvidence.verification_fingerprint, input_fp: candidateFingerprint, content_fp: digest(payload) };
  const committed = store.persistActivationLifecycle({
    expectedRevision,
    authorityEpoch,
    activationId,
    expectedMode: current.mode,
    nextMode: effectiveMode,
    candidateFingerprint,
    record: proposedRecord,
    event: { event_id: `activation-transition-${revision}-${candidateFingerprint.slice(0, 16)}`, aggregate_id: recordId, event_type: "NEXT_WORKFLOW_ACTIVATION_TRANSITIONED", payload: { activation_id: activationId, candidate_fingerprint: candidateFingerprint, authority_epoch: authorityEpoch, from_mode: current.mode, requested_mode: nextMode, to_mode: effectiveMode, evidence_fingerprint: verifiedEvidence.fingerprint, verification_fingerprint: verifiedEvidence.verification_fingerprint } },
    verifier: {
      trusted: true,
      independent: true,
      verifier_id: `activation-transition-verifier:${evidence.verifier}`,
      verify({ current_record: lockedCurrent, proposed_record: proposedRecord, fingerprint, now: lockedNow }) {
        if ((lockedCurrent?.payload?.mode ?? "planned") !== current.mode
          || (lockedCurrent?.content_fp ?? null) !== (currentRecord?.content_fp ?? null)
          || proposedRecord.payload?.candidate_fingerprint !== candidateFingerprint
          || proposedRecord.payload?.mode !== effectiveMode) return false;
        const atomicEvidence = verifyTransitionEvidence({ nextMode, candidateFingerprint, repositoryHead: effectiveCandidateDefinition.repository_head, evidence, transitionVerifier, now: lockedNow });
        return atomicEvidence.verification_fingerprint === proposedRecord.policy_fp
          ? { verified: true, verifier_id: `activation-transition-verifier:${evidence.verifier}`, fingerprint, proof_fingerprint: atomicEvidence.verification_fingerprint }
          : false;
      }
    }
  });
  return { ...payload, activation_record_id: recordId, store_revision: committed.revision };
}

export async function rollbackActivation({ store, expectedRevision, candidateFingerprint, evidence, rollbackVerifier, effectDisposer, stateRestorer, legacyVerifier, now = new Date().toISOString(), activationId = "next-development-workflow" }) {
  if (!store || typeof store.persistActivationLifecycle !== "function") throw new Error("ACTIVATION_STORE_REQUIRED");
  if (!Number.isSafeInteger(expectedRevision) || expectedRevision < 0) throw new Error("ACTIVATION_EXPECTED_REVISION_REQUIRED");
  const timestamp = Date.parse(now);
  if (!Number.isFinite(timestamp)) throw new Error("ACTIVATION_ROLLBACK_TIME_INVALID");
  if (!evidence || typeof evidence !== "object" || !rollbackVerifier || rollbackVerifier.independent !== true || typeof rollbackVerifier.verifier_id !== "string" || typeof rollbackVerifier.verify !== "function" || typeof stateRestorer !== "function" || typeof legacyVerifier !== "function") throw new Error("ACTIVATION_ROLLBACK_COORDINATOR_REQUIRED");
  const records = activationRecords(store, activationId);
  const current = records.at(-1);
  if (!current || current.payload?.mode !== "enforced" || current.payload.candidate_fingerprint !== candidateFingerprint || current.payload.activation_id !== activationId) throw new Error("ACTIVATION_ROLLBACK_TARGET_INVALID");
  if (store.revision !== expectedRevision) throw new Error("REVISION_CONFLICT");
  let rollback = beginRollback({ candidateFingerprint, expectedEpoch: store.fence({ reason: `activation-rollback:${candidateFingerprint}` }).revocation_epoch - 1 });
  const verifiedSteps = [];
  function persistStep(step, proofFingerprint, status = "verified", details = {}) {
    const stepRevision = store.revision + 1;
    const stepId = `rollback-${candidateFingerprint.slice(0, 16)}-${stepRevision}-${step.toLowerCase()}`;
    store.commit({ expectedRevision: store.revision, records: [{ id: stepId, kind: "RollbackCheckpoint", schema_version: "1.0.0", record_revision: stepRevision, authority_scope: "release", lineage_id: `rollback-${candidateFingerprint}`, lifecycle_state: status, payload: { candidate_fingerprint: candidateFingerprint, state: step, status, authority_epoch: rollback.authority_epoch, proof_fingerprint: proofFingerprint, ...details }, source_revision: String(current.record_revision), policy_fp: proofFingerprint, input_fp: candidateFingerprint }], events: [{ event_id: `event-${stepId}`, aggregate_id: stepId, event_type: status === "verified" ? "ROLLBACK_STEP_VERIFIED" : "ROLLBACK_MANUAL_RECOVERY_REQUIRED", payload: { candidate_fingerprint: candidateFingerprint, state: step, status, proof_fingerprint: proofFingerprint } }] });
    return stepId;
  }
  async function verifyStep(step, stepEvidence) {
    const candidate = { step, candidate_fingerprint: candidateFingerprint, authority_epoch: rollback.authority_epoch, evidence: stepEvidence };
    const verification = await rollbackVerifier.verify({ ...structuredClone(candidate), request_evidence: structuredClone(evidence) });
    if (!verification || verification.verified !== true || verification.verifier_id !== rollbackVerifier.verifier_id || verification.step !== step || verification.candidate_fingerprint !== candidateFingerprint || typeof verification.proof_fingerprint !== "string") throw new Error(`ACTIVATION_ROLLBACK_STEP_INVALID:${step}`);
    verifiedSteps.push({ state: step, proof_fingerprint: verification.proof_fingerprint, evidence_fingerprint: digest(stepEvidence) });
    persistStep(step, verification.proof_fingerprint);
    return verification;
  }
  await verifyStep("FENCING", { authority_epoch: rollback.authority_epoch });
  let unresolved = store.listUnresolvedEffects();
  if (unresolved.length > 0 && typeof effectDisposer === "function") await effectDisposer({ store, unresolved: structuredClone(unresolved), authority_epoch: rollback.authority_epoch, candidate_fingerprint: candidateFingerprint });
  unresolved = store.listUnresolvedEffects();
  if (unresolved.length > 0) {
    persistStep("MANUAL_RECOVERY_REQUIRED", digest(unresolved), "blocked", { blocker: "UNRESOLVED_EFFECTS", unresolved_effect_ids: unresolved.map((item) => item.effect_id) });
    throw new Error("ACTIVATION_ROLLBACK_UNRESOLVED_EFFECTS");
  }
  let verification = await verifyStep("DRAINING_OR_QUARANTINING", { unresolved_effects: 0 });
  rollback = advanceRollback(rollback, { nextState: "DRAINING_OR_QUARANTINING", evidenceFingerprint: verification.proof_fingerprint, verified: true });
  const restored = await stateRestorer({ candidate_fingerprint: candidateFingerprint, authority_epoch: rollback.authority_epoch, request_evidence: structuredClone(evidence) });
  if (!restored || restored.restored !== true || typeof restored.fingerprint !== "string") {
    persistStep("MANUAL_RECOVERY_REQUIRED", digest(restored ?? null), "blocked", { blocker: "STATE_RESTORE_FAILED" });
    throw new Error("ACTIVATION_ROLLBACK_STATE_RESTORE_FAILED");
  }
  verification = await verifyStep("STATE_RESTORED", restored);
  rollback = advanceRollback(rollback, { nextState: "STATE_RESTORED", evidenceFingerprint: verification.proof_fingerprint, verified: true, unresolvedEffects: store.listUnresolvedEffects().length });
  const legacy = await legacyVerifier({ candidate_fingerprint: candidateFingerprint, restored: structuredClone(restored), request_evidence: structuredClone(evidence) });
  if (!legacy || legacy.verified !== true || typeof legacy.fingerprint !== "string") {
    persistStep("MANUAL_RECOVERY_REQUIRED", digest(legacy ?? null), "blocked", { blocker: "LEGACY_VERIFICATION_FAILED" });
    throw new Error("ACTIVATION_ROLLBACK_LEGACY_VERIFICATION_FAILED");
  }
  verification = await verifyStep("LEGACY_VERIFIED", legacy);
  rollback = advanceRollback(rollback, { nextState: "LEGACY_VERIFIED", evidenceFingerprint: verification.proof_fingerprint, verified: true });
  const finalRollbackEvidence = { rollback_fingerprint: digest(rollback), legacy_fingerprint: legacy.fingerprint };
  verification = await verifyStep("ROLLED_BACK", finalRollbackEvidence);
  rollback = advanceRollback(rollback, { nextState: "ROLLED_BACK", evidenceFingerprint: verification.proof_fingerprint, verified: true });
  const revision = current.payload.revision + 1;
  const rolledBackAt = new Date(timestamp).toISOString();
  const legacyCurrent = current.payload.schema_version === "1.0.0";
  const cycleStartRevision = legacyCurrent ? 1 : current.payload.cycle_start_revision;
  const cycleId = legacyCurrent
    ? activationCycleId({
      activationId,
      candidateFingerprint,
      cycleStartRevision,
      previousRecordRevision: 0,
      previousRecordContentFingerprint: null,
    })
    : current.payload.cycle_id;
  const payload = {
    ...structuredClone(current.payload),
    schema_version: CURRENT_ACTIVATION_SCHEMA_VERSION,
    authority_epoch: rollback.authority_epoch,
    revision,
    mode: "rolled_back",
    cycle_id: cycleId,
    cycle_start_revision: cycleStartRevision,
    cycle_step: ACTIVATION_CYCLE.length + 1,
    previous_record_revision: current.record_revision,
    previous_record_content_fingerprint: current.content_fp,
    rolled_back_at: rolledBackAt,
    rollback_evidence: { request_fingerprint: digest(evidence), authority_epoch: rollback.authority_epoch, steps: verifiedSteps, rollback_fingerprint: digest(rollback) },
  };
  const recordId = `${activationId}-${candidateFingerprint.slice(0, 24)}-rollback-${revision}`;
  const proposedRecord = { id: recordId, kind: "NextWorkflowActivation", schema_version: CURRENT_ACTIVATION_SCHEMA_VERSION, record_revision: revision, authority_scope: "release", lineage_id: activationId, lifecycle_state: "rolled_back", payload, source_revision: String(current.record_revision), policy_fp: verification.proof_fingerprint, input_fp: candidateFingerprint, content_fp: digest(payload) };
  const committed = store.persistActivationLifecycle({
    expectedRevision: store.revision,
    authorityEpoch: rollback.authority_epoch,
    activationId,
    expectedMode: "enforced",
    nextMode: "rolled_back",
    candidateFingerprint,
    record: proposedRecord,
    event: { event_id: `activation-rollback-${digest({ candidateFingerprint, revision, rollback: payload.rollback_evidence.rollback_fingerprint }).slice(0, 24)}`, aggregate_id: recordId, event_type: "NEXT_WORKFLOW_ROLLED_BACK", payload: { activation_id: activationId, candidate_fingerprint: candidateFingerprint, rollback_evidence_fingerprint: payload.rollback_evidence.rollback_fingerprint, authority_epoch: rollback.authority_epoch } },
    verifier: {
      trusted: true,
      independent: true,
      verifier_id: rollbackVerifier.verifier_id,
      verify({ current_record: lockedCurrent, proposed_record: proposedRecord, fingerprint }) {
        if (lockedCurrent?.payload?.mode !== "enforced" || proposedRecord.payload?.mode !== "rolled_back") return false;
        const atomicVerification = rollbackVerifier.verify({ step: "ROLLED_BACK", candidate_fingerprint: candidateFingerprint, authority_epoch: rollback.authority_epoch, evidence: finalRollbackEvidence, request_evidence: structuredClone(evidence) });
        if (atomicVerification && typeof atomicVerification.then === "function") return false;
        return atomicVerification?.verified === true && atomicVerification.verifier_id === rollbackVerifier.verifier_id && atomicVerification.proof_fingerprint === proposedRecord.policy_fp
          ? { verified: true, verifier_id: rollbackVerifier.verifier_id, fingerprint, proof_fingerprint: atomicVerification.proof_fingerprint }
          : false;
      }
    }
  });
  return { ...payload, activation_record_id: recordId, store_revision: committed.revision };
}

export function releaseDigest(value) {
  return digest(value);
}
