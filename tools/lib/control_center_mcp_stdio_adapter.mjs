import {
  CONTROL_CENTER_CORE_SCHEMA_VERSION,
  CONTROL_CENTER_MCP_PROTOCOL_VERSION,
  controlCenterCapabilityCatalog,
  controlCenterCommandIdFromToolName,
  controlCenterMcpToolDefinitions,
  normalizeControlCenterProfile,
  runControlCenterCommand,
} from "./control_center_core.mjs";

const JSON_RPC_VERSION = "2.0";

function jsonRpcResult(id, result) {
  return { jsonrpc: JSON_RPC_VERSION, id, result };
}

function jsonRpcError(id, code, message, data = undefined) {
  const error = { code, message };
  if (data !== undefined) {
    error.data = data;
  }
  return { jsonrpc: JSON_RPC_VERSION, id, error };
}

function parseRequest(message) {
  if (!message || typeof message !== "object" || Array.isArray(message)) {
    return { ok: false, id: null, code: -32600, message: "Invalid Request" };
  }
  if (message.jsonrpc !== JSON_RPC_VERSION || typeof message.method !== "string") {
    return { ok: false, id: message.id ?? null, code: -32600, message: "Invalid Request" };
  }
  return {
    ok: true,
    id: Object.prototype.hasOwnProperty.call(message, "id") ? message.id : null,
    notification: !Object.prototype.hasOwnProperty.call(message, "id"),
    method: message.method,
    params: message.params && typeof message.params === "object" ? message.params : {},
  };
}

function initializeResult() {
  return {
    protocolVersion: CONTROL_CENTER_MCP_PROTOCOL_VERSION,
    capabilities: {
      tools: {},
    },
    serverInfo: {
      name: "ai-driven-development-lesson-control-center",
      version: CONTROL_CENTER_CORE_SCHEMA_VERSION,
    },
  };
}

export function createControlCenterMcpStdioAdapter({ profile = process.env.CONTROL_CENTER_MCP_PROFILE || "viewer" } = {}) {
  let initializeResponded = false;
  let clientInitialized = false;
  const profileId = normalizeControlCenterProfile(profile);
  return Object.freeze({
    profileId,
    handleLine(line) {
      const text = String(line || "").trim();
      if (!text) {
        return null;
      }
      let message;
      try {
        message = JSON.parse(text);
      } catch {
        return jsonRpcError(null, -32700, "Parse error");
      }
      return this.handleMessage(message);
    },
    handleMessage(message) {
      const request = parseRequest(message);
      if (!request.ok) {
        return jsonRpcError(request.id, request.code, request.message);
      }
      if (request.notification) {
        if (request.method === "notifications/initialized") {
          clientInitialized = true;
        }
        return null;
      }
      if (request.method === "initialize") {
        initializeResponded = true;
        return jsonRpcResult(request.id, initializeResult());
      }
      if (request.method === "ping") {
        return jsonRpcResult(request.id, {});
      }
      if (request.method === "tools/list") {
        return jsonRpcResult(request.id, { tools: controlCenterMcpToolDefinitions(profileId) });
      }
      if (request.method === "tools/call") {
        const name = String(request.params.name || "");
        const commandId = controlCenterCommandIdFromToolName(name);
        if (!commandId) {
          return jsonRpcResult(request.id, {
            isError: true,
            content: [{ type: "text", text: JSON.stringify({ status: "error", error: `unknown tool: ${name}` }) }],
          });
        }
        const args = request.params.arguments && typeof request.params.arguments === "object" ? request.params.arguments : {};
        const result = runControlCenterCommand(commandId, args, { profileId });
        return jsonRpcResult(request.id, {
          isError: result.status === "error" || result.status === "denied",
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        });
      }
      if (request.method === "resources/list") {
        return jsonRpcResult(request.id, {
          resources: [{
            uri: "control-center://capabilities",
            name: "Control Center capabilities",
            mimeType: "application/json",
            description: "Profile-scoped Control Center CLI/MCP capability catalog.",
          }],
        });
      }
      if (request.method === "resources/read" && request.params.uri === "control-center://capabilities") {
        return jsonRpcResult(request.id, {
          contents: [{
            uri: "control-center://capabilities",
            mimeType: "application/json",
            text: JSON.stringify(controlCenterCapabilityCatalog(profileId), null, 2),
          }],
        });
      }
      return jsonRpcError(request.id, -32601, "Method not found");
    },
    getState() {
      return {
        initializeResponded,
        clientInitialized,
        profileId,
      };
    },
  });
}
