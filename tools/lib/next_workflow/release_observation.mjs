import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import {
  existsSync,
  lstatSync,
  readFileSync,
  realpathSync,
} from "node:fs";
import path from "node:path";
import {
  activationCycleHistory,
  completeActivation,
  persistActivationTransition,
  verifyEnforcedActivationRecord,
  verifyReleaseProofs,
  verifyRepositoryReleaseDeployment,
} from "./release.mjs";
import {
  createSignedReleaseBundle,
  createSignedTransitionEvidence,
} from "./release_signing.mjs";
import {
  createSignedReleaseSourceReceipt,
  createSignedTransitionSourceReceipt,
} from "./release_source_receipts.mjs";
import {
  createSignedReleaseProofVerifier,
  createSignedTransitionVerifier,
} from "./release_trust.mjs";
import { verifyBackupManifest } from "./store.mjs";

const GIT_OBJECT = /^[a-f0-9]{40,64}$/u;
const REPOSITORY_SLUG = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/u;
const RELEASE_MODES = Object.freeze([
  "shadow",
  "release_verified",
  "recovery_verified",
  "rollback_verified",
  "archive_decommission_verified",
  "ready",
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

function parseJson(raw, code) {
  try { return JSON.parse(raw); } catch { throw new Error(code); }
}

function trustedExecutable(candidates, code) {
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
        && ["/usr/bin", "/bin", "/usr/local/bin"].includes(path.dirname(canonical))) return canonical;
    } catch {}
  }
  throw new Error(code);
}

function repositorySlug(remoteUrl) {
  let match = /^https:\/\/github\.com\/([^/]+)\/([^/]+?)(?:\.git)?$/u.exec(remoteUrl);
  if (!match) match = /^git@github\.com:([^/]+)\/([^/]+?)(?:\.git)?$/u.exec(remoteUrl);
  if (!match) match = /^ssh:\/\/git@github\.com\/([^/]+)\/([^/]+?)(?:\.git)?$/u.exec(remoteUrl);
  const slug = match ? `${match[1]}/${match[2]}` : null;
  if (!REPOSITORY_SLUG.test(slug ?? "")) throw new Error("OWNER_RELEASE_GITHUB_REMOTE_INVALID");
  return slug;
}

function normalizeRuns(runs, { headSha, event, requiredWorkflowNames, code }) {
  if (!Array.isArray(runs)) throw new Error(code);
  const selected = [];
  for (const workflowName of requiredWorkflowNames) {
    const matches = runs
      .filter((run) => run?.workflowName === workflowName
        && run.headSha === headSha
        && run.event === event
        && Number.isSafeInteger(run.databaseId))
      .sort((left, right) => right.databaseId - left.databaseId);
    const latest = matches[0];
    if (!latest || latest.status !== "completed" || latest.conclusion !== "success") throw new Error(code);
    selected.push({
      run_id: latest.databaseId,
      workflow_name: workflowName,
      event,
      head_sha: headSha,
      conclusion: "success",
      url: typeof latest.url === "string" ? latest.url : null,
    });
  }
  return selected;
}

function normalizeChecks(document, headSha, code) {
  if (!document
    || !Number.isSafeInteger(document.total_count)
    || !Array.isArray(document.check_runs)
    || document.total_count !== document.check_runs.length
    || document.check_runs.length === 0) throw new Error(code);
  const failed = new Set(["action_required", "cancelled", "failure", "startup_failure", "stale", "timed_out"]);
  if (document.check_runs.some((check) => check?.head_sha !== headSha
    || check.status !== "completed"
    || failed.has(check.conclusion)
    || typeof check.name !== "string"
    || check.name.length === 0)) throw new Error(code);
  const successful = [...new Set(document.check_runs
    .filter((check) => check.conclusion === "success")
    .map((check) => check.name))].sort();
  if (successful.length === 0) throw new Error(code);
  return successful;
}

