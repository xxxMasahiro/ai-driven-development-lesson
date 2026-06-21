import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { appendControlCenterEvidenceRecord } from "./control_center_evidence_store.mjs";

export const CONTROL_CENTER_CORE_SCHEMA_VERSION = "0.1.0";
export const CONTROL_CENTER_CORE_SYNC_ID = "dashboard_control_center_agentic_control_tower_p0_p10";
export const CONTROL_CENTER_MCP_PROTOCOL_VERSION = "2025-06-18";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

const profileOrder = Object.freeze([
  "viewer",
  "local-observer",
  "network-observer",
  "proposal-writer",
  "owner-tool-apply",
  "provider-dispatch",
]);

const profileRanks = new Map(profileOrder.map((profile, index) => [profile, index]));

export const CONTROL_CENTER_CAPABILITY_PROFILES = Object.freeze({
  viewer: Object.freeze({
    id: "viewer",
    title: "Viewer",
    summary: "Read dashboard snapshots, live local status, provider policy, and proposal status.",
    writes_artifacts: false,
    external_network: false,
    owner_tool_apply: false,
    provider_dispatch: false,
  }),
  "local-observer": Object.freeze({
    id: "local-observer",
    title: "Local observer",
    summary: "Collect local Git/test/repository evidence and write audit receipts under this repository.",
    writes_artifacts: true,
    external_network: false,
    owner_tool_apply: false,
    provider_dispatch: false,
  }),
  "network-observer": Object.freeze({
    id: "network-observer",
    title: "Network observer",
    summary: "Collect opted-in CI evidence with head-match checks and audit receipts.",
    writes_artifacts: true,
    external_network: true,
    owner_tool_apply: false,
    provider_dispatch: false,
  }),
  "proposal-writer": Object.freeze({
    id: "proposal-writer",
    title: "Proposal writer",
    summary: "Queue Design Studio requests and import candidate/proposal metadata without apply authority.",
    writes_artifacts: true,
    external_network: false,
    owner_tool_apply: false,
    provider_dispatch: false,
  }),
  "owner-tool-apply": Object.freeze({
    id: "owner-tool-apply",
    title: "Owner tool apply",
    summary: "Plan and apply approved owner-tool changes through existing guarded commands.",
    writes_artifacts: true,
    external_network: false,
    owner_tool_apply: true,
    provider_dispatch: false,
  }),
  "provider-dispatch": Object.freeze({
    id: "provider-dispatch",
    title: "Provider dispatch",
    summary: "Reserved profile for future provider API calls with secret references, cost limits, consent, and receipts.",
    writes_artifacts: true,
    external_network: true,
    owner_tool_apply: false,
    provider_dispatch: true,
    disabled: true,
  }),
});

function commandDefinition({
  id,
  title,
  category,
  summary,
  minimumProfile = "viewer",
  inputSchema = { type: "object", additionalProperties: false, properties: {} },
  runMode = "metadata",
  dryRun = true,
  writesArtifacts = false,
  externalNetwork = false,
  ownerToolApply = false,
  providerDispatch = false,
  auditRequired = false,
  cli = null,
}) {
  return Object.freeze({
    id,
    title,
    category,
    summary,
    minimum_profile: minimumProfile,
    input_schema: Object.freeze(inputSchema),
    run_mode: runMode,
    dry_run_supported: dryRun === true,
    writes_artifacts: writesArtifacts === true,
    external_network: externalNetwork === true,
    owner_tool_apply: ownerToolApply === true,
    provider_dispatch: providerDispatch === true,
    audit_required: auditRequired === true,
    cli,
    schema_version: CONTROL_CENTER_CORE_SCHEMA_VERSION,
    sync_id: CONTROL_CENTER_CORE_SYNC_ID,
  });
}

