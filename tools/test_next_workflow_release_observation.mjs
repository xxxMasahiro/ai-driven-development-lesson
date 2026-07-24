#!/usr/bin/env node
import assert from "node:assert/strict";
import test from "node:test";
import { validateObservedReleaseLineage } from "./lib/next_workflow/release_observation.mjs";

const candidateHead = "a".repeat(40);
const repositoryTree = "b".repeat(40);
const mergeHead = "c".repeat(40);
const candidateDefinition = {
  schema_version: "1.0.0",
  repository_head: candidateHead,
  repository_tree: repositoryTree,
  artifact_fingerprints: ["artifact"],
  artifact_paths: ["artifact"],
  node_version: process.versions.node,
  contract_fingerprint: "contract",
  release_prerequisite_fingerprint: "d".repeat(64),
  candidate_fingerprint: "e".repeat(64),
};
const workflows = ["CI", "Lesson14 CI"];

function fixture() {
  const run = (workflowName, headSha, event, databaseId) => ({
    databaseId,
    headSha,
    conclusion: "success",
    event,
    status: "completed",
    workflowName,
    url: `https://github.example/runs/${databaseId}`,
  });
  const checks = (headSha) => ({
    total_count: 2,
    check_runs: [
      { head_sha: headSha, status: "completed", conclusion: "success", name: "final-gate" },
      { head_sha: headSha, status: "completed", conclusion: "skipped", name: "optional" },
    ],
  });
  return {
    candidateDefinition,
    repository: "owner/repository",
    mainHead: mergeHead,
    mainTree: repositoryTree,
    candidateTree: repositoryTree,
    pullRequests: [{
      number: 42,
      state: "closed",
      merged_at: "2029-01-01T00:00:00.000Z",
      merge_commit_sha: mergeHead,
      head: { sha: candidateHead },
      base: { ref: "main" },
    }],
    pullRequestRuns: [
      run("CI", candidateHead, "pull_request", 1001),
      run("Lesson14 CI", candidateHead, "pull_request", 1002),
    ],
    pullRequestChecks: checks(candidateHead),
    mainRuns: [
      run("CI", mergeHead, "push", 2001),
      run("Lesson14 CI", mergeHead, "push", 2002),
    ],
    mainChecks: checks(mergeHead),
    requiredWorkflowNames: workflows,
  };
}

test("observed release lineage requires the exact merged candidate tree and successful PR/main workflows", () => {
  const observed = validateObservedReleaseLineage(fixture());
  assert.equal(observed.pr_number, 42);
  assert.equal(observed.merge_sha, mergeHead);
  assert.deepEqual(observed.pr_runs.map((run) => run.workflow_name), workflows);
  assert.deepEqual(observed.main_runs.map((run) => run.workflow_name), workflows);
  assert.deepEqual(observed.pr_check_names, ["final-gate"]);
  assert.match(observed.fingerprint, /^[a-f0-9]{64}$/u);
});

test("failed, missing, or wrong-head CI evidence cannot authorize activation", () => {
  const failed = fixture();
  failed.mainRuns[0].conclusion = "failure";
  assert.throws(() => validateObservedReleaseLineage(failed), /OWNER_RELEASE_MAIN_CI_INVALID/);

  const missing = fixture();
  missing.pullRequestRuns.pop();
  assert.throws(() => validateObservedReleaseLineage(missing), /OWNER_RELEASE_PR_CI_INVALID/);

  const wrongTree = fixture();
  wrongTree.mainTree = "f".repeat(40);
  assert.throws(() => validateObservedReleaseLineage(wrongTree), /OWNER_RELEASE_GIT_LINEAGE_INVALID/);
});

test("ambiguous PR lineage and incomplete check pagination fail closed", () => {
  const ambiguous = fixture();
  ambiguous.pullRequests.push({ ...ambiguous.pullRequests[0], number: 43 });
  assert.throws(() => validateObservedReleaseLineage(ambiguous), /OWNER_RELEASE_PULL_REQUEST_LINEAGE_INVALID/);

  const incomplete = fixture();
  incomplete.mainChecks.total_count += 1;
  assert.throws(() => validateObservedReleaseLineage(incomplete), /OWNER_RELEASE_MAIN_CHECKS_INVALID/);
});