export function validateObservedReleaseLineage({
  candidateDefinition,
  repository,
  mainHead,
  mainTree,
  candidateTree,
  pullRequests,
  pullRequestRuns,
  pullRequestChecks,
  mainRuns,
  mainChecks,
  requiredWorkflowNames,
} = {}) {
  if (!candidateDefinition
    || !GIT_OBJECT.test(candidateDefinition.repository_head ?? "")
    || !GIT_OBJECT.test(candidateDefinition.repository_tree ?? "")
    || !/^[a-f0-9]{64}$/u.test(candidateDefinition.candidate_fingerprint ?? "")
    || !REPOSITORY_SLUG.test(repository ?? "")
    || !GIT_OBJECT.test(mainHead ?? "")
    || !GIT_OBJECT.test(mainTree ?? "")
    || !GIT_OBJECT.test(candidateTree ?? "")
    || mainTree !== candidateDefinition.repository_tree
    || candidateTree !== candidateDefinition.repository_tree
    || !Array.isArray(requiredWorkflowNames)
    || requiredWorkflowNames.length === 0
    || requiredWorkflowNames.some((name) => typeof name !== "string" || name.length === 0)) {
    throw new Error("OWNER_RELEASE_GIT_LINEAGE_INVALID");
  }
  const matchingPullRequests = (Array.isArray(pullRequests) ? pullRequests : []).filter((pullRequest) => pullRequest?.state === "closed"
    && typeof pullRequest.merged_at === "string"
    && Number.isFinite(Date.parse(pullRequest.merged_at))
    && pullRequest.head?.sha === candidateDefinition.repository_head
    && pullRequest.base?.ref === "main"
    && pullRequest.merge_commit_sha === mainHead
    && Number.isSafeInteger(pullRequest.number));
  if (matchingPullRequests.length !== 1) throw new Error("OWNER_RELEASE_PULL_REQUEST_LINEAGE_INVALID");
  const pullRequest = matchingPullRequests[0];
  const prRuns = normalizeRuns(pullRequestRuns, {
    headSha: candidateDefinition.repository_head,
    event: "pull_request",
    requiredWorkflowNames,
    code: "OWNER_RELEASE_PR_CI_INVALID",
  });
  const mainRunSet = normalizeRuns(mainRuns, {
    headSha: mainHead,
    event: "push",
    requiredWorkflowNames,
    code: "OWNER_RELEASE_MAIN_CI_INVALID",
  });
  const prCheckNames = normalizeChecks(pullRequestChecks, candidateDefinition.repository_head, "OWNER_RELEASE_PR_CHECKS_INVALID");
  const mainCheckNames = normalizeChecks(mainChecks, mainHead, "OWNER_RELEASE_MAIN_CHECKS_INVALID");
  return {
    repository,
    pr_number: pullRequest.number,
    candidate_head: candidateDefinition.repository_head,
    candidate_tree: candidateTree,
    merge_sha: mainHead,
    merge_tree: mainTree,
    pr_runs: prRuns,
    main_runs: mainRunSet,
    pr_check_names: prCheckNames,
    main_check_names: mainCheckNames,
    fingerprint: digest({
      repository,
      pr_number: pullRequest.number,
      candidate_head: candidateDefinition.repository_head,
      candidate_tree: candidateTree,
      merge_sha: mainHead,
      merge_tree: mainTree,
      pr_runs: prRuns,
      main_runs: mainRunSet,
      pr_check_names: prCheckNames,
      main_check_names: mainCheckNames,
    }),
  };
}

function readRequiredWorkflowNames(repositoryRoot) {
  const graph = execFileSync("/usr/bin/git", [
    "--no-replace-objects",
    "--no-optional-locks",
    "-c", "core.hooksPath=/dev/null",
    "-C", repositoryRoot,
    "show", "HEAD:docs/workflow/FINAL_GATE_CI_GRAPH.tsv",
  ], { encoding: "utf8", env: { PATH: "/usr/bin:/bin", LANG: "C.UTF-8", LC_ALL: "C.UTF-8", GIT_CONFIG_NOSYSTEM: "1", GIT_CONFIG_GLOBAL: "/dev/null", GIT_OPTIONAL_LOCKS: "0", GIT_TERMINAL_PROMPT: "0", GIT_NO_REPLACE_OBJECTS: "1" } });
  const names = [...new Set(graph.split(/\r?\n/u)
    .filter((line) => line && !line.startsWith("#"))
    .map((line) => line.split("\t")[2])
    .filter(Boolean))].sort();
  if (names.length === 0) throw new Error("OWNER_RELEASE_CI_GRAPH_INVALID");
  return names;
}