export const CONTROL_CENTER_COMMAND_DEFINITIONS = Object.freeze([
  commandDefinition({
    id: "snapshot.read",
    title: "Read dashboard snapshot",
    category: "snapshot",
    summary: "Return the producer-owned Dashboard Control Center JSON snapshot for an explicit menu.",
    runMode: "execute",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      properties: {
        menu_id: { type: "string" },
      },
    },
    cli: { command: "tools/dashboard-data", args: ["json"] },
  }),
  commandDefinition({
    id: "live_status.read",
    title: "Read live status",
    category: "live-evidence",
    summary: "Return the fast-changing local dashboard status payload for an explicit menu.",
    runMode: "execute",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      properties: {
        menu_id: { type: "string" },
      },
    },
    cli: { command: "tools/dashboard-data", args: ["live-status"] },
  }),
  commandDefinition({
    id: "evidence.collect_local",
    title: "Collect local evidence",
    category: "live-evidence",
    summary: "Collect local tests, Git, repository, and safety status through the live-status producer and write an audit receipt.",
    minimumProfile: "local-observer",
    runMode: "execute",
    writesArtifacts: true,
    auditRequired: true,
    inputSchema: {
      type: "object",
      additionalProperties: false,
      properties: {
        menu_id: { type: "string" },
        dry_run: { type: "boolean" },
      },
    },
  }),
  commandDefinition({
    id: "evidence.collect_ci",
    title: "Collect CI evidence",
    category: "live-evidence",
    summary: "Collect opted-in GitHub Actions status through the live-status producer and write an audit receipt.",
    minimumProfile: "network-observer",
    runMode: "execute",
    writesArtifacts: true,
    externalNetwork: true,
    auditRequired: true,
    inputSchema: {
      type: "object",
      additionalProperties: false,
      properties: {
        menu_id: { type: "string" },
        dry_run: { type: "boolean" },
      },
    },
  }),
  commandDefinition({
    id: "browser_debug.manifest",
    title: "Build Browser Debug manifest",
    category: "browser-debug",
    summary: "Build the target-owned Browser Debug CLI review manifest without changing Browser Debug CLI.",
    runMode: "execute",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      properties: {
        base_url: { type: "string" },
        output: { type: "string" },
      },
    },
    writesArtifacts: true,
    auditRequired: true,
    cli: { command: "tools/dashboard-browser-debug-manifest", args: [] },
  }),
  commandDefinition({
    id: "design.proposal_status",
    title: "Read Design Studio proposal status",
    category: "design-studio",
    summary: "Return Design Studio event, import, proposal, handoff, provider, and boundary status.",
    runMode: "execute",
    cli: { command: "tools/dashboard-design-system", args: ["proposal-status"] },
  }),
  commandDefinition({
    id: "design.provider_policy",
    title: "Read provider policy",
    category: "design-studio",
    summary: "Return manual, subscription-agent, or api-key provider policy without dispatching provider calls.",
    runMode: "execute",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      properties: {
        provider_mode: { type: "string" },
      },
    },
    cli: { command: "tools/dashboard-design-system", args: ["provider-policy"] },
  }),
  commandDefinition({
    id: "design.queue_request",
    title: "Queue Design Studio request",
    category: "design-studio",
    summary: "Queue a proposal-only Design Studio request for manual or subscription-agent processing.",
    minimumProfile: "proposal-writer",
    runMode: "execute",
    writesArtifacts: true,
    auditRequired: true,
    inputSchema: {
      type: "object",
      required: ["intent_text"],
      additionalProperties: false,
      properties: {
        intent_text: { type: "string" },
        purpose: { type: "string" },
        target_ref: { type: "string" },
        provider_mode: { type: "string" },
        request_kind: { type: "string" },
        idempotency_key: { type: "string" },
        dry_run: { type: "boolean" },
      },
    },
    cli: { command: "tools/dashboard-design-system", args: ["queue-request"] },
  }),
  commandDefinition({
    id: "design.agent_package",
    title: "Build subscription-agent package",
    category: "design-studio",
    summary: "Create a local package for an already queued subscription-agent request.",
    minimumProfile: "proposal-writer",
    runMode: "execute",
    writesArtifacts: true,
    auditRequired: true,
    inputSchema: {
      type: "object",
      required: ["event_id"],
      additionalProperties: false,
      properties: {
        event_id: { type: "string" },
        output: { type: "string" },
        dry_run: { type: "boolean" },
      },
    },
    cli: { command: "tools/dashboard-design-system", args: ["agent-package"] },
  }),
  commandDefinition({
    id: "design.import_candidate",
    title: "Import candidate envelope",
    category: "design-studio",
    summary: "Import proposal-only CandidateEnvelope metadata from a local JSON file.",
    minimumProfile: "proposal-writer",
    runMode: "execute",
    writesArtifacts: true,
    auditRequired: true,
    inputSchema: {
      type: "object",
      required: ["input"],
      additionalProperties: false,
      properties: {
        input: { type: "string" },
        idempotency_key: { type: "string" },
        dry_run: { type: "boolean" },
      },
    },
    cli: { command: "tools/dashboard-design-system", args: ["import-candidate"] },
  }),
  commandDefinition({
    id: "design.import_proposal",
    title: "Import design proposal",
    category: "design-studio",
    summary: "Import proposal-only DesignChangeProposal metadata from a local JSON file.",
    minimumProfile: "proposal-writer",
    runMode: "execute",
    writesArtifacts: true,
    auditRequired: true,
    inputSchema: {
      type: "object",
      required: ["input"],
      additionalProperties: false,
      properties: {
        input: { type: "string" },
        idempotency_key: { type: "string" },
        dry_run: { type: "boolean" },
      },
    },
    cli: { command: "tools/dashboard-design-system", args: ["import-proposal"] },
  }),
  commandDefinition({
    id: "design.export_proposal",
    title: "Plan external product proposal export",
    category: "external-product",
    summary: "Build a plan-only handoff for an imported proposal; it never writes to the product repository.",
    minimumProfile: "proposal-writer",
    runMode: "execute",
    inputSchema: {
      type: "object",
      required: ["import_id"],
      additionalProperties: false,
      properties: {
        import_id: { type: "string" },
        target_ref: { type: "string" },
      },
    },
    cli: { command: "tools/dashboard-design-system", args: ["export-proposal"] },
  }),
  commandDefinition({
    id: "imagegen.mock_register",
    title: "Register image or mock candidate",
    category: "design-studio",
    summary: "Register existing image/mock artifact metadata as a proposal-only candidate; this command does not generate images.",
    minimumProfile: "proposal-writer",
    runMode: "plan-only",
    writesArtifacts: false,
    providerDispatch: false,
    inputSchema: {
      type: "object",
      additionalProperties: false,
      properties: {
        artifact_path: { type: "string" },
        digest: { type: "string" },
        dimensions: { type: "string" },
      },
    },
  }),
  commandDefinition({
    id: "settings.plan",
    title: "Plan settings change",
    category: "settings",
    summary: "Plan a guarded dashboard settings change through the owner surface.",
    minimumProfile: "owner-tool-apply",
    runMode: "plan-only",
    ownerToolApply: true,
  }),
  commandDefinition({
    id: "settings.apply",
    title: "Apply settings change",
    category: "settings",
    summary: "Apply a guarded dashboard settings change only through explicit owner-tool confirmation.",
    minimumProfile: "owner-tool-apply",
    runMode: "plan-only",
    writesArtifacts: true,
    ownerToolApply: true,
    auditRequired: true,
  }),
  commandDefinition({
    id: "design_system.plan",
    title: "Plan design-system change",
    category: "design-system",
    summary: "Plan a design-system source change through the existing design-system command path.",
    minimumProfile: "owner-tool-apply",
    runMode: "plan-only",
    ownerToolApply: true,
  }),
  commandDefinition({
    id: "design_system.apply",
    title: "Apply design-system change",
    category: "design-system",
    summary: "Apply a design-system source change only through explicit owner-tool confirmation and generated outputs.",
    minimumProfile: "owner-tool-apply",
    runMode: "plan-only",
    writesArtifacts: true,
    ownerToolApply: true,
    auditRequired: true,
  }),
  commandDefinition({
    id: "provider.dispatch",
    title: "Provider API dispatch",
    category: "provider",
    summary: "Reserved disabled command for future provider API dispatch after secret references, consent, budget, and rate gates exist.",
    minimumProfile: "provider-dispatch",
    runMode: "disabled",
    externalNetwork: true,
    providerDispatch: true,
  }),
]);

