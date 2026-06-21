import assert from "node:assert/strict";

import {
  controlCenterCapabilityCatalog,
  controlCenterCommandPlan,
  controlCenterMcpToolDefinitions,
  runControlCenterCommand,
} from "./lib/control_center_core.mjs";
import { createControlCenterMcpStdioAdapter } from "./lib/control_center_mcp_stdio_adapter.mjs";

const viewerCatalog = controlCenterCapabilityCatalog("viewer");
assert.equal(viewerCatalog.profile.id, "viewer");
assert.ok(viewerCatalog.commands.find((command) => command.id === "snapshot.read")?.allowed);
assert.equal(viewerCatalog.commands.find((command) => command.id === "evidence.collect_local")?.allowed, false);

const localPlan = controlCenterCommandPlan("evidence.collect_local", { menu_id: "step_1_14" }, { profileId: "local-observer" });
assert.equal(localPlan.ok, true);
assert.equal(localPlan.dry_run, true);

const denied = runControlCenterCommand("evidence.collect_local", { menu_id: "step_1_14", execute: true }, { profileId: "viewer" });
assert.equal(denied.status, "denied");

const planned = runControlCenterCommand("imagegen.mock_register", { artifact_path: "mock.png" }, { profileId: "proposal-writer" });
assert.equal(planned.status, "planned");
assert.equal(planned.data.plan.boundary.provider_dispatch, false);

const tools = controlCenterMcpToolDefinitions("local-observer").map((tool) => tool.name);
assert.ok(tools.includes("control_center_snapshot_read"));
assert.ok(tools.includes("control_center_evidence_collect_local"));
assert.ok(!tools.includes("control_center_provider_dispatch"));

const adapter = createControlCenterMcpStdioAdapter({ profile: "viewer" });
const initialize = adapter.handleMessage({ jsonrpc: "2.0", id: 1, method: "initialize", params: {} });
assert.equal(initialize.result.serverInfo.name, "ai-driven-development-lesson-control-center");
const listed = adapter.handleMessage({ jsonrpc: "2.0", id: 2, method: "tools/list", params: {} });
assert.ok(listed.result.tools.some((tool) => tool.name === "control_center_snapshot_read"));

const snapshot = runControlCenterCommand("snapshot.read", { menu_id: "step_1_14" }, { profileId: "viewer" });
assert.equal(snapshot.status, "ok");
assert.equal(snapshot.data.payload.selected_context.menu_id, "step_1_14");