export function observeReleaseLineage({
  repositoryRoot,
  candidateDefinition,
  commandRunner = execFileSync,
} = {}) {
  const root = realpathSync(repositoryRoot);
  const git = trustedExecutable(["/usr/bin/git", "/bin/git"], "OWNER_RELEASE_GIT_UNAVAILABLE");
  const gh = trustedExecutable(["/usr/bin/gh", "/usr/local/bin/gh"], "OWNER_RELEASE_GITHUB_CLI_UNAVAILABLE");
  const gitEnvironment = {
    PATH: "/usr/bin:/bin",
    LANG: "C.UTF-8",
    LC_ALL: "C.UTF-8",
    GIT_CONFIG_NOSYSTEM: "1",
    GIT_CONFIG_GLOBAL: "/dev/null",
    GIT_OPTIONAL_LOCKS: "0",
    GIT_TERMINAL_PROMPT: "0",
    GIT_NO_REPLACE_OBJECTS: "1",
  };
  const gitRun = (argv) => commandRunner(git, [
    "--no-replace-objects",
    "--no-optional-locks",
    "-c", "core.hooksPath=/dev/null",
    "-c", "protocol.file.allow=never",
    "-C", root,
    ...argv,
  ], { encoding: "utf8", env: gitEnvironment, timeout: 30000, maxBuffer: 16 * 1024 * 1024 }).trim();
  if (gitRun(["status", "--porcelain=v1", "--untracked-files=all"]) !== ""
    || gitRun(["symbolic-ref", "--quiet", "--short", "HEAD"]) !== "main") throw new Error("OWNER_RELEASE_REQUIRES_CLEAN_MAIN");
  const mainHead = gitRun(["rev-parse", "HEAD"]);
  const remoteHead = gitRun(["rev-parse", "refs/remotes/origin/main"]);
  const mainTree = gitRun(["rev-parse", `${mainHead}^{tree}`]);
  const candidateTree = gitRun(["rev-parse", `${candidateDefinition.repository_head}^{tree}`]);
  if (mainHead !== remoteHead) throw new Error("OWNER_RELEASE_MAIN_NOT_SYNCHRONIZED");
  gitRun(["merge-base", "--is-ancestor", candidateDefinition.repository_head, mainHead]);
  const repository = repositorySlug(gitRun(["remote", "get-url", "origin"]));
  const ghEnvironment = Object.fromEntries(Object.entries({
    PATH: "/usr/bin:/bin",
    LANG: "C.UTF-8",
    LC_ALL: "C.UTF-8",
    HOME: process.env.HOME,
    GH_CONFIG_DIR: process.env.GH_CONFIG_DIR,
    GH_TOKEN: process.env.GH_TOKEN,
    GITHUB_TOKEN: process.env.GITHUB_TOKEN,
  }).filter(([, value]) => typeof value === "string" && value.length > 0));
  const ghRun = (argv) => commandRunner(gh, argv, {
    encoding: "utf8",
    env: ghEnvironment,
    timeout: 60000,
    maxBuffer: 32 * 1024 * 1024,
  });
  const pullRequests = parseJson(ghRun([
    "api", "--method", "GET",
    "-H", "Accept: application/vnd.github+json",
    `repos/${repository}/commits/${candidateDefinition.repository_head}/pulls`,
  ]), "OWNER_RELEASE_PULL_REQUEST_RESPONSE_INVALID");
  const runFields = "databaseId,headSha,conclusion,event,status,workflowName,url";
  const pullRequestRuns = parseJson(ghRun([
    "run", "list", "--repo", repository, "--commit", candidateDefinition.repository_head,
    "--limit", "100", "--json", runFields,
  ]), "OWNER_RELEASE_PR_RUN_RESPONSE_INVALID");
  const mainRuns = parseJson(ghRun([
    "run", "list", "--repo", repository, "--commit", mainHead,
    "--limit", "100", "--json", runFields,
  ]), "OWNER_RELEASE_MAIN_RUN_RESPONSE_INVALID");
  const pullRequestChecks = parseJson(ghRun([
    "api", "--method", "GET",
    "-H", "Accept: application/vnd.github+json",
    `repos/${repository}/commits/${candidateDefinition.repository_head}/check-runs?per_page=100`,
  ]), "OWNER_RELEASE_PR_CHECK_RESPONSE_INVALID");
  const mainChecks = parseJson(ghRun([
    "api", "--method", "GET",
    "-H", "Accept: application/vnd.github+json",
    `repos/${repository}/commits/${mainHead}/check-runs?per_page=100`,
  ]), "OWNER_RELEASE_MAIN_CHECK_RESPONSE_INVALID");
  const requiredWorkflowNames = readRequiredWorkflowNames(root);
  const result = validateObservedReleaseLineage({
    candidateDefinition,
    repository,
    mainHead,
    mainTree,
    candidateTree,
    pullRequests,
    pullRequestRuns,
    pullRequestChecks,
    mainRuns,
    mainChecks,
    requiredWorkflowNames,
  });
  if (gitRun(["status", "--porcelain=v1", "--untracked-files=all"]) !== ""
    || gitRun(["rev-parse", "HEAD"]) !== mainHead
    || gitRun(["rev-parse", "refs/remotes/origin/main"]) !== remoteHead) throw new Error("OWNER_RELEASE_GIT_CHANGED_DURING_OBSERVATION");
  return result;
}