const commandsById = new Map(CONTROL_CENTER_COMMAND_DEFINITIONS.map((command) => [command.id, command]));

function profileRank(profileId) {
  return profileRanks.get(profileId) ?? profileRanks.get("viewer");
}

export function normalizeControlCenterProfile(value = "viewer") {
  const profile = String(value || "viewer");
  return CONTROL_CENTER_CAPABILITY_PROFILES[profile] ? profile : "viewer";
}

export function controlCenterCommandForId(commandId) {
  return commandsById.get(String(commandId || "")) || null;
}

export function controlCenterCommandAllowed(command, profileId) {
  const profile = CONTROL_CENTER_CAPABILITY_PROFILES[normalizeControlCenterProfile(profileId)];
  if (!command || profile.disabled === true) {
    return false;
  }
  if (command.run_mode === "disabled") {
    return false;
  }
  return profileRank(profile.id) >= profileRank(command.minimum_profile);
}

export function controlCenterCommandPlan(commandId, args = {}, options = {}) {
  const command = controlCenterCommandForId(commandId);
  const profileId = normalizeControlCenterProfile(options.profileId);
  if (!command) {
    return {
      ok: false,
      error: {
        code: "CONTROL_CENTER_COMMAND_UNKNOWN",
        message: `unknown Control Center command: ${commandId}`,
      },
    };
  }
  const allowed = controlCenterCommandAllowed(command, profileId);
  const executeRequested =
    args.execute === true ||
    options.execute === true ||
    args.dry_run === false ||
    (command.run_mode === "execute" && command.writes_artifacts !== true);
  const dryRunRequested = command.writes_artifacts === true && args.dry_run !== false && !executeRequested;
  return {
    ok: allowed,
    command,
    profile: CONTROL_CENTER_CAPABILITY_PROFILES[profileId],
    execute_requested: executeRequested,
    dry_run: dryRunRequested,
    reason_code: allowed ? "control_center_command_allowed" : "control_center_profile_denied",
    boundary: {
      writes_artifacts: command.writes_artifacts,
      external_network: command.external_network,
      owner_tool_apply: command.owner_tool_apply,
      provider_dispatch: command.provider_dispatch,
      audit_required: command.audit_required,
      direct_product_repository_write: false,
      browser_debug_cli_mutated: false,
    },
  };
}

