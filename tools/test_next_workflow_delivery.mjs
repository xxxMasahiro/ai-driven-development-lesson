import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { evaluateDeliveryImpact, selectDeliveryLane, validateDeliveryPreferences, verifyDeliveryLanePlan } from "./lib/next_workflow/delivery_lane.mjs";
import { observeDeliveryGitSnapshot, verifyDeliveryGitSnapshot } from "./lib/next_workflow/git_snapshot.mjs";

const preferences = {
  schema_version: "2.0.0",
  settings_id: "next-workflow-delivery-settings",
  revision: 1,
  requested_lane: "auto",
};
const SOURCE_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const lowManifest = "*.html\tlow\tcheck_as_built_docs\tfalse\tfalse\tsame-run\tfalse\tStatic HTML text.\n";
const ciManifest = "*.html\thigh\ttest_lesson_repository\ttrue\ttrue\tnone\tfalse\tShared HTML contract.\n";

function snapshot(changedPaths, baseline = lowManifest, current = lowManifest) {
  return {
    schema_version: "1.0.0",
    kind: "next-workflow-delivery-git-snapshot",
    changed_paths: changedPaths,
    baseline_test_manifest: baseline,
    current_test_manifest: current,
    fingerprint: "a".repeat(64),
  };
}

function planFor(changedPaths, options = {}) {
  const gitSnapshot = snapshot(changedPaths, options.baseline, options.current);
  const impact = evaluateDeliveryImpact({ snapshot: gitSnapshot });
  return {
    impact,
    plan: selectDeliveryLane({
      snapshot: gitSnapshot,
      impact,
      preferences: options.preferences ?? preferences,
      outcome: options.outcome ?? "working_change",
      explicitLane: options.explicitLane,
      effectiveCeiling: options.effectiveCeiling ?? "ci",
      gitPolicyCandidates: options.gitPolicyCandidates,
    }),
  };
}

test("preference settings cannot redefine delivery policy", () => {
  assert.equal(validateDeliveryPreferences(preferences).requested_lane, "auto");
  assert.throws(() => validateDeliveryPreferences({ ...preferences, rules: [] }), /DELIVERY_PREFERENCES_INVALID/);
  assert.throws(() => validateDeliveryPreferences({ ...preferences, requested_lane: "pr_ci" }), /DELIVERY_PREFERENCES_INVALID/);
});

test("known trivial work selects none independently of Git automation", () => {
  const { impact, plan } = planFor(["index.html"], {
    gitPolicyCandidates: { automatic: ["commit"], manual: ["push"], not_applicable: ["merge"] },
  });
  assert.equal(impact.status, "known");
  assert.equal(plan.decision, "PASS");
  assert.equal(plan.selected_lane, "none");
  assert.deepEqual(plan.actions, []);
  assert.deepEqual(plan.git_policy_candidates.automatic, ["commit"]);
  assert.equal(plan.grants_git_authority, false);
});

test("CI-required and immutable workflow paths cannot self-downgrade", () => {
  const manifestRequired = planFor(["index.html"], { current: ciManifest });
  assert.equal(manifestRequired.plan.selected_lane, "ci");
  assert.equal(manifestRequired.plan.decision, "PASS");

  const immutable = planFor(["learning/NEXT_WORKFLOW_DELIVERY_SETTINGS.json"]);
  assert.equal(immutable.impact.status, "known");
  assert.equal(immutable.plan.required_lane, "ci");
  assert.equal(immutable.plan.selected_lane, "ci");
});

test("unknown paths and requests below the required floor stop without candidates", () => {
  const unknown = planFor(["new-format.bin"]);
  assert.equal(unknown.plan.decision, "STOP");
  assert.equal(unknown.plan.code, "DELIVERY_IMPACT_UNKNOWN");
  assert.deepEqual(unknown.plan.actions, []);
  assert.deepEqual(unknown.plan.git_policy_candidates, { automatic: [], manual: [], not_applicable: [] });

  const below = planFor(["index.html"], { current: ciManifest, explicitLane: "local" });
  assert.equal(below.plan.decision, "STOP");
  assert.ok(below.plan.blockers.includes("DELIVERY_LANE_BELOW_REQUIRED"));
  assert.deepEqual(below.plan.git_policy_candidates.automatic, []);
});

test("baseline and worktree manifests combine conservatively without permanent unknown state", () => {
  const baselineProtection = planFor(["index.html"], { baseline: ciManifest, current: lowManifest });
  assert.equal(baselineProtection.impact.status, "known");
  assert.equal(baselineProtection.plan.required_lane, "ci");

  const newlyClassified = planFor(["index.html"], { baseline: "README.md\tlow\tcheck_as_built_docs\tfalse\tfalse\tsame-run\tfalse\tDocs.\n", current: lowManifest });
  assert.equal(newlyClassified.impact.status, "known");
  assert.equal(newlyClassified.plan.selected_lane, "none");
});

test("manual and pr_ci authority remain candidate classifications rather than delivery lanes", () => {
  const candidates = { automatic: ["commit", "pr_ci_monitoring", "pr_creation", "push"], manual: ["main_ci_monitoring", "merge", "sync_monitoring"], not_applicable: [] };
  const { plan } = planFor(["index.html"], {
    current: ciManifest,
    outcome: "pr_validation",
    gitPolicyCandidates: candidates,
  });
  assert.equal(plan.selected_lane, "ci");
  assert.deepEqual(plan.git_policy_candidates.automatic, [...candidates.automatic].sort());
  assert.deepEqual(plan.git_policy_candidates.manual, [...candidates.manual].sort());
});