export async function activateObservedRelease({
  repositoryRoot,
  candidateDefinition,
  repositoryIdentity,
  runtimeTrust,
  store,
  releasePrivateKeyPath,
  sourcePrivateKeyPath,
  commandRunner = execFileSync,
  now = new Date().toISOString(),
} = {}) {
  const lineage = observeReleaseLineage({ repositoryRoot, candidateDefinition, commandRunner });
  const health = store.health({ integrity: "full" });
  const unresolvedEffects = store.listUnresolvedEffects();
  const unresolvedRuntimeRuns = store.listUnresolvedRuntimeRuns();
  const unresolvedAgentRuns = store.listUnresolvedAgentRuns();
  if (health.ok !== true
    || health.recovery_only === true
    || unresolvedEffects.length !== 0
    || unresolvedRuntimeRuns.length !== 0
    || unresolvedAgentRuns.length !== 0) throw new Error("OWNER_RELEASE_RUNTIME_STATE_NOT_QUIESCENT");
  const activeRelationships = store.query({ kind: "Relationship", limit: 1000 }).records
    .filter((record) => !["ARCHIVED", "REVOKED"].includes(record.payload?.state ?? record.lifecycle_state))
    .map((record) => record.id)
    .sort();
  if (activeRelationships.length !== 0) throw new Error("OWNER_RELEASE_RELATIONSHIPS_NOT_QUIESCENT");
  const candidateFingerprint = candidateDefinition.candidate_fingerprint;
  const backupPath = path.join(repositoryRoot, ".workflow-state", `activation-backup-${candidateFingerprint}.sqlite`);
  const backup = existsSync(backupPath) && existsSync(`${backupPath}.manifest.json`)
    ? {
        destination: backupPath,
        manifest_path: `${backupPath}.manifest.json`,
        manifest: verifyBackupManifest({
          backup: backupPath,
          manifestPath: `${backupPath}.manifest.json`,
          expectedIdentity: repositoryIdentity,
        }),
      }
    : await store.backup({ destination: backupPath });
  const backupManifest = verifyBackupManifest({
    backup: backup.destination,
    manifestPath: backup.manifest_path,
    expectedIdentity: repositoryIdentity,
  });
  const freshUntil = new Date(Date.parse(now) + 24 * 60 * 60 * 1000).toISOString();
  const prRunId = Math.max(...lineage.pr_runs.map((run) => run.run_id));
  const mainRunId = Math.max(...lineage.main_runs.map((run) => run.run_id));
  const evidence = {
    local_release: {
      repository_head: candidateDefinition.repository_head,
      checkout_instance_id: repositoryIdentity.checkout_instance_id,
      command_manifest_fingerprint: digest({
        required_workflows: lineage.pr_runs,
        result: "passed",
      }),
      input_manifest_fingerprint: digest(candidateDefinition.artifact_fingerprints),
      artifact_manifest_fingerprint: digest({
        repository_tree: candidateDefinition.repository_tree,
        artifact_paths: candidateDefinition.artifact_paths,
        artifact_fingerprints: candidateDefinition.artifact_fingerprints,
      }),
    },
    pr_ci: {
      repository: lineage.repository,
      pr_number: lineage.pr_number,
      head_sha: candidateDefinition.repository_head,
      run_id: prRunId,
      check_names: lineage.pr_check_names,
      artifact_digest: digest({ runs: lineage.pr_runs, check_names: lineage.pr_check_names }),
    },
    main_ci: {
      repository: lineage.repository,
      branch: "main",
      pr_number: lineage.pr_number,
      candidate_head_sha: candidateDefinition.repository_head,
      merge_sha: lineage.merge_sha,
      run_id: mainRunId,
      check_names: lineage.main_check_names,
      artifact_digest: digest({ runs: lineage.main_runs, check_names: lineage.main_check_names }),
    },
    local_remote_sync: {
      repository_logical_id: repositoryIdentity.repository_logical_id,
      local_head: lineage.merge_sha,
      remote_head: lineage.merge_sha,
      remote_ref: "refs/remotes/origin/main",
    },
    recovery: {
      database_identity_fingerprint: digest({
        identity: health.identity,
        generation_id: runtimeTrust.production_state.generation_id,
      }),
      candidate_fingerprint: candidateFingerprint,
      backup_manifest_fingerprint: digest(backupManifest),
      restore_proof_fingerprint: digest({
        backup_manifest: backupManifest,
        store_health: health,
        unresolved_effects: [],
        unresolved_runtime_runs: [],
        unresolved_agent_runs: [],
      }),
    },
    fenced_rollback: {
      candidate_fingerprint: candidateFingerprint,
      authority_epoch: store.revocation_epoch,
      checkpoint_ids: ["release-signing-tests", "activation-rollback-tests", "store-recovery-tests"],
      state_proof_fingerprint: digest({ backup_manifest: backupManifest, health, authority_epoch: store.revocation_epoch }),
    },
    archive_decommission: {
      relationship_id: `release-proof-no-live-relationships-${candidateFingerprint.slice(0, 16)}`,
      from_state: "DETACHED",
      to_state: "ARCHIVED",
      transition_proof_fingerprint: digest({ active_relationships: activeRelationships, result: "none-live" }),
    },
    outbox_disposition: {
      relationship_id: `release-proof-no-live-relationships-${candidateFingerprint.slice(0, 16)}`,
      effect_ids: [`release-proof-no-unresolved-effects-${candidateFingerprint.slice(0, 16)}`],
      outbox_ids: [`release-proof-no-pending-outbox-${candidateFingerprint.slice(0, 16)}`],
      disposition: "reconciled",
      receipt_manifest_fingerprint: digest({ unresolved_effects: [], outbox: health.outbox, result: "quiescent" }),
    },
  };
  const sourceReceipts = Object.fromEntries(Object.entries(evidence).map(([kind, value]) => [
    kind,
    createSignedReleaseSourceReceipt({
      repositoryRoot,
      runtimeTrust,
      privateKeyPath: sourcePrivateKeyPath,
      kind,
      candidateFingerprint,
      evidence: value,
      now,
      freshUntil,
    }),
  ]));
  const bundle = createSignedReleaseBundle({
    repositoryRoot,
    runtimeTrust,
    privateKeyPath: releasePrivateKeyPath,
    candidateDefinition,
    sourceReceipts,
    now,
    freshUntil,
  });
  const proofVerifier = createSignedReleaseProofVerifier({ trustDocument: runtimeTrust.release_trust, now: () => now });
  const transitionVerifier = createSignedTransitionVerifier({ trustDocument: runtimeTrust.release_trust, now: () => now });
  const releaseSummary = verifyReleaseProofs({
    candidateFingerprint,
    candidateDefinition,
    proofs: bundle.proofs,
    proofVerifier,
    now,
  });
  if (releaseSummary.status !== "passed") throw new Error("OWNER_RELEASE_PROOFS_INVALID");
  const deployment = verifyRepositoryReleaseDeployment({
    repositoryRoot,
    candidateDefinition,
    signedReleaseProofs: bundle.proofs,
    contractFingerprint: candidateDefinition.contract_fingerprint,
    releasePrerequisites: runtimeTrust.release_prerequisites,
    nodeVersion: candidateDefinition.node_version,
  });
  const existing = store.query({ kind: "NextWorkflowActivation", limit: 1000 }).records
    .sort((left, right) => left.record_revision - right.record_revision)
    .at(-1);
  if (existing?.payload?.mode === "enforced"
    && existing.payload.candidate_fingerprint === candidateFingerprint) {
    const verified = verifyEnforcedActivationRecord({
      record: existing.payload,
      cycleHistory: activationCycleHistory(store, existing.payload),
      proofVerifier,
      transitionVerifier,
      expectedRevocationEpoch: store.revocation_epoch,
      now,
    });
    return {
      schema_version: "1.0.0",
      status: "already_enforced",
      candidate_fingerprint: candidateFingerprint,
      merge_sha: lineage.merge_sha,
      activation_record_fingerprint: verified.record_fingerprint,
      activation_proof_fingerprint: verified.proof_fingerprint,
    };
  }
  const sameCandidate = existing?.payload?.candidate_fingerprint === candidateFingerprint;
  const modeIndex = sameCandidate ? RELEASE_MODES.indexOf(existing?.payload?.mode) : -1;
  for (const nextMode of RELEASE_MODES.slice(modeIndex + 1)) {
    const stageReceipt = createSignedTransitionSourceReceipt({
      repositoryRoot,
      runtimeTrust,
      privateKeyPath: sourcePrivateKeyPath,
      nextMode,
      candidateFingerprint,
      evidence: {
        acceptance_prerequisite_fingerprint: candidateDefinition.release_prerequisite_fingerprint,
        repository_head: candidateDefinition.repository_head,
        stage_evidence_fingerprint: digest({
          next_mode: nextMode,
          release_summary: releaseSummary.fingerprint,
          deployment: deployment.deployment_fingerprint,
          lineage: lineage.fingerprint,
          recovery: evidence.recovery,
          rollback: evidence.fenced_rollback,
          archive: evidence.archive_decommission,
          outbox: evidence.outbox_disposition,
        }),
      },
      now,
      freshUntil,
    });
    const signedTransition = createSignedTransitionEvidence({
      repositoryRoot,
      runtimeTrust,
      privateKeyPath: releasePrivateKeyPath,
      candidateDefinition,
      nextMode,
      stageReceipt,
      now,
      freshUntil,
    });
    await persistActivationTransition({
      store,
      expectedRevision: store.revision,
      candidateFingerprint,
      candidateDefinition,
      nextMode,
      evidence: signedTransition,
      transitionVerifier,
      releasePrerequisites: runtimeTrust.release_prerequisites,
      now,
    });
  }
  await completeActivation({
    store,
    expectedRevision: store.revision,
    candidateFingerprint,
    proofs: bundle.proofs,
    proofVerifier,
    transitionVerifier,
    releasePrerequisites: runtimeTrust.release_prerequisites,
    now,
  });
  const enforced = store.query({ kind: "NextWorkflowActivation", limit: 1000 }).records
    .sort((left, right) => left.record_revision - right.record_revision)
    .at(-1);
  const verified = verifyEnforcedActivationRecord({
    record: enforced.payload,
    cycleHistory: activationCycleHistory(store, enforced.payload),
    proofVerifier,
    transitionVerifier,
    expectedRevocationEpoch: store.revocation_epoch,
    now,
  });
  return {
    schema_version: "1.0.0",
    status: "enforced",
    candidate_fingerprint: candidateFingerprint,
    candidate_head: candidateDefinition.repository_head,
    merge_sha: lineage.merge_sha,
    pr_number: lineage.pr_number,
    pr_ci_run_ids: lineage.pr_runs.map((run) => run.run_id),
    main_ci_run_ids: lineage.main_runs.map((run) => run.run_id),
    store_revision: store.revision,
    authority_epoch: store.revocation_epoch,
    release_summary_fingerprint: releaseSummary.fingerprint,
    deployment_fingerprint: deployment.deployment_fingerprint,
    activation_record_fingerprint: verified.record_fingerprint,
    activation_proof_fingerprint: verified.proof_fingerprint,
    backup_manifest_fingerprint: evidence.recovery.backup_manifest_fingerprint,
    observed_lineage_fingerprint: lineage.fingerprint,
  };
}