function commandError(code, message, details = {}) {
  return {
    status: "error",
    errors: [{ code, message, details }],
    data: null,
    artifacts: [],
  };
}

function parseJsonOutput(result, commandLabel) {
  if (result.status !== 0) {
    return commandError("CONTROL_CENTER_COMMAND_FAILED", `${commandLabel} failed`, {
      status: result.status,
      stderr: String(result.stderr || "").slice(0, 2000),
      stdout: String(result.stdout || "").slice(0, 2000),
    });
  }
  try {
    return {
      status: "ok",
      data: JSON.parse(result.stdout),
      errors: [],
      artifacts: [],
    };
  } catch (error) {
    return commandError("CONTROL_CENTER_JSON_PARSE_FAILED", `${commandLabel} did not return JSON`, {
      message: error.message,
      stdout: String(result.stdout || "").slice(0, 2000),
    });
  }
}

function spawnDashboardTool(relativeCommand, args = [], env = {}) {
  return spawnSync(path.resolve(ROOT, relativeCommand), args, {
    cwd: ROOT,
    env: { ...process.env, ...env },
    encoding: "utf8",
    maxBuffer: 8 * 1024 * 1024,
  });
}

function menuEnv(args) {
  const menuId = String(args?.menu_id || "").trim();
  return menuId ? { DASHBOARD_SELECTED_MENU_ID: menuId } : {};
}

function designArgsFromMap(prefixArgs, mapping, args) {
  const output = [...prefixArgs];
  for (const [key, flag] of mapping) {
    const value = args?.[key];
    if (value !== undefined && value !== null && String(value).trim()) {
      output.push(flag, String(value));
    }
  }
  return output;
}