test("lane verification rejects every changed input", () => {
  const initial = planFor(["index.html"]);
  assert.equal(verifyDeliveryLanePlan({
    plan: initial.plan,
    currentSnapshot: snapshot(["index.html"]),
    currentImpact: initial.impact,
    preferences,
    outcome: "working_change",
    effectiveCeiling: "ci",
  }).decision, "PASS");
  const replacementSnapshot = snapshot(["index.html", "new-format.bin"]);
  const replacementImpact = evaluateDeliveryImpact({ snapshot: replacementSnapshot });
  const drift = verifyDeliveryLanePlan({
    plan: initial.plan,
    currentSnapshot: replacementSnapshot,
    currentImpact: replacementImpact,
    preferences,
    outcome: "working_change",
    effectiveCeiling: "ci",
  });
  assert.equal(drift.decision, "STOP");
  assert.equal(drift.code, "DELIVERY_PLAN_INPUT_DRIFT");
  assert.deepEqual(drift.actions, []);
});

function write(root, relativePath, body) {
  const target = path.join(root, relativePath);
  mkdirSync(path.dirname(target), { recursive: true });
  writeFileSync(target, body);
}

function git(root, ...args) {
  return execFileSync("git", ["-C", root, ...args], {
    encoding: "utf8",
    env: { ...process.env, GIT_CONFIG_GLOBAL: "/dev/null", GIT_CONFIG_NOSYSTEM: "1" },
  }).trim();
}

test("trusted Git observation captures real worktree state and detects drift", () => {
  const root = mkdtempSync(path.join(tmpdir(), "next-workflow-delivery-"));
  git(root, "init", "-q");
  git(root, "config", "user.email", "fixture@example.invalid");
  git(root, "config", "user.name", "Fixture");
  const authorityFiles = {
    "AGENTS.MD": "fixture\n",
    "docs/workflow/DEVELOPMENT_INSTRUCTION_POLICY.tsv": "fixture\n",
    "docs/workflow/GIT_WORKFLOW_POLICY.tsv": "fixture\n",
    "docs/workflow/PRODUCT_WORKFLOW_GIT_USAGE_POLICY.tsv": "fixture\n",
    "docs/workflow/REPOSITORY_DOCUMENT_SYNC_POLICY.json": "{}\n",
    "docs/workflow/TEST_PLAN_MANIFEST.tsv": lowManifest,
    "docs/workflow/next-workflow/context-impact.json": "{}\n",
    "learning/GIT_WORKFLOW_SETTINGS.tsv": "# key\tvalue\n",
    "learning/NEXT_WORKFLOW_DELIVERY_SETTINGS.json": `${JSON.stringify(preferences)}\n`,
    "learning/NEXT_WORKFLOW_REPOSITORY_IDENTITY.json": `${JSON.stringify({ repository_logical_id: "fixture", checkout_instance_id: "fixture-checkout" })}\n`,
    "learning/PRODUCT_WORKFLOW_GIT_USAGE_SETTINGS.tsv": "# context\tmode\tselected_at\n",
    "index.html": "<title>Before</title>\n",
    "old.html": "old\n",
  };
  for (const [relativePath, body] of Object.entries(authorityFiles)) write(root, relativePath, body);
  git(root, "add", ".");
  git(root, "commit", "-qm", "fixture");
  git(root, "update-ref", "refs/remotes/origin/main", "HEAD");
  write(root, "index.html", "<title>After</title>\n");
  write(root, "new.html", "new\n");
  write(root, "untracked.html", "untracked\n");
  git(root, "mv", "old.html", "renamed.html");
  git(root, "add", "index.html", "new.html");

  const observed = observeDeliveryGitSnapshot({ repositoryRoot: root });
  assert.deepEqual(observed.changed_paths, ["index.html", "new.html", "old.html", "renamed.html", "untracked.html"]);
  assert.equal(observed.untracked_fingerprints["untracked.html"].length, 64);
  assert.equal(verifyDeliveryGitSnapshot({ snapshot: observed, repositoryRoot: root }).decision, "PASS");

  write(root, "untracked.html", `${readFileSync(path.join(root, "untracked.html"), "utf8")}drift\n`);
  assert.equal(verifyDeliveryGitSnapshot({ snapshot: observed, repositoryRoot: root }).decision, "STOP");
});

test("the CLI exposes a non-authorizing automatic delivery plan", () => {
  const argumentsList = [
    path.join(SOURCE_ROOT, "tools/next-workflow.mjs"),
    "delivery",
    "plan",
    "--outcome",
    "main_release",
  ];
  const result = JSON.parse(execFileSync(process.execPath, argumentsList, {
    cwd: SOURCE_ROOT,
    encoding: "utf8",
    env: { ...process.env, NODE_NO_WARNINGS: "1" },
  }));
  assert.equal(result.kind, "next-workflow-delivery-plan-envelope");
  assert.equal(result.plan.decision, "PASS");
  assert.equal(result.plan.selected_lane, "ci");
  assert.equal(result.grants_git_authority, false);
  assert.deepEqual(result.plan.actions, []);

  const evidenceRoot = mkdtempSync(path.join(tmpdir(), "next-workflow-delivery-evidence-"));
  const planPath = path.join(evidenceRoot, "plan.json");
  writeFileSync(planPath, `${JSON.stringify(result)}\n`);
  const rechecked = JSON.parse(execFileSync(process.execPath, [
    path.join(SOURCE_ROOT, "tools/next-workflow.mjs"),
    "delivery",
    "recheck",
    "--plan",
    planPath,
    "--git-action",
    "commit",
  ], {
    cwd: SOURCE_ROOT,
    encoding: "utf8",
    env: { ...process.env, NODE_NO_WARNINGS: "1" },
  }));
  assert.equal(rechecked.decision, "PASS");
  assert.equal(rechecked.git_action_allowed, true);
  assert.equal(rechecked.grants_git_authority, false);
});
