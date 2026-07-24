#!/usr/bin/env node
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { observeReleaseLineage, validateObservedReleaseLineage } from "./lib/next_workflow/release_observation.mjs";

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

test("observed release accepts an exact GitHub squash merge without inventing Git ancestry", () => {
  const repositoryRoot = mkdtempSync(path.join(tmpdir(), "next-workflow-squash-observation-"));
  const git = (...args) => execFileSync("/usr/bin/git", ["-C", repositoryRoot, ...args], {
    encoding: "utf8",
    env: { ...process.env, GIT_CONFIG_NOSYSTEM: "1", GIT_CONFIG_GLOBAL: "/dev/null" },
  }).trim();
  try {
    execFileSync("/usr/bin/git", ["init", "--initial-branch=main", repositoryRoot], { stdio: "ignore" });
    git("config", "user.name", "Next Workflow Test");
    git("config", "user.email", "next-workflow@example.invalid");
    mkdirSync(path.join(repositoryRoot, "docs", "workflow"), { recursive: true });
    writeFileSync(path.join(repositoryRoot, "docs", "workflow", "FINAL_GATE_CI_GRAPH.tsv"), [
      "# workflow_id\tworkflow_file\tworkflow_name",
      "main\t.github/workflows/ci.yml\tCI",
      "lesson14\t.github/workflows/lesson14-ci.yml\tLesson14 CI",
      "",
    ].join("\n"));
    writeFileSync(path.join(repositoryRoot, "payload.txt"), "base\n");
    git("add", ".");
    git("commit", "-m", "base");
    git("switch", "-c", "feature");
    writeFileSync(path.join(repositoryRoot, "payload.txt"), "candidate\n");
    git("add", "payload.txt");
    git("commit", "-m", "candidate");
    const candidate = git("rev-parse", "HEAD");
    const tree = git("rev-parse", "HEAD^{tree}");
    git("switch", "main");
    writeFileSync(path.join(repositoryRoot, "payload.txt"), "candidate\n");
    git("add", "payload.txt");
    git("commit", "-m", "squash merge");
    const main = git("rev-parse", "HEAD");
    assert.notEqual(candidate, main);
    assert.throws(() => git("merge-base", "--is-ancestor", candidate, main));
    git("remote", "add", "origin", "https://github.com/owner/repository.git");
    git("update-ref", "refs/remotes/origin/main", main);

    const run = (workflowName, headSha, event, databaseId) => ({
      databaseId,
      headSha,
      conclusion: "success",
      event,
      status: "completed",
      workflowName,
      url: `https://github.example/runs/${databaseId}`,
    });
    const checks = (headSha) => JSON.stringify({
      total_count: 1,
      check_runs: [{ head_sha: headSha, status: "completed", conclusion: "success", name: "final-gate" }],
    });
    const commandRunner = (executable, args, options) => {
      if (executable.endsWith("/gh")) {
        const joined = args.join(" ");
        if (joined.includes(`/commits/${candidate}/pulls`)) return JSON.stringify([{
          number: 44,
          state: "closed",
          merged_at: "2026-07-24T00:00:00.000Z",
          merge_commit_sha: main,
          head: { sha: candidate },
          base: { ref: "main" },
        }]);
        if (args[0] === "run" && args.includes(candidate)) return JSON.stringify([
          run("CI", candidate, "pull_request", 1001),
          run("Lesson14 CI", candidate, "pull_request", 1002),
        ]);
        if (args[0] === "run" && args.includes(main)) return JSON.stringify([
          run("CI", main, "push", 2001),
          run("Lesson14 CI", main, "push", 2002),
        ]);
        if (joined.includes(`/commits/${candidate}/check-runs`)) return checks(candidate);
        if (joined.includes(`/commits/${main}/check-runs`)) return checks(main);
        throw new Error(`unexpected gh command: ${joined}`);
      }
      return execFileSync(executable, args, options);
    };
    const observed = observeReleaseLineage({
      repositoryRoot,
      candidateDefinition: {
        ...candidateDefinition,
        repository_head: candidate,
        repository_tree: tree,
      },
      commandRunner,
    });
    assert.equal(observed.candidate_head, candidate);
    assert.equal(observed.merge_sha, main);
    assert.equal(observed.candidate_tree, tree);
    assert.equal(observed.merge_tree, tree);
    assert.equal(observed.pr_number, 44);
  } finally {
    rmSync(repositoryRoot, { recursive: true, force: true });
  }
});