function writeAudit(commandId, plan, payload, args) {
  if (!plan.command.audit_required) {
    return null;
  }
  return appendControlCenterEvidenceRecord({
    root: ROOT,
    namespace: commandId.replace(/[^A-Za-z0-9._-]/g, "_"),
    kind: "control_center_command",
    commandId,
    profileId: plan.profile.id,
    dryRun: plan.dry_run,
    payload: {
      status: payload.status,
      data: payload.data,
      args: {
        menu_id: args?.menu_id || "",
        provider_mode: args?.provider_mode || "",
        target_ref: args?.target_ref || "",
        event_id: args?.event_id || "",
        import_id: args?.import_id || "",
      },
    },
    source: {
      sync_id: CONTROL_CENTER_CORE_SYNC_ID,
      run_mode: plan.command.run_mode,
    },
  });
}

export function runControlCenterCommand(commandId, args = {}, options = {}) {
  const plan = controlCenterCommandPlan(commandId, args, options);
  if (!plan.command) {
    return plan;
  }
  if (!plan.ok) {
    return {
      status: "denied",
      data: {
        plan,
      },
      errors: [{
        code: "CONTROL_CENTER_PROFILE_DENIED",
        message: `${plan.profile.id} cannot run ${commandId}`,
      }],
      artifacts: [],
    };
  }
  if (plan.command.run_mode === "plan-only" || plan.dry_run) {
    return {
      status: "planned",
      data: {
        plan,
        next_action: plan.command.run_mode === "plan-only"
          ? "Use the existing guarded owner CLI or browser owner surface to execute this operation."
          : "Pass execute=true or dry_run=false from an allowed profile to collect evidence.",
      },
      errors: [],
      artifacts: [],
    };
  }

  let result;
  if (commandId === "snapshot.read") {
    result = parseJsonOutput(spawnDashboardTool("tools/dashboard-data", ["json"], menuEnv(args)), "tools/dashboard-data json");
  } else if (commandId === "live_status.read" || commandId === "evidence.collect_local") {
    result = parseJsonOutput(spawnDashboardTool("tools/dashboard-data", ["live-status"], menuEnv(args)), "tools/dashboard-data live-status");
  } else if (commandId === "evidence.collect_ci") {
    result = parseJsonOutput(
      spawnDashboardTool("tools/dashboard-data", ["live-status"], { ...menuEnv(args), DASHBOARD_LIVE_STATUS_CI_NETWORK: "1" }),
      "tools/dashboard-data live-status with CI",
    );
  } else if (commandId === "browser_debug.manifest") {
    const toolArgs = [];
    if (args.base_url) toolArgs.push("--base-url", String(args.base_url));
    if (args.output) toolArgs.push("--output", String(args.output));
    const spawned = spawnDashboardTool("tools/dashboard-browser-debug-manifest", toolArgs);
    if (spawned.status !== 0 || !args.output) {
      result = parseJsonOutput(spawned, "tools/dashboard-browser-debug-manifest");
    } else {
      const outputPath = path.resolve(ROOT, String(args.output));
      result = parseJsonOutput({
        status: 0,
        stdout: awaitlessReadFile(outputPath),
        stderr: "",
      }, "tools/dashboard-browser-debug-manifest");
    }
  } else if (commandId === "design.proposal_status") {
    result = parseJsonOutput(spawnDashboardTool("tools/dashboard-design-system", ["proposal-status"]), "tools/dashboard-design-system proposal-status");
  } else if (commandId === "design.provider_policy") {
    const providerMode = String(args.provider_mode || "api-key");
    result = parseJsonOutput(spawnDashboardTool("tools/dashboard-design-system", ["provider-policy", "--provider-mode", providerMode]), "tools/dashboard-design-system provider-policy");
  } else if (commandId === "design.queue_request") {
    const toolArgs = designArgsFromMap(["queue-request"], [
      ["target_ref", "--target-ref"],
      ["provider_mode", "--provider-mode"],
      ["request_kind", "--request-kind"],
      ["intent_text", "--intent-text"],
      ["purpose", "--purpose"],
      ["idempotency_key", "--idempotency-key"],
    ], args);
    result = parseJsonOutput(spawnDashboardTool("tools/dashboard-design-system", toolArgs), "tools/dashboard-design-system queue-request");
  } else if (commandId === "design.agent_package") {
    const toolArgs = designArgsFromMap(["agent-package"], [["event_id", "--event-id"], ["output", "--output"]], args);
    result = parseJsonOutput(spawnDashboardTool("tools/dashboard-design-system", toolArgs), "tools/dashboard-design-system agent-package");
  } else if (commandId === "design.import_candidate") {
    const toolArgs = designArgsFromMap(["import-candidate"], [["input", "--input"], ["idempotency_key", "--idempotency-key"]], args);
    result = parseJsonOutput(spawnDashboardTool("tools/dashboard-design-system", toolArgs), "tools/dashboard-design-system import-candidate");
  } else if (commandId === "design.import_proposal") {
    const toolArgs = designArgsFromMap(["import-proposal"], [["input", "--input"], ["idempotency_key", "--idempotency-key"]], args);
    result = parseJsonOutput(spawnDashboardTool("tools/dashboard-design-system", toolArgs), "tools/dashboard-design-system import-proposal");
  } else if (commandId === "design.export_proposal") {
    const toolArgs = designArgsFromMap(["export-proposal"], [["import_id", "--import-id"], ["target_ref", "--target-ref"]], args);
    result = parseJsonOutput(spawnDashboardTool("tools/dashboard-design-system", toolArgs), "tools/dashboard-design-system export-proposal");
  } else {
    result = commandError("CONTROL_CENTER_COMMAND_NOT_IMPLEMENTED", `${commandId} has no execution adapter yet`, { commandId });
  }

  const receipt = result.status === "ok" || result.status === "planned" ? writeAudit(commandId, plan, result, args) : null;
  return {
    ...result,
    data: {
      command: plan.command,
      profile: plan.profile,
      boundary: plan.boundary,
      payload: result.data,
      receipt,
    },
    artifacts: receipt ? [{ type: "control_center_receipt", path: receipt.detail_path, ledger_path: receipt.ledger_path }] : result.artifacts,
  };
}

function awaitlessReadFile(filePath) {
  return fs.readFileSync(filePath, "utf8");
}

export function controlCenterToolNameFromCommandId(commandId) {
  return `control_center_${String(commandId || "").replace(/[^A-Za-z0-9]+/g, "_")}`;
}

export function controlCenterCommandIdFromToolName(toolName) {
  const name = String(toolName || "");
  if (!name.startsWith("control_center_")) {
    return "";
  }
  const suffix = name.slice("control_center_".length);
  return CONTROL_CENTER_COMMAND_DEFINITIONS.find((command) => controlCenterToolNameFromCommandId(command.id) === name || command.id.replace(/\./g, "_") === suffix)?.id || "";
}

export function controlCenterMcpToolDefinitions(profileId = "viewer") {
  const profile = normalizeControlCenterProfile(profileId);
  return CONTROL_CENTER_COMMAND_DEFINITIONS
    .filter((command) => controlCenterCommandAllowed(command, profile))
    .map((command) => ({
      name: controlCenterToolNameFromCommandId(command.id),
      description: command.summary,
      inputSchema: command.input_schema,
      annotations: {
        title: command.title,
        readOnlyHint: !command.writes_artifacts && !command.owner_tool_apply,
        destructiveHint: false,
        idempotentHint: command.category !== "design-studio" || command.id === "design.proposal_status" || command.id === "design.provider_policy",
      },
    }));
}

export function controlCenterCapabilityCatalog(profileId = "viewer") {
  const profile = CONTROL_CENTER_CAPABILITY_PROFILES[normalizeControlCenterProfile(profileId)];
  return {
    schema_version: CONTROL_CENTER_CORE_SCHEMA_VERSION,
    sync_id: CONTROL_CENTER_CORE_SYNC_ID,
    profile,
    profiles: CONTROL_CENTER_CAPABILITY_PROFILES,
    commands: CONTROL_CENTER_COMMAND_DEFINITIONS.map((command) => ({
      ...command,
      allowed: controlCenterCommandAllowed(command, profile.id),
      mcp_tool: controlCenterToolNameFromCommandId(command.id),
    })),
  };
}
